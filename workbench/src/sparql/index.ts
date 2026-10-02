/**
 * The SPARQL interface's seam: the licensing gate and the refusal vocabulary.
 *
 * Phase J layer 2 part 1. This is the part that must exist whatever evaluates queries, and it holds
 * the two things a raw SPARQL endpoint over the projection would lose (`DESIGN-sparql-261002.md` §2,
 * §4): the IR's authority over which questions are licensed, and a refusal that names what would
 * license the question.
 *
 * **No parser, no evaluator, no SPARQL text.** `MEASUREMENT-comunica-261002.md` ruled Comunica out on
 * size and on a measured wrong answer, so we write the evaluator — which makes this seam the thing the
 * evaluator is built on rather than a wrapper around someone else's engine.
 *
 * Dependencies point inward: `../ir/` for the IR and `../engine/` for the licensing predicate and the
 * refusal vocabulary this layer shares with it. Nothing here imports RDF terms; the gate decides from
 * the IR, which is V32's whole content.
 */
export {
  admit, directionsOf, licensesTraversal, traversalOf,
  type Admission, type Directions, type EvidenceNeed, type LicensedQuestion, type QueryScope,
  type SeamQuestion, type SubsetVerdict, type Traversal,
} from "./licensing.ts";
export {
  asEngineRefusal, isSupported, outsideSubset, routeToEngine, SUPPORTED_CONSTRUCTS,
  unknownVocabulary, unlicensedByModel,
  type EngineRoute, type RefusalCause, type RouteReason, type SeamRefusal,
  type SupportedConstruct,
} from "./refusal.ts";
