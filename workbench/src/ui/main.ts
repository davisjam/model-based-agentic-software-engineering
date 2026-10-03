/**
 * Application entry. Wires the real ports, mounts the UI, installs `window.mage`.
 *
 * This is the only file that knows every module exists, which is deliberate: it is the composition
 * root, so the dependency edges the component model asserts all terminate here rather than tangling
 * between modules. Everything below it depends inward on the IR.
 */
import { runQuery } from "../engine/index.ts";
import { renderView } from "../render/index.ts";
import type { Point, RenderedView } from "../render/types.ts";
import { NEW_SYSTEM, Workspace } from "../app/services.ts";
import type { Ports } from "../app/services.ts";
import { ExampleCatalog } from "../app/examples.ts";
import type { ExampleDescription } from "../app/examples.ts";
import { AGENT_API_VERSION, createAgentApi } from "../app/agent-api.ts";
import type { ViewState } from "../app/agent-api.ts";
import { createLazyAnalysisPort } from "../worker/port.ts";
import { bindAffordances } from "./affordances.ts";
import {
  buildViewModel, planAsk, planEdit, propertyRow, resolveSubject, subjectValue,
} from "./view-model.ts";
import type { AskRequest, EditOptions, EditRequest, PropertyRow } from "./view-model.ts";
import {
  fillSelect, paint, paintAnswer, paintDiagram, paintEditResult, paintExampleDescription,
  paintExampleProblem, paintPrincipal, paintProvenance,
} from "./render-dom.ts";
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
  // The property list. The element id stays `question-list` because the browser tier asserts
  // against it and against the section ids, and that gate belongs to another file's owner.
  properties: byId("question-list"),
  findings: byId("finding-list"),
};
const live = byId("live");
const canvas = byId("canvas");
const diagramText = byId("diagram-text");
const editResult = byId("edit-result");
const hypothesisBar = byId("hypothesis-bar");
const provenanceList = byId("provenance-list");
const exampleDescription = byId("example-description");
const askAnswer = byId("ask-answer");
const principalPurpose = byId("principal-purpose");

const sel = (id: string): HTMLSelectElement => byId<HTMLSelectElement>(id);
const input = (id: string): HTMLInputElement => byId<HTMLInputElement>(id);

const selects = {
  exampleChoice: sel("example-choice"),
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
  askForm: sel("ask-form"),
  askRelation: sel("ask-relation"),
  askFrom: sel("ask-from"),
  askTo: sel("ask-to"),
  askQuantifier: sel("ask-quantifier"),
  saveExpect: sel("save-property-expect"),
  retractTarget: sel("retract-property-target"),
};

/** The forms that may only be used once a model is loaded. Disabling the fieldset disables all of it. */
const editForms = [
  "edit-mode", "form-add-entity", "form-add-state", "form-delete-element",
  "form-add-relation", "form-delete-relation", "form-set-label", "form-set-property",
  "form-add-model", "form-delete-model", "form-add-note",
  "form-ask", "form-save-property", "form-retract-property",
].map((id) => byId<HTMLFieldSetElement>(id));

