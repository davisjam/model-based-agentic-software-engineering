/**
 * Contextual editing: one catalogue of operations, three places a person meets them, one dialog.
 *
 * Correction 4 of `requirements-progressive-disclosure-261002.md` is blunt about what this replaces:
 * "'Edit' cannot be a 50-control form", and the ten always-visible fieldsets are "basically
 * `window.mage` rendered as HTML. That's exactly what we didn't want." The replacement it names is
 * not fewer operations — the machine API "can remain orthogonal and exhaustive" — but a different
 * PLACE for each: "the human UX should expose the operation where the user naturally encounters its
 * object."
 *
 * So the module is organised around one idea: **an operation is declared once, as an `EditAction`,
 * and every surface derives from that declaration.** The `+ Add` menu renders the additive actions;
 * the inspector renders the actions that apply to the current selection, prefilled with it; the
 * palette lists all of them with their preconditions; and the dialog builds the parameter form from
 * the same field list. Four surfaces that disagreed about what `add-relation` needs would be four
 * places to fix one defect — the failure the ten fieldsets already had, since each one spelled its
 * own option lists and its own refusals.
 *
 * **Why a typed catalogue rather than ten functions.** The old module was ten `addEventListener`
 * blocks, which is a shape that cannot answer a question the palette has to ask: *what can I do
 * right now, and if I cannot do this, why not?* A precondition stated as data is answerable; a
 * precondition implicit in which fieldset happens to be enabled is not. `EditAction.needs` is that
 * datum, and it is drawn from the same closed vocabulary the capability registry's navigation paths
 * use, so wave 1d can declare a path for each of these controls without re-deriving the condition.
 *
 * **What it does NOT own.** The mutation funnel stays in `edit-forms.ts`: one operation, one
 * envelope, one `Workspace.transact`, shared with the ask bar's Save and Retract (UX-I3). This
 * module decides which operation and with what arguments, and hands it over.
 */
import { fillSelect } from "../render-dom.ts";
import type { Choice, EditOptions, EditRequest } from "../view-model.ts";
import { byId, mountIf, sel } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { selectionKind } from "./selection.ts";
import type { SelectionKind } from "./selection.ts";
import type { EditOutcome, SubmitEdit } from "./edit-forms.ts";
import type { CanonicalSystem } from "../../ir/types.ts";

/** The ten editing operations the transaction vocabulary offers a form for. */
export type EditForm =
  | "add-entity" | "add-state" | "add-relation" | "add-model" | "add-note"
  | "delete-element" | "delete-relation" | "delete-model"
  | "set-label" | "set-property";

/**
 * What must be true before an action can run.
 *
 * The same closed set `DESIGN-shell-261002.md` §2.2 gives `NavPrecondition`, narrowed to the five
 * members an editing action can need. Closed on purpose: the palette reports the reason an action
 * is unavailable, and a free-string reason is a sentence nobody checks.
 */
export type ActionPrecondition =
  | "loaded" | "selection:element" | "selection:relation" | "selection:model" | "selection:machine";

/** Which option list in `EditOptions` fills a choice field. */
export type OptionSource =
  | "entities" | "machines" | "models" | "relationTypes" | "domains" | "elements"
  | "labelled" | "relations" | "annotatable" | "noteKinds" | "value-kinds";

export interface Field {
  /** The key this field's value arrives under in `build`. Also the dialog input's id suffix. */
  readonly name: string;
  readonly label: string;
  readonly kind: "text" | "choice" | "check";
  /** Choice fields only: where the options come from. */
  readonly source?: OptionSource;
  /** Text fields only: the id of a shipped `<datalist>` offering type-ahead. */
  readonly datalist?: string;
  /** Choice fields only: offer an explicit "none", because a blank option and a missing one differ. */
  readonly optional?: true;
  readonly hint?: string;
}

