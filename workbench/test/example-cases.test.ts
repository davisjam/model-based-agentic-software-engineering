// The case envelope (261005): every shipped example is a miniature engineering situation, not a
// dataset. These pin the four claims the design makes, each against the corpus rather than against
// a copy:
//
//   1. SPREAD — each case's Try-asking outcomes span ESTABLISHED, REFUTED, and NOT ANSWERABLE, so
//      every example teaches the boundary of its models as well as their power. The outcomes come
//      from the fixture, which `test/examples.test.ts` holds equal to the live engine — so this
//      test's oracle is the engine at one remove, not a hand-written table.
//   2. JOIN — every ask names a suggested saved query and every suggested query is asked about
//      (`describe()` throws otherwise; the negative controls prove the throw).
//   3. BOUNDARY — the case is context, not a constraint: loading through the catalogue yields the
//      byte-identical system a raw `Workspace.load` of the example file yields, so no case fact
//      can have entered the engine, the hash, or a verdict.
//   4. PERSISTENCE PIN — `currentCase()` names the example while its import is on screen, through
//      edits, and stops naming it the moment any other route replaces the document.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { runQuery } from "../src/engine/index.ts";
import { renderView } from "../src/render/index.ts";
import { Workspace } from "../src/app/services.ts";
import type { Ports } from "../src/app/services.ts";
import { ExampleCatalog, SHIPPED_EXAMPLES, caseOf } from "../src/app/examples.ts";
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
const catalogue = (): { readonly ws: Workspace; readonly catalog: ExampleCatalog } => {
  const ws = new Workspace(ports);
  return { ws, catalog: new ExampleCatalog(ws, assets) };
};

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Each fixture query's pinned outcome, by id. The fixture is engine-verified elsewhere. */
function pinnedOutcomes(id: string): ReadonlyMap<string, string> {
  const doc: unknown = parse(readFileSync(`examples/${id}/expected-results.yaml`, "utf8"));
  assert.ok(isObj(doc));
  const queries = doc["queries"];
  assert.ok(Array.isArray(queries));
  const out = new Map<string, string>();
  for (const raw of queries) {
    assert.ok(isObj(raw));
    const expected = raw["expected"];
    assert.ok(isObj(expected));
    out.set(String(raw["id"]), String(expected["outcome"]));
  }
  return out;
}

test("every case's Try-asking outcomes span established, refuted, and not answerable", () => {
  // The author's design criterion, verbatim: "A good case deliberately includes ESTABLISHED,
  // REFUTED, and NOT ANSWERABLE questions. Then every example teaches the boundary of the model
  // as well as its power." Five questions that all hold would pass every join and fail the
  // course, so the spread is held here rather than hoped for. `inconclusive` deliberately
  // satisfies nothing: a bounded search is not a boundary lesson, it is a budget.
  for (const row of SHIPPED_EXAMPLES) {
    const outcomes = pinnedOutcomes(row.id);
    const seen = row.case.tryAsking.map((q) => {
      const outcome = outcomes.get(q.query);
      assert.ok(outcome !== undefined,
        `${row.id}: the case asks about '${q.query}' and the fixture pins no outcome for it`);
      return outcome;
    });
    for (const want of ["holds", "refuted", "unlicensed"] as const) {
      assert.ok(seen.includes(want),
        `${row.id}: no Try-asking question's pinned outcome is '${want}' — the presented set `
        + `teaches only part of the boundary (got: ${seen.join(", ")})`);
    }
    assert.ok(row.case.tryAsking.length >= 4 && row.case.tryAsking.length <= 6,
      `${row.id}: ${row.case.tryAsking.length} Try-asking questions; the case template asks for 4-6`);
  }
});

test("the case is context, not a constraint: the catalogue loads the example's own bytes, unchanged", async () => {
  // The boundary pin. If any case fact were threaded into loading — a preprocessed system, an
  // injected note, anything — the catalogue's hash would differ from a raw load of the shipped
  // file. Byte-identical export is the stronger half: no case prose is even present.
  for (const row of SHIPPED_EXAMPLES) {
    const { ws, catalog } = catalogue();
    const r = await catalog.load(row.id);
    assert.ok(r.ok, `${row.id} did not load`);
    const viaCatalog = { hash: ws.state.hash, text: ws.export() };

    const raw = new Workspace(ports);
    assert.ok(raw.load(readFileSync(`examples/${row.id}/system.mage.yaml`, "utf8")).ok);
    assert.equal(viaCatalog.hash, raw.state.hash,
      `${row.id}: loading through the catalogue changed the system — EX-I1/case-boundary breach`);
    assert.equal(viaCatalog.text, raw.export(),
      `${row.id}: the catalogue's export differs from the file's own round-trip`);
    assert.ok(!viaCatalog.text.includes(caseOf(row.id).scenario.slice(0, 40)),
      `${row.id}: the case's scenario text is inside the exported model — context became input`);
  }
});

test("currentCase survives edits and hypotheses, and expires on any other import", async () => {
  const { ws, catalog } = catalogue();
  assert.equal(catalog.currentCase(), null, "a pristine workspace has no case");

  await catalog.load("message-bus");
  assert.equal(catalog.currentCase(), "message-bus");

  // An ordinary edit: the workspace stays an example-with-case, because the case describes why
  // the student is here, not a frozen artifact.
  const edit = ws.transact({
    transaction: {
      base: ws.state.hash,
      operations: [{ op: "add-entity", id: "case-probe", label: "Case Probe" }],
    },
  });
  assert.ok(edit.ok, "the edit must commit");
  assert.equal(catalog.currentCase(), "message-bus", "an edit must not expire the case");

  // A what-if and its discard: neither replaces the import.
  const hyp = ws.openHypothesis("case-what-if", {
    transaction: {
      base: ws.state.hash,
      operations: [{ op: "add-entity", id: "case-probe-2" }],
    },
  });
  assert.ok(hyp.ok);
  assert.equal(catalog.currentCase(), "message-bus", "a hypothesis must not expire the case");
  ws.discardHypothesis();
  assert.equal(catalog.currentCase(), "message-bus", "a discard must not expire the case");

  // A different example replaces the pin.
  await catalog.load("worker-queue");
  assert.equal(catalog.currentCase(), "worker-queue");

  // A file import through the plain seam expires it: the panel must never narrate a document
  // that did not come from its example.
  assert.ok(ws.load(readFileSync("examples/docable.mage.yaml", "utf8")).ok);
  assert.equal(catalog.currentCase(), null, "a plain load must expire the case");

  // The session-restore seam re-pins onto the CURRENT import, and refuses nonsense.
  catalog.adoptCase("message-bus");
  assert.equal(catalog.currentCase(), "message-bus");
  assert.throws(() => catalog.adoptCase("no-such-example-ever"));

  // Reset expires the pin with the import.
  ws.reset();
  assert.equal(catalog.currentCase(), null, "reset must expire the case");
});

test("a refused import keeps the previous case", async () => {
  const { ws, catalog } = catalogue();
  await catalog.load("message-bus");
  assert.equal(catalog.currentCase(), "message-bus");
  const r = ws.load(":\nnot yaml at all\n\t");
  assert.equal(r.ok, false, "the garbage text must refuse to load");
  assert.equal(catalog.currentCase(), "message-bus",
    "a refused import left the previous document, so it must leave the previous case");
});
