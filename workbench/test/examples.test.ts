// The default examples, and the workbench's end-to-end validation suite.
//
// These two jobs are the same job. Every test here drives the REAL seams -- `Workspace.load`,
// `Workspace.query`, `Workspace.openHypothesis`, `createAgentApi` -- so an example's expected
// results and the application's behaviour are checked by one pass. A test that reached
// `canonicalize()` and `runGraphQuery()` directly would exercise two modules and witness nothing
// about the application: UX-I3's claim is that every path normalises to the same IR, and a caller
// that skips the facade cannot see that happen.
//
// The consequence is deliberate: the examples are load-bearing. Break one and the build fails.
// That is why every fixture pins a SEMANTIC outcome and nothing incidental -- a suite that cries
// wolf on an unrelated layout improvement gets disabled, and then the end-to-end validation is gone
// and nobody notices.
//
// The three example invariants, and where each is held:
//
//   EX-I1  example equivalence         -- "an example is an ordinary model system" below
//   EX-I2  purposeful model plurality  -- "EX-I2" below, per example
//   EX-I3  analysis diversity          -- models/example-coverage.mage.yaml, asserted at the end
//
// CI dependency, stated rather than assumed: this suite runs under `npm test`. Wiring `npm test`
// into GitHub Actions belongs to whoever owns .github/, and until that lands these assertions run
// only when someone runs the suite locally.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash } from "../src/ir/hash.ts";
import { Workspace } from "../src/app/services.ts";
import { createAgentApi } from "../src/app/agent-api.ts";
import type { CanonicalSystem, Evidence, QueryResult, Scalar } from "../src/ir/types.ts";
import {
  CAPABILITY_ROWS, EXAMPLE_IDS, deriveCoverage, exampleText, generateExampleCoverageModel,
  loadExample, machineVocabulary, purposefulModels, realPorts, sharedIdentities,
  type EvidenceExpectation, type LoadedExample, type QueryExpectation,
} from "../scripts/gen-example-coverage.ts";

const examples = (): readonly LoadedExample[] => EXAMPLE_IDS.map(loadExample);

const savedRaw = (system: CanonicalSystem, id: string): unknown => {
  const saved = system.queries.get(id);
  assert.ok(saved !== undefined, `the fixture names query '${id}', which the system does not declare`);
  return saved.raw;
};

// ----------------------------------------------------------------------------------------------
// The comparator, as a function returning mismatches
// ----------------------------------------------------------------------------------------------

const finalValue = (cfg: { control: ReadonlyMap<string, string>; values: ReadonlyMap<string, Scalar> },
  ref: string): Scalar | undefined =>
  ref.endsWith(".state") ? cfg.control.get(ref.slice(0, -".state".length)) : cfg.values.get(ref);

