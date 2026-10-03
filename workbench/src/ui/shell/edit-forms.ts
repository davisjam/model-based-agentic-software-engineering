/**
 * The one mutation funnel, and the legacy Edit section it still mounts.
 *
 * **The holding pen is drained.** Wave 0 moved the ten always-visible editing fieldsets here so
 * that `main.ts` would not become the file waves 2a and 2c both had to edit. Wave 2a took the ten
 * operations out, declaring each once as `EDIT_ACTIONS` and giving them the `+ Add` menu, the
 * inspector's action bar and the ⌘K palette. Wave 2c took correction 8's deletion target out: the
 * authoritative-vs-hypothesis radios, the hypothesis name field and the rationale field are gone,
 * and the REVIEW CHANGE surface in `review.ts` decides which branch a change lands on.
 *
 * **Two things are left, and neither has a better home.**
 *
 *   - **`submitEdit`, the funnel.** It is the one thing every editing surface shares — the ask
 *     bar's Save and Retract, every dialog, the pinned fieldsets — so moving it INTO any one of
 *     those surfaces would make that surface the mutation path for all the others. It is UX-I3 in
 *     the UI: one operation, one envelope, handed to the same `Workspace` call `window.mage.transact`
 *     reaches, so there is no human mutation path beside the agent one.
 *   - **The `#edit` region and `#edit-result`.** The ten fieldsets' MARKUP is still in
 *     `index.html`, pinned by six §19 keyboard drives that type into its fields by id
 *     (`DESIGN-shell-261002.md` §9c), and `#edit-result` is where those flat forms report a
 *     refusal — a drive that fails reads its text to say why. Both go when the markup goes, which
 *     is the wave that re-derives those drives from declared paths.
 *
 * **Routing is the review surface's call, not a control's.** `submitEdit` builds the envelope and
 * hands it to `ReviewSurface.land`, which lands it authoritatively unless a requirement would move
 * (`DECISIONS-RULED-shell-261002.md` G3). The old sentence here still holds and is worth keeping
 * exactly: a hypothesis changes WHICH branch the transaction lands on, never how it is validated.
 * The review surface changes how a change is PRESENTED and CONFIRMED, never how it is CHECKED.
 *
 * **It returns an outcome, which wave 2a added and a dialog is why.** A form on the page could
 * report a refusal by painting `#edit-result` beside itself. A modal cannot: `#edit-result` is
 * behind the dialog and inert, and a dialog that closed on a rejected edit would lose both the
 * reason and everything the user typed. So the funnel still paints and announces — the flat forms
 * depend on that — and additionally HANDS BACK what happened, which is the fact a caller needs to
 * decide whether to stay open. A value, not a callback: the caller already knows what it wants to
 * do, and a callback would let it be told twice.
 */
import { paintEditResult } from "../render-dom.ts";
import { planEdit } from "../view-model.ts";
import type { EditRequest } from "../view-model.ts";
import { byId, mountIf } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import type { ReviewSurface } from "./review.ts";
import type { Finding } from "../../ir/types.ts";

/**
 * What the funnel did.
 *
 * Three outcomes collapsed into two, deliberately: a plan the UI refused before the transaction
 * layer saw it ("an entity needs an id") and a transaction the engine rejected are both "not
 * applied, here is why", and a caller deciding whether to stay open does not branch on which. The
 * findings carry the engine's reasons when there were any.
 *
 * A change HELD FOR REVIEW reports `ok: true`, and that is the right collapse for this caller's one
 * question. The dialog asks "may I close?", and the answer is yes: the change was accepted, it is
 * on a branch, and the review surface now owns it. Nothing the dialog holds is needed again.
 */
export type EditOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly problem: string; readonly findings: readonly Finding[] };

/** The one mutation funnel, handed to every region that submits an operation. */
export type SubmitEdit = (request: EditRequest) => EditOutcome;

export interface EditForms extends ShellRegion {
  readonly submitEdit: SubmitEdit;
}

export function mountEditForms(ctx: ShellContext, review: ReviewSurface): EditForms {
  const region = byId("edit");
  const editResult = byId("edit-result");

  const submitEdit: SubmitEdit = (request) => {
    const plan = planEdit(request);
    if (!plan.ok) {
      // The UI's own refusal, before the transaction layer sees it: a person who left a box blank is
      // better served by "an entity needs an id" than by the schema's phrasing of the same fact.
      paintEditResult(editResult, plan.problem, []);
      ctx.announce(plan.problem);
      return { ok: false, problem: plan.problem, findings: [] };
    }

    const applied = plan.operations.map((o) => o.op).join(" + ");
    const result = review.land({
      base: ctx.workspace.state.hash,
      operations: plan.operations,
      applied,
    });

    if (result.kind === "rejected") {
      // A rejection carries the findings that explain it, and losing them leaves a person staring at
      // a control that did nothing. They are reported here rather than in the Validation section,
      // which describes the model as it stands — not an edit that never happened.
      paintEditResult(editResult, `Rejected: ${applied} changed nothing.`, result.findings);
      ctx.announce(`Edit rejected. ${result.findings[0]?.message ?? "No reason was reported."}`);
      return { ok: false, problem: `Rejected: ${applied} changed nothing.`, findings: result.findings };
    }

    paintEditResult(editResult, "", []);
    if (result.kind === "reviewing") {
      // The review surface announces what it is showing when it opens, and it opens on the next
      // paint. Saying "held for review" here as well would be two sentences for one event through
      // the one polite announcer.
      return { ok: true };
    }
    // An annotation-only edit commits WITHOUT advancing the semantic revision (A1), which is
    // surprising enough that the announcement says so. A user who edits and sees the hash stand
    // still should be told why rather than left to suspect the click was lost.
    const annotationOnly = plan.operations.every((o) => o.op === "add-note");
    ctx.announce(`${applied} applied. ${ctx.workspace.state.findings.length} validation finding(s).`
      + (annotationOnly ? " The model's revision is unchanged: a note is context, not a constraint." : ""));
    return { ok: true };
  };

  return {
    submitEdit,
    paint: (frame: ShellFrame) => {
      mountIf(region, frame.state.loaded);
    },
  };
}
