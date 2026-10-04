/**
 * The lifecycle self-model's four load-bearing statements, each driven against a NEGATIVE CONTROL.
 *
 * **Why this file exists, when `test/model-coverage.test.ts` already answers every query here.**
 * That gate establishes verdict-sensitivity: each saved query was run and answered what it said it
 * would. It cannot distinguish a `refuted` earned by a guard from a `refuted` over a situation the
 * model cannot reach, and it cannot distinguish a `holds` invariant that constrains the composition
 * from one that no transition could violate. Those read as the same row. For a model whose whole
 * purpose is to state claims over interleavings, that difference is the claim.
 *
 * So each control here MUTATES `models/workbench-lifecycle.mage.yaml` in memory — one textual edit
 * that removes the mechanism the statement names — and asserts the verdict FLIPS. The pattern is
 * `test/import-graph.test.ts`'s, which injects a kernel-to-view import and asserts the catch, and
 * `validate.py --self-test`'s. A control that passes without the mutation having applied would be
 * worthless, so every mutation asserts its own match count before it is used, and every mutant is
 * asserted to LOAD with zero findings — otherwise a flipped verdict could be the engine declining a
 * broken file rather than finding a counterexample.
 *
 * **What this file does NOT establish, stated here because the number travels without the file.**
 * Nothing here compares the model to `src/`. The model's correspondence is asserted by reading on
 * 2026-10-04 and its own header names the three control-flow facts a real checker would have to
 * decide. A green run here says the model's statements have force WITHIN the model. It says nothing
 * about whether the model still describes the code.
 *
 * `validate.py` is NOT a second opinion on any of these, and that is a real difference from the
 * components model: it declines every behavioral query for scope — it has no exploration engine —
 * so the TypeScript engine is the only implementation that decides them. Its parity obligation here
 * is shape and meaning, not verdicts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse } from "yaml";
import { Workspace } from "../src/app/services.ts";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { compileSystem, defaultOptions, exploreSpace } from "../src/engine/explore.ts";
import { realPorts } from "../scripts/gen-example-coverage.ts";

const MODEL = "models/workbench-lifecycle.mage.yaml";

const source = (): string => readFileSync(MODEL, "utf8");

/**
 * Answer one saved query over a model's TEXT, through the facade the page uses.
 *
 * Through `Workspace` rather than `runQuery` directly, for `model-coverage`'s reason: a reader who
 * opens this model in the workbench gets the facade's answers, and a control that bypassed it would
 * hold the engine to the model while saying nothing about the application.
 */
function outcomeOf(text: string, queryId: string): string {
  const ws = new Workspace(realPorts);
  const loaded = ws.load(text);
  assert.ok(loaded.ok, `the model did not load: ${loaded.findings.map((f) => f.message).join("; ")}`);
  assert.deepEqual(loaded.findings, [],
    `the model loads with findings, so a verdict over it is not trustworthy: `
    + `${loaded.findings.map((f) => `${f.rule} ${f.where}: ${f.message}`).join("; ")}`);
  const saved = ws.state.system.queries.get(queryId);
  assert.ok(saved !== undefined,
    `\`${queryId}\` is not a saved query of this model. Either it was renamed or this control has `
    + `outlived its subject — and a control over a query nobody has passes by measuring nothing.`);
  return ws.query(saved.raw).outcome;
}

/**
 * One textual edit, asserted to apply exactly once.
 *
 * The count is checked rather than assumed. A mutation that matched nothing would leave the model
 * untouched, the verdict unchanged, and the failure would read as "the mechanism does not hold" —
 * which is the opposite of the truth and the hardest kind of red to diagnose.
 */
function mutate(text: string, from: string, to: string): string {
  const count = text.split(from).length - 1;
  assert.equal(count, 1,
    `the mutation's anchor appears ${count} time(s) in ${MODEL} and must appear exactly once. The `
    + `model was edited and this control no longer describes it:\n${from}`);
  return text.replace(from, to);
}

