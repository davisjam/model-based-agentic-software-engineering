/* test-statistics.mjs — the measurements, which is where a naive simulator goes wrong.
 *
 * Three failure modes are pinned here specifically:
 *   1. sampling occupancy at render time instead of integrating it over simulated time,
 *   2. estimating utilization from how often the server LOOKS busy, and
 *   3. presenting a measurement-window artefact as a violation of Little's Law.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Q } from './harness.mjs';

const close = (actual, expected, tol, what) => assert.ok(
  Math.abs(actual - expected) <= tol,
  `${what}: got ${actual}, expected ${expected} (tolerance ${tol})`,
);

test('occupancy is time-weighted, computed against an independent integral', () => {
  /* Re-integrate the occupancy from the event trace, with a completely separate accumulator, and
     require agreement. A frame-sampled average would not survive this. */
  const sim = Q.createSimulation({ arrivalRate: 90, serviceRate: 100, seed: 30861, completionLogLimit: 0 });
  let area = 0;
  let areaQ = 0;
  let busy = 0;
  let clock = 0;
  for (let i = 0; i < 100000; i += 1) {
    const n = Q.numberInSystem(sim);
    const nq = Q.queueLength(sim);
    const serverBusy = sim.inService !== null ? 1 : 0;
    const ev = Q.stepSimulation(sim);
    const dt = ev.time - clock;
    area += n * dt;
    areaQ += nq * dt;
    busy += serverBusy * dt;
    clock = ev.time;
  }
  const s = Q.snapshot(sim);
  close(s.timeAverageNumberInSystem, area / clock, 1e-9, 'time-average N');
  close(s.timeAverageQueueLength, areaQ / clock, 1e-9, 'time-average Nq');
  close(s.utilization, busy / clock, 1e-12, 'utilization');
});

test('utilization is busy time over observation time, bounded by [0,1]', () => {
  for (const lambda of [0, 10, 50, 90, 100, 150]) {
    const sim = Q.createSimulation({ arrivalRate: lambda, serviceRate: 100, seed: 30861, completionLogLimit: 0 });
    Q.advanceSimulation(sim, { untilTime: 400 });
    const s = Q.snapshot(sim);
    assert.ok(s.utilization >= 0 && s.utilization <= 1,
      `utilization ${s.utilization} out of range at lambda=${lambda}`);
    if (lambda >= 100) {
      assert.ok(s.utilization > 0.99, `saturated server only ${s.utilization} busy at lambda=${lambda}`);
    }
  }
});

test('the number of draws the renderer makes cannot change a statistic', () => {
  /* The renderer's only contact with the model is advance(horizon) plus snapshot(). Chunk the
     horizon a thousand different ways and the statistics must agree to floating-point noise: they
     are integrals over intervals, and splitting an interval does not change its integral. */
  function stats(steps) {
    const sim = Q.createSimulation({ arrivalRate: 90, serviceRate: 100, seed: 30861, completionLogLimit: 0 });
    for (let k = 1; k <= steps; k += 1) {
      Q.advanceSimulation(sim, { untilTime: (300 * k) / steps });
      Q.snapshot(sim);
    }
    return Q.snapshot(sim);
  }
  const coarse = stats(1);
  const fine = stats(6000);
  assert.equal(fine.completions, coarse.completions);
  assert.equal(fine.events, coarse.events);
  close(fine.utilization, coarse.utilization, 1e-9, 'utilization');
  close(fine.timeAverageNumberInSystem, coarse.timeAverageNumberInSystem, 1e-6, 'time-average N');
  close(fine.meanResponse, coarse.meanResponse, 1e-12, 'mean response');
});

test('response time equals waiting plus service, per request', () => {
  const sim = Q.createSimulation({ arrivalRate: 90, serviceRate: 100, seed: 30861 });
  Q.advanceSimulation(sim, { untilTime: 60 });
  const completions = Q.recentCompletions(sim);
  assert.ok(completions.length > 2000, `only ${completions.length} completions`);
  for (const c of completions) {
    assert.ok(c.wait >= 0, `negative wait ${c.wait}`);
    assert.ok(c.service > 0, `non-positive service ${c.service}`);
    assert.ok(c.response >= c.wait, 'response time below waiting time');
    close(c.response, c.wait + c.service, 1e-12, 'response = wait + service');
  }
});

