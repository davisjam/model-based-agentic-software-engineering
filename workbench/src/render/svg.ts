/**
 * SVG as data, plus `renderView` — the renderer's only public entry point.
 *
 * **Why a node tree and not a DOM.** This module runs in three places: the page, a Web Worker, and
 * `node:test`. Only the first has a `document`. Building a serializable tree keeps the renderer
 * testable without a browser and usable from the Worker, which the component model requires anyway
 * (`renderer -> depends-on -> model-ir`, and nothing else).
 *
 * **Why there is no `renderSvg(): string`.** FR-A11Y-2 says a fact reaching the SVG without
 * reaching a structured representation is a defect. `renderView` returns `RenderedView`, which
 * holds the picture and its twin together; there is no exported path to one without the other, so
 * the defect is unreachable rather than merely discouraged.
 *
 * **Self-contained output.** No CDN, no webfont, no remote image, no `href` of any kind. The
 * artifact is served as static assets under a strict policy and a fetch would simply fail. Font
 * families are local names; emphasis markers are ASCII, because a dingbat is a font dependency
 * wearing a disguise.
 *
 * **Colour is never the only channel.** Every emphasis is drawn with the stroke weight, dash
 * pattern, opacity and ASCII glyph declared in `MARKS`; the stylesheet adds hue as a redundant
 * fourth channel. Printed in greyscale, the diagram loses nothing.
 */
import { systemHash } from "../ir/hash.ts";
import type { CanonicalSystem } from "../ir/types.ts";
import { buildAccessibleScene, deriveEvidenceEmphasis } from "./accessible.ts";
import {
  METRICS,
  SUBLABEL_PITCH,
  TEXT_SIZES,
  claimsByTarget,
  initialMarkerCentre,
  initialMarkerTarget,
  nodeBoxLines,
  subLabelFits,
  textExtent,
} from "./layout.ts";
import type { LayoutEngine } from "./layout.ts";
import { defaultLayoutEngine } from "./layout-dagre.ts";
import { buildScene, variableLine } from "./scene.ts";
import type { SceneVariable } from "./scene.ts";
import type {
  ArrowForm,
  EmphasisAssignment,
  EmphasisKind,
  KeyEntry,
  Layout,
  LayoutEdge,
  LayoutNode,
  MarkStyle,
  Point,
  RenderedView,
  SceneRequest,
  SvgNode,
} from "./types.ts";
import { ARROW_FORMS, MARKS, MARK_MEANINGS, PLAIN_MARK, RELATION_CLASSES } from "./types.ts";

// --------------------------------------------------------------------------------------------
// Tree construction and serialization
// --------------------------------------------------------------------------------------------

type Attrs = Readonly<Record<string, string | number | null>>;

const n2 = (v: number): number => Math.round(v * 100) / 100;

/** Attribute keys are sorted so serialization is byte-stable across runs and engines. */
export function el(tag: string, attrs: Attrs = {}, children: readonly SvgNode[] = [], text: string | null = null): SvgNode {
  const clean: Record<string, string | number> = {};
  for (const k of Object.keys(attrs).sort()) {
    const v = attrs[k];
    if (v === null || v === undefined) continue;
    clean[k] = typeof v === "number" ? n2(v) : v;
  }
  return { tag, attrs: clean, text, children };
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function serialize(node: SvgNode, depth = 0): string {
  const pad = "  ".repeat(depth);
  // Sorted HERE as well as in `el`, so byte-stability is a property of serialization rather than
  // of how the caller happened to build the tree.
  const attrs = Object.entries(node.attrs)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => ` ${k}="${esc(String(v))}"`)
    .join("");
  if (node.text !== null && node.children.length === 0) {
    return `${pad}<${node.tag}${attrs}>${esc(node.text)}</${node.tag}>`;
  }
  if (node.children.length === 0) return `${pad}<${node.tag}${attrs}/>`;
  const inner = node.children.map((c) => serialize(c, depth + 1)).join("\n");
  return `${pad}<${node.tag}${attrs}>\n${inner}\n${pad}</${node.tag}>`;
}

// --------------------------------------------------------------------------------------------
// Emphasis resolution
// --------------------------------------------------------------------------------------------

/** Strongest treatment wins when several apply to one target. Order is the precedence. */
const STRENGTH: readonly EmphasisKind[] = [
  "violation",
  "evidence-inconclusive",
  "evidence",
  "selected",
  "changed",
  "added",
  "removed",
  "deemphasized",
];

