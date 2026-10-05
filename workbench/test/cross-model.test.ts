// The cross-model canvas, and the one claim it exists to make holdable.
//
// ## What was vacuous, and what makes it not
//
// `DESIGN-render-rules-261004.md` §C graded V-RENDER's third clause — *"cross-model visual
// connections correspond only to registered bindings or compositions"* — **vacuous**: the workspace
// drew one subject at a time, so the clause was true by having nothing to range over. §E then drew
// the distinction this file is built around, and it is the distinction that decides whether a test
// here is worth anything:
//
//   - *checked against* — the canvas computes edges some way, and a test compares the result to the
//     registry. That test passes while a second, unregistered edge path sits live and unexercised,
//     which is exactly the failure §A.6 MEASURED in the scene extractor: two synthesis paths that
//     no shipped example touches.
//   - *drawn from* — the canvas has no other input.
//
// So the tests below are not "every connection matches a registry row" and stop. That assertion is
// here (`every drawn connection IS a registry row, by reference`), and on its own it would hold
// nothing. What makes the clause non-vacuous is the pair of registry-SUBSTITUTION tests: with an
// EMPTY registry the same system and the same panels draw NOTHING, and removing one row removes
// exactly that row's lines and no others. A second edge path would survive both.
//
// Three further obligations, each failing on a different future mistake:
//
//   1. **Totality.** Every row of `BINDINGS ∪ COMPOSITIONS` is partitioned — drawn, or undrawn with
//      a reason. A row that fell out of the walk would be in neither.
//   2. **Readability.** Every registered BINDING's correspondence has an anchor rule and a witness
//      rule. A new binding over a new noun pair goes red here instead of silently drawing nothing.
//   3. **Boundaries.** Each panel's own layer groups appear in the composed tree UNCHANGED, which
//      is §23.3's *"do not flatten both models into one graph"* as a structural assertion rather
//      than a reading of the picture.
//
// ## What stays `asserted`, said here so nobody reads this file as more than it is
//
// That a registry entry MEANS what its `interpretation` says. `test/bindings-census.test.ts` already
// rules that correspondence-of-prose is read by a person, and nothing below changes which half is
// which: this file holds that the canvas draws only what the registry declares, never that the
// declaration is right.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  BINDINGS, COMPOSITIONS, type BindingSemantics, type Correspondence, type ModelTypeId,
} from "../src/engine/model-types.ts";
import {
  ANCHOR_BY_NOUN, KERNEL_CROSS_MODEL_REGISTRY, SCENE_CONSTRUCTS, composeCrossModelView,
  connectionLabel, notDrawnProse, refusalProse, witnessOf,
  type ComposedCrossModelView, type CrossModelPanelRequest, type CrossModelRegistry,
  type CrossModelRelation, type SceneConstruct,
} from "../src/app/cross-model.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import type { SvgNode } from "../src/render/index.ts";
import { loadExample } from "../scripts/gen-example-coverage.ts";
import type { Workspace } from "../src/app/services.ts";

// ----------------------------------------------------------------------------------------------
// Fixtures: the panel sets that present each registered pair of domains
//
// Chosen from the SHIPPED corpus rather than hand-built, because the correspondences under test are
// the ones the examples author. `transaction-workspace` is the one §23 names — it ships both halves
// of `machine-of-entity`, a structural `transaction-engine` and its lifecycle machine.
// ----------------------------------------------------------------------------------------------

const PAIRED: readonly CrossModelPanelRequest[] = [
  { type: "structural-graph", id: "change-pipeline" },
  { type: "state-machine", id: "transaction-lifecycle" },
];

/** Two structural models, so a SAME-domain binding (`appears-in`) has two panels to run between. */
const TWO_STRUCTURAL: readonly CrossModelPanelRequest[] = [
  { type: "structural-graph", id: "event-flow" },
  { type: "structural-graph", id: "event-propagation" },
];

const workspaceOf = (id: string): Workspace => loadExample(id).workspace;

const compose = (
  id: string,
  panels: readonly CrossModelPanelRequest[],
  registry?: CrossModelRegistry,
): ComposedCrossModelView => {
  const ws = workspaceOf(id);
  const system = ws.state.system;
  return registry === undefined
    ? ws.composeCrossModelView({ panels })
    : composeCrossModelView(system, { panels }, (req) => ws.renderView(req), registry);
};

