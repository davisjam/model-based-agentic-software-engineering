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

test("a ceiling decided over SELECTED executions: forall + within + target, all three", () => {
  // "Are all SUCCESSFUL executions under the declared ceiling?" — `learn-1.md` §7's second quantity
  // question, and the one composition the three fields admit together that nothing pinned. The
  // ceiling and the selection resolve independently and both reach `evaluatePath`, so the triple was
  // implemented and unexercised: `DESIGN-v02-quantification-261004.md` §4.3 found it by probing.
  //
  // Pinned as a PAIR against the same ceiling, because the pair is the property. Over every
  // execution the 300 ms ceiling is refuted at 400 (one retry: 50 + 2·100 + 2·75). Over the
  // retry-free executions alone it holds at 225. Same metric, same ceiling, opposite verdict —
  // decided by `target` and by nothing else. A single-verdict pin would pass with the selection
  // silently ignored, which is the failure this shape exists to catch.
  const selected = runQuery(pipeline(), quantityQuery("forall", {
    metric: "latency",
    within: "latency-ceiling",
    target: { "document.state": "published", "document.retry_count": 0 },
  })).result;
  assert.equal(selected.outcome, "holds");
  assert.equal(selected.coverage.kind, "exhaustive");
  assert.deepEqual(selected.magnitude,
    { value: 225, dimension: "duration", unit: DIMENSIONS.duration.base });
  // The ceiling and the selection must BOTH be disclosed, or a reader cannot tell which executions
  // the verdict is about.
  assert.match(selected.interpretedAs ?? "", /latency-ceiling/);
  assert.match(selected.interpretedAs ?? "", /published/);

  const everything = runQuery(pipeline(),
    quantityQuery("forall", { metric: "latency", within: "latency-ceiling" })).result;
  assert.equal(everything.outcome, "refuted",
    "without the selection the same ceiling must be refuted, or the target changed nothing");
  assert.equal(everything.magnitude?.value, 400);
});

// ---------------------------------------------------------------------------------------------
// Vacuity — the verdict stays `holds`, and the result says how it was reached
// ---------------------------------------------------------------------------------------------

/** The kinds the published wire format admits, read from the schema rather than restated here. */
const publishedCompilationKinds = (): readonly string[] => {
  const schema = JSON.parse(readFileSync("mage-query.schema.json", "utf8")) as {
    $defs: { result: { properties: { compilation: { items: { properties: {
      kind: { enum: string[] } } } } } } };
  };
  const kinds = schema.$defs.result.properties.compilation.items.properties.kind.enum;
  assert.ok(kinds.length > 0, "the schema declares no compilation kinds; the join below is vacuous");
  return kinds;
};

test("a ceiling over an empty selected set holds VACUOUSLY, and says so in a typed channel", () => {
  // `DESIGN-v02-quantification-261004.md` §3.1. A universal over an empty set is true, which is
  // the trap: `holds` is the sound answer and a reader takes it for an earned one. The ruling is
  // not to re-verdict it and not to add a fifth `Outcome` — it is that the result must disclose
  // how it was reached, in something a renderer and an agent can branch on.
  //
  // `ge: 9` is outside retry_count's declared [0, 1] domain, so no configuration satisfies the
  // selection and no execution reaches it. Same shape as the refuted existential at :104, opposite
  // polarity: absence refutes an existential and satisfies a universal.
  const vacuous = runQuery(pipeline(), quantityQuery("forall", {
    metric: "latency", within: "latency-ceiling", target: { "document.retry_count": { ge: 9 } },
  })).result;

  // The verdict is UNCHANGED by this phase, and pinned so a later one cannot quietly re-verdict it.
  assert.equal(vacuous.outcome, "holds");
  assert.equal(vacuous.coverage.kind, "exhaustive");
  assert.equal(vacuous.magnitude, null, "nothing was charged, so there is no figure to report");

  // The disclosure, typed. REACHABILITY: this comes out of `runQuery` — the same entry a saved
  // query or an agent uses — so the arm is emitted by a live path and not merely declared in the
  // union. A union member no code path produces is the same vacuity one level up.
  const note = vacuous.compilation.find((c) => c.kind === "vacuous");
  assert.ok(note, "a vacuous holds carries no typed disclosure: `outcome` alone cannot say this");
  // The prose stays BESIDE the kind rather than being replaced by it — a consumer that branches on
  // the kind still has something to show a person.
  assert.match(note.explanation, /holds vacuously/);
  assert.match(note.explanation, /absence is the finding/);
  // And the kind must be representable on the wire, or the type and the published schema disagree
  // about a vocabulary they both own.
  assert.ok(publishedCompilationKinds().includes("vacuous"),
    "`vacuous` is in the TypeScript union and not in mage-query.schema.json's enum");

  // The pair, because a disclosure everything carries discloses nothing. The SAME ceiling over the
  // retry-free executions is charged against a real 225 ms and earned; it must not be tagged.
  const earned = runQuery(pipeline(), quantityQuery("forall", {
    metric: "latency", within: "latency-ceiling",
    target: { "document.state": "published", "document.retry_count": 0 },
  })).result;
  assert.equal(earned.outcome, "holds", "same verdict, so the kind is the only thing separating them");
  assert.ok(earned.magnitude !== null, "an earned holds charged the bound against something");
  assert.equal(earned.compilation.find((c) => c.kind === "vacuous"), undefined,
    "an earned holds must not claim vacuity, or the channel tags everything and tells nothing");
});

