// The walkthrough's conformance suite — the node-tier half.
//
// The walkthrough declares its steps in `src/learn/walkthrough.ts` and renders them in
// `walkthrough-view.ts`. The declarations carry GROUNDINGS: the example, model, machine, saved
// query, declared modification or capability service each step runs on, in the corpus's own
// spellings. This file resolves every grounding against the shipped corpus and re-performs the
// walkthrough's semantic drives headlessly, so a renamed query, a dropped modification or a
// changed verdict turns this tier red instead of leaving a step that renders nothing — the DOM
// half is `test/browser/learn-walkthrough.test.mjs`.
//
// What this file deliberately does NOT do: assert any outcome word as a literal of its own. Every
// expected outcome below is read back out of a fixture (`satisfied_when`, a modification's
// `from`/`to`) or out of the engine, so the suite cannot go on claiming a verdict the corpus
// stopped declaring.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { MODEL_TYPES } from "../src/engine/model-types.ts";
import { runQuery } from "../src/engine/index.ts";
import { Workspace, type Ports } from "../src/app/services.ts";
import { SHIPPED_EXAMPLE_IDS, type ShippedExampleId } from "../src/app/examples.ts";
import { CAPABILITIES } from "../src/app/capabilities.ts";
import { anchorForType, anchorForUse, MODEL_TYPE_USES } from "../src/app/learn.ts";
import type { LoadedSystems } from "../src/learn/content.ts";
import { fixturePathFor, readFixture, type LoadedFixtures } from "../src/learn/fixtures.ts";
import { QUESTION_ANCHORS } from "../src/learn/questions.ts";
import { GUIDE_ANCHORS } from "../src/learn/workbench-guide.ts";
import {
  LESSON, LESSON_ANCHOR, REFERENCE_ANCHOR, WALKTHROUGH_ANCHORS, WALKTHROUGH_GROUPS,
  WALKTHROUGH_STEPS,
  type StepGrounding,
} from "../src/learn/walkthrough.ts";

const systems: LoadedSystems = (() => {
  const map = new Map<ShippedExampleId, CanonicalSystem>();
  for (const id of SHIPPED_EXAMPLE_IDS) {
    map.set(id, Workspace.canonicalizeOnly(
      parse(readFileSync(`examples/${id}/system.mage.yaml`, "utf8"))));
  }
  return map;
})();

const fixtures: LoadedFixtures = (() => {
  const map = new Map<ShippedExampleId, ReturnType<typeof readFixture>>();
  for (const id of SHIPPED_EXAMPLE_IDS) {
    map.set(id, readFixture(id, readFileSync(fixturePathFor(id), "utf8")));
  }
  return map;
})();

const systemOf = (id: ShippedExampleId): CanonicalSystem => {
  const system = systems.get(id);
  assert.ok(system !== undefined, `example '${id}' did not load`);
  return system;
};

const groundings = (): readonly { readonly anchor: string; readonly g: StepGrounding }[] =>
  WALKTHROUGH_STEPS.flatMap((s) => s.grounding.map((g) => ({ anchor: s.anchor, g })));

// ----------------------------------------------------------------------------------------------
// Declaration shape
// ----------------------------------------------------------------------------------------------

test("walkthrough anchors are unique and disjoint from every other section family", () => {
  assert.deepEqual([...WALKTHROUGH_ANCHORS], WALKTHROUGH_STEPS.map((s) => s.anchor));
  assert.equal(new Set(WALKTHROUGH_ANCHORS).size, WALKTHROUGH_ANCHORS.length,
    "duplicate walkthrough anchor");
  const others = new Set<string>([
    LESSON_ANCHOR,
    REFERENCE_ANCHOR,
    ...MODEL_TYPES.map((t) => anchorForType(t.id)),
    ...MODEL_TYPE_USES.map((u) => anchorForUse(u.id)),
    ...GUIDE_ANCHORS,
    ...QUESTION_ANCHORS,
  ]);
  for (const anchor of WALKTHROUGH_ANCHORS) {
    assert.ok(!others.has(anchor), `'${anchor}' collides with another section family`);
  }
});

