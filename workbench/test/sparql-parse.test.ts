// SPARQL text -> the landed algebra -> solutions, end to end.
//
// `test/sparql-eval.test.ts` runs the ten-row conformance oracle against hand-built algebra. This
// file runs THE SAME TEN ROWS as SPARQL TEXT, over the real projection, through the real licensing
// gate. That duplication is the point: the oracle proves the evaluator is right, and this file
// proves the parse path delivers a query the evaluator can still be right about. A translation that
// dropped a branch of `(p|^p)` would leave the evaluator correct and the product wrong, which is
// exactly the failure Comunica shipped (`MEASUREMENT-comunica-261002.md` §6).
//
// §7's lesson is kept: every assertion pins the ROW SET. The first pass of that table reported
// 13-of-13 ok on an engine that was answering `false` to a modelled fact, and what surfaced the
// defect was adding the expected rows.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  answerSparql, translate,
  type Answer, type GraphPattern, type PropertyPath, type Translation,
} from "../src/sparql/index.ts";
import { entityIri, modelGraphIri, relationTypeIri } from "../src/rdf/iri.ts";
import { project } from "../src/rdf/project.ts";
import type { Dataset } from "../src/rdf/terms.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { build } from "./engine-fixtures.ts";

// --------------------------------------------------------------------------------------------
// Fixtures — the measurement's isolating store, as a MAGE model system
// --------------------------------------------------------------------------------------------

/**
 * The §6 store, rebuilt in MAGE's own terms: `a -p-> b`, `a -q-> c`, `d -r-> a`, all in one model's
 * named graph. The measurement used `urn:a` / `urn:p`; the text path only reaches relation edges
 * through declared relation types, so the oracle has to be expressed as a model to be asked at all.
 * Composition is `allowed` on all three, because four of the ten rows are closures.
 */
const oracleSystem = (): CanonicalSystem => build({
  "relation-types": {
    p: { description: "p", composition: { path: "allowed" } },
    q: { description: "q", composition: { path: "allowed" } },
    r: { description: "r", composition: { path: "allowed" } },
  },
  entities: { a: null, b: null, c: null, d: null },
  models: {
    one: {
      relations: [
        { from: "a", to: "b", type: "p" },
        { from: "a", to: "c", type: "q" },
        { from: "d", to: "a", type: "r" },
      ],
    },
  },
});

/** Two models over one relation type, so `GRAPH ?g` and a model scope are distinguishable. */
const twoModels = (): CanonicalSystem => build({
  "relation-types": { calls: { description: "d", composition: { path: "allowed" } } },
  entities: { a: null, b: null, c: null },
  models: {
    one: { relations: [{ from: "a", to: "b", type: "calls" }] },
    two: { relations: [{ from: "b", to: "c", type: "calls" }] },
  },
});

/**
 * `owns` forbids path composition and `peers` is symmetric — the two IR declarations layer 2 must
 * read rather than guess (V7, V8).
 */
const licensingSystem = (): CanonicalSystem => build({
  "relation-types": {
    calls: { description: "d", composition: { path: "allowed" } },
    owns: { description: "d", composition: { path: "forbidden" } },
    peers: { description: "d", composition: { path: "allowed" }, properties: { symmetric: true } },
  },
  entities: { a: null, b: null, c: null },
  models: {
    one: {
      relations: [
        { from: "a", to: "b", type: "calls" },
        { from: "b", to: "c", type: "calls" },
        { from: "a", to: "b", type: "owns" },
        { from: "a", to: "b", type: "peers" },
      ],
    },
  },
});

const SYS = "t";

/**
 * Namespace prefixes derived from the minting functions, never spelled out: `entityIri(sys, "")`
 * yields the namespace itself, so a change to the URN scheme in `iri.ts` moves these with it
 * instead of leaving a stale literal that passes for a while.
 */
const ENT = entityIri(SYS, "").value;
const RT = relationTypeIri(SYS, "").value;
const G_ONE = modelGraphIri(SYS, "one").value;
const G_TWO = modelGraphIri(SYS, "two").value;

const PREFIXES = `PREFIX ent: <${ENT}>\nPREFIX rt: <${RT}>\n`;

const ent = (id: string): string => ENT + id;

/** `SELECT ?x WHERE { GRAPH <one> { ent:a «path» ?x } }` — the scoping the design made standard. */
const graphSelect = (path: string, subject = "ent:a"): string =>
  `${PREFIXES}SELECT ?x WHERE { GRAPH <${G_ONE}> { ${subject} ${path} ?x } }`;

/** The same question under the other scoping. `FROM` promotes the named graph to the default one. */
const fromSelect = (path: string, subject = "ent:a"): string =>
  `${PREFIXES}SELECT ?x FROM <${G_ONE}> WHERE { ${subject} ${path} ?x }`;

