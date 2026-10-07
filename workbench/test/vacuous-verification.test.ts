// V43 — a sound requirement decided by a VACUOUS query verifies as inconclusive, never satisfied.
//
// `DECISIONS-RULED-vacuous-verification-261005.md`. The third shape in the ceiling family and the
// nastiest: the requirement is soundly authored — correct `within:` ceiling query, correct
// `satisfied_when: holds` — and still read `satisfied` for an obligation the product violates, at
// 2,750 ms against a declared 750 ms, on an EXHAUSTIVE walk. The §4 arm cannot catch it, and must
// not try: by §4's verified truth table this pairing is the sound one, and the defect is in the
// selection rather than in the declaration pair.
//
// The producer already existed. `Compilation.kind` carries a `vacuous` arm, V41 requires a verdict
// decided by the predicate to emit it, and two evaluators do. Only the consumer was missing:
// `verifyDeclaration` took a `Pick` without `compilation`, so a vacuous `holds` and an earned
// `holds` were the same two words by the time anything interpreted them.
//
// ## What each pin catches, and the case where it passes while the property is violated
//
// Stated per-test rather than here, because a list of claims at the top of a file is the shape that
// goes stale first. Every test below carries a `VACUITY:` note naming the way it could pass
// vacuously, and the construction that stops it. The discipline is this ruling's own subject, and a
// vacuity fix whose test is vacuous would close the week's defect class in a full circle.
//
// The two that matter most, because they are the ones a reader should check first:
//
//   - The negative control would pass vacuously if the product did NOT in fact breach the ceiling —
//     then `inconclusive` would be the honest answer for an uninteresting reason and the pin would
//     prove nothing. So the breach is measured in the same test: the SAME declared ceiling with the
//     target removed reads `refuted` at 2,750 ms.
//   - Every pin here would pass vacuously if the vacuity disclosure were not what drives it. So one
//     test strips the disclosure and nothing else, and watches the verdict go back to `satisfied`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { runSavedQueries, verifySystemRequirements } from "../src/engine/index.ts";
import { verify, type Verification } from "../src/engine/verification.ts";
import { evaluationOf } from "../src/ir/types.ts";
import { exampleText } from "../scripts/gen-example-coverage.ts";
import { EXAMPLE_IDS } from "../src/app/example-corpus.ts";

type Obj = Record<string, unknown>;
type Block = Record<string, Obj>;

const doc = (id: string): Obj => parse(exampleText(id)) as Obj;
const queriesOf = (d: Obj): Block => d["queries"] as Block;
const requirementsOf = (d: Obj): Block => d["requirements"] as Block;

/** One authored row, asserted PRESENT before it is read — a probe reading `undefined` carries its
 * own assertion vacuously rather than reporting that the corpus moved. Phase A's helper, same job. */
const row = (block: Block, key: string, what: string): Obj => {
  const found = block[key];
  assert.ok(found !== undefined, `${what}: the corpus declares no '${key}' — this probe's premise is stale`);
  return found;
};

/**
 * The authored census: every shipped obligation, keyed `example/requirement`, read from the YAML.
 *
 * Two pins below need to know which obligations ship. Deriving that by calling
 * `verifySystemRequirements` would make each pin a statement about its own subject — a join that
 * enumerated nothing would also derive an expectation of nothing, and the two would agree about
 * having done nothing. So the census comes from the authored `requirements:` blocks, and the join's
 * enumeration is compared against it. The figure is never written into this file: a count written
 * against a corpus the project keeps growing is the defect this helper exists to remove.
 */
const authoredRequirements = (): readonly string[] =>
  EXAMPLE_IDS.flatMap((id) =>
    Object.keys(requirementsOf(doc(id)) ?? {}).map((req) => `${id}/${req}`));

/**
 * The authored obligations a `kind: quantity` query decides, by the `expressed_as` join in the YAML.
 * Derived from the declaration rather than from a verdict, so it classifies a requirement the same
 * way whether the engine answers it or not.
 */