test("every step defines, instructs or reads, and links somewhere real on the page", () => {
  const targets = new Set<string>([
    REFERENCE_ANCHOR,
    ...MODEL_TYPES.map((t) => anchorForType(t.id)),
    ...MODEL_TYPE_USES.map((u) => anchorForUse(u.id)),
    ...GUIDE_ANCHORS,
    ...QUESTION_ANCHORS,
    ...WALKTHROUGH_ANCHORS,
  ]);
  for (const step of WALKTHROUGH_STEPS) {
    assert.ok(step.definition.length > 40, `'${step.anchor}' defines nothing`);
    assert.ok(step.grounding.length > 0, `'${step.anchor}' grounds nothing — a step with no example`);
    for (const m of step.more) {
      assert.ok(targets.has(m.anchor),
        `'${step.anchor}' links to '#${m.anchor}', which no section family declares`);
    }
  }
});

test("the lesson is short: the opening stays within the ruled word budget", () => {
  const words = LESSON.paragraphs.join(" ").split(/\s+/).filter((w) => w.length > 0).length;
  assert.ok(words >= 100 && words <= 400,
    `the lesson is ${words} words; the ruling is a 250-400-word OPENING, so the declared prose `
    + "must stay well inside 400 and cannot dwindle to a stub");
  assert.ok(LESSON.flow.length >= 3, "the flow graphic lost its terms");
});

// ----------------------------------------------------------------------------------------------
// Groundings resolve against the shipped corpus
// ----------------------------------------------------------------------------------------------

test("the group partition is total and disjoint: every step in exactly one group", () => {
  const grouped = WALKTHROUGH_GROUPS.flatMap((g) => [...g.anchors]);
  const steps = WALKTHROUGH_STEPS.map((s) => s.anchor);

  // Counted, not set-compared. A set comparison reports "none missing, none extra" while a step is
  // declared twice -- which is exactly how a duplicate anchor survived a first pass of this change.
  assert.equal(grouped.length, new Set(grouped).size,
    `an anchor appears in more than one group: `
    + `${grouped.filter((a, i) => grouped.indexOf(a) !== i).join(", ")}`);
  assert.equal(steps.length, new Set(steps).size,
    `a step anchor is declared twice: ${steps.filter((a, i) => steps.indexOf(a) !== i).join(", ")}`);

  assert.deepEqual([...grouped].sort(), [...steps].sort(),
    "every step must sit in exactly one group, and every group entry must name a real step");
  for (const g of WALKTHROUGH_GROUPS) {
    assert.ok(g.anchors.length > 0, `group '${g.title}' is empty`);
  }
});

test("the groups partition the steps in READING order, not merely as a set", () => {
  // The grid renders group by group with continuous numbering, so a group whose anchors are
  // scattered through the step list would number its tiles out of order. Membership alone cannot
  // catch that; contiguity can.
  const index = new Map(WALKTHROUGH_STEPS.map((s, i) => [s.anchor, i]));
  let expected = 0;
  for (const g of WALKTHROUGH_GROUPS) {
    for (const anchor of g.anchors) {
      assert.equal(index.get(anchor), expected,
        `group '${g.title}' expects '${anchor}' at step ${expected + 1}`);
      expected += 1;
    }
  }
  assert.equal(expected, WALKTHROUGH_STEPS.length);
});

