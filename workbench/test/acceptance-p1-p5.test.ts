// The v0.2 behavioral acceptance suite: the five properties the specification names, asked
// end-to-end and answered by measurement.
//
// `DESIGN-v02-semantics-261004.md` §30 requires v0.2 to express at least five properties and calls
// the set "a beautiful semantic acceptance suite" (`:1112-1126`):
//
//   P1  committed is reachable
//   P2  refused is reachable
//   P3  stale-base transactions never commit
//   P4  disposed hypotheses never become authoritative
//   P5  every proposed transaction eventually commits or refuses
//
// P1 and P2 are ordinary behavioral reachability, P3 and P4 are safety LTL, P5 is liveness. Until
// the LTL product layer landed, none of the last three could be ASKED -- the formula compiled and no
// verdict came back. All five are asked here.
//
// ## Every verdict below was measured, and one contradicts the specification
//
// The method is the one §5.2 of `DESIGN-v02-ltl-foundation-261004.md` used by hand and the one this
// file automates: ask the question, read the answer, pin the answer. Not: read the expected verdict
// out of §30's prose and arrange for it to pass. The distinction earned itself on P5.
//
// **P5 is REFUTED, on both machines.** §30 lists it among the properties v0.2 should express without
// saying which way it goes; the spec's own header flags the verdict as an open tension
// (`DESIGN-v02-semantics-261004.md:22-27`) and leans toward refutation. §5.2 of the foundation
// measured `refuted` on the lifecycle model and ruled it the intended teaching outcome rather than a
// modeling error, for a reason that survives this file's own measurement: nothing in the product
// forces an agent that captured a base to ever decide, and MAGE assumes no fairness, so the trace
// that postpones the decision forever is as real as any other. The other four come back the way §30
// implies.
//
// ## The three traps, and what defends against each
//
//   **A vacuous pin.** `G ¬(A ∧ B)` holds for free when A is unreachable, and a results table cannot
//   tell that apart from a guard doing work. Two defenses, and the second is the real one. Every
//   universal property carries REACHABILITY WITNESSES establishing that each conjunct occurs on its
//   own, so only the combination is excluded. And every property that could go either way carries a
//   MUTATION CONTROL: one textual edit to the model in memory, removing the mechanism the property
//   names, after which the verdict must FLIP. A property whose verdict survives the removal of its
//   own mechanism is not held by that mechanism, and the pin is measuring something else.
//
//   **A verdict that is really a bound.** A truncated search under bounded `Coverage` is
//   `inconclusive`, never `holds` (`DESIGN-v02-requirements-261004.md` §3). Every answer here is
//   asserted `exhaustive`, and the three holding properties are additionally swept across every
//   limit from 1 to the full product with the requirement that a `holds` never arrives under a
//   truncation.
//
//   **Minimality assumed.** The P5 work found the LTL witness differs from the hand-derived one --
//   same verdict, different trace -- and recorded minimality as a non-goal. So no test here asserts
//   a particular counterexample. What each refutation asserts instead: the returned lasso is an
//   execution of the model and it violates the formula, re-decided by `counterexampleViolates`
//   through an evaluator that shares none of the product's machinery.
//
// ## Two machines, and why both
//
//   `models/workbench-lifecycle.mage.yaml` -- the fourth self-model, which §30 asks for by name
//   ("build it", `:1108`) and §5.2 calls the acceptance machine. Four composed machines, 70
//   reachable configurations, no dead end. It is the only one of the two that can express P4, because
//   it is the only one with a hypothesis branch.
//
//   `test/fixtures/examples/transaction-workspace/system.mage.yaml` -- the behavior flagship, whose machine is
//   §6's sketch with three additions each supplied by the specification itself: `reject` because
//   §30's P2 needs `refused` reachable and §6 has no edge into it, `refuse_stale` because P3 needs
//   staleness representable, and `await_adoption` because §27's counterexample needs a repeatable
//   configuration. Its own header predicted P5's verdict over it and named the edge that would carry
//   it; this file measures both halves of that prediction.
//
// Asking each property of BOTH machines where both can express it is not redundancy. §30's
// properties are claims about the PRODUCT, and two models of one product that disagreed about one of
// them would be a finding in a model -- which is the only way this suite can catch a model drifting
// away from what it describes.
//
// ## What this suite does NOT establish
//
// Nothing here compares either model to `src/`. A green run says the five properties have the stated
// verdicts WITHIN the models. Whether the models still describe the code is `test/model-coverage.ts`
// and the lifecycle model's own header's business, and it is asserted by reading rather than by a
// checker.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash } from "../src/ir/hash.ts";
import type { CanonicalSystem, Evidence, Outcome } from "../src/ir/types.ts";
import {
  compileSystem, DEFAULT_STATE_LIMIT, defaultOptions, exploreSpace,
} from "../src/engine/explore.ts";
import { runBehaviorQuery } from "../src/engine/behavior.ts";
import { compilePredicate } from "../src/engine/predicate.ts";
import {
  admitLtlProperty, exploreProduct, isStutterStep, runLtlProperty,
} from "../src/engine/ltl-product.ts";
import {
  alwaysOf, eventuallyOf, impliesOf, notOf, proposition, type ParsedFormula,
} from "../src/engine/ltl.ts";
import type { BehaviorForm, Predicate, Quantifier } from "../src/engine/types.ts";
import { configurationsOn, counterexampleViolates } from "./ltl-evidence.ts";

// ----------------------------------------------------------------------------------------------
// The two machines, read from disk every time
// ----------------------------------------------------------------------------------------------