/** The `?x` column, in result order. Fails loudly on any arm but a select result. */
function xs(answer: Answer): string[] {
  assert.equal(answer.kind, "select-result",
    answer.kind === "refused" ? `unexpected refusal: ${answer.refusal.prose}` : `got ${answer.kind}`);
  if (answer.kind !== "select-result") return [];
  return answer.rows.map((row) => {
    const t = row.get("x");
    assert.ok(t !== undefined, "every oracle row binds ?x");
    return t.value;
  });
}

function askValue(answer: Answer): boolean {
  assert.equal(answer.kind, "ask-result",
    answer.kind === "refused" ? `unexpected refusal: ${answer.refusal.prose}` : `got ${answer.kind}`);
  if (answer.kind !== "ask-result") return false;
  return answer.value;
}

/** The refusal, asserting the arm rather than reading through it. */
function refusalOf(result: Answer | Translation): { cause: string; missing: readonly string[]; prose: string } {
  assert.equal(result.kind, "refused", `expected a refusal, got ${result.kind}`);
  if (result.kind !== "refused") return { cause: "", missing: [], prose: "" };
  return result.refusal;
}

const ORACLE_SYSTEM = oracleSystem();
const ORACLE_STORE: Dataset = project(ORACLE_SYSTEM);

/** The answer alone. The escalation handle beside it is the facade's business; `services.test.ts` drives it. */
const ask = (system: CanonicalSystem, dataset: Dataset, text: string): Answer =>
  answerSparql(system, dataset, text).answer;

// --------------------------------------------------------------------------------------------
// The conformance oracle, through the text path
// --------------------------------------------------------------------------------------------

/** MEASUREMENT §6's `correct` column, with each pattern written as the author would write it. */
const ORACLE: readonly (readonly [string, readonly string[]])[] = [
  ["rt:p", [ent("b")]],
  ["^rt:r", [ent("d")]],
  ["!(rt:q)", [ent("b")]],
  ["(rt:p|rt:q)", [ent("b"), ent("c")]],
  ["(rt:p|^rt:r)", [ent("b"), ent("d")]],
  // Written order must be irrelevant — Comunica kept the inverse branch whichever side it sat on.
  ["(^rt:r|rt:p)", [ent("b"), ent("d")]],
  // Bag semantics: two inverse branches, the same solution twice (SPARQL 1.1 §18.2.2.4).
  ["(^rt:r|^rt:r)", [ent("d"), ent("d")]],
  ["(rt:p|rt:q|^rt:r)", [ent("b"), ent("c"), ent("d")]],
  // Precedence: `/` binds tighter than `|`, and a forward SEQUENCE branch must survive too.
  ["(rt:p/rt:p|rt:q)", [ent("c")]],
  // Closure binds the SUBJECT: the zero-length path makes `?x = a` a solution.
  ["(rt:p|rt:q)*", [ent("a"), ent("b"), ent("c")]],
];

test("oracle from TEXT: every row produces the correct column inside a GRAPH block", () => {
  for (const [path, expected] of ORACLE) {
    assert.deepEqual(xs(ask(ORACLE_SYSTEM, ORACLE_STORE, graphSelect(path))), expected,
      `GRAPH scoping, pattern ${path}`);
  }
});

test("oracle from TEXT: every row produces the correct column under FROM", () => {
  for (const [path, expected] of ORACLE) {
    assert.deepEqual(xs(ask(ORACLE_SYSTEM, ORACLE_STORE, fromSelect(path))), expected,
      `FROM scoping, pattern ${path}`);
  }
});

test("oracle from TEXT: GRAPH and FROM yield identical solutions on every row", () => {
  // The suite's most valuable assertion, and the one the parse path can newly break: the two
  // scopings derive DIFFERENT scopes here (`model one` versus `model one`, by different routes),
  // so a translation that mishandled either would show up as a divergence the evaluator cannot
  // cause — its scoping is one code path.
  for (const [path] of ORACLE) {
    assert.deepEqual(
      xs(ask(ORACLE_SYSTEM, ORACLE_STORE, graphSelect(path))),
      xs(ask(ORACLE_SYSTEM, ORACLE_STORE, fromSelect(path))),
      `scoping changed the solutions for ${path}`,
    );
  }
});

// --------------------------------------------------------------------------------------------
// The symmetry hazard — `(p|^p)` under GRAPH, which is the cell Comunica mis-answers
// --------------------------------------------------------------------------------------------

/** The first triple's predicate inside a `GRAPH { BGP }` query, with the shape asserted. */
function graphPredicate(translation: Translation): PropertyPath {
  assert.equal(translation.kind, "query", `expected a translated query, got ${translation.kind}`);
  if (translation.kind !== "query") throw new Error("unreachable");
  const [outer] = translation.query.where;
  assert.ok(outer !== undefined && outer.kind === "graph", "the query must be GRAPH-scoped");
  const graph: GraphPattern = outer;
  if (graph.kind !== "graph") throw new Error("unreachable");
  const [bgp] = graph.patterns;
  assert.ok(bgp !== undefined && bgp.kind === "bgp", "the GRAPH block must hold a BGP");
  if (bgp.kind !== "bgp") throw new Error("unreachable");
  const [triple] = bgp.triples;
  assert.ok(triple !== undefined, "the BGP must hold a triple");
  const predicate = triple.predicate;
  assert.ok(predicate.kind !== "iri" && predicate.kind !== "variable", "expected a property path");
  return predicate;
}

