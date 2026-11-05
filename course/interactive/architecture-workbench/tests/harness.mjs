/* harness.mjs — load the shipped engine, not a copy of it.
 *
 * The exercise is a single self-contained index.html, which is the artifact students run. If the
 * tests held their own copy of the engine the two would drift, and the suite would start certifying
 * code nobody loads. So the harness EXTRACTS the <script id="workbench-engine"> element from
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
const ENGINE_ID = 'workbench-engine';
const UI_ID = 'workbench-ui';

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
  if (!source.includes('ArchitectureWorkbench')) {
    throw new Error('extracted engine does not publish ArchitectureWorkbench');
  }
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
  if (!published.ArchitectureWorkbench) {
    throw new Error('engine did not publish window.ArchitectureWorkbench');
  }
  return published.ArchitectureWorkbench;
}

/** Shared instance: every test file loads the same evaluated engine. */
export const M = loadEngine();

/** `M.DEFAULT_SETTINGS` with the named fields replaced. */
export function withSettings(overrides) {
  return { ...M.DEFAULT_SETTINGS, ...overrides };
}

/** The settings at which the lecture's two illustrative tables are defined: no future changes. */
export function oneTimeOnly(overrides = {}) {
  return withSettings({
    changes: 0, mixId: 'policy-only', teams: 1, assuranceId: 'medium',
    independentRelease: false, ...overrides,
  });
}

/** The total modelled cost for one architecture at `DEFAULT_SETTINGS` plus overrides. */
export function total(architectureId, overrides = {}) {
  return M.costBreakdown(architectureId, withSettings(overrides)).total;
}

/** Totals for all three architectures, keyed by id. */
export function totals(overrides = {}) {
  const out = {};
  for (const id of M.ARCHITECTURE_IDS) out[id] = total(id, overrides);
  return out;
}

/** The eligible cost leader's architecture id at `DEFAULT_SETTINGS` plus overrides, or null. */
export function leader(overrides = {}) {
  const comparison = M.compareCosts(withSettings(overrides));
  return comparison.leader ? comparison.leader.architecture : null;
}

/** Parse a rule in the page's own syntax, failing loudly rather than returning a bad object. */
export function rule(text) {
  const parsed = M.parseRule(text);
  if (parsed.error) throw new Error(`the harness wrote an unparseable rule: ${text} — ${parsed.error}`);
  return parsed.rule;
}

/** Evaluate one freshly-parsed rule against one architecture. */
export function verdict(architectureId, text) {
  const parsed = rule(text);
  return M.evaluateRule(architectureId, parsed, [parsed]);
}

/** The set of edge keys `from->to` for one architecture, for independent re-derivation. */
export function edgeKeys(architectureId) {
  return M.architectureById(architectureId).edges.map((e) => `${e[0]}->${e[1]}`);
}

/* --------------------------------------------------------------------------------------------- *
 * The published cost formula, re-derived here INDEPENDENTLY of the engine.
 *
 * The engine builds its totals by walking the change types and bucketing each term. This function
 * computes the same total straight from the closed-form expression the page prints:
 *
 *     C_A(H) = m·I_A + a·V_A + Σ_j n_j ( m·c_A,j + a·( s_A,j + k_A·(T−1) ) )
 *
 * Asserting the two against each other is the point: a coefficient edit, a reordered term, or a
 * multiplier applied to the wrong half breaks the agreement, so the formula the page prints cannot
 * silently stop describing the arithmetic the page runs.
 * --------------------------------------------------------------------------------------------- */
export function expectedTotal(architectureId, settings) {
  const arch = M.architectureById(architectureId);
  const m = M.multiplierById(settings.multiplierId).value;
  const a = M.assuranceById(settings.assuranceId).value;
  const teams = Math.max(1, Math.floor(settings.teams));
  const k = arch.costs.coordinationPerChange * (teams - 1);
  const counts = M.horizonCounts(settings.changes, settings.mixId);

  let sum = m * arch.costs.implementationOnce + a * arch.costs.assuranceOnce;
  for (const type of M.CHANGE_TYPES) {
    const coefficients = arch.costs.perChange[type.id];
    sum += counts[type.id] * (m * coefficients.implementation + a * (coefficients.assurance + k));
  }
  return sum;
}

/** Reverse reachability, re-derived by repeated relaxation rather than by the engine's traversal. */
export function expectedReachingTo(architectureId, nodeId) {
  const edges = M.architectureById(architectureId).edges;
  const found = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    for (const [from, to] of edges) {
      if ((to === nodeId || found.has(to)) && !found.has(from)) {
        found.add(from);
        grew = true;
      }
    }
  }
  found.delete(nodeId);
  return [...found];
}

/** Forward reachability, same independent derivation in the other direction. */
export function expectedReachableFrom(architectureId, nodeId) {
  const edges = M.architectureById(architectureId).edges;
  const found = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    for (const [from, to] of edges) {
      if ((from === nodeId || found.has(from)) && !found.has(to)) {
        found.add(to);
        grew = true;
      }
    }
  }
  found.delete(nodeId);
  return [...found];
}
