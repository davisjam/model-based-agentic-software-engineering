/**
 * Application services — the single seam.
 *
 * Human controls, file import, and `window.mage` all call THIS and nothing else. That is what
 * makes FR-AGENT-1's "there SHALL NOT be an agent-specific model copy" structural rather than a
 * promise: there is one store here, and no second way to reach it. It is also UX-I3 —
 * authoritative-state convergence — expressed in code: every edit path normalises to the same IR.
 *
 * ## Why this delegates rather than keeping its own history
 *
 * It used to hold a stack of whole systems and an unbound `transactions` port. But the Phase D
 * `TransactionEngine` already IS a workspace: document, system, hash, revision history, undo, redo,
 * and the fixed parse → verify-base → apply-to-copy → validate-whole → commit pipeline. Keeping a
 * second revision stack beside it was the same duplication being removed elsewhere in this project,
 * and it was the reason `transactions.apply` could only refuse: the facade had an IR but not the
 * document the operations needed.
 *
 * So the engine owns revisions and this owns *presentation* concerns — subscriptions, hypotheses,
 * and the query/render seams. One mechanism, not two.
 */
import type { CanonicalSystem, Finding, QueryResult } from "../ir/types.ts";
import { canonicalize } from "../ir/canonicalize.ts";
import { systemHash } from "../ir/hash.ts";
import { validate } from "../validator/rules.ts";
import { TransactionEngine } from "../transaction/engine.ts";
import { collectProvenance } from "./provenance.ts";
import type { ProvenanceRecord } from "./provenance.ts";
import { evaluateOne, evaluateProperties } from "./properties.ts";
import type { EvaluatedProperty } from "./properties.ts";
import type { EnginePort, RenderPort, RenderedView, SceneRequest } from "./ports.ts";

/**
 * Ports that remain genuinely external. YAML and transactions are no longer here: the
 * `TransactionEngine` owns both, because a transaction needs the document and the document is where
 * comments live.
 */
export interface Ports {
  readonly engine: EnginePort;
  readonly render: RenderPort;
}

export interface WorkspaceState {
  readonly system: CanonicalSystem;
  readonly hash: string;
  readonly findings: readonly Finding[];
  /** Findings the file already had on load. A transaction is judged on what it ADDS to these. */
  readonly baselineFindings: readonly Finding[];
  /** null on the authoritative branch; a label when a hypothesis is active. */
  readonly hypothesis: string | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** false until a model is loaded; editing operations refuse until then. */
  readonly loaded: boolean;
}

export type Listener = (state: WorkspaceState) => void;

const EMPTY = "mage: 1\nsystem:\n  id: untitled\n";

/**
 * What "Create new model system" loads.
 *
 * Deliberately a string of YAML handed to the ordinary `load`, not a constructor. Creating a system
 * and importing one are the same act on the same seam, which is why the registry treats the new
 * control as a second affordance of `import` rather than a capability of its own.
 *
 * The comment survives the round trip — the YAML layer preserves comments — so a user who exports
 * an untouched new system gets a file that says what to do next.
 */
export const NEW_SYSTEM = [
  "# A new MAGE model system. Add a purposeful model and the engineering question it answers:",
  "# a model that states no question cannot refuse a question it does not cover.",
  "mage: 1",
  "system:",
  "  id: untitled",
  "  name: Untitled model system",
  "",
].join("\n");

export class Workspace {
  #engine: TransactionEngine;
  /** The authoritative engine, parked while a hypothesis is active. */
  #authoritative: TransactionEngine | null = null;
  #hypothesis: string | null = null;
  #loaded = false;
  #listeners = new Set<Listener>();
  readonly #ports: Ports;

  constructor(ports: Ports) {
    this.#ports = ports;
    const boot = TransactionEngine.load(EMPTY);
    if (boot.engine === null) throw new Error("the empty model must load");
    this.#engine = boot.engine;
  }

  // -- observation -----------------------------------------------------------------------------

  get state(): WorkspaceState {
    const system = this.#engine.system();
    return {
      system,
      hash: this.#engine.hash(),
      findings: validate(system),
      baselineFindings: this.#engine.baselineFindings,
      hypothesis: this.#hypothesis,
      canUndo: this.#engine.canUndo,
      canRedo: this.#engine.canRedo,
      loaded: this.#loaded,
    };
  }

  subscribe(fn: Listener): () => void {
    this.#listeners.add(fn);
    fn(this.state);
    return () => this.#listeners.delete(fn);
  }

  #emit(): void {
    const snapshot = this.state;
    for (const fn of this.#listeners) fn(snapshot);
  }

  // -- loading ---------------------------------------------------------------------------------

  /**
   * Import source text. Invalid source still LOADS when it parses — editing must not destroy
   * someone's work, and a file with findings is exactly when transactions are needed to repair it.
   * Only unparseable text is refused, because there is then no document to edit.
   */
  load(text: string): { readonly ok: boolean; readonly findings: readonly Finding[] } {
    const loaded = TransactionEngine.load(text);
    if (loaded.engine === null) return { ok: false, findings: loaded.findings };
    this.#engine = loaded.engine;
    this.#authoritative = null;
    this.#hypothesis = null;
    this.#loaded = true;
    this.#emit();
    return { ok: true, findings: loaded.findings };
  }

  /** Export, preserving the comments and key order of whatever was imported. */
  export(): string {
    return this.#engine.toText();
  }

  // -- provenance ------------------------------------------------------------------------------

