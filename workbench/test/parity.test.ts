// Python/TypeScript parity for the numbered rules.
//
// Two implementations of one specification are worth having only if their disagreement is
// detectable. This test fixes a PARITY SET -- rules both sides implement -- and asserts the two
// agree exactly on it, for every model in the repo plus a battery of deliberate violations.
//
// Rules implemented by only one side are listed explicitly in ASYMMETRIC. That list is the honest
// record of where the implementations differ; a rule may only be there on purpose, and moving one
// out of it is how parity grows.
//
// ## A finding is not the only kind of result
//
// This file compared FINDINGS, over two models, and called that parity. It was wrong twice over,
// and the two mistakes compounded:
//
//   - The three shipped examples were not among the models swept. The sweep named
//     examples/docable.mage.yaml and models/workbench-components.mage.yaml as literals, so every
//     example a reader actually opens was outside the test that claimed both tools agreed.
//   - A query OUTCOME was not compared at all. No shipped example declares `expect`, so a
//     disagreement about an answer never becomes a finding, and a test comparing findings cannot
//     see one. Both tools reported message-bus clean while disagreeing about three of its six
//     answers.
//
// So the second test below compares the ANSWERS, over every model in the repo, and the model list
// is derived from the app's shipped-example declaration rather than written here again.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { runSavedQueries } from "../src/engine/index.ts";
import { validate } from "../src/validator/rules.ts";
import { EXAMPLE_IDS, exampleText } from "../scripts/gen-example-coverage.ts";
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
  //
  // V38 joins them because the join it resolves decides every latency number the evaluator reports,
  // and because both sides resolve it through the resolver they already share with V27 -- so a
  // drifted bare-name or ambiguity rule surfaces here rather than as two tools disagreeing about
  // which entity a trace step charges.
  //
  // V39 is the same dangling-reference class pointed the other way: a QUERY's `quantity.within`
  // resolving into the quantities map. Only the TypeScript engine EVALUATES a quantity query, but
  // both sides validate the reference, so an authored dangling ceiling is one finding, not a
  // refusal one tool explains and the other never sees.
  "V35", "V36", "V37", "V38", "V39",
  // V40 is V3's own loop read in the other direction -- a plain structural check over declared
  // data, which is the shape that belongs in parity rather than in the asymmetry table. Both sides
  // already walk `models.<id>.entities` and `models.<id>.relations` for V3, so an asymmetry here
  // would record nothing about the specification and only that one side had not caught up.
  "V40",
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
  // Narrow, and it used to read wider. Both sides EVALUATE saved queries and the test below holds
  // them to the same answers; what is Python-only is the FINDING it raises when a query's `expect`
  // is unmet, because validate.py is a CI gate and the engine answers a reader's question. The
  // older wording said "asserted-query evaluation lives in validate.py and the workbench engine",
  // which read as though answers were asymmetric too -- and while it stood, three shipped
  // `predecessors` queries got two different answers with nothing complaining.
  QUERY: "Python only: the finding raised when a saved query's `expect` is unmet. Both sides evaluate queries; see the outcome-parity test below, which holds them to identical answers.",
  // §7.5 governs the SPARQL interface over the RDF projection. Both sides gate their OWN evaluator
  // from the relation-type declaration (V7), so the licensing rule itself is not asymmetric -- but the
  // second interface exists only in TypeScript, so there is no Python site these three could compare
  // against. They move out of this table when validate.py grows a SPARQL seam, which is not planned.
  V32: "TS only: the SPARQL licensing gate (src/sparql/licensing.ts). validate.py projects no RDF and exposes no SPARQL interface, so it has no second interface to gate.",
  V33: "TS only: the seam's refusal vocabulary (src/sparql/refusal.ts). validate.py emits a refusal SENTENCE from run_graph_query and has no structured-refusal channel to carry a cause.",
  V34: "TS only: named-graph scope selection. validate.py unions across every model by construction and never scopes to one, so the choice V34 forces does not arise there.",
};

