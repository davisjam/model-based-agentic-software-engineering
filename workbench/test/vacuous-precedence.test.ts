// V43, amended — a vacuous answer under a bound is not told to raise the bound.
//
// The follow-up `DECISIONS-RULED-vacuity-budget-261005.md` §6.1 named and left. V43 ruled that an
// obligation decided by a vacuous answer is neither discharged nor breached, and that the rule reads
// the disclosure and never the coverage. V44 then made the disclosure budget-independent, which put
// a vacuous disclosure on a TRUNCATED result for the first time — and the projection dropped it.
// `evaluationOf`'s `exhausted` arm carried `limit` alone, so by the time `verify` saw the evaluation
// the only remedy left to name was the budget.
//
// Measured before the change: an unsatisfiable ceiling at `limit: 3` verified `inconclusive` with
// cause `bounded`, remedy "raise the bound". No bound makes an unreachable selection reachable, so
// the author was sent to buy more of the one thing that could not help. The STATUS was right all
// along and stays right — `inconclusive` at every budget — which is why a test over the status
// cannot tell this fix from no fix, and why every pin below asserts the CAUSE.
//
// Two facts about the shape of the fix, both pinned here:
//
//   - `verify` was already right where it looked. The `completed` arm has checked vacuity ahead of
//     both settled arms since V43. What was missing was any check at all on the `exhausted` arm, so
//     the precedence did not need reordering — it needed to apply to a second arm. It now sits ABOVE
//     the status switch, which is one site rather than two.
//   - The disclosure travels as the `Compilation` itself, following V43's precedent on the
//     `completed` arm, so the evaluator's own remedy sentence arrives with the cause. A boolean would
//     have arrived as a condition with nowhere to go, and one pin below fails on exactly that.
//
// ## What each pin catches, and the case where it passes while the property is violated
//
// Per-test, in a `VACUITY:` note — the discipline V43 and V44 set in this family, and the one this
// file is least entitled to skip. The two to read first:
//
//   - The over-firing control is the pin that matters. V44's whole finding was an evaluator firing
//     vacuity on the earned case, so a fix that made `exhausted` prefer vacuity unconditionally
//     would undo the work this builds on. Two pins hold that line, and the second raises the bound
//     and watches the answer settle — demonstrating that "raise the bound" was the correct remedy
//     there rather than asserting it.
//   - Coverage-independence would be agreement about nothing if the small budgets did not truncate,
//     so each row asserts its own coverage kind rather than trusting that `limit` still bites.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { runSavedQueries, verifySystemRequirements } from "../src/engine/index.ts";
import { compileSystem } from "../src/engine/explore.ts";
import { buildScope } from "../src/engine/refs.ts";
import { compilePredicate, satisfiability } from "../src/engine/predicate.ts";
import { parsePredicate } from "../src/engine/types.ts";
import { verify, type Requirement, type Verification } from "../src/engine/verification.ts";
import { evaluationOf, type Compilation, type QueryResult } from "../src/ir/types.ts";
import { exampleText } from "../scripts/gen-example-coverage.ts";

type Obj = Record<string, unknown>;
type Block = Record<string, Obj>;

const doc = (id: string): Obj => parse(exampleText(id)) as Obj;
const queriesOf = (d: Obj): Block => d["queries"] as Block;
const requirementsOf = (d: Obj): Block => d["requirements"] as Block;

/** One authored row, asserted PRESENT before it is read — V43's helper, same job. A probe reading
 * `undefined` carries its own assertion vacuously rather than reporting that the corpus moved. */
const row = (block: Block, key: string, what: string): Obj => {
  const found = block[key];
  assert.ok(found !== undefined, `${what}: no '${key}' — this probe's premise is stale`);
  return found;
};

/** Verify through the PRODUCTION join — the path a surface calls. V43's helper, same job. */
const verified = (d: Obj, id: string): Verification => {
  const v = verifySystemRequirements(canonicalize(d)).get(id);
  assert.ok(v !== undefined, `'${id}' is not among the system's requirements — the probe is wrong`);
  return v;
};

