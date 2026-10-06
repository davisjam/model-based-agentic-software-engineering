/**
 * Canonical IR — the authoritative semantic representation.
 *
 * Per the component model this module depends on NOTHING: no YAML, no DOM, no renderer, no agent.
 * `workbench/models/workbench-components.mage.yaml` declares that, and three gates hold it.
 * `test/model-coverage.test.ts` answers the model's kernel queries in CI; `validate.py` answers
 * them again independently and `--self-test` catches a violation injected into the model, from the
 * pre-push hook. Both read the model's DECLARED edges, so neither would see an import added here —
 * that is `test/import-graph.test.ts`, which parses every specifier under `src/`, resolves each to
 * the entity owning its path, and fails on an import the model does not declare. It holds this
 * module's out-degree at zero against the observed graph specifically, so editing the model to
 * permit an edge does not buy one.
 *
 * The bound, stated because this sentence has twice claimed more than it held. A
 * RELATIVE-SPECIFIER import added here goes red, and that is every import this package writes. The
 * gate resolves no path aliases, so an aliased specifier slips its scan: `#view/invariants.ts`
 * reads as a bare package name, and `REAUDIT-system-models-261004.md` M4 drove exactly that import
 * from this file with tsc clean and the node tier green. What closes the channel is a separate
 * assertion inside the same gate rather than its scan. `ALIAS_CHANNELS` fails if `tsconfig.json`
 * declares `paths` or `baseUrl`, or `package.json` an `imports` map, so an alias added here trips
 * the precondition instead of being read as an edge, and aliasing cannot be switched on quietly.
 *
 * Everything is `readonly`. The IR is produced once by canonicalize() and never mutated in place:
 * a transaction builds a NEW system and swaps it, which is what makes undo/redo and hypothesis
 * branches fall out of one mechanism instead of three.
 *
 * Semantics: ../../SEMANTICS.md. Every `V<n>` cited in a comment here is that document's rule id.
 * A range was written out once and went stale twice, so the range is gone: the spec owns the count.
 */

// --------------------------------------------------------------------------------------------
// Values and domains
// --------------------------------------------------------------------------------------------

/** Every value in the state vector is one of these. V17 forbids reals and unbounded integers. */
export type Scalar = string | number | boolean;

export type DomainKind = "enum" | "ordered-enum" | "boolean" | "integer";

export interface CanonDomain {
  readonly id: string;
  readonly kind: DomainKind;
  /** Declaration order IS the order for ordered-enum, ascending (V20). */
  readonly values: readonly string[];
  readonly range: readonly [number, number] | null;
}

/** A variable's finite domain, resolved from an inline declaration or a named domain. */
export interface CanonVariable {
  readonly id: string;
  readonly machine: string;
  readonly kind: "boolean" | "integer" | "enum";
  /** Every legal value, enumerated. Finiteness is not a hope here; it is a list. */
  readonly domain: readonly Scalar[];
  readonly initial: Scalar;
}

// --------------------------------------------------------------------------------------------
// Structure
// --------------------------------------------------------------------------------------------

export interface CanonEntity {
  readonly id: string;
  readonly type: string | null;
  readonly label: string;
  readonly properties: ReadonlyMap<string, PropertyValue>;
  readonly contains: readonly string[];
  readonly parent: string | null;  readonly annotation: Annotated;
}

export interface PropertyValue {
  readonly value: Scalar;
  /** Names a domain; required for order comparisons to typecheck (V20). */
  readonly domain: string | null;
}

/**
 * A declared aggregation over a relation type (§3.2, V45/V46).
 *
 * The OBLIGATION, never the value. v0.1 computes nothing over a relation, so the source's aggregate
 * stays authored on the entity; this says what it must equal, so a repair at the edge layer stops
 * being a silent no-op. `using` carries the raw declaration because an unsupported operator is V45's
 * finding rather than a parse failure — defaulting it would make a typo mean `max`.
 */
export interface CanonRelationAggregate {
  /** The property on the SOURCE entity carrying the authored aggregate. */
  readonly declared: string;
  /** The property read off each TARGET entity and aggregated. */
  readonly over: string;
  /** As written. `max` is the only supported operator; anything else is a V45 finding. */
  readonly using: string;
}

export interface CanonRelationType {
  readonly id: string;
  readonly description: string;
  readonly absence: string | null;
  /** `forbidden` makes a multi-hop query over this type UNLICENSED, not false (V7). */
  readonly pathComposition: "allowed" | "forbidden";
  readonly symmetric: boolean;
  readonly acyclic: boolean;
  /** §3.2. Null when the author declared no aggregation, which is the ordinary case. */
  readonly aggregates: CanonRelationAggregate | null;
  /**
   * §3.3. The entity-type names allowed at this relation type's SOURCE, or null when undeclared.
   *
   * Null and [] are different declarations: null constrains nothing and licenses nothing (the
   * ordinary case), while an authored empty list names no kind at all and is a V47 finding rather
   * than a legal "nothing may sit here". The loader normalizes a bare string to a one-element list,
   * so `domain: service` and `domain: [service]` are one system (and one hash).
   */
  readonly domain: readonly string[] | null;
  /** §3.3. The entity-type names allowed at the TARGET. Same semantics as `domain`. */
  readonly range: readonly string[] | null;
}

/**
 * One declared entity type — the optional `entity-types:` vocabulary (§3.3).
 *
 * Declares a kind by NAME so a domain/range declaration can resolve against it before any entity
 * carries it (V47), and so "naming a semantic equivalence class" has an authored home. It is a
 * vocabulary, not a taxonomy: no subtyping, no structure, and an entity's `type:` is not required
 * to appear here.
 */
export interface CanonEntityType {
  readonly id: string;
  /** For humans. Prose, so it stays out of the hash the way a relation type's description does. */
  readonly description: string;
}

export interface CanonRelation {
  readonly id: string | null;
  readonly model: string;
  readonly from: string;
  readonly to: string;
  readonly type: string;  readonly annotation: Annotated;
}

export interface Purpose {
  readonly question: string | null;
  readonly represents: readonly string[];
  /** Checked against the model's real vocabulary, never merely asserted (V24). */
  readonly omits: readonly string[];
}

