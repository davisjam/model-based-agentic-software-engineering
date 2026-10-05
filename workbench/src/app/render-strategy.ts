/**
 * The dispatcher that turns a declared render strategy into a picture request.
 *
 * **Why this module exists, and why here.** `DESIGN-render-rules-261004.md` §A.2 measured the gap:
 * the model-type registry *"declares three model types and says nothing about rendering"*, the
 * renderer *"knows two subject kinds and nothing about model types"*, and *"the two vocabularies
 * have never been related."* `ModelType.renderStrategy` is now the relation, and this is where it
 * is read. §B.2 settles the address by measurement rather than taste: `app-services` is the only
 * component the declared dependency graph gives edges to BOTH the renderer and the engine
 * (`app-rend` and `app-qe`), and it already owns the render seam.
 *
 * **What the compiler holds here — rung 3.** `pictureRequestFor` switches on the declaration's
 * construct with **no `default` arm** and a declared return type that excludes `undefined`. A
 * fourth `RenderConstruct` therefore makes this module red (TS2366, *"function lacks ending return
 * statement and return type does not include 'undefined'"*) rather than silently falling through to
 * a generic picture. That is what replaces §22.4's *"there should be no generic
 * `renderAnythingAsGraph()` fallback"* with a type error. The same shape holds `CONSTRUCT_SCENES`:
 * a `Record` over `RenderConstruct` is total in both directions, so a new construct must answer
 * whether it anchors on a node-link canvas.
 *
 * **What it does NOT hold, stated so nobody reads it as more.** Nothing here checks that the
 * `projection` prose is TRUE of the drawing. Rung 4 — that each declared strategy is the one the
 * code runs — is a test (`test/render-strategy.test.ts`), and the residue above it, that the
 * sentence describes the reduction a reader actually sees, is read by a person.
 *
 * **One positional choice survives, and it is a different one.** Picking WHICH model or machine a
 * Learn card exemplifies takes the system's first, which is a position. It is not the behaviour
 * §22.3 forbids: that was choosing which CONSTRUCT to draw, so a type borrowed another type's
 * reduction. Choosing among several instances of the construct a type actually declares decides
 * which example a reader sees, never what kind of picture they are shown. `exemplarSelection`
 * names it rather than leaving it to be re-discovered.
 */
import type { CanonicalSystem, Dimension } from "../ir/types.ts";
import {
  MODEL_TYPES,
  type ModelType, type ModelTypeId, type RenderConstruct, type RenderStrategy,
} from "../engine/model-types.ts";
import type { SceneSubject } from "../render/index.ts";

// --------------------------------------------------------------------------------------------
// What a construct draws as
// --------------------------------------------------------------------------------------------

/**
 * Whether a construct draws as a node-link SCENE, and if not, why not.
 *
 * This is the canvas's question, not the registry's. A cross-model canvas composes N rendered
 * panels and draws a line between anchors in two of them, so it needs to know which constructs
 * yield a panel with nodes to anchor on. A construct can have a perfectly good projection and
 * still answer `none` here — which is exactly the quantitative case, and keeping the two questions
 * apart is what stops "has no picture" and "has no node to end a line on" from being conflated
 * again.
 */
export type SceneConstruct =
  | { readonly kind: "scene"; readonly subject: SceneSubject["kind"] }
  | { readonly kind: "none"; readonly why: string };

/**
 * Every IR construct, classified. Total over `RenderConstruct` by `Record`, so a new construct
 * cannot land without answering here.
 *
 * **The quantitative row's reason changed, and the old one had become false.** It used to read
 * that a quantitative model *"is not an addressable construct in v0.1"* and that
 * `system.quantities` is *"a flat top-level map of annotations"* with *"no quantitative subject for
 * a picture to be a picture of."* `CanonQuantitativeModel` made that wrong: the subject is
 * addressable, the type has its own projection, and the Learn page draws it. What remains true is
 * narrower and is the only part a canvas needs.
 */
