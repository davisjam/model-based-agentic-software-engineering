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
import { METRICS, defaultLayoutEngine } from "./layout.ts";
import type { LayoutEngine } from "./layout.ts";
import { buildScene } from "./scene.ts";
import type {
  EmphasisAssignment,
  EmphasisKind,
  Layout,
  LayoutEdge,
  LayoutNode,
  MarkStyle,
  Point,
  RenderedView,
  SceneRequest,
  SvgNode,
} from "./types.ts";
import { MARKS, MARK_MEANINGS, PLAIN_MARK } from "./types.ts";

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
.mage-glyph { font-size: ${METRICS.fontSize}px; font-weight: 700; fill: #11151c; }
.mage-initial { fill: #11151c; stroke: #11151c; }
.mage-legend { font-size: ${METRICS.fontSize - 2}px; fill: #11151c; }
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

const defs = (): SvgNode =>
  el("defs", {}, [
    el("style", { type: "text/css" }, [], STYLE),
    el(
      "marker",
      { id: "mage-arrow", markerWidth: 10, markerHeight: 8, refX: 9, refY: 4, orient: "auto-start-reverse", markerUnits: "userSpaceOnUse" },
      [el("path", { d: "M0,0 L10,4 L0,8 z", fill: "#2a3242" })],
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

/** Initial-state marker: a filled dot and a stub arrow entering the backward face. */
function initialMarker(node: LayoutNode, layout: Layout): readonly SvgNode[] {
  if (!node.initial) return [];
  const ltr = layout.direction === "left-to-right";
  const cx = ltr ? node.rect.x - 26 : node.rect.x + node.rect.w / 2;
  const cy = ltr ? node.rect.y + node.rect.h / 2 : node.rect.y - 26;
  const to: Point = ltr
    ? { x: node.rect.x, y: node.rect.y + node.rect.h / 2 }
    : { x: node.rect.x + node.rect.w / 2, y: node.rect.y };
  return [
    el("circle", { cx, cy, r: 5, class: "mage-initial" }),
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
): SvgNode {
  const cx = node.rect.x + node.rect.w / 2;
  const headerY = node.kind === "region" ? node.rect.y + METRICS.regionHeader - 9 : node.rect.y + node.rect.h / 2 + 1;
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
          y: headerY + 14 + i * 13,
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
    [...initialMarker(node, layout), nodeShape(node, r), ...texts],
  );
}

function edgeGroup(edge: LayoutEdge, r: Resolved): SvgNode | null {
  if (edge.points.length < 2) return null;
  const mid = edge.points[Math.floor(edge.points.length / 2)] as Point;
  const children: SvgNode[] = [
    el("polyline", {
      points: polyline(edge.points),
      class: `mage-edge ${r.mark.className}`.trim(),
      "marker-end": "url(#mage-arrow)",
      fill: "none",
      ...markAttrs(r),
    }),
  ];
  if (edge.label !== null) {
    children.push(
      el("text", { x: mid.x, y: mid.y - 6, "text-anchor": "middle", class: "mage-edge-label" }, [], edge.label),
    );
  }
  if (r.glyph !== null) {
    children.push(el("text", { x: mid.x, y: mid.y + 13, "text-anchor": "middle", class: "mage-glyph" }, [], r.glyph));
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
    const row = y + i * 18;
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
  const show = new Set(req.showProperties ?? []);

  const edgeNodes = layout.edges
    .map((e) => edgeGroup(e, resolve(byTarget.get(e.id) ?? [])))
    .filter((n): n is SvgNode => n !== null);

  // Regions first so their children draw on top of the enclosing frame.
  const ordered = [...layout.nodes.values()].sort((a, b) => {
    if (a.kind === "region" && b.kind !== "region") return -1;
    if (b.kind === "region" && a.kind !== "region") return 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const nodeNodes = ordered.map((n) => {
    const subs = (scene.nodes.find((s) => s.id === n.id)?.properties ?? [])
      .filter((p) => show.has(p.name))
      .map((p) => `${p.name}: ${p.value}`);
    return nodeGroup(n, layout, resolve(byTarget.get(n.id) ?? []), subs, readingIndex.get(n.id) ?? 0);
  });

  const legendKinds = accessible.legend.map((l) => l.kind);
  const legendHeight = legendKinds.length === 0 ? 0 : legendKinds.length * 18 + 20;
  const view = {
    x: layout.bounds.x,
    y: layout.bounds.y,
    w: Math.max(layout.bounds.w, legendKinds.length === 0 ? 0 : 420),
    h: layout.bounds.h + legendHeight,
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
      ...(legendKinds.length === 0
        ? []
        : [
            el(
              "g",
              { "data-layer": "legend" },
              legendStrip(legendKinds, view.x + METRICS.margin, layout.bounds.y + layout.bounds.h + 16),
            ),
          ]),
    ],
  );

  const positions = new Map<string, Point>(
    [...layout.nodes.values()].map((n) => [n.id, { x: n.rect.x, y: n.rect.y }]),
  );
  return { svg: serialize(tree), tree, accessible, layout, positions };
}
