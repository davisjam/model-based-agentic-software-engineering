/**
 * Requirements evaluate into the EXISTING vocabulary: Outcome + Coverage + Evidence. No new
 * outcome words — a requirement holds, is refuted with a counterexample, is inconclusive under
 * incomplete coverage, or is unlicensed. The computed figures travel BESIDE the schema-shaped
 * result (`RequirementAnalysis`), the way the engine's `Verdict` carries its structured refusal.
 *
 * Outcome mapping, and the V22 discipline it follows (see behavior.ts's header):
 *
 *  - a violating execution or configuration REFUTES on its own evidence, however little of the
 *    space was walked — coverage reads exhaustive with respect to the question;
 *  - an UNBOUNDED maximum refutes any finite bound, and its evidence is the Q5 lasso: the
 *    repeatable cycle IS the counterexample, in the existing `lasso` evidence shape;
 *  - `holds` needs the whole space: a truncated walk with no violation is `inconclusive` under
 *    bounded coverage, never a quiet "yes".
 *
 * v0.1 is worst-case only (Q1): the operators are `<=` and `<`, which select the upper end of any
 * declared range. An operator needing the lower or both ends is refused by name, because interval
 * arithmetic is what the ruling defers to SMT rather than having us maintain a weaker semantics.
 */
import { systemHash } from "../ir/hash.ts";
import type {
  CanonicalSystem, Compilation, Configuration, Coverage, Evidence, ResultMagnitude,
} from "../ir/types.ts";
import { ACCOUNTED_METRICS, DIMENSIONS, evidenceSteps, type Dimension } from "../ir/types.ts";
import {
  detail, exhaustive, result, unlicensed, type Fail, type Verdict,
} from "../engine/types.ts";
import type { Satisfiability } from "../engine/predicate.ts";
import { maxOverExecutions, defaultPathOptions, type PathMetric } from "./latency.ts";
import { peakMemory, defaultMemoryOptions } from "./memory.ts";
import { parseBound, type QuantAnswer, type RequirementAnalysis } from "./types.ts";

/** The requirement metrics v0.1 answers: the two path metrics, plus the configuration maximum. */
export const REQUIREMENT_METRICS = ["latency", "cost", "peak_memory"] as const;

export type RequirementMetric = typeof REQUIREMENT_METRICS[number];

const WORST_CASE_OPERATORS = ["<=", "<"] as const;

export interface QuantRequirement {
  readonly id: string | null;
  readonly metric: string;
  readonly operator: string;
  /** A unit-bearing literal, "750 ms" — the V28 discipline applies to bounds too. */
  readonly bound: string;
}

/**
 * An execution selection whose SATISFIABILITY is already decided (V44).
 *
 * `match` is what the walk needs. `satisfiability` is what the vacuity disclosure needs, and it is
 * decided from the declarations alone — before any walk, by projecting the predicate onto the
 * coordinates it reads. Carrying the DECIDED answer rather than the predicate is what makes
 * budget-independence structural instead of conventional: at the point the disclosure is chosen
 * there is no predicate left to re-decide and no scope to decide it against, so a later edit cannot
 * quietly condition it on coverage the way the empty-selection proxy did.
 */
export interface ExecutionSelection {
  readonly match: (cfg: Configuration) => boolean;
  readonly satisfiability: Satisfiability;
  /** The authored selection, for the remedy sentence the disclosure carries. */
  readonly described: string;
}

export interface RequirementOptions {
  readonly limit: number;
  /** Path metrics only: restrict the worst case to executions reaching this. See PathOptions.target. */
  readonly target: ExecutionSelection | null;
}

export const defaultRequirementOptions = (): RequirementOptions =>
  ({ limit: defaultPathOptions().limit, target: null });

/** The magnitude a decided bound reports: the observed figure, in the dimension's base unit. */
const magnitudeOf = (dimension: Dimension, observed: number | null): ResultMagnitude | null =>
  observed === null ? null : { value: observed, dimension, unit: DIMENSIONS[dimension].base };

