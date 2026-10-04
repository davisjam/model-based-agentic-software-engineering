// The question sections derive by RUNNING the kernel; they do not author (UX-I9).
//
// `test/learn-content.test.ts` holds the gallery's claim — one section per registry row, every
// visual a real render. This file holds the reframe's claim, and it is a different one: a question
// section's content is COMPUTED, so every assertion here re-derives the same fact from the same
// source and compares, rather than pinning the string the builder happened to produce.
//
// Five claims, one per declared section, plus the two structural ones:
//
//   (0) The declaration is complete and disjoint: every section has a builder, every anchor is
//       distinct from every registry and guide anchor, and every citation names a file that exists
//       with the symbol in it — the same check the registry's schema authorities get.
//   (1) EVIDENCE — the quantifier table IS the engine's own declaration, and every evidence shape
//       the section lists is a shape a shipped question actually produces. The counterexample row
//       is re-derived by running the query.
//   (2) PROPERTIES — every row's "now" column equals the live outcome, and every "after" equals the
//       fixture's claim, which `test/examples.test.ts` independently drives through the real
//       hypothesis seam.
//   (3) REQUIREMENTS — every declared requirement appears; the polarity table's verdict column is
//       the comparison it claims to be; and BOTH polarities are present, which is what makes the
//       section teach a rule rather than an instance.
//   (4) AGENTS — the headline is the gate's own, and every listed capability produces evidence and
//       names one service both sides invoke.
//   (5) OMISSIONS — every refusal shown is a refusal a shipped question earns, with the engine's
//       own prose.
//
// What this file deliberately does NOT do: assert any outcome word as a literal. `refuted` appears
// below only as a value read back out of a fixture or an engine result. A test that hardcoded
// `refuted` for the latency requirement would pass on the day the engine stopped computing it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { MODEL_TYPES } from "../src/engine/model-types.ts";
import { QUANTIFIERS, QUANTIFIER_EVIDENCE } from "../src/engine/types.ts";
import { runQuery } from "../src/engine/index.ts";
import { Workspace } from "../src/app/services.ts";
import { SHIPPED_EXAMPLE_IDS, type ShippedExampleId } from "../src/app/examples.ts";
import { affordanceParityGate, CAPABILITIES, ESCAPE_HATCHES } from "../src/app/capabilities.ts";
import { anchorForType, anchorForUse, MODEL_TYPE_USES } from "../src/app/learn.ts";
import { composedQuantityQuery, type LoadedSystems } from "../src/learn/content.ts";
import { fixturePathFor, readFixture, type LoadedFixtures } from "../src/learn/fixtures.ts";
import {
  buildQuestionSections, QUESTION_ANCHORS, QUESTION_SECTIONS,
  type BuiltQuestionSection, type QuestionBlock,
} from "../src/learn/questions.ts";
import { GUIDE_ANCHORS } from "../src/learn/workbench-guide.ts";

const systems: LoadedSystems = (() => {
  const map = new Map<ShippedExampleId, CanonicalSystem>();
  for (const id of SHIPPED_EXAMPLE_IDS) {
    map.set(id, Workspace.canonicalizeOnly(
      parse(readFileSync(`examples/${id}/system.mage.yaml`, "utf8"))));
  }
  return map;
})();

const fixtures: LoadedFixtures = (() => {
  const map = new Map<ShippedExampleId, ReturnType<typeof readFixture>>();
  for (const id of SHIPPED_EXAMPLE_IDS) {
    map.set(id, readFixture(id, readFileSync(fixturePathFor(id), "utf8")));
  }
  return map;
})();

const built = buildQuestionSections(systems, fixtures);

const sectionAt = (anchor: string): BuiltQuestionSection => {
  const s = built.find((x) => x.section.anchor === anchor);
  assert.ok(s !== undefined, `no built section at '${anchor}'`);
  return s;
};

/** One `rows` block by its label prefix — the label IS the addressable name of a computed table. */
function rowsLabelled(section: BuiltQuestionSection, startsWith: string): {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
} {
  const block = section.blocks.find(
    (b): b is Extract<QuestionBlock, { kind: "rows" }> =>
      b.kind === "rows" && b.label.startsWith(startsWith));
  assert.ok(block !== undefined,
    `'${section.section.anchor}' has no rows block labelled '${startsWith}…'; labels present: `
    + section.blocks.map((b) => (b.kind === "prose" ? "(prose)" : b.label)).join(" | "));
  return block;
}

