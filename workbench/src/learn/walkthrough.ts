/**
 * The Learn page's lesson and walkthrough — the DECLARED half.
 *
 * ## What this module is, and what it is not
 *
 * Learn opens with a short lesson about modeling and then walks a student through the modeling
 * constructs one at a time, each step over a real shipped example. This module declares that
 * sequence: the lesson's prose, and one declaration per step — its anchor, its title, the sentence
 * that defines the construct, the thing to do, and the GROUNDING that names which shipped artifact
 * the step runs on. The interactive rendering lives in `walkthrough-view.ts`; the composition root
 * mounts it.
 *
 * ## What is derived and what is declared
 *
 * The lesson paragraphs, the step titles and the defining sentences are page furniture, declared
 * the way `workbench-guide.ts` declares its sections: nothing in a model kernel knows how a lesson
 * reads. Every FACT a step shows — a diagram, an outcome, a magnitude, a refusal, a before/after
 * flip — is computed by the view layer at build time through the same seams the workbench binds:
 * `renderView`, `runQuery`, `Workspace.openHypothesis`. A step declaration cannot carry an outcome,
 * because the shape has no field for one.
 *
 * ## The grounding is a checkable join
 *
 * Each step's `grounding` names the example, model, machine, saved query, declared modification or
 * capability service it uses, in the corpus's own spellings. `test/learn-walkthrough.test.ts`
 * resolves every grounding against the shipped corpus, so a renamed query or a dropped
 * modification turns the suite red instead of leaving a step that quietly renders nothing.
 */
import type { Dimension } from "../ir/types.ts";
import type { ShippedExampleId } from "../app/examples.ts";

// --------------------------------------------------------------------------------------------
// The lesson
// --------------------------------------------------------------------------------------------

export const LESSON_ANCHOR = "lesson";

/**
 * The opening lesson. Short on purpose: the walkthrough below carries the teaching, so the lesson
 * states only what a model is and how the Workbench treats one.
 */
export const LESSON = {
  anchor: LESSON_ANCHOR,
  heading: "What a model is",
  paragraphs: [
    "Engineers build models to answer questions about systems. A model preserves the information "
      + "needed for its question and leaves other information out. What a model omits is as much a "
      + "part of it as what it keeps.",
    "The Workbench supports several kinds of purposeful model. A structural model represents "
      + "relationships among parts of a system. A state machine represents behavior over time. A "
      + "quantitative model represents quantities such as latency or memory consumption.",
    "Models become useful when you ask questions of them. The Workbench evaluates each question "
      + "from the information the models actually contain, returns evidence with its answers, and "
      + "re-evaluates saved questions whenever a model changes. If the required information is "
      + "absent, it does not invent an answer.",
    "The walkthrough below uses the shipped examples to introduce the modeling constructs one at a "
      + "time. The reference material after it covers each construct in depth.",
  ],
  /** The one compact graphic: how a question becomes a checked answer. */
  flow: ["engineering question", "model", "property", "evidence / result"],
} as const;

// --------------------------------------------------------------------------------------------
// The steps
// --------------------------------------------------------------------------------------------

/** The examples the walkthrough runs on, named once and type-checked against the shipped set. */
export const WALK_TW: ShippedExampleId = "transaction-workspace";
export const WALK_ESN: ShippedExampleId = "embedded-sensor-node";
export const WALK_DP: ShippedExampleId = "document-processing";
export const WALK_MB: ShippedExampleId = "message-bus";
export const WALK_CL: ShippedExampleId = "calibration-loop";

/**
 * What a step runs on, in the corpus's own spellings. One shape per kind of artifact, so the
 * conformance test can resolve each against the shipped corpus without knowing the step's DOM.
 */
export type StepGrounding =
  | { readonly kind: "model"; readonly example: ShippedExampleId; readonly model: string }
  | { readonly kind: "machine"; readonly example: ShippedExampleId; readonly machine: string }
  | { readonly kind: "query"; readonly example: ShippedExampleId; readonly query: string }
  | {
    readonly kind: "modification"; readonly example: ShippedExampleId;
    readonly modification: string;
  }
  | { readonly kind: "budget"; readonly example: ShippedExampleId; readonly dimension: Dimension }
  | { readonly kind: "system"; readonly example: ShippedExampleId }
  | { readonly kind: "capability"; readonly service: string };

/**
 * The shared card the four model-form steps carry, in one shape so a student meets each form the
 * same way: what it represents, and the characteristic question it answers.
 *
 * `ask` is a REFERENCE, never a sentence. The view resolves it against the shipped corpus and
 * renders that question's own label, so the card cannot drift from the question it names — the same
 * reason a step declaration has no field for an outcome.
 */
