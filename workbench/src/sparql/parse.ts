/**
 * SPARQL text → the typed algebra, with the subset enforced by WALKING the parse.
 *
 * This is the door. `eval.ts` evaluates `algebra.ts` and is correct on the §6 conformance oracle,
 * but nothing could ask it a SPARQL question. `translate` parses text with `sparqljs`, walks every
 * node, and hands back an algebra plus the `LicensedQuestion` the evaluator demands.
 *
 * **The algebra is the fixed point.** It was designed to mirror what `sparqljs` emits, so this
 * module renames nodes rather than restructuring them: `{ type: "graph" }` → `{ kind: "graph" }`,
 * `{ pathType: "|" }` → `{ kind: "path-alternative" }`. Nothing here reshaped it.
 *
 * **Never rewrite the query.** §3 is explicit, and it rules out the two shortcuts: the subset is
 * enforced at MAGE's validation boundary, not by reimplementing the language and not by bending the
 * text to fit. A silently rewritten query answers a different question. So a construct outside
 * §11.1 becomes a refusal NAMING it, and V8's symmetry encoding `(p|^p)` travels from the author's
 * text to the evaluator untouched — adding or dropping a branch is the defect that cost us Comunica.
 *
 * **An unrecognized node refuses; it is never skipped.** Two routes, chosen by whether the algebra
 * can hold the construct losslessly:
 *
 *  - It has a node (`UNION`, `MINUS`, a `?` path, `REGEX`) → the translation emits the algebra's
 *    `unsupported` / `path-unsupported` / `expression-unsupported` arm carrying the construct's
 *    name, and the walk's verdict refuses. The algebra stays lossless, which is what `algebra.ts`
 *    asks for, and `eval.ts`'s own `assertSupported` is a second line that catches the same node.
 *  - It has no node (`DISTINCT`, `OFFSET`, `HAVING`, `SELECT *`, `CONSTRUCT`, a blank node, a
 *    language-tagged literal) → the translation refuses on the spot, because the only way to build
 *    an algebra would be to drop the clause, and dropping a clause is the rewrite §3 forbids.
 *
 * Both end in `outsideSubset`, from the landed vocabulary. No new refusal cause.
 *
 * ## Order of refusals: clause, then query, then model
 *
 * 1. **A clause the subset rejects**, in the order the clauses are read — projection, dataset
 *    clause, then the graph pattern. The author can point at the text that offended.
 * 2. **A query-level form** — no scope stated, a `GRAPH` clause under a dataset clause, a relation
 *    type read from the default graph. True of the whole query rather than of one clause.
 * 3. **Whatever `admit` decides** — unknown vocabulary, then the subset verdict again, then the
 *    model's licensing, in the order the gate itself fixes.
 *
 * Text faults before model faults, and §4 gives the reason: a query the subset does not accept was
 * never a well-formed question of this model, so answering it with a modeling critique misdirects
 * the author. The cost is recorded rather than hidden — a misspelled relation type sits inside
 * `admit` and so is reported after a bad clause, inverting the gate's internal ordering for that
 * one pair.
 *
 * ## No implicit prefixes
 *
 * The parser is constructed with no `prefixes` and no `baseIRI`. Supplying `mage:` would be a
 * kindness that breaks §3's other promise — every accepted query stays valid SPARQL, so a query
 * exported from the workbench answers the same question against any conformant engine. A query
 * that parses only inside our prefix environment is not portable text. The author writes `PREFIX`.
 */
import { Parser } from "sparqljs";
import type { CanonicalSystem } from "../ir/types.ts";
import { modelGraphIri, relationTypeIri } from "../rdf/iri.ts";
import { iri, type Dataset, type Iri, type Term } from "../rdf/terms.ts";
import {
  admit,
  type LicensedQuestion, type QueryScope, type RelationalQuestion, type SeamQuestion,
  type SubsetVerdict, type Traversal,
} from "./licensing.ts";
import {
  absentModelType, noSubjectDeclared, outsideSubset, undeclaredVocabulary,
  type EngineRoute, type SeamRefusal,
} from "./refusal.ts";
import { variable } from "./algebra.ts";
import type {
  Aggregate, AggregateBinding, AskQuery, ComparisonOp, Expression, GraphPattern, OrderComparator,
  PathNode, PatternTerm, PropertyPath, QueryAlgebra, SelectItem, SelectQuery, TriplePattern, Variable,
} from "./algebra.ts";
import { DEFAULT_STEP_BUDGET, evaluate, type Evaluation, type ExhaustedResult } from "./eval.ts";

// --------------------------------------------------------------------------------------------
// Results
// --------------------------------------------------------------------------------------------

/**
 * A translated query: the algebra, the licensed question, and the derivation a caller can audit.
 *
 * `scope` and `questions` are reported rather than kept private because they are DERIVED from the
 * text by the rules in `deriveScope` and `deriveSubjects` below, and a derivation a caller cannot
 * see is a derivation nobody tests.
 *
 * **`questions` is every subject the gate admitted, in sorted order** — one per relation type the
 * query traverses, each carrying the traversal, evidence need, scope and subset verdict it was
 * admitted under. It replaces a `relations: readonly string[]` that reported the same list with
 * four of its five fields thrown away; two views of one derivation is the drift this layer removes
 * on sight, and the relation ids are `questions.map((q) => q.relation)`.
 *
 * It is also what closes the `exhausted` route. `resolveExhausted` re-asks the question on the
 * Worker's thread and the Worker runs `admit` itself, so it needs the gate's INPUT — which this
 * field is. `question` below is the gate's OUTPUT, branded and unserializable, and stays private to
 * the evaluator for exactly that reason.
 */
export interface TranslatedQuery {
  readonly kind: "query";
  readonly query: QueryAlgebra;
  readonly question: LicensedQuestion;
  readonly scope: QueryScope;
  readonly questions: readonly RelationalQuestion[];
}

