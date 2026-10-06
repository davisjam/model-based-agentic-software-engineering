// SEMANTICS.md §3.3 — the typing layer, pinned where the design says a regression must stand.
//
// Four subjects, each the standing record of a decision:
//
//   1. THE D7 INJECTION, both ways. `shipping-address --publishes--> customer-id` into the
//      flagship's data-policy model is a load-time V48 finding NOW THAT `publishes` declares its
//      ends — and the SAME edge with the declaration removed loads clean, because an undeclared
//      relation type constrains nothing. The pair pins §3.3's honesty: the declarations are not
//      an enrichment of the mechanism, they are the mechanism.
//   2. THE LAB REFUSAL (T3). Adding the `conveys` edge alone to calibration-loop is REJECTED with
//      two V48 findings — a shadow type is established as nothing, and the edge being checked
//      never establishes its own endpoint's type. This is the regression the lab fixture's header
//      points at, and the RDFS-vs-SHACL fork made executable.
//   3. ESTABLISHMENT (`explain-type`). The record that answers "why are these two still
//      distinct?" — authored or unnamed, the deterministic shadow spelling, and each declared
//      constraint with its verdict.
//   4. MODEL IDENTITY. Declarations are semantic, so they hash; spelling normalization is not, so
//      `domain: service` and `domain: [service]` are one system; and a system that declares
//      nothing keeps a projection with no typing contribution at all (removing the keys restores
//      the exact prior hash).
//
// Plus the §7 boundary: an edge V48 names is skipped by V45/V46 — one defect, one finding — and
// the suppression must not manufacture a reaches-nothing finding in its place.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash } from "../src/ir/hash.ts";
import { validate } from "../src/validator/rules.ts";
import { checkTyping, explainType, shadowType } from "../src/validator/typing.ts";
import { Workspace } from "../src/app/services.ts";
import { createAgentApi } from "../src/app/agent-api.ts";
import { ExampleCatalog } from "../src/app/examples.ts";
import type { AssetReader } from "../src/app/examples.ts";
import { exampleText, realPorts } from "../scripts/gen-example-coverage.ts";
import { readFileSync } from "node:fs";

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** The flagship's raw document, re-parsed per test so a mutation cannot leak between them. */
const messageBusDoc = (): Record<string, unknown> => {
  const doc: unknown = parse(exampleText("message-bus"));
  assert.ok(isObj(doc));
  return doc;
};

/** Push the D7 edge into a model's relations. Both endpoints are data-policy members. */
const injectNonsense = (doc: Record<string, unknown>, model: string): void => {
  const models = doc["models"];
  assert.ok(isObj(models) && isObj(models[model]));
  const m = models[model] as Record<string, unknown>;
  const relations = Array.isArray(m["relations"]) ? (m["relations"] as unknown[]) : [];
  relations.push({ from: "shipping-address", to: "customer-id", type: "publishes" });
  m["relations"] = relations;
};

test("the D7 edge is a load-time V48 finding, twice, at the edge, now that publishes declares its ends", () => {
  const doc = messageBusDoc();
  injectNonsense(doc, "data-policy");
  const findings = validate(canonicalize(doc));
  const v48 = findings.filter((f) => f.rule === "V48");
  // Two findings, one per mis-kinded endpoint: a field is neither a service nor an event type.
  assert.equal(v48.length, 2, `expected two V48 findings, got: ${JSON.stringify(findings)}`);
  for (const f of v48) {
    assert.equal(f.where, "models.data-policy.relations", "V48 is sited at the edge");
    assert.match(f.message, /relation-types\.publishes\.(domain|range)/,
      "the finding cites the declaration site");
  }
  // And nothing else fires: V48 owns the mis-kinded edge, and §7's suppression keeps V45/V46
  // quiet about the aggregate properties the nonsense edge fails to carry.
  assert.deepEqual(findings.filter((f) => f.rule !== "V48"), [],
    "a mis-kinded edge must raise V48 and nothing else — one defect, one finding");
});

test("the SAME edge with the declaration removed loads clean — an undeclared type constrains nothing", () => {
  const doc = messageBusDoc();
  injectNonsense(doc, "data-policy");
  const relTypes = doc["relation-types"];
  assert.ok(isObj(relTypes) && isObj(relTypes["publishes"]));
  delete (relTypes["publishes"] as Record<string, unknown>)["domain"];
  delete (relTypes["publishes"] as Record<string, unknown>)["range"];
  const findings = validate(canonicalize(doc));
  // §1.3 of the shadow-types design, pinned as the permanent record of what D7 found: nonsense
  // among a model's own members, with nothing declared, is not a finding. Stated as a test so
  // a future "helpful" inference pass cannot arrive silently.
  assert.deepEqual(findings, [], "the declaration IS the mechanism; without it nothing may fire");
});

