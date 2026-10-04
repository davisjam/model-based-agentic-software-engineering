/**
 * Renderer types — geometry, visual emphasis, and the structured twin that FR-A11Y-2 requires.
 *
 * Two things about this file are load-bearing.
 *
 * 1. **The renderer is a SECOND view, never the primary one** (PLAN.md §1, §4.3). Every visual
 *    distinction declared here carries its non-visual equivalent in the same structure: a
 *    `MarkStyle` names the non-colour channels that encode it, and an `AccessibleScene` states the
 *    same facts as text and relations. Nothing reaches the SVG that does not reach the twin, which
 *    is why `RenderedView` holds both and `renderView` is the only way to obtain either.
 *
 * 2. **Colour is never the sole carrier.** `MarkStyle` deliberately has no colour field at all.
 *    Emphasis is distinguished by stroke weight, dash pattern, opacity and an ASCII marker glyph;
 *    the stylesheet may add hue on top, but removing every colour must lose no information.
 *
 * Positions live here; they are view metadata and never semantics (component model: the renderer
 * reads the IR and may not mutate it, and layout hints are not model data).
 */
import type {
  Coverage,
  Evidence,
  EvidenceRole,
  EvidenceShape,
  Outcome,
} from "../ir/types.ts";

// --------------------------------------------------------------------------------------------
// Geometry
// --------------------------------------------------------------------------------------------

/** Rank axis. `left-to-right` ranks along x and lanes along y; `top-to-bottom` is the transpose. */
export type Direction = "left-to-right" | "top-to-bottom";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * `entity` and `state` are leaf boxes. `region` is an entity that contains others: containment is
 * drawn as an enclosing region, so the parent is a frame rather than a box. The enclosure is
 * POSITIONAL, which is exactly why `AccessibleNode.contains` restates it (FR-A11Y-2).
 */
export type NodeKind = "entity" | "region" | "state";

export interface LayoutNode {
  readonly id: string;
  readonly kind: NodeKind;
  readonly label: string;
  readonly rect: Rect;
  readonly rank: number;
  /** Position within the rank, ascending along the lane axis. */
  readonly order: number;
  /** Containing entity id when this node is drawn inside a region. */
  readonly parent: string | null;
  /** The machine's initial state. Drawn with an initial marker AND stated in the twin. */
  readonly initial: boolean;
  /**
   * True iff this node's position came from a caller-supplied hint rather than fresh placement.
   * Incremental layout never moves a pinned node — that is what makes before/after comparable.
   */
  readonly pinned: boolean;
}

export type EdgeKind = "relation" | "transition" | "containment";

export interface LayoutEdge {
  readonly id: string;
  readonly kind: EdgeKind;
  readonly from: string;
  readonly to: string;
  readonly label: string | null;
  /** Relation type id for a relation, the `sync` event id for a synchronized transition. */
  readonly via: string | null;
  /** Points backwards along the rank axis; routed around the primary layout, not through it. */
  readonly backedge: boolean;
  readonly selfLoop: boolean;
  /** Polyline, already routed. Empty for containment, whose geometry IS the parent's region. */
  readonly points: readonly Point[];
  /**
   * Where this edge's text belongs, when it has text.
   *
   * The author's requirement is that text in the graph PARTICIPATES in layout rather than being
   * painted afterward where it can collide. A label drawn at the polyline's middle vertex is the
   * "afterward" case: two edges whose midpoints coincide paint two words at one point, which is
   * how `invokes` and `stage_of` came to share the coordinate (401.3, 45). So the engine reserves
   * a sized box for the label during layout and reports where it reserved it; the painter obeys
   * rather than guesses. Null when the edge carries no label, or when no engine claimed a spot.
   */
  readonly labelPoint: Point | null;
}

export interface Layout {
  readonly direction: Direction;
  readonly nodes: ReadonlyMap<string, LayoutNode>;
  readonly edges: readonly LayoutEdge[];
  readonly bounds: Rect;
  /** rank index -> node ids in lane order. Outer nodes only; region children are not ranked. */
  readonly ranks: readonly (readonly string[])[];
}

// --------------------------------------------------------------------------------------------
// Emphasis
// --------------------------------------------------------------------------------------------

/**
 * The closed vocabulary of visual treatments. Closed on purpose: a new treatment must declare its
 * non-colour channels in `MARKS` and its meaning in the legend, so it cannot be added as hue alone.
 *
 * `evidence-inconclusive` exists because of V22. Evidence gathered under bounded coverage must not
 * be presented with the same force as evidence under exhaustive coverage, and must never read as
 * `refuted`.
 */
