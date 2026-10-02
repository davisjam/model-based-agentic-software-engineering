/**
 * Application services — the single seam.
 *
 * Human controls, file import, and `window.mage` all call THIS and nothing else. That is what
 * makes FR-AGENT-1's "there SHALL NOT be an agent-specific model copy" structural rather than a
 * promise: there is one store here, and no second way to reach it.
 *
 * The store holds a stack of whole systems rather than inverse operations. Undo is popping;
 * a hypothesis is a branch off the same stack. Three features, one mechanism — and no inverse-op
 * bugs, which is where undo normally goes wrong.
 */
import type { CanonicalSystem, Finding, QueryResult } from "../ir/types.ts";
import { canonicalize } from "../ir/canonicalize.ts";
import { systemHash } from "../ir/hash.ts";
import { validate } from "../validator/rules.ts";
import type { EnginePort, RenderOptions, RenderPort, RenderedView, TransactionPort, YamlPort } from "./ports.ts";

export interface Ports {
  readonly engine: EnginePort;
  readonly yaml: YamlPort;
  readonly transactions: TransactionPort;
  readonly render: RenderPort;
}

/** Everything a listener needs to redraw. Emitted on every state change, from any caller. */
export interface WorkspaceState {
  readonly system: CanonicalSystem;
  readonly hash: string;
  readonly findings: readonly Finding[];
  /** null on the authoritative branch; a label when a hypothesis is active. */
  readonly hypothesis: string | null;
  readonly sourceText: string | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export type Listener = (state: WorkspaceState) => void;

const EMPTY_DOC = { mage: 1, system: { id: "untitled" } };

export class Workspace {
  #past: CanonicalSystem[] = [];
  #future: CanonicalSystem[] = [];
  #system: CanonicalSystem;
  #sourceText: string | null = null;
  /** Authoritative system, parked while a hypothesis is active. Restored on discard. */
  #authoritative: CanonicalSystem | null = null;
  #hypothesis: string | null = null;
  #listeners = new Set<Listener>();
  // A plain field, not a constructor parameter property: `erasableSyntaxOnly` forbids the
  // shorthand, which is the price of tests running the .ts directly with no build step.
  readonly #ports: Ports;

  constructor(ports: Ports) {
    this.#ports = ports;
    this.#system = canonicalize(EMPTY_DOC);
  }

  // -- observation -----------------------------------------------------------------------------

  get state(): WorkspaceState {
    return {
      system: this.#system,
      hash: systemHash(this.#system),
      findings: validate(this.#system),
      hypothesis: this.#hypothesis,
      sourceText: this.#sourceText,
      canUndo: this.#past.length > 0,
      canRedo: this.#future.length > 0,
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

  #commit(next: CanonicalSystem): void {
    this.#past.push(this.#system);
    this.#future = [];
    this.#system = next;
    this.#emit();
  }

  // -- loading ---------------------------------------------------------------------------------

  /** Import source text. Invalid source still LOADS — editing must not destroy someone's work. */
  load(text: string): WorkspaceState {
    const doc = this.#ports.yaml.parse(text);
    this.#sourceText = text;
    this.#commit(canonicalize(doc));
    return this.state;
  }

  /** Export, preserving the comments and key order of whatever was imported. */
  export(): string {
    return this.#ports.yaml.serialize(this.#system, this.#sourceText);
  }

  // -- mutation --------------------------------------------------------------------------------

  /**
   * The ONLY way the system changes. Atomic: a rejected transaction leaves the workspace exactly
   * as it was, and the findings explain why.
   */
  transact(transaction: unknown): { readonly ok: boolean; readonly findings: readonly Finding[] } {
    const result = this.#ports.transactions.apply(this.#system, transaction);
    if (result.ok) this.#commit(result.system);
    return { ok: result.ok, findings: result.findings };
  }

  undo(): boolean {
    const prev = this.#past.pop();
    if (prev === undefined) return false;
    this.#future.push(this.#system);
    this.#system = prev;
    this.#emit();
    return true;
  }

  redo(): boolean {
    const next = this.#future.pop();
    if (next === undefined) return false;
    this.#past.push(this.#system);
    this.#system = next;
    this.#emit();
    return true;
  }

  // -- hypotheses ------------------------------------------------------------------------------

  /**
   * Open a what-if branch. The transaction goes through the SAME validated path as every other
   * mutation — there is deliberately no special what-if mechanism, because a second mutation path
   * is where the bugs would live.
   */
  openHypothesis(label: string, transaction: unknown): { readonly ok: boolean; readonly findings: readonly Finding[] } {
    if (this.#hypothesis !== null) return { ok: false, findings: [{ rule: "HYPOTHESIS", where: label, message: `hypothesis '${this.#hypothesis}' is already open; apply or discard it first.` }] };
    const parked = this.#system;
    const result = this.#ports.transactions.apply(this.#system, transaction);
    if (!result.ok) return { ok: false, findings: result.findings };
    this.#authoritative = parked;
    this.#hypothesis = label;
    this.#commit(result.system);
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

  /** Throw the hypothesis away. Analysis of a hypothesis never touched the authoritative system. */
  discardHypothesis(): boolean {
    if (this.#authoritative === null) return false;
    this.#system = this.#authoritative;
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
    const q = query as { kind?: unknown };
    const raw = q.kind === "graph"
      ? this.#ports.engine.graphQuery(this.#system, query)
      : this.#ports.engine.behaviorQuery(this.#system, query);
    return { ...raw, systemHash: systemHash(this.#system) };
  }

  /** Every saved query, re-run. This is the "changing the model reruns the questions" behaviour. */
  runSavedQueries(): ReadonlyMap<string, QueryResult> {
    const out = new Map<string, QueryResult>();
    for (const [id, saved] of this.#system.queries) out.set(id, this.query(saved.raw));
    return out;
  }

  // -- views -----------------------------------------------------------------------------------

  /** Non-semantic. A view never changes what the model asserts. */
  renderView(options: RenderOptions): RenderedView {
    return this.#ports.render.render(this.#system, options);
  }
}