/**
 * The satisfiability the engine itself decides, looked up rather than asserted.
 *
 * Every pin here rests on a claim about whether a predicate is satisfiable in the state vector, and a
 * test that stated that claim in a comment would be pinning its own belief. V44's helper, reused for
 * its reason: this reads the discriminator the production path reads, so a pin cannot silently
 * describe the wrong case.
 */
const satisfiabilityOf = (d: Obj, rawTarget: unknown): string => {
  const system = canonicalize(d);
  const pred = parsePredicate(rawTarget);
  assert.ok(pred !== null, "the probe's target did not parse as a predicate");
  const scope = buildScope(system);
  const compiled = compilePredicate(scope, pred);
  assert.ok(compiled.ok, "the probe's target did not compile against the system's vocabulary");
  const space = compileSystem(system);
  assert.ok(space.ok, "the probe's system did not compile");
  return satisfiability(scope, pred, compiled.value, space.value.initial);
};

const vacuousNote = (res: QueryResult): Compilation | undefined =>
  res.compilation.find((c) => c.kind === "vacuous");

/** The vacuity cause, asserted rather than assumed, with its remedy sentence returned. */
const vacuityCause = (v: Verification, what: string): string => {
  assert.equal(v.status, "inconclusive", `${what}: expected inconclusive, got '${v.status}'`);
  assert.ok(v.status === "inconclusive");
  assert.equal(v.because.kind, "vacuous",
    `${what}: the CAUSE must be vacuity. 'bounded' sends the author to raise a budget, and no `
    + `budget makes an unreachable selection reachable — a model defect reported as an evidence `
    + `shortfall, which is the collapse V43 named`);
  assert.ok(v.because.kind === "vacuous");
  assert.ok(v.because.detail !== null,
    `${what}: the cause must carry the evaluator's own sentence. A null detail is what a boolean `
    + `disclosure would have produced, and the remedy would have arrived as a bare category`);
  return v.because.detail;
};

/** The bounded cause, with the limit it names — the remedy that is CORRECT under truncation. */
const boundedCause = (v: Verification, what: string): string | null => {
  assert.equal(v.status, "inconclusive", `${what}: expected inconclusive, got '${v.status}'`);
  assert.ok(v.status === "inconclusive");
  assert.equal(v.because.kind, "bounded",
    `${what}: the CAUSE must be the budget. Reporting vacuity here is V44's over-firing defect `
    + `moved one layer up: it would send an author to fix a predicate that is sound, and withhold `
    + `the one remedy that would in fact settle the question`);
  assert.ok(v.because.kind === "bounded");
  return v.because.limit;
};

// ---------------------------------------------------------------------------------------------
// The fixture: one ceiling over three selections that differ only in kind. V44's construction.
// ---------------------------------------------------------------------------------------------

/** One machine in two control states at once. No state vector admits it, and no walk says so. */
const UNSATISFIABLE = {
  "all-of": [{ "document-lifecycle.state": "published" }, { "document-lifecycle.state": "waiting" }],
};

/**
 * SATISFIABLE and never reached. `uploaded` is the initial state and nothing transitions back into
 * it, while `retry_count` only advances on the retry edge — so the vector admits the pair and no
 * execution exhibits it. The EARNED absence, and under a bound the row whose remedy is the budget.
 */
const SATISFIABLE_UNREACHED = {
  "all-of": [{ "document-lifecycle.state": "uploaded" }, { "document-lifecycle.retry_count": 1 }],
};

/** The 750 ms ceiling over one selection, optionally truncated, with an obligation over it. */
const ceilingOver = (target: unknown, limit: number | null = null): Obj => {
  const d = doc("document-processing");
  const quantity: Obj = { metric: "latency", within: "latency-requirement", target };
  if (limit !== null) quantity["limit"] = limit;
  queriesOf(d)["ceiling-over-a-selection"] = {
    name: "Every execution reaching the selection stays within the declared ceiling",
    kind: "quantity", quantifier: "forall", quantity,
  };
  requirementsOf(d)["processing-under-750ms"] = {
    statement: "Processing completes within the declared 750 ms.",
    expressed_as: "ceiling-over-a-selection",
    satisfied_when: "holds",
  };
  return d;
};

