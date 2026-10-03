/**
 * The `review` surface: the two ways out of a hypothesis.
 *
 * Correction 8 replaces this with REVIEW CHANGE — the operations grouped per model, then the
 * property impact computed by diffing the authoritative branch against the hypothesis branch, then
 * Discard / Commit. That is wave 2c, in this file, at these ids.
 *
 * Wave 0 moves what exists: a bar, shown when a hypothesis is open, carrying Accept and Discard.
 * Static markup rather than markup a paint creates, because a control that is destroyed and rebuilt
 * on every repaint takes the user's focus with it. The banner above it says IN WORDS that the
 * authoritative model is unchanged; these are the two ways out of that state.
 */
import { byId } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { regionHost } from "./surfaces.ts";

export function mountReview(ctx: ShellContext): ShellRegion {
  const bar = regionHost("review");

  byId("hypothesis-apply").addEventListener("click", () => {
    const label = ctx.workspace.state.hypothesis;
    if (ctx.workspace.applyHypothesis()) {
      ctx.announce(`Hypothesis "${label ?? ""}" is now the authoritative model.`);
    }
  });

  byId("hypothesis-discard").addEventListener("click", () => {
    const label = ctx.workspace.state.hypothesis;
    if (ctx.workspace.discardHypothesis()) {
      ctx.announce(`Hypothesis "${label ?? ""}" discarded. The authoritative model was never touched.`);
    }
  });

  return {
    paint: (frame: ShellFrame) => { bar.hidden = frame.state.hypothesis === null; },
  };
}
