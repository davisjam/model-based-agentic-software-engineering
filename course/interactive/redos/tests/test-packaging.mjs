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
  /* The specification is explicit: no arbitrary user-supplied regex execution. A box that compiles
     whatever a reader types turns a teaching instrument into a way to hang a tab.

     This check used to BAN THE WORD: any element with an id matching /pattern|regex|expression/ was
     a finding. That was a proxy, and the proxy broke as soon as the page gained the pattern chooser
     the author asked for — `id="pattern"` is the correct name for a control that selects among six
     curated patterns, and renaming it to satisfy a grep would have made the page worse and the
     check no stronger. So the check now asserts the PROPERTY instead: every pattern the page can
     compile is one of the engine's own, and no free-text surface exists to supply another. */
  assert.equal(/<textarea/.test(html), false, 'a free-text area is exposed');
  const inputs = [...html.matchAll(/<input[^>]*>/g)].map((m) => m[0]);
  for (const el of inputs) {
    assert.match(el, /type="(range|number|checkbox)"/,
      `an input of a free-text kind is exposed: ${el}`);
  }
  /* The pattern control is a closed chooser over the engine's own ids, and every `<select>` on the
     page is populated from engine data rather than from markup. */
  const R = loadEngine();
  const chooserOptions = [...html.matchAll(/<select[^>]*id="pattern"[^>]*>([\s\S]*?)<\/select>/g)]
    .map((m) => m[1].trim());
  assert.equal(chooserOptions.length, 1, 'there is not exactly one pattern chooser');
  assert.equal(chooserOptions[0], '',
    'the pattern chooser carries hand-written options; it must be filled from the engine');
  /* And the only thing that reaches `new RegExp` is the engine's own `compile`, which refuses any
     id that is not in EXPRESSIONS. */
  const engine = extractEngineSource(html);
  const constructions = (engine.match(/new RegExp\(/g) || []).length;
  assert.equal(constructions, 1, `the engine constructs a RegExp in ${constructions} places`);
  assert.match(engine, /function compile\(expressionId\)[\s\S]{0,200}unknown expression/,
    'compile does not refuse an unknown expression id');
  /* The UI script never compiles anything of its own. */
  const ui = html.slice(html.indexOf('<script id="redos-ui">'));
  assert.equal(/new RegExp\(/.test(ui), false, 'the interface constructs a RegExp of its own');
  assert.ok(R.patternIds().length >= 4, 'the curated set collapsed');
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
  /* Whitespace-normalised first, for the same reason the accuracy-constraint pins are: matching
     literal single spaces pins the source's LINE WRAPPING as much as its words, and the sentences
     moved into the Background section during the house-order rebuild. */
  const prose = html.replace(/\s+/g, ' ');
  assert.match(prose, /an exponential series straightens into a line/);
  assert.match(prose, /a polynomial series straightens, and its slope <em>is<\/em> the exponent/);
});

test('the chart distinguishes a terminated trial without relying on colour', () => {
  assert.match(html, /open marker on the deadline line = terminated, no time measured/);
  /* Each series carries a marker glyph and a dash style as well as a hue. */
  const seriesBlock = html.slice(html.indexOf('var SERIES = {'), html.indexOf('var palette = {}'));
  assert.ok(seriesBlock.length > 100, 'the series table could not be located');
  for (const field of ['glyph', 'dash', 'marker', 'css']) {
    assert.ok(seriesBlock.includes(`${field}:`), `the series table has no ${field}`);
  }
  for (const glyph of ['●', '■', '▲', '◆', '✚', '✱']) {
    assert.ok(seriesBlock.includes(glyph), `series glyph ${glyph} is missing`);
  }
  /* Every baseline has a series, and every series a distinct glyph — otherwise two lines on the
     chart are told apart by hue alone, which is the failure this whole block exists to prevent. */
  const glyphs = [...seriesBlock.matchAll(/glyph: '(.)'/g)].map((m) => m[1]);
  assert.equal(new Set(glyphs).size, glyphs.length, `duplicate series glyph: ${glyphs.join(' ')}`);
  assert.ok(glyphs.length >= loadEngine().BASELINES.length,
    `${loadEngine().BASELINES.length} baselines but only ${glyphs.length} declared series`);
});

