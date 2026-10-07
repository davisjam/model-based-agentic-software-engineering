// The operations that are not forms reach Learn, and the gallery's claim is not loosened to do it.
//
// `test/learn-content.test.ts` holds the gallery's 1:1 correspondence with the registry.
// `test/learn-questions.test.ts` holds the reframe's per-section claims. This file holds the one
// `DESIGN-v02-quantification-261004.md` Phase 2 asked for: `select` and `count` derive from the
// registry's SUBJECT arm rather than from a question form, so a projection reading `query.forms`
// alone left a shipped capability off the human-facing page.
//
// Six claims:
//
//   (1) BOTH arms of the query semantics reach the Learn entry BY REFERENCE — not copied, not
//       filtered. Reference identity, because "held by reference" was the claim and nothing checked
//       it; an entry that rebuilt the array would pass a deepEqual and drift on the next edit.
//   (2) The subject projection is TOTAL over the registry: every declared subject of every
//       registered type is on its card, in the registry's order, and no card carries a subject its
//       own registry row does not declare.
//   (3) The gallery is EXACTLY as strict as it was. The new arm adds no card and no section, and a
//       facade- or subject-derived operation cannot stand in for a missing model-type entry: the
//       type sections are still one per registry row, and `question-operations` is not a gallery
//       anchor.
//   (4) The section's figures are RE-DERIVED. The question text is `interpretElementSelector` over
//       the same selector; the ids are a fresh `selectElements`; the figure is a fresh
//       `countElements` and carries the basis that earns it.
//   (5) The no-claim property is READ, not asserted. Both answers the section renders carry no
//       `outcome` and no `evidence`, and the page's "Verdict" term says so because it branched on
//       the answer — so the day a selection grows an outcome, the page prints it.
//   (6) The contrast is a real verdict on the SAME model, re-derived by running the question the
//       section names.
//
// Nothing here pins a string the builder produced. Every expectation is a second derivation from
// the registry, the engine, or the shipped examples, compared against the first.
import { exampleDir } from "../src/app/example-corpus.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { CanonicalSystem, Outcome } from "../src/ir/types.ts";
import { MODEL_TYPES } from "../src/engine/model-types.ts";
import {
  countElements, interpretElementSelector, parseElementSelector, selectElements,
} from "../src/engine/elements.ts";
import { runQuery } from "../src/engine/index.ts";
import { Workspace } from "../src/app/services.ts";
import { EXAMPLE_IDS, type ExampleId } from "../src/app/example-corpus.ts";
import {
  anchorForType, anchorForUse, deriveLearnEntries, MODEL_TYPE_USES,
} from "../src/app/learn.ts";
import {
  buildTypeSections, exemplarFor, savedStatements, type LoadedSystems,
} from "../src/learn/content.ts";
import { fixturePathFor, readFixture, type LoadedFixtures } from "../src/learn/fixtures.ts";
import {
  buildQuestionSections, QUESTION_ANCHORS, type BuiltQuestionSection, type QuestionBlock,
} from "../src/learn/questions.ts";

const systems: LoadedSystems = (() => {
  const map = new Map<ExampleId, CanonicalSystem>();
  for (const id of EXAMPLE_IDS) {
    map.set(id, Workspace.canonicalizeOnly(
      parse(readFileSync(`${exampleDir(id)}/system.mage.yaml`, "utf8"))));
  }
  return map;
})();

const fixtures: LoadedFixtures = (() => {
  const map = new Map<ExampleId, ReturnType<typeof readFixture>>();
  for (const id of EXAMPLE_IDS) {
    map.set(id, readFixture(id, readFileSync(fixturePathFor(id), "utf8")));
  }
  return map;
})();

const ANCHOR = "question-operations";

const section = (): BuiltQuestionSection => {
  const built = buildQuestionSections(systems, fixtures)
    .find((b) => b.section.anchor === ANCHOR);
  assert.ok(built !== undefined, `the Learn page builds no '${ANCHOR}' section`);
  return built;
};

/** One `pairs` readout by its label prefix, as a term lookup. The label names a computed readout. */
function readout(built: BuiltQuestionSection, startsWith: string): (term: string) => string {
  const block = built.blocks.find(
    (b): b is Extract<QuestionBlock, { kind: "pairs" }> =>
      b.kind === "pairs" && b.label.startsWith(startsWith));
  assert.ok(block !== undefined,
    `'${ANCHOR}' has no readout labelled '${startsWith}…'; labels present: `
    + built.blocks.map((b) => (b.kind === "prose" ? "(prose)" : b.label)).join(" | "));
  return (term: string): string => {
    const pair = block.pairs.find(([t]) => t === term);
    assert.ok(pair !== undefined,
      `the '${block.label}' readout has no '${term}' term; terms present: `
      + block.pairs.map(([t]) => t).join(" | "));
    return pair[1];
  };
}

