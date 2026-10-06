/**
 * The command palette — one keystroke to every operation, and a real dialog rather than a lookalike.
 *
 * Correction 4 ends with "And perhaps one command palette: ⌘K Add entity, ⌘K Connect Analytics
 * to…, ⌘K Add model." It is the escape hatch that makes the rest of the correction safe: once
 * editing is contextual, an operation whose object is not currently selected has no visible home,
 * and a user who knows what they want to do should not have to navigate to the object first. The
 * palette is the route that never depends on where the user happens to be.
 *
 * **It lists UNAVAILABLE commands too, named and explained.** A palette that silently omits
 * "Delete this relation" until a relation is selected teaches nobody that relations can be deleted,
 * and it makes the surface's contents a function of state the user cannot see. So every command is
 * listed; the ones that cannot run say what they need, as a WORD, and their buttons are disabled —
 * which is also what takes them out of the tab order, so a keyboard user Tabs only through what
 * will work. (Availability is never colour alone: the house rule at `index.html`.)
 *
 * **Why a native `<dialog>` and `showModal()`.** A command palette is the single most tempting
 * place to hand-roll a floating `div`, and the most expensive: a modal `dialog` gives us a focus
 * trap over its subtree, inertness of the page behind it, Escape to dismiss, `aria-modal`, and
 * focus returned to the opener on close — five WCAG obligations, from the platform, correct the
 * first time. A `div` that merely looks like a palette has none of them, and a sighted mouse user
 * never notices which is why it ships so often. What the platform does not do, this module does:
 * name the dialog, move focus to the filter on open, announce what opened, and announce how many
 * commands the filter left.
 *
 * **The filter is a filter.** Typed text narrows a catalogue of operations the application can
 * actually perform; it is not parsed. That is the same ruling the ask bar took
 * (`DECISIONS-RULED-shell-261002.md` G2) and for the same reason: guessing which operation an
 * English phrase meant would fabricate precision, and here the fabrication would MUTATE a model.
 */
import { EDIT_ACTIONS, satisfies } from "./edit-dialogs.ts";
import type { EditForm, OpenDialog } from "./edit-dialogs.ts";
import { byId } from "./context.ts";
import { regionHost } from "./surfaces.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { resolveSelection } from "../view-model.ts";
import type { Selection } from "../view-model.ts";
import type { CanonicalSystem } from "../../ir/types.ts";

/**
 * One row of the palette.
 *
 * `why` is present whether or not the command is available, because a row that explains itself only
 * when it is broken reads as an error message. For an available command it states the precondition
 * that is MET, which is the same fact a user needs when they are deciding what to select next.
 */
export interface PaletteCommand {
  readonly form: EditForm;
  readonly label: string;
  readonly available: boolean;
  /** The precondition, in words. Shown beside the label, never encoded as colour or position. */
  readonly why: string;
}

/**
 * The words for each precondition, in both polarities.
 *
 * A table rather than a sentence built by concatenation: "Needs an entity or state selected" and
 * "an entity is selected" are different sentences, not one with a negation bolted on, and a reader
 * of the table can see that every precondition has both.
 */
const PRECONDITION_WORDS: Readonly<Record<string, readonly [met: string, unmet: string]>> = {
  "loaded": ["ready", "needs a model system loaded"],
  "selection:element": ["an element is selected", "needs an entity or a state selected"],
  "selection:relation": ["a relation is selected", "needs a relation selected"],
  "selection:model": ["a structural model is selected", "needs a structural model selected"],
  "selection:machine": ["a state machine is selected", "needs a state machine selected"],
};

/**
 * Every command, with its availability — derived from the one action catalogue.
 *
 * Pure, and the palette's whole semantic content: `test/shell-edit.test.ts` asserts the set against
 * `EDIT_ACTIONS` rather than against a list typed into the test, so an operation added to the
 * catalogue appears here or the test says which one did not.
 */
export function paletteCommands(
  system: CanonicalSystem | null, selected: Selection,
): readonly PaletteCommand[] {
  const loaded = system !== null;
  const kind = loaded ? selected.kind : "none";
  return EDIT_ACTIONS.map((a) => {
    const available = satisfies(a.needs, loaded, kind);
    const words = PRECONDITION_WORDS[a.needs] ?? (["ready", "unavailable"] as const);
    return {
      form: a.form,
      label: a.label,
      available,
      why: loaded ? (available ? words[0] : words[1]) : "needs a model system loaded",
    };
  });
}

/**
 * Narrow by typed text.
 *
 * Case-insensitive substring over the label and the operation name, so both "connect" and
 * "relation" find the same row — the user may know the UI's word or the vocabulary's. Empty text
 * is everything, which is what makes the palette a browsable catalogue and not only a search box.
 */