interface Resolved {
  readonly kind: EmphasisKind | null;
  readonly mark: MarkStyle;
  readonly glyph: string | null;
  readonly reasons: readonly string[];
}

function resolve(assignments: readonly EmphasisAssignment[]): Resolved {
  if (assignments.length === 0) {
    return { kind: null, mark: PLAIN_MARK, glyph: null, reasons: [] };
  }
  const kind = STRENGTH.find((k) => assignments.some((a) => a.kind === k)) ?? assignments[0]?.kind ?? null;
  const mark = kind === null ? PLAIN_MARK : MARKS[kind];
  const steps = assignments
    .filter((a) => a.kind === kind && a.step !== null)
    .map((a) => a.step as number)
    .sort((a, b) => a - b);
  // For ordered evidence the marker IS the step number: the diagram reads "1, 2, 3" and those
  // numbers are the join key to the textual step list.
  const glyph = steps.length > 0 ? steps.join(",") : mark.glyph;
  return { kind, mark, glyph, reasons: assignments.map((a) => a.reason) };
}

/**
 * The emphasis attributes. Deliberately NOT `class`: every call site composes its own shape class
 * with `r.mark.className`, and a `class` key here lands after that spread in the object literal and
 * replaces it.
 *
 * It used to emit one, and the result was that an unemphasized shape — which is most of them —
 * ended up with `class: null`, which `el` drops. Every rect and polyline therefore shipped with no
 * class at all, so the inline stylesheet matched nothing and SVG's default `fill: black` applied:
 * black boxes with near-black labels inside them. Found by mounting the renderer in the page, not
 * by any test — `render-svg.test.ts` checks that every MARKS class has a stylesheet RULE, and
 * nothing checked that the class reaches the element.
 */
const markAttrs = (r: Resolved): Attrs => ({
  "stroke-width": r.mark.strokeWidth,
  "stroke-dasharray": r.mark.dashArray,
  opacity: r.mark.opacity === 1 ? null : r.mark.opacity,
  "data-emphasis": r.kind,
  "data-emphasis-reason": r.reasons.length === 0 ? null : r.reasons.join("; "),
});

// --------------------------------------------------------------------------------------------
// Stylesheet and defs — inline, because nothing may be fetched
// --------------------------------------------------------------------------------------------

/**
 * Inline stylesheet. Deliberately free of `"`, `&`, `<` and `>`: the style element's text is
 * XML-escaped on serialization, and `&quot;` inside a CSS declaration is not reliably decoded back
 * when the markup is inlined into an HTML document — it silently breaks the rule. So no quoted font
 * names. `system-ui` and `sans-serif` are local generics, which is also what keeps the artifact
 * self-contained: a webfont would be a fetch, and the page is served under a policy that blocks it.
 */
