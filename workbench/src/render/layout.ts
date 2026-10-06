/**
 * Deterministic, incremental layout.
 *
 * Two properties are acceptance criteria rather than polish (PLAN.md §4.1, SEMANTICS.md §12):
 *
 * 1. **Determinism.** Placement is seeded by stable ids and nothing else — no clock, no random, no
 *    insertion order, no iteration order of a Map the caller happened to build. The same model
 *    lays out identically on every machine, in every tab, in the Worker and in `node:test`. There
 *    is no force simulation here; a relaxation that converges to a different local minimum on a
 *    second run would destroy the only interaction the workbench really has.
 *
 * 2. **Local perturbation.** Existing positions are STRONG hints: a hinted node is placed exactly
 *    where it was and is never moved, and new nodes are fitted into the frame those hints
 *    establish — including the rank spacing, so a new node follows the old grid rather than
 *    imposing a new one. The core interaction is comparing a model against a hypothetical variant
 *    of it, and that comparison is unreadable if adding one state re-ranks the world.
 *
 * Ranking follows the plan's two cases. An acyclic graph gets longest-path layering, which puts
 * every node one rank past its last predecessor. A cyclic machine is ranked by breadth from its
 * INITIAL state, and every edge that points back to an equal-or-earlier rank is routed around the
 * primary layout instead of being allowed to fight it.
 *
 * No DOM. Text extents are estimated from character count (`METRICS.charAdvance`) because the
 * module must run in a Worker and under `node:test`, where there is nothing to measure against.
 * The estimate is deliberately generous; a too-wide box is a cosmetic flaw, a too-narrow one clips.
 */
import type { SceneEdge, SceneGraph, SceneNode } from "./scene.ts";
import type { Direction, Layout, LayoutEdge, LayoutNode, LayoutOptions, Point, Rect } from "./types.ts";

/**
 * Geometry constants. Exported so tests assert against the substrate value rather than a
 * hand-copied snapshot of it.
 */
export const METRICS = {
  fontSize: 13,
  /** Estimated advance per character at `fontSize`, for a generic sans face. */
  charAdvance: 7.1,
  nodeMinWidth: 110,
  nodeMaxWidth: 280,
  nodeHeight: 46,
  padX: 18,
  /** Separation between consecutive ranks, along the rank axis. */
  rankGap: 90,
  /** Separation between siblings within a rank, along the lane axis. */
  laneGap: 34,
  margin: 28,
  regionPadX: 20,
  regionPadY: 16,
  regionHeader: 28,
  regionInnerGap: 16,
  /**
   * Distance from a state's backward face out to its initial-marker dot, and the dot's radius.
   * They live HERE rather than in the SVG module because `bounds` has to reserve room for the
   * marker: a number known only to the painter is a number the viewBox cannot account for, which
   * is exactly how the marker came to be drawn at x = -3 outside a viewBox starting at 0.
   */
  initialMarkerGap: 26,
  initialMarkerRadius: 5,
} as const;

/** Lane pitch for a standard leaf box: the bound a fresh insertion may displace a sibling by. */
export const LANE_PITCH = METRICS.nodeHeight + METRICS.laneGap;

const DEFAULT_DIRECTION: Direction = "left-to-right";

// --------------------------------------------------------------------------------------------
// Axis plumbing: one implementation, two directions
// --------------------------------------------------------------------------------------------

const isLtr = (d: Direction): boolean => d === "left-to-right";

const toRect = (along: number, across: number, extAlong: number, extAcross: number, d: Direction): Rect =>
  isLtr(d)
    ? { x: along, y: across, w: extAlong, h: extAcross }
    : { x: across, y: along, w: extAcross, h: extAlong };

const alongOf = (r: Rect, d: Direction): number => (isLtr(d) ? r.x : r.y);
const acrossOf = (r: Rect, d: Direction): number => (isLtr(d) ? r.y : r.x);

const overlaps = (a: Rect, b: Rect, pad: number): boolean =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/**
 * Where the initial-state marker's dot sits: one gap off the box's BACKWARD face, so it reads as
 * entering the machine. Exported because `bounds` must reserve room for it and the painter must
 * draw it in the same place — two copies of this arithmetic is how the marker got clipped.
 */
export const initialMarkerCentre = (r: Rect, d: Direction): Point =>
  isLtr(d)
    ? { x: r.x - METRICS.initialMarkerGap, y: r.y + r.h / 2 }
    : { x: r.x + r.w / 2, y: r.y - METRICS.initialMarkerGap };

