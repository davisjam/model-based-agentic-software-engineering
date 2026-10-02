// Python/TypeScript parity for the numbered rules.
//
// Two implementations of one specification are worth having only if their disagreement is
// detectable. This test fixes a PARITY SET -- rules both sides implement -- and asserts the two
// agree exactly on it, for every model in the repo plus a battery of deliberate violations.
//
// Rules implemented by only one side are listed explicitly in ASYMMETRIC. That list is the honest
// record of where the implementations differ; a rule may only be there on purpose, and moving one
// out of it is how parity grows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { validate } from "../src/validator/rules.ts";
import type { Finding } from "../src/ir/types.ts";

/** Rules BOTH implementations enforce. Disagreement here is a failure. */
const PARITY = new Set([
  "V1", "V3", "V4", "V5", "V6", "V9", "V10", "V11", "V12", "V14", "V19", "V24", "V25", "V26",
  // The quantity family. Nothing in it is asymmetric: both sides carry the dimension table, so a
  // drifted unit factor surfaces here rather than as two tools disagreeing about one model.
  "V27", "V28", "V29", "V30", "V31",
  // The accounting family, and nothing in it is asymmetric either -- these are plain structural
  // checks over declared data, so both sides carry the same four closed tables (the metric map, the
  // basis vocabulary, the kinds a basis charges, the residency vocabulary). A drifted table shows up
  // here as one tool accepting a model the other refuses, which is the only way it would ever show.
  "V35", "V36", "V37",
  // Not a V-rule: A1 holds annotation outside semantics, so a V-number would contradict the
  // invariant the feature rests on. Both sides implement it, so it belongs in the parity set.
  "ANNOTATION",
]);

/** Known asymmetries, deliberate. Each needs a reason, not just an entry. */
const ASYMMETRIC: Record<string, string> = {
  V8: "TS only: relation-type acyclicity. Python reports it via the schema's own graph pass.",
  V13: "TS only: conflicting writes in one synchronized step.",
  V15: "Python only: `ref` variables are rejected at the schema layer in TS (generated types).",
  V17: "Both enforce finiteness, at DIFFERENT layers: the JSON Schema requires range-or-domain, so Python reports SCHEMA and skips its meaning pass, while TS has no runtime schema layer and reports V17. Found by this test, not by inspection.",
  V20: "Python only: ordered-domain typing of order comparisons in saved queries.",
  SCHEMA: "Python only: JSON Schema shape pass. TS gets shape from generated types at compile time.",
  QUERY: "Python only: asserted-query evaluation lives in validate.py and the workbench engine.",
  // §7.5 governs the SPARQL interface over the RDF projection. Both sides gate their OWN evaluator
  // from the relation-type declaration (V7), so the licensing rule itself is not asymmetric -- but the
  // second interface exists only in TypeScript, so there is no Python site these three could compare
  // against. They move out of this table when validate.py grows a SPARQL seam, which is not planned.
  V32: "TS only: the SPARQL licensing gate (src/sparql/licensing.ts). validate.py projects no RDF and exposes no SPARQL interface, so it has no second interface to gate.",
  V33: "TS only: the seam's refusal vocabulary (src/sparql/refusal.ts). validate.py emits a refusal SENTENCE from run_graph_query and has no structured-refusal channel to carry a cause.",
  V34: "TS only: named-graph scope selection. validate.py unions across every model by construction and never scopes to one, so the choice V34 forces does not arise there.",
};

const pyFindings = (yamlText: string): Finding[] => {
  const dir = mkdtempSync(join(tmpdir(), "mage-parity-"));
  const file = join(dir, "m.mage.yaml");
  writeFileSync(file, yamlText);
  const out = execFileSync("python3", ["validate.py", "--json", file], { encoding: "utf8" });
  return (JSON.parse(out) as { findings: Finding[] }).findings;
};

const tsFindings = (yamlText: string): readonly Finding[] => validate(canonicalize(parse(yamlText)));

const key = (f: Finding): string => `${f.rule} @ ${f.where}`;
const inParity = (f: Finding): boolean => PARITY.has(f.rule);

function assertParity(label: string, yamlText: string): void {
  const py = pyFindings(yamlText).filter(inParity).map(key).sort();
  const ts = tsFindings(yamlText).filter(inParity).map(key).sort();
  assert.deepEqual(ts, py, `parity mismatch on ${label}\n  python: ${py}\n  typescript: ${ts}`);
}

test("every asymmetry is declared with a reason", () => {
  for (const [rule, reason] of Object.entries(ASYMMETRIC)) {
    assert.ok(!PARITY.has(rule), `${rule} cannot be both parity and asymmetric`);
    assert.ok(reason.length > 20, `${rule} needs a real reason, not a placeholder`);
  }
});

test("repo models agree (and are clean)", () => {
  for (const f of ["examples/docable.mage.yaml", "models/workbench-components.mage.yaml"]) {
    const text = readFileSync(f, "utf8");
    assertParity(f, text);
    assert.deepEqual(tsFindings(text).filter(inParity), [], `${f} should be clean`);
  }
});

