// `check(query)` and the two invariants the model query interface's §5 owes.
//
// MQ-I1 — every evaluation is preceded by the same admission the checker reports. On the SPARQL
// seam the `LicensedQuestion` brand holds it by type. On the engine path there is no brand and
// deliberately none: `evaluateGraph`, `evaluateBehavior` and `evaluateQuantity` are module-private,
// so the only route into evaluation is the `run*Query` that admits first. What a test can add is
// the behavioural half — for every admission cause, the evaluator's answer must be the admission's
// own verdict, OBJECT-EQUAL and not merely similar. A second implementation that happened to agree
// on the sentence would still differ on `missing`, `models` or `interpretedAs`.
//
// MQ-I2 — `check(q)` and execution agree on the refusal cause and the sentence at the same hash,
// over every shipped saved question plus a battery with at least one case per `RefusalReason`.
//
// Why the battery is enumerated against the TYPE rather than hand-counted: `REFUSAL_REASONS` below
// is derived from nothing, so it would rot — instead the test asserts the battery's observed causes
// cover every reason the engine can produce, and names the two it cannot produce from a shipped
// example with a reason. A battery that silently stopped covering a cause would otherwise read as a
// pass.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { TransactionEngine } from "../src/transaction/engine.ts";
import { systemHash } from "../src/ir/hash.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { admitGraphQuery, runGraphQuery } from "../src/engine/graph.ts";
import { admitBehaviorQuery, runBehaviorQuery } from "../src/engine/behavior.ts";
import { admitQuantityQuery, runQuantityQuery } from "../src/quant/query.ts";
import { admitTyped, alternatives, checkQuery } from "../src/engine/check.ts";
import { runQuery } from "../src/engine/index.ts";
import { MODEL_TYPES, modelTypeForQueryKind } from "../src/engine/model-types.ts";
import { GRAPH_FORMS, parseQuery, QUANTIFIERS } from "../src/engine/types.ts";
import type { GraphQuery, Query, Refusal, RefusalReason } from "../src/engine/types.ts";

function load(path: string): CanonicalSystem {
  const loaded = TransactionEngine.load(readFileSync(path, "utf8"));
  assert.ok(loaded.engine !== null, `${path} must load: ${JSON.stringify(loaded.findings)}`);
  return loaded.engine.system();
}

/** Every shipped example, by path. Walked rather than listed, so a new example joins the sweep. */
function examplePaths(): readonly string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".mage.yaml")) out.push(path);
    }
  };
  walk("examples");
  // The fixture corpus keeps its engine pins (author ruling 261006: test cases are kept, just not
  // exposed to students), so the sweep covers both populations.
  walk("test/fixtures/examples");
  assert.ok(out.length >= 3, `found ${out.length} examples; the walk is wrong, not the tree`);
  return out.sort();
}

const DOCABLE = "examples/docable.mage.yaml";
/** Three structural models, no machines, no quantities — the substrate-absence cases need it. */
const MESSAGE_BUS = "test/fixtures/examples/message-bus/system.mage.yaml";

// ----------------------------------------------------------------------------------------------
// MQ-I1 — the evaluator's answer for a refused question IS the admission's verdict
// ----------------------------------------------------------------------------------------------

