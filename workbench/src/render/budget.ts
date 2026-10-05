/**
 * The quantitative projection: a resource budget, drawn as allocation against a declared ceiling.
 *
 * ## Why this is not a third `SceneSubject` arm
 *
 * `buildScene` has two arms because the IR has two things a node-link picture can be OF, and a
 * budget is not one of them. Routing it through `buildScene` plus dagre plus `buildAccessibleScene`
 * would force a resource question into the structural renderer — which is the prohibition this
 * module exists to satisfy, not a shortcut past it. A budget's facts are extent and a threshold; its
 * natural marks are a length and a line, and neither has a reading as a node or an edge.
 *
 * So this is a SECOND projection beside the scene projection, over its own subject
 * (`CanonQuantitativeModel`), with its own twin.
 *
 * ## What it inherits from `renderView`, deliberately
 *
 * The indivisibility. `renderBudget` returns the picture and its structured twin in one value, so a
 * caller cannot take the drawing and skip the reading. That contract is the renderer's existing one
 * and the reason it matters here is sharper than for a graph: the numbers ARE the content. A budget
 * bar whose figures live only in geometry conveys nothing to a reader who does not get the picture,
 * and a margin is exactly the fact a student needs stated.
 *
 * ## Legibility, which §11 makes a requirement rather than a preference
 *
 * *"The visualization should make the engineering problem obvious."* Three decisions follow:
 *
 *  - **Figures are shown in the declared unit, never the dimension's base.** 232 KB, not
 *    0.2265625 MB. `BudgetReadout.unit` carries the derivation.
 *  - **The threshold is a drawn line with its own label, not an implied edge of the bar.** A bar that
 *    simply ends at the budget cannot show an overrun, and an overrun is the state the student is
 *    being taught to recognise.
 *  - **Over-budget is carried by three channels: a hatched overflow band, a `!` glyph on the
 *    threshold, and the twin's own sentence.** Colour is never the sole carrier of anything here —
 *    the same rule the scene renderer's marks follow.
 *
 * ## Geometry is fixed, and that is an accessibility decision
 *
 * The drawing uses a fixed `viewBox` and scales by `preserveAspectRatio`, so nothing reflows and no
 * assertion about it depends on a viewport. A budget readout that overflowed its region at one
 * window width and not another would fail an accessibility gate only when a region happened to
 * overflow — which is a flake, not a check.
 */
import { el } from "./svg.ts";
import type { SvgNode } from "./types.ts";

/**
 * One allocation, as this projection needs it. In the DISPLAY unit, already converted.
 *
 * The quantity layer's own `BudgetReadout` is deliberately not the parameter type. `src/quant/` maps
 * to the query-engine component and the renderer declares no edge to it — the import-graph gate
 * asserts equality between the declared `depends-on` set and the observed imports, so importing it
 * here would fail the build, and declaring the edge would make the view a dependency of the engine's
 * component graph for a type it only reads. This is the same ruling the render-strategy registry
 * takes for the same reason: the contract is DATA, and the app layer, which has declared edges to
 * both, does the mapping.
 *
 * `amount` is zero on a row charging nothing, and `inertReason` is what tells that apart from an
 * allocation that genuinely costs nothing. The projection draws no bar for such a row: a
 * zero-width bar reads as "approximately nothing" when the fact is "not counted".
 */
export interface BudgetBar {
  readonly id: string;
  readonly label: string;
  readonly target: string;
  readonly amount: number;
  readonly declared: string;
  readonly charge: "resident" | "when" | "none";
  readonly whenState: string | null;
  readonly inertReason: string | null;
}

/**
 * What the projection is handed. Every figure is in `unit`; nothing here is re-derived from a base.
 *
 * `total` is HANDED rather than summed from `allocations`, and the difference is load-bearing: a row
 * charging nothing contributes an amount the total must not include, so a renderer that added the
 * bars would disagree with the evaluator exactly when the model is incomplete — the one case where
 * agreement matters most.
 */
