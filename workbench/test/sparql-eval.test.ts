// The query evaluator, against the conformance oracle.
//
// The ten-row table is ported from `MEASUREMENT-comunica-261002.md` §6 — the patterns a
// property-path evaluator gets wrong, with the correct answers, over the store that isolated
// Comunica's defect. Each row runs under BOTH scopings, and the scoping-equivalence test is the
// suite's center: `GRAPH <g>` versus `FROM <g>` changing the solutions is the measured defect that
// cost us the library. §7's lesson is baked in: every assertion pins the ROW SET, never the absence
// of an exception — the first pass of that table reported 13/13 ok on an engine answering `false`
// to a modelled fact.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  admit, evaluate, variable,
  type Evaluation, type LicensedQuestion, type PathNode, type PropertyPath, type QueryScope,
  type SelectQuery, type AskQuery, type GraphPattern, type Expression, type SeamQuestion,
} from "../src/sparql/index.ts";
import { iri, numeric, type Dataset, type Iri, type Quad, type Term } from "../src/rdf/terms.ts";
import { relationTypeIri } from "../src/rdf/iri.ts";
import { project } from "../src/rdf/project.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { build } from "./engine-fixtures.ts";

// --------------------------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------------------------

const UNION: QueryScope = { kind: "system-union" };

/** Two models over one relation type, so union and model scope are distinguishable. */
const twoModels = (): CanonicalSystem => build({
  "relation-types": { calls: { description: "d", composition: { path: "allowed" } } },
  entities: { a: null, b: null, c: null },
  models: {
    one: { relations: [{ from: "a", to: "b", type: "calls" }] },
    two: { relations: [{ from: "b", to: "c", type: "calls" }] },
  },
});

/**
 * A licensed question, through the real gate — the only way to obtain one. The evaluator's
 * signature demands it, so every test here passes licensing before evaluation, as production will.
 */
function licensed(system: CanonicalSystem, scope: QueryScope = UNION): LicensedQuestion {
  const question: SeamQuestion = {
    kind: "relational", relation: "calls", traversal: "direct", evidence: "bindings",
    scope, subset: { kind: "within-subset" },
  };
  const admission = admit(system, question);
  if (admission.kind !== "licensed") throw new Error("fixture drift: 'calls' must admit");
  return admission.question;
}

const SYSTEM = twoModels();
const GATE = licensed(SYSTEM);

const quad = (subject: Iri, predicate: Iri, object: Term, graph: Iri | null): Quad =>
  ({ subject, predicate, object, graph });

// The measurement's isolating store: three quads in one named graph.
const G = iri("urn:g");
const [A, B, C, D] = [iri("urn:a"), iri("urn:b"), iri("urn:c"), iri("urn:d")];
const [P, Q, R] = [iri("urn:p"), iri("urn:q"), iri("urn:r")];
const ORACLE_STORE: Dataset = [
  quad(A, P, B, G),
  quad(A, Q, C, G),
  quad(D, R, A, G),
];

// The measurement's chain store: e0 -p-> e1 -p-> e2 -p-> e3.
const E = [iri("urn:e0"), iri("urn:e1"), iri("urn:e2"), iri("urn:e3")] as const;
const CHAIN_STORE: Dataset = [
  quad(E[0], P, E[1], G),
  quad(E[1], P, E[2], G),
  quad(E[2], P, E[3], G),
];

// Path constructors, in the measurement's spelling.
const inv = (path: PathNode): PropertyPath => ({ kind: "path-inverse", path });
const seq = (...paths: PathNode[]): PropertyPath => ({ kind: "path-sequence", paths });
const alt = (...paths: PathNode[]): PropertyPath => ({ kind: "path-alternative", paths });
const star = (path: PathNode): PropertyPath => ({ kind: "path-zero-or-more", path });
const plus = (path: PathNode): PropertyPath => ({ kind: "path-one-or-more", path });
const neg = (...forbidden: Iri[]): PropertyPath => ({ kind: "path-negated", forbidden });

const X = variable("x");

