// The addressable quantitative model, and the readouts over its declared allocations.
//
// Two things are under test and they are different in kind. The IR derivation is a grouping claim:
// `CanonQuantitativeModel` must be the grouping the evaluator already computes implicitly, or it is
// a second source of truth rather than a consolidation of one. The readouts are an arithmetic claim
// AND a refusal claim: the total must be the sum of what charges, and an allocation that charges
// nothing must be reported rather than skipped — a budget view that silently drops an inert
// allocation shows a plausible margin over an incomplete model, which is the one failure mode here
// that a student could not detect.
//
// The shipped example supplies the oracle for the first half of each. Figures are looked up from
// the example rather than copied, so a change to a declared allocation moves the test with it and
// a change to the ARITHMETIC still fails — `expectedTotal` re-derives the sum from the declarations
// instead of restating 232.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash } from "../src/ir/hash.ts";
import { validate } from "../src/validator/rules.ts";
import { runQuery, runSavedQueries } from "../src/engine/index.ts";
import { budgetReadout, budgetReadoutFor, inDisplayUnit } from "../src/quant/budget.ts";
import { memoryContributions } from "../src/quant/memory.ts";
import { quantityMagnitude } from "../src/quant/types.ts";
import { ACCOUNTABLE_TARGET_KINDS, AGGREGATE_TARGET_KIND, DIMENSIONS } from "../src/ir/types.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";

const SENSOR_NODE = "test/fixtures/examples/embedded-sensor-node/system.mage.yaml";

const load = (src: string): CanonicalSystem => canonicalize(parse(src));
const sensorSource = (): string => readFileSync(SENSOR_NODE, "utf8");
const sensorNode = (): CanonicalSystem => load(sensorSource());

/** The oracle: the sum of every declared memory allocation, re-derived from the declarations. */
function expectedTotal(system: CanonicalSystem): number {
  let sum = 0;
  for (const q of system.quantities.values()) {
    if (q.dimension !== "memory") continue;
    if (q.target.kind === AGGREGATE_TARGET_KIND) continue;
    const m = quantityMagnitude(q, "upper");
    assert.ok(m.ok, `fixture allocation '${q.id}' does not normalize`);
    sum += m.value;
  }
  return sum;
}

// --------------------------------------------------------------------------------------------
// The derivation
// --------------------------------------------------------------------------------------------

test("a quantitative model is derived per declared dimension, and names its budget's host", () => {
  const system = sensorNode();
  assert.deepEqual([...system.quantitativeModels.keys()], ["memory"]);
  const qm = system.quantitativeModels.get("memory");
  assert.ok(qm !== undefined);
  assert.equal(qm.dimension, "memory");
  assert.equal(qm.scope, DIMENSIONS.memory.scope);

  // The budget is found by its target KIND, not by its id. A `model:`-targeted quantity of this
  // dimension is the declared total, and its ref names the host — both read off the declaration.
  const budget = system.quantities.get(qm.budget ?? "");
  assert.ok(budget !== undefined, "the memory model should have found its declared ceiling");
  assert.equal(budget.target.kind, AGGREGATE_TARGET_KIND);
  assert.equal(qm.host, budget.target.ref);
  assert.ok(system.models.has(qm.host ?? ""), "the host should be a declared model");
});

test("membership is the evaluator's own rule, so the grouping cannot drift from what charges", () => {
  const system = sensorNode();
  const qm = system.quantitativeModels.get("memory");
  assert.ok(qm !== undefined);

  // `memoryContributions` is the shipped membership rule — dimension plus accountable target kind.
  // The derived model must agree with it, or the picture and the figure describe different sets.
  const contributions = memoryContributions(system, "upper");
  assert.ok(contributions.ok);
  const charged = new Set(contributions.value.map((c) => c.quantity));
  for (const id of charged) {
    assert.ok(qm.allocations.includes(id), `'${id}' charges memory(c) but is not an allocation of the memory model`);
  }

  // And the other direction, by the declared rule rather than by the shipped example's shape: every
  // allocation is a memory quantity on an accountable target, and the ceiling is not among them.
  const accountable = new Set<string>(ACCOUNTABLE_TARGET_KINDS);
  for (const id of qm.allocations) {
    const q = system.quantities.get(id);
    assert.ok(q !== undefined);
    assert.equal(q.dimension, "memory");
    assert.ok(accountable.has(String(q.target.kind)), `'${id}' targets ${q.target.raw}, which no basis charges`);
  }
  assert.ok(!qm.allocations.includes(qm.budget ?? ""), "a declared total is not a summand of itself");
});