export interface CanonModel {
  readonly id: string;
  readonly label: string;
  readonly purpose: Purpose;
  readonly entities: readonly string[];  readonly annotation: Annotated;
}

// --------------------------------------------------------------------------------------------
// Annotation and provenance — first-class, and deliberately NON-SEMANTIC
// --------------------------------------------------------------------------------------------

/**
 * The note vocabulary. Small on purpose.
 *
 * `assumption` is the interesting one, and the boundary it marks is the point of the whole feature:
 * a note SAYING something is an assumption does not make that assumption part of formal analysis.
 * If an assumption must constrain a query, it has to be represented formally — as a property, a
 * variable, a guard, a quantity. Context can be abundant; formal commitment is deliberate.
 */
export type NoteKind = "comment" | "rationale" | "assumption" | "question" | "todo";

export interface Note {
  readonly id: string;
  readonly kind: NoteKind;
  readonly text: string;
  /**
   * Keys on the note object that are not part of a note.
   *
   * Almost always the signature of an unquoted comma in YAML flow style: `{ text: a, b }` loads as
   * `text: "a"` plus a stray key `b`, truncating the note silently. Kept rather than dropped so a
   * validation rule can say so -- a note that lost half its text is worse than one that failed to
   * load, because nothing looks wrong.
   */
  readonly unexpectedKeys: readonly string[];
  /** "human" | "agent" — who wrote it. Not an identity claim, just which side. */
  readonly author: string | null;
  readonly at: string | null;
}

/**
 * How an object came into existence.
 *
 * The PROMPT is the valuable field. With agent-authored models it answers the question a reader
 * actually has — *why does this model have this shape, and what was the agent asked to preserve?* —
 * which no amount of reading the model itself will tell you.
 *
 * Deliberately NOT the whole conversation: that is noisy, potentially huge, and may carry
 * irrelevant or private material. Just the instruction that produced this object, plus an optional
 * concise rationale the agent supplied.
 */
export interface Provenance {
  readonly createdBy: string | null;
  readonly createdAt: string | null;
  readonly prompt: string | null;
  readonly rationale: string | null;
  /** Append-only. System-managed: never editable commentary. */
  readonly history: readonly HistoryEntry[];
}

export interface HistoryEntry {
  /** The semantic revision this entry produced. */
  readonly revision: string | null;
  readonly actor: string | null;
  readonly prompt: string | null;
  readonly action: string | null;
  readonly at: string | null;
}

/**
 * Annotation carried by any semantic object.
 *
 * **The invariant (A1):** annotations SHALL NOT alter the semantic interpretation or analysis result
 * of a model unless their content is explicitly represented by a semantic construct.
 *
 * This is held STRUCTURALLY, not by discipline: `systemHash` excludes annotation entirely, so two
 * systems differing only in notes are the SAME system. Three consequences follow, and all three are
 * tested:
 *
 *  1. A note cannot change a query result, because the engine reads the configuration space and
 *     annotation is not in it.
 *  2. Adding a note does not invalidate a pending agent transaction — the same argument that kept
 *     view positions out of the IR.
 *  3. A note-adding transaction therefore commits WITHOUT advancing the semantic revision, which is
 *     surprising until you accept that the hash identifies semantics rather than edits.
 */
export interface Annotated {
  readonly notes: readonly Note[];
  readonly provenance: Provenance | null;
}

export const NO_ANNOTATION: Annotated = { notes: [], provenance: null };

// --------------------------------------------------------------------------------------------
// Behavior
// --------------------------------------------------------------------------------------------

export type GuardOp = "eq" | "ne" | "lt" | "le" | "gt" | "ge";

export interface Guard {
  /** Dotted reference: `worker.state`, `retry_count`, `document.state`. */
  readonly ref: string;
  readonly op: GuardOp;
  readonly value: Scalar;
}

export interface Effect {
  readonly variable: string;
  /** Right-hand side, restricted to `<var> <+|-> <int>` or a literal — see canonicalize. */
  readonly expression: string;
}

export interface CanonTransition {
  readonly index: number;
  readonly machine: string;
  readonly from: string;
  readonly to: string;
  readonly label: string | null;
  /** Synchronization and nothing else; resolves to an event (V1). Named `sync`, not `on`, per §10.1. */
  readonly sync: string | null;
  readonly guards: readonly Guard[];
  readonly effects: readonly Effect[];
}

export interface CanonMachine {
  readonly id: string;
  readonly entity: string | null;
  readonly instances: number;
  readonly purpose: Purpose;
  readonly initial: string;
  readonly states: readonly string[];
  readonly variables: ReadonlyMap<string, CanonVariable>;
  readonly derived: ReadonlyMap<string, string>;
  readonly transitions: readonly CanonTransition[];
}

export interface CanonEvent {
  readonly id: string;
  readonly participants: readonly string[];
}

/**
 * An expanded machine instance. `instances: 1` yields one instance addressed by the bare machine
 * name; `instances: N` yields `name[0] … name[N-1]`. Multiplicity gives occupancy, never binding
 * (V14) — there is no instance-valued state in v0.1.
 */
export interface MachineInstance {
  readonly id: string;
  readonly machine: string;
  readonly ordinal: number;
}

// --------------------------------------------------------------------------------------------
// Quantities — annotations OVER the model, and never part of it
// --------------------------------------------------------------------------------------------

/**
 * The five core dimensions (§5, plus `ratio` from the §29 ruling).
 *
 * Closed, and closed in CODE rather than in the JSON Schema. An unrecognised dimension is a MEANING
 * finding (V28), so both implementations of the spec cite the same rule; an enum in the schema would
 * make Python answer `SCHEMA` where TypeScript answers `V28`, which is the asymmetry V17 already
 * carries and there is no reason to grow it.
 */
export type Dimension = "duration" | "memory" | "cost" | "ratio" | "count";

/**
 * Which axis a dimension aggregates along. §8: memory is principally a property over
 * configurations, latency and cost over executions.
 *
 * `structural` is a third member the ruling does not name, and it is here to keep the field honest.
 * A hit rate aggregates along neither axis — it parameterizes an analysis. Filing `ratio` under
 * `execution` would license "sum the hit rates along this path", which is the exact category error
 * a typed scope exists to refuse. The scope is DERIVED from the dimension and never authored, so an
 * author cannot pick a convenient one per quantity.
 */
