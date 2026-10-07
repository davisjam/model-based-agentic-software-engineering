// The quantitative evaluator: trace latency per occurrence (Q2), memory(c) and peak_memory (Q3),
// requirements into the existing Outcome/Coverage/Evidence vocabulary, and the three refusals that
// must refuse rather than guess (Q1 ranges, Q4 expectation, Q5's cycle witness).
//
// The first fixture is Document Processing in miniature — the retry pipeline of the examples spec
// §5 — because the Q2 ruling's whole content is visible in it: `remediate` is charged twice on the
// retry path because the trace VISITS that entity twice, never because a state duration and a
// transition duration were summed. The join is shared identity: the lifecycle STATE `remediate`
// and the performance ENTITY `remediate` are one id, so a visit to the stage is a visit to the
// entity. Several tests assert the occurrence COUNT, not just a total — a right total can hide a
// wrong decomposition behind it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { validate } from "../src/validator/rules.ts";
import { compileSystem, defaultOptions, exploreSpace, traceTo } from "../src/engine/explore.ts";
import type { CanonicalSystem, Configuration } from "../src/ir/types.ts";
import {
  evaluateRequirement, expectedMetric, maxOverExecutions, memoryOf, peakMemory, traceMetric,
} from "../src/quant/index.ts";

// ---------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------

/**
 * The retry pipeline. One retry permitted (`retry_count` in [0, 1], guarded), so the worst
 * execution visits parse once and remediate/validate twice: 50 + 2·100 + 2·75 = 400 ms. The
 * memory profile is the ruled document's worked example: 256 MB charged exactly while
 * `document.remediate` is active, 128 MB resident everywhere — so 384 MB in remediation and
 * 128 MB outside it, and every configuration is testable.
 */
const pipeline = (overrides: Record<string, unknown> = {}): CanonicalSystem => canonicalize({
  mage: 1,
  system: { id: "docproc-mini" },
  accounting: { latency: { basis: "entities" } },
  entities: {
    parse: {}, remediate: {}, validate: {}, "gateway-cache": {}, "remediation-buffer": {},
  },
  machines: {
    document: {
      initial: "uploaded",
      states: {
        uploaded: null, parse: null, remediate: null, validate: null, waiting: null, published: null,
      },
      variables: { retry_count: { type: "integer", range: [0, 1] } },
      transitions: [
        { from: "uploaded", to: "parse" },
        { from: "parse", to: "remediate" },
        { from: "remediate", to: "validate" },
        { from: "validate", to: "published", label: "ok" },
        { from: "validate", to: "waiting", label: "failed" },
        {
          from: "waiting", to: "remediate", label: "retry",
          requires: { retry_count: { le: 0 } }, effects: { retry_count: "retry_count + 1" },
        },
      ],
    },
  },
  quantities: {
    "parse-latency": { target: "entity:parse", dimension: "duration", value: "50 ms" },
    "remediate-latency": { target: "entity:remediate", dimension: "duration", value: "100 ms" },
    "validate-latency": { target: "entity:validate", dimension: "duration", value: "75 ms" },
    "remediation-memory": {
      target: "entity:remediation-buffer", dimension: "memory", value: "256 MB",
      when: { state: "document.remediate" },
    },
    "cache-memory": {
      target: "entity:gateway-cache", dimension: "memory", value: "128 MB", residency: "resident",
    },
  },
  ...overrides,
});

const configsOf = (s: CanonicalSystem): readonly Configuration[] => {
  const c = compileSystem(s);
  assert.ok(c.ok, c.ok ? "" : c.refusal);
  return exploreSpace(c.value, defaultOptions(10_000)).configs;
};

test("the fixture is a VALIDATED model — the evaluator's input contract, held by the fixture", () => {
  // V27–V37 are the reason the evaluator re-checks no dimension, target or residency. A fixture
  // that stopped validating would be testing the evaluator on inputs it is promised never to see.
  assert.deepEqual(validate(pipeline()), []);
});

// ---------------------------------------------------------------------------------------------
// Q2 — latency per occurrence along the execution
// ---------------------------------------------------------------------------------------------

