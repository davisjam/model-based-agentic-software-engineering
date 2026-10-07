/**
 * Loosely-typed transaction input -> typed `Transaction`, or findings explaining why not.
 *
 * This is the first stage of the fixed pipeline (**parse** -> verify base -> apply -> validate ->
 * commit) and the only place a transaction stops being `unknown`. It checks *shape*, mirroring
 * `mage-transaction.schema.json`, because the workbench ships no JSON-Schema validator: adding one
 * for a 13-case closed union would be a dependency carrying a whole dialect for work the type
 * system already has to do at the boundary. The join is named here rather than hidden — if the
 * schema gains an op, `OP_PARSERS` below fails to compile exhaustively against `OpName`.
 *
 * Findings use the `SCHEMA` rule id, the same id `validate.py` reports shape errors under, so one
 * vocabulary reaches the user whatever rejected their input.
 */
import type { Finding, Scalar } from "../ir/types.ts";
import { NOTE_KINDS, isNoteKind } from "./types.ts";
import type { NoteDraft, Operation, OpName, Transaction } from "./types.ts";

type Obj = Readonly<Record<string, unknown>>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isScalar = (v: unknown): v is Scalar =>
  typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isInteger(v));

/** The schema's `$defs/id` pattern. An id outside it cannot address anything in a model file. */
const ID = /^[A-Za-z_][A-Za-z0-9_.[\]/-]*$/;

/**
 * The schema writes `base` as `^sha256:[0-9a-f]{64}$`, but `src/ir/hash.ts` — the landed kernel and
 * the thing that actually computes the base — emits `fnv1a64:<16 hex>`, for the reasons documented
 * there (SubtleCrypto is async and unavailable on insecure origins; this is a concurrency token,
 * not a security boundary). The kernel wins, so the check here is the general self-describing
 * shape. The schema needs the matching edit; reported, not patched — it is orchestrator-owned.
 */
const BASE = /^[a-z][a-z0-9]*:[0-9a-f]+$/;

class Shape {
  readonly findings: Finding[] = [];
  readonly where: string;
  constructor(where: string) { this.where = where; }

  bad(message: string, suffix = ""): void {
    this.findings.push({ rule: "SCHEMA", where: `${this.where}${suffix}`, message });
  }

  /** A required string; records a finding and returns null when absent or wrong-typed. */
  str(o: Obj, key: string): string | null {
    const v = o[key];
    if (typeof v === "string") return v;
    this.bad(`'${key}' is required and must be a string.`, `.${key}`);
    return null;
  }

  /** A required id-shaped string. */
  id(o: Obj, key: string): string | null {
    const v = this.str(o, key);
    if (v === null) return null;
    if (!ID.test(v) || v.length > 160) {
      this.bad(`'${key}': '${v}' is not a legal id.`, `.${key}`);
      return null;
    }
    return v;
  }

  optStr(o: Obj, key: string): string | undefined {
    const v = o[key];
    if (v === undefined) return undefined;
    if (typeof v === "string") return v;
    this.bad(`'${key}' must be a string when present.`, `.${key}`);
    return undefined;
  }

  optStrArr(o: Obj, key: string): readonly string[] | undefined {
    const v = o[key];
    if (v === undefined) return undefined;
    if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v as readonly string[];
    this.bad(`'${key}' must be an array of strings when present.`, `.${key}`);
    return undefined;
  }

  optBool(o: Obj, key: string): boolean | undefined {
    const v = o[key];
    if (v === undefined) return undefined;
    if (typeof v === "boolean") return v;
    this.bad(`'${key}' must be a boolean when present.`, `.${key}`);
    return undefined;
  }

  optObj(o: Obj, key: string): Obj | undefined {
    const v = o[key];
    if (v === undefined) return undefined;
    if (isObj(v)) return v;
    this.bad(`'${key}' must be an object when present.`, `.${key}`);
    return undefined;
  }
}

/**
 * The `note` block of `add-note`.
 *
 * Findings are located under `…note.<field>` through a nested `Shape`, so an agent is told which
 * field of which op is wrong rather than being handed the op's index and left to guess.
 *
 * Empty text is refused rather than written. Canonicalization DROPS a note whose text is empty, so
 * an op that accepted one would report a commit and store nothing — the quiet success that is worse
 * than a refusal.
 */