export type QuantityScope = "configuration" | "execution" | "structural";

export interface DimensionSpec {
  /** The unit every literal normalizes to. Null means dimensionless: a bare number, no unit token. */
  readonly base: string | null;
  /** Unit name -> multiplier into the base unit. Empty for a dimensionless dimension. */
  readonly units: Readonly<Record<string, number>>;
  readonly scope: QuantityScope;
  /** Inclusive ceiling on a normalized magnitude, or null when the dimension has none (V29). */
  readonly maximum: number | null;
}

/**
 * The dimension table. Normalization multiplies by one entry of `units` and stops.
 *
 * Every factor is an integer multiple of a power of two — 1, 1000, 1024, 2^-10 — so converting an
 * exactly-representable magnitude introduces NO rounding, and `128 KB + 1 MB` is 1.125 on the nose
 * rather than 1.1250000000000002. That property is why a normalized magnitude can be a plain
 * float64 instead of a rational, and it is not an accident to be rediscovered later:
 * `test/quantities.test.ts` walks this table and asserts it, so a proposed `us: 0.001` fails the
 * gate instead of quietly breaking every equality assertion downstream.
 *
 * The guarantee covers the CONVERSION only. A decimal literal such as `0.8` is not a binary
 * fraction and rounds to the nearest double — identically in both loaders and in our own parser,
 * since all three are IEEE-754 correctly-rounded, so the two implementations still agree.
 *
 * `ratio` and `count` carry no units. §7 spells ratio's base as `"1"`; a dimensionless base and no
 * unit table say the same thing with one condition instead of two.
 */
export const DIMENSIONS: Readonly<Record<Dimension, DimensionSpec>> = {
  duration: { base: "ms", units: { ms: 1, s: 1000 }, scope: "execution", maximum: null },
  memory: { base: "MB", units: { KB: 0.0009765625, MB: 1, GB: 1024 }, scope: "configuration", maximum: null },
  cost: { base: "usd", units: { usd: 1 }, scope: "execution", maximum: null },
  ratio: { base: null, units: {}, scope: "structural", maximum: 1 },
  count: { base: null, units: {}, scope: "structural", maximum: null },
};

export const DIMENSION_IDS: readonly Dimension[] = ["duration", "memory", "cost", "ratio", "count"];

/** Unit token -> the one dimension that owns it. No unit is shared; a test pins that. */
export const UNIT_DIMENSIONS: ReadonlyMap<string, Dimension> = new Map(
  DIMENSION_IDS.flatMap((d) => Object.keys(DIMENSIONS[d].units).map((u): [string, Dimension] => [u, d])),
);

/**
 * A plain decimal, and deliberately nothing else.
 *
 * Exotic numeric spellings are where this project's two loaders disagree, measured: PyYAML reads
 * `017` as 15 (octal), `1_000` as 1000 and `1:30` as 90 (sexagesimal), while the `yaml` package
 * reads the same three as 17, `"1_000"` and `"1:30"`. A unit-bearing literal arrives as a STRING, so
 * its magnitude is parsed here rather than by a loader, and refusing every spelling the two
 * disagree on closes the class outright for duration, memory and cost.
 *
 * Simple literal matching, which is what the regex policy permits — no structure is being parsed.
 */
export const isPlainDecimal = (text: string): boolean => /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(text);

/** Why a written literal did not reach base units. `null` on a magnitude that did. */
export type MagnitudeFault =
  | "absent"
  | "dimension-unknown"
  | "spelling"
  | "unit-missing"
  | "unit-forbidden"
  | "unit-unknown"
  | "unit-foreign";

/**
 * One written magnitude.
 *
 * `base` is the normalized value or null, which is §7's "a quantity reaches anything downstream in
 * base units or not at all" held as a type. The invariant: `base === null` exactly when
 * `fault !== null`. The fault is recorded rather than re-derived so both implementations produce the
 * same message from the same classification instead of each re-deciding what went wrong.
 */
export interface Magnitude {
  /** Verbatim, as written. The finding quotes it; the author has to recognise their own text. */
  readonly raw: string;
  /** The declared unit token, retained even when it is the thing that is wrong. */
  readonly unit: string | null;
  readonly base: number | null;
  readonly fault: MagnitudeFault | null;
}

/** An operand of a quantity expression. Nothing here is evaluated; these carry DIMENSIONS only. */
export type ExprOperand =
  | { readonly kind: "literal"; readonly magnitude: Magnitude; readonly dimension: Dimension | null }
  /** `metrics.<name>`. The name is checked against METRIC_NAMES, not assumed (V31). */
  | { readonly kind: "metric"; readonly name: string }
  /** Another quantity by id; its dimension comes from ITS declaration, so nothing recurses. */
  | { readonly kind: "quantity"; readonly id: string }
  | { readonly kind: "unreadable"; readonly text: string };

export interface ExprFactor {
  /** `*` on the leading factor of a term, which is the identity. */
  readonly op: "*" | "/";
  readonly operand: ExprOperand;
}

export interface ExprTerm {
  /** `+` on the leading term. */
  readonly op: "+" | "-";
  readonly factors: readonly ExprFactor[];
}

export type QuantityValue =
  | { readonly kind: "point"; readonly magnitude: Magnitude }
  | { readonly kind: "range"; readonly low: Magnitude; readonly high: Magnitude }
  | { readonly kind: "expression"; readonly source: string; readonly terms: readonly ExprTerm[] }
  | { readonly kind: "absent" };

/**
 * What a quantity annotates. Closed prefix set (§9), kept in code for the same reason as Dimension.
 *
 * `parameter` names a construct v0.1 does not represent at all. It stays in the union because the
 * ruling lists it, and V27 reports it as a reserved future shape — the treatment V15 already gives
 * `ref` variables, rather than the misleading "no such parameter".
 */
export type TargetKind = "transition" | "relation" | "entity" | "state" | "parameter" | "model";

export const TARGET_KINDS: readonly TargetKind[] =
  ["transition", "relation", "entity", "state", "parameter", "model"];

