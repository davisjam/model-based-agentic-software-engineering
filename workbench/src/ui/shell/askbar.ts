/**
 * The `askbar` and `advanced-query` surfaces: asking a question, and keeping the answer.
 *
 * Correction 5 of `DESIGN-shell-261002.md` makes a persistent bottom input the primary question
 * surface and demotes the structured builder — "Shape of question: direct / Relation to traverse:
 * calls / Quantifier: exists" — to Advanced. Correction 7 gives an answer two acts: inspect its
 * evidence, keep it as a property.
 *
 * ## Filter, not parser (ruled)
 *
 * `DECISIONS-RULED-shell-261002.md` G2: the typed text FILTERS the deterministic question
 * catalogue. Unmatched text is answered by pointing at the coding agent or Advanced query. This
 * module owns no parser, no template matcher and no keyword-to-query inference, and the reason is
 * recorded in the ruling: a bar that silently matched English into a formal query would fabricate
 * precision the engine never had, and this project already shipped one fabrication of that family
 * — a latency question over a system declaring no quantities answered `holds` with a magnitude of
 * 0 ms, a figure that looked measured.
 *
 * ## The catalogue is DERIVED, and that is the whole design
 *
 * A hardcoded list of three contextual questions goes stale the moment the engine gains a form, and
 * offers questions the loaded system cannot answer. So every offered question is a question SHAPE
 * instantiated with the current selection, and four authorities decide which shapes survive:
 *
 *   - **`GRAPH_FORMS`** (`src/engine/types.ts`) — which shapes exist at all. `CONTEXT_SLOT` below
 *     is a total `Record` over it, so a form added to the engine fails THIS file to compile until
 *     someone says whether it has a contextual spelling.
 *   - **the model-type registry** (`src/engine/model-types.ts`) — whether this system declares the
 *     substrate a shape is answered over. The same `presentIn` predicate the kernel's own dispatch
 *     gate consults, so the catalogue cannot offer a question the engine would refuse with
 *     `missing-model-type`.
 *   - **`CanonRelationType.pathComposition`** — V7. A multi-hop shape over a `forbidden` relation
 *     type comes back UNLICENSED, not false. Message Bus declares `subscribes` forbidden on
 *     purpose, so "can anything reach Analytics through subscribes" is a question the model
 *     declines — and the catalogue therefore does not ask it, while the same shape over `calls`
 *     stays offered.
 *   - **the system's own relations** — a shape is instantiated only with a relation type the
 *     selected entity actually participates in.
 *
 * **The LABEL is the engine's own reading of the query.** `interpretation` (`src/engine/graph.ts`)
 * is the function that tells a user what was actually evaluated; the catalogue calls it on the very
 * query the item will submit. So the sentence offered, the sentence asked and the sentence saved are
 * one string from one source, and no prose about question shapes lives in this file.
 *
 * ## One builder, so tracking cannot drift from asking
 *
 * An item carries an `AskRequest` — what the Advanced form yields — rather than a finished query
 * document. `planAsk` then builds the query for Ask, and `planEdit`'s `save-property` builds it
 * again from the same request for Track. That is §10.3's "preserve the statement's semantics"
 * held structurally: the property kept is built by the function that built the answer on screen.
 */
import { parseGraphQuery } from "../../engine/index.ts";
import { GRAPH_COMPOSING, GRAPH_FORMS, detail } from "../../engine/types.ts";
import type { GraphForm } from "../../engine/types.ts";
import { interpretation } from "../../engine/graph.ts";
import { modelTypeForQueryKind } from "../../engine/model-types.ts";
import type { ModelType } from "../../engine/model-types.ts";
import { learnLinkForRefusal } from "../../app/learn.ts";
import type { LearnLink } from "../../app/learn.ts";
import type { CanonicalSystem, QueryResult } from "../../ir/types.ts";
import { classifyEvidence, noSuchQuestion } from "../../app/agent-api.ts";
import type { EvidenceReading } from "../../app/agent-api.ts";
import { normalizeToStatement } from "../../app/properties.ts";
import type { EvaluatedProperty } from "../../app/properties.ts";
import { fillSelect, paintAnswer } from "../render-dom.ts";
import { planAsk, propertyRow, resolveSelection } from "../view-model.ts";
import type { AskRequest, Choice, Selection } from "../view-model.ts";
import type { QueryCheckResult } from "../../engine/check.ts";
import { byId, input, mountIf, sel } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { regionHost } from "./surfaces.ts";
import type { SubmitEdit } from "./edit-forms.ts";

