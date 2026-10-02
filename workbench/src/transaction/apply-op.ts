/**
 * One operation -> edits on a candidate document.
 *
 * Stage 3 of the fixed pipeline. Every function here edits a **clone**; the engine owns that
 * discipline and `MageDocument.seal()` enforces it, so a failure part-way through a multi-op
 * transaction costs the clone and nothing else. That is what "any failure leaves the current system
 * byte-identical" means operationally: there is no rollback path to get wrong, because the thing
 * being edited was never the live document.
 *
 * Operations apply in order and each sees its predecessors' effects — `doc.system()` is recomputed
 * after every edit because the IR cache invalidates. An op that targets something an earlier op in
 * the same transaction created therefore works, which is what makes delete-plus-add a usable
 * substitute for the rename op V2 forbids.
 */
import type { Finding, Scalar } from "../ir/types.ts";
import { MageDocument } from "../yaml/document.ts";
import type { Path, YamlValue } from "../yaml/document.ts";
import { blocked, entityReferences, stateReferences } from "./references.ts";
import type { Reference, SeqMatch } from "./references.ts";
import type { Operation } from "./types.ts";

export interface OpFailure {
  readonly where: string;
  readonly message: string;
  readonly findings: readonly Finding[];
}

const fail = (where: string, message: string, findings: readonly Finding[] = []): OpFailure =>
  ({ where, message, findings: findings.length > 0 ? findings : [{ rule: "TRANSACTION", where, message }] });

/** Strip `undefined` so an omitted optional does not land in the file as an explicit null. */
function compact(o: Readonly<Record<string, YamlValue | undefined>>): Record<string, YamlValue> {
  const out: Record<string, YamlValue> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out;
}

const isRecord = (v: unknown): v is Readonly<Record<string, unknown>> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Does a sequence item match a cascade/delete predicate. */
function itemMatches(item: unknown, match: SeqMatch): boolean {
  if (match.kind === "scalar") return item === match.value;
  if (!isRecord(item)) return false;
  return Object.entries(match.fields).every(([k, v]) => item[k] === v);
}

/** Apply every mechanical removal in `refs`. Blocked ones must have been refused before this. */
function applyCascade(doc: MageDocument, refs: readonly Reference[]): void {
  for (const r of refs) {
    if (r.removal.kind === "delete-key") doc.deleteIn(r.removal.path);
    else if (r.removal.kind === "drop-seq-item") {
      const { path, match } = r.removal;
      doc.dropSeqItems(path, (item) => itemMatches(item, match));
    }
    // `blocked` is unreachable: the caller refuses the transaction when any reference is blocked.
  }
}

/**
 * Refuse-or-cascade, shared by `delete-entity` and `delete-state`.
 *
 * Without `cascade` a non-empty reference list is a refusal naming every site — a dangling
 * reference is never created silently. With `cascade` the mechanical removals run, but a *blocked*
 * reference still refuses: `cascade` means "remove what points at this", not "guess what I meant".
 */
function resolveDelete(
  doc: MageDocument, where: string, subject: string,
  refs: readonly Reference[], cascade: boolean,
): OpFailure | null {
  const hard = blocked(refs);
  if (hard.length > 0) {
    return fail(where,
      `cannot delete ${subject}: ${hard.map((r) => `${r.where} — ${r.message} ${(r.removal as { reason: string }).reason}`).join("; ")}`,
      hard.map((r) => ({ rule: "TRANSACTION", where: r.where, message: `${r.message} ${(r.removal as { reason: string }).reason}` })));
  }
  if (!cascade && refs.length > 0) {
    return fail(where,
      `cannot delete ${subject}: ${refs.length} reference(s) remain — ` +
      `${refs.map((r) => r.where).join(", ")}. Pass cascade: true to remove them, or remove them explicitly.`,
      refs.map((r) => ({ rule: "TRANSACTION", where: r.where, message: r.message })));
  }
  if (cascade) applyCascade(doc, refs);
  return null;
}