test("every model card's Ask names a saved query the corpus declares and the engine answers", () => {
  const carded = WALKTHROUGH_STEPS.filter((s) => s.card !== undefined);
  assert.ok(carded.length > 0, "the model-form steps are supposed to carry cards");

  for (const step of carded) {
    const card = step.card;
    if (card === undefined) continue;
    const system = systemOf(card.ask.example);
    assert.ok(system.queries.has(card.ask.query),
      `'${step.anchor}' card asks '${card.ask.query}', which '${card.ask.example}' does not declare`);

    // The card renders the question's own LABEL, so a query without one would render its raw id.
    const result = runQuery(system, card.ask.query);
    assert.ok(result !== null,
      `'${step.anchor}' card asks '${card.ask.query}', which the engine does not answer`);

    // A card's Ask must also appear in the step's grounding, or the resolution test above never
    // sees it and a renamed query would break only the page.
    assert.ok(step.grounding.some(
      (g) => g.kind === "query" && g.query === card.ask.query && g.example === card.ask.example),
      `'${step.anchor}' card asks '${card.ask.query}' but does not ground it`);
  }
});

test("every grounding names a shipped artifact, in the corpus's own spelling", () => {
  for (const { anchor, g } of groundings()) {
    if (g.kind === "capability") {
      assert.ok(CAPABILITIES.some((c) => c.service === g.service),
        `'${anchor}' names service '${g.service}', which no capability declares`);
      continue;
    }
    const system = systemOf(g.example);
    switch (g.kind) {
      case "model":
        assert.ok(system.models.has(g.model), `'${anchor}': no model '${g.model}' in '${g.example}'`);
        break;
      case "machine":
        assert.ok(system.machines.has(g.machine),
          `'${anchor}': no machine '${g.machine}' in '${g.example}'`);
        break;
      case "query":
        assert.ok(system.queries.has(g.query),
          `'${anchor}': no saved query '${g.query}' in '${g.example}'`);
        break;
      case "modification": {
        const fixture = fixtures.get(g.example);
        assert.ok(fixture?.modifications.some((m) => m.id === g.modification),
          `'${anchor}': no declared modification '${g.modification}' in '${g.example}'`);
        break;
      }
      case "budget":
        assert.ok(system.quantitativeModels.has(g.dimension),
          `'${anchor}': '${g.example}' declares no ${g.dimension} quantitative model`);
        break;
      case "system":
        break;
    }
  }
});

test("the binding step's machine really declares the entity the step teaches", () => {
  const step = WALKTHROUGH_STEPS.find((s) => s.anchor === "walk-bindings");
  assert.ok(step !== undefined);
  const g = step.grounding.find((x): x is Extract<StepGrounding, { kind: "machine" }> =>
    x.kind === "machine");
  assert.ok(g !== undefined, "the binding step grounds no machine");
  const machine = systemOf(g.example).machines.get(g.machine);
  assert.ok(machine !== undefined);
  assert.ok(machine.entity !== null,
    "the machine declares no entity, so there is no machine-of-entity instance to show");
  assert.ok(systemOf(g.example).entities.has(machine.entity),
    `the machine's entity '${machine.entity}' is not a declared entity`);
});

test("the requirements step's example ships both polarities, which is the construct taught", () => {
  const fixture = fixtures.get("transaction-workspace");
  assert.ok(fixture !== undefined);
  const polarities = new Set(fixture.requirements.map((r) => r.satisfiedWhen));
  assert.ok(polarities.has("refuted") && polarities.has("holds"),
    "the step teaches the polarity rule with one requirement of each sign; the fixture no longer "
    + "ships both");
});

// ----------------------------------------------------------------------------------------------
// The semantic drives, performed headlessly
// ----------------------------------------------------------------------------------------------

const runSavedOf = (system: CanonicalSystem, id: string): ReturnType<typeof runQuery>["result"] => {
  const saved = system.queries.get(id);
  assert.ok(saved !== undefined, `no saved query '${id}'`);
  return runQuery(system, saved.raw).result;
};

