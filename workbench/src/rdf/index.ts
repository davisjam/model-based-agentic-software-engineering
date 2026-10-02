/**
 * The RDF projection layer: typed IR -> RDF dataset -> N-Quads.
 *
 * Read `RDF-VOCABULARY.md` for the IRI scheme, the term definitions and the named-graph rule. The
 * projection is downstream of the IR and upstream of SPARQL; it reads `CanonicalSystem` and nothing
 * else, and nothing in the kernel knows it exists.
 */
export { project, projectedGraphs } from "./project.ts";
export { escapeIri, escapeLiteral, serializeQuad, serializeTerm, toNQuads } from "./nquads.ts";
export { MAGE, MAGE_CLASSES } from "./vocabulary.ts";
export {
  RESOURCE_KINDS, URN_PREFIX, VOCABULARY_TAG,
  derivedIri, domainIri, domainValueIri, effectIri, entityIri, eventIri, guardIri, instanceIri,
  machineIri, modelGraphIri, modelIri, propertyIri, queryIri, relationTypeIri, stateIri, systemIri,
  transitionIri, variableIri, vocabularyIri,
  type ResourceKind,
} from "./iri.ts";
export {
  RDF_TYPE, XSD, bool, canonicalDataset, iri, numeric, quadKey, scalarTerm, str,
  type Dataset, type Iri, type Literal, type Quad, type Term,
} from "./terms.ts";
