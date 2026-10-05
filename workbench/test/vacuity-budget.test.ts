// V44 — vacuity is decided by SATISFIABILITY, and an empty selection is not evidence of it.
//
// `DECISIONS-RULED-vacuity-budget-261005.md`. V43 left this open as a choice between two readings:
// disclose an unsatisfiable `target:` at every budget (V41's letter) or only at exhaustive (the
// shipped behaviour). Measuring the shipped behaviour first turned the question into a different one.
// The evaluator was not implementing EITHER reading, because it never decided satisfiability at all —
// it keyed the disclosure on "the selection came back empty on a complete walk", and that proxy is
// wrong in both directions:
//
//   - too FEW: an unsatisfiable target discloses nothing under a bound, though no walk is needed to
//     know that no state vector admits it;
//   - too MANY: a SATISFIABLE selection the design simply never reaches discloses vacuity, which is
//     the case V41 forbids by name. Measured live before the change: a 750 ms ceiling over
//     `uploaded AND retry_count: 1` on document-processing disclosed vacuity and verified
//     `inconclusive`/`vacuous` — a sound requirement downgraded by an over-firing control.
//
// So the fix is one discriminator for both defects, and it is the one the behavioural evaluator has
// used since V41: `satisfiability` over the state vector. Two axes stay apart — the OUTCOME reads
// coverage (V22, unchanged), the DISCLOSURE reads satisfiability and never coverage.
//
// ## What each pin catches, and the case where it passes while the property is violated
//
// Per-test, in a `VACUITY:` note, because this file's own subject is a control that fired on nothing.
// A vacuity fix whose tests are vacuous would close the week's defect class in a circle. The two
// worth reading first:
//
//   - The over-firing pin is the one that matters most, and it is the easiest to write vacuously: if
//     its selection were NOT actually empty, the `none` arm would never run and the test would prove
//     nothing. So it asserts the arm's own signature — a `holds` with a null magnitude under
//     exhaustive coverage — before it asserts the silence.
//   - The every-budget pin would be agreement about nothing if the small budget did not truncate, so
//     each row asserts its own coverage kind rather than trusting the `limit`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { validate } from "../src/validator/rules.ts";
import { runQuery, runSavedQueries, verifySystemRequirements } from "../src/engine/index.ts";
import { compileSystem } from "../src/engine/explore.ts";
import { buildScope } from "../src/engine/refs.ts";
import { compilePredicate, satisfiability } from "../src/engine/predicate.ts";
import { parsePredicate } from "../src/engine/types.ts";
import { exampleText } from "../scripts/gen-example-coverage.ts";
import type { CanonicalSystem, Compilation, QueryResult } from "../src/ir/types.ts";

type Obj = Record<string, unknown>;
type Block = Record<string, Obj>;

const doc = (id: string): Obj => parse(exampleText(id)) as Obj;
const queriesOf = (d: Obj): Block => d["queries"] as Block;
const requirementsOf = (d: Obj): Block => d["requirements"] as Block;

/** One authored row, asserted PRESENT before it is read — V43's helper, same job. */
const row = (block: Block, key: string, what: string): Obj => {
  const found = block[key];
  assert.ok(found !== undefined, `${what}: the corpus declares no '${key}' — this probe's premise is stale`);
  return found;
};

const vacuousNote = (res: QueryResult): Compilation | undefined =>
  res.compilation.find((c) => c.kind === "vacuous");

/**
 * The satisfiability the engine itself decides for a target, looked up rather than assumed.
 *
 * Every pin below rests on a claim about whether a predicate is satisfiable in the state vector. A
 * test that ASSERTED that claim in a comment would be pinning its own belief; this reads the
 * discriminator the production path reads, so a pin cannot silently describe the wrong case.
 */
const satisfiabilityOf = (system: CanonicalSystem, rawTarget: unknown): string => {
  const pred = parsePredicate(rawTarget);
  assert.ok(pred !== null, "the probe's target did not parse as a predicate");
  const scope = buildScope(system);
  const compiled = compilePredicate(scope, pred);
  assert.ok(compiled.ok, "the probe's target did not compile against the system's vocabulary");
  const space = compileSystem(system);
  assert.ok(space.ok, "the probe's system did not compile");
  return satisfiability(scope, pred, compiled.value, space.value.initial);
};