test("a retry charges the repeated entity TWICE — the count, not just the total", () => {
  // The whole Q2 ruling in one assertion. A total of 400 could also be reached by wrong
  // arithmetic (4×100, or state+transition summing); occurrences: 2 cannot.
  const max = maxOverExecutions(pipeline(), "latency");
  assert.ok(max.ok, max.ok ? "" : max.refusal);
  assert.equal(max.value.kind, "finite");
  if (max.value.kind !== "finite") return;
  assert.equal(max.value.total, 400);
  assert.equal(max.value.coverage.kind, "exhaustive");

  const byQuantity = new Map(max.value.charges.map((c) => [c.quantity, c]));
  assert.equal(byQuantity.get("remediate-latency")?.occurrences, 2);
  assert.equal(byQuantity.get("remediate-latency")?.subtotal, 200);
  assert.equal(byQuantity.get("validate-latency")?.occurrences, 2);
  assert.equal(byQuantity.get("parse-latency")?.occurrences, 1);
});

test("latency on a non-accounted kind contributes NOTHING, even unvalidated", () => {
  // V36 makes a duration on transition: or state: a finding, so a validated model cannot express
  // it. This fixture skips validation deliberately: the evaluator must not charge such a quantity
  // even when the validator was bypassed — defence in depth at the seam, not a second validator.
  const max = maxOverExecutions(pipeline({
    quantities: {
      "parse-latency": { target: "entity:parse", dimension: "duration", value: "50 ms" },
      "remediate-latency": { target: "entity:remediate", dimension: "duration", value: "100 ms" },
      "validate-latency": { target: "entity:validate", dimension: "duration", value: "75 ms" },
      "smuggled-transition": { target: "transition:document#0", dimension: "duration", value: "999 ms" },
      "smuggled-state": { target: "state:document.waiting", dimension: "duration", value: "999 ms" },
    },
  }), "latency");
  assert.ok(max.ok, max.ok ? "" : max.refusal);
  assert.equal(max.value.kind, "finite");
  if (max.value.kind !== "finite") return;
  assert.equal(max.value.total, 400, "the smuggled annotations must not move the total");
  const quantities = max.value.charges.map((c) => c.quantity);
  assert.ok(!quantities.includes("smuggled-transition") && !quantities.includes("smuggled-state"),
    `non-entity targets were charged: ${quantities.join(", ")}`);
});

test("the initial configuration is visited, so its occupancy charges", () => {
  // "Occurrence" means visit, and an execution begins already visiting its initial states. The
  // empty trace is the sharpest statement of the rule: zero steps, one visit.
  const boot = canonicalize({
    mage: 1,
    system: { id: "boot" },
    accounting: { latency: { basis: "entities" } },
    entities: { boot: {}, run: {} },
    machines: {
      m: {
        initial: "boot", states: { boot: null, run: null },
        transitions: [{ from: "boot", to: "run" }],
      },
    },
    quantities: {
      "boot-latency": { target: "entity:boot", dimension: "duration", value: "5 ms" },
      "run-latency": { target: "entity:run", dimension: "duration", value: "7 ms" },
    },
  });
  const empty = traceMetric(boot, "latency", []);
  assert.ok(empty.ok, empty.ok ? "" : empty.refusal);
  assert.equal(empty.value.total, 5);

  const max = maxOverExecutions(boot, "latency");
  assert.ok(max.ok && max.value.kind === "finite");
  if (!max.ok || max.value.kind !== "finite") return;
  assert.equal(max.value.total, 12);
});

test("an accounted entity NO state shares identity with is refused, not silently uncharged", () => {
  // The governing principle, enforced at the seam the validator does not yet cover: a quantity
  // that validates and then reaches no analysis is the worst outcome, because nothing looks
  // wrong. `gateway-cache` is a real entity with no behavioral counterpart, so a latency on it
  // can never be visited — the refusal names the missing correspondence.
  const max = maxOverExecutions(pipeline({
    quantities: {
      "parse-latency": { target: "entity:parse", dimension: "duration", value: "50 ms" },
      "cache-latency": { target: "entity:gateway-cache", dimension: "duration", value: "10 ms" },
    },
  }), "latency");
  assert.ok(!max.ok, "an unvisitable accounted quantity must refuse, not drop");
  assert.match(max.refusal, /no machine declares a state sharing that identity/);
  assert.match(max.refusal, /gateway-cache/);
});