/** Index of the single sequence item matching `fields`, or a failure naming the ambiguity. */
function uniqueIndex(
  doc: MageDocument, path: Path, where: string, subject: string,
  fields: Readonly<Record<string, string | undefined>>,
): number | OpFailure {
  const seq = doc.get(path);
  if (!Array.isArray(seq)) return fail(where, `${subject}: ${path.join(".")} is not a sequence.`);
  const given = Object.entries(fields).filter((e): e is [string, string] => e[1] !== undefined);
  const hits: number[] = [];
  seq.forEach((item, i) => {
    if (isRecord(item) && given.every(([k, v]) => item[k] === v)) hits.push(i);
  });
  const described = given.map(([k, v]) => `${k}: ${v}`).join(", ");
  if (hits.length === 0) return fail(where, `${subject}: nothing matches ${described}.`);
  if (hits.length > 1) {
    return fail(where,
      `${subject}: ${hits.length} items match ${described} (indices ${hits.join(", ")}). ` +
      `Nondeterminism makes duplicates legal, so address one by 'index'.`);
  }
  return hits[0] as number;
}

/** Namespaces `set-label` may address, searched in this order. */
const LABELLED: readonly (readonly [string, string])[] = [
  ["entities", "entity"], ["models", "model"], ["machines", "machine"],
];

// ----------------------------------------------------------------------------------------------

