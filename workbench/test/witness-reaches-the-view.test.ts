// Step 5 of the structural loop, end to end: a question's witness reaching the DRAWN view.
//
// §9.4 of `DESIGN-v02-examples-and-semantic-completion-261004.md` promises a student a highlighted
// witness path for the reachability question (Q2) and the breach question (Q3). The render layer has
// carried ordered witness emphasis for a while and `test/render-accessible.test.ts` pins it well —
// over HAND-BUILT evidence. That is the half that was never checked: no test took a real saved
// query of a shipped example, ran it through the engine, and asserted that what came back reaches
// the picture. The two halves can each be right while the join is wrong, which is what this file
// exists to catch, and it caught two things on its first run (below).
//
// WHAT IS PINNED, and why each assertion is here:
//
//   1. The witness reaches the view on CANONICAL IDS. Not labels, not scene-local names: the join
//      key between an answer and a picture is the entity id the model declares. The shell learned
//      this the hard way once already — a tree selection arrived as `entity:analytics`, matched no
//      node and drew no emphasis (`src/ui/view-model.ts:633-639`).
//   2. The emphasis is ORDERED, and the order is the witness's order. `step` is the join key between
//      the picture and the textual step list, and for the `evidence` treatment it IS the marker
//      glyph, so a wrong number is a wrong picture (`src/render/accessible.ts:160-164`).
//   3. The hops are the model's own edges, named by their declared relation ids.
//   4. Both projections carry it. `RenderedView` is indivisible so that a picture cannot show a fact
//      assistive technology does not get, and this asserts the property that contract is FOR.
//
// TWO DEFECTS THIS FILE FOUND, both now held by the last two tests:
//
//   - A witness drawn over a model that did not produce it matched edges by their endpoint pair and
//      emphasised them as hops. The propagation witness over `event-flow` numbered two `publishes`
//      edges as "hop 1" and "hop 3" of a path — asserting a composition `event-flow` declares
//      FORBIDDEN. `deriveEvidenceEmphasis` now drops hops unless every consecutive pair resolves.
//   - `predecessors` answers a SET and reports it as `shape: "path"`, so its nodes are numbered as
//      if the order meant something. The fixture layer already knows: `expected-results.yaml`
//      distinguishes `path` from `nodes_include` for exactly this reason. The hop guard stops the
//      set from drawing invented hops; the numbering of its NODES is upstream of the renderer and is
//      reported as an open gap rather than patched here.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Workspace } from "../src/app/services.ts";
import { realPorts } from "../scripts/gen-example-coverage.ts";
import { renderView } from "../src/render/index.ts";
import type { CanonicalSystem, QueryResult } from "../src/ir/types.ts";
import type { EmphasisAssignment, RenderedView } from "../src/render/types.ts";

/** The example under test, loaded through the same seam the page and the agent use. */
function messageBus(): CanonicalSystem {
  const ws = new Workspace(realPorts);
  const loaded = ws.load(readFileSync("examples/message-bus/system.mage.yaml", "utf8"));
  assert.ok(loaded.ok, "the example must load");
  assert.deepEqual(loaded.findings, [], "the example must validate clean");
  return ws.state.system;
}

/** Run a SAVED question by its id — the student's route, not a query written here. */
function answer(system: CanonicalSystem, id: string): QueryResult {
  const ws = new Workspace(realPorts);
  ws.load(readFileSync("examples/message-bus/system.mage.yaml", "utf8"));
  const saved = system.queries.get(id);
  assert.ok(saved !== undefined, `${id} must be a saved question of the example`);
  return ws.query(saved.raw);
}

/** Draw one model with an answer's evidence, exactly as a witness focus would. */
function drawWith(system: CanonicalSystem, model: string, res: QueryResult): RenderedView {
  return renderView(system, {
    subject: { kind: "model", id: model },
    evidence: res.evidence,
    outcome: res.outcome,
    coverage: res.coverage,
  });
}

const assignments = (view: RenderedView): readonly EmphasisAssignment[] =>
  [...view.accessible.nodes, ...view.accessible.edges].flatMap((x) => x.emphasis);

/** Emphasis targets in witness order, which is the only order this view claims. */
const inStepOrder = (view: RenderedView, among: ReadonlySet<string>): readonly string[] =>
  assignments(view)
    .filter((a) => among.has(a.target) && a.step !== null)
    .sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
    .map((a) => a.target);

