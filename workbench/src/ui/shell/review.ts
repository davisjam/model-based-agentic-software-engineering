/**
 * REVIEW CHANGE — what a change does to the claims, shown before it becomes authoritative.
 *
 * Correction 8 of `requirements-progressive-disclosure-261002.md` deletes the per-edit radio pair
 * ("Apply the next edit to ○ the authoritative model ○ a hypothesis, left for review…") because it
 * "is exposing internal architecture". The normal user edits normally and MAGE constructs a
 * transaction. What replaces the radios is this surface: the operations grouped per model, the
 * PROPERTY IMPACT, the requirement count, then Discard or Commit.
 *
 * ## What opens it, and what deliberately does not
 *
 * `DECISIONS-RULED-shell-261002.md` G3 draws the line, and it is a line between two KINDS of claim
 * rather than a threshold on edit size:
 *
 *   - A direct human edit that would move a plain tracked **property** commits and announces, undo
 *     one keystroke away. No surface.
 *   - A direct human edit that would move a **requirement** — a property whose satisfaction the
 *     author declared matters, `EvaluatedProperty.kind === "requirement"` — interposes this surface
 *     before the change lands. "An obligation is the thing you asked to be told about before
 *     breaking."
 *   - An **agent-opened hypothesis** always opens it, "because review is the point".
 *   - A human **what-if**, armed deliberately, always opens it: the user asked to try something
 *     without committing, so the review IS the thing they asked for.
 *
 * What G3 explicitly forecloses is interposition for every property-touching edit, "which needs a
 * dependency question the kernel does not answer today (*which edits could affect which
 * properties*)". So this module does not ask that question. It asks the one the kernel CAN answer —
 * did a requirement move — and it asks it by evaluating, not by predicting. The author's own limit
 * is the same thought from the other side: "If there is no tracked-property consequence, don't make
 * the user stare at this every time they rename a label."
 *
 * ## The pre-evaluation is the engine's own machinery, not a parallel path
 *
 * Deciding whether a requirement WOULD move means evaluating the edit before it lands. The engine
 * already has the construct for that: a hypothesis is a separate `TransactionEngine` loaded from the
 * same text, and `Workspace.properties()` re-runs every saved query on whichever branch is current.
 * So a consequential edit transparently becomes a short-lived hypothesis — `openHypothesis`, read
 * the properties, compare — and the authoritative engine is not touched either way, because that is
 * what `openHypothesis` already guarantees.
 *
 * **It is then DISCARDED and re-applied rather than accepted, and that is a deliberate cost.**
 * `applyHypothesis` keeps the branch engine, whose revision history begins at the load — so
 * accepting a branch collapses the authoritative undo stack to one step. For an edit the user never
 * asked to branch, silently shortening undo would be exactly the kind of invisible behaviour change
 * this project measures for. So the interposed path discards the probe and re-applies the identical
 * operations through `Workspace.transact`, which leaves `transact` the single authoritative mutator
 * and leaves the undo stack whole. The probe costs one extra apply over a small model.
 *
 * An agent hypothesis and an armed what-if are different: there the branch IS what the user is
 * accepting, there is no retained envelope to re-apply, and `applyHypothesis` is the capability
 * `commit-hypothesis` names. Those commit by accepting the branch.
 *
 * ## It is a `<dialog>`, and it keeps the bar's ids
 *
 * A native modal, following the palette: a focus trap over the subtree, inertness behind it,
 * `aria-modal`, and focus returned to the opener — five WCAG obligations from the platform rather
 * than from a hand-rolled floating `div`. What the platform does not do, this module does: name it,
 * move focus, and announce what opened.
 *
 * `#hypothesis-apply` and `#hypothesis-discard` are kept, which `DESIGN-shell-261002.md` §5 requires
 * ("stable ids kept: `hypothesis-bar` ids") — Commit and Discard are the same two capabilities the
 * bar carried. `hidden` is kept in sync with `open` so "this region is not part of the current
 * state" has the one spelling `context.ts` documents for it, and so a caller reading the host's
 * `hidden` reads the surface's state rather than a dialog's default.
 *
 * **Escape does not dismiss it.** The platform's cancel is prevented, because the two ways out of a
 * pending change are Discard and Commit and there is no third: dismissing the surface would leave a
 * hypothesis open with nothing on the page offering a route back to it, and a destructive reading of
 * Escape would throw away work on a keystroke people press to mean "never mind". Both buttons stay
 * reachable, so this is not a keyboard trap (2.1.2); it is a decision the surface insists on.
 */
