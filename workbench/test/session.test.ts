/**
 * THE SESSION: what survives a reload, and what RESET wipes.
 *
 * Measured 261005, before this existed: a reload left a student at an EMPTY workbench — zero
 * properties, the workspace region hidden, back at the example chooser. Not "your edits are gone,
 * here is the shipped model" but "you are before step one". In a lab whose fifth step is an
 * open-ended design search over several candidate edits, a stray refresh cost all of it silently.
 *
 * This file pins the seam that fixes it. The DOM half — that a reload repaints into the restored
 * model and that the Reset control is reachable — is `test/browser/session-reload.test.mjs`; this
 * file pins the semantics, which is what a browser test cannot assert cheaply: that the restored
 * SYSTEM is the edited one and not a re-read of the shipped file.
 *
 * The store is injected rather than mocked onto a global, so these run under `node --test` with no
 * browser and no `localStorage` shim.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Session, type SessionStore } from "../src/app/session.ts";
import { Workspace } from "../src/app/services.ts";
import { realPorts } from "../scripts/gen-example-coverage.ts";

const HERE = import.meta.dirname;
const SENSOR = join(HERE, "..", "examples", "embedded-sensor-node", "system.mage.yaml");
const text = (): string => readFileSync(SENSOR, "utf8");

/** A store with the browser's contract and none of its environment. */
const memoryStore = (): SessionStore & { readonly map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
};

const budgetOf = (ws: Workspace): string => {
  const p = ws.properties().find((x) => /sram|budget|fits/i.test(x.statement ?? x.id));
  return p === undefined ? "none" : `${p.id}=${p.outcome}`;
};

describe("a reload keeps the student's work", () => {
  it("the EDITED model is what comes back — not a re-read of the shipped file", () => {
    const store = memoryStore();
    const first = new Workspace(realPorts);
    assert.ok(first.load(text()).ok);
    assert.equal(budgetOf(first), "sram-fits-budget=holds", "the shipped model should start green");

    // The lab's step 3.
    const tx = first.transact({
      base: first.state.hash,
      operations: [{ op: "set-quantity-value", id: "telemetry-queue-sram", value: "64 KB" }],
    });
    assert.ok(tx.ok, "the lab's own modification no longer applies");
    assert.equal(budgetOf(first), "sram-fits-budget=refuted");

    new Session(store).save("embedded-sensor-node", first.export());

    // The reload: a brand-new Workspace, as a fresh page would build.
    const stored = new Session(store).restore();
    assert.notEqual(stored, null, "nothing was persisted");
    const second = new Workspace(realPorts);
    assert.ok(second.load(stored?.text ?? "").ok);

    assert.equal(budgetOf(second), "sram-fits-budget=refuted",
      "the restored session re-read the shipped file instead of the student's edit — which is the "
      + "defect this whole seam exists to prevent");
    assert.equal(second.state.hash, first.state.hash,
      "same content must canonicalize to the same hash");
    assert.equal(stored?.exampleId, "embedded-sensor-node");
  });

  it("comments and key order survive, because the text round-trips", () => {
    const store = memoryStore();
    const ws = new Workspace(realPorts);
    assert.ok(ws.load(text()).ok);
    new Session(store).save("embedded-sensor-node", ws.export());
    const restored = new Session(store).restore()?.text ?? "";
    assert.ok(restored.includes("#"), "a comment-free restore means the YAML layer stopped round-tripping");
  });
});

describe("RESET is the only wipe", () => {
  it("clear() removes the session, so the next boot starts fresh", () => {
    const store = memoryStore();
    const ws = new Workspace(realPorts);
    assert.ok(ws.load(text()).ok);
    const session = new Session(store);
    session.save("embedded-sensor-node", ws.export());
    assert.notEqual(session.restore(), null);

    session.clear();
    assert.equal(session.restore(), null, "Reset left a session behind");
  });

  it("Workspace.reset() returns the BASE state — unloaded, so Start re-mounts", () => {
    const ws = new Workspace(realPorts);
    assert.ok(ws.load(text()).ok);
    assert.equal(ws.state.loaded, true);
    assert.ok(ws.state.system.models.size > 0);

    ws.reset();

    assert.equal(ws.state.loaded, false,
      "`loaded` is what mounts Start over the workspace (SH-I1); a Reset that leaves it true "
      + "strands the student on an empty workspace with no chooser");
    assert.equal(ws.state.hypothesis, null);
    assert.equal(ws.state.system.models.size, 0);
  });

  it("reset then load works — Reset must not leave the engine unusable", () => {
    const ws = new Workspace(realPorts);
    assert.ok(ws.load(text()).ok);
    ws.reset();
    assert.ok(ws.load(text()).ok, "the workbench could not re-open an example after Reset");
    assert.equal(budgetOf(ws), "sram-fits-budget=holds");
  });
});

describe("persistence never breaks the workbench", () => {
  it("a store that throws degrades to no-persistence rather than failing the boot", () => {
    const hostile: SessionStore = {
      getItem: () => { throw new Error("private browsing"); },
      setItem: () => { throw new Error("quota"); },
      removeItem: () => { throw new Error("nope"); },
    };
    const session = new Session(hostile);
    assert.doesNotThrow(() => { session.save("x", "text: 1"); });
    assert.equal(session.restore(), null);
    assert.doesNotThrow(() => { session.clear(); });
  });

  it("a corrupt or stale payload is discarded, not guessed at", () => {
    const store = memoryStore();
    const session = new Session(store);
    const key = [...store.map.keys()][0] ?? "mage.workbench.session.v1";

    store.map.set(key, "{not json");
    assert.equal(session.restore(), null, "corrupt JSON must not reach the loader");

    store.map.set(key, JSON.stringify({ version: 999, text: "x" }));
    assert.equal(session.restore(), null, "a payload from another shape must be discarded");

    store.map.set(key, JSON.stringify({ version: 1, text: "   " }));
    assert.equal(session.restore(), null, "an empty document is not a session");
  });

  it("no session means no restore, and that is not an error", () => {
    assert.equal(new Session(memoryStore()).restore(), null);
  });
});
