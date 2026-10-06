// The transaction-workspace example as the LTL tutorial: §10's six questions, asked and answered by
// measurement.
//
// `DESIGN-v02-examples-and-semantic-completion-261004.md` §10 assigns this example six questions and
// two modifications, and §10.7 asks it to exercise safety LTL, liveness LTL, a counterexample and a
// pinned temporal property. Four of the six questions reach the engine through a saved query the
// example declares; two cannot, and that is the first thing to say.
//
// ## Why two of §10's questions are pinned here instead of saved in the example
//
// `BEHAVIOR_FORMS` lists six forms and none carries a formula. `mage-query.schema.json` has no
// formula field. `runLtlProperty` says of itself that it is "deliberately NOT wired into the query
// facade or the capability registry", because producing a verdict value and dispatching a saved
// query to it are separate decisions and the second one has not been designed. So Q4 and Q5 have a
// verdict path and no query surface.
//
// Writing `form: ltl` into the example would be inventing that surface inside an example, which
// §9.7 forbids by name: no example-specific evaluator logic. Nothing here adds any. Every verdict
// below comes out of `runLtlProperty` or `Workspace.query` -- the same two functions the acceptance
// suite and the application call -- and this file supplies formulas and reads answers.
//
// ## The method: measure, then pin. Never the other way round
//
// §30's P5 earned this rule. The specification's prose implied the response property should hold,
// measurement said `refuted`, and the refutation turned out to be the correct answer and the
// teaching outcome. So every verdict below was read off a run before it was written down, and where
// a measurement disagrees with §10's prose this file records the measurement and says so.
//
// Two such disagreements, both about §10.4 and both recorded in the example's own fixture:
//
//   §10.4 asks a student to ADD a lingering-in-validation transition and find that the response
//   property "becomes false". Over this machine it was false already -- `await_adoption` is such a
//   transition, in the adoption window -- so adding a validation retry loop alone moves the verdict
//   from `refuted` to `refuted`. Measured. The `linger-in-validation` modification therefore deletes
//   `await_adoption` first, and the three-stage chain below is what shows the property moving in
//   both directions.
//
//   §10.5 asks which existing property needs reconsidering after a retry edge. Two do, not one.
//
// ## What this file does NOT establish
//
// Nothing here is an argument that `refuted` is the RIGHT verdict for Q5. That argument is §11's --
// every execution admitted, no fairness assumed -- and `test/acceptance-p1-p5.test.ts` carries the
// control that ties the refutation to the `await_adoption` edge. This file's job is the example: the
// six questions a student is handed, the answers they get, and the evidence those answers carry.
import { test } from "node:test";
import assert from "node:assert/strict";
import { systemHash } from "../src/ir/hash.ts";
import type { CanonicalSystem, Evidence, EvidenceStep, Note, Outcome } from "../src/ir/types.ts";
import { stepConfigKey } from "../src/ir/types.ts";
import { runLtlProperty, isStutterStep } from "../src/engine/ltl-product.ts";
import {
  alwaysOf, eventuallyOf, impliesOf, notOf, proposition, type ParsedFormula,
} from "../src/engine/ltl.ts";
import type { Predicate } from "../src/engine/types.ts";
import { loadExample, type LoadedExample } from "../scripts/gen-example-coverage.ts";
import { counterexampleViolates } from "./ltl-evidence.ts";

const EXAMPLE = "transaction-workspace";
const example = (): LoadedExample => loadExample(EXAMPLE);

// ----------------------------------------------------------------------------------------------
// The machine's own vocabulary, and §10's two formulas over it
// ----------------------------------------------------------------------------------------------

const eq = (ref: string, value: string | number | boolean): Predicate =>
  ({ kind: "atoms", atoms: [{ ref, op: "eq", value }] });
const anyOf = (...operands: readonly Predicate[]): Predicate => ({ kind: "any-of", operands });
const allOf = (...operands: readonly Predicate[]): Predicate => ({ kind: "all-of", operands });

const state = (value: string): Predicate => eq("transaction-lifecycle.state", value);
const STALE = eq("transaction-lifecycle.base_current", false);
const DECIDED = anyOf(state("committed"), state("refused"));

