/**
 * The YAML adapter: text in, canonical IR out, text back — with the comments still in it.
 *
 * `parse` to a plain object and `stringify` it back is not acceptable here, and the reason is not
 * taste. A format advertised as Git-friendly and hand-edited cannot discard its own annotations on
 * every tool write: `examples/docable.mage.yaml` carries the explanation of why `worker` has one
 * instance and why `owns` forbids path composition, and that prose is the model's argument. So the
 * write path is the `yaml` package's **CST** (concrete syntax tree), which retains source text
 * token by token.
 *
 * ## Three write fidelities, and why the tier is part of the API
 *
 * Measured on `examples/docable.mage.yaml` (309 lines, heavily commented):
 *
 * | path | result |
 * |---|---|
 * | `Document.toString()` default | reflows folded scalars, re-pads `[ a, b ]`, collapses comment columns |
 * | `Document.toString({lineWidth:0, flowCollectionPadding:false})` | still unfolds `>` blocks and loses comment alignment |
 * | CST token passthrough | **byte-identical** |
 *
 * The `Document` model simply does not retain where a folded scalar was folded or which column a
 * trailing comment sat in, so no option set makes it byte-exact. The CST does. Hence:
 *
 * - **`verbatim`** — nothing was edited. Emit the source tokens. Byte-identical, always.
 * - **`surgical`** — every edit replaced an existing scalar in place via `CST.setScalarValue`.
 *   Byte-identical everywhere except the replaced scalars. This covers `set-label` and
 *   `set-property`-over-an-existing-value, which are the ops an agent issues most.
 * - **`reserialized`** — some edit was structural (a key or sequence item added or removed), which
 *   the CST cannot express without rebuilding tokens. Falls back to `Document.toString`: comments
 *   and key order survive, source *layout* (fold points, comment columns) normalizes.
 *
 * The fidelity downgrades monotonically and never upgrades, and it is reported rather than hidden,
 * because "your comments are intact but your line breaks moved" is a fact the caller must be able
 * to state. A commit re-parses the written text, so the new text becomes the new `verbatim`
 * baseline and the downgrade does not accumulate across revisions.
 *
 * ## Reading is YAML 1.2, deliberately
 *
 * This package implements YAML 1.2 core, so `off` reads as the string `"off"` rather than `false`.
 * That is the coherent pairing with V25: ids a 1.1 loader would coerce are *refused* by the
 * validator, so the reader never needs to handle a boolean state key — it needs to see the written
 * text so V25 can name it. The write side is where 1.1 must be defended against; see `coercion.ts`.
 */
import { Composer, Parser, CST, Scalar, isScalar, visit } from "yaml";
import type { Document } from "yaml";
import { canonicalize } from "../ir/canonicalize.ts";
import { systemHash } from "../ir/hash.ts";
import type { CanonicalSystem, Finding } from "../ir/types.ts";
import { coercionHazard } from "./coercion.ts";

/** Monotone: `verbatim` -> `surgical` -> `reserialized`. An edit may lower it, never raise it. */
export type Fidelity = "verbatim" | "surgical" | "reserialized";

const RANK: Readonly<Record<Fidelity, number>> = { verbatim: 0, surgical: 1, reserialized: 2 };

/** What an edit may write. Mirrors what the schemas allow in a model file. */
export type YamlValue =
  | string | number | boolean | null
  | readonly YamlValue[]
  | { readonly [key: string]: YamlValue };

export type Path = readonly (string | number)[];

/** Token kinds `CST.setScalarValue` can rewrite without disturbing a byte around them. */
const SURGICAL_TOKENS: ReadonlySet<string> = new Set([
  "scalar", "single-quoted-scalar", "double-quoted-scalar",
]);

/**
 * A loaded `.mage.yaml` — source text, CST tokens, `Document`, and the canonical IR derived from it.
 *
 * A class rather than a module of functions because it is state-bearing (rule #11a): tokens and
 * `Document` are two views of one mutable tree, and the derived IR is a cache that edits invalidate.
 * State wants an owner.
 *
 * **Sealing.** The CST is mutated in place by an edit, so a document held in a revision history
 * must never be edited afterwards — that is the one aliasing bug this design could still have.
 * `seal()` makes it structural: a sealed document throws on edit, and `TransactionEngine` edits
 * only a fresh `clone()`.
 */
export class MageDocument {
  readonly source: string;
  #tokens: CST.Token[];
  #doc: Document.Parsed;
  #fidelity: Fidelity = "verbatim";
  #system: CanonicalSystem | null = null;
  #sealed = false;

