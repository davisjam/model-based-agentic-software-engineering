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
 * **Where the semantics come from, per construct.** `semanticBasis` carries §35's rule — *borrowed
 * semantics must have provenance* — on the two objects whose granularity matches §35.4's table: the
 * model type for a substrate row, the query primitive for a form row. The field is REQUIRED, which
 * is the whole of rung 1: a new model type or question form cannot land unattributed, because the
 * compiler will not let it. The union makes "this is ours" a statable value rather than an
 * omission, so a deliberate extension and a forgotten attribution no longer look alike.
 *
 * **What the attribution is worth: `asserted`, and nothing here implies a gate.** A borrowed row
 * claims the cited standard concept means what we say it means. That is a person reading a
 * specification and a model together on a date — `asserted` in `SEMANTICS.md` §13's vocabulary
 * (§13.3's K4), and it stays `asserted` until a conformance fixture exists (`SEMANTICS.md` §13.7,
 * `DESIGN-v02-semantics-261004.md` §35.5 rung 3). The Workbench takes no runtime dependency on the
 * SysML v2 reference implementation, so nothing in CI can re-derive the standard's half. What IS
 * held mechanically is narrower and worth stating exactly: presence, by the compiler, and
 * non-placeholder content, by `test/model-types.test.ts`.
 *
 * **Three types, not four.** The author's Learn sketch shows a fourth card, "Data / Policy Model".
 * The kernel has no such type: Message Bus's `data-policy` is an entry in `system.models` whose
 * contribution is properties over an ordered-enum domain — a structural graph used for a policy
 * purpose. Purposes are a second axis, and they live in the app layer (`src/app/learn.ts`), each
 * bound to a kernel type declared here. Ruling: `DECISIONS-RULED-model-types-261002.md`.
 */
import type { CanonicalSystem } from "../ir/types.ts";
import {
  BEHAVIOR_FORMS,
  GRAPH_COMPOSING,
  GRAPH_FORMS,
  ORDER_OPS,
  detail,
  unlicensed,
  type Query,
  type Verdict,
} from "./types.ts";
import { REQUIREMENT_METRICS } from "../quant/requirement.ts";

/** Every public model type. The list is closed; adding one is a deliberate act. */
export type ModelTypeId =
  "structural-graph" | "state-machine" | "quantitative-model";

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
// Semantic basis — where a construct's semantics come from (§35)
// --------------------------------------------------------------------------------------------

/** The standards the Workbench borrows from. Closed: a third would be a ruling, not an edit. */
export type Standard = "SysML v2" | "KerML";

/**
 * The clause citation a borrowed row owes until a conformance fixture supplies one.
 *
 * §35.4 leaves the clause column deliberately unfilled and says why: *"a clause citation written
 * from memory is precisely the false attribution the rule forbids, dressed as rigour — and a wrong
 * clause number is worse than an absent one, because it reads as checked."* So the sentinel is the
 * truthful value, not a placeholder, and `test/model-types.test.ts` holds the pair: a row is
 * `owed` exactly while it names no fixture.
 */
export const CLAUSE_OWED = "owed";

/**
 * Where one construct's semantics come from — the attribution half of §35's rule.
 *
 * **Both halves of the rule, by construction.** A construct derived from SysML v2 or KerML names
 * the standard and the concept; an extension says it is an extension and CANNOT name a standard,
 * because `standard` sits on the `borrowed` arm alone. Over-attribution and under-attribution are
 * symmetric failures (§35.3), so the class is a field on every row rather than a footnote on the
 * exceptions.
 *
 * **The third arm is not a hedge.** LTL and the behavioural forms that bridge to it sit outside
 * SysML and KerML by choice, and their semantics are not invented here either — they are standard
 * linear temporal logic, which is a stronger warrant than "ours" and a different one from "borrowed
 * from SysML". `foundation` is a `SchemaAuthority` rather than a free string, so the grounding is a
 * citation the registry's existing resolution test already walks.
 *
 * `fixture` is `null` while the §35.6 obligation is owed. A non-nullable field would read better
 * and would block the attribution from landing until a corpus exists, which gets the order wrong:
 * the attribution is useful immediately and the fixture is the slower half.
 */
export type SemanticBasis =
  | {
      readonly kind: "borrowed";
      readonly standard: Standard;
      /** The standard concept this construct realizes a subset of, as the 261004 ruling names it. */
      readonly concept: string;
      /** A clause citation, or `CLAUSE_OWED` while no fixture has supplied one. */
      readonly clause: string;
      /** The conformance fixture directory (§35.6), or null while the obligation is still owed. */
      readonly fixture: string | null;
    }
  | { readonly kind: "extension"; readonly why: string }
  | {
      readonly kind: "extension-grounded";
      readonly foundation: SchemaAuthority;
      readonly why: string;
    };

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
  | "entity"
  | "relation type"
  | "model"
  | "machine"
  | "state"
  | "variable"
  | "transition"
  | "execution"
  | "quantity"
  | "ceiling";

/**
 * How a question picks instances of a noun out.
 *
 * Each spelling IS an engine construct the caller must build — a declared identifier, a
 * `PropConstraint` list, a `Predicate`, or a `TransitionSelector`-shaped partial match on declared
 * fields — so the selector tells a facade which grammar to offer, not merely that something is
 * selectable. `searchable: true` would have said the second and nothing of the first.
 */
export type SubjectSelector =
  "by-id" | "property-constraints" | "predicate" | "selector";

