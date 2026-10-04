// The ask bar's catalogue: derived, filter-only, and honest about what it cannot answer.
//
// Wave 1c of `DESIGN-shell-261002.md` under the G2 ruling. The three claims worth a control, and
// every one of them is checked against the loaded system rather than against a list written here:
//
//   1. NO OFFERED QUESTION REFUSES. Every item in the catalogue is run through the real engine and
//      must come back with a verdict. This is the test that would have caught the fabrication the
//      ruling cites — an offered question whose answer is "the model does not license this" sends a
//      reader to a refusal that reads as a tooling failure.
//   2. THE LABEL IS THE ENGINE'S. Each item's text is compared to `interpretation()` of the query
//      the item submits, re-derived here. A label written by the UI could describe a question the
//      engine does not evaluate.
//   3. THE TYPED TEXT IS A FILTER. An English question matches nothing unless the catalogue already
//      holds it, and the no-match message names the two surfaces that DO take free text.
//
// No count, no label and no form name is pinned as a literal: the relation types come from
// `system.relationTypes`, the licensing from each type's own `pathComposition`, the shapes from
// `GRAPH_FORMS`, and the expected answers from a second pass through `runQuery`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { runQuery } from "../src/engine/index.ts";
import { interpretation } from "../src/engine/graph.ts";
import { GRAPH_COMPOSING, GRAPH_FORMS } from "../src/engine/types.ts";
import { MODEL_TYPES } from "../src/engine/model-types.ts";
import { learnHrefForType } from "../src/app/learn.ts";
import { parseGraphQuery } from "../src/engine/index.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { planAsk, resolveSelection, selectionValue } from "../src/ui/view-model.ts";
import { renderView } from "../src/render/svg.ts";
import { modelContents } from "../src/ui/shell/workspace.ts";
import {
  absentTypeFor, askCatalogue, askEvidenceReading, contextualQuestions, derivePropertyId,
  evidenceLines, filterCatalogue, filterState, labelFor, learnLinkForAbsentType, savedProperties,
  type AskItem,
} from "../src/ui/shell/askbar.ts";

const load = (id: string): CanonicalSystem =>
  canonicalize(parse(readFileSync(`examples/${id}/system.mage.yaml`, "utf8")));

/** The query an item submits, built by the same planner the surface uses. */
function queryOf(system: CanonicalSystem, item: AskItem): unknown {
  if (item.ask !== null) {
    const planned = planAsk(item.ask, item.label);
    assert.ok(planned.ok, `item "${item.label}" does not plan: ${planned.ok ? "" : planned.problem}`);
    return planned.query;
  }
  const saved = item.savedId === null ? undefined : system.queries.get(item.savedId);
  assert.ok(saved !== undefined, `saved item "${item.label}" names no query of this system`);
  return saved.raw;
}

/**
 * An entity that participates in enough relations to make the derivation say something.
 *
 * Chosen by MEASUREMENT rather than by name: the entity taking part in the most distinct relation
 * types is the one whose catalogue exercises both the licensed and the forbidden branch. A named
 * entity would be a fixture detail this file would have to maintain.
 */
function busiestEntity(system: CanonicalSystem): string {
  let best = "";
  let bestTypes = -1;
  for (const id of system.entities.keys()) {
    const types = new Set(system.relations
      .filter((r) => r.from === id || r.to === id).map((r) => r.type));
    if (types.size > bestTypes) { best = id; bestTypes = types.size; }
  }
  assert.ok(bestTypes > 0, "the fixture declares no relations, so there is nothing to derive from");
  return best;
}

test("every contextual question the catalogue offers is one the engine ANSWERS", () => {
  for (const exampleId of ["message-bus", "worker-queue"]) {
    const system = load(exampleId);
    const entity = busiestEntity(system);
    const items = contextualQuestions(system, entity);
    assert.ok(items.length > 0, `${exampleId}: nothing offered for '${entity}'`);
    for (const item of items) {
      const answer = runQuery(system, queryOf(system, item));
      assert.notEqual(answer.result.outcome, "unlicensed",
        `${exampleId}: the catalogue offers "${item.label}", which the model refuses: `
        + `${answer.result.refusal ?? "(no sentence)"}`);
    }
  }
});

