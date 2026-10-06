// The composed property view — composition made perceptible, in the registry's own words.
//
// §23's ruling: whenever a property depends on more than one model, the Workbench must expose the
// composition that licenses the inference, in part via a visual. The canonical case is the Worker
// Queue's `lease-held-while-processing` — the lifecycle model supplies `processing`, the lease
// model supplies `free`, and neither alone can state the property.
//
// What this file holds, and the one mandate behind all of it: **the engine already has a
// composition semantics — the `BINDINGS` registry — and the composed view must not invent a second
// one.** So the tests below pin three things:
//
//   1. **Derivation.** Which properties are cross-model is decided by the statement's OWN
//      vocabulary (`constraintSpan`), the panels come from that span, and the correspondence lines
//      are `composeCrossModelView`'s — the registry's rows and nothing else.
//   2. **Quotation.** Every sentence the binding reading shows is the registry's own field,
//      verbatim: `interpretation`, `licensing.why`, `witness.why`, `declaredBy.role`. A reading
//      authored anywhere else could drift from what the registry asserts.
//   3. **The constraint is not a binding.** The property's own predicate is drawn in its own layer
//      with the engine's own `describePredicate` sentence, and nothing about it claims a
//      correspondence — `bound by:` never appears on it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BINDINGS } from "../src/engine/model-types.ts";
import {
  bindingWords, derivedComposedViews, modelCompositionGraph, witnessOf,
  type ComposedPropertyView, type CrossModelRelation,
} from "../src/app/cross-model.ts";
import { constraintSpan } from "../src/app/properties.ts";
import { navRails } from "../src/ui/shell/nav.ts";
import { buildViewModel } from "../src/ui/view-model.ts";
import type { SvgNode } from "../src/render/index.ts";
import { loadExample } from "../scripts/gen-example-coverage.ts";
import type { Workspace } from "../src/app/services.ts";

const workspaceOf = (id: string): Workspace => loadExample(id).workspace;

const descend = (node: SvgNode, pred: (n: SvgNode) => boolean): readonly SvgNode[] => {
  const out: SvgNode[] = [];
  const walk = (n: SvgNode): void => {
    if (pred(n)) out.push(n);
    for (const c of n.children) walk(c);
  };
  walk(node);
  return out;
};

const LEASE = "lease-held-while-processing";

const composedLease = (): ComposedPropertyView => {
  const view = workspaceOf("worker-queue").composePropertyView(LEASE);
  assert.ok(view !== null, `${LEASE} is the canonical cross-model property and must compose`);
  return view;
};

// ----------------------------------------------------------------------------------------------
// 1. Derivation — what is cross-model, and what the panels are
// ----------------------------------------------------------------------------------------------

test("the span is the statement's own vocabulary: the lease invariant crosses, a reach does not", () => {
  const system = workspaceOf("worker-queue").state.system;
  const raw = (id: string): unknown => system.queries.get(id)?.raw;

  const lease = constraintSpan(system, raw(LEASE));
  assert.deepEqual(lease.machines, ["job-lifecycle", "job-lease"],
    "the invariant names both machines' state spaces — that is what makes it cross-model");
  assert.deepEqual(
    lease.sites.filter((s) => s.state !== null).map((s) => `${s.machine}.${s.state}`),
    ["job-lifecycle.processing", "job-lease.free"],
    "the two control states the constraint names, resolved against each machine's own states");
  assert.equal(lease.form, "invariant");
  assert.ok(lease.prose !== null && lease.prose.includes("job-lifecycle.state is processing")
    && lease.prose.includes("job-lease.state is free"),
    `the prose is describePredicate's own sentence, got: ${lease.prose}`);

  const reach = constraintSpan(system, raw("completed-is-reachable"));
  assert.deepEqual(reach.machines, ["job-lifecycle"],
    "a single-machine reach question spans one machine and gets the ordinary one-model view");
});

test("the composed lease view: machines flank the model that carries the shared entity", () => {
  const view = composedLease();
  assert.deepEqual(
    view.base.panels.map((p) => p.key),
    ["machine:job-lifecycle", "model:worker-pool", "machine:job-lease"],
    "the binding's element sits BETWEEN the machines it corresponds — the middle is the join");

  // The lines are the registry's own `machine-of-entity`, one per machine, both landing on the
  // `job` element in the worker-pool panel. No other producer: the connections are the base
  // canvas's, which test/cross-model.test.ts holds is drawn from the registry alone.
  const names = view.base.connections.map((c) => c.relation.entry.name);
  assert.deepEqual([...new Set(names)], ["machine-of-entity"]);
  const ends = view.base.connections.map((c) => `${c.from.panel}->${c.to.panel}/${c.to.id}`).sort();
  assert.deepEqual(ends, [
    "machine:job-lease->model:worker-pool/job",
    "machine:job-lifecycle->model:worker-pool/job",
  ], "both machines bind to the ONE job element — shared identity, drawn as convergence");
});