/** What the dialog collected: text and choice values by field name, plus the ticked checkboxes. */
export interface FieldValues {
  readonly text: ReadonlyMap<string, string>;
  readonly checked: ReadonlySet<string>;
}

export interface EditAction {
  readonly form: EditForm;
  /** The dialog's heading, and the palette row's label. Imperative, and it names the object. */
  readonly label: string;
  /** The confirm button's text. A verb phrase, so the button says what pressing it does. */
  readonly verb: string;
  readonly needs: ActionPrecondition;
  /** Why the operation is shaped the way it is — the hint the dialog shows under its heading. */
  readonly hint: string;
  readonly fields: readonly Field[];
  readonly build: (values: FieldValues) => EditRequest;
}

const text = (v: FieldValues, name: string): string => v.text.get(name) ?? "";

/**
 * The catalogue.
 *
 * The hints are the ones the ten fieldsets carried, kept verbatim where they still hold: each one
 * states a licensing fact a user cannot infer from the field names, and losing them in a move from
 * a form to a dialog would be the quiet half of a redesign regression.
 */
export const EDIT_ACTIONS: readonly EditAction[] = [
  {
    form: "add-entity",
    label: "Add an entity",
    verb: "Add the entity",
    needs: "loaded",
    hint: "Entities are the one identity namespace. The id is immutable once it exists.",
    fields: [
      { name: "id", label: "Id", kind: "text" },
      { name: "type", label: "Type (optional)", kind: "text" },
      { name: "label", label: "Label (optional)", kind: "text" },
    ],
    build: (v) => ({ form: "add-entity", id: text(v, "id"), type: text(v, "type"), label: text(v, "label") }),
  },
  {
    form: "add-state",
    label: "Add a state",
    verb: "Add the state",
    needs: "loaded",
    hint: "A control state of an existing machine. There is no operation for adding a machine itself.",
    fields: [
      { name: "machine", label: "Machine", kind: "choice", source: "machines" },
      { name: "state", label: "State name", kind: "text" },
    ],
    build: (v) => ({ form: "add-state", machine: text(v, "machine"), state: text(v, "state") }),
  },
  {
    form: "add-relation",
    label: "Connect two entities",
    verb: "Add the relation",
    needs: "loaded",
    // The licensing the capability registry asked for, and the reason the model field comes first:
    // the endpoint lists narrow to the chosen model's own entities, because `add-relation` does not
    // add an entity to a model, so an edge between two entities the model does not contain is an
    // edge no view of that model will ever draw.
    hint: "A relation is asserted BY a model. The endpoints offered are the ones that model "
      + "contains — a relation between entities it does not contain is one no view of it will draw.",
    fields: [
      { name: "model", label: "Model", kind: "choice", source: "models" },
      { name: "from", label: "From", kind: "choice", source: "entities" },
      { name: "to", label: "To", kind: "choice", source: "entities" },
      { name: "type", label: "Relation type", kind: "choice", source: "relationTypes" },
    ],
    build: (v) => ({
      form: "add-relation", model: text(v, "model"), from: text(v, "from"),
      to: text(v, "to"), type: text(v, "type"),
    }),
  },
  {
    form: "add-model",
    label: "Add a model",
    verb: "Add the model",
    needs: "loaded",
    hint: "A model states one engineering question. The question is required here even though the "
      + "operation does not carry one (UX-I4): a model whose purpose nobody wrote is a diagram.",
    fields: [
      { name: "id", label: "Id", kind: "text" },
      { name: "label", label: "Label (optional)", kind: "text" },
      { name: "question", label: "The engineering question this model answers", kind: "text" },
      {
        name: "entities", label: "Entities (optional, separated by commas)", kind: "text",
        datalist: "entity-ids",
      },
    ],
    build: (v) => ({
      form: "add-model", id: text(v, "id"), label: text(v, "label"),
      question: text(v, "question"), entities: text(v, "entities"),
    }),
  },
  {
    form: "add-note",
    label: "Attach a note",
    verb: "Attach the note",
    needs: "loaded",
    hint: "A note is context, not a constraint: it does not advance the model's revision and it "
      + "cannot invalidate a pending transaction. Entities, models and relations can carry one.",
    fields: [
      { name: "target", label: "Attach to", kind: "choice", source: "annotatable" },
      { name: "kind", label: "Kind", kind: "choice", source: "noteKinds" },
      { name: "text", label: "Note", kind: "text" },
    ],
    build: (v) => ({ form: "add-note", target: text(v, "target"), kind: text(v, "kind"), text: text(v, "text") }),
  },
  {
    form: "set-label",
    label: "Rename",
    verb: "Change the label",
    needs: "loaded",
    hint: "The label, not the id — an id is immutable. The list says which namespace each choice "
      + "came from, because the operation takes a bare id and an id naming both an entity and a "
      + "machine is genuinely ambiguous.",
    fields: [
      { name: "id", label: "Element", kind: "choice", source: "labelled" },
      { name: "label", label: "New label", kind: "text" },
    ],
    build: (v) => ({ form: "set-label", id: text(v, "id"), label: text(v, "label") }),
  },
  {
    form: "set-property",
    label: "Set a property",
    verb: "Set the property",
    needs: "loaded",
    hint: "Properties are typed. The kind is chosen explicitly because 30 and \"30\" are different "
      + "values and guessing which one was meant is how a comparison silently stops working.",
    fields: [
      { name: "id", label: "Entity", kind: "choice", source: "entities" },
      { name: "name", label: "Property name", kind: "text", datalist: "property-names" },
      { name: "valueKind", label: "Kind", kind: "choice", source: "value-kinds" },
      { name: "value", label: "Value", kind: "text" },
      { name: "domain", label: "Domain (optional)", kind: "choice", source: "domains", optional: true },
      { name: "unset", label: "clear this property instead of setting it", kind: "check" },
    ],
    build: (v) => {
      const kind = text(v, "valueKind");
      return {
        form: "set-property", id: text(v, "id"), name: text(v, "name"), value: text(v, "value"),
        valueKind: kind === "integer" || kind === "boolean" ? kind : "string",
        domain: text(v, "domain"), unset: v.checked.has("unset"),
      };
    },
  },
  {
    form: "delete-element",
    label: "Delete an element",
    verb: "Delete the element",
    needs: "loaded",
    hint: "Refused while anything still refers to it, unless you ask for the references to go too.",
    fields: [
      { name: "element", label: "Element", kind: "choice", source: "elements" },
      { name: "cascade", label: "also delete everything that refers to it", kind: "check" },
    ],
    build: (v) => ({
      form: "delete-element", element: text(v, "element"), cascade: v.checked.has("cascade"),
    }),
  },
  {
    form: "delete-relation",
    label: "Remove a relation",
    verb: "Remove the relation",
    needs: "loaded",
    hint: "Relations have no ids of their own, so one is addressed by the model that asserts it "
      + "together with its endpoints and type.",
    fields: [{ name: "relation", label: "Relation", kind: "choice", source: "relations" }],
    build: (v) => ({ form: "delete-relation", relation: text(v, "relation") }),
  },
  {
    form: "delete-model",
    label: "Remove a model",
    verb: "Remove the model",
    needs: "loaded",
    hint: "The model and its relations. The entities it mentions are the system's, not the "
      + "model's, and they stay.",
    fields: [{ name: "model", label: "Model", kind: "choice", source: "models" }],
    build: (v) => ({ form: "delete-model", model: text(v, "model") }),
  },
];

