/**
 * The renderer's public surface.
 *
 * `renderView` is the ONLY way to obtain a picture, and it returns `RenderedView` — the SVG and its
 * structured twin together. That is deliberate: FR-A11Y-2 makes the renderer a second view over the
 * same semantic state, never the primary one, so there is no export that yields a bare SVG string.
 *
 * `layoutScene` and `buildScene` are exported for layout-stability tests and for a caller that
 * needs positions without a picture (persisting view hints, hit-testing). Neither produces visual
 * output on its own.
 */
export { renderView, serialize, el } from "./svg.ts";
export { layoutScene, labelWidth, METRICS, LANE_PITCH } from "./layout.ts";
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