// ---------------------------------------------------------------------------------------------
// The fixture: document-processing's ceiling, over three selections that differ ONLY in kind
// ---------------------------------------------------------------------------------------------

/**
 * One machine in two control states at once. No state vector admits it, and no walk is needed to
 * know that — V41's own example, and the construction both prior waves used.
 */
const UNSATISFIABLE = {
  "all-of": [{ "document-lifecycle.state": "published" }, { "document-lifecycle.state": "waiting" }],
};

/**
 * SATISFIABLE and never reached. `uploaded` is the initial state and nothing transitions back into
 * it, while `retry_count` only advances on the retry edge — so the vector admits the pair and no
 * execution exhibits it. This is the EARNED absence, and the case the shipped proxy mislabelled.
 */
const SATISFIABLE_UNREACHED = {
  "all-of": [{ "document-lifecycle.state": "uploaded" }, { "document-lifecycle.retry_count": 1 }],
};

/** Reachable, and charged against a real figure — the row that must stay an ordinary verdict. */
const REACHED = { "document-lifecycle.state": "published" };

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
  const res = runSavedQueries(canonicalize(ceilingOver(target, limit))).get("ceiling-over-a-selection");
  assert.ok(res !== undefined, "the probe's query did not run");
  return res.result;
};

// ---------------------------------------------------------------------------------------------
// 1. The ruling: an unsatisfiable target discloses at EVERY budget
// ---------------------------------------------------------------------------------------------

test("an unsatisfiable target discloses vacuity at every budget, and the outcome still reads coverage", () => {
  // Catches a budget-dependent disclosure — the shipped behaviour, and a coverage-dependence of
  // exactly the shape V43's sharpest result removed: the same unsatisfiable selection disclosing at
  // one budget and not another, when satisfiability does not depend on how far anything walked.
  //
  // VACUITY: a three-way agreement is agreement about nothing if the small budgets do not actually
  // truncate — then all three rows would be the exhaustive row wearing different labels. So each row
  // asserts its OWN coverage kind, and the pin fails if `limit` stops biting. And the premise that
  // the target is unsatisfiable is LOOKED UP from the engine rather than asserted here.
  const system = canonicalize(ceilingOver(UNSATISFIABLE));
  assert.equal(satisfiabilityOf(system, UNSATISFIABLE), "unsatisfiable",
    "the premise: no state vector admits this target. If this fails the fixture stopped being the "
    + "case under test and every assertion below is about something else");

  const seen: { limit: string; coverage: string; outcome: string; disclosed: boolean }[] = [];
  for (const limit of [3, 10, null] as const) {
    const res = ceilingResult(UNSATISFIABLE, limit);
    seen.push({
      limit: String(limit ?? "exhaustive"), coverage: res.coverage.kind,
      outcome: res.outcome, disclosed: vacuousNote(res) !== undefined,
    });
  }

  assert.deepEqual(seen.map((s) => s.disclosed), [true, true, true],
    `the disclosure must not depend on the budget, got ${JSON.stringify(seen)}`);

  // The budgets really differ, which is what makes the agreement above meaningful.
  assert.deepEqual(seen.map((s) => s.coverage), ["bounded", "bounded", "exhaustive"],
    "the two small budgets must TRUNCATE and the last must not, or this test compares three copies "
    + "of one row");

  // The OUTCOME axis is untouched: V22 still governs it, and unsatisfiability does not promote a
  // truncated walk to a settled answer. `holds` beside `bounded` is the certainty-from-truncation
  // several suites in this repo assert against, and this rule must not manufacture it.
  assert.deepEqual(seen.map((s) => s.outcome), ["inconclusive", "inconclusive", "holds"],
    "the outcome follows COVERAGE, not satisfiability — the two axes stay apart");
});

