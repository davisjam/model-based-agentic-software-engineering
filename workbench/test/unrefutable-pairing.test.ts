// The unrefutable pairing — a requirement may not name a query that cannot decide it.
//
// `DECISIONS-RULED-ceiling-requirement-261005.md` §4, Phase A. The ruling measured three authored
// shapes that each read SATISFIED for an obligation the product violates, and the worst of them
// cannot fail at any magnitude: a memory obligation decided by a bare measurement reads satisfied at
// 1,152 MB against a declared 512 MB ceiling, because `measurePeak` has no `refuted` arm at all.
//
// ## What is pinned, and why each earns its place
//
//   1. **The three distortions, as negative controls** — A1 (a measurement query paired with
//      `holds`), B1 (the same on `peak_memory`, which is the one that cannot fail), and D1 (the
//      CORRECT ceiling query with one inverted word). Each must read `error`, and each refusal must
//      name its remedy — a refusal that says only "wrong" sends nobody anywhere.
//   2. **The two sound shipped requirements, as positive controls.** A rule that breaks a sound
//      requirement is worse than the hole it closes. Both quantity-decided requirements in the
//      corpus pair `within:` with `holds` and must keep deriving what they derive today.
//   3. **The scope, as a positive control with teeth.** Four shipped requirements declare
//      `satisfied_when: refuted` over `behavior` and `graph` queries, which is the ORDINARY
//      authoring of a breach query. A rule that read `refuted` as the defect — rather than reading
//      the PAIRING — would refuse all four, so the scoping is pinned against the corpus.
//   4. **Coverage-independence.** The same declaration must refuse at `limit: 3` and at exhaustive.
//      This is the one §5 argues hardest for, and the pre-rule measurement is why: D1 derived
//      SATISFIED at exhaustive and INCONCLUSIVE at `limit: 3`, so a refusal that read the result
//      would have reported a declaration defect as an evidence shortfall at one budget and as a
//      discharged obligation at the other.
//   5. **The boundary, stated rather than implied** — the shape this rule does NOT catch, which is
//      the honest half of §4 and the finding this wave owes the author. See the last test.
//
// The suite lands green at zero findings against the shipped corpus: no authored requirement is
// mis-authored today. That is forward-policing, and it is the same argument this project uses for
// authoring a lint at zero findings — the pins below are not evidence that nothing happened, they
// are the three distortions driven through the production join and refused.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { runSavedQueries, verifySystemRequirements } from "../src/engine/index.ts";
import type { Verification } from "../src/engine/verification.ts";
import { exampleText } from "../scripts/gen-example-coverage.ts";
import { SHIPPED_EXAMPLE_IDS } from "../src/app/examples.ts";

type Obj = Record<string, unknown>;
type Block = Record<string, Obj>;

const doc = (id: string): Obj => parse(exampleText(id)) as Obj;
const queriesOf = (d: Obj): Block => d["queries"] as Block;
const requirementsOf = (d: Obj): Block => d["requirements"] as Block;

/**
 * One authored row, asserted PRESENT before it is read or mutated.
 *
 * Not ceremony: every probe below states a premise about the shipped corpus, and a probe that read
 * `undefined` from a renamed row would carry its assertion vacuously rather than reporting that the
 * corpus moved underneath it.
 */
const row = (block: Block, key: string, what: string): Obj => {
  const found = block[key];
  assert.ok(found !== undefined, `${what}: the corpus declares no '${key}' — this probe's premise is stale`);
  return found;
};

/** Verify one requirement through the PRODUCTION join, which is the path a surface calls. */
const verified = (d: Obj, id: string): Verification => {
  const v = verifySystemRequirements(canonicalize(d)).get(id);
  assert.ok(v !== undefined, `'${id}' is not among the system's requirements — the probe is wrong`);
  return v;
};

/** The refusal sentence, asserted to exist rather than assumed. */
const problemOf = (v: Verification, what: string): string => {
  assert.equal(v.status, "error", `${what}: expected a DECLARATION error, got '${v.status}'`);
  assert.ok(v.status === "error");
  return v.problem;
};

// ---------------------------------------------------------------------------------------------
// 1. The three distortions, each driven through parse -> canonicalize -> verifySystemRequirements
// ---------------------------------------------------------------------------------------------