function checkEvidence(where: string, ev: Evidence | null, exp: EvidenceExpectation): readonly string[] {
  const bad: string[] = [];
  if (ev === null) return [`${where}: expected ${exp.role} evidence, got none`];
  if (ev.shape !== exp.shape) bad.push(`${where}: evidence shape ${ev.shape}, expected ${exp.shape}`);
  if (ev.role !== exp.role) bad.push(`${where}: evidence role ${ev.role}, expected ${exp.role}`);

  const nodes = ev.nodes ?? [];
  if (exp.path !== null) {
    // An ORDERED comparison, for a query whose answer is a sequence. A one-node "path" is how a
    // vacuous holds looks from the outside, so pinning the sequence is pinning the question.
    if (JSON.stringify(nodes) !== JSON.stringify(exp.path)) {
      bad.push(`${where}: path ${JSON.stringify(nodes)}, expected ${JSON.stringify(exp.path)}`);
    }
  }
  for (const n of exp.nodesInclude) {
    if (!nodes.includes(n)) bad.push(`${where}: evidence nodes ${JSON.stringify(nodes)} omit '${n}'`);
  }
  if (exp.nodeCount !== null && nodes.length !== exp.nodeCount) {
    bad.push(`${where}: ${nodes.length} evidence nodes, expected ${exp.nodeCount}`);
  }
  if (exp.minSteps !== null && ev.steps.length < exp.minSteps) {
    bad.push(`${where}: ${ev.steps.length} steps, expected at least ${exp.minSteps}`);
  }
  if (exp.cycleMinSteps !== null && (ev.cycle?.length ?? 0) < exp.cycleMinSteps) {
    bad.push(`${where}: cycle of ${ev.cycle?.length ?? 0} steps, expected at least ${exp.cycleMinSteps}`);
  }
  for (const [label, atLeast] of exp.labelsAtLeast) {
    const seen = [...ev.steps, ...(ev.cycle ?? [])].filter((s) => s.label === label).length;
    if (seen < atLeast) bad.push(`${where}: ${seen} '${label}' steps, expected at least ${atLeast}`);
  }
  if (exp.final.size > 0) {
    const last = [...ev.steps, ...(ev.cycle ?? [])].at(-1);
    if (last === undefined) bad.push(`${where}: no steps, so no final configuration to check`);
    else {
      for (const [ref, want] of exp.final) {
        const got = finalValue(last.to, ref);
        if (got !== want) bad.push(`${where}: final ${ref} is ${String(got)}, expected ${String(want)}`);
      }
    }
  }
  return bad;
}

function checkResult(where: string, res: QueryResult, exp: QueryExpectation): readonly string[] {
  const bad: string[] = [];
  if (res.outcome !== exp.outcome) bad.push(`${where}: outcome ${res.outcome}, expected ${exp.outcome}`);
  if (res.coverage.kind !== exp.coverage) {
    bad.push(`${where}: coverage ${res.coverage.kind}, expected ${exp.coverage}`);
  }
  if (exp.coverageReason !== null && res.coverage.reason !== exp.coverageReason) {
    bad.push(`${where}: coverage reason ${String(res.coverage.reason)}, expected ${exp.coverageReason}`);
  }
  if (exp.refusalContains !== null && !(res.refusal ?? "").includes(exp.refusalContains)) {
    bad.push(`${where}: refusal '${String(res.refusal)}' does not contain '${exp.refusalContains}'`);
  }
  if (exp.noEvidence && res.evidence !== null) {
    bad.push(`${where}: expected no evidence, got ${res.evidence.shape} ${res.evidence.role}`);
  }
  if (exp.evidence !== null) bad.push(...checkEvidence(where, res.evidence, exp.evidence));
  return bad;
}

// ----------------------------------------------------------------------------------------------
// EX-I1 -- example equivalence
// ----------------------------------------------------------------------------------------------

test("an example loads through the facade with ZERO validation findings", () => {
  // An example that ships with findings teaches that findings are normal. Checked through
  // `Workspace.load` and again through `state.findings`, because the two are different calls and a
  // regression could reach either.
  for (const id of EXAMPLE_IDS) {
    const ws = new Workspace(realPorts);
    const loaded = ws.load(exampleText(id));
    assert.ok(loaded.ok, `${id}: did not load`);
    assert.deepEqual(loaded.findings, [], `${id}: loaded with findings`);
    assert.deepEqual(ws.state.findings, [], `${id}: validates with findings`);
    assert.ok(ws.state.loaded, `${id}: the workspace should report a loaded model`);
  }
});

test("EX-I1: an example is an ordinary model system, with no privileged import path", () => {
  // Two halves. First: the hash the facade computes equals the hash of a plain canonicalize of the
  // same bytes, so nothing preprocesses an example on the way in.
  for (const id of EXAMPLE_IDS) {
    const text = exampleText(id);
    const ws = new Workspace(realPorts);
    ws.load(text);
    assert.equal(ws.state.hash, systemHash(canonicalize(parse(text))),
      `${id}: the facade's system must be the one canonicalize produces from the same bytes`);

    // Second: export and re-import, which is the ordinary user round trip (section 11 item 10).
    const reloaded = new Workspace(realPorts);
    assert.ok(reloaded.load(ws.export()).ok, `${id}: the exported workspace must re-import`);
    assert.equal(reloaded.state.hash, ws.state.hash, `${id}: a round trip must preserve identity`);
  }
});

