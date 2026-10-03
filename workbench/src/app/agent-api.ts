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
import type { ValidationResult } from "../validator/result.ts";
import type { ExampleCatalog, ExampleDescription } from "./examples.ts";
import type { ProvenanceRecord } from "./provenance.ts";
import type { EvaluatedProperty } from "./properties.ts";
import { CAPABILITIES, checkAffordanceParity } from "./capabilities.ts";

/**
 * Bumped on a breaking change to this surface. Implementation internals are not API.
 *
 * 0.2.0 — `evidence(queryId)` returns an `EvidenceReading` instead of `QueryResult | null`. The
 * nullable was the defect, not the spelling: one value carried "no witness" and "nobody primed the
 * cache this method read", so no caller could tell them apart.
 */
export const AGENT_API_VERSION = "0.2.0";

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
   * Ask a SPARQL question of the RDF projection: text in, solutions or a structured refusal out.
   *
   * §11's shape, taken literally — a student normally does not write SPARQL, an agent does. So this
   * is the machine syntax of the `query` capability rather than a capability of its own, and it is
   * registered as a third machine affordance of `query` in `capabilities.ts`, where the reasoning
   * and its cost are recorded. It adds no privileged path: it delegates to `workspace.sparql`, which
   * is the same facade every other method here goes through, and the licensing gate inside
   * `translate` decides what the model licenses before anything is evaluated.
   *
   * A SELECT's rows arrive as `Map`s, like the configuration maps inside a behavioural witness from
   * `query()`. `WorkerEvaluation` is the flattened spelling, for the message port that needs one;
   * this returns the facade's own object so that an agent and the page read ONE value.
   */
  sparql(text: string, budget?: number): SparqlAnswer;
  savedQueries(): Record<string, QueryResult>;
  /**
   * Every persistent property: proposition, status, the models and evidence the status derives
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
   *    hands back the same four arms `sparql` does. Same capability, different bound — so it is
   *    registered as a machine affordance of `query`, beside `window.mage.sparql`, which is the same
   *    row for the same reason (one capability, several spellings).
   *  - `explore` answers a question nothing else in the workbench answers: how big is the reachable
   *    configuration space, and did the walk finish. The result is a `SpaceSummary`, a shape no other
   *    capability produces. Off-thread-ness is not the capability; the summary is. So it earns the
   *    `explore-space` row, and `capabilities.ts` records what that costs — UX-I1 reports it, because
   *    no human control reaches it.
   */
  analysis: AnalysisApi;
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
  /** Named limitations, so an agent learns the boundary from the API instead of from a wrong answer. */
  readonly notSupported: readonly string[];
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
}

/** Non-semantic view state. Deliberately NOT in the IR, so it cannot affect a query result. */
export interface ViewState {
  target: string | null;
  selection: string[];
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

    // Straight through, like `analysis` below: the facade holds the system, the projection and the
    // gate, so there is nothing for this method to decide.
    sparql: (text, budget) =>
      budget === undefined ? workspace.sparql(text) : workspace.sparql(text, budget),

    savedQueries: () => Object.fromEntries(workspace.runSavedQueries()),

    properties: () => workspace.properties(),

    evidence: readEvidence,

    view: {
      select: (ids) => { viewState.selection = [...ids]; onViewChange(); },
      selection: () => [...viewState.selection],
      focus: (target) => { viewState.target = target; onViewChange(); },
      target: () => viewState.target,
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
