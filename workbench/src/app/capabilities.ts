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
  | "query" | "analyze" | "inspect-evidence"
  | "create-hypothesis" | "commit-hypothesis" | "discard-hypothesis"
  | "undo" | "redo"
  | "import" | "export"
  | "load-example"
  | "add-note" | "inspect-provenance";

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
 * The registry. Reflects what is actually built as of 261002 — all twenty-two capabilities are
 * wired on both sides, and UX-I1 reports nothing.
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
 * `refusing` and `absent` now have no users. They stay in `AffordanceStatus` because the next
 * capability someone declares will need them before it needs `wired` — and because a registry that
 * can only say "finished" is not a gate.
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
    summary: "Run one graph or behavioural query and return outcome, coverage and evidence.",
    service: "workspace.query",
    human: [wired("header.run-all"), wired("questions-section")],
    machine: [wired("window.mage.query")],
    producesEvidence: true,
  },
  {
    id: "analyze",
    summary: "Re-run every saved question against the current system.",
    service: "workspace.runSavedQueries",
    human: [wired("header.run-all")],
    machine: [wired("window.mage.savedQueries")],
    producesEvidence: true,
  },
  {
    id: "inspect-evidence",
    summary: "Read a witness, counterexample or lasso as ordered steps.",
    service: "workspace.query",
    human: [wired("questions-section.evidence-list")],
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
