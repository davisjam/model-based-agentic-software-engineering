// Runs the REAL analysis worker on a real thread, for `test/worker.test.ts`.
//
// node's test runner has no DOM `Worker`, and that absence is why this gap survived having a test
// file: a fake `WorkerLike` exercises the protocol's SHAPE and tells you nothing about whether the
// worker module runs, whether its requests survive serialization, or whether the two sides derive
// the same hash. `node:worker_threads` gives a real thread with the real structured-clone algorithm,
// so everything except the browser's `Worker` constructor is under test.
//
// The shim is four lines because the worker's contact with its host is four lines: it registers one
// `message` listener on `self` and calls `self.postMessage`. Nothing else here pretends to be a
// browser.
import { parentPort } from "node:worker_threads";

if (parentPort === null) throw new Error("worker-thread-host runs only as a worker thread");

const listeners = [];

globalThis.self = {
  addEventListener: (type, listener) => {
    if (type === "message") listeners.push(listener);
  },
  postMessage: (message) => parentPort.postMessage(message),
};

// Import BEFORE subscribing to the port. The worker module registers its listener at import time,
// so a request that arrived first would have nobody to hand it to and would be dropped in silence.
await import("../src/worker/analysis.worker.ts");

if (listeners.length === 0) {
  throw new Error("the analysis worker did not register a message listener");
}

parentPort.on("message", (data) => {
  for (const listener of listeners) listener({ data });
});
