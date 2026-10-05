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
import { blocked, entityReferences, modelReferences, stateReferences } from "./references.ts";
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
 * The refusal for references no cascade can mechanically repair, or null when there are none.
 *
 * Separate from `resolveDelete` because `delete-model` needs this half and not the other: every
 * reference `modelReferences` reports is blocked, so offering a `cascade` would be offering a
 * repair that does not exist. Sharing the formatting keeps one phrasing of "cannot delete X".
 */
function refuseBlocked(where: string, subject: string, refs: readonly Reference[]): OpFailure | null {
  const hard = blocked(refs);
  if (hard.length === 0) return null;
  const reason = (r: Reference): string => `${r.message} ${(r.removal as { reason: string }).reason}`;
  return fail(where,
    `cannot delete ${subject}: ${hard.map((r) => `${r.where} — ${reason(r)}`).join("; ")}`,
    hard.map((r) => ({ rule: "TRANSACTION", where: r.where, message: reason(r) })));
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
  const hard = refuseBlocked(where, subject, refs);
  if (hard !== null) return hard;
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

/**
 * Where the object an `add-note` addresses lives in the document.
 *
 * Returns a tagged union rather than `Path | OpFailure`: a `Path` IS an array, so the two cases
 * cannot be told apart by shape without a tag that says which.
 */
function noteTarget(
  doc: MageDocument, op: Extract<Operation, { op: "add-note" }>, where: string,
): { readonly path: Path } | { readonly failure: OpFailure } {
  if (op.scope !== "relation") {
    const ns = op.scope === "entity" ? "entities" : "models";
    // `id` is required for these two scopes at the parse stage; checked again because the type
    // permits its absence and a thrown error here would be the one failure mode the pipeline bans.
    if (op.id === undefined || !doc.has([ns, op.id])) {
      return { failure: fail(where, `add-note: no ${op.scope} '${op.id ?? ""}'.`) };
    }
    return { path: [ns, op.id] };
  }
  if (op.model === undefined || !doc.has(["models", op.model])) {
    return { failure: fail(where, `add-note: no model '${op.model ?? ""}' to look for the relation in.`) };
  }
  const path: Path = ["models", op.model, "relations"];
  const found = op.id !== undefined
    ? uniqueIndex(doc, path, where, "add-note", { id: op.id })
    : uniqueIndex(doc, path, where, "add-note", { from: op.from, to: op.to, type: op.type });
  return typeof found === "number" ? { path: [...path, found] } : { failure: found };
}

/** Note ids already in use at a target, so a new note cannot shadow one a finding cites. */
function noteIds(existing: readonly unknown[]): ReadonlySet<string> {
  const out = new Set<string>();
  for (const n of existing) {
    if (isRecord(n) && typeof n["id"] === "string") out.add(n["id"]);
  }
  return out;
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

    case "add-model": {
      if (doc.has(["models", op.id])) {
        return fail(where, `add-model: '${op.id}' already exists; ids are immutable (V2).`);
      }
      // `type: graph` is written rather than asked for: it is the only model type the schema
      // allows, so a field for it would be a question with one answer.
      //
      // No purpose block here. `set-purpose` owns question/represents/omits, and a model with no
      // question is a container rather than a reduction — so send the two ops in one transaction
      // and atomicity makes them indivisible. Unknown entity ids are V3's at the validation stage,
      // the same way add-relation leaves its endpoints to V3.
      doc.setIn(["models", op.id], compact({
        type: "graph", label: op.label,
        entities: op.entities === undefined ? undefined : [...op.entities],
      }));
      return null;
    }

    case "add-model-entity": {
      if (!doc.has(["models", op.model])) return fail(where, `add-model-entity: no model '${op.model}'.`);
      const path: Path = ["models", op.model, "entities"];
      const listed = doc.get(path);
      if (Array.isArray(listed) && listed.includes(op.id)) {
        return fail(where,
          `add-model-entity: '${op.id}' is already a member of model '${op.model}'. A membership is a ` +
          `set, so a second entry would make the model's own reduction ambiguous to read.`);
      }
      // `pushIn` creates the sequence when the model declares none, which is the ordinary case for
      // a model authored with relations and no `entities:` block. The id is NOT checked against the
      // entity table here: the op's target is the MODEL, and resolving a reference is stage 4's
      // subject — V3 fires on `models.<id>.entities`, the field this writes, exactly as it does for
      // an id `add-model` was handed at creation.
      doc.pushIn(path, op.id);
      return null;
    }

    case "delete-model": {
      if (!doc.has(["models", op.id])) return fail(where, `delete-model: no model '${op.id}'.`);
      const refused = refuseBlocked(where, `model '${op.id}'`, modelReferences(doc.system(), op.id));
      if (refused !== null) return refused;
      // A view is presentation: it sits outside the IR and outside the hash, so dropping its
      // mention of a model that no longer exists asserts nothing and is done here. A relation is a
      // claim, which is why one is pruned quietly and the other refuses above.
      for (const view of doc.keysAt(["views"])) {
        doc.dropSeqItems(["views", view, "models"], (item) => item === op.id);
      }
      doc.deleteIn(["models", op.id]);
      return null;
    }

    case "add-note": {
      const target = noteTarget(doc, op, where);
      if ("failure" in target) return target.failure;

      const existing = doc.get([...target.path, "notes"]);
      const notes = Array.isArray(existing) ? existing : [];
      const taken = noteIds(notes);
      let id = op.note.id;
      if (id === undefined) {
        // Deterministic from the document, so the same transaction against the same system writes
        // the same bytes. Skips a taken name rather than overwriting one.
        let n = notes.length + 1;
        while (taken.has(`note-${n}`)) n += 1;
        id = `note-${n}`;
      } else if (taken.has(id)) {
        return fail(where,
          `add-note: '${target.path.join(".")}' already carries a note with id '${id}'. A note id is ` +
          `how an ANNOTATION finding addresses one, so two of them would name the same site.`);
      }
      // Only a note's own keys are written, in the order the files already use. `unexpectedKeys` and
      // the ANNOTATION rule exist for hand-written notes a YAML comma truncated; an op has no
      // excuse to produce one, and the parser refuses a stray key rather than writing it.
      doc.pushIn([...target.path, "notes"], compact({
        id, kind: op.note.kind, text: op.note.text, author: op.note.author, at: op.note.at,
      }));
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