/** §10's Q5, in §31's shape: `G(proposed -> F(committed or refused))`. */
const Q5: ParsedFormula =
  alwaysOf(impliesOf(proposition(state("proposed")), eventuallyOf(proposition(DECIDED))));

/**
 * §10's Q4 -- "once refused, can it later commit without being proposed again?" -- in the safety
 * formulation §10 asks for.
 *
 * `G(refused -> G not committed)` is the strong reading and the one this machine can carry: refused
 * is terminal, so "without being proposed again" is not a restriction that needs stating. Under the
 * retry modification the state becomes non-terminal and the formula goes false, which is exactly the
 * property §10.5 puts in question.
 */
const Q4: ParsedFormula = alwaysOf(impliesOf(
  proposition(state("refused")), alwaysOf(notOf(proposition(state("committed"))))));

// ----------------------------------------------------------------------------------------------
// Asking
// ----------------------------------------------------------------------------------------------

interface Answer {
  readonly outcome: Outcome;
  readonly coverageKind: string;
  readonly statesExplored: number;
  readonly evidence: Evidence | null;
}

const ltl = (system: CanonicalSystem, formula: ParsedFormula): Answer => {
  const r = runLtlProperty(system, formula, "forall", systemHash(system)).result;
  return {
    outcome: r.outcome, coverageKind: r.coverage.kind,
    statesExplored: r.coverage.statesExplored, evidence: r.evidence,
  };
};

/** A saved query, asked the way the application asks it. */
const saved = (ex: LoadedExample, id: string): Answer => {
  const declared = ex.workspace.state.system.queries.get(id);
  assert.ok(declared !== undefined,
    `the example no longer declares '${id}', which §10 needs a question for`);
  const r = ex.workspace.query(declared.raw);
  return {
    outcome: r.outcome, coverageKind: r.coverage.kind,
    statesExplored: r.coverage.statesExplored, evidence: r.evidence,
  };
};

/**
 * Every verdict this file pins carries this.
 *
 * A `holds` under `bounded` coverage is a truncated walk reported as certainty, and a run that
 * explored nothing decided nothing. Both are the failure modes a results table hides.
 */
function settled(answer: Answer, where: string): Answer {
  assert.equal(answer.coverageKind, "exhaustive",
    `${where}: the verdict is \`${answer.outcome}\` under \`${answer.coverageKind}\` coverage, ` +
    `which is a bound rather than an answer`);
  assert.ok(answer.statesExplored > 0, `${where}: nothing was walked, so nothing was decided`);
  return answer;
}

// ==============================================================================================
// Q1-Q3: the questions the example asks as saved queries
// ==============================================================================================

test("§10 Q1 and Q2 — both outcomes are admitted, each with a witness a student can read", () => {
  // §10.3: "Q1 Can Committed be reached? Q2 Can Refused be reached? ... These establish that both
  // outcomes are admitted." Existential reachability, and `examples.test.ts` already compares both
  // against the fixture. What is asserted HERE is the mapping -- that these two saved queries are
  // the ones answering §10's first two questions -- so deleting or renaming either is caught as a
  // gap in §10's coverage rather than only as a fixture mismatch.
  //
  // MEASURED 2026-10-04: holds, exhaustive, with a 3-step and a 2-step trace witness.
  const ex = example();
  for (const [question, id, finalState] of [
    ["Q1", "transaction-can-commit", "committed"],
    ["Q2", "transaction-can-be-refused", "refused"],
  ] as const) {
    const answer = settled(saved(ex, id), `§10 ${question}`);
    assert.equal(answer.outcome, "holds", `§10 ${question}: ${id} answers ${answer.outcome}`);
    assert.equal(answer.evidence?.shape, "trace", `§10 ${question}: a reachability witness is a trace`);
    assert.equal(answer.evidence?.role, "witness");
    assert.equal(answer.evidence?.steps.at(-1)?.to.control["transaction-lifecycle"], finalState,
      `§10 ${question}: the witness must END in ${finalState}, or it is evidence for another claim`);
  }
});

