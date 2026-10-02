// Quantities: the representation layer, and the five rules over it (V27-V31).
//
// The first test is the one to read. §6 makes "quantities are not state" a hard semantic boundary,
// and the shortcut it forbids is the only unrecoverable one in this phase: a real-valued annotation
// in the state vector makes the reachable space infinite while the walk keeps reporting
// `Coverage.kind: "exhaustive"`, and that flag licenses the strongest claims the workbench makes.
// Counting configurations with and against the same model is that boundary, executable.
//
// Nothing here evaluates a quantity. Summing a trace's latency needs an accounting model the spec
// does not declare, and `memory(c)` turns on an undefined "active" -- both are recorded as open
// questions in DESIGN-quantities-261002.md §8 rather than guessed at, because a guess would be
// baked into fixtures and then into expectations.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash } from "../src/ir/hash.ts";
import { checkQuantities, validate } from "../src/validator/rules.ts";
import { compileSystem, defaultOptions, exploreSpace } from "../src/engine/explore.ts";
import {
  DIMENSIONS, DIMENSION_IDS, METRIC_NAMES, UNIT_DIMENSIONS, configKey, isPlainDecimal, modelMetrics,
} from "../src/ir/types.ts";
import type { CanonicalSystem, Dimension, Finding, Magnitude } from "../src/ir/types.ts";

const base = {
  mage: 1,
  system: { id: "t" },
  entities: { cache: {}, parser: {} },
  "relation-types": { calls: { description: "d", composition: { path: "allowed" } } },
  models: { g: { type: "graph", entities: ["cache", "parser"], relations: [{ id: "edge", from: "parser", to: "cache", type: "calls" }] } },
  machines: {
    document: {
      initial: "waiting",
      states: { waiting: null, parsing: null },
      variables: { retry_count: { type: "integer", range: [0, 3] } },
      transitions: [
        { from: "waiting", to: "parsing", label: "parse" },
        { from: "parsing", to: "waiting", effects: { retry_count: "retry_count + 1" } },
      ],
    },
  },
};

const withQuantities = (quantities: unknown): CanonicalSystem => canonicalize({ ...base, quantities });

const findings = (quantities: unknown): readonly Finding[] => checkQuantities(withQuantities(quantities));
const rules = (quantities: unknown): string[] => findings(quantities).map((f) => f.rule);

/** One quantity on a target that always resolves, so only the value under test can fire. */
const one = (spec: Record<string, unknown>): unknown => ({ q: { target: "entity:cache", ...spec } });

const magnitudeOf = (s: CanonicalSystem, id = "q"): Magnitude => {
  const v = s.quantities.get(id)?.value;
  assert.ok(v?.kind === "point", `expected a point value for '${id}'`);
  return v.magnitude;
};

const configCount = (s: CanonicalSystem): number => {
  const c = compileSystem(s);
  assert.ok(c.ok, c.ok ? "" : c.refusal);
  return exploreSpace(c.value, defaultOptions(10_000)).configs.length;
};

// ---------------------------------------------------------------------------------------------
// Task 1 -- the hard boundary
// ---------------------------------------------------------------------------------------------

test("quantities do not enter the state vector", () => {
  // The unrecoverable shortcut. If a quantity reached `Configuration`, this count would grow with
  // every annotation and `exhaustive` coverage would become a claim no finite walk can support.
  const plain = canonicalize(base);
  const annotated = withQuantities({
    "parse-latency": { target: "transition:document#0", dimension: "duration", value: "20 ms" },
    "cache-memory": { target: "entity:cache", dimension: "memory", value: "128 MB" },
    "hit-rate": { target: "entity:cache", dimension: "ratio", value: 0.8 },
  });
  assert.equal(annotated.quantities.size, 3, "fixture drift: the quantities did not load");
  assert.equal(configCount(annotated), configCount(plain));

  // Not merely the same COUNT -- the same configurations. A different space of the same size would
  // satisfy a count and still be a different system.
  const keys = (s: CanonicalSystem): string[] => {
    const c = compileSystem(s);
    assert.ok(c.ok, c.ok ? "" : c.refusal);
    return exploreSpace(c.value, defaultOptions(10_000)).configs.map(configKey).sort();
  };
  assert.deepEqual(keys(annotated), keys(plain));
});