/** `SELECT ?x WHERE { GRAPH <g> { <s> path ?x } }` */
const graphSelect = (path: PathNode, subject: Iri = A): SelectQuery => ({
  kind: "select", select: [X], from: null,
  where: [{
    kind: "graph", name: G,
    patterns: [{ kind: "bgp", triples: [{ subject, predicate: path, object: X }] }],
  }],
  groupBy: null, orderBy: null, limit: null,
});

/** `SELECT ?x FROM <g> WHERE { <s> path ?x }` — same question, the other scoping. */
const fromSelect = (path: PathNode, subject: Iri = A): SelectQuery => ({
  kind: "select", select: [X], from: [G],
  where: [{ kind: "bgp", triples: [{ subject, predicate: path, object: X }] }],
  groupBy: null, orderBy: null, limit: null,
});

/** The `?x` column of a select result, in result order. Fails loudly on any other arm. */
function xs(evaluation: Evaluation): string[] {
  assert.equal(evaluation.kind, "select-result");
  if (evaluation.kind !== "select-result") return [];
  return evaluation.rows.map((row) => {
    const t = row.get("x");
    assert.ok(t !== undefined, "every oracle row binds ?x");
    return (t as Term).value;
  });
}

// --------------------------------------------------------------------------------------------
// The conformance oracle — MEASUREMENT-comunica-261002.md §6, the `correct` column
// --------------------------------------------------------------------------------------------

const ORACLE: readonly (readonly [string, PathNode, readonly string[]])[] = [
  ["p", P, ["urn:b"]],
  ["^r", inv(R), ["urn:d"]],
  ["!(q)", neg(Q), ["urn:b"]],
  ["(p|q)", alt(P, Q), ["urn:b", "urn:c"]],
  ["(p|^r)", alt(P, inv(R)), ["urn:b", "urn:d"]],
  // Written order must be irrelevant — Comunica kept the inverse branch whichever side it was on.
  ["(^r|p)", alt(inv(R), P), ["urn:b", "urn:d"]],
  // Bag semantics: two inverse branches, the same solution twice.
  ["(^r|^r)", alt(inv(R), inv(R)), ["urn:d", "urn:d"]],
  ["(p|q|^r)", alt(P, Q, inv(R)), ["urn:b", "urn:c", "urn:d"]],
  // Precedence row: `/` binds tighter than `|`, and a forward SEQUENCE branch must survive too.
  ["(p/p|q)", alt(seq(P, P), Q), ["urn:c"]],
  // Closure binds the SUBJECT: the zero-length path makes `?x = a` a solution.
  ["(p|q)*", star(alt(P, Q)), ["urn:a", "urn:b", "urn:c"]],
];

test("oracle: every row produces the correct column inside a GRAPH block", () => {
  for (const [label, path, expected] of ORACLE) {
    assert.deepEqual(xs(evaluate(ORACLE_STORE, graphSelect(path), GATE)), expected,
      `GRAPH scoping, pattern ${label}`);
  }
});

test("oracle: every row produces the correct column under FROM", () => {
  for (const [label, path, expected] of ORACLE) {
    assert.deepEqual(xs(evaluate(ORACLE_STORE, fromSelect(path), GATE)), expected,
      `FROM scoping, pattern ${label}`);
  }
});

test("scoping equivalence: GRAPH and FROM yield identical solutions on every oracle row", () => {
  // The suite's most valuable assertion. Its violation is the measured defect that ruled Comunica
  // out: scoping must decide which quads are visible, never which solutions exist over them.
  for (const [label, path] of ORACLE) {
    const underGraph = evaluate(ORACLE_STORE, graphSelect(path), GATE);
    const underFrom = evaluate(ORACLE_STORE, fromSelect(path), GATE);
    assert.deepEqual(xs(underGraph), xs(underFrom), `scoping changed the solutions for ${label}`);
  }
});

