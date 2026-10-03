/**
 * The SPARQL interface's seam: the licensing gate and the refusal vocabulary.
 *
 * Phase J layer 2 part 1. This is the part that must exist whatever evaluates queries, and it holds
 * the two things a raw SPARQL endpoint over the projection would lose (`DESIGN-sparql-261002.md` §2,
 * §4): the IR's authority over which questions are licensed, and a refusal that names what would
 * license the question.
 *
 * **The text path, added 261002 (WB-SPARQLJS).** `MEASUREMENT-comunica-261002.md` ruled Comunica out
 * on size and on a measured wrong answer, so `eval.ts` evaluates a typed query algebra
 * (`algebra.ts`) shaped like a `sparqljs` parse, and `parse.ts` walks real `sparqljs` output onto
 * it. `answerSparql` is the whole interface: text in, solutions or a structured refusal out. The
 * evaluator takes a `LicensedQuestion`, which only `admit` produces, so the gate has structurally
 * already run on every path that reaches evaluation.
 *
 * Dependencies point inward: `../ir/` for the IR, `../engine/` for the licensing predicate and the
 * refusal vocabulary this layer shares with it, and `../rdf/` for the terms the evaluator matches.
 * The gate itself imports no RDF terms; it decides from the IR, which is V32's whole content.
 */
export {
  admit, directionsOf, licensesTraversal, traversalOf,
  type Admission, type Directions, type EvidenceNeed, type LicensedQuestion, type QueryScope,
  type RelationalQuestion, type SeamQuestion, type SubsetVerdict, type Traversal,
} from "./licensing.ts";
export {
  asEngineRefusal, isSupported, noSubjectDeclared, outsideSubset, routeToEngine,
  SUPPORTED_CONSTRUCTS, unknownVocabulary, unlicensedByModel,
  type EngineRoute, type RefusalCause, type RouteReason, type SeamRefusal,
  type SupportedConstruct,
} from "./refusal.ts";
export {
  variable,
  type AggregateBinding, type Aggregate, type AskQuery, type ComparisonOp, type Expression,
  type GraphPattern, type OrderComparator, type PathNode, type PatternTerm, type PropertyPath,
  type QueryAlgebra, type SelectItem, type SelectQuery, type TriplePattern, type Variable,
} from "./algebra.ts";
export {
  DEFAULT_STEP_BUDGET, evaluate,
  type AskResult, type Bindings, type Evaluation, type ExhaustedResult, type RefusedResult,
  type SelectResult,
} from "./eval.ts";
export {
  answerSparql, translate,
  type Answer, type ExhaustedEscalation, type SparqlOutcome, type TranslatedQuery,
  type Translation,
} from "./parse.ts";