export interface QuerySubject {
  readonly noun: QueryNoun;
  readonly selector: SubjectSelector;
  /**
   * What the noun IS, to a reader. One sentence, no schema vocabulary, no invariant ids.
   *
   * Distinct from `declaredBy.role` on purpose, and the distinction is the point. `role` says what
   * a cited SYMBOL is authoritative for -- it is provenance, and it legitimately carries invariant
   * ids and implementation detail. The Learn page rendered `role` in a column headed "What it is",
   * so a provenance note had to serve as a definition and could do neither job: a reader met
   * "the declared `basis` -- what licenses aggregating charges along a path at all (V35)" where a
   * definition belonged. `means` is the definition; `role` stays provenance and belongs under the
   * implementation disclosure.
   *
   * Required, so a subject added later cannot quietly fall back on its provenance string.
   */
  readonly means: string;
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
  /**
   * Where this form's semantics come from (§35.4's form rows). Required, so a new form cannot land
   * unattributed — and the two controls compose: the compiler holds a basis per primitive, the
   * `primitives` totality rule holds a primitive per form, so a form added to an engine vocabulary
   * reaches both without anyone writing a second test.
   *
   * Forms that share one §35.4 row share one OBJECT, by identity, rather than carrying ten
   * paraphrases of a single claim — and the Learn derivation groups on that identity, so the page's
   * granularity is the table's.
   */
  readonly semanticBasis: SemanticBasis;
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
    | {
        readonly by: "operator";
        readonly ops: ReadonlySet<string>;
        readonly scopedBy: SchemaAuthority;
      }
    | { readonly by: "declared-ceiling"; readonly scopedBy: SchemaAuthority }
    | null;
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
 * relationships are meaningful → NOT a field here, but the two registries below (`BINDINGS` and
 * `COMPOSITIONS`), reachable per type through `bindingsOf` / `compositionsOf`; which standard query
 * operations the type supports → `forms`.
 *
 * **Why the cross-model item left this interface.** It was one `joins` array per type, and the
 * 261004 ruling is that the word was covering two unrelated relationships: *"join was hiding two
 * different things … there isn't a generic semantic join."* A relationship between two domains also
 * has no natural owner among them — the old array forced a placement convention ("it sits on the
 * side whose construct hosts the reference"), which is a judgement a reader had to reconstruct. The
 * two registries declare both domains as fields instead, so the convention is gone.
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
}

// --------------------------------------------------------------------------------------------
// Bindings and compositions — the two cross-model semantic relationships (§4, §23)
//
// There is no generic semantic join. The 261004 ruling: *"join was hiding two different things.
// The clean definition is that there isn't a generic semantic join. There are bindings and
// compositions, and a multi-model visualization can show either."* The distinction that decides
// every question below:
//
//   **Binding connects denotations. Composition operates on denotations.**
//
// Operationally (§4.1): a binding is a declared correspondence between elements represented in
// different purposeful models, and it DOES NOT consume one query result to determine another; a
// composition is a typed operation in which a result or predicate from one semantic domain
// participates in evaluating a question in another. An operation wholly inside one domain is
// neither — it is a primitive, and `QueryPrimitive` above is where those live.
//
// **Separately typed and separately totalized** (§4.4). Two interfaces rather than one tagged
// union, because the two owe different things: a binding owes a CORRESPONDENCE type and a
// composition owes a RESULT, and a union would have made each optional on the arm that does not
// use it — which is the shape that lets a missing field look like a deliberate one. The totality
// controls differ for the same reason, and `test/bindings-census.test.ts` holds both: a
// cross-domain reference a model DOCUMENT authors must be named by a BINDING, because a
// composition is declared against the query AST and no model document can witness one.
//
// **`combineWith` is not here, deliberately.** §4.1: *"combineWith, if retained, is Learn-page
// pedagogy/navigation only. It is not a semantic relationship."* It stays on `ModelType` as the
// navigation hint it is, and its doc comment says so.
// --------------------------------------------------------------------------------------------

/**
 * What a binding puts in correspondence, in the metamodel's own nouns.
 *
 * This is §4.4's "correspondence type", and the noun pair IS the type: entity↔model, machine↔entity
 * and entity↔state are three different correspondences, and a reader (or a facade switching
 * exhaustively on `QueryNoun`) can tell them apart from these two fields alone. A closed
 * `CorrespondenceKind` union was the alternative and would have carried one member per entry,
 * classifying nothing.
 */
export interface Correspondence {
  readonly source: QueryNoun;
  readonly target: QueryNoun;
}

/**
 * How a model document SPELLS a binding's reference — the field that closes hole 1 of the census
 * control.
 *
 * `test/bindings-census.test.ts` derives cross-domain references from the authored models and
 * requires each to be named. Its obligation used to be per (fromType, toType), and the file names
 * the consequence as a hole: *"a SECOND, semantically different reference between an already-named
 * pair therefore satisfies the test by riding on the first."* That was live, not hypothetical — one
 * shipped example authored a second entity→state property that no entry named. Declaring the
 * authored keys moves the granularity to (fromType, toType, key) and the census checks both
 * directions, so a new reference field cannot hide behind an old one and a stale key cannot linger.
 *
 * `keys` declares the KERNEL's own spellings. A model-local spelling of the same correspondence is
 * declared in that test file instead, because EX-I1 forbids an engine source from naming an example
 * and the example's property name would be one.
 *
 * The second arm is not an escape. A SAME-domain binding corresponds two purposeful models of one
 * type, and the derivation yields cross-TYPE pairs only, so no walk over model documents can
 * witness it — the exemption is structural and its reason is a declared field rather than an
 * absence a reader has to infer.
 */
export type BindingWitness =
  | {
      readonly kind: "authored-property";
      /** Every authored key a reference of this binding is spelled with, across the tracked models. */
      readonly keys: readonly string[];
    }
  | { readonly kind: "shared-membership"; readonly why: string };

/**
 * A declared correspondence between elements represented in different purposeful models (§4.2).
 *
 * Every field below is one of §4.4's six, plus the two the existing controls need. What a binding
 * explicitly does NOT do, from §23: it does not merge the models, it does not imply equality
 * between arbitrary objects, and it does not consume the result of a query. The third is the line
 * between this interface and `CompositionSemantics`, and it is the reason `licensing` is a
 * `PrimitiveGate` and not something that could name a query: there is nothing for a binding to
 * read but a declaration.
 *
 * **`from` and `to` are both required, and `from === to` is meaningful.** It says the binding runs
 * between purposeful models of ONE type — `appears-in`'s case. The field it replaces was
 * `with: ModelTypeId | null`, where `null` was doing two jobs at once: "same type" and "no partner".
 */
export interface BindingSemantics {
  readonly name: string;
  /** §4.4's source domain. */
  readonly from: ModelTypeId;
  /** §4.4's target domain. `from === to` means the binding runs between models of one type. */
  readonly to: ModelTypeId;
  /** §4.4's interpretation — what the correspondence MEANS, in a sentence a student can read. */
  readonly interpretation: string;
  /**
   * §4.4's licensing conditions, in the vocabulary the query primitives already use.
   *
   * Reused rather than reinvented, because the question is the same one: does a per-SYSTEM
   * declaration decide, or does the type's own structure settle it? `declared` means the kernel goes
   * and reads the IR, and the citation says where; `by-construction` means there is nothing per
   * system to consult.
   */
  readonly licensing: PrimitiveGate;
  readonly correspondence: Correspondence;
  readonly witness: BindingWitness;
  /** Where the correspondence is AUTHORED. Total, which is why it survives `licensing`. */
  readonly declaredBy: SchemaAuthority;
  /**
   * §4.4's semantic basis. REQUIRED, so the compiler rejects a binding that declares none — the
   * same rung-1 pattern `ModelType.semanticBasis` and `QueryPrimitive.semanticBasis` use, and the
   * reason this is a field rather than a test: an optional field would recreate the gap it closes.
   */
  readonly semanticBasis: SemanticBasis;
}

/**
 * A typed operation in which a result or predicate from one semantic domain participates in
 * evaluating a question in another (§4.3).
 *
 * **This must not become a generic pipeline mechanism**, and the type is where that ruling is held
 * rather than merely recorded. §4.3 forbids adding arbitrary cross-model `pipe`, `join`, `fold`,
 * `flatMap` or higher-order composition *"merely to make examples convenient."* `from` and `to` are
 * `ModelTypeId`, so a composition relates two DOMAINS and nothing else: there is no arm that
 * accepts a composition, so a composition OF compositions cannot be written without changing this
 * interface — which makes the pipeline a deliberate edit to a typed contract rather than one more
 * registry row. `test/model-types.test.ts` holds the complement, forward-policing at one entry: no
 * composition's target domain is another's source, which is what a chain would look like.
 *
 * **What §4.4's "result type" means here, honestly.** A composition restricts a DOMAIN; it does not
 * introduce a result kind. `executions-selected-by-behaviour` still answers with the quantitative
 * dialect's own verdict — a magnitude decided against a declared ceiling. So `restricts` carries
 * the noun whose extension narrows, and `result` CITES the target dialect's result type rather than
 * restating one. Minting a fresh result shape per composition is the first step toward the pipeline
 * the ruling forbids.
 */
export interface CompositionSemantics {
  readonly name: string;
  /** §4.4's source domain — the domain whose result or predicate participates. */
  readonly from: ModelTypeId;
  /** §4.4's target domain — the domain whose question is being evaluated. */
  readonly to: ModelTypeId;
  readonly interpretation: string;
  readonly licensing: PrimitiveGate;
  /** The noun whose extension the source domain's result narrows in the target question. */
  readonly restricts: QueryNoun;
  /** §4.4's result type: the TARGET dialect's own, cited rather than restated. */
  readonly result: SchemaAuthority;
  /** Where the source domain's result ENTERS the target question. */
  readonly declaredBy: SchemaAuthority;
  /** REQUIRED, for the reason `BindingSemantics.semanticBasis` is. */
  readonly semanticBasis: SemanticBasis;
}

// --------------------------------------------------------------------------------------------
// Render strategy — how a model type's picture is produced, or why it has none (§22.4)
// --------------------------------------------------------------------------------------------

/**
 * The IR construct a projection can be a projection OF.
 *
 * **Kernel vocabulary, and that is a measured constraint rather than a preference.** The declared
 * component graph asserts EQUALITY between the `depends-on` edge set and the observed imports, in
 * both directions, and there is no `query-engine → renderer` edge. So this field may not hold a
 * renderer function, and may not name the renderer's own `SceneSubjectKind` either — a type-only
 * import is drawn the same as a value one. Each member below names a map on `CanonicalSystem`
 * instead: `models`, `machines`, `quantitativeModels`. The renderer maps a construct to the
 * projection that draws it; the engine stays unaware that a renderer exists.
 *
 * Three members, because the IR now has three things a picture can be of. It had two until
 * `CanonQuantitativeModel` landed, and that ordering is the point: a projection cannot be registered
 * against a subject that is not addressable, so the subject came first.
 */
export type RenderConstruct = "model" | "machine" | "quantitative-model";

/**
 * How a model type's picture is produced, or why it has none.
 *
 * **The field this type annotates is REQUIRED, which is the whole of rung 1.** A new model type
 * cannot land without declaring a projection or declaring itself nonvisual, because the compiler
 * will not let it — the same structure `semanticBasis` uses, and the registry header's sentence
 * about that field applies here unchanged. What differs is what the declaration is WORTH:
 * `semanticBasis` claims a correspondence to an external standard the workbench takes no runtime
 * dependency on, so its top rung is unholdable; a render strategy's correspondent is the
 * workbench's own renderer, which CI holds in its hand. `test/render-strategy.test.ts` re-derives
 * every row against the code that draws it on every run.
 *
 * **Two arms, not three.** `DESIGN-render-rules-261004.md` §B.3 proposed a third, `annotates`, for a
 * type whose picture is hosted on another type's subject — the shape that would have converted the
 * quantitative type's positional fallback from a silent heuristic into a declared claim. Events
 * settled §I's first open question instead of a ruling: the fallback is gone and the quantitative
 * type has its own projection over its own construct, so an `annotates` arm would carry no row and
 * model a state the tree no longer has. The arm is recoverable from the design if a hosted
 * projection ever lands; carrying it empty now would be aspiration dressed as a type.
 *
 * **`nonvisual` carries no row either, and stays.** The difference is that it is the escape the
 * required field needs to stay honest: without it, a type with nothing to draw must either fake a
 * projection or hold the field hostage. A zero-row arm whose job is to be available is forward
 * policing; a zero-row arm whose job is to describe today is not.
 *
 * **No `semanticBasis` here, deliberately.** §4.4 requires one for bindings and compositions. A
 * projection is the workbench's own presentation choice; no standard defines one, so every row
 * would carry the same "this is ours" reason, and a field constant across every row records
 * nothing. §35's rule attaches attribution where borrowing is possible, and rendering is not
 * borrowed. Recording the judgment here is what keeps it from being re-read as an omission.
 *
 * **No evidence field, for the same reason.** §B.3's `projected` arm proposed an `evidence`
 * projection beside `projection`. §F's own statement of what the registry must express names three
 * things and that is not one of them; emphasis reaches every projection through one filter, so the
 * field would say one thing three times.
 */
export type RenderStrategy =
  | {
      readonly kind: "projected";
      /** The IR construct this type's own picture is a projection of. */
      readonly construct: RenderConstruct;
      /**
       * What the projection preserves of this type's semantics, and what it drops.
       *
       * The same job `omits` does for a model, at the granularity of the picture: a resource-oriented
       * view of memory preserves allocation and margin and drops connectivity, and a structural view
       * of the same entities does the reverse. Both are legitimate pictures of overlapping facts, and
       * this is the field that says which reduction a reader is looking at.
       */
      readonly projection: string;
    }
  | {
      readonly kind: "nonvisual";
      /** Why this type has no picture — a reason, never a placeholder. A test holds that. */
      readonly why: string;
    };

/**
 * The transitive or derived relations a type defines semantically — Extension 1's own item,
 * computed from the classification rather than stored beside it.
 *
 * Derived state is recomputed, never kept (the V18 discipline): a stored list would be the
 * classification's answer copied into a field that a later edit could leave behind.
 */
export const derivedPrimitives = (
  q: QuerySemantics,
): readonly QueryPrimitive[] =>
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
  /**
   * Where this type's SUBSTRATE semantics come from (§35.4's substrate rows) — what the type can
   * represent, as distinct from what can be asked of it. Required, per rung 1.
   *
   * Two homes rather than one, because §35.4's rows sit at two granularities and the
   * borrowed/extension split runs INSIDE a single model type: the structural type's substrate is
   * borrowed while its query forms are the Workbench's own, and one field could not say both.
   */
  readonly semanticBasis: SemanticBasis;
  /** What questions can meaningfully be asked of this type. Primitives, never query catalogues. */
  readonly query: QuerySemantics;
  /** What this type deliberately does not tell you — the purposeful-reduction half of a Learn page. */
  readonly omits: readonly string[];
  /**
   * How this type's picture is produced, or why it has none. REQUIRED, per rung 1.
   *
   * This closes the gap `DESIGN-render-rules-261004.md` §A.2 measured: *"`src/engine/model-types.ts`
   * declares three model types and says nothing about rendering; `src/render/` knows two subject
   * kinds and nothing about model types. The two vocabularies have never been related."* Before this
   * field the relation existed twice, in two layers, written by hand and free to disagree — and it
   * DID disagree: the Learn page drew a budget for the quantitative type while the cross-model
   * canvas refused it as having no picture at all, each stating its own reason. One declaration,
   * read by both.
   *
   * Where the per-INSTANCE facts come from is not a field here. `schema` above already cites them,
   * which is §B.3's own answer and the registry's standing discipline: the registry points, the IR
   * decides. A budget's ceiling belongs to the quantity that declares it, never to the renderer.
   */
  readonly renderStrategy: RenderStrategy;
  /**
   * A NAVIGATION hint for the Learn page: which other type to reach for, and the question the pair
   * would answer. **Not a semantic relationship** — §4.1 is explicit: *"combineWith, if retained,
   * is Learn-page pedagogy/navigation only. It is not a semantic relationship."*
   *
   * So it is neither a binding nor a composition, and nothing may read it as one: it names no
   * source and target domain, declares no licensing, carries no semantic basis, and the kernel
   * never consults it. The cross-model semantics live in `BINDINGS` and `COMPOSITIONS` below, and
   * the field keeps its name only because renaming it reaches the Learn surfaces a sibling wave
   * owns.
   */
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
  file: "src/ir/types.ts",
  symbol: "CanonRelationType",
  role:
    "per-relation path licensing: `pathComposition: forbidden` makes a composed answer " +
    "unlicensed rather than false (V7)",
};
const DIRECTION_LICENSE: SchemaAuthority = {
  file: "src/ir/types.ts",
  symbol: "CanonRelationType",
  role:
    "per-relation traversal direction: `symmetric` decides whether a traversal may read an " +
    "edge backwards (V8)",
};
const ENTITY_PROPERTIES: SchemaAuthority = {
  file: "src/ir/types.ts",
  symbol: "PropertyValue",
  role: "an entity property and its domain — the value space a structural predicate matches over",
};
const ORDERED_DOMAIN: SchemaAuthority = {
  file: "src/ir/types.ts",
  symbol: "DomainKind",
  role: "`ordered-enum` — the declared order two operands must share before they may be compared",
};
const CONFIGURATION_SPACE: SchemaAuthority = {
  file: "src/ir/types.ts",
  symbol: "CanonTransition",
  role:
    "guards, effects and synchronization — the per-system declarations that fix which " +
    "configurations are reachable at all",
};
const VARIABLE_DOMAIN: SchemaAuthority = {
  file: "src/ir/types.ts",
  symbol: "CanonVariable",
  role: "a machine variable's enumerated domain — every legal value, listed rather than hoped for",
};
const ACCOUNTING_BASIS: SchemaAuthority = {
  file: "src/ir/types.ts",
  symbol: "CanonAccounting",
  role: "the declared `basis` — what licenses aggregating charges along a path at all (V35)",
};
const RESIDENCY_DECLARATION: SchemaAuthority = {
  file: "src/ir/types.ts",
  symbol: "Residency",
  role:
    "a configuration-scoped quantity's declared residency; undeclared, it is charged under " +
    "neither summand of memory(c) (V37)",
};
const DIMENSION_TABLE: SchemaAuthority = {
  file: "src/ir/types.ts",
  symbol: "DIMENSIONS",
  role:
    "the closed dimension table — a comparison normalizes within one dimension, and across " +
    "two it is a category error",
};