import { classifyEvidence, noSuchQuestion } from "../../app/agent-api.ts";
import type { EvidenceReading } from "../../app/agent-api.ts";
import type { EvaluatedProperty, PropertyStatus } from "../../app/properties.ts";
import { byId } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { regionHost } from "./surfaces.ts";
import type { CanonicalSystem, Finding } from "../../ir/types.ts";
import type { Operation } from "../../transaction/types.ts";

// --------------------------------------------------------------------------------------------
// The words
// --------------------------------------------------------------------------------------------

/**
 * The bare status WORD, for a line that reads "ESTABLISHED → REFUTED".
 *
 * A `Record` the compiler holds exhaustive, not the first clause of `STATUS_TEXT` cut off at its
 * dash. Splitting a sentence to recover a word is the `checkModelPlurality` defect verbatim — an
 * invariant that read structure out of prose and broke on a copy edit (`DESIGN-shell-261002.md`
 * §10). `test/shell-review.test.ts` holds the two spellings together by asserting each word opens
 * the matching sentence, which is a join a test can check and a split cannot.
 */
export const STATUS_WORD: Readonly<Record<PropertyStatus, string>> = {
  established: "ESTABLISHED",
  refuted: "REFUTED",
  conditional: "CONDITIONAL",
  "not-answerable": "NOT ANSWERABLE",
  inconclusive: "INCONCLUSIVE",
  "not-evaluated": "NOT EVALUATED",
};

/** A status word that licenses no further reading. These fold into the "unchanged" count. */
const CONCLUSIVE: ReadonlySet<PropertyStatus> = new Set<PropertyStatus>(["established", "refuted"]);

// --------------------------------------------------------------------------------------------
// What changed in the model, grouped the way correction 8 groups it
// --------------------------------------------------------------------------------------------

/** One line of a change group. The mark is never alone: `text` says what happened in words. */
export interface ChangeLine {
  readonly mark: "+" | "-" | "~";
  readonly text: string;
}

/** The changes one model (or the system itself) carries. */
export interface ChangeGroup {
  /** The model's label, or "The model system" for changes no model scopes. */
  readonly title: string;
  readonly lines: readonly ChangeLine[];
}

const nameOf = (system: CanonicalSystem, id: string): string =>
  system.entities.get(id)?.label ?? id;

/** A relation type id read as a verb phrase: `subscribes_to` → `subscribes to`. */
const asVerb = (type: string): string => type.replace(/[_-]+/g, " ");

/**
 * A relation's identity for the diff.
 *
 * A relation has no id of its own, so it is addressed by the model that asserts it together with
 * its endpoints and type — the same four fields `delete-relation` takes. The separator is a visible
 * character on purpose: this file once carried a raw NUL here, which the source-hygiene check caught
 * at commit time.
 */
const relationKey = (r: { model: string; from: string; to: string; type: string }): string =>
  `${r.model} | ${r.from} | ${r.type} | ${r.to}`;

const scalarText = (value: string | number | boolean): string => String(value);

/**
 * Every change between two revisions, grouped by the model that scopes it.
 *
 * Derived by DIFFING the two systems rather than by reading the transaction's operations, and that
 * is what makes one function serve both callers: an agent's hypothesis arrives through
 * `window.mage.hypothesis.open` and the shell never sees its operations, so a renderer that read
 * operations would have had nothing to show for the one case correction 8 says review is FOR.
 *
 * Relations group under their own model, because a relation is asserted BY a model. Entities,
 * entity properties, machines' states and saved queries group under the system: they are the
 * system's, not any one model's, which is the same distinction `delete-model`'s hint draws.
 */
