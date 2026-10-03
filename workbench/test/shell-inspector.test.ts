// The inspector's reading of a selection.
//
// `inspectSelection` is a pure function from the authoritative system plus the selection to a typed
// structure, which is what lets these run in `node:test` with no browser — the arrangement the view
// model exists for, and the one that makes FR-A11Y-2 checkable at all: every semantic line is TEXT
// in a typed value before any element exists, so a test asserts the product rather than a
// stylesheet.
//
// **The oracle is the model, never a transcript of what the pane happens to say today.** Correction
// 3 moved the entity and relation semantics out of two global tables and into this pane, so the
// claim under test is a COVERAGE claim: everything those tables stated is still reachable by
// selecting the thing it concerns. Each test therefore derives its expectation from the
// `CanonicalSystem` (or, for the composition sentence, from the licensing predicate and refusal
// constructor the SPARQL seam itself calls) and compares. A pinned sentence would pass while the
// model moved underneath it, which is exactly the failure the absence/composition lines exist to
// prevent in the product.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import type { CanonRelation, CanonicalSystem } from "../src/ir/types.ts";
import { SHIPPED_EXAMPLE_IDS } from "../src/app/examples.ts";
import { modelsDeclaring } from "../src/engine/graph.ts";
import { licensesTraversal } from "../src/sparql/licensing.ts";
import { unlicensedByModel } from "../src/sparql/refusal.ts";
import { CAVEAT, relationValue } from "../src/ui/view-model.ts";
import { inspectSelection } from "../src/ui/shell/inspector.ts";
import type { Inspection, InspectorBlock, InspectorView } from "../src/ui/shell/inspector.ts";

const load = (path: string): CanonicalSystem => canonicalize(parse(readFileSync(path, "utf8")));

/** The example whose whole lesson is that relations have semantics. */
const messageBus = (): CanonicalSystem => load("examples/message-bus/system.mage.yaml");

/** Every shipped system, from the id list the application owns rather than a list typed here. */
const everySystem = (): readonly CanonicalSystem[] =>
  SHIPPED_EXAMPLE_IDS.map((id) => load(`examples/${id}/system.mage.yaml`));

const relationSelection = (r: CanonRelation): string =>
  relationValue(r.id !== null
    ? { kind: "id", model: r.model, id: r.id }
    : { kind: "ends", model: r.model, from: r.from, to: r.to, type: r.type });

function object(view: InspectorView): Inspection {
  assert.equal(view.state, "object", `expected an inspection, got ${view.state}`);
  // Narrowed by the assertion above; re-checked here because `assert.equal` is not a type guard.
  if (view.state !== "object") throw new Error("unreachable");
  return view.inspection;
}

const blockNamed = (i: Inspection, label: string): InspectorBlock => {
  const found = i.blocks.find((b) => b.label === label);
  assert.ok(found, `the inspection has no '${label}' block — it has ${i.blocks.map((b) => b.label).join(", ")}`);
  return found;
};

const textOf = (b: InspectorBlock): string =>
  b.lines.length > 0 ? b.lines.map((l) => l.text).join("\n") : (b.empty ?? "");

// --------------------------------------------------------------------------------------------
// The three states
// --------------------------------------------------------------------------------------------

test("nothing selected reads as nothing selected, and says what selecting does", () => {
  const view = inspectSelection(messageBus(), []);
  assert.equal(view.state, "empty");
  if (view.state !== "empty") throw new Error("unreachable");
  // The empty pane is the one place the pane explains itself. Blank would read as a broken region.
  assert.match(view.message, /select/i);
});