test("Q2's reachability witness reaches the drawn view, in order, on canonical ids", () => {
  const system = messageBus();
  const res = answer(system, "checkout-event-reaches-fulfillment");
  assert.equal(res.outcome, "holds");
  assert.equal(res.evidence?.role, "witness");

  // The model that LICENSES composition is the model that carried the answer, so it is the one the
  // witness is drawn over. The nodes come from the answer rather than from a list written here: a
  // pinned node list would be this test asserting the engine's answer twice.
  const nodes = res.evidence?.nodes ?? [];
  assert.ok(nodes.length > 2, "a multi-hop witness, or the search took a degenerate early return");
  const view = drawWith(system, "event-propagation", res);

  const drawn = new Set(view.accessible.nodes.map((n) => n.id));
  assert.deepEqual(inStepOrder(view, drawn), [...nodes],
    "every node of the witness is emphasised, and the emphasis order is the witness order");

  for (const a of assignments(view)) {
    assert.equal(a.kind, "evidence", `a witness under exhaustive coverage draws as evidence, got ${a.kind}`);
    assert.ok(a.reason.length > 0, "every emphasis states why it applies — the non-visual twin of the channel");
  }

  // The hops: one fewer than the nodes, each a declared relation of this model, numbered 1..n-1.
  const edges = new Set(view.accessible.edges.map((e) => e.id));
  const hops = assignments(view).filter((a) => edges.has(a.target));
  assert.equal(hops.length, nodes.length - 1, "a path of n nodes is carried by n-1 hops");
  assert.deepEqual(hops.map((h) => h.step).sort((a, b) => (a ?? 0) - (b ?? 0)),
    nodes.slice(1).map((_, i) => i + 1), "the hops are numbered along the witness");
  for (const hop of hops) {
    assert.ok(system.relations.some((r) => r.id === hop.target),
      `${hop.target} must be a relation the example declares, not a scene-local name`);
  }
});

test("Q3's breach witness reaches the drawn view, as the subscribes edge that carries it", () => {
  const system = messageBus();
  const res = answer(system, "restricted-data-reaches-impermitted-subscriber");
  // `holds` IS the breach: the question is existential, so the witness is the counterexample to the
  // prohibition. The engine's ROLE is still `witness`, and the view must say what the engine said.
  assert.equal(res.outcome, "holds");
  assert.equal(res.evidence?.role, "witness");
  const nodes = res.evidence?.nodes ?? [];

  const view = drawWith(system, "event-flow", res);
  const drawn = new Set(view.accessible.nodes.map((n) => n.id));
  assert.deepEqual(inStepOrder(view, drawn), [...nodes],
    "the impermitted service and the event type it receives are both emphasised, in order");

  // The hop is the edge the cross-model join read: event-flow supplies it, data-policy supplies the
  // sensitivities on its endpoints. A view that emphasised the endpoints and not the edge would hide
  // the thing a student has to delete or re-permit.
  const hop = assignments(view).find((a) => system.relations.some((r) => r.id === a.target));
  assert.ok(hop !== undefined, "the breach's own edge is emphasised");
  const relation = system.relations.find((r) => r.id === hop.target);
  assert.equal(relation?.type, "subscribes",
    "the emphasised hop is the subscription, which is what the breach query traverses");
});