// --------------------------------------------------------------------------------------------
// The semantic-basis rows shared across forms
//
// §35.4's table has ONE row for the relational query vocabulary and one for the quantity metrics,
// so the forms that realize each row share one object. Shared by identity, which is what lets the
// Learn derivation group ten forms into the one claim the table makes about them instead of
// printing ten paraphrases of it.
// --------------------------------------------------------------------------------------------

/**
 * The foundation the externally grounded behavioural forms stand on.
 *
 * Deliberately not a standard: LTL sits outside SysML v2 and KerML by choice. Also not "ours": the
 * satisfaction relation is textbook, and the bridges from the shipped forms to it are small lemmas
 * the cited document works out rather than claims.
 */
const LTL_FOUNDATION: SchemaAuthority = {
  file: "DESIGN-v02-ltl-foundation-261004.md",
  symbol: "### 3.1 The relation",
  role:
    "the satisfaction relation of linear temporal logic, from the textbook definition rather " +
    "than from any OMG specification",
};

const RELATIONAL_QUERY_BASIS: SemanticBasis = {
  kind: "extension",
  why:
    "the relational query vocabulary is the Workbench's own analysis semantics — it reads the " +
    "borrowed structural substrate and asks questions of it that no standard defines, and a reader " +
    "who goes looking for these forms in SysML v2 or KerML will not find them (§35.4)",
};

