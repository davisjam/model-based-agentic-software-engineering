// FR-A11Y-2: every fact the renderer would show visually must also exist as structure. These tests
// assert the STRUCTURE, not the prose -- the `text` field is a convenience, never the only carrier.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runQuery } from "../src/engine/index.ts";
import { docable, savedQuery } from "./engine-fixtures.ts";

const behavior = (
  quantifier: "exists" | "forall", form: string, extra: Record<string, unknown> = {},
): unknown => ({ kind: "behavior", quantifier, behavior: { form, ...extra } });

test("a counterexample narrates as ordered steps with per-reference deltas", () => {
  const s = docable();
  const { narration } = runQuery(s, savedQuery(s, "processing-implies-custody"));

  assert.equal(narration.outcome, "refuted");
  assert.equal(narration.headline, "Refuted.");
  assert.equal(narration.evidence?.role, "counterexample");

  const steps = narration.evidence?.steps ?? [];
  assert.ok(steps.length > 0);
  // Positions are 1-based and contiguous, because this is read aloud.
  assert.deepEqual(steps.map((st) => st.position), steps.map((_, i) => i + 1));

  // The joint step carries both movers and the event id as data, not only inside a sentence.
  const joint = steps.find((st) => st.sync === "acquire");
  assert.ok(joint, "the declared event never appears in the narration");
  assert.deepEqual([...joint.instances].sort(), ["document", "worker"]);
  assert.deepEqual(joint.changed, [
    { ref: "document.state", from: "waiting", to: "processing" },
    { ref: "worker.state", from: "idle", to: "held" },
  ]);
  // And the textual twin says the same thing.
  assert.match(joint.text, /move together on the declared event 'acquire', atomically/);
});

test("a lasso marks its repeating segment, so a cycle is legible without a diagram", () => {
  const s = docable();
  const { narration } = runQuery(s, savedQuery(s, "document-can-return-to-waiting"));
  assert.equal(narration.evidence?.shape, "lasso");
  const steps = narration.evidence?.steps ?? [];
  const repeating = steps.filter((st) => st.repeating);
  assert.ok(repeating.length > 0, "a lasso with no step marked repeating");
  // Prefix steps come first and are not marked; once the segment starts it never reverts, so a
  // reader can say "from here it repeats" rather than having to track a set of marked rows.
  const firstRepeating = steps.findIndex((st) => st.repeating);
  assert.ok(firstRepeating >= 0);
  assert.ok(steps.slice(0, firstRepeating).every((st) => !st.repeating));
  assert.ok(steps.slice(firstRepeating).every((st) => st.repeating));
  assert.equal(firstRepeating, steps.length - repeating.length);
  assert.match(narration.evidence?.summary ?? "", /A lasso: \d+ steps? to the target, then a \d+-step segment/);
  // The substitution disclosure travels with the narration, not only in the raw result.
  assert.ok(narration.disclosures.some((d) => /No configuration repeats/.test(d)));
});

test("bounded coverage narrates the V22 caveat explicitly", () => {
  const { narration } = runQuery(docable(), behavior("exists", "reach", {
    target: { "document.state": "published", "document.retry_count": 3 }, limit: 2,
  }));
  assert.equal(narration.outcome, "inconclusive");
  assert.match(narration.headline, /Inconclusive/);
  assert.match(narration.coverage, /Bounded/);
  assert.match(narration.coverage, /"not found in the explored region", not "does not exist"/);
});

test("exhaustive coverage narrates what was actually walked", () => {
  const s = docable();
  const { narration } = runQuery(s, savedQuery(s, "publish-requires-review"));
  assert.match(narration.coverage, /Exhaustive with respect to the question, after exploring \d+ configurations/);
});

test("a refusal narrates as a refusal, with no evidence block invented for it", () => {
  const s = docable();
  const { narration } = runQuery(s, savedQuery(s, "transitive-ownership"));
  assert.equal(narration.outcome, "unlicensed");
  assert.equal(narration.headline, "Not licensed by this model.");
  assert.equal(narration.evidence, null);
  assert.match(narration.refusal ?? "", /not licensed by this model/);
  assert.match(narration.coverage, /Coverage does not apply/);
});

test("graph evidence narrates as a readable node chain", () => {
  const { narration } = runQuery(docable(), {
    kind: "graph", quantifier: "exists",
    graph: { form: "path", relation: "may_invoke", from: "api", to: "gateway" },
  });
  assert.equal(narration.evidence?.shape, "path");
  assert.deepEqual(narration.evidence?.nodes, ["api", "remediation", "gateway"]);
  assert.match(narration.evidence?.summary ?? "", /A path of 2 relations: api -> remediation -> gateway\./);
});

test("every narration carries the question asked and the system it describes", () => {
  const s = docable();
  for (const id of [...s.queries.keys()]) {
    const { narration } = runQuery(s, savedQuery(s, id));
    assert.match(narration.systemHash, /^fnv1a64:/, id);
    assert.ok((narration.interpretedAs ?? "").length > 0, `${id} narrated without an interpretation`);
    assert.ok(narration.headline.length > 0, id);
    assert.ok(narration.coverage.length > 0, id);
  }
});