export function changeGroups(
  before: CanonicalSystem, after: CanonicalSystem,
): readonly ChangeGroup[] {
  const groups = new Map<string, ChangeLine[]>();
  const lines = (title: string): ChangeLine[] => {
    const existing = groups.get(title);
    if (existing !== undefined) return existing;
    const fresh: ChangeLine[] = [];
    groups.set(title, fresh);
    return fresh;
  };

  // Models, by id. A model's own appearance, disappearance and renaming.
  for (const [id, model] of after.models) {
    const was = before.models.get(id);
    if (was === undefined) {
      lines(model.label).push({ mark: "+", text: `the model ${id} was added` });
      continue;
    }
    if (was.label !== model.label) {
      lines(model.label).push({ mark: "~", text: `renamed from "${was.label}"` });
    }
    if (was.purpose.question !== model.purpose.question) {
      lines(model.label).push({
        mark: "~", text: `its engineering question changed to "${model.purpose.question ?? "none"}"`,
      });
    }
  }
  for (const [id, model] of before.models) {
    if (!after.models.has(id)) {
      lines(model.label).push({ mark: "-", text: `the model ${id} was removed` });
    }
  }

  // Relations, under the model that asserts them.
  const titleFor = (modelId: string): string =>
    after.models.get(modelId)?.label ?? before.models.get(modelId)?.label ?? modelId;
  const had = new Map(before.relations.map((r) => [relationKey(r), r] as const));
  const has = new Map(after.relations.map((r) => [relationKey(r), r] as const));
  for (const [key, r] of has) {
    if (had.has(key)) continue;
    lines(titleFor(r.model)).push({
      mark: "+", text: `${nameOf(after, r.from)} ${asVerb(r.type)} ${nameOf(after, r.to)}`,
    });
  }
  for (const [key, r] of had) {
    if (has.has(key)) continue;
    lines(titleFor(r.model)).push({
      mark: "-", text: `${nameOf(before, r.from)} ${asVerb(r.type)} ${nameOf(before, r.to)}`,
    });
  }

  // The system's own objects.
  const system = "The model system";
  for (const [id, entity] of after.entities) {
    const was = before.entities.get(id);
    if (was === undefined) {
      lines(system).push({ mark: "+", text: `the entity ${id} was added` });
      continue;
    }
    if (was.label !== entity.label) {
      lines(system).push({ mark: "~", text: `${id} renamed from "${was.label}" to "${entity.label}"` });
    }
    for (const [name, value] of entity.properties) {
      const old = was.properties.get(name);
      if (old === undefined) {
        lines(system).push({ mark: "+", text: `${id}.${name} = ${scalarText(value.value)}` });
      } else if (old.value !== value.value) {
        lines(system).push({
          mark: "~",
          text: `${id}.${name}: ${scalarText(old.value)} → ${scalarText(value.value)}`,
        });
      }
    }
    for (const name of was.properties.keys()) {
      if (!entity.properties.has(name)) {
        lines(system).push({ mark: "-", text: `${id}.${name} was cleared` });
      }
    }
  }
  for (const id of before.entities.keys()) {
    if (!after.entities.has(id)) lines(system).push({ mark: "-", text: `the entity ${id} was removed` });
  }
  for (const [id, machine] of after.machines) {
    const was = before.machines.get(id);
    if (was === undefined) continue;
    for (const state of machine.states) {
      if (!was.states.includes(state)) {
        lines(system).push({ mark: "+", text: `${id} gained the state ${state}` });
      }
    }
    for (const state of was.states) {
      if (!machine.states.includes(state)) {
        lines(system).push({ mark: "-", text: `${id} lost the state ${state}` });
      }
    }
  }
  for (const id of after.queries.keys()) {
    if (!before.queries.has(id)) lines(system).push({ mark: "+", text: `the claim ${id} is now tracked` });
  }
  for (const id of before.queries.keys()) {
    if (!after.queries.has(id)) lines(system).push({ mark: "-", text: `the claim ${id} is no longer tracked` });
  }

  // Notes, counted rather than listed: a note is context, not a constraint (A1), and an added note
  // is still a change the reviewer should see happened.
  const notesOf = (s: CanonicalSystem): number =>
    [...s.entities.values()].reduce((n, e) => n + e.annotation.notes.length, 0)
    + [...s.models.values()].reduce((n, m) => n + m.annotation.notes.length, 0)
    + s.relations.reduce((n, r) => n + r.annotation.notes.length, 0);
  const noteDelta = notesOf(after) - notesOf(before);
  if (noteDelta > 0) {
    lines(system).push({ mark: "+", text: `${noteDelta} note(s) attached` });
  } else if (noteDelta < 0) {
    lines(system).push({ mark: "-", text: `${-noteDelta} note(s) removed` });
  }

  return [...groups].filter(([, l]) => l.length > 0).map(([title, l]) => ({ title, lines: l }));
}

