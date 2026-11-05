/* test-packaging.mjs — the artifact itself.
 *
 * The page has to work from a `file://` URL on a lecturer's laptop with no network, and the
 * Download HTML control has to hand over the same bytes the site serves. Those are properties of
 * the FILE, and a single stray `<link href="https://…">` would break them silently — the page would
 * still render on a developer's machine, where the font is cached and the network is up.
 *
 * So this file reads index.html as text and asserts the packaging rules directly. The browser tier
 * checks the consequence (zero network requests); this tier checks the cause, and it costs
 * milliseconds.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSimulatorHtml, extractEngineSource, SIMULATOR_HTML } from './harness.mjs';
import { readFileSync as readCoreSource } from 'node:fs';
import { dirname as coreDirname, join as coreJoin } from 'node:path';
import { fileURLToPath as coreFileURL } from 'node:url';

const html = readSimulatorHtml();
const HERE = dirname(fileURLToPath(import.meta.url));

test('the exercise is one file plus its tests', () => {
  const dir = dirname(SIMULATOR_HTML);
  const entries = readdirSync(dir).filter((name) => !name.startsWith('.'));
  assert.deepEqual(entries.sort(), ['index.html', 'tests']);
  assert.ok(statSync(join(dir, 'index.html')).isFile());
  assert.ok(statSync(HERE).isDirectory());
});

test('nothing is loaded from the network', () => {
  /* Any attribute that could fetch. The favicon is deliberately a data: URI so the page issues
     zero requests of any kind, which the browser tier asserts by counting them. */
  const urlAttributes = /(?:src|href|action|poster|data|srcset)\s*=\s*["']([^"']*)["']/gi;
  const offenders = [];
  let m = urlAttributes.exec(html);
  while (m !== null) {
    const value = m[1].trim();
    const external = /^(?:https?:)?\/\//i.test(value) || /^(?:ftp|ws|wss):/i.test(value);
    /* The licence link and the course links are anchors a reader may click; they are not loaded.
       Distinguish by the tag: a src/href on a <link>, <script>, <img> or <iframe> is a fetch. */
    const context = html.slice(Math.max(0, m.index - 220), m.index);
    const tag = /<\s*([a-zA-Z]+)[^<>]*$/.exec(context);
    const fetches = tag !== null
      && ['link', 'script', 'img', 'iframe', 'source', 'video', 'audio', 'object', 'embed']
        .includes(tag[1].toLowerCase());
    if (external && fetches) offenders.push(`${tag[1]} ${value}`);
    m = urlAttributes.exec(html);
  }
  assert.deepEqual(offenders, [], 'the page fetches from the network');
});