const action = (form: EditForm): EditAction => {
  const found = EDIT_ACTIONS.find((a) => a.form === form);
  if (found === undefined) throw new Error(`no EditAction declares '${form}'`);
  return found;
};

/** The five additive operations, in the order the `+ Add` menu offers them. */
export const ADD_MENU: readonly EditForm[] =
  ["add-entity", "add-state", "add-relation", "add-model", "add-note"];

/**
 * One contextual action, as a selection makes it available.
 *
 * `label` is re-worded per context rather than reused from the catalogue, because the catalogue's
 * label names the operation ("Connect two entities") and the inspector's names the act on THIS
 * object ("Connect Analytics to…"). `prefill` is what the selection already determines, which is
 * the substance of correction 4: the user encountered the object, so the dialog should not ask them
 * to find it again in a select.
 */
export interface ContextualAction {
  readonly form: EditForm;
  readonly label: string;
  readonly prefill: ReadonlyMap<string, string>;
  /** The stable button in `#inspector-actions` that offers it. */
  readonly element: string;
}

const prefill = (...pairs: readonly (readonly [string, string])[]): ReadonlyMap<string, string> =>
  new Map(pairs);

/**
 * What a selection can be edited with, derived from the selection and the system.
 *
 * Pure, and deliberately the ONE place the per-kind sets are written: the inspector renders this,
 * the palette's availability reads it, and `test/shell-edit.test.ts` asserts it against systems
 * loaded from the shipped examples rather than against a transcript of what the pane says today.
 *
 * **Two entries correction 4 asks for are absent, and the kernel is why.** "Selected model → Edit
 * purpose" needs an operation that rewrites a model's engineering question, and "Selected relation
 * → Edit" needs one that changes a relation in place. The transaction vocabulary has neither
 * (`EditRequest` is the whole of it), and `set-label` reaches a model's LABEL, not its question. A
 * disabled button or a dialog that quietly deleted and re-added would both be worse than the
 * absence: one is a control that cannot work, the other is an edit the user did not ask for.
 */
