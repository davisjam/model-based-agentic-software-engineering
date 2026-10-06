// The question sections derive by RUNNING the kernel; they do not author (UX-I9).
//
// `test/learn-content.test.ts` holds the gallery's claim — one section per registry row, every
// visual a real render. This file holds the reframe's claim, and it is a different one: a question
// section's content is COMPUTED, so every assertion here re-derives the same fact from the same
// source and compares, rather than pinning the string the builder happened to produce.
//
// One claim per declared section, plus the three structural ones — except `question-operations`,
// whose claims live in `test/learn-operations.test.ts` because they join the SUBJECT arm of the
// registry's query semantics to the gallery's own strictness, which is a claim about both files'
// subjects at once. The structural tests below still cover it: it must have a builder, blocks, a
// disjoint anchor and citations that resolve.
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
//   (5) FOUNDATIONS — every standard the page names is one a registry row borrows from, every
//       count is counted now, and the not-attributed list is exactly the rows no standard backs.
//       Rung 3 is `asserted` and the section says so in that word.
//   (6) OMISSIONS — every refusal shown is a refusal a shipped question earns, with the engine's
//       own prose; and the standards half of the box is the registry's own subset claims.
//
// What this file deliberately does NOT do: assert any outcome word as a literal. `refuted` appears
// below only as a value read back out of a fixture or an engine result. A test that hardcoded
// `refuted` for the latency requirement would pass on the day the engine stopped computing it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { CanonicalSystem, QueryResult } from "../src/ir/types.ts";
import { DIMENSION_IDS, DIMENSIONS } from "../src/ir/types.ts";
import { MODEL_TYPES, type SemanticBasis } from "../src/engine/model-types.ts";
import { QUANTIFIERS, QUANTIFIER_EVIDENCE } from "../src/engine/types.ts";
import { runQuery } from "../src/engine/index.ts";
import { Workspace } from "../src/app/services.ts";
import { SHIPPED_EXAMPLE_IDS, type ShippedExampleId } from "../src/app/examples.ts";
import { affordanceParityGate, CAPABILITIES, ESCAPE_HATCHES } from "../src/app/capabilities.ts";
import { anchorForType, anchorForUse, MODEL_TYPE_USES } from "../src/app/learn.ts";
import {
  ceilingQuestions, composedQuantityQuery, declaredUnitOf, quantityRows, type LoadedSystems,
} from "../src/learn/content.ts";
import { fixturePathFor, readFixture, type LoadedFixtures } from "../src/learn/fixtures.ts";
import {
  buildQuestionSections, magnitudeText, QUESTION_ANCHORS, QUESTION_SECTIONS,
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
// (3b) Ceilings — the three-role separation, and the single-source claim it rests on
//
// The section says a figure has one home: a quantity declares it, a question cites the quantity by
// name, a requirement cites the question by name. Each test below attacks a different way that could
// be false — a row the corpus does not license, a second magnitude on the page, a chain whose live
// verdict disagrees with the fixture, or a claim of enforcement that is not landed.
// ---------------------------------------------------------------------------------------------

/** The obligation-to-ceiling chains the CORPUS licenses, derived here independently of the page. */
const corpusChains = (): readonly {
  example: ShippedExampleId; requirement: string; question: string; ceiling: string; status: string;
}[] => {
  const out: {
    example: ShippedExampleId; requirement: string; question: string; ceiling: string; status: string;
  }[] = [];
  for (const example of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(example);
    const fixture = fixtures.get(example);
    if (system === undefined || fixture === undefined) continue;
    const asked = new Map(ceilingQuestions(system).map((q) => [q.id, q]));
    for (const req of fixture.requirements) {
      const q = req.expressedAs === null ? undefined : asked.get(req.expressedAs);
      if (q === undefined) continue;
      if (!system.quantities.has(q.ceiling)) continue;
      out.push({
        example, requirement: req.id, question: q.id, ceiling: q.ceiling, status: req.status,
      });
    }
  }
  return out;
};

test("the ceiling table is exactly the obligations the corpus licenses — none invented, none lost", () => {
  const table = rowsLabelled(sectionAt("question-ceilings"), "Every obligation");
  const licensed = corpusChains();
  assert.ok(licensed.length > 0,
    "no shipped requirement names a saved question that cites a declared ceiling; the section would "
    + "render an empty table and teach the separation from nothing");
  assert.deepEqual(
    new Set(table.rows.map((r) => `${r[0] ?? ""}/${r[1] ?? ""}/${r[2] ?? ""}`)),
    new Set(licensed.map((c) => `${c.requirement}/${c.question}/${c.ceiling}`)),
    "the ceiling table is not the chain set the corpus declares");
});

test("every ceiling row's two names RESOLVE, so the chain on the page is a real join", () => {
  const table = rowsLabelled(sectionAt("question-ceilings"), "Every obligation");
  for (const row of table.rows) {
    const [requirement, question, ceiling, figure] = row;
    const chain = corpusChains().find((c) => c.requirement === requirement);
    assert.ok(chain !== undefined, `'${requirement ?? ""}' is on the page and the corpus has no such chain`);
    const system = systems.get(chain.example);
    assert.ok(system !== undefined);
    const saved = system.queries.get(question ?? "");
    assert.ok(saved !== undefined,
      `'${requirement ?? ""}' is shown naming '${question ?? ""}', which the system does not save`);
    const declared = system.quantities.get(ceiling ?? "");
    assert.ok(declared !== undefined,
      `'${question ?? ""}' is shown citing '${ceiling ?? ""}', which the system does not declare`);
    // The figure column is the DECLARED magnitude, not a restatement of it.
    assert.equal(figure, quantityRows(system).find((r) => r.id === ceiling)?.value,
      `'${ceiling ?? ""}' is shown with a figure its declaration does not state`);
  }
});

test("only the quantity states a magnitude — the claim the section exists to make", () => {
  const table = rowsLabelled(sectionAt("question-ceilings"), "What each of the three declarations carries");
  const magnitude = table.columns.indexOf("The magnitude it states");
  const cites = table.columns.indexOf("The name it cites");
  assert.ok(magnitude >= 0 && cites >= 0, "the three-role table has lost one of its two claim columns");
  assert.equal(table.rows.length, 3, "the separation is three declarations; the table shows another number");

  const stated = table.rows.filter((r) => r[magnitude] !== "—");
  assert.equal(stated.length, 1,
    "more than one of the three declarations is shown stating a magnitude, which is the duplication "
    + `the separation exists to prevent: ${JSON.stringify(stated)}`);
  assert.ok((stated[0]?.[0] ?? "").includes("(quantity)"),
    "the declaration stating the magnitude is not the quantity");
  // And the other two carry a NAME, or the chain has a gap the page is not showing.
  for (const row of table.rows.filter((r) => r[magnitude] === "—")) {
    assert.notEqual(row[cites], "—",
      `'${row[0] ?? ""}' is shown stating no magnitude AND citing no name, so nothing joins it`);
  }
});

test("the figure appears in the quantity's declaration and in neither of the other two", () => {
  // The single-source property, checked against the MODEL rather than against the page's own table.
  // `statement` is deliberately exempt: a requirement's statement is prose written for a human and it
  // may well say "256 KiB". What must not carry the figure is anything the engine reads to decide the
  // obligation — the query's own fields and the requirement's join keys.
  for (const chain of corpusChains()) {
    const system = systems.get(chain.example);
    assert.ok(system !== undefined);
    const figure = quantityRows(system).find((r) => r.id === chain.ceiling)?.value;
    assert.ok(figure !== undefined, `'${chain.ceiling}' declares no readable magnitude`);

    const raw = savedRaw(system, chain.question);
    assert.ok(!JSON.stringify(raw).includes(figure),
      `saved question '${chain.question}' carries the figure '${figure}' as well as citing `
      + `'${chain.ceiling}' — a second copy free to drift from the declaration`);

    const fixture = fixtures.get(chain.example);
    const req = fixture?.requirements.find((r) => r.id === chain.requirement);
    assert.ok(req !== undefined);
    for (const [field, value] of [
      ["expressed_as", req.expressedAs], ["satisfied_when", req.satisfiedWhen],
      ["declared_as", req.declaredAs],
    ] as const) {
      assert.ok(value === null || !value.includes(figure),
        `requirement '${chain.requirement}' carries the figure in its '${field}', which must hold a `
        + "name rather than a magnitude");
    }
  }
});

test("every ceiling chain's LIVE verdict agrees with the status its fixture records", () => {
  const table = rowsLabelled(sectionAt("question-ceilings"), "Every obligation");
  const answers = table.columns.indexOf("and it answers");
  assert.ok(answers >= 0, "the ceiling table has no outcome column");
  for (const row of table.rows) {
    const chain = corpusChains().find((c) => c.requirement === row[0]);
    assert.ok(chain !== undefined);
    const system = systems.get(chain.example);
    assert.ok(system !== undefined);
    const saved = system.queries.get(chain.question);
    assert.ok(saved !== undefined);
    const live = runQuery(system, saved.raw).result?.outcome;
    assert.equal(row[answers], live,
      `'${chain.requirement}' is shown answering '${row[answers] ?? ""}' and the engine says '${live ?? ""}'`);
    // A ceiling claim is universal, so `holds` is the satisfying outcome and anything else is not.
    assert.equal(chain.status, live === "holds" ? "satisfied" : "violated",
      `'${chain.requirement}' answers '${live ?? ""}' and its fixture records '${chain.status}'`);
  }
});

test("both verdicts ship, so the section teaches a shape rather than a success story", () => {
  // Asserted against the CORPUS: if every ceiling obligation held, the closing prose's "one budget is
  // met and one deadline is missed" would be describing a corpus that no longer exists, and a reader
  // would be shown a construct that has never been seen to fail.
  const outcomes = new Set(corpusChains().map((c) => {
    const system = systems.get(c.example);
    assert.ok(system !== undefined);
    const saved = system.queries.get(c.question);
    assert.ok(saved !== undefined);
    return runQuery(system, saved.raw).result?.outcome;
  }));
  assert.ok(outcomes.size >= 2,
    `every ceiling obligation in the corpus answers the same way (${[...outcomes].join(", ")}); the `
    + "section's closing claim that both verdicts ship no longer holds");
});

test("the worked readout is the chain whose question measures every execution, not the composed one", () => {
  // The exemplar is picked by a PROPERTY — no `target:` — so the readout cannot quietly become the
  // composed question, which the compositions section already teaches and which would make the
  // selection look like part of the three-role separation.
  const readout = readoutLabelled(sectionAt("question-ceilings"), "Three questions, three declarations");
  const asked = readout("Does the design stay under it?");
  const chain = corpusChains().find((c) => asked.includes(`'${c.question}'`));
  assert.ok(chain !== undefined, `the readout's question '${asked}' is not a licensed chain's question`);
  const system = systems.get(chain.example);
  assert.ok(system !== undefined);
  const question = ceilingQuestions(system).find((q) => q.id === chain.question);
  assert.ok(question !== undefined);
  assert.equal(question.selects, false,
    `the worked readout uses '${chain.question}', which narrows the executions it measures`);
  // And the readout's own three terms name the three declarations, in the chain's order.
  assert.ok(readout("How much is there?").includes(`'${chain.ceiling}'`),
    "the readout's figure term does not name the ceiling the chain cites");
  assert.ok(readout("Must it?").includes(`'${chain.requirement}'`),
    "the readout's obligation term does not name the requirement the chain belongs to");
});

// ---------------------------------------------------------------------------------------------
// The figure reads in the unit its ceiling declares — the readout the shared formatter broke
//
// A result carries its dimension's BASE unit, which `memory` spells `MB`, so the worked readout
// quoted `0.2265625 MB` beside a `256 KB` ceiling: the right number, and the student had to convert
// before they could tell whether the firmware fits. The four tests below hold the fix from four
// sides — the identity the formatter owes one figure, the exactness of the conversion, the unit
// every chain in the corpus gets, and the absence of a base-unit figure from the page.
//
// Every verdict here is read off a COMPUTED BLOCK, never off rendered geometry, so none of them can
// pass at one window width and fail at another.
// ---------------------------------------------------------------------------------------------

test("a 256 KB figure renders as '256 KB' — and in MB only when MB is what was declared", () => {
  // The identity the shared formatter dropped, stated on one figure so the regression has a name.
  // 256 KB is 0.25 of the memory base unit; a result carries the 0.25, and the declaration is what
  // says which of the two the reader is owed.
  const perKb = DIMENSIONS.memory.units["KB"];
  assert.ok(perKb !== undefined, "the memory dimension no longer declares a KB unit");
  const quarterMb: QueryResult = {
    outcome: "holds", coverage: { kind: "not-applicable", statesExplored: 0, reason: null }, evidence: null, refusal: null,
    interpretedAs: null, compilation: [], systemHash: "test",
    magnitude: { value: 256 * perKb, dimension: "memory", unit: DIMENSIONS.memory.base },
  };
  assert.equal(magnitudeText(quarterMb, "KB"), "256 KB",
    "a figure of 256 KB does not read as '256 KB' against a ceiling declared in KB");
  assert.equal(magnitudeText(quarterMb, "MB"), "0.25 MB",
    "the formatter is not rendering the DECLARED unit — it has acquired a favourite one");
  // And it converts nothing across dimensions: presentation does not get to do the arithmetic the
  // validation layer refuses. `ms` belongs to duration, so the figure stays in its own base unit.
  assert.equal(magnitudeText(quarterMb, "ms"), "0.25 MB",
    "a unit from another dimension was applied to the figure, which is a cross-dimension conversion");
  assert.equal(magnitudeText(quarterMb, "furlongs"), "0.25 MB",
    "an unknown unit token changed the figure instead of leaving it in its base unit");
});

test("base-to-declared conversion is exact for every unit the dimension table declares", () => {
  // The dimension table's own guarantee, read at the unit where this formatter divides by it: every
  // factor is an integer multiple of a power of two, so the division introduces no rounding and the
  // page can print the figure without reaching for a rounding rule that could flatter a ceiling.
  for (const dimension of DIMENSION_IDS) {
    for (const [unit, factor] of Object.entries(DIMENSIONS[dimension].units)) {
      for (const written of [1, 3, 232, 256, 750]) {
        const result: QueryResult = {
          outcome: "holds", coverage: { kind: "not-applicable", statesExplored: 0, reason: null }, evidence: null, refusal: null,
          interpretedAs: null, compilation: [], systemHash: "test",
          magnitude: { value: written * factor, dimension, unit: DIMENSIONS[dimension].base },
        };
        assert.equal(magnitudeText(result, unit), `${written} ${unit}`,
          `${written} ${unit} does not round-trip through the base unit exactly, so a figure on the `
          + "page can disagree with the declaration it is compared against");
      }
    }
  }
});

test("every ceiling chain's live figure reads in the unit that chain's ceiling declares", () => {
  // The CLASS, over the whole corpus rather than the one row the page works through. Both shipped
  // chains declare a unit their dimension does not base at — `256 KB` on memory, `2 s` on duration —
  // so a formatter that reverted to the base unit fails here on either of them.
  const chains = corpusChains();
  assert.ok(chains.length > 0, "no ceiling chain to check the figures of");
  for (const chain of chains) {
    const system = systems.get(chain.example);
    assert.ok(system !== undefined);
    const saved = system.queries.get(chain.question);
    assert.ok(saved !== undefined);
    const result = runQuery(system, saved.raw).result;
    if (result.magnitude === null) continue;
    const unit = declaredUnitOf(system, chain.ceiling);
    assert.ok(unit !== null,
      `ceiling '${chain.ceiling}' declares no single unit, so nothing says what unit its figure owes`);
    assert.ok(magnitudeText(result, unit).endsWith(` ${unit}`),
      `'${chain.question}' is decided by a figure not quoted in '${unit}', the unit its ceiling `
      + `'${chain.ceiling}' declares`);
  }
});

test("the worked readout states the ceiling and the figure in ONE unit, and not the base", () => {
  // The readout the shared formatter broke, pinned where it broke: two adjacent terms of the same
  // block, one quoting the declaration and one quoting what the engine computed. The claim is that a
  // reader can compare them by eye. So the assertion is that they carry the SAME unit — which is
  // stronger than either term alone and is the property the student actually needs.
  //
  // Scoped to this one readout deliberately. A page-wide search for the base-unit rendering gives a
  // false positive: two shipped chains share a metric and a worst case, and one of their ceilings IS
  // declared in the base unit, so `2750 ms` appears on the page as a correct figure for the
  // composition. A negative assertion over the whole page would condemn it.
  const readout = readoutLabelled(sectionAt("question-ceilings"), "Three questions, three declarations");
  const chain = corpusChains().find((c) => readout("Does the design stay under it?").includes(`'${c.question}'`));
  assert.ok(chain !== undefined, "the worked readout's question is not a licensed chain's");
  const system = systems.get(chain.example);
  assert.ok(system !== undefined);
  const unit = declaredUnitOf(system, chain.ceiling);
  assert.ok(unit !== null, `ceiling '${chain.ceiling}' declares no single unit`);
  const result = runQuery(system, savedRaw(system, chain.question)).result;

  const declared = readout("How much is there?");
  const answer = readout("And does it, on this revision?");
  assert.ok(declared.includes(` ${unit} `) || declared.includes(` ${unit}`),
    `the declaration term does not quote the ceiling's own unit '${unit}'`);
  assert.ok(answer.includes(` ${unit},`),
    `the figure term reads '${answer}', which does not quote the figure in '${unit}' — the unit the `
    + `line above declares. A reader has to convert before they can tell whether the model fits.`);
  // And specifically not the base unit, which is the regression: `0.2265625 MB` against a `256 KB`
  // ceiling is the right number rendered so the reader cannot use it.
  const base = magnitudeText(result, null);
  assert.notEqual(base, magnitudeText(result, unit),
    `ceiling '${chain.ceiling}' is declared in the dimension's own base unit, so this readout cannot `
    + "exhibit the conversion this test exists to refuse — point it at a chain that can");
  assert.ok(!answer.includes(base),
    `the figure term carries '${base}', the base-unit rendering, beside a ceiling declared in '${unit}'`);
});

test("the ceilings section claims no refusal, because the arm that would justify one is not landed", () => {
  // A requirement naming a question that cannot decide it derives `satisfied` today. The engine arm
  // that refuses that pairing is ruled and scoped, NOT shipped, so this section must teach the sound
  // shape without claiming the unsound one is caught. When that arm lands, this assertion is the
  // thing to update — deliberately, and with the refusal then shown by running it.
  const section = sectionAt("question-ceilings");
  const prose = section.blocks.filter((b) => b.kind === "prose").map((b) => b.text).join(" ");
  for (const claim of ["refuses", "refused", "rejects", "rejected", "an error", "will not let"]) {
    assert.ok(!prose.toLowerCase().includes(claim),
      `the ceilings prose says '${claim}', which claims enforcement the engine does not yet perform`);
  }
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
// (5) Foundations — the registry's attribution, and the rule's SECOND half rendered
//
// The first half is the easy one to hold: a borrowed row names a standard, and the test re-derives
// which. The second half is the one these tests exist for — an extension must read as an extension
// and must NOT be attributed to SysML or KerML — and it is held structurally rather than by
// grepping the prose for "SysML", because several of the registry's own extension reasons say the
// word in order to DISCLAIM it. So: the standards the page names are exactly the standards some
// row borrows from; the not-attributed list is exactly the non-borrowed rows; and no non-borrowed
// row is shown with a clause citation.
// ---------------------------------------------------------------------------------------------

/** Every basis in the registry, substrate rows and form rows alike. */
const EVERY_BASIS: readonly SemanticBasis[] = [
  ...MODEL_TYPES.map((t) => t.semanticBasis),
  ...MODEL_TYPES.flatMap((t) => t.query.primitives.map((p) => p.semanticBasis)),
];

const BORROWED_STANDARDS: ReadonlySet<string> = new Set(
  EVERY_BASIS.flatMap((b) => (b.kind === "borrowed" ? [b.standard] : [])));

test("the substrate table is every borrowed substrate, with the registry's own concept and clause", () => {
  // PIN MOVED 261006 (author's item 26): clause ids and `owed` fixtures are audit vocabulary, so
  // they render in the provenance-flagged citations table rather than the reading-path columns.
  // The claims are unchanged — only which labelled block carries each cell.
  const section = sectionAt("question-foundations");
  const table = rowsLabelled(section, "What each model form represents");
  const citations = rowsLabelled(section, "The borrowed correspondences");
  const borrowed = MODEL_TYPES.filter((t) => t.semanticBasis.kind === "borrowed");
  assert.equal(table.rows.length, borrowed.length,
    "the substrate table is not the borrowed substrates — a row was added or dropped");
  assert.equal(citations.rows.length, borrowed.length,
    "the citations table is not the borrowed substrates — a row was added or dropped");
  for (const t of borrowed) {
    const basis = t.semanticBasis;
    assert.ok(basis.kind === "borrowed");
    const row = table.rows.find((r) => r[0] === t.label);
    assert.ok(row !== undefined, `'${t.id}' is borrowed and the section omits it`);
    assert.equal(row[1], basis.standard, `'${t.id}' is shown against the wrong standard`);
    assert.equal(row[2], basis.concept, `'${t.id}' is shown with prose the registry does not carry`);
    const cited = citations.rows.find((r) => r[0] === t.label);
    assert.ok(cited !== undefined, `'${t.id}' is borrowed and the citations table omits it`);
    assert.equal(cited[1], basis.clause, `'${t.id}' is shown with a clause the registry does not carry`);
    // A fixture that does not exist must not be shown as one; the registry's null reads as owed.
    assert.equal(cited[2], basis.fixture ?? "owed",
      `'${t.id}' is shown a fixture the registry does not name`);
  }
});

test("the form table covers every question form exactly once, grouped by shared basis", () => {
  const table = rowsLabelled(sectionAt("question-foundations"), "Where each question form");
  const shown = table.rows.flatMap((r) => (r[0] ?? "").split(", "));
  const declared = MODEL_TYPES.flatMap((t) => t.query.primitives.map((p) => p.form));
  assert.deepEqual([...shown].sort(), [...declared].sort(),
    "the form table is not the registry's forms — a form is missing, duplicated, or invented");

  // Every form in one row shares ONE basis object, which is what the grouping claims.
  for (const row of table.rows) {
    const bases = (row[0] ?? "").split(", ").map((form) => {
      const p = MODEL_TYPES.flatMap((t) => t.query.primitives).find((x) => x.form === form);
      assert.ok(p !== undefined, `the table lists '${form}', which is not a registered form`);
      return p.semanticBasis;
    });
    assert.equal(new Set(bases).size, 1,
      `the row '${row[0] ?? ""}' groups forms that do not share one semantic-basis object`);
  }
});

test("the page names exactly the standards the registry borrows from, and nowhere else", () => {
  const section = sectionAt("question-foundations");
  const substrate = rowsLabelled(section, "What each model form represents");
  assert.deepEqual(new Set(substrate.rows.map((r) => r[1])), BORROWED_STANDARDS,
    "the substrate table's standards are not the standards the registry borrows from");

  // The form table today borrows nothing, so no form row may carry a clause citation — the
  // citation cell is where an over-attribution would surface, since a clause is a standard's own
  // address. PIN MOVED 261006 (item 26): citations live in the provenance-flagged
  // "Citations for each question form's basis" table, not a reading-path column.
  const citations = rowsLabelled(section, "Citations for each question form");
  for (const row of citations.rows) {
    const form = (row[0] ?? "").split(", ")[0] ?? "";
    const primitive = MODEL_TYPES.flatMap((t) => t.query.primitives).find((p) => p.form === form);
    assert.ok(primitive !== undefined);
    if (primitive.semanticBasis.kind === "borrowed") continue;
    assert.ok(!(row[1] ?? "").startsWith("clause"),
      `'${row[0] ?? ""}' is not borrowed and is shown with a clause citation: '${row[1] ?? ""}'`);
  }
});

test("the not-attributed list names every construct no standard backs — the rule's second half", () => {
  const items = bulletsLabelled(sectionAt("question-foundations"), "Not attributed to");

  // Re-derived from the registry: every construct whose basis is not `borrowed` must be NAMED in
  // the list, and every bullet must read as an extension. The list merges constructs that share a
  // class and a foundation, so this is a coverage claim over names rather than a row count —
  // the row count is the table's job, two assertions up.
  const unattributed: string[] = [];
  for (const t of MODEL_TYPES) {
    if (t.semanticBasis.kind !== "borrowed") unattributed.push(`a ${t.label} represents`);
    for (const p of t.query.primitives) {
      if (p.semanticBasis.kind !== "borrowed") unattributed.push(p.form);
    }
  }
  assert.ok(unattributed.length > 0, "every construct is borrowed — this check ran on nothing");
  const joined = items.join("\n");
  for (const subject of unattributed) {
    assert.ok(joined.includes(subject),
      `'${subject}' is attributed to no standard and the not-attributed list does not name it`);
  }
  for (const item of items) {
    assert.ok(item.includes("extension"), `'${item}' does not read as an extension`);
  }

  // And nothing BORROWED appears here. A borrowed construct in this list would be the symmetric
  // failure: a real correspondence disclaimed.
  for (const t of MODEL_TYPES) {
    const basis = t.semanticBasis;
    if (basis.kind !== "borrowed") continue;
    assert.ok(!joined.includes(`a ${t.label} represents`),
      `'${t.id}' is borrowed from ${basis.standard} and the list disclaims it`);
  }
});

test("the census is counted from the registry, not written down", () => {
  const cell = readoutLabelled(sectionAt("question-foundations"), "The attribution, counted now");
  const primitives = MODEL_TYPES.flatMap((t) => t.query.primitives);
  const forms = (kind: SemanticBasis["kind"]): number =>
    primitives.filter((p) => p.semanticBasis.kind === kind).length;

  assert.equal(cell("Model-form substrates borrowed from a standard"),
    `${MODEL_TYPES.filter((t) => t.semanticBasis.kind === "borrowed").length} of ${MODEL_TYPES.length}`);
  assert.equal(cell("Question forms borrowed from a standard"),
    `${forms("borrowed")} of ${primitives.length}`);
  assert.equal(cell("Question forms grounded outside this project"),
    `${forms("extension-grounded")} of ${primitives.length}`);
  assert.equal(cell("Question forms that are the Workbench's own"),
    `${forms("extension")} of ${primitives.length}`);

  const borrowed = EVERY_BASIS.filter((b) => b.kind === "borrowed");
  const withFixture = borrowed.filter((b) => b.kind === "borrowed" && b.fixture !== null).length;
  assert.equal(cell("Conformance fixtures demonstrating a borrowed correspondence"),
    `${withFixture} of ${MODEL_TYPES.filter((t) => t.semanticBasis.kind === "borrowed").length}`);
});

test("rung 3 is stated as asserted, in that word, and no gate is claimed", () => {
  // The whole reason this section is allowed to exist is that the registry carries the attribution.
  // The reason it must not read as a conformance claim is that nothing re-derives the standard's
  // half. So the page's own word for what a borrowed correspondence is worth must be a kind the
  // published schema admits, and must not be one of the three that would imply a mechanism.
  const section = sectionAt("question-foundations");
  const cell = readoutLabelled(section, "The attribution, counted now");
  const worth = cell("What a borrowed correspondence is worth today");

  const schema = JSON.parse(readFileSync("mage-model.schema.json", "utf8")) as {
    $defs: { provenance: { properties: { correspondence: { properties: { kind: { enum: string[] } } } } } };
  };
  const kinds = schema.$defs.provenance.properties.correspondence.properties.kind.enum;
  assert.ok(kinds.includes(worth),
    `the page claims '${worth}', which is not a correspondence kind the schema admits`);
  for (const stronger of ["checked", "derived", "generated"]) {
    assert.notEqual(worth, stronger,
      `the page claims '${worth}', which asserts a mechanism re-derives the correspondence; nothing `
      + "here does, because the workbench takes no runtime dependency on the reference implementation");
  }

  const prose = section.blocks.filter((b) => b.kind === "prose").map((b) => b.text).join(" ");
  assert.ok(prose.includes(worth), `the section never says '${worth}' in prose, only in a table cell`);
  assert.ok(prose.includes("no gate"),
    "the section does not tell a reader that no gate checks these rows — a derived standards "
    + "section that stays silent on its own ceiling reads as though one does");
});

// ---------------------------------------------------------------------------------------------
// (6) Omissions — the registry's own omits, and refusals shipped questions really earn
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

test("the omissions box's standards half is the registry's subset claims, not prose", () => {
  // The guidance's §13 wants the reduction stated against the standards as well as against the
  // workbench. That half is derived from the same field §12 is, so it moves when the field moves.
  const cell = readoutLabelled(sectionAt("question-omissions"), "And the vocabulary itself");
  let borrowed = 0;
  for (const t of MODEL_TYPES) {
    const basis = t.semanticBasis;
    if (basis.kind !== "borrowed") continue;
    borrowed += 1;
    // The standard named is the registry's own, and the claim is a SUBSET rather than parity.
    const value = cell(t.label);
    assert.ok(value.includes(basis.standard),
      `'${t.id}' subsets ${basis.standard} and the box reads '${value}'`);
    assert.ok(value.includes("subset"),
      `'${t.id}' is shown without the subset claim, so the box reads as parity with the standard`);
  }
  assert.ok(borrowed > 0, "nothing is borrowed — the standards half of the box has no content");
});

test("the escape hatches shown are the declared ones, each with what fences it", () => {
  const items = bulletsLabelled(sectionAt("question-omissions"), "Deliberately outside");
  assert.equal(items.length, ESCAPE_HATCHES.length);
  for (const hatch of ESCAPE_HATCHES) {
    assert.ok(items.some((i) => i.includes(hatch.at) && i.includes(hatch.fencedBy)),
      `escape hatch '${hatch.at}' is declared and the section does not name it with its fence`);
  }
});