export type EmphasisKind =
  | "selected"
  | "evidence"
  | "evidence-inconclusive"
  | "violation"
  | "added"
  | "removed"
  | "changed"
  | "deemphasized";

export interface EmphasisAssignment {
  /** A node id or an edge id. */
  readonly target: string;
  readonly kind: EmphasisKind;
  /** Why this treatment applies, in words. The non-visual twin of the visual channel. */
  readonly reason: string;
  /** 1-based position in an ordered witness; null when the emphasis is not ordered. */
  readonly step: number | null;
}

/**
 * How an emphasis is carried WITHOUT colour. There is no colour field: a stylesheet may add hue,
 * but every kind must already be distinguishable from every other by the fields below.
 */
export interface MarkStyle {
  readonly strokeWidth: number;
  /** SVG dash pattern, or null for a solid stroke. */
  readonly dashArray: string | null;
  /**
   * A short ASCII marker drawn adjacent to the shape. ASCII keeps the artifact self-contained:
   * a dingbat would depend on a font we are not allowed to fetch.
   */
  readonly glyph: string | null;
  readonly opacity: number;
  /** Stable class name, so a stylesheet can add colour as a redundant extra channel. */
  readonly className: string;
}

/** The unemphasized baseline. Named so `MARKS` can be compared against it in a test. */
export const PLAIN_MARK: MarkStyle = {
  strokeWidth: 1.5,
  dashArray: null,
  glyph: null,
  opacity: 1,
  className: "mage-plain",
};

/**
 * Non-colour channels per emphasis kind. Every entry differs from every other entry, and from
 * `PLAIN_MARK`, in at least one of strokeWidth / dashArray / glyph / opacity — pinned by
 * `render-svg.test.ts` so a later edit cannot quietly collapse two treatments onto hue.
 *
 * `evidence` has no fixed glyph: its marker is the step NUMBER, which is also the join key to the
 * textual step list. A witness trace is a list of steps before it is a highlighted path.
 */
export const MARKS: Readonly<Record<EmphasisKind, MarkStyle>> = {
  selected: { strokeWidth: 3.5, dashArray: null, glyph: "*", opacity: 1, className: "mage-selected" },
  evidence: { strokeWidth: 3, dashArray: null, glyph: null, opacity: 1, className: "mage-evidence" },
  "evidence-inconclusive": {
    strokeWidth: 3,
    dashArray: "7 4",
    glyph: "?",
    opacity: 1,
    className: "mage-evidence-inconclusive",
  },
  violation: { strokeWidth: 4, dashArray: "2 3", glyph: "!", opacity: 1, className: "mage-violation" },
  added: { strokeWidth: 2.5, dashArray: "1 3", glyph: "+", opacity: 1, className: "mage-added" },
  removed: { strokeWidth: 2.5, dashArray: "6 3", glyph: "-", opacity: 0.75, className: "mage-removed" },
  changed: { strokeWidth: 2.5, dashArray: "9 3 2 3", glyph: "~", opacity: 1, className: "mage-changed" },
  deemphasized: { strokeWidth: 1, dashArray: null, glyph: null, opacity: 0.35, className: "mage-deemphasized" },
};

/**
 * Arrowhead forms in assignment order. A diagram's relation types take them in sorted-type order,
 * so the same model always gets the same mapping and two diagrams of the same model agree.
 *
 * Four, deliberately. The maximum relation-type count in any shipped diagram is four, and a fifth
 * form would have to be either a colour (banned as a sole channel) or a shape too close to one of
 * these to tell apart at an arrowhead's size. A diagram with five relation types should be told it
 * has outgrown one picture rather than handed an unreadable key.
 */
export const ARROW_FORMS: readonly ArrowForm[] = ["triangle", "open", "diamond", "square"];

/**
 * Relation-type stroke classes, paired positionally with `ARROW_FORMS`. The hues behind them are
 * the Okabe–Ito subset that clears 3:1 against the figure ground, so the colour is a usable extra
 * channel rather than a decorative one — but the arrowhead carries the same fact, and removing
 * every hue loses nothing.
 */
export const RELATION_CLASSES: readonly string[] = ["mage-rel-a", "mage-rel-b", "mage-rel-c", "mage-rel-d"];

/**
 * What each node outline means. Closed, because `NodeKind` is closed.
 *
 * **Kept SHORT on purpose.** A key row is drawn inside the diagram's own viewBox, so the longest
 * meaning sets the canvas width — and a sentence long enough to be thorough made a 445-unit
 * teaching diagram 561 units wide, shrinking the picture inside a fixed reading column to make
 * room for prose about itself. The row names the thing; the structured twin's key list is where the
 * fuller sentence goes, and it has no width to spend.
 */