const STYLE = `
.mage-svg { font-family: system-ui, sans-serif; }
.mage-box { fill: #fbfcfe; stroke: #2a3242; }
.mage-region { fill: #f2f4f8; stroke: #5a6478; }
.mage-state { fill: #fbfcfe; stroke: #2a3242; }
.mage-label { font-size: ${METRICS.fontSize}px; fill: #11151c; }
.mage-sublabel { font-size: ${METRICS.fontSize - 2}px; fill: #434b5a; }
.mage-edge { fill: none; stroke: #2a3242; }
.mage-edge-label { font-size: ${METRICS.fontSize - 2}px; fill: #11151c; paint-order: stroke; stroke: #fbfcfe; stroke-width: 3px; }
.mage-edge-sublabel { font-size: ${METRICS.fontSize - 2}px; fill: #434b5a; paint-order: stroke; stroke: #fbfcfe; stroke-width: 3px; }
.mage-varbox { fill: #f7f8fb; stroke: #5a6478; }
.mage-var { font-size: ${METRICS.fontSize - 2}px; fill: #11151c; }
.mage-var-title { font-size: ${METRICS.fontSize - 2}px; fill: #434b5a; font-weight: 700; }
.mage-glyph { font-size: ${METRICS.fontSize}px; font-weight: 700; fill: #11151c; }
.mage-initial { fill: #11151c; stroke: #11151c; }
.mage-legend { font-size: ${METRICS.fontSize - 2}px; fill: #11151c; }
.mage-key { font-size: ${METRICS.fontSize - 2}px; fill: #11151c; }
.mage-key-title { font-size: ${METRICS.fontSize - 2}px; fill: #434b5a; font-weight: 700; }
.mage-arrowhead path { fill: #2a3242; }
/* RELATION TYPE: hue plus arrowhead form, which the key strip states. The Okabe-Ito subset that
   clears 3:1 against the figure ground -- 5.19, 3.87, 3.42 and 3.06 to one on #ffffff. The three
   Okabe-Ito entries that fail that floor (#E69F00 at 2.25, #56B4E9 at 2.31, #F0E442 at 1.32) are
   deliberately absent, which is also why there are four forms and not eight. */
.mage-rel-a { stroke: #0072B2; }
.mage-rel-b { stroke: #D55E00; }
.mage-rel-c { stroke: #009E73; }
.mage-rel-d { stroke: #CC79A7; }
.mage-rel-a-head path { fill: #0072B2; }
.mage-rel-b-head path { fill: #D55E00; }
.mage-rel-c-head path { fill: #009E73; }
.mage-rel-d-head path { fill: #CC79A7; }
/* The EMPHASIS underlay. Emphasis used to own the stroke hue, which left nothing for relation type
   to use; it is now a wide translucent band BEHIND the edge, so the two channels coexist and
   neither depends on the other being legible. */
.mage-underlay { fill: none; opacity: 0.3; stroke-linecap: round; }
/* Hue is a REDUNDANT channel. Every rule below repeats information already carried by stroke
   weight, dash pattern, opacity or the ASCII glyph in MARKS. */
.mage-selected { stroke: #0b4f9e; }
.mage-evidence { stroke: #0b6b3a; }
.mage-evidence-inconclusive { stroke: #7a5a00; }
.mage-violation { stroke: #9e1b0b; }
.mage-added { stroke: #0b6b3a; }
.mage-removed { stroke: #6a6a6a; }
.mage-changed { stroke: #7a3d9e; }
.mage-deemphasized { stroke: #8a8a8a; }
@media (prefers-contrast: more) { .mage-box, .mage-state, .mage-edge { stroke: #000; } }
`.trim();

/**
 * One marker per arrowhead form. The form is a REDUNDANT channel beside the relation-type stroke
 * hue: the ruling asks for colour plus shape, so a reader who cannot separate `#0072B2` from
 * `#009E73` still reads a triangle against a diamond, and a greyscale print loses nothing.
 *
 * `markerUnits: userSpaceOnUse` keeps the head a fixed size rather than scaling with the stroke
 * weight an emphasis sets, so an emphasised edge does not grow a different-looking head and
 * accidentally read as a different relation type.
 */
const ARROW_PATHS: Readonly<Record<ArrowForm, string>> = {
  triangle: "M0,0 L10,4 L0,8 z",
  open: "M0,0 L10,4 L0,8 L3,4 z",
  diamond: "M0,4 L5,0 L10,4 L5,8 z",
  square: "M1,1 L9,1 L9,7 L1,7 z",
};

const markerId = (form: ArrowForm): string => `mage-arrow-${form}`;

const defs = (): SvgNode =>
  el("defs", {}, [
    el("style", { type: "text/css" }, [], STYLE),
    // `ARROW_FORMS[i]` and `RELATION_CLASSES[i]` are assigned to a relation type by the same index,
    // so each form's head is tinted to match the stroke it terminates without a second mapping.
    ...ARROW_FORMS.map((form, i) =>
      el(
        "marker",
        {
          id: markerId(form),
          markerWidth: 10,
          markerHeight: 8,
          refX: 9,
          refY: 4,
          orient: "auto-start-reverse",
          markerUnits: "userSpaceOnUse",
          class: `mage-arrowhead ${RELATION_CLASSES[i] ?? ""}-head`.trim(),
        },
        [el("path", { d: ARROW_PATHS[form] })],
      ),
    ),
    // The plain head, for transitions and containment — a machine has one edge kind, so its arrows
    // need no vocabulary and must not borrow a relation type's form.
    el(
      "marker",
      { id: "mage-arrow", markerWidth: 10, markerHeight: 8, refX: 9, refY: 4, orient: "auto-start-reverse", markerUnits: "userSpaceOnUse" },
      [el("path", { d: ARROW_PATHS.triangle, fill: "#2a3242" })],
    ),
  ]);

// --------------------------------------------------------------------------------------------
// Shapes
// --------------------------------------------------------------------------------------------

