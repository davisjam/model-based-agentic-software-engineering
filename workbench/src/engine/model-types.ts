/**
 * The model-type registry — the kernel's own census of what a "model" can BE here (UX-I9).
 *
 * The kernel distinguishes three model types, and until this module it did so without ever saying
 * so: structural models live in `system.models`, state machines in `system.machines`, the
 * quantitative model in `system.quantities` + `system.accounting`, and the query dispatcher, the
 * form vocabularies and the per-type evaluators each encode the split separately. A Learn gallery
 * built on that would have to re-derive the census by hand — the "hand-maintained brochure" the
 * UX-I9 caution names. This registry is the census as one typed object, and it earns its place the
 * way `capabilities.ts` did: by being CONSULTED, not merely readable.
 *
 * **Where the kernel consults it.** `runTypedQuery` (engine/index.ts) looks the asked query's kind
 * up here and refuses — before any evaluator runs — when the system declares no substrate of that
 * type. That rung fixes a live defect: a `latency` measurement over a system declaring no
 * quantities answered `holds` with a magnitude of 0 ms, a number that looked measured and was
 * fabricated (the charge table was empty, so every trace totalled zero). The same shape held for
 * `peak_memory` (0 MB) and for behavioural questions of a machineless system (`deadend` held,
 * exhaustively, over the one empty configuration). The honest answer is the one the refusal
 * doctrine already prescribes for purposeful omission: name what is absent and what declaring it
 * would take. The prose comes from this registry, so the refusal a user reads and the Learn entry
 * they are sent to describe the same thing by construction.
 *
 * **What an entry does NOT do: restate a schema.** Each type's shape is already defined, once, in
 * code — `CanonModel` / `CanonMachine` / `CanonQuantity` in `src/ir/types.ts`, the matching
 * top-level sections of `mage-model.schema.json`, the prose in `SEMANTICS.md`. An entry CITES
 * those authorities (`schema`); it never copies a field list, because a copied shape is a second
 * source of truth one field-rename away from lying. The question vocabulary is held the same way:
 * `query.forms` is the engine's own form array BY REFERENCE (`GRAPH_FORMS`, `BEHAVIOR_FORMS`,
 * `REQUIREMENT_METRICS`), so a form added to the engine appears in every Learn entry without
 * anyone remembering to.
 *
 * **Three classes of semantics, two of them here.** A model type carries structural semantics (what
 * can be represented), QUERY semantics (what questions can meaningfully be asked), and validation
 * semantics (what counts as well formed). The first is cited — `schema`. The second is declared —
 * `query`, see `QuerySemantics` below. Ruling: `DECISIONS-RULED-model-query-261002.md` Extension 1.
 *
 * **Three types, not four.** The author's Learn sketch shows a fourth card, "Data / Policy Model".
 * The kernel has no such type: Message Bus's `data-policy` is an entry in `system.models` whose
 * contribution is properties over an ordered-enum domain — a structural graph used for a policy
 * purpose. Purposes are a second axis, and they live in the app layer (`src/app/learn.ts`), each
 * bound to a kernel type declared here. Ruling: `DECISIONS-RULED-model-types-261002.md`.
 */
import type { CanonicalSystem } from "../ir/types.ts";
import {
  BEHAVIOR_FORMS, GRAPH_COMPOSING, GRAPH_FORMS, ORDER_OPS, detail, unlicensed,
  type Query, type Verdict,
} from "./types.ts";
import { REQUIREMENT_METRICS } from "../quant/requirement.ts";

/** Every public model type. The list is closed; adding one is a deliberate act. */
export type ModelTypeId = "structural-graph" | "state-machine" | "quantitative-model";

/**
 * A pointer at the place a shape is actually DEFINED. The registry's job is to say where the
 * authority is, not to be one; `role` says what the cited symbol is authoritative FOR, so two
 * citations on one type cannot silently cover the same ground.
 */
export interface SchemaAuthority {
  /** Repo-relative path, from the workbench root. A test asserts it exists. */
  readonly file: string;
  /** The exported symbol, schema key, or section heading. A test asserts the file contains it. */
  readonly symbol: string;
  readonly role: string;
}