test("a property that is not cross-model composes nothing", () => {
  assert.equal(workspaceOf("worker-queue").composePropertyView("completed-is-reachable"), null);
  assert.equal(workspaceOf("worker-queue").composePropertyView("no-such-question"), null);
});

// ----------------------------------------------------------------------------------------------
// 2. The constraint overlay — the property's own words, never a correspondence claim
// ----------------------------------------------------------------------------------------------

test("the constraint is drawn in its own layer, anchored on the two named states", () => {
  const view = composedLease();
  assert.ok(view.constraint.drawn, "both states render, so the constraint must draw");
  if (!view.constraint.drawn) return;
  assert.deepEqual(
    view.constraint.anchors.map((a) => `${a.machine}.${a.state}`),
    ["job-lifecycle.processing", "job-lease.free"]);

  const layer = view.tree.children.find((c) => c.attrs["data-layer"] === "property-constraint");
  assert.ok(layer !== undefined, "the composed tree carries the constraint layer");
  assert.equal(
    view.base.tree.children.some((c) => c.attrs["data-layer"] === "property-constraint"), false,
    "the registry-only base canvas carries no constraint — the layer is the property view's own");

  // The label is the engine's reading of the predicate, and it never claims a correspondence.
  const texts = descend(layer, (n) => n.tag === "text").map((n) => n.text ?? "");
  assert.ok(texts.some((t) => t.startsWith("property requires:")),
    `the constraint says what it is, got: ${texts.join(" | ")}`);
  assert.ok(texts.every((t) => !t.includes("bound by:") && !t.includes("composed by:")),
    "a constraint is an obligation, not a binding, and must never borrow the binding's label");

  // The viewBox grew to hold the arc above the frames — a label outside the box is clipped.
  const viewBox = String(view.tree.attrs["viewBox"]).split(/\s+/).map(Number);
  assert.ok((viewBox[1] as number) < -40,
    `the viewBox must extend above the frames for the constraint arc, got ${view.tree.attrs["viewBox"]}`);
});

test("the twin states the property, the constraint, and the canvas — nothing reaches only the picture", () => {
  const view = composedLease();
  assert.equal(view.accessible.property.id, LEASE);
  assert.equal(view.accessible.constraint.drawn, true);
  assert.equal(view.accessible.constraint.text.startsWith("property requires:"), true);
  assert.deepEqual(view.accessible.constraint.ends,
    [{ machine: "job-lifecycle", state: "processing" }, { machine: "job-lease", state: "free" }]);
  // The canvas twin is the base composition's, unchanged — the overlay adds a reading beside it.
  assert.equal(view.accessible.canvas, view.base.accessible);
});

// ----------------------------------------------------------------------------------------------
// 3. Quotation — the reading is the registry, verbatim
// ----------------------------------------------------------------------------------------------

test("bindingWords quotes the registry's own fields and authors no parallel sentence", () => {
  for (const entry of BINDINGS) {
    const relation: CrossModelRelation = { kind: "binding", entry };
    const words = bindingWords(relation);
    assert.equal(words.name, entry.name);
    assert.equal(words.interpretation, entry.interpretation,
      `${entry.name}: the interpretation is the registry's sentence, verbatim`);
    if (entry.licensing.kind === "by-construction") {
      assert.ok(words.byConstruction);
      assert.ok(words.licensing.includes(entry.licensing.why),
        `${entry.name}: the licensing reading must quote licensing.why verbatim`);
    } else {
      assert.equal(words.byConstruction, false);
      assert.ok(words.licensing.includes(entry.licensing.by.role),
        `${entry.name}: the licensing reading must quote the declaring authority's role`);
      assert.ok(words.licensing.includes(entry.licensing.by.file)
        && words.licensing.includes(entry.licensing.by.symbol),
        `${entry.name}: the reading names where the declaration lives`);
    }
    if (entry.witness.kind === "shared-membership") {
      assert.ok(words.witness.includes(entry.witness.why),
        `${entry.name}: the witness reading must quote witness.why verbatim`);
    } else {
      for (const key of entry.witness.keys) {
        assert.ok(words.witness.includes(`'${key}'`),
          `${entry.name}: the witness reading names the authored key ${key}`);
      }
    }
  }
});

// ----------------------------------------------------------------------------------------------
// 4. The model-composition graph — the Navigate rail's topology, derived
// ----------------------------------------------------------------------------------------------

