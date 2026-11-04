/* test-randomness.mjs — the seeded generator and the sampling it feeds.
 *
 * Reproducibility is the property the whole exercise rests on: a student who cannot replay a run
 * cannot compare two runs, and an instructor who cannot replay a run cannot answer "what did you
 * do differently?". So these tests pin the generator itself, not merely the simulations built on it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Q, extractEngineSource } from './harness.mjs';

test('Math.random is not reachable from the engine', () => {
  /* Structural, not behavioural. One stray Math.random call leaves the simulator irreproducible
     while every aggregate result still looks plausible, so no amount of outcome testing would
     catch it. Grep the shipped engine source instead. */
  const source = extractEngineSource();
  assert.equal(/Math\s*\.\s*random/.test(source), false,
    'the engine source contains a Math.random reference');
});

test('same seed replays the same sequence', () => {
  const a = Q.createRng(30861);
  const b = Q.createRng(30861);
  for (let i = 0; i < 10000; i += 1) {
    assert.equal(a(), b(), `diverged at draw ${i}`);
  }
});

test('different seeds produce different sequences', () => {
  const seeds = [0, 1, 2, 30861, 4294967295];
  const firsts = seeds.map((s) => Q.createRng(s)());
  assert.equal(new Set(firsts).size, seeds.length, 'two seeds opened with the same draw');
  /* And they stay apart: compare 2000 draws pairwise for the two nearest seeds. */
  const a = Q.createRng(1);
  const b = Q.createRng(2);
  let coincidences = 0;
  for (let i = 0; i < 2000; i += 1) if (a() === b()) coincidences += 1;
  assert.equal(coincidences, 0);
});

test('draws lie in [0,1) and cover the unit interval', () => {
  const rng = Q.createRng(7);
  const buckets = new Array(10).fill(0);
  for (let i = 0; i < 200000; i += 1) {
    const u = rng();
    assert.ok(u >= 0 && u < 1, `draw out of range: ${u}`);
    buckets[Math.floor(u * 10)] += 1;
  }
  /* A crude uniformity sanity check: every decile within 10% of 20000. Not a statistical test of
     the generator — just enough to catch a broken mixing step. */
  for (const count of buckets) {
    assert.ok(Math.abs(count - 20000) < 2000, `decile count ${count} far from 20000`);
  }
});

test('exponential samples are strictly positive and finite', () => {
  const rng = Q.createRng(11);
  let min = Infinity;
  let max = 0;
  for (let i = 0; i < 500000; i += 1) {
    const s = Q.exponential(rng, 100);
    assert.ok(s > 0, `non-positive sample ${s}`);
    assert.ok(Number.isFinite(s), `non-finite sample ${s}`);
    if (s < min) min = s;
    if (s > max) max = s;
  }
  assert.ok(min > 0);
  assert.ok(max < 1, `implausibly large sample ${max} for rate 100`);
});

test('exponential sample mean approaches 1/rate', () => {
  const rng = Q.createRng(30861);
  let sum = 0;
  const n = 1000000;
  for (let i = 0; i < n; i += 1) sum += Q.exponential(rng, 100);
  const mean = sum / n;
  /* Standard error of the mean of Exp(100) over 1e6 draws is (1/100)/sqrt(1e6) = 1e-5.
     A 5-sigma band is 5e-5 around 0.01. */
  assert.ok(Math.abs(mean - 0.01) < 5e-5, `mean ${mean} outside 5 standard errors of 0.01`);
});

test('exponential rejects a non-positive or non-finite rate', () => {
  const rng = Q.createRng(1);
  for (const bad of [0, -1, NaN, Infinity, -Infinity, '100', null, undefined]) {
    assert.throws(() => Q.exponential(rng, bad), RangeError, `accepted rate ${String(bad)}`);
  }
});

test('zero arrival rate produces no arrivals, ever', () => {
  const sim = Q.createSimulation({ arrivalRate: 0, serviceRate: 100, seed: 30861 });
  assert.equal(sim.nextArrivalTime, null, 'an arrival was scheduled at rate 0');
  const result = Q.advanceSimulation(sim, { untilTime: 10000 });
  assert.equal(result.events, 0);
  assert.equal(sim.counters.arrivals, 0);
  assert.equal(sim.counters.completions, 0);
  /* The clock still advances, so utilization is a well-defined zero rather than undefined. */
  assert.equal(sim.time, 10000);
  assert.equal(Q.snapshot(sim).utilization, 0);
});

test('the two random streams are independent of one another', () => {
  /* Changing the service rate must not perturb the arrival sequence. If arrivals and service
     shared a stream, the interarrival times after the first service draw would differ, and every
     capacity experiment would silently become a fresh draw instead of a controlled comparison. */
  function arrivalTimes(serviceRate) {
    const sim = Q.createSimulation({ arrivalRate: 90, serviceRate, seed: 30861, completionLogLimit: 0 });
    const times = [];
    let guard = 0;
    while (times.length < 300 && guard < 100000) {
      const ev = Q.stepSimulation(sim);
      guard += 1;
      if (ev && ev.kind === 'arrival') times.push(ev.time);
    }
    return times;
  }
  assert.deepEqual(arrivalTimes(100), arrivalTimes(140));
});

test('deterministic service consumes no random draw', () => {
  /* Which is why switching the distribution mid-run cannot shift the arrival trace either. */
  const a = Q.createSimulation({ arrivalRate: 90, serviceRate: 100, seed: 5, serviceDistribution: 'deterministic' });
  Q.advanceSimulation(a, { untilTime: 50 });
  assert.equal(a.rngService.state(), Q.createRng((5 + 0x9E3779B9) >>> 0).state(),
    'the service stream advanced under a deterministic distribution');
});
