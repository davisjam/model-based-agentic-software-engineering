/**
 * The capability registry — one typed source of truth for what the workbench can do.
 *
 * Per `requirements-ux-261002.md` §22, this single registry drives `window.mage.describe()`, the
 * UI's element and action catalogue, the accessibility tests, the generated affordance model, and
 * the CI invariants. The alternative it replaces is a manually synchronised checklist, which rots.
 *
 * The three invariants it exists to enforce:
 *
 * **UX-I1 — semantic affordance parity.** Every public semantic capability has at least one
 * human-accessible affordance and at least one machine-accessible affordance, and both invoke the
 * SAME application service. This is stronger than "both interfaces have a feature with the same
 * name": they must converge on one semantic operation.
 *
 * **UX-I2 — evidence parity.** Every semantic result available to a machine client has a
 * human-perceivable representation, and every human-visible semantic result is available in
 * structured machine-readable form. No UI-only conclusions, no agent-only conclusions.
 *
 * **UX-I3 — authoritative-state convergence.** Every successful semantic edit — mouse, keyboard,
 * inspector, source, import, agent transaction — normalises to the same typed IR, and every other
 * projection updates FROM that IR. Never peer representations synchronising with each other.
 *
 * Honesty is the point of the `status` field. A capability whose human affordance is not yet wired
 * says so, and UX-I1 fails. That is the invariant naming incomplete work rather than letting the
 * workbench be described as finished. The field earned its keep: UX-I1 reported twelve violations,
 * then six, then none, and each drop was a wave of work the invariant had named in advance.
 */

// The surface vocabulary comes from the shell, which owns the regions and knows which are built.
// TYPE-ONLY, and that is the layering: `src/app/` gains no runtime dependency on `src/ui/`, so the
// registry still loads in a node test with no DOM. `DESIGN-shell-261002.md` §9a settled this —
// declaring the union here and the SURFACES table there would split one fact across two files.
import type { NavSurface } from "../ui/shell/surfaces.ts";

/** Every public semantic capability. The list is closed; adding one is a deliberate act. */
export type CapabilityId =
  | "create-model" | "delete-model"
  | "create-element" | "delete-element"
  | "create-relation" | "delete-relation"
  | "edit-property"
  | "inspect"
  | "validate"
  | "query" | "check-query" | "analyze" | "explore-space" | "inspect-evidence"
  | "create-hypothesis" | "commit-hypothesis" | "discard-hypothesis"
  | "undo" | "redo"
  | "import" | "export"
  | "load-example"
  | "add-note" | "inspect-provenance"
  | "save-property" | "retract-property";

/**
 * How complete an affordance is. `wired` means it reaches the service; `refusing` means the path
 * exists and deliberately declines, naming what it cannot do rather than failing vaguely; `absent`
 * means nothing yet.
 *
 * Only `wired` satisfies UX-I1. The other two exist so the registry can be TRUE while the product
 * is incomplete, rather than aspirational and therefore useless as a gate.
 */
export type AffordanceStatus = "wired" | "refusing" | "absent";

export interface Affordance {
  /** Where a person or an agent actually invokes it: "canvas.connect", "transaction.add-relation". */
  readonly at: string;
  readonly status: AffordanceStatus;
  /** Why, when not wired. Required by a test for anything not `wired`. */
  readonly note?: string;
}

/**
 * Where a human affordance lands in the page, so `at` can be CHECKED instead of asserted.
 *
 * Until this field existed, a wired human site was a sentence an author wrote and nothing read.
 * Nothing mapped the 29 site strings to elements, so a control could be renamed, removed or made
 * unreachable and UX-I1 would stay green — the defect recorded as F-3 in
 * `BASELINE-a11y-261002.md` §6. The site string stays the stable name a document can cite; this
 * says which element carries it.
 *
 * **The element id lives HERE rather than beside the markup, and that is the whole argument for the
 * shape.** A `data-affordance="header.export"` hand-typed into `index.html` next to a hand-typed
 * `"header.export"` in this file would be two copies of one fact, which is the same defect one
 * layer down. So the page does not author the attribute at all: the UI stamps it from this
 * declaration on every paint, and a test asserts the markup contains no literal `data-affordance`.
 * One source of truth, and the DOM is its projection.
 */
export interface AffordanceElement {
  /** The `id` the page must present this site as. Checked against `index.html` by the node tier. */
  readonly id: string;
  /**
   * A descendant selector, for a site rendered INSIDE another site's host.
   *
   * One case today: the evidence list is `.evidence` inside `#question-list`, which also hosts
   * `properties-section.list`. The host is what the binder requires — a question list with no
   * evidence in it is an ordinary state, not a missing control — so the selector's teeth come from
   * the browser tier, which drives a fixture known to render one.
   */
  readonly within?: string;
}

/**
 * What must already be true before a navigation step can be taken. CLOSED, so a harness can set
 * every member up — a precondition nothing can establish is a path nothing can walk.
 *
 * Eleven members. `DESIGN-shell-261002.md` §2.2 sketched seven and the page needed four more; each
 * addition is a measured fact about a control the sketch did not look at, recorded in §9f.
 *
 * `selection:*` repeats the five members of `ActionPrecondition` in `ui/shell/edit-dialogs.ts`,
 * which §9c made deliberate: a navigation path to an inspector action reads its condition off the
 * editing catalogue instead of re-deriving it. The two are not unified into one type because the
 * editing catalogue's five are the conditions an OPERATION needs and these eleven are the
 * conditions a ROUTE needs, and only the overlap is a coincidence worth keeping aligned.
 */
export type NavPrecondition =
  /**
   * A model system is loaded. The baseline is the PRISTINE page — what a browser hands a
   * first-time visitor — so this is a declared step and not an assumption, and every shell region
   * but the header and Start is `hidden` without it.
   */
  | "loaded"
  | "selection:element" | "selection:relation" | "selection:model" | "selection:machine"
  /** At least one saved question exists, so the property rail and its evidence have content. */
  | "property-exists"
  /** A hypothesis is open, so the REVIEW CHANGE dialog is up and everything behind it is inert. */
  | "hypothesis-open"
  /** A bounded search returned `exhausted`. No human route reaches this; see §9f. */
  | "exhausted-answer"
  /** An edit has been committed, so there is something to undo. `#undo` is disabled without it. */
  | "edited"
  /** An edit has been undone, so there is something to redo. */
  | "undone"
  /** An answer is on screen: `#ask-track-box` is `hidden` until the ask bar has answered. */
  | "answer-present";

/**
 * One step of a declared navigation path: a surface, and the act that takes you through it.
 *
 * `read` is the fifth `via` and the design's §2.3 did not have it. Five affordance sites are
 * READOUTS — the model tables, the findings list, the property list, the evidence list, the
 * provenance list — and a readout is a `<section>` or an `<ol>` with `tabindex="-1"`. Rung 2's
 * "exists, is focusable, and is enabled" can never hold for one, so a drive that applied it to all
 * thirty-six sites would have had to be weakened to pass, which is how a gate stops meaning
 * anything. Declaring the terminal's KIND instead keeps both assertions exact and makes the
 * declaration falsifiable in both directions: a readout that becomes focusable fails, and a control
 * declared `read` fails too.
 */
export interface NavStep {
  readonly surface: NavSurface;
  /** How the step is taken: activate a control, open a disclosure, open a menu, a shortcut, read. */
  readonly via: "activate" | "disclose" | "menu" | "shortcut" | "read";
  readonly requires?: NavPrecondition;
}

/**
 * A HUMAN affordance. Wired or refusing means a real element; absent means a stated reason.
 *
 * Two members rather than one interface with an optional `element`, because the compiler then holds
 * the invariant the node tier would otherwise have to re-check: a human affordance cannot claim to
 * be wired without naming the element that carries it. `DESIGN-shell-261002.md` §2.2 widens this
 * field into a declared NAVIGATION PATH that a generated keyboard drive walks; an element id is the
 * same claim about a flat page, and the shell replaces it rather than having to undo it.
 */
export type HumanAffordance = BoundAffordance | AbsentAffordance;

export interface BoundAffordance {
  readonly at: string;
  readonly status: "wired" | "refusing";
  readonly note?: string;
  readonly element: AffordanceElement;
  /**
   * HUMAN affordances only: the declared route from the PRISTINE page to the control.
   *
   * An empty path means "already there, with nothing to establish" — true of exactly two sites, the
   * two ways into the workbench in the header. Everything else names at least one step, because
   * every other region is `hidden`, disabled or collapsed until something is true.
   *
   * REQUIRED since wave 3, which is SH-I8 flipped hard. The field landed optional in wave 1d with
   * an exactly-enumerated path-less set, because the one member of that set was a control no human
   * could reach and declaring its obvious-but-unwalkable path would have landed a blocking gate
   * red. Wave 3 gave a model a selectable row in the contents tree, the set emptied, and the `?`
   * came off: a wired human affordance that declares no route now fails to COMPILE rather than
   * failing a check, which is the rung above the one the migration could reach.
   */
  readonly path: readonly NavStep[];
}

export interface AbsentAffordance {
  readonly at: string;
  readonly status: "absent";
  /** Required here, not optional: an absence with no reason is an aspiration, not a declaration. */
  readonly note: string;
}

export interface Capability {
  readonly id: CapabilityId;
  /** What it does, in the user's terms. Shown by `describe()`. */
  readonly summary: string;
  /**
   * The ONE application service both sides invoke. UX-I1's "same underlying service" is checked by
   * comparing this string, so it must name a real seam, not a category.
   */
  readonly service: string;
  readonly human: readonly HumanAffordance[];
  readonly machine: readonly Affordance[];
  /** Does invoking this produce a semantic RESULT that UX-I2 governs? */
  readonly producesEvidence: boolean;
}

