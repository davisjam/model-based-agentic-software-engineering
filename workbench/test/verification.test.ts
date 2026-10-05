// Three layers, and the compiler holds them apart: a query says holds/refuted, a requirement
// declares satisfied_when, verification interprets the pair.
//
// ## The separation this file is the receipt for
//
//     QUERY                         REQUIREMENT
//     holds/refuted      +         satisfied_when
//             \                       /
//                  VERIFICATION
//        satisfied/violated/inconclusive/error
//
// `DESIGN-v02-examples-and-semantic-completion-261004.md` §5. Three claims, each held below:
//
//   1. A query result is never `satisfied` or `violated` (§5.3). Nothing in `src/` can say those
//      words about a `QueryResult` alone, because `verify` is their only producer and it does not
//      typecheck without a `Requirement`.
//   2. A requirement declares `satisfiedWhen` over the POSITIVE breach query and the query is not
//      negated internally (§5.2). Both polarities ship in the example corpus.
//   3. `unlicensed` and `exhausted` are evaluator conditions, not truth values (§5.4). The split is
//      a discriminated union, so `verdict` is unreachable on a status that has none — and this file
//      drives the mutation that proves the switch is total rather than reading the switch.
//
// ## What it derives rather than restates
//
// Both status vocabularies are read off their own declarations with `test/union-probe.ts`, and the
// receipt tables are asserted TOTAL over what the parse found. So a status word cannot be added
// without someone deciding, here, what it means for an obligation — the shape
// `test/expectation-standing.test.ts` uses for `Outcome`, with the probe now shared.
//
// ## The headline case
//
// A bounded search must not read as `violated`. That is the whole reason the status/verdict split
// earns its keep: the same `outcome === satisfiedWhen ? satisfied : violated` expression that is a
// DEFECT over a four-valued `Outcome` is SOUND over a two-valued `PropositionValue`, and the only
// thing making it sound is that `exhausted` and `unlicensed` are no longer in the comparison.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import {
  parseRequirement, verificationError, VERIFICATION_TEXT, verify, verifyDeclaration,
  type Requirement, type VerificationStatus,
} from "../src/engine/verification.ts";
import { bounded, exhaustive, NOT_APPLICABLE, result } from "../src/engine/types.ts";
import { evaluationOf } from "../src/ir/types.ts";
import type {
  Coverage, EvaluationStatus, Outcome, PropositionValue, QueryEvaluation, QueryResult,
} from "../src/ir/types.ts";
import { declaredUnion, unionMembersIn } from "./union-probe.ts";

const IR_SOURCE = "src/ir/types.ts";
const VERIFICATION_SOURCE = "src/engine/verification.ts";

// ---------------------------------------------------------------------------------------------
// 1. Layer 1 — a result, read as an evaluation
// ---------------------------------------------------------------------------------------------

/** The coverage each outcome actually travels with, from the kernel's own asymmetry (V22). */
const settledCoverage = (outcome: Outcome): Coverage =>
  outcome === "unlicensed" ? NOT_APPLICABLE
    : outcome === "inconclusive" ? bounded(1_000, "state-limit")
      : exhaustive(37);

const answer = (outcome: Outcome, coverage: Coverage = settledCoverage(outcome)): QueryResult =>
  result({
    outcome, coverage, systemHash: "r1",
    refusal: outcome === "unlicensed" ? "the model represents permission, never observation." : null,
  });

/**
 * Which evaluation status each outcome word projects to, DECLARED here.
 *
 * The join between the two vocabularies, written down so a reader can see that exactly two of the
 * four outcome words are propositions. `reason` is the sentence: the other two say what stopped the
 * evaluator, and their remedies differ from each other as much as from a breach.
 */
const STATUS_PER_OUTCOME: Readonly<Record<Outcome, {
  readonly status: EvaluationStatus;
  readonly reason: string;
}>> = {
  holds: { status: "completed", reason: "a proposition value, and one of only two" },
  refuted: { status: "completed", reason: "the other one" },
  inconclusive: {
    status: "exhausted",
    reason: "the evaluator's budget ran out. The kernel spells this `inconclusive` under `bounded` "
      + "coverage; §5.4 calls the condition `exhausted`, and the remedy is a bigger budget",
  },
  unlicensed: {
    status: "unlicensed",
    reason: "the purposeful models do not license the question. The remedy is a model, so this "
      + "must not fold into the arm above",
  },
};

