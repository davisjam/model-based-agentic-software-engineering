/**
 * What the operational panes used to explain, now explained once, here.
 *
 * The ruling this module answers: "much of that explanatory prose can probably move into Learn,
 * making the operational panes considerably quieter." Four surfaces carried it — Navigate,
 * Workspace, Inspector and the ask bar — and each carried a different fragment of the same
 * explanation, in a pane whose job is to say what to do at that spot.
 *
 * **The division this module holds to.** A pane's empty state says what to do HERE: one short,
 * concrete sentence with the control beside it. Learn says what any of it MEANS. So "No purposeful
 * model yet. Add one, and state the engineering question it answers" stays in the models rail, next
 * to the `+ Model` row that acts on it, and "the Inspector shows what a selected object carries,
 * which models it appears in, and what its absence would mean" lives here, because that is a fact
 * about the application rather than an instruction for a reader standing in front of an empty pane.
 *
 * **Why it is a typed table and not prose in `learn.html`.** The Learn shell is deliberately
 * content-free: `test/learn-content.test.ts` asserts that no entry anchor appears in it, so a
 * hand-edit cannot turn the page into a brochure that drifts from the registry. This is not
 * registry-derived content and cannot be — nothing in the kernel knows how a pane reads — so it
 * takes the other discipline available: one declaration, with the surface each section VACATED
 * recorded beside it. A node-tier check reads `movedFrom` and fails if the vacated phrase is still
 * in the file it came from, which makes this a MOVE the compiler and the suite can see rather than a
 * copy that leaves both surfaces verbose.
 */

/** One block of a section. Prose, or a labelled list; a section is a short sequence of these. */
export type GuideBlock =
  | { readonly kind: "prose"; readonly text: string }
  | { readonly kind: "bullets"; readonly label: string; readonly items: readonly string[] };

/**
 * A surface this section took prose off, and a phrase that must no longer be in it.
 *
 * The phrase is the teeth. Recording "this came from the ask bar" is a comment; recording a
 * sentence fragment that has to be ABSENT from `index.html` is a cross-file assertion, and it holds
 * in both directions — it fails if the move was really a copy, and it fails again if a later wave
 * puts the verbose sentence back while this page goes on claiming to own it.
 */
export interface VacatedProse {
  /** Package-relative path, as the node tier's cwd sees it. */
  readonly from: string;
  /** What that file no longer says. Long enough to be the sentence and not a common word. */
  readonly vacated: string;
}

export interface GuideSection {
  /** The in-page anchor. Distinct from every registry anchor; the smoke tier checks both sets. */
  readonly anchor: string;
  readonly heading: string;
  /** One sentence under the heading, the shape every gallery section already uses. */
  readonly intro: string;
  readonly blocks: readonly GuideBlock[];
  readonly movedFrom: readonly VacatedProse[];
}

const prose = (text: string): GuideBlock => ({ kind: "prose", text });
const bullets = (label: string, items: readonly string[]): GuideBlock =>
  ({ kind: "bullets", label, items });

/**
 * The guide, in reading order: the panes, then what a property is, then how asking works.
 *
 * That order is the order a reader meets them. The panes are what is on screen; a property is the
 * object the application is for; asking is the act that produces one.
 */