const fromVerdict = (v: Verdict): QuantAnswer =>
  ({ result: v.result, refusal: v.refusal, analysis: null });

const refuse = (hash: string, f: Fail, interpretedAs: string | null): QuantAnswer =>
  fromVerdict(unlicensed(hash, f.refusal, interpretedAs, f.detail));

const asCompilation = (notes: readonly string[]): { kind: "other"; explanation: string }[] =>
  notes.map((explanation) => ({ kind: "other", explanation }));

/**
 * One note under a named kind, for the disclosures whose kind is the point rather than the prose.
 *
 * `asCompilation` above flattens an inherited note list to `other`, which is right for notes that
 * only narrate. A vacuous holds is not narration: it changes what the verdict means, and a renderer
 * that branches on `outcome` alone cannot tell it from an earned one.
 */
const disclose = (kind: Compilation["kind"], explanation: string): Compilation =>
  ({ kind, explanation });

/**
 * The two questions a selection-shaped absence answers, which read opposite polarities of the same
 * emptiness: a ceiling is a universal and holds over nothing, a measurement is an existential and is
 * refuted by nothing. V41's table has a vacuous row under each.
 */
export type SelectionAbsenceForm = "ceiling" | "measurement";

/**
 * What to say when no execution reached the selection — the shared discrimination (V44).
 *
 * Both quantity paths reach this, and they MUST reach the same one: a second copy keyed on an empty
 * selection would re-introduce the over-firing in whichever path kept it. The discriminator is the
 * predicate's satisfiability and never the coverage; `truncated` only chooses which prose describes
 * an absence that is NOT vacuous.
 */
export function vacuityNotes(
  satisfiability: Satisfiability, truncated: boolean, described: string,
  form: SelectionAbsenceForm,
): readonly Compilation[] {
  if (satisfiability === "unsatisfiable") {
    // Decided before the walk begins, so this travels at every budget. V41's letter.
    const consequence = form === "ceiling"
      ? `so the bound holds vacuously — it was decided by the predicate, and there is nothing to charge`
      : `so there is nothing to measure and the refutation is vacuous — it was decided by the predicate`;
    return [disclose("vacuous",
      `No configuration the state vector admits satisfies '${described}', ${consequence}. The sound ` +
      `reading is that this model cannot REPRESENT the selected executions, which is stronger than ` +
      `"no execution reaches them". If the selection was meant to be reachable, that absence is the ` +
      `finding: fix the predicate.`)];
  }

  const undecided = satisfiability === "unknown"
    ? [disclose("other",
      `Whether the selection is satisfiable at all was NOT decided: the projection onto the ` +
      `coordinates it reads exceeded the enumeration budget. So this absence is not reported as ` +
      `vacuous, and it is not claimed as earned either.`)]
    : [];

  if (truncated) {
    return [disclose("other",
      `No execution in the explored region reaches the selected configurations, and the walk was ` +
      `truncated — nothing is established either way.`), ...undecided];
  }
  // A complete walk found nothing, and the selection is representable. The design prevents it, which
  // is a statement about the system — the EARNED absence V41 forbids disclosing as vacuity. When
  // satisfiability was not decided the same silence applies, but the claim is not made.
  const earned = satisfiability === "satisfiable"
    ? `The selection is SATISFIABLE in the state vector, so this is the design preventing it rather ` +
      `than a contradiction in the predicate — an earned absence, and the finding if the selection ` +
      `was meant to be reachable.`
    : `Whether any state vector admits the selection was not established, so this absence is not ` +
      `characterised either way.`;
  const opening = form === "ceiling"
    ? `No execution reaches the selected configurations, so the bound holds with nothing to charge.`
    : `No execution reaches the selected configurations, so there is nothing to measure.`;
  return [disclose("other", `${opening} ${earned}`), ...undecided];
}

