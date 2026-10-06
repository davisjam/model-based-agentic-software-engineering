/**
 * The shipped examples, and the one way to load one.
 *
 * ## EX-I1 is a constraint on this file
 *
 * "Loading creates an ordinary editable workspace. There is no special example execution mode."
 * `load()` therefore fetches bytes and hands them to `Workspace.load` — the same call the file
 * picker and `window.mage.load` make. Nothing here preprocesses, patches or marks a system, and the
 * workspace cannot tell an example from a file a user wrote. A code path only examples travel would
 * break the invariant, so there is not one.
 *
 * ## Why a description is read rather than written
 *
 * Section 3 wants a short description of an example before or as it loads: its name, its models with
 * their engineering questions, and a few questions to try. Every one of those facts already exists in
 * the shipped example. Writing them again here would create a blurb free to drift from the thing it
 * describes — the duplication this project removes on sight, and the reason the coverage model is
 * regenerated from example metadata instead of maintained by hand.
 *
 * So the description is DERIVED wherever the fact already exists:
 *
 *   title, summary, the suggested set  <- `examples/<id>/expected-results.yaml`
 *   models and their questions         <- `examples/<id>/system.mage.yaml`, through `canonicalize`
 *   scenario, investigation, the ASK   <- the case envelope on `SHIPPED_EXAMPLES` below — authored
 *                                         here because it exists nowhere else, and JOINED by query
 *                                         id to the suggested set so an ask cannot outlive the
 *                                         query that answers it (`joinCaseQuestions`)
 *
 * Reading the fixture for presentation metadata deserves a note. `expected-results.yaml` is the
 * example's own metadata file: it already carries `title`, `summary` and the `suggested` flag that
 * picks the three-to-five presented questions out of the larger supplied set, and the coverage
 * generator reads the same file STRICTLY, so its shape is pinned in CI. The alternative is a second
 * copy in TypeScript, which is worse.
 *
 * ## Why these methods are async
 *
 * The description comes from the shipped bytes, so there is nothing to return synchronously without
 * keeping a copy in code. An agent awaits two promises; the copy would have drifted.
 */
import { parse } from "yaml";
import type { Finding } from "../ir/types.ts";
import { Workspace } from "./services.ts";

/**
 * The examples that ship, in the conceptual order section 18 gives them — and the SOLE declaration
 * of that set.
 *
 * `scripts/gen-example-coverage.ts` re-exports this rather than keeping its own list. It briefly did
 * keep one, and the two disagreed within the hour: Document Processing was authored and added there
 * while this file still omitted it, so the menu offered two examples while three shipped. Four tests
 * caught it, which is the system working — but the defect was a duplicated list, not a missing
 * string, and adding the string would have left the duplication to drift again.
 *
 * The direction matters. The app layer owns what ships, because the menu and the agent catalogue are
 * what "shipped" MEANS; a build script consumes that fact. The reverse would make the published set
 * a property of a generator.
 *
 * Document Processing's entry was withheld while its performance model had no evaluator, on the
 * reasoning that a menu item loading an empty system teaches a new reader the workbench is broken.
 * It now loads a complete model system whose quantitative REQUIREMENTS are declared and whose
 * verdicts are still hand-derived — so the example is honest about itself and the coverage model
 * states the remaining gap where it can be queried.
 *
 * Transaction Workspace sits SECOND, and the position is the decision rather than an accident. Two
 * documents order these, and they disagree about the membership:
 * `requirements-default-examples-261002.md` §18 gives a three-example progression (relations →
 * behavior-acquires-quantities → behavior itself), while `DESIGN-v02-semantics-261004.md` §31 names
 * its own three flagships — message bus, transaction/workspace, processing pipeline — and the v0.2
 * spec supersedes the v0.1 framing where the two conflict. Index 1 satisfies both: it is §31's B
 * slot, and §18's progression survives as a subsequence. The consequence a reader should know about
 * is that `src/learn/content.ts`'s `exemplarFor` takes the FIRST shipped example instantiating a
 * type, so this order is what makes the behavior card's exemplar the transaction lifecycle rather
 * than Document Processing's document lifecycle — which is what the Learn guidance asks for ("use
 * the transaction example, not a toy traffic light"). Appending instead would have shipped the
 * example and left the card unchanged.
 *
 * Worker Queue's membership was open when this list was first written and is now RULED: it ships as a
 * declared non-flagship, and the declaration lives in `SHIPPED_EXAMPLES` below rather than in this
 * comment. §31 drops it from its three while §18 keeps it; that disagreement is the membership
 * question the ruling records rather than resolves.
 *
 * Embedded Sensor Node sits FIFTH, and the position is a consequence rather than a preference.
 * `exemplarFor` takes the FIRST shipped example instantiating a type, and three examples ahead of
 * this one already declare quantities — so appending leaves every existing Learn card's exemplar
 * where it is. The quantitative card's exemplar is a separate question from the menu's order: it is
 * decided by which example has an addressable quantitative model to render, not by position.
 *
 * Autonomous Delivery sits LAST, and here the position IS the decision: §19 orders the five
 * flagships by the semantic surface each one needs, and this is the capstone — the only example that
 * composes structure, behavior and quantity into one verdict. Appending keeps every `exemplarFor`
 * exemplar where it is, which matters more here than anywhere else: this example declares five
 * purposeful models, two machines and two ceilings, so inserting it earlier would re-point the
 * behavior card, the quantitative card and the graph card all at once, at a system a first-time
 * reader should meet last rather than first.
 */
