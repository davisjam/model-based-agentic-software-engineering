/**
 * §22.5's tests, in `DESIGN-render-rules-261004.md` §D's ranking, built where §D says to build them.
 *
 * **§D-1 is first because it is the one with defect-catching power, and §A.6 decided where it must
 * live.** A throwaway probe built every scene of every shipped example and found **zero** undeclared
 * states drawn and **zero** synthesised relation ids, while both code paths sit live in
 * `src/render/scene.ts`. §22.5 scopes its tests to *"each built-in example"*; a corpus-scoped
 * assertion that every rendered element is a declared element therefore passes today, keeps
 * passing, and holds nothing. **A test over the corpus measures the corpus.** So the systems below
 * are authored here, adversarially, to reach the paths the corpus cannot — and the corpus is
 * asserted separately, as the measurement it is.
 *
 * **§D-2 is second and is unwritable as stated.** *"No renderer creates authoritative semantic
 * facts"* names no type, so there is nothing to range over. §D decomposes it into three mechanical
 * claims and one `asserted` residue, and this file holds the three and declines the fourth in
 * writing.
 *
 * **§D-3 is third and cheap.** A negative control over the seam, not a property test over layouts.
 *
 * **§D-4, §D-5 and §D-6 are deliberately absent, and the reason is per-test rather than general:**
 *
 *   - **§D-4** (*the canonical model validates independently of rendering*) is already held by the
 *     import-graph gate in both directions, and §D calls the proposed saved query *"a restatement
 *     rather than a new control"* in its own text. §D says to stop where the yield stops.
 *   - **§D-5** (*rendered elements belong to a resolvable subject*) is a LIVE HOLE and is not
 *     closed here, because closing it is a behaviour change at a seam three call sites use and the
 *     design lists it as an open question for the author (§I.2). The hole is re-measured below so
 *     the decision has a current number rather than a remembered one.
 *   - **§D-6** (*rendering is deterministic*) is held twice already — identical placement across
 *     runs, independence from authoring order, byte-stable serialization. A per-example version
 *     would re-assert it N times over a corpus that cannot vary it.
 */
import { exampleDir } from "../src/app/example-corpus.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash } from "../src/ir/hash.ts";
import {
  buildGraphScene, buildMachineScene, buildScene, dagreLayoutEngine, defaultLayoutEngine,
} from "../src/render/index.ts";
import type { LayoutEngine, SceneEdge, SceneGraph, SceneNode } from "../src/render/index.ts";
import { renderView } from "../src/render/index.ts";
import { runQuery } from "../src/engine/index.ts";
import { EXAMPLE_IDS, type ExampleId } from "../src/app/example-corpus.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";

const systemOf = (id: ExampleId): CanonicalSystem =>
  canonicalize(parse(readFileSync(`${exampleDir(id)}/system.mage.yaml`, "utf8")));

const SYSTEMS: ReadonlyMap<ExampleId, CanonicalSystem> =
  new Map(EXAMPLE_IDS.map((id) => [id, systemOf(id)]));

/** Every scene the shipped corpus can produce — all models and all machines of all examples. */
function everyShippedScene(): readonly { readonly where: string; readonly scene: SceneGraph }[] {
  const out: { where: string; scene: SceneGraph }[] = [];
  for (const [example, system] of SYSTEMS) {
    for (const id of system.models.keys()) {
      out.push({ where: `${example}/model:${id}`, scene: buildGraphScene(system, id) });
    }
    for (const id of system.machines.keys()) {
      out.push({ where: `${example}/machine:${id}`, scene: buildMachineScene(system, id) });
    }
  }
  return out;
}

// ----------------------------------------------------------------------------------------------
// §D-1. Every rendered element maps back to a canonical id, or to a DECLARED synthesis class
// ----------------------------------------------------------------------------------------------

/**
 * The closed set of sanctioned synthesis classes — every way a scene may carry an id the IR does
 * not.
 *
 * Declared together, the way `test/bindings-census.test.ts` declares its walked and declined sets
 * together, so a fifth cannot land unnoticed: the classifier below returns `null` for anything it
 * cannot place and the tests fail on a `null`.
 *
 * **There are FIVE, where §D says three.** §D's prose counts the undeclared transition endpoint,
 * the synthesised relation id and the containment edge. Measured against the extractor, the
 * collision suffix is a distinct rule with its own failure mode (`#n`, and two unnamed relations
 * between one pair is exactly what reaches it), and a transition's edge id is synthesised on EVERY
 * transition rather than only on unnamed ones — the IR gives a transition an index, never an id.
 * Neither is a defect; both are ids no IR lookup resolves, which is what this set is for.
 */