/**
 * `routed` cannot arise from SPARQL text today: a text query's evidence need is always `bindings`,
 * because SPARQL 1.1 has no path variables and so no text query can ASK for a path witness. The arm
 * stays anyway — `admit` has three arms, and a translator that collapsed one would silently return
 * the wrong shape the day a fourth subject kind reaches it.
 */
export type Translation =
  | TranslatedQuery
  | { readonly kind: "refused"; readonly refusal: SeamRefusal }
  | { readonly kind: "routed"; readonly route: EngineRoute };

/** The evaluator's arms, plus the engine route `admit` can produce. */
export type Answer = Evaluation | { readonly kind: "routed"; readonly route: EngineRoute };

/**
 * The handle an exhausted answer carries: everything needed to re-ask the question with a bigger
 * budget, and nothing that would let a caller ask a FRESH question with one.
 *
 * **Why the handle rather than a documented pair of arguments.** `resolveExhausted` used to take
 * `(spent, question, query)`, and nothing could call it: the question was branded, the algebra was
 * private to this module, and a facade that rebuilt either by guesswork would be asserting what the
 * translator derived. One value, produced only on the exhausted path, replaces three a caller had
 * to pair correctly — and the pairing was the hazard, since a `spent` from one query beside the
 * algebra of another type-checks and answers the wrong question with a bigger budget.
 *
 * `spent` is the SAME object as the `answer` it travelled beside, not a copy of it.
 */
export interface ExhaustedEscalation {
  readonly spent: ExhaustedResult;
  /** The gate's inputs. Unbranded, so they cross `postMessage` and the other thread re-admits. */
  readonly questions: readonly SeamQuestion[];
  readonly query: QueryAlgebra;
}

/**
 * What `answerSparql` returns: the answer, and the escalation handle when there is one.
 *
 * `escalation` is non-null exactly when `answer.kind === "exhausted"`. Not when the answer is a
 * refusal (nothing would be licensed by a bigger budget), not when it is empty (the budget was
 * never the bound), and not when it succeeded — because the Worker's budget is the escalation of an
 * exhausted question and must not become a general-purpose fast lane around the interactive one.
 */
export interface SparqlOutcome {
  readonly answer: Answer;
  readonly escalation: ExhaustedEscalation | null;
}

// --------------------------------------------------------------------------------------------
// Refusal signals — both routes unwind to one catch in `translate`
// --------------------------------------------------------------------------------------------

class RefusalSignal extends Error {
  readonly refusal: SeamRefusal;
  constructor(refusal: SeamRefusal) {
    super(refusal.prose);
    this.refusal = refusal;
  }
}

/** The construct has no lossless algebra node, so representing it would mean dropping a clause. */
const refuseNow = (construct: string, detail: string | null = null): never => {
  throw new RefusalSignal(outsideSubset(construct, detail));
};

/**
 * The first out-of-subset node the walk met, and the subset verdict built from it.
 *
 * State-bearing, so a class (`CODE-STYLE.md` §1a). First-wins rather than a list, because
 * `SubsetVerdict` names one construct: a reader fixes one clause at a time, and a verdict naming
 * five constructs invites fixing none of them.
 */
class SubsetWalk {
  #first: string | null = null;

