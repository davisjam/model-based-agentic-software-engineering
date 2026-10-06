// The cross-model relationships reach Learn as the two SEPARATE kinds the kernel declares them as.
//
// `test/learn-content.test.ts` holds the gallery's 1:1 correspondence with the model-type registry.
// `test/learn-operations.test.ts` holds the one `DESIGN-v02-quantification-261004.md` asked for —
// both arms of the query semantics, by reference, and no subject standing in for a type. This file
// holds the one `DESIGN-v02-examples-and-semantic-completion-261004.md` §4 and §23 ask for: bindings
// and compositions are separately typed and separately totalized in the kernel, and the page must
// not re-merge them, re-word them, or let `combineWith` pass for either.
//
// Seven claims:
//
//   (1) BOTH registries reach the page BY REFERENCE. Each relationship a card offers for its
//       pairing is the registry ENTRY, not a projection of one — reference identity, because an
//       entry rebuilt here would pass a deepEqual and drift on the next registry edit.
//   (2) The two sections are TOTAL over their own registry, in its order, and neither carries a row
//       the other's registry declares. A binding cannot appear as a composition or the reverse,
//       which is the whole of §4.1's ruling expressed on the page.
//   (3) `combineWith` is NOT one of them. The pairing is navigation (§4.1, §15): no registry row is
//       named for it, the card's declared kinds are exactly the registry rows between the two
//       domains, and the pairing with no declared relationship is rendered as that rather than as
//       a line whose meaning goes unsaid.
//   (4) The corpus rows are RE-DERIVED. An independent walk over the shipped systems, driven by
//       each binding's own `witness`, produces the counts, the example names and the instance the
//       section shows — and "this page cannot read that spelling" is distinguished from "the corpus
//       declares none", because printing a zero for both is a claim about the corpus.
//   (5) The §8 lesson is READ, not asserted. "A binding does not combine the models into one larger
//       model. Each retains its purpose and omissions" appears on the page as two `Purpose` records
//       from one real bound pair, and every term equals the IR's own field.
//   (6) The composition is ASKED. The composed readout is a fresh `runQuery`; the uncomposed query
//       differs from it in EXACTLY the one field the registry entry cites; and the engine's own
//       interpretation sentence carries the selection, so the composition is visible in words the
//       page did not write.
//   (7) The state spread is re-derived per state, from the machine whose vocabulary the shipped
//       selection's value belongs to — so the figures that move are figures the engine moved.
//
// Nothing below pins a string the builder produced, and no outcome word appears as a literal:
// every expectation is a second derivation from the registry, the engine or the shipped examples.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { CanonicalSystem } from "../src/ir/types.ts";
import {
  BINDINGS, COMPOSITIONS, MODEL_TYPES, modelTypeForQueryKind,
} from "../src/engine/model-types.ts";
import { runQuery } from "../src/engine/index.ts";
import { Workspace } from "../src/app/services.ts";
import { SHIPPED_EXAMPLE_IDS, type ShippedExampleId } from "../src/app/examples.ts";
import {
  anchorForType, anchorForUse, bindingsBetween, compositionsBetween, deriveLearnEntries,
  MODEL_TYPE_USES,
} from "../src/app/learn.ts";
import {
  buildTypeSections, composedQuantityQuery, declaredUnitOf, type LoadedSystems,
} from "../src/learn/content.ts";
import { fixturePathFor, readFixture, type LoadedFixtures } from "../src/learn/fixtures.ts";
import {
  buildQuestionSections, QUESTION_ANCHORS, selectionEffect,
  type BuiltQuestionSection, type QuestionBlock,
} from "../src/learn/questions.ts";

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

const BINDING_ANCHOR = "question-bindings";
const COMPOSITION_ANCHOR = "question-compositions";

const built = buildQuestionSections(systems, fixtures);

const sectionAt = (anchor: string): BuiltQuestionSection => {
  const s = built.find((x) => x.section.anchor === anchor);
  assert.ok(s !== undefined, `the Learn page builds no '${anchor}' section`);
  return s;
};

