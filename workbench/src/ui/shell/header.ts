/**
 * The `header` region: the system's name, the two ways in that stay reachable, and Undo/Redo.
 *
 * It owns the toolbar controls and their enabled state, and nothing else. The ⋯ menu
 * `DESIGN-shell-261002.md` §5 puts here — Export, Run all, System Browser, Advanced query, Learn —
 * is a later wave's; the controls it will gather are the buttons below, standing where the flat
 * page had them.
 *
 * What it deliberately does NOT own: the example chooser (Start's, and it travels with a
 * description), the hypothesis bar (the review surface's), and the summary's wording (the view
 * model's). It paints `#summary` because the system's name and size belong beside the title, not
 * because it computes them.
 */
import { NEW_SYSTEM } from "../../app/services.ts";
import { byId } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";

export function mountHeader(ctx: ShellContext): ShellRegion {
  const summary = byId("summary");
  const undo = byId<HTMLButtonElement>("undo");
  const redo = byId<HTMLButtonElement>("redo");
  const exportButton = byId<HTMLButtonElement>("export");
  const run = byId<HTMLButtonElement>("run");

  byId("file").addEventListener("change", (event) => {
    const picker = event.target as HTMLInputElement;
    const file = picker.files?.[0];
    if (file === undefined) return;
    void file.text().then((text) => {
      const r = ctx.workspace.load(text);
      ctx.announce(r.ok
        ? `Loaded ${file.name}. ${ctx.workspace.state.findings.length} validation finding(s).`
        : `${file.name} could not be parsed: ${r.findings.map((f) => f.message).join("; ")}`);
    });
  });

  // One of the three ways in (default-examples section 3). All three end at `Workspace.load`, which
  // is why the registry treats this as a second affordance of `import` rather than a capability.
  byId("new-system").addEventListener("click", () => {
    const r = ctx.workspace.load(NEW_SYSTEM);
    ctx.announce(r.ok
      ? "New, empty model system. Add a model and the engineering question it answers."
      : `The new system did not load: ${r.findings.map((f) => f.message).join("; ")}`);
  });

  exportButton.addEventListener("click", () => {
    const text = ctx.workspace.export();
    const url = URL.createObjectURL(new Blob([text], { type: "text/yaml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ctx.workspace.state.system.systemId}.mage.yaml`;
    a.click();
    URL.revokeObjectURL(url);
    ctx.announce("Exported.");
  });

  run.addEventListener("click", () => {
    ctx.repaint();
    const n = ctx.workspace.state.system.queries.size;
    ctx.announce(n === 0
      ? "This model system asserts no properties yet."
      : `Re-evaluated ${n} propert${n === 1 ? "y" : "ies"} against the current revision.`);
  });

  undo.addEventListener("click", () => {
    if (ctx.workspace.undo()) ctx.announce("Undone.");
  });
  redo.addEventListener("click", () => {
    if (ctx.workspace.redo()) ctx.announce("Redone.");
  });

  return {
    paint: (frame: ShellFrame) => {
      summary.textContent = frame.vm.summary;
      undo.disabled = !frame.state.canUndo;
      redo.disabled = !frame.state.canRedo;
      // Export and Run need a model, exactly as Undo needs a revision to go back to. Both shipped
      // enabled on a pristine page, so a keyboard user reached two controls that could do nothing
      // before reaching the one that could (`BASELINE-a11y-261002.md` §6, F-2).
      exportButton.disabled = !frame.state.loaded;
      run.disabled = !frame.state.loaded;
    },
  };
}