const authoredQuantityDecided = (): readonly string[] =>
  // Both tracked populations: the pinned chains below live in the FIXTURE corpus (the 261006
  // split kept the former examples as test fixtures), and the derivation must see what `doc`
  // can read or a sound pin reads as a stale one.
  EXAMPLE_IDS.flatMap((id) => {
    const d = doc(id);
    const queries = queriesOf(d) ?? {};
    return Object.entries(requirementsOf(d) ?? {})
      .filter(([, r]) => queries[String(r["expressed_as"])]?.["kind"] === "quantity")
      .map(([req]) => `${id}/${req}`);
  });

/** Verify through the PRODUCTION join — the path a surface calls. */
const verified = (d: Obj, id: string): Verification => {
  const v = verifySystemRequirements(canonicalize(d)).get(id);
  assert.ok(v !== undefined, `'${id}' is not among the system's requirements — the probe is wrong`);
  return v;
};

/** The vacuity cause, asserted rather than assumed, with its remedy sentence returned. */
const vacuityOf = (v: Verification, what: string): string => {
  assert.equal(v.status, "inconclusive", `${what}: expected inconclusive, got '${v.status}'`);
  assert.ok(v.status === "inconclusive");
  assert.equal(v.because.kind, "vacuous",
    `${what}: the CAUSE must be vacuity. 'bounded' would send the reader to raise a budget, which `
    + `never makes an unreachable selection reachable — the §5 collapse of a model defect into an `
    + `evidence shortfall`);
  assert.ok(v.because.kind === "vacuous");
  assert.ok(v.because.detail !== null, `${what}: the cause must carry the evaluator's own sentence`);
  return v.because.detail;
};

/**
 * The ceiling query whose `target:` no configuration can satisfy — one machine in two control
 * states at once. Well-formed, fully declared, satisfied by nothing. Phase A's construction, reused
 * deliberately: it is the shape that ruling measured and reported rather than closed.
 */
const IMPOSSIBLE_TARGET = {
  "all-of": [{ "document-lifecycle.state": "published" }, { "document-lifecycle.state": "waiting" }],
};

/** The live case: a vacuous 750 ms ceiling obligation over document-processing. */
const vacuousCeiling = (limit: number | null = null): Obj => {
  const d = doc("document-processing");
  const quantity: Obj = {
    metric: "latency", within: "latency-requirement", target: IMPOSSIBLE_TARGET,
  };
  if (limit !== null) quantity["limit"] = limit;
  queriesOf(d)["latency-ceiling-over-an-empty-selection"] = {
    name: "Every execution reaching an unreachable configuration stays within the declared ceiling",
    kind: "quantity", quantifier: "forall", quantity,
  };
  requirementsOf(d)["normal-processing-under-750ms"] = {
    statement: "Normal processing completes within the declared 750 ms.",
    expressed_as: "latency-ceiling-over-an-empty-selection",
    satisfied_when: "holds",
  };
  return d;
};

// ---------------------------------------------------------------------------------------------
// 1. The live case, as a negative control WITH the breach it hides measured in the same test
// ---------------------------------------------------------------------------------------------