/**
 * The page's chrome controls: buttons that are NOT capability affordances, and why each one is not.
 *
 * `test/capabilities.test.ts` and `test/browser/workbench.test.mjs` both assert that every button
 * the page ships is a declared affordance site, in the markup and in the served DOM. The browser
 * sweep's own comment anticipated this wave: "The shell adds disclosure and menu buttons, and
 * whoever lands them owns the decision to declare them or to name an exemption here." These four
 * are the exemption, named once and read by both tiers, because two hand-written copies of one
 * exemption list is the drift the affordance binding exists to retire.
 *
 * The test both sweeps apply: a chrome control cannot reach `Workspace` at all. Opening a dialog,
 * closing one, and cancelling out of one mutate nothing; `#edit-dialog-confirm` is the only
 * borderline member and it is the terminal of whichever operation is currently open, so it is one
 * element that would have to carry ten stamps. The operation's affordance is the control that
 * OPENS it — which is also where correction 4 put it: "expose the operation where the user
 * naturally encounters its object."
 */
export const CHROME_CONTROLS: readonly { readonly id: string; readonly why: string }[] = [
  { id: "palette-open", why: "opens the command palette; navigation, and it mutates nothing" },
  { id: "palette-close", why: "dismisses the palette" },
  {
    id: "edit-dialog-confirm",
    why: "the terminal of whichever operation is open — one element cannot carry ten stamps, so the "
      + "affordance is the menu / inspector / palette control that opened the dialog",
  },
  { id: "edit-dialog-cancel", why: "dismisses the edit dialog without submitting" },
  {
    id: "reset",
    why: "clears the persisted SESSION and returns the workbench to its base state. Chrome rather "
      + "than a capability because it moves no model: there is no semantic operation an agent "
      + "could be missing here — `window.mage.load` already replaces a model, and an agent has no "
      + "page to reload. The thing Reset undoes is a browser-storage side effect the agent surface "
      + "does not have, so declaring a capability would advertise a parity that is not meaningful",
  },
  {
    id: "ask-witness-show",
    why: "draws the answered question's witness over the model that carried it; it writes the "
      + "view's `witness`, which is outside semantic state exactly as `target` and `selection` are "
      + "(DESIGN-shell-261002.md section 4, ruling 1) — the WITNESS is `inspect-evidence`'s, "
      + "declared and wired on both sides, and this moves only which picture shows it",
  },
];

/**
 * Chrome identified by WHERE it is, for controls rendered from the model and therefore id-less.
 *
 * `CHROME_CONTROLS` exempts a named element. That cannot reach the model contents tree: its rows
 * are one button per entity, relation, state and transition of whichever model is drawn, so there
 * is no id to write down and no fixed number of them. The exemption therefore names the HOST, and
 * the host is the narrowest one that exists — a selector matching a region, not a tag.
 *
 * **A tree row is navigation, which is the same test the palette's opener passes.** Activating one
 * sets `ViewState.selection`, and the shell's §4 ruling puts selection outside semantic state
 * deliberately: not in the IR, not hashed, not in undo history. UX-I1 censuses SEMANTIC
 * capabilities, so a control that moves only the view is not a capability missing from the census —
 * it is a control the census is not about. The operations a selected object can be edited with keep
 * their declared sites in the Inspector's action bar, where the registry already stamps them.
 *
 * Deliberately NOT a general escape. Each member is one region, with the reason its controls are
 * outside the census — which is always that they move something the census is not about. For the
 * contents tree that is the VIEW's selection; for the add-model picker it is the open dialog's own
 * unsubmitted field. Neither reaches the IR, so neither is a semantic capability missing from the
 * registry.
 */
export const CHROME_HOSTS: readonly { readonly selector: string; readonly why: string }[] = [
  {
    selector: "#model-contents button",
    why: "the model contents tree's rows: one per drawn element, activating one sets the view's "
      + "selection and mutates no model state (DESIGN-shell-261002.md section 4, ruling 1)",
  },
  {
    selector: "#edit-dialog-type-rows button",
    why: "the add-model dialog's model-type picker: one row per entry in the model-type registry, "
      + "so there is no id to write down and no fixed count of them. Pressing one writes the "
      + "type's registry question into the dialog's own question field and submits nothing — the "
      + "operation still terminates at `edit-dialog-confirm`, whose exemption above says why the "
      + "dialog's terminal carries no stamp of its own",
  },
];

/**
 * Wired human affordance sites that declare no walked path. **EMPTY, and it cannot be otherwise.**
 *
 * §2.4's migration list, drained. It held exactly one member for one wave —
 * `inspector.delete-model`, whose precondition is a model selection that no human control produced
 * — and wave 3 drained it by giving the contents tree a selectable subject row rather than by
 * re-siting the button. The list's whole value was that it was an accurate violation instead of a
 * comfortable number, and a drained list is the outcome that was supposed to prove.
 *
 * **Why the constant survives its last member.** `BoundAffordance.path` is now required, so a
 * path-less wired site cannot be written at all and no member can be legitimately added — the
 * compiler holds what this list was tracking. What the list still does is arithmetic and
 * rejection: rung 3 in `test/browser/a11y/paths.test.mjs` asserts `walked + excused = every wired
 * site`, so the denominator needs a term even when the term is zero; and `checkNavPaths`'s
 * reverse direction reports any member as a violation, which is how an excuse smuggled back in
 * fails rather than quietly shrinking the drive's coverage.
 */
export const WIRED_WITHOUT_A_WALKED_PATH: readonly {
  readonly at: string; readonly why: string; readonly drainedBy: string;
}[] = [];

// ----------------------------------------------------------------------------------------------
// The escape hatches — surfaces that exist OUTSIDE the semantic interface
// ----------------------------------------------------------------------------------------------

/**
 * Which ruling fences a hatch. CLOSED, so an invented or empty citation is a COMPILE error.
 *
 * `DESIGN-model-query-261002.md` §7.2 types this field `string`, which would let a hatch declare
 * `fencedBy: ""` and pass — the same defect the design elsewhere spends pages avoiding, and the
 * reason M3 narrowed `Collector.add`'s rule id to a union (§14(2)). A hatch is only outside the
 * semantic interface because a ruling put it there; there is exactly one such ruling today, and a
 * second one has to be added here before a second hatch can cite it.
 *
 * The string is also a path a test resolves: `test/escape-hatch.test.ts` reads the cited file and
 * asserts it contains the sentence that does the fencing. A closed union cannot be forged; a
 * citation to a file that does not say what is claimed can be, so the join is checked too.
 */
export type FenceCitation = "DECISIONS-RULED-model-query-261002.md";

/**
 * A surface that exists for debugging and development, OUTSIDE the semantic interface.
 *
 * The ruling's words: *"A raw SPARQL console may still exist as an advanced, debugging, or
 * development escape hatch. If retained, it should be explicitly outside the normal UX-I1 semantic
 * interface and should not become an interface on which normal agent workflows depend."*
 *
 * A hatch is **not** a `Capability` with a missing human side, and that distinction is the whole
 * point of a separate list. UX-I1 governs capabilities: every one owes a wired affordance on both
 * sides and a navigation path for the human one. A hatch owes neither — "outside the semantic
 * interface" means precisely that UX-I1 does not reach it — so declaring the console as a
 * one-sided capability would have made the gate report a violation that is a decision, and raising
 * `PARITY_VIOLATION_CEILING` to absorb it would have blinded the gate to every real one.
 */
export interface EscapeHatch {
  /** Where it is called: a `window.mage` path, like a machine affordance's `at`. */
  readonly at: string;
  /** Why it exists at all. Checked non-empty: a hatch with no stated reason is an accident. */
  readonly reason: string;
  /** The ruling that fences it. A hatch cannot be declared without one. */
  readonly fencedBy: FenceCitation;
}

/**
 * **RATIFIED — `DESIGN-model-query-261002.md` §G2, ruled (a) on 261004.**
 *
 * The console lives at `window.mage.debug.sparql` and `AGENT_API_VERSION` reads 0.3.0 from here.
 * The author's ruling states what the rename buys, and the qualification is part of the ruling
 * rather than a hedge on it: the namespace **correctly advertises "you have now left the supported
 * semantic interface," even though the namespace itself is not an enforcement mechanism.**
 *
 * So ratification changes the STATUS of a decision and nothing about the fence's teeth. Every
 * mechanical control keys off `ESCAPE_HATCHES[].at`, whatever string that is: the disjointness
 * check, the closure check, `describe().outsideSemanticInterface`, both reference closures, and
 * every test (none spells the site — they read it from this declaration). A call site that reads
 * `debug.sparql` is legible, not fenced; what fences it is the declaration below.
 *
 * The independent support the author cited: `SEMANTICS.md` §7.5 already holds that SPARQL is an
 * INTERFACE and not the semantic foundation, with V32 fixing licensing authority in the IR for every
 * interface. The rename makes that existing position visible where a dependency forms.
 *
 * `previously` and `previousApiVersion` stay. They are what an agent script written against 0.2.0
 * is diagnosed by, and a ratified rename still has a before.
 */
export const SPARQL_HATCH_RENAME = {
  at: "window.mage.debug.sparql",
  previously: "window.mage.sparql",
  apiVersion: "0.3.0",
  previousApiVersion: "0.2.0",
  /** True since §G2 was ruled (a). The decision, not a trial. */
  ratified: true,
  question: "DESIGN-model-query-261002.md §G2 — ruled (a), 261004",
} as const;

/**
 * Every surface declared outside the semantic interface. The list is closed; adding one is a
 * deliberate act that needs a ruling to cite.
 *
 * One member. The raw SPARQL console: the ruling reversed `DESIGN-sparql-261002.md` §6 Q9's first
 * reading, under which it was registered as a third machine affordance of `query`.
 */
