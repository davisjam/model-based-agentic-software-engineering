// The conformance corpus's own gate: that each fixture's pinned interpretation is SENSITIVE to the
// meaning under test.
//
// ## What this file holds, and what it cannot
//
// `test/model-coverage.test.ts` already drives every tracked `*.mage.yaml` through the facade and
// compares each saved query's outcome against its `expect`, so the five fixture models' verdicts
// are checked by their existing. That is verdict-sensitivity and it is not enough here: a verdict
// pinned at `refuted` is also what a query answers when it is asked about nothing, and a fixture
// whose `refuted` came from an unexplored configuration space or an empty edge set would pass the
// coverage gate while demonstrating no correspondence at all. This repository spent 2026-10-04
// removing checks that could not fail, and a conformance corpus is the worst possible place to
// introduce another.
//
// So every test below MUTATES a fixture model and asserts the verdict MOVES WHEN THE MEANING MOVES
// AND HOLDS STILL WHEN IT DOES NOT. The mutations are chosen so the competing reading --
// "a relation type is a label", "a transition is an edge", "a unit is a label", "an entity id is
// scoped to the document that wrote it", "a verification is a field somebody filled in" -- is the
// thing that gets refuted. The shape is `test/lifecycle-model.test.ts`'s, which mutates its subject
// model and asserts the verdict flips, applied to a different kind of claim.
//
// **What no test here holds: that the correspondence is RIGHT.** The standard's half is not
// re-derived by anything in CI, because the Workbench takes no runtime dependency on the SysML v2
// Pilot Implementation (`DESIGN-v02-semantics-261004.md` §35.1). Nothing below should be read as
// conformance testing against the standard; it tests that the MAGE side of each claim means what
// the claim says it means. The standard side is a reading, recorded with its method and its bound
// in each fixture's `oracle.json`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Workspace } from "../src/app/services.ts";
import { realPorts } from "../scripts/gen-example-coverage.ts";
import { BINDINGS, MODEL_TYPES, type ModelTypeId } from "../src/engine/model-types.ts";
import { VERIFICATION_TEXT } from "../src/engine/verification.ts";
import { MageDocument } from "../src/yaml/document.ts";
import { validate } from "../src/validator/rules.ts";
import { verifySystemRequirements } from "../src/engine/index.ts";
import type { Verification } from "../src/engine/verification.ts";

// ----------------------------------------------------------------------------------------------
// The corpus, declared once
// ----------------------------------------------------------------------------------------------

/**
 * The three published methods, STRONGEST FIRST — so "weakest" below is a position in this array
 * rather than a comparison nobody wrote down. Closed, so a fourth cannot land unnoticed in a
 * manifest.
 */
const METHODS = ["oracle-executed", "normative-artifact", "spec-inspected"] as const;
type Method = (typeof METHODS)[number];

/** One component of a fixture's reading, as `oracle.json` records it. */
interface EvidenceComponent {
  readonly rung: string;
  /**
   * Whether the pinned interpretation RESTS on this component.
   *
   * Promoted from the `what` prose, which already self-labels the decisive and the corroborating
   * entries. A field rather than a sentence because the grade is computed from it: the manifest's
   * `methodDiscipline` says `method` is the weakest DECISIVE rung, and a rule stated in prose is a
   * rule the next gate author re-derives by reading.
   */
  readonly decisive: boolean;
  readonly what: string;
}

/**
 * The grade a fixture's own evidence FORCES: the weakest rung among its decisive components.
 *
 * This is the manifest's `methodDiscipline`, executed. Before 2026-10-05 the grade was held by
 * `assert.equal(record.method, f.method)` against a copy of it in this file — double-entry
 * bookkeeping, which catches a manifest edited without the test and cannot catch a fixture whose
 * grade is simply wrong. Two copies agreeing on a wrong value is a green suite, so a mis-grade was
 * unfalsifiable. Deriving makes the grade a function of the evidence, which is what the discipline
 * sentence always claimed it was.
 *
 * Corroborating components are excluded rather than min()-ed over, and that is the sentence the
 * manifest used to get wrong: it said "the weakest rung the interpretation DEPENDS ON", which reads
 * as a minimum over every entry. Taken that way two of the five fixtures violated it — both because
 * they list a confirming SysML Description they explicitly disclaim ("it is not what the claim rests
 * on"). Grading a fixture down for citing evidence it took care to label corroborating punishes the
 * scrupulous record and rewards the one that omits the sentence.
 *
 * Pure in `evidence` so the negative control below can drive it with a doctored array instead of
 * editing a fixture out from under a concurrent writer.
 */
function gradeOf(id: string, evidence: readonly EvidenceComponent[]): Method {
  assert.ok(evidence.length > 0,
    `${id}: oracle.json lists no evidence, so there is nothing for the grade to be derived FROM`);
  for (const e of evidence) {
    assert.ok(METHODS.includes(e.rung as Method),
      `${id}: evidence rung '${e.rung}' is not one of the published methods — `
      + `a rung outside ${METHODS.join(", ")} has no position in the strength order`);
    assert.equal(typeof e.decisive, "boolean",
      `${id}: an evidence component declares no \`decisive\` flag. The grade is the weakest DECISIVE `
      + `rung, so a component that does not say whether the claim rests on it cannot be graded.`);
  }
  const decisive = evidence.filter((e) => e.decisive);
  assert.ok(decisive.length > 0,
    `${id}: every evidence component is corroborating, so nothing carries the claim. A reading whose `
    + `decisive component is unlisted has no derivable grade — list it, or the headline is a guess.`);
  const weakest = Math.max(...decisive.map((e) => METHODS.indexOf(e.rung as Method)));
  return METHODS[weakest] as Method;
}

/**
 * That each `decisive` flag agrees with the prose it was promoted from.
 *
 * The flag is the authored surface the grade reads, so an edit to the flag alone moves the grade
 * while the sentence beside it still says the opposite. Where the `what` self-labels — every fixture
 * writes `DECISIVE` or `CORROBORATING` in the entries where the distinction decides something — the
 * two must agree. An entry carrying neither word is unconstrained here, which is the honest bound:
 * this holds the field against the prose, not the prose against the specification.
 */
function assertFlagsMatchProse(id: string, evidence: readonly EvidenceComponent[]): void {
  for (const [i, e] of evidence.entries()) {
    const saysCorroborating = e.what.includes("CORROBORATING");
    const saysDecisive = e.what.includes("DECISIVE");
    assert.ok(!(saysCorroborating && saysDecisive),
      `${id} evidence[${i}]: the prose claims both DECISIVE and CORROBORATING`);
    if (saysCorroborating || saysDecisive) {
      assert.equal(e.decisive, saysDecisive,
        `${id} evidence[${i}]: \`decisive: ${e.decisive}\` contradicts its own \`what\`, which reads `
        + `${saysDecisive ? "DECISIVE" : "CORROBORATING"}. The flag sets the fixture's grade, so the `
        + `two disagreeing means the grade rests on a claim the record argues against.`);
    }
  }
}

