/**
 * `sparqljs` 3.7.4, declared locally and declared NARROW: `parse` returns `unknown`.
 *
 * DefinitelyTyped publishes `@types/sparqljs`, and taking it would be the wrong move here. Those
 * types state a CLOSED union of parse nodes, and a closed union teaches the compiler that an
 * unrecognized node is impossible — so the branch that refuses one looks like dead code and the
 * next reader deletes it. The whole defect this layer exists to prevent is a node nobody recognized
 * being skipped instead of refused (`MEASUREMENT-comunica-261002.md` §6). `unknown` makes the
 * walker earn every field it reads, which is the discipline the subset enforcement needs.
 *
 * It also decouples us from a grammar we do not control: a `sparqljs` release that emits a new node
 * shape changes nothing here, and `parse.ts` refuses the shape by name rather than mis-typing it.
 *
 * npm marks the package deprecated ("Package no longer supported"). It remains the parser Comunica
 * 5.4.1 itself depends on, it is 27 KB gzipped, and §7 ruled that re-authoring a SPARQL grammar is
 * not where this project spends its budget. Vendoring it later is a bounded job.
 */
declare module "sparqljs" {
  export interface ParserOptions {
    readonly prefixes?: Readonly<Record<string, string>>;
    readonly baseIRI?: string;
  }

  export interface SparqlParser {
    /** Throws on a syntax error. `parse.ts` converts the throw into a structured refusal. */
    parse(query: string): unknown;
  }

  export const Parser: new (options?: ParserOptions) => SparqlParser;
}