test("A1: a latency obligation decided by a measurement query reads error, not satisfied", () => {
  // The shipped `max-latency-among-successful-executions` is `exists` with no `within:` — a real
  // saved query, authored for a real purpose, which is what makes this the easy mistake. It reports
  // the worst case over the executions that publish; it compares that figure to nothing.
  const d = doc("document-processing");
  assert.equal(row(queriesOf(d), "max-latency-among-successful-executions", "A1")["quantifier"], "exists",
    "the premise: this shipped query MEASURES, and the probe is pointless if it ever gains a within:");
  requirementsOf(d)["normal-processing-under-750ms"] = {
    statement: "Normal processing completes within the declared 750 ms.",
    expressed_as: "max-latency-among-successful-executions",
    satisfied_when: "holds",
  };

  const problem = problemOf(verified(d, "normal-processing-under-750ms"), "A1");
  assert.match(problem, /declares no 'within:'/, "the refusal must name the missing declaration");
  assert.match(problem, /MEASURES latency/, "and the metric it measures instead");
  assert.match(problem, /within: <a model:-targeted ceiling/, "and the remedy, which is a query key");
});

test("B1: a memory obligation decided by a measurement cannot fail at any magnitude — now error", () => {
  // The sharpest of the three, because luck plays no part. `measurePeak`'s outcome is
  // `bounded ? "inconclusive" : "holds"` and there is no third arm, so this declaration reads
  // satisfied for every model at every magnitude. Driven at BOTH magnitudes to show the rule does
  // not depend on the figure either — a static refusal must not start caring what the number is.
  for (const [label, remediationMemory] of [["as shipped (384 MB peak)", null],
                                            ["raised to a 1,152 MB peak", "1024 MB"]] as const) {
    const d = doc("document-processing");
    if (remediationMemory !== null) {
      row(d["quantities"] as Block, "remediation-memory", "B1")["value"] = remediationMemory;
    }
    queriesOf(d)["peak-memory-measured"] = {
      name: "What is the peak memory over reachable configurations?",
      kind: "quantity", quantifier: "exists", quantity: { metric: "peak_memory" },
    };
    requirementsOf(d)["peak-memory-under-512mb"] = {
      statement: "Peak memory stays within the declared 512 MB.",
      expressed_as: "peak-memory-measured",
      satisfied_when: "holds",
    };

    const problem = problemOf(verified(d, "peak-memory-under-512mb"), `B1 ${label}`);
    assert.match(problem, /MEASURES peak_memory/, `B1 ${label}: the refusal names the measurement`);
  }
});

test("B1 mirror: the same measurement paired with refuted is unsatisfiable, and also error", () => {
  // The fourth cell of §4's table, and the one no probe in the ruling's §3 table names on its own.
  // A measurement whose obligation is discharged by `refuted` can never be discharged, because the
  // only outcomes are `holds` and `inconclusive`. Degenerate in the opposite direction from B1, and
  // refused by the same arm — which is what makes the rule a statement about the PAIRING.
  const d = doc("document-processing");
  queriesOf(d)["peak-memory-measured"] = {
    name: "What is the peak memory over reachable configurations?",
    kind: "quantity", quantifier: "exists", quantity: { metric: "peak_memory" },
  };
  requirementsOf(d)["peak-memory-unsatisfiable"] = {
    statement: "Peak memory stays within the declared 512 MB.",
    expressed_as: "peak-memory-measured",
    satisfied_when: "refuted",
  };
  assert.match(problemOf(verified(d, "peak-memory-unsatisfiable"), "B1 mirror"), /MEASURES peak_memory/);
});

test("D1: the CORRECT ceiling query with one inverted word reads error, not satisfied", () => {
  // The nastiest, and the one that makes the 261004 ruling's central claim hold. That ruling argued
  // there is nowhere to put a negation because the schema declares three keys and none is a
  // predicate. True of the schema, and insufficient: `satisfied_when` IS the polarity, and before
  // this arm nothing checked it was the right word for the query named.
  const d = doc("document-processing");
  const q = row(queriesOf(d), "successful-executions-within-two-seconds", "D1");
  assert.equal(q["quantifier"], "forall", "the premise: this is the CORRECT ceiling query");
  assert.equal((q["quantity"] as Obj)["within"], "successful-latency-requirement",
    "and it names the declared ceiling, so only the requirement's word is wrong");

  requirementsOf(d)["publication-latency-inverted"] = {
    statement: "Every execution that publishes completes within the declared two seconds.",
    expressed_as: "successful-executions-within-two-seconds",
    satisfied_when: "refuted",
  };

  const problem = problemOf(verified(d, "publication-latency-inverted"), "D1");
  assert.match(problem, /refutation IS the breach/, "the refusal must say why the word is wrong");
  assert.match(problem, /satisfied_when: holds/, "and name the one-word remedy");
  assert.match(problem, /successful-latency-requirement/, "and the ceiling the query decides");
});

