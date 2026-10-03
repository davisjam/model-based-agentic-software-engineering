// The quantity query form: aggregation DERIVED from the dimension's scope, the figure on
// `result.magnitude` with its dimension attached, and the refusals that make the derivation a type
// rather than a convention. Everything here drives `runQuery` — the same loosely-typed entry a
// saved query or an agent uses — so the parse, the dispatch and the evaluation are witnessed as one
// path, not three modules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { validate } from "../src/validator/rules.ts";
import { runQuery } from "../src/engine/index.ts";
import { REQUIREMENT_METRICS } from "../src/quant/index.ts";
import { DIMENSIONS, type CanonicalSystem } from "../src/ir/types.ts";

// ---------------------------------------------------------------------------------------------
// Fixture — the quant-eval retry pipeline, plus the two declared model: ceilings the query form
// exists to decide. One retry permitted, so the worst execution costs 50 + 2·100 + 2·75 = 400 ms;
// the retry-free one costs 225 ms; memory peaks at 384 MB during remediation over a 128 MB floor.
// ---------------------------------------------------------------------------------------------

const pipeline = (overrides: Record<string, unknown> = {}): CanonicalSystem => canonicalize({
  mage: 1,
  system: { id: "docproc-mini" },
  accounting: { latency: { basis: "entities" } },
  entities: {
    parse: {}, remediate: {}, validate: {}, "gateway-cache": {}, "remediation-buffer": {},
  },
  models: { perf: { type: "graph", entities: [] } },
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
    "latency-ceiling": { target: "model:perf", dimension: "duration", value: "300 ms" },
    "memory-ceiling": { target: "model:perf", dimension: "memory", value: "512 MB" },
  },
  ...overrides,
});

const quantityQuery = (quantifier: string, quantity: Record<string, unknown>): unknown =>
  ({ kind: "quantity", quantifier, quantity });

test("the fixture is a VALIDATED model — the form's input contract, held by the fixture", () => {
  assert.deepEqual(validate(pipeline()), []);
});

// ---------------------------------------------------------------------------------------------
// Measurements — the figure, its dimension, its witness
// ---------------------------------------------------------------------------------------------

test("a path measurement reports the worst case with its DIMENSION, and the witness attains it", () => {
  const res = runQuery(pipeline(), quantityQuery("exists", { metric: "latency" })).result;
  assert.equal(res.outcome, "holds");
  assert.equal(res.coverage.kind, "exhaustive");
  // The magnitude carries value AND dimension AND unit — a bare number would permit at the query
  // surface the millisecond-plus-megabyte arithmetic V30 refuses at validation. The unit is looked
  // up, not spelled: the dimension table owns it.
  assert.deepEqual(res.magnitude, { value: 400, dimension: "duration", unit: DIMENSIONS.duration.base });
  assert.equal(res.evidence?.role, "witness");
  assert.equal(res.evidence?.shape, "trace");
  assert.ok((res.evidence?.steps.length ?? 0) > 0, "the witness must be the execution that costs 400");
});

test("a target selects WHICH executions — never how they aggregate", () => {
  // The retry-free execution, selected by its final configuration. 50 + 100 + 75 = 225.
  const res = runQuery(pipeline(), quantityQuery("exists", {
    metric: "latency",
    target: { "document.state": "published", "document.retry_count": 0 },
  })).result;
  assert.equal(res.outcome, "holds");
  assert.deepEqual(res.magnitude, { value: 225, dimension: "duration", unit: DIMENSIONS.duration.base });
  // The witness must END at the selected configuration, or the figure is about something else.
  const last = res.evidence?.steps.at(-1);
  assert.equal(last?.to.control.get("document"), "published");
  assert.equal(last?.to.values.get("document.retry_count"), 0);
});

