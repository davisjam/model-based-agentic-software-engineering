#!/usr/bin/env node
/* run-all.mjs — the demonstration's test entry point.
 *
 *   node course/interactive/redos/tests/run-all.mjs
 *       the unit tier.                                            (~2 s)
 *
 *   node --test "course/interactive/redos/tests/test-*.mjs"
 *       the same tier, through Node's own runner.
 *
 *   python3 course/interactive/redos/tests/browser_test.py --serve
 *       browser tier: Chromium and Firefox, from file:// and over HTTP.
 *       Separate because it needs a browser; it exits 2 when none is available, so a browser-less
 *       runner reports "skipped" rather than red.
 *
 * Stdlib only: `node:test` and `node:assert`. The published page gains no dependency from any of
 * this, and the tests load the engine out of index.html rather than keeping a copy (see
 * harness.mjs).
 *
 * Deliberately NOT wired into the repository's pre-push hook or `catalog_tests.py`. The placement
 * rule in CLAUDE.md sends a check to exactly one station, and adding a station is a change to the
 * shared gate wiring that several concurrent agents also hold. Run it from here; promoting the unit
 * tier to pre-push (it is cheap, deterministic, and scoped) is a clean follow-up.
 */
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function run(label, args) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const started = Date.now();
  const r = spawnSync(process.execPath, args, { cwd: HERE, stdio: 'inherit' });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  process.stdout.write(`--- ${label}: ${r.status === 0 ? 'PASS' : 'FAIL'} in ${seconds}s\n`);
  return r.status === 0;
}

const ok = [
  run('unit tier', ['--test', 'test-patterns.mjs', 'test-measure.mjs', 'test-sweep.mjs',
    'test-model.mjs', 'test-threat.mjs', 'test-worker-protocol.mjs', 'test-packaging.mjs']),
  /* Laid-out figure geometry: a label clipped by its viewBox, sitting on another label, or
     painted under a later filled rect. Needs a layout engine, so it is a browser check and skips
     itself when Puppeteer is absent. */
  run('figure geometry', ['../../_shared/check_figure_geometry.mjs', 'redos']),
].every(Boolean);

process.stdout.write(`\n${ok ? 'ALL TIERS PASS' : 'FAILURES ABOVE'}\n`);
process.stdout.write('(the browser tier is separate: python3 browser_test.py --serve)\n');
process.exit(ok ? 0 : 1);