test('the file is small enough to hand to a classroom', () => {
  /* The ceiling moved from 250,000 to 290,000 bytes when the laboratory gained its third control.
     Recorded rather than quietly bumped: the pattern chooser ships six expressions spanning five
     complexity classes, two of them the expressions from the Stack Overflow and Cloudflare outages
     with their incident prose; nine named input shapes on the pump model; a measured-degree table;
     a Background section; and three guided experiments carrying six specified fields each. None of
     that is fat, and cutting teaching content to hold a round number would have been the wrong
     trade. What the ceiling is FOR is unchanged — it catches an accidental inlining of something
     that does not belong in a single-file handout — so it is still a ceiling, and still close. */
  const bytes = Buffer.byteLength(html, 'utf8');
  assert.ok(bytes < 290000, `${DEMO_HTML} is ${bytes} bytes`);
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

/* =================================================================================================
   THE HOUSE ORDER AND THE COMPLEXITY BUDGET, pinned on the shipped bytes.

   Added in the 261105 reconstruction, and generalised into the house style so that every laboratory
   carries its own copy rather than one lab holding the control for six. A reconstructed page
   satisfies the section order on the day it lands, and nothing else in the repository would notice
   the edit that dissolves it. That edit has a name — "just move the controls up to reduce
   scrolling" — and it is exactly what the house style records the author WITHDRAWING. It looks like
   an improvement to anyone who has not read the precedence section, and no other gate sees it.
   ================================================================================================= */

/** Every `<details>` block in the body, so "primary" can mean "outside all of them". */
function disclosures() {
  const body = html.slice(html.indexOf('<body>'));
  return [...body.matchAll(/<details[\s\S]*?<\/details>/g)].map((m) => m[0]);
}

function isRelocated(fragment) {
  return disclosures().some((d) => d.includes(fragment));
}

/** The document position of the first primary control — the top of the apparatus. */
function firstControlAt() {
  const body = html.slice(html.indexOf('<body>'));
  const positions = ['id="pattern"', 'id="input-shape-select"', 'id="maxlen-range"']
    .map((f) => body.indexOf(f)).filter((i) => i > 0);
  assert.equal(positions.length, 3, 'the three controls are not all on the page');
  return Math.min(...positions);
}

test('the handout runs in the house section order, with the apparatus below the instruction', () => {
  const order = [
    ['the engineering problem', 'id="h-problem"'],
    ['the background', 'id="h-background"'],
    ['the model', 'id="h-model-sec"'],
    ['the numbered procedure', 'id="h-procedure"'],
    ['the apparatus', 'id="h-controls"'],
    ['the results', 'id="h-results"'],
    ['the interpretation', 'id="h-interpretation"'],
    ['further investigation', 'id="h-further"'],
  ];
  let last = -1;
  let lastName = '(start of document)';
  for (const [name, anchor] of order) {
    const at = html.indexOf(anchor);
    assert.ok(at > 0, `${name} is missing from the page`);
    assert.ok(at > last, `${name} precedes ${lastName}; the house order is broken`);
    last = at;
    lastName = name;
  }
  /* And the controls themselves, not merely their heading, sit below all four instructional
     sections. Asserting the heading alone would pass a page that moved the control panel up and
     left an empty section behind it. */
  const body = html.slice(html.indexOf('<body>'));
  const control = firstControlAt();
  for (const [name, marker] of order.slice(0, 4)) {
    assert.ok(body.indexOf(marker) < control, `${name} sits below the first control`);
  }
});

test('the primary interface stays inside the complexity budget', () => {
  const body = html.slice(html.indexOf('<body>'));
  const ds = disclosures();
  assert.ok(ds.length >= 4, `only ${ds.length} disclosures; the reference material is not collapsed`);

  /* THREE adjustable engineering parameters, which is what the author specified for this
     laboratory: the pattern, the input shape, and the pump count. The budget's default maximum is
     four to five, so three is inside it — and three is the number that makes the principal
     relationship inspectable rather than the number that fills the range. */
  const ctlBlocks = (body.match(/<div class="ctl">/g) || []).length
    - ds.reduce((n, d) => n + (d.match(/<div class="ctl">/g) || []).length, 0);
  assert.equal(ctlBlocks, 3,
    `${ctlBlocks} adjustable parameters in the primary interface; this laboratory exposes three`);

  /* The time axis is a DISPLAY control and sits beside Run, not among the parameters. It is still
     counted by the audit's selector rule — any `.seg` counts — so it is asserted by placement
     instead: inside the button row, outside every `.ctl`. */
  const axisAt = body.indexOf('id="scale-seg"');
  assert.ok(axisAt > 0, 'the time-axis control is missing');
  const buttonRow = body.slice(body.indexOf('<div class="btn-row">'),
    body.indexOf('</div>', body.indexOf('id="btn-download"')));
  assert.ok(buttonRow.includes('id="scale-seg"'),
    'the time axis is not beside Run; a display control is not an engineering parameter');

  /* THREE principal measurements, plus the model's own figure beside them, clearly labelled as a
     different plane. */
  const principal = body.slice(body.indexOf('<div class="principal">'),
    body.indexOf('id="variability"'));
  const measured = (principal.match(/class="pcell measure-plane"/g) || []).length;
  const modelled = (principal.match(/class="pcell model-plane"/g) || []).length;
  assert.equal(measured, 3, `${measured} principal measurements; the budget is 2 to 3`);
  assert.equal(modelled, 1, 'the model-derived figure is missing from the results');
  for (const id of ['id="p-cost"', 'id="p-growth"', 'id="p-stop"', 'id="p-model"']) {
    assert.ok(principal.includes(id), `the results block omits ${id}`);
  }

  /* ONE chart in the primary interface. The modelled-candidate chart is the secondary one and
     belongs behind a disclosure. */
  assert.equal(isRelocated('id="c-growth"'), false, 'the measured chart is collapsed');
  assert.ok(isRelocated('id="c-work"'),
    'the modelled-candidate chart is in the primary interface; it is the secondary visualization');

  /* ONE model figure in the primary interface — the one students manipulate. */
  const figures = [...body.matchAll(/<svg class="fig"[\s\S]*?<\/svg>/g)].map((m) => m[0]);
  assert.equal(figures.length, 2, `${figures.length} figures on the page`);
  const primaryFigures = figures.filter((f) => !ds.some((d) => d.includes(f)));
  assert.equal(primaryFigures.length, 1,
    `${primaryFigures.length} model figures in the primary interface; the budget allows one`);
  assert.ok(primaryFigures[0].includes('id="f1-t"'),
    'the primary figure is not Figure 1; the backtracking model is what students manipulate');

  /* And zero preset cards competing with the guided experiments: a baseline is loaded from inside
     the experiment that specifies it, never from a shelf of entry points. */
  assert.equal(/class="[^"]*\bpreset\b/.test(body), false, 'preset cards are back');
  assert.equal(/class="[^"]*\bxpsel\b/.test(body), false,
    'the experiment-selector card grid is back; the three controls replaced it');
});