test("(p|^p) under GRAPH survives the round trip, in BOTH branch directions", () => {
  // This test exists because `(mage:rel|^mage:rel)` inside `GRAPH <g>` is the one construct and
  // position Comunica 5.4.1 silently gets wrong: it drops every non-inverted branch, so an ASK over
  // a fact the model asserts answers `false`. V8 picked alternation as the symmetry encoding and §2
  // made named graphs the normal scoping, so the defect lands on the standard case. Our evaluator
  // passes the oracle there; what this pins is that the TEXT path hands it the same query.
  //
  // Direction matters, and the measurement says why: the FORWARD branch is the dropped one, so the
  // subject must be the quad's subject or the surviving inverse branch answers correctly and hides
  // the bug. Both directions are asserted.
  const system = licensingSystem();
  const dataset = project(system);
  const symmetric = "(rt:peers|^rt:peers)";
  const forward =
    `${PREFIXES}ASK { GRAPH <${G_ONE}> { ent:a ${symmetric} ent:b } }`;
  const backward =
    `${PREFIXES}ASK { GRAPH <${G_ONE}> { ent:b ${symmetric} ent:a } }`;

  assert.equal(askValue(ask(system, dataset, forward)), true,
    "the forward branch is the cell Comunica answers false on");
  assert.equal(askValue(ask(system, dataset, backward)), true,
    "the inverse branch must answer too — symmetry is traversed in both directions");

  // And the same question under the other scoping, which must not change the answer.
  const underFrom = `${PREFIXES}ASK FROM <${G_ONE}> { ent:a ${symmetric} ent:b }`;
  assert.equal(askValue(ask(system, dataset, underFrom)), true);
});

test("the alternation reaches the algebra intact — two branches, one inverted, in written order", () => {
  // Structural, not behavioral: a translation that silently normalized, reordered or deduplicated
  // the branches could still pass the ASK above while having rewritten the author's query.
  const predicate = graphPredicate(
    translate(licensingSystem(), `${PREFIXES}ASK { GRAPH <${G_ONE}> { ent:a (rt:peers|^rt:peers) ent:b } }`));
  const peers = relationTypeIri(SYS, "peers");
  assert.deepEqual(predicate, {
    kind: "path-alternative",
    paths: [peers, { kind: "path-inverse", path: peers }],
  });
});

test("a symmetric relation type is NOT rewritten into an alternation", () => {
  // V8 says the QUERY BUILDER emits `(rel|^rel)` for a symmetric type. The text path must not:
  // §3 forbids rewriting a user's query, and a silently rewritten query answers a different
  // question. So `ent:b rt:peers ent:a` asks a direction the data does not hold, and must answer
  // false even though `peers` is declared symmetric.
  const system = licensingSystem();
  const dataset = project(system);
  assert.equal(
    askValue(ask(system, dataset, `${PREFIXES}ASK { GRAPH <${G_ONE}> { ent:b rt:peers ent:a } }`)),
    false, "the bare predicate must stay bare — one direction, as written");
  assert.equal(
    askValue(ask(system, dataset, `${PREFIXES}ASK { GRAPH <${G_ONE}> { ent:a rt:peers ent:b } }`)),
    true, "and the direction the data does hold answers true");

  // The gate still reports the symmetry it read off the IR — it is the caller's to encode, not
  // ours to inject. Both facts at once is the whole content of V8 on this side of the seam.
  const translation = translate(system, `${PREFIXES}ASK { GRAPH <${G_ONE}> { ent:a rt:peers ent:b } }`);
  assert.equal(translation.kind, "query");
  if (translation.kind !== "query") return;
  assert.equal(translation.question.directions, "both");
});

// --------------------------------------------------------------------------------------------
// Round trips
// --------------------------------------------------------------------------------------------

test("a SELECT round-trips from text to the correct solutions", () => {
  const system = twoModels();
  const dataset = project(system);
  const text =
    `${PREFIXES}SELECT ?from ?to WHERE { GRAPH ?g { ?from rt:calls ?to } } ORDER BY ?from LIMIT 5`;
  const answer = ask(system, dataset, text);
  assert.equal(answer.kind, "select-result");
  if (answer.kind !== "select-result") return;
  assert.deepEqual(answer.variables, ["from", "to"]);
  assert.deepEqual(
    answer.rows.map((r) => [r.get("from")?.value, r.get("to")?.value]),
    [[ent("a"), ent("b")], [ent("b"), ent("c")]],
    "the union over both models' graphs, which is the engine's cross-model adjacency",
  );
});