export const ESCAPE_HATCHES: readonly EscapeHatch[] = [
  {
    at: SPARQL_HATCH_RENAME.at,
    reason:
      "raw SPARQL over the RDF projection, for debugging the projection and the licensing seam. "
      + "Outside the semantic interface because a syntactically valid SPARQL query can ask "
      + "questions the RDF representation permits and the MAGE metamodel does not license.",
    fencedBy: "DECISIONS-RULED-model-query-261002.md",
  },
];

/** A machine affordance: a callable on `window.mage`, which has no element to bind. */
const wired = (at: string): Affordance => ({ at, status: "wired" });

const step = (
  surface: NavSurface, via: NavStep["via"], requires?: NavPrecondition,
): NavStep => (requires === undefined ? { surface, via } : { surface, via, requires });

/** A wired human affordance, the element that carries it, and the route to it. */
const control = (at: string, id: string, path: readonly NavStep[]): BoundAffordance =>
  ({ at, status: "wired", element: { id }, path });

/**
 * The route to a control in the header, which is present on the pristine page but disabled until
 * `requires` holds. Four of the five header capabilities ship disabled for exactly this reason.
 */
const header = (at: string, id: string, requires?: NavPrecondition): BoundAffordance =>
  control(at, id, [step("header", "activate", requires)]);

/**
 * The route to one of the ten pinned editing fieldsets: load a system, act in the `edit` region.
 *
 * `edit` is a surface the design's §5 gives no row, because correction 4 replaces the fieldsets
 * with the `+ Add` menu, inspector actions and the palette. It is in the table anyway — see
 * `ui/shell/surfaces.ts` — because the markup ships and a person really can walk to it, and a path
 * is the wrong place to be delicate about a region's future.
 */
const editSection = (at: string, id: string): BoundAffordance =>
  control(at, id, [step("edit", "activate", "loaded")]);

/** The route to an inspector action: select the thing, act on it where it is. */
const inspectorAction = (
  at: string, id: string, needs: NavPrecondition,
): BoundAffordance => control(at, id, [step("inspector", "activate", needs)]);

/**
 * The route to one of the five `+ Add` menu items: open the workspace's disclosure, act in it.
 *
 * TWO steps, where §9c declared three acts in two steps (`disclose` then `menu`). The built menu is
 * one `<details>`, so a second disclosure step describes an act the page does not have — and the
 * drive counts declared disclosures against the collapsed ancestors it finds, so the over-declared
 * version fails rather than passing vacuously. Nothing declares `via: "menu"` today.
 */
const addMenuItem = (at: string, id: string): BoundAffordance =>
  control(at, id, [step("workspace", "disclose", "loaded"), step("workspace", "activate")]);

/**
 * The route to a control inside the ask bar's collapsed Advanced query disclosure.
 *
 * **The second step's surface is no longer a parameter**, and that is residue 3 of the shell waves
 * closed. `advanced-query` named `#form-ask`, one of the three fieldsets inside
 * `<details id="ask-advanced">`, so the Save and Retract sites lived in the disclosure and outside
 * the surface that describes it — and passed `"askbar"` here, naming a region two steps wide for
 * a step that is one fieldset deep. The surfaces table now names the disclosure, every caller wants
 * the same surface, and a parameter with one value is a decision nobody is making.
 */
const advanced = (
  at: string, id: string, requires: NavPrecondition = "loaded",
): BoundAffordance =>
  control(at, id, [step("askbar", "disclose", requires), step("advanced-query", "activate")]);

/**
 * A READOUT: an affordance whose use is reading it, not activating it.
 *
 * The five of these are why `via` has a `read` member. The host is a `<section>` or an `<ol>` with
 * `tabindex="-1"`, so it is not a tab stop and never will be; what a keyboard user needs is the
 * REGION, named and reachable, with content in it.
 */
const readout = (
  at: string, id: string, surface: NavSurface, requires: NavPrecondition = "loaded",
): BoundAffordance => control(at, id, [step(surface, "read", requires)]);

/**
 * The route to anything inside the System Browser, which wave 3 put behind one disclosure.
 *
 * Correction 3's advanced surface, built: the region's heading stays visible and its exhaustive
 * content sits in a `<details>`, so every site in there gains a `disclose` step ahead of whatever
 * it was. §10 promised the step would be a ⋯ menu hop; it is a disclosure, which is the same act in
 * the mechanism SH-I2 already governs — and the promise that mattered was that the step would be
 * PREPENDED rather than the controls relocated, which is what happened.
 */
const inBrowser = (
  at: string, id: string, via: NavStep["via"],
): BoundAffordance =>
  control(at, id, [step("system-browser", "disclose", "loaded"), step("system-browser", via)]);

/**
 * The registry. Reflects what is actually built as of 261002.
 *
 * **UX-I1 reports zero violations over twenty-five capabilities, and the zero is honest.** It read
 * one for a wave: `explore-space` had a machine affordance and no human one, and the gate named it
 * rather than letting the registry describe a workbench that did not exist. The alternative on the
 * table then was to fold exploration of the configuration space into `analyze` — which would have
 * shown zero immediately, because `analyze` has a wired human affordance for a different reason.
 * That is the worst of the three outcomes: not a gap, not a declared gap, but a gap laundered
 * through a row that is green on other business.
 *
 * The zero now standing is the other kind — every row wired on both sides over one named service,
 * and the one that was not is closed by a control a person can reach, not by a quieter census.
 *
 * The last two came from the §20 capability table rather than from a developer noticing a gap:
 * `load-example` and `inspect-provenance` were rows in the specification with no registry entry, so
 * UX-I1 could not fail for them. A capability the registry never declares is invisible to its own
 * gate, which is why a test now reads that table and insists every row maps to an entry here.
 *
 * The last three failures shared one cause, and it was not a UI gap: the transaction schema had no
 * operation for adding a model, deleting a model or attaching a note, so there was nothing to bind
 * on EITHER side. The fix was therefore `add-model`, `delete-model` and `add-note` first and the
 * controls second. Writing a control for an op that does not exist would have cleared the violation
 * by making the registry lie, which is worse than a violation that is true.
 *
 * `refusing` has no users. It stays in `AffordanceStatus` because the next capability someone
 * declares may need it before it needs `wired` — and because a registry that can only say
 * "finished" is not a gate. `absent` has one user, which is what that sentence predicted.
 */