test("a declared executes_in_state REPLACES the identity join for its entity", () => {
  // The two routes to a counterpart state, and their precedence. The entity `work` spells a state
  // id AND declares it executes in a different state; charging both routes would be the
  // double-counting shape the accounting ruling refuses, so the declaration wins outright.
  const s = canonicalize({
    mage: 1,
    system: { id: "precedence" },
    accounting: { latency: { basis: "entities" } },
    entities: { work: { properties: { executes_in_state: "busy" } } },
    machines: {
      m: {
        initial: "work", states: { work: null, busy: null },
        transitions: [{ from: "work", to: "busy" }],
      },
    },
    quantities: { "work-latency": { target: "entity:work", dimension: "duration", value: "10 ms" } },
  });
  const max = maxOverExecutions(s, "latency");
  assert.ok(max.ok, max.ok ? "" : max.refusal);
  assert.equal(max.value.kind, "finite");
  if (max.value.kind !== "finite") return;
  // The initial state `work` shares the entity's id but is NOT charged: the declaration points at
  // `busy`, entered once. Both routes live would make this 20.
  assert.equal(max.value.total, 10);
  assert.equal(max.value.charges[0]?.occurrences, 1);
});

// ---------------------------------------------------------------------------------------------
// Q3 — memory(c) by the declared predicate
// ---------------------------------------------------------------------------------------------

test("memory(c): resident charges everywhere, when-conditioned only where the state holds", () => {
  // Both configurations asserted, not just the peak — the ruling's worked example has exactly one
  // interpretation now ("during remediation it is at least 384 MB; outside remediation the cache
  // remains 128 MB"), and a peak-only assertion would let the outside-remediation half regress.
  const s = pipeline();
  const configs = configsOf(s);
  const initial = configs[0];
  const remediating = configs.find((c) => c.control.get("document") === "remediate");
  assert.ok(initial !== undefined && remediating !== undefined, "fixture drift: configurations missing");

  const outside = memoryOf(s, initial);
  assert.ok(outside.ok, outside.ok ? "" : outside.refusal);
  assert.equal(outside.value.total, 128);
  assert.deepEqual(outside.value.charged.map((c) => c.quantity), ["cache-memory"]);

  const during = memoryOf(s, remediating);
  assert.ok(during.ok, during.ok ? "" : during.refusal);
  assert.equal(during.value.total, 384);
  assert.deepEqual(during.value.charged.map((c) => c.quantity).sort(),
    ["cache-memory", "remediation-memory"]);
});

test("peak_memory is the reachable maximum, with the trace that reaches it", () => {
  const peak = peakMemory(pipeline());
  assert.ok(peak.ok, peak.ok ? "" : peak.refusal);
  assert.equal(peak.value.peak, 384);
  assert.equal(peak.value.coverage.kind, "exhaustive");
  // The evidence is a real execution: uploaded → parse → remediate, two steps.
  assert.equal(peak.value.trace.length, 2);
  assert.equal(peak.value.trace[1]?.to.control.get("document"), "remediate");
});

test("peak_memory over a BOUNDED exploration says bounded, never exhaustive", () => {
  // A peak over a truncated walk is a peak over the explored region — a strictly weaker claim,
  // and rounding it up to `exhaustive` would be the lie every later result inherits.
  const peak = peakMemory(pipeline(), { limit: 2, end: "upper" });
  assert.ok(peak.ok, peak.ok ? "" : peak.refusal);
  assert.equal(peak.value.coverage.kind, "bounded");
  assert.equal(peak.value.coverage.reason, "state-limit");
  // Two configurations in, remediation is not yet reachable, so the regional peak is the cache.
  assert.equal(peak.value.peak, 128);
});

// ---------------------------------------------------------------------------------------------
// Requirements — evidence, not booleans
// ---------------------------------------------------------------------------------------------