/** One `pairs` readout by its label prefix, as a lookup from term to value. */
function readoutLabelled(section: BuiltQuestionSection, startsWith: string): (term: string) => string {
  const block = section.blocks.find(
    (b): b is Extract<QuestionBlock, { kind: "pairs" }> =>
      b.kind === "pairs" && b.label.startsWith(startsWith));
  assert.ok(block !== undefined,
    `'${section.section.anchor}' has no readout labelled '${startsWith}…'; labels present: `
    + section.blocks.map((b) => (b.kind === "prose" ? "(prose)" : b.label)).join(" | "));
  return (term: string): string => {
    const pair = block.pairs.find(([t]) => t === term);
    assert.ok(pair !== undefined, `the readout has no '${term}' term`);
    return pair[1];
  };
}

const bulletsLabelled = (section: BuiltQuestionSection, startsWith: string): readonly string[] => {
  const block = section.blocks.find(
    (b): b is Extract<QuestionBlock, { kind: "bullets" }> =>
      b.kind === "bullets" && b.label.startsWith(startsWith));
  assert.ok(block !== undefined, `'${section.section.anchor}' has no bullets labelled '${startsWith}…'`);
  return block.items;
};

const savedRaw = (system: CanonicalSystem, id: string): unknown => {
  const saved = system.queries.get(id);
  assert.ok(saved !== undefined, `'${id}' is not a saved query of this system`);
  return saved.raw;
};

// ---------------------------------------------------------------------------------------------
// (0) The declaration: complete, disjoint, and its citations resolve
// ---------------------------------------------------------------------------------------------

test("every declared question section is built, in declaration order", () => {
  assert.deepEqual(built.map((b) => b.section.anchor), QUESTION_SECTIONS.map((s) => s.anchor));
  assert.deepEqual([...QUESTION_ANCHORS], QUESTION_SECTIONS.map((s) => s.anchor));
  for (const b of built) {
    assert.ok(b.blocks.length > 0, `'${b.section.anchor}' built no blocks — an empty section on the page`);
  }
});

test("question anchors are disjoint from every registry, use and guide anchor", () => {
  // The smoke tier compares the rendered section set against the union of all three families by
  // deepEqual. A collision would make one section silently stand in for another there.
  const others = new Set<string>([
    ...MODEL_TYPES.map((t) => anchorForType(t.id)),
    ...MODEL_TYPE_USES.map((u) => anchorForUse(u.id)),
    ...GUIDE_ANCHORS,
  ]);
  for (const anchor of QUESTION_ANCHORS) {
    assert.ok(!others.has(anchor), `'${anchor}' collides with a gallery or guide anchor`);
  }
  assert.equal(new Set(QUESTION_ANCHORS).size, QUESTION_ANCHORS.length, "duplicate question anchor");
});

test("every citation names a file that exists, with its symbol in it", () => {
  // The same check `test/model-types.test.ts` makes of the registry's schema authorities, applied
  // to the question sections for the same reason: a citation a reader cannot open is decoration.
  for (const s of QUESTION_SECTIONS) {
    assert.ok(s.derivedFrom.length > 0, `'${s.anchor}' cites nothing — its claims are unanchored`);
    for (const c of s.derivedFrom) {
      const source = readFileSync(c.file, "utf8");
      assert.ok(source.includes(c.symbol),
        `'${s.anchor}' cites ${c.file} (${c.symbol}), which that file does not contain`);
      assert.ok(c.role.length > 20, `'${s.anchor}': ${c.file}'s role is too short to say anything`);
    }
  }
});

// ---------------------------------------------------------------------------------------------
// (1) Evidence — the engine's own declaration, and shapes a shipped question really produces
// ---------------------------------------------------------------------------------------------

test("the quantifier table IS the engine's declaration, both arms, by value", () => {
  const table = rowsLabelled(sectionAt("question-evidence"), "The two quantifiers");
  assert.deepEqual(
    table.rows.map((r) => [r[0], r[1]]),
    QUANTIFIERS.map((q) => [q, QUANTIFIER_EVIDENCE[q]]),
    "the section's quantifier table is not QUANTIFIER_EVIDENCE — a second copy has grown");
});

