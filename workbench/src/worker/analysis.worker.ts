/**
 * Analysis worker entry.
 *
 * Runs the engine off the UI thread. Saved queries re-run on every model change and product-state
 * exploration is unbounded in principle, so doing this on the main thread would freeze the tab —
 * which is why the component model makes `analysis-worker` a host depending on `query-engine`, and
 * why the UI depends on neither.
 *
 * The worker canonicalizes the document ITSELF rather than receiving an IR. Two reasons: the IR
 * holds Maps, which do not survive `postMessage` structured cloning; and canonicalization is
 * deterministic, so both sides independently derive the same IR from the same document. The hash
 * travelling in the request is what proves they agree.
 */
import { canonicalize } from "../ir/canonicalize.ts";
import { systemHash } from "../ir/hash.ts";
import { runQuery, runSavedQueries } from "../engine/index.ts";
import type { WorkerReply, WorkerRequest } from "./protocol.ts";

/** Requests the host has asked us to abandon. Checked before replying, never mid-walk. */
const cancelled = new Set<number>();

const post = (reply: WorkerReply): void => {
  // `self.postMessage` in a module worker; typed loosely because the DOM lib's WorkerGlobalScope
  // and the ambient `self` disagree depending on lib order, and this is the one unavoidable cast.
  (self as unknown as { postMessage: (m: unknown) => void }).postMessage(reply);
};

function handle(request: WorkerRequest): void {
  if (request.kind === "cancel") {
    cancelled.add(request.id);
    post({ kind: "cancelled", id: request.id });
    return;
  }

  const { id, systemHash: requestedHash, document } = request;
  try {
    const system = canonicalize(document);
    const actual = systemHash(system);

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