test("a refuted requirement carries a counterexample trace; a holding one carries its coverage", () => {
  // §5.5's shape: result AND evidence. A refuted requirement with no counterexample is the
  // vacuous answer this project shipped once and now tests against.
  const s = pipeline();

  const refuted = evaluateRequirement(s, { id: "tight", metric: "latency", operator: "<=", bound: "300 ms" });
  assert.equal(refuted.result.outcome, "refuted");
  assert.equal(refuted.result.evidence?.role, "counterexample");
  assert.equal(refuted.result.evidence?.shape, "trace");
  assert.ok((refuted.result.evidence?.steps.length ?? 0) > 0, "a refutation must carry the violating trace");
  assert.equal(refuted.analysis?.observed, 400);
  assert.equal(refuted.analysis?.bound, 300);

  const holds = evaluateRequirement(s, { id: "normal", metric: "latency", operator: "<=", bound: "750 ms" });
  assert.equal(holds.result.outcome, "holds");
  assert.equal(holds.result.coverage.kind, "exhaustive");
  assert.equal(holds.result.evidence, null);
  assert.equal(holds.analysis?.observed, 400);

  const memoryHolds = evaluateRequirement(s, { id: "peak", metric: "peak_memory", operator: "<=", bound: "512 MB" });
  assert.equal(memoryHolds.result.outcome, "holds");
  assert.equal(memoryHolds.analysis?.observed, 384);

  const memoryRefuted = evaluateRequirement(s, { id: "peak", metric: "peak_memory", operator: "<=", bound: "256 MB" });
  assert.equal(memoryRefuted.result.outcome, "refuted");
  assert.equal(memoryRefuted.result.evidence?.role, "counterexample");
  assert.equal(memoryRefuted.result.evidence?.steps.length, 2);
});

test("a requirement under a truncated walk with no violation reads inconclusive, bounded (V22)", () => {
  const r = evaluateRequirement(pipeline(), { id: "n", metric: "latency", operator: "<=", bound: "750 ms" }, { limit: 2, target: null });
  assert.equal(r.result.outcome, "inconclusive");
  assert.equal(r.result.coverage.kind, "bounded");
  assert.equal(r.result.coverage.reason, "state-limit");
});

// ---------------------------------------------------------------------------------------------
// Q5 — the unbounded maximum is a cycle witness in the existing vocabulary
// ---------------------------------------------------------------------------------------------

test("a positive repeatable cycle refutes any finite bound with a LASSO, not a new outcome word", () => {
  // The confirmation the ruling asked for: `refuted` + lasso evidence carries the cycle witness.
  // The cycle IS the counterexample — it exceeds every finite bound by repetition — so no
  // "unbounded" outcome needs inventing, and the closed vocabulary stays closed.
  const poller = canonicalize({
    mage: 1,
    system: { id: "poller" },
    accounting: { latency: { basis: "entities" } },
    entities: { work: {} },
    machines: {
      p: {
        initial: "idle", states: { idle: null, work: null },
        transitions: [{ from: "idle", to: "work" }, { from: "work", to: "idle" }],
      },
    },
    quantities: { "work-latency": { target: "entity:work", dimension: "duration", value: "10 ms" } },
  });
  assert.deepEqual(validate(poller), []);

  const max = maxOverExecutions(poller, "latency");
  assert.ok(max.ok, max.ok ? "" : max.refusal);
  assert.equal(max.value.kind, "unbounded");
  if (max.value.kind !== "unbounded") return;
  assert.equal(max.value.cycleGain, 10);
  assert.ok(max.value.cycle.length > 0);

  const r = evaluateRequirement(poller, { id: "cap", metric: "latency", operator: "<=", bound: "1000 ms" });
  assert.equal(r.result.outcome, "refuted");
  assert.equal(r.result.evidence?.shape, "lasso");
  assert.equal(r.result.evidence?.role, "counterexample");
  assert.ok((r.result.evidence?.cycle?.length ?? 0) > 0, "the lasso must carry the repeating segment");
  assert.equal(r.analysis?.unbounded, true);
  assert.equal(r.analysis?.observed, null);
});