const SYNTHESIS_CLASSES = {
  "transition-endpoint": "A transition (or the initial declaration) names a state the machine never "
    + "declared. The extractor draws it rather than silently hiding the dangling end, and says so "
    + "in place: the validator is what complains about it.",
  "relation-id": "The source named no id for a relation, so the extractor synthesises "
    + "`r:<type>:<from>:<to>` from the declared triple. Every component is a declared fact.",
  "relation-id-collision": "Two relations of one type between one pair would collide on the id "
    + "above, so the second and later carry a `#n` suffix. The suffix is a disambiguator and "
    + "carries no semantics, which is why selection resolves an edge by lookup and never by "
    + "parsing this id.",
  "containment-edge": "A parent/child pair of `CanonEntity.contains` is drawn as an explicit edge "
    + "as well as an enclosing region, with a synthesised `c:<parent>:<child>` id and the literal "
    + "label `contains`. A DERIVED PROJECTION of a declared fact, not an invention: enclosure "
    + "alone would make position the sole carrier of a containment claim.",
  "transition-edge-id": "A transition is identified in the IR by its index within its machine, not "
    + "by an id, so every transition edge's `t:<machine>:<index>` is synthesised. Both components "
    + "are declared facts and the index is the IR's own.",
} as const;

type SynthesisClass = keyof typeof SYNTHESIS_CLASSES;

/** What a node id resolves to, or `null` if nothing in the closed vocabulary explains it. */
function classifyNode(
  system: CanonicalSystem, scene: SceneGraph, node: SceneNode,
): "declared-entity" | "declared-state" | SynthesisClass | null {
  if (scene.subject.kind === "model") {
    return system.entities.has(node.id) ? "declared-entity" : null;
  }
  const machine = system.machines.get(scene.subject.id);
  if (machine === undefined) return null;
  if (machine.states.includes(node.id)) return "declared-state";
  const named = machine.transitions.some((t) => t.from === node.id || t.to === node.id)
    || machine.initial === node.id;
  return named ? "transition-endpoint" : null;
}

