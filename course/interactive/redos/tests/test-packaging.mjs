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
import { readFileSync as readCoreSource } from 'node:fs';
import { dirname as coreDirname, join as coreJoin } from 'node:path';
import { fileURLToPath as coreFileURL } from 'node:url';

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
  /* Whitespace is normalised first, deliberately. These patterns originally matched literal single
     spaces, which pins the source's LINE WRAPPING as much as its words: moving the two sentences
     into the handout band broke three of the five while every word survived, and a pin that fires
     on a re-wrap reports a typographic change as a dropped commitment. One of the five already
     carried a `\s+` for the same reason; normalising applies that fix to all of them. */
  const body = html.slice(html.indexOf('<body>')).replace(/\s+/g, ' ');
  assert.match(body, /deployed by Cloudflare itself/);
  assert.match(body, /no adversary was involved/);
  assert.match(body, /nevertheless exploitable as a denial-of-service vulnerability/);
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

/* --- the shared core stylesheet ----------------------------------------------------------------
 * The six interactive laboratories share a page frame, and that CSS is held once in
 * course/interactive/_shared/instrument-core.css and inlined into each shipped page by
 * _shared/sync_css.py. Inlined rather than linked because the page must stay ONE file: the
 * assertions above forbid an external stylesheet and an @import, and the Download HTML control
 * hands the reader these same bytes.
 *
 * Nothing in the pipeline re-renders these pages, so the only thing standing between the core and
 * six slowly diverging copies of it is this parity check. It is here rather than in a new test file
 * on purpose: `node --test` SILENTLY IGNORES a path that does not exist and still exits 0, so a new
 * file left untracked would be a check that passes by being absent (measured 261104 in this very
 * directory). An assertion inside a file the runner already names cannot go missing that way.
 */

const CORE_BEGIN = '/* ===== GENERATED from course/interactive/_shared/instrument-core.css by '
  + 'sync_css.py — do not edit\n   here; edit the source and re-run the sync. A parity test in '
  + 'tests/test-packaging.mjs holds\n   this copy byte-equal to the source. ===== */';
const CORE_END = '/* ===== end generated core ===== */';
const CORE_CSS = coreJoin(coreDirname(coreFileURL(import.meta.url)), '..', '..', '_shared',
  'instrument-core.css');

test('the page carries exactly two style elements: the generated core, then its own', () => {
  /* Anchored to a line start: the provenance comment DISCUSSES the element pair in prose, and an
     unanchored count reads that mention as a third element. */
  assert.equal((html.match(/^<style>$/gm) || []).length, 2,
    'there should be one generated core block and one hand-authored block');
  assert.equal((html.match(/^<\/style>$/gm) || []).length, 2);
});

test('the generated core is delimited by exactly one pair of markers', () => {
  assert.equal(html.split(CORE_BEGIN).length - 1, 1, 'the begin marker is missing or duplicated');
  assert.equal(html.split(CORE_END).length - 1, 1, 'the end marker is missing or duplicated');
  assert.ok(html.indexOf(CORE_BEGIN) < html.indexOf(CORE_END), 'the markers are in the wrong order');
  /* The provenance notice must survive every re-sync: it is what tells whoever opens the shipped
     file that an edit made here is about to be overwritten. */
  assert.match(CORE_BEGIN, /do not edit/);
});

test('the inlined core is byte-equal to _shared/instrument-core.css', () => {
  const source = readCoreSource(CORE_CSS, 'utf8');
  const from = html.indexOf(CORE_BEGIN) + CORE_BEGIN.length;
  const to = html.indexOf(CORE_END);
  assert.equal(html.slice(from, to), `\n${source.replace(/\n+$/, '')}\n`,
    'the inlined core has drifted from its source — run '
    + '`python3 course/interactive/_shared/sync_css.py` and commit the result');
});

test('the core block precedes the exercise\u2019s own block, so a local rule wins a tie', () => {
  /* Equal specificity is decided by source order. If the generated core came second it would
     override the exercise's own styling, silently and only for the rules they share. */
  assert.ok(html.indexOf(CORE_BEGIN) < html.lastIndexOf('<style>'),
    'the generated core is not the FIRST style element');
  assert.ok(html.indexOf(CORE_END) < html.lastIndexOf('<style>'),
    'the hand-authored block does not follow the generated core');
});

test('no design token is declared by both the core and this page', () => {
  /* A HALF-override leaks across colour schemes, and silently. The local light :root follows the
     core's dark block in source order, so a token overridden in light but not in dark wins in DARK
     mode too — measured on redos, whose darker --warn (#8a5a00, chosen for contrast as text on
     --warn-fill) would have displaced the core's #d2a24a on a dark page. The rule that removes the
     class rather than the instance: a token that is not identical in all six pages in BOTH schemes
     stays entirely local in both. So the core and a page must never declare the same token. */
  const source = readCoreSource(CORE_CSS, 'utf8');
  const local = html.slice(html.lastIndexOf('<style>') + '<style>'.length,
    html.lastIndexOf('</style>'));
  const tokensIn = (css) => new Set([...css.replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const shared = [...tokensIn(local)].filter((t) => tokensIn(source).has(t)).sort();
  assert.deepEqual(shared, [], 'declared in both the core and this page — move each one wholly '
    + 'into the core, or wholly into this page in BOTH colour schemes');
});
