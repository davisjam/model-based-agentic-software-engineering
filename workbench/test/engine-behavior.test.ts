// Behavioral queries. Two things these tests exist to defend: evidence SHAPE per form, and that a
// bounded search never, ever reads as "no".
import { test } from "node:test";
import assert from "node:assert/strict";
import { runQuery } from "../src/engine/index.ts";
import { build, docable, savedQuery } from "./engine-fixtures.ts";

const behavior = (
  quantifier: "exists" | "forall", form: string, extra: Record<string, unknown> = {},
): unknown => ({ kind: "behavior", quantifier, behavior: { form, ...extra } });

test("reach: the showcase question is refuted, exhaustively", () => {
  const s = docable();
  // "A document can be published without being reviewed." `published` is reachable only out of
  // `reviewed`, so avoiding `reviewed` makes it unreachable.
  const answer = runQuery(s, savedQuery(s, "publish-requires-review"));
  assert.equal(answer.result.outcome, "refuted");
  assert.equal(answer.result.coverage.kind, "exhaustive");
  assert.equal(answer.result.evidence, null);
});

test("reach: without the avoid clause the same target is reached, with a trace", () => {
  const answer = runQuery(docable(), behavior("exists", "reach", { target: { "document.state": "published" } }));
  assert.equal(answer.result.outcome, "holds");
  assert.equal(answer.result.evidence?.shape, "trace");
  assert.equal(answer.result.evidence?.role, "witness");
  const steps = answer.result.evidence?.steps ?? [];
  assert.ok(steps.length > 0);
  // A trace starts at the initial configuration and ends in the target.
  assert.equal(steps[0]?.from.control.get("document"), "waiting");
  assert.equal(steps[steps.length - 1]?.to.control.get("document"), "published");
});

test("invariant: a violated universal yields a COUNTEREXAMPLE, not an absence", () => {
  const s = docable();
  // "The document is never processing while the worker is idle" is REFUTED: acquire moves both,
  // then the worker releases on its own while the document is still processing.
  const answer = runQuery(s, savedQuery(s, "processing-implies-custody"));
  assert.equal(answer.result.outcome, "refuted");
  assert.equal(answer.result.evidence?.role, "counterexample");
  assert.equal(answer.result.evidence?.shape, "trace");
  const last = (answer.result.evidence?.steps ?? []).at(-1);
  assert.equal(last?.to.control.get("document"), "processing");
  assert.equal(last?.to.control.get("worker"), "idle");
});

test("invariant: a universal that holds is established by exhaustive satisfaction", () => {
  const answer = runQuery(docable(), behavior("forall", "invariant", {
    predicate: { "document.retry_count": { le: 3 } },
  }));
  assert.equal(answer.result.outcome, "holds");
  assert.equal(answer.result.coverage.kind, "exhaustive");
  assert.equal(answer.result.evidence, null);
});

test("recurrence means RE-ENTRY, with nothing disclosed -- it answers the question asked", () => {
  const s = docable();
  const answer = runQuery(s, savedQuery(s, "document-can-return-to-waiting"));
  assert.equal(answer.result.outcome, "holds");
  assert.equal(answer.result.evidence?.shape, "lasso");
  assert.ok((answer.result.evidence?.cycle ?? []).length > 0);
  // No configuration repeats here -- retry_count advances on the way back round -- but recurrence
  // does not ask about repeated configurations, so there is nothing to apologise for. An earlier
  // design searched for a true cycle first and disclosed the fallback; that let one query mean two
  // things depending on what the search found. Ruled 261002: a query denotes a question, not a
  // search strategy.
  assert.deepEqual(answer.result.compilation, [], "re-entry is the denotation, so no substitution note");
});

test("THE PAIR: the retry loop is re-entered (holds) but is NOT repeatable (refuted)", () => {
  // This is why the two forms exist. Same model, same target, two different engineering questions,
  // two different honest answers. If either form could return the other's answer, the distinction
  // the author insisted on would be lost.
  const s = docable();
  const target = { "document.state": "waiting" } as const;
  const reentry = runQuery(s, behavior("exists", "recurrence", { target }));
  const forever = runQuery(s, behavior("exists", "repeatable-cycle", { target }));
  assert.equal(reentry.result.outcome, "holds", "it demonstrably returns to waiting");
  assert.equal(forever.result.outcome, "refuted",
    "retry_count strictly advances, so no configuration repeats and it cannot loop indefinitely");
  assert.equal(forever.result.coverage.kind, "exhaustive",
    "refuted is only sound under exhaustive coverage");
});

