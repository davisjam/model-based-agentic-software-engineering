/* test-packaging.mjs — the self-containment contract, enforced on the shipped bytes.
 *
 * "No external dependencies" and "works from a file:// URL" are properties of the FILE, so they are
 * checked by reading the file rather than by inspecting the running page. The browser tier in
 * test-browser.mjs also catches a loaded resource, but only on a machine that has a browser and
 * only if the network happened to be reachable; these checks hold everywhere, including a CI runner
 * with no browser at all.
 *
 * It also pins the honesty commitments an ordinary edit would quietly dissolve: logical and
 * physical storage stay separate, the physical figure stays labelled an estimate and stays behind
 * an opt-in control, no named product gets a storage figure, and the formula the page prints is
 * the formula the page computes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readDemoHtml, extractEngineSource, extractUiSource, loadEngine, DEMO_HTML, M,
} from './harness.mjs';
import { readFileSync as readCoreSource } from 'node:fs';
import { dirname as coreDirname, join as coreJoin } from 'node:path';
import { fileURLToPath as coreFileURL } from 'node:url';

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
  assert.match(html, /download="storage-cost\.html"/);
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

test('the engine touches no browser surface', () => {
  /* Structurally: the executable source must not mention a browser API. Behaviourally: loadEngine
     evaluates it with no page object in scope, so a reference would throw a ReferenceError. Both,
     because the structural check also catches a reference on a code path the tests never take.
     `document` cannot be banned as a bare word here — it is one of the three representation ids —
     so the API forms are listed instead. */
  const code = engineCode();
  for (const api of ['document.', 'window.document', 'getElementById', 'querySelector',
    'addEventListener', 'createElement', 'getContext', 'requestAnimationFrame',
    'localStorage', 'sessionStorage', 'matchMedia', 'getComputedStyle', 'performance.now']) {
    assert.equal(code.includes(api), false, `the engine references ${api}`);
  }
  /* The one permitted contact with the outside world is the namespace it publishes. */
  const windowUses = code.match(/\bwindow\b[^\n]*/g) || [];
  assert.equal(windowUses.length, 1, `the engine touches window ${windowUses.length} times`);
  assert.match(windowUses[0], /window\.StorageCost = \{/);
  assert.doesNotThrow(() => loadEngine());
});

test('the engine publishes exactly the namespace the page and the tests consume', () => {
  const engine = loadEngine();
  for (const name of ['normalizeParams', 'recordLayouts', 'logicalStorage', 'computeStorage',
    'renameImpact', 'renameImpactAll', 'compareRepresentations', 'sweepPerRoom', 'indexEntries',
    'runSelfTests', 'formatBytes', 'formatCount', 'formatMultiple', 'formatPercent',
    'roomName', 'renamedRoomName', 'explain', 'findPreset', 'bandFor', 'representationById',
    'totalReservations']) {
    assert.equal(typeof engine[name], 'function', `window.StorageCost.${name} is missing`);
  }
  for (const name of ['PHYSICAL_MODEL', 'PARAM_SPECS', 'PRESETS', 'REPRESENTATIONS',
    'REPRESENTATION_IDS', 'DUP_BANDS', 'DEFAULTS', 'BUILDINGS']) {
    assert.ok(engine[name], `window.StorageCost.${name} is missing`);
  }
  assert.equal(typeof engine.VERSION, 'string');
});