test("worker-queue's topology: both machines meet Worker Pool on the job entity", () => {
  const edges = modelCompositionGraph(workspaceOf("worker-queue").state.system);
  const readable = edges.map((e) =>
    `${e.a.kind}:${e.a.id} —${e.element}— ${e.b.kind}:${e.b.id} [${e.binding.name}]`).sort();
  assert.deepEqual(readable, [
    "machine:job-lease —job— model:worker-pool [machine-of-entity]",
    "machine:job-lifecycle —job— model:worker-pool [machine-of-entity]",
  ]);
});

test("message-bus's topology: appears-in pairs the structural models that share an entity", () => {
  const system = workspaceOf("message-bus").state.system;
  const edges = modelCompositionGraph(system);
  const appears = edges.filter((e) => e.binding.name === "appears-in");
  assert.ok(appears.length > 0,
    "three structural models sharing entities must produce appears-in meetings");
  for (const e of appears) {
    assert.equal(e.a.kind, "model");
    assert.equal(e.b.kind, "model");
    // The meeting is witnessed: both models' membership carries the element. Same derivation the
    // canvas uses (`witnessOf`), so the rail cannot assert a meeting the canvas would not draw.
    const pairs = witnessOf(system, { source: "entity", target: "model" });
    assert.equal(pairs.kind, "witnessed");
    if (pairs.kind !== "witnessed") continue;
    for (const end of [e.a.id, e.b.id]) {
      assert.ok(pairs.pairs.some((p) => p.source === e.element && p.target === end),
        `${e.element} must appear in ${end}'s membership`);
    }
  }
});

// ----------------------------------------------------------------------------------------------
// 5. The rails — the cross-model claim composes, and the topology reaches the reading
// ----------------------------------------------------------------------------------------------

test("the rail reads a cross-model claim as composing and lists where models meet", () => {
  const ws = workspaceOf("worker-queue");
  const vm = buildViewModel(ws.state.system, ws.state.findings, ws.properties(), {
    hypothesis: null, selection: [],
  });
  const rails = navRails(
    vm, ws.state.system, null, modelCompositionGraph(ws.state.system));

  const lease = rails.properties.find((p) => p.id === LEASE);
  assert.ok(lease !== undefined);
  assert.equal(lease.composes, LEASE,
    "the lease invariant crosses models, so its rail row opens the composed view");
  const reach = rails.properties.find((p) => p.id === "completed-is-reachable");
  assert.ok(reach !== undefined);
  assert.equal(reach.composes, null, "a one-machine claim keeps the explain navigation");

  assert.deepEqual(rails.meetings.map((m) => m.value),
    ["job|machine-of-entity", "job|machine-of-entity"],
    "each meeting opens the job element's composed view with the binding's reading first");
  for (const m of rails.meetings) {
    assert.ok(m.text.includes("job"), "the meeting names the shared element");
    assert.ok(m.label.startsWith("bound by:"), "§23.2's kind line, from the registry's own name");
  }
});

// ----------------------------------------------------------------------------------------------
// 6. The derived composed views — what the model already encodes, offered as views
// ----------------------------------------------------------------------------------------------

test("worker-queue encodes exactly one composed view: bound on job, machines flanking the pool", () => {
  const derived = derivedComposedViews(workspaceOf("worker-queue").state.system);
  assert.equal(derived.length, 1,
    "one shared element, so one derived composed view — the lab's own");
  const view = derived[0];
  assert.ok(view !== undefined);
  assert.deepEqual(view.elements, ["job"]);
  // The machines flank the carrier model (the IR's machine order is canonical-alphabetical, so
  // job-lease leads); the invariant under test is the SHAPE — the shared element's model in the
  // middle — not which machine is on the left.
  assert.deepEqual(view.subjects.map((s) => `${s.kind}:${s.id}`),
    ["machine:job-lease", "model:worker-pool", "machine:job-lifecycle"]);
  assert.deepEqual(view.bindings.map((b) => b.name), ["machine-of-entity"]);
});

test("a derived composed view exists only where the bindings license one", () => {
  for (const id of ["message-bus", "autonomous-delivery"]) {
    const system = workspaceOf(id).state.system;
    const derived = derivedComposedViews(system);
    const edges = modelCompositionGraph(system);
    for (const d of derived) {
      assert.ok(d.subjects.length >= 2, `${id}/${d.elements[0]}: a composed view composes`);
      for (const element of d.elements) {
        assert.ok(edges.some((e) => e.element === element),
          `${id}/${element}: every derived view is backed by a registered meeting`);
      }
    }
    for (const e of edges) {
      assert.ok(derived.some((d) => d.elements.includes(e.element)),
        `${id}: the meeting on ${e.element} must be offered as a composed view`);
    }
    // One view per SUBJECT SET: two choices rendering one picture is over-offering.
    const sets = derived.map((d) => d.subjects.map((s) => `${s.kind}:${s.id}`).sort().join("~"));
    assert.equal(new Set(sets).size, sets.length,
      `${id}: two derived views over one subject set must merge`);
  }
});