test("the outcome/status join is TOTAL over the declared Outcome union", () => {
  assert.deepEqual(
    [...Object.keys(STATUS_PER_OUTCOME)].sort(), [...declaredUnion("Outcome", IR_SOURCE)].sort(),
    "an outcome word was added or renamed without anyone deciding whether it is a proposition. "
    + "Add the row, and the compiler's switch in `evaluationOf` will tell you whether the kernel "
    + "agrees.");
});

test("every outcome projects to the status the table declares, and only two carry a verdict", () => {
  const carriesAVerdict: string[] = [];
  for (const [outcome, row] of Object.entries(STATUS_PER_OUTCOME) as readonly [Outcome, {
    readonly status: EvaluationStatus; readonly reason: string;
  }][]) {
    const ev = evaluationOf(answer(outcome));
    assert.equal(ev.status, row.status, `'${outcome}': ${row.reason}`);
    // The narrowing IS the control: `ev.verdict` does not typecheck outside this branch, which is
    // what makes the split structural rather than a convention a reader has to remember.
    if (ev.status === "completed") {
      assert.equal(ev.verdict, outcome, "a completed evaluation's verdict is the proposition value");
      carriesAVerdict.push(outcome);
    }
  }
  assert.deepEqual(carriesAVerdict.sort(), ["holds", "refuted"],
    "exactly two of the four outcome words are propositions; a third would mean a status is "
    + "masquerading again");
});

test("the status vocabulary is the author's four words, and `error` is unreachable from a result", () => {
  assert.deepEqual([...declaredUnion("EvaluationStatus", IR_SOURCE)].sort(),
    ["completed", "error", "exhausted", "unlicensed"],
    "§5.4's status set is closed. A fifth member needs a decision in `verify` and a row here.");

  // `ResultEvaluation` excludes `error` because the engine's contract is that nothing throws: a
  // question the model does not license arrives as a SUCCESSFUL result. Asserted over every
  // declared outcome rather than by reading the type, so a projection that started returning
  // `error` would be caught here and not only by tsc.
  for (const outcome of declaredUnion("Outcome", IR_SOURCE) as readonly Outcome[]) {
    assert.notEqual(evaluationOf(answer(outcome)).status, "error",
      `'${outcome}' projected to 'error'; no QueryResult carries an evaluator error`);
  }
});

// ---------------------------------------------------------------------------------------------
// 2. Layer 2 — the requirement declares, and cannot prescribe its own unanswerability
// ---------------------------------------------------------------------------------------------

/** The shipped declaration, verbatim from the corpus: a prohibition over its POSITIVE breach query. */
const BREACH_REQUIREMENT = {
  id: "no-restricted-data-to-an-impermitted-subscriber",
  statement: "No event type carrying data above a service's permitted sensitivity may be "
    + "delivered to that service.",
  expressed_as: "restricted-data-reaches-impermitted-subscriber",
  satisfied_when: "refuted",
};

test("a requirement references the POSITIVE breach query and declares satisfied_when: refuted", () => {
  const parsed = parseRequirement(BREACH_REQUIREMENT, "message-bus");
  assert.equal(parsed.ok, true);
  assert.ok(parsed.ok);
  // §5.2's instruction, as a type fact: the requirement names the breach query as given, and the
  // satisfaction condition is a separate field. There is no negated-query field to check, because
  // there is nowhere to put one.
  assert.equal(parsed.value.expressedAs, "restricted-data-reaches-impermitted-subscriber");
  assert.equal(parsed.value.satisfiedWhen, "refuted");
  assert.match(parsed.value.statement, /may be\s+delivered/,
    "the obligation stays in the modal voice; the query's own wording is positive");
});

