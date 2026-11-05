/* test-packaging.mjs — the self-containment contract, enforced on the shipped bytes.
 *
 * "No external dependencies" and "works from a file:// URL" are properties of the FILE, so they are
 * checked by reading the file rather than by inspecting the running page. The browser tier in
 * test-browser.mjs also catches a loaded resource, but only on a machine that has a browser and
 * only if the network happened to be reachable; these checks hold everywhere, including a CI runner
 * with no browser at all.
 *
 * It also pins the two pedagogical commitments that an ordinary edit would quietly dissolve: the
 * application code is ONE text shared by all three strategies, and the page states the assumptions
 * of its cost model rather than presenting its milliseconds as measurements.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readDemoHtml, extractEngineSource, loadEngine, DEMO_HTML } from './harness.mjs';
import { readFileSync as readCoreSource } from 'node:fs';
import { dirname as coreDirname, join as coreJoin } from 'node:path';
import { fileURLToPath as coreFileURL } from 'node:url';

const html = readDemoHtml();

/** The interface script's source, by id, so a test can assert on what the UI reads. */
function extractUiSource() {
  const open = html.indexOf('<script id="nplus1-ui">');
  assert.ok(open > 0, 'the interface script is missing');
  return html.slice(open, html.indexOf('</script>', open));
}

/* --- self-containment ------------------------------------------------------------------------- */

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
  /* The https references are anchor targets only — the licence link in the footer. */
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

test('the download control hands the reader this same file', () => {
  assert.match(html, /id="btn-download"[^>]*href="index\.html"/);
  assert.match(html, /download="n-plus-one\.html"/);
});

test('the file is small enough to hand to a classroom', () => {
  const bytes = Buffer.byteLength(html, 'utf8');
  assert.ok(bytes < 180000, `${DEMO_HTML} is ${bytes} bytes — this exercise is meant to be compact`);
  assert.ok(bytes > 30000, `${DEMO_HTML} is only ${bytes} bytes — did it truncate?`);
});

/* --- the engine / interface separation -------------------------------------------------------- */

/** Engine source with comments removed — the engine DISCUSSES the surfaces it must not use. */
function engineCode(source = extractEngineSource(html)) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

test('the engine is DOM-free', () => {
  /* Structurally: the executable source must not mention a browser surface. Behaviourally:
     loadEngine evaluates it with no page object in scope, so a reference would throw a
     ReferenceError. Both, because the structural check also catches a reference on a code path the
     tests never take. */
  const code = engineCode();
  for (const api of ['document', 'getElementById', 'addEventListener', 'requestAnimationFrame',
    'localStorage', 'getContext', 'matchMedia', 'performance.now']) {
    assert.equal(code.includes(api), false, `the engine references ${api}`);
  }
  assert.doesNotThrow(() => loadEngine());
});

test('the engine publishes exactly the required namespace', () => {
  const M = loadEngine();
  for (const name of ['normalizeParams', 'queryPlan', 'countQueries', 'computeCost',
    'runSelfTests']) {
    assert.equal(typeof M[name], 'function', `window.NPlusOne.${name} is missing`);
  }
  for (const name of ['COST_MODEL', 'PARAM_SPECS', 'PRESETS', 'STRATEGIES', 'CACHE_STATES']) {
    assert.ok(M[name], `window.NPlusOne.${name} is missing`);
  }
  assert.equal(typeof M.VERSION, 'string');
});

test('the interface script reads the model and never recomputes it', () => {
  /* The interface may format and draw. It must not own a second copy of the cost arithmetic, which
     is the drift that would let a readout and a canvas disagree. */
  const open = html.indexOf('<script id="nplus1-ui">');
  assert.ok(open > 0, 'the interface script is missing');
  const ui = html.slice(open, html.indexOf('</script>', open));
  for (const constant of ['STATEMENT_MS:', 'ROW_MS:', 'JOIN_ROW_FACTOR:', 'QUERY_BYTES:']) {
    assert.equal(ui.includes(constant), false,
      `the interface declares its own ${constant} — the cost model must live in the engine only`);
  }
  assert.ok(ui.includes('M.computeCost('), 'the interface must get its numbers from the model');
});

