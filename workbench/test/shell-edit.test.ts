// Contextual editing: the action catalogue, the per-selection sets, and the palette's readings.
//
// Everything asserted here is a PURE function of the authoritative system plus the selection, which
// is what lets the substance of correction 4 be checked in `node:test` with no browser. The DOM
// halves that cannot be — a modal dialog's focus trap, Escape, focus return — belong to the a11y
// tier, and `DESIGN-shell-261002.md` §9c records which ones.
//
// **The oracle is the catalogue and the model, never a transcript of what the UI says today.** The
// ten operations come from `EDIT_ACTIONS`, the objects come from the shipped example systems, and
// the expectations are derived from both. A pinned list of labels would pass while an operation was
// dropped from the catalogue, which is exactly the regression the redesign could cause: ten
// always-visible fieldsets at least made a missing operation visible.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { SHIPPED_EXAMPLE_IDS } from "../src/app/examples.ts";
import { CAPABILITIES, CHROME_CONTROLS, boundHumanAffordances } from "../src/app/capabilities.ts";
import { SURFACES } from "../src/ui/shell/surfaces.ts";
import { elementValue, relationValue, resolveSelection } from "../src/ui/view-model.ts";
import { ADD_MENU, EDIT_ACTIONS, contextualActions, satisfies } from "../src/ui/shell/edit-dialogs.ts";
import type { EditForm } from "../src/ui/shell/edit-dialogs.ts";
import {
  filterCommands, filterReading, isPaletteShortcut, paletteCommands,
} from "../src/ui/shell/palette.ts";

const load = (path: string): CanonicalSystem => canonicalize(parse(readFileSync(path, "utf8")));
const messageBus = (): CanonicalSystem => load("test/fixtures/examples/message-bus/system.mage.yaml");
const everySystem = (): readonly CanonicalSystem[] =>
  SHIPPED_EXAMPLE_IDS.map((id) => load(`examples/${id}/system.mage.yaml`));

const html = (): string => readFileSync("index.html", "utf8");
const idsIn = (markup: string): ReadonlySet<string> =>
  new Set([...markup.matchAll(/id="([a-zA-Z0-9-]+)"/g)].map((m) => m[1] as string));

const forms = (actions: readonly { readonly form: EditForm }[]): readonly EditForm[] =>
  actions.map((a) => a.form);

// --------------------------------------------------------------------------------------------
// The catalogue is the one declaration of what an operation needs
// --------------------------------------------------------------------------------------------

test("every editing form the transaction vocabulary offers has exactly one action", () => {
  // The count is derived from the catalogue's own discriminant rather than written as a number: a
  // duplicate row and a missing row are different defects and this names which.
  const seen = new Map<EditForm, number>();
  for (const a of EDIT_ACTIONS) seen.set(a.form, (seen.get(a.form) ?? 0) + 1);
  assert.deepEqual([...seen.values()].filter((n) => n !== 1), [],
    `an operation is declared twice: ${[...seen].filter(([, n]) => n !== 1).map(([f]) => f).join(", ")}`);
  assert.equal(EDIT_ACTIONS.length, seen.size);
});

test("every action names its fields, its verb and a reason it is shaped that way", () => {
  for (const a of EDIT_ACTIONS) {
    assert.ok(a.fields.length > 0, `${a.form} has no fields — a dialog with no form is a button`);
    assert.ok(a.verb.length > 0 && a.verb !== a.label,
      `${a.form}'s confirm button repeats the heading; it should say what pressing it does`);
    // The hints are the licensing facts the ten fieldsets carried. Losing them in the move from a
    // form to a dialog is the quiet half of a redesign regression, so a short one fails here.
    assert.ok(a.hint.length > 40, `${a.form}'s hint is too short to state a licensing fact`);
    for (const f of a.fields) {
      if (f.kind === "choice") {
        assert.ok(f.source !== undefined, `${a.form}.${f.name} is a choice with no option source`);
      } else {
        assert.equal(f.source, undefined, `${a.form}.${f.name} is not a choice but names a source`);
      }
    }
  }
});