test("the vacuous 750 ms ceiling reads inconclusive, and the breach it hid is 2,750 ms", () => {
  // VACUITY: this pin would pass for an uninteresting reason if the product did not actually exceed
  // the declared ceiling — `inconclusive` would then be right by accident and the test would prove
  // nothing about hiding a breach. The breach is therefore MEASURED here, from the same declared
  // ceiling quantity, with only the impossible target removed.
  const d = vacuousCeiling();

  // The premise, asserted: the ceiling the query names is the 750 ms one the statement claims.
  const ceiling = row(d["quantities"] as Block, "latency-requirement", "the declared ceiling");
  assert.equal(ceiling["value"], "750 ms", "the probe's figure must come from the model, not the brief");

  // (a) The SAME ceiling with no target: the product breaches, and by how much.
  queriesOf(d)["bare-ceiling-no-target"] = {
    name: "Every execution stays within the declared ceiling",
    kind: "quantity", quantifier: "forall",
    quantity: { metric: "latency", within: "latency-requirement" },
  };
  const bare = runSavedQueries(canonicalize(d)).get("bare-ceiling-no-target");
  assert.equal(bare?.result.outcome, "refuted",
    "the premise of this whole ruling: the product REALLY exceeds 750 ms, so a `satisfied` reading "
    + "of the vacuous twin is a hidden breach rather than a harmless caveat");
  assert.equal(bare?.result.magnitude?.value, 2750, "the figure Phase A reported, re-measured here");
  assert.equal(bare?.result.magnitude?.unit, "ms");
  assert.equal(bare?.result.coverage.kind, "exhaustive",
    "and on a complete walk — so coverage sensitivity was never going to catch this");

  // (b) The vacuous twin, through the production join.
  const detail = vacuityOf(verified(d, "normal-processing-under-750ms"), "the live case");
  assert.match(detail, /holds vacuously/, "the remedy sentence must say the bound was not charged");
  assert.match(detail, /absence is the finding/,
    "and point at the selection, which is where the author has to go");
});

test("the disclosure is what drives it — strip the vacuity and the verdict returns to satisfied", () => {
  // VACUITY: every other pin in this file would pass if `verify` had started answering
  // `inconclusive` for some unrelated reason — an accidental coverage change, a parse failure
  // swallowed into a cause. This is the negative control ON the controls: the result is replayed
  // through `verify` twice, identical in every field except the disclosure.
  const d = vacuousCeiling();
  const res = runSavedQueries(canonicalize(d)).get("latency-ceiling-over-an-empty-selection");
  assert.ok(res !== undefined, "the probe's query did not run");
  assert.ok(res.result.compilation.some((c) => c.kind === "vacuous"),
    "the premise: the evaluator discloses the vacuity. If this fails the producer regressed, and "
    + "every assertion in this file is resting on nothing");

  const requirement = {
    id: "normal-processing-under-750ms",
    statement: "Normal processing completes within the declared 750 ms.",
    expressedAs: "latency-ceiling-over-an-empty-selection",
    satisfiedWhen: "holds",
  } as const;

  assert.equal(verify(requirement, evaluationOf(res.result)).status, "inconclusive",
    "with the disclosure: inconclusive");
  assert.equal(
    verify(requirement, evaluationOf({ ...res.result, compilation: [] })).status, "satisfied",
    "WITHOUT it, and with every other field byte-identical: satisfied. So the disclosure is the "
    + "whole of what changed the answer, and this file is testing the seam it claims to test");
});

// ---------------------------------------------------------------------------------------------
// 2. Coverage-independence — §5's mandate, and the direction of the fix
// ---------------------------------------------------------------------------------------------