/** One `rows` table by its label prefix — the label is the addressable name of a computed table. */
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

/** One `pairs` readout by its label prefix, as a term lookup. */
function readout(section: BuiltQuestionSection, startsWith: string): (term: string) => string {
  const block = section.blocks.find(
    (b): b is Extract<QuestionBlock, { kind: "pairs" }> =>
      b.kind === "pairs" && b.label.startsWith(startsWith));
  assert.ok(block !== undefined,
    `'${section.section.anchor}' has no readout labelled '${startsWith}…'; labels present: `
    + section.blocks.map((b) => (b.kind === "prose" ? "(prose)" : b.label)).join(" | "));
  return (term: string): string => {
    const pair = block.pairs.find(([t]) => t === term);
    assert.ok(pair !== undefined,
      `the '${block.label}' readout has no '${term}' term; terms present: `
      + block.pairs.map(([t]) => t).join(" | "));
    return pair[1];
  };
}

const prose = (section: BuiltQuestionSection): string =>
  section.blocks.filter((b) => b.kind === "prose").map((b) => b.text).join(" ");

// ---------------------------------------------------------------------------------------------
// (1) Both registries reach the page by reference
// ---------------------------------------------------------------------------------------------

test("a card's declared relationships are the registry ENTRIES, not projections of them", () => {
  const entries = deriveLearnEntries();
  assert.equal(entries.length, MODEL_TYPES.length);
  let offered = 0;
  for (const entry of entries) {
    // Re-derived by the same stated rule — whichever rows run between the two domains, either
    // direction — rather than by importing the chooser, which would assert only self-agreement.
    const bindings = BINDINGS.filter(
      (b) => (b.from === entry.id && b.to === entry.combineWith.partner)
        || (b.from === entry.combineWith.partner && b.to === entry.id));
    const compositions = COMPOSITIONS.filter(
      (c) => (c.from === entry.id && c.to === entry.combineWith.partner)
        || (c.from === entry.combineWith.partner && c.to === entry.id));
    assert.equal(entry.combineWith.bindings.length, bindings.length,
      `${entry.id}: the card offers a different number of bindings than run between the two domains`);
    assert.equal(entry.combineWith.compositions.length, compositions.length,
      `${entry.id}: the card offers a different number of compositions than run between the domains`);
    for (const [i, b] of bindings.entries()) {
      assert.strictEqual(entry.combineWith.bindings[i], b,
        `${entry.id}: the card's binding '${b.name}' is a COPY of the registry entry, not the `
        + "entry — a copy is free to drift from the row the kernel reads");
    }
    for (const [i, c] of compositions.entries()) {
      assert.strictEqual(entry.combineWith.compositions[i], c,
        `${entry.id}: the card's composition '${c.name}' is a COPY of the registry entry`);
    }
    offered += bindings.length + compositions.length;
  }
  assert.ok(offered > 0,
    "no card offers any declared relationship, so claim (1) ranges over nothing — either the "
    + "registry declares no relationship between any paired domains, or the projection broke");
});

test("the exported between-domains readers are the registry's own rows, either direction", () => {
  for (const a of MODEL_TYPES) {
    for (const b of MODEL_TYPES) {
      assert.deepEqual(
        bindingsBetween(a.id, b.id).map((x) => x.name),
        BINDINGS.filter((x) => (x.from === a.id && x.to === b.id) || (x.from === b.id && x.to === a.id))
          .map((x) => x.name),
        `bindingsBetween(${a.id}, ${b.id}) is not the registry's rows between those domains`);
      assert.deepEqual(
        compositionsBetween(a.id, b.id).map((x) => x.name),
        COMPOSITIONS.filter((x) => (x.from === a.id && x.to === b.id) || (x.from === b.id && x.to === a.id))
          .map((x) => x.name),
        `compositionsBetween(${a.id}, ${b.id}) is not the registry's rows between those domains`);
    }
  }
  // Symmetry is the claim the card relies on: a pairing has no direction, so a card must not see a
  // different relationship set than its partner's card does.
  for (const a of MODEL_TYPES) {
    for (const b of MODEL_TYPES) {
      assert.deepEqual(bindingsBetween(a.id, b.id), bindingsBetween(b.id, a.id));
      assert.deepEqual(compositionsBetween(a.id, b.id), compositionsBetween(b.id, a.id));
    }
  }
});