test('the built-in self-tests all pass', () => {
  const report = loadEngine().runSelfTests();
  const failures = report.results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.detail}`);
  assert.deepEqual(failures, [], `in-page self-tests failed:\n${failures.join('\n')}`);
  assert.ok(report.total >= 12, `only ${report.total} self-tests are declared`);
});

/* --- the pedagogical commitments -------------------------------------------------------------- */

test('there is exactly ONE application-code block, shared by all three strategies', () => {
  /* The specification is emphatic: the source code must not change with the mode. Unchanged source
     producing wildly different database behaviour IS the insight, and a page that showed different
     code per strategy would teach the opposite. So: one <pre class="code">, and no per-strategy
     variant of it anywhere in the file. */
  const blocks = [...html.matchAll(/<pre class="code"[^>]*>([\s\S]*?)<\/pre>/g)];
  assert.equal(blocks.length, 1, `expected 1 application-code block, found ${blocks.length}`);
  const code = blocks[0][1];
  assert.match(code, /reservations = load_reservations\(\)/);
  assert.match(code, /for r in reservations:/);
  assert.match(code, /print\(r\.room\.name\)/);
  assert.equal(code.trim().split('\n').length, 3, 'the loop is three lines');

  /* And the interface never rewrites it: the code element is not a render target. */
  const open = html.indexOf('<script id="nplus1-ui">');
  const ui = html.slice(open, html.indexOf('</script>', open));
  assert.equal(ui.includes("$('app-code')"), false,
    'the interface writes to the code block — the code must be identical across modes');
  assert.equal(/load_reservations/.test(ui), false,
    'the interface contains a copy of the application code');
});

test('the page asks the question the exercise turns on, and reveals the answer on request', () => {
  assert.match(html, /How many database operations does this code perform\?/);
  assert.match(html, /id="btn-reveal"[^>]*aria-pressed="false"/);
  assert.match(html, /id="answer"[^>]*hidden/);
  /* The answer is produced by the model, not written into the markup. */
  assert.match(html, /id="answer-count"/);
});

test('the SQL panel is per-strategy and the code panel is not', () => {
  /* The complement of the test above. What CHANGES with the strategy is the SQL the mapper emits;
     showing that beside unchanged source is the point. */
  const open = html.indexOf('<script id="nplus1-ui">');
  const ui = html.slice(open, html.indexOf('</script>', open));
  assert.ok(ui.includes("$('emitted-sql')"), 'the emitted SQL must be rendered per strategy');
  const M = loadEngine();
  assert.match(M.SQL.reservations, /FROM reservations/);
  assert.match(M.SQL.room, /WHERE id = \?/);
  assert.match(M.SQL.roomsIn, /WHERE id IN/);
  assert.match(M.SQL.join, /JOIN rooms/);
});

test('the page states that it is a cost model and not a database', () => {
  /* The specification asks for a deterministic cost model "rather than pretending to execute a real
     database", with the assumptions visible. These sentences are the honesty of the instrument and
     the easiest thing for a later edit to smooth away, so they are pinned. */
  assert.match(html, /Nothing on this page executes SQL/i);
  assert.match(html, /no database, no connection, no engine, and no\s+measurement/i);
  assert.match(html, /query counts are <strong>exact arithmetic<\/strong>/i);
  assert.match(html, /What the model leaves out/i);
  /* The exclusions, named individually rather than hand-waved. */
  for (const omission of ['connection-pool waiting', 'lock contention', 'index choice',
    'concurrency', 'application CPU']) {
    assert.ok(html.includes(omission), `the model's exclusions do not mention ${omission}`);
  }
});

test('the modelling point about distinct rooms survives into the page copy', () => {
  /* "The simulator should not assume that every lazy-loading configuration necessarily executes N
     additional queries." This is the sentence the exercise exists to make true. */
  assert.match(html, /N\+1 is a consequence of a configuration, not a property of lazy loading/i);
  assert.match(html, /executes N additional queries only when every room access misses/i);
  assert.match(html, /identity map/i);
  /* The clamp rule is STATED, not merely implemented. */
  assert.match(html, /D<sub>eff<\/sub> = min\(D, N\)/);
  assert.match(html, /N reservations can reference at most N distinct\s+rooms/i);
  /* The round-robin assignment is disclosed, including what it does and does not change. */
  assert.match(html, /round-robin/i);
  assert.match(html, /i mod D<sub>eff<\/sub>/);
});

test('the page states that lazy loads are sequential, which is what makes them expensive', () => {
  assert.match(html, /the lazy loads run one after another/i);
  assert.match(html, /cannot ask for a room it has not reached yet/i);
});