export const CAPABILITIES: readonly Capability[] = [
  {
    id: "import",
    summary: "Open a .mage.yaml model system, or start an empty one.",
    service: "workspace.load",
    // Creating a new system is the SAME act: a string of YAML through the same seam. It is a second
    // affordance here rather than a capability of its own, because a capability whose service and
    // semantics are identical to an existing one would make the registry longer without making it
    // say more. `header.load-example` used to sit in this list, and moved out when loading a shipped
    // example became a capability with its own service.
    human: [control("header.file-input", "file", []), control("header.new-system", "new-system", [])],
    machine: [wired("window.mage.load")],
    producesEvidence: false,
  },
  {
    id: "load-example",
    summary: "Load a shipped example, as an ordinary editable workspace.",
    service: "examples.load",
    // EX-I1 lives behind this one string. `examples.load` fetches the shipped bytes and calls
    // `workspace.load` -- the import seam -- so there is no privileged path and no example mode. The
    // capability earns its own row because the SELECTION and the description are semantics `import`
    // does not have: an agent asking what it may load gets an answer here and nowhere else.
    human: [control("start.load-example", "example-load", [step("start", "activate")])],
    machine: [wired("window.mage.loadExample"), wired("window.mage.examples")],
    producesEvidence: false,
  },
  {
    id: "export",
    summary: "Write the model system back out, comments and key order preserved.",
    service: "workspace.export",
    human: [header("header.export", "export", "loaded")],
    machine: [wired("window.mage.export")],
    producesEvidence: false,
  },
  {
    id: "inspect",
    summary: "Read every modelled fact: entities, relations, machines, purpose, omissions.",
    service: "workspace.state",
    human: [inBrowser("model-section.tables", "sections", "read")],
    // `window.mage.model.elements` is the SECOND spelling of this read, and this row rather than
    // `query` is where it belongs — which corrects `DESIGN-model-query-261002.md` §7.1, whose table
    // put `elements` on `query`. UX-I1 compares the row's `service` string to check the two
    // interfaces converge, and `elements` reaches `workspace.state`: it filters the IR's entity
    // table and walks no edges. Registering it under `query` would have made `workspace.query` a
    // seam only some of that row's affordances reach, which is the one job that string has — and it
    // is the same defect as the `validate` row's stale machine affordance two rows down.
    //
    // It is not a capability of its own either. §2.4 is explicit that an agent could already get
    // these ids, by pulling the whole of `inspect()` over and filtering it client-side; what
    // `elements` adds is that the model answers the question instead of the caller. A new row would
    // report a capability the product gained, and it gained a spelling.
    //
    // `window.mage.model.count` lands here for the same reason and passes the same test. It reaches
    // `workspace.state` — `countElements` calls `selectElements` and drops the list, so it reads the
    // one entity table and walks no edges — and it reports no capability the product gained: an
    // agent holding `elements()` could already read `ids.length`. What it adds is the question asked
    // in its own words, and a figure that states the read which makes it exact
    // (`DESIGN-v02-quantification-261004.md` §3.2). Registering it under `query` would repeat the
    // §7.1 mistake the paragraph above corrects.
    machine: [
      wired("window.mage.inspect"), wired("window.mage.model.elements"),
      wired("window.mage.model.count"),
    ],
    producesEvidence: false,
  },
  {
    id: "validate",
    summary: "Ask whether the model is well formed, and get each violated rule with what to repair.",
    service: "validator.validate",
    // The human side never had the gap the ruling names: the findings table repaints from
    // `state.findings`, which recomputes on every read, so a person has always been able to SEE the
    // verdict for the current revision. What it lacks is a way to ASK — and that asymmetry is the
    // right way round for this capability. A person reads a panel that is already correct; a machine
    // client has no panel, so for it the operation IS the affordance.
    human: [readout("validation-section.table", "finding-list", "statusbar")],
    // RE-POINTED by the model-query ruling's Extension 2. The row used to name
    // `window.mage.context.findings`, which is a FIELD OF ANOTHER OPERATION'S RESULT rather than an
    // operation: an agent could read findings only by asking for the context, and what it got back
    // carried no severity, no subjects, no spec join and no statement of which implementation
    // decided it. `window.mage.validate` is the operation, and `service` names the seam both sides
    // reach — `workspace.validate` and the table's `state.findings` run the same `rules.ts` pass.
    //
    // `context().findings` is not listed as a second spelling. It survives, and its doc-comment says
    // what it honestly is, but a field of a context read is not an affordance OF this capability —
    // registering it as one is how the gap hid in a green registry for as long as it did.
    // `window.mage.model.violations` is the same operation under the noun §2.2's table names it by —
    // "identifying violations of a model constraint" — and it delegates to the same
    // `workspace.validate`. A second spelling, not a second rule set: there is one `rules.ts` pass
    // and one authority, and the facade adds a word rather than a party.
    machine: [wired("window.mage.validate"), wired("window.mage.model.violations")],
    producesEvidence: true,
  },
  {
    id: "query",
    summary: "Run one graph, behavioural or quantitative model query and return outcome, coverage and evidence.",
    service: "workspace.query",
    // `properties-section.ask` is the §10.1 requirement: a person asks a supported question through
    // structured controls, without writing a query document. It is a second affordance of `query`
    // rather than a capability of its own because it ends at the same `workspace.query` an agent
    // calls -- the controls narrow what can be ASKED, they do not add a way to answer.
    // `askbar.ask` is the PRIMARY surface since the shell's wave 1c: one line, and beside it the
    // deterministic questions this system can answer. `properties-section.ask` is the same
    // capability's Advanced spelling, which keeps the questions the catalogue cannot state — a hop
    // limit, two named endpoints, an explicit quantifier. Both end at `workspace.query`.
    human: [
      header("header.run-all", "run", "loaded"),
      control("askbar.ask", "ask-submit", [step("askbar", "activate", "loaded")]),
      advanced("properties-section.ask", "ask-go"),
    ],
    // `ask` is the grounded twin of `query`: the same service, returning the verdict WITH the models
    // it derives from. Two machine affordances rather than a changed return type, because `query`'s
    // `QueryResult` is the published wire shape and widening it would break every reader of it.
    //
    // ---- the SPARQL console is NO LONGER an affordance of this row ------------------------------
    //
    // This comment used to argue the opposite, at length: `window.mage.sparql` was a third machine
    // affordance here, on the reading that `query` is the capability and SPARQL is a syntax for it
    // (`DESIGN-sparql-261002.md` §6 Q9, first reading). **The author reversed that reading.**
    //
    // `DECISIONS-RULED-model-query-261002.md`: *"'Run arbitrary SPARQL' should not be a semantic
    // capability under UX-I1, and arbitrary SPARQL should not be the normal query interface for
    // either humans or agents."* The old argument's load-bearing premise — that both spellings ask
    // one thing of one system — is what the ruling denies: a syntactically valid SPARQL query can
    // ask questions the RDF representation permits and the metamodel does not license, so the two
    // spellings do not have one semantics, and registering them as one capability let an agent
    // couple its reasoning to the storage representation while the registry called that a feature.
    //
    // The console survives as a fenced escape hatch, declared in `ESCAPE_HATCHES` above where the
    // closure check can see it. The old comment's own hedge — "the author still owns Q9's ruling,
    // and if they rule otherwise what changes is this row, not the wiring" — was right about the
    // wiring: `workspace.sparql` is untouched, and its internal `translate` → `admit` gate still
    // decides licensing. The hatch is outside the semantic interface, not outside the gate.
    //
    // ---- what is still this row's, and why ------------------------------------------------------
    //
    // `window.mage.ask` is the grounded twin of `query`: same service, same question, the verdict
    // returned WITH the models it derives from.
    //
    // `window.mage.analysis.resolveExhausted` re-asks a question the caller already asked, with the
    // Worker's budget instead of the interactive one, and hands back the same four arms. A bound is
    // not a capability — a second row would report that the workbench gained the ability to answer
    // something, when what it gained was permission to spend longer on the same question.
    //
    // It is machine-only, and once the hatch is the only SPARQL producer that asymmetry gets
    // *narrower* rather than wider: the escalation handle is obtainable only from an `exhausted`
    // answer, so escalation is now reachable only downstream of a deliberate hatch use. It needs no
    // separate fencing because it cannot be reached without passing through one.
    //
    // ---- and the three facade spellings, added by M5 ---------------------------------------------
    //
    // `window.mage.model.{related,reachable,path}` are thin constructors: each builds the document
    // `window.mage.query` takes and hands it to the same `workspace.query`. They earn a place on this
    // row by the test the row already applies — a second ROW must report a capability the product
    // gained, and these report none. What they add is a vocabulary: an agent that reads `reachable`
    // knows it is composing a declared relation, where an agent handed
    // `{form:"reachability", relation, from}` has to work that out.
    //
    // They cannot widen what this row answers, and that is held rather than asserted:
    // `MODEL_FACADE` in `agent-api.ts` declares which `QuerySemantics` form each one names, and the
    // derivation test (MQ-I8) resolves every declaration against the model-type registry and checks
    // the emitted document carries the form it declared. `elements` is NOT here — see the `inspect`
    // row, which is the seam it actually reaches.
    machine: [
      wired("window.mage.query"), wired("window.mage.ask"),
      wired("window.mage.analysis.resolveExhausted"),
      wired("window.mage.model.related"), wired("window.mage.model.reachable"),
      wired("window.mage.model.path"),
    ],
    producesEvidence: true,
  },
  {
    id: "check-query",
    summary: "Ask whether a question is meaningful and permitted for its model type, without running it.",
    service: "workspace.check",
    // ---- why this is a row and not a fifth spelling of `query` ----------------------------------
    //
    // The `query` row's own test, applied: a second row must report a capability the product
    // GAINED. `sparql` and `resolveExhausted` fail that test — one is a syntax for asking, the
    // other a bigger budget for the same question, and both hand back the same four arms. `check`
    // passes it twice over. It answers a DIFFERENT question (is this askable, rather than what is
    // the answer), and it returns `QueryCheckResult` — a shape no other capability produces,
    // carrying the refusal cause as data plus the permitted alternatives derived from the
    // model-type registry. That is the `explore-space` test, and `explore-space` won its row on it.
    //
    // ---- and where its human half lands --------------------------------------------------------
    //
    // `properties-section.check` — a *Check* control beside *Ask* in the Advanced query surface,
    // ending at the same `workspace.check` an agent reaches through `window.mage.check`.
    //
    // The surface is the argument. The ask bar's catalogue offers only questions the loaded models
    // license, so checking one there would always answer yes; the Advanced form states a hop limit,
    // two named endpoints and an explicit quantifier, which are exactly the fields that produce a
    // quantifier mismatch or a V7 path-composition refusal. A person composing there CAN write a
    // question the models decline — and what Check adds over running it is the part a refusal cannot
    // carry: the permitted alternatives, derived from this registry's own closed lists.
    //
    // The declared-absent alternative was considered and rejected on the ruling's own words: the
    // human Workbench and the agent interface expose THE SAME semantic capabilities through
    // different interaction surfaces, so "no person needs this" would have been a claim about users
    // defended by a claim about scope. `explore-space` was the last capability in this shape, and it
    // turned out to be one a person obviously should have had.
    human: [advanced("properties-section.check", "ask-check-go")],
    machine: [wired("window.mage.check")],
    // A check result is a semantic result: it reports what the model licenses, with the cause and
    // the alternatives. UX-I2 governs it, which is part of what the missing human control owes.
    producesEvidence: true,
  },
  {
    id: "analyze",
    summary: "Re-run every saved question against the current system.",
    service: "workspace.runSavedQueries",
    // The property list IS the human surface for re-evaluation: it is what a person reads after an
    // edit to see which claims moved. `window.mage.properties` is the machine twin of that same
    // read -- the verdict with the models and evidence it derives from (UX-I5), which satisfies
    // UX-I2 for a surface whose whole content is a semantic result.
    human: [
      header("header.run-all", "run", "loaded"),
      readout("properties-section.list", "question-list", "nav-properties"),
    ],
    machine: [wired("window.mage.savedQueries"), wired("window.mage.properties")],
    producesEvidence: true,
  },
  {
    id: "explore-space",
    summary: "Walk the reachable configuration space and report its size, and whether it finished.",
    service: "workspace.explore",
    // ---- the question this row settles, because it is a question about what a capability IS -----
    //
    // Does `analyze` cover this? No, and the argument is `analyze`'s own two strings. Its service is
    // `workspace.runSavedQueries` and it summarises as re-running saved questions; walking the
    // configuration space is not that. Folding exploration in would have meant rewriting both — a
    // row describing two semantics, whose `service` could then name a seam only half its affordances
    // reach, which is the one job that string has (UX-I1 compares it to check convergence).
    //
    // The `query` row's precedent does not reach here. `sparql` is a SYNTAX for asking a query and
    // `ask` is the same answer with its grounding; both ask one thing of one system and get an
    // answer carrying coverage and a hash. Exploration answers a different question and returns a
    // shape — `SpaceSummary`: states explored, complete, stop reason, dead ends, disclosed rewrites
    // — that no other capability produces. One capability, several spellings is the precedent; this
    // is two capabilities.
    //
    // ---- and how the row was closed, since it was declared open for a reason ----------------------
    //
    // It was `absent` at `analysis-section.explore` for one wave, and the violation did the job the
    // comment below predicted: it named the work, and the work is a control in the System Browser
    // that calls `workspace.explore` and renders the SpaceSummary. The site string MOVED with the
    // control — the section the old one named is one the shell deletes, so keeping the string would
    // have left the registry pointing at a region nobody can navigate to, which is the unverifiable
    // declaration `DESIGN-shell-261002.md` §2.1 refuses.
    //
    // **Sited where the design rules, and wave 3 added the hop it promised.** §10 assigns this
    // capability the path `⋯ menu → System Browser → Explore space`. Wave 2a landed the control at
    // the ruled DESTINATION with no hop, because the ⋯ menu did not exist; wave 3 put the Browser's
    // exhaustive content behind one disclosure and PREPENDED that step to the declared path, which
    // is the promise kept in the mechanism the shell has rather than in the one §10 imagined. The
    // control never moved. That is why siting it at the destination was worth doing a wave early:
    // a control parked somewhere convenient would have had to be relocated, and a relocation is
    // what breaks a declared path.
    //
    // The alternative, when the row was opened, was to leave it out and keep the zero. A count that
    // reads zero because something is missing from the census is worse than one that reads one: the
    // first is unfalsifiable and the second is a work item. This project has three times chosen an
    // accurate violation over a comfortable number — `create-model`, `delete-model` and `add-note`
    // were declared before they were buildable — and each time the violation named the work that
    // closed it. This is the third closure.
    human: [inBrowser("system-browser.explore", "explore-space-go", "activate")],
    machine: [wired("window.mage.analysis.explore")],
    producesEvidence: true,
  },
  {
    id: "inspect-evidence",
    summary: "Read a witness, counterexample or lasso as ordered steps.",
    service: "workspace.query",
    // `.evidence`, not `ul.evidence`: the renderer emits an ORDERED list, because a witness is a
    // sequence of steps. The first attempt to bind this site in a measurement script asked for
    // `ul.evidence`, found nothing, and recorded the evidence list as unreadable — a wrong selector
    // reported as a page defect, which is the argument for the selector living next to the site it
    // names rather than in a reader's private notes.
    human: [{
      at: "properties-section.evidence-list",
      status: "wired",
      element: { id: "question-list", within: ".evidence" },
      // Two steps on one surface: the claim's own `<details>` in the property rail, then the list.
      // §9b asked 1d for "the claim's full reading → the same surface with `via:"disclose"`"; the
      // measured page needs the READ step after it, because the terminal is an `<ol>` and not a
      // control. The precondition is `property-exists` rather than `loaded`: with no saved question
      // there is no claim row, so there is no disclosure to open.
      path: [step("nav-properties", "disclose", "property-exists"), step("nav-properties", "read")],
    }],
    machine: [wired("window.mage.evidence")],
    producesEvidence: true,
  },
  {
    id: "undo",
    summary: "Return to the previous semantic revision.",
    service: "workspace.undo",
    human: [header("header.undo", "undo", "edited")],
    machine: [wired("window.mage.undo")],
    producesEvidence: false,
  },
  {
    id: "redo",
    summary: "Re-apply an undone revision.",
    service: "workspace.redo",
    human: [header("header.redo", "redo", "undone")],
    machine: [wired("window.mage.redo")],
    producesEvidence: false,
  },

  // ---- editing. Every form sends ONE transaction through the same `transact` the agent calls. ---
  //
  // One transaction, usually one operation. `create-model` sends two, because a model needs its
  // question and `set-purpose` already owns that field; atomicity makes the pair one act.
  //
  // There is deliberately no human affordance for adding a MACHINE: the op set has `add-state` but
  // no `add-machine`, so neither interface can do it. That is a symmetric gap in the schema, not an
  // asymmetry between the interfaces, which is why it is a comment here and not a violation.

  {
    id: "create-element",
    summary: "Add an entity, state or machine.",
    service: "transactions.apply",
    // THREE SITES EACH SINCE WAVE 2a, and the multiplicity is the redesign rather than redundancy.
    // Correction 4 replaced one always-visible fieldset with the place a person meets the operation:
    // the `+ Add` menu on the workspace toolbar for the additive ones, and ⌘K for anyone who knows
    // what they want. The `edit-section.*` site is the flat fieldset, still shipped because six §19
    // keyboard drives reach it; it goes when `test/browser/a11y/keyboard.test.mjs` is re-derived
    // from declared paths (wave 2d). The palette is NOT a site: its rows are rendered per open, so
    // an element to stamp exists only while it is up — the opener is `header.palette`.
    human: [
      addMenuItem("add-menu.entity", "add-menu-entity"),
      addMenuItem("add-menu.state", "add-menu-state"),
      editSection("edit-section.add-entity", "add-entity-go"),
      editSection("edit-section.add-state", "add-state-go"),
    ],
    machine: [wired("window.mage.transact")],
    producesEvidence: false,
  },
  {
    id: "delete-element",
    summary: "Remove an entity, state or machine, refusing if anything still references it.",
    service: "transactions.apply",
    // The reference check that refuses a delete while something still points at the target lives in
    // the transaction engine. The form offers the cascade as an explicit opt-in rather than
    // reimplementing the check, so both interfaces get the same refusal for the same reason.
    human: [
      inspectorAction("inspector.delete-element", "act-delete-element", "selection:element"),
      editSection("edit-section.delete-element", "delete-element-go"),
    ],
    machine: [wired("window.mage.transact")],
    producesEvidence: false,
  },
  {
    id: "create-relation",
    summary: "Connect two entities with a licensed relation type.",
    service: "transactions.apply",
    // Licensing is what the form narrows: only relation types the system declares, and only
    // endpoints the chosen model contains -- an edge between entities a model does not contain is
    // an edge no view of that model would draw.
    human: [
      addMenuItem("add-menu.relation", "add-menu-relation"),
      // The contextual one, which is where correction 4 wanted it: "Connect Analytics to…" from
      // the selected entity, with the endpoint already filled in from the selection.
      inspectorAction("inspector.connect", "act-connect", "selection:element"),
      editSection("edit-section.add-relation", "add-relation-go"),
    ],
    machine: [wired("window.mage.transact")],
    producesEvidence: false,
  },
  {
    id: "delete-relation",
    summary: "Remove a relation.",
    service: "transactions.apply",
    human: [
      inspectorAction("inspector.delete-relation", "act-delete-relation", "selection:relation"),
      editSection("edit-section.delete-relation", "delete-relation-go"),
    ],
    machine: [wired("window.mage.transact")],
    producesEvidence: false,
  },
  {
    id: "edit-property",
    summary: "Change a property or label through the same transaction any other edit uses.",
    service: "transactions.apply",
    human: [
      inspectorAction("inspector.rename", "act-rename", "selection:element"),
      inspectorAction("inspector.set-property", "act-set-property", "selection:element"),
      editSection("edit-section.set-label", "set-label-go"),
      editSection("edit-section.set-property", "set-property-go"),
    ],
    machine: [wired("window.mage.transact")],
    producesEvidence: false,
  },

  {
    id: "create-model",
    summary: "Add a purposeful model, with its question.",
    service: "transactions.apply",
    // The form requires the engineering question, which `add-model` itself does not carry: it sends
    // `add-model` plus `set-purpose` in one transaction, composing with the op that already owns the
    // purpose block. Atomicity makes the pair indivisible, so a question-less model never commits —
    // and the habit the workbench exists to teach is enforced by the control rather than suggested.
    human: [
      addMenuItem("add-menu.model", "add-menu-model"),
      editSection("edit-section.add-model", "add-model-go"),
    ],
    machine: [wired("window.mage.transact")],
    producesEvidence: false,
  },
  {
    id: "delete-model",
    summary: "Remove a purposeful model, refusing while it still asserts a relation.",
    service: "transactions.apply",
    // No cascade on either side, deliberately. Relations are flattened across models and carry the
    // model that asserts them, so a relation is a claim rather than a pointer; dropping it as a
    // side effect would shrink the architecture and tell no one.
    human: [
      // WALKED SINCE WAVE 3, and the declaration is now the ordinary one. For a wave this was the
      // registry's only path-less site: the button's precondition is a model selection and nothing
      // a person could press produced one. The fix was a row, not a re-siting — the contents tree's
      // subject row selects the drawn model — so the control stayed where correction 4 put it and
      // the route it always implied became one a keyboard walks.
      inspectorAction("inspector.delete-model", "act-delete-model", "selection:model"),
      editSection("edit-section.delete-model", "delete-model-go"),
    ],
    machine: [wired("window.mage.transact")],
    producesEvidence: false,
  },
  {
    id: "add-note",
    summary: "Attach a note to an object, without changing what the model asserts.",
    service: "transactions.apply",
    // The one capability whose successful use leaves the system hash where it was. Annotation is
    // outside the semantic projection (A1), so this commits WITHOUT advancing the revision and does
    // not invalidate a pending agent transaction. Both affordances say so: the form in words, and
    // `describe()` through the schema's own description of the op.
    human: [
      addMenuItem("add-menu.note", "add-menu-note"),
      inspectorAction("inspector.note", "act-note", "selection:element"),
      editSection("edit-section.add-note", "add-note-go"),
    ],
    machine: [wired("window.mage.transact")],
    producesEvidence: false,
  },
  // ---- properties. The statement is semantic; the verdict is not, and is stored nowhere. ------
  //
  // "Property" is overloaded in this workbench and the two meanings sit three entries apart, so:
  // `edit-property` changes an ENTITY ATTRIBUTE (`classification: RESTRICTED`); these two save and
  // retract an ENGINEERING CLAIM about the system (§3.3, "Publication requires validation"). Only
  // the second meaning is a persistent statement with a verdict.

  {
    id: "save-property",
    summary: "Keep a claim as a persistent statement, re-evaluated on every later revision.",
    service: "transactions.apply",
    // §10.3 is explicit that what is saved is the statement's SEMANTICS and not the displayed
    // answer, so this writes the query and nothing else: one `save-query` op, no verdict field to
    // write it into, and the status is recomputed from the query the next time anyone looks. That
    // is V18's rule for derived values, and the reason there is no `set-status` op to pair with it.
    //
    // The form and the agent send the same operation, and the human form builds its query with the
    // same function that built the one it just ran — so the property a person saves has the
    // semantics of the result they were looking at rather than a re-typed approximation of it.
    // `askbar.track` is correction 7's one-field act: the claim, and nothing else. The id is derived
    // from the claim and the expectation control stays in Advanced, where `properties-section.save`
    // keeps the full form — a tracked claim becomes a REQUIREMENT by a second, deliberate act.
    human: [
      control("askbar.track", "ask-track-go", [step("askbar", "activate", "answer-present")]),
      advanced("properties-section.save", "save-property-go"),
    ],
    machine: [wired("window.mage.transact")],
    producesEvidence: false,
  },
  {
    id: "retract-property",
    summary: "Stop evaluating a statement, without pretending it was never claimed.",
    service: "transactions.apply",
    // The pair of the one above. A claim you cannot withdraw is a claim the model system cannot
    // stop asserting, and `delete-query` already existed with no way for a person to reach it.
    human: [advanced("properties-section.retract", "retract-property-go", "property-exists")],
    machine: [wired("window.mage.transact")],
    producesEvidence: false,
  },

  {
    id: "inspect-provenance",
    summary: "Read where each object came from, and what its author was asked to preserve.",
    service: "workspace.provenance",
    // The read-only twin of `add-note`, and governed by the same invariant (A1 / UX-I6). The service
    // returns records and no writer, so inspecting an origin cannot move a hash or a result.
    //
    // ---- THIS COMMENT ARGUED THE POSITION THE AUTHOR REVERSED, and here is the amendment -------
    //
    // It used to read: "It gets a prominent section rather than a row in the inspector's detail
    // column because the `prompt` is the field that earns the feature… A prompt nobody finds is a
    // prompt nobody reads." Correction 9 reversed that, and `DESIGN-shell-261002.md` §7's ledger
    // records what it became: "the discoverability concern is answered by PLACEMENT (History one
    // disclosure from the purpose), not by prominence." Prominence was never the mechanism that
    // made a prompt findable — a full-page list of every object's origin is the exhaustive page the
    // shell exists to retire, and a reader looking for ONE object's provenance was being handed
    // all of them.
    //
    // So provenance has two surfaces and they are not rivals. The selected object's inspector
    // carries its own Provenance block, one disclosure down (wave 1b) — that is where a reader with
    // a question about an object goes. This site is the whole-system readout, and it belongs with
    // the other exhaustive readouts in the System Browser, now behind its disclosure. Keeping the
    // old sentence here while the page did the opposite is precisely the misleading-prose class
    // §8.3 named: a requirement reversed by a ruling and never amended.
    human: [inBrowser("provenance-section.records", "provenance-list", "read")],
    machine: [wired("window.mage.provenance")],
    producesEvidence: false,
  },

  // ---- the REVIEW CHANGE surface. Opening one routes through the SAME validated transaction path.

  {
    id: "create-hypothesis",
    summary: "Open a what-if branch through the same validated transaction path as any edit.",
    service: "workspace.openHypothesis",
    // MOVED by correction 8, and the move is the substance of the correction rather than a
    // renaming. The human site was `target-hypothesis`, one of a radio pair that made every user
    // choose a branch before every edit — "exposing internal architecture", because a transaction
    // is an architectural guarantee and not a thing to be configured per keystroke. Two routes
    // replace it, and only one of them is a control:
    //
    //   - A CONSEQUENTIAL edit becomes a branch by itself. `DECISIONS-RULED-shell-261002.md` G3:
    //     an edit that would move a requirement is evaluated hypothetically first, which opens one.
    //     That route has no control of its own — it is every editing control — which is exactly
    //     why it cannot be the declared site: one element cannot carry ten stamps.
    //   - `whatif-arm` is the DELIBERATE route, for a user who wants to try something without
    //     committing it even though no obligation is at stake. One toggle, off by default, so the
    //     normal user edits normally.
    human: [header("review.whatif", "whatif-arm", "loaded")],
    machine: [wired("window.mage.hypothesis.open")],
    producesEvidence: true,
  },
  {
    id: "commit-hypothesis",
    summary: "Accept a reviewed change as authoritative.",
    service: "workspace.applyHypothesis",
    human: [control("hypothesis-bar.accept", "hypothesis-apply",
      [step("review", "activate", "hypothesis-open")])],
    machine: [wired("window.mage.hypothesis.apply")],
    producesEvidence: false,
  },
  {
    id: "discard-hypothesis",
    summary: "Throw a reviewed change away; the authoritative model was never touched.",
    service: "workspace.discardHypothesis",
    human: [control("hypothesis-bar.discard", "hypothesis-discard",
      [step("review", "activate", "hypothesis-open")])],
    machine: [wired("window.mage.hypothesis.discard")],
    producesEvidence: false,
  },
];