// ---------------------------------------------------------------------------------------------
// 2. Positive controls — the shipped corpus must not move
// ---------------------------------------------------------------------------------------------

test("every sound quantity-decided requirement keeps deriving what it derives today", () => {
  // Every quantity-decided requirement in the corpus is pinned here. Enumerated from the corpus
  // rather than read off the ruling's §0.3, which describes the Sensor Node chain as though it were
  // the only one — the census pin below is what makes the count checkable.
  //
  // All must stay sound, and the rule must leave them alone for DIFFERENT reasons. A rule that broke
  // any of them is worse than the hole it closes.
  const sound: readonly (readonly [string, string, string, string])[] = [
    // The one the commissioning brief claimed a student cannot write. Authored, shipped, and
    // discharged through the join the brief said does not exist.
    ["embedded-sensor-node", "firmware-fits-physical-sram", "satisfied", "holds"],
    // The control that carries more weight: soundly authored AND currently violated, at 2,750 ms
    // against a declared 2,000 ms. A rule that refuses mis-authored pairings must leave a
    // sound-but-VIOLATED pairing alone — because it is the case where the deciding query returns the
    // verdict that does NOT discharge the obligation.
    ["document-processing", "successful-processing-within-two-seconds", "violated", "refuted"],
    // The capstone's two, added when autonomous-delivery landed. They raise the census from two to
    // four and they widen it on the axis that matters: a `peak_memory` ceiling, which the other two
    // rows do not cover at all. `measurePeak` is the arm with NO refuting case — the one whose
    // measurement sibling reads satisfied at every magnitude forever — so a sound peak_memory
    // pairing is the positive control that was previously missing.
    ["autonomous-delivery", "compute-payload-fits-onboard-ram", "satisfied", "holds"],
    // And the second sound-but-VIOLATED row, on `latency`: 2,715 s against a declared 900 s.
    ["autonomous-delivery", "delivering-missions-within-the-duration-budget", "violated", "refuted"],
  ];

  for (const [example, req, status, verdict] of sound) {
    const v = verified(doc(example), req);
    assert.notEqual(v.status, "error",
      `${example}/${req} reads error — the arm is refusing a SOUND declaration, which is a worse `
      + `defect than the hole it was written to close`);
    assert.equal(v.status, status, `${example}/${req}: the derived status must not move`);
    assert.ok(v.status === "satisfied" || v.status === "violated");
    assert.equal(v.verdict, verdict,
      `${example}/${req}: the verdict must not move either — the status alone would not distinguish `
      + `a preserved reading from a coincidence`);
  }
  assert.equal(sound.length, 4, "four quantity-decided requirements ship; a changed count means re-census");
});

test("every shipped requirement in the corpus is unaffected — zero findings at HEAD", () => {
  // The forward-policing claim, measured rather than asserted. `error` means a declaration could not
  // be read, so a corpus with any `error` would mean this arm found a real mis-authored requirement
  // — or broke a sound one. Neither is true today, and this pin is what notices when it stops being.
  const errors: string[] = [];
  let counted = 0;
  for (const id of SHIPPED_EXAMPLE_IDS) {
    for (const [req, v] of verifySystemRequirements(canonicalize(doc(id)))) {
      counted += 1;
      if (v.status === "error") errors.push(`${id}/${req}: ${v.problem}`);
    }
  }
  assert.equal(errors.length, 0, `the arm fires on a shipped requirement:\n${errors.join("\n")}`);
  // A probe that found nothing would carry the assertion above vacuously, so the corpus size is
  // pinned too. The ruling's §0.2 counted EIGHT; autonomous-delivery added six, two of them
  // quantity-decided, and the re-read §0.2 asks for confirms the ruling's claim still holds of the
  // wider corpus: every quantity-decided requirement declares `within:` with `satisfied_when: holds`,
  // now four of four rather than two of two, and the arm still finds nothing.
  assert.equal(counted, 14, "fourteen authored requirements ship; a changed count means re-read §0.2");
});