test("coverage-independence: no budget makes the vacuous ceiling read satisfied", () => {
  // §5 of the ceiling ruling forbids a rule that becomes conditional on how far a walk got. The
  // measurement BEFORE this ruling is why it matters, and it ran in the opposite direction from the
  // obvious guess: the vacuous declaration read INCONCLUSIVE at `limit: 3` and `limit: 10` and
  // SATISFIED at exhaustive. More evidence flipped an unsettled reading green, for a selection that
  // is never charged at any depth. So the defect WAS the coverage-dependence, and this rule removes
  // it rather than adding one.
  //
  // VACUITY: a three-way agreement is agreement about nothing if `limit` does not actually bite, so
  // the negative control at the bottom shows the SOUND row degrading under the same budget.
  const statuses = new Map<string, string>();
  for (const limit of [3, 10, null] as const) {
    const v = verified(vacuousCeiling(limit), "normal-processing-under-750ms");
    statuses.set(String(limit ?? "exhaustive"), v.status);
  }
  assert.deepEqual([...statuses.values()], ["inconclusive", "inconclusive", "inconclusive"],
    `the status must not depend on the budget, got ${JSON.stringify([...statuses])}`);

  // At exhaustive the cause MUST be vacuity — that is V43's own requirement and it is pinned hard.
  vacuityOf(verified(vacuousCeiling(null), "normal-processing-under-750ms"),
    "at exhaustive the cause must name vacuity");

  // Under TRUNCATION the cause is deliberately NOT pinned to one value, and the reason is a live
  // divergence flagged in SEMANTICS.md §7.1 rather than indecision here. Two readings are defensible:
  // the shipped quantity evaluator withholds the vacuity disclosure under `bounded` coverage, because
  // the emptiness of a `target:` selection is established BY the walk and a deeper state might reach
  // it; V41's letter says vacuity is a property of the PREDICATE and travels under truncation too,
  // which would make this `vacuous` at every budget. V43 is indifferent — it reads the disclosure and
  // never the coverage — so pinning today's answer would freeze the weaker reading and make this test
  // fail the day the evaluator is brought to V41's letter. What V43 actually forbids is pinned above
  // and below: the STATUS must not move, and it must never be `satisfied`.
  const truncated = verified(vacuousCeiling(3), "normal-processing-under-750ms");
  assert.ok(truncated.status === "inconclusive");
  assert.ok(truncated.because.kind === "bounded" || truncated.because.kind === "vacuous",
    `under truncation the cause must be the budget or vacuity — both are sound readings of an `
    + `unreached selection. Got '${truncated.because.kind}', which is neither`);

  // NEGATIVE CONTROL on the control: `limit: 3` must genuinely truncate, or the agreement above is
  // agreement about nothing. The SOUND shipped row degrades under it.
  const sound = doc("document-processing");
  (row(queriesOf(sound), "successful-executions-within-two-seconds", "sound row")["quantity"] as Obj)["limit"] = 3;
  assert.equal(verified(sound, "successful-processing-within-two-seconds").status, "inconclusive",
    "a truncated walk still degrades the SOUND row — so `limit: 3` is a real truncation");
});

// ---------------------------------------------------------------------------------------------
// 3. The shipped behavioural case — V41's own scenario, reaching the verification layer
// ---------------------------------------------------------------------------------------------

test("a requirement over the SHIPPED vacuous breach query reads inconclusive in BOTH polarities", () => {
  // The sharpest control in this file, because nothing about the query is injected. `worker-queue`
  // ships `two-workers-own-one-job` — a `reach` whose target asks one machine to hold two control
  // states — and it returns `refuted` under exhaustive coverage with a V41 vacuity disclosure. No
  // shipped requirement names it, so this is the obligation someone writes next.
  //
  // Both polarities are driven, and that is the both-arms half of the ruling:
  //   - `satisfied_when: refuted` is the NATURAL authoring of a breach query, and the query's
  //     vacuous `refuted` would have discharged it. "Two workers never own one job" guaranteed by a
  //     contradiction the author wrote, not by the lease design.
  //   - `satisfied_when: holds` would have read `violated` — accusing the system of a breach on the
  //     strength of the same contradiction. The mirror error, and equally wrong.
  //
  // VACUITY: this pin would pass without testing anything if the shipped query stopped disclosing
  // vacuity, so the disclosure is asserted from the shipped model before either requirement is read.
  const base = doc("worker-queue");
  const shipped = row(queriesOf(base), "two-workers-own-one-job", "the shipped vacuous query");
  assert.equal(shipped["kind"], "behavior", "the premise: a behavioural query, so a DIFFERENT "
    + "evaluator from the quantity one above — the ruling is about the channel, not one producer");
  const answer = runSavedQueries(canonicalize(base)).get("two-workers-own-one-job");
  assert.equal(answer?.result.outcome, "refuted",
    "the premise: this vacuity rides a `refuted`, which is why the projection reads both arms");
  assert.equal(answer?.result.coverage.kind, "exhaustive");
  assert.ok(answer?.result.compilation.some((c) => c.kind === "vacuous"),
    "the premise: V41's disclosure is live on a SHIPPED query");

  for (const polarity of ["refuted", "holds"] as const) {
    const d = doc("worker-queue");
    requirementsOf(d)["no-dual-ownership"] = {
      statement: "Two workers must never simultaneously own the same job.",
      expressed_as: "two-workers-own-one-job",
      satisfied_when: polarity,
    };
    const detail = vacuityOf(verified(d, "no-dual-ownership"), `satisfied_when: ${polarity}`);
    assert.match(detail, /vacuous/i,
      `satisfied_when: ${polarity}: the behavioural evaluator's own sentence must travel too`);
    assert.match(detail, /cannot REPRESENT/,
      `satisfied_when: ${polarity}: and it must be the BEHAVIOURAL evaluator's sentence, not the `
      + `quantity one — two producers reach this cause and the reader needs the right remedy`);
  }
});