test("the corpus's shipped requirements all parse, under BOTH polarities", () => {
  // Both readings are legitimate and neither is privileged: a breach query is satisfied when
  // refuted, a universal stated directly is satisfied when it holds. A layer that admitted one
  // would enshrine a constraint the example corpus does not have.
  const seen = new Set<PropositionValue>();
  let count = 0;
  for (const file of ["message-bus", "transaction-workspace", "document-processing", "worker-queue"]) {
    const path = `examples/${file}/expected-results.yaml`;
    const doc = parse(readFileSync(path, "utf8")) as { requirements?: readonly unknown[] };
    for (const raw of doc.requirements ?? []) {
      // The quantitative route (`decided_by` + `declared_as`) carries no `satisfied_when` and is
      // decided by a quantity query rather than by a saved one, so it is outside this layer. Skip
      // it by its OWN key rather than by a parse failure, so a malformed proposition requirement
      // cannot hide here.
      if (typeof raw === "object" && raw !== null && "decided_by" in raw) continue;
      const parsed = parseRequirement(raw, path);
      assert.ok(parsed.ok, `${path}: ${parsed.ok ? "" : parsed.problem.problem}`);
      if (parsed.ok) { seen.add(parsed.value.satisfiedWhen); count += 1; }
    }
  }
  assert.ok(count >= 5, `only ${count} proposition requirements parsed; the corpus ships more`);
  assert.deepEqual([...seen].sort(), ["holds", "refuted"],
    "both polarities must be exercised, or the layer could be privileging one without anyone "
    + "noticing");
});

test("satisfied_when cannot name a status — the measured hole closes here", () => {
  // MEASURED at this tree: `scripts/gen-example-coverage.ts:333` validates `satisfied_when` through
  // a general four-word outcome helper, and the authoring picker offers `inconclusive` and
  // `unlicensed` (`src/ui/view-model.ts:1330-1331`). So `satisfied_when: unlicensed` parses clean
  // today and nothing refuses a requirement that prescribes its own unanswerability. Prescribing
  // that your own model decline to answer is not an engineering obligation.
  for (const word of ["inconclusive", "unlicensed"]) {
    const parsed = parseRequirement({ ...BREACH_REQUIREMENT, satisfied_when: word }, "where");
    assert.equal(parsed.ok, false, `satisfied_when: ${word} must be refused`);
    assert.ok(!parsed.ok);
    assert.match(parsed.problem.problem, /evaluation statuses/,
      "the refusal must say WHY, or an author reads it as a typo");
    assert.equal(verificationError(parsed.problem).status, "error",
      "an unreadable declaration verifies as `error`, never as a breach");
  }
});

test("a declaration that could not be read is `error`, which is about the DECLARATION", () => {
  const cases: readonly (readonly [unknown, RegExp])[] = [
    [{ ...BREACH_REQUIREMENT, satisfied_when: undefined }, /not a satisfaction condition/],
    [{ ...BREACH_REQUIREMENT, satisfied_when: false }, /coerced it/],
    [{ ...BREACH_REQUIREMENT, expressed_as: undefined }, /names no deciding query/],
    [{ ...BREACH_REQUIREMENT, statement: "" }, /states no obligation/],
    [{ ...BREACH_REQUIREMENT, id: undefined }, /no id/],
    ["no-restricted-data", /a requirement is a mapping/],
  ];
  for (const [raw, pattern] of cases) {
    const parsed = parseRequirement(raw, "where");
    assert.equal(parsed.ok, false, `${JSON.stringify(raw)} must be refused`);
    assert.ok(!parsed.ok);
    assert.match(parsed.problem.problem, pattern);
    assert.notEqual(verificationError(parsed.problem).status, "violated",
      "a claim nobody managed to state is not a breach of the system under design");
  }
});

// ---------------------------------------------------------------------------------------------
// 3. Layer 3 — verification, one receipt per status
// ---------------------------------------------------------------------------------------------

const breachQuery: Requirement = {
  id: "no-restricted-data", statement: "Restricted data must not reach an impermitted subscriber.",
  expressedAs: "restricted-data-reaches-impermitted-subscriber", satisfiedWhen: "refuted",
};

const universal: Requirement = {
  id: "no-stale-base-commit", statement: "A change never commits against a stale base.",
  expressedAs: "committed-base-is-current", satisfiedWhen: "holds",
};