const systemOf = (id: string): CanonicalSystem => workspaceOf(id).state.system;

const names = (view: ComposedCrossModelView): readonly string[] =>
  view.connections.map((c) => c.relation.entry.name);

const descend = (node: SvgNode, pred: (n: SvgNode) => boolean): readonly SvgNode[] => {
  const out: SvgNode[] = [];
  const walk = (n: SvgNode): void => {
    if (pred(n)) out.push(n);
    for (const c of n.children) walk(c);
  };
  walk(node);
  return out;
};

const layer = (view: ComposedCrossModelView, name: string): SvgNode => {
  const found = view.tree.children.find((c) => c.attrs["data-layer"] === name);
  assert.ok(found !== undefined, `the composed tree carries no '${name}' layer`);
  return found;
};

// ----------------------------------------------------------------------------------------------
// 1. The clause itself: drawn FROM the registry, not merely checked against it
// ----------------------------------------------------------------------------------------------

test("every drawn connection IS a registry row, by reference", () => {
  const registered = (r: CrossModelRelation): boolean =>
    r.kind === "binding" ? BINDINGS.includes(r.entry) : COMPOSITIONS.includes(r.entry);

  let drawn = 0;
  for (const [id, panels] of [
    ["transaction-workspace", PAIRED],
    ["message-bus", TWO_STRUCTURAL],
    ["document-processing", [
      { type: "structural-graph" as ModelTypeId, id: "pipeline-performance" },
      { type: "state-machine" as ModelTypeId, id: "document-lifecycle" },
    ]],
    ["worker-queue", [
      { type: "structural-graph" as ModelTypeId, id: "worker-pool" },
      { type: "state-machine" as ModelTypeId, id: "job-lifecycle" },
      { type: "state-machine" as ModelTypeId, id: "job-lease" },
    ]],
  ] as const) {
    const view = compose(id, panels as readonly CrossModelPanelRequest[]);
    for (const c of view.connections) {
      assert.ok(registered(c.relation),
        `${id}: a connection carries an entry that is not a registry object: ${c.relation.entry.name}`);
      drawn += 1;
    }
  }
  assert.ok(drawn >= 10,
    `the corpus must exercise the predicate; only ${drawn} connections were drawn`);

  // The predicate FIRES — a check that can only pass is not a check. A forged row carries every
  // required field, so `tsc` admits it; what it does not carry is the registry's identity.
  const forged: BindingSemantics = {
    ...(BINDINGS[0] as BindingSemantics), name: "not-registered",
  };
  assert.equal(registered({ kind: "binding", entry: forged }), false,
    "a hand-authored binding-shaped object must not satisfy the registry-identity predicate");
});

test("an EMPTY registry draws nothing, from the same system and the same panels", () => {
  // This is the assertion that converts §C's vacuous verdict. The IR is unchanged and witnesses
  // both correspondences; only the registry is gone. A canvas with a second, unregistered edge path
  // would still draw here.
  const live = compose("transaction-workspace", PAIRED);
  assert.ok(live.connections.length >= 2, "the live canvas must draw something to be a control");

  const empty = compose("transaction-workspace", PAIRED, {
    bindings: [], compositions: [], constructs: SCENE_CONSTRUCTS,
  });
  assert.deepEqual(empty.connections, [],
    "with no registry row there is nothing to draw, so a line here is a second edge source");
  assert.deepEqual(empty.undrawn, [], "an empty registry has no rows to report as undrawn either");
  assert.equal(empty.panels.length, 2, "the PANELS still render; only the connections are gone");
  assert.equal(descend(empty.tree, (n) => n.attrs["data-xmodel"] !== undefined).length, 0,
    "and nothing cross-model reaches the picture");
});