test("EX-I1: no validator, engine, kernel or renderer source names an example", () => {
  // The structural half of "no privileged query paths, renderers, validators, or analysis code".
  // `src/ui/` is deliberately NOT in scope: section 3 requires a Load Example menu, which has to
  // name the examples it offers. Naming one inside the kernel, the engine, the validator or the
  // renderer is the thing EX-I1 forbids, and `src/ui/main.ts` hardcoding docable is the precedent
  // for how it happens.
  const privileged = ["src/ir/", "src/engine/", "src/validator/", "src/render/"];
  const tracked = execFileSync("git", ["ls-files", "--", "*.ts"], { encoding: "utf8", cwd: ".." })
    .split("\n")
    .filter((p) => privileged.some((dir) => p.startsWith(`workbench/${dir}`)));
  assert.ok(tracked.length > 10, `expected kernel/engine sources, found ${tracked.length}`);

  const offenders: string[] = [];
  for (const rel of tracked) {
    const text = readFileSync(`../${rel}`, "utf8");
    for (const id of EXAMPLE_IDS) if (text.includes(id)) offenders.push(`${rel} names '${id}'`);
  }
  assert.deepEqual(offenders, [], `an example must not be special-cased:\n  ${offenders.join("\n  ")}`);
});

// ----------------------------------------------------------------------------------------------
// EX-I2 -- purposeful model plurality
// ----------------------------------------------------------------------------------------------

test("EX-I2: two or more purposeful models, a shared identity, and a question needing both", () => {
  // Mechanically checkable, and its job is to stop a later "simplification" of an example into one
  // giant graph. A test is how the invariant does that job.
  for (const ex of examples()) {
    const system = ex.workspace.state.system;
    const models = purposefulModels(system);
    assert.ok(models.length >= 2, `${ex.id}: ${models.length} purposeful model(s), EX-I2 needs 2`);
    for (const m of models) {
      assert.ok(m.question !== null && m.question.length > 0,
        `${ex.id}: model '${m.id}' declares no engineering question, so it is not purposeful`);
      assert.ok(m.represents.length > 0, `${ex.id}: model '${m.id}' represents nothing`);
      assert.ok(m.omits.length > 0, `${ex.id}: model '${m.id}' omits nothing -- section 7 requires a real omission`);
    }

    const shared = sharedIdentities(system);
    assert.ok(shared.length > 0,
      `${ex.id}: no identity is named by two purposeful models, so these are unrelated diagrams`);

    const composing = ex.fixture.queries.filter((q) => q.models.length >= 2);
    assert.ok(composing.length > 0,
      `${ex.id}: no supplied question needs more than one model`);
    // And the models a composing question names must be real, or the claim is decoration.
    const known = new Set(models.map((m) => m.id));
    for (const q of composing) {
      for (const m of q.models) assert.ok(known.has(m), `${ex.id}: query '${q.id}' names unknown model '${m}'`);
    }
  }
});

test("the fixture's model list matches the system's purposeful models exactly", () => {
  // The fixture declares the models so EX-I2 and the coverage rows can read them. A fixture list
  // that drifted from the file would make every downstream check assert against a fiction.
  for (const ex of examples()) {
    const actual = purposefulModels(ex.workspace.state.system)
      .map((m) => `${m.kind}:${m.id}`).sort();
    const declared = ex.fixture.models.map((m) => `${m.kind}:${m.id}`).sort();
    assert.deepEqual(declared, actual, `${ex.id}: expected-results.yaml models are stale`);
  }
});

// ----------------------------------------------------------------------------------------------
// Supplied queries, through the facade
// ----------------------------------------------------------------------------------------------

