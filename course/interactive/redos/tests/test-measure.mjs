/* test-measure.mjs — trial measurement: bounded execution and correct reporting.
 *
 * What this file deliberately does NOT assert, because the specification is explicit about it:
 *
 *     avoid hard-coding an expected timing ratio. JavaScript engines differ, and JIT compilation,
 *     warm-up, and regex optimizations affect observed behavior.
 *
 * So there is no assertion here that the quadratic experiment is N times slower than the linear
 * one. Such a test would fail on a browser doing nothing wrong, and passing it would tell us
 * nothing we did not already believe. What IS asserted: the trial ran, it stayed inside the bound
 * it was given, and it reported what it measured — including the fact that it ran out of budget.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { R, now, fakeClock } from './harness.mjs';

/* --- the clock is the caller's ------------------------------------------------------------- */

test('measurement refuses to run without a clock', () => {
  /* The engine owns no clock by construction — that is what lets the same bytes run in a worker
     and be asserted in Node. A missing clock must fail loudly rather than default to one. */
  assert.throws(() => R.measureTrial({ experimentId: 'ordinary', length: 500 }), /needs a clock/);
  assert.throws(() => R.warmUp('ordinary'), /needs a clock/);
  assert.throws(() => R.measureTrial({ experimentId: 'ordinary', length: 500 }, 'tick'),
    /needs a clock/);
});

test('measurement refuses a missing or malformed spec', () => {
  assert.throws(() => R.measureTrial(null, now), /needs a spec/);
  assert.throws(() => R.measureTrial({ experimentId: 'nope', length: 10 }, now), /unknown experiment/);
  assert.throws(() => R.measureTrial({ experimentId: 'ordinary', length: 0 }, now), /positive integer/);
});

/* --- reporting ------------------------------------------------------------------------------ */

test('a trial reports the experiment, the length, and the input it actually built', () => {
  const r = R.measureTrial({ experimentId: 'quadratic', length: 500, budgetMs: 100 }, now);
  assert.equal(r.experimentId, 'quadratic');
  assert.equal(r.expressionId, 'trimLike');
  assert.equal(r.length, 500);
  assert.equal(r.inputLength, 501, 'the reported input length is not the built input length');
  assert.equal(r.terminated, false);
});

test('a trial reports the match verdict and whether it was the expected one', () => {
  const r = R.measureTrial({ experimentId: 'exponential', length: 12, budgetMs: 100 }, now);
  assert.equal(r.matched, false);
  assert.equal(r.expectedMatch, false);
  assert.equal(r.matchedAsExpected, true);
});

test('a trial reports a finite per-execution time and the repeat count behind it', () => {
  const r = R.measureTrial({ experimentId: 'ordinary', length: 1000, budgetMs: 100 }, now);
  assert.ok(r.repeats >= 1, 'no execution was recorded');
  assert.ok(Number.isFinite(r.msPerExecution), `msPerExecution is ${r.msPerExecution}`);
  assert.ok(r.msPerExecution >= 0);
  assert.ok(Number.isFinite(r.totalMs));
  /* The per-execution figure must be derived from the sample, not invented. */
  assert.ok(Math.abs(r.msPerExecution * r.repeats - r.totalMs) < 1e-9);
});

test('a cheap execution is repeated until the sample is measurable', () => {
  /* Below the sample floor a single execution is mostly clock granularity. Reporting that as the
     cost of the match would make the two linear experiments look like noise rather than like
     straight lines, which is the one thing the chart has to show. */
  const r = R.measureTrial(
    { experimentId: 'ordinary', length: 500, minSampleMs: 5, budgetMs: 200 }, now);
  assert.ok(r.repeats > 1, 'a sub-millisecond execution was reported from a single run');
  assert.ok(r.totalMs >= 5 || r.repeats >= R.MAX_REPEATS,
    `stopped at ${r.totalMs.toFixed(2)} ms after ${r.repeats} repeats`);
});

/* --- bounded execution ---------------------------------------------------------------------- */

test('the repeat loop is bounded by the budget', () => {
  /* maxRepeats is lifted out of the way so the BUDGET is the bound under test. With the default cap
     a cheap execution hits the cap long before 30 ms, which is correct behaviour and a different
     assertion — see the repeat-cap test below. */
  const r = R.measureTrial(
    { experimentId: 'ordinary', length: 500, minSampleMs: 1e9, budgetMs: 30, maxRepeats: 1e9 },
    now);
  assert.equal(r.budgetExceeded, true, 'an exhausted budget was not reported');
  /* One execution of overshoot is unavoidable: the budget is checked BETWEEN executions, which is
     the whole reason the page also enforces a deadline it can act on. */
  assert.ok(r.totalMs < 30 + 50, `overran its 30 ms budget to ${r.totalMs.toFixed(1)} ms`);
});

