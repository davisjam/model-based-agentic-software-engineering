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
  absentSubstrateProse, derivedPrimitives, MODEL_TYPES, modelTypeForQueryKind,
} from "../src/engine/model-types.ts";
import { runQuery } from "../src/engine/index.ts";
import {
  BEHAVIOR_FORMS, GRAPH_COMPOSING, GRAPH_FORMS, ORDER_OPS, type Query,
} from "../src/engine/types.ts";
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

test("question forms are the engine's own arrays, by reference — no copy to drift (MQ-I3)", () => {
  // The source each kind's forms must BE (not merely equal): the engine vocabulary the evaluator
  // of that kind actually checks against.
  const source: Record<Query["kind"], readonly string[]> = {
    graph: GRAPH_FORMS,
    behavior: BEHAVIOR_FORMS,
    quantity: REQUIREMENT_METRICS,
  };
  for (const t of MODEL_TYPES) {
    assert.equal(t.query.forms, source[t.queryKind],
      `${t.id}: query.forms is a copy of its source, not a reference to it`);
  }
});

test("the composing set is the engine's own, by reference, and null only where none exists (MQ-I3)", () => {
  // `GRAPH_COMPOSING` is the one such set the engine owns. The other two types declare null, and
  // the registry's comment says why — not "nothing composes", but "no shared set to point at".
  const source: Record<Query["kind"], ReadonlySet<string> | null> = {
    graph: GRAPH_COMPOSING,
    behavior: null,
    quantity: null,
  };
  for (const t of MODEL_TYPES) {
    assert.equal(t.query.composing, source[t.queryKind],
      `${t.id}: query.composing must BE the engine's set, or null where the engine owns none`);
  }
});

test("order comparisons reference the engine's own operator set, never a restatement", () => {
  for (const t of MODEL_TYPES) {
    const order = t.query.predicates.order;
    if (order === null || order.by !== "operator") continue;
    assert.equal(order.ops, ORDER_OPS,
      `${t.id}: predicates.order.ops is a copy of ORDER_OPS, not a reference to it`);
  }
  // Not vacuous: at least one type chooses its comparison from the operator set.
  assert.ok(MODEL_TYPES.some((t) => t.query.predicates.order?.by === "operator"));
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

/**
 * Every citation reachable from a registry entry, found by WALKING the entry rather than by
 * enumerating the fields that hold one.
 *
 * The enumeration this replaces listed `schema` and `enabledBy`, which was total when it was
 * written and stopped being total the moment the query semantics landed — citations now also sit on
 * `query.licensedBy`, on every subject's `declaredBy`, on each `declared` gate, on the predicate
 * scoping facts, on `interpretedBy` and on every join. An enumerating test would have passed while
 * covering a fraction of them, which is the shape of an undeclared gap. The walk covers a field
 * nobody has written yet.
 */
const collectAuthorities = (
  value: unknown, where: string, out: { owner: string; file: string; symbol: string }[],
): void => {
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectAuthorities(v, `${where}[${i}]`, out));
    return;
  }
  if (typeof value !== "object" || value === null || value instanceof Set || value instanceof Map) return;
  const rec = value as Record<string, unknown>;
  if (typeof rec["file"] === "string" && typeof rec["symbol"] === "string"
    && typeof rec["role"] === "string") {
    out.push({ owner: where, file: rec["file"], symbol: rec["symbol"] });
    return;
  }
  for (const [k, v] of Object.entries(rec)) collectAuthorities(v, `${where}.${k}`, out);
};

test("every schema authority anywhere in the registry resolves to a real file and symbol", () => {
  const cited: { owner: string; file: string; symbol: string }[] = [];
  for (const t of MODEL_TYPES) collectAuthorities(t, t.id, cited);
  for (const u of MODEL_TYPE_USES) collectAuthorities(u, u.id, cited);

  assert.ok(cited.length > 0, "no citations at all would make this test vacuous");
  // The walk must reach deeper than the old enumeration did, or it is the enumeration in disguise.
  assert.ok(cited.some((c) => c.owner.includes("query.")),
    "the walk found no citation inside query semantics — it is not reaching the new fields");

  for (const c of cited) {
    assert.ok(existsSync(c.file), `${c.owner}: cited file '${c.file}' does not exist`);
    assert.ok(readFileSync(c.file, "utf8").includes(c.symbol),
      `${c.owner}: '${c.file}' does not contain '${c.symbol}' — the authority moved or was renamed`);
  }
});

