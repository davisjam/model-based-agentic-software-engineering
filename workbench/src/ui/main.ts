/**
 * Application entry. Wires the real ports, mounts the shell's regions, installs `window.mage`.
 *
 * This is the only file that knows every module exists, which is deliberate: it is the composition
 * root, so the dependency edges the component model asserts all terminate here rather than tangling
 * between modules. Everything below it depends inward on the IR.
 *
 * **What it kept when the shell split the page up, and why each piece could not go into a region.**
 * `DESIGN-shell-261002.md` §5 shrinks this file to "ports, workspace, `window.mage`, region
 * mounting". Three things stayed beyond that list, each because it is a fact about the WHOLE page:
 *
 *   - **The one observation per paint.** `repaint()` reads the authoritative state once and hands
 *     every region the same frame, so two panes cannot paint verdicts computed a moment apart
 *     (UX-I3). A region that observed for itself would be a second reader of the same truth.
 *   - **The announcer.** Its model and property channels are DIFFS over the whole system, and a
 *     region sees one slice; the argument is written out in `shell/announcer.ts`.
 *   - **The view-model-to-DOM binder.** `paint()` writes the readouts that live in several
 *     different regions. Splitting it wholesale is the closure wave's (`render-dom.ts` is wave 3's
 *     file), so the root calls it and the regions own where those hosts are rather than how a row
 *     inside one reads. Wave 1a took exactly one root off it — the property list, whose rail rows
 *     are a new rendering rather than a restyled block — and left the rest whole.
 */
import { runQuery } from "../engine/index.ts";
import { renderView } from "../render/index.ts";
import { Workspace } from "../app/services.ts";
import type { Ports } from "../app/services.ts";
import { ExampleCatalog } from "../app/examples.ts";
import { AGENT_API_VERSION, createAgentApi } from "../app/agent-api.ts";
import type { ViewState } from "../app/agent-api.ts";
import { createLazyAnalysisPort } from "../worker/port.ts";
import { bindAffordances } from "./affordances.ts";
import { buildViewModel, resolveSubject } from "./view-model.ts";
import { paint, paintProvenance } from "./render-dom.ts";
import { byId } from "./shell/context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./shell/context.ts";
import { surfaceElement } from "./shell/surfaces.ts";
import { Announcer } from "./shell/announcer.ts";
import { mountHeader } from "./shell/header.ts";
import { mountStart } from "./shell/start.ts";
import { mountNav } from "./shell/nav.ts";
import { mountWorkspace } from "./shell/workspace.ts";
import { mountInspector } from "./shell/inspector.ts";
import { mountAskBar } from "./shell/askbar.ts";
import { mountEditForms } from "./shell/edit-forms.ts";
import { mountEditDialogs } from "./shell/edit-dialogs.ts";
import { mountPalette } from "./shell/palette.ts";
import { mountReview } from "./shell/review.ts";
import { mountStatus } from "./shell/status.ts";
import { mountSystemBrowser } from "./shell/browser.ts";
import modelSchema from "../../mage-model.schema.json" with { type: "json" };
import querySchema from "../../mage-query.schema.json" with { type: "json" };
import transactionSchema from "../../mage-transaction.schema.json" with { type: "json" };

/**
 * The readouts the one binder still writes, each in the region that now holds it.
 *
 * Four when the shell split the page up; three since wave 1a, which took the property list off the
 * binder and gave the rail's rows to `shell/nav.ts`. The binder keeps the readouts whose rendering
 * no region has changed — and keeps `propertyBlock`, which the rail imports for the full reading it
 * discloses, so there is still one author for how a property reads in full.
 *
 * `#summary`, `#banner` and `#finding-list` are readouts inside regions rather than regions
 * themselves, so they are looked up by id — which the page-contract test scans.
 */
const roots = {
  summary: byId("summary"),
  banner: byId("banner"),
  sections: byId("sections"),
  findings: byId("finding-list"),
};

const live = byId("live");
const skip = byId<HTMLAnchorElement>("skip");
const provenanceList = byId("provenance-list");

// -- ports ------------------------------------------------------------------------------------
//
// Synchronous in-process engine. The Worker exists for long explorations and is wired by the UI
// separately; the facade needs a synchronous port, and running the engine twice is cheaper than
// making every service call async for the common case of a small model.
const announcer = new Announcer(live);

const ports: Ports = {
  engine: {
    graphQuery: (system, query) => runQuery(system, query).result,
    behaviorQuery: (system, query) => runQuery(system, query).result,
    explore: () => {
      // The UI does not use the facade's explore(); the engine owns exploration and the Worker is
      // the path for a long one. Reporting honestly rather than fabricating a configuration set.
      return { configurations: [], exhaustive: false };
    },
  },
  // The analysis Worker, which until this change shipped and was never instantiated.
  //
  // LAZY on purpose. analysis.worker.js is 350 KB because the long analyses live there, and
  // spawning at page load would charge every visitor that download to run a walk most of them never
  // ask for. The first long analysis starts the thread; nothing else does.
  //
  // The URL is relative to the SERVED PAGE — index.html loads ./dist/workbench.js — which is
  // exactly why it is spelled in the composition root and not inside src/worker/.
  analysis: createLazyAnalysisPort("./dist/analysis.worker.js", {
    onState: (state, id) => {
      // FR-A11Y-3: a long analysis SETTLING is consequential; its starting is not. The debounced
      // sender composes a burst of these into one sentence rather than a storm.
      if (state === "running") return;
      announcer.action(`Analysis ${id} ${state === "bounded" ? "stopped at its budget" : state}.`);
    },
  }),
  // The renderer, bound. It returns the picture and its structured twin together — there is no
  // export that yields one without the other — so the UI cannot draw a diagram that a
  // screen-reader user gets nothing from.
  render: { render: (system, request) => renderView(system, request) },
};

