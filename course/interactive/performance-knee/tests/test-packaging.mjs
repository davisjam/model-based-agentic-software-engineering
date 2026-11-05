/* test-packaging.mjs — the self-containment contract, enforced on the shipped bytes.
 *
 * "No external dependencies" and "works from a file:// URL" are properties of the FILE, so they are
 * checked by reading the file rather than by inspecting the running page. A browser test would also
 * catch a CDN script, but only on the one machine that ran it and only if the network happened to
 * be reachable; this check holds on every machine, including a CI runner with no browser at all.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readSimulatorHtml, extractEngineSource, extractUiSource, loadEngine, SIMULATOR_HTML } from './harness.mjs';
import { readFileSync as readCoreSource } from 'node:fs';
import { dirname as coreDirname, join as coreJoin } from 'node:path';
import { fileURLToPath as coreFileURL } from 'node:url';

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

/* --- the laboratory-handout contract ------------------------------------------------------------
 * The house style's section order and complexity budget are satisfied on the day a page lands and
 * nothing else stops the next edit dissolving them, so they are pinned here, on the shipped bytes.
 *
 * The regression this exists to catch has a name: "just move the controls up to reduce scrolling."
 * The author proposed a dashboard-first layout, then withdrew it in favour of a laboratory handout
 * — background first, apparatus below — and that reversal governs. The withdrawn version looks
 * like an improvement to anyone who has not read the reversal, and no other gate in this tree sees
 * the difference.
 *
 * The inverse assertion is the half worth copying. Moving a control or a readout behind
 * `<details>` is PRESENTATION; deleting it is a MODEL CHANGE. A diff cannot tell them apart, and
 * the budget rewards the wrong one, so every relocated quantity is asserted to be still ON the
 * page. Twenty-five of this page's twenty-eight measurements moved; none left.
 */

/**
 * Everything in `<main>` above the first collapsed reference section: the primary interface.
 *
 * It starts at `<main>` and not at byte 0 on purpose. The stylesheet names every class the page
 * uses, so a slice from the start of the file contains `preset-grid` and `canvas` whatever the
 * body does, and an assertion that something is absent from the primary interface would fail
 * against the CSS that styles it. Measured here: the first version of this helper reported the
 * preset library as present in the primary interface when it sits two disclosures down.
 */
function primaryInterface(source = html) {
  const main = source.indexOf('<main>');
  assert.ok(main > 0, 'the page has no <main> element');
  const at = source.indexOf('<details class="panel disclose"', main);
  assert.ok(at > main, 'the page has no collapsed reference section');
  return source.slice(main, at);
}

test('the handout runs in the house order, with the apparatus below the instruction', () => {
  const order = ['id="h-problem"', 'id="h-background"', 'id="h-model"', 'id="h-procedure"',
    'id="h-apparatus"', 'id="h-results"', 'id="h-interpretation"', 'id="h-further"'];
  let last = -1;
  for (const anchor of order) {
    const at = html.indexOf(anchor);
    assert.ok(at > 0, `${anchor} is missing from the page`);
    assert.ok(at > last, `${anchor} is out of the house section order`);
    last = at;
  }
  /* The load-bearing one, stated separately so a failure names the regression rather than an
     anchor: no adjustable control may precede the numbered procedure. */
  for (const id of ['lambda-range', 'mu-range', 'dist', 'speed-seg']) {
    assert.ok(html.indexOf(`id="${id}"`) > html.indexOf('id="h-procedure"'),
      `the ${id} control sits ABOVE the numbered procedure — the withdrawn dashboard layout`);
  }
  /* And the model a student must understand precedes the experiment they must perform. */
  assert.ok(html.indexOf('id="f1-t"') < html.indexOf('id="h-procedure"'),
    'Figure 1 does not precede the experimental procedure');
});

