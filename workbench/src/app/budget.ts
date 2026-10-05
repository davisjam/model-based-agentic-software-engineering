/**
 * The seam between the quantity layer's readout and the renderer's budget projection.
 *
 * ## Why the mapping lives HERE and not in either of the two modules it joins
 *
 * `src/quant/` maps to the query-engine component and `src/render/` to the renderer, and neither
 * declares a `depends-on` edge to the other. The import-graph gate asserts EQUALITY between the
 * declared edge set and the observed imports, so an import either way fails the build — and
 * declaring one would make the engine depend on the view, or the view on the engine, for a type
 * each only reads.
 *
 * `app-services` is the one component with declared edges to both (`app-rend` and `app-qe`), and it
 * already owns the render seam. So it owns this one. The same ruling the render-strategy registry
 * reaches: the contract between the two is DATA, and the app layer does the conversion.
 *
 * ## The conversion is units and nothing else
 *
 * Everything semantic — which allocations belong, which charge, the total, the ceiling — is decided
 * in the quantity layer. This module converts base-unit figures into the display unit the readout
 * derived, and renames fields. It computes no total of its own, decides no membership, and reaches
 * no verdict. If it did any of those there would be two answers to one question.
 */
import type { CanonicalSystem, Dimension } from "../ir/types.ts";
import { budgetReadoutFor, inDisplayUnit, type BudgetReadout } from "../quant/budget.ts";
import { renderBudget, type BudgetBar, type BudgetFigures, type BudgetView } from "../render/budget.ts";
import { systemHash } from "../ir/hash.ts";
import type { Res } from "../engine/types.ts";
import { ok } from "../engine/types.ts";

/** A readout's figures, converted to its display unit and renamed to the projection's contract. */
export function budgetFigures(readout: BudgetReadout): BudgetFigures {
  const allocations: BudgetBar[] = readout.allocations.map((a) => ({
    id: a.quantity,
    label: a.label,
    target: a.target,
    // Zero on a row whose magnitude did not normalize, which `inertReason` is not responsible for
    // explaining — a V28 finding reaches the reader through validation. The row is still drawn, with
    // the author's own unreadable text beside it, because dropping it would hide the defect.
    amount: a.value === null ? 0 : inDisplayUnit(readout, a.value),
    declared: a.raw,
    charge: a.charge,
    whenState: a.whenState,
    inertReason: a.inertReason,
  }));
  return {
    subjectId: readout.dimension,
    host: readout.host,
    unit: readout.unit,
    total: inDisplayUnit(readout, readout.total),
    ceiling: readout.budget === null
      ? null
      : { value: inDisplayUnit(readout, readout.budget.value), declared: readout.budget.raw },
    allocations,
  };
}

/**
 * Read one dimension's quantitative model and project it, or carry the quantity layer's refusal.
 *
 * The refusal is forwarded rather than rewritten. A system declaring no memory quantities gets the
 * readout's sentence, which names the authoring move — a view-layer paraphrase would be a second
 * place that sentence lives.
 */
export function renderBudgetView(
  system: CanonicalSystem, dimension: Dimension, hash: string = systemHash(system),
): Res<BudgetView> {
  const readout = budgetReadoutFor(system, dimension);
  if (!readout.ok) return readout;
  return ok(renderBudget(budgetFigures(readout.value), hash));
}

/**
 * Every quantitative model the system declares: those that projected, and those that refused.
 *
 * Both halves are returned, and that is the whole reason this is not a plain array. A declared model
 * that cannot be read is a V28-class defect in the source — an unnormalized ceiling, a range where a
 * point belongs — and a surface handed only the views would show a partial set of budgets as though
 * it were the complete set. The refusals are what let it say "two of three budgets could be read",
 * which is a fact about the model rather than a silence.
 */
export interface BudgetViewSet {
  readonly views: readonly BudgetView[];
  readonly refused: readonly { readonly dimension: Dimension; readonly refusal: string }[];
}

export function budgetViews(system: CanonicalSystem, hash: string = systemHash(system)): BudgetViewSet {
  const views: BudgetView[] = [];
  const refused: { dimension: Dimension; refusal: string }[] = [];
  for (const dimension of system.quantitativeModels.keys()) {
    const view = renderBudgetView(system, dimension, hash);
    if (view.ok) views.push(view.value);
    else refused.push({ dimension, refusal: view.refusal });
  }
  return { views, refused };
}