// --------------------------------------------------------------------------------------------
// Query semantics — what questions can meaningfully be asked of a type
// --------------------------------------------------------------------------------------------

/**
 * The nouns a question may name, drawn from the metamodel rather than from the store.
 *
 * The ruling's test for this vocabulary: a name that only makes sense once you know there is a
 * triple store underneath has failed. An author asks about entities, relation types, models,
 * machines, states, variables, transitions, executions, quantities and ceilings — every one of
 * those words survives a reader who never learns how a model is stored. The list is closed so a
 * facade can switch on it exhaustively.
 */
export type QueryNoun =
  | "entity" | "relation type" | "model"
  | "machine" | "state" | "variable" | "transition"
  | "execution" | "quantity" | "ceiling";

/**
 * How a question picks instances of a noun out.
 *
 * Each spelling IS an engine construct the caller must build — a declared identifier, a
 * `PropConstraint` list, a `Predicate`, or a `TransitionSelector`-shaped partial match on declared
 * fields — so the selector tells a facade which grammar to offer, not merely that something is
 * selectable. `searchable: true` would have said the second and nothing of the first.
 */
export type SubjectSelector = "by-id" | "property-constraints" | "predicate" | "selector";

export interface QuerySubject {
  readonly noun: QueryNoun;
  readonly selector: SubjectSelector;
  /** Where the noun's shape is defined. The registry points; it is never the authority. */
  readonly declaredBy: SchemaAuthority;
}

/**
 * How a primitive is licensed, and there are two ways and no third.
 *
 * `declared` means a per-SYSTEM declaration decides, so the registry CITES where that declaration
 * lives and the gate keeps reading the IR. Restating `pathComposition: forbidden` here would put a
 * per-system fact in a second place, which is the drift this registry exists to prevent.
 * `by-construction` means there is nothing per-system to consult: the type's own structure licenses
 * the primitive, and `why` says so.
 *
 * Typed rather than written, because the two halves of "one declaration, two affordances" need
 * different things from it. A human affordance renders a sentence; a machine affordance must decide
 * whether to go and read the IR at all, and a prose gate ("none — licensed by V8 independently of
 * V7") serves the first while telling the second nothing it can act on.
 */
export type PrimitiveGate =
  | { readonly kind: "declared"; readonly by: SchemaAuthority }
  | { readonly kind: "by-construction"; readonly why: string };

/**
 * How a form's answer is reached. Closed, and the three arms are what the evaluators actually do.
 *
 * `declared` reads a declaration and stops — one hop of adjacency, one edge. `composed` builds a
 * closure over declarations: a walk, a reachability class, a configuration space. `aggregated`
 * sums or peaks a quantity over something a closure produced. The author's Extension-1 item "which
 * transitive or derived relations are semantically defined" is the non-`declared` subset, which
 * `derivedPrimitives` computes rather than a second field storing it.
 */
export type AnswerBasis = "declared" | "composed" | "aggregated";

/**
 * One question form, classified: how its answer is reached and what licenses it.
 *
 * Deliberately carries NO prose meaning. Each form's plain-language meaning already exists, once,
 * as the engine's own `interpretation(query)` — total over the form union by the compiler, and
 * parameterized by the actual question, which is strictly more than a type-level sentence could
 * say. `QuerySemantics.interpretedBy` cites it. A `meaning` field here would be a second, coarser
 * copy of that prose, held by a weaker control.
 */
export interface QueryPrimitive {
  /** A member of the type's own `forms`; a test holds the membership and the totality. */
  readonly form: string;
  readonly basis: AnswerBasis;
  readonly gate: PrimitiveGate;
}