const LIFECYCLE = "models/workbench-lifecycle.mage.yaml";
const WORKSPACE = "test/fixtures/examples/transaction-workspace/system.mage.yaml";

const source = (path: string): string => readFileSync(path, "utf8");
const systemOf = (text: string): CanonicalSystem => canonicalize(parse(text));
const model = (path: string): CanonicalSystem => systemOf(source(path));

// ----------------------------------------------------------------------------------------------
// Asking
// ----------------------------------------------------------------------------------------------

interface Answer {
  readonly outcome: Outcome;
  readonly coverageKind: string;
  readonly statesExplored: number;
  readonly refusal: string | null;
  readonly evidence: Evidence | null;
}

const ltl = (
  system: CanonicalSystem, formula: ParsedFormula, limit: number = DEFAULT_STATE_LIMIT,
): Answer => {
  const v = runLtlProperty(system, formula, "forall", systemHash(system), limit);
  return {
    outcome: v.result.outcome,
    coverageKind: v.result.coverage.kind,
    statesExplored: v.result.coverage.statesExplored,
    refusal: v.result.refusal,
    evidence: v.result.evidence,
  };
};

const shipped = (
  system: CanonicalSystem, form: BehaviorForm, quantifier: Quantifier,
  fields: Partial<{ target: Predicate; predicate: Predicate; avoid: Predicate }> = {},
): Answer => {
  const v = runBehaviorQuery(system, {
    form,
    target: fields.target ?? null,
    predicate: fields.predicate ?? null,
    avoid: fields.avoid ?? null,
    transition: null,
    limit: null,
  }, quantifier, systemHash(system));
  return {
    outcome: v.result.outcome,
    coverageKind: v.result.coverage.kind,
    statesExplored: v.result.coverage.statesExplored,
    refusal: v.result.refusal,
    evidence: v.result.evidence,
  };
};

/** `reach p` as the shipped form states it: existential, and the healthy answer is in the name. */
const reaches = (system: CanonicalSystem, target: Predicate): Answer =>
  shipped(system, "reach", "exists", { target });

/**
 * Every verdict this suite pins carries this. A `holds` under `bounded` coverage is a truncated
 * search reported as certainty, which is the defect the pin path shed in v0.2.
 */
function assertSettled(answer: Answer, where: string): Answer {
  assert.equal(answer.coverageKind, "exhaustive",
    `${where}: the verdict is \`${answer.outcome}\` under \`${answer.coverageKind}\` coverage. A ` +
    `bound is not an answer -- a truncated walk is \`inconclusive\`, never \`holds\`.`);
  assert.ok(answer.statesExplored > 0, `${where}: nothing was walked, so nothing was decided`);
  return answer;
}

/** Assert a refutation AND that the lasso it carries is an execution that violates the formula. */
function assertRefuted(
  system: CanonicalSystem, formula: ParsedFormula, where: string,
): Answer {
  const answer = assertSettled(ltl(system, formula), where);
  assert.equal(answer.outcome, "refuted", `${where}: expected refuted, got ${answer.outcome}`);
  assert.equal(counterexampleViolates(system, formula, answer.evidence), null,
    `${where}: the counterexample does not hold up under independent re-decision`);
  return answer;
}

function assertHolds(system: CanonicalSystem, formula: ParsedFormula, where: string): Answer {
  const answer = assertSettled(ltl(system, formula), where);
  assert.equal(answer.outcome, "holds", `${where}: expected holds, got ${answer.outcome}` +
    (answer.refusal === null ? "" : ` (${answer.refusal})`));
  assert.equal(answer.evidence, null,
    `${where}: a universal claim that holds has no counterexample to carry`);
  return answer;
}

// ----------------------------------------------------------------------------------------------
// The mutation harness: one textual edit, asserted to apply exactly once
// ----------------------------------------------------------------------------------------------

/**
 * The count is checked rather than assumed, the reason `test/lifecycle-model.test.ts` checks it: a
 * mutation that matched nothing leaves the model untouched and the verdict unchanged, and the
 * failure then reads as "the mechanism does not hold" -- the opposite of the truth, and the hardest
 * kind of red to diagnose.
 */
function mutate(text: string, path: string, from: string, to: string): string {
  const count = text.split(from).length - 1;
  assert.equal(count, 1,
    `the control's anchor appears ${count} time(s) in ${path} and must appear exactly once. The ` +
    `model was edited and this control no longer describes it:\n${from}`);
  return text.replace(from, to);
}

/**
 * The mutant must LOAD cleanly, or a flipped verdict could be the engine declining a broken file
 * rather than finding a counterexample.
 */
function mutantOf(path: string, edits: readonly (readonly [string, string])[]): CanonicalSystem {
  let text = source(path);
  for (const [from, to] of edits) text = mutate(text, path, from, to);
  const system = systemOf(text);
  const compiled = compileSystem(system);
  assert.ok(compiled.ok,
    `the mutant of ${path} does not compile, so a flipped verdict would say nothing about the ` +
    `mechanism: ${compiled.ok ? "" : compiled.refusal}`);
  return system;
}

/**
 * The control: remove the mechanism a property names, and the verdict must move.
 *
 * Both verdicts are asserted, so a failure says what moved rather than only that something did --
 * and the baseline assertion is what catches a control whose anchor still matches but whose subject
 * has changed underneath it.
 */
