/**
 * Application entry. Wires the real ports, mounts the UI, installs `window.mage`.
 *
 * This is the only file that knows every module exists, which is deliberate: it is the composition
 * root, so the dependency edges the component model asserts all terminate here rather than tangling
 * between modules. Everything below it depends inward on the IR.
 */
import { runQuery, runSavedQueries } from "../engine/index.ts";
import { renderView } from "../render/index.ts";
import type { Point, RenderedView } from "../render/types.ts";
import { Workspace } from "../app/services.ts";
import type { Ports } from "../app/services.ts";
import { AGENT_API_VERSION, createAgentApi } from "../app/agent-api.ts";
import type { ViewState } from "../app/agent-api.ts";
import { buildViewModel, planEdit, resolveSubject, subjectValue } from "./view-model.ts";
import type { EditOptions, EditRequest } from "./view-model.ts";
import { fillSelect, paint, paintDiagram, paintEditResult } from "./render-dom.ts";
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
const diagramText = byId("diagram-text");
const editResult = byId("edit-result");
const hypothesisBar = byId("hypothesis-bar");

const sel = (id: string): HTMLSelectElement => byId<HTMLSelectElement>(id);
const input = (id: string): HTMLInputElement => byId<HTMLInputElement>(id);

const selects = {
  subject: sel("diagram-subject"),
  addStateMachine: sel("add-state-machine"),
  deleteElement: sel("delete-element-target"),
  relationModel: sel("add-relation-model"),
  relationFrom: sel("add-relation-from"),
  relationTo: sel("add-relation-to"),
  relationType: sel("add-relation-type"),
  deleteRelation: sel("delete-relation-target"),
  labelTarget: sel("set-label-target"),
  propertyTarget: sel("set-property-target"),
  propertyKind: sel("set-property-kind"),
  propertyDomain: sel("set-property-domain"),
  deleteModel: sel("delete-model-target"),
  noteTarget: sel("add-note-target"),
  noteKind: sel("add-note-kind"),
};

/** The forms that may only be used once a model is loaded. Disabling the fieldset disables all of it. */
const editForms = [
  "edit-mode", "form-add-entity", "form-add-state", "form-delete-element",
  "form-add-relation", "form-delete-relation", "form-set-label", "form-set-property",
  "form-add-model", "form-delete-model", "form-add-note",
].map((id) => byId<HTMLFieldSetElement>(id));

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
  // The renderer, bound. It returns the picture and its structured twin together — there is no
  // export that yields one without the other — so the UI cannot draw a diagram that a
  // screen-reader user gets nothing from.
  render: { render: (system, request) => renderView(system, request) },
};

const workspace = new Workspace(ports);
const viewState: ViewState = { target: null, selection: [] };

/**
 * Node positions from the last render, fed back in as hints.
 *
 * Incremental layout never moves a hinted node, so adding one state perturbs the picture locally
 * instead of re-ranking the world. Comparing a model against a hypothetical variant is the core
 * interaction, and it is unreadable if everything shifts.
 */
let positionHints: ReadonlyMap<string, Point> = new Map();

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
  currentEditOptions = vm.edit;

  // -- the diagram. One subject at a time, chosen by the user or by `window.mage.view.focus`.
  //
  // No evidence is passed: the questions section answers every saved query at once, so there is no
  // single "current result" to emphasise, and picking one would be the UI inventing a focus the
  // user did not ask for.
  const subject = resolveSubject(state.system, viewState.target);
  let view: RenderedView | null = null;
  if (subject !== null) {
    view = workspace.renderView({
      subject,
      selection: viewState.selection,
      hints: positionHints,
    });
    positionHints = view.positions;
  }
  paintDiagram(view?.accessible ?? null, view?.tree ?? null, { text: diagramText, canvas });

  fillSelect(selects.subject, vm.subjects);
  if (subject !== null) selects.subject.value = subjectValue(subject);

  fillSelect(selects.addStateMachine, vm.edit.machines);
  fillSelect(selects.deleteElement, vm.edit.elements);
  fillSelect(selects.relationModel, vm.edit.models);
  fillSelect(selects.relationType, vm.edit.relationTypes);
  fillSelect(selects.deleteRelation, vm.edit.relations);
  fillSelect(selects.labelTarget, vm.edit.labelled);
  fillSelect(selects.propertyTarget, vm.edit.entities);
  fillSelect(selects.propertyDomain, [{ value: "", label: "none" }, ...vm.edit.domains]);
  fillSelect(selects.deleteModel, vm.edit.models);
  fillSelect(selects.noteTarget, vm.edit.annotatable);
  fillSelect(selects.noteKind, vm.edit.noteKinds);
  fillDatalist(byId("property-names"), vm.edit.propertyNames);
  fillDatalist(byId("entity-ids"), vm.edit.entityIds);
  refreshRelationEndpoints();

  for (const form of editForms) form.disabled = !state.loaded;
  hypothesisBar.hidden = state.hypothesis === null;
  byId<HTMLButtonElement>("undo").disabled = !state.canUndo;
  byId<HTMLButtonElement>("redo").disabled = !state.canRedo;
}

