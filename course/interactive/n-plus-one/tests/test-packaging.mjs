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

const html = readDemoHtml();

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
  assert.equal(canvases.length, 2, `expected 2 canvases, found ${canvases.length}`);
  for (const c of canvases) {
    assert.match(c, /role="img"/, `canvas without role="img": ${c}`);
    assert.match(c, /aria-labelledby="/, `canvas without a description: ${c}`);
  }
  /* Each description target exists and is a live region, so the text updates with the controls. */
  for (const id of ['timeline-alt', 'compare-alt']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-live="polite"`), `${id} is not a live region`);
  }
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