test("every evidence shape the section lists is one a shipped question actually produces", () => {
  const table = rowsLabelled(sectionAt("question-evidence"), "Every evidence shape");

  // Re-derive the (role, shape) set from the shipped systems, independently of the builder.
  const produced = new Set<string>();
  for (const id of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(id);
    assert.ok(system !== undefined);
    for (const qid of system.queries.keys()) {
      const evidence = runQuery(system, savedRaw(system, qid)).result.evidence;
      if (evidence !== null && evidence.shape !== "none") produced.add(`${evidence.role}/${evidence.shape}`);
    }
    const quantitative = MODEL_TYPES.find((t) => t.id === "quantitative-model");
    assert.ok(quantitative !== undefined);
    const composed = composedQuantityQuery(system, quantitative.query.forms);
    if (composed === null) continue;
    const evidence = runQuery(system, composed.query).result.evidence;
    if (evidence !== null && evidence.shape !== "none") produced.add(`${evidence.role}/${evidence.shape}`);
  }

  assert.ok(produced.size > 0, "no shipped question produces evidence — the fixture set is wrong");
  for (const row of table.rows) {
    assert.ok(produced.has(`${row[0]}/${row[1]}`),
      `the section lists evidence '${row[0]}/${row[1]}', which no shipped question produces`);
  }
  assert.equal(table.rows.length, produced.size,
    "the section lists fewer shapes than the shipped questions produce — a reader would conclude "
    + "the missing ones do not exist");
});

test("the counterexample readout is re-derived by running the query it describes", () => {
  const cell = readoutLabelled(sectionAt("question-evidence"), "A counterexample, computed now");

  // Find the example and question the readout names, then ask it again from here.
  const quantitative = MODEL_TYPES.find((t) => t.id === "quantitative-model");
  assert.ok(quantitative !== undefined);
  const named = cell("Asked of");
  const example = SHIPPED_EXAMPLE_IDS.find((id) => systems.get(id)?.name === named);
  assert.ok(example !== undefined, `the readout names example '${named}', which is not shipped`);
  const system = systems.get(example);
  assert.ok(system !== undefined);
  const composed = composedQuantityQuery(system, quantitative.query.forms);
  assert.ok(composed !== null, `'${example}' declares no ceiling, so the readout cannot be from it`);

  const result = runQuery(system, composed.query).result;
  assert.equal(cell("Answer"), result.outcome, "the readout's answer is not the live outcome");
  assert.equal(result.evidence?.role, "counterexample",
    "the section claims a counterexample and the query returns none");
  assert.ok(result.magnitude !== null, "a readout that teaches 'the figure that decides it' has none");
  // The unit travels with the number — §7's whole typed-semantics point, asserted on the rendered cell.
  assert.ok(result.magnitude.unit !== null && cell("The figure that decides it").includes(result.magnitude.unit),
    `the figure cell '${cell("The figure that decides it")}' omits the unit '${result.magnitude.unit ?? "(none)"}'`);
  assert.ok(cell("Evidence").includes("counterexample"), "the evidence cell does not name the role");
});

// ---------------------------------------------------------------------------------------------
// (2) Properties — the "now" column is live, the "after" column is the verified fixture claim
// ---------------------------------------------------------------------------------------------

test("every change row's 'now' is the live outcome and its 'after' is the fixture's claim", () => {
  const table = rowsLabelled(sectionAt("question-properties"), "Every change the shipped examples declare");
  const columns = (name: string): number => {
    const i = table.columns.indexOf(name);
    assert.ok(i >= 0, `the change table has no '${name}' column`);
    return i;
  };
  const now = columns("Now");
  const after = columns("After the change");

  // Re-derive every expected row from the fixtures and the live engine.
  const expected: string[][] = [];
  for (const id of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(id);
    const fixture = fixtures.get(id);
    assert.ok(system !== undefined && fixture !== undefined);
    for (const mod of fixture.modifications) {
      for (const change of mod.changes) {
        expected.push([
          runQuery(system, savedRaw(system, change.query)).result.outcome,
          change.to,
        ]);
      }
    }
  }
  assert.ok(expected.length > 0, "no shipped example declares a modification");
  assert.deepEqual(table.rows.map((r) => [r[now], r[after]]), expected,
    "a change row does not match the live outcome and the fixture's claim");
});