test("a selection nothing reaches is REFUTED under exhaustive absence, with no magnitude", () => {
  const res = runQuery(pipeline(), quantityQuery("exists", {
    metric: "latency", target: { "document.retry_count": { ge: 9 } },
  })).result;
  // ge: 9 is outside retry_count's declared [0, 1] domain, so no configuration satisfies it; an
  // honest empty result beats a zero that looks measured.
  assert.equal(res.outcome, "refuted");
  assert.equal(res.magnitude, null);
});

test("peak_memory measures memory(c)'s reachable maximum: resident floor plus the active charge", () => {
  const res = runQuery(pipeline(), quantityQuery("exists", { metric: "peak_memory" })).result;
  assert.equal(res.outcome, "holds");
  assert.equal(res.coverage.kind, "exhaustive");
  assert.deepEqual(res.magnitude, { value: 384, dimension: "memory", unit: DIMENSIONS.memory.base });
  // The witness is the configuration that attains the peak, reached by a real execution.
  assert.equal(res.evidence?.steps.at(-1)?.to.control.get("document"), "remediate");
});

test("a bounded exploration's peak reports BOUNDED coverage and inconclusive, never a quiet claim", () => {
  // Two configurations in, remediation is unreached: the regional peak is the resident cache. The
  // figure is still reported — it is true of the explored region — but the coverage says which
  // claim it supports and V22 keeps the outcome from reading as settled.
  const res = runQuery(pipeline(), quantityQuery("exists", { metric: "peak_memory", limit: 2 })).result;
  assert.equal(res.outcome, "inconclusive");
  assert.equal(res.coverage.kind, "bounded");
  assert.equal(res.coverage.reason, "state-limit");
  assert.deepEqual(res.magnitude, { value: 128, dimension: "memory", unit: DIMENSIONS.memory.base });
});

// ---------------------------------------------------------------------------------------------
// Ceilings — the declared model: total, decided
// ---------------------------------------------------------------------------------------------

test("a within query decides the declared ceiling: refuted with the counterexample and the figure", () => {
  const res = runQuery(pipeline(),
    quantityQuery("forall", { metric: "latency", within: "latency-ceiling" })).result;
  assert.equal(res.outcome, "refuted");
  assert.equal(res.evidence?.role, "counterexample");
  assert.deepEqual(res.magnitude, { value: 400, dimension: "duration", unit: DIMENSIONS.duration.base });
  assert.match(res.interpretedAs ?? "", /latency-ceiling/);
});

test("a within query that holds carries exhaustive coverage and the observed figure", () => {
  const res = runQuery(pipeline(),
    quantityQuery("forall", { metric: "peak_memory", within: "memory-ceiling" })).result;
  assert.equal(res.outcome, "holds");
  assert.equal(res.coverage.kind, "exhaustive");
  assert.deepEqual(res.magnitude, { value: 384, dimension: "memory", unit: DIMENSIONS.memory.base });
});

// ---------------------------------------------------------------------------------------------
// The refusals — category errors refused by the types, never computed
// ---------------------------------------------------------------------------------------------

test("a configuration-scoped quantity asked along a path is a CATEGORY ERROR, refused, not computed", () => {
  // The §29 refinement's whole point, as a test: there is no reading of "peak_memory along these
  // executions", because the aggregation axis is derived from the scope and configuration scope
  // does not aggregate along executions. The refusal names the scope; nothing is computed.
  const answer = runQuery(pipeline(), quantityQuery("exists", {
    metric: "peak_memory", target: { "document.state": "published" },
  }));
  assert.equal(answer.result.outcome, "unlicensed");
  assert.equal(answer.refusal?.reason, "category-error");
  assert.match(answer.result.refusal ?? "", /configuration-scoped/);
  assert.match(answer.result.refusal ?? "", /category error/);
  assert.equal(answer.result.magnitude, null, "a category error must not carry a computed figure");
  assert.equal(answer.result.evidence, null);
});

test("an unknown metric refuses by vocabulary — 'memory' is a dimension, not an analysis", () => {
  const answer = runQuery(pipeline(), quantityQuery("exists", { metric: "memory" }));
  assert.equal(answer.result.outcome, "unlicensed");
  assert.equal(answer.refusal?.reason, "unknown-vocabulary");
  assert.match(answer.result.refusal ?? "", /peak_memory/);
});

