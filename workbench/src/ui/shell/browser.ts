/**
 * The `system-browser` region: the exhaustive view, for people who want it.
 *
 * Correction 3's other half. The entity and relation tables are the clearest symptom of the flat
 * page — eleven entities and eighteen relations with their formal absence semantics, as the first
 * thing a reader met — and the author's answer is not to delete them: "There can be an advanced
 * System Browser for people who really want the 11-entity/18-relation tabular view." So they move
 * here, whole, at their own ids.
 *
 * Wave 0 moves them and changes nothing: the region is still always present once a model is loaded,
 * rather than opening from the ⋯ menu. Wave 3 makes it on demand and re-sites `inspect`'s tabular
 * affordance onto it; the affordance's element (`#sections`) does not move, which is why that wave
 * can do it without touching the registry's element ids.
 *
 * **Provenance is parked here, and the design puts it elsewhere.** Correction 9 moves provenance
 * onto the selected object — the inspector's disclosed Provenance block — and that is wave 1b's.
 * Until then the page-long Recorded-origins readout has to live somewhere, and it is an exhaustive
 * tabular readout of the whole system, which is this region's genre. Parking it beside the tables
 * keeps the three-pane shell free of it without inventing a home that a later wave would have to
 * dismantle.
 */
import { mountIf } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { regionHost } from "./surfaces.ts";

export function mountSystemBrowser(_ctx: ShellContext): ShellRegion {
  const region = regionHost("system-browser");

  return {
    paint: (frame: ShellFrame) => {
      // Nothing to browse with no system loaded, and Start owns the empty page (SH-I1).
      mountIf(region, frame.state.loaded);
      // `#sections` and `#provenance-list` are filled by the one view-model-to-DOM binder the
      // composition root calls. This region owns where they are, not how a row reads.
    },
  };
}