test("SCOPE: satisfied_when: refuted over behavior and graph queries is ordinary, not a defect", () => {
  // The positive control with teeth, and the reason the rule reads the PAIRING rather than the word.
  // `behavior.ts` and `graph.ts` each carry a `holds` and a `refuted` arm, so a breach query's
  // refutation is the normal discharge. Four shipped requirements declare it. A rule phrased as
  // "satisfied_when must be holds" would refuse every one.
  const refutedRows: readonly (readonly [string, string])[] = [
    ["message-bus", "no-restricted-data-to-an-impermitted-subscriber"],
    ["transaction-workspace", "commit-requires-validation"],
    ["document-processing", "publication-requires-validation"],
    ["worker-queue", "retry-policy-bounds-every-execution"],
  ];
  for (const [example, req] of refutedRows) {
    const d = doc(example);
    assert.equal(row(requirementsOf(d), req, `${example}/${req}`)["satisfied_when"], "refuted",
      `${example}/${req}: the premise is that this row declares refuted`);
    const v = verified(d, req);
    assert.notEqual(v.status, "error",
      `${example}/${req} reads error — the rule has leaked past kind: quantity and is refusing the `
      + `ordinary authoring of a breach query`);
  }
  assert.equal(refutedRows.length, 4, "four shipped rows declare refuted; a change means re-count");
});

// ---------------------------------------------------------------------------------------------
// 3. Coverage-independence — §5's sharp point
// ---------------------------------------------------------------------------------------------

test("the refusal is coverage-independent: the same declaration errors at limit 3 and exhaustive", () => {
  // Measured BEFORE the arm landed, this declaration read SATISFIED at exhaustive and INCONCLUSIVE
  // at `limit: 3` — so a refusal conditioned on the result would have reported one declaration
  // defect as two different things, neither of them the defect. The remedy is a one-word edit to the
  // requirement at both budgets, and the status must say so at both.
  const statuses = new Map<string, string>();
  for (const limit of [3, 10, null] as const) {
    const d = doc("document-processing");
    if (limit !== null) {
      (row(queriesOf(d), "successful-executions-within-two-seconds", "D1")["quantity"] as Obj)["limit"] = limit;
    }
    requirementsOf(d)["publication-latency-inverted"] = {
      statement: "Every execution that publishes completes within the declared two seconds.",
      expressed_as: "successful-executions-within-two-seconds",
      satisfied_when: "refuted",
    };
    const v = verified(d, "publication-latency-inverted");
    statuses.set(String(limit ?? "exhaustive"), v.status);
    assert.match(problemOf(v, `D1 at limit=${limit ?? "exhaustive"}`), /satisfied_when: holds/,
      `at limit=${limit ?? "exhaustive"} the remedy must still be the requirement's word, because `
      + `the walk's depth has no bearing on whether the pairing can decide anything`);
  }
  assert.deepEqual([...statuses.values()], ["error", "error", "error"],
    `the declaration defect must read the same at every budget, got ${JSON.stringify([...statuses])}`);

  // NEGATIVE CONTROL on the control: `limit` must genuinely move a verdict, or the three-way
  // agreement above is agreement about nothing. The SOUND row at `limit: 3` goes inconclusive.
  const sound = doc("document-processing");
  (row(queriesOf(sound), "successful-executions-within-two-seconds", "sound row")["quantity"] as Obj)["limit"] = 3;
  const bounded = verified(sound, "successful-processing-within-two-seconds");
  assert.equal(bounded.status, "inconclusive",
    "a truncated walk still degrades the SOUND row — so `limit: 3` is a real truncation and the "
    + "agreement above is the static refusal outranking it, not the limit being ignored");
});

// ---------------------------------------------------------------------------------------------
// 4. The boundary — what this rule does NOT catch
// ---------------------------------------------------------------------------------------------

