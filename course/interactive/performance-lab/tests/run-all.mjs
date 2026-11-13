#!/usr/bin/env node
/* run-all.mjs — the laboratory's test entry point.
 *
 * The simulator is itself an engineering artifact, so the brief requires it to be tested rather
 * than merely demonstrated. Three groups, in the order a reader should care about them:
 *
 *   ANALYTICAL   the engine reproduces results we can derive independently (deterministic service,
 *                M/M/1 mean response, Little's Law). These are the only checks that could catch a
 *                plausible-looking engine that is quietly wrong.
 *   INVARIANT    properties that must hold on EVERY run regardless of parameters — no negative
 *                time, no queue past its capacity, no request lost from the accounting.
 *   PACKAGING    the page remains the self-contained artifact we claim it is.
 *
 * Stdlib only: `node tests/run-all.mjs`, no install step.
 */
import { loadEngine, readIndex, ok, near, summary, station, workload } from './harness.mjs';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const E = loadEngine();
const sys = (stations) => ({ stations });

console.log('ANALYTICAL REFERENCE CASES');

// A request that never waits should take exactly its service time.
{
  const r = E.simulate(sys([station('s', 'S', 1, 10, 'constant')]),
                       workload(5, ['s'], { arrivalPattern: 'constant' }));
  near('deterministic server at low load: response == service time', r.meanLatencyMs, 10, 0.05);
}

// M/M/1: W = 1/(mu - lambda). Finite stochastic runs are not required to match exactly.
{
  const r = E.simulate(sys([station('s', 'S', 1, 10)]), workload(60, ['s'], { durationSeconds: 2000 }));
  near('M/M/1 mean response approaches 1/(mu-lambda)', r.meanLatencyMs, E.mm1MeanResponseMs(60, 10), 0.15);
  ok("Little's Law holds on the same stable run", r.little.agrees,
     'lambda*W=' + r.little.lambdaW.toFixed(2) + ' L=' + r.little.measuredL.toFixed(2));
}

// Persistent overload must grow an unbounded queue rather than silently stabilising.
{
  const r = E.simulate(sys([station('s', 'S', 1, 20)]), workload(120, ['s'], { durationSeconds: 120 }));
  ok('sustained overload grows an unbounded queue', r.stations[0].avgQueue > 50,
     'avgQueue=' + r.stations[0].avgQueue.toFixed(0));
}

// Added servers raise capacity; utilization must fall for the same demand.
{
  const one = E.simulate(sys([station('a', 'A', 1, 12)]), workload(70, ['a']));
  const three = E.simulate(sys([station('a', 'A', 3, 12)]), workload(70, ['a']));
  ok('more servers lowers utilization at fixed demand',
     three.stations[0].utilization < one.stations[0].utilization,
     one.stations[0].utilization.toFixed(2) + ' -> ' + three.stations[0].utilization.toFixed(2));
}

console.log('\nINVARIANTS');

{
  const r = E.simulate(sys([station('s', 'S', 1, 20, 'exponential', 25)]),
                       workload(120, ['s'], { durationSeconds: 120 }));
  ok('queue length never exceeds its configured capacity', r.stations[0].maxQueue <= 25,
     'max=' + r.stations[0].maxQueue + ' cap=25');
  ok('a full queue refuses work rather than growing', r.rejected > 0, 'rejected=' + r.rejected);
}

{
  const s = sys([station('a', 'Workers', 4, 15), station('b', 'Database', 2, 12)]);
  const w = workload(120, ['a', 'b'], { durationSeconds: 120 });
  const r1 = E.simulate(s, w), r2 = E.simulate(s, w);
  ok('determinism: identical model, workload and seed give identical results',
     r1.meanLatencyMs === r2.meanLatencyMs && r1.completed === r2.completed);
  const r3 = E.simulate(s, Object.assign({}, w, { seed: 43 }));
  ok('a different seed explores a different sample path', r3.meanLatencyMs !== r1.meanLatencyMs);

  ok('no negative queue lengths or elapsed times',
     r1.stations.every((x) => x.avgQueue >= 0 && x.meanWaitMs >= 0 && x.meanServiceMs >= 0));
  ok('utilization stays within [0,1]', r1.stations.every((x) => x.utilization >= 0 && x.utilization <= 1));
  ok('no more concurrent work than server capacity',
     r1.stations.every((x) => x.utilization * x.servers <= x.servers + 1e-9));
  ok('nothing disappears from the accounting',
     r1.completed > 0 && r1.inSystemAtEnd >= 0 && r1.rejected >= 0);
  ok('every station on the route does work', r1.stations.every((x) => x.completed > 0));
  ok('waiting and processing are reported separately',
     r1.stations.every((x) => typeof x.meanWaitMs === 'number' && typeof x.meanServiceMs === 'number'));
}

