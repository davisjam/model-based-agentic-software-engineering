/* test-packaging.mjs — the self-containment contract and the honesty commitments, enforced on the
 * shipped bytes.
 *
 * "No external dependencies", "works from a file:// URL" and "deterministic" are properties of the
 * FILE, so they are checked by reading the file rather than by inspecting a running page. These
 * checks hold everywhere, including a CI runner with no browser at all.
 *
 * It also pins the commitments an ordinary edit would quietly dissolve: that the costs are labelled
 * assumptions rather than measurements, that the required honesty statement is visible rather than
 * folded into an accordion, that the laboratory introduction exists above the controls, and that
 * the shared lab-shell styling stays separable from this exercise's own.
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
  /* Every src/href must be an inline data: URI, a document-local fragment, the page's own filename
     (the Download control), or an external https link the reader clicks deliberately. Nothing may
     be FETCHED from another origin while the page loads. */
  const refs = [...html.matchAll(/(?:src|href)\s*=\s*"([^"]*)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 0, 'no references found — the regex is wrong');
  for (const ref of refs.filter((r) => !r.startsWith('https://'))) {
    const ok = ref.startsWith('data:') || ref.startsWith('#') || ref === 'index.html';
    assert.ok(ok, `the page loads an external resource: ${ref}`);
  }
  for (const ref of refs.filter((r) => r.startsWith('https://'))) {
    assert.match(ref, /^https:\/\/(creativecommons\.org|www\.w3\.org)\//,
      `unexpected external link: ${ref}`);
  }
});

test('there is a favicon, so the browser issues no request for one', () => {
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
    'navigator.sendBeacon']) {
    assert.equal(html.includes(api), false, `the page references ${api}`);
  }
});

test('the page stores nothing — a student’s predictions and notes stay in the tab', () => {
  for (const api of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie']) {
    assert.equal(html.includes(api), false, `the page references ${api}`);
  }
});

test('the page is deterministic — there is no unseeded randomness anywhere', () => {
  assert.equal(/Math\.random/.test(html), false, 'the page calls Math.random');
  assert.equal(/crypto\.getRandomValues/.test(html), false, 'the page calls getRandomValues');
  assert.equal(/Date\.now\(\)/.test(extractEngineSource(html)), false,
    'the engine reads the clock, so two runs could differ');
});

test('the download control hands the reader this same file', () => {
  assert.match(html, /id="btn-download"[^>]*href="index\.html"/);
  assert.match(html, /download="architecture-workbench\.html"/);
});

test('the file is small enough to hand to a classroom', () => {
  const bytes = Buffer.byteLength(html, 'utf8');
  assert.ok(bytes < 280000, `${DEMO_HTML} is ${bytes} bytes — this exercise is meant to be compact`);
  assert.ok(bytes > 60000, `${DEMO_HTML} is only ${bytes} bytes — did it truncate?`);
});