test("every supplied query returns the expected outcome, coverage and evidence", () => {
  const mismatches: string[] = [];
  for (const ex of examples()) {
    const system = ex.workspace.state.system;
    for (const q of ex.fixture.queries) {
      const res = ex.workspace.query(savedRaw(system, q.id));
      mismatches.push(...checkResult(`${ex.id}/${q.id}`, res, q.expected));
      if (res.systemHash !== ex.workspace.state.hash) {
        mismatches.push(`${ex.id}/${q.id}: the result does not carry the hash of the system it describes`);
      }
    }
  }
  assert.deepEqual(mismatches, [], `fixture mismatches:\n  ${mismatches.join("\n  ")}`);
});

test("the comparator actually fires -- negative control", () => {
  // A fixture harness that can only pass is not a harness. Mutate one expectation three ways and
  // check each is caught: the outcome, the ordered path, and the final configuration.
  const ex = loadExample("message-bus");
  const q = ex.fixture.queries.find((x) => x.id === "restricted-data-reaches-impermitted-subscriber");
  assert.ok(q !== undefined);
  const res = ex.workspace.query(savedRaw(ex.workspace.state.system, q.id));

  assert.deepEqual(checkResult("control", res, q.expected), [], "the real expectation must pass");
  assert.ok(checkResult("control", res, { ...q.expected, outcome: "refuted" }).length > 0,
    "a wrong outcome must be caught");
  assert.ok(q.expected.evidence !== null);
  assert.ok(checkResult("control", res, {
    ...q.expected, evidence: { ...q.expected.evidence, path: ["analytics"] },
  }).length > 0, "a one-node path -- the shape a vacuous holds takes -- must be caught");

  const wq = loadExample("worker-queue");
  const dead = wq.fixture.queries.find((x) => x.id === "dead-letter-is-reachable");
  assert.ok(dead?.expected.evidence !== undefined && dead.expected.evidence !== null);
  const deadRes = wq.workspace.query(savedRaw(wq.workspace.state.system, dead.id));
  assert.ok(checkResult("control", deadRes, {
    ...dead.expected,
    evidence: { ...dead.expected.evidence, labelsAtLeast: new Map([["retry", 4]]) },
  }).length > 0, "a retry bound the trace does not meet must be caught");
});

test("the supplied and presented query sets are exactly as declared", () => {
  for (const ex of examples()) {
    const system = ex.workspace.state.system;
    const declared = ex.fixture.queries.map((q) => q.id).sort();
    assert.deepEqual(declared, [...system.queries.keys()].sort(),
      `${ex.id}: every saved query needs a fixture and every fixture a saved query`);

    // Section 2 caps the PRESENTED set at 3-5. The supplied set is larger on purpose: dropping a
    // refusal case to hit a count would trade coverage for a number.
    const suggested = ex.fixture.queries.filter((q) => q.suggested).length;
    assert.ok(suggested >= 3 && suggested <= 5,
      `${ex.id}: ${suggested} suggested questions, section 2 asks for 3 to 5`);
    for (const q of ex.fixture.queries) {
      assert.ok(q.note.length > 40, `${ex.id}/${q.id}: a fixture entry needs a real note`);
    }
  }
});

test("a requirement's status agrees with the query that decides it", () => {
  // MAGE v0.1 has no requirement construct, so a requirement lives in the fixture joined to a saved
  // query. Without this check the join is a comment: a requirement could claim to be satisfied by a
  // query whose recorded outcome refutes it.
  for (const ex of examples()) {
    assert.ok(ex.fixture.requirements.length > 0, `${ex.id}: section 2 asks for at least one requirement`);
    for (const req of ex.fixture.requirements) {
      const q = ex.fixture.queries.find((x) => x.id === req.expressedAs);
      assert.ok(q !== undefined, `${ex.id}/${req.id}: names query '${req.expressedAs}', which is not supplied`);
      const met = q.expected.outcome === req.satisfiedWhen;
      assert.equal(met, req.status === "satisfied",
        `${ex.id}/${req.id}: status '${req.status}' disagrees with '${q.id}' answering ${q.expected.outcome} ` +
        `against satisfied_when ${req.satisfiedWhen}`);
    }
  }
});