// ---------------------------------------------------------------------------------------------
// 4. Positive controls — the shipped corpus must not move, and the rule must not over-fire
// ---------------------------------------------------------------------------------------------

test("both sound shipped quantity-decided chains derive exactly what they derived before", () => {
  // A rule that breaks a sound requirement is worse than the hole it closes. The second row carries
  // the most weight: it is sound AND violated, so it proves this change leaves a genuine breach
  // reading as a breach rather than softening everything into `inconclusive`.
  //
  // VACUITY: the verdict is pinned beside the status. Status alone cannot tell a preserved reading
  // from a coincidence — `satisfied` on the wrong verdict would still read `satisfied`.
  const sound: readonly (readonly [string, string, string, string])[] = [
    ["embedded-sensor-node", "firmware-fits-physical-sram", "satisfied", "holds"],
    ["document-processing", "successful-processing-within-two-seconds", "violated", "refuted"],
  ];
  for (const [example, req, status, verdict] of sound) {
    const v = verified(doc(example), req);
    assert.equal(v.status, status,
      `${example}/${req}: the derived status moved. A vacuity rule that downgrades an EARNED verdict `
      + `is the failure V41 warns about — a disclosure that fires on the earned case teaches readers `
      + `to ignore the one that matters`);
    assert.ok(v.status === "satisfied" || v.status === "violated");
    assert.equal(v.verdict, verdict, `${example}/${req}: the verdict must not move either`);
  }

  // The assertion this replaces read `sound.length === 2`, and `sound` is the literal three lines
  // up — so it asserted a property of the fixture while its message promised it noticed corpus
  // growth. It could not fail unless someone edited the array, and when the capstone added two
  // quantity-decided requirements it stayed green. Growth is visible only against the corpus, so
  // that is what the pinned rows are now compared to.
  const derived = authoredQuantityDecided();
  const pinned = sound.map(([example, req]) => `${example}/${req}`);
  assert.ok(derived.length > 0,
    "no shipped requirement is quantity-decided, so the rows above are pinned against nothing and "
    + "the `expressed_as` join this reads has moved");
  for (const key of pinned) {
    assert.ok(derived.includes(key),
      `${key} is pinned here as a quantity-decided chain and the corpus no longer declares it as `
      + `one. Either its query changed kind or the row is stale. Quantity-decided at HEAD: `
      + `${derived.join(", ")}`);
  }

  // SUBSET, not equality, and the ruling is recorded because the trade is not obvious. Requiring
  // every quantity-decided requirement to be pinned here would guarantee a red suite on every future
  // example that authors one — a gate that fires on correct work, which teaches readers to edit the
  // list rather than read the test. It would also duplicate coverage: the census pin below already
  // polices ALL authored obligations for the `inconclusive`/`vacuous` reading these rows guard
  // against, generically and without a list. What these rows uniquely carry is a HAND-DERIVED
  // status-and-verdict oracle, and that job does not scale with the corpus — two chains of opposite
  // polarity prove the rule neither softens an earned pass nor softens a genuine breach, and a third
  // would prove it again. So the pinned set stays a subset, and the unpinned remainder is named in
  // the message above when a pin goes stale.
  //
  // What the subset reading gives up is noticing a NEW quantity-decided requirement, so the one
  // property that must not erode is pinned directly: both polarities stay covered. This is a claim
  // about the fixture rather than the corpus, which is exactly what the broken assertion was — the
  // difference is that this one says so, and fires for a reason (a row deleted, leaving the control
  // unable to distinguish "preserves passes" from "preserves breaches").
  assert.deepEqual([...new Set(sound.map(([, , status]) => status))].sort(), ["satisfied", "violated"],
    "this control needs one EARNED pass and one genuine breach among its pinned rows; with a single "
    + "polarity it cannot tell a rule that preserves verdicts from one that softens everything into "
    + "the status that happens to be pinned");
});

