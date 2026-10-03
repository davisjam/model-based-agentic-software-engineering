/**
 * The `workspace` region: the principal model — its purpose, its structured reading, its picture.
 *
 * This is the region correction 10 is about. The flat page put the canvas last in the document as
 * an epilogue after the whole textual database; the shell makes the diagram the visual centre
 * while keeping the structured reading first in DOM and in AT order. Those are two different
 * orderings of the same facts, and conflating them is how the old page ended up exhaustive.
 *
 * Wave 0 moves the subject chooser, the purpose block, the structured twin and the canvas into one
 * region and changes none of their behaviour. The contents tree, the represents/omits disclosures
 * and the canvas-as-input-surface are wave 2b's, in this file.
 *
 * **The canvas keeps `aria-hidden`** and the reading above it keeps being the accessible
 * representation: every fact in the picture is in the twin, so un-hiding the figure would duplicate
 * the model into the announcement storm FR-A11Y-3 exists to prevent.
 */
import type { Point, RenderedView } from "../../render/types.ts";
import { paintDiagram, paintPrincipal, fillSelect } from "../render-dom.ts";
import { resolveSubject, subjectValue } from "../view-model.ts";
import { byId, mountIf, sel } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { regionHost } from "./surfaces.ts";

export function mountWorkspace(ctx: ShellContext): ShellRegion {
  const region = regionHost("workspace");
  const subjectChoice = sel("diagram-subject");
  const principalPurpose = byId("principal-purpose");
  const diagramText = byId("diagram-text");
  const canvas = byId("canvas");

  /**
   * Node positions from the last render, fed back in as hints.
   *
   * Incremental layout never moves a hinted node, so adding one state perturbs the picture locally
   * instead of re-ranking the world. Comparing a model against a hypothetical variant is the core
   * interaction, and it is unreadable if everything shifts.
   */
  let positionHints: ReadonlyMap<string, Point> = new Map();

  subjectChoice.addEventListener("change", () => {
    ctx.viewState.target = subjectChoice.value;
    // Drop the hints: they describe the previous subject's layout, and a state id that happens to
    // match an entity id would pin an unrelated node to a position from a different picture.
    positionHints = new Map();
    ctx.repaint();
  });

  return {
    paint: (frame: ShellFrame) => {
      // SH-I1's other half. Read from the same field Start reads, so the two regions cannot both
      // claim the page.
      mountIf(region, frame.state.loaded);

      fillSelect(subjectChoice, frame.vm.subjects);
      const subject = resolveSubject(frame.state.system, ctx.viewState.target);
      if (subject !== null) subjectChoice.value = subjectValue(subject);

      // One subject at a time, chosen by the user or by `window.mage.view.focus`.
      //
      // No evidence is passed: the property list answers every saved question at once, so there is
      // no single "current result" to emphasise, and picking one would be the UI inventing a focus
      // the user did not ask for.
      let view: RenderedView | null = null;
      if (subject !== null) {
        view = ctx.workspace.renderView({
          subject,
          selection: ctx.viewState.selection,
          hints: positionHints,
        });
        positionHints = view.positions;
      }
      // §5.1: the model being viewed states its purpose beside the picture, above the picture, in
      // text.
      paintPrincipal(frame.vm.principal, principalPurpose);
      // ONE `RenderedView`, both projections. The renderer's contract makes the SVG unobtainable
      // without its structured twin, and this call site is the reason that matters: the picture and
      // the reading come from one return value, so they cannot describe different revisions.
      paintDiagram(view?.accessible ?? null, view?.tree ?? null, { text: diagramText, canvas });
    },
  };
}