test("the change table covers every declared modification, so no example is quietly dropped", () => {
  const table = rowsLabelled(sectionAt("question-properties"), "Every change the shipped examples declare");
  const declared = [...fixtures.values()].flatMap((f) => f.modifications.map((m) => m.label));
  const shown = new Set(table.rows.map((r) => r[r.length - 1]));
  for (const label of declared) {
    assert.ok(shown.has(label), `modification '${label}' is declared and the section does not show it`);
  }
});

// ---------------------------------------------------------------------------------------------
// (3) Requirements — every requirement, and a polarity table that IS the comparison
// ---------------------------------------------------------------------------------------------

test("every shipped requirement appears, with the status its fixture records", () => {
  const table = rowsLabelled(sectionAt("question-requirements"), "Every requirement");
  const declared = [...fixtures.values()].flatMap((f) => f.requirements);
  assert.equal(table.rows.length, declared.length,
    "the requirement table's row count is not the number of shipped requirements");
  for (const req of declared) {
    const row = table.rows.find((r) => r[0] === req.statement);
    assert.ok(row !== undefined, `requirement '${req.id}' is declared and the section omits it`);
    assert.equal(row[row.length - 1], req.status,
      `requirement '${req.id}' is shown with a status its fixture does not record`);
  }
});

test("every requirement's LIVE verdict agrees with the status its fixture records", () => {
  // The page-vs-fixture join, and the reason the section can show both columns at once: the left
  // is computed here and now, the right is what the fixture says the shipped system does. They
  // must agree, and when they stop agreeing this fails rather than the page quietly showing a
  // requirement as satisfied beside a query that refutes it.
  const table = rowsLabelled(sectionAt("question-requirements"), "Every requirement");
  const column = (name: string): number => {
    const i = table.columns.indexOf(name);
    assert.ok(i >= 0, `the requirement table has no '${name}' column`);
    return i;
  };
  const when = column("Satisfied when");
  const now = column("Answers now");
  const status = column("Recorded status");

  let decided = 0;
  for (const row of table.rows) {
    if (row[now] === "—") continue; // nothing decides it from the page; the status stands alone
    decided += 1;
    const satisfied = row[now] === row[when];
    assert.equal(row[status], satisfied ? "satisfied" : "violated",
      `'${row[0] ?? ""}' answers ${row[now] ?? ""} and is satisfied when ${row[when] ?? ""}, `
      + `so it is ${satisfied ? "satisfied" : "violated"} — the fixture records '${row[status] ?? ""}'`);
  }
  assert.equal(decided, table.rows.length,
    "a requirement row shows no live outcome; every shipped requirement is decidable from the page, "
    + "a saved query or a declared ceiling, so a dash means the derivation lost one");
});

test("the polarity table's verdict column is the comparison it claims to be", () => {
  const section = sectionAt("question-requirements");
  const table = rowsLabelled(section, "The polarity");
  assert.ok(table.rows.length > 0, "the polarity table is empty");
  for (const [satisfiedWhen, answers, verdict] of table.rows) {
    // The claim the column makes, re-derived from the two columns beside it.
    assert.equal(verdict, satisfiedWhen === answers ? "satisfied" : "not satisfied",
      `polarity row '${satisfiedWhen}' / '${answers}' reports '${verdict ?? "(none)"}'`);
  }
});

test("BOTH polarities ship, which is what makes the section teach a rule", () => {
  // A page built on `satisfied_when: refuted` alone would teach a student that a requirement is
  // satisfied when its query fails, which is false of half the shipped requirements. Asserted
  // against the FIXTURES, so this fails if the corpus loses one polarity — the condition under
  // which the section would start teaching the wrong rule.
  const polarities = new Set(
    [...fixtures.values()]
      .flatMap((f) => f.requirements)
      .map((r) => r.satisfiedWhen)
      .filter((s): s is string => s !== null));
  assert.ok(polarities.size >= 2,
    `only one satisfying outcome ships (${[...polarities].join(", ")}); the polarity section would `
    + "present one instance as the rule");

  const table = rowsLabelled(sectionAt("question-requirements"), "The polarity");
  assert.deepEqual(new Set(table.rows.map((r) => r[0])), polarities,
    "the polarity table does not show every satisfying outcome the fixtures declare");
});

