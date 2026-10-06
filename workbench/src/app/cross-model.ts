/**
 * The multi-model canvas: N rendered panels, and the connections between them DERIVED from
 * `BINDINGS` and `COMPOSITIONS`.
 *
 * ## What this module is for
 *
 * `DESIGN-render-rules-261004.md` §C graded V-RENDER's third clause — *"cross-model visual
 * connections correspond only to registered bindings or compositions"* — **vacuous**: the workspace
 * drew one subject at a time (`src/ui/shell/workspace.ts`), so the clause ranged over nothing. §E
 * then stated the one construction that converts it, and drew the distinction this module is built
 * on: the gap between *checked against* and **drawn from**.
 *
 *   - *Checked against* means the canvas computes its edges some way and a test compares the result
 *     to the registry. That test goes green while a second, unregistered edge path sits live and
 *     unexercised — which is the failure §A.6 measured in the scene extractor, where two synthesis
 *     paths ship untouched by any shipped example.
 *   - *Drawn from* means the canvas has no other input. `connectionsOf` enumerates registry rows and
 *     emits at most one connection per row. There is no branch that produces a connection from
 *     anything else, and no exported way to construct a `CrossModelConnection`, so an unregistered
 *     line is unrepresentable rather than merely untested.
 *
 * The label follows from the same place. §23.2 is explicit — *"do not teach students that every
 * line between two models is a join"* — and `connectionLabel` is why that holds here: the two
 * prefixes are an exhaustive switch over which registry the entry came from, so `bound by:` and
 * `composed by:` are a LOOKUP. No field on any type below holds a label, which leaves nowhere to
 * write the wrong one.
 *
 * ## Why the composition lives in this component and not in the renderer
 *
 * Forced, not chosen. `test/import-graph.test.ts` holds the declared `depends-on` edge set against
 * every import in `src/`, in both directions, and there is no `renderer → query-engine` edge; a
 * renderer that read `BINDINGS` would create one, and declaring it would invert the layering.
 * `app-services` is the only component declaring edges to BOTH the renderer (`app-rend`) and the
 * engine (`app-qe`), so it is the one place licensed to see a registry row and a rendered view at
 * once. `DESIGN-render-rules-261004.md` §B.2 works that through.
 *
 * The consequence worth naming: the panels are produced by `src/render/`, and this module composes
 * them. It re-renders nothing. Each panel's own picture comes back from `renderView` untouched,
 * which is what §23.3's rule asks for — *"each side is rendered by its own model-type renderer"* —
 * and the frames below are what keeps the other half, *"do not flatten both models into one
 * graph."*
 *
 * ## Rendering is a projection here too
 *
 * Nothing in this module reads or writes a semantic fact. It reads `BINDINGS`, `COMPOSITIONS`, the
 * IR's own correspondence sites, and the geometry the renderer already returned; it produces an
 * SVG, a twin, and a classification of every registry row. A connection it cannot draw is reported
 * as `notDrawn` with a REASON DERIVED from the registry or from the construct table — never
 * silently dropped, because a correspondence nobody drew and a correspondence nobody declared must
 * not look alike (the argument `SemanticBasis`'s extension arm makes, one field over).
 */
import { systemHash } from "../ir/hash.ts";
import { EXECUTES_IN_STATE } from "../ir/types.ts";
import type { CanonicalSystem } from "../ir/types.ts";
import {
  BINDINGS, COMPOSITIONS, MODEL_TYPES,
  type BindingSemantics, type CompositionSemantics, type Correspondence,
  type ModelType, type ModelTypeId, type QueryNoun, type SchemaAuthority,
} from "../engine/model-types.ts";
import { el, serialize, textExtent } from "../render/index.ts";
import type {
  AccessibleScene, Point, Rect, RenderedView, SceneRequest, SceneSubject, SvgNode,
} from "../render/index.ts";
import { sceneConstructFor, type SceneConstruct } from "./render-strategy.ts";

export type { SceneConstruct };

// --------------------------------------------------------------------------------------------
// The one relation between a model TYPE and a scene subject
// --------------------------------------------------------------------------------------------

/**
 * Which model types draw as a node-link scene on this canvas — **derived, not restated.**
 *
 * **This table used to be the relation `DESIGN-render-rules-261004.md` §A.2 found missing**, and
 * declaring it here was the right move while it was the only one. It is no longer: the relation
 * lives on the registry as `ModelType.renderStrategy`, a required field the compiler enforces, and
 * every value below is a function of it. The keys stay written out so the `Record` keeps its
 * compile-time totality in both directions — a new `ModelTypeId` must be added here, and a key for
 * a type that does not exist fails — but no row carries prose this file wrote.
 *
 * **The drift this closes was live, not hypothetical.** The quantitative row used to say a
 * quantitative model *"is not an addressable construct in v0.1"* and that there is *"no
 * quantitative subject for a picture to be a picture of."* `CanonQuantitativeModel` had already
 * made both false, and the Learn page was already drawing that picture — so two surfaces disagreed
 * about whether a registered model type had a projection, each with its own confident reason, and
 * nothing could fail. That is the cost of stating one fact in two places, and the reason this one
 * is now read rather than written.
 *
 * The canvas's own question is unchanged and still answered: a budget has no node for a line to end
 * on, so a composition into the quantitative domain still reports `domain-has-no-scene`. What moved
 * is where that sentence comes from.
 */
export const SCENE_CONSTRUCTS: Readonly<Record<ModelTypeId, SceneConstruct>> = {
  "structural-graph": sceneConstructFor("structural-graph"),
  "state-machine": sceneConstructFor("state-machine"),
  "quantitative-model": sceneConstructFor("quantitative-model"),
};

/**
 * Where a correspondence noun anchors in a panel: on the panel itself, or on one of its elements.
 *
 * `Correspondence`'s own doc comment sanctions this dispatch — *"a reader (or a facade switching
 * exhaustively on `QueryNoun`) can tell them apart from these two fields alone"* — and this module
 * is that facade. The split falls out of what a scene IS: a panel's subject is a model or a machine,
 * and its nodes are entities or states. So `machine-of-entity` runs from a PANEL (the behavioural
 * model) to an ELEMENT (the entity box), which is exactly the figure §23.3 draws.
 *
 * `null` means no anchor rule, which is the mechanism by which a new binding over a new noun pair
 * goes red rather than quietly drawing nothing: `test/cross-model.test.ts` asserts no registered
 * entry's correspondence reaches a `null`. Total over `QueryNoun` by `Record`, so a new noun must
 * answer here.
 */
export type AnchorKind = "panel" | "element";

/**
 * Exported for the obligation test, not for a caller to dispatch on: `test/cross-model.test.ts`
 * walks `BINDINGS` against this table and against `witnessOf`, so a binding over a noun pair
 * neither answers is a red gate rather than a quiet absence.
 */
export const ANCHOR_BY_NOUN: Readonly<Record<QueryNoun, AnchorKind | null>> = {
  entity: "element",
  state: "element",
  model: "panel",
  machine: "panel",
  // A relation type is the diagram's vocabulary rather than a drawn element; a variable and a
  // transition are drawn, but no registered correspondence names either, so inventing an anchor
  // rule now would be a drawing nobody asked for. An execution, a quantity and a ceiling have no
  // scene at all, for the reason `SCENE_CONSTRUCTS`'s `none` arm gives.
  "relation type": null,
  variable: null,
  transition: null,
  execution: null,
  quantity: null,
  ceiling: null,
};

// --------------------------------------------------------------------------------------------
// The request, and the panels
// --------------------------------------------------------------------------------------------

/** One requested panel, named in the vocabulary the author asks in: a model TYPE and a construct id. */
export interface CrossModelPanelRequest {
  readonly type: ModelTypeId;
  /** The id of the IR construct — the model or the machine the panel shows. */
  readonly id: string;
}

export interface CrossModelRequest {
  readonly panels: readonly CrossModelPanelRequest[];
  /** Forwarded to each panel's own render, unchanged. Scene node ids, per panel. */
  readonly selection?: readonly string[] | undefined;
}

/** A panel that rendered: its type, its subject, its view, and where it sits on the outer canvas. */
export interface CrossModelPanel {
  /** `kind:id`, because a model and a machine may share an id and a panel key may not be ambiguous. */
  readonly key: string;
  readonly type: ModelType;
  readonly subject: SceneSubject;
  readonly view: RenderedView;
  /** The panel frame in outer-canvas coordinates, band included. */
  readonly frame: Rect;
  /** Translation from the panel's own viewBox coordinates to the outer canvas. */
  readonly origin: Point;
}

/**
 * A panel that could not be drawn, and why.
 *
 * A refusal rather than an empty picture, on §D-5's recommendation: `buildGraphScene` accepts a
 * subject the system does not have and titles an empty picture with the bare id, which is a view
 * that states nothing while looking like one that states something. This says the absence instead.
 */
export type PanelRefusal =
  | { readonly kind: "type-has-no-scene"; readonly type: ModelType; readonly id: string; readonly why: string }
  | { readonly kind: "subject-not-declared"; readonly type: ModelType; readonly subject: SceneSubject };

