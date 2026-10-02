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
 * Semantics: ../../SEMANTICS.md. Rule ids (V1…V25) cited in comments are that document's.
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

export const configKey = (c: Configuration): string => {
  const control = [...c.control.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const values = [...c.values.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return JSON.stringify([control, values]);
};
