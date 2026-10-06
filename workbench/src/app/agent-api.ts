/**
 * `window.mage` — the live agent interface (FR-AGENT-1, FR-AGENT-2).
 *
 * A student runs the workbench in a visible Chromium tab; a coding agent attaches to THAT TAB over
 * CDP and operates the workbench while the student watches the model change.
 *
 * What this module is not responsible for: CDP. MAGE opens no debugging port, discovers no agent,
 * holds no socket, and implements no part of the protocol. CDP is transport, supplied by the user's
 * environment, and MAGE's responsibility begins at the page context. There is no server, no
 * embedded LLM, no MCP server, no agent backend, and no API key.
 *
 * Every method here delegates to the ONE Workspace. There is deliberately no agent-side model copy
 * and no privileged write path: an agent's `transact` is the same call the human toolbar makes, and
 * goes through the same validation. That is why an agent's edit is immediately visible in the
 * ordinary workbench rather than needing to be synced into it.
 *
 * FR-AGENT-2 is the reason this returns more than data. An agent must be able to determine what the
 * models represent and WHAT THE WORKBENCH LICENSES without inferring semantics from geometry — so
 * `describe()` ships the schemas, `inspect()` ships purpose and omissions, and every result ships
 * coverage and the system hash it describes.
 */
import type { Evidence, Finding, QueryResult } from "../ir/types.ts";
import type { PendingResult } from "./ports.ts";
import type { ExhaustedEscalation } from "../sparql/index.ts";
import type { SparqlAnswer, Workspace } from "./services.ts";
import type { QueryCheckResult } from "../engine/check.ts";
import { countElements, selectElements } from "../engine/elements.ts";
import type { ElementCount, ElementSelection } from "../engine/elements.ts";
import type { ModelTypeId, QueryNoun, SubjectSelector } from "../engine/model-types.ts";
import type { GraphForm } from "../engine/types.ts";
import { VALIDATION_AUTHORITY } from "../validator/result.ts";
import type { ValidationResult } from "../validator/result.ts";
import { explainType } from "../validator/typing.ts";
import type { TypeExplanation } from "../validator/typing.ts";
import type { ExampleCatalog, ExampleDescription } from "./examples.ts";
import type { ProvenanceRecord } from "./provenance.ts";
import type { EvaluatedProperty } from "./properties.ts";
import { CAPABILITIES, ESCAPE_HATCHES, SPARQL_HATCH_RENAME, checkAffordanceParity } from "./capabilities.ts";

/**
 * Bumped on a breaking change to this surface. Implementation internals are not API.
 *
 * 0.2.0 — `evidence(queryId)` returns an `EvidenceReading` instead of `QueryResult | null`. The
 * nullable was the defect, not the spelling: one value carried "no witness" and "nobody primed the
 * cache this method read", so no caller could tell them apart.
 *
 * 0.3.0 — `sparql(text)` moves to `debug.sparql(text)`. The method is unchanged; what changed is
 * its STATUS. It is no longer a machine affordance of the `query` capability but a fenced escape
 * hatch outside the semantic interface (`DECISIONS-RULED-model-query-261002.md`), and the namespace
 * advertises that at the call site and in an agent transcript.
 *
 * **RATIFIED** — `DESIGN-model-query-261002.md` §G2, ruled (a) on 261004, recorded in
 * `SPARQL_HATCH_RENAME` in `capabilities.ts`. What the author ratified is the rename's LEGIBILITY
 * and nothing more: the namespace correctly advertises "you have now left the supported semantic
 * interface," even though the namespace itself is not an enforcement mechanism. Every control keys
 * off `ESCAPE_HATCHES[].at`, so the fence does not depend on the name and ratification gives the
 * name no teeth it lacked. The version constant is read from the declaration rather than written
 * here twice.
 */
export const AGENT_API_VERSION: string = SPARQL_HATCH_RENAME.apiVersion;