const polyline = (points: readonly Point[]): string =>
  points.map((p) => `${n2(p.x)},${n2(p.y)}`).join(" ");

function nodeShape(node: LayoutNode, r: Resolved): SvgNode {
  const { rect } = node;
  const common: Attrs = { x: rect.x, y: rect.y, width: rect.w, height: rect.h };
  if (node.kind === "region") {
    return el("rect", { ...common, rx: 10, class: `mage-region ${r.mark.className}`.trim(), ...markAttrs(r) });
  }
  if (node.kind === "state") {
    return el("rect", { ...common, rx: rect.h / 2, class: `mage-state ${r.mark.className}`.trim(), ...markAttrs(r) });
  }
  return el("rect", { ...common, rx: 6, class: `mage-box ${r.mark.className}`.trim(), ...markAttrs(r) });
}

/**
 * Initial-state marker: a filled dot and a stub arrow entering the backward face.
 *
 * The dot's offset and radius come from `METRICS` through `initialMarkerCentre`, NOT from literals
 * here. They used to be the literals `26` and `5`, known to this function and to nothing else — so
 * `bounds` could not reserve room for the dot and the viewBox cut it in half in every machine
 * diagram the project ships. One definition, two readers.
 */
function initialMarker(node: LayoutNode, layout: Layout): readonly SvgNode[] {
  if (!node.initial) return [];
  const c = initialMarkerCentre(node.rect, layout.direction);
  const cx = c.x;
  const cy = c.y;
  const to: Point = initialMarkerTarget(node.rect, layout.direction);
  return [
    el("circle", { cx, cy, r: METRICS.initialMarkerRadius, class: "mage-initial" }),
    el("line", {
      x1: cx,
      y1: cy,
      x2: to.x,
      y2: to.y,
      class: "mage-edge",
      "marker-end": "url(#mage-arrow)",
      "stroke-width": 1.5,
    }),
  ];
}

function nodeGroup(
  node: LayoutNode,
  layout: Layout,
  r: Resolved,
  subLabels: readonly string[],
  readingIndex: number,
  declaration: string,
): SvgNode {
  const cx = node.rect.x + node.rect.w / 2;
  // A leaf's label anchors in the STANDARD-HEIGHT band at the top of its box, not at rect centre:
  // attribute sub-lines grow the box downward by `SUBLABEL_PITCH` each, and the label staying put
  // keeps a node with no attributes pixel-identical to what it always was.
  const headerY =
    node.kind === "region" ? node.rect.y + METRICS.regionHeader - 9 : node.rect.y + METRICS.nodeHeight / 2 + 1;
  const texts: SvgNode[] = [
    el(
      "text",
      { x: cx, y: headerY, "text-anchor": "middle", "dominant-baseline": "middle", class: "mage-label" },
      [],
      node.label,
    ),
  ];
  subLabels.forEach((s, i) => {
    texts.push(
      el(
        "text",
        {
          x: cx,
          y: headerY + SUBLABEL_PITCH + 1 + i * SUBLABEL_PITCH,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          class: "mage-sublabel",
        },
        [],
        s,
      ),
    );
  });
  if (r.glyph !== null) {
    texts.push(
      el(
        "text",
        { x: node.rect.x + node.rect.w - 6, y: node.rect.y + 4, "text-anchor": "end", "dominant-baseline": "hanging", class: "mage-glyph" },
        [],
        r.glyph,
      ),
    );
  }
  return el(
    "g",
    {
      id: `mage-node-${node.id}`,
      "data-node-id": node.id,
      "data-node-kind": node.kind,
      "data-rank": node.rank,
      "data-reading-index": readingIndex,
      "data-initial": node.initial ? "true" : null,
      "data-parent": node.parent,
      "data-pinned": node.pinned ? "true" : null,
      "data-emphasis": r.kind,
    },
    [
      // The precise declaration, as the browser's own hover tooltip (`<svg:title>`): name, type,
      // every declared attribute — `OrderCreated : event-type / carries = restricted`. The box
      // carries only what is needed to READ the diagram; hover exposes the declaration; selection
      // reaches the same facts in the Inspector, which is the keyboard and screen-reader path (the
      // canvas is aria-hidden by design, so a focus-triggered tooltip here would require focusable
      // content inside an aria-hidden subtree — the SH-I4 violation). Never the ONLY route.
      el("title", {}, [], declaration),
      ...initialMarker(node, layout),
      nodeShape(node, r),
      ...texts,
    ],
  );
}

