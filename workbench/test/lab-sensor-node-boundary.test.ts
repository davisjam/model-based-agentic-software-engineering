/**
 * THE SENSOR LAB'S EPISTEMIC BOUNDARY, PINNED AT THE SEAM.
 *
 * Section 11's lab culminates in a question the model cannot answer: it can compute its declared
 * allocation total ("what if everything is live at once") and cannot know whether all allocations
 * are simultaneously live, because it preserves no operating modes and no allocation lifetimes.
 * The behaviour that teaches that boundary is a REFUSAL THAT NAMES THE MISSING DISTINCTION — and
 * it is exactly the behaviour a future change could silently regress into a bare "unsupported
 * query". Nothing else pins it: `test/examples.test.ts` pins the four saved questions (all of
 * which hold), and the journey tier pins verdict transitions, so the refusal QUALITY on this
 * example was held by nobody before this file.
 *
 * Seam tier, not browser: the refusal prose is produced by the engine
 * (`src/engine/omission.ts` undeclared(), `src/engine/model-types.ts` missing-model-type) and
 * reaches both the human answer region and the agent surface through one Workspace — the sibling
 * browser file (`lab-sensor-node.test.mjs`) asserts the rendered reach; this file asserts the
 * semantics. Audit provenance: authored by the 261005 acceptance audit (Section H, Q12–Q14).
 *
 * One test below is a WANTED-behaviour pin and is RED at HEAD. It is marked in its name and kept
 * last in its describe block. Do not weaken it to green — see the audit report's "what I would
 * fix before class".
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Workspace } from "../src/app/services.ts";
import { realPorts } from "../scripts/gen-example-coverage.ts";

const HERE = import.meta.dirname;
const text = readFileSync(join(HERE, "..", "examples", "embedded-sensor-node", "system.mage.yaml"), "utf8");

/** 232 KB, 264 KB, 196 KB — in the memory dimension's base unit (MB, binary table: KB = 1/1024). */
const KB = (n: number): number => n / 1024;

let ws: Workspace;
const peakQuery = { kind: "quantity", quantifier: "exists", quantity: { metric: "peak_memory" } };

before(() => {
  ws = new Workspace(realPorts);
  const loaded = ws.load(text);
  assert.ok(loaded.ok, "the shipped sensor example no longer loads");
});

describe("the lab's computable half: the resident sum, answered and exact", () => {
  it("peak_memory ANSWERS over the one reachable configuration — the model-semantic peak", () => {
    const r = ws.query(peakQuery);
    assert.equal(r.outcome, "holds");
    assert.equal(r.refusal, null);
    assert.equal(r.magnitude?.value, KB(232), "the resident sum moved — retune the fixture or find the edit");
    assert.deepEqual(
      { kind: r.coverage.kind, states: r.coverage.statesExplored },
      { kind: "exhaustive", states: 1 },
      "with no state machine there is exactly ONE reachable configuration; a second one means "
      + "behaviour entered this example and the lab's climax (sum == peak is a coincidence of the "
      + "reduction) needs re-reading");
  });

  it("the interpretation sentence says what was computed, not what a reader might hope", () => {
    const r = ws.query(peakQuery);
    assert.match(r.interpretedAs ?? "", /peak memory\(c\) over reachable configurations/);
  });
});