test("an ASK round-trips from text, true and false", () => {
  const system = twoModels();
  const dataset = project(system);
  // a -p-> b lives in model one and b -p-> c in model two, so reaching c from a is a cross-model
  // closure — and a dataset clause listing both graphs is what merges them (see the next test).
  const reaches = (from: string, to: string): string =>
    `${PREFIXES}ASK FROM <${G_ONE}> FROM <${G_TWO}> { ent:${from} rt:calls+ ent:${to} }`;
  assert.equal(askValue(ask(system, dataset, reaches("a", "c"))), true);
  assert.equal(askValue(ask(system, dataset, reaches("c", "a"))), false,
    "an honest false, not a refusal and not an empty select");
});

test("GRAPH ?g unions per-graph SOLUTIONS; only a dataset clause merges the graphs", () => {
  // The sharpest thing measured while wiring the text path, and it contradicts prose in
  // `project.ts` and `licensing.ts` that calls an unscoped `GRAPH ?g { … }` the cross-model union.
  // It is the union of per-graph EVALUATIONS: `?g` binds to one graph per solution, so neither a
  // property path nor a BGP join can cross a graph boundary inside it. `FROM <g1> FROM <g2>` is
  // what merges the listed graphs into one default graph, and only there does a chain cross models.
  //
  // This matters because §2 justifies the union scope by escapability — "an architectural claim
  // asked this way cannot be escaped by moving the offending edge into a different model". Under
  // `GRAPH ?g`, moving an edge to another model DOES break the chain, silently. The design doc's
  // §7 records the finding; this test is here so the distinction cannot rot back into a guess.
  const system = twoModels();
  const dataset = project(system);
  const path = (scoping: string): string => `${PREFIXES}SELECT ?x ${scoping}`;

  assert.deepEqual(
    xs(ask(system, dataset, path(`WHERE { GRAPH ?g { ent:a rt:calls+ ?x } }`))),
    [ent("b")],
    "the closure stops at the graph boundary: b is in model one, c is in model two");
  assert.deepEqual(
    xs(ask(system, dataset, path(`FROM <${G_ONE}> FROM <${G_TWO}> WHERE { ent:a rt:calls+ ?x }`))),
    [ent("b"), ent("c")],
    "the dataset clause merges both graphs, so the chain crosses models");

  // The same split for a two-triple join, which rules out "it is a quirk of closures".
  assert.deepEqual(
    xs(ask(system, dataset, path(`WHERE { GRAPH ?g { ent:a rt:calls ?m . ?m rt:calls ?x } }`))),
    [], "no single model holds both hops");
  assert.deepEqual(
    xs(ask(system, dataset, path(`FROM <${G_ONE}> FROM <${G_TWO}> WHERE { ent:a rt:calls ?m . ?m rt:calls ?x }`))),
    [ent("c")]);
});

test("aggregates, GROUP BY, ORDER BY, OPTIONAL and FILTER round-trip", () => {
  const system = twoModels();
  const dataset = project(system);
  const text = `${PREFIXES}
    SELECT ?g (COUNT(?to) AS ?n) WHERE {
      GRAPH ?g { ?from rt:calls ?to OPTIONAL { ?to rt:calls ?onward } FILTER(?from != ?to) }
    } GROUP BY ?g ORDER BY DESC(?g)`;
  const answer = ask(system, dataset, text);
  assert.equal(answer.kind, "select-result");
  if (answer.kind !== "select-result") return;
  assert.deepEqual(
    answer.rows.map((r) => [r.get("g")?.value, r.get("n")?.value]),
    [[modelGraphIri(SYS, "two").value, "1"], [modelGraphIri(SYS, "one").value, "1"]],
    "one edge per model's graph, ordered descending by graph IRI",
  );
});

test("determinism: the same text twice gives identical solutions", () => {
  const system = twoModels();
  const dataset = project(system);
  // A path alternation and an unscoped GRAPH, so both of the evaluator's order-bearing paths —
  // branch order and graph-iteration order — are in play. The result must not remember either.
  const text = `${PREFIXES}SELECT ?x WHERE { GRAPH ?g { ent:b (rt:calls|^rt:calls)* ?x } }`;
  const first = xs(ask(system, dataset, text));
  const second = xs(ask(system, dataset, text));
  assert.deepEqual(second, first);
  // Two graphs, evaluated separately: model one gives {b, a} and model two gives {b, c}. The
  // duplicate `b` is bag semantics across the two evaluations, not nondeterminism — and pinning it
  // is what makes the determinism claim mean something.
  assert.deepEqual(first, [ent("a"), ent("b"), ent("b"), ent("c")]);

  // Written branch order must leave no trace either.
  const swapped = `${PREFIXES}SELECT ?x WHERE { GRAPH ?g { ent:b (^rt:calls|rt:calls)* ?x } }`;
  assert.deepEqual(xs(ask(system, dataset, swapped)), first);
});

