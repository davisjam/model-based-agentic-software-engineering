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
import type { Ports } from "../src/app/services.ts";
import { ExampleCatalog, UnknownExampleError } from "../src/app/examples.ts";
import type { AssetReader } from "../src/app/examples.ts";
import { createAgentApi } from "../src/app/agent-api.ts";
import { checkPropertyGrounding } from "../src/app/properties.ts";
import { EXAMPLE_IDS, readFixture } from "../scripts/gen-example-coverage.ts";

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

test("Document Processing is NOT offered, because it is not built", () => {
  // Section 1 specifies three examples and two exist: Document Processing needs the quantitative
  // evaluator. The absence is deliberate, so it is pinned -- a later agent reading the spec and
  // adding the menu entry would ship a control that loads nothing.
  const { catalog } = catalogue();
  assert.ok(!catalog.ids().includes("document-processing" as never),
    "an entry that fails or loads an empty system is worse than an absent one");
});

test("an unknown example is refused by name, not by a failed fetch", async () => {
  const { catalog } = catalogue();
  await assert.rejects(() => catalog.load("document-processing"), UnknownExampleError);
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