/**
 * The exemplar and selector the section derives, RE-DERIVED here by the same stated rules.
 *
 * Deliberately a second implementation of the rule rather than an import of the first: the claim is
 * that the page's choice follows the rule its own comment states — the structural type's exemplar,
 * and the declared entity type with the most entities — and importing the chooser would assert only
 * that the page agrees with itself.
 */
function expectedSubject(): {
  readonly example: ExampleId;
  readonly system: CanonicalSystem;
  readonly selector: { readonly type: string };
} {
  const structural = MODEL_TYPES.find((t) => t.queryKind === "graph");
  assert.ok(structural !== undefined, "no registered type answers the graph dialect");
  const visual = exemplarFor(structural.id, systems);
  assert.ok(visual !== null, `${structural.id}: no shipped example instantiates the type`);
  const system = systems.get(visual.example);
  assert.ok(system !== undefined);
  let best: { readonly type: string; readonly value: number } | null = null;
  for (const type of countElements(system, {}).declaredTypes) {
    const counted = countElements(system, { type });
    if (!counted.counted) continue;
    if (best === null || counted.count.value > best.value) {
      best = { type, value: counted.count.value };
    }
  }
  assert.ok(best !== null, "the structural exemplar declares no countable entity type");
  return { example: visual.example, system, selector: { type: best.type } };
}

// ---------------------------------------------------------------------------------------------
// (1) + (2) Both arms reach the entry, by reference, and the subject projection is total
// ---------------------------------------------------------------------------------------------

test("both arms of the query semantics reach the Learn entry BY REFERENCE, not as copies", () => {
  const entries = deriveLearnEntries();
  assert.equal(entries.length, MODEL_TYPES.length);
  for (const t of MODEL_TYPES) {
    const entry = entries.find((e) => e.id === t.id);
    assert.ok(entry !== undefined, `${t.id}: the registry row has no Learn entry`);
    assert.strictEqual(entry.forms, t.query.forms,
      `${t.id}: the entry's forms are a COPY of the registry's array, not the array — a copy is `
      + "free to drift from the field the dispatcher reads");
    assert.strictEqual(entry.subjects, t.query.subjects,
      `${t.id}: the entry's subjects are a COPY of the registry's array, not the array`);
  }
});

test("every declared subject is on its own card, in the registry's order, and no card invents one", () => {
  const sections = buildTypeSections(systems);
  assert.ok(sections.length > 0);
  for (const s of sections) {
    const t = MODEL_TYPES.find((m) => m.id === s.entry.id);
    assert.ok(t !== undefined, `section '${s.entry.id}' has no registry row`);
    assert.ok(t.query.subjects.length > 0,
      `${t.id}: the registry declares no subject at all — this claim would be vacuous for it`);
    assert.deepEqual(
      s.entry.subjects.map((x) => [x.noun, x.selector]),
      t.query.subjects.map((x) => [x.noun, x.selector]),
      `${t.id}: the card's selectable subjects are not the registry row's, in its order`);
    for (const subject of s.entry.subjects) {
      // The third cell the card renders is the registry's own role sentence, so a noun that cannot
      // be selected on its own carries that caveat in the registry's words rather than the page's.
      assert.ok(subject.declaredBy.role.length > 20,
        `${t.id}/${subject.noun}: the role the card renders says nothing about what the noun is`);
    }
  }
});

// ---------------------------------------------------------------------------------------------
// (3) The gallery is exactly as strict as it was
// ---------------------------------------------------------------------------------------------

test("the subject arm adds no gallery card and no section — a subject cannot stand in for a type", () => {
  const sections = buildTypeSections(systems);
  assert.deepEqual(sections.map((s) => s.entry.id), MODEL_TYPES.map((t) => t.id),
    "the type sections are no longer one per registry row");

  // CONTAINMENT, which is the half that could have gone wrong: a subject is rendered INSIDE its own
  // type's card, so every subject the page shows belongs to a type that has a card of its own.
  // Nothing in the subject arm can supply a card the registry stopped declaring, and a type whose
  // registry row went away takes its subjects with it.
  const carded = new Set(sections.map((s) => s.entry.id));
  let shown = 0;
  for (const s of sections) {
    for (const subject of s.entry.subjects) {
      assert.ok(carded.has(s.entry.id),
        `the subject '${subject.noun}' is shown for '${s.entry.id}', which has no card`);
      shown += 1;
    }
  }
  assert.equal(shown, MODEL_TYPES.reduce((n, t) => n + t.query.subjects.length, 0),
    "the page shows a different number of subjects than the registry declares");

  // And the operations section sits BESIDE the gallery, like the other question sections. A card
  // would make it a fourth axis and the registry would stop owning the gallery's count.
  const galleryAnchors = new Set<string>([
    ...MODEL_TYPES.map((t) => anchorForType(t.id)),
    ...MODEL_TYPE_USES.map((u) => anchorForUse(u.id)),
  ]);
  assert.ok(QUESTION_ANCHORS.includes(ANCHOR), `'${ANCHOR}' is not a declared question section`);
  assert.ok(!galleryAnchors.has(ANCHOR), `'${ANCHOR}' is a gallery anchor`);
});

