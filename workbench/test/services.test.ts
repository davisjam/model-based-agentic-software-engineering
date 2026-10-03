// The facade, now that it delegates revision history to the TransactionEngine.
//
// These pin the thing that was previously impossible: a transaction actually committing through the
// single seam. Before this, `transactions.apply` could only refuse, because the facade held an IR
// and a transaction needs the DOCUMENT -- which is where the comments live.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runQuery } from "../src/engine/index.ts";
import { renderView } from "../src/render/index.ts";
import { NEW_SYSTEM, Workspace } from "../src/app/services.ts";
import type { Ports, SparqlAnswer } from "../src/app/services.ts";
import { CAPABILITIES, checkAffordanceParity } from "../src/app/capabilities.ts";
import { ExampleCatalog, UnknownExampleError } from "../src/app/examples.ts";
import type { AssetReader } from "../src/app/examples.ts";
import { createAgentApi } from "../src/app/agent-api.ts";
import { checkPropertyGrounding } from "../src/app/properties.ts";
import { EXAMPLE_IDS, readFixture } from "../scripts/gen-example-coverage.ts";
import { admit } from "../src/sparql/index.ts";
import type { ExhaustedEscalation, SeamQuestion } from "../src/sparql/index.ts";
import { entityIri, modelGraphIri, relationTypeIri } from "../src/rdf/iri.ts";
import { onThread } from "./worker-fixtures.ts";

// The real renderer rather than a stub. The render port now speaks the renderer's own types, so a
// hand-written stub here would be a third copy of a shape that already has one owner -- and the
// previous stub's empty accessible twin was exactly the kind of value the a11y tests exist to
// reject. These tests do not render; wiring the real one costs nothing and cannot drift.
const ports: Ports = {
  engine: {
    graphQuery: (system, query) => runQuery(system, query).result,
    behaviorQuery: (system, query) => runQuery(system, query).result,
    explore: () => ({ configurations: [], exhaustive: false }),
  },
  render: { render: (system, request) => renderView(system, request) },
};

const docable = () => readFileSync("examples/docable.mage.yaml", "utf8");
const loaded = (): Workspace => {
  const ws = new Workspace(ports);
  const r = ws.load(docable());
  assert.ok(r.ok, "the worked example must load");
  return ws;
};

test("a transaction COMMITS through the facade", () => {
  const ws = loaded();
  const before = ws.state.hash;
  const r = ws.transact({
    transaction: {
      base: before,
      operations: [{ op: "set-label", id: "gateway", value: "Model Gateway (public only)" }],
    },
  });
  assert.ok(r.ok, `expected a commit, got: ${r.findings.map((f) => f.message).join("; ")}`);
  assert.notEqual(ws.state.hash, before, "committing must advance the semantic revision");
  assert.equal(ws.state.system.entities.get("gateway")?.label, "Model Gateway (public only)");
});

test("a base-hash mismatch is refused loudly, and changes nothing", () => {
  const ws = loaded();
  const before = ws.state.hash;
  const r = ws.transact({
    transaction: {
      base: "fnv1a64:0000000000000000",
      operations: [{ op: "set-label", id: "gateway", value: "nope" }],
    },
  });
  assert.ok(!r.ok, "a stale base must not apply");
  assert.equal(ws.state.hash, before, "a rejected transaction must leave the system identical");
  assert.match(r.findings.map((f) => f.message).join(" "), /expected/);
});

test("undo and redo come from the engine's revision history", () => {
  const ws = loaded();
  const original = ws.state.system.entities.get("gateway")?.label;
  ws.transact({ transaction: { base: ws.state.hash,
    operations: [{ op: "set-label", id: "gateway", value: "Renamed" }] } });
  assert.ok(ws.state.canUndo);
  assert.ok(ws.undo());
  assert.equal(ws.state.system.entities.get("gateway")?.label, original, "undo must restore the label");
  assert.ok(ws.redo());
  assert.equal(ws.state.system.entities.get("gateway")?.label, "Renamed");
});

