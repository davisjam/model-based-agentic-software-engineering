/**
 * Readouts over a quantitative model's DECLARED allocations — total, largest, margin, count.
 *
 * ## Why this does not reopen the aggregation ruling
 *
 * `SEMANTICS.md` fixes aggregation per form and says so normatively: *"There is no aggregation
 * parameter, and that absence is the design."* The reasoning runs through executions — what a caller
 * may select is WHICH executions, never how they aggregate, and the `max|min|named` selector §29
 * refinement ① rejected *"cannot reappear as a query field."*
 *
 * Nothing here is a query field, and nothing here ranges over executions. Three ways this module
 * stays inside that ruling rather than beside it:
 *
 *  - **Domain.** These readouts range over `CanonQuantitativeModel.allocations` — a finite map,
 *    fully read, exactly summable. The ruling's domain is executions (possibly infinite) and the
 *    reachable configuration set. `src/quant/query.ts` refuses a `target` on a configuration-scoped
 *    metric *because* a target selects executions, which is the axis such a quantity does not
 *    aggregate along. No axis is selected here at all.
 *  - **Shape.** Each readout's aggregation is fixed by its own NAME. `total` sums, `largest`
 *    maximizes, `margin` subtracts from a declared ceiling. A caller picks a readout; it never hands
 *    one an operator. `QuantityQuery` gains no field, and this module is not reachable from
 *    `parseQuery` or the dispatcher.
 *  - **Claim.** None of these makes a claim, so none carries a quantifier, an `Outcome` or
 *    `Evidence`. They answer *what is there*, which is the side of the line `select` and `count` sit
 *    on; `exists` and the budget decision answer *is this true* and keep their verdict machinery.
 *    Asking "what is the total" and asking "does it fit" are two questions, and only the second is a
 *    form.
 *
 * `min` and `mean` are deliberately absent. Both are computable over a finite declared set, and
 * neither answers any question §11 asks — "the average allocation size" carries no engineering
 * decision. The shipped quantification design already records them as unmotivated, and shipping
 * them would turn a set of answers into a menu.
 *
 * ## Nothing is rounded to zero
 *
 * An allocation that reaches no summand of `memory(c)` — declaring neither `residency` nor `when`,
 * or declaring both (V37) — is reported as `charge: "none"` WITH its reason, and is listed in
 * `inert`. It is not dropped and it is not charged. A budget view that silently omitted it would
 * show a plausible total over an incomplete model, which is worse than showing no total: the student
 * would read the margin as earned.
 */
import type {
  CanonQuantitativeModel, CanonQuantity, CanonicalSystem, Dimension,
} from "../ir/types.ts";
import { AGGREGATE_TARGET_KIND, DIMENSIONS } from "../ir/types.ts";
import { fail, ok, type Res } from "../engine/types.ts";
import { quantityMagnitude, type RangeEnd } from "./types.ts";

/** Which summand an allocation enters, or that it enters none. */
export type ChargeMode = "resident" | "when" | "none";

export interface AllocationRow {
  readonly quantity: string;
  /** The target as written, so the row can be read back against the source. */
  readonly target: string;
  /** The target's own label when it resolves to a declared entity; its ref otherwise. */
  readonly label: string;
  /** Base units. Null when the declared value yields no single magnitude under `end`. */
  readonly value: number | null;
  /** The declared magnitude verbatim. The author has to recognise their own text. */
  readonly raw: string;
  readonly charge: ChargeMode;
  /** The `when:` state as written. Non-null only when `charge` is `"when"`. */
  readonly whenState: string | null;
  /** Why this row charges nothing. Null unless `charge` is `"none"`, and never null when it is. */
  readonly inertReason: string | null;
}

export interface BudgetCeiling {
  readonly quantity: string;
  /** Base units. */
  readonly value: number;
  readonly raw: string;
}