test("`build` produces the EditRequest its form claims, from collected field values", () => {
  // The funnel dispatches on `request.form`, so an action whose `build` returned a different form
  // than it declared would submit a different operation than the dialog's heading named.
  for (const a of EDIT_ACTIONS) {
    const values = {
      text: new Map(a.fields.filter((f) => f.kind !== "check").map((f) => [f.name, `x-${f.name}`])),
      checked: new Set<string>(),
    };
    assert.equal(a.build(values).form, a.form, `${a.form}.build returns a different form`);
  }
});

test("the + Add menu offers exactly the operations that need nothing selected", () => {
  // Derived, not listed: an action added to the catalogue with `needs: "loaded"` and no selection
  // dependency belongs in the menu, and this says so rather than letting it be unreachable.
  const additive = EDIT_ACTIONS.filter((a) => a.form.startsWith("add-")).map((a) => a.form);
  assert.deepEqual([...ADD_MENU].sort(), [...additive].sort());
  for (const form of ADD_MENU) {
    const a = EDIT_ACTIONS.find((x) => x.form === form);
    assert.equal(a?.needs, "loaded", `${form} is in the + Add menu but needs a selection`);
  }
});

// --------------------------------------------------------------------------------------------
// Per-selection action sets — correction 4's substance
// --------------------------------------------------------------------------------------------

test("an entity offers rename, set property, connect, note and delete — prefilled with itself", () => {
  const system = messageBus();
  const id = [...system.entities.keys()][0] as string;
  const actions = contextualActions(resolveSelection(system, id));
  assert.deepEqual([...forms(actions)].sort(),
    ["add-note", "add-relation", "delete-element", "set-label", "set-property"]);
  // The prefill is the whole point: "the human UX should expose the operation where the user
  // naturally encounters its object", so the object must not have to be found again in a select.
  for (const a of actions) {
    const filled = [...a.prefill.values()].join(" ");
    assert.ok(filled.includes(id),
      `${a.form} from a selected entity does not prefill ${id} — the user would re-pick it`);
    assert.ok(a.label.includes(id), `${a.form}'s label does not name the object it acts on`);
  }
});

test("a relation offers note and delete, and the delete carries its composite address", () => {
  const system = messageBus();
  const r = system.relations[0];
  assert.ok(r !== undefined, "this fixture needs a relation");
  const value = relationValue(r.id !== null
    ? { kind: "id", model: r.model, id: r.id }
    : { kind: "ends", model: r.model, from: r.from, to: r.to, type: r.type });
  const actions = contextualActions(resolveSelection(system, value));
  assert.deepEqual([...forms(actions)].sort(), ["add-note", "delete-relation"]);
  const del = actions.find((a) => a.form === "delete-relation");
  // Relations have no ids of their own, so the action has to carry the model-plus-endpoints
  // encoding rather than a name. Minting relation ids would be a kernel change the design refuses.
  assert.equal(del?.prefill.get("relation"), value);
});

test("a model offers rename, connect-within, note and delete — and NOT an 'edit purpose'", () => {
  const system = messageBus();
  const id = [...system.models.keys()][0] as string;
  const actions = contextualActions(resolveSelection(system, `model:${id}`));
  assert.deepEqual([...forms(actions)].sort(), ["add-note", "add-relation", "delete-model", "set-label"]);
  assert.equal(actions.find((a) => a.form === "add-relation")?.prefill.get("model"), id,
    "connecting from a selected model must assert the relation in THAT model");
  // The gap, pinned so it cannot be quietly filled with a control that cannot work. Correction 4
  // asks for "Edit purpose" on a selected model; the transaction vocabulary has no operation that
  // rewrites a model's engineering question, and `set-label` reaches the LABEL. Recorded in
  // DESIGN-shell-261002.md §9c. When the op lands, this assertion is what fails first.
  const purposeOps = EDIT_ACTIONS.filter((a) =>
    a.fields.some((f) => f.name === "question") && a.form !== "add-model");
  assert.deepEqual(purposeOps.map((a) => a.form), [],
    "an operation that sets a model's question exists — give the model selection an Edit purpose action");
});

