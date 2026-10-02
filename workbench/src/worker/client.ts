/**
 * Host side of the Worker boundary.
 *
 * Owns staleness so no caller has to remember it: a reply whose `systemHash` does not match the
 * hash the request was issued against is dropped and reported as `stale`. The UI therefore cannot
 * render a result for a model the user has already changed, which is a mistake it would otherwise
 * make in exactly the situation that matters — the user edits, then looks at the answer.
 */
import type { QueryResult } from "../ir/types.ts";
import type { AnalysisState, WorkerReply, WorkerRequest } from "./protocol.ts";

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

export type PendingResult =
  | { readonly status: "ok"; readonly result: QueryResult }
  | { readonly status: "ok-many"; readonly results: ReadonlyMap<string, QueryResult> }
  | { readonly status: "stale" }
  | { readonly status: "cancelled" }
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

  analyze(document: unknown, systemHash: string, query: unknown, limit?: number): Promise<PendingResult> {
    const id = this.#next++;
    return this.#send(
      limit === undefined
        ? { kind: "analyze", id, systemHash, document, query }
        : { kind: "analyze", id, systemHash, document, query, limit },
      systemHash,
    );
  }

  analyzeSaved(document: unknown, systemHash: string, limit?: number): Promise<PendingResult> {
    const id = this.#next++;
    return this.#send(
      limit === undefined
        ? { kind: "analyze-saved", id, systemHash, document }
        : { kind: "analyze-saved", id, systemHash, document, limit },
      systemHash,
    );
  }

  cancel(id: number): void {
    this.#worker.postMessage({ kind: "cancel", id } satisfies WorkerRequest);
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
