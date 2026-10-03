// The model-type registry: its joins hold, its citations resolve, and the kernel consults it.
//
// Three claims, in rising order of consequence:
//
//   (1) The registry's own joins are closed — one type per query kind, matching the published
//       query schema's `kind` enum; composition partners registered; property families held BY
//       REFERENCE to the engine's vocabularies, so there is no copy to drift.
//   (2) The schema citations are real — every cited file exists and contains the cited symbol.
//       A pointer that resolves to nothing is the brochure failure one layer down.
//   (3) The kernel reads it — a question asked of a substrate the system does not declare refuses
//       by naming the absent model TYPE, with the registry's own prose. Before this rung existed,
//       a latency measurement over a system with no quantities answered `holds` at 0 ms: a
//       fabricated figure that looked measured. That defect staying fixed is this file's job.
//
// Every expectation is a lookup against the registry or the sources it cites, never a snapshot
// copy (the derived-values control polices this file like any other).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import {
  absentSubstrateProse, MODEL_TYPES, modelTypeForQueryKind,
} from "../src/engine/model-types.ts";
import { runQuery } from "../src/engine/index.ts";
import { BEHAVIOR_FORMS, GRAPH_FORMS, type Query } from "../src/engine/types.ts";
import { REQUIREMENT_METRICS } from "../src/quant/requirement.ts";
import { deriveLearnEntries, MODEL_TYPE_USES, presentTypes } from "../src/app/learn.ts";

// ---------------------------------------------------------------------------------------------
// (1) The registry's joins
// ---------------------------------------------------------------------------------------------

test("one model type per query kind, and the published schema's kind enum agrees", () => {
  const kinds = MODEL_TYPES.map((t) => t.queryKind);
  assert.equal(new Set(kinds).size, kinds.length, "two model types claim one query kind");

  // The wire format's own enum, read from the published schema rather than restated here. A fourth
  // kind cannot land in the schema without a registry entry, nor the reverse.
  const schema = JSON.parse(readFileSync("mage-query.schema.json", "utf8")) as {
    $defs: { query: { properties: { kind: { enum: string[] } } } };
  };
  const published = schema.$defs.query.properties.kind.enum;
  assert.deepEqual([...kinds].sort(), [...published].sort(),
    "the registry and the query schema disagree about which kinds exist");

  for (const kind of published) {
    assert.equal(modelTypeForQueryKind(kind as Query["kind"]).queryKind, kind);
  }
});

test("property families are the engine's own arrays, by reference — no copy to drift", () => {
  // The source each kind's families must BE (not merely equal): the engine vocabulary the
  // evaluator of that kind actually checks against.
  const source: Record<Query["kind"], readonly string[]> = {
    graph: GRAPH_FORMS,
    behavior: BEHAVIOR_FORMS,
    quantity: REQUIREMENT_METRICS,
  };
  for (const t of MODEL_TYPES) {
    assert.equal(t.propertyFamilies, source[t.queryKind],
      `${t.id}: propertyFamilies is a copy of its source, not a reference to it`);
  }
});

test("every composition partner is a registered type, and not the type itself", () => {
  const ids = new Set(MODEL_TYPES.map((t) => t.id));
  for (const t of MODEL_TYPES) {
    assert.ok(ids.has(t.combineWith.partner), `${t.id} composes with unregistered '${t.combineWith.partner}'`);
    assert.notEqual(t.combineWith.partner, t.id, `${t.id} composes with itself`);
    assert.ok(t.combineWith.richerQuestion.length > 20,
      `${t.id}: the richer question must be a real question, not a placeholder`);
  }
});

// ---------------------------------------------------------------------------------------------
// (2) The citations resolve
// ---------------------------------------------------------------------------------------------

test("every schema authority names a file that exists and contains the cited symbol", () => {
  const cited = [
    ...MODEL_TYPES.flatMap((t) => t.schema.map((s) => ({ owner: t.id, ...s }))),
    ...MODEL_TYPE_USES.flatMap((u) => u.enabledBy.map((s) => ({ owner: u.id, ...s }))),
  ];
  assert.ok(cited.length > 0, "no citations at all would make this test vacuous");
  for (const c of cited) {
    assert.ok(existsSync(c.file), `${c.owner}: cited file '${c.file}' does not exist`);
    assert.ok(readFileSync(c.file, "utf8").includes(c.symbol),
      `${c.owner}: '${c.file}' does not contain '${c.symbol}' — the authority moved or was renamed`);
  }
});

// ---------------------------------------------------------------------------------------------
// (3) The kernel consults it — the substrate-absence rung
// ---------------------------------------------------------------------------------------------

const modelsOnly = () => canonicalize({
  mage: 1, system: { id: "t" },
  "relation-types": { calls: { description: "d" } },
  entities: { a: {}, b: {} },
  models: { m: { relations: [{ from: "a", to: "b", type: "calls" }] } },
});

const machinesOnly = () => canonicalize({
  mage: 1, system: { id: "t" },
  machines: {
    worker: { initial: "idle", states: { idle: null, done: null }, transitions: [{ from: "idle", to: "done" }] },
  },
});