test('every cost-model constant printed on the page matches the engine', () => {
  const M = loadEngine();
  const rows = [
    [M.COST_MODEL.STATEMENT_MS, 'ms'],
    [M.COST_MODEL.ROW_MS, 'ms'],
    [M.COST_MODEL.QUERY_BYTES, 'B'],
    [M.COST_MODEL.RESERVATION_ROW_BYTES, 'B'],
    [M.COST_MODEL.ROOM_ROW_BYTES, 'B'],
  ];
  for (const [value, unit] of rows) {
    assert.ok(html.includes(`${value} ${unit}`),
      `the constants table does not print "${value} ${unit}"`);
  }
  assert.ok(html.includes(`&times; ${M.COST_MODEL.JOIN_ROW_FACTOR}`),
    'the constants table does not print the join row factor');
});

/* --- accessibility and presentation ----------------------------------------------------------- */

test('exactly one h1, and every canvas is described for assistive technology', () => {
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  const canvases = [...html.matchAll(/<canvas[^>]*>/g)].map((m) => m[0]);
  /* ONE canvas. The strategy comparison was a second one and is now a table: the quantity this
     laboratory teaches is the query count, and a count of 1 against a count of 201 is a column of
     figures rather than a bar chart whose axis is time. See the comparison-table test below. */
  assert.equal(canvases.length, 1, `expected 1 canvas, found ${canvases.length}`);
  for (const c of canvases) {
    assert.match(c, /role="img"/, `canvas without role="img": ${c}`);
    assert.match(c, /aria-labelledby="/, `canvas without a description: ${c}`);
  }
  /* The description target exists and is a live region, so the text updates with the controls. */
  assert.match(html, /id="timeline-alt"[^>]*aria-live="polite"/, 'timeline-alt is not a live region');
});

test('the strategy comparison is a table, built from the engine', () => {
  /* A table is natively navigable, so it needs no parallel text alternative: the row header names
     the configuration and the two cells name the quantities. The current row is marked three ways —
     a tint, a bold row, and a glyph whose meaning is also spoken, since the glyph itself is
     aria-hidden. Nothing here may be hand-written: the rows come from `compareStrategies`. */
  assert.match(html, /<table class="compare">/);
  assert.match(html, /<tbody id="compare-rows"><\/tbody>/,
    'the comparison rows are hand-written rather than rendered from the model');
  const ui = extractUiSource();
  assert.ok(ui.includes('M.compareStrategies(state)'),
    'the comparison table does not read the engine');
  assert.ok(ui.includes("said.className = 'vh'"),
    'the current-row glyph has no spoken equivalent');
  assert.equal(/id="c-compare"/.test(html), false, 'the comparison canvas is back');
});

test('meaning never depends on colour alone', () => {
  /* Every cost band carries a word and a glyph beside its colour; the chart legend names each
     colour in text; and the current row of the comparison is marked with a glyph and a border as
     well as a colour. */
  const M = loadEngine();
  for (const band of M.COST_BANDS) {
    assert.ok(band.word && band.glyph, `band ${band.id} has no word or glyph`);
  }
  assert.match(html, /id="cost-band-text"/);
  assert.match(html, /<span class="glyph" aria-hidden="true">/);
  assert.match(html, /class="legend"/);
  for (const label of ['Reservations query', 'Room query', 'Batched rooms query', 'Join']) {
    assert.ok(html.includes(label), `the legend does not name "${label}" in text`);
  }
});

test('every control has a label or an accessible name', () => {
  /* Each slider carries an aria-label (its visible label is bound to the paired number field), and
     each segmented group is labelled by its heading. */
  for (const id of ['reservations-range', 'latency-range', 'rooms-range']) {
    const m = html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`));
    assert.ok(m && /aria-label="/.test(m[0]), `${id} has no accessible name`);
  }
  for (const [seg, label] of [['strategy-seg', 'strategy-label'], ['cache-seg', 'cache-label']]) {
    assert.match(html, new RegExp(`aria-labelledby="${label}"[^>]*id="${seg}"`));
    assert.match(html, new RegExp(`id="${label}"`));
  }
  for (const id of ['reservations', 'latency', 'rooms']) {
    assert.match(html, new RegExp(`<label for="${id}"`), `no <label for="${id}">`);
  }
});

test('the dark scheme and a reduced-motion rule are both declared', () => {
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
  /* And the page says what reduced motion does here, rather than implying an animation exists. */
  assert.match(html, /no decorative animation and no\s+simulation loop/i);
});

test('the clamp notice is a status region so a screen reader hears it appear', () => {
  assert.match(html, /id="clamp-notice"[^>]*role="status"/);
});

test('the page declares its language and viewport', () => {
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(html, /<title>The N\+1 Trap — Teach with MAGE<\/title>/);
});

test('no control is exposed for a mechanism the model does not implement', () => {
  /* A knob that does nothing is worse than a missing knob. The exercise is deliberately narrow:
     five controls, and no index, pool, concurrency or prefetch dial that the cost model would
     ignore. */
  const forbidden = /id="(index[-\w]*|pool[-\w]*|concurrency|prefetch[-\w]*|replica[-\w]*|shard[-\w]*)"/i;
  assert.equal(forbidden.test(html), false, 'a control is exposed for an unmodelled mechanism');
  const inputs = [...html.matchAll(/<input[^>]*id="([^"]+)"[^>]*>/g)].map((m) => m[1])
    .filter((id) => !id.endsWith('-range'));
  assert.deepEqual(inputs.sort(), ['latency', 'reservations', 'rooms'],
    'the numeric controls are exactly the three the specification names');
});

/* --- the house style, held on the shipped bytes ------------------------------------------------
 * course/interactive/_shared/HOUSE-STYLE.md governs all six laboratories, and §12 requires each one
 * to pin its own compliance: a reconstructed page satisfies the section order on the day it lands
 * and nothing else stops the next edit dissolving it. The regression these exist to catch has a
 * name — "just move the controls up to reduce scrolling" — and it is exactly the first-screen
 * layout the author withdrew. It looks like an improvement to anyone who has not read §0, and no
 * other gate in this repository sees it.
 */

test('the handout runs in the house order, with the apparatus below the instruction', () => {
  /* Document order on the shipped bytes: engineering problem, background, model, numbered
     procedure, apparatus, results, interpretation, collapsed reference. */
  const order = ['id="h-problem"', 'id="h-background"', 'id="h-model"', 'id="h-procedure"',
    'id="h-apparatus"', 'id="h-results"', 'id="h-interpretation"', 'id="h-further"'];
  let last = -1;
  for (const anchor of order) {
    const at = html.indexOf(anchor);
    assert.ok(at > last, `${anchor} is out of the house section order`);
    last = at;
  }
  /* And the controls themselves, not merely the heading, sit after the procedure. */
  for (const id of ['strategy-seg', 'cache-seg', 'reservations-range']) {
    assert.ok(html.indexOf(`id="${id}"`) > html.indexOf('id="h-procedure"'),
      `the ${id} control precedes the numbered procedure`);
  }
  /* The model figure and the whole background arrive before the first control. */
  assert.ok(html.indexOf('id="f1-t"') < html.indexOf('id="h-apparatus"'),
    'the model figure is below the apparatus');
});

test('the primary interface carries five parameters, three measurements and one chart', () => {
  /* The complexity budget. Everything the engine computes beyond this is still computed and still
     reachable — it is below the first `<details class="disclose">`. The split is a PRESENTATION
     decision: PARAM_SPECS is untouched and the engine's whole surface is still exposed. */
  const firstDetails = html.indexOf('<details class="disclose">');
  assert.ok(firstDetails > 0, 'the page has no collapsed reference section');
  const primary = html.slice(0, firstDetails);

  const controls = [...primary.matchAll(/<div class="ctl">/g)].length;
  assert.equal(controls, 5, `the primary interface exposes ${controls} controls, not five`);
  for (const id of ['reservations', 'rooms', 'strategy-seg', 'cache-seg', 'latency']) {
    assert.ok(primary.includes(`id="${id}"`), `the primary control ${id} is missing`);
  }
  /* Five is the budget's maximum and every one of the five serves the principal relationship —
     loading strategy against query count. Four set the count; round-trip latency is the one that
     provably cannot, which is what Experiment 3 measures. A sixth would need an argument. */
  for (const id of ['r-queries', 'r-total', 'r-hits']) {
    assert.ok(primary.includes(`id="${id}"`), `the primary measurement ${id} is missing`);
  }
  assert.equal([...primary.matchAll(/<canvas /g)].length, 1,
    'the primary interface carries more than one chart');

  /* THE INVERSE, and the half worth copying: every control and every quantity the interface used to
     show is still ON the page. Moving one behind a disclosure is presentation; deleting one is a
     model change, and a diff cannot tell the two apart without this assertion. */
  for (const id of ['r-rtt', 'r-db', 'r-bytes', 'r-accesses', 'r-roomq', 'r-deff']) {
    assert.ok(html.includes(`id="${id}"`), `the ${id} measurement was deleted, not relocated`);
  }
  assert.ok(html.indexOf('id="presets"') > firstDetails,
    'the preset library is back in the primary interface');
  assert.ok(html.indexOf('id="r-bytes"') > firstDetails,
    'the secondary quantities are back in the primary interface');
  /* Every preset the engine declares still has a button rendered for it. */
  assert.ok(extractUiSource().includes('M.PRESETS.forEach'),
    'the preset library is no longer built from the engine');
});

test('each guided experiment specifies all six fields, and there are two or three of them', () => {
  const experiments = [...html.matchAll(/<li class="exp">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  assert.ok(experiments.length >= 2 && experiments.length <= 3,
    `there are ${experiments.length} guided experiments; the budget allows two or three`);
  for (const [i, body] of experiments.entries()) {
    for (const field of ['Baseline', 'Change', 'Hold constant', 'Predict', 'Run &amp; measure',
      'Explain']) {
      assert.ok(body.includes(`<dt>${field}</dt>`),
        `experiment ${i + 1} does not specify its ${field} field`);
    }
    /* Each one offers its baseline, and the baseline is an ENGINE preset rather than a second copy
       of the same numbers in the markup. */
    const m = body.match(/data-preset="([a-z-]+)"/);
    assert.ok(m, `experiment ${i + 1} offers no baseline to load`);
    assert.ok(loadEngine().findPreset(m[1]), `experiment ${i + 1} loads an unknown preset ${m[1]}`);
  }
  assert.match(html, /Predict before you run/i);
});

test('the figure takes its share of the row by WIDTH, with no height ceiling', () => {
  /* Stage A's finding: `max-height` on an SVG carrying a viewBox letterboxes the drawing rather
     than cropping it, so every pixel of column past the ceiling becomes empty margin — which was
     the width defect, not a height economy. Bound the figure by its column. */
  assert.match(html, /\.figure-row > \.lab-figure \{ width: 78%/,
    'the opening figure no longer takes 70-80% of the content width');
  const own = html.slice(html.lastIndexOf('<style>'));
  assert.equal(/max-height/.test(own), false, 'a height ceiling has been reintroduced');
});

test('one model figure in the opening, the second beside the reference it explains', () => {
  /* The budget allows one model figure. Figure 1 draws the relationship — what the loop becomes
     under each configuration — and the access-path diagram, which is the cost model's premise
     rather than its relationship, moved into the model reference beside the constants it prices. */
  const firstDetails = html.indexOf('<details class="disclose">');
  assert.ok(html.indexOf('id="f1-t"') < firstDetails, 'Figure 1 is not in the opening');
  assert.ok(html.indexOf('id="f2-t"') > firstDetails,
    'a second model figure is still competing in the opening');
  assert.equal([...html.matchAll(/<svg class="fig"/g)].length, 2,
    'the page carries a number of model figures it does not account for');
  /* Figure 1 names the model's quantities, and carries no explanatory paragraph inside the drawing
     — §4 forbids that, and the two sentences that used to sit inside a figure are now taught in the
     background where a student needs them to predict. */
  assert.match(html, /1 \+ N queries/);
  assert.match(html, /1 \+ D queries/);
});

test('the background is a section of its own, inside the 400-600 word budget', () => {
  /* The author's budget attaches to the Background SECTION, not to "words before the first
     control" — §1 mandates four sections ahead of the apparatus, so the proxy counts the model
     tables and the whole procedure and can only reach 600 if both are wordless. Measured here on
     the section, with the markup stripped. */
  const open = html.indexOf('<h2 id="h-background">');
  assert.ok(open > 0, 'there is no Background section');
  const close = html.indexOf('</section>', open);
  const words = html.slice(open, close)
    .replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ')
    .trim().split(/\s+/).filter(Boolean).length;
  assert.ok(words >= 300 && words <= 650,
    `the Background section is ${words} words; the budget is 400-600`);
});

test('the disclaimer is one visible block, and the model says it has no seed to fix', () => {
  /* §5 asks for one visible honesty statement and no more; §7 asks a stochastic model to separate
     a single run from an expected result. This model is deterministic, so that criterion has no
     referent here and the reference says so rather than inventing a seed control. */
  assert.equal([...html.matchAll(/class="lab-disclaimer"/g)].length, 1,
    'there is more than one visible disclaimer');
  assert.match(html, /Illustrative model; not calibrated to any database engine/);
  assert.match(html, /no seed to fix and no sampling variability/i);
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