const workspace = new Workspace(ports);
const viewState: ViewState = { target: null, selection: [] };

/**
 * The example catalogue, over `fetch`.
 *
 * ONE instance, shared with `window.mage` below. The human menu and the agent's `loadExample` are
 * then the same call on the same object, which is UX-I1's "both invoke the same service" as an
 * object reference rather than as a claim about two code paths.
 *
 * The reader throws on a non-OK response. A reader that returned the 404 body would describe the
 * example as having no models, which is a lie the user would have no way to see through.
 */
const examples = new ExampleCatalog(workspace, async (path) => {
  const response = await fetch(`./${path}`);
  if (!response.ok) throw new Error(`${path}: ${response.status} ${response.statusText}`);
  return response.text();
});

const ctx: ShellContext = {
  workspace,
  viewState,
  examples,
  announce: (message) => announcer.action(message),
  repaint: () => repaint(),
};

// -- the regions ------------------------------------------------------------------------------
//
// Mounted once, in document order, because mounting binds listeners to markup the page ships. The
// editing funnel is mounted first only because it owns `submitEdit`, the one mutation funnel the
// ask bar and every editing dialog also send through — one operation, one envelope, one
// `Workspace.transact`.
const editForms = mountEditForms(ctx);
// And the contextual editing surfaces second, because the palette dispatches into the dialogs: one
// `open` function, so ⌘K and a `+ Add` item reach the same form the same way.
const editDialogs = mountEditDialogs(ctx, editForms.submitEdit);
const regions: readonly ShellRegion[] = [
  mountHeader(ctx),
  mountStart(ctx),
  mountNav(ctx),
  // `open` again, because the canvas context menu dispatches into the same dialogs the palette and
  // the `+ Add` menu do: one catalogue of operations, one way to open one of them.
  mountWorkspace(ctx, editDialogs.open),
  mountInspector(ctx),
  mountAskBar(ctx, editForms.submitEdit),
  mountStatus(ctx),
  mountSystemBrowser(ctx),
  editForms,
  editDialogs,
  mountPalette(ctx, editDialogs.open),
  mountReview(ctx),
];

// -- repaint ----------------------------------------------------------------------------------

function repaint(): void {
  const state = workspace.state;
  // Through `workspace.properties()`, which is the same call `window.mage.properties()` makes. Every
  // verdict here was computed just now against `state.hash`: a verdict is derived state, so it is
  // recomputed and stored nowhere, and §3.3's "re-evaluated when relevant model semantics change"
  // holds because there is no other way to obtain one.
  const properties = workspace.properties();
  const vm = buildViewModel(state.system, state.findings, properties, {
    hypothesis: state.hypothesis,
    selection: viewState.selection,
    principal: resolveSubject(state.system, viewState.target),
  });

  // Through `workspace.provenance()`, the same call `window.mage.provenance()` makes. Reading it
  // here cannot move the model: the service hands back records and no writer (UX-I6). Read once and
  // used twice — the Provenance readout renders it, and the announcement counts it, because the
  // record set is the one surface an annotation-only commit moves (A1 holds the hash still).
  const provenance = workspace.provenance();

  const frame: ShellFrame = { vm, state, provenance };

  paint(vm, roots);
  // The provenance readout has no region of its own this wave. Correction 9 moves provenance onto
  // the selected object — the inspector's disclosed block, wave 1b — so its holding pen is the
  // System Browser's markup, painted from here rather than from `browser.ts`: a module that never
  // claimed it is a module a later wave does not have to strip it out of.
  paintProvenance(frame.provenance, provenanceList);
  for (const region of regions) region.paint(frame);
  announcer.observe(frame);
  retargetSkipLink(state.loaded);

  // The registry's human affordance sites, stamped onto the elements that carry them. Last, so
  // every host this paint created is in the document. A site whose host is missing is a registry
  // claiming a control the page does not have: `console.error` is the channel because the browser
  // tier already asserts the page logs none of its own, so the drift reds an existing gate instead
  // of waiting for someone to add one.
  const unbound = bindAffordances(document);
  if (unbound.length > 0) {
    console.error(`UX-I1: human affordance site(s) with no element on the page: ${unbound.join("; ")}`);
  }
}

/**
 * Where the skip link lands, which SH-I1 makes a question rather than a constant.
 *
 * 2.4.1 asks for a bypass to the main content, and the main content is now whichever principal
 * surface is mounted: Start on an empty workspace, the model workspace once something is loaded. A
 * static target would be a link to a `hidden` region half the time, which is worse than no link.
 * Derived from the surfaces table so the two ids are not written here as well.
 */
function retargetSkipLink(loaded: boolean): void {
  const target = surfaceElement(loaded ? "workspace" : "start");
  if (target === null) return;
  skip.href = `#${target}`;
  skip.textContent = loaded ? "Skip to the model workspace" : "Skip to Start";
}

workspace.subscribe(() => repaint());

// -- window.mage ------------------------------------------------------------------------------
//
// FR-AGENT-1: exactly one global entry point, operating the SAME workspace the human controls do.
// A CDP-attached agent's edit is therefore visible in the ordinary UI immediately, because there is
// no second store to synchronise.
const api = createAgentApi(
  workspace,
  viewState,
  { model: modelSchema, query: querySchema, transaction: transactionSchema },
  () => repaint(),
  examples,
);

Object.defineProperty(window, "mage", { value: api, writable: false, configurable: false });

repaint();
announcer.action(`MAGE Model Workbench ready. Agent API ${AGENT_API_VERSION} at window.mage.`);