// ---------------------------------------------------------------------------------------------
// Query semantics — primitives and citations, never a catalogue of permitted queries
// ---------------------------------------------------------------------------------------------

test("the primitive classification is TOTAL over the type's forms, and names nothing else", () => {
  // Totality is the control. A form added to an engine vocabulary with no classification here
  // would otherwise ship un-gated and un-described, and from a registry entry alone a deliberate
  // exclusion and a forgotten one look the same.
  for (const t of MODEL_TYPES) {
    const classified = t.query.primitives.map((p) => p.form);
    assert.equal(new Set(classified).size, classified.length, `${t.id}: a form is classified twice`);
    assert.deepEqual([...classified].sort(), [...t.query.forms].sort(),
      `${t.id}: the classification and the form vocabulary disagree`);
  }
});

test("a per-instance gate CITES the declaration it reads, and the citation is the type's own", () => {
  // The registry says what KIND of gate a primitive has and where its facts live; the IR decides
  // (V32). Identity — not equality — between a gate's citation and a `licensedBy` entry is what
  // makes that one object rather than two literals agreeing by luck.
  let declared = 0;
  for (const t of MODEL_TYPES) {
    for (const p of t.query.primitives) {
      if (p.gate.kind === "by-construction") {
        assert.ok(p.gate.why.length > 30,
          `${t.id}/${p.form}: a by-construction gate owes a real reason, not a placeholder`);
        continue;
      }
      declared += 1;
      assert.ok(t.query.licensedBy.includes(p.gate.by),
        `${t.id}/${p.form}: the gate's citation is not one of the type's licensedBy entries, by identity`);
    }
  }
  assert.ok(declared > 0, "no per-instance gate at all would make this test vacuous");
});

test("a form that only reads a declaration is never gated per instance", () => {
  for (const t of MODEL_TYPES) {
    for (const p of t.query.primitives) {
      if (p.basis !== "declared") continue;
      assert.equal(p.gate.kind, "by-construction",
        `${t.id}/${p.form}: a declaration-reading form claims a per-instance license it cannot need`);
    }
  }
});

test("where the engine owns a composing set, it is exactly the per-instance-gated forms", () => {
  // The two facts come from different places — `GRAPH_COMPOSING` from the engine, the gates from
  // this registry — so their agreement is a real cross-check rather than a tautology. A form added
  // to the engine's set without a gate here, or gated here without entering the set, fails.
  let checked = 0;
  for (const t of MODEL_TYPES) {
    const composing = t.query.composing;
    if (composing === null) continue;
    checked += 1;
    const gated = t.query.primitives.filter((p) => p.gate.kind === "declared").map((p) => p.form);
    assert.deepEqual([...gated].sort(), [...composing].sort(),
      `${t.id}: the engine's composing set and the registry's per-instance gates disagree`);
  }
  assert.ok(checked > 0, "no type declared a composing set — the cross-check ran on nothing");
});

test("the derived primitives are computed, and they are the non-declaration-reading forms", () => {
  for (const t of MODEL_TYPES) {
    const derived = derivedPrimitives(t.query);
    assert.deepEqual(derived.map((p) => p.form),
      t.query.primitives.filter((p) => p.basis !== "declared").map((p) => p.form),
      `${t.id}: derivedPrimitives disagrees with the classification it reads`);
    assert.ok(derived.length > 0, `${t.id}: a model type that derives nothing answers no question`);
  }
});

test("every query subject names a distinct noun, and a join's partner is a registered type", () => {
  const ids = new Set(MODEL_TYPES.map((t) => t.id));
  for (const t of MODEL_TYPES) {
    const nouns = t.query.subjects.map((s) => s.noun);
    assert.ok(nouns.length > 0, `${t.id}: a type whose questions name no noun is unaskable`);
    assert.equal(new Set(nouns).size, nouns.length, `${t.id}: two subjects claim one noun`);
    for (const j of t.query.joins) {
      if (j.with !== null) {
        assert.ok(ids.has(j.with), `${t.id}/${j.name}: joins with unregistered '${j.with}'`);
        assert.notEqual(j.with, t.id, `${t.id}/${j.name}: joins with itself across types`);
      }
      assert.ok(j.meaning.length > 30, `${t.id}/${j.name}: the join's meaning is a placeholder`);
    }
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
    assert.equal(e.forms, t.query.forms, `${e.id}: the card must hold the registry's own array`);
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