test("a ZERO-charge cycle does not unbound the maximum", () => {
  // The other half of Q5, and the one a naive longest-path would get wrong: a repeatable cycle
  // that charges nothing gains nothing, so the maximum stays finite. An uncosted blinker loops
  // forever beside a costed one-shot pipeline; the answer is the pipeline's.
  const s = canonicalize({
    mage: 1,
    system: { id: "blinker" },
    accounting: { latency: { basis: "entities" } },
    entities: { stage: {} },
    machines: {
      doc: {
        initial: "start", states: { start: null, stage: null },
        transitions: [{ from: "start", to: "stage" }],
      },
      blinker: {
        // Not `on`/`off`: YAML 1.1 loaders coerce those to booleans, which V25 refuses.
        initial: "lit", states: { lit: null, dark: null },
        transitions: [{ from: "lit", to: "dark" }, { from: "dark", to: "lit" }],
      },
    },
    quantities: { "stage-latency": { target: "entity:stage", dimension: "duration", value: "20 ms" } },
  });
  assert.deepEqual(validate(s), []);
  const max = maxOverExecutions(s, "latency");
  assert.ok(max.ok, max.ok ? "" : max.refusal);
  assert.equal(max.value.kind, "finite");
  if (max.value.kind !== "finite") return;
  assert.equal(max.value.total, 20);
});

// ---------------------------------------------------------------------------------------------
// Q1 — worst-case only; a question needing both ends refuses, naming why
// ---------------------------------------------------------------------------------------------

const withGateway = (): CanonicalSystem => pipeline({
  entities: {
    parse: {}, remediate: {}, "model-gateway": {}, validate: {},
    "gateway-cache": {}, "remediation-buffer": {},
  },
  machines: {
    document: {
      initial: "uploaded",
      states: {
        uploaded: null, parse: null, remediate: null, "model-gateway": null,
        validate: null, waiting: null, published: null,
      },
      variables: { retry_count: { type: "integer", range: [0, 1] } },
      transitions: [
        { from: "uploaded", to: "parse" },
        { from: "parse", to: "remediate" },
        { from: "remediate", to: "model-gateway" },
        { from: "model-gateway", to: "validate" },
        { from: "validate", to: "published", label: "ok" },
        { from: "validate", to: "waiting", label: "failed" },
        {
          from: "waiting", to: "remediate", label: "retry",
          requires: { retry_count: { le: 0 } }, effects: { retry_count: "retry_count + 1" },
        },
      ],
    },
  },
  quantities: {
    "parse-latency": { target: "entity:parse", dimension: "duration", value: "50 ms" },
    "remediate-latency": { target: "entity:remediate", dimension: "duration", value: "100 ms" },
    "gateway-latency": { target: "entity:model-gateway", dimension: "duration", range: ["100 ms", "500 ms"] },
    "validate-latency": { target: "entity:validate", dimension: "duration", value: "75 ms" },
  },
});

test("a worst-case question over a range takes the end its operator selects", () => {
  // `<=` selects the upper end: the retry path visits the gateway twice, so the worst case is
  // 50 + 2·100 + 2·500 + 2·75 = 1400 ms. That is a sound single-ended claim, not interval math.
  const s = withGateway();
  assert.deepEqual(validate(s), []);
  const r = evaluateRequirement(s, { id: "normal", metric: "latency", operator: "<=", bound: "750 ms" });
  assert.equal(r.result.outcome, "refuted");
  assert.equal(r.analysis?.observed, 1400);
});

test("a range question needing both ends is refused, naming the range and the reason", () => {
  // Q1's boundary. A single number for a ranged quantity is interval arithmetic, which the ruling
  // defers to SMT rather than having v0.1 maintain a weaker semantics to throw away later. The
  // refusal names the quantity, both ends, and the worst-case alternative — a direction, not a
  // dead end.
  const point = traceMetric(withGateway(), "latency", [], "point");
  assert.ok(!point.ok, "a point question over a range must refuse");
  assert.match(point.refusal, /gateway-latency/);
  assert.match(point.refusal, /\[100 ms, 500 ms\]/);
  assert.match(point.refusal, /worst-case only/);

  // The operator form of the same boundary: anything but <= / < needs the other end or both.
  const ge = evaluateRequirement(withGateway(), { id: "floor", metric: "latency", operator: ">=", bound: "100 ms" });
  assert.equal(ge.result.outcome, "unlicensed");
  assert.match(ge.result.refusal ?? "", /worst-case bounds only/);
  assert.match(ge.result.refusal ?? "", /SMT/);
  assert.equal(ge.refusal?.reason, "reserved-feature");
});

