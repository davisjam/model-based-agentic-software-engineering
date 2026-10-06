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
import type { Annotated, CanonicalSystem, Purpose } from "../ir/types.ts";
import type { PropertyRow, PurposeBlock, ViewModel } from "./view-model.ts";
import { CAVEATED_NOTE_KINDS } from "./view-model.ts";

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

// --------------------------------------------------------------------------------------------
// A1's PRESENTATION half — the epistemic boundary
// --------------------------------------------------------------------------------------------

/**
 * A1 is held in the engine and nothing held it in the UI.
 *
 * **The invariant (A1):** annotation SHALL NOT alter the semantic interpretation or analysis result
 * of a model. That half is structural — `systemHash` excludes annotation entirely, so two systems
 * differing only in notes are the same system, and no note can move a verdict.
 *
 * The half with no holder is the one a reader experiences: **a string the UI shows as an answer must
 * come from the engine, and a string that is the author's own explanation must be distinguishable
 * from one.** A1 guarantees the author's sentence changed no result; it guarantees nothing about
 * whether the reader can tell. Confuse the two and an inert note reads as evidence — the same defect
 * class as prose crediting an inert declaration, one layer out.
 *
 * ## What is checked, and the axis that makes it checkable
 *
 * Not authored-versus-assembled. A model row's `detail` legitimately assembles authored facts behind
 * naming prefixes (`asks:`, `represents`, `deliberately omits`, `Absence means:`), and a rule
 * forbidding that would fail a correct design. The axis is **VERDICT-BEARING**: the channels a reader
 * takes for the engine's answer, which are the property rows' verdict fields and the banner. An
 * authored sentence appearing there is indistinguishable from a derived one.
 *
 * Two things are checked:
 *
 *   1. **No authored system string reaches a verdict-bearing channel.** Every note text, purpose
 *      `represents` entry and provenance value in the system, against every verdict field of every
 *      property row. The one sanctioned crossing is `refusal`, which quotes `purpose.omits` on
 *      purpose — the refusal rung consults the declaration and names it as the author's, so the
 *      quotation IS the evidence. That crossing is declared by the caller rather than assumed here.
 *   2. **Every rendered note carrying a caveated kind says so.** `notesCaveat` must be present
 *      exactly where a note of a caveated kind is rendered, and absent otherwise. A row that renders
 *      an assumption and states no boundary presents authored context in a notes block that looks
 *      like any other — and a row that states the boundary with no assumption on it teaches the
 *      reader to ignore the sentence.
 *
 * What is NOT checked here, stated rather than left to be rediscovered: whether the DOM renders the
 * caveat it is handed, and whether the kind-word beside each note is visually distinct. The first is
 * the browser tier's; the second is a styling claim, and this file's subject is the structure.
 */
export interface EpistemicViolation {
  readonly invariant: "A1-PRESENTATION";
  readonly subject: string;
  readonly problem: string;
}

/** One authored string in the system, with the home that explains where it came from. */
export interface AuthoredString {
  readonly home: string;
  readonly text: string;
}

const purposeStrings = (home: string, p: Purpose): readonly AuthoredString[] => [
  ...(p.question === null ? [] : [{ home: `${home}.purpose.question`, text: p.question }]),
  ...p.represents.map((text) => ({ home: `${home}.purpose.represents`, text })),
];

const annotationStrings = (home: string, a: Annotated): readonly AuthoredString[] => [
  ...a.notes.map((n) => ({ home: `${home}.notes.${n.id}`, text: n.text })),
  ...(a.provenance === null ? [] : [a.provenance.prompt, a.provenance.rationale]
    .filter((t): t is string => t !== null)
    .map((text) => ({ home: `${home}.provenance`, text }))),
];

/**
 * Every authored string a system carries, each with its home.
 *
 * `purpose.omits` is deliberately ABSENT. It is authored text the ENGINE reads — the refusal rung
 * consults it and quotes the author's own wording when a question's subject was declined — so it is
 * not purely explanation, and including it here would report the sanctioned crossing as a violation.
 * It is disposed in the gate's own census instead, where the reason can be stated.
 */
