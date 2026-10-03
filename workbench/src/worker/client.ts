/**
 * Host side of the Worker boundary.
 *
 * Owns staleness so no caller has to remember it: a reply whose `systemHash` does not match the
 * hash the request was issued against is dropped and reported as `stale`. The UI therefore cannot
 * render a result for a model the user has already changed, which is a mistake it would otherwise
 * make in exactly the situation that matters — the user edits, then looks at the answer.
 *
 * DOM-free on purpose, so a test can drive it with a fake or with a real `node:worker_threads`
 * thread. The one place that touches the `Worker` constructor is `port.ts`.
 */
import type { QueryResult } from "../ir/types.ts";
import type { QueryAlgebra, SeamQuestion } from "../sparql/index.ts";
import type {
  AnalysisState, SpaceSummary, WorkerEvaluation, WorkerReply, WorkerRequest,
} from "./protocol.ts";
import { WORKER_STATE_LIMIT, WORKER_STEP_BUDGET } from "./protocol.ts";

export interface AnalysisClientEvents {
  readonly onState: (state: AnalysisState, id: number) => void;
}

/** The subset of Worker this needs — so tests can supply a fake without a browser. */
export interface WorkerLike {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
  terminate(): void;
}

interface Pending {
  readonly systemHash: string;
  readonly resolve: (value: PendingResult) => void;
}

/**
 * What a Worker round trip can hand back.
 *
 * Closed, and every arm is an ANALYSIS: a query result, a batch of them, a space SUMMARY, a SPARQL
 * evaluation, or a reason there is no answer. No arm carries a system, a document or source text, so
 * a caller holding one of these has nothing it could write back into the workspace. That is how the
 * Worker stays unable to mutate the model rather than merely declining to.
 */
export type PendingResult =
  | { readonly status: "ok"; readonly result: QueryResult }
  | { readonly status: "ok-many"; readonly results: ReadonlyMap<string, QueryResult> }
  | { readonly status: "ok-space"; readonly space: SpaceSummary }
  | { readonly status: "ok-evaluation"; readonly evaluation: WorkerEvaluation }
  | { readonly status: "stale" }
  | { readonly status: "cancelled" }
  /**
   * The analysis did not happen, and this says why.
   *
   * One arm for every such reason — a worker throw, an unparseable source, no worker wired at all —
   * because a caller's obligation is identical in all three: show the sentence. A silent empty
   * result is the failure mode this arm exists to make unavailable.
   */
  | { readonly status: "failed"; readonly messages: readonly string[] };

export class AnalysisClient {
  #next = 1;
  #pending = new Map<number, Pending>();
  readonly #worker: WorkerLike;
  readonly #events: AnalysisClientEvents;

  constructor(worker: WorkerLike, events: AnalysisClientEvents) {
    this.#worker = worker;
    this.#events = events;
    this.#worker.addEventListener("message", (event) => this.#receive(event.data as WorkerReply));
  }

  #receive(reply: WorkerReply): void {
    const pending = this.#pending.get(reply.id);
    if (pending === undefined) return; // already settled, or cancelled and forgotten
    this.#pending.delete(reply.id);

    if (reply.kind === "cancelled") {
      this.#events.onState("cancelled", reply.id);
      pending.resolve({ status: "cancelled" });
      return;
    }

    // Staleness is decided HERE, once, rather than at every call site.
    if (reply.systemHash !== pending.systemHash) {
      this.#events.onState("stale", reply.id);
      pending.resolve({ status: "stale" });
      return;
    }

    if (reply.kind === "failed") {
      this.#events.onState("complete", reply.id);
      pending.resolve({ status: "failed", messages: reply.findings.map((f) => `${f.rule} ${f.where}: ${f.message}`) });
      return;
    }

    if (reply.kind === "results") {
      this.#events.onState("complete", reply.id);
      pending.resolve({ status: "ok-many", results: new Map(reply.results) });
      return;
    }

