/**
 * The `case` region: a shipped example's pedagogical envelope, kept visible after loading.
 *
 * ## The requirement this region carries
 *
 * The author's 261005 ruling: the examples behaved like datasets, not cases — "the case context
 * dies at load and the student lands in the model/property machinery". So the case — scenario,
 * the thing to investigate, the models in play — must REMAIN VISIBLE after loading, as a compact
 * persistent header above the model navigation, collapsible behind a `Start investigating`
 * affordance and recoverable afterwards. "The workspace should not erase the pedagogical context."
 *
 * ## The boundary, again, because this is where someone would blur it
 *
 * The case is CONTEXT, NOT A CONSTRAINT — the note's own line (A1). This region READS the case
 * from the app layer and the models from the frame; it writes nothing, and nothing here may ever
 * feed the engine, a hash, or a verdict. The workspace below stays ordinary and editable (EX-I1):
 * mounting this panel is keyed on how the current import ARRIVED (the catalogue's per-import pin),
 * never on anything in the model, which is why editing the example — even beyond recognition —
 * keeps its case, and opening a file drops it.
 *
 * ## Mechanics
 *
 * A native `details` open by default; SH-I2's mechanism, so the summary announces its own state
 * and no focus management is hand-rolled. The region mounts iff a system is loaded AND
 * `currentCase()` names the import still on screen. The body re-renders only when the import or
 * the model revision changes — the "Models in this case" list is derived from the LIVE system, so
 * a student who deletes a model sees the case tell the truth about what remains. `details.open`
 * is never touched on repaint (the element holds the student's choice); it is reset to open when
 * a NEW import pins a case, because a fresh case deserves its first reading.
 */
import { caseOf } from "../../app/examples.ts";
import type { ShippedExampleId } from "../../app/examples.ts";
import { byId, mountIf } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { regionHost } from "./surfaces.ts";

const make = (tag: string, text?: string, className?: string): HTMLElement => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className !== undefined) node.className = className;
  return node;
};

export function mountCase(ctx: ShellContext): ShellRegion {
  const region = regionHost("case");
  const details = byId<HTMLDetailsElement>("case-details");
  const summary = byId("case-summary");
  const body = byId("case-body");

  /** Example titles, read once from the examples themselves — the menu's own discipline. */
  const titles = new Map<string, string>();
  void ctx.examples.describeAll()
    .then((all) => {
      for (const d of all) titles.set(d.id, d.title);
      ctx.repaint();
    })
    .catch(() => {
      // Deliberate swallow: the title line is the only thing this read supplies, and the Start
      // region already reports a failing example fetch loudly. A case panel without its title
      // line still carries the whole case; a second error report for one fetch would be noise.
    });

  /** The import whose case is currently rendered, as `${id}:${loadNonce}`. */
  let renderedImport: string | null = null;
  /** What the body was last rendered for — the import plus the revision the models came from. */
  let renderedKey: string | null = null;

  byId("case-collapse").addEventListener("click", () => {
    details.open = false;
    // Focus would otherwise die with the hidden content; the summary is the way back, so it is
    // also where the keyboard lands.
    summary.focus();
    ctx.announce("Case collapsed. About this example reopens it.");
  });

  const render = (id: ShippedExampleId, frame: ShellFrame): void => {
    const envelope = caseOf(id);
    body.replaceChildren();
    const title = titles.get(id);
    if (title !== undefined) body.append(make("h3", title));
    body.append(make("p", "Scenario", "sublabel"), make("p", envelope.scenario, "intro"));
    body.append(make("p", "Investigate", "sublabel"), make("p", envelope.investigate, "intro"));
    body.append(make("p", "Models in this case", "sublabel"));
    const list = make("ul", undefined, "notes case-models");
    // From the LIVE system, not from the shipped description: the case narrates whatever the
    // student has made of the example, which is the honest reading of "ordinary editable
    // workspace with its context intact". Machines carry a purpose exactly as graph models do.
    const blurbs = [
      ...[...frame.state.system.models.values()].map((m) => ({ label: m.label, q: m.purpose.question })),
      ...[...frame.state.system.machines.values()].map((m) => ({ label: m.id, q: m.purpose.question })),
    ];
    for (const b of blurbs) {
      const li = make("li");
      li.append(make("strong", b.label));
      if (b.q !== null) li.append(document.createTextNode(` — ${b.q}`));
      list.append(li);
    }
    body.append(list);
  };

  return {
    paint: (frame: ShellFrame) => {
      const id = ctx.examples.currentCase();
      const show = frame.state.loaded && id !== null;
      mountIf(region, show);
      if (!show || id === null) {
        renderedImport = null;
        renderedKey = null;
        return;
      }
      const importKey = `${id}:${ctx.workspace.loadNonce}`;
      if (importKey !== renderedImport) {
        renderedImport = importKey;
        // A fresh import gets the case expanded; repaints of the same import leave the student's
        // open/closed choice exactly where they put it.
        details.open = true;
      }
      const key = `${importKey}:${frame.state.hash}:${titles.has(id) ? "t" : ""}`;
      if (key === renderedKey) return;
      renderedKey = key;
      render(id, frame);
    },
  };
}