test("§10 Q3 — a stale-base change cannot commit, and the two polarities agree", () => {
  // §10.3's Q3 is "Can a stale-base transaction commit?", which is existential, and §10.7 files it
  // under safety LTL, which is universal. The example ships the universal form as a saved query
  // because that is what a requirement is judged against. All three readings are asked here, and a
  // disagreement between them would be a defect in one of them rather than something to reconcile.
  //
  // MEASURED 2026-10-04: refuted / holds / holds, every one exhaustive over 8 configurations.
  const ex = example();
  const universal = settled(saved(ex, "committed-base-is-current"), "§10 Q3 (`invariant`)");
  assert.equal(universal.outcome, "holds");
  assert.equal(universal.evidence, null, "a universal claim that holds has no counterexample to carry");

  const existential = settled(
    ltl(ex.workspace.state.system, alwaysOf(notOf(proposition(allOf(state("committed"), STALE))))),
    "§10 Q3 (LTL `G not(committed and stale)`)");
  assert.equal(existential.outcome, "holds",
    "`invariant not bad` holds and `G not bad` does not -- the one-denotation rule makes that a defect");

  // Non-vacuity, which is the part a results table cannot show: both halves of the bad configuration
  // occur on their own, so the guard on `commit` is what excludes the combination.
  assert.equal(settled(saved(ex, "transaction-can-commit"), "Q3 non-vacuity: committed occurs").outcome,
    "holds", "nothing commits, so Q3 holds over an empty situation");
  const staleOccurs = settled(ltl(ex.workspace.state.system,
    alwaysOf(notOf(proposition(STALE)))), "Q3 non-vacuity: a stale base occurs");
  assert.equal(staleOccurs.outcome, "refuted",
    "the base never moves, so Q3 holds over an empty situation");
});

// ==============================================================================================
// Q4: safety, the property §10.5 later takes away
// ==============================================================================================

test("§10 Q4 — once refused, a change never commits: HOLDS, carried by refused being terminal", () => {
  // §10.3's Q4: "Once a transaction is refused, can it later commit without being proposed again?
  // Use an appropriate safety formulation."
  //
  // MEASURED 2026-10-04: `holds`, exhaustively, over a 12-state product.
  const answer = settled(ltl(example().workspace.state.system, Q4), "§10 Q4");
  assert.equal(answer.outcome, "holds", `§10 Q4 answers ${answer.outcome}`);
  assert.equal(answer.evidence, null);

  // WHY it holds, asserted rather than asserted-in-prose: no transition leaves `refused`. That is
  // the mechanism, and `retry-after-refusal` below is the control -- add the edge and the verdict
  // moves. A safety property no modification can break may be holding for a reason nobody checked.
  const machine = example().workspace.state.system.machines.get("transaction-lifecycle");
  assert.ok(machine !== undefined);
  assert.deepEqual(machine.transitions.filter((t) => t.from === "refused"), [],
    "a transition now leaves `refused`, so Q4 is no longer carried by terminality and this test " +
    "is measuring something else");
});

// ==============================================================================================
// Q5 and Q6: liveness, and the execution that demonstrates the failure
// ==============================================================================================

/** The lasso's repeating portion, as a student reads it: the configurations the cycle revisits. */
const cycleLabels = (evidence: Evidence | null): readonly string[] =>
  (evidence?.cycle ?? []).map((s) => s.label ?? s.sync ?? "(no declared transition)");

/**
 * §6.7 and §24's shape obligation, as assertions.
 *
 * A counterexample to a liveness property is an INFINITE execution, and the only honest finite
 * presentation of one is a lasso: a prefix, then a cycle whose repetition is the rest of the trace.
 * Four things make the repeating portion identifiable, and the fourth is the one that stops a halt
 * being dressed as a loop.
 */
