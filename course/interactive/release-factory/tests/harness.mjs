/* harness.mjs — load the shipped engine, not a copy of it.
 *
 * The simulator is a single self-contained index.html, which is the artifact students run. If the
 * tests held their own copy of the engine the two would drift, and the suite would start certifying
 * code nobody loads. So the harness EXTRACTS the <script id="factory-engine"> element from
 * index.html and evaluates it in a context carrying nothing but a `window` stub. The tested text
 * and the shipped text are therefore the same bytes.
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
const ENGINE_ID = 'factory-engine';

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
  if (!source.includes('ReleaseFactory')) {
    throw new Error('extracted engine does not publish ReleaseFactory');
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
  if (!published.ReleaseFactory) throw new Error('engine did not publish window.ReleaseFactory');
  return published.ReleaseFactory;
}

/** Shared instance: every test file loads the same evaluated engine. */
export const RF = loadEngine();

export const DAY = RF.HOURS_PER_DAY;

/** Run a simulation for `days` of simulated time and return (sim, stats). */
export function runDays(options, days) {
  const sim = RF.createSimulation({ quantileWindow: 16384, ...options });
  RF.advanceSimulation(sim, { untilTime: days * DAY });
  return { sim, stats: RF.snapshot(sim) };
}

/** Every defect instance the run produced. */
export function ledgerOf(sim) { return sim.ledger; }

/** Mean and sample standard deviation of an array. */
export function meanAndSd(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (n < 2) return { mean, sd: 0, n };
  const variance = values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1);
  return { mean, sd: Math.sqrt(variance), n };
}

/**
 * Half-width of a two-sided 99.9% interval for a BINOMIAL proportion, from the SPECIFIED
 * probability and the observed sample size.
 *
 * Used instead of a flat percentage because the right tolerance depends on n and on p: at
 * p = 0.5, n = 400 the sampling standard error is 2.5 percentage points, and at p = 0.02,
 * n = 40000 it is 0.07 — a single fixed band would be vacuous at one end and flaky at the other.
 * z = 3.2905 is the normal 99.95% quantile, so a correct engine fails this check about once in a
 * thousand runs per assertion, and every one of these runs is SEEDED, so in practice it either
 * passes forever or reports a real defect.
 *
 * The normal approximation needs np and n(1-p) comfortably above 10; each caller asserts that.
 */
export function binomialTolerance(p, n, z = 3.2905) {
  if (!(n > 0)) throw new Error('binomialTolerance: n must be > 0');
  return z * Math.sqrt((p * (1 - p)) / n);
}
