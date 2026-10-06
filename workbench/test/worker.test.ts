// The Worker boundary, tested at two levels that must not be confused.
//
// **The protocol in isolation**, with a fake `WorkerLike`: staleness, cancellation, the state
// vocabulary. These pin the client's decisions and nothing about whether a worker runs.
//
// **The real boundary**, on a `node:worker_threads` thread running the real
// `src/worker/analysis.worker.ts` through `test/worker-thread-host.mjs`: real serialization, real
// parse, real engine, real hash agreement. This half exists because the first half had passed for
// as long as the worker had never been instantiated by anything. "The protocol is tested" is not
// "the Worker runs", and conflating them is how a shipped 86 KB bundle stayed dead code.
//
// What is still NOT tested here, stated rather than implied: the browser's `Worker` constructor, a
// bundle served over HTTP, and `type: "module"` loading. node has no DOM `Worker`. Those three live
// in `test/browser/` and in the one line of `src/ui/main.ts` this wave hands over.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AnalysisClient } from "../src/worker/client.ts";
import type { WorkerLike } from "../src/worker/client.ts";
import type { AnalysisState, WorkerReply, WorkerRequest } from "../src/worker/protocol.ts";
import { WORKER_STEP_BUDGET } from "../src/worker/protocol.ts";
import type { QueryResult } from "../src/ir/types.ts";
import { MageDocument } from "../src/yaml/document.ts";
import {
  absentSubstrateProse, compileSystem, defaultOptions, exploreSpace, modelTypeForQueryKind,
} from "../src/engine/index.ts";
import { systemHash } from "../src/ir/hash.ts";
import { admit, evaluate, variable } from "../src/sparql/index.ts";
import type { SeamQuestion, SelectQuery } from "../src/sparql/index.ts";
import { entityIri, modelGraphIri, relationTypeIri } from "../src/rdf/iri.ts";
import { project } from "../src/rdf/project.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { createLazyAnalysisPort } from "../src/worker/port.ts";
import { onThread } from "./worker-fixtures.ts";

const result = (hash: string, bounded = false): QueryResult => ({
  outcome: bounded ? "inconclusive" : "refuted",
  coverage: bounded
    ? { kind: "bounded", statesExplored: 1_000_000, reason: "state-limit" }
    : { kind: "exhaustive", statesExplored: 37, reason: null },
  evidence: null, refusal: null, refusalDetail: null, interpretedAs: null, compilation: [], magnitude: null, systemHash: hash,
});

