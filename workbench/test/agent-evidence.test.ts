/**
 * `window.mage.evidence(queryId)` — the two failure modes it used to have, pinned.
 *
 * `DESIGN-shell-261002.md` §10 flagged the method and left it out of its own scope: it read a
 * Map filled only by `savedQueries()`, so it had two defects rather than one.
 *
 *  1. **Stale.** It handed back whatever `savedQueries()` last computed. Edit the model, ask again,
 *     and the answer described a system that no longer existed — while `properties()`, declared two
 *     lines above it, recomputed.
 *  2. **Indistinguishable absence.** It returned `null` when the Map was empty, so "that question
 *     has no witness" and "nobody primed the cache" were the SAME value at the call site. An agent
 *     asking about a perfectly good question read `null` and concluded there was no evidence.
 *
 * Mode 2 is the expensive one, and it is this repo's standing warning in a new costume: a probe
 * that returns nothing has two explanations, and the likelier one is the probe. The old signature
 * forced that confusion on every caller — no amount of care at the call site could tell the two
 * apart, because one value carried both meanings.
 *
 * These drive the facade through `createAgentApi`, which is the object `window.mage` IS, rather
 * than reaching into the module. Nothing here names a query id, an outcome or a count that the
 * fixture already owns: the ids come from `system.queries`, the expected verdicts from a second
 * computation through `Workspace.query`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runQuery } from "../src/engine/index.ts";
import { renderView } from "../src/render/index.ts";
import { Workspace } from "../src/app/services.ts";
import type { Ports } from "../src/app/services.ts";
import { createAgentApi } from "../src/app/agent-api.ts";
import type { MageAgentApi } from "../src/app/agent-api.ts";
import { ExampleCatalog } from "../src/app/examples.ts";
import type { AssetReader } from "../src/app/examples.ts";

const ports: Ports = {
  engine: {
    graphQuery: (system, query) => runQuery(system, query).result,
    behaviorQuery: (system, query) => runQuery(system, query).result,
    explore: () => ({ configurations: [], exhaustive: false }),
  },
  render: { render: (system, request) => renderView(system, request) },
};

const assets: AssetReader = (path) => Promise.resolve(readFileSync(path, "utf8"));

const attached = (): { readonly ws: Workspace; readonly api: MageAgentApi } => {
  const ws = new Workspace(ports);
  const r = ws.load(readFileSync("examples/docable.mage.yaml", "utf8"));
  assert.ok(r.ok, "the worked example must load");
  return { ws, api: createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, new ExampleCatalog(ws, assets)) };
};

/** The first saved question of this system whose answer carries a witness. Looked up, not written. */
const questionWithEvidence = (ws: Workspace): string => {
  for (const [id, saved] of ws.state.system.queries) {
    if (ws.query(saved.raw).evidence !== null) return id;
  }
  assert.fail("no shipped saved question produces evidence, so this suite tests nothing");
};

// ----------------------------------------------------------------------------------------------
// Mode 2 — an unprimed read must not look like an absence
// ----------------------------------------------------------------------------------------------

test("evidence() answers a real question on a workspace nobody ran first", () => {
  // The exact defect: this is the FIRST call on a freshly loaded system. The old implementation
  // returned `null` here, and `null` was also its answer for a question with no witness — so a
  // caller doing the right thing got the value that means "there is nothing to see".
  const { ws, api } = attached();
  const id = questionWithEvidence(ws);

  const reading = api.evidence(id);
  assert.equal(reading.found, true,
    `evidence("${id}") reported nothing on an unprimed workspace: ${JSON.stringify(reading)}`);
  if (!reading.found) return;
  assert.equal(reading.queryId, id);
  assert.ok(reading.evidence.steps.length > 0, "a found witness with no steps is nothing to read");
  assert.deepEqual(reading.result.evidence, reading.evidence,
    "the narrowed witness must be the result's own, not a second copy");
});

test("priming makes no difference — there is no cache to prime", () => {
  // UX-I2's half of this: the agent surface and the human property list must not disagree about
  // whether a question has been asked. A method whose answer depends on call ORDER does.
  const { ws, api } = attached();
  const id = questionWithEvidence(ws);

  const cold = api.evidence(id);
  api.savedQueries();
  const warm = api.evidence(id);
  assert.deepEqual(warm, cold, "calling savedQueries() first changed what evidence() reported");
});

// ----------------------------------------------------------------------------------------------
// Mode 1 — staleness
// ----------------------------------------------------------------------------------------------

