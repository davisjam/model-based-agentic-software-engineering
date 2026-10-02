/**
 * The query evaluator: the §11.1 subset over the projected dataset. We own it because Comunica
 * silently drops forward branches of `(p|^p)` inside `GRAPH` (`MEASUREMENT-comunica-261002.md` §6)
 * — the exact construct and scoping the design standardizes on.
 *
 * **The gate runs first, structurally.** `evaluate` takes a `LicensedQuestion`, the branded type
 * only `admit` produces, so no caller can reach evaluation without passing licensing. The question
 * also carries the scope, and the evaluator reads it as quad VISIBILITY:
 *
 *  - `model` — that model's named graph, plus the default graph.
 *  - `system-union` — every named graph, plus the default graph.
 *
 * **`system-union` is not the default graph.** The default graph holds no relation edge
 * (`project.ts`), so an evaluator that reads the union scope as "match the default graph" answers
 * every architectural question with a confident empty set. Here the union only widens which NAMED
 * graphs a `GRAPH` clause can see; a default-graph pattern still matches only default-graph quads.
 *
 * **Scoping must not change which solutions exist, only which quads are visible.** `GRAPH <g> {P}`
 * and `FROM <g> … {P}` answer identically over the same data; one code path matches quads against
 * an active graph, so the two scopings cannot diverge the way Comunica's did.
 *
 * **Refuse, don't guess.** An `unsupported` algebra node — and any node this evaluator does not
 * recognize at runtime — returns a structured refusal naming the construct, through `refusal.ts`.
 * An empty result and a refusal are different arms of the result union, so a caller cannot read
 * one as the other.
 *
 * **Bounded, synchronous.** Every loop that touches a quad or expands a path step counts against a
 * step budget; exceeding it returns `exhausted`, never an unbounded stall on the main thread. The
 * Q8 ruling and the measured sizing are in `DESIGN-sparql-261002.md` §6.
 */
import type { Dataset, Iri, Quad, Term } from "../rdf/terms.ts";
import { numeric, RDF_TYPE, XSD } from "../rdf/terms.ts";
import { MAGE, MAGE_CLASSES } from "../rdf/vocabulary.ts";
import type { LicensedQuestion, QueryScope } from "./licensing.ts";
import { outsideSubset, type SeamRefusal } from "./refusal.ts";
import type {
  AggregateBinding, Expression, GraphPattern, PathNode, PatternTerm, QueryAlgebra, SelectQuery,
  TriplePattern, Variable,
} from "./algebra.ts";

// --------------------------------------------------------------------------------------------
// Results
// --------------------------------------------------------------------------------------------

/** One solution row. Insertion order is part of the value; the evaluator keeps it deterministic. */
export type Bindings = ReadonlyMap<string, Term>;

export interface SelectResult {
  readonly kind: "select-result";
  readonly variables: readonly string[];
  /** The rows ARE the evidence (§1): a binding set is its own witness. */
  readonly rows: readonly Bindings[];
}

export interface AskResult {
  readonly kind: "ask-result";
  readonly value: boolean;
  /** Never fabricated. A property path proves existence without binding intermediates. */
  readonly evidence: null;
  /** Says what the null means, so a reader does not infer it from absence. */
  readonly coverage: string;
}

export interface RefusedResult {
  readonly kind: "refused";
  readonly refusal: SeamRefusal;
}

/** The budget ran out. Not empty, not refused: the question is licensed but too big for here. */
export interface ExhaustedResult {
  readonly kind: "exhausted";
  readonly steps: number;
  readonly prose: string;
}

export type Evaluation = SelectResult | AskResult | RefusedResult | ExhaustedResult;

/**
 * The step budget: quads matched plus path expansions plus join pairs. Sized from measurement
 * (DESIGN §6 Q8): a step costs 0.6–1.2 µs on an M3 Pro, so the default bounds a worst-case
 * evaluation near 0.3–0.6 s. The hardest measured query — every pair of a both-ends-free `p*`
 * over a 500-entity chain, 125,250 rows — used ≤262,144 steps in 154 ms; the design's own worst
 * case, `p+` across a 5,000-entity chain, used ≤16,384 steps in 9 ms.
 */
export const DEFAULT_STEP_BUDGET = 500_000;