test('every script and style is inline', () => {
  assert.ok(!/<script[^>]*\ssrc\s*=/i.test(html), 'a script is loaded from a URL');
  assert.ok(!/<link[^>]+rel\s*=\s*["']stylesheet["']/i.test(html), 'an external stylesheet is linked');
  assert.ok(!/@import/i.test(html), 'the stylesheet imports another');
  assert.ok(!/<link[^>]+rel\s*=\s*["']preconnect["']/i.test(html), 'the page preconnects somewhere');
  const favicon = /<link[^>]+rel\s*=\s*["']icon["'][^>]*href\s*=\s*["']([^"']+)["']/i.exec(html);
  assert.notEqual(favicon, null, 'the page has no favicon, so a browser will request one');
  assert.ok(favicon[1].startsWith('data:'), 'the favicon is not a data URI');
});

test('the two script elements are present, in order, and carry the ids the tests use', () => {
  const engine = html.indexOf('<script id="factory-engine">');
  const ui = html.indexOf('<script id="factory-ui">');
  assert.ok(engine > 0, 'the engine element is missing');
  assert.ok(ui > engine, 'the interface is defined before the model it observes');
  /* Counted on the markup with HTML comments stripped. The file's own header comment describes
     "the single <script> pair below", and a raw count reads that sentence as a third element —
     the same trap as searching the engine's prose for the call it promises not to make. */
  const markup = html.replace(/<!--[\s\S]*?-->/g, ' ');
  const scripts = markup.match(/<script\b/gi) || [];
  assert.equal(scripts.length, 2, `expected exactly two script elements, found ${scripts.length}`);
});

test('the engine element is free of the browser', () => {
  /* The harness already proves this by evaluating the engine in Node, where a DOM reference
     throws. This is the cheaper, more specific statement of the same rule, so a reviewer reading
     the suite sees it named. */
  const source = extractEngineSource()
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
  for (const forbidden of [
    /\bdocument\b/, /getElementById/, /addEventListener/, /requestAnimationFrame/,
    /localStorage/, /sessionStorage/, /\bfetch\s*\(/, /XMLHttpRequest/, /getContext/,
  ]) {
    assert.ok(!forbidden.test(source),
      `the engine references ${forbidden} and is no longer a pure model`);
  }
});

test('the download control hands over this same file', () => {
  const anchor = /<a[^>]+id\s*=\s*["']btn-download["'][^>]*>/i.exec(html);
  assert.notEqual(anchor, null, 'there is no download control');
  const href = /href\s*=\s*["']([^"']+)["']/i.exec(anchor[0]);
  assert.equal(href[1], 'index.html',
    'the download control points somewhere other than this page');
  const download = /download\s*=\s*["']([^"']+)["']/i.exec(anchor[0]);
  assert.equal(download[1], 'release-factory.html');
});

test('the page declares its language, its charset, and a viewport', () => {
  assert.ok(/<html[^>]+lang\s*=\s*["']en["']/i.test(html));
  assert.ok(/<meta[^>]+charset\s*=\s*["']utf-8["']/i.test(html));
  assert.ok(/<meta[^>]+name\s*=\s*["']viewport["']/i.test(html));
  assert.ok(/<title>[^<]+<\/title>/i.test(html));
  assert.ok(/<meta[^>]+name\s*=\s*["']description["']/i.test(html));
});

test('the page states the caveat the course requires, where a reader will see it', () => {
  /* Not a style check. The brief is explicit that the DORA caveat belongs on the page rather than
     in a report, and a later edit could quietly drop it while every other test stayed green.

     The caveat now lives in the handout band's model-assumptions block rather than its own
     `<p class="caveat">` strip. It is a claims-boundary statement, which is what that block is
     for, and the band had no room for both — a separate caveat strip cost about 100px of a 450px
     budget. What this test holds is unchanged and is the thing that matters: the three sentences
     are present, above the controls, and not inside a disclosure. */
  const start = html.indexOf('class="lab-assumptions"');
  assert.ok(start > 0, 'the model-assumptions block is gone');
  const block = html.slice(start, html.indexOf('</div>', html.indexOf('</ul>', start)));
  /* Whitespace is normalised before matching, deliberately. A pin that matches literal single
     spaces is a pin on the source's LINE WRAPPING as much as on its words — it fired three times
     in one session on sentences whose text was intact and whose wrap had moved, which reports a
     typographic change as a missing commitment. Normalising makes the pin test the claim. */
  const text = block.replace(/<[^>]+>/g, ' ').replace(/&mdash;|&ndash;/g, '-')
    .replace(/\s+/g, ' ');
  assert.match(text, /delivery performance and release risk/i);
  assert.match(text, /Four Keys/);
  assert.match(text, /do not establish whether the organisation is producing valuable or correct/i);
  assert.ok(start < html.indexOf('id="h-controls"'), 'the caveat is below the controls');
  assert.ok(start < html.indexOf('<details'), 'the caveat is inside or after a collapsed section');
  /* And nothing re-states it in a second place: the strip it replaced is gone for good. */
  assert.equal(html.includes('<p class="caveat">'), false,
    'the superseded caveat strip is back — the claim is now made once, in the assumptions block');
});

test('the model is labelled the Four Keys rather than a complete account of DORA', () => {
  assert.ok(/Four\s*Keys/.test(html), 'the Four Keys label is missing');
  /* The page may mention DORA, but never as something it exhausts. */
  assert.ok(/not an account of current DORA measurement practice/i.test(html),
    'the page does not disclaim completeness');
});

test('every element the interface addresses by id exists in the markup', () => {
  /* The interface is one script reaching into one document; a renamed id fails at runtime in a
     way a Node suite cannot see. Collect every `$('…')` and every getElementById, and check the
     markup declares each one. */
  const uiStart = html.indexOf('<script id="factory-ui">');
  const ui = html.slice(uiStart, html.indexOf('</script>', uiStart));
  const wanted = new Set();
  const dollar = /\$\(\s*'([a-zA-Z0-9_-]+)'\s*\)/g;
  let m = dollar.exec(ui);
  while (m !== null) { wanted.add(m[1]); m = dollar.exec(ui); }
  assert.ok(wanted.size > 30, `only ${wanted.size} ids referenced; the scan is not working`);
  const declared = new Set();
  const idAttr = /\sid\s*=\s*["']([a-zA-Z0-9_-]+)["']/g;
  m = idAttr.exec(html);
  while (m !== null) { declared.add(m[1]); m = idAttr.exec(html); }
  const missing = [...wanted].filter((id) => !declared.has(id));
  assert.deepEqual(missing, [], 'the interface addresses ids the markup does not declare');
});

test('canvases are labelled, and their descriptions are live regions', () => {
  const canvases = html.match(/<canvas\b[^>]*>/gi) || [];
  assert.ok(canvases.length >= 4, `only ${canvases.length} canvases`);
  for (const c of canvases) {
    assert.match(c, /role\s*=\s*["']img["']/i, `a canvas has no role: ${c}`);
    const labelled = /aria-labelledby\s*=\s*["']([a-zA-Z0-9_-]+)["']/i.exec(c);
    assert.notEqual(labelled, null, `a canvas has no accessible name: ${c}`);
    const target = new RegExp(`id="${labelled[1]}"[^>]*aria-live`, 'i');
    assert.ok(target.test(html),
      `the description for ${labelled[1]} is not a live region, so a screen reader never hears it`);
  }
});

test('the reduced-motion preference is honoured', () => {
  assert.ok(/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(html));
  assert.ok(/prefers-reduced-motion/.test(html.slice(html.indexOf('<script id="factory-ui">'))),
    'the interface never reads the reduced-motion preference');
});

test('the file is a reasonable size for a lecture-hall download', () => {
  const bytes = Buffer.byteLength(html, 'utf8');
  assert.ok(bytes > 80 * 1024, `the page is only ${bytes} bytes; something is missing`);
  assert.ok(bytes < 600 * 1024,
    `the page is ${Math.round(bytes / 1024)} KiB, which is too much to hand out`);
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