test("a selection the system does not declare reads as unresolved, not as empty", () => {
  // SH-I5's user-visible half, and the reason it is its own state. A transaction can delete the
  // selected element and an agent can `view.select` a misspelling; reporting either as "nothing is
  // selected" describes the PANE instead of the model, which is the collapsed-absence defect the
  // evidence ruling spent a document on.
  const view = inspectSelection(messageBus(), ["no-such-service"]);
  assert.equal(view.state, "unresolved");
  if (view.state !== "unresolved") throw new Error("unreachable");
  assert.match(view.message, /no-such-service/, "the unresolved name must be quoted back");
});

test("an entity deleted under the selection stops resolving", () => {
  // The same state, reached the way a user reaches it: a name that WAS declared and is not any
  // more. Built by removing the entity from the system rather than by inventing a name, so the test
  // exercises the transition instead of a typo.
  const system = messageBus();
  const victim = [...system.entities.keys()][0];
  assert.ok(victim !== undefined);
  assert.equal(inspectSelection(system, [victim]).state, "object");
  const entities = new Map(system.entities);
  entities.delete(victim);
  assert.equal(inspectSelection({ ...system, entities }, [victim]).state, "unresolved");
});

test("one pane inspects one thing, and names the rest of the selection", () => {
  const system = messageBus();
  const ids = [...system.entities.keys()].slice(0, 3);
  assert.ok(ids.length > 1, "this fixture needs at least two entities for a multi-selection");
  const i = object(inspectSelection(system, ids));
  const first = ids[0] as string;
  assert.ok(i.title.includes(first) || i.title.includes(system.entities.get(first)?.label ?? ""),
    "the first selected object is the one inspected");
  assert.deepEqual([...i.alsoSelected], ids.slice(1),
    "the unshown members of the selection must be named — a silent pane disagrees with view.selection()");
});

// --------------------------------------------------------------------------------------------
// The entity reading
// --------------------------------------------------------------------------------------------

test("an entity's declared type and properties reach the pane as text", () => {
  const system = messageBus();
  // An entity that actually carries a property, chosen by looking rather than by name: the fixture
  // owns which one that is.
  const entity = [...system.entities.values()].find((e) => e.properties.size > 0);
  assert.ok(entity, "this fixture needs an entity with a property");
  const i = object(inspectSelection(system, [entity.id]));
  assert.equal(i.type, entity.type ?? "entity");
  const properties = textOf(blockNamed(i, "Properties"));
  for (const [name, value] of entity.properties) {
    assert.match(properties, new RegExp(name), `property '${name}' is not readable in the pane`);
    assert.ok(properties.includes(String(value.value)),
      `property '${name}' is named without its value '${String(value.value)}'`);
  }
});

test("Appears in lists exactly the models that select the entity, and each one navigates", () => {
  // §8's cross-model navigation, and the entity pane's reason to exist: identity is shared across
  // reductions, so "this service is in all three models" is a fact no single diagram shows.
  const system = messageBus();
  for (const entity of system.entities.values()) {
    const expected = [...system.models.values()].filter((m) => m.entities.includes(entity.id));
    const appears = blockNamed(object(inspectSelection(system, [entity.id])), "Appears in");
    assert.deepEqual(appears.lines.map((l) => l.text), expected.map((m) => m.label),
      `Appears in disagrees with the models declaring ${entity.id}`);
    for (const [n, l] of appears.lines.entries()) {
      assert.deepEqual(l.action, { kind: "target", subject: `model:${(expected[n] as { id: string }).id}` },
        "activating an appearance must make that model the workspace's subject");
    }
  }
});

test("an entity with no model is told so, rather than shown a blank block", () => {
  // The honest-empty case, and it is a FACT about the system: an entity in the namespace that no
  // reduction selects is one nothing says anything about. Built by dropping the models, because the
  // shipped fixtures have none such.
  const system = messageBus();
  const id = [...system.entities.keys()][0];
  assert.ok(id !== undefined);
  const i = object(inspectSelection({ ...system, models: new Map() }, [id]));
  const appears = blockNamed(i, "Appears in");
  assert.equal(appears.lines.length, 0);
  assert.ok((appears.empty ?? "").length > 20, "an empty Appears in must say what the emptiness means");
});