/** Both verdicts, so a failure says what moved rather than only that something did. */
function assertFlips(mutant: string, queryId: string, before: string, after: string): void {
  assert.equal(outcomeOf(source(), queryId), before,
    `\`${queryId}\` does not answer \`${before}\` at HEAD, so this control's baseline is wrong`);
  assert.equal(outcomeOf(mutant, queryId), after,
    `\`${queryId}\` still answers \`${before}\` after the mechanism it names was removed. The `
    + `statement is not held by that mechanism — it holds for some other reason, and the model is `
    + `claiming more than it establishes.`);
}

// ----------------------------------------------------------------------------------------------
// The space itself
// ----------------------------------------------------------------------------------------------

/**
 * The reachable set, pinned exactly.
 *
 * An EXACT number rather than a ceiling, for the reason `EXEMPTION_CEILING` is exact in
 * `model-coverage`: four composed machines over a five-value content domain could blow up, and a
 * generous bound would absorb a blow-up silently. A model edit that moves this is a deliberate act
 * and should have to say so here. Measured 2026-10-04; `examples/docable.mage.yaml` measures 39 at
 * the same commit, which is the scale this is meant to stay near.
 */
test("the lifecycle model's reachable set is small, complete, and has no dead end", () => {
  const compiled = compileSystem(canonicalize(parse(source())));
  assert.ok(compiled.ok, `the model does not compile: ${compiled.ok ? "" : compiled.refusal}`);
  const space = exploreSpace(compiled.value, defaultOptions());

  assert.equal(space.stopReason, "complete",
    "exploration did not finish, so every `refuted` in this model is bounded rather than exhaustive");
  assert.equal(space.statesExplored, 70,
    "the reachable configuration count moved. If the model was edited deliberately, update this "
    + "number and the measurement in PLAN.md §0.2a together; if it was not, four machines over a "
    + "shared finite domain just grew a case nobody intended.");
  assert.deepEqual(space.deadEnds, [],
    "a configuration has no enabled step. Every `refuted` above it is then partly an artefact of a "
    + "space that stops early — which is what `lifecycle-has-no-dead-end` asserts and this "
    + "cross-checks through the walk rather than through the query.");
});

// ----------------------------------------------------------------------------------------------
// Control 1 — the base check is what refuses a stale commit
// ----------------------------------------------------------------------------------------------

/**
 * Delete half of one base guard and both base statements fail at once.
 *
 * `commit_auth_0`'s guard is the pair `base: auth_0` + `workspace.serving: auth_0`. Dropping the
 * first leaves a commit that fires whenever auth_0 is serving, whatever base the agent captured —
 * which is `TransactionEngine.apply` with its stage-2 rejection deleted. Both of the author's named
 * claims go with it, and that they go TOGETHER is the finding: one guard holds both, so there is no
 * second mechanism quietly covering for it.
 */
test("control: without the base guard, a stale transaction commits", () => {
  const mutant = mutate(source(),
    `        sync: commit_auth_0
        requires:
          base: auth_0
          workspace.serving: auth_0`,
    `        sync: commit_auth_0
        requires:
          workspace.serving: auth_0`);

  assertFlips(mutant, "stale-base-commit", "refuted", "holds");
  assertFlips(mutant, "branch-base-never-commits-authoritatively", "refuted", "holds");
});

// ----------------------------------------------------------------------------------------------
// Control 2 — the repaint's atomicity is what keeps the presented answer current
// ----------------------------------------------------------------------------------------------