test('every relocated control is still ON the page, and still wired to the engine', () => {
  /* The half of the budget check worth copying. Moving a control behind a disclosure is a
     presentation change; DELETING one is a change to the model, and the two are indistinguishable
     in a diff. Without this assertion the budget rewards the wrong one. */
  for (const [what, marker] of [
    ['the modelled-candidate chart', 'id="c-work"'],
    ['the backtracking model body', 'id="model-body"'],
    ['the model caveat', 'id="model-caveat"'],
    ['the budget readouts', 'id="b-budget"'],
    ['the worker counter', 'id="b-workers"'],
    ['the termination counter', 'id="b-terminated"'],
    ['the frame counter', 'id="b-frames"'],
    ['the attack-path figure', 'id="f2-t"'],
    ['the curated-expression table', 'id="expr-table"'],
    ['the measured-degree table', 'id="measured-table"'],
    ['the self-test button', 'id="btn-selftest"'],
  ]) {
    assert.ok(html.includes(marker), `${what} was DELETED, not relocated (${marker})`);
  }
  /* The interface script must still write to each of them, or the disclosure holds a dead panel. */
  const ui = html.slice(html.indexOf('<script id="redos-ui">'));
  for (const id of ['c-work', 'model-body', 'b-budget', 'b-workers', 'b-terminated', 'b-frames',
    'expr-table', 'measured-table', 'selftest-out']) {
    assert.ok(ui.includes(`'${id}'`), `${id} is on the page but nothing writes to it`);
  }
  /* Every disclosure ships CLOSED, so the collapsed material is collapsed on arrival. */
  const opened = [...html.matchAll(/<details[^>]*\bopen\b[^>]*>/g)];
  assert.deepEqual(opened.map((m) => m[0]), [], 'a disclosure ships open');
});