export function evaluateRequirement(
  system: CanonicalSystem, req: QuantRequirement, options: RequirementOptions = defaultRequirementOptions(),
): QuantAnswer {
  const hash = systemHash(system);
  const name = req.id === null ? "requirement" : `requirement '${req.id}'`;

  const metric = REQUIREMENT_METRICS.find((m) => m === req.metric);
  if (metric === undefined) {
    return refuse(hash, {
      ok: false,
      refusal: `${name} names metric '${req.metric}', which is not one of ${REQUIREMENT_METRICS.join(", ")}.`,
      detail: detail("unknown-vocabulary", [`metric '${req.metric}'`]),
    }, null);
  }
  const dimension: Dimension = metric === "peak_memory" ? "memory" : ACCOUNTED_METRICS[metric];
  const unit = DIMENSIONS[dimension].base ?? "";

  const operator = WORST_CASE_OPERATORS.find((o) => o === req.operator);
  if (operator === undefined) {
    // The Q1 refusal: any other operator asks about the lower or both ends of declared ranges,
    // and interval semantics is deferred to SMT rather than maintained in a weaker form here.
    return refuse(hash, {
      ok: false,
      refusal:
        `${name} uses operator '${req.operator}'. v0.1 evaluates worst-case bounds only — '<=' ` +
        `and '<', which select the upper end of any declared range. '${req.operator}' needs the ` +
        `lower or both ends, which is interval arithmetic; the ruling defers that to SMT rather ` +
        `than maintaining a deliberately weaker interval semantics in the meantime.`,
      detail: detail("reserved-feature", [`operator '${req.operator}' over ranged quantities (interval arithmetic)`]),
    }, null);
  }

  const bound = parseBound(dimension, req.bound);
  if (!bound.ok) return refuse(hash, { ok: false, refusal: `${name}: ${bound.refusal}`, detail: bound.detail }, null);

  const interpretedAs = metric === "peak_memory"
    ? `Does every reachable configuration keep memory(c) ${operator} ${req.bound}?`
    : `Does every execution keep ${metric} ${operator} ${req.bound}? ` +
      `(worst case: upper ends of declared ranges)`;

  return metric === "peak_memory"
    ? evaluatePeak(system, hash, interpretedAs, metric, dimension, unit, operator, bound.value, req.bound, options)
    : evaluatePath(system, hash, interpretedAs, metric, dimension, unit, operator, bound.value, req.bound, options);
}

type Operator = typeof WORST_CASE_OPERATORS[number];

const violates = (observed: number, operator: Operator, bound: number): boolean =>
  operator === "<=" ? observed > bound : observed >= bound;