  /**
   * Where each object came from. The ONE service both the Provenance section and
   * `window.mage.provenance()` call.
   *
   * Read-only, and that is UX-I6 held structurally: a caller is handed records, never a writer, so
   * inspecting an origin cannot reach the IR and cannot move a result. The records are derived on
   * every call rather than cached, because a cache would be a second copy of annotation state that
   * a committed transaction could leave stale.
   */
  provenance(): readonly ProvenanceRecord[] {
    return collectProvenance(this.#engine.system());
  }

  // -- mutation --------------------------------------------------------------------------------

  /**
   * The ONLY way the system changes. Atomic: a rejected transaction leaves the workspace exactly as
   * it was, and the findings explain why. `transaction.base` must equal the current hash — a
   * mismatch is a loud rejection, never a merge.
   */
  transact(transaction: unknown): { readonly ok: boolean; readonly findings: readonly Finding[] } {
    const result = this.#engine.apply(transaction);
    if (result.outcome === "committed") {
      this.#emit();
      return { ok: true, findings: [] };
    }
    return { ok: false, findings: result.rejection?.findings ?? [] };
  }

  undo(): boolean {
    if (this.#engine.undo() === null) return false;
    this.#emit();
    return true;
  }

  redo(): boolean {
    if (this.#engine.redo() === null) return false;
    this.#emit();
    return true;
  }

  // -- hypotheses ------------------------------------------------------------------------------

  /**
   * Open a what-if branch. The transaction goes through the SAME validated path as every other
   * mutation — there is deliberately no special what-if mechanism, because a second mutation path
   * is where the bugs would live.
   *
   * The branch is a SEPARATE engine loaded from the same text, so analysis of a hypothesis cannot
   * mutate or change the identity of the authoritative model. Discarding restores the parked engine
   * untouched rather than attempting to invert anything.
   */
  openHypothesis(label: string, transaction: unknown): { readonly ok: boolean; readonly findings: readonly Finding[] } {
    if (this.#hypothesis !== null) {
      return { ok: false, findings: [{
        rule: "HYPOTHESIS", where: label,
        message: `hypothesis '${this.#hypothesis}' is already open; apply or discard it first.`,
      }] };
    }
    const branch = TransactionEngine.load(this.#engine.toText());
    if (branch.engine === null) return { ok: false, findings: branch.findings };
    const result = branch.engine.apply(transaction);
    if (result.outcome !== "committed") {
      return { ok: false, findings: result.rejection?.findings ?? [] };
    }
    this.#authoritative = this.#engine;
    this.#engine = branch.engine;
    this.#hypothesis = label;
    this.#emit();
    return { ok: true, findings: [] };
  }

  /** Accept the hypothesis as authoritative. It already passed validation when it opened. */
  applyHypothesis(): boolean {
    if (this.#hypothesis === null) return false;
    this.#hypothesis = null;
    this.#authoritative = null;
    this.#emit();
    return true;
  }

  /** Throw the hypothesis away. The authoritative engine was never touched. */
  discardHypothesis(): boolean {
    if (this.#authoritative === null) return false;
    this.#engine = this.#authoritative;
    this.#authoritative = null;
    this.#hypothesis = null;
    this.#emit();
    return true;
  }

  // -- analysis --------------------------------------------------------------------------------

  /**
   * Run one query. The result carries the hash of the system it describes, so no caller — UI or
   * agent — can present an answer for revision N as though it described N+1.
   */
  query(query: unknown): QueryResult {
    const system = this.#engine.system();
    const q = query as { kind?: unknown };
    const raw = q.kind === "graph"
      ? this.#ports.engine.graphQuery(system, query)
      : this.#ports.engine.behaviorQuery(system, query);
    return { ...raw, systemHash: systemHash(system) };
  }

  /** Every saved query, re-run. This is "changing the model reruns the questions". */
  runSavedQueries(): ReadonlyMap<string, QueryResult> {
    const out = new Map<string, QueryResult>();
    for (const [id, saved] of this.#engine.system().queries) out.set(id, this.query(saved.raw));
    return out;
  }

  /**
   * Every persistent property, with its current verdict and the models that verdict derives from.
   *
   * The ONE service the property list and `window.mage.properties()` both call, which is UX-I1's
   * "both invoke the same service" for a surface that is nothing but a semantic result.
   *
   * Recomputed on every call, and that is the whole design rather than an implementation note. A
   * verdict is derived state (V18), so there is no field to cache it in and no way for a stored
   * answer to outlive the system it described — §3.3's "re-evaluated when relevant model semantics
   * change" is then structural: the only way to read a verdict is to compute one. The re-run costs
   * one engine pass over the saved queries, which is what `runSavedQueries` already did after every
   * transaction.
   */
  properties(): readonly EvaluatedProperty[] {
    return evaluateProperties(this.#engine.system(), this.runSavedQueries(), this.#engine.hash());
  }

  /**
   * Run ONE query and return it as a property: verdict plus the models the verdict derives from.
   *
   * The grounded twin of `query()`, and the service behind both the human ask form and
   * `window.mage.ask`. It exists so UX-I2 holds for the ad-hoc answer panel: that panel shows a
   * grounding, so a machine client must be able to read the same grounding, and `query()`'s
   * `QueryResult` has nowhere to put it.
   *
   * `id` is a label for the answer, not an identity: nothing is saved here. Saving is a separate,
   * explicit act through `save-query`, which is the §3.4 boundary — a query is ordinarily transient.
   */
  evaluate(id: string, query: unknown): EvaluatedProperty {
    return evaluateOne(this.#engine.system(), id, query, this.query(query), this.#engine.hash());
  }

  // -- views -----------------------------------------------------------------------------------

  /** Non-semantic. A view never changes what the model asserts. */
  renderView(request: SceneRequest): RenderedView {
    return this.#ports.render.render(this.#engine.system(), request);
  }

  /** Escape hatch for a caller that holds only a document: canonicalize without loading. */
  static canonicalizeOnly(doc: unknown): CanonicalSystem {
    return canonicalize(doc);
  }
}