/** One graph query's answer, as both sides now report it. `where` is a fact about the QUERY. */
interface PyQueryOutcome {
  readonly id: string;
  readonly form: string;
  readonly outcome: string;
  /** The engine's `RefusalReason` spelling, or null when the query was answered. */
  readonly cause: string | null;
  /** The sentence a reader gets. Null when the query was answered. */
  readonly refusal: string | null;
  readonly where: boolean;
}

interface PyRun {
  readonly findings: Finding[];
  readonly queries: PyQueryOutcome[];
}

const pyRun = (yamlText: string): PyRun => {
  const dir = mkdtempSync(join(tmpdir(), "mage-parity-"));
  const file = join(dir, "m.mage.yaml");
  writeFileSync(file, yamlText);
  const out = execFileSync("python3", ["validate.py", "--json", file], { encoding: "utf8" });
  return JSON.parse(out) as PyRun;
};

const pyFindings = (yamlText: string): Finding[] => pyRun(yamlText).findings;

const tsFindings = (yamlText: string): readonly Finding[] => validate(canonicalize(parse(yamlText)));

/** The engine's answer to every GRAPH query, keyed the way the Python side keys its own. */
const tsQueries = (
  yamlText: string,
): Map<string, { outcome: string; cause: string | null; prose: string | null }> => {
  const system = canonicalize(parse(yamlText));
  const out = new Map<string, { outcome: string; cause: string | null; prose: string | null }>();
  for (const [id, answer] of runSavedQueries(system)) {
    const raw = system.queries.get(id)?.raw;
    const kind = (raw as { kind?: unknown } | undefined)?.kind;
    if (kind !== "graph") continue;
    out.set(id, {
      outcome: answer.result.outcome,
      cause: answer.refusal?.reason ?? null,
      prose: answer.refusal?.prose ?? null,
    });
  }
  return out;
};

/**
 * One refusal sentence, with the two files' dash conventions folded together.
 *
 * `validate.py` carries no em-dash anywhere and writes `--`; the TypeScript writes `—`. That is a
 * house convention per file, not a disagreement about the model, so comparing the sentences means
 * normalizing it. Everything else is compared literally, because everything else is content: a
 * reworded explanation of a shared cause is the drift this folds in to catch, and the two
 * TypeScript interfaces are already held to byte equality on exactly that
 * (`test/sparql-seam.test.ts`).
 */
const oneDash = (prose: string): string => prose.replaceAll("—", "--");

const key = (f: Finding): string => `${f.rule} @ ${f.where}`;
const inParity = (f: Finding): boolean => PARITY.has(f.rule);

function assertParity(label: string, yamlText: string): void {
  const py = pyFindings(yamlText).filter(inParity).map(key).sort();
  const ts = tsFindings(yamlText).filter(inParity).map(key).sort();
  assert.deepEqual(ts, py, `parity mismatch on ${label}\n  python: ${py}\n  typescript: ${ts}`);
}

/**
 * Every model in the repo, with the shipped examples looked up rather than listed.
 *
 * `EXAMPLE_IDS` re-exports `SHIPPED_EXAMPLE_IDS` from src/app/examples.ts, which is what "shipped"
 * MEANS here — so a fourth example reaches this test by landing, not by someone remembering to add
 * a string. The two non-example models stay literal because nothing else declares them.
 */
const repoModels = (): readonly { label: string; text: string }[] => [
  ...EXAMPLE_IDS.map((id) => ({ label: `examples/${id}/system.mage.yaml`, text: exampleText(id) })),
  ...["examples/docable.mage.yaml", "models/workbench-components.mage.yaml"]
    .map((label) => ({ label, text: readFileSync(label, "utf8") })),
];

test("every asymmetry is declared with a reason", () => {
  for (const [rule, reason] of Object.entries(ASYMMETRIC)) {
    assert.ok(!PARITY.has(rule), `${rule} cannot be both parity and asymmetric`);
    assert.ok(reason.length > 20, `${rule} needs a real reason, not a placeholder`);
  }
});

