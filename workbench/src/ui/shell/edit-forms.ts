/**
 * The ten editing fieldsets, and the one funnel every edit goes through.
 *
 * **This module is a holding pen, and saying so is the point.** Correction 4 is explicit: "Edit"
 * cannot be a 50-control form, and these ten always-visible fieldsets are `window.mage` rendered as
 * HTML. They are replaced by a `+ Add` menu, per-selection actions in the inspector, and a command
 * palette — wave 2a, in `palette.ts` and `edit-dialogs.ts`. Wave 2c deletes the
 * authoritative-vs-hypothesis radios in favour of the review surface.
 *
 * Wave 0 is a relocation, so the forms move unchanged. `DESIGN-shell-261002.md` §5 gives them no
 * region, because in the finished shell they have none; leaving them in the composition root would
 * have made `main.ts` the file waves 2a and 2c both have to edit, which is the hotspot wave 0 exists
 * to break. So they get a module of their own that those waves drain and delete.
 *
 * **`submitEdit` is the funnel, and it is exported.** That single funnel is UX-I3 —
 * authoritative-state convergence — in the UI: one operation, one envelope, handed to the same
 * `Workspace.transact` that `window.mage.transact` calls, so there is no human mutation path beside
 * the agent one. The ask bar's Save and Retract go through it too, which is why it is a value this
 * module hands out rather than a private function. Routing to a hypothesis changes WHICH branch the
 * transaction lands on, never how it is validated.
 */
import { paintEditResult, fillSelect } from "../render-dom.ts";
import { planEdit } from "../view-model.ts";
import type { EditOptions, EditRequest } from "../view-model.ts";
import { byId, input, mountIf, sel } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";

/** The one mutation funnel, handed to every region that submits an operation. */
export type SubmitEdit = (request: EditRequest) => void;

export interface EditForms extends ShellRegion {
  readonly submitEdit: SubmitEdit;
}