const ceilingResult = (target: unknown, limit: number | null = null): QueryResult => {
  const res = runSavedQueries(canonicalize(ceilingOver(target, limit)))
    .get("ceiling-over-a-selection");
  assert.ok(res !== undefined, "the probe's query did not run");
  return res.result;
};

// ---------------------------------------------------------------------------------------------
// 1. The live case — the remedy that no budget could satisfy
// ---------------------------------------------------------------------------------------------

test("an unsatisfiable ceiling under a bound reads the VACUITY cause, not the budget", () => {
  // The defect, as the follow-up measured it: `inconclusive` with cause `bounded` at `limit: 3`,
  // whose remedy is "raise the bound" for a selection no bound reaches. What this catches is the
  // REMEDY, which lives in the cause and nowhere else.
  //
  // VACUITY: a pin over `v.status` would pass before the fix and after it — the status is
  // `inconclusive` at every budget either way, which is what V43 governs and what its suite pins. So
  // this asserts the cause, and it asserts that the row really is the truncated one: without the
  // coverage and projection checks below it could be the exhaustive row, which V43 already pinned
  // and which was never broken.
  const d = ceilingOver(UNSATISFIABLE, 3);
  assert.equal(satisfiabilityOf(d, UNSATISFIABLE), "unsatisfiable",
    "the premise: no state vector admits this target. If this fails the fixture stopped being the "
    + "case under test and every assertion below is about something else");

  const res = ceilingResult(UNSATISFIABLE, 3);
  assert.equal(res.coverage.kind, "bounded",
    "the walk must TRUNCATE, or this is the exhaustive row wearing a limit");
  assert.equal(res.outcome, "inconclusive", "and the outcome still follows coverage (V22) — this fix "
    + "moves the cause, never the status or the outcome");
  assert.ok(vacuousNote(res) !== undefined,
    "the premise V44 established: the disclosure travels under a bound, because satisfiability is "
    + "decided before the walk begins");

  const ev = evaluationOf(res);
  assert.equal(ev.status, "exhausted", "the projection must reach the arm under test — the `vacuous` "
    + "field was ADDED to this arm, and a `completed` projection here would test V43 instead");
  assert.ok(ev.status === "exhausted");
  assert.ok(ev.vacuous !== null,
    "the plumbing half: the projection must CARRY the disclosure. Dropping it here is the whole "
    + "defect, and it is invisible one layer later because the compilation is gone by then");

  const detail = vacuityCause(verified(d, "processing-under-750ms"), "the truncated vacuous ceiling");
  assert.match(detail, /fix the predicate/,
    "and the remedy the author can act on must be the one that arrives — the reason the disclosure "
    + "travels as the evaluator's own sentence rather than as a flag");
});

// ---------------------------------------------------------------------------------------------
// 2. The over-firing control — the pin that matters, in both directions
// ---------------------------------------------------------------------------------------------