class FakeWorker implements WorkerLike {
  sent: WorkerRequest[] = [];
  #listener: ((event: { data: unknown }) => void) | null = null;
  terminated = false;
  postMessage(m: unknown): void { this.sent.push(m as WorkerRequest); }
  addEventListener(_t: "message", l: (event: { data: unknown }) => void): void { this.#listener = l; }
  terminate(): void { this.terminated = true; }
  reply(r: WorkerReply): void { this.#listener?.({ data: r }); }
  lastId(): number { return (this.sent.at(-1) as { id: number }).id; }
}

const harness = () => {
  const states: [AnalysisState, number][] = [];
  const worker = new FakeWorker();
  const client = new AnalysisClient(worker, { onState: (s, id) => states.push([s, id]) });
  return { worker, client, states };
};

// ----------------------------------------------------------------------------------------------
// The protocol in isolation
// ----------------------------------------------------------------------------------------------

test("a matching reply resolves with the result", async () => {
  const { worker, client, states } = harness();
  const p = client.analyze("", "fnv1a64:aaaa", { kind: "graph" });
  worker.reply({ kind: "result", id: worker.lastId(), systemHash: "fnv1a64:aaaa", result: result("fnv1a64:aaaa") });
  const out = await p;
  assert.equal(out.status, "ok");
  assert.deepEqual(states.map(([s]) => s), ["running", "complete"]);
});

test("a reply for a superseded model is STALE, not a result", async () => {
  const { worker, client, states } = harness();
  const p = client.analyze("", "fnv1a64:aaaa", { kind: "graph" });
  // The user edited while analysis ran; the worker answers about the OLD system.
  worker.reply({ kind: "result", id: worker.lastId(), systemHash: "fnv1a64:bbbb", result: result("fnv1a64:bbbb") });
  const out = await p;
  assert.equal(out.status, "stale", "a result for another revision must not reach the caller");
  assert.ok(states.some(([s]) => s === "stale"));
});

test("bounded coverage reports bounded, and the outcome is inconclusive", async () => {
  const { worker, client, states } = harness();
  const p = client.analyze("", "h", {});
  worker.reply({ kind: "result", id: worker.lastId(), systemHash: "h", result: result("h", true) });
  const out = await p;
  assert.equal(out.status, "ok");
  if (out.status === "ok") assert.equal(out.result.outcome, "inconclusive");
  assert.ok(states.some(([s]) => s === "bounded"), "the UI needs to distinguish bounded from complete");
});

test("cancellation settles without a result", async () => {
  const { worker, client } = harness();
  const p = client.analyze("", "h", {});
  const id = worker.lastId();
  client.cancel(id);
  worker.reply({ kind: "cancelled", id });
  assert.equal((await p).status, "cancelled");
  assert.deepEqual(client.inFlight(), []);
});

test("in-flight ids are visible, and a late duplicate reply is ignored", async () => {
  const { worker, client } = harness();
  const p = client.analyze("", "h", {});
  const id = worker.lastId();
  assert.deepEqual(client.inFlight(), [id]);
  worker.reply({ kind: "result", id, systemHash: "h", result: result("h") });
  await p;
  assert.deepEqual(client.inFlight(), []);
  worker.reply({ kind: "result", id, systemHash: "h", result: result("h") }); // must not throw
});

test("saved-query batch returns a map", async () => {
  const { worker, client } = harness();
  const p = client.analyzeSaved("", "h");
  worker.reply({ kind: "results", id: worker.lastId(), systemHash: "h", results: [["q1", result("h")]] });
  const out = await p;
  assert.equal(out.status, "ok-many");
  if (out.status === "ok-many") assert.equal(out.results.get("q1")?.outcome, "refuted");
});

test("an incomplete walk reads BOUNDED, and a complete one reads complete", async () => {
  const { worker, client, states } = harness();
  const bounded = client.explore("", "h", 10);
  worker.reply({
    kind: "exploration", id: worker.lastId(), systemHash: "h",
    space: { statesExplored: 10, complete: false, stopReason: "state-limit", deadEnds: 0, notes: [], limit: 10 },
  });
  const hit = await bounded;
  assert.equal(hit.status, "ok-space");
  assert.ok(states.some(([s]) => s === "bounded"), "a walk stopped by its ceiling is not complete");

  const whole = client.explore("", "h", 10);
  worker.reply({
    kind: "exploration", id: worker.lastId(), systemHash: "h",
    space: { statesExplored: 4, complete: true, stopReason: "complete", deadEnds: 1, notes: [], limit: 10 },
  });
  const done = await whole;
  assert.equal(done.status, "ok-space");
  if (done.status === "ok-space") assert.equal(done.space.stopReason, "complete");
});

test("a SECOND exhaustion in the Worker is bounded, never an empty answer", async () => {
  // The honest bound surviving the crossing. If this collapsed into `select` with no rows, the
  // caller would read "no solutions" from "we ran out of budget" -- the exact dead end the fourth
  // result arm exists to prevent, reintroduced one layer up.
  const { worker, client, states } = harness();
  const p = client.evaluateQuestion("", "h", [BEHAVIORAL], SELECT_X);
  worker.reply({
    kind: "evaluation", id: worker.lastId(), systemHash: "h",
    evaluation: { kind: "exhausted", steps: 20_000_000, budget: 20_000_000, prose: "spent" },
  });
  const out = await p;
  assert.equal(out.status, "ok-evaluation");
  if (out.status === "ok-evaluation") {
    assert.equal(out.evaluation.kind, "exhausted");
    if (out.evaluation.kind === "exhausted") assert.equal(out.evaluation.budget, 20_000_000);
  }
  assert.ok(states.some(([s]) => s === "bounded"));
});

test("a worker that never replies fails LOUDLY rather than pending forever", async () => {
  // The failure a `failed` reply cannot express: the bundle 404s, or the module throws at import.
  // Without `abort` every promise waits for a message that is never coming, which is a silent empty
  // result that does not even arrive.
  const { client } = harness();
  const p = client.analyze("", "h", {});
  client.abort("the analysis worker failed to run (./dist/analysis.worker.js)");
  const out = await p;
  assert.equal(out.status, "failed");
  if (out.status === "failed") assert.match(out.messages[0] ?? "", /failed to run/);
  assert.deepEqual(client.inFlight(), [], "an aborted request must not stay listed as running");
});

test("the page's port spawns nothing until the first long analysis", () => {
  // node's missing DOM `Worker` makes the laziness claim testable from the other side: if building
  // the port spawned a worker, this would throw `Worker is not defined`. It does not. So the 350 KB
  // worker bundle is fetched by the person who asked for a long walk, not by every visitor of a page
  // that only ever renders a small model.
  //
  // What node cannot test is the other half -- that the FIRST call does spawn one. That needs a DOM
  // `Worker`, and it belongs with the browser tier.
  assert.equal(typeof (globalThis as { Worker?: unknown }).Worker, "undefined",
    "if node grew a Worker global, this test would stop proving anything");
  const port = createLazyAnalysisPort("./dist/analysis.worker.js", { onState: () => {} });
  assert.deepEqual(port.inFlight(), [], "nothing is running, because nothing has started");
  port.cancel(1); // must not throw: there is no thread to cancel yet
});

// ----------------------------------------------------------------------------------------------
// Immutability, asserted over the worker's own source
// ----------------------------------------------------------------------------------------------
//
// UX-I3 says every edit normalises to the ONE IR behind the facade. The Worker holds a SECOND copy
// of the IR on another thread, so the invariant survives only while that copy is write-only to
// nobody: the Worker may analyse and must never mutate. Two things hold it structurally, and a
// comment holds neither, so both are checked here.

const WORKER_SOURCE = readFileSync("src/worker/analysis.worker.ts", "utf8");
const PROTOCOL_SOURCE = readFileSync("src/worker/protocol.ts", "utf8");

/** Import specifiers a module reaches for, in source order. */
const importsOf = (source: string): readonly string[] =>
  [...source.matchAll(/from "([^"]+)"/g)].map((m) => m[1] ?? "");

test("the worker cannot apply a transaction, because it imports nothing that can", () => {
  const specifiers = importsOf(WORKER_SOURCE);
  assert.ok(specifiers.length > 3, `expected the worker to import several modules, saw ${specifiers.length}`);
  assert.deepEqual(specifiers.filter((s) => s.includes("/transaction/")), [],
    "the worker reached the transaction engine: a thread holding a second IR copy must not be able "
    + "to commit to it (UX-I3)");
  assert.deepEqual(specifiers.filter((s) => s.includes("/ui/")), [],
    "the worker reached the UI: the component model's kernel/host boundary runs the other way");
});

test("the predicate actually fires -- negative control", () => {
  // A check that can only pass is not a check. This is the import the real one must reject.
  assert.deepEqual(importsOf('import { TransactionEngine } from "../transaction/engine.ts";'),
    ["../transaction/engine.ts"]);
});

test("no reply arm carries a model back across the boundary", () => {
  // The other half, and the one that matters more: even with no transaction engine on that thread,
  // a reply carrying a document or source text would let the HOST load what the worker produced,
  // which is a second write path into the model wearing an analysis result's clothes.
  const start = PROTOCOL_SOURCE.indexOf("export type WorkerReply");
  assert.ok(start > 0, "WorkerReply must be declared in protocol.ts");
  const end = PROTOCOL_SOURCE.indexOf("export type AnalysisState", start);
  assert.ok(end > start, "the slice must end at the next declaration, not at the file's end");
  const replyUnion = PROTOCOL_SOURCE.slice(start, end);

  for (const forbidden of ["source", "document", "system:", "transaction", "operations"]) {
    assert.ok(!replyUnion.includes(forbidden),
      `the reply union declares '${forbidden}'; a reply must carry an analysis and nothing a caller `
      + "could load");
  }
  // And the positive shape, so the slice is not passing by being empty.
  assert.ok(replyUnion.includes("systemHash"), "every reply still carries the hash it describes");
});

// ----------------------------------------------------------------------------------------------
// The real boundary: the real worker module, on a real thread
// ----------------------------------------------------------------------------------------------

const DOCABLE = readFileSync("examples/docable.mage.yaml", "utf8");

const docableSystem = (): CanonicalSystem => {
  const loaded = MageDocument.load(DOCABLE);
  assert.ok(loaded.document !== null, "the worked example must parse");
  return loaded.document.system();
};

test("a real round trip: the worker derives the SAME hash, so the reply is not stale", async () => {
  // The claim no fake can make. The host hashes its IR, the worker independently parses the same
  // bytes and hashes its own, and the client compares the two. A `stale` here would mean the two
  // sides disagree about the model -- which would make every real request stale forever while every
  // protocol test stayed green.
  const thread = onThread();
  try {
    const hash = systemHash(docableSystem());
    const out = await thread.client.analyze(DOCABLE, hash, {
      kind: "graph", quantifier: "exists",
      graph: { form: "reachability", relation: "may_invoke", from: "api", to: "gateway" },
    });
    assert.equal(out.status, "ok",
      `expected a result, got ${out.status}${out.status === "failed" ? `: ${out.messages.join("; ")}` : ""}`);
    if (out.status !== "ok") return;
    assert.equal(out.result.systemHash, hash, "the worker must answer about the system it was sent");
    assert.equal(out.result.outcome, "holds", "api reaches gateway through remediation");
  } finally {
    thread.stop();
  }
});

test("a behavioural witness survives the crossing, configurations and all", async () => {
  // Evidence steps carry `StepConfiguration` — plain records, not the walk's Maps — because
  // evidence is a published artifact and `JSON.stringify` drops a Map silently (`{}`). Structured
  // clone would have carried a Map across this boundary fine; the page's own `JSON.stringify`
  // would not, and the agent seam is the reader that matters. So the pin is on the serializable
  // form arriving WITH its contents: a witness whose states are empty is no witness.
  const thread = onThread();
  try {
    const system = docableSystem();
    const saved = system.queries.get("document-can-return-to-waiting");
    assert.ok(saved !== undefined, "the example saves a behavioural question with a witness");
    const out = await thread.client.analyze(DOCABLE, systemHash(system), saved.raw);
    assert.equal(out.status, "ok");
    if (out.status !== "ok") return;
    const evidence = out.result.evidence;
    assert.ok(evidence !== null, "this question's answer carries a trace");
    assert.ok(evidence.steps.length > 0, "a trace with no steps is not a witness");
    const first = evidence.steps[0];
    assert.ok(first !== undefined);
    assert.ok(!(first.from.control instanceof Map) && typeof first.from.control === "object",
      "a step's configuration arrives as a plain record, the published wire shape");
    assert.ok(Object.keys(first.from.control).length > 0,
      "and with its contents — JSON.stringify of this step must say which state the system was in");
    assert.deepEqual(JSON.parse(JSON.stringify(first)), first,
      "the step survives a JSON round-trip unchanged, which is what an in-page reader does to it");
  } finally {
    thread.stop();
  }
});

test("exploration in the Worker agrees with the synchronous walk, state for state", async () => {
  // The equivalence that makes the Worker trustworthy. A model small enough to walk both ways, so
  // the two numbers are comparable rather than merely both plausible.
  const thread = onThread();
  try {
    const system = docableSystem();
    const compiled = compileSystem(system);
    assert.ok(compiled.ok, "the worked example must compile");
    if (!compiled.ok) return;
    const LIMIT = 5_000;
    const here = exploreSpace(compiled.value, defaultOptions(LIMIT));

    const out = await thread.client.explore(DOCABLE, systemHash(system), LIMIT);
    assert.equal(out.status, "ok-space",
      `expected a space, got ${out.status}${out.status === "failed" ? `: ${out.messages.join("; ")}` : ""}`);
    if (out.status !== "ok-space") return;
    assert.equal(out.space.statesExplored, here.statesExplored,
      "the two threads walked the same space and must have counted the same configurations");
    assert.equal(out.space.complete, here.complete);
    assert.equal(out.space.stopReason, here.stopReason);
    assert.equal(out.space.deadEnds, here.deadEnds.length);
    assert.deepEqual(out.space.notes, here.notes,
      "a disclosed rewrite must not be lost at the boundary");
    assert.ok(out.space.statesExplored > 1, "a space of one configuration would witness nothing");
  } finally {
    thread.stop();
  }
});

// A licensed question over `may_invoke`, which docable declares `composition.path: allowed`.
const COMPOSING: SeamQuestion = {
  kind: "relational", relation: "may_invoke", traversal: "composing", evidence: "bindings",
  scope: { kind: "system-union" }, subset: { kind: "within-subset" },
};

// A behavioural subject, for the protocol-level tests above: the gate ROUTES it, so no evaluation
// happens and the test is about the client rather than about the evaluator.
const BEHAVIORAL: SeamQuestion = { kind: "behavioral", asked: "will it eventually publish?" };

const X = variable("x");

/** `SELECT ?x WHERE { GRAPH <service-flow> { <api> may_invoke+ ?x } }` over docable's projection. */
const SELECT_X: SelectQuery = {
  kind: "select", select: [X], from: null,
  where: [{
    kind: "graph", name: modelGraphIri("docable", "service-flow"),
    patterns: [{
      kind: "bgp",
      triples: [{
        subject: entityIri("docable", "api"),
        predicate: { kind: "path-one-or-more", path: relationTypeIri("docable", "may_invoke") },
        object: X,
      }],
    }],
  }],
  groupBy: null, orderBy: null, limit: null,
};

test("an exhausted question reaches the Worker and comes back RESOLVED", async () => {
  // Both halves of the routing, measured rather than assumed. The synchronous evaluator is given a
  // budget it cannot finish in and returns the fourth arm; the same question, re-issued to the
  // Worker with the Worker's budget, returns the rows. Before this the fourth arm said "route it to
  // the analysis Worker" and no route existed.
  const system = docableSystem();
  const admission = admit(system, COMPOSING);
  assert.equal(admission.kind, "licensed", "docable declares may_invoke as composing");
  if (admission.kind !== "licensed") return;

  const spent = evaluate(project(system), SELECT_X, admission.question, 2);
  assert.equal(spent.kind, "exhausted", "a 2-step budget must not finish a one-or-more path");
  if (spent.kind !== "exhausted") return;
  assert.match(spent.prose, /Worker/, "the arm names where the question should go");

  const thread = onThread();
  try {
    const out = await thread.client.evaluateQuestion(
      DOCABLE, systemHash(system), [COMPOSING], SELECT_X, WORKER_STEP_BUDGET);
    assert.equal(out.status, "ok-evaluation",
      `expected an evaluation, got ${out.status}${out.status === "failed" ? `: ${out.messages.join("; ")}` : ""}`);
    if (out.status !== "ok-evaluation") return;
    assert.equal(out.evaluation.kind, "select",
      "the budget the Worker can afford resolves what the interactive budget could not");
    if (out.evaluation.kind !== "select") return;
    const bound = out.evaluation.rows.map((row) => row.find(([name]) => name === "x")?.[1].value);
    // Looked up through the same minter the projection uses, so a change to the IRI scheme cannot
    // leave a stale snapshot passing here.
    assert.deepEqual(bound.sort(),
      [entityIri("docable", "gateway").value, entityIri("docable", "remediation").value].sort(),
      "api may_invoke+ reaches remediation directly and gateway through it");
  } finally {
    thread.stop();
  }
});

test("the licensing gate runs on the worker thread too, because the brand cannot cross", async () => {
  // A `LicensedQuestion`'s brand is a `unique symbol`; no serializer carries it. So the worker
  // re-admits, and a question the model declines is declined on BOTH threads. `owns` is docable's
  // `composition.path: forbidden` relation, included in the example for exactly this.
  const thread = onThread();
  try {
    const system = docableSystem();
    const forbidden: SeamQuestion = { ...COMPOSING, relation: "owns" };
    assert.equal(admit(system, forbidden).kind, "refused", "owns forbids path composition");

    const out = await thread.client.evaluateQuestion(
      DOCABLE, systemHash(system), [forbidden], SELECT_X);
    assert.equal(out.status, "ok-evaluation");
    if (out.status !== "ok-evaluation") return;
    assert.equal(out.evaluation.kind, "refused",
      "the worker must not evaluate a question the model declines");
    if (out.evaluation.kind !== "refused") return;
    assert.ok(out.evaluation.refusal.wouldLicense.length > 0,
      "a refusal that crosses the boundary must keep what would license the question");
  } finally {
    thread.stop();
  }
});

test("the worker admits EVERY subject it was sent, not the first one", async () => {
  // The gate on this thread has to be as strong as the gate on the other one. A licensed subject
  // first and an unlicensed one second is the arrangement that passes a worker which admits
  // `questions[0]` and stops -- and a SPARQL query traversing two relation types produces exactly
  // that list.
  const thread = onThread();
  try {
    const system = docableSystem();
    const forbidden: SeamQuestion = { ...COMPOSING, relation: "owns" };
    const out = await thread.client.evaluateQuestion(
      DOCABLE, systemHash(system), [COMPOSING, forbidden], SELECT_X, WORKER_STEP_BUDGET);
    assert.equal(out.status, "ok-evaluation");
    if (out.status !== "ok-evaluation") return;
    assert.equal(out.evaluation.kind, "refused",
      "a licensed subject must not carry an unlicensed one into evaluation beside it");
    if (out.evaluation.kind !== "refused") return;
    assert.deepEqual(out.evaluation.refusal.missing,
      ["path-composition semantics for relation type 'owns'"]);
  } finally {
    thread.stop();
  }
});

test("a request with NO subject is refused on the worker thread, not evaluated", async () => {
  // The empty list, at the real boundary. `event.data as WorkerRequest` is an unchecked cast, so the
  // type cannot be the control here: a wire message carrying `questions: []` would run the loop zero
  // times, refuse nothing, and evaluate behind a gate that was never consulted.
  const thread = onThread();
  try {
    const system = docableSystem();
    const out = await thread.client.evaluateQuestion(
      DOCABLE, systemHash(system), [], SELECT_X, WORKER_STEP_BUDGET);
    assert.equal(out.status, "ok-evaluation");
    if (out.status !== "ok-evaluation") return;
    assert.equal(out.evaluation.kind, "refused", "nothing to gate is not a licence to evaluate");
    if (out.evaluation.kind !== "refused") return;
    assert.equal(out.evaluation.refusal.cause, "unknown-vocabulary");
    assert.ok(out.evaluation.refusal.wouldLicense.length > 0);
  } finally {
    thread.stop();
  }
});

test("the brand cannot be forged: evaluation is unreachable without admit", () => {
  // The control, read off the source rather than argued. `evaluate`'s question parameter is the
  // branded type; `license` is the only cast that produces one and it is module-private to
  // `licensing.ts`; `admit` is the only exported function that returns one. If a second producer
  // appeared, this fails -- which is the whole value of the brand being unforgeable by construction
  // rather than by everyone remembering to call the gate.
  const licensing = readFileSync("src/sparql/licensing.ts", "utf8");
  assert.match(licensing, /declare const LICENSED: unique symbol;/,
    "the brand must stay a declared-never-defined unique symbol, which no module can write");
  assert.deepEqual([...licensing.matchAll(/as LicensedQuestion/g)].length, 1,
    "exactly one cast may produce the brand");
  assert.match(licensing, /const license = /,
    "and it must be inside `license`, which is not exported");
  assert.deepEqual([...licensing.matchAll(/^export (?:function|const) \w+/gm)]
    .map((m) => m[0]).filter((d) => d.includes("license")), ["export const licensesTraversal"],
    "`license` itself must not be exported; only the predicate with a similar name is");

  // And the other half: the protocol carries the gate's INPUT, never its output. A `LicensedQuestion`
  // in a request arm would be a brand a sender could claim without having passed the gate. Checked
  // over the IMPORTS, not the prose -- the module's own doc comment explains why the brand cannot
  // cross, and a field cannot be typed with a type the module never imported.
  assert.doesNotMatch(PROTOCOL_SOURCE, /import[^;]*\bLicensedQuestion\b/,
    "the wire protocol must not import the branded type: the gate runs per thread, by re-admission");
  assert.match(PROTOCOL_SOURCE, /import[^;]*\bSeamQuestion\b/,
    "it imports the UNBRANDED question instead, which is what a checker takes");
});

test("a worker failure arrives as a finding, not as an empty result", async () => {
  // Source the worker cannot parse. The honest outcome is the reader's own findings, carried as a
  // failure -- not a space of zero configurations, which a caller cannot distinguish from a model
  // with no behaviour.
  const thread = onThread();
  try {
    const out = await thread.client.explore("mage: 1\n  : : not yaml : :\n", "fnv1a64:0", 100);
    assert.equal(out.status, "failed", "unparseable source must fail, not resolve empty");
    if (out.status !== "failed") return;
    assert.ok(out.messages.length > 0, "and the failure must say what was wrong");
    assert.ok((out.messages[0] ?? "").length > 10);
  } finally {
    thread.stop();
  }
});

// ----------------------------------------------------------------------------------------------
// The substrate-absence rung, at the arm that walked the space without consulting it
// ----------------------------------------------------------------------------------------------

/**
 * Source declaring relation types and entities and NO `machines:`.
 *
 * Text rather than an IR, because the Worker takes bytes: this fixture has to cross the port and be
 * canonicalized on the other thread, which is the only version of this test that proves anything.
 */
const MACHINELESS = `mage: 1
system:
  id: t
relation-types:
  may_invoke:
    description: The design permits the source to invoke the target.
    composition:
      path: allowed
entities:
  api: null
  gateway: null
`;

test("exploring a machineless system refuses, rather than reporting one dead end", async () => {
  // What this arm answered before the rung, driven: `ok-space` with one state, `complete: true`,
  // and ONE DEAD END. The count is arguably true of the space -- a machineless system has one empty
  // configuration and no successors -- and that is what made it dangerous. A reader shown "1 dead
  // end" reads a finding about their system, so the number is a confident structural claim computed
  // over a system that models no behaviour: the `latency: 0 ms` defect in the explorer's clothing.
  //
  // The three analysis arms beside this one inherit the rung from `runQuery` / `runSavedQueries`.
  // This one called `exploreSpace` with a COMPILED system, which never sees the registry.
  const system = MageDocument.load(MACHINELESS).document?.system();
  assert.ok(system !== undefined, "the fixture must parse");
  assert.equal(system.machines.size, 0, "fixture drift: the point of it is the absent machines");

  const thread = onThread();
  try {
    const out = await thread.client.explore(MACHINELESS, systemHash(system), 1_000);
    assert.equal(out.status, "failed",
      `expected a refusal, got ${out.status}${out.status === "ok-space" ? ` with ${out.space.deadEnds} dead ends` : ""}`);
    if (out.status !== "failed") return;

    // The sentence is the ENGINE's, generated from the registry entry rather than retyped here --
    // the same arrangement the SPARQL seam uses, and the reason a reader meets one wording of one
    // absence through all three doors. The finding's prefix is the carrier; the sentence is the claim.
    const expected = absentSubstrateProse(modelTypeForQueryKind("behavior"));
    assert.equal(out.messages.length, 1);
    assert.ok((out.messages[0] ?? "").endsWith(expected),
      `the refusal must be the registry's own sentence, got: ${out.messages[0] ?? ""}`);
  } finally {
    thread.stop();
  }
});

test("a system WITH machines still explores, so the rung has not swallowed the arm", async () => {
  // The control. Every assertion above would pass against an arm that refused everything, and the
  // equivalence test earlier in this file is about agreement rather than about the rung.
  const thread = onThread();
  try {
    const system = docableSystem();
    assert.ok(system.machines.size > 0);
    const out = await thread.client.explore(DOCABLE, systemHash(system), 5_000);
    assert.equal(out.status, "ok-space");
    if (out.status !== "ok-space") return;
    assert.ok(out.space.statesExplored > 1);
  } finally {
    thread.stop();
  }
});