// ---------------------------------------------------------------------------------------------
// (2) Each section is total over its own registry, and the two do not cross
// ---------------------------------------------------------------------------------------------

test("the bindings section lists every binding, in the registry's order, and invents none", () => {
  const table = rowsLabelled(sectionAt(BINDING_ANCHOR), "Every binding");
  assert.deepEqual(table.rows.map((r) => r[0]), BINDINGS.map((b) => b.name),
    "the section's binding table is not BINDINGS, in its order");
  for (const [i, b] of BINDINGS.entries()) {
    const row = table.rows[i];
    assert.ok(row !== undefined);
    assert.equal(row[2], b.interpretation,
      `${b.name}: the section words the correspondence itself instead of showing the registry's `
      + "interpretation");
    // The licensing cell must carry the gate's own content — a citation for a declared gate, the
    // stated reason for a by-construction one. Either way it is not this page's sentence.
    const expected = b.licensing.kind === "declared" ? b.licensing.by.symbol : b.licensing.why;
    assert.ok((row[3] ?? "").includes(expected),
      `${b.name}: the licensing cell '${row[3] ?? ""}' does not carry the gate's own '${expected}'`);
  }
});

test("every binding's semantic basis is accounted for, grouped by the basis and not by the row", () => {
  const section = sectionAt(BINDING_ANCHOR);
  const block = section.blocks.find(
    (b): b is Extract<QuestionBlock, { kind: "pairs" }> =>
      b.kind === "pairs" && b.label.startsWith("Where the binding semantics"));
  assert.ok(block !== undefined);

  // TOTALITY: every binding is named by exactly one group, so no row's attribution is missing and
  // none is claimed twice. §35's rule is that nothing is attributed by omission.
  const named = block.pairs.flatMap(([names]) => names.split(", "));
  assert.deepEqual([...named].sort(), BINDINGS.map((b) => b.name).sort(),
    "the basis groups do not name every binding exactly once");

  // GROUPED BY THE OBJECT: one entry per distinct basis, by reference identity.
  const distinct = new Set(BINDINGS.map((b) => b.semanticBasis));
  assert.equal(block.pairs.length, distinct.size,
    "the number of basis groups is not the number of distinct SemanticBasis objects the bindings "
    + "declare — either one claim is printed per row, or two claims were merged");

  for (const b of BINDINGS) {
    const group: readonly [string, string] | undefined =
      block.pairs.find(([names]) => names.split(", ").includes(b.name));
    assert.ok(group !== undefined);
    if (b.semanticBasis.kind === "borrowed") {
      assert.ok(group[1].includes(b.semanticBasis.standard) && group[1].includes(b.semanticBasis.concept),
        `${b.name}: the account omits the standard or the concept it realizes a subset of`);
    } else {
      assert.ok(group[1].includes(b.semanticBasis.why),
        `${b.name}: the account is not the registry's own reason`);
      assert.ok(!/SysML|KerML/.test(group[1]),
        `${b.name} is an extension and its account names a standard — §35.3's over-attribution`);
    }
  }
});

test("the compositions section lists every composition, with the result type CITED not restated", () => {
  const section = sectionAt(COMPOSITION_ANCHOR);
  const table = rowsLabelled(section, "Every cross-domain composition");
  assert.deepEqual(table.rows.map((r) => r[0]), COMPOSITIONS.map((c) => c.name),
    "the section's composition table is not COMPOSITIONS, in its order");
  const grounding = rowsLabelled(section, "Where each one is grounded");
  assert.deepEqual(grounding.rows.map((r) => r[0]), COMPOSITIONS.map((c) => c.name));
  for (const [i, c] of COMPOSITIONS.entries()) {
    const row = table.rows[i];
    const ground = grounding.rows[i];
    assert.ok(row !== undefined && ground !== undefined);
    assert.equal(row[2], c.interpretation, `${c.name}: the interpretation is not the registry's`);
    assert.equal(row[3], c.restricts,
      `${c.name}: the narrowed noun is not the registry's 'restricts' — a composition narrows a `
      + "domain, and which domain is the registry's answer");
    for (const part of [c.result.file, c.result.symbol, c.result.role]) {
      assert.ok((ground[2] ?? "").includes(part),
        `${c.name}: the result cell omits '${part}', so the TARGET dialect's own result type is `
        + "restated rather than cited — which is the first step toward the pipeline §4.3 forbids");
    }
  }
});