const ASK_COVERAGE =
  "existence only, over the scoped dataset. SPARQL 1.1 has no path variables, so a property path " +
  "binds no intermediate nodes and this interface reports no witness; the analysis engine returns one.";

// --------------------------------------------------------------------------------------------
// Signals — refusal and exhaustion unwind through evaluation to one catch in `evaluate`
// --------------------------------------------------------------------------------------------

class RefusalSignal extends Error {
  readonly refusal: SeamRefusal;
  constructor(refusal: SeamRefusal) {
    super(refusal.prose);
    this.refusal = refusal;
  }
}

class BudgetSignal extends Error {}

/**
 * The runtime guard behind every exhaustive `switch`. The compiler proves these unreachable for
 * well-typed algebra; they stay because the text→algebra translator will feed this evaluator from a
 * parse, and a node that drifts past the types must become a NAMED refusal, not a skipped branch —
 * skipping an unrecognized node is precisely how Comunica answered wrongly instead of erroring.
 */
const refuseUnknown = (node: never): never => {
  const kind = String((node as { kind?: unknown }).kind ?? "unknown");
  throw new RefusalSignal(outsideSubset(kind, "the evaluator does not recognize this algebra node"));
};

const refuseConstruct = (construct: string): never => {
  throw new RefusalSignal(outsideSubset(construct));
};

/**
 * The structural walk: refuse every unsupported node BEFORE evaluation touches data. Refusal must
 * depend on the query alone — an unsupported `FILTER` over zero matching rows would otherwise never
 * be reached and the query would "work", which is the lazy cousin of the silently-dropped branch.
 * The evaluation-time `default` branches stay as the backstop for nodes this walk never saw.
 */
function assertSupported(where: readonly GraphPattern[]): void {
  for (const p of where) assertPatternSupported(p);
}

function assertPatternSupported(p: GraphPattern): void {
  switch (p.kind) {
    case "bgp":
      for (const t of p.triples) {
        if (t.predicate.kind !== "iri" && t.predicate.kind !== "variable") {
          assertPathSupported(t.predicate);
        }
      }
      return;
    case "graph":
    case "group":
    case "optional":
      assertSupported(p.patterns);
      return;
    case "filter":
      assertExpressionSupported(p.expression);
      return;
    case "unsupported":
      refuseConstruct(p.construct);
      return;
    default:
      refuseUnknown(p);
  }
}

function assertPathSupported(path: PathNode): void {
  if (path.kind === "iri") return;
  switch (path.kind) {
    case "path-inverse":
    case "path-zero-or-more":
    case "path-one-or-more":
      assertPathSupported(path.path);
      return;
    case "path-sequence":
    case "path-alternative":
      path.paths.forEach(assertPathSupported);
      return;
    case "path-negated":
      return;
    case "path-unsupported":
      refuseConstruct(path.construct);
      return;
    default:
      refuseUnknown(path);
  }
}

function assertExpressionSupported(e: Expression): void {
  switch (e.kind) {
    case "term":
    case "bound":
      return;
    case "not":
      assertExpressionSupported(e.expression);
      return;
    case "and":
    case "or":
    case "comparison":
      assertExpressionSupported(e.left);
      assertExpressionSupported(e.right);
      return;
    case "expression-unsupported":
      refuseConstruct(e.construct);
      return;
    default:
      refuseUnknown(e);
  }
}

interface Ctx {
  steps: number;
  readonly budget: number;
  /** One lazily built index per quad array. Keyed by reference; the view's arrays are stable. */
  readonly indexes: Map<readonly Quad[], GraphIndex>;
}

function bump(ctx: Ctx): void {
  if (++ctx.steps > ctx.budget) throw new BudgetSignal();
}

// --------------------------------------------------------------------------------------------
// Terms
// --------------------------------------------------------------------------------------------

/** JSON, not a separator join, for the reason `quadKey` records. */
const termKey = (t: Term): string =>
  JSON.stringify([t.kind, t.value, t.kind === "literal" ? t.datatype : ""]);

const termEquals = (a: Term, b: Term): boolean =>
  a.kind === b.kind && a.value === b.value &&
  (a.kind !== "literal" || b.kind !== "literal" || a.datatype === b.datatype);

const isVariable = (t: PatternTerm | Variable | Iri): t is Variable => t.kind === "variable";