test("the vacuous disclosure names the state vector, so a reader can tell it from an unreached selection", () => {
  // Catches a disclosure that fires correctly and says the wrong thing. The remedy differs between
  // the two absences — fix the predicate vs. make the selection reachable — so a sentence that only
  // said "nothing was reached" would leave the author to guess which of the two they are in.
  //
  // VACUITY: this passes while the property is violated if the sentence is matched so loosely that
  // the EARNED note would match it too. So the earned note is matched against the same patterns and
  // required NOT to carry them.
  const vacuous = vacuousNote(ceilingResult(UNSATISFIABLE));
  assert.ok(vacuous, "the premise: the unsatisfiable target discloses");
  assert.match(vacuous.explanation, /state vector/,
    "the disclosure must name the state vector — that is the claim, and it is stronger than absence");
  assert.match(vacuous.explanation, /cannot REPRESENT/,
    "V41's sound reading, in the evaluator's own words");
  assert.match(vacuous.explanation, /fix the predicate/, "and the remedy the cause carries");

  const earned = ceilingResult(SATISFIABLE_UNREACHED).compilation
    .map((c) => c.explanation).join(" ");
  assert.doesNotMatch(earned, /cannot REPRESENT/,
    "the earned absence must not borrow the vacuous reading — if it does, the two are "
    + "indistinguishable in prose even when the KIND tells them apart");
});

// ---------------------------------------------------------------------------------------------
// 2. The over-firing control — the half of V41 that must not break
// ---------------------------------------------------------------------------------------------

test("a SATISFIABLE selection the design never reaches stays EARNED and silent", () => {
  // The control that matters most, and the defect this ruling actually found. §7.1: "It MUST NOT emit
  // the disclosure when the predicate is satisfiable but unreachable. That is the earned verdict, and
  // a disclosure that fires on it teaches readers to ignore the one that matters." The shipped
  // evaluator could not obey that, because it never asked whether the predicate was satisfiable.
  //
  // Since V43 reads the disclosure to decide an obligation, over-firing is no longer cosmetic: it
  // downgrades a sound requirement. So the obligation's status is asserted too.
  //
  // VACUITY: this pin's whole premise is that the `none` arm RAN — if the selection were reachable,
  // the arm under test would never execute and the silence would be the silence of a different code
  // path entirely. So the arm's own signature is asserted first: a `holds` with no magnitude (nothing
  // was charged) under exhaustive coverage (the walk was complete, so the absence is real).
  const system = canonicalize(ceilingOver(SATISFIABLE_UNREACHED));
  assert.equal(satisfiabilityOf(system, SATISFIABLE_UNREACHED), "satisfiable",
    "the premise: the state vector DOES admit this pair. Without it this is just another "
    + "unsatisfiable target and the test pins nothing about over-firing");

  const res = ceilingResult(SATISFIABLE_UNREACHED);
  assert.equal(res.coverage.kind, "exhaustive", "the walk must be COMPLETE, or the absence is "
    + "truncation rather than the design");
  assert.equal(res.outcome, "holds");
  assert.equal(res.magnitude, null,
    "the empty-selection arm must be the one that ran: nothing was charged, so there is no figure");

  assert.equal(vacuousNote(res), undefined,
    "the earned absence MUST NOT be disclosed as vacuity. This is the assertion the shipped "
    + "evaluator failed, and an over-firing disclosure is worse than a missing one because it "
    + "trains readers to ignore it");

  // The consequence at the layer that reads the disclosure.
  const v = verifySystemRequirements(system).get("processing-under-750ms");
  assert.equal(v?.status, "satisfied",
    "a sound requirement over an earned absence must not be downgraded — before this ruling it read "
    + "inconclusive/vacuous, which sent the author to fix a predicate that was never wrong");
});

test("an ordinary reachable selection is still charged, and carries no disclosure at all", () => {
  // Catches a disclosure that fires on everything. A channel every result carries discloses nothing,
  // so the ordinary path is pinned beside the two absences.
  //
  // VACUITY: this would pass trivially if the query were refused or errored — then there would be no
  // disclosure because there was no result. So the FIGURE is asserted: a charged comparison, which is
  // the structural difference from both absences above.
  const res = ceilingResult(REACHED);
  assert.equal(res.coverage.kind, "exhaustive");
  assert.equal(res.outcome, "refuted", "document-processing really does breach its declared 750 ms");
  assert.equal(res.magnitude?.value, 2750, "and the breach is CHARGED — the figure is the evidence "
    + "that this row went through the measuring path, not an absence arm");
  assert.equal(vacuousNote(res), undefined, "a charged verdict is never vacuous");
});

// ---------------------------------------------------------------------------------------------
// 3. The third answer — a declined enumeration is not a licence to call it earned
// ---------------------------------------------------------------------------------------------