function assertReadableLasso(answer: Answer, where: string): readonly EvidenceStep[] {
  const evidence = answer.evidence;
  assert.ok(evidence !== null, `${where}: a refutation must carry the execution that breaks it`);
  assert.equal(evidence.shape, "lasso",
    `${where}: evidence shape is '${evidence.shape}'. An infinite counterexample presented as an ` +
    `ordinary finite trace tells a student the execution ends, and it does not.`);
  assert.equal(evidence.role, "counterexample");
  assert.ok(evidence.steps.length > 0, `${where}: the lasso needs a prefix reaching the cycle`);

  const cycle = evidence.cycle ?? [];
  assert.ok(cycle.length > 0, `${where}: the lasso's cycle is empty, so the trace is not infinite`);
  const first = cycle[0];
  const last = cycle[cycle.length - 1];
  assert.ok(first !== undefined && last !== undefined);
  assert.equal(stepConfigKey(first.from), stepConfigKey(last.to),
    `${where}: the cycle does not return to the configuration it left, so the repeating portion ` +
    `is not identifiable and the lasso is a fiction`);
  assert.equal(stepConfigKey(evidence.steps[evidence.steps.length - 1]?.to ?? first.from),
    stepConfigKey(first.from),
    `${where}: the prefix does not end where the cycle begins, so a reader cannot see where the ` +
    `repetition starts`);
  return cycle;
}

test("§10 Q5 — every proposed change eventually commits or refuses: REFUTED", () => {
  // §10.3's Q5, "the first explicit LTL activity", and §30's P5. §10 does not say which way it
  // goes; the specification's own header flags the verdict as an open tension and leans toward
  // refutation.
  //
  // MEASURED 2026-10-04: `refuted`, exhaustively, over a 13-state product. Recorded as the answer,
  // not reconciled with the prose. §11 admits every execution and assumes no fairness, so a trace
  // that postpones an enabled verdict forever is as real as any other -- and on the counterexample's
  // cycle a verdict IS enabled: the base has moved, so `refuse_stale` is available at every
  // configuration of the loop and the trace never takes it. That is starvation.
  const answer = settled(ltl(example().workspace.state.system, Q5), "§10 Q5");
  assert.equal(answer.outcome, "refuted", `§10 Q5 answers ${answer.outcome}`);
});

test("§10 Q6 — the counterexample is a lasso, re-decided independently, repeating step named", () => {
  // §10.3's Q6: "If the property fails, what execution demonstrates the failure? Show the
  // counterexample, not just refuted."
  //
  // MEASURED 2026-10-04, and the prefix is worth reading because it is not the obvious one: the
  // trace lets the base advance BEFORE validating, so it arrives in `valid` already stale.
  //
  //   prefix  idle --propose--> proposed --base_advances--> proposed --validate--> valid
  //   cycle   valid --await_adoption--> valid        (repeating forever)
  //
  // The step counts are not pinned and the trace is not pinned: minimality is a declared non-goal
  // of the LTL layer, and §5.2's hand-derived witness already differs from the engine's. What is
  // pinned is that the evidence is a readable lasso, that the repeating portion is a transition the
  // model declares, and that it holds up under an evaluator sharing none of the product's
  // machinery.
  const ex = example();
  const answer = settled(ltl(ex.workspace.state.system, Q5), "§10 Q6");
  assert.equal(answer.outcome, "refuted");
  const cycle = assertReadableLasso(answer, "§10 Q6");

  // Every repeating step is a transition the example wrote, so a student pointing at the loop is
  // pointing at a line in the file. The alternative -- a stutter step on a configuration with no
  // enabled move -- is the checker's trace domain rather than the model's, and it is a legitimate
  // cycle for other properties but not for this one: `valid` is not a halt.
  assert.deepEqual(cycle.filter(isStutterStep), [],
    "§10 Q6: the repeating portion is a halt dressed as a loop, not an execution that goes on");
  assert.deepEqual([...new Set(cycleLabels(answer.evidence))], ["await_adoption"],
    "§10 Q6: the repeating step is no longer `await_adoption`, so the example's own note and the " +
    "machine have come apart");

  // The independent re-decision: an execution of this model, and a word that violates this formula,
  // checked by `ltl-trace.ts`'s evaluator rather than by the product walk that produced it.
  assert.equal(counterexampleViolates(ex.workspace.state.system, Q5, answer.evidence), null,
    "§10 Q6: the counterexample does not hold up under independent re-decision");
});