export interface BudgetFigures {
  /** The quantitative model's id. A dimension name, carried as a string: kernel vocabulary. */
  readonly subjectId: string;
  /** The model the ceiling is declared against. Null when no ceiling is declared. */
  readonly host: string | null;
  readonly unit: string;
  readonly total: number;
  readonly ceiling: { readonly value: number; readonly declared: string } | null;
  readonly allocations: readonly BudgetBar[];
}


/** One row of the twin: an allocation, as a fact rather than as a rectangle. */
export interface AccessibleAllocation {
  readonly quantity: string;
  readonly label: string;
  readonly target: string;
  /** In the figures' display unit, so the reading and the picture quote the same number. */
  readonly amount: number;
  /** The author's own text for the magnitude. */
  readonly declared: string;
  /** Share of the ceiling, or of the total when no ceiling is declared. Null when neither is usable. */
  readonly share: number | null;
  /** Reading order, so a caller can present the rows in the order the picture stacks them. */
  readonly readingIndex: number;
  /** Stated for every row: charged for the whole run, charged in a named state, or charged nowhere. */
  readonly charge: string;
  /** Non-null exactly when this row charges nothing. */
  readonly inertReason: string | null;
}

/**
 * The twin. Every number the picture draws appears here, in the same unit.
 *
 * `verdict` is prose and is deliberately NOT an `Outcome`. This projection decides nothing — the
 * budget requirement is a saved `quantity` query with a quantifier and a counterexample, and that
 * query is the thing which holds or is refuted. A view reporting an outcome of its own would be a
 * second answer to a question only the engine may answer, and the two could disagree.
 */
export interface AccessibleBudget {
  readonly title: string;
  readonly summary: string;
  readonly subject: { readonly kind: "quantitative-model"; readonly id: string };
  /** The canonical hash of the system this view depicts — a view must not outlive its model. */
  readonly systemHash: string;
  readonly unit: string;
  /** The model the ceiling is declared against. Null when no ceiling is declared. */
  readonly host: string | null;
  readonly allocations: readonly AccessibleAllocation[];
  readonly total: number;
  readonly budget: number | null;
  /** The ceiling as the author wrote it. */
  readonly budgetDeclared: string | null;
  readonly margin: number | null;
  /** One decimal, for reading. `margin` carries the figure arithmetic should use. */
  readonly marginPercent: number | null;
  readonly largest: AccessibleAllocation | null;
  readonly overBudget: boolean;
  /** The one-sentence reading of the margin, including the overrun case. */
  readonly verdict: string;
  /** Allocations reaching no summand, each with its reason, so the total's basis is auditable. */
  readonly unaccounted: readonly AccessibleAllocation[];
  readonly key: readonly { readonly channel: string; readonly meaning: string }[];
}

export interface BudgetView {
  readonly svg: SvgNode;
  readonly accessible: AccessibleBudget;
}

// --------------------------------------------------------------------------------------------
// Geometry — fixed, so nothing here depends on a viewport
// --------------------------------------------------------------------------------------------

const CANVAS = { width: 720, barX: 164, barWidth: 480, rowHeight: 26, barHeight: 16, headroom: 60 } as const;

/**
 * Fraction of the bar's width the ceiling sits at, leaving room for an overrun to be DRAWN.
 *
 * Scaling so that the larger of total and ceiling fills the width would put the threshold in a
 * different place for every model, and an overrun would compress the whole picture rather than stick
 * out of it. Fixing the ceiling's position makes the overflow band the thing that changes, which is
 * the fact worth seeing.
 */
const CEILING_AT = 0.78;

