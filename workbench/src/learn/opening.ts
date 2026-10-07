/**
 * The page's conceptual contract — what the Workbench is for, what it can model, and what a model
 * licenses you to ask — stated before the lesson so a student has the rules before the tool.
 *
 * DECLARED prose, like `LESSON` and `WORKBENCH_GUIDE`, not derived: nothing in the kernel states
 * the Workbench's pedagogical purpose, so this is the author's contract, held by the suite rather
 * than a registry. `test/learn-opening.test.ts` pins the author's constraints: the whole opening
 * stays inside its 500–700-word budget, "licensed" is the word for what a model permits (the same
 * word the ask bar and the review surface use), and the established modeling languages are named
 * exactly once — in the graduate-to paragraph, never as a construct-by-construct comparison.
 *
 * Two boundaries this prose is written to hold, and an edit must not blur:
 *
 *   - **Natural language is the interface; the model is the semantics.** The talk-about-the-model
 *     callout must never read as "the agent understanding your prose is what makes it a model".
 *     The agent operates on the same structured model a student edits by hand.
 *   - **Writing something down is not the same as modeling it.** A note is context, not a
 *     constraint; only a modeling construct — a property, a relation, a state, a guard — reaches
 *     an analysis. The second callout states this from the authoring side.
 */
import { el } from "./dom.ts";

export const OPENING_ANCHORS = {
  what: "opening-what",
  canModel: "opening-can-model",
  canAsk: "opening-can-ask",
  talk: "opening-talk",
  modelIt: "opening-model-it",
  begin: "opening-begin",
} as const;

/** One construct or question family: the term, and the one or two sentences that fix its meaning. */
export interface ConceptCard {
  readonly term: string;
  readonly text: string;
}

export const OPENING = {
  what: {
    anchor: OPENING_ANCHORS.what,
    heading: "What is the MAGE Workbench?",
    paragraphs: [
      "The MAGE Workbench is a teaching tool, not a new general-purpose modeling language. Its "
        + "purpose is to make the ideas in this unit concrete: representing engineering knowledge "
        + "explicitly, asking questions of that representation, and seeing how modeling choices "
        + "determine which questions can be answered.",
      "The Workbench therefore supports a deliberately small set of modeling constructs: entities, "
        + "typed properties and relationships, behavioral state, and executable questions over "
        + "those structures. These are enough to experiment with structural, quantitative, and "
        + "behavioral models without first learning a full modeling language.",
      "The Workbench's agentic interface also means that you need to learn very little of its "
        + "explicit language, so long as you understand the modeling constructs and can discuss "
        + "them in natural language with an agent of your choice.",
      "For real engineering work that requires a richer modeling language and ecosystem, graduate "
        + "to an established language such as SysML/KerML or Clafer. The concepts practiced here "
        + "transfer; the Workbench is intended to expose them, not replace those languages.",
    ],
  },
  canModel: {
    anchor: OPENING_ANCHORS.canModel,
    heading: "What can the Workbench model?",
    cards: [
      {
        term: "Entities",
        text: "Things in the system have stable identities. Different models can refer to the "
          + "same entity rather than creating separate copies of it.",
      },
      {
        term: "Properties",
        text: "Entities can carry typed facts such as quantities, categories, or other values. "
          + "Types matter: the Workbench does not guess what a value means.",
      },
      {
        term: "Relationships",
        text: "Models can assert typed relationships among entities. A relationship has declared "
          + "meaning; its visual appearance alone does not determine its semantics.",
      },
      {
        term: "Behavior",
        text: "Machines, states, and transitions represent behavior. The Workbench can explore "
          + "reachable configurations and evaluate questions about them.",
      },
    ] as readonly ConceptCard[],
    closing: "A model is a purposeful reduction: it represents the engineering knowledge needed "
      + "to answer some question while leaving other details out.",
  },
  canAsk: {
    anchor: OPENING_ANCHORS.canAsk,
    heading: "What can you ask?",
    lead: "The structure you model determines the questions you can answer.",
    cards: [
      {
        term: "Structural questions",
        text: "Ask about relationships among entities: whether a relationship exists, whether one "
          + "entity can reach another through a relationship, or whether a path satisfying "
          + "particular conditions exists.",
      },
      {
        term: "Quantitative questions",
        text: "Ask about modeled values and bounds when the model contains the quantities and "
          + "domains needed to make the comparison meaningful.",
      },
      {
        term: "Behavioral questions",
        text: "Ask about reachable states and configurations: whether a state can occur, whether "
          + "a condition can hold, or whether some behavior is possible or unavoidable.",
      },
    ] as readonly ConceptCard[],
    closing: "The Workbench can answer only questions licensed by the structure and semantics "
      + "you modeled.",
  },
  talk: {
    anchor: OPENING_ANCHORS.talk,
    heading: "You can talk about the model",
    before: "You do not need to translate every modeling operation into Workbench syntax "
      + "yourself. If you understand what you want to represent or ask, you can discuss it with "
      + "your coding agent:",
    sayings: [
      "Add the sensor as a component and record that it depends on the telemetry service.",
      "Can restricted data reach Analytics?",
      "Model the controller's operating states and determine whether Error is reachable from "
        + "Startup.",
    ],
    after: "The agent operates on the same structured model. Natural language is the interface; "
      + "the model remains the source of semantics.",
  },
  modelIt: {
    anchor: OPENING_ANCHORS.modelIt,
    heading: "If it matters to analysis, model it",
    text: "Labels and notes help humans understand a model, but they do not by themselves "
      + "constrain or change what the Workbench can establish. If a fact should affect an "
      + "analysis, represent it using an appropriate modeling construct: for example, a property, "
      + "relationship, variable, state, or guard.",
    maxim: "Writing something down is not the same as modeling it.",
  },
  begin: {
    anchor: OPENING_ANCHORS.begin,
    heading: "Learn by modeling",
    text: "Now use these ideas. The walkthrough starts with a small model and introduces the "
      + "Workbench's constructs as they become useful.",
  },
} as const;