// ---------------------------------------------------------------------------------------------
// (4) Every figure the section shows is re-derived
// ---------------------------------------------------------------------------------------------

test("the selection readout is a fresh selectElements over the selector the stated rule picks", () => {
  const { system, selector } = expectedSubject();
  const live = selectElements(system, selector);
  assert.ok(live.selected, "the derived selector was refused — the section would have nothing to show");
  const term = readout(section(), "Asked now");

  assert.equal(term("What is there"), live.ids.join(", "),
    "the section's element list is not the selection the engine returns for this selector");
  assert.equal(term("Entity types this system declares"), live.declaredTypes.join(", "));
  assert.equal(term("Asked of"), system.name,
    "the section names a different system from the one it asked");
});

test("the question text is the engine's own sentence for the selector, not a restatement", () => {
  const { selector } = expectedSubject();
  const parsed = parseElementSelector(selector);
  assert.notEqual(parsed, null, "the derived selector is unreadable to the engine's own parser");
  if (parsed === null) return;
  assert.equal(
    readout(section(), "Asked now")("The question, as the engine understood it"),
    interpretElementSelector(parsed),
    "the section words the question itself instead of showing what the engine understood");
});

test("the figure is a fresh countElements, and it carries the basis that earns its exactness", () => {
  const { system, selector } = expectedSubject();
  const live = countElements(system, selector);
  assert.ok(live.counted, "the derived selector was refused — there is no figure to check");
  if (!live.counted) return;
  const term = readout(section(), "The same question, counted");

  assert.equal(term("How many"), String(live.count.value),
    "the section's figure is not the cardinality the engine computed for this selector");
  assert.equal(live.count.exact, true,
    "the entity table is read whole, so this count is exact; a non-exact arm needs its own wording "
    + "on the page before it can ship");
  assert.ok(term("What makes that figure exact").includes(live.count.basis.replace(/-/g, " ")),
    `the section does not name the basis the figure carries ('${live.count.basis}'), so a reader `
    + "has nothing to tell an exact count from a floor");

  // The whole reason `count` is a second operation rather than a field: it drops the list.
  assert.ok(!("ids" in live),
    "`countElements` returned the ids — the section's claim that the figure arrives without the "
    + "list is no longer true of the value it renders");
});

// ---------------------------------------------------------------------------------------------
// (5) The no-claim property is read off the answers, not asserted beside them
// ---------------------------------------------------------------------------------------------

test("neither answer carries a verdict, and the page's Verdict term says so because it looked", () => {
  const { system, selector } = expectedSubject();
  const built = section();

  for (const [label, answer] of [
    ["Asked now", selectElements(system, selector)],
    ["The same question, counted", countElements(system, selector)],
  ] as const) {
    assert.ok(!("outcome" in answer),
      `${label}: the answer now carries an outcome, so the section must stop saying it carries none`);
    assert.ok(!("evidence" in answer),
      `${label}: the answer now carries evidence, so the section's line about witnesses is stale`);

    const verdict = readout(built, label)("Verdict");
    const outcomes: readonly Outcome[] = ["holds", "refuted", "inconclusive", "unlicensed"];
    for (const outcome of outcomes) {
      assert.ok(!verdict.split(/\W+/).includes(outcome),
        `${label}: the Verdict term reads '${verdict}', which names the outcome '${outcome}' for an `
        + "answer that has none");
    }
  }
});

// ---------------------------------------------------------------------------------------------
// (6) The contrast is a live verdict on the same model
// ---------------------------------------------------------------------------------------------

test("the contrast question is a saved question of the SAME model, and its verdict is the live one", () => {
  const { example, system } = expectedSubject();
  const term = readout(section(), "The other kind");
  const statement = term("The question, as its author stated it");

  // Find the saved graph question the section named, by its authored statement — the page shows the
  // statement, so the join back to the system is through the same field it rendered.
  const saved = savedStatements(system, "graph").find((q) => {
    const raw: unknown = system.queries.get(q.id)?.raw;
    return q.label === statement
      || (typeof raw === "object" && raw !== null && !Array.isArray(raw)
        && (raw as Record<string, unknown>)["name"] === statement);
  });
  assert.ok(saved !== undefined,
    `'${example}' declares no saved graph question stated as '${statement}' — the contrast names a `
    + "question the model it claims to be about does not hold");

  const raw: unknown = system.queries.get(saved.id)?.raw;
  const live = runQuery(system, raw).result;
  assert.equal(term("Verdict"), live.outcome,
    "the contrast's verdict is not the outcome the engine computes for that question now");
  assert.equal(live.refusal, null,
    "the contrast question is refused, which teaches that this kind of question declines rather "
    + "than that it returns a verdict — the refusals belong in question-omissions");
  assert.ok(live.evidence !== null && live.evidence.shape !== "none",
    "the contrast carries no evidence, so the section cannot show that a claim comes back with the "
    + "evidence that settles it");
});
