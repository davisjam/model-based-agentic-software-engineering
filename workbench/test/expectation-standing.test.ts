// A pinned property's standing is TOTAL over `Outcome`, and no outcome defaults into an accusation.
//
// ## The defect this holds closed
//
// `checkExpectation` decided a pin by `expect === res.outcome`, so the standing was computed as a
// NEGATION: every answer that was not the predicted one arrived as `unmet`, and the surface spoke
// it as "REQUIREMENT UNMET". A pin of `refuted` answered `inconclusive` — because the walk stopped
// at the state limit — therefore told the engineer that an engineering fact they had declared and
// meant to preserve was broken, when the search had merely run out of budget. The same for
// `unlicensed`, where the models decline the question entirely.
//
// Three answers, three remedies: change the system, raise the budget, declare the vocabulary. The
// fix is an arm each, and the control is that the decision stays TOTAL as the vocabulary grows.
//
// ## What this file derives, rather than restates
//
// The outcome words come from the UNION DECLARATION in `src/ir/types.ts`, parsed with the
// TypeScript compiler the way `test/component-model.ts` reads imports — not from a list written
// here and not from the engine's own runtime table, which is the thing a drifted list would
// agree with. `STANDING_PER_OUTCOME` below is then asserted TOTAL over what the parse found, so a
// fifth outcome word cannot land until someone has decided, in this file, whether it is a finding
// about the system under design. That is the same shape `test/joins-census.test.ts` uses: derive
// the input independently, and hold the table against it.
//
// The negative control matters as much as the pins. A check that cannot tell an accusation from a
// non-accusation would pass either way, so `readsAsAnAccusation` is driven in both directions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { checkExpectation } from "../src/engine/index.ts";
import { bounded, exhaustive, NOT_APPLICABLE, result } from "../src/engine/types.ts";
import { evaluateOne } from "../src/app/properties.ts";
import type { EvaluatedProperty, Expectation, ExpectationStanding } from "../src/app/properties.ts";
import { propertyRow } from "../src/ui/view-model.ts";
import { propertyImpact, requirementsReading } from "../src/ui/shell/review.ts";
import type { Coverage, Outcome, QueryResult } from "../src/ir/types.ts";

// ---------------------------------------------------------------------------------------------
// The outcome vocabulary, read off its own declaration
// ---------------------------------------------------------------------------------------------

/**
 * The members of `export type Outcome = …` in `src/ir/types.ts`.
 *
 * A real parse rather than a pattern over text: the union is a one-line alias today and a regex
 * would read it, but it would also read a comment mentioning the words, and it would stop reading
 * the day somebody wraps the alias across lines.
 */
function declaredOutcomes(): readonly string[] {
  const path = "src/ir/types.ts";
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.ES2022, true);
  const found: string[] = [];
  for (const statement of source.statements) {
    if (!ts.isTypeAliasDeclaration(statement) || statement.name.text !== "Outcome") continue;
    const union = statement.type;
    const members = ts.isUnionTypeNode(union) ? union.types : [union];
    for (const member of members) {
      assert.ok(ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal),
        `Outcome gained a non-literal member at ${path}; this parse reads string literals only`);
      if (ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal)) {
        found.push(member.literal.text);
      }
    }
  }
  assert.ok(found.length > 0, `no 'Outcome' type alias found in ${path} — the parse is wrong`);
  return found;
}

/**
 * How a pin stands when the engine answers each outcome, DECLARED here, for both polarities.
 *
 * Both polarities are pinned because both ship: a graph safety claim can only be the existential
 * dual (`v0.1` declares no universal graph form, so it is satisfied by `refuted`), while a
 * behavioural invariant is satisfied by `holds`. A table that held one would enshrine a constraint
 * the engine does not have.
 *
 * `reason` is the sentence this file is for. Read the rows down the `pinnedRefuted` column: only
 * `holds` — the answer that EXHIBITS what the pin forbids — is a finding about the system.
 */
const STANDING_PER_OUTCOME: Readonly<Record<Outcome, {
  readonly pinnedRefuted: ExpectationStanding;
  readonly pinnedHolds: ExpectationStanding;
  readonly reason: string;
}>> = {
  holds: {
    pinnedRefuted: "unmet", pinnedHolds: "met",
    reason: "a conclusive answer: it meets a pin of 'holds' and contradicts a pin of 'refuted', "
      + "and the evidence that settled it holds however little of the space was walked",
  },
  refuted: {
    pinnedRefuted: "met", pinnedHolds: "unmet",
    reason: "the mirror of 'holds', which is why neither polarity may be privileged",
  },
  inconclusive: {
    pinnedRefuted: "unsettled", pinnedHolds: "unsettled",
    reason: "the search was bounded, so nothing is established either way; the remedy is budget "
      + "and the one thing this must never be is the accusation",
  },
  unlicensed: {
    pinnedRefuted: "declined", pinnedHolds: "declined",
    reason: "the models decline the question. Not 'unsettled': that remedy is a larger budget, "
      + "and this remedy is a model, so folding the two would send the engineer the wrong way",
  },
};