test("a quantity whose dimension did not resolve joins no model, rather than being guessed into one", () => {
  const system = load(`
system: { id: t }
entities: { cache: { label: Cache } }
models:
  m: { type: graph, label: M, purpose: { question: "?" }, entities: [cache] }
quantities:
  cache-size: { target: entity:cache, dimension: megabytes, value: 8 MB, residency: resident }
`);
  assert.equal(system.quantities.get("cache-size")?.dimension, null);
  assert.equal(system.quantitativeModels.size, 0);
});

test("two dimensions are two quantitative models sharing one map, and each keeps its own scope", () => {
  const system = load(`
system: { id: t }
entities: { svc: { label: Svc } }
relation-types: {}
models:
  m: { type: graph, label: M, purpose: { question: "?" }, entities: [svc] }
quantities:
  svc-mem:  { target: entity:svc, dimension: memory,   value: 8 MB, residency: resident }
  svc-time: { target: entity:svc, dimension: duration, value: 20 ms }
  mem-cap:  { target: model:m,    dimension: memory,   value: 64 MB }
`);
  assert.deepEqual([...system.quantitativeModels.keys()].sort(), ["duration", "memory"]);
  assert.equal(system.quantitativeModels.get("memory")?.scope, "configuration");
  assert.equal(system.quantitativeModels.get("duration")?.scope, "execution");
  // The duration model has allocations and no declared ceiling. That is a legal model, not an error.
  assert.equal(system.quantitativeModels.get("duration")?.budget, null);
  assert.equal(system.quantitativeModels.get("duration")?.host, null);
  assert.equal(system.quantitativeModels.get("memory")?.budget, "mem-cap");
});

test("the derived model stays out of the hash, because it is a function of what is hashed", () => {
  const system = sensorNode();
  assert.ok(system.quantitativeModels.size > 0);
  // Re-canonicalizing the same bytes must give the same hash, and the derived field must be
  // populated in both — the point being that adding it did not make the hash depend on it.
  const again = sensorNode();
  assert.equal(systemHash(system), systemHash(again));
  assert.equal(again.quantitativeModels.size, system.quantitativeModels.size);
});

// --------------------------------------------------------------------------------------------
// The readouts
// --------------------------------------------------------------------------------------------

test("the readout's total is the sum of the declared allocations, and its margin the budget less it", () => {
  const system = sensorNode();
  const r = budgetReadoutFor(system, "memory");
  assert.ok(r.ok, r.ok ? "" : r.refusal);
  const b = r.value;

  assert.equal(b.count, b.allocations.length);
  assert.equal(b.count, system.quantitativeModels.get("memory")?.allocations.length);
  assert.equal(b.total, expectedTotal(system));
  assert.ok(b.budget !== null);
  assert.equal(b.margin, b.budget.value - b.total);
  assert.equal(b.marginFraction, (b.budget.value - b.total) / b.budget.value);
  assert.equal(b.overBudget, false);
  assert.deepEqual(b.inert, []);
});

test("the display unit is the one the declarations agree on, so a 256 KiB budget does not read as 0.25", () => {
  const system = sensorNode();
  const r = budgetReadoutFor(system, "memory");
  assert.ok(r.ok);
  const b = r.value;

  // Not an assertion that the unit is "KB": an assertion that it is what the example WROTE, and
  // that it is not the dimension's base. The second half is the one that would have caught the
  // unreadable `0.1015625 MB` figure.
  const declared = system.quantities.get(b.budget?.quantity ?? "");
  assert.ok(declared !== undefined && declared.value.kind === "point");
  assert.equal(b.unit, declared.value.magnitude.unit);
  assert.notEqual(b.unit, DIMENSIONS.memory.base);

  // And the conversion is exact: the display figure times the unit's factor is the base figure.
  const factor = DIMENSIONS.memory.units[b.unit];
  assert.ok(factor !== undefined);
  assert.equal(inDisplayUnit(b, b.total) * factor, b.total);
  assert.ok(Number.isInteger(inDisplayUnit(b, b.total)), "the example's figures should be whole in their declared unit");
});