test("export preserves comments after a commit", () => {
  // The whole reason the engine owns the document: a transaction must not cost the file its
  // annotations. The example is full of load-bearing comments.
  const ws = loaded();
  ws.transact({ transaction: { base: ws.state.hash,
    operations: [{ op: "set-label", id: "gateway", value: "Still Commented" }] } });
  const out = ws.export();
  assert.match(out, /# Worked example for the MAGE Model Workbench/, "the header comment must survive");
  // An INTERIOR comment, deep in the file, not just the header — and one chosen by reading the
  // example rather than assumed. My first attempt asserted a comment that was never in this file,
  // which the test correctly reported as a failure of the test.
  assert.match(out, /Ordered domains make the cross-model security join well typed/,
    "an interior comment must survive");
  // Surgical fidelity: a set-label changes the label and nothing else, so the file grows by exactly
  // the difference in the scalar. This is the claim Phase D measured, asserted rather than trusted.
  const original = docable();
  assert.equal(out.length - original.length, "Still Commented".length - "Model Gateway".length,
    "a set-label must change only that scalar");
  assert.match(out, /Still Commented/, "and the edit must be present");
});

test("a hypothesis is a separate engine; discarding restores the authoritative one untouched", () => {
  const ws = loaded();
  const authoritative = ws.state.hash;
  const r = ws.openHypothesis("rename the gateway", {
    transaction: { base: authoritative,
      operations: [{ op: "set-label", id: "gateway", value: "Hypothetical" }] },
  });
  assert.ok(r.ok, `hypothesis should open: ${r.findings.map((f) => f.message).join("; ")}`);
  assert.equal(ws.state.hypothesis, "rename the gateway");
  assert.equal(ws.state.system.entities.get("gateway")?.label, "Hypothetical");

  assert.ok(ws.discardHypothesis());
  assert.equal(ws.state.hypothesis, null);
  assert.equal(ws.state.hash, authoritative,
    "analysis of a hypothesis must not change the authoritative model's identity");
});

test("a second hypothesis is refused while one is open", () => {
  const ws = loaded();
  ws.openHypothesis("first", { transaction: { base: ws.state.hash,
    operations: [{ op: "set-label", id: "gateway", value: "A" }] } });
  const second = ws.openHypothesis("second", { transaction: { base: ws.state.hash,
    operations: [{ op: "set-label", id: "gateway", value: "B" }] } });
  assert.ok(!second.ok);
  assert.match(second.findings[0]?.message ?? "", /already open/);
});

test("unparseable text is refused and does not replace the loaded model", () => {
  const ws = loaded();
  const before = ws.state.hash;
  const r = ws.load("mage: 1\n  : : not yaml : :\n");
  assert.ok(!r.ok);
  assert.equal(ws.state.hash, before, "a failed load must not discard the current model");
});

test("saved queries re-run against the CURRENT system after a commit", () => {
  const ws = loaded();
  const first = ws.runSavedQueries();
  assert.ok(first.size > 0);
  for (const r of first.values()) assert.equal(r.systemHash, ws.state.hash);

  ws.transact({ transaction: { base: ws.state.hash,
    operations: [{ op: "set-label", id: "gateway", value: "Changed" }] } });
  const second = ws.runSavedQueries();
  for (const r of second.values()) {
    assert.equal(r.systemHash, ws.state.hash, "every result must carry the hash it describes");
  }
});

// ----------------------------------------------------------------------------------------------
// Long analysis through the facade, into the real Worker
// ----------------------------------------------------------------------------------------------
//
// The gap these close: the Worker shipped, CI asserted the bundle into the published artifact, and
// nothing instantiated it. A facade test is where that shows, because the facade is the only place a
// caller can reach -- so these drive `Ports.analysis` exactly as the page will.

/** The facade over the real worker thread. */
const withWorker = (): { readonly ws: Workspace; readonly stop: () => void } => {
  const thread = onThread();
  const ws = new Workspace({ ...ports, analysis: thread.client });
  const r = ws.load(docable());
  assert.ok(r.ok, "the worked example must load");
  return { ws, stop: thread.stop };
};

test("without a Worker, a long exploration REFUSES and names what would run it", async () => {
  // Not an empty configuration set. A space of zero configurations marked incomplete is literally
  // true and operationally a lie: a reader cannot tell it from a model with no reachable behaviour.
  const ws = loaded();
  const out = await ws.explore();
  assert.equal(out.status, "failed", "a host with no page has no Worker, and must say so");
  if (out.status !== "failed") return;
  assert.match(out.messages[0] ?? "", /no analysis worker is wired/);
  assert.match(out.messages[0] ?? "", /Ports\.analysis/,
    "a refusal must name the change that would license the question");
});

test("a long exploration reaches the Worker and leaves the model EXACTLY where it was", async () => {
  // UX-I3 at the thread boundary. The Worker holds a second copy of the IR, so the invariant holds
  // only while that copy is write-only to nobody -- and the observable form of "the Worker cannot
  // mutate" is that a round trip moves neither the hash nor the bytes.
  const { ws, stop } = withWorker();
  try {
    const before = ws.state.hash;
    const text = ws.export();
    const out = await ws.explore(5_000);
    assert.equal(out.status, "ok-space",
      `expected a space, got ${out.status}${out.status === "failed" ? `: ${out.messages.join("; ")}` : ""}`);
    if (out.status !== "ok-space") return;
    assert.ok(out.space.statesExplored > 1, "a space of one configuration would witness nothing");

    assert.equal(ws.state.hash, before, "a Worker round trip must not advance the semantic revision");
    assert.equal(ws.export(), text, "nor change a byte of the document");
    assert.equal(ws.state.canUndo, false, "and must leave no revision to undo");
  } finally {
    stop();
  }
});

test("UX-I2: an agent reaches the same long analysis, over the same Worker", async () => {
  // Same service, not two paths that look alike. `window.mage.analysis` is the facade's method, so a
  // person reading "4 configurations, walk complete" and an agent reading it are reading one answer.
  const { ws, stop } = withWorker();
  try {
    const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, new ExampleCatalog(ws, assets));
    const mine = await ws.explore(5_000);
    const theirs = await api.analysis.explore(5_000);
    assert.equal(mine.status, "ok-space");
    assert.deepEqual(theirs, mine, "the agent's figures must be the person's figures");
    assert.deepEqual(api.analysis.inFlight(), [], "nothing is running once both have settled");
  } finally {
    stop();
  }
});

// ----------------------------------------------------------------------------------------------
// Properties through the facade and the agent API (sections 9, 10.3; UX-I2, UX-I5)
// ----------------------------------------------------------------------------------------------

test("Workspace.properties() recomputes and leaves the revision exactly where it was", () => {
  // The whole design in one assertion. A verdict is derived state (V18), so reading every property
  // must not move the hash -- otherwise recording the answer would change the system the answer was
  // about, and every property would go stale the moment one was evaluated.
  const ws = loaded();
  const before = ws.state.hash;
  const first = ws.properties();
  assert.ok(first.length > 0, "the worked example saves questions, so it asserts properties");
  assert.equal(ws.state.hash, before, "evaluating properties moved the semantic revision");
  assert.deepEqual(ws.properties(), first, "two reads of one revision must agree");

  for (const p of first) {
    assert.equal(p.evaluatedAt, before, "a verdict must be attributed to the revision it describes");
    assert.equal(p.currentRevision, before);
    assert.equal(p.stale, false, "a recomputed verdict cannot be stale");
    assert.ok(p.grounds.length > 0, `${p.id} has a status with nothing to attribute it to (UX-I5)`);
  }

  // And a commit re-attributes every verdict without anyone asking for it.
  ws.transact({ transaction: { base: ws.state.hash,
    operations: [{ op: "set-label", id: "gateway", value: "Changed" }] } });
  for (const p of ws.properties()) assert.equal(p.evaluatedAt, ws.state.hash);
});

test("UX-I5 holds over every shipped example, not only the hand-written fixtures", async () => {
  // Ground truth, which is the only thing that can tell you a derivation is right. Running this
  // over the examples is what found the `not-answerable` case: `is-the-scheduler-fair` asks about a
  // machine Worker Queue does not declare, so there is no model-level handle to cite -- and the
  // first version of the check reported it as ungrounded. That was the CHECK being wrong. A refusal
  // derives its status from the ABSENCE of vocabulary, and what it owes is the refusal sentence.
  const ws = new Workspace(ports);
  const catalog = new ExampleCatalog(ws, assets);
  let evaluated = 0;
  let refusals = 0;
  for (const id of catalog.ids()) {
    await catalog.load(id);
    const properties = ws.properties();
    assert.ok(properties.length > 0, `${id} saves no questions, so it demonstrates no properties`);
    assert.deepEqual(checkPropertyGrounding(properties), [],
      `${id}: a property states a verdict it cannot attribute`);
    for (const p of properties) {
      evaluated += 1;
      if (p.grounds.length > 0) continue;
      assert.equal(p.status, "not-answerable",
        `${id}/${p.id}: only a refusal may cite nothing, and this is '${p.status}'`);
      assert.ok((p.refusal ?? "").length > 0,
        `${id}/${p.id}: a refusal that cites nothing must at least say which distinction is missing`);
      refusals += 1;
    }
  }
  assert.ok(evaluated >= 10, `only ${evaluated} properties were evaluated; the sweep is not running`);
  assert.ok(refusals > 0,
    "no example exercises the cite-nothing branch, so the exemption above is untested ground truth");
});