/**
 * Refill a `<datalist>` of bare ids. A hint beside a free-text field, not a constraint — the
 * transaction still validates, and V3 names an id the system does not declare.
 *
 * Takes the element rather than its id, mirroring `fillSelect`, so every id in this file stays a
 * literal `byId(...)` call site — which is what the page-contract test scans to prove index.html
 * carries every element the composition root demands.
 */
function fillDatalist(root: HTMLElement, values: readonly string[]): void {
  root.replaceChildren(...values.map((value) => {
    const option = document.createElement("option");
    option.value = value;
    return option;
  }));
}

/**
 * The endpoints a relation may join, narrowed to the chosen model's own entities.
 *
 * This is the licensing the capability registry asked for: `add-relation` does not add an entity to
 * a model, so a relation between entities the model does not contain is a relation no view of that
 * model will ever draw. Offering only what the model contains refuses that by construction rather
 * than by a finding after the fact.
 */
function refreshRelationEndpoints(): void {
  const options = currentEditOptions;
  if (options === null) return;
  const inModel = options.modelEntities.get(selects.relationModel.value) ?? options.entities;
  fillSelect(selects.relationFrom, inModel);
  fillSelect(selects.relationTo, inModel);
}

/** Last painted options, so the model-change handler can re-narrow endpoints without a repaint. */
let currentEditOptions: EditOptions | null = null;

workspace.subscribe(() => repaint());
selects.relationModel.addEventListener("change", () => refreshRelationEndpoints());
selects.subject.addEventListener("change", () => {
  viewState.target = selects.subject.value;
  // Drop the hints: they describe the previous subject's layout, and a state id that happens to
  // match an entity id would pin an unrelated node to a position from a different picture.
  positionHints = new Map();
  repaint();
});

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

// -- editing ----------------------------------------------------------------------------------
//
// Every form funnels through `submitEdit`. That single funnel is UX-I3 — authoritative-state
// convergence — in the UI: one operation, one envelope, handed to the same `Workspace.transact`
// that `window.mage.transact` calls, so there is no human mutation path beside the agent one.
// Routing to a hypothesis changes WHICH branch the transaction lands on, never how it is validated.