test('mean waiting time never exceeds mean response time', () => {
  for (const lambda of [10, 50, 90, 99, 110]) {
    const sim = Q.createSimulation({ arrivalRate: lambda, serviceRate: 100, seed: 7, completionLogLimit: 0 });
    Q.advanceSimulation(sim, { untilTime: 200 });
    const s = Q.snapshot(sim);
    assert.ok(s.meanWait <= s.meanResponse, `W_q > W at lambda=${lambda}`);
    close(s.meanResponse, s.meanWait + s.meanService, 1e-9, `W = W_q + S at lambda=${lambda}`);
  }
});

test('throughput counts completions, not offered arrivals', () => {
  /* Under overload the two diverge sharply, which is the whole point: a saturated system completes
     work at mu while arrivals keep coming at lambda. A simulator that reported arrivals as
     throughput would claim 110 req/s from a server that can do 100. */
  const sim = Q.createSimulation({ arrivalRate: 110, serviceRate: 100, seed: 30861, completionLogLimit: 0 });
  Q.advanceSimulation(sim, { untilTime: 2000 });
  const s = Q.snapshot(sim);
  const arrivalRateObserved = s.arrivals / s.observedTime;
  assert.ok(arrivalRateObserved > 105, `offered rate only ${arrivalRateObserved}`);
  assert.ok(s.throughput < 101, `throughput ${s.throughput} exceeded capacity`);
  assert.ok(s.throughput > 99, `throughput ${s.throughput} well below capacity on a saturated server`);
  close(s.throughput, s.completions / s.observedTime, 1e-12, 'throughput definition');
});

test('max observed queue length is a running maximum, not the current value', () => {
  const sim = Q.createSimulation({ arrivalRate: 150, serviceRate: 100, seed: 30861, completionLogLimit: 0 });
  Q.advanceSimulation(sim, { untilTime: 100 });
  const peak = Q.snapshot(sim).maxQueueLength;
  assert.ok(peak > 100, `peak only ${peak}`);
  /* Drain it, and the peak must not fall. */
  Q.setArrivalRate(sim, 0);
  Q.advanceSimulation(sim, { untilTime: 400 });
  const after = Q.snapshot(sim);
  assert.equal(after.queueLength, 0, 'the queue did not drain');
  assert.equal(after.maxQueueLength, peak, 'the running maximum was overwritten');
});

test('warm-up separates the transient from the steady-state window', () => {
  const warm = Q.createSimulation({
    arrivalRate: 90, serviceRate: 100, seed: 30861, warmup: 50, completionLogLimit: 0,
  });
  Q.advanceSimulation(warm, { untilTime: 50 });
  let s = Q.snapshot(warm);
  assert.equal(s.observedTime, 0, 'the window opened before the warm-up elapsed');
  assert.equal(s.observedCompletions, 0);
  assert.ok(s.completions > 1000, 'nothing ran during the warm-up');
  assert.equal(s.utilization, null, 'a utilization was reported with no observation window');

  Q.advanceSimulation(warm, { untilTime: 250 });
  s = Q.snapshot(warm);
  close(s.observedTime, 200, 1e-9, 'observation window length');
  assert.ok(s.observedCompletions > 0);
  assert.ok(s.completions > s.observedCompletions, 'the window counted pre-warm-up completions');
});

test('a warm-up boundary inside an inter-event gap is split, not discarded', () => {
  /* lambda = 0 with a warm-up: the whole run is one idle interval straddling the boundary. The
     observation window must be exactly the post-warm-up part. */
  const sim = Q.createSimulation({ arrivalRate: 0, serviceRate: 100, seed: 1, warmup: 30 });
  Q.advanceSimulation(sim, { untilTime: 100 });
  const s = Q.snapshot(sim);
  close(s.observedTime, 70, 1e-12, 'observation window');
  assert.equal(s.utilization, 0);
});

test("Little's Law is exact over an empty-to-empty cohort", () => {
  /* Over an interval that begins and ends empty, every request counted arrived and departed inside
     it, so L = lambda W is an identity. The residual must be floating-point noise and nothing
     more. This is the honest way to show the law: not a 3% "agreement", an exact one. */
  for (const lambda of [10, 30, 60, 80]) {
    const sim = Q.createSimulation({ arrivalRate: lambda, serviceRate: 100, seed: 30861, completionLogLimit: 0 });
    Q.advanceSimulation(sim, { untilTime: 3000 });
    const c = Q.snapshot(sim).littleCohort;
    assert.equal(c.available, true, `no cohort at lambda=${lambda}: ${c.reason}`);
    assert.ok(c.completions > 500, `cohort of only ${c.completions} at lambda=${lambda}`);
    assert.ok(c.relativeResidual < 1e-12,
      `cohort residual ${c.relativeResidual} at lambda=${lambda} is larger than float noise`);
    close(c.L, c.lambdaHat * c.W, 1e-9, `L = lambda W at lambda=${lambda}`);
  }
});

