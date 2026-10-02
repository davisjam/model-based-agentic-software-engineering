// The capability registry and the UX invariants it enforces.
//
// UX-I1 now reports nothing over 22 capabilities. The baselines below are therefore EMPTY, and the
// assertion is no longer aspirational: it earned the right to read zero by starting at twelve,
// dropping to six, and being driven down by the work each violation named.
//
// An empty baseline alone would be a weak test — a registry with no capabilities at all would pass
// it. `FULLY_WIRED` is the positive control that closes that hole: every capability must be PRESENT
// and wired on both sides, so deleting one to silence a violation fails here instead.
//
// And a hole both of those leave open, which the §20 coverage test at the end closes: a capability
// the registry never DECLARES cannot violate UX-I1. `load-example` and `inspect-provenance` sat in
// the specification's capability table for two waves while the gate read zero, because the gate can
// only check rows it has been told about. The specification is now the list.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CAPABILITIES, checkAffordanceParity, checkRegistryClosure, generateAffordanceModel,
} from "../src/app/capabilities.ts";
import type { Affordance, CapabilityId } from "../src/app/capabilities.ts";
import { ExampleCatalog } from "../src/app/examples.ts";

/**
 * Capabilities with NO wired human affordance. Empty, and it took three waves to get there.
 *
 * The last three — create-model, delete-model, add-note — were not a UI gap. Each also had no
 * MACHINE affordance, and that identity was the diagnosis: the transaction schema had no op for
 * adding a model, deleting one or attaching a note, so there was nothing to bind on either side.
 * Adding the three ops is what made the controls possible, in that order.
 */
const NO_HUMAN: readonly CapabilityId[] = [];

/** Identical to NO_HUMAN, and that identity still carries the claim: no gap is one-sided. */
const NO_MACHINE: readonly CapabilityId[] = [];

/**
 * Every capability, asserted present AND wired on both sides.
 *
 * An empty baseline on its own is a weak test: a capability DELETED from the registry also
 * disappears from the violation list, so silence can mean "fixed" or "removed". This list names all
 * twenty-four, so removing one to quieten UX-I1 fails here. The last two are the ones this change
 * wired, and they are listed with the rest rather than kept apart — a capability wired two waves
 * ago needs guarding just as much.
 */
const FULLY_WIRED: readonly CapabilityId[] = [
  "import", "export", "inspect", "validate", "query", "analyze", "inspect-evidence", "undo", "redo",
  "create-element", "delete-element", "create-relation", "delete-relation", "edit-property",
  "create-hypothesis", "commit-hypothesis", "discard-hypothesis",
  "create-model", "delete-model", "add-note",
  "load-example", "inspect-provenance",
  // Saving a query's result as a persistent proposition, and retracting one. §23's scenario ends
  // with the first of these, and `delete-query` existed with no way for a person to reach it.
  "save-property", "retract-property",
];

test("UX-I1 violations match the recorded baseline exactly", () => {
  const violations = checkAffordanceParity();
  const human = violations.filter((v) => v.problem.includes("HUMAN")).map((v) => v.capability).sort();
  const machine = violations.filter((v) => v.problem.includes("MACHINE")).map((v) => v.capability).sort();

  assert.deepEqual(human, [...NO_HUMAN].sort(),
    "a capability gained or lost a human affordance; update NO_HUMAN deliberately");
  assert.deepEqual(machine, [...NO_MACHINE].sort(),
    "a capability gained or lost a machine affordance; update NO_MACHINE deliberately");
  // Stated outright, now that it is true: no capability is reachable through one interface only,
  // and none of the twenty fails for want of a named service.
  assert.deepEqual(violations, [],
    `UX-I1: ${violations.map((v) => `${v.capability} ${v.problem}`).join("; ")}`);
});

test("no capability is reachable by an agent but not by a person", () => {
  // The asymmetry UX-I1 exists to catch, asserted directly rather than inferred from two lists.
  // A capability with a machine affordance and no human one means an agent can make a change the
  // user can neither see the control for nor reverse by hand.
  const violations = checkAffordanceParity();
  const noHuman = new Set(violations.filter((v) => v.problem.includes("HUMAN")).map((v) => v.capability));
  const noMachine = new Set(violations.filter((v) => v.problem.includes("MACHINE")).map((v) => v.capability));
  const agentOnly = [...noHuman].filter((id) => !noMachine.has(id)).sort();
  assert.deepEqual(agentOnly, [],
    `agent-only capabilities: ${agentOnly.join(", ")} — an agent can do these and a person cannot`);
});

