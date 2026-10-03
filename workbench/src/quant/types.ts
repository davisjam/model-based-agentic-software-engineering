/**
 * Quantitative evaluation — result shapes and the worst-case end selection (Q1).
 *
 * This module is the layer SEMANTICS.md §5.3 leaves "unbuilt, and blocked on nothing but work":
 * it computes numbers from quantities the validator has already admitted. Dependencies point
 * inward: `../ir/` and `../engine/`, nothing else — the engine owns the configuration space and
 * this module aggregates over it, never re-exploring on its own.
 *
 * Inputs are validated (V27–V37), so no function here re-checks a dimension, a target or a
 * residency. Where a defence-in-depth guard exists anyway, its comment names the rule that should
 * have fired first.
 */
import type { Coverage, Dimension, QueryResult, Step } from "../ir/types.ts";
import { DIMENSIONS, isPlainDecimal, type CanonQuantity } from "../ir/types.ts";
import { detail, fail, ok, type Refusal, type Res } from "../engine/types.ts";

// --------------------------------------------------------------------------------------------
// Charges
// --------------------------------------------------------------------------------------------

/** One quantity's contribution to an execution's total, with the occurrence count that drove it. */
export interface Charge {
  readonly quantity: string;
  readonly entity: string;
  /** Visits along the execution. The Q2 ruling's unit of accounting: a retry raises this, not `each`. */
  readonly occurrences: number;
  /** Base units per occurrence — the selected end when the quantity declares a range. */
  readonly each: number;
  readonly subtotal: number;
}

export interface TraceCharges {
  /** Base units (ms for latency, usd for cost). */
  readonly total: number;
  readonly charges: readonly Charge[];
}

/** One quantity's contribution to memory(c), under exactly one of the two declared forms (V37). */
export interface MemoryContribution {
  readonly quantity: string;
  readonly entity: string;
  readonly mode: "resident" | "when";
  /** Resolved `when` target; null for a resident charge. */
  readonly machine: string | null;
  readonly state: string | null;
  /** Base units (MB). */
  readonly value: number;
}

export interface ConfigurationMemory {
  readonly total: number;
  /** The contributions CHARGED in this configuration — resident always, `when` only where active. */
  readonly charged: readonly MemoryContribution[];
}

export interface PeakMemory {
  readonly peak: number;
  readonly charged: readonly MemoryContribution[];
  /** Shortest steps from the initial configuration to the peak one. Empty when initial IS the peak. */
  readonly trace: readonly Step[];
  readonly coverage: Coverage;
  readonly notes: readonly string[];
}

/**
 * The maximum additive metric over executions. Three shapes. The first two are the Q5 ruling's —
 * an unbounded maximum is EVIDENCE rather than an error: a positive repeatable cycle is a concrete
 * witness that every finite bound is exceeded. `none` arises only under a target selection: no
 * explored execution reaches the selected configurations, so there is nothing to maximize over —
 * reported as a fact about the selection, never rounded to a zero.
 */
export type PathExtremum =
  | {
      readonly kind: "none";
      readonly coverage: Coverage;
      readonly notes: readonly string[];
    }
  | {
      readonly kind: "finite";
      readonly total: number;
      readonly trace: readonly Step[];
      readonly charges: readonly Charge[];
      readonly coverage: Coverage;
      readonly notes: readonly string[];
    }
  | {
      readonly kind: "unbounded";
      /** Steps from the initial configuration to the cycle's entry. */
      readonly prefix: readonly Step[];
      /** The repeatable cycle. Its charge per iteration is `cycleGain` > 0. */
      readonly cycle: readonly Step[];
      readonly cycleGain: number;
      readonly coverage: Coverage;
      readonly notes: readonly string[];
    };

// --------------------------------------------------------------------------------------------
// Answers — the existing vocabulary, with the number beside it
// --------------------------------------------------------------------------------------------

/**
 * What a requirement evaluation computed, carried BESIDE the schema-shaped result the way the
 * engine's `Verdict` carries its structured refusal. §5.5's display needs the observed maximum and
 * the bound, and `QueryResult` has nowhere to put a number — outcome vocabulary is closed and
 * stays closed.
 */
export interface RequirementAnalysis {
  readonly metric: string;
  readonly dimension: Dimension;
  /** The base unit every figure below is stated in. */
  readonly unit: string;
  readonly bound: number;
  /** The worst case found; null exactly when `unbounded`. */
  readonly observed: number | null;
  readonly unbounded: boolean;
  /** Breakdown of the evidential execution or configuration; null when none was needed. */
  readonly charges: readonly Charge[] | null;
}