/**
 * A system whose predicate projection exceeds the enumeration budget while its REACHABLE space stays
 * tiny. Three independent variables over the same machine multiply past the bound; no transition
 * touches them, so the walk itself is small. That separation is the point: the budget that declines
 * is the PROJECTION's, not the walk's.
 */
const wideProjection = (): CanonicalSystem => canonicalize({
  mage: 1,
  system: { id: "wide-projection" },
  accounting: { latency: { basis: "entities" } },
  entities: { step: {} },
  models: { perf: { type: "graph", entities: [] } },
  machines: {
    m: {
      initial: "start",
      states: { start: null, step: null },
      variables: {
        x: { type: "integer", range: [0, 50] },
        y: { type: "integer", range: [0, 50] },
        z: { type: "integer", range: [0, 50] },
      },
      transitions: [{ from: "start", to: "step" }],
    },
  },
  quantities: {
    "step-latency": { target: "entity:step", dimension: "duration", value: "10 ms" },
    "ceiling": { target: "model:perf", dimension: "duration", value: "100 ms" },
  },
});

test("when the projection exceeds its budget, vacuity is NOT claimed and the decline is disclosed", () => {
  // V41's third answer: "Deciding satisfiability by enumeration MAY be bounded. An implementation
  // that declines MUST report a third answer distinct from both — never `satisfiable`, which is a
  // silent false negative." The three named arms carry it; this pins both halves of what `unknown`
  // must do — withhold the vacuity claim, and SAY the question went undecided rather than letting
  // silence read as the earned absence.
  //
  // VACUITY: this pin is worthless if the projection does not actually exceed the budget, because
  // then `unknown` never arises and the assertions describe the satisfiable arm. So the
  // discriminator's own answer is looked up first.
  const system = wideProjection();
  assert.deepEqual(validate(system), [], "the fixture must be a VALID model, or the probe is testing "
    + "the validator rather than the evaluator");

  const target = { "all-of": [{ "m.x": 7 }, { "m.y": 7 }, { "m.z": 7 }] };
  assert.equal(satisfiabilityOf(system, target), "unknown",
    "the premise: three 51-value domains multiply past the enumeration budget, so the projection "
    + "declines. If this reads satisfiable the fixture no longer reaches the arm under test");

  const res = runQuery(system, {
    kind: "quantity", quantifier: "forall",
    quantity: { metric: "latency", within: "ceiling", target },
  }).result;

  assert.equal(res.coverage.kind, "exhaustive", "the WALK is complete — only the PROJECTION declined, "
    + "and keeping those two budgets apart is the point of this fixture");
  assert.equal(vacuousNote(res), undefined,
    "an undecided satisfiability must never be reported as vacuity — that would be asserting a "
    + "contradiction nobody established");

  const prose = res.compilation.map((c) => c.explanation).join(" ");
  assert.match(prose, /NOT decided/,
    "and the decline must be VISIBLE: silence alone reads as the earned absence, which is the false "
    + "negative the third answer exists to prevent");
  assert.doesNotMatch(prose, /is SATISFIABLE in the state vector/,
    "nor may it claim the selection is satisfiable, which is the one answer V41 forbids outright");
});

// ---------------------------------------------------------------------------------------------
// 4. The shipped behavioural instance — unchanged, and the reason the discriminator is shared
// ---------------------------------------------------------------------------------------------

test("the SHIPPED vacuous query still discloses, through the evaluator this ruling did not touch", () => {
  // `worker-queue` ships `two-workers-own-one-job`, a `reach` whose target asks one machine for two
  // control states. It is the live instance both prior waves used, and it runs through the
  // BEHAVIOURAL evaluator — which has keyed on satisfiability since V41. This ruling brings the
  // quantity evaluator to that same discriminator rather than inventing a second one, so the pin
  // here is that the reference implementation is unmoved.
  //
  // VACUITY: this passes while testing nothing if the shipped query stopped existing or stopped being
  // a `reach`, so the corpus row is asserted before the result is read. And the sentence is matched
  // for wording only the behavioural evaluator writes, so a quantity-path regression cannot satisfy it.
  const base = doc("worker-queue");
  const shipped = row(queriesOf(base), "two-workers-own-one-job", "the shipped vacuous query");
  assert.equal(shipped["kind"], "behavior",
    "the premise: a DIFFERENT evaluator from the quantity one, which is why this pin is a "
    + "cross-check rather than a duplicate");

  const answer = runSavedQueries(canonicalize(base)).get("two-workers-own-one-job");
  assert.equal(answer?.result.outcome, "refuted");
  assert.equal(answer?.result.coverage.kind, "exhaustive");
  const note = answer === undefined ? undefined : vacuousNote(answer.result);
  assert.ok(note, "the premise of two prior rulings: V41's disclosure is live on a SHIPPED query");
  assert.match(note.explanation, /cannot REPRESENT/,
    "the behavioural evaluator's own sentence, which only it writes");
});

