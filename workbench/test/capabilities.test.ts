// The capability registry and the UX invariants it enforces.
//
// UX-I1 fails on 3 of 20 capabilities, and that is the point: the registry states what is actually
// built, so the invariant names incomplete work instead of letting the workbench be described as
// finished. These tests therefore pin the violations as a BASELINE — new ones fail the build, and
// fixing one requires deleting its line here, which is a deliberate act.
//
// Asserting zero violations would be aspirational and would have to be disabled, which is how a gate
// becomes decoration.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CAPABILITIES, checkAffordanceParity, checkRegistryClosure, generateAffordanceModel,
} from "../src/app/capabilities.ts";
import type { CapabilityId } from "../src/app/capabilities.ts";

/**
 * Capabilities with NO wired human affordance, as of 261002.
 *
 * Was ten; now three, and the shape of what is left is the interesting part. Every remaining
 * failure also has no MACHINE affordance — the two lists are now identical — which means the
 * workbench no longer has a single capability an agent can reach and a person cannot. That
 * asymmetry is the one UX-I1 exists to catch, and it is gone.
 *
 * What remains is a missing OPERATION, not a missing control: the transaction schema has no
 * add-model, delete-model or add-note op, so there is nothing to bind on either side. Writing a
 * control for an op that does not exist would clear the violation by making the registry lie.
 */
const NO_HUMAN: readonly CapabilityId[] = ["create-model", "delete-model", "add-note"];

/** Identical to NO_HUMAN, and that identity is the claim: the gaps are symmetric. */
const NO_MACHINE: readonly CapabilityId[] = ["create-model", "delete-model", "add-note"];

/**
 * The eight capabilities whose human affordance this change built.
 *
 * Shortening the baseline alone would be a weaker test: a capability deleted from the registry
 * would also disappear from the violation list and pass. These must be present AND wired.
 */
const NEWLY_WIRED: readonly CapabilityId[] = [
  "create-element", "delete-element", "create-relation", "delete-relation", "edit-property",
  "create-hypothesis", "commit-hypothesis", "discard-hypothesis",
];

test("UX-I1 violations match the recorded baseline exactly", () => {
  const violations = checkAffordanceParity();
  const human = violations.filter((v) => v.problem.includes("HUMAN")).map((v) => v.capability).sort();
  const machine = violations.filter((v) => v.problem.includes("MACHINE")).map((v) => v.capability).sort();

  assert.deepEqual(human, [...NO_HUMAN].sort(),
    "a capability gained or lost a human affordance; update NO_HUMAN deliberately");
  assert.deepEqual(machine, [...NO_MACHINE].sort(),
    "a capability gained or lost a machine affordance; update NO_MACHINE deliberately");
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

test("the editing and hypothesis capabilities are wired on both sides", () => {
  const violating = new Set(checkAffordanceParity().map((v) => v.capability));
  const declared = new Set(CAPABILITIES.map((c) => c.id));
  for (const id of NEWLY_WIRED) {
    assert.ok(declared.has(id), `${id} is no longer in the registry; the baseline cannot vouch for it`);
    assert.ok(!violating.has(id), `${id} should be wired on both sides but is not`);
  }
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

test("read-and-analyse capabilities ARE fully wired on both sides", () => {
  // The positive control. A baseline test that only lists failures would pass against an empty
  // registry, so this asserts the nine that genuinely work.
  const working: CapabilityId[] = [
    "import", "export", "inspect", "validate", "query", "analyze", "inspect-evidence", "undo", "redo",
  ];
  const violating = new Set(checkAffordanceParity().map((v) => v.capability));
  for (const id of working) {
    assert.ok(!violating.has(id), `${id} should be wired on both sides but is not`);
  }
});

test("anything not wired must explain itself", () => {
  // An unexplained gap is indistinguishable from an oversight. A note is what makes the baseline
  // reviewable rather than just long.
  for (const c of CAPABILITIES) {
    for (const a of [...c.human, ...c.machine]) {
      if (a.status === "wired") continue;
      assert.ok((a.note ?? "").length > 8,
        `${c.id} affordance '${a.at}' is ${a.status} with no explanation`);
    }
  }
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
  const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {});
  const d = api.describe();

  assert.equal(d.operations.length, CAPABILITIES.length,
    "describe() must report exactly the registry's capabilities");
  const names = new Set(d.operations.map((o) => o.name));
  for (const c of CAPABILITIES) assert.ok(names.has(c.id), `${c.id} missing from describe()`);

  // And it must admit where the workbench falls short of its own registry. This assertion used to
  // read `create-hypothesis` — an agent could open a hypothesis and a human could not. That gap is
  // closed, so the example moved to one that is still true rather than being deleted: an agent
  // must be told it cannot attach a note, or it will try and get a schema error for an answer.
  assert.equal(d.affordanceGaps.length, checkAffordanceParity().length);
  assert.ok(d.affordanceGaps.some((g) => g.startsWith("add-note")),
    "an agent should be told that no interface can attach a note");
  assert.ok(!d.affordanceGaps.some((g) => g.startsWith("create-hypothesis")),
    "a human can now open a hypothesis; describe() must not still report it as a gap");
});