export function contextualActions(
  system: CanonicalSystem, selection: readonly string[],
): readonly ContextualAction[] {
  const kind = selectionKind(system, selection);
  const subject = selection[0] ?? "";
  switch (kind) {
    case "entity":
      return [
        { form: "set-label", label: `Rename ${subject}…`, prefill: prefill(["id", subject]), element: "act-rename" },
        {
          form: "set-property", label: `Set a property on ${subject}…`,
          prefill: prefill(["id", subject]), element: "act-set-property",
        },
        {
          form: "add-relation", label: `Connect ${subject} to…`,
          prefill: prefill(["from", subject]), element: "act-connect",
        },
        {
          form: "add-note", label: `Attach a note to ${subject}…`,
          prefill: prefill(["target", `entity:${subject}`]), element: "act-note",
        },
        {
          form: "delete-element", label: `Delete ${subject}…`,
          prefill: prefill(["element", `entity:${subject}`]), element: "act-delete-element",
        },
      ];
    case "relation":
      return [
        {
          form: "add-note", label: "Attach a note to this relation…",
          prefill: prefill(["target", subject]), element: "act-note",
        },
        {
          form: "delete-relation", label: "Delete this relation…",
          prefill: prefill(["relation", subject]), element: "act-delete-relation",
        },
      ];
    case "model": {
      const id = subject.replace(/^model:/, "");
      return [
        { form: "set-label", label: `Rename ${id}…`, prefill: prefill(["id", id]), element: "act-rename" },
        {
          form: "add-relation", label: `Connect two entities in ${id}…`,
          prefill: prefill(["model", id]), element: "act-connect",
        },
        {
          form: "add-note", label: `Attach a note to ${id}…`,
          prefill: prefill(["target", `model:${id}`]), element: "act-note",
        },
        {
          form: "delete-model", label: `Delete the model ${id}…`,
          prefill: prefill(["model", id]), element: "act-delete-model",
        },
      ];
    }
    case "machine": {
      const id = subject.replace(/^machine:/, "");
      return [
        { form: "set-label", label: `Rename ${id}…`, prefill: prefill(["id", id]), element: "act-rename" },
      ];
    }
    case "state":
      return [
        {
          form: "delete-element", label: "Delete this state…",
          prefill: prefill(["element", subject]), element: "act-delete-element",
        },
      ];
    case "none":
    case "unresolved":
      return [];
  }
}