test("UX-I2: an agent reads the same properties, with the same grounding, as the person", () => {
  // Object-level agreement over ONE workspace, not two code paths that look alike. The property
  // list's whole content is a semantic result, so UX-I2 is not satisfied by `savedQueries()`
  // alone: that returns the raw results and leaves an agent to work out which reduction produced
  // each one, which is exactly the grounding the human surface displays.
  const ws = loaded();
  const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, new ExampleCatalog(ws, assets));
  assert.deepEqual(api.properties(), ws.properties());
  assert.deepEqual(api.properties().map((p) => p.id), [...ws.state.system.queries.keys()]);
  for (const p of api.properties()) {
    assert.ok(p.grounds.every((g) => g.why.length > 8), `${p.id} cites a model with no stated reason`);
  }
});

test("UX-I2: window.mage.ask is the grounded twin of query, over the same service", () => {
  const ws = loaded();
  const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, new ExampleCatalog(ws, assets));
  const question = ws.state.system.queries.get("transitive-ownership")?.raw;
  assert.ok(question !== undefined);

  const savedBefore = ws.state.system.queries.size;
  const bare = api.query(question);
  const grounded = api.ask(question);
  // Same answer, read two ways. `query` stays the published wire shape; `ask` adds what the human
  // ad-hoc panel shows, so that panel is not UI-only knowledge.
  assert.equal(grounded.outcome, bare.outcome);
  assert.equal(grounded.evaluatedAt, bare.systemHash);
  assert.equal(grounded.refusal, bare.refusal);
  assert.ok(grounded.grounds.length > 0, "the grounded twin must carry the grounding");
  // Asking saves nothing: a query is transient until someone says otherwise (§3.4).
  assert.equal(ws.state.system.queries.size, savedBefore, "asking must not add a saved query");
  assert.equal(grounded.id, "(unsaved)", "an id here would look like a handle to something saved");
});

test("saving a query as a property goes through the ONE transaction seam an agent uses", () => {
  // §23's last step before the agent arrives, and §10.3's promise: what is saved is the question.
  const ws = loaded();
  const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, new ExampleCatalog(ws, assets));
  const before = ws.state.system.queries.size;
  const saved = api.transact({ transaction: { base: ws.state.hash, operations: [{
    op: "save-query", id: "gateway-reachable",
    query: {
      name: "The API may invoke the gateway.", kind: "graph", quantifier: "exists", expect: "holds",
      graph: { form: "reachability", relation: "may_invoke", from: "api", to: "gateway" },
    },
  }] } });
  assert.ok(saved.ok, saved.findings.map((f) => f.message).join("; "));
  assert.equal(ws.state.system.queries.size, before + 1);

  const added = ws.properties().find((p) => p.id === "gateway-reachable");
  assert.ok(added, "a saved query must appear in the property list immediately");
  assert.equal(added.kind, "requirement", "`expect` is the §13 declaration that satisfaction matters");
  assert.equal(added.proposition, "The API may invoke the gateway.");
  assert.ok(added.grounds.length > 0);

  // And retracting it leaves the models alone.
  const entities = ws.state.system.entities.size;
  assert.ok(api.transact({ transaction: { base: ws.state.hash,
    operations: [{ op: "delete-query", id: "gateway-reachable" }] } }).ok);
  assert.equal(ws.properties().find((p) => p.id === "gateway-reachable"), undefined);
  assert.equal(ws.state.system.entities.size, entities);
});

// ----------------------------------------------------------------------------------------------
// The example catalogue (default-examples sections 3 and 12)
// ----------------------------------------------------------------------------------------------
//
// Driven through the real seams, for the reason test/examples.test.ts gives: a test that read the
// example files itself would check two parsers and witness nothing about the application. EX-I1's
// claim is that loading an example is loading a file, and only the facade can show that happening.

const assets: AssetReader = (path) => Promise.resolve(readFileSync(path, "utf8"));

const catalogue = (): { readonly ws: Workspace; readonly catalog: ExampleCatalog } => {
  const ws = new Workspace(ports);
  return { ws, catalog: new ExampleCatalog(ws, assets) };
};

test("the catalogue offers exactly the examples that ship", () => {
  // Looked up, not written down. The coverage generator owns the shipped list, so a third example
  // landing there must reach the menu -- and a menu that drifted from the shipped set would offer
  // an entry whose files do not exist.
  const { catalog } = catalogue();
  assert.deepEqual([...catalog.ids()].sort(), [...EXAMPLE_IDS].sort(),
    "the menu and the shipped example set must be the same list");
});

test("all three specified examples are offered, and each one loads", async () => {
  // This test previously pinned the OPPOSITE: that Document Processing was absent, because its
  // performance model had no evaluator and a menu entry loading an empty system teaches a reader
  // the workbench is broken. That absence was correct when written and obsolete within the hour,
  // once the example was authored with declared requirements whose verdicts are hand-derived.
  //
  // Kept rather than deleted, inverted, because the claim it guards is still the real one: a menu
  // entry must LOAD. So each id is loaded, not merely listed -- listing was never the property
  // worth protecting.
  const first = catalogue();
  // Named, not counted. `catalog.ids()` RETURNS SHIPPED_EXAMPLE_IDS, so comparing its length to a
  // literal compares the source of truth against a snapshot of itself -- the shape that let two
  // example lists disagree the moment a third landed, which this very test was written to fix.
  // Section 1 names three examples, so the spec fact is WHICH three; assert that.
  // derived-values:allow the spec names these three; asserting the source against itself is tautological
  for (const id of ["message-bus", "document-processing", "worker-queue"] as const) {
    assert.ok(first.catalog.ids().includes(id), `section 1 specifies ${id} and the menu omits it`);
  }
  for (const id of first.catalog.ids()) {
    // A fresh workspace per id: loading into a reused one would pass even if a later load silently
    // left the previous system in place.
    const { ws, catalog } = catalogue();
    await catalog.load(id);
    assert.equal(ws.state.loaded, true, `${id} is offered but did not load`);
    assert.deepEqual(ws.state.findings, [], `${id} loads with validation findings`);
  }
});

test("an unknown example is refused by name, not by a failed fetch", async () => {
  // The fixture used to be "document-processing" -- a real id that merely had not shipped yet, which
  // stopped being unknown the moment it did. A negative fixture must name something that CANNOT
  // exist, not something that does not exist today.
  const { catalog } = catalogue();
  await assert.rejects(() => catalog.load("no-such-example-ever"), UnknownExampleError);
  await assert.rejects(() => catalog.describe("nonsense"), UnknownExampleError);
});

