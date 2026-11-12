/* harness.mjs — load the shipped engine, not a copy of it.
 *
 * The lab is a single self-contained index.html, which is the artifact students run. If the tests
 * held their own copy of the engine the two would drift and the suite would start certifying code
 * nobody loads. So this EXTRACTS the <script id="perf-lab-engine"> element from index.html and
 * evaluates it in a context carrying nothing but a `window` stub. The tested text and the shipped
 * text are therefore the same bytes.
 *
 * That also pins two properties mechanically rather than by review:
 *   - the engine is DOM-free (it would throw here if it touched `document`), and
 *   - it publishes exactly the namespace the UI and the tests consume.
 *
 * Stdlib only. No dependency is added to the page or to the repository.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const INDEX = path.join(HERE, '..', 'index.html');

export function loadEngine() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const m = html.match(/<script id="perf-lab-engine">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('index.html no longer carries <script id="perf-lab-engine">');
  const root = {};
  // No `document` is provided: a DOM reference in the engine throws here.
  new Function('window', m[1])(root);
  if (!root.PerfLab) throw new Error('engine did not publish window.PerfLab');
  return root.PerfLab;
}

export function readIndex() { return fs.readFileSync(INDEX, 'utf8'); }

// ── Tiny assertion kit, so the suite stays stdlib-only ──────────────────────
let failures = 0, checks = 0;
export function ok(name, cond, detail) {
  checks += 1;
  if (cond) { console.log('  ok    ' + name + (detail ? '   ' + detail : '')); }
  else { failures += 1; console.log('  FAIL  ' + name + (detail ? '   ' + detail : '')); }
}
export function near(name, got, want, tolFrac, detail) {
  const good = Math.abs(got - want) <= Math.abs(want) * tolFrac;
  ok(name, good, detail || ('got ' + got.toFixed(2) + ', want ~' + want.toFixed(2)));
}
export function summary(label) {
  console.log('\n' + label + ': ' + (checks - failures) + '/' + checks + ' passed');
  return failures;
}

// ── Model builders shared by the test files ────────────────────────────────
export const station = (id, name, servers, meanMs, kind = 'exponential', queueCapacity = null) =>
  ({ id, name, servers, queueCapacity, serviceTime: { kind, meanMs } });

export const workload = (rate, stationIds, extra = {}) => Object.assign({
  arrivalRatePerSecond: rate,
  arrivalPattern: 'poisson',
  requestClasses: [{ id: 'req', name: 'Request', probability: 1,
                     route: stationIds.map((s) => ({ stationId: s })) }],
  durationSeconds: 300,
  seed: 42,
}, extra);