// --------------------------------------------------------------------------------------------
// The invariants, as functions. CI calls these; `describe()` reports them.
// --------------------------------------------------------------------------------------------

export interface ParityViolation {
  readonly invariant: "UX-I1" | "UX-I2" | "UX-I3";
  readonly capability: CapabilityId;
  readonly problem: string;
}

/**
 * A violation of a UX invariant whose subject is not a capability.
 *
 * UX-I4, UX-I5 and UX-I7 constrain MODELS and PROPERTIES, not the capability registry: a model that
 * hides its purpose, a property that cannot say what established it, a presentation that fuses two
 * models into one. So `subject` is a model id, a machine id or a property id, and keeping it a
 * separate field from `ParityViolation.capability` is deliberate — a single widened `subject: string`
 * across both would let a UX-I1 violation name something that is not a declared capability, which
 * is the one thing UX-I1's whole closure check is for.
 *
 * The checkers live with the thing they check: `checkPropertyGrounding` in `properties.ts` (UX-I5
 * reads an evaluated property), `checkPurposeVisibility` and `checkModelPlurality` in
 * `ui/invariants.ts` (UX-I4 and UX-I7 read the human presentation, which is what they constrain).
 * Only the shape is shared, and it is shared from here because this is where "the invariants, as
 * functions" already lives.
 */