// ----------------------------------------------------------------------------------------------
// UX-I2 -- evidence parity between the human and the agent path
// ----------------------------------------------------------------------------------------------

test("UX-I2: the agent path returns what the human path returns", () => {
  // Whatever evidence the UI can show, `window.mage` can return. The cheapest possible regression
  // test for the thing most likely to break later -- someone adding a convenience path that
  // bypasses the facade.
  for (const ex of examples()) {
    const api = createAgentApi(ex.workspace, { target: null, selection: [] }, {}, () => {});
    const system = ex.workspace.state.system;
    for (const q of ex.fixture.queries) {
      const raw = savedRaw(system, q.id);
      const human = ex.workspace.query(raw);
      const agent = api.query(raw);
      assert.equal(agent.outcome, human.outcome, `${ex.id}/${q.id}: outcomes diverge`);
      assert.deepEqual(agent.coverage, human.coverage, `${ex.id}/${q.id}: coverage diverges`);
      assert.equal(agent.systemHash, human.systemHash, `${ex.id}/${q.id}: system hash diverges`);
      assert.deepEqual(agent.evidence, human.evidence, `${ex.id}/${q.id}: evidence diverges`);
      assert.equal(agent.refusal, human.refusal, `${ex.id}/${q.id}: refusal diverges`);
    }
    // And the bulk path agrees with the per-query path.
    const bulk = api.savedQueries();
    for (const [id, res] of ex.workspace.runSavedQueries()) {
      assert.equal(bulk[id]?.outcome, res.outcome, `${ex.id}/${id}: savedQueries() disagrees with runSavedQueries()`);
    }
  }
});

test("UX-I2: an agent can read each model's purpose and omissions", () => {
  // FR-AGENT-2. An agent must be able to tell what a model represents and what it declines to say,
  // without inferring semantics from geometry -- which is what makes a refusal actionable.
  for (const ex of examples()) {
    const api = createAgentApi(ex.workspace, { target: null, selection: [] }, {}, () => {});
    const inspection = api.inspect();
    for (const m of inspection.models) {
      assert.ok(m.question !== null, `${ex.id}: model '${m.id}' exposes no question to an agent`);
      assert.ok(m.omits.length > 0, `${ex.id}: model '${m.id}' exposes no omissions to an agent`);
    }
    // Shared identity, made queryable: `appearsIn` is how an agent finds an entity's other
    // representations without reading a diagram.
    const shared = sharedIdentities(ex.workspace.state.system).filter((s) => s.kind === "entity");
    for (const s of shared) {
      const entity = inspection.entities.find((e) => e.id === s.id);
      if (entity === undefined) continue;
      // Machines are not in `appearsIn`, which reports graph models only -- so this asserts the
      // graph-model half and worker-queue's machine-shared identity is covered by EX-I2 above.
      assert.ok(entity.appearsIn.length >= 1, `${ex.id}: '${s.id}' reports no appearances`);
    }
  }
});

// ----------------------------------------------------------------------------------------------
// Hypothesis round trips
// ----------------------------------------------------------------------------------------------