/** "3 changes across 2 models" — the sentence correction 8 heads the surface with. */
export function changeHeadline(groups: readonly ChangeGroup[]): string {
  const changes = groups.reduce((n, g) => n + g.lines.length, 0);
  if (changes === 0) {
    return "No change to the model system. The revision differs for a reason this surface cannot "
      + "see — read the Provenance and Findings before committing.";
  }
  const scopes = groups.length;
  return `${changes} change${changes === 1 ? "" : "s"} across ${scopes} `
    + `${scopes === 1 ? "group" : "groups"}`;
}

// --------------------------------------------------------------------------------------------
// What it does to the claims
// --------------------------------------------------------------------------------------------

/** One property whose reading this change moves, or deliberately does not. */
export interface PropertyChange {
  readonly id: string;
  readonly proposition: string;
  /** "requirement" when either revision declares an expectation on it (§13). */
  readonly kind: "property" | "requirement";
  /** null when the claim is not tracked in that revision. */
  readonly before: PropertyStatus | null;
  readonly after: PropertyStatus | null;
  /** Did the reading MOVE? The field every caller branches on; `reading` only renders it. */
  readonly moved: boolean;
  /** "ESTABLISHED → REFUTED" / "unchanged: NOT ANSWERABLE" / "newly tracked: ESTABLISHED". */
  readonly reading: string;
  /** Does an obligation break here? Only a requirement can, and only in that direction. */
  readonly breaks: boolean;
}

export interface PropertyImpact {
  /** Conclusive and unmoved. Reported as a COUNT, which is what the author's sketch shows. */
  readonly unchangedCount: number;
  /** Moved, in either direction, plus the unchanged ones whose status licenses no conclusion. */
  readonly notable: readonly PropertyChange[];
  /** The subset G3 interposes for: a requirement whose reading this change moves. */
  readonly movedRequirements: readonly PropertyChange[];
  /** Requirements this change leaves exactly as they were. */
  readonly steadyRequirements: number;
}

const statusWord = (s: PropertyStatus | null): string => (s === null ? "not tracked" : STATUS_WORD[s]);

/**
 * What one change does to every tracked claim.
 *
 * Pure over two evaluations, so the decision to interpose and the surface that explains it read the
 * same function — a second opinion about whether a requirement moved is the one disagreement this
 * surface cannot afford.
 *
 * **A "move" is a change of STATUS or of KIND, not only a break.** G3's words are "would flip a
 * requirement", and a requirement that newly holds has flipped as much as one that stopped holding;
 * the reader deciding whether to commit wants to see both, and the surface labels the direction. A
 * kind change counts because declaring (or withdrawing) an expectation turns a property into an
 * obligation and back, which is the lifecycle's last step and not a cosmetic edit.
 *
 * An UNCHANGED claim whose status licenses no conclusion — NOT ANSWERABLE, INCONCLUSIVE, NOT
 * EVALUATED — is listed rather than counted, which is the author's own sketch: "? Runtime-delivery
 * property / unchanged: NOT ANSWERABLE". Folding it into "5 unchanged" would read as five answers.
 */