test("a quantity IS semantic, so it moves the hash -- unlike a note", () => {
  // The contrast that locates the formal boundary: a note saying "latency is probably 200 ms"
  // cannot change a latency query, and a declared `200 ms` must. Invariant A1 keeps notes out of
  // the hash; this keeps quantities in it.
  const plain = systemHash(canonicalize(base));
  const annotated = systemHash(withQuantities(one({ dimension: "memory", value: "1 MB" })));
  assert.notEqual(annotated, plain);

  // And the DECLARED UNIT is cosmetic: 1 MB and 1024 KB are one quantity, so rewriting the unit
  // must not invalidate a pending transaction.
  assert.equal(systemHash(withQuantities(one({ dimension: "memory", value: "1024 KB" }))), annotated);
  assert.notEqual(systemHash(withQuantities(one({ dimension: "memory", value: "2 MB" }))), annotated);
});

// ---------------------------------------------------------------------------------------------
// Task 2 -- dimensions, units, normalization
// ---------------------------------------------------------------------------------------------

test("every unit normalizes to its dimension's base", () => {
  const normalized = (dimension: Dimension, value: unknown): number | null =>
    magnitudeOf(withQuantities(one({ dimension, value }))).base;

  assert.equal(normalized("duration", "250 ms"), 250);
  assert.equal(normalized("duration", "2 s"), 2000);
  assert.equal(normalized("memory", "128 KB"), 0.125);
  assert.equal(normalized("memory", "1 MB"), 1);
  assert.equal(normalized("memory", "1 GB"), 1024);
  assert.equal(normalized("cost", "3 usd"), 3);
  // The dimensionless pair take the number as written.
  assert.equal(normalized("ratio", 0.8), 0.8);
  assert.equal(normalized("count", 3), 3);
});

test("the unit factors are exact in binary floating point", () => {
  // The reason a normalized magnitude is a plain float64 and not a rational. Every factor is an
  // integer multiple of a power of two, so the conversion introduces no rounding. A proposed
  // `us: 0.001` would break that and this is the gate that says so, rather than a later equality
  // assertion failing by 2e-16 in a test nobody connects to the unit table.
  for (const d of DIMENSION_IDS) {
    for (const [unit, factor] of Object.entries(DIMENSIONS[d].units)) {
      assert.ok(Number.isInteger(factor * 2 ** 20),
        `${d}.${unit} = ${factor} is not an integer multiple of 2^-20, so conversion will round`);
    }
  }
  // The consequence, concretely: the sum an evaluator will eventually compute is exact.
  const kb = magnitudeOf(withQuantities(one({ dimension: "memory", value: "128 KB" }))).base ?? 0;
  const mb = magnitudeOf(withQuantities(one({ dimension: "memory", value: "1 MB" }))).base ?? 0;
  assert.equal(kb + mb, 1.125);
});

test("no unit is claimed by two dimensions", () => {
  // Unit-to-dimension inference inside an expression rests on this: `2 ms` is a duration because
  // `ms` belongs to exactly one dimension. A shared token would make the inference a coin flip.
  let units = 0;
  for (const d of DIMENSION_IDS) units += Object.keys(DIMENSIONS[d].units).length;
  assert.equal(UNIT_DIMENSIONS.size, units);
});

test("the plain-decimal grammar refuses every spelling the two loaders disagree on", () => {
  // Measured: PyYAML reads 017 as 15, 1_000 as 1000, 1:30 as 90; the `yaml` package reads 17,
  // "1_000" and "1:30". A unit-bearing literal is a STRING, so refusing these closes the class.
  for (const bad of ["017", "1_000", "1e3", "1:30", "0x10", "0b101", ".5", "1.", "+1", ""]) {
    assert.ok(!isPlainDecimal(bad), `'${bad}' must be refused`);
  }
  for (const good of ["0", "250", "0.8", "1024", "-1"]) {
    assert.ok(isPlainDecimal(good), `'${good}' must be accepted`);
  }
});

test("canonicalization is deterministic over quantities", () => {
  // The hash is the transaction base, so a quantity that canonicalized two ways would reject a
  // pending agent transaction at random.
  const doc = {
    ...base,
    quantities: {
      b: { target: "entity:cache", dimension: "memory", value: "128 KB" },
      a: { target: "relation:edge", dimension: "duration", range: ["100 ms", "500 ms"] },
      c: { target: "model:g", dimension: "duration", value: { expression: "metrics.state_count * 2 ms" } },
    },
  };
  const first = canonicalize(doc);
  const second = canonicalize(doc);
  assert.equal(systemHash(first), systemHash(second));
  assert.deepEqual([...first.quantities.keys()], ["a", "b", "c"]);
  assert.deepEqual([...second.quantities.values()], [...first.quantities.values()]);
});