export interface UxViolation {
  readonly invariant: "UX-I4" | "UX-I5" | "UX-I7";
  readonly subject: string;
  readonly problem: string;
}

const anyWired = (as: readonly Affordance[]): boolean => as.some((a) => a.status === "wired");

/**
 * UX-I1 — every capability has a wired affordance on BOTH sides, over the same service.
 *
 * Returns violations rather than throwing, so a caller can report the whole picture at once and a
 * test can assert against a known set while the product is incomplete.
 */
export function checkAffordanceParity(
  registry: readonly Capability[] = CAPABILITIES,
  hatches: readonly EscapeHatch[] = ESCAPE_HATCHES,
): readonly ParityViolation[] {
  const out: ParityViolation[] = [];
  for (const c of registry) {
    if (!anyWired(c.human)) {
      out.push({
        invariant: "UX-I1", capability: c.id,
        problem: `no wired HUMAN affordance (${c.human.map((a) => `${a.at}: ${a.status}`).join("; ") || "none declared"})`,
      });
    }
    if (!anyWired(c.machine)) {
      out.push({
        invariant: "UX-I1", capability: c.id,
        problem: `no wired MACHINE affordance (${c.machine.map((a) => `${a.at}: ${a.status}`).join("; ") || "none declared"})`,
      });
    }
    if (c.service.trim() === "") {
      out.push({ invariant: "UX-I1", capability: c.id, problem: "names no application service" });
    }
  }
  // G1's amended reading, folded into the same list rather than gated separately. One invariant,
  // one count, one threshold — the lesson `PARITY_VIOLATION_CEILING` below was written for: a
  // second implementation of UX-I1 with its own definition of passing failed two pushes at a gate
  // that had never gone red locally.
  out.push(...checkNavPaths(registry));
  out.push(...checkEscapeHatchFence(registry, hatches));
  return out;
}

/**
 * The fence, as a check: a declared hatch is **not** also a capability affordance.
 *
 * The ruling's first obligation — *"the console's exclusion must be declared where the registry can
 * see it, not merely asserted in prose"* — is discharged by `ESCAPE_HATCHES` existing. This is the
 * half that keeps it from rotting: a declaration that is ALSO a capability affordance declares
 * nothing, because the capability's own machine list would put the site right back inside the
 * semantic interface while the hatch list claimed it was outside. "Every machine site is in exactly
 * one list" is the property, and both halves of it have teeth — this function holds disjointness,
 * `checkRegistryClosure` holds exhaustiveness over the sites a live surface actually presents.
 *
 * It runs inside `checkAffordanceParity`, which means the 0-violation gate (`npm run check:parity`)
 * is what goes red. That placement is deliberate and it is the `PARITY_VIOLATION_CEILING` lesson
 * applied forwards: a fence checked only by a node test would be a second definition of passing,
 * with the blocking gate green while the invariant was broken.
 *
 * The violation is reported against the capability that WRONGLY CLAIMS the site, rather than
 * against a filler id, because that is the row an author has to edit.
 */
export function checkEscapeHatchFence(
  registry: readonly Capability[] = CAPABILITIES,
  hatches: readonly EscapeHatch[] = ESCAPE_HATCHES,
): readonly ParityViolation[] {
  const out: ParityViolation[] = [];
  for (const h of hatches) {
    for (const c of registry) {
      const side = [...c.human].some((a) => a.at === h.at) ? "human"
        : [...c.machine].some((a) => a.at === h.at) ? "machine" : null;
      if (side !== null) {
        out.push({
          invariant: "UX-I1", capability: c.id,
          problem: `'${h.at}' is declared an escape hatch (fenced by ${h.fencedBy}) AND registered `
            + `as a ${side} affordance of '${c.id}'. A site inside the semantic interface is not `
            + "outside it; delete one declaration.",
        });
      }
    }
    // `fencedBy` is held by the compiler; `reason` cannot be, and a hatch with no stated reason is
    // an accident that acquired a fence rather than a decision that needed one.
    if (h.reason.trim() === "") {
      out.push({
        invariant: "UX-I1", capability: "query",
        problem: `escape hatch '${h.at}' states no reason for existing`,
      });
    }
  }
  return out;
}