// --------------------------------------------------------------------------------------------
// The subset, enforced by walking the parse
// --------------------------------------------------------------------------------------------

/** Every out-of-subset construct, the text that reaches it, and the name the refusal must carry. */
const OUTSIDE_SUBSET: readonly (readonly [string, string])[] = [
  ["UNION", `SELECT ?x WHERE { GRAPH <${G_ONE}> { { ?s rt:p ?x } UNION { ?x rt:p ?s } } }`],
  ["MINUS", `SELECT ?x WHERE { GRAPH <${G_ONE}> { ?x rt:p ?o MINUS { ?x rt:q ?o } } }`],
  ["BIND", `SELECT ?x WHERE { GRAPH <${G_ONE}> { ?s rt:p ?o BIND(?o AS ?x) } }`],
  ["VALUES", `SELECT ?x WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x } VALUES ?x { ent:a } }`],
  ["SERVICE", `SELECT ?x WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x } SERVICE <urn:e> { ?s rt:q ?x } }`],
  ["sub-SELECT", `SELECT ?x WHERE { GRAPH <${G_ONE}> { { SELECT ?x WHERE { ?s rt:p ?x } } } }`],
  ["SELECT *", `SELECT * WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x } }`],
  ["DISTINCT", `SELECT DISTINCT ?x WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x } }`],
  ["REDUCED", `SELECT REDUCED ?x WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x } }`],
  ["OFFSET", `SELECT ?x WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x } } LIMIT 2 OFFSET 1`],
  ["HAVING",
    `SELECT ?s (COUNT(?x) AS ?n) WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x } } GROUP BY ?s HAVING(COUNT(?x) > 1)`],
  ["property path '?'", `SELECT ?x WHERE { GRAPH <${G_ONE}> { ent:a rt:p? ?x } }`],
  ["aggregate AVG", `SELECT (AVG(?x) AS ?n) WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x } }`],
  ["DISTINCT inside an aggregate",
    `SELECT (COUNT(DISTINCT ?x) AS ?n) WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x } }`],
  ["expression in SELECT", `SELECT (?x AS ?y) WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x } }`],
  ["ORDER BY expression", `SELECT ?x WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x } } ORDER BY STR(?x)`],
  ["FILTER REGEX", `SELECT ?x WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x FILTER(regex(?x, "a")) } }`],
  ["FILTER EXISTS",
    `SELECT ?x WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x FILTER EXISTS { ?x rt:q ?y } } }`],
  ["FILTER IN", `SELECT ?x WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x FILTER(?x IN (ent:a)) } }`],
  ["negated property set over an inverse or nested path",
    `SELECT ?x WHERE { GRAPH <${G_ONE}> { ent:a !(^rt:q) ?x } }`],
  ["blank node", `SELECT ?x WHERE { GRAPH <${G_ONE}> { [] rt:p ?x } }`],
  ["language-tagged literal", `SELECT ?x WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x FILTER(?x = "hi"@en) } }`],
  ["FROM NAMED", `SELECT ?x FROM NAMED <${G_ONE}> WHERE { GRAPH <${G_ONE}> { ?s rt:p ?x } }`],
  ["CONSTRUCT", `CONSTRUCT { ?s rt:p ?o } WHERE { GRAPH <${G_ONE}> { ?s rt:p ?o } }`],
  ["DESCRIBE", `DESCRIBE ent:a`],
  ["SPARQL Update", `INSERT DATA { GRAPH <${G_ONE}> { ent:a rt:p ent:c } }`],
];

test("every out-of-subset construct refuses, NAMING the construct, and does not evaluate", () => {
  for (const [construct, body] of OUTSIDE_SUBSET) {
    const text = PREFIXES + body;
    const answer = ask(ORACLE_SYSTEM, ORACLE_STORE, text);
    const refusal = refusalOf(answer);
    assert.equal(refusal.cause, "outside-supported-subset", `cause for ${construct}`);
    assert.deepEqual(refusal.missing, [construct], `the refusal must name ${construct}`);
    // "Did not evaluate" is the other half: a refusal and an empty result are different arms, so a
    // caller cannot read one as the other. Asserting the arm is asserting that no rows were made.
    assert.equal(answer.kind, "refused", `${construct} must not produce a result arm`);
  }
});

test("the refusal says the query was not rewritten, and cites the subset it checked against", () => {
  // §3's promise has to be legible to the person reading the refusal, not only to us.
  const refusal = refusalOf(
    ask(ORACLE_SYSTEM, ORACLE_STORE, PREFIXES + `SELECT ?x WHERE { GRAPH <${G_ONE}> { { ?s rt:p ?x } UNION { ?x rt:p ?s } } }`));
  assert.match(refusal.prose, /UNION/);
  assert.match(refusal.prose, /not rewritten/);
});

