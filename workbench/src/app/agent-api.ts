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
import type { Finding, QueryResult } from "../ir/types.ts";
import type { PendingResult } from "./ports.ts";
import type { ExhaustedResult, QueryAlgebra, SeamQuestion } from "../sparql/index.ts";
import type { Workspace } from "./services.ts";
import type { ExampleCatalog, ExampleDescription } from "./examples.ts";
import type { ProvenanceRecord } from "./provenance.ts";
import type { EvaluatedProperty } from "./properties.ts";
import { CAPABILITIES, checkAffordanceParity } from "./capabilities.ts";

/** Bumped on a breaking change to this surface. Implementation internals are not API. */
export const AGENT_API_VERSION = "0.1.0";

export interface MageAgentApi {
  readonly version: string;
  describe(): ApiDescription;
  context(): WorkspaceContext;
  inspect(): SystemInspection;
  transact(transaction: unknown): TransactionOutcome;
  hypothesis: HypothesisApi;
  query(query: unknown): QueryResult;
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
  evidence(queryId: string): QueryResult | null;
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
   * It is NOT a new semantic capability, and deliberately earns no row in the capability registry.
   * `analyze` already names `workspace.query` as its service and has wired affordances on both
   * sides; running a long one off-thread changes WHERE the engine runs, not what the workbench can
   * do. Inventing a capability for it would make the registry report a capability the product did
   * not gain. What the registry does owe is `window.mage.analysis.explore` as a second machine
   * affordance on the `analyze` row — a one-line edit in `capabilities.ts`, named rather than made,
   * because that file belongs to another wave.
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
   * Takes the spent result, so the Worker's larger budget is reachable only as the escalation of an
   * exhausted question rather than as a way around the interactive bound.
   */
  resolveExhausted(
    spent: ExhaustedResult, question: SeamQuestion, query: QueryAlgebra, budget?: number,
  ): Promise<PendingResult>;
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
  const lastResults = new Map<string, QueryResult>();

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

    // "(unsaved)" rather than a generated id: an id here would look like a handle an agent could
    // pass to `evidence()` or `retract`, and nothing was saved.
    ask: (q) => workspace.evaluate("(unsaved)", q),

    savedQueries: () => {
      const results = workspace.runSavedQueries();
      lastResults.clear();
      for (const [id, r] of results) lastResults.set(id, r);
      return Object.fromEntries(results);
    },

    properties: () => workspace.properties(),

    evidence: (queryId) => lastResults.get(queryId) ?? null,

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
      resolveExhausted: (spent, question, query, budget) =>
        budget === undefined
          ? workspace.resolveExhausted(spent, question, query)
          : workspace.resolveExhausted(spent, question, query, budget),
      inFlight: () => workspace.analysisInFlight(),
      cancel: (id) => workspace.cancelAnalysis(id),
    },
  };
}
