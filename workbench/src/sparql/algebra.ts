/**
 * The typed query algebra — what a SPARQL parse produces, as types.
 *
 * `sparqljs` is the intended parser (`MEASUREMENT-comunica-261002.md` §7), and this wave cannot add
 * it: `package.json` belongs to another unit and `node_modules` is shared. So the algebra mirrors
 * the shape `sparqljs` emits — `where` is an array of patterns, `GRAPH` and `OPTIONAL` wrap arrays,
 * a property path sits in the predicate position — so the later text→algebra step renames nodes
 * rather than restructuring them. The mapping per node is recorded beside each type.
 *
 * **Every out-of-subset construct becomes an `unsupported` node, never a dropped one.** The
 * translator maps anything §11.1 does not accept (`UNION`, `MINUS`, `BIND`, `SERVICE`, a path
 * modifier we lack) onto a node that NAMES the construct, and the evaluator refuses that node.
 * Silently ignoring an unrecognized node is how Comunica returned a wrong answer instead of an
 * error (`MEASUREMENT-comunica-261002.md` §6); the algebra makes that failure unrepresentable by
 * giving ignorance a spelling.
 */
import type { Iri, Term } from "../rdf/terms.ts";

/** A query variable. `sparqljs` spells it as an RDF/JS variable term; the name has no `?`. */
export interface Variable {
  readonly kind: "variable";
  readonly name: string;
}

export const variable = (name: string): Variable => ({ kind: "variable", name });

/** A position in a triple pattern: a concrete term or a variable to bind. */
export type PatternTerm = Term | Variable;

/** A path operand: a bare predicate IRI, or a nested path. Matches `sparqljs`'s `items` entries. */
export type PathNode = Iri | PropertyPath;

/**
 * A SPARQL 1.1 property path, §11.1's subset: `^` `/` `|` `*` `+` `!`.
 *
 * `sparqljs` emits `{ type: "path", pathType, items }`; each arm below is one `pathType`.
 * `path-negated` holds forward predicates only — `!(^p)` and mixed sets are out of the subset, so
 * the translator emits `path-unsupported` for them rather than evaluating half of a negation.
 *
 * Alternation is the arm that earns its test: V8 encodes symmetry as `(rel|^rel)`, and dropping a
 * forward branch of exactly this node inside `GRAPH` is the measured defect that ruled Comunica out.
 */
export type PropertyPath =
  | { readonly kind: "path-inverse"; readonly path: PathNode }
  | { readonly kind: "path-sequence"; readonly paths: readonly PathNode[] }
  | { readonly kind: "path-alternative"; readonly paths: readonly PathNode[] }
  | { readonly kind: "path-zero-or-more"; readonly path: PathNode }
  | { readonly kind: "path-one-or-more"; readonly path: PathNode }
  | { readonly kind: "path-negated"; readonly forbidden: readonly Iri[] }
  | { readonly kind: "path-unsupported"; readonly construct: string };

export interface TriplePattern {
  /** Never a literal: RDF forbids literal subjects, so the type does too (as `Quad` does). */
  readonly subject: Iri | Variable;
  readonly predicate: Iri | Variable | PropertyPath;
  readonly object: PatternTerm;
}

/**
 * One node of a group graph pattern. `sparqljs`: `bgp`, `graph`, `group`, `optional`, `filter`.
 *
 * `unsupported` carries the construct name for the refusal. It is a first-class node, not an error
 * channel, so a translator meeting `MINUS` has somewhere lossless to put it.
 */
export type GraphPattern =
  | { readonly kind: "bgp"; readonly triples: readonly TriplePattern[] }
  | { readonly kind: "graph"; readonly name: Iri | Variable; readonly patterns: readonly GraphPattern[] }
  | { readonly kind: "group"; readonly patterns: readonly GraphPattern[] }
  | { readonly kind: "optional"; readonly patterns: readonly GraphPattern[] }
  | { readonly kind: "filter"; readonly expression: Expression }
  | { readonly kind: "unsupported"; readonly construct: string };

export type ComparisonOp = "=" | "!=" | "<" | "<=" | ">" | ">=";

/**
 * A `FILTER` expression: comparison, `BOUND`, `!`, `&&`, `||`. `sparqljs` spells these as
 * `{ type: "operation", operator, args }`; the arms name the operators the subset accepts.
 */
export type Expression =
  | { readonly kind: "term"; readonly term: PatternTerm }
  | { readonly kind: "comparison"; readonly op: ComparisonOp; readonly left: Expression; readonly right: Expression }
  | { readonly kind: "bound"; readonly variable: Variable }
  | { readonly kind: "not"; readonly expression: Expression }
  | { readonly kind: "and"; readonly left: Expression; readonly right: Expression }
  | { readonly kind: "or"; readonly left: Expression; readonly right: Expression }
  | { readonly kind: "expression-unsupported"; readonly construct: string };

/** The four aggregates §11.1 names. `of: null` is `COUNT(*)`; the other three need a variable. */
export type Aggregate =
  | { readonly op: "count"; readonly of: Variable | null }
  | { readonly op: "min" | "max" | "sum"; readonly of: Variable };

/** `(AGG(?x) AS ?name)` — `variable` is the `AS` name the result row binds. */
export interface AggregateBinding {
  readonly kind: "aggregate";
  readonly variable: Variable;
  readonly aggregate: Aggregate;
}

/** One projection entry: a plain variable or an aggregate binding. */
export type SelectItem = Variable | AggregateBinding;

export interface OrderComparator {
  readonly variable: Variable;
  readonly descending: boolean;
}

/**
 * Absent clauses are `null`, not optional: a field a caller can omit is a field a translator can
 * forget, and `exactOptionalPropertyTypes` makes the explicit spelling the cheap one.
 *
 * `from` is the dataset clause. The subset walker governs pattern constructs; `FROM` is dataset
 * SCOPING, and the evaluator supports it because the conformance oracle is stated as a
 * GRAPH-versus-FROM equivalence (`MEASUREMENT-comunica-261002.md` §6). No `FROM NAMED` in v0.1, so
 * a query with a dataset clause has no named graphs — SPARQL 1.1 §13.2: the clause describes the
 * whole dataset, not an addition to it.
 */
export interface SelectQuery {
  readonly kind: "select";
  readonly select: readonly SelectItem[];
  readonly from: readonly Iri[] | null;
  readonly where: readonly GraphPattern[];
  readonly groupBy: readonly Variable[] | null;
  readonly orderBy: readonly OrderComparator[] | null;
  readonly limit: number | null;
}

export interface AskQuery {
  readonly kind: "ask";
  readonly from: readonly Iri[] | null;
  readonly where: readonly GraphPattern[];
}

export type QueryAlgebra = SelectQuery | AskQuery;