export interface QuantityTarget {
  /** The whole `kind:ref` string as written. */
  readonly raw: string;
  /** Null when the prefix is not one of the six; V27 reports it. */
  readonly kind: TargetKind | null;
  /** Everything after the first colon. */
  readonly ref: string;
}

/**
 * Kinds an accounting rule has an opinion about: the ones that occur INSIDE an execution or a
 * configuration, so a basis either charges them or refuses them.
 *
 * `model` is excluded deliberately and `parameter` is excluded because it resolves to nothing (V27).
 * See AGGREGATE_TARGET_KIND.
 */
export const ACCOUNTABLE_TARGET_KINDS: readonly TargetKind[] = ["transition", "relation", "entity", "state"];

/**
 * The kind that addresses a whole model rather than an occurrence within one.
 *
 * A `model:` quantity is a declared TOTAL — `path latency is metrics.state_count * 2 ms` — which a
 * requirement is compared against. It is never accumulated per occurrence, so no basis accounts for
 * it and V36/V37 leave it alone. Without this exemption the only way to state a model-level total
 * would be to invent a kind for it.
 */
export const AGGREGATE_TARGET_KIND: TargetKind = "model";

// --------------------------------------------------------------------------------------------
// The declared accounting model (§5.3) — how a quantity reaches an analysis
// --------------------------------------------------------------------------------------------

/**
 * How a path-aggregated metric charges its annotations.
 *
 * A CLOSED set of one for v0.1, and closed is the point: adding `transitions` later is then a
 * deliberate act. A permissive union such as `all` was rejected by the ruling because "double
 * counting then becomes an authoring problem with no principled answer" — and a permissive basis
 * cannot be narrowed later without breaking every model that relied on it.
 */
export type AccountingBasis = "entities";

export const ACCOUNTING_BASES: readonly AccountingBasis[] = ["entities"];

/** Which target kinds a basis charges. `entities` charges one occurrence of an entity. */
export const BASIS_TARGET_KINDS: Readonly<Record<AccountingBasis, readonly TargetKind[]>> = {
  entities: ["entity"],
};

/**
 * The path-aggregated metrics, and the dimension each one accounts for.
 *
 * A metric is not a dimension: the ruling writes `accounting.latency` over quantities whose
 * dimension is `duration`, because `latency` names the ANALYSIS and `duration` names the unit
 * algebra. Keeping the two vocabularies apart is what lets `cost` be a metric and a dimension
 * without the identity being an assumption.
 *
 * Do not confuse this with METRIC_NAMESPACE below. `metrics.state_count` is a fact computed FROM the
 * model (§10); an accounted metric is an analysis OVER declared quantities. Both live in the
 * quantity layer, so the distinction is stated rather than left to the reader.
 *
 * The membership is DERIVED, not chosen: a metric is path-aggregated exactly when its dimension's
 * scope is `execution`. `test/quantities.test.ts` walks DIMENSIONS and asserts the two agree, so a
 * dimension that becomes execution-scoped without a metric fails the gate instead of silently
 * acquiring quantities nothing accounts for.
 */
export type AccountedMetric = "latency" | "cost";

export const ACCOUNTED_METRICS: Readonly<Record<AccountedMetric, Dimension>> = {
  latency: "duration",
  cost: "cost",
};

export const ACCOUNTED_METRIC_IDS: readonly AccountedMetric[] = ["latency", "cost"];

/** One `accounting:` entry, as written. Both `null`s are V35's findings. */
export interface CanonAccounting {
  /** The metric name as written, which is the map key. */
  readonly metric: string;
  /** The dimension this metric accounts for; null when the name is not a path-aggregated metric. */
  readonly dimension: Dimension | null;
  /** The basis as written, so the finding can quote the author's own text. */
  readonly basisRaw: string;
  /** Null when `basisRaw` is not in the closed vocabulary. */
  readonly basis: AccountingBasis | null;
}

/**
 * When a configuration-scoped quantity is charged, declared and never inferred.
 *
 * The ruling refused both available defaults: "I would not say 'idle service memory stays resident'
 * or 'idle service memory disappears.' Neither is something MAGE can infer from 'service.'" So
 * residency is authored, and a memory quantity declaring neither form is INVALID rather than inert
 * (V37) — it cannot appear in `memory(c)` under either summand.
 *
 * Closed at one member for the same reason as AccountingBasis.
 */
export type Residency = "resident";

export const RESIDENCIES: readonly Residency[] = ["resident"];

/**
 * The entity property naming the lifecycle state during whose occupancy that entity runs.
 *
 * A property rather than IR structure: the IR cannot hold the correspondence itself in v0.1, and
 * the shipped example established this spelling. It is a kernel constant because TWO kernel
 * components read it — the validator resolves it (V38) and the quantitative evaluator charges a
 * trace step through it — and a second spelling in either would be a correspondence that silently
 * stops corresponding.
 *
 * This is the authored site of the `state-of-entity` BINDING (`src/engine/model-types.ts`), which
 * is where its interpretation, licensing and KerML basis are declared. Not a "join": the 261004
 * ruling splits bindings from compositions and there is no generic semantic join — this one
 * connects denotations, it does not consume a query result.
 */
export const EXECUTES_IN_STATE = "executes_in_state";

/** `when: { state: … }` — the behavioral thing whose activation licenses the charge. */
export interface QuantityWhen {
  /** The state reference as written; null when the block declares no readable `state:` (V37). */
  readonly state: string | null;
  /**
   * Keys the block carries that are not `state`. Kept rather than dropped for the reason
   * `Note.unexpectedKeys` is: a `when` that silently declares nothing charges the quantity nowhere,
   * and nothing looks wrong.
   */
  readonly unexpectedKeys: readonly string[];
}

/**
 * A quantitative annotation.
 *
 * NOT in `Configuration`, and that exclusion is the hard boundary of §6: a real-valued annotation
 * admitted to the state vector would make the reachable space infinite and turn
 * `Coverage.kind: "exhaustive"` into a claim no walk can support.
 */
