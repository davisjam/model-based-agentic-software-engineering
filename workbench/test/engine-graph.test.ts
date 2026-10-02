// Graph-query behaviour. The composition refusal is the first test in the file on purpose: it is
// the pedagogically load-bearing one, and getting it wrong looks like a working engine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runQuery } from "../src/engine/index.ts";
import { build, docable, savedQuery } from "./engine-fixtures.ts";

const graph = (form: string, relation: string, extra: Record<string, unknown> = {}): unknown =>
  ({ kind: "graph", quantifier: "exists", graph: { form, relation, ...extra } });

test("V7: a multi-hop query over a forbidden relation is UNLICENSED, not refuted", () => {
  const s = docable();
  const answer = runQuery(s, savedQuery(s, "transitive-ownership"));

  assert.equal(answer.result.outcome, "unlicensed");
  // The distinction this test exists to defend: `refuted` would assert that no ownership chain
  // exists, which is a claim the model never made. Refusal reports what is not AUTHORIZED.
  assert.notEqual(answer.result.outcome, "refuted");
  assert.match(answer.result.refusal ?? "", /not licensed by this model/);
  assert.match(answer.result.refusal ?? "", /without path-composition semantics/);
  assert.equal(answer.result.evidence, null);
  // It is a successful result, so it still carries coverage and the system it describes.
  assert.equal(answer.result.coverage.kind, "not-applicable");
  assert.match(answer.result.systemHash, /^fnv1a64:/);
  // And the structured half an agent reads instead of the prose.
  assert.equal(answer.refusal?.reason, "composition-forbidden");
  assert.deepEqual(answer.refusal?.missing, ["path-composition semantics for relation type 'owns'"]);
  assert.deepEqual(answer.refusal?.models, ["service-flow"]);
});

test("a DIRECT query over that same forbidden relation is licensed and answered", () => {
  const s = docable();
  // `composition.path: forbidden` gates multi-hop forms only; asking about one declared edge is
  // asking what the model literally says.
  assert.equal(runQuery(s, graph("direct", "owns", { from: "remediation", to: "parser" })).result.outcome, "holds");
  assert.equal(runQuery(s, graph("direct", "owns", { from: "api", to: "parser" })).result.outcome, "refuted");
});

test("BFS yields the shortest witness, so the evidence is the most legible one", () => {
  const answer = runQuery(docable(), graph("reachability", "may_invoke", { from: "api", to: "gateway" }));
  assert.equal(answer.result.outcome, "holds");
  assert.deepEqual(answer.result.evidence?.nodes, ["api", "remediation", "gateway"]);
  assert.equal(answer.result.evidence?.shape, "path");
  assert.equal(answer.result.evidence?.role, "witness");
});

test("adjacency is the union across models, so an edge cannot escape by changing model", () => {
  const s = build({
    "relation-types": { r: { description: "d", composition: { path: "allowed" } } },
    entities: { a: null, b: null, c: null },
    models: {
      one: { relations: [{ from: "a", to: "b", type: "r" }] },
      two: { relations: [{ from: "b", to: "c", type: "r" }] },
    },
  });
  const answer = runQuery(s, graph("path", "r", { from: "a", to: "c" }));
  assert.equal(answer.result.outcome, "holds");
  assert.deepEqual(answer.result.evidence?.nodes, ["a", "b", "c"]);
});

test("an undeclared relation type is refused, not answered as absent", () => {
  const answer = runQuery(docable(), graph("direct", "invented", { from: "api", to: "gateway" }));
  assert.equal(answer.result.outcome, "unlicensed");
  assert.match(answer.result.refusal ?? "", /not declared by this system/);
});

test("a forall graph query is refused with the right pairing named", () => {
  const s = docable();
  const answer = runQuery(s, {
    kind: "graph", quantifier: "forall",
    graph: { form: "path", relation: "may_invoke", from: "api", to: "gateway" },
  });
  assert.equal(answer.result.outcome, "unlicensed");
  assert.equal(answer.refusal?.reason, "quantifier-mismatch");
  assert.match(answer.result.refusal ?? "", /quantifier: exists/);
});

test("V8: a symmetric relation traverses both ways without a declared reverse edge", () => {
  const s = build({
    "relation-types": { peer: { description: "d", composition: { path: "allowed" }, properties: { symmetric: true } } },
    entities: { a: null, b: null },
    models: { m: { relations: [{ from: "a", to: "b", type: "peer" }] } },
  });
  assert.equal(runQuery(s, graph("direct", "peer", { from: "b", to: "a" })).result.outcome, "holds");
});

test("V22: a hop bound that truncates reads inconclusive, never refuted", () => {
  const answer = runQuery(docable(),
    graph("reachability", "may_invoke", { from: "api", to: "gateway", "max-hops": 1 }));
  assert.equal(answer.result.outcome, "inconclusive");
  assert.notEqual(answer.result.outcome, "refuted");
  assert.equal(answer.result.coverage.kind, "bounded");
  assert.equal(answer.result.coverage.reason, "depth-limit");
});

test("cycle detection stays licensed on a forbidden-composition type, because V8 checks it", () => {
  // docable's `owns` declares BOTH path: forbidden and acyclic: true. Cycle detection must
  // therefore be licensed, or the acyclic declaration could never be checked.
  const clean = runQuery(docable(), graph("cycles", "owns"));
  assert.equal(clean.result.outcome, "refuted");

  const cyclic = build({
    "relation-types": { owns: { description: "d", properties: { acyclic: true } } },
    entities: { a: null, b: null },
    models: { m: { relations: [{ from: "a", to: "b", type: "owns" }, { from: "b", to: "a", type: "owns" }] } },
  });
  const found = runQuery(cyclic, graph("cycles", "owns"));
  assert.equal(found.result.outcome, "holds");
  assert.deepEqual(found.result.evidence?.nodes, ["a", "b", "a"]);
});