test("a description is read from the example, never written beside it", async () => {
  // The claim this test exists for: every string in the panel traces to a shipped file. If a
  // description could be authored here, it could disagree with the example it describes, and
  // nothing would notice.
  const { catalog } = catalogue();
  for (const id of EXAMPLE_IDS) {
    const d = await catalog.describe(id);
    const fixture = readFixture(id);
    assert.equal(d.title, fixture.title.trim(), `${id}: the title must be the example's own`);
    assert.equal(d.summary, fixture.summary.trim(), `${id}: the summary must be the example's own`);

    // The presented questions are the fixture's `suggested` set, by their natural-language labels.
    assert.deepEqual([...d.tryAsking],
      fixture.queries.filter((q) => q.suggested).map((q) => q.label),
      `${id}: the presented questions must be the ones the example marks suggested`);
    assert.ok(d.tryAsking.length >= 3 && d.tryAsking.length <= 5,
      `${id}: ${d.tryAsking.length} presented questions, section 2 asks for 3 to 5`);

    // And the models, with their questions, from the system itself -- machines included, because a
    // machine carries a purpose exactly as a graph model does.
    assert.deepEqual([...d.models].map((m) => `${m.kind}:${m.id}`).sort(),
      fixture.models.map((m) => `${m.kind}:${m.id}`).sort(),
      `${id}: the described models must be the example's purposeful models`);
    for (const m of d.models) {
      assert.ok(m.question !== null && m.question.length > 0,
        `${id}: model '${m.id}' is described without the question it answers`);
    }
  }
});

test("loading an example gives an ordinary workspace: the shipped counts, and no findings", async () => {
  // The brief's acceptance check, through the catalogue rather than around it. Expected counts are
  // LOOKED UP from the fixture's declared models, so a snapshot in this file cannot go stale.
  for (const id of EXAMPLE_IDS) {
    const { ws, catalog } = catalogue();
    const r = await catalog.load(id);
    assert.ok(r.ok, `${id}: did not load`);
    assert.deepEqual(r.findings, [], `${id}: an example must ship clean`);
    assert.deepEqual(ws.state.findings, [], `${id}: and must validate clean once loaded`);
    assert.ok(ws.state.loaded, `${id}: the workspace must report a loaded model`);

    const declared = readFixture(id).models;
    assert.equal(ws.state.system.models.size, declared.filter((m) => m.kind === "graph").length,
      `${id}: graph-model count must match the example's declared models`);
    assert.equal(ws.state.system.machines.size, declared.filter((m) => m.kind === "machine").length,
      `${id}: machine count must match the example's declared models`);

    // Ordinary means editable. A rename commits and advances the revision, exactly as it would on an
    // imported file -- which is EX-I1 asserted on the workspace rather than on the loader.
    const before = ws.state.hash;
    const first = [...ws.state.system.models.keys(), ...ws.state.system.machines.keys()][0];
    assert.ok(first !== undefined);
    const edit = ws.transact({ transaction: { base: before,
      operations: [{ op: "set-label", id: first, value: "Edited by hand" }] } });
    assert.ok(edit.ok, `${id}: a loaded example must be editable -- ${edit.findings.map((f) => f.message).join("; ")}`);
    assert.notEqual(ws.state.hash, before, `${id}: editing an example must advance its revision`);
  }
});

test("EX-I1: the catalogue's load and a plain import produce the SAME system", async () => {
  // The structural half. If the two hashes agree, nothing in the example path preprocessed,
  // patched or marked the system -- there is no privileged import.
  for (const id of EXAMPLE_IDS) {
    const { ws, catalog } = catalogue();
    await catalog.load(id);

    const imported = new Workspace(ports);
    assert.ok(imported.load(readFileSync(`examples/${id}/system.mage.yaml`, "utf8")).ok);
    assert.equal(ws.state.hash, imported.state.hash,
      `${id}: loading an example must be indistinguishable from importing its file`);
  }
});

test("creating a new model system loads an empty, editable, clean workspace", () => {
  const ws = new Workspace(ports);
  const r = ws.load(NEW_SYSTEM);
  assert.ok(r.ok, `the new-system template must load: ${r.findings.map((f) => f.message).join("; ")}`);
  assert.deepEqual(r.findings, [], "a new system must not greet its author with findings");
  assert.ok(ws.state.loaded, "the editing forms key off `loaded`, so creating must set it");
  assert.equal(ws.state.system.models.size, 0);
  // The template's advice survives an export, because the YAML layer preserves comments. A new
  // system a user exports untouched should still say what to do next.
  assert.match(ws.export(), /engineering question/);
});

// ----------------------------------------------------------------------------------------------
// Provenance (UX-I6 / invariant A1)
// ----------------------------------------------------------------------------------------------

test("provenance reaches the one service, prompt separated from the metadata", async () => {
  const { ws, catalog } = catalogue();
  await catalog.load("message-bus");
  const records = ws.provenance();
  assert.ok(records.length > 0, "the shipped examples record provenance (section 8)");

  const flow = records.find((p) => p.object === "model:event-flow");
  assert.ok(flow !== undefined, "a model that records its origin must appear");
  assert.ok(flow.prompt !== null, "the prompt is the field that earns the feature");
  assert.ok(!flow.fields.some((f) => f.label === "Asked for"),
    "the prompt must NOT also sit in the metadata list; the separation is what makes it prominent");
  assert.ok(flow.fields.some((f) => f.label === "Created by" && f.value === "mage-example"),
    "the shipped examples identify themselves as MAGE-provided");
  assert.ok(!flow.unreadable);
});

test("UX-I6: reading provenance cannot move the model, and a note does not advance the revision", async () => {
  const { ws, catalog } = catalogue();
  await catalog.load("message-bus");
  const before = ws.state.hash;
  const answer = ws.runSavedQueries().get("restricted-data-reaches-impermitted-subscriber")?.outcome;

  // Reading, repeatedly. The service returns records and no writer, so this cannot do anything --
  // which is the assertion.
  for (let i = 0; i < 3; i += 1) assert.ok(ws.provenance().length > 0);
  assert.equal(ws.state.hash, before, "inspecting provenance must not change the system's identity");
  assert.equal(ws.runSavedQueries().get("restricted-data-reaches-impermitted-subscriber")?.outcome,
    answer, "inspecting provenance must not change an answer");

  // And the writing side of the same invariant, on the capability next door: a note commits and
  // leaves the semantic revision exactly where it was.
  const noted = ws.transact({ transaction: { base: before, operations: [{
    op: "add-note", scope: "model", id: "event-flow",
    note: { kind: "comment", text: "Annotation is outside the semantic projection." },
  }] } });
  assert.ok(noted.ok, `the note must commit: ${noted.findings.map((f) => f.message).join("; ")}`);
  assert.equal(ws.state.hash, before, "A1: a note must not advance the semantic revision");
});