/**
 * The flagships §21 names, as a closed vocabulary.
 *
 * Spelled as §21 spells them, because the point of the list is to be the other end of a mapping: a
 * flagship row below names one of these, and a §21 slot renamed without this list moving fails to
 * resolve rather than silently pointing at nothing.
 */
export const SPEC_FLAGSHIPS = [
  "Secure Message Bus", "Transaction Protocol", "Embedded Sensor Node", "Processing Pipeline",
  "Autonomous Delivery System",
] as const;

export type SpecFlagship = (typeof SPEC_FLAGSHIPS)[number];

/**
 * Why a shipped example ships — a flagship realising a §21 slot, or a built-in that is not one.
 *
 * ## The shape, and what the compiler holds with it
 *
 * `RenderStrategy` on a model type is the landed precedent: a required discriminated field whose every
 * arm carries the obligation its own case creates, so a row cannot ship without answering the
 * question. The same arrangement here. `status` is required on every `SHIPPED_EXAMPLES` row, so a
 * seventh example cannot be appended without saying which kind it is — which is the gap the 261005
 * release-gate audit found: *"a seventh example added tomorrow is indistinguishable from a sixth
 * flagship."*
 *
 * ## Two axes, and the arms keep them apart
 *
 * The author's 261005 ruling separates two things this declaration must not re-fuse:
 *
 * > *"Retain it because it exercises otherwise-unrepresented synchronization semantics. Do not
 * > promote it merely because it happens to carry important coverage; test/semantic coverage and
 * > teaching prominence are different concepts."*
 *
 * So **semantic coverage** and **teaching prominence** are two facts, and the type keeps them in
 * separate fields on separate arms:
 *
 * - The `flagship` arm carries `realises` and NOTHING about coverage. A flagship is a flagship because
 *   §21's progression gives it a slot — never because of what it exercises. The arm has no field in
 *   which to write a coverage reason, so the conflation is not expressible.
 * - The `built-in` arm carries `covers` AND `membership`, both required. `covers` answers *why keep
 *   it* (coverage). `membership` answers *why it is not a flagship* (prominence). Dropping either is a
 *   compile error, so neither can stand in for the other.
 *
 * What the type cannot hold is the CONTENT of those two strings staying on their own axes. A row could
 * write the coverage sentence into `membership` and the compiler would accept it. The separation is
 * structural in shape and editorial in substance, and this comment is where the reader is told which.
 */
export type ExampleStatus =
  | {
    readonly kind: "flagship";
    /** Which §21 slot this example realises. One slot, one example; a test holds the bijection. */
    readonly realises: SpecFlagship;
  }
  | {
    readonly kind: "built-in";
    /**
     * The semantic coverage that would be lost by deleting it — the RETENTION reason, and nothing to
     * do with prominence.
     */
    readonly covers: string;
    /**
     * The recorded membership question: why the spec does not name it a flagship. The PROMINENCE
     * axis. A reason the spec's own documents disagree is still a recorded reason; an unrecorded one
     * is what criterion 14 forbids.
     */
    readonly membership: string;
  };