test("no shipped requirement moves — every authored obligation enumerated, zero vacuity findings", () => {
  // Forward-policing, measured. The rule lands green on the corpus: the shipped queries that DO
  // disclose vacuity are named by no requirement, so none DECIDES an obligation. This pin is what
  // notices when that stops being true — and if someone authors the worker-queue obligation above,
  // THIS is what fires.
  //
  // VACUITY: the enumeration is compared against the census derived from the authored YAML, so a
  // probe that enumerated nothing cannot carry the zero-findings assertion vacuously — an empty
  // enumeration fails the comparison against a non-empty census. That is the exact failure mode this
  // file is named for, and the reason the census is NOT computed by calling `verifySystemRequirements`
  // a second time: a figure derived from the thing under test agrees with it about having done
  // nothing, and cannot witness it.
  //
  // The census was formerly the literal `8`, which fired on the sixth example's arrival at 14 — a
  // correct reading of a number written against a set this project keeps growing. The comparison is
  // now set-valued rather than a count, which also catches the join DROPPING one obligation while
  // gaining another.
  const found: string[] = [];
  const enumerated: string[] = [];
  for (const id of EXAMPLE_IDS) {
    for (const [req, v] of verifySystemRequirements(canonicalize(doc(id)))) {
      enumerated.push(`${id}/${req}`);
      if (v.status === "inconclusive" && v.because.kind === "vacuous") found.push(`${id}/${req}`);
    }
  }
  assert.deepEqual(found, [], `a shipped requirement is decided by a vacuous query: ${found.join(", ")}`);

  const authored = authoredRequirements();
  assert.ok(authored.length > 0,
    "the authored census is EMPTY, so the zero-findings assertion above proved nothing. The probe is "
    + "reading the wrong corpus, and this is the vacuity the file is named for turned on itself");
  assert.deepEqual([...enumerated].sort(), [...authored].sort(),
    "the join must enumerate exactly the obligations the corpus authors — no count is written here, "
    + "so a seventh example grows both sides together and only a real divergence fires");

  // And the MECHANISM, derived rather than asserted in prose: no requirement may NAME a query that
  // discloses vacuity. This is strictly stronger than the zero-findings assertion above, because a
  // requirement over a vacuous query whose polarity is ALSO inverted reads `error` by the precedence
  // rule at the bottom of this file — §4 returns before `verify` is reached, so `found` would stay
  // empty while a shipped obligation rested on a contradiction.
  for (const id of EXAMPLE_IDS) {
    const d = doc(id);
    const vacuous = new Set([...runSavedQueries(canonicalize(d))]
      .filter(([, a]) => a.result.compilation.some((c) => c.kind === "vacuous"))
      .map(([q]) => q));
    for (const [req, r] of Object.entries(requirementsOf(d) ?? {})) {
      assert.ok(!vacuous.has(String(r["expressed_as"])),
        `${id}/${req} is decided by '${String(r["expressed_as"])}', a query that discloses vacuity. `
        + `The obligation rests on a selection nothing can satisfy rather than on the design, and no `
        + `polarity of satisfied_when makes it decidable`);
    }
  }
});