test("a SATISFIABLE but unreached selection under a bound still reads the BUDGET cause", () => {
  // The control V44's finding makes mandatory. Its defect was an evaluator firing vacuity on the
  // earned case; the same mistake at this layer would be an `exhausted` arm that preferred vacuity
  // whatever the disclosure said. Here "raise the bound" is the correct and useful remedy, and it
  // must survive the fix that removed it from the row above.
  //
  // VACUITY: this passes while the property is violated if the selection is not actually satisfiable
  // — then it is a second copy of the first test and proves nothing about over-firing. So the
  // discriminator's own answer is looked up. And if `limit: 3` stopped truncating, the row would be
  // the exhaustive `satisfied` one, so the coverage and the projection arm are asserted too.
  const d = ceilingOver(SATISFIABLE_UNREACHED, 3);
  assert.equal(satisfiabilityOf(d, SATISFIABLE_UNREACHED), "satisfiable",
    "the premise: the state vector DOES admit this pair. Without it this is just another "
    + "unsatisfiable target and the pin says nothing about over-firing");

  const res = ceilingResult(SATISFIABLE_UNREACHED, 3);
  assert.equal(res.coverage.kind, "bounded", "the walk must TRUNCATE — this pin is about the cause "
    + "under a bound, and at exhaustive the same row reads `satisfied`");
  assert.equal(vacuousNote(res), undefined,
    "V44's half, restated at its own layer: the evaluator must not disclose vacuity on a satisfiable "
    + "selection. If this fires, the defect is upstream and the cause below is honestly derived");
  assert.ok(evaluationOf(res).status === "exhausted");

  const limit = boundedCause(verified(d, "processing-under-750ms"), "the truncated earned absence");
  assert.ok(limit !== null,
    "and the cause must NAME the budget that ran out — a bounded cause with no limit sends the "
    + "author to raise something unnamed");
});

test("where the budget IS the remedy, raising it settles the obligation", () => {
  // The same control, demonstrated rather than asserted. The pin above says the cause stays
  // `bounded`; this says that cause was TRUE — the identical declaration, run without the limit,
  // reaches a settled verdict. A `bounded` cause on a question no budget could settle is the defect
  // this file exists to remove, so the control owes the reader the other half.
  //
  // `dead_letter` with `retry_count: 3` sits three retries deep in `worker-queue`, so a one-state
  // walk cannot reach it and a complete one does. A behavioural query carries its own `limit` inside
  // the `behavior:` block, which is also why this row runs through the OTHER evaluator.
  //
  // VACUITY: if the deep target were reachable within the bound, the truncated row would settle and
  // this would be a test of nothing. So both rows are pinned: truncated and unsettled, then complete
  // and settled. If either half stops holding, the fixture has stopped being the case under test.
  const deep = {
    "all-of": [{ "job-lifecycle.state": "dead_letter" }, { "job-lifecycle.retry_count": 3 }],
  };
  const probe = (limit: number | null): Obj => {
    const d = doc("worker-queue");
    const behavior: Obj = { form: "reach", target: deep };
    if (limit !== null) behavior["limit"] = limit;
    queriesOf(d)["reaches-the-dead-letter-floor"] = {
      name: "A job can reach dead_letter with its retry budget spent",
      kind: "behavior", quantifier: "exists", behavior,
    };
    requirementsOf(d)["no-job-is-dead-lettered"] = {
      statement: "No job must be dead-lettered with its retry budget spent.",
      expressed_as: "reaches-the-dead-letter-floor",
      satisfied_when: "refuted",
    };
    return d;
  };

  assert.equal(satisfiabilityOf(probe(null), deep), "satisfiable",
    "the premise: the vector admits this configuration, so the absence under a bound is truncation "
    + "rather than a contradiction");

  const truncated = probe(1);
  assert.equal(boundedCause(verified(truncated, "no-job-is-dead-lettered"), "the shallow walk"),
    "state-limit", "the one-configuration walk stops on the state limit, and that is what the cause "
    + "must name");

  const complete = verified(probe(null), "no-job-is-dead-lettered");
  assert.equal(complete.status, "violated",
    "raising the bound SETTLED it, which is what made 'raise the bound' the honest remedy. A row "
    + "that stayed inconclusive here would leave the previous assertion unearned");
});

// ---------------------------------------------------------------------------------------------
// 3. Coverage-independence — V43 §5's mandate, and the property the defect broke
// ---------------------------------------------------------------------------------------------