export function propertyImpact(
  before: readonly EvaluatedProperty[], after: readonly EvaluatedProperty[],
): PropertyImpact {
  const was = new Map(before.map((p) => [p.id, p] as const));
  const now = new Map(after.map((p) => [p.id, p] as const));
  const ids = [...new Set([...was.keys(), ...now.keys()])];

  let unchangedCount = 0;
  let steadyRequirements = 0;
  const notable: PropertyChange[] = [];

  for (const id of ids) {
    const b = was.get(id);
    const a = now.get(id);
    const kind: "property" | "requirement" =
      b?.kind === "requirement" || a?.kind === "requirement" ? "requirement" : "property";
    const beforeStatus = b?.status ?? null;
    const afterStatus = a?.status ?? null;
    const moved = beforeStatus !== afterStatus || (b !== undefined && a !== undefined && b.kind !== a.kind);
    const proposition = a?.proposition ?? b?.proposition ?? id;

    if (!moved && afterStatus !== null && CONCLUSIVE.has(afterStatus)) {
      unchangedCount += 1;
      if (kind === "requirement") steadyRequirements += 1;
      continue;
    }
    if (!moved && kind === "requirement") steadyRequirements += 1;

    const reading = moved
      ? (beforeStatus === null
        ? `newly tracked: ${statusWord(afterStatus)}`
        : afterStatus === null
          ? `no longer tracked; was ${statusWord(beforeStatus)}`
          : `${statusWord(beforeStatus)} → ${statusWord(afterStatus)}`)
      : `unchanged: ${statusWord(afterStatus)}`;

    notable.push({
      id, proposition, kind, before: beforeStatus, after: afterStatus, moved, reading,
      breaks: kind === "requirement" && b?.expectation?.met === true && a?.expectation?.met !== true,
    });
  }

  return {
    unchangedCount,
    notable,
    movedRequirements: notable.filter((c) => c.moved && c.kind === "requirement"),
    steadyRequirements,
  };
}

/** "✓ 2 remain satisfied" — the REQUIREMENTS block's own line. */
export function requirementsReading(impact: PropertyImpact): string {
  if (impact.movedRequirements.length === 0) {
    return impact.steadyRequirements === 0
      ? "This model system declares no requirements, so no obligation is at stake."
      : `${impact.steadyRequirements} requirement(s) read exactly as they did.`;
  }
  const broken = impact.movedRequirements.filter((c) => c.breaks).length;
  return `${impact.movedRequirements.length} requirement(s) move`
    + (broken > 0 ? `, ${broken} of them no longer satisfied.` : ".")
    + ` ${impact.steadyRequirements} unchanged.`;
}

// --------------------------------------------------------------------------------------------
// The seam the mutation funnel uses
// --------------------------------------------------------------------------------------------

/** What `land` was asked to do: the operations, the base they were computed against, their names. */
export interface Change {
  readonly base: string;
  readonly operations: readonly Operation[];
  /** The operation names joined, for the announcement. "add-entity + set-label". */
  readonly applied: string;
  readonly rationale?: string;
}

export type LandResult =
  /** On the authoritative branch, undo one keystroke away. */
  | { readonly kind: "committed" }
  /** Held open; the review surface has it. The caller's own form may close. */
  | { readonly kind: "reviewing" }
  | { readonly kind: "rejected"; readonly findings: readonly Finding[] };

export interface ReviewSurface extends ShellRegion {
  /**
   * Land one change the way G3 says: straight onto the authoritative branch unless a requirement
   * would move, and through this surface when one would.
   */
  readonly land: (change: Change) => LandResult;
}

/** The label a transparently-interposed probe carries. Never shown as a name the user chose. */
const PROBE = "pending review";

const envelope = (change: Change, target: string): unknown => ({
  transaction: {
    base: change.base,
    target,
    // OMITTED when absent, never sent as null: the schema types `rationale` as a string and the
    // parser refuses a present-but-non-string value, so an explicit null rejects the whole
    // transaction with a message about the rationale rather than applying the edit.
    ...(change.rationale === undefined || change.rationale === "" ? {} : { rationale: change.rationale }),
    operations: change.operations,
  },
});