export interface ModelCard {
  /** What this model form represents. One line, declared furniture. */
  readonly represents: string;
  /** The characteristic question, named in the corpus's spelling. */
  readonly ask: { readonly example: ShippedExampleId; readonly query: string };
}

export interface WalkStep {
  /** The in-page anchor. Distinct from every other anchor family; the smoke tier checks the set. */
  readonly anchor: string;
  /** The construct's name — the literal heading. */
  readonly title: string;
  /** One or two sentences defining the construct. Declared furniture; the facts below it are built. */
  readonly definition: string;
  /** The one thing to do, or null for a step that is read rather than operated. */
  readonly instruction: string | null;
  readonly grounding: readonly StepGrounding[];
  /** Present on the four model-form steps; absent elsewhere. */
  readonly card?: ModelCard;
  /** Depth links into the reference sections, each an anchor on this page. */
  readonly more: readonly { readonly label: string; readonly anchor: string }[];
}

/**
 * The four groups the walkthrough is read in. The navigation renders these titles, so the page's
 * structure teaches the ontology rather than leaving a student to infer it from sixteen flat tiles.
 *
 * `test/learn-walkthrough.test.ts` asserts the partition is TOTAL and DISJOINT — every step in
 * exactly one group, no group empty — which is what catches a step added later with no group.
 */
export interface WalkGroup {
  readonly title: string;
  /** The ordered step anchors in this group. */
  readonly anchors: readonly string[];
}

