/**
 * The renderer's public surface.
 *
 * `renderView` is the ONLY way to obtain a picture, and it returns `RenderedView` — the SVG and its
 * structured twin together. That is deliberate: FR-A11Y-2 makes the renderer a second view over the
 * same semantic state, never the primary one, so there is no export that yields a bare SVG string.
 *
 * `dagreLayoutEngine` and `buildScene` are exported for layout-stability tests and for a caller
 * that needs positions without a picture (persisting view hints, hit-testing). Neither produces
 * visual output on its own. `defaultLayoutEngine` names the one `renderView` uses when a caller
 * supplies none, so a test can assert WHICH engine ran rather than assuming.
 */
export { renderView, serialize, el } from "./svg.ts";
export type { RenderOptions } from "./svg.ts";
export { dagreLayoutEngine, defaultLayoutEngine } from "./layout-dagre.ts";
export {
  labelWidth,
  textExtent,
  METRICS,
  LANE_PITCH,
  TEXT_SIZES,
} from "./layout.ts";
export { assembleLayout, bounds, liftToOuter, place, sizes } from "./layout.ts";
export type { LayoutEngine, LiftedEdge, Placement, Size, TextClass } from "./layout.ts";
export { buildScene, buildGraphScene, buildMachineScene } from "./scene.ts";
export type { SceneGraph, SceneNode, SceneEdge } from "./scene.ts";
export {
  buildAccessibleScene,
  deriveEvidenceEmphasis,
  describeEvidence,
  evidenceEmphasisKind,
  presentableOutcome,
} from "./accessible.ts";
export { MARKS, MARK_MEANINGS, PLAIN_MARK } from "./types.ts";
export type {
  AccessibleEdge,
  AccessibleEvidence,
  AccessibleNode,
  AccessibleScene,
  AccessibleStep,
  Direction,
  EdgeKind,
  EmphasisAssignment,
  EmphasisKind,
  Layout,
  LayoutEdge,
  LayoutNode,
  ArrowForm,
  KeyEntry,
  LayoutOptions,
  LegendEntry,
  MarkStyle,
  NodeKind,
  Point,
  Rect,
  RenderedView,
  SceneRequest,
  SceneSubject,
  SvgNode,
} from "./types.ts";
