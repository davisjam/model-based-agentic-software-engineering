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

// --------------------------------------------------------------------------------------------
// The one relation between a model TYPE and a scene subject
// --------------------------------------------------------------------------------------------

/**
 * Which IR construct a model type's own picture is a projection OF, or that it has none.
 *
 * **This is the relation `DESIGN-render-rules-261004.md` §A.2 found missing.** The registry declares
 * three model types and says nothing about rendering; `src/render/` knows two scene subjects and
 * nothing about model types; *"the two vocabularies have never been related."* A cross-model canvas
 * cannot ask "do these panels present this binding's two domains?" without the relation, so it is
 * declared here.
 *
 * **Why it is a `Record` and why it is data.** A `Record<ModelTypeId, …>` is total in both
 * directions at compile time: a missing key fails, and a key for a type that does not exist fails
 * too. That is rung 1 of §B.1 held by `tsc` and by no test. And it is DATA rather than a function
 * table because §B.2's measurement forbids anything else here — a render declaration that named a
 * renderer, or even the renderer's types, would draw an import edge the gate refuses.
 *
 * **Why it names an IR construct and not `SceneSubjectKind`'s spelling.** The two unions are
 * isomorphic today and need not stay so; §B.2 asks for kernel vocabulary so the relation survives a
 * renderer that grows a third scene. `subject` holds the renderer's own tag because this module is
 * already licensed to see it.
 *
 * **The `none` arm is the design's load-bearing move, not a concession.** §F establishes that the
 * sequencing runs opposite to the way the spec reads: a quantitative model is not an addressable
 * construct — `system.quantities` is a flat map of annotations whose targets point at the other two
 * (`src/ir/types.ts`) — so a quantitative projection has nothing to be a projection of. Declaring
 * that makes the gap a value a reviewer reads. The day quantities are scoped to a model, this arm
 * becomes a `scene` arm and `executions-selected-by-behaviour` draws with no other edit to this
 * module. The compiler schedules the work.
 */
export type SceneConstruct =
  | { readonly kind: "scene"; readonly subject: SceneSubject["kind"] }
  | { readonly kind: "none"; readonly why: string };

export const SCENE_CONSTRUCTS: Readonly<Record<ModelTypeId, SceneConstruct>> = {
  "structural-graph": { kind: "scene", subject: "model" },
  "state-machine": { kind: "scene", subject: "machine" },
  "quantitative-model": {
    kind: "none",
    why: "a quantitative model is not an addressable construct in v0.1 — `system.quantities` is a "
      + "flat top-level map of annotations whose targets name entities, states, transitions and "
      + "models, so there is no quantitative subject for a picture to be a picture of. The "
      + "structural extractor over a heuristically chosen host is the fallback the spec forbids, "
      + "so this type draws nothing rather than borrowing another type's reduction. Scoping "
      + "quantities to a model is the prerequisite, and `src/ir/types.ts` already anticipates it",
  },
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
      return `a ${reason.domain.label} has no picture of its own: ${reason.why}`;
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

/** Space between panel frames. Wide enough that a label at the midpoint clears both frames. */
const GUTTER = 150;
/** The type band above each panel — §23.3's `-------- STRUCTURE --------` header. */
const BAND = 26;
/** Frame padding around a panel's own viewBox. */
const PAD = 10;
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

/** Where a line from `toward` meets the frame's border. Deterministic, and never inside the box. */
function borderPoint(frame: Rect, toward: Point): Point {
  const cx = frame.x + frame.w / 2;
  const cy = frame.y + frame.h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx === 0 ? Infinity : (frame.w / 2) / Math.abs(dx);
  const sy = dy === 0 ? Infinity : (frame.h / 2) / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
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
        out.push({
          relation,
          from: { ...a, point: pointFor(a, sp, b.point) },
          to: { ...b, point: pointFor(b, tp, a.point) },
        });
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
  readonly point: Point;
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
      anchor,
      panel: panel.key,
      id,
      label: panel.view.accessible.title,
      point: { x: panel.frame.x + panel.frame.w / 2, y: panel.frame.y + panel.frame.h / 2 },
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
    point: {
      x: panel.origin.x + node.rect.x + node.rect.w / 2,
      y: panel.origin.y + node.rect.y + node.rect.h / 2,
    },
  };
}

/** A panel anchor is clipped to its frame border so the line arrives at the boundary, not inside it. */
function pointFor(draft: AnchorDraft, panel: CrossModelPanel, toward: Point): Point {
  return draft.anchor === "panel" ? borderPoint(panel.frame, toward) : draft.point;
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
    const frame: Rect = {
      x: cursor, y: 0, w: box.w + 2 * PAD, h: box.h + 2 * PAD + BAND,
    };
    panels.push({
      key: panelKey(subject),
      type,
      subject,
      view,
      frame,
      origin: { x: frame.x + PAD - box.x, y: frame.y + BAND + PAD - box.y },
    });
    cursor = frame.x + frame.w + GUTTER;
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
      d: `M ${n2(c.from.point.x)} ${n2(c.from.point.y)} L ${n2(c.to.point.x)} ${n2(c.to.point.y)}`,
      class: `mage-xmodel${c.relation.kind === "composition" ? " mage-xmodel-composition" : ""}`,
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

function bundleLabelGroup(bundle: Bundle, index: number): SvgNode {
  const base = connectionLabel(bundle.relation);
  const label = bundle.members.length === 1 ? base : `${base} (${bundle.members.length})`;
  const cx = mean(bundle.members.flatMap((c) => [c.from.point.x, c.to.point.x]));
  const cy = mean(bundle.members.flatMap((c) => [c.from.point.y, c.to.point.y]));
  // Two bundles between one pair of panels would stack their plates on one coordinate, which is the
  // collision the renderer's own label reservation exists to prevent. Offset by bundle index.
  const y = cy + index * 22;
  const extent = textExtent(label, LABEL_CLASS);
  return el("g", {
    "data-xmodel-label": bundle.relation.entry.name,
    "data-xmodel-kind": bundle.relation.kind,
    "data-xmodel-count": bundle.members.length,
  }, [
    el("rect", {
      x: cx - extent.w / 2 - 5, y: y - extent.h, width: extent.w + 10, height: extent.h + 6,
      rx: 3, class: "mage-xmodel-label-plate",
    }),
    el("text", { x: cx, y: y + 3, class: `${LABEL_CLASS} mage-xmodel-label`, "text-anchor": "middle" },
      [], label),
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
  const right = Math.max(0, ...panels.map((p) => p.frame.x + p.frame.w));
  const bottom = Math.max(0, ...panels.map((p) => p.frame.y + p.frame.h));
  // Room below the frames for a plate pushed down by the bundle-index offset, so a second bundle's
  // label is inside the viewBox rather than clipped by it.
  const slack = bundled.length * 22 + PAD;
  const titleId = "mage-xmodel-title";
  const descId = "mage-xmodel-desc";
  return el("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: `${-PAD} ${-PAD} ${right + 2 * PAD} ${bottom + 2 * PAD + slack}`,
    width: right + 2 * PAD,
    height: bottom + 2 * PAD + slack,
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
    el("g", { "data-layer": "cross-model" }, connections.map(connectionLine)),
    el("g", { "data-layer": "cross-model-labels" }, bundled.map(bundleLabelGroup)),
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
      return `a ${r.type.label} has no picture of its own, so "${r.id}" is not drawn: ${r.why}`;
    case "subject-not-declared":
      return `this system declares no ${r.subject.kind} "${r.subject.id}", so the `
        + `${r.type.label} panel states the absence rather than drawing an empty picture`;
  }
}
