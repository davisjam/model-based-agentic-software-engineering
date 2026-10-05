/**
 * DOM helpers the Learn page's surfaces share: element construction, tables, lists, and the two
 * figure kinds — a rendered scene with a keyboard-operable node picker, and the quantitative
 * budget projection.
 *
 * Extracted from the composition root on the second site, not the third: the walkthrough needs the
 * same figures the gallery draws, and two copies would be two answers to "how does a Learn figure
 * paint, pick and expose its accessible twin". The figures are LIVE — a caller can re-render one
 * with a changed system or a query result — because the walkthrough's what-if steps repaint after a
 * hypothesis and the gallery's one-shot use is the degenerate case of the same shape.
 *
 * Everything here renders through the workbench's own seams: `renderView` / `renderBudgetView` for
 * the pictures, `paintDiagram` / `paintBudget` for the DOM. Nothing in this module decides a
 * semantic fact; it draws what it is handed.
 */
import type { CanonicalSystem, Coverage, Dimension, Evidence, Outcome } from "../ir/types.ts";
import { renderView } from "../render/index.ts";
import type { AccessibleNode, Point, RenderedView, SceneSubject } from "../render/types.ts";
import { paintBudget, paintDiagram } from "../ui/render-dom.ts";
import { renderBudgetView } from "../app/budget.ts";

export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, text?: string, className?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className !== undefined) node.className = className;
  return node;
};

// --------------------------------------------------------------------------------------------
// Figures: one real render, with selection — and optionally a query result drawn onto it
// --------------------------------------------------------------------------------------------

let figureCount = 0;

/**
 * Re-scope the embedded SVG's `aria-labelledby` pair to this figure.
 *
 * The renderer derives those ids from the SUBJECT: `mage-title-<subjectId>` and
 * `mage-desc-<subjectId>` (src/render/svg.ts). That is right for the standalone export, and it is
 * unique on the Workspace page, which draws one subject at a time. This page draws several figures
 * and some of them draw the same subject — so two SVGs can carry the same `<title id>`/`<desc id>`
 * and both `aria-labelledby` references resolve to whichever came FIRST. axe reports it
 * `duplicate-id-aria` at CRITICAL.
 *
 * Fixed at the embedder, because the embedder is what makes it ambiguous: a page that drops N
 * standalone SVGs into one document owns uniqueness within that document. The durable fix belongs
 * in the renderer, which already has the right pattern next door — `ariaId` in src/ui/render-dom.ts
 * counts instead of deriving, for this exact reason, and says so in its comment.
 */
function scopeDiagramAriaIds(canvas: HTMLElement, figureIndex: number): void {
  const svg = canvas.querySelector("svg");
  if (svg === null) return;
  const referenced: string[] = [];
  // Order is the claim: title then desc, the order the renderer puts in `aria-labelledby`.
  for (const tag of ["title", "desc"]) {
    const node = svg.querySelector(`:scope > ${tag}`);
    if (node === null) continue;
    node.id = `learn-figure-${figureIndex}-${tag}`;
    referenced.push(node.id);
  }
  if (referenced.length > 0) svg.setAttribute("aria-labelledby", referenced.join(" "));
}

/** A query result's renderable parts, for a figure that draws evidence onto the diagram. */
export interface FigureResult {
  readonly evidence?: Evidence | null;
  readonly outcome?: Outcome | null;
  readonly coverage?: Coverage | null;
}

export interface LiveFigure {
  readonly root: HTMLElement;
  /** Re-render, optionally over a changed system or with a result's evidence drawn on. */
  readonly update: (system: CanonicalSystem, result?: FigureResult) => void;
  /** Programmatic selection, through the same path the picker and the pointer share. */
  readonly select: (nodeId: string | null) => void;
}

