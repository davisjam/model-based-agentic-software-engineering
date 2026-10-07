/**
 * The `header` region: the system's name, the persistent page nav, the two ways in that stay
 * reachable, and Undo/Redo.
 *
 * It owns the toolbar controls and their enabled state, and nothing else. The ⋯ menu
 * `DESIGN-shell-261002.md` §5 puts here — Export, Run all, System Browser, Advanced query — is a
 * later wave's; the controls it will gather are the buttons below, standing where the flat page
 * had them. **Learn is no longer on that list.** `requirements-learn-261002.md` calls its header
 * entry PERSISTENT, which is the opposite of behind an overflow, so it is a link in the bar and
 * this module holds it there — see `assertLearnReachable`.
 *
 * What it deliberately does NOT own: the example chooser (Start's, and it travels with a
 * description), the hypothesis bar (the review surface's), and the summary's wording (the view
 * model's). It paints `#summary` because the system's name and size belong beside the title, not
 * because it computes them.
 */
import { LEARN_PAGE } from "../../app/learn.ts";
import { NEW_SYSTEM } from "../../app/services.ts";
import { byId } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";

/**
 * The invariant the dropped requirement cost us: Learn is reachable from this page, in every state.
 *
 * `requirements-learn-261002.md` asks for a PERSISTENT entry, and "persistent" is a claim about
 * every state rather than about the markup — a link the page ships and then hides, dims, or buries
 * in a region `mountIf` unmounts satisfies the file and not the requirement. The empty state is
 * where it matters: a reader with no model is the reader who needs to know what a model system is,
 * and it is also the state in which this bar dims six of its other controls.
 *
 * `console.error` is the channel, following `main.ts`'s unbound-affordance report and for its
 * reason: the browser tier already asserts the page logs no errors of its own, so a header that
 * loses Learn reds a gate that exists instead of waiting for one to be written. The gate that
 * states the claim positively, from the rendered page, is `test/browser/learn-reachable.test.mjs`;
 * this is the runtime half, and it fires in the states no suite thought to drive.
 */
function assertLearnReachable(learn: HTMLAnchorElement): void {
  // `hidden` on the link, `hidden` on any ancestor (a region `mountIf` took away), or an href that
  // no longer leaves this page. Not `checkVisibility()`: layout is the browser tier's to measure,
  // and a paint-time reflow read would be a per-frame cost for a claim a probe makes better.
  const unreachable = learn.hidden
    || learn.closest("[hidden]") !== null
    || learn.getAttribute("href") !== LEARN_PAGE;
  if (!unreachable) return;
  console.error(`the persistent Learn entry is not reachable from this state — requirements-learn-261002.md `
    + `asks for a persistent header entry, and #learn is hidden or no longer points at ${LEARN_PAGE}`);
}

export function mountHeader(ctx: ShellContext): ShellRegion {
  const summary = byId("summary");
  // Resolved at mount, so a renamed or deleted entry blanks the page before first paint instead of
  // shipping a header with no route to Learn — and so the node tier's page-contract scan, which
  // reads every `byId` call site in the shell against index.html, covers the id without anyone
  // adding it to a list.
  const learn = byId<HTMLAnchorElement>("learn");
  // The destination comes from `src/app/learn.ts`, the module the refusal panel's link already
  // derives its href from — so "where Learn lives" is one value and not three. The markup ships the
  // same string so the entry works before the bundle evaluates; this is what makes the guard's
  // href comparison a check of ONE fact rather than of two hand-typed copies agreeing.
  learn.href = LEARN_PAGE;
  const undo = byId<HTMLButtonElement>("undo");
  const redo = byId<HTMLButtonElement>("redo");
  const exportButton = byId<HTMLButtonElement>("export");
  const run = byId<HTMLButtonElement>("run");
  const refresh = byId<HTMLButtonElement>("refresh");

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

  /**
   * The revision the user last refreshed AT, so the acknowledgement can say whether anything
   * changed since. View state in a closure — never the model, never hashed, reset per page load.
   * Null until the first refresh; the first acknowledgement states the current revision's facts
   * without a comparison nobody made.
   */
  let lastRefreshHash: string | null = null;

  // ↻ Refresh: re-read, re-render, mutate nothing. The paint below re-evaluates every tracked
  // claim against the current revision (`workspace.properties()` recomputes per observation), so
  // this is the sanctioned way to pick up what an external agent just changed — and it ALWAYS
  // acknowledges, because a silent control reads as a broken one.
  refresh.addEventListener("click", () => {
    const hash = ctx.workspace.state.hash;
    const n = ctx.workspace.state.system.queries.size;
    const claims = `${n} tracked claim${n === 1 ? "" : "s"}`;
    ctx.repaint();
    ctx.announce(lastRefreshHash !== null && lastRefreshHash === hash
      ? `Refreshed. Nothing has changed since your last refresh — the diagram and the ${claims} `
        + "already show the current revision."
      : `Refreshed. The workbench shows the current revision, with the ${claims} re-evaluated `
        + "against it.");
    lastRefreshHash = hash;
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
      // Refresh takes the same treatment: with nothing loaded there is nothing to re-read, and a
      // disabled control is not a tab stop — the pristine walk does not grow.
      refresh.disabled = !frame.state.loaded;
      // And Learn is NOT in that list, which is the whole of what the requirement asks for. Checked
      // rather than merely omitted: the failure this entry exists to close was a surface nobody
      // could reach, and an omission is invisible while a check is not.
      assertLearnReachable(learn);
    },
  };
}
