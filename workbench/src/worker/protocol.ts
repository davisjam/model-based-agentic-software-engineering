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
 *
 * ## The request carries SOURCE TEXT, not a document
 *
 * It used to carry `document: unknown`, "the loaded document, structured-cloneable". Nothing could
 * produce one. The only code that holds a plain document is inside the YAML layer, and neither
 * `MageDocument` nor `TransactionEngine` exposes it — so the facade had no value to put in that
 * field, and the one test of this protocol filled it with `{}`. The shape of the field was evidence
 * the boundary had never been crossed.
 *
 * Source text is what the workspace actually has (`TransactionEngine.toText()`), and sending it
 * strengthens the protocol's own claim rather than weakening it: both sides now derive the IR from
 * the same BYTES, so the hash travelling in the request proves agreement about the parse as well as
 * about canonicalization. The cost is that the worker bundle contains the YAML reader.
 *
 * ## Four verbs, and not one of them writes
 *
 * `analyze`, `analyze-saved`, `explore`, `sparql`, `cancel`. There is deliberately no arm carrying
 * an operation, a transaction or a system: the Worker holds its own copy of the IR on another
 * thread, and UX-I3 says every edit normalises to the ONE IR behind the facade. So the Worker may
 * ANALYSE and cannot MUTATE — not because it declines to, but because its inbox cannot express a
 * write and its outbox cannot carry a model back.
 */
import type { Finding, QueryResult } from "../ir/types.ts";
import type { StopReason } from "../engine/explore.ts";
import type { EngineRoute, SeamQuestion, SeamRefusal } from "../sparql/index.ts";
import type { QueryAlgebra } from "../sparql/index.ts";
import type { Term } from "../rdf/terms.ts";

/**
 * Sent UI -> worker. The system travels as the source text; the worker parses and canonicalizes it
 * itself, and replies with the hash IT derived.
 */
export type WorkerRequest =
  | {
      readonly kind: "analyze";
      readonly id: number;
      /** Hash of the system this request was issued against. Compared against the derived one. */
      readonly systemHash: string;
      readonly source: string;
      readonly query: unknown;
      readonly limit?: number;
    }
  | {
      readonly kind: "analyze-saved";
      readonly id: number;
      readonly systemHash: string;
      readonly source: string;
      readonly limit?: number;
    }
  | {
      /** The configuration space itself, for a caller that needs its SIZE rather than an answer. */
      readonly kind: "explore";
      readonly id: number;
      readonly systemHash: string;
      readonly source: string;
      readonly limit: number;
    }
  | {
      /**
       * A licensed question over the RDF projection, re-issued with the Worker's step budget.
       *
       * The question arrives UNBRANDED — a `LicensedQuestion` cannot cross `postMessage`, because
       * its brand is a `unique symbol` no serializer can carry. So the worker runs `admit` itself,
       * which makes the licensing gate run once per thread that evaluates rather than once per
       * question. A gate that could be transferred would be a gate a caller could strip.
       */
      readonly kind: "sparql";
      readonly id: number;
      readonly systemHash: string;
      readonly source: string;
      readonly question: SeamQuestion;
      readonly query: QueryAlgebra;
      readonly budget: number;
    }
  | { readonly kind: "cancel"; readonly id: number };

/**
 * What a walk of the configuration space found, WITHOUT the configurations.
 *
 * The space is the thing that does not fit through a message port: a million configurations is a
 * million pairs of Maps, and a caller asking "is this model's behaviour tractable" needs the counts
 * and the stop reason, not the vectors. A caller that needs a specific configuration asks a
 * behavioural query and gets a witness.
 *
 * `notes` carries the explorer's disclosed rewrites verbatim — a step not taken because an effect
 * would leave a variable's declared domain is exactly the kind of quiet decision that must not be
 * lost at a thread boundary.
 */
export interface SpaceSummary {
  readonly statesExplored: number;
  readonly complete: boolean;
  readonly stopReason: StopReason;
  readonly deadEnds: number;
  readonly notes: readonly string[];
  /** The ceiling this walk ran under, so `complete: false` names the number it hit. */
  readonly limit: number;
}

/**
 * A SPARQL evaluation, flattened for the boundary.
 *
 * `exhausted` survives the crossing, carrying the BIGGER budget it spent. The Worker is not an
 * unbounded evaluator — it is a bounded one with a budget a background thread can afford — and
 * collapsing a second exhaustion into an empty result would turn an honest bound into the dead end
 * the fourth arm exists to avoid.
 */
export type WorkerEvaluation =
  | {
      readonly kind: "select";
      readonly variables: readonly string[];
      /** Rows as pairs: see `results` below on why pairs rather than Maps. */
      readonly rows: readonly (readonly (readonly [string, Term])[])[];
    }
  | { readonly kind: "ask"; readonly value: boolean; readonly coverage: string }
  | { readonly kind: "refused"; readonly refusal: SeamRefusal }
  | { readonly kind: "routed"; readonly route: EngineRoute }
  | {
      readonly kind: "exhausted";
      readonly steps: number;
      readonly budget: number;
      readonly prose: string;
    };

/** Sent worker -> UI. Every arm is an ANALYSIS; none carries a system, a document or source text. */
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
      /**
       * Query id -> result, as pairs.
       *
       * Pairs for deterministic ORDER and a shape that survives being logged as JSON — not because
       * a Map cannot cross. It can: the structured-clone algorithm carries Map, which is why a
       * behavioural witness, whose steps hold `Configuration` Maps, travels inside `result` above.
       * The previous note here claimed otherwise and nothing had ever tested it; the real-thread
       * test in `test/worker.test.ts` now does.
       */
      readonly results: readonly (readonly [string, QueryResult])[];
    }
  | {
      readonly kind: "exploration";
      readonly id: number;
      readonly systemHash: string;
      readonly space: SpaceSummary;
    }
  | {
      readonly kind: "evaluation";
      readonly id: number;
      readonly systemHash: string;
      readonly evaluation: WorkerEvaluation;
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
 *
 * A second exhaustion in the Worker reads `bounded`, not a new state. `bounded` already means "a
 * real answer that does not cover everything", which is precisely what a spent budget produces.
 */
export type AnalysisState = "idle" | "running" | "complete" | "bounded" | "cancelled" | "stale";

/**
 * The Worker's step budget for a re-issued SPARQL question: forty times the synchronous one.
 *
 * The synchronous budget (`DEFAULT_STEP_BUDGET`, 500_000) is sized to an interaction — 0.3–0.6 s at
 * the measured 0.6–1.2 µs per step, which is what may be spent on the thread that paints. This one
 * is sized to what a person will wait for with a cancel button in front of them: 12–24 s. It is
 * still FINITE, and deliberately so. "Route it to the Worker" must not mean "route it somewhere
 * that cannot say no".
 */
export const WORKER_STEP_BUDGET = 20_000_000;

/**
 * The Worker's configuration ceiling: ten times `DEFAULT_STATE_LIMIT`.
 *
 * Same reasoning, different unit. A configuration costs far more than a step — each one is admitted
 * into a map and expanded against every compiled transition — so the multiple is smaller than the
 * step budget's.
 */
export const WORKER_STATE_LIMIT = 1_000_000;