test('the page carries the house provenance comment and names its unit', () => {
  const head = html.slice(0, 4000);
  assert.match(head, /HAND-AUTHORED/);
  assert.match(head, /catalog\.py build/);
  assert.match(head, /file:\/\//);
  assert.match(html, /Teach with MAGE/);
  assert.match(html, /ECE&nbsp;30861/);
  assert.match(html, /Act&nbsp;III/);
  assert.match(html, /\(Agentic\) Technical Debt, Architecture and Dependencies/);
});

/* --- the engine / interface separation -------------------------------------------------------- */

/** Engine source with comments removed — the engine DISCUSSES the surfaces it must not use. */
function engineCode(source = extractEngineSource(html)) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

test('the engine touches no browser surface', () => {
  const code = engineCode();
  for (const api of ['document.', 'window.document', 'getElementById', 'querySelector',
    'addEventListener', 'createElement', 'createElementNS', 'getContext',
    'requestAnimationFrame', 'matchMedia', 'getComputedStyle', 'performance.now']) {
    assert.equal(code.includes(api), false, `the engine references ${api}`);
  }
  const windowUses = code.match(/\bwindow\b[^\n]*/g) || [];
  assert.equal(windowUses.length, 1, `the engine touches window ${windowUses.length} times`);
  assert.match(windowUses[0], /window\.ArchitectureWorkbench = \{/);
  assert.doesNotThrow(() => loadEngine());
});

test('the engine publishes exactly the namespace the page and the tests consume', () => {
  const engine = loadEngine();
  for (const name of ['architectureById', 'scenarioById', 'conditionById', 'mixById',
    'multiplierById', 'assuranceById', 'relationById', 'roleByToken', 'roleLabel',
    'nodeById', 'nodeName', 'nodeNames',
    'dependenciesOf', 'dependentsOf', 'edgeKind', 'hasEdge', 'reachableFrom', 'reachingTo',
    'shortestPath', 'nodesWithRole',
    'impactSets', 'impactAll', 'impactStateOf', 'impactDirectionOf',
    'parseRule', 'formatRule', 'resolveOperand', 'evaluateRule', 'evaluateRules',
    'cloneDefaultRules',
    'horizonCounts', 'costBreakdown', 'compareCosts', 'crossoverChanges', 'crossovers',
    'conditionResult', 'conditionSweep', 'sweepLeaders',
    'graphDescription', 'nodeCentre', 'borderPoint', 'edgeGeometry', 'arrowHead', 'boundsOf',
    'formatCost', 'formatPercent', 'formatCount', 'runSelfTests', 'assign']) {
    assert.equal(typeof engine[name], 'function', `window.ArchitectureWorkbench.${name} is missing`);
  }
  for (const name of ['ROLES', 'ARCHITECTURES', 'ARCHITECTURE_IDS', 'SCENARIOS', 'SCENARIO_IDS',
    'RELATIONS', 'DEFAULT_RULES', 'OBLIGATIONS', 'CHANGE_TYPES', 'CHANGE_TYPE_IDS',
    'IMPLEMENTATION_MULTIPLIERS', 'ASSURANCE_LEVELS', 'MIXES', 'CONDITIONS',
    'DEFAULT_SETTINGS', 'SWEEP_COUNTS', 'CONCRETE_ROLE_IDS']) {
    assert.ok(engine[name], `window.ArchitectureWorkbench.${name} is missing`);
  }
  assert.equal(typeof engine.VERSION, 'string');
  assert.equal(typeof engine.TIE_BAND, 'number');
  assert.equal(typeof engine.NODE_W, 'number');
  assert.equal(typeof engine.NODE_H, 'number');
});

test('the interface reads the model and never recomputes it', () => {
  /* The interface may format and draw. It must not own a second copy of any coefficient, impact
     set or verdict — that is the drift that would let a readout and the graph disagree. */
  const ui = extractUiSource(html);
  for (const constant of ['implementationOnce:', 'assuranceOnce:', 'coordinationPerChange:',
    'perChange:', 'mustModify:', 'TIE_BAND =', 'shares:']) {
    assert.equal(ui.includes(constant), false,
      `the interface declares its own ${constant} — that belongs to the engine alone`);
  }
  /* Nor may it hardcode the lecture's figures, the architecture ids, or the relation texts. */
  for (const literal of ['MUST NOT DEPEND ON\'', '\'retain\'', '\'modular\'', '\'services\'']) {
    assert.equal(ui.includes(literal), false,
      `the interface hardcodes ${literal} instead of reading it from the engine`);
  }
});

test('both script elements carry the ids the harness and the page agree on', () => {
  assert.match(html, /<script id="workbench-engine">/);
  assert.match(html, /<script id="workbench-ui">/);
  /* Counting `<script id=` rather than `<script`: the provenance comment at the head of the file
     mentions the element pair in prose, and an opening-tag count would read that as a third one. */
  assert.equal((html.match(/<script id=/g) || []).length, 2, 'there should be exactly two scripts');
  assert.equal((html.match(/<\/script>/g) || []).length, 2);
  assert.ok(html.indexOf('<script id="workbench-engine">') < html.indexOf('<script id="workbench-ui">'),
    'the interface must not be able to run before the model exists');
});

/* --- the honesty commitments ------------------------------------------------------------------- */

test('the author’s required statement about the cost estimates appears verbatim and visibly', () => {
  const required = 'The cost estimates are illustrative. Graph structure alone does not predict '
    + 'change cost.';
  /* Verbatim, allowing only the line wrapping an HTML author would introduce. */
  const flattened = html.replace(/\s+/g, ' ');
  assert.ok(flattened.includes(required), 'the required statement is missing or reworded');
  /* And NOT inside a <details>, which §10C forbids for model and assumption material. */
  for (const match of html.matchAll(/<details[\s\S]*?<\/details>/g)) {
    assert.equal(match[0].replace(/\s+/g, ' ').includes(required), false,
      'the required statement is hidden behind a disclosure');
  }
});

test('the page says the numbers are assumptions rather than measurements, in several places', () => {
  const flattened = html.replace(/\s+/g, ' ');
  for (const phrase of [
    'Nothing on this page was measured',
    'None is a measurement of the reservation service or of any other system',
    'assumptions, not measurements',
    'Assumed, not measured',
  ]) {
    assert.ok(flattened.includes(phrase), `the page never says: ${phrase}`);
  }
  assert.match(html, /class="assumebox"/);
  assert.match(html, /class="lab-disclaimer"/);
  assert.ok((html.match(/assum/gi) || []).length > 25,
    'the page barely mentions that its figures are assumed');
  /* Every cost cell the reader can read is marked, not only the prose around them. */
  assert.match(html, /class="badge s-warn"/);
  assert.match(extractUiSource(html), /n assume/);
});

test('the page states the must-modify versus potentially-impacted distinction in prose', () => {
  const flattened = html.replace(/\s+/g, ' ');
  assert.ok(flattened.includes('A dependency edge is not evidence that both ends change'));
  assert.ok(flattened.includes('not a change it establishes'));
  assert.ok(flattened.includes('never summed') || flattened.includes('never adds them together'));
});

test('the page states that it is not a technical-debt calculator, and why', () => {
  const head = html.slice(0, 4000);
  assert.match(head, /NOT A TECHNICAL-DEBT CALCULATOR/);
  assert.match(head, /assurance/i);
});

test('the page offers no drag-and-drop graph editor, and says the architectures are predefined', () => {
  for (const api of ['dragstart', 'dragover', 'ondrop', 'draggable', 'pointermove', 'mousemove']) {
    assert.equal(html.includes(api), false, `the page wires up ${api}`);
  }
  const flattened = html.replace(/\s+/g, ' ');
  assert.ok(flattened.includes('the graph is not editable'));
  assert.ok(flattened.includes('predefined'));
});

/* --- the laboratory handout (the shared design requirement) ------------------------------------ */

test('the engineering problem is stated above the controls, as a question', () => {
  const problemAt = html.indexOf('When implementation becomes cheap, which architectural boundaries');
  assert.ok(problemAt > 0, 'the opening question is missing');
  const firstControl = Math.min(
    html.indexOf('<select id="scenario">'),
    html.indexOf('id="arch-seg"'),
  );
  assert.ok(problemAt < firstControl, 'the opening question sits below the first control');
  assert.match(html, /class="lab-question"/);
});

test('figure 1 opens the band; figure 2 sits beside the panel it explains', () => {
  /* The author's ruling on figure placement: figure 1 — the system boundary — is required in the
     opening band on every exercise, and figure 2 goes where it does its work. Here it explains
     change-impact propagation, so it belongs in the Change impact panel, below the controls. The
     earlier form of this test demanded both figures above the controls, which cost the band 71px
     it does not have. */
  const figure1 = html.indexOf('id="f1-t"');
  const figure2 = html.indexOf('id="f2-t"');
  const firstControl = html.indexOf('<select id="scenario">');
  const impactPanel = html.indexOf('id="h-impact"');
  assert.ok(figure1 > 0 && figure2 > 0, 'a required figure is missing');
  assert.ok(figure1 < firstControl, 'figure 1 sits below the controls');
  assert.ok(figure1 < html.indexOf('<table class="lab-parameters">'),
    'figure 1 does not open the band');
  assert.ok(impactPanel > 0, 'the Change impact panel is gone');
  assert.ok(figure2 > impactPanel && figure2 < html.indexOf('id="h-cost"'),
    'figure 2 is not inside the Change impact panel it explains');
  assert.equal((html.match(/<figure class="lab-figure">/g) || []).length, 2);
  assert.equal((html.match(/<figcaption>/g) || []).length, 2, 'a figure has no caption');
});

test('figure 1 shows the existing structure beside the modular alternative', () => {
  const figure = html.slice(html.indexOf('id="f1-t"'), html.indexOf('</figure>'));
  assert.match(figure, /existing structure/);
  assert.match(figure, /modular monolith/i);
  for (const name of ['HTTP API', 'BookingService', 'RoomRules', 'Approval', 'Persistence',
    'Database', 'RoomPolicy', 'LabPolicy']) {
    assert.ok(figure.includes(name), `figure 1 omits ${name}`);
  }
});

test('figure 2 draws the author’s propagation chain and distinguishes the two states', () => {
  const start = html.indexOf('id="f2-t"');
  const figure = html.slice(start, html.indexOf('</figure>', start));
  for (const name of ['New laboratory', 'BookingService', 'RoomRules', 'Approval', 'Persistence']) {
    assert.ok(figure.includes(name), `figure 2 omits ${name}`);
  }
  assert.match(figure, /MUST MODIFY/);
  assert.match(figure, /POSSIBLE/);
  /* The two states are drawn differently, not merely labelled differently. */
  assert.match(figure, /class="bx must"/);
  assert.match(figure, /class="bx maybe"/);
  assert.equal((figure.match(/class="bx must"/g) || []).length, 3,
    'the chain should mark exactly three components as must-modify');
  assert.equal((figure.match(/class="bx maybe"/g) || []).length, 1,
    'the chain should mark exactly one component as a possible downstream effect');
});

test('both figures carry an accessible title and description', () => {
  for (const [titleId, descId] of [['f1-t', 'f1-d'], ['f2-t', 'f2-d']]) {
    assert.match(html, new RegExp(`aria-labelledby="${titleId}" aria-describedby="${descId}"`));
    const start = html.indexOf(`id="${descId}"`);
    const description = html.slice(start, html.indexOf('</desc>', start));
    assert.ok(description.length > 300, `${descId} is only ${description.length} characters`);
  }
});

test('the parameter table explains every primary parameter, with a unit and a default', () => {
  const start = html.indexOf('<table class="lab-parameters">');
  assert.ok(start > 0, 'there is no parameter table');
  const table = html.slice(start, html.indexOf('</table>', start));
  for (const parameter of ['Architecture', 'Future changes', 'Team structure',
    'Implementation multiplier', 'Assurance cost']) {
    assert.ok(table.includes(parameter), `the parameter table omits ${parameter}`);
  }
  assert.equal((table.match(/<th scope="row">/g) || []).length, 5);
  assert.equal((table.match(/class="unit"/g) || []).length, 5, 'a parameter has no unit');
  assert.equal((table.match(/class="default"/g) || []).length, 5, 'a parameter has no default');
  assert.equal((table.match(/<th scope="col">/g) || []).length, 5);
  assert.ok(table.indexOf('<thead>') < table.indexOf('<tbody>'));
});

test('the model assumptions are visible rather than inside a disclosure', () => {
  const start = html.indexOf('class="lab-assumptions"');
  assert.ok(start > 0, 'there is no assumptions block');
  for (const match of html.matchAll(/<details[\s\S]*?<\/details>/g)) {
    assert.equal(match[0].includes('class="lab-assumptions"'), false,
      'the assumptions block is hidden behind a disclosure');
    assert.equal(match[0].includes('<table class="lab-parameters">'), false,
      'the parameter table is hidden behind a disclosure');
  }
});

test('the Predict / Run / Explain block sits immediately above the controls', () => {
  const experiment = html.indexOf('class="lab-experiment"');
  const firstControl = html.indexOf('<select id="scenario">');
  assert.ok(experiment > 0, 'there is no experiment block');
  assert.ok(experiment < firstControl, 'the experiment block sits below the controls');
  const block = html.slice(experiment, firstControl);
  assert.match(block, /1 &middot; Predict/);
  assert.match(block, /2 &middot; Run/);
  assert.match(block, /3 &middot; Explain/);
  /* Specific to THIS simulator, not a generic note about the scientific method. */
  assert.match(block, /implementation multiplier/);
  assert.match(block, /persistence mechanism/);
  assert.ok(!/scientific method/i.test(block));
});

test('the introduction appears in the order the shared design requires', () => {
  /* Scoped to the MARKUP: the stylesheet declares every `.lab-*` selector near the top of the
     file, so searching the whole document would compare CSS positions with body positions and
     report an ordering that has nothing to do with what a reader sees. */
  const body = html.slice(html.indexOf('<body>'));
  const order = ['lab-question', 'class="lab-frame"', 'id="f1-t"', 'class="lab-assumptions"',
    'class="lab-disclaimer"', '<table class="lab-parameters">',
    'class="lab-experiment"', '<select id="scenario">', 'id="f2-t"'];
  let previous = -1;
  for (const marker of order) {
    const at = body.indexOf(marker);
    assert.ok(at > previous, `${marker} appears out of order (found at ${at}, previous ${previous})`);
    previous = at;
  }
});

test('the shared lab shell is one delimited block, and nothing interleaves with it', () => {
  /* The extraction contract: the shell must be liftable into a shared source mechanically. */
  const begin = html.indexOf('===== BEGIN LAB SHELL');
  const end = html.indexOf('===== END LAB SHELL');
  assert.ok(begin > 0, 'the lab shell has no begin marker');
  assert.ok(end > begin, 'the lab shell has no end marker after its begin marker');
  const shell = html.slice(begin, end);
  /* `lastIndexOf`, not `indexOf`: the page carries TWO style elements since the shared core was
     extracted, and the FIRST `</style>` now closes the generated core — which sits before `begin`,
     so an `indexOf` here silently sliced an empty string and stopped checking everything below the
     END marker. A check that narrows itself to nothing still passes. */
  const rest = html.slice(0, begin) + html.slice(end, html.lastIndexOf('</style>'));

  /* Every `.lab-*` selector lives inside the shell. */
  const selectorsOutside = [...rest.matchAll(/^\s*[^@\n{]*\.lab-[\w-]+[^{\n]*\{/gm)];
  assert.deepEqual(selectorsOutside.map((m) => m[0].trim()), [],
    'a .lab-* rule lives outside the shell block');

  /* And the shell mentions nothing specific to this exercise. */
  for (const token of ['.node', '.edge', 'svg.graph', '.rule-row', '.cond', 'workbench',
    'architecture', '--must', '--maybe']) {
    assert.equal(shell.includes(token), false,
      `the lab shell references ${token}, which is specific to this exercise`);
  }
});

test('the stylesheet declares both colour schemes and honours reduced motion', () => {
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(html, /@media print/);
});

/* --- accessibility of the shipped markup ------------------------------------------------------- */

test('the live graph is an image with a title and a description the engine writes', () => {
  assert.match(html, /<svg id="graph" class="graph"[^>]*role="img"/);
  assert.match(html, /aria-labelledby="graph-title" aria-describedby="graph-desc"/);
  assert.match(extractUiSource(html), /graphDescription/);
});

test('every section is labelled by a heading, and no heading level is skipped', () => {
  const sections = [...html.matchAll(/<section[^>]*aria-labelledby="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(sections.length >= 6, `only ${sections.length} labelled sections`);
  for (const id of sections) {
    assert.ok(new RegExp(`<h2[^>]*id="${id}"`).test(html), `no h2 carries id ${id}`);
  }
  assert.equal(/<h1[^>]*>/.test(html), true);
  assert.equal((html.match(/<h1/g) || []).length, 1, 'there should be exactly one h1');
  assert.equal(/<h4/.test(html), false, 'an h4 appears with no h3 discipline to support it');
});

test('every form control carries a label, visible or screen-reader only', () => {
  const ids = [...html.matchAll(/<(?:select|input|textarea)[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 4, `only ${ids.length} form controls found`);
  for (const id of ids) {
    const labelled = new RegExp(`<label[^>]*for="${id}"`).test(html);
    const selfLabelled = new RegExp(`id="${id}"[^>]*aria-label=`).test(html);
    assert.ok(labelled || selfLabelled, `control ${id} has no label`);
  }
});

test('every segmented control group is labelled and uses aria-pressed', () => {
  for (const id of ['release-seg', 'mult-seg', 'assur-seg', 'arch-seg']) {
    const at = html.indexOf(`id="${id}"`);
    assert.ok(at > 0, `${id} is missing`);
    const tag = html.slice(html.lastIndexOf('<', at), html.indexOf('>', at) + 1);
    assert.match(tag, /role="group"/, `${id} is not a group`);
    assert.ok(/aria-labelledby=/.test(tag) || /aria-label=/.test(tag), `${id} has no label`);
  }
  assert.match(extractUiSource(html), /aria-pressed/);
});

test('the status regions announce themselves', () => {
  assert.match(html, /id="clamp-notice"[^>]*role="status"/);
  assert.match(html, /id="rule-err"[^>]*role="status"/);
  assert.match(html, /id="selftest-out"[^>]*aria-live="polite"/);
  assert.match(html, /id="selection-detail"[^>]*aria-live="polite"/);
});

test('the graph’s nodes and edges are keyboard reachable buttons', () => {
  const ui = extractUiSource(html);
  assert.match(ui, /tabindex: '0'/);
  assert.match(ui, /role: 'button'/);
  assert.match(ui, /keydown/);
  assert.match(ui, /event\.key === 'Enter'/);
});

/* --- the model’s own self-tests ---------------------------------------------------------------- */

test('the page’s self-tests all pass, and there are enough of them to mean something', () => {
  const report = M.runSelfTests();
  assert.equal(report.failed, 0,
    report.results.filter((r) => !r.passed).map((r) => `${r.name} (${r.detail})`).join('; '));
  assert.ok(report.total >= 20, `only ${report.total} self-tests`);
  assert.equal(report.passed, report.total);
});

test('the self-test report names each check, so a failure is readable on the page', () => {
  for (const result of M.runSelfTests().results) {
    assert.ok(result.name.length > 15, `a self-test is named only "${result.name}"`);
    assert.equal(typeof result.passed, 'boolean');
  }
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
