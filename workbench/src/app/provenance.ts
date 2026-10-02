/**
 * Provenance, collected from the authoritative IR.
 *
 * One derivation, two readers. `Workspace.provenance()` hands these records to `window.mage` and to
 * the Provenance section, so the capability registry's "both interfaces invoke the same service"
 * holds by construction rather than by inspection.
 *
 * **The `prompt` field is why the feature exists**, so it leaves this module separated from the
 * rest rather than mixed into a label/value list. With an agent-authored model a reader's real
 * question is *why does this object have this shape, and what was the author asked to preserve?* —
 * and reading the model answers it nowhere. A prompt buried as the first row of a metadata table is
 * a prompt nobody finds.
 *
 * **Reading provenance cannot change a result (UX-I6 / invariant A1).** Everything here is a pure
 * function of a `CanonicalSystem`, `systemHash` excludes annotation entirely, and no caller is given
 * a way to write. The invariant is held by the shape of this module, not by a rule anyone has to
 * remember.
 */
import type { Annotated, CanonicalSystem, Provenance } from "../ir/types.ts";

export interface ProvenanceField {
  readonly label: string;
  readonly value: string;
}

/** What kind of object recorded its origin. The three the IR gives an `annotation` field. */
export type ProvenanceSubject = "entity" | "model" | "relation";

export interface ProvenanceRecord {
  /** `model:event-flow` — stable, so an agent can join a record back to the object. */
  readonly object: string;
  readonly kind: ProvenanceSubject;
  readonly label: string;
  /** Rendered as the headline. Null when the source recorded no prompt. */
  readonly prompt: string | null;
  /** Creator, timestamp, rationale and history, in reading order. */
  readonly fields: readonly ProvenanceField[];
  /**
   * The source declares provenance and the IR could read nothing out of it. Reported rather than
   * dropped: "this object records where it came from, in a spelling we do not understand" is a
   * different fact from "this object records nothing".
   */
  readonly unreadable: boolean;
}

const PROMPT_LABEL = "Asked for";

/** Everything except the prompt, in the order a reader wants it. */
function remainingFields(p: Provenance): readonly ProvenanceField[] {
  const fields: ProvenanceField[] = [];
  if (p.rationale !== null) fields.push({ label: "Rationale", value: p.rationale });
  if (p.createdBy !== null) fields.push({ label: "Created by", value: p.createdBy });
  if (p.createdAt !== null) fields.push({ label: "Created at", value: p.createdAt });
  for (const h of p.history) {
    const parts = [h.actor, h.action, h.prompt === null ? null : `asked: ${h.prompt}`, h.revision, h.at]
      .filter((s): s is string => s !== null && s !== "");
    if (parts.length > 0) fields.push({ label: "History", value: parts.join(" · ") });
  }
  return fields;
}

/**
 * Provenance as one flat list, prompt first.
 *
 * The inspector's per-row block reads this; the Provenance section reads `collectProvenance`. Both
 * orderings come from here, so the prompt cannot lead in one surface and trail in the other.
 */
export function provenanceFields(p: Provenance): {
  readonly fields: readonly ProvenanceField[];
  readonly unreadable: boolean;
} {
  const rest = remainingFields(p);
  const fields = p.prompt === null ? rest : [{ label: PROMPT_LABEL, value: p.prompt }, ...rest];
  return { fields, unreadable: fields.length === 0 };
}

function record(kind: ProvenanceSubject, id: string, label: string, a: Annotated): ProvenanceRecord | null {
  const p = a.provenance;
  if (p === null) return null;
  const fields = remainingFields(p);
  return {
    object: `${kind}:${id}`,
    kind,
    label,
    prompt: p.prompt,
    fields,
    unreadable: p.prompt === null && fields.length === 0,
  };
}

/**
 * Every object in the system that records where it came from.
 *
 * Models lead, then entities, then relations: a reader asking why the system has this shape is
 * asking about its purposeful models first. Machines are absent because `CanonMachine` carries no
 * `annotation` field — the shipped examples put a machine's rationale on the entity the machine
 * models, which is the workaround an annotation slot on the machine would retire.
 */
export function collectProvenance(system: CanonicalSystem): readonly ProvenanceRecord[] {
  const out: ProvenanceRecord[] = [];
  for (const m of system.models.values()) {
    const r = record("model", m.id, m.label, m.annotation);
    if (r !== null) out.push(r);
  }
  for (const e of system.entities.values()) {
    const r = record("entity", e.id, e.label, e.annotation);
    if (r !== null) out.push(r);
  }
  for (const [i, rel] of system.relations.entries()) {
    const id = rel.id ?? `relation-${i}`;
    const r = record("relation", id, `${rel.from} → ${rel.to} (${rel.type})`, rel.annotation);
    if (r !== null) out.push(r);
  }
  return out;
}