test("BOUNDARY: a statically sound pairing can still decide the wrong question, and does", () => {
  // The honest half of §4, pinned so no reader mistakes the rule for more than it is. The arm decides
  // whether the named query can decide an obligation OF THIS SHAPE. It cannot decide whether the
  // query decides THIS obligation, and one member of that family is live and degenerate.
  //
  // Here is the whole of it: a ceiling query whose `target:` no configuration can satisfy. The
  // vocabulary all resolves, `within:` names the right declared ceiling, `forall` is forced, and the
  // requirement declares `holds`. Every condition the §4 rule checks is met. The selection is empty,
  // so the universal claim holds VACUOUSLY and the obligation reads SATISFIED while the product
  // holds 2,750 ms against the declared 750 ms.
  const d = doc("document-processing");
  queriesOf(d)["latency-ceiling-over-an-empty-selection"] = {
    name: "Every execution reaching an unreachable configuration stays within the declared ceiling",
    kind: "quantity", quantifier: "forall",
    quantity: {
      metric: "latency", within: "latency-requirement",
      // One machine in two states at once: well-formed, fully declared, satisfied by nothing.
      target: { "all-of": [{ "document-lifecycle.state": "published" },
                           { "document-lifecycle.state": "waiting" }] },
    },
  };
  requirementsOf(d)["normal-processing-under-750ms"] = {
    statement: "Normal processing completes within the declared 750 ms.",
    expressed_as: "latency-ceiling-over-an-empty-selection",
    satisfied_when: "holds",
  };

  // What is CORRECT and therefore pinned: the §4 arm does not fire. The declaration pair is sound —
  // the defect is in the selection, which is not a fact about the declaration pair at all.
  const v = verified(d, "normal-processing-under-750ms");
  assert.notEqual(v.status, "error",
    "the static arm must NOT fire here: conditioning it on an empty selection would make it read "
    + "the result, which §5 rules out and which would break the refusal's coverage-independence");

  // Also correct, and the reason this gap is cheap to close later: the evaluator ALREADY detects it
  // and says so in a typed disclosure. Nothing is missing from the analysis.
  const answer = runSavedQueries(canonicalize(d)).get("latency-ceiling-over-an-empty-selection");
  assert.equal(answer?.result.outcome, "holds");
  assert.equal(answer?.result.coverage.kind, "exhaustive", "and on a complete walk, so not a budget problem");
  assert.ok(answer?.result.compilation.some((c) => c.kind === "vacuous"),
    "the evaluator must disclose the vacuity — this is the signal a later ruling joins to the "
    + "verification, and if it disappears that ruling loses its evidence");

  // THE GAP, CLOSED — re-pointed per this assertion's own instruction rather than relaxed.
  // `DECISIONS-RULED-vacuous-verification-261005.md` rules V43: `verifyDeclaration`'s `Pick` now
  // carries `compilation`, and `verify` refuses to read a vacuous verdict as a discharge. The §4 arm
  // above is untouched and still must not fire — the two rules compose, one static over the
  // declaration and one over the result.
  assert.equal(v.status, "inconclusive",
    "the vacuity ruling (V43) has landed, so a vacuous ceiling must no longer read satisfied");
  assert.ok(v.status === "inconclusive");
  assert.equal(v.because.kind, "vacuous",
    "and the CAUSE must be vacuity, not `bounded` — the walk was exhaustive, so sending the reader "
    + "to raise a budget would report a selection defect as an evidence shortfall");
});

test("BOUNDARY: the wider family — a sound pairing against a more lenient declared ceiling", () => {
  // The non-degenerate members of the same family, named so the boundary is not mistaken for one
  // odd case. A requirement whose statement says 750 ms, decided by a query that names a DIFFERENT
  // declared ceiling, satisfies every condition §4 checks. No static rule over the declaration pair
  // can catch it: both the statement's figure and the query's ceiling are well-formed, and telling
  // them apart means reading prose against a number.
  const d = doc("document-processing");
  (d["quantities"] as Block)["generous-latency-ceiling"] = {
    target: "model:pipeline-performance", dimension: "duration", value: "60 s",
    description: "A ceiling nothing can exceed. Declared here to show the rule does not read it.",
  };
  queriesOf(d)["latency-within-a-generous-ceiling"] = {
    name: "Every execution stays within a minute",
    kind: "quantity", quantifier: "forall",
    quantity: { metric: "latency", within: "generous-latency-ceiling" },
  };
  requirementsOf(d)["normal-processing-under-750ms"] = {
    statement: "Normal processing completes within the declared 750 ms.",
    expressed_as: "latency-within-a-generous-ceiling",
    satisfied_when: "holds",
  };

  const v = verified(d, "normal-processing-under-750ms");
  assert.notEqual(v.status, "error", "the pairing is statically sound, and the arm correctly passes it");
  assert.equal(v.status, "satisfied",
    "DOCUMENTED LIMIT: the obligation's sentence and the query's ceiling are two declarations and "
    + "nothing joins them. This is the residue §4 leaves, and it is a scope question for the author "
    + "rather than a defect in the arm");
});