/**
 * Which comparisons mean something over this type's attributes, and what scopes them.
 *
 * The two `order` arms exist because the kernel's three types genuinely differ, and one shape
 * forced one of them to lie. A structural or behavioural question CHOOSES a comparison from the
 * engine's guard-op set. A quantitative question chooses none: it decides a magnitude against a
 * declared ceiling, and claiming four order operators for it would advertise a capability the
 * evaluator does not implement.
 *
 * `scopedBy` cites the declared structure two operands must SHARE before a comparison is well
 * typed (V20) — an ordered domain, a variable's enumerated domain, one dimension. Comparing across
 * it is a category error the evaluator refuses by name, which is why the scoping fact is a citation
 * and not a sentence: the refusal reads the IR, and the registry only says where to look.
 */
export interface PredicateSemantics {
  /** Where the value space equality and membership range over is declared; null when the type has none. */
  readonly equality: SchemaAuthority | null;
  readonly order:
    | { readonly by: "operator"; readonly ops: ReadonlySet<string>; readonly scopedBy: SchemaAuthority }
    | { readonly by: "declared-ceiling"; readonly scopedBy: SchemaAuthority }
    | null;
}

/**
 * A cross-model trace or join this type makes meaningful.
 *
 * Not a form: a join is what lets one answer name an element another model declares, and the
 * kernel implements each one deliberately. `with` says whether the join crosses model TYPES or runs
 * between purposeful models of this same type, because a facade must know which.
 */
export interface JoinSemantics {
  readonly name: string;
  readonly meaning: string;
  /** The partner type, or null when the join runs between purposeful models of this same type. */
  readonly with: ModelTypeId | null;
  /** Where the identity or binding that makes the join meaningful is declared. */
  readonly declaredBy: SchemaAuthority;
}

/**
 * What questions can meaningfully be asked of a model type — primitives and citations, never a
 * catalogue of permitted queries.
 *
 * The ruling's nuance is the whole shape of this type: *"I would not make every permissible query
 * an attribute of the model type. That will become a horrible declarative query-language-in-YAML.
 * The metamodel should carry the semantic primitives from which legitimate queries can be
 * composed."* So the model type declares MEANINGS and the query layer composes QUESTIONS. Every
 * field below is one of exactly two things:
 *
 *   - an engine-owned vocabulary BY REFERENCE (`forms`, `composing`, `order.ops`) — identity with
 *     the source array is asserted by a test, so there is no copy to drift; or
 *   - a CITATION of where a per-instance fact is declared (`licensedBy`, every `declaredBy`, every
 *     `declared` gate) — the gate keeps reading the IR, and the registry says only what KIND of
 *     gate a primitive has and where its facts live.
 *
 * Nothing enumerates permitted queries. Nothing restates a per-system declaration. The one prose
 * field is a `by-construction` gate's `why`, which is a registry-only fact about the type's own
 * structure and is stated nowhere else.
 *
 * **The author's Extension-1 list, field by field**, so a reader can check the coverage rather
 * than trust it: which element types and properties are queryable → `subjects`; which
 * relationships may be traversed and in which directions → `licensedBy` (composition and symmetry
 * are per-relation declarations) plus the `relation type` subject; which predicates and comparisons
 * are meaningful → `predicates`; which transitive or derived relations are semantically defined →
 * `derivedPrimitives(query)`; which constraints can be evaluated as queries → `forms`, because a
 * constraint-as-query is a saved property and the forms it may use are these; which cross-model
 * traces or joins are meaningful → `joins`; which standard query operations the type supports →
 * `forms`.
 */