test("every declared modification changes a recorded answer, and discarding changes it back", () => {
  // A safety property that no modification can break is not being checked -- it may be holding
  // vacuously, which this project has shipped once already. Driven through the real hypothesis
  // seam, with `base` filled in from the live hash because a hash written into a fixture would be
  // stale the moment the example changed.
  for (const ex of examples()) {
    assert.ok(ex.fixture.modifications.length > 0, `${ex.id}: section 2 asks for a useful modification`);
    for (const mod of ex.fixture.modifications) {
      const ws = ex.workspace;
      const before = ws.state.hash;
      const beforeText = ws.export();

      for (const change of mod.changes) {
        const res = ws.query(savedRaw(ws.state.system, change.query));
        assert.equal(res.outcome, change.from,
          `${ex.id}/${mod.id}: '${change.query}' answers ${res.outcome} before the modification, expected ${change.from}`);
      }

      const opened = ws.openHypothesis(mod.label, {
        transaction: { base: before, rationale: mod.rationale, operations: mod.operations },
      });
      assert.ok(opened.ok,
        `${ex.id}/${mod.id}: hypothesis refused -- ${opened.findings.map((f) => f.message).join("; ")}`);
      assert.equal(ws.state.hypothesis, mod.label);
      assert.notEqual(ws.state.hash, before, `${ex.id}/${mod.id}: a modification must change the system`);

      for (const change of mod.changes) {
        const res = ws.query(savedRaw(ws.state.system, change.query));
        assert.equal(res.outcome, change.to,
          `${ex.id}/${mod.id}: '${change.query}' answers ${res.outcome} under the hypothesis, expected ${change.to}`);
        if (mod.counterexample !== null && change.to === "refuted") {
          const bad = checkEvidence(`${ex.id}/${mod.id}`, res.evidence, mod.counterexample);
          assert.deepEqual(bad, [], `counterexample mismatch:\n  ${bad.join("\n  ")}`);
        }
      }

      // The hypothesis branch is a separate engine loaded from the same text precisely so analysing
      // a what-if cannot mutate or re-identify the authoritative model. That design decision gets a
      // test here, on both the hash and the bytes.
      assert.ok(ws.discardHypothesis(), `${ex.id}/${mod.id}: discard must succeed`);
      assert.equal(ws.state.hypothesis, null);
      assert.equal(ws.state.hash, before, `${ex.id}/${mod.id}: discarding must restore the exact identity`);
      assert.equal(ws.export(), beforeText, `${ex.id}/${mod.id}: discarding must restore the exact bytes`);

      for (const change of mod.changes) {
        const res = ws.query(savedRaw(ws.state.system, change.query));
        assert.equal(res.outcome, change.from,
          `${ex.id}/${mod.id}: '${change.query}' did not return to ${change.from} after discard`);
      }
    }
  }
});

test("an agent drives the same hypothesis through window.mage, with the same answers", () => {
  // UX-I1's hypothesis row is the asymmetry the capability registry records: an agent can open,
  // commit and discard, and a human cannot. Until that is wired, the agent path is the only path --
  // which makes testing it the only way to know the mechanism works at all.
  const ex = loadExample("worker-queue");
  const api = createAgentApi(ex.workspace, { target: null, selection: [] }, {}, () => {});
  const mod = ex.fixture.modifications.find((m) => m.id === "begin-processing-without-the-lease");
  assert.ok(mod !== undefined);
  const change = mod.changes[0];
  assert.ok(change !== undefined);

  const before = api.context().hash;
  const opened = api.hypothesis.open(mod.label, {
    transaction: { base: before, operations: mod.operations },
  });
  assert.ok(opened.ok, `agent hypothesis refused: ${opened.findings.map((f) => f.message).join("; ")}`);
  assert.equal(api.hypothesis.compare()[change.query]?.outcome, change.to,
    "hypothesis.compare() must report the hypothesis's answers, not the authoritative ones");
  assert.ok(api.hypothesis.discard());
  assert.equal(api.context().hash, before, "discarding through the agent API must restore identity");
  assert.equal(api.savedQueries()[change.query]?.outcome, change.from);
});

// ----------------------------------------------------------------------------------------------
// Joins the IR cannot hold itself
// ----------------------------------------------------------------------------------------------

