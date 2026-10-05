/**
 * The Learn page's content model, derived — no DOM, no hand-written capability prose.
 *
 * UX-I9 says a Learn entry derives from the same model-type definition the workbench uses. This
 * module assembles everything a Learn section shows, and every capability fact comes from a source
 * the kernel itself consults or ships:
 *
 *   - the entries, questions, question forms, selectable subjects, omissions, compositions, schema
 *     citations and refusal prose: the model-type registry, through `deriveLearnEntries` /
 *     `MODEL_TYPE_USES`. BOTH arms of the query semantics since 261004: a form is a question the
 *     engine decides, a subject is a thing a question names, and `select` and `count` derive from
 *     the second arm only — so projecting `forms` alone left a shipped capability off the page
 *     (`DESIGN-v02-quantification-261004.md` §3.4, and `src/app/learn.ts`'s header for why the
 *     registry rather than the agent facade is where this page reads it);
 *   - the visuals' subjects: the shipped examples, chosen by the registry's own `presentIn`
 *     predicate over the canonical systems — the first shipped example that instantiates the type;
 *   - "what it preserves" and "try asking": the exemplar's declared `purpose` and saved queries,
 *     read from the canonical system, never restated;
 *   - the composition grounding: the shipped examples that declare BOTH members of a pairing,
 *     computed by `presentTypes` — a pairing with no shipped grounding renders without a
 *     "see it live" pointer rather than with an invented one;
 *   - the shipped examples' own fixtures, through `src/learn/fixtures.ts`: the requirement
 *     statements and the declared modifications the question sections (`src/learn/questions.ts`)
 *     need. This is the FIFTH source and it is not a widening — `src/app/examples.ts:12-29`
 *     established it, with the rationale that an example's `title` and `summary` are read rather
 *     than restated because a restatement is "free to drift from the thing it describes". Both
 *     blocks read there are CI-verified (`test/examples.test.ts`), so a figure quoted from one is a
 *     figure a gate re-derives.
 *
 * What is NOT derived, stated plainly: the section HEADINGS (the engineering questions the page is
 * organised around), the four-part progression's labels, and operating instructions for the page's
 * own controls. Those name page furniture, not kernel capability. Anything that claims what MAGE
 * supports comes from the sources above.
 */
import {
  ACCOUNTED_METRICS, type AccountedMetric, type CanonicalSystem, type Purpose,
} from "../ir/types.ts";
import type { Query } from "../engine/types.ts";
import { absentSubstrateProse, MODEL_TYPES, type ModelTypeId } from "../engine/model-types.ts";
import type { SceneSubject } from "../render/types.ts";
import { pictureRequestFor, type PictureRequest } from "../app/render-strategy.ts";
import {
  anchorForType, anchorForUse, deriveLearnEntries, MODEL_TYPE_USES, presentTypes,
  type LearnEntry, type ModelTypeUse,
} from "../app/learn.ts";
import { SHIPPED_EXAMPLE_IDS, type ShippedExampleId } from "../app/examples.ts";

/** Every shipped example's canonical system, keyed by id. The page loads these once. */
export type LoadedSystems = ReadonlyMap<ShippedExampleId, CanonicalSystem>;

/**
 * What a type's exemplar visual is a picture OF — the app layer's `PictureRequest`, under the name
 * the Learn page's own vocabulary gives it.
 *
 * Declared in `src/app/render-strategy.ts` rather than here, because the page is now a CONSUMER of
 * the relation between a model type and its projection instead of one of the two places that
 * stated it. It used to be the other way round: this file held the quantitative type's routing in a
 * `switch` arm, and the cross-model canvas held a second table that disagreed with it.
 */
export type ExemplarPicture = PictureRequest;

export interface ExemplarVisual {
  readonly example: ShippedExampleId;
  readonly picture: ExemplarPicture;
}

/** One saved property of the exemplar, by the statement its author gave it. */
export interface SavedStatement {
  readonly id: string;
  readonly label: string;
}

/** One quantitative annotation, quoted from the system that declares it. */
export interface QuantityRow {
  readonly id: string;
  /** The `kind:ref` target as written. */
  readonly target: string;
  readonly dimension: string;
  /** The declared magnitude, verbatim: "750 ms", "100 ms–500 ms". */
  readonly value: string;
}

export interface LearnTypeSection {
  readonly entry: LearnEntry;
  readonly anchor: string;
  /** Null only if no shipped example instantiates the type — a state a test refuses. */
  readonly visual: ExemplarVisual | null;
  /** The exemplar subject's declared purpose: its question, represents, omits. */
  readonly purpose: Purpose | null;
  /** The exemplar example's saved properties of this type's query kind. */
  readonly statements: readonly SavedStatement[];
  /** Non-empty only for the quantitative type: the annotations its exemplar declares. */
  readonly quantities: readonly QuantityRow[];
  /** The refusal the kernel produces when this type is absent — the NOT ANSWERABLE sentence. */
  readonly refusalProse: string;
  /** Shipped examples declaring BOTH this type and its composition partner. */
  readonly combinedIn: readonly ShippedExampleId[];
}