// ---------------------------------------------------------------------------------------------
// (4) Agents — the gate's own headline, over capabilities that really produce evidence
// ---------------------------------------------------------------------------------------------

test("the agent section quotes the parity gate's own headline", () => {
  const section = sectionAt("question-agents");
  const prose = section.blocks.filter((b) => b.kind === "prose").map((b) => b.text).join(" ");
  assert.ok(prose.includes(affordanceParityGate().headline),
    "the agent section does not carry the gate's headline, so a non-zero violation count would not show");
});

test("every capability the agent section lists produces evidence and names one shared service", () => {
  const table = rowsLabelled(sectionAt("question-agents"), "The capabilities that produce");
  const evidential = CAPABILITIES.filter((c) => c.producesEvidence);
  assert.equal(table.rows.length, evidential.length,
    "the agent table is not the evidence-producing capabilities");
  for (const row of table.rows) {
    const capability = CAPABILITIES.find((c) => c.summary === row[0]);
    assert.ok(capability !== undefined, `the table lists '${row[0] ?? ""}', which is not a capability`);
    assert.ok(capability.producesEvidence,
      `'${capability.id}' produces no semantic result, so it does not belong in this table`);
    assert.equal(row[1], capability.service,
      `'${capability.id}' is shown against a service the registry does not name`);
    // UX-I1's substance: both sides reach the SAME service, and both are really wired.
    assert.ok(capability.human.some((h) => h.status === "wired"), `'${capability.id}' has no wired human affordance`);
    assert.ok(capability.machine.some((m) => m.status === "wired"), `'${capability.id}' has no wired machine affordance`);
  }
});

// ---------------------------------------------------------------------------------------------
// (5) Omissions — the registry's own omits, and refusals shipped questions really earn
// ---------------------------------------------------------------------------------------------

test("the omissions bullets are the registry's own omits, one per type per omission", () => {
  const items = bulletsLabelled(sectionAt("question-omissions"), "What each model form");
  assert.equal(items.length, MODEL_TYPES.reduce((n, t) => n + t.omits.length, 0),
    "the omissions list is not the registry's omits");
  for (const t of MODEL_TYPES) {
    for (const omission of t.omits) {
      assert.ok(items.some((i) => i.includes(t.label) && i.includes(omission)),
        `'${t.id}' omits '${omission}' and the section does not say so`);
    }
  }
});

test("every refusal shown is one a shipped question earns, with the engine's own prose", () => {
  const table = rowsLabelled(sectionAt("question-omissions"), "Questions the shipped examples ask past");

  // Re-derive the refusal corpus: the exact prose, keyed by the authored statement.
  const earned = new Map<string, string>();
  for (const id of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(id);
    assert.ok(system !== undefined);
    for (const qid of system.queries.keys()) {
      const result = runQuery(system, savedRaw(system, qid)).result;
      if (result.outcome !== "unlicensed" || result.refusal === null) continue;
      const raw = savedRaw(system, qid) as Record<string, unknown>;
      const name = raw["name"];
      earned.set(typeof name === "string" ? name.trim() : qid, result.refusal);
    }
  }
  assert.ok(earned.size > 0, "no shipped question is refused — the omissions section has no corpus");
  assert.equal(table.rows.length, earned.size, "the section shows fewer refusals than the examples earn");
  for (const row of table.rows) {
    const prose = earned.get(row[0] ?? "");
    assert.ok(prose !== undefined, `the section shows a refusal for '${row[0] ?? ""}', which is not refused`);
    assert.equal(row[2], prose, `'${row[0] ?? ""}' is shown with prose the engine does not produce`);
  }
});

test("the escape hatches shown are the declared ones, each with what fences it", () => {
  const items = bulletsLabelled(sectionAt("question-omissions"), "Deliberately outside");
  assert.equal(items.length, ESCAPE_HATCHES.length);
  for (const hatch of ESCAPE_HATCHES) {
    assert.ok(items.some((i) => i.includes(hatch.at) && i.includes(hatch.fencedBy)),
      `escape hatch '${hatch.at}' is declared and the section does not name it with its fence`);
  }
});
