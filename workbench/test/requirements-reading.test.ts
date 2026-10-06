// Requirement verdicts must be READABLE THROUGH THE PUBLISHED API — derived per read, moving with
// the model, and saying what the status word means.
//
// ## The failure this file exists to catch, measured before it was fixed
//
// The 261006 lab-solver run — a browser-driving agent working the shipped labs from `window.mage`
// alone — found that no call returned a requirement verdict. The model schema says verification is
// "derived per read and stored nowhere"; the engine owns the one join (`verifySystemRequirements`)
// and a thick test wall exercises it — and nothing an application surface could call derived it.
// The agent judged every obligation by joining the breach query's outcome with `satisfied_when`
// read out of `export()` YAML, by hand, each time. A construct whose verdict is derivable but
// published nowhere is one only its author can read, and the asymmetry was declared nowhere.
//
// So the assertions here run through `createAgentApi` — the object an agent holds — not through
// the engine the agent cannot see.
//
// ## What is held
//
//  1. COVERAGE — `requirements()` publishes every authored requirement of every shipped example,
//     keyed by the authored id, and the corpus actually ships some (a sweep over an empty
//     construct proves nothing).
//  2. PARITY WITH THE ONE JOIN — the published verification equals the engine's own
//     `verifySystemRequirements`, so the facade cannot quietly re-derive or drop an arm.
//  3. THE BY-HAND JOIN, RETIRED — on the settled arms, status and verdict agree with the join the
//     lab-solver performed manually: `satisfied` iff the deciding outcome equals `satisfiedWhen`,
//     with the verdict carried beside it.
//  4. IT MOVES WITH THE MODEL — the solver's own two-surface repair of message-bus flips the
//     shipped `violated` to `satisfied` on the next read, through `transact` + `requirements()`.
//  5. WIRE DISCIPLINE — the published record survives a JSON round-trip unchanged (the evidence
//     seam's lesson), and `meaning` is the engine's own sentence for the status word.
//  6. THE AFFORDANCE IS DECLARED — `describe().operations` publishes the callable, so an agent
//     holding only the publication learns it exists.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createAgentApi } from "../src/app/agent-api.ts";
import type { MageAgentApi } from "../src/app/agent-api.ts";
import { Workspace } from "../src/app/services.ts";
import { ExampleCatalog } from "../src/app/examples.ts";
import { SHIPPED_EXAMPLE_IDS } from "../src/app/examples.ts";
import type { AssetReader } from "../src/app/examples.ts";
import { VERIFICATION_TEXT } from "../src/engine/verification.ts";
import { verifySystemRequirements } from "../src/engine/index.ts";
import { realPorts, exampleText } from "../scripts/gen-example-coverage.ts";

const assets: AssetReader = (path: string) => Promise.resolve(readFileSync(path.replace(/^\.\//, ""), "utf8"));

function apiOn(exampleId: string): { api: MageAgentApi; workspace: Workspace } {
  const ws = new Workspace(realPorts);
  const out = ws.load(exampleText(exampleId));
  assert.ok(out.ok, `${exampleId} must load: ${out.findings.map((f) => f.message).join("; ")}`);
  const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, new ExampleCatalog(ws, assets));
  return { api, workspace: ws };
}

test("every authored requirement of every shipped example is published, keyed by its id", () => {
  let total = 0;
  for (const id of SHIPPED_EXAMPLE_IDS) {
    const { api, workspace } = apiOn(id);
    const published = api.requirements();
    const authored = [...workspace.state.system.requirements.keys()].sort();
    assert.deepEqual(Object.keys(published).sort(), authored,
      `${id}: requirements() must publish exactly the authored construct — nothing dropped, nothing invented`);
    total += authored.length;
  }
  assert.ok(total >= 2, "the corpus must ship requirements for this sweep to prove anything");
});

test("the published verification is the engine's own join, arm for arm", () => {
  for (const id of SHIPPED_EXAMPLE_IDS) {
    const { api, workspace } = apiOn(id);
    const published = api.requirements();
    const engine = verifySystemRequirements(workspace.state.system);
    for (const [reqId, verification] of engine) {
      assert.deepEqual(published[reqId]?.verification, verification,
        `${id}/${reqId}: the facade must publish the one verification join, not a second opinion`);
    }
  }
});

test("the by-hand join is retired: settled statuses agree with outcome versus satisfied_when", () => {
  let settled = 0;
  for (const id of SHIPPED_EXAMPLE_IDS) {
    const { api } = apiOn(id);
    const results = api.savedQueries();
    for (const [reqId, reading] of Object.entries(api.requirements())) {
      const v = reading.verification;
      assert.equal(reading.meaning, VERIFICATION_TEXT[v.status],
        `${id}/${reqId}: meaning must be the engine's own sentence for '${v.status}'`);
      assert.deepEqual(JSON.parse(JSON.stringify(reading)), reading,
        `${id}/${reqId}: the reading must survive the in-page reader's JSON round-trip`);
      if (v.status !== "satisfied" && v.status !== "violated") continue;
      settled += 1;
      assert.ok(reading.expressedAs !== null && reading.satisfiedWhen !== null);
      const outcome = results[reading.expressedAs]?.outcome;
      assert.equal(v.verdict, outcome,
        `${id}/${reqId}: the verdict beside the status must be the deciding query's own outcome`);
      assert.equal(v.status, outcome === reading.satisfiedWhen ? "satisfied" : "violated",
        `${id}/${reqId}: this is the join the lab-solver performed by hand out of export YAML; ` +
        `the published status must BE that join`);
    }
  }
  assert.ok(settled >= 2, "the corpus must settle some obligations, or the settled arms went unchecked");
});

test("a reading moves with the model: the solver's message-bus repair flips violated to satisfied", () => {
  const { api } = apiOn("message-bus");
  const reqId = "no-restricted-data-to-an-impermitted-subscriber";

  const before = api.requirements()[reqId];
  assert.ok(before !== undefined, "message-bus authors the breach requirement");
  assert.equal(before.verification.status, "violated",
    "as shipped, analytics (permits: internal) subscribes to an event carrying restricted data");

  // The sound two-surface repair from the lab run: delete the field edge that makes the aggregate
  // say `restricted`, and move the declared aggregate — one transaction, both surfaces.
  const out = api.transact({
    transaction: {
      base: api.context().hash,
      operations: [
        {
          op: "delete-relation", model: "data-policy",
          from: "order-created", to: "shipping-address", type: "carries_field",
        },
        { op: "set-property", id: "order-created", name: "carries", value: "internal", domain: "sensitivity" },
      ],
    },
  });
  assert.ok(out.ok, `the repair must commit: ${out.findings.map((f) => f.message).join("; ")}`);

  const after = api.requirements()[reqId];
  assert.ok(after !== undefined);
  assert.equal(after.verification.status, "satisfied",
    "the breach query now refutes, which is the declared discharging value — the reading must move");
  assert.ok(after.verification.status === "satisfied" && after.verification.verdict === "refuted");
  assert.equal(after.systemHash, api.context().hash,
    "the reading must describe the revision it was derived against — per read, stored nowhere");
  assert.notEqual(after.systemHash, before.systemHash,
    "and the repair advanced the revision, so the two readings describe different systems");
});

test("the publication declares the callable: an agent holding describe() learns it exists", () => {
  const { api } = apiOn("message-bus");
  const calls = api.describe().operations.flatMap((o) => o.calls.map((c) => c.at));
  assert.ok(calls.includes("window.mage.requirements"),
    "describe().operations must advertise window.mage.requirements — a surface an agent must " +
    "discover by guessing is not published");
});