export interface CanonQuantity {
  readonly id: string;
  readonly target: QuantityTarget;
  /** Null when the declared dimension is not one of the five; V28 reports it. */
  readonly dimension: Dimension | null;
  /**
   * The dimension as written, so the finding can quote the author's own text. Retained only for
   * that: the invariant is `dimension === null` exactly when `dimensionRaw` is not one of the five.
   */
  readonly dimensionRaw: string;
  /** Derived from `dimension`, never authored. Null follows a null dimension. */
  readonly scope: QuantityScope | null;
  readonly value: QuantityValue;
  /**
   * `residency:` as written, or null when the key is ABSENT.
   *
   * Presence and readability are separate facts, and V37 needs both: `residency: transient` is a
   * declaration the author made and got wrong, which is a different finding from declaring nothing.
   */
  readonly residencyRaw: string | null;
  /** Null when absent OR unreadable; `residencyRaw` tells the two apart. */
  readonly residency: Residency | null;
  /** Null when the key is absent. A present-but-empty block is an object with a null `state`. */
  readonly when: QuantityWhen | null;
  readonly annotation: Annotated;
}

/**
 * One quantitative model: the declared accounting over ONE dimension, made addressable.
 *
 * ## Why this exists
 *
 * `quantities` is a flat map of annotations whose targets point at other constructs, so a
 * quantitative model was not a thing you could name. Everything downstream paid for that. A
 * projection of a resource budget has to be handed a subject, and there was none — which is why the
 * Learn page reaches for the structural extractor over a positionally chosen model instead. This is
 * the subject it should have been handed.
 *
 * ## Why ONE PER DIMENSION, and not one per system
 *
 * The dimension is what fixes the aggregation axis (§8): memory is evaluated at a configuration and
 * peaked over the reachable set, duration sums along an execution. Two dimensions are therefore two
 * accounting models that share a map, not one model with two units — and a budget view of SRAM has
 * nothing to say about latency. Keying by dimension is the scoping that the semantics already imply.
 *
 * ## DERIVED, and every step cites a declaration
 *
 * Nothing here is authored and nothing here is positional. `budget` is the `model:`-targeted
 * quantity of this dimension, which `src/quant/query.ts` already defines as a declared TOTAL
 * *"exempt from every accounting basis"* and whose `target.ref` names the host. `allocations` is the
 * evaluator's own membership rule — `src/quant/memory.ts`'s `memoryContributions` selects by
 * dimension and accountable target kind and by nothing else. So this record consolidates a grouping
 * two modules were each computing implicitly; it invents no new one.
 *
 * Excluded from `systemHash` for the reason `instances` is: a function of what is already hashed.
 *
 * ## What it is NOT
 *
 * Not the AUTHORED scoping. Scoping quantities under a `quantitative-models:` block in the wire
 * schema — and moving the `accounting:` declaration inside it, which `CanonicalSystem.accounting`
 * below anticipates — changes the published schema. This is the addressable construct only.
 */
export interface CanonQuantitativeModel {
  /** The dimension, which is also the id: the map is keyed by it. */
  readonly dimension: Dimension;
  /** Derived from the dimension, exactly as `CanonQuantity.scope` is. */
  readonly scope: QuantityScope;
  /** The `model:`-targeted quantity declaring this dimension's total, when one is declared. */
  readonly budget: string | null;
  /** The model the budget is declared against. Null exactly when `budget` is. */
  readonly host: string | null;
  /**
   * Quantity ids charged against the total, by declared id order.
   *
   * Membership is by dimension and accountable target kind. A quantity that reaches no summand —
   * a memory annotation declaring neither `residency` nor `when`, or both (V37) — is STILL a member,
   * because a budget view that silently dropped it would show a plausible total over an incomplete
   * model. Which members actually charge is the readout's finding to report, not this record's to
   * hide.
   */
  readonly allocations: readonly string[];
}

/**
 * Facts computed FROM the model, not asserted ABOUT the modeled system (§10).
 *
 * Snake_case because these keys ARE the authored identifiers: `metrics.state_count`. A typed record
 * rather than a map, so the reserved set is closed at the type level and V31 cannot drift from it.
 *
 * `state_count` counts DECLARED states, summed across machines and not multiplied by `instances`.
 * It is structural, so it must not be confused with the number of reachable configurations — that
 * is a product of exploration, and a model metric that depended on exploration would stop being a
 * fact about the model.
 */
export interface ModelMetrics {
  readonly state_count: number;
  readonly transition_count: number;
  readonly entity_count: number;
  readonly relation_count: number;
}

/** Reserved namespace. A user identifier named this is a finding (V31), never a shadow. */
export const METRIC_NAMESPACE = "metrics";

export const METRIC_NAMES: readonly (keyof ModelMetrics)[] =
  ["state_count", "transition_count", "entity_count", "relation_count"];

// --------------------------------------------------------------------------------------------
// The system
// --------------------------------------------------------------------------------------------

export interface SavedQuery {
  readonly id: string;
  readonly raw: unknown;
}

/**
 * One authored obligation, carried as the author wrote it.
 *
 * `raw` rather than a parsed record, and the reason is the `error` verification status. A
 * declaration that cannot be read is still a declaration: `parseRequirement` turns it into a
 * `RequirementProblem` and `verify` reads it as `error` — *the requirement could not be read, so
 * there is no obligation to judge* — which is a statement about the DECLARATION and never an
 * accusation against the system under design. Parsing strictly here would drop the malformed
 * declaration at load, and a dropped requirement reads as no requirement at all: green, silent, and
 * the worst direction available. The shape is `SavedQuery`'s for the same reason — the engine owns
 * the vocabulary, the IR owns the identity.
 *
 * The `id` is the MAP KEY, hoisted into `raw` by `canonicalize` so one reader serves both surfaces:
 * the authored map here, and the fixture corpus's array of mappings that each spell their own `id`.
 */
export interface SavedRequirement {
  readonly id: string;
  /** The authored mapping, with `id` hoisted from the map key. Read by `parseRequirement`. */
  readonly raw: unknown;
}

