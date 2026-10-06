/**
 * The transaction engine: the fixed, atomic pipeline, and undo/redo as a consequence of it.
 *
 *     parse -> verify base -> apply to a candidate -> validate the ENTIRE resulting system -> commit
 *
 * Atomicity is structural rather than defended. Nothing in the pipeline touches the live document:
 * stage 3 clones it, every edit lands on the clone, and the clone is only adopted at stage 5. A
 * failure at any stage therefore has nothing to undo, which is the strongest form of "leaves the
 * current system byte-identical" available — `current.document.toText()` is the same string it was,
 * byte for byte, because that object was never handed to an editing routine. `MageDocument.seal()`
 * makes the discipline enforced instead of merely intended.
 *
 * **The whole system is validated, not the touched parts**, because an operation's damage is not
 * local: deleting an entity breaks the relation that pointed at it, in a different model, under a
 * different key. The one refinement over PLAN.md §D's wording is that the engine rejects on findings
 * the base did not already have, rather than on any findings at all — otherwise opening a file that
 * is already invalid would make it uneditable, and fixing a broken model is exactly when a user
 * needs transactions to work. Any *new* finding anywhere still refuses.
 *
 * **Undo/redo is a stack of systems, not of inverse operations.** Inverse ops are where undo bugs
 * live: every op needs a correct inverse, the inverse of a cascade needs the pre-state it destroyed,
 * and a wrong inverse corrupts silently. The IR is immutable and a revision is a parsed document, so
 * keeping whole revisions is cheap and obviously correct — undo is a pointer move.
 */
// The detail-carrying pass, not the narrowed `validate`: a rejection's findings reach the agent
// that must repair them, and the typed half (subjects, severity, spec) is exactly what it edits
// by. The narrowed triple stays what the Python parity surface compares; nothing here is on it.
import { validateWithDetail } from "../validator/rules.ts";
import type { CanonicalSystem, Finding } from "../ir/types.ts";
import { MageDocument } from "../yaml/document.ts";
import { applyOperation } from "./apply-op.ts";
import { parseTransaction } from "./parse.ts";
import type { Rejection, Revision, Transaction, TransactionResult } from "./types.ts";

/** Stable identity of a finding, for set difference between the base and the candidate. */
// JSON.stringify, not a NUL-separated literal: NUL cannot appear in the data, which is why it
// is tempting, but it makes the file binary to tooling and slips past git's 8 KB detection
// window entirely when it sits later in a file.
const findingKey = (f: Finding): string => JSON.stringify([f.rule, f.where, f.message]);

/** Findings the candidate has and the base did not. */
function introduced(base: readonly Finding[], candidate: readonly Finding[]): readonly Finding[] {
  const had = new Set(base.map(findingKey));
  return candidate.filter((f) => !had.has(findingKey(f)));
}

const reject = (
  kind: Rejection["kind"], message: string, where: string | null,
  findings: readonly Finding[], hash: string,
): TransactionResult => ({
  outcome: "rejected",
  revision: null,
  rejection: { kind, message, where, findings },
  baseHash: hash,
  // Equal to baseHash by construction: a rejection changed nothing.
  systemHash: hash,
});

export interface EngineLoad {
  /** `null` iff the text is not one parseable YAML document. */
  readonly engine: TransactionEngine | null;
  /** Syntax findings from the load, plus the baseline's semantic findings. */
  readonly findings: readonly Finding[];
}

/**
 * Holds one model system and its revision history.
 *
 * A class because it is state-bearing in the sense rule #11a means: a mutable current pointer, two
 * stacks, and a baseline finding set that every transaction is measured against. State wants an
 * owner, and the owner is what makes "there SHALL NOT be an agent-specific model copy" (FR-AGENT-1)
 * expressible — the UI and `window.mage` are handed this one object.
 */
export class TransactionEngine {
  #current: Revision;
  #past: Revision[] = [];
  #future: Revision[] = [];
  /** Findings present when the file was loaded; a transaction is judged on what it ADDS to these. */
  readonly baselineFindings: readonly Finding[];

  private constructor(baseline: Revision, baselineFindings: readonly Finding[]) {
    this.#current = baseline;
    this.baselineFindings = baselineFindings;
  }