const pin = (expect: Outcome): unknown =>
  ({ id: "q", name: "The claim.", kind: "graph", quantifier: "exists", expect });

const answer = (outcome: Outcome, coverage: Coverage, refusal?: string): QueryResult =>
  result({
    outcome, coverage, systemHash: "r1",
    refusal: outcome === "unlicensed" ? refusal ?? "no model declares the relation this names." : null,
  });

/** The coverage each outcome actually travels with, from the kernel's own asymmetry (V22). */
const settledCoverage = (outcome: Outcome): Coverage =>
  outcome === "unlicensed" ? NOT_APPLICABLE
    : outcome === "inconclusive" ? bounded(1_000, "state-limit")
      : exhaustive(37);

test("the standing table is TOTAL over the declared Outcome union, and nothing else", () => {
  assert.deepEqual([...Object.keys(STANDING_PER_OUTCOME)].sort(), [...declaredOutcomes()].sort(),
    "an outcome word was added or renamed without anyone deciding what a pin against it means. "
    + "Add the row, with the reason, and the compiler's switch in src/engine/index.ts will tell "
    + "you whether the engine agrees.");
});

test("every outcome gets the standing the table declares, under BOTH polarities", () => {
  for (const [outcome, row] of Object.entries(STANDING_PER_OUTCOME) as readonly [Outcome, {
    readonly pinnedRefuted: ExpectationStanding; readonly pinnedHolds: ExpectationStanding;
    readonly reason: string;
  }][]) {
    const res = answer(outcome, settledCoverage(outcome));
    assert.equal(checkExpectation(pin("refuted"), res).kind, row.pinnedRefuted,
      `pin 'refuted' answered '${outcome}': ${row.reason}`);
    assert.equal(checkExpectation(pin("holds"), res).kind, row.pinnedHolds,
      `pin 'holds' answered '${outcome}': ${row.reason}`);
  }
});

test("exactly ONE outcome is a finding about the system under design, per polarity", () => {
  // Stated as a count rather than as four separate assertions, because the count is the property:
  // "not the predicted answer" used to mean "unmet" for three of the four, and the defect was the
  // ARITY of that mapping rather than any one row of it.
  const accusing = (expect: Outcome): readonly string[] =>
    Object.keys(STANDING_PER_OUTCOME).filter((outcome) =>
      checkExpectation(pin(expect), answer(outcome as Outcome, settledCoverage(outcome as Outcome)))
        .kind === "unmet");
  assert.deepEqual(accusing("refuted"), ["holds"]);
  assert.deepEqual(accusing("holds"), ["refuted"]);
});

// ---------------------------------------------------------------------------------------------
// The receipt — the case that was wrong, end to end
// ---------------------------------------------------------------------------------------------

const SYSTEM = canonicalize(parse(readFileSync("examples/docable.mage.yaml", "utf8")));

/** The pinned property as a reader meets it: through the projection and the row that renders it. */
const line = (expect: Outcome, res: QueryResult): string => {
  const p = evaluateOne(SYSTEM, "q", pin(expect), res, res.systemHash);
  assert.equal(p.kind, "requirement", "a declared expectation is what makes it one");
  const text = propertyRow(p).expectation;
  assert.ok(text !== null, "a requirement row must carry the expectation line");
  return text;
};

/**
 * Does this line tell the engineer the system failed?
 *
 * Deliberately crude, and keyed on the word a reader actually sees. The point is not to grade prose
 * — it is that the two non-findings must not reach the DOM wearing the finding's word, and the
 * rendered line is the accessible text a screen reader speaks for the verdict.
 */
const readsAsAnAccusation = (text: string): boolean => /UNMET/.test(text);

test("RECEIPT: a pin of 'refuted' answered 'inconclusive' is NOT reported as a broken requirement", () => {
  // The defect, verbatim: the engineer declared the breach query must be refuted, and the walk
  // stopped at the state limit. Before this change the row read "REQUIREMENT UNMET — the engineer
  // declared this must be 'refuted', and the outcome is 'inconclusive'", which is an accusation
  // about the system under design built out of a search budget.
  const res = answer("inconclusive", bounded(1_000_000, "state-limit"));
  const verdict = checkExpectation(pin("refuted"), res);
  assert.equal(verdict.kind, "unsettled");

  const text = line("refuted", res);
  assert.equal(readsAsAnAccusation(text), false, `this still reads as an accusation: "${text}"`);
  assert.match(text, /nothing here says the requirement is broken/,
    "the exculpation must be stated, not left to be inferred from a missing word");
  assert.match(text, /state-limit/,
    "the reason must travel with the standing: the remedy for a state limit is a larger budget, "
    + "and a line that omits it sends the engineer looking for a design defect");
  assert.match(text, /budget/, "the remedy must be named");
  assert.match(text, /must be 'refuted'/, "the DECLARED word stays the engineer's own");
});

test("NEGATIVE CONTROL: the genuine breach still reads as one, so the check discriminates", () => {
  // Same pin, and the answer that EXHIBITS what it forbids. Coverage does not soften it — a witness
  // found inside a truncated search is a real witness — so this is the accusation, and it must be.
  const text = line("refuted", answer("holds", exhaustive(37)));
  assert.equal(readsAsAnAccusation(text), true, `the breach stopped reading as one: "${text}"`);
  assert.match(text, /outcome is 'holds'/);
});

