// A transaction finding's TYPED half must carry what its sentence carries — `refusal-detail-parity`
// for the other refusing surface.
//
// ## The asymmetry this file closes
//
// Query refusals carry `refusalDetail` beside the prose, and a parity test holds the typed half to
// the sentence corpus-wide. Transaction rejections had no typed half at all: a V46 rejection named
// the two conflicting surfaces, the offending field and the winning target ONLY in its sentence,
// because the engine validated through the wire-narrowed pass that strips the rungs' structured
// content. An agent repairing a rejection — the one consumer that must act on exactly those ids —
// parsed prose on precisely the path built for it.
//
// `Finding.detail` now carries the enrichment (`subjects`, `severity`, `spec`) the `validate()`
// operation already publishes, nested the way `refusalDetail` travels beside `refusal`: non-null
// exactly when the emitter had structured content, null on loader/schema/transaction-shape
// findings whose cause is the sentence itself. This file pins both halves of that contract, with
// every expected value LOOKED UP from the model and the validator's own tables, never spelled.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAgentApi } from "../src/app/agent-api.ts";
import type { MageAgentApi } from "../src/app/agent-api.ts";
import { ExampleCatalog } from "../src/app/examples.ts";
import type { AssetReader } from "../src/app/examples.ts";
import { Workspace } from "../src/app/services.ts";
import { SEVERITY, SPEC_SECTION } from "../src/validator/result.ts";
import type { ValidationRule } from "../src/validator/result.ts";
import { realPorts, exampleText } from "../scripts/gen-example-coverage.ts";
import { readFileSync } from "node:fs";