const base = { mage: 1, system: { id: "t" } };

test("violations agree, rule by rule", () => {
  const cases: [string, unknown][] = [
    ["V9 unknown initial", { ...base, machines: { m: { initial: "ghost", states: { a: null }, transitions: [] } } }],
    ["V10 unknown target", { ...base, machines: { m: { initial: "a", states: { a: null }, transitions: [{ from: "a", to: "x" }] } } }],
    ["V25 coercible state", { ...base, machines: { m: { initial: "a", states: { a: null, off: null }, transitions: [] } } }],
    ["V6 unknown entity", { ...base, entities: { e: { type: "s" } }, machines: { m: { entity: "ghost", initial: "a", states: { a: null }, transitions: [] } } }],
    ["V1 unknown event", { ...base, machines: { m: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b", sync: "nope" }] } } }],
    ["V14 multiplicity in sync", {
      ...base, events: { e: { participants: ["m", "w"] } },
      machines: {
        m: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b", sync: "e" }] },
        w: { instances: 2, initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b", sync: "e" }] },
      },
    }],
    ["V11 guard on multi", {
      ...base, machines: {
        w: { instances: 2, initial: "a", states: { a: null }, transitions: [] },
        m: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b", requires: { "w.state": "a" } }] },
      },
    }],
    ["V12 absent participant", {
      ...base, events: { e: { participants: ["m", "w"] } },
      machines: {
        m: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b", sync: "e" }] },
        w: { initial: "a", states: { a: null }, transitions: [] },
      },
    }],
    ["V19 derived cycle", { ...base, machines: { m: { initial: "a", states: { a: null }, transitions: [], derived: { x: "y + 1", y: "x + 1" } } } }],
    ["V5 two parents", { ...base, entities: { a: { contains: ["c"] }, b: { contains: ["c"] }, c: {} } }],
    ["V24 omits lies", {
      ...base,
      "relation-types": { calls: { description: "d", composition: { path: "allowed" } } },
      entities: { a: {}, b: {} },
      models: { g: { type: "graph", entities: ["a", "b"], purpose: { omits: ["calls"] }, relations: [{ from: "a", to: "b", type: "calls" }] } },
    }],
    ["V3 dangling relation", {
      ...base,
      "relation-types": { calls: { description: "d", composition: { path: "allowed" } } },
      entities: { a: {} },
      models: { g: { type: "graph", entities: ["a", "ghost"], relations: [{ from: "a", to: "ghost", type: "calls" }] } },
    }],
    ["V26 guard against an undeclared state", {
      ...base, machines: {
        w: { initial: "idle", states: { idle: null, held: null }, transitions: [] },
        m: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b", requires: { "w.state": "busy" } }] },
      },
    }],
    ["V26 integer comparand outside the range", {
      ...base, machines: {
        m: {
          initial: "a", states: { a: null, b: null },
          variables: { retry_count: { type: "integer", range: [0, 3] } },
          transitions: [{ from: "a", to: "b", requires: { retry_count: { gt: 9 } } }],
        },
      },
    }],
    ["ANNOTATION stray key from an unquoted comma", {
      ...base, entities: { e: { notes: [{ id: "n1", kind: "comment", text: "one thing", "and another": null }] } },
    }],
    ["V27 quantity targeting an undeclared entity", {
      ...base, entities: { cache: {} },
      quantities: { "cache-memory": { target: "entity:ghost", dimension: "memory", value: "1 MB" } },
    }],
    ["V27 transition index past the end", {
      ...base, machines: { document: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b" }] } },
      quantities: { parse: { target: "transition:document#9", dimension: "duration", value: "20 ms" } },
    }],
    ["V27 parameter is a reserved future shape", {
      ...base, quantities: { p: { target: "parameter:batch_size", dimension: "count", value: 8 } },
    }],
    ["V28 a bare number where a unit is required", {
      ...base, entities: { cache: {} },
      quantities: { q: { target: "entity:cache", dimension: "duration", value: 250 } },
    }],
    ["V28 a spelling the two loaders read differently", {
      // `017` is 15 to PyYAML and 17 to the `yaml` package. Quoted, it reaches our own parser, which
      // refuses it -- so the two tools cannot disagree about what the model says.
      ...base, entities: { cache: {} },
      quantities: { q: { target: "entity:cache", dimension: "duration", value: "017 ms" } },
    }],
    ["V29 a ratio above one", {
      ...base, entities: { cache: {} },
      quantities: { "hit-rate": { target: "entity:cache", dimension: "ratio", value: 1.3 } },
    }],
    ["V29 a reversed range, which exercises the GB and MB factors on both sides", {
      ...base, entities: { cache: {} },
      quantities: { q: { target: "entity:cache", dimension: "memory", range: ["1 GB", "1 MB"] } },
    }],
    ["V29 a reversed range across KB and MB", {
      ...base, entities: { cache: {} },
      quantities: { q: { target: "entity:cache", dimension: "memory", range: ["1 MB", "128 KB"] } },
    }],
    ["V30 a unit from another dimension", {
      ...base, entities: { cache: {} },
      quantities: { q: { target: "entity:cache", dimension: "duration", value: "128 MB" } },
    }],
    ["V30 addition across incompatible dimensions", {
      ...base, models: { g: { type: "graph", entities: [] } },
      quantities: { q: { target: "model:g", dimension: "duration", value: { expression: "250 ms + 128 MB" } } },
    }],
    ["V31 a user entity shadowing the reserved namespace", { ...base, entities: { metrics: {} } }],
    ["V35 a latency annotation with no declared accounting basis", {
      ...base, entities: { parse: {} },
      quantities: { "parse-latency": { target: "entity:parse", dimension: "duration", value: "50 ms" } },
    }],
    ["V35 a basis outside the closed vocabulary", {
      ...base, entities: { parse: {} }, accounting: { latency: { basis: "all" } },
      quantities: { "parse-latency": { target: "entity:parse", dimension: "duration", value: "50 ms" } },
    }],
    ["V35 a metric name that is really a dimension", {
      ...base, accounting: { memory: { basis: "entities" } },
    }],
    ["V36 a latency annotation on a kind entity accounting does not charge", {
      ...base, accounting: { latency: { basis: "entities" } },
      machines: { document: { initial: "a", states: { a: null, b: null }, transitions: [{ from: "a", to: "b" }] } },
      quantities: { q: { target: "transition:document#0", dimension: "duration", value: "50 ms" } },
    }],
    ["V37 a memory quantity declaring neither residency nor when", {
      ...base, entities: { cache: {} },
      quantities: { q: { target: "entity:cache", dimension: "memory", value: "128 MB" } },
    }],
    ["V37 a memory quantity declaring both", {
      ...base, entities: { cache: {} },
      machines: { document: { initial: "a", states: { a: null }, transitions: [] } },
      quantities: { q: {
        target: "entity:cache", dimension: "memory", value: "128 MB",
        residency: "resident", when: { state: "document.a" },
      } },
    }],
    ["V37 a residency outside the closed vocabulary", {
      ...base, entities: { cache: {} },
      quantities: { q: { target: "entity:cache", dimension: "memory", value: "128 MB", residency: "transient" } },
    }],
    ["V37 residency on a dimension that is not configuration-scoped", {
      ...base, entities: { cache: {} }, accounting: { latency: { basis: "entities" } },
      quantities: { q: { target: "entity:cache", dimension: "duration", value: "50 ms", residency: "resident" } },
    }],
    ["V27 a when.state that names no state, through the shared resolver", {
      ...base, entities: { cache: {} },
      machines: { document: { initial: "a", states: { a: null }, transitions: [] } },
      quantities: { q: {
        target: "entity:cache", dimension: "memory", value: "128 MB", when: { state: "document.ghost" },
      } },
    }],
  ];
  for (const [label, doc] of cases) {
    const text = stringify(doc);
    assertParity(label, text);
    // Each case must actually fire something in the parity set, or it is testing nothing.
    assert.ok(tsFindings(text).filter(inParity).length > 0, `${label} produced no parity finding`);
  }
});

test("asymmetric rules still fire on the side that owns them", () => {
  // Each of these is in ASYMMETRIC, so parity is not expected -- but the TS side must still
  // enforce it, or an entry in that table becomes an excuse rather than a record.
  const expectTs = (rule: string, doc: unknown): void => {
    const found = tsFindings(stringify(doc)).map((f) => f.rule);
    assert.ok(found.includes(rule), `expected TS to report ${rule}, got ${found.join(", ") || "nothing"}`);
    assert.ok(rule in ASYMMETRIC, `${rule} should be declared asymmetric`);
  };

  expectTs("V17", { ...base, machines: { m: { initial: "a", states: { a: null }, transitions: [], variables: { n: { type: "integer" } } } } });

  expectTs("V8", {
    ...base,
    "relation-types": { owns: { description: "d", composition: { path: "forbidden" }, properties: { acyclic: true } } },
    entities: { a: {}, b: {} },
    models: { g: { type: "graph", entities: ["a", "b"], relations: [
      { from: "a", to: "b", type: "owns" }, { from: "b", to: "a", type: "owns" }] } },
  });

  expectTs("V13", {
    ...base,
    events: { e: { participants: ["m", "w"] } },
    machines: {
      m: { initial: "a", states: { a: null, b: null }, variables: { x: { type: "integer", range: [0, 2] } },
           transitions: [{ from: "a", to: "b", sync: "e", effects: { x: "1" } }] },
      w: { initial: "a", states: { a: null, b: null }, variables: { x: { type: "integer", range: [0, 2] } },
           transitions: [{ from: "a", to: "b", sync: "e", effects: { x: "2" } }] },
    },
  });
});