function assertFlips(
  path: string, formula: ParsedFormula, edits: readonly (readonly [string, string])[],
  before: Outcome, after: Outcome, mechanism: string,
): void {
  const base = ltl(model(path), formula);
  assert.equal(base.outcome, before,
    `at HEAD the property answers \`${base.outcome}\`, not \`${before}\`, so this control's ` +
    `baseline is wrong and the flip below would prove nothing`);
  const mutated = ltl(mutantOf(path, edits), formula);
  assert.equal(mutated.outcome, after,
    `removing ${mechanism} left the verdict at \`${mutated.outcome}\`. The property is not held ` +
    `by that mechanism -- it holds for some other reason, and the pin claims more than it ` +
    `establishes.`);
}

// ----------------------------------------------------------------------------------------------
// Vocabulary. Each machine's own names, not a shared abstraction over them.
// ----------------------------------------------------------------------------------------------

const eq = (ref: string, value: string | number | boolean): Predicate =>
  ({ kind: "atoms", atoms: [{ ref, op: "eq", value }] });
const anyOf = (...operands: readonly Predicate[]): Predicate => ({ kind: "any-of", operands });
const allOf = (...operands: readonly Predicate[]): Predicate => ({ kind: "all-of", operands });
const not = (operand: Predicate): Predicate => ({ kind: "not", operand });

/** `test/fixtures/examples/transaction-workspace` -- the §6 machine. */
const W = {
  state: "transaction-lifecycle.state",
  idle: eq("transaction-lifecycle.state", "idle"),
  proposed: eq("transaction-lifecycle.state", "proposed"),
  valid: eq("transaction-lifecycle.state", "valid"),
  committed: eq("transaction-lifecycle.state", "committed"),
  refused: eq("transaction-lifecycle.state", "refused"),
  baseStale: eq("transaction-lifecycle.base_current", false),
} as const;
const wDecided = anyOf(W.committed, W.refused);
/** P3's bad configuration in this machine's vocabulary: committed, against a base that has moved. */
const wStaleCommit = allOf(W.committed, W.baseStale);

/** `models/workbench-lifecycle` -- the fourth self-model. */
const L = {
  based: eq("transaction.state", "based"),
  committed: eq("transaction.state", "committed"),
  refused: eq("transaction.state", "refused"),
  authoritative: eq("workspace.state", "authoritative"),
  hypothetical: eq("workspace.state", "hypothetical"),
  servingBranch: eq("workspace.serving", "branch"),
  servingAdopted: eq("workspace.serving", "adopted"),
} as const;
const lDecided = anyOf(L.committed, L.refused);

/**
 * P3 over the lifecycle model, stated the way its own saved query states it: committed, and NOT one
 * of the four agreeing (base, committed_from) pairs. Complete by negating the agreements rather than
 * representative, so no disagreeing pair is missed.
 */
const lStaleCommit = allOf(L.committed, not(anyOf(
  ...["auth_0", "auth_1", "branch", "adopted"].map(
    (r) => allOf(eq("base", r), eq("committed_from", r))),
)));

/** P4's bad configuration: branch-derived content serving on the authoritative branch. */
const lDisposedServes = allOf(L.authoritative, L.servingBranch);

// ----------------------------------------------------------------------------------------------
// The formulas, each written once
// ----------------------------------------------------------------------------------------------

/** The dual `reach` is asked through: `reach p` holds exactly when `G ¬p` is refuted. */
const neverReaches = (p: Predicate): ParsedFormula => alwaysOf(notOf(proposition(p)));

/** Safety: the bad configuration never occurs. */
const never = (p: Predicate): ParsedFormula => alwaysOf(notOf(proposition(p)));

/** Liveness, §31's shape: `G(trigger → F decided)`. */
const eventuallyDecides = (trigger: Predicate, decided: Predicate): ParsedFormula =>
  alwaysOf(impliesOf(proposition(trigger), eventuallyOf(proposition(decided))));

// ----------------------------------------------------------------------------------------------
// The §9.1 bridge rows this suite uses
// ----------------------------------------------------------------------------------------------

/**
 * `reach p` holds ⟺ `G ¬p` refuted, and the counterexample's prefix is a `reach` witness.
 *
 * The second clause is what stops the equivalence passing while the lasso points at something else
 * entirely. It replaces a genuine-cycle assertion on these two properties, and deliberately: on the
 * transaction-workspace machine `committed` and `refused` are terminal, so the lasso's cycle is the
 * stutter at the halt. Demanding a real loop there would be demanding the model be different.
 */
function assertReachBridge(
  system: CanonicalSystem, target: Predicate, where: string,
): void {
  const form = assertSettled(reaches(system, target), `${where} (shipped \`reach\`)`);
  assert.equal(form.outcome, "holds", `${where}: \`reach\` answers ${form.outcome}`);
  const dual = assertRefuted(system, neverReaches(target), `${where} (LTL \`G ¬p\`)`);
  const compiled = compileSystem(system);
  assert.ok(compiled.ok, where);
  const satisfied = compilePredicate(compiled.value.scope, target);
  assert.ok(satisfied.ok, `${where}: the target does not compile: ${satisfied.ok ? "" : satisfied.refusal}`);
  assert.ok(configurationsOn(dual.evidence).some((c) => satisfied.value(c)),
    `${where}: \`G ¬p\` was refuted, but no configuration on the returned lasso satisfies p -- ` +
    `the counterexample is to some other claim and is not a reach witness`);
}

/**
 * `invariant p` ≡ `G p`, outcomes EQUAL -- the strongest row in the table, because both sides decide
 * the same universal claim and neither may be read as the other's approximation. The third reading,
 * `reach ¬p` refuted, is asserted alongside: three implementations, one answer.
 */
