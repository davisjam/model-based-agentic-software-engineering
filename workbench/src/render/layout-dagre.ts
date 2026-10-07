/**
 * Layered layout by dagre, behind the `LayoutEngine` seam.
 *
 * **Why a library at all.** The hand-rolled placer ranked and ordered correctly but routed edges as
 * straight runs between face midpoints, which is sound only when every edge spans exactly one rank.
 * A rank-skipping edge drew one straight line through every box between its ends; two edges whose
 * midpoints coincided painted their labels at one point. Those are not individual defects to patch —
 * they are what you get from routing without inter-rank dummy nodes and from placing text after the
 * fact. Sugiyama's answer to both has been known since 1981 and is 21 KB gzipped.
 *
 * **Why dagre and not the alternatives — the choice is derived.** Layout here must be SYNCHRONOUS
 * and DOM-FREE, and neither is a stylistic preference: the shell's paint callbacks return `void`,
 * `RenderPort.render` returns its result rather than a promise, and a test asserts `renderView` runs
 * exactly once per paint, so a render-measure-render cycle is forbidden by a gate. That eliminates
 * elkjs (promise-only, and its incremental mode preserves layer and order but not coordinates, which
 * fails the zero-displacement property this feature exists to protect), Graphviz-WASM (async init,
 * and Béziers where the contract says polyline), and Mermaid (whose layout IS dagre plus elkjs, and
 * which measures text against a DOM). Dagre is synchronous, needs no DOM, is a multigraph so
 * parallel edges separate, routes around nodes through dummy nodes, and treats EDGE LABELS AS SIZED
 * BOXES — which is the author's "text must participate in layout", obtained rather than hand-rolled.
 *
 * **What this module does NOT do**, and both are deliberate:
 *
 * - It does not use dagre's `acyclicer`. Cycles are broken here, by depth-first search seeded from
 *   `scene.roots` — a machine's declared initial state. Dagre's greedy heuristic picks whichever
 *   edges minimise its own objective, which is a fine answer to a different question: a lifecycle
 *   diagram should rank by distance from the state the author declared as the start, and `retry`
 *   should be the edge drawn going backwards because it IS the edge that goes backwards.
 * - It does not hand dagre the region children. A region's child has no independent position — its
 *   rect is derived from its parent's — so only outer nodes enter the graph, with the region sized
 *   large enough to hold what it contains.
 *
 * **Determinism is a property of insertion order here.** Graphlib keeps nodes and edges in plain
 * objects, so iteration follows insertion for non-numeric keys. Every id is therefore inserted
 * SORTED and PREFIXED (`n:`): sorted so authoring order cannot reach the output, prefixed because a
 * model whose entities are named `1`, `2`, `10` would otherwise be iterated in numeric order by the
 * JavaScript object itself and lay out differently from one whose entities are named `a`, `b`, `c`.
 */
import dagre from "@dagrejs/dagre";
import type { SceneGraph } from "./scene.ts";
import {
  METRICS, assembleLayout, claimsByTarget, liftToOuter, place, sizes, textExtent,
} from "./layout.ts";
import type { LayoutEngine, LiftedEdge, Size } from "./layout.ts";
import type { Direction, LayoutEdge, LayoutOptions, Point, Rect } from "./types.ts";

/** Drop consecutive duplicate vertices, which dagre emits freely around dummy nodes. */
function dedupe(points: readonly Point[]): readonly Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last !== undefined && last.x === p.x && last.y === p.y) continue;
    out.push(p);
  }
  return out;
}

/** Graphlib iterates plain-object keys, and numeric-looking ids would sort numerically. */
const key = (id: string): string => `n:${id}`;

const rankdirOf = (d: Direction): "LR" | "TB" => (d === "left-to-right" ? "LR" : "TB");

const centreOf = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/**
 * On the border counts as in: dagre's own endpoint anchors sit exactly ON the source and target
 * borders, and an anchor that survives the interior filter stays in the polyline after the
 * re-anchor replaces it — the edge then still rides dagre's face choice (measured: a top-face
 * anchor at the corner-cutting diagonal this module's rank-face snap exists to remove).
 */
