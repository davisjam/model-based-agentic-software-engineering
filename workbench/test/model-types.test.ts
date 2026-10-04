// The model-type registry: its own relations hold, its citations resolve, and the kernel consults
// it.
//
// Three claims, in rising order of consequence:
//
//   (1) The registry's own relations are closed — one type per query kind, matching the published
//       query schema's `kind` enum; pairing partners registered; property families held BY
//       REFERENCE to the engine's vocabularies, so there is no copy to drift. Since 261004 that
//       includes the two CROSS-MODEL registries, `BINDINGS` and `COMPOSITIONS`, which replaced the
//       overloaded per-type `joins` array: bindings connect denotations, compositions operate on
//       them, and nothing here may read `combineWith` as either (spec §4.1).
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
  absentSubstrateProse, BINDINGS, bindingsOf, CLAUSE_OWED, COMPOSITIONS, compositionsOf,
  derivedPrimitives, MODEL_TYPES, modelTypeForQueryKind,
  type SemanticBasis,
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

// `combineWith` is NAVIGATION, not a semantic relationship (spec §4.1), so this test checks a
// Learn-page pointer rather than a registered composition — which is why it no longer says
// "composition" and why the semantic relationships are checked in their own section below.
test("every pairing partner is a registered type, and not the type itself", () => {
  const ids = new Set(MODEL_TYPES.map((t) => t.id));
  for (const t of MODEL_TYPES) {
    assert.ok(ids.has(t.combineWith.partner), `${t.id} pairs with unregistered '${t.combineWith.partner}'`);
    assert.notEqual(t.combineWith.partner, t.id, `${t.id} pairs with itself`);
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
 * scoping facts, on `interpretedBy`, and on every binding's and composition's `declaredBy`,
 * `licensing.by` and `result`. An enumerating test would have passed while covering a fraction of
 * them, which is the shape of an undeclared gap. The walk covers a field nobody has written yet.
 *
 * The walk is generic; the ROOTS are not, and they are the one thing a reader must keep total. When
 * the cross-model relationships left `ModelType` for their own registries (261004), every citation
 * they carry left this walk's reach in the same edit — a silent coverage loss, not a failure. So
 * `BINDINGS` and `COMPOSITIONS` are roots below, and `the walk reaches every registry root` asserts
 * each root contributes.
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

/** Every citation in the registry, by root, so a lost root is a visible zero rather than silence. */
const citationsByRoot = (): ReadonlyMap<string, readonly { owner: string; file: string; symbol: string }[]> => {
  const roots = new Map<string, { owner: string; file: string; symbol: string }[]>([
    ["MODEL_TYPES", []], ["MODEL_TYPE_USES", []], ["BINDINGS", []], ["COMPOSITIONS", []],
  ]);
  for (const t of MODEL_TYPES) collectAuthorities(t, t.id, roots.get("MODEL_TYPES")!);
  for (const u of MODEL_TYPE_USES) collectAuthorities(u, u.id, roots.get("MODEL_TYPE_USES")!);
  for (const b of BINDINGS) collectAuthorities(b, `binding/${b.name}`, roots.get("BINDINGS")!);
  for (const c of COMPOSITIONS) collectAuthorities(c, `composition/${c.name}`, roots.get("COMPOSITIONS")!);
  return roots;
};

test("every schema authority anywhere in the registry resolves to a real file and symbol", () => {
  const cited = [...citationsByRoot().values()].flat();

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

test("the walk reaches every registry root — a root contributing nothing is coverage lost", () => {
  // The generic walk cannot tell a root it was never handed from a root with no citations, and the
  // 261004 split is exactly when that distinction started to matter: the cross-model citations moved
  // out of `MODEL_TYPES` and would have fallen out of the check above with nothing going red.
  for (const [root, cited] of citationsByRoot()) {
    assert.ok(cited.length > 0,
      `the citation walk found nothing under '${root}'. Either the root is empty — which is its own `
      + `finding — or it was dropped from the walk and its citations are no longer resolved.`);
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

// ---------------------------------------------------------------------------------------------
// Semantic basis — rung 2 only, and the file says so
//
// Rung 1 (PRESENCE) is the compiler: `semanticBasis` is required on `ModelType`, on
// `QueryPrimitive`, and since 261004 on `BindingSemantics` and `CompositionSemantics` too — so a new
// model type, question form, binding or composition cannot land unattributed and no test is needed
// to say it. Rung 2 is below — the content is not a placeholder. Rung 3, that a borrowed
// row's correspondence to the standard is actually RIGHT, is `asserted` and is held by nothing
// here: the Workbench takes no runtime dependency on the SysML v2 reference implementation, so
// nothing in CI can re-derive the standard's half of the claim. These tests must not be read as a
// conformance gate, and they are deliberately not written as one.
// ---------------------------------------------------------------------------------------------

/** Every basis in the registry, with the construct that carries it, for a per-row message. */
const everyBasis = (): readonly { readonly owner: string; readonly basis: SemanticBasis }[] => [
  ...MODEL_TYPES.flatMap((t) => [
    { owner: `${t.id} (substrate)`, basis: t.semanticBasis },
    ...t.query.primitives.map((p) => ({ owner: `${t.id}/${p.form}`, basis: p.semanticBasis })),
  ]),
  ...BINDINGS.map((b) => ({ owner: `binding/${b.name}`, basis: b.semanticBasis })),
  ...COMPOSITIONS.map((c) => ({ owner: `composition/${c.name}`, basis: c.semanticBasis })),
];

test("no semantic basis is a placeholder — the content owes a real claim (rung 2)", () => {
  // Omission is rung 1's job and the compiler already has it. The realistic failure is decay into
  // `concept: "SysML"`, which is why these are content floors rather than presence checks. The
  // floors mirror the ones the `by-construction` gates and the join meanings already carry.
  const seen = new Set<SemanticBasis["kind"]>();
  for (const { owner, basis } of everyBasis()) {
    seen.add(basis.kind);
    switch (basis.kind) {
      case "borrowed":
        assert.ok(basis.concept.length > 20,
          `${owner}: the borrowed concept is too short to name anything — 'SysML' is not a concept`);
        assert.ok(basis.clause.length > 0, `${owner}: a borrowed row owes a clause or the owed sentinel`);
        break;
      case "extension":
        assert.ok(basis.why.length > 30,
          `${owner}: an extension owes a real reason it is ours, not a placeholder`);
        break;
      case "extension-grounded":
        assert.ok(basis.why.length > 30,
          `${owner}: an externally grounded extension owes a real account of the grounding`);
        assert.ok(basis.foundation.role.length > 20,
          `${owner}: the foundation citation's role says nothing about what it grounds`);
        break;
    }
  }
  // A union arm no row uses is a shape nothing holds. All three of §35.4's classes ship.
  assert.deepEqual([...seen].sort(), ["borrowed", "extension", "extension-grounded"],
    "a semantic-basis class is declared and unused, or one in use is missing");
});

test("a clause is owed exactly while no fixture names it, and a fixture that is named exists", () => {
  // §35.4: the clause cell is filled FROM the fixture rather than the reverse, so the two move
  // together. That biconditional is what makes the owed sentinel a commitment instead of an escape
  // — and it is what refuses `clause: "TODO"`, which a bare non-empty check would accept.
  let borrowed = 0;
  for (const { owner, basis } of everyBasis()) {
    if (basis.kind !== "borrowed") continue;
    borrowed += 1;
    if (basis.fixture === null) {
      assert.equal(basis.clause, CLAUSE_OWED,
        `${owner}: no fixture names this correspondence, so the clause must be the owed sentinel ` +
        `rather than '${basis.clause}' — a clause written from memory reads as checked`);
      continue;
    }
    assert.notEqual(basis.clause, CLAUSE_OWED,
      `${owner}: a fixture is named and the clause is still owed; the fixture's claim.md supplies it`);
    assert.match(basis.clause, /[0-9]/,
      `${owner}: '${basis.clause}' cites no clause number`);
    assert.ok(existsSync(basis.fixture),
      `${owner}: the conformance fixture directory '${basis.fixture}' does not exist`);
  }
  assert.ok(borrowed > 0, "nothing is borrowed at all — this check ran on nothing");
});

test("every query subject names a distinct noun", () => {
  for (const t of MODEL_TYPES) {
    const nouns = t.query.subjects.map((s) => s.noun);
    assert.ok(nouns.length > 0, `${t.id}: a type whose questions name no noun is unaskable`);
    assert.equal(new Set(nouns).size, nouns.length, `${t.id}: two subjects claim one noun`);
  }
});

// ---------------------------------------------------------------------------------------------
// Bindings and compositions — closed, distinct, and the one composition is not a pipeline
//
// The totality half — that every cross-domain reference the authored models make is named by some
// binding — is `test/bindings-census.test.ts`, which derives the references from the model documents
// rather than from this registry. What is held here is CLOSURE: the registries' own claims hang
// together, every name is unique across BOTH, and §4.3's prohibition is forward-policed.
// ---------------------------------------------------------------------------------------------

test("every binding and composition names registered domains, and no name is shared", () => {
  const ids = new Set(MODEL_TYPES.map((t) => t.id));
  const nouns = new Set(MODEL_TYPES.flatMap((t) => t.query.subjects.map((s) => s.noun)));
  assert.ok(BINDINGS.length > 0 && COMPOSITIONS.length > 0,
    "an empty registry satisfies every assertion below — spec §4.2 requires bindings and §4.3 one composition");

  const seen = new Set<string>();
  for (const r of [...BINDINGS, ...COMPOSITIONS]) {
    // One namespace across both, because the UI displays the name after a KIND word ("bound by:"
    // / "composed by:", §23.2) and one name meaning two things would make that label ambiguous.
    assert.ok(!seen.has(r.name), `'${r.name}' is registered as both a binding and a composition, or twice`);
    seen.add(r.name);
    assert.ok(ids.has(r.from), `${r.name}: source domain '${r.from}' is not a registered type`);
    assert.ok(ids.has(r.to), `${r.name}: target domain '${r.to}' is not a registered type`);
    assert.ok(r.interpretation.length > 30, `${r.name}: the interpretation is a placeholder`);
    if (r.licensing.kind === "by-construction") {
      assert.ok(r.licensing.why.length > 30, `${r.name}: a by-construction licence owes a real reason`);
    }
  }

  for (const b of BINDINGS) {
    // A binding's nouns must be nouns a QUESTION can name, or the correspondence relates something
    // no query can reach — which would make it a diagram label rather than a semantic relationship.
    assert.ok(nouns.has(b.correspondence.source), `${b.name}: '${b.correspondence.source}' is no query subject`);
    assert.ok(nouns.has(b.correspondence.target), `${b.name}: '${b.correspondence.target}' is no query subject`);
    assert.notEqual(b.correspondence.source, b.correspondence.target,
      `${b.name}: a correspondence between one noun and itself puts nothing in correspondence`);
  }
  for (const c of COMPOSITIONS) {
    assert.notEqual(c.from, c.to,
      `${c.name}: a composition within one domain is a primitive (§4.1), not a composition`);
    assert.ok(nouns.has(c.restricts), `${c.name}: '${c.restricts}' is no query subject`);
  }
});

test("a declared licence cites the same authority the relationship is declared by", () => {
  // The two fields overlap on purpose and the overlap is CHECKED rather than copied: `declaredBy`
  // is total (every row has a citation, including the by-construction ones), `licensing.by` exists
  // on one arm, and where both are present they are one object. The identity is what makes the
  // second field a cross-check instead of a second place to edit — the discipline `a per-instance
  // gate CITES the declaration it reads` already applies to the query primitives.
  let declared = 0;
  for (const r of [...BINDINGS, ...COMPOSITIONS]) {
    if (r.licensing.kind !== "declared") continue;
    declared += 1;
    assert.equal(r.licensing.by, r.declaredBy,
      `${r.name}: the licence cites a DIFFERENT object from 'declaredBy'. Share one const, or say `
      + `in a comment why the licensing declaration and the authoring site genuinely differ.`);
  }
  assert.ok(declared > 0, "no relationship is licensed by a declaration — this check ran on nothing");
  assert.ok([...BINDINGS, ...COMPOSITIONS].some((r) => r.licensing.kind === "by-construction"),
    "the by-construction arm is declared and unused, which is a shape nothing holds");
});

test("the one composition has not become a pipeline (§4.3)", () => {
  // §4.3: *"This must not become a generic pipeline mechanism. Do not add arbitrary cross-model
  // pipe / join / fold / flatMap / higher-order composition merely to make examples convenient."*
  //
  // Two controls, and the second is forward-policing at one entry — authored now, at zero findings,
  // because the five built-in examples are the pressure that would produce the first.
  assert.deepEqual(COMPOSITIONS.map((c) => c.name), ["executions-selected-by-behaviour"],
    "v0.2 admits exactly one cross-domain composition (spec §4.3). A second is a RULING, not a "
    + "registry row: say which specification section admits it and why the examples could not be "
    + "built without it, then change this list.");

  // A chain is what a pipeline is made of: one composition's target domain feeding another's
  // source. Nothing composes compositions in the type system either — `from`/`to` are model-type
  // ids — so this catches the registry-level version the types cannot.
  const sources = new Set(COMPOSITIONS.map((c) => c.from));
  for (const c of COMPOSITIONS) {
    assert.ok(!sources.has(c.to),
      `${c.name} ends in '${c.to}', which another composition starts from. Two compositions in `
      + `series ARE a pipeline, however they are named.`);
  }
});

test("the per-type accessors are derived from the registries, both directions", () => {
  // Recomputed, never stored (the V18 discipline `derivedPrimitives` follows), and the reason to
  // pin BOTH directions: a facade rendering a type's cross-model affordances needs the relationships
  // that point AT the type as much as the ones that point away, and a `from`-only filter would have
  // silently hidden `machine-of-entity` from the structural type's panel.
  for (const t of MODEL_TYPES) {
    assert.deepEqual(bindingsOf(t.id), BINDINGS.filter((b) => b.from === t.id || b.to === t.id));
    assert.deepEqual(compositionsOf(t.id), COMPOSITIONS.filter((c) => c.from === t.id || c.to === t.id));
  }
  // Positive controls for both directions, so the filter cannot have collapsed to one of them.
  assert.ok(bindingsOf("structural-graph").some((b) => b.from === "state-machine"),
    "a binding pointing AT the structural type is not reachable from it");
  assert.ok(bindingsOf("structural-graph").some((b) => b.to === "state-machine"),
    "a binding pointing AWAY from the structural type is not reachable from it");
  // Every registered type participates in at least one cross-model relationship; a type that
  // participates in none is an island, which no multi-model canvas (§23.3) could ever draw.
  for (const t of MODEL_TYPES) {
    assert.ok(bindingsOf(t.id).length + compositionsOf(t.id).length > 0,
      `${t.id} takes part in no binding and no composition — it cannot appear on a cross-model view`);
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