/** A fixture's evidence array, off disk. */
function evidenceOf(id: string): readonly EvidenceComponent[] {
  const oracle = JSON.parse(read(id, "oracle.json")) as {
    readonly evidence?: readonly EvidenceComponent[];
  };
  return oracle.evidence ?? [];
}

/** The grade the fixture's own `oracle.json` forces. */
function derivedMethod(id: string): Method {
  const evidence = evidenceOf(id);
  assertFlagsMatchProse(id, evidence);
  return gradeOf(id, evidence);
}

/**
 * §35.4's five rows, each with the LOOKUP that decides whether its construct still exists.
 *
 * The row names are a document fact — §35.4 enumerates five — but nothing below trusts them as
 * prose. Three rows resolve against `MODEL_TYPES`, one against `BINDINGS`, and the fifth against
 * the published schema's top-level properties plus the verification vocabulary. So a row cannot be
 * discharged, or stay owed, for a reason nothing checks; and a row cannot quietly leave the
 * obligation by being deleted from the manifest, because `SECTION_35_4_ROWS` is what the partition
 * below is taken against.
 */
const NON_MODEL_TYPE_ROWS = ["binding", "requirement, verification"] as const;
type Section354Row = ModelTypeId | (typeof NON_MODEL_TYPE_ROWS)[number];

/**
 * The row set, DERIVED from the registry for the three rows that are model types.
 *
 * Not a snapshot of their names: `test/derived-values.test.ts` refused the frozen copy, and it was
 * right to — the registry moves, and a second copy of a vocabulary typechecks while it disagrees
 * with the first. Deriving also buys a trigger the frozen list did not have: register a FOURTH
 * borrowed model type and the partition below goes red, saying §35.4 has a row with no fixture.
 */
const SECTION_35_4_ROWS: readonly Section354Row[] =
  [...MODEL_TYPES.map((t) => t.id), ...NON_MODEL_TYPE_ROWS];

interface Fixture {
  readonly id: string;
  /** The §35.4 row this fixture discharges, so the manifest cannot name a row that is gone. */
  readonly row: Section354Row;
}

/**
 * What the corpus claims to contain, as this file reads it — the join the manifest is checked
 * against rather than a second copy of it.
 *
 * No `method` here, deliberately. It used to carry one, and that copy was the whole of criterion
 * 13's enforcement: the test asserted the manifest's grade equalled this file's, so the two had to
 * be edited together and neither had to be RIGHT. The grade is now derived per fixture by
 * `derivedMethod` from that fixture's own `evidence[]`, and the manifest is checked against the
 * derivation. The row stays, because which §35.4 row a fixture discharges is a declared
 * correspondence rather than a computable one, and `rowResolves` holds it against the live registry.
 */
const CORPUS: readonly Fixture[] = [
  { id: "kerml/association-link-typing-001", row: "structural-graph" },
  { id: "kerml/binding-connector-identity-001", row: "binding" },
  { id: "sysml/transition-guard-occurrence-001", row: "state-machine" },
  { id: "sysml/quantity-unit-magnitude-001", row: "quantitative-model" },
  { id: "sysml/requirement-verification-verdict-001", row: "requirement, verification" },
];

/**
 * Whether the construct a row is about still exists, BY LOOKUP, with the reason it does not.
 *
 * Returns null when the row resolves. The three arms are the three places a borrowed-semantics
 * construct can live, and the 261004 incident is why the third exists: both owed rows carried an
 * absence reason the tree had already falsified, because the only lookup available read the SCHEMA
 * and both constructs had landed in `src/`.
 */
function rowResolves(row: Section354Row, authored: readonly string[]): string | null {
  const type = MODEL_TYPES.find((t) => t.id === row);
  if (type !== undefined) {
    return type.semanticBasis.kind === "borrowed"
      ? null
      : `'${row}' is no longer a borrowed row, so a fixture for it discharges nothing`;
  }
  if (row === "binding") {
    if (BINDINGS.length === 0) return "BINDINGS is empty, so there is no binding to correspond";
    const bases = new Set(BINDINGS.map((b) => b.semanticBasis.kind));
    return bases.size === 1 && bases.has("borrowed")
      ? null
      : `BINDINGS no longer shares one borrowed basis (kinds: ${[...bases].join(", ")})`;
  }
  // `requirement, verification` — two halves, and only the first is an authored key. The second is
  // derived per read and stored nowhere (V18), so it is looked up through the vocabulary the engine
  // owns rather than through the schema, which will never declare it.
  if (!authored.includes("requirements")) {
    return "mage-model.schema.json declares no top-level `requirements` property";
  }
  const words = Object.keys(VERIFICATION_TEXT).sort();
  const expected = ["error", "inconclusive", "satisfied", "violated"];
  return words.join(",") === expected.join(",")
    ? null
    : `VERIFICATION_TEXT's keys are ${words.join(", ")}, not §5.3's four`;
}

/**
 * The row-resolve lookup fires — negative control.
 *
 * `rowResolves` is what keeps the owed-row test honest now that `owed` is empty: with nothing to
 * iterate, it is the only thing in that test still reading the tree. A lookup nobody has watched
 * fail is worth little, so each arm is driven here against a doctored input rather than trusted.
 * The real tree is never mutated to prove this — `authored` is a parameter precisely so the schema
 * arm can be exercised without editing the published schema out from under a concurrent writer.
 */
test("the row-resolve lookup fires on a missing construct — negative control", () => {
  const real = authoredConstructs();
  assert.ok(real.includes("requirements"),
    "the schema no longer declares `requirements`, so the positive case below is not the positive case");

  // The arm that would have caught the 261004 rot if it had existed: the authored key is gone.
  const without = real.filter((k) => k !== "requirements");
  const missing = rowResolves("requirement, verification", without);
  assert.ok(missing !== null && missing.includes("requirements"),
    `a schema with no \`requirements\` property must not resolve the row that stands on it, and the `
    + `reason must name the key: ${String(missing)}`);

  // And the live tree resolves every row, which is the assertion the owed-row test makes. Checked
  // here too so a reader sees the control and the claim in one place.
  for (const row of SECTION_35_4_ROWS) {
    assert.equal(rowResolves(row, real), null, `§35.4's '${row}' row does not resolve at HEAD`);
  }
});

const fixtureFile = (id: string, name: string): string => `conformance/${id}/${name}`;
const read = (id: string, name: string): string => readFileSync(fixtureFile(id, name), "utf8");

