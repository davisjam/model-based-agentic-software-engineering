/**
 * Application entry. Wires the real ports, mounts the UI, installs `window.mage`.
 *
 * This is the only file that knows every module exists, which is deliberate: it is the composition
 * root, so the dependency edges the component model asserts all terminate here rather than tangling
 * between modules. Everything below it depends inward on the IR.
 */
import { runQuery, runSavedQueries } from "../engine/index.ts";
import { Workspace } from "../app/services.ts";
import type { Ports } from "../app/services.ts";
import { AGENT_API_VERSION, createAgentApi } from "../app/agent-api.ts";
import type { ViewState } from "../app/agent-api.ts";
import { buildViewModel } from "./view-model.ts";
import { paint } from "./render-dom.ts";
import modelSchema from "../../mage-model.schema.json" with { type: "json" };
import querySchema from "../../mage-query.schema.json" with { type: "json" };
import transactionSchema from "../../mage-transaction.schema.json" with { type: "json" };

const byId = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (node === null) throw new Error(`index.html is missing #${id}`);
  return node as T;
};

const roots = {
  summary: byId("summary"),
  banner: byId("banner"),
  sections: byId("sections"),
  questions: byId("question-list"),
  findings: byId("finding-list"),
};
const live = byId("live");
const canvas = byId("canvas");

/**
 * FR-A11Y-3: announce consequential changes politely, and DEBOUNCE them.
 *
 * Without the debounce, re-running a dozen saved queries would queue a dozen announcements and bury
 * the user — the "announcement storm" the requirement names. One message describing the settled
 * state is what a screen-reader user can actually use.
 */
let announceTimer = 0;
const announce = (message: string): void => {
  window.clearTimeout(announceTimer);
  announceTimer = window.setTimeout(() => { live.textContent = message; }, 250);
};

// -- ports ------------------------------------------------------------------------------------
//
// Synchronous in-process engine. The Worker exists for long explorations and is wired by the UI
// separately; the facade needs a synchronous port, and running the engine twice is cheaper than
// making every service call async for the common case of a small model.
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
  render: {
    render: (system, options) => {
      void system; void options;
      // The renderer is landed and tested; binding it needs the scene request the UI has not built.
      // An empty accessible view is honest; a fabricated one would be a lie the a11y tests cannot
      // catch, and those tests exist precisely to make FR-A11Y-2 checkable.
      return {
        svg: "",
        accessible: { title: "", nodes: [], edges: [], summary: "" },
        positions: new Map(),
      };
    },
  },
};

const workspace = new Workspace(ports);
const viewState: ViewState = { target: null, selection: [] };

// -- repaint ----------------------------------------------------------------------------------

function repaint(): void {
  const state = workspace.state;
  let results = new Map<string, ReturnType<typeof runQuery>["result"]>();
  try {
    results = new Map([...runSavedQueries(state.system)].map(([id, a]) => [id, a.result]));
  } catch {
    // A saved query that cannot even be parsed must not take the whole page down with it; the
    // validation section already reports why the model is unhappy.
  }
  const vm = buildViewModel(state.system, state.findings, results, {
    hypothesis: state.hypothesis,
    currentHash: state.hash,
    selection: viewState.selection,
  });
  paint(vm, roots);
  canvas.replaceChildren();
  byId<HTMLButtonElement>("undo").disabled = !state.canUndo;
  byId<HTMLButtonElement>("redo").disabled = !state.canRedo;
}

workspace.subscribe(() => repaint());

// -- controls ---------------------------------------------------------------------------------

byId("file").addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file === undefined) return;
  void file.text().then((text) => {
    const r = workspace.load(text);
    announce(r.ok
      ? `Loaded ${file.name}. ${workspace.state.findings.length} validation finding(s).`
      : `${file.name} could not be parsed: ${r.findings.map((f) => f.message).join("; ")}`);
  });
});

byId("example").addEventListener("click", () => {
  void fetch("./examples/docable.mage.yaml")
    .then((r) => r.text())
    .then((text) => {
      const r = workspace.load(text);
      announce(r.ok ? "Loaded the DocAble example." : "The example failed to parse.");
    })
    .catch(() => announce("Could not load the example; open a .mage.yaml instead."));
});

byId("export").addEventListener("click", () => {
  const text = workspace.export();
  const url = URL.createObjectURL(new Blob([text], { type: "text/yaml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${workspace.state.system.systemId}.mage.yaml`;
  a.click();
  URL.revokeObjectURL(url);
  announce("Exported.");
});

byId("run").addEventListener("click", () => {
  repaint();
  const n = workspace.state.system.queries.size;
  announce(n === 0 ? "This model saves no questions." : `Re-ran ${n} question(s).`);
});

byId("undo").addEventListener("click", () => {
  if (workspace.undo()) announce("Undone.");
});
byId("redo").addEventListener("click", () => {
  if (workspace.redo()) announce("Redone.");
});

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
);

Object.defineProperty(window, "mage", { value: api, writable: false, configurable: false });

repaint();
announce(`MAGE Model Workbench ready. Agent API ${AGENT_API_VERSION} at window.mage.`);
