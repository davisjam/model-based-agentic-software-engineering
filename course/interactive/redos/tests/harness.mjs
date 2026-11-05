/* harness.mjs — load the shipped engine, not a copy of it.
 *
 * The demonstration is a single self-contained index.html, which is the artifact students run. If
 * the tests held their own copy of the engine the two would drift, and the suite would start
 * certifying code nobody loads. So the harness EXTRACTS the <script id="redos-engine"> element from
 * index.html and evaluates it with nothing but a `window` stub. The tested text and the shipped text
 * are therefore the same bytes.
 *
 * The page does the same extraction for a different reason: it builds its Web Worker out of this
 * element's text. So three consumers read one source — the page, the worker, and this suite.
 *
 * That also pins two properties the specification asks for, mechanically rather than by review:
 *   - the engine is DOM-free (it would throw here if it touched `document`), and
 *   - the engine publishes exactly the namespace the UI, the worker, and the tests consume.
 *
 * Stdlib only. No dependency is added to the page or to the repository.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEMO_HTML = join(HERE, '..', 'index.html');
const ENGINE_ID = 'redos-engine';

/** The raw text of the demonstration page. */
export function readDemoHtml() {
  return readFileSync(DEMO_HTML, 'utf8');
}

/** The source text of the engine script element, located by id. */
export function extractEngineSource(html = readDemoHtml()) {
  const open = html.indexOf(`<script id="${ENGINE_ID}">`);
  if (open < 0) throw new Error(`index.html has no <script id="${ENGINE_ID}"> element`);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', bodyStart);
  if (close < 0) throw new Error(`<script id="${ENGINE_ID}"> is unterminated`);
  const source = html.slice(bodyStart, close);
  if (!source.includes('ReDoS')) throw new Error('extracted engine does not publish ReDoS');
  return source;
}

/**
 * Evaluate the engine against a `window` stub and return the namespace it publishes.
 *
 * `new Function` rather than `node:vm`: a vm context has its OWN array and object intrinsics, so
 * every array the engine returned would fail `assert.deepStrictEqual` against a host array for a
 * reason that has nothing to do with the demonstration. Here the engine shares the test realm's
 * intrinsics, and the DOM-freedom check still holds — Node has no `document`, so a DOM reference
 * throws a ReferenceError rather than passing silently.
 */
export function loadEngine() {
  const stub = {};
  const run = new Function('window', `${extractEngineSource()}\nreturn window;`);
  const published = run(stub);
  if (!published.ReDoS) throw new Error('engine did not publish window.ReDoS');
  return published.ReDoS;
}

/** Shared instance: every test file loads the same evaluated engine. */
export const R = loadEngine();

/**
 * The clock the engine is given in these tests.
 *
 * The engine takes its clock as an argument precisely so this can differ from the browser's. Node's
 * global `performance.now` is monotonic and sub-millisecond, which is what a bounded-execution
 * assertion needs — `Date.now` would make a 2 ms budget untestable.
 */
export const now = () => performance.now();

/** A deterministic fake clock, for assertions about budget arithmetic rather than about speed. */
export function fakeClock(stepMs) {
  let t = 0;
  const step = typeof stepMs === 'number' ? stepMs : 1;
  const fn = () => { const v = t; t += step; return v; };
  fn.set = (v) => { t = v; };
  fn.peek = () => t;
  return fn;
}

/* --- the worker, assembled the way the page assembles it ------------------------------------- */

/**
 * The exact prefix the page prepends to the engine when building the worker.
 *
 * Read out of the page rather than restated here. The convention ("in a worker there is no
 * `window`, so make one") belongs to the page, and a copy in the test would let the two drift
 * apart — at which point the suite would be exercising an assembly nobody ships.
 */
export function extractWorkerPrefix(html = readDemoHtml()) {
  const m = html.match(/var WORKER_PREFIX = '((?:\\.|[^'\\])*)';/);
  if (!m) throw new Error('the page does not declare WORKER_PREFIX');
  return m[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\')
    .replace(/\\'/g, "'");
}

/** The worker-protocol function's text, delimited in the page by explicit markers. */
export function extractWorkerProtocolSource(html = readDemoHtml()) {
  const begin = html.indexOf('WORKER-PROTOCOL-BEGIN');
  if (begin < 0) throw new Error('the page has no WORKER-PROTOCOL-BEGIN marker');
  const end = html.indexOf('WORKER-PROTOCOL-END', begin);
  if (end < 0) throw new Error('the page has no WORKER-PROTOCOL-END marker');
  const fnStart = html.indexOf('function workerMain', begin);
  if (fnStart < 0 || fnStart > end) throw new Error('no workerMain between the markers');
  const lastBrace = html.lastIndexOf('}', end);
  return html.slice(fnStart, lastBrace + 1);
}

/** The worker's full source, assembled from the page's own three pieces. */
export function buildWorkerSource(html = readDemoHtml()) {
  return `${extractWorkerPrefix(html)}${extractEngineSource(html)}\n(${extractWorkerProtocolSource(html)})();\n`;
}

/**
 * Evaluate the worker's source against a fake `self` and return a driver for it.
 *
 * This runs the REAL protocol code — the same text the page ships into the worker — without a
 * browser, so the message contract is covered on every machine. What it cannot cover is the part
 * that needs a real worker: that an expensive match leaves the page responsive, and that destroying
 * a worker frees the page and a fresh one serves the next run. Those live in browser_test.py.
 */
export function spawnFakeWorker() {
  const sent = [];
  const fakeSelf = {
    performance: { now: () => performance.now() },
    postMessage: (m) => { sent.push(m); },
  };
  const evaluate = new Function('self', buildWorkerSource());
  evaluate(fakeSelf);
  return {
    sent,
    get published() { return fakeSelf.ReDoS; },
    /** Deliver a message and return everything the worker posted in response to it. */
    send(message) {
      const before = sent.length;
      if (typeof fakeSelf.onmessage !== 'function') {
        throw new Error('the worker installed no message handler');
      }
      fakeSelf.onmessage({ data: message });
      return sent.slice(before);
    },
  };
}

/** A trial result shaped the way the worker would send one, for sweep-state assertions. */
/**
 * The CANONICAL configuration id for a baseline name.
 *
 * A configuration is identified by `<patternId>.<inputId>`, and the sweep compares results against
 * that string. The baseline names the classroom uses ('quadratic', 'safe') are shorthands that
 * resolve to one. Tests look the canonical form UP rather than embedding a snapshot of it, so
 * adding a pattern or renaming an input shape cannot leave a test asserting a string the engine no
 * longer produces.
 */
export function cfg(baselineOrConfig) {
  return R.findExperiment(baselineOrConfig).id;
}

export function fakeResult(experimentId, length, over, extra) {
  return {
    experimentId: cfg(experimentId),
    length,
    inputLength: length + 1,
    matched: false,
    expectedMatch: false,
    matchedAsExpected: true,
    repeats: 1,
    totalMs: over ? 300 : 3,
    msPerExecution: over ? 300 : 3,
    budgetMs: 250,
    budgetExceeded: Boolean(over),
    terminated: false,
    ...(extra || {}),
  };
}
