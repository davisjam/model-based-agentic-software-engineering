/* test-packaging.mjs — the self-containment contract, enforced on the shipped bytes.
 *
 * "No external dependencies" and "works from a file:// URL" are properties of the FILE, so they are
 * checked by reading the file rather than by inspecting the running page. A browser test would also
 * catch a CDN script, but only on the one machine that ran it and only if the network happened to
 * be reachable; this check holds on every machine, including a CI runner with no browser at all.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readSimulatorHtml, extractEngineSource, loadEngine, SIMULATOR_HTML } from './harness.mjs';

const html = readSimulatorHtml();

test('the page is a single file with no external reference', () => {
  /* Every src/href must be either an inline data: URI, a document-local fragment, the page's own
     filename (the Download control), or an external https link the reader clicks deliberately.
     Nothing may be FETCHED from another origin while the page loads. */
  const refs = [...html.matchAll(/(?:src|href)\s*=\s*"([^"]*)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 0, 'no references found — the regex is wrong');
  const fetched = refs.filter((r) => !r.startsWith('https://'));
  for (const ref of fetched) {
    const ok = ref.startsWith('data:') || ref.startsWith('#') || ref === 'index.html';
    assert.ok(ok, `the page loads an external resource: ${ref}`);
  }
  /* The https references are anchor targets only — licence links in prose. */
  for (const ref of refs.filter((r) => r.startsWith('https://'))) {
    assert.match(ref, /^https:\/\/creativecommons\.org\//, `unexpected external link: ${ref}`);
  }
});

test('there is a favicon, so the browser issues no request for one', () => {
  /* A page without a favicon link makes the browser fetch /favicon.ico. That is a network request,
     and the "no network requests" criterion would fail on a technicality nobody would look for. */
  assert.match(html, /<link rel="icon" href="data:image\/svg\+xml,/);
});

test('no script or style is loaded from elsewhere', () => {
  assert.equal(/<script[^>]+\bsrc\s*=/.test(html), false, 'an external script is loaded');
  assert.equal(/<link[^>]+rel="stylesheet"/.test(html), false, 'an external stylesheet is loaded');
  assert.equal(/@import/.test(html), false, 'a CSS @import is present');
  assert.equal(/@font-face/.test(html), false, 'a webfont is declared');
});

test('no network API is reachable from the page at all', () => {
  for (const api of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'EventSource',
    'navigator.sendBeacon', 'import(']) {
    assert.equal(html.includes(api), false, `the page references ${api}`);
  }
});

/** Engine source with comments removed — the engine DISCUSSES the DOM surfaces it must not use. */
function engineCode(source = extractEngineSource(html)) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

test('the engine is DOM-free', () => {
  /* Structurally: the executable source must not mention a browser surface. Behaviourally:
     loadEngine evaluates it with no `document` in scope, so a reference would throw a
     ReferenceError. Both, because the structural check also catches a reference on a code path the
     tests never take. */
  const code = engineCode();
  for (const api of ['document', 'getElementById', 'addEventListener', 'requestAnimationFrame',
    'localStorage', 'getContext', 'performance.now']) {
    assert.equal(code.includes(api), false, `the engine references ${api}`);
  }
  assert.doesNotThrow(() => loadEngine());
});

test('the engine publishes exactly the required namespace', () => {
  const Q = loadEngine();
  for (const name of ['createSimulation', 'advanceSimulation', 'calculateMM1', 'calculateMD1',
    'runSelfTests']) {
    assert.equal(typeof Q[name], 'function', `window.QueueSim.${name} is missing`);
  }
  assert.equal(Q.DEFAULT_SEED, 30861, 'the default seed is not 30861');
});

test('the built-in self-tests all pass', () => {
  const report = loadEngine().runSelfTests();
  const failures = report.results.filter((r) => !r.passed)
    .map((r) => `${r.name}: ${r.detail}`);
  assert.deepEqual(failures, [], `in-page self-tests failed:\n${failures.join('\n')}`);
  assert.ok(report.total >= 12, `only ${report.total} self-tests are declared`);
});

