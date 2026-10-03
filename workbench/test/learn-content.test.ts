// The Learn surface derives; it does not author (UX-I9).
//
// Four claims, each a join between the page's content model and a source the kernel owns:
//
//   (1) The gallery's sections are the registry's entries plus the declared uses — no section
//       without a registry row, no registry row without a section — and every visual is the REAL
//       renderer over a shipped example the registry's own presence predicate selected.
//   (2) Every composition the page suggests is one the kernel evaluates. The richer questions are
//       grounded: the shipped example a pairing points at declares both types, and a query of the
//       composed shape ANSWERS there rather than refusing.
//   (3) The missing-model-type refusal links to the Learn entry for the absent type, and the link
//       lands on a section the page actually builds — the refusal and the gallery read one object.
//   (4) The static learn.html carries no capability content: every entry anchor exists only in the
//       derivation, so a hand-edit to the shell cannot add a brochure.
//
// Every expectation is a lookup against the registry, the engine, or the shipped examples — the
// derived-values control polices this file like any other.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { ACCOUNTED_METRICS, type CanonicalSystem } from "../src/ir/types.ts";
import { MODEL_TYPES, modelTypeForQueryKind } from "../src/engine/model-types.ts";
import { runQuery } from "../src/engine/index.ts";
import { renderView } from "../src/render/index.ts";
import { Workspace } from "../src/app/services.ts";
import { SHIPPED_EXAMPLE_IDS, type ShippedExampleId } from "../src/app/examples.ts";
import {
  anchorForType, deriveLearnEntries, learnHrefForType, learnLinkForRefusal, MODEL_TYPE_USES,
  presentTypes,
} from "../src/app/learn.ts";
import {
  buildTypeSections, buildUseSections, propertyJoinQuestions, quantityRows, savedQuestions,
  type LoadedSystems,
} from "../src/learn/content.ts";
import { REQUIREMENT_METRICS } from "../src/quant/requirement.ts";

const loadSystems = (): LoadedSystems => {
  const systems = new Map<ShippedExampleId, CanonicalSystem>();
  for (const id of SHIPPED_EXAMPLE_IDS) {
    systems.set(id, Workspace.canonicalizeOnly(parse(readFileSync(`examples/${id}/system.mage.yaml`, "utf8"))));
  }
  return systems;
};

const systems = loadSystems();
const typeSections = buildTypeSections(systems);
const useSections = buildUseSections(systems);

// ---------------------------------------------------------------------------------------------
// (1) Sections are the registry, and visuals are the real renderer
// ---------------------------------------------------------------------------------------------

test("one Learn section per registry entry and per declared use — the registry owns the count", () => {
  assert.deepEqual(typeSections.map((s) => s.entry.id), deriveLearnEntries().map((e) => e.id));
  assert.deepEqual(useSections.map((s) => s.use.id), MODEL_TYPE_USES.map((u) => u.id));
});

test("every type's visual is a shipped subject the type's own presence predicate selected", () => {
  for (const s of typeSections) {
    assert.notEqual(s.visual, null, `${s.entry.id}: no shipped example instantiates this type — `
      + `a Learn card with no real visual would have to be an illustration, which UX-I9 forbids`);
    if (s.visual === null) continue;
    const system = systems.get(s.visual.example);
    assert.ok(system !== undefined);
    assert.ok(presentTypes(system).includes(s.entry.id),
      `${s.entry.id}: exemplar '${s.visual.example}' does not declare the type it illustrates`);

    // The REAL renderer, over the derived subject: picture and accessible twin from one call.
    const view = renderView(system, { subject: s.visual.subject });
    assert.ok(view.accessible.nodes.length > 0,
      `${s.entry.id}: the exemplar scene is empty — nothing for hover/select to reach`);
    assert.equal(view.accessible.subject.id, s.visual.subject.id);
    assert.ok(view.svg.includes(`data-subject-id="${s.visual.subject.id}"`),
      `${s.entry.id}: the SVG does not identify its subject`);
  }
});