/**
 * FR-A11Y-3: announce consequential changes politely, DEBOUNCE them, and COMPOSE them.
 *
 * Without the debounce, re-running a dozen saved queries would queue a dozen announcements and bury
 * the user — the "announcement storm" the requirement names. One message describing the settled
 * state is what a screen-reader user can actually use.
 *
 * **Three senders, and the third is the one FR-A11Y-3 turns on.** A model change has consequences a
 * screen-reader user needs from different places:
 *
 *   - `pendingAction` — what the human control the user just pressed did. Written by the handlers.
 *   - `pendingModelNews` — what changed in the AUTHORITATIVE MODEL, derived in `repaint()` by
 *     diffing the system against the last paint. This is the agent channel: `window.mage.load` and
 *     `window.mage.transact` repaint without passing through any handler, so nothing else in this
 *     file knows they happened.
 *   - `pendingPropertyNews` — which PROPERTY VERDICTS moved. One edit can re-evaluate every property
 *     at once, which is the worst storm in the application, and no handler knows the outcome.
 *
 * Property news used to carry the agent channel alone, and it carried one slice of it: it speaks
 * only when a verdict changes or a property is dropped, so an agent adding an entity, a relation, a
 * model or a note repainted the human surface and announced NOTHING. Measured at zero writes to
 * `#live` for both `load()` and `transact()` (`BASELINE-a11y-261002.md` §5, F-1).
 *
 * The three compose into ONE sentence rather than racing, because the timer renders what is pending
 * and then clears it. One exclusion: a pending human action SUPPRESSES the derived model news, since
 * "add-entity applied" and "entities 11 to 12" describe the same event and a user does not want it
 * twice. Property news is additive and always composes.
 *
 * **Politeness: `polite`, deliberately, including for the agent channel.** An agent mutation is
 * consequential, not an emergency. `assertive` interrupts the sentence the user is currently
 * hearing — including a sentence about the thing they are doing themselves — and a collaborator's
 * edit arriving mid-word is worse than the same edit announced a quarter-second later. There is one
 * live region and it stays `polite`; nothing here needs a second, louder one.
 */
let announceTimer = 0;
let pendingAction = "";
let pendingModelNews = "";
let pendingPropertyNews = "";

function flushAnnouncement(): void {
  window.clearTimeout(announceTimer);
  announceTimer = window.setTimeout(() => {
    const model = pendingAction === "" ? pendingModelNews : "";
    live.textContent = [pendingAction, model, pendingPropertyNews].filter((s) => s !== "").join(" ");
    pendingAction = "";
    pendingModelNews = "";
    pendingPropertyNews = "";
  }, 250);
}