test("the verification vocabulary is §5.3's four words, and the §5 ruling beat the earlier five", () => {
  assert.deepEqual([...declaredUnion("VerificationStatus", VERIFICATION_SOURCE)].sort(),
    ["error", "inconclusive", "satisfied", "violated"],
    "§5.3 rules four. `DESIGN-v02-requirements-261004.md` §3.2 designed five, adding "
    + "`not-verifiable` for an unlicensed evaluation; §5 wins, and the remedy distinction that "
    + "word carried lives in `InconclusiveCause` instead.");
  assert.deepEqual([...Object.keys(VERIFICATION_TEXT)].sort(),
    [...declaredUnion("VerificationStatus", VERIFICATION_SOURCE)].sort(),
    "every status owes a reader the sentence that says what it means");
});

/**
 * Per evaluation status, the verification it produces under each polarity, DECLARED here.
 *
 * Read the two columns across the `exhausted` and `unlicensed` rows: neither polarity reaches
 * `violated`. That is the property, and stating it as a table rather than as separate assertions is
 * deliberate — the defect was never one row, it was the ARITY of a mapping that sent everything
 * that was not the predicted answer into the accusing arm.
 */
const VERIFICATION_PER_STATUS: Readonly<Record<EvaluationStatus, {
  readonly evaluation: (satisfying: PropositionValue) => QueryEvaluation;
  readonly satisfying: VerificationStatus;
  readonly breaching: VerificationStatus;
  readonly reason: string;
}>> = {
  completed: {
    evaluation: (v) => ({ status: "completed", verdict: v, coverage: exhaustive(37) }),
    satisfying: "satisfied", breaching: "violated",
    reason: "both sides are proposition values, so the comparison is sound and the breach is the "
      + "verdict that is not the one discharging the obligation",
  },
  exhausted: {
    evaluation: () => ({ status: "exhausted", limit: "state-limit" }),
    satisfying: "inconclusive", breaching: "inconclusive",
    reason: "the search was bounded, so the obligation is not settled either way. The remedy is "
      + "budget, and the one thing this must never be is the accusation",
  },
  unlicensed: {
    evaluation: () => ({ status: "unlicensed", refusal: "the model represents permission only." }),
    satisfying: "inconclusive", breaching: "inconclusive",
    reason: "the models decline. Also inconclusive, but by a different CAUSE: that remedy is a "
      + "model and the bounded one's is a budget, so folding them would misdirect the engineer",
  },
  error: {
    evaluation: () => ({ status: "error", problem: "the worker did not reply." }),
    satisfying: "error", breaching: "error",
    reason: "a statement about the declaration or the transport, never about the system under "
      + "design, so it cannot read as satisfied and must not read as a breach",
  },
};

test("the verification table is TOTAL over the declared EvaluationStatus union", () => {
  assert.deepEqual([...Object.keys(VERIFICATION_PER_STATUS)].sort(),
    [...declaredUnion("EvaluationStatus", IR_SOURCE)].sort(),
    "a status was added without anyone deciding whether it accuses the system under design. Add "
    + "the row with its reason; `verify`'s switch is total, so tsc will have said so first.");
});

test("RECEIPT: every evaluation status, under both polarities, produces the declared verification", () => {
  for (const [status, row] of Object.entries(VERIFICATION_PER_STATUS) as readonly [EvaluationStatus, {
    readonly evaluation: (s: PropositionValue) => QueryEvaluation;
    readonly satisfying: VerificationStatus; readonly breaching: VerificationStatus;
    readonly reason: string;
  }][]) {
    for (const req of [breachQuery, universal]) {
      const breaching = req.satisfiedWhen === "refuted" ? "holds" : "refuted";
      assert.equal(verify(req, row.evaluation(req.satisfiedWhen)).status, row.satisfying,
        `'${status}' against the satisfying verdict, satisfied_when '${req.satisfiedWhen}': ${row.reason}`);
      assert.equal(verify(req, row.evaluation(breaching)).status, row.breaching,
        `'${status}' against the breaching verdict, satisfied_when '${req.satisfiedWhen}': ${row.reason}`);
    }
  }
});