// ---------------------------------------------------------------------------------------------
// Q4 — expectation refuses, naming the missing frequency
// ---------------------------------------------------------------------------------------------

test("an expected-latency query with no declared frequency is not answerable, naming the frequency", () => {
  // The examples spec's flagship omission case, generalized: the model represents the costs of
  // the alternatives but deliberately omits their frequencies. The refusal must tell the author
  // WHAT to model — a refusal that does not is a dead end rather than a direction.
  const a = expectedMetric(pipeline(), "latency");
  assert.equal(a.result.outcome, "unlicensed");
  assert.match(a.result.refusal ?? "", /^Not answerable\./);
  assert.match(a.result.refusal ?? "", /deliberately omits their frequencies/);
  assert.equal(a.refusal?.reason, "missing-distinction");
  assert.match(a.refusal?.missing[0] ?? "", /frequency/);
});

test("with a frequency declared, expectation still refuses — composition is deferred, not implied", () => {
  // Declaring the hit rate licenses the QUESTION someday; it does not make v0.1 a probabilistic
  // model checker. The refusal names the declared frequency and the honest interim route: two
  // hypotheses, all-hit and all-miss, which bound the answer.
  const s = pipeline({
    quantities: {
      "parse-latency": { target: "entity:parse", dimension: "duration", value: "50 ms" },
      "hit-rate": { target: "entity:gateway-cache", dimension: "ratio", value: 0.8 },
    },
  });
  const a = expectedMetric(s, "latency");
  assert.equal(a.result.outcome, "unlicensed");
  assert.equal(a.refusal?.reason, "reserved-feature");
  assert.match(a.result.refusal ?? "", /'hit-rate'/);
  assert.match(a.result.refusal ?? "", /all-hit and all-miss/);
});

// ---------------------------------------------------------------------------------------------
// The oracle — Document Processing's hand-derived figures, reproduced by the evaluator
// ---------------------------------------------------------------------------------------------

/**
 * The shipped example, loaded the way its own suite loads it. Its expected-results.yaml carries
 * figures derived BY HAND with the arithmetic shown, explicitly labelled pending this evaluator —
 * so each assertion below closes one of those entries. A disagreement would mean one side is
 * wrong, which is exactly what the hand derivation exists to detect.
 */
const documentProcessing = (): CanonicalSystem =>
  canonicalize(parse(readFileSync("test/fixtures/examples/document-processing/system.mage.yaml", "utf8")));

test("oracle: maximum publishing latency is 2,750 ms — 1×50 + 4×100 + 4×500 + 4×75", () => {
  // expected-results.yaml `max-publishing-latency`. Four remediation passes (the first plus one
  // per permitted retry under retry_count in [0,3]), the gateway at its high end every pass, and
  // the gateway charged ON THE SAME state entries as remediation — two entities, one state, which
  // the declared executes_in_state join expresses and an id-equality join could not.
  const max = maxOverExecutions(documentProcessing(), "latency");
  assert.ok(max.ok, max.ok ? "" : max.refusal);
  assert.equal(max.value.kind, "finite");
  if (max.value.kind !== "finite") return;
  assert.equal(max.value.total, 2750);
  assert.equal(max.value.coverage.kind, "exhaustive");

  const byQuantity = new Map(max.value.charges.map((c) => [c.quantity, c]));
  assert.equal(byQuantity.get("parse-latency")?.occurrences, 1);
  assert.equal(byQuantity.get("remediate-latency")?.occurrences, 4);
  assert.equal(byQuantity.get("gateway-latency")?.occurrences, 4);
  assert.equal(byQuantity.get("gateway-latency")?.each, 500);
  assert.equal(byQuantity.get("validate-latency")?.occurrences, 4);

  // The evaluator's maximum ranges over ALL executions; the fixture's question is over executions
  // that publish. The two coincide here because the dead-end path (retries exhausted, waiting)
  // charges exactly what the publishing path charges — observed equality, not the same question.
  const r = evaluateRequirement(documentProcessing(),
    { id: "latency-requirement", metric: "latency", operator: "<=", bound: "750 ms" });
  assert.equal(r.result.outcome, "refuted");
  assert.equal(r.result.evidence?.role, "counterexample");
  assert.equal(r.analysis?.observed, 2750);
});