export interface BudgetReadout {
  readonly dimension: Dimension;
  /** The model the ceiling is declared against, when one is declared. */
  readonly host: string | null;
  /**
   * The unit every figure below should be PRESENTED in — derived from what the author wrote, not
   * from the dimension's base.
   *
   * The base unit for `memory` is `MB`, so a 256 KiB budget reaches a surface as `0.25` and a 20 KiB
   * buffer as `0.01953125`. Both are true and neither is legible, and §11's whole point is that the
   * engineering problem should be obvious. So the display unit is the one the declarations agree on,
   * and the base only when they do not.
   */
  readonly unit: string;
  /** How many of `unit` make one base unit. Multiply a base figure by this to display it. */
  readonly perBase: number;
  readonly allocations: readonly AllocationRow[];
  /** Cardinality of the declared set — exact, because the set is finite and fully read. */
  readonly count: number;
  /** Sum over the rows that charge, in base units. */
  readonly total: number;
  /** The largest CHARGING row. Null when none charges. */
  readonly largest: AllocationRow | null;
  readonly budget: BudgetCeiling | null;
  /** `budget - total`, base units. Null without a declared ceiling. Negative means over. */
  readonly margin: number | null;
  /** `margin / budget`. Null without a ceiling. The form §11.4's Q6 asks its 20% question in. */
  readonly marginFraction: number | null;
  /** True only when a ceiling IS declared and the total exceeds it. */
  readonly overBudget: boolean;
  /** Quantity ids reaching no summand. Empty on a complete model; stated, never hidden. */
  readonly inert: readonly string[];
}

/**
 * The display unit: the single token every declared magnitude in this model uses, or the base.
 *
 * Deterministic and declaration-driven. A model mixing `KB` and `MB` falls back to the base rather
 * than picking one, because picking would make the picture's unit depend on which allocation the
 * author wrote first.
 */
function displayUnit(dimension: Dimension, quantities: readonly CanonQuantity[]): string {
  const base = DIMENSIONS[dimension].base;
  if (base === null) return "";
  const units = new Set<string>();
  for (const q of quantities) {
    const v = q.value;
    if (v.kind === "point") units.add(v.magnitude.unit ?? "");
    else if (v.kind === "range") { units.add(v.low.unit ?? ""); units.add(v.high.unit ?? ""); }
  }
  const only = [...units];
  if (only.length !== 1) return base;
  const unit = only[0] ?? "";
  return Object.hasOwn(DIMENSIONS[dimension].units, unit) ? unit : base;
}

/** Why a memory annotation enters neither summand, in the author's terms. V37's two shapes. */
function inertReason(q: CanonQuantity): string | null {
  const resident = q.residency === "resident";
  const whenState = q.when?.state ?? null;
  if (resident && whenState !== null) {
    return `declares both 'residency: resident' and 'when: { state: ${whenState} }' — charging ` +
      `either summand would pick the winner V37 exists to refuse, so it charges neither`;
  }
  if (!resident && whenState === null) {
    return q.residencyRaw === null && q.when === null
      ? `declares neither 'residency' nor 'when', so no configuration charges it (V37)`
      : `declares a residency or 'when' block that did not read as one ` +
        `('${q.residencyRaw ?? "when: {}"}'), so no configuration charges it (V37)`;
  }
  return null;
}

/**
 * Read one quantitative model's declared allocations against its declared ceiling.
 *
 * `end` follows the quantity layer's worst-case discipline: `upper` takes the top of a declared
 * range, which is the end a budget question wants. The ceiling itself is read as a `point`, matching
 * `admitQuantityQuery` — a ceiling declared as a range refuses rather than quietly becoming its own
 * upper end.
 */