export interface CanonicalSystem {
  readonly systemId: string;
  readonly name: string;
  readonly domains: ReadonlyMap<string, CanonDomain>;
  readonly entities: ReadonlyMap<string, CanonEntity>;
  readonly relationTypes: ReadonlyMap<string, CanonRelationType>;
  /** The optional `entity-types:` vocabulary (§3.3). Empty when the section is absent. */
  readonly entityTypes: ReadonlyMap<string, CanonEntityType>;
  /** Flattened across every model: an architectural claim is not escapable by moving an edge. */
  readonly relations: readonly CanonRelation[];
  readonly models: ReadonlyMap<string, CanonModel>;
  readonly machines: ReadonlyMap<string, CanonMachine>;
  readonly instances: readonly MachineInstance[];
  readonly events: ReadonlyMap<string, CanonEvent>;
  readonly quantities: ReadonlyMap<string, CanonQuantity>;
  /**
   * The quantitative models the annotations above constitute, one per declared dimension.
   *
   * DERIVED from `quantities`, the way `instances` is derived from `machines` — so it carries no
   * authored fact of its own and stays out of the hash. It exists because a quantitative model has
   * to be nameable before anything can be a projection OF one. See `CanonQuantitativeModel`.
   */
  readonly quantitativeModels: ReadonlyMap<Dimension, CanonQuantitativeModel>;
  /**
   * The declared accounting model, keyed by metric name as written.
   *
   * v0.1 has exactly one quantitative model per system — the `quantities:` map — so the ruling's
   * "declared per quantitative model" is a top-level block. When quantities are scoped to a model,
   * this declaration moves with them.
   */
  readonly accounting: ReadonlyMap<string, CanonAccounting>;
  readonly queries: ReadonlyMap<string, SavedQuery>;
  /**
   * The authored obligations, keyed by id.
   *
   * The DECLARATION lives here and hashes (it is authored content, so canonicalization carries it
   * and a system that prescribes something is not the system that prescribes nothing). The
   * VERIFICATION does not live here at all: a status is derived per read and stored nowhere, for
   * V18's reason — recording that an obligation is discharged would change the system the claim was
   * about, and the climax the whole construct exists for is *the model changed, the query did not*.
   */
  readonly requirements: ReadonlyMap<string, SavedRequirement>;
}

// --------------------------------------------------------------------------------------------
// Configurations — the state space
// --------------------------------------------------------------------------------------------

/**
 * One point in the state space: every instance's control state, plus every variable's value.
 *
 * Quantities, properties and derived values are NOT here. Properties are immutable (V16); derived
 * values are recomputed and never stored (V18). Keeping them out is what preserves the finite
 * exploration guarantee.
 *
 * Quantities are excluded for a sharper reason than the other two, and §6 makes it normative: their
 * values are real. One admitted here makes the reachable space infinite, and the walk would still
 * report `Coverage.kind: "exhaustive"` — a lie every later result inherits, since that flag is what
 * licenses the strongest claims the workbench makes. A quantity is evaluated OVER a configuration;
 * it is never a coordinate of one. `test/quantities.test.ts` pins the invariant by counting the
 * configurations of a system with and without quantities.
 */
export interface Configuration {
  /** instance id -> state id */
  readonly control: ReadonlyMap<string, string>;
  /** `<instance>.<variable>` -> value */
  readonly values: ReadonlyMap<string, Scalar>;
}

/** A single step. More than one instance means a declared synchronized event fired. */
export interface Step {
  readonly instances: readonly string[];
  readonly sync: string | null;
  readonly label: string | null;
  readonly from: Configuration;
  readonly to: Configuration;
}

export type EvidenceShape = "trace" | "lasso" | "path" | "none";
export type EvidenceRole = "witness" | "counterexample";

export interface Evidence {
  readonly shape: EvidenceShape;
  readonly role: EvidenceRole;
  readonly steps: readonly Step[];
  /** The repeating suffix; present iff shape is "lasso". */
  readonly cycle: readonly Step[] | null;
  /** Entity ids, for graph evidence. */
  readonly nodes: readonly string[] | null;
}

/**
 * Outcome vocabulary: deliberately not true/false. There is no boolean result — there is a claim,
 * its coverage and its evidence — and a bare `true`/`false` in YAML is implicit-typed to a boolean
 * anyway (§10.1, V25).
 */
export type Outcome = "holds" | "refuted" | "inconclusive" | "unlicensed";

export interface Coverage {
  readonly kind: "exhaustive" | "bounded" | "not-applicable";
  readonly statesExplored: number;
  readonly reason: "state-limit" | "time-limit" | "depth-limit" | null;
}

/**
 * Whether this coverage can carry a CONCLUSIVE reading of the verdict travelling with it.
 *
 * Total over `Coverage["kind"]` by the compiler. Declared beside `Coverage` because two layers ask
 * it — the pin path in `src/engine/index.ts` and the requirement layer in
 * `src/engine/verification.ts` — and a second copy is how the two would come to disagree about the
 * one rule V22 states: a truncated exploration carries no refuting force
 * (`src/render/accessible.ts:60-62`). `quant/requirement.ts:13-14` says the same from the
 * evaluator's side, and a requirement line is the strongest reading any surface puts on a result, so
 * it must not be the one surface that drops the condition.
 *
 * A declared GUARD rather than an assumption: no shipped evaluator produces `holds`/`refuted` under
 * `bounded`, because each reports `exhaustive(...)` when it finds settling evidence and
 * `inconclusive` when it truncates. The guard is what keeps that an invariant instead of a habit.
 */
export const bearsAConclusion = (coverage: Coverage): boolean => {
  switch (coverage.kind) {
    case "exhaustive": return true;
    case "not-applicable": return true;
    case "bounded": return false;
  }
};

// --------------------------------------------------------------------------------------------
// The evaluation split — a status is not a truth value
// --------------------------------------------------------------------------------------------

/**
 * The two values a proposition can take. Nothing else belongs here.
 *
 * `Outcome` above carries four words, and two of them are not propositions: `inconclusive` says the
 * evaluator ran out of budget, and `unlicensed` says the purposeful models do not authorize the
 * question. Both are facts about the EVALUATION, and both sit in the same union as `holds` and
 * `refuted`, which is what lets a consumer compare an outcome against a predicted one and read the
 * mismatch as a verdict about the system under design. `Examples and Semantic Completion` §5.4
 * names that masquerade and asks for the split.
 *
 * Named `PropositionValue` rather than `Verdict` because `src/engine/types.ts:505` already owns that
 * word for a result-plus-refusal bundle. The FIELD is `verdict`, which is the author's spelling; the
 * TYPE is spelled differently so a grep for either lands somewhere unambiguous. The same
 * scope-by-type reasoning the requirement layer applies to `violated`.
 */