test("the one-quad reproducer: ASK (p|^p) answers true under both scopings", () => {
  // MEASUREMENT §8, the minimal form of the bug: Comunica answered false inside GRAPH with the
  // fact sitting in the graph. Direction matters — the forward branch is the one that was dropped.
  const oneQuad: Dataset = [quad(A, P, B, G)];
  const pattern = alt(P, inv(P));
  const underGraph: AskQuery = {
    kind: "ask", from: null,
    where: [{
      kind: "graph", name: G,
      patterns: [{ kind: "bgp", triples: [{ subject: A, predicate: pattern, object: B }] }],
    }],
  };
  const underFrom: AskQuery = {
    kind: "ask", from: [G],
    where: [{ kind: "bgp", triples: [{ subject: A, predicate: pattern, object: B }] }],
  };
  const g = evaluate(oneQuad, underGraph, GATE);
  const f = evaluate(oneQuad, underFrom, GATE);
  assert.equal(g.kind, "ask-result");
  assert.equal(f.kind, "ask-result");
  if (g.kind !== "ask-result" || f.kind !== "ask-result") return;
  assert.equal(g.value, true, "the GRAPH-scoped ASK is the cell Comunica got wrong");
  assert.equal(f.value, true);
});

test("the chain store: +, * and / agree across scopings and bind what the measurement reports", () => {
  const cases: readonly (readonly [string, PathNode, readonly string[]])[] = [
    ["p+", plus(P), ["urn:e1", "urn:e2", "urn:e3"]],
    ["p*", star(P), ["urn:e0", "urn:e1", "urn:e2", "urn:e3"]],
    ["p/p", seq(P, P), ["urn:e2"]],
  ];
  for (const [label, path, expected] of cases) {
    const underGraph = xs(evaluate(CHAIN_STORE, graphSelect(path, E[0]), GATE));
    const underFrom = xs(evaluate(CHAIN_STORE, fromSelect(path, E[0]), GATE));
    assert.deepEqual(underGraph, expected, `GRAPH, ${label}`);
    assert.deepEqual(underFrom, expected, `FROM, ${label}`);
  }
});

test("zero-length path: * relates a bound subject to itself, even one no quad mentions", () => {
  // ALP's base case stands apart from the table: the start node is a solution before any edge is
  // walked. `urn:z` appears nowhere in the store, and `<urn:z> p* ?x` still binds ?x = urn:z.
  const Z = iri("urn:z");
  assert.deepEqual(xs(evaluate(CHAIN_STORE, graphSelect(star(P), Z), GATE)), ["urn:z"]);
  // And reflexively on a node that IS in the data.
  const ask: AskQuery = {
    kind: "ask", from: null,
    where: [{
      kind: "graph", name: G,
      patterns: [{ kind: "bgp", triples: [{ subject: E[2], predicate: star(P), object: E[2] }] }],
    }],
  };
  const result = evaluate(CHAIN_STORE, ask, GATE);
  assert.equal(result.kind, "ask-result");
  if (result.kind === "ask-result") assert.equal(result.value, true);
});

// --------------------------------------------------------------------------------------------
// Refuse, don't guess
// --------------------------------------------------------------------------------------------

test("an unsupported algebra node refuses, naming the construct — never an empty result", () => {
  const minus: GraphPattern = { kind: "unsupported", construct: "MINUS" };
  const query: SelectQuery = {
    kind: "select", select: [X], from: null, where: [minus],
    groupBy: null, orderBy: null, limit: null,
  };
  const result = evaluate(ORACLE_STORE, query, GATE);
  assert.equal(result.kind, "refused");
  if (result.kind !== "refused") return;
  assert.equal(result.refusal.cause, "outside-supported-subset");
  assert.deepEqual(result.refusal.missing, ["MINUS"]);
  assert.match(result.refusal.prose, /MINUS/);
});

test("unsupported PATH and EXPRESSION nodes refuse the same way", () => {
  const zeroOrOne: PropertyPath = { kind: "path-unsupported", construct: "ZeroOrOnePath (?)" };
  const pathResult = evaluate(ORACLE_STORE, graphSelect(zeroOrOne), GATE);
  assert.equal(pathResult.kind, "refused");
  if (pathResult.kind === "refused") {
    assert.deepEqual(pathResult.refusal.missing, ["ZeroOrOnePath (?)"]);
  }

  const regex: Expression = { kind: "expression-unsupported", construct: "REGEX" };
  const filtered: SelectQuery = {
    kind: "select", select: [X], from: null,
    where: [
      { kind: "bgp", triples: [{ subject: A, predicate: P, object: X }] },
      { kind: "filter", expression: regex },
    ],
    groupBy: null, orderBy: null, limit: null,
  };
  const exprResult = evaluate(ORACLE_STORE, filtered, GATE);
  assert.equal(exprResult.kind, "refused");
  if (exprResult.kind === "refused") assert.deepEqual(exprResult.refusal.missing, ["REGEX"]);
});