const numericValue = (t: Term): number | null =>
  t.kind === "literal" && (t.datatype === XSD.integer || t.datatype === XSD.double)
    ? Number(t.value)
    : null;

/**
 * A total, deterministic order on terms: IRIs before literals, each by value, numerics by number.
 * Used for `ORDER BY`, for `MIN`/`MAX`, and for the canonical row order — written order of a path
 * alternation must leave no trace in the result, so the result cannot carry evaluation order.
 */
function compareTerms(a: Term, b: Term): number {
  if (a.kind !== b.kind) return a.kind === "iri" ? -1 : 1;
  const an = numericValue(a);
  const bn = numericValue(b);
  if (an !== null && bn !== null && an !== bn) return an < bn ? -1 : 1;
  if (a.value !== b.value) return a.value < b.value ? -1 : 1;
  const ad = a.kind === "literal" ? a.datatype : "";
  const bd = b.kind === "literal" ? b.datatype : "";
  return ad < bd ? -1 : ad > bd ? 1 : 0;
}

// --------------------------------------------------------------------------------------------
// The dataset view — scope, then dataset clause, then one matching path
// --------------------------------------------------------------------------------------------

interface View {
  readonly defaultGraph: readonly Quad[];
  /** Graph IRI value → its quads. The graphs a `GRAPH` clause can reach. */
  readonly named: ReadonlyMap<string, readonly Quad[]>;
}

/**
 * The named graph a model id maps to, read from the projection's own `mage:graph` fact. The gate
 * already verified the model exists in the IR, so a miss here is projection drift; the caller
 * treats it as "no named graphs visible", which is an honest empty rather than a widened scope.
 */
function modelGraphValue(dataset: Dataset, modelId: string): string | null {
  const models = new Set<string>();
  for (const q of dataset) {
    if (q.graph === null && q.predicate.value === RDF_TYPE.value &&
      q.object.kind === "iri" && q.object.value === MAGE_CLASSES.Model.value) {
      models.add(q.subject.value);
    }
  }
  const model = dataset.find((q) =>
    q.graph === null && models.has(q.subject.value) && q.predicate.value === MAGE.id.value &&
    q.object.kind === "literal" && q.object.value === modelId);
  if (model === undefined) return null;
  const graph = dataset.find((q) =>
    q.graph === null && q.subject.value === model.subject.value &&
    q.predicate.value === MAGE.graph.value && q.object.kind === "iri");
  return graph === undefined || graph.object.kind !== "iri" ? null : graph.object.value;
}

/**
 * Scope decides which NAMED graphs exist for this evaluation. The default graph is always the
 * default graph — narrowing to a model never promotes that model's edges into it, and widening to
 * the union never does either. V34's trap lives exactly here.
 */
function scopeView(dataset: Dataset, scope: QueryScope): View {
  const keep = scope.kind === "model" ? modelGraphValue(dataset, scope.model) : null;
  const defaultGraph: Quad[] = [];
  const named = new Map<string, Quad[]>();
  for (const q of dataset) {
    if (q.graph === null) {
      defaultGraph.push(q);
      continue;
    }
    if (scope.kind === "model" && q.graph.value !== keep) continue;
    const bucket = named.get(q.graph.value);
    if (bucket === undefined) named.set(q.graph.value, [q]);
    else bucket.push(q);
  }
  return { defaultGraph, named };
}

/**
 * `FROM <g> …` replaces the dataset: the default graph becomes the merge of the named graphs
 * listed, and — with no `FROM NAMED` in the subset — no named graphs remain (SPARQL 1.1 §13.2).
 * A `FROM` graph the scope hides stays hidden: the dataset clause selects among visible graphs,
 * it does not pierce the licensed scope.
 */
function applyFrom(view: View, from: readonly Iri[] | null): View {
  if (from === null) return view;
  const defaultGraph = from.flatMap((g) => view.named.get(g.value) ?? []);
  return { defaultGraph, named: new Map() };
}

type ActiveGraph = { readonly kind: "default" } | { readonly kind: "named"; readonly graph: string };

const activeQuads = (view: View, active: ActiveGraph): readonly Quad[] =>
  active.kind === "default" ? view.defaultGraph : view.named.get(active.graph) ?? [];

// --------------------------------------------------------------------------------------------
// The graph index — O(1) steps for path traversal instead of a scan per hop
// --------------------------------------------------------------------------------------------