/**
 * The authored construct set, BY LOOKUP: the published schema's top-level `properties`.
 *
 * Closed and enumerable, which is the property every absence claim in this file depends on — a
 * grep could have read the wrong subtree or searched a spelling the codebase does not use.
 */
const authoredConstructs = (): readonly string[] => {
  const schema = JSON.parse(readFileSync("mage-model.schema.json", "utf8")) as {
    readonly properties: Readonly<Record<string, unknown>>;
  };
  return Object.keys(schema.properties).sort();
};

// ----------------------------------------------------------------------------------------------
// Driving one model through the facade
// ----------------------------------------------------------------------------------------------

/** One query's answer, reduced to what a sensitivity assertion needs. */
interface Answer {
  readonly outcome: string;
  /** The normalized total a quantity query reports, or null. Base units, dimension attached. */
  readonly magnitude: { readonly value: number; readonly dimension: string; readonly unit: string } | null;
}

/** The normalized total every assertion below pins: 300 ms + 300 ms, in base units. */
const SIX_HUNDRED_MS = { value: 600, dimension: "duration", unit: "ms" } as const;

/**
 * Answer the named queries of a model document, through `Workspace` and `realPorts`.
 *
 * Through the facade for the reason the coverage gate gives: a reader who opens one of these
 * fixtures in the workbench gets the facade's answers, and a gate that called `runQuery` directly
 * would hold the engine to the claim while saying nothing about the application.
 *
 * `expectLoad` is a parameter rather than an assumption because one mutation below is SUPPOSED to
 * fail validation — a foreign unit on a duration quantity is the V30 finding, and a helper that
 * asserted loadability could not express that case.
 */
function answers(
  text: string, ids: readonly string[], expectLoad = true,
): { readonly findings: readonly string[]; readonly byId: ReadonlyMap<string, Answer> } {
  const ws = new Workspace(realPorts);
  const loaded = ws.load(text);
  const findings = loaded.findings.map((f) => `${f.rule}: ${f.message}`);
  if (!loaded.ok) {
    assert.equal(expectLoad, false,
      `the model did not load, so no verdict could be compared: ${findings.join("; ")}`);
    return { findings, byId: new Map() };
  }
  const byId = new Map<string, Answer>();
  for (const id of ids) {
    const saved = ws.state.system.queries.get(id);
    assert.ok(saved !== undefined, `the fixture declares no query '${id}' — a mutation renamed it`);
    const res = ws.query(saved.raw);
    const raw = res as { readonly magnitude?: Answer["magnitude"] };
    byId.set(id, { outcome: res.outcome, magnitude: raw.magnitude ?? null });
  }
  return { findings, byId };
}

const outcome = (
  a: { readonly byId: ReadonlyMap<string, Answer> }, id: string,
): string => a.byId.get(id)?.outcome ?? "ABSENT";

/**
 * Apply one textual substitution, asserting it actually matched.
 *
 * A mutation that silently matched nothing is the failure mode that makes a sensitivity test
 * vacuous: the "mutated" document is the original, the verdict is unchanged, and a test asserting
 * "unchanged" passes while a test asserting "flipped" fails for the wrong reason. So the count is
 * checked rather than hoped for.
 */
function mutate(text: string, from: string, to: string, expectedHits = 1): string {
  const hits = text.split(from).length - 1;
  assert.equal(hits, expectedHits,
    `the mutation's search text matched ${hits} times, expected ${expectedHits} — the fixture was `
    + `edited without updating this test, so the mutation below would be a no-op`);
  return text.split(from).join(to);
}

// ----------------------------------------------------------------------------------------------
// Corpus hygiene — the manifest describes what is on disk
// ----------------------------------------------------------------------------------------------

/**
 * The grade derivation MOVES when the evidence moves — negative control.
 *
 * A derivation nobody has watched fail is worth no more than the double-entry it replaced, and this
 * one's whole claim is that a mis-grade now goes red. So each arm doctors a real fixture's evidence
 * array in memory and asserts the derived grade changes. The fixtures on disk are never edited:
 * `gradeOf` takes the array as a parameter precisely so a concurrent writer's tree is not mutated to
 * prove a property about this file.
 *
 * `what` is neutral on the doctored entries so `assertFlagsMatchProse` is not the thing firing —
 * each arm has to exercise the grade computation itself. That check gets its own arm below.
 */
test("the method derivation moves when the evidence moves — negative control", () => {
  const na = "normative-artifact";
  const si = "spec-inspected";
  const decl = (rung: string, decisive: boolean): EvidenceComponent =>
    ({ rung, decisive, what: "a declared fact" });

  // The honest shape of the three normative-artifact fixtures: declared facts carry the claim, a
  // confirming sentence is listed and disclaimed. The sentence must not set the grade.
  assert.equal(gradeOf("probe", [decl(na, true), decl(na, true), decl(si, false)]), na,
    "a corroborating sentence dragged the grade down — this is exactly the min()-over-everything "
    + "reading the manifest's old wording invited, and it mis-graded two of the five fixtures");

  // Promote that same sentence to decisive and the grade MUST fall. This is the mis-grade the old
  // double-entry assertion could not see: a fixture whose claim rests on prose, headlined
  // `normative-artifact`, with the test file carrying the same wrong word.
  assert.equal(gradeOf("probe", [decl(na, true), decl(na, true), decl(si, true)]), si,
    "a decisive prose component did not pull the grade to spec-inspected");

  // And the other direction: strike the decisive sentence from a spec-inspected fixture and the
  // grade rises, so the derivation is not simply reporting whatever rung appears last.
  assert.equal(gradeOf("probe", [decl(na, true), decl(si, false)]), na,
    "the derivation ignored `decisive` and graded on the weakest rung present");

  // A reading with no decisive component has no derivable grade. Refusing is the only sound answer:
  // returning the weakest rung present would invent a claim the record does not make.
  assert.throws(() => gradeOf("probe", [decl(na, false), decl(si, false)]), /every evidence component is corroborating/,
    "an all-corroborating reading was graded rather than refused");
  assert.throws(() => gradeOf("probe", []), /nothing for the grade to be derived FROM/,
    "an empty evidence array was graded");

  // A rung outside the published three has no position in the strength order, so it cannot be
  // silently sorted to one end.
  assert.throws(() => gradeOf("probe", [decl("reviewed-by-person", true)]), /is not one of the published methods/,
    "an unpublished rung was accepted into the strength order");
});

/**
 * A `decisive` flag that contradicts its own prose fails — negative control.
 *
 * The flag is what the grade reads, and the prose is what justifies the flag. Editing the flag alone
 * is the cheapest way to move a grade, so the disagreement has to be the failure.
 */