function edgeGroup(edge: LayoutEdge, r: Resolved, key: ReadonlyMap<string, KeyEntry>): SvgNode | null {
  if (edge.points.length < 2) return null;
  // The label goes WHERE THE ENGINE RESERVED ROOM FOR IT. The polyline-midpoint fallback is for an
  // engine that claimed no spot; it is the behaviour that painted two words at one coordinate.
  const anchor = edge.labelPoint ?? (edge.points[Math.floor(edge.points.length / 2)] as Point);

  const rel = edge.kind === "relation" && edge.via !== null ? key.get(`relation:${edge.via}`) : undefined;
  const form = rel === undefined ? null : (rel.form as ArrowForm);
  const children: SvgNode[] = [];

  // The emphasis band is painted FIRST and underneath, so it reads as a highlight over the edge
  // rather than as a recolouring of it — which is what frees the stroke hue for relation type.
  if (r.kind !== null) {
    children.push(
      el("polyline", {
        points: polyline(edge.points),
        class: `mage-underlay ${r.mark.className}`,
        "stroke-width": r.mark.strokeWidth * 3,
        fill: "none",
      }),
    );
  }
  children.push(
    el("polyline", {
      points: polyline(edge.points),
      class: `mage-edge ${rel?.className ?? ""} ${r.mark.className}`.replace(/\s+/g, " ").trim(),
      "marker-end": form === null ? "url(#mage-arrow)" : `url(#${markerId(form)})`,
      fill: "none",
      ...markAttrs(r),
    }),
  );
  if (edge.label !== null) {
    children.push(
      el("text", { x: anchor.x, y: anchor.y + 4, "text-anchor": "middle", class: "mage-edge-label" }, [], edge.label),
    );
  }
  // The UML `[guard] / effect` line, under the event name — the semantics the property check
  // actually consults, drawn where the engine reserved room (labelBox sized both lines). The
  // whole-line-or-nowhere rule (`subLabelFits`) governs; the full text is in the hover title.
  const paintedSub = edge.subLabel !== null && subLabelFits(edge.subLabel);
  if (paintedSub) {
    children.push(
      el(
        "text",
        { x: anchor.x, y: anchor.y + 4 + SUBLABEL_PITCH, "text-anchor": "middle", class: "mage-edge-sublabel" },
        [],
        edge.subLabel,
      ),
    );
  }
  if (r.glyph !== null) {
    children.push(
      el(
        "text",
        { x: anchor.x, y: anchor.y + 17 + (paintedSub ? SUBLABEL_PITCH : 0), "text-anchor": "middle", class: "mage-glyph" },
        [],
        r.glyph,
      ),
    );
  }
  // The transition's full declaration as the browser's hover tooltip, matching the node boxes'
  // affordance — and the only in-picture route to a `[guard] / effect` line too long to paint.
  if (edge.kind === "transition" && edge.subLabel !== null) {
    children.unshift(el("title", {}, [], `${edge.label ?? ""} ${edge.subLabel}`.trim()));
  }
  return el(
    "g",
    {
      id: `mage-edge-${edge.id}`,
      "data-edge-id": edge.id,
      "data-edge-kind": edge.kind,
      "data-from": edge.from,
      "data-to": edge.to,
      "data-via": edge.via,
      "data-arrow-form": form,
      "data-backedge": edge.backedge ? "true" : null,
      "data-emphasis": r.kind,
    },
    children,
  );
}

/**
 * The legend is drawn in a strip below the diagram AND carried in `AccessibleScene.legend`. Both,
 * because "thick dashes mean counterexample" is itself information, and a key that exists only as
 * a visual convention is a key a non-visual reader does not have.
 */
function legendStrip(kinds: readonly EmphasisKind[], x: number, y: number): readonly SvgNode[] {
  return kinds.map((kind, i) => {
    const m = MARKS[kind];
    const row = y + i * ROW_PITCH;
    return el("g", { "data-legend-kind": kind }, [
      el("line", {
        x1: x,
        y1: row,
        x2: x + 34,
        y2: row,
        class: `mage-edge ${m.className}`,
        "stroke-width": m.strokeWidth,
        "stroke-dasharray": m.dashArray,
        opacity: m.opacity === 1 ? null : m.opacity,
      }),
      el("text", { x: x + 42, y: row + 4, class: "mage-glyph" }, [], m.glyph ?? "1,2"),
      el("text", { x: x + 72, y: row + 4, class: "mage-legend" }, [], MARK_MEANINGS[kind]),
    ]);
  });
}