test("V24 for machines: a machine's omissions do not name its own vocabulary", () => {
  // V24 checks `omits` against a model's real vocabulary, but `checkMeaning` iterates
  // `system.models` and never `system.machines` -- so a machine's omissions are declared and
  // unvalidated by the shipped validator. This is the missing half. Without it, worker-queue's two
  // machines could claim to omit a state they declare and nothing would complain.
  const offenders: string[] = [];
  for (const ex of examples()) {
    for (const machine of ex.workspace.state.system.machines.values()) {
      const vocab = machineVocabulary(machine);
      for (const omitted of machine.purpose.omits) {
        if (vocab.has(omitted)) offenders.push(`${ex.id}/${machine.id}: omits '${omitted}', which it declares`);
      }
    }
  }
  assert.deepEqual(offenders, [], offenders.join("\n  "));
});

test("message-bus: the declared `carries` aggregate equals the maximum over the fields", () => {
  // `carries` on an event type is written down because v0.1 aggregates nothing over a relation, and
  // the cross-model safety query needs the value on the endpoint of a `subscribes` edge. Two
  // surfaces for one fact; neither unification nor codegen is available, so this is the control.
  const system = loadExample("message-bus").workspace.state.system;
  const order = system.domains.get("sensitivity")?.values ?? [];
  assert.ok(order.length === 3, "the sensitivity domain must be the three-level ordered enum");

  const rank = (v: Scalar): number => order.indexOf(String(v));
  for (const entity of system.entities.values()) {
    const declared = entity.properties.get("carries")?.value;
    if (declared === undefined) continue;
    const fields = system.relations
      .filter((r) => r.type === "carries_field" && r.from === entity.id)
      .map((r) => system.entities.get(r.to)?.properties.get("classification")?.value);
    assert.ok(fields.length > 0, `${entity.id}: declares 'carries' but carries no field`);
    const highest = fields.reduce<number>((acc, v) => Math.max(acc, v === undefined ? -1 : rank(v)), -1);
    assert.equal(rank(declared), highest,
      `${entity.id}: carries '${String(declared)}' but its highest field is '${String(order[highest])}'`);
  }
});

test("message-bus: event-propagation is exactly the image of event-flow's permissions", () => {
  // The derivation the propagation model's note claims. A note cannot make it true -- annotation is
  // non-semantic by invariant A1 -- so the expected edge set is derived from event-flow here and
  // compared. Without this, the two models could disagree about the same fact and only the prose
  // would say otherwise.
  const system = loadExample("message-bus").workspace.state.system;
  const edge = (from: string, to: string): string => `${from}->${to}`;

  const expected = new Set<string>();
  for (const r of system.relations) {
    if (r.model !== "event-flow") continue;
    if (r.type === "publishes") expected.add(edge(r.from, r.to));
    if (r.type === "subscribes") expected.add(edge(r.to, r.from));
  }
  const actual = new Set(system.relations
    .filter((r) => r.type === "may_propagate_to")
    .map((r) => edge(r.from, r.to)));

  assert.ok(expected.size > 0, "event-flow must declare publish and subscribe permissions");
  assert.deepEqual([...actual].sort(), [...expected].sort(),
    "event-propagation must be the publish-and-subscribe image, with nothing added or dropped");
});

test("worker-queue: every non-free lease state is claimed by exactly one worker entity", () => {
  // Worker identity lives in two places: as an entity in the worker-pool model, and as an
  // enumerated state in the lease machine, because V14 gives multiplicity as occupancy and never as
  // binding. The enumeration is forced, and this is what keeps the two from disagreeing about who
  // exists.
  const system = loadExample("worker-queue").workspace.state.system;
  const lease = system.machines.get("job-lease");
  assert.ok(lease !== undefined);

  const claimed = new Map<string, string[]>();
  for (const entity of system.entities.values()) {
    const state = entity.properties.get("holds_lease_as")?.value;
    if (state === undefined) continue;
    assert.ok(lease.states.includes(String(state)),
      `${entity.id}: holds_lease_as '${String(state)}' is not a declared lease state`);
    const held = claimed.get(String(state)) ?? [];
    held.push(entity.id);
    claimed.set(String(state), held);
  }
  for (const state of lease.states) {
    if (state === lease.initial) {
      assert.ok(!claimed.has(state), `the initial lease state '${state}' must not be claimed by a worker`);
      continue;
    }
    assert.deepEqual(claimed.get(state)?.length, 1,
      `lease state '${state}' is claimed by ${claimed.get(state)?.length ?? 0} worker entities, expected 1`);
  }
  assert.equal(claimed.size, lease.states.length - 1,
    "every non-initial lease state must name a worker, or the lease model outruns the declared population");
});

