/* test-parameters.mjs — changing the experiment while it runs.
 *
 * The declared policy, which the page also states on screen:
 *   - a change to lambda affects FUTURE arrivals; the arrival already generated is left alone,
 *   - lambda = 0 cancels the pending arrival, because at rate zero there is no arrival process,
 *   - a request already in service keeps its scheduled completion time,
 *   - a new service rate or distribution applies to services that START afterwards.
 *
 * Each clause is pinned, because each one is a place where a plausible-looking implementation
 * retroactively edits history and quietly invalidates the experiment.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Q } from './harness.mjs';

const base = { arrivalRate: 90, serviceRate: 100, seed: 30861, completionLogLimit: 0 };

test('a change to lambda leaves the already-scheduled arrival in place', () => {
  const sim = Q.createSimulation(base);
  Q.advanceSimulation(sim, { untilTime: 5 });
  const scheduled = sim.nextArrivalTime;
  Q.setArrivalRate(sim, 20);
  assert.equal(sim.nextArrivalTime, scheduled, 'the pending arrival was regenerated');
  assert.equal(sim.params.arrivalRate, 20);
});

test('a change to lambda does take effect on subsequent arrivals', () => {
  /* Raise lambda sharply and count arrivals over a long interval: the realised rate must follow
     the new parameter, not the old one. */
  const sim = Q.createSimulation({ ...base, arrivalRate: 10 });
  Q.advanceSimulation(sim, { untilTime: 100 });
  Q.setArrivalRate(sim, 100);
  const before = sim.counters.arrivals;
  const t0 = sim.time;
  Q.advanceSimulation(sim, { untilTime: t0 + 1000 });
  const realised = (sim.counters.arrivals - before) / (sim.time - t0);
  assert.ok(Math.abs(realised - 100) < 3, `realised arrival rate ${realised} after raising to 100`);
});

test('no past arrival is altered by a parameter change', () => {
  /* Take the arrival trace up to t = 5 under one lambda, change lambda, and re-read the trace:
     the historical events must be byte-identical. */
  const sim = Q.createSimulation(base);
  const history = Q.advanceSimulation(sim, { untilTime: 5, trace: true }).trace
    .filter((e) => e.kind === 'arrival').map((e) => e.time);
  Q.setArrivalRate(sim, 10);
  const later = Q.advanceSimulation(sim, { untilTime: 10, trace: true }).trace
    .filter((e) => e.kind === 'arrival').map((e) => e.time);
  for (const t of later) assert.ok(t > 5, `an arrival appeared at ${t}, inside settled history`);
  /* And the pre-change trace is unchanged under a fresh replay of the same prefix. */
  const replay = Q.advanceSimulation(Q.createSimulation(base), { untilTime: 5, trace: true }).trace
    .filter((e) => e.kind === 'arrival').map((e) => e.time);
  assert.deepEqual(replay, history);
});

test('lambda = 0 cancels the pending arrival; raising it from 0 schedules a fresh one', () => {
  const sim = Q.createSimulation(base);
  Q.advanceSimulation(sim, { untilTime: 5 });
  assert.notEqual(sim.nextArrivalTime, null);
  Q.setArrivalRate(sim, 0);
  assert.equal(sim.nextArrivalTime, null, 'an arrival remained scheduled at rate 0');
  const arrivals = sim.counters.arrivals;
  Q.advanceSimulation(sim, { untilTime: 500 });
  assert.equal(sim.counters.arrivals, arrivals, 'arrivals continued at rate 0');
  assert.equal(Q.isEmpty(sim), true, 'the system did not drain');

  Q.setArrivalRate(sim, 50);
  assert.ok(sim.nextArrivalTime > sim.time, 'no arrival was scheduled after raising lambda from 0');
  Q.advanceSimulation(sim, { untilTime: sim.time + 200 });
  assert.ok(sim.counters.arrivals > arrivals, 'arrivals did not resume');
});

test('a request already in service keeps its scheduled completion time', () => {
  const sim = Q.createSimulation(base);
  Q.advanceSimulation(sim, { untilTime: 2 });
  while (sim.inService === null) Q.stepSimulation(sim);
  const scheduled = sim.nextDepartureTime;
  const servedId = sim.inService.requestId;
  const duration = sim.inService.serviceDuration;

  Q.setServiceRate(sim, 10);          /* a tenfold slowdown */
  assert.equal(sim.nextDepartureTime, scheduled, 'the in-flight completion was rescheduled');
  assert.equal(sim.inService.serviceDuration, duration, 'the sampled duration was rewritten');

  Q.setServiceRate(sim, 1000);        /* and a tenfold speedup */
  assert.equal(sim.nextDepartureTime, scheduled, 'the in-flight completion was rescheduled');

  /* It really does complete at the original time. */
  let ev = Q.stepSimulation(sim);
  while (ev.kind !== 'completion') ev = Q.stepSimulation(sim);
  assert.equal(ev.time, scheduled);
  assert.equal(sim.lastCompletion.requestId, servedId);
});