test('the repeat loop is bounded by the repeat cap', () => {
  const r = R.measureTrial(
    { experimentId: 'ordinary', length: 500, minSampleMs: 100000, budgetMs: 100000, maxRepeats: 7 },
    now);
  assert.equal(r.repeats, 7);
  assert.equal(r.budgetExceeded, false);
});

test('a zero budget still performs exactly one execution', () => {
  /* Not zero executions: a trial that measured nothing is not a measurement, and the chart must
     not acquire a point that no match produced. */
  const r = R.measureTrial({ experimentId: 'exponential', length: 12, budgetMs: 0 }, now);
  assert.equal(r.repeats, 1);
  assert.equal(r.budgetExceeded, true);
  assert.equal(r.matchedAsExpected, true, 'the single execution did not produce a verdict');
});

test('budget arithmetic is read off the supplied clock, not a real one', () => {
  /* With a fake clock advancing 10 ms per reading, a 25 ms budget must stop the loop after the
     third reading. This asserts the LOGIC of the bound without depending on machine speed. */
  const clock = fakeClock(10);
  const r = R.measureTrial(
    { experimentId: 'ordinary', length: 500, minSampleMs: 1e9, budgetMs: 25, maxRepeats: 1e9 },
    clock);
  assert.equal(r.budgetExceeded, true);
  assert.equal(r.repeats, 3, `stopped after ${r.repeats} executions`);
  assert.equal(r.totalMs, 30);
});

test('the default budget is the documented 250 ms and the deadline is strictly larger', () => {
  assert.equal(R.BUDGET_MS, 250, 'the experiment budget moved');
  assert.ok(R.DEADLINE_MS > R.BUDGET_MS,
    'the page deadline must exceed the engine budget, or the engine can never report an overrun');
  const r = R.measureTrial({ experimentId: 'ordinary', length: 500, minSampleMs: 0 }, now);
  assert.equal(r.budgetMs, 250, 'a trial without an explicit budget did not take the default');
});

/* --- the expensive cases, run for real and held inside their bound -------------------------- */

test('the exponential experiment stays inside its budget at the foot of its ladder', () => {
  const n = R.lengthBounds('exponential').min;
  const r = R.measureTrial({ experimentId: 'exponential', length: n, budgetMs: 250 }, now);
  assert.ok(r.totalMs <= 250 + 100, `${r.totalMs.toFixed(1)} ms at n=${n}`);
  assert.equal(r.matchedAsExpected, true);
});

test('the quadratic experiment reports an overrun rather than running away', () => {
  /* Run the pathological expression at the top of its ladder with a deliberately small budget.
     The assertion is not about how long it took — it is that whatever happened was REPORTED and
     the function returned. A single execution may exceed the budget; it may not hide that. */
  const n = R.lengthBounds('quadratic').max;
  const r = R.measureTrial({ experimentId: 'quadratic', length: n, budgetMs: 20 }, now);
  assert.equal(r.budgetExceeded, true, 'the overrun was not reported');
  assert.equal(r.repeats, 1, 'a trial over budget kept repeating');
  assert.ok(Number.isFinite(r.totalMs) && r.totalMs > 0);
});

/* --- warm-up -------------------------------------------------------------------------------- */

test('warm-up runs at the ladder floor and is itself bounded', () => {
  for (const id of R.experimentIds()) {
    const w = R.warmUp(id, now, { ms: 10, repeats: 50 });
    assert.equal(w.experimentId, id);
    assert.ok(w.repeats >= 1, `${id}: warm-up performed no execution`);
    assert.ok(w.repeats <= 50, `${id}: warm-up exceeded its repeat cap`);
    assert.ok(w.ms < 10 + 200, `${id}: warm-up took ${w.ms.toFixed(1)} ms`);
    assert.equal(w.matched, false, `${id}: warm-up input matched`);
  }
});

test('warm-up with a zero budget performs no more than one execution', () => {
  const w = R.warmUp('exponential', fakeClock(5), { ms: 0, repeats: 100 });
  assert.equal(w.repeats, 0, 'a zero-millisecond warm-up still ran a match');
});