// --------------------------------------------------------------------------------------------
// Connections — the only producer is `connectionsOf`, below
// --------------------------------------------------------------------------------------------

/**
 * The registry row a connection stands for, held BY REFERENCE.
 *
 * Two arms, and which arm an entry is in says which registry it came out of. That is what makes
 * `connectionLabel` a lookup rather than a decision, and it is the whole of §23.2's rule: a reader
 * is shown `bound by:` or `composed by:` because the derivation knows which array it walked, not
 * because somebody remembered the distinction.
 */
export type CrossModelRelation =
  | { readonly kind: "binding"; readonly entry: BindingSemantics }
  | { readonly kind: "composition"; readonly entry: CompositionSemantics };

/**
 * §23.2's displayed kind, derived.
 *
 * Exhaustive over the two arms with no `default`, so a third kind of cross-model relationship
 * cannot land without answering here. The two verbs are the spec's own.
 */
export const connectionLabel = (relation: CrossModelRelation): string =>
  relation.kind === "binding"
    ? `bound by: ${relation.entry.name}`
    : `composed by: ${relation.entry.name}`;

/** One end of a connection: a panel as a whole, or one element inside it. */
export interface CrossModelAnchor {
  readonly anchor: AnchorKind;
  readonly panel: string;
  /** The scene node id, for an `element` anchor; the panel's subject id for a `panel` anchor. */
  readonly id: string;
  /** What a reader sees at that end, read out of the panel's own twin. */
  readonly label: string;
  /** Outer-canvas coordinate. Geometry, carried so a caller need not recompute it. */
  readonly point: Point;
}

/**
 * The polyline a connection is drawn along: anchor, out to the panel's facing border, across the
 * gutter, in to the other anchor.
 *
 * §23.3 draws the line BETWEEN the two frames, and the first cut of this module drew it as a
 * straight segment between anchors — which runs diagonally through whichever boxes lie between the
 * element and the other panel, and lands the label on top of the panel's own contents. The route
 * leaves each panel horizontally and does its travelling in the gutter, which is where the spec's
 * figure puts it and where there is nothing to collide with.
 */
export interface CrossModelRoute {
  readonly points: readonly Point[];
  /** The gutter segment's two ends — where a bundle's label belongs. */
  readonly gutter: readonly [Point, Point];
}

/**
 * A drawn cross-model connection.
 *
 * There is deliberately no exported constructor and no exported function that builds one: the only
 * producer in the tree is `connectionsOf`, which walks the registry. §E's requirement — *"a
 * constructor taking `(binding, fromPanel, toPanel)` and no free-string alternative makes the
 * unregistered edge unrepresentable"* — is met by the module boundary rather than by a brand.
 */
export interface CrossModelConnection {
  readonly relation: CrossModelRelation;
  readonly from: CrossModelAnchor;
  readonly to: CrossModelAnchor;
  readonly route: CrossModelRoute;
}

/**
 * Why a registered row produced no connection. Every arm's content comes from the registry or from
 * `SCENE_CONSTRUCTS`; none of it is prose written per row.
 *
 * Total over `BINDINGS ∪ COMPOSITIONS` by construction: `connectionsOf` classifies every row it
 * walks into exactly one of a connection or one of these, and a test asserts the partition.
 */
export type NotDrawn =
  | { readonly kind: "domain-has-no-scene"; readonly domain: ModelType; readonly why: string }
  | { readonly kind: "domain-not-presented"; readonly domain: ModelType; readonly needed: number }
  | { readonly kind: "not-witnessable-by-a-model"; readonly declaredBy: SchemaAuthority }
  | { readonly kind: "no-anchor-rule"; readonly nouns: Correspondence }
  | { readonly kind: "no-correspondence-in-system"; readonly nouns: Correspondence };

export interface UndrawnRelation {
  readonly relation: CrossModelRelation;
  readonly reason: NotDrawn;
}

/** The reason in words, for the twin. Exhaustive; the sentences name the registry's own fields. */
export function notDrawnProse(reason: NotDrawn): string {
  switch (reason.kind) {
    case "domain-has-no-scene":
      // "no scene", NOT "no picture" — the two were one sentence while one model type had neither,
      // and the sentence kept claiming the stronger thing after that stopped being true. A type can
      // have its own projection and still offer nothing for a line to anchor on.
      return `a ${reason.domain.label} draws no node-link scene for a connection to reach: ${reason.why}`;
    case "domain-not-presented":
      return reason.needed === 1
        ? `no panel on this canvas presents a ${reason.domain.label}`
        : `this correspondence runs between two ${reason.domain.label}s, and this canvas presents `
          + "fewer than two";
    case "not-witnessable-by-a-model":
      return "declared against the query, not against a model document: the correspondence is "
        + `authored at ${reason.declaredBy.file} (${reason.declaredBy.symbol}), so no pair of `
        + "panels witnesses it";
    case "no-anchor-rule":
      return `nothing on a panel anchors the correspondence ${reason.nouns.source} → `
        + `${reason.nouns.target}`;
    case "no-correspondence-in-system":
      return `this system declares no ${reason.nouns.source} → ${reason.nouns.target} `
        + "correspondence between the models these panels show";
  }
}

// --------------------------------------------------------------------------------------------
// The composed view
// --------------------------------------------------------------------------------------------

/** One end of a connection, in words. Position and line style are never the only carrier (FR-A11Y-2). */
export interface AccessibleCrossModelAnchor {
  readonly anchor: AnchorKind;
  readonly panel: string;
  readonly element: string;
  readonly label: string;
}

export interface AccessibleCrossModelConnection {
  /** §23.2's line, derived. */
  readonly label: string;
  readonly kind: "binding" | "composition";
  readonly name: string;
  /** The registry's own sentence. Quoted, never paraphrased. */
  readonly interpretation: string;
  readonly from: AccessibleCrossModelAnchor;
  readonly to: AccessibleCrossModelAnchor;
}

export interface AccessibleCrossModelPanel {
  readonly key: string;
  readonly type: ModelTypeId;
  readonly typeLabel: string;
  readonly subject: SceneSubject;
  /** The panel's own twin, unchanged. The composition adds a reading; it replaces none. */
  readonly scene: AccessibleScene;
}

/**
 * The composed canvas's twin.
 *
 * The overlay owes one. FR-A11Y-2 requires an equivalent accessible representation for information
 * conveyed graphically and forbids position and line style as the sole carriers, and
 * `AccessibleScene` is per-view — so an N-panel canvas needs an outer object the connections appear
 * in. §E names this obligation, which the spec does not.
 */
export interface AccessibleCrossModel {
  readonly title: string;
  readonly summary: string;
  readonly systemHash: string;
  readonly panels: readonly AccessibleCrossModelPanel[];
  readonly connections: readonly AccessibleCrossModelConnection[];
  /** Every registered row this canvas did NOT draw, with the reason in words. */
  readonly undrawn: readonly { readonly label: string; readonly why: string }[];
  readonly refusals: readonly string[];
}

/**
 * The composer's only output type.
 *
 * Indivisible for the reason `RenderedView` is: there is no exported path to the composed SVG
 * without the composed twin, so "a cross-model line reached the picture and not the reading" is
 * unreachable rather than reviewable. `test/cross-model.test.ts` pins the shape field by field —
 * adding a visual output without a semantic one would have to change that line.
 */
export interface ComposedCrossModelView {
  readonly svg: string;
  readonly tree: SvgNode;
  readonly accessible: AccessibleCrossModel;
  readonly panels: readonly CrossModelPanel[];
  readonly connections: readonly CrossModelConnection[];
  readonly undrawn: readonly UndrawnRelation[];
  readonly refusals: readonly PanelRefusal[];
}

// --------------------------------------------------------------------------------------------
// Correspondence witnesses — read out of the IR, at the site the registry cites
// --------------------------------------------------------------------------------------------

interface WitnessedPair {
  readonly source: string;
  readonly target: string;
  /** Set when the authored reference qualifies WHICH subject the target lives in. */
  readonly targetSubject: string | null;
}

/**
 * The pairs the IR witnesses for a correspondence, or the absence of a rule for reading it.
 *
 * `witnessed` with an empty list is the ordinary case for a system that authors no such reference;
 * `no-rule` means this module does not know how to read the noun pair, which is a finding about
 * this module and not about the system. Keeping them apart is what lets one test assert "every
 * registered binding is readable" without that test passing on an empty corpus.
 */
export type CorrespondenceWitness =
  | { readonly kind: "witnessed"; readonly pairs: readonly WitnessedPair[] }
  | { readonly kind: "no-rule" };

/**
 * Read a binding's correspondence out of the IR, at the site its `declaredBy` cites.
 *
 * Each arm reads the kernel's own spelling and nothing else. The registry points; the IR decides —
 * so a model-local spelling of the same correspondence is invisible here, which is the same
 * boundary `BindingWitness.keys` draws and the reason `test/bindings-census.test.ts` keeps the
 * model-local names out of the engine.
 *
 * Exported for the same reason `ANCHOR_BY_NOUN` is: the obligation that every registered binding be
 * readable belongs to a test, and a test cannot assert it through a canvas without also depending
 * on which example happens to author the reference.
 */
