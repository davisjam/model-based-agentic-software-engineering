/**
 * What a region module is handed, and what it owes back.
 *
 * The shell is a composition root plus one module per region of `DESIGN-shell-261002.md` §5. This
 * file holds the seam between them and nothing else: the services a region may reach, the frame it
 * paints from, and the two element lookups. It owns no behaviour, so a wave that rewrites a region
 * never touches it.
 *
 * **Why a frame rather than letting regions read the workspace.** Every projection must paint from
 * ONE observation of the authoritative state (UX-I3). A region that called `workspace.properties()`
 * for itself could paint a verdict computed a moment after its neighbour's, and the two panes would
 * disagree about the same revision with nothing to notice. So the root observes once per paint and
 * hands the same frame to every region.
 */
import type { Workspace, WorkspaceState } from "../../app/services.ts";
import type { ViewState } from "../../app/agent-api.ts";
import type { ExampleCatalog } from "../../app/examples.ts";
import type { ProvenanceRecord } from "../../app/provenance.ts";
import type { ViewModel } from "../view-model.ts";

/**
 * The services and the two callbacks a region may use.
 *
 * `repaint` rather than each region refreshing itself: a region's own act can change what every
 * other region shows — choosing a model moves the inspector, the diagram and the property
 * grounding — so the root repaints the page and the regions never call each other.
 */
export interface ShellContext {
  readonly workspace: Workspace;
  /**
   * The ONE navigation state, shared with `window.mage.view.*` (§4). Mutable on purpose: the models
   * rail writes `target`, the inspector writes `selection`, and the agent writes both, all into the
   * same object the root reads on the next paint.
   */
  readonly viewState: ViewState;
  readonly examples: ExampleCatalog;
  /** The human channel of the announcer: what the control the user just pressed did. */
  readonly announce: (message: string) => void;
  readonly repaint: () => void;
}

/** One observation of the authoritative state, shared by every region in one paint. */
export interface ShellFrame {
  readonly vm: ViewModel;
  readonly state: WorkspaceState;
  /** Read once by the root: the provenance region renders it and the announcer counts it. */
  readonly provenance: readonly ProvenanceRecord[];
}

/**
 * A mounted region.
 *
 * Mounting happens once — listeners are bound to markup the page ships, never to markup a paint
 * created, because a control destroyed and rebuilt on every repaint takes the user's focus with it.
 * `paint` is then the only per-frame work.
 */
export interface ShellRegion {
  readonly paint: (frame: ShellFrame) => void;
}

/**
 * An element the shell requires, or a failure that says which.
 *
 * Throwing at mount blanks the application before the first paint, which is harsh and correct: a
 * region that silently skipped a missing control would ship a page with a dead button. The
 * node-tier page-contract test scans every `byId` call site in the shell against `index.html`, so
 * the common motion — a renamed id — fails at commit time instead of in a browser.
 */
export const byId = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (node === null) throw new Error(`index.html is missing #${id}`);
  return node as T;
};

export const sel = (id: string): HTMLSelectElement => byId<HTMLSelectElement>(id);
export const input = (id: string): HTMLInputElement => byId<HTMLInputElement>(id);

/**
 * Show or hide a whole region.
 *
 * The `hidden` attribute, not a class and not removal from the document. Three reasons, and the
 * second is the one that decided it: `hidden` takes the region out of the accessibility tree AND
 * out of the tab order together, so a sighted user and a keyboard user see the same page; the
 * markup the region binds its listeners to survives, which is what lets mounting happen once; and
 * the hypothesis bar already worked this way, so the shell has one spelling for "this region is not
 * part of the current state" rather than two.
 *
 * This is NOT the mechanism for collapsing semantic content a user might want (SH-I2). Hiding
 * content behind no control is the failure §3.1 names. It is for a region that has nothing to say
 * in the current state at all — Start with a model loaded, the workspace with none.
 */
export const mountIf = (region: HTMLElement, condition: boolean): void => {
  region.hidden = !condition;
};