test("no relationship appears as both kinds, and neither section is a gallery card", () => {
  const bindingNames = new Set(BINDINGS.map((b) => b.name));
  for (const c of COMPOSITIONS) {
    assert.ok(!bindingNames.has(c.name),
      `'${c.name}' is declared as both a binding and a composition — §4.1's line has collapsed`);
  }
  const bindingTable = rowsLabelled(sectionAt(BINDING_ANCHOR), "Every binding");
  const compositionTable = rowsLabelled(sectionAt(COMPOSITION_ANCHOR), "Every cross-domain");
  const compositionNames = new Set(COMPOSITIONS.map((c) => c.name));
  for (const row of bindingTable.rows) {
    assert.ok(!compositionNames.has(row[0] ?? ""),
      `the bindings section lists '${row[0] ?? ""}', which the registry declares a composition`);
  }
  for (const row of compositionTable.rows) {
    assert.ok(!bindingNames.has(row[0] ?? ""),
      `the compositions section lists '${row[0] ?? ""}', which the registry declares a binding`);
  }

  // And they sit BESIDE the gallery, like every other question section: a card would make a
  // relationship a fourth gallery axis and the model-type registry would stop owning the count.
  const galleryAnchors = new Set<string>([
    ...MODEL_TYPES.map((t) => anchorForType(t.id)),
    ...MODEL_TYPE_USES.map((u) => anchorForUse(u.id)),
  ]);
  for (const anchor of [BINDING_ANCHOR, COMPOSITION_ANCHOR]) {
    assert.ok(QUESTION_ANCHORS.includes(anchor), `'${anchor}' is not a declared question section`);
    assert.ok(!galleryAnchors.has(anchor), `'${anchor}' is a gallery anchor`);
  }
  assert.deepEqual(buildTypeSections(systems).map((s) => s.entry.id), MODEL_TYPES.map((t) => t.id),
    "the type sections are no longer one per registry row");
});

// ---------------------------------------------------------------------------------------------
// (3) combineWith is navigation, and the page does not promote it
// ---------------------------------------------------------------------------------------------

test("no registered relationship is the pairing, and a pairing with none says so", () => {
  for (const row of [...BINDINGS, ...COMPOSITIONS]) {
    assert.notEqual(row.name, "combineWith",
      "a registry row is named for the Learn pairing — §4.1 says the pairing is navigation and not "
      + "a semantic relationship, so it may not be either array's member");
  }

  // The informative case, re-derived rather than asserted: whichever paired domains the registry
  // declares nothing between. The card for those must still account for the line it draws.
  const unrelated = deriveLearnEntries().filter(
    (e) => bindingsBetween(e.id, e.combineWith.partner).length === 0
      && compositionsBetween(e.id, e.combineWith.partner).length === 0);
  assert.ok(unrelated.length > 0,
    "every paired domain now has a declared relationship, so this claim ranges over nothing — if "
    + "that is intended, the empty branch in `relationshipKinds` is dead and should go with it");
  for (const entry of unrelated) {
    assert.equal(entry.combineWith.bindings.length, 0);
    assert.equal(entry.combineWith.compositions.length, 0);
  }
});

// ---------------------------------------------------------------------------------------------
// (4) The corpus rows are a second walk, driven by the same declared witness
// ---------------------------------------------------------------------------------------------

