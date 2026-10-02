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
import type { RenderedView, SceneRequest } from "../render/types.ts";

/**
 * Re-exported so a port consumer still has one import site for the whole contract surface, now
 * that the rendering contract is the renderer's own rather than a placeholder declared here.
 */
export type { RenderedView, SceneRequest };

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
 *
 * **This port now speaks the renderer's own types rather than a pair declared here.** It used to
 * declare `RenderOptions` with `target: string` ("the renderer decides by looking it up") and a
 * reduced `AccessibleView`. Phase E landed a tagged `SceneSubject` — because a model and a machine
 * may share an id, so resolving a bare string is a guess — and an `AccessibleScene` carrying the
 * evidence steps, the legend and the system hash that the reduced shape had nowhere to put. Two
 * declarations of one contract is the second source of truth every other part of this project
 * removes on sight, and the narrower one was the one that would have silently thrown away the
 * accessible twin's substance on the way to the UI.
 */
export interface RenderPort {
  render(system: CanonicalSystem, request: SceneRequest): RenderedView;
}