test("the witness is in BOTH projections, which is what the indivisible return value is for", () => {
  const system = messageBus();
  const res = answer(system, "checkout-event-reaches-fulfillment");
  const view = drawWith(system, "event-propagation", res);

  // The twin's own evidence block: the witness as a numbered list of steps, which `accessible.ts`
  // calls the witness's primary form.
  assert.ok(view.accessible.evidence !== null, "the twin carries the evidence block");
  assert.equal(view.accessible.evidence?.role, "witness");

  // And the picture. The comparison is over the REASON text rather than over a count of attributes:
  // `markAttrs` stamps the emphasis on a group AND on the shape inside it, so attributes outnumber
  // targets, while `resolve` collapses one target's assignments to one reason string. The reason is
  // also the field that makes the channel non-visual, so comparing it checks the property that
  // matters — the picture says the same thing the twin says, about the same shapes.
  const inPicture = new Set([...view.svg.matchAll(/data-emphasis-reason="([^"]*)"/g)].map((m) => m[1]));
  const inTwin = new Set(assignments(view).map((a) => a.reason));
  assert.ok(inTwin.size > 0, "the twin reports emphasised shapes");
  assert.deepEqual([...inPicture].sort(), [...inTwin].sort(),
    "the picture marks exactly what the twin reports — nothing emphasised in one projection only");

  const kinds = new Set([...view.svg.matchAll(/data-emphasis="([^"]*)"/g)].map((m) => m[1]));
  assert.deepEqual([...kinds], ["evidence"], "a witness under exhaustive coverage draws as evidence");

  // The step NUMBER reaches the picture as its marker glyph, which is what makes the diagram read
  // "1, 2, 3" instead of reading as a colour.
  for (const position of (res.evidence?.nodes ?? []).map((_, i) => i + 1)) {
    assert.match(view.svg, new RegExp(`>${position}<`),
      `the picture carries ${position} as a marker glyph, not just as a stroke`);
  }
});

test("a witness does not leak its hops into a model that did not carry it", () => {
  const system = messageBus();
  const res = answer(system, "checkout-event-reaches-fulfillment");
  const nodes = res.evidence?.nodes ?? [];

  // `event-flow` names the same entities under shared identity, so the NODES are legitimately
  // emphasised: the answer really is about these services. What it must not do is number this
  // model's edges as hops of a path through a relation it declares `forbidden`.
  const view = drawWith(system, "event-flow", res);
  const drawn = new Set(view.accessible.nodes.map((n) => n.id));
  assert.deepEqual(inStepOrder(view, drawn), [...nodes], "the entities are still named");

  const hops = assignments(view).filter((a) => system.relations.some((r) => r.id === a.target));
  assert.deepEqual(hops, [],
    "a partially-resolving path is not a path in this model, so no edge may be numbered as its hop");

  // The guard has to be falsifiable in the other direction too, or it is just "draw fewer things":
  // over the model that DOES carry the witness, every hop is drawn.
  const carried = drawWith(system, "event-propagation", res);
  assert.equal(
    assignments(carried).filter((a) => system.relations.some((r) => r.id === a.target)).length,
    nodes.length - 1, "the same witness over its own model draws every hop");
});

test("Q5's direction: repair, then add an impermitted subscriber, and the witness MOVES", () => {
  // §9.4 Q5 asks the student to add a subscriber with insufficient permission and watch the
  // requirement go satisfied -> violated, and it asks the UI to identify "the changed verdict and
  // witness". This example ships the breach on purpose, so Q5's direction needs the REPAIRED
  // revision as its base — two transactions, which is one more than a fixture modification is. So
  // it is driven here instead.
  //
  // The repair COMMITS through `transact` rather than opening a hypothesis, which is both the
  // student's own route (a direct edit lands, undo one keystroke away) and a constraint: one
  // hypothesis is open at a time, so a two-step activity cannot be two branches. Q5's edit is then
  // the what-if, which is the right shape for it — the student is asking what the addition would do.
  //
  // What makes the second half worth a test of its own: the verdict does NOT move. The breach query
  // answers `holds` before and after, because one impermitted subscriber was replaced by another.
  // Only the witness moves, so a reader watching the verdict alone would conclude nothing happened.
  const ws = new Workspace(realPorts);
  ws.load(readFileSync("examples/message-bus/system.mage.yaml", "utf8"));
  const breach = (): QueryResult => ws.query(ws.state.system.queries.get(
    "restricted-data-reaches-impermitted-subscriber")?.raw);

  const shipped = breach();
  assert.equal(shipped.outcome, "holds", "the example ships the breach");
  const impermitted = shipped.evidence?.nodes?.[0];
  assert.ok(impermitted !== undefined, "the witness names the service that may not process the data");

  // Step 1 — repair. The requirement's condition is `refuted`, so this is satisfied.
  const repaired = ws.transact({
    transaction: {
      base: ws.state.hash,
      rationale: "widen the permission rather than delete the flow",
      operations: [
        { op: "set-property", id: impermitted, name: "permits", value: "restricted", domain: "sensitivity" },
      ],
    },
  });
  assert.ok(repaired.ok, `repair refused: ${repaired.findings.map((f) => f.message).join("; ")}`);
  assert.equal(breach().outcome, "refuted", "satisfied: no restricted data reaches an impermitted service");

  // Step 2 — Q5's own edit, against the repaired revision.
  const broken = ws.openHypothesis("add a debug subscriber", {
    transaction: {
      base: ws.state.hash,
      rationale: "a debugging subscriber with insufficient sensitivity permission",
      operations: [
        { op: "add-entity", id: "debug", type: "service", label: "Debug" },
        { op: "set-property", id: "debug", name: "permits", value: "internal", domain: "sensitivity" },
        {
          op: "add-relation", model: "event-flow", id: "debug-subscribes-order-created",
          from: "debug", to: "order-created", type: "subscribes",
        },
        {
          op: "add-relation", model: "event-propagation", id: "propagate-order-created-debug",
          from: "order-created", to: "debug", type: "may_propagate_to",
        },
      ],
    },
  });
  assert.ok(broken.ok, `the Q5 edit was refused: ${broken.findings.map((f) => f.message).join("; ")}`);

  const violated = breach();
  assert.equal(violated.outcome, "holds", "violated again: the new subscriber may not process what it receives");
  assert.deepEqual(violated.evidence?.nodes?.[0], "debug",
    "the witness names the NEW subscriber — the breach moved rather than returning to where it was");
  assert.notEqual(violated.evidence?.nodes?.[0], impermitted,
    "a witness that still named the repaired service would mean the repair did not take");

  // ---------------------------------------------------------------------------------------------
  // AND HERE IS WHERE STEP 8 STOPS, recorded as a divergence rather than worked around.
  //
  // A graph model's membership is its declared `entities:` list, and NO operation extends one.
  // `add-entity` puts the service in the identity namespace; `add-relation` accepts an endpoint
  // outside the membership with no finding; a fresh load of the exported bytes validates CLEAN. So
  // the two consumers of the same revision disagree: the ENGINE answers using the new edge — the
  // assertions above are its answer — while `buildScene` takes the declared membership as the scene
  // and draws neither the node nor the edge.
  //
  // For a student doing §9.4 Q5 that is the worst available shape of failure: the verdict changes
  // and the picture does not, which reads as a broken diagram rather than as a missing operation.
  //
  // WHICH SIDE IS WRONG IS A REAL FORK, and it is not this file's to settle:
  //   - membership is DERIVED from the relations, and `buildScene` should draw a declared edge; or
  //   - a relation whose endpoint is outside the membership is a well-formedness violation, and the
  //     operation set owes a way to extend a model — V3 today checks only that an endpoint is a
  //     declared SYSTEM entity (`src/validator/rules.ts:176`), which this state satisfies.
  // Either ruling makes the two assertions below fail, which is the point of writing them: closing
  // the gap is what deletes this block, and nothing else will.
  // ---------------------------------------------------------------------------------------------
  const model = ws.state.system.models.get("event-flow");
  assert.ok(model !== undefined);
  assert.ok(!model.entities.includes("debug"),
    "DIVERGENCE: no operation adds an entity to a graph model's membership, so the new service is "
    + "outside it — if this now passes, the fork above was settled and this block should go");

  const view = drawWith(ws.state.system, "event-flow", violated);
  const marked = new Set(assignments(view).map((a) => a.target));
  assert.ok(!marked.has("debug"),
    "DIVERGENCE: the breach's witness names a service the picture does not draw — step 8 of the "
    + "structural loop ('immediately see the property change') is unreachable for an edit that "
    + "introduces a service, because the answer moved and the diagram cannot show it");
  assert.ok(view.accessible.nodes.every((n) => n.id !== "debug"),
    "DIVERGENCE: the scene is the declared membership, so the added service is not a node");
});

test("a predecessors answer draws no hops, because its node order means nothing", () => {
  const system = messageBus();
  const res = answer(system, "who-subscribes-to-order-created");
  assert.equal(res.outcome, "holds");

  // The engine reports a SET as `shape: "path"` — the open gap this test records rather than hides.
  // The fixture layer compensates in its own vocabulary (`nodes_include`, not `path`); the renderer
  // cannot, because it is handed the shape the engine chose.
  assert.equal(res.evidence?.shape, "path",
    "recorded, not endorsed: a predecessors answer is a set and should not claim a path shape");

  // What the hop guard buys: no invented adjacency between two unordered members. Over
  // `event-propagation` the first two members happen to be adjacent, which is exactly the accident
  // that would have drawn one arrow as "hop 1 of the witness path".
  for (const model of system.models.keys()) {
    const view = drawWith(system, model, res);
    const hops = assignments(view).filter((a) => system.relations.some((r) => r.id === a.target));
    assert.deepEqual(hops, [], `${model}: a set has no hops to draw`);
  }
});
