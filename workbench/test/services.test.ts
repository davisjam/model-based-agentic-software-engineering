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
import { Workspace } from "../src/app/services.ts";
import type { Ports } from "../src/app/services.ts";

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