function noteDraft(o: Obj, parent: Shape): NoteDraft | null {
  const raw = o["note"];
  if (!isObj(raw)) {
    parent.bad("'note' is required and must be an object.", ".note");
    return null;
  }
  const s = new Shape(`${parent.where}.note`);
  const kindRaw = raw["kind"];
  const kind = typeof kindRaw === "string" && isNoteKind(kindRaw) ? kindRaw : null;
  if (kind === null) s.bad(`'kind' must be one of ${Object.keys(NOTE_KINDS).join(", ")}.`, ".kind");

  const textRaw = raw["text"];
  const text = typeof textRaw === "string" && textRaw.trim() !== "" ? textRaw : null;
  if (text === null) {
    s.bad("'text' is required and must be a non-empty string: a note with no text is dropped on load.", ".text");
  }

  const id = s.optStr(raw, "id");
  if (id !== undefined && (!ID.test(id) || id.length > 160)) {
    s.bad(`'id': '${id}' is not a legal id.`, ".id");
  }
  const draft: NoteDraft = {
    kind: kind ?? "comment", text: text ?? "",
    id, author: s.optStr(raw, "author"), at: s.optStr(raw, "at"),
  };
  parent.findings.push(...s.findings);
  return s.findings.length > 0 ? null : draft;
}

/**
 * One parser per op name. Keyed by `OpName` so the schema's closed union and this table cannot
 * drift apart without a compile error — the cheap end of A.24's "second surface of a pair".
 */