test("MQ-I1 graph: every admission cause returns the admission's own verdict, object-equal", () => {
  const system = load(DOCABLE);
  const hash = systemHash(system);
  // `owns` declares `composition.path: forbidden` in this example, which is what makes the V7 case
  // reachable here; looked up rather than assumed, because a model edit could move it.
  assert.equal(system.relationTypes.get("owns")?.pathComposition, "forbidden",
    "this battery needs a forbidden-composition relation type; docable's `owns` was it");
  const entity = [...system.entities.keys()].sort()[0];
  assert.ok(entity !== undefined);

  const cases: readonly { readonly label: string; readonly q: Parameters<typeof runGraphQuery>[1] }[] = [
    {
      label: "undeclared relation type",
      q: { form: "direct", relation: "no-such-relation", from: entity, to: null, maxHops: null, where: null },
    },
    {
      label: "V7 composition forbidden",
      q: { form: "reachability", relation: "owns", from: entity, to: null, maxHops: null, where: null },
    },
    {
      label: "undeclared endpoint",
      q: { form: "direct", relation: "owns", from: "not-an-entity", to: null, maxHops: null, where: null },
    },
    {
      label: "neither endpoint and no where",
      q: { form: "direct", relation: "owns", from: null, to: null, maxHops: null, where: null },
    },
    {
      label: "predecessors with no subject",
      q: { form: "predecessors", relation: "owns", from: null, to: null, maxHops: null, where: null },
    },
    {
      label: "containment with no subject",
      q: { form: "containment", relation: "owns", from: null, to: null, maxHops: null, where: null },
    },
    {
      label: "components on an undeclared entity",
      q: { form: "components", relation: "data_flow", from: "not-an-entity", to: null, maxHops: null, where: null },
    },
  ];

  for (const { label, q } of cases) {
    const admission = admitGraphQuery(system, q, "exists", hash);
    assert.equal(admission.admitted, false, `${label}: the admission must refuse it`);
    if (admission.admitted) continue;
    assert.deepEqual(runGraphQuery(system, q, "exists", hash), admission.verdict,
      `${label}: the evaluator must return the admission's verdict, not its own rendering of it`);
  }

  // The quantifier rung, which is per-form rather than per-query: every graph form is existential.
  for (const form of GRAPH_FORMS) {
    const q: GraphQuery = { form, relation: "data_flow", from: entity, to: null, maxHops: null, where: null };
    const admission = admitGraphQuery(system, q, "forall", hash);
    assert.equal(admission.admitted, false, `${form} + forall must refuse`);
    if (admission.admitted) continue;
    assert.equal(admission.verdict.refusal?.reason, "quantifier-mismatch");
    assert.deepEqual(runGraphQuery(system, q, "forall", hash), admission.verdict);
  }
});

test("MQ-I1 graph: a LICENSED question is answered, and the admission says so", () => {
  const system = load(DOCABLE);
  const hash = systemHash(system);
  const relation = [...system.relations].find((r) => r.type === "data_flow");
  assert.ok(relation, "docable must declare a data_flow edge for the positive case");
  const q = {
    form: "direct" as const, relation: "data_flow",
    from: relation.from, to: relation.to, maxHops: null, where: null,
  };
  assert.equal(admitGraphQuery(system, q, "exists", hash).admitted, true);
  assert.equal(runGraphQuery(system, q, "exists", hash).result.outcome, "holds",
    "the positive control: admission is not refusing everything");
});

test("MQ-I1 behaviour and quantity: same identity, on the other two kinds", () => {
  const behavioural = examplePaths().map(load).find((s) => s.machines.size > 0);
  assert.ok(behavioural, "at least one shipped example must declare a machine");
  const bHash = systemHash(behavioural);
  const behaviourCases = [
    { label: "quantifier mismatch", q: { form: "reach" as const, target: null, predicate: null, avoid: null, transition: null, limit: null }, quantifier: "forall" as const },
    { label: "reach with no target", q: { form: "reach" as const, target: null, predicate: null, avoid: null, transition: null, limit: null }, quantifier: "exists" as const },
    { label: "invariant with no predicate", q: { form: "invariant" as const, target: null, predicate: null, avoid: null, transition: null, limit: null }, quantifier: "forall" as const },
    { label: "transition-live with no selector", q: { form: "transition-live" as const, target: null, predicate: null, avoid: null, transition: null, limit: null }, quantifier: "exists" as const },
    {
      label: "transition-live naming an undeclared transition",
      q: {
        form: "transition-live" as const, target: null, predicate: null, avoid: null,
        transition: { machine: "no-such-machine", from: null, to: null, sync: null }, limit: null,
      },
      quantifier: "exists" as const,
    },
    {
      label: "a target predicate over an unknown reference",
      q: {
        form: "reach" as const, target: { kind: "atoms" as const, atoms: [{ ref: "nope.nowhere", op: "eq" as const, value: 1 }] },
        predicate: null, avoid: null, transition: null, limit: null,
      },
      quantifier: "exists" as const,
    },
  ];
  for (const { label, q, quantifier } of behaviourCases) {
    const admission = admitBehaviorQuery(behavioural, q, quantifier, bHash);
    assert.equal(admission.admitted, false, `${label}: the admission must refuse it`);
    if (admission.admitted) continue;
    assert.deepEqual(runBehaviorQuery(behavioural, q, quantifier, bHash), admission.verdict, label);
  }

  const quantitative = examplePaths().map(load).find((s) => s.quantities.size > 0);
  assert.ok(quantitative, "at least one shipped example must declare quantities");
  const qHash = systemHash(quantitative);
  const quantityCases = [
    { label: "unknown metric", q: { metric: "no-such-metric", target: null, within: null, limit: null }, quantifier: "exists" as const },
    {
      label: "category error: a target on a configuration-scoped metric",
      q: { metric: "peak_memory", target: { kind: "atoms" as const, atoms: [{ ref: "x", op: "eq" as const, value: 1 }] }, within: null, limit: null },
      quantifier: "exists" as const,
    },
    { label: "undeclared ceiling", q: { metric: "latency", target: null, within: "no-such-quantity", limit: null }, quantifier: "forall" as const },
    { label: "a measurement declared forall", q: { metric: "latency", target: null, within: null, limit: null }, quantifier: "forall" as const },
  ];
  for (const { label, q, quantifier } of quantityCases) {
    const admission = admitQuantityQuery(quantitative, q, quantifier, qHash);
    assert.equal(admission.admitted, false, `${label}: the admission must refuse it`);
    if (admission.admitted) continue;
    assert.deepEqual(runQuantityQuery(quantitative, q, quantifier, qHash), admission.verdict, label);
  }
});

