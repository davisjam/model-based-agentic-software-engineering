// Behavioural evidence must SAY WHICH STATE THE SYSTEM WAS IN — at every step, through the
// published seam, after the exact operation an in-page reader performs on it.
//
// ## The failure this file exists to catch, measured before it was fixed
//
// The 261006 lab-solver run — a browser-driving agent working the shipped labs from `window.mage`
// alone, never opening `src/` — found every witness and counterexample step arriving as
// `from: {control: {}, values: {}}`, verified in-page with `JSON.stringify`. The cause: evidence
// steps aliased the walk's `Configuration` Maps, and `JSON.stringify` serializes a Map as `{}` —
// silently. The agent reconstructed traces from transition labels, which worked only because the
// shipped machines are small and well-labelled; on a larger machine a counterexample whose states
// are empty forces guessing about the one thing a counterexample exists to pin down. The query
// schema's `step` definition promised per-step variable maps the whole time (and promised them
// under a `machines` key the product never shipped).
//
// Nothing caught it because every existing consumer read the IN-PROCESS object: the node tests
// held Maps, the narrator iterated Maps, structured clone across the Worker carries Maps. The one
// reader with no Map access — anything on the far side of `JSON.stringify` — had no test. So the
// assertions here run on `JSON.parse(JSON.stringify(result))` of what the published seam returns,
// which is precisely the object an agent in a page gets.
//
// ## What is held
//
//  1. SERIALIZATION FIDELITY — the JSON round-trip of a result deep-equals the original. A Map
//     anywhere in evidence fails this immediately (it round-trips to `{}`).
//  2. COMPLETENESS — each step's `from`/`to` carry EVERY instance's control state and EVERY
//     `<instance>.<variable>` value, per §6's definition of a configuration. Non-emptiness alone
//     would pass a half-dropped configuration.
//  3. SCHEMA SHAPE — each step matches the published `$defs/step`/`$defs/stepConfiguration`
//     contract: exact key set, scalar value types. Asserted structurally rather than through a
//     validator dependency, against the schema FILE's own declared property sets, so the schema
//     and the product cannot drift apart in either direction without a failure naming the key.
//  4. CONVERTER FAITHFULNESS — `stepConfiguration`/`liftConfiguration` are mutually inverse and
//     key-stable (`stepConfigKey ∘ stepConfiguration = configKey`), which is what entitles
//     `test/ltl-evidence.ts` to lift published evidence back into the engine and replay it.
//  5. THE CENSUS IS NON-VACUOUS — the walk below must find behavioural evidence in the corpus, and
//     more than one example of it. A sweep that found nothing would pass every per-step assertion.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { configKey, liftConfiguration, stepConfigKey, stepConfiguration } from "../src/ir/types.ts";
import type { EvidenceStep, QueryResult, Scalar } from "../src/ir/types.ts";
import { EXAMPLE_IDS, loadExample } from "../scripts/gen-example-coverage.ts";
import type { LoadedExample } from "../scripts/gen-example-coverage.ts";

// ----------------------------------------------------------------------------------------------
// The published schema's own key sets — read from the file, so drift fails rather than passes
// ----------------------------------------------------------------------------------------------

const QUERY_SCHEMA = JSON.parse(readFileSync("mage-query.schema.json", "utf8")) as {
  $defs: Record<string, { properties?: Record<string, unknown>; required?: readonly string[] }>;
};

const defKeys = (name: string): readonly string[] => {
  const d = QUERY_SCHEMA.$defs[name];
  assert.ok(d?.properties !== undefined, `the query schema must define $defs/${name}`);
  return Object.keys(d.properties).sort();
};

const isScalar = (v: unknown): v is Scalar =>
  typeof v === "string" || typeof v === "boolean" ||
  (typeof v === "number" && Number.isInteger(v));

// ----------------------------------------------------------------------------------------------
// The walk: every saved query of every shipped example, through the published results
// ----------------------------------------------------------------------------------------------

interface Found {
  readonly where: string;
  readonly result: QueryResult;
  readonly steps: readonly EvidenceStep[];
}

function behaviouralEvidence(): readonly Found[] {
  const out: Found[] = [];
  for (const id of EXAMPLE_IDS) {
    const ex: LoadedExample = loadExample(id);
    for (const [queryId, result] of ex.workspace.runSavedQueries()) {
      const ev = result.evidence;
      if (ev === null) continue;
      const steps = [...ev.steps, ...(ev.cycle ?? [])];
      if (steps.length === 0) continue;
      out.push({ where: `${id}/${queryId}`, result, steps });
    }
  }
  return out;
}