test('no control is exposed for a mechanism that is not implemented', () => {
  /* The reliability extension is anticipated in the engine but not implemented, and the brief is
     explicit that a knob which does nothing is worse than a missing knob. */
  const forbidden = [
    /id="(queue-?capacity|retry[-\w]*|timeout[-\w]*|backoff[-\w]*|jitter[-\w]*|admission[-\w]*)"/i,
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(html), false, `a control matching ${pattern} is exposed`);
  }
  /* But the architectural seam IS present: request identity is distinguished from attempt
     identity, and the timeout rung exists in the ordering policy. */
  const source = extractEngineSource(html);
  assert.ok(source.includes('requestId') && source.includes('attemptId'),
    'logical request and physical attempt are not distinguished');
  assert.ok(loadEngine().EVENT_ORDER.includes('timeout'),
    'the timeout rung is missing from the ordering policy');
});

test('the primary controls carry the documented defaults and ranges', () => {
  const field = (id) => {
    const m = html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`));
    assert.ok(m, `no input with id="${id}"`);
    const attrs = {};
    for (const a of m[0].matchAll(/(\w+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    return attrs;
  };
  const lambda = field('lambda');
  assert.equal(lambda.min, '0');
  assert.equal(lambda.max, '150');
  assert.equal(lambda.step, '1');
  assert.equal(lambda.value, '30');
  const mu = field('mu');
  assert.equal(mu.min, '20');
  assert.equal(mu.max, '200');
  assert.equal(mu.step, '1');
  assert.equal(mu.value, '100');
  assert.equal(field('seed').value, '30861');
  assert.equal(field('warmup').value, '0');
  assert.equal(field('maxdisp').value, '40');
  assert.equal(field('history').value, '120');
  /* Simulation speed defaults to 10x. */
  assert.match(html, /data-speed="10" aria-pressed="true"/);
  /* Arrival distribution is fixed at Poisson and presented as such, not as a control. */
  assert.match(html, /Poisson \(fixed\)/);
});

test('the precision point about the knee survives into the page copy', () => {
  /* This sentence is the pedagogical heart of the exercise and the easiest thing for a later edit
     to smooth away, so it is pinned. */
  assert.match(html, /no mathematically distinguished knee/i);
  assert.match(html, /diverges as\s+utilization approaches 100%/i);
  assert.match(html, /Engineers\s*\n?\s*pick an operational threshold/i);
  assert.match(html, /Little's Law does not predict the knee|Little&rsquo;s Law does not predict the knee/i);
});

test('the no-finite-prediction wording is the specified wording', () => {
  const Q = loadEngine();
  assert.match(Q.calculateMM1(110, 100).reason,
    /^No finite steady-state prediction: offered load exceeds service capacity\.$/);
  assert.match(Q.calculateMM1(100, 100).reason,
    /^No finite steady-state prediction: offered load meets service capacity\.$/);
});

test('the file is small enough to hand to a classroom', () => {
  const bytes = Buffer.byteLength(html, 'utf8');
  assert.ok(bytes < 250000, `${SIMULATOR_HTML} is ${bytes} bytes`);
  assert.ok(bytes > 40000, `${SIMULATOR_HTML} is only ${bytes} bytes — did it truncate?`);
});

test('exactly one h1, and every canvas is described for assistive technology', () => {
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  const canvases = [...html.matchAll(/<canvas[^>]*>/g)].map((m) => m[0]);
  assert.equal(canvases.length, 3, `expected 3 canvases, found ${canvases.length}`);
  for (const c of canvases) {
    assert.match(c, /role="img"/, `canvas without role="img": ${c}`);
    assert.match(c, /aria-labelledby="/, `canvas without a description: ${c}`);
  }
  /* Each description target exists and is a live region, so the text updates as the run proceeds. */
  for (const id of ['queue-alt', 'rt-alt', 'knee-alt']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-live="polite"`), `${id} is not a live region`);
  }
});

test('a reduced-motion mode is offered and the OS preference is honoured', () => {
  assert.match(html, /id="reduced"/);
  assert.match(html, /prefers-reduced-motion/);
});