/** Is an action's precondition met by the current selection? The palette's availability predicate. */
export function satisfies(need: ActionPrecondition, loaded: boolean, kind: SelectionKind): boolean {
  if (!loaded) return false;
  switch (need) {
    case "loaded": return true;
    case "selection:element": return kind === "entity" || kind === "state";
    case "selection:relation": return kind === "relation";
    case "selection:model": return kind === "model";
    case "selection:machine": return kind === "machine";
  }
}

// --------------------------------------------------------------------------------------------
// The dialog
// --------------------------------------------------------------------------------------------

/** What opening a dialog needs: which operation, and what the selection already determined. */
export type OpenDialog = (form: EditForm, prefill?: ReadonlyMap<string, string>) => void;

const KIND_CHOICES: readonly Choice[] = [
  { value: "string", label: "text" },
  { value: "integer", label: "integer" },
  { value: "boolean", label: "boolean" },
];

/**
 * The options a choice field offers, from the one `EditOptions` the view model computed this paint.
 *
 * `add-relation`'s endpoints are narrowed by the chosen model, which is why this takes the current
 * model value rather than reading `options.entities` for every entity field: the narrowing is the
 * licensing fact the old form spent a function on, and it belongs to the field list, not to a
 * change listener bolted beside it.
 */
function optionsFor(source: OptionSource, options: EditOptions, model: string): readonly Choice[] {
  if (source === "value-kinds") return KIND_CHOICES;
  if (source === "entities") return options.modelEntities.get(model) ?? options.entities;
  return options[source];
}

export interface EditDialogs extends ShellRegion {
  readonly open: OpenDialog;
}

/**
 * Mount the dialog, the `+ Add` menu, the inspector's action bar — and, until wave 2d re-derives
 * six keyboard drives, the ten legacy fieldsets.
 */