test("MQ-I1 negative control: a checker that disagreed with its evaluator would be caught", () => {
  // The predicate the three tests above drive, against a deliberately wrong "admission". Without
  // this, a `deepEqual` between two calls to the same function could pass on a tautology.
  const system = load(DOCABLE);
  const hash = systemHash(system);
  const q = { form: "direct" as const, relation: "no-such-relation", from: null, to: null, maxHops: null, where: null };
  const real = runGraphQuery(system, q, "exists", hash);
  const reworded = {
    ...real,
    refusal: real.refusal === null ? null : { ...real.refusal, prose: "that relation is unknown." },
  };
  assert.notDeepEqual(real, reworded,
    "a second implementation re-wording one refusal must fail the identity assertion");
});

// ----------------------------------------------------------------------------------------------
// MQ-I2 — check and execute agree on cause and sentence, at the same hash
// ----------------------------------------------------------------------------------------------

/** The sentence and cause execution reports, read off the engine's answer. */
function executed(system: CanonicalSystem, raw: unknown): {
  readonly prose: string; readonly reason: RefusalReason | null; readonly outcome: string;
} {
  const answer = runQuery(system, raw);
  return {
    prose: answer.result.refusal ?? "",
    reason: answer.refusal?.reason ?? null,
    outcome: answer.result.outcome,
  };
}

test("MQ-I2: check and execute agree on every shipped example's saved questions", () => {
  let checked = 0;
  for (const path of examplePaths()) {
    const system = load(path);
    for (const [id, saved] of system.queries) {
      checked += 1;
      const report = checkQuery(system, saved.raw);
      const run = executed(system, saved.raw);
      assert.notEqual(report.outcome, "malformed",
        `${path}:${id} is a shipped question and must parse`);
      if (report.outcome === "licensed") {
        assert.equal(report.hash, systemHash(system), `${path}:${id} must describe this system`);
        assert.notEqual(run.outcome, "unlicensed",
          `${path}:${id}: check licensed it and execution refused — the two gates disagree`);
        continue;
      }
      if (report.outcome !== "refused") continue;
      assert.equal(run.outcome, "unlicensed",
        `${path}:${id}: check refused it and execution answered — the two gates disagree`);
      assert.equal(report.refusal.prose, run.prose, `${path}:${id}: one refusal, one sentence`);
      assert.equal(report.refusal.reason, run.reason, `${path}:${id}: one refusal, one cause`);
      assert.equal(report.hash, systemHash(system));
    }
  }
  assert.ok(checked >= 10, `only ${checked} saved questions swept; the walk is wrong, not the examples`);
});

/**
 * The violation battery: at least one case per `RefusalReason` the engine can produce.
 *
 * Each entry names the cause it is FOR, and the test asserts the observed cause matches — so a case
 * that stops exercising its rung fails here rather than quietly thinning the coverage.
 */
interface BatteryCase {
  readonly label: string;
  readonly system: string;
  readonly raw: unknown;
  readonly reason: RefusalReason;
}

const g = (graph: unknown, quantifier = "exists"): unknown => ({ kind: "graph", quantifier, graph });
const b = (behavior: unknown, quantifier = "exists"): unknown => ({ kind: "behavior", quantifier, behavior });
const qt = (quantity: unknown, quantifier = "exists"): unknown => ({ kind: "quantity", quantifier, quantity });

