// The Worker boundary. The behaviour worth pinning is staleness: a result for a model the user has
// already changed must never reach the UI, and the client must decide that once rather than
// trusting every call site to remember.
import { test } from "node:test";
import assert from "node:assert/strict";
import { AnalysisClient } from "../src/worker/client.ts";
import type { WorkerLike } from "../src/worker/client.ts";
import type { AnalysisState, WorkerReply, WorkerRequest } from "../src/worker/protocol.ts";
import type { QueryResult } from "../src/ir/types.ts";

const result = (hash: string, bounded = false): QueryResult => ({
  outcome: bounded ? "inconclusive" : "refuted",
  coverage: bounded
    ? { kind: "bounded", statesExplored: 1_000_000, reason: "state-limit" }
    : { kind: "exhaustive", statesExplored: 37, reason: null },
  evidence: null, refusal: null, interpretedAs: null, compilation: [], systemHash: hash,
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

test("a matching reply resolves with the result", async () => {
  const { worker, client, states } = harness();
  const p = client.analyze({}, "fnv1a64:aaaa", { kind: "graph" });
  worker.reply({ kind: "result", id: worker.lastId(), systemHash: "fnv1a64:aaaa", result: result("fnv1a64:aaaa") });
  const out = await p;
  assert.equal(out.status, "ok");
  assert.deepEqual(states.map(([s]) => s), ["running", "complete"]);
});

test("a reply for a superseded model is STALE, not a result", async () => {
  const { worker, client, states } = harness();
  const p = client.analyze({}, "fnv1a64:aaaa", { kind: "graph" });
  // The user edited while analysis ran; the worker answers about the OLD system.
  worker.reply({ kind: "result", id: worker.lastId(), systemHash: "fnv1a64:bbbb", result: result("fnv1a64:bbbb") });
  const out = await p;
  assert.equal(out.status, "stale", "a result for another revision must not reach the caller");
  assert.ok(states.some(([s]) => s === "stale"));
});

test("bounded coverage reports bounded, and the outcome is inconclusive", async () => {
  const { worker, client, states } = harness();
  const p = client.analyze({}, "h", {});
  worker.reply({ kind: "result", id: worker.lastId(), systemHash: "h", result: result("h", true) });
  const out = await p;
  assert.equal(out.status, "ok");
  if (out.status === "ok") assert.equal(out.result.outcome, "inconclusive");
  assert.ok(states.some(([s]) => s === "bounded"), "the UI needs to distinguish bounded from complete");
});

test("cancellation settles without a result", async () => {
  const { worker, client } = harness();
  const p = client.analyze({}, "h", {});
  const id = worker.lastId();
  client.cancel(id);
  worker.reply({ kind: "cancelled", id });
  assert.equal((await p).status, "cancelled");
  assert.deepEqual(client.inFlight(), []);
});

test("in-flight ids are visible, and a late duplicate reply is ignored", async () => {
  const { worker, client } = harness();
  const p = client.analyze({}, "h", {});
  const id = worker.lastId();
  assert.deepEqual(client.inFlight(), [id]);
  worker.reply({ kind: "result", id, systemHash: "h", result: result("h") });
  await p;
  assert.deepEqual(client.inFlight(), []);
  worker.reply({ kind: "result", id, systemHash: "h", result: result("h") }); // must not throw
});

test("saved-query batch returns a map", async () => {
  const { worker, client } = harness();
  const p = client.analyzeSaved({}, "h");
  worker.reply({ kind: "results", id: worker.lastId(), systemHash: "h", results: [["q1", result("h")]] });
  const out = await p;
  assert.equal(out.status, "ok-many");
  if (out.status === "ok-many") assert.equal(out.results.get("q1")?.outcome, "refuted");
});