test("an unrecognized node refuses rather than being skipped", () => {
  // The defect this layer exists to prevent. A custom function call in a FILTER parses to
  // `{ type: "functionCall" }`, which the walker has no arm for. Skipping it would drop the FILTER
  // and answer a DIFFERENT, NON-EMPTY question — which is how Comunica produced a wrong answer
  // instead of an error. So the assertion is not "empty": it is that the rows the stripped query
  // would have returned do not come back, and a refusal does.
  const withoutFilter = graphSelect("rt:p");
  assert.deepEqual(xs(ask(ORACLE_SYSTEM, ORACLE_STORE, withoutFilter)), [ent("b")],
    "the query minus the unrecognized node has solutions, so skipping it would be visible");

  const text = PREFIXES +
    `SELECT ?x WHERE { GRAPH <${G_ONE}> { ent:a rt:p ?x FILTER(<urn:f>(?x)) } }`;
  const answer = ask(ORACLE_SYSTEM, ORACLE_STORE, text);
  const refusal = refusalOf(answer);
  assert.equal(refusal.cause, "outside-supported-subset");
  assert.deepEqual(refusal.missing, ["unrecognized FILTER expression"]);
  assert.notEqual(answer.kind, "select-result", "a skipped FILTER would have yielded rows");
});

test("a syntax error is a structured refusal, not a thrown parser exception", () => {
  const refusal = refusalOf(ask(ORACLE_SYSTEM, ORACLE_STORE, "SELECT ?x WHERE {"));
  assert.equal(refusal.cause, "outside-supported-subset");
  assert.deepEqual(refusal.missing, ["SPARQL syntax error"]);
});

// --------------------------------------------------------------------------------------------
// The scope mapping — derived from the text's graph form, never defaulted
// --------------------------------------------------------------------------------------------

test("scope mapping: GRAPH <g> scopes to that model, GRAPH ?g is the system union", () => {
  const system = twoModels();
  const scopeOf = (text: string): string => {
    const translation = translate(system, text);
    assert.equal(translation.kind, "query", `expected a query, got ${translation.kind}`);
    if (translation.kind !== "query") return "";
    return translation.scope.kind === "model" ? `model:${translation.scope.model}` : "system-union";
  };

  assert.equal(scopeOf(`${PREFIXES}SELECT ?x WHERE { GRAPH <${G_ONE}> { ?s rt:calls ?x } }`),
    "model:one", "one named graph is a question about one purposeful reduction");
  assert.equal(scopeOf(`${PREFIXES}SELECT ?x WHERE { GRAPH ?g { ?s rt:calls ?x } }`),
    "system-union", "an unscoped GRAPH ?g reproduces the engine's cross-model adjacency");
  assert.equal(
    scopeOf(`${PREFIXES}SELECT ?x WHERE { GRAPH <${G_ONE}> { ?s rt:calls ?x } GRAPH <${G_TWO}> { ?x rt:calls ?y } }`),
    "system-union",
    "two models named: union is forced, because no model scope makes both graphs visible");
});

test("scope mapping: FROM takes its scope from the graphs it lists", () => {
  const system = twoModels();
  const dataset = project(system);
  const scopeOf = (text: string): string => {
    const translation = translate(system, text);
    assert.equal(translation.kind, "query");
    if (translation.kind !== "query") return "";
    return translation.scope.kind === "model" ? `model:${translation.scope.model}` : "system-union";
  };
  assert.equal(scopeOf(`${PREFIXES}SELECT ?x FROM <${G_ONE}> WHERE { ?s rt:calls ?x }`), "model:one");
  assert.equal(
    scopeOf(`${PREFIXES}SELECT ?x FROM <${G_ONE}> FROM <${G_TWO}> WHERE { ?s rt:calls ?x }`),
    "system-union",
    "two FROM graphs REQUIRE the union: applyFrom merges them out of the visible named graphs, " +
    "so a model scope would hide one and drop its quads without a word");

  // And the merge is real, not nominal: the two-graph dataset clause sees both models' edges.
  assert.deepEqual(
    xs(ask(system, dataset, `${PREFIXES}SELECT ?x FROM <${G_ONE}> FROM <${G_TWO}> WHERE { ?s rt:calls ?x }`)),
    [ent("b"), ent("c")]);
});

test("scope mapping: a bare WHERE refuses, because the text states no scope", () => {
  // V34 — scope has no default, and `system-union` is NOT the default graph. The default graph
  // holds no relation edge, so mapping a bare WHERE onto either scope would answer every
  // architectural question with a confident empty set and look like it worked.
  const system = twoModels();
  const refusal = refusalOf(
    translate(system, `${PREFIXES}SELECT ?x WHERE { ent:a rt:calls ?x }`));
  assert.equal(refusal.cause, "outside-supported-subset");
  assert.deepEqual(refusal.missing, ["bare WHERE without FROM or GRAPH"]);
  assert.match(refusal.prose, /no scope/);

  // The refusal names the remedy, and the remedy works.
  assert.deepEqual(
    xs(ask(system, project(system), `${PREFIXES}SELECT ?x WHERE { GRAPH ?g { ent:a rt:calls ?x } }`)),
    [ent("b")]);
});

