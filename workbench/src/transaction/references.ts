/**
 * Who still points at this id.
 *
 * One function serves both halves of the `cascade` contract, which is why it exists rather than
 * two near-identical scans (rule #11): without `cascade`, a delete **fails** and these references
 * are the explanation; with `cascade`, these references are the work list. A dangling reference is
 * never created silently in either direction.
 *
 * Whole-system validation would catch *most* of this anyway — V3 fires on a relation pointing at a
 * missing entity, V6 on a machine's `entity:`, V10 on a transition's `from`/`to`. Doing it here
 * regardless buys two things validation cannot: a message that names the site to edit rather than
 * a rule number, and the removal instruction `cascade` needs.
 *
 * It also closes a real gap. A guard `requires: {worker.state: held}` tests another machine's
 * control state by *value*, and no V-rule checks a guard's value against the referenced machine's
 * declared states — so deleting state `held` would leave a guard that can never hold, and
 * validation would pass. That reference is reported here and marked `blocked`, because neither
 * dropping the guard nor dropping the transition is a mechanical repair: both change what the model
 * asserts, so the author has to say which they meant.
 */
import type { CanonicalSystem } from "../ir/types.ts";
import type { Path } from "../yaml/document.ts";

/** How `cascade` would remove a reference, or why it cannot. */
export type Removal =
  /** Delete a map entry or an optional scalar field outright. */
  | { readonly kind: "delete-key"; readonly path: Path }
  /** Drop every item of the sequence at `path` that matches. */
  | { readonly kind: "drop-seq-item"; readonly path: Path; readonly match: SeqMatch }
  /** Cascade is not a mechanical repair here; the author must decide. */
  | { readonly kind: "blocked"; readonly reason: string };

export type SeqMatch =
  /** A sequence of plain scalars, e.g. `contains: [parser, repair-engine]`. */
  | { readonly kind: "scalar"; readonly value: string }
  /** A sequence of maps; matches an item whose every listed field is equal. */
  | { readonly kind: "fields"; readonly fields: Readonly<Record<string, string>> };

export interface Reference {
  readonly kind:
    | "relation" | "model-entity" | "containment" | "machine-entity"
    | "transition-endpoint" | "machine-initial" | "guard" | "event-participant"
    | "model-relation";
  /** Dotted site, in the author's terms: `models.service-flow.relations`. */
  readonly where: string;
  readonly message: string;
  readonly removal: Removal;
}

/** Every site that would dangle if entity `id` disappeared. */
export function entityReferences(s: CanonicalSystem, id: string): readonly Reference[] {
  const out: Reference[] = [];

  for (const r of s.relations) {
    for (const [side, value] of [["from", r.from], ["to", r.to]] as const) {
      if (value !== id) continue;
      out.push({
        kind: "relation",
        where: `models.${r.model}.relations`,
        message: `relation ${r.id ?? `${r.from} -${r.type}-> ${r.to}`} has ${side}: '${id}'.`,
        removal: {
          kind: "drop-seq-item",
          path: ["models", r.model, "relations"],
          match: { kind: "fields", fields: { from: r.from, to: r.to, type: r.type } },
        },
      });
    }
  }

  for (const m of s.models.values()) {
    if (!m.entities.includes(id)) continue;
    out.push({
      kind: "model-entity",
      where: `models.${m.id}.entities`,
      message: `model '${m.id}' lists '${id}'.`,
      removal: { kind: "drop-seq-item", path: ["models", m.id, "entities"], match: { kind: "scalar", value: id } },
    });
  }

  for (const e of s.entities.values()) {
    if (!e.contains.includes(id)) continue;
    out.push({
      kind: "containment",
      where: `entities.${e.id}.contains`,
      message: `entity '${e.id}' contains '${id}'.`,
      removal: { kind: "drop-seq-item", path: ["entities", e.id, "contains"], match: { kind: "scalar", value: id } },
    });
  }

  for (const m of s.machines.values()) {
    if (m.entity !== id) continue;
    out.push({
      kind: "machine-entity",
      where: `machines.${m.id}.entity`,
      message: `machine '${m.id}' declares correspondence to entity '${id}' (V6).`,
      // Correspondence is optional (SEMANTICS §2), so dropping the field leaves a legal machine.
      removal: { kind: "delete-key", path: ["machines", m.id, "entity"] },
    });
  }

  return out;
}