export const WALKTHROUGH_STEPS: readonly WalkStep[] = [
  // ---- Models -------------------------------------------------------------------------------
  {
    anchor: "walk-purpose",
    title: "Purpose and omissions",
    definition: "A model exists to answer a stated engineering question. It preserves the "
      + "information that question needs and deliberately omits the rest. Both lists are part of "
      + "the model.",
    instruction: "Open both disclosures.",
    grounding: [{ kind: "model", example: WALK_TW, model: "change-pipeline" }],
    more: [{ label: "More about model boundaries", anchor: "question-omissions" }],
  },
  {
    anchor: "walk-structural",
    title: "Structural models",
    definition: "A structural model says what is connected to what. It contains entities — the "
      + "things it must distinguish to answer its question — and relationships between them. Every "
      + "relationship has a declared type, and the type carries the meaning: what an edge asserts, "
      + "and what its absence does and does not imply.",
    instruction: "Click Transaction Engine in the diagram, then choose a relationship to read its "
      + "declared meaning.",
    grounding: [
      { kind: "model", example: WALK_TW, model: "change-pipeline" },
      { kind: "query", example: WALK_MB, query: "checkout-event-reaches-fulfillment" },
    ],
    card: {
      represents: "entities and relationships",
      ask: { example: WALK_MB, query: "checkout-event-reaches-fulfillment" },
    },
    more: [{ label: "More about structural models", anchor: "type-structural-graph" }],
  },
  {
    anchor: "walk-behavioral",
    title: "Behavioral models",
    definition: "A behavioral model says what can happen over time: the states one subject can "
      + "occupy and the transitions between them. A structural model cannot say any of this, which "
      + "is why the same system carries a second model.",
    instruction: "Select the state “valid” to see its incoming and outgoing transitions.",
    grounding: [
      { kind: "machine", example: WALK_TW, machine: "transaction-lifecycle" },
      { kind: "query", example: WALK_TW, query: "transaction-can-be-refused" },
    ],
    card: {
      represents: "states and transitions over time",
      ask: { example: WALK_TW, query: "transaction-can-be-refused" },
    },
    more: [{ label: "More about state machines", anchor: "type-state-machine" }],
  },
  {
    anchor: "walk-quantitative",
    title: "Quantitative models",
    definition: "A quantitative model says what an execution costs. A quantity associates a "
      + "magnitude, dimension and unit with an element of a model, and a declared ceiling is itself "
      + "a quantity, so the budget and the allocations share one vocabulary. A quantitative "
      + "question compares a computed figure against that ceiling.",
    instruction: "Read the allocations against the declared ceiling, then double the telemetry "
      + "queue and run the question again.",
    grounding: [
      { kind: "budget", example: WALK_ESN, dimension: "memory" },
      { kind: "query", example: WALK_ESN, query: "sram-fits-budget" },
      { kind: "modification", example: WALK_ESN, modification: "double-the-telemetry-queue" },
    ],
    card: {
      represents: "quantities associated with an execution",
      ask: { example: WALK_ESN, query: "sram-fits-budget" },
    },
    more: [
      { label: "More about quantitative models", anchor: "type-quantitative-model" },
      { label: "More about quantitative requirements", anchor: "question-ceilings" },
    ],
  },
  {
    anchor: "walk-combining",
    title: "Combining models",
    definition: "One system can carry several purposeful models, and some questions need more than "
      + "one of them. Ask the same question of two models and the answers differ in kind: a model "
      + "that does not license the question reports that it does not, which is a successful answer "
      + "and not a denial. It is not “refuted” — that would assert no such chain exists, a claim "
      + "the model never made.",
    instruction: "Ask the chain question of each model in turn, then run the latency question that "
      + "needs both.",
    grounding: [
      { kind: "query", example: WALK_MB, query: "subscribes-chain-checkout-to-fulfillment" },
      { kind: "query", example: WALK_MB, query: "checkout-event-reaches-fulfillment" },
      { kind: "query", example: WALK_DP, query: "max-latency-among-successful-executions" },
    ],
    card: {
      represents: "separate purposes preserved, while supporting questions that need more than one "
        + "model",
      ask: { example: WALK_DP, query: "max-latency-among-successful-executions" },
    },
    more: [
      { label: "The model gallery", anchor: "reference" },
      { label: "More about composition", anchor: "question-compositions" },
    ],
  },
  {
    // Last in the Models group, after purposeful reduction (walk-purpose), semantic commitment
    // (the declared-meaning beat of walk-structural) and combining — the group's story becomes:
    // what a model is for → the three forms → combining → what omitting a distinction does and
    // does not mean. The five content beats, in the ruling's order: (1) every entity has a type
    // even if unnamed; (2) unnamed entities get distinct shadow types; (3) relations constrain
    // endpoint kinds — WHEN their type declares them (the constraint arrives with the
    // declaration; the walkthrough must not over-claim what the corpus's own gates spent 261005
    // un-claiming); (4) explicit declarations name and unify; (5) omission means "not
    // specified", never "anything goes".
    anchor: "walk-typing",
    title: "Unknown does not mean compatible",
    definition: "Every entity has a kind, even when the author has not named it. An unnamed kind "
      + "is its own kind — distinct from every other — until a name or a declaration earns "
      + "otherwise. Omitting a distinction a model does not need is purposeful reduction; it "
      + "never makes the omitted distinctions interchangeable. A relation type may declare what "
      + "kinds sit at its ends, and the constraint arrives with that declaration: an edge of a "
      + "declared type is checked against it, and an unnamed endpoint is refused until named — "
      + "the edge itself can never establish what its endpoints are.",
    instruction: "Load the Calibration Loop and try to connect the teams: add the conveys edge "
      + "between reading and sample in a what-if change, read the two findings that refuse it, "
      + "then name both kinds (type: measurement) and run the delivery question again.",
    grounding: [
      { kind: "model", example: WALK_CL, model: "signal-path" },
      { kind: "query", example: WALK_CL, query: "reading-is-delivered-as-sample" },
      { kind: "modification", example: WALK_CL, modification: "name-the-kinds-and-connect" },
    ],
    more: [{ label: "More about model boundaries", anchor: "question-omissions" }],
  },
  // ---- Asking models ------------------------------------------------------------------------
  {
    anchor: "walk-questions",
    title: "Questions",
    definition: "A question asks what follows from a model. The Workbench evaluates it against the "
      + "model's actual content and answers with an outcome.",
    instruction: "Run the question.",
    grounding: [{ kind: "query", example: WALK_TW, query: "transaction-can-be-refused" }],
    more: [{ label: "More about state machines", anchor: "type-state-machine" }],
  },
  {
    anchor: "walk-evidence",
    title: "Evidence",
    definition: "The Workbench returns evidence with an answer. For a reachability question, the "
      + "witness is an execution that reaches the requested state.",
    instruction: "Show the witness. Its steps are numbered on the diagram and listed in the text "
      + "view.",
    grounding: [
      { kind: "query", example: WALK_TW, query: "transaction-can-be-refused" },
      { kind: "machine", example: WALK_TW, machine: "transaction-lifecycle" },
    ],
    more: [{ label: "More about evidence", anchor: "question-evidence" }],
  },
  {
    anchor: "walk-properties",
    title: "Properties",
    definition: "A property is a saved CLAIM — a statement the models must keep true. The "
      + "Workbench asks the question that decides it against the current "
      + "model whenever the model changes. It does not store the previous verdict.",
    instruction: "Choose a property to see its current result.",
    grounding: [{ kind: "system", example: WALK_TW }],
    more: [{ label: "More about properties", anchor: "question-properties" }],
  },
  {
    anchor: "walk-requirements",
    title: "Requirements",
    definition: "A requirement adds an expected outcome to a property. A requirement stated as a "
      + "prohibition names a breach question and is satisfied when that question is refuted; one "
      + "stated directly is satisfied when its question holds.",
    instruction: "Compare the two Satisfied-when entries below.",
    grounding: [{ kind: "system", example: WALK_TW }],
    more: [{ label: "More about requirements", anchor: "question-requirements" }],
  },
  {
    anchor: "walk-boundaries",
    title: "Model boundaries",
    definition: "A model answers only the questions its content supports. Past that boundary the "
      + "Workbench answers NOT ANSWERABLE and names what is missing. That is a different thing "
      + "from a question answered “refuted”, which is a decided answer. A third case is neither: a "
      + "search that stopped at its budget reports INCONCLUSIVE, not “no” — it has not shown the "
      + "thing it looked for is absent.",
    instruction: "Ask it.",
    grounding: [
      { kind: "query", example: WALK_TW, query: "verdict-is-eventually-forced" },
      { kind: "query", example: WALK_TW, query: "commit-without-validating" },
    ],
    more: [{ label: "More about model boundaries", anchor: "question-omissions" }],
  },
  // ---- Working with models ------------------------------------------------------------------
  {
    anchor: "walk-changes",
    title: "What-if changes",
    definition: "Changing the model changes the answers. A what-if branch applies a change without "
      + "committing it, and every saved question is then evaluated against the changed model.",
    instruction: "Add the shortcut, watch both verdicts move, then discard it.",
    grounding: [
      { kind: "machine", example: WALK_TW, machine: "transaction-lifecycle" },
      { kind: "modification", example: WALK_TW, modification: "commit-without-validating-shortcut" },
    ],
    more: [{ label: "More about properties and changes", anchor: "question-properties" }],
  },
  {
    anchor: "walk-bindings",
    title: "Bindings",
    definition: "A binding identifies corresponding elements in different models. The models "
      + "remain separate and retain their own purposes and omissions.",
    instruction: null,
    grounding: [{ kind: "machine", example: WALK_TW, machine: "transaction-lifecycle" }],
    more: [{ label: "More about bindings", anchor: "question-bindings" }],
  },
  {
    anchor: "walk-composition",
    title: "Composition",
    definition: "Composition uses one model to restrict an analysis over another. The Workbench "
      + "supports one composition: a behavioral predicate can select the executions a quantitative "
      + "query measures.",
    instruction: "Run both questions and compare what each one measured.",
    grounding: [
      { kind: "query", example: WALK_DP, query: "max-latency-of-any-execution" },
      { kind: "query", example: WALK_DP, query: "max-latency-among-successful-executions" },
    ],
    more: [{ label: "More about composition", anchor: "question-compositions" }],
  },
  // ---- Agents -------------------------------------------------------------------------------
  {
    anchor: "walk-agents",
    title: "Agents",
    definition: "An agent operates on the same models through the same semantic operations as the "
      + "controls you have been using. There is one workspace, so an agent's change appears in the "
      + "interface immediately.",
    instruction: null,
    grounding: [
      { kind: "capability", service: "workspace.query" },
      { kind: "capability", service: "workspace.openHypothesis" },
    ],
    more: [{ label: "More about agent access", anchor: "question-agents" }],
  },
];