function assertSafetyBridge(
  system: CanonicalSystem, bad: Predicate, where: string,
): void {
  const ltlSide = assertHolds(system, never(bad), `${where} (LTL \`G ¬bad\`)`);
  const invariant = assertSettled(
    shipped(system, "invariant", "forall", { predicate: not(bad) }), `${where} (\`invariant\`)`);
  assert.equal(invariant.outcome, ltlSide.outcome,
    `${where}: \`invariant ¬bad\` says ${invariant.outcome} and \`G ¬bad\` says ${ltlSide.outcome}. ` +
    `The one-denotation rule makes a disagreement a defect in one of them.`);
  const reach = assertSettled(reaches(system, bad), `${where} (\`reach bad\`)`);
  assert.equal(reach.outcome, "refuted",
    `${where}: \`G ¬bad\` holds but \`reach bad\` says ${reach.outcome}`);
}

// ==============================================================================================
// P1 -- "committed is reachable"
// ==============================================================================================

test("P1 — committed is reachable, on both machines, and the LTL dual agrees", () => {
  // §30: "P1: committed is reachable" (`DESIGN-v02-semantics-261004.md:1114`). §30 also files P1
  // under "ordinary behavioral reachability" (`:1120`), so the shipped `reach` form is the primary
  // reading and the LTL dual is the cross-check.
  //
  // MEASURED 2026-10-04: `reach committed` holds on both; `G ¬committed` refuted on both.
  assertReachBridge(model(WORKSPACE), W.committed, "P1 on transaction-workspace");
  assertReachBridge(model(LIFECYCLE), L.committed, "P1 on the lifecycle model");
});

test("P1 is earned by the commit edge — delete it and committed stops being reachable", () => {
  // The control for a reachability property is the other direction from a safety property's: a
  // `reach ... holds` is self-evidencing (there is a witness path), so what wants proving is that
  // the machine is capable of the OTHER answer. It is, and one edge is what separates them.
  assertFlips(WORKSPACE, neverReaches(W.committed), [[
    `      - from: valid
        to: committed
        label: commit
        requires:
          base_current: true`,
    "      # the acceptance suite's P1 control deletes the commit edge here",
  ]], "refuted", "holds", "the only edge into `committed`");
});

// ==============================================================================================
// P2 -- "refused is reachable"
// ==============================================================================================

test("P2 — refused is reachable, on both machines, and the LTL dual agrees", () => {
  // §30: "P2: refused is reachable" (`:1115`).
  //
  // Worth stating because the specification got this one wrong about its own sketch: §5.3 of the
  // foundation measured that on §6's machine as drawn, `refused` has no incoming transition, so P2
  // would be REFUTED there. The shipped example adds `reject` and `refuse_stale` for exactly that
  // reason, and its header says so. So this pin is a pin on the ADDITIONS, and the control below is
  // what makes that visible instead of implied.
  //
  // MEASURED 2026-10-04: holds on both machines. On the lifecycle model `refuse` is unguarded, which
  // is faithful -- four of the pipeline's five refusal causes fire on a base that is current.
  assertReachBridge(model(WORKSPACE), W.refused, "P2 on transaction-workspace");
  assertReachBridge(model(LIFECYCLE), L.refused, "P2 on the lifecycle model");
});

test("P2 is earned by the two edges §30 required — delete both and §6's sketch comes back", () => {
  // Both, because either alone leaves the other route open. With neither, the machine is §6's
  // drawing: `refused` is declared and nothing enters it. That is the configuration §5.3 says the
  // specification was reasoning about, measured here rather than argued.
  assertFlips(WORKSPACE, neverReaches(W.refused), [
    [
      `      - from: proposed
        to: refused
        label: reject`,
      "      # the acceptance suite's P2 control deletes the reject edge here",
    ],
    [
      `      - from: valid
        to: refused
        label: refuse_stale
        requires:
          base_current: false`,
      "      # the acceptance suite's P2 control deletes the refuse_stale edge here",
    ],
  ], "refuted", "holds", "both edges into `refused`");
});

// ==============================================================================================
// P3 -- "stale-base transactions never commit"
// ==============================================================================================

test("P3 — stale-base transactions never commit: holds on both machines", () => {
  // §30: "P3: stale-base transactions never commit" (`:1116`), filed under safety LTL (`:1122`).
  //
  // The two machines represent staleness differently and both readings are pinned. The example
  // carries a boolean, `base_current`, which is the smallest domain that makes the question
  // decidable. The lifecycle model carries two content identities, `base` and `committed_from`, and
  // states the property as the negation of the four agreeing pairs -- so every disagreeing pair is
  // covered rather than a representative one.
  //
  // MEASURED 2026-10-04: holds on both, exhaustively, and all three readings agree.
  assertSafetyBridge(model(WORKSPACE), wStaleCommit, "P3 on transaction-workspace");
  assertSafetyBridge(model(LIFECYCLE), lStaleCommit, "P3 on the lifecycle model");
});

