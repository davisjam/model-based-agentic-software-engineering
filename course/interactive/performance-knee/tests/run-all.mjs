#!/usr/bin/env node
/* run-all.mjs — the simulator's test entry point.
 *
 *   node course/interactive/performance-knee/tests/run-all.mjs
 *       unit tier + a short statistical tier.           (~20 s)
 *
 *   node course/interactive/performance-knee/tests/run-all.mjs --full
 *       unit tier + the full statistical validation.    (~3 min, tens of millions of events)
 *
 *   node --test "course/interactive/performance-knee/tests/test-*.mjs"
 *       unit tier alone, through Node's own runner.     (~1 s)
 *
 *   python3 course/interactive/performance-knee/tests/browser_test.py --serve
 *       browser tier: Chromium and Firefox, from file:// and over HTTP.  (~40 s)
 *       Separate because it needs a browser; it exits 2 when none is available, so a browser-less
 *       runner reports "skipped" rather than red.
 *
 * Stdlib only: `node:test` and `node:assert`. The published page gains no dependency from any of
 * this, and the tests load the engine out of index.html rather than keeping a copy (see harness.mjs).
 *
 * Deliberately NOT wired into the repository's pre-push hook or `catalog_tests.py`. The placement
 * rule in CLAUDE.md sends a check to exactly one station, and adding a station is a change to the
 * shared gate wiring that three concurrent agents also hold. Run it from here; promoting the unit
 * tier to pre-push (it is cheap, deterministic, and scoped) is a clean follow-up.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
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
  run('unit tier', ['--test', 'test-randomness.mjs', 'test-models.mjs', 'test-engine.mjs',
    'test-statistics.mjs', 'test-parameters.mjs', 'test-packaging.mjs']),
  run(`statistical validation${full ? ' (full)' : ' (short)'}`,
    ['validate-statistical.mjs', ...(full ? ['--full'] : [])]),
].every(Boolean);

process.stdout.write(`\n${ok ? 'ALL TIERS PASS' : 'FAILURES ABOVE'}\n`);
process.exit(ok ? 0 : 1);