test('the interface reads the model and never recomputes it', () => {
  /* The interface may format and draw. It must not own a second copy of the storage arithmetic,
     which is the drift that would let a readout and a chart disagree. */
  const ui = extractUiSource(html);
  for (const constant of ['RECORD_HEADER_BYTES:', 'FIELD_NAME_BYTES:', 'indexEntryBytes:']) {
    assert.equal(ui.includes(constant), false,
      `the interface declares its own ${constant} — the storage model must live in the engine only`);
  }
  assert.ok(ui.includes('M.computeStorage('), 'the interface must get its numbers from the model');
  assert.ok(ui.includes('M.renameImpactAll('), 'the rename counts must come from the model');
  assert.ok(ui.includes('M.compareRepresentations('), 'the comparison must come from the model');
  assert.ok(ui.includes('M.sweepPerRoom('), 'the sweep must come from the model');
  /* And it must not re-derive the record layouts it draws. */
  assert.equal(/room_metadata['"]?\s*:/.test(ui), false,
    'the interface declares a record field — the layouts live in the engine');
});

test('the built-in self-tests all pass, and there are enough of them to mean something', () => {
  const report = loadEngine().runSelfTests();
  const failures = report.results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.detail}`);
  assert.deepEqual(failures, [], `in-page self-tests failed:\n${failures.join('\n')}`);
  assert.ok(report.total >= 15, `only ${report.total} self-tests are declared`);
  assert.equal(report.passed, report.total);
  assert.equal(report.failed, 0);
  assert.equal(new Set(report.results.map((r) => r.name)).size, report.total,
    'two self-tests share a name');
});

/* --- the honesty commitments ------------------------------------------------------------------ */

test('the page claims no storage figure for any named database product', () => {
  /* The author is explicit: "We should not pretend that PostgreSQL and MongoDB have particular
     storage efficiencies without actually running those systems." The products may be NAMED, but
     only in the sentence that refuses to quote a number for them. */
  for (const product of ['Postgres', 'MongoDB', 'MySQL', 'SQLite', 'Oracle', 'DynamoDB',
    'Cassandra', 'Couch', 'InnoDB', 'WiredTiger', 'BSON']) {
    const hits = [...html.matchAll(new RegExp(product, 'gi'))];
    for (const hit of hits) {
      const sentence = html.slice(Math.max(0, hit.index - 260), hit.index + 260);
      assert.match(sentence, /claims no storage figure|nothing here was run|does not claim/i,
        `${product} is mentioned outside the sentence that disclaims it: …${sentence}…`);
    }
  }
  /* Both named products appear exactly once, in the disclaimer. */
  assert.equal((html.match(/PostgreSQL/g) || []).length, 1);
  assert.equal((html.match(/MongoDB/g) || []).length, 1);
  assert.match(html, /claims no storage figure for PostgreSQL, MongoDB, or\s+any other product/i);
});

test('the page separates logical from physical storage and prints both formulas', () => {
  assert.match(html, /S_logical = S_unique \+ S_duplicated \+ S_references/);
  assert.match(html,
    /S_physical = S_logical \+ S_record_overhead \+ S_field_name_overhead \+ S_index_overhead/);
  assert.match(html, /follows directly from the chosen representation/i);
  assert.match(html, /requires assumptions about a storage engine/i);
  assert.match(html, /labelled an\s+<em>estimate<\/em>/i);
});

test('the physical estimate is an opt-in control that starts off', () => {
  /* "I would default to showing logical storage and place physical-overhead assumptions behind an
     optional control." Both halves: the control exists, and its OFF button is the pressed one in
     the shipped markup. */
  assert.match(html, /id="physical-seg"/);
  assert.match(html, /data-physical="off" aria-pressed="true"/);
  assert.match(html, /data-physical="on" aria-pressed="false"/);
  assert.equal(M.DEFAULTS.physicalEstimate, false);
  assert.match(html, /Why physical storage is off by default/i);
});

test('every physical-model constant printed on the page matches the engine', () => {
  /* A page that printed 24 B while the engine charged 32 would be publishing a formula it does not
     compute, which is the specific dishonesty this exercise cannot afford. The values are rendered
     into the table at runtime from the engine, so what is asserted here is that the ENGINE's
     values are the ones the prose and the table describe. */
  assert.equal(M.PHYSICAL_MODEL.RECORD_HEADER_BYTES, 24);
  assert.equal(M.PHYSICAL_MODEL.FIELD_NAME_BYTES, 32);
  assert.equal(M.PHYSICAL_MODEL.INDEX_ENTRY_FORMULA, '2I + 12');
  assert.match(html, /<code>2I \+ 12<\/code>/);
  /* The table cells are filled from the engine, not hand-written. */
  for (const id of ['k-record', 'k-keys', 'k-index']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*>&mdash;<`),
      `the ${id} cell holds a hand-written value instead of a placeholder`);
  }
  assert.ok(extractUiSource(html).includes('M.PHYSICAL_MODEL.RECORD_HEADER_BYTES'),
    'the interface does not read the record-header constant from the model');
});

test('the page states what the physical estimate leaves out, item by item', () => {
  assert.match(html, /What the estimate leaves out/i);
  for (const omission of ['internal fragmentation', 'compression', 'write-ahead log',
    'free-space map', 'replication factor']) {
    assert.ok(html.includes(omission), `the estimate's exclusions do not mention ${omission}`);
  }
});

test('the page states the three modelling decisions a reader might argue with', () => {
  /* Each one changes a number, and each one is a judgement rather than a fact, so each is stated
     where the number is. */
  assert.match(html, /the duplicated column is the <em>excess<\/em>/i);
  assert.match(html, /no <code>ROOMS<\/code> table\s+at all/i);
  assert.match(html, /a room with no\s+reservations has nowhere to live/i);
  assert.match(html, /containment <em>is<\/em> the\s+reference/i);
  /* And the uniform reservations-per-room assumption, with what it does and does not change. */
  assert.match(html, /Every room holds exactly <code>V<\/code> reservations/i);
  assert.match(html, /changes the <em>totals<\/em>; it does not change which facts a representation\s+duplicates/i);
});