/**
 * One question a case invites the student to ask, joined by id to a saved query the example ships.
 *
 * Two spellings of one question, and the split is the property grammar's (`src/app/properties.ts`):
 * a PROPERTY states — the saved query's `name` is a declarative claim the rail shows beside a
 * verdict — while an INVITATION asks. `ask` is the interrogative a student types or reads on the
 * card; `query` names the suggested saved query whose fixture-pinned outcome answers it. The join
 * is enforced in `describe()`: an ask naming no suggested query, or a suggested query no case asks
 * about, is a loud `ExampleMetadataError` rather than a card that drifts from the corpus.
 */
export interface CaseQuestion {
  /** A saved-query id the example's fixture marks `suggested`. CI pins that query's outcome. */
  readonly query: string;
  /** The question as a student would ask it. Interrogative here; the saved `name` stays a claim. */
  readonly ask: string;
}

/**
 * The case envelope: why this system exists and what the student is meant to investigate.
 *
 * ## Boundary: CONTEXT, NOT A CONSTRAINT — the same line a note draws
 *
 * The case is contextual metadata, exactly as a note is "context, not a constraint" (A1): it says
 * why you might ask these questions; the MODEL determines which of them it can answer. So nothing
 * here may become engine input. The case is not part of the system's YAML, never reaches
 * `Workspace.load`, enters no hash, and moves no verdict — and a shipped example stays an ordinary
 * editable workspace after loading (EX-I1). If you are about to thread a case field into
 * `canonicalize`, a query, or a validator, you are blurring this boundary: stop, and put the fact
 * in the model instead, where it would be semantics.
 *
 * ## Why it lives HERE and not in the example's YAML
 *
 * `purpose` was the alternative home and it is engine-adjacent on purpose: a purpose's `omits` is
 * V24-checked vocabulary and its text rides in the source the hash covers, so case prose there
 * would make editing the STORY advance the model's revision. The app layer already owns what
 * "shipped" means (`SHIPPED_EXAMPLES` above); the story of why a shipped example exists is the
 * same kind of fact, so it sits on the same rows. The parts of a case that ARE the example's own —
 * title, summary, models, questions, outcomes — stay derived from the shipped files; only the
 * scenario, the investigation framing, and the interrogative phrasings live here.
 */
export interface ExampleCase {
  /** 2-4 sentences establishing the system and the situation. */
  readonly scenario: string;
  /** 1-2 sentences naming the engineering uncertainty, without giving away the answer. */
  readonly investigate: string;
  /**
   * 4-6 questions chosen so their outcomes SPAN established, refuted, and not answerable — every
   * example teaches the boundary of its models as well as their power. A test walks this against
   * each fixture's pinned outcomes, so the spread is held rather than hoped for.
   */
  readonly tryAsking: readonly CaseQuestion[];
}

export interface ShippedExample {
  readonly id: string;
  readonly status: ExampleStatus;
  readonly case: ExampleCase;
}

/**
 * What ships, in menu order, each row declaring why.
 *
 * `as const satisfies` rather than a plain annotation: `satisfies` runs the check that every row
 * declares a `status`, and `as const` keeps the ids literal so `ShippedExampleId` stays a union of
 * exactly these strings. An annotation alone would widen `id` to `string` and every keyed map in
 * `src/learn/` would lose its key type.
 */