test("every relation naming an entity is listed, and selecting one inspects that relation", () => {
  const system = messageBus();
  for (const entity of system.entities.values()) {
    const expected = system.relations.filter((r) => r.from === entity.id || r.to === entity.id);
    const relations = blockNamed(object(inspectSelection(system, [entity.id])), "Relations");
    assert.equal(relations.lines.length, expected.length,
      `the Relations block for ${entity.id} does not match the relations that name it`);
    for (const [n, l] of relations.lines.entries()) {
      const r = expected[n] as CanonRelation;
      assert.deepEqual(l.action, { kind: "select", selection: relationSelection(r) });
      // The navigation has to land: the value the line carries must resolve back to the relation it
      // was built from, which is the half a hand-written selector would get wrong silently.
      const landed = object(inspectSelection(system, [relationSelection(r)]));
      assert.equal(landed.type, r.type);
    }
  }
});

test("an entity whose relations are empty is not told the two services are unconnected", () => {
  // The careful half of the honest-empty rule. What a MISSING edge asserts is declared per relation
  // type, so a pane that generalised over those declarations would be inventing a semantics the
  // author withheld. The empty sentence points at the declaration instead of concluding.
  const system = messageBus();
  const id = [...system.entities.keys()][0];
  assert.ok(id !== undefined);
  const i = object(inspectSelection({ ...system, relations: [] }, [id]));
  const relations = blockNamed(i, "Relations");
  assert.equal(relations.lines.length, 0);
  assert.match(relations.empty ?? "", /Absence means/,
    "the empty Relations block must send the reader to the per-type absence declaration");
});

// --------------------------------------------------------------------------------------------
// The relation reading — the derived semantics
// --------------------------------------------------------------------------------------------

test("Meaning is the relation type's declared description, not a restatement of it", () => {
  const system = messageBus();
  for (const r of system.relations) {
    const declared = system.relationTypes.get(r.type);
    assert.ok(declared, `the fixture declares relation type '${r.type}'`);
    const meaning = textOf(blockNamed(object(inspectSelection(system, [relationSelection(r)])), "Meaning"));
    assert.equal(meaning, declared.description,
      "Meaning must be the declaration verbatim — a second wording is a second source of truth");
  }
});

test("Absence means is the declared absence, verbatim", () => {
  // The author's sketch asks for "Absence means — No subscription is represented". That sentence is
  // the model's, written by whoever declared the relation type; this asserts the pane quotes it
  // rather than paraphrasing, because a paraphrase is a copy and copies drift.
  const system = messageBus();
  const declaringAbsence = system.relations.filter((r) => system.relationTypes.get(r.type)?.absence != null);
  assert.ok(declaringAbsence.length > 0, "this fixture should declare absence semantics");
  for (const r of declaringAbsence) {
    const absence = system.relationTypes.get(r.type)?.absence;
    const shown = textOf(blockNamed(object(inspectSelection(system, [relationSelection(r)])), "Absence means"));
    assert.equal(shown, absence);
  }
});

test("a relation type that declares no absence meaning is reported as declaring none", () => {
  // The one place the pane writes its own sentence about absence, and it says only that nothing was
  // declared — the `purposeBlock` precedent, where silence and "nothing is stated here" look
  // identical on screen and only one of them is a fact about the model.
  const system = messageBus();
  const r = system.relations[0];
  assert.ok(r !== undefined);
  const declared = system.relationTypes.get(r.type);
  assert.ok(declared);
  const relationTypes = new Map(system.relationTypes);
  relationTypes.set(r.type, { ...declared, absence: null });
  const shown = textOf(blockNamed(
    object(inspectSelection({ ...system, relationTypes }, [relationSelection(r)])), "Absence means"));
  assert.match(shown, /declares no absence meaning/);
  assert.match(shown, /licenses no conclusion/,
    "the sentence must decline to conclude, not conclude that nothing is there");
});

