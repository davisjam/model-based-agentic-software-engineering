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
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { LANE_PITCH, METRICS, buildScene, layoutScene } from "../src/render/index.ts";
import type { Layout, Point } from "../src/render/index.ts";

const docableDoc = (): Record<string, unknown> =>
  parse(readFileSync("examples/docable.mage.yaml", "utf8")) as Record<string, unknown>;

const system = (doc: unknown) => canonicalize(doc);

const machineLayout = (doc: unknown, id = "document", hints?: ReadonlyMap<string, Point>): Layout =>
  layoutScene(buildScene(system(doc), { kind: "machine", id }), hints === undefined ? {} : { hints });

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
  const first = layoutScene(scene);
  const hints = new Map<string, Point>([["remediation", { x: 400, y: 300 }]]);
  const moved = layoutScene(scene, { hints });
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
  const l = layoutScene(buildScene(system(docableDoc()), { kind: "model", id: "service-flow" }));
  assert.deepEqual(l.ranks, [["api"], ["remediation"], ["gateway"]]);
});

test("a backedge is routed around the primary layout, not through it", () => {
  const l = machineLayout(docableDoc());
  const back = l.edges.filter((e) => e.backedge);
  assert.equal(back.length, 1);
  const retry = back[0];
  assert.ok(retry);
  assert.equal(retry.from, "failed");
  assert.equal(retry.to, "waiting");
  // Left-to-right: the detour lane is below every node box, with clearance.
  const lowest = Math.max(...[...l.nodes.values()].map((n) => n.rect.y + n.rect.h));
  assert.ok(
    retry.points.some((p) => p.y >= lowest + METRICS.detourGap),
    "the backedge must leave the band the nodes occupy",
  );
  // And it does not cut across any node box.
  const vertices: readonly Point[] = retry.points;
  for (const n of l.nodes.values()) {
    for (const p of vertices) {
      const inside: boolean =
        p.x > n.rect.x && p.x < n.rect.x + n.rect.w && p.y > n.rect.y && p.y < n.rect.y + n.rect.h;
      assert.ok(!inside, `backedge vertex lands inside ${n.id}`);
    }
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
  const l = layoutScene(buildScene(system(docableDoc()), { kind: "model", id: "service-flow" }));
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
  const ltr = layoutScene(scene);
  const ttb = layoutScene(scene, { direction: "top-to-bottom" });
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
  const l = layoutScene(buildScene(empty, { kind: "model", id: "nope" }));
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
  const span = Math.max(...loop.points.map((p) => p.y)) - Math.min(...loop.points.map((p) => p.y));
  assert.equal(span, METRICS.selfLoop);
});