export type PropositionValue = "holds" | "refuted";

/**
 * Whether an evaluation reached a proposition value, and if not, what stopped it.
 *
 * The author's four words (§5.4). `completed` is the only one under which a truth value exists, and
 * `QueryEvaluation` below is a discriminated union precisely so the compiler — not a convention —
 * is what stops a reader from taking `verdict` off a status that has none.
 *
 * `exhausted` is the author's word for the evaluator/resource condition. The kernel spells the same
 * condition `Outcome: "inconclusive"` with `Coverage.kind: "bounded"`, and `exhausted` is also the
 * SPARQL evaluator's own `ExhaustedResult.kind` (`src/sparql/eval.ts:70`) — a demoted diagnostic
 * surface whose vocabulary §36.1 of the semantics spec refuses to promote. Reusing the word here is
 * deliberate and it is not a promotion: this union is a projection OF a result, never a member of
 * the result vocabulary, and `Outcome` stays four-valued at its declaration above.
 */
export type EvaluationStatus = "completed" | "unlicensed" | "exhausted" | "error";

/**
 * What one evaluation produced: a status always, a proposition value exactly when completed.
 *
 * ```
 * evaluation: { status: completed | unlicensed | exhausted | error, verdict: holds | refuted }
 *                                                                   # only when completed
 * ```
 *
 * The author's shape, as a discriminated union rather than an optional field, which is the
 * difference between a documented rule and an enforced one: `ev.verdict` does not typecheck until
 * the reader has narrowed on `ev.status === "completed"`.
 *
 * `coverage` rides the `completed` arm alone because that is the only arm where it decides
 * anything. A witness is coverage-insensitive and an absence is not — so whether a completed
 * verdict bears a conclusion depends on which DIRECTION the requirement reads it in, and the
 * requirement layer is where that asymmetry is applied. The two non-completed arms carry what their
 * remedy needs instead: `limit` says which budget ran out, `refusal` says which distinction the
 * models decline. Those remedies differ — raise the bound, declare a relation type — and a layer
 * that dropped them would leave the reader with a status word and nowhere to go.
 *
 * NOT an IR field and not in `systemHash`. Derived per read from a `QueryResult`, like
 * `modelMetrics` below and for V18's reason: record the answer and the answer changes the system it
 * was about. That is also what keeps the published schema out of this: the wire format carries
 * `outcome`, this union is how `src/` reads it.
 */
export type QueryEvaluation =
  | {
    readonly status: "completed";
    readonly verdict: PropositionValue;
    readonly coverage: Coverage;
    /**
     * The author's predicate or selection decided this verdict, not the system under design —
     * V41's disclosure, projected for the one layer that must act on it. `null` is the earned
     * verdict, and the common case.
     *
     * It rides BESIDE coverage rather than inside it because the two answer different questions.
     * Coverage asks how much of the space was walked; this asks whether anything could have been
     * charged at all. A vacuous verdict is reported under `exhaustive` coverage, so a reader
     * consulting coverage alone sees a complete walk and a green verdict and has been told nothing.
     *
     * Typed as the `Compilation` itself rather than as a flag, which keeps the evaluator's own
     * sentence attached to the fact. This union's two non-completed arms already carry what their
     * remedy needs — `limit` names the budget, `refusal` names the missing distinction — and a
     * reader handed a bare `true` would have a condition with nowhere to go. Reusing the existing
     * closed vocabulary also means no second spelling of the disclosure.
     *
     * Required rather than optional, which is this union's standing discipline: a construction site
     * that has not decided does not compile, and deciding is cheap.
     */
    readonly vacuous: Compilation | null;
  }
  /** The evaluator's budget ran out — and `limit` alone is not yet enough to name the remedy. */
  | {
    readonly status: "exhausted";
    readonly limit: Coverage["reason"];
    /**
     * The same disclosure, on the arm that reached no verdict at all (V43, amended).
     *
     * A truncated walk and an unsatisfiable predicate are independent facts, and an evaluation can
     * carry both: satisfiability is decided before the walk begins (V44), so the disclosure travels
     * at every budget while the OUTCOME still follows coverage. When both arrive, `limit` describes
     * what stopped the walk and describes the wrong remedy — no budget makes an unreachable
     * selection reachable — so an arm carrying `limit` alone forces the consuming layer to say
     * "raise the bound" to an author whose bound can never help.
     *
     * Carried here rather than inferred downstream because the projection is the only place both
     * facts are still in hand: past it the compilation is gone. Typed as the `Compilation` for
     * V43's reason — the evaluator's own sentence is the remedy, and a flag would arrive with
     * nowhere to go — and required for this union's standing reason: a construction site that has
     * not decided does not compile.
     */
    readonly vacuous: Compilation | null;
  }
  /** The purposeful models do not license the question. The remedy is a model. */
  | { readonly status: "unlicensed"; readonly refusal: string | null }
  /** The evaluation could not be performed or its declaration could not be read. */
  | { readonly status: "error"; readonly problem: string };

/**
 * What a projection FROM a result can produce: everything but `error`.
 *
 * The engine's contract is that nothing throws — a question the model does not license, a reference
 * that does not resolve, an expression outside the grammar all arrive as SUCCESSFUL results with
 * `outcome: "unlicensed"` (`src/engine/index.ts:7-11`). So no `QueryResult` carries an evaluator
 * error, and `evaluationOf` says so in its return type rather than in a comment. `error` stays in
 * `QueryEvaluation` because the requirement layer reaches it from a declaration that could not be
 * read, and the worker transport can fail where the engine cannot.
 */
export type ResultEvaluation = Extract<
  QueryEvaluation, { status: "completed" | "exhausted" | "unlicensed" }
>;

/**
 * A result, read as an evaluation. TOTAL over `Outcome` by the compiler: no `default`, and a
 * declared return type, so a fifth outcome word would be a type error here before it could be read
 * as a truth value anywhere else — the discipline `src/engine/check.ts:204` already uses for
 * `RefusalReason`.
 *
 * This is the one translation site between the two vocabularies. Every consumer that needs to know
 * whether an answer is a proposition at all should read this rather than switching on `outcome`
 * itself, because switching on `outcome` is what puts `unlicensed` in the same position as `holds`.
 */