export interface QuerySemantics {
  /**
   * The question forms this type answers — the engine's own array BY REFERENCE.
   *
   * This field absorbed `propertyFamilies`, which was this fact wearing a Learn page's field name.
   * The absorption is what makes "one declaration, two affordances" literal: the dispatcher, the
   * agent facade, the inspector's contextual actions and Learn now read one field.
   */
  readonly forms: readonly string[];
  /**
   * Forms whose answer composes edges or steps and which a per-instance licensing declaration
   * therefore gates — the engine's own set BY REFERENCE.
   *
   * Null where the engine owns no such set, which is not the same claim as "this type composes
   * nothing". A quantitative metric aggregates charges along a path and IS gated per instance; the
   * gate simply lives on the primitive (`PrimitiveGate`) rather than in a shared set, and
   * inventing a parallel array here to fill the field would be the copy this type forbids.
   */
  readonly composing: ReadonlySet<string> | null;
  /**
   * Where each form's plain-language meaning is produced, total over `forms` by the compiler.
   * The human affordance renders it and the machine affordance returns it, from one source.
   */
  readonly interpretedBy: SchemaAuthority;
  /** Where per-INSTANCE licensing is DECLARED. The registry points; the IR decides. */
  readonly licensedBy: readonly SchemaAuthority[];
  /** Every form, classified. Total over `forms`, so a new form cannot ship unclassified. */
  readonly primitives: readonly QueryPrimitive[];
  readonly subjects: readonly QuerySubject[];
  readonly predicates: PredicateSemantics;
  readonly joins: readonly JoinSemantics[];
}

/**
 * The transitive or derived relations a type defines semantically — Extension 1's own item,
 * computed from the classification rather than stored beside it.
 *
 * Derived state is recomputed, never kept (the V18 discipline): a stored list would be the
 * classification's answer copied into a field that a later edit could leave behind.
 */
export const derivedPrimitives = (q: QuerySemantics): readonly QueryPrimitive[] =>
  q.primitives.filter((p) => p.basis !== "declared");

export interface ModelType {
  readonly id: ModelTypeId;
  readonly label: string;
  /** The engineering question this type answers — question first, per the Learn requirement. */
  readonly question: string;
  /** The query dialect that interrogates this substrate. One type per kind; a test pins the 1:1. */
  readonly queryKind: Query["kind"];
  /** Where the shape is defined. Pointers, never restatements. */
  readonly schema: readonly SchemaAuthority[];
  /** What questions can meaningfully be asked of this type. Primitives, never query catalogues. */
  readonly query: QuerySemantics;
  /** What this type deliberately does not tell you — the purposeful-reduction half of a Learn page. */
  readonly omits: readonly string[];
  /** The composition that licenses a richer property, by registered partner. */
  readonly combineWith: {
    readonly partner: ModelTypeId;
    /** The question the PAIR can answer that neither type answers alone. */
    readonly richerQuestion: string;
  };
  /** Does this system declare any substrate of this type? The consultation gate reads this. */
  readonly presentIn: (system: CanonicalSystem) => boolean;
  /**
   * The authoring move that introduces this type, in the author's terms. Required and concrete,
   * for the same reason `SeamRefusal.wouldLicense` is: a refusal naming a gap without the remedy
   * sends the reader back to the specification for what the tool already knows.
   */
  readonly wouldLicense: string;
}

// --------------------------------------------------------------------------------------------
// The citations the query declarations share
//
// Each is declared once and referenced from both `licensedBy` and the gate it licenses, so the two
// cannot drift apart: a test asserts every `declared` gate's citation is one of its type's
// `licensedBy` entries BY IDENTITY, which only holds because these are shared objects rather than
// two literals that happen to agree today.
// --------------------------------------------------------------------------------------------

const PATH_LICENSE: SchemaAuthority = {
  file: "src/ir/types.ts", symbol: "CanonRelationType",
  role: "per-relation path licensing: `pathComposition: forbidden` makes a composed answer " +
    "unlicensed rather than false (V7)",
};
const DIRECTION_LICENSE: SchemaAuthority = {
  file: "src/ir/types.ts", symbol: "CanonRelationType",
  role: "per-relation traversal direction: `symmetric` decides whether a traversal may read an " +
    "edge backwards (V8)",
};
const ENTITY_PROPERTIES: SchemaAuthority = {
  file: "src/ir/types.ts", symbol: "PropertyValue",
  role: "an entity property and its domain — the value space a structural predicate matches over",
};
const ORDERED_DOMAIN: SchemaAuthority = {
  file: "src/ir/types.ts", symbol: "DomainKind",
  role: "`ordered-enum` — the declared order two operands must share before they may be compared",
};
const CONFIGURATION_SPACE: SchemaAuthority = {
  file: "src/ir/types.ts", symbol: "CanonTransition",
  role: "guards, effects and synchronization — the per-system declarations that fix which " +
    "configurations are reachable at all",
};
const VARIABLE_DOMAIN: SchemaAuthority = {
  file: "src/ir/types.ts", symbol: "CanonVariable",
  role: "a machine variable's enumerated domain — every legal value, listed rather than hoped for",
};
const ACCOUNTING_BASIS: SchemaAuthority = {
  file: "src/ir/types.ts", symbol: "CanonAccounting",
  role: "the declared `basis` — what licenses aggregating charges along a path at all (V35)",
};
const RESIDENCY_DECLARATION: SchemaAuthority = {
  file: "src/ir/types.ts", symbol: "Residency",
  role: "a configuration-scoped quantity's declared residency; undeclared, it is charged under " +
    "neither summand of memory(c) (V37)",
};
const DIMENSION_TABLE: SchemaAuthority = {
  file: "src/ir/types.ts", symbol: "DIMENSIONS",
  role: "the closed dimension table — a comparison normalizes within one dimension, and across " +
    "two it is a category error",
};