test("under ONE budget, bounded absence and vacuity are told apart by satisfiability (V44)", () => {
  // §3.2's line, RE-POINTED by V44 rather than relaxed — the direction its own successor took with
  // Phase A's BOUNDARY assertion. §3.2 was right that bounded absence is not vacuity, and wrong
  // about what distinguishes them: it read the COVERAGE, so it called every truncated absence
  // non-vacuous. The discriminator is the PREDICATE, so both arms are pinned here at the same
  // `limit` — which is what makes this a statement about satisfiability rather than about depth.
  //
  // VACUITY: this test would pass while the property is violated if `limit: 2` did not actually
  // truncate, because then both rows would be exhaustive and the pair would be agreement about
  // nothing. Both rows therefore assert `bounded` coverage, and the two rows differ ONLY in the
  // target — same system, same ceiling, same budget.

  // (a) SATISFIABLE and simply not reached yet: `published` is reachable in this pipeline, just not
  // within two configurations. Nothing holds, vacuously or otherwise — the truth is "not looked at",
  // and tagging it `vacuous` would be the stronger claim and the wrong one.
  const unexplored = runQuery(pipeline(), quantityQuery("forall", {
    metric: "latency", within: "latency-ceiling",
    target: { "document.state": "published" }, limit: 2,
  })).result;
  assert.equal(unexplored.outcome, "inconclusive");
  assert.equal(unexplored.coverage.kind, "bounded", "the budget must really bite, or this pair proves nothing");
  assert.equal(unexplored.compilation.find((c) => c.kind === "vacuous"), undefined,
    "a satisfiable selection the walk has not reached is bounded absence: 'not looked at', never "
    + "'true of nothing'");
  assert.ok(unexplored.compilation.some((c) => /truncated/.test(c.explanation)),
    "the truncation must still be disclosed in prose");

  // (b) UNSATISFIABLE at the SAME budget: `ge: 9` is outside retry_count's declared [0, 1] domain,
  // so no configuration the vector admits satisfies it. That is settled before the walk begins, so
  // the disclosure travels under truncation too — V41's letter, which the old reading withheld.
  const vacuous = runQuery(pipeline(), quantityQuery("forall", {
    metric: "latency", within: "latency-ceiling",
    target: { "document.retry_count": { ge: 9 } }, limit: 2,
  })).result;
  assert.equal(vacuous.outcome, "inconclusive", "the OUTCOME still follows coverage (V22) — unchanged");
  assert.equal(vacuous.coverage.kind, "bounded");
  assert.ok(vacuous.compilation.find((c) => c.kind === "vacuous"),
    "unsatisfiability is a fact about the predicate, so no budget may withhold the disclosure");
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