test("a decisive flag contradicting its own prose fails — negative control", () => {
  const corroborating = "CORROBORATING prose: the Description says the same thing.";
  const decisive = "DECISIVE prose: the step from declared structure to identity.";

  assert.throws(
    () => assertFlagsMatchProse("probe", [{ rung: "spec-inspected", decisive: true, what: corroborating }]),
    /contradicts its own `what`/,
    "a corroborating component flagged decisive was accepted");
  assert.throws(
    () => assertFlagsMatchProse("probe", [{ rung: "spec-inspected", decisive: false, what: decisive }]),
    /contradicts its own `what`/,
    "a decisive component flagged corroborating was accepted — the shape that would QUIETLY RAISE a "
    + "grade, by hiding the sentence the claim rests on from the derivation");

  // An entry self-labelling both ways cannot be checked against, so it is refused rather than read.
  assert.throws(
    () => assertFlagsMatchProse("probe", [{ rung: "spec-inspected", decisive: true, what: `${decisive} ${corroborating}` }]),
    /claims both DECISIVE and CORROBORATING/);

  // Silence is allowed: most declared-structure entries name neither word, and inventing a default
  // here would assert agreement nobody wrote.
  assertFlagsMatchProse("probe", [{ rung: "normative-artifact", decisive: true, what: "Declared structure." }]);
  assertFlagsMatchProse("probe", [{ rung: "normative-artifact", decisive: false, what: "Artifact identity." }]);
});

test("every fixture ships all four files, and the manifest agrees with them", () => {
  const manifest = JSON.parse(read("", "manifest.json").replace(/^/, "")) as {
    readonly status: string;
    readonly fixtures: readonly {
      readonly id: string; readonly method: string; readonly dischargesRow: string;
      readonly mageModel: string; readonly standardSideModel: string;
      readonly expectedCorrespondence: string; readonly oracle: unknown;
      readonly reviewedByPerson: unknown;
      readonly semanticBasis: { readonly owner: string; readonly kind: string };
    }[];
    readonly owed: readonly { readonly row: string; readonly reason: string }[];
  };

  assert.deepEqual(manifest.fixtures.map((f) => f.id), CORPUS.map((f) => f.id),
    "the manifest's fixture list and this file's CORPUS disagree");

  for (const f of CORPUS) {
    const record = manifest.fixtures.find((m) => m.id === f.id);
    assert.ok(record !== undefined, `${f.id}: not in the manifest`);
    assert.ok(METHODS.includes(record.method as Method), `${f.id}: '${record.method}' is not a published method`);

    // The grade, DERIVED from this fixture's own evidence and compared — not compared against a
    // second copy of itself. `methodDiscipline` executed rather than read.
    assert.equal(record.method, derivedMethod(f.id),
      `${f.id}: the manifest grades this '${record.method}', and its own oracle.json evidence[] `
      + `forces '${derivedMethod(f.id)}' — the weakest rung among the components marked decisive. `
      + `Either the grade overstates what the claim rests on, or a component's \`decisive\` flag is `
      + `wrong. The manifest's methodDiscipline is the rule this assertion implements.`);

    // The four files §35.6 requires, each non-trivial. A claim.md that said only "this
    // corresponds" would clear a presence check and establish nothing, so the floor is a length.
    for (const name of ["claim.md", "model.mage.yaml", "oracle.json"]) {
      assert.ok(read(f.id, name).length > 400, `${fixtureFile(f.id, name)} is too short to carry a claim`);
    }
    const source = record.standardSideModel.endsWith(".kerml") ? "source.kerml" : "source.sysml";
    assert.ok(read(f.id, source).length > 400, `${fixtureFile(f.id, source)} is too short`);

    // The §35.4 row the fixture discharges must still resolve — looked up, not snapshotted, so a
    // registry or schema edit reaches this test. And the manifest must name the SAME row this file
    // does, or the two disagree about what has been discharged.
    assert.equal(record.dischargesRow, f.row,
      `${f.id}: the manifest says it discharges '${record.dischargesRow}' and this file says '${f.row}'`);
    assert.equal(rowResolves(f.row, authoredConstructs()), null,
      `${f.id}: §35.4's '${f.row}' row no longer resolves — ${rowResolves(f.row, authoredConstructs())}`);
    assert.equal(record.semanticBasis.kind, "borrowed", `${f.id}: the manifest disagrees with the registry`);
    assert.ok(record.expectedCorrespondence.length > 60,
      `${f.id}: the expected correspondence is too short to be falsifiable`);

    // No oracle ran, and the record must not imply one did. Both halves, because an `oracle` block
    // without a version and a method of `oracle-executed` without a block are the two ways this
    // field could overstate.
    if (record.method === "oracle-executed") {
      assert.notEqual(record.oracle, null, `${f.id}: claims oracle-executed and names no oracle`);
    } else {
      assert.equal(record.oracle, null,
        `${f.id}: method is '${record.method}' but an oracle is named — the methods must not collapse`);
    }
    assert.equal(record.reviewedByPerson, null,
      `${f.id}: a person is credited with reviewing this fixture. If that is now true, say so in `
      + `conformance/README.md as well, because the README states plainly that none has.`);
  }

  // The status line is DERIVED here and compared, so it cannot drift from the corpus it summarizes.
  // Derived now from each fixture's evidence rather than from a `method` column in this file, so the
  // headline count and the per-fixture grade answer to the same source.
  const grades = CORPUS.map((f) => derivedMethod(f.id));
  const n = (m: Method): number => grades.filter((g) => g === m).length;
  const expected = `checked by ${CORPUS.length} fixtures: ${n("oracle-executed")} oracle-executed, `
    + `${n("normative-artifact")} normative-artifact, ${n("spec-inspected")} spec-inspected`;
  assert.equal(manifest.status, expected, "the manifest's status line does not describe its own corpus");

  // §35.4 owes FIVE rows, and every one of them must be accounted for exactly once — discharged by
  // a fixture or declared owed. This replaced an assertion that the owed list still named the two
  // undischarged rows, which was correct while two were owed and would have had to be relaxed to
  // `[]` the day they landed. Relaxing it is the move that turns a control into decoration: `owed`
  // being empty is then an unchecked claim, and a row that quietly disappeared from BOTH arrays
  // looks exactly like a row that was discharged.
  //
  // So the PARTITION is what is asserted. A deleted row fails here no matter which array it was
  // deleted from, and the row set it is taken against is `SECTION_35_4_ROWS`, every member of
  // which must independently still resolve (`rowResolves`).
  const discharged = manifest.fixtures.map((f) => f.dischargesRow);
  const stillOwed = manifest.owed.map((o) => o.row);
  assert.deepEqual([...discharged].sort(), [...new Set(discharged)].sort(),
    `two fixtures claim the same §35.4 row: ${discharged.join(", ")}`);
  assert.deepEqual([...discharged, ...stillOwed].sort(), [...SECTION_35_4_ROWS].sort(),
    `§35.4's five rows are not partitioned between discharged and owed.\n`
    + `  discharged: ${discharged.join(" | ") || "(none)"}\n`
    + `  still owed: ${stillOwed.join(" | ") || "(none)"}\n`
    + `  §35.4:      ${SECTION_35_4_ROWS.join(" | ")}\n`
    + `A row missing from both arrays has not been discharged — it has become invisible, which is `
    + `the failure this assertion exists to make impossible. A row in both is claiming to be two `
    + `things at once.`);
  for (const o of manifest.owed) {
    assert.ok(o.reason.length > 80, `owed '${o.row}': the reason is a placeholder`);
  }
});