const ROW_PITCH = 18;
/** Where a key row's meaning text starts, measured from the strip's left edge. */
const KEY_TEXT_X = 48;

/** Inner padding of the variables compartment, and its title row height. */
const VAR_PAD = 10;
const VAR_TITLE_H = ROW_PITCH;

interface VariablesPanel {
  readonly nodes: readonly SvgNode[];
  readonly w: number;
  readonly h: number;
}

/**
 * The machine's variables compartment: a bordered box titled `variables`, one row per declared
 * variable in sorted order. UML keeps a state machine's data on its context classifier; a
 * workbench diagram has no classifier box on canvas, so the compartment stands alone beside the
 * states — the stated deviation. It is machine CONTENT, not vocabulary, which is why it is a
 * compartment above the key strip rather than a key row; the key's `variables` notation row is
 * what decodes it.
 */
function variablesPanel(vars: readonly SceneVariable[], x: number, y: number): VariablesPanel {
  if (vars.length === 0) return { nodes: [], w: 0, h: 0 };
  const lines = vars.map(variableLine);
  const w = 2 * VAR_PAD + Math.max(
    textExtent("variables", "mage-var-title").w,
    ...lines.map((line) => textExtent(line, "mage-var").w),
  );
  const h = VAR_PAD + VAR_TITLE_H + lines.length * ROW_PITCH + VAR_PAD / 2;
  const rows = lines.map((line, i) =>
    el(
      "text",
      { x: x + VAR_PAD, y: y + VAR_PAD + VAR_TITLE_H + i * ROW_PITCH, class: "mage-var" },
      [],
      line,
    ),
  );
  return {
    nodes: [
      el("rect", { x, y, width: w, height: h, rx: 4, class: "mage-varbox", "stroke-width": 1.5 }),
      el("text", { x: x + VAR_PAD, y: y + VAR_PAD + 4, class: "mage-var-title" }, [], "variables"),
      ...rows,
    ],
    w,
    h,
  };
}

/**
 * The VOCABULARY key: one row per relation type, one per node shape.
 *
 * This is the author's "put relation/type semantics in a legend, not repeated labels", and it is
 * the reason an edge no longer carries its type as text. A row shows the SAMPLE — a stroke in the
 * type's hue ending in the type's arrowhead form, or the shape's own outline — beside the words,
 * so the mapping is learned from the key rather than guessed from the picture.
 *
 * Drawn in its own `data-layer`, separate from the emphasis legend, because the two have different
 * lifetimes: this one is present whenever the diagram has a vocabulary, and the emphasis legend
 * appears only once a query has emphasised something.
 */
function keyStrip(entries: readonly KeyEntry[], x: number, y: number): readonly SvgNode[] {
  return entries.map((entry, i) => {
    const row = y + i * ROW_PITCH;
    // A notation row's sample IS the written mark: brackets for a guard, the slash form for an
    // effect, a miniature of the compartment for variables — shown beside the words, like every
    // other key row, so the mapping is learned from the key rather than guessed from the picture.
    if (entry.channel === "notation") {
      const sample =
        entry.form === "variables"
          ? el("rect", { x, y: row - 6, width: 30, height: 12, rx: 2, class: "mage-varbox", "stroke-width": 1.5 })
          : el(
              "text",
              { x, y: row + 4, class: "mage-edge-sublabel" },
              [],
              entry.form === "guard" ? "[c]" : "/ x := e",
            );
      return el("g", { "data-key-channel": entry.channel, "data-key-id": entry.id, "data-key-form": entry.form }, [
        sample,
        el("text", { x: x + KEY_TEXT_X, y: row + 4, class: "mage-key" }, [], entry.meaning),
      ]);
    }
    const sample =
      entry.channel === "relation"
        ? el("line", {
            x1: x,
            y1: row,
            x2: x + 30,
            y2: row,
            class: `mage-edge ${entry.className}`,
            "stroke-width": 2,
            "marker-end": `url(#${markerId(entry.form as ArrowForm)})`,
          })
        : el("rect", {
            x,
            y: row - 6,
            width: 30,
            height: 12,
            rx: entry.form === "state" ? 6 : entry.form === "region" ? 4 : 2,
            class: entry.form === "region" ? "mage-region" : entry.form === "state" ? "mage-state" : "mage-box",
            "stroke-width": 1.5,
          });
    return el("g", { "data-key-channel": entry.channel, "data-key-id": entry.id, "data-key-form": entry.form }, [
      sample,
      el("text", { x: x + KEY_TEXT_X, y: row + 4, class: "mage-key" }, [], entry.meaning),
    ]);
  });
}

