/* harness.mjs — load the shipped engine, not a copy of it.
 *
 * The simulator is a single self-contained index.html, which is the artifact students run. If the
 * tests held their own copy of the engine the two would drift, and the suite would start certifying
 * code nobody loads. So the harness EXTRACTS the <script id="queue-sim-engine"> element from
 * index.html and evaluates it in a Node vm context carrying nothing but a `window` stub. The tested
 * text and the shipped text are therefore the same bytes.
 *
 * That also pins two properties the specification asks for, mechanically rather than by review:
 *   - the engine is DOM-free (it would throw here if it touched `document`), and
 *   - the engine publishes exactly the namespace the UI and the tests consume.
 *
 * Stdlib only. No dependency is added to the page or to the repository.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const SIMULATOR_HTML = join(HERE, '..', 'index.html');
const ENGINE_ID = 'queue-sim-engine';
const UI_ID = 'queue-sim-ui';

/** The raw text of the simulator page. */
export function readSimulatorHtml() {
  return readFileSync(SIMULATOR_HTML, 'utf8');
}

/** The source text of the engine script element, located by id. */
export function extractEngineSource(html = readSimulatorHtml()) {
  const open = html.indexOf(`<script id="${ENGINE_ID}">`);
  if (open < 0) throw new Error(`index.html has no <script id="${ENGINE_ID}"> element`);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', bodyStart);
  if (close < 0) throw new Error(`<script id="${ENGINE_ID}"> is unterminated`);
  const source = html.slice(bodyStart, close);
  if (!source.includes('QueueSim')) throw new Error('extracted engine does not publish QueueSim');
  return source;
}

/**
 * The source text of the INTERFACE script element, located by id.
 *
 * Read as text and never evaluated: the interface touches `document` on its first line, so loading
 * it in Node would throw. What it is wanted for is structural assertions about the interface —
 * which readouts it writes, what a control handler restores — which are exactly the claims a
 * presentation change can break without changing a single engine line. The precondition is
 * asserted so a renamed element cannot turn this into a silent pass over an empty string.
 */
export function extractUiSource(html = readSimulatorHtml()) {
  const open = html.indexOf(`<script id="${UI_ID}">`);
  if (open < 0) throw new Error(`index.html has no <script id="${UI_ID}"> element`);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', bodyStart);
  if (close < 0) throw new Error(`<script id="${UI_ID}"> is unterminated`);
  const source = html.slice(bodyStart, close);
  if (!source.includes('getElementById')) {
    throw new Error('extracted interface source does not touch the DOM — wrong element');
  }
  return source;
}

/**
 * Evaluate the engine against a `window` stub and return the namespace it publishes.
 *
 * `new Function` rather than `node:vm`: a vm context has its OWN array and object intrinsics, so
 * every array the engine returned would fail `assert.deepStrictEqual` against a host array for a
 * reason that has nothing to do with the simulator. Here the engine shares the test realm's
 * intrinsics, and the DOM-freedom check still holds — Node has no `document`, so a DOM reference
 * throws a ReferenceError rather than passing silently.
 */
export function loadEngine() {
  const stub = {};
  const run = new Function('window', `${extractEngineSource()}\nreturn window;`);
  const published = run(stub);
  if (!published.QueueSim) throw new Error('engine did not publish window.QueueSim');
  return published.QueueSim;
}

/** Shared instance: every test file loads the same evaluated engine. */
export const Q = loadEngine();

/** Run a simulation to a completion count and return (snapshot, sim). */
export function runToCompletions(options, completions) {
  const sim = Q.createSimulation({ completionLogLimit: 0, ...options });
  Q.advanceSimulation(sim, { maxCompletions: completions });
  return { sim, stats: Q.snapshot(sim) };
}

/** Mean and sample standard deviation of an array. */
export function meanAndSd(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (n < 2) return { mean, sd: 0, n };
  const variance = values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1);
  return { mean, sd: Math.sqrt(variance), n };
}