export interface MageAgentApi {
  readonly version: string;
  describe(): ApiDescription;
  context(): WorkspaceContext;
  inspect(): SystemInspection;
  transact(transaction: unknown): TransactionOutcome;
  hypothesis: HypothesisApi;
  query(query: unknown): QueryResult;
  /**
   * Ask whether a question is MEANINGFUL AND PERMITTED for the model type it interrogates, without
   * running it — the ruling's second operation, beside `validate(model)` and execution.
   *
   * Takes the same untyped query document `query()` takes, so an agent checks the thing it is about
   * to send. It returns a licensed/refused/malformed report: the cause from the engine's own closed
   * refusal vocabulary, the offending portion, and the permitted alternatives derived from the
   * model-type registry's closed lists — which is what lets an agent REVISE rather than re-ask.
   *
   * **A `licensed` result is a report, not a certificate.** It carries no token and skips nothing:
   * each evaluator admits the question itself as its own first act, so an unchecked query is safe
   * and a checked one is re-checked. The arrangement is the SPARQL seam's, applied here — publish
   * the gate's input, never its output.
   *
   * It does NOT accept SPARQL text. SPARQL is not a model query under the ruling; the console keeps
   * its own gate inside the translator, outside the semantic interface.
   */
  check(query: unknown): QueryCheckResult;
  /**
   * Ask whether the loaded model is WELL FORMED — the ruling's first operation, beside `check` and
   * execution.
   *
   * An agent no longer reproduces the rule set or infers validity from a query that happens to
   * refuse: it asks. The result is actionable rather than descriptive — each finding carries its
   * rule id, a severity from a closed table, the model ids it is about, the sentence a person reads,
   * and the SEMANTICS.md section that states the rule — and it says which implementation decided it
   * (`authority`), so the TypeScript/Python parity discipline does not quietly gain a third party.
   *
   * **Recomputed, against the current revision, and `hash` is that revision.** `context().findings`
   * answers a narrower question and keeps doing so (see below); this is the operation.
   */
  validate(): ValidationResult;
  /**
   * Run one query and get it back as a property: the verdict PLUS the models and evidence it
   * derives from (UX-I5).
   *
   * The machine twin of the human ask form. `query()` returns the schema-shaped result and stays
   * the stable wire contract; this returns the same answer with its grounding, which is what the
   * human panel displays — so UX-I2 holds for that panel rather than the grounding being
   * UI-only knowledge.
   */
  ask(query: unknown): EvaluatedProperty;
  /**
   * The model query interface by its NOUNS — `elements`, `related`, `reachable`, `path`,
   * `violations` — rather than by the shape of a serialized query document.
   *
   * Why this exists when `query()` already expresses every one of them: the typed document is the
   * stable wire contract and it stays that, but it leaves the interface's vocabulary implicit in a
   * JSON shape. An agent reading `{kind:"graph", graph:{form:"successors", relation, from}}` has to
   * reconstruct the fact that what it is doing is traversing a declared relation. The facade gives
   * the operations their names, which is most of what made the earlier surface read as storage.
   *
   * **It is DERIVED, so it cannot offer what the kernel refuses (MQ-I8).** Every method here names
   * a kernel declaration — a form in some model type's `QuerySemantics.forms`, a subject in its
   * `subjects`, or the one validation authority — and `MODEL_FACADE` below records which, in a table
   * the derivation test holds against the registry in both directions. Nothing here evaluates
   * anything: each method builds the document `query()` takes, or calls `validate()`, and the
   * engine's own admission decides. A question this model declines is declined identically here.
   *
   * **No composition, and that is a ruling rather than an omission.** There is no piping of one
   * operation's result set into another, no join across two result sets, no fold, and no
   * cross-operation quantification. `DESIGN-model-query-261002.md` §4.1 draws the line and §G5 is
   * held pending the author's semantics discussion, so a caller composes RESULTS in its own
   * language: run `elements`, loop, run `related` per id.
   */
  readonly model: ModelQueryApi;
  /**
   * The fenced escape hatches: surfaces OUTSIDE the semantic interface. Not for normal workflows.
   *
   * Reachable from `window.mage` because a debugging surface an operator cannot reach is not a
   * debugging surface. Namespaced because the ruling fences it, and a fence only the registry can
   * see is invisible at the one place a dependency forms. `describe().outsideSemanticInterface`
   * names every member with its reason and the ruling that fenced it, so an agent learns the
   * boundary from the API rather than from a reviewer.
   */
  readonly debug: DebugApi;
  savedQueries(): Record<string, QueryResult>;
  /**
   * Every persistent property: statement, status, the models and evidence the status derives
   * from, and the revision it was computed against (§9.3, UX-I5).
   *
   * The machine half of UX-I2 for the property list. `savedQueries()` returns the raw results and
   * leaves an agent to work out which reduction produced each one; this returns the grounding the
   * human surface shows, so neither side holds a conclusion the other cannot see.
   *
   * Recomputed per call. There is no cached verdict here any more than there is one in the IR.
   */
  properties(): readonly EvaluatedProperty[];
  /**
   * Read one saved question's witness, counterexample or lasso — recomputed, and never nullable.
   *
   * Recomputed for the reason `properties()` is, two lines above: a verdict is derived state (V18),
   * so the only honest way to read one is to compute one. This method used to read a Map that
   * `savedQueries()` filled, which made its answer depend on call ORDER and let it describe a
   * revision the system had already left.
   *
   * **Never nullable, because the null was the worse half of the defect.** `null` meant "no witness"
   * and "nothing has been computed yet" at the same address, and a caller cannot tell those apart
   * from one value however carefully it asks. So an absence is reported as data: a cause, the
   * sentence a person reads, the answer when there was a question to answer, and the ids this system
   * actually saves.
   */
  evidence(queryId: string): EvidenceReading;
  view: ViewApi;
  undo(): boolean;
  redo(): boolean;
  load(text: string): WorkspaceContext;
  export(): string;
  /**
   * What the workbench ships, described from the examples themselves.
   *
   * A promise because the description is read out of the shipped bytes. The synchronous alternative
   * is a copy of each example's title, models and questions in code, free to drift from the file it
   * describes -- so an agent awaits instead.
   */
  examples(): Promise<readonly ExampleDescription[]>;
  /**
   * Load one. After this an agent holds an ORDINARY workspace: `inspect`, `query`, `transact` and
   * `hypothesis` behave exactly as they do for an imported file, and there is no example-specific
   * method for editing or querying what was loaded (EX-I1).
   */
  loadExample(id: string): Promise<WorkspaceContext>;
  /** Where each object came from. Read-only: provenance cannot alter semantics (UX-I6). */
  provenance(): readonly ProvenanceRecord[];
  /**
   * The long analyses: the ones that run in the Worker rather than on the thread that paints.
   *
   * Here because of UX-I2, not because an agent needs a thread. A person who asks for a long
   * exploration is told how big the space was and whether the walk finished; if an agent could not
   * read the same figures, that would be a human-only conclusion — which is the half of UX-I2 this
   * project usually fails in the other direction.
   *
   * **The two methods are not one capability, and the registry now says so.** The claim this note
   * used to make — "running a long one off-thread changes WHERE the engine runs, not what the
   * workbench can do" — holds for `resolveExhausted` and fails for `explore`:
   *
   *  - `resolveExhausted` re-asks a question the caller already asked, with a bigger budget, and
   *    hands back the same four arms the hatch does. Same capability, different bound — so it is
   *    registered as a machine affordance of `query`. It stays a `query` affordance rather than
   *    joining `debug` because its handle is obtainable only from an `exhausted` answer, so it is
   *    reachable only downstream of a deliberate hatch use and needs no fence of its own.
   *  - `explore` answers a question nothing else in the workbench answers: how big is the reachable
   *    configuration space, and did the walk finish. The result is a `SpaceSummary`, a shape no other
   *    capability produces. Off-thread-ness is not the capability; the summary is. So it earns the
   *    `explore-space` row, and `capabilities.ts` records what that costs — UX-I1 reports it, because
   *    no human control reaches it.
   */
  analysis: AnalysisApi;
}

