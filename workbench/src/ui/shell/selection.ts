/**
 * What kind of thing is selected — one answer, shared by the panes that branch on it.
 *
 * The inspector already resolves a selection to a full `Inspection`, and that is the right shape
 * for RENDERING one. It is the wrong shape for DECIDING: the contextual action bar and the command
 * palette need only the kind, they need it for a selection that may not resolve, and asking for a
 * whole inspection to read its discriminator would couple the editing wave to the inspector's
 * rendering decisions. So the classification is its own function, in its own module, and both use
 * it — extracted on the second site rather than copied there.
 *
 * **The encoding is the one the shell already had.** `ViewState.selection` is untyped ids, widened
 * internally by prefix (`rel:`, `model:`, `machine:`, `state:`, `entity:`) because a legal id
 * cannot contain a colon; a bare name is an entity, then a machine, then a model, which is the
 * precedence `inspector.ts` established and the agent API's examples assume.
 *
 * `unresolved` is a member on purpose and is NOT folded into `none`. A transaction can delete the
 * selected element and an agent can select a misspelling; reporting either as "nothing is selected"
 * describes the pane instead of the model, and it would make the action bar offer the additive
 * operations as though the user had deliberately cleared their selection.
 */
import { parseElementValue, parseRelationValue } from "../view-model.ts";
import type { CanonicalSystem } from "../../ir/types.ts";

export type SelectionKind =
  | "none" | "entity" | "relation" | "model" | "machine" | "state" | "unresolved";

export function selectionKind(system: CanonicalSystem, selection: readonly string[]): SelectionKind {
  const first = selection[0];
  if (first === undefined || first === "") return "none";

  if (first.startsWith("rel:")) {
    const ref = parseRelationValue(first);
    if (ref === null) return "unresolved";
    const found = system.relations.some((r) =>
      r.model === ref.model
      && (ref.kind === "id"
        ? r.id === ref.id
        : r.from === ref.from && r.to === ref.to && r.type === ref.type));
    return found ? "relation" : "unresolved";
  }
  if (first.startsWith("state:")) {
    const ref = parseElementValue(first);
    if (ref === null || ref.kind !== "state") return "unresolved";
    return system.machines.get(ref.machine)?.states.includes(ref.state) === true ? "state" : "unresolved";
  }
  if (first.startsWith("entity:")) {
    const ref = parseElementValue(first);
    if (ref === null || ref.kind !== "entity") return "unresolved";
    return system.entities.has(ref.id) ? "entity" : "unresolved";
  }
  const colon = first.indexOf(":");
  if (colon !== -1) {
    const kind = first.slice(0, colon);
    const id = first.slice(colon + 1);
    if (kind === "model") return system.models.has(id) ? "model" : "unresolved";
    if (kind === "machine") return system.machines.has(id) ? "machine" : "unresolved";
    return "unresolved";
  }
  if (system.entities.has(first)) return "entity";
  if (system.machines.has(first)) return "machine";
  if (system.models.has(first)) return "model";
  return "unresolved";
}
