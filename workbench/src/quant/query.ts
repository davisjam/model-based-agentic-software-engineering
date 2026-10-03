/**
 * The quantity query form — the surface that makes the evaluator's numbers ASKABLE.
 *
 * Two questions, told apart by `within`, and the quantifier each takes is forced:
 *
 *  - `within: <model:-quantity>` + `forall` — decide the declared ceiling: does every selected
 *    execution (or every reachable configuration) keep the metric at or under it? The outcome
 *    mapping is requirement.ts's, verbatim — this module computes nothing it does not reuse.
 *  - no `within` + `exists` — measure: the worst case over the selected executions, or the peak of
 *    memory(c) over the reachable set, reported as `result.magnitude` with a witness.
 *
 * What a caller can NOT say is how to aggregate. The aggregation is DERIVED from the metric's
 * dimension scope (§8): execution-scoped sums along executions and maximizes over them,
 * configuration-scoped evaluates memory(c) per configuration and peaks over the reachable set. A
 * `target` on a configuration-scoped metric is therefore a CATEGORY ERROR, refused by name, never
 * computed — the §29 refinement's `max|min|named` selector stays rejected.
 */
import { systemHash } from "../ir/hash.ts";
import type { CanonicalSystem, Configuration, Dimension, Evidence } from "../ir/types.ts";
import { ACCOUNTED_METRICS, AGGREGATE_TARGET_KIND, DIMENSIONS } from "../ir/types.ts";
import { buildScope } from "../engine/refs.ts";
import { compilePredicate, describePredicate } from "../engine/predicate.ts";
import { DEFAULT_STATE_LIMIT } from "../engine/explore.ts";
import {
  detail, result, unlicensed,
  type QuantityQuery, type Quantifier, type RefusalDetail, type Verdict,
} from "../engine/types.ts";
import { evaluatePath, evaluatePeak, REQUIREMENT_METRICS } from "./requirement.ts";
import { maxOverExecutions, type PathMetric } from "./latency.ts";
import { peakMemory } from "./memory.ts";
import { quantityMagnitude } from "./types.ts";

const asVerdict = (v: { result: Verdict["result"]; refusal: Verdict["refusal"] }): Verdict =>
  ({ result: v.result, refusal: v.refusal, nodeSets: [] });

const refuse = (
  hash: string, prose: string, interpretedAs: string | null, d: RefusalDetail,
): Verdict => unlicensed(hash, prose, interpretedAs, d);

/** One compilation note, in the shape the schema requires. */
const note = (explanation: string): { kind: "other"; explanation: string } => ({ kind: "other", explanation });