/** Exported for the quantity query form, which decides the same bound from a declared ceiling. */
export function evaluatePath(
  system: CanonicalSystem, hash: string, interpretedAs: string, metric: PathMetric,
  dimension: Dimension, unit: string, operator: Operator, bound: number, boundRaw: string,
  options: RequirementOptions,
): QuantAnswer {
  const max = maxOverExecutions(system, metric, {
    limit: options.limit, end: "upper", target: options.target?.match ?? null,
  });
  if (!max.ok) return refuse(hash, max, interpretedAs);
  const analysisBase = { metric, dimension, unit, bound };

  if (max.value.kind === "none") {
    // Only a target selection can produce this: no explored execution reaches the selected
    // configurations. TWO independent axes decide what to say, and keeping them apart is the whole
    // of V44 — the defect was one proxy standing in for both.
    //
    // The OUTCOME follows coverage (V22), unchanged: a truncated walk cannot report a universal as
    // established, and `holds` beside `bounded` is the certainty-from-truncation this suite asserts
    // against in several places. Unsatisfiability does NOT promote it — that matches the behavioural
    // evaluator, which also keeps the outcome unsettled under a bound and lets only the disclosure
    // ride along.
    //
    // The DISCLOSURE follows SATISFIABILITY, never coverage:
    //
    //  - UNSATISFIABLE: no configuration the state vector admits satisfies the selection. Decided
    //    before the walk begins, so the disclosure travels at EVERY budget — the emptiness is a fact
    //    about the author's predicate, and truncation cannot weaken it.
    //  - SATISFIABLE: the EARNED absence. The model can represent the selection and the design
    //    prevents it, which is a statement about the system. Disclosing vacuity here is the
    //    over-firing §7.1 forbids, and since V43 reads the disclosure it would downgrade a sound
    //    requirement rather than merely mislabel a verdict.
    //  - UNKNOWN: the projection exceeded its enumeration budget, so vacuity was not decided. Never
    //    read as satisfiable, so never claimed earned — and never claimed vacuous either.
    const selection = options.target;
    const described = selection?.described ?? "the selection";
    const truncated = max.value.coverage.kind === "bounded";
    return {
      result: result({
        outcome: truncated ? "inconclusive" : "holds",
        coverage: max.value.coverage, systemHash: hash, interpretedAs,
        compilation: [
          ...asCompilation(max.value.notes),
          ...vacuityNotes(selection?.satisfiability ?? "satisfiable", truncated, described, "ceiling"),
        ],
      }),
      refusal: null,
      analysis: { ...analysisBase, observed: null, unbounded: false, charges: null },
    };
  }

  if (max.value.kind === "unbounded") {
    // The Q5 shape: a positive repeatable cycle refutes EVERY finite bound, so the cycle witness
    // is the counterexample and the existing lasso evidence carries it. Settled by evidence,
    // so coverage reads exhaustive with respect to the question (V22, behavior.ts discipline).
    const evidence: Evidence = {
      shape: "lasso", role: "counterexample",
      steps: evidenceSteps(max.value.prefix), cycle: evidenceSteps(max.value.cycle), nodes: null,
    };
    return {
      result: result({
        outcome: "refuted", coverage: exhaustive(coverageStates(max.value.coverage)), systemHash: hash,
        evidence, interpretedAs,
        compilation: asCompilation([
          ...max.value.notes,
          `The ${metric} maximum is unbounded: the repeatable cycle shown charges ` +
          `${max.value.cycleGain} ${unit} per iteration, so every finite bound — including ` +
          `${boundRaw} — is eventually exceeded.`,
        ]),
      }),
      refusal: null,
      analysis: { ...analysisBase, observed: null, unbounded: true, charges: null },
    };
  }

  const { total, trace, charges, coverage, notes } = max.value;
  if (violates(total, operator, bound)) {
    const evidence: Evidence = { shape: "trace", role: "counterexample", steps: evidenceSteps(trace), cycle: null, nodes: null };
    return {
      result: result({
        outcome: "refuted", coverage: exhaustive(coverageStates(coverage)), systemHash: hash,
        evidence, interpretedAs, compilation: asCompilation(notes),
        magnitude: magnitudeOf(dimension, total),
      }),
      refusal: null,
      analysis: { ...analysisBase, observed: total, unbounded: false, charges },
    };
  }
  return withinBound(hash, interpretedAs, coverage, notes, { ...analysisBase, observed: total, unbounded: false, charges });
}

/** Exported for the quantity query form — see evaluatePath. */
export function evaluatePeak(
  system: CanonicalSystem, hash: string, interpretedAs: string, metric: RequirementMetric,
  dimension: Dimension, unit: string, operator: Operator, bound: number, _boundRaw: string,
  options: RequirementOptions,
): QuantAnswer {
  const peak = peakMemory(system, { ...defaultMemoryOptions(), limit: options.limit });
  if (!peak.ok) return refuse(hash, peak, interpretedAs);
  const { peak: observed, charged, trace, coverage, notes } = peak.value;
  const charges = charged.map((c) => ({ quantity: c.quantity, entity: c.entity, occurrences: 1, each: c.value, subtotal: c.value }));
  const analysis: RequirementAnalysis = { metric, dimension, unit, bound, observed, unbounded: false, charges };

  if (violates(observed, operator, bound)) {
    // The counterexample is the configuration, reached by the trace. An empty trace means the
    // INITIAL configuration already violates — still a trace, of length zero.
    const evidence: Evidence = { shape: "trace", role: "counterexample", steps: evidenceSteps(trace), cycle: null, nodes: null };
    return {
      result: result({
        outcome: "refuted", coverage: exhaustive(coverageStates(coverage)), systemHash: hash,
        evidence, interpretedAs, compilation: asCompilation(notes),
        magnitude: magnitudeOf(dimension, observed),
      }),
      refusal: null,
      analysis,
    };
  }
  return withinBound(hash, interpretedAs, coverage, notes, analysis);
}

