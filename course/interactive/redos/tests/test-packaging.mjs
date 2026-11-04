/* test-packaging.mjs — the self-containment contract, enforced on the shipped bytes.
 *
 * "No external dependencies" and "works from a file:// URL" are properties of the FILE, so they are
 * checked by reading the file rather than by inspecting the running page. A browser test would also
 * catch a CDN script, but only on the one machine that ran it and only if the network happened to
 * be reachable; this check holds on every machine, including a CI runner with no browser at all.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readDemoHtml, extractEngineSource, loadEngine, DEMO_HTML } from './harness.mjs';

const html = readDemoHtml();

test('the page is a single file with no external reference', () => {
  /* Every src/href must be either an inline data: URI, a document-local fragment, the page's own
     filename (the Download control), or an external https link the reader clicks deliberately.
     Nothing may be FETCHED from another origin while the page loads. */
  const refs = [...html.matchAll(/(?:src|href)\s*=\s*"([^"]*)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 0, 'no references found — the regex is wrong');
  for (const ref of refs.filter((r) => !r.startsWith('https://'))) {
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
  /* `URL.createObjectURL` is deliberately absent from this list: a blob: URL names an in-memory
     object and fetching it issues no network request. It is how the worker script is delivered
     without a second file, which is what keeps the page openable from file://. */
  for (const api of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'EventSource',
    'navigator.sendBeacon', 'import(', 'importScripts']) {
    assert.equal(html.includes(api), false, `the page references ${api}`);
  }
});

/**
 * Engine source reduced to its EXECUTABLE text: comments and string literals removed.
 *
 * Both removals are necessary, and each was necessary for a reason worth recording. The engine
 * DISCUSSES the DOM surfaces it must not use — its header explains why it may not touch
 * `document` — so a check over the raw text fires on the explanation. It also carries prose in
 * string literals: the isolation mitigation's detail names the Web Worker the page runs the match
 * in. Neither is a reference to the API. A check that cannot tell a mention from a call gets
 * relaxed by the next person who hits it, which costs more than it ever caught.
 */
function engineCode(source = extractEngineSource(html)) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

test('the engine is DOM-free and clock-free', () => {
  /* Structurally: the executable source must not mention a browser surface. Behaviourally:
     loadEngine evaluates it with no `document` in scope, so a reference would throw a
     ReferenceError. Both, because the structural check also catches a reference on a code path the
     tests never take.

     `performance` is on the list for a reason beyond tidiness: the engine takes its clock as an
     argument so the SAME bytes can be measured inside a worker and asserted in Node. An engine
     that reached for a clock of its own would silently break that equivalence. */
  /* Word-boundary matched, not substring matched. A plain `includes('document')` also fires on the
     word "documented", which the engine uses in a self-test's name — and a check that red-flags its
     own prose gets relaxed rather than obeyed. */
  const code = engineCode();
  for (const api of ['document', 'getElementById', 'addEventListener', 'requestAnimationFrame',
    'localStorage', 'getContext', 'performance', 'Worker', 'postMessage', 'setTimeout',
    'setInterval', 'createObjectURL', 'navigator', 'location']) {
    assert.equal(new RegExp(`\\b${api}\\b`).test(code), false, `the engine references ${api}`);
  }
  /* One window reference only: the namespace it publishes. */
  assert.equal((code.match(/window\./g) || []).length, 1, 'the engine touches window more than once');
  assert.doesNotThrow(() => loadEngine());
});

test('the engine publishes the namespace the page, the worker, and the tests consume', () => {
  const R = loadEngine();
  const required = [
    'compile', 'buildInput', 'describeInputShape', 'excerptInput',
    'findExperiment', 'experimentIds', 'lengthLadder', 'lengthBounds',
    'checkMatchExamples', 'equivalenceDivergences',
    'warmUp', 'measureTrial',
    'createSweep', 'nextTrialSpec', 'recordResult', 'recordTermination', 'sweepSummary',
    'observedScaling', 'predictedCandidates', 'predictedCandidateCurve',
    'compositionCount', 'enumerateCompositions', 'splitPointModel', 'backtrackingModel',
    'findMitigation', 'assessMitigations', 'runSelfTests',
  ];
  for (const name of required) {
    assert.equal(typeof R[name], 'function', `window.ReDoS.${name} is missing`);
  }
  for (const name of ['EXPRESSIONS', 'EXPERIMENTS', 'MATCH_EXAMPLES', 'MITIGATIONS',
    'THREAT_MODEL', 'EQUIVALENCE_ALPHABET']) {
    assert.ok(R[name], `window.ReDoS.${name} is missing`);
  }
  assert.equal(R.BUDGET_MS, 250);
  assert.equal(R.DEADLINE_MS, 400);
});