class GraphIndex {
  readonly objectsBySubject = new Map<string, Term[]>();
  readonly subjectsByObject = new Map<string, Term[]>();
  readonly outEdges = new Map<string, Quad[]>();
  readonly inEdges = new Map<string, Quad[]>();
  readonly quadsByPredicate = new Map<string, Quad[]>();
  /** Every term in subject or object position, deduplicated — the node set a free closure ranges over. */
  readonly nodes: Term[] = [];

  constructor(quads: readonly Quad[]) {
    const seen = new Set<string>();
    const push = <T>(map: Map<string, T[]>, key: string, value: T): void => {
      const bucket = map.get(key);
      if (bucket === undefined) map.set(key, [value]);
      else bucket.push(value);
    };
    const node = (t: Term): void => {
      const key = termKey(t);
      if (!seen.has(key)) {
        seen.add(key);
        this.nodes.push(t);
      }
    };
    for (const q of quads) {
      push(this.objectsBySubject, q.predicate.value + " " + termKey(q.subject), q.object);
      push(this.subjectsByObject, q.predicate.value + " " + termKey(q.object), q.subject);
      push(this.outEdges, termKey(q.subject), q);
      push(this.inEdges, termKey(q.object), q);
      push(this.quadsByPredicate, q.predicate.value, q);
      node(q.subject);
      node(q.object);
    }
  }
}

function indexOf(ctx: Ctx, quads: readonly Quad[]): GraphIndex {
  const cached = ctx.indexes.get(quads);
  if (cached !== undefined) return cached;
  const built = new GraphIndex(quads);
  ctx.indexes.set(quads, built);
  return built;
}

// --------------------------------------------------------------------------------------------
// Property paths
// --------------------------------------------------------------------------------------------

type Pair = readonly [Term, Term];

const isForbidden = (forbidden: readonly Iri[], predicate: Iri): boolean =>
  forbidden.some((f) => f.value === predicate.value);

/**
 * All (subject, object) pairs the path relates, honoring whichever ends are bound.
 *
 * Bag semantics for `|` and `/`, per SPARQL 1.1 §18.2.2.4 — `(^r|^r)` yields its solution twice,
 * and the oracle pins that. Set semantics for `*` and `+` (ALP, §18.5), which is what keeps a
 * cyclic graph from looping.
 */
function pathPairs(
  ctx: Ctx, index: GraphIndex, path: PathNode, s: Term | null, o: Term | null,
): Pair[] {
  if (path.kind === "iri") {
    return leafPairs(ctx, index, (q) => q.predicate.value === path.value, s, o);
  }
  switch (path.kind) {
    case "path-negated":
      return leafPairs(ctx, index, (q) => !isForbidden(path.forbidden, q.predicate), s, o);
    case "path-inverse":
      return pathPairs(ctx, index, path.path, o, s).map(([a, b]) => [b, a] as const);
    case "path-sequence": {
      if (path.paths.length === 0) return refuseConstruct("empty path sequence");
      let pairs = pathPairs(ctx, index, path.paths[0] as PathNode, s, null);
      for (const part of path.paths.slice(1)) {
        const next: Pair[] = [];
        for (const [start, mid] of pairs) {
          for (const [, end] of pathPairs(ctx, index, part, mid, null)) {
            bump(ctx);
            next.push([start, end]);
          }
        }
        pairs = next;
      }
      return o === null ? pairs : pairs.filter(([, end]) => termEquals(end, o));
    }
    case "path-alternative":
      // Concatenation of branch solutions. No branch is privileged by direction or by written
      // order — the defect that cost us Comunica — and the caller's canonical sort erases order.
      return path.paths.flatMap((branch) => pathPairs(ctx, index, branch, s, o));
    case "path-zero-or-more":
      return closurePairs(ctx, index, path.path, s, o, true);
    case "path-one-or-more":
      return closurePairs(ctx, index, path.path, s, o, false);
    case "path-unsupported":
      return refuseConstruct(path.construct);
    default:
      return refuseUnknown(path);
  }
}