export function runQuantityQuery(
  system: CanonicalSystem, q: QuantityQuery, quantifier: Quantifier, hash: string = systemHash(system),
): Verdict {
  const metric = REQUIREMENT_METRICS.find((m) => m === q.metric);
  if (metric === undefined) {
    return refuse(hash,
      `quantity metric '${q.metric}' is not one of ${REQUIREMENT_METRICS.join(", ")}. The metric ` +
      `names the ANALYSIS, not a dimension: 'latency' and 'cost' are worst-case sums along ` +
      `executions, 'peak_memory' is the maximum of memory(c) over reachable configurations.`,
      null, detail("unknown-vocabulary", [`metric '${q.metric}'`]));
  }
  const dimension: Dimension = metric === "peak_memory" ? "memory" : ACCOUNTED_METRICS[metric];
  const scope = DIMENSIONS[dimension].scope;
  const unit = DIMENSIONS[dimension].base ?? "";
  const limit = q.limit ?? DEFAULT_STATE_LIMIT;

  // The category error, refused before anything explores. The aggregation axis is derived from the
  // scope, so there is no reading of "peak_memory along these executions" to compute.
  if (scope === "configuration" && q.target !== null) {
    return refuse(hash,
      `'${metric}' is ${dimension}, a configuration-scoped dimension: memory(c) is evaluated AT ` +
      `configurations and its maximum ranges over the reachable set (§8). A target selects ` +
      `executions, which is the axis a configuration-scoped quantity does not aggregate along — ` +
      `the question is a category error, not a computation. Drop 'target:', or ask an ` +
      `execution-scoped metric (latency, cost).`,
      null, detail("category-error", [], []));
  }

  // The ceiling, when the query decides one: a declared `model:` total of the metric's dimension.
  let bound: { readonly value: number; readonly raw: string; readonly id: string } | null = null;
  if (q.within !== null) {
    const declared = system.quantities.get(q.within);
    if (declared === undefined) {
      // The validator's V39 is the same finding at authoring time; the engine refuses at ask time.
      return refuse(hash,
        `'within' names quantity '${q.within}', which this system does not declare (V39). A ` +
        `ceiling is a declared 'model:'-targeted quantity — declare it, or name one that exists.`,
        null, detail("unknown-vocabulary", [`quantity '${q.within}'`]));
    }
    if (declared.target.kind !== AGGREGATE_TARGET_KIND) {
      return refuse(hash,
        `'within' names '${q.within}', which targets '${declared.target.raw}'. A ceiling is a ` +
        `declared TOTAL — a 'model:'-targeted quantity exempt from every accounting basis — and ` +
        `a ${String(declared.target.kind)}-targeted quantity is a summand of the analysis, not a ` +
        `bound on it.`,
        null, detail("unknown-vocabulary", [`a model:-targeted ceiling for ${metric}`]));
    }
    if (declared.dimension !== dimension) {
      return refuse(hash,
        `'within' names '${q.within}', which declares dimension ` +
        `'${String(declared.dimension ?? declared.dimensionRaw)}', and '${metric}' accounts ` +
        `${dimension}. Comparing a ${dimension} total against a ` +
        `${String(declared.dimension ?? declared.dimensionRaw)} ceiling is the cross-dimension ` +
        `arithmetic V30 refuses in the model, refused here for the same reason.`,
        null, detail("category-error", [], []));
    }
    const value = quantityMagnitude(declared, "point");
    if (!value.ok) return refuse(hash, `ceiling '${q.within}': ${value.refusal}`, null, value.detail ?? detail("reserved-feature"));
    const raw = declared.value.kind === "point" ? declared.value.magnitude.raw : `${value.value} ${unit}`;
    bound = { value: value.value, raw, id: q.within };
  }

  // The quantifier is FORCED by the question's shape, so a mismatch is refused rather than
  // reinterpreted: a ceiling claim is universal over the selected space, a measurement is
  // established by the witness that attains it.
  if (bound !== null && quantifier !== "forall") {
    return refuse(hash,
      `a 'within' query claims every ${scope === "configuration" ? "reachable configuration" : "selected execution"} ` +
      `stays at or under the declared ceiling — a universal claim, refuted by one counterexample. ` +
      `Declare 'quantifier: forall'.`,
      null, detail("quantifier-mismatch"));
  }
  if (bound === null && quantifier !== "exists") {
    return refuse(hash,
      `a measurement reports the worst case actually attained, and the evidence is the witness ` +
      `that attains it — existential evidence. Declare 'quantifier: exists', or add 'within:' to ` +
      `decide a declared ceiling universally.`,
      null, detail("quantifier-mismatch"));
  }

  // The execution selection, compiled against the system's own vocabulary before anything runs.
  let target: ((cfg: Configuration) => boolean) | null = null;
  let selection = "";
  if (q.target !== null) {
    const p = compilePredicate(buildScope(system), q.target);
    if (!p.ok) return refuse(hash, p.refusal, null, p.detail ?? detail("unknown-vocabulary"));
    target = p.value;
    selection = ` reaching ${describePredicate(q.target)}`;
  }

  if (bound !== null) {
    const interpretedAs = metric === "peak_memory"
      ? `Does every reachable configuration keep memory(c) <= ${bound.raw}, the declared ceiling '${bound.id}'?`
      : `Does every execution${selection} keep ${metric} <= ${bound.raw}, the declared ceiling ` +
        `'${bound.id}'? (worst case: upper ends of declared ranges)`;
    const answer = metric === "peak_memory"
      ? evaluatePeak(system, hash, interpretedAs, metric, dimension, unit, "<=", bound.value, bound.raw, { limit, target: null })
      : evaluatePath(system, hash, interpretedAs, metric, dimension, unit, "<=", bound.value, bound.raw, { limit, target });
    return asVerdict(answer);
  }

  return metric === "peak_memory"
    ? measurePeak(system, hash, dimension, unit, limit)
    : measurePath(system, hash, metric, dimension, unit, limit, target, selection);
}