export const SHIPPED_EXAMPLES = [
  {
    id: "message-bus",
    status: { kind: "flagship", realises: "Secure Message Bus" },
    case: {
      scenario: "An online order system runs on an event bus. Services do not call one another to "
        + "move an order along; they publish event types and subscribe to the ones they act on. "
        + "Each event type carries payload fields of a declared sensitivity — a shipping address "
        + "is restricted, a product id is public — and each service declares the highest "
        + "sensitivity it is permitted to process.",
      investigate: "Does decoupling the services keep sensitive data inside its permitted "
        + "boundary? And which questions about the bus can a model of permissions answer at all?",
      tryAsking: [
        { query: "who-subscribes-to-order-created", ask: "Which services subscribe to OrderCreated?" },
        {
          query: "checkout-event-reaches-fulfillment",
          ask: "Can an event originating at Checkout eventually reach Fulfillment?",
        },
        {
          query: "restricted-data-reaches-impermitted-subscriber",
          ask: "Can restricted data reach a service that is not permitted to process it?",
        },
        { query: "checkout-calls-fulfillment-directly", ask: "Can Checkout call Fulfillment directly?" },
        { query: "did-analytics-receive-it-at-2-04", ask: "Did Analytics receive OrderCreated at 2:04 PM?" },
      ],
    },
  },
  {
    id: "transaction-workspace",
    status: { kind: "flagship", realises: "Transaction Protocol" },
    // The author's own case, verbatim (261005): the worked example the other five match.
    case: {
      scenario: "Multiple producers propose changes to a shared workspace. A proposal is prepared "
        + "against one base, but that base may change before the proposal commits.",
      investigate: "What prevents an invalid or stale change from reaching the authoritative "
        + "workspace? What does the model guarantee after a change has been validated?",
      tryAsking: [
        { query: "transaction-can-commit", ask: "Can a proposed change reach Committed?" },
        { query: "transaction-can-be-refused", ask: "Can it reach Refused?" },
        { query: "commit-without-validating", ask: "Can a change commit without first becoming Valid?" },
        {
          query: "committed-base-is-current",
          ask: "Can a change commit against a base that is no longer current?",
        },
        {
          query: "verdict-is-eventually-forced",
          ask: "Must every validated change eventually be committed or refused?",
        },
      ],
    },
  },
  {
    id: "document-processing",
    // §21's gloss for this slot is "different purposeful models participate in one engineering
    // question through an explicitly defined semantic composition", and this example's own summary
    // describes a pipeline lifecycle plus a quantitative model over the same components. It is also
    // the example the one registered COMPOSITIONS row serves. Ruled by the 261005 audit from the
    // example's own fixture rather than assumed from the directory name.
    status: { kind: "flagship", realises: "Processing Pipeline" },
    case: {
      scenario: "A remediation pipeline carries a document from intake to publication: parse, "
        + "remediate, validate, publish, with a bounded number of retries when validation fails. "
        + "The service has promised a processing-latency target and runs in a fixed memory "
        + "envelope, so one model prices the pipeline's stages while a second tracks the "
        + "document's lifecycle through them.",
      investigate: "Can a document be published without passing validation, and does the modeled "
        + "pipeline keep its latency and memory promises? One promised figure is not derivable "
        + "from these models — find which, and why.",
      tryAsking: [
        {
          query: "publish-without-validating",
          ask: "Can a document be published without ever reaching validating?",
        },
        { query: "retry-forever", ask: "Can processing retry indefinitely?" },
        {
          query: "publishes-after-three-retries",
          ask: "Can a document publish after spending every permitted retry?",
        },
        {
          query: "max-latency-among-successful-executions",
          ask: "What is the maximum modeled latency among executions that publish?",
        },
        {
          query: "expected-latency-with-the-cache",
          ask: "Does the cache improve expected latency without violating the memory requirement?",
        },
      ],
    },
  },
  {
    id: "worker-queue",
    status: {
      kind: "built-in",
      covers: "the only shipped transition guard that reads ANOTHER machine's state "
        + "(`job-lifecycle` requires `job-lease.state`), which is the arm of V42 obligation 2 that "
        + "says a guard is not a step: the reading instance moves alone and leaves what it read "
        + "untouched. Measured across the corpus on 261005. The event arm of the same obligation is "
        + "covered elsewhere -- `autonomous-delivery` also declares two machines and synchronises "
        + "them on declared events -- so this row's coverage claim is the guard, not multi-machine "
        + "composition in general.",
      membership: "§31 of `DESIGN-v02-semantics-261004.md` drops Worker Queue from its three "
        + "flagships while §18 of `requirements-default-examples-261002.md` keeps it, and no ruling "
        + "has adjudicated that disagreement. §21's progression does not give it a slot, so it is "
        + "not a flagship. Nothing about the coverage above bears on this: the author's 261005 "
        + "ruling is explicit that coverage must not promote an example, and the converse holds "
        + "too -- prominence is decided by the progression, not by what the example exercises.",
    },
    case: {
      scenario: "A job queue feeds a pool of workers. A worker must take a lease on a job before "
        + "processing it, a failed run is retried a bounded number of times, and a job that "
        + "exhausts its retries is parked in a dead-letter state for a person to examine rather "
        + "than retried forever.",
      investigate: "Can custody blur — a job in processing while no worker holds its lease — and "
        + "can the retry policy deny a job a terminal outcome? Decide, too, whether \"who runs "
        + "next\" is a question these models can answer.",
      tryAsking: [
        { query: "completed-is-reachable", ask: "Can a job reach completed?" },
        { query: "dead-letter-is-reachable", ask: "Can a job end up in dead_letter?" },
        { query: "job-can-retry-forever", ask: "Can a job stay in the retry loop indefinitely?" },
        {
          query: "lease-held-while-processing",
          ask: "Is a job ever in processing while no worker holds its lease?",
        },
        { query: "is-the-scheduler-fair", ask: "Does the scheduler give both workers a turn?" },
      ],
    },
  },
  {
    id: "embedded-sensor-node",
    status: { kind: "flagship", realises: "Embedded Sensor Node" },
    case: {
      scenario: "A battery-powered sensor node samples, classifies on-device, and transmits its "
        + "readings. The part has 256 KiB of SRAM and nine allocations want some of it. One model "
        + "prices each allocation against that ceiling; a second traces a sample's path from the "
        + "sensor driver to the radio and carries no sizes at all.",
      investigate: "Does the modeled firmware fit the part, and with how much margin? Decide "
        + "which allocation you would attack first if it stopped fitting — and whether these "
        + "models can even say which allocations are live together.",
      tryAsking: [
        { query: "sram-fits-budget", ask: "Does the modeled firmware fit in the 256 KiB SRAM budget?" },
        { query: "sample-reaches-the-radio", ask: "Can a sample reach the radio from the sensor driver?" },
        {
          query: "driver-feeds-radio-directly",
          ask: "Does the sensor driver hand samples straight to the radio?",
        },
        {
          query: "optional-component-feeds-an-essential-one",
          ask: "Does any optional component feed an essential one?",
        },
        {
          query: "weights-live-with-workspace",
          ask: "Are the model weights and the inference workspace ever live at the same moment?",
        },
      ],
    },
  },
  {
    id: "autonomous-delivery",
    status: { kind: "flagship", realises: "Autonomous Delivery System" },
    case: {
      scenario: "A delivery rover drives public footpaths with no one aboard. A mission planner "
        + "chooses routes, a safety monitor sits between the planner and the drive system, and a "
        + "rover that loses localization is allowed a bounded number of recovery attempts. Five "
        + "purposeful models reduce the one vehicle: command authority, mission lifecycle, motion "
        + "interlock, onboard RAM, and battery endurance.",
      investigate: "Can anything command motion around the safety monitor, and must a mission "
        + "always end in a delivery or an abort? Then ask what each promise — memory, time, "
        + "charge — costs to establish, and which of them these models refuse to price.",
      tryAsking: [
        {
          query: "planner-commands-drive-directly",
          ask: "Can the mission planner command the drive system directly?",
        },
        {
          query: "motion-inhibited-whenever-faulted",
          ask: "Is motion ever enabled while the mission is in a fault state?",
        },
        {
          query: "mission-can-strand-without-an-outcome",
          ask: "Can a mission stop for good without delivering or aborting?",
        },
        {
          query: "compute-payload-fits-onboard-ram",
          ask: "Does the autonomy payload's peak RAM fit the compute module's carve-out?",
        },
        {
          query: "charge-remaining-at-delivery",
          ask: "Does the battery still have charge when the parcel is handed over?",
        },
      ],
    },
  },
  {
    id: "calibration-loop",
    status: {
      kind: "built-in",
      covers: "the only shipped exercise of SEMANTICS §3.3's refusal mechanics: the corpus's only "
        + "deliberately UNTYPED entities (`reading`, `sample`), the only relation type whose "
        + "declared domain/range resolve through the `entity-types:` vocabulary while no entity "
        + "yet carries the kind (V47's declared-vocabulary arm), and the only place a student "
        + "meets the V48 refusal-until-named beat -- an edge rejected because a shadow type is "
        + "established as nothing and the edge cannot establish it (T3). Deleting it would leave "
        + "the typing layer's teaching job (`walk-typing`) grounded on nothing.",
      membership: "§21's five-flagship progression predates the typing layer and gives it no "
        + "slot, so this is not a flagship. Nothing about the coverage above bears on that: the "
        + "author's 261005 ruling is explicit that coverage must not promote an example -- "
        + "prominence is decided by the progression, not by what the example exercises. The "
        + "shadow-types design (§12) names it the sixth lab in the flagship PROGRESSION sense "
        + "while leaving its shipped status `built-in`; if the progression ever gains a typing "
        + "slot, that is the author's edit, recorded there.",
    },
    case: {
      scenario: "Two teams modeled one calibration loop independently. The instrumentation team's "
        + "fragment says the sensor produces a reading; the control team's says a sample is "
        + "consumed by the controller. A prior integrator declared the boundary contract: "
        + "anything conveyed between the teams is established as a measurement. Nobody has "
        + "stated what a reading or a sample actually is.",
      investigate: "Connect the sensor's output to the controller's input — without weakening "
        + "the model. The connecting edge is refused until both kinds are named: ask "
        + "explainType('reading') and explainType('sample') to see why the two are still "
        + "distinct, and decide what the model is missing before you decide what to type.",
      tryAsking: [
        {
          query: "reading-is-delivered-as-sample",
          ask: "Is the instrumentation team's reading actually delivered as the control team's sample?",
        },
        { query: "sensor-produces-the-reading", ask: "Does the sensor emit the reading?" },
        { query: "sample-feeds-the-controller", ask: "Does the controller consume the sample?" },
        {
          query: "sensor-reaches-controller-through-produces",
          ask: "Can the controller be reached from the sensor through emissions alone?",
        },
      ],
    },
  },
] as const satisfies readonly ShippedExample[];