/** Pairs for a single-edge step: a predicate IRI or a negated set, any combination of bound ends. */
function leafPairs(
  ctx: Ctx, index: GraphIndex, matches: (q: Quad) => boolean, s: Term | null, o: Term | null,
): Pair[] {
  const pairs: Pair[] = [];
  const scan = s !== null
    ? index.outEdges.get(termKey(s)) ?? []
    : o !== null
      ? index.inEdges.get(termKey(o)) ?? []
      : [...index.quadsByPredicate.values()].flat();
  for (const q of scan) {
    bump(ctx);
    if (!matches(q)) continue;
    if (s !== null && !termEquals(q.subject, s)) continue;
    if (o !== null && !termEquals(q.object, o)) continue;
    pairs.push([q.subject, q.object]);
  }
  return pairs;
}

/**
 * `*` and `+`: ALP (SPARQL 1.1 §18.5). A bound subject walks forward; a bound object walks the
 * inverse path; both free ranges over the graph's node set. Zero length means the start node
 * itself — whether or not any quad mentions it — which is why `(p|q)*` binds its subject and why
 * the oracle's last row exists.
 */
function closurePairs(
  ctx: Ctx, index: GraphIndex, inner: PathNode, s: Term | null, o: Term | null, zero: boolean,
): Pair[] {
  if (s !== null) {
    const reached = alp(ctx, index, inner, s, zero, false);
    const pairs = reached.map((t) => [s, t] as const);
    return o === null ? pairs : pairs.filter(([, end]) => termEquals(end, o));
  }
  if (o !== null) {
    return alp(ctx, index, inner, o, zero, true).map((t) => [t, o] as const);
  }
  return index.nodes.flatMap((n) =>
    alp(ctx, index, inner, n, zero, false).map((t) => [n, t] as const));
}

/** Breadth-first reachability via the inner path, one visit per node. `inverse` walks backwards. */
function alp(
  ctx: Ctx, index: GraphIndex, inner: PathNode, start: Term, includeStart: boolean, inverse: boolean,
): Term[] {
  const expanded = new Set<string>([termKey(start)]);
  const reached: Term[] = includeStart ? [start] : [];
  const reachedKeys = new Set<string>(includeStart ? [termKey(start)] : []);
  const frontier: Term[] = [start];
  while (frontier.length > 0) {
    const node = frontier.pop() as Term;
    const steps = inverse
      ? pathPairs(ctx, index, inner, null, node).map(([from]) => from)
      : pathPairs(ctx, index, inner, node, null).map(([, to]) => to);
    for (const next of steps) {
      bump(ctx);
      const key = termKey(next);
      if (!reachedKeys.has(key)) {
        reachedKeys.add(key);
        reached.push(next);
      }
      if (!expanded.has(key)) {
        expanded.add(key);
        frontier.push(next);
      }
    }
  }
  return reached;
}

// --------------------------------------------------------------------------------------------
// Patterns
// --------------------------------------------------------------------------------------------

const EMPTY_BINDINGS: Bindings = new Map();

const resolve = (t: PatternTerm, row: Bindings): Term | null =>
  isVariable(t) ? row.get(t.name) ?? null : t;

function bind(row: Bindings, name: string, value: Term): Bindings {
  const next = new Map(row);
  next.set(name, value);
  return next;
}

/**
 * A group graph pattern. Filters apply after the group's other patterns whatever their written
 * position — SPARQL scopes a `FILTER` to its group, and applying one mid-sequence would drop rows
 * whose variables a later pattern binds.
 */
function evalGroup(
  ctx: Ctx, view: View, active: ActiveGraph, patterns: readonly GraphPattern[], input: readonly Bindings[],
): readonly Bindings[] {
  let rows = input;
  for (const p of patterns) {
    if (p.kind !== "filter") rows = evalPattern(ctx, view, active, p, rows);
  }
  for (const p of patterns) {
    if (p.kind === "filter") {
      rows = rows.filter((row) => evalExpressionAsBool(ctx, p.expression, row) === true);
    }
  }
  return rows;
}

