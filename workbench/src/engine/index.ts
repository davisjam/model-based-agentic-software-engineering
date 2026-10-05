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
import type { CanonicalSystem, Coverage, Outcome, QueryResult, SavedQuery } from "../ir/types.ts";
import { bearsAConclusion, evaluationOf } from "../ir/types.ts";
import { runQuantityQuery } from "../quant/query.ts";
import { runBehaviorQuery } from "./behavior.ts";
import { runGraphQuery, type GraphAnswer } from "./graph.ts";
import { absentSubstrateVerdict } from "./model-types.ts";
import { narrate, type Narration } from "./narrate.ts";
import { parseQuery, unlicensed, type Query, type Refusal, type Verdict } from "./types.ts";
import { verifyDeclaration, type Verification } from "./verification.ts";

export { admitBehaviorQuery, runBehaviorQuery, type BehaviorPlan, type BehaviorSubject } from "./behavior.ts";
export {
  admitTyped, alternatives, checkQuery, type QueryCheckResult, type TypedAdmission,
} from "./check.ts";
export {
  admitGraphQuery, runGraphQuery,
  type GraphAnswer, type GraphPlan, type GraphSubject,
} from "./graph.ts";
export {
  countElements, interpretElementSelector, parseElementSelector, selectElements,
  type Cardinality, type ElementCount, type ElementSelection, type ElementSelector,
} from "./elements.ts";
export {
  compileSystem, cycleThrough, DEFAULT_STATE_LIMIT, defaultOptions, exploreSpace,
  findConfigurationCycle, pathBetween, traceTo,
  type ExploreOptions, type SpaceHit, type StateSpace, type StopReason,
} from "./explore.ts";
export { compileHistory, runPastTimeQuery, type HistoryCompilation, type PastTimeQuery } from "./history.ts";
export {
  absentSubstrateProse, absentSubstrateVerdict, MODEL_TYPES, modelTypeForQueryKind,
  type ModelType, type ModelTypeId, type QueryNoun, type SchemaAuthority, type SubjectSelector,
} from "./model-types.ts";
export { narrate, type Delta, type NarratedStep, type Narration } from "./narrate.ts";
export { compilePredicate, describePredicate } from "./predicate.ts";
export { buildScope, resolveRef, type Ref, type RefScope } from "./refs.ts";
export {
  parseBehaviorQuery, parseGraphQuery, parsePredicate, parsePropConstraints, parseQuantityQuery,
  parseQuery, QUANTIFIERS, QUANTIFIER_EVIDENCE,
  type Admission, type BehaviorForm, type BehaviorQuery, type GraphForm, type GraphQuery,
  type Predicate, type PropConstraint, type Quantifier, type QuantityQuery, type Query,
  type Refusal, type RefusalReason, type Verdict,
} from "./types.ts";
export { admitQuantityQuery, runQuantityQuery, type QuantityPlan } from "../quant/query.ts";
export {
  parseRequirement, verificationError, VERIFICATION_TEXT, verify, verifyDeclaration,
  type InconclusiveCause, type Requirement, type RequirementParse, type RequirementProblem,
  type Verification, type VerificationStatus,
} from "./verification.ts";

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
  const absent = absentSubstrateVerdict(system, q.kind, hash);
  if (absent !== null) return withNarration(absent);
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
 * Verify every obligation the system declares, keyed by the id the author wrote.
 *
 * This is the JOIN, and it lives here rather than in `verification.ts` for a reason worth stating:
 * `verification.ts` knows a declaration and a result and nothing else, which is what makes `verify`
 * callable without a system and testable without one. The system-level step needs the query runner,
 * so putting it there would point the pure layer at the evaluator.
 *
 * `known` is the system's DECLARED query ids rather than the result map's keys, and the two are not
 * the same claim. A requirement naming a query the system does not declare is a DECLARATION error —
 * `error`, which never reads satisfied. A requirement naming a declared query that produced no
 * result would be `inconclusive` with cause `not-evaluated`. Deriving `known` from the results would
 * collapse the first into the second and report a dangling reference as a search that has not run.
 *
 * The same join supplies each requirement's DECIDING QUERY, parsed, which is what lets
 * `verifyDeclaration` refuse a requirement whose named query cannot decide it — a measurement that
 * discharges nothing, or a ceiling claim whose polarity is inverted. The shape comes from the
 * authored raw the IR already carries, so nothing in the IR changes to make it available. Parsed
 * here rather than in `verification.ts` for this function's own stated reason: the pure layer knows
 * a declaration and a result, and pointing it at the query parser is what living here avoids.
 *
 * Nothing is stored. Call it again after a transaction and the answers move with the model, which is
 * the whole of what the construct is for: *the model changed, the query did not.*
 */