/** The point on the box's backward face that the initial marker's stub arrow points at. */
export const initialMarkerTarget = (r: Rect, d: Direction): Point =>
  isLtr(d) ? { x: r.x, y: r.y + r.h / 2 } : { x: r.x + r.w / 2, y: r.y };

// --------------------------------------------------------------------------------------------
// Sizing
// --------------------------------------------------------------------------------------------

export const labelWidth = (text: string): number =>
  Math.min(
    METRICS.nodeMaxWidth,
    Math.max(METRICS.nodeMinWidth, 2 * METRICS.padX + text.length * METRICS.charAdvance),
  );

export interface Size {
  readonly w: number;
  readonly h: number;
}

/**
 * Font size per text class, derived from `METRICS` rather than restated. The SVG module's inline
 * stylesheet interpolates these same expressions, so a class added there must be added here or
 * `bounds` will under-reserve for it.
 */
export const TEXT_SIZES = {
  "mage-label": METRICS.fontSize,
  "mage-sublabel": METRICS.fontSize - 2,
  "mage-edge-label": METRICS.fontSize - 2,
  "mage-glyph": METRICS.fontSize,
  "mage-legend": METRICS.fontSize - 2,
  "mage-key": METRICS.fontSize - 2,
} as const satisfies Readonly<Record<string, number>>;

export type TextClass = keyof typeof TEXT_SIZES;

/**
 * Estimated extent of a text run. Same no-DOM arithmetic as `labelWidth`, scaled off the class's
 * font size, and deliberately generous for the same reason: over-reserving is cosmetic, and
 * under-reserving clips.
 *
 * Exported because TEXT THAT PARTICIPATES IN LAYOUT has to be measurable by whoever lays it out —
 * `bounds` reserves room for it, the dagre engine sizes edge-label boxes with it, and the
 * collision properties in the test suite measure it. One estimator, three callers.
 */
export const textExtent = (text: string, cls: TextClass): Size => ({
  w: text.length * METRICS.charAdvance * (TEXT_SIZES[cls] / METRICS.fontSize),
  h: TEXT_SIZES[cls],
});

/** Vertical pitch between in-node attribute sub-lines; the painter and the sizer share it. */
export const SUBLABEL_PITCH = TEXT_SIZES["mage-sublabel"] + 2;

/**
 * Which of a node's declared attributes render INSIDE the node box, as `name: value` sub-lines.
 *
 * The rule for a value that does not fit: a line renders in-node only when the whole `name: value`
 * fits the node's maximum width without truncation; otherwise it renders NOWHERE in the picture
 * and stays reachable in the accessible description, the reading order, and the inspector. Never
 * an ellipsis — a clipped `holds: held while thread-a…` loses exactly the clause that gave the
 * value its meaning, so the short quantitative values land in the box and the qualifying prose
 * stays in the readout, whole.
 *
 * `show` is the caller's narrowing (null means every declared attribute). Only what the model
 * DECLARES is ever rendered; an entity declaring nothing yields no lines and its box is unchanged.
 *
 * Lives here rather than in the painter because text participates in layout: `sizes` reserves node
 * height and width from this same list, so the painter cannot paint a line the box has no room for.
 */
export function inNodeLines(
  properties: readonly { readonly name: string; readonly value: string }[],
  show: ReadonlySet<string> | null,
): readonly string[] {
  return properties
    .filter((p) => show === null || show.has(p.name))
    .map((p) => `${p.name}: ${p.value}`)
    .filter((line) => 2 * METRICS.padX + textExtent(line, "mage-sublabel").w <= METRICS.nodeMaxWidth);
}

/**
 * Leaf sizes first, then regions, which must be large enough to enclose their children.
 *
 * A node with in-node attribute lines grows: one `SUBLABEL_PITCH` of height per line, and enough
 * width for its widest line. A region's lines sit in a band between its header and its children,
 * so its height reserves that band too — `place` offsets the children by the same amount.
 */
export function sizes(scene: SceneGraph, show: ReadonlySet<string> | null = null): Map<string, Size> {
  const out = new Map<string, Size>();
  for (const n of scene.nodes) {
    const lines = inNodeLines(n.properties, show);
    const w = Math.max(
      labelWidth(n.label),
      ...lines.map((line) => 2 * METRICS.padX + textExtent(line, "mage-sublabel").w),
    );
    out.set(n.id, { w, h: METRICS.nodeHeight + lines.length * SUBLABEL_PITCH });
  }
  for (const n of scene.nodes) {
    if (n.contains.length === 0) continue;
    const lines = inNodeLines(n.properties, show);
    let row = 2 * METRICS.regionPadX;
    let tallest: number = METRICS.nodeHeight;
    n.contains.forEach((c, i) => {
      const s = out.get(c) ?? { w: METRICS.nodeMinWidth, h: METRICS.nodeHeight };
      row += s.w + (i > 0 ? METRICS.regionInnerGap : 0);
      tallest = Math.max(tallest, s.h);
    });
    out.set(n.id, {
      w: Math.max(
        labelWidth(n.label),
        row,
        ...lines.map((line) => 2 * METRICS.padX + textExtent(line, "mage-sublabel").w),
      ),
      h: METRICS.regionHeader + lines.length * SUBLABEL_PITCH + METRICS.regionPadY * 2 + tallest,
    });
  }
  return out;
}