export const MODEL_TYPES: readonly ModelType[] = [
  {
    id: "structural-graph",
    label: "structural model",
    question: "What is connected to what?",
    queryKind: "graph",
    schema: [
      { file: "src/ir/types.ts", symbol: "CanonModel", role: "the canonical shape of one purposeful model" },
      { file: "src/ir/types.ts", symbol: "CanonRelation", role: "one typed edge, carrying the model that asserts it" },
      { file: "src/ir/types.ts", symbol: "CanonRelationType", role: "the declared relation vocabulary, with absence and composition semantics" },
      { file: "mage-model.schema.json", symbol: "\"models\"", role: "the authored form, in the published wire schema" },
      { file: "SEMANTICS.md", symbol: "## 3. Graphs: entities and typed relations", role: "normative semantics" },
    ],
    query: {
      forms: GRAPH_FORMS,
      composing: GRAPH_COMPOSING,
      interpretedBy: {
        file: "src/engine/graph.ts", symbol: "export function interpretation",
        role: "each graph form's meaning in plain language, parameterized by the question asked (V21)",
      },
      licensedBy: [PATH_LICENSE, DIRECTION_LICENSE],
      primitives: [
        { form: "direct", basis: "declared", gate: { kind: "by-construction", why: "it reads one declared edge of the named relation type; no composition is claimed, so nothing licenses it beyond the declaration itself" } },
        { form: "predecessors", basis: "declared", gate: { kind: "by-construction", why: "the adjacency read one step inwards — a declaration, not an inference" } },
        { form: "successors", basis: "declared", gate: { kind: "by-construction", why: "the adjacency read one step outwards — a declaration, not an inference" } },
        { form: "reachability", basis: "composed", gate: { kind: "declared", by: PATH_LICENSE } },
        { form: "path", basis: "composed", gate: { kind: "declared", by: PATH_LICENSE } },
        { form: "shortest-path", basis: "composed", gate: { kind: "declared", by: PATH_LICENSE } },
        { form: "all-paths", basis: "composed", gate: { kind: "declared", by: PATH_LICENSE } },
        { form: "components", basis: "composed", gate: { kind: "declared", by: PATH_LICENSE } },
        { form: "cycles", basis: "composed", gate: { kind: "by-construction", why: "a relation type's declared `acyclic` property is checkable even where path composition is forbidden, so cycle detection is licensed independently of it (V8, not V7)" } },
        { form: "containment", basis: "composed", gate: { kind: "by-construction", why: "it walks the entity `contains` tree, whose paths are hierarchical by construction rather than a relation type's composed edges" } },
      ],
      subjects: [
        {
          noun: "entity", selector: "property-constraints",
          declaredBy: {
            file: "src/ir/types.ts", symbol: "CanonEntity",
            role: "the entity and its property map — what a structural question selects",
          },
        },
        {
          noun: "relation type", selector: "by-id",
          declaredBy: {
            file: "src/ir/types.ts", symbol: "CanonRelationType",
            role: "the declared relation vocabulary a traversal names; an unnamed type is a typo, not a false answer",
          },
        },
        {
          noun: "model", selector: "by-id",
          declaredBy: {
            file: "src/ir/types.ts", symbol: "CanonModel",
            role: "one purposeful model — the scope every relational question states (V34)",
          },
        },
      ],
      predicates: {
        equality: ENTITY_PROPERTIES,
        order: { by: "operator", ops: ORDER_OPS, scopedBy: ORDERED_DOMAIN },
      },
      joins: [
        {
          name: "appears-in", with: null,
          meaning: "one entity's identity across the purposeful models that mention it, so an " +
            "answer in one model can name the element another model declares",
          declaredBy: {
            file: "src/ir/types.ts", symbol: "CanonModel",
            role: "`entities` — a model's membership, which is what shared identity joins across",
          },
        },
      ],
    },
    omits: [
      "what behaviour can occur over time, or in what order",
      "what an execution costs in time, memory or money",
    ],
    combineWith: {
      partner: "quantitative-model",
      richerQuestion: "Can restricted data reach a service, and what does carrying it there cost?",
    },
    presentIn: (s) => s.models.size > 0,
    wouldLicense:
      "declare a model under `models:` with its purpose and relations; the structural query forms " +
      "read the typed edges it asserts.",
  },
  {
    id: "state-machine",
    label: "state machine",
    question: "What behaviour can occur over time?",
    queryKind: "behavior",
    schema: [
      { file: "src/ir/types.ts", symbol: "CanonMachine", role: "the canonical shape of one machine" },
      { file: "src/ir/types.ts", symbol: "CanonTransition", role: "one transition, with guards, effects and synchronization" },
      { file: "mage-model.schema.json", symbol: "\"machines\"", role: "the authored form, in the published wire schema" },
      { file: "SEMANTICS.md", symbol: "## 4. State machines", role: "normative semantics" },
    ],
    query: {
      forms: BEHAVIOR_FORMS,
      // The engine owns no behavioural analogue of `GRAPH_COMPOSING`, and it should not: a
      // behavioural question composes CONFIGURATIONS rather than edges, and the configuration space
      // is the type's own semantics rather than a privilege a declaration withholds. Every
      // behavioural gate is therefore `by-construction` below, and a set here would be empty.
      composing: null,
      interpretedBy: {
        file: "src/engine/behavior.ts", symbol: "export function interpretation",
        role: "each behavioural form's meaning in plain language, parameterized by the question asked (V21)",
      },
      licensedBy: [CONFIGURATION_SPACE, VARIABLE_DOMAIN],
      primitives: [
        { form: "reach", basis: "composed", gate: { kind: "by-construction", why: "arrival at a configuration satisfying a predicate is what a state machine MEANS; no declaration withholds it" } },
        { form: "invariant", basis: "composed", gate: { kind: "by-construction", why: "a claim over every reachable configuration, decided on the same closure `reach` walks" } },
        { form: "recurrence", basis: "composed", gate: { kind: "by-construction", why: "re-entry of a target configuration, which the closure exhibits or does not" } },
        { form: "repeatable-cycle", basis: "composed", gate: { kind: "by-construction", why: "a genuinely repeating configuration — a lasso — which the closure exhibits or does not" } },
        { form: "deadend", basis: "composed", gate: { kind: "by-construction", why: "a reachable configuration with no enabled step; the transition declarations decide, and nothing gates asking" } },
        { form: "transition-live", basis: "composed", gate: { kind: "by-construction", why: "whether a declared transition is executable somewhere in the closure; an undeclared one is unlicensed as a typo, not refuted" } },
      ],
      subjects: [
        {
          noun: "machine", selector: "by-id",
          declaredBy: {
            file: "src/ir/types.ts", symbol: "CanonMachine",
            role: "one machine — its states, variables and initial configuration",
          },
        },
        {
          noun: "state", selector: "predicate",
          declaredBy: {
            file: "src/engine/types.ts", symbol: "Predicate",
            role: "a state is named inside a predicate (`machine.state`), never selected on its own",
          },
        },
        { noun: "variable", selector: "predicate", declaredBy: VARIABLE_DOMAIN },
        {
          noun: "transition", selector: "selector",
          declaredBy: {
            file: "src/engine/types.ts", symbol: "TransitionSelector",
            role: "the partial match — machine, from, to, sync — a behavioural question names a transition by",
          },
        },
      ],
      predicates: {
        equality: VARIABLE_DOMAIN,
        order: { by: "operator", ops: ORDER_OPS, scopedBy: VARIABLE_DOMAIN },
      },
      joins: [
        {
          name: "machine-of-entity", with: "structural-graph",
          meaning: "the binding that lets a behavioural answer name the structural element whose " +
            "behaviour it describes",
          declaredBy: {
            file: "src/ir/types.ts", symbol: "CanonMachine",
            role: "`entity` — the structural element a machine's behaviour is about, or null when it is about none",
          },
        },
      ],
    },
    omits: [
      "how long an execution takes, or what it costs",
      "which services are connected to which, outside the states it steps",
    ],
    combineWith: {
      partner: "quantitative-model",
      richerQuestion: "Can a document reach Published within the declared latency ceiling?",
    },
    presentIn: (s) => s.machines.size > 0,
    wouldLicense:
      "declare a machine under `machines:` with its states, initial state and transitions; " +
      "behavioural questions are answered over the configuration space those declarations span.",
  },
  {
    id: "quantitative-model",
    label: "quantitative model",
    question: "What does an execution cost?",
    queryKind: "quantity",
    schema: [
      { file: "src/ir/types.ts", symbol: "CanonQuantity", role: "the canonical shape of one quantitative annotation" },
      { file: "src/ir/types.ts", symbol: "CanonAccounting", role: "the declared accounting model — how a quantity reaches an analysis" },
      { file: "src/ir/types.ts", symbol: "DIMENSIONS", role: "the closed dimension table quantities normalize against" },
      { file: "mage-model.schema.json", symbol: "\"quantities\"", role: "the authored form, in the published wire schema" },
      { file: "SEMANTICS.md", symbol: "### 5.2 Quantities annotate the model; they are not part of it", role: "normative semantics" },
    ],
    query: {
      forms: REQUIREMENT_METRICS,
      // Null for the same reason as the state machine's, and NOT because nothing composes here: a
      // path-aggregated metric sums charges along a walk and is gated per instance by the declared
      // accounting basis. That gate lives on the primitive, where its citation can be read.
      composing: null,
      interpretedBy: {
        file: "src/quant/query.ts", symbol: "runQuantityQuery",
        role: "each metric's meaning in plain language, produced beside the evaluation it describes (V21)",
      },
      licensedBy: [ACCOUNTING_BASIS, RESIDENCY_DECLARATION, DIMENSION_TABLE],
      primitives: [
        { form: "latency", basis: "aggregated", gate: { kind: "declared", by: ACCOUNTING_BASIS } },
        { form: "cost", basis: "aggregated", gate: { kind: "declared", by: ACCOUNTING_BASIS } },
        { form: "peak_memory", basis: "aggregated", gate: { kind: "declared", by: RESIDENCY_DECLARATION } },
      ],
      subjects: [
        {
          noun: "quantity", selector: "by-id",
          declaredBy: {
            file: "src/ir/types.ts", symbol: "CanonQuantity",
            role: "one quantitative annotation — its target, dimension and declared value",
          },
        },
        {
          noun: "execution", selector: "predicate",
          declaredBy: {
            file: "src/engine/types.ts", symbol: "QuantityQuery",
            role: "`target` — the reach predicate selecting which executions are measured; the " +
              "predicate grammar is the state machine's, which is what the registered join is for",
          },
        },
        {
          noun: "ceiling", selector: "by-id",
          declaredBy: {
            file: "src/engine/types.ts", symbol: "QuantityQuery",
            role: "`within` — the `model:`-targeted quantity declaring the ceiling a figure is decided against",
          },
        },
      ],
      predicates: {
        // No equality arm: a magnitude is decided against a declared ceiling, never matched against
        // a value, and the evaluator implements no `eq` over quantities. Declaring one would
        // advertise a comparison that refuses.
        equality: null,
        order: { by: "declared-ceiling", scopedBy: DIMENSION_TABLE },
      },
      joins: [
        {
          name: "executions-selected-by-behaviour", with: "state-machine",
          meaning: "a quantitative question selects the executions it measures with a behavioural " +
            "predicate — the one cross-type composition the kernel implements today",
          declaredBy: {
            file: "src/engine/types.ts", symbol: "QuantityQuery",
            role: "`target` — where the behavioural predicate enters a quantitative question",
          },
        },
      ],
    },
    omits: [
      "which executions are possible at all — that is the state machine's claim",
      "what is connected to what — that is a structural model's claim",
    ],
    combineWith: {
      partner: "state-machine",
      richerQuestion: "Which reachable execution attains the worst-case latency, and does it stay under the ceiling?",
    },
    presentIn: (s) => s.quantities.size > 0,
    wouldLicense:
      "declare quantities under `quantities:` (each with a dimension and a target) and an " +
      "`accounting:` basis for path-aggregated metrics; the quantity metrics are computed from " +
      "those declarations and from nothing else.",
  },
];