const queryOfKind: Record<Query["kind"], unknown> = {
  graph: { kind: "graph", quantifier: "exists", graph: { form: "direct", relation: "calls" } },
  behavior: {
    kind: "behavior", quantifier: "exists",
    behavior: { form: "reach", target: { "worker.state": "done" } },
  },
  quantity: { kind: "quantity", quantifier: "exists", quantity: { metric: "latency" } },
};

test("a question asked of an absent substrate names the missing model type, not a misspelling", () => {
  // Each type's query, asked of a system that declares every OTHER substrate shape this fixture
  // set has — so what is absent is exactly the type under test.
  const lacking: Record<Query["kind"], () => ReturnType<typeof canonicalize>> = {
    graph: machinesOnly,
    behavior: modelsOnly,
    quantity: machinesOnly,
  };
  for (const t of MODEL_TYPES) {
    const system = lacking[t.queryKind]();
    assert.equal(t.presentIn(system), false, `${t.id}: fixture unexpectedly declares the substrate`);
    const a = runQuery(system, queryOfKind[t.queryKind]);
    assert.equal(a.result.outcome, "unlicensed", `${t.id}: expected a refusal, got ${a.result.outcome}`);
    assert.equal(a.refusal?.reason, "missing-model-type", `${t.id}: wrong refusal cause`);
    assert.equal(a.result.refusal, absentSubstrateProse(t),
      `${t.id}: the refusal must be the registry's own sentence, so Learn and the refusal agree`);
    assert.ok(a.result.refusal?.includes(t.label), `${t.id}: the refusal does not name the type`);
    assert.deepEqual(a.refusal?.missing, [t.label]);
  }
});

test("the fabricated-zero defect stays dead: no quantities means no 0 ms that looks measured", () => {
  // Before the rung, this exact call answered holds with magnitude 0 ms over a system declaring
  // no quantity at all — an execution cost asserted by a model that represents no costs.
  const a = runQuery(machinesOnly(), queryOfKind.quantity);
  assert.equal(a.result.outcome, "unlicensed");
  assert.equal(a.result.magnitude, null, "a refusal must carry no figure");
});

test("a present substrate passes the rung: the same questions reach their evaluators", () => {
  for (const t of MODEL_TYPES) {
    // A system with the substrate present. Quantities ride on the machine fixture.
    const system = t.queryKind === "graph" ? modelsOnly() : canonicalize({
      mage: 1, system: { id: "t" },
      entities: { a: {} },
      machines: {
        worker: { initial: "idle", states: { idle: null, done: null }, transitions: [{ from: "idle", to: "done" }] },
      },
      quantities: { w: { target: "entity:a", dimension: "duration", value: "5 ms" } },
      accounting: { latency: { basis: "entities" } },
    });
    assert.equal(t.presentIn(system), true, `${t.id}: fixture must declare the substrate`);
    const a = runQuery(system, queryOfKind[t.queryKind]);
    assert.notEqual(a.refusal?.reason, "missing-model-type",
      `${t.id}: the rung fired although the substrate is declared`);
  }
});

// ---------------------------------------------------------------------------------------------
// Learn derivation — the gallery's two axes
// ---------------------------------------------------------------------------------------------

test("Learn entries are the registry, projected: one card per type, fields from the same object", () => {
  const entries = deriveLearnEntries();
  assert.deepEqual(entries.map((e) => e.id), MODEL_TYPES.map((t) => t.id));
  for (const [i, e] of entries.entries()) {
    const t = MODEL_TYPES[i];
    assert.ok(t !== undefined);
    assert.equal(e.question, t.question);
    assert.equal(e.propertyFamilies, t.propertyFamilies, `${e.id}: the card must hold the same array`);
    assert.equal(e.combineWith.partnerLabel, modelTypeForQueryKind(
      MODEL_TYPES.find((m) => m.id === e.combineWith.partner)?.queryKind ?? t.queryKind).label);
  }
});

test("every declared USE is a registered type underneath, with a real shipped exemplar", () => {
  const ids = new Set(MODEL_TYPES.map((t) => t.id));
  for (const u of MODEL_TYPE_USES) {
    assert.ok(ids.has(u.ofType), `${u.id}: use of unregistered type '${u.ofType}'`);
    const [example, model] = u.exemplar.split("/");
    assert.ok(example !== undefined && model !== undefined, `${u.id}: exemplar is not <example>/<model>`);
    const system = canonicalize(
      parse(readFileSync(`examples/${example}/system.mage.yaml`, "utf8")));
    assert.ok(system.models.has(model),
      `${u.id}: exemplar model '${model}' is not declared by examples/${example}`);
  }
});

test("presentTypes reads the same gate the dispatcher reads", () => {
  const system = modelsOnly();
  const present = presentTypes(system);
  for (const t of MODEL_TYPES) {
    assert.equal(present.includes(t.id), t.presentIn(system),
      `${t.id}: presentTypes disagrees with the kernel's own predicate`);
  }
});