// ----------------------------------------------------------------------------------------------
// The derived facade — `window.mage.model.*`
// ----------------------------------------------------------------------------------------------

/**
 * Which way a traversal reads a declared edge.
 *
 * Two members, and the direction is a parameter rather than two methods because it is one question
 * asked of one relation type — V8's `symmetric` is what decides whether both readings are
 * meaningful, and that decision belongs to the IR, not to the method list.
 */
export type TraversalDirection = "outgoing" | "incoming";

/**
 * The graph form each traversal direction is asking for. ONE place the pair is written.
 *
 * `related` could have spelled "successors" inside an `if`, and then the derivation table below
 * would have carried a second copy of the same two words. A record keyed by the direction means the
 * constructor and the declaration read the same value, so a facade method cannot drift from what it
 * declares it derives from.
 */
const RELATED_FORM: Readonly<Record<TraversalDirection, GraphForm>> = {
  outgoing: "successors",
  incoming: "predecessors",
};

const REACHABLE_FORM: GraphForm = "reachability";
const PATH_FORM: GraphForm = "path";

/**
 * The wire document a facade constructor builds — the shape `query()` accepts, not the engine's
 * internal `Query`.
 *
 * Deliberately the WIRE shape. Building the internal type and handing it over would let the facade
 * skip `parseQuery`, and then the derivation test would be comparing an object with itself instead
 * of checking that what the facade emits is a document the published parser admits.
 *
 * `quantifier` is fixed to `exists` because every graph form in v0.1 is existential — a universal
 * graph claim has no form, and `admitGraphQuery` refuses `forall` by name. Exposing the parameter
 * would offer a choice with one legal value.
 */
export interface GraphQueryDocument {
  readonly kind: "graph";
  readonly quantifier: "exists";
  readonly graph: {
    readonly form: GraphForm;
    readonly relation: string;
    readonly from: string | null;
    readonly to: string | null;
  };
}

/** Traverse one declared relation, one step, in the named direction. */
export const relatedQuery = (
  from: string, relation: string, direction: TraversalDirection,
): GraphQueryDocument => ({
  kind: "graph", quantifier: "exists",
  // `successors` reads `from` and `predecessors` reads `to`; the engine falls back across the pair,
  // and naming the field the form reads keeps the document readable on its own.
  graph: direction === "outgoing"
    ? { form: RELATED_FORM.outgoing, relation, from, to: null }
    : { form: RELATED_FORM.incoming, relation, from: null, to: from },
});

/**
 * Compose the relation transitively from one element — to a named target, or to anything.
 *
 * `to` omitted is still ONE question, not a composition: `reachability` with an unpinned target is
 * the form asking "does this element reach anything through this relation", which the engine
 * answers with the shortest witness it finds. What it is not is a result set to feed somewhere else.
 */
export const reachableQuery = (
  from: string, relation: string, to: string | null,
): GraphQueryDocument =>
  ({ kind: "graph", quantifier: "exists", graph: { form: REACHABLE_FORM, relation, from, to } });

/** Trace between two named elements. Witness-bearing: the answer carries the path it found. */
export const pathQuery = (from: string, to: string, relation: string): GraphQueryDocument =>
  ({ kind: "graph", quantifier: "exists", graph: { form: PATH_FORM, relation, from, to } });

export type FacadeOperationName =
  "elements" | "count" | "related" | "reachable" | "path" | "violations" | "explainType";

/**
 * What a facade operation derives FROM — and the three arms are the honest count.
 *
 * MQ-I8 was written as "maps onto a form the loaded types' `QuerySemantics` declares", which covers
 * three of the five operations and not the other two. `elements` enumerates a SUBJECT (the `entity`
 * noun with the property-constraint selector); `violations` is validation semantics, which the
 * registry does not carry at all. Widening "form" to mean all three would have made the invariant
 * unfalsifiable for exactly the two operations that need it most, so the union names each kind of
 * declaration and the test resolves each arm against its own source.
 */
export type FacadeDerivation =
  /** A member of that model type's `QuerySemantics.forms`. */
  | { readonly from: "query-form"; readonly modelType: ModelTypeId; readonly form: string }
  /** A `{noun, selector}` pair in that model type's `QuerySemantics.subjects`. */
  | {
      readonly from: "query-subject"; readonly modelType: ModelTypeId;
      readonly noun: QueryNoun; readonly selector: SubjectSelector;
    }
  /** The one implementation that decides well-formedness. Not query semantics; said so. */
  | { readonly from: "validation-authority"; readonly implementation: string };

export interface FacadeOperation {
  readonly operation: FacadeOperationName;
  readonly derivesFrom: readonly FacadeDerivation[];
}

/** Where a facade operation is called. Computed, so the name is written once. */
export const facadeSite = (operation: FacadeOperationName): string =>
  `window.mage.model.${operation}`;

/**
 * Every facade operation and the kernel declaration it derives from — MQ-I8's machine half.
 *
 * The table is the facade's claim about itself, and `test/model-facade.test.ts` is what makes it a
 * claim rather than a comment. Three checks, in both directions:
 *
 *   1. every `query-form` derivation names a form in that type's own `forms` array, and every
 *      `query-subject` derivation a pair in its own `subjects` — so a method cannot declare a form
 *      the kernel does not have;
 *   2. the table is TOTAL over the callables `window.mage.model` presents, and names no operation
 *      the facade does not implement — the drained-list direction, which is what caught three dead
 *      allowances in the hatch's own closure check (§15(4));
 *   3. the document each constructor emits carries the form its row declares, and the engine's
 *      verdict on that document is the verdict on the hand-written equivalent.
 *
 * Together those say the thing MQ-I8 is for: the facade is a spelling of the kernel's declarations,
 * so there is no question it can ask that a typed document could not, and none the gate would let
 * through here and refuse there.
 */