// --------------------------------------------------------------------------------------------
// Ranking
// --------------------------------------------------------------------------------------------

/** A scene edge with both ends lifted to the OUTER nodes that actually get positions. */
export interface LiftedEdge {
  readonly edge: SceneEdge;
  readonly from: string;
  readonly to: string;
  /** True when both ends lifted to the same outer node — an edge drawn inside one region. */
  readonly internal: boolean;
}

export const parentsOf = (scene: SceneGraph): ReadonlyMap<string, string> => {
  const out = new Map<string, string>();
  for (const n of scene.nodes) if (n.parent !== null) out.set(n.id, n.parent);
  return out;
};

/**
 * Lift every non-containment edge to the outer nodes, and report the outer node set.
 *
 * An edge touching a region's CHILD is, for ranking and routing purposes, an edge touching the
 * region: the child has no independent position (its geometry is derived from the region's rect),
 * so an engine that ranked it as a peer would be ranking a coordinate it does not control.
 */
export function liftToOuter(scene: SceneGraph): {
  readonly outer: readonly string[];
  readonly lifted: readonly LiftedEdge[];
} {
  const parentOf = parentsOf(scene);
  const outerSet = new Set(scene.nodes.filter((n) => n.parent === null).map((n) => n.id));
  const lift = (id: string): string => {
    let cur = id;
    for (let i = 0; i < 8 && !outerSet.has(cur); i += 1) {
      const up = parentOf.get(cur);
      if (up === undefined) return cur;
      cur = up;
    }
    return cur;
  };
  const lifted: LiftedEdge[] = [];
  for (const edge of scene.edges) {
    if (edge.kind === "containment") continue;
    const from = lift(edge.from);
    const to = lift(edge.to);
    if (!outerSet.has(from) || !outerSet.has(to)) continue;
    lifted.push({ edge, from, to, internal: from === to && edge.from !== edge.to });
  }
  return { outer: [...outerSet].sort(), lifted };
}

// --------------------------------------------------------------------------------------------
// Placement
// --------------------------------------------------------------------------------------------

export interface Placement {
  readonly rects: Map<string, Rect>;
  readonly pinned: Set<string>;
  /**
   * The translation applied to every unpinned node to carry the fresh frame onto the pinned one.
   * The caller needs it to move edge geometry by the same amount — an edge that stayed in the
   * engine's coordinate space while its endpoints moved is an edge pointing at nothing.
   */
  readonly shift: Point;
}

/**
 * Pin hints, fit the rest around them, derive region children. **This is the whole incremental
 * story, and it is deliberately independent of WHICH engine produced the fresh positions** — it
 * takes them as a parameter. That is what lets a real layout engine arrive without putting the
 * stability guarantee at risk: the engine answers "where would these go from scratch", and this
 * answers "where do they go given what the user is already looking at".
 */