const OP_PARSERS: Readonly<Record<OpName, (o: Obj, s: Shape) => Operation | null>> = {
  "set-label": (o, s) => {
    const id = s.id(o, "id"); const value = s.str(o, "value");
    return id !== null && value !== null ? { op: "set-label", id, value } : null;
  },

  "set-property": (o, s) => {
    const id = s.id(o, "id"); const name = s.str(o, "name");
    if (id === null || name === null) return null;
    const unset = o["unset"] === true ? (true as const) : undefined;
    const raw = o["value"];
    if (unset !== undefined && raw !== undefined) {
      s.bad("'unset' and 'value' are mutually exclusive.");
      return null;
    }
    if (unset === undefined && raw === undefined) {
      s.bad("set-property needs either 'value' or 'unset: true'.");
      return null;
    }
    if (raw !== undefined && !isScalar(raw)) {
      s.bad("'value' must be a string, boolean or integer.", ".value");
      return null;
    }
    return { op: "set-property", id, name, value: isScalar(raw) ? raw : undefined, domain: s.optStr(o, "domain"), unset };
  },

  "add-entity": (o, s) => {
    const id = s.id(o, "id");
    return id === null ? null : {
      op: "add-entity", id,
      type: s.optStr(o, "type"), label: s.optStr(o, "label"), contains: s.optStrArr(o, "contains"),
    };
  },

  "delete-entity": (o, s) => {
    const id = s.id(o, "id");
    return id === null ? null : { op: "delete-entity", id, cascade: s.optBool(o, "cascade") };
  },

  "add-state": (o, s) => {
    const machine = s.id(o, "machine"); const state = s.id(o, "state");
    return machine !== null && state !== null
      ? { op: "add-state", machine, state, label: s.optStr(o, "label") }
      : null;
  },

  "delete-state": (o, s) => {
    const machine = s.id(o, "machine"); const state = s.id(o, "state");
    return machine !== null && state !== null
      ? { op: "delete-state", machine, state, cascade: s.optBool(o, "cascade") }
      : null;
  },

  "add-transition": (o, s) => {
    const machine = s.id(o, "machine"); const from = s.id(o, "from"); const to = s.id(o, "to");
    if (machine === null || from === null || to === null) return null;
    const effectsRaw = s.optObj(o, "effects");
    let effects: Record<string, string> | undefined;
    if (effectsRaw !== undefined) {
      effects = {};
      for (const [k, v] of Object.entries(effectsRaw)) {
        if (typeof v === "string") effects[k] = v;
        else s.bad(`effects.${k} must be a string expression.`, ".effects");
      }
    }
    return {
      op: "add-transition", machine, from, to,
      label: s.optStr(o, "label"), sync: s.optStr(o, "sync"),
      requires: s.optObj(o, "requires"), effects,
    };
  },

  "delete-transition": (o, s) => {
    const machine = s.id(o, "machine");
    if (machine === null) return null;
    const idxRaw = o["index"];
    let index: number | undefined;
    if (idxRaw !== undefined) {
      if (typeof idxRaw === "number" && Number.isInteger(idxRaw) && idxRaw >= 0) index = idxRaw;
      else { s.bad("'index' must be a non-negative integer.", ".index"); return null; }
    }
    return {
      op: "delete-transition", machine, index,
      from: s.optStr(o, "from"), to: s.optStr(o, "to"), sync: s.optStr(o, "sync"),
    };
  },

  "add-relation": (o, s) => {
    const model = s.id(o, "model"); const from = s.id(o, "from");
    const to = s.id(o, "to"); const type = s.id(o, "type");
    return model !== null && from !== null && to !== null && type !== null
      ? { op: "add-relation", model, from, to, type, id: s.optStr(o, "id"), label: s.optStr(o, "label") }
      : null;
  },

  "delete-relation": (o, s) => {
    const model = s.id(o, "model");
    if (model === null) return null;
    const op: Operation = {
      op: "delete-relation", model,
      id: s.optStr(o, "id"), from: s.optStr(o, "from"), to: s.optStr(o, "to"), type: s.optStr(o, "type"),
    };
    if (op.op === "delete-relation" && op.id === undefined && (op.from === undefined || op.to === undefined)) {
      s.bad("delete-relation needs 'id', or both 'from' and 'to'.");
      return null;
    }
    return op;
  },

  "set-purpose": (o, s) => {
    const id = s.id(o, "id");
    const scope = o["scope"];
    if (scope !== "model" && scope !== "machine") {
      s.bad("'scope' must be 'model' or 'machine'.", ".scope");
      return null;
    }
    return id === null ? null : {
      op: "set-purpose", scope, id,
      question: s.optStr(o, "question"),
      represents: s.optStrArr(o, "represents"),
      omits: s.optStrArr(o, "omits"),
    };
  },

  "set-description": (o, s) => {
    const id = s.id(o, "id");
    const scope = o["scope"];
    if (scope !== "model" && scope !== "machine") {
      s.bad("'scope' must be 'model' or 'machine' — the two model types that carry a description.", ".scope");
      return null;
    }
    const value = s.str(o, "value");
    return id === null || value === null ? null : { op: "set-description", scope, id, value };
  },

  "add-model": (o, s) => {
    const id = s.id(o, "id");
    return id === null ? null : {
      op: "add-model", id, label: s.optStr(o, "label"), entities: s.optStrArr(o, "entities"),
    };
  },

  "add-model-entity": (o, s) => {
    const model = s.id(o, "model"); const id = s.id(o, "id");
    return model !== null && id !== null ? { op: "add-model-entity", model, id } : null;
  },

  "delete-model": (o, s) => {
    const id = s.id(o, "id");
    return id === null ? null : { op: "delete-model", id };
  },

  "add-note": (o, s) => {
    const scope = o["scope"];
    if (scope !== "entity" && scope !== "model" && scope !== "relation") {
      s.bad("'scope' must be 'entity', 'model' or 'relation' — the three objects that carry annotation.", ".scope");
      return null;
    }
    const note = noteDraft(o, s);
    if (note === null) return null;

    if (scope !== "relation") {
      const id = s.id(o, "id");
      return id === null ? null : { op: "add-note", scope, id, note };
    }
    // A relation lives under the model that asserts it, and is addressed by its own id or by its
    // endpoints — the same two forms delete-relation takes, for the same reason: two relations may
    // share endpoints, and guessing annotates the wrong edge.
    const model = s.id(o, "model");
    if (model === null) return null;
    const id = s.optStr(o, "id");
    const from = s.optStr(o, "from");
    const to = s.optStr(o, "to");
    if (id === undefined && (from === undefined || to === undefined)) {
      s.bad("add-note on a relation needs 'id', or both 'from' and 'to'.");
      return null;
    }
    return { op: "add-note", scope, model, id, from, to, type: s.optStr(o, "type"), note };
  },

  "set-quantity-value": (o, s) => {
    const id = s.id(o, "id"); const value = s.str(o, "value");
    // Shape only. Whether the literal normalizes in the quantity's declared dimension is decided
    // where the quantity is in hand, so the refusal can quote the dimension it had to agree with.
    return id !== null && value !== null ? { op: "set-quantity-value", id, value } : null;
  },

  "set-entity-type": (o, s) => {
    const id = s.id(o, "id"); const value = s.str(o, "value");
    return id !== null && value !== null ? { op: "set-entity-type", id, value } : null;
  },

  "save-query": (o, s) => {
    const id = s.id(o, "id");
    const query = s.optObj(o, "query");
    if (query === undefined) s.bad("'query' is required and must be an object.", ".query");
    return id !== null && query !== undefined ? { op: "save-query", id, query } : null;
  },

  "delete-query": (o, s) => {
    const id = s.id(o, "id");
    return id === null ? null : { op: "delete-query", id };
  },
};