test("a node the evaluator does not even recognize refuses rather than being skipped", () => {
  // The Comunica failure mode in miniature: an evaluator that silently ignores a node it does not
  // understand produces a wrong answer instead of an error. This node bypasses the types the way a
  // future untyped parse could.
  const alien = { kind: "service", endpoint: "urn:elsewhere" } as unknown as GraphPattern;
  const query: SelectQuery = {
    kind: "select", select: [X], from: null, where: [alien],
    groupBy: null, orderBy: null, limit: null,
  };
  const result = evaluate(ORACLE_STORE, query, GATE);
  assert.equal(result.kind, "refused");
  if (result.kind !== "refused") return;
  assert.equal(result.refusal.cause, "outside-supported-subset");
  assert.match(result.refusal.prose, /service/);
});

test("an empty result is NOT a refusal: the two are different arms a caller can tell apart", () => {
  // A system with no relations answers honestly with zero rows — no error, no refusal. Collapsing
  // the two would teach a caller that "nothing matched" means "the question was rejected".
  const bare = build({
    "relation-types": { calls: { description: "d", composition: { path: "allowed" } } },
    entities: { a: null },
    models: { one: { relations: [] } },
  });
  const query: SelectQuery = {
    kind: "select", select: [variable("s"), variable("o")], from: null,
    where: [{
      kind: "graph", name: variable("g"),
      patterns: [{
        kind: "bgp",
        triples: [{ subject: variable("s"), predicate: variable("p"), object: variable("o") }],
      }],
    }],
    groupBy: null, orderBy: null, limit: null,
  };
  const result = evaluate(project(bare), query, licensed(bare));
  assert.equal(result.kind, "select-result");
  assert.notEqual(result.kind as string, "refused");
  if (result.kind === "select-result") assert.deepEqual(result.rows, []);
});

// --------------------------------------------------------------------------------------------
// Scope — the union is not the default graph
// --------------------------------------------------------------------------------------------

test("system-union is NOT the default graph: relation edges match only under GRAPH", () => {
  // The trap licensing.ts warns about. The default graph holds no relation edge, so a
  // default-graph pattern over the relation type must return empty — and the SAME pattern inside
  // GRAPH ?g must not. An evaluator that pours the union into the default graph passes neither.
  const dataset = project(SYSTEM);
  const calls = relationTypeIri("t", "calls");
  const s = variable("s");
  const o = variable("o");
  const defaultGraphQuery: SelectQuery = {
    kind: "select", select: [s, o], from: null,
    where: [{ kind: "bgp", triples: [{ subject: s, predicate: calls, object: o }] }],
    groupBy: null, orderBy: null, limit: null,
  };
  const unionQuery: SelectQuery = {
    kind: "select", select: [s, o], from: null,
    where: [{
      kind: "graph", name: variable("g"),
      patterns: [{ kind: "bgp", triples: [{ subject: s, predicate: calls, object: o }] }],
    }],
    groupBy: null, orderBy: null, limit: null,
  };
  const overDefault = evaluate(dataset, defaultGraphQuery, GATE);
  const overUnion = evaluate(dataset, unionQuery, GATE);
  assert.equal(overDefault.kind, "select-result");
  assert.equal(overUnion.kind, "select-result");
  if (overDefault.kind !== "select-result" || overUnion.kind !== "select-result") return;
  assert.deepEqual(overDefault.rows, [], "the default graph holds no relation edge");
  assert.equal(overUnion.rows.length, 2, "GRAPH ?g reaches both models' edges");
});

