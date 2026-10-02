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
const PARITY = new Set(["V1", "V3", "V4", "V5", "V6", "V9", "V10", "V11", "V12", "V14", "V19", "V24", "V25"]);

/** Known asymmetries, deliberate. Each needs a reason, not just an entry. */
const ASYMMETRIC: Record<string, string> = {
  V8: "TS only: relation-type acyclicity. Python reports it via the schema's own graph pass.",
  V13: "TS only: conflicting writes in one synchronized step.",
  V15: "Python only: `ref` variables are rejected at the schema layer in TS (generated types).",
  V17: "Both enforce finiteness, at DIFFERENT layers: the JSON Schema requires range-or-domain, so Python reports SCHEMA and skips its meaning pass, while TS has no runtime schema layer and reports V17. Found by this test, not by inspection.",
  V20: "Python only: ordered-domain typing of order comparisons in saved queries.",
  SCHEMA: "Python only: JSON Schema shape pass. TS gets shape from generated types at compile time.",
  QUERY: "Python only: asserted-query evaluation lives in validate.py and the workbench engine.",
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