/**
 * How many UX-I1 violations the gate tolerates, and the only place that number lives.
 *
 * It was in two places. `test/capabilities.test.ts` compared the violation list against a recorded
 * BASELINE — which accepted one standing violation and passed — while the publishing workflow ran an
 * inline `node --eval` asserting ZERO. One invariant, two implementations, two definitions of
 * passing, and the CI copy was logic embedded in YAML where nobody runs it. Two pushes failed at a
 * gate that had never gone red locally, because the local suite reported green against the weaker
 * claim. Neither side was wrong about the invariant; they disagreed about the threshold, which is a
 * thing only one of them can own.
 */
const PARITY_VIOLATION_CEILING = 0;

/** The UX-I1 gate's whole output: what it found, how to say so, and whether that passes. */
export interface ParityGateVerdict {
  readonly violations: readonly ParityViolation[];
  /** One line naming the invariant and the count — what a red build's reader needs first. */
  readonly headline: string;
  readonly passed: boolean;
}

/**
 * UX-I1 as a GATE: the violations plus the verdict on them.
 *
 * `checkAffordanceParity` reports; this decides. The split matters because several callers want the
 * report and must not each invent a verdict — `describe()` publishes the gaps to an agent, the
 * registry tests assert WHICH capabilities are one-sided and in which direction, and the baseline
 * lists record a declared-before-buildable gap. Only two callers need the pass/fail bit: the unit
 * suite and the publishing workflow, and they now read it from here.
 */
export function affordanceParityGate(
  registry: readonly Capability[] = CAPABILITIES,
  hatches: readonly EscapeHatch[] = ESCAPE_HATCHES,
): ParityGateVerdict {
  const violations = checkAffordanceParity(registry, hatches);
  return {
    violations,
    headline: `UX-I1: ${violations.length} violation(s) over ${registry.length} capabilities`,
    passed: violations.length <= PARITY_VIOLATION_CEILING,
  };
}

/**
 * Every human affordance that claims an element, with the element it claims.
 *
 * The binder in `ui/affordances.ts` walks this to stamp the DOM, and both tiers walk it to check
 * the stamping — so the site→element map has exactly one reader-visible home.
 */
export function boundHumanAffordances(
  registry: readonly Capability[] = CAPABILITIES,
): readonly BoundAffordance[] {
  return registry.flatMap((c) => c.human.filter((a): a is BoundAffordance => a.status !== "absent"));
}

/**
 * Every wired human affordance that declares a walked path, with the element and the route.
 *
 * The browser tier's generated drive reads THIS and nothing else — no hand-written list of routes
 * beside the registry's, which is the F-3 defect one layer out. `WIRED_WITHOUT_A_WALKED_PATH` is
 * excluded, so the drive's count is the count rung 3 asserts.
 */
export function navPaths(
  registry: readonly Capability[] = CAPABILITIES,
): readonly { readonly at: string; readonly element: AffordanceElement; readonly path: readonly NavStep[] }[] {
  const seen = new Set<string>();
  const out: { at: string; element: AffordanceElement; path: readonly NavStep[] }[] = [];
  for (const a of registry.flatMap((c) => c.human)) {
    if (a.status !== "wired") continue;
    // One route per SITE, not per capability row. `header.run-all` is an affordance of both `query`
    // and `analyze`; it is one button and walking it twice would inflate rung 3's count.
    if (seen.has(a.at)) continue;
    seen.add(a.at);
    out.push({ at: a.at, element: a.element, path: a.path });
  }
  return out;
}

/**
 * G1's static rung: every wired human affordance declares a walkable route, or says it cannot.
 *
 * `DESIGN-shell-261002.md` §2.3 rung 1, less the surface-closure half — that one needs the shell's
 * SURFACES table, which is a VALUE in `src/ui/`, and importing it here would invert the layering
 * §9a settled. The closure check runs in `test/capabilities.test.ts`, which may import both.
 *
 * Reported as UX-I1 violations, not a new invariant number: G1 amends UX-I1's reading of "human
 * affordance" rather than adding a claim beside it, so a path-less wired site IS a parity failure.
 * Keeping it under UX-I1 also means the one gate the default run and CI both invoke covers it.
 */
export function checkNavPaths(
  registry: readonly Capability[] = CAPABILITIES,
): readonly ParityViolation[] {
  const out: ParityViolation[] = [];
  const excused = new Set(WIRED_WITHOUT_A_WALKED_PATH.map((e) => e.at));
  const declared = new Map<string, string>();

  // The "wired and declares no path" branch is GONE, and its absence is the hard flip. It was this
  // function's first check for one wave; `BoundAffordance.path` is now required, so the state it
  // reported cannot be written — the compiler rejects it at the declaration instead of this gate
  // reporting it at the end. A check whose condition the type system has made unreachable is dead
  // code that reads like defence, which is worse than no check at all.
  for (const c of registry) {
    for (const a of c.human) {
      if (a.status !== "wired") continue;
      // Two rows naming one button must agree about how to reach it. They are the same element, so
      // a disagreement is two answers to one question and the drive would walk an arbitrary one.
      const prior = declared.get(a.at);
      const spelling = JSON.stringify(a.path);
      if (prior !== undefined && prior !== spelling) {
        out.push({
          invariant: "UX-I1", capability: c.id,
          problem: `human affordance '${a.at}' declares two different paths across capability rows`,
        });
      }
      declared.set(a.at, spelling);

      // A `read` step ends the route: reading a readout is the arrival, so a step after it would
      // describe an act on something the declaration just called not-a-control.
      const readAt = a.path.findIndex((s) => s.via === "read");
      if (readAt !== -1 && readAt !== a.path.length - 1) {
        out.push({
          invariant: "UX-I1", capability: c.id,
          problem: `human affordance '${a.at}' takes a step after a 'read' step; reading is the arrival`,
        });
      }
      if (a.path.length === 0 && excused.has(a.at)) {
        out.push({
          invariant: "UX-I1", capability: c.id,
          problem: `human affordance '${a.at}' both declares a path and is excused from declaring one`,
        });
      }
    }
  }

  // The other direction: an excuse for a site that is not a wired human affordance is an excuse for
  // nothing, and it would hide a real violation the day the site came back wired.
  const wiredSites = new Set(
    registry.flatMap((c) => c.human).filter((a) => a.status === "wired").map((a) => a.at),
  );
  for (const e of WIRED_WITHOUT_A_WALKED_PATH) {
    out.push({
      invariant: "UX-I1", capability: "inspect",
      problem: `WIRED_WITHOUT_A_WALKED_PATH names '${e.at}', and the list is drained — every wired `
        + "human affordance declares a path, so an excuse is an affordance removed from the "
        + `drive's coverage. ${wiredSites.has(e.at) ? "Delete the entry." : "The site is not even a wired human affordance."}`,
    });
  }
  return out;
}

/**
 * The §26 CI assertions, both directions.
 *
 * A capability without an affordance is the obvious failure. An affordance without a capability is
 * the one that catches drift: a button or an API method that reaches the model without being a
 * declared semantic capability is exactly how a UI-only or agent-only path appears.
 *
 * For two waves both callers passed literals, so the real page's control set was never the input
 * and this function could only ever confirm the test's own arithmetic (F-3). The browser tier now
 * collects `data-affordance` off the served page and passes THAT, which is what makes the
 * unregistered-site direction mean something.
 *
 * **A machine site is legal if it is registered to a capability OR declared an escape hatch**, and
 * the hatch list is the second input for exactly that reason. Without it, fencing the SPARQL
 * console would have made the console an unregistered machine site — so the only two ways to pass
 * would have been to put it back inside the semantic interface, or to stop enumerating machine
 * sites at all. "Outside the semantic interface" has to be a thing the closure check can be TOLD,
 * or it is a thing the closure check reports as drift.
 */
export function checkRegistryClosure(
  declaredHumanSites: readonly string[],
  declaredMachineSites: readonly string[],
  registry: readonly Capability[] = CAPABILITIES,
  hatches: readonly EscapeHatch[] = ESCAPE_HATCHES,
): readonly ParityViolation[] {
  const out: ParityViolation[] = [];
  const known = (pick: (c: Capability) => readonly Affordance[]): Set<string> =>
    new Set(registry.flatMap((c) => pick(c).map((a) => a.at)));

  const humanKnown = known((c) => c.human);
  for (const site of declaredHumanSites) {
    if (!humanKnown.has(site)) {
      out.push({
        invariant: "UX-I1", capability: "inspect",
        problem: `human affordance '${site}' reaches the model but is not registered to any capability`,
      });
    }
  }
  const machineKnown = known((c) => c.machine);
  const hatchSites = new Set(hatches.map((h) => h.at));
  for (const site of declaredMachineSites) {
    if (!machineKnown.has(site) && !hatchSites.has(site)) {
      out.push({
        invariant: "UX-I1", capability: "inspect",
        problem: `machine site '${site}' reaches the model but is neither registered to a `
          + "capability nor declared an escape hatch",
      });
    }
  }
  out.push(...checkEscapeHatchFence(registry, hatches));
  return out;
}

/** An entity id from a service name: the dots a service path carries are not id syntax here. */
const serviceEntity = (service: string): string => `service.${service.replace(/\./g, "-")}`;