test("Composition for a forbidden type is the seam's own refusal, word for word", () => {
  // V7/V32: two implementations of one licensing rule that disagree are worse than either alone,
  // and prose is where the disagreement hides. So the pane does not word this — it reads the
  // refusal the SPARQL seam would give the same question. The expectation is computed here through
  // the same constructor, so a reworded refusal moves both sides together and a pane that started
  // phrasing its own fails.
  const system = messageBus();
  const forbidden = system.relations.filter((r) => {
    const t = system.relationTypes.get(r.type);
    return t !== undefined && !licensesTraversal(t, "composing");
  });
  assert.ok(forbidden.length > 0, "the message-bus fixture forbids composition on publishes/subscribes");
  for (const r of forbidden) {
    const expected = unlicensedByModel(r.type, modelsDeclaring(system, r.type));
    const shown = blockNamed(object(inspectSelection(system, [relationSelection(r)])), "Composition");
    assert.equal(shown.lines[0]?.text, expected.prose);
    // Never a refusal with no direction: the remedy the seam names rides along.
    assert.ok((shown.lines[1]?.text ?? "").includes(expected.wouldLicense),
      "a refusal must arrive with the change that would license the question");
  }
});

test("Composition for a licensed type says so, and carries no refusal", () => {
  const system = messageBus();
  const allowed = system.relations.filter((r) => {
    const t = system.relationTypes.get(r.type);
    return t !== undefined && licensesTraversal(t, "composing");
  });
  assert.ok(allowed.length > 0, "the message-bus fixture licenses composition on calls/may_propagate_to");
  for (const r of allowed) {
    const shown = textOf(blockNamed(object(inspectSelection(system, [relationSelection(r)])), "Composition"));
    assert.match(shown, /allowed/);
    assert.doesNotMatch(shown, /not licensed/,
      "a licensed composition must not read like the refusal of a forbidden one");
  }
});

test("flipping path composition flips the Composition reading", () => {
  // The derivation under load. Nothing in the pane stores a composition sentence, so editing the
  // declaration is enough to move the reading — which is the property a hand-written line would
  // not have.
  const system = messageBus();
  const r = system.relations.find((x) => system.relationTypes.get(x.type)?.pathComposition === "forbidden");
  assert.ok(r, "the fixture should forbid composition somewhere");
  const declared = system.relationTypes.get(r.type);
  assert.ok(declared);
  const relationTypes = new Map(system.relationTypes);
  relationTypes.set(r.type, { ...declared, pathComposition: "allowed" });
  const shown = textOf(blockNamed(
    object(inspectSelection({ ...system, relationTypes }, [relationSelection(r)])), "Composition"));
  assert.match(shown, /licensed by this model/);
  assert.doesNotMatch(shown, /not licensed/);
});

test("a relation says which model asserts it, and that model is navigable", () => {
  // UX-I7 at the grain where it is load-bearing. Adjacency is the union across every model, so a
  // query joins edges from two reductions — and the relation still says WHICH model asserts it.
  // Dropping this line is how a linked view over two models comes to look like one unified model.
  const system = messageBus();
  for (const r of system.relations) {
    const asserted = blockNamed(object(inspectSelection(system, [relationSelection(r)])), "Asserted by");
    assert.deepEqual(asserted.lines.map((l) => l.action),
      [{ kind: "target", subject: `model:${r.model}` }]);
    assert.equal(asserted.lines[0]?.text, system.models.get(r.model)?.label ?? r.model);
  }
});

