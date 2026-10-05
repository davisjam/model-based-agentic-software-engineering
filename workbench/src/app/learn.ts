/**
 * Learn entries, derived from the model-type registry (UX-I9).
 *
 * UX-I9: every public model type SHALL have a Learn entry derived from the same model-type
 * definition the workbench uses. This module is that derivation and nothing else — no DOM, no
 * prose of its own about what a type supports. The question, the question forms, the schema
 * authorities, the omissions and the composition all come from `src/engine/model-types.ts`, the
 * registry the kernel's query dispatch consults; a Learn page rendered from these entries
 * therefore cannot describe a capability the kernel does not gate on.
 *
 * The forms this card lists are now `query.forms` — the registry's query semantics, where the
 * field used to be a `propertyFamilies` of its own. The card reads a declaration the kernel's
 * dispatcher, the agent facade and the inspector's contextual actions read too, which is what
 * makes "one declaration, two affordances" a fact about the code rather than a hope.
 *
 * ## Both arms of the query semantics, because one of them was carrying an invisible capability
 *
 * `QuerySemantics` has two arms and this projection read one. A FORM is a question the engine
 * decides; a SUBJECT is a thing a question names. `select` and `count` derive from the subject arm
 * and from no form at all — `DESIGN-v02-quantification-261004.md` §3.4 rules them "the cardinality
 * of a subject enumeration ... the same derivation arm, one step further" — so a card projecting
 * `forms` alone described everything the kernel DECIDES and nothing it lets a question NAME. An
 * agent could enumerate a system's entities by property constraints; a student reading Learn had no
 * way to find out the capability existed.
 *
 * Reading `query.subjects` fixes that at the source the gallery already derives from, which is a
 * stronger position than the one the design proposed. The design's Phase 2 asked for a SECOND
 * derivation source, the agent facade's `MODEL_FACADE` table, "which already carries its registry
 * grounding" — and the grounding it carries is this field: the `elements` row derives from
 * `{ from: "query-subject", noun: "entity", selector: "property-constraints" }`, whose matching
 * declaration is the structural type's own `subjects` entry. The facade maps an API method onto
 * that declaration; Learn needs the declaration. Taking it here is the same fact one hop closer to
 * the kernel, with no second source to keep in agreement.
 *
 * The facade route is also closed, and by architecture rather than by preference.
 * `models/workbench-components.mage.yaml` resolves `src/app/agent-api.ts` to `agent-adapter` under
 * its longest-prefix rule, draws no `learn-page → agent-adapter` edge, and its `depends-on` absence
 * clause reads "an edge that is not drawn here is an edge the implementation may not create" —
 * which `test/import-graph.test.ts` holds against every import in the tree. Measured, with the
 * import in place, at the commit before this one: the gate names the edge and says it is "either a
 * dependency to undo or an architecture decision to make and draw." Undone, because the registry
 * carries the same grounding and the Learn page is already permitted to read it.
 *
 * ## The pairing is navigation, and the relationship beside it is not
 *
 * `combineWith` stays what §4.1 calls it — Learn-page navigation, not a semantic relationship — so
 * the projection carries it unchanged. What it gained is a neighbour: the bindings and compositions
 * the KERNEL declares between the card's type and its pairing partner, read from `BINDINGS` and
 * `COMPOSITIONS`. That is §23.2's rule, and the two halves have to travel together or the card
 * teaches the thing §23.2 forbids: *"do not teach students that every line between two models is a
 * join."* A pointer with no kind beside it is such a line. A pointer whose kind is read off the
 * registry is a route plus a fact, and the fact for one of the three cards is that the kernel
 * declares nothing between those two domains at all.
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
  BINDINGS, COMPOSITIONS, MODEL_TYPES,
  type BindingSemantics, type CompositionSemantics,
  type ModelType, type ModelTypeId, type QuerySubject, type SchemaAuthority,
} from "../engine/model-types.ts";
import type { RefusalDetail } from "../engine/types.ts";

/** One Learn gallery card for a model TYPE. A projection of the registry entry, field for field. */
export interface LearnEntry {
  readonly id: ModelTypeId;
  readonly label: string;
  readonly question: string;
  /** The question forms the type answers, held BY REFERENCE to `ModelType.query.forms`. */
  readonly forms: readonly string[];
  /**
   * What a question of this type may NAME and select, BY REFERENCE to `ModelType.query.subjects`.
   *
   * The other arm of the same declaration, and each entry carries its own `declaredBy` role — the
   * sentence saying how that noun is named and what it is. So a card can show the arm without this
   * module wording anything: the state machine's `state` subject says in the registry's own words
   * that a state is named inside a predicate and "never selected on its own", which is the honesty
   * a hand-written list of nouns would have had to remember.
   */
  readonly subjects: readonly QuerySubject[];
  readonly schema: readonly SchemaAuthority[];
  readonly omits: readonly string[];
  readonly combineWith: {
    readonly partner: ModelTypeId;
    readonly partnerLabel: string;
    readonly richerQuestion: string;
    /**
     * The relationships the KERNEL declares between this type and the partner — §23.2's "display
     * its actual semantic kind" half, as `BINDINGS` / `COMPOSITIONS` rows held BY REFERENCE.
     *
     * The pairing itself is navigation (§4.1, and `ModelType.combineWith`'s own doc comment says
     * so), which leaves a card with a line between two model forms and nothing to say about what
     * that line MEANS. §23.2 forbids the easy answer — *"do not teach students that every line
     * between two models is a join"* — and gives the honest one: once a relationship is
     * established, show its registered kind, `bound by: machine-of-entity`. These two arrays are
     * that, derived: whichever registry entries run between the two domains, in the registry's own
     * order, and an EMPTY pair is the informative case rather than a gap — the structural ↔
     * quantitative pairing is a route through the Learn page and nothing the kernel declares.
     *
     * Filtered here rather than in the engine because `bindingsOf` / `compositionsOf` ask "which
     * touch this type", and a card asks the narrower "which run between these two". A fresh array
     * either way (the V18 recompute discipline), so the identity that matters is the ENTRY's: each
     * element is the registry object, never a projection of one.
     */
    readonly bindings: readonly BindingSemantics[];
    readonly compositions: readonly CompositionSemantics[];
  };
}