export function mountEditDialogs(ctx: ShellContext, submitEdit: SubmitEdit): EditDialogs {
  const dialog = byId<HTMLDialogElement>("edit-dialog");
  const heading = byId("edit-dialog-h");
  const hint = byId("edit-dialog-hint");
  const fieldHost = byId("edit-dialog-fields");
  const problem = byId("edit-dialog-problem");
  const confirm = byId<HTMLButtonElement>("edit-dialog-confirm");
  const addMenu = byId<HTMLDetailsElement>("add-menu");
  const actionBar = byId("inspector-actions");
  const actionHint = byId("inspector-actions-hint");

  /** The options of the last paint. A dialog opens between paints, so it reads the current frame's. */
  let options: EditOptions | null = null;
  /** What is open, so the confirm button knows which operation it is submitting. */
  let current: EditAction | null = null;

  const fieldId = (a: EditAction, f: Field): string => `edit-dialog-${a.form}-${f.name}`;

  /**
   * Render one operation's parameter form.
   *
   * Built per open rather than shipped, because ten operations' fields are genuinely ten different
   * forms and shipping all of them is the 50-control page correction 4 refuses. The shell's
   * "mount once" rule is about LISTENERS, and the only listeners here are the two shipped buttons
   * plus one delegated `change` for the model narrowing — nothing is bound to generated markup.
   */
  function renderFields(a: EditAction, filled: ReadonlyMap<string, string>): void {
    const opts = options;
    const model = filled.get("model") ?? (opts === null ? "" : opts.models[0]?.value ?? "");
    const frag = document.createDocumentFragment();
    for (const f of a.fields) {
      const id = fieldId(a, f);
      if (f.kind === "check") {
        const wrap = document.createElement("div");
        wrap.className = "check";
        const box = document.createElement("input");
        box.type = "checkbox";
        box.id = id;
        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = f.label;
        wrap.append(box, label);
        frag.append(wrap);
        continue;
      }
      const label = document.createElement("label");
      label.className = "field";
      label.htmlFor = id;
      const span = document.createElement("span");
      span.textContent = f.label;
      label.append(span);
      if (f.kind === "choice") {
        const select = document.createElement("select");
        select.id = id;
        select.dataset["field"] = f.name;
        const choices = opts === null ? [] : optionsFor(f.source ?? "entities", opts, model);
        fillSelect(select, f.optional === true ? [{ value: "", label: "none" }, ...choices] : choices);
        const want = filled.get(f.name);
        if (want !== undefined) select.value = want;
        label.append(select);
      } else {
        const box = document.createElement("input");
        box.type = "text";
        box.id = id;
        box.autocomplete = "off";
        if (f.datalist !== undefined) box.setAttribute("list", f.datalist);
        box.value = filled.get(f.name) ?? "";
        label.append(box);
      }
      frag.append(label);
    }
    fieldHost.replaceChildren(frag);
  }

  /** Read the generated form back. The dialog's fields are the only source; nothing is remembered. */
  function collect(a: EditAction): FieldValues {
    const values = new Map<string, string>();
    const checked = new Set<string>();
    for (const f of a.fields) {
      const node = document.getElementById(fieldId(a, f));
      if (node === null) continue;
      if (f.kind === "check") {
        if ((node as HTMLInputElement).checked) checked.add(f.name);
      } else {
        values.set(f.name, (node as HTMLInputElement | HTMLSelectElement).value);
      }
    }
    return { text: values, checked };
  }

  const open: OpenDialog = (form, filled) => {
    const a = action(form);
    current = a;
    heading.textContent = a.label;
    hint.textContent = a.hint;
    problem.replaceChildren();
    confirm.textContent = a.verb;
    renderFields(a, filled ?? new Map());
    addMenu.open = false;
    dialog.showModal();
    // The platform traps focus and returns it on close; it does not CHOOSE where focus lands or say
    // that anything happened. Both are ours: the first field, so a keyboard user types immediately,
    // and one polite sentence, because opening a modal is exactly the consequential change
    // FR-A11Y-3 asks to be narrated.
    fieldHost.querySelector<HTMLElement>("input, select")?.focus();
    ctx.announce(`${a.label}. ${a.fields.length} field(s), then ${a.verb}. Escape closes without editing.`);
  };

  /** Show a refusal inside the dialog, and keep it open with everything the user typed intact. */
  function refuse(outcome: Extract<EditOutcome, { ok: false }>): void {
    const p = document.createElement("p");
    p.className = "refusal";
    p.textContent = outcome.problem;
    const nodes: HTMLElement[] = [p];
    if (outcome.findings.length > 0) {
      const list = document.createElement("ul");
      for (const f of outcome.findings) {
        const item = document.createElement("li");
        item.textContent = f.message;
        list.append(item);
      }
      nodes.push(list);
    }
    problem.replaceChildren(...nodes);
    // Not focused: moving the caret onto a message a screen reader is already reading is the focus
    // theft FR-A11Y-3 names. The funnel announces the refusal through `#live`.
  }

  confirm.addEventListener("click", () => {
    const a = current;
    if (a === null) return;
    const outcome = submitEdit(a.build(collect(a)));
    if (outcome.ok) {
      dialog.close();
      return;
    }
    refuse(outcome);
  });

  byId("edit-dialog-cancel").addEventListener("click", () => dialog.close());

  // The model narrowing, as ONE delegated listener on the host rather than a handler bound to a
  // select this paint created. `add-relation`'s endpoints depend on the chosen model, so changing
  // the model re-renders the form — keeping whatever is already in it, because re-rendering a form
  // a user has half-filled and silently emptying it is worse than not narrowing at all.
  fieldHost.addEventListener("change", (event) => {
    const a = current;
    const from = event.target;
    if (a === null || !(from instanceof HTMLSelectElement) || from.dataset["field"] !== "model") return;
    renderFields(a, collect(a).text);
  });

  dialog.addEventListener("close", () => {
    current = null;
    // Focus returns to the opener by the platform. Saying so is the point of the announcement: a
    // dismissed dialog that says nothing reads as a control that did nothing.
    ctx.announce("Dialog closed.");
  });

  for (const form of ADD_MENU) {
    byId(`add-menu-${form.replace("add-", "")}`).addEventListener("click", () => open(form));
  }

  /**
   * The inspector's action bar: seven stable buttons, each carrying whichever contextual action
   * claims its element this paint.
   *
   * The handler reads a dataset written by `paint` rather than closing over the frame it was bound
   * in, which is the inspector's own arrangement and for the same reason: a listener that captured
   * a selection would act on the one that was current when the page loaded.
   */
  const actionButtons = ["act-rename", "act-set-property", "act-connect", "act-note",
    "act-delete-element", "act-delete-relation", "act-delete-model"]
    .map((id) => byId<HTMLButtonElement>(id));

  for (const button of actionButtons) {
    button.addEventListener("click", () => {
      const form = button.dataset["form"];
      if (form === undefined) return;
      const filled = new Map<string, string>();
      for (const pair of (button.dataset["prefill"] ?? "").split(" ")) {
        const at = pair.indexOf("=");
        if (at > 0) filled.set(pair.slice(0, at), pair.slice(at + 1));
      }
      open(form as EditForm, filled);
    });
  }

  // ------------------------------------------------------------------------------------------
  // The legacy fieldsets, bound here and nowhere else.
  //
  // DRAINED, not deleted, and the distinction is a pin rather than a preference: six §19 keyboard
  // drives in `test/browser/a11y/keyboard.test.mjs` type into these fields by id, and a field
  // inside a closed `<dialog>` is not focusable. That file belongs to the wave that generates
  // drives from declared paths (§9, wave 2d). What wave 2a could do is make this the ONLY code
  // that knows the fieldsets exist, so the deletion is this block plus the markup — and make each
  // one submit through the same `EditAction.build` the dialog uses, so there is one author for what
  // `set-property` means rather than two that drift.
  // ------------------------------------------------------------------------------------------

  /** Field id in the legacy markup for one catalogue field, where the two spellings differ. */
  const LEGACY_IDS: Readonly<Record<string, string>> = {
    "add-state.state": "add-state-id",
    "add-relation.model": "add-relation-model",
    "add-note.text": "add-note-text",
    "set-label.id": "set-label-target",
    "set-label.label": "set-label-value",
    "set-property.id": "set-property-target",
    "set-property.valueKind": "set-property-kind",
    "delete-element.element": "delete-element-target",
    "delete-relation.relation": "delete-relation-target",
    "delete-model.model": "delete-model-target",
    "add-note.target": "add-note-target",
  };

  const legacyId = (a: EditAction, f: Field): string =>
    LEGACY_IDS[`${a.form}.${f.name}`] ?? `${a.form}-${f.name}`;

  function collectLegacy(a: EditAction): FieldValues {
    const values = new Map<string, string>();
    const checked = new Set<string>();
    for (const f of a.fields) {
      const node = document.getElementById(legacyId(a, f));
      if (node === null) continue;
      if (f.kind === "check") {
        if ((node as HTMLInputElement).checked) checked.add(f.name);
      } else {
        values.set(f.name, (node as HTMLInputElement | HTMLSelectElement).value);
      }
    }
    return { text: values, checked };
  }

  /** The ten `*-go` buttons, by the operation each submits. The verb half of the id varies. */
  const LEGACY_BUTTONS: Readonly<Record<EditForm, string>> = {
    "add-entity": "add-entity-go",
    "add-state": "add-state-go",
    "add-relation": "add-relation-go",
    "add-model": "add-model-go",
    "add-note": "add-note-go",
    "set-label": "set-label-go",
    "set-property": "set-property-go",
    "delete-element": "delete-element-go",
    "delete-relation": "delete-relation-go",
    "delete-model": "delete-model-go",
  };

  for (const a of EDIT_ACTIONS) {
    byId(LEGACY_BUTTONS[a.form]).addEventListener("click", () => submitEdit(a.build(collectLegacy(a))));
  }

  /** The legacy selects, refilled per paint. The option lists are the catalogue's, not a second list. */
  const legacySelects = EDIT_ACTIONS.flatMap((a) =>
    a.fields
      .filter((f) => f.kind === "choice")
      .map((f) => ({ field: f, node: sel(legacyId(a, f)) })));

  const legacyFieldsets = [
    "edit-mode", "form-add-entity", "form-add-state", "form-delete-element",
    "form-add-relation", "form-delete-relation", "form-set-label", "form-set-property",
    "form-add-model", "form-delete-model", "form-add-note",
  ].map((id) => byId<HTMLFieldSetElement>(id));

  // The legacy relation endpoints narrow on the model select, exactly as they did before the move.
  const legacyRelationModel = sel("add-relation-model");
  const refreshLegacyEndpoints = (): void => {
    const opts = options;
    if (opts === null) return;
    const inModel = opts.modelEntities.get(legacyRelationModel.value) ?? opts.entities;
    fillSelect(sel("add-relation-from"), inModel);
    fillSelect(sel("add-relation-to"), inModel);
  };
  legacyRelationModel.addEventListener("change", () => refreshLegacyEndpoints());

  function fillDatalist(root: HTMLElement, values: readonly string[]): void {
    root.replaceChildren(...values.map((value) => {
      const option = document.createElement("option");
      option.value = value;
      return option;
    }));
  }

  return {
    open,
    paint: (frame: ShellFrame) => {
      options = frame.vm.edit;
      const loaded = frame.state.loaded;

      // The `+ Add` menu and the action bar belong to regions the root mounts; their own hosts are
      // shown or hidden with the surface they sit in, so only availability is decided here.
      mountIf(addMenu, loaded);
      mountIf(actionBar, loaded);
      byId<HTMLButtonElement>("palette-open").disabled = !loaded;

      const contextual = loaded
        ? contextualActions(frame.state.system, ctx.viewState.selection)
        : [];
      const byElement = new Map(contextual.map((c) => [c.element, c]));
      for (const button of actionButtons) {
        const offered = byElement.get(button.id);
        button.disabled = offered === undefined;
        if (offered === undefined) {
          delete button.dataset["form"];
          delete button.dataset["prefill"];
          continue;
        }
        button.textContent = offered.label;
        button.dataset["form"] = offered.form;
        button.dataset["prefill"] = [...offered.prefill].map(([k, v]) => `${k}=${v}`).join(" ");
      }
      // The bar says WHY it is empty, because seven disabled buttons with no sentence beside them
      // read as a broken region rather than as a surface waiting for a selection.
      actionHint.textContent = contextual.length > 0
        ? "These act on what is selected. Each opens a small dialog for just that operation."
        : "Select an entity, a relation or a model — here, in the models rail, or in the workspace "
          + "— and the operations that apply to it appear. Additive operations are under + Add.";

      for (const { field, node } of legacySelects) {
        const choices = optionsFor(field.source ?? "entities", frame.vm.edit, "");
        fillSelect(node, field.optional === true
          ? [{ value: "", label: "none" }, ...choices]
          : choices);
      }
      // The relation endpoints are refilled again below, narrowed to the chosen model: the loop
      // above offers every entity, which is the right default and the wrong final state.
      fillDatalist(byId("property-names"), frame.vm.edit.propertyNames);
      fillDatalist(byId("entity-ids"), frame.vm.edit.entityIds);
      refreshLegacyEndpoints();
      for (const f of legacyFieldsets) f.disabled = !loaded;
    },
  };
}