test("a relation's endpoints are selectable, so inspection runs both ways", () => {
  const system = messageBus();
  const r = system.relations[0];
  assert.ok(r !== undefined);
  const ends = blockNamed(object(inspectSelection(system, [relationSelection(r)])), "Endpoints");
  assert.deepEqual(ends.lines.map((l) => l.action), [
    { kind: "select", selection: r.from },
    { kind: "select", selection: r.to },
  ]);
  // And the round trip lands on the endpoint rather than on something that merely resolves.
  for (const id of [r.from, r.to]) {
    const landed = object(inspectSelection(system, [id]));
    const label = system.entities.get(id)?.label;
    assert.ok(landed.title.includes(id) || (label !== undefined && landed.title.includes(label)),
      `selecting the ${id} endpoint inspected '${landed.title}' instead`);
  }
});

// --------------------------------------------------------------------------------------------
// Disclosure, notes and provenance
// --------------------------------------------------------------------------------------------

test("Notes and Provenance are the disclosed blocks, and the semantic lines are not", () => {
  // SH-I2 read off the structure: a collapsed region is one a disclosure control opens, and the
  // renderer builds a `<details>` for exactly the blocks marked here. The inverse matters as much —
  // Absence means and Composition are the semantics the old tables stated in the open, and hiding
  // them behind a click would be correction 3 implemented as concealment.
  const system = messageBus();
  const r = system.relations[0];
  assert.ok(r !== undefined);
  for (const selection of [[...system.entities.keys()][0] as string, relationSelection(r)]) {
    const i = object(inspectSelection(system, [selection]));
    const disclosed = i.blocks.filter((b) => b.disclosed).map((b) => b.label);
    assert.deepEqual(disclosed, ["Notes", "Provenance"],
      "only the human-context blocks are collapsed; the declared semantics stay open");
  }
});

test("provenance renders on the selected object — correction 9's new home for it", () => {
  // The §7 ledger records the old page-length Provenance section as superseded: discoverability is
  // answered by placement, one disclosure from the object, not by prominence. So the records have to
  // actually arrive here.
  const system = messageBus();
  const withProvenance = [...system.models.values()].find((m) => m.annotation.provenance !== null)
    ?? [...system.entities.values()].find((e) => e.annotation.provenance !== null);
  assert.ok(withProvenance, "the shipped fixture records provenance on at least one object");
  const selection = system.models.has(withProvenance.id) ? `model:${withProvenance.id}` : withProvenance.id;
  const provenance = blockNamed(object(inspectSelection(system, [selection])), "Provenance");
  assert.ok(provenance.lines.length > 0, "the object records an origin and the pane shows none");
});

test("an assumption note carries the A1 boundary in the one wording the tables use", () => {
  // A note SAYING something is an assumption does not make it part of analysis, which is
  // counter-intuitive enough that it has to be said where the note is read. Asserted by IDENTITY
  // with the exported constant, not by matching a sentence: a second wording of one boundary is how
  // a reader learns to distrust both.
  const system = messageBus();
  const entity = [...system.entities.values()][0];
  assert.ok(entity);
  const annotated = {
    ...entity,
    annotation: {
      notes: [{
        id: "n1", kind: "assumption" as const, text: "Deliveries are at-most-once.",
        unexpectedKeys: [], author: "human", at: null,
      }],
      provenance: null,
    },
  };
  const entities = new Map(system.entities);
  entities.set(entity.id, annotated);
  const notes = textOf(blockNamed(object(inspectSelection({ ...system, entities }, [entity.id])), "Notes"));
  assert.ok(notes.includes(CAVEAT), "the assumption boundary must be stated, in the shared wording");
});

// --------------------------------------------------------------------------------------------
// Coverage — what the tables stated is still reachable
// --------------------------------------------------------------------------------------------

