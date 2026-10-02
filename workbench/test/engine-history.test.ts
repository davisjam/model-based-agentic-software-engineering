// Past-time compilation. The disclosure (V23) and the hash are what these tests defend: a rewrite
// the user cannot see is a wrong answer about a different model.
import { test } from "node:test";
import assert from "node:assert/strict";
import { systemHash } from "../src/ir/hash.ts";
import { compileHistory, runPastTimeQuery } from "../src/engine/history.ts";
import type { PastTimeQuery } from "../src/engine/history.ts";
import type { Predicate } from "../src/engine/types.ts";
import { build, docable } from "./engine-fixtures.ts";

const atom = (ref: string, value: string): Predicate =>
  ({ kind: "atoms", atoms: [{ ref, op: "eq", value }] });

const publishedWithoutReview = (): PastTimeQuery => ({
  consequent: atom("document.state", "published"),
  antecedent: atom("document.state", "reviewed"),
  limit: null,
});

test("the rewrite adds the history variable to a NEW system, never the original", () => {
  const original = docable();
  const compiled = compileHistory(original, publishedWithoutReview());
  assert.ok(compiled.ok, compiled.ok ? "" : compiled.refusal);
  if (!compiled.ok) return;

  assert.equal(compiled.value.reference, "document.seen_reviewed");
  assert.ok(compiled.value.system.machines.get("document")?.variables.has("seen_reviewed"));
  // The IR is immutable: a transaction builds a new system and swaps it, and so does this.
  assert.equal(original.machines.get("document")?.variables.has("seen_reviewed"), false);
});

test("the flag is set on entry to the antecedent state, on every transition that enters it", () => {
  const compiled = compileHistory(docable(), publishedWithoutReview());
  assert.ok(compiled.ok);
  if (!compiled.ok) return;
  const document = compiled.value.system.machines.get("document");
  assert.ok(document);
  for (const t of document.transitions) {
    const writes = t.effects.some((e) => e.variable === "seen_reviewed");
    assert.equal(writes, t.to === "reviewed", `transitions[${t.index}] (${t.from} -> ${t.to})`);
  }
  // The document does not START in `reviewed`, so the flag starts false.
  assert.equal(document.variables.get("seen_reviewed")?.initial, false);
});

test("V23: the compilation is disclosed in the result, first", () => {
  const s = docable();
  const answer = runPastTimeQuery(s, publishedWithoutReview(), systemHash(s));
  const first = answer.result.compilation[0];
  assert.equal(first?.kind, "history-variable");
  assert.match(first?.explanation ?? "", /I added a history variable 'document\.seen_reviewed'/);
  assert.match(first?.explanation ?? "", /set to true on entry to 'document\.reviewed'/);
  // The cost of the rewrite is stated too, because the coverage figure is otherwise unreadable.
  assert.match(first?.explanation ?? "", /doubles the configuration space/);
});

test("the displayed interpretation states the SAFETY property, so `holds` reads correctly", () => {
  const s = docable();
  const answer = runPastTimeQuery(s, publishedWithoutReview(), systemHash(s));
  // `published` is reachable only out of `reviewed`, so the invariant holds and the past-time
  // answer is "no, it cannot". Printing the existential question beside `holds` would read as
  // exactly the opposite, which is why V21's displayed interpretation is load-bearing here.
  assert.equal(answer.result.outcome, "holds");
  assert.match(answer.result.interpretedAs ?? "", /cannot\s+occur unless/);
  assert.match(answer.result.interpretedAs ?? "", /'holds' means it cannot/);
});

test("a model where the consequent CAN occur unprecedented is refuted, with a counterexample", () => {
  const s = build({
    machines: {
      document: {
        initial: "waiting",
        states: { waiting: null, reviewed: null, published: null },
        transitions: [
          { from: "waiting", to: "reviewed", label: "review" },
          { from: "reviewed", to: "published", label: "publish" },
          // The shortcut that makes the past-time question interesting.
          { from: "waiting", to: "published", label: "publish-unreviewed" },
        ],
      },
    },
  });
  const answer = runPastTimeQuery(s, publishedWithoutReview(), systemHash(s));
  assert.equal(answer.result.outcome, "refuted");
  assert.equal(answer.result.evidence?.role, "counterexample");
  const last = (answer.result.evidence?.steps ?? []).at(-1);
  assert.equal(last?.to.control.get("document"), "published");
  assert.equal(last?.to.values.get("document.seen_reviewed"), false);
});

test("the result carries the ORIGINAL system's hash, not the rewritten one's", () => {
  const s = docable();
  const hash = systemHash(s);
  const compiled = compileHistory(s, publishedWithoutReview());
  assert.ok(compiled.ok);
  if (!compiled.ok) return;
  // The rewrite is a real semantic change, so its hash must differ...
  assert.notEqual(systemHash(compiled.value.system), hash);
  // ...and the result must still name the model the user actually has.
  assert.equal(runPastTimeQuery(s, publishedWithoutReview(), hash).result.systemHash, hash);
});

test("the auxiliary name never shadows the author's own vocabulary", () => {
  const s = build({
    machines: {
      m: {
        initial: "a",
        states: { a: null, b: null },
        variables: { seen_b: { type: "boolean", initial: false } },
        transitions: [{ from: "a", to: "b" }],
      },
    },
  });
  const compiled = compileHistory(s, {
    consequent: atom("m.state", "a"), antecedent: atom("m.state", "b"), limit: null,
  });
  assert.ok(compiled.ok);
  if (!compiled.ok) return;
  assert.equal(compiled.value.reference, "m.seen_b_2");
  assert.ok(s.machines.get("m")?.variables.has("seen_b"), "the author's variable must survive");
});

test("a machine starting IN the antecedent state starts with the flag already true", () => {
  const s = build({
    machines: { m: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b" }] } },
  });
  const compiled = compileHistory(s, {
    consequent: atom("m.state", "b"), antecedent: atom("m.state", "a"), limit: null,
  });
  assert.ok(compiled.ok);
  if (!compiled.ok) return;
  assert.equal(compiled.value.system.machines.get("m")?.variables.get("seen_a")?.initial, true);
});

test("an antecedent richer than one control-state atom is refused, with the restriction named", () => {
  const s = docable();
  for (const antecedent of [
    { kind: "atoms", atoms: [{ ref: "document.retry_count", op: "eq", value: 1 }] },
    { kind: "atoms", atoms: [
      { ref: "document.state", op: "eq", value: "reviewed" },
      { ref: "worker.state", op: "eq", value: "held" },
    ] },
    { kind: "not", operand: atom("document.state", "reviewed") },
  ] as Predicate[]) {
    const answer = runPastTimeQuery(
      s, { consequent: atom("document.state", "published"), antecedent, limit: null }, systemHash(s));
    assert.equal(answer.result.outcome, "unlicensed");
    assert.match(answer.result.refusal ?? "",
      /single control-state atom|not a control state|must equate a control state/);
  }
});

test("an antecedent naming an undeclared state is refused", () => {
  const s = docable();
  const answer = runPastTimeQuery(s, {
    consequent: atom("document.state", "published"),
    antecedent: atom("document.state", "approved"),
    limit: null,
  }, systemHash(s));
  assert.equal(answer.result.outcome, "unlicensed");
  assert.match(answer.result.refusal ?? "", /'approved' is not a declared state/);
});
