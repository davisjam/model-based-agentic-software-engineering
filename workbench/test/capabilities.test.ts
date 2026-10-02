// The capability registry and the UX invariants it enforces.
//
// UX-I1 currently FAILS on 17 of 19 capabilities, and that is the point: the registry states what is
// actually built, so the invariant names incomplete work instead of letting the workbench be
// described as finished. These tests therefore pin the violations as a BASELINE — new ones fail the
// build, and fixing one requires deleting its line here, which is a deliberate act.
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
 * Read the shape, not just the list: everything that MUTATES the model is here, because the
 * transaction engine is landed but not bound to the workspace. The workbench can read, analyse and
 * answer; it cannot yet edit.
 */
const NO_HUMAN: readonly CapabilityId[] = [
  "create-element", "delete-element", "create-relation", "delete-relation", "edit-property",
  "create-model", "delete-model",
  // These three are the asymmetry UX-I1 exists to catch: an AGENT can open, commit and discard a
  // hypothesis, and a human cannot. The banner renders an active hypothesis but nothing opens one.
  "create-hypothesis", "commit-hypothesis", "discard-hypothesis",
];

/** Capabilities with no wired machine affordance — all the same transaction-binding gap. */
const NO_MACHINE: readonly CapabilityId[] = [
  "create-element", "delete-element", "create-relation", "delete-relation", "edit-property",
  "create-model", "delete-model",
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
  const noop = {
    engine: { graphQuery: () => { throw new Error("unused"); }, behaviorQuery: () => { throw new Error("unused"); },
      explore: () => ({ configurations: [], exhaustive: false }) },
    yaml: { parse: () => ({}), serialize: () => "" },
    transactions: { apply: (system: never) => ({ ok: false, system, findings: [] }) },
    render: { render: () => ({ svg: "", accessible: { title: "", nodes: [], edges: [], summary: "" }, positions: new Map() }) },
  };
  const ws = new Workspace(noop as never);
  const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {});
  const d = api.describe();

  assert.equal(d.operations.length, CAPABILITIES.length,
    "describe() must report exactly the registry's capabilities");
  const names = new Set(d.operations.map((o) => o.name));
  for (const c of CAPABILITIES) assert.ok(names.has(c.id), `${c.id} missing from describe()`);

  // And it must admit where the interfaces diverge.
  assert.equal(d.affordanceGaps.length, checkAffordanceParity().length);
  assert.ok(d.affordanceGaps.some((g) => g.startsWith("create-hypothesis")),
    "an agent should be told a human cannot open a hypothesis");
});