// ==============================================================================================
// The example's prose and the measurement, held together
// ==============================================================================================

test("the example's temporal notes name the verdict that was measured", () => {
  // Two `kind: question` notes on `transaction-engine` carry Q4 and Q5 for a reader and for an agent
  // reading `inspect`. A note is prose: the schema says as much of `assumption`, and writing a
  // verdict into one does not check it. This is the check, and it is the reason the notes can be
  // trusted -- edit the machine so a verdict moves and the note goes red with it.
  const ex = example();
  const engine = ex.workspace.state.system.entities.get("transaction-engine");
  assert.ok(engine !== undefined, "the example must declare the entity the machine describes");
  // Annotated rather than inferred: `engine` is narrowed by an assertion, so a `const` derived from
  // it with no annotation makes its own type circular (TS7022) and tsc reports it as `any`.
  const notes: readonly Note[] = engine.annotation.notes;

  for (const [noteId, formula, where] of [
    ["eventual-verdict-is-refuted", Q5, "§10 Q5"],
    ["refusal-is-final-and-holds", Q4, "§10 Q4"],
  ] as const) {
    const note = notes.find((n) => n.id === noteId);
    assert.ok(note !== undefined,
      `the example no longer carries the '${noteId}' note, so ${where}'s verdict is nowhere a ` +
      `reader can see it`);
    assert.equal(note.kind, "question",
      `'${noteId}' is a ${note.kind}; a temporal property a reader is asked to check is a question`);
    const measured = settled(ltl(ex.workspace.state.system, formula), where).outcome;
    assert.match(note.text, new RegExp(`MEASURED ${measured}\\b`),
      `'${noteId}' does not record \`MEASURED ${measured}\`, which is what ${where} answers today. ` +
      `The note and the machine have come apart -- fix the note, never the measurement.`);
  }
});

// ==============================================================================================
// §10.4 -- reachability is not liveness, in three measured stages
// ==============================================================================================

/** Every state the machine declares except the initial one: §10.4's "ordinary destination states". */
const DESTINATIONS = ["proposed", "valid", "committed", "refused"] as const;

/** Open a declared modification on a fresh workspace, through the real hypothesis seam. */
function underModification(id: string): LoadedExample {
  const ex = example();
  const mod = ex.fixture.modifications.find((m) => m.id === id);
  assert.ok(mod !== undefined, `the fixture no longer declares the '${id}' modification`);
  const opened = ex.workspace.openHypothesis(mod.label, {
    transaction: {
      base: ex.workspace.state.hash, rationale: mod.rationale, operations: mod.operations,
    },
  });
  assert.ok(opened.ok,
    `${id}: the hypothesis was refused -- ${opened.findings.map((f) => f.message).join("; ")}`);
  return ex;
}

/** Every destination state reachable, which is the half §10.4 holds constant. */
function assertEveryDestinationReachable(ex: LoadedExample, where: string): void {
  for (const value of DESTINATIONS) {
    const answer = settled(
      ltl(ex.workspace.state.system, alwaysOf(notOf(proposition(state(value))))),
      `${where}: is ${value} reachable`);
    assert.equal(answer.outcome, "refuted",
      `${where}: '${value}' is NOT reachable, so §10.4's claim that reachability is unchanged is ` +
      `false here and the lesson is about something else`);
  }
}