test("P3 is not vacuous — both halves of the bad configuration occur on their own", () => {
  // The defense against the first trap. `G ¬(committed ∧ stale)` holds for free in a machine where
  // nothing commits, or where the base never moves. Neither is this machine.
  const workspace = model(WORKSPACE);
  assert.equal(assertSettled(reaches(workspace, W.committed), "tx: committed occurs").outcome,
    "holds", "nothing commits, so P3 holds over an empty situation");
  assert.equal(assertSettled(reaches(workspace, W.baseStale), "tx: a stale base occurs").outcome,
    "holds", "the base never moves, so P3 holds over an empty situation");

  // On the lifecycle model the situation is sharper than either conjunct: the WINDOW between
  // capturing a base and deciding, with another party committing inside it. That is the model's own
  // `superseded-base-is-reachable`, and the lifecycle model's header records that it answered
  // `refuted` until a second mutator was added -- the vacuity this witness exists to exclude,
  // caught once already by measurement.
  const lifecycle = model(LIFECYCLE);
  assert.equal(
    assertSettled(reaches(lifecycle, allOf(L.based, eq("base", "auth_0"),
      eq("workspace.serving", "auth_1"))), "lc: the staleness window occurs").outcome,
    "holds",
    "the serving revision cannot move while a base is held, so P3 is about an impossible situation");
});

test("P3 is held by the base guard — remove it on either machine and the verdict flips", () => {
  // The example's guard is one line on the commit edge.
  assertFlips(WORKSPACE, never(wStaleCommit), [[
    `        label: commit
        requires:
          base_current: true`,
    "        label: commit",
  ]], "holds", "refuted", "the commit edge's `base_current` guard");

  // The lifecycle model's is four guards, one per revision, and the composition matters: the
  // `commit_auth_0` EVENT is guarded on both sides -- the transaction's `base` and the workspace's
  // `serving`. Removing the workspace side alone changes no verdict, because the transaction side
  // still pins `base` to the same value the workspace pins `serving` to. Measured, and the reason
  // this control cuts the `base` guard instead: that is the comparison P3 is about.
  assertFlips(LIFECYCLE, never(lStaleCommit), [[
    `        sync: commit_auth_0
        requires:
          base: auth_0
          workspace.serving: auth_0`,
    `        sync: commit_auth_0
        requires:
          workspace.serving: auth_0`,
  ]], "holds", "refuted", "`commit_auth_0`'s base check");
});

// ==============================================================================================
// P4 -- "disposed hypotheses never become authoritative"
// ==============================================================================================

test("P4 — disposed hypotheses never become authoritative: holds on the lifecycle model", () => {
  // §30: "P4: disposed hypotheses never become authoritative" (`:1117`), safety LTL (`:1122`).
  //
  // The model's vocabulary carries disposal in the CONTENT IDENTITY rather than in a flag, and its
  // header records why: a draft that used a `disposed` boolean reported a counterexample that was a
  // conflation of two hashes. So "disposed" is `serving: branch` -- the open branch's content -- and
  // "authoritative" is `workspace.state: authoritative`. The bad configuration is the conjunction.
  //
  // MEASURED 2026-10-04: holds, exhaustively over 70 configurations, and all three readings agree.
  assertSafetyBridge(model(LIFECYCLE), lDisposedServes, "P4 on the lifecycle model");
});

test("P4 is not vacuous — branch content does serve, and branch-derived content does become authoritative", () => {
  // The sharpest vacuity risk in the suite, because the naive reading of P4 would be satisfied by a
  // model that quarantines branch content entirely -- and that model would be FALSE of the product.
  // Three witnesses, and the third is the one that makes the refutation about disposal:
  const lifecycle = model(LIFECYCLE);
  assert.equal(
    assertSettled(reaches(lifecycle, L.authoritative), "lc: authoritative occurs").outcome, "holds");
  assert.equal(
    assertSettled(reaches(lifecycle, allOf(L.hypothetical, L.servingBranch)),
      "lc: branch content serves while the hypothesis is open").outcome,
    "holds", "branch content never serves at all, so P4 holds over an empty situation");
  assert.equal(
    assertSettled(reaches(lifecycle, allOf(L.authoritative, L.servingAdopted)),
      "lc: applied branch content becomes authoritative").outcome,
    "holds",
    "no branch-derived content reaches the authoritative branch, so P4 reads as 'branch content is " +
    "quarantined' -- which is not what the product does, and would make the pin a claim about the " +
    "model's poverty rather than about disposal");
});

test("P4 is held by the discard restoring the parked content — remove the restore and it flips", () => {
  // There are exactly two ways out of `hypothetical`: restore the parked content, or rename the
  // branch's content to `adopted`. P4 is the claim that neither leaves the OPEN branch's content
  // serving authoritatively. This control breaks the first one.
  assertFlips(LIFECYCLE, never(lDisposedServes), [[
    `        sync: discard_hypothesis
        effects:
          serving: parked
          parked: unset`,
    `        sync: discard_hypothesis
        effects:
          parked: unset`,
  ]], "holds", "refuted", "the discard's restore of the parked content");
});

test("P4 has NO reading over the transaction-workspace example, and the engine refuses rather than answering", () => {
  // The vacuity trap in its purest form, and the reason this test exists rather than a silent
  // omission. The example declares "undo, redo and the hypothesis branch" among its machine's
  // `omits`, so P4's subject is not in its vocabulary. Asked anyway, a checker has two options: say
  // `unlicensed` and name what is missing, or evaluate the unresolvable atom as false and answer
  // `holds` -- a property that passes while proving nothing, over a question that cannot arise.
  //
  // MEASURED 2026-10-04: `unlicensed`, nothing walked, and the refusal names the vocabulary.
  const workspace = model(WORKSPACE);
  for (const [description, bad] of [
    ["a machine the example does not declare", allOf(
      eq("workspace.state", "authoritative"), eq("workspace.serving", "branch"))],
    ["a variable the lifecycle machine does not declare", eq("transaction-lifecycle.disposed", true)],
    ["a state value the lifecycle machine does not declare", eq(W.state, "disposed")],
  ] as const) {
    const answer = ltl(workspace, never(bad));
    assert.equal(answer.outcome, "unlicensed",
      `P4 over ${description}: the engine answered \`${answer.outcome}\`. A property whose subject ` +
      `the model cannot name must be refused, not decided -- deciding it reports a verdict about a ` +
      `question that cannot arise.`);
    assert.equal(answer.coverageKind, "not-applicable");
    assert.equal(answer.statesExplored, 0,
      "nothing was walked, so nothing may be reported as walked");
    assert.ok((answer.refusal ?? "").length > 0,
      `P4 over ${description}: the refusal must name what is missing, or a reader cannot tell a ` +
      `gap in the model from a gap in the engine`);
  }
});

