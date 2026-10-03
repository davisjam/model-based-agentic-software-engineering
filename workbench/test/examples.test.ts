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
import { ExampleCatalog } from "../src/app/examples.ts";
import type { AssetReader } from "../src/app/examples.ts";
import { createAgentApi } from "../src/app/agent-api.ts";
import type { CanonQuantity, CanonicalSystem, Evidence, QueryResult, Scalar } from "../src/ir/types.ts";
import { DIMENSIONS } from "../src/ir/types.ts";
import {
  CAPABILITY_ROWS, EXAMPLE_IDS, deriveCoverage, exampleText, generateExampleCoverageModel,
  loadExample, machineVocabulary, purposefulModels, realPorts, sharedIdentities,
  type EvidenceExpectation, type LoadedExample, type QuantitativeExpectation, type QueryExpectation,
} from "../scripts/gen-example-coverage.ts";

const examples = (): readonly LoadedExample[] => EXAMPLE_IDS.map(loadExample);

// The agent API now holds the example catalogue, because `examples()` and `loadExample()` must be
// the same object the human menu calls. In a test the catalogue reads the shipped files directly;
// in the page it reads them over `fetch`.
const fileAssets: AssetReader = (path) => Promise.resolve(readFileSync(path, "utf8"));
const catalogue = (workspace: Workspace): ExampleCatalog => new ExampleCatalog(workspace, fileAssets);

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

