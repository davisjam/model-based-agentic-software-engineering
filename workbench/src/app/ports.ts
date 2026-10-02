/**
 * Ports — the contracts the parallel phases satisfy.
 *
 * Declared here, by the orchestrator, BEFORE the implementations land, so the UI and the agent API
 * can be written against a fixed shape rather than against whatever three agents happened to
 * produce. Each port is deliberately minimal: the smallest surface the facade needs, so an
 * implementation has room to be good behind it.
 *
 * This file is the one place an interface mismatch between phases shows up as a type error instead
 * of as a runtime surprise during integration.
 */
import type {
  CanonicalSystem, Configuration, Finding, QueryResult,
} from "../ir/types.ts";

/** Phase C — the analysis engine. Consumes canonical IR only; never YAML, never the DOM. */
export interface EnginePort {
  /** Graph forms. A multi-hop form over a `composition.path: forbidden` type returns `unlicensed`. */
  graphQuery(system: CanonicalSystem, query: unknown): QueryResult;
  /** Behavioural forms over the configuration space, honouring a state limit. */
  behaviorQuery(system: CanonicalSystem, query: unknown, limit?: number): QueryResult;
  /** Reachable configurations, for callers that need the space itself rather than an answer. */
  explore(system: CanonicalSystem, limit?: number): {
    readonly configurations: readonly Configuration[];
    readonly exhaustive: boolean;
  };
}

/** Phase D — the concrete-syntax boundary. The only component that knows YAML exists. */
export interface YamlPort {
  /** Text -> loaded document. Throws only on syntax; semantic problems are the validator's. */
  parse(text: string): unknown;
  /**
   * Loaded document -> text, preserving comments and key order. Takes the ORIGINAL text so the
   * concrete syntax tree is available: a format advertised as hand-edited cannot discard its own
   * annotations on write.
   */
  serialize(doc: unknown, originalText: string | null): string;
}

/** Phase D — transactions. The only path by which the authoritative system changes. */
export interface TransactionPort {
  /**
   * parse -> verify base -> apply to a copy -> validate the WHOLE system -> commit.
   * On any failure the returned `system` is the one passed in, unchanged.
   */
  apply(system: CanonicalSystem, transaction: unknown): {
    readonly ok: boolean;
    readonly system: CanonicalSystem;
    readonly findings: readonly Finding[];
  };
}

/**
 * Phase E — rendering. Note the shape: a caller cannot obtain the SVG without the structured
 * representation of the same facts. That is FR-A11Y-2 made structural rather than remembered.
 */
export interface RenderPort {
  render(system: CanonicalSystem, options: RenderOptions): RenderedView;
}

export interface RenderOptions {
  /** Graph model id, or machine id — the renderer decides by looking it up. */
  readonly target: string;
  readonly selection: readonly string[];
  /** Ids to emphasise as evidence (a witness path, a counterexample's states). */
  readonly evidence: readonly string[];
  /** Previous positions, honoured as strong hints so a one-node change perturbs locally. */
  readonly positionHints: ReadonlyMap<string, { readonly x: number; readonly y: number }>;
}

export interface RenderedView {
  readonly svg: string;
  /** The same facts, non-visually. Never optional, never derived by the caller. */
  readonly accessible: AccessibleView;
  readonly positions: ReadonlyMap<string, { readonly x: number; readonly y: number }>;
}

/**
 * The accessible twin of a rendered view (FR-A11Y-2).
 *
 * Every visual distinction the renderer makes appears here as text or structure. A witness trace is
 * a list of steps before it is a coloured path; a violation is a labelled status before it is a red
 * stroke. The UI renders this into real DOM — headings, lists, a table — so the model is navigable
 * and editable with no canvas involved.
 */
export interface AccessibleView {
  readonly title: string;
  /** One row per node: what it is, what it contains, how it relates. */
  readonly nodes: readonly AccessibleNode[];
  readonly edges: readonly AccessibleEdge[];
  /** Plain-language summary a screen reader can take in before the detail. */
  readonly summary: string;
}

export interface AccessibleNode {
  readonly id: string;
  readonly label: string;
  readonly kind: string;
  readonly parent: string | null;
  /** "selected", "evidence", "initial", "violation" — never conveyed by colour alone. */
  readonly states: readonly string[];
  readonly properties: readonly { readonly name: string; readonly value: string }[];
}

export interface AccessibleEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: string;
  readonly label: string | null;
  readonly states: readonly string[];
}