/**
 * One rendered subject with a keyboard-operable node picker.
 *
 * The picker is a `<select>` rather than making SVG shapes focusable: the twin below the picture
 * is the accessible representation, and selection drives a re-render whose emphasis reaches both
 * the picture and the twin. Clicking a drawn node sets the same picker, so pointer and keyboard
 * share one code path.
 *
 * Positions persist across updates (`view.positions` fed back as hints), so a what-if repaint
 * keeps every unchanged node where it was — the comparison is unreadable if one added edge
 * re-ranks the world.
 */
export function liveFigure(
  initial: CanonicalSystem,
  subject: SceneSubject,
  caption: string,
  opts: {
    readonly showProperties?: readonly string[];
    readonly onSelect?: (node: AccessibleNode | null) => void;
  } = {},
): LiveFigure {
  const n = (figureCount += 1);
  const fig = el("figure", undefined, "learn-figure");
  const cap = el("figcaption", caption);
  cap.id = `learn-figure-caption-${n}`;
  const canvas = el("div", undefined, "canvas");
  const status = el("p", "", "intro");
  status.id = `learn-figure-status-${n}`;

  const pickerLabel = el("label", "Highlight a node");
  const picker = el("select");
  picker.id = `learn-figure-picker-${n}`;
  pickerLabel.htmlFor = picker.id;

  const twin = el("details");
  const twinSummary = el("summary", "Text view of this diagram");
  const twinBody = el("div");
  twin.append(twinSummary, twinBody);

  let hints: ReadonlyMap<string, Point> | undefined;
  let system = initial;
  let result: FigureResult = {};
  const showProperties = opts.showProperties ?? [];

  const paint = (selection: readonly string[]): RenderedView => {
    const view = renderView(system, {
      subject,
      ...(hints !== undefined ? { hints } : {}),
      ...(selection.length > 0 ? { selection } : {}),
      ...(showProperties.length > 0 ? { showProperties } : {}),
      ...(result.evidence !== undefined ? { evidence: result.evidence } : {}),
      ...(result.outcome !== undefined ? { outcome: result.outcome } : {}),
      ...(result.coverage !== undefined ? { coverage: result.coverage } : {}),
    });
    hints = view.positions;
    paintDiagram(view.accessible, view.tree, { text: twinBody, canvas });
    scopeDiagramAriaIds(canvas, n);
    canvas.querySelectorAll("[data-node-id]").forEach((g) => {
      const id = g.getAttribute("data-node-id");
      const node = view.accessible.nodes.find((x) => x.id === id);
      if (id === null || node === undefined) return;
      g.addEventListener("click", () => { picker.value = id; picker.dispatchEvent(new Event("change")); });
      g.addEventListener("pointerenter", () => { status.textContent = node.description; });
    });
    return view;
  };

  /** Rebuild the options from the view, keeping the user's choice when it still exists. */
  const fillPicker = (view: RenderedView): void => {
    const wanted = picker.value;
    const none = el("option", "(none)");
    none.value = "";
    picker.replaceChildren(none);
    for (const node of view.accessible.nodes) {
      const opt = el("option", node.label);
      opt.value = node.id;
      picker.append(opt);
    }
    if ([...picker.options].some((o) => o.value === wanted)) picker.value = wanted;
  };

  const repaint = (): void => {
    const id = picker.value;
    const view = paint(id === "" ? [] : [id]);
    fillPicker(view);
    const node = view.accessible.nodes.find((x) => x.id === picker.value) ?? null;
    status.textContent = node === null ? "" : node.description;
    opts.onSelect?.(node);
  };

  picker.addEventListener("change", repaint);
  fillPicker(paint([]));

  const controls = el("p", undefined, "learn-figure-controls");
  controls.append(pickerLabel, picker);
  fig.append(cap, canvas, controls, status, twin);
  return {
    root: fig,
    update: (next, extras = {}) => { system = next; result = extras; repaint(); },
    select: (nodeId) => { picker.value = nodeId ?? ""; repaint(); },
  };
}

/** The gallery's one-shot figure: a live figure nobody updates. */
export function figure(
  system: CanonicalSystem,
  subject: SceneSubject,
  caption: string,
  showProperties: readonly string[] = [],
): HTMLElement {
  return liveFigure(system, subject, caption, { showProperties }).root;
}