const assets: AssetReader = (path: string) => Promise.resolve(readFileSync(path.replace(/^\.\//, ""), "utf8"));

/** message-bus: the one shipped example declaring a relation aggregation (V45/V46's subject). */
const EXAMPLE = "message-bus";

function loaded(): { readonly ws: Workspace; readonly api: MageAgentApi } {
  const ws = new Workspace(realPorts);
  const out = ws.load(exampleText(EXAMPLE));
  assert.ok(out.ok, `${EXAMPLE} must load: ${out.findings.map((f) => f.message).join("; ")}`);
  return { ws, api: createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, new ExampleCatalog(ws, assets)) };
}

/**
 * A transaction that provokes V46: re-author the declared aggregate to a value the edges refute.
 * Everything is looked up — the relation type, the edge, the domain, the wrong value — so the
 * probe fails loudly if the fixture moves rather than measuring the wrong thing.
 */
function v46Fixture(ws: Workspace): {
  readonly source: string; readonly relationType: string; readonly declaredProp: string;
  readonly wrongValue: string;
} {
  const s = ws.state.system;
  const rt = [...s.relationTypes.values()].find((r) => r.aggregates !== null);
  assert.ok(rt !== undefined, `${EXAMPLE} declares no relation aggregation; the V45/V46 fixture moved`);
  const agg = rt.aggregates;
  assert.ok(agg !== null, "narrowed one line up");
  const edge = s.relations.find((e) => e.type === rt.id);
  assert.ok(edge !== undefined, `no '${rt.id}' edge to disagree with`);
  const declared = s.entities.get(edge.from)?.properties.get(agg.declared);
  assert.ok(declared !== undefined, `'${edge.from}' must author '${agg.declared}' for the aggregation to check`);
  const domain = declared.domain === null ? undefined : s.domains.get(declared.domain);
  assert.ok(domain !== undefined && domain.kind === "ordered-enum",
    `'${agg.declared}' must sit on an ordered-enum domain`);
  const wrong = domain.values.find((v) => v !== String(declared.value));
  assert.ok(wrong !== undefined, `domain '${String(declared.domain)}' needs a second value to disagree with`);
  return { source: edge.from, relationType: rt.id, declaredProp: agg.declared, wrongValue: wrong };
}

test("a V46 rejection's typed half names what its sentence names", () => {
  const { ws, api } = loaded();
  const { source, relationType, declaredProp, wrongValue } = v46Fixture(ws);

  const out = api.transact({ transaction: {
    base: ws.state.hash,
    operations: [{ op: "set-property", id: source, name: declaredProp, value: wrongValue }],
    semantics: { atomic: true },
  } });
  assert.equal(out.ok, false, "re-authoring the aggregate against its edges must reject");
  const v46 = out.findings.find((f) => f.rule === "V46");
  assert.ok(v46 !== undefined,
    `the rejection must carry V46; got: ${out.findings.map((f) => f.rule).join(", ") || "(none)"}`);

  const detail = v46.detail ?? null;
  assert.ok(detail !== null, "a validator finding on the transaction surface must carry its typed half");
  // Severity and spec from the validator's own tables — the lookup, never a snapshot.
  assert.equal(detail.severity, SEVERITY.V46);
  assert.equal(detail.spec, SPEC_SECTION.V46);
  // The two conflicting surfaces and the relation that joins them, as data an agent selects by.
  assert.ok(detail.subjects.includes(source),
    `subjects must name the authoring surface '${source}'; got [${detail.subjects.join(", ")}]`);
  assert.ok(detail.subjects.includes(relationType),
    `subjects must name the relation '${relationType}'; got [${detail.subjects.join(", ")}]`);
  assert.ok(detail.subjects.length >= 3,
    "V46 names both surfaces plus the relation — fewer subjects than sentences is the under-report");
  // Prose/data agreement, the parity test's own discipline: every id the typed half names, the
  // sentence quotes — the typed half is the sentence's data, not a different claim.
  for (const subject of detail.subjects) {
    assert.ok(v46.message.includes(`'${subject}'`),
      `subject '${subject}' does not appear quoted in the sentence: ${v46.message}`);
  }
});

test("every validator finding a rejection carries is typed; every non-validator finding is not", () => {
  const { ws, api } = loaded();
  const { source, declaredProp, wrongValue } = v46Fixture(ws);

  // The structured side, swept over the whole rejection rather than the one rule somebody spot-checked.
  const rejected = api.transact({ transaction: {
    base: ws.state.hash,
    operations: [{ op: "set-property", id: source, name: declaredProp, value: wrongValue }],
    semantics: { atomic: true },
  } });
  assert.equal(rejected.ok, false, "the fixture transaction must reject");
  const vRules = rejected.findings.filter((f) => /^V\d+$/.test(f.rule));
  assert.ok(vRules.length > 0, "the sweep needs at least one validator finding to check");
  for (const f of vRules) {
    const d = f.detail ?? null;
    assert.ok(d !== null, `${f.rule} at ${f.where}: a validator finding must carry its typed half`);
    assert.equal(d.severity, SEVERITY[f.rule as ValidationRule], `${f.rule}: severity must be the table's`);
    assert.equal(d.spec, SPEC_SECTION[f.rule as ValidationRule], `${f.rule}: spec must be the table's`);
  }

  // The null side of the contract: a transaction-shape finding has no structured half, and says
  // so. One op, syntactically valid, so parse admits it and the BASE check is what rejects —
  // an empty `operations` fails SCHEMA before the base is ever read (probed, not assumed).
  const mismatch = api.transact({ transaction: {
    base: "fnv1a64:0000000000000000",
    operations: [{ op: "set-property", id: source, name: declaredProp, value: wrongValue }],
    semantics: { atomic: true },
  } });
  assert.equal(mismatch.ok, false, "a wrong base must reject");
  const shape = mismatch.findings.find((f) => f.rule === "TRANSACTION");
  assert.ok(shape !== undefined,
    `the base-mismatch rejection must carry its TRANSACTION finding; got: ${mismatch.findings.map((f) => f.rule).join(", ") || "(none)"}`);
  assert.equal(shape.detail ?? null, null,
    "a transaction-shape finding has no structured content; a fabricated detail would be a second claim");

  // And the parse layer's own arm: a malformed envelope's SCHEMA finding is prose-only too.
  const malformed = api.transact({ transaction: { base: ws.state.hash, operations: [], semantics: { atomic: true } } });
  assert.equal(malformed.ok, false, "an empty operations array must reject");
  const schema = malformed.findings.find((f) => f.rule === "SCHEMA");
  assert.ok(schema !== undefined, "the malformed rejection must carry its SCHEMA finding");
  assert.equal(schema.detail ?? null, null, "a schema finding's cause is its sentence; detail stays null");
});
