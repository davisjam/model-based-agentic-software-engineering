/**
 * The `askbar` and `advanced-query` surfaces: asking a question, and keeping the answer.
 *
 * Correction 5 makes a persistent bottom input the primary question surface and demotes the
 * structured builder — "Shape of question: direct / Relation to traverse: calls / Quantifier:
 * exists" — to Advanced. That input, its suggestions and the promotion buttons are wave 1c's, in
 * this file.
 *
 * **Wave 0 moves the builder into the region and leaves it visible.** The honest reason: putting it
 * behind a disclosure now would take `#ask-go` out of the tab order on a page whose primary ask
 * surface does not exist yet, which is a capability regression dressed as progress. So the surface
 * `advanced-query` is the builder's own fieldset, where it has always been, and wave 1c moves it
 * under the ⋯ menu in the same change that gives a user something better to type into.
 *
 * The three fieldsets are one flow and travel together: ask (transient), save the question as a
 * property (persistent), stop evaluating it. What is saved is the QUESTION, never the answer — the
 * verdict is recomputed on every later revision — which is why Ask saves nothing and Save is a
 * separate, explicit act.
 */
import { fillSelect, paintAnswer } from "../render-dom.ts";
import { planAsk, propertyRow } from "../view-model.ts";
import type { AskRequest } from "../view-model.ts";
import { byId, input, mountIf, sel } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { regionHost } from "./surfaces.ts";
import type { SubmitEdit } from "./edit-forms.ts";

export function mountAskBar(ctx: ShellContext, submitEdit: SubmitEdit): ShellRegion {
  const region = regionHost("askbar");
  const askAnswer = byId("ask-answer");
  const askForm = sel("ask-form");
  const askRelation = sel("ask-relation");
  const askFrom = sel("ask-from");
  const askTo = sel("ask-to");
  const askQuantifier = sel("ask-quantifier");
  const saveExpect = sel("save-property-expect");
  const retractTarget = sel("retract-property-target");

  /** The forms this region owns, disabled together until a model is loaded. */
  const fieldsets = ["form-ask", "form-save-property", "form-retract-property"]
    .map((id) => byId<HTMLFieldSetElement>(id));

  /** The ask form's current contents. Read in one place, so Ask and Save cannot disagree. */
  const askRequest = (): AskRequest => ({
    form: askForm.value,
    relation: askRelation.value,
    from: askFrom.value,
    to: askTo.value,
    quantifier: askQuantifier.value,
    maxHops: input("ask-max-hops").value,
  });

  byId("ask-go").addEventListener("click", () => {
    const proposition = input("save-property-proposition").value.trim();
    const planned = planAsk(askRequest(), proposition);
    if (!planned.ok) {
      paintAnswer(null, planned.problem, askAnswer);
      ctx.announce(planned.problem);
      return;
    }
    // `workspace.evaluate` is the SAME service `window.mage.ask` calls, so the grounding a person
    // reads here is the grounding an agent reads -- UX-I2 for a panel whose whole content is a
    // semantic result. Nothing is saved: a query is transient until someone says otherwise (§3.4).
    const answer = ctx.workspace.evaluate(proposition === "" ? "(unsaved)" : proposition, planned.query);
    paintAnswer(propertyRow(answer), "", askAnswer);
    ctx.announce(`Answered: ${answer.status.replace(/-/g, " ")}. `
      + `${answer.grounds.length} model(s) or machine(s) establish it. Nothing is saved yet.`);
  });

  byId("save-property-go").addEventListener("click", () => submitEdit({
    form: "save-property",
    id: input("save-property-id").value,
    proposition: input("save-property-proposition").value,
    expect: saveExpect.value,
    ask: askRequest(),
  }));

  byId("retract-property-go").addEventListener("click", () => submitEdit({
    form: "retract-property",
    id: retractTarget.value,
  }));

  return {
    paint: (frame: ShellFrame) => {
      mountIf(region, frame.state.loaded);
      // Disabling the fieldset disables everything inside it, which is how a whole surface turns
      // off before a model is loaded without tracking each control.
      for (const f of fieldsets) f.disabled = !frame.state.loaded;

      // Every option list is derived from the model, so a control cannot offer a question the
      // system has no vocabulary for.
      fillSelect(askForm, frame.vm.edit.graphForms);
      fillSelect(askRelation, frame.vm.edit.relationTypes);
      // An endpoint may be left unspecified -- the engine then takes every node on that side -- so
      // the empty option is first and says what it means rather than reading as a missing choice.
      const anyEndpoint = { value: "", label: "any entity" };
      fillSelect(askFrom, [anyEndpoint, ...frame.vm.edit.entities]);
      fillSelect(askTo, [anyEndpoint, ...frame.vm.edit.entities]);
      fillSelect(askQuantifier, frame.vm.edit.quantifiers);
      fillSelect(saveExpect, frame.vm.edit.expectations);
      fillSelect(retractTarget, frame.vm.edit.properties);
    },
  };
}