export interface LiveBudget {
  readonly root: HTMLElement;
  readonly update: (system: CanonicalSystem) => void;
}

/**
 * The quantitative projection, as a Learn figure.
 *
 * Simpler than `liveFigure` and deliberately so: there is no node picker, because a budget's
 * marks address allocations rather than selectable elements, and no separate text-view disclosure,
 * because `paintBudget` puts every figure in the prose ABOVE the drawing rather than behind a
 * summary. A reader who never opens a `<details>` still gets the numbers.
 *
 * A refusal is rendered as the refusal. The quantity layer's sentence names the authoring move, and
 * a Learn page that silently omitted the figure would teach that the type has no picture.
 */
export function liveBudget(
  initial: CanonicalSystem, dimension: Dimension, caption: string,
): LiveBudget {
  const fig = el("figure", undefined, "learn-figure");
  const host = el("div");
  const cap = el("figcaption", caption);
  const update = (system: CanonicalSystem): void => {
    host.replaceChildren();
    const view = renderBudgetView(system, dimension);
    if (!view.ok) {
      host.append(el("p", view.refusal, "refusal"));
      return;
    }
    paintBudget([view.value], host);
    // Demoted from a region landmark AT THE EMBEDDER, for the reason `scopeDiagramAriaIds` gives:
    // on the Workspace page one budget block is one landmark, but this page draws the same budget
    // more than once (a step and the gallery share a subject), and several landmarks with one
    // accessible name is axe's `landmark-unique` at MODERATE — measured on this page, and it fires
    // even with `role="group"` substituted, so the name is dropped rather than re-roled. The block
    // keeps its visible heading, and the figure's caption carries the context.
    host.querySelectorAll("section.mage-budget-block").forEach((s) => s.removeAttribute("aria-labelledby"));
  };
  update(initial);
  fig.append(host, cap);
  return { root: fig, update };
}

/** The gallery's one-shot budget figure. */
export function budgetFigure(system: CanonicalSystem, dimension: Dimension, caption: string): HTMLElement {
  return liveBudget(system, dimension, caption).root;
}

// --------------------------------------------------------------------------------------------
// Shared fragments
// --------------------------------------------------------------------------------------------

export function bulletList(items: readonly string[]): HTMLElement {
  const ul = el("ul", undefined, "notes");
  for (const item of items) ul.append(el("li", item));
  return ul;
}

export const sub = (text: string): HTMLElement => el("p", text, "sublabel");

/**
 * A table in a horizontal-scroll container, with its header row.
 *
 * `tabindex="0"` is not decoration: a region that scrolls must be reachable by keyboard, or a
 * keyboard-only reader cannot see the columns past the fold (WCAG 2.1.1, axe
 * `scrollable-region-focusable`). It is set UNCONDITIONALLY because whether this container actually
 * overflows depends on viewport and font metrics — CI's headless browser overflowed it while a
 * local run did not, which is precisely why the structural invariant is pinned by
 * `learn-scroll-focusable.test.ts` rather than left to the viewport-dependent axe tier to catch.
 */
export function rowsTable(columns: readonly string[], rows: readonly (readonly string[])[]): HTMLElement {
  const scroll = el("div", undefined, "scroll");
  scroll.setAttribute("tabindex", "0");
  const table = el("table");
  const head = el("thead");
  const hr = el("tr");
  for (const col of columns) hr.append(el("th", col));
  head.append(hr);
  const body = el("tbody");
  for (const row of rows) {
    const tr = el("tr");
    for (const cell of row) tr.append(el("td", cell));
    body.append(tr);
  }
  table.append(head, body);
  scroll.append(table);
  return scroll;
}

/** A term-and-value readout, in the page's description-list spelling. */
export function pairsList(pairs: readonly (readonly [string, string])[]): HTMLElement {
  const dl = el("dl", undefined, "prov");
  for (const [term, value] of pairs) dl.append(el("dt", term), el("dd", value));
  return dl;
}