export type ShippedExampleId = (typeof SHIPPED_EXAMPLES)[number]["id"];

/**
 * The shipped ids, derived from the declaration above.
 *
 * Still the sole declaration of what ships — the rows moved, the ownership did not. Derived rather
 * than listed a second time for the reason the header gives about the coverage script: two lists of
 * the same set disagreed within the hour the last time one existed.
 */
export const SHIPPED_EXAMPLE_IDS: readonly ShippedExampleId[] =
  SHIPPED_EXAMPLES.map((e) => e.id);

/**
 * The example realising a §21 flagship, or `null` if none does.
 *
 * A function rather than a stored inverse map, per the derived-state discipline: a second table would
 * be the mapping copied into something an edit could leave behind. Callers that need the whole
 * mapping walk `SHIPPED_EXAMPLES`.
 */
export function flagshipRealisedBy(slot: SpecFlagship): ShippedExampleId | null {
  const row = SHIPPED_EXAMPLES.find(
    (e) => e.status.kind === "flagship" && e.status.realises === slot);
  return row?.id ?? null;
}

/**
 * The case envelope of a shipped example. Throws on an unknown id for `regionHost`'s reason: a
 * caller asking for a shipped example's case has no useful behaviour when the row is missing.
 */
export function caseOf(id: ShippedExampleId): ExampleCase {
  const row = SHIPPED_EXAMPLES.find((e) => e.id === id);
  if (row === undefined) throw new UnknownExampleError(`'${id}' is not a shipped example`);
  return row.case;
}