test("every entity and every relation of every shipped example resolves to an inspection", () => {
  // The node-tier half of SH-I3, with the machine representation as the oracle. The browser tier
  // owns the accessible-name version (wave 2d); what a browser-free test can hold is that nothing
  // in the system is UNSELECTABLE — a pane that replaced the global tables and could not reach one
  // relation would have deleted a fact rather than relocated it.
  for (const system of everySystem()) {
    for (const id of system.entities.keys()) {
      assert.equal(inspectSelection(system, [id]).state, "object", `entity '${id}' does not resolve`);
    }
    for (const r of system.relations) {
      const view = inspectSelection(system, [relationSelection(r)]);
      assert.equal(view.state, "object", `relation ${r.from}->${r.to} (${r.type}) does not resolve`);
    }
    for (const id of system.models.keys()) {
      assert.equal(inspectSelection(system, [`model:${id}`]).state, "object", `model '${id}' does not resolve`);
    }
    for (const m of system.machines.values()) {
      assert.equal(inspectSelection(system, [`machine:${m.id}`]).state, "object", `machine '${m.id}' does not resolve`);
      for (const state of m.states) {
        assert.equal(inspectSelection(system, [`state:${m.id}:${state}`]).state, "object",
          `state '${m.id}/${state}' does not resolve`);
      }
    }
  }
});

test("no block is shown with nothing in it and nothing to say about that", () => {
  // The prune rule, over everything selectable. A heading above a blank line reads as a rendering
  // fault, and a reader who meets one stops trusting the rest of the pane.
  for (const system of everySystem()) {
    const selections = [
      ...system.entities.keys(),
      ...system.relations.map(relationSelection),
      ...[...system.models.keys()].map((id) => `model:${id}`),
      ...[...system.machines.keys()].map((id) => `machine:${id}`),
    ];
    for (const selection of selections) {
      for (const b of object(inspectSelection(system, [selection])).blocks) {
        assert.ok(b.lines.length > 0 || (b.empty ?? "").length > 0,
          `'${b.label}' on '${selection}' would render as an empty heading`);
      }
    }
  }
});

test("every declared relation type's semantics are reachable through one of its edges", () => {
  // The coverage claim correction 3 actually makes. The Relations TABLE stated every type's absence
  // meaning once, in one place; the pane states it per edge. Those are equivalent only while every
  // declared type has an edge to select — a type declared and instantiated nowhere has nowhere in
  // this pane to be read at all. Measured at zero uninstantiated types across the shipped examples,
  // and asserted rather than noted, so the day one appears it reads as the gap it is.
  for (const system of everySystem()) {
    const covered = new Set<string>();
    for (const r of system.relations) {
      const i = object(inspectSelection(system, [relationSelection(r)]));
      const t = system.relationTypes.get(r.type);
      assert.ok(t, `relation ${r.from}->${r.to} names undeclared type '${r.type}'`);
      if (t.absence !== null) {
        assert.equal(textOf(blockNamed(i, "Absence means")), t.absence,
          `the declared absence of '${r.type}' is not what its edge reads`);
      }
      assert.ok(textOf(blockNamed(i, "Composition")).length > 0);
      covered.add(r.type);
    }
    assert.deepEqual([...system.relationTypes.keys()].filter((t) => !covered.has(t)), [],
      "a declared relation type with no edge cannot be selected, so its absence and composition "
      + "semantics are readable only in the System Browser table");
  }
});

// --------------------------------------------------------------------------------------------
// The surface the pane deliberately does not have
// --------------------------------------------------------------------------------------------

test("the inspector builds no button, because nothing in it is a command", () => {
  // A structural pin on a decision wave 2a has to notice. Every control in this pane NAVIGATES —
  // selection and target are non-semantic view state — and the browser tier reads an unstamped
  // `<button>` as a control the capability registry does not declare. The contextual editing
  // actions (Rename, Set property, Connect, Delete) are commands and are 2a's; whoever lands them
  // owns registering them, and this test is the line they will trip over if they forget.
  const source = readFileSync("src/ui/shell/inspector.ts", "utf8");
  assert.doesNotMatch(source, /createElement\(\s*["']button["']|el\(\s*["']button["']/,
    "the inspector built a button — a command needs a capability-registry entry before it can land");
});