export const SHAPE_MEANINGS: Readonly<Record<NodeKind, string>> = {
  entity: "entity (a service or component)",
  region: "entity containing those drawn inside it",
  state: "one control state of a machine",
};

/** Human-readable meaning per kind. Rendered as a legend AND carried in the twin. */
export const MARK_MEANINGS: Readonly<Record<EmphasisKind, string>> = {
  selected: "currently selected",
  evidence: "part of the evidence for the current result",
  "evidence-inconclusive":
    "part of the evidence for an inconclusive result: coverage was bounded, so absence proves nothing",
  violation: "part of a counterexample: this is where the claim fails",
  added: "present in the hypothesis but not in the current model",
  removed: "present in the current model but not in the hypothesis",
  changed: "present in both, but altered by the hypothesis",
  deemphasized: "outside the current focus; shown for context only",
};

// --------------------------------------------------------------------------------------------
// The structured twin (FR-A11Y-2)
// --------------------------------------------------------------------------------------------

export type SceneSubjectKind = "model" | "machine";

export interface AccessibleProperty {
  readonly name: string;
  readonly value: string;
  readonly domain: string | null;
}

export interface AccessibleNode {
  readonly id: string;
  readonly label: string;
  readonly kind: NodeKind;
  readonly role: "entity" | "state";
  readonly entityType: string | null;
  readonly parent: string | null;
  /** Containment restated as a relation, because the enclosing region is positional. */
  readonly contains: readonly string[];
  readonly properties: readonly AccessibleProperty[];
  readonly initial: boolean;
  readonly emphasis: readonly EmphasisAssignment[];
  /** Reading order over the whole scene: rank then lane. Order is a convenience, never meaning. */
  readonly readingIndex: number;
  readonly rank: number;
  /** One sentence, already assembled so a screen reader does not depend on the UI's phrasing. */
  readonly description: string;
}

export interface AccessibleEdge {
  readonly id: string;
  readonly kind: EdgeKind;
  readonly from: string;
  readonly to: string;
  readonly fromLabel: string;
  readonly toLabel: string;
  readonly via: string | null;
  readonly label: string | null;
  readonly backedge: boolean;
  readonly emphasis: readonly EmphasisAssignment[];
  readonly description: string;
}

/** One step of a witness, as a list item. The coloured path is the derivative, not the source. */
export interface AccessibleStep {
  readonly index: number;
  readonly instances: readonly string[];
  readonly sync: string | null;
  readonly label: string | null;
  /** `document: waiting -> processing`, `retry_count: 0 -> 1`. Only what actually changed. */
  readonly changes: readonly string[];
  readonly inCycle: boolean;
  readonly description: string;
}

export interface AccessibleEvidence {
  readonly shape: EvidenceShape;
  readonly role: EvidenceRole;
  readonly steps: readonly AccessibleStep[];
  /** 1-based index at which the repeating suffix begins; non-null iff shape is "lasso". */
  readonly cycleStartIndex: number | null;
  readonly nodes: readonly string[] | null;
  readonly description: string;
}

export interface LegendEntry {
  readonly kind: EmphasisKind;
  readonly glyph: string | null;
  readonly strokeWidth: number;
  readonly dashArray: string | null;
  readonly meaning: string;
}

/**
 * The closed set of arrowhead forms. A relation type's identity is carried by stroke hue AND by
 * arrowhead shape, so the mapping survives greyscale and the common colour-vision deficiencies —
 * the ruling's "do not rely on colour alone where ambiguity matters: keep shape, line style, or
 * arrow form". Four forms, because the maximum relation-type count in any shipped diagram is four.
 */
export type ArrowForm = "triangle" | "open" | "diamond" | "square";

/**
 * One row of the diagram's VOCABULARY key — what a shape or an arrow means.
 *
 * Deliberately NOT merged into `LegendEntry`. The two keys answer different questions and have
 * different lifetimes: `legend` explains the EMPHASIS treatments a particular query produced and is
 * empty until something is emphasised, while `key` explains the diagram's standing visual
 * vocabulary and is present whenever the diagram has shapes and arrows in it. Collapsing them would
 * make "the legend appears only under emphasis" false, which is a property the a11y tier relies on
 * to prove a picker's change reached its render.
 *
 * This is also where the repeated edge text went. `may_propagate_to` written on all six edges of a
 * diagram is a type label restated six times; one row here says it once.
 */