test("every declared capability is present and wired on both sides", () => {
  const violating = new Set(checkAffordanceParity().map((v) => v.capability));
  const declared = new Set(CAPABILITIES.map((c) => c.id));
  for (const id of FULLY_WIRED) {
    assert.ok(declared.has(id), `${id} is no longer in the registry; the baseline cannot vouch for it`);
    assert.ok(!violating.has(id), `${id} should be wired on both sides but is not`);
  }
  // Both directions: a capability ADDED to the registry and left out of this list would otherwise
  // be wired-or-not with nothing watching.
  assert.deepEqual([...declared].filter((id) => !FULLY_WIRED.includes(id)), [],
    "a new capability must be added to FULLY_WIRED, or declared as a baseline gap");
});

test("the two 'property' capabilities are not the entity-attribute one", () => {
  // "Property" is overloaded in this workbench and the two meanings sit three registry entries
  // apart: `edit-property` changes an ENTITY ATTRIBUTE, `save-property` and `retract-property`
  // keep and withdraw an ENGINEERING CLAIM. A reader who conflates them will wire a control to the
  // wrong service, so the distinction is asserted rather than left to the comment beside it.
  const byId = new Map(CAPABILITIES.map((c) => [c.id, c]));
  const attribute = byId.get("edit-property");
  assert.match(attribute?.summary ?? "", /property or label/);

  for (const id of ["save-property", "retract-property"] as const) {
    const c = byId.get(id);
    assert.ok(c, `${id} must be declared`);
    assert.equal(c.service, "transactions.apply",
      "a property is saved by the ordinary transaction seam, not a privileged one");
    assert.equal(c.producesEvidence, false,
      "saving a claim produces no evidence; EVALUATING it does, and that is `analyze`");
  }
  // And what is saved is the question: nothing in the registry promises to store a verdict.
  assert.match(byId.get("save-property")?.summary ?? "", /re-evaluated on every later revision/);
});

test("the property surfaces are reachable from both interfaces, over one service each", () => {
  // UX-I5's machine half. The property list's whole content is a semantic result, so a human-only
  // grounding would be a UX-I2 violation that UX-I1 cannot see: `analyze` would still look wired.
  const analyze = CAPABILITIES.find((c) => c.id === "analyze");
  assert.ok(analyze);
  assert.ok(analyze.machine.some((a) => a.at === "window.mage.properties"),
    "the grounded property read must have a machine affordance");
  assert.ok(analyze.human.some((a) => a.at === "properties-section.list"));

  const query = CAPABILITIES.find((c) => c.id === "query");
  assert.ok(query);
  assert.ok(query.human.some((a) => a.at === "properties-section.ask"),
    "§10.1: a person must be able to execute a query without writing one");
  assert.ok(query.machine.some((a) => a.at === "window.mage.ask"),
    "the ad-hoc answer panel shows a grounding, so a machine client must be able to read it");
  // Both affordances of `query` resolve to the one service; that is what UX-I1 checks by comparing
  // the string, and a second service here would make the two interfaces diverge invisibly.
  assert.equal(query.service, "workspace.query");
});

test("every wired affordance names ONE site, not a description of several", () => {
  // `canvas / inspector` was an absent-affordance placeholder, and a placeholder left behind on a
  // wired entry would defeat the closure check in §26, which compares these strings against the
  // sites that actually reach the model. One site means no spaces and no slashes.
  for (const c of CAPABILITIES) {
    for (const a of [...c.human, ...c.machine]) {
      if (a.status !== "wired") continue;
      assert.doesNotMatch(a.at, /[ /]/,
        `${c.id}: '${a.at}' describes several places; a wired affordance is one addressable site`);
    }
  }
});

test("every capability names exactly one application service", () => {
  // UX-I1's "both SHALL invoke the same underlying service" is only checkable if the service is
  // named. A capability with no service cannot be shown to converge, so it is a violation in itself.
  for (const c of CAPABILITIES) {
    assert.ok(c.service.length > 0, `${c.id} names no service`);
    assert.match(c.service, /^[a-z][A-Za-z]*\.[a-zA-Z]+$/, `${c.id}: service '${c.service}' should be <module>.<operation>`);
  }
});

/** An affordance is honest if it works, or says why it does not. */
const explained = (a: Affordance): boolean => a.status === "wired" || (a.note ?? "").length > 8;