// ----------------------------------------------------------------------------------------------
// EX-I3 -- analysis diversity, as the generated coverage model
// ----------------------------------------------------------------------------------------------

test("the generated example-coverage model is in sync with the examples", () => {
  // Generated, so a stale committed copy is exactly the drift section 16 asks us to prevent.
  // Regenerating and comparing is how the single source of truth stays single.
  const onDisk = readFileSync("models/example-coverage.mage.yaml", "utf8");
  assert.equal(onDisk, generateExampleCoverageModel(),
    "models/example-coverage.mage.yaml is stale -- run `node scripts/gen-example-coverage.ts`");
});

test("the coverage model loads clean and answers its own question", () => {
  // The coverage model is an ordinary MAGE file, and its assertions are ordinary saved queries with
  // an `expect`. Running them re-derives the matrix through the engine rather than trusting the
  // table the generator wrote.
  const ws = new Workspace(realPorts);
  const loaded = ws.load(readFileSync("models/example-coverage.mage.yaml", "utf8"));
  assert.ok(loaded.ok, "the coverage model must load");
  assert.deepEqual(loaded.findings, [], "the coverage model must validate clean");

  const unmet: string[] = [];
  for (const [id, saved] of ws.state.system.queries) {
    const raw = saved.raw as { expect?: unknown };
    const expect = typeof raw.expect === "string" ? raw.expect : null;
    assert.ok(expect !== null, `${id}: a generated coverage query must carry an expect`);
    const res = ws.query(saved.raw);
    if (res.outcome !== expect) unmet.push(`${id}: ${res.outcome}, expected ${expect}`);
  }
  assert.deepEqual(unmet, [], `coverage assertions unmet:\n  ${unmet.join("\n  ")}`);
});

test("EX-I3: the coverage model reports the gaps rather than omitting them", () => {
  // The honest answer to "does the shipped suite exercise every major public semantic capability?"
  // is no, and this is the assertion that keeps it from quietly becoming yes. Document Processing is
  // not shipped, so quantitative performance has no demonstration -- and the rows that would carry
  // it must be present and marked, not dropped.
  const report = deriveCoverage(examples());

  for (const id of ["quantitative-annotations", "performance", "requirements"]) {
    assert.equal(report.status.get(id), "unavailable",
      `${id} must be reported unavailable, with the construct that blocks it named`);
    assert.ok((report.missingConstructs.get(id) ?? []).length > 0, `${id} must name what blocks it`);
  }

  // The negative control for the whole model: a matrix where every row is green is a matrix nobody
  // can learn anything from, and would mean the detectors had stopped detecting.
  const covered = CAPABILITY_ROWS.filter((r) => report.status.get(r.id) === "exercised");
  assert.ok(covered.length >= 10, `only ${covered.length} capabilities exercised; the detectors look broken`);
  assert.ok(covered.length < CAPABILITY_ROWS.length,
    "every row green means the matrix is not measuring anything -- EX-I3 is not satisfied yet");

  // And the file itself must carry the rows, not just the report object.
  const yaml = readFileSync("models/example-coverage.mage.yaml", "utf8");
  for (const row of CAPABILITY_ROWS) {
    assert.ok(yaml.includes(`  capability.${row.id}:`), `${row.id} missing from the generated model`);
  }
  assert.match(yaml, /status: \{ value: unavailable, domain: coverage-status \}/,
    "an unavailable row must be visible in the file a reader opens");
});