// --------------------------------------------------------------------------------------------
// The catalogue — derived. No DOM below this line until `mountAskBar`.
// --------------------------------------------------------------------------------------------

/**
 * One offerable question.
 *
 * `ask` is null exactly when the question is already SAVED in the system: its query document is the
 * authored one, so re-deriving an `AskRequest` for it would be a second spelling of a question the
 * file already states. A saved item is therefore asked by its id and cannot be "tracked" — it is
 * tracked already.
 */
export interface AskItem {
  /** The value an option carries. `saved:<id>` or `ctx:<form>:<relation>:<entity>`. */
  readonly key: string;
  /** What the user reads: for a derived item, the engine's own interpretation of the query. */
  readonly label: string;
  readonly source: "saved" | "contextual";
  readonly savedId: string | null;
  readonly ask: AskRequest | null;
}

/**
 * Which endpoint a selected entity fills, per graph form — or null when the form has no spelling
 * about one entity.
 *
 * TOTAL over `GRAPH_FORMS` by type, which is the control: a form added to the engine breaks this
 * file until its contextual spelling is decided, rather than silently never being offered.
 *
 * The nulls are decisions and each has a reason:
 *
 *   - `path`, `shortest-path`, `all-paths` are questions about a PAIR. With one endpoint named they
 *     degrade to "from Analytics to any entity", which is what `reachability` already asks and
 *     answers with a witness.
 *   - `direct` is subsumed by `predecessors`/`successors`, which name the neighbours rather than
 *     answering yes about an unnamed one.
 *   - `cycles` asks about the whole relation graph; no endpoint changes the question.
 *   - `containment` walks the entity containment tree and ignores the relation type, so it has no
 *     per-relation spelling. It is the one answerable shape this table declines to offer, and it
 *     wants a selection-scoped item of its own rather than a relation-keyed one.
 */
const CONTEXT_SLOT: Readonly<Record<GraphForm, "from" | "to" | null>> = {
  direct: null,
  reachability: "to",
  path: null,
  "shortest-path": null,
  "all-paths": null,
  predecessors: "to",
  successors: "from",
  cycles: null,
  components: "from",
  containment: null,
};

/** The order questions are offered in, so two paints of one system agree. */
const SLOTTED_FORMS: readonly GraphForm[] = GRAPH_FORMS.filter((f) => CONTEXT_SLOT[f] !== null);

const askRequestFor = (form: GraphForm, relation: string, slot: "from" | "to", entity: string): AskRequest => ({
  form,
  relation,
  from: slot === "from" ? entity : "",
  to: slot === "to" ? entity : "",
  // `exists` throughout: every slotted shape is established by a WITNESS, and V21 refuses to infer
  // a quantifier because the two take different evidence. A universal over one endpoint is a
  // question the Advanced form states deliberately.
  quantifier: "exists",
  maxHops: "",
});

/**
 * The engine's reading of what an `AskRequest` asks, or null when the request does not form a query.
 *
 * Through `planAsk` and `parseGraphQuery`, so the label describes the query that will actually run.
 * A null is unreachable for the requests this module builds; it is a type, not a fallback, and
 * returning one drops the item rather than offering a question with invented wording.
 */
export function labelFor(request: AskRequest): string | null {
  const planned = planAsk(request);
  if (!planned.ok) return null;
  const parsed = parseGraphQuery(planned.query["graph"]);
  return parsed.ok ? interpretation(parsed.value) : null;
}

/**
 * The questions this system can answer about one selected entity.
 *
 * Derived, never enumerated. The gates, in the order they fire: the entity is declared; a structural
 * model exists at all (the registry's own predicate); the relation type is one the entity
 * participates in; and a composing shape is offered only where the relation type licenses
 * composition (V7).
 */