const QUANTITY_METRIC_BASIS: SemanticBasis = {
  kind: "extension",
  why:
    "the metric vocabulary is the Workbench's own analysis layer over a borrowed substrate: the " +
    "standard settles what a magnitude carrying a dimension and a unit means, and aggregating " +
    "charges along an execution into latency, cost or peak memory is ours",
};

export const MODEL_TYPES: readonly ModelType[] = [
  {
    id: "structural-graph",
    label: "structural model",
    question: "What is connected to what?",
    queryKind: "graph",
    schema: [
      {
        file: "src/ir/types.ts",
        symbol: "CanonModel",
        role: "the canonical shape of one purposeful model",
      },
      {
        file: "src/ir/types.ts",
        symbol: "CanonRelation",
        role: "one typed edge, carrying the model that asserts it",
      },
      {
        file: "src/ir/types.ts",
        symbol: "CanonRelationType",
        role: "the declared relation vocabulary, with absence and composition semantics",
      },
      {
        file: "mage-model.schema.json",
        symbol: '"models"',
        role: "the authored form, in the published wire schema",
      },
      {
        file: "SEMANTICS.md",
        symbol: "## 3. Graphs: entities and typed relations",
        role: "normative semantics",
      },
    ],
    // §35.4's first row names both standards. `standard` admits one, so it names the layer where
    // the three concepts are DEFINED — typed elements, relationships and features are KerML's
    // kernel vocabulary, and SysML v2 specializes them rather than introducing them. Naming SysML
    // v2 here would attribute a concept to the layer that inherits it.
    semanticBasis: {
      kind: "borrowed",
      standard: "KerML",
      concept:
        "the typed-element, relationship and feature subsets — the kernel vocabulary SysML " +
        "v2 builds its own structural constructs on, of which a MAGE entity, typed relation and " +
        "property are a restricted realization",
      clause: CLAUSE_OWED,
      fixture: null,
    },
    query: {
      forms: GRAPH_FORMS,
      composing: GRAPH_COMPOSING,
      interpretedBy: {
        file: "src/engine/graph.ts",
        symbol: "export function interpretation",
        role: "each graph form's meaning in plain language, parameterized by the question asked (V21)",
      },
      licensedBy: [PATH_LICENSE, DIRECTION_LICENSE],
      primitives: [
        {
          form: "direct",
          basis: "declared",
          semanticBasis: RELATIONAL_QUERY_BASIS,
          gate: {
            kind: "by-construction",
            why: "it reads one declared edge of the named relation type; no composition is claimed, so nothing licenses it beyond the declaration itself",
          },
        },
        {
          form: "predecessors",
          basis: "declared",
          semanticBasis: RELATIONAL_QUERY_BASIS,
          gate: {
            kind: "by-construction",
            why: "the adjacency read one step inwards — a declaration, not an inference",
          },
        },
        {
          form: "successors",
          basis: "declared",
          semanticBasis: RELATIONAL_QUERY_BASIS,
          gate: {
            kind: "by-construction",
            why: "the adjacency read one step outwards — a declaration, not an inference",
          },
        },
        {
          form: "reachability",
          basis: "composed",
          semanticBasis: RELATIONAL_QUERY_BASIS,
          gate: { kind: "declared", by: PATH_LICENSE },
        },
        {
          form: "path",
          basis: "composed",
          semanticBasis: RELATIONAL_QUERY_BASIS,
          gate: { kind: "declared", by: PATH_LICENSE },
        },
        {
          form: "shortest-path",
          basis: "composed",
          semanticBasis: RELATIONAL_QUERY_BASIS,
          gate: { kind: "declared", by: PATH_LICENSE },
        },
        {
          form: "all-paths",
          basis: "composed",
          semanticBasis: RELATIONAL_QUERY_BASIS,
          gate: { kind: "declared", by: PATH_LICENSE },
        },
        {
          form: "components",
          basis: "composed",
          semanticBasis: RELATIONAL_QUERY_BASIS,
          gate: { kind: "declared", by: PATH_LICENSE },
        },
        {
          form: "cycles",
          basis: "composed",
          semanticBasis: RELATIONAL_QUERY_BASIS,
          gate: {
            kind: "by-construction",
            why: "a relation type's declared `acyclic` property is checkable even where path composition is forbidden, so cycle detection is licensed independently of it (V8, not V7)",
          },
        },
        {
          form: "containment",
          basis: "composed",
          semanticBasis: RELATIONAL_QUERY_BASIS,
          gate: {
            kind: "by-construction",
            why: "it walks the entity `contains` tree, whose paths are hierarchical by construction rather than a relation type's composed edges",
          },
        },
      ],
      subjects: [
        {
          noun: "entity",
          selector: "property-constraints",
          means:
            "An entity in the model, optionally selected by its declared properties",
          declaredBy: {
            file: "src/ir/types.ts",
            symbol: "CanonEntity",
            role: "the entity and its property map — what a structural question selects",
          },
        },
        {
          noun: "relation type",
          selector: "by-id",
          means:
            "A declared kind of relationship, such as subscribes or carries field",
          declaredBy: {
            file: "src/ir/types.ts",
            symbol: "CanonRelationType",
            role: "the declared relation vocabulary a traversal names; an unnamed type is a typo, not a false answer",
          },
        },
        {
          noun: "model",
          selector: "by-id",
          means: "The structural model in which the question is evaluated",
          declaredBy: {
            file: "src/ir/types.ts",
            symbol: "CanonModel",
            role: "one purposeful model — the scope every relational question states (V34)",
          },
        },
      ],
      predicates: {
        equality: ENTITY_PROPERTIES,
        order: { by: "operator", ops: ORDER_OPS, scopedBy: ORDERED_DOMAIN },
      },
    },
    omits: [
      "what behaviour can occur over time, or in what order",
      "what an execution costs in time, memory or money",
    ],
    renderStrategy: {
      kind: "projected",
      construct: "model",
      projection:
        "entities as boxes and declared relations as typed edges, over one model's own entity set. " +
        "Containment is drawn twice — as an enclosing region and as an explicit edge — because " +
        "enclosure alone would leave position the sole carrier of a containment claim. It preserves " +
        "which things exist, which are related and by which declared relation type, and the " +
        "direction of each. It drops every magnitude and every order of occurrence: an edge says a " +
        "relation is declared, never that anything traverses it or what doing so costs.",
    },
    combineWith: {
      partner: "quantitative-model",
      richerQuestion:
        "Can restricted data reach a service, and what does carrying it there cost?",
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
      {
        file: "src/ir/types.ts",
        symbol: "CanonMachine",
        role: "the canonical shape of one machine",
      },
      {
        file: "src/ir/types.ts",
        symbol: "CanonTransition",
        role: "one transition, with guards, effects and synchronization",
      },
      {
        file: "mage-model.schema.json",
        symbol: '"machines"',
        role: "the authored form, in the published wire schema",
      },
      {
        file: "SEMANTICS.md",
        symbol: "## 4. State machines",
        role: "normative semantics",
      },
    ],
    semanticBasis: {
      kind: "borrowed",
      standard: "SysML v2",
      concept:
        "the behavioral, state and succession subsets — occupancy of a named state and the " +
        "declared succession from one to the next, of which a MAGE machine is a restricted " +
        "realization over finite variable domains",
      clause: CLAUSE_OWED,
      fixture: null,
    },
    query: {
      forms: BEHAVIOR_FORMS,
      // The engine owns no behavioural analogue of `GRAPH_COMPOSING`, and it should not: a
      // behavioural question composes CONFIGURATIONS rather than edges, and the configuration space
      // is the type's own semantics rather than a privilege a declaration withholds. Every
      // behavioural gate is therefore `by-construction` below, and a set here would be empty.
      composing: null,
      interpretedBy: {
        file: "src/engine/behavior.ts",
        symbol: "export function interpretation",
        role: "each behavioural form's meaning in plain language, parameterized by the question asked (V21)",
      },
      licensedBy: [CONFIGURATION_SPACE, VARIABLE_DOMAIN],
      // The behavioural forms are where the attribution is least uniform, and the unevenness is the
      // ground truth rather than a gap in the record. `DESIGN-v02-ltl-foundation-261004.md` §9.1
      // works out which shipped forms bridge to a temporal-logic formula and names the two that do
      // NOT: `transition-live`, because its propositions would have to range over steps rather than
      // configurations, and `recurrence`, because re-entry is a reachability class and not an
      // ω-property. Claiming LTL for all six would be the flattering failure §35.3 names, applied
      // to a foundation instead of to a standard.
      primitives: [
        {
          form: "reach",
          basis: "composed",
          semanticBasis: {
            kind: "extension-grounded",
            foundation: LTL_FOUNDATION,
            why:
              "an existential reachability question, and the bridge is an equivalence: `reach p` " +
              "holds exactly when LTL `G not p` is refuted, with the refuting trace's prefix as the " +
              "witness (LTL foundation §9.1)",
          },
          gate: {
            kind: "by-construction",
            why: "arrival at a configuration satisfying a predicate is what a state machine MEANS; no declaration withholds it",
          },
        },
        {
          form: "invariant",
          basis: "composed",
          semanticBasis: {
            kind: "extension-grounded",
            foundation: LTL_FOUNDATION,
            why:
              "LTL `G p`, and the bridge is an identity rather than an analogy: every reachable " +
              "configuration lies on a trace and every trace configuration is reachable (LTL " +
              "foundation §9.1)",
          },
          gate: {
            kind: "by-construction",
            why: "a claim over every reachable configuration, decided on the same closure `reach` walks",
          },
        },
        {
          form: "recurrence",
          basis: "composed",
          semanticBasis: {
            kind: "extension",
            why:
              "re-entry of a target configuration is a reachability class, not an ω-property, so " +
              "the LTL foundation asserts no bridge for it and asserting one would re-conflate what " +
              "§7.2a separates (LTL foundation §9.1) — the form is the Workbench's own",
          },
          gate: {
            kind: "by-construction",
            why: "re-entry of a target configuration, which the closure exhibits or does not",
          },
        },
        {
          form: "repeatable-cycle",
          basis: "composed",
          semanticBasis: {
            kind: "extension-grounded",
            foundation: LTL_FOUNDATION,
            why:
              "non-emptiness of the model read as a Büchi automaton whose single acceptance set " +
              "is the target predicate; the lasso it returns visits that predicate infinitely often, " +
              "which is LTL `F G not t` refuted (LTL foundation §1, §9.1)",
          },
          gate: {
            kind: "by-construction",
            why: "a genuinely repeating configuration — a lasso — which the closure exhibits or does not",
          },
        },
        {
          form: "deadend",
          basis: "composed",
          semanticBasis: {
            kind: "extension",
            why:
              "a reachable configuration with no enabled step. The LTL foundation asserts only a " +
              "one-directional bridge for it, at the stutter-closure boundary where the closed and " +
              "un-closed trace domains differ (§9.1), so no temporal-logic equivalence grounds the " +
              "form and it is claimed as the Workbench's own",
          },
          gate: {
            kind: "by-construction",
            why: "a reachable configuration with no enabled step; the transition declarations decide, and nothing gates asking",
          },
        },
        {
          form: "transition-live",
          basis: "composed",
          semanticBasis: {
            kind: "extension",
            why:
              "the LTL foundation excludes it deliberately: its atomic propositions range over " +
              "configurations, and a step-labelled proposition is a later question rather than a gap " +
              "(§9.1). So there is no bridge, and the form is the Workbench's own",
          },
          gate: {
            kind: "by-construction",
            why: "whether a declared transition is executable somewhere in the closure; an undeclared one is unlicensed as a typo, not refuted",
          },
        },
      ],
      subjects: [
        {
          noun: "machine",
          selector: "by-id",
          means: "The state machine in which the question is evaluated",
          declaredBy: {
            file: "src/ir/types.ts",
            symbol: "CanonMachine",
            role: "one machine — its states, variables and initial configuration",
          },
        },
        {
          noun: "state",
          selector: "predicate",
          means: "A named state of that machine, referenced as machine.state",
          declaredBy: {
            file: "src/engine/types.ts",
            symbol: "Predicate",
            role: "a state is named inside a predicate (`machine.state`), never selected on its own",
          },
        },
        {
          noun: "variable",
          selector: "predicate",
          means: "A machine variable and one of its declared values",
          declaredBy: VARIABLE_DOMAIN,
        },
        {
          noun: "transition",
          selector: "selector",
          means:
            "A transition identified by any combination of machine, source state, target state and synchronization label",
          declaredBy: {
            file: "src/engine/types.ts",
            symbol: "TransitionSelector",
            role: "the partial match — machine, from, to, sync — a behavioural question names a transition by",
          },
        },
      ],
      predicates: {
        equality: VARIABLE_DOMAIN,
        order: { by: "operator", ops: ORDER_OPS, scopedBy: VARIABLE_DOMAIN },
      },
    },
    omits: [
      "how long an execution takes, or what it costs",
      "which services are connected to which, outside the states it steps",
    ],
    renderStrategy: {
      kind: "projected",
      construct: "machine",
      projection:
        "declared control states as nodes and transitions as edges, seeded from the initial state " +
        "rather than from in-degree zero, because a lifecycle is usually cyclic and would offer no " +
        "seed. An event name stays written on its edge, unlike a relation type: two states joined " +
        "by two transitions are distinguishable only by those words. It preserves which states " +
        "exist, which steps are declared between them and on what event. It drops the " +
        "configuration space the declarations span — a drawn state is one declared state, never a " +
        "reachable configuration — and it drops variable valuations entirely.",
    },
    combineWith: {
      partner: "quantitative-model",
      richerQuestion:
        "Can a document reach Published within the declared latency ceiling?",
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
      {
        file: "src/ir/types.ts",
        symbol: "CanonQuantity",
        role: "the canonical shape of one quantitative annotation",
      },
      {
        file: "src/ir/types.ts",
        symbol: "CanonAccounting",
        role: "the declared accounting model — how a quantity reaches an analysis",
      },
      {
        file: "src/ir/types.ts",
        symbol: "DIMENSIONS",
        role: "the closed dimension table quantities normalize against",
      },
      {
        file: "mage-model.schema.json",
        symbol: '"quantities"',
        role: "the authored form, in the published wire schema",
      },
      {
        file: "SEMANTICS.md",
        symbol:
          "### 5.2 Quantities annotate the model; they are not part of it",
        role: "normative semantics",
      },
    ],
    semanticBasis: {
      kind: "borrowed",
      standard: "SysML v2",
      concept:
        "a subset of the Quantities and Units library — a magnitude that carries its " +
        "dimension and unit rather than being a bare number, which is what makes a comparison " +
        "across two dimensions a category error instead of arithmetic",
      clause: CLAUSE_OWED,
      fixture: null,
    },
    query: {
      forms: REQUIREMENT_METRICS,
      // Null for the same reason as the state machine's, and NOT because nothing composes here: a
      // path-aggregated metric sums charges along a walk and is gated per instance by the declared
      // accounting basis. That gate lives on the primitive, where its citation can be read.
      composing: null,
      interpretedBy: {
        file: "src/quant/query.ts",
        symbol: "runQuantityQuery",
        role: "each metric's meaning in plain language, produced beside the evaluation it describes (V21)",
      },
      licensedBy: [ACCOUNTING_BASIS, RESIDENCY_DECLARATION, DIMENSION_TABLE],
      primitives: [
        {
          form: "latency",
          basis: "aggregated",
          semanticBasis: QUANTITY_METRIC_BASIS,
          gate: { kind: "declared", by: ACCOUNTING_BASIS },
        },
        {
          form: "cost",
          basis: "aggregated",
          semanticBasis: QUANTITY_METRIC_BASIS,
          gate: { kind: "declared", by: ACCOUNTING_BASIS },
        },
        {
          form: "peak_memory",
          basis: "aggregated",
          semanticBasis: QUANTITY_METRIC_BASIS,
          gate: { kind: "declared", by: RESIDENCY_DECLARATION },
        },
      ],
      subjects: [
        {
          noun: "quantity",
          selector: "by-id",
          means: "A declared magnitude with its dimension and unit",
          declaredBy: {
            file: "src/ir/types.ts",
            symbol: "CanonQuantity",
            role: "one quantitative annotation — its target, dimension and declared value",
          },
        },
        {
          noun: "execution",
          selector: "predicate",
          means:
            "An execution of the system, selected by a behavioural predicate",
          declaredBy: {
            file: "src/engine/types.ts",
            symbol: "QuantityQuery",
            role:
              "`target` — the reach predicate selecting which executions are measured; the " +
              "predicate grammar is the state machine's, which is what the registered " +
              "`executions-selected-by-behaviour` COMPOSITION is for",
          },
        },
        {
          noun: "ceiling",
          selector: "by-id",
          means: "A declared limit a computed figure is compared against",
          declaredBy: {
            file: "src/engine/types.ts",
            symbol: "QuantityQuery",
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
    },
    omits: [
      "which executions are possible at all — that is the state machine's claim",
      "what is connected to what — that is a structural model's claim",
    ],
    renderStrategy: {
      kind: "projected",
      construct: "quantitative-model",
      projection:
        "one dimension's accounting as extent against a threshold: each allocation's declared " +
        "magnitude, the total they charge, the declared ceiling and the margin between. It " +
        "preserves every figure and the verdict, and it preserves a member that charges nothing — " +
        "an annotation reaching no summand is still a member, because a total that silently " +
        "dropped it would read as measured over a complete model. It drops topology: nothing here " +
        "says what is connected to what, or in what order anything runs. That is the reduction, " +
        "and it is why forcing these facts through the structural extractor drew a dependency " +
        "graph where a budget belonged.",
    },
    combineWith: {
      partner: "state-machine",
      richerQuestion:
        "Which reachable execution attains the worst-case latency, and does it stay under the ceiling?",
    },
    presentIn: (s) => s.quantities.size > 0,
    wouldLicense:
      "declare quantities under `quantities:` (each with a dimension and a target) and an " +
      "`accounting:` basis for path-aggregated metrics; the quantity metrics are computed from " +
      "those declarations and from nothing else.",
  },
];

// --------------------------------------------------------------------------------------------
// The two cross-model registries
// --------------------------------------------------------------------------------------------

/**
 * The binding subset borrowed from KerML — §35.4's `binding` row, and the FOURTH presently
 * implementable borrowed-semantic fixture target (§4.5). The three ahead of it are the three
 * `ModelType.semanticBasis` rows; the fifth borrowed row, requirement and verification, gained its
 * construct on 261004 — `requirements:` is a top-level key of the published schema and
 * `src/engine/verification.ts` carries §5.3's vocabulary — so all five rows are now implementable
 * and none is waiting on a construct.
 *
 * One object shared by all three bindings, because they are one §35.4 row — the identity discipline
 * `QueryPrimitive.semanticBasis` already uses, so the registry carries one claim rather than three
 * paraphrases of it.
 *
 * **What is borrowed, exactly.** KerML's binding connector asserts that two features denote the
 * same thing. MAGE borrows that ASSERTION and nothing else: a closed set of three declared
 * correspondences over the kernel's three model types, each read by the kernel at a named site. A
 * MAGE binding says *these two model elements denote the same thing*, and that sentence is the
 * whole of the borrowing.
 *
 * **What is NOT borrowed — named, because §4.5 says in terms "do not claim that MAGE binding
 * implements all KerML binding semantics", and a row without this list would be the over-attribution
 * §35.3 forbids:**
 *
 *   - **No value-identity propagation.** A KerML binding makes its two ends' values the same, in
 *     both directions. A MAGE binding carries nothing across: §23 says it "does not imply equality
 *     between arbitrary objects", and no evaluator reads a binding to transport a property value.
 *   - **No binding of expression parameters, invocation arguments or feature chains.** KerML binds
 *     features wherever a feature can be written, including inside expressions. MAGE binds the
 *     three element pairs below and nothing else.
 *   - **No type unification through a binding.** Nothing here infers a type from a binding's other
 *     end. The three correspondences are READ, never solved.
 *   - **No author-declarable connector vocabulary.** A KerML model may declare a binding connector.
 *     MAGE's set is closed in this registry, so a model cannot introduce a fourth.
 *   - **No multiplicity or cardinality semantics on a binding's ends.**
 *
 * So: a restricted realization of the binding-connector assertion over a closed element set. The
 * clause stays owed and the fixture null for §35.4's stated reason — a clause written from memory
 * reads as checked — and the fixture, when it lands, pins ONE of the three bindings and says
 * nothing about the others or about completeness (§35.6).
 */
const KERML_BINDING_BASIS: SemanticBasis = {
  kind: "borrowed",
  standard: "KerML",
  concept:
    "the binding subset — KerML's assertion that two model elements denote the same thing, " +
    "of which a MAGE binding is a restricted realization: a closed set of three declared " +
    "correspondences, carrying none of KerML's value-identity propagation, expression-parameter " +
    "or feature-chain binding, type unification, or author-declarable connector vocabulary",
  clause: CLAUSE_OWED,
  fixture: null,
};

/** A model's membership, which is what shared identity corresponds across. */
const MODEL_MEMBERSHIP: SchemaAuthority = {
  file: "src/ir/types.ts",
  symbol: "CanonModel",
  role: "`entities` — one purposeful model's membership; two models naming one id name one entity",
};

/**
 * The existing mechanism §4.2 requires `machine-of-entity` to reuse rather than duplicate.
 *
 * It is `CanonMachine.entity` (`src/ir/types.ts`): `readonly entity: string | null` — the
 * structural element a machine's behaviour is about, or null when it is about none. It is already
 * load-bearing in four places, which is why duplicating it would be the second source of truth §4.2
 * is warning about: the validator refuses an undeclared referent (V6, `src/validator/rules.ts`),
 * the RDF projection emits it as `MAGE.describes` (`src/rdf/project.ts`), the inspector navigates
 * on it (`src/ui/shell/inspector.ts`), and the transaction layer reports it as a reference site
 * (`src/transaction/references.ts`). This registry CITES it; it adds no field of its own.
 */
const MACHINE_ENTITY_LINK: SchemaAuthority = {
  file: "src/ir/types.ts",
  symbol: "CanonMachine",
  role:
    "`entity` — the structural element a machine's behaviour is about, or null when it is " +
    "about none; V6 refuses a referent the system does not declare",
};

const ENTITY_STATE_PROPERTY: SchemaAuthority = {
  file: "src/ir/types.ts",
  symbol: "EXECUTES_IN_STATE",
  role:
    "`executes_in_state` — the kernel's spelling of the property, read by the validator (V38 " +
    "resolves it through the resolver a quantity's `state:` target uses) and by the quantitative " +
    "evaluator; a model may spell the same shape under its own key, and then only that model's " +
    "own suite holds the reference",
};

const QUANTITY_TARGET: SchemaAuthority = {
  file: "src/engine/types.ts",
  symbol: "QuantityQuery",
  role: "`target` — the reach predicate where a behavioural result enters a quantitative question",
};

/**
 * Every declared correspondence between elements in different purposeful models (§4.2).
 *
 * The array is annotated, not inferred, which is rung 1: a row omitting `semanticBasis` — or any
 * other required field — is a compile error here, held by the compiler and by no test.
 *
 * **Three entries, and they sort cleanly.** The four rows the old `joins` census held split 3/1
 * along §4.1's line, which is the asymmetry the ruling named. `appears-in`, `machine-of-entity` and
 * `state-of-entity` each declare a correspondence and consume no query result; only
 * `executions-selected-by-behaviour` consumes one, and it is the single `COMPOSITIONS` row below.
 * No entry needed forcing, and none was dropped.
 */
export const BINDINGS: readonly BindingSemantics[] = [
  {
    name: "appears-in",
    from: "structural-graph",
    to: "structural-graph",
    interpretation:
      "one entity's identity across the purposeful models that mention it, so an " +
      "answer in one model can name the element another model declares",
    // Nothing per system to consult, which is what distinguishes this from the two below: the
    // correspondence is not declared anywhere, it FOLLOWS from the id namespace being one namespace.
    licensing: {
      kind: "by-construction",
      why:
        "entity ids inhabit ONE namespace per system, so two purposeful models naming the same " +
        "id name the same entity; there is no per-system declaration that could license the " +
        "correspondence and none that could withhold it",
    },
    correspondence: { source: "entity", target: "model" },
    witness: {
      kind: "shared-membership",
      why:
        "a model's `entities` MEMBERSHIP is the correspondence, so no authored key spells it — " +
        "and this binding runs between models of one type, which the census derivation (cross-TYPE " +
        "pairs only) cannot witness even in principle",
    },
    declaredBy: MODEL_MEMBERSHIP,
    semanticBasis: KERML_BINDING_BASIS,
  },
  {
    name: "machine-of-entity",
    from: "state-machine",
    to: "structural-graph",
    interpretation:
      "this behavioural model describes this structural entity, so a behavioural " +
      "answer can name the element whose behaviour it describes — §23's own example, " +
      "transaction-lifecycle being the behavioural model of transaction-engine",
    licensing: { kind: "declared", by: MACHINE_ENTITY_LINK },
    correspondence: { source: "machine", target: "entity" },
    witness: { kind: "authored-property", keys: ["entity"] },
    declaredBy: MACHINE_ENTITY_LINK,
    semanticBasis: KERML_BINDING_BASIS,
  },
  {
    // The census under-reported this edge until 261004, and the edge it dropped is the one entity
    // accounting charges through. Under the old shape its PLACEMENT was also a judgement a reader
    // had to reconstruct — it sat on the graph side because the reference is made by an ENTITY.
    // `from`/`to` state that now, so the convention is gone.
    name: "state-of-entity",
    from: "structural-graph",
    to: "state-machine",
    interpretation:
      "an entity property naming a state, so a structural answer can name the " +
      "lifecycle state during whose occupancy that entity runs — and so the quantitative " +
      "evaluator can charge a trace step entering that state to that entity",
    licensing: { kind: "declared", by: ENTITY_STATE_PROPERTY },
    correspondence: { source: "entity", target: "state" },
    // The KERNEL's spelling, and only that. A model may spell the same correspondence under its own
    // property name, which the kernel does not resolve — and those spellings are NOT declared here,
    // because EX-I1 forbids an engine source naming an example and a model-local key would smuggle
    // one in. `test/bindings-census.test.ts` declares them beside the walk, where facts about the
    // tracked corpus already live, and holds the two sets disjoint so neither hides the other.
    witness: { kind: "authored-property", keys: ["executes_in_state"] },
    declaredBy: ENTITY_STATE_PROPERTY,
    semanticBasis: KERML_BINDING_BASIS,
  },
];

/**
 * The cross-domain semantic compositions (§4.3). v0.2 admits exactly ONE, and that is a ruling.
 *
 * *"This must not become a generic pipeline mechanism."* A second row is a deliberate act with a
 * ruling to cite, not a convenience: §4.3 forbids adding cross-model `pipe`, `join`, `fold`,
 * `flatMap` or higher-order composition *"merely to make examples convenient"*, and the five
 * built-in examples (§19 waves 5–7) are exactly the pressure that would ask for them.
 */
export const COMPOSITIONS: readonly CompositionSemantics[] = [
  {
    name: "executions-selected-by-behaviour",
    from: "state-machine",
    to: "quantitative-model",
    interpretation:
      "a behavioural predicate selects the executions over which a quantitative " +
      "question is evaluated — the behavioural result constrains the DOMAIN of the quantitative " +
      'operation, which is what makes "the maximum latency among successful executions" one ' +
      "question rather than two",
    licensing: { kind: "declared", by: QUANTITY_TARGET },
    restricts: "execution",
    result: {
      file: "src/engine/types.ts",
      symbol: "Verdict",
      role:
        "the TARGET dialect's own result — a magnitude decided against a declared ceiling; a " +
        "composition narrows a domain and introduces no result kind of its own",
    },
    declaredBy: QUANTITY_TARGET,
    // Not borrowed, and the restraint is the point: SysML v2's analysis-case machinery is a
    // different construct at a different granularity, and naming it here to make the row look
    // grounded would be the flattering over-attribution §35.3 forbids.
    semanticBasis: {
      kind: "extension",
      why:
        "restricting a quantitative evaluation domain with a behavioural predicate is the " +
        "Workbench's own analysis composition — no SysML v2 or KerML construct defines it, and a " +
        "reader who goes looking for it in either specification will not find it",
    },
  },
];

/**
 * The bindings either of whose domains is this type — recomputed, never stored (the V18 discipline
 * `derivedPrimitives` follows). Both directions, because a facade offering a type's cross-model
 * affordances needs the ones that point AT it as much as the ones that point away.
 */
export const bindingsOf = (id: ModelTypeId): readonly BindingSemantics[] =>
  BINDINGS.filter((b) => b.from === id || b.to === id);

/** The compositions either of whose domains is this type. Recomputed, for the same reason. */
export const compositionsOf = (
  id: ModelTypeId,
): readonly CompositionSemantics[] =>
  COMPOSITIONS.filter((c) => c.from === id || c.to === id);

const BY_KIND: ReadonlyMap<Query["kind"], ModelType> = new Map(
  MODEL_TYPES.map((t) => [t.queryKind, t]),
);

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
  system: CanonicalSystem,
  kind: Query["kind"],
  hash: string,
): Verdict | null {
  const t = modelTypeForQueryKind(kind);
  return t.presentIn(system)
    ? null
    : unlicensed(
        hash,
        absentSubstrateProse(t),
        null,
        detail("missing-model-type", [t.label], []),
      );
}