test('the page makes the document-is-not-denormalized point in its own words', () => {
  /* The reason the third representation is there at all. A page that dropped this sentence would
     still compute the same bytes and would stop teaching the thing it exists to teach. */
  assert.match(html, /The document representation is not the denormalized one/i);
  assert.match(html, /Database category and normalization are\s+different dimensions/i);
  assert.match(html, /stores the room's facts once, exactly as the normalized\s+tables do/i);
});

test('the page presents the rename as the lesson and the byte counts as the setup', () => {
  assert.match(html, /This is the part that matters more than the byte totals/i);
  assert.match(html, /obligation of keeping the data consistent/i);
  assert.match(html, /id="btn-rename"[^>]*aria-pressed="false"/);
  /* The 1 / V / 1 table, with the document qualification stated rather than estimated away. */
  assert.match(html, /<td class="n">1 record<\/td>/);
  assert.match(html, /<td class="n">V records<\/td>/);
  assert.match(html, /<td class="n">1 document<\/td>/);
  assert.match(html, /Its physical rewrite cost depends on the database engine/i);
  assert.match(html, /a write that stops halfway leaves the database holding two different names/i);
});

test('key-value storage is absent, as the specification decided', () => {
  /* "I would not add it to the initial version. Three representations are sufficient." Its
     pedagogical point — that normalization and database category are different dimensions — is
     carried by the document case, which the test above pins. */
  assert.equal(M.REPRESENTATION_IDS.length, 3);
  assert.deepEqual(M.REPRESENTATION_IDS, ['normalized', 'denormalized', 'document']);
  assert.equal(/key-value/i.test(html), false, 'a fourth representation has appeared');
});

test('the page models no latency, no throughput, and no infrastructure cost', () => {
  /* This exercise replaced a time-oriented design on purpose: query performance belongs to the
     sibling N+1 instrument and capacity to the performance-knee one. A reading of this page in
     milliseconds or dollars would be a reading of the wrong exercise. */
  for (const term of ['latency', 'throughput', 'milliseconds', ' ms ', 'requests per second',
    'queries per second', 'infrastructure cost', 'dollars', 'per month']) {
    assert.equal(html.includes(term), false, `the page mentions ${term}`);
  }
  /* No money figure anywhere. A bare `$` cannot be banned — it is the interface's element-lookup
     helper — so the check is for a currency amount rather than for the character. */
  assert.equal(/[$£€]\s?[\d,]/.test(html), false, 'the page quotes a price');
  /* And no control is a time or money dial. Stated as an ALLOWLIST rather than as a list of
     forbidden substrings: a substring ban is the wrong shape here, since `rooms` ends in "ms" and
     a case-insensitive "ms" check condemns it. Every control is a count or a size, named so. */
  assert.deepEqual(Object.keys(M.PARAM_SPECS).sort(),
    ['identifierBytes', 'metadataBytes', 'reservationBytes', 'reservationsPerRoom', 'rooms']);
  for (const key of Object.keys(M.PARAM_SPECS)) {
    assert.match(key, /Bytes$|^rooms$|^reservationsPerRoom$/,
      `unexpected control ${key} — every control is a count or a size`);
  }
});

test('the page states that it is arithmetic and not a benchmark', () => {
  assert.match(html, /Nothing on this page runs a database/i);
  assert.match(html, /no engine, no file, no page cache, and no\s+measurement/i);
  assert.match(html, /Anyone who\s+needs a number for a real system has to measure that system/i);
});

/* --- accessibility properties visible in the markup ------------------------------------------- */

test('every chart has a text description and a legend that names each series', () => {
  for (const id of ['c-bars', 'c-sweep']) {
    assert.match(html, new RegExp(`<canvas id="${id}"[^>]*role="img"[^>]*aria-labelledby="`),
      `canvas ${id} has no accessible name`);
  }
  for (const id of ['bars-alt', 'sweep-alt', 'rename-alt']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-live="polite"`),
      `${id} is not announced when it changes`);
  }
  /* The estimated-overhead segment is hatched as well as coloured, so the one series whose meaning
     differs in kind does not rely on telling amber from red. */
  assert.match(html, /<i class="hatch"><\/i>Estimated storage overhead \(hatched\)/);
  assert.ok(extractUiSource(html).includes('hatchPattern('),
    'the estimated segment is drawn without its hatch');
});

test('every panel is named by its own heading and there is exactly one h1', () => {
  const panels = [...html.matchAll(/<section class="panel" aria-labelledby="([^"]+)"/g)];
  assert.ok(panels.length >= 6, `only ${panels.length} labelled panels`);
  for (const [, id] of panels) {
    assert.ok(html.includes(`id="${id}"`), `panel label ${id} points at nothing`);
  }
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  /* Every section element on the page is one of those labelled panels. */
  assert.equal((html.match(/<section/g) || []).length, panels.length);
});

test('the reduced-motion preference is honoured', () => {
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
});

test('the page declares its colour-never-alone commitment and keeps it in the markup', () => {
  assert.match(html, /Colour never carries meaning alone/i);
  /* Each duplication band carries a glyph element the interface fills, not a bare colour swap. */
  assert.match(html, /id="dup-band"[^>]*>\s*<span class="glyph"/);
  /* And the marked rename rows carry a word in a marker column. */
  assert.ok(extractUiSource(html).includes("'holds the name'"),
    'the rename rows are marked by colour alone');
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