// --------------------------------------------------------------------------------------------
// Entry point
// --------------------------------------------------------------------------------------------

/**
 * Injected capabilities, kept OUT of `SceneRequest` deliberately.
 *
 * `SceneRequest` is plain data — JSON-serializable, so it can cross a `postMessage` boundary to the
 * Worker and be handed to `window.mage` by a CDP-attached agent. A function cannot be serialized,
 * so the layout engine travels separately rather than contaminating the request shape.
 */
export interface RenderOptions {
  /** Defaults to the built-in deterministic engine. See `LayoutEngine` for the ELK integration. */
  readonly engine?: LayoutEngine | undefined;
}

/**
 * Render one view of one system.
 *
 * The returned `RenderedView` is indivisible on purpose: `svg` and `accessible` describe the same
 * facts, derived from the same scene, in the same call. A caller cannot take the picture and skip
 * the twin.
 */
export function renderView(
  system: CanonicalSystem,
  req: SceneRequest,
  options: RenderOptions = {},
): RenderedView {
  const scene = buildScene(system, req.subject);
  const engine = options.engine ?? defaultLayoutEngine;
  const layout = engine(scene, {
    ...(req.direction !== undefined ? { direction: req.direction } : {}),
    ...(req.hints !== undefined ? { hints: req.hints } : {}),
    ...(req.showProperties !== undefined ? { showProperties: req.showProperties } : {}),
    ...(req.claims !== undefined ? { claims: req.claims } : {}),
  });

  const emphasis: EmphasisAssignment[] = [
    ...(req.selection ?? []).map(
      (target): EmphasisAssignment => ({ target, kind: "selected", reason: "currently selected", step: null }),
    ),
    ...(req.emphasis ?? []),
    ...(req.evidence !== null && req.evidence !== undefined
      ? deriveEvidenceEmphasis(system, scene, req.evidence, req.coverage)
      : []),
  ];

  const accessible = buildAccessibleScene(system, scene, layout, req, emphasis);

  const byTarget = new Map<string, EmphasisAssignment[]>();
  for (const a of emphasis) {
    const list = byTarget.get(a.target);
    if (list === undefined) byTarget.set(a.target, [a]);
    else list.push(a);
  }
  const readingIndex = new Map(accessible.nodes.map((n) => [n.id, n.readingIndex]));
  // Null means EVERY declared attribute — the twin always carries them, and the picture defaulting
  // to the same set is what keeps the two channels from drifting (see `LayoutOptions.showProperties`).
  const show = req.showProperties === undefined ? null : new Set(req.showProperties);

  const keyByChannel = new Map(accessible.key.map((k) => [`${k.channel}:${k.id}`, k]));
  const edgeNodes = layout.edges
    .map((e) => edgeGroup(e, resolve(byTarget.get(e.id) ?? []), keyByChannel))
    .filter((n): n is SvgNode => n !== null);

  // Regions first so their children draw on top of the enclosing frame.
  const ordered = [...layout.nodes.values()].sort((a, b) => {
    if (a.kind === "region" && b.kind !== "region") return -1;
    if (b.kind === "region" && a.kind !== "region") return 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const claims = claimsByTarget(req.claims);
  const nodeNodes = ordered.map((n) => {
    // `nodeBoxLines` is the SAME rule `sizes` reserved room from, so a line the painter draws is a
    // line the box already has height and width for — a leaf grows downward, a region's lines sit
    // in the band between its header and its children. Claim lines ride behind attribute lines.
    const sceneNode = scene.nodes.find((s) => s.id === n.id);
    const subs = nodeBoxLines(sceneNode?.properties ?? [], show, claims.get(n.id) ?? []);
    const declaration = [
      `${n.label} : ${sceneNode?.entityType ?? (sceneNode?.role === "state" ? "state" : n.kind)}`,
      ...(sceneNode?.properties ?? []).map((p) => `${p.name} = ${p.value}`),
    ].join("\n");
    return nodeGroup(n, layout, resolve(byTarget.get(n.id) ?? []), subs, readingIndex.get(n.id) ?? 0, declaration);
  });

  // --- the strips below the diagram, and the viewBox that must contain all of it ---------------
  //
  // The viewBox used to be `layout.bounds` widened to a flat 420 whenever a legend existed. That
  // number was a guess at how wide a row of legend text would be, and it was wrong: the longest
  // emphasis meaning reaches past x = 490 on its own, so the strip was simply cut off. Every strip
  // is now MEASURED with the same no-DOM estimator the layout uses, and the viewBox is the union.
  const legendKinds = accessible.legend.map((l) => l.kind);
  const keyEntries = accessible.key;
  const stripX = layout.bounds.x + METRICS.margin;
  // The variables compartment sits between the states and the key: it is machine CONTENT, read
  // with the diagram, where the key below it is vocabulary about the diagram.
  const varsTop = layout.bounds.y + layout.bounds.h + ROW_PITCH / 2;
  const panel = variablesPanel(scene.variables, stripX, varsTop);
  const keyTop = varsTop + (panel.h === 0 ? ROW_PITCH / 2 : panel.h + ROW_PITCH);
  const keyRows = keyEntries.length === 0 ? [] : keyStrip(keyEntries, stripX, keyTop);
  const legendTop = keyTop + (keyEntries.length === 0 ? 0 : keyEntries.length * ROW_PITCH + ROW_PITCH);
  const legendRows = legendKinds.length === 0 ? [] : legendStrip(legendKinds, stripX, legendTop);

  // `layout.bounds` already carries a margin on all four sides, so only the STRIP extents get one
  // added. Taking the margin on the union instead inflated every diagram by 28 units of empty
  // canvas on the right — a small thing that nonetheless shrinks the picture inside a fixed frame.
  const stripRight = Math.max(
    0,
    stripX + panel.w,
    ...keyEntries.map((e) => stripX + KEY_TEXT_X + textExtent(e.meaning, "mage-key").w),
    ...legendKinds.map((k) => stripX + 72 + textExtent(MARK_MEANINGS[k], "mage-legend").w),
  );
  const stripBottom =
    legendKinds.length > 0
      ? legendTop + (legendKinds.length - 1) * ROW_PITCH + TEXT_SIZES["mage-legend"]
      : keyEntries.length > 0
        ? keyTop + (keyEntries.length - 1) * ROW_PITCH + TEXT_SIZES["mage-key"]
        : panel.h > 0
          ? varsTop + panel.h
          : 0;

  const view = {
    x: layout.bounds.x,
    y: layout.bounds.y,
    w: Math.max(layout.bounds.x + layout.bounds.w, stripRight + METRICS.margin) - layout.bounds.x,
    h: Math.max(layout.bounds.y + layout.bounds.h, stripBottom + METRICS.margin) - layout.bounds.y,
  };

  const titleId = `mage-title-${scene.subject.id}`;
  const descId = `mage-desc-${scene.subject.id}`;
  const tree = el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: `${n2(view.x)} ${n2(view.y)} ${n2(view.w)} ${n2(view.h)}`,
      width: view.w,
      height: view.h,
      class: "mage-svg",
      role: "img",
      "aria-labelledby": `${titleId} ${descId}`,
      // The twin is the authoritative representation; these let an agent or a test correlate the
      // picture with it without inferring anything from geometry.
      "data-subject-kind": scene.subject.kind,
      "data-subject-id": scene.subject.id,
      "data-system-hash": systemHash(system),
      "data-direction": layout.direction,
      "data-outcome": accessible.outcome,
      "data-coverage": accessible.coverage?.kind ?? null,
    },
    [
      el("title", { id: titleId }, [], accessible.title),
      el("desc", { id: descId }, [], accessible.summary),
      defs(),
      el("g", { "data-layer": "edges" }, edgeNodes),
      el("g", { "data-layer": "nodes" }, nodeNodes),
      ...(panel.nodes.length === 0 ? [] : [el("g", { "data-layer": "variables" }, panel.nodes)]),
      ...(keyRows.length === 0 ? [] : [el("g", { "data-layer": "key" }, keyRows)]),
      ...(legendRows.length === 0 ? [] : [el("g", { "data-layer": "legend" }, legendRows)]),
    ],
  );

  const positions = new Map<string, Point>(
    [...layout.nodes.values()].map((n) => [n.id, { x: n.rect.x, y: n.rect.y }]),
  );
  return { svg: serialize(tree), tree, accessible, layout, positions };
}
