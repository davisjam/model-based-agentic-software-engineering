/* test-sweep.mjs — the sweep state machine, including the termination path.
 *
 * The sweep is pure on purpose. A run that overruns its wall-clock budget must be terminated and
 * the next run must be served by a fresh worker, and the specification asks for a test that the UI
 * RECOVERS. Half of that is a browser question — does destroying a worker really free the page, and
 * does a new one serve the next run — and lives in browser_test.py. The other half is a question
 * about state: after a termination, is the sweep in a state from which the next run can proceed,
 * and is the terminated trial reported rather than silently dropped? That half is answered here,
 * on every machine, with no browser.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { R, fakeResult, cfg } from './harness.mjs';

/* --- construction --------------------------------------------------------------------------- */

test('a new sweep is ready, empty, and carries the ladder it will walk', () => {
  const s = R.createSweep({ experimentId: 'quadratic', maxLength: 4000 });
  assert.equal(s.status, 'ready');
  assert.equal(s.experimentId, cfg('quadratic'));
  assert.deepEqual(s.lengths, [500, 1000, 2000, 3000, 4000]);
  assert.deepEqual(s.results, []);
  assert.equal(s.halt, null);
  assert.equal(s.index, 0);
});

test('a sweep takes the documented budget and deadline unless told otherwise', () => {
  const s = R.createSweep({ experimentId: 'quadratic' });
  assert.equal(s.budgetMs, R.BUDGET_MS);
  assert.equal(s.deadlineMs, R.DEADLINE_MS);
  const t = R.createSweep({ experimentId: 'quadratic', budgetMs: 10, deadlineMs: 40 });
  assert.equal(t.budgetMs, 10);
  assert.equal(t.deadlineMs, 40);
});

test('every declared status is reachable and no other is used', () => {
  assert.deepEqual(R.SWEEP_STATES, ['ready', 'running', 'complete', 'halted']);
});

/* --- the ordinary path ---------------------------------------------------------------------- */

test('a sweep issues one trial spec per ladder length, in order', () => {
  const s = R.createSweep({ experimentId: 'quadratic', maxLength: 2000 });
  const issued = [];
  for (;;) {
    const spec = R.nextTrialSpec(s);
    if (!spec) break;
    issued.push(spec.length);
    assert.equal(spec.experimentId, cfg('quadratic'));
    assert.equal(spec.budgetMs, s.budgetMs);
    R.recordResult(s, fakeResult('quadratic', spec.length, false));
  }
  assert.deepEqual(issued, [500, 1000, 2000]);
  assert.equal(s.status, 'complete');
  assert.equal(s.halt, null);
});

test('issuing a trial moves the sweep to running', () => {
  const s = R.createSweep({ experimentId: 'ordinary', maxLength: 1000 });
  R.nextTrialSpec(s);
  assert.equal(s.status, 'running');
});

test('a completed sweep issues no further trials', () => {
  const s = R.createSweep({ experimentId: 'quadratic', maxLength: 1000 });
  for (let i = 0; i < 2; i += 1) {
    const spec = R.nextTrialSpec(s);
    R.recordResult(s, fakeResult('quadratic', spec.length, false));
  }
  assert.equal(s.status, 'complete');
  assert.equal(R.nextTrialSpec(s), null);
});

/* --- the budget-overrun path ---------------------------------------------------------------- */

test('a sweep halts at the first budget overrun and names the length', () => {
  const s = R.createSweep({ experimentId: 'quadratic', maxLength: 4000 });
  const first = R.nextTrialSpec(s);
  R.recordResult(s, fakeResult('quadratic', first.length, false));
  const second = R.nextTrialSpec(s);
  R.recordResult(s, fakeResult('quadratic', second.length, true));

  assert.equal(s.status, 'halted');
  assert.equal(s.halt.reason, 'budget');
  assert.equal(s.halt.length, second.length);
  assert.equal(s.halt.budgetMs, R.BUDGET_MS);
  assert.equal(R.nextTrialSpec(s), null, 'the sweep continued past its halt');
  assert.equal(s.results.length, 2, 'the overrunning trial was not kept');
});

test('the overrunning trial still contributes its measurement', () => {
  /* It overran, but it DID measure something, and that number is the most interesting point on the
     chart — it is where the budget bites. Dropping it would hide the cliff. */
  const s = R.createSweep({ experimentId: 'quadratic', maxLength: 1000 });
  const spec = R.nextTrialSpec(s);
  R.recordResult(s, fakeResult('quadratic', spec.length, true));
  const sum = R.sweepSummary(s);
  assert.equal(sum.points.length, 1);
  assert.equal(sum.points[0].length, spec.length);
});

/* --- the termination path ------------------------------------------------------------------- */

test('a terminated trial is recorded as terminated, not dropped and not measured', () => {
  const s = R.createSweep({ experimentId: 'exponential', maxLength: 30 });
  const spec = R.nextTrialSpec(s);
  R.recordTermination(s, { length: spec.length, elapsedMs: 412 });

  assert.equal(s.status, 'halted');
  assert.equal(s.halt.reason, 'terminated');
  assert.equal(s.halt.length, spec.length);
  assert.equal(s.halt.ms, 412);
  assert.equal(s.halt.deadlineMs, R.DEADLINE_MS);

  assert.equal(s.results.length, 1, 'the terminated trial was dropped');
  const r = s.results[0];
  assert.equal(r.terminated, true);
  assert.equal(r.msPerExecution, null, 'a terminated trial reported a per-execution time');
  assert.equal(r.budgetExceeded, true);
  assert.equal(r.matched, null, 'a terminated trial claimed a match verdict it never obtained');
});

