// The conformance corpus's own gate: that each fixture's pinned interpretation is SENSITIVE to the
// meaning under test.
//
// ## What this file holds, and what it cannot
//
// `test/model-coverage.test.ts` already drives every tracked `*.mage.yaml` through the facade and
// compares each saved query's outcome against its `expect`, so the three fixture models' verdicts
// are checked by their existing. That is verdict-sensitivity and it is not enough here: a verdict
// pinned at `refuted` is also what a query answers when it is asked about nothing, and a fixture
// whose `refuted` came from an unexplored configuration space or an empty edge set would pass the
// coverage gate while demonstrating no correspondence at all. This repository spent 2026-10-04
// removing checks that could not fail, and a conformance corpus is the worst possible place to
// introduce another.
//
// So every test below MUTATES a fixture model and asserts the verdict MOVES WHEN THE MEANING MOVES
// AND HOLDS STILL WHEN IT DOES NOT. The mutations are chosen so the competing reading --
// "a relation type is a label", "a transition is an edge", "a unit is a label" -- is the thing that
// gets refuted. The shape is `test/lifecycle-model.test.ts`'s, which mutates its subject model and
// asserts the verdict flips, applied to a different kind of claim.
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
import { MODEL_TYPES, type ModelTypeId } from "../src/engine/model-types.ts";

// ----------------------------------------------------------------------------------------------
// The corpus, declared once
// ----------------------------------------------------------------------------------------------

/** The three published methods. Closed, so a fourth cannot land unnoticed in a manifest. */
const METHODS = ["oracle-executed", "normative-artifact", "spec-inspected"] as const;
type Method = (typeof METHODS)[number];

interface Fixture {
  readonly id: string;
  /** The registry row this fixture discharges, so the manifest cannot name a type that is gone. */
  readonly modelType: ModelTypeId;
  readonly method: Method;
}

/**
 * What the corpus claims to contain, as this file reads it — the join the manifest is checked
 * against rather than a second copy of it.
 */
const CORPUS: readonly Fixture[] = [
  { id: "kerml/association-link-typing-001", modelType: "structural-graph", method: "spec-inspected" },
  { id: "sysml/transition-guard-occurrence-001", modelType: "state-machine", method: "normative-artifact" },
  { id: "sysml/quantity-unit-magnitude-001", modelType: "quantitative-model", method: "normative-artifact" },
];

const fixtureFile = (id: string, name: string): string => `conformance/${id}/${name}`;
const read = (id: string, name: string): string => readFileSync(fixtureFile(id, name), "utf8");

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

test("every fixture ships all four files, and the manifest agrees with them", () => {
  const manifest = JSON.parse(read("", "manifest.json").replace(/^/, "")) as {
    readonly status: string;
    readonly fixtures: readonly {
      readonly id: string; readonly method: string;
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
    assert.equal(record.method, f.method, `${f.id}: the manifest's method is not this file's`);
    assert.ok(METHODS.includes(record.method as Method), `${f.id}: '${record.method}' is not a published method`);

    // The four files §35.6 requires, each non-trivial. A claim.md that said only "this
    // corresponds" would clear a presence check and establish nothing, so the floor is a length.
    for (const name of ["claim.md", "model.mage.yaml", "oracle.json"]) {
      assert.ok(read(f.id, name).length > 400, `${fixtureFile(f.id, name)} is too short to carry a claim`);
    }
    const source = record.standardSideModel.endsWith(".kerml") ? "source.kerml" : "source.sysml";
    assert.ok(read(f.id, source).length > 400, `${fixtureFile(f.id, source)} is too short`);

    // The registry row the fixture discharges must still be a registered, still-borrowed type —
    // looked up, not snapshotted, so a registry edit reaches this test.
    const type = MODEL_TYPES.find((t) => t.id === f.modelType);
    assert.ok(type !== undefined, `${f.id}: '${f.modelType}' is not a registered model type`);
    assert.equal(type.semanticBasis.kind, "borrowed",
      `${f.id}: '${f.modelType}' is no longer a borrowed row, so this fixture discharges nothing`);
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
  const n = (m: Method): number => CORPUS.filter((f) => f.method === m).length;
  const expected = `checked by ${CORPUS.length} fixtures: ${n("oracle-executed")} oracle-executed, `
    + `${n("normative-artifact")} normative-artifact, ${n("spec-inspected")} spec-inspected`;
  assert.equal(manifest.status, expected, "the manifest's status line does not describe its own corpus");

  // §35.4 owes five rows and three are discharged. The remaining two must stay declared as owed
  // rather than disappearing, which is how an unmet obligation becomes invisible.
  assert.deepEqual(manifest.owed.map((o) => o.row).sort(), ["binding", "requirement, verification"],
    "the owed list no longer names both undischarged rows of §35.4");
  for (const o of manifest.owed) {
    assert.ok(o.reason.length > 80, `owed '${o.row}': the reason is a placeholder`);
  }
});

test("the owed rows are owed because the construct is absent, and the schema says so", () => {
  // This is the one check here that will go red on PURPOSE, and the red is the point.
  //
  // "There is no binding construct, so a fixture would be fiction" is a NEGATIVE claim, and a
  // negative claim is only as wide as the search that produced it. A grep could have read the wrong
  // subtree, or searched a spelling the codebase does not use. The authored construct set does not
  // have that weakness: it is the top-level `properties` of the published model schema, closed and
  // enumerable, so the absence of a construct is a LOOKUP.
  //
  // And it gives the obligation a trigger instead of a reminder. The day §14 lands `bindings:` or
  // §20 lands `requirements:`, this test fails and its message says a fixture is now buildable —
  // which is strictly better than a prose note in a manifest nobody rereads.
  const schema = JSON.parse(readFileSync("mage-model.schema.json", "utf8")) as {
    readonly properties: Readonly<Record<string, unknown>>;
  };
  const authored = Object.keys(schema.properties).sort();

  const manifest = JSON.parse(read("", "manifest.json")) as {
    readonly authoredConstructSet: readonly string[];
    readonly owed: readonly { readonly row: string; readonly absentConstructs: readonly string[] }[];
  };
  assert.deepEqual([...manifest.authoredConstructSet].sort(), authored,
    "the manifest's record of the authored construct set is stale — re-read mage-model.schema.json's "
    + "top-level `properties`, because every absence claim below is relative to it");

  for (const o of manifest.owed) {
    assert.ok(o.absentConstructs.length > 0, `owed '${o.row}': names no construct to be absent`);
    for (const name of o.absentConstructs) {
      assert.ok(!authored.includes(name),
        `mage-model.schema.json now declares a top-level '${name}' construct, so §35.4's '${o.row}' `
        + `row is no longer owed for want of something to correspond. A fixture is buildable: build `
        + `it under conformance/, move the row out of the manifest's \`owed\` array, and fill its `
        + `Clause cell in DESIGN-v02-semantics-261004.md §35.4.`);
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