test("§10.4 — reachability holds constant across all three stages while liveness moves twice", () => {
  // §10.4's lesson: "all ordinary destination states may still be reachable while the liveness
  // property becomes false. Reachability is not liveness."
  //
  // Three stages, because over THIS machine two are not enough. §10.4 assumes a baseline where the
  // response property holds; this machine's does not, because `await_adoption` is already a
  // lingering transition. So the chain is:
  //
  //   HEAD                       Q5 refuted   cycle = await_adoption   (the adoption window)
  //   force-immediate-adoption   Q5 holds     no counterexample
  //   linger-in-validation       Q5 refuted   cycle = revalidate       (the validation window)
  //
  // MEASURED 2026-10-04, all three, each exhaustive. And in every stage all four destination states
  // are reachable -- which is the whole of the lesson: nothing a reachability question can see moved
  // at any point in that chain.
  const head = example();
  const atHead = settled(ltl(head.workspace.state.system, Q5), "§10.4 at HEAD");
  assert.equal(atHead.outcome, "refuted");
  assert.deepEqual([...new Set(cycleLabels(atHead.evidence))], ["await_adoption"]);
  assertEveryDestinationReachable(head, "§10.4 at HEAD");

  const repaired = underModification("force-immediate-adoption");
  const afterDelete = settled(ltl(repaired.workspace.state.system, Q5), "§10.4 after the delete");
  assert.equal(afterDelete.outcome, "holds",
    "deleting `await_adoption` no longer makes the response property hold, so there is no baseline " +
    "for §10.4's modification to go false from");
  assertEveryDestinationReachable(repaired, "§10.4 after the delete");

  const lingering = underModification("linger-in-validation");
  const afterLinger = settled(ltl(lingering.workspace.state.system, Q5), "§10.4 after the retry loop");
  assert.equal(afterLinger.outcome, "refuted",
    "a transaction that can revalidate forever must refute the response property");
  const cycle = assertReadableLasso(afterLinger, "§10.4 after the retry loop");
  assert.deepEqual(cycle.filter(isStutterStep), []);
  assert.deepEqual([...new Set(cycleLabels(afterLinger.evidence))], ["revalidate"],
    "the counterexample's repeating step must now be the validation retry, or this stage is " +
    "re-finding the adoption window the previous stage deleted");
  assertEveryDestinationReachable(lingering, "§10.4 after the retry loop");

  // The counterexample moved windows: validation rather than adoption. Asserted on the final
  // configuration of the prefix rather than on its length, because the length is not the lesson.
  assert.equal(afterLinger.evidence?.cycle?.[0]?.from.control["transaction-lifecycle"], "proposed",
    "§10.4's counterexample must loop in the validating state, which is where the student put the edge");
});

test("§10.4's modification as the specification states it, measured — one edit cannot move Q5 here", () => {
  // The finding, kept as a test so it cannot be quietly forgotten the next time someone reads §10.4
  // and wonders why the shipped modification carries two operations.
  //
  // §10.4 says: add the lingering transition, recheck Q5. Done literally over this machine, Q5 goes
  // from `refuted` to `refuted` -- the verdict cannot "become false" because it already was. What
  // the single edit DOES move is the saved `base-can-keep-advancing`, from `refuted` to `holds`, and
  // the fixture's `linger-in-validation` records that change for exactly this reason.
  //
  // MEASURED 2026-10-04 by applying the add alone through the hypothesis seam.
  const ex = example();
  const opened = ex.workspace.openHypothesis("§10.4 literally", {
    transaction: {
      base: ex.workspace.state.hash,
      rationale: "§10.4 as written: add the lingering transition and nothing else",
      operations: [{
        op: "add-transition", machine: "transaction-lifecycle",
        from: "proposed", to: "proposed", label: "revalidate",
      }],
    },
  });
  assert.ok(opened.ok, `the single-edit hypothesis was refused: ${opened.findings.map((f) => f.message).join("; ")}`);

  const answer = settled(ltl(ex.workspace.state.system, Q5), "§10.4 literally");
  assert.equal(answer.outcome, "refuted",
    "the single edit now moves Q5, so this machine's baseline has changed and the shipped " +
    "`linger-in-validation` modification should drop its first operation");
  assert.deepEqual([...new Set(cycleLabels(answer.evidence))], ["await_adoption"],
    "the counterexample is still the adoption window's, which is why the single edit changes nothing " +
    "about Q5's verdict");
  assert.equal(saved(ex, "base-can-keep-advancing").outcome, "holds",
    "the lingering edge must make the validating configuration repeatable, or the single edit " +
    "changes no recorded answer at all");
});

// ==============================================================================================
// §10.5 -- the second modification, and the property it puts in question
// ==============================================================================================