test("OVER-FIRING control: a lenient-but-REAL ceiling still reads satisfied", () => {
  // The discriminator between "vacuous" and merely "easy". This query charges real executions
  // against a ceiling nothing can exceed, so its `holds` is EARNED — the walk reached configurations
  // and compared a figure. It must keep reading `satisfied`, or the rule has stopped being about
  // vacuity and started refusing any requirement that passes comfortably.
  //
  // VACUITY: the magnitude is asserted non-null. That is the structural difference between the two
  // cases — a vacuous ceiling reports no figure because nothing was charged, and a pin that only
  // checked the status would pass against either.
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

  const res = runSavedQueries(canonicalize(d)).get("latency-within-a-generous-ceiling");
  assert.equal(res?.result.magnitude?.value, 2750,
    "the premise: this ceiling was CHARGED — a real figure was compared, which is what makes the "
    + "`holds` earned rather than vacuous");
  assert.ok(!res?.result.compilation.some((c) => c.kind === "vacuous"),
    "and the evaluator discloses no vacuity, which is the signal this rule reads");
  assert.equal(verified(d, "normal-processing-under-750ms").status, "satisfied",
    "an earned pass must stay a pass. This is the residue §4 leaves and V43 does not touch: the "
    + "statement's figure and the query's ceiling are two declarations and nothing joins them");
});

// ---------------------------------------------------------------------------------------------
// 5. Precedence — Phase A's static arm outranks this one, and must
// ---------------------------------------------------------------------------------------------

test("PRECEDENCE: a §4 distortion whose query is ALSO vacuous still reads error", () => {
  // The interaction, pinned because both rules can apply to one declaration and the ORDER decides
  // what the author is told. This is D1's distortion — the correct ceiling query with `satisfied_when`
  // inverted — pointed at the impossible selection. §4 fires on the pairing; V43 would fire on the
  // result.
  //
  // `error` must win, and the reason is the remedy. The pairing cannot decide an obligation at all:
  // with `satisfied_when: refuted` a found counterexample would DISCHARGE the obligation, so the
  // declaration is broken whatever the selection does. Reporting vacuity instead would send the
  // author to fix a target in a requirement that stays wrong once they have. The ordering is
  // structural rather than conventional: the §4 arm sits in `verifyDeclaration` and returns before
  // `verify` is ever called.
  //
  // VACUITY: both halves of the premise are asserted. Without the first this test would pass if §4
  // had simply stopped firing; without the second it would pass if the selection had stopped being
  // empty, and then it would not be testing precedence at all.
  const d = vacuousCeiling();
  row(requirementsOf(d), "normal-processing-under-750ms", "the §4 distortion")["satisfied_when"] = "refuted";

  const answer = runSavedQueries(canonicalize(d)).get("latency-ceiling-over-an-empty-selection");
  assert.ok(answer?.result.compilation.some((c) => c.kind === "vacuous"),
    "the premise: this query IS vacuous, so V43 would fire if §4 did not outrank it");

  const v = verified(d, "normal-processing-under-750ms");
  assert.equal(v.status, "error",
    "the DECLARATION defect outranks the result defect: an inverted polarity makes the obligation "
    + "undischargeable whatever the query selects, so the remedy is the requirement's word");
  assert.ok(v.status === "error");
  assert.match(v.problem, /refutation IS the breach/, "and the §4 refusal's own sentence survives");
  assert.match(v.problem, /satisfied_when: holds/, "with the one-word remedy it names");
});
