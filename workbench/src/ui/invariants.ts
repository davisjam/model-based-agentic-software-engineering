/**
 * UX-I4 and UX-I7, as functions over the view model.
 *
 * These two had no implementation of any kind — not a test, not a comment, not a check — while
 * UX-I1, -I2, -I3 and -I6 all had one. An invariant that exists only in prose is a sentence
 * somebody will read as satisfied, and §21 is a list of SHALLs. So they are encoded here and walked
 * by `test/view-model.test.ts`, in the style `checkAffordanceParity()` set: return every violation
 * rather than throwing, so a caller reports the whole picture and a test can assert against a known
 * set while the product is incomplete.
 *
 * They read the VIEW MODEL and not the IR, because that is what they constrain. "This model
 * declares a purpose" is a fact about the file and the validator's business; "the human presentation
 * displays it as a primary part" is a fact about the UI, and only one of those is UX-I4. A check
 * over the IR would pass on a workbench that showed nothing.
 */
import type { UxViolation } from "../app/capabilities.ts";
import type { PurposeBlock, ViewModel } from "./view-model.ts";

/** A purpose block is a statement either way; an empty one is a gap dressed as a field. */
function stated(p: PurposeBlock): boolean {
  return p.question.trim() !== "";
}

/**
 * UX-I4 — every purposeful model exposes its engineering purpose as a primary part of its human
 * presentation, rather than treating purpose solely as hidden metadata.
 *
 * Three things are checked, and the third is §5.1 specifically:
 *
 *   1. Every row in the Models section carries its own `purpose` block. Not a clause of the detail
 *      string — the gap this closed was exactly that: the question was the first fragment of a
 *      ` · `-joined sentence, unlabelled and syntactically identical to `over 4 entities`.
 *   2. Every machine row carries one too. A machine declares `purpose` in the IR, is drawn as its
 *      own subject, and is what a behavioural property grounds in, so it is a purposeful model in
 *      everything but the type name.
 *   3. When a model is the PRINCIPAL model being viewed — the one the diagram is drawing — its
 *      purpose is displayed with it. §5.1 names this case and it was the one actually failing: the
 *      models table stated every purpose, and the one place a model was singled out as the thing
 *      under inspection showed a subject name and a picture.
 *
 * What is NOT checked: that `represents` and `omits` are on screen at all times. §5.1 explicitly
 * allows them to be inspectable instead, so requiring them here would be stricter than the
 * specification and would fail a legitimate design.
 */
export function checkPurposeVisibility(vm: ViewModel): readonly UxViolation[] {
  const out: UxViolation[] = [];
  for (const section of vm.sections) {
    if (section.id !== "models" && section.id !== "machines") continue;
    for (const row of section.rows) {
      // Transitions share the machines section and are not purposeful reductions; a transition with
      // a purpose block would be the invention, not the omission.
      if (section.id === "machines" && !row.kind.startsWith("machine")) continue;
      if (row.purpose === null) {
        out.push({
          invariant: "UX-I4", subject: row.id,
          problem: `${row.kind} '${row.id}' is presented with no purpose block, so its purpose is `
            + "reachable only as metadata",
        });
        continue;
      }
      if (!stated(row.purpose)) {
        out.push({
          invariant: "UX-I4", subject: row.id,
          problem: `${row.kind} '${row.id}' has an empty purpose block; an absent question must be `
            + "stated as absent, not rendered as blank",
        });
      }
    }
  }
  if (vm.principal !== null && !stated(vm.principal.purpose)) {
    out.push({
      invariant: "UX-I4", subject: vm.principal.id,
      problem: `the principal ${vm.principal.kind} being viewed states no purpose beside it (§5.1)`,
    });
  }
  return out;
}

/**
 * UX-I7 — multiple purposeful models remain independently inspectable, and a linked presentation
 * does not implicitly create a unified semantic model.
 *
 * **This workbench draws one subject at a time, so the LINKED-view half of UX-I7 is satisfied
 * vacuously.** There is no composed visualization to constrain. That is worth stating rather than
 * claiming: §6.3's Linked mode is not built, and a check that reports zero violations over a
 * feature that does not exist has established nothing about the feature.
 *
 * What it DOES establish is the two halves that are live today, and the forward guard:
 *
 *   1. **Independently inspectable.** Every model in the system has exactly one row of its own in
 *      the Models section, addressed by its own id. One row for two models — a merged "Event Flow +
 *      Data Policy" — is a unified semantic model in the presentation, which is what UX-I7 forbids.
 *   2. **No implicit unification where the join already happens.** Graph adjacency IS the union
 *      across every model: a cross-model query joins edges from two reductions, and that is the
 *      design. What keeps it a link rather than a merge is that every relation still names the
 *      model that ASSERTS it. A relation row that dropped its model would make the union look like
 *      one flat graph, which is the diagram-centric failure this project exists to refuse.
 *   3. **The forward guard.** No drawable subject may name more than one model. The day someone
 *      builds Linked mode, this fires — and the fix is not to delete the check: it is to make each
 *      pane of the linked view independently inspectable and come back here to say how. A vacuous
 *      invariant that notices when it stops being vacuous is worth more than one that is quietly
 *      still true of a feature nobody built.
 */
export function checkModelPlurality(vm: ViewModel): readonly UxViolation[] {
  const out: UxViolation[] = [];

  const models = vm.sections.find((s) => s.id === "models");
  const seen = new Set<string>();
  for (const row of models?.rows ?? []) {
    if (seen.has(row.id)) {
      out.push({
        invariant: "UX-I7", subject: row.id,
        problem: `two rows claim model '${row.id}'; a model must be inspectable as exactly one object`,
      });
    }
    seen.add(row.id);
  }

  // READ AS STRUCTURE, not as prose. This used to match `/\bin model \S/` against the rendered
  // detail sentence, which made the invariant a grep over presentation: a copy edit to the phrasing
  // failed UX-I7, and a row that named its model in other words satisfied nothing. `Row.assertedBy`
  // carries the asserting model as a field, so the check now reads the claim the invariant is about.
  for (const relation of vm.sections.find((s) => s.id === "relations")?.rows ?? []) {
    if (relation.assertedBy === null || relation.assertedBy.trim() === "") {
      out.push({
        invariant: "UX-I7", subject: relation.id,
        problem: `relation '${relation.id}' does not name the model that asserts it, so the union `
          + "across models reads as one unified graph",
      });
    }
  }

  for (const subject of vm.subjects) {
    // `model:<id>` / `machine:<id>`, one id, no separator. A subject naming two would BE the
    // composed presentation, and the point of UX-I7 is that composing the picture must not compose
    // the semantics.
    if (/[,+]/.test(subject.value)) {
      out.push({
        invariant: "UX-I7", subject: subject.value,
        problem: "a drawable subject names more than one model; a linked presentation must keep each "
          + "model independently inspectable and must not create a semantic supermodel (§6.3)",
      });
    }
  }
  return out;
}