const FOUND = behaviouralEvidence();

test("the corpus yields behavioural evidence to check — the census is not vacuous", () => {
  assert.ok(FOUND.length >= 3,
    `expected several saved queries across the shipped examples to carry step evidence; found ` +
    `${FOUND.length}. If the corpus genuinely changed, this floor moves with it — but a sweep ` +
    `that checks nothing proves nothing.`);
  const examples = new Set(FOUND.map((f) => f.where.split("/")[0]));
  assert.ok(examples.size >= 2, "step evidence must come from more than one example");
});

test("every published result survives JSON exactly — the in-page reader's operation", () => {
  for (const { where, result } of FOUND) {
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result,
      `${where}: the result must deep-equal its own JSON round-trip. A Map anywhere inside ` +
      `serializes to {} silently, which is how every witness shipped empty configurations.`);
  }
});

test("every step's configurations are COMPLETE: all control states, all variable values", () => {
  for (const id of EXAMPLE_IDS) {
    const ex = loadExample(id);
    const system = ex.workspace.state.system;
    const instances = [...system.instances].map((i) => i.id).sort();
    const variableKeys: string[] = [];
    for (const inst of system.instances) {
      const machine = system.machines.get(inst.machine);
      for (const v of machine?.variables.values() ?? []) variableKeys.push(`${inst.id}.${v.id}`);
    }
    variableKeys.sort();

    for (const { where, steps } of FOUND.filter((f) => f.where.startsWith(`${id}/`))) {
      steps.forEach((step, i) => {
        for (const cfg of [step.from, step.to]) {
          assert.deepEqual(Object.keys(cfg.control).sort(), instances,
            `${where} step ${i + 1}: control must name every instance's state — a trace that ` +
            `cannot say which state the system was in defeats the purpose of a trace`);
          assert.deepEqual(Object.keys(cfg.values).sort(), variableKeys,
            `${where} step ${i + 1}: values must carry every <instance>.<variable>`);
        }
      });
    }
  }
});

test("every step matches the published step/stepConfiguration schema shape", () => {
  const stepKeys = defKeys("step");
  const cfgKeys = defKeys("stepConfiguration");
  assert.deepEqual(cfgKeys, ["control", "values"]);
  for (const { where, steps } of FOUND) {
    steps.forEach((raw, i) => {
      const step = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
      const at = `${where} step ${i + 1}`;
      for (const key of Object.keys(step)) {
        assert.ok(stepKeys.includes(key),
          `${at}: publishes key '${key}' the schema's $defs/step does not declare`);
      }
      assert.ok(Array.isArray(step["instances"]) && step["instances"].every((m) => typeof m === "string"),
        `${at}: instances must be an array of ids`);
      assert.ok(step["sync"] === null || typeof step["sync"] === "string", `${at}: sync`);
      assert.ok(step["label"] === null || typeof step["label"] === "string", `${at}: label`);
      for (const side of ["from", "to"] as const) {
        const cfg = step[side] as Record<string, unknown>;
        assert.deepEqual(Object.keys(cfg).sort(), cfgKeys, `${at}: ${side} must be a configuration`);
        const control = cfg["control"] as Record<string, unknown>;
        const values = cfg["values"] as Record<string, unknown>;
        assert.ok(Object.values(control).every((v) => typeof v === "string"),
          `${at}: ${side}.control values are state ids`);
        assert.ok(Object.values(values).every(isScalar),
          `${at}: ${side}.values are scalars`);
      }
    });
  }
});

test("the converters are faithful: stepConfiguration and liftConfiguration are inverse, key-stable", () => {
  let checked = 0;
  for (const { steps } of FOUND) {
    for (const step of steps) {
      for (const cfg of [step.from, step.to]) {
        const lifted = liftConfiguration(cfg);
        assert.equal(configKey(lifted), stepConfigKey(cfg),
          "lifting a published configuration must preserve its canonical key");
        assert.deepEqual(stepConfiguration(lifted), cfg,
          "publishing a lifted configuration must return the original");
        checked += 1;
      }
    }
  }
  assert.ok(checked > 0, "the inverse pin must have checked something");
});