export const MODEL_FACADE: readonly FacadeOperation[] = [
  {
    operation: "elements",
    derivesFrom: [{
      from: "query-subject", modelType: "structural-graph",
      noun: "entity", selector: "property-constraints",
    }],
  },
  {
    operation: "count",
    // The SAME subject arm as `elements`, not a sibling of it, and the repetition is the claim:
    // `count` is the cardinality of that enumeration, so it derives from the declaration the
    // enumeration derives from. `DESIGN-v02-quantification-261004.md` §3.4 ruling 2 — "not a
    // twentieth form either ... the same derivation arm, one step further." A row naming a form
    // would assert this question walks edges, and it reads one table.
    //
    // It also stays inside §G5's composition line. A pipe would hand `elements`' RESULT to a second
    // operation; `countElements` re-derives the selection and drops the list, so there is no
    // intermediate result travelling between two operations and nothing for `check` to admit
    // recursively.
    derivesFrom: [{
      from: "query-subject", modelType: "structural-graph",
      noun: "entity", selector: "property-constraints",
    }],
  },
  {
    operation: "related",
    // Both directions, because both are the operation: a row naming one form would leave the other
    // undeclared and the totality check would be measuring half of what `related` can emit.
    derivesFrom: Object.values(RELATED_FORM).map((form) => ({
      from: "query-form" as const, modelType: "structural-graph" as const, form,
    })),
  },
  {
    operation: "reachable",
    derivesFrom: [{ from: "query-form", modelType: "structural-graph", form: REACHABLE_FORM }],
  },
  {
    operation: "path",
    derivesFrom: [{ from: "query-form", modelType: "structural-graph", form: PATH_FORM }],
  },
  {
    operation: "violations",
    derivesFrom: [{
      from: "validation-authority", implementation: VALIDATION_AUTHORITY.implementation,
    }],
  },
  {
    operation: "explainType",
    // The establishment record (SEMANTICS §3.3): authored or unnamed, the shadow spelling, and
    // every declared constraint the entity sits under with a verdict on each. The verdict
    // vocabulary (member / violation / unestablished) IS V48's membership semantics, so the row
    // derives from the one validation authority — the facade adds a spelling, never a second
    // opinion about what a declaration admits. (The capability REGISTRY files the affordance
    // under `inspect`, and the two placements answer different questions: the derivation names
    // whose SEMANTICS decide the verdicts; the registry row names the SEAM the method reaches,
    // and like `elements` it reads `workspace.state` and calls no validate pass.)
    derivesFrom: [{
      from: "validation-authority", implementation: VALIDATION_AUTHORITY.implementation,
    }],
  },
];

/**
 * The model query interface, spelled as operations over the metamodel's nouns.
 *
 * Every method is a constructor plus a delegation and holds no decision of its own. Three return
 * `QueryResult` — the published wire shape, unchanged, because a facade that returned a richer
 * result would be a second answer shape for one question; `violations` returns the validation
 * operation's own result; and `elements` returns the one shape this interface adds, because it is
 * the one operation the kernel did not already have (§2.4).
 */
export interface ModelQueryApi {
  /**
   * The entities this system declares, filtered by declared type and by the property-constraint
   * grammar: `{ type?: string, where?: { prop: value | { ne } | { in: [...] } } }`.
   *
   * A representation question — it reads the IR's entity table and walks no edges — and it exists
   * because every other operation here takes element ids as input, and an agent's only route to
   * them was to pull the whole of `inspect()` across the boundary and filter it in its own
   * language. Licensed by the structural-graph type's presence rung, like a graph question.
   */
  elements(selector?: unknown): ElementSelection;
  /**
   * How many entities that selector picks out, without the list of them.
   *
   * The same read as `elements` and the same refusals, counted. The figure arrives as a
   * `Cardinality` rather than a number because a bare integer invites a reader to assume
   * exactness: here the entity table is finite and fully walked, so the value states the basis
   * that earns it, and a later count over a bounded domain cannot borrow that standing silently
   * (`DESIGN-v02-quantification-261004.md` §3.2).
   */
  count(selector?: unknown): ElementCount;
  /** One step along a declared relation. `evidence.nodes` carries the neighbours it found. */
  related(from: string, relation: string, direction: TraversalDirection): QueryResult;
  /**
   * The relation composed transitively from one element — gated per relation type by
   * `composition.path` (V7), so a relation declared without path semantics refuses here exactly as
   * it refuses a hand-written `reachability` document.
   */
  reachable(from: string, relation: string, to?: string): QueryResult;
  /** Trace between two named elements, with the path as the witness. Composing, so V7 gates it. */
  path(from: string, to: string, relation: string): QueryResult;
  /**
   * The model's well-formedness violations — the same operation `validate()` is, under the noun
   * §2.2's table names it by. One service, two spellings; no second rule set and no second verdict.
   */
  violations(): ValidationResult;
  /**
   * One entity's establishment record (SEMANTICS §3.3): whether its type is authored or unnamed,
   * its shadow spelling when unnamed, and every declared-relation constraint it sits under with
   * the verdict on each. The honest v1 answer to "why are these two still distinct?" — nothing
   * unifies shadows except authorship, so the report shows what each side would need. Null for an
   * id the system does not declare.
   */
  explainType(entity: string): TypeExplanation | null;
}