/** No violation found: holds under a complete walk, inconclusive under a truncated one (V22). */
function withinBound(
  hash: string, interpretedAs: string, coverage: Coverage, notes: readonly string[],
  analysis: RequirementAnalysis,
): QuantAnswer {
  if (coverage.kind === "bounded") {
    return {
      result: result({
        outcome: "inconclusive", coverage, systemHash: hash, interpretedAs,
        compilation: asCompilation([
          ...notes,
          `Exploration stopped at the ${coverage.statesExplored}-configuration limit with work ` +
          `outstanding, so the bound is established only over the explored region. The sound ` +
          `statement is "not exceeded within the explored region", never "satisfied".`,
        ]),
        magnitude: magnitudeOf(analysis.dimension, analysis.observed),
      }),
      refusal: null,
      analysis,
    };
  }
  return {
    result: result({
      outcome: "holds", coverage, systemHash: hash, interpretedAs, compilation: asCompilation(notes),
      magnitude: magnitudeOf(analysis.dimension, analysis.observed),
    }),
    refusal: null,
    analysis,
  };
}

const coverageStates = (c: Coverage): number => c.statesExplored;

// --------------------------------------------------------------------------------------------
// Expectation — the flagship not-answerable case (Q4)
// --------------------------------------------------------------------------------------------

/**
 * Expected latency is OUT of v0.1's scope, and the two refusals below are different facts:
 *
 *  - with no declared frequency, the question is not answerable FROM THE MODEL — purposeful
 *    omission applied to quantitative reasoning, and the refusal names the missing frequency so
 *    the author knows what to model (§5.6's flagship case);
 *  - with a frequency declared, the gap is OURS: expectation over a branching space is probability
 *    composition over paths, a probabilistic model checker this version deliberately is not. The
 *    honest v0.1 route is two hypotheses the user compares — all-hit and all-miss — which the
 *    hypothesis machinery already supports and which teaches the bound honestly.
 */
export function expectedMetric(system: CanonicalSystem, metric: string): QuantAnswer {
  const hash = systemHash(system);
  const interpretedAs = `What is the expected ${metric}, weighting each alternative by its frequency?`;
  const frequencies = [...system.quantities.values()].filter((q) => q.dimension === "ratio");

  if (frequencies.length === 0) {
    return fromVerdict(unlicensed(hash,
      `Not answerable. The model represents the costs of the alternatives but deliberately omits ` +
      `their frequencies: no quantity of dimension 'ratio' declares how often each alternative is ` +
      `taken. An expectation is a frequency-weighted sum, so without the frequency there is ` +
      `nothing to weight by. Declare the missing frequency — a hit rate, a retry rate — as a ` +
      `ratio quantity on the entity whose alternatives it governs.`,
      interpretedAs,
      detail("missing-distinction",
        [`a frequency (dimension: ratio) for each alternative — e.g. a hit rate`])));
  }

  const names = frequencies.map((q) => `'${q.id}'`).join(", ");
  return fromVerdict(unlicensed(hash,
    `Expected ${metric} needs probability composition over paths, which v0.1 deliberately does ` +
    `not do — that is a probabilistic model checker, not modest quantitative modeling. The ` +
    `declared ${frequencies.length === 1 ? "frequency" : "frequencies"} ${names} will license it ` +
    `in a later phase. Until then, compare two hypotheses — one per alternative (all-hit and ` +
    `all-miss) — which bounds the answer honestly.`,
    interpretedAs,
    detail("reserved-feature", ["expectation over a branching state space (probability composition over paths)"])));
}