export function contextualQuestions(system: CanonicalSystem, entity: string): readonly AskItem[] {
  if (!system.entities.has(entity)) return [];
  if (!typeFor("graph").presentIn(system)) return [];

  const participates = new Set(
    system.relations.filter((r) => r.from === entity || r.to === entity).map((r) => r.type));

  const items: AskItem[] = [];
  for (const [type, relationType] of system.relationTypes) {
    if (!participates.has(type)) continue;
    for (const form of SLOTTED_FORMS) {
      const slot = CONTEXT_SLOT[form];
      if (slot === null) continue;
      // V7: a multi-hop question over a `forbidden` type is UNLICENSED, not false. The model
      // declines the inference, so the catalogue does not offer it -- offering it would send a
      // reader to a refusal that reads like a tooling failure.
      if (GRAPH_COMPOSING.has(form) && relationType.pathComposition === "forbidden") continue;
      const ask = askRequestFor(form, type, slot, entity);
      const label = labelFor(ask);
      if (label === null) continue;
      items.push({ key: `ctx:${form}:${type}:${entity}`, label, source: "contextual", savedId: null, ask });
    }
  }
  return items;
}

/**
 * The system's own saved properties, offered as the suggestions a loaded example arrives with.
 *
 * Read from `system.queries` rather than from the example's metadata file: the saved properties
 * are what this REVISION claims, so one an agent saved a moment ago is offered and a retracted one
 * is not. The label is the author's statement, or the id when the saved query carries no name.
 */
export function savedProperties(system: CanonicalSystem): readonly AskItem[] {
  return [...system.queries].map(([id, saved]) => {
    const raw = saved.raw;
    const name = typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)["name"]
      : undefined;
    return {
      key: `saved:${id}`,
      label: typeof name === "string" && name.trim() !== "" ? name.trim() : id,
      source: "saved" as const,
      savedId: id,
      ask: null,
    };
  });
}

/**
 * Everything offerable now: the system's saved properties, then the selection's own questions.
 *
 * **It takes a resolved `Selection`, and that is the fix for the defect this surface was the
 * victim of.** It used to take the wire strings and resolve the entity itself with
 * `selection.find((id) => system.entities.has(id))` — a test that answers only for the BARE
 * spelling. The contents tree writes the prefixed one, so clicking a node in the tree left this
 * catalogue at the saved properties alone: no "Can anything reach Analytics?", and since the Track
 * box opens only for an untracked answer, `askbar.track` was unreachable from a tree selection
 * altogether. The pane is not allowed to re-derive the meaning of a selection any more; it is
 * handed one, and `entity` is the only kind that carries contextual questions because the
 * contextual set is built from an entity's relations.
 */
export function askCatalogue(system: CanonicalSystem, selected: Selection): readonly AskItem[] {
  return [
    ...savedProperties(system),
    ...(selected.kind === "entity" ? contextualQuestions(system, selected.id) : []),
  ];
}

/**
 * The filter, and the whole of what typed text does.
 *
 * Case-insensitive substring over every whitespace-separated token the user typed, so word order
 * does not matter and nothing is interpreted. Empty text matches everything.
 */
