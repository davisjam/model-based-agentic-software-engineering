// Past-time compilation. The disclosure (V23) and the hash are what these tests defend: a rewrite
// the user cannot see is a wrong answer about a different model.
import { test } from "node:test";
import assert from "node:assert/strict";
import { systemHash } from "../src/ir/hash.ts";
import { compileHistory, runPastTimeQuery } from "../src/engine/history.ts";
import type { PastTimeQuery } from "../src/engine/history.ts";
import { absentSubstrateProse, modelTypeForQueryKind } from "../src/engine/model-types.ts";
import { runQuery } from "../src/engine/index.ts";
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

// ---------------------------------------------------------------------------------------------
// The substrate-absence rung, at the entry point that used to go around it
// ---------------------------------------------------------------------------------------------

/** Relation types and entities, no `machines:`. The half-authored middle of a session. */
const machineless = () => build({
  "relation-types": { may_invoke: { description: "d", composition: { path: "allowed" } } },
  entities: { api: null, gateway: null },
});

test("a past-time question over a machineless system names the absent type, not a reference", () => {
  // What this entry point did before the rung: `controlAtom` resolved the antecedent first and
  // refused with "'document.state' names nothing in this system" — a misspelling to go hunting for,
  // about a system that declares no machine for any state name to live in. That is the typo hunt
  // the rung replaces, and `runPastTimeQuery` was the last engine door around it: it compiles its
  // own behavioural query and calls `runBehaviorQuery`, so `runTypedQuery`'s consultation never ran.
  const s = machineless();
  const answer = runPastTimeQuery(s, publishedWithoutReview(), systemHash(s));
  const t = modelTypeForQueryKind("behavior");
  assert.equal(answer.result.outcome, "unlicensed");
  assert.equal(answer.refusal?.reason, "missing-model-type");
  assert.deepEqual(answer.refusal?.missing, [t.label]);
  assert.equal(answer.result.refusal, absentSubstrateProse(t),
    "the sentence must be the registry's own, so this door and the dispatcher agree word for word");
  assert.doesNotMatch(answer.result.refusal ?? "", /names nothing in this system/);

  // The rung outranks the rewrite as well as the reference: nothing was compiled, so nothing is
  // disclosed. A refusal carrying a history-variable explanation would describe a rewrite of a
  // machine that does not exist.
  assert.deepEqual(answer.result.compilation, []);
  assert.equal(answer.result.interpretedAs, null);
});

test("the rung is the same one the dispatcher reaches, asked through the other door", () => {
  // V32's rule, pointed inward: one model, one answer, whichever entry point asks. The dispatcher's
  // behavioural arm and the past-time compiler are two doors into the configuration space, and the
  // byte comparison is what holds them to one sentence rather than two wordings of one idea.
  const s = machineless();
  const hash = systemHash(s);
  const dispatched = runQuery(s, {
    kind: "behavior", quantifier: "exists", behavior: { form: "deadend" },
  });
  const pastTime = runPastTimeQuery(s, publishedWithoutReview(), hash);
  assert.equal(pastTime.refusal?.reason, dispatched.refusal?.reason);
  assert.equal(pastTime.result.refusal, dispatched.result.refusal);
});

test("a machine present still reaches the rewrite: the rung has not swallowed the feature", () => {
  // The control without which every assertion above would pass on a function that refused
  // everything. `docable` declares machines, so the compilation runs and is disclosed (V23).
  const s = docable();
  const answer = runPastTimeQuery(s, publishedWithoutReview(), systemHash(s));
  assert.notEqual(answer.refusal?.reason, "missing-model-type");
  assert.equal(answer.result.compilation[0]?.kind, "history-variable");
});