test("a multi-hop shape is offered where composition is LICENSED and withheld where it is not", () => {
  const system = load("message-bus");
  const entity = busiestEntity(system);
  const offered = contextualQuestions(system, entity);

  // Both branches must be live in the fixture, or this test proves nothing. Derived from the
  // relation types the entity participates in and each type's own declaration.
  const participates = new Set(system.relations
    .filter((r) => r.from === entity || r.to === entity).map((r) => r.type));
  const byLicence = (want: "allowed" | "forbidden"): readonly string[] =>
    [...participates].filter((t) => system.relationTypes.get(t)?.pathComposition === want);
  const allowed = byLicence("allowed");
  const forbidden = byLicence("forbidden");
  assert.ok(allowed.length > 0 && forbidden.length > 0,
    `'${entity}' does not participate in both a composing and a non-composing relation type `
    + `(allowed: ${allowed.join(",")}; forbidden: ${forbidden.join(",")})`);

  const composingFormsOffered = (type: string): readonly string[] =>
    offered.filter((i) => i.ask?.relation === type)
      .map((i) => i.ask?.form ?? "")
      .filter((f) => GRAPH_COMPOSING.has(f as never));

  for (const type of forbidden) {
    assert.deepEqual(composingFormsOffered(type), [],
      `a multi-hop question over '${type}' is offered, but that type declares path composition `
      + "forbidden — the engine answers UNLICENSED, not false (V7)");
  }
  assert.ok(allowed.some((t) => composingFormsOffered(t).length > 0),
    "no multi-hop question is offered over any composing relation type, so the gate above could "
    + "be passing by offering nothing at all");
});

test("each question's text is the ENGINE's reading of the query it submits", () => {
  const system = load("message-bus");
  for (const item of contextualQuestions(system, busiestEntity(system))) {
    const graph = (queryOf(system, item) as Record<string, unknown>)["graph"];
    const parsed = parseGraphQuery(graph);
    assert.ok(parsed.ok, `item "${item.label}" does not parse back into a graph query`);
    assert.equal(item.label, interpretation(parsed.value),
      "the offered text is not what the engine says it evaluates");
  }
});

test("every shape with a contextual slot is a shape the engine declares", () => {
  const system = load("message-bus");
  const forms = GRAPH_FORMS as readonly string[];
  const offeredForms = new Set(contextualQuestions(system, busiestEntity(system))
    .map((i) => i.ask?.form ?? ""));
  assert.ok(offeredForms.size > 0, "no shape at all is offered");
  for (const form of offeredForms) {
    assert.ok(forms.includes(form), `the catalogue offers form '${form}', which the engine has not`);
  }
});

test("nothing is offered for a selection the system does not declare", () => {
  const system = load("message-bus");
  assert.deepEqual(contextualQuestions(system, "no-such-entity"), []);
  // And the catalogue falls back to the saved questions rather than to nothing.
  const catalogue = askCatalogue(system, resolveSelection(system, "no-such-entity"));
  assert.equal(catalogue.length, savedProperties(system).length);
  assert.equal(savedProperties(system).length, system.queries.size);
});

test("typed text FILTERS; an English question it does not hold matches nothing", () => {
  const system = load("message-bus");
  const catalogue = askCatalogue(system, resolveSelection(system, busiestEntity(system)));
  assert.ok(catalogue.length > 1, "the fixture offers too little to filter");

  // A question in the author's own words, from the spec's own sketch. The catalogue holds no such
  // string, so a filter returns nothing — and this is the pin on G2: there is no parser that would
  // turn it into a formal query.
  const typed = "Can restricted data reach Analytics?";
  assert.deepEqual(filterCatalogue(catalogue, typed), []);
  const message = filterState(0, catalogue.length, typed);
  assert.match(message, /window\.mage\.ask/, "the no-match message does not name the agent route");
  assert.match(message, /Advanced/, "the no-match message does not name the Advanced route");

  // A term taken FROM a label matches that label, so the filter is not vacuous.
  const first = catalogue[0];
  assert.ok(first !== undefined);
  const term = first.label.split(/\s+/).find((w) => w.length > 4) ?? first.label;
  const matched = filterCatalogue(catalogue, term);
  assert.ok(matched.some((i) => i.key === first.key),
    `filtering by "${term}" lost the label it came from`);
  assert.match(filterState(matched.length, catalogue.length, term), /Choose one/);
});

