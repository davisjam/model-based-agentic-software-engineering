/**
 * The page's one line of Worker wiring.
 *
 * Everything else in `src/worker/` is DOM-free, which is what lets `test/worker.test.ts` drive the
 * boundary with a fake and with a real `node:worker_threads` thread. This file holds the single
 * touch of the `Worker` constructor, and it exists so the page's own code is one call rather than a
 * constructor, an adapter and an error handler that a page author has to remember to write.
 *
 * ## The script URL is a PAGE concern
 *
 * `build.mjs` emits `dist/analysis.worker.js` as its own entry point, and `workbench/index.html`
 * loads `./dist/workbench.js`. So the worker's URL is relative to the served page, not to any
 * module here — which is exactly why this function takes it as an argument and why the call site
 * belongs in `src/ui/main.ts`. A path hardcoded in this file would be right for one host and wrong
 * for the Artifact bundle, the Pages site, or a test server.
 *
 * ## The error path is inside the factory, not beside it
 *
 * A worker whose bundle 404s, or whose module throws while loading, never replies. Every request
 * would then await forever — a silent empty result that never even arrives. The `error` listener is
 * wired HERE, in the same expression that creates the client, so there is no shape of this code in
 * which someone wires the worker and forgets the failure.
 */
import { AnalysisClient } from "./client.ts";
import type { AnalysisClientEvents, WorkerLike } from "./client.ts";
import { WORKER_STATE_LIMIT, WORKER_STEP_BUDGET } from "./protocol.ts";
// The contract this file satisfies, imported rather than restated. A second declaration of the
// port's shape here is the drift `RenderPort` paid for once already.
import type { AnalysisPort } from "../app/ports.ts";

/** Adapts the DOM's `MessageEvent` to the shape `AnalysisClient` declares. */
const adapt = (worker: Worker): WorkerLike => ({
  postMessage: (message) => worker.postMessage(message),
  addEventListener: (_type, listener) =>
    worker.addEventListener("message", (event: MessageEvent) => listener({ data: event.data })),
  terminate: () => worker.terminate(),
});

/**
 * Spawn the analysis worker and return a client that reports load failures instead of hanging.
 *
 * `type: "module"` because `analysis.worker.ts` is an ES module and `build.mjs` emits ESM; a classic
 * worker would fail on the first `import` with a message a reader cannot act on.
 */
export function createAnalysisClient(
  scriptUrl: string, events: AnalysisClientEvents,
): AnalysisClient {
  const worker = new Worker(scriptUrl, { type: "module" });
  const client = new AnalysisClient(adapt(worker), events);
  worker.addEventListener("error", (event: ErrorEvent) => {
    client.abort(
      `the analysis worker failed to run (${scriptUrl}): ${event.message || "no message was reported"}. ` +
      `Long explorations and large questions have nowhere to run until this is fixed.`);
  });
  return client;
}

/**
 * The port the page wires: a client spawned on FIRST USE, not at load.
 *
 * Measured, not guessed. `analysis.worker.js` is 350 KB because the Worker now holds the YAML
 * reader, the RDF projection and the query evaluator — the whole point being that the expensive
 * analyses live there. Spawning at page load would charge every visitor that download to run a
 * walk most of them never ask for. Spawning on the first long analysis charges it to the person who
 * asked, at the moment they have already accepted a wait.
 *
 * What this is NOT is a fallback. There is no second code path for "the worker has not started
 * yet": the first call starts it and awaits it like any other. The only behaviour difference is
 * `inFlight()` before the first call, which is empty because nothing is running.
 */
export function createLazyAnalysisPort(
  scriptUrl: string, events: AnalysisClientEvents,
): AnalysisPort {
  let client: AnalysisClient | null = null;
  const started = (): AnalysisClient => (client ??= createAnalysisClient(scriptUrl, events));
  return {
    explore: (source, systemHash, limit = WORKER_STATE_LIMIT) =>
      started().explore(source, systemHash, limit),
    evaluateQuestion: (source, systemHash, question, query, budget = WORKER_STEP_BUDGET) =>
      started().evaluateQuestion(source, systemHash, question, query, budget),
    inFlight: () => client?.inFlight() ?? [],
    cancel: (id) => client?.cancel(id),
  };
}