test("removing one row removes exactly that row's lines", () => {
  const all = compose("transaction-workspace", PAIRED);
  assert.ok(names(all).includes("machine-of-entity") && names(all).includes("state-of-entity"),
    "the fixture must draw both bindings for the subtraction to mean anything");

  const without = compose("transaction-workspace", PAIRED, {
    ...KERNEL_CROSS_MODEL_REGISTRY,
    bindings: BINDINGS.filter((b) => b.name !== "machine-of-entity"),
  });
  assert.equal(names(without).includes("machine-of-entity"), false,
    "the removed row's connections are gone");
  assert.deepEqual(
    names(without), names(all).filter((n) => n !== "machine-of-entity"),
    "and every OTHER row's connections are untouched — a shared edge path would change both",
  );
  assert.equal(
    without.undrawn.some((u) => u.relation.entry.name === "machine-of-entity"), false,
    "a row that is not in the registry is not reported as undrawn: it is not a row",
  );
});

test("the default registry is the kernel's own declarations", () => {
  assert.equal(KERNEL_CROSS_MODEL_REGISTRY.bindings, BINDINGS);
  assert.equal(KERNEL_CROSS_MODEL_REGISTRY.compositions, COMPOSITIONS);
  assert.equal(KERNEL_CROSS_MODEL_REGISTRY.constructs, SCENE_CONSTRUCTS);

  // `Workspace.composeCrossModelView` passes no registry, so the default is what production uses.
  // Asserting the identity rather than the behaviour, because the behaviour is what every other
  // test here measures and this is the one claim about which VALUE is in force.
  const viaFacade = compose("transaction-workspace", PAIRED);
  const viaDefault = compose("transaction-workspace", PAIRED, KERNEL_CROSS_MODEL_REGISTRY);
  assert.equal(viaFacade.svg, viaDefault.svg);
});

test("no production call site supplies its own registry", () => {
  // The registry parameter is the seam the two substitution tests above need. It is also a hole, so
  // the hole is held shut where it would otherwise open: a `src/` caller passing a fourth argument
  // would be an unregistered-edge path with a registry-shaped alibi. Byte-level, following
  // `test/worker.test.ts`'s assertion over the analysis worker's own source.
  const sources = execFileSync("git", ["ls-files", "--", "src/*.ts", "src/**/*.ts"],
    { encoding: "utf8" }).split("\n").filter((p) => p.endsWith(".ts"));
  assert.ok(sources.length > 50, `expected the whole src tree, got ${sources.length}`);

  const importers: string[] = [];
  for (const rel of sources) {
    const text = readFileSync(rel, "utf8");
    if (rel.endsWith("src/app/cross-model.ts")) continue;
    if (/from "\.\/cross-model\.ts"|from "\.\.\/app\/cross-model\.ts"/.test(text)) importers.push(rel);
    assert.ok(
      !/composeCrossModelView\s*\([^)]*KERNEL_CROSS_MODEL_REGISTRY/s.test(text),
      `${rel} names the registry at a call site; the default is the only production value`,
    );
  }
  assert.deepEqual(importers, ["src/app/services.ts"],
    "only the facade reaches the composer, so there is no second route to a cross-model line");

  // And the composer itself imports nothing that could supply an edge. The allowlist is the set of
  // modules `models/workbench-components.mage.yaml` already licenses `app-services` to reach.
  const composer = readFileSync("src/app/cross-model.ts", "utf8");
  const specifiers = [...composer.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(specifiers)].sort(), [
    "../engine/model-types.ts", "../ir/hash.ts", "../ir/types.ts", "../render/index.ts",
  ], "an import outside this set is a second place a connection could come from");
});

// ----------------------------------------------------------------------------------------------
// 2. Totality — every registered row is accounted for
// ----------------------------------------------------------------------------------------------

test("every registry row is either drawn or undrawn with a reason, never both and never neither", () => {
  const rows = [...BINDINGS, ...COMPOSITIONS];
  for (const [id, panels] of [
    ["transaction-workspace", PAIRED], ["message-bus", TWO_STRUCTURAL],
  ] as const) {
    const view = compose(id, panels as readonly CrossModelPanelRequest[]);
    const drawn = new Set(view.connections.map((c) => c.relation.entry));
    const undrawn = new Set(view.undrawn.map((u) => u.relation.entry));
    for (const row of rows) {
      const inDrawn = drawn.has(row);
      const inUndrawn = undrawn.has(row);
      assert.ok(inDrawn !== inUndrawn,
        `${id}: ${row.name} is ${inDrawn && inUndrawn ? "in both" : "in neither"} partition`);
    }
    assert.equal(drawn.size + undrawn.size, rows.length,
      `${id}: the partition covers ${drawn.size + undrawn.size} rows, the registry has ${rows.length}`);
  }
});