test("a question whose model type this system lacks routes to that type's Learn entry", () => {
  const system = load("message-bus");
  // Which types this system declares is the registry's own predicate, not a claim written here.
  const absent = MODEL_TYPES.filter((t) => !t.presentIn(system));
  assert.ok(absent.length > 0,
    "the fixture declares every model type, so the NOT ANSWERABLE route cannot be exercised");
  for (const t of absent) {
    const found = absentTypeFor(system, { kind: t.queryKind, quantifier: "exists" });
    assert.equal(found?.id, t.id, `a '${t.queryKind}' question does not name the absent ${t.label}`);
    const link = learnLinkForAbsentType(t);
    assert.equal(link?.href, learnHrefForType(t.id));
    assert.match(link?.text ?? "", new RegExp(t.label, "i"));
  }
  for (const t of MODEL_TYPES.filter((x) => x.presentIn(system))) {
    assert.equal(absentTypeFor(system, { kind: t.queryKind }), null,
      `a '${t.queryKind}' question is reported unanswerable over a system that declares ${t.label}`);
  }
});

test("the evidence reading keeps a refusal, a witness and a missing question apart", () => {
  // One system per arm, each chosen by what its saved questions DO, measured here.
  const system = load("worker-queue");
  const saved = savedProperties(system);
  const arms = new Map<string, AskItem>();
  for (const item of saved) {
    const reading = askEvidenceReading(system, (raw) => runQuery(system, raw).result, item,
      queryOf(system, item));
    const arm = reading.found ? "found" : reading.cause;
    if (!arms.has(arm)) arms.set(arm, item);
    // Whatever the arm, the lines say something and never read as an empty panel.
    const lines = evidenceLines(reading);
    assert.ok(lines.length > 0 && lines.every((l) => l.trim() !== ""),
      `the reading for "${item.label}" renders an empty panel`);
  }
  assert.ok(arms.has("found"), "no saved question in this fixture yields a witness");
  assert.ok(arms.has("unlicensed-by-model"),
    "no saved question in this fixture is refused, so the refusal arm is untested here");

  // The third arm, which the ask bar reaches for real: an agent retracts the question between the
  // paint that offered it and the click that asks it.
  const ghost: AskItem = { key: "saved:ghost", label: "ghost", source: "saved", savedId: "ghost", ask: null };
  const reading = askEvidenceReading(system, () => {
    throw new Error("the query service must not run for a question that is not saved");
  }, ghost, null);
  assert.equal(reading.found, false);
  assert.equal(reading.cause, "no-such-question");
  assert.deepEqual(reading.savedQuestions, [...system.queries.keys()]);
});

test("a tracked claim gets an id derived from the claim, and never one already taken", () => {
  const system = load("message-bus");
  const taken = new Set(system.queries.keys());
  const id = derivePropertyId("Restricted data cannot reach Analytics", taken);
  assert.equal(id, "restricted-data-cannot-reach-analytics");

  // Collision: the derived id of an existing claim must not address that claim.
  const first = [...system.queries][0];
  assert.ok(first !== undefined);
  const [existingId] = first;
  const collided = derivePropertyId(existingId, taken);
  assert.notEqual(collided, existingId);
  assert.ok(collided.startsWith(existingId), `'${collided}' no longer says what the claim is`);

  // A claim with nothing sluggable still yields an addressable id rather than an empty one.
  assert.notEqual(derivePropertyId("???", taken), "");
});

test("a saved question is offered but never offered for tracking — it is tracked already", () => {
  const system = load("message-bus");
  for (const item of savedProperties(system)) {
    assert.equal(item.ask, null,
      `saved question '${item.savedId}' carries a re-derived ask request, which would be a second `
      + "spelling of a question the model file already states");
    assert.ok(item.savedId !== null);
  }
  for (const item of contextualQuestions(system, busiestEntity(system))) {
    assert.equal(item.savedId, null);
    assert.ok(item.ask !== null, "a derived question with no ask request cannot be tracked");
    assert.equal(labelFor(item.ask), item.label);
  }
});