export function mountReview(ctx: ShellContext): ReviewSurface {
  const dialog = regionHost("review") as HTMLDialogElement;
  const headline = byId("review-headline");
  const changeList = byId("review-changes");
  const impactList = byId("review-impact");
  const requirements = byId("review-requirements");
  const evidence = byId("review-evidence");
  const commit = byId<HTMLButtonElement>("hypothesis-apply");
  const discard = byId<HTMLButtonElement>("hypothesis-discard");
  const arm = byId<HTMLButtonElement>("whatif-arm");

  /** The last authoritative observation. The base every review is computed against. */
  let authoritative: { system: CanonicalSystem; properties: readonly EvaluatedProperty[] } | null = null;
  /**
   * The operations to re-apply on Commit, for an interposed human edit.
   *
   * Non-null means "this branch is a probe": Commit discards it and re-applies through `transact`,
   * so the authoritative undo stack keeps its depth. Null means the branch itself is what the user
   * is accepting — an agent's hypothesis or an armed what-if — and Commit accepts it.
   */
  let pending: Change | null = null;
  /** True for the duration of `land`, so a repaint mid-decision cannot open a half-decided review. */
  let deciding = false;
  /** The last frame, for the Inspect click that arrives between paints. */
  let lastFrame: ShellFrame | null = null;
  /** Is the next edit armed as a deliberate what-if? One-shot: consumed by the edit it routes. */
  let armed = false;
  let whatIfs = 0;

  function setArmed(next: boolean): void {
    armed = next;
    arm.setAttribute("aria-pressed", String(next));
    arm.textContent = next ? "What-if armed — cancel" : "Start a what-if…";
  }

  // -- rendering ------------------------------------------------------------------------------

  function renderChanges(groups: readonly ChangeGroup[]): void {
    changeList.replaceChildren(...groups.map((group) => {
      const section = document.createElement("li");
      const title = document.createElement("h3");
      title.textContent = group.title;
      const list = document.createElement("ul");
      list.append(...group.lines.map((line) => {
        const item = document.createElement("li");
        // The mark and the words, both. A `+` alone is a glyph-only distinction, which the house
        // rule refuses: a screen-reader user hears "plus" and learns nothing.
        item.textContent = `${line.mark === "+" ? "added" : line.mark === "-" ? "removed" : "changed"}: ${line.text}`;
        return item;
      }));
      section.append(title, list);
      return section;
    }));
  }

  function renderImpact(impact: PropertyImpact): void {
    const nodes: HTMLElement[] = [];
    const counted = document.createElement("li");
    counted.textContent = impact.unchangedCount === 0
      ? "No claim is left both conclusive and unmoved by this change."
      : `${impact.unchangedCount} claim(s) unchanged and still conclusive.`;
    nodes.push(counted);
    for (const change of impact.notable) {
      const item = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = `${change.kind === "requirement" ? "Requirement" : "Property"} `
        + `${change.proposition} — ${change.reading}`;
      item.append(label);
      // Inspect is offered for a claim that MOVED, because the witness is what explains the move.
      // An unchanged NOT-ANSWERABLE claim has a refusal, not a witness, and its own row says so.
      if (change.moved) {
        const inspect = document.createElement("button");
        inspect.type = "button";
        inspect.dataset["inspect"] = change.id;
        inspect.textContent = `Inspect ${change.id}`;
        item.append(" ", inspect);
      }
      nodes.push(item);
    }
    impactList.replaceChildren(...nodes);
  }

  /**
   * Read the witness for one claim, through the same classifier `window.mage.evidence` uses.
   *
   * The three-member union is consumed as three, which is the point of its being one:
   * `DECISIONS-RULED-agent-evidence-261002.md` records that a found witness, a withheld one with a
   * cause, and an id naming no saved question are three situations, and that collapsing any two
   * teaches a falsehood. A reviewer who is told "no evidence" for a claim the model DECLINES would
   * go hunting for a modelling gap that does not exist.
   */
  function readEvidence(queryId: string): EvidenceReading {
    const results = ctx.workspace.runSavedQueries();
    const saved = [...ctx.workspace.state.system.queries.keys()];
    const result = results.get(queryId);
    if (result === undefined) return noSuchQuestion(queryId, saved);
    return classifyEvidence(queryId, result, saved);
  }

  /**
   * Show one reading.
   *
   * The witness LINES come from the view model's own `PropertyRow.evidence`, not from a second walk
   * over `Evidence.steps`: one module decides how a witness reads, and a reviewer comparing this
   * surface against the property rail must not meet two renderings of one trace. What this surface
   * adds is which ARM of the reading it got, because that is the fact the rail does not carry.
   */
  function renderEvidence(reading: EvidenceReading, lines: readonly string[]): void {
    const head = document.createElement("p");
    if (reading.found) {
      head.textContent = `${reading.queryId}: the ${reading.evidence.role} this verdict rests on.`;
      const steps = document.createElement("ol");
      steps.append(...lines.map((line) => {
        const item = document.createElement("li");
        item.textContent = line;
        return item;
      }));
      evidence.replaceChildren(head, steps);
      return;
    }
    // Both absent arms, reported with the CAUSE as a word and the engine's own sentence. Neither is
    // "no evidence": one is a model declining, the other an id naming nothing.
    head.textContent = `${reading.queryId}: no witness — ${reading.cause}. ${reading.prose}`;
    evidence.replaceChildren(head);
  }

  // -- the surface's own lifecycle ------------------------------------------------------------

  function show(frame: ShellFrame): void {
    const base = authoritative;
    const groups = base === null ? [] : changeGroups(base.system, frame.state.system);
    const impact = propertyImpact(base?.properties ?? [], frame.properties);
    headline.textContent = base === null
      ? "A change is open for review. The authoritative revision it was computed against is not on "
        + "this page, so the grouped change list is empty."
      : changeHeadline(groups);
    renderChanges(groups);
    renderImpact(impact);
    requirements.textContent = requirementsReading(impact);
    evidence.replaceChildren();
    commit.textContent = pending === null
      ? "Commit this change as authoritative"
      : "Commit this change";
    dialog.hidden = false;
    dialog.showModal();
    // The dialog itself, not either button. The platform traps focus but does not choose where it
    // lands, and both choices here are consequential: a caret parked on Discard turns an absent
    // Enter into thrown-away work, and one parked on Commit turns it into an unreviewed commit. So
    // focus goes to the top of the content, where a screen reader starts reading at the heading and
    // Tab reaches Discard and then Commit. `tabindex="-1"` on the host is what makes that possible.
    dialog.focus();
    ctx.announce(`Review change. ${headline.textContent} ${requirements.textContent} `
      + "Discard or Commit; Escape does not dismiss this.");
  }

  function hide(): void {
    if (dialog.open) dialog.close();
    dialog.hidden = true;
  }

  // Escape is refused. See the module header: the two ways out are the two buttons, and dismissing
  // the surface would leave a hypothesis open with no route back to it.
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    ctx.announce("This change is still open. Discard it or Commit it — Escape cannot leave it pending.");
  });

  dialog.addEventListener("close", () => {
    changeList.replaceChildren();
    impactList.replaceChildren();
    evidence.replaceChildren();
    dialog.hidden = true;
  });

  impactList.addEventListener("click", (event) => {
    const from = event.target;
    if (!(from instanceof Element)) return;
    const button = from.closest<HTMLButtonElement>("button[data-inspect]");
    const queryId = button?.dataset["inspect"];
    if (queryId === undefined) return;
    const reading = readEvidence(queryId);
    const lines = lastFrame?.vm.properties.find((p) => p.id === queryId)?.evidence ?? [];
    renderEvidence(reading, lines);
    ctx.announce(reading.found
      ? `Evidence for ${queryId}: ${reading.evidence.role}, ${lines.length} line(s).`
      : `No witness for ${queryId}: ${reading.cause}.`);
  });

  commit.addEventListener("click", () => {
    const held = pending;
    const label = ctx.workspace.state.hypothesis ?? "";
    if (held === null) {
      if (!ctx.workspace.applyHypothesis()) return;
      ctx.announce(`"${label}" is now the authoritative model.`);
      return;
    }
    // A probe: throw the branch away and re-apply the identical operations authoritatively, so the
    // undo stack keeps its depth and `transact` stays the single authoritative mutator.
    pending = null;
    ctx.workspace.discardHypothesis();
    const result = ctx.workspace.transact(envelope(held, "main"));
    ctx.announce(result.ok
      ? `${held.applied} committed. ${ctx.workspace.state.findings.length} validation finding(s). Undo reverses it.`
      : `${held.applied} was reviewed and then rejected: ${result.findings[0]?.message ?? "no reason was reported."}`);
  });

  discard.addEventListener("click", () => {
    const label = ctx.workspace.state.hypothesis ?? "";
    pending = null;
    if (!ctx.workspace.discardHypothesis()) return;
    ctx.announce(`"${label}" discarded. The authoritative model was never touched.`);
  });

  arm.addEventListener("click", () => {
    setArmed(!armed);
    ctx.announce(armed
      ? "What-if armed. The next edit opens as a what-if for review instead of committing; the "
        + "authoritative model is not touched until you commit it."
      : "What-if cancelled. The next edit commits normally.");
  });

  // -- landing --------------------------------------------------------------------------------

  const land = (change: Change): LandResult => {
    // Already reviewing: the edit joins the branch the user is looking at. There is no nesting, and
    // interposing a review inside a review would ask the same question twice.
    if (ctx.workspace.state.hypothesis !== null) {
      const result = ctx.workspace.transact(envelope(change, ctx.workspace.state.hypothesis));
      return result.ok ? { kind: "committed" } : { kind: "rejected", findings: result.findings };
    }

    const base = authoritative;
    const requirementCount = (base?.properties ?? []).filter((p) => p.kind === "requirement").length;

    // The author's own limit: "If there is no tracked-property consequence, don't make the user
    // stare at this every time they rename a label." With no obligation declared, nothing can be
    // broken, so there is nothing to interpose for and no probe worth paying for.
    if (!armed && requirementCount === 0) {
      const result = ctx.workspace.transact(envelope(change, "main"));
      return result.ok ? { kind: "committed" } : { kind: "rejected", findings: result.findings };
    }

    const label = armed ? `what-if ${whatIfs + 1}` : PROBE;
    deciding = true;
    try {
      const opened = ctx.workspace.openHypothesis(label, envelope(change, label));
      if (!opened.ok) return { kind: "rejected", findings: opened.findings };

      if (armed) {
        whatIfs += 1;
        setArmed(false);
        pending = null;
        return { kind: "reviewing" };
      }

      // The hypothetical evaluation: every saved query re-run on the branch, which is what
      // `properties()` already does for whichever branch is current.
      const impact = propertyImpact(base?.properties ?? [], ctx.workspace.properties());
      if (impact.movedRequirements.length > 0) {
        pending = change;
        return { kind: "reviewing" };
      }
      // No obligation moved. Commit-and-announce, G3's other half: discard the probe and apply the
      // same operations authoritatively so the undo stack is untouched.
      ctx.workspace.discardHypothesis();
      const result = ctx.workspace.transact(envelope(change, "main"));
      return result.ok ? { kind: "committed" } : { kind: "rejected", findings: result.findings };
    } finally {
      deciding = false;
    }
  };

  setArmed(false);

  return {
    land,
    paint: (frame: ShellFrame) => {
      lastFrame = frame;
      arm.disabled = !frame.state.loaded;
      if (!frame.state.loaded && armed) setArmed(false);

      if (frame.state.hypothesis === null) {
        // The authoritative observation, remembered as the base of the next review. Taken from the
        // frame rather than from a second `workspace.properties()` call, so the surface and the
        // panes beside it describe one observation of one revision (UX-I3).
        authoritative = { system: frame.state.system, properties: frame.properties };
        pending = null;
        hide();
        return;
      }
      // A hypothesis is open. Not while `land` is still deciding whether it survives, and not over
      // an edit dialog: two modals stacked is a focus ordering the platform does not define and a
      // screen reader reads as two currently-operable regions.
      if (deciding || byId<HTMLDialogElement>("edit-dialog").open) return;
      if (!dialog.open) show(frame);
    },
  };
}