test("the largest allocation is the maximum over the declared set, and the first on a tie", () => {
  const system = sensorNode();
  const r = budgetReadoutFor(system, "memory");
  assert.ok(r.ok);
  const b = r.value;
  assert.ok(b.largest !== null);

  const charging = b.allocations.filter((a) => a.charge !== "none" && a.value !== null);
  const peak = Math.max(...charging.map((a) => a.value ?? 0));
  assert.equal(b.largest.value, peak);
  // Deterministic argmax, matching `peakMemory`'s strict `>`: the FIRST row attaining the maximum.
  assert.equal(b.largest.quantity, charging.find((a) => a.value === peak)?.quantity);
  assert.equal(b.largest.label, system.entities.get(system.quantities.get(b.largest.quantity)?.target.ref ?? "")?.label);
});

test("an allocation that charges nothing is reported with its reason, never dropped from the set", () => {
  // Both V37 shapes: one declaring neither form, one declaring both. Each enters neither summand of
  // memory(c), so each must appear as a row with `charge: "none"` and must not reach the total.
  const system = load(`
system: { id: t }
entities:
  a: { label: A }
  b: { label: B }
  c: { label: C }
machines:
  lifecycle:
    label: Lifecycle
    initial: idle
    states: { idle: {}, busy: {} }
    transitions: [{ from: idle, to: busy }]
models:
  m: { type: graph, label: M, purpose: { question: "?" }, entities: [a, b, c] }
quantities:
  a-mem:   { target: entity:a, dimension: memory, value: 10 MB, residency: resident }
  b-mem:   { target: entity:b, dimension: memory, value: 20 MB }
  c-mem:   { target: entity:c, dimension: memory, value: 40 MB, residency: resident, when: { state: lifecycle.busy } }
  mem-cap: { target: model:m,  dimension: memory, value: 100 MB }
`);
  const r = budgetReadoutFor(system, "memory");
  assert.ok(r.ok, r.ok ? "" : r.refusal);
  const b = r.value;

  assert.equal(b.count, 3, "all three allocations are members, including the two that charge nothing");
  assert.deepEqual([...b.inert].sort(), ["b-mem", "c-mem"]);
  assert.equal(b.total, 10, "only the one charging allocation reaches the total");
  assert.equal(b.margin, 90);

  const rows = new Map(b.allocations.map((a) => [a.quantity, a]));
  assert.equal(rows.get("a-mem")?.charge, "resident");
  assert.equal(rows.get("a-mem")?.inertReason, null);
  // The reason is the finding. A row saying `none` without saying why sends the reader to the spec.
  assert.equal(rows.get("b-mem")?.charge, "none");
  assert.match(String(rows.get("b-mem")?.inertReason), /neither 'residency' nor 'when'/);
  assert.equal(rows.get("c-mem")?.charge, "none");
  assert.match(String(rows.get("c-mem")?.inertReason), /both/);

  // The readout's total must agree with the evaluator's, or the budget view and the verdict differ.
  const contributions = memoryContributions(system, "upper");
  assert.ok(contributions.ok);
  assert.deepEqual(contributions.value.map((c) => c.quantity), ["a-mem"]);
});

test("mixed declared units fall back to the base, rather than letting authoring order pick one", () => {
  const system = load(`
system: { id: t }
entities: { a: { label: A }, b: { label: B } }
models:
  m: { type: graph, label: M, purpose: { question: "?" }, entities: [a, b] }
quantities:
  a-mem:   { target: entity:a, dimension: memory, value: 512 KB, residency: resident }
  b-mem:   { target: entity:b, dimension: memory, value: 2 MB,   residency: resident }
  mem-cap: { target: model:m,  dimension: memory, value: 4 MB }
`);
  const r = budgetReadoutFor(system, "memory");
  assert.ok(r.ok);
  assert.equal(r.value.unit, DIMENSIONS.memory.base);
  assert.equal(r.value.perBase, 1);
});

test("a model with allocations and no declared ceiling reads a total and no margin", () => {
  const system = load(`
system: { id: t }
entities: { a: { label: A } }
models:
  m: { type: graph, label: M, purpose: { question: "?" }, entities: [a] }
quantities:
  a-mem: { target: entity:a, dimension: memory, value: 8 MB, residency: resident }
`);
  const r = budgetReadoutFor(system, "memory");
  assert.ok(r.ok);
  assert.equal(r.value.total, 8);
  assert.equal(r.value.budget, null);
  assert.equal(r.value.margin, null);
  assert.equal(r.value.marginFraction, null);
  assert.equal(r.value.overBudget, false, "no ceiling means nothing to be over");
});

