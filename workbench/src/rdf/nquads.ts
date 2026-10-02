/**
 * N-Quads serialization, hand-written.
 *
 * The format is line-oriented and tiny — `<s> <p> <o> <g> .` per line, UTF-8, no prefixes — so
 * writing it costs less than taking a dependency, and `package.json` is another unit's file this
 * wave. The escaping is the only part with teeth, and it has its own tests.
 *
 * Three choices worth stating:
 *
 * **Canonicalize on the way out.** The serializer deduplicates and sorts rather than trusting its
 * caller to have done it. Determinism is then a property of this function, not a promise somewhere
 * else, and byte-identical output is what lets a downstream test pin anything.
 *
 * **A plain quoted literal means `xsd:string`.** RDF 1.1 says so, and emitting `^^<…#string>` on
 * every label would add a third of the bytes to say nothing. Every other datatype is written out.
 *
 * **Non-ASCII goes out raw.** N-Quads is UTF-8 and an IRIREF admits non-ASCII directly, so escaping
 * `é` to `é` would only make the output harder to read. Escapes are reserved for characters
 * that would break the grammar: the quote, the backslash, and anything non-printing.
 */
import { canonicalDataset, XSD, type Dataset, type Quad, type Term } from "./terms.ts";

/** The ECHAR escapes N-Quads defines. `\'` exists in the grammar but a double-quoted literal never needs it. */
const ECHARS: Readonly<Record<string, string>> = {
  "\\": "\\\\",
  "\"": "\\\"",
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
  "\b": "\\b",
  "\f": "\\f",
};

/** Characters an IRIREF cannot contain. Everything at or below 0x20 is excluded separately. */
const IRI_FORBIDDEN = "<>\"{}|^`\\";

const uchar = (codePoint: number): string =>
  codePoint <= 0xffff
    ? `\\u${codePoint.toString(16).toUpperCase().padStart(4, "0")}`
    : `\\U${codePoint.toString(16).toUpperCase().padStart(8, "0")}`;

/**
 * Escape a literal's body.
 *
 * Iteration is by code POINT, so an astral character is never split into lone surrogates — which is
 * the bug that makes an emoji in a label come back as two replacement characters. DEL is escaped
 * along with the C0 controls: a dump a human reads should contain no non-printing byte.
 */
export function escapeLiteral(text: string): string {
  let out = "";
  for (const ch of text) {
    const echar = ECHARS[ch];
    if (echar !== undefined) {
      out += echar;
      continue;
    }
    const cp = ch.codePointAt(0) ?? 0;
    out += cp < 0x20 || cp === 0x7f ? uchar(cp) : ch;
  }
  return out;
}

/**
 * Escape an IRI for `<…>`.
 *
 * The minting functions percent-encode every segment, so nothing they produce reaches an escape
 * here. It exists because a serializer that is total only for its own producer's output is a trap
 * for the next caller.
 */
export function escapeIri(value: string): string {
  let out = "";
  for (const ch of value) {
    const cp = ch.codePointAt(0) ?? 0;
    out += cp <= 0x20 || IRI_FORBIDDEN.includes(ch) ? uchar(cp) : ch;
  }
  return out;
}

export function serializeTerm(term: Term): string {
  if (term.kind === "iri") return `<${escapeIri(term.value)}>`;
  const body = `"${escapeLiteral(term.value)}"`;
  return term.datatype === XSD.string ? body : `${body}^^<${escapeIri(term.datatype)}>`;
}

export const serializeQuad = (q: Quad): string =>
  [
    serializeTerm(q.subject),
    serializeTerm(q.predicate),
    serializeTerm(q.object),
    ...(q.graph === null ? [] : [serializeTerm(q.graph)]),
    ".",
  ].join(" ");

/** The whole dataset, one quad per line, newline-terminated. Empty in, empty string out. */
export const toNQuads = (dataset: Dataset): string =>
  canonicalDataset(dataset).map((q) => `${serializeQuad(q)}\n`).join("");
