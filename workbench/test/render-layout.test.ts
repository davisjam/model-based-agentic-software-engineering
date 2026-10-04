/**
 * Layout stability and determinism — the acceptance criteria of Phase E, not polish.
 *
 * The workbench's core interaction is comparing a model against a hypothetical variant of it. If
 * adding one state re-ranks the graph and everything moves, that comparison is unreadable and the
 * feature is worthless. So the load-bearing test here is `adding one state moves nothing that
 * already had a position`, and it is paired with its NEGATIVE CONTROL: the same insertion without
 * hints really does shift siblings, which is what proves the first test exercises the hint
 * machinery rather than an insertion that happened to be harmless.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import {
  LANE_PITCH,
  METRICS,
  TEXT_SIZES,
  buildScene,
  dagreLayoutEngine,
  renderView,
  textExtent,
} from "../src/render/index.ts";
import type {
  Layout,
  LayoutEngine,
  Point,
  Rect,
  SceneSubject,
  SvgNode,
  TextClass,
} from "../src/render/index.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { docableSystem } from "./render-fixtures.ts";

const docableDoc = (): Record<string, unknown> =>
  parse(readFileSync("examples/docable.mage.yaml", "utf8")) as Record<string, unknown>;

const system = (doc: unknown) => canonicalize(doc);

const machineLayout = (doc: unknown, id = "document", hints?: ReadonlyMap<string, Point>): Layout =>
  dagreLayoutEngine(buildScene(system(doc), { kind: "machine", id }), hints === undefined ? {} : { hints });

const positions = (l: Layout): Map<string, Point> =>
  new Map([...l.nodes.values()].map((n) => [n.id, { x: n.rect.x, y: n.rect.y }]));

/** The same machine with one extra state, inserted at an existing rank so ordering is disturbed. */
function withExtraState(): Record<string, unknown> {
  const doc = docableDoc();
  const machines = doc["machines"] as Record<string, Record<string, unknown>>;
  const document = machines["document"] as Record<string, unknown>;
  const states = document["states"] as Record<string, unknown>;
  // "archived" sorts before "failed" and "reviewed", so a fresh layout re-orders their lanes.
  document["states"] = { ...states, archived: null };
  document["transitions"] = [
    ...(document["transitions"] as unknown[]),
    { from: "processing", to: "archived", label: "archive" },
  ];
  return doc;
}

const maxDisplacement = (before: ReadonlyMap<string, Point>, after: ReadonlyMap<string, Point>): number => {
  let worst = 0;
  for (const [id, b] of before) {
    const a = after.get(id);
    if (a === undefined) continue;
    worst = Math.max(worst, Math.hypot(a.x - b.x, a.y - b.y));
  }
  return worst;
};

// -------------------------------------------------------------------------------------------
// Collision geometry — the shared predicates the properties below are built from
// -------------------------------------------------------------------------------------------

/**
 * Tolerance, in user units, for a shape GRAZING another. An edge legitimately starts and ends on a
 * box's border and a label legitimately sits flush against the viewBox, so the predicates test
 * strict interiors inset by this much. It is a margin for exact-arithmetic touching, not a licence
 * for a visible overlap: 1 unit against a 46-unit box.
 */
const GRAZE = 1;

const inset = (r: Rect, by: number): Rect => ({ x: r.x + by, y: r.y + by, w: r.w - 2 * by, h: r.h - 2 * by });

/**
 * Liang–Barsky: does the segment p→q pass through the interior of `r`?
 *
 * This is the assertion the suite used to approximate by testing whether a polyline VERTEX landed
 * inside a box. A straight edge can cross a box cleanly between two of its vertices and satisfy the
 * vertex test — which is exactly what a rank-skipping edge does — so the vertex form cannot see the
 * collision it exists to forbid.
 */