// ==============================================================================================
// P5 -- "every proposed transaction eventually commits or refuses"
// ==============================================================================================

test("P5 — REFUTED on both machines, which is not what §30's list implies", () => {
  // §30: "P5: every proposed transaction eventually commits or refuses" (`:1118`), liveness LTL
  // (`:1124`), inside a set the specification calls "a beautiful semantic acceptance suite".
  //
  // MEASURED 2026-10-04: `refuted`, exhaustively, on BOTH machines. Stated as a finding rather than
  // reconciled, which is this file's method. Why it is the right answer and not a defect:
  //
  //   §11 of the specification admits every execution of the transition system and assumes no
  //   fairness, so a response property can be refuted by a trace that postpones an enabled
  //   transition forever. On the example, `refuse_stale` or `commit` is available at every
  //   configuration of the counterexample's cycle and the trace never takes it. That is starvation,
  //   and under the normative semantics the trace is as real as any other.
  //
  //   §5.2 of the foundation ruled this the intended teaching outcome: "fixing" the model to make
  //   P5 hold would mean modeling a fairness guarantee the product does not have. The spec's own
  //   header already leans that way -- "a starvation counterexample a student can see is a stronger
  //   lesson than a property that quietly holds".
  //
  // Each refutation's lasso is re-decided independently, and no particular trace is asserted:
  // minimality is a non-goal and §5.2's hand-derived witness already differs from the engine's.
  assertRefuted(model(WORKSPACE),
    eventuallyDecides(W.proposed, wDecided), "P5 on transaction-workspace");
  assertRefuted(model(LIFECYCLE),
    eventuallyDecides(L.based, lDecided), "P5 on the lifecycle model");
});

test("P5's counterexample on the lifecycle model is a genuine cycle, and the §5.2 pair still agrees", () => {
  // §9.1 of the foundation closes by making a pair a standing obligation: "the
  // `repeatable-cycle`+`avoid` query and phi_P5 must agree forever." §5.2 ran that query by hand --
  // `target: based`, `avoid: {committed, refused}`, which is exactly a search for an execution that
  // reaches `based` and then loops forever without deciding -- and read `holds`. Both sides are
  // asserted here so they cannot drift apart silently.
  //
  // The avoid-restricted query is strictly STRONGER than ¬φ_P5: it forbids a decision on the prefix
  // too. So its witness is a fortiori a P5 counterexample, and the two answering differently would
  // be a defect in one of them.
  const system = model(LIFECYCLE);
  const answer = assertRefuted(system, eventuallyDecides(L.based, lDecided), "P5 §9.1 pair");
  const hand = assertSettled(
    shipped(system, "repeatable-cycle", "exists", { target: L.based, avoid: lDecided }),
    "P5 §5.2's hand-run query");
  assert.equal(hand.outcome, "holds",
    "the `repeatable-cycle` + `avoid` query of §5.2 no longer answers `holds`, so the pair §9.1 " +
    "makes a standing obligation has come apart");

  // §9.4 asks for the counterexample to be a genuine cycle by name. Two ways, because either alone
  // is weak: the model has no dead end for a stutter to sit on, and no step of the returned cycle
  // is one.
  const compiled = compileSystem(system);
  assert.ok(compiled.ok);
  assert.deepEqual([...exploreSpace(compiled.value, defaultOptions()).deadEnds], [],
    "the lifecycle model has no dead end, so no counterexample over it may stutter");
  const cycle = answer.evidence?.cycle ?? [];
  assert.ok(cycle.length > 0, "a liveness counterexample needs a cycle");
  assert.deepEqual(cycle.filter(isStutterStep), [],
    "the P5 counterexample must be a real loop, not a halt dressed as one");
  // `label` rather than `label ?? sync`: a synchronized step carries the event name in BOTH, which
  // was measured rather than assumed, so the weaker disjunction would buy nothing and hide a step
  // that arrived with neither.
  assert.ok(cycle.every((s) => s.label !== null),
    "every step of the cycle is a transition the model declares and a student can point at");
});

test("P5 on transaction-workspace is caused by await_adoption, exactly as the example predicted", () => {
  // The example's own comment on that edge says: "when the LTL evaluator lands, §30's P5 [...] is
  // REFUTED over this machine, with this edge as the counterexample", and "a machine WITHOUT this
  // edge would silently assert that a validated change is adopted immediately, which is a claim
  // about scheduling that no part of this model is entitled to make."
  //
  // Both halves measured. The verdict is `refuted` (above), and deleting the edge flips it to
  // `holds` -- so the refutation is caused by that specific modeling decision and not by an
  // accident of the composition. This is the suite's strongest single control: it turns a comment
  // written before the evaluator existed into a checked claim.
  assertFlips(WORKSPACE, eventuallyDecides(W.proposed, wDecided), [[
    `      - from: valid
        to: valid
        label: await_adoption`,
    "      # the acceptance suite's P5 control deletes the await_adoption edge here",
  ]], "refuted", "holds", "the `await_adoption` edge");
});