export function place(
  scene: SceneGraph,
  size: ReadonlyMap<string, Size>,
  fresh: ReadonlyMap<string, Rect>,
  d: Direction,
  hints: ReadonlyMap<string, Point> | undefined,
  show: ReadonlySet<string> | null = null,
): Placement {
  const ext = (id: string): Size => size.get(id) ?? { w: METRICS.nodeMinWidth, h: METRICS.nodeHeight };
  const outer = scene.nodes.filter((n) => n.parent === null).map((n) => n.id);

  const rects = new Map<string, Rect>();
  const pinned = new Set<string>();

  // (1) Hinted nodes land exactly on their hint and are never considered again. This is the whole
  //     stability guarantee: a pre-existing node's displacement is zero by construction.
  for (const id of outer) {
    const h = hints?.get(id);
    if (h === undefined) continue;
    rects.set(id, { x: h.x, y: h.y, w: ext(id).w, h: ext(id).h });
    pinned.add(id);
  }

  // (2) A fresh node adopts the PINNED frame rather than the fresh one, so it appears beside the
  //     nodes it belongs with instead of at a coordinate from another layout. The translation is
  //     the mean displacement over the pinned nodes: with a complete hint set it is exactly zero,
  //     and with one pin it is exactly that pin's offset.
  let sx = 0;
  let sy = 0;
  for (const id of pinned) {
    const was = fresh.get(id);
    const now = rects.get(id) as Rect;
    if (was === undefined) continue;
    sx += now.x - was.x;
    sy += now.y - was.y;
  }
  const anchored = [...pinned].filter((id) => fresh.has(id)).length;
  const shift: Point = anchored === 0 ? { x: 0, y: 0 } : { x: sx / anchored, y: sy / anchored };

  // (3) Everything else at its fresh position carried onto the pinned frame, then nudged along the
  //     lane axis until it is clear. Only unpinned nodes ever move, and only by whole lane
  //     pitches. Deterministic order: along the rank axis, then the lane axis, then by id.
  const pending = outer
    .filter((id) => !pinned.has(id))
    .map((id) => ({ id, box: fresh.get(id) ?? { x: METRICS.margin, y: METRICS.margin, ...ext(id) } }))
    .sort((a, b) => {
      const da = alongOf(a.box, d) - alongOf(b.box, d);
      if (da !== 0) return da;
      const ca = acrossOf(a.box, d) - acrossOf(b.box, d);
      if (ca !== 0) return ca;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  for (const { id, box } of pending) {
    const along = alongOf(box, d) + (isLtr(d) ? shift.x : shift.y);
    const base = acrossOf(box, d) + (isLtr(d) ? shift.y : shift.x);
    const extAlong = isLtr(d) ? ext(id).w : ext(id).h;
    const extAcross = isLtr(d) ? ext(id).h : ext(id).w;
    const pitch = extAcross + METRICS.laneGap;
    let chosen = toRect(along, base, extAlong, extAcross, d);
    for (let k = 0; k <= 24; k += 1) {
      const candidates = k === 0 ? [0] : [k, -k];
      let done = false;
      for (const sign of candidates) {
        const cand = toRect(along, base + sign * pitch, extAlong, extAcross, d);
        if (![...rects.values()].some((o) => overlaps(cand, o, 8))) {
          chosen = cand;
          done = true;
          break;
        }
      }
      if (done) break;
    }
    rects.set(id, chosen);
  }

  // (4) Region children are derived from the region's own rect, so a pinned region pins its
  //     contents too. Containment is drawn as enclosure; the twin restates it as a relation.
  //     The region's own attribute sub-lines occupy a band below the header — `sizes` reserved it
  //     from the SAME `inNodeLines` call, so the children shift down by exactly that band.
  for (const n of scene.nodes) {
    if (n.contains.length === 0) continue;
    const box = rects.get(n.id);
    if (box === undefined) continue;
    let x = box.x + METRICS.regionPadX;
    const y =
      box.y + METRICS.regionHeader + inNodeLines(n.properties, show).length * SUBLABEL_PITCH + METRICS.regionPadY;
    for (const c of n.contains) {
      const s = ext(c);
      rects.set(c, { x, y, w: s.w, h: s.h });
      x += s.w + METRICS.regionInnerGap;
    }
  }
  return { rects, pinned, shift };
}


// --------------------------------------------------------------------------------------------

/**
 * The extent of everything the diagram puts on the canvas.
 *
 * **It used to see only rects and edge points, and that was the root cause of a whole class of
 * clipping** — not one bug. Text, the initial-state marker and the legend are all ink, and ink the
 * viewBox does not know about is ink the browser cuts off. The marker drawn one node-gap to the
 * left of the initial state landed at x = -3 against a viewBox starting at 0 in every machine
 * diagram the project ships; a label wider than its capped box overflows the same way. So the four
 * things below are accounted for here, and the painter unions in the render-only ink it alone
 * knows about (sublabels, emphasis glyphs, the legend strip) on top of this.
 */
export function bounds(nodes: Iterable<LayoutNode>, edges: readonly LayoutEdge[], d: Direction): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const see = (x: number, y: number): void => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  const seeBox = (r: Rect): void => {
    see(r.x, r.y);
    see(r.x + r.w, r.y + r.h);
  };

  for (const n of nodes) {
    seeBox(n.rect);

    // (a) A label wider than `nodeMaxWidth` overflows its own box, because `labelWidth` caps the
    //     box but the text is centred and not truncated.
    const label = textExtent(n.label, "mage-label");
    const cx = n.rect.x + n.rect.w / 2;
    see(cx - label.w / 2, n.rect.y);
    see(cx + label.w / 2, n.rect.y + n.rect.h);

    // (b) The initial-state marker hangs off the backward face, outside the box entirely.
    if (n.initial) {
      const c = initialMarkerCentre(n.rect, d);
      const r = METRICS.initialMarkerRadius;
      see(c.x - r, c.y - r);
      see(c.x + r, c.y + r);
    }
  }

  for (const e of edges) {
    for (const p of e.points) see(p.x, p.y);
    // (c) Edge text, at the spot the engine reserved for it.
    if (e.labelPoint !== null && e.label !== null) {
      const ext = textExtent(e.label, "mage-edge-label");
      see(e.labelPoint.x - ext.w / 2, e.labelPoint.y - ext.h);
      see(e.labelPoint.x + ext.w / 2, e.labelPoint.y + ext.h);
    }
  }

  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: METRICS.nodeMinWidth, h: METRICS.nodeHeight };
  return {
    x: minX - METRICS.margin,
    y: minY - METRICS.margin,
    w: maxX - minX + 2 * METRICS.margin,
    h: maxY - minY + 2 * METRICS.margin,
  };
}