test("the question and evidence steps: the saved query answers, with a witness trace", () => {
  const result = runSavedOf(systemOf("transaction-workspace"), "transaction-can-be-refused");
  assert.equal(result.outcome, "holds");
  assert.ok(result.evidence !== null, "the evidence step needs a witness to draw");
  assert.equal(result.evidence.role, "witness");
  assert.ok(result.evidence.steps.length > 0, "a witness trace with no steps draws nothing");
});

test("the boundary step: one question is refused by name, the contrast question is decided", () => {
  const system = systemOf("transaction-workspace");
  const refused = runSavedOf(system, "verdict-is-eventually-forced");
  assert.equal(refused.outcome, "unlicensed");
  assert.ok(refused.refusal !== null && refused.refusal.length > 0,
    "an unlicensed answer must carry the reason the step shows");
  const contrast = runSavedOf(system, "commit-without-validating");
  assert.notEqual(contrast.outcome, "unlicensed",
    "the contrast question must be DECIDED, or the step cannot distinguish refusal from refutation");
});

test("the composition step: both saved questions return magnitudes over the pipeline", () => {
  const system = systemOf("document-processing");
  for (const id of ["max-latency-of-any-execution", "max-latency-among-successful-executions"]) {
    const result = runSavedOf(system, id);
    assert.ok(result.magnitude !== null, `'${id}' returned no magnitude for the step to show`);
  }
});

/**
 * The what-if drive, exactly as the view performs it: a Workspace over the example's own text,
 * the fixture's declared operations as a hypothesis, each recorded change's `from` and `to`
 * asserted around it, and the discard asserted to restore the original verdicts.
 */
function driveModification(example: ShippedExampleId, modificationId: string): void {
  const noAnalysis = (): never => { throw new Error("no analysis in this drive"); };
  const ports: Ports = {
    engine: {
      graphQuery: (system, query) => runQuery(system, query).result,
      behaviorQuery: (system, query) => runQuery(system, query).result,
      explore: () => ({ configurations: [], exhaustive: false }),
    },
    analysis: { explore: noAnalysis, evaluateQuestion: noAnalysis, inFlight: () => [], cancel: () => {} },
    render: { render: () => { throw new Error("no rendering in this drive"); } },
  };
  const ws = new Workspace(ports);
  assert.ok(ws.load(readFileSync(`examples/${example}/system.mage.yaml`, "utf8")).ok);
  const fixture = fixtures.get(example);
  const mod = fixture?.modifications.find((m) => m.id === modificationId);
  assert.ok(mod !== undefined, `no modification '${modificationId}' in '${example}'`);

  const saved = (id: string): unknown => {
    const q = ws.state.system.queries.get(id);
    assert.ok(q !== undefined, `no saved query '${id}'`);
    return q.raw;
  };
  for (const c of mod.changes) {
    assert.equal(ws.query(saved(c.query)).outcome, c.from,
      `${example}/${c.query}: the pre-change outcome is not the fixture's 'from'`);
  }
  const opened = ws.openHypothesis(mod.label, {
    transaction: {
      base: ws.state.hash,
      ...(mod.rationale === null ? {} : { rationale: mod.rationale }),
      operations: mod.operations,
    },
  });
  assert.ok(opened.ok, `the hypothesis was rejected: ${opened.findings.map((f) => f.message).join("; ")}`);
  for (const c of mod.changes) {
    assert.equal(ws.query(saved(c.query)).outcome, c.to,
      `${example}/${c.query}: the post-change outcome is not the fixture's 'to'`);
  }
  assert.ok(ws.discardHypothesis());
  for (const c of mod.changes) {
    assert.equal(ws.query(saved(c.query)).outcome, c.from,
      `${example}/${c.query}: the discard did not restore the original outcome`);
  }
}

test("the what-if step: the shortcut flips both verdicts and the discard restores them", () => {
  driveModification("transaction-workspace", "commit-without-validating-shortcut");
});

test("the quantitative step: doubling the queue refutes the budget and the discard restores it", () => {
  driveModification("embedded-sensor-node", "double-the-telemetry-queue");
});