  private constructor(source: string, tokens: CST.Token[], doc: Document.Parsed) {
    this.source = source;
    this.#tokens = tokens;
    this.#doc = doc;
  }

  /**
   * Parse text. Syntax errors are returned, not thrown and not swallowed: a load failure is a
   * normal outcome of opening a hand-edited file, and it carries findings so the UI and an agent
   * read the same structure (FR-A11Y-2).
   */
  static load(text: string): LoadResult {
    const tokens = [...new Parser().parse(text)];
    const docs = [...new Composer({ keepSourceTokens: true }).compose(tokens)];
    const doc = docs[0];
    if (doc === undefined) {
      return {
        document: null,
        findings: [{ rule: "SYNTAX", where: "(document)", message: "no YAML document found in input." }],
      };
    }
    const findings: Finding[] = doc.errors.map((e) => ({
      rule: "SYNTAX",
      where: `offset ${e.pos[0]}`,
      message: e.message,
    }));
    // Warnings (e.g. an unsupported directive) are surfaced too — a silently ignored directive is
    // how a file comes to mean something other than it says.
    for (const w of doc.warnings) findings.push({ rule: "SYNTAX", where: `offset ${w.pos[0]}`, message: w.message });

    if (docs.length > 1) {
      // Not a model system at all, so there is nothing to hand back: picking the first document
      // would load a fraction of the file and report success.
      findings.push({
        rule: "SYNTAX",
        where: "(document)",
        message: `${docs.length} YAML documents in one file; a model system is exactly one.`,
      });
      return { document: null, findings };
    }
    if (doc.errors.length > 0) return { document: null, findings };
    return { document: new MageDocument(text, tokens, doc), findings };
  }