test("provenance the IR cannot read is reported rather than dropped", () => {
  // docable's `remediation` records provenance under keys the IR does not read. "Records where it
  // came from, in a spelling we do not understand" is a different fact from "records nothing", and
  // dropping the row would make the two indistinguishable.
  const ws = loaded();
  const unreadable = ws.provenance().filter((p) => p.unreadable);
  assert.ok(unreadable.length > 0, "docable carries an unreadable provenance block to pin this");
  for (const p of unreadable) {
    assert.equal(p.prompt, null);
    assert.deepEqual(p.fields, []);
  }
});

test("an agent reads the same provenance and the same examples the person does", async () => {
  // UX-I1 for the two new rows, asserted as object identity rather than as agreement: ONE catalogue
  // and ONE workspace, so the agent cannot be reading a second copy that happens to match.
  const { ws, catalog } = catalogue();
  const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, catalog);

  const described = await api.examples();
  assert.deepEqual(described.map((d) => d.id), [...catalog.ids()]);
  assert.deepEqual(described, await catalog.describeAll());

  const context = await api.loadExample("worker-queue");
  assert.equal(context.hash, ws.state.hash, "the agent's context must describe the loaded system");
  assert.equal(context.counts["models"], ws.state.system.models.size);
  assert.deepEqual(context.findings, [], "a shipped example must load clean for an agent too");
  assert.deepEqual(api.provenance(), ws.provenance());

  // After loadExample the agent holds an ORDINARY workspace: it inspects and edits with the same
  // methods an imported file gets, and there is no example-specific surface (EX-I1).
  assert.ok(api.inspect().models.length > 0);
  const edited = api.transact({ transaction: { base: context.hash,
    operations: [{ op: "set-label", id: "worker-pool", value: "Pool" }] } });
  assert.ok(edited.ok, `an example must be editable through window.mage: ${edited.findings.map((f) => f.message).join("; ")}`);
});

// ----------------------------------------------------------------------------------------------
// SPARQL through the facade (DESIGN-sparql-261002.md §1, §6 Q8, §6 Q9; UX-I1, UX-I3)
// ----------------------------------------------------------------------------------------------
//
// The gap these close has the Worker's shape exactly: the layer shipped tested, `answerSparql` was
// exported, and nothing outside `src/sparql/` imported it -- so esbuild tree-shook the whole path
// out of both bundles and neither a person nor an agent could ask a SPARQL question. A facade test
// is where that shows, because the facade is the only door a caller has.

/** Prefixes derived from the minting functions, so a URN scheme change in `iri.ts` moves them. */
const DOC_PREFIXES =
  `PREFIX ent: <${entityIri("docable", "").value}>\n` +
  `PREFIX rt: <${relationTypeIri("docable", "").value}>\n`;
const SERVICE_FLOW = modelGraphIri("docable", "service-flow").value;
const DATA_CLASSIFICATION = modelGraphIri("docable", "data-classification").value;
const docEnt = (id: string): string => entityIri("docable", id).value;

/** The closure `docable`'s service-flow model licenses: `may_invoke` declares composition allowed. */
const REACHED_FROM_API =
  `${DOC_PREFIXES}SELECT ?x WHERE { GRAPH <${SERVICE_FLOW}> { ent:api rt:may_invoke+ ?x } }`;

/** The `?x` column, asserting the arm rather than reading through it. */
function column(out: SparqlAnswer): readonly string[] {
  const { answer } = out;
  assert.equal(answer.kind, "select-result",
    answer.kind === "refused" ? `unexpected refusal: ${answer.refusal.prose}` : `got ${answer.kind}`);
  if (answer.kind !== "select-result") return [];
  return answer.rows.map((row) => {
    const x = row.get("x");
    assert.ok(x !== undefined, "every row of this query binds ?x");
    return x.value;
  });
}

/** The refusal, asserting the arm rather than reading through it. */
function refusal(out: SparqlAnswer): { readonly cause: string; readonly missing: readonly string[]; readonly prose: string; readonly wouldLicense: string } {
  assert.equal(out.answer.kind, "refused", `expected a refusal, got ${out.answer.kind}`);
  if (out.answer.kind !== "refused") throw new Error("unreachable");
  return out.answer.refusal;
}

test("a SELECT asked as TEXT through the facade returns the solutions, the coverage and the hash", () => {
  // `may_invoke+` from the API: one hop to remediation, a second to the gateway. The row set is
  // pinned rather than counted -- §7's lesson from the measurement, where a count of 13-of-13 ok
  // hid an engine answering `false` to a modelled fact.
  const ws = loaded();
  const out = ws.sparql(REACHED_FROM_API);
  assert.deepEqual(column(out), [docEnt("gateway"), docEnt("remediation")],
    "the closure must reach both services the example declares, in canonical row order");
  assert.equal(out.systemHash, ws.state.hash,
    "a SPARQL answer carries the hash of the system it describes, like every other result");
  assert.match(out.coverage, /rows ARE the evidence/,
    "a SELECT's coverage must say that the bindings are the witness");
});

test("UX-I3: window.mage.sparql is the same seam, and hands back the same answer", () => {
  // One service, two callers -- the invariant the whole facade exists for. Object equality over ONE
  // workspace, so the agent cannot be reading a second projection that happens to agree.
  const ws = loaded();
  const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, new ExampleCatalog(ws, assets));
  assert.deepEqual(api.sparql(REACHED_FROM_API), ws.sparql(REACHED_FROM_API));
  // And the budget travels, so an agent can ask the bounded question the page asks (Q8).
  assert.deepEqual(api.sparql(REACHED_FROM_API, 2), ws.sparql(REACHED_FROM_API, 2));
});

test("the two interfaces answer the same one-hop relational question the same way", () => {
  // Agreement between the SPARQL evaluator and the engine on a question §1 does not split: one hop
  // needs no path witness and composes nothing. Both sides are LOOKED UP rather than snapshotted --
  // the engine's own answer is the oracle, so a change in the example cannot leave this stale.
  const ws = loaded();
  const engine = ws.query({
    name: "which services may the API invoke directly?", kind: "graph", quantifier: "exists",
    graph: { form: "successors", relation: "may_invoke", from: "api" },
  });
  assert.equal(engine.outcome, "holds");
  const reached = (engine.evidence?.nodes ?? []).filter((id) => id !== "api").map(docEnt);
  assert.ok(reached.length > 0, "the engine must witness at least one successor for this to compare");

  // `GRAPH ?g` is the right spelling for an engine-agreement claim at ONE hop: it unions the
  // per-graph evaluations, and a single triple never had to cross a graph boundary. A CLOSURE asked
  // this way would not agree, and §7.2 measured why -- that one needs a dataset clause.
  const sparql = ws.sparql(`${DOC_PREFIXES}SELECT ?x WHERE { GRAPH ?g { ent:api rt:may_invoke ?x } }`);
  assert.deepEqual([...column(sparql)].sort(), [...reached].sort(),
    "one relation, one hop, two interfaces: the answers must be the same set");
});