/**
 * Every correspondence one shipped system declares for one binding, walked independently.
 *
 * Deliberately a second implementation rather than an import of the first: the claim is that the
 * page's walk follows the binding's own `witness` declaration, and importing the walker would
 * assert only that the page agrees with itself. Returns null for a spelling this walk cannot read,
 * which is the distinction the row must preserve.
 */
function walk(bindingName: string, system: CanonicalSystem): readonly string[] | null {
  const binding = BINDINGS.find((b) => b.name === bindingName);
  assert.ok(binding !== undefined, `'${bindingName}' is not a registered binding`);
  const { source, target } = binding.correspondence;
  if (binding.witness.kind === "shared-membership") {
    if (source !== "entity" || target !== "model") return null;
    const counts = new Map<string, string[]>();
    for (const [modelId, model] of system.models) {
      for (const entity of model.entities) {
        counts.set(entity, [...(counts.get(entity) ?? []), modelId]);
      }
    }
    return [...counts].filter(([, m]) => m.length > 1)
      .map(([entity, m]) => `${entity} is declared by ${m.join(", ")}`);
  }
  if (source === "machine") {
    if (!binding.witness.keys.includes("entity")) return null;
    return [...system.machines].flatMap(([id, m]) => (m.entity === null ? [] : [`${id}.entity = ${m.entity}`]));
  }
  if (source === "entity") {
    const out: string[] = [];
    for (const [entityId, entity] of system.entities) {
      for (const key of binding.witness.keys) {
        const value = entity.properties.get(key);
        if (value !== undefined) out.push(`${entityId}.${key} = ${String(value.value)}`);
      }
    }
    return out;
  }
  return null;
}

test("the corpus table's counts, examples and instance are a second walk over the same witness", () => {
  const table = rowsLabelled(sectionAt(BINDING_ANCHOR), "And where the shipped examples");
  assert.deepEqual(table.rows.map((r) => r[0]), BINDINGS.map((b) => b.name),
    "the corpus table is not total over BINDINGS — a binding with no row reads as one the kernel "
    + "stopped declaring");

  let witnessedBindings = 0;
  for (const [i, binding] of BINDINGS.entries()) {
    const row = table.rows[i];
    assert.ok(row !== undefined);
    const names: string[] = [];
    let count = 0;
    let first: string | null = null;
    let unreadable = false;
    for (const example of SHIPPED_EXAMPLE_IDS) {
      const system = systems.get(example);
      assert.ok(system !== undefined);
      const found = walk(binding.name, system);
      if (found === null) { unreadable = true; continue; }
      if (found.length === 0) continue;
      names.push(system.name);
      count += found.length;
      first ??= `${found[0] ?? ""} — in ${system.name}`;
    }
    if (count > 0) witnessedBindings += 1;

    assert.equal(row[1], names.length === 0 ? "—" : names.join(", "),
      `${binding.name}: the row names different shipped examples than declare it`);
    assert.equal(row[2], count === 0 && unreadable ? "not readable from a model document" : String(count),
      `${binding.name}: the count is not the number this walk finds — and note a spelling this `
      + "page cannot read must NOT be reported as a count of zero, which would be a claim about "
      + "the corpus made from a gap in the walk");
    if (first !== null) {
      assert.equal(row[3], first,
        `${binding.name}: the shown instance is not the first one the walk finds`);
    }
  }
  assert.ok(witnessedBindings > 0,
    "no binding is witnessed anywhere in the shipped corpus, so the table shows three empty rows "
    + "and the section teaches nothing — the fixture set or the witness declarations are wrong");
});

// ---------------------------------------------------------------------------------------------
// (5) The §8 lesson is two declarations read out of the IR
// ---------------------------------------------------------------------------------------------