/** One decimal, no trailing zero. Figures in a well-chosen unit are whole. */
const num = (v: number): string => {
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const pct = (v: number): number => Math.round(v * 1000) / 10;

/** How a row is charged, in the author's terms rather than the evaluator's. */
const chargeProse = (bar: BudgetBar): string =>
  bar.charge === "resident" ? "held for the whole run"
  : bar.charge === "when" ? `held while ${bar.whenState ?? "a named state"} is active`
  : "charged nowhere";

function twinRows(figures: BudgetFigures): readonly AccessibleAllocation[] {
  const denominator = figures.ceiling?.value ?? figures.total;
  return figures.allocations.map((bar, i) => ({
    quantity: bar.id,
    label: bar.label,
    target: bar.target,
    amount: bar.amount,
    declared: bar.declared,
    share: denominator === 0 || bar.inertReason !== null ? null : bar.amount / denominator,
    readingIndex: i,
    charge: chargeProse(bar),
    inertReason: bar.inertReason,
  }));
}

/**
 * The budget projection and its twin, from one set of figures.
 *
 * `systemHash` is a parameter rather than recomputed here: the caller already holds the hash of the
 * system the figures were taken from, and recomputing would let the two disagree if a caller ever
 * paired figures from one revision with a system from another.
 */
export function renderBudget(figures: BudgetFigures, systemHash: string): BudgetView {
  const all = twinRows(figures);
  const charging = all.filter((r) => r.inertReason === null);
  const unaccounted = all.filter((r) => r.inertReason !== null);

  const { total, unit } = figures;
  const budget = figures.ceiling?.value ?? null;
  const margin = budget === null ? null : budget - total;
  const marginFraction = budget === null || budget === 0 ? null : (budget - total) / budget;
  const overBudget = budget !== null && total > budget;

  const largest = charging.reduce<AccessibleAllocation | null>(
    (best, r) => (best === null || r.amount > best.amount ? r : best), null,
  );

  const verdict = budget === null
    ? `No ceiling is declared, so this is a total and not a budget: ${num(total)} ${unit} over ` +
      `${charging.length} allocation${charging.length === 1 ? "" : "s"}.`
    : overBudget
      ? `Over budget by ${num(Math.abs(margin ?? 0))} ${unit}: the modeled allocations total ` +
        `${num(total)} ${unit} against a declared ceiling of ${num(budget)} ${unit}.`
      : `${num(margin ?? 0)} ${unit} of margin remains — the modeled allocations total ` +
        `${num(total)} ${unit} against a declared ceiling of ${num(budget)} ${unit}, ` +
        `which leaves ${num(pct(marginFraction ?? 0))}% free.`;

  const accessible: AccessibleBudget = {
    title: `${figures.subjectId} allocation${figures.host === null ? "" : ` in ${figures.host}`}`,
    summary:
      `${charging.length} declared allocation${charging.length === 1 ? "" : "s"} totalling ` +
      `${num(total)} ${unit}` +
      (budget === null ? ", with no declared ceiling." : `, against a declared ceiling of ${num(budget)} ${unit}.`) +
      (unaccounted.length === 0
        ? ""
        : ` ${unaccounted.length} further declared allocation${unaccounted.length === 1 ? " is" : "s are"} ` +
          `charged nowhere and excluded from the total.`),
    subject: { kind: "quantitative-model", id: figures.subjectId },
    systemHash,
    unit,
    host: figures.host,
    allocations: all,
    total,
    budget,
    budgetDeclared: figures.ceiling?.declared ?? null,
    margin,
    marginPercent: marginFraction === null ? null : pct(marginFraction),
    largest,
    overBudget,
    verdict,
    unaccounted,
    key: [
      { channel: "bar length", meaning: "how much of the resource one allocation takes" },
      ...(budget === null ? [] : [{ channel: "dashed vertical line", meaning: "the declared ceiling" }]),
      ...(overBudget
        ? [{ channel: "hatched band past the ceiling", meaning: "the overrun: allocation the ceiling does not cover" }]
        : budget === null ? [] : [{ channel: "clear space right of a bar", meaning: "the margin that allocation leaves" }]),
      ...(unaccounted.length === 0
        ? []
        : [{ channel: "row with no bar", meaning: "a declared allocation that no configuration charges" }]),
    ],
  };

  return { svg: draw(figures, all, { budget, margin, overBudget, verdict }), accessible };
}

interface DrawFigures {
  readonly budget: number | null;
  readonly margin: number | null;
  readonly overBudget: boolean;
  readonly verdict: string;
}

function draw(
  figures: BudgetFigures, all: readonly AccessibleAllocation[], f: DrawFigures,
): SvgNode {
  const { total, unit } = figures;
  const height = CANVAS.headroom + all.length * CANVAS.rowHeight + CANVAS.rowHeight * 2;
  // With no ceiling the bar scales to the total, which is the only extent there is. A zero
  // reference draws empty bars rather than dividing by it.
  const reference = f.budget ?? total;
  const perUnit = reference === 0 ? 0 : (CANVAS.barWidth * CEILING_AT) / reference;
  const ceilingX = f.budget === null ? null : CANVAS.barX + CANVAS.barWidth * CEILING_AT;
  const rowsTop = CANVAS.headroom - 10;
  const rowsBottom = CANVAS.headroom + all.length * CANVAS.rowHeight + 6;

  const children: SvgNode[] = [];

  // The hatch for an overrun, declared whether or not it is used: the serialized tree then differs
  // by one `rect` rather than by a whole `defs` block, which is a smaller diff for a reader
  // comparing two renders of the same model.
  children.push(el("defs", {}, [
    el("pattern", {
      id: "mage-budget-overrun", width: 6, height: 6,
      patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)",
    }, [el("line", { x1: 0, y1: 0, x2: 0, y2: 6, "stroke-width": 2, class: "mage-overrun-hatch" })]),
  ]));

  children.push(el("text", { x: 8, y: 22, class: "mage-budget-title" }, [],
    figures.host === null ? `${figures.subjectId} allocation` : `${figures.subjectId} allocation in ${figures.host}`));
  children.push(el("text", { x: 8, y: 42, class: "mage-budget-figure" }, [],
    f.budget === null
      ? `total ${num(total)} ${unit}`
      : `total ${num(total)} ${unit} of ${num(f.budget)} ${unit}` +
        (f.margin === null ? "" : f.overBudget
          ? ` — over by ${num(Math.abs(f.margin))} ${unit}`
          : ` — ${num(f.margin)} ${unit} free`)));

  // The ceiling first, so a bar crossing it stays readable over the line.
  if (ceilingX !== null) {
    children.push(el("line", {
      x1: ceilingX, y1: rowsTop, x2: ceilingX, y2: rowsBottom,
      "stroke-dasharray": "5 4", "stroke-width": 2, class: "mage-budget-ceiling",
    }));
    children.push(el("text", { x: ceilingX + 6, y: rowsTop - 4, "text-anchor": "end", class: "mage-budget-ceiling-label" }, [],
      `${f.overBudget ? "! " : ""}ceiling ${figures.ceiling?.declared ?? ""}`));
  }

  all.forEach((row, i) => {
    const y = CANVAS.headroom + i * CANVAS.rowHeight;
    const baseline = y + CANVAS.barHeight - 3;
    children.push(el("text", { x: CANVAS.barX - 8, y: baseline, "text-anchor": "end", class: "mage-budget-label" }, [], row.label));
    if (row.inertReason !== null) {
      children.push(el("text", { x: CANVAS.barX + 4, y: baseline, class: "mage-budget-inert" }, [],
        `${row.declared} declared, charged nowhere`));
      return;
    }
    const width = Math.max(row.amount * perUnit, 1);
    children.push(el("rect", { x: CANVAS.barX, y, width, height: CANVAS.barHeight, class: "mage-budget-bar" }));
    children.push(el("text", { x: CANVAS.barX + width + 6, y: baseline, class: "mage-budget-amount" }, [],
      `${num(row.amount)} ${unit}`));
  });

  // The overrun band, drawn over the rows: the thing the reader must notice is the thing on top.
  if (f.overBudget && ceilingX !== null) {
    children.push(el("rect", {
      x: ceilingX, y: rowsTop,
      width: Math.max((total - (f.budget ?? 0)) * perUnit, 4), height: rowsBottom - rowsTop,
      fill: "url(#mage-budget-overrun)", class: "mage-budget-overrun",
    }));
  }

  children.push(el("text", {
    x: 8, y: CANVAS.headroom + all.length * CANVAS.rowHeight + CANVAS.rowHeight,
    class: "mage-budget-verdict",
  }, [], f.verdict));

  return el("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: `0 0 ${CANVAS.width} ${height}`,
    preserveAspectRatio: "xMinYMin meet",
    role: "img",
    class: "mage-budget",
  }, children);
}