export function witnessOf(system: CanonicalSystem, c: Correspondence): CorrespondenceWitness {
  const pair = `${c.source}->${c.target}`;

  // `machine-of-entity`. `CanonMachine.entity` is the kernel's hoisting of the authored `entity:`
  // key the binding's witness declares.
  if (pair === "machine->entity") {
    const pairs: WitnessedPair[] = [];
    for (const m of system.machines.values()) {
      if (m.entity === null || !system.entities.has(m.entity)) continue;
      pairs.push({ source: m.id, target: m.entity, targetSubject: null });
    }
    return { kind: "witnessed", pairs };
  }

  // `state-of-entity`. The property is a kernel constant because two kernel components read it,
  // and its value is a state reference in either the bare or the `machine.state` form — so the
  // qualifier is carried rather than discarded, because a bare state name can be ambiguous across
  // machines and a wrong guess would draw a line to the wrong lifecycle.
  if (pair === "entity->state") {
    const pairs: WitnessedPair[] = [];
    for (const e of system.entities.values()) {
      const ref = e.properties.get(EXECUTES_IN_STATE)?.value;
      if (typeof ref !== "string" || ref === "") continue;
      const dot = ref.indexOf(".");
      const qualified = dot > 0 ? ref.slice(0, dot) : null;
      const state = dot > 0 ? ref.slice(dot + 1) : ref;
      pairs.push({
        source: e.id,
        target: state,
        targetSubject: qualified !== null && system.machines.has(qualified) ? qualified : null,
      });
    }
    return { kind: "witnessed", pairs };
  }

  // `appears-in`. The correspondence IS membership, which is why the binding's witness carries the
  // `shared-membership` arm instead of an authored key: an entity named by two purposeful models is
  // one entity, and the id namespace is what licenses that.
  if (pair === "entity->model") {
    const pairs: WitnessedPair[] = [];
    for (const m of system.models.values()) {
      for (const id of m.entities) {
        if (!system.entities.has(id)) continue;
        pairs.push({ source: id, target: m.id, targetSubject: null });
      }
    }
    return { kind: "witnessed", pairs };
  }

  return { kind: "no-rule" };
}

// --------------------------------------------------------------------------------------------
// Geometry
// --------------------------------------------------------------------------------------------

/**
 * Space between panel frames. Wide enough that a label in the band clears both frames.
 *
 * The band is HORIZONTAL and the panels STACK, which is a measured decision, not a preference.
 * The first cut laid panels in a row, and the layout sweep (261006, all six examples, 2–5
 * surfaces) found two degradations: the canvas grew to 2300–4400 units wide while the workspace
 * scales its SVG to column width, so every composed view arrived illegible — including the Worker
 * Queue lab's own; and a correspondence between NON-adjacent panels travelled straight across the
 * panel between them (Message Bus, 21 lines). Stacking keeps each panel at its own one-model
 * width (≈ legible at 1:1 in the column), spends growth on the axis a page scrolls natively, and
 * the author's sketch draws exactly this: the `same job [binding]` band BETWEEN the two machines.
 */
const GUTTER = 110;
/** The type band above each panel — §23.3's `-------- STRUCTURE --------` header. */
const BAND = 26;
/** Frame padding around a panel's own viewBox. */
const PAD = 10;
/**
 * The x of the left routing channel — the empty strip a connection between NON-adjacent panels
 * travels in. Outside every frame (frames start at x = 0), so the §23.3 rule "never across a
 * panel it does not touch" holds by construction rather than by luck of panel heights.
 */
const CHANNEL = -70;
const LABEL_CLASS = "mage-key" as const;

const n2 = (v: number): number => Math.round(v * 100) / 100;

/** The panel's own viewBox, read off the tree the renderer returned rather than recomputed. */
function viewBoxOf(tree: SvgNode): Rect {
  const raw = tree.attrs["viewBox"];
  const parts = String(raw ?? "").trim().split(/\s+/).map(Number);
  const [x, y, w, h] = parts;
  if (parts.length !== 4 || [x, y, w, h].some((v) => v === undefined || !Number.isFinite(v))) {
    // The renderer always emits a four-number viewBox; a missing one means the tree did not come
    // from `renderView`, and guessing a box would place the panel somewhere plausible and wrong.
    throw new Error(`a panel tree carries no readable viewBox: ${String(raw)}`);
  }
  return { x: x as number, y: y as number, w: w as number, h: h as number };
}


// --------------------------------------------------------------------------------------------
// The registry seam
// --------------------------------------------------------------------------------------------

/**
 * The declarations the derivation consults, and the ONLY source a connection can come from.
 *
 * A parameter with a default, following `affordanceParityGate(registry = CAPABILITIES)`: the
 * production call site passes nothing, and a test drives the derivation with an empty registry, a
 * forged row or a construct table where the quantitative type has a scene. That seam is how the
 * control's own negative controls are written — a check that can only pass is not a check — and
 * `test/cross-model.test.ts` asserts over `src/`'s bytes that no production call site uses it.
 */
export interface CrossModelRegistry {
  readonly bindings: readonly BindingSemantics[];
  readonly compositions: readonly CompositionSemantics[];
  readonly constructs: Readonly<Record<ModelTypeId, SceneConstruct>>;
}

/**
 * The kernel's own declarations — the production value, and the parameter default.
 *
 * Named rather than inlined so a test can assert that the default IS this, and so the one place a
 * reader looks for "where does a cross-model line come from" names three arrays and nothing else.
 */
export const KERNEL_CROSS_MODEL_REGISTRY: CrossModelRegistry = {
  bindings: BINDINGS,
  compositions: COMPOSITIONS,
  constructs: SCENE_CONSTRUCTS,
};

const typeById = new Map<ModelTypeId, ModelType>(MODEL_TYPES.map((t) => [t.id, t]));

const modelType = (id: ModelTypeId): ModelType => {
  const t = typeById.get(id);
  if (t === undefined) throw new Error(`no registered model type ${id}`);
  return t;
};

const panelKey = (subject: SceneSubject): string => `${subject.kind}:${subject.id}`;

// --------------------------------------------------------------------------------------------
// Derivation
// --------------------------------------------------------------------------------------------

interface Derived {
  readonly connections: readonly CrossModelConnection[];
  readonly undrawn: readonly UndrawnRelation[];
}

/**
 * Every connection this panel set licenses, and every registered row it does not.
 *
 * The walk is over the registry and nothing else. For each row: both domains must have a scene
 * construct, both must be presented by a panel, the noun pair must anchor, and the IR must witness
 * a pair whose two ends land in the two panels. Any one failing yields an `UndrawnRelation` naming
 * which, so the partition is total and a reader can see what the canvas is missing and why.
 */
function derive(
  system: CanonicalSystem,
  panels: readonly CrossModelPanel[],
  registry: CrossModelRegistry,
): Derived {
  const connections: CrossModelConnection[] = [];
  const undrawn: UndrawnRelation[] = [];

  const rows: readonly CrossModelRelation[] = [
    ...registry.bindings.map((entry): CrossModelRelation => ({ kind: "binding", entry })),
    ...registry.compositions.map((entry): CrossModelRelation => ({ kind: "composition", entry })),
  ];

  for (const relation of rows) {
    // Build first, then explain an empty result. One home for each job: a function that both
    // decided and built would be free to decide one way and build another.
    const built = connectionsFor(system, panels, relation);
    if (built.length > 0) connections.push(...built);
    else undrawn.push({ relation, reason: whyNot(system, panels, relation, registry) });
  }
  return { connections, undrawn };
}

/**
 * Why a row drew nothing. Never `null`: a registry row that produced no connection has a reason,
 * and the last arm is the honest catch-all rather than a silence.
 */
function whyNot(
  system: CanonicalSystem,
  panels: readonly CrossModelPanel[],
  relation: CrossModelRelation,
  registry: CrossModelRegistry,
): NotDrawn {
  const { from, to } = relation.entry;

  // The deeper truth first: a domain with no scene construct cannot be presented at all, so
  // reporting "no panel presents it" would describe a request the author could not have made.
  for (const domain of [from, to]) {
    const construct = registry.constructs[domain];
    if (construct.kind === "none") {
      return { kind: "domain-has-no-scene", domain: modelType(domain), why: construct.why };
    }
  }
  // A same-domain binding needs TWO panels of the one type, not one. `appears-in` corresponds an
  // entity across the purposeful models that mention it, so a canvas showing one structural model
  // has nothing to correspond it WITH — and `from === to` is the registry's own way of saying so
  // (`BindingSemantics`'s doc comment: the field it replaced used `null` for two different jobs).
  const needed = from === to ? 2 : 1;
  for (const domain of [from, to]) {
    if (panels.filter((p) => p.type.id === domain).length < needed) {
      return { kind: "domain-not-presented", domain: modelType(domain), needed };
    }
  }

  // A composition is declared against the query AST — a behavioural predicate entering a
  // quantitative question — so no pair of model panels witnesses one. The asymmetry with a binding
  // is §4.1's own, and `test/bindings-census.test.ts` already rules that no model document can
  // author a composition. The reason carries the registry's citation rather than a sentence.
  if (relation.kind === "composition") {
    return { kind: "not-witnessable-by-a-model", declaredBy: relation.entry.declaredBy };
  }

  const nouns = relation.entry.correspondence;
  if (
    ANCHOR_BY_NOUN[nouns.source] === null
    || ANCHOR_BY_NOUN[nouns.target] === null
    || witnessOf(system, nouns).kind === "no-rule"
  ) {
    return { kind: "no-anchor-rule", nouns };
  }
  return { kind: "no-correspondence-in-system", nouns };
}