export function budgetReadout(
  system: CanonicalSystem, qm: CanonQuantitativeModel, end: RangeEnd = "upper",
): Res<BudgetReadout> {
  const members: CanonQuantity[] = [];
  for (const id of qm.allocations) {
    const q = system.quantities.get(id);
    // Unreachable through `canonicalize`, which builds `allocations` from this same map. Checked
    // because a hand-built model is a legal caller and a silent skip would under-report the total.
    if (q === undefined) return fail(`quantitative model '${qm.dimension}' lists allocation '${id}', which the system does not declare.`);
    members.push(q);
  }

  let ceiling: BudgetCeiling | null = null;
  let ceilingQuantity: CanonQuantity | null = null;
  if (qm.budget !== null) {
    const declared = system.quantities.get(qm.budget);
    if (declared === undefined) return fail(`quantitative model '${qm.dimension}' names ceiling '${qm.budget}', which the system does not declare (V39).`);
    if (declared.target.kind !== AGGREGATE_TARGET_KIND) return fail(`ceiling '${qm.budget}' targets '${declared.target.raw}', and a ceiling is a declared 'model:' total.`);
    const value = quantityMagnitude(declared, "point");
    if (!value.ok) return fail(`ceiling '${qm.budget}': ${value.refusal}`, value.detail);
    ceilingQuantity = declared;
    ceiling = {
      quantity: qm.budget,
      value: value.value,
      raw: declared.value.kind === "point" ? declared.value.magnitude.raw : String(value.value),
    };
  }

  // The ceiling's own unit counts toward the agreement: a 256 KB budget over KB allocations should
  // read in KB, and a model that disagrees with its own budget's unit should fall back to the base.
  const unit = displayUnit(qm.dimension, ceilingQuantity === null ? members : [...members, ceilingQuantity]);
  const factor = DIMENSIONS[qm.dimension].units[unit];
  const perBase = factor === undefined || factor === 0 ? 1 : 1 / factor;

  const rows: AllocationRow[] = [];
  for (const q of members) {
    const reason = inertReason(q);
    const magnitude = quantityMagnitude(q, end);
    const whenState = q.when?.state ?? null;
    rows.push({
      quantity: q.id,
      target: q.target.raw,
      label: system.entities.get(q.target.ref)?.label ?? q.target.ref,
      value: magnitude.ok ? magnitude.value : null,
      raw: q.value.kind === "point" ? q.value.magnitude.raw
        : q.value.kind === "range" ? `${q.value.low.raw}–${q.value.high.raw}`
        : q.value.kind === "expression" ? q.value.source
        : "(absent)",
      charge: reason !== null ? "none" : q.residency === "resident" ? "resident" : "when",
      whenState: reason === null && q.residency !== "resident" ? whenState : null,
      inertReason: reason,
    });
  }

  // The sum: over rows that charge AND whose magnitude read. A row whose value did not normalize is
  // a V28 finding; adding a zero for it would be the fabricated figure this layer refuses.
  const charging = rows.filter((r) => r.charge !== "none" && r.value !== null);
  const total = charging.reduce((sum, r) => sum + (r.value ?? 0), 0);
  // Strict >, so the FIRST maximal row wins and the argmax is deterministic, matching `peakMemory`.
  const largest = charging.reduce<AllocationRow | null>(
    (best, r) => (best === null || (r.value ?? 0) > (best.value ?? 0) ? r : best), null,
  );

  return ok({
    dimension: qm.dimension,
    host: qm.host,
    unit,
    perBase,
    allocations: rows,
    count: rows.length,
    total,
    largest,
    budget: ceiling,
    margin: ceiling === null ? null : ceiling.value - total,
    marginFraction: ceiling === null || ceiling.value === 0 ? null : (ceiling.value - total) / ceiling.value,
    overBudget: ceiling !== null && total > ceiling.value,
    inert: rows.filter((r) => r.charge === "none").map((r) => r.quantity),
  });
}

/** Read the quantitative model for one dimension, or say the system declares none. */
export function budgetReadoutFor(
  system: CanonicalSystem, dimension: Dimension, end: RangeEnd = "upper",
): Res<BudgetReadout> {
  const qm = system.quantitativeModels.get(dimension);
  if (qm === undefined) {
    return fail(
      `this system declares no ${dimension} quantities, so there is no ${dimension} model to read. ` +
      `Declare quantities with 'dimension: ${dimension}' — and a 'model:'-targeted one to give them a budget.`,
    );
  }
  return budgetReadout(system, qm, end);
}

/** A base-unit figure in the readout's display unit. Presentation only; nothing recomputes from it. */
export const inDisplayUnit = (readout: BudgetReadout, base: number): number => base * readout.perBase;