  /** Record an out-of-subset construct and give it back, for the node that will carry the name. */
  reject(construct: string): string {
    if (this.#first === null) this.#first = construct;
    return construct;
  }

  get verdict(): SubsetVerdict {
    return this.#first === null
      ? { kind: "within-subset" }
      : { kind: "outside-subset", construct: this.#first };
  }
}

// --------------------------------------------------------------------------------------------
// Reading an untyped parse — every field is earned, nothing is assumed
// --------------------------------------------------------------------------------------------

type Node = Readonly<Record<string, unknown>>;

const isNode = (v: unknown): v is Node =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** A child node, or a refusal. `where` names the position, so the refusal says where it looked. */
function childNode(value: unknown, where: string): Node {
  if (!isNode(value)) {
    return refuseNow(`unrecognized ${where}`,
      `the parser produced ${value === undefined ? "nothing" : typeof value} where a node was ` +
      `expected. The query was not evaluated: a node the walker cannot read is refused, never skipped`);
  }
  return value;
}

/** A child array, or a refusal. Refuses the ARRAY, never filters an entry out of it. */
function childNodes(value: unknown, where: string): readonly Node[] {
  if (!Array.isArray(value)) return refuseNow(`unrecognized ${where}`, "expected a list of nodes");
  return (value as readonly unknown[]).map((v) => childNode(v, where));
}

const stringField = (n: Node, key: string): string | null => {
  const v = n[key];
  return typeof v === "string" ? v : null;
};

const numberField = (n: Node, key: string): number | null => {
  const v = n[key];
  return typeof v === "number" ? v : null;
};

// --------------------------------------------------------------------------------------------
// Terms
// --------------------------------------------------------------------------------------------

const RDF_LANG_STRING = "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString";

/**
 * An RDF/JS term from the parse, as one of ours.
 *
 * Blank nodes and language tags refuse rather than translate, and `terms.ts` already gave the
 * reasons: a blank node carries no identity outside the document that mentions it, and the IR has
 * no natural-language channel, so a language tag asserts something the model never said. Neither
 * has a representation to be lossless in, so both refuse here (route two).
 */
function term(n: Node, where: string): PatternTerm {
  const termType = stringField(n, "termType");
  const value = stringField(n, "value");
  if (termType === null || value === null) {
    // `SELECT *` parses as a Wildcard, which carries no `termType` at all.
    return refuseNow(`unrecognized ${where}`, "the node carries no termType");
  }
  switch (termType) {
    case "NamedNode":
      return iri(value);
    case "Variable":
      return variable(value);
    case "Literal": {
      const language = stringField(n, "language");
      if (language !== null && language !== "") {
        return refuseNow("language-tagged literal",
          `'@${language}' asserts a natural language, and the IR has no natural-language channel`);
      }
      const datatypeNode = n["datatype"];
      const datatype = isNode(datatypeNode) ? stringField(datatypeNode, "value") : null;
      if (datatype === null) return refuseNow("literal without a datatype");
      if (datatype === RDF_LANG_STRING) return refuseNow("language-tagged literal");
      return { kind: "literal", value, datatype };
    }
    case "BlankNode":
      return refuseNow("blank node",
        "a blank node carries no identity outside the document that mentions it, and identity is " +
        "the job this projection exists to do");
    default:
      return refuseNow(`${termType} term`);
  }
}

const isVariableTerm = (t: PatternTerm): t is Variable => t.kind === "variable";

/** A term that must be an IRI or a variable: a subject, or a `GRAPH` name. */
function iriOrVariable(n: Node, where: string): Iri | Variable {
  const t = term(n, where);
  if (t.kind === "literal") return refuseNow(`literal in ${where} position`);
  return t;
}

/** A term that must be a plain IRI: a `FROM` graph, a negated-set member. */
function plainIri(n: Node, where: string): Iri {
  const t = term(n, where);
  if (t.kind !== "iri") return refuseNow(`non-IRI in ${where} position`);
  return t;
}

/** A term that must be a variable: a projection entry, `GROUP BY`, `ORDER BY`, `BOUND`. */
function plainVariable(n: Node, where: string): Variable {
  const t = term(n, where);
  if (!isVariableTerm(t)) return refuseNow(`non-variable in ${where}`);
  return t;
}

// --------------------------------------------------------------------------------------------
// Property paths — `sparqljs` spells each as `{ type: "path", pathType, items }`
// --------------------------------------------------------------------------------------------

const isPathNode = (n: Node): boolean => stringField(n, "type") === "path";

/** The single operand of a unary path operator. */
function oneItem(n: Node, pathType: string): Node {
  const items = childNodes(n["items"], `'${pathType}' path operand`);
  const only = items.length === 1 ? items[0] : undefined;
  if (only === undefined) {
    return refuseNow(`property path '${pathType}' with ${items.length} operands`);
  }
  return only;
}

function path(walk: SubsetWalk, n: Node): PathNode {
  if (!isPathNode(n)) return plainIri(n, "property path leaf");
  const pathType = stringField(n, "pathType");
  if (pathType === null) return { kind: "path-unsupported", construct: walk.reject("unrecognized property path") };
  switch (pathType) {
    case "^":
      return { kind: "path-inverse", path: path(walk, oneItem(n, "^")) };
    case "*":
      return { kind: "path-zero-or-more", path: path(walk, oneItem(n, "*")) };
    case "+":
      return { kind: "path-one-or-more", path: path(walk, oneItem(n, "+")) };
    case "/":
      return {
        kind: "path-sequence",
        paths: childNodes(n["items"], "'/' path operand").map((i) => path(walk, i)),
      };
    case "|":
      // V8's symmetry encoding. Every branch is translated; none is privileged by direction or by
      // written order. Dropping a forward branch of exactly this node inside `GRAPH` is the
      // measured Comunica defect, and the translation is where a front end would reintroduce it.
      return {
        kind: "path-alternative",
        paths: childNodes(n["items"], "'|' path operand").map((i) => path(walk, i)),
      };
    case "!":
      return negatedSet(walk, n);
    case "?":
      return { kind: "path-unsupported", construct: walk.reject("property path '?'") };
    default:
      return { kind: "path-unsupported", construct: walk.reject(`property path '${pathType}'`) };
  }
}

/**
 * `!(p|q)` — a negated property set of FORWARD predicates only.
 *
 * `algebra.ts` fixes the boundary: `path-negated` holds forward predicates, and `!(^p)` or a mixed
 * set is out of the subset, because evaluating half of a negation is worse than refusing it.
 * `sparqljs` wraps a multi-member set in a `|` path and leaves a single member bare.
 */
function negatedSet(walk: SubsetWalk, n: Node): PropertyPath {
  const inner = oneItem(n, "!");
  const members = isPathNode(inner) && stringField(inner, "pathType") === "|"
    ? childNodes(inner["items"], "negated property set member")
    : [inner];
  const forbidden: Iri[] = [];
  for (const m of members) {
    if (isPathNode(m)) {
      return {
        kind: "path-unsupported",
        construct: walk.reject("negated property set over an inverse or nested path"),
      };
    }
    forbidden.push(plainIri(m, "negated property set member"));
  }
  return { kind: "path-negated", forbidden };
}

// --------------------------------------------------------------------------------------------
// Expressions — `{ type: "operation", operator, args }`
// --------------------------------------------------------------------------------------------

const COMPARISONS: ReadonlySet<string> = new Set(["=", "!=", "<", "<=", ">", ">="]);

/** Two operands for a binary operator, or a refusal. */
function twoArgs(n: Node, operator: string): readonly [Node, Node] {
  const args = childNodes(n["args"], `'${operator}' operand`);
  const [left, right] = args;
  if (args.length !== 2 || left === undefined || right === undefined) {
    return refuseNow(`FILTER '${operator}' with ${args.length} operands`);
  }
  return [left, right];
}

function oneArg(n: Node, operator: string): Node {
  const args = childNodes(n["args"], `'${operator}' operand`);
  const only = args.length === 1 ? args[0] : undefined;
  if (only === undefined) return refuseNow(`FILTER '${operator}' with ${args.length} operands`);
  return only;
}

function expression(walk: SubsetWalk, n: Node): Expression {
  const type = stringField(n, "type");
  if (type === "aggregate") {
    // Reachable only from HAVING, which refuses earlier; kept so the arm is never a fallthrough.
    return { kind: "expression-unsupported", construct: walk.reject("aggregate inside FILTER") };
  }
  if (type !== "operation") {
    if (stringField(n, "termType") !== null) return { kind: "term", term: term(n, "FILTER operand") };
    return { kind: "expression-unsupported", construct: walk.reject("unrecognized FILTER expression") };
  }
  const operator = stringField(n, "operator");
  if (operator === null) {
    return { kind: "expression-unsupported", construct: walk.reject("FILTER operation with no operator") };
  }
  if (COMPARISONS.has(operator)) {
    const [l, r] = twoArgs(n, operator);
    return {
      kind: "comparison",
      op: operator as ComparisonOp,
      left: expression(walk, l),
      right: expression(walk, r),
    };
  }
  switch (operator) {
    case "&&": {
      const [l, r] = twoArgs(n, operator);
      return { kind: "and", left: expression(walk, l), right: expression(walk, r) };
    }
    case "||": {
      const [l, r] = twoArgs(n, operator);
      return { kind: "or", left: expression(walk, l), right: expression(walk, r) };
    }
    case "!":
      return { kind: "not", expression: expression(walk, oneArg(n, operator)) };
    case "bound":
      return { kind: "bound", variable: plainVariable(oneArg(n, operator), "BOUND") };
    default:
      // Every other SPARQL function and operator: REGEX, IN, EXISTS, arithmetic, STR, LANG, …
      return { kind: "expression-unsupported", construct: walk.reject(`FILTER ${operator.toUpperCase()}`) };
  }
}

// --------------------------------------------------------------------------------------------
// Patterns
// --------------------------------------------------------------------------------------------

/** The pattern types §11.1 does not accept, each named as the author wrote it. */
const UNSUPPORTED_PATTERNS: Readonly<Record<string, string>> = {
  union: "UNION",
  minus: "MINUS",
  bind: "BIND",
  values: "VALUES",
  service: "SERVICE",
  query: "sub-SELECT",
};

function triple(walk: SubsetWalk, n: Node): TriplePattern {
  const predicateNode = childNode(n["predicate"], "triple predicate");
  // `path` returns `Iri | PropertyPath`, which is exactly what the predicate position accepts: a
  // single-leaf path IS a bare predicate IRI, and the algebra spells it that way.
  const predicate: Iri | Variable | PropertyPath = isPathNode(predicateNode)
    ? path(walk, predicateNode)
    : iriOrVariable(predicateNode, "triple predicate");
  return {
    subject: iriOrVariable(childNode(n["subject"], "triple subject"), "triple subject"),
    predicate,
    object: term(childNode(n["object"], "triple object"), "triple object"),
  };
}

function pattern(walk: SubsetWalk, n: Node): GraphPattern {
  const type = stringField(n, "type");
  if (type === null) {
    // A sub-SELECT appears inside a `group` as a bare query object, with `queryType` and no `type`.
    const construct = stringField(n, "queryType") === null ? "unrecognized pattern node" : "sub-SELECT";
    return { kind: "unsupported", construct: walk.reject(construct) };
  }
  const named = UNSUPPORTED_PATTERNS[type];
  if (named !== undefined) return { kind: "unsupported", construct: walk.reject(named) };
  switch (type) {
    case "bgp":
      return {
        kind: "bgp",
        triples: childNodes(n["triples"], "BGP triple").map((t) => triple(walk, t)),
      };
    case "graph":
      return {
        kind: "graph",
        name: iriOrVariable(childNode(n["name"], "GRAPH name"), "GRAPH name"),
        patterns: patterns(walk, n["patterns"]),
      };
    case "group":
      return { kind: "group", patterns: patterns(walk, n["patterns"]) };
    case "optional":
      return { kind: "optional", patterns: patterns(walk, n["patterns"]) };
    case "filter":
      return { kind: "filter", expression: expression(walk, childNode(n["expression"], "FILTER expression")) };
    default:
      return { kind: "unsupported", construct: walk.reject(`pattern '${type}'`) };
  }
}

const patterns = (walk: SubsetWalk, value: unknown): readonly GraphPattern[] =>
  childNodes(value, "group pattern").map((p) => pattern(walk, p));

// --------------------------------------------------------------------------------------------
// The query — projection, dataset clause, solution modifiers
// --------------------------------------------------------------------------------------------

const AGGREGATIONS: ReadonlySet<string> = new Set(["count", "min", "max", "sum"]);

/** `(COUNT(?x) AS ?n)`. A `COUNT(*)` wildcard carries no `termType`, which is `of: null`. */
function aggregateBinding(n: Node): AggregateBinding {
  const expr = childNode(n["expression"], "projection expression");
  if (stringField(expr, "type") !== "aggregate") {
    return refuseNow("expression in SELECT",
      "v0.1 projects variables and the four aggregates; an arbitrary `(expr AS ?v)` is not accepted");
  }
  const aggregation = stringField(expr, "aggregation");
  if (aggregation === null || !AGGREGATIONS.has(aggregation)) {
    return refuseNow(`aggregate ${(aggregation ?? "unknown").toUpperCase()}`);
  }
  if (expr["distinct"] === true) return refuseNow("DISTINCT inside an aggregate");
  const variableName = plainVariable(childNode(n["variable"], "AS name"), "the AS name");
  const of = childNode(expr["expression"], "aggregate operand");
  const wildcard = stringField(of, "termType") === null;
  if (aggregation === "count") {
    const aggregate: Aggregate = { op: "count", of: wildcard ? null : plainVariable(of, "COUNT") };
    return { kind: "aggregate", variable: variableName, aggregate };
  }
  if (wildcard) return refuseNow(`${aggregation.toUpperCase()}(*)`);
  const aggregate: Aggregate = {
    op: aggregation as "min" | "max" | "sum",
    of: plainVariable(of, aggregation.toUpperCase()),
  };
  return { kind: "aggregate", variable: variableName, aggregate };
}

function selectItem(n: Node): SelectItem {
  if (stringField(n, "termType") === "Variable") return plainVariable(n, "the projection");
  if (n["variable"] !== undefined) return aggregateBinding(n);
  // `SELECT *` parses as a Wildcard: an object with no termType and no `variable`.
  return refuseNow("SELECT *",
    "the projected names decide the result's columns and its canonical row order, so v0.1 requires " +
    "them written out");
}

/** `GROUP BY` / `ORDER BY` entries wrap their operand in `{ expression: … }`. */
function groupByVariable(n: Node): Variable {
  return plainVariable(childNode(n["expression"], "GROUP BY key"), "a GROUP BY key");
}

function orderComparator(n: Node): OrderComparator {
  const expr = childNode(n["expression"], "ORDER BY key");
  if (stringField(expr, "termType") !== "Variable") {
    return refuseNow("ORDER BY expression", "v0.1 orders by a projected variable");
  }
  return { variable: plainVariable(expr, "an ORDER BY key"), descending: n["descending"] === true };
}

/** The dataset clause. `FROM NAMED` has no algebra arm, and no v0.1 semantics (§13.2). */
function datasetClause(parsed: Node): readonly Iri[] | null {
  const from = parsed["from"];
  if (from === undefined) return null;
  const clause = childNode(from, "dataset clause");
  const namedGraphs = childNodes(clause["named"], "FROM NAMED graph");
  if (namedGraphs.length > 0) {
    return refuseNow("FROM NAMED",
      "a v0.1 query has either a dataset clause or named graphs, never both: with no FROM NAMED " +
      "the clause describes the whole dataset (SPARQL 1.1 §13.2)");
  }
  const defaults = childNodes(clause["default"], "FROM graph");
  if (defaults.length === 0) return null;
  return defaults.map((g) => plainIri(g, "a FROM graph"));
}

/** Modifiers with no algebra field. Present means the query asks for something v0.1 cannot do. */
function refuseUnsupportedModifiers(parsed: Node, allowSolutionModifiers: boolean): void {
  if (parsed["distinct"] === true) {
    refuseNow("DISTINCT",
      "the evaluator's canonical row order is bag semantics by design, and SPARQL 1.1 §18.2.2.4 " +
      "makes `(^r|^r)` yield its solution twice — which the conformance oracle pins");
  }
  if (parsed["reduced"] === true) refuseNow("REDUCED");
  if (parsed["having"] !== undefined) refuseNow("HAVING");
  const offset = numberField(parsed, "offset");
  if (offset !== null && offset !== 0) refuseNow("OFFSET");
  if (allowSolutionModifiers) return;
  for (const clause of ["group", "order", "limit"] as const) {
    if (parsed[clause] !== undefined) refuseNow(`${clause.toUpperCase()} on an ASK`);
  }
}

function toAlgebra(walk: SubsetWalk, parsed: Node): QueryAlgebra {
  const queryType = stringField(parsed, "queryType");
  if (queryType === "ASK") {
    refuseUnsupportedModifiers(parsed, false);
    const ask: AskQuery = {
      kind: "ask",
      from: datasetClause(parsed),
      where: patterns(walk, parsed["where"]),
    };
    return ask;
  }
  if (queryType !== "SELECT") {
    return refuseNow(queryType === null ? "unrecognized query form" : queryType,
      "v0.1 answers SELECT and ASK; the other query forms build RDF rather than solutions");
  }
  refuseUnsupportedModifiers(parsed, true);
  const group = parsed["group"];
  const order = parsed["order"];
  const limit = numberField(parsed, "limit");
  const select: SelectQuery = {
    kind: "select",
    select: childNodes(parsed["variables"], "projection entry").map(selectItem),
    from: datasetClause(parsed),
    where: patterns(walk, parsed["where"]),
    groupBy: group === undefined ? null : childNodes(group, "GROUP BY key").map(groupByVariable),
    orderBy: order === undefined ? null : childNodes(order, "ORDER BY key").map(orderComparator),
    limit,
  };
  return select;
}

// --------------------------------------------------------------------------------------------
// The scope mapping — derived from the text's own graph form, never defaulted
// --------------------------------------------------------------------------------------------

/**
 * How a model id and a graph IRI convert, derived from the minting functions rather than
 * re-spelled. `relationTypeIri(sys, "")` yields the namespace's prefix, so the URN scheme stays
 * owned by `iri.ts` — a scheme change there moves this with it instead of leaving it stale.
 */
class Vocabulary {
  readonly #relationPrefix: string;
  readonly #graphPrefix: string;
  readonly #system: CanonicalSystem;

  constructor(system: CanonicalSystem) {
    this.#system = system;
    this.#relationPrefix = relationTypeIri(system.systemId, "").value;
    this.#graphPrefix = modelGraphIri(system.systemId, "").value;
  }

  /** The relation type this predicate IRI names, or null when it names something else entirely. */
  relationType(predicate: Iri): string | null {
    return predicate.value.startsWith(this.#relationPrefix)
      ? decodeURIComponent(predicate.value.slice(this.#relationPrefix.length))
      : null;
  }

  /**
   * The model whose graph this IRI is.
   *
   * An IRI inside the namespace naming an undeclared model goes through the same rung `admit`'s own
   * `checkScope` uses — a user who misspelled a graph and one who misspelled a model should not be
   * told two different things about one mistake. That rung carries §7.6's precedence, so this site
   * cannot report a bare absence where a `purpose.omits` recorded a decision either.
   */
  model(graph: Iri): string {
    if (!graph.value.startsWith(this.#graphPrefix)) {
      return refuseNow(`named graph <${graph.value}>`,
        "a scoped query reads a model's named graph, and this IRI is not one. The projection puts " +
        "each model's graph IRI on `mage:graph`");
    }
    const id = decodeURIComponent(graph.value.slice(this.#graphPrefix.length));
    if (!this.#system.models.has(id)) {
      throw new RefusalSignal(undeclaredVocabulary(this.#system, "model", id,
        `name a model this system declares, as the graph IRI's last segment. The query scoped ` +
        `itself to <${graph.value}>, which no declared model owns.`));
    }
    return id;
  }
}

interface GraphUse {
  readonly concrete: readonly Iri[];
  readonly variable: boolean;
}

function graphUse(where: readonly GraphPattern[]): GraphUse {
  const concrete: Iri[] = [];
  let hasVariable = false;
  const walkPatterns = (ps: readonly GraphPattern[]): void => {
    for (const p of ps) {
      switch (p.kind) {
        case "graph":
          if (p.name.kind === "variable") hasVariable = true;
          else concrete.push(p.name);
          walkPatterns(p.patterns);
          break;
        case "group":
        case "optional":
          walkPatterns(p.patterns);
          break;
        case "bgp":
        case "filter":
        case "unsupported":
          break;
      }
    }
  };
  walkPatterns(where);
  return { concrete, variable: hasVariable };
}

/**
 * The scope the text states. **Scope has no default (V34): the caller states it, and here the
 * caller's statement IS the query's graph form.** Each arm, and why it is a derivation rather than
 * a guess:
 *
 *  - **`GRAPH ?g { … }`** → `system-union`. The clause ranges over every visible named graph, which
 *    is the engine's cross-model adjacency; `project.ts` prescribes exactly this spelling for the
 *    union. Narrowing to one model would silently shrink the range the author wrote.
 *  - **`GRAPH <g>` naming one model's graph** → that model. §2's "a query about one purposeful
 *    reduction scopes to its graph", read literally.
 *  - **`GRAPH <g1>` and `GRAPH <g2>` naming two models** → `system-union`, and this one is forced
 *    rather than chosen: no model scope makes both graphs visible, and widening cannot add a
 *    solution because every pattern is still restricted to a graph the author named.
 *  - **`FROM <g…>`** → the same one-model-or-union rule over the listed graphs. Union is REQUIRED
 *    for two: `applyFrom` merges the listed graphs out of `view.named`, so a model scope would hide
 *    one of them and drop its quads without a word.
 *  - **`FROM` together with any `GRAPH` clause** → refused. With no `FROM NAMED` the dataset clause
 *    leaves no named graphs at all (§13.2), so the `GRAPH` clause can match nothing. The query is
 *    guaranteed empty, and a confident empty is the failure mode this whole layer is built against.
 *  - **A bare `WHERE`** → refused. It states no scope, and `system-union` is NOT the default graph:
 *    the default graph holds no relation edge, so a bare pattern over a relation type matches
 *    nothing, silently. Mapping a bare `WHERE` onto either scope would make every architectural
 *    question return empty and look like it worked.
 *
 * The cost of the last arm, stated rather than discovered: a question about the default graph alone
 * — an entity's type, a property value, a relation type's own declarations, the `contains` tree —
 * has no spelling the text path accepts, because `FROM` replaces the default graph and `GRAPH`
 * cannot see it. So the gate's `containment` arm is unreachable from text. That is a gap in the
 * text interface, not a licence to default the scope; `DESIGN-sparql-261002.md` §7 records it.
 */
function deriveScope(vocabulary: Vocabulary, query: QueryAlgebra): QueryScope {
  const graphs = graphUse(query.where);
  const from = query.from;
  if (from !== null && (graphs.variable || graphs.concrete.length > 0)) {
    return refuseNow("GRAPH clause under a dataset clause",
      "with no FROM NAMED, FROM describes the whole dataset and leaves no named graphs, so the " +
      "GRAPH clause cannot match — the query would answer empty for a reason the text does not show");
  }
  if (graphs.variable) return { kind: "system-union" };
  const scoped = from ?? graphs.concrete;
  if (scoped.length === 0) {
    return refuseNow("bare WHERE without FROM or GRAPH",
      "the query states no scope and scope has no default. The default graph holds no relation " +
      "edge, so a bare pattern over a relation type matches nothing without saying so — write " +
      "GRAPH ?g { … } to ask every model, or GRAPH <model-graph> { … } to ask one");
  }
  const models = new Set<string>();
  for (const g of scoped) models.add(vocabulary.model(g));
  const only = models.size === 1 ? [...models][0] : undefined;
  return only === undefined ? { kind: "system-union" } : { kind: "model", model: only };
}

/**
 * The relation type a pattern reads from the DEFAULT graph, or null.
 *
 * The companion to the bare-`WHERE` refusal, and it catches what that one cannot: a query that
 * states a scope correctly and then puts one triple OUTSIDE its `GRAPH` block. The default graph
 * holds no relation edge (`project.ts`), so that triple matches nothing and takes the whole join
 * with it — a confident empty, from a query that looks scoped.
 *
 * A dataset clause changes the reading: `FROM <g>` promotes the listed graphs to the default graph,
 * so with `from` present a default-graph position IS a model graph and the pattern is sound. That is
 * also why this is the only place the two scopings are not interchangeable at the TEXT level, even
 * though `eval.ts` keeps them interchangeable at the solution level.
 *
 * A relation type in SUBJECT position is a different question — `<rt:calls> mage:symmetric ?s` reads
 * the type's own declaration, which the projection does put in the default graph. Only the predicate
 * position is checked.
 */
function defaultGraphRelation(vocabulary: Vocabulary, query: QueryAlgebra): string | null {
  if (query.from !== null) return null;
  let found: string | null = null;
  const walkPatterns = (ps: readonly GraphPattern[], insideGraph: boolean): void => {
    for (const p of ps) {
      switch (p.kind) {
        case "graph":
          walkPatterns(p.patterns, true);
          break;
        case "group":
        case "optional":
          walkPatterns(p.patterns, insideGraph);
          break;
        case "bgp":
          if (insideGraph) break;
          for (const t of p.triples) {
            const relation = t.predicate.kind === "iri" ? vocabulary.relationType(t.predicate) : null;
            if (relation !== null && found === null) found = relation;
          }
          break;
        case "filter":
        case "unsupported":
          break;
      }
    }
  };
  walkPatterns(query.where, false);
  return found;
}

// --------------------------------------------------------------------------------------------
// The subjects — which relation types the query traverses, and how
// --------------------------------------------------------------------------------------------

/**
 * Traversals per relation type, with `composing` winning over `direct`.
 *
 * `composing` is `licensing.ts`'s definition, not hop arithmetic: `rel+`, `rel*`, and a join that
 * chains two edges of the same type. Over-approximating it is the SAFE direction — a question
 * wrongly called composing is refused with a reason, while one wrongly called direct smuggles a
 * reachability claim past a relation type that declared `composition.path: forbidden`.
 */
class Subjects {
  readonly #named = new Map<string, Traversal>();
  /** The traversal a variable predicate or a negated set applies to EVERY declared relation type. */
  #any: Traversal | null = null;

  add(relation: string, traversal: Traversal): void {
    if (traversal === "composing" || !this.#named.has(relation)) this.#named.set(relation, traversal);
  }

  addAny(traversal: Traversal): void {
    if (traversal === "composing" || this.#any === null) this.#any = traversal;
  }

  /**
   * One entry per relation type the query can traverse, sorted so a refusal is deterministic.
   *
   * A variable predicate names no relation type, and SPARQL forbids a path operator over one, so
   * its traversal is always `direct` — which every relation type licenses. A negated set under a
   * closure is the shape that is NOT harmless: it composes edges of types it never names, so it
   * raises every declared type to `composing` and the gate decides each one.
   */
  resolve(system: CanonicalSystem): readonly (readonly [string, Traversal])[] {
    const merged = new Map(this.#named);
    const any = this.#any;
    if (any !== null) {
      for (const id of system.relationTypes.keys()) {
        if (any === "composing" || !merged.has(id)) merged.set(id, any);
      }
    }
    return [...merged.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  }
}

/** A key that makes two pattern terms comparable for chain detection. */
const endpointKey = (t: PatternTerm): string =>
  t.kind === "variable" ? `?${t.name}` : `${t.kind}:${t.value}`;

/**
 * Relation types in one path, and the multiset of its leaves so an enclosing sequence can see a
 * repeat. A sequence that mentions one type twice chains two of its edges, which is composition.
 */
function pathSubjects(
  vocabulary: Vocabulary, subjects: Subjects, p: PathNode, composing: boolean,
): readonly string[] {
  if (p.kind === "iri") {
    const relation = vocabulary.relationType(p);
    if (relation === null) return [];
    subjects.add(relation, composing ? "composing" : "direct");
    return [relation];
  }
  switch (p.kind) {
    case "path-inverse":
      // Direction, not composition. `^rel` walks one edge backwards.
      return pathSubjects(vocabulary, subjects, p.path, composing);
    case "path-zero-or-more":
    case "path-one-or-more":
      return pathSubjects(vocabulary, subjects, p.path, true);
    case "path-sequence": {
      const leaves = p.paths.flatMap((inner) => pathSubjects(vocabulary, subjects, inner, composing));
      const counts = new Map<string, number>();
      for (const relation of leaves) counts.set(relation, (counts.get(relation) ?? 0) + 1);
      for (const [relation, n] of counts) if (n >= 2) subjects.add(relation, "composing");
      return leaves;
    }
    case "path-alternative":
      return p.paths.flatMap((inner) => pathSubjects(vocabulary, subjects, inner, composing));
    case "path-negated":
      // Names types only to EXCLUDE them, so it traverses the ones it does not name. Harmless at
      // one hop; under a closure it is reachability over types that never consented to it.
      subjects.addAny(composing ? "composing" : "direct");
      return [];
    case "path-unsupported":
      return [];
  }
}

/** Every relation type the query traverses, with the traversal it is traversed under. */
function deriveSubjects(
  vocabulary: Vocabulary, system: CanonicalSystem, query: QueryAlgebra,
): readonly (readonly [string, Traversal])[] {
  const subjects = new Subjects();
  /** Per relation type, the (subject, object) endpoints of every triple that traverses it. */
  const endpoints = new Map<string, [string, string][]>();

  const recordTriple = (t: TriplePattern): void => {
    const relations: string[] = [];
    if (t.predicate.kind === "iri") {
      const relation = vocabulary.relationType(t.predicate);
      if (relation !== null) {
        subjects.add(relation, "direct");
        relations.push(relation);
      }
    } else if (t.predicate.kind === "variable") {
      subjects.addAny("direct");
    } else {
      relations.push(...pathSubjects(vocabulary, subjects, t.predicate, false));
    }
    const pair: [string, string] = [endpointKey(t.subject), endpointKey(t.object)];
    for (const relation of new Set(relations)) {
      const bucket = endpoints.get(relation);
      if (bucket === undefined) endpoints.set(relation, [pair]);
      else bucket.push(pair);
    }
  };

  const walkPatterns = (ps: readonly GraphPattern[]): void => {
    for (const p of ps) {
      switch (p.kind) {
        case "bgp":
          p.triples.forEach(recordTriple);
          break;
        case "graph":
        case "group":
        case "optional":
          walkPatterns(p.patterns);
          break;
        case "filter":
        case "unsupported":
          break;
      }
    }
  };
  walkPatterns(query.where);

  // A join that chains two edges of one type is composition, whether or not a path operator wrote
  // it: `{ ?a rel ?b . ?b rel ?c }` derives its answer by putting edges end to end.
  for (const [relation, pairs] of endpoints) {
    const subjectsSeen = new Set(pairs.map(([s]) => s));
    if (pairs.some(([, o]) => subjectsSeen.has(o))) subjects.add(relation, "composing");
  }

  return subjects.resolve(system);
}

// --------------------------------------------------------------------------------------------
// Entry
// --------------------------------------------------------------------------------------------

/**
 * SPARQL text → an algebra plus the licensed question the evaluator demands.
 *
 * **The gate is the only door.** The returned `LicensedQuestion` comes from `admit`, and `admit` is
 * the only producer of that brand, so there is no path from this module to `eval` that skips
 * licensing. Every relation type the query traverses is admitted, and ALL must be licensed; the
 * question handed on is the first by sorted id, because `evaluate` reads `scope` off it and the
 * scope is one derivation shared by all of them.
 *
 * **The brand under-describes a text query, and `questions` is what says so out loud.**
 * `LicensedQuestion` names ONE relation type and a SPARQL query may traverse several, so the
 * certificate handed to `evaluate` describes the first by sorted id while the check it certifies ran
 * for every one. `evaluate` reads only `scope` off it, which is shared, so nothing is wrong — but a
 * caller re-asking this question elsewhere must gate all of them, and `questions` is the list that
 * lets it. §7.7 of the design doc recorded this as a finding; §8 records it as closed.
 */
export function translate(system: CanonicalSystem, text: string): Translation {
  try {
    const parsed = parseText(text);
    const walk = new SubsetWalk();
    const query = toAlgebra(walk, parsed);

    // Clause-level text faults first: the author can point at what offended. Only then the
    // query-level form, and only then anything about the model.
    const verdict = walk.verdict;
    if (verdict.kind === "outside-subset") {
      return { kind: "refused", refusal: outsideSubset(verdict.construct) };
    }

    // The substrate-absence rung, ahead of everything that resolves a name against the system.
    // `admit` runs it too, and this is not a second copy of the decision — one predicate, two call
    // sites, the arrangement `undeclaredVocabulary` already has. The site is needed because a SCOPED
    // query resolves its named graph in `deriveScope` BELOW, and over a system declaring no model
    // every graph IRI fails to resolve: the author of an empty `models:` section would be sent to
    // hunt a misspelled model name, which is the typo hunt this rung replaces. A text query's
    // subjects are always relational, so the type interrogated is the structural model.
    const absent = absentModelType(system, "graph");
    if (absent !== null) return { kind: "refused", refusal: absent };

    const vocabulary = new Vocabulary(system);
    const scope = deriveScope(vocabulary, query);
    const stranded = defaultGraphRelation(vocabulary, query);
    if (stranded !== null) {
      return {
        kind: "refused",
        refusal: outsideSubset(`relation type '${stranded}' in a default-graph pattern`,
          "the default graph holds no relation edge, so this triple matches nothing and empties " +
          "the whole join. Move it inside the GRAPH block, or add a dataset clause that promotes " +
          "the model's graph"),
      };
    }
    const subjects = deriveSubjects(vocabulary, system, query);
    if (subjects.length === 0) return { kind: "refused", refusal: noSubjectDeclared() };

    const questions: readonly RelationalQuestion[] = subjects.map(([relation, traversal]) => ({
      kind: "relational",
      relation,
      traversal,
      // SPARQL 1.1 has no path variables, so no text query can ask for a path witness: a SELECT's
      // rows ARE its evidence. The `path-witness` need belongs to the engine's own interface.
      evidence: "bindings",
      scope,
      subset: verdict,
    }));

    let licensed: LicensedQuestion | null = null;
    for (const question of questions) {
      const admission = admit(system, question);
      if (admission.kind === "refused") return { kind: "refused", refusal: admission.refusal };
      if (admission.kind === "routed") return { kind: "routed", route: admission.route };
      if (licensed === null) licensed = admission.question;
    }
    if (licensed === null) throw new Error("unreachable: a non-empty subject list admitted nothing");

    return { kind: "query", query, question: licensed, scope, questions };
  } catch (e) {
    if (e instanceof RefusalSignal) return { kind: "refused", refusal: e.refusal };
    throw e;
  }
}

/** Re-exported so a caller can read a solution's terms without reaching into `../rdf/`. */
export type { Term };

/**
 * The parse, with a syntax error converted to a structured refusal.
 *
 * A thrown parser exception is the one failure this layer must not propagate: §4 requires a refusal
 * to be an object naming what is missing. `outside-supported-subset` is the closest of the three
 * landed causes and the vocabulary is closed on purpose, so a syntax error is reported as a form the
 * subset does not accept, carrying the parser's own message as the detail.
 */
function parseText(text: string): Node {
  let parsed: unknown;
  try {
    parsed = new Parser().parse(text);
  } catch (e) {
    const message = e instanceof Error ? e.message.split("\n")[0] ?? e.message : String(e);
    return refuseNow("SPARQL syntax error", message);
  }
  const node = childNode(parsed, "query");
  if (stringField(node, "type") === "update") {
    return refuseNow("SPARQL Update",
      "this interface reads a projection of the IR; the IR is edited through the transaction engine");
  }
  return node;
}

/**
 * Ask a SPARQL question of the projected dataset: text in, solutions or a refusal out.
 *
 * The whole point of the layer, and the one function a caller needs. Licensing runs inside
 * `translate`, before `evaluate` is reached, and the brand on `LicensedQuestion` is what makes that
 * ordering structural rather than a convention this function happens to follow.
 *
 * **Four outcomes, and no two of them collapse.** Solutions, a structured refusal, an engine route,
 * and a spent budget. The fourth is the one with somewhere else to go, so it is the only one that
 * comes back with an escalation handle — see `SparqlOutcome`.
 */
export function answerSparql(
  system: CanonicalSystem,
  dataset: Dataset,
  text: string,
  budget: number = DEFAULT_STEP_BUDGET,
): SparqlOutcome {
  const translation = translate(system, text);
  if (translation.kind === "refused") {
    return { answer: { kind: "refused", refusal: translation.refusal }, escalation: null };
  }
  if (translation.kind === "routed") {
    return { answer: { kind: "routed", route: translation.route }, escalation: null };
  }
  const answer = evaluate(dataset, translation.query, translation.question, budget);
  return {
    answer,
    escalation: answer.kind === "exhausted"
      ? { spent: answer, questions: translation.questions, query: translation.query }
      : null,
  };
}