test("an undrawn reason is never a placeholder, and names the registry's own fields", () => {
  const view = compose("transaction-workspace", PAIRED);
  assert.ok(view.undrawn.length > 0, "the fixture must leave something undrawn");
  for (const u of view.undrawn) {
    const why = notDrawnProse(u.reason);
    assert.ok(why.length > 40, `${u.relation.entry.name}: the reason is too short to be one — ${why}`);
    assert.equal(/\b(TODO|TBD|FIXME|placeholder|not implemented)\b/i.test(why), false,
      `${u.relation.entry.name}: the reason is a placeholder — ${why}`);
  }
});

// ----------------------------------------------------------------------------------------------
// 3. Readability — a new binding over a new noun pair goes red here
// ----------------------------------------------------------------------------------------------

test("every registered binding's correspondence has an anchor rule and a witness rule", () => {
  // The obligation that keeps the canvas honest as the registry grows. A binding whose nouns reach
  // neither table draws nothing and reports `no-anchor-rule`, which is a finding about the canvas
  // rather than about the system — so it is a RED GATE here, not a quiet absence on a page.
  const system = systemOf("transaction-workspace");
  for (const b of BINDINGS) {
    const c: Correspondence = b.correspondence;
    assert.notEqual(ANCHOR_BY_NOUN[c.source], null,
      `${b.name}: nothing on a panel anchors a '${c.source}'`);
    assert.notEqual(ANCHOR_BY_NOUN[c.target], null,
      `${b.name}: nothing on a panel anchors a '${c.target}'`);
    assert.equal(witnessOf(system, c).kind, "witnessed",
      `${b.name}: the canvas has no rule for reading ${c.source} → ${c.target} out of the IR`);
  }
});

test("a correspondence with no rule is reported as such rather than drawn", () => {
  // The negative control for the assertion above: a noun pair the tables do not answer must come
  // back `no-rule`, so the obligation can actually fail.
  const system = systemOf("transaction-workspace");
  assert.equal(witnessOf(system, { source: "transition", target: "quantity" }).kind, "no-rule");
  assert.equal(ANCHOR_BY_NOUN["quantity"], null);
});

test("a witness reads the kernel's spelling, and carries the machine a state reference names", () => {
  // `state-of-entity`'s value is authored either bare (`parsing`) or qualified
  // (`transaction-lifecycle.proposed`). The qualifier is carried rather than dropped, because a
  // bare state name can be ambiguous across machines and a wrong guess draws the line to the wrong
  // lifecycle. Both spellings ship, in two different examples, which is why both are pinned.
  const qualified = witnessOf(systemOf("transaction-workspace"), { source: "entity", target: "state" });
  assert.equal(qualified.kind, "witnessed");
  assert.ok(qualified.kind === "witnessed");
  assert.deepEqual(
    qualified.pairs.filter((p) => p.source === "validator"),
    [{ source: "validator", target: "proposed", targetSubject: "transaction-lifecycle" }],
  );

  const bare = witnessOf(systemOf("document-processing"), { source: "entity", target: "state" });
  assert.ok(bare.kind === "witnessed");
  assert.deepEqual(
    bare.pairs.filter((p) => p.source === "parser"),
    [{ source: "parser", target: "parsing", targetSubject: null }],
  );
});

test("a correspondence the registry declares is drawn for EVERY pair the IR witnesses", () => {
  // One line per registry ROW would be a lie by omission: Worker Queue declares two machines of the
  // one `job` entity, and Document Processing charges four entities to lifecycle states. A canvas
  // showing one of them tells a reader there is one.
  const wq = compose("worker-queue", [
    { type: "structural-graph", id: "worker-pool" },
    { type: "state-machine", id: "job-lifecycle" },
    { type: "state-machine", id: "job-lease" },
  ]);
  const machineOf = wq.connections.filter((c) => c.relation.entry.name === "machine-of-entity");
  assert.deepEqual(
    machineOf.map((c) => c.from.id).sort(), ["job-lease", "job-lifecycle"],
    "both machines of the one entity are drawn",
  );

  const dp = compose("document-processing", [
    { type: "structural-graph", id: "pipeline-performance" },
    { type: "state-machine", id: "document-lifecycle" },
  ]);
  const stateOf = dp.connections.filter((c) => c.relation.entry.name === "state-of-entity");
  assert.deepEqual(
    stateOf.map((c) => `${c.from.id}->${c.to.id}`).sort(),
    ["model-gateway->remediating", "parser->parsing", "remediation->remediating", "validator->validating"],
    "every entity charged to a lifecycle state is drawn to the state it names",
  );
});