test("the bound-pair readout is the two models' OWN purposes, and the binding merged neither", () => {
  const term = readout(sectionAt(BINDING_ANCHOR), "Two models, bound");

  // Re-derive the pair by the rule the builder states: the first shipped example, in shipped order,
  // with a machine→entity binding whose both sides are real.
  const binding = BINDINGS.find(
    (b) => b.correspondence.source === "machine" && b.correspondence.target === "entity");
  assert.ok(binding !== undefined,
    "no binding corresponds a machine to an entity — §4.2 requires machine-of-entity");
  let pair: {
    system: CanonicalSystem; machineId: string; entityId: string; modelId: string;
  } | null = null;
  for (const example of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(example);
    assert.ok(system !== undefined);
    for (const [machineId, machine] of system.machines) {
      const entityId = machine.entity;
      if (entityId === null) continue;
      const owner = [...system.models].find(([, m]) => m.entities.includes(entityId));
      if (owner === undefined) continue;
      pair = { system, machineId, entityId, modelId: owner[0] };
      break;
    }
    if (pair !== null) break;
  }
  assert.ok(pair !== null,
    "no shipped example declares a machine against an entity a purposeful model also declares");

  const machine = pair.system.machines.get(pair.machineId);
  const model = pair.system.models.get(pair.modelId);
  assert.ok(machine !== undefined && model !== undefined);

  assert.equal(term("The binding"), binding.name);
  assert.equal(term("Asked of"), pair.system.name,
    "the readout names a different system from the one it read");
  assert.equal(term("The correspondence, as the model writes it"),
    `${pair.machineId}.entity = ${pair.entityId}`,
    "the correspondence cell is not the reference the machine actually authors");
  // Both sides are real, which is what makes this a correspondence and not a dangling reference.
  assert.ok(pair.system.entities.has(pair.entityId),
    `'${pair.entityId}' is named by a machine and declared by no entity`);
  assert.ok(model.entities.includes(pair.entityId),
    `'${pair.modelId}' does not declare '${pair.entityId}', so the pair is not bound through it`);

  const question = (p: { question: string | null }): string =>
    p.question === null ? "(none declared)" : p.question.trim();
  assert.equal(term("What the behavioral model asks"),
    `${pair.machineId} — ${question(machine.purpose)}`);
  assert.equal(term("What the structural model asks"),
    `${pair.modelId} — ${question(model.purpose)}`);

  // THE LESSON, as set arithmetic over the two declarations rather than as a sentence: each model
  // still declares its own omissions, and the shared term is the real intersection.
  assert.ok(machine.purpose.omits.length > 0 && model.purpose.omits.length > 0,
    "one of the bound models declares no omissions, so 'each retains its omissions' is vacuous here");
  assert.equal(term("What the behavioral model leaves out"), machine.purpose.omits.join("; "));
  assert.equal(term("What the structural model leaves out"), model.purpose.omits.join("; "));
  const shared = machine.purpose.omits.filter((o) => model.purpose.omits.includes(o));
  assert.equal(term("Omissions both of them declare"),
    shared.length === 0 ? "(none declared)" : shared.join("; "));
  assert.ok(shared.length < machine.purpose.omits.length
    && shared.length < model.purpose.omits.length,
    "the two bound models declare the same omissions, so this pair cannot show that a binding is "
    + "not a merge — a different pair is needed, not a looser claim");

  // And the page's own counts are the set differences, not round numbers.
  const text = prose(sectionAt(BINDING_ANCHOR));
  for (const n of [
    machine.purpose.omits.length - shared.length, model.purpose.omits.length - shared.length,
  ]) {
    assert.ok(text.includes(String(n)),
      `the section's prose does not carry the count ${n}, so the "each keeps its own" claim is not `
      + "arithmetic over the two declarations");
  }
});

test("the section says the composed view is derived from the declared relationship", () => {
  // The predecessor of this test pinned the disclosure that no cross-model canvas existed, and
  // said to delete that assertion the day a composer lands. It landed (`src/app/cross-model.ts`,
  // derived composed views in the subject list), and the authored `views:` section was deleted in
  // the same ruling (261006): composition is derived exclusively from semantic relationships. So
  // the pin moves to the new claim — the section must say the joint picture FOLLOWS from the
  // declared binding, not that a reader declares a presentation to get it.
  const text = prose(sectionAt(BINDING_ANCHOR));
  assert.match(text, /establish how the models relate/i,
    "the bindings section no longer says the composed view is derived from the declared "
    + "relationship — the relationship is the model; the view is a consequence");
  assert.match(text, /the view is a consequence/,
    "the section dropped the consequence framing: a reader should learn that showing two models "
    + "together is licensed by the relationship the modeller asserted, never by listing them");
});