test("§10.5 — a retry edge refutes TWO existing properties, and neither red is a defect", () => {
  // §10.3's Q4 is the property §10.5 is about: "which existing property now needs to be
  // reconsidered?" The intended answer is the once-refused-never-commits claim, and it is correct.
  //
  // MEASURED 2026-10-04: Q4 goes from `holds` to `refuted`, and the saved `base-can-keep-advancing`
  // goes from `refuted` to `holds` -- two properties, not the one §10.5 implies. The second is not a
  // distraction: `reject` followed by `retry` returns the machine to the configuration it left, so
  // the `proposed` configuration repeats for a reason that has nothing to do with the base advancing.
  //
  // §10.5's own instruction covers both: "Do not tell the student automatically that every red
  // property is a bug." A protocol admitting a retry has a different intended requirement.
  const ex = underModification("retry-after-refusal");
  const answer = settled(ltl(ex.workspace.state.system, Q4), "§10.5 Q4 under the retry");
  assert.equal(answer.outcome, "refuted", "the retry edge must take Q4 away");
  assert.equal(saved(ex, "base-can-keep-advancing").outcome, "holds",
    "the reject-then-retry loop must make the `proposed` configuration repeatable");

  // Q4's counterexample is the one shape a reader can misread, so it is asserted explicitly: the
  // trace commits and then HALTS, and the lasso's cycle is the checker repeating that halt rather
  // than a transition the example declares. The ruling that keeps every execution infinite is what
  // puts it there, the verdict discloses it, and presenting it as a declared loop would be a lie
  // about the model.
  const cycle = assertReadableLasso(answer, "§10.5 Q4 under the retry");
  assert.ok(cycle.every(isStutterStep),
    "Q4's counterexample loops on a declared transition, so this machine has gained an edge out of " +
    "`committed` and the reading below is wrong");
  assert.equal(cycle[0]?.from.control["transaction-lifecycle"], "committed",
    "the halt the counterexample repeats must be the commitment it was refuted by");
  assert.equal(counterexampleViolates(ex.workspace.state.system, Q4, answer.evidence), null,
    "§10.5: the counterexample does not hold up under independent re-decision");

  // And the properties the retry leaves alone, because "reconsider Q4" must not read as "reconsider
  // everything". A stale base still cannot commit: the guard on `commit` carries that, and nothing
  // here touches it.
  assert.equal(saved(ex, "committed-base-is-current").outcome, "holds",
    "the retry edge must not disturb the stale-base safety property");
  assert.equal(saved(ex, "commit-without-validating").outcome, "refuted",
    "the retry edge must not open a route into `committed` that avoids validation");
});

// ==============================================================================================
// The refused query, re-examined
// ==============================================================================================

test("`verdict-is-eventually-forced` is still refused, and not for the reason it shipped with", () => {
  // The brief for this wave asked the question directly: does the deliberately-refused query become
  // answerable now that the engine answers LTL?
  //
  // MEASURED 2026-10-04: no. It stays `unlicensed`, nothing walked, and the refusal names
  // `verdict-deadline`. The refusal is correct, and the REASON the example recorded for it was not:
  // it said the eventually-claim had no reading over this system. It has one -- that is Q5, measured
  // `refuted` above. What the query asks is whether a MECHANISM forcing the step exists, and the
  // model declares none. The LTL layer added a way to STATE a temporal claim; it did not add a
  // deadline machine to a model that has none.
  //
  // Both halves are asserted, because the pairing is the finding: the question the query gestures at
  // is answerable, and the query itself is not.
  const ex = example();
  const refused = saved(ex, "verdict-is-eventually-forced");
  assert.equal(refused.outcome, "unlicensed",
    "the refused query now answers -- the example's note about it must be rewritten, and the " +
    "`unlicensed` row in the coverage matrix may have lost its only instance");
  assert.equal(refused.coverageKind, "not-applicable");
  assert.equal(refused.statesExplored, 0, "nothing was walked, so nothing may be reported as walked");

  const forced = settled(ltl(ex.workspace.state.system, Q5), "the temporal claim it gestures at");
  assert.equal(forced.outcome, "refuted",
    "if the temporal claim held, the refused query's standing reason would be gone too");
});
