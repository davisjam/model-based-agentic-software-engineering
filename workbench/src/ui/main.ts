/**
 * Application entry. Wires the real ports, mounts the UI, installs `window.mage`.
 *
 * This is the only file that knows every module exists, which is deliberate: it is the composition
 * root, so the dependency edges the component model asserts all terminate here rather than tangling
 * between modules. Everything below it depends inward on the IR.
 */
import { parse as parseYaml } from "yaml";
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
    explore: (system) => {
      // The facade's explore() is not used by the UI yet; the engine owns exploration and the
      // Worker is the path for it. Reporting honestly rather than fabricating a configuration set.
      void system;
      return { configurations: [], exhaustive: false };
    },
  },
  yaml: {
    // The plain parse feeds canonicalize, which is what the facade wants. MageDocument is the
    // CST-preserving path and belongs to the transaction seam below, not to loading -- loading an
    // invalid file must still succeed (editing must not destroy someone's work), and MageDocument
    // returns a null document for unparseable text.
    parse: (text) => parseYaml(text),
    // Export returns the ORIGINAL text, so comments and key order survive a load/export round trip
    // untouched. Once the transaction seam below is bound, this becomes document.toText().
    serialize: (_system, originalText) => originalText ?? "",
  },
  transactions: {
    // Transactions are applied through the Phase D engine, which owns the fixed pipeline. Wiring it
    // to the facade needs the MageDocument that produced the IR, which the Workspace does not hold
    // yet — so this refuses rather than pretending to apply. Named in PLAN.md as the Phase F/G seam.
    apply: (system, _transaction) => ({
      ok: false,
      system,
      findings: [{
        rule: "WIRING",
        where: "transactions.apply",
        message: "the transaction engine is landed but not yet bound to the workspace document; "
               + "edit the .mage.yaml and re-open until that seam is finished.",
      }],
    }),
  },
  render: {
    render: (system, options) => {
      void system; void options;
      // Same posture: the renderer is landed and tested, but binding it needs the scene request
      // shape the UI has not yet built. An empty view is honest; a fabricated one is not.
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
    workspace.load(text);
    announce(`Loaded ${file.name}. ${workspace.state.findings.length} validation finding(s).`);
  });
});

byId("example").addEventListener("click", () => {
  void fetch("./examples/docable.mage.yaml")
    .then((r) => r.text())
    .then((text) => {
      workspace.load(text);
      announce("Loaded the DocAble example.");
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