test("repeatable-cycle: a genuine configuration cycle holds, with a lasso", () => {
  const answer = runQuery(build({
    machines: {
      m: {
        initial: "a", states: { a: null, b: null },
        transitions: [{ from: "a", to: "b", label: "out" }, { from: "b", to: "a", label: "back" }],
      },
    },
  }), behavior("exists", "repeatable-cycle", { target: { "m.state": "a" } }));
  assert.equal(answer.result.outcome, "holds");
  assert.equal(answer.result.evidence?.shape, "lasso");
  assert.deepEqual(answer.result.compilation, []);
});

test("repeatable-cycle without a target is UNLICENSED, not refuted", () => {
  const answer = runQuery(build({
    machines: { m: { initial: "a", states: { a: null }, transitions: [] } },
  }), behavior("exists", "repeatable-cycle", {}));
  assert.equal(answer.result.outcome, "unlicensed");
  assert.match(answer.result.refusal ?? "", /must carry a 'target' predicate/);
});

test("recurrence: a target that is never re-entered is refuted under exhaustive coverage", () => {
  const answer = runQuery(build({
    machines: { m: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b" }] } },
  }), behavior("exists", "recurrence", { target: { "m.state": "b" } }));
  assert.equal(answer.result.outcome, "refuted");
  assert.equal(answer.result.coverage.kind, "exhaustive");
});

test("deadend: a configuration with no enabled step is found, with the trace to it", () => {
  const answer = runQuery(docable(), behavior("exists", "deadend"));
  assert.equal(answer.result.outcome, "holds");
  assert.equal(answer.result.evidence?.shape, "trace");
  const last = (answer.result.evidence?.steps ?? []).at(-1);
  assert.ok(last, "a dead end with no trace to it");
});

test("deadend: a model where every configuration can step is refuted", () => {
  const answer = runQuery(build({
    machines: {
      m: {
        initial: "a", states: { a: null, b: null },
        transitions: [{ from: "a", to: "b" }, { from: "b", to: "a" }],
      },
    },
  }), behavior("exists", "deadend"));
  assert.equal(answer.result.outcome, "refuted");
});

test("transition-live: a named transition is witnessed by a trace ending in it", () => {
  const answer = runQuery(docable(), behavior("exists", "transition-live", {
    transition: { machine: "document", from: "failed", to: "waiting" },
  }));
  assert.equal(answer.result.outcome, "holds");
  const last = (answer.result.evidence?.steps ?? []).at(-1);
  assert.deepEqual(last?.instances, ["document"]);
  assert.equal(last?.from.control.get("document"), "failed");
  assert.equal(last?.to.control.get("document"), "waiting");
});

test("transition-live: a selector matching no declared transition is UNLICENSED, not refuted", () => {
  // Refuting would claim the transition is never executable. There is no such transition for the
  // claim to be about, which is a different thing and must read differently.
  const answer = runQuery(docable(), behavior("exists", "transition-live", {
    transition: { machine: "document", from: "published", to: "waiting" },
  }));
  assert.equal(answer.result.outcome, "unlicensed");
  assert.notEqual(answer.result.outcome, "refuted");
  assert.match(answer.result.refusal ?? "", /no declared transition matches/);
});

test("transition-live: a declared-but-unreachable transition IS refuted", () => {
  const answer = runQuery(build({
    machines: {
      m: {
        initial: "a", states: { a: null, b: null, c: null },
        // `b -> c` is declared, but `b` is never entered.
        transitions: [{ from: "a", to: "a" }, { from: "b", to: "c" }],
      },
    },
  }), behavior("exists", "transition-live", { transition: { from: "b", to: "c" } }));
  assert.equal(answer.result.outcome, "refuted");
  assert.equal(answer.result.coverage.kind, "exhaustive");
});

test("V22: a bounded search reads INCONCLUSIVE and never refuted", () => {
  const answer = runQuery(docable(), behavior("exists", "reach", {
    // Unreachable, so the walk cannot settle early and the limit decides.
    target: { "document.state": "published", "document.retry_count": 3 },
    limit: 2,
  }));
  assert.equal(answer.result.outcome, "inconclusive");
  assert.notEqual(answer.result.outcome, "refuted");
  assert.equal(answer.result.coverage.kind, "bounded");
  assert.equal(answer.result.coverage.reason, "state-limit");
  const disclosures = answer.result.compilation.map((c) => c.explanation).join(" ");
  assert.match(disclosures, /"not within the explored region", never "not at all"/);
});

test("a witness found inside a bound still settles the claim", () => {
  // The search was not truncated: it stopped because it had the answer. Reporting `inconclusive`
  // here would withhold a sound witness.
  const answer = runQuery(docable(), behavior("exists", "reach", {
    target: { "document.state": "processing" }, limit: 5,
  }));
  assert.equal(answer.result.outcome, "holds");
  assert.equal(answer.result.coverage.kind, "exhaustive");
  assert.ok(answer.result.coverage.statesExplored <= 5);
});

test("a quantifier that does not match the form is refused, with the pairing named", () => {
  const universal = runQuery(docable(), behavior("forall", "reach", { target: { "document.state": "published" } }));
  assert.equal(universal.result.outcome, "unlicensed");
  assert.equal(universal.refusal?.reason, "quantifier-mismatch");
  assert.match(universal.result.refusal ?? "", /Use quantifier: exists, or form: invariant/);

  const existential = runQuery(docable(), behavior("exists", "invariant", {
    predicate: { "document.state": "published" },
  }));
  assert.equal(existential.result.outcome, "unlicensed");
  assert.match(existential.result.refusal ?? "", /Use quantifier: forall, or form: reach/);
});

test("a mistyped state in a predicate is REFUSED, so a typo never reads as a sound 'refuted'", () => {
  const answer = runQuery(docable(), behavior("exists", "reach", { target: { "document.state": "publishd" } }));
  assert.equal(answer.result.outcome, "unlicensed");
  assert.notEqual(answer.result.outcome, "refuted");
  assert.match(answer.result.refusal ?? "", /'publishd' is not a declared state/);
  assert.match(answer.result.refusal ?? "", /Declared: failed, processing, published, reviewed, waiting/);
});

test("a reference to a multiply-instantiated machine is refused, not silently picked", () => {
  const s = build({
    machines: { w: { instances: 2, initial: "i", states: { i: null, h: null }, transitions: [{ from: "i", to: "h" }] } },
  });
  const ambiguous = runQuery(s, behavior("exists", "reach", { target: { "w.state": "h" } }));
  assert.equal(ambiguous.result.outcome, "unlicensed");
  assert.match(ambiguous.result.refusal ?? "", /v0\.1 has no participant selection \(V11\/V14\)/);
  assert.match(ambiguous.result.refusal ?? "", /Address an instance/);

  // Addressing an instance works, which is the occupancy question V14 says IS answerable.
  const addressed = runQuery(s, behavior("exists", "reach", { target: { "w[1].state": "h" } }));
  assert.equal(addressed.result.outcome, "holds");
});

test("V14's answerable occupancy question: can two instances be held at once?", () => {
  // Multiplicity gives occupancy, never binding. "Can two workers be held at the same time?" is a
  // predicate over the product with a witness trace, and it must come back `holds`.
  const answer = runQuery(build({
    machines: { w: { instances: 2, initial: "i", states: { i: null, h: null }, transitions: [{ from: "i", to: "h" }] } },
  }), behavior("exists", "reach", { target: { "w[0].state": "h", "w[1].state": "h" } }));
  assert.equal(answer.result.outcome, "holds");
  assert.equal(answer.result.evidence?.steps.length, 2);
});

test("a malformed or empty predicate is refused, never read as a vacuous truth", () => {
  for (const target of [{}, { "all-of": [] }, 7, "published"]) {
    const answer = runQuery(docable(), behavior("exists", "reach", { target }));
    assert.equal(answer.result.outcome, "unlicensed", `target ${JSON.stringify(target)} was accepted`);
    assert.match(answer.result.refusal ?? "", /must carry a 'target' predicate/);
  }
});

test("an order comparison on an unordered reference is refused citing V20", () => {
  const answer = runQuery(docable(), behavior("exists", "reach", {
    target: { "document.state": { gt: "reviewed" } },
  }));
  assert.equal(answer.result.outcome, "unlicensed");
  assert.match(answer.result.refusal ?? "", /no declared ordering/);
  assert.match(answer.result.refusal ?? "", /V20/);
});

test("avoid applies to the initial configuration too", () => {
  const answer = runQuery(docable(), behavior("exists", "reach", {
    target: { "document.state": "published" },
    avoid: { "document.state": "waiting" },
  }));
  assert.equal(answer.result.outcome, "refuted");
  assert.equal(answer.result.coverage.statesExplored, 0);
});

test("derived values are usable in a predicate and are never part of state identity", () => {
  const answer = runQuery(docable(), behavior("exists", "reach", { target: { "document.exhausted": true } }));
  assert.equal(answer.result.outcome, "holds");
  // `exhausted` is `retry_count == 3`, so the witness ends with the counter at its ceiling.
  const last = (answer.result.evidence?.steps ?? []).at(-1);
  assert.equal(last?.to.values.get("document.retry_count"), 3);
  // And it is NOT in the vector: only retry_count is.
  assert.deepEqual([...(last?.to.values.keys() ?? [])], ["document.retry_count"]);
});

test("every behavioral result names its system and the question it evaluated", () => {
  const answer = runQuery(docable(), behavior("exists", "reach", { target: { "document.state": "published" } }));
  assert.match(answer.result.systemHash, /^fnv1a64:[0-9a-f]{16}$/);
  assert.match(answer.result.interpretedAs ?? "", /Does there exist an execution reaching/);
});