/**
 * Every connection a row licenses on this canvas — all of them, not the first.
 *
 * One line per registry ROW would be a lie by omission. Worker Queue declares two machines of the
 * one `job` entity and Document Processing charges four entities to four lifecycle states; drawing
 * one and dropping the rest would show a reader a single correspondence where the model declares
 * several, which is the kind of quiet reduction a picture must never make on a reader's behalf.
 */
function connectionsFor(
  system: CanonicalSystem,
  panels: readonly CrossModelPanel[],
  relation: CrossModelRelation,
): readonly CrossModelConnection[] {
  if (relation.kind !== "binding") return [];
  const nouns = relation.entry.correspondence;
  const sourceAnchor = ANCHOR_BY_NOUN[nouns.source];
  const targetAnchor = ANCHOR_BY_NOUN[nouns.target];
  if (sourceAnchor === null || targetAnchor === null) return [];

  const witness = witnessOf(system, nouns);
  if (witness.kind === "no-rule") return [];

  const sourcePanels = panels.filter((p) => p.type.id === relation.entry.from);
  const targetPanels = panels.filter((p) => p.type.id === relation.entry.to);
  // A same-domain binding corresponds the two panels symmetrically — `appears-in` says an entity
  // is the same entity in both — so one orientation is kept. DEDUPLICATION, not a choice about
  // what the correspondence means: the two orientations are one registered fact, and drawing both
  // would double every line on a canvas of two structural models.
  const symmetric = relation.entry.from === relation.entry.to;

  const out: CrossModelConnection[] = [];
  const seen = new Set<string>();
  for (const pair of witness.pairs) {
    for (const sp of sourcePanels) {
      const a = anchorIn(sp, sourceAnchor, pair.source, null);
      if (a === null) continue;
      for (const tp of targetPanels) {
        // A cross-model connection runs between two models. One panel on both ends would be a line
        // inside a view, which the per-type renderer already owns.
        if (tp.key === sp.key) continue;
        const b = anchorIn(tp, targetAnchor, pair.target, pair.targetSubject);
        if (b === null) continue;
        // A symmetric row's two orientations name the same correspondent from either side, so the
        // key is the unordered PANEL pair plus the corresponded element — not the two ends, which
        // differ between orientations (one end is a panel anchor and the other an element).
        const key = symmetric
          ? `${[sp.key, tp.key].sort().join("~")}/${pair.source}`
          : `${sp.key}/${a.id}~${tp.key}/${b.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ relation, ...route(sp, a, tp, b) });
      }
    }
  }
  return out;
}

interface AnchorDraft {
  readonly anchor: AnchorKind;
  readonly panel: string;
  readonly id: string;
  readonly label: string;
  /** The element's box in outer-canvas coordinates; the panel's frame for a panel anchor. */
  readonly box: Rect;
}

/** The anchor for one end, if this panel carries it. `null` when it does not. */
function anchorIn(
  panel: CrossModelPanel,
  anchor: AnchorKind,
  id: string,
  qualifier: string | null,
): AnchorDraft | null {
  if (qualifier !== null && panel.subject.id !== qualifier) return null;
  if (anchor === "panel") {
    if (panel.subject.id !== id) return null;
    return {
      anchor, panel: panel.key, id, label: panel.view.accessible.title, box: panel.frame,
    };
  }
  const node = panel.view.layout.nodes.get(id);
  if (node === undefined) return null;
  const twin = panel.view.accessible.nodes.find((n) => n.id === id);
  return {
    anchor,
    panel: panel.key,
    id,
    label: twin?.label ?? id,
    box: {
      x: panel.origin.x + node.rect.x, y: panel.origin.y + node.rect.y,
      w: node.rect.w, h: node.rect.h,
    },
  };
}

/**
 * Route one connection: out of each anchor vertically, through the gutter band, in to the other.
 *
 * The horizontal coordinate of an ELEMENT end is the element's own; a PANEL end has no element, so
 * it takes the other end's x clamped into its frame — which is what makes the `machine-of-entity`
 * line arrive above the entity it names rather than at an arbitrary mid-frame point.
 *
 * ADJACENT panels share one gutter band and the route crosses it directly. NON-adjacent panels
 * route through the left CHANNEL — out to the source's gutter, left past every frame, down (or
 * up) the channel, back in at the target's gutter. The sweep that forced this is in the layout
 * constants' header: a straight run between non-adjacent panels crossed the panel between them.
 */
function route(
  sp: CrossModelPanel, a: AnchorDraft, tp: CrossModelPanel, b: AnchorDraft,
): { readonly from: CrossModelAnchor; readonly to: CrossModelAnchor; readonly route: CrossModelRoute } {
  const mid = (r: Rect): number => r.x + r.w / 2;
  const clamp = (v: number, r: Rect): number =>
    Math.min(Math.max(v, r.x + PAD), r.x + r.w - PAD);

  const ax = a.anchor === "element" ? mid(a.box) : null;
  const bx = b.anchor === "element" ? mid(b.box) : null;
  const sx = ax ?? (bx === null ? mid(sp.frame) : clamp(bx, sp.frame));
  const tx = bx ?? (ax === null ? mid(tp.frame) : clamp(ax, tp.frame));

  // Which face each panel presents to the other. Panels stack in a column, so the comparison is a
  // total order and the route never doubles back through its own frame.
  const downward = tp.frame.y >= sp.frame.y + sp.frame.h;
  const sBorder = downward ? sp.frame.y + sp.frame.h : sp.frame.y;
  const tBorder = downward ? tp.frame.y : tp.frame.y + tp.frame.h;

  // The gutter band each end crosses. Equal exactly when the panels are adjacent — then the route
  // is a direct crossing; otherwise it detours through the channel.
  const gs = downward ? sBorder + GUTTER / 2 : sBorder - GUTTER / 2;
  const gt = downward ? tBorder - GUTTER / 2 : tBorder + GUTTER / 2;
  const adjacent = Math.abs(gs - gt) < 0.5;

  const start: Point = a.anchor === "element"
    ? { x: sx, y: downward ? a.box.y + a.box.h : a.box.y }
    : { x: sx, y: sBorder };
  const end: Point = b.anchor === "element"
    ? { x: tx, y: downward ? b.box.y : b.box.y + b.box.h }
    : { x: tx, y: tBorder };

  const waypoints: readonly Point[] = adjacent
    ? [start, { x: sx, y: gs }, { x: tx, y: gs }, end]
    : [
      start, { x: sx, y: gs }, { x: CHANNEL, y: gs },
      { x: CHANNEL, y: gt }, { x: tx, y: gt }, end,
    ];
  const points: Point[] = [];
  for (const p of waypoints) {
    const last = points[points.length - 1];
    if (last === undefined || last.x !== p.x || last.y !== p.y) points.push(p);
  }
  // Where this connection's label belongs: the direct crossing for neighbours, the channel run
  // for a detour — the two segments with nothing of any model on them.
  const gutter: readonly [Point, Point] = adjacent
    ? [{ x: sx, y: gs }, { x: tx, y: gs }]
    : [{ x: CHANNEL, y: gs }, { x: CHANNEL, y: gt }];
  return {
    from: { anchor: a.anchor, panel: a.panel, id: a.id, label: a.label, point: start },
    to: { anchor: b.anchor, panel: b.panel, id: b.id, label: b.label, point: end },
    route: { points, gutter },
  };
}

// --------------------------------------------------------------------------------------------
// Composition
// --------------------------------------------------------------------------------------------

/**
 * Compose a cross-model canvas: render each requested panel, then draw what the registry licenses.
 *
 * `render` is the caller's render seam rather than the renderer's import, so there is exactly one
 * place in the process that turns a system into a picture. `Services.composeCrossModelView` passes
 * its own `renderView`, which is the one the port owns.
 */
export function composeCrossModelView(
  system: CanonicalSystem,
  request: CrossModelRequest,
  render: (req: SceneRequest) => RenderedView,
  registry: CrossModelRegistry = KERNEL_CROSS_MODEL_REGISTRY,
): ComposedCrossModelView {
  const panels: CrossModelPanel[] = [];
  const refusals: PanelRefusal[] = [];

  let cursor = 0;
  for (const req of request.panels) {
    const type = modelType(req.type);
    const construct = registry.constructs[req.type];
    if (construct.kind === "none") {
      refusals.push({ kind: "type-has-no-scene", type, id: req.id, why: construct.why });
      continue;
    }
    const subject: SceneSubject = construct.subject === "model"
      ? { kind: "model", id: req.id }
      : { kind: "machine", id: req.id };
    const declared = subject.kind === "model"
      ? system.models.has(subject.id)
      : system.machines.has(subject.id);
    if (!declared) {
      refusals.push({ kind: "subject-not-declared", type, subject });
      continue;
    }

    const view = render({
      subject,
      ...(request.selection !== undefined ? { selection: request.selection } : {}),
    });
    const box = viewBoxOf(view.tree);
    // Stacked, not rowed — the measured decision the layout constants' header records. Frames
    // share x = 0 so the left CHANNEL is outside every one of them by construction.
    const frame: Rect = {
      x: 0, y: cursor, w: box.w + 2 * PAD, h: box.h + 2 * PAD + BAND,
    };
    panels.push({
      key: panelKey(subject),
      type,
      subject,
      view,
      frame,
      origin: { x: frame.x + PAD - box.x, y: frame.y + BAND + PAD - box.y },
    });
    cursor = frame.y + frame.h + GUTTER;
  }

  const { connections, undrawn } = derive(system, panels, registry);
  const tree = canvasTree(system, panels, connections);
  return {
    svg: serialize(tree),
    tree,
    accessible: twin(system, panels, connections, undrawn, refusals),
    panels,
    connections,
    undrawn,
    refusals,
  };
}

// --------------------------------------------------------------------------------------------
// The picture
// --------------------------------------------------------------------------------------------

/**
 * The cross-model layer's own vocabulary, kept out of the renderer's stylesheet.
 *
 * Two `<style>` blocks rather than one, because the panels' stylesheet belongs to the renderer and
 * this one belongs to the composition. Non-colour channels carry every distinction: the frame is a
 * solid rule, a binding is a solid stroke and a composition is dashed, and each line's meaning is
 * written beside it in words.
 */
const CROSS_MODEL_STYLE = `
.mage-panel-frame { fill: none; stroke: #8a93a6; stroke-width: 1.5; }
.mage-panel-band { fill: #eef1f6; stroke: none; }
.mage-panel-type { font: 600 11px ui-sans-serif, system-ui, sans-serif; fill: #3b4759; letter-spacing: 0.08em; }
.mage-panel-subject { font: 400 11px ui-sans-serif, system-ui, sans-serif; fill: #5a6476; }
.mage-xmodel { fill: none; stroke: #2a3242; stroke-width: 2; }
.mage-xmodel-composition { stroke-dasharray: 6 4; }
.mage-xmodel-label { fill: #2a3242; }
.mage-xmodel-label-plate { fill: #ffffff; stroke: #8a93a6; stroke-width: 1; }
`.trim();

/**
 * Each panel in its own group, with its own frame and type band.
 *
 * §23.3's rule, structurally: *"retain their visual boundaries … do not flatten both models into
 * one graph."* The panel's own layer groups are placed inside a translating `<g>` UNTOUCHED — no
 * node is re-laid-out, no edge is re-routed, and nothing from one panel's scene can reach another's,
 * because the two scenes were built by separate `renderView` calls and are composed as trees.
 */
function panelGroup(panel: CrossModelPanel): SvgNode {
  const layers = panel.view.tree.children.filter(
    (c) => c.tag === "g" && typeof c.attrs["data-layer"] === "string",
  );
  const f = panel.frame;
  return el("g", {
    "data-panel": panel.key,
    "data-panel-type": panel.type.id,
    "data-subject-kind": panel.subject.kind,
    "data-subject-id": panel.subject.id,
  }, [
    el("rect", { x: f.x, y: f.y, width: f.w, height: f.h, rx: 4, class: "mage-panel-frame" }),
    el("rect", { x: f.x + 1, y: f.y + 1, width: f.w - 2, height: BAND - 1, class: "mage-panel-band" }),
    el("text", { x: f.x + PAD, y: f.y + 17, class: "mage-panel-type" }, [],
      panel.type.label.toUpperCase()),
    el("text", { x: f.x + f.w - PAD, y: f.y + 17, class: "mage-panel-subject", "text-anchor": "end" },
      [], panel.view.accessible.title),
    el("g", {
      "data-layer": "panel-content",
      transform: `translate(${n2(panel.origin.x)} ${n2(panel.origin.y)})`,
    }, layers),
  ]);
}

/** One connection's line. The kind is written once per BUNDLE, below; see `bundles`. */
function connectionLine(c: CrossModelConnection): SvgNode {
  return el("g", {
    "data-xmodel": c.relation.entry.name,
    "data-xmodel-kind": c.relation.kind,
    "data-from": `${c.from.panel}/${c.from.id}`,
    "data-to": `${c.to.panel}/${c.to.id}`,
  }, [
    el("path", {
      d: c.route.points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${n2(p.x)} ${n2(p.y)}`)
        .join(" "),
      class: `mage-xmodel${c.relation.kind === "composition" ? " mage-xmodel-composition" : ""}`,
      "marker-end": "url(#mage-arrow)",
    }),
  ]);
}

/**
 * A large bundle drawn by its DRAWN count is drawn as one line, panel to panel.
 *
 * Measured, not preferred: the 261006 sweep's Message Bus canvas drew seven `appears-in` lines
 * per panel pair — every one exiting vertically through its own panel's stacked boxes — and the
 * seven said nothing the bundle label's `(7)` does not. So past this threshold the PICTURE shows
 * one labelled correspondence per pair while the TWIN keeps every element-level row, which is the
 * usual division: the reading carries the facts, the picture carries the shape.
 */
const COLLAPSE_ABOVE = 3;

/** One line standing for a whole bundle, routed like its members but border-to-border. */
function collapsedLine(
  frames: ReadonlyMap<string, Rect>, bundle: Bundle,
): SvgNode {
  const m0 = bundle.members[0] as CrossModelConnection;
  const sF = frames.get(m0.from.panel) as Rect;
  const tF = frames.get(m0.to.panel) as Rect;
  const downward = tF.y >= sF.y + sF.h;
  const sBorder = downward ? sF.y + sF.h : sF.y;
  const tBorder = downward ? tF.y : tF.y + tF.h;
  const [g0, g1] = m0.route.gutter;
  const viaChannel = g0.x === CHANNEL && g1.x === CHANNEL;
  const sx = mean(bundle.members.map((m) => (m.route.points[1] ?? m.from.point).x));
  const tx = mean(bundle.members.map((m) =>
    (m.route.points[m.route.points.length - 2] ?? m.to.point).x));
  const points: Point[] = viaChannel
    ? [{ x: sx, y: sBorder }, { x: sx, y: g0.y }, { x: CHANNEL, y: g0.y },
      { x: CHANNEL, y: g1.y }, { x: tx, y: g1.y }, { x: tx, y: tBorder }]
    : [{ x: sx, y: sBorder }, { x: sx, y: g0.y }, { x: tx, y: g0.y }, { x: tx, y: tBorder }];
  return el("g", {
    "data-xmodel": m0.relation.entry.name,
    "data-xmodel-kind": m0.relation.kind,
    "data-from": m0.from.panel,
    "data-to": m0.to.panel,
    "data-collapsed": bundle.members.length,
  }, [
    el("path", {
      d: points.map((p, i) => `${i === 0 ? "M" : "L"} ${n2(p.x)} ${n2(p.y)}`).join(" "),
      class: `mage-xmodel${m0.relation.kind === "composition" ? " mage-xmodel-composition" : ""}`,
      "marker-end": "url(#mage-arrow)",
    }),
  ]);
}

/**
 * One labelled bundle: every connection of one registry row between one ordered pair of panels.
 *
 * §23.2 asks for the KIND beside the relationship, and seven lines carrying seven copies of `bound
 * by: appears-in` would be the repeated-type-label defect the renderer already refuses one layer in
 * (`buildGraphScene` drops a relation's type from the edge and puts it in the key strip once). So
 * the label is written once per bundle and carries the COUNT when the bundle holds more than one —
 * derived, so a reader is never told "one correspondence" where the model declares seven.
 */
interface Bundle {
  readonly relation: CrossModelRelation;
  readonly members: readonly CrossModelConnection[];
}

function bundles(connections: readonly CrossModelConnection[]): readonly Bundle[] {
  const byKey = new Map<string, CrossModelConnection[]>();
  for (const c of connections) {
    const key = `${c.relation.kind}|${c.relation.entry.name}|${c.from.panel}|${c.to.panel}`;
    const list = byKey.get(key);
    if (list === undefined) byKey.set(key, [c]);
    else list.push(c);
  }
  return [...byKey.values()].map((members) => ({
    relation: (members[0] as CrossModelConnection).relation,
    members,
  }));
}

interface PlacedLabel {
  readonly bundle: Bundle;
  readonly text: string;
  readonly plate: Rect;
  readonly baseline: number;
}

/**
 * Where each bundle's label goes: its own gutter centroid, pushed down until it clears the plates
 * already placed.
 *
 * The first cut offset by bundle INDEX, which is the same guess the renderer's viewBox used to make
 * about legend width and for the same reason it was wrong: two bundles whose centroids differ by
 * less than a plate height still collide, and two whose centroids are far apart get separated for
 * nothing. Measuring the plates and resolving the overlap is cheap, deterministic and correct —
 * `textExtent` is the estimator the layout engine itself reserves label boxes with.
 */
function placeLabels(bundled: readonly Bundle[]): readonly PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  for (const bundle of bundled) {
    const base = connectionLabel(bundle.relation);
    const text = bundle.members.length === 1 ? base : `${base} (${bundle.members.length})`;
    // In the GUTTER, which is where §23.3's figure writes it and the one strip of canvas with
    // nothing of either model on it. Averaged over the bundle's own gutter segments, so a bundle of
    // four lines is labelled at their centre rather than at the first one's height.
    const cx = mean(bundle.members.flatMap((c) => [c.route.gutter[0].x, c.route.gutter[1].x]));
    const cy = mean(bundle.members.flatMap((c) => [c.route.gutter[0].y, c.route.gutter[1].y]));
    const extent = textExtent(text, LABEL_CLASS);
    const w = extent.w + 10;
    const h = extent.h + 6;
    let y = cy;
    for (;;) {
      const plate: Rect = { x: cx - w / 2, y: y - extent.h, w, h };
      const clash = placed.some((p) =>
        plate.x < p.plate.x + p.plate.w && p.plate.x < plate.x + plate.w
        && plate.y < p.plate.y + p.plate.h && p.plate.y < plate.y + plate.h);
      if (!clash) {
        placed.push({ bundle, text, plate, baseline: y + 3 });
        break;
      }
      y += h + 4;
    }
  }
  return placed;
}

function bundleLabelGroup(label: PlacedLabel): SvgNode {
  return el("g", {
    "data-xmodel-label": label.bundle.relation.entry.name,
    "data-xmodel-kind": label.bundle.relation.kind,
    "data-xmodel-count": label.bundle.members.length,
  }, [
    el("rect", {
      x: label.plate.x, y: label.plate.y, width: label.plate.w, height: label.plate.h,
      rx: 3, class: "mage-xmodel-label-plate",
    }),
    el("text", {
      x: label.plate.x + label.plate.w / 2, y: label.baseline,
      class: `${LABEL_CLASS} mage-xmodel-label`, "text-anchor": "middle",
    }, [], label.text),
  ]);
}

const mean = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * The outer canvas.
 *
 * One `<defs>`, lifted from a panel rather than rebuilt, because marker ids are document-global: two
 * panels each carrying the renderer's `<defs>` would define `mage-arrow` twice and a `url(#…)`
 * would resolve to whichever came first. `renderView`'s `defs()` takes no argument, so every
 * panel's is byte-identical — asserted in `test/cross-model.test.ts` rather than assumed, so a
 * renderer that made `defs` panel-dependent breaks this composition loudly.
 */
function canvasTree(
  system: CanonicalSystem,
  panels: readonly CrossModelPanel[],
  connections: readonly CrossModelConnection[],
): SvgNode {
  const lifted = panels[0]?.view.tree.children.find((c) => c.tag === "defs");
  const bundled = bundles(connections);
  const frames = new Map(panels.map((p) => [p.key, p.frame]));
  const lines = bundled.flatMap((b) =>
    b.members.length > COLLAPSE_ABOVE ? [collapsedLine(frames, b)] : b.members.map(connectionLine));
  const labels = placeLabels(bundled);
  // MEASURED, not guessed — on all four sides, because the channel and its plates live LEFT of
  // the frames now. A plate pushed clear by collision resolution must be inside the viewBox, and
  // the renderer's own header records what guessing a strip's extent cost once: "that number was
  // a guess at how wide a row of legend text would be, and it was wrong."
  const routeXs = connections.flatMap((c) => c.route.points.map((p) => p.x));
  const left = Math.min(0, ...routeXs, ...labels.map((l) => l.plate.x));
  const right = Math.max(0, ...panels.map((p) => p.frame.x + p.frame.w),
    ...labels.map((l) => l.plate.x + l.plate.w));
  const bottom = Math.max(0, ...panels.map((p) => p.frame.y + p.frame.h),
    ...labels.map((l) => l.plate.y + l.plate.h));
  const titleId = "mage-xmodel-title";
  const descId = "mage-xmodel-desc";
  return el("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: `${n2(left - PAD)} ${-PAD} ${n2(right - left + 2 * PAD)} ${bottom + 2 * PAD}`,
    width: n2(right - left + 2 * PAD),
    height: bottom + 2 * PAD,
    class: "mage-svg mage-xmodel-canvas",
    role: "img",
    "aria-labelledby": `${titleId} ${descId}`,
    "data-panel-count": panels.length,
    "data-connection-count": connections.length,
    "data-system-hash": systemHash(system),
  }, [
    el("title", { id: titleId }, [], canvasTitle(panels)),
    el("desc", { id: descId }, [], canvasSummary(panels, connections)),
    ...(lifted === undefined ? [] : [lifted]),
    el("defs", {}, [el("style", { type: "text/css" }, [], CROSS_MODEL_STYLE)]),
    el("g", { "data-layer": "panels" }, panels.map(panelGroup)),
    el("g", { "data-layer": "cross-model" }, lines),
    el("g", { "data-layer": "cross-model-labels" }, labels.map(bundleLabelGroup)),
  ]);
}

// --------------------------------------------------------------------------------------------
// The twin
// --------------------------------------------------------------------------------------------

const canvasTitle = (panels: readonly CrossModelPanel[]): string =>
  panels.length === 0
    ? "No purposeful model is presented"
    : `${panels.map((p) => p.view.accessible.title).join(" and ")} shown together`;

function canvasSummary(
  panels: readonly CrossModelPanel[], connections: readonly CrossModelConnection[],
): string {
  const kinds = panels.map((p) => `${p.view.accessible.title} is a ${p.type.label}`).join("; ");
  if (connections.length === 0) {
    return `${panels.length} purposeful model(s), each in its own boundary — ${kinds}. The kernel `
      + "declares no correspondence these panels witness, so no line is drawn between them.";
  }
  const lines = connections
    .map((c) => `"${c.from.label}" to "${c.to.label}", ${connectionLabel(c.relation)}`)
    .join("; ");
  return `${panels.length} purposeful models, each in its own boundary — ${kinds}. `
    + `${connections.length} registered correspondence(s) between them: ${lines}. Each is a `
    + "declared binding or composition, never a generic graph edge.";
}

function twin(
  system: CanonicalSystem,
  panels: readonly CrossModelPanel[],
  connections: readonly CrossModelConnection[],
  undrawn: readonly UndrawnRelation[],
  refusals: readonly PanelRefusal[],
): AccessibleCrossModel {
  return {
    title: canvasTitle(panels),
    summary: canvasSummary(panels, connections),
    systemHash: systemHash(system),
    panels: panels.map((p) => ({
      key: p.key,
      type: p.type.id,
      typeLabel: p.type.label,
      subject: p.subject,
      scene: p.view.accessible,
    })),
    connections: connections.map((c) => ({
      label: connectionLabel(c.relation),
      kind: c.relation.kind,
      name: c.relation.entry.name,
      interpretation: c.relation.entry.interpretation,
      from: { anchor: c.from.anchor, panel: c.from.panel, element: c.from.id, label: c.from.label },
      to: { anchor: c.to.anchor, panel: c.to.panel, element: c.to.id, label: c.to.label },
    })),
    undrawn: undrawn.map((u) => ({
      label: connectionLabel(u.relation),
      why: notDrawnProse(u.reason),
    })),
    refusals: refusals.map(refusalProse),
  };
}

/** Exhaustive over `PanelRefusal`; both sentences name what would license the panel. */
export function refusalProse(r: PanelRefusal): string {
  switch (r.kind) {
    case "type-has-no-scene":
      return `a ${r.type.label} draws no node-link scene, so "${r.id}" is not a panel here: ${r.why}`;
    case "subject-not-declared":
      return `this system declares no ${r.subject.kind} "${r.subject.id}", so the `
        + `${r.type.label} panel states the absence rather than drawing an empty picture`;
  }
}

// --------------------------------------------------------------------------------------------
// The binding, in its own words
// --------------------------------------------------------------------------------------------

/**
 * One registry row's full reading, for a surface that shows a binding as its subject.
 *
 * Every sentence-bearing field is the REGISTRY'S, quoted verbatim — `interpretation`,
 * `licensing.why`, `witness.why`, `declaredBy.role`. This function adds connective frames only
 * ("licensed by construction:", "declared at"), never a parallel explanatory vocabulary: a reading
 * authored here could drift from what the registry asserts, and the registry is the composition
 * semantics this workbench has exactly one of. `test/property-composition.test.ts` pins the
 * quotation field by field.
 */
export interface BindingWords {
  /** §23.2's displayed kind line — `bound by: appears-in` / `composed by: …`. */
  readonly label: string;
  readonly name: string;
  readonly kind: "binding" | "composition";
  /** The registry's own interpretation sentence, verbatim. */
  readonly interpretation: string;
  /** How the correspondence is licensed, leading with the licensing kind. */
  readonly licensing: string;
  /**
   * True for a correspondence nothing declares — `appears-in`'s case. A surface should SAY that
   * nothing declares it rather than offering a declaration to navigate to: the absence is the
   * lesson, not a gap.
   */
  readonly byConstruction: boolean;
  /** How a model document witnesses the correspondence, or how the composition enters a query. */
  readonly witness: string;
  /** Where the correspondence is authored. Total on the registry, so total here. */
  readonly declaredBy: SchemaAuthority;
}

export function bindingWords(relation: CrossModelRelation): BindingWords {
  const entry = relation.entry;
  const licensing = entry.licensing.kind === "by-construction"
    ? `licensed by construction: ${entry.licensing.why}`
    : `licensed by a declaration, read from ${entry.licensing.by.file} `
      + `(${entry.licensing.by.symbol}): ${entry.licensing.by.role}`;
  const witness = relation.kind === "binding"
    ? (relation.entry.witness.kind === "authored-property"
      ? "witnessed by an authored property, spelled "
        + relation.entry.witness.keys.map((k) => `'${k}'`).join(", ")
      : `witnessed by shared membership: ${relation.entry.witness.why}`)
    : `enters the question at ${relation.entry.declaredBy.file} `
      + `(${relation.entry.declaredBy.symbol}): ${relation.entry.declaredBy.role}`;
  return {
    label: connectionLabel(relation),
    name: entry.name,
    kind: relation.kind,
    interpretation: entry.interpretation,
    licensing,
    byConstruction: entry.licensing.kind === "by-construction",
    witness,
    declaredBy: entry.declaredBy,
  };
}

// --------------------------------------------------------------------------------------------
// The model-composition graph — the system's topology, derived from the registry
// --------------------------------------------------------------------------------------------

/**
 * One place two purposeful models' meanings meet: the registered binding, the two subjects, and
 * the element the correspondence runs through.
 *
 * This is the Navigate rail's topology reading — `Worker Pool ── job ── Job Lifecycle` — and it is
 * DERIVED the same way the canvas's lines are: a walk over the registry and `witnessOf`, with no
 * other input, so the rail cannot assert a meeting the kernel does not license. The models remain
 * purposeful reductions; this names where their meanings meet.
 */
export interface CompositionEdge {
  readonly binding: BindingSemantics;
  readonly a: SceneSubject;
  readonly b: SceneSubject;
  /** The corresponded element — the entity (or state's entity) the two subjects share. */
  readonly element: string;
}

export function modelCompositionGraph(
  system: CanonicalSystem,
  registry: CrossModelRegistry = KERNEL_CROSS_MODEL_REGISTRY,
): readonly CompositionEdge[] {
  const out: CompositionEdge[] = [];
  const seen = new Set<string>();
  const add = (binding: BindingSemantics, a: SceneSubject, b: SceneSubject, element: string): void => {
    const ends = [`${a.kind}:${a.id}`, `${b.kind}:${b.id}`].sort().join("~");
    const key = `${binding.name}|${ends}|${element}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ binding, a, b, element });
  };
  const modelsContaining = (entity: string): readonly string[] =>
    [...system.models.values()].filter((m) => m.entities.includes(entity)).map((m) => m.id);

  for (const binding of registry.bindings) {
    const witness = witnessOf(system, binding.correspondence);
    if (witness.kind === "no-rule") continue;
    const pair = `${binding.correspondence.source}->${binding.correspondence.target}`;
    for (const w of witness.pairs) {
      if (pair === "machine->entity") {
        for (const model of modelsContaining(w.target)) {
          add(binding, { kind: "machine", id: w.source }, { kind: "model", id: model }, w.target);
        }
      } else if (pair === "entity->state") {
        // The machine the state belongs to: the authored qualifier, or the unique machine
        // declaring a state of that name. An ambiguous bare name yields no edge — guessing would
        // draw a meeting with the wrong lifecycle, which is worse than omitting one.
        const owners = w.targetSubject !== null
          ? [w.targetSubject]
          : [...system.machines.values()].filter((m) => m.states.includes(w.target)).map((m) => m.id);
        if (owners.length !== 1) continue;
        const machine = owners[0] as string;
        for (const model of modelsContaining(w.source)) {
          add(binding, { kind: "model", id: model }, { kind: "machine", id: machine }, w.source);
        }
      } else if (pair === "entity->model") {
        // `appears-in`: every unordered pair of purposeful models naming this entity. The pairs
        // list already carries (entity, model) rows, so the pairing happens here.
        const others = witness.pairs.filter((o) => o.source === w.source && o.target !== w.target);
        for (const o of others) {
          add(binding, { kind: "model", id: w.target }, { kind: "model", id: o.target }, w.source);
        }
      }
    }
  }
  return out;
}

/**
 * One composed view the model's own bindings license: a shared element, and every purposeful
 * model whose meaning meets on it.
 *
 * The author's ruling (261006): *"Offering the named JOINs present in the model as part of this
 * list seems like a good choice. No ephemerality needed, it just shows what the underlying model
 * already encodes as modeled."* So a composed view is OFFERED alongside the one-model subjects,
 * derived — never authored here — from the same `modelCompositionGraph` walk the topology reading
 * uses: a system whose two machines both declare `entity: job` has encoded a composed view of the
 * job, and the list says so.
 *
 * `subjects` is ordered machines-flanking-models: the element's carrier model sits between the
 * machines bound to it, so the shared element is the middle of the drawn row — §23's figure.
 */
export interface DerivedComposedView {
  /**
   * Every shared element the bindings correspond on, between exactly these subjects. A list, not
   * one element: the sweep that sized this surface found Message Bus deriving SEVEN per-element
   * views whose panel sets were identical — seven subject-list choices rendering one picture.
   * One view per SUBJECT SET, carrying its elements, is the honest offering.
   */
  readonly elements: readonly string[];
  readonly subjects: readonly SceneSubject[];
  /** Every registered binding with a meeting on one of these elements. */
  readonly bindings: readonly BindingSemantics[];
}

export function derivedComposedViews(
  system: CanonicalSystem,
  registry: CrossModelRegistry = KERNEL_CROSS_MODEL_REGISTRY,
): readonly DerivedComposedView[] {
  const byElement = new Map<string, CompositionEdge[]>();
  for (const edge of modelCompositionGraph(system, registry)) {
    const list = byElement.get(edge.element);
    if (list === undefined) byElement.set(edge.element, [edge]);
    else list.push(edge);
  }
  interface Draft {
    readonly elements: string[];
    readonly subjects: readonly SceneSubject[];
    readonly bindings: Set<BindingSemantics>;
  }
  const bySubjectSet = new Map<string, Draft>();
  for (const [element, edges] of byElement) {
    const machines: SceneSubject[] = [];
    const models: SceneSubject[] = [];
    const seen = new Set<string>();
    for (const edge of edges) {
      for (const s of [edge.a, edge.b]) {
        const key = `${s.kind}:${s.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        (s.kind === "machine" ? machines : models).push(s);
      }
    }
    if (machines.length + models.length < 2) continue;
    const [first, ...rest] = machines;
    const subjects = [...(first === undefined ? [] : [first]), ...models, ...rest];
    const setKey = [...seen].sort().join("~");
    const draft = bySubjectSet.get(setKey);
    if (draft === undefined) {
      bySubjectSet.set(setKey, {
        elements: [element], subjects, bindings: new Set(edges.map((e) => e.binding)),
      });
    } else {
      draft.elements.push(element);
      for (const e of edges) draft.bindings.add(e.binding);
    }
  }
  return [...bySubjectSet.values()].map((d) => ({
    elements: d.elements, subjects: d.subjects, bindings: [...d.bindings],
  }));
}

// --------------------------------------------------------------------------------------------
// The composed property view — a cross-model claim, shown over the models that state it
// --------------------------------------------------------------------------------------------

/**
 * What the facade asks for when a CROSS-MODEL property is selected: the claim's words, the panels
 * its vocabulary spans, and the control states its constraint names.
 *
 * The semantic content arrives FROM the saved query via `constraintSpan`
 * (`src/app/properties.ts`) — the statement, the engine's own `describePredicate` prose, and the
 * (machine, state) sites — so this module adds geometry and nothing semantic. The composer stays
 * what it is everywhere above: a projection that reads declarations and draws, with the registry
 * as the only source of a correspondence line.
 */
export interface PropertyCompositionRequest {
  /** The saved query id. */
  readonly id: string;
  /** What the claim says, in the author's words. */
  readonly statement: string;
  /** The behaviour form — `invariant`, `reach`, … — or null when the query states none. */
  readonly form: string | null;
  /** The engine's plain-language reading of the constraint (`describePredicate`), quoted. */
  readonly prose: string | null;
  readonly panels: readonly CrossModelPanelRequest[];
  /** The control states the constraint names, resolved against each machine's own `states`. */
  readonly ends: readonly { readonly machine: string; readonly state: string }[];
}

/** One end of the drawn constraint: the state node it anchors on, located on the outer canvas. */
export interface ConstraintAnchor {
  readonly panel: string;
  readonly machine: string;
  readonly state: string;
  readonly label: string;
  readonly box: Rect;
}

/**
 * The constraint, drawn or honestly not. NOT a `CrossModelConnection` and never rendered as one:
 * a binding asserts a CORRESPONDENCE the kernel licenses; this overlay renders the PROPERTY'S OWN
 * predicate — the obligation being checked — in its own layer, its own stroke, and the engine's
 * own words. Conflating the two would teach that a constraint is a correspondence, which is the
 * confusion §23.2's "not every line is a join" rule exists to prevent.
 */
export type ConstraintOverlay =
  | { readonly drawn: true; readonly text: string; readonly anchors: readonly ConstraintAnchor[] }
  | { readonly drawn: false; readonly text: string; readonly why: string };

/** The composed property view's twin: the canvas's, plus the property and its constraint in words. */
export interface AccessiblePropertyComposition {
  readonly property: {
    readonly id: string;
    readonly statement: string;
    readonly form: string | null;
    readonly prose: string | null;
  };
  readonly constraint: {
    readonly text: string;
    readonly drawn: boolean;
    readonly why: string | null;
    readonly ends: readonly { readonly machine: string; readonly state: string }[];
  };
  readonly canvas: AccessibleCrossModel;
}

export interface ComposedPropertyView {
  /** The canvas WITH the constraint layer. `base.svg` is the registry-only canvas, untouched. */
  readonly svg: string;
  readonly tree: SvgNode;
  readonly base: ComposedCrossModelView;
  readonly constraint: ConstraintOverlay;
  readonly accessible: AccessiblePropertyComposition;
}

/** The constraint layer's own vocabulary. Dotted, never the binding's solid or the composition's
 * dash — and the stroke is never the sole carrier: the label and the twin say it in words. */
const CONSTRAINT_STYLE = `
.mage-constraint { fill: none; stroke: #7a2e2e; stroke-width: 2; stroke-dasharray: 2 3; }
.mage-constraint-label { fill: #7a2e2e; }
.mage-constraint-plate { fill: #ffffff; stroke: #7a2e2e; stroke-width: 1; }
`.trim();

/**
 * The constraint's own channel, left of the binding channel — the two must not share a lane, or
 * a reader tracing a dotted obligation would ride onto a solid correspondence.
 */
const CONSTRAINT_CHANNEL = CHANNEL - 70;

/**
 * Compose the view a cross-model property licenses: the panels its vocabulary spans, every
 * registered correspondence between them, and the constraint itself drawn BESIDE the panels in
 * its own layer and channel.
 *
 * The panels and connections come from `composeCrossModelView`, unchanged — this function draws no
 * correspondence of its own. What it adds is the one thing the registry deliberately cannot
 * supply: the PROPERTY's predicate, anchored on the control states it names, labelled with the
 * engine's own reading. The emphasis selection (the named states, each machine's bound entity) is
 * forwarded to the panels' own renderers, which already own emphasis.
 */
export function composePropertyView(
  system: CanonicalSystem,
  request: PropertyCompositionRequest,
  render: (req: SceneRequest) => RenderedView,
  registry: CrossModelRegistry = KERNEL_CROSS_MODEL_REGISTRY,
): ComposedPropertyView {
  // Emphasis: the constraint's own states, plus each presented machine's bound entity — the
  // element the binding lines converge on, which is the middle object the view exists to show.
  const boundEntities = request.panels
    .filter((p) => p.type === "state-machine")
    .map((p) => system.machines.get(p.id)?.entity)
    .filter((e): e is string => e !== null && e !== undefined);
  const selection = [...new Set([...request.ends.map((e) => e.state), ...boundEntities])];

  const base = composeCrossModelView(system, { panels: request.panels, selection }, render, registry);

  // Anchor each named state on the panel that draws its machine. A state the panels cannot anchor
  // is reported, never silently dropped — same rule as `NotDrawn`.
  const anchors: ConstraintAnchor[] = [];
  const missing: string[] = [];
  for (const end of request.ends) {
    const panel = base.panels.find(
      (p) => p.subject.kind === "machine" && p.subject.id === end.machine);
    const node = panel?.view.layout.nodes.get(end.state);
    if (panel === undefined || node === undefined) {
      missing.push(`${end.machine}.${end.state}`);
      continue;
    }
    const twinNode = panel.view.accessible.nodes.find((n) => n.id === end.state);
    anchors.push({
      panel: panel.key,
      machine: end.machine,
      state: end.state,
      label: twinNode?.label ?? end.state,
      box: {
        x: panel.origin.x + node.rect.x, y: panel.origin.y + node.rect.y,
        w: node.rect.w, h: node.rect.h,
      },
    });
  }

  const text = request.prose === null
    ? `the property "${request.statement}"`
    : `property requires: ${request.prose}`;
  const constraint: ConstraintOverlay = anchors.length >= 2
    ? { drawn: true, text, anchors }
    : {
      drawn: false,
      text,
      why: missing.length > 0
        ? `no panel draws ${missing.join(", ")}, so the constraint is stated in words instead`
        : "the constraint names fewer than two drawable control states, so there is nothing to "
          + "span a line between",
    };

  const tree = constraint.drawn
    ? withConstraintLayer(base.tree, constraint.anchors, text)
    : base.tree;

  return {
    svg: serialize(tree),
    tree,
    base,
    constraint,
    accessible: {
      property: {
        id: request.id, statement: request.statement, form: request.form, prose: request.prose,
      },
      constraint: {
        text,
        drawn: constraint.drawn,
        why: constraint.drawn ? null : constraint.why,
        ends: request.ends,
      },
      canvas: base.accessible,
    },
  };
}

/**
 * The base canvas with the constraint drawn beside it: a dotted trunk in its own channel, one
 * stub per anchored state, and the label plated above the whole stack — §6.7's sketch, where the
 * `property requires` edge leaves `processing` and arrives beside `free` without crossing either
 * machine's own picture. The stacked layout routes it in the left margin for the same reason the
 * binding channel lives there: there is nothing of any model to collide with.
 */
function withConstraintLayer(
  base: SvgNode, anchors: readonly ConstraintAnchor[], text: string,
): SvgNode {
  const box = String(base.attrs["viewBox"] ?? "").trim().split(/\s+/).map(Number);
  const [vx, vy, vw, vh] = box as [number, number, number, number];

  const trunkX = Math.min(CONSTRAINT_CHANNEL, vx - 40);
  const ys = anchors.map((a) => a.box.y + a.box.h / 2);
  const extent = textExtent(text, LABEL_CLASS);
  const plate: Rect = {
    x: trunkX, y: vy - extent.h - 16, w: extent.w + 10, h: extent.h + 6,
  };

  const trunk = `M ${n2(trunkX)} ${n2(plate.y + plate.h)} L ${n2(trunkX)} ${n2(Math.max(...ys))}`;
  // Each stub stops at the panel's frame edge (every frame starts at x = 0 in the stacked
  // layout), at the state's own height. The first cut ran the stub INTO the state box, and the
  // render showed it striking through whatever transitions and labels lay between the frame and
  // the state — so the arrow now points at the panel at the state's height, and the state itself
  // carries the selection emphasis the composer already requests for every constraint end.
  const stubs = anchors.map((a) => el("path", {
    d: `M ${n2(trunkX)} ${n2(a.box.y + a.box.h / 2)} L 0 ${n2(a.box.y + a.box.h / 2)}`,
    class: "mage-constraint",
    "marker-end": "url(#mage-arrow)",
  }));
  const layer = el("g", { "data-layer": "property-constraint" }, [
    el("defs", {}, [el("style", { type: "text/css" }, [], CONSTRAINT_STYLE)]),
    el("path", { d: trunk, class: "mage-constraint" }),
    ...stubs,
    el("rect", {
      x: n2(plate.x), y: n2(plate.y), width: n2(plate.w), height: n2(plate.h),
      rx: 3, class: "mage-constraint-plate",
    }),
    el("text", {
      x: n2(plate.x + 5), y: n2(plate.y + extent.h), class: `${LABEL_CLASS} mage-constraint-label`,
    }, [], text),
  ]);

  // The viewBox grows left for the channel and up for the plate — and right if the plate
  // overhangs. Measured, for the reason `canvasTree` gives: a guessed extent was wrong once.
  const top = Math.min(vy, plate.y - PAD);
  const left = Math.min(vx, trunkX - PAD);
  const right = Math.max(vx + vw, plate.x + plate.w + PAD);
  const bottom = vy + vh;
  return el(base.tag, {
    ...base.attrs,
    viewBox: `${n2(left)} ${n2(top)} ${n2(right - left)} ${n2(bottom - top)}`,
    width: n2(right - left),
    height: n2(bottom - top),
  }, [...base.children, layer], base.text);
}