test("the quantitative section shows the declared annotations, verbatim from the system", () => {
  const quant = typeSections.find((s) => s.entry.id === "quantitative-model");
  assert.ok(quant !== undefined && quant.visual !== null);
  const system = systems.get(quant.visual.example);
  assert.ok(system !== undefined);
  assert.ok(quant.quantities.length > 0, "the exemplar declares quantities; the section must show them");
  for (const row of quant.quantities) {
    const declared = system.quantities.get(row.id);
    assert.ok(declared !== undefined, `row '${row.id}' quotes a quantity the system does not declare`);
    assert.equal(row.target, declared.target.raw);
    assert.equal(row.dimension, declared.dimensionRaw);
  }
  assert.deepEqual(quantityRows(system).map((r) => r.id), [...system.quantities.keys()]);
});

test("'try asking' lists are the exemplar's saved questions of the type's own query kind", () => {
  for (const s of typeSections) {
    if (s.visual === null) continue;
    const system = systems.get(s.visual.example);
    assert.ok(system !== undefined);
    const kind = modelTypeForQueryKind(
      MODEL_TYPES.find((t) => t.id === s.entry.id)?.queryKind ?? "graph").queryKind;
    for (const q of s.questions) {
      const saved = system.queries.get(q.id);
      assert.ok(saved !== undefined, `${s.entry.id}: question '${q.id}' is not a saved query`);
      const raw = saved.raw as Record<string, unknown>;
      assert.equal(raw["kind"], kind, `${s.entry.id}: question '${q.id}' is of another type's kind`);
    }
    assert.deepEqual(s.questions, savedQuestions(system, kind));
  }
});

// ---------------------------------------------------------------------------------------------
// (2) The compositions are ones the kernel evaluates
// ---------------------------------------------------------------------------------------------

test("every combine-with pairing is grounded in a shipped example declaring both types", () => {
  for (const s of typeSections) {
    assert.ok(s.combinedIn.length > 0,
      `${s.entry.id} + ${s.entry.combineWith.partner}: no shipped example declares both — the `
      + `richer question would be a promise, not a capability`);
    for (const example of s.combinedIn) {
      const system = systems.get(example);
      assert.ok(system !== undefined);
      const present = presentTypes(system);
      assert.ok(present.includes(s.entry.id) && present.includes(s.entry.combineWith.partner));
    }
  }
});

/**
 * The quantity question a declared ceiling licenses, derived from the system: a model-targeted
 * quantity names the ceiling, and its metric comes from the engine's own dimension table — the
 * reverse of the lookup the evaluator performs — falling back to the configuration metric for a
 * dimension no path metric accounts. No shipped example SAVES a quantity query (the fixtures
 * decide requirements through the suite), so the composed shape is derived here, from declared
 * content only.
 */
function composedQuantityQuery(system: CanonicalSystem, where: string): unknown {
  const ceiling = [...system.quantities.values()].find((q) => q.target.kind === "model");
  assert.ok(ceiling !== undefined, `'${where}' declares no model-targeted ceiling to decide against`);
  const metric =
    REQUIREMENT_METRICS.find((m) => m in ACCOUNTED_METRICS
      && ACCOUNTED_METRICS[m as keyof typeof ACCOUNTED_METRICS] === ceiling.dimension)
    ?? "peak_memory";
  return { kind: "quantity", quantifier: "forall", quantity: { metric, within: ceiling.id } };
}

test("state machine + quantitative model: the composed question ANSWERS on the grounded example", () => {
  // The pairing's grounded example, from the derivation — not a hand-picked fixture.
  const sm = typeSections.find((s) => s.entry.id === "state-machine");
  assert.ok(sm !== undefined && sm.entry.combineWith.partner === "quantitative-model",
    "the registry pairing moved; re-derive this proof from the new partner");
  const grounded = sm.combinedIn[0];
  assert.ok(grounded !== undefined);
  const system = systems.get(grounded);
  assert.ok(system !== undefined);

  // The declared ceiling: a model-targeted quantity. Its metric comes from the engine's own
  // dimension table — the reverse of the lookup the evaluator performs — falling back to the
  // configuration metric for a dimension no path metric accounts.
  const a = runQuery(system, composedQuantityQuery(system, grounded));
  assert.notEqual(a.result.outcome, "unlicensed",
    `the composed quantity question refused: ${a.result.refusal ?? "(no prose)"} — the Learn page `
    + `must not suggest a composition the engine refuses`);
  assert.ok(a.result.magnitude !== null,
    "the composed answer carries no computed figure; the pairing teaches that the pair produces one");
});

