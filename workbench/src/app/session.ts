/**
 * The session: what survives a page reload, and the one control that wipes it.
 *
 * ## Why this exists
 *
 * Measured 261005: a reload left a student at an EMPTY workbench — zero properties, the workspace
 * region hidden, the example chooser back at the start. Not "your edits are gone and here is the
 * shipped model again", which would be forgiving; the student landed BEFORE step one and had to
 * re-pick and re-load the example to continue. In a lab whose fifth step is an open-ended design
 * search over several candidate edits, a stray refresh cost all of it with no warning.
 *
 * So a session now persists, and RESET is the only thing that wipes it.
 *
 * ## What is persisted, and why it is the TEXT
 *
 * The document text, exactly as `Workspace.export()` renders it — which preserves comments and key
 * order, because the YAML layer round-trips them. Not the canonical system, not the revision
 * history, not a derived snapshot:
 *
 *   - The text is the only representation the loader already accepts, so restoring is `load(text)`,
 *     the same call the example catalogue makes. No second deserialiser to drift.
 *   - Every derived thing — system, hash, properties, verdicts — is RECOMPUTED from it on restore.
 *     A stored verdict could outlive the model that justified it; a stored text cannot, because the
 *     engine answers from the text or not at all. This is the same reason a property stores a
 *     statement and recomputes its verdict rather than storing one.
 *
 * REVISION HISTORY IS DELIBERATELY NOT PERSISTED. Undo after a reload would have to replay
 * transactions against a system rebuilt from text, and a half-restored history is worse than an
 * honest one: the student would see an Undo control that silently did less than it claims. So the
 * restored session is a fresh starting point whose CONTENT is where they left off. Say so in the
 * announcement rather than letting them discover it.
 *
 * ## Failure is not an error here
 *
 * Storage throws in private browsing, under quota pressure, and when a browser disables it. Every
 * entry point swallows that deliberately and degrades to the previous behaviour — no persistence,
 * workbench still works. A lab that refuses to start because it cannot write a cache would be a
 * worse failure than the one this module exists to fix. The swallow is justified here and nowhere
 * else in this file.
 */

/** Bumped when the stored shape changes; a stored session from an older shape is discarded. */
const VERSION = 1;
const KEY = "mage.workbench.session.v1";

export interface StoredSession {
  readonly version: number;
  /** The example this began from, for the announcement. Null when opened from a file. */
  readonly exampleId: string | null;
  /** `Workspace.export()` output — comments and key order intact. */
  readonly text: string;
  /** Epoch ms, for the announcement only. Never used to decide validity. */
  readonly savedAt: number;
}

/** The storage this module writes. Injectable so a test drives it without a browser. */
export interface SessionStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const browserStore = (): SessionStore | null => {
  try {
    // Touch it: merely EXISTING is not enough — Safari private mode throws on write, not on access.
    const probe = "mage.workbench.probe";
    globalThis.localStorage.setItem(probe, "1");
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    return null; // deliberate: see the header. No persistence, everything else still works.
  }
};

export class Session {
  readonly #store: SessionStore | null;

  constructor(store: SessionStore | null = browserStore()) {
    this.#store = store;
  }

  /** True when this browser lets us persist at all. The UI uses it to word its announcement. */
  get available(): boolean { return this.#store !== null; }

  save(exampleId: string | null, text: string): void {
    if (this.#store === null) return;
    const payload: StoredSession = { version: VERSION, exampleId, text, savedAt: Date.now() };
    try {
      this.#store.setItem(KEY, JSON.stringify(payload));
    } catch {
      // Quota, most likely a very large model. Dropping the save is correct: the in-memory
      // workspace is untouched and the student loses only the reload safety net.
    }
  }

  /**
   * The stored session, or null — including when the stored shape is from an older version, which
   * is discarded rather than guessed at.
   */
  restore(): StoredSession | null {
    if (this.#store === null) return null;
    let raw: string | null = null;
    try {
      raw = this.#store.getItem(KEY);
    } catch {
      return null;
    }
    if (raw === null) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return null;
      const s = parsed as Partial<StoredSession>;
      if (s.version !== VERSION || typeof s.text !== "string" || s.text.trim() === "") return null;
      return {
        version: VERSION,
        exampleId: typeof s.exampleId === "string" ? s.exampleId : null,
        text: s.text,
        savedAt: typeof s.savedAt === "number" ? s.savedAt : 0,
      };
    } catch {
      return null; // corrupt payload: discard rather than refuse to boot
    }
  }

  /** RESET. The only thing that wipes a session. */
  clear(): void {
    if (this.#store === null) return;
    try {
      this.#store.removeItem(KEY);
    } catch {
      // Nothing to do and nothing to tell the user: the next save overwrites it anyway.
    }
  }
}