// ---------------------------------------------------------------------------------------------
// Measurements — the figure, its witness, and coverage that never rounds up
// ---------------------------------------------------------------------------------------------

function measurePath(
  system: CanonicalSystem, hash: string, metric: PathMetric,
  dimension: Dimension, unit: string, limit: number,
  target: ((cfg: Configuration) => boolean) | null, selection: string,
): Verdict {
  const interpretedAs =
    `What is the worst-case ${metric} over executions${selection}? (upper ends of declared ranges)`;
  const max = maxOverExecutions(system, metric, { limit, end: "upper", target });
  if (!max.ok) return refuse(hash, max.refusal, interpretedAs, max.detail ?? detail("unknown-vocabulary"));

  if (max.value.kind === "none") {
    // Exhaustive absence refutes the existential; a truncated absence settles nothing (V22).
    const bounded = max.value.coverage.kind === "bounded";
    return asVerdict({
      result: result({
        outcome: bounded ? "inconclusive" : "refuted",
        coverage: max.value.coverage, systemHash: hash, interpretedAs,
        compilation: [...max.value.notes.map(note), note(bounded
          ? `No execution in the explored region reaches the selected configurations, and the walk ` +
            `was truncated — nothing is established either way.`
          : `No execution reaches the selected configurations, so there is nothing to measure.`)],
      }),
      refusal: null,
    });
  }

  if (max.value.kind === "unbounded") {
    // The Q5 witness, in measurement clothes: the repeatable cycle IS the answer, and no finite
    // magnitude could stand in for it — so `magnitude` stays null and the lasso carries the claim.
    const evidence: Evidence = {
      shape: "lasso", role: "witness", steps: max.value.prefix, cycle: max.value.cycle, nodes: null,
    };
    return asVerdict({
      result: result({
        outcome: "holds", coverage: max.value.coverage, systemHash: hash, interpretedAs, evidence,
        compilation: [...max.value.notes.map(note), note(
          `The ${metric} maximum is unbounded: the repeatable cycle shown charges ` +
          `${max.value.cycleGain} ${unit} per iteration, so every finite figure is exceeded by ` +
          `repetition. No magnitude is reported, because none would be true.`)],
      }),
      refusal: null,
    });
  }

  const { total, trace, coverage, notes } = max.value;
  const evidence: Evidence = { shape: "trace", role: "witness", steps: trace, cycle: null, nodes: null };
  const bounded = coverage.kind === "bounded";
  return asVerdict({
    result: result({
      outcome: bounded ? "inconclusive" : "holds",
      coverage, systemHash: hash, interpretedAs, evidence,
      magnitude: { value: total, dimension, unit: DIMENSIONS[dimension].base },
      compilation: bounded
        ? [...notes.map(note), note(
            `The walk was truncated, so ${total} ${unit} is the worst case over the EXPLORED ` +
            `region only — a weaker claim than a maximum over the system.`)]
        : notes.map(note),
    }),
    refusal: null,
  });
}

function measurePeak(
  system: CanonicalSystem, hash: string, dimension: Dimension, unit: string, limit: number,
): Verdict {
  const interpretedAs = `What is the peak memory(c) over reachable configurations?`;
  const peak = peakMemory(system, { limit, end: "upper" });
  if (!peak.ok) return refuse(hash, peak.refusal, interpretedAs, peak.detail ?? detail("unknown-vocabulary"));

  const { peak: value, trace, coverage, notes } = peak.value;
  const evidence: Evidence = { shape: "trace", role: "witness", steps: trace, cycle: null, nodes: null };
  const bounded = coverage.kind === "bounded";
  return asVerdict({
    result: result({
      outcome: bounded ? "inconclusive" : "holds",
      coverage, systemHash: hash, interpretedAs, evidence,
      magnitude: { value, dimension, unit: DIMENSIONS[dimension].base },
      compilation: bounded
        ? [...notes.map(note), note(
            `The walk was truncated, so ${value} ${unit} is the peak over the EXPLORED region ` +
            `only — a weaker claim than a peak over the reachable set.`)]
        : notes.map(note),
    }),
    refusal: null,
  });
}