test('the built-in self-tests all pass', () => {
  const report = loadEngine().runSelfTests();
  const failures = report.results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.detail}`);
  assert.deepEqual(failures, [], `in-page self-tests failed:\n${failures.join('\n')}`);
  assert.ok(report.total >= 14, `only ${report.total} self-tests are declared`);
});

test('no control is exposed for executing an arbitrary expression', () => {
  /* The specification is explicit: no arbitrary user-supplied regex execution in the initial
     version. A box that compiles whatever a reader types turns a teaching instrument into a way to
     hang a tab, and the lesson does not need it. */
  assert.equal(/<textarea/.test(html), false, 'a free-text area is exposed');
  assert.equal(/id="(pattern|regex|expression|custom[-\w]*)"/i.test(html), false,
    'an expression input is exposed');
  const inputs = [...html.matchAll(/<input[^>]*>/g)].map((m) => m[0]);
  for (const el of inputs) {
    assert.match(el, /type="(range|number|checkbox)"/,
      `an input of a free-text kind is exposed: ${el}`);
  }
});

test('the page states both accuracy constraints, in the body a reader sees', () => {
  /* These two sentences are the pedagogical heart of the exercise and the easiest thing for a
     later edit to smooth away, so they are pinned.

     (1) Cloudflare was not an attack. (2) This page does not reproduce Cloudflare's behaviour. */
  const body = html.slice(html.indexOf('<body>'));
  assert.match(body, /deployed by Cloudflare itself/);
  assert.match(body, /no adversary was involved/);
  assert.match(body, /nevertheless exploitable as a denial-of-service\s+vulnerability/);
  assert.match(body, /does <em>not<\/em> reproduce Cloudflare's production/);
  assert.match(body, /same <em>class<\/em> of algorithmic vulnerability/);
});

test('the page attributes the Stack Overflow pattern honestly', () => {
  /* The historical expression was theirs, not this one. Claiming otherwise would be the same
     category of error as claiming to reproduce Cloudflare.

     Read off the ENGINE's data rather than the HTML text: this prose lives in a JavaScript string
     that the source splits across a concatenation, so a `match` against the file would be testing
     the line breaks rather than the sentence. Assert where the value actually is. */
  const why = loadEngine().EXPRESSIONS.trimLike.why;
  assert.match(why, /Stack Overflow/);
  assert.match(why, /same class rather than the same expression/);
  assert.match(why, /theirs was/, 'the page does not say whose expression it was');
});

test('every canvas is described for assistive technology, and the chart has a text equivalent', () => {
  const canvases = [...html.matchAll(/<canvas[^>]*>/g)].map((m) => m[0]);
  assert.equal(canvases.length, 2, `expected 2 canvases, found ${canvases.length}`);
  for (const c of canvases) {
    assert.match(c, /role="img"/, `canvas without role="img": ${c}`);
    assert.match(c, /aria-labelledby="/, `canvas without a description: ${c}`);
  }
  /* The descriptions are live regions, so they update as a run proceeds rather than describing the
     empty chart forever. */
  for (const id of ['growth-alt', 'work-alt']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-live="polite"`), `${id} is not live`);
  }
  /* And the measured chart has a real text equivalent, not merely a summary: a table whose rows
     are the plotted points. */
  assert.match(html, /id="results-table"/);
  assert.match(html, /the chart’s text equivalent/);
});

test('the backtracking diagram is labelled a model and not a trace', () => {
  /* The single most important label on the page, and the one a later edit is most likely to
     shorten into a claim the page must not make. */
  const start = html.indexOf('id="model-caveat"');
  assert.ok(start > 0, 'there is no caveat on the backtracking diagram');
  const box = html.slice(start, start + 1500);
  assert.match(box, /conceptual model of backtracking, not a trace/);
  assert.match(box, /may optimise some away/);
  assert.match(box, /compared<\/em> against the measurements/);
  assert.match(box, /never as a picture of what happened/);
  /* And the engine agrees: every model it hands out declares itself one. */
  const R = loadEngine();
  for (const id of R.experimentIds()) {
    assert.equal(R.backtrackingModel(id).isModel, true);
  }
});

test('the time axis offers a linear and a logarithmic reading', () => {
  for (const scale of ['linear', 'logy', 'loglog']) {
    assert.match(html, new RegExp(`data-scale="${scale}"`), `no ${scale} control`);
  }
  /* Exactly one is pressed at load, or the control has no initial state. */
  assert.equal((html.match(/data-scale="[a-z]+" aria-pressed="true"/g) || []).length, 1);
  /* And the page says how to READ each mode, which is the part that makes the toggle teach
     something rather than merely redraw. */
  assert.match(html, /an\s+exponential series straightens into a line/);
  assert.match(html, /a polynomial series straightens, and its slope is the\s+exponent/);
});

test('the chart distinguishes a terminated trial without relying on colour', () => {
  assert.match(html, /open marker on the deadline line = terminated, no time measured/);
  /* Each series carries a marker glyph and a dash style as well as a hue. */
  const seriesBlock = html.slice(html.indexOf('var SERIES = {'), html.indexOf('var palette = {}'));
  assert.ok(seriesBlock.length > 100, 'the series table could not be located');
  for (const field of ['glyph', 'dash', 'marker', 'css']) {
    assert.ok(seriesBlock.includes(`${field}:`), `the series table has no ${field}`);
  }
  for (const glyph of ['●', '■', '▲', '◆']) {
    assert.ok(seriesBlock.includes(glyph), `series glyph ${glyph} is missing`);
  }
});

test('the file is small enough to hand to a classroom', () => {
  const bytes = Buffer.byteLength(html, 'utf8');
  assert.ok(bytes < 250000, `${DEMO_HTML} is ${bytes} bytes`);
  assert.ok(bytes > 30000, `${DEMO_HTML} is only ${bytes} bytes — did it truncate?`);
});

test('exactly one h1', () => {
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
});