test("a model scope narrows GRAPH ?g to that model's graph; the union sees both", () => {
  const dataset = project(SYSTEM);
  const calls = relationTypeIri("t", "calls");
  const o = variable("o");
  const query: SelectQuery = {
    kind: "select", select: [o], from: null,
    where: [{
      kind: "graph", name: variable("g"),
      patterns: [{ kind: "bgp", triples: [{ subject: variable("s"), predicate: calls, object: o }] }],
    }],
    groupBy: null, orderBy: null, limit: null,
  };
  const scoped = evaluate(dataset, query, licensed(SYSTEM, { kind: "model", model: "one" }));
  assert.equal(scoped.kind, "select-result");
  if (scoped.kind !== "select-result") return;
  assert.equal(scoped.rows.length, 1);
  const only = scoped.rows[0]?.get("o");
  assert.equal(only?.kind, "iri");
  assert.match(String(only?.value), /ent.*b/u, "model one's single edge lands on b");
});

// --------------------------------------------------------------------------------------------
// Determinism, and the rest of the subset
// --------------------------------------------------------------------------------------------

const serialize = (rows: readonly ReadonlyMap<string, Term>[]): unknown =>
  rows.map((row) => [...row.entries()].map(([name, t]) =>
    [name, t.kind, t.value, t.kind === "literal" ? t.datatype : ""]));

test("determinism: the same query over the same system twice gives identical solution order", () => {
  const query = graphSelect(alt(inv(R), P, Q));
  const first = evaluate(ORACLE_STORE, query, GATE);
  const second = evaluate(ORACLE_STORE, query, GATE);
  assert.equal(first.kind, "select-result");
  assert.equal(second.kind, "select-result");
  if (first.kind !== "select-result" || second.kind !== "select-result") return;
  assert.deepEqual(serialize(first.rows), serialize(second.rows));
  assert.ok(first.rows.length > 0, "a vacuous determinism check would pass on a broken evaluator");
});

test("FILTER with comparison keeps the rows the predicate selects, under SPARQL error semantics", () => {
  const size = iri("urn:size");
  const S1 = iri("urn:s1");
  const S2 = iri("urn:s2");
  const data: Dataset = [
    quad(S1, size, numeric(1), null),
    quad(S2, size, numeric(5), null),
    // A row whose ?n is an IRI: the comparison is a type error there, and the row drops — never throws.
    quad(iri("urn:s3"), size, iri("urn:not-a-number"), null),
  ];
  const s = variable("s");
  const n = variable("n");
  const query: SelectQuery = {
    kind: "select", select: [s], from: null,
    where: [
      { kind: "bgp", triples: [{ subject: s, predicate: size, object: n }] },
      {
        kind: "filter",
        expression: {
          kind: "comparison", op: ">",
          left: { kind: "term", term: n },
          right: { kind: "term", term: numeric(2) },
        },
      },
    ],
    groupBy: null, orderBy: null, limit: null,
  };
  const result = evaluate(data, query, GATE);
  assert.equal(result.kind, "select-result");
  if (result.kind !== "select-result") return;
  assert.deepEqual(result.rows.map((r) => r.get("s")?.value), ["urn:s2"]);
});

test("OPTIONAL extends where it matches and survives where it does not; !BOUND sees the difference", () => {
  const rel = iri("urn:rel");
  const flag = iri("urn:flag");
  const data: Dataset = [
    quad(A, rel, B, null),
    quad(A, rel, C, null),
    quad(B, flag, numeric(1), null),
  ];
  const o = variable("o");
  const f = variable("f");
  const query: SelectQuery = {
    kind: "select", select: [o], from: null,
    where: [
      { kind: "bgp", triples: [{ subject: A, predicate: rel, object: o }] },
      { kind: "optional", patterns: [{ kind: "bgp", triples: [{ subject: o, predicate: flag, object: f }] }] },
      { kind: "filter", expression: { kind: "not", expression: { kind: "bound", variable: f } } },
    ],
    groupBy: null, orderBy: null, limit: null,
  };
  const result = evaluate(data, query, GATE);
  assert.equal(result.kind, "select-result");
  if (result.kind !== "select-result") return;
  assert.deepEqual(result.rows.map((r) => r.get("o")?.value), ["urn:c"]);
});