test("anything not wired must explain itself", () => {
  // An unexplained gap is indistinguishable from an oversight. A note is what makes a baseline
  // reviewable rather than just long.
  for (const c of CAPABILITIES) {
    for (const a of [...c.human, ...c.machine]) {
      assert.ok(explained(a), `${c.id} affordance '${a.at}' is ${a.status} with no explanation`);
    }
  }
  // The loop above is vacuous now that nothing is unwired, so the predicate is driven directly too.
  // A check that can only pass is not a check, and this one has to still work for the next
  // capability someone declares before building it.
  assert.equal(explained({ at: "nowhere", status: "absent" }), false);
  assert.equal(explained({ at: "nowhere", status: "absent", note: "soon" }), false,
    "a token note is not an explanation");
  assert.equal(explained({ at: "window.mage.transact", status: "refusing", note: "no such op in the schema" }), true);
});

test("UX-I1 fires when a capability loses an affordance — negative control", () => {
  const broken = CAPABILITIES.map((c) =>
    c.id === "query" ? { ...c, human: [{ at: "gone", status: "absent" as const, note: "removed for the test" }] } : c);
  const v = checkAffordanceParity(broken);
  assert.ok(v.some((x) => x.capability === "query" && x.problem.includes("HUMAN")),
    "removing query's human affordance must be caught");
});

test("§26 closure: an affordance reaching the model without a capability is a violation", () => {
  // The direction that catches drift. A button or an API method that touches the model without
  // being a declared semantic capability is exactly how a UI-only or agent-only path appears.
  const clean = checkRegistryClosure(["header.export"], ["window.mage.query"]);
  assert.deepEqual(clean, [], "sites that ARE registered must not be reported");

  const drifted = checkRegistryClosure(["header.secret-button"], ["window.mage.backdoor"]);
  assert.equal(drifted.length, 2, "both unregistered sites must be caught");
  assert.ok(drifted.some((v) => v.problem.includes("header.secret-button")));
  assert.ok(drifted.some((v) => v.problem.includes("window.mage.backdoor")));
});

// ----------------------------------------------------------------------------------------------
// §20 coverage — the specification's table is the list, not this file
// ----------------------------------------------------------------------------------------------

/**
 * Rows whose capability name does not slugify to a registry id. Each needs a reason, not an entry.
 *
 * Three, and all three are the specification writing one row where the registry has one or two
 * capabilities. Nothing here may map a row to a capability that does something else — that would
 * turn this test from a gate into a rubber stamp.
 */
const ROW_ALIASES: Record<string, readonly CapabilityId[]> = {
  // The registry splits these, because undo and redo are separately reachable and separately
  // breakable: `canUndo` and `canRedo` are different bits of state and either button can rot alone.
  "Undo/redo": ["undo", "redo"],
  // Likewise. Reading a model system and writing one back are different services, and export is the
  // one that has to preserve comments and key order.
  "Import/export": ["import", "export"],
  // "Inspect model" is the registry's `inspect`. The spec names the OBJECT; the registry names the
  // act, and every other row names the act.
  "Inspect model": ["inspect"],
};

/** Capability names from the §20 table, read out of the specification. */
function specificationRows(): readonly string[] {
  const spec = readFileSync("requirements-human-ux-261002.md", "utf8");
  const header = "Capability\tHuman affordance\tMachine affordance";
  const start = spec.indexOf(header);
  assert.notEqual(start, -1, "the §20 capability table has moved; this test reads it by its header");
  const rows: string[] = [];
  for (const line of spec.slice(start + header.length).split("\n").slice(1)) {
    // The table ends at the first line that is not three tab-separated cells.
    if (line.split("\t").length !== 3) break;
    rows.push((line.split("\t")[0] ?? "").trim());
  }
  return rows;
}

/** §20 rows the registry does not declare. Takes the registry, so a control can shrink it. */
function uncoveredRows(registry: readonly CapabilityId[]): readonly string[] {
  const declared = new Set(registry);
  const out: string[] = [];
  for (const row of specificationRows()) {
    const ids = ROW_ALIASES[row] ?? [row.toLowerCase().replace(/ /g, "-") as CapabilityId];
    for (const id of ids) {
      if (!declared.has(id)) out.push(`§20 row "${row}" expects capability '${id}'`);
    }
  }
  return out;
}

test("every capability in the §20 table is declared in the registry", () => {
  // The hole UX-I1 cannot see. A capability the registry does not declare has no affordances to
  // check, so the gate reads zero violations and the capability is simply missing — which is how
  // `load-example` and `inspect-provenance` stayed unbuilt while the registry looked complete.
  // Reading the specification's own table is what turns "we think we covered it" into a check.
  const rows = specificationRows();
  assert.ok(rows.length >= 16, `read ${rows.length} rows from the §20 table; the parse is wrong`);
  assert.ok(rows.includes("Load example") && rows.includes("Inspect provenance"),
    "the two rows this wave closed must be readable from the table");

  const uncovered = uncoveredRows(CAPABILITIES.map((c) => c.id));
  assert.deepEqual(uncovered, [],
    `the §20 table names capabilities the registry does not:\n  ${uncovered.join("\n  ")}`);
});