const isOpName = (v: unknown): v is OpName => typeof v === "string" && v in OP_PARSERS;

/**
 * Every op this parser implements. Exported so a test can read the op names out of
 * `mage-transaction.schema.json` and compare, rather than carrying a hand-copied list that drifts
 * the first time the schema gains an op (rule #42: look the value up, never snapshot it).
 */
export const OP_NAMES: readonly OpName[] = Object.keys(OP_PARSERS) as readonly OpName[];

export interface ParsedTransaction {
  /** `null` iff the input does not conform; `findings` then says where. */
  readonly transaction: Transaction | null;
  readonly findings: readonly Finding[];
}

/** Stage 1 of the pipeline. Accepts the `{ transaction: { … } }` envelope the schema defines. */
export function parseTransaction(input: unknown): ParsedTransaction {
  const top = new Shape("transaction");
  if (!isObj(input)) {
    top.bad("a transaction must be an object.");
    return { transaction: null, findings: top.findings };
  }
  // Accept the envelope, or a bare transaction body — an agent that posts the inner object is
  // making a clerical mistake, not a semantic one, and the pipeline has better things to refuse.
  const body = isObj(input["transaction"]) ? input["transaction"] : input;

  const base = top.str(body, "base");
  if (base !== null && !BASE.test(base)) {
    top.bad(`'base' must look like '<algorithm>:<hex>'; got '${base}'.`, ".base");
  }
  const target = top.optStr(body, "target") ?? "main";
  const rationale = top.optStr(body, "rationale") ?? null;

  const semantics = top.optObj(body, "semantics");
  if (semantics !== undefined && semantics["atomic"] !== undefined && semantics["atomic"] !== true) {
    // The schema pins this to `const: true` precisely so a non-atomic mode cannot appear quietly.
    top.bad("semantics.atomic must be true: v0.1 has no non-atomic mode.", ".semantics.atomic");
  }

  const rawOps = body["operations"];
  const operations: Operation[] = [];
  if (!Array.isArray(rawOps) || rawOps.length === 0) {
    top.bad("'operations' must be a non-empty array.", ".operations");
  } else {
    rawOps.forEach((raw, i) => {
      const s = new Shape(`transaction.operations[${i}]`);
      if (!isObj(raw)) { s.bad("an operation must be an object."); top.findings.push(...s.findings); return; }
      const name = raw["op"];
      if (!isOpName(name)) {
        s.bad(`unknown op '${String(name)}'. Ids are immutable (V2), so there is no rename op — ` +
              `use set-label for the label, or delete plus add to change identity.`, ".op");
        top.findings.push(...s.findings);
        return;
      }
      const parsed = OP_PARSERS[name](raw, s);
      top.findings.push(...s.findings);
      if (parsed !== null) operations.push(parsed);
    });
  }

  if (top.findings.length > 0 || base === null) return { transaction: null, findings: top.findings };
  return { transaction: { base, target, rationale, operations }, findings: [] };
}