/** Why an owed row is owed. Closed, so a third reason cannot arrive as unchecked prose. */
const BLOCKERS = ["absent-construct", "clause-and-fixture"] as const;
type Blocker = (typeof BLOCKERS)[number];

interface OwedRow {
  readonly row: string;
  readonly blockedBy: Blocker;
  /** Names that must be ABSENT from the authored construct set. Empty unless `absent-construct`. */
  readonly absentConstructs: readonly string[];
  /** Top-level schema keys that must be PRESENT. Empty unless `clause-and-fixture`. */
  readonly authoredConstructs: readonly string[];
  /** `BINDINGS` names that must RESOLVE in the registry. Empty unless `clause-and-fixture`. */
  readonly registeredBindings: readonly string[];
  readonly reason: string;
}

test("every owed row says why it is owed, and both arms are a lookup rather than prose", () => {
  // This check goes red on PURPOSE when a construct lands, and the red is the point.
  //
  // "There is no binding construct, so a fixture would be fiction" is a NEGATIVE claim, and a
  // negative claim is only as wide as the search that produced it. A grep could have read the wrong
  // subtree, or searched a spelling the codebase does not use. The authored construct set does not
  // have that weakness: it is the top-level `properties` of the published model schema, closed and
  // enumerable, so the absence of a construct is a LOOKUP. That gives the obligation a trigger
  // instead of a reminder — the day a construct lands, the message says a fixture is now buildable.
  //
  // ## The arm that was missing, and what it cost
  //
  // The check read `absentConstructs` and never read the SENTENCE beside it, and on 261004 both
  // rows' sentences were false while this test was green:
  //
  //   - `binding` said "§14's bindings/compositions split has not landed, so there is no MAGE
  //     binding construct to correspond", and `BINDINGS`/`COMPOSITIONS` had been exported typed
  //     registries in `src/engine/model-types.ts` since earlier the same day. SEMANTICS.md already
  //     said so from the other side, calling the row the fourth implementable fixture target.
  //   - `requirement, verification` said "`verif` occurs nowhere in src/ or either schema as a
  //     construct", and `src/engine/verification.ts` carried §5.3's whole vocabulary.
  //
  // Neither drifted in a direction the absence lookup can see, because the lookup reads the SCHEMA
  // and both constructs had landed in `src/`. So the arm is the one the trigger lacked, pointed the
  // other way: a row whose `blockedBy` claims the construct EXISTS must NAME something, and every
  // name must resolve — against the schema's properties for an authored key, against the binding
  // registry for a kernel correspondence. A row can no longer be owed for a reason nothing checks.
  const authored = authoredConstructs();
  const registered = BINDINGS.map((b) => b.name);

  const manifest = JSON.parse(read("", "manifest.json")) as {
    readonly authoredConstructSet: readonly string[];
    readonly owed: readonly OwedRow[];
    readonly fixtures: readonly { readonly dischargesRow: string }[];
    readonly dischargedRows: Readonly<Record<string, string>>;
  };
  assert.deepEqual([...manifest.authoredConstructSet].sort(), authored,
    "the manifest's record of the authored construct set is stale — re-read mage-model.schema.json's "
    + "top-level `properties`, because every absence claim below is relative to it");

  // ## Why this test still has teeth with `owed` empty
  //
  // On 2026-10-05 the last two rows were discharged, so the loop below runs zero times. A loop that
  // cannot fail is exactly what this file was written to avoid, so the live assertions moved to the
  // ROW SET, which does not shrink when the obligation is met: every one of §35.4's five rows must
  // still RESOLVE, by the same lookups that decided whether it was owed. A construct being deleted
  // or un-borrowed goes red here whether or not anything is currently listed as owed — which is the
  // trigger the `absentConstructs` arm gave only to rows that happened to be owed at the time.
  for (const row of SECTION_35_4_ROWS) {
    assert.equal(rowResolves(row, authored), null,
      `§35.4's '${row}' row no longer resolves: ${rowResolves(row, authored)}. A fixture stands on `
      + `this row — if the construct genuinely went away, the fixture is now fiction and must be `
      + `retired, not left passing. Do not delete the row to quiet this.`);
  }

  // And the discharged half is a claim too, so it is read off disk rather than believed. A row the
  // manifest calls discharged must have a fixture that names it and four files on disk.
  const dischargedByFixture = manifest.fixtures.map((f) => f.dischargesRow).sort();
  assert.deepEqual(Object.keys(manifest.dischargedRows).sort(), dischargedByFixture,
    "the manifest's `dischargedRows` index and its own fixtures disagree about which §35.4 rows are "
    + "discharged — one of the two is stale");
  for (const row of SECTION_35_4_ROWS) {
    const owedHere = manifest.owed.some((o) => o.row === row);
    const dischargedHere = dischargedByFixture.includes(row);
    assert.ok(owedHere !== dischargedHere,
      `§35.4's '${row}' row is ${owedHere ? "both owed AND discharged" : "neither owed nor discharged"}`);
  }

  for (const o of manifest.owed) {
    assert.ok((BLOCKERS as readonly string[]).includes(o.blockedBy),
      `owed '${o.row}': blockedBy '${o.blockedBy}' is outside the closed set ${BLOCKERS.join(" | ")}. `
      + `A third reason needs a third arm below, not a new string.`);

    if (o.blockedBy === "absent-construct") {
      assert.ok(o.absentConstructs.length > 0,
        `owed '${o.row}': blocked by an absent construct and names none to be absent`);
      assert.deepEqual([...o.authoredConstructs, ...o.registeredBindings], [],
        `owed '${o.row}': claims the construct is absent AND names one that exists. Pick one — the `
        + `two arms are the two reasons a row can be owed, and a row that claims both is claiming `
        + `neither checkably.`);
      for (const name of o.absentConstructs) {
        assert.ok(!authored.includes(name),
          `mage-model.schema.json now declares a top-level '${name}' construct, so §35.4's '${o.row}' `
          + `row is no longer owed for want of something to correspond. A fixture is buildable: build `
          + `it under conformance/, move the row out of the manifest's \`owed\` array, and fill its `
          + `Clause cell in DESIGN-v02-semantics-261004.md §35.4. If the fixture is not buildable yet, `
          + `switch the row to blockedBy 'clause-and-fixture' and name what landed — do not delete the `
          + `name to quiet this, which defuses the trigger without discharging the obligation.`);
      }
      continue;
    }

    assert.deepEqual(o.absentConstructs, [],
      `owed '${o.row}': blocked only by a clause and a fixture, so it must claim no absence. `
      + `'${o.absentConstructs.join(", ")}' is left over from the other arm.`);
    const named = [...o.authoredConstructs, ...o.registeredBindings];
    assert.ok(named.length > 0,
      `owed '${o.row}': claims the construct exists and names nothing, so the claim is unverifiable. `
      + `Name the authored key or the registered binding the fixture would be built from.`);
    for (const name of o.authoredConstructs) {
      assert.ok(authored.includes(name),
        `owed '${o.row}' names authored construct '${name}', which mage-model.schema.json does not `
        + `declare as a top-level property. Either the key never landed — in which case this row is `
        + `blocked by an absent construct and should say so — or it was renamed and this row is now `
        + `asserting a construct that does not exist.`);
    }
    for (const name of o.registeredBindings) {
      assert.ok(registered.includes(name),
        `owed '${o.row}' names binding '${name}', which is not in BINDINGS `
        + `(${registered.join(", ")}). A row cannot be owed a fixture FOR a correspondence the kernel `
        + `does not register.`);
    }
  }
});