export interface QuantAnswer {
  readonly result: QueryResult;
  readonly refusal: Refusal | null;
  readonly analysis: RequirementAnalysis | null;
}

// --------------------------------------------------------------------------------------------
// Worst-case end selection — the Q1 ruling, mechanical
// --------------------------------------------------------------------------------------------

/**
 * Which end of a declared range a question selects. v0.1 is worst-case only: `<=` takes the upper
 * end, a minimum analysis would take the lower, and a question needing BOTH ends is interval
 * arithmetic — which the ruling says SMT should eventually replace rather than us maintaining a
 * weaker semantics in the meantime. So `point` REFUSES when a range participates, naming both ends.
 */
export type RangeEnd = "upper" | "lower" | "point";

/** The magnitude a quantity contributes under the selected end. Every refusal names its quantity. */
export function quantityMagnitude(q: CanonQuantity, end: RangeEnd): Res<number> {
  const v = q.value;
  switch (v.kind) {
    case "point": {
      if (v.magnitude.base === null) {
        // Defence in depth: V28 refuses an unnormalized magnitude before evaluation is reachable.
        return fail(`quantity '${q.id}' has no normalized magnitude ('${v.magnitude.raw}'); run validation (V28).`);
      }
      return ok(v.magnitude.base);
    }
    case "range": {
      const low = v.low.base;
      const high = v.high.base;
      if (low === null || high === null) {
        return fail(`quantity '${q.id}' has an unnormalized range end; run validation (V28).`);
      }
      if (end === "upper") return ok(high);
      if (end === "lower") return ok(low);
      return fail(
        `quantity '${q.id}' declares the range [${v.low.raw}, ${v.high.raw}] and this question ` +
        `needs a single number, which is interval arithmetic over both ends. v0.1 is worst-case ` +
        `only — the ruling defers interval semantics to SMT rather than maintaining a weaker one. ` +
        `Ask a worst-case question ('<=' selects the upper end), or declare a point value.`,
        detail("reserved-feature", [`a single value for '${q.id}', declared [${v.low.raw}, ${v.high.raw}]`]));
    }
    case "expression":
      // §5.2: expressions are dimensionally typed, never evaluated. Evaluating one here would
      // quietly widen the v0.1 semantics the validator enforces.
      return fail(
        `quantity '${q.id}' is an expression ('${v.source}'), and expressions are dimensionally ` +
        `typed, never evaluated, in v0.1. Declare a literal value to make it computable.`,
        detail("reserved-feature", [`an evaluated expression for '${q.id}'`]));
    case "absent":
      return fail(`quantity '${q.id}' declares no value; run validation (V28).`);
  }
}

// --------------------------------------------------------------------------------------------
// Requirement bounds
// --------------------------------------------------------------------------------------------

/**
 * Parse a requirement's bound ("750 ms") into base units, under the same literal discipline V28
 * applies to the model's own quantities: a plain decimal, a unit the dimension owns where it has
 * units, none where it does not. A bare `750` against a united dimension is the silently-assumed
 * unit this feature exists to prevent, arriving through the requirement instead of the model.
 */
export function parseBound(dimension: Dimension, raw: string): Res<number> {
  const spec = DIMENSIONS[dimension];
  const text = raw.trim();
  const at = text.lastIndexOf(" ");
  const numberPart = at === -1 ? text : text.slice(0, at).trim();
  const unitPart = at === -1 ? null : text.slice(at + 1).trim();
  if (!isPlainDecimal(numberPart)) {
    return fail(`bound '${raw}' is not a plain decimal with an optional unit.`);
  }
  const value = Number(numberPart);
  if (spec.base === null) {
    if (unitPart !== null) {
      return fail(`bound '${raw}' carries a unit, and ${dimension} is dimensionless.`);
    }
    return ok(value);
  }
  if (unitPart === null) {
    return fail(
      `bound '${raw}' is a bare number, and ${dimension} is measured in ` +
      `${Object.keys(spec.units).join(", ")}. A silently assumed unit is the dimension bug this ` +
      `layer exists to prevent.`);
  }
  const factor = spec.units[unitPart];
  if (factor === undefined) {
    return fail(`bound '${raw}' uses unit '${unitPart}', which is not a ${dimension} unit (${Object.keys(spec.units).join(", ")}).`);
  }
  return ok(value * factor);
}
