#!/usr/bin/env node
/* run-all.mjs — the exercise's test entry point.
 *
 *   node course/interactive/architecture-workbench/tests/run-all.mjs
 *       the unit tier.                                            (~1 s)
 *
 *   node --test "course/interactive/architecture-workbench/tests/test-*.mjs"
 *       the same tier, through Node's own runner.
 *
 * Stdlib only: `node:test` and `node:assert`. There is no browser tier, and that is a decision
 * rather than an omission — this instrument runs no simulation loop, draws no canvas and measures
 * no elapsed time, so everything it computes is closed-form arithmetic over a six-node graph. The
 * harness extracts the shipped engine out of index.html and exercises it directly, and
 * test-packaging.mjs asserts the self-containment and accessibility contracts on the shipped bytes.
 * A headless browser would add minutes and a dependency to re-check what the markup already states.
 * The rendered pages were inspected by hand at 1920×1080, 1440×900 and 390×844, which is the check
 * a browser tier could not have replaced.
 *
 * Deliberately NOT wired into the repository's pre-push hook or `catalog_tests.py`. The placement
 * rule in CLAUDE.md sends a check to exactly one station, and adding a station is a change to the
 * shared gate wiring that several concurrent agents also hold. This tier runs as a matrix leg of the
 * `interactive-exercises` job in the publishing workflow, which is where its siblings run.
 */
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const UNIT_FILES = ['test-graph.mjs', 'test-rules.mjs', 'test-impact.mjs', 'test-cost.mjs',
  'test-packaging.mjs'];

function run(label, args) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const started = Date.now();
  const r = spawnSync(process.execPath, args, { cwd: HERE, stdio: 'inherit' });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  process.stdout.write(`--- ${label}: ${r.status === 0 ? 'PASS' : 'FAIL'} in ${seconds}s\n`);
  return r.status === 0;
}

const ok = run('unit tier', ['--test', ...UNIT_FILES]);

process.stdout.write(`\n${ok ? 'ALL TIERS PASS' : 'FAILURES ABOVE'}\n`);
process.exit(ok ? 0 : 1);