// --------------------------------------------------------------------------------------------
// The join to the selection surfaces — the defect wave 1d filed and §10 predicted
// --------------------------------------------------------------------------------------------

test("a TREE selection reaches the contextual catalogue, through the row's own encoding", () => {
  // The oracle is the contents tree itself. `modelContents` is the reading the tree paints, and
  // `select` is the very value its click handler sends — so this test asks the question a person
  // asks by clicking, rather than a question about a string that resembles what the tree writes.
  //
  // THE DEFECT: `askCatalogue` resolved its entity with
  // `selection.find((id) => system.entities.has(id))`, which answers only for the BARE spelling,
  // while the tree writes `entity:<id>`. So selecting a node in the tree left this catalogue at
  // the saved questions alone — no "Can anything reach Analytics?", and no Track box either,
  // because that opens only for an untracked answer. Two encodings in one field, three readers,
  // three answers. Pinned both ways below: the tree's spelling and the agent's bare one must
  // produce the SAME catalogue.
  const system = load("message-bus");
  const model = [...system.models.values()][0];
  assert.ok(model !== undefined, "the fixture declares no model to read contents of");
  const { accessible } = renderView(system, { subject: { kind: "model", id: model.id } });
  const contents = modelContents(accessible, system);

  const entityRows = contents.nodes.filter((r) => r.select?.kind === "entity");
  assert.ok(entityRows.length > 0, "the tree offers no entity row, so this join cannot be driven");

  let asked = 0;
  for (const row of entityRows) {
    const ref = row.select;
    if (ref === null || ref.kind !== "entity") continue;
    const viaTree = askCatalogue(system, resolveSelection(system, selectionValue(ref)));
    // The agent route, which worked all along, is the control: it is what the author's correction 5
    // describes ("Analytics selected → Ask: Can anything reach Analytics?") and what the walked
    // path in the a11y drive had to go the long way round to reach.
    const viaAgent = askCatalogue(system, resolveSelection(system, ref.id));
    assert.deepEqual(viaTree.map((i) => i.label), viaAgent.map((i) => i.label),
      `the tree's '${selectionValue(ref)}' and the agent's '${ref.id}' offer different catalogues`);

    const contextual = contextualQuestions(system, ref.id);
    if (contextual.length === 0) continue;
    asked += 1;
    assert.equal(viaTree.length, savedProperties(system).length + contextual.length,
      `selecting ${ref.id} in the tree offers no contextual question`);
    // And the item that makes `askbar.track` reachable: a contextual question carries an `ask`,
    // which is what the Track box opens behind. A catalogue of saved questions alone carries none.
    assert.ok(viaTree.some((i) => i.ask !== null),
      "a tree selection offers nothing askable, so the Track box can never open from one");
  }
  assert.ok(asked > 0,
    "no entity in the tree has contextual questions, so this test proved nothing — pick a fixture "
    + "whose model declares relations over its entities");
});

test("every tree row's encoding resolves to the kind the row is, through the sole decoder", () => {
  // The companion claim: the ask bar is one reader of a selection and the inspector, the action bar
  // and the palette are others. They all branch on `Selection.kind` now, so a row whose encoding
  // resolved to the wrong kind would mis-serve all four at once.
  const system = load("message-bus");
  for (const model of system.models.values()) {
    const { accessible } = renderView(system, { subject: { kind: "model", id: model.id } });
    const contents = modelContents(accessible, system);
    for (const row of [contents.subject, ...contents.nodes, ...contents.edges]) {
      if (row.select === null) continue;
      assert.equal(resolveSelection(system, selectionValue(row.select)).kind, row.select.kind,
        `the row '${row.label}' encodes ${selectionValue(row.select)}, which does not resolve as a `
        + `${row.select.kind} — so the ask bar, the inspector and the action bar all mis-read it`);
    }
  }
});