test("oracle: the retry-free execution costs 725 ms, inside the 750 ms ceiling", () => {
  // expected-results.yaml `retry-free-latency`: what makes the counterexample informative — the
  // ceiling is refuted by the retry policy, not by a hopelessly slow pipeline. The shortest trace
  // to `published` is the BFS parent chain, which never takes the retry loop.
  const s = documentProcessing();
  const compiled = compileSystem(s);
  assert.ok(compiled.ok, compiled.ok ? "" : compiled.refusal);
  const space = exploreSpace(compiled.value, defaultOptions(10_000));
  const published = space.configs.findIndex(
    (c) => c.control.get("document-lifecycle") === "published"
      && c.values.get("document-lifecycle.retry_count") === 0);
  assert.ok(published !== -1, "fixture drift: no retry-free published configuration");
  const trace = traceTo(space, published);
  const cost = traceMetric(s, "latency", trace);
  assert.ok(cost.ok, cost.ok ? "" : cost.refusal);
  assert.equal(cost.value.total, 725);
});

test("oracle: peak memory is 384 MB during remediation and 128 MB elsewhere, under 512", () => {
  // expected-results.yaml `peak-memory`: resident 128 + when-active 256. Both figures asserted,
  // so the baseline cannot silently become resident-everything or active-nowhere.
  const s = documentProcessing();
  const peak = peakMemory(s);
  assert.ok(peak.ok, peak.ok ? "" : peak.refusal);
  assert.equal(peak.value.peak, 384);
  assert.equal(peak.value.coverage.kind, "exhaustive");

  const initial = configsOf(s)[0];
  assert.ok(initial !== undefined);
  const baseline = memoryOf(s, initial);
  assert.ok(baseline.ok, baseline.ok ? "" : baseline.refusal);
  assert.equal(baseline.value.total, 128);

  const r = evaluateRequirement(s,
    { id: "peak-memory-requirement", metric: "peak_memory", operator: "<=", bound: "512 MB" });
  assert.equal(r.result.outcome, "holds");
  assert.equal(r.result.coverage.kind, "exhaustive");
  assert.equal(r.analysis?.observed, 384);
});

test("oracle: the flagship omission — expected latency is not answerable, by name", () => {
  // The model represents hit and miss costs (the gateway's range) and deliberately omits their
  // frequencies; the example's own notes say the engine must refuse this by name, and it does.
  const a = expectedMetric(documentProcessing(), "latency");
  assert.equal(a.result.outcome, "unlicensed");
  assert.match(a.result.refusal ?? "", /deliberately omits their frequencies/);
  assert.equal(a.refusal?.reason, "missing-distinction");
});

// ---------------------------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------------------------

test("the same system evaluates identically twice", () => {
  // The analysis sits downstream of canonicalization and exploration, both deterministic; this
  // pins that the evaluator added no iteration-order or tie-breaking nondeterminism of its own —
  // argmax ties break on the FIRST maximal candidate, and charge breakdowns follow the
  // quantities' canonical order.
  const s = pipeline();
  assert.deepEqual(
    evaluateRequirement(s, { id: "r", metric: "latency", operator: "<=", bound: "300 ms" }),
    evaluateRequirement(s, { id: "r", metric: "latency", operator: "<=", bound: "300 ms" }));
  assert.deepEqual(maxOverExecutions(s, "latency"), maxOverExecutions(s, "latency"));
  assert.deepEqual(peakMemory(s), peakMemory(s));
});
