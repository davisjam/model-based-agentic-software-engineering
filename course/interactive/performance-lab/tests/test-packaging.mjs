/* test-packaging.mjs — the shared core stylesheet, held byte-equal to its source.
 *
 * The six interactive laboratories share a page frame. That CSS lives once in
 * course/interactive/_shared/instrument-core.css and is inlined into each shipped page by
 * _shared/sync_css.py — inlined rather than linked because the page must stay ONE file: the
 * packaging assertions in run-all.mjs forbid an external stylesheet, and the reader opens this
 * page from a file:// URL.
 *
 * Nothing in the pipeline re-renders these pages, so the only thing standing between the core and
 * six slowly diverging copies of it is this check.
 *
 * WHY THIS FILE EXISTS SEPARATELY, when every other check in this laboratory lives in run-all.mjs:
 * the generated block's own provenance notice names `tests/test-packaging.mjs` as the file holding
 * it byte-equal. That notice is fixed bytes shared by all six pages, so the claim is only true if
 * the file is really here. The sibling laboratories warn that `node --test` SILENTLY IGNORES a
 * missing path and still exits 0 — a check that passes by being absent. run-all.mjs therefore
 * asserts this file EXISTS before spawning it, which closes that hole by construction rather than
 * by placement.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(HERE, '..', 'index.html'), 'utf8');
const CORE_PATH = join(HERE, '..', '..', '_shared', 'instrument-core.css');

const CORE_BEGIN = '/* ===== GENERATED from course/interactive/_shared/instrument-core.css by '
  + 'sync_css.py — do not edit\n   here; edit the source and re-run the sync. A parity test in '
  + 'tests/test-packaging.mjs holds\n   this copy byte-equal to the source. ===== */';
const CORE_END = '/* ===== end generated core ===== */';

test('the page carries exactly two style elements: the generated core, then its own', () => {
  /* Anchored to a line start: the comment above DISCUSSES the element pair in prose, and an
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
  const source = readFileSync(CORE_PATH, 'utf8');
  const from = html.indexOf(CORE_BEGIN) + CORE_BEGIN.length;
  const to = html.indexOf(CORE_END);
  assert.equal(html.slice(from, to), `\n${source.replace(/\n+$/, '')}\n`,
    'the inlined core has drifted from its source — run '
    + '`python3 course/interactive/_shared/sync_css.py` and commit the result');
});

test('the core block precedes this laboratory’s own block, so a local rule wins a tie', () => {
  /* Equal specificity is decided by source order. If the generated core came second it would
     override this page's own styling, silently and only for the rules they share — which here is
     the handful the lab shell contributes (.panel, .note, .primary). */
  const ownBlock = html.indexOf('<style>', html.indexOf(CORE_END));
  assert.ok(ownBlock > html.indexOf(CORE_BEGIN),
    'the hand-authored block must follow the generated core');
});