test("a state offers delete; a machine offers rename", () => {
  const system = everySystem().find((s) => s.machines.size > 0);
  assert.ok(system, "no shipped example declares a machine — this test needs one");
  const [id, machine] = [...system.machines.entries()][0] as [string, { states: readonly string[] }];
  assert.deepEqual([...forms(contextualActions(resolveSelection(system, `machine:${id}`)))], ["set-label"]);
  const state = machine.states[0];
  assert.ok(state !== undefined, "this machine declares no state");
  // Through `elementValue`, not a hand-spelled `state:…`: the encoding is the view model's and a
  // test that spelled its own would pass over a selection the product cannot produce.
  assert.deepEqual(
    [...forms(contextualActions(resolveSelection(system, elementValue({ kind: "state", machine: id, state }))))],
    ["delete-element"]);
});

test("nothing selected and a dangling selection both offer no contextual action", () => {
  const system = messageBus();
  assert.deepEqual(contextualActions({ kind: "none" }), []);
  // SH-I5's editing half. A transaction can delete the selected element; offering "Delete audit-log"
  // for an audit-log that no longer exists is a control that cannot work, and offering the ADDITIVE
  // operations instead would read as the user having cleared their selection on purpose.
  assert.equal(resolveSelection(system, "no-such-thing").kind, "unresolved");
  assert.deepEqual(contextualActions(resolveSelection(system, "no-such-thing")), []);
});

test("every contextual action across every shipped system names a button index.html ships", () => {
  // The binding UX-I1 needs: an action's element has to exist at every paint, because the page
  // stamps `data-affordance` from the registry and a declared site bound to nothing reads to the
  // closure gate as a deleted control.
  const present = idsIn(html());
  const seen = new Set<string>();
  for (const system of everySystem()) {
    const selections = [
      ...[...system.entities.keys()].map((id) => id),
      ...[...system.models.keys()].map((id) => `model:${id}`),
      ...[...system.machines.keys()].map((id) => `machine:${id}`),
      ...system.relations.map((r) => relationValue(r.id !== null
        ? { kind: "id", model: r.model, id: r.id }
        : { kind: "ends", model: r.model, from: r.from, to: r.to, type: r.type })),
    ];
    for (const s of selections) {
      for (const a of contextualActions(resolveSelection(system, s))) {
        seen.add(a.element);
        assert.ok(present.has(a.element), `#${a.element} is not in index.html (${a.form})`);
      }
    }
  }
  assert.ok(seen.size >= 6,
    `only ${seen.size} action button(s) were ever offered — the sweep is wrong, not the catalogue`);
});

// --------------------------------------------------------------------------------------------
// The palette
// --------------------------------------------------------------------------------------------

test("the palette lists every operation, available or not, with a reason either way", () => {
  const system = messageBus();
  const commands = paletteCommands(system, { kind: "none" });
  assert.deepEqual([...forms(commands)].sort(), [...forms(EDIT_ACTIONS)].sort(),
    "the palette is not the catalogue — a command list that omits an operation hides it");
  for (const c of commands) {
    // A row that explains itself only when it is broken reads as an error message, and a user
    // deciding what to select next needs the met condition stated too.
    assert.ok(c.why.length > 0, `${c.form} gives no reason for its availability`);
  }
});

test("with nothing loaded no command is available, and every row says why", () => {
  const commands = paletteCommands(null, { kind: "none" });
  assert.deepEqual(commands.filter((c) => c.available).map((c) => c.form), []);
  for (const c of commands) assert.match(c.why, /loaded/);
});

test("availability tracks the selection, by the same predicate the action bar uses", () => {
  const system = messageBus();
  const entity = [...system.entities.keys()][0] as string;
  for (const need of ["loaded", "selection:element", "selection:relation", "selection:model",
    "selection:machine"] as const) {
    assert.equal(satisfies(need, false, "none"), false, `${need} is satisfied with nothing loaded`);
  }
  assert.equal(satisfies("selection:element", true, resolveSelection(system, entity).kind), true);
  assert.equal(satisfies("selection:relation", true, resolveSelection(system, entity).kind), false);
});

