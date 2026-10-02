/**
 * The IRI scheme. One minting function per IR kind, and injectivity held by construction.
 *
 * Shape: `urn:mage:<kind>:<segment>:…`, with every segment percent-encoded.
 *
 * **Why a URN and not an `https://` namespace.** These IRIs name things, they do not locate
 * documents, and nothing in the workbench ever dereferences one. A URN says that in its scheme
 * instead of in a paragraph, and it avoids minting identifiers under a hostname whose owner could
 * later publish something else there. The cost is honest and small: the `mage` NID is not
 * registered with IANA, so a future registration could collide. Migrating is a one-constant edit,
 * because no IRI is written down anywhere but here.
 *
 * **Why injectivity is the property that matters.** Two distinct IR objects sharing one IRI merges
 * them in every downstream query, and nothing reports it — the result is simply wrong, quietly.
 * Three things hold it:
 *
 *  1. **A closed kind tag leads every IRI.** An entity named `idle` and a state named `idle` differ
 *     at the tag, so they cannot meet. `v` is reserved for the vocabulary and is not a kind.
 *  2. **Segments are percent-encoded, so no segment can contain the `:` separator.** An entity id
 *     `a:b` encodes to `a%3Ab`, which cannot be confused with two segments `a` and `b`.
 *     `encodeURIComponent` is injective — decoding recovers the input exactly — and it escapes
 *     `:`, `[` and `]`, the three characters MAGE ids actually hit.
 *  3. **Each kind has a fixed segment arity.** Equal IRIs therefore imply equal segment tuples,
 *     and so equal source objects.
 *
 * The one case where equal spellings are genuinely different things is a domain VALUE: YAML's
 * `public` and a quoted `"public"` are one string, but `5` and `"5"` are not. A scalar-type tag
 * sits in the domain-value IRI for exactly that reason — five separate defects in this project came
 * from YAML implicit typing, and a projection that let `5` and `"5"` name one resource would be the
 * sixth.
 */
import type { Scalar } from "../ir/types.ts";
import { iri, type Iri } from "./terms.ts";

/**
 * Every kind of resource the projection mints. Closed on purpose: adding a kind is a vocabulary
 * decision, documented in `RDF-VOCABULARY.md`, not an incidental string.
 */
export type ResourceKind =
  | "sys"
  | "ent"
  | "prop"
  | "rt"
  | "dom"
  | "domval"
  | "model"
  | "graph"
  | "mach"
  | "inst"
  | "state"
  | "var"
  | "deriv"
  | "trans"
  | "guard"
  | "effect"
  | "event"
  | "query"
  | "quant"
  | "dim";

export const RESOURCE_KINDS: readonly ResourceKind[] = [
  "sys", "ent", "prop", "rt", "dom", "domval", "model", "graph",
  "mach", "inst", "state", "var", "deriv", "trans", "guard", "effect",
  "event", "query", "quant", "dim",
];

export const URN_PREFIX = "urn:mage:";

/** The vocabulary's own tag. Kept out of `ResourceKind` so a model id can never reach it. */
export const VOCABULARY_TAG = "v";

const mint = (kind: ResourceKind, ...segments: readonly (string | number)[]): Iri =>
  iri(`${URN_PREFIX}${kind}:${segments.map((s) => encodeURIComponent(String(s))).join(":")}`);

/** A vocabulary term: `urn:mage:v:Entity`, `urn:mage:v:contains`. */
export const vocabularyIri = (term: string): Iri =>
  iri(`${URN_PREFIX}${VOCABULARY_TAG}:${encodeURIComponent(term)}`);

/**
 * Which JS type a scalar had. Part of a domain-value IRI, never of the datatype — the datatype is
 * the literal's job.
 */
const scalarTag = (v: Scalar): string =>
  typeof v === "string" ? "str" : typeof v === "boolean" ? "bool" : "num";

export const systemIri = (system: string): Iri => mint("sys", system);
export const entityIri = (system: string, id: string): Iri => mint("ent", system, id);
export const propertyIri = (system: string, key: string): Iri => mint("prop", system, key);
export const relationTypeIri = (system: string, id: string): Iri => mint("rt", system, id);
export const domainIri = (system: string, id: string): Iri => mint("dom", system, id);
export const modelIri = (system: string, id: string): Iri => mint("model", system, id);
export const machineIri = (system: string, id: string): Iri => mint("mach", system, id);
export const instanceIri = (system: string, id: string): Iri => mint("inst", system, id);
export const eventIri = (system: string, id: string): Iri => mint("event", system, id);
export const queryIri = (system: string, id: string): Iri => mint("query", system, id);
export const quantityIri = (system: string, id: string): Iri => mint("quant", system, id);

/**
 * A dimension, and the one kind carrying NO system segment.
 *
 * `duration` is MAGE's term, not an author's: it means the same thing in every system, its base unit
 * and its aggregation scope come from the dimension table rather than from any document, and no
 * author can declare a sixth. So two systems in one store share the resource, and a query over every
 * duration quantity in the store is a join rather than a union over system-local spellings.
 */
export const dimensionIri = (dimension: string): Iri => mint("dim", dimension);

/** The named graph a purposeful model's relations live in. Distinct from the model resource. */
export const modelGraphIri = (system: string, model: string): Iri => mint("graph", system, model);

export const domainValueIri = (system: string, domain: string, value: Scalar): Iri =>
  mint("domval", system, domain, scalarTag(value), String(value));

/** States, variables and derived values are MACHINE-scoped: two machines may both have `idle`. */
export const stateIri = (system: string, machine: string, state: string): Iri =>
  mint("state", system, machine, state);
export const variableIri = (system: string, machine: string, variable: string): Iri =>
  mint("var", system, machine, variable);
export const derivedIri = (system: string, machine: string, derived: string): Iri =>
  mint("deriv", system, machine, derived);

/**
 * A transition is addressed by its INDEX within its machine, which is the address the IR itself
 * uses: `delete-transition` names an index, and the hash treats a reorder as a different system.
 * Guards and effects hang off that index by position.
 */
export const transitionIri = (system: string, machine: string, index: number): Iri =>
  mint("trans", system, machine, index);
export const guardIri = (system: string, machine: string, transition: number, index: number): Iri =>
  mint("guard", system, machine, transition, index);
export const effectIri = (system: string, machine: string, transition: number, index: number): Iri =>
  mint("effect", system, machine, transition, index);