test("a dimension the system declares nothing in refuses by naming the authoring move", () => {
  const system = sensorNode();
  const r = budgetReadoutFor(system, "cost");
  assert.ok(!r.ok);
  assert.match(r.refusal, /no cost quantities/);
  assert.match(r.refusal, /dimension: cost/);
});

test("a ceiling declared as a range refuses rather than quietly becoming its own upper end", () => {
  const system = load(`
system: { id: t }
entities: { a: { label: A } }
models:
  m: { type: graph, label: M, purpose: { question: "?" }, entities: [a] }
quantities:
  a-mem:   { target: entity:a, dimension: memory, value: 8 MB, residency: resident }
  mem-cap: { target: model:m,  dimension: memory, range: [32 MB, 64 MB] }
`);
  const r = budgetReadoutFor(system, "memory");
  assert.ok(!r.ok);
  assert.match(r.refusal, /mem-cap/);
});

test("a hand-built model naming an allocation the system does not declare refuses, not under-reports", () => {
  const system = sensorNode();
  const qm = system.quantitativeModels.get("memory");
  assert.ok(qm !== undefined);
  const r = budgetReadout(system, { ...qm, allocations: [...qm.allocations, "no-such-quantity"] });
  assert.ok(!r.ok);
  assert.match(r.refusal, /no-such-quantity/);
});

// --------------------------------------------------------------------------------------------
// The example's own loop: the figure moves the verdict
// --------------------------------------------------------------------------------------------

test("the shipped sensor node validates clean and its pinned budget requirement holds", () => {
  const system = sensorNode();
  assert.deepEqual(validate(system).map((f) => f.rule), []);
  const answers = runSavedQueries(system);
  const fits = answers.get("sram-fits-budget");
  assert.ok(fits !== undefined, "the example should pin its budget as a saved query");
  assert.equal(fits.result?.outcome, "holds");
  assert.equal(fits.result?.coverage.kind, "exhaustive");
});

test("doubling the telemetry queue refutes the budget, and the margin goes negative with it", () => {
  const system = sensorNode();
  const before = budgetReadoutFor(system, "memory");
  assert.ok(before.ok);
  const queue = system.quantities.get("telemetry-queue-sram");
  assert.ok(queue !== undefined && queue.value.kind === "point");
  const declared = queue.value.magnitude;
  assert.ok(declared.base !== null);

  // The modification, done on the SOURCE rather than on the IR: the student's move is an edit, and
  // an edit re-canonicalizes. Doubling is expressed as arithmetic on the declared figure so the
  // test moves with the fixture instead of hard-coding `64 KB`.
  const doubled = load(sensorSource().replace(
    `value: ${declared.raw}`, `value: ${declared.base * 2 * before.value.perBase} ${declared.unit}`,
  ));
  const after = budgetReadoutFor(doubled, "memory");
  assert.ok(after.ok);

  assert.equal(after.value.total, before.value.total + declared.base);
  assert.ok(before.value.margin !== null && after.value.margin !== null);
  assert.ok(before.value.margin > 0, "the shipped configuration should have margin to lose");
  assert.ok(after.value.margin < 0, "doubling the queue should overrun the budget");
  assert.equal(after.value.overBudget, true);

  // And the property moves with the number, which is the whole lesson.
  assert.equal(runSavedQueries(doubled).get("sram-fits-budget")?.result?.outcome, "refuted");
});

test("the readout's total and the evaluator's peak are the same figure", () => {
  // Two surfaces, one number. If these drift, a student reads a margin the verdict does not share.
  //
  // The measurement is run here rather than saved in the example, which is itself the point: the
  // total answers "what is there" and belongs to the readout, while the saved query answers "is this
  // true". Equality between them is the invariant that lets both exist — and in THIS model they
  // coincide only because there is one reachable configuration, which is the coincidence
  // `expected-results.yaml` and the example header both refuse to teach as a rule.
  const system = sensorNode();
  const r = budgetReadoutFor(system, "memory");
  assert.ok(r.ok);
  const peak = runQuery(system, {
    kind: "quantity", quantifier: "exists", quantity: { metric: "peak_memory" },
  });
  assert.equal(peak.result?.outcome, "holds", peak.refusal?.prose ?? "");
  const magnitude = peak.result?.magnitude;
  assert.ok(magnitude !== null && magnitude !== undefined);
  assert.equal(magnitude.value, r.value.total);
  assert.equal(magnitude.dimension, r.value.dimension);
});