function evalPattern(
  ctx: Ctx, view: View, active: ActiveGraph, pattern: GraphPattern, input: readonly Bindings[],
): readonly Bindings[] {
  switch (pattern.kind) {
    case "bgp": {
      let rows = input;
      for (const triple of pattern.triples) {
        rows = rows.flatMap((row) => matchTriple(ctx, view, active, triple, row));
      }
      return rows;
    }
    case "group":
      return evalGroup(ctx, view, active, pattern.patterns, input);
    case "graph": {
      if (!isVariable(pattern.name)) {
        const name = pattern.name.value;
        return evalGroup(ctx, view, { kind: "named", graph: name }, pattern.patterns, input);
      }
      // GRAPH ?g — one evaluation per visible named graph, binding ?g. Already-bound rows restrict.
      const variable = pattern.name.name;
      return input.flatMap((row) => {
        const bound = row.get(variable);
        const out: Bindings[] = [];
        for (const graph of view.named.keys()) {
          if (bound !== undefined && !(bound.kind === "iri" && bound.value === graph)) continue;
          const seeded = bound !== undefined ? row : bind(row, variable, { kind: "iri", value: graph });
          out.push(...evalGroup(ctx, view, { kind: "named", graph }, pattern.patterns, [seeded]));
        }
        return out;
      });
    }
    case "optional":
      // Left join: a row that matches extends; a row that does not survives unextended.
      return input.flatMap((row) => {
        const extended = evalGroup(ctx, view, active, pattern.patterns, [row]);
        return extended.length > 0 ? extended : [row];
      });
    case "filter":
      // evalGroup owns filter placement; reaching here means a filter outside any group array.
      return input.filter((row) => evalExpressionAsBool(ctx, pattern.expression, row) === true);
    case "unsupported":
      return refuseConstruct(pattern.construct);
    default:
      return refuseUnknown(pattern);
  }
}

function matchTriple(
  ctx: Ctx, view: View, active: ActiveGraph, triple: TriplePattern, row: Bindings,
): Bindings[] {
  const s = resolve(triple.subject, row);
  const o = resolve(triple.object, row);

  if (triple.predicate.kind !== "iri" && triple.predicate.kind !== "variable") {
    const quads = activeQuads(view, active);
    const index = indexOf(ctx, quads);
    const out: Bindings[] = [];
    for (const [from, to] of pathPairs(ctx, index, triple.predicate, s, o)) {
      let next = row;
      if (s === null && isVariable(triple.subject)) next = bind(next, triple.subject.name, from);
      if (o === null && isVariable(triple.object)) next = bind(next, triple.object.name, to);
      out.push(next);
    }
    return out;
  }

  const p = triple.predicate.kind === "variable" ? row.get(triple.predicate.name) ?? null : triple.predicate;
  const out: Bindings[] = [];
  for (const q of activeQuads(view, active)) {
    bump(ctx);
    if (s !== null && !termEquals(q.subject, s)) continue;
    if (p !== null && !(p.kind === "iri" && q.predicate.value === p.value)) continue;
    if (o !== null && !termEquals(q.object, o)) continue;
    let next = row;
    if (s === null && isVariable(triple.subject)) next = bind(next, triple.subject.name, q.subject);
    if (p === null && triple.predicate.kind === "variable") next = bind(next, triple.predicate.name, q.predicate);
    if (o === null && isVariable(triple.object)) next = bind(next, triple.object.name, q.object);
    out.push(next);
  }
  return out;
}

// --------------------------------------------------------------------------------------------
// Expressions — SPARQL error semantics: a type error is `null`, and a filter drops the row
// --------------------------------------------------------------------------------------------

type ExprValue = Term | null;

const TRUE: Term = { kind: "literal", value: "true", datatype: XSD.boolean };
const FALSE: Term = { kind: "literal", value: "false", datatype: XSD.boolean };
const asBool = (b: boolean): Term => (b ? TRUE : FALSE);

/** Effective boolean value (SPARQL 1.1 §17.2.2). An IRI or unknown datatype has none: `null`. */
function ebv(v: ExprValue): boolean | null {
  if (v === null || v.kind !== "literal") return null;
  if (v.datatype === XSD.boolean) return v.value === "true";
  const n = numericValue(v);
  if (n !== null) return !Number.isNaN(n) && n !== 0;
  if (v.datatype === XSD.string) return v.value.length > 0;
  return null;
}

function evalExpressionAsBool(ctx: Ctx, e: Expression, row: Bindings): boolean | null {
  return ebv(evalExpression(ctx, e, row));
}