test("a symmetric row draws one line per correspondent, not one per orientation", () => {
  const view = compose("message-bus", TWO_STRUCTURAL);
  const appears = view.connections.filter((c) => c.relation.entry.name === "appears-in");
  assert.ok(appears.length > 0, "two structural models sharing entities must draw `appears-in`");
  const elements = appears.map((c) => c.from.id);
  assert.deepEqual([...new Set(elements)].length, elements.length,
    "one line per shared entity: `appears-in` is symmetric, so both orientations are one fact");
  for (const c of appears) {
    assert.equal(c.from.anchor, "element", "the entity end anchors on the box");
    assert.equal(c.to.anchor, "panel", "the model end anchors on the panel, which IS the model");
  }
});

// ----------------------------------------------------------------------------------------------
// 4. The label is a lookup
// ----------------------------------------------------------------------------------------------

test("the label comes from WHICH registry the entry came out of", () => {
  // §23.2: *"do not teach students that every line between two models is a join."* The rule holds
  // here because the two verbs are an exhaustive switch over the two arms, so a row cannot be
  // labelled with the other kind's word and there is no label field anywhere to mis-write.
  for (const entry of BINDINGS) {
    assert.equal(connectionLabel({ kind: "binding", entry }), `bound by: ${entry.name}`);
  }
  for (const entry of COMPOSITIONS) {
    assert.equal(connectionLabel({ kind: "composition", entry }), `composed by: ${entry.name}`);
  }
  assert.equal(connectionLabel({ kind: "binding", entry: BINDINGS[1] as BindingSemantics }),
    "bound by: machine-of-entity", "§23.2's own example, spelled by the derivation");
});

test("no cross-model text in the picture is anything but a derived label", () => {
  const view = compose("document-processing", [
    { type: "structural-graph", id: "pipeline-performance" },
    { type: "state-machine", id: "document-lifecycle" },
  ]);
  const admitted = new Set([
    ...BINDINGS.map((b) => `bound by: ${b.name}`),
    ...COMPOSITIONS.map((c) => `composed by: ${c.name}`),
  ]);
  const texts = descend(layer(view, "cross-model-labels"), (n) => n.tag === "text")
    .map((n) => (n.text ?? "").replace(/ \(\d+\)$/, ""));
  assert.ok(texts.length > 0, "the canvas must label its connections");
  for (const t of texts) {
    assert.ok(admitted.has(t), `the picture carries a cross-model label nobody registered: '${t}'`);
  }
  // The count suffix is the one thing the painter adds, and it is derived from the bundle size —
  // so a reader is never told "one correspondence" where the model declares four.
  const bundled = descend(layer(view, "cross-model-labels"), (n) => n.tag === "text")
    .map((n) => n.text ?? "");
  assert.ok(bundled.some((t) => /\(4\)$/.test(t)),
    `four state-of-entity lines must be labelled once with their count — got ${bundled.join(" | ")}`);
});

// ----------------------------------------------------------------------------------------------
// 5. Model boundaries are retained
// ----------------------------------------------------------------------------------------------