// ---------------------------------------------------------------------------------------------
// Task 3 -- scope follows the dimension
// ---------------------------------------------------------------------------------------------

test("scope is derived from the dimension, not authored", () => {
  // §8: memory over configurations, latency and cost over executions. Deriving it is what makes
  // "sum this memory along a path" a category error the types refuse rather than a number
  // something computes.
  const scopeOf = (dimension: Dimension): string | null =>
    withQuantities(one({ dimension, value: dimension === "memory" ? "1 MB" : "1 ms" })).quantities.get("q")?.scope ?? null;
  assert.equal(scopeOf("memory"), "configuration");
  assert.equal(scopeOf("duration"), "execution");
  assert.equal(DIMENSIONS.cost.scope, "execution");
  // `structural` is this implementation's addition to the ruling's two members, and the reason is
  // the same one that motivates the field: a hit rate aggregates along NEITHER axis, so filing it
  // under `execution` would license summing hit rates along a path.
  assert.equal(DIMENSIONS.ratio.scope, "structural");
  assert.equal(DIMENSIONS.count.scope, "structural");

  // An authored scope is ignored outright rather than honoured for one quantity. The schema refuses
  // the key as well; this pins the IR so the derivation does not quietly become a read.
  const forced = withQuantities({ q: { target: "entity:cache", dimension: "memory", value: "1 MB", scope: "execution" } });
  assert.equal(forced.quantities.get("q")?.scope, "configuration");
});

// ---------------------------------------------------------------------------------------------
// Task 4 -- V27, no dangling annotations
// ---------------------------------------------------------------------------------------------

test("V27 reports a quantity whose target does not exist", () => {
  // The V26 failure one layer up: an annotation pointing at a deleted transition is not invalid,
  // it is WRONG, and nothing says so unless a rule does.
  for (const target of [
    "entity:ghost", "model:ghost", "relation:ghost", "state:document.ghost", "state:ghost",
    "transition:document#9", "transition:ghost#0", "component:cache", "entity:", "cache",
  ]) {
    assert.deepEqual(rules({ q: { target, dimension: "count", value: 1 } }), ["V27"], `target '${target}'`);
  }
});

test("V27 accepts every address that resolves -- the negative control", () => {
  for (const target of [
    "entity:cache", "model:g", "relation:edge", "state:document.waiting", "state:parsing",
    "transition:document#0", "transition:document#1",
  ]) {
    assert.deepEqual(rules({ q: { target, dimension: "count", value: 1 } }), [], `target '${target}'`);
  }
});

test("V27 refuses a bare state name two machines both declare", () => {
  // src/engine/refs.ts refuses an ambiguous bare reference rather than picking a machine, and an
  // annotation silently landing on one of two machines is the same defect with no error channel.
  const doc = {
    ...base,
    machines: {
      a: { initial: "idle", states: { idle: null }, transitions: [] },
      b: { initial: "idle", states: { idle: null }, transitions: [] },
    },
    quantities: { q: { target: "state:idle", dimension: "count", value: 1 } },
  };
  const found = checkQuantities(canonicalize(doc));
  assert.deepEqual(found.map((f) => f.rule), ["V27"]);
  assert.match(found[0]?.message ?? "", /2 machines declare a state 'idle'/);
});

test("V27 calls a parameter target a reserved shape, not a missing object", () => {
  // v0.1 represents no parameters at all, so "no such parameter" would send the author looking for
  // a declaration they cannot write. V15 gives `ref` variables the same treatment.
  const found = findings({ q: { target: "parameter:batch_size", dimension: "count", value: 8 } });
  assert.deepEqual(found.map((f) => f.rule), ["V27"]);
  assert.match(found[0]?.message ?? "", /reserved future shape/);
});

test("V27 resolves an expression's references too", () => {
  const ok = { target: "entity:cache", dimension: "duration", value: "1 ms" };
  assert.deepEqual(rules({
    ok, q: { target: "model:g", dimension: "duration", value: { expression: "ok * 2" } },
  }), []);
  assert.deepEqual(rules({
    ok, q: { target: "model:g", dimension: "duration", value: { expression: "ghost * 2" } },
  }), ["V27"]);
  assert.deepEqual(rules({
    q: { target: "model:g", dimension: "count", value: { expression: "metrics.bogus" } },
  }), ["V27"]);
  assert.deepEqual(rules({
    q: { target: "model:g", dimension: "count", value: { expression: "metrics" } },
  }), ["V27"]);
});

// ---------------------------------------------------------------------------------------------
// Task 5 -- V31, the reserved namespace
// ---------------------------------------------------------------------------------------------