/**
 * The escape hatches, as an API surface. One member.
 *
 * **This is not part of the model query interface, and that is the ruling, not a style note.** A
 * syntactically valid SPARQL query can ask questions the RDF representation permits and the MAGE
 * metamodel does not license, so routine dependence on this would let an agent bypass the model
 * abstraction and couple its reasoning to the storage representation. Agents reason over models,
 * not over their storage representation; `query`, `ask` and `check` are where they do it.
 *
 * The hatch is outside the semantic interface, NOT outside the gate: it still delegates to
 * `workspace.sparql`, whose `translate` → `admit` path enforces metamodel licensing on every text
 * it accepts. What the fence governs is status and dependence, not permission.
 */
export interface DebugApi {
  /**
   * Ask a SPARQL question of the RDF projection: text in, solutions or a structured refusal out.
   *
   * For debugging the projection and the licensing seam. It adds no privileged path — it delegates
   * to `workspace.sparql`, the same facade every method on `window.mage` goes through.
   *
   * A SELECT's rows arrive as `Map`s, like the configuration maps inside a behavioural witness from
   * `query()`. `WorkerEvaluation` is the flattened spelling, for the message port that needs one;
   * this returns the facade's own object so that an agent and the page read ONE value.
   */
  sparql(text: string, budget?: number): SparqlAnswer;
}

/**
 * Long analysis, for a machine client. Promises, because these are the two operations that are long
 * by nature — and the facade stays synchronous for everything else, for the reason `services.ts`
 * gives at the ports.
 */
export interface AnalysisApi {
  /** Walk the configuration space; get its SIZE and whether the walk finished. */
  explore(limit?: number): Promise<PendingResult>;
  /**
   * Re-issue a question whose interactive step budget ran out.
   *
   * Takes the handle off the exhausted answer — `sparql(text).escalation` — so the Worker's larger
   * budget is reachable only as the escalation of a question that ran out, and never as a way around
   * the interactive bound. An agent asks, reads `exhausted`, and hands back what it was given.
   */
  resolveExhausted(escalation: ExhaustedEscalation, budget?: number): Promise<PendingResult>;
  /** Request ids currently running, so an agent can report and cancel them. */
  inFlight(): readonly number[];
  cancel(id: number): void;
}

export interface ApiDescription {
  readonly version: string;
  readonly semantics: string;
  /** The published JSON Schemas, inline, so an agent needs no second fetch and no network. */
  readonly schemas: Readonly<Record<string, unknown>>;
  readonly operations: readonly OperationDescription[];
  /**
   * UX-I1 violations as of this build. Present so an agent can see where the two interfaces do NOT
   * converge, rather than discovering it by making a change no human can see or reverse.
   */
  readonly affordanceGaps: readonly string[];
  /**
   * The surfaces that exist but are NOT part of the semantic interface, each with its reason and
   * the ruling that fenced it.
   *
   * The FR-AGENT-2 pattern applied to a boundary rather than to a limit: an agent that reads this
   * learns that `debug.sparql` exists, what it is for, and that depending on it is depending on
   * something the architecture declared outside. The alternative is an agent that discovers the
   * status from a code review, which is to say never.
   *
   * Deliberately NOT folded into `operations`, and not into `notSupported` either. `operations` is
   * the semantic interface, which is the one thing a hatch is defined as being outside of;
   * `notSupported` names things the workbench CANNOT do, and this one it can.
   */
  readonly outsideSemanticInterface: readonly EscapeHatchDescription[];
  /** Named limitations, so an agent learns the boundary from the API instead of from a wrong answer. */
  readonly notSupported: readonly string[];
}

/** One fenced surface, as `describe()` publishes it. The registry's `EscapeHatch`, on the wire. */
export interface EscapeHatchDescription {
  readonly at: string;
  readonly reason: string;
  /** The ruling document that put it outside the semantic interface. */
  readonly fencedBy: string;
}

export interface OperationDescription {
  readonly name: string;
  readonly summary: string;
  readonly returns: string;
}