/**
 * Make the repaint a SEPARATE step and the presented answer goes stale.
 *
 * This is the model's version of a `Workspace` mutator that reassigns `#engine` without calling
 * `#emit()`, leaving a later paint to catch up. The mutation takes `presentation` out of
 * `concurrent_commit_auth_0`'s participant list and gives it a local `repaint` transition instead,
 * so the commit and the re-derivation become two steps with a configuration between them. That
 * intermediate configuration is the counterexample.
 *
 * It is the control the `presentation` machine's own comment promises, and the reason that machine
 * participates in every event rather than repainting on its own: a one-state machine whose invariant
 * cannot be violated by construction is indistinguishable, in a results table, from one that is
 * holding something.
 */
test("control: when the repaint is a separate step, an answer for the old revision is presented", () => {
  let mutant = mutate(source(),
    `  concurrent_commit_auth_0:
    participants: [second_author, workspace, presentation]`,
    `  concurrent_commit_auth_0:
    participants: [second_author, workspace]`);
  mutant = mutate(mutant,
    `      - from: painted
        to: painted
        sync: concurrent_commit_auth_0
        effects:
          answer_of: auth_1`,
    `      - from: painted
        to: painted
        label: repaint
        effects:
          answer_of: workspace.serving`);

  assertFlips(mutant, "presented-answer-is-current", "holds", "refuted");
});

// ----------------------------------------------------------------------------------------------
// Control 3 — restoring the parked engine is what keeps a discarded branch out
// ----------------------------------------------------------------------------------------------

/**
 * Let `discard_hypothesis` keep the branch and the discarded content serves authoritatively.
 *
 * `discardHypothesis`'s whole body is `#engine = #authoritative`. Removing the model's counterpart —
 * the `serving: parked` effect — leaves the branch serving after a discard, which is the author's
 * second named claim failing. Note what this control also shows: the claim is held by ONE assignment
 * in one method, not by anything structural about hypotheses.
 */
test("control: when a discard keeps the branch, its content serves authoritatively", () => {
  const mutant = mutate(source(),
    `        sync: discard_hypothesis
        effects:
          serving: parked
          parked: unset`,
    `        sync: discard_hypothesis
        effects:
          parked: unset`);

  assertFlips(mutant, "discarded-branch-content-serves", "refuted", "holds");
});

// ----------------------------------------------------------------------------------------------
// Control 4 — the vacuity witness has a control of its own
// ----------------------------------------------------------------------------------------------

/**
 * Serialize the other party behind the agent and the staleness window closes.
 *
 * `superseded-base-is-reachable` exists to stop `stale-base-commit: refuted` from being read as a
 * statement about an unreachable situation, so it needs a control as much as the claims do. Guarding
 * the concurrent commit on `transaction.state: idle` models the serialization the product does not
 * have — one writer at a time across the agent and human surfaces — and under it the window the two
 * named claims are about does not exist.
 *
 * That is not hypothetical arithmetic. The first draft of this model had three machines and no second
 * mutator, and this query came back `refuted`: the only committer was the transaction itself, so
 * nothing could move the system while it held a base. The measurement is what put `second_author` in
 * the file.
 */
test("control: if the other party could not commit concurrently, there would be no stale base", () => {
  const mutant = mutate(source(),
    `        sync: concurrent_commit_auth_0
        requires:
          serving: auth_0
        effects:
          serving: auth_1`,
    `        sync: concurrent_commit_auth_0
        requires:
          serving: auth_0
          transaction.state: idle
        effects:
          serving: auth_1`);

  assertFlips(mutant, "superseded-base-is-reachable", "holds", "refuted");
});

// ----------------------------------------------------------------------------------------------
// The mutation harness, checked against itself
// ----------------------------------------------------------------------------------------------

test("the mutation harness refuses an anchor that is not there exactly once", () => {
  // Without this, a model edit that renamed a guard would turn every control above into a no-op that
  // reports the mechanism failing. `mutate` is the only thing standing between that and a day lost.
  assert.throws(() => mutate("a b a", "a", "z"), /appears 2 time\(s\)/);
  assert.throws(() => mutate("a b", "q", "z"), /appears 0 time\(s\)/);
  assert.equal(mutate("a b", "a", "z"), "z b");
});
