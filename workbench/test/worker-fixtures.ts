// The real analysis worker, on a real thread, for any test that needs the boundary rather than the
// protocol.
//
// Extracted on the SECOND consumer, not the third: `worker.test.ts` tests the boundary itself and
// `services.test.ts` tests the facade over it, and two copies of a thread harness would drift in
// exactly the detail that matters -- the `error` handler, without which a bootstrap failure hangs
// the suite instead of reporting why.
import { Worker as ThreadWorker } from "node:worker_threads";
import { AnalysisClient } from "../src/worker/client.ts";
import type { WorkerLike } from "../src/worker/client.ts";
import type { AnalysisState } from "../src/worker/protocol.ts";

export interface Thread {
  readonly client: AnalysisClient;
  /** Every state transition the client reported, in order, for a test that asserts on them. */
  readonly states: readonly (readonly [AnalysisState, number])[];
  stop(): void;
}

/**
 * Spawn the real worker module on a `node:worker_threads` thread.
 *
 * Not a browser: node has no DOM `Worker`, so the browser's constructor, `type: "module"` loading
 * and a bundle served over HTTP stay untested here. What IS real is the thread, the structured-clone
 * algorithm the request and reply pass through, and `src/worker/analysis.worker.ts` itself.
 *
 * The `error` handler is load-bearing. A throw while the bootstrap loads produces no reply at all,
 * so without it every await in the calling test would hang to the runner's timeout and report
 * nothing about the cause.
 */
export function onThread(): Thread {
  const states: [AnalysisState, number][] = [];
  const thread = new ThreadWorker(new URL("./worker-thread-host.mjs", import.meta.url));
  const like: WorkerLike = {
    postMessage: (m) => thread.postMessage(m),
    addEventListener: (_t, l) => { thread.on("message", (data: unknown) => l({ data })); },
    terminate: () => { void thread.terminate(); },
  };
  const client = new AnalysisClient(like, { onState: (s, id) => states.push([s, id]) });
  thread.on("error", (err: Error) => client.abort(`the analysis thread threw: ${err.message}`));
  return { client, states, stop: () => { void thread.terminate(); } };
}