  static load(text: string): EngineLoad {
    const loaded = MageDocument.load(text);
    if (loaded.document === null) return { engine: null, findings: loaded.findings };
    const document = loaded.document.seal();
    const system = document.system();
    const baselineFindings = validateWithDetail(system);
    const revision: Revision = {
      document, system, hash: document.hash(), rationale: null, operations: [],
    };
    return {
      engine: new TransactionEngine(revision, baselineFindings),
      findings: [...loaded.findings, ...baselineFindings],
    };
  }

  get current(): Revision { return this.#current; }
  system(): CanonicalSystem { return this.#current.system; }
  /** The value an agent must put in `transaction.base`. */
  hash(): string { return this.#current.hash; }
  toText(): string { return this.#current.document.toText(); }

  /** Oldest-first, including the current revision. */
  history(): readonly Revision[] { return [...this.#past, this.#current]; }
  get canUndo(): boolean { return this.#past.length > 0; }
  get canRedo(): boolean { return this.#future.length > 0; }

  /**
   * Run the pipeline. The only mutator of this engine's state, and it mutates nothing until the
   * last line.
   */
  apply(input: unknown): TransactionResult {
    const hash = this.#current.hash;

    // 1. Parse.
    const parsed = parseTransaction(input);
    if (parsed.transaction === null) {
      return reject("malformed", "the transaction does not conform to mage-transaction.schema.json.",
        "transaction", parsed.findings, hash);
    }
    const tx: Transaction = parsed.transaction;

    // 2. Verify base. A loud rejection, never a best-effort merge: an agent that computed against a
    //    system the user has since edited has to recompute, because its premise is gone.
    if (tx.base !== hash) {
      return reject("base-mismatch",
        `base '${tx.base}' is not the current system '${hash}'. The model changed since these ` +
        `operations were computed; recompute them against the current system.`,
        "transaction.base",
        [{ rule: "TRANSACTION", where: "transaction.base", message: `expected '${hash}', got '${tx.base}'.` }],
        hash);
    }

    // 3. Apply to a candidate. The live document is sealed and never reached.
    const candidate = this.#current.document.clone();
    for (const [i, op] of tx.operations.entries()) {
      const failure = applyOperation(candidate, op, i);
      if (failure !== null) {
        return reject("operation-failed", failure.message, failure.where, failure.findings, hash);
      }
    }

    // 4. Validate the ENTIRE resulting system, and reject on anything the base did not already have.
    const candidateSystem = candidate.system();
    const added = introduced(this.baselineFindings, validateWithDetail(candidateSystem));
    if (added.length > 0) {
      return reject("validation-failed",
        `the resulting system would violate ${added.length} semantic rule(s): ` +
        `${added.map((f) => `${f.rule} at ${f.where} — ${f.message}`).join(" ")}`,
        null, added, hash);
    }

    // 5. Commit. Re-parse the written text so the next revision's baseline is its own bytes and the
    //    write fidelity does not compound across revisions.
    const committedText = candidate.toText();
    const reloaded = MageDocument.load(committedText);
    if (reloaded.document === null) {
      return reject("operation-failed",
        "the edited document did not reparse; the transaction was discarded rather than persisted.",
        null, reloaded.findings, hash);
    }
    const document = reloaded.document.seal();
    const revision: Revision = {
      document,
      system: document.system(),
      hash: document.hash(),
      rationale: tx.rationale,
      operations: tx.operations,
    };
    this.#past.push(this.#current);
    this.#future.length = 0;
    this.#current = revision;
    return { outcome: "committed", revision, rejection: null, baseHash: hash, systemHash: revision.hash };
  }

  /** Step back one revision. `null` when there is nothing to undo. */
  undo(): Revision | null {
    const previous = this.#past.pop();
    if (previous === undefined) return null;
    this.#future.push(this.#current);
    this.#current = previous;
    return previous;
  }

  /** Step forward again. `null` when there is nothing to redo. */
  redo(): Revision | null {
    const next = this.#future.pop();
    if (next === undefined) return null;
    this.#past.push(this.#current);
    this.#current = next;
    return next;
  }
}