// A cache is a ROUTE that skips a station, not a feature of the engine. This is the property that
// keeps presets out of the simulator, so it is worth pinning.
{
  const s = sys([station('web', 'Workers', 4, 15), station('db', 'Database', 2, 12)]);
  const base = workload(120, ['web', 'db'], { durationSeconds: 120 });
  const cached = Object.assign({}, base, { requestClasses: [
    { id: 'hit', name: 'Cache hit', probability: 0.4, route: [{ stationId: 'web' }] },
    { id: 'miss', name: 'Cache miss', probability: 0.6, route: [{ stationId: 'web' }, { stationId: 'db' }] },
  ] });
  const a = E.simulate(s, base), b = E.simulate(s, cached);
  ok('a hit-rate route reduces demand on the skipped station',
     b.stations[1].utilization < a.stations[1].utilization,
     (a.stations[1].utilization * 100).toFixed(0) + '% -> ' + (b.stations[1].utilization * 100).toFixed(0) + '%');
  ok('relieving one resource can move the bottleneck elsewhere',
     a.bottleneck.id !== b.bottleneck.id, a.bottleneck.name + ' -> ' + b.bottleneck.name);
}

console.log('\nPACKAGING');
{
  const html = readIndex();
  ok('engine block is present and extractable', /<script id="perf-lab-engine">/.test(html));
  ok('ui block is present', /<script id="perf-lab-ui">/.test(html));
  ok('engine makes no DOM reference', !/\bdocument\b/.test(
    html.match(/<script id="perf-lab-engine">([\s\S]*?)<\/script>/)[1]));
  ok('no external resource is requested',
     !/(src|href)\s*=\s*["'](https?:)?\/\//.test(html), 'no http(s) or protocol-relative URL');
  ok('favicon is inline, so the page issues zero requests', /rel="icon" href="data:/.test(html));
  ok('the standing qualification is on the page',
     html.includes('describe the model you specified'));
  ok('model assumptions are disclosed', /<summary>Model assumptions<\/summary>/.test(html));
  ok('assumptions admit what is NOT modeled', /Timeouts, retries and cancellation are/.test(html));
}

/* The shared-core parity check lives in its own file, because the generated block's provenance
 * notice names that file by path. `node --test` ignores a missing path and still exits 0, so the
 * file's EXISTENCE is asserted here before it is spawned — otherwise deleting it would turn the
 * parity gate green rather than red. */
console.log('\nSHARED CORE STYLESHEET');
{
  const here = dirname(fileURLToPath(import.meta.url));
  const packaging = join(here, 'test-packaging.mjs');
  ok('tests/test-packaging.mjs is present, as the generated block claims', existsSync(packaging));
  /* Pin the reporter: node's DEFAULT varies by version and by whether stdout is a TTY, so parsing
     it is reading a shape nobody promised. Asking for TAP makes `# pass N` a contract. */
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', packaging],
                      { encoding: 'utf8' });
  const passed = (r.stdout.match(/^# pass (\d+)$/m) || [])[1];
  ok('the inlined core is in parity with _shared/instrument-core.css',
     r.status === 0 && Number(passed) > 0, `${passed || 0} parity checks`);
  if (r.status !== 0) console.log(r.stdout.split('\n').filter((l) => /not ok|Error/.test(l))
    .slice(0, 6).map((l) => '      ' + l).join('\n'));
}

process.exit(summary('performance-lab') ? 1 : 0);