/**
 * The four groups, in reading order. Each names the steps it contains, so the navigation can render
 * the ontology instead of a flat tile grid.
 *
 * The anchors are listed literally rather than sliced out of `WALKTHROUGH_STEPS` by index: an index
 * range would silently re-partition when a step moves, which is the drift the group partition
 * exists to catch.
 */
export const WALKTHROUGH_GROUPS: readonly WalkGroup[] = [
  {
    title: "Models",
    anchors: [
      "walk-purpose", "walk-structural", "walk-behavioral", "walk-quantitative", "walk-combining",
      "walk-typing",
    ],
  },
  {
    title: "Asking models",
    anchors: [
      "walk-questions", "walk-evidence", "walk-properties", "walk-requirements", "walk-boundaries",
    ],
  },
  {
    title: "Working with models",
    anchors: ["walk-changes", "walk-bindings", "walk-composition"],
  },
  {
    title: "Agents",
    anchors: ["walk-agents"],
  },
];

/** Every walkthrough anchor. The smoke tier adds these to the other declared families. */
export const WALKTHROUGH_ANCHORS: readonly string[] = WALKTHROUGH_STEPS.map((s) => s.anchor);

/** The anchor of the reference portion of the page — the model gallery the steps link back into. */
export const REFERENCE_ANCHOR = "reference";