test("V31 reports a user identifier that shadows `metrics`", () => {
  // §10 requires the distinction between a fact FROM the model and one ABOUT the modeled system to
  // be explicit. An entity named `metrics` would make `metrics.state_count` read as that entity's
  // member, and the distinction stops being visible on the page.
  const shadow = (doc: Record<string, unknown>): string[] =>
    checkQuantities(canonicalize({ mage: 1, system: { id: "t" }, ...doc })).map((f) => f.rule);

  assert.deepEqual(shadow({ entities: { metrics: {} } }), ["V31"]);
  assert.deepEqual(shadow({ models: { metrics: { type: "graph", entities: [] } } }), ["V31"]);
  assert.deepEqual(shadow({ domains: { metrics: { type: "boolean" } } }), ["V31"]);
  assert.deepEqual(shadow({
    machines: { m: { initial: "s", states: { s: null }, transitions: [], variables: { metrics: { type: "boolean" } } } },
  }), ["V31"]);
  assert.deepEqual(shadow({
    machines: { m: { initial: "metrics", states: { metrics: null }, transitions: [] } },
  }), ["V31"]);
  // The negative control: a name that merely contains the word is nobody's problem.
  assert.deepEqual(shadow({ entities: { metrics_dashboard: {}, my_metrics: {} } }), []);
});

test("the model metrics count declared structure, never reachable configurations", () => {
  // A metric that depended on exploration would stop being a fact about the MODEL. `document` has
  // two states and two transitions; its reachable configuration count is eight.
  const m = modelMetrics(canonicalize(base));
  assert.deepEqual(m, { state_count: 2, transition_count: 2, entity_count: 2, relation_count: 1 });
  assert.deepEqual([...METRIC_NAMES].sort(), Object.keys(m).sort());
  assert.notEqual(m.state_count, configCount(canonicalize(base)));
});

// ---------------------------------------------------------------------------------------------
// Task 6 -- V28, V29, V30
// ---------------------------------------------------------------------------------------------

test("V28 refuses a bare number where the dimension carries units", () => {
  // The dimension bug this feature exists to prevent, committed by the feature itself: `250` with
  // dimension duration means 250 of something, and nothing on the page says what.
  const found = findings(one({ dimension: "duration", value: 250 }));
  assert.deepEqual(found.map((f) => f.rule), ["V28"]);
  assert.match(found[0]?.message ?? "", /is a bare number, and duration is measured in ms, s/);
  // The negative control, both directions: a unit where one is wanted, and none where it is not.
  assert.deepEqual(rules(one({ dimension: "duration", value: "250 ms" })), []);
  assert.deepEqual(rules(one({ dimension: "ratio", value: 0.8 })), []);
  // And a unit on a dimensionless dimension is the mirror fault.
  assert.deepEqual(rules(one({ dimension: "ratio", value: "0.8 ms" })), ["V28"]);
});

test("V28 refuses an unknown dimension, and then declines to say more", () => {
  // The dimension is the quantity's type. Every magnitude complaint that followed would be a
  // consequence of the same mistake, which is V26's discipline applied inside this family.
  const found = findings({ q: { target: "entity:ghost", dimension: "bytes", value: "nonsense" } });
  assert.deepEqual(found.map((f) => f.rule), ["V27", "V28"]);
  assert.match(found[1]?.message ?? "", /dimension 'bytes' is not one of duration, memory, cost, ratio, count/);
});

test("V28 refuses an unrecognised unit and a loader-ambiguous spelling", () => {
  assert.deepEqual(rules(one({ dimension: "duration", value: "250 furlongs" })), ["V28"]);
  assert.deepEqual(rules(one({ dimension: "duration", value: "017 ms" })), ["V28"]);
  assert.deepEqual(rules(one({ dimension: "duration", value: "1_000 ms" })), ["V28"]);
  assert.deepEqual(rules(one({ dimension: "count", value: "1e3" })), ["V28"]);
  assert.deepEqual(rules(one({ dimension: "duration" })), ["V28"]);
});

test("V28 refuses an expression that is not v0.1 syntax", () => {
  const expr = (expression: string): string[] =>
    rules({ q: { target: "model:g", dimension: "duration", value: { expression } } });
  assert.deepEqual(expr("(2 ms)"), ["V28"]);
  assert.deepEqual(expr("2 ms +"), ["V28"]);
  assert.deepEqual(expr(""), ["V28"]);
  // The negative control: §10's own example, and §7's valid addition.
  assert.deepEqual(expr("metrics.state_count * 2 ms"), []);
  assert.deepEqual(expr("250 ms + 2 s"), []);
});