export const WORKBENCH_GUIDE: readonly GuideSection[] = [
  {
    anchor: "guide-the-panes",
    heading: "How the workbench is laid out",
    intro: "Four panes, and each one answers a different question about the same model system.",
    blocks: [
      bullets("What each pane is for", [
        "Navigate lists the models the system declares and the properties it asserts. Both are "
          + "navigation: choosing a model puts it in the Workspace, and choosing a property shows "
          + "the claim, its verdict and the models that established it.",
        "The Workspace holds one model at a time. It states the engineering question that model "
          + "answers, reads the model's contents in words, and draws it.",
        "The Inspector holds one selected object. It shows what the object is, what it carries, the "
          + "models it appears in, and what its absence would mean.",
        "Ask about the model system takes a question and answers it against the current revision.",
      ]),
      prose("Operations live where their object is. The additive ones — an entity, a state, a "
        + "relation, a model, a note — are under + Add in the Workspace, because none of them needs "
        + "anything selected. Renaming, setting a property, connecting and deleting are actions on "
        + "the thing they concern, so they are in the Inspector, on the object itself."),
      prose("A pane with nothing in it says so and says what to do there. It does not explain the "
        + "application; that is this page's job."),
    ],
    movedFrom: [
      // The Inspector's empty sentence ran on into an account of what the pane does. The
      // instruction stayed; the account is the first bullet above.
      {
        from: "src/ui/shell/inspector.ts",
        vacated: "this pane shows what it is, what it carries",
      },
      // The action bar's hint said the same thing a second time, from the other side of the pane.
      {
        from: "src/ui/shell/edit-dialogs.ts",
        vacated: "and the operations that apply to it appear",
      },
      // The `+ Add` menu's hint explained the whole division of operations from inside a menu of
      // five of them.
      {
        from: "index.html",
        vacated: "is an action on the thing it concerns, in the Inspector",
      },
    ],
  },
  {
    anchor: "guide-what-a-property-is",
    heading: "What a property is",
    intro: "A property is a saved claim. The Workbench retains the question that decides the claim "
      + "and recomputes its verdict on demand.",
    blocks: [
      prose("What the Workbench keeps is the question that decides the claim — never the verdict. "
        + "The verdict is recomputed on every later revision and stored nowhere, so a property "
        + "cannot go stale: it reports what the models say now."),
      prose("A verdict always names the models that established it. A bounded search reports itself "
        + "as inconclusive rather than as a no, because a search that stopped at its budget has not "
        + "shown that the thing it looked for is absent."),
      prose("Declaring an expectation makes a property a requirement. A differing outcome then "
        + "counts as a failure rather than as a finding."),
    ],
    movedFrom: [
      // The properties rail's empty sentence carried the lifecycle AND the semantics. The
      // lifecycle — ask, then track — is the instruction and stays there.
      {
        from: "src/ui/shell/nav.ts",
        vacated: "it becomes a property evaluated against every later revision",
      },
    ],
  },
  {
    anchor: "guide-how-asking-works",
    heading: "How asking works",
    intro: "The ask line filters a catalogue of askable questions. Free text is not interpreted "
      + "as English.",
    blocks: [
      prose("The catalogue offers only questions the loaded models license, so a question the "
        + "system cannot answer is one the list does not contain. Typing filters that list."),
      prose("What you type is not interpreted as English. Guessing which formal question an "
        + "English sentence meant would fabricate precision the engine never had, so unmatched text "
        + "is answered by pointing at a route that can take the question instead."),
      bullets("A question in your own words has two homes", [
        "Your coding agent, which drives this same workbench through window.mage.ask. There is one "
          + "workspace, so an agent's edit appears in the ordinary interface immediately.",
        "Advanced query, which states a question formally: a chosen hop limit, two named endpoints, "
          + "an explicit quantifier.",
      ]),
      prose("A question whose kind needs a model type the system does not declare is answered NOT "
        + "ANSWERABLE, with a route to the gallery entry for the missing type. The refusal and this "
        + "page read one registry, so the route cannot offer an entry the kernel would not refuse "
        + "for."),
    ],
    movedFrom: [
      // The ask bar's help paragraph was five sentences of semantics above a one-line text field.
      // The filter claim and the two routes stay, in one sentence each; the rest is above.
      {
        from: "index.html",
        vacated: "A verdict is recomputed on every revision and stored nowhere",
      },
    ],
  },
];

/** Every guide anchor. The smoke tier adds these to the registry's when it checks the section set. */
export const GUIDE_ANCHORS: readonly string[] = WORKBENCH_GUIDE.map((s) => s.anchor);