test('there are three guided experiments, each specifying all six fields and a baseline to load', () => {
  const cards = [...html.matchAll(/<article class="xp-card"[\s\S]*?<\/article>/g)].map((m) => m[0]);
  assert.ok(cards.length >= 2 && cards.length <= 3,
    `${cards.length} guided experiments; the budget is 2 to 3`);
  assert.equal(cards.length, 3, 'this laboratory ships three');
  for (const [i, card] of cards.entries()) {
    for (const field of ['Baseline', 'Change', 'Hold constant', 'Predict', 'Measure', 'Explain']) {
      assert.ok(card.includes(`<dt>${field}</dt>`),
        `experiment ${i + 1} does not specify its ${field} field`);
    }
    /* A button that loads the baseline, so a student is not reconstructing it by hand from prose. */
    assert.match(card, /data-baseline="[a-z]+"/,
      `experiment ${i + 1} offers no baseline to load`);
  }
  /* Every baseline a card offers exists in the engine. A card naming a baseline the engine dropped
     would render a button that does nothing. */
  const R = loadEngine();
  const offered = [...html.matchAll(/data-baseline="([a-z]+)"/g)].map((m) => m[1]);
  assert.ok(offered.length >= 3, `only ${offered.length} baseline buttons`);
  for (const id of offered) {
    assert.ok(R.findBaseline(id), `a card offers baseline "${id}", which the engine does not define`);
  }
  /* Predict / Run / Explain is named where the student meets the procedure. */
  assert.match(html, /Method &mdash; predict, run, explain/);
  /* The three experiments between them must change each of the three controls, or a control is
     adjustable and unexercised. */
  assert.ok(cards.some((c) => /<dd>The <strong>input shape<\/strong>/.test(c)),
    'no experiment changes the input shape');
  assert.ok(cards.filter((c) => /<dd>The <strong>pattern<\/strong>/.test(c)).length >= 2,
    'fewer than two experiments change the pattern');
});

test('the Background section teaches the model and stays inside its word budget', () => {
  /* 400-600 words, measured on the BACKGROUND SECTION. The budget audit's own column was defined as
     "prose before the first control" and reported whole-<main> figures instead; the house style was
     corrected twice on 261105 because that proxy cannot be satisfied alongside the mandatory
     section order — four sections precede the apparatus by design, so the prose ahead of the
     controls necessarily includes the model tables and the whole numbered procedure. Nothing caps
     that. This caps the section the number was always attached to. */
  const start = html.indexOf('id="h-background"');
  assert.ok(start > 0, 'there is no Background section');
  const section = html.slice(start, html.indexOf('</section>', start));
  const words = section.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ')
    .split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
  assert.ok(words >= 400 && words <= 600,
    `the Background section is ${words} words; the budget is 400 to 600`);
  /* It teaches the prerequisites for making a PREDICTION, which for this laboratory means the
     search, the ambiguity, the failing match, the pump model, the class, and how to read a slope. */
  for (const phrase of ['backtracking', 'choice point', 'A failing match is the expensive case',
    'prefix', 'pump', 'suffix', 'complexity class', 'ambiguous repetitions',
    'its slope', 'automaton']) {
    assert.ok(section.includes(phrase), `the background never teaches: ${phrase}`);
  }
  /* And it does not spend its budget defending the simulation, which belongs in the reference. */
  for (const defence of ['not calibrated', 'does not establish', 'argue with the model']) {
    assert.equal(section.includes(defence), false,
      `the background defends the instrument instead of teaching the model: ${defence}`);
  }
});

test('the model section holds the figure, Table 1 and Table 2, inputs apart from outputs', () => {
  const section = html.slice(html.indexOf('id="h-model-sec"'), html.indexOf('id="h-procedure"'));
  assert.ok(section.indexOf('id="f1-t"') > 0, 'the model section has no figure');
  assert.match(section, /Table 1 &mdash; Model parameters/);
  assert.match(section, /Table 2 &mdash; Observed quantities/);
  /* Keyed on the heading IDs, not on the strings "Table 1"/"Table 2": the figure's own description
     points the reader at Table 2 for the measured degrees, so a substring search finds "Table 2"
     inside the figure and reports the tables as out of order. */
  assert.ok(section.indexOf('id="h-table1"') < section.indexOf('id="h-table2"'),
    'the tables are out of order');
  /* Table 1 holds ONLY the three parameters a student manipulates — not the simulator's full
     parameter set, which is the encyclopedia the house style sends to the reference. */
  const table1 = section.slice(section.indexOf('aria-labelledby="h-table1"'),
    section.indexOf('id="h-table2"'));
  assert.equal((table1.match(/<th scope="row">/g) || []).length, 3,
    'Table 1 does not hold exactly the three adjustable parameters');
  assert.equal((table1.match(/<th scope="col">/g) || []).length, 4,
    'Table 1 is four columns: parameter, what it is, values, default');
  assert.ok(table1.includes('Pattern') && table1.includes('Input shape')
    && table1.includes('Pumps'), 'Table 1 omits one of the three parameters');
  /* The five-column encyclopedia lives in the reference, and only there. */
  assert.ok(isRelocated('What changing it does'),
    'the full parameter encyclopedia is in the primary interface');
  /* One visible disclaimer, and the assumptions beside the model rather than inside a disclosure. */
  assert.equal((html.match(/class="lab-disclaimer"/g) || []).length, 1,
    'there is more than one visible disclaimer');
  assert.ok(section.includes('class="lab-assumptions"'),
    'the model assumptions are not beside the model');
});