test("RECEIPT: a bounded search must not read as violated — the case the layer exists for", () => {
  // The defect, verbatim: the engineer forbade the breach, and the walk stopped at the state limit.
  // `outcome === satisfiedWhen ? satisfied : violated` over a four-valued union reports that the
  // system breaches a prohibition when what happened is that a search ran out of budget.
  const v = verify(breachQuery, evaluationOf(answer("inconclusive", bounded(1_000_000, "state-limit"))));
  assert.equal(v.status, "inconclusive");
  assert.ok(v.status === "inconclusive");
  assert.deepEqual(v.because, { kind: "bounded", limit: "state-limit" },
    "the reason must travel: the remedy for a state limit is a larger budget, and a verification "
    + "that omits it sends the engineer looking for a design defect");
  assert.match(VERIFICATION_TEXT.inconclusive, /not a breach/,
    "the exculpation is stated, not left to be inferred from a missing word");
});

test("NEGATIVE CONTROL: the genuine breach still reads as violated, so the check discriminates", () => {
  // Same requirement, and the answer that EXHIBITS what it forbids. A check that cannot tell an
  // accusation from a non-accusation would pass either way.
  const v = verify(breachQuery, evaluationOf(answer("holds", exhaustive(37))));
  assert.equal(v.status, "violated");
  assert.ok(v.status === "violated");
  assert.equal(v.verdict, "holds", "the verdict travels, so a reader sees the evidence's direction");
});

test("a witness is coverage-insensitive; an absence is not", () => {
  // The asymmetry, as a pair. A counterexample found inside a truncated search is a real
  // counterexample, so the breach stands. A breach NOT FOUND inside a budget is "we did not look
  // at all of it", which is not a demonstration that the prohibition holds — V22's rule, which
  // `render/accessible.ts` and `quant/requirement.ts` already apply from their own sides.
  const truncated = bounded(1_000, "depth-limit");
  const exhibited = verify(breachQuery, { status: "completed", verdict: "holds", coverage: truncated });
  assert.equal(exhibited.status, "violated", "presence of evidence survives a small budget");

  const absent = verify(breachQuery, { status: "completed", verdict: "refuted", coverage: truncated });
  assert.equal(absent.status, "inconclusive", "absence of evidence does not");
  assert.ok(absent.status === "inconclusive");
  assert.deepEqual(absent.because, { kind: "bounded", limit: "depth-limit" });
});

test("a declined question and a bounded search are both inconclusive, by different CAUSES", () => {
  // Where the earlier design's fifth word went. One word for three remedies would send two of
  // three readers the wrong way; three causes under one word does not.
  const declined = verify(breachQuery, evaluationOf(answer("unlicensed")));
  const bounded_ = verify(breachQuery, evaluationOf(answer("inconclusive")));
  const unrun = verify(breachQuery, null);
  for (const v of [declined, bounded_, unrun]) assert.equal(v.status, "inconclusive");
  assert.ok(declined.status === "inconclusive" && bounded_.status === "inconclusive"
    && unrun.status === "inconclusive");
  assert.deepEqual(
    [declined.because.kind, bounded_.because.kind, unrun.because.kind],
    ["unlicensed", "bounded", "not-evaluated"],
    "the three remedies are declare a model, raise the bound, run the query, and a layer that "
    + "merged them would leave the reader with a status word and nowhere to go");
  assert.match(
    declined.because.kind === "unlicensed" ? declined.because.refusal ?? "" : "",
    /permission/, "the refusal sentence travels; a decline that drops it names no missing distinction");
});