/**
 * Every prose string the opening puts on the page, flattened for the word-budget check. Headings
 * included: the budget governs what a student reads before the walkthrough, and the headings are
 * read too. The test counts THIS, so a sentence added to the render but not to `OPENING` is
 * structurally impossible — the renderer below has no words of its own.
 */
export const openingProse = (): readonly string[] => [
  OPENING.what.heading, ...OPENING.what.paragraphs,
  OPENING.canModel.heading,
  ...OPENING.canModel.cards.flatMap((c) => [c.term, c.text]), OPENING.canModel.closing,
  OPENING.canAsk.heading, OPENING.canAsk.lead,
  ...OPENING.canAsk.cards.flatMap((c) => [c.term, c.text]), OPENING.canAsk.closing,
  OPENING.talk.heading, OPENING.talk.before, ...OPENING.talk.sayings, OPENING.talk.after,
  OPENING.modelIt.heading, OPENING.modelIt.text, OPENING.modelIt.maxim,
  OPENING.begin.heading, OPENING.begin.text,
];

// --------------------------------------------------------------------------------------------
// Rendering
// --------------------------------------------------------------------------------------------

function sectionShell(anchor: string, heading: string, className?: string): {
  readonly section: HTMLElement; readonly h: HTMLElement;
} {
  const section = el("section", undefined, className);
  section.id = anchor;
  const h = el("h2", heading);
  h.id = `${anchor}-h`;
  section.setAttribute("aria-labelledby", h.id);
  section.append(h);
  return { section, h };
}

/**
 * The constructs and the question families as CARDS, not another bullet list — the same grid the
 * gallery uses, minus the link: these name concepts, they do not navigate.
 */
function conceptCards(cards: readonly ConceptCard[]): HTMLElement {
  const ul = el("ul", undefined, "concept-cards");
  for (const c of cards) {
    const li = el("li", undefined, "concept-card");
    li.append(el("span", c.term, "concept-card-term"), el("span", c.text, "concept-card-text"));
    ul.append(li);
  }
  return ul;
}

/** The orientation's sections, in the author's order, for the composition root to mount first. */
export function renderOpening(): readonly HTMLElement[] {
  const what = sectionShell(OPENING.what.anchor, OPENING.what.heading).section;
  for (const p of OPENING.what.paragraphs) what.append(el("p", p));

  const canModel = sectionShell(OPENING.canModel.anchor, OPENING.canModel.heading).section;
  canModel.append(conceptCards(OPENING.canModel.cards));
  canModel.append(el("p", OPENING.canModel.closing, "opening-closing"));

  const canAsk = sectionShell(OPENING.canAsk.anchor, OPENING.canAsk.heading).section;
  canAsk.append(el("p", OPENING.canAsk.lead, "opening-lead"));
  canAsk.append(conceptCards(OPENING.canAsk.cards));
  canAsk.append(el("p", OPENING.canAsk.closing, "opening-closing"));

  const talk = sectionShell(OPENING.talk.anchor, OPENING.talk.heading, "callout").section;
  talk.append(el("p", OPENING.talk.before));
  const sayings = el("ul", undefined, "opening-sayings");
  for (const s of OPENING.talk.sayings) sayings.append(el("li", `“${s}”`));
  talk.append(sayings);
  talk.append(el("p", OPENING.talk.after));

  const modelIt = sectionShell(OPENING.modelIt.anchor, OPENING.modelIt.heading, "callout").section;
  modelIt.append(el("p", OPENING.modelIt.text));
  const maxim = el("p", undefined, "opening-maxim");
  maxim.append(el("strong", OPENING.modelIt.maxim));
  modelIt.append(maxim);

  const begin = sectionShell(OPENING.begin.anchor, OPENING.begin.heading).section;
  begin.append(el("p", OPENING.begin.text));

  return [what, canModel, canAsk, talk, modelIt, begin];
}