test("§20 coverage fires on a dropped capability — negative control", () => {
  // The real predicate, against the registry this wave inherited: without `load-example` and
  // `inspect-provenance` it must report exactly those two rows. A check that could only pass is not
  // a check, and this one has to still work for the next row someone adds to the specification.
  const before = CAPABILITIES.map((c) => c.id)
    .filter((id) => id !== "load-example" && id !== "inspect-provenance");
  assert.deepEqual(uncoveredRows(before), [
    "§20 row \"Inspect provenance\" expects capability 'inspect-provenance'",
    "§20 row \"Load example\" expects capability 'load-example'",
  ], "dropping a capability must surface the specification row it leaves unanswered");
});

test("the generated affordance model is in sync with the registry", () => {
  // The model is GENERATED, so a stale committed copy is the drift the registry exists to prevent.
  // Regenerating and comparing is how the single source of truth stays single.
  const onDisk = readFileSync("models/workbench-affordances.mage.yaml", "utf8");
  assert.equal(onDisk, generateAffordanceModel(),
    "models/workbench-affordances.mage.yaml is stale — run `npm run affordances`");
});

test("the generated model declares every capability and both interfaces", () => {
  const yaml = generateAffordanceModel();
  for (const c of CAPABILITIES) {
    assert.ok(yaml.includes(`  ${c.id}:`), `${c.id} missing from the generated model`);
    assert.ok(yaml.includes(`from: ${c.id}, to: service.`), `${c.id} has no implemented-by edge`);
  }
  assert.ok(yaml.includes("human-interface:") && yaml.includes("machine-interface:"));
  // afforded-by must declare its absence meaning: a missing edge is a UX-I1 violation, not a
  // design choice, and that distinction is invisible unless the relation type says so.
  assert.match(yaml, /absence: >/);
  assert.match(yaml, /UX-I1 violation, not a design choice/);
});

test("describe() derives its operations from the registry, and reports the gaps", async () => {
  // The registry drives describe() (UX section 22). Before this, agent-api.ts hand-listed eight
  // operations while the registry held nineteen -- the second source of truth the registry exists
  // to remove, sitting in the file that advertises the API.
  const { createAgentApi } = await import("../src/app/agent-api.ts");
  const { Workspace } = await import("../src/app/services.ts");
  const { renderView } = await import("../src/render/index.ts");
  const noop = {
    engine: { graphQuery: () => { throw new Error("unused"); }, behaviorQuery: () => { throw new Error("unused"); },
      explore: () => ({ configurations: [], exhaustive: false }) },
    render: { render: renderView },
  };
  const ws = new Workspace(noop as never);
  const catalogue = new ExampleCatalog(ws, (path) => Promise.resolve(readFileSync(path, "utf8")));
  const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, catalogue);
  const d = api.describe();

  assert.equal(d.operations.length, CAPABILITIES.length,
    "describe() must report exactly the registry's capabilities");
  const names = new Set(d.operations.map((o) => o.name));
  for (const c of CAPABILITIES) assert.ok(names.has(c.id), `${c.id} missing from describe()`);

  // And it must admit where the workbench falls short of its own registry. The example in this
  // assertion has now moved twice — first `create-hypothesis`, then `add-note` — because each time
  // the gap it named got built. There is nothing left to name, so what is pinned is the DERIVATION:
  // describe() reports exactly what checkAffordanceParity() reports, whatever that is. An agent
  // reading an empty list is being told the truth rather than being told nothing.
  assert.deepEqual(d.affordanceGaps, checkAffordanceParity().map((v) => `${v.capability}: ${v.problem}`));
  assert.deepEqual(d.affordanceGaps, [],
    "no capability is one-sided, so describe() has no gap to report");
  // add-note is the surprising one, so the agent must be able to learn its A1 consequence from the
  // API rather than from a hash that did not move.
  const note = d.operations.find((o) => o.name === "add-note");
  assert.ok(note, "describe() must advertise add-note now that both interfaces can reach it");
  assert.match(note.summary, /without changing what the model asserts/);

  // The two this wave added. They are advertised because the registry declares them, not because
  // anything here lists them -- which is the derivation the test above pins, checked at the two
  // names a reader would go looking for.
  assert.ok(d.operations.some((o) => o.name === "load-example"),
    "adding the capability must advertise it, with no edit to agent-api.ts");
  assert.ok(d.operations.some((o) => o.name === "inspect-provenance"));
});