    if (reply.kind === "exploration") {
      // A walk stopped by its ceiling is bounded, exactly as a bounded query result is: the number
      // is real and the coverage is not total.
      this.#events.onState(reply.space.complete ? "complete" : "bounded", reply.id);
      pending.resolve({ status: "ok-space", space: reply.space });
      return;
    }

    if (reply.kind === "evaluation") {
      // A second exhaustion in the Worker is `bounded` too. It is not a failure — the question is
      // licensed and the evaluator spent a real budget on it — and it is not an answer.
      this.#events.onState(reply.evaluation.kind === "exhausted" ? "bounded" : "complete", reply.id);
      pending.resolve({ status: "ok-evaluation", evaluation: reply.evaluation });
      return;
    }

    // A bounded result is neither success nor failure; the UI must say INCONCLUSIVE.
    this.#events.onState(reply.result.coverage.kind === "bounded" ? "bounded" : "complete", reply.id);
    pending.resolve({ status: "ok", result: reply.result });
  }

  #send(request: WorkerRequest, systemHash: string): Promise<PendingResult> {
    return new Promise<PendingResult>((resolve) => {
      this.#pending.set(request.id, { systemHash, resolve });
      this.#events.onState("running", request.id);
      this.#worker.postMessage(request);
    });
  }

  analyze(source: string, systemHash: string, query: unknown, limit?: number): Promise<PendingResult> {
    const id = this.#next++;
    return this.#send(
      limit === undefined
        ? { kind: "analyze", id, systemHash, source, query }
        : { kind: "analyze", id, systemHash, source, query, limit },
      systemHash,
    );
  }

  analyzeSaved(source: string, systemHash: string, limit?: number): Promise<PendingResult> {
    const id = this.#next++;
    return this.#send(
      limit === undefined
        ? { kind: "analyze-saved", id, systemHash, source }
        : { kind: "analyze-saved", id, systemHash, source, limit },
      systemHash,
    );
  }

  /** Walk the configuration space under the Worker's ceiling, and report its size. */
  explore(source: string, systemHash: string, limit: number = WORKER_STATE_LIMIT): Promise<PendingResult> {
    const id = this.#next++;
    return this.#send({ kind: "explore", id, systemHash, source, limit }, systemHash);
  }

  /**
   * Re-issue a licensed question with the Worker's step budget.
   *
   * Every subject of the query travels, and each is re-admitted on the other side; see the `sparql`
   * request arm for why that is the gate working rather than a duplicated check.
   */
  evaluateQuestion(
    source: string, systemHash: string, questions: readonly SeamQuestion[], query: QueryAlgebra,
    budget: number = WORKER_STEP_BUDGET,
  ): Promise<PendingResult> {
    const id = this.#next++;
    return this.#send({ kind: "sparql", id, systemHash, source, questions, query, budget }, systemHash);
  }

  cancel(id: number): void {
    this.#worker.postMessage({ kind: "cancel", id } satisfies WorkerRequest);
  }

  /**
   * Settle every in-flight request as failed, naming the reason.
   *
   * The Worker's OWN failures arrive as `failed` replies. This is for the failures that produce no
   * reply at all — the bundle 404s, the module throws while loading, the thread is killed — where
   * every promise would otherwise pend forever. A hung await is worse than an error: it is a silent
   * empty result that never even arrives, so there is nothing for a caller to report.
   */
  abort(reason: string): void {
    const pending = [...this.#pending];
    this.#pending.clear();
    for (const [id, entry] of pending) {
      this.#events.onState("complete", id);
      entry.resolve({ status: "failed", messages: [reason] });
    }
  }

  /** In-flight request ids, so the UI can show what is running and offer cancellation. */
  inFlight(): readonly number[] {
    return [...this.#pending.keys()];
  }

  dispose(): void {
    this.#pending.clear();
    this.#worker.terminate();
  }
}