test("P5 on the lifecycle model survives any single-edge removal — no one mechanism carries it", () => {
  // Declared rather than omitted, because an undeclared missing control and a forgotten one look
  // identical from a test list.
  //
  // §5.2's counterexample is the concurrent-commit loop: "the agent's transaction sits holding its
  // base while the second author commits forever." The engine returns a DIFFERENT cycle -- the
  // hypothesis open/apply loop -- and both are honest, which §5.2's own note about minimality
  // anticipated. What follows from there and is measured here: the lifecycle model admits more than
  // one starvation cycle, so no single-edge control can flip P5 over it, and an `assertFlips` for
  // this property would be measuring the wrong thing.
  //
  // Two attempts, for the record. Removing `apply_hypothesis`'s adopt effect leaves P5 refuted.
  // Removing one of `second_author`'s two edges does not even compile: V12 refuses a declared
  // participant that never participates, which is a model-validity guard rather than a semantic
  // one, and it closes that avenue structurally.
  const formula = eventuallyDecides(L.based, lDecided);
  const stillRefuted = ltl(mutantOf(LIFECYCLE, [[
    `        sync: apply_hypothesis
        effects:
          serving: adopted
          parked: unset`,
    `        sync: apply_hypothesis
        effects:
          parked: unset`,
  ]]), formula);
  assert.equal(stillRefuted.outcome, "refuted",
    "removing the apply's adopt effect flipped P5, so a single-edge control IS available for this " +
    "property and this test should become an `assertFlips` instead of a declaration");

  const halfSecondAuthor = systemOf(mutate(source(LIFECYCLE), LIFECYCLE,
    `      - from: ready
        to: ready
        sync: concurrent_commit_auth_0
      - from: ready
        to: ready
        sync: concurrent_commit_auth_1`,
    `      - from: ready
        to: ready
        sync: concurrent_commit_auth_0`));
  const refused = compileSystem(halfSecondAuthor);
  assert.equal(refused.ok, false,
    "removing one of `second_author`'s edges now compiles, so the second avenue is open and the " +
    "reason recorded here no longer holds");

  // And P5's refutation over this machine is, instead, pinned by the §5.2 pair and the independent
  // re-decision of its lasso -- both in the test above. The absence of a flip control is a fact
  // about the model having several starvation cycles, not a gap in the pin.
  assert.equal(
    assertSettled(shipped(model(LIFECYCLE), "repeatable-cycle", "exists",
      { target: L.based, avoid: lDecided }), "P5 fallback oracle").outcome,
    "holds");
});

test("P5's starvation shape has a shipped-form reading on the example, and the two agree", () => {
  // The example ships `validated-transaction-can-wait-indefinitely` -- `repeatable-cycle` on
  // `valid` -- precisely because it could not ask P5 when it landed. Its header calls that the
  // honest half: "the counterexample's configuration is reachable, and the temporal claim it would
  // refute is not yet expressible."
  //
  // Now both are expressible, and the §9.1 cycle row joins them: `repeatable-cycle t` holds ⟹
  // `F G ¬t` refuted. Asserting the pair retires the example's caveat by measurement rather than by
  // editing its prose.
  const system = model(WORKSPACE);
  const waits = assertSettled(
    shipped(system, "repeatable-cycle", "exists", { target: W.valid }), "tx: cycle through `valid`");
  assert.equal(waits.outcome, "holds",
    "the configuration §27's counterexample sits in no longer repeats");
  assertRefuted(system, eventuallyOf(alwaysOf(notOf(proposition(W.valid)))),
    "tx: `F G ¬valid`, the bridge of the above");

  // The companion the example ships for contrast: `base_advances` is also a self-loop and is NOT
  // repeatable, because it advances a bounded variable. Same form, same machine, opposite answer --
  // and the LTL side must invert with it, or the bridge is reading edges where it should read
  // configurations.
  const advances = assertSettled(
    shipped(system, "repeatable-cycle", "exists", { target: W.proposed }), "tx: cycle through `proposed`");
  assert.equal(advances.outcome, "refuted");
  assertHolds(system, eventuallyOf(alwaysOf(notOf(proposition(W.proposed)))),
    "tx: `F G ¬proposed`, the bridge of the above");
});

// ==============================================================================================
// Suite-level obligations
// ==============================================================================================