test('the cohort check is withheld rather than faked when no interval has closed', () => {
  /* Under overload the system never empties, so no cohort exists. Reporting a mismatched pair of
     window estimates here is exactly the error the specification forbids: it would look like
     evidence against Little's Law when it is evidence of an incompatible measurement window. */
  const sim = Q.createSimulation({ arrivalRate: 150, serviceRate: 100, seed: 30861, completionLogLimit: 0 });
  Q.advanceSimulation(sim, { untilTime: 500 });
  const s = Q.snapshot(sim);
  assert.equal(s.littleCohort.available, false);
  assert.match(s.littleCohort.reason, /empty/);
  assert.equal(s.transient, true, 'an overloaded run was reported as steady-state');
});

test('the whole-window estimate is reported separately and converges', () => {
  /* The naive window numbers are still shown — labelled as a long-run approximation — because
     watching them converge IS the lesson about measurement windows. What must hold is that they
     converge, so the gap can honestly be attributed to the boundary requests. */
  const sim = Q.createSimulation({ arrivalRate: 70, serviceRate: 100, seed: 30861, completionLogLimit: 0 });
  Q.advanceSimulation(sim, { untilTime: 20 });
  const early = Q.snapshot(sim).windowRelativeDifference;
  Q.advanceSimulation(sim, { untilTime: 20000 });
  const late = Q.snapshot(sim).windowRelativeDifference;
  assert.ok(early !== null && late !== null);
  assert.ok(late < early, `window difference did not shrink: ${early} then ${late}`);
  assert.ok(late < 0.01, `window difference still ${late} after 20000 s`);
});

test('observed backlog growth tracks lambda minus mu under overload', () => {
  const sim = Q.createSimulation({ arrivalRate: 110, serviceRate: 100, seed: 30861, completionLogLimit: 0 });
  Q.advanceSimulation(sim, { untilTime: 5000 });
  const s = Q.snapshot(sim);
  assert.ok(Math.abs(s.backlogGrowthObserved - 10) < 1,
    `observed growth ${s.backlogGrowthObserved} far from lambda - mu = 10`);
});

test('no statistic is ever Infinity or NaN', () => {
  for (const options of [
    { arrivalRate: 0, serviceRate: 100 },
    { arrivalRate: 30, serviceRate: 100 },
    { arrivalRate: 100, serviceRate: 100 },
    { arrivalRate: 150, serviceRate: 20 },
    { arrivalRate: 30, serviceRate: 100, serviceDistribution: 'deterministic' },
  ]) {
    const sim = Q.createSimulation({ ...options, seed: 30861, completionLogLimit: 0 });
    for (const horizon of [0, 1, 50]) {
      Q.advanceSimulation(sim, { untilTime: horizon });
      const s = Q.snapshot(sim);
      for (const [key, value] of Object.entries(s)) {
        if (typeof value !== 'number') continue;
        assert.ok(Number.isFinite(value), `${JSON.stringify(options)} at t=${horizon}: ${key} = ${value}`);
      }
    }
  }
});

test('the completion ring is bounded and ordered', () => {
  const sim = Q.createSimulation({ arrivalRate: 90, serviceRate: 100, seed: 1, completionLogLimit: 64 });
  Q.advanceSimulation(sim, { untilTime: 100 });
  const log = Q.recentCompletions(sim);
  assert.equal(log.length, 64, `ring held ${log.length} entries`);
  for (let i = 1; i < log.length; i += 1) {
    assert.ok(log[i].time >= log[i - 1].time, 'ring entries out of order');
    assert.equal(log[i].requestId, log[i - 1].requestId + 1, 'ring skipped a request');
  }
  assert.equal(log[log.length - 1].requestId, sim.counters.completions, 'ring tail is not the newest');

  const off = Q.createSimulation({ arrivalRate: 90, serviceRate: 100, seed: 1, completionLogLimit: 0 });
  Q.advanceSimulation(off, { untilTime: 10 });
  assert.deepEqual(Q.recentCompletions(off), []);
  assert.equal(Q.rollingMeanResponse(off), null);
});
