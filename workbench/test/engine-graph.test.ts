// Graph-query behaviour. The composition refusal is the first test in the file on purpose: it is
// the pedagogically load-bearing one, and getting it wrong looks like a working engine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { runQuery } from "../src/engine/index.ts";
import { exampleText } from "../scripts/gen-example-coverage.ts";
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

test("predecessors and successors over that forbidden relation are licensed too", () => {
  // The ruling V7 now states outright, and the one the two implementations disagreed about. A
  // `predecessors` query reads the adjacency ONE STEP: it composes nothing, so a declaration about
  // PATHS does not reach it. Gating it would make `composition.path: forbidden` mean "this relation
  // may not be queried", which is not what it says and not what the engine does for `direct`.
  //
  // Pinned on `owns` specifically, because `owns` is the forbidden-composition type: a regression
  // that moved either form into GRAPH_COMPOSING would turn these two answers into refusals.
  const s = docable();
  const into = runQuery(s, graph("predecessors", "owns", { to: "parser" }));
  assert.equal(into.result.outcome, "holds");
  assert.deepEqual(into.nodeSets, [["remediation"]]);
  assert.equal(into.refusal, null);

  const outOf = runQuery(s, graph("successors", "owns", { from: "remediation" }));
  assert.equal(outOf.result.outcome, "holds");
  assert.deepEqual(outOf.nodeSets, [["parser"]]);
  assert.equal(outOf.refusal, null);
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
  // No purpose declares anything covering `invented`, so the honest cause is the absence itself.
  // Pinned against the omission rung below: that rung must not swallow this case.
  assert.equal(answer.refusal?.reason, "unknown-vocabulary");
});

test("V24 at query time: a need a purpose declares omitted refuses as missing-distinction", () => {
  // docable's `service-flow` declares `omits: [observed runtime calls, call frequency, latency]`.
  // Nothing in the system declares a `calls` relation type, and that absence is the model's own
  // decision -- so the refusal quotes the decision rather than reporting a lookup miss. The
  // difference is what the author does next: "not declared" sends them hunting for a misspelling.
  const answer = runQuery(docable(), graph("direct", "calls", { from: "api", to: "gateway" }));

  assert.equal(answer.result.outcome, "unlicensed", "a refusal is still a successful outcome (V7)");
  assert.equal(answer.refusal?.reason, "missing-distinction");
  assert.deepEqual(answer.refusal?.missing, ["observed runtime calls"],
    "the structured half carries the author's own words, not a paraphrase");
  assert.deepEqual(answer.refusal?.models, ["service-flow"]);
  assert.match(answer.result.refusal ?? "", /deliberately omits 'observed runtime calls'/);
  // The structural clause survives: both facts are true and a reader needs both.
  assert.match(answer.result.refusal ?? "", /not declared by this system/);
  assert.equal(answer.result.evidence, null);
});

test("coverage runs need-to-omission, so a need with an extra word is NOT claimed as omitted", () => {
  // The guard that keeps this from guessing. docable's `data-policy` omits `encryption in transit`;
  // `encryption_at_rest` contributes `rest`, which the omission does not have. A looser match would
  // tell an author the model decided something it never considered -- the same wrong-reason defect
  // this rung exists to fix, committed in the other direction.
  const answer = runQuery(docable(), graph("direct", "encryption_at_rest", { from: "api", to: "gateway" }));
  assert.equal(answer.refusal?.reason, "unknown-vocabulary");

  // And the direction that DOES hold: the identifier spelling of the omission itself.
  const covered = runQuery(docable(), graph("direct", "encryption_in_transit", { from: "api", to: "gateway" }));
  assert.equal(covered.refusal?.reason, "missing-distinction");
  assert.deepEqual(covered.refusal?.missing, ["encryption in transit"]);
});

test("§7.6 precedence: subject order first, then declared decision over bare absence", () => {
  // Three causes can be true of one query at once. The ruling is in two parts and they compose.
  //
  // By SUBJECT: the relation type must resolve before composition is consultable, and the form must
  // be licensed before the endpoints are worth reading. That order is unchanged.
  // WITHIN a subject: a declared decision outranks a bare absence.
  const s = build({
    "relation-types": { owns: { description: "d", composition: { path: "forbidden" } } },
    entities: { a: null, b: null },
    models: {
      g: {
        type: "graph", entities: ["a", "b"],
        purpose: { omits: ["observed runtime calls", "payload propagation"] },
        relations: [{ from: "a", to: "b", type: "owns" }],
      },
    },
  });

  // Subject 1, declared: the type resolves nowhere and the model says that is deliberate.
  assert.equal(runQuery(s, graph("reachability", "calls", { from: "a", to: "b" })).refusal?.reason,
    "missing-distinction");

  // All three true at once: a composing form over the forbidden type, with an endpoint that is both
  // undeclared and declared omitted. The FORM is subject 2 and the endpoints are subject 3, so the
  // licensing refusal wins -- the question is not askable in this model's licensing at all, which
  // makes what its endpoints name moot.
  assert.equal(
    runQuery(s, graph("reachability", "owns", { from: "a", to: "payload_propagation" })).refusal?.reason,
    "composition-forbidden");

  // Same endpoint on a form composition licenses: subject 3 is reached, and the declared decision
  // wins there too. One ruling, applied at every rung rather than at the one a brief named.
  const endpoint = runQuery(s, graph("direct", "owns", { from: "a", to: "payload_propagation" }));
  assert.equal(endpoint.refusal?.reason, "missing-distinction");
  assert.deepEqual(endpoint.refusal?.missing, ["payload propagation"]);

  // And an endpoint nobody declared anything about stays the honest absence.
  assert.equal(runQuery(s, graph("direct", "owns", { from: "a", to: "invented" })).refusal?.reason,
    "unknown-vocabulary");
});

test("§5.6: Document Processing's flagship omission answers from the graph path", () => {
  // The case the whole rung exists for, over the model that ships. Before this, the engine said
  // "relation type 'cache_hit_frequency' is not declared by this system" -- true, and §5.6
  // prescribes "the model represents hit and miss costs but deliberately omits their frequencies".
  // "Undeclared type" reads as a typo where "deliberately omits" reads as a modelling decision.
  const s = canonicalize(parse(exampleText("document-processing")));
  const answer = runQuery(s, savedQuery(s, "expected-latency-with-the-cache"));

  assert.equal(answer.result.outcome, "unlicensed");
  assert.equal(answer.refusal?.reason, "missing-distinction");
  assert.deepEqual(answer.refusal?.missing, ["cache hit frequency"]);
  assert.deepEqual(answer.refusal?.models, ["pipeline-performance"]);
  assert.match(answer.result.refusal ?? "", /deliberately omits 'cache hit frequency'/);
  // expected-results.yaml pins `cache_hit_frequency` in the refusal, and keeping the structural
  // clause is what lets the CAUSE change without a shipped fixture's expectation changing.
  assert.match(answer.result.refusal ?? "", /cache_hit_frequency/);
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