export function filterCatalogue(items: readonly AskItem[], text: string): readonly AskItem[] {
  const terms = text.toLowerCase().split(/\s+/).filter((t) => t !== "");
  if (terms.length === 0) return items;
  return items.filter((i) => {
    const haystack = i.label.toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}

/**
 * What the surface says about the current filter — including the unmatched case, which is where G2
 * is honest rather than clever.
 *
 * No match is not an error and not a parse failure: it is a question this catalogue does not hold,
 * and the two places that CAN take it in the user's own words are named.
 */
export function filterState(matched: number, total: number, text: string): string {
  if (total === 0) {
    return "This model system saves no questions yet, and nothing is selected. Select an entity, or "
      + "state a question in Advanced query below.";
  }
  if (text.trim() === "") {
    return `${total} question(s) this model system can answer. Type to filter them.`;
  }
  if (matched === 0) {
    return `No question in this catalogue matches “${text.trim()}”. The text is a filter, not a `
      + "question: nothing here guesses which formal question an English sentence meant. Ask your "
      + "coding agent, which drives this same workbench through window.mage.ask, or open Advanced "
      + "query below and state it formally.";
  }
  return `${matched} of ${total} question(s) match. Choose one and press Ask.`;
}

/**
 * The model type a question of this kind is answered over, when the system declares none of it.
 *
 * The NOT ANSWERABLE route of the Learn requirement, and it reads the registry rather than the
 * refusal sentence: the same `presentIn` predicate `runTypedQuery` gates on decides whether the
 * panel appears, so the page cannot offer a Learn link for a refusal the kernel would not give.
 */
export function absentTypeFor(system: CanonicalSystem, query: unknown): ModelType | null {
  const kind = typeof query === "object" && query !== null && !Array.isArray(query)
    ? (query as Record<string, unknown>)["kind"]
    : undefined;
  if (kind !== "graph" && kind !== "behavior" && kind !== "quantity") return null;
  const t = modelTypeForQueryKind(kind);
  return t.presentIn(system) ? null : t;
}

/** The Learn link for an absent type, through the one refusal-to-Learn join. */
export function learnLinkForAbsentType(t: ModelType): LearnLink | null {
  return learnLinkForRefusal(detail("missing-model-type", [t.label], []));
}

const typeFor = (kind: "graph" | "behavior" | "quantity"): ModelType => modelTypeForQueryKind(kind);

/**
 * An id for a claim the user did not name, derived from the claim itself.
 *
 * Correction 7 forbids showing the immutable id in this surface, which makes deriving one this
 * module's job rather than the user's. Slugged from the claim so the id a later reader meets in the
 * file still says what the claim is, and suffixed on collision rather than overwriting a property
 * somebody else saved.
 */
export function derivePropertyId(claim: string, taken: ReadonlySet<string>): string {
  const base = claim.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  const stem = base === "" ? "claim" : base;
  if (!taken.has(stem)) return stem;
  for (let n = 2; ; n += 1) {
    const candidate = `${stem}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * The evidence reading for the question that was asked.
 *
 * Through `classifyEvidence`, the same classifier `window.mage.evidence(id)` uses, so the three
 * situations a reader must tell apart stay apart here too: a refusal is not a missing witness, and
 * neither is a question nobody saved. The ask bar reaches the third arm for real — the catalogue is
 * painted from a revision, and an agent can retract a question between the paint and the click.
 *
 * `run` is the query service, passed in, and the reading is RECOMPUTED through it rather than
 * reconstructed from the answer on screen. That is the evidence ruling's own posture — a verdict is
 * derived state, so it is recomputed and never stored — and it keeps this function pure enough to
 * drive from the node tier with the engine behind it.
 */
export function askEvidenceReading(
  system: CanonicalSystem,
  run: (raw: unknown) => QueryResult,
  item: AskItem,
  query: unknown,
): EvidenceReading {
  const saved = [...system.queries.keys()];
  if (item.savedId !== null && !system.queries.has(item.savedId)) {
    return noSuchQuestion(item.savedId, saved);
  }
  return classifyEvidence(item.savedId ?? item.label, run(query), saved);
}

/** The reading, as the lines the disclosure renders. One line per fact, never a paragraph. */
export function evidenceLines(reading: EvidenceReading): readonly string[] {
  if (reading.found) {
    const ev = reading.evidence;
    const nodes = ev.nodes === null ? [] : [`Nodes: ${ev.nodes.join(" → ")}`];
    return [
      `A witness was found: ${ev.role} (${ev.shape}).`,
      ...nodes,
      ...ev.steps.map((s, i) => `${i + 1}. ${s.instances.join(" + ")}`),
    ];
  }
  const cause = reading.cause === "unlicensed-by-model"
    ? "The model declines this question — it is refused, not unanswered."
    : reading.cause === "no-witness"
      ? "The question was answered and the answer shows no witness. That is a result, not a gap."
      : "No saved question goes by that name, so nothing ran.";
  return [
    cause,
    reading.prose,
    `This system saves: ${reading.savedQuestions.length === 0 ? "no questions" : reading.savedQuestions.join(", ")}.`,
  ];
}

/**
 * The sentences a check report reads as, one per arm.
 *
 * Derived from the report, never re-decided: the refused arm's sentence is the ENGINE's own, passed
 * through, because a second wording of one refusal teaches a reader that one of them is guessing —
 * the discipline `refusal.ts` names, and the reason the agent surface and this surface hand back
 * the same `QueryCheckResult` rather than each describing it.
 */
function checkReportLines(report: QueryCheckResult): {
  readonly headline: string; readonly detail: readonly string[]; readonly alternatives: readonly string[];
} {
  switch (report.outcome) {
    case "licensed":
      return {
        headline: "Askable. This is a meaningful and permitted question for this model system.",
        detail: [
          `It interrogates the ${typeFor(report.kind).label}, and running it will answer it.`,
          "A check does not predict the answer — Ask for that.",
        ],
        alternatives: [],
      };
    case "refused":
      return {
        headline: "Not askable as written. The models decline this question.",
        detail: [report.refusal.prose],
        alternatives: report.alternatives,
      };
    case "malformed":
      return {
        headline: "Not a question yet.",
        detail: [report.prose],
        alternatives: report.alternatives,
      };
  }
}

// --------------------------------------------------------------------------------------------
// The region
// --------------------------------------------------------------------------------------------

export function mountAskBar(ctx: ShellContext, submitEdit: SubmitEdit): ShellRegion {
  const region = regionHost("askbar");
  const askAnswer = byId("ask-answer");
  const checkReport = byId("ask-check-report");
  const askText = input("ask-text");
  const askChoice = sel("ask-choice");
  const filterLine = byId("ask-filter-state");

  const absentBox = byId("ask-absent");
  const absentProse = byId("ask-absent-prose");
  const absentLearn = byId<HTMLAnchorElement>("ask-absent-learn");

  const evidenceBox = byId<HTMLDetailsElement>("ask-evidence-box");
  const evidenceHost = byId("ask-evidence");
  const trackBox = byId("ask-track-box");
  const trackClaim = input("ask-track-claim");

  const askForm = sel("ask-form");
  const askRelation = sel("ask-relation");
  const askFrom = sel("ask-from");
  const askTo = sel("ask-to");
  const askQuantifier = sel("ask-quantifier");
  const saveExpect = sel("save-property-expect");
  const retractTarget = sel("retract-property-target");

  /** The Advanced forms, disabled together until a model is loaded. */
  const fieldsets = ["form-ask", "form-save-property", "form-retract-property"]
    .map((id) => byId<HTMLFieldSetElement>(id));

  /** The last frame painted. The click handlers read the system from here, not from the workspace. */
  let current: ShellFrame | null = null;
  /** The catalogue as last painted, so a click resolves the option to the item that built it. */
  let catalogue: readonly AskItem[] = [];
  /** What was last asked, and what came back. Track and Inspect evidence both read it. */
  let answered: {
    readonly item: AskItem;
    readonly query: unknown;
    readonly property: EvaluatedProperty;
  } | null = null;

  /** The Advanced form's current contents. Read in one place, so Ask and Save cannot disagree. */
  const advancedRequest = (): AskRequest => ({
    form: askForm.value,
    relation: askRelation.value,
    from: askFrom.value,
    to: askTo.value,
    quantifier: askQuantifier.value,
    maxHops: input("ask-max-hops").value,
  });

  /**
   * Paint one check report. Plain DOM, and `#live` announces the headline — the one announcer, so a
   * screen-reader user learns the verdict without having to go and read the region.
   */
  function paintCheck(report: QueryCheckResult): void {
    const lines = checkReportLines(report);
    const nodes: HTMLElement[] = [];
    const headline = document.createElement("p");
    headline.className = report.outcome === "licensed" ? "hint" : "refusal";
    headline.textContent = lines.headline;
    nodes.push(headline);
    for (const sentence of lines.detail) {
      const p = document.createElement("p");
      p.textContent = sentence;
      nodes.push(p);
    }
    if (lines.alternatives.length > 0) {
      const h = document.createElement("p");
      h.className = "hint";
      h.textContent = "What this model system does license instead:";
      nodes.push(h);
      const list = document.createElement("ul");
      for (const alternative of lines.alternatives) {
        const li = document.createElement("li");
        li.textContent = alternative;
        list.append(li);
      }
      nodes.push(list);
    }
    checkReport.replaceChildren(...nodes);
    ctx.announce(lines.headline);
  }

  function clearAnswerSurfaces(): void {
    answered = null;
    absentBox.hidden = true;
    evidenceBox.hidden = true;
    evidenceBox.open = false;
    evidenceHost.replaceChildren();
    trackBox.hidden = true;
  }

  /** Paint one answer and the two acts correction 7 attaches to it. */
  function showAnswer(item: AskItem, query: unknown, property: EvaluatedProperty): void {
    answered = { item, query, property };
    paintAnswer(propertyRow(property), "", askAnswer);

    const system = current?.state.system ?? null;
    const absent = system === null ? null : absentTypeFor(system, query);
    const link = absent === null ? null : learnLinkForAbsentType(absent);
    absentBox.hidden = link === null;
    if (absent !== null && link !== null) {
      // The engine's own refusal sentence reaches the reader through the answer block above; this
      // panel adds the route the Learn requirement asks for and nothing else.
      absentProse.textContent = `NOT ANSWERABLE — this system declares no ${absent.label}. `
        + `${absent.question} is what one represents.`;
      absentLearn.textContent = link.text;
      absentLearn.href = link.href;
    }

    evidenceBox.hidden = false;
    evidenceBox.open = false;
    evidenceHost.replaceChildren();

    // Track is for a question that is not already kept. A saved question IS a property.
    trackBox.hidden = item.savedId !== null;
    if (item.savedId === null) trackClaim.value = item.label;

    ctx.announce(`Answered: ${property.status.replace(/-/g, " ")}. `
      + `${property.grounds.length} model(s) or machine(s) establish it. `
      + `${item.savedId === null ? "Nothing is saved yet." : "This question is already tracked."}`);
  }

  /** Ask the chosen catalogue item. The one place the primary surface runs a question. */
  function askChosen(): void {
    const frame = current;
    if (frame === null) return;
    const item = catalogue.find((i) => i.key === askChoice.value);
    if (item === undefined) {
      const matched = filterCatalogue(catalogue, askText.value);
      const problem = matched.length === 0
        ? filterState(0, catalogue.length, askText.value)
        : "Choose one of the questions listed above, then press Ask.";
      paintAnswer(null, problem, askAnswer);
      clearAnswerSurfaces();
      ctx.announce(problem);
      return;
    }
    if (item.ask === null) {
      const saved = item.savedId === null ? undefined : frame.state.system.queries.get(item.savedId);
      if (saved === undefined) {
        // The question was retracted between this paint and this click -- an agent may do that at
        // any moment. Reported as what it is rather than as an empty answer.
        const problem = `“${item.label}” is no longer a saved question of this model system.`;
        paintAnswer(null, problem, askAnswer);
        clearAnswerSurfaces();
        ctx.announce(problem);
        return;
      }
      showAnswer(item, saved.raw, ctx.workspace.evaluate(item.savedId ?? item.label, saved.raw));
      return;
    }
    const planned = planAsk(item.ask, item.label);
    if (!planned.ok) {
      paintAnswer(null, planned.problem, askAnswer);
      clearAnswerSurfaces();
      ctx.announce(planned.problem);
      return;
    }
    // `workspace.evaluate` is the SAME service `window.mage.ask` calls, so the grounding a person
    // reads is the grounding an agent reads. Nothing is saved: a question is transient until
    // somebody says otherwise.
    showAnswer(item, planned.query, ctx.workspace.evaluate(item.label, planned.query));
  }

  function repaintCatalogue(frame: ShellFrame): void {
    catalogue = askCatalogue(
      frame.state.system, resolveSelection(frame.state.system, ctx.viewState.selection[0]));
    const matched = filterCatalogue(catalogue, askText.value);
    const choices: readonly Choice[] = matched.map((i) => ({ value: i.key, label: i.label }));
    fillSelect(askChoice, choices);
    askChoice.disabled = choices.length === 0;
    filterLine.textContent = filterState(matched.length, catalogue.length, askText.value);
  }

  // Typing filters; it never asks and never parses. Re-filtering from the last painted frame rather
  // than through `repaint()` -- the model has not changed, and a repaint would be a lie about that.
  askText.addEventListener("input", () => {
    if (current !== null) repaintCatalogue(current);
  });
  askText.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); askChosen(); }
  });
  byId("ask-submit").addEventListener("click", () => askChosen());

  evidenceBox.addEventListener("toggle", () => {
    if (!evidenceBox.open) return;
    const state = answered;
    const system = current?.state.system ?? null;
    if (state === null || system === null) {
      evidenceHost.replaceChildren(document.createTextNode("Ask a question first."));
      return;
    }
    const lines = evidenceLines(
      askEvidenceReading(system, (raw) => ctx.workspace.query(raw), state.item, state.query));
    const list = document.createElement("ul");
    for (const line of lines) {
      const li = document.createElement("li");
      li.textContent = line;
      list.append(li);
    }
    evidenceHost.replaceChildren(list);
  });

  byId("ask-track-go").addEventListener("click", () => {
    const state = answered;
    const frame = current;
    if (state === null || frame === null || state.item.ask === null) return;
    const claim = trackClaim.value.trim();
    if (claim === "") {
      ctx.announce("State the claim this property makes. A property is an assertion about the system.");
      return;
    }
    // Normalized HERE as well as in `planEdit`, so the derived id comes from the statement the
    // property will actually carry rather than from the question that was on screen. The Track box
    // is prefilled with the composer's interrogative label, so without this the commonest tracked
    // property would be addressed as `is-fulfillment-reachable-from-checkout` for the rest of its
    // life. `normalizeToStatement` is idempotent, so `planEdit` normalizing again is a no-op.
    const statement = normalizeToStatement(claim).statement;
    // No id field and no expectation control, per correction 7: the id is derived from the claim and
    // a tracked claim is a plain property until somebody declares an expectation on it. The same
    // `save-property` envelope the Advanced form sends, through the one mutation funnel.
    submitEdit({
      form: "save-property",
      id: derivePropertyId(statement, new Set(frame.state.system.queries.keys())),
      statement,
      expect: "",
      ask: state.item.ask,
    });
    clearAnswerSurfaces();
  });

  // -- Advanced query -------------------------------------------------------------------------

  byId("ask-go").addEventListener("click", () => {
    const statement = input("save-property-statement").value.trim();
    const request = advancedRequest();
    const planned = planAsk(request, statement);
    if (!planned.ok) {
      paintAnswer(null, planned.problem, askAnswer);
      clearAnswerSurfaces();
      ctx.announce(planned.problem);
      return;
    }
    const label = statement === "" ? (labelFor(request) ?? "(unsaved)") : statement;
    showAnswer(
      { key: "advanced", label, source: "contextual", savedId: null, ask: request },
      planned.query,
      ctx.workspace.evaluate(label, planned.query),
    );
  });

  byId("ask-check-go").addEventListener("click", () => {
    const request = advancedRequest();
    const planned = planAsk(request);
    if (!planned.ok) {
      // The form's own pre-flight, not the engine's. Reported in the same host, because "you have
      // not finished composing" and "the models decline this" are both answers to "is this askable".
      paintCheck({ outcome: "malformed", prose: planned.problem, alternatives: [] });
      return;
    }
    paintCheck(ctx.workspace.check(planned.query));
  });

  byId("save-property-go").addEventListener("click", () => submitEdit({
    form: "save-property",
    id: input("save-property-id").value,
    statement: input("save-property-statement").value,
    expect: saveExpect.value,
    ask: advancedRequest(),
  }));

  byId("retract-property-go").addEventListener("click", () => submitEdit({
    form: "retract-property",
    id: retractTarget.value,
  }));

  return {
    paint: (frame: ShellFrame) => {
      current = frame;
      mountIf(region, frame.state.loaded);
      // Disabling the fieldset disables everything inside it, which is how a whole surface turns
      // off before a model is loaded without tracking each control.
      for (const f of fieldsets) f.disabled = !frame.state.loaded;
      askText.disabled = !frame.state.loaded;
      byId<HTMLButtonElement>("ask-submit").disabled = !frame.state.loaded;

      repaintCatalogue(frame);

      // A question this answer was about can be retracted, or the model can move under it. The
      // answer block itself is left standing -- it says which revision it describes -- but the two
      // ACTS are withdrawn, because tracking a claim whose question has changed would save the new
      // one under the old claim's words.
      if (answered !== null && answered.property.currentRevision !== frame.state.hash) {
        clearAnswerSurfaces();
      }

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