test("V29 holds a ratio inside [0, 1]", () => {
  const found = findings(one({ dimension: "ratio", value: 1.3 }));
  assert.deepEqual(found.map((f) => f.rule), ["V29"]);
  assert.match(found[0]?.message ?? "", /above the maximum 1 for ratio/);
  // The negative control, including both endpoints: a rule that fires on everything buys nothing.
  for (const value of [0, 0.8, 1]) assert.deepEqual(rules(one({ dimension: "ratio", value })), []);
  // And the ceiling belongs to `ratio` alone -- 1024 MB is not out of bounds.
  assert.deepEqual(rules(one({ dimension: "memory", value: "1024 MB" })), []);
});

test("V29 refuses a negative magnitude and a reversed range", () => {
  // §29 ⑥ grants safety to "monotone nonnegative interval expressions", and a memory of -1 MB
  // models nothing.
  assert.deepEqual(rules(one({ dimension: "memory", value: "-1 MB" })), ["V29"]);
  assert.deepEqual(rules(one({ dimension: "count", value: -1 })), ["V29"]);
  const found = findings(one({ dimension: "memory", range: ["1 GB", "1 MB"] }));
  assert.deepEqual(found.map((f) => f.rule), ["V29"]);
  assert.match(found[0]?.message ?? "", /reversed: 1024 > 1 in MB/);
  // The negative control: ordered, and equal, are both fine -- a point interval is a range.
  assert.deepEqual(rules(one({ dimension: "duration", range: ["100 ms", "500 ms"] })), []);
  assert.deepEqual(rules(one({ dimension: "memory", range: ["1024 MB", "1 GB"] })), []);
});

test("V30 refuses a unit from another dimension", () => {
  // Reported apart from V28 because the unit is real and the author's mistake is the pairing, not
  // the spelling. §7: do not silently coerce dimensions.
  const found = findings(one({ dimension: "duration", value: "128 MB" }));
  assert.deepEqual(found.map((f) => f.rule), ["V30"]);
  assert.match(found[0]?.message ?? "", /is measured in memory, but this quantity declares duration/);
});

test("V30 refuses arithmetic across incompatible dimensions", () => {
  const expr = (expression: string, dimension = "duration"): string[] =>
    rules({ q: { target: "model:g", dimension, value: { expression } } });

  // §7's three examples, verbatim.
  assert.deepEqual(expr("250 ms + 2 s"), []);
  assert.deepEqual(expr("128 MB + 1 GB", "memory"), []);
  assert.deepEqual(expr("250 ms + 128 MB"), ["V30"]);

  // A product carries at most one dimension; a divisor carries none.
  assert.deepEqual(expr("2 ms * 3 ms"), ["V30"]);
  assert.deepEqual(expr("10 ms / 2 ms"), ["V30"]);
  assert.deepEqual(expr("metrics.state_count * 2 ms"), []);
  assert.deepEqual(expr("20 ms / 4"), []);

  // And the result must match what the quantity declares.
  assert.deepEqual(expr("2 ms", "memory"), ["V30"]);
  // A tally and a proportion are both pure numbers, so a count-over-count expression satisfies a
  // declared ratio. The [0, 1] ceiling is V29's job, on the literal, where it can be checked.
  assert.deepEqual(expr("metrics.entity_count / metrics.state_count", "ratio"), []);
});

test("V30 declines when an operand never resolved", () => {
  // A guessed dimension mismatch would send the author hunting for the wrong defect, so the
  // unresolved reference is reported alone.
  assert.deepEqual(rules({
    q: { target: "model:g", dimension: "memory", value: { expression: "ghost + 2 ms" } },
  }), ["V27"]);
  assert.deepEqual(rules({
    broken: { target: "entity:cache", dimension: "bytes", value: 1 },
    q: { target: "model:g", dimension: "memory", value: { expression: "broken + 2 MB" } },
  }), ["V28"]);
});

test("V25 still runs first and exclusively, so a coerced model reports no quantity finding", () => {
  // A coerced id means the loaded model is not the written one, and a dangling-target complaint
  // about it would blame the author for the loader's edit.
  const found = validate(canonicalize({
    ...base,
    machines: { m: { initial: "a", states: { a: null, off: null }, transitions: [] } },
    quantities: { q: { target: "entity:ghost", dimension: "bytes", value: "nope" } },
  }));
  assert.deepEqual([...new Set(found.map((f) => f.rule))], ["V25"]);
});