export interface KeyEntry {
  readonly channel: "relation" | "shape";
  /** The relation type id, or the `NodeKind` whose outline this row explains. */
  readonly id: string;
  /** What a reader sees: the arrowhead form for a relation, the outline for a shape. */
  readonly form: ArrowForm | NodeKind;
  /** Stable class name, so the stylesheet can add hue as a redundant extra channel. */
  readonly className: string;
  readonly meaning: string;
}

/**
 * The equivalent accessible representation of everything the SVG shows. Not a summary of the
 * picture: the same facts, from the same source, assembled by the component that knows what it
 * drew and why.
 */
export interface AccessibleScene {
  readonly title: string;
  readonly summary: string;
  readonly subject: { readonly kind: SceneSubjectKind; readonly id: string };
  /**
   * The canonical hash of the system this view depicts. A view outliving its model is the same
   * failure mode `QueryResult.systemHash` exists to prevent, so the view carries it too.
   */
  readonly systemHash: string;
  readonly direction: Direction;
  readonly nodes: readonly AccessibleNode[];
  readonly edges: readonly AccessibleEdge[];
  readonly evidence: AccessibleEvidence | null;
  readonly outcome: Outcome | null;
  readonly coverage: Coverage | null;
  readonly refusal: string | null;
  readonly legend: readonly LegendEntry[];
  /**
   * The visual vocabulary, stated rather than only drawn. A sighted reader learns "a rounded box is
   * a control state" from the picture; this is the same fact for a reader who does not get the
   * picture, which is the whole of FR-A11Y-2's claim on the legend.
   */
  readonly key: readonly KeyEntry[];
}

// --------------------------------------------------------------------------------------------
// SVG as data
// --------------------------------------------------------------------------------------------

/**
 * A serializable element tree. The renderer never touches `document`: it runs in a Worker, in
 * `node:test`, and in the page, and only the page has a DOM. Tests assert over the tree; the page
 * gets the string.
 */
export interface SvgNode {
  readonly tag: string;
  readonly attrs: Readonly<Record<string, string | number>>;
  readonly text: string | null;
  readonly children: readonly SvgNode[];
}

/**
 * The renderer's only output type.
 *
 * There is deliberately no exported function that returns a bare SVG string. FR-A11Y-2 says a fact
 * reaching the SVG without reaching a structured representation is a defect; making the twin a
 * required field of the single return type makes that defect unreachable rather than reviewable.
 */
export interface RenderedView {
  readonly svg: string;
  readonly tree: SvgNode;
  readonly accessible: AccessibleScene;
  readonly layout: Layout;
  /**
   * Node id -> top-left corner, which is exactly the shape `LayoutOptions.hints` accepts. This is
   * the round-trip: persist it with the view, hand it back on the next render, and every node that
   * still exists keeps its position. It is also how an EXTERNAL layout engine integrates — a cold
   * layout computed elsewhere is just a complete hint set.
   *
   * Region children appear here (a caller hit-testing wants them) but are ignored on the way back
   * in: their geometry is derived from the enclosing region, so pinning the region pins them.
   */
  readonly positions: ReadonlyMap<string, Point>;
}

// --------------------------------------------------------------------------------------------
// Request
// --------------------------------------------------------------------------------------------

export type SceneSubject =
  | { readonly kind: "model"; readonly id: string }
  | { readonly kind: "machine"; readonly id: string };

export interface LayoutOptions {
  readonly direction?: Direction | undefined;
  /**
   * Existing node positions, treated as STRONG hints: a hinted node is placed exactly there and
   * never moved, and new nodes are fitted around it. PLAN.md §4.1 makes this an acceptance
   * criterion — the core interaction is comparing a model against a hypothetical variant, and that
   * comparison is unreadable if one added state re-ranks the world.
   */
  readonly hints?: ReadonlyMap<string, Point> | undefined;
}

export interface SceneRequest extends LayoutOptions {
  readonly subject: SceneSubject;
  readonly selection?: readonly string[] | undefined;
  /** Caller-supplied treatments, e.g. a hypothesis diff. Merged with evidence-derived ones. */
  readonly emphasis?: readonly EmphasisAssignment[] | undefined;
  readonly evidence?: Evidence | null | undefined;
  readonly outcome?: Outcome | null | undefined;
  readonly coverage?: Coverage | null | undefined;
  readonly refusal?: string | null | undefined;
  /** Entity property names to surface. Values always also appear in the twin. */
  readonly showProperties?: readonly string[] | undefined;
}
