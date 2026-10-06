// The surface refuses an unknown direction instead of silently answering the opposite question.
//
// ## The failure this file exists to catch, measured before it was fixed
//
// `window.mage.model.related(from, relation, direction)` built its document through a ternary:
// `direction === "outgoing" ? … : …`. `TraversalDirection` constrains the parameter at compile
// time, but an agent hands the facade RUNTIME input — and `"out"`, `"from"` and `"forward"` all
// fell to the else arm, which asked the INCOMING question and answered it, with no refusal and no
// note. The 261006 lab-solver run mis-measured a model through exactly this hole and called it
// the headline gap of its run. A silent fallback to a different question is worse than an error,
// because the answer looks authoritative.
//
// Two more sites had the same shape, found by the audit this fix commissioned:
//
//  - a graph query's `where` dropped every clause the grammar could not read and returned the
//    rest — null when none parsed — so an unreadable `where` fell through to the UNCONSTRAINED
//    traversal: a broader question than the one asked;
//  - an `elements` selector refused an ALL-unreadable `where` but kept the readable keys of a
//    partially unreadable one, silently answering the weaker question.
//
// Each test here asserts the refusal AND that the refused result is not merely the other
// question's answer — which is the bug — and each keeps a positive control, because a fix that
// refuses everything is indistinguishable from a weakened probe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAgentApi } from "../src/app/agent-api.ts";
import type { MageAgentApi, TraversalDirection } from "../src/app/agent-api.ts";
import { ExampleCatalog } from "../src/app/examples.ts";
import type { AssetReader } from "../src/app/examples.ts";
import { Workspace } from "../src/app/services.ts";
import { parseQuery } from "../src/engine/types.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { realPorts, exampleText } from "../scripts/gen-example-coverage.ts";
import { readFileSync } from "node:fs";