test('the figure takes its share by WIDTH, and no rule puts a height ceiling on it', () => {
  /* Stage A's finding: a `max-height` on an SVG carrying a viewBox letterboxes the drawing instead
     of cropping it, so every pixel of column width past the ceiling becomes empty margin. That was
     this family's width defect. The share is set by `width: 78%` on the figure, and nothing may
     reintroduce a height. */
  const local = html.slice(html.lastIndexOf('<style>'), html.lastIndexOf('</style>'));
  assert.match(local, /\.figure-row > \.lab-figure \{ width: 78%/,
    'the figure does not take 70-80% of the content width');
  const heightRules = [...local.matchAll(/[^{}]*(?:svg|\.lab-figure|\.fig)[^{}]*\{[^}]*\}/g)]
    .map((m) => m[0])
    .filter((rule) => /\b(max-)?height\s*:/.test(rule))
    .filter((rule) => !/height\s*:\s*auto/.test(rule));
  assert.deepEqual(heightRules, [],
    'a height ceiling is back on the figure; set the share with a width');
  /* The figure's description must be substantial enough to stand in for the drawing. */
  const start = html.indexOf('id="f1-d"');
  const description = html.slice(start, html.indexOf('</desc>', start));
  assert.ok(description.length > 600, `f1-d is only ${description.length} characters`);
});

test('the measured complexity classes are rendered from engine data, never hand-typed', () => {
  /* A hand-typed copy of a measured degree in the markup is exactly how a page comes to print a
     complexity class its own instrument refutes — which is the failure this laboratory exists to
     make visible, so it must not commit it. The table ships empty and is filled from
     MEASURED_CLASSES at load. */
  const table = html.slice(html.indexOf('id="measured-table"'),
    html.indexOf('</table>', html.indexOf('id="measured-table"')));
  assert.match(table, /<tbody><\/tbody>/, 'the measured-degree table carries hand-written rows');
  const R = loadEngine();
  assert.equal(R.MEASURED_CLASSES.rows.length, R.patternIds().length,
    'a pattern ships without a measured class');
  /* The page states the engine the figures came from, because the class belongs to the pattern
     TOGETHER WITH the engine and a figure without that qualifier is a false generalisation. */
  assert.match(html, /Measured in V8/);
  assert.match(html, /an automaton-based engine would answer/);
  /* And it reports the label that did not survive the measurement, rather than quietly dropping it. */
  const prose = html.replace(/\s+/g, ' ');
  assert.match(prose, /Neither is quintic/);
  assert.match(prose, /is <strong>cubic<\/strong> \(degree 2\.98\)/);
});

test('the interface distinguishes a single run from an expected result', () => {
  /* The house style asks for this wherever outcomes vary, and here it has teeth: the page times a
     real execution on a shared CPU, so there is no seed to fix and two runs of one configuration
     give two numbers. Three mechanisms, all asserted: every measured cell is labelled as this run,
     a spread across runs is reported once a second run exists, and the model's expectation sits
     beside the measurement on a visibly different plane. */
  const body = html.slice(html.indexOf('<body>'));
  assert.equal((body.match(/Measured &mdash; this run, this machine/g) || []).length, 3,
    'a principal measurement is not labelled as a single run on this machine');
  assert.match(body, /class="plane-kind">Modelled &mdash; derived from the closed form/);
  assert.ok(body.includes('id="variability"'), 'there is no run-to-run spread region');
  const ui = html.slice(html.indexOf('<script id="redos-ui">'));
  assert.match(ui, /function runSpread\(/, 'nothing computes the spread across runs');
  assert.match(ui, /function recordRunHistory\(/, 'nothing records a run history');
  assert.match(ui, /do not read a two-run range as a/,
    'the spread is reported without saying what it is not');
  /* And the reference says plainly that there is no seed, rather than promising reproducibility the
     page cannot deliver. */
  const prose = html.replace(/\s+/g, ' ');
  assert.match(prose, /There is <strong>no seed<\/strong>, because nothing here is random/);
});