const BY_KIND: ReadonlyMap<Query["kind"], ModelType> =
  new Map(MODEL_TYPES.map((t) => [t.queryKind, t]));

/**
 * The type a query kind interrogates.
 *
 * Total over `Query["kind"]` because the registry covers every kind — a registry test holds that
 * 1:1, and the published query schema's own `kind` enum is compared against it, so a fourth kind
 * cannot land in the wire format without landing here first.
 */
export function modelTypeForQueryKind(kind: Query["kind"]): ModelType {
  const t = BY_KIND.get(kind);
  if (t === undefined) {
    // Unreachable while the registry test holds; the throw is for the day someone widens the
    // union without registering the type, when a loud failure beats a silently unguarded dispatch.
    throw new Error(`no registered model type answers query kind '${kind}'`);
  }
  return t;
}

/**
 * The substrate-absence refusal, worded from the registry.
 *
 * The sentence has the same anatomy as the purposeful-omission refusal (`src/engine/omission.ts`):
 * what is absent, why that is a decision surface rather than a tooling failure, and the authoring
 * move that would change the answer. It is the sentence the Learn requirement's NOT ANSWERABLE
 * sketch asks for — "your current models do not represent X; you may need a <type>" — and it is
 * generated here so a Learn page and the refusal can only ever describe the same capability.
 */