function segmentCrossesRect(p: Point, q: Point, r: Rect): boolean {
  const box = inset(r, GRAZE);
  if (box.w <= 0 || box.h <= 0) return false;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  let t0 = 0;
  let t1 = 1;
  const clip = (num: number, den: number): boolean => {
    if (den === 0) return num >= 0;
    const t = num / den;
    if (den > 0) {
      if (t < t0) return false;
      t1 = Math.min(t1, t);
    } else {
      if (t > t1) return false;
      t0 = Math.max(t0, t);
    }
    return true;
  };
  return (
    clip(p.x - box.x, -dx) &&
    clip(box.x + box.w - p.x, dx) &&
    clip(p.y - box.y, -dy) &&
    clip(box.y + box.h - p.y, dy) &&
    t0 < t1
  );
}

const polylineCrossesRect = (points: readonly Point[], r: Rect): boolean =>
  points.slice(1).some((q, i) => segmentCrossesRect(points[i] as Point, q, r));

const rectsOverlap = (a: Rect, b: Rect): boolean => {
  const x = inset(a, GRAZE);
  const y = inset(b, GRAZE);
  return x.x < y.x + y.w && y.x < x.x + x.w && x.y < y.y + y.h && y.y < x.y + x.h;
};

const contains = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x - GRAZE &&
  inner.y >= outer.y - GRAZE &&
  inner.x + inner.w <= outer.x + outer.w + GRAZE &&
  inner.y + inner.h <= outer.y + outer.h + GRAZE;

/** Every node on the parent chain of `id`, inclusive. An edge may pass through its own enclosures. */
function enclosures(layout: Layout, id: string): ReadonlySet<string> {
  const out = new Set<string>([id]);
  let cur = layout.nodes.get(id)?.parent ?? null;
  for (let i = 0; i < 8 && cur !== null; i += 1) {
    out.add(cur);
    cur = layout.nodes.get(cur)?.parent ?? null;
  }
  return out;
}

// -------------------------------------------------------------------------------------------
// Painted geometry — what the SVG actually puts on the canvas, read back off the tree
// -------------------------------------------------------------------------------------------

interface Painted {
  readonly kind: "text" | "mark";
  /** The element's own id or class, for a failure message that names the offender. */
  readonly what: string;
  readonly text: string | null;
  readonly box: Rect;
  /** The `data-*`-identified group this element belongs to, or null at the root. */
  readonly group: string | null;
}

interface Placed {
  readonly node: SvgNode;
  readonly group: string | null;
}

function flatten(node: SvgNode, group: string | null = null, out: Placed[] = []): readonly Placed[] {
  out.push({ node, group });
  const own =
    node.tag === "g"
      ? ((node.attrs["id"] as string | undefined) ??
        (node.attrs["data-legend-kind"] as string | undefined) ??
        (node.attrs["data-key-channel"] as string | undefined) ??
        group)
      : group;
  for (const c of node.children) flatten(c, own, out);
  return out;
}

const textClassOf = (cls: string | undefined): TextClass | null => {
  for (const c of (cls ?? "").split(/\s+/)) if (c in TEXT_SIZES) return c as TextClass;
  return null;
};

/**
 * The bounding box of every piece of INK the renderer emits that is not a node box or an edge
 * polyline: text runs and the initial-state marker. These are the elements `bounds` historically
 * could not see, so no gate could notice them leaving the viewBox.
 */
function paintedInk(tree: SvgNode): readonly Painted[] {
  const out: Painted[] = [];
  for (const { node, group } of flatten(tree)) {
    const cls = node.attrs["class"] as string | undefined;
    if (node.tag === "text" && node.text !== null) {
      const tc = textClassOf(cls);
      assert.ok(tc !== null, `text "${node.text}" carries no sized class (class="${cls ?? ""}")`);
      const ext = textExtent(node.text, tc);
      const x = Number(node.attrs["x"]);
      const y = Number(node.attrs["y"]);
      const anchor = (node.attrs["text-anchor"] as string | undefined) ?? "start";
      const left = anchor === "middle" ? x - ext.w / 2 : anchor === "end" ? x - ext.w : x;
      // A baseline-anchored run sits mostly ABOVE y; `middle`/`hanging` centre or drop it.
      const baseline = (node.attrs["dominant-baseline"] as string | undefined) ?? "alphabetic";
      const top = baseline === "middle" ? y - ext.h / 2 : baseline === "hanging" ? y : y - ext.h;
      out.push({ kind: "text", what: tc, text: node.text, box: { x: left, y: top, w: ext.w, h: ext.h }, group });
      continue;
    }
    if (node.tag === "circle" && cls === "mage-initial") {
      const cx = Number(node.attrs["cx"]);
      const cy = Number(node.attrs["cy"]);
      const r = Number(node.attrs["r"]);
      out.push({
        kind: "mark",
        what: "mage-initial",
        text: null,
        box: { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r },
        group,
      });
    }
  }
  return out;
}