const BATTERY: readonly BatteryCase[] = [
  {
    label: "V7 composition forbidden", system: DOCABLE, reason: "composition-forbidden",
    raw: g({ form: "reachability", relation: "owns", from: "parser" }),
  },
  {
    label: "a name this system does not declare", system: DOCABLE, reason: "unknown-vocabulary",
    raw: g({ form: "direct", relation: "no-such-relation", from: "parser" }),
  },
  {
    label: "a behavioural question of a machineless system", system: MESSAGE_BUS, reason: "missing-model-type",
    raw: b({ form: "deadend" }),
  },
  {
    label: "a graph form declared forall", system: DOCABLE, reason: "quantifier-mismatch",
    raw: g({ form: "direct", relation: "data_flow", from: "parser" }, "forall"),
  },
  {
    label: "a quantitative question of a quantity-less system", system: MESSAGE_BUS, reason: "missing-model-type",
    raw: qt({ metric: "latency" }),
  },
];

test("MQ-I2: check and execute agree over the violation battery, cause and sentence", () => {
  const seen = new Set<RefusalReason>();
  for (const c of BATTERY) {
    const system = load(c.system);
    const report = checkQuery(system, c.raw);
    assert.equal(report.outcome, "refused", `${c.label}: must refuse`);
    if (report.outcome !== "refused") continue;
    assert.equal(report.refusal.reason, c.reason, `${c.label}: the cause the case is for`);
    const run = executed(system, c.raw);
    assert.equal(report.refusal.prose, run.prose, `${c.label}: one sentence`);
    assert.equal(report.refusal.reason, run.reason, `${c.label}: one cause`);
    assert.equal(report.hash, systemHash(system), `${c.label}: one hash`);
    seen.add(c.reason);
  }

  // The battery's coverage, asserted against what it claims rather than counted by hand.
  assert.deepEqual([...seen].sort(),
    ["composition-forbidden", "missing-model-type", "quantifier-mismatch", "unknown-vocabulary"]);
});

test("MQ-I2: the remaining refusal causes are reached through the kinds that produce them", () => {
  // `category-error` and `missing-distinction` need a system that declares the substrate, so they
  // are driven against the shipped examples that do rather than against docable.
  const quantitative = examplePaths().map(load).find((s) => s.quantities.size > 0);
  assert.ok(quantitative);
  const raw = qt({ metric: "peak_memory", target: { "machine.state": "anything" } });
  const report = checkQuery(quantitative, raw);
  assert.equal(report.outcome, "refused");
  if (report.outcome !== "refused") return;
  assert.equal(report.refusal.reason, "category-error",
    "a target on a configuration-scoped metric is the §8 category error");
  const run = executed(quantitative, raw);
  assert.equal(report.refusal.prose, run.prose);
  assert.equal(report.refusal.reason, run.reason);

  // And the causes no shipped example produces today, named rather than left to silence:
  // `unsupported-form` (every form in the schema is evaluated), `unsupported-expression` and
  // `reserved-feature` (both come from the expression compiler, which admission relays rather than
  // raises), and `missing-distinction` (needs a `purpose.omits` covering the asked name). Each has
  // an alternatives arm below, which is where the derivation is pinned.
  for (const reason of ["unsupported-form", "unsupported-expression", "reserved-feature", "missing-distinction"] as const) {
    const refusal: Refusal = { reason, prose: "", missing: [], models: [] };
    for (const t of MODEL_TYPES) {
      assert.ok(Array.isArray(alternatives(quantitative, t, refusal)),
        `${reason} must have an alternatives arm for ${t.id}`);
    }
  }
});

test("MQ-I2: the malformed arm's mapping to execution, which is NOT an identity", () => {
  // §5.3 gave `malformed` no `RefusalReason`, and execution routes a parse failure through
  // `unlicensed(...)` with no detail — which defaults the cause to `unknown-vocabulary`. So the
  // SENTENCE agrees and the cause does not. Pinned, because an undocumented mismatch between the
  // two gates is exactly what MQ-I2 exists to prevent someone discovering in the field.
  const system = load(DOCABLE);
  const report = checkQuery(system, { kind: "graph", graph: { form: "direct", relation: "owns" } });
  assert.equal(report.outcome, "malformed");
  if (report.outcome !== "malformed") return;
  const run = executed(system, { kind: "graph", graph: { form: "direct", relation: "owns" } });
  assert.equal(report.prose, run.prose, "the sentence is the same on both paths");
  assert.equal(run.reason, "unknown-vocabulary",
    "execution's cause for a parse failure, recorded so the mapping is declared rather than assumed");
  assert.deepEqual(report.alternatives,
    QUANTIFIERS.map((qf) => `quantifier '${qf}' — ${
      qf === "exists"
        ? "a witness establishes it, exhaustive absence refutes it"
        : "exhaustive satisfaction establishes it, a counterexample refutes it"}`),
    "a question with no quantifier is offered both quantifiers with their evidence rules");
});