/**
 * The layout seam: a pure function from a scene to coordinates.
 *
 * Swapping engines is a module change, not a rewrite. The built-in engine is `layoutScene` below;
 * an external engine (ELK's layered algorithm is the candidate) plugs in here.
 *
 * **Note the signature is synchronous, and why that is not a constraint on ELK.** elkjs is
 * promise-based and is meant to run in a Worker, so it cannot implement this type directly — and
 * it does not need to. A cold external layout is just a COMPLETE hint set: run the engine
 * upstream, hand its coordinates in as `LayoutOptions.hints`, and the pinning pass honours every
 * one of them exactly. That keeps `renderView` synchronous, keeps `SceneRequest` serializable, and
 * makes the incremental story the same code path as the cold one. See DONE-phase-E.md §8.
 */
export type LayoutEngine = (scene: SceneGraph, opts: LayoutOptions) => Layout;

/**
 * Assemble a `Layout` from the pieces every engine produces: final rects, ranks in lane order, and
 * routed edges. Shared so an engine does not restate the `LayoutNode` contract — in particular the
 * rule that a region CHILD reports its region's rank, which `accessible.ts` turns into reading
 * order and which is easy to get subtly wrong a second time.
 */
export function assembleLayout(
  scene: SceneGraph,
  d: Direction,
  rects: ReadonlyMap<string, Rect>,
  pinned: ReadonlySet<string>,
  ranks: readonly (readonly string[])[],
  edges: readonly LayoutEdge[],
): Layout {
  const byId = new Map<string, SceneNode>(scene.nodes.map((n) => [n.id, n]));
  const rank = new Map<string, number>();
  const order = new Map<string, number>();
  ranks.forEach((r, i) =>
    r.forEach((id, j) => {
      rank.set(id, i);
      order.set(id, j);
    }),
  );

  const nodes = new Map<string, LayoutNode>();
  for (const n of scene.nodes) {
    const rect = rects.get(n.id);
    if (rect === undefined) continue;
    const effectiveRank = n.parent === null ? (rank.get(n.id) ?? 0) : (rank.get(n.parent) ?? 0);
    nodes.set(n.id, {
      id: n.id,
      kind: n.kind,
      label: n.label,
      rect,
      rank: effectiveRank,
      order: order.get(n.id) ?? (n.parent === null ? 0 : (byId.get(n.parent)?.contains.indexOf(n.id) ?? 0)),
      parent: n.parent,
      initial: n.initial,
      pinned: pinned.has(n.id),
    });
  }

  return {
    direction: d,
    nodes,
    edges,
    bounds: bounds(nodes.values(), edges, d),
    ranks: ranks.map((r) => [...r]),
  };
}

/**
 * **There is deliberately no `layoutScene` here any more, and no second engine.**
 *
 * This module used to hold a complete hand-rolled layout: longest-path and breadth ranking,
 * barycentre ordering, an even grid, and straight-run edge routing. All of it is gone, replaced by
 * `dagreLayoutEngine`. The ruling was "replace it rather than continuing to patch individual
 * collision cases", and keeping the old path beside the new one as a fallback would have left two
 * layouts in the tree with nothing to tell a reader which one is real — and a standing invitation
 * to fix a collision in whichever one they happened to open.
 *
 * What stayed is what the ranking and routing were built ON, and what any engine needs: the metrics,
 * the no-DOM text estimator, the region-aware sizing, the lift to outer nodes, the hint-pinning pass
 * and the ink-aware extent. The engine computes coordinates; this file decides what a coordinate
 * means.
 */
export const DEFAULT_LAYOUT_DIRECTION = DEFAULT_DIRECTION;