/** What an edge resolves to, or `null` if nothing in the closed vocabulary explains it. */
function classifyEdge(
  system: CanonicalSystem, scene: SceneGraph, edge: SceneEdge,
): "declared-relation" | SynthesisClass | null {
  if (edge.kind === "containment") {
    const parent = system.entities.get(edge.from);
    return parent !== undefined && parent.contains.includes(edge.to) ? "containment-edge" : null;
  }
  if (edge.kind === "transition") {
    const machine = system.machines.get(scene.subject.id);
    const declared = machine?.transitions.some((t) => t.from === edge.from && t.to === edge.to);
    return declared === true ? "transition-edge-id" : null;
  }
  // A relation edge. It must correspond to a DECLARED relation of this model, by the triple.
  const matches = system.relations.filter((r) =>
    r.model === scene.subject.id && r.from === edge.from && r.to === edge.to && r.type === edge.via);
  if (matches.length === 0) return null;
  if (matches.some((r) => r.id === edge.id)) return "declared-relation";
  if (/#\d+$/.test(edge.id)) return "relation-id-collision";
  return edge.id === `r:${edge.via}:${edge.from}:${edge.to}` ? "relation-id" : null;
}

test("§D-1 every element of every SHIPPED scene resolves, and the corpus reaches no synthesis", () => {
  // Two assertions in one, and the second is the one worth having. The first is the property §22.5
  // asks for. The second RE-MEASURES §A.6's finding — that the corpus exercises none of the
  // synthesis paths — so the claim "a corpus test holds nothing here" is a current number rather
  // than a remembered one, and so it fails loudly if a future example starts exercising a path.
  const reached = new Set<string>();
  let elements = 0;
  for (const { where, scene } of everyShippedScene()) {
    const system = SYSTEMS.get(where.split("/")[0] as ExampleId);
    assert.ok(system !== undefined);
    for (const node of scene.nodes) {
      const verdict = classifyNode(system, scene, node);
      assert.ok(verdict !== null,
        `${where}: node '${node.id}' resolves to no declared element and no sanctioned synthesis `
        + "class. Either the extractor invented it, or a new synthesis class landed undeclared");
      reached.add(verdict);
      elements += 1;
    }
    for (const edge of scene.edges) {
      const verdict = classifyEdge(system, scene, edge);
      assert.ok(verdict !== null,
        `${where}: edge '${edge.id}' (${edge.from}->${edge.to}) resolves to no declared relation, `
        + "transition or containment pair");
      reached.add(verdict);
      elements += 1;
    }
  }
  assert.ok(elements > 100, `only ${elements} elements walked — the corpus did not load`);

  // §A.6's measurement, re-derived at 261005. The corpus reaches containment and transition ids
  // and NEITHER of the two paths §A.6 named: no undeclared state is drawn and no relation id is
  // synthesised anywhere in the shipped examples.
  assert.ok(!reached.has("transition-endpoint"),
    "a shipped example now draws an undeclared transition endpoint — §A.6's measurement has "
    + "changed, and a corpus-scoped test is no longer vacuous for this path. Update the design's "
    + "§A.6 rather than this assertion");
  assert.ok(!reached.has("relation-id"),
    "a shipped example now leaves a relation unnamed — same as above; the measurement moved");
});

test("§D-1 the extractor's synthesis paths, each reached and each holding its declared outcome", () => {
  // The systems below exist because the corpus cannot reach these paths. They are authored in the
  // wire format and canonicalized, so they are inputs the loader accepts rather than hand-built IR
  // objects that could disagree with what a real document produces.
  const system = canonicalize(parse(ADVERSARIAL));

  // CLASS 1 — an undeclared transition endpoint is DRAWN, not hidden.
  const machine = buildMachineScene(system, "dangling");
  const declared = system.machines.get("dangling")?.states ?? [];
  assert.ok(!declared.includes("nowhere"), "the fixture must name a state the machine never declares");
  const drawn = machine.nodes.map((n) => n.id);
  assert.ok(drawn.includes("nowhere"),
    "the dangling endpoint is not drawn — the extractor hid it, which is the failure its own "
    + "comment rules out: the renderer shows what the model says and the validator complains");
  assert.equal(classifyNode(system, machine, machine.nodes.find((n) => n.id === "nowhere")!),
    "transition-endpoint");

  // CLASS 5 — and every transition edge id is synthesised from the IR's index.
  assert.deepEqual(machine.edges.map((e) => e.id), ["t:dangling:0", "t:dangling:1"]);

  const graph = buildGraphScene(system, "twins");

  // CLASS 2 and 3 — two unnamed relations between one pair: one synthesised id, one disambiguated.
  const relations = graph.edges.filter((e) => e.kind === "relation");
  assert.equal(relations.length, 2, "both declared relations must be drawn, not deduplicated");
  assert.deepEqual(relations.map((e) => e.id), ["r:links:a:b", "r:links:a:b#1"]);
  assert.equal(classifyEdge(system, graph, relations[0]!), "relation-id");
  assert.equal(classifyEdge(system, graph, relations[1]!), "relation-id-collision");

  // CLASS 4 — containment is drawn as an edge the IR declares as a `contains` list, never as a
  // relation. The naive spelling of "every edge is a declared relation" fails on exactly this, and
  // it is the extractor's most deliberate decision.
  const containment = graph.edges.filter((e) => e.kind === "containment");
  assert.deepEqual(containment.map((e) => e.id), ["c:outer:a", "c:outer:b"]);
  for (const e of containment) {
    assert.equal(e.label, "contains");
    assert.equal(classifyEdge(system, graph, e), "containment-edge");
    assert.ok(!system.relations.some((r) => r.from === e.from && r.to === e.to),
      "the fixture must not ALSO declare a relation here, or this proves nothing");
  }

  // Every class in the closed set is now reached by one of the two systems, which is what stops
  // this test from declaring five classes and exercising two.
  const all = new Set<string>();
  for (const scene of [machine, graph]) {
    for (const n of scene.nodes) all.add(String(classifyNode(system, scene, n)));
    for (const e of scene.edges) all.add(String(classifyEdge(system, scene, e)));
  }
  // ...and nothing in either adversarial scene is UNCLASSIFIABLE. Added after a mutation found the
  // gap: this loop collected classifications and never refused a `null`, so a renderer inventing a
  // node was invisible to it while the corpus walk above caught it. The two halves are
  // complementary and neither subsumes the other, which is only true if both refuse an invention.
  assert.ok(!all.has("null"),
    "an element of an adversarial scene resolves to nothing in the closed vocabulary");
  for (const cls of Object.keys(SYNTHESIS_CLASSES)) {
    assert.ok(all.has(cls), `synthesis class '${cls}' is declared and reached by no fixture here`);
  }
});

test("§D-1 every declared synthesis class owes a real reason", () => {
  // The set is the control; a set whose members say nothing is a list. Same floor `semanticBasis`
  // rung 2 carries, for the same reason.
  for (const [cls, why] of Object.entries(SYNTHESIS_CLASSES)) {
    assert.ok(why.length > 60, `${cls}: a sanctioned synthesis class owes more than a label`);
  }
});

/*
 * ## The vacuity case for §D-1, constructed
 *
 * **The corpus half passes while the property is violated like this** — and it is not hypothetical,
 * it is what §A.6 measured: the extractor grows a sixth synthesis path, no shipped example reaches
 * it, and the corpus walk stays green over an invented element that ships. That is the reason the
 * second test exists and the reason §D says to build over the extractor.
 *
 * **The extractor half passes while the property is violated like this:** a new synthesis path is
 * added to `buildGraphScene` AND a member is added to `SYNTHESIS_CLASSES` to sanction it, with no
 * fixture reaching it. The classifier would place it, the closed-set assertion would clear, and
 * nothing would have been reviewed. The reachability loop at the end of the second test is what
 * refuses that: a declared class no fixture reaches fails. **This is the strongest thing in the
 * file** — it makes "declare a class to silence the test" cost a fixture that demonstrates it.
 *
 * **What neither half catches, and it is the real residue:** a synthesis class that is sanctioned,
 * reached, well-described — and WRONG. Nothing here grades whether drawing an undeclared transition
 * endpoint is the right call; it grades that the call is declared, reasoned and exercised. The
 * extractor argues for it in place and the design agrees; a reader can disagree, and no assertion
 * here would stop them.
 */

// ----------------------------------------------------------------------------------------------
// §D-2. "No renderer creates authoritative semantic facts" — the three claims that have a subject
// ----------------------------------------------------------------------------------------------

test("§D-2a no scene field reaches the system hash, so no picture can change what the IR asserts", () => {
  // The third of §D's decomposed claims, and the cheapest to state honestly: the hash is over the
  // IR, and rendering is downstream of it. Rendering every scene of every example and re-hashing
  // afterwards is the negative control — it would catch a renderer that memoised geometry back
  // into the system, which is the realistic failure rather than a malicious one.
  for (const [example, system] of SYSTEMS) {
    const before = systemHash(system);
    for (const id of system.models.keys()) renderView(system, { subject: { kind: "model", id } });
    for (const id of system.machines.keys()) {
      renderView(system, { subject: { kind: "machine", id } });
    }
    assert.equal(systemHash(system), before,
      `${example}: the system hash moved across rendering, so a view changed what the model asserts`);
  }
});

test("§D-2b the twin carries no element the scene does not, so prose cannot outrun the picture", () => {
  // The claim that catches a twin naming a node the drawing does not have — the accessible half
  // inventing content the visual half never showed, which is the direction an a11y obligation makes
  // dangerous: a screen-reader user cannot cross-check against the picture.
  let checked = 0;
  for (const [example, system] of SYSTEMS) {
    for (const id of system.models.keys()) {
      const view = renderView(system, { subject: { kind: "model", id } });
      const sceneIds = new Set(buildScene(system, { kind: "model", id }).nodes.map((n) => n.id));
      for (const node of view.accessible.nodes) {
        assert.ok(sceneIds.has(node.id),
          `${example}/${id}: the twin names '${node.id}', which the scene does not contain`);
      }
      assert.equal(view.accessible.nodes.length, sceneIds.size,
        `${example}/${id}: the twin and the scene disagree about how many nodes exist`);
      checked += 1;
    }
  }
  assert.ok(checked > 3, `only ${checked} views compared — the loop ran on almost nothing`);
});

/*
 * ## §D-2's fourth claim is NOT here, and that is §D's own ruling
 *
 * *"The twin's prose does not assert more than the scene's fields support"* is `asserted`. A
 * reviewer reads it. §D-2b above is the structural half — the twin's element SET equals the
 * scene's — and it is strictly weaker than the prose claim: a twin whose every node is real and
 * whose summary sentence overstates what the picture shows passes it. There is no type for
 * "asserts more than its fields support", so there is nothing to range over, and writing an
 * assertion that looked like one would be the overclaim this wave exists to remove.
 *
 * ## The vacuity case for §D-2a, constructed
 *
 * It passes while the property is violated like this: a renderer that mutates the IR through a
 * cast, in a field `systemHash` excludes. `instances` and `quantitativeModels` are both excluded as
 * derived, so a write to either would be invisible here. What makes that unreachable is not this
 * test — it is that all 161 declared members of `src/ir/types.ts` are `readonly` with
 * `ReadonlyMap` collections, which `npm run check` re-derives every run. Read `tsc` as the control
 * and this as the negative control over the seam.
 */

// ----------------------------------------------------------------------------------------------
// §D-3. Changing layout does not change query results
// ----------------------------------------------------------------------------------------------

/**
 * A second layout, built the way the renderer's own seam test builds one.
 *
 * **§D names "two different layout engines (`defaultLayoutEngine` and a cold hint set)", and those
 * are not two engines.** `defaultLayoutEngine` IS `dagreLayoutEngine` — asserted below — so a
 * comparison between the two names renders twice under one engine and compares a query set to
 * itself. A stub engine is the variation that actually varies: it places every node on one row at a
 * thousand-pixel pitch, which no real layout would produce, and the positive control below proves
 * the two renders differ before the invariance assertion is allowed to mean anything.
 */
const ROW_ENGINE: LayoutEngine = (scene) => ({
  direction: "left-to-right",
  nodes: new Map(scene.nodes.map((n, i) => [n.id, {
    id: n.id, kind: n.kind, label: n.label,
    rect: { x: i * 1000, y: 7, w: 100, h: 40 },
    rank: i, order: 0, parent: n.parent, initial: n.initial, pinned: false,
  }])),
  edges: [],
  bounds: { x: 0, y: 0, w: scene.nodes.length * 1000 + 100, h: 100 },
  ranks: scene.nodes.map((n) => [n.id]),
});

test("§D-3 every saved query answers identically under two genuinely different layouts", () => {
  // §D: *"not a property test over layouts but a negative control over the seam."* Layout is
  // downstream of the scene and the scene is downstream of the IR; no query reads either. What the
  // test buys is the memoisation failure — a future renderer that wrote geometry back into the
  // system — which is the realistic one rather than a malicious one.
  let compared = 0;
  let varied = 0;
  for (const [example, system] of SYSTEMS) {
    const render = (engine: LayoutEngine | undefined): string[] => {
      const svgs: string[] = [];
      for (const id of system.models.keys()) {
        svgs.push(renderView(system, { subject: { kind: "model", id } },
          engine === undefined ? {} : { engine }).svg);
      }
      for (const id of system.machines.keys()) {
        svgs.push(renderView(system, { subject: { kind: "machine", id } },
          engine === undefined ? {} : { engine }).svg);
      }
      return svgs;
    };
    const answers = (): string[] =>
      [...system.queries.keys()].sort().map((q) => JSON.stringify(runQuery(system, q)));

    const defaultSvgs = render(undefined);
    const beforeAnswers = answers();
    const stubSvgs = render(ROW_ENGINE);
    const afterAnswers = answers();

    // POSITIVE CONTROL first. An invariance claim over a variation that did not happen is the
    // vacuity this whole file is written against, so the variation is proved before it is used.
    assert.equal(stubSvgs.length, defaultSvgs.length);
    for (let i = 0; i < defaultSvgs.length; i += 1) {
      assert.notEqual(stubSvgs[i], defaultSvgs[i],
        `${example}: the stub engine produced a byte-identical picture, so the layout did not vary `
        + "and the invariance below would hold over nothing");
      varied += 1;
    }

    assert.ok(beforeAnswers.length > 0, `${example}: no saved queries — nothing compared`);
    assert.deepEqual(afterAnswers, beforeAnswers,
      `${example}: a saved query answered differently after a different layout ran`);
    compared += beforeAnswers.length;
  }
  assert.ok(compared > 20, `only ${compared} (query, layout) pairs compared`);
  assert.ok(varied > 10, `only ${varied} views actually changed layout`);
});

test("§D-3's premise: the two ENGINE NAMES the design cites are one engine", () => {
  // Recorded as an assertion rather than a remark, because §D's own prose treats them as two and a
  // reader who takes that at face value will write the vacuous version of the test above. The day a
  // second engine lands this fails, which is the right moment to revisit §D-3's wording.
  assert.equal(defaultLayoutEngine, dagreLayoutEngine,
    "a second layout engine exists: `defaultLayoutEngine` and `dagreLayoutEngine` are now a real "
    + "pair, and §D-3 could be written over them instead of over a stub");
});

/*
 * ## The vacuity case for §D-3, constructed
 *
 * **The first draft of this test WAS the vacuity case**, which is the most useful thing to record
 * about it. It compared `defaultLayoutEngine` against `dagreLayoutEngine` because §D names them as
 * two, rendered twice under one engine, and compared a query set to itself. Green, and holding
 * nothing. The positive control is what makes the rewrite honest: the stub's pictures must differ
 * from the default's, byte for byte, before the invariance assertion is allowed to count.
 *
 * **What still passes while the property is violated:** a renderer that perturbs query results only
 * under a layout neither of these two produces. The claim is "these layouts do not disturb these
 * answers", which is a negative control over the seam and not a property over all layouts. §D says
 * that is the right trade for one test, and the structural reason behind it — no query reads the
 * scene or the layout, held by the import graph — is the thing actually carrying the weight.
 */

// ----------------------------------------------------------------------------------------------
// §D-5. The hole, re-measured rather than closed
// ----------------------------------------------------------------------------------------------

test("§D-5 an unresolvable subject still yields an empty picture titled with the bare id", () => {
  // NOT a pin on correct behaviour. This is a CHARACTERIZATION of a hole the design reports and
  // leaves to the author: §I.2 asks whether `buildScene` should refuse or whether the seam should
  // validate, and calls the refusal a behaviour change at a seam three call sites use. That is a
  // load-bearing call, so this wave measures it and does not make it.
  //
  // Read the direction of the assertion carefully: it says the hole is OPEN. The day it is closed
  // this test fails, which is the correct failure — it is the notification that the decision landed.
  const system = SYSTEMS.get("worker-queue");
  assert.ok(system !== undefined);
  assert.ok(!system.models.has("no-such-model"));

  const scene = buildGraphScene(system, "no-such-model");
  assert.equal(scene.nodes.length, 0, "an unresolvable subject draws nothing");
  assert.equal(scene.title, "no-such-model",
    "and titles the emptiness with the bare id, so the picture reads as though the model existed "
    + "and were empty. THIS IS THE HOLE. If this assertion fails because `buildScene` now refuses, "
    + "§I.2 has been decided and the design doc's §D-5 should record it");
  assert.equal(scene.question, null);
});

/**
 * Two systems the shipped corpus cannot be, authored to reach the extractor's synthesis paths.
 *
 * In the WIRE format and canonicalized, not hand-built IR objects: a fixture that bypasses the
 * loader can hold a shape no real document produces, and then the test measures the fixture.
 *
 * `twins` declares two relations of one type between one pair, neither named — the collision the
 * `#n` suffix exists for. `outer` contains both ends, which is the containment edge. `dangling`
 * declares two states and a transition into a third it never declares.
 */
const ADVERSARIAL = `
mage: 1
system:
  id: synthesis-probe
  name: Synthesis probe
  description: >
    Authored for test/render-no-invention.test.ts. Reaches the three scene-extractor synthesis
    paths that no shipped example reaches, which is what makes a test over the extractor different
    from a test over the corpus.
relation-types:
  links:
    description: One thing links to another.
    absence: No link is declared. The absence says nothing about reachability by other means.
    composition: { path: forbidden }
    properties: { symmetric: false, acyclic: true }
entities:
  a: { type: thing, label: A }
  b: { type: thing, label: B }
  outer: { type: thing, label: Outer, contains: [a, b] }
models:
  twins:
    type: graph
    label: Twins
    purpose:
      question: Do two unnamed relations between one pair both draw, distinguishably?
      represents: [thing identity, link, containment]
      omits: [order of occurrence, cost]
    entities: [a, b, outer]
    relations:
      - { from: a, to: b, type: links }
      - { from: a, to: b, type: links }
machines:
  dangling:
    entity: a
    purpose:
      question: Is a transition's undeclared endpoint drawn or hidden?
      represents: [declared states, declared transitions]
      omits: [duration, fairness]
    initial: start
    states:
      start:
      middle:
    transitions:
      - { from: start, to: middle, label: go }
      - { from: middle, to: nowhere, label: dangle }
`;