test("the README publishes the same status line the manifest derives", () => {
  // The number is read without the file, so the claim and its limit travel together or the README
  // becomes the stale copy. Same discipline as the coverage gate shipping NOT_PROVEN beside its
  // numbers.
  const manifest = JSON.parse(read("", "manifest.json")) as { readonly status: string };
  const readme = read("", "README.md");
  assert.ok(readme.includes(manifest.status),
    `conformance/README.md does not carry the manifest's status line verbatim.\n`
    + `  manifest: ${manifest.status}\n`
    + `  Paste that string into the README's status paragraph. The whole string, not a paraphrase: `
    + `a reader who sees a different count in the two files has to work out which is current, and `
    + `the one they are more likely to read is the prose.`);
  assert.ok(readme.includes("No reference implementation ran"),
    "the README must say plainly that no oracle ran, since every fixture records method != oracle-executed");
});

// ----------------------------------------------------------------------------------------------
// kerml/association-link-typing-001 — a relation type classifies its links
// ----------------------------------------------------------------------------------------------

const K_ID = "kerml/association-link-typing-001";
const K_SPAN = "conveys-does-not-span-the-chain";
const K_OWN = "conveys-reaches-its-own-target";

test("a relation type's classification decides the answer, and retyping one edge flips it", () => {
  const original = read(K_ID, "model.mage.yaml");
  const base = answers(original, [K_SPAN, K_OWN]);

  // The pinned pair, as the fixture stands. The positive control is what makes the `refuted`
  // informative: the same form, relation type and source DO answer `holds` one hop in.
  assert.deepEqual(base.findings, [], `${K_ID} carries validation findings`);
  assert.equal(outcome(base, K_SPAN), "refuted",
    "the two-hop chain is spanned under `conveys`, so the classification is not restricting the range");
  assert.equal(outcome(base, K_OWN), "holds",
    "`conveys` does not even reach its own target, so the `refuted` above says nothing about typing");

  // THE sensitivity test. Retype the single `beta -> gamma` edge and change nothing else: no
  // entity, no relation type, no composition declaration, no query. If a relation type were a
  // display label this edit would be invisible and the verdict would not move.
  const retyped = mutate(original, "        type: records\n", "        type: conveys\n");
  const after = answers(retyped, [K_SPAN, K_OWN]);
  assert.deepEqual(after.findings, [], "the retyped model does not validate, so its verdict is unusable");
  assert.equal(outcome(after, K_SPAN), "holds",
    "retyping the second hop to `conveys` left the chain unspanned — the verdict is insensitive to "
    + "the type assignment, which is exactly what this fixture claims it is not");
  assert.equal(outcome(after, K_OWN), "holds", "the positive control must survive the mutation");
});

// ----------------------------------------------------------------------------------------------
// sysml/transition-guard-occurrence-001 — a guard conditions occurrence, not drawing
// ----------------------------------------------------------------------------------------------

const T_ID = "sysml/transition-guard-occurrence-001";
const T_REACH = "open-is-never-entered";
const T_LIVE = "unlock-never-occurs";
const T_CONTROL = "armed-is-entered";

test("a guard decides whether a declared transition occurs, and satisfying it flips both forms", () => {
  const original = read(T_ID, "model.mage.yaml");
  const base = answers(original, [T_REACH, T_LIVE, T_CONTROL]);

  assert.deepEqual(base.findings, [], `${T_ID} carries validation findings`);
  assert.equal(outcome(base, T_REACH), "refuted", "`open` is entered despite the unsatisfiable guard");
  assert.equal(outcome(base, T_LIVE), "refuted", "`unlock` is executable despite the unsatisfiable guard");
  assert.equal(outcome(base, T_CONTROL), "holds",
    "`armed` is unreachable too, so the configuration space is empty or unexplored and the two "
    + "`refuted`s above are vacuous");

  // THE sensitivity test, and the sharp half: an effect that makes the guard satisfiable, added to
  // a DIFFERENT transition. No state is added, removed or renamed; no edge is added or removed.
  // The state diagram's shape is unchanged. Only guard satisfiability moved, and under a reading
  // where a transition were a static edge nothing here could change an answer.
  const enabled = mutate(original,
    "        label: arm\n", "        label: arm\n        effects:\n          key: 1\n");
  const after = answers(enabled, [T_REACH, T_LIVE, T_CONTROL]);
  assert.deepEqual(after.findings, [], "the effect-bearing model does not validate");
  assert.equal(outcome(after, T_REACH), "holds",
    "`key` can now reach 1 and `open` is still unreachable — occupancy is not tracking the guard");
  assert.equal(outcome(after, T_LIVE), "holds",
    "`unlock` is still not executable with its guard satisfiable — liveness is not tracking the guard");
  assert.equal(outcome(after, T_CONTROL), "holds", "the positive control must survive the mutation");

  // The second direction: remove the guard outright. A reading under which `requires:` were
  // commentary predicts no change here either, and this is the cheaper mutation to get right, so
  // it is run as well rather than instead.
  const unguarded = mutate(original, "        requires:\n          key: 1\n", "");
  const open = answers(unguarded, [T_REACH, T_LIVE]);
  assert.equal(outcome(open, T_REACH), "holds", "`open` is unreachable with no guard at all");
  assert.equal(outcome(open, T_LIVE), "holds", "`unlock` is not executable with no guard at all");
});

