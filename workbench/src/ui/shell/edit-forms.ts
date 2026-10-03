/**
 * The one mutation funnel, and the two controls that choose which branch it lands on.
 *
 * **This module is what is LEFT of a holding pen.** Wave 0 moved the ten always-visible editing
 * fieldsets here so that `main.ts` would not become the file waves 2a and 2c both had to edit. Wave
 * 2a drained them: correction 4's `+ Add` menu, per-selection inspector actions and ⌘K palette are
 * in `edit-dialogs.ts` and `palette.ts`, the ten operations are declared once as `EDIT_ACTIONS`,
 * and the legacy fieldsets' bindings went with them — so nothing in this file knows an operation's
 * fields any more. What remains is the funnel plus correction 8's deletion target: the
 * authoritative-vs-hypothesis radios, the hypothesis name, the rationale, and the `#edit-result`
 * readout. Wave 2c replaces those with the REVIEW CHANGE surface and this module goes with them.
 *
 * **`submitEdit` is the funnel, and it is exported.** That single funnel is UX-I3 —
 * authoritative-state convergence — in the UI: one operation, one envelope, handed to the same
 * `Workspace.transact` that `window.mage.transact` calls, so there is no human mutation path beside
 * the agent one. The ask bar's Save and Retract go through it, and so does every dialog. Routing to
 * a hypothesis changes WHICH branch the transaction lands on, never how it is validated.
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
import { byId, input, mountIf } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import type { Finding } from "../../ir/types.ts";

/**
 * What the funnel did.
 *
 * Three outcomes collapsed into two, deliberately: a plan the UI refused before the transaction
 * layer saw it ("an entity needs an id") and a transaction the engine rejected are both "not
 * applied, here is why", and a caller deciding whether to stay open does not branch on which. The
 * findings carry the engine's reasons when there were any.
 */
export type EditOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly problem: string; readonly findings: readonly Finding[] };

/** The one mutation funnel, handed to every region that submits an operation. */
export type SubmitEdit = (request: EditRequest) => EditOutcome;

export interface EditForms extends ShellRegion {
  readonly submitEdit: SubmitEdit;
}

export function mountEditForms(ctx: ShellContext): EditForms {
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

    const asHypothesis = input("target-hypothesis").checked;
    const label = input("hypothesis-label").value.trim();
    if (asHypothesis && label === "") {
      const problem = "A hypothesis needs a name, so you can tell which one you are reviewing.";
      paintEditResult(editResult, problem, []);
      ctx.announce(problem);
      return { ok: false, problem, findings: [] };
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
      return { ok: true };
    }
    // A rejection carries the findings that explain it, and losing them leaves a person staring at a
    // control that did nothing. They are reported here rather than in the Validation section, which
    // describes the model as it stands — not an edit that never happened.
    paintEditResult(editResult, `Rejected: ${applied} changed nothing.`, result.findings);
    ctx.announce(`Edit rejected. ${result.findings[0]?.message ?? "No reason was reported."}`);
    return { ok: false, problem: `Rejected: ${applied} changed nothing.`, findings: result.findings };
  };


  return {
    submitEdit,
    paint: (frame: ShellFrame) => {
      mountIf(region, frame.state.loaded);
      // `#edit-mode`'s own enabling. The ten fieldsets' is `edit-dialogs.ts`'s, with the bindings
      // that reach them — one module per thing that must be deleted together.
      byId<HTMLFieldSetElement>("edit-mode").disabled = !frame.state.loaded;
    },
  };
}