test("the whole chain: a declaration plus results, through verifyDeclaration", () => {
  const results = new Map<string, QueryResult>([
    [BREACH_REQUIREMENT.expressed_as, answer("holds", exhaustive(37))],
    ["committed-base-is-current", answer("holds", exhaustive(12))],
  ]);
  assert.equal(verifyDeclaration(BREACH_REQUIREMENT, "message-bus", results).status, "violated",
    "the shipped message-bus requirement is violated on purpose, and the chain says so");
  // The universal polarity through the same chain: the query states the claim directly and the
  // requirement is satisfied when it HOLDS, which is the shipped `no-stale-base-commit` reading.
  assert.equal(
    verifyDeclaration({
      id: universal.id, statement: universal.statement,
      expressed_as: "committed-base-is-current", satisfied_when: "holds",
    }, "transaction-workspace", results).status,
    "satisfied");

  // A query the system does not declare is a DECLARATION error, not an inconclusive verification:
  // the requirement references something that is not there, so there is no obligation to discharge.
  const dangling = verifyDeclaration({ ...BREACH_REQUIREMENT, expressed_as: "no-such-query" },
    "where", results);
  assert.equal(dangling.status, "error");
  assert.ok(dangling.status === "error");
  assert.match(dangling.problem, /does not declare/);

  // Declared but not run: inconclusive, and the remedy is to run it.
  const unrun = verifyDeclaration(BREACH_REQUIREMENT, "where", new Map(),
    new Set([BREACH_REQUIREMENT.expressed_as]));
  assert.equal(unrun.status, "inconclusive");
  assert.ok(unrun.status === "inconclusive");
  assert.equal(unrun.because.kind, "not-evaluated");
});

// ---------------------------------------------------------------------------------------------
// 4. Negative controls over the probe and over the layer boundary
// ---------------------------------------------------------------------------------------------

test("the status probes cannot pass by finding nothing — negative control", () => {
  // Three tables above are asserted TOTAL over whatever these probes return, so a probe that
  // returned nothing would carry all three vacuously. Each way of finding nothing is driven here
  // and the throw is caught, because a check nobody has watched fail is a check nobody knows can.
  assert.throws(() => declaredUnion("EvaluationStatus", "src/ir/no-such-file.ts"), /does not exist/);
  assert.throws(
    () => unionMembersIn("VerificationStatus", VERIFICATION_SOURCE,
      `export type Standing = "satisfied" | "violated";\n`),
    /no 'VerificationStatus' type alias found/,
    "a renamed declaration must be reported as the parse being wrong, which is the failure a green "
    + "run would otherwise spell as 'the vocabulary is empty'");
  assert.throws(
    () => unionMembersIn("EvaluationStatus", IR_SOURCE, `export type EvaluationStatus = Done | Stopped;\n`),
    /non-literal member/);

  // And the defaults still read the shipped source, so the parameter the arms above need cannot
  // become the way a real assertion gets quietly pointed at a fixture.
  assert.equal(IR_SOURCE, "src/ir/types.ts");
  assert.equal(VERIFICATION_SOURCE, "src/engine/verification.ts");
  assert.equal(declaredUnion("EvaluationStatus", IR_SOURCE).length, 4);
  assert.equal(declaredUnion("VerificationStatus", VERIFICATION_SOURCE).length, 4);
});

test("NEGATIVE CONTROL: no verification status is reachable without a requirement", () => {
  // §5.3's instruction, as a fact about the module surface rather than about prose: `verify` and
  // `verifyDeclaration` are the only exported producers of a `Verification`, and both take a
  // requirement (`verificationError` takes a RequirementProblem, which is a failed one). A
  // function that turned a result into `satisfied`/`violated` on its own would be the layer
  // collapse this file holds closed, so the surface is read off the source.
  const text = readFileSync(VERIFICATION_SOURCE, "utf8");
  const producers = [...text.matchAll(/^export (?:function|const) (\w+)/gm)]
    .map((m) => m[1])
    .filter((name) => new RegExp(`${name}[^\\n]*(:|=>)[^\\n]*Verification\\b`).test(text)
      || new RegExp(`function ${name}\\([^)]*\\)[\\s\\S]{0,200}?\\): Verification`).test(text));
  assert.deepEqual(producers.sort(), ["verificationError", "verify", "verifyDeclaration"],
    `a new producer of Verification landed: ${producers.join(", ")}. Every one must take a `
    + `requirement or a failed parse of one, or a raw query result could be called satisfied.`);

  // And the word `satisfied` appears in no other module's status vocabulary: `PropertyStatus` uses
  // `established`, and `ExpectationVerdict` uses `met`. Deliberate, so the three layers cannot be
  // confused by a reader skimming for a word.
  assert.doesNotMatch(readFileSync("src/app/properties.ts", "utf8"),
    /export type PropertyStatus[\s\S]{0,300}?"satisfied"/,
    "a property's status describes what the models SAY; `satisfied` belongs to a prescription");
});