test("the filter narrows by label and by operation name, and says what it left", () => {
  const commands = paletteCommands(messageBus(), { kind: "none" });
  assert.equal(filterCommands("", commands).length, commands.length);
  // Both vocabularies reach the same row: the UI's word for the act and the transaction's word for
  // the operation. A user may know either.
  const byLabel = filterCommands("connect", commands);
  const byOp = filterCommands("add-relation", commands);
  assert.deepEqual(forms(byLabel), ["add-relation"]);
  assert.deepEqual(forms(byOp), ["add-relation"]);
  assert.ok(filterCommands("CONNECT", commands).length === 1, "the filter must be case-insensitive");

  // The unmatched reading is a refusal, not an empty list: the palette does not interpret a
  // description, and saying so is how a user learns the surface is a catalogue and not a parser.
  assert.deepEqual(filterCommands("make it safer", commands), []);
  const reading = filterReading(0, commands.length, "make it safer");
  assert.match(reading, /make it safer/);
  assert.match(reading, /does not interpret/);
  assert.match(filterReading(commands.length, commands.length, ""), new RegExp(`${commands.length} commands`));
});

test("the palette shortcut is Command-K or Control-K, and nothing else", () => {
  // Typed against a structural stand-in rather than a real KeyboardEvent, which node has no DOM
  // for: the predicate reads four fields and this hands it four fields.
  const key = (init: Partial<KeyboardEvent>): KeyboardEvent =>
    ({ metaKey: false, ctrlKey: false, altKey: false, key: "k", ...init } as KeyboardEvent);
  assert.equal(isPaletteShortcut(key({ metaKey: true })), true);
  assert.equal(isPaletteShortcut(key({ ctrlKey: true })), true);
  assert.equal(isPaletteShortcut(key({ metaKey: true, key: "K" })), true, "Shift-Command-K still means K");
  assert.equal(isPaletteShortcut(key({})), false, "a bare k must not open the palette while typing");
  assert.equal(isPaletteShortcut(key({ metaKey: true, altKey: true })), false);
  assert.equal(isPaletteShortcut(key({ metaKey: true, key: "j" })), false);
});

// --------------------------------------------------------------------------------------------
// UX-I1 after the move
// --------------------------------------------------------------------------------------------

test("every editing capability's human sites include a contextual or menu control", () => {
  // The claim correction 4 makes: the operation is exposed where the user meets its object. A
  // capability whose only human site is still a flat fieldset button has not been moved.
  // The set correction 4 moves, derived from the registry: a capability that had a site in the flat
  // Edit section. `save-property` and `retract-property` also commit transactions but were never in
  // that section — their surface is the ask bar's Track and the property rail's Retract, which wave
  // 1c already placed. `create-hypothesis` is excluded by name: its `edit-section` site is the
  // authoritative-vs-hypothesis radio, which correction 8 deletes and wave 2c re-sites.
  const editing = CAPABILITIES
    .filter((c) => c.human.some((a) => a.at.startsWith("edit-section.")))
    .filter((c) => c.id !== "create-hypothesis");
  assert.ok(editing.length >= 8, `only ${editing.length} editing capabilities found — the filter is wrong`);
  const unmoved = editing.filter((c) =>
    !c.human.some((a) => a.at.startsWith("add-menu.") || a.at.startsWith("inspector.")));
  assert.deepEqual(unmoved.map((c) => c.id), [],
    "these editing capabilities are still only reachable from the flat Edit section");
});

test("every declared human affordance element, and every chrome control, is in index.html", () => {
  const present = idsIn(html());
  const missing = [
    ...boundHumanAffordances().map((a) => a.element.id),
    ...CHROME_CONTROLS.map((c) => c.id),
  ].filter((id) => !present.has(id));
  assert.deepEqual(missing, []);
});

test("the palette is a built surface, and no surface is planned any more", () => {
  const palette = SURFACES.find((s) => s.surface === "palette");
  assert.equal(palette?.status, "built", "wave 2a landed the palette; the table must stop calling it planned");
  // Derived rather than asserted as a count: a path may cite any surface, so one still planned is
  // one a declared path could name with nothing to walk.
  assert.deepEqual(SURFACES.filter((s) => s.status === "planned").map((s) => s.surface), []);
});