/** One of an example's purposeful models, with the question it answers. */
export interface ExampleModelBlurb {
  readonly id: string;
  readonly label: string;
  /** A graph model or a state machine. Both carry a purpose; both count. */
  readonly kind: "graph" | "machine";
  readonly question: string | null;
}

/**
 * One presented question: the case's interrogative, the suggested saved query it invites, and that
 * query's own declarative statement. Three fields, one join — `ask` is what the card prints,
 * `statement` is what the Properties rail will show for the same question after loading, and
 * `query` is the id that ties both to the fixture row whose outcome CI pins.
 */
export interface PresentedQuestion {
  readonly query: string;
  readonly ask: string;
  readonly statement: string;
}

export interface ExampleDescription {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly scenario: string;
  readonly investigate: string;
  readonly models: readonly ExampleModelBlurb[];
  /** The presented questions. Section 2 caps the set at 3-5. */
  readonly tryAsking: readonly PresentedQuestion[];
}

/**
 * Reads a shipped asset by its path relative to the served page.
 *
 * A port because the two callers disagree about how to read a file and neither should win: the page
 * has `fetch`, a test has the filesystem. It fails by rejecting — a reader that returned empty text
 * on a 404 would surface as "this example declares no models", which is a lie about the example.
 */
export type AssetReader = (path: string) => Promise<string>;