// ---------------------------------------------------------------------------------------------
// 5. The [FIX] — the exists measurement path, on the same discriminator
// ---------------------------------------------------------------------------------------------

/** A measurement (no `within`, `exists`) over one selection. V41's `reach` row, in quantity clothes. */
const measurementOver = (target: unknown): QueryResult => {
  const d = doc("document-processing");
  queriesOf(d)["measure-over-a-selection"] = {
    name: "The worst-case latency over the selected executions",
    kind: "quantity", quantifier: "exists",
    quantity: { metric: "latency", target },
  };
  const res = runSavedQueries(canonicalize(d)).get("measure-over-a-selection");
  assert.ok(res !== undefined, "the probe's measurement query did not run");
  return res.result;
};

test("the exists measurement path emits `vacuous` for an unsatisfiable selection, not `other`", () => {
  // V43 §5.2 reported this gap and left it: the measurement path returned `refuted` with only an
  // `other` disclosure, so the "binds forward" promise of the typed kind was unkept on one of the two
  // quantity paths. V41's table puts this row beside the ceiling's — a `reach` refuted because no
  // state vector admits the target is decided by the predicate, so it carries the same kind.
  //
  // The ruling above changed what the right kind IS here. The naive fix — disclose whenever the
  // selection comes back empty — would have imported the over-firing defect into a second evaluator,
  // which is why the earned twin is pinned in the same test rather than in a separate one.
  //
  // VACUITY: the empty selection is CONSTRUCTED from the shipped model's own vocabulary rather than
  // mocked, and the arm's signature (`refuted`, exhaustive, no magnitude) is asserted — so a pass
  // cannot come from a refusal, an error, or a path that never reached the absence arm.
  const vacuous = measurementOver(UNSATISFIABLE);
  assert.equal(vacuous.coverage.kind, "exhaustive");
  assert.equal(vacuous.outcome, "refuted", "an existential with no witness is refuted on a complete "
    + "walk (V22) — the OUTCOME axis is unchanged here too");
  assert.equal(vacuous.magnitude, null, "nothing was measured, so there is no figure — the signature "
    + "of the arm under test");
  const note = vacuousNote(vacuous);
  assert.ok(note, "the [FIX]: this path emitted `other` where V41's own table calls for `vacuous`");
  assert.match(note.explanation, /state vector/);
  assert.match(note.explanation, /nothing to measure/,
    "and it must speak the MEASUREMENT's polarity — a universal holds over nothing, an existential "
    + "is refuted by nothing, and the sentence should not confuse them");

  // The earned twin on the SAME path, which is what stops the fix from over-firing.
  const earned = measurementOver(SATISFIABLE_UNREACHED);
  assert.equal(earned.outcome, "refuted");
  assert.equal(earned.magnitude, null, "the same absence arm ran — so the two rows differ only in "
    + "the predicate's satisfiability");
  assert.equal(vacuousNote(earned), undefined,
    "a satisfiable selection the design never reaches is an EARNED refutation on this path too. The "
    + "fix had to discriminate, not merely start disclosing");
});

test("a measurement over a REACHED selection still reports its figure and witness", () => {
  // Catches the [FIX] breaking the ordinary measurement — the path's actual job.
  //
  // VACUITY: asserting only "no vacuous note" would pass on a refusal. The magnitude and the witness
  // are asserted, so the row has to be a real measurement.
  const res = measurementOver(REACHED);
  assert.equal(res.outcome, "holds");
  assert.equal(res.magnitude?.value, 2750, "the figure the shipped corpus reports for this selection");
  assert.ok(res.evidence !== null, "an existential is established by the witness that attains it");
  assert.equal(vacuousNote(res), undefined);
});
