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

/** Every public semantic capability. The list is closed; adding one is a deliberate act. */
export type CapabilityId =
  | "create-model" | "delete-model"
  | "create-element" | "delete-element"
  | "create-relation" | "delete-relation"
  | "edit-property"
  | "inspect"
  | "validate"
  | "query" | "analyze" | "explore-space" | "inspect-evidence"
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

export interface Capability {
  readonly id: CapabilityId;
  /** What it does, in the user's terms. Shown by `describe()`. */
  readonly summary: string;
  /**
   * The ONE application service both sides invoke. UX-I1's "same underlying service" is checked by
   * comparing this string, so it must name a real seam, not a category.
   */
  readonly service: string;
  readonly human: readonly Affordance[];
  readonly machine: readonly Affordance[];
  /** Does invoking this produce a semantic RESULT that UX-I2 governs? */
  readonly producesEvidence: boolean;
}

const wired = (at: string): Affordance => ({ at, status: "wired" });

/**
 * The registry. Reflects what is actually built as of 261002.
 *
 * **UX-I1 reports one violation, and the violation is the registry working.** Twenty-four
 * capabilities are wired on both sides; the twenty-fifth, `explore-space`, has a machine affordance
 * and no human one, so the gate names it. The alternative on the table was to fold exploration of
 * the configuration space into `analyze` — which would have left the count at zero, because
 * `analyze` has a wired human affordance for a different reason. That is the worst of the three
 * outcomes: not a gap, not a declared gap, but a gap laundered through a row that is green on other
 * business.
 *
 * The honest zero is the one nobody is holding up. This one would have been.
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
    human: [wired("header.file-input"), wired("header.new-system")],
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
    human: [wired("start.load-example")],
    machine: [wired("window.mage.loadExample"), wired("window.mage.examples")],
    producesEvidence: false,
  },
  {
    id: "export",
    summary: "Write the model system back out, comments and key order preserved.",
    service: "workspace.export",
    human: [wired("header.export")],
    machine: [wired("window.mage.export")],
    producesEvidence: false,
  },
  {
    id: "inspect",
    summary: "Read every modelled fact: entities, relations, machines, purpose, omissions.",
    service: "workspace.state",
    human: [wired("model-section.tables")],
    machine: [wired("window.mage.inspect")],
    producesEvidence: false,
  },
  {
    id: "validate",
    summary: "Report findings against the numbered rules V1-V26.",
    service: "validator.validate",
    human: [wired("validation-section.table")],
    machine: [wired("window.mage.context.findings")],
    producesEvidence: true,
  },
  {
    id: "query",
    summary: "Run one graph, behavioural or SPARQL query and return outcome, coverage and evidence.",
    service: "workspace.query",
    // `properties-section.ask` is the §10.1 requirement: a person asks a supported question through
    // structured controls, without writing a query document. It is a second affordance of `query`
    // rather than a capability of its own because it ends at the same `workspace.query` an agent
    // calls -- the controls narrow what can be ASKED, they do not add a way to answer.
    human: [wired("header.run-all"), wired("properties-section.ask")],
    // `ask` is the grounded twin of `query`: the same service, returning the verdict WITH the models
    // it derives from. Two machine affordances rather than a changed return type, because `query`'s
    // `QueryResult` is the published wire shape and widening it would break every reader of it.
    //
    // `window.mage.sparql` is the third, and it is this row's rather than its own capability —
    // DESIGN-sparql-261002.md §6 Q9's first reading, implemented. `query` is the capability and
    // SPARQL is a syntax for it: §11 says a student normally does not write SPARQL, an agent
    // translates the question into it, and both spellings ask one thing of one system and get an
    // answer carrying coverage and the hash it describes. §1's answer-path table is then a routing
    // rule INSIDE the capability — a binding set to the SPARQL evaluator, a path witness and
    // anything behavioral to the engine — which is why a second row would report a capability the
    // product did not gain, exactly as `analysis` reports no row for running a query off-thread.
    //
    // Two costs, stated rather than discovered later. **The suggested-question set bounds what a
    // person can ask while an agent is unbounded**: `properties-section.ask` offers the supported
    // forms, so a person asks a relational question but not an ARBITRARY one. That asymmetry is the
    // same decision as having no raw YAML editor, and it is a decision, not an oversight — the
    // author still owns Q9's ruling, and if they rule otherwise what changes is this row, not the
    // wiring. **And `service` names the capability's canonical seam, not each affordance's
    // function**: `window.mage.sparql` ends at `workspace.sparql`, as `window.mage.ask` already
    // ends at `workspace.evaluate` and `header.run-all` at `workspace.runSavedQueries`. A human
    // SPARQL console is deliberately NOT added to buy a tidier row: an accurate affordance beats a
    // control nobody asked for.
    //
    // `window.mage.analysis.resolveExhausted` is the fourth, and it is this row's for the same
    // reason `sparql` is: it re-asks a question the caller already asked, with the Worker's budget
    // instead of the interactive one, and hands back the same four arms. A bound is not a capability
    // — a second row would report that the workbench gained the ability to answer something, when
    // what it gained was permission to spend longer on the same question.
    //
    // It is machine-only, and that is inside the asymmetry this row already declares rather than a
    // new one: the escalation handle comes from an `exhausted` SPARQL answer, and a person cannot
    // write SPARQL here. `properties-section.ask` offers the supported forms, which are the forms
    // that do not exhaust. A human control for escalating would need a human way to exhaust first.
    machine: [
      wired("window.mage.query"), wired("window.mage.ask"), wired("window.mage.sparql"),
      wired("window.mage.analysis.resolveExhausted"),
    ],
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
    human: [wired("header.run-all"), wired("properties-section.list")],
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
    // ---- and what the row costs, stated rather than discovered -----------------------------------
    //
    // No human control reaches it, so UX-I1 reports this capability and the count is no longer zero.
    // That is the registry doing its job. The page composes the Worker port and the facade offers
    // `explore()`; nothing in the UI calls it, and `ports.engine.explore` returns no configurations
    // on purpose rather than fabricating a space. Wiring a control is a UI change in another file.
    //
    // The alternative was to leave the row out and keep the zero. A count that reads zero because
    // something is missing from the census is worse than one that reads one: the first is unfalsifiable
    // and the second is a work item. This project has twice chosen an accurate violation over a
    // comfortable number — `create-model`, `delete-model` and `add-note` were declared before they
    // were buildable — and each time the violation named the work that closed it.
    human: [{
      at: "analysis-section.explore",
      status: "absent",
      note: "no human control walks the configuration space. The facade offers `explore()` and the "
        + "page wires the Worker port, but nothing in the UI calls it, so a person reads a state "
        + "count only as the coverage line of a behavioural query they asked for another reason. "
        + "Closing this is a control that calls `workspace.explore` and renders the SpaceSummary.",
    }],
    machine: [wired("window.mage.analysis.explore")],
    producesEvidence: true,
  },
  {
    id: "inspect-evidence",
    summary: "Read a witness, counterexample or lasso as ordered steps.",
    service: "workspace.query",
    human: [wired("properties-section.evidence-list")],
    machine: [wired("window.mage.evidence")],
    producesEvidence: true,
  },
  {
    id: "undo",
    summary: "Return to the previous semantic revision.",
    service: "workspace.undo",
    human: [wired("header.undo")],
    machine: [wired("window.mage.undo")],
    producesEvidence: false,
  },
  {
    id: "redo",
    summary: "Re-apply an undone revision.",
    service: "workspace.redo",
    human: [wired("header.redo")],
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
    human: [wired("edit-section.add-entity"), wired("edit-section.add-state")],
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
    human: [wired("edit-section.delete-element")],
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
    human: [wired("edit-section.add-relation")],
    machine: [wired("window.mage.transact")],
    producesEvidence: false,
  },
  {
    id: "delete-relation",
    summary: "Remove a relation.",
    service: "transactions.apply",
    human: [wired("edit-section.delete-relation")],
    machine: [wired("window.mage.transact")],
    producesEvidence: false,
  },
  {
    id: "edit-property",
    summary: "Change a property or label through the same transaction any other edit uses.",
    service: "transactions.apply",
    human: [wired("edit-section.set-label"), wired("edit-section.set-property")],
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
    human: [wired("edit-section.add-model")],
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
    human: [wired("edit-section.delete-model")],
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
    human: [wired("edit-section.add-note")],
    machine: [wired("window.mage.transact")],
    producesEvidence: false,
  },
  // ---- properties. The question is semantic; the verdict is not, and is stored nowhere. --------
  //
  // "Property" is overloaded in this workbench and the two meanings sit three entries apart, so:
  // `edit-property` changes an ENTITY ATTRIBUTE (`classification: RESTRICTED`); these two save and
  // retract an ENGINEERING CLAIM about the system (§3.3, "Publication requires validation"). Only
  // the second meaning is a persistent proposition with a verdict.

  {
    id: "save-property",
    summary: "Keep a question as a persistent proposition, re-evaluated on every later revision.",
    service: "transactions.apply",
    // §10.3 is explicit that what is saved is the proposition's SEMANTICS and not the displayed
    // answer, so this writes the query and nothing else: one `save-query` op, no verdict field to
    // write it into, and the status is recomputed from the query the next time anyone looks. That
    // is V18's rule for derived values, and the reason there is no `set-status` op to pair with it.
    //
    // The form and the agent send the same operation, and the human form builds its query with the
    // same function that built the one it just ran — so the property a person saves has the
    // semantics of the result they were looking at rather than a re-typed approximation of it.
    human: [wired("properties-section.save")],
    machine: [wired("window.mage.transact")],
    producesEvidence: false,
  },
  {
    id: "retract-property",
    summary: "Stop evaluating a proposition, without pretending it was never claimed.",
    service: "transactions.apply",
    // The pair of the one above. A claim you cannot withdraw is a claim the model system cannot
    // stop asserting, and `delete-query` already existed with no way for a person to reach it.
    human: [wired("properties-section.retract")],
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
    // It gets a prominent section rather than a row in the inspector's detail column because the
    // `prompt` is the field that earns the feature: with an agent-authored model it answers why the
    // object has this shape, which reading the object cannot. A prompt nobody finds is a prompt
    // nobody reads.
    human: [wired("provenance-section.records")],
    machine: [wired("window.mage.provenance")],
    producesEvidence: false,
  },

  // ---- the hypothesis bar. Opening one routes through the SAME validated transaction path. -----

  {
    id: "create-hypothesis",
    summary: "Open a what-if branch through the same validated transaction path as any edit.",
    service: "workspace.openHypothesis",
    // The editing forms choose the branch; there is no separate what-if mechanism, because a
    // second mutation path is where the bugs would live.
    human: [wired("edit-section.hypothesis-target")],
    machine: [wired("window.mage.hypothesis.open")],
    producesEvidence: true,
  },
  {
    id: "commit-hypothesis",
    summary: "Accept a hypothesis as authoritative.",
    service: "workspace.applyHypothesis",
    human: [wired("hypothesis-bar.accept")],
    machine: [wired("window.mage.hypothesis.apply")],
    producesEvidence: false,
  },
  {
    id: "discard-hypothesis",
    summary: "Throw a hypothesis away; the authoritative model was never touched.",
    service: "workspace.discardHypothesis",
    human: [wired("hypothesis-bar.discard")],
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
  return out;
}

/**
 * The §26 CI assertions, both directions.
 *
 * A capability without an affordance is the obvious failure. An affordance without a capability is
 * the one that catches drift: a button or an API method that reaches the model without being a
 * declared semantic capability is exactly how a UI-only or agent-only path appears.
 */
export function checkRegistryClosure(
  declaredHumanSites: readonly string[],
  declaredMachineSites: readonly string[],
  registry: readonly Capability[] = CAPABILITIES,
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
  for (const site of declaredMachineSites) {
    if (!machineKnown.has(site)) {
      out.push({
        invariant: "UX-I1", capability: "inspect",
        problem: `machine affordance '${site}' reaches the model but is not registered to any capability`,
      });
    }
  }
  return out;
}

/**
 * The affordance model, generated from the registry (§21).
 *
 * Generated rather than hand-maintained, because a hand-written copy is a second source of truth
 * that drifts — the failure the registry exists to prevent. Emitting a `.mage.yaml` means the
 * workbench's own architecture is queryable in the workbench, which is the dogfooding claim made
 * real rather than asserted.
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
    lines.push(`  service.${svc.replace(/\./g, "-")}:`, "    type: application-service",
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
    ...services.map((s) => `service.${s.replace(/\./g, "-")}`), ...registry.map((c) => c.id)]) {
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
    lines.push(`      - { from: ${c.id}, to: service.${c.service.replace(/\./g, "-")}, type: implemented-by }`);
  }
  lines.push("");
  return lines.join("\n");
}
