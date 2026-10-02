/**
 * The Worker boundary protocol.
 *
 * Analysis runs in a Web Worker from the first commit, not as a later optimization: saved queries
 * re-run on every model change, and product-state exploration on the UI thread would freeze the tab.
 * The component model makes this a real boundary — `analysis-worker` depends on `query-engine`, and
 * the UI depends on neither.
 *
 * The protocol carries the SYSTEM HASH in both directions. That is the whole point of the
 * analysis-execution model: a result for revision N must never be presented as though it described
 * N+1. A reply whose `systemHash` no longer matches the workspace is STALE and the client drops it,
 * rather than the UI having to remember to check.
 */
import type { Finding, QueryResult } from "../ir/types.ts";

/** Sent UI -> worker. The system travels as a plain document; the worker canonicalizes it itself. */
export type WorkerRequest =
  | {
      readonly kind: "analyze";
      readonly id: number;
      /** Hash of the system this request was issued against. Echoed back for staleness detection. */
      readonly systemHash: string;
      /** The loaded document, structured-cloneable. Maps do not survive the boundary; this does. */
      readonly document: unknown;
      readonly query: unknown;
      readonly limit?: number;
    }
  | {
      readonly kind: "analyze-saved";
      readonly id: number;
      readonly systemHash: string;
      readonly document: unknown;
      readonly limit?: number;
    }
  | { readonly kind: "cancel"; readonly id: number };

/** Sent worker -> UI. */
export type WorkerReply =
  | {
      readonly kind: "result";
      readonly id: number;
      readonly systemHash: string;
      readonly result: QueryResult;
    }
  | {
      readonly kind: "results";
      readonly id: number;
      readonly systemHash: string;
      /** Query id -> result. An array of pairs, because a Map is not structured-cloneable in all hosts. */
      readonly results: readonly (readonly [string, QueryResult])[];
    }
  | {
      readonly kind: "failed";
      readonly id: number;
      readonly systemHash: string;
      readonly findings: readonly Finding[];
    }
  | { readonly kind: "cancelled"; readonly id: number };

/**
 * Analysis execution states, from the analysis-execution model.
 *
 * `stale` is the one that earns its place: a model superseded mid-run is not a failure and not a
 * success, and collapsing it into either is how a UI ends up showing a confidently wrong answer.
 */
export type AnalysisState = "idle" | "running" | "complete" | "bounded" | "cancelled" | "stale";
