/**
 * The `nav-models` and `nav-properties` rails: the two principal navigation objects.
 *
 * `DESIGN-shell-261002.md` §5 gives both rails to this module, and wave 1a builds the navigation
 * itself — activating a model row sets `viewState.target`, activating a property row makes the
 * property the workspace's subject. Wave 0 lands the rails as named regions, which is what the
 * later wave needs in order to be a file nobody else is editing.
 *
 * **What is here now, and what is deliberately not.** The property rail is the flat page's
 * `#question-list`, at its own id under its own heading; its CONTENT is still written by the one
 * view-model-to-DOM binder in `render-dom.ts`, which the composition root calls and wave 3 owns. So
 * this module owns the rail's structure and its presence, not the rendering of a property row —
 * splitting that binder was not wave 0's to do, and whoever builds the rail's interactions will
 * either grow a renderer here or go and change the binder.
 *
 * The models rail is an empty named region. The model list currently reaches a reader as a table in
 * the System Browser; moving it is wave 1a's job and half-doing it here would hand that wave a
 * surface to undo. An empty region says what it is waiting for rather than rendering blank — a
 * named heading over nothing reads as a rendering failure.
 */
import { byId, mountIf } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { regionHost } from "./surfaces.ts";

export function mountNav(_ctx: ShellContext): ShellRegion {
  const rail = byId("nav");
  const models = regionHost("nav-models");

  return {
    paint: (frame: ShellFrame) => {
      // The rail navigates a loaded system. With nothing loaded, Start occupies the page and two
      // empty rails beside it are furniture — SH-I1's reasoning applied to the surfaces that have
      // nothing to navigate.
      mountIf(rail, frame.state.loaded);
      // The count is read from the view model rather than phrased here, so the placeholder cannot
      // claim a number the system does not have.
      const count = frame.vm.sections.find((s) => s.id === "models")?.rows.length ?? 0;
      models.textContent = count === 0
        ? "No purposeful model yet. Add one, and state the engineering question it answers."
        : `${count} purposeful model(s). Each model's question, representation and omissions are in `
          + "the System Browser below until this rail becomes the navigation.";
    },
  };
}