test("a requirement's status agrees with whatever decides it", () => {
  // MAGE v0.1 has no requirement construct, so a requirement lives in the fixture joined to the
  // thing that decides it. Without this check the join is a comment: a requirement could claim to be
  // satisfied by a query whose recorded outcome refutes it.
  //
  // Two routes, and the fixture reader already refuses a requirement declaring both or neither:
  //
  //   expressedAs  a saved query decides it. The outcome must agree with `satisfiedWhen`.
  //   decidedBy    the quantity query form decides it, run RIGHT HERE: `within:` the declared
  //                ceiling, the metric from the hand-derived expectation that is its oracle. These
  //                statuses carried `pending-evaluator` while nothing in src/ could decide them —
  //                a hand-derived figure must not read as machine-verified — and they read as
  //                verdicts now because the product reaches them.
  for (const ex of examples()) {
    assert.ok(ex.fixture.requirements.length > 0, `${ex.id}: section 2 asks for at least one requirement`);
    for (const req of ex.fixture.requirements) {
      if (req.expressedAs !== null) {
        const q = ex.fixture.queries.find((x) => x.id === req.expressedAs);
        assert.ok(q !== undefined, `${ex.id}/${req.id}: names query '${req.expressedAs}', which is not supplied`);
        const met = q.expected.outcome === req.satisfiedWhen;
        assert.equal(met, req.status === "satisfied",
          `${ex.id}/${req.id}: status '${req.status}' disagrees with '${q.id}' answering ${q.expected.outcome} ` +
          `against satisfied_when ${req.satisfiedWhen}`);
        continue;
      }
      const decider = ex.fixture.quantitativeExpectations.find((e) => e.id === req.decidedBy);
      assert.ok(decider !== undefined,
        `${ex.id}/${req.id}: names expectation '${String(req.decidedBy)}', which is not supplied`);
      assert.ok(decider.handDerived,
        `${ex.id}/${req.id}: the deciding expectation is the hand-derived oracle, and says so`);
      assert.ok(req.declaredAs !== null, `${ex.id}/${req.id}: a decided requirement names its declared ceiling`);
      const res = ex.workspace.query({
        kind: "quantity", quantifier: "forall",
        quantity: {
          metric: decider.metric === "memory" ? "peak_memory" : "latency",
          within: req.declaredAs,
        },
      });
      const verdict = res.outcome === "refuted" ? "violated"
        : res.outcome === "holds" ? "satisfied" : res.outcome;
      assert.equal(req.status, verdict,
        `${ex.id}/${req.id}: the fixture records '${req.status}'; the product decides '${res.outcome}'. ` +
        `The disagreement is the finding — do not adjust the fixture to match the code.`);
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
    const api = createAgentApi(ex.workspace, { target: null, selection: [] }, {}, () => {}, catalogue(ex.workspace));
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
    const api = createAgentApi(ex.workspace, { target: null, selection: [] }, {}, () => {}, catalogue(ex.workspace));
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
  const api = createAgentApi(ex.workspace, { target: null, selection: [] }, {}, () => {}, catalogue(ex.workspace));
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

// ----------------------------------------------------------------------------------------------
// document-processing: the quantitative half
//
// The accounting rulings put the join between a behavioral execution and a quantity on SHARED
// IDENTITY, and the IR cannot hold that join itself: an entity's `executes_in_state` is an ordinary
// property, so nothing stops it naming a state no machine declares. V27 resolves a quantity's
// `target` and its `when.state`; it has no opinion about a property. These tests are that missing
// half, plus the premise-checking that keeps the hand-derived numbers honest.
// ----------------------------------------------------------------------------------------------

/** Where a stage entity says it runs, for every entity that says so. */
const stageStates = (system: CanonicalSystem): ReadonlyMap<string, string> => {
  const out = new Map<string, string>();
  for (const e of system.entities.values()) {
    const state = e.properties.get("executes_in_state")?.value;
    if (state !== undefined) out.set(e.id, String(state));
  }
  return out;
};

/** A quantity's normalized magnitude in base units, taking one end of a range. */
function baseMagnitude(q: CanonQuantity, bound: "low" | "high"): number {
  const v = q.value;
  if (v.kind === "point") {
    assert.ok(v.magnitude.base !== null, `${q.id}: magnitude did not normalize`);
    return v.magnitude.base;
  }
  assert.equal(v.kind, "range", `${q.id}: expected a point or a range, got ${v.kind}`);
  const end = v.kind === "range" ? (bound === "high" ? v.high : v.low) : null;
  assert.ok(end?.base !== null && end?.base !== undefined, `${q.id}: range end did not normalize`);
  return end.base;
}

/** The state each configuration of a trace occupies, including the one it started in. */
function visitedStates(ev: Evidence, instance: string): readonly string[] {
  const steps = [...ev.steps, ...(ev.cycle ?? [])];
  const first = steps[0];
  if (first === undefined) return [];
  const seen = [String(first.from.control.get(instance))];
  for (const s of steps) seen.push(String(s.to.control.get(instance)));
  return seen;
}

test("document-processing: every stage names a lifecycle state, and every charged entity is a stage", () => {
  // The join entity accounting runs on. Two directions, and both matter.
  //
  // Forward: `executes_in_state` must name a state some machine declares, or the entity is charged
  // on the occupancy of nothing. Backward: an entity carrying a latency annotation must declare a
  // stage, or its occurrence is never counted and the quantity validates while reaching no analysis
  // -- which is the state V35-V37 exist to make unreachable, reproduced one level up in a property
  // the validator does not read.
  const system = loadExample("document-processing").workspace.state.system;
  const declared = new Set<string>();
  for (const m of system.machines.values()) for (const s of m.states) declared.add(`${m.id}.${s}`).add(s);

  const stages = stageStates(system);
  assert.ok(stages.size > 0, "the performance model must declare at least one stage");
  for (const [entity, state] of stages) {
    assert.ok(declared.has(state), `${entity}: executes_in_state '${state}' is not a declared state`);
  }

  for (const q of system.quantities.values()) {
    if (q.dimension !== "duration" || q.target.kind !== "entity") continue;
    assert.ok(stages.has(q.target.ref),
      `${q.id} charges entity '${q.target.ref}', which declares no executes_in_state -- under ` +
      `basis: entities its occurrences are never counted, so the quantity reaches no analysis`);
  }

  // And the cache is deliberately NOT a stage: its memory is charged by residency, not by a state's
  // occupancy. An entity declaring a stage AND a resident charge would be declaring both at once.
  for (const q of system.quantities.values()) {
    if (q.residency === null || q.target.kind !== "entity") continue;
    assert.ok(!stages.has(q.target.ref),
      `${q.target.ref} is resident and also declares a stage; residency already says every configuration`);
  }
});

test("document-processing: each hand-derived expectation's premises match the model and the engine", () => {
  // The numbers are a human's. Every INPUT to them is the product's, and this is where the two meet.
  // A premise that drifts -- a quantity retuned, a trace that changes shape, a ceiling edited in one
  // place -- fails the build instead of leaving a stale figure that still looks derived.
  const ex = loadExample("document-processing");
  const system = ex.workspace.state.system;
  const stages = stageStates(system);
  assert.ok(ex.fixture.quantitativeExpectations.length > 0, "the example must state its expectations");

  for (const e of ex.fixture.quantitativeExpectations) {
    assert.ok(e.handDerived, `${e.id}: this version evaluates no quantity, so every entry is hand-derived`);

    // Premise 1: the per-occurrence charges are the model's own normalized magnitudes.
    for (const [id, ms] of e.charges) {
      const q = system.quantities.get(id);
      assert.ok(q !== undefined, `${e.id}: charges name quantity '${id}', which the model does not declare`);
      assert.equal(q.dimension, "duration", `${e.id}/${id}: charged as a latency but declared ${String(q.dimension)}`);
      assert.equal(baseMagnitude(q, e.bound ?? "high"), ms,
        `${e.id}/${id}: the fixture charges ${ms} ms, the model declares something else`);
    }

    // Premise 2: the occurrence counts are the engine's, read off the witness trace through each
    // entity's declared stage. This is the half the product does supply, so it is checked, not
    // assumed -- and it is what makes a retry charge twice.
    if (e.traceFrom !== null) {
      const res = ex.workspace.query(savedRaw(system, e.traceFrom));
      assert.equal(res.outcome, "holds", `${e.id}: '${e.traceFrom}' must produce a witness`);
      assert.ok(res.evidence !== null, `${e.id}: '${e.traceFrom}' returned no evidence`);
      const machine = [...system.machines.keys()][0];
      assert.ok(machine !== undefined);
      const visits = visitedStates(res.evidence, machine);
      assert.ok(visits.length > 0, `${e.id}: the witness carries no configurations`);
      for (const [entity, count] of e.occurrences) {
        const state = stages.get(entity);
        assert.ok(state !== undefined, `${e.id}: '${entity}' declares no stage, so it has no occurrences`);
        const bare = state.includes(".") ? state.slice(state.lastIndexOf(".") + 1) : state;
        assert.equal(visits.filter((s) => s === bare).length, count,
          `${e.id}/${entity}: the fixture claims ${count} occurrence(s) of '${bare}' along '${e.traceFrom}'`);
      }
    }

    // Premise 3: the resident / when-charged split is the quantities' own declaration, and exactly
    // one `when` charge exists -- two would make summing them an upper bound rather than the peak,
    // because nothing here asks whether both named states can be active together.
    if (e.metric === "memory") {
      const memory = [...system.quantities.values()].filter(
        (q) => q.dimension === "memory" && q.target.kind === "entity");
      const resident = memory.filter((q) => q.residency !== null).map((q) => q.id).sort();
      const charged = memory.filter((q) => q.when !== null).map((q) => q.id).sort();
      assert.deepEqual([...e.residentMb.keys()].sort(), resident, `${e.id}: resident set is stale`);
      assert.deepEqual([...e.whenChargedMb.keys()].sort(), charged, `${e.id}: when-charged set is stale`);
      assert.equal(charged.length, 1,
        `${e.id}: ${charged.length} when-charged quantities. Summing more than one needs a JOINT ` +
        `reachability question -- whether both named states can be active in one configuration -- ` +
        `which this expectation does not ask.`);
      for (const [id, mb] of [...e.residentMb, ...e.whenChargedMb]) {
        const q = system.quantities.get(id);
        assert.ok(q !== undefined, `${e.id}: names quantity '${id}', which the model does not declare`);
        assert.equal(baseMagnitude(q, "high"), mb, `${e.id}/${id}: the fixture charges ${mb} MB`);
      }

      // Premise 4: a `when` charge whose state is unreachable enters memory(c) nowhere, so the
      // 256 MB summand is real only if the engine says the state is reached.
      assert.ok(e.reachabilityFrom !== null, `${e.id}: a memory peak must name the query deciding reachability`);
      const res = ex.workspace.query(savedRaw(system, e.reachabilityFrom));
      assert.equal(res.outcome, "holds",
        `${e.id}: '${e.reachabilityFrom}' does not establish that the when-charged state is reached`);
    }
  }
});

test("document-processing: each requirement's ceiling is the one the model declares", () => {
  // The ceiling has one source of truth -- a `model:`-targeted quantity, which SEMANTICS.md 5.3
  // exempts from every accounting basis precisely so it can be a declared total to compare against.
  // Without this check the fixture's `limit_ms` is a second copy free to drift from it.
  const system = loadExample("document-processing").workspace.state.system;
  const fixture = loadExample("document-processing").fixture;
  const decided = fixture.requirements.filter((r) => r.decidedBy !== null);
  assert.ok(decided.length > 0, "the example must carry a quantitative requirement");

  for (const req of decided) {
    assert.ok(req.declaredAs !== null, `${req.id}: must name the model: quantity carrying its ceiling`);
    const q = system.quantities.get(req.declaredAs);
    assert.ok(q !== undefined, `${req.id}: names quantity '${req.declaredAs}', which the model does not declare`);
    assert.equal(q.target.kind, "model",
      `${req.id}: a declared ceiling targets model:, not ${String(q.target.kind)} -- anything else is a summand`);
    assert.equal(baseMagnitude(q, "high"), req.limit, `${req.id}: the fixture's limit is not the declared one`);
    // A `model:` total declares no residency, and V37 reports one if it does. Asserted here too,
    // because this is the one place a reader learns why the exemption exists.
    assert.equal(q.residency, null, `${req.id}: a model-level total is compared against memory(c), never a summand`);
    assert.equal(q.when, null, `${req.id}: a model-level total declares no activation`);
  }
});

test("document-processing: the hand arithmetic adds up", () => {
  // A statement about the FIXTURE's own numbers, not about the product: given these charges and
  // these occurrence counts, does the stated total follow? It catches a typo in a sum that the
  // commit message also carries, and it catches nothing else. The product computing the same
  // figures is "the product computes a path latency" and its two siblings below.
  const ex = loadExample("document-processing");
  const system = ex.workspace.state.system;
  // Which quantity charges which entity is the MODEL's fact -- a quantity's `target` -- so the two
  // halves of the sum are joined through it rather than by matching names that happen to look alike.
  const chargedEntity = (quantityId: string): string =>
    String(system.quantities.get(quantityId)?.target.ref);

  for (const e of ex.fixture.quantitativeExpectations) {
    if (e.metric === "latency") {
      let total = 0;
      for (const [entity, count] of e.occurrences) {
        const charges = [...e.charges].filter(([id]) => chargedEntity(id) === entity);
        assert.ok(charges.length > 0, `${e.id}: no declared charge targets entity '${entity}'`);
        for (const [, ms] of charges) total += count * ms;
      }
      assert.equal(total, e.expected, `${e.id}: the occurrences and charges sum to ${total}, not ${e.expected}`);
      continue;
    }
    const resident = [...e.residentMb.values()].reduce((a, b) => a + b, 0);
    const active = [...e.whenChargedMb.values()].reduce((a, b) => a + b, 0);
    assert.equal(resident, e.baseline, `${e.id}: the resident total is the floor, and it is ${resident}`);
    assert.equal(resident + active, e.expected,
      `${e.id}: memory(c) at its peak is ${resident} + ${active}, not ${e.expected}`);
  }
});

// --- The three formerly-skipped assertions, live --------------------------------------------
//
// Each sat inert with a skip reason naming the missing mechanism: no query aggregated a quantity,
// and `$defs.result` carried no field for a magnitude. The `kind: quantity` query form is that
// mechanism — aggregation derived from the dimension's scope, the figure on `result.magnitude`
// with its dimension — so the skips are deleted and the assertions kept, against the fixture's
// hand-derived figures. A disagreement between the two is a FINDING about one side, never
// something to resolve by editing the other.

/** The hand-derived oracle entry behind a figure, fetched loudly. */
const expectationOf = (ex: LoadedExample, id: string): QuantitativeExpectation => {
  const e = ex.fixture.quantitativeExpectations.find((x) => x.id === id);
  assert.ok(e !== undefined, `${ex.id}: no quantitative expectation '${id}'`);
  return e;
};

test("the product computes a path latency", () => {
  const ex = loadExample("document-processing");
  const maxOracle = expectationOf(ex, "max-publishing-latency");
  const freeOracle = expectationOf(ex, "retry-free-latency");

  // The maximum, selected the way the question is asked: executions publishing on the last
  // permitted retry. 2,750 ms can only arise from four remediation passes charged per VISIT, so
  // the magnitude pins the occurrence accounting, not just a sum.
  const max = ex.workspace.query({
    kind: "quantity", quantifier: "exists",
    quantity: {
      metric: "latency",
      target: { "document-lifecycle.state": "published", "document-lifecycle.retry_count": 3 },
    },
  });
  assert.equal(max.outcome, "holds");
  assert.equal(max.coverage.kind, "exhaustive");
  assert.deepEqual(max.magnitude,
    { value: maxOracle.expected, dimension: "duration", unit: DIMENSIONS.duration.base },
    "the magnitude must carry the figure AND its dimension");
  assert.equal(max.evidence?.role, "witness");

  // The retry-free execution, inside the declared ceiling — what makes the counterexample above
  // informative: the ceiling is broken by the retry policy, not by a hopelessly slow pipeline.
  const free = ex.workspace.query({
    kind: "quantity", quantifier: "exists",
    quantity: {
      metric: "latency",
      target: { "document-lifecycle.state": "published", "document-lifecycle.retry_count": 0 },
    },
  });
  assert.equal(free.outcome, "holds");
  assert.equal(free.magnitude?.value, freeOracle.expected);
  assert.equal(free.magnitude?.dimension, "duration");
  const latencyReq = ex.fixture.requirements.find((r) => r.decidedBy === maxOracle.id);
  assert.ok(latencyReq !== undefined && latencyReq.limit !== null);
  assert.ok(freeOracle.expected <= latencyReq.limit,
    "the retry-free execution must sit inside the declared ceiling, or the example's lesson is gone");
  const last = free.evidence?.steps.at(-1);
  assert.equal(last?.to.control.get("document-lifecycle"), "published",
    "the witness must END at the selected configuration, or the figure is about something else");
});

test("the product computes memory(c) and a peak over reachable configurations", () => {
  const ex = loadExample("document-processing");
  const oracle = expectationOf(ex, "peak-memory");
  const res = ex.workspace.query({
    kind: "quantity", quantifier: "exists", quantity: { metric: "peak_memory" },
  });
  assert.equal(res.outcome, "holds");
  assert.equal(res.coverage.kind, "exhaustive");
  // memory(c) = resident + active, and the peak is their sum — both summands read from the
  // fixture's own declarations rather than re-stated here.
  const resident = [...oracle.residentMb.values()].reduce((a, b) => a + b, 0);
  const active = [...oracle.whenChargedMb.values()].reduce((a, b) => a + b, 0);
  assert.deepEqual(res.magnitude,
    { value: resident + active, dimension: "memory", unit: DIMENSIONS.memory.base });
  assert.equal(res.magnitude?.value, oracle.expected);
  assert.equal(res.evidence?.steps.at(-1)?.to.control.get("document-lifecycle"), "remediating",
    "the witness is the configuration where the when-charged quantity is active");
});

test("the product decides a declared requirement against its model: ceiling", () => {
  const ex = loadExample("document-processing");
  const decided = ex.fixture.requirements.filter((r) => r.decidedBy !== null);
  assert.ok(decided.length > 0, "the example must carry a quantitative requirement");

  for (const req of decided) {
    const oracle = expectationOf(ex, req.decidedBy ?? "");
    assert.ok(req.declaredAs !== null, `${req.id}: must name the model: quantity carrying its ceiling`);
    const res = ex.workspace.query({
      kind: "quantity", quantifier: "forall",
      quantity: {
        metric: oracle.metric === "memory" ? "peak_memory" : "latency",
        within: req.declaredAs,
      },
    });
    assert.equal(res.outcome, req.status === "violated" ? "refuted" : "holds",
      `${req.id}: the fixture records '${req.status}'; the product decides '${res.outcome}'`);
    assert.equal(res.magnitude?.value, oracle.expected,
      `${req.id}: the product computes ${String(res.magnitude?.value)}; the hand-derived oracle ` +
      `says ${oracle.expected}. The disagreement is the finding — do not adjust the fixture.`);
    if (res.outcome === "refuted") {
      assert.equal(res.evidence?.role, "counterexample",
        `${req.id}: a violated ceiling must carry the execution that breaks it`);
      assert.ok((res.evidence?.steps.length ?? 0) > 0);
    }
  }
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
  // is no, and this is the assertion that keeps it from quietly becoming yes.
  //
  // This test used to pin three rows as not-exercised, and two advances made that pinning wrong in
  // turn: landing the quantity construct moved quantitative-annotations off `unavailable`, and
  // shipping Document Processing exercised it outright. A snapshot of today's statuses fails on
  // every real advance, so what is asserted here is the INVARIANT -- every row present, every
  // `unavailable` row naming its blocker, and the matrix still reporting at least one gap.
  const report = deriveCoverage(examples());

  for (const row of CAPABILITY_ROWS) {
    const status = report.status.get(row.id);
    assert.ok(status !== undefined, `${row.id} must be present in the model, not dropped`);
    // Only an `unavailable` row owes a blocking construct -- that is the claim "MAGE cannot do this
    // yet", and an unnamed blocker makes it unfalsifiable. An `unexercised` row has nothing to name:
    // the construct is there and the examples simply do not reach for it.
    if (status === "unavailable") {
      assert.ok((report.missingConstructs.get(row.id) ?? []).length > 0, `${row.id} must name what blocks it`);
    } else {
      assert.deepEqual(report.missingConstructs.get(row.id) ?? [], [],
        `${row.id} names a blocking construct but is not reported unavailable`);
    }
  }

  // `performance` was the row to watch, and it reported `unavailable` for as long as no query
  // could aggregate a quantity and no result field could carry the magnitude -- the matrix
  // distinguished "represented and validated" from "evaluated" instead of blurring them into one
  // green cell. The `kind: quantity` query form closed exactly that gap: the schema probe finds
  // `magnitude` on the result shape, and the fixture's quantitative requirements carry verdicts
  // the product reaches. EX-I3 -- the example set collectively demonstrating quantitative
  // performance reasoning -- is satisfied for the first time, and this assertion is the flip.
  assert.equal(report.status.get("performance"), "exercised",
    "performance regressed to unavailable/unexercised -- EX-I3 was satisfied and must stay so");
  for (const id of ["quantitative-annotations", "declared-accounting",
    "path-quantity-accounting", "configuration-memory-accounting"]) {
    assert.equal(report.status.get(id), "exercised",
      `${id} is what Document Processing was built to demonstrate`);
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
