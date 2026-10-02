/**
 * The RDF data model, cut down to what the projection needs: an IRI, a typed literal, a quad, a
 * dataset.
 *
 * Hand-written rather than imported from RDF/JS because `package.json` belongs to another unit this
 * wave, and because the surface is this small. A later phase that adopts Comunica can adapt these
 * four shapes to RDF/JS terms in one adapter; nothing here leaks into the IR.
 *
 * Two deliberate omissions.
 *
 * **No blank nodes.** A blank node carries no identity outside the document that mentions it, and
 * identity is the job RDF was brought in to do. Every resource the projection mints gets an IRI, so
 * a result row reads back in MAGE's own terms instead of as `_:b3`.
 *
 * **No language tags.** The IR has no natural-language channel — a label is a string, not a string
 * in a declared language — so a language tag would assert something the model never said.
 */

export interface Iri {
  readonly kind: "iri";
  readonly value: string;
}

export interface Literal {
  readonly kind: "literal";
  readonly value: string;
  /** Always present. A literal with no stated datatype is a value a consumer has to guess at. */
  readonly datatype: string;
}

export type Term = Iri | Literal;

/**
 * One quad. The subject and predicate are always IRIs; `graph: null` means the default graph.
 *
 * Literal subjects and predicates are illegal in RDF, so the types forbid them rather than leaving
 * a runtime check to be written and then forgotten.
 */
export interface Quad {
  readonly subject: Iri;
  readonly predicate: Iri;
  readonly object: Term;
  readonly graph: Iri | null;
}

/** A set of quads. Set, not list: `canonicalDataset` is what makes that true of a given array. */
export type Dataset = readonly Quad[];

export const XSD = {
  string: "http://www.w3.org/2001/XMLSchema#string",
  integer: "http://www.w3.org/2001/XMLSchema#integer",
  boolean: "http://www.w3.org/2001/XMLSchema#boolean",
  double: "http://www.w3.org/2001/XMLSchema#double",
} as const;

/**
 * `rdf:type`, the one term borrowed from outside MAGE's own vocabulary.
 *
 * Borrowing it is safe in a way `rdfs:subClassOf` would not be: `rdf:type` asserts membership and
 * nothing else, licenses no entailment on its own, and is what SPARQL's `a` keyword abbreviates. A
 * MAGE-local `mage:kind` would have bought nothing and cost every agent the shorthand.
 */
export const RDF_TYPE: Iri = { kind: "iri", value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" };

export const iri = (value: string): Iri => ({ kind: "iri", value });

export const str = (value: string): Literal => ({ kind: "literal", value, datatype: XSD.string });

export const bool = (value: boolean): Literal => ({
  kind: "literal",
  value: value ? "true" : "false",
  datatype: XSD.boolean,
});

/**
 * Canonical `xsd:double` lexical form: a mantissa with a fraction digit, `E`, a plain exponent.
 *
 * `String(1e21)` yields `1e+21`, which is not a legal `xsd:integer` and not canonical `xsd:double`.
 * Going through `toExponential` removes both problems.
 */
function doubleLexical(n: number): string {
  if (Number.isNaN(n)) return "NaN";
  if (n === Infinity) return "INF";
  if (n === -Infinity) return "-INF";
  const parts = n.toExponential().split("e");
  const mantissa = parts[0] ?? "0";
  const exponent = Number(parts[1] ?? "0");
  return `${mantissa.includes(".") ? mantissa : `${mantissa}.0`}E${exponent}`;
}

/**
 * A number, typed by what it is rather than by what it was declared as.
 *
 * A non-integer is not by itself a symptom. A quantity magnitude is legitimately real — a `ratio` of
 * `0.8`, or `128 KB` normalized to `0.125 MB` — while elsewhere in v0.1 the workbench forbids reals,
 * so a non-integer there is malformed input canonicalization passed through and the validator
 * reports. Either way `xsd:double` keeps the projection honest: a consumer must not be able to read
 * `2.5` back as `2`.
 */
export const numeric = (n: number): Literal =>
  Number.isSafeInteger(n)
    ? { kind: "literal", value: String(n), datatype: XSD.integer }
    : { kind: "literal", value: doubleLexical(n), datatype: XSD.double };

/** A MAGE scalar as a typed literal. A string that looks like a number stays a string. */
export const scalarTerm = (v: string | number | boolean): Literal =>
  typeof v === "string" ? str(v) : typeof v === "boolean" ? bool(v) : numeric(v);

/**
 * A total order key for a quad. JSON rather than a separator-joined template literal, for the
 * reason recorded in `canonicalize.ts`: a NUL separator makes the file binary to tooling and git's
 * own binary heuristic only inspects the first 8 KB.
 */
export const quadKey = (q: Quad): string =>
  JSON.stringify([
    q.graph?.value ?? "",
    q.subject.value,
    q.predicate.value,
    q.object.kind,
    q.object.value,
    q.object.kind === "literal" ? q.object.datatype : "",
  ]);

/**
 * Deduplicated and sorted — the canonical form of a quad array.
 *
 * An RDF dataset is a set, so the same fact asserted twice (a property key declared by two
 * entities, say) must appear once. Sorting on top of that is what makes the serialization
 * byte-identical across runs, which is what lets a downstream test pin anything at all.
 */
export function canonicalDataset(quads: Dataset): Dataset {
  const byKey = new Map<string, Quad>();
  for (const q of quads) byKey.set(quadKey(q), q);
  return [...byKey.keys()].sort().map((k) => byKey.get(k) as Quad);
}