test("COUNT with GROUP BY, and SUM/MIN/MAX over one group", () => {
  const e = iri("urn:edge");
  const data: Dataset = [
    quad(A, e, B, null),
    quad(A, e, C, null),
    quad(D, e, B, null),
  ];
  const s = variable("s");
  const o = variable("o");
  const n = variable("n");
  const grouped: SelectQuery = {
    kind: "select",
    select: [s, { kind: "aggregate", variable: n, aggregate: { op: "count", of: o } }],
    from: null,
    where: [{ kind: "bgp", triples: [{ subject: s, predicate: e, object: o }] }],
    groupBy: [s], orderBy: null, limit: null,
  };
  const counted = evaluate(data, grouped, GATE);
  assert.equal(counted.kind, "select-result");
  if (counted.kind !== "select-result") return;
  assert.deepEqual(
    counted.rows.map((r) => [r.get("s")?.value, r.get("n")?.value]),
    [["urn:a", "2"], ["urn:d", "1"]]);

  const val = iri("urn:val");
  const numbers: Dataset = [
    quad(iri("urn:v1"), val, numeric(1), null),
    quad(iri("urn:v2"), val, numeric(5), null),
  ];
  const folds: SelectQuery = {
    kind: "select",
    select: [
      { kind: "aggregate", variable: variable("total"), aggregate: { op: "sum", of: n } },
      { kind: "aggregate", variable: variable("lo"), aggregate: { op: "min", of: n } },
      { kind: "aggregate", variable: variable("hi"), aggregate: { op: "max", of: n } },
    ],
    from: null,
    where: [{ kind: "bgp", triples: [{ subject: s, predicate: val, object: n }] }],
    groupBy: null, orderBy: null, limit: null,
  };
  const folded = evaluate(numbers, folds, GATE);
  assert.equal(folded.kind, "select-result");
  if (folded.kind !== "select-result") return;
  const row = folded.rows[0];
  assert.deepEqual(
    [row?.get("total")?.value, row?.get("lo")?.value, row?.get("hi")?.value],
    ["6", "1", "5"]);
});

test("ORDER BY descending then LIMIT slices the sorted rows", () => {
  const size = iri("urn:size");
  const data: Dataset = [
    quad(iri("urn:s1"), size, numeric(1), null),
    quad(iri("urn:s2"), size, numeric(5), null),
    quad(iri("urn:s3"), size, numeric(3), null),
  ];
  const s = variable("s");
  const n = variable("n");
  const query: SelectQuery = {
    kind: "select", select: [s, n], from: null,
    where: [{ kind: "bgp", triples: [{ subject: s, predicate: size, object: n }] }],
    groupBy: null,
    orderBy: [{ variable: n, descending: true }],
    limit: 2,
  };
  const result = evaluate(data, query, GATE);
  assert.equal(result.kind, "select-result");
  if (result.kind !== "select-result") return;
  assert.deepEqual(result.rows.map((r) => r.get("s")?.value), ["urn:s2", "urn:s3"]);
});

test("an ASK carries evidence: null and coverage that says what the null means", () => {
  const ask: AskQuery = {
    kind: "ask", from: null,
    where: [{
      kind: "graph", name: G,
      patterns: [{ kind: "bgp", triples: [{ subject: E[0], predicate: plus(P), object: E[3] }] }],
    }],
  };
  const result = evaluate(CHAIN_STORE, ask, GATE);
  assert.equal(result.kind, "ask-result");
  if (result.kind !== "ask-result") return;
  assert.equal(result.value, true);
  // Never a fabricated path: the null is stated, and the coverage names where a witness lives.
  assert.equal(result.evidence, null);
  assert.match(result.coverage, /no path variables|binds no intermediate/);
  assert.match(result.coverage, /engine/);
});

test("the step budget bounds evaluation: exceeding it returns exhausted, not a stall or a lie", () => {
  const result = evaluate(CHAIN_STORE, graphSelect(star(alt(P, Q)), E[0]), GATE, 2);
  assert.equal(result.kind, "exhausted");
  if (result.kind !== "exhausted") return;
  assert.ok(result.steps > 2 - 1, "the counter reports the work done");
  assert.match(result.prose, /Worker/);
  // Exhaustion is its own arm — distinguishable from both an empty result and a refusal.
  assert.notEqual(result.kind as string, "refused");
  assert.notEqual(result.kind as string, "select-result");
});