test("each panel keeps its own boundary, and its own picture UNCHANGED", () => {
  const ws = workspaceOf("transaction-workspace");
  const view = ws.composeCrossModelView({ panels: PAIRED });
  const groups = layer(view, "panels").children;
  assert.equal(groups.length, 2, "one group per panel, and no third");

  for (const panel of view.panels) {
    const group = groups.find((g) => g.attrs["data-panel"] === panel.key);
    assert.ok(group !== undefined, `no group for panel ${panel.key}`);
    assert.equal(group.attrs["data-panel-type"], panel.type.id);
    assert.equal(group.attrs["data-subject-id"], panel.subject.id);

    // The frame and the type band: §23.3's `-------- STRUCTURE --------` box, which is what keeps
    // the two reductions visibly distinct.
    assert.ok(descend(group, (n) => n.attrs["class"] === "mage-panel-frame").length === 1,
      `${panel.key}: a panel without a frame is a flattened panel`);
    assert.ok(descend(group, (n) => n.text === panel.type.label.toUpperCase()).length === 1,
      `${panel.key}: the panel must say which purposeful reduction it is`);

    // The panel's own layers, byte-identical to what `renderView` produced on its own. This is the
    // structural form of "each side is rendered by its own model-type renderer": nothing here
    // re-lays-out, re-routes or re-labels a panel's contents.
    const solo = ws.renderView({ subject: panel.subject });
    const soloLayers = solo.tree.children.filter((c) => typeof c.attrs["data-layer"] === "string");
    const content = descend(group, (n) => n.attrs["data-layer"] === "panel-content")[0];
    assert.ok(content !== undefined, `${panel.key}: no panel-content group`);
    assert.deepEqual(content.children, soloLayers,
      `${panel.key}: the composition altered the panel's own picture`);
  }
});

test("no panel group contains a cross-model line, and no panel's edges reach another panel", () => {
  const view = compose("transaction-workspace", PAIRED);
  for (const group of layer(view, "panels").children) {
    assert.equal(descend(group, (n) => n.attrs["data-xmodel"] !== undefined).length, 0,
      "a cross-model line inside a panel group would be a flattening");
  }
  // Every cross-model line names two DIFFERENT panels. A line with one panel on both ends would be
  // an edge the per-type renderer already owns.
  for (const c of view.connections) {
    assert.notEqual(c.from.panel, c.to.panel,
      `${c.relation.entry.name}: a cross-model connection must run between two models`);
  }
});

test("panel frames do not overlap", () => {
  const view = compose("worker-queue", [
    { type: "structural-graph", id: "worker-pool" },
    { type: "state-machine", id: "job-lifecycle" },
    { type: "state-machine", id: "job-lease" },
  ]);
  const frames = view.panels.map((p) => p.frame);
  for (let i = 0; i < frames.length; i += 1) {
    for (let j = i + 1; j < frames.length; j += 1) {
      const a = frames[i] as (typeof frames)[number];
      const b = frames[j] as (typeof frames)[number];
      const clear = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      assert.ok(clear, `frames ${i} and ${j} overlap, so one boundary sits inside the other`);
    }
  }
});

test("the renderer's defs are panel-independent, which is what makes lifting one of them sound", () => {
  // Marker ids are document-global, so the composed canvas lifts ONE panel's `<defs>` rather than
  // carrying N copies that would each define `mage-arrow`. That is sound only while `defs()` takes
  // no argument; a renderer that made it panel-dependent breaks this composition, and should break
  // here rather than in a browser.
  const ws = workspaceOf("transaction-workspace");
  const trees = PAIRED.map((p) => ws.renderView({
    subject: p.type === "structural-graph"
      ? { kind: "model", id: p.id } : { kind: "machine", id: p.id },
  }).tree);
  const defs = trees.map((t) => t.children.find((c) => c.tag === "defs"));
  assert.ok(defs[0] !== undefined && defs[1] !== undefined, "both panels carry a defs block");
  assert.deepEqual(defs[0], defs[1], "two panels' defs blocks differ, so lifting one loses markers");

  const view = compose("transaction-workspace", PAIRED);
  const canvasDefs = view.tree.children.filter((c) => c.tag === "defs");
  assert.equal(canvasDefs.length, 2,
    "exactly two: the renderer's lifted block and the cross-model layer's own style");
  assert.deepEqual(canvasDefs[0], defs[0], "the lifted block is the renderer's own, unmodified");
});

// ----------------------------------------------------------------------------------------------
// 6. The twin — FR-A11Y-2
// ----------------------------------------------------------------------------------------------