export function mountEditForms(ctx: ShellContext): EditForms {
  const region = byId("edit");
  const editResult = byId("edit-result");

  const addStateMachine = sel("add-state-machine");
  const deleteElement = sel("delete-element-target");
  const relationModel = sel("add-relation-model");
  const relationFrom = sel("add-relation-from");
  const relationTo = sel("add-relation-to");
  const relationType = sel("add-relation-type");
  const deleteRelation = sel("delete-relation-target");
  const labelTarget = sel("set-label-target");
  const propertyTarget = sel("set-property-target");
  const propertyKind = sel("set-property-kind");
  const propertyDomain = sel("set-property-domain");
  const deleteModel = sel("delete-model-target");
  const noteTarget = sel("add-note-target");
  const noteKind = sel("add-note-kind");

  /** The forms that may only be used once a model is loaded. Disabling the fieldset disables all of it. */
  const fieldsets = [
    "edit-mode", "form-add-entity", "form-add-state", "form-delete-element",
    "form-add-relation", "form-delete-relation", "form-set-label", "form-set-property",
    "form-add-model", "form-delete-model", "form-add-note",
  ].map((id) => byId<HTMLFieldSetElement>(id));

  /** Last painted options, so the model-change handler can re-narrow endpoints without a repaint. */
  let currentEditOptions: EditOptions | null = null;

  /**
   * The endpoints a relation may join, narrowed to the chosen model's own entities.
   *
   * This is the licensing the capability registry asked for: `add-relation` does not add an entity
   * to a model, so a relation between entities the model does not contain is a relation no view of
   * that model will ever draw. Offering only what the model contains refuses that by construction
   * rather than by a finding after the fact.
   */
  function refreshRelationEndpoints(): void {
    const options = currentEditOptions;
    if (options === null) return;
    const inModel = options.modelEntities.get(relationModel.value) ?? options.entities;
    fillSelect(relationFrom, inModel);
    fillSelect(relationTo, inModel);
  }

  const submitEdit: SubmitEdit = (request) => {
    const plan = planEdit(request);
    if (!plan.ok) {
      // The UI's own refusal, before the transaction layer sees it: a person who left a box blank is
      // better served by "an entity needs an id" than by the schema's phrasing of the same fact.
      paintEditResult(editResult, plan.problem, []);
      ctx.announce(plan.problem);
      return;
    }

    const asHypothesis = input("target-hypothesis").checked;
    const label = input("hypothesis-label").value.trim();
    if (asHypothesis && label === "") {
      const problem = "A hypothesis needs a name, so you can tell which one you are reviewing.";
      paintEditResult(editResult, problem, []);
      ctx.announce(problem);
      return;
    }
    const rationale = input("edit-rationale").value.trim();
    const transaction = {
      transaction: {
        base: ctx.workspace.state.hash,
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
      ? ctx.workspace.openHypothesis(label, transaction)
      : ctx.workspace.transact(transaction);

    const applied = plan.operations.map((o) => o.op).join(" + ");
    if (result.ok) {
      paintEditResult(editResult, "", []);
      // An annotation-only edit commits WITHOUT advancing the semantic revision (A1), which is
      // surprising enough that the announcement says so. A user who edits and sees the hash stand
      // still should be told why rather than left to suspect the click was lost.
      const annotationOnly = plan.operations.every((o) => o.op === "add-note");
      ctx.announce(asHypothesis
        ? `Hypothesis "${label}" is open. The authoritative model is unchanged until you accept it.`
        : `${applied} applied. ${ctx.workspace.state.findings.length} validation finding(s).`
          + (annotationOnly ? " The model's revision is unchanged: a note is context, not a constraint." : ""));
      return;
    }
    // A rejection carries the findings that explain it, and losing them leaves a person staring at a
    // control that did nothing. They are reported here rather than in the Validation section, which
    // describes the model as it stands — not an edit that never happened.
    paintEditResult(editResult, `Rejected: ${applied} changed nothing.`, result.findings);
    ctx.announce(`Edit rejected. ${result.findings[0]?.message ?? "No reason was reported."}`);
  };

  relationModel.addEventListener("change", () => refreshRelationEndpoints());

  byId("add-entity-go").addEventListener("click", () => submitEdit({
    form: "add-entity",
    id: input("add-entity-id").value,
    type: input("add-entity-type").value,
    label: input("add-entity-label").value,
  }));

  byId("add-state-go").addEventListener("click", () => submitEdit({
    form: "add-state",
    machine: addStateMachine.value,
    state: input("add-state-id").value,
  }));

  byId("delete-element-go").addEventListener("click", () => submitEdit({
    form: "delete-element",
    element: deleteElement.value,
    cascade: input("delete-element-cascade").checked,
  }));

  byId("add-relation-go").addEventListener("click", () => submitEdit({
    form: "add-relation",
    model: relationModel.value,
    from: relationFrom.value,
    to: relationTo.value,
    type: relationType.value,
  }));

  byId("delete-relation-go").addEventListener("click", () => submitEdit({
    form: "delete-relation",
    relation: deleteRelation.value,
  }));

  byId("set-label-go").addEventListener("click", () => submitEdit({
    form: "set-label",
    id: labelTarget.value,
    label: input("set-label-value").value,
  }));

  byId("set-property-go").addEventListener("click", () => {
    const kind = propertyKind.value;
    submitEdit({
      form: "set-property",
      id: propertyTarget.value,
      name: input("set-property-name").value,
      value: input("set-property-value").value,
      valueKind: kind === "integer" || kind === "boolean" ? kind : "string",
      domain: propertyDomain.value,
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
    model: deleteModel.value,
  }));

  byId("add-note-go").addEventListener("click", () => submitEdit({
    form: "add-note",
    target: noteTarget.value,
    kind: noteKind.value,
    text: input("add-note-text").value,
  }));

  return {
    submitEdit,
    paint: (frame: ShellFrame) => {
      mountIf(region, frame.state.loaded);
      currentEditOptions = frame.vm.edit;

      fillSelect(addStateMachine, frame.vm.edit.machines);
      fillSelect(deleteElement, frame.vm.edit.elements);
      fillSelect(relationModel, frame.vm.edit.models);
      fillSelect(relationType, frame.vm.edit.relationTypes);
      fillSelect(deleteRelation, frame.vm.edit.relations);
      fillSelect(labelTarget, frame.vm.edit.labelled);
      fillSelect(propertyTarget, frame.vm.edit.entities);
      fillSelect(propertyDomain, [{ value: "", label: "none" }, ...frame.vm.edit.domains]);
      fillSelect(deleteModel, frame.vm.edit.models);
      fillSelect(noteTarget, frame.vm.edit.annotatable);
      fillSelect(noteKind, frame.vm.edit.noteKinds);
      fillDatalist(byId("property-names"), frame.vm.edit.propertyNames);
      fillDatalist(byId("entity-ids"), frame.vm.edit.entityIds);
      refreshRelationEndpoints();

      for (const f of fieldsets) f.disabled = !frame.state.loaded;
    },
  };
}

/**
 * Refill a `<datalist>` of bare ids. A hint beside a free-text field, not a constraint — the
 * transaction still validates, and V3 names an id the system does not declare.
 *
 * Takes the element rather than its id, mirroring `fillSelect`, so every id in this file stays a
 * literal `byId(...)` call site — which is what the page-contract test scans to prove index.html
 * carries every element the shell demands.
 */
function fillDatalist(root: HTMLElement, values: readonly string[]): void {
  root.replaceChildren(...values.map((value) => {
    const option = document.createElement("option");
    option.value = value;
    return option;
  }));
}