test("V20: the cross-model security join finds restricted content reaching a public service", () => {
  const s = docable();
  const answer = runQuery(s, savedQuery(s, "restricted-reaches-public"));
  assert.equal(answer.result.outcome, "holds");
  // remediation (classification: restricted) flows to gateway (accepts: public), and restricted
  // outranks public in the declared ordered domain.
  assert.deepEqual(answer.result.evidence?.nodes, ["remediation", "gateway"]);
});

test("V20: an order comparison without one shared ordered domain is refused", () => {
  const s = build({
    "relation-types": { f: { description: "d", composition: { path: "allowed" } } },
    entities: { a: { properties: { size: 3 } }, b: { properties: { cap: 1 } } },
    models: { m: { relations: [{ from: "a", to: "b", type: "f" }] } },
  });
  const answer = runQuery(s, graph("path", "f", {
    where: { compare: [{ left: "source.size", op: "gt", right: "target.cap" }] },
  }));
  assert.equal(answer.result.outcome, "unlicensed");
  assert.match(answer.result.refusal ?? "", /neither side declares a domain/);
  assert.match(answer.result.refusal ?? "", /V20/);
});

test("a path query naming neither endpoint and carrying no where-clause is refused", () => {
  // Rather than answered vacuously: `_shortest_path(adj, None, None)` in validate.py takes the
  // `src == dst` early return and reports `holds` for a question that was never posed.
  const answer = runQuery(docable(), graph("path", "may_invoke"));
  assert.equal(answer.result.outcome, "unlicensed");
  assert.match(answer.result.refusal ?? "", /there is no question to answer/);
});

test("containment yields the hierarchical path and tests transitive containment", () => {
  const s = docable();
  const chain = runQuery(s, graph("containment", "contains", { to: "parser" }));
  assert.equal(chain.result.outcome, "holds");
  assert.deepEqual(chain.result.evidence?.nodes, ["remediation", "parser"]);

  const inside = runQuery(s, graph("containment", "contains", { from: "remediation", to: "parser" }));
  assert.equal(inside.result.outcome, "holds");
  const outside = runQuery(s, graph("containment", "contains", { from: "api", to: "parser" }));
  assert.equal(outside.result.outcome, "refuted");
});

test("components reports the whole weakly-connected group, including upstream entities", () => {
  const answer = runQuery(docable(), graph("components", "may_invoke", { from: "gateway" }));
  assert.equal(answer.result.outcome, "holds");
  // Direction is ignored for a component, so gateway's group reaches back through remediation to
  // api. `parser` is absent: it is joined to remediation by `owns`, and a component is per relation
  // TYPE -- mixing types would invent edges the model does not declare.
  assert.deepEqual(answer.nodeSets, [["api", "gateway", "remediation"]]);
});

test("all-paths witnesses the shortest and carries every path in nodeSets", () => {
  const s = build({
    "relation-types": { r: { description: "d", composition: { path: "allowed" } } },
    entities: { a: null, b: null, c: null, d: null },
    models: {
      m: {
        relations: [
          { from: "a", to: "d", type: "r" },
          { from: "a", to: "b", type: "r" },
          { from: "b", to: "c", type: "r" },
          { from: "c", to: "d", type: "r" },
        ],
      },
    },
  });
  const answer = runQuery(s, graph("all-paths", "r", { from: "a", to: "d" }));
  assert.equal(answer.result.outcome, "holds");
  assert.deepEqual(answer.result.evidence?.nodes, ["a", "d"]);
  assert.deepEqual(answer.nodeSets, [["a", "d"], ["a", "b", "c", "d"]]);
});

test("predecessors and successors answer about direct neighbours", () => {
  const s = docable();
  const before = runQuery(s, graph("predecessors", "may_invoke", { to: "gateway" }));
  assert.equal(before.result.outcome, "holds");
  assert.deepEqual(before.nodeSets, [["remediation"]]);

  const after = runQuery(s, graph("successors", "may_invoke", { from: "gateway" }));
  assert.equal(after.result.outcome, "refuted");
  assert.deepEqual(after.nodeSets, []);
});

test("every graph result states the question it actually evaluated (V21)", () => {
  const answer = runQuery(docable(), graph("shortest-path", "may_invoke", { from: "api", to: "gateway" }));
  assert.match(answer.result.interpretedAs ?? "", /shortest 'may_invoke' path from api to gateway/);
});

test("a query without a quantifier is refused rather than guessed", () => {
  const answer = runQuery(docable(), { kind: "graph", graph: { form: "direct", relation: "owns" } });
  assert.equal(answer.result.outcome, "unlicensed");
  assert.match(answer.result.refusal ?? "", /must declare its quantifier/);
});

test("garbage never throws; it comes back as a refusal", () => {
  for (const junk of [null, 42, "text", [], {}, { kind: "graph", quantifier: "exists" }]) {
    const answer = runQuery(docable(), junk);
    assert.equal(answer.result.outcome, "unlicensed");
    assert.ok((answer.result.refusal ?? "").length > 0);
  }
});