export class UnknownExampleError extends Error {}
export class ExampleMetadataError extends Error {}

const systemPath = (id: string): string => `examples/${id}/system.mage.yaml`;
const fixturePath = (id: string): string => `examples/${id}/expected-results.yaml`;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function text(v: unknown, where: string): string {
  if (typeof v !== "string" || v.trim() === "") {
    throw new ExampleMetadataError(`${where}: expected a non-empty string`);
  }
  return v.trim();
}

/**
 * The presentation half of the fixture, read strictly.
 *
 * Strict because a defaulted field would render a description that asserts nothing and still looks
 * finished — the quietest way to ship an empty panel. A missing `title` is a broken example, and the
 * message says which file to open.
 */
function readPresentation(id: string, source: string): {
  readonly title: string;
  readonly summary: string;
  readonly suggested: readonly { readonly id: string; readonly label: string }[];
} {
  const where = fixturePath(id);
  const doc: unknown = parse(source);
  if (!isObject(doc)) throw new ExampleMetadataError(`${where}: expected a mapping`);
  const queries = doc["queries"];
  if (!Array.isArray(queries)) throw new ExampleMetadataError(`${where}.queries: expected a sequence`);

  const suggested: { readonly id: string; readonly label: string }[] = [];
  for (const [i, raw] of queries.entries()) {
    if (!isObject(raw)) throw new ExampleMetadataError(`${where}.queries[${i}]: expected a mapping`);
    if (raw["suggested"] !== true) continue;
    suggested.push({
      id: text(raw["id"], `${where}.queries[${i}].id`),
      label: text(raw["label"], `${where}.queries[${i}].label`),
    });
  }
  if (suggested.length === 0) {
    throw new ExampleMetadataError(`${where}: no query is marked suggested, so there is nothing to present`);
  }
  return {
    title: text(doc["title"], `${where}.title`),
    summary: text(doc["summary"], `${where}.summary`),
    suggested,
  };
}

/**
 * Join the case's invitations to the fixture's suggested set, by query id, in the fixture's order.
 *
 * Strict in both directions for `readPresentation`'s reason: a case ask naming no suggested query
 * would present a question nothing pins, and a suggested query no case asks about would quietly
 * drop a question the corpus believes it offers. Either is a broken example, said loudly with the
 * file to open.
 */
function joinCaseQuestions(
  id: string,
  suggested: readonly { readonly id: string; readonly label: string }[],
  tryAsking: readonly CaseQuestion[],
): readonly PresentedQuestion[] {
  const where = fixturePath(id);
  const byQuery = new Map(tryAsking.map((q) => [q.query, q.ask]));
  if (byQuery.size !== tryAsking.length) {
    throw new ExampleMetadataError(`${id}: the case asks about one query twice`);
  }
  const suggestedIds = new Set(suggested.map((s) => s.id));
  for (const q of tryAsking) {
    if (!suggestedIds.has(q.query)) {
      throw new ExampleMetadataError(
        `${id}: the case asks about '${q.query}', which ${where} does not mark suggested`);
    }
  }
  return suggested.map((s) => {
    const ask = byQuery.get(s.id);
    if (ask === undefined) {
      throw new ExampleMetadataError(
        `${id}: ${where} marks '${s.id}' suggested and the case never asks about it`);
    }
    return { query: s.id, ask, statement: s.label };
  });
}

/**
 * The example menu and the loader behind it.
 *
 * A class because it holds the fetched text: describing an example then loading it would otherwise
 * read the same file twice, and the second read is the one that would fail on a flaky network after
 * the user has already been shown a description.
 */