test("V47: a declaration that resolves through entity-types alone is legal; a drifted one is a finding", () => {
  const base = {
    mage: 1, system: { id: "t" },
    "entity-types": { measurement: { description: "d" } },
    "relation-types": {
      conveys: {
        description: "d", composition: { path: "allowed" },
        domain: "measurement", range: "measurement",
      },
    },
    entities: { a: {}, b: {} },
  };
  // The declared-vocabulary case the lab example depends on: no entity carries `measurement`,
  // and the declaration still resolves because the vocabulary names it.
  assert.deepEqual(validate(canonicalize(base)), []);

  // Rename drift: the declaration now names a kind neither the vocabulary nor any entity has.
  const drifted = structuredClone(base) as Record<string, unknown>;
  (drifted["entity-types"] as Record<string, unknown>)["observation"] =
    (drifted["entity-types"] as Record<string, unknown>)["measurement"];
  delete (drifted["entity-types"] as Record<string, unknown>)["measurement"];
  const findings = validate(canonicalize(drifted));
  assert.deepEqual(findings.map((f) => [f.rule, f.where]).sort(), [
    ["V47", "relation-types.conveys.domain"],
    ["V47", "relation-types.conveys.range"],
  ]);
});

// ------------------------------------------------------------------------------------------------
// The lab refusal — T3 executable
// ------------------------------------------------------------------------------------------------

const assets: AssetReader = (path) => Promise.resolve(readFileSync(path, "utf8"));

const loadedLab = (): { readonly ws: Workspace } => {
  const ws = new Workspace(realPorts);
  const out = ws.load(exampleText("calibration-loop"));
  assert.ok(out.ok, `calibration-loop must load: ${out.findings.map((f) => f.message).join("; ")}`);
  assert.deepEqual(ws.state.findings, [], "the lab ships CLEAN — under-specified, not wrong");
  return { ws };
};

test("the lab refusal: the edge alone is rejected with two V48 findings; the edge cannot establish its endpoints", () => {
  const { ws } = loadedLab();
  const refused = ws.openHypothesis("force the connection", {
    transaction: {
      base: ws.state.hash,
      operations: [
        { op: "add-relation", model: "signal-path", from: "reading", to: "sample", type: "conveys" },
      ],
    },
  });
  assert.equal(refused.ok, false, "the unestablished edge must be refused, not accepted");
  const v48 = refused.findings.filter((f) => f.rule === "V48");
  assert.equal(v48.length, 2,
    `two unestablished endpoints, two findings — got ${JSON.stringify(refused.findings)}`);
  for (const f of v48) {
    // The message teaches instead of scolding: what is missing, what would establish it, and
    // that the edge itself never can.
    assert.match(f.message, /has no authored type/);
    assert.match(f.message, /'type: measurement'/);
    assert.match(f.message, /the edge cannot establish it/);
  }
  assert.equal(ws.state.hypothesis, null, "a refused hypothesis leaves no branch behind");
});

test("naming the kinds first makes the same edge legal — the fixture modification's order, inverted here", () => {
  const { ws } = loadedLab();
  const opened = ws.openHypothesis("establish, then connect", {
    transaction: {
      base: ws.state.hash,
      operations: [
        { op: "set-entity-type", id: "reading", value: "measurement" },
        { op: "set-entity-type", id: "sample", value: "measurement" },
        { op: "add-relation", model: "signal-path", from: "reading", to: "sample", type: "conveys" },
      ],
    },
  });
  assert.ok(opened.ok, `the established edge must be accepted: ${opened.findings.map((f) => f.message).join("; ")}`);
  assert.ok(ws.discardHypothesis());
});

test("set-entity-type refuses an entity that does not exist", () => {
  const { ws } = loadedLab();
  const refused = ws.openHypothesis("typo", {
    transaction: {
      base: ws.state.hash,
      operations: [{ op: "set-entity-type", id: "readng", value: "measurement" }],
    },
  });
  assert.equal(refused.ok, false);
  assert.ok(refused.findings.some((f) => f.message.includes("no entity 'readng'")),
    `the refusal names the missing entity: ${JSON.stringify(refused.findings)}`);
});

// ------------------------------------------------------------------------------------------------
// Establishment — explain-type
// ------------------------------------------------------------------------------------------------

test("explain-type answers 'why are these still distinct?' with each side's establishment record", () => {
  const { ws } = loadedLab();
  const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {},
    new ExampleCatalog(ws, assets));

  const reading = api.model.explainType("reading");
  assert.ok(reading !== null);
  assert.equal(reading.established, "unnamed");
  assert.equal(reading.type, null);
  assert.equal(reading.shadow, shadowType("reading"));
  assert.equal(reading.shadow, "τ_reading", "the spelling is deterministic and self-explaining");
  // No authored statement relates reading to anything a declaration constrains: `produces`
  // declares no ends, and no conveys edge exists yet. An empty record IS the explanation.
  assert.deepEqual(reading.constraints, []);

  const sample = api.model.explainType("sample");
  assert.ok(sample !== null);
  assert.equal(sample.shadow, "τ_sample");
  assert.notEqual(reading.shadow, sample.shadow, "two shadows are distinct by construction");

  assert.equal(api.model.explainType("nonesuch"), null, "an undeclared id has nothing to explain");
});