export interface WorkspaceContext {
  readonly systemId: string;
  readonly hash: string;
  readonly hypothesis: string | null;
  /**
   * The current revision's findings, in the bare wire shape `validate.py` also emits.
   *
   * Recomputed on every read, so it is not stale — but it is not the validation OPERATION either.
   * It is a field of a context read, carrying no severity, no subjects, no spec join and no
   * statement of which implementation decided it, which is the half the ruling asks for. An agent
   * asking "is this model well formed, and what do I repair" calls `validate()`; this field stays
   * for a caller who wants the count beside the hash and the undo state.
   */
  readonly findings: readonly Finding[];
  readonly counts: Readonly<Record<string, number>>;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export interface SystemInspection {
  readonly hash: string;
  readonly entities: readonly EntityInspection[];
  readonly relationTypes: readonly RelationTypeInspection[];
  readonly models: readonly ModelInspection[];
  readonly machines: readonly MachineInspection[];
  readonly events: readonly { readonly id: string; readonly participants: readonly string[] }[];
}

export interface EntityInspection {
  readonly id: string;
  readonly label: string;
  readonly type: string | null;
  readonly properties: Readonly<Record<string, { readonly value: string | number | boolean; readonly domain: string | null }>>;
  readonly contains: readonly string[];
  readonly parent: string | null;
  /** Every model this entity appears in — identity across representations, made queryable. */
  readonly appearsIn: readonly string[];
}

export interface RelationTypeInspection {
  readonly id: string;
  readonly description: string;
  readonly absence: string | null;
  /** `forbidden` means a multi-hop question over this relation is not licensed, and will be refused. */
  readonly pathComposition: "allowed" | "forbidden";
}

export interface ModelInspection {
  readonly id: string;
  readonly label: string;
  readonly question: string | null;
  readonly represents: readonly string[];
  /** What this model DECLINES to say. The basis for "cannot be answered from this model". */
  readonly omits: readonly string[];
  readonly entities: readonly string[];
  readonly relations: readonly { readonly from: string; readonly to: string; readonly type: string }[];
}

export interface MachineInspection {
  readonly id: string;
  readonly entity: string | null;
  readonly instances: number;
  readonly initial: string;
  readonly states: readonly string[];
  readonly variables: readonly { readonly id: string; readonly domain: readonly (string | number | boolean)[] }[];
  readonly transitions: readonly {
    readonly from: string; readonly to: string;
    readonly sync: string | null; readonly label: string | null;
  }[];
}

/**
 * What `evidence(queryId)` found, or why it found nothing — a typed result rather than a nullable.
 *
 * The vocabulary follows the house pattern for "this cannot be answered": the SPARQL seam reports
 * `outcome: unlicensed` with a cause and the change that would license the question, and the engine
 * ranks a declared omission above a bare lookup miss. The same discipline applies one layer up. A
 * reader asking for a witness has three situations to tell apart, and collapsing any two of them
 * teaches a falsehood:
 *
 *  - **the question is not saved** — a typo, or a question nobody has saved yet. Nothing ran.
 *  - **the model declines** — the question is refused, so no interface has a witness for it.
 *  - **the question was answered and has no witness** — a universal that holds exhaustively shows
 *    no single trace, and that is an ordinary result rather than a gap.
 *
 * Reporting the first as the third sends a caller hunting for a modelling gap that does not exist;
 * reporting the second as the third teaches it that the workbench cannot do what it declines to do
 * on purpose.
 */
export type EvidenceReading = EvidenceFound | EvidenceWithheld | NoSuchQuestion;

/** Why a reading carries no witness. Never inferred from prose — this is the field to switch on. */
export type EvidenceAbsence = "no-such-question" | "unlicensed-by-model" | "no-witness";

export interface EvidenceFound {
  readonly found: true;
  readonly queryId: string;
  /** The answer, recomputed. Its `systemHash` is the revision this reading describes. */
  readonly result: QueryResult;
  /**
   * The witness itself, already narrowed.
   *
   * `result.evidence` is the same object. It is surfaced here so the found arm *is* the proof that
   * there is something to read: a caller that has checked `found` does not then re-check a nullable
   * field, which is where a nullable return would simply have moved the problem.
   */
  readonly evidence: Evidence;
}

export interface EvidenceWithheld {
  readonly found: false;
  readonly queryId: string;
  readonly cause: "unlicensed-by-model" | "no-witness";
  /** The sentence a person reads. The engine's own refusal when there is one — never a reword. */
  readonly prose: string;
  /** The answer, which is still worth handing back: a refusal and a verdict are both results. */
  readonly result: QueryResult;
  readonly savedQuestions: readonly string[];
}

/**
 * The id names no saved question, so nothing ran.
 *
 * A separate member rather than a `result: QueryResult | null` on the arm above, so the compiler
 * holds the invariant: a question nobody asked cannot carry an answer. `savedQuestions` is the
 * field that fixes the diagnosis — a caller reading an absence sees what this system DOES save, and
 * tells a misspelled id from a question that genuinely is not there without a second call.
 */
export interface NoSuchQuestion {
  readonly found: false;
  readonly queryId: string;
  readonly cause: "no-such-question";
  readonly prose: string;
  readonly result: null;
  readonly savedQuestions: readonly string[];
}

/**
 * The reading for an id that names nothing.
 *
 * Module-level and exported because the ask bar reaches this arm for real: its catalogue is painted
 * from one revision, and an agent can retract a question between the paint and the click. Two
 * callers, one sentence — the alternative was the ask bar wording its own, and then a caller would
 * meet two answers to "why is there nothing here" from one workbench.
 */
export const noSuchQuestion = (
  queryId: string, savedQuestions: readonly string[],
): NoSuchQuestion => ({
  found: false, queryId, cause: "no-such-question", result: null, savedQuestions,
  prose: `no saved question is named "${queryId}". `
    + `\`savedQuestions\` lists what this system saves; a question becomes one through a `
    + `\`save-query\` transaction.`,
});

/**
 * One answered question, read as evidence: the witness, or the cause of its absence.
 *
 * Shared by `window.mage.evidence(id)` and the ask bar's "Inspect evidence", which is what keeps
 * the three situations apart on BOTH surfaces — a refusal is not a missing witness, and an
 * exhaustive universal with nothing to show is an ordinary result. A second classifier in the UI
 * would have been a second opinion about which of those a reader is looking at.
 */
export function classifyEvidence(
  queryId: string, result: QueryResult, savedQuestions: readonly string[],
): EvidenceFound | EvidenceWithheld {
  const evidence = result.evidence;
  if (evidence !== null) return { found: true, queryId, result, evidence };
  if (result.outcome === "unlicensed") {
    return {
      found: false, queryId, cause: "unlicensed-by-model", result, savedQuestions,
      // The engine's sentence, passed through. A refusal always carries one, and re-wording it
      // here would be a second answer to "why can this not be answered" from one model.
      prose: result.refusal ?? `the model does not license "${queryId}".`,
    };
  }
  return {
    found: false, queryId, cause: "no-witness", result, savedQuestions,
    prose: `"${queryId}" was answered — ${result.outcome} — and that answer shows no witness, `
      + `counterexample or lasso. Read the verdict and its grounding through \`ask\`.`,
  };
}

export interface TransactionOutcome {
  readonly ok: boolean;
  readonly findings: readonly Finding[];
  readonly hash: string;
}

export interface HypothesisApi {
  open(label: string, transaction: unknown): TransactionOutcome;
  apply(): boolean;
  discard(): boolean;
  /** Saved queries under the hypothesis, for the current-vs-hypothesis comparison. */
  compare(): Readonly<Record<string, QueryResult>>;
}

export interface ViewApi {
  /** Non-semantic by construction: a view never changes what the model asserts. */
  select(ids: readonly string[]): void;
  selection(): readonly string[];
  focus(target: string): void;
  target(): string | null;
  /**
   * Draw one SAVED question's witness over the model that carried it, or clear the focus with null.
   *
   * A saved id and not a query document, which is the same bound `window.mage.evidence` already
   * takes: a focus has to survive an edit and re-derive, so it must name something stable. A
   * verdict is derived state — recompute, never store (`src/app/properties.ts:20-34`) — and an
   * ad-hoc question has no name to recompute from. Track it, then focus it.
   */
  witness(queryId: string | null): void;
  witnessing(): string | null;
}

/**
 * Non-semantic view state. Deliberately NOT in the IR, so it cannot affect a query result.
 *
 * `witness` is OPTIONAL, which is the one field that is. Every caller that constructs a `ViewState`
 * is declaring where the view is pointed, and a caller with no interest in witnesses should not have
 * to say so — the shell writes it, the agent writes it, and a test driving the query API reads an
 * absent focus as no focus. Made required instead, this field would have edited ten construction
 * sites to add the same `null`.
 */
export interface ViewState {
  target: string | null;
  selection: string[];
  /** A saved query id whose evidence the diagram emphasises, or absent/null for no focus. */
  witness?: string | null;
}

export function createAgentApi(
  workspace: Workspace,
  viewState: ViewState,
  schemas: Readonly<Record<string, unknown>>,
  onViewChange: () => void,
  // The SAME catalogue the human menu holds. Passed in rather than constructed here, because the
  // catalogue needs an asset reader and the page and a test disagree about how to read a file --
  // and because one instance is what makes the two interfaces converge rather than agree by luck.
  examples: ExampleCatalog,
): MageAgentApi {
  /**
   * One saved question's witness, computed now against the authoritative system.
   *
   * No cache, and the absence of one is the design. The alternative considered and rejected was a
   * Map keyed by `(queryId, systemHash)`, which would make a stale hit impossible — but a verdict
   * is derived state, so the project's answer for this value class is already "recompute, never
   * store", and reading ONE saved question costs strictly less than the pass `savedQueries()` and
   * `properties()` each make over all of them. A hash-keyed cache would also miss on exactly the
   * call an agent makes most: ask, edit, ask again.
   */
  const readEvidence = (queryId: string): EvidenceReading => {
    const system = workspace.state.system;
    const savedQuestions = [...system.queries.keys()];
    const saved = system.queries.get(queryId);
    if (saved === undefined) return noSuchQuestion(queryId, savedQuestions);
    return classifyEvidence(queryId, workspace.query(saved.raw), savedQuestions);
  };

  const context = (): WorkspaceContext => {
    const s = workspace.state;
    return {
      systemId: s.system.systemId,
      hash: s.hash,
      hypothesis: s.hypothesis,
      findings: s.findings,
      counts: {
        entities: s.system.entities.size,
        models: s.system.models.size,
        machines: s.system.machines.size,
        instances: s.system.instances.length,
        relations: s.system.relations.length,
        events: s.system.events.size,
        // The quantity layer was absent from this tally, so an agent reading the context could not
        // tell a system that declares a resource budget from one that declares none — and the
        // quantitative question is exactly the one it would then not think to ask. Two numbers,
        // because they answer different questions: how many ANNOTATIONS there are, and how many
        // accounting MODELS they constitute (one per dimension).
        quantities: s.system.quantities.size,
        quantitativeModels: s.system.quantitativeModels.size,
        savedQueries: s.system.queries.size,
      },
      canUndo: s.canUndo,
      canRedo: s.canRedo,
    };
  };

  return {
    version: AGENT_API_VERSION,

    describe: () => ({
      version: AGENT_API_VERSION,
      semantics: "workbench/SEMANTICS.md — rules V1-V25 fix meaning; the schemas fix shape.",
      schemas,
      // DERIVED from the capability registry, not hand-listed. A hand-written copy here would be
      // the second source of truth the registry exists to eliminate -- and it was, until this change.
      operations: CAPABILITIES.map((c) => ({
        name: c.id,
        summary: c.summary,
        returns: c.producesEvidence ? "a result carrying outcome, coverage and evidence" : "void or a context object",
      })),
      // FR-AGENT-2: an agent must be able to tell what the workbench LICENSES. That includes which
      // capabilities it cannot currently reach a human affordance for -- an agent that edits a model
      // nobody can edit by hand has created a divergence the user cannot inspect or undo.
      affordanceGaps: checkAffordanceParity().map((v) => `${v.capability}: ${v.problem}`),
      // DERIVED from `ESCAPE_HATCHES`, for the reason `operations` is derived from `CAPABILITIES`:
      // a hand-listed copy here would be a second declaration of the fence, free to say the
      // console is outside the interface while the registry had put it back inside.
      outsideSemanticInterface: ESCAPE_HATCHES.map((h) => ({
        at: h.at, reason: h.reason, fencedBy: h.fencedBy,
      })),
      notSupported: [
        "fairness and liveness: 'can it reach X' is in scope, 'will it eventually reach X' is not",
        "past-time temporal operators: such a query is compiled to a safety property over a disclosed history variable",
        "instance binding: multiplicity gives occupancy, never which instance holds which resource",
        "participant selection: an event synchronizing with a multiply-instantiated machine is refused",
        "real-valued or unbounded variables: every variable has a finite enumerated domain",
        "SMT and optimization",
      ],
    }),

    context,

    inspect: () => {
      const s = workspace.state.system;
      const appearsIn = new Map<string, string[]>();
      for (const m of s.models.values()) {
        for (const id of m.entities) (appearsIn.get(id) ?? appearsIn.set(id, []).get(id)!).push(m.id);
      }
      return {
        hash: workspace.state.hash,
        entities: [...s.entities.values()].map((e) => ({
          id: e.id, label: e.label, type: e.type,
          properties: Object.fromEntries([...e.properties].map(([k, v]) => [k, { value: v.value, domain: v.domain }])),
          contains: e.contains, parent: e.parent,
          appearsIn: appearsIn.get(e.id) ?? [],
        })),
        relationTypes: [...s.relationTypes.values()].map((r) => ({
          id: r.id, description: r.description, absence: r.absence, pathComposition: r.pathComposition,
        })),
        models: [...s.models.values()].map((m) => ({
          id: m.id, label: m.label, question: m.purpose.question,
          represents: m.purpose.represents, omits: m.purpose.omits, entities: m.entities,
          relations: s.relations.filter((r) => r.model === m.id).map((r) => ({ from: r.from, to: r.to, type: r.type })),
        })),
        machines: [...s.machines.values()].map((m) => ({
          id: m.id, entity: m.entity, instances: m.instances, initial: m.initial, states: m.states,
          variables: [...m.variables.values()].map((v) => ({ id: v.id, domain: v.domain })),
          transitions: m.transitions.map((t) => ({ from: t.from, to: t.to, sync: t.sync, label: t.label })),
        })),
        events: [...s.events.values()].map((e) => ({ id: e.id, participants: e.participants })),
      };
    },

    transact: (transaction) => {
      const r = workspace.transact(transaction);
      return { ok: r.ok, findings: r.findings, hash: workspace.state.hash };
    },

    hypothesis: {
      open: (label, transaction) => {
        const r = workspace.openHypothesis(label, transaction);
        return { ok: r.ok, findings: r.findings, hash: workspace.state.hash };
      },
      apply: () => workspace.applyHypothesis(),
      discard: () => workspace.discardHypothesis(),
      compare: () => Object.fromEntries(workspace.runSavedQueries()),
    },

    query: (q) => workspace.query(q),

    // Straight through, like `query`. The facade holds the system and the engine's own admission,
    // so there is nothing for this method to decide -- which is the point: a second decision here
    // would be a third opinion about what the model licenses.
    check: (q) => workspace.check(q),

    // Straight through, like `check`. The facade holds the system and the one rule set, so there
    // is nothing for this method to decide — a decision here would be the third party the
    // authority declaration exists to forbid.
    validate: () => workspace.validate(),

    // "(unsaved)" rather than a generated id: an id here would look like a handle an agent could
    // pass to `evidence()` or `retract`, and nothing was saved.
    ask: (q) => workspace.evaluate("(unsaved)", q),

    // The derived facade. Each method is a constructor and a delegation to the SAME seam the typed
    // document reaches, so there is no second admission, no second result shape and nothing here to
    // decide. `elements` reads the system the way `inspect` reads it, one line up, because it is a
    // representation question rather than an analysis -- which is also why the registry records it
    // as a second machine affordance of `inspect` rather than of `query`.
    model: {
      elements: (selector) => selectElements(workspace.state.system, selector),
      count: (selector) => countElements(workspace.state.system, selector),
      related: (from, relation, direction) => workspace.query(relatedQuery(from, relation, direction)),
      reachable: (from, relation, to) =>
        workspace.query(reachableQuery(from, relation, to ?? null)),
      path: (from, to, relation) => workspace.query(pathQuery(from, to, relation)),
      violations: () => workspace.validate(),
      // The validator component's own function, straight through — the verdicts are V48's
      // membership semantics and nothing here re-decides them.
      explainType: (entity) => explainType(workspace.state.system, entity),
    },

    // Straight through, like `analysis` below: the facade holds the system, the projection and the
    // gate, so there is nothing for this method to decide. The namespace is the fence; the
    // delegation is exactly what it was before the fence existed.
    debug: {
      sparql: (text, budget) =>
        budget === undefined ? workspace.sparql(text) : workspace.sparql(text, budget),
    },

    savedQueries: () => Object.fromEntries(workspace.runSavedQueries()),

    properties: () => workspace.properties(),

    evidence: readEvidence,

    view: {
      select: (ids) => { viewState.selection = [...ids]; onViewChange(); },
      selection: () => [...viewState.selection],
      focus: (target) => { viewState.target = target; onViewChange(); },
      target: () => viewState.target,
      // Accepted even for a question this revision does not save, and the asymmetry is deliberate:
      // an agent may retract a question between focusing it and the next paint, and the paint
      // resolves the focus against the live system anyway. Refusing here would make the agent
      // handle a race the shell already handles by drawing nothing.
      witness: (queryId) => { viewState.witness = queryId; onViewChange(); },
      witnessing: () => viewState.witness ?? null,
    },

    undo: () => workspace.undo(),
    redo: () => workspace.redo(),
    load: (text) => { workspace.load(text); return context(); },
    export: () => workspace.export(),

    examples: () => examples.describeAll(),
    // Returns the ordinary context, deliberately. There is nothing else to hand back: the result of
    // loading an example is a workspace, and an agent reads it with the methods above.
    loadExample: async (id) => { await examples.load(id); return context(); },
    provenance: () => workspace.provenance(),

    // Straight through to the one Workspace, like every other method here. An agent's long
    // exploration is the same call the page makes, against the same IR, over the same Worker.
    analysis: {
      explore: (limit) => (limit === undefined ? workspace.explore() : workspace.explore(limit)),
      resolveExhausted: (escalation, budget) =>
        budget === undefined
          ? workspace.resolveExhausted(escalation)
          : workspace.resolveExhausted(escalation, budget),
      inFlight: () => workspace.analysisInFlight(),
      cancel: (id) => workspace.cancelAnalysis(id),
    },
  };
}
