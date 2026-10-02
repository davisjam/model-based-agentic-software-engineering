/**
 * Analysis worker entry.
 *
 * Runs the engine off the UI thread. Saved queries re-run on every model change and product-state
 * exploration is unbounded in principle, so doing this on the main thread would freeze the tab —
 * which is why the component model makes `analysis-worker` a host depending on `query-engine`, and
 * why the UI depends on neither.
 *
 * The worker derives the IR ITSELF from the source text rather than receiving one. Two reasons: the
 * IR holds Maps and object identity that a message port would flatten; and parsing plus
 * canonicalization is deterministic, so both sides independently derive the same IR from the same
 * bytes. The hash travelling in the request is what proves they agree — and the worker replies with
 * the hash IT derived, never the one it was handed.
 *
 * **Analysis only.** This module imports the reader (`../yaml/document.ts`), the IR, the engine, the
 * RDF projection and the query evaluator. It does not import `../transaction/`, so there is no
 * `apply` here to call even if a request arm for one were ever added; and no reply carries a system,
 * a document or source text back. `test/worker.test.ts` asserts both, over this file's own bytes.
 */
import { MageDocument } from "../yaml/document.ts";
import { systemHash } from "../ir/hash.ts";
import type { CanonicalSystem, Finding } from "../ir/types.ts";
import {
  compileSystem, defaultOptions, exploreSpace, runQuery, runSavedQueries,
} from "../engine/index.ts";
import { project } from "../rdf/project.ts";
import { admit, evaluate } from "../sparql/index.ts";
import type { WorkerEvaluation, WorkerReply, WorkerRequest } from "./protocol.ts";

/** Requests the host has asked us to abandon. Checked before replying, never mid-walk. */
const cancelled = new Set<number>();

const post = (reply: WorkerReply): void => {
  // `self.postMessage` in a module worker; typed loosely because the DOM lib's WorkerGlobalScope
  // and the ambient `self` disagree depending on lib order, and this is the one unavoidable cast.
  (self as unknown as { postMessage: (m: unknown) => void }).postMessage(reply);
};

const finding = (where: string, message: string): Finding => ({ rule: "ENGINE", where, message });

/** A parse the worker cannot read is a FINDING, not a thrown-away request and not an empty answer. */
type Read =
  | { readonly ok: true; readonly system: CanonicalSystem; readonly hash: string }
  | { readonly ok: false; readonly findings: readonly Finding[] };

function parsed(source: string): Read {
  const loaded = MageDocument.load(source);
  if (loaded.document === null) {
    return {
      ok: false,
      findings: loaded.findings.length > 0
        ? loaded.findings
        : [finding("parse", "the source did not parse, and the reader reported no reason.")],
    };
  }
  const system = loaded.document.system();
  return { ok: true, system, hash: systemHash(system) };
}

/** The SPARQL arm's three outcomes, flattened. Exhaustion keeps its budget: see `WorkerEvaluation`. */
function evaluateQuestion(
  system: CanonicalSystem, request: Extract<WorkerRequest, { kind: "sparql" }>,
): WorkerEvaluation {
  // The gate, again, on this thread. The brand cannot cross a message port, so re-admitting is the
  // only way to hold a licensed question here — which is the control working, not a duplicated check.
  const admission = admit(system, request.question);
  if (admission.kind === "refused") return { kind: "refused", refusal: admission.refusal };
  if (admission.kind === "routed") return { kind: "routed", route: admission.route };

  const outcome = evaluate(project(system), request.query, admission.question, request.budget);
  switch (outcome.kind) {
    case "select-result":
      return {
        kind: "select",
        variables: outcome.variables,
        rows: outcome.rows.map((row) => [...row]),
      };
    case "ask-result":
      return { kind: "ask", value: outcome.value, coverage: outcome.coverage };
    case "refused":
      return { kind: "refused", refusal: outcome.refusal };
    case "exhausted":
      return {
        kind: "exhausted", steps: outcome.steps, budget: request.budget, prose: outcome.prose,
      };
  }
}

function handle(request: WorkerRequest): void {
  if (request.kind === "cancel") {
    cancelled.add(request.id);
    post({ kind: "cancelled", id: request.id });
    return;
  }

  const { id, systemHash: requestedHash } = request;
  try {
    const read = parsed(request.source);
    if (!read.ok) {
      post({ kind: "failed", id, systemHash: requestedHash, findings: read.findings });
      return;
    }
    const { system, hash: actual } = read;

    // Reply with the hash WE derived, not the one we were handed. The host compares them and drops a
    // mismatch as stale. Echoing the request's hash back would make that check vacuous — it would
    // always agree — which is the kind of self-confirming handshake that looks like a check and is not.
    if (cancelled.delete(id)) {
      post({ kind: "cancelled", id });
      return;
    }

    if (request.kind === "analyze-saved") {
      const results = runSavedQueries(system);
      post({
        kind: "results",
        id,
        systemHash: actual,
        results: [...results].map(([qid, answer]) => [qid, answer.result] as const),
      });
      return;
    }

    if (request.kind === "explore") {
      const compiled = compileSystem(system);
      if (!compiled.ok) {
        // A compile failure is a refusal sentence about the MODEL, carried as a finding rather than
        // as an exception: a typo in a guard is the author's to fix, and it must reach them.
        post({ kind: "failed", id, systemHash: actual, findings: [finding("explore", compiled.refusal)] });
        return;
      }
      const space = exploreSpace(compiled.value, defaultOptions(request.limit));
      post({
        kind: "exploration",
        id,
        systemHash: actual,
        space: {
          statesExplored: space.statesExplored,
          complete: space.complete,
          stopReason: space.stopReason,
          deadEnds: space.deadEnds.length,
          notes: space.notes,
          limit: request.limit,
        },
      });
      return;
    }

    if (request.kind === "sparql") {
      post({ kind: "evaluation", id, systemHash: actual, evaluation: evaluateQuestion(system, request) });
      return;
    }

    const answer = runQuery(system, request.query);
    post({ kind: "result", id, systemHash: actual, result: answer.result });
  } catch (err) {
    // A throw here is a bug in the engine, not a model problem — model problems are findings. Report
    // it as a failure carrying the message rather than letting the worker die silently, which would
    // leave the host's promise pending forever.
    post({
      kind: "failed",
      id,
      systemHash: requestedHash,
      findings: [{
        rule: "ENGINE",
        where: request.kind,
        message: err instanceof Error ? err.message : String(err),
      }],
    });
  }
}

self.addEventListener("message", (event: MessageEvent) => {
  handle(event.data as WorkerRequest);
});