function evalExpression(ctx: Ctx, e: Expression, row: Bindings): ExprValue {
  switch (e.kind) {
    case "term":
      return resolve(e.term, row);
    case "bound":
      return asBool(row.has(e.variable.name));
    case "not": {
      const inner = ebv(evalExpression(ctx, e.expression, row));
      return inner === null ? null : asBool(!inner);
    }
    case "and": {
      // §17: an error survives unless the other operand decides: false && error is false.
      const l = ebv(evalExpression(ctx, e.left, row));
      const r = ebv(evalExpression(ctx, e.right, row));
      if (l === false || r === false) return FALSE;
      if (l === true && r === true) return TRUE;
      return null;
    }
    case "or": {
      const l = ebv(evalExpression(ctx, e.left, row));
      const r = ebv(evalExpression(ctx, e.right, row));
      if (l === true || r === true) return TRUE;
      if (l === false && r === false) return FALSE;
      return null;
    }
    case "comparison":
      return compare(e.op, evalExpression(ctx, e.left, row), evalExpression(ctx, e.right, row));
    case "expression-unsupported":
      return refuseConstruct(e.construct);
    default:
      return refuseUnknown(e);
  }
}

function compare(op: string, l: ExprValue, r: ExprValue): ExprValue {
  if (l === null || r === null) return null;
  if (op === "=" || op === "!=") {
    // IRIs compare by identity; literals by value within a comparable type, else by exact term.
    const ordered = orderable(l, r);
    const equal = ordered !== null ? ordered === 0 : termEquals(l, r);
    return asBool(op === "=" ? equal : !equal);
  }
  const ordered = orderable(l, r);
  if (ordered === null) return null;
  switch (op) {
    case "<": return asBool(ordered < 0);
    case "<=": return asBool(ordered <= 0);
    case ">": return asBool(ordered > 0);
    case ">=": return asBool(ordered >= 0);
    default: return null;
  }
}

/** A comparison result when the two terms share a comparable type; `null` when they do not. */
function orderable(l: Term, r: Term): number | null {
  if (l.kind !== "literal" || r.kind !== "literal") return null;
  const ln = numericValue(l);
  const rn = numericValue(r);
  if (ln !== null && rn !== null) return ln < rn ? -1 : ln > rn ? 1 : 0;
  if (l.datatype !== r.datatype) return null;
  if (l.datatype === XSD.string || l.datatype === XSD.boolean) {
    return l.value < r.value ? -1 : l.value > r.value ? 1 : 0;
  }
  return null;
}

// --------------------------------------------------------------------------------------------
// Solution modifiers — aggregation, canonical order, ORDER BY, LIMIT, projection
// --------------------------------------------------------------------------------------------

const isAggregate = (item: SelectQuery["select"][number]): item is AggregateBinding =>
  item.kind === "aggregate";

function aggregateRows(query: SelectQuery, rows: readonly Bindings[]): readonly Bindings[] {
  const keys = query.groupBy ?? [];
  const groups = new Map<string, { key: Bindings; members: Bindings[] }>();
  for (const row of rows) {
    const key = new Map<string, Term>();
    for (const v of keys) {
      const bound = row.get(v.name);
      if (bound !== undefined) key.set(v.name, bound);
    }
    const id = JSON.stringify([...key.entries()].map(([n, t]) => [n, termKey(t)]));
    const group = groups.get(id);
    if (group === undefined) groups.set(id, { key, members: [row] });
    else group.members.push(row);
  }
  // SPARQL gives an aggregate query with no matching rows one empty group (COUNT()=0, SUM()=0) —
  // but only when there is no GROUP BY; grouped aggregation over nothing yields no groups.
  if (groups.size === 0 && keys.length === 0) groups.set("[]", { key: new Map(), members: [] });

  const out: Bindings[] = [];
  for (const { key, members } of groups.values()) {
    const row = new Map(key);
    for (const item of query.select) {
      if (!isAggregate(item)) continue;
      const value = computeAggregate(item, members);
      if (value !== null) row.set(item.variable.name, value);
    }
    out.push(row);
  }
  return out;
}

