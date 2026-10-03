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
 *
 * **Exploring the configuration space lives here, and the siting is a ruling.** `DESIGN-shell-261002.md`
 * §10 assigns `explore-space` the path `⋯ menu → System Browser → Explore space` — "statistics belong
 * with the exhaustive view" — and registers it in wave 3. Wave 3 is not dispatched, and the ⋯ menu does
 * not exist (the `palette` surface is `planned`). So the control lands at the design's DESTINATION
 * without the hop that has not been built: this region, which wave 0 already made a named surface, is
 * where a reader asking how big the behaviour is would look, and it is reachable by Tab today. Wave 3
 * then prepends a menu step to the declared path rather than moving the control, which is the whole
 * reason to put it at the ruled destination instead of parking it somewhere a later wave must undo.
 */
import { byId, mountIf } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { regionHost } from "./surfaces.ts";
import type { PendingResult } from "../../app/ports.ts";

/**
 * The space summary, reached through the reply union rather than re-imported.
 *
 * `src/app/ports.ts` re-exports `PendingResult` and not `SpaceSummary`, and narrowing the arm is a
 * better answer than widening the facade's export surface for one readout: the shape stays defined
 * exactly once, in the Worker protocol, and this module cannot drift from it.
 */
export type Space = Extract<PendingResult, { readonly status: "ok-space" }>["space"];

/**
 * What stopped the walk, in a sentence a person can act on.
 *
 * A `Record` over the closed union rather than a `switch` with a default: a seventh stop reason added
 * to the engine fails to compile HERE, instead of reaching a reader as a bare identifier or, worse, as
 * a blank. The engine names its reasons explicitly for the same purpose and this is the human end of
 * that decision.
 */
const STOP_REASON: Record<Space["stopReason"], string> = {
  "complete": "Every reachable configuration was enumerated and expanded.",
  "state-limit": "The walk hit its ceiling, so the space is at least this big and its true size is unknown.",
  "config-hit": "The walk stopped at a configuration it was watching for.",
  "edge-hit": "The walk stopped at a transition it was watching for.",
  "dead-end-hit": "The walk stopped at a configuration with no outgoing step.",
  "initial-avoided": "No initial configuration satisfied the system's constraints, so there was nothing to walk.",
};

/**
 * The summary as prose, leading with the distinction that carries the meaning.
 *
 * **Exhausted and bounded are not the same answer and must never read as one.** A count with no word
 * beside it says "the space is N", which is true only when the walk finished; when it stopped at its
 * ceiling the same number means "at least N", and a reader who cannot tell the two apart has been told
 * something false by a control that reported honestly. So `complete` becomes the first word, and the
 * ceiling is named whenever it bit.
 */
export function describeSpaceSummary(space: Space): string {
  const ends = `${space.deadEnds} with no outgoing step`;
  const head = space.complete
    ? `Complete — ${space.statesExplored} reachable configuration(s), ${ends}.`
    : `Bounded — at least ${space.statesExplored} configuration(s) of an unknown total, ${ends}. `
      + `The ceiling was ${space.limit}.`;
  // The disclosed rewrites, if the walk made any. A step the explorer declined to take is a semantic
  // decision, and dropping it from the readout is the quiet-decision failure this workbench exists to
  // avoid — the same reasoning that puts them on a query's `compilation` line.
  const notes = space.notes.length === 0 ? "" : ` ${space.notes.join(" ")}`;
  return `${head} ${STOP_REASON[space.stopReason]}${notes}`;
}

/**
 * Every arm answered, because the one arm with no sentence is the silent-failure this union exists
 * to prevent.
 *
 * Exported with `describeSpaceSummary` so the node tier can pin the WORDING without a browser. The
 * exhausted-vs-bounded distinction is semantic, not cosmetic — it is the difference between "the
 * space is N" and "the space is at least N" — and a distinction that only a browser run can check
 * is one that gets checked rarely.
 */
export function describeExploreResult(result: PendingResult): string {
  switch (result.status) {
    case "ok-space": return describeSpaceSummary(result.space);
    case "failed": return `The walk did not run: ${result.messages.join(" ")}`;
    case "stale": return "The model changed while the walk was running, so its answer describes a revision "
      + "that is no longer loaded. Run it again.";
    case "cancelled": return "The walk was cancelled before it finished.";
    // The remaining arms belong to the other two analyses the Worker serves. Reaching one here would
    // mean a reply was routed to the wrong caller — reported rather than rendered as nothing.
    default: return `The analysis replied with a '${result.status}', which is not a configuration-space `
      + "summary. This is a defect in the Worker routing, not in the model.";
  }
}

export function mountSystemBrowser(ctx: ShellContext): ShellRegion {
  const region = regionHost("system-browser");
  const go = byId<HTMLButtonElement>("explore-space-go");
  const readout = byId("explore-space-result");

  const IDLE = "Not walked yet.";
  /**
   * The revision the readout describes, so a summary cannot outlive the model it is about.
   *
   * A state count is derived from one revision and nothing in the number says which. Leaving it on
   * screen through an edit is exactly the staleness trap the design flags in the agent API's result
   * cache; clearing it on a hash change costs one field and makes the readout unable to lie.
   */
  let describedHash: string | null = null;

  go.addEventListener("click", () => {
    // Disabled for the duration, which is both the honest affordance state and the guard against a
    // second walk being started over the first — the port is lazy and one walk is already a wait.
    go.disabled = true;
    readout.textContent = "Walking the reachable configuration space…";
    describedHash = ctx.workspace.state.hash;
    const walked = describedHash;
    void ctx.workspace.explore().then((result) => {
      const sentence = describeExploreResult(result);
      // The model may have moved while the Worker ran. The readout belongs to the revision that was
      // asked about, so a result for a superseded one says so rather than being presented as current.
      const current = ctx.workspace.state.hash;
      readout.textContent = walked === current
        ? sentence
        : `${sentence} (This describes revision ${walked}, which the model has since left.)`;
      describedHash = walked;
      go.disabled = false;
      ctx.announce(`Configuration space: ${sentence}`);
    }).catch((error: unknown) => {
      // The port resolves its own failures into the `failed` arm, so arriving here means the Worker
      // boundary itself threw. Re-enabling and SAYING so, because the alternative is a button that
      // stays dead with a readout mid-sentence — the fail-quiet shape this codebase refuses.
      readout.textContent = `The walk could not be started: ${String(error)}`;
      describedHash = null;
      go.disabled = false;
    });
  });

  return {
    paint: (frame: ShellFrame) => {
      // Nothing to browse with no system loaded, and Start owns the empty page (SH-I1).
      mountIf(region, frame.state.loaded);
      // `#sections` and `#provenance-list` are filled by the one view-model-to-DOM binder the
      // composition root calls. This region owns where they are, not how a row reads.
      if (describedHash !== null && describedHash !== frame.state.hash) {
        readout.textContent = `${IDLE} The model changed since the last walk.`;
        describedHash = null;
      }
    },
  };
}