test("coverage-independence: the same unsatisfiable declaration reports one cause at every budget", () => {
  // V43: the rule "MUST NOT be conditioned on coverage. It reads the disclosure and nothing else, so
  // the obligation's status cannot depend on how far the walk got." The dropped projection made the
  // CAUSE depend on exactly that — `bounded` under truncation, `vacuous` at exhaustive — which is a
  // coverage-dependence of the shape V44's sharpest result removed one layer down.
  //
  // VACUITY: a three-way agreement is agreement about nothing if the small budgets do not truncate,
  // so each row asserts its own coverage kind and the pin fails if `limit` stops biting.
  const seen = [3, 10, null].map((limit) => {
    const d = ceilingOver(UNSATISFIABLE, limit);
    const v = verified(d, "processing-under-750ms");
    return {
      budget: String(limit ?? "exhaustive"),
      coverage: ceilingResult(UNSATISFIABLE, limit).coverage.kind,
      status: v.status,
      cause: v.status === "inconclusive" ? v.because.kind : "-",
    };
  });

  assert.deepEqual(seen.map((s) => s.cause), ["vacuous", "vacuous", "vacuous"],
    `the CAUSE must not depend on the budget, got ${JSON.stringify(seen)}`);
  assert.deepEqual(seen.map((s) => s.status), ["inconclusive", "inconclusive", "inconclusive"],
    "and the status must not move either — V43 governs it and this amendment does not touch it");
  assert.deepEqual(seen.map((s) => s.coverage), ["bounded", "bounded", "exhaustive"],
    "the budgets must really DIFFER, or this compares three copies of one row");
});

test("the remedy sentence is the same sentence at a bound as at exhaustive", () => {
  // Catches a fix that reports the right cause with a degraded remedy — a cause carrying `detail:
  // null`, or a second sentence written for the truncated path. Either would leave the author who
  // ran under a bound a worse answer than the one who did not, for a fact that does not depend on
  // the budget.
  //
  // VACUITY: asserting only that the detail is non-null would pass on any sentence at all, including
  // the budget's. So the two budgets' sentences are compared with each other, and the remedy words
  // are matched.
  const truncated = vacuityCause(
    verified(ceilingOver(UNSATISFIABLE, 3), "processing-under-750ms"), "under a bound");
  const exhaustive = vacuityCause(
    verified(ceilingOver(UNSATISFIABLE, null), "processing-under-750ms"), "at exhaustive");

  assert.equal(truncated, exhaustive,
    "one fact, one sentence. The disclosure is decided by the predicate before the walk begins, so "
    + "a reader who ran under a bound is owed the same prose");
  assert.match(truncated, /cannot REPRESENT/,
    "V41's sound reading, in the evaluator's own words — the sentence a boolean would have dropped");
});

// ---------------------------------------------------------------------------------------------
// 4. The seam — one check, and the second evaluator reaches it
// ---------------------------------------------------------------------------------------------

test("the BEHAVIOURAL evaluator reaches the same cause under its own bound", () => {
  // The fix sits in the projection and in `verify`, which both evaluators pass through, so a second
  // path reaching the same cause is the evidence it was fixed at the seam rather than in the quantity
  // code. It is also the evidence the gap was never quantity-specific: the behavioural evaluator has
  // carried the disclosure under `bounded` coverage since V41, so it reached the dropped projection
  // too.
  //
  // VACUITY: this duplicates V43's shipped-query pin unless the walk truncates — at exhaustive the
  // projection is `completed` and the cause was already right. So the arm is asserted, and the
  // sentence is matched for wording only the behavioural evaluator writes.
  const target = {
    "all-of": [{ "job-lease.state": "held-by-0" }, { "job-lease.state": "held-by-1" }],
  };
  const d = doc("worker-queue");
  queriesOf(d)["two-workers-own-one-job-under-a-bound"] = {
    name: "Two workers can simultaneously own the same job, searched under a bound",
    kind: "behavior", quantifier: "exists",
    behavior: { form: "reach", target, limit: 1 },
  };
  requirementsOf(d)["no-double-ownership-under-a-bound"] = {
    statement: "Two workers must not simultaneously own the same job.",
    expressed_as: "two-workers-own-one-job-under-a-bound",
    satisfied_when: "refuted",
  };

  const res = runSavedQueries(canonicalize(d)).get("two-workers-own-one-job-under-a-bound");
  assert.ok(res !== undefined, "the probe's query did not run");
  assert.equal(res.result.coverage.kind, "bounded",
    "the premise: this walk TRUNCATES. At exhaustive the same query is V43's pin, and the arm this "
    + "amendment widened is never reached");
  assert.ok(evaluationOf(res.result).status === "exhausted");

  const detail = vacuityCause(verified(d, "no-double-ownership-under-a-bound"),
    "the truncated behavioural vacuity");
  assert.match(detail, /no transition structure was consulted/,
    "the behavioural evaluator's own sentence, which only it writes — so a quantity-path regression "
    + "cannot satisfy this pin");
});

