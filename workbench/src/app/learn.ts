/**
 * Learn entries, derived from the model-type registry (UX-I9).
 *
 * UX-I9: every public model type SHALL have a Learn entry derived from the same model-type
 * definition the workbench uses. This module is that derivation and nothing else — no DOM, no
 * prose of its own about what a type supports. The question, the property families, the schema
 * authorities, the omissions and the composition all come from `src/engine/model-types.ts`, the
 * registry the kernel's query dispatch consults; a Learn page rendered from these entries
 * therefore cannot describe a capability the kernel does not gate on.
 *
 * ## The four-cards question, settled on a second axis
 *
 * The author's gallery sketch shows four cards; the kernel has three model types. The fourth,
 * "Data / Policy Model", is not a type: Message Bus's `data-policy` is an entry in
 * `system.models` — a structural graph whose contribution is properties over an ordered-enum
 * domain, joined across models by shared identity. Shipping it as a fourth TYPE card would assert
 * a kernel distinction that does not exist, which is the drift UX-I9 exists to prevent.
 *
 * So the gallery has two axes, and the entry shape says which axis a card sits on:
 *
 *   - a TYPE card (`LearnEntry`) — one per registry entry, cardinality owned by the registry;
 *   - a USE card (`ModelTypeUse`) — a recognisable engineering purpose of a registered type,
 *     carrying `ofType` so the card must say what it is underneath. Its capability claims are the
 *     kernel features that make the purpose work, each cited the way a schema authority is.
 *
 * A use is app-layer pedagogy, not kernel semantics, which is why the uses live here and the
 * types live in the engine. Ruling and rejected alternatives:
 * `DECISIONS-RULED-model-types-261002.md`.
 */
import type { CanonicalSystem } from "../ir/types.ts";
import {
  MODEL_TYPES, type ModelType, type ModelTypeId, type SchemaAuthority,
} from "../engine/model-types.ts";

/** One Learn gallery card for a model TYPE. A projection of the registry entry, field for field. */
export interface LearnEntry {
  readonly id: ModelTypeId;
  readonly label: string;
  readonly question: string;
  readonly propertyFamilies: readonly string[];
  readonly schema: readonly SchemaAuthority[];
  readonly omits: readonly string[];
  readonly combineWith: {
    readonly partner: ModelTypeId;
    readonly partnerLabel: string;
    readonly richerQuestion: string;
  };
}

const byId = new Map<ModelTypeId, ModelType>(MODEL_TYPES.map((t) => [t.id, t]));

const entryOf = (t: ModelType): LearnEntry => {
  const partner = byId.get(t.combineWith.partner);
  if (partner === undefined) {
    // Unreachable while the registry test holds every partner to a registered id.
    throw new Error(`model type '${t.id}' composes with unregistered '${t.combineWith.partner}'`);
  }
  return {
    id: t.id,
    label: t.label,
    question: t.question,
    propertyFamilies: t.propertyFamilies,
    schema: t.schema,
    omits: t.omits,
    combineWith: {
      partner: partner.id,
      partnerLabel: partner.label,
      richerQuestion: t.combineWith.richerQuestion,
    },
  };
};

/** The gallery's type cards. One per registered model type — the registry owns the count. */
export const deriveLearnEntries = (): readonly LearnEntry[] => MODEL_TYPES.map(entryOf);

/**
 * A recognisable engineering PURPOSE of a registered type — the gallery's second axis.
 *
 * `enabledBy` cites the kernel features that make the purpose work, in the schema-authority shape,
 * so a use card's capability claims are checkable the same way a type card's are. `exemplar` names
 * a shipped model a reader can open, because a purpose with no instance is a promise rather than
 * a capability.
 */
export interface ModelTypeUse {
  readonly id: string;
  readonly label: string;
  readonly question: string;
  /** The kernel type this use IS. A use card must say so; that is the ruling. */
  readonly ofType: ModelTypeId;
  readonly enabledBy: readonly SchemaAuthority[];
  /** `<shipped-example-id>/<model-id>`, a model a reader can load and inspect. */
  readonly exemplar: string;
}

/**
 * The declared uses. One today, because one is what the shipped examples ground: the author's
 * "Data / Policy Model" card. A second use earns a row by shipping an exemplar, not by sounding
 * plausible.
 */
export const MODEL_TYPE_USES: readonly ModelTypeUse[] = [
  {
    id: "data-policy",
    label: "Data / Policy Model",
    question: "What information and permissions exist?",
    ofType: "structural-graph",
    enabledBy: [
      {
        file: "src/ir/types.ts", symbol: "DomainKind",
        role: "ordered-enum domains — 'internal < restricted' is declared order, not convention",
      },
      {
        file: "src/ir/types.ts", symbol: "PropertyValue",
        role: "entity properties carrying a domain, so sensitivity levels typecheck in comparisons",
      },
      {
        file: "src/engine/types.ts", symbol: "GraphWhere",
        role: "property constraints and cross-entity comparisons on structural queries — the join that finds restricted data reaching a service permitting only internal",
      },
    ],
    exemplar: "message-bus/data-policy",
  },
];

/**
 * The Learn entries a loaded system makes concrete: which types it declares, so a gallery can say
 * "this workspace has one of these" — and which it lacks, so a NOT ANSWERABLE refusal can link to
 * the entry for the absent type. Reads the same `presentIn` the kernel's dispatch gate reads.
 */
export const presentTypes = (system: CanonicalSystem): readonly ModelTypeId[] =>
  MODEL_TYPES.filter((t) => t.presentIn(system)).map((t) => t.id);
