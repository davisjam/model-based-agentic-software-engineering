/**
 * The engine's public surface.
 *
 * One entry point for a loosely-typed query (`runQuery`), one for an already-typed one
 * (`runTypedQuery`), and the modules behind them re-exported for Phase F's services facade. The
 * contract is narrow on purpose:
 *
 *   - Nothing throws. A question the model does not license, a reference that does not resolve, an
 *     expression outside the supported grammar: all are SUCCESSFUL results with
 *     `outcome: "unlicensed"` and a refusal sentence. "Cannot be answered from this model" is
 *     information, not an exception (V7).
 *   - Every result carries `systemHash`, computed here from the system that was actually analysed.
 *     A result that outlives its model is the failure the analysis-execution model exists to
 *     prevent, and the only way to make that structural is to never let a result be built without
 *     the hash.
 *   - No booleans. The vocabulary is `holds | refuted | inconclusive | unlicensed`, and bounded
 *     coverage reads `inconclusive` (V22).
 *
 * Dependencies point inward: this module reaches `../ir/`, its own siblings, and the quantitative
 * evaluator (`../quant/`) — which itself reaches only this package's internals and the IR, so the
 * analysis layer stays a strict layer over the kernel with no view in sight.
 */
import { systemHash } from "../ir/hash.ts";
import type { CanonicalSystem, QueryResult, SavedQuery } from "../ir/types.ts";
import { runQuantityQuery } from "../quant/query.ts";
import { runBehaviorQuery } from "./behavior.ts";
import { runGraphQuery, type GraphAnswer } from "./graph.ts";
import { absentSubstrateProse, modelTypeForQueryKind } from "./model-types.ts";
import { narrate, type Narration } from "./narrate.ts";
import { detail, parseQuery, unlicensed, type Query, type Refusal, type Verdict } from "./types.ts";

export { runBehaviorQuery } from "./behavior.ts";
export { runGraphQuery, type GraphAnswer } from "./graph.ts";
export {
  compileSystem, cycleThrough, DEFAULT_STATE_LIMIT, defaultOptions, exploreSpace,
  findConfigurationCycle, pathBetween, traceTo,
  type ExploreOptions, type SpaceHit, type StateSpace, type StopReason,
} from "./explore.ts";
export { compileHistory, runPastTimeQuery, type HistoryCompilation, type PastTimeQuery } from "./history.ts";
export {
  absentSubstrateProse, MODEL_TYPES, modelTypeForQueryKind,
  type ModelType, type ModelTypeId, type SchemaAuthority,
} from "./model-types.ts";
export { narrate, type Delta, type NarratedStep, type Narration } from "./narrate.ts";
export { compilePredicate, describePredicate } from "./predicate.ts";
export { buildScope, resolveRef, type Ref, type RefScope } from "./refs.ts";
export {
  parseBehaviorQuery, parseGraphQuery, parsePredicate, parseQuantityQuery, parseQuery,
  type BehaviorForm, type BehaviorQuery, type GraphForm, type GraphQuery, type Predicate,
  type Quantifier, type QuantityQuery, type Query, type Refusal, type RefusalReason, type Verdict,
} from "./types.ts";
export { runQuantityQuery } from "../quant/query.ts";

/**
 * A verdict plus the structured non-visual twin.
 *
 * Three representations of one answer, deliberately: the schema-shaped `result` for persistence and
 * the agent API, the structured `refusal` for an agent that needs to know WHICH distinction is
 * missing, and `narration` for a reader or a screen reader (FR-A11Y-2). None of the three is
 * derived from the rendering of another.
 */
export interface Answer {
  readonly result: QueryResult;
  readonly refusal: Refusal | null;
  readonly narration: Narration;
  /** Populated by `all-paths`, `components`, `predecessors`, `successors`, `containment`. */
  readonly nodeSets: readonly (readonly string[])[];
}

const withNarration = (v: Verdict): Answer =>
  ({ result: v.result, refusal: v.refusal, narration: narrate(v.result), nodeSets: v.nodeSets });