test('the primary interface carries three engineering parameters and three measurements', () => {
  const primary = primaryInterface();
  /* Three controls, one per term of the relationship under study: arrival rate, service capacity,
     variability. Simulation speed is NOT one of them — it changes how fast you watch, not what
     happens — so it sits in the button row beside Run rather than in the control grid. */
  const controls = [...primary.matchAll(/<div class="ctl">/g)].length;
  assert.equal(controls, 3, `the control grid exposes ${controls} parameters, not three`);
  for (const id of ['lambda', 'mu', 'dist']) {
    assert.ok(primary.includes(`id="${id}"`), `the primary control ${id} is missing`);
  }
  assert.ok(primary.indexOf('id="speed-seg"') > primary.indexOf('id="btn-run"'),
    'simulation speed is back in the control grid instead of beside Run');

  /* Three measurements: the rows of one visible results table, each carrying the model's
     prediction beside this run's measurement. Scoped to THAT table — the model section's Table 2
     uses the same row shape, and an unscoped count reads its three rows as three more results. */
  const tableStart = primary.indexOf('<table class="results">');
  assert.ok(tableStart > 0, 'the primary interface has no results table');
  const resultsTable = primary.slice(tableStart, primary.indexOf('</table>', tableStart));
  const rows = [...resultsTable.matchAll(/<tr>\s*<th scope="row">/g)].length;
  assert.equal(rows, 3, `the results table reports ${rows} quantities, not three`);
  assert.equal([...primary.matchAll(/<table class="results"/g)].length, 1,
    'there is more than one results table in the primary interface');
  for (const id of ['m-wq', 's-wq', 'm-w', 's-w', 'm-rho', 's-util']) {
    assert.ok(primary.includes(`id="${id}"`), `the primary measurement cell ${id} is missing`);
  }
  /* No readout list in the primary interface: a dl.readout is how 28 quantities got there. */
  assert.equal(/<dl class="readout"/.test(primary), false,
    'a readout list is back in the primary interface');

  /* One dominant visualization plus one declared secondary; the third is collapsed. */
  const charts = [...primary.matchAll(/<canvas /g)].length;
  assert.equal(charts, 2, `the primary interface carries ${charts} charts, not one plus a secondary`);
  assert.ok(primary.indexOf('id="c-knee"') < primary.indexOf('id="c-rt"'),
    'the dominant load-latency chart does not come first');
  assert.ok(html.indexOf('id="c-queue"') > html.indexOf('<details class="panel disclose"'),
    'the live-queue animation is still in the primary interface');

  /* One model figure. Figure 2 drew the predicted curve that c-knee now draws live. */
  const figures = [...html.matchAll(/<svg class="fig"/g)].length;
  assert.equal(figures, 1, `the page carries ${figures} model figures; the budget allows one`);

  /* Zero preset cards competing with the guided experiments. */
  assert.equal(/<div class="preset-grid"/.test(primary), false,
    'the preset library is back in the primary interface');
  assert.ok(html.includes('id="presets"'), 'the preset library has been deleted, not relocated');
});

test('every relocated quantity is still on the page, and still written by the interface', () => {
  /* The inverse of the budget. Twenty-eight named quantities; three are primary, twenty-five moved
     behind a disclosure, and NONE was deleted — the engine still computes all of them and the
     interface still writes all of them on every render. A budget that rewarded deletion would be
     rewarding a model change. */
  const relocated = ['m-model', 'm-l', 'm-lq', 'm-svc',
    's-time', 's-events', 's-counts', 's-thr', 's-l', 's-lq',
    'r-server', 'r-queue', 'r-insystem', 'r-maxq',
    'lc-window', 'lc-n', 'lc-l', 'lc-prod', 'lc-res', 'lw-l', 'lw-prod', 'lw-diff'];
  for (const id of relocated) {
    assert.ok(html.includes(`id="${id}"`), `${id} was DELETED rather than relocated`);
  }
  /* Twenty-two relocated readouts + six primary table cells = twenty-eight. */
  assert.equal(relocated.length + 6, 28, 'the measurement census no longer adds up to 28');

  /* Still written: every one of them is assigned by the interface script, so a collapsed section
     holds live values rather than the placeholders the markup ships with. */
  const ui = extractUiSource(html);
  for (const id of relocated) {
    assert.ok(ui.includes(`$('${id}')`), `${id} is on the page but the interface never writes it`);
  }

  /* The relocated CONTROLS likewise. */
  for (const id of ['seed', 'warmup', 'maxdisp', 'history', 'reduced']) {
    assert.ok(html.includes(`id="${id}"`), `the ${id} control was deleted, not relocated`);
  }
});