export function authoredStrings(system: CanonicalSystem): readonly AuthoredString[] {
  const out: AuthoredString[] = [];
  for (const e of system.entities.values()) out.push(...annotationStrings(`entity:${e.id}`, e.annotation));
  for (const m of system.models.values()) {
    out.push(...annotationStrings(`model:${m.id}`, m.annotation), ...purposeStrings(`model:${m.id}`, m.purpose));
  }
  for (const r of system.relations) {
    out.push(...annotationStrings(`relation:${r.model}/${r.from}->${r.to}`, r.annotation));
  }
  for (const m of system.machines.values()) out.push(...purposeStrings(`machine:${m.id}`, m.purpose));
  return out.filter((a) => a.text.trim().length > 0);
}

/** The verdict-bearing fields of a property row, named so the census can be total over them. */
export const verdictFields = (p: PropertyRow): readonly (readonly [string, string])[] => [
  ["status", p.status], ["verdict", p.verdict ?? ""], ["coverage", p.coverage],
  ["expectation", p.expectation ?? ""], ["revision", p.revision],
  ["groundsMissing", p.groundsMissing ?? ""],
  // Included and then EXEMPTED by the caller's sanctioned set, rather than omitted here. Omitting
  // it would make the exemption decorative: the field would go unchecked whether anyone declared it
  // or not, and withdrawing the declaration would change nothing.
  ["refusal", p.refusal ?? ""],
  ...p.evidence.map((e, i) => [`evidence[${i}]`, e] as const),
  ...p.grounds.map((g, i) => [`grounds[${i}]`, g] as const),
  ...p.compilation.map((c, i) => [`compilation[${i}]`, c] as const),
];

/**
 * A1's presentation half, as a function over the view model and the system behind it.
 *
 * `sanctioned` names the verdict fields a caller has declared may quote the author — today only
 * `refusal`, and the gate holds the evidence for that declaration. Passed in rather than hardcoded
 * so the exemption is the caller's claim and shows up in the caller's census.
 */
export function checkEpistemicBoundary(
  vm: ViewModel,
  system: CanonicalSystem,
  sanctioned: ReadonlySet<string> = new Set(["refusal"]),
): readonly EpistemicViolation[] {
  const out: EpistemicViolation[] = [];
  const authored = authoredStrings(system);

  for (const p of vm.properties) {
    for (const [field, text] of verdictFields(p)) {
      if (sanctioned.has(field) || text.trim().length === 0) continue;
      for (const a of authored) {
        if (!text.includes(a.text.trim())) continue;
        out.push({
          invariant: "A1-PRESENTATION", subject: `${p.id}.${field}`,
          problem: `the verdict field '${field}' of property '${p.id}' contains the authored string `
            + `at ${a.home}. A reader takes a verdict channel for the engine's answer, so authored `
            + `explanation there is indistinguishable from derived evidence.`,
        });
      }
    }
  }

  for (const section of vm.sections) {
    for (const row of section.rows) {
      const caveated = row.notes.filter((n) => CAVEATED_NOTE_KINDS.has(n.kind));
      if (caveated.length > 0 && row.notesCaveat === null) {
        out.push({
          invariant: "A1-PRESENTATION", subject: `${section.id}/${row.id}`,
          problem: `renders ${caveated.length} note(s) of a caveated kind `
            + `(${caveated.map((n) => n.kind).join(", ")}) and states no boundary beside them, so `
            + "authored context is presented in a block that looks like any other.",
        });
      }
      if (caveated.length === 0 && row.notesCaveat !== null) {
        out.push({
          invariant: "A1-PRESENTATION", subject: `${section.id}/${row.id}`,
          problem: "states the annotation boundary on a row carrying no note of a caveated kind. A "
            + "caveat on everything is a caveat a reader learns to skip.",
        });
      }
    }
  }
  return out;
}