/**
 * A query `name`, as a YAML scalar.
 *
 * `JSON.stringify`, because a summary may contain `": "` — a mapping indicator that would make the
 * emitted file unparseable — and a JSON string is a valid YAML double-quoted scalar. The same reason
 * the entity labels above are emitted this way.
 */
const queryName = (text: string): string => JSON.stringify(text);

/**
 * The affordance model, generated from the registry (§21).
 *
 * Generated rather than hand-maintained, because a hand-written copy is a second source of truth
 * that drifts — the failure the registry exists to prevent. Emitting a `.mage.yaml` means the
 * workbench's own architecture is queryable in the workbench, which is the dogfooding claim made
 * real rather than asserted.
 *
 * ## Why it emits QUERIES, and what they are for
 *
 * It did not, for its first two days, and an audit named the consequence exactly: forty-four
 * entities, eighty-one edges, and nothing that could be refuted. A projection with no assertion is
 * held to its generator by the staleness gate and to nothing else, so the model could be read as a
 * claim about the product while making none.
 *
 * The queries below are that model's own voice. One per capability per interface, plus one per
 * capability for the service it routes through — the three conjuncts of the question the model's
 * `purpose` already declares ("both a human and a machine affordance over the same application
 * service") — and two controls. `test/model-coverage.test.ts` evaluates every one of them through
 * the engine on every run, so a capability that loses an affordance now changes what this file
 * ASSERTS and not merely what it describes.
 *
 * **It does not move UX-I1's authority.** `npm run check:parity` reads the registry directly, holds
 * the violation count under `PARITY_VIOLATION_CEILING`, and fails the publishing workflow. That stays
 * where it is, and it is the gate that decides whether a one-sided capability may ship. What the
 * model adds is a second, independent reading of the same fact through the IR — so a generator bug
 * that emitted the wrong edge would be caught by the query that disagrees with it, which the
 * registry-side gate cannot see because it never looks at the emitted file.
 *
 * **An `expect` here RECORDS the registry's state; it does not endorse it.** A capability with no
 * wired human affordance emits `expect: refuted` for that interface, because that is what the model
 * then says, and a model whose assertions contradicted its own content would be unusable. The
 * judgement that `refuted` is a VIOLATION lives in `checkAffordanceParity` above. Both are true at
 * once and they are different claims.
 *
 * **`direct`, not `predecessors`.** The sibling generator (`scripts/gen-example-coverage.ts`) asks
 * `predecessors` of a capability, and that is right there: each capability is its own query's target,
 * so one witness answers one question. Here the shared node is the INTERFACE — twenty-six
 * capabilities point at `human-interface` — so `predecessors` of `human-interface` would be satisfied
 * by any single surviving edge and would report full coverage of a one-capability surface. That is
 * the vacuous pass the components model keeps a positive control against. `direct` with both
 * endpoints named asks about one capability and one interface, and it is single-hop, so
 * `afforded-by`'s `composition.path: forbidden` does not refuse it.
 */
export function generateAffordanceModel(registry: readonly Capability[] = CAPABILITIES): string {
  const lines: string[] = [
    "# GENERATED from src/app/capabilities.ts by `npm run affordances`. Do not hand-edit:",
    "# the registry is the single source of truth, and a hand-written copy would be the second",
    "# source of truth this model exists to make impossible.",
    "",
    "mage: 1",
    "",
    "system:",
    "  id: mage-workbench-affordances",
    "  name: MAGE Workbench interface affordances",
    "",
    "relation-types:",
    "",
    "  afforded-by:",
    "    description: The capability can be invoked through this interface.",
    "    absence: >",
    "      The capability is NOT reachable through that interface. For a semantic capability this is a",
    "      UX-I1 violation, not a design choice.",
    "    composition:",
    "      path: forbidden",
    "    properties:",
    "      symmetric: false",
    "",
    "  implemented-by:",
    "    description: The capability resolves to this one application service.",
    "    absence: No service is named, so the two interfaces cannot be shown to converge.",
    "    composition:",
    "      path: forbidden",
    "",
    "entities:",
    "",
    "  human-interface:",
    "    type: interface",
    "    label: Human interface",
    "",
    "  machine-interface:",
    "    type: interface",
    "    label: Machine interface (window.mage)",
    "",
  ];

  const services = [...new Set(registry.map((c) => c.service))].sort();
  for (const svc of services) {
    lines.push(`  ${serviceEntity(svc)}:`, "    type: application-service",
      // JSON.stringify, because a label may contain ": " -- a YAML mapping indicator that would
      // make the emitted file unparseable. JSON strings are valid YAML double-quoted scalars.
      `    label: ${JSON.stringify(svc)}`, "");
  }
  for (const c of registry) {
    lines.push(`  ${c.id}:`, "    type: semantic-capability", `    label: ${JSON.stringify(c.summary)}`,
      "    properties:",
      `      human: ${anyWired(c.human) ? "wired" : "not-wired"}`,
      `      machine: ${anyWired(c.machine) ? "wired" : "not-wired"}`, "");
  }

  lines.push("models:", "", "  affordances:", "    type: graph",
    "    label: Interface affordances", "    purpose:", "      question: >",
    "        Does every supported semantic capability have both a human and a machine affordance",
    "        over the same application service?",
    "      represents: [semantic capability, interface, application service, afforded-by, implemented-by]",
    "      omits: [individual buttons, keyboard shortcuts, visual layout, pointer gestures]",
    "    entities:");
  for (const e of ["human-interface", "machine-interface",
    ...services.map(serviceEntity), ...registry.map((c) => c.id)]) {
    lines.push(`      - ${e}`);
  }
  lines.push("    relations:");
  for (const c of registry) {
    if (anyWired(c.human)) {
      lines.push(`      - { from: ${c.id}, to: human-interface, type: afforded-by }`);
    }
    if (anyWired(c.machine)) {
      lines.push(`      - { from: ${c.id}, to: machine-interface, type: afforded-by }`);
    }
    lines.push(`      - { from: ${c.id}, to: ${serviceEntity(c.service)}, type: implemented-by }`);
  }

  // One assertion per capability per interface, one per capability for the service it routes
  // through, and two controls. `expect` makes a saved query an ASSERTION: `test/model-coverage.test.ts`
  // evaluates every one through the engine, so a registry change that reaches this file changes what
  // the model CLAIMS rather than only what it describes. See generateAffordanceModel's doc comment
  // for why these are `direct` rather than `predecessors`, and for what UX-I1 authority this does and
  // does not carry.
  lines.push("",
    "# The model's own assertions. One per capability per interface, one per capability for the",
    "# application service it routes through -- the three conjuncts of the purpose question above --",
    "# plus a refutation control and a refusal control. GENERATED with everything else: an assertion",
    "# someone could edit without touching the registry would be the second source of truth again.",
    "#",
    "# `expect` RECORDS what the registry says. A capability with no wired affordance emits",
    "# `expect: refuted` for that interface, because that is then what this model says; the judgement",
    "# that `refuted` is a UX-I1 VIOLATION belongs to `npm run check:parity`, which reads the registry",
    "# directly and fails the build. Two different claims, both true at once.",
    "queries:",
    "");

  for (const c of registry) {
    for (const side of [
      { key: "human", entity: "human-interface", label: "human interface", wired: anyWired(c.human) },
      { key: "machine", entity: "machine-interface", label: "machine interface (window.mage)", wired: anyWired(c.machine) },
    ]) {
      lines.push(
        `  afforded-by.${side.key}.${c.id}:`,
        `    name: ${queryName(`${c.summary} is reachable through the ${side.label} -- ${c.id}`)}`,
        "    kind: graph",
        "    quantifier: exists",
        `    expect: ${side.wired ? "holds" : "refuted"}`,
        "    graph:",
        "      form: direct",
        "      relation: afforded-by",
        `      from: ${c.id}`,
        `      to: ${side.entity}`,
        "");
    }
    lines.push(
      `  implemented-by.${c.id}:`,
      `    name: ${queryName(`${c.id} resolves to the ${c.service} service both interfaces invoke`)}`,
      "    kind: graph",
      "    quantifier: exists",
      "    expect: holds",
      "    graph:",
      "      form: direct",
      "      relation: implemented-by",
      `      from: ${c.id}`,
      `      to: ${serviceEntity(c.service)}`,
      "");
  }

  // The refutation control. Every assertion above that a wired capability generates is a `holds`, and
  // a `holds` is carried by a witness -- so an adjacency bug that answered `holds` for any pair at
  // all would satisfy all fifty-two of them and look like full parity. This pair is deliberately
  // unrelated: one interface does not afford the other, and nothing in the registry can ever draw
  // that edge. It is the counterpart of `ui-can-reach-kernel` in the components model, inverted.
  lines.push(
    "  control.interfaces-do-not-afford-each-other:",
    `    name: ${queryName("CONTROL: the human interface is afforded by the machine interface")}`,
    "    kind: graph",
    "    quantifier: exists",
    "    expect: refuted",
    "    graph:",
    "      form: direct",
    "      relation: afforded-by",
    "      from: human-interface",
    "      to: machine-interface",
    "");

  // The refusal control. `afforded-by` declares `composition.path: forbidden` and the prose above it
  // explains what a missing edge means -- both are inert claims unless something asks a multi-hop
  // question and is refused. `from` is the registry's first capability, so this tracks the registry
  // rather than naming a capability that could be deleted out from under it.
  const first = registry[0];
  if (first !== undefined) {
    lines.push(
      "  control.afforded-by-does-not-compose:",
      `    name: ${queryName(`CONTROL: ${first.id} reaches the machine interface through a chain of afforded-by edges`)}`,
      "    kind: graph",
      "    quantifier: exists",
      "    expect: unlicensed",
      "    graph:",
      "      form: reachability",
      "      relation: afforded-by",
      `      from: ${first.id}`,
      "      to: machine-interface",
      "");
  }

  return lines.join("\n");
}