test("the composed view's shape admits no picture without its reading", () => {
  // The same pin `test/render-accessible.test.ts` puts on `RenderedView`, one layer out: adding a
  // visual output without a semantic one would have to change this line.
  const view = compose("transaction-workspace", PAIRED);
  assert.deepEqual(Object.keys(view).sort(),
    ["accessible", "connections", "panels", "refusals", "svg", "tree", "undrawn"]);
  assert.deepEqual(Object.keys(view.accessible).sort(),
    ["connections", "panels", "refusals", "summary", "systemHash", "title", "undrawn"]);
  assert.equal(typeof view.svg, "string");
  assert.ok(view.svg.startsWith("<svg"));
  assert.equal(view.accessible.systemHash, view.tree.attrs["data-system-hash"],
    "the reading and the picture must describe one revision");
});

test("every drawn line appears in the twin, in words, with both ends named", () => {
  const view = compose("document-processing", [
    { type: "structural-graph", id: "pipeline-performance" },
    { type: "state-machine", id: "document-lifecycle" },
  ]);
  assert.equal(view.accessible.connections.length, view.connections.length);
  for (const [i, c] of view.connections.entries()) {
    const twin = view.accessible.connections[i];
    assert.ok(twin !== undefined);
    assert.equal(twin.label, connectionLabel(c.relation));
    assert.equal(twin.kind, c.relation.kind);
    assert.equal(twin.name, c.relation.entry.name);
    // The registry's own sentence, quoted rather than paraphrased: a reader who cannot see the
    // picture gets what the correspondence MEANS, not a description of a line.
    assert.equal(twin.interpretation, c.relation.entry.interpretation);
    assert.ok(twin.from.label.length > 0 && twin.to.label.length > 0,
      "position and line style are never the only carriers (FR-A11Y-2)");
  }
  // Each panel's own twin travels with it, unchanged. The composition adds a reading; it replaces
  // none, so nothing a panel stated about its own evidence or outcome is lost on the way out.
  assert.equal(view.accessible.panels.length, view.panels.length);
  for (const [i, p] of view.panels.entries()) {
    assert.equal(view.accessible.panels[i]?.scene, p.view.accessible);
  }
});

test("the twin states what is NOT drawn, and why", () => {
  const view = compose("transaction-workspace", [...PAIRED,
    { type: "quantitative-model", id: "peak-memory" }]);
  assert.equal(view.accessible.undrawn.length, view.undrawn.length);
  const composed = view.accessible.undrawn.find((u) => u.label.startsWith("composed by:"));
  assert.ok(composed !== undefined,
    "the one registered COMPOSITION must be reported, labelled with its own verb");
  assert.ok(composed.why.includes("not an addressable construct"),
    `the reason must be the construct table's own: ${composed.why}`);
  assert.deepEqual(view.accessible.refusals, view.refusals.map(refusalProse));
  assert.ok((view.accessible.refusals[0] ?? "").includes("no picture of its own"));
});

test("the canvas summary says the panels are separate reductions, not one diagram", () => {
  const view = compose("transaction-workspace", PAIRED);
  assert.ok(view.accessible.summary.includes("each in its own boundary"));
  assert.ok(view.accessible.summary.includes("never a generic graph edge"),
    "§23.3's point: the connecting edge is not a generic graph edge");
  for (const p of view.panels) assert.ok(view.accessible.summary.includes(p.type.label));
});

// ----------------------------------------------------------------------------------------------
// 7. Refusals — a panel that cannot be drawn says so
// ----------------------------------------------------------------------------------------------

test("a type with no scene construct refuses rather than borrowing another type's reduction", () => {
  const view = compose("document-processing", [
    { type: "structural-graph", id: "pipeline-performance" },
    { type: "quantitative-model", id: "peak-memory" },
  ]);
  assert.equal(view.panels.length, 1, "the quantitative panel is not drawn");
  assert.equal(view.refusals.length, 1);
  assert.equal(view.refusals[0]?.kind, "type-has-no-scene");
  // §22.3 and §22.4 forbid exactly the alternative: routing the type to the structural extractor
  // over a heuristically chosen host, which is `renderAnythingAsGraph()` with better manners.
  assert.ok(refusalProse(view.refusals[0]).includes("has no picture of its own"));
});