const announce = (message: string): void => { pendingAction = message; flushAnnouncement(); };
const announceModel = (message: string): void => {
  pendingModelNews = message;
  flushAnnouncement();
};
const announceProperties = (message: string): void => {
  pendingPropertyNews = message;
  flushAnnouncement();
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
      announce(`Analysis ${id} ${state === "bounded" ? "stopped at its budget" : state}.`);
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

/** Descriptions, read once at boot. Selecting an example then costs nothing. */
const descriptions = new Map<string, ExampleDescription>();

/**
 * Node positions from the last render, fed back in as hints.
 *
 * Incremental layout never moves a hinted node, so adding one state perturbs the picture locally
 * instead of re-ranking the world. Comparing a model against a hypothetical variant is the core
 * interaction, and it is unreadable if everything shifts.
 */
let positionHints: ReadonlyMap<string, Point> = new Map();

// -- repaint ----------------------------------------------------------------------------------

/**
 * The status of each property at the last paint, for the change announcement.
 *
 * This is a view-layer memo for an ANNOUNCEMENT, and it is deliberately not a cache of verdicts: it
 * holds the previous status word and nothing is ever read out of it to display. Nothing downstream
 * can present a status from here, because `repaint` recomputes every verdict from
 * `workspace.properties()` before this map is consulted.
 */
let lastStatus = new Map<string, string>();

/** One sentence naming what moved. At most three, because a sentence listing twelve is not read. */
function propertyNews(rows: readonly PropertyRow[]): string {
  const changed: string[] = [];
  for (const p of rows) {
    const before = lastStatus.get(p.id);
    if (before !== undefined && before !== p.status) changed.push(`${p.proposition} is now ${p.status}`);
  }
  const dropped = [...lastStatus.keys()].filter((id) => !rows.some((p) => p.id === id));
  lastStatus = new Map(rows.map((p) => [p.id, p.status]));
  const parts: string[] = [];
  if (changed.length > 0) {
    parts.push(`${changed.length} property verdict(s) changed: `
      + `${changed.slice(0, 3).join("; ")}${changed.length > 3 ? `; and ${changed.length - 3} more` : ""}.`);
  }
  if (dropped.length > 0) parts.push(`${dropped.length} property(ies) are no longer asserted.`);
  return parts.join(" ");
}

/**
 * What the authoritative model looked like at the last paint, for the agent-path announcement.
 *
 * A memo for an ANNOUNCEMENT and nothing else, exactly as `lastStatus` above is: no projection reads
 * a value out of here, and `repaint` derives every number it stores from `workspace.state` on the
 * same pass. The counts are the ones `window.mage.context()` publishes, so the sentence a
 * screen-reader user hears and the object an agent reads describe one system.
 */
interface ModelMemo {
  readonly loaded: boolean;
  readonly systemId: string;
  readonly title: string;
  readonly hash: string;
  readonly counts: ReadonlyMap<string, number>;
  readonly findings: number;
  /** Objects carrying an origin or a note. The one surface an annotation-only edit moves. */
  readonly annotated: number;
}

let lastModel: ModelMemo | null = null;

/** `"3 models, 11 entities"` — the nouns whose count is not zero, so a sentence names what is there. */
const countPhrase = (counts: ReadonlyMap<string, number>): string =>
  [...counts].filter(([, n]) => n > 0).map(([noun, n]) => `${n} ${noun}`).join(", ");

/**
 * One sentence naming what changed in the model, or `""` when nothing did.
 *
 * FR-A11Y-3's first listed subject is "agent actions", and this is the channel for them. The shape of
 * the sentence follows the requirement's "without excessive announcements": it names the operation's
 * CONSEQUENCE rather than re-reading the summary, so a load says what loaded and an edit says which
 * count moved. Four outcomes, in the order a reader meets them:
 *
 *   - a different system — the whole workspace was replaced, so name it and size it;
 *   - a moved hash — a semantic edit, so name the counts that moved and the finding total;
 *   - a standing hash with more annotated objects — A1 keeps notes out of the semantic projection,
 *     so this is the one commit that leaves the revision where it was, and saying so is the whole
 *     reason it is announced;
 *   - nothing — a repaint for a view change, which is not news.
 */
function modelNews(now: ModelMemo): string {
  const before = lastModel;
  lastModel = now;
  // The boot paint. `window.mage` is not installed yet and the ready announcement follows it, so
  // there is no change to report and nothing to report it to.
  if (before === null) return "";
  if (!now.loaded) {
    return before.loaded ? "The workspace is empty again; no model is loaded." : "";
  }
  const findings = `${now.findings} validation finding(s).`;
  if (now.systemId !== before.systemId || now.title !== before.title || !before.loaded) {
    return `Loaded ${now.title}: ${countPhrase(now.counts)}. ${findings}`;
  }
  if (now.hash === before.hash) {
    if (now.annotated > before.annotated) {
      return "A note was attached. The model's revision is unchanged: a note is context, "
        + "not a constraint.";
    }
    return "";
  }
  const moved = [...now.counts]
    .filter(([noun, n]) => n !== before.counts.get(noun))
    .map(([noun, n]) => `${noun} ${before.counts.get(noun) ?? 0} to ${n}`);
  // A moved hash with no moved count is an edit in place — a relabel, a property value, a purpose.
  // Saying the revision advanced is still the thing the user could not otherwise tell.
  return moved.length === 0
    ? `The model changed in place; no count moved. ${findings}`
    : `The model changed: ${moved.join(", ")}. ${findings}`;
}

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
  paint(vm, roots);
  currentEditOptions = vm.edit;

  // Through `workspace.provenance()`, the same call `window.mage.provenance()` makes. Reading it
  // here cannot move the model: the service hands back records and no writer (UX-I6). Read once and
  // used twice — the Provenance section renders it, and the announcement counts it, because the
  // record set is the one surface an annotation-only commit moves (A1 holds the hash still).
  const provenance = workspace.provenance();

  const changed = modelNews({
    loaded: state.loaded,
    systemId: state.system.systemId,
    title: state.system.name,
    hash: state.hash,
    counts: new Map([
      ["models", state.system.models.size],
      ["entities", state.system.entities.size],
      ["relations", state.system.relations.length],
      ["machines", state.system.machines.size],
      ["machine instances", state.system.instances.length],
      ["saved questions", state.system.queries.size],
    ]),
    findings: state.findings.length,
    annotated: provenance.length,
  });
  if (changed !== "") announceModel(changed);

  const news = propertyNews(vm.properties);
  if (news !== "") announceProperties(news);

  // -- the diagram. One subject at a time, chosen by the user or by `window.mage.view.focus`.
  //
  // No evidence is passed: the property list answers every saved question at once, so there is no
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
  // §5.1: the model being viewed states its purpose beside the picture, above the picture, in text.
  paintPrincipal(vm.principal, principalPurpose);
  paintDiagram(view?.accessible ?? null, view?.tree ?? null, { text: diagramText, canvas });

  paintProvenance(provenance, provenanceList);

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
  fillSelect(selects.askForm, vm.edit.graphForms);
  fillSelect(selects.askRelation, vm.edit.relationTypes);
  // An endpoint may be left unspecified -- the engine then takes every node on that side -- so the
  // empty option is first and says what it means rather than reading as a missing choice.
  const anyEndpoint = { value: "", label: "any entity" };
  fillSelect(selects.askFrom, [anyEndpoint, ...vm.edit.entities]);
  fillSelect(selects.askTo, [anyEndpoint, ...vm.edit.entities]);
  fillSelect(selects.askQuantifier, vm.edit.quantifiers);
  fillSelect(selects.saveExpect, vm.edit.expectations);
  fillSelect(selects.retractTarget, vm.edit.properties);
  fillDatalist(byId("property-names"), vm.edit.propertyNames);
  fillDatalist(byId("entity-ids"), vm.edit.entityIds);
  refreshRelationEndpoints();

  for (const form of editForms) form.disabled = !state.loaded;
  hypothesisBar.hidden = state.hypothesis === null;
  byId<HTMLButtonElement>("undo").disabled = !state.canUndo;
  byId<HTMLButtonElement>("redo").disabled = !state.canRedo;
  // Export and Run need a model, exactly as Undo needs a revision to go back to. Both shipped
  // enabled on a pristine page, so a keyboard user reached two controls that could do nothing
  // before reaching the one that could (`BASELINE-a11y-261002.md` §6, F-2). The page already had
  // the pattern — `disabled` on Undo, `fieldset[disabled]` over the whole Edit section — and these
  // two were the exception rather than a different judgement.
  byId<HTMLButtonElement>("export").disabled = !state.loaded;
  byId<HTMLButtonElement>("run").disabled = !state.loaded;

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

// -- the three ways in (section 3) -------------------------------------------------------------
//
// Create, load an example, import. All three end at `Workspace.load`, which is why the registry
// treats the first as a second affordance of `import` and the second as a capability whose service
// delegates to it. There is no fourth path, and an example does not get one.

byId("new-system").addEventListener("click", () => {
  const r = workspace.load(NEW_SYSTEM);
  announce(r.ok
    ? "New, empty model system. Add a model and the engineering question it answers."
    : `The new system did not load: ${r.findings.map((f) => f.message).join("; ")}`);
});

/** Show the chosen example's description. Section 3 asks for it before or as the example loads. */
function showExampleDescription(): void {
  paintExampleDescription(descriptions.get(selects.exampleChoice.value) ?? null, exampleDescription);
}

selects.exampleChoice.addEventListener("change", () => {
  showExampleDescription();
  const chosen = descriptions.get(selects.exampleChoice.value);
  if (chosen !== undefined) {
    announce(`${chosen.title}. ${chosen.summary} ${chosen.models.length} model(s). `
      + "Press Load this example to open it.");
  }
});

byId("example-load").addEventListener("click", () => {
  const id = selects.exampleChoice.value;
  const chosen = descriptions.get(id);
  if (chosen === undefined) {
    announce("No example is available to load; open a .mage.yaml instead.");
    return;
  }
  void examples.load(id)
    .then((r) => {
      // Loading an example replaces the whole model, which is as consequential as an edit gets --
      // so it is announced, and the announcement says the result is an ordinary workspace rather
      // than a demonstration the user cannot touch.
      announce(r.ok
        ? `Loaded ${chosen.title}: ${workspace.state.system.models.size} model(s), `
          + `${workspace.state.findings.length} validation finding(s). `
          + "This is an ordinary editable workspace."
        : `${chosen.title} did not load: ${r.findings.map((f) => f.message).join("; ")}`);
    })
    .catch((error: unknown) => {
      const problem = `${chosen.title} could not be read: ${String(error)}`;
      paintExampleProblem(problem, exampleDescription);
      announce(problem);
    });
});

/**
 * Fill the menu from the examples themselves.
 *
 * The option labels are each example's own title, so the menu cannot name an example one thing while
 * its description names it another. The cost is one read per example at boot; the alternative is a
 * hand-written label beside a derived description, which is the drift this avoids.
 */
void examples.describeAll()
  .then((all) => {
    for (const d of all) descriptions.set(d.id, d);
    fillSelect(selects.exampleChoice, all.map((d) => ({ value: d.id, label: d.title })));
    showExampleDescription();
  })
  .catch((error: unknown) => {
    const problem = "The shipped examples could not be read, so none is offered: "
      + `${String(error)}. Create a new model system or open a .mage.yaml instead.`;
    paintExampleProblem(problem, exampleDescription);
    announce(problem);
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
  announce(n === 0
    ? "This model system asserts no properties yet."
    : `Re-evaluated ${n} propert${n === 1 ? "y" : "ies"} against the current revision.`);
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

// -- properties: ask, save, retract (sections 9, 10, 13) ---------------------------------------
//
// The §23 flow, in order: ask a question, read the answer with its grounding, save the proposition
// as a property. The answer panel and the property list use ONE renderer, so a saved property reads
// exactly as the answer did -- saving changes how long the claim lasts, not how it reads.

/** The ask form's current contents. Read in one place, so the Ask and Save buttons cannot disagree. */
const askRequest = (): AskRequest => ({
  form: selects.askForm.value,
  relation: selects.askRelation.value,
  from: selects.askFrom.value,
  to: selects.askTo.value,
  quantifier: selects.askQuantifier.value,
  maxHops: input("ask-max-hops").value,
});

byId("ask-go").addEventListener("click", () => {
  const proposition = input("save-property-proposition").value.trim();
  const planned = planAsk(askRequest(), proposition);
  if (!planned.ok) {
    paintAnswer(null, planned.problem, askAnswer);
    announce(planned.problem);
    return;
  }
  // `workspace.evaluate` is the SAME service `window.mage.ask` calls, so the grounding a person
  // reads here is the grounding an agent reads -- UX-I2 for a panel whose whole content is a
  // semantic result. Nothing is saved: a query is transient until someone says otherwise (§3.4).
  const answer = workspace.evaluate(proposition === "" ? "(unsaved)" : proposition, planned.query);
  paintAnswer(propertyRow(answer), "", askAnswer);
  announce(`Answered: ${answer.status.replace(/-/g, " ")}. `
    + `${answer.grounds.length} model(s) or machine(s) establish it. Nothing is saved yet.`);
});

byId("save-property-go").addEventListener("click", () => submitEdit({
  form: "save-property",
  id: input("save-property-id").value,
  proposition: input("save-property-proposition").value,
  expect: selects.saveExpect.value,
  ask: askRequest(),
}));

byId("retract-property-go").addEventListener("click", () => submitEdit({
  form: "retract-property",
  id: selects.retractTarget.value,
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
  examples,
);

Object.defineProperty(window, "mage", { value: api, writable: false, configurable: false });

repaint();
announce(`MAGE Model Workbench ready. Agent API ${AGENT_API_VERSION} at window.mage.`);