export const CONSTRUCT_SCENES: Readonly<Record<RenderConstruct, SceneConstruct>> = {
  model: { kind: "scene", subject: "model" },
  machine: { kind: "scene", subject: "machine" },
  "quantitative-model": {
    kind: "none",
    why: "a quantitative model is addressable and HAS its own projection — a budget, drawn as "
      + "extent against a declared threshold. What it has no part of is topology: a budget's "
      + "figures are allocations and a margin, so there is no node for a cross-model line to end "
      + "on and no panel geometry for one to be routed through. The projection is not missing; it "
      + "is not a node-link scene, which is a different fact and the one this canvas turns on",
  },
};

/** How a construct's exemplar instance is chosen — named, because it is a choice. */
export type ExemplarSelection = "first-declared" | "prefers-a-declared-ceiling";

// --------------------------------------------------------------------------------------------
// The dispatch
// --------------------------------------------------------------------------------------------

/**
 * What a picture is OF, per instance: a scene over a named subject, or a budget over a dimension.
 *
 * Two arms because `src/render/` offers two projections, and `renderBudget` is *"a SECOND
 * projection beside the scene one, not a third scene arm: a budget's facts are extent and a
 * threshold, and neither reads as a node or an edge."* Both keep the renderer's one contract — the
 * picture is unobtainable without its accessible twin.
 */
export type PictureRequest =
  | { readonly kind: "scene"; readonly subject: SceneSubject }
  | { readonly kind: "budget"; readonly dimension: Dimension };

const typeById = new Map<ModelTypeId, ModelType>(MODEL_TYPES.map((t) => [t.id, t]));

/** A model type's declared strategy, by id. Throws on an id the registry does not carry. */
export function renderStrategyFor(typeId: ModelTypeId): RenderStrategy {
  const t = typeById.get(typeId);
  if (t === undefined) throw new Error(`no registered model type ${typeId}`);
  return t.renderStrategy;
}

/** Whether a model type's own picture is a node-link scene, derived from its declaration. */
export function sceneConstructFor(typeId: ModelTypeId): SceneConstruct {
  const strategy = renderStrategyFor(typeId);
  return strategy.kind === "nonvisual"
    ? { kind: "none", why: strategy.why }
    : CONSTRUCT_SCENES[strategy.construct];
}

/**
 * The picture a model type's exemplar shows, over this system — or `null` when the system declares
 * no instance of the type's construct.
 *
 * **Exhaustive over `RenderConstruct`, by the compiler.** No `default`, and the return type
 * excludes `undefined`, so a new construct breaks the build here. The `nonvisual` arm returns
 * `null` for a different reason from the others: not "this system has none" but "this type has no
 * picture at all", which is why the two are not merged.
 */
export function pictureRequestFor(
  typeId: ModelTypeId,
  system: CanonicalSystem,
): PictureRequest | null {
  const strategy = renderStrategyFor(typeId);
  if (strategy.kind === "nonvisual") return null;
  switch (strategy.construct) {
    case "model": {
      const id = [...system.models.keys()][0];
      return id === undefined ? null : { kind: "scene", subject: { kind: "model", id } };
    }
    case "machine": {
      const id = [...system.machines.keys()][0];
      return id === undefined ? null : { kind: "scene", subject: { kind: "machine", id } };
    }
    case "quantitative-model": {
      // Preferring a dimension WITH a declared ceiling, because a budget teaches what a bare total
      // cannot: the margin is the fact the accounting rules exist to make obvious. A dimension with
      // no ceiling is still a legal quantitative model and still renders, as a total.
      const models = [...system.quantitativeModels.values()];
      const chosen = models.find((m) => m.budget !== null) ?? models[0];
      return chosen === undefined ? null : { kind: "budget", dimension: chosen.dimension };
    }
  }
}

/**
 * How `pictureRequestFor` picks the instance, per construct. Total over `RenderConstruct`, and
 * exported so the correspondence test can assert the choice it declares is the choice it makes.
 */
export const EXEMPLAR_SELECTION: Readonly<Record<RenderConstruct, ExemplarSelection>> = {
  model: "first-declared",
  machine: "first-declared",
  "quantitative-model": "prefers-a-declared-ceiling",
};