test("a pin answered 'unlicensed' reports the REFUSAL's remedy, not the budget's", () => {
  const res = answer("unlicensed", NOT_APPLICABLE, "the model deliberately omits delivery order.");
  const verdict = checkExpectation(pin("refuted"), res);
  assert.equal(verdict.kind, "declined", "§3.4: this is neither a breach nor a bounded search");

  const text = line("refuted", res);
  assert.equal(readsAsAnAccusation(text), false, `this still reads as an accusation: "${text}"`);
  assert.match(text, /decline the question/);
  assert.match(text, /remedy is a model/,
    "telling a reader to raise a bound when the answer is to declare a relation type is the "
    + "conflation four layers below this one refuse");
  assert.doesNotMatch(text, /remedy is a larger budget/,
    "the two non-findings must not prescribe the same remedy, or the extra arm bought nothing");
  assert.notEqual(text, line("refuted", answer("inconclusive", bounded(10, "state-limit"))),
    "a declined question and a bounded search must not read alike");
});

test("a conclusive answer under BOUNDED coverage is unsettled, not a met pin", () => {
  // MEASURED, and the reason this arm is a declared guard rather than an assumption: no shipped
  // evaluator produces this pair. Every one reports `exhaustive(...)` when evidence settles the
  // claim, however little of the space was walked, and `inconclusive` under `bounded` when a walk
  // was truncated with nothing found (src/engine/behavior.ts, graph.ts, quant/query.ts,
  // quant/requirement.ts). So this is constructed by hand — V22 forbids putting refuting force
  // behind a truncated exploration, and a requirement line is the strongest reading any surface
  // puts on a result, so it must not be the one surface that drops the condition.
  const res = answer("refuted", bounded(1_000, "depth-limit"));
  assert.equal(checkExpectation(pin("refuted"), res).kind, "unsettled");
  const text = line("refuted", res);
  assert.equal(readsAsAnAccusation(text), false);
  assert.match(text, /depth-limit/);
});

test("a coerced `expect` keeps its own standing, so it cannot read as satisfied OR as broken", () => {
  const raw = { id: "q", name: "The claim.", kind: "graph", quantifier: "exists", expect: false };
  const p = evaluateOne(SYSTEM, "q", raw, answer("holds", exhaustive(1)), "r1");
  assert.equal(p.expectation?.standing, "coerced");
  assert.match(propertyRow(p).expectation ?? "", /could not be read/);
  assert.match(p.expectation?.problem ?? "", /V25/);
});

// ---------------------------------------------------------------------------------------------
// The review surface — the same defect, on the surface that interposes
// ---------------------------------------------------------------------------------------------

/** The obligation, pinned `refuted`, as this revision answered it. The standing is asserted, not assumed. */
function tracked(outcome: Outcome, standing: ExpectationStanding): EvaluatedProperty {
  const res = answer(outcome, settledCoverage(outcome));
  const p = evaluateOne(SYSTEM, "obligation", pin("refuted"), res, res.systemHash);
  const e: Expectation | null = p.expectation;
  assert.equal(e?.standing, standing, `a '${outcome}' answer must stand as '${standing}'`);
  return p;
}

test("losing a demonstration is not breaking an obligation — on the surface that interposes", () => {
  // `breaks` was `before.met === true && after.met !== true` over a two-valued projection, so
  // widening the state space past the search budget, or deleting a relation the query traverses,
  // both told the reader they had broken a safety requirement. Both still MOVE the requirement, so
  // G3 still interposes and the review surface still holds the change; what changed is the sentence
  // it says while holding it.
  const before = [tracked("refuted", "met")];
  const cases = [
    { what: "the budget ran out", after: tracked("inconclusive", "unsettled") },
    { what: "the vocabulary was removed", after: tracked("unlicensed", "declined") },
  ];

  for (const { what, after } of cases) {
    const impact = propertyImpact(before, [after]);
    assert.equal(impact.movedRequirements.length, 1,
      `${what}: the requirement still moves, so the review surface still interposes`);
    assert.equal(impact.movedRequirements[0]?.breaks, false,
      `${what}: that is not a breach of the obligation`);
    assert.equal(impact.movedRequirements[0]?.lostEvidence, true,
      `${what}: a demonstration was lost, which is what the reader needs told`);
    const reading = requirementsReading(impact);
    assert.match(reading, /no longer demonstrable/, `${what}: the reading must name what happened`);
    assert.doesNotMatch(reading, /no longer satisfied/,
      `${what}: "no longer satisfied" sends the reader to look for a defect that is not there`);
  }
});

test("NEGATIVE CONTROL: the real breach still breaks, and still reads as unsatisfied", () => {
  const impact = propertyImpact([tracked("refuted", "met")], [tracked("holds", "unmet")]);
  assert.equal(impact.movedRequirements[0]?.breaks, true);
  assert.equal(impact.movedRequirements[0]?.lostEvidence, false);
  assert.match(requirementsReading(impact), /1 of them no longer satisfied/);
});