export function filterCommands(
  query: string, commands: readonly PaletteCommand[],
): readonly PaletteCommand[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return commands;
  return commands.filter((c) =>
    c.label.toLowerCase().includes(needle) || c.form.includes(needle));
}

/** The sentence under the filter. A count a screen reader hears, not a silently shortened list. */
export function filterReading(shown: number, total: number, query: string): string {
  if (query.trim() === "") return `${total} commands.`;
  if (shown === 0) {
    return `No command matches "${query.trim()}". The palette lists the ${total} editing operations `
      + "by name; it does not interpret a description.";
  }
  return `${shown} of ${total} commands match "${query.trim()}".`;
}

/** Is this keystroke the palette's shortcut? ⌘K on macOS, Ctrl-K elsewhere. */
export function isPaletteShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k";
}

export function mountPalette(ctx: ShellContext, open: OpenDialog): ShellRegion {
  const dialog = byId<HTMLDialogElement>("palette");
  const filter = byId<HTMLInputElement>("palette-filter");
  const count = byId("palette-count");
  const list = byId("palette-list");
  const opener = byId<HTMLButtonElement>("palette-open");

  /** The commands of the last paint. The palette opens between paints and reads the current ones. */
  let commands: readonly PaletteCommand[] = [];

  function render(): void {
    const shown = filterCommands(filter.value, commands);
    list.replaceChildren(...shown.map((c) => {
      const row = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset["form"] = c.form;
      button.disabled = !c.available;
      button.textContent = c.label;
      const why = document.createElement("span");
      why.className = "hint";
      // The precondition is a separate element rather than part of the button's label, so the
      // accessible name of the control is the operation and the condition is its description.
      why.id = `palette-why-${c.form}`;
      why.textContent = c.why;
      button.setAttribute("aria-describedby", why.id);
      row.append(button, why);
      return row;
    }));
    count.textContent = filterReading(shown.length, commands.length, filter.value);
  }

  function show(): void {
    filter.value = "";
    render();
    dialog.showModal();
    // The platform traps focus inside the dialog; it does not decide where it lands. The filter,
    // because typing is what the surface is for and a caret parked on a heading means the first
    // keystroke goes nowhere.
    filter.focus();
    ctx.announce(`Commands. ${commands.length} editing operations, filter to narrow them. `
      + "Escape closes it.");
  }

  opener.addEventListener("click", () => show());
  byId("palette-close").addEventListener("click", () => dialog.close());
  filter.addEventListener("input", () => render());

  /**
   * One delegated listener, reading the row's own declaration of which operation it offers.
   *
   * The dialog is closed BEFORE the edit dialog opens, because two modals stacked is a focus
   * ordering the platform does not define and a screen reader reads as the page having two
   * currently-operable regions.
   */
  list.addEventListener("click", (event) => {
    const from = event.target;
    if (!(from instanceof Element)) return;
    const button = from.closest<HTMLButtonElement>("button[data-form]");
    if (button === null || button.disabled) return;
    const form = button.dataset["form"];
    if (form === undefined) return;
    dialog.close();
    open(form as EditForm);
  });

  // The shortcut, on the document, because ⌘K from anywhere is the point of a palette. Bound once,
  // and refused while the palette or an edit dialog is already up: a shortcut that re-opens the
  // surface it is already on resets what the user typed.
  document.addEventListener("keydown", (event) => {
    if (!isPaletteShortcut(event)) return;
    // Refused over any open dialog, the review surface included: a change held for review is
    // waiting on Discard or Commit, and opening the command palette over it would stack a second
    // modal on a decision the user has not made.
    if (opener.disabled || dialog.open) return;
    if (byId<HTMLDialogElement>("edit-dialog").open) return;
    if (regionHost("review").hasAttribute("open")) return;
    // Prevented, because ⌘K is the browser's search-bar focus in some configurations and a
    // shortcut that does both does neither predictably.
    event.preventDefault();
    show();
  });

  // The list is emptied on close. Two reasons: a closed palette then ships no `<button>` for the
  // page's button sweep to find unstamped (`test/browser/workbench.test.mjs`), and a palette
  // reopened after a transaction cannot show the availability of the system it was closed over.
  dialog.addEventListener("close", () => {
    list.replaceChildren();
    count.textContent = "";
  });

  return {
    paint: (frame: ShellFrame) => {
      commands = paletteCommands(
        frame.state.loaded ? frame.state.system : null,
        resolveSelection(frame.state.system, ctx.viewState.selection[0]));
      if (dialog.open) render();
    },
  };
}