describe("the boundary, exposed as an engineering object (Section H Q12-Q14)", () => {
  it("a question NAMING the omitted distinction earns the declared-modelling-decision refusal, "
    + "never a bare unknown-name", () => {
    const r = ws.query({
      kind: "graph", quantifier: "exists",
      graph: { form: "successors", relation: "operating_modes", from: "telemetry-queue" },
    });
    assert.equal(r.outcome, "unlicensed");
    const refusal = r.refusal ?? "";
    // The four load-bearing clauses, each asserted separately so a regression names its victim.
    assert.match(refusal, /declared modelling decision/,
      "the refusal no longer says the absence is a DECISION — this is the bare-'unsupported-query' "
      + "regression the lab cannot survive");
    assert.match(refusal, /operating modes, so no allocation's lifetime is represented/,
      "the refusal no longer quotes the author's own omission text");
    assert.match(refusal, /'sensor-firmware'/,
      "the refusal no longer names WHICH model declined, so a student cannot find where to add "
      + "the distinction");
    assert.match(refusal, /Answering would mean adding the distinction/,
      "the refusal no longer states the cost — that answering requires changing the model's purpose");
  });

  it("'is everything live at once' (a behaviour question) is refused by NAMING what to declare — "
    + "the Q14 follow-up is IN the refusal", () => {
    const r = ws.query({
      kind: "behavior", quantifier: "exists",
      behavior: { form: "reach", target: { "mode.state": "transmitting" } },
    });
    assert.equal(r.outcome, "unlicensed");
    assert.match(r.refusal ?? "", /declares no state machine/);
    assert.match(r.refusal ?? "", /declare a machine under `machines:`/,
      "the refusal stopped telling the student WHAT TO MODEL to make the question answerable");
  });

  it("check() on that behaviour question names the missing type AND the licensed alternatives", () => {
    const c = ws.check({
      kind: "behavior", quantifier: "exists",
      behavior: { form: "reach", target: { "mode.state": "transmitting" } },
    });
    assert.equal(c.outcome, "refused");
    assert.equal(c.refusal.reason, "missing-model-type");
    assert.deepEqual(c.refusal.missing, ["state machine"]);
    assert.ok(c.alternatives.length >= 2,
      "the check report stopped offering the question kinds this system DOES license");
  });

  it("a target on peak_memory is refused as a CATEGORY ERROR by name, never computed", () => {
    const r = ws.query({
      kind: "quantity", quantifier: "exists",
      quantity: { metric: "peak_memory", target: { "document.state": "published" } },
    });
    assert.equal(r.outcome, "unlicensed");
    assert.match(r.refusal ?? "", /category error/);
    assert.match(r.refusal ?? "", /configuration-scoped/);
  });

  /**
   * WANTED BEHAVIOUR — RED AT HEAD (261005). Pin of the fix, not of the present.
   *
   * The peak answer above is epistemically sound but silent about its premise: nothing in the
   * RESULT says the figure equals the resident sum because no lifetime is represented. The model's
   * own file says the pair out loud ("it answers 'what if everything is live at once', and it
   * cannot answer 'is everything live at once'"); the answer a student or agent actually receives
   * carries no trace of it. A compilation note is the engine's own channel for exactly this
   * (`vacuityNotes` uses it), so the wanted shape is: when a configuration-scoped metric is
   * evaluated over a system with NO machines, the result carries a note stating the boundary.
   */
  it("WANTED (red at HEAD): the peak answer states its own premise — no machines, so the peak IS "
    + "the resident sum and lifetimes are outside this model", () => {
    const r = ws.query(peakQuery);
    const notes = (r.compilation ?? []).map((n: { explanation: string }) => n.explanation).join(" | ");
    assert.match(notes, /resident|lifetime|operating mode|no state machine|single reachable configuration/i,
      "the measured figure arrives with no statement of the assumption that produced it; a reader "
      + "who does not already know the model has no machines reads 'peak' as the real-world peak");
  });
});

describe("the lab's modify-recheck-undo loop, exact at the seam", () => {
  it("double the telemetry queue: refuted by 8 KB; undo: restored", () => {
    const base = ws.query(peakQuery).systemHash;
    const tx = ws.transact({
      base,
      operations: [{ op: "set-quantity-value", id: "telemetry-queue-sram", value: "64 KB" }],
    });
    assert.ok(tx.ok, "the manifest's own modification no longer applies");
    const after = ws.runSavedQueries().get("sram-fits-budget");
    assert.equal(after?.outcome, "refuted");
    assert.equal(after?.magnitude?.value, KB(264));
    assert.equal(after?.evidence?.role, "counterexample");
    assert.ok(ws.undo());
    const restored = ws.runSavedQueries().get("sram-fits-budget");
    assert.equal(restored?.outcome, "holds");
    assert.equal(restored?.magnitude?.value, KB(232));
  });

  it("a hypothesis holds a candidate without losing the original (the Q6 search loop)", () => {
    const base = ws.query(peakQuery).systemHash;
    const h = ws.openHypothesis("half the weights", {
      base,
      operations: [{ op: "set-quantity-value", id: "model-weights-sram", value: "36 KB" }],
    });
    assert.ok(h.ok);
    const under = ws.runSavedQueries().get("sram-fits-budget");
    assert.equal(under?.outcome, "holds");
    assert.equal(under?.magnitude?.value, KB(196), "196 KB is 23.4% free — past the 20% the lab asks for");
    assert.ok(ws.discardHypothesis());
    assert.equal(ws.runSavedQueries().get("sram-fits-budget")?.magnitude?.value, KB(232),
      "discard did not restore the original figure");
  });
});