function computeAggregate(binding: AggregateBinding, members: readonly Bindings[]): Term | null {
  const agg = binding.aggregate;
  if (agg.op === "count") {
    const counted: Variable | null = agg.of;
    const n = counted === null
      ? members.length
      : members.filter((m) => m.has(counted.name)).length;
    return numeric(n);
  }
  const values = members
    .map((m) => m.get(agg.of.name))
    .filter((t): t is Term => t !== undefined);
  if (agg.op === "sum") {
    // SUM over an empty group is 0 (§18.5.1.5); any non-numeric value is a type error → unbound.
    let total = 0;
    for (const t of values) {
      const n = numericValue(t);
      if (n === null) return null;
      total += n;
    }
    return numeric(total);
  }
  if (values.length === 0) return null;
  let best = values[0] as Term;
  for (const t of values.slice(1)) {
    const cmp = compareTerms(t, best);
    if (agg.op === "min" ? cmp < 0 : cmp > 0) best = t;
  }
  return best;
}

/** The names a query projects, in written order. */
const projectedNames = (query: SelectQuery): readonly string[] =>
  query.select.map((item) => (isAggregate(item) ? item.variable.name : item.name));

function projectRow(names: readonly string[], row: Bindings): Bindings {
  const out = new Map<string, Term>();
  for (const name of names) {
    const t = row.get(name);
    if (t !== undefined) out.set(name, t);
  }
  return out;
}

const rowKey = (names: readonly string[], row: Bindings): string =>
  JSON.stringify(names.map((n) => {
    const t = row.get(n);
    return t === undefined ? null : termKey(t);
  }));

function selectResult(query: SelectQuery, raw: readonly Bindings[]): SelectResult {
  const aggregated = query.groupBy !== null || query.select.some(isAggregate)
    ? aggregateRows(query, raw)
    : raw;
  const names = projectedNames(query);
  let rows = aggregated.map((row) => projectRow(names, row));

  // Canonical order FIRST, always: the result must not remember evaluation order — a path
  // alternation's written order, a graph-iteration order — so `(^r|p)` equals `(p|^r)` and two
  // runs are byte-identical. ORDER BY then sorts stably on top, so its ties stay canonical too.
  rows = rows
    .map((row, i) => [rowKey(names, row), i, row] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, , row]) => row);
  const orderBy = query.orderBy;
  if (orderBy !== null && orderBy.length > 0) {
    rows = [...rows].sort((a, b) => {
      for (const c of orderBy) {
        const av = a.get(c.variable.name);
        const bv = b.get(c.variable.name);
        if (av === undefined && bv === undefined) continue;
        if (av === undefined) return c.descending ? 1 : -1; // unbound orders lowest (§15.1)
        if (bv === undefined) return c.descending ? -1 : 1;
        const cmp = compareTerms(av, bv);
        if (cmp !== 0) return c.descending ? -cmp : cmp;
      }
      return 0;
    });
  }
  if (query.limit !== null) rows = rows.slice(0, query.limit);
  return { kind: "select-result", variables: names, rows };
}

// --------------------------------------------------------------------------------------------
// Entry
// --------------------------------------------------------------------------------------------

/**
 * Evaluate one query of the subset over the projected dataset.
 *
 * `question` is obtainable only from `admit` — the licensing gate has structurally already run —
 * and its `scope` fixes quad visibility. Alignment between the admitted question and the algebra
 * (that the query is ABOUT the licensed relation) belongs to the text→algebra walker that builds
 * both from one parse; this signature makes skipping the gate unrepresentable, not lying to it.
 */
export function evaluate(
  dataset: Dataset,
  query: QueryAlgebra,
  question: LicensedQuestion,
  budget: number = DEFAULT_STEP_BUDGET,
): Evaluation {
  const ctx: Ctx = { steps: 0, budget, indexes: new Map() };
  try {
    assertSupported(query.where);
    const view = applyFrom(scopeView(dataset, question.scope), query.from);
    const rows = evalGroup(ctx, view, { kind: "default" }, query.where, [EMPTY_BINDINGS]);
    if (query.kind === "ask") {
      return { kind: "ask-result", value: rows.length > 0, evidence: null, coverage: ASK_COVERAGE };
    }
    return selectResult(query, rows);
  } catch (e) {
    if (e instanceof RefusalSignal) return { kind: "refused", refusal: e.refusal };
    if (e instanceof BudgetSignal) {
      return {
        kind: "exhausted",
        steps: ctx.steps,
        prose: `evaluation stopped at the ${budget}-step budget. The question is licensed but too ` +
          `large for the synchronous evaluator; route it to the analysis Worker.`,
      };
    }
    throw e;
  }
}