test("structural graph + data policy: the shipped property join ANSWERS on the use's exemplar", () => {
  for (const s of useSections) {
    const system = systems.get(s.visual.example);
    assert.ok(system !== undefined);
    assert.ok(s.questions.length > 0,
      `use '${s.use.id}': no shipped saved question joins entity properties — the use card would `
      + `be describing a purpose with no executable instance`);
    for (const q of s.questions) {
      const saved: unknown = system.queries.get(q.id)?.raw;
      assert.ok(saved !== undefined);
      const a = runQuery(system, saved);
      assert.notEqual(a.result.outcome, "unlicensed",
        `use '${s.use.id}': saved question '${q.id}' refused — the page must not present it as the use at work`);
    }
    assert.deepEqual(s.questions, propertyJoinQuestions(system));
  }
});

// ---------------------------------------------------------------------------------------------
// (3) The refusal links to the entry — one object, two surfaces
// ---------------------------------------------------------------------------------------------

test("a missing-model-type refusal resolves to the Learn section the page builds", () => {
  // Ask each type's question of a shipped system that lacks the type, using another shipped
  // example's own saved query of that kind — nothing in this test authors a query shape.
  for (const t of MODEL_TYPES) {
    const lacking = SHIPPED_EXAMPLE_IDS
      .map((id) => systems.get(id))
      .find((sys): sys is CanonicalSystem => sys !== undefined && !t.presentIn(sys));
    if (lacking === undefined) continue; // every shipped example declares it; nothing to refuse
    const donor = SHIPPED_EXAMPLE_IDS
      .map((id) => systems.get(id))
      .find((sys): sys is CanonicalSystem => sys !== undefined && t.presentIn(sys));
    assert.ok(donor !== undefined, `${t.id}: no shipped example declares the type at all`);
    const savedDonor = savedQuestions(donor, t.queryKind)[0];
    const question: unknown = savedDonor !== undefined
      ? donor.queries.get(savedDonor.id)?.raw
      : composedQuantityQuery(donor, "the donor example");
    const a = runQuery(lacking, question);

    assert.equal(a.refusal?.reason, "missing-model-type",
      `${t.id}: expected the substrate-absence refusal, got ${a.refusal?.reason ?? a.result.outcome}`);
    const link = learnLinkForRefusal(a.refusal);
    assert.ok(link !== null, `${t.id}: the refusal did not resolve to a Learn link`);
    assert.equal(link.typeId, t.id);
    assert.equal(link.href, learnHrefForType(t.id));
    assert.ok(link.text.includes(t.label), "the link text names the type in the registry's words");

    const target = typeSections.find((s) => s.anchor === anchorForType(link.typeId));
    assert.ok(target !== undefined, `${t.id}: the link's anchor matches no section the page builds`);
  }
});

test("other refusals do not grow a Learn link — a typo hunt has a different remedy", () => {
  assert.equal(learnLinkForRefusal(null), null);
  assert.equal(
    learnLinkForRefusal({ reason: "unknown-vocabulary", missing: ["x"], models: [] }), null);
});

// ---------------------------------------------------------------------------------------------
// (4) The shell is capability-free
// ---------------------------------------------------------------------------------------------

test("learn.html carries the shell only: no entry anchor, no capability prose to drift", () => {
  const html = readFileSync("learn.html", "utf8");
  assert.ok(html.includes('id="learn-main"'), "the composition root must find its mount point");
  assert.ok(html.includes("dist/learn.js"), "the page must load the derivation bundle");
  for (const s of [...typeSections.map((x) => x.anchor), ...useSections.map((x) => x.anchor)]) {
    assert.ok(!html.includes(s),
      `learn.html contains '${s}' — entry content must be built from the registry, never authored in the shell`);
  }
});