// ----------------------------------------------------------------------------------------------
// Alternatives — derived from closed vocabularies, never written per site
// ----------------------------------------------------------------------------------------------

test("alternatives come from the registry's closed lists, not from prose written here", () => {
  const system = load(DOCABLE);
  const structural = modelTypeForQueryKind("graph");

  // composition-forbidden offers exactly the type's by-construction primitives, BY DERIVATION: the
  // expected list is computed from the registry, so a primitive reclassified in `model-types.ts`
  // moves both sides at once and this test cannot pin a stale copy.
  const forbidden = checkQuery(system, g({ form: "reachability", relation: "owns", from: "parser" }));
  assert.equal(forbidden.outcome, "refused");
  if (forbidden.outcome !== "refused") return;
  assert.deepEqual(forbidden.alternatives, structural.query.primitives.flatMap((p) =>
    p.gate.kind === "by-construction" ? [`form '${p.form}' — ${p.gate.why}`] : []));
  assert.ok(forbidden.alternatives.length > 0, "a forbidden composition must offer something askable");

  // unknown-vocabulary offers the type's subjects resolved against the system's own declarations.
  const unknown = checkQuery(system, g({ form: "direct", relation: "no-such-relation", from: "parser" }));
  assert.equal(unknown.outcome, "refused");
  if (unknown.outcome !== "refused") return;
  assert.equal(unknown.alternatives.length, structural.query.subjects.length,
    "one line per declared subject noun, and no more");
  for (const name of [...system.relationTypes.keys()]) {
    assert.ok(unknown.alternatives.some((a) => a.includes(name)),
      `the declared relation type '${name}' must appear among the alternatives`);
  }
  // And nothing it does NOT declare: the derivation reads the system, so an invented name cannot
  // appear. This is the assertion that would catch an arm written as prose.
  assert.ok(!unknown.alternatives.some((a) => a.includes("no-such-relation")));

  // missing-model-type offers the types this system HAS, filtered from the registry. Driven against
  // message-bus, which declares three structural models and no machines.
  const busSystem = load(MESSAGE_BUS);
  const absent = checkQuery(busSystem, b({ form: "deadend" }));
  assert.equal(absent.outcome, "refused");
  if (absent.outcome !== "refused") return;
  assert.deepEqual(absent.alternatives, MODEL_TYPES.filter((t) => t.presentIn(busSystem))
    .map((t) => `ask a '${t.queryKind}' question — ${t.question}`));
  assert.ok(!absent.alternatives.some((a) => a.includes("behavior")),
    "a system with no machine must not be offered a behavioural question");
});

// ----------------------------------------------------------------------------------------------
// The report is not a certificate
// ----------------------------------------------------------------------------------------------

test("a licensed check result carries no admission product — only a claim about a hash", () => {
  const system = load(DOCABLE);
  const relation = [...system.relations].find((r) => r.type === "data_flow");
  assert.ok(relation);
  const raw = g({ form: "direct", relation: "data_flow", from: relation.from, to: relation.to });
  const report = checkQuery(system, raw);
  assert.equal(report.outcome, "licensed");
  if (report.outcome !== "licensed") return;

  // The whole surface, enumerated: four scalar fields and nothing a caller could hand to an
  // evaluator. The admissions DO produce a plan — the resolved adjacency, the compiled predicate —
  // and `admitTyped` drops it, which is this assertion's subject.
  assert.deepEqual(Object.keys(report).sort(), ["hash", "kind", "modelType", "outcome"]);
  assert.equal(report.hash, systemHash(system));
  assert.equal(report.modelType, modelTypeForQueryKind("graph").id);

  const parsed = parseQuery(raw);
  assert.ok(parsed.ok);
  const admission = admitTyped(system, parsed.value satisfies Query, systemHash(system));
  assert.equal(admission.admitted, true);
  assert.deepEqual(Object.keys(admission).sort(), ["admitted", "kind", "modelType"],
    "admitTyped must not pass the admission's plan out: that is the certificate the seam refuses to publish");
});

test("check is round-trip safe: the same document, checked twice, reports the same thing", () => {
  // Admission must be a function of the system and the query and nothing else — no cache, no call
  // order. The same discipline `properties()` and `evidence()` hold for derived state (V18).
  const system = load(DOCABLE);
  const raw = g({ form: "reachability", relation: "owns", from: "parser" });
  assert.deepEqual(checkQuery(system, raw), checkQuery(system, raw));
});
