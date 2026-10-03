/**
 * Canonical IR — the authoritative semantic representation.
 *
 * Per the component model this module depends on NOTHING: no YAML, no DOM, no renderer, no agent.
 * That is enforced by `workbench/models/workbench-components.mage.yaml`, whose asserted queries
 * fail the build if the kernel grows a dependency on a view. Keep the imports here empty.
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

export interface CanonRelationType {
  readonly id: string;
  readonly description: string;
  readonly absence: string | null;
  /** `forbidden` makes a multi-hop query over this type UNLICENSED, not false (V7). */
  readonly pathComposition: "allowed" | "forbidden";
  readonly symmetric: boolean;
  readonly acyclic: boolean;
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
 * A property rather than IR structure: the IR cannot hold the join itself in v0.1, and the shipped
 * example established this spelling. It is a kernel constant because TWO kernel components read it
 * — the validator resolves it (V38) and the quantitative evaluator joins a trace step through it —
 * and a second spelling in either would be a join that silently stops joining.
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

export interface CanonicalSystem {
  readonly systemId: string;
  readonly name: string;
  readonly domains: ReadonlyMap<string, CanonDomain>;
  readonly entities: ReadonlyMap<string, CanonEntity>;
  readonly relationTypes: ReadonlyMap<string, CanonRelationType>;
  /** Flattened across every model: an architectural claim is not escapable by moving an edge. */
  readonly relations: readonly CanonRelation[];
  readonly models: ReadonlyMap<string, CanonModel>;
  readonly machines: ReadonlyMap<string, CanonMachine>;
  readonly instances: readonly MachineInstance[];
  readonly events: ReadonlyMap<string, CanonEvent>;
  readonly quantities: ReadonlyMap<string, CanonQuantity>;
  /**
   * The declared accounting model, keyed by metric name as written.
   *
   * v0.1 has exactly one quantitative model per system — the `quantities:` map — so the ruling's
   * "declared per quantitative model" is a top-level block. When quantities are scoped to a model,
   * this declaration moves with them.
   */
  readonly accounting: ReadonlyMap<string, CanonAccounting>;
  readonly queries: ReadonlyMap<string, SavedQuery>;
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

export interface Compilation {
  readonly kind: "history-variable" | "symmetry-reduction" | "other";
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