export function applyOperation(doc: MageDocument, op: Operation, index: number): OpFailure | null {
  const where = `transaction.operations[${index}]`;

  switch (op.op) {
    case "set-label": {
      // The schema gives set-label a bare `id` with no `scope`, unlike set-purpose. Entities and
      // machines are separate namespaces (SEMANTICS §2 — "machines are not entities"), so one id
      // can legally name both and the op is then genuinely ambiguous. Refusing beats picking.
      const found = LABELLED.filter(([ns]) => doc.has([ns, op.id]));
      const first = found[0];
      if (first === undefined) {
        return fail(where, `set-label: no entity, model or machine named '${op.id}'.`);
      }
      if (found.length > 1) {
        return fail(where,
          `set-label: '${op.id}' names both a ${found.map(([, n]) => n).join(" and a ")}; the op cannot ` +
          `say which. Rename one, or extend the schema's set-label with a 'scope' like set-purpose has.`);
      }
      doc.setScalar([first[0], op.id, "label"], op.value);
      return null;
    }

    case "set-property": {
      if (!doc.has(["entities", op.id])) return fail(where, `set-property: no entity '${op.id}'.`);
      const path: Path = ["entities", op.id, "properties", op.name];
      if (op.unset === true) {
        if (!doc.deleteIn(path)) {
          return fail(where, `set-property unset: entity '${op.id}' has no property '${op.name}'.`);
        }
        return null;
      }
      const value = op.value as Scalar;
      const existing = doc.get(path);
      if (op.domain !== undefined) {
        doc.setIn(path, { value, domain: op.domain });
      } else if (isRecord(existing) && "value" in existing) {
        // Keep the declared domain: a value-only write must not silently untype a property that
        // `classification > accepts` depends on being comparable (V20).
        doc.setScalar([...path, "value"], value);
      } else {
        doc.setScalar(path, value);
      }
      return null;
    }

    case "add-entity": {
      if (doc.has(["entities", op.id])) return fail(where, `add-entity: '${op.id}' already exists; ids are immutable (V2).`);
      doc.setIn(["entities", op.id], compact({
        type: op.type, label: op.label, contains: op.contains === undefined ? undefined : [...op.contains],
      }));
      return null;
    }

    case "delete-entity": {
      if (!doc.has(["entities", op.id])) return fail(where, `delete-entity: no entity '${op.id}'.`);
      const refs = entityReferences(doc.system(), op.id);
      const refused = resolveDelete(doc, where, `entity '${op.id}'`, refs, op.cascade === true);
      if (refused !== null) return refused;
      doc.deleteIn(["entities", op.id]);
      return null;
    }

    case "add-state": {
      if (!doc.has(["machines", op.machine])) return fail(where, `add-state: no machine '${op.machine}'.`);
      if (doc.has(["machines", op.machine, "states", op.state])) {
        return fail(where, `add-state: '${op.machine}' already has state '${op.state}'.`);
      }
      doc.setIn(["machines", op.machine, "states", op.state],
        op.label === undefined ? null : { label: op.label });
      return null;
    }

    case "delete-state": {
      if (!doc.has(["machines", op.machine, "states", op.state])) {
        return fail(where, `delete-state: '${op.machine}' has no state '${op.state}'.`);
      }
      const refs = stateReferences(doc.system(), op.machine, op.state);
      const refused = resolveDelete(doc, where, `state '${op.machine}.${op.state}'`, refs, op.cascade === true);
      if (refused !== null) return refused;
      doc.deleteIn(["machines", op.machine, "states", op.state]);
      return null;
    }

    case "add-transition": {
      if (!doc.has(["machines", op.machine])) return fail(where, `add-transition: no machine '${op.machine}'.`);
      doc.pushIn(["machines", op.machine, "transitions"], compact({
        from: op.from, to: op.to, label: op.label,
        // `sync`, never `on`: a bare `on` key is boolean `true` to a YAML 1.1 loader (§10.1).
        sync: op.sync,
        requires: op.requires as YamlValue | undefined,
        effects: op.effects as YamlValue | undefined,
      }));
      return null;
    }

    case "delete-transition": {
      const path: Path = ["machines", op.machine, "transitions"];
      const seq = doc.get(path);
      if (!Array.isArray(seq)) return fail(where, `delete-transition: '${op.machine}' has no transitions.`);
      let idx: number;
      if (op.index !== undefined) {
        if (op.index >= seq.length) {
          return fail(where, `delete-transition: index ${op.index} is out of range (${seq.length} transitions).`);
        }
        idx = op.index;
      } else {
        const found = uniqueIndex(doc, path, where, "delete-transition",
          { from: op.from, to: op.to, sync: op.sync });
        if (typeof found !== "number") return found;
        idx = found;
      }
      doc.deleteIn([...path, idx]);
      return null;
    }

    case "add-relation": {
      if (!doc.has(["models", op.model])) return fail(where, `add-relation: no model '${op.model}'.`);
      doc.pushIn(["models", op.model, "relations"], compact({
        id: op.id, from: op.from, to: op.to, type: op.type, label: op.label,
      }));
      return null;
    }

    case "delete-relation": {
      const path: Path = ["models", op.model, "relations"];
      const found = op.id !== undefined
        ? uniqueIndex(doc, path, where, "delete-relation", { id: op.id })
        : uniqueIndex(doc, path, where, "delete-relation", { from: op.from, to: op.to, type: op.type });
      if (typeof found !== "number") return found;
      doc.deleteIn([...path, found]);
      return null;
    }

    case "set-purpose": {
      const ns = op.scope === "model" ? "models" : "machines";
      if (!doc.has([ns, op.id])) return fail(where, `set-purpose: no ${op.scope} '${op.id}'.`);
      if (op.question !== undefined) doc.setScalar([ns, op.id, "purpose", "question"], op.question);
      if (op.represents !== undefined) doc.setIn([ns, op.id, "purpose", "represents"], [...op.represents]);
      // `omits` is checked against the model's real vocabulary by V24 at the validation stage, so a
      // declaration the model contradicts fails the transaction rather than becoming prose that lies.
      if (op.omits !== undefined) doc.setIn([ns, op.id, "purpose", "omits"], [...op.omits]);
      return null;
    }

    case "save-query":
      doc.setIn(["queries", op.id], op.query as YamlValue);
      return null;

    case "delete-query": {
      if (!doc.deleteIn(["queries", op.id])) return fail(where, `delete-query: no saved query '${op.id}'.`);
      return null;
    }
  }
}
