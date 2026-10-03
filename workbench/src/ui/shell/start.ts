/**
 * The `start` region: the empty-workspace experience, and SH-I1.
 *
 * **Correction 1, which is the whole reason this is its own module.** Start is an empty-workspace
 * experience. The flat page kept it on screen after a model loaded, so a user who had just opened
 * Message Bus went on reading three explanations of how to open something — and the workbench's
 * first screenful was about the application rather than about their model. So the region is mounted
 * iff nothing is loaded (SH-I1), which makes the gate a property of one field rather than a layout
 * opinion: `#start` is present exactly when `WorkspaceState.loaded` is false, and the workspace
 * region is present exactly when it is true.
 *
 * **And one deletion.** The flat page's example hint carried a developer retrospective about a
 * wrong word count that had been fixed — product prose explaining a defect in the product's own
 * prose. It is deleted outright rather than rewritten: the example titles, models and questions are
 * read from the example files, so the panel describes itself and needs no paragraph saying that it
 * does.
 *
 * The cards `DESIGN-shell-261002.md` §6 sketches — one per example, with its model count — are a
 * presentation of `ExampleCatalog.describeAll()`, which this region already reads. Wave 0 keeps the
 * menu-plus-description the flat page shipped; what changed is when the region exists at all.
 */
import type { ExampleDescription } from "../../app/examples.ts";
import { paintExampleDescription, paintExampleProblem, fillSelect } from "../render-dom.ts";
import { byId, mountIf, sel } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { regionHost } from "./surfaces.ts";

export function mountStart(ctx: ShellContext): ShellRegion {
  const region = regionHost("start");
  const choice = sel("example-choice");
  const description = byId("example-description");

  /** Descriptions, read once at boot. Selecting an example then costs nothing. */
  const descriptions = new Map<string, ExampleDescription>();

  /** Show the chosen example's description. Section 3 asks for it before or as the example loads. */
  const showDescription = (): void => {
    paintExampleDescription(descriptions.get(choice.value) ?? null, description);
  };

  choice.addEventListener("change", () => {
    showDescription();
    const chosen = descriptions.get(choice.value);
    if (chosen !== undefined) {
      ctx.announce(`${chosen.title}. ${chosen.summary} ${chosen.models.length} model(s). `
        + "Press Load this example to open it.");
    }
  });

  byId("example-load").addEventListener("click", () => {
    const id = choice.value;
    const chosen = descriptions.get(id);
    if (chosen === undefined) {
      ctx.announce("No example is available to load; open a .mage.yaml instead.");
      return;
    }
    void ctx.examples.load(id)
      .then((r) => {
        // Loading an example replaces the whole model, which is as consequential as an edit gets --
        // so it is announced, and the announcement says the result is an ordinary workspace rather
        // than a demonstration the user cannot touch.
        ctx.announce(r.ok
          ? `Loaded ${chosen.title}: ${ctx.workspace.state.system.models.size} model(s), `
            + `${ctx.workspace.state.findings.length} validation finding(s). `
            + "This is an ordinary editable workspace."
          : `${chosen.title} did not load: ${r.findings.map((f) => f.message).join("; ")}`);
      })
      .catch((error: unknown) => {
        const problem = `${chosen.title} could not be read: ${String(error)}`;
        paintExampleProblem(problem, description);
        ctx.announce(problem);
      });
  });

  /**
   * Fill the menu from the examples themselves.
   *
   * The option labels are each example's own title, so the menu cannot name an example one thing
   * while its description names it another. The cost is one read per example at boot; the
   * alternative is a hand-written label beside a derived description, which is the drift this
   * avoids.
   */
  void ctx.examples.describeAll()
    .then((all) => {
      for (const d of all) descriptions.set(d.id, d);
      fillSelect(choice, all.map((d) => ({ value: d.id, label: d.title })));
      showDescription();
    })
    .catch((error: unknown) => {
      const problem = "The shipped examples could not be read, so none is offered: "
        + `${String(error)}. Create a new model system or open a .mage.yaml instead.`;
      paintExampleProblem(problem, description);
      ctx.announce(problem);
    });

  return {
    // SH-I1. One field decides it, read the same way the workspace region reads it, so the two
    // cannot both be mounted without one of them contradicting `workspace.state`.
    paint: (frame: ShellFrame) => { mountIf(region, !frame.state.loaded); },
  };
}