test("§1: an existence question needing a path witness is the ENGINE's, and SPARQL invents none", () => {
  // The table's second row, both halves in one test. The engine returns the nodes it travelled;
  // SPARQL answers the same existence and says in its coverage that it has no witness to offer,
  // because SPARQL 1.1 dropped path variables. The failure this forbids is a fabricated path.
  const ws = loaded();
  const saved = ws.state.system.queries.get("restricted-reaches-public")?.raw;
  assert.ok(saved !== undefined, "docable saves the data_flow path question this compares against");
  const engine = ws.query(saved);
  assert.equal(engine.evidence?.shape, "path", "the engine answers a path question WITH the path");
  assert.ok((engine.evidence?.nodes ?? []).length > 0);

  const out = ws.sparql(
    `${DOC_PREFIXES}ASK { GRAPH <${DATA_CLASSIFICATION}> { ent:api rt:data_flow+ ent:gateway } }`);
  assert.equal(out.answer.kind, "ask-result");
  if (out.answer.kind !== "ask-result") return;
  assert.equal(out.answer.value, true, "the flow the engine travelled must exist for SPARQL too");
  assert.equal(out.answer.evidence, null, "an ASK that cannot bind intermediates carries no evidence");
  assert.match(out.coverage, /existence only/, "and the coverage must say so rather than leave it inferred");
  assert.match(out.coverage, /analysis engine returns one/,
    "a reader must be told where the witness comes from, not left to infer it from an absence");
});

test("§1: a behavioral question is not answered by SPARQL, and the engine answers it", () => {
  // The table's third row. Behaviour is not expressible at all -- the dataset holds structure, not
  // executions -- so the two halves are: `admit` ROUTES a behavioral subject rather than refusing
  // it, and the engine answers the example's own behavioral question with a trace.
  const ws = loaded();
  const routed = admit(ws.state.system, { kind: "behavioral", asked: "can a document be published without review?" });
  assert.equal(routed.kind, "routed", "a behavioral subject belongs to the other interface");
  if (routed.kind !== "routed") return;
  assert.match(routed.route.prose, /analysis engine/, "the route must name where the answer comes from");

  const saved = ws.state.system.queries.get("document-can-return-to-waiting")?.raw;
  assert.ok(saved !== undefined);
  // A LASSO: a prefix plus the repeating cycle. An execution, which is precisely the thing a
  // projection of structure has no quad for -- so this is not a gap in the subset, it is the row.
  assert.equal(ws.query(saved).evidence?.shape, "lasso", "the engine answers it, over the state space");

  // And the text path cannot be talked into answering one. A machine lives in the DEFAULT graph, so
  // the nearest SPARQL spelling states no scope -- which §7.1 refuses by name rather than answering
  // with the confident empty set that a default-graph pattern over relation edges would produce.
  const attempt = ws.sparql("SELECT ?s WHERE { <urn:mage:mach:docable:document> <urn:mage:v:state> ?s }");
  assert.deepEqual(refusal(attempt).missing, ["bare WHERE without FROM or GRAPH"]);
});

test("an out-of-subset query is refused BY NAME at the facade, not inside src/sparql/", () => {
  // §3's rule, observable from where a caller stands: the construct is named, the query is not
  // rewritten to fit, and the refusal says what the subset does accept.
  const ws = loaded();
  const out = ws.sparql(
    `${DOC_PREFIXES}SELECT DISTINCT ?x WHERE { GRAPH <${SERVICE_FLOW}> { ent:api rt:may_invoke ?x } }`);
  const r = refusal(out);
  assert.equal(r.cause, "outside-supported-subset");
  assert.deepEqual(r.missing, ["DISTINCT"], "the refusal must name the clause that offended");
  assert.match(r.wouldLicense, /SELECT, ASK/, "and must cite the subset it does accept");
  assert.match(out.coverage, /^no answer:/, "a refused query must not look like an empty answer");
});

test("a licensing refusal survives the trip, word for word with the engine's", () => {
  // V7 at the facade. `owns` declares `composition.path: forbidden`, and docable saves the engine's
  // spelling of this very question as its refusal case -- so the two interfaces can be compared
  // rather than trusted. Two sentences for one refusal would teach a reader that one is guessing.
  const ws = loaded();
  const out = ws.sparql(
    `${DOC_PREFIXES}ASK { GRAPH <${SERVICE_FLOW}> { ent:api rt:owns+ ent:parser } }`);
  const r = refusal(out);
  assert.equal(r.cause, "unlicensed-by-model");
  assert.match(r.wouldLicense, /composition\.path: allowed/,
    "a refusal must name the semantic claim that would license the question");

  const engine = ws.query(ws.state.system.queries.get("transitive-ownership")?.raw);
  assert.equal(engine.outcome, "unlicensed");
  assert.equal(r.prose, engine.refusal,
    "one licensing rule, one sentence: the SPARQL refusal must be the engine's own");
});

test("a spent step budget is neither empty nor refused, and its coverage routes onward", () => {
  // Q8's fourth arm, at the facade. A caller that read `exhausted` as "no" would have learned the
  // Comunica lesson backwards, so the arm is distinct and the coverage names the budget.
  const ws = loaded();
  const out = ws.sparql(REACHED_FROM_API, 2);
  assert.equal(out.answer.kind, "exhausted", "a 2-step budget cannot finish a one-or-more path");
  if (out.answer.kind !== "exhausted") return;
  // The step that overran is counted before the budget is reported spent, so the count reaches the
  // budget rather than stopping short of it. Asserted as a bound, because the exact number is the
  // evaluator's business and pinning it here would make this test fail on a faster walk order.
  assert.ok(out.answer.steps >= 2, `expected the budget to be spent, got ${out.answer.steps} steps`);
  assert.match(out.coverage, /2-step budget/);
  assert.match(out.coverage, /analysis Worker/, "and must say where the question can still be answered");
  assert.equal(out.systemHash, ws.state.hash, "an exhausted answer still describes a system");
});

// ---- the `exhausted` route, from the facade to the Worker and back ---------------------------
//
// `exhausted` named the Worker in its prose and there was no route: `resolveExhausted` needed the
// unbranded `SeamQuestion`, `translate` returned the branded `LicensedQuestion`, and its derivation
// was private to `parse.ts`. `TranslatedQuery.questions` and the escalation handle close that, and
// these drive it the way a caller does -- as TEXT, through `sparql()`, with no value rebuilt here.

/**
 * An unlicensed subject, for the smuggling test. `owns` is docable's `composition.path: forbidden`
 * relation, included in the worked example for exactly this.
 */
const OWNS_COMPOSING: SeamQuestion = {
  kind: "relational", relation: "owns", traversal: "composing", evidence: "bindings",
  scope: { kind: "system-union" }, subset: { kind: "within-subset" },
};