export interface LearnUseSection {
  readonly use: ModelTypeUse;
  readonly anchor: string;
  /** The label of the kernel type this use is underneath — the ruling's required sentence. */
  readonly ofTypeLabel: string;
  readonly visual: ExemplarVisual;
  readonly purpose: Purpose | null;
  /** Entity property names in the exemplar model, surfaced on the diagram. */
  readonly showProperties: readonly string[];
  /** Saved graph properties of the exemplar example that join entity properties — the use at work. */
  readonly statements: readonly SavedStatement[];
}

const queryKindOf = (id: ModelTypeId): Query["kind"] => {
  const t = MODEL_TYPES.find((m) => m.id === id);
  if (t === undefined) throw new Error(`'${id}' is not a registered model type`);
  return t.queryKind;
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * The exemplar's saved questions of one query kind, by authored name.
 *
 * Read from `SavedQuery.raw` with guards rather than re-parsed: a property with no `name` is shown
 * by id, and a raw that is not an object is skipped — the examples suite validates the fixtures;
 * this is presentation.
 */
export function savedStatements(system: CanonicalSystem, kind: Query["kind"]): readonly SavedStatement[] {
  const out: SavedStatement[] = [];
  for (const [id, q] of system.queries) {
    if (!isObject(q.raw) || q.raw["kind"] !== kind) continue;
    const name = q.raw["name"];
    out.push({ id, label: typeof name === "string" ? name : id });
  }
  return out;
}

/**
 * What a saved quantity question declares about a ceiling, read from its own `raw`.
 *
 * `within` holds a NAME, and a quantity question has no field a magnitude could go into instead:
 * `QuantityQuery.limit` is the state-exploration bound the evaluator defaults
 * (`src/quant/query.ts:102`), not a figure. So the only route from a question to a number runs
 * through resolving this id against `system.quantities`. The three-role section rests on that, which
 * is why it is read here rather than asserted there.
 *
 * Guarded like `propertyJoinStatements`, for its reason: the examples suite validates these
 * fixtures, so a raw that does not match the shape is skipped rather than thrown on.
 */
export interface CeilingQuestion {
  readonly id: string;
  /** The authored question text, or the id when the author gave none. */
  readonly label: string;
  /** The declared quantifier, read rather than assumed. */
  readonly quantifier: string;
  readonly metric: string;
  /** The `within:` id, which resolves to a declared quantity. */
  readonly ceiling: string;
  /** Whether the question narrows the executions it measures — the admitted composition's field. */
  readonly selects: boolean;
}

/** Every saved question of a system that decides a DECLARED ceiling: those declaring `within:`. */
export function ceilingQuestions(system: CanonicalSystem): readonly CeilingQuestion[] {
  const out: CeilingQuestion[] = [];
  for (const saved of savedStatements(system, "quantity")) {
    const raw = system.queries.get(saved.id)?.raw;
    if (!isObject(raw) || !isObject(raw["quantity"])) continue;
    const quantity = raw["quantity"];
    const within = quantity["within"];
    const metric = quantity["metric"];
    const quantifier = raw["quantifier"];
    if (typeof within !== "string" || typeof metric !== "string") continue;
    if (typeof quantifier !== "string") continue;
    out.push({
      id: saved.id, label: saved.label, quantifier, metric, ceiling: within,
      selects: quantity["target"] !== undefined,
    });
  }
  return out;
}

/** Saved graph properties whose `where` joins entity properties — the data-policy use, executable. */
export function propertyJoinStatements(system: CanonicalSystem): readonly SavedStatement[] {
  const joins: SavedStatement[] = [];
  for (const q of savedStatements(system, "graph")) {
    const raw = system.queries.get(q.id)?.raw;
    if (!isObject(raw) || !isObject(raw["graph"])) continue;
    const where = raw["graph"]["where"];
    if (isObject(where) && where["compare"] !== undefined) joins.push(q);
  }
  return joins;
}

/** The declared quantities, each quoted verbatim from the system. */
export function quantityRows(system: CanonicalSystem): readonly QuantityRow[] {
  return [...system.quantities.values()].map((q) => ({
    id: q.id,
    target: q.target.raw,
    dimension: q.dimensionRaw,
    value:
      q.value.kind === "point" ? q.value.magnitude.raw
      : q.value.kind === "range" ? `${q.value.low.raw}–${q.value.high.raw}`
      : q.value.kind === "expression" ? q.value.source
      : "(absent)",
  }));
}

/**
 * The visual for a model type: the first shipped example whose system instantiates the type (the
 * registry's own `presentIn`, through `presentTypes`), then the picture that system's declaration
 * asks for.
 *
 * ## What used to live here, and what reads the declaration now
 *
 * This function used to own a `switch` over `ModelTypeId` — the one place the relation between a
 * model type and its projection was written down on this surface. Its quantitative arm returned a
 * SCENE subject: the model a `model:`-targeted quantity declares its ceiling against, falling back
 * to the system's first model and then its first machine. The first step was declaration-driven;
 * the last two were positional, and all three ended in the structural extractor. §22.3 forbids
 * forcing quantities into the structural renderer and §22.4 forbids a generic fallback for a
 * registered model type, so the behaviour was prohibited even where the comment describing it was
 * accurate.
 *
 * That arm was already gone when the registry landed, replaced by a budget over an addressable
 * quantitative model. What was NOT gone is the reason it could happen: the type-to-projection
 * relation lived in a function body here, and a second copy lived in the cross-model canvas, and
 * the two had already drifted — this page drew a budget for the quantitative type while the canvas
 * reported it as having no picture, each carrying its own reason. Both read one declaration now
 * (`ModelType.renderStrategy`), dispatched in one place.
 */
export function exemplarFor(typeId: ModelTypeId, systems: LoadedSystems): ExemplarVisual | null {
  for (const example of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(example);
    if (system === undefined || !presentTypes(system).includes(typeId)) continue;
    const picture = pictureRequestFor(typeId, system);
    if (picture !== null) return { example, picture };
  }
  return null;
}

/** The declared purpose of the subject a visual renders, from the system itself. */
export function purposeOf(system: CanonicalSystem, subject: SceneSubject): Purpose | null {
  return (subject.kind === "model"
    ? system.models.get(subject.id)?.purpose
    : system.machines.get(subject.id)?.purpose) ?? null;
}

/**
 * The purpose a picture's own subject declares, whichever arm it is.
 *
 * A budget's subject is a quantitative model, which carries no `purpose` block of its own — so the
 * purpose cited is the HOST model's, the one its declared ceiling is written against. That is a
 * citation rather than a substitution: the host is named by `CanonQuantity.target.ref`, and the
 * omissions it lists ("operating modes, so no allocation's lifetime is represented") are exactly
 * what bounds the budget's claim.
 */
export function purposeOfPicture(system: CanonicalSystem, picture: ExemplarPicture): Purpose | null {
  if (picture.kind === "scene") return purposeOf(system, picture.subject);
  const host = system.quantitativeModels.get(picture.dimension)?.host;
  return host === null || host === undefined ? null : system.models.get(host)?.purpose ?? null;
}

/** Shipped examples declaring both types of a pairing — where the composition can actually be asked. */
export function groundedIn(a: ModelTypeId, b: ModelTypeId, systems: LoadedSystems): readonly ShippedExampleId[] {
  return SHIPPED_EXAMPLE_IDS.filter((id) => {
    const system = systems.get(id);
    if (system === undefined) return false;
    const present = presentTypes(system);
    return present.includes(a) && present.includes(b);
  });
}

/**
 * The quantitative question a system's OWN declared ceiling licenses, derived from the system.
 *
 * CORRECTED 261005: this header used to open *"no shipped example SAVES a quantity query — the
 * fixtures decide quantitative requirements through the suite"*, and that premise has not held for
 * some time. Five saved quantity questions ship (four in `document-processing`, one in
 * `embedded-sensor-node`), and two of them declare `within:` and are named by a requirement's
 * `expressed_as`. The derivation below is still needed, for a narrower reason than the one it was
 * given: two `document-processing` fixture rows name a declared ceiling through `declared_as` with no
 * saved question to run, so `decideRequirement` composes their question here. For a row that names a
 * saved one, the saved question is run instead and nothing is composed.
 *
 * A stale premise in this position is the expensive kind — it reads as license to hand-write what the
 * corpus already declares. See `ceilingQuestions` above for the reader the three-role section uses.
 *
 * This derives the question: a `model:`-targeted quantity names the
 * ceiling, and the metric comes from the engine's own dimension table (`ACCOUNTED_METRICS`), which
 * is the REVERSE of the lookup the evaluator performs. A dimension no path metric accounts falls
 * back to the metric that accounts none, which is how the configuration-scoped metric is reached
 * without naming it.
 *
 * `metrics` is passed IN rather than imported so the caller supplies the registry's own
 * `query.forms` for the quantitative type — the array the engine dispatches on, by reference. A
 * literal list here would be the copy this module's header forbids.
 *
 * `ceilingId` names WHICH declared ceiling to decide against, for a caller that has one in hand —
 * a requirement naming its own. Omitted, the first `model:`-targeted quantity is taken, which is
 * what a caller asking "what can this system be asked about cost at all" means. The metric is
 * derived from the chosen ceiling either way, so a named ceiling of a different dimension gets the
 * metric that accounts ITS dimension rather than the first one's.
 *
 * Extracted on the SECOND site rather than the third: `test/learn-content.test.ts` derived this
 * shape first, with a comment explaining why it had to be derived. The page needs the same
 * question, and two derivations of one question shape would be two answers to "what can this system
 * be asked about cost" — free to disagree on the day a second ceiling lands.
 *
 * `selection` is §4.3's one admitted COMPOSITION, and it is a parameter of this function rather
 * than a second builder for the same reason the paragraph above gives: the composed and uncomposed
 * questions must differ in exactly one field or a reader cannot tell what the composition did.
 * `QuantityQuery.target` is the field — the registry's `executions-selected-by-behaviour` row
 * cites it as "the reach predicate where a behavioural result enters a quantitative question" — so
 * passing a behavioural predicate here narrows the executions measured and changes nothing else.
 * Omitted, the question ranges over every execution, which is the contrast the page shows beside it.
 */
export function composedQuantityQuery(
  system: CanonicalSystem, metrics: readonly string[], ceilingId?: string, selection?: unknown,
): { readonly query: unknown; readonly metric: string; readonly ceiling: string } | null {
  const ceiling = [...system.quantities.values()].find(
    (q) => q.target.kind === "model" && (ceilingId === undefined || q.id === ceilingId));
  if (ceiling === undefined) return null;
  const accounts = (m: string): boolean => m in ACCOUNTED_METRICS;
  const metric =
    metrics.find((m) => accounts(m) && ACCOUNTED_METRICS[m as AccountedMetric] === ceiling.dimension)
    ?? metrics.find((m) => !accounts(m));
  if (metric === undefined) return null;
  return {
    query: {
      kind: "quantity", quantifier: "forall",
      quantity: {
        metric, within: ceiling.id,
        ...(selection === undefined ? {} : { target: selection }),
      },
    },
    metric,
    ceiling: ceiling.id,
  };
}

export function buildTypeSections(systems: LoadedSystems): readonly LearnTypeSection[] {
  return deriveLearnEntries().map((entry) => {
    const t = MODEL_TYPES.find((m) => m.id === entry.id);
    if (t === undefined) throw new Error(`entry '${entry.id}' has no registry row`);
    const visual = exemplarFor(entry.id, systems);
    const system = visual === null ? undefined : systems.get(visual.example);
    return {
      entry,
      anchor: anchorForType(entry.id),
      visual,
      purpose: visual === null || system === undefined ? null : purposeOfPicture(system, visual.picture),
      statements: system === undefined ? [] : savedStatements(system, queryKindOf(entry.id)),
      quantities:
        entry.id === "quantitative-model" && system !== undefined ? quantityRows(system) : [],
      refusalProse: absentSubstrateProse(t),
      combinedIn: groundedIn(entry.id, entry.combineWith.partner, systems),
    };
  });
}

export function buildUseSections(systems: LoadedSystems): readonly LearnUseSection[] {
  return MODEL_TYPE_USES.map((use) => {
    const [example, modelId] = use.exemplar.split("/");
    const shipped = SHIPPED_EXAMPLE_IDS.find((id) => id === example);
    if (shipped === undefined || modelId === undefined) {
      throw new Error(`use '${use.id}' names exemplar '${use.exemplar}', which is not <shipped-example>/<model>`);
    }
    const system = systems.get(shipped);
    if (system === undefined) throw new Error(`use '${use.id}': example '${shipped}' is not loaded`);
    const model = system.models.get(modelId);
    if (model === undefined) {
      throw new Error(`use '${use.id}': '${shipped}' declares no model '${modelId}'`);
    }
    const subject: SceneSubject = { kind: "model", id: modelId };
    const names = new Set<string>();
    for (const entityId of model.entities) {
      for (const prop of system.entities.get(entityId)?.properties.keys() ?? []) names.add(prop);
    }
    const ofType = MODEL_TYPES.find((m) => m.id === use.ofType);
    if (ofType === undefined) throw new Error(`use '${use.id}' is of unregistered type '${use.ofType}'`);
    return {
      use,
      anchor: anchorForUse(use.id),
      ofTypeLabel: ofType.label,
      visual: { example: shipped, picture: { kind: "scene", subject } },
      purpose: purposeOf(system, subject),
      showProperties: [...names].sort(),
      statements: propertyJoinStatements(system),
    };
  });
}