export function verifySystemRequirements(
  system: CanonicalSystem,
): ReadonlyMap<string, Verification> {
  const results = new Map<string, QueryResult>();
  for (const [id, answer] of runSavedQueries(system)) results.set(id, answer.result);
  const known = new Set(system.queries.keys());

  // Parsed once per query, not per requirement, and keyed by the id `expressed_as` names — so the
  // join resolves it through `Requirement.expressedAs` and nothing re-reads the authored key.
  const shapes = new Map<string, Query>();
  for (const [id, saved] of system.queries) {
    const parsed = parseQuery(saved.raw);
    if (parsed.ok) shapes.set(id, parsed.value);
  }

  const out = new Map<string, Verification>();
  for (const [id, declared] of system.requirements) {
    out.set(id, verifyDeclaration(declared.raw, `requirements.${id}`, results, known, shapes));
  }
  return out;
}

/**
 * Whether a saved query's `expect` was met — for the CI-gate use in `validate.py`'s `check_queries`,
 * and for the requirement line the property surface renders.
 *
 * A query WITHOUT `expect` is exploratory and is never a failure. A bare `true`/`false` arriving
 * here is a YAML-coercion bug, not an expectation, and is reported as one (V25): the outcome
 * vocabulary is deliberately not boolean, so `expect: false` can only have been coerced.
 *
 * ## Why there are three ways to fall short, and not one
 *
 * This union read `met | unmet | coerced`, and `unmet` was computed as `expect !== res.outcome` — a
 * NEGATION, so every answer that was not the predicted one arrived wearing the same word. A pin of
 * `refuted` answered `inconclusive` because the walk hit `state-limit` was reported as an
 * engineering fact the engineer had broken, when what happened is that the search ran out of
 * budget. A pin answered `unlicensed` was reported the same way, when what happened is that the
 * models decline the question. Those three have three different remedies — change the system under
 * design, raise the budget, declare the vocabulary — and one word for all three sends two of the
 * three readers in the wrong direction (`DESIGN-v02-requirements-261004.md` §3.3, §3.4).
 *
 * So the arms are split by REMEDY, and `standingOf` below holds the split with a switch the
 * compiler checks over `Outcome`: a fifth outcome cannot default into an accusation, because it
 * would not compile until someone decided which arm it belongs in. This is the discipline
 * `check.ts`'s `alternatives` already uses for `RefusalReason`.
 *
 * The words stay `expect`'s — a PREDICTION the engineer recorded — and not
 * `satisfied | violated | not-verifiable`, which belong to a PRESCRIPTION. Presence of `expect` does
 * not declare normativity: `examples/docable.mage.yaml:328-340` pins `expect: unlicensed` as
 * pedagogy, and §2 of the design splits the pinned axis from the normative one with a second field.
 * The normative vocabulary lands with that field, not over this one.
 */