/** The registry entries running between two domains, either direction. Recomputed, never stored. */
const between = <T extends { readonly from: ModelTypeId; readonly to: ModelTypeId }>(
  rows: readonly T[], a: ModelTypeId, b: ModelTypeId,
): readonly T[] => rows.filter((r) => (r.from === a && r.to === b) || (r.from === b && r.to === a));

/** The bindings the kernel declares between two model types. §23.2's `bound by:` line. */
export const bindingsBetween = (a: ModelTypeId, b: ModelTypeId): readonly BindingSemantics[] =>
  between(BINDINGS, a, b);

/** The compositions the kernel declares between two model types. §23.2's `composed by:` line. */
export const compositionsBetween = (a: ModelTypeId, b: ModelTypeId): readonly CompositionSemantics[] =>
  between(COMPOSITIONS, a, b);

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
    forms: t.query.forms,
    subjects: t.query.subjects,
    schema: t.schema,
    omits: t.omits,
    combineWith: {
      partner: partner.id,
      partnerLabel: partner.label,
      richerQuestion: t.combineWith.richerQuestion,
      bindings: bindingsBetween(t.id, partner.id),
      compositions: compositionsBetween(t.id, partner.id),
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

// --------------------------------------------------------------------------------------------
// Addresses on the Learn page — declared beside the derivation, so the page and every caller
// that links into it (the gallery nav, the NOT ANSWERABLE panel) share one spelling.
// --------------------------------------------------------------------------------------------

/** The Learn page, relative to the served workbench root. */
export const LEARN_PAGE = "learn.html";

/** The fragment id of a type's section on the Learn page. */
export const anchorForType = (id: ModelTypeId): string => `type-${id}`;

/** The fragment id of a use's section on the Learn page. */
export const anchorForUse = (id: string): string => `use-${id}`;

/** A link from anywhere in the workbench to one Learn entry. */
export const learnHrefForType = (id: ModelTypeId): string => `${LEARN_PAGE}#${anchorForType(id)}`;

/** What a NOT ANSWERABLE panel renders when the refusal names an absent model type. */
export interface LearnLink {
  readonly typeId: ModelTypeId;
  /** "Learn about quantitative models" — the requirement's own link text, from the registry label. */
  readonly text: string;
  readonly href: string;
}

/**
 * The refusal-to-Learn join (UX-I9's NOT ANSWERABLE sketch).
 *
 * A `missing-model-type` refusal carries the absent type's label in `missing` — put there by
 * `runTypedQuery` from the same registry entry a Learn section renders. This resolves the label
 * back to the entry, so the panel that shows the refusal can link to the one page that says what
 * declaring the type takes. Returns null for every other refusal: a typo hunt or a purposeful
 * omission has its own remedy, and a Learn link there would misdirect.
 */
export function learnLinkForRefusal(detail: RefusalDetail | null): LearnLink | null {
  if (detail === null || detail.reason !== "missing-model-type") return null;
  const t = MODEL_TYPES.find((m) => detail.missing.includes(m.label));
  if (t === undefined) return null;
  return {
    typeId: t.id,
    text: `Learn about ${t.label}s`,
    href: learnHrefForType(t.id),
  };
}