const assets: AssetReader = (path: string) => Promise.resolve(readFileSync(path.replace(/^\.\//, ""), "utf8"));

/** A loaded shipped example and its agent API — the one seam a person and an agent share. */
function loaded(id: string): { readonly ws: Workspace; readonly api: MageAgentApi } {
  const ws = new Workspace(realPorts);
  const out = ws.load(exampleText(id));
  assert.ok(out.ok, `${id} must load: ${out.findings.map((f) => f.message).join("; ")}`);
  return { ws, api: createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, new ExampleCatalog(ws, assets)) };
}

const FLAGSHIP = "message-bus";

/** A composable relation type that carries an edge — looked up, never spelled (the probe asserts its own preconditions). */
function edgeFixture(system: CanonicalSystem): { readonly relation: string; readonly from: string } {
  const rt = [...system.relationTypes.values()]
    .find((r) => r.pathComposition === "allowed" && system.relations.some((e) => e.type === r.id));
  assert.ok(rt !== undefined, `${FLAGSHIP} declares no composable relation type carrying an edge; the fixture moved`);
  const edge = system.relations.find((e) => e.type === rt.id);
  assert.ok(edge !== undefined, `no '${rt.id}' edge; the lookup above guaranteed one`);
  return { relation: rt.id, from: edge.from };
}

// ----------------------------------------------------------------------------------------------
// Site 1 — `model.related`'s direction parameter
// ----------------------------------------------------------------------------------------------

test("an unrecognized direction REFUSES, and is not the other direction's answer", () => {
  const { ws, api } = loaded(FLAGSHIP);
  const { relation, from } = edgeFixture(ws.state.system);

  // Positive control first: both declared directions still ANSWER. Without this, a `related`
  // that refused everything would pass every assertion below.
  const outgoing = api.model.related(from, relation, "outgoing");
  const incoming = api.model.related(from, relation, "incoming");
  assert.equal(outgoing.outcome, "holds", "the edge's own source must see its target as a successor");
  assert.notEqual(incoming.outcome, "unlicensed", "a declared direction must never refuse");

  for (const bad of ["out", "from", "forward", "OUTGOING", ""]) {
    const r = api.model.related(from, relation, bad as unknown as TraversalDirection);
    assert.equal(r.outcome, "unlicensed", `direction '${bad}' must refuse; got '${r.outcome}'`);
    assert.ok(r.refusal !== null && r.refusal.includes("outgoing") && r.refusal.includes("incoming"),
      `the refusal must teach the accepted values; got: ${String(r.refusal)}`);
    assert.ok(r.refusalDetail !== null, `the refusal must carry its typed half (direction '${bad}')`);
    assert.equal(r.evidence, null, "a refused traversal found nothing and must say so");
    // THE BUG: `"${bad}"` used to return the incoming answer, authoritatively. Pin the refusal as
    // distinct from BOTH real answers, not merely present.
    assert.notDeepStrictEqual(r, incoming,
      `direction '${bad}' returned the incoming answer — the silent-fallback defect`);
    assert.notDeepStrictEqual(r, outgoing,
      `direction '${bad}' returned the outgoing answer — a guess, where a refusal was owed`);
  }
});

// ----------------------------------------------------------------------------------------------
// Site 2 — a graph query's unreadable `where` widened the question
// ----------------------------------------------------------------------------------------------

test("an unreadable graph `where` refuses instead of widening to the unconstrained question", () => {
  const { api, ws } = loaded(FLAGSHIP);
  const { relation, from } = edgeFixture(ws.state.system);
  const graphDoc = (where: unknown): unknown =>
    ({ kind: "graph", quantifier: "exists", graph: { form: "successors", relation, from, where } });

  // Positive control: a readable `where` still parses, and no `where` still parses.
  assert.ok(parseQuery(graphDoc(undefined)).ok, "a where-less query must still parse");
  assert.ok(parseQuery(graphDoc({ source: { classification: "public" } })).ok,
    "a readable where must still parse");

  const unreadable: readonly [string, unknown][] = [
    ["unknown operator", { source: { classification: { gt: 1 } } }],
    ["partially unreadable side", { source: { classification: "public", weight: { gte: 2 } } }],
    ["unknown where key", { src: { classification: "public" } }],
    ["unreadable compare entry", { compare: [{ left: "a", op: "between", right: "b" }] }],
  ];
  for (const [label, where] of unreadable) {
    const parsed = parseQuery(graphDoc(where));
    assert.ok(!parsed.ok, `${label}: the parser must refuse, not drop the clause`);
    // Through the live surface too: the refusal arrives as a result, never as the broad answer.
    const r = api.query(graphDoc(where));
    assert.equal(r.outcome, "unlicensed", `${label}: the surface must refuse`);
    assert.notDeepStrictEqual(r, api.query(graphDoc(undefined)),
      `${label}: the refusal must not be the unconstrained traversal's answer — the widening defect`);
  }
});

// ----------------------------------------------------------------------------------------------
// Site 3 — an `elements` selector's partially unreadable `where` weakened the question
// ----------------------------------------------------------------------------------------------

test("a partially unreadable `elements` selector refuses instead of dropping the unreadable key", () => {
  const { api } = loaded(FLAGSHIP);

  // Positive control: the readable half alone still selects (possibly zero ids — selection, not refusal).
  const control = api.model.elements({ where: { classification: "public" } });
  assert.ok(control.selected, "a readable selector must select");

  const partial = api.model.elements({ where: { classification: "public", weight: { gt: 1 } } });
  assert.ok(!partial.selected,
    "a selector with an unreadable key must refuse whole — dropping the key answers a weaker question");
  if (!partial.selected) {
    assert.ok(partial.refusal.prose.length > 0, "the refusal must carry its teaching sentence");
  }
  // And `count` projects the same refusal rather than producing a number for it.
  const counted = api.model.count({ where: { classification: "public", weight: { gt: 1 } } });
  assert.ok(!counted.counted, "a count over a refused selection must refuse, not report a figure");
});