test('a new service rate applies to the next service that starts', () => {
  const sim = Q.createSimulation({ ...base, serviceDistribution: 'deterministic', completionLogLimit: 4096 });
  Q.advanceSimulation(sim, { untilTime: 5 });
  Q.setServiceRate(sim, 200);
  /* Let the in-flight request finish, then inspect the services that begin afterwards. */
  const boundary = sim.counters.completions + 1;
  Q.advanceSimulation(sim, { untilTime: 20 });
  const after = Q.recentCompletions(sim).filter((c) => c.requestId > boundary);
  assert.ok(after.length > 50, `only ${after.length} completions after the change`);
  for (const c of after) assert.equal(c.service, 1 / 200, `service time ${c.service} is not 1/200`);
});

test('changing the service distribution affects future service only', () => {
  const sim = Q.createSimulation(base);
  Q.advanceSimulation(sim, { untilTime: 5 });
  while (sim.inService === null) Q.stepSimulation(sim);
  const scheduled = sim.nextDepartureTime;
  const duration = sim.inService.serviceDuration;
  Q.setServiceDistribution(sim, 'deterministic');
  assert.equal(sim.nextDepartureTime, scheduled, 'the in-flight completion was rescheduled');
  assert.notEqual(duration, 1 / 100, 'fixture: the in-flight service happened to equal 1/mu');

  const boundary = sim.counters.completions + 1;
  Q.advanceSimulation(sim, { untilTime: 25 });
  const log = Q.createSimulation(base);  /* fresh, to assert the other direction below */
  assert.equal(log.params.serviceDistribution, 'exponential');
  for (const c of Q.recentCompletions(sim)) {
    if (c.requestId <= boundary) continue;
    assert.equal(c.service, 1 / 100, `service time ${c.service} is not deterministic`);
  }
});

test('invalid parameter changes are rejected and leave the simulation untouched', () => {
  const sim = Q.createSimulation(base);
  Q.advanceSimulation(sim, { untilTime: 5 });
  const before = { ...sim.params, nextArrivalTime: sim.nextArrivalTime, time: sim.time };
  for (const bad of [-1, NaN, Infinity, '30', null, undefined]) {
    assert.throws(() => Q.setArrivalRate(sim, bad), RangeError, `accepted lambda ${String(bad)}`);
  }
  for (const bad of [0, -1, NaN, Infinity, '100', null, undefined]) {
    assert.throws(() => Q.setServiceRate(sim, bad), RangeError, `accepted mu ${String(bad)}`);
  }
  for (const bad of ['erlang', '', null, undefined, 1]) {
    assert.throws(() => Q.setServiceDistribution(sim, bad), RangeError,
      `accepted distribution ${String(bad)}`);
  }
  assert.equal(sim.params.arrivalRate, before.arrivalRate);
  assert.equal(sim.params.serviceRate, before.serviceRate);
  assert.equal(sim.params.serviceDistribution, before.serviceDistribution);
  assert.equal(sim.nextArrivalTime, before.nextArrivalTime);
  assert.equal(sim.time, before.time);
});

test('the recover-capacity experiment drains the backlog at mu minus lambda', () => {
  /* Experiment 4's arithmetic, pinned. Build a backlog at lambda=110, mu=100; raise mu to 150
     WITHOUT a reset; the queue must drain at about 40 req/s. */
  const sim = Q.createSimulation(base);
  Q.setArrivalRate(sim, 110);
  Q.setServiceRate(sim, 100);
  Q.resetSimulation(sim);
  Q.advanceSimulation(sim, { untilTime: 200 });
  const backlog = Q.numberInSystem(sim);
  assert.ok(backlog > 1000, `backlog of only ${backlog} after 200 s`);

  const preset = Q.applyPreset(sim, 'recover');
  assert.equal(preset.reset, false);
  assert.equal(Q.numberInSystem(sim), backlog, 'the preset discarded the backlog');

  const t0 = sim.time;
  const expectedSeconds = backlog / (150 - 110);
  /* Drain in small steps and record when the system first empties. */
  let drainedAt = null;
  for (let k = 1; k <= 400 && drainedAt === null; k += 1) {
    Q.advanceSimulation(sim, { untilTime: t0 + (expectedSeconds * 2 * k) / 400 });
    if (Q.numberInSystem(sim) === 0) drainedAt = sim.time - t0;
  }
  assert.ok(drainedAt !== null, 'the backlog never drained');
  /* The drain is a random walk with drift 40/s, so the realised time scatters around N/40. A
     generous band: the point is the order of magnitude and the sign of the effect, not precision. */
  assert.ok(drainedAt > expectedSeconds * 0.6 && drainedAt < expectedSeconds * 1.6,
    `drained in ${drainedAt.toFixed(2)} s against an estimate of ${expectedSeconds.toFixed(2)} s`);
});

test('a resetting preset restarts from empty with the seed rewound', () => {
  const sim = Q.createSimulation(base);
  Q.advanceSimulation(sim, { untilTime: 100 });
  Q.applyPreset(sim, 'near');
  assert.equal(sim.time, 0);
  assert.equal(sim.params.arrivalRate, 95);
  assert.equal(sim.params.serviceRate, 100);
  assert.equal(Q.numberInSystem(sim), 0);

  const replay = Q.createSimulation({ ...base, arrivalRate: 95, serviceRate: 100 });
  const a = Q.advanceSimulation(sim, { untilTime: 10, trace: true }).trace.map((e) => e.time);
  const b = Q.advanceSimulation(replay, { untilTime: 10, trace: true }).trace.map((e) => e.time);
  assert.deepEqual(a, b, 'the preset did not rewind the random streams');
});