export const evaluationOf = (
  res: Pick<QueryResult, "outcome" | "coverage" | "refusal" | "compilation">,
): ResultEvaluation => {
  switch (res.outcome) {
    case "holds":
    case "refuted":
      return {
        status: "completed", verdict: res.outcome, coverage: res.coverage,
        vacuous: disclosedVacuity(res.compilation),
      };
    // The kernel's `inconclusive` IS the author's `exhausted`: every evaluator that truncates a
    // walk reports it under `bounded` coverage, and `reason` names which limit bit. The disclosure
    // comes along: an unsatisfiable predicate is decided before the walk (V44), so truncation finds
    // it already true, and dropping it here would hand the next layer `limit` as the only remedy.
    case "inconclusive":
      return {
        status: "exhausted", limit: res.coverage.reason,
        vacuous: disclosedVacuity(res.compilation),
      };
    case "unlicensed":
      return { status: "unlicensed", refusal: res.refusal };
  }
};

/**
 * The vacuity disclosure on a result's compilation list, read ONCE for the two arms that carry it.
 *
 * Both proposition arms read it, not just `holds`. V41's table has a vacuous row under each: an
 * `invariant` whose violation no state vector admits `holds`, and a `reach` whose target contradicts
 * itself is `refuted`. Scoping this to `holds` would leave the second silent, and the second is the
 * one a shipped query already produces.
 *
 * Extracted at the SECOND reading site rather than the third. The `exhausted` arm must find the same
 * disclosure the `completed` arm does — a second copy of the predicate is how the two arms would
 * drift, and a disclosure one arm recognises and the other does not is the defect this amendment
 * closes.
 */
const disclosedVacuity = (compilation: readonly Compilation[]): Compilation | null =>
  compilation.find((c) => c.kind === "vacuous") ?? null;

/**
 * A disclosed rewrite or caveat on a result, in a closed vocabulary a renderer can branch on.
 *
 * `vacuous` carries the one caveat that an `Outcome` cannot. A universal over an empty selected set
 * is TRUE, so the sound verdict is `holds` and stays `holds` — and a reader who sees that green
 * verdict has been answered correctly and misled, because the claim was never charged against
 * anything. There is no fifth `Outcome` to reach for: `DESIGN-v02-ltl-foundation-261004.md:592`
 * bans one, and a vacuous universal genuinely does hold. So the disclosure travels here instead,
 * typed, beside the prose that already said it — `magnitude: null` next to `outcome: "holds"` was
 * the only structural tell, and no consumer reads an absence as a reason.
 *
 * The arm binds forward. Any universal added later — a structural `all` over a selected set, a
 * count under exhaustive coverage — emits this same kind rather than re-deriving the disclosure in
 * its own dialect. `mage-query.schema.json` carries the same enum for the wire format, and
 * `test/quant-query.test.ts` reads it rather than restating it.
 *
 * **The `vacuous` arm now has a consumer that changes an answer, not just a renderer that shows
 * one.** `evaluationOf` projects it onto `QueryEvaluation`, and the requirement layer refuses to
 * read a vacuous verdict as either a discharge or a breach (V43). So emitting this kind is no longer
 * cosmetic: an evaluator that discloses it where the verdict was EARNED downgrades a sound
 * requirement to `inconclusive`. That is the cost behind V41's "MUST NOT emit when the predicate is
 * satisfiable but unreachable", and it is now paid in verdicts rather than in reader attention.
 */
export interface Compilation {
  readonly kind: "history-variable" | "symmetry-reduction" | "vacuous" | "other";
  readonly explanation: string;
}

/**
 * A computed figure on a result, in the BASE unit of its dimension.
 *
 * The dimension travels WITH the number for the reason the RDF projection keeps it: a bare number
 * lets a consumer add milliseconds to megabytes, which V30 forbids at the validation layer — a
 * result field that lost the dimension would permit at the query surface what validation refuses.
 * `unit` is the dimension's base unit, null exactly when the dimension is dimensionless.
 */
export interface ResultMagnitude {
  readonly value: number;
  readonly dimension: Dimension;
  readonly unit: string | null;
}

export interface QueryResult {
  readonly outcome: Outcome;
  readonly coverage: Coverage;
  readonly evidence: Evidence | null;
  /** Required when outcome is "unlicensed": why the model does not authorize the question. */
  readonly refusal: string | null;
  readonly interpretedAs: string | null;
  /** Disclosed rewrites, e.g. the history variable added for a past-time question (V23). */
  readonly compilation: readonly Compilation[];
  /**
   * The figure a quantity query computed — a worst-case total, a peak — with its dimension. Null on
   * every non-quantitative result, and null when the maximum is unbounded (the lasso evidence is
   * the answer then, and no finite number could stand in for it).
   */
  readonly magnitude: ResultMagnitude | null;
  /**
   * The canonical hash of the system this result describes. A result outliving its model is the
   * failure the analysis-execution model exists to prevent: the UI must never present a result for
   * revision N as though it described N+1.
   */
  readonly systemHash: string;
}

// --------------------------------------------------------------------------------------------
// Findings
// --------------------------------------------------------------------------------------------

export interface Finding {
  /** "V7", "V25", "SCHEMA", "QUERY" — the same ids the spec and validate.py use. */
  readonly rule: string;
  readonly where: string;
  readonly message: string;
}

/**
 * The reserved `metrics.*` values for one system.
 *
 * A function, not a field on `CanonicalSystem`, and that follows V18's rule for derived values:
 * recompute, never store. Storing them would also put them in the hash twice — once as the
 * structure they count, once as the count.
 */
export const modelMetrics = (s: CanonicalSystem): ModelMetrics => {
  let states = 0;
  let transitions = 0;
  for (const m of s.machines.values()) {
    states += m.states.length;
    transitions += m.transitions.length;
  }
  return {
    state_count: states,
    transition_count: transitions,
    entity_count: s.entities.size,
    relation_count: s.relations.length,
  };
};

export const configKey = (c: Configuration): string => {
  const control = [...c.control.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const values = [...c.values.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return JSON.stringify([control, values]);
};
