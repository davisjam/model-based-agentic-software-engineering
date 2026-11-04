/* harness.mjs — load the shipped engine, not a copy of it.
 *
 * The exercise is a single self-contained index.html, which is the artifact students run. If the
 * tests held their own copy of the engine the two would drift, and the suite would start certifying
 * code nobody loads. So the harness EXTRACTS the <script id="storage-engine"> element from
 * index.html and evaluates it with nothing but a `window` stub. The tested text and the shipped
 * text are therefore the same bytes.
 *
 * That also pins two properties the specification asks for, mechanically rather than by review:
 *   - the engine is free of every browser surface (it would throw here if it touched the page), and
 *   - the engine publishes exactly the namespace the interface and the tests consume.
 *
 * Stdlib only. No dependency is added to the page or to the repository.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEMO_HTML = join(HERE, '..', 'index.html');
const ENGINE_ID = 'storage-engine';
const UI_ID = 'storage-ui';

/** The raw text of the exercise page. */
export function readDemoHtml() {
  return readFileSync(DEMO_HTML, 'utf8');
}

/** The source text of a script element, located by id. */
export function extractScriptSource(id, html = readDemoHtml()) {
  const open = html.indexOf(`<script id="${id}">`);
  if (open < 0) throw new Error(`index.html has no <script id="${id}"> element`);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', bodyStart);
  if (close < 0) throw new Error(`<script id="${id}"> is unterminated`);
  return html.slice(bodyStart, close);
}

/** The engine script's source text. */
export function extractEngineSource(html = readDemoHtml()) {
  const source = extractScriptSource(ENGINE_ID, html);
  if (!source.includes('StorageCost')) throw new Error('extracted engine does not publish StorageCost');
  return source;
}

/** The interface script's source text. */
export function extractUiSource(html = readDemoHtml()) {
  return extractScriptSource(UI_ID, html);
}

/**
 * Evaluate the engine against a `window` stub and return the namespace it publishes.
 *
 * `new Function` rather than `node:vm`: a vm context has its OWN array and object intrinsics, so
 * every array the engine returned would fail a deep-equality assertion for a reason that has
 * nothing to do with the model. Here the engine shares the test realm's intrinsics, and the
 * no-browser-surface check still holds — Node has no page object, so a reference to one throws a
 * ReferenceError rather than passing silently.
 */
export function loadEngine() {
  const stub = {};
  const run = new Function('window', `${extractEngineSource()}\nreturn window;`);
  const published = run(stub);
  if (!published.StorageCost) throw new Error('engine did not publish window.StorageCost');
  return published.StorageCost;
}

/** Shared instance: every test file loads the same evaluated engine. */
export const M = loadEngine();

/** The lecture's configuration, which every file starts from. */
export const LANDER = {
  rooms: 100,
  reservationsPerRoom: 20,
  metadataBytes: 200,
  reservationBytes: 100,
  identifierBytes: 8,
  representation: 'normalized',
  physicalEstimate: false,
  roomIndex: 0,
};

/** `LANDER` with the named fields replaced. */
export function withParams(overrides) {
  return { ...LANDER, ...overrides };
}

/** Logical storage for one representation at `LANDER` plus overrides. */
export function logical(representation, overrides = {}) {
  return M.computeStorage(withParams(overrides), representation).logical;
}

/** The full storage breakdown for one representation at `LANDER` plus overrides. */
export function storage(representation, overrides = {}) {
  return M.computeStorage(withParams(overrides), representation);
}

/** The rename impact for one representation at `LANDER` plus overrides. */
export function rename(representation, overrides = {}) {
  return M.renameImpact(withParams(overrides), representation);
}

/* --------------------------------------------------------------------------------------------- *
 * The published formulas, re-derived here INDEPENDENTLY of the engine.
 *
 * The engine computes its totals by walking the declared record layouts and bucketing each field.
 * These functions compute the same totals from the closed-form expressions printed in the page's
 * model table. Asserting the two against each other is the point: a layout edit that changes a
 * field's size or bucket breaks the agreement, so the page's published formula cannot silently
 * stop describing the page's arithmetic.
 * --------------------------------------------------------------------------------------------- */

/** N = R × V. */
export function expectedTotalReservations({ rooms: R, reservationsPerRoom: V }) {
  return R * V;
}

/** The three logical totals, from the formulas the page prints. */
export function expectedLogical(params) {
  const { rooms: R, metadataBytes: Mb, reservationBytes: Z, identifierBytes: I } = params;
  const N = expectedTotalReservations(params);
  return {
    normalized: R * (I + Mb) + N * (2 * I + Z),
    denormalized: N * (Mb + Z + 2 * I),
    document: R * (I + Mb) + N * (I + Z),
  };
}

/** The three decompositions, from the formulas the page prints. */
export function expectedBuckets(params) {
  const { rooms: R, metadataBytes: Mb, reservationBytes: Z, identifierBytes: I } = params;
  const N = expectedTotalReservations(params);
  const unique = R * Mb + N * Z;
  return {
    normalized: { unique, duplicated: 0, references: R * I + 2 * N * I },
    denormalized: { unique, duplicated: (N - R) * Mb, references: 2 * N * I },
    document: { unique, duplicated: 0, references: R * I + N * I },
  };
}

/** The assumed index-entry counts, from the table the page prints. */
export function expectedIndexEntries(params) {
  const { rooms: R } = params;
  const N = expectedTotalReservations(params);
  return { normalized: R + 2 * N, denormalized: 2 * N, document: R + N };
}

/** The assumed stored-record counts: rows, documents, and nested sub-documents. */
export function expectedRecords(params) {
  const { rooms: R } = params;
  const N = expectedTotalReservations(params);
  return { normalized: R + N, denormalized: N, document: R + N };
}