test("an exhausted question routes through the facade to the Worker, and resolves", async () => {
  // The route, driven the way a caller drives it: ASK AS TEXT, read `exhausted`, hand back the
  // handle the answer came with. Nothing here builds a `SeamQuestion` or a `QueryAlgebra` — that was
  // the previous version of this test, and it was testing a route no caller could take, because the
  // facade had no way to produce either value. `escalation` is what closed that.
  //
  // The oracle is the SYNCHRONOUS path on the same question with a budget it can finish, so the two
  // answers are comparable rather than merely both plausible.
  const { ws, stop } = withWorker();
  try {
    const system = ws.state.system;
    const before = ws.state.hash;

    const spent = ws.sparql(REACHED_FROM_API, 2);
    assert.equal(spent.answer.kind, "exhausted", "a 2-step budget cannot finish a one-or-more path");
    assert.ok(spent.escalation !== null, "an exhausted answer must carry the route its prose names");
    if (spent.escalation === null) return;
    assert.equal(spent.escalation.spent, spent.answer,
      "the handle carries the spent result itself, not a second copy of it");

    const out = await ws.resolveExhausted(spent.escalation);
    assert.equal(out.status, "ok-evaluation",
      `expected an evaluation, got ${out.status}${out.status === "failed" ? `: ${out.messages.join("; ")}` : ""}`);
    if (out.status !== "ok-evaluation") return;
    assert.equal(out.evaluation.kind, "select", "the Worker's budget resolves what the page's could not");
    if (out.evaluation.kind !== "select") return;

    const synchronous = ws.sparql(REACHED_FROM_API);
    const fromWorker = out.evaluation.rows
      .map((row) => row.find(([name]) => name === "x")?.[1].value).sort();
    assert.deepEqual(fromWorker, [...column(synchronous)].sort(),
      "the Worker and the page must answer the same question with the same rows");
    assert.deepEqual(fromWorker, [docEnt("gateway"), docEnt("remediation")].sort(),
      "and the rows are the two services api may_invoke+ reaches");

    assert.equal(ws.state.hash, before, "resolving a question must not advance the revision");
    assert.equal(ws.state.system, system,
      "nor rebuild the IR: the workspace is holding the same object it held before the round trip");
  } finally {
    stop();
  }
});

/** A licensed closure that reaches nothing: the gateway is the end of the flow, so zero rows. */
const REACHED_FROM_GATEWAY =
  `${DOC_PREFIXES}SELECT ?x WHERE { GRAPH <${SERVICE_FLOW}> { ent:gateway rt:may_invoke+ ?x } }`;

test("exhausted, refused and empty are three different answers at the facade", () => {
  // Three things to tell a caller -- this path ran out of budget; the model does not license this;
  // no solutions exist -- and collapsing any two reproduces in our own code the defect that ruled
  // Comunica out. Asserted on all three at once, from the one door a caller has, because the
  // distinction is only worth anything where somebody reads it.
  const ws = loaded();

  const spent = ws.sparql(REACHED_FROM_API, 2);
  assert.equal(spent.answer.kind, "exhausted");
  assert.match(spent.coverage, /budget/, "the bound must be named, not implied by a short answer");

  const declined = ws.sparql(`${DOC_PREFIXES}ASK { GRAPH <${SERVICE_FLOW}> { ent:api rt:owns+ ent:parser } }`);
  assert.equal(declined.answer.kind, "refused");
  assert.equal(refusal(declined).cause, "unlicensed-by-model");

  const empty = ws.sparql(REACHED_FROM_GATEWAY);
  assert.equal(empty.answer.kind, "select-result", "an empty answer is still an ANSWER");
  assert.deepEqual(column(empty), [], "and the gateway invokes nothing, so it has no rows");
  assert.match(empty.coverage, /rows ARE the evidence/,
    "its coverage says the rows are the witness -- of which there are none, which IS the finding");

  // No two of the three agree on any field a caller would switch on.
  assert.equal(new Set([spent.answer.kind, declined.answer.kind, empty.answer.kind]).size, 3);
  assert.equal(new Set([spent.coverage, declined.coverage, empty.coverage]).size, 3);
});

test("only an exhausted answer carries the escalation, so the Worker is not a fast lane", () => {
  // The handle is the control. If every answer carried one, an agent could ask any question with
  // forty times the interactive budget and the Q8 ruling would be a suggestion. The three arms above
  // carry none; the fourth is the one with somewhere to go.
  const ws = loaded();
  assert.equal(ws.sparql(REACHED_FROM_API).escalation, null, "a SELECT that finished has nowhere to go");
  assert.equal(ws.sparql(REACHED_FROM_GATEWAY).escalation, null, "nor has an empty one: the budget was never the bound");
  assert.equal(ws.sparql(`${DOC_PREFIXES}SELECT DISTINCT ?x WHERE { GRAPH <${SERVICE_FLOW}> { ent:api rt:may_invoke ?x } }`).escalation,
    null, "a bigger budget licenses nothing the SUBSET declined");
  assert.equal(ws.sparql(`${DOC_PREFIXES}ASK { GRAPH <${SERVICE_FLOW}> { ent:api rt:owns+ ent:parser } }`).escalation,
    null, "nor anything the MODEL declined");
  assert.ok(ws.sparql(REACHED_FROM_API, 2).escalation !== null, "and the one arm that has a route carries it");
});

test("the Worker re-admits every subject, so an escalation cannot smuggle an unlicensed one", async () => {
  // The property that is load-bearing and invisible: the brand does not cross `postMessage`, so the
  // worker runs `admit` on its own thread. Asserted by handing it a question the model declines,
  // which is the only way to observe a gate from outside.
  //
  // And asserted for EVERY subject, not the first. `may_invoke` is licensed composing and `owns` is
  // not, so a worker that admitted only `questions[0]` would evaluate this and answer it.
  const { ws, stop } = withWorker();
  try {
    const spent = ws.sparql(REACHED_FROM_API, 2);
    assert.ok(spent.escalation !== null);
    if (spent.escalation === null) return;
    const smuggled: ExhaustedEscalation = {
      ...spent.escalation,
      questions: [...spent.escalation.questions, OWNS_COMPOSING],
    };
    const out = await ws.resolveExhausted(smuggled);
    assert.equal(out.status, "ok-evaluation");
    if (out.status !== "ok-evaluation") return;
    assert.equal(out.evaluation.kind, "refused",
      "the worker must decide licensing itself, for every subject the request carries");
    if (out.evaluation.kind !== "refused") return;
    assert.deepEqual(out.evaluation.refusal.missing,
      ["path-composition semantics for relation type 'owns'"],
      "and must name the type that declined, in the engine's own words");
  } finally {
    stop();
  }
});