export function runTypedQuery(system: CanonicalSystem, q: Query): Answer {
  const hash = systemHash(system);
  // The model-type registry's consultation rung, ahead of every evaluator. A question asked of a
  // substrate the system does not declare used to fall through to whatever the evaluator computed
  // over nothing: a latency of 0 ms that looked measured, a deadend that held over the one empty
  // configuration, an unknown-vocabulary refusal that read as a typo hunt. The registry names the
  // absent TYPE instead, with the authoring move that would license the question — the same
  // decision-over-absence precedence the purposeful-omission rung established.
  const modelType = modelTypeForQueryKind(q.kind);
  if (!modelType.presentIn(system)) {
    return withNarration(unlicensed(hash, absentSubstrateProse(modelType), null,
      detail("missing-model-type", [modelType.label], [])));
  }
  const v: Verdict = q.kind === "graph"
    ? (runGraphQuery(system, q.graph, q.quantifier, hash) satisfies GraphAnswer)
    : q.kind === "behavior"
      ? runBehaviorQuery(system, q.behavior, q.quantifier, hash)
      : runQuantityQuery(system, q.quantity, q.quantifier, hash);
  return withNarration(v);
}

/** Run a query as loaded from a model file or handed over by an agent. */
export function runQuery(system: CanonicalSystem, raw: unknown): Answer {
  const parsed = parseQuery(raw);
  if (!parsed.ok) {
    return withNarration(unlicensed(systemHash(system), parsed.refusal, null, parsed.detail));
  }
  return runTypedQuery(system, parsed.value);
}

/**
 * Run every saved query in the system.
 *
 * Saved queries are persistent artifacts that re-run when the model changes (§7.4), so this is the
 * operation the UI calls after every transaction. Results are keyed by query id and each carries
 * the hash of the system it describes, which is what lets a caller discard a stale answer instead
 * of presenting it.
 */
export function runSavedQueries(system: CanonicalSystem): ReadonlyMap<string, Answer> {
  const out = new Map<string, Answer>();
  for (const [id, saved] of system.queries) out.set(id, runQuery(system, (saved satisfies SavedQuery).raw));
  return out;
}

/**
 * Whether a saved query's `expect` was met — for the CI-gate use in `validate.py`'s `check_queries`.
 *
 * A query WITHOUT `expect` is exploratory and is never a failure. A bare `true`/`false` arriving
 * here is a YAML-coercion bug, not an expectation, and is reported as one (V25): the outcome
 * vocabulary is deliberately not boolean, so `expect: false` can only have been coerced.
 */
export type ExpectationVerdict =
  | { readonly kind: "exploratory" }
  | { readonly kind: "met"; readonly outcome: QueryResult["outcome"] }
  | { readonly kind: "unmet"; readonly expected: string; readonly outcome: QueryResult["outcome"] }
  | { readonly kind: "coerced"; readonly message: string };

const OUTCOMES: ReadonlySet<string> = new Set(["holds", "refuted", "inconclusive", "unlicensed"]);

export function checkExpectation(raw: unknown, res: QueryResult): ExpectationVerdict {
  const expect = typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)["expect"]
    : undefined;
  if (expect === undefined || expect === null) return { kind: "exploratory" };
  if (typeof expect === "boolean") {
    return {
      kind: "coerced",
      message:
        `expect loaded as boolean ${String(expect)} — a YAML 1.1 loader coerced it. Use 'holds' ` +
        `or 'refuted'; the outcome vocabulary is deliberately not true/false (V25).`,
    };
  }
  if (typeof expect !== "string" || !OUTCOMES.has(expect)) {
    return {
      kind: "coerced",
      message: `expect '${String(expect)}' is not one of holds, refuted, inconclusive, unlicensed.`,
    };
  }
  return expect === res.outcome
    ? { kind: "met", outcome: res.outcome }
    : { kind: "unmet", expected: expect, outcome: res.outcome };
}