test("repo models agree (and are clean)", () => {
  // The shipped examples are in this sweep now. They were not, and that is half of why a live
  // disagreement on message-bus survived: the models a reader opens were outside the test.
  for (const { label, text } of repoModels()) {
    assertParity(label, text);
    assert.deepEqual(tsFindings(text).filter(inParity), [], `${label} should be clean`);
  }
});

test("repo models get the same ANSWERS, not merely the same findings", () => {
  // The property this test exists for: a disagreement about what a model MEANS fails the build,
  // whether or not either tool calls it a finding. Two claims, both held per query.
  //
  //   (1) Outcomes agree, and when both refuse they refuse for the same CAUSE. A licensing refusal
  //       on one side and an answer on the other is the failure that got through before.
  //   (2) The only queries exempt from (1) are the ones carrying a `where` clause, which validate.py
  //       declines for scope because it has no join evaluator. That exemption is DERIVED from the
  //       query, so it shrinks when the gap closes and it cannot be used to excuse anything else.
  //
  // Behavioral queries are outside this comparison: validate.py evaluates no state space at all,
  // by design, and the first assertion below pins that boundary rather than assuming it.
  let compared = 0;
  let excused = 0;

  for (const { label, text } of repoModels()) {
    const py = pyRun(text).queries;
    const ts = tsQueries(text);
    assert.deepEqual([...py.map((r) => r.id)].sort(), [...ts.keys()].sort(),
      `${label}: the two tools disagree about WHICH queries are graph queries`);

    for (const row of py) {
      const theirs = ts.get(row.id);
      assert.ok(theirs !== undefined, `${label}/${row.id}: no engine answer`);

      if (row.cause === "unsupported-form") {
        assert.ok(row.where,
          `${label}/${row.id}: validate.py refused a '${row.form}' query for scope with no \`where\` ` +
          `clause to explain it. Either it should answer this question, or the exemption needs a ` +
          `second reason written down here. The engine answers '${theirs.outcome}'.`);
        excused += 1;
        continue;
      }

      assert.equal(theirs.outcome, row.outcome,
        `${label}/${row.id} ('${row.form}'): validate.py says '${row.outcome}', the engine says ` +
        `'${theirs.outcome}'. One of them is wrong about this model.`);
      assert.equal(theirs.cause, row.cause,
        `${label}/${row.id}: both refused, for different reasons -- validate.py '${String(row.cause)}' ` +
        `against the engine's '${String(theirs.cause)}'`);
      if (row.refusal !== null && theirs.prose !== null) {
        assert.equal(oneDash(theirs.prose), row.refusal,
          `${label}/${row.id}: one cause, two explanations. validate.py says "${row.refusal}"; the ` +
          `engine says "${theirs.prose}". A reader who asks both tools about one absence must hear ` +
          `one sentence, which is the property the SPARQL seam is already held to.`);
      }
      compared += 1;
    }
  }

  assert.ok(compared > 0, "the sweep compared nothing; a vacuous parity test is the defect itself");
  assert.ok(excused < compared,
    `${excused} of ${excused + compared} answers are excused for scope; the exemption is supposed ` +
    `to be the narrow case, not the rule`);
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
    // The pair that fixes the BOUNDARY between the two rules, which is the half of V40 a single
    // case cannot pin. Above, `ghost` resolves nowhere: V3 owns it and V40 says nothing, so the
    // finding set is unchanged by V40's arrival. Below, `b` resolves at system level and is absent
    // from the membership: V3 is satisfied and V40 is the only rule with anything to say.
    ["V40 an endpoint outside the model's membership", {
      ...base,
      "relation-types": { calls: { description: "d", composition: { path: "allowed" } } },
      entities: { a: {}, b: {} },
      models: { g: { type: "graph", entities: ["a"], relations: [{ from: "a", to: "b", type: "calls" }] } },
    }],
    ["V40 a model that asserts an edge and declares no membership at all", {
      ...base,
      "relation-types": { calls: { description: "d", composition: { path: "allowed" } } },
      entities: { a: {}, b: {} },
      models: { g: { type: "graph", relations: [{ from: "a", to: "b", type: "calls" }] } },
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
    ["V38 an executes_in_state naming a state no machine declares", {
      ...base, entities: { parse: { properties: { executes_in_state: "ghost" } } },
      machines: { document: { initial: "a", states: { a: null }, transitions: [] } },
    }],
    ["V38 an executes_in_state naming an undeclared machine", {
      ...base, entities: { parse: { properties: { executes_in_state: "ghost.a" } } },
      machines: { document: { initial: "a", states: { a: null }, transitions: [] } },
    }],
    ["V38 a bare state name two machines declare, which is the shared resolver's ambiguity refusal", {
      ...base, entities: { parse: { properties: { executes_in_state: "busy" } } },
      machines: {
        document: { initial: "busy", states: { busy: null }, transitions: [] },
        worker: { initial: "busy", states: { busy: null }, transitions: [] },
      },
    }],
    ["V38 a non-string executes_in_state, which names no state on either side", {
      ...base, entities: { parse: { properties: { executes_in_state: 3 } } },
      machines: { document: { initial: "a", states: { a: null }, transitions: [] } },
    }],
    ["V39 a quantity query whose ceiling names no declared quantity", {
      ...base,
      queries: { "under-ceiling": {
        kind: "quantity", quantifier: "forall",
        quantity: { metric: "latency", within: "ghost" },
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

test("the purposeful-omission rung agrees, including where it declines to match", () => {
  // The coverage rule exists twice -- src/engine/omission.ts and validate.py's `_omission_covering`
  // -- because neither tool can import the other's. Two copies of a MATCHING rule is the worst kind
  // of duplication: a drift produces no error, just one tool saying "deliberately omitted" where
  // the other says "not declared", which is exactly the wrong-reason defect the rung exists to fix.
  // The repo sweep above covers the two shipped cases; this covers the boundary of the rule itself.
  const doc = {
    ...base,
    "relation-types": { owns: { description: "d", composition: { path: "forbidden" } } },
    entities: { a: {}, b: {} },
    models: {
      g: {
        type: "graph", entities: ["a", "b"],
        purpose: { omits: ["observed runtime calls", "encryption in transit"] },
        relations: [{ from: "a", to: "b", type: "owns" }],
      },
    },
    queries: {
      // Covered: every word of `calls` appears in `observed runtime calls`.
      "omitted-relation": { kind: "graph", quantifier: "exists", graph: { form: "direct", relation: "calls", from: "a", to: "b" } },
      // Covered the other way round -- the identifier spelling of the omission itself.
      "omitted-exactly": { kind: "graph", quantifier: "exists", graph: { form: "direct", relation: "encryption_in_transit", from: "a", to: "b" } },
      // NOT covered: `rest` is a word the omission does not have, so neither tool may claim it.
      "not-omitted": { kind: "graph", quantifier: "exists", graph: { form: "direct", relation: "encryption_at_rest", from: "a", to: "b" } },
      // The licensing subject is judged before the endpoints, so an omitted endpoint does not win here.
      "forbidden-beats-endpoint": { kind: "graph", quantifier: "exists", graph: { form: "reachability", relation: "owns", from: "a", to: "observed_runtime_calls" } },
    },
  };
  const text = stringify(doc);
  const py = new Map(pyRun(text).queries.map((r) => [r.id, r.cause]));
  const ts = tsQueries(text);

  const expected: Record<string, string> = {
    "omitted-relation": "missing-distinction",
    "omitted-exactly": "missing-distinction",
    "not-omitted": "unknown-vocabulary",
    "forbidden-beats-endpoint": "composition-forbidden",
  };
  for (const [id, cause] of Object.entries(expected)) {
    assert.equal(py.get(id), cause, `${id}: validate.py said '${String(py.get(id))}'`);
    assert.equal(ts.get(id)?.cause, cause, `${id}: the engine said '${String(ts.get(id)?.cause)}'`);
  }
});

test("a system declaring no model gets one answer from both tools, and it is a refusal", () => {
  // The gap this closes was a WRONG ANSWER a user could reach, not a latent parity risk. `models:`
  // empty with `relation-types:` and `entities:` declared is the ordinary middle of an authoring
  // session, and `python3 validate.py` on it answered `refuted` to `direct`, `reachability` and
  // `successors`, then printed `clean`. "No, api does not reach gateway" about a system that models
  // no structure is the same class as this tool's `latency: 0 ms` over an empty charge table: a
  // definite answer computed over nothing.
  //
  // The model is NOT in `repoModels()` and could not be -- every committed model declares `models:`,
  // which is why the ruling that landed the engine's rung recorded this as unobservable. It was
  // unobservable to the SWEEP. It was not unobservable to a reader.
  //
  // `containment` is in the cases because it is the one where the two tools had different wrong
  // answers: validate.py refused it as `unsupported-form` with no `where` clause, which the sweep
  // above would have reported as an unexplained exemption rather than as the real disagreement.
  const doc = {
    ...base,
    "relation-types": { may_invoke: { description: "d", composition: { path: "allowed" } } },
    entities: { api: { contains: ["handler"] }, gateway: {}, handler: {} },
    queries: {
      "direct-call": { kind: "graph", quantifier: "exists", graph: { form: "direct", relation: "may_invoke", from: "api", to: "gateway" } },
      "can-reach": { kind: "graph", quantifier: "exists", graph: { form: "reachability", relation: "may_invoke", from: "api", to: "gateway" } },
      "who-calls": { kind: "graph", quantifier: "exists", graph: { form: "successors", relation: "may_invoke", from: "api" } },
      nests: { kind: "graph", quantifier: "exists", graph: { form: "containment", relation: "may_invoke", to: "handler" } },
      // A misspelling on top, because the rung outranks vocabulary on both sides: a reader of a
      // modelless system must hear about the absent type, not be sent hunting a typo.
      "typo-too": { kind: "graph", quantifier: "exists", graph: { form: "direct", relation: "ownz", from: "api", to: "gateway" } },
    },
  };
  const text = stringify(doc);
  const py = new Map(pyRun(text).queries.map((r) => [r.id, r]));
  const ts = tsQueries(text);

  assert.equal(py.size, 5, "the Python side skipped a query");
  for (const id of Object.keys(doc.queries)) {
    const theirs = py.get(id);
    const ours = ts.get(id);
    assert.ok(theirs !== undefined && ours !== undefined, `${id}: one side has no answer`);
    assert.equal(ours.outcome, "unlicensed", `${id}: the engine answered a modelless system`);
    assert.equal(theirs.outcome, "unlicensed", `${id}: validate.py answered a modelless system`);
    assert.equal(ours.cause, "missing-model-type", id);
    assert.equal(theirs.cause, "missing-model-type", id);
    assert.equal(oneDash(ours.prose ?? ""), theirs.refusal, `${id}: two explanations of one absence`);
  }

  // The negative control: declare ONE model and the same five questions get answered again (bar the
  // typo, which is now genuinely a vocabulary miss). A rung that refused every graph query would
  // satisfy every assertion above.
  const live = stringify({
    ...doc,
    models: {
      "service-flow": {
        type: "graph", entities: ["api", "gateway"],
        relations: [{ from: "api", to: "gateway", type: "may_invoke" }],
      },
    },
  });
  assert.deepEqual(pyRun(live).findings, [], "the control must be a clean model, or it controls nothing");
  const livePy = new Map(pyRun(live).queries.map((r) => [r.id, r]));
  const liveTs = tsQueries(live);
  assert.equal(livePy.get("direct-call")?.outcome, "holds");
  assert.equal(liveTs.get("direct-call")?.outcome, "holds");
  assert.equal(livePy.get("typo-too")?.cause, "unknown-vocabulary");
  assert.equal(liveTs.get("typo-too")?.cause, "unknown-vocabulary");
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