// ----------------------------------------------------------------------------------------------
// sysml/quantity-unit-magnitude-001 — a magnitude is a number AND a unit
// ----------------------------------------------------------------------------------------------

const Q_ID = "sysml/quantity-unit-magnitude-001";
const Q_BUDGET = "run-stays-within-its-budget";
const Q_FINISH = "run-finishes";

test("the ceiling verdict follows the magnitudes, not the unit tokens", () => {
  const original = read(Q_ID, "model.mage.yaml");
  const base = answers(original, [Q_BUDGET, Q_FINISH]);

  assert.deepEqual(base.findings, [], `${Q_ID} carries validation findings`);
  assert.equal(outcome(base, Q_FINISH), "holds",
    "`finished` is unreachable, so the ceiling query decides over no executions and `holds` is vacuous");
  assert.equal(outcome(base, Q_BUDGET), "holds",
    "600 ms was not found to be within 1 s — either the charges did not normalize or the ceiling did not");

  // The arithmetic the comparison actually performed, in base units. Pinned because it is the one
  // observable that distinguishes "normalized and compared" from "happened to answer holds".
  assert.deepEqual(base.byId.get(Q_BUDGET)?.magnitude, SIX_HUNDRED_MS,
    "the reported total is not 600 ms, so the two 300 ms charges did not sum as magnitudes");

  // Magnitude-PRESERVING rewrites. Both sides, separately, because the normalization could be
  // right on one side and absent on the other and a single rewrite would not tell them apart.
  for (const [label, text] of [
    ["the ceiling respelled as 1000 ms", mutate(original, "    value: 1 s\n", "    value: 1000 ms\n")],
    ["both charges respelled as 0.3 s", mutate(original, "    value: 300 ms\n", "    value: 0.3 s\n", 2)],
  ] as const) {
    const a = answers(text, [Q_BUDGET]);
    assert.deepEqual(a.findings, [], `${label}: the rewritten model does not validate`);
    assert.equal(outcome(a, Q_BUDGET), "holds",
      `${label}: a rewrite that changed no magnitude changed the verdict, so the unit token is `
      + `doing work the magnitude should be doing`);
    assert.deepEqual(a.byId.get(Q_BUDGET)?.magnitude, SIX_HUNDRED_MS,
      `${label}: the normalized total moved under a magnitude-preserving rewrite`);
  }

  // Magnitude-CHANGING rewrites. Without these the assertions above are consistent with the gate
  // answering `holds` to every ceiling it is given.
  for (const [label, text] of [
    ["a 500 ms ceiling", mutate(original, "    value: 1 s\n", "    value: 500 ms\n")],
    ["a 0.5 s ceiling, the same magnitude spelled differently",
      mutate(original, "    value: 1 s\n", "    value: 0.5 s\n")],
    ["a 1 ms ceiling — the number a label-blind reading would compare 600 against",
      mutate(original, "    value: 1 s\n", "    value: 1 ms\n")],
  ] as const) {
    const a = answers(text, [Q_BUDGET]);
    assert.equal(outcome(a, Q_BUDGET), "refuted",
      `${label}: a ceiling the total exceeds was reported as met`);
  }
});

test("a unit outside the declared dimension is refused by name, not coerced", () => {
  // The MAGE realization of `mRef: DurationUnit[1]`: a unit belonging to another dimension cannot
  // be the measurement reference, so there is no magnitude to compute with and the model does not
  // load. The alternative a reader might fear — silently reading 300 out of `300 MB` — is what
  // this pins against.
  const foreign = mutate(read(Q_ID, "model.mage.yaml"),
    "    value: 300 ms\n    description: One pass of Stage A.",
    "    value: 300 MB\n    description: One pass of Stage A.");
  const a = answers(foreign, [], false);
  assert.ok(a.findings.some((f) => f.startsWith("V30:")),
    `a memory unit on a duration quantity produced no V30 finding: ${JSON.stringify(a.findings)}`);
  assert.ok(a.findings.some((f) => f.includes("300 MB") && f.includes("duration")),
    `the finding does not quote the author's own text and name the declared dimension: `
    + `${JSON.stringify(a.findings)}`);
});

// ----------------------------------------------------------------------------------------------
// kerml/binding-connector-identity-001 — one entity id denotes one entity across models
// ----------------------------------------------------------------------------------------------

const B_ID = "kerml/binding-connector-identity-001";
const B_SPAN = "handoff-spans-the-two-models";
const B_ISOLATED = "handoff-does-not-reach-the-unconnected-entity";
const B_CONTROL = "handoff-reaches-its-own-model-target";

test("a shared entity id is what joins two models, and moving it off the junction flips the span", () => {
  const original = read(B_ID, "model.mage.yaml");
  const base = answers(original, [B_SPAN, B_ISOLATED, B_CONTROL]);

  assert.deepEqual(base.findings, [], `${B_ID} carries validation findings`);
  assert.equal(outcome(base, B_SPAN), "holds",
    "`alpha` does not reach `omega`, so the two models' edge sets are not composing at the shared "
    + "id — which is the correspondence this fixture exists to pin");
  assert.equal(outcome(base, B_ISOLATED), "refuted",
    "`alpha` reaches `isolated`, which no edge touches — so `reachability` is answering `holds` to "
    + "everything and the `holds` above says nothing about identity");
  assert.equal(outcome(base, B_CONTROL), "holds",
    "`alpha` does not reach `shared` one hop away inside one model, so the model is broken rather "
    + "than discriminating");

  // THE sensitivity test. Retarget the DOWNSTREAM edge's source from `shared` to `isolated` — a
  // declared entity already listed by both models, so nothing is added, no entity is renamed, no
  // model membership changes and no query moves. The two edges are the same two edges; only the id
  // at the junction differs. Under a reading where an entity id were a model-local label, the two
  // models would already be disjoint and this edit could not change an answer.
  const unjoined = mutate(original, "        from: shared\n", "        from: isolated\n");
  const after = answers(unjoined, [B_SPAN, B_ISOLATED, B_CONTROL]);
  assert.deepEqual(after.findings, [], "the retargeted model does not validate, so its verdict is unusable");
  assert.equal(outcome(after, B_SPAN), "refuted",
    "the junction was moved off `shared` and `alpha` still reaches `omega` — the verdict is "
    + "insensitive to WHICH id the two models share, which is exactly what this fixture claims it "
    + "is not");
  assert.equal(outcome(after, B_ISOLATED), "refuted",
    "`isolated` is now a source but still no target of any edge, so this must hold still");
  assert.equal(outcome(after, B_CONTROL), "holds", "the positive control must survive the mutation");
});

// ----------------------------------------------------------------------------------------------
// sysml/requirement-verification-verdict-001 — the verdict is computed, never stored
// ----------------------------------------------------------------------------------------------

