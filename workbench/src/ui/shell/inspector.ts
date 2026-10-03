/**
 * The `inspector` region: whatever is selected, and nothing else.
 *
 * Correction 3 is this region's reason to exist — the enormous global Entities and Relations tables
 * are useful inspection surfaces and a terrible home page, so a user asks for rich semantics by
 * selecting the thing they concern. Wave 1b builds that: selection resolves to an entity, relation,
 * model or machine, and the inspector shows its type, properties, relations, appears-in and
 * disclosed notes and provenance.
 *
 * **Wave 0 lands it empty on purpose, and the emptiness is honest rather than lazy.** There is no
 * selection-driven inspection on the flat page at all, so there is no behaviour to move here; what
 * wave 0 owes the later wave is a named region nobody else is editing. The region therefore reports
 * the one fact it can know — whether anything is selected — and says where the facts live meanwhile.
 * Rendering blank would read as a broken pane.
 *
 * It reads `viewState.selection`, which is already authoritative and already agent-writable
 * (`window.mage.view.select`), so wave 1b inherits a region that is wired to the right state.
 */
import { byId, mountIf } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { regionHost } from "./surfaces.ts";

export function mountInspector(ctx: ShellContext): ShellRegion {
  const region = regionHost("inspector");
  const body = byId("inspector-body");

  return {
    paint: (frame: ShellFrame) => {
      mountIf(region, frame.state.loaded);
      const selection = ctx.viewState.selection;
      body.textContent = selection.length === 0
        ? "Nothing is selected. Selecting an object will show its type, properties, relations and "
          + "the models it appears in."
        : `${selection.join(", ")} — selected. The per-object inspection lands with this pane; its `
          + "facts are in the System Browser tables below meanwhile.";
    },
  };
}