// ---------------------------------------------------------------------------------------------
// (6) + (7) The composition is asked, and the selection is the only thing that changed
// ---------------------------------------------------------------------------------------------

/** The composed reading re-derived by the builder's stated rules, independently of the builder. */
function expectedComposition(): {
  readonly system: CanonicalSystem;
  readonly statement: string;
  readonly ref: string;
  readonly value: string;
  readonly machineId: string;
  readonly metrics: readonly string[];
} {
  const behavioural = modelTypeForQueryKind("behavior");
  const quantitative = modelTypeForQueryKind("quantity");
  const composition = COMPOSITIONS.find(
    (c) => c.from === behavioural.id && c.to === quantitative.id);
  assert.ok(composition !== undefined,
    "no composition runs from the behavioural dialect to the quantitative one — §4.3 requires "
    + "executions-selected-by-behaviour");
  for (const example of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(example);
    assert.ok(system !== undefined);
    for (const id of system.queries.keys()) {
      const raw: unknown = system.queries.get(id)?.raw;
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;
      const record = raw as Record<string, unknown>;
      if (record["kind"] !== "behavior") continue;
      const behavior = record["behavior"];
      if (typeof behavior !== "object" || behavior === null) continue;
      const b = behavior as Record<string, unknown>;
      if (b["form"] !== "reach" || "avoid" in b) continue;
      const target = b["target"];
      if (typeof target !== "object" || target === null) continue;
      const entries = Object.entries(target as Record<string, unknown>);
      if (entries.length !== 1) continue;
      const [ref, value] = entries[0] ?? [];
      if (ref === undefined || typeof value !== "string") continue;
      const machine = [...system.machines].find(([, m]) => m.states.includes(value));
      if (machine === undefined) continue;
      if (composedQuantityQuery(system, quantitative.query.forms) === null) continue;
      const name = record["name"];
      return {
        system,
        statement: typeof name === "string" && name.trim() !== "" ? name.trim() : id,
        ref, value, machineId: machine[0], metrics: quantitative.query.forms,
      };
    }
  }
  assert.fail("no shipped example supports the composition the section claims to show");
}

test("the composed readout is a fresh run, and the engine's own sentence carries the selection", () => {
  const { system, statement, ref, value, metrics } = expectedComposition();
  const composed = composedQuantityQuery(system, metrics, undefined, { [ref]: value });
  const plain = composedQuantityQuery(system, metrics);
  assert.ok(composed !== null && plain !== null);
  const live = runQuery(system, composed.query).result;
  const bare = runQuery(system, plain.query).result;

  const term = readout(sectionAt(COMPOSITION_ANCHOR), "The composed question");
  assert.equal(term("Asked of"), system.name);
  assert.equal(term("The behavioral selection, as its author stated it"), statement,
    "the readout names a selection the system's own saved questions do not state");
  assert.equal(term("The question, as the engine understood it"), live.interpretedAs,
    "the section words the composed question itself instead of showing what the engine understood");
  assert.equal(term("Verdict"), live.outcome,
    "the verdict is not the outcome the engine computes for the composed question now");
  assert.equal(term("The declared ceiling it is decided against"), composed.ceiling);
  // The unit travels WITH the number, and it is the unit the CEILING declares — not the dimension's
  // base. Asserting the base unit passes for free on a ceiling written in it, so it would have let
  // a `2 s` ceiling go on being decided by a figure quoted in milliseconds.
  const ceilingUnit = declaredUnitOf(system, composed.ceiling);
  assert.ok(ceilingUnit !== null,
    `ceiling '${composed.ceiling}' declares no single unit, so this test cannot say which unit the `
    + "figure owes the reader");
  assert.ok(live.magnitude !== null && term("The figure that decides it").endsWith(` ${ceilingUnit}`),
    `the figure cell does not read in '${ceilingUnit}', the unit its ceiling is declared in, so the `
    + "page asks the reader to convert before they can tell whether the model fits");

  const bareTerm = readout(sectionAt(COMPOSITION_ANCHOR), "The same metric and the same ceiling");
  assert.equal(bareTerm("The question, as the engine understood it"), bare.interpretedAs);
  assert.equal(bareTerm("Verdict"), bare.outcome);

  // The "what changed" cell is a COMPARISON of the two answers, so it stays true when the globally
  // worst execution is one the selection keeps. Re-derived by running the comparison, not matched
  // against the sentence: a page that promised a lower figure would be teaching that a selection
  // always flatters.
  assert.equal(bareTerm("What this selection changed"),
    selectionEffect({ composed: live, uncomposed: bare, ceilingUnit }),
    "the section's account of what the selection changed is not the comparison of the two answers "
    + "the engine returned");

  // THE CLAIM: the selection is the only difference, and it is visible in the engine's own words.
  assert.notEqual(live.interpretedAs, bare.interpretedAs,
    "the composed and uncomposed questions read identically to the engine, so the section is "
    + "showing one question twice and the composition is invisible on the page");
  assert.ok((live.interpretedAs ?? "").includes(ref),
    `the engine's reading of the composed question does not name the selection's ref '${ref}', so `
    + "the behavioural predicate did not reach the quantitative evaluation");
  assert.ok(!(bare.interpretedAs ?? "").includes(ref),
    "the UNCOMPOSED question's reading already names the selection, so the two readouts do not "
    + "differ by the composition");
});