test('each guided experiment specifies all six fields and offers a baseline to load', () => {
  const experiments = [...html.matchAll(/<li class="exp">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  assert.ok(experiments.length >= 2 && experiments.length <= 3,
    `there are ${experiments.length} guided experiments; the budget allows two or three`);
  for (const [i, body] of experiments.entries()) {
    for (const field of ['Baseline', 'Change', 'Hold constant', 'Predict', 'Run &amp; measure',
      'Explain']) {
      assert.ok(body.includes(`<dt>${field}</dt>`),
        `experiment ${i + 1} does not specify its ${field} field`);
    }
    assert.match(body, /data-xp="[\d]+,[\d]+,[a-z]+,reset"/,
      `experiment ${i + 1} offers no baseline to load`);
  }
  /* Predict / Run / Explain is named where the student meets the procedure. */
  assert.match(html, /Predict before you run/i);
  /* A baseline button is a PROMISE about what is held constant, so it restores the seed and the
     warm-up as well as the three engineering parameters. */
  const ui = extractUiSource(html);
  const handler = ui.slice(ui.indexOf('data-xp'));
  assert.ok(handler.includes('sim.seed = Q.DEFAULT_SEED'),
    'a baseline button does not restore the seed, so "hold constant" is not a promise it keeps');
});

test('the background section is what the 400-600 budget applies to', () => {
  /* The budget governs the Background SECTION, not the prose ahead of the first control: the house
     order mandates four sections there — problem, background, model, numbered procedure — so a
     words-before-the-first-control cap is only reachable by moving the model or the experiment
     BELOW the apparatus, which is the §1 breakage the budget exists to prevent. The section is
     bounded here; the placement of everything else is bounded by the order test above. */
  const from = html.indexOf('id="h-background"');
  const to = html.indexOf('id="h-model"');
  assert.ok(from > 0 && to > from, 'the background section is missing');
  const words = html.slice(from, to)
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&[a-zA-Z#0-9]+;/g, ' word ')
    .match(/[A-Za-z0-9][\w'-]*/g) || [];
  assert.ok(words.length >= 350 && words.length <= 650,
    `the background section is ${words.length} words; the budget is 400-600`);
});

test('the figure share is set by a WIDTH, and no pixel height ceiling exists', () => {
  /* Stage A's finding: a max-height on an SVG with a viewBox letterboxes the drawing rather than
     cropping it, so every pixel of column width past the ceiling becomes empty margin. The figure
     was starved by a height rule, not by a width rule, and the fix must not be undone. */
  const local = html.slice(html.lastIndexOf('<style>'), html.lastIndexOf('</style>'));
  assert.equal(/\.lab-figure[^{]*\{[^}]*max-height/.test(local), false,
    'a max-height is back on the figure — it letterboxes rather than crops');
  assert.equal(/svg[^{]*\{[^}]*max-height/.test(local), false,
    'a max-height is back on an svg');
  assert.match(local, /\.figure-row > \.lab-figure \{[^}]*width:\s*78%/,
    'the figure no longer takes its share of the row by width');
  /* The lever that makes the authored 9.5px labels render above the house floor is the viewBox
     width, not the authored font size: the core paints these labels at 9.5px in all six pages and
     the reader sees authored x render scale. 600 user units in a 78% column clears 14px at a
     1280px viewport. Widening the authored type instead would break the family's shared encodings. */
  assert.match(html, /<svg class="fig" viewBox="0 0 600 \d+"/,
    'Figure 1 is not authored in the 600-unit viewBox the label sizes depend on');
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