test("the widened arm's two projections, read directly: the disclosure decides and `limit` does not", () => {
  // The unit-level statement of the whole amendment, with the evaluators out of the picture. Catches
  // a precedence that happens to be right on the fixtures above for a reason other than the
  // disclosure — the `exhausted` arm's two projections differ in nothing else, so the field is the
  // only thing either answer can be derived from.
  //
  // VACUITY: a one-row version of this would pass while the arm ignored the field entirely, since
  // `bounded` was the old answer for both. Both rows are asserted, so a constant answer fails.
  const req: Requirement = {
    id: "r", statement: "It must hold.", expressedAs: "q", satisfiedWhen: "holds",
  };
  const disclosure: Compilation = {
    kind: "vacuous", explanation: "No configuration the state vector admits satisfies it.",
  };

  const ordinary = verify(req, { status: "exhausted", limit: "state-limit", vacuous: null });
  assert.equal(boundedCause(ordinary, "an ordinary truncation"), "state-limit",
    "with no disclosure the arm is unchanged, and the remedy is the budget it names");

  const shadowed = verify(req, { status: "exhausted", limit: "state-limit", vacuous: disclosure });
  assert.equal(vacuityCause(shadowed, "a truncation over an unsatisfiable predicate"),
    disclosure.explanation,
    "with one, the disclosure outranks the budget and the evaluator's sentence arrives verbatim");
});

// ---------------------------------------------------------------------------------------------
// 5. Precedence against the arm that outranks this one — unchanged by the hoist
// ---------------------------------------------------------------------------------------------

test("a declaration defect still outranks a TRUNCATED vacuity", () => {
  // V43 pinned that a §4 distortion outranks vacuity at exhaustive. The hoist moved the vacuity
  // check earlier inside `verify`, which is the change most likely to leapfrog something — so the
  // ordering is re-pinned on the row the hoist newly reaches. `verifyDeclaration` returns before
  // `verify` is called, so the ordering is structural, and this pin is what says it still is.
  //
  // `error` must win for the reason V43 gave: with `satisfied_when: refuted` a found counterexample
  // would DISCHARGE a ceiling obligation, so the declaration is broken whatever the selection does
  // and whatever the budget was. Reporting vacuity would send the author to fix a target in a
  // requirement that stays wrong once they have.
  //
  // VACUITY: both premises are asserted. Without the first this passes if §4 stopped firing; without
  // the second it passes if the query stopped being vacuous or stopped being truncated, and then it
  // is not a precedence test at all.
  const d = ceilingOver(UNSATISFIABLE, 3);
  row(requirementsOf(d), "processing-under-750ms", "the §4 distortion")["satisfied_when"] = "refuted";

  const res = ceilingResult(UNSATISFIABLE, 3);
  assert.ok(vacuousNote(res) !== undefined,
    "the premise: this query IS vacuous, so the amended rule would fire if §4 did not outrank it");
  assert.equal(res.coverage.kind, "bounded",
    "and it is TRUNCATED, which is the row V43's own precedence pin could not reach");

  const v = verified(d, "processing-under-750ms");
  assert.equal(v.status, "error",
    "the DECLARATION defect outranks the result defect: an inverted polarity makes the obligation "
    + "undischargeable whatever the query selects, so the remedy is the requirement's word");
  assert.ok(v.status === "error");
  assert.match(v.problem, /refutation IS the breach/, "and the §4 refusal's own sentence survives");
});