export function absentSubstrateProse(t: ModelType): string {
  return (
    `this system declares no ${t.label}, and a '${t.queryKind}' question is answered over one — ` +
    `it asks "${t.question}", which only a ${t.label} represents. To make it answerable, ` +
    t.wouldLicense
  );
}

/**
 * The rung itself, as a verdict: the refusal a question of this kind earns over a system declaring
 * no substrate of its type, or `null` when the substrate is there.
 *
 * Extracted on the SECOND engine consumer rather than the third. `runTypedQuery` reached the rung
 * first and `runPastTimeQuery` bypassed it entirely, and the tempting fix was four lines copied into
 * the second entry point. Those four lines carry the refusal CAUSE as well as the sentence — the
 * `missing-model-type` detail an agent reads and `src/app/learn.ts` resolves to a Learn section — so
 * a copy would put the cause in two places while the prose stayed generated from one. The seam's own
 * constructor (`absentModelType`, `src/sparql/refusal.ts`) is shaped the same way and for the same
 * reason: refusal-or-null, one per interface, each wording nothing itself.
 */
export function absentSubstrateVerdict(
  system: CanonicalSystem, kind: Query["kind"], hash: string,
): Verdict | null {
  const t = modelTypeForQueryKind(kind);
  return t.presentIn(system)
    ? null
    : unlicensed(hash, absentSubstrateProse(t), null, detail("missing-model-type", [t.label], []));
}
