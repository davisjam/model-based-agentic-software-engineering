#!/usr/bin/env node
/* run-all.mjs — the simulator's test entry point.
 *
 *   node course/interactive/release-factory/tests/run-all.mjs
 *       unit tier + the short statistical tier.           (~8 s)
 *
 *   node course/interactive/release-factory/tests/run-all.mjs --full
 *       unit tier + the full statistical validation.      (~30 s)
 *
 *   node --test "course/interactive/release-factory/tests/test-*.mjs"
 *       unit tier alone, through Node's own runner.       (~4 s)
 *
 *   python3 course/interactive/release-factory/tests/browser_test.py --serve
 *       browser tier: Chromium and Firefox, from file:// and over HTTP.  (~40 s)
 *       Separate because it needs a browser; it exits 2 when none is available, so a browser-less
 *       runner reports "skipped" rather than red.
 *
 * Stdlib only: `node:test` and `node:assert`. The published page gains no dependency from any of
 * this, and the tests load the engine out of index.html rather than keeping a copy (see
 * harness.mjs).
 *
 * Deliberately NOT wired into the repository's pre-push hook or `catalog_tests.py`. The placement
 * rule in CLAUDE.md sends a check to exactly one station, and adding a station is a change to the
 * shared gate wiring that several concurrent agents also hold. Run it from here; promoting the
 * unit tier to pre-push (it is cheap, deterministic, and scoped) is a clean follow-up.
 */
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const full = process.argv.includes('--full');

function run(label, args) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const started = Date.now();
  const r = spawnSync(process.execPath, args, { cwd: HERE, stdio: 'inherit' });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  process.stdout.write(`--- ${label}: ${r.status === 0 ? 'PASS' : 'FAIL'} in ${seconds}s\n`);
  return r.status === 0;
}

const ok = [
  run('unit tier', ['--test', 'test-randomness.mjs', 'test-engine.mjs', 'test-defect-model.mjs',
    'test-metrics.mjs', 'test-parameters.mjs', 'test-presets.mjs', 'test-packaging.mjs']),
  run(`statistical validation${full ? ' (full)' : ' (short)'}`,
    ['validate-statistical.mjs', ...(full ? ['--full'] : [])]),
  /* Laid-out figure geometry: a label clipped by its viewBox, sitting on another label, or
     painted under a later filled rect. Needs a layout engine, so it is a browser check and skips
     itself when Puppeteer is absent. */
  run('figure geometry', ['../../_shared/check_figure_geometry.mjs', 'release-factory']),
].every(Boolean);

process.stdout.write(`\n${ok ? 'ALL TIERS PASS' : 'FAILURES ABOVE'}\n`);
process.exit(ok ? 0 : 1);