function submitEdit(request: EditRequest): void {
  const plan = planEdit(request);
  if (!plan.ok) {
    // The UI's own refusal, before the transaction layer sees it: a person who left a box blank is
    // better served by "an entity needs an id" than by the schema's phrasing of the same fact.
    paintEditResult(editResult, plan.problem, []);
    announce(plan.problem);
    return;
  }

  const asHypothesis = input("target-hypothesis").checked;
  const label = input("hypothesis-label").value.trim();
  if (asHypothesis && label === "") {
    const problem = "A hypothesis needs a name, so you can tell which one you are reviewing.";
    paintEditResult(editResult, problem, []);
    announce(problem);
    return;
  }
  const rationale = input("edit-rationale").value.trim();
  const transaction = {
    transaction: {
      base: workspace.state.hash,
      target: asHypothesis ? label : "main",
      // OMITTED when empty, not sent as null. The schema types `rationale` as a string, and the
      // parser refuses a present-but-non-string value — so an explicit null rejects the whole
      // transaction with a message about the rationale rather than applying the edit. Found by the
      // test that drives a planned operation through the real Workspace.
      ...(rationale === "" ? {} : { rationale }),
      operations: plan.operations,
    },
  };

  const result = asHypothesis
    ? workspace.openHypothesis(label, transaction)
    : workspace.transact(transaction);

  const applied = plan.operations.map((o) => o.op).join(" + ");
  if (result.ok) {
    paintEditResult(editResult, "", []);
    // An annotation-only edit commits WITHOUT advancing the semantic revision (A1), which is
    // surprising enough that the announcement says so. A user who edits and sees the hash stand
    // still should be told why rather than left to suspect the click was lost.
    const annotationOnly = plan.operations.every((o) => o.op === "add-note");
    announce(asHypothesis
      ? `Hypothesis "${label}" is open. The authoritative model is unchanged until you accept it.`
      : `${applied} applied. ${workspace.state.findings.length} validation finding(s).`
        + (annotationOnly ? " The model's revision is unchanged: a note is context, not a constraint." : ""));
    return;
  }
  // A rejection carries the findings that explain it, and losing them leaves a person staring at a
  // control that did nothing. They are reported here rather than in the Validation section, which
  // describes the model as it stands — not an edit that never happened.
  paintEditResult(editResult, `Rejected: ${applied} changed nothing.`, result.findings);
  announce(`Edit rejected. ${result.findings[0]?.message ?? "No reason was reported."}`);
}

byId("add-entity-go").addEventListener("click", () => submitEdit({
  form: "add-entity",
  id: input("add-entity-id").value,
  type: input("add-entity-type").value,
  label: input("add-entity-label").value,
}));

byId("add-state-go").addEventListener("click", () => submitEdit({
  form: "add-state",
  machine: selects.addStateMachine.value,
  state: input("add-state-id").value,
}));

byId("delete-element-go").addEventListener("click", () => submitEdit({
  form: "delete-element",
  element: selects.deleteElement.value,
  cascade: input("delete-element-cascade").checked,
}));

byId("add-relation-go").addEventListener("click", () => submitEdit({
  form: "add-relation",
  model: selects.relationModel.value,
  from: selects.relationFrom.value,
  to: selects.relationTo.value,
  type: selects.relationType.value,
}));

byId("delete-relation-go").addEventListener("click", () => submitEdit({
  form: "delete-relation",
  relation: selects.deleteRelation.value,
}));

byId("set-label-go").addEventListener("click", () => submitEdit({
  form: "set-label",
  id: selects.labelTarget.value,
  label: input("set-label-value").value,
}));

byId("set-property-go").addEventListener("click", () => {
  const kind = selects.propertyKind.value;
  submitEdit({
    form: "set-property",
    id: selects.propertyTarget.value,
    name: input("set-property-name").value,
    value: input("set-property-value").value,
    valueKind: kind === "integer" || kind === "boolean" ? kind : "string",
    domain: selects.propertyDomain.value,
    unset: input("set-property-unset").checked,
  });
});

byId("add-model-go").addEventListener("click", () => submitEdit({
  form: "add-model",
  id: input("add-model-id").value,
  label: input("add-model-label").value,
  question: input("add-model-question").value,
  entities: input("add-model-entities").value,
}));

byId("delete-model-go").addEventListener("click", () => submitEdit({
  form: "delete-model",
  model: selects.deleteModel.value,
}));

byId("add-note-go").addEventListener("click", () => submitEdit({
  form: "add-note",
  target: selects.noteTarget.value,
  kind: selects.noteKind.value,
  text: input("add-note-text").value,
}));

// -- the hypothesis bar -----------------------------------------------------------------------

byId("hypothesis-apply").addEventListener("click", () => {
  const label = workspace.state.hypothesis;
  if (workspace.applyHypothesis()) {
    announce(`Hypothesis "${label ?? ""}" is now the authoritative model.`);
  }
});

byId("hypothesis-discard").addEventListener("click", () => {
  const label = workspace.state.hypothesis;
  if (workspace.discardHypothesis()) {
    announce(`Hypothesis "${label ?? ""}" discarded. The authoritative model was never touched.`);
  }
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