test("an escalation carrying NO subject is refused, not waved through", async () => {
  // The empty-list case, which is the one a loop gets wrong by falling out of: `admit` is never
  // called, nothing refuses, and the query evaluates ungated behind a check that looked satisfied.
  // The wire is untyped -- `event.data as WorkerRequest` -- so the type cannot be the control here.
  const { ws, stop } = withWorker();
  try {
    const spent = ws.sparql(REACHED_FROM_API, 2);
    assert.ok(spent.escalation !== null);
    if (spent.escalation === null) return;
    const out = await ws.resolveExhausted({ ...spent.escalation, questions: [] });
    assert.equal(out.status, "ok-evaluation");
    if (out.status !== "ok-evaluation") return;
    assert.equal(out.evaluation.kind, "refused", "no subject means nothing was gated, not nothing to gate");
    if (out.evaluation.kind !== "refused") return;
    assert.equal(out.evaluation.refusal.cause, "unknown-vocabulary");
    assert.deepEqual(out.evaluation.refusal.missing, ["relation type '(none declared)'"],
      "and the sentence is the translator's own, for the same situation");
  } finally {
    stop();
  }
});

test("UX-I2: an agent escalates the same exhausted question, over the same Worker", async () => {
  // The machine affordance the `query` row declares, exercised. The agent's handle comes from the
  // agent's own answer, and the two settle on the same rows.
  const { ws, stop } = withWorker();
  try {
    const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, new ExampleCatalog(ws, assets));
    const spent = api.sparql(REACHED_FROM_API, 2);
    assert.equal(spent.answer.kind, "exhausted");
    assert.ok(spent.escalation !== null, "an agent must be able to reach the route the prose names");
    if (spent.escalation === null) return;
    const out = await api.analysis.resolveExhausted(spent.escalation);
    assert.equal(out.status, "ok-evaluation",
      `expected an evaluation, got ${out.status}${out.status === "failed" ? `: ${out.messages.join("; ")}` : ""}`);
    if (out.status !== "ok-evaluation") return;
    assert.equal(out.evaluation.kind, "select");
  } finally {
    stop();
  }
});

test("without a Worker, an escalation REFUSES and names the steps it spent", async () => {
  // The same honesty `explore()` owes. Not an empty solution set -- which a caller cannot tell from
  // "no rows match" -- and not a silent pend.
  const ws = loaded();
  const spent = ws.sparql(REACHED_FROM_API, 2);
  assert.ok(spent.escalation !== null);
  if (spent.escalation === null) return;
  const out = await ws.resolveExhausted(spent.escalation);
  assert.equal(out.status, "failed");
  if (out.status !== "failed") return;
  assert.match(out.messages[0] ?? "", /no analysis worker is wired/);
  assert.match(out.messages[0] ?? "", /exhausted \d+ steps/,
    "the refusal must say which question had nowhere to run");
});

test("a SPARQL answer cannot outlive the system it describes", () => {
  // The same contract `QueryResult.systemHash` carries, asserted across a commit: the hash moves,
  // and the next answer carries the new one. A result for revision N must never read as N+1.
  const ws = loaded();
  const before = ws.sparql(REACHED_FROM_API);
  ws.transact({ transaction: { base: ws.state.hash,
    operations: [{ op: "set-label", id: "gateway", value: "Gateway" }] } });
  const after = ws.sparql(REACHED_FROM_API);
  assert.notEqual(after.systemHash, before.systemHash, "the commit must move the hash the answer carries");
  assert.equal(after.systemHash, ws.state.hash);
  assert.deepEqual(column(after), column(before), "and a label edit must not change the solutions");
});

test("Q9: SPARQL and the budget escalation are spellings of `query`, and exploration is not", () => {
  // Q9's reading, as the registry records it: `query` is the capability, SPARQL is a syntax for it,
  // and re-asking with the Worker's budget is the same question under a different bound. Both land
  // on that row; neither mints one.
  const query = CAPABILITIES.find((c) => c.id === "query");
  assert.ok(query);
  for (const at of ["window.mage.sparql", "window.mage.analysis.resolveExhausted"] as const) {
    assert.ok(query.machine.some((a) => a.at === at && a.status === "wired"),
      `${at} must be declared, or §26's closure check cannot see it`);
  }
  assert.equal(query.service, "workspace.query", "the row still names the capability's canonical seam");
  assert.deepEqual(CAPABILITIES.filter((c) => c.id !== "query").flatMap((c) =>
    [...c.human, ...c.machine].filter((a) => a.at.includes("sparql")).map((a) => a.at)), [],
    "no other capability claims a SPARQL affordance");

  // And the other side of the same ruling. Exploration is NOT a spelling of anything: it answers
  // what the configuration space's size is, which no other capability answers, so it has its own
  // row and its own service. `analyze` keeps the strings that made it the wrong home — folding
  // exploration in would have meant rewriting both of them to describe two semantics at once.
  const analyze = CAPABILITIES.find((c) => c.id === "analyze");
  assert.ok(analyze);
  assert.equal(analyze.service, "workspace.runSavedQueries");
  assert.match(analyze.summary, /Re-run every saved question/);
  assert.deepEqual([...analyze.human, ...analyze.machine].filter((a) => a.at.includes("explore")), [],
    "`analyze` must not claim an exploration affordance: re-running saved questions is not walking a space");

  const explore = CAPABILITIES.find((c) => c.id === "explore-space");
  assert.ok(explore, "exploration must be declared: a capability the registry hides cannot violate UX-I1");
  assert.equal(explore.service, "workspace.explore");
  assert.ok(explore.machine.some((a) => a.at === "window.mage.analysis.explore" && a.status === "wired"));
  // Its own row AND both sides of it. The row was one-sided for a wave; a human control that ends at
  // the same `workspace.explore` is what closed it, which is the only closure UX-I1 accepts — the
  // alternative, folding the capability into `analyze`, is what the assertions above forbid.
  assert.ok(explore.human.some((a) => a.at === "system-browser.explore" && a.status === "wired"),
    "exploration needs a human affordance over its own service, not a borrowed one");

  // UX-I1 therefore reports nothing. A count is not the guard — it moves legitimately the moment a
  // capability is added — so what is checked is WHICH rows are whole. The three below were the last
  // to be wired on both sides at once, so their presence is what the rest of the list is worth.
  assert.deepEqual(checkAffordanceParity().map((v) => v.capability), [],
    `UX-I1: ${checkAffordanceParity().map((v) => `${v.capability} ${v.problem}`).join("; ")}`);
  for (const id of ["create-model", "delete-model", "add-note"] as const) {
    assert.ok(CAPABILITIES.some((c) => c.id === id),
      `${id} is gone from the registry — a short violation list reached by deletion is not progress`);
  }
});