export class ExampleCatalog {
  readonly #workspace: Workspace;
  readonly #read: AssetReader;
  readonly #sources = new Map<string, string>();
  /**
   * The example whose case the workspace currently shows, pinned to the import that installed it.
   *
   * The pin is {id, loadNonce-at-load}: any later load — a file, a new system, another example, a
   * Reset — advances the workspace's nonce and the pin silently expires, so the case panel can
   * never describe a document that did not come from its example. Edits, undo and hypotheses do
   * not advance the nonce, and that is the requirement: a shipped example stays an ordinary
   * editable workspace WITH its case, because the case is context, not a constraint.
   */
  #pinnedCase: { readonly id: ShippedExampleId; readonly nonce: number } | null = null;

  constructor(workspace: Workspace, read: AssetReader) {
    this.#workspace = workspace;
    this.#read = read;
  }

  /** The shipped example the current import came from, or null when it came from anywhere else. */
  currentCase(): ShippedExampleId | null {
    if (this.#pinnedCase === null) return null;
    return this.#pinnedCase.nonce === this.#workspace.loadNonce ? this.#pinnedCase.id : null;
  }

  /**
   * Re-pin a case onto the CURRENT import — the session-restore seam. A restored session's text
   * went through the ordinary `Workspace.load`, so the catalogue never saw it; this tells the
   * catalogue which example that session began from. Refuses an unshipped id rather than pinning
   * a case to a document it cannot describe.
   */
  adoptCase(id: string): void {
    this.#assertShipped(id);
    this.#pinnedCase = { id, nonce: this.#workspace.loadNonce };
  }

  /** What the menu may offer. Closed, and short for a stated reason. */
  ids(): readonly ShippedExampleId[] {
    return SHIPPED_EXAMPLE_IDS;
  }

  async describe(id: string): Promise<ExampleDescription> {
    this.#assertShipped(id);
    const [source, fixture] = await Promise.all([this.#source(id), this.#read(fixturePath(id))]);
    // `canonicalizeOnly` rather than a second parser: the questions a description shows must be the
    // questions the loaded model will report, and only the canonical form guarantees that.
    const system = Workspace.canonicalizeOnly(parse(source));
    const models: ExampleModelBlurb[] = [
      ...[...system.models.values()].map((m) => ({
        id: m.id, label: m.label, kind: "graph" as const, question: m.purpose.question,
      })),
      // Machines carry a purpose exactly as a graph model does. A description that listed only
      // `system.models` would report worker-queue as having one model and would be wrong.
      ...[...system.machines.values()].map((m) => ({
        id: m.id, label: m.label, kind: "machine" as const, question: m.purpose.question,
      })),
    ];
    const { title, summary, suggested } = readPresentation(id, fixture);
    const envelope = caseOf(id);
    return {
      id, title, summary,
      scenario: envelope.scenario,
      investigate: envelope.investigate,
      models,
      tryAsking: joinCaseQuestions(id, suggested, envelope.tryAsking),
    };
  }

  describeAll(): Promise<readonly ExampleDescription[]> {
    return Promise.all(this.ids().map((id) => this.describe(id)));
  }

  /**
   * Load it. ONE call, and it is the import call.
   *
   * The findings come back for the same reason `Workspace.load` returns them: an example that loaded
   * with findings is a broken example, and the caller should be able to say so rather than present a
   * damaged model as a tutorial.
   */
  async load(id: string): Promise<{ readonly ok: boolean; readonly findings: readonly Finding[] }> {
    this.#assertShipped(id);
    const result = this.#workspace.load(await this.#source(id));
    // Pin AFTER the load, against the nonce that load minted, and only when it took: a refused
    // import leaves the previous document — and the previous document's case — in place.
    if (result.ok) this.#pinnedCase = { id, nonce: this.#workspace.loadNonce };
    return result;
  }

  #assertShipped(id: string): asserts id is ShippedExampleId {
    if (!(SHIPPED_EXAMPLE_IDS as readonly string[]).includes(id)) {
      throw new UnknownExampleError(
        `'${id}' is not a shipped example; the workbench offers ${SHIPPED_EXAMPLE_IDS.join(", ")}.`);
    }
  }

  async #source(id: string): Promise<string> {
    const cached = this.#sources.get(id);
    if (cached !== undefined) return cached;
    const source = await this.#read(systemPath(id));
    this.#sources.set(id, source);
    return source;
  }
}