test("evidence() describes the CURRENT system, not the one savedQueries() last saw", () => {
  // Driven in the order that produced the bug: ask, PRIME, edit, ask again. `gateway.accepts` is
  // the right-hand side of the shipped security join, so raising it to the source's own
  // classification removes the only violating flow — an edit that moves a verdict, not just a hash.
  const { ws, api } = attached();
  const staleHash = ws.state.hash;
  const outcomeBefore = new Map([...ws.state.system.queries]
    .map(([id, saved]) => [id, ws.query(saved.raw).outcome]));
  api.savedQueries();

  const source = ws.state.system.entities.get("remediation")?.properties.get("classification")?.value;
  assert.ok(source !== undefined, "the fixture no longer declares the classification this edit raises to");
  const commit = api.transact({ transaction: { base: staleHash, operations: [
    { op: "set-property", id: "gateway", name: "accepts", value: source, domain: "sensitivity" },
  ] } });
  assert.ok(commit.ok, commit.findings.map((f) => f.message).join("; "));
  assert.notEqual(ws.state.hash, staleHash, "the edit did not advance the revision, so nothing went stale");

  // Ground truth: the same questions, recomputed through the service the human surface uses. Only
  // the ones whose VERDICT moved can witness staleness, so the test insists there is one.
  const moved = [...ws.state.system.queries]
    .filter(([id, saved]) => ws.query(saved.raw).outcome !== outcomeBefore.get(id))
    .map(([id]) => id);
  assert.ok(moved.length > 0,
    "the edit moved no verdict, so this test could not tell a recomputed answer from a cached one");

  for (const id of moved) {
    const truth = ws.query(ws.state.system.queries.get(id)!.raw);
    const reading = api.evidence(id);
    assert.deepEqual(reading.result, truth,
      `evidence("${id}") still describes revision ${staleHash}; the system is at ${ws.state.hash}`);
    assert.equal(reading.found, truth.evidence !== null,
      `evidence("${id}") disagrees with the current answer about whether there is a witness`);
  }
});

test("every reading is attributed to the revision it describes", () => {
  // The structural version of the assertion above, over every shipped question: a result carries
  // the hash of the system it describes (V18), so a recomputing reader can never report another.
  const { ws, api } = attached();
  for (const id of ws.state.system.queries.keys()) {
    const reading = api.evidence(id);
    const result = reading.found ? reading.result : reading.result;
    assert.ok(result !== null, `evidence("${id}") ran no question for a question that exists`);
    assert.equal(result.systemHash, ws.state.hash,
      `evidence("${id}") reports revision ${result.systemHash} while the system is at ${ws.state.hash}`);
  }
});

// ----------------------------------------------------------------------------------------------
// The three outcomes must be distinguishable from each other
// ----------------------------------------------------------------------------------------------

test("a question nobody saved is reported as such, and names what IS saved", () => {
  const { ws, api } = attached();
  const saved = [...ws.state.system.queries.keys()];
  const absent = `${saved.join("-")}-nobody-saved-this`;
  assert.ok(!saved.includes(absent));

  const reading = api.evidence(absent);
  assert.equal(reading.found, false);
  if (reading.found) return;
  assert.equal(reading.cause, "no-such-question");
  assert.equal(reading.result, null, "a question nobody asked cannot carry an answer");
  assert.deepEqual([...reading.savedQuestions], saved,
    "the reading must name the real ids, which is how a caller tells a typo from an absence");
  assert.ok(reading.prose.includes(absent), `the sentence does not quote what was asked for: "${reading.prose}"`);
});

test("a refusal is not a missing witness — the two causes stay apart", () => {
  // The distinction `src/sparql/refusal.ts` protects, at this seam. `transitive-ownership` asks a
  // multi-hop question over a relation type declaring `composition.path: forbidden`, so the MODEL
  // declines; reporting that as "no witness" would teach a caller the workbench cannot answer
  // something it refuses on purpose.
  const { ws, api } = attached();
  const refusing = [...ws.state.system.queries.keys()]
    .filter((id) => ws.query(ws.state.system.queries.get(id)!.raw).outcome === "unlicensed");
  assert.ok(refusing.length > 0, "no shipped question is refused, so the refusal arm is untested");

  for (const id of refusing) {
    const reading = api.evidence(id);
    assert.equal(reading.found, false, `${id} is refused, so it has no witness to find`);
    if (reading.found) continue;
    assert.equal(reading.cause, "unlicensed-by-model", `${id} is refused and was reported as ${reading.cause}`);
    assert.ok(reading.result !== null, "a refusal is an answer, so the reading must carry it");
    assert.equal(reading.result.refusal, reading.prose,
      "the sentence must be the engine's own refusal, not a second wording of it");
  }
});

test("an answered question with nothing to show reads as that, and not as a refusal", () => {
  const { ws, api } = attached();
  const silent = [...ws.state.system.queries.keys()].filter((id) => {
    const r = ws.query(ws.state.system.queries.get(id)!.raw);
    return r.evidence === null && r.outcome !== "unlicensed";
  });
  assert.ok(silent.length > 0,
    "no shipped question is answered without a witness, so the no-witness arm is untested");

  for (const id of silent) {
    const reading = api.evidence(id);
    assert.equal(reading.found, false);
    if (reading.found) continue;
    assert.equal(reading.cause, "no-witness", `${id} was answered, and was reported as ${reading.cause}`);
    assert.ok(reading.result !== null, "the verdict is still an answer worth handing back");
    assert.equal(reading.result.outcome, ws.query(ws.state.system.queries.get(id)!.raw).outcome);
  }
});

test("the three causes are three values, over the shipped fixture", () => {
  // The claim mode 2 was about, as one assertion: a caller can tell the cases apart from the
  // return value alone. One `null` for all three is what this replaces.
  const { ws, api } = attached();
  const seen = new Set<string>();
  for (const id of ws.state.system.queries.keys()) {
    const r = api.evidence(id);
    seen.add(r.found ? "found" : r.cause);
  }
  seen.add(api.evidence("nothing-is-saved-under-this-id").found ? "found" : "no-such-question");
  assert.deepEqual([...seen].sort(), ["found", "no-such-question", "no-witness", "unlicensed-by-model"],
    "the shipped example does not exercise every arm, so some arm is unmeasured");
});