test("the composed and uncomposed queries differ in exactly the field the registry cites", () => {
  const { system, ref, value, metrics } = expectedComposition();
  const composed = composedQuantityQuery(system, metrics, undefined, { [ref]: value });
  const plain = composedQuantityQuery(system, metrics);
  assert.ok(composed !== null && plain !== null);

  // One question shape, one differing field. A second builder for the composed case could have
  // drifted in the metric or the ceiling, and then the contrast on the page would be two questions
  // rather than one question selected two ways.
  assert.equal(composed.metric, plain.metric);
  assert.equal(composed.ceiling, plain.ceiling);
  const a = composed.query as Record<string, Record<string, unknown>>;
  const b = plain.query as Record<string, Record<string, unknown>>;
  const differing = [...new Set([...Object.keys(a["quantity"] ?? {}), ...Object.keys(b["quantity"] ?? {})])]
    .filter((k) => JSON.stringify(a["quantity"]?.[k]) !== JSON.stringify(b["quantity"]?.[k]));
  assert.deepEqual(differing, ["target"],
    "the composed question differs from the uncomposed one in something other than the reach "
    + "predicate the registry's composition entry is declared against");
});

test("the state spread is re-derived per declared state of the machine the selection names", () => {
  const { system, ref, machineId, metrics } = expectedComposition();
  const machine = system.machines.get(machineId);
  assert.ok(machine !== undefined);
  const table = rowsLabelled(sectionAt(COMPOSITION_ANCHOR), "The same question, selected on each state");

  assert.deepEqual(table.rows.map((r) => r[0]), [...machine.states],
    `the spread is not one row per state '${machineId}' declares, in its own order`);
  for (const [i, state] of machine.states.entries()) {
    const built = composedQuantityQuery(system, metrics, undefined, { [ref]: state });
    assert.ok(built !== null);
    const live = runQuery(system, built.query).result;
    const row = table.rows[i];
    assert.ok(row !== undefined);
    assert.equal(row[1], live.outcome,
      `${state}: the row's verdict is not the one the engine computes for that selection now`);
    assert.ok((row[2] ?? "").includes(
      live.magnitude === null ? "—" : String(live.magnitude.value)),
      `${state}: the row's figure is not the magnitude the engine returned`);
  }

  // The spread is the lesson, so it has to vary: if every selection gave one verdict, the section
  // would be showing that the behavioural model does not participate.
  assert.ok(new Set(table.rows.map((r) => r[1])).size > 1,
    "every selected domain yields the same verdict, so the page cannot show that the behavioural "
    + "predicate decides what the quantitative question is about");
});