export type ExpectationVerdict =
  | { readonly kind: "exploratory" }
  | { readonly kind: "met"; readonly outcome: Outcome }
  /**
   * A conclusive answer that contradicts the pin. This is the one arm that reports a finding about
   * the system under design, and evidence settled it, so coverage does not soften it.
   */
  | { readonly kind: "unmet"; readonly expected: Outcome; readonly outcome: Outcome }
  /**
   * Answered, and the answer does not settle the pin. The remedy is budget, never a model change,
   * so `limit` travels with the arm: "the search hit `state-limit`" and "this may be broken" are
   * different sentences and must not look alike.
   */
  | {
    readonly kind: "unsettled"; readonly expected: Outcome; readonly outcome: Outcome;
    readonly limit: Coverage["reason"];
  }
  /**
   * The models decline the question. The remedy is a model, so the refusal sentence travels with
   * the arm — a decline that drops it is worse than no verdict, because nothing then names the
   * missing distinction.
   */
  | { readonly kind: "declined"; readonly expected: Outcome; readonly refusal: string | null }
  | { readonly kind: "coerced"; readonly message: string };

/**
 * The outcome words an `expect` may name, as a VALUE: `Outcome` is erased at runtime and the input
 * here is untyped YAML. Keyed BY `Outcome`, so the compiler refuses a table missing a word or
 * carrying one the union does not have — the earlier hand-written `Set` of the same four strings
 * was free to drift from the union it mirrored.
 */
const OUTCOME_WORDS: Readonly<Record<Outcome, true>> = {
  holds: true, refuted: true, inconclusive: true, unlicensed: true,
};

const isOutcome = (s: string): s is Outcome => Object.hasOwn(OUTCOME_WORDS, s);

/**
 * How the pin stands against the answer. TOTAL over `EvaluationStatus` by the compiler — no
 * `default`, and a declared return type, so a status added to the vocabulary is a type error here
 * before it is a wrong word anywhere else.
 *
 * Switching over the EVALUATION rather than over `Outcome` is the §5.4 split applied to this path.
 * The arms here were already split by remedy, but they were derived from a four-valued union in
 * which `inconclusive` and `unlicensed` sit in the same position as `holds` — so the split was a
 * convention this function kept, and the next reader to switch on `res.outcome` was free to drop it.
 * `evaluationOf` makes the two non-propositions unreachable as proposition values, and the one
 * comparison left (`expected !== ev.verdict`) now compares two truth values rather than a prediction
 * against a status. `error` is absent because `ResultEvaluation` excludes it: the engine's contract
 * is that nothing throws, so no result carries an evaluator error.
 */
function standingOf(expected: Outcome, res: QueryResult): ExpectationVerdict {
  const ev = evaluationOf(res);
  switch (ev.status) {
    // A proposition value. Matching the pin is met, provided the coverage can bear a conclusion;
    // contradicting it is the accusation, and nothing softens it.
    case "completed":
      if (expected !== ev.verdict) return { kind: "unmet", expected, outcome: ev.verdict };
      return bearsAConclusion(ev.coverage)
        ? { kind: "met", outcome: ev.verdict }
        : { kind: "unsettled", expected, outcome: ev.verdict, limit: ev.coverage.reason };

    // The search did not settle the question. A pin that NAMED `inconclusive` is met by it — that
    // is a legitimate prediction about a bounded search — and every other pin is unsettled rather
    // than contradicted: "not refuted" is not "violated".
    case "exhausted":
      return expected === "inconclusive"
        ? { kind: "met", outcome: "inconclusive" }
        : { kind: "unsettled", expected, outcome: "inconclusive", limit: ev.limit };

    // The models decline. Folding this into `unsettled` would send the engineer to raise a budget
    // when the answer is to declare a relation type, and four layers below here keep the two apart.
    case "unlicensed":
      return expected === "unlicensed"
        ? { kind: "met", outcome: "unlicensed" }
        : { kind: "declined", expected, refusal: ev.refusal };
  }
}

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
  if (typeof expect !== "string" || !isOutcome(expect)) {
    return {
      kind: "coerced",
      message: `expect '${String(expect)}' is not one of ${Object.keys(OUTCOME_WORDS).join(", ")}.`,
    };
  }
  return standingOf(expect, res);
}