test("a dangling ceiling refuses at ask time, citing the rule that catches it at authoring time", () => {
  const answer = runQuery(pipeline(),
    quantityQuery("forall", { metric: "latency", within: "ghost" }));
  assert.equal(answer.result.outcome, "unlicensed");
  assert.equal(answer.refusal?.reason, "unknown-vocabulary");
  assert.match(answer.result.refusal ?? "", /ghost/);
  assert.match(answer.result.refusal ?? "", /V39/);
});

test("a summand is not a ceiling: within an entity-targeted quantity refuses", () => {
  const answer = runQuery(pipeline(),
    quantityQuery("forall", { metric: "latency", within: "parse-latency" }));
  assert.equal(answer.result.outcome, "unlicensed");
  assert.match(answer.result.refusal ?? "", /summand/);
});

test("a ceiling of the wrong dimension refuses — V30's class, at the query surface", () => {
  const answer = runQuery(pipeline(),
    quantityQuery("forall", { metric: "latency", within: "memory-ceiling" }));
  assert.equal(answer.result.outcome, "unlicensed");
  assert.equal(answer.refusal?.reason, "category-error");
  assert.match(answer.result.refusal ?? "", /V30/);
});

test("the quantifier is forced by the question's shape, both directions", () => {
  const measure = runQuery(pipeline(), quantityQuery("forall", { metric: "latency" }));
  assert.equal(measure.result.outcome, "unlicensed");
  assert.equal(measure.refusal?.reason, "quantifier-mismatch");

  const decide = runQuery(pipeline(),
    quantityQuery("exists", { metric: "latency", within: "latency-ceiling" }));
  assert.equal(decide.result.outcome, "unlicensed");
  assert.equal(decide.refusal?.reason, "quantifier-mismatch");
});

// ---------------------------------------------------------------------------------------------
// The Q5 shape through the query surface
// ---------------------------------------------------------------------------------------------

test("an unbounded maximum measures as a LASSO witness with NO magnitude — no finite number is true", () => {
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
  const res = runQuery(poller, quantityQuery("exists", { metric: "latency" })).result;
  assert.equal(res.outcome, "holds");
  assert.equal(res.evidence?.shape, "lasso");
  assert.equal(res.evidence?.role, "witness");
  assert.ok((res.evidence?.cycle?.length ?? 0) > 0);
  assert.equal(res.magnitude, null, "no finite magnitude stands in for an unbounded maximum");
  assert.ok(res.compilation.some((c) => c.explanation.includes("unbounded")));
});

// ---------------------------------------------------------------------------------------------
// Determinism, and the one join the compiler cannot hold
// ---------------------------------------------------------------------------------------------

test("the same quantity query evaluates identically twice", () => {
  const s = pipeline();
  const ask = (): unknown => runQuery(s, quantityQuery("forall", { metric: "latency", within: "latency-ceiling" }));
  assert.deepEqual(ask(), ask());
  const measure = (): unknown => runQuery(s, quantityQuery("exists", { metric: "peak_memory" }));
  assert.deepEqual(measure(), measure());
});

test("the schema's metric enum names exactly REQUIREMENT_METRICS — the engine-forms split, held", () => {
  // Same two-copies-by-necessity shape as test/engine-forms.test.ts: the schema is the published
  // wire authority and cannot import from TS, so the join is held by a test instead of a compiler.
  const schema = JSON.parse(readFileSync("mage-query.schema.json", "utf8")) as {
    $defs: { quantityQuery: { properties: { metric: { enum: readonly string[] } } } };
  };
  assert.deepEqual(
    [...schema.$defs.quantityQuery.properties.metric.enum].sort(),
    [...REQUIREMENT_METRICS].sort(),
    "mage-query.schema.json's quantityQuery.metric enum drifted from REQUIREMENT_METRICS");
});