test("an undeclared subject states the absence rather than drawing an empty picture", () => {
  // §D-5: `buildGraphScene` accepts a subject the system does not have and titles an empty picture
  // with the bare id. The composer refuses instead, which puts the check where the design's own
  // standard puts it — by construction, not by discipline at three call sites.
  const view = compose("transaction-workspace", [
    { type: "structural-graph", id: "change-pipeline" },
    { type: "state-machine", id: "no-such-machine" },
  ]);
  assert.equal(view.panels.length, 1);
  assert.equal(view.refusals[0]?.kind, "subject-not-declared");
  assert.ok(refusalProse(view.refusals[0]).includes("no-such-machine"));
  assert.deepEqual(view.connections, [], "nothing is drawn to a panel that does not exist");
});

// ----------------------------------------------------------------------------------------------
// 8. The Behavior → Quantity composition: registered, declared-undrawable, and ready
// ----------------------------------------------------------------------------------------------

test("the composition is registered and reported, with the construct table's reason", () => {
  const view = compose("document-processing", [
    { type: "structural-graph", id: "pipeline-performance" },
    { type: "state-machine", id: "document-lifecycle" },
  ]);
  const row = view.undrawn.find((u) => u.relation.kind === "composition");
  assert.ok(row !== undefined, "the one COMPOSITIONS row must be classified");
  assert.equal(row.relation.entry.name, "executions-selected-by-behaviour");
  assert.equal(row.reason.kind, "domain-has-no-scene");
  assert.ok(row.reason.kind === "domain-has-no-scene");
  assert.equal(row.reason.why, (SCENE_CONSTRUCTS["quantitative-model"] as
    { readonly kind: "none"; readonly why: string }).why,
    "the reason is the table's, so it cannot drift from the declaration it reports");
});

test("the composition becomes presentable the day the quantitative type gains a scene", () => {
  // §F's sequencing, pinned. The one edit that unblocks the Behavior → Quantity drawing is in
  // `SCENE_CONSTRUCTS`, and this substitutes it: the reason moves off "this type has no picture"
  // and onto the X2 asymmetry that remains — a composition is declared against the query AST, so
  // no pair of model panels witnesses one. Nothing else about the canvas has to change.
  const constructs: Readonly<Record<ModelTypeId, SceneConstruct>> = {
    ...SCENE_CONSTRUCTS,
    "quantitative-model": { kind: "scene", subject: "model" },
  };
  const view = compose("document-processing", [
    { type: "structural-graph", id: "pipeline-performance" },
    { type: "state-machine", id: "document-lifecycle" },
    { type: "quantitative-model", id: "pipeline-performance" },
  ], { ...KERNEL_CROSS_MODEL_REGISTRY, constructs });

  const row = view.undrawn.find((u) => u.relation.kind === "composition");
  assert.ok(row !== undefined);
  assert.equal(row.reason.kind, "not-witnessable-by-a-model");
  assert.ok(row.reason.kind === "not-witnessable-by-a-model");
  assert.equal(row.reason.declaredBy, row.relation.entry.declaredBy,
    "the reason carries the registry's own citation of where the composition is declared");
  assert.ok(notDrawnProse(row.reason).includes("src/engine/types.ts"));
});

// ----------------------------------------------------------------------------------------------
// 9. Determinism
// ----------------------------------------------------------------------------------------------

test("composing twice is byte-identical", () => {
  const a = compose("worker-queue", [
    { type: "structural-graph", id: "worker-pool" },
    { type: "state-machine", id: "job-lifecycle" },
    { type: "state-machine", id: "job-lease" },
  ]);
  const b = compose("worker-queue", [
    { type: "structural-graph", id: "worker-pool" },
    { type: "state-machine", id: "job-lifecycle" },
    { type: "state-machine", id: "job-lease" },
  ]);
  assert.equal(a.svg, b.svg);
  assert.deepEqual(names(a), names(b));
});

test("an empty panel set composes to a canvas that says so", () => {
  const view = compose("transaction-workspace", []);
  assert.deepEqual(view.panels, []);
  assert.deepEqual(view.connections, []);
  assert.equal(view.accessible.title, "No purposeful model is presented");
  assert.equal(view.undrawn.length, BINDINGS.length + COMPOSITIONS.length,
    "every row is reported, because none of them has a panel to run between");
});