test("scope mapping: a relation type stranded in a default-graph pattern refuses", () => {
  // The companion fault a correct scope does not prevent: one triple left OUTSIDE the GRAPH block.
  // The default graph holds no relation edge, so that triple matches nothing and empties the join —
  // a confident empty from a query that looks scoped.
  const system = twoModels();
  const refusal = refusalOf(translate(system,
    `${PREFIXES}SELECT ?x WHERE { GRAPH <${G_ONE}> { ?s rt:calls ?x } ?x rt:calls ?y }`));
  assert.deepEqual(refusal.missing, ["relation type 'calls' in a default-graph pattern"]);

  // A dataset clause changes the reading: FROM promotes the model's graph INTO the default graph,
  // so the same triple position is sound there.
  const translation = translate(system, `${PREFIXES}SELECT ?x FROM <${G_ONE}> WHERE { ?s rt:calls ?x }`);
  assert.equal(translation.kind, "query");
});

test("scope mapping: a GRAPH clause under a dataset clause refuses rather than answering empty", () => {
  // With no FROM NAMED the dataset clause describes the whole dataset (SPARQL 1.1 §13.2), so no
  // named graphs remain and the GRAPH clause cannot match. The query is guaranteed empty.
  const refusal = refusalOf(translate(twoModels(),
    `${PREFIXES}SELECT ?x FROM <${G_ONE}> WHERE { GRAPH <${G_ONE}> { ?s rt:calls ?x } }`));
  assert.deepEqual(refusal.missing, ["GRAPH clause under a dataset clause"]);
});

test("scope mapping: a graph IRI no declared model owns refuses as unknown vocabulary", () => {
  // The same cause `admit`'s own checkScope reports for an undeclared model: one mistake, one word.
  const refusal = refusalOf(translate(twoModels(),
    `${PREFIXES}SELECT ?x WHERE { GRAPH <${modelGraphIri(SYS, "nope").value}> { ?s rt:calls ?x } }`));
  assert.equal(refusal.cause, "unknown-vocabulary");
  assert.deepEqual(refusal.missing, ["model 'nope'"]);
});

// --------------------------------------------------------------------------------------------
// Licensing — the gate runs before evaluation, and the IR is the authority
// --------------------------------------------------------------------------------------------

test("a query whose relation type forbids composition is REFUSED, naming path composition", () => {
  // V7 / V32. `owns` declares `composition.path: forbidden`, and nothing in RDF knows that — a raw
  // endpoint over this projection evaluates `rt:owns+` cheerfully. The gate reads the IR instead.
  const system = licensingSystem();
  const dataset = project(system);
  const refusal = refusalOf(
    ask(system, dataset, `${PREFIXES}ASK { GRAPH <${G_ONE}> { ent:a rt:owns+ ent:b } }`));
  assert.equal(refusal.cause, "unlicensed-by-model");
  assert.deepEqual(refusal.missing, ["path-composition semantics for relation type 'owns'"]);
  assert.match(refusal.prose, /not licensed by this model/);

  // A single hop of the same type is DIRECT, and direct is always licensed.
  assert.equal(askValue(ask(system, dataset, `${PREFIXES}ASK { GRAPH <${G_ONE}> { ent:a rt:owns ent:b } }`)),
    true, "the model declines composition, not the relation itself");
});

test("composition is recognized by SHAPE, not only by a path operator", () => {
  // `licensing.ts` defines `composing` as every shape whose answer is derived by putting edges end
  // to end — `rel+`, `rel*`, AND a join that chains two edges of one type. A gate that only looked
  // for `+` would let the BGP form smuggle a reachability claim past a `forbidden` declaration.
  const system = licensingSystem();
  const dataset = project(system);
  const composing: readonly (readonly [string, string])[] = [
    ["closure +", `ASK { GRAPH <${G_ONE}> { ent:a rt:owns+ ent:b } }`],
    ["closure *", `ASK { GRAPH <${G_ONE}> { ent:a rt:owns* ent:b } }`],
    ["sequence of one type", `ASK { GRAPH <${G_ONE}> { ent:a rt:owns/rt:owns ent:b } }`],
    ["BGP chain", `SELECT ?c WHERE { GRAPH <${G_ONE}> { ?a rt:owns ?b . ?b rt:owns ?c } }`],
    // A negated set under a closure composes edges of types it never names, which is why it raises
    // every declared type to `composing` instead of being waved through as unnamed.
    ["negated set under a closure", `SELECT ?x WHERE { GRAPH <${G_ONE}> { ent:a (!(rt:calls))+ ?x } }`],
  ];
  for (const [label, body] of composing) {
    const refusal = refusalOf(ask(system, dataset, PREFIXES + body));
    assert.equal(refusal.cause, "unlicensed-by-model", `${label} must be refused as composing`);
  }

  // The contrast that keeps the rule from being "refuse everything": `calls` allows composition, so
  // the same shapes are licensed there, and an inverse is direction rather than composition.
  assert.equal(askValue(ask(system, dataset, PREFIXES + `ASK { GRAPH <${G_ONE}> { ent:a rt:calls+ ent:c } }`)),
    true);
  assert.equal(askValue(ask(system, dataset, PREFIXES + `ASK { GRAPH <${G_ONE}> { ent:b ^rt:owns ent:a } }`)),
    true, "`^rel` walks one edge backwards: direction, not composition");
});