const insideOrOn = (r: Rect, p: Point): boolean =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/**
 * The point on `r`'s border on the way out toward `p`. Used to re-anchor an edge's endpoints after
 * `place` has moved a box: dagre's polyline is in dagre's coordinates, and an endpoint left there
 * while its box travelled to a user-pinned position is an arrow pointing at empty canvas.
 */
function faceToward(r: Rect, p: Point): Point {
  const c = centreOf(r);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const tx = dx === 0 ? Number.POSITIVE_INFINITY : r.w / 2 / Math.abs(dx);
  const ty = dy === 0 ? Number.POSITIVE_INFINITY : r.h / 2 / Math.abs(dy);
  const t = Math.min(tx, ty, 1);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

const clampTo = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

/**
 * Keep an edge anchor off the faces that look into the box's own rank. `faceToward` aims at the
 * first channel point, which for a labelled edge is the label dummy sitting between ranks — and an
 * anchor that lands on a rank-perpendicular face (the top or bottom face under left-to-right) sends
 * the first segment diagonally across the corner of the neighbour stacked beside the box. Measured
 * on the three-example corpus: data-policy's order-created → shipping-address exited the top face
 * and cut `inventory`. When the other endpoint's box lies strictly beyond along the rank axis, the
 * anchor belongs on the rank-facing face; the segment then starts clear of the whole column.
 */
function snapToRankFace(r: Rect, other: Rect, p: Point, aim: Point, horizontal: boolean): Point {
  if (horizontal) {
    if (p.y !== r.y && p.y !== r.y + r.h) return p;
    if (other.x >= r.x + r.w) return { x: r.x + r.w, y: clampTo(aim.y, r.y, r.y + r.h) };
    if (other.x + other.w <= r.x) return { x: r.x, y: clampTo(aim.y, r.y, r.y + r.h) };
    return p;
  }
  if (p.x !== r.x && p.x !== r.x + r.w) return p;
  if (other.y >= r.y + r.h) return { x: clampTo(aim.x, r.x, r.x + r.w), y: r.y + r.h };
  if (other.y + other.h <= r.y) return { x: clampTo(aim.x, r.x, r.x + r.w), y: r.y };
  return p;
}

/**
 * An edge label as a box dagre must find room for.
 *
 * **Note `width`/`height`, not `w`/`h`.** Dagre reads those exact keys and silently treats a label
 * of unknown size as no label at all — it reserves nothing and reports no position, so the painter
 * falls back to the polyline's midpoint and the collisions this change exists to remove come
 * straight back. An empty object here is the correct spelling for "this edge carries no text";
 * a misspelled size is the same thing by accident.
 */
const labelBox = (text: string | null): Readonly<Record<string, unknown>> => {
  if (text === null) return {};
  const ext = textExtent(text, "mage-edge-label");
  return { width: ext.w, height: ext.h, labelpos: "c", labeloffset: 0 };
};

/**
 * Depth-first search from the declared roots; an edge reaching a node still on the stack is a back
 * edge. Roots first and in sorted order, then any node the roots do not reach, so a disconnected
 * remainder is ranked rather than piled at rank 0.
 */
function backPairs(
  outer: readonly string[],
  succ: ReadonlyMap<string, readonly string[]>,
  roots: readonly string[],
): ReadonlySet<string> {
  const back = new Set<string>();
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (id: string): void => {
    state.set(id, 1);
    for (const next of succ.get(id) ?? []) {
      const s = state.get(next) ?? 0;
      if (s === 1) back.add(`${id} -> ${next}`);
      else if (s === 0) visit(next);
    }
    state.set(id, 2);
  };
  const seeds = [...roots].filter((r) => outer.includes(r)).sort();
  for (const r of seeds) if ((state.get(r) ?? 0) === 0) visit(r);
  for (const id of outer) if ((state.get(id) ?? 0) === 0) visit(id);
  return back;
}

/**
 * Dagre's node ranks are always EVEN. `makeSpaceForEdgeLabels` doubles every edge's minimum length
 * so a label dummy can sit in the half-rank between two real ranks, whether or not any edge
 * actually carries a label. `Layout.ranks` is an ordinal index that `accessible.ts` turns into
 * reading order, so the doubled values are compressed back to 0, 1, 2, … here. This is also what
 * makes the ranks a reader can see match the ranks the twin announces.
 */
function denseRanks(raw: ReadonlyMap<string, number>): ReadonlyMap<string, number> {
  const distinct = [...new Set(raw.values())].sort((a, b) => a - b);
  const index = new Map(distinct.map((r, i) => [r, i]));
  return new Map([...raw].map(([id, r]) => [id, index.get(r) ?? 0]));
}

/**
 * The engine in use when a caller names none. Named rather than inlined at the call site so the
 * default is one edit to change, and so a test can assert which engine actually ran.
 */
export const dagreLayoutEngine: LayoutEngine = (scene: SceneGraph, opts: LayoutOptions = {}) => {
  const d = opts.direction ?? "left-to-right";
  const show = opts.showProperties === undefined ? null : new Set(opts.showProperties);
  const claims = claimsByTarget(opts.claims);
  const size = sizes(scene, show, claims);
  const ext = (id: string): Size => size.get(id) ?? { w: METRICS.nodeMinWidth, h: METRICS.nodeHeight };
  const { outer, lifted } = liftToOuter(scene);

  // Lifted adjacency, deduplicated and sorted — the graph the cycle break reasons over.
  const succ = new Map<string, string[]>(outer.map((id) => [id, []]));
  const seenPair = new Set<string>();
  for (const l of lifted) {
    if (l.from === l.to) continue;
    const pair = `${l.from} -> ${l.to}`;
    if (seenPair.has(pair)) continue;
    seenPair.add(pair);
    succ.get(l.from)?.push(l.to);
  }
  for (const list of succ.values()) list.sort();
  const back = backPairs(outer, succ, scene.roots);

  const g = new dagre.graphlib.Graph({ multigraph: true, directed: true });
  g.setGraph({
    rankdir: rankdirOf(d),
    // The same separations the hand-rolled grid used, so the two engines agree about how much air
    // a diagram needs and a reader does not see the density change under them.
    ranksep: METRICS.rankGap,
    nodesep: METRICS.laneGap,
    edgesep: Math.round(METRICS.laneGap / 2),
    marginx: METRICS.margin,
    marginy: METRICS.margin,
    ranker: "network-simplex",
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const id of outer) g.setNode(key(id), { width: ext(id).w, height: ext(id).h });

  // Self-loops and region-internal edges are not given to dagre: a self-loop it routes itself, and
  // an edge between two children of one region is geometry inside a box dagre does not see into.
  const selfLoops: LiftedEdge[] = [];
  const ranked: LiftedEdge[] = [];
  for (const l of lifted) {
    if (l.from === l.to) selfLoops.push(l);
    else ranked.push(l);
  }

  const reversed = new Set<string>();
  for (const l of [...ranked].sort((a, b) => (a.edge.id < b.edge.id ? -1 : 1))) {
    const isBack = back.has(`${l.from} -> ${l.to}`);
    if (isBack) reversed.add(l.edge.id);
    // An edge's label is a SIZED BOX dagre must find room for, not decoration painted afterward.
    const label = labelBox(l.edge.label);
    const [v, w] = isBack ? [l.to, l.from] : [l.from, l.to];
    g.setEdge(key(v), key(w), { ...label }, l.edge.id);
  }
  for (const l of selfLoops) {
    const label = labelBox(l.edge.label);
    g.setEdge(key(l.from), key(l.from), { ...label }, l.edge.id);
  }

  dagre.layout(g);

  // --- dagre's answer, in our coordinates ------------------------------------------------------
  // Dagre reports node CENTRES; `Rect` is a top-left corner plus an extent.
  const fresh = new Map<string, Rect>();
  const rawRank = new Map<string, number>();
  const rawOrder = new Map<string, number>();
  for (const id of outer) {
    const n = g.node(key(id)) as { x: number; y: number; rank?: number; order?: number } | undefined;
    const e = ext(id);
    if (n === undefined) {
      fresh.set(id, { x: METRICS.margin, y: METRICS.margin, w: e.w, h: e.h });
      rawRank.set(id, 0);
      rawOrder.set(id, 0);
      continue;
    }
    fresh.set(id, { x: n.x - e.w / 2, y: n.y - e.h / 2, w: e.w, h: e.h });
    rawRank.set(id, n.rank ?? 0);
    rawOrder.set(id, n.order ?? 0);
  }

  const rank = denseRanks(rawRank);
  const depth = Math.max(0, ...[...rank.values()]) + 1;
  const ranks: string[][] = Array.from({ length: outer.length === 0 ? 0 : depth }, () => []);
  for (const id of outer) (ranks[rank.get(id) ?? 0] as string[]).push(id);
  for (const r of ranks) {
    r.sort((a, b) => {
      const o = (rawOrder.get(a) ?? 0) - (rawOrder.get(b) ?? 0);
      return o !== 0 ? o : a < b ? -1 : a > b ? 1 : 0;
    });
  }

  // --- hints win, and edge geometry follows the boxes -----------------------------------------
  const { rects, pinned, shift } = place(scene, size, fresh, d, opts.hints, show, claims);

  const byId = new Map(lifted.map((l) => [l.edge.id, l]));
  const edges: LayoutEdge[] = scene.edges.map((e): LayoutEdge => {
    const base = { id: e.id, kind: e.kind, from: e.from, to: e.to, label: e.label, via: e.via };
    const src = rects.get(e.from);
    const tgt = rects.get(e.to);
    const l = byId.get(e.id);
    if (e.kind === "containment" || src === undefined || tgt === undefined || l === undefined) {
      return { ...base, backedge: false, selfLoop: false, points: [], labelPoint: null };
    }

    const raw = g.edge(key(reversed.has(e.id) ? l.to : l.from), key(reversed.has(e.id) ? l.from : l.to), e.id) as
      | { points?: readonly Point[]; x?: number; y?: number }
      | undefined;
    const ordered = reversed.has(e.id) ? [...(raw?.points ?? [])].reverse() : [...(raw?.points ?? [])];
    const moved = ordered.map((p) => ({ x: p.x + shift.x, y: p.y + shift.y }));
    const labelPoint =
      raw?.x === undefined || raw.y === undefined ? null : { x: raw.x + shift.x, y: raw.y + shift.y };

    const selfLoop = e.from === e.to;
    if (selfLoop && moved.length >= 2) {
      // A self-loop's polyline starts and ends on the same box, so there is no endpoint to
      // re-anchor. Dagre routes and labels it; both are taken as given.
      return { ...base, backedge: false, selfLoop: true, points: dedupe(moved), labelPoint };
    }
    if (selfLoop || l.internal) {
      // An edge between two children of one region, or a self-loop dagre declined to route: a
      // straight run between the two derived rects, with its label at the midpoint. Dagre's own
      // label position belongs to the collapsed outer node and would land outside the region.
      const a = faceToward(src, centreOf(tgt));
      const b = faceToward(tgt, centreOf(src));
      return {
        ...base,
        backedge: false,
        selfLoop,
        points: dedupe([a, b]),
        labelPoint: e.label === null ? null : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }

    const interior = moved.filter((p) => !insideOrOn(src, p) && !insideOrOn(tgt, p));
    const head = interior[0] ?? centreOf(tgt);
    const tail = interior[interior.length - 1] ?? centreOf(src);
    const horizontal = d === "left-to-right";
    const a = snapToRankFace(src, tgt, faceToward(src, head), head, horizontal);
    const b = snapToRankFace(tgt, src, faceToward(tgt, tail), tail, horizontal);
    const points = dedupe([a, ...interior, b]);
    return { ...base, backedge: reversed.has(e.id), selfLoop: false, points, labelPoint };
  });

  return assembleLayout(scene, d, rects, pinned, ranks, edges);
};

export const defaultLayoutEngine: LayoutEngine = dagreLayoutEngine;
