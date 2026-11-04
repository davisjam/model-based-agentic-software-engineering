/* harness.mjs — load the shipped engine, not a copy of it.
 *
 * The demonstration is a single self-contained index.html, which is the artifact students run. If
 * the tests held their own copy of the engine the two would drift, and the suite would start
 * certifying code nobody loads. So the harness EXTRACTS the <script id="nplus1-engine"> element
 * from index.html and evaluates it with nothing but a `window` stub. The tested text and the
 * shipped text are therefore the same bytes.
 *
 * That also pins two properties the specification asks for, mechanically rather than by review:
 *   - the engine is DOM-free (it would throw here if it touched the page), and
 *   - the engine publishes exactly the namespace the interface and the tests consume.
 *
 * Stdlib only. No dependency is added to the page or to the repository.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEMO_HTML = join(HERE, '..', 'index.html');
const ENGINE_ID = 'nplus1-engine';

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
  if (!source.includes('NPlusOne')) throw new Error('extracted engine does not publish NPlusOne');
  return source;
}

/**
 * Evaluate the engine against a `window` stub and return the namespace it publishes.
 *
 * `new Function` rather than `node:vm`: a vm context has its OWN array and object intrinsics, so
 * every array the engine returned would fail a deep-equality assertion for a reason that has
 * nothing to do with the model. Here the engine shares the test realm's intrinsics, and the
 * DOM-freedom check still holds — Node has no page object, so a reference to one throws a
 * ReferenceError rather than passing silently.
 */
export function loadEngine() {
  const stub = {};
  const run = new Function('window', `${extractEngineSource()}\nreturn window;`);
  const published = run(stub);
  if (!published.NPlusOne) throw new Error('engine did not publish window.NPlusOne');
  return published.NPlusOne;
}

/** Shared instance: every test file loads the same evaluated engine. */
export const M = loadEngine();

/** The lecture's configuration, which several files start from. */
export const LANDER = {
  reservations: 200, latencyMs: 10, distinctRooms: 10, strategy: 'lazy', cache: 'off',
};

/** `LANDER` with the named fields replaced. */
export function withParams(overrides) {
  return { ...LANDER, ...overrides };
}

/** The query count for a configuration expressed as overrides on `LANDER`. */
export function queries(overrides) {
  return M.countQueries(withParams(overrides));
}