test("explain-type on a constrained, authored entity reports member verdicts per occurrence", () => {
  const ws = new Workspace(realPorts);
  assert.ok(ws.load(exampleText("message-bus")).ok);
  const record = explainType(ws.state.system, "checkout");
  assert.ok(record !== null);
  assert.equal(record.established, "authored");
  assert.equal(record.type, "service");
  assert.equal(record.shadow, null);
  assert.ok(record.constraints.length > 0, "checkout sits under declared publishes/calls ends");
  for (const c of record.constraints) {
    assert.equal(c.verdict, "member", `${c.relationType}/${c.position} should admit a service`);
    assert.ok(c.declared.includes("service"));
  }
});

// ------------------------------------------------------------------------------------------------
// §7 — one defect, one finding (the suppression boundary)
// ------------------------------------------------------------------------------------------------

test("an edge V48 names is skipped by V45/V46, and the suppression invents no reaches-nothing finding", () => {
  // The overlap case §7 specifies: a relation type declaring BOTH `aggregates` and domain/range,
  // with one well-kinded edge satisfying the aggregate and one mis-kinded edge violating the
  // kinds AND missing the aggregate property. V48 owns the second edge; V45/V46 say nothing
  // about it — and `evt`, whose only OTHER edge is suppressed, must not be reported as sourcing
  // nothing, because it does source an edge.
  const doc = {
    mage: 1, system: { id: "t" },
    domains: { sens: { type: "ordered-enum", values: ["public", "restricted"] } },
    "relation-types": {
      carries_field: {
        description: "d", composition: { path: "forbidden" },
        aggregates: { declared: "carries", over: "classification", using: "max" },
        domain: "event-type", range: "field",
      },
    },
    entities: {
      evt: { type: "event-type", properties: { carries: { value: "restricted", domain: "sens" } } },
      f: { type: "field", properties: { classification: { value: "restricted", domain: "sens" } } },
      rogue: { type: "service" },
    },
    models: {
      g: {
        type: "graph", entities: ["evt", "f", "rogue"],
        relations: [
          { from: "evt", to: "f", type: "carries_field" },
          { from: "evt", to: "rogue", type: "carries_field" },
        ],
      },
    },
  };
  const findings = validate(canonicalize(doc));
  assert.deepEqual(findings.map((f) => f.rule), ["V48"],
    `V48 owns the mis-kinded edge and the aggregate pair stays quiet: ${JSON.stringify(findings)}`);
  // The suppression surface itself, checked at the module seam: exactly one edge suppressed.
  const typing = checkTyping(canonicalize(doc));
  assert.equal(typing.suppressed.size, 1);
});

// ------------------------------------------------------------------------------------------------
// Model identity — §8 of the design
// ------------------------------------------------------------------------------------------------

test("declarations are semantic: domain/range and entity-types move the hash; spelling does not", () => {
  const bare = {
    mage: 1, system: { id: "t" },
    "relation-types": { calls: { description: "d", composition: { path: "allowed" } } },
    entities: { a: { type: "service" }, b: { type: "service" } },
    models: {
      g: { type: "graph", entities: ["a", "b"], relations: [{ from: "a", to: "b", type: "calls" }] },
    },
  };
  const withString = structuredClone(bare) as Record<string, unknown>;
  ((withString["relation-types"] as Record<string, unknown>)["calls"] as Record<string, unknown>)["domain"] = "service";
  const withList = structuredClone(withString);
  (((withList["relation-types"] as Record<string, unknown>)["calls"]) as Record<string, unknown>)["domain"] = ["service"];
  const withVocab = structuredClone(bare) as Record<string, unknown>;
  withVocab["entity-types"] = { service: { description: "d" } };

  const h = (d: unknown): string => systemHash(canonicalize(d));
  assert.notEqual(h(bare), h(withString),
    "declaring a domain decides well-formedness, so it is a different system");
  assert.equal(h(withString), h(withList),
    "`domain: service` and `domain: [service]` are one declaration and one system");
  assert.notEqual(h(bare), h(withVocab),
    "the entity-types vocabulary decides V47 verdicts, so its membership hashes");

  // And the identity-preservation half: a vocabulary's DESCRIPTION is prose, outside the hash,
  // exactly as a relation type's description is.
  const reworded = structuredClone(withVocab) as Record<string, unknown>;
  (reworded["entity-types"] as Record<string, Record<string, unknown>>)["service"] = { description: "other words" };
  assert.equal(h(withVocab), h(reworded), "vocabulary prose must not move model identity");
});