/**
 * What a model still asserts, and would take with it.
 *
 * Relations only, and every one is `blocked` — which is why `delete-model` has no `cascade` field to
 * offer. `CanonicalSystem.relations` is flattened across every model and carries its owning model,
 * and the flattening is deliberate: an architectural claim must not be escapable by moving an edge
 * to another model. A relation is therefore not a pointer AT the model that a cascade could tidy
 * away; it is a claim the model makes. Deleting that claim and declining to delete it assert
 * different things, exactly as they do for a guard on a deleted state, so the author says which.
 *
 * A model's entities need no entry: entities are system-level and models reference rather than
 * redeclare them (V3), so a deleted model leaves every entity standing.
 */
export function modelReferences(s: CanonicalSystem, id: string): readonly Reference[] {
  const out: Reference[] = [];
  for (const r of s.relations) {
    if (r.model !== id) continue;
    out.push({
      kind: "model-relation",
      where: `models.${id}.relations`,
      message: `this model asserts ${r.id ?? `${r.from} -${r.type}-> ${r.to}`}.`,
      // Terse on purpose: the refusal repeats this once per relation, and the reasoning belongs in
      // this module's doc comment rather than three times in one sentence a user has to read.
      removal: {
        kind: "blocked",
        reason: "Delete that relation explicitly, in this transaction if you like — a claim must not " +
                "disappear as a side effect.",
      },
    });
  }
  return out;
}

/** Every site that would dangle if `state` disappeared from `machine`. */
export function stateReferences(s: CanonicalSystem, machine: string, state: string): readonly Reference[] {
  const out: Reference[] = [];
  const m = s.machines.get(machine);
  if (m === undefined) return out;

  if (m.initial === state) {
    out.push({
      kind: "machine-initial",
      where: `machines.${machine}.initial`,
      message: `'${state}' is the initial state of '${machine}' (V9).`,
      removal: {
        kind: "blocked",
        reason: "a machine must have an initial state; set a different one before deleting this.",
      },
    });
  }

  for (const t of m.transitions) {
    for (const [side, value] of [["from", t.from], ["to", t.to]] as const) {
      if (value !== state) continue;
      out.push({
        kind: "transition-endpoint",
        where: `machines.${machine}.transitions[${t.index}]`,
        message: `transition ${t.index} has ${side}: '${state}' (V10).`,
        removal: {
          kind: "drop-seq-item",
          path: ["machines", machine, "transitions"],
          // Matched by endpoints rather than by index: cascade may drop several, and indices shift.
          match: { kind: "fields", fields: { from: t.from, to: t.to } },
        },
      });
    }
  }

  // Guards test another machine's control state BY VALUE, and no V-rule checks that value against
  // the declared state set. Without this the delete would pass validation and leave a guard that
  // can never hold -- a model that is wrong rather than invalid, which is the worse failure.
  for (const other of s.machines.values()) {
    for (const t of other.transitions) {
      for (const g of t.guards) {
        if (g.ref !== `${machine}.state` || g.value !== state) continue;
        out.push({
          kind: "guard",
          where: `machines.${other.id}.transitions[${t.index}].requires`,
          message: `guard '${g.ref} ${g.op} ${String(g.value)}' tests '${state}'.`,
          removal: {
            kind: "blocked",
            reason: "cascade cannot repair a guard on a deleted state: dropping the guard and " +
                    "dropping the transition assert different things. Rewrite the transition.",
          },
        });
      }
    }
  }

  return out;
}

/** The references `cascade` cannot mechanically repair. Non-empty means refuse even with cascade. */
export const blocked = (refs: readonly Reference[]): readonly Reference[] =>
  refs.filter((r) => r.removal.kind === "blocked");
