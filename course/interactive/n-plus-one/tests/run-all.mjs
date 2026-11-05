#!/usr/bin/env node
/* run-all.mjs — the demonstration's test entry point.
 *
 *   node course/interactive/n-plus-one/tests/run-all.mjs
 *       unit tier + the browser tier.                     (~30 s)
 *
 *   node course/interactive/n-plus-one/tests/run-all.mjs --unit
 *       unit tier alone, no browser needed.               (~1 s)
 *
 *   node --test "course/interactive/n-plus-one/tests/test-*.mjs"
 *       everything through Node's own runner.
 *
 * Stdlib only for the unit tier. The browser tier RESOLVES Puppeteer from the book's node_modules
 * rather than depending on it, and skips itself when that copy is absent — so the unit tier is the
 * line that holds on every machine, including a runner with no browser.
 *
 * Deliberately NOT wired into the repository's pre-push hook or its Python test runner. The
 * placement rule in CLAUDE.md sends a check to exactly one station, and adding a station changes
 * shared gate wiring that several concurrent agents also hold. Run it from here; promoting the unit
 * tier to pre-push (it is cheap, deterministic, and scoped to this directory) is a clean follow-up.
 */
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const unitOnly = process.argv.includes('--unit');

const UNIT_FILES = ['test-query-counts.mjs', 'test-cost-model.mjs', 'test-parameters.mjs',
  'test-packaging.mjs'];

function run(label, args) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const started = Date.now();
  const r = spawnSync(process.execPath, args, { cwd: HERE, stdio: 'inherit' });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  process.stdout.write(`--- ${label}: ${r.status === 0 ? 'PASS' : 'FAIL'} in ${seconds}s\n`);
  return r.status === 0;
}

const tiers = [run('unit tier', ['--test', ...UNIT_FILES])];
if (!unitOnly) {
  tiers.push(run('browser tier (headless Chromium)',
    ['--test', '--test-timeout=300000', 'test-browser.mjs']));
  /* Laid-out figure geometry: a label clipped by its viewBox, sitting on another label, or
     painted under a later filled rect. Needs a layout engine, so it rides the browser tier. */
  tiers.push(run('figure geometry',
    ['../../_shared/check_figure_geometry.mjs', 'n-plus-one']));
}

const ok = tiers.every(Boolean);
process.stdout.write(`\n${ok ? 'ALL TIERS PASS' : 'FAILURES ABOVE'}\n`);
process.exit(ok ? 0 : 1);