const viewBoxOf = (tree: SvgNode): Rect => {
  const [x, y, w, h] = String(tree.attrs["viewBox"]).split(" ").map(Number) as [number, number, number, number];
  return { x, y, w, h };
};

// -------------------------------------------------------------------------------------------
// The corpus — every shipped example, every model and machine in it
// -------------------------------------------------------------------------------------------

interface Case {
  readonly name: string;
  readonly system: CanonicalSystem;
  readonly subject: SceneSubject;
}

/** Derived from the examples directory, so a new shipped example is covered without an edit here. */
function exampleFiles(): readonly string[] {
  const out: string[] = [];
  for (const e of readdirSync("examples", { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith(".mage.yaml")) out.push(`examples/${e.name}`);
    else if (e.isDirectory() && existsSync(`examples/${e.name}/system.mage.yaml`)) {
      out.push(`examples/${e.name}/system.mage.yaml`);
    }
  }
  return out.sort();
}

function corpus(): readonly Case[] {
  const out: Case[] = [];
  for (const file of exampleFiles()) {
    const system = canonicalize(parse(readFileSync(file, "utf8")) as Record<string, unknown>);
    for (const id of [...system.models.keys()].sort()) {
      out.push({ name: `${file} model:${id}`, system, subject: { kind: "model", id } });
    }
    for (const id of [...system.machines.keys()].sort()) {
      out.push({ name: `${file} machine:${id}`, system, subject: { kind: "machine", id } });
    }
  }
  // A floor on how much this reads: a glob that silently matches nothing would make every
  // property below pass vacuously, which is the failure mode a corpus-driven test invites.
  assert.ok(out.length >= 12, `expected the shipped examples to yield a real corpus, got ${out.length}`);
  return out;
}

const drawn = (c: Case): ReturnType<typeof renderView> => renderView(c.system, { subject: c.subject });

// -------------------------------------------------------------------------------------------
// Determinism
// -------------------------------------------------------------------------------------------

test("layout is deterministic: the same model places identically every time", () => {
  const a = machineLayout(docableDoc());
  const b = machineLayout(docableDoc());
  assert.deepEqual([...positions(a).entries()].sort(), [...positions(b).entries()].sort());
  assert.deepEqual(a.ranks, b.ranks);
  assert.deepEqual(a.edges, b.edges);
});

test("layout does not depend on authoring order of the source document", () => {
  const base = machineLayout(docableDoc());
  const flipped = docableDoc();
  const machines = flipped["machines"] as Record<string, unknown>;
  flipped["machines"] = Object.fromEntries(Object.entries(machines).reverse());
  assert.deepEqual(
    [...positions(machineLayout(flipped)).entries()].sort(),
    [...positions(base).entries()].sort(),
  );
});

// -------------------------------------------------------------------------------------------
// THE acceptance criterion
// -------------------------------------------------------------------------------------------

test("adding one state moves nothing that already had a position", () => {
  const before = machineLayout(docableDoc());
  const hints = positions(before);

  const after = machineLayout(withExtraState(), "document", hints);

  // Every pre-existing node is placed exactly where it was. Not "within a tolerance": a hinted
  // node is pinned, so the comparison a user is making stays pixel-identical.
  assert.equal(maxDisplacement(hints, positions(after)), 0);
  assert.ok(maxDisplacement(hints, positions(after)) < LANE_PITCH, "displacement must stay under one lane pitch");

  // The new state is placed, is NOT pinned, and overlaps nothing.
  const added = after.nodes.get("archived");
  assert.ok(added, "the added state must be laid out");
  assert.equal(added.pinned, false);
  for (const other of after.nodes.values()) {
    if (other.id === "archived") continue;
    const clear: boolean =
      added.rect.x >= other.rect.x + other.rect.w ||
      other.rect.x >= added.rect.x + added.rect.w ||
      added.rect.y >= other.rect.y + other.rect.h ||
      other.rect.y >= added.rect.y + added.rect.h;
    assert.ok(clear, `added state overlaps ${other.id}`);
  }
  for (const id of hints.keys()) assert.equal(after.nodes.get(id)?.pinned, true);
});

test("the same insertion WITHOUT hints does re-rank, which is why hints exist", () => {
  // Negative control. Without this, the test above could be passing because the insertion was
  // harmless rather than because incremental layout works.
  const before = positions(machineLayout(docableDoc()));
  const fresh = positions(machineLayout(withExtraState()));
  assert.ok(
    maxDisplacement(before, fresh) >= LANE_PITCH,
    "expected a fresh layout to displace a sibling by at least one lane pitch",
  );
});

test("a hinted node is honoured exactly, at coordinates no fresh layout would choose", () => {
  const hints = new Map<string, Point>([["waiting", { x: 1234, y: 567 }]]);
  const l = machineLayout(docableDoc(), "document", hints);
  const n = l.nodes.get("waiting");
  assert.ok(n);
  assert.equal(n.rect.x, 1234);
  assert.equal(n.rect.y, 567);
  assert.equal(n.pinned, true);
  // The viewBox follows the content rather than clipping it.
  assert.ok(l.bounds.x <= 1234 && l.bounds.x + l.bounds.w >= 1234);
});

test("a fresh node adopts the pinned frame's rank spacing, not a second grid", () => {
  // Pin rank 0 far from the origin; the unpinned rank-1 node must follow it rather than sit at the
  // fresh grid's rank-1 coordinate.
  const hints = new Map<string, Point>([["waiting", { x: 1000, y: 200 }]]);
  const l = machineLayout(docableDoc(), "document", hints);
  const processing = l.nodes.get("processing");
  assert.ok(processing);
  assert.ok(processing.rect.x > 1000, "rank 1 must sit past the pinned rank 0");
  assert.ok(processing.rect.x < 1000 + 400, "rank 1 must sit NEAR the pinned rank 0, not at a fresh-grid x");
});

test("a pinned region pins its children", () => {
  const doc = docableDoc();
  const scene = buildScene(system(doc), { kind: "model", id: "service-flow" });
  const first = dagreLayoutEngine(scene, {});
  const hints = new Map<string, Point>([["remediation", { x: 400, y: 300 }]]);
  const moved = dagreLayoutEngine(scene, { hints });
  const before = first.nodes.get("parser");
  const after = moved.nodes.get("parser");
  const region = moved.nodes.get("remediation");
  assert.ok(before && after && region);
  assert.notDeepEqual([before.rect.x, before.rect.y], [after.rect.x, after.rect.y]);
  // Derived from the region, so it travelled with it and is still inside it.
  assert.ok(after.rect.x >= region.rect.x && after.rect.x + after.rect.w <= region.rect.x + region.rect.w);
  assert.ok(after.rect.y >= region.rect.y && after.rect.y + after.rect.h <= region.rect.y + region.rect.h);
});

// -------------------------------------------------------------------------------------------
// Ranking
// -------------------------------------------------------------------------------------------

test("a cyclic machine ranks by breadth from the initial state", () => {
  const l = machineLayout(docableDoc());
  const rank = (id: string): number => l.nodes.get(id)?.rank ?? -1;
  assert.equal(rank("waiting"), 0, "the initial state is the seed, not an in-degree-zero node");
  assert.equal(rank("processing"), 1);
  assert.equal(rank("reviewed"), 2);
  assert.equal(rank("failed"), 2);
  assert.equal(rank("published"), 3);
  // `waiting` has an incoming edge from `failed`, so in-degree-zero ranking would have found no
  // seed at all. This is the case the plan calls out.
  assert.ok(l.edges.some((e) => e.to === "waiting" && e.from === "failed"));
});

test("an acyclic graph gets longest-path ranks", () => {
  const l = dagreLayoutEngine(buildScene(system(docableDoc()), { kind: "model", id: "service-flow" }), {});
  assert.deepEqual(l.ranks, [["api"], ["remediation"], ["gateway"]]);
});

test("a backedge is routed around the primary layout, not through it", () => {
  // REWRITTEN from a detour-lane coordinate assertion. It used to require a vertex below every
  // node box by a fixed clearance constant, which is not the requirement — it is one
  // implementation's choice of WHICH SIDE to detour on (and the constant is gone with it). A layered engine may route a back edge above the flow, below
  // it, or between two ranks, and all three satisfy "around the primary layout, not through it".
  // What the old assertion was really protecting is below: the cycle is broken at the edge that
  // genuinely goes backwards, that edge is MARKED so the picture can show it, it travels backwards
  // along the rank axis, and it detours rather than running straight through what lies between.
  const l = machineLayout(docableDoc());
  const back = l.edges.filter((e) => e.backedge);
  assert.equal(back.length, 1, "exactly one edge of this lifecycle goes backwards");
  const retry = back[0];
  assert.ok(retry);
  // Seeded from the DECLARED initial state, not from whichever edge an acyclicer found cheapest.
  assert.equal(retry.from, "failed");
  assert.equal(retry.to, "waiting");

  const head = retry.points[0] as Point;
  const tail = retry.points[retry.points.length - 1] as Point;
  assert.equal(l.direction, "left-to-right");
  assert.ok(tail.x < head.x, "a backedge must travel backwards along the rank axis");
  assert.ok(
    retry.points.length >= 3,
    "a backedge must DETOUR — a two-point straight run is the geometry that cuts through boxes",
  );
  // And it does not cut across any node box. Tested as SEGMENT-crosses-box, not vertex-in-box:
  // a straight run between two vertices can pass clean through a box and satisfy the vertex form.
  const skip = enclosures(l, retry.from);
  for (const n of l.nodes.values()) {
    if (skip.has(n.id) || enclosures(l, retry.to).has(n.id)) continue;
    assert.ok(!polylineCrossesRect(retry.points, n.rect), `backedge cuts across ${n.id}`);
  }
});

// -------------------------------------------------------------------------------------------
// Collision properties — stated over every shipped diagram, not over one fixture
//
// These four are the requirement itself: "nodes must not overlap; edges route cleanly around
// nodes; … any text that genuinely must appear in the graph must participate in layout rather than
// being painted afterward where it can collide." They are written against `renderView` so they see
// what is PAINTED — the suite's earlier geometry assertions all read `Layout`, which is why text,
// markers and the legend could collide and clip for four waves with every gate green.
// -------------------------------------------------------------------------------------------

test("no edge cuts across a node box it neither leaves nor enters", () => {
  const offences: string[] = [];
  for (const c of corpus()) {
    const l = drawn(c).layout;
    for (const e of l.edges) {
      if (e.points.length < 2) continue;
      const exempt = new Set([...enclosures(l, e.from), ...enclosures(l, e.to)]);
      for (const n of l.nodes.values()) {
        if (exempt.has(n.id)) continue;
        if (polylineCrossesRect(e.points, n.rect)) offences.push(`${c.name}: ${e.id} (${e.from}->${e.to}) crosses ${n.id}`);
      }
    }
  }
  assert.deepEqual(offences, [], `${offences.length} edge/node crossings`);
});

test("no two node boxes overlap", () => {
  const offences: string[] = [];
  for (const c of corpus()) {
    const l = drawn(c).layout;
    const all = [...l.nodes.values()];
    for (let i = 0; i < all.length; i += 1) {
      for (let j = i + 1; j < all.length; j += 1) {
        const a = all[i] as (typeof all)[number];
        const b = all[j] as (typeof all)[number];
        // A region legitimately encloses its own descendants; nothing else may overlap.
        if (enclosures(l, a.id).has(b.id) || enclosures(l, b.id).has(a.id)) continue;
        if (rectsOverlap(a.rect, b.rect)) offences.push(`${c.name}: ${a.id} overlaps ${b.id}`);
      }
    }
  }
  assert.deepEqual(offences, [], `${offences.length} node overlaps`);
});

test("every painted text run and marker lies inside the viewBox", () => {
  const offences: string[] = [];
  for (const c of corpus()) {
    const view = drawn(c);
    const vb = viewBoxOf(view.tree);
    for (const ink of paintedInk(view.tree)) {
      if (!contains(vb, ink.box)) {
        offences.push(
          `${c.name}: ${ink.what} ${JSON.stringify(ink.text)} at ` +
            `[${ink.box.x.toFixed(1)}..${(ink.box.x + ink.box.w).toFixed(1)}] x ` +
            `[${ink.box.y.toFixed(1)}..${(ink.box.y + ink.box.h).toFixed(1)}] ` +
            `escapes viewBox ${vb.x} ${vb.y} ${vb.w} ${vb.h}`,
        );
      }
    }
  }
  assert.deepEqual(offences, [], `${offences.length} clipped elements`);
});

test("no label is painted on top of another label, or on top of a node box", () => {
  const offences: string[] = [];
  for (const c of corpus()) {
    const view = drawn(c);
    // Node labels sit inside their own box by construction and regions deliberately stack a
    // header over their frame, so the collisions that matter are the ones involving edge text.
    const edgeText = paintedInk(view.tree).filter((p) => p.what === "mage-edge-label");
    for (let i = 0; i < edgeText.length; i += 1) {
      for (let j = i + 1; j < edgeText.length; j += 1) {
        const a = edgeText[i] as Painted;
        const b = edgeText[j] as Painted;
        if (rectsOverlap(a.box, b.box)) {
          offences.push(`${c.name}: edge label ${JSON.stringify(a.text)} overlaps ${JSON.stringify(b.text)}`);
        }
      }
    }
    for (const t of edgeText) {
      for (const n of view.layout.nodes.values()) {
        if (rectsOverlap(t.box, n.rect)) {
          offences.push(`${c.name}: edge label ${JSON.stringify(t.text)} overlaps node ${n.id}`);
        }
      }
    }
  }
  assert.deepEqual(offences, [], `${offences.length} label collisions`);
});

test("a rank-skipping edge is routed around the ranks it skips, not straight through them", () => {
  // The sharpest case for the segment form, and the one the vertex form could never see: a->d in
  // a four-rank chain draws one straight run at the shared lane centre, through b and through c.
  const chain = canonicalize({
    mage: 1,
    system: { id: "chain" },
    entities: { a: { type: "s" }, b: { type: "s" }, c: { type: "s" }, d: { type: "s" } },
    models: {
      m: {
        type: "graph",
        purpose: { question: "Does a reach d?" },
        entities: ["a", "b", "c", "d"],
        relations: [
          { id: "ab", from: "a", to: "b", type: "t" },
          { id: "bc", from: "b", to: "c", type: "t" },
          { id: "cd", from: "c", to: "d", type: "t" },
          { id: "ad", from: "a", to: "d", type: "t" },
        ],
      },
    },
  });
  const l = dagreLayoutEngine(buildScene(chain, { kind: "model", id: "m" }), {});
  const skipper = l.edges.find((e) => e.from === "a" && e.to === "d");
  assert.ok(skipper, "the rank-skipping relation must be laid out");
  assert.equal(l.nodes.get("d")?.rank, 3, "the chain must actually span four ranks");
  for (const id of ["b", "c"]) {
    const n = l.nodes.get(id);
    assert.ok(n);
    assert.ok(!polylineCrossesRect(skipper.points, n.rect), `a->d passes through ${id}`);
  }
});

test("forward edges run between ranks and carry at least two points", () => {
  const l = machineLayout(docableDoc());
  for (const e of l.edges) {
    if (e.kind === "containment") continue;
    assert.ok(e.points.length >= 2, `${e.id} has no route`);
  }
});

// -------------------------------------------------------------------------------------------
// Containment and direction
// -------------------------------------------------------------------------------------------

test("containment is drawn as an enclosing region with its children inside", () => {
  const l = dagreLayoutEngine(buildScene(system(docableDoc()), { kind: "model", id: "service-flow" }), {});
  const region = l.nodes.get("remediation");
  assert.ok(region);
  assert.equal(region.kind, "region");
  for (const child of ["parser", "repair-engine"]) {
    const c = l.nodes.get(child);
    assert.ok(c, `${child} must be laid out`);
    assert.equal(c.parent, "remediation");
    assert.ok(c.rect.x >= region.rect.x, `${child} escapes its region on the left`);
    assert.ok(c.rect.x + c.rect.w <= region.rect.x + region.rect.w, `${child} escapes on the right`);
    assert.ok(c.rect.y >= region.rect.y + METRICS.regionHeader, `${child} overlaps the region header`);
    assert.ok(c.rect.y + c.rect.h <= region.rect.y + region.rect.h, `${child} escapes at the bottom`);
  }
  // A region's children are not ranked as peers of the outer graph.
  assert.ok(!l.ranks.some((r) => r.includes("parser")));
});

test("top-to-bottom transposes the rank axis without changing the ranking", () => {
  const scene = buildScene(system(docableDoc()), { kind: "machine", id: "document" });
  const ltr = dagreLayoutEngine(scene, {});
  const ttb = dagreLayoutEngine(scene, { direction: "top-to-bottom" });
  assert.deepEqual(ttb.ranks, ltr.ranks);
  const waiting = ttb.nodes.get("waiting");
  const processing = ttb.nodes.get("processing");
  const published = ttb.nodes.get("published");
  assert.ok(waiting && processing && published);
  assert.ok(processing.rect.y > waiting.rect.y, "ranks must advance down the page");
  assert.ok(published.rect.y > processing.rect.y);
  assert.equal(ttb.direction, "top-to-bottom");
});

test("a scene with no content still yields usable bounds rather than NaN", () => {
  const empty = canonicalize({ mage: 1, system: { id: "e" } });
  const l = dagreLayoutEngine(buildScene(empty, { kind: "model", id: "nope" }), {});
  assert.equal(l.nodes.size, 0);
  assert.ok(Number.isFinite(l.bounds.w) && l.bounds.w > 0);
  assert.ok(Number.isFinite(l.bounds.h) && l.bounds.h > 0);
});

test("a self-loop is routed as a loop rather than a degenerate zero-length edge", () => {
  const doc = docableDoc();
  const machines = doc["machines"] as Record<string, Record<string, unknown>>;
  const worker = machines["worker"] as Record<string, unknown>;
  worker["transitions"] = [
    ...(worker["transitions"] as unknown[]),
    { from: "idle", to: "idle", label: "poll" },
  ];
  const l = machineLayout(doc, "worker");
  const loop = l.edges.find((e) => e.selfLoop);
  assert.ok(loop, "a from == to transition must be routed as a self-loop");
  assert.equal(loop.from, "idle");
  assert.ok(loop.points.length >= 4);

  // REWRITTEN from an equality against a fixed self-loop-height constant. That pinned one engine's
  // chosen loop height, which is a number no requirement names (the constant is gone with it); what the test is for is that the edge is a VISIBLE LOOP and
  // not a degenerate stub. So: it encloses area on both axes, it escapes the box it returns to —
  // the property that makes it readable at all — and it stays local rather than flying across the
  // diagram or landing on a neighbour.
  const xs = loop.points.map((p) => p.x);
  const ys = loop.points.map((p) => p.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  assert.ok(spanX > 0 && spanY > 0, `a self-loop must enclose area, got ${spanX} x ${spanY}`);

  const idle = l.nodes.get("idle");
  assert.ok(idle);
  assert.ok(
    loop.points.some((p) => p.x < idle.rect.x || p.x > idle.rect.x + idle.rect.w || p.y < idle.rect.y || p.y > idle.rect.y + idle.rect.h),
    "a self-loop must leave its own box, or it is invisible",
  );
  assert.ok(
    Math.max(spanX, spanY) <= 3 * Math.max(idle.rect.w, idle.rect.h),
    "a self-loop must stay local to its state",
  );
  for (const other of l.nodes.values()) {
    if (other.id === "idle") continue;
    assert.ok(!polylineCrossesRect(loop.points, other.rect), `the self-loop cuts across ${other.id}`);
  }
});

// -------------------------------------------------------------------------------------------
// The layout seam
// -------------------------------------------------------------------------------------------

test("the layout engine is swappable", () => {
  // A stub engine stands in for an external one (ELK). If `renderView` reached past the seam to
  // the built-in engine, these coordinates could not appear.
  const stub: LayoutEngine = (scene) => ({
    direction: "left-to-right",
    nodes: new Map(
      scene.nodes.map((n, i) => [
        n.id,
        {
          id: n.id,
          kind: n.kind,
          label: n.label,
          rect: { x: i * 1000, y: 7, w: 100, h: 40 },
          rank: i,
          order: 0,
          parent: n.parent,
          initial: n.initial,
          pinned: false,
        },
      ]),
    ),
    edges: [],
    bounds: { x: 0, y: 0, w: 5000, h: 100 },
    ranks: scene.nodes.map((n) => [n.id]),
  });
  const view = renderView(docableSystem(), { subject: { kind: "machine", id: "document" } }, { engine: stub });
  assert.equal(view.layout.nodes.get("failed")?.rect.y, 7);
  assert.deepEqual([...view.positions.values()].map((p) => p.y), [7, 7, 7, 7, 7]);
  // The twin is built from whatever the engine produced, so swapping engines cannot desynchronize
  // the picture from its accessible representation.
  assert.equal(view.accessible.nodes.length, 5);
});

test("an external cold layout enters through the hint mechanism, exactly", () => {
  // This is the sanctioned ELK integration: run the engine upstream, pass its coordinates in as a
  // COMPLETE hint set. Every node must land exactly where the external engine put it.
  const elkish = new Map<string, Point>([
    ["waiting", { x: 10, y: 400 }],
    ["processing", { x: 300, y: 390 }],
    ["reviewed", { x: 620, y: 250 }],
    ["failed", { x: 615, y: 540 }],
    ["published", { x: 940, y: 240 }],
  ]);
  const cold = machineLayout(docableDoc(), "document", elkish);
  for (const [id, p] of elkish) {
    assert.deepEqual({ x: cold.nodes.get(id)?.rect.x, y: cold.nodes.get(id)?.rect.y }, p);
    assert.equal(cold.nodes.get(id)?.pinned, true);
  }
  // And the incremental property still holds on top of an externally-computed frame.
  const after = machineLayout(withExtraState(), "document", elkish);
  assert.equal(maxDisplacement(elkish, positions(after)), 0);
  assert.ok(after.nodes.get("archived"));
});

test("positions round-trip as hints without drift", () => {
  const first = renderView(docableSystem(), { subject: { kind: "machine", id: "document" } });
  const second = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    hints: first.positions,
  });
  assert.deepEqual([...second.positions.entries()].sort(), [...first.positions.entries()].sort());
  // Idempotent: feeding a layout back into itself is a fixed point, so repeated renders of an
  // unchanged model never creep.
  const third = renderView(docableSystem(), {
    subject: { kind: "machine", id: "document" },
    hints: second.positions,
  });
  assert.equal(third.svg, second.svg);
});
