/**
 * The Learn page's content model, derived — no DOM, no hand-written capability prose.
 *
 * UX-I9 says a Learn entry derives from the same model-type definition the workbench uses. This
 * module assembles everything a Learn section shows, and every capability fact comes from a source
 * the kernel itself consults or ships:
 *
 *   - the entries, questions, property families, omissions, compositions, schema citations and
 *     refusal prose: the model-type registry, through `deriveLearnEntries` / `MODEL_TYPE_USES`;
 *   - the visuals' subjects: the shipped examples, chosen by the registry's own `presentIn`
 *     predicate over the canonical systems — the first shipped example that instantiates the type;
 *   - "what it preserves" and "try asking": the exemplar's declared `purpose` and saved queries,
 *     read from the canonical system, never restated;
 *   - the composition grounding: the shipped examples that declare BOTH members of a pairing,
 *     computed by `presentTypes` — a pairing with no shipped grounding renders without a
 *     "see it live" pointer rather than with an invented one.
 *
 * What is NOT derived, stated plainly: section labels ("Properties you can measure", "Combine
 * with") and operating instructions for the page's own controls. Those name page furniture, not
 * kernel capability. Anything that claims what MAGE supports comes from the sources above.
 */
import type { CanonicalSystem, Purpose } from "../ir/types.ts";
import type { Query } from "../engine/types.ts";
import { absentSubstrateProse, MODEL_TYPES, type ModelTypeId } from "../engine/model-types.ts";
import type { SceneSubject } from "../render/types.ts";
import {
  anchorForType, anchorForUse, deriveLearnEntries, MODEL_TYPE_USES, presentTypes,
  type LearnEntry, type ModelTypeUse,
} from "../app/learn.ts";
import { SHIPPED_EXAMPLE_IDS, type ShippedExampleId } from "../app/examples.ts";

/** Every shipped example's canonical system, keyed by id. The page loads these once. */
export type LoadedSystems = ReadonlyMap<ShippedExampleId, CanonicalSystem>;

/** The subject a card's visual renders: a real subject in a shipped example, never an illustration. */
export interface ExemplarVisual {
  readonly example: ShippedExampleId;
  readonly subject: SceneSubject;
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
 * The visual's subject for a model type: the first shipped example whose system instantiates the
 * type (the registry's own `presentIn`, through `presentTypes`), then the first declared subject.
 *
 * The quantitative type has no scene of its own — v0.1's quantities ANNOTATE a subject rather than
 * being one (the registry's SEMANTICS citation says so) — so its visual renders the substrate the
 * annotations name: the model a `model:`-targeted quantity declares its ceiling against, falling
 * back to the system's first model or machine.
 */
export function exemplarFor(typeId: ModelTypeId, systems: LoadedSystems): ExemplarVisual | null {
  for (const example of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(example);
    if (system === undefined || !presentTypes(system).includes(typeId)) continue;
    const subject = subjectFor(typeId, system);
    if (subject !== null) return { example, subject };
  }
  return null;
}

function subjectFor(typeId: ModelTypeId, system: CanonicalSystem): SceneSubject | null {
  const firstModel = [...system.models.keys()][0];
  const firstMachine = [...system.machines.keys()][0];
  switch (typeId) {
    case "structural-graph":
      return firstModel === undefined ? null : { kind: "model", id: firstModel };
    case "state-machine":
      return firstMachine === undefined ? null : { kind: "machine", id: firstMachine };
    case "quantitative-model": {
      const ceiling = [...system.quantities.values()]
        .find((q) => q.target.kind === "model" && system.models.has(q.target.ref));
      if (ceiling !== undefined) return { kind: "model", id: ceiling.target.ref };
      if (firstModel !== undefined) return { kind: "model", id: firstModel };
      return firstMachine === undefined ? null : { kind: "machine", id: firstMachine };
    }
  }
}

/** The declared purpose of the subject a visual renders, from the system itself. */
export function purposeOf(system: CanonicalSystem, subject: SceneSubject): Purpose | null {
  return (subject.kind === "model"
    ? system.models.get(subject.id)?.purpose
    : system.machines.get(subject.id)?.purpose) ?? null;
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
      purpose: visual === null || system === undefined ? null : purposeOf(system, visual.subject),
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
      visual: { example: shipped, subject },
      purpose: purposeOf(system, subject),
      showProperties: [...names].sort(),
      statements: propertyJoinStatements(system),
    };
  });
}