test("no acceptance verdict is a bound reported as certainty — every limit, every holding property", () => {
  // The second trap, defended on the real subjects rather than on hand fixtures. `test/
  // ltl-product.test.ts` sweeps this over the §9.4 machines; what it cannot say is anything about
  // the three universal properties this suite pins, whose products are two orders of magnitude
  // larger. A `holds` under `bounded` coverage here would be a universal claim about a product the
  // walk never finished, which is the defect the pin path shed in v0.2.
  const subjects: readonly (readonly [string, CanonicalSystem, ParsedFormula])[] = [
    ["P3 on transaction-workspace", model(WORKSPACE), never(wStaleCommit)],
    ["P3 on the lifecycle model", model(LIFECYCLE), never(lStaleCommit)],
    ["P4 on the lifecycle model", model(LIFECYCLE), never(lDisposedServes)],
  ];
  // MEASURED 2026-10-04, and asserted exactly rather than as "not holds": across the three
  // products (8, 70, 70 states) every one of the 145 truncated runs answers
  // `inconclusive`/`bounded`, and `holds`/`exhaustive` arrives only at the full product. A weaker
  // assertion would pass on an engine that answered `refuted` under truncation, which would be a
  // different and equally authoritative lie.
  let truncations = 0;
  for (const [where, system, formula] of subjects) {
    const admission = admitLtlProperty(system, formula, "forall", systemHash(system));
    assert.ok(admission.admitted, where);
    const full = exploreProduct(admission.plan.compiled, admission.plan.property,
      admission.plan.automaton, DEFAULT_STATE_LIMIT);
    for (let limit = 1; limit < full.states.length; limit += 1) {
      truncations += 1;
      const answer = ltl(system, formula, limit);
      assert.equal(answer.outcome, "inconclusive",
        `${where} at limit ${limit} of ${full.states.length}: a walk that could not finish the ` +
        `product answered \`${answer.outcome}\`. Only \`inconclusive\` is honest there.`);
      assert.equal(answer.coverageKind, "bounded",
        `${where} at limit ${limit}: coverage reads \`${answer.coverageKind}\` on a truncated walk`);
      assert.equal(answer.evidence, null,
        `${where} at limit ${limit}: an unsettled verdict carries evidence it cannot support`);
    }
    const settled = ltl(system, formula, full.states.length);
    assert.equal(settled.outcome, "holds",
      `${where}: at the full product the answer must be \`holds\`, or the sweep swept the wrong ` +
      `thing — it reported \`${settled.outcome}\``);
    assert.equal(settled.coverageKind, "exhaustive", where);
  }
  assert.ok(truncations > 100,
    `the sweep must actually truncate: ${truncations} truncated runs is not a sweep`);
});

test("§9.1's halt disjunct is exercised by a real machine, not only by a hand fixture", () => {
  // §9.4 of the foundation asks for "a dead end satisfying t" as a hand-written fixture, and
  // `test/ltl-bridge.test.ts` declares the halt disjunct UNEXERCISED by shipped SAVED QUERIES --
  // measured, and still true, because both shipped `repeatable-cycle` targets name states that are
  // never dead ends.
  //
  // The transaction-workspace machine supplies the case for real once the question is asked
  // directly: `committed` is terminal, this model follows one change rather than a session. So the
  // one sanctioned divergence in the bridge table appears on a shipped model. `repeatable-cycle
  // committed` is refuted on the un-closed graph -- there is no loop -- while `F G ¬committed` is
  // refuted too, because the stutter at the halt satisfies `G committed` forever. The biconditional
  // holds through its SECOND disjunct, and that is the row.
  const system = model(WORKSPACE);
  const compiled = compileSystem(system);
  assert.ok(compiled.ok);
  const space = exploreSpace(compiled.value, defaultOptions());
  const satisfied = compilePredicate(compiled.value.scope, W.committed);
  assert.ok(satisfied.ok);
  const halts = space.deadEnds.filter((i) => {
    const cfg = space.configs[i];
    return cfg !== undefined && satisfied.value(cfg);
  });
  assert.ok(halts.length > 0,
    "`committed` is no longer a reachable dead end on this machine, so this pin has lost its " +
    "subject and the halt disjunct is back to being fixture-only");

  const cycle = assertSettled(
    shipped(system, "repeatable-cycle", "exists", { target: W.committed }), "tx: cycle through `committed`");
  assert.equal(cycle.outcome, "refuted",
    "a loop through `committed` would make this the ordinary row rather than the halt one");
  assertRefuted(system, eventuallyOf(alwaysOf(notOf(proposition(W.committed)))),
    "tx: `F G ¬committed` at a halt");
});

test("all five properties are pinned, and each on a machine that can express it", () => {
  // The census, and the one row that is a finding rather than a verdict.
  //
  // A suite that silently narrowed its own subject set is the vacuous pass this repo keeps
  // rediscovering, so the five are listed with the machines each was asked against and the count is
  // asserted. P4's absence from the example is declared here, with its reason, rather than being
  // visible only as a missing line.
  const census: readonly (readonly [string, readonly string[], Outcome | "unlicensed"])[] = [
    ["P1 committed is reachable", [WORKSPACE, LIFECYCLE], "refuted"],
    ["P2 refused is reachable", [WORKSPACE, LIFECYCLE], "refuted"],
    ["P3 stale-base transactions never commit", [WORKSPACE, LIFECYCLE], "holds"],
    ["P4 disposed hypotheses never become authoritative", [LIFECYCLE], "holds"],
    ["P5 every proposed transaction eventually commits or refuses", [WORKSPACE, LIFECYCLE], "refuted"],
  ];
  assert.equal(census.length, 5, "§30 names five properties");

  // P1 and P2 are pinned through their LTL DUAL, so `refuted` above is the dual's verdict and the
  // reachability answer is `holds`. Spelled out because a census whose column means two things
  // depending on the row is worse than no census.
  const duals = new Set(["P1 committed is reachable", "P2 refused is reachable"]);
  for (const [name, machines, verdict] of census) {
    assert.ok(machines.length >= 1, `${name}: pinned against no machine`);
    assert.ok(
      duals.has(name) ? verdict === "refuted" : verdict === "holds" || verdict === "refuted",
      `${name}: ${verdict}`);
  }

  // P4's one-machine row, with its reason asserted rather than asserted-in-prose: the example's
  // machine declares the hypothesis branch among its omissions, so the property's subject is
  // genuinely not in its vocabulary.
  const exampleText = source(WORKSPACE);
  assert.match(exampleText, /omits:[\s\S]{0,600}?undo, redo and the hypothesis branch/,
    "the example no longer declares the hypothesis branch as an omission, so P4 may now have a " +
    "reading over it and this suite's one-machine row needs revisiting");
});