const R_ID = "sysml/requirement-verification-verdict-001";
const R_REQ = "no-impermitted-subscription";
const R_BREACH = "impermitted-subscription-exists";
const R_CONTROL = "some-subscription-is-within-its-permit";

/**
 * Verify the fixture's one requirement, through the IR the way a reader would.
 *
 * `verifySystemRequirements` is called on a freshly sealed system every time and nothing is cached,
 * which is the point under test: there is no stored status for a mutation to leave stale.
 */
function verified(text: string): { readonly verification: Verification; readonly breach: string } {
  const loaded = MageDocument.load(text);
  assert.ok(loaded.document !== null, `the fixture did not load: ${JSON.stringify(loaded.findings)}`);
  const system = loaded.document.seal().system();
  assert.deepEqual(validate(system), [],
    "the fixture must validate clean, or every verdict below describes a broken model");
  const v = verifySystemRequirements(system).get(R_REQ);
  assert.ok(v !== undefined, `no verification for '${R_REQ}' — the IR dropped the declaration`);
  const saved = system.queries.get(R_BREACH);
  assert.ok(saved !== undefined, "the fixture declares no breach query — a mutation renamed it");
  const ws = new Workspace(realPorts);
  assert.ok(ws.load(text).ok);
  return { verification: v, breach: ws.query(saved.raw).outcome };
}

test("the requirement's verdict is computed from the model and the declaration, not recorded", () => {
  const original = read(R_ID, "model.mage.yaml");

  // As shipped: no subscription breaches its permit, so the positive breach query is refuted and
  // the obligation is discharged.
  const base = verified(original);
  assert.equal(base.breach, "refuted", "the breach query holds as shipped, so the fixture starts violated");
  assert.equal(base.verification.status, "satisfied",
    "a refuted breach query under `satisfied_when: refuted` must discharge the obligation");

  // The positive control, and it is what makes `refuted` informative: the SAME form over the same
  // relation and the same two properties DOES answer `holds` in the direction that is satisfied. An
  // empty edge set, or a property that failed to resolve, would answer `refuted` above and
  // demonstrate nothing.
  const ctl = answers(original, [R_CONTROL]);
  assert.deepEqual(ctl.findings, [], `${R_ID} carries validation findings`);
  assert.equal(outcome(ctl, R_CONTROL), "holds",
    "the comparison never fired, so the `refuted` breach is vacuous and this fixture pins nothing");

  // MUTATION 1 — THE POLARITY. Flip the declared discharging value and touch nothing else: no
  // entity, no property, no relation, no query. The query's answer is unchanged. Under a reading
  // where `satisfied_when` were documentation, nothing here could move.
  const flipped = verified(mutate(original, "    satisfied_when: refuted\n", "    satisfied_when: holds\n"));
  assert.equal(flipped.breach, "refuted", "the mutation must not change what the models say");
  assert.equal(flipped.verification.status, "violated",
    "the same query answer discharged the obligation under one `satisfied_when` and must breach it "
    + "under the other — the polarity lives in the declaration and nowhere else");

  // MUTATION 2 — THE MODEL CHANGED, THE QUERY DID NOT. One property value on one entity. The
  // requirement is byte-identical and so is the query. A stored status could not move here.
  const breached = verified(mutate(original,
    "      permits: { value: internal, domain: sensitivity }\n",
    "      permits: { value: public, domain: sensitivity }\n"));
  assert.equal(breached.breach, "holds", "lowering the permit below what the event carries must expose the breach");
  assert.equal(breached.verification.status, "violated",
    "the system under design changed and the verdict did not — the status is being read from "
    + "somewhere other than the current model");
  assert.equal(breached.verification.status === "violated" ? breached.verification.verdict : null, "holds",
    "a violated verification must carry the evidence's direction, so a reader sees the breach was exhibited");
});

test("a question the models decline, and a declaration that cannot be read, are not breaches", () => {
  // The arm the whole verification layer exists for, and the one a two-valued comparison gets
  // wrong: `outcome === satisfied_when ? satisfied : violated` reports BOTH of these as `violated`,
  // accusing the system under design of a breach when what happened is that the models declined the
  // question or the declaration was unreadable. SysML v2 declares the same distinction structurally
  // — `VerdictKind` has four literals, and `calc def PassIf` maps a Boolean onto only `pass` and
  // `fail`, so `inconclusive` and `error` are reachable only by something other than a check.
  const original = read(R_ID, "model.mage.yaml");

  // MUTATION 3 — the models DECLINE. `subscribes` declares `composition: { path: forbidden }`, so
  // asking the same comparison in the `reachability` form is unlicensed rather than false.
  //
  // The search text runs down to `op: lt` because BOTH queries are `form: direct` over
  // `relation: subscribes` — the short form matched twice and `mutate`'s hit count refused it,
  // which is the guard doing its job: the "mutated" document would have been the original for the
  // control query too, and this test would have passed for the wrong reason.
  const declined = verified(mutate(original,
    "      form: direct\n      relation: subscribes\n      where:\n        compare:\n"
    + "          - left: source.permits\n            op: lt\n",
    "      form: reachability\n      relation: subscribes\n      where:\n        compare:\n"
    + "          - left: source.permits\n            op: lt\n"));
  assert.equal(declined.breach, "unlicensed", "the reachability form was answered, so this is not the declining case");
  assert.equal(declined.verification.status, "inconclusive",
    "a declined question was reported as something other than inconclusive — if it read `violated`, "
    + "the layer is accusing the system under design of a breach nobody demonstrated");
  assert.equal(declined.verification.status === "inconclusive" ? declined.verification.because.kind : null,
    "unlicensed",
    "the cause must be `unlicensed` and not `bounded`: the remedy is a model, not a bigger budget, "
    + "and one word for both remedies sends half the readers the wrong way");

  // MUTATION 4 — the declaration names a query that is not there. A statement about the
  // declaration, never about the system.
  const dangling = verified(mutate(original,
    "    expressed_as: impermitted-subscription-exists\n", "    expressed_as: no-such-query\n"));
  assert.equal(dangling.verification.status, "error",
    "a dangling `expressed_as` must read `error` — there is no obligation anybody could discharge");

  // MUTATION 5 — the declaration prescribes a non-proposition. `inconclusive` is an evaluation
  // status, so it cannot be a satisfaction condition; prescribing that your own model decline to
  // answer is not an engineering obligation.
  const prescribed = verified(mutate(original,
    "    satisfied_when: refuted\n", "    satisfied_when: inconclusive\n"));
  assert.equal(prescribed.verification.status, "error",
    "`satisfied_when: inconclusive` parsed as an obligation");
  assert.ok(
    prescribed.verification.status === "error" && prescribed.verification.problem.includes("inconclusive"),
    `the error must name the word it refused: ${JSON.stringify(prescribed.verification)}`);
});