test('a terminated trial contributes no data point, and the chart is told why', () => {
  const s = R.createSweep({ experimentId: 'exponential', maxLength: 30 });
  const spec = R.nextTrialSpec(s);
  R.recordTermination(s, { length: spec.length, elapsedMs: 400 });
  const sum = R.sweepSummary(s);
  assert.equal(sum.points.length, 0, 'a terminated trial became a data point');
  assert.equal(sum.trials, 1, 'the terminated trial vanished from the trial count');
  assert.equal(sum.measuredTrials, 0);
  assert.equal(sum.halt.reason, 'terminated');
});

test('termination defaults to the trial in flight and the sweep deadline', () => {
  const s = R.createSweep({ experimentId: 'quadratic', maxLength: 2000 });
  const spec = R.nextTrialSpec(s);
  R.recordTermination(s, {});
  assert.equal(s.halt.length, spec.length);
  assert.equal(s.halt.ms, s.deadlineMs);
});

test('after a termination the sweep is in a state the next run can replace', () => {
  /* This is the state half of "the UI recovers". The sweep is halted and inert: it issues no more
     trials, so the page's next Run constructs a NEW sweep rather than resuming a sweep whose
     worker no longer exists. A halted sweep that still issued trials would send them to a
     destroyed worker and hang the panel forever. */
  const s = R.createSweep({ experimentId: 'exponential', maxLength: 30 });
  R.recordTermination(s, { length: R.nextTrialSpec(s).length, elapsedMs: 400 });
  assert.equal(R.nextTrialSpec(s), null);

  const fresh = R.createSweep({ experimentId: 'exponential', maxLength: 30 });
  assert.equal(fresh.status, 'ready');
  assert.equal(fresh.results.length, 0);
  assert.ok(R.nextTrialSpec(fresh) !== null, 'a fresh sweep could not start');
});

/* --- the stale-message path ----------------------------------------------------------------- */

test('a result arriving after a termination is rejected as stale', () => {
  /* The page destroys a worker, and the worker's final message may still be in the queue. A result
     for a trial the sweep has already given up on must not be mistaken for evidence the trial
     finished — that would put a measurement on the chart for a run that was killed. */
  const s = R.createSweep({ experimentId: 'quadratic', maxLength: 2000 });
  const spec = R.nextTrialSpec(s);
  R.recordTermination(s, { length: spec.length, elapsedMs: 400 });
  const verdict = R.recordResult(s, fakeResult('quadratic', spec.length, false));
  assert.equal(verdict, 'stale');
  assert.equal(s.results.length, 1, 'the stale result was appended anyway');
  assert.equal(s.results[0].terminated, true);
});

test('a result for the wrong length or the wrong experiment is rejected as stale', () => {
  const s = R.createSweep({ experimentId: 'quadratic', maxLength: 4000 });
  const spec = R.nextTrialSpec(s);
  assert.equal(R.recordResult(s, fakeResult('quadratic', spec.length + 1, false)), 'stale');
  assert.equal(R.recordResult(s, fakeResult('exponential', spec.length, false)), 'stale');
  assert.equal(R.recordResult(s, null), 'stale');
  assert.equal(s.results.length, 0, 'a stale result was recorded');
  /* …and the matching result is still accepted afterwards, so a stale message does not wedge it. */
  assert.equal(R.recordResult(s, fakeResult('quadratic', spec.length, false)), 'accepted');
});

test('a result arriving after completion is rejected as stale', () => {
  const s = R.createSweep({ experimentId: 'quadratic', maxLength: 1000 });
  for (let i = 0; i < 2; i += 1) {
    R.recordResult(s, fakeResult('quadratic', R.nextTrialSpec(s).length, false));
  }
  assert.equal(s.status, 'complete');
  assert.equal(R.recordResult(s, fakeResult('quadratic', 500, false)), 'stale');
});

/* --- the summary ---------------------------------------------------------------------------- */

test('the summary reports progress, remaining work, and correctness failures', () => {
  const s = R.createSweep({ experimentId: 'quadratic', maxLength: 4000 });
  R.recordResult(s, fakeResult('quadratic', R.nextTrialSpec(s).length, false));
  const sum = R.sweepSummary(s);
  assert.equal(sum.experimentId, cfg('quadratic'));
  assert.equal(sum.status, 'running');
  assert.equal(sum.trials, 1);
  assert.equal(sum.measuredTrials, 1);
  assert.equal(sum.remaining, 4);
  assert.equal(sum.correctnessFailures, 0);
  assert.equal(sum.maxMeasuredLength, 500);
});

test('an unexpected match verdict is surfaced as a correctness failure', () => {
  /* A trial whose match result is not the documented one means the input generator and the
     expression have drifted apart. The timing from such a trial describes something other than
     what the page claims, so it must not pass quietly. */
  const s = R.createSweep({ experimentId: 'quadratic', maxLength: 1000 });
  const spec = R.nextTrialSpec(s);
  R.recordResult(s, fakeResult('quadratic', spec.length, false,
    { matched: true, matchedAsExpected: false }));
  assert.equal(R.sweepSummary(s).correctnessFailures, 1);
});

test('a summary of a sweep that measured nothing reports no fit and no maximum', () => {
  const s = R.createSweep({ experimentId: 'quadratic', maxLength: 1000 });
  const sum = R.sweepSummary(s);
  assert.equal(sum.points.length, 0);
  assert.equal(sum.maxMeasuredLength, null);
  assert.equal(sum.scaling.basis, null);
});