  get fidelity(): Fidelity { return this.#fidelity; }
  get sealed(): boolean { return this.#sealed; }

  /** Freeze against edits. Called when this document enters the revision history. */
  seal(): this { this.#sealed = true; return this; }

  /** The canonical IR. Cached, and invalidated by any edit. */
  system(): CanonicalSystem {
    this.#system ??= canonicalize(this.#doc.toJS());
    return this.#system;
  }

  /** The transaction base: a hash of the canonical IR, never of these bytes (hash.ts). */
  hash(): string { return systemHash(this.system()); }

  /** Serialize. Byte-identical to `source` while fidelity is `verbatim`. */
  toText(): string {
    if (this.#fidelity === "reserialized") {
      return this.#doc.toString({ lineWidth: 0, flowCollectionPadding: false });
    }
    return this.#tokens.map((t) => CST.stringify(t)).join("");
  }

  /** A fresh, unsealed, `verbatim` document over this one's current text. */
  clone(): MageDocument {
    const r = MageDocument.load(this.toText());
    if (r.document === null) {
      // Our own output failed to reparse. That is a defect in this module, not bad user input, and
      // it must be loud: committing it would persist a file we cannot read back.
      throw new Error(`MageDocument.clone: serialized output does not reparse: ${r.findings[0]?.message ?? "?"}`);
    }
    return r.document;
  }

  // ------------------------------------------------------------------------------------------
  // Edits. Every one goes through #downgrade, so the fidelity claim cannot drift from the truth.
  // ------------------------------------------------------------------------------------------

  /**
   * Write a scalar at `path`, creating intermediate maps as needed.
   *
   * Takes the surgical CST route when the path already holds a plain-or-quoted scalar, which keeps
   * the write byte-exact outside that one token.
   */
  setScalar(path: Path, value: string | number | boolean): void {
    this.#assertEditable();
    if (path.length === 0) throw new Error("setScalar: empty path");
    const existing = this.#doc.getIn(path, true);
    if (isScalar(existing)) {
      const token = (existing as { srcToken?: CST.Token }).srcToken;
      if (token !== undefined && SURGICAL_TOKENS.has(token.type)) {
        const text = typeof value === "string" ? value : String(value);
        const quote = typeof value === "string" && coercionHazard(value) !== null;
        CST.setScalarValue(token as CST.Token & { type: "scalar" }, text, quote ? { type: "QUOTE_DOUBLE" } : undefined);
        // Keep the Document view in step with the tokens we just rewrote; they are two views of
        // one tree and the IR is derived from the Document half.
        existing.value = value;
        this.#downgrade("surgical");
        return;
      }
    }
    this.#doc.setIn(path, this.#node(value));
    this.#downgrade("reserialized");
  }

  /** Write an arbitrary value (map, sequence, scalar) at `path`. Always structural. */
  setIn(path: Path, value: YamlValue): void {
    this.#assertEditable();
    this.#doc.setIn(path, this.#node(value));
    this.#downgrade("reserialized");
  }

  /** Remove `path`. Returns whether there was anything there — the caller decides if that is an error. */
  deleteIn(path: Path): boolean {
    this.#assertEditable();
    const had = this.#doc.hasIn(path);
    if (had) {
      this.#doc.deleteIn(path);
      this.#downgrade("reserialized");
    }
    return had;
  }

  /** Append to the sequence at `path`, creating it if absent. */
  pushIn(path: Path, value: YamlValue): void {
    this.#assertEditable();
    if (!this.#doc.hasIn(path)) this.#doc.setIn(path, this.#node([]));
    this.#doc.addIn(path, this.#node(value));
    this.#downgrade("reserialized");
  }

  has(path: Path): boolean { return this.#doc.hasIn(path); }

  /** The value at `path` as plain JS — nodes converted, so callers never handle YAML AST types. */
  get(path: Path): unknown {
    const v: unknown = this.#doc.getIn(path);
    return v !== null && typeof v === "object" && typeof (v as { toJSON?: unknown }).toJSON === "function"
      ? (v as { toJSON: () => unknown }).toJSON()
      : v;
  }

  /**
   * Remove every item of the sequence at `path` for which `matches` holds; returns how many went.
   *
   * Iterates backwards so the indices of the items still to be examined do not shift underneath the
   * walk — the reason `cascade` can drop two relations in one pass without addressing the wrong one.
   */
  dropSeqItems(path: Path, matches: (item: unknown, index: number) => boolean): number {
    this.#assertEditable();
    const seq = this.get(path);
    if (!Array.isArray(seq)) return 0;
    let dropped = 0;
    for (let i = seq.length - 1; i >= 0; i -= 1) {
      if (!matches(seq[i], i)) continue;
      this.#doc.deleteIn([...path, i]);
      dropped += 1;
    }
    if (dropped > 0) this.#downgrade("reserialized");
    return dropped;
  }

  /** Keys of the map at `path`, in file order. Empty when `path` is absent or not a map. */
  keysAt(path: Path): readonly string[] {
    const node = path.length === 0 ? this.#doc.contents : this.#doc.getIn(path, true);
    const items = (node as { items?: readonly unknown[] } | null)?.items;
    if (!Array.isArray(items)) return [];
    const out: string[] = [];
    for (const it of items) {
      const key = (it as { key?: unknown }).key;
      if (isScalar(key) && typeof key.value === "string") out.push(key.value);
      else if (typeof key === "string") out.push(key);
    }
    return out;
  }

  /**
   * Build a node, double-quoting every string a YAML 1.1 loader would re-type.
   *
   * `Document.createNode` quotes the 1.2 hazards (`true`, `null`, `3`) but leaves `off`, `on`,
   * `yes`, `no` and `2026-10-02` bare — see `coercion.ts` for the measurement. Walking the created
   * node and re-typing the hazardous scalars is what closes that gap for nested values too, so an
   * `add-transition` carrying `requires: {switch.state: "off"}` is as safe as a top-level write.
   */
  #node(value: YamlValue): unknown {
    const node: unknown = this.#doc.createNode(value);
    visit(node as Parameters<typeof visit>[0], {
      Scalar: (_key, scalar) => {
        if (typeof scalar.value === "string" && coercionHazard(scalar.value) !== null) {
          scalar.type = Scalar.QUOTE_DOUBLE;
        } else if (scalar.value === null) {
          // Write the empty value a hand-author writes — `draining:`, not `draining: null`. Both
          // load identically; only one matches the idiom of every state block already in the file,
          // and this is a format people read in a diff.
          scalar.source = "";
        }
      },
    });
    return node;
  }

  #downgrade(to: Fidelity): void {
    if (RANK[to] > RANK[this.#fidelity]) this.#fidelity = to;
    this.#system = null;
  }

  #assertEditable(): void {
    if (this.#sealed) {
      throw new Error(
        "MageDocument is sealed: it belongs to a committed revision. Edit a clone() — a revision " +
        "in the history must stay byte-identical to what was committed.");
    }
  }
}

export interface LoadResult {
  /** `null` iff the text could not be parsed into one document. */
  readonly document: MageDocument | null;
  readonly findings: readonly Finding[];
}