test("every relation type a query traverses is admitted, not just the first", () => {
  // A SPARQL query may traverse several relation types; `SeamQuestion` names one. The translator
  // runs the gate per type and ALL must pass, so a licensed type cannot carry an unlicensed one
  // into evaluation alongside it.
  const system = licensingSystem();
  const dataset = project(system);
  const mixed = PREFIXES +
    `SELECT ?c WHERE { GRAPH <${G_ONE}> { ent:a rt:calls ?b . ?b rt:owns ?c } }`;
  const translation = translate(system, mixed);
  assert.equal(translation.kind, "query", "both types are direct here, so both are licensed");
  if (translation.kind === "query") {
    assert.deepEqual(translation.questions.map((q) => q.relation), ["calls", "owns"]);
    // And the reported subjects are the gate's own INPUTS, not a list of ids beside them: a caller
    // re-asking this question elsewhere has to gate both types, and needs the traversal each was
    // admitted under to do it.
    assert.deepEqual(translation.questions.map((q) => q.traversal), ["direct", "direct"]);
    for (const q of translation.questions) {
      assert.deepEqual(q.scope, translation.scope, "one scope derivation, shared by every subject");
      assert.deepEqual(q.subset, { kind: "within-subset" });
      assert.equal(q.evidence, "bindings", "no text query can ask for a path witness");
    }
  }

  // Make one of them composing and the whole query is refused, named for the type that declined.
  const refusal = refusalOf(ask(system, dataset, PREFIXES +
    `SELECT ?c WHERE { GRAPH <${G_ONE}> { ent:a rt:calls+ ?b . ?b rt:owns/rt:owns ?c } }`));
  assert.deepEqual(refusal.missing, ["path-composition semantics for relation type 'owns'"]);
});

test("a variable predicate is admitted for every declared relation type, at direct", () => {
  // SPARQL forbids a path operator over a variable predicate, so its traversal is necessarily one
  // edge — which every relation type licenses, including a `forbidden` one. The gate is still
  // consulted for each: a query that names no relation type does not thereby escape V7.
  const system = licensingSystem();
  const translation = translate(system,
    `${PREFIXES}SELECT ?p WHERE { GRAPH <${G_ONE}> { ent:a ?p ?x } }`);
  assert.equal(translation.kind, "query");
  if (translation.kind !== "query") return;
  assert.deepEqual(translation.questions.map((q) => q.relation), ["calls", "owns", "peers"]);
  assert.deepEqual(translation.questions.map((q) => q.traversal), ["direct", "direct", "direct"]);
});

test("an undeclared relation type refuses as unknown vocabulary, before any modeling critique", () => {
  // `admit` orders vocabulary first, for the reason runGraphQuery does: a user who misspelled a
  // relation type should not first be told about path composition.
  const refusal = refusalOf(translate(licensingSystem(),
    `${PREFIXES}SELECT ?x WHERE { GRAPH <${G_ONE}> { ent:a rt:ownz+ ?x } }`));
  assert.equal(refusal.cause, "unknown-vocabulary");
  assert.deepEqual(refusal.missing, ["relation type 'ownz'"]);
});

test("every refusal names what would license the question", () => {
  // `refusal.ts` makes `wouldLicense` required and non-empty: a refusal that only declines is a
  // dead end, while one naming the modeling claim the author would have to make is a direction.
  const system = licensingSystem();
  const texts = [
    `${PREFIXES}ASK { GRAPH <${G_ONE}> { ent:a rt:owns+ ent:b } }`,
    `${PREFIXES}SELECT ?x WHERE { GRAPH <${G_ONE}> { { ?s rt:calls ?x } UNION { ?x rt:calls ?s } } }`,
    `${PREFIXES}SELECT ?x WHERE { ent:a rt:calls ?x }`,
    `${PREFIXES}SELECT ?x WHERE { GRAPH <${G_ONE}> { ent:a rt:ownz ?x } }`,
  ];
  for (const text of texts) {
    const translation = translate(system, text);
    assert.equal(translation.kind, "refused", text);
    if (translation.kind !== "refused") continue;
    assert.ok(translation.refusal.wouldLicense.length > 0, `wouldLicense is empty for: ${text}`);
    assert.ok(translation.refusal.missing.length > 0, `missing is empty for: ${text}`);
  }
});
