/* test-engine.mjs — the discrete-event engine's structural invariants.
 *
 * These are the properties a reader should be able to assume without reading the engine: the clock
 * never moves backward, work is never invented or lost, one server serves one request, order is
 * preserved, and simulated time is a function of the horizon rather than of the caller's framing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Q } from './harness.mjs';

const base = { arrivalRate: 90, serviceRate: 100, seed: 30861 };

test('event times are nondecreasing and the clock tracks them', () => {
  const sim = Q.createSimulation(base);
  let previous = -1;
  for (let i = 0; i < 200000; i += 1) {
    const ev = Q.stepSimulation(sim);
    assert.ok(ev !== null, 'the system ran out of events under positive load');
    assert.ok(ev.time >= previous, `time moved backward: ${ev.time} after ${previous}`);
    assert.equal(sim.time, ev.time, 'the clock did not land on the event');
    previous = ev.time;
  }
  assert.equal(sim.eventCount, 200000);
});

test('core counting invariants hold event by event', () => {
  const sim = Q.createSimulation({ ...base, arrivalRate: 110 });
  for (let i = 0; i < 100000; i += 1) {
    Q.stepSimulation(sim);
    assert.ok(Q.queueLength(sim) >= 0, 'negative queue length');
    assert.ok(sim.counters.completions <= sim.counters.arrivals,
      `completions ${sim.counters.completions} exceeded arrivals ${sim.counters.arrivals}`);
    /* At most one request in service, and the queue is never non-empty while the server is idle. */
    assert.ok(sim.inService === null || typeof sim.inService === 'object');
    if (sim.inService === null) assert.equal(Q.queueLength(sim), 0, 'idle server with a non-empty queue');
    /* Conservation: every arrival is in the queue, in service, or completed. Nothing is discarded. */
    assert.equal(
      sim.counters.arrivals,
      sim.counters.completions + Q.queueLength(sim) + (sim.inService ? 1 : 0),
      'requests were lost or invented',
    );
  }
});

test('FCFS order is preserved: departures follow arrival order exactly', () => {
  const sim = Q.createSimulation(base);
  let expected = 1;
  let seen = 0;
  for (let i = 0; i < 200000; i += 1) {
    const ev = Q.stepSimulation(sim);
    if (ev.kind !== 'completion') continue;
    assert.equal(sim.lastCompletion.requestId, expected, `out-of-order departure at event ${i}`);
    expected += 1;
    seen += 1;
  }
  assert.ok(seen > 10000, `only ${seen} completions observed`);
});

test('the queue is a queue: the head is served next', () => {
  const sim = Q.createSimulation({ ...base, arrivalRate: 150 });
  Q.advanceSimulation(sim, { untilTime: 20 });
  assert.ok(Q.queueLength(sim) > 10, 'fixture failed to build a queue');
  const head = Q.queueFront(sim).requestId;
  /* Step to the next completion; the request that then enters service must be the old head. */
  let ev = Q.stepSimulation(sim);
  while (ev.kind !== 'completion') ev = Q.stepSimulation(sim);
  assert.equal(sim.inService.requestId, head);
});

test('equal-time events are ordered completion, then timeout, then arrival', () => {
  /* The policy as data. */
  assert.deepEqual(Q.EVENT_ORDER, ['completion', 'timeout', 'arrival']);

  /* The comparator, exhaustively over the declared kinds at an identical timestamp. */
  for (let i = 0; i < Q.EVENT_ORDER.length; i += 1) {
    for (let j = 0; j < Q.EVENT_ORDER.length; j += 1) {
      const a = { kind: Q.EVENT_ORDER[i], time: 5 };
      const b = { kind: Q.EVENT_ORDER[j], time: 5 };
      assert.equal(Math.sign(Q.compareEvents(a, b)), Math.sign(i - j),
        `${a.kind} vs ${b.kind} at an identical time`);
    }
  }
  /* Time dominates kind. */
  assert.ok(Q.compareEvents({ kind: 'arrival', time: 1 }, { kind: 'completion', time: 2 }) < 0);
  assert.ok(Q.compareEvents({ kind: 'completion', time: 3 }, { kind: 'arrival', time: 2 }) > 0);
  assert.throws(() => Q.compareEvents({ kind: 'retry', time: 1 }, { kind: 'arrival', time: 1 }), RangeError);

  /* And the engine honours it: force a tie and check which event the selector picks. */
  const sim = Q.createSimulation(base);
  Q.advanceSimulation(sim, { untilTime: 5 });
  while (sim.inService === null) Q.stepSimulation(sim);
  sim.nextArrivalTime = sim.nextDepartureTime;
  assert.equal(Q.selectNextEvent(sim).kind, 'completion');
});

test('the event trace is identical however the horizon is chunked', () => {
  /* The nonnegotiable property: simulated time is independent of wall-clock time, so 1x, 10x and
     100x must produce one trace. Chunk sizes here stand in for frame rates. */
  const END = 40;
  function trace(steps) {
    const sim = Q.createSimulation({ ...base, completionLogLimit: 0 });
    const out = [];
    for (let k = 1; k <= steps; k += 1) {
      const r = Q.advanceSimulation(sim, { untilTime: (END * k) / steps, trace: true });
      for (const ev of r.trace) out.push(`${ev.kind}@${ev.time}`);
    }
    return { out, sim };
  }
  const one = trace(1);
  for (const steps of [2, 7, 100, 2400]) {
    const many = trace(steps);
    assert.equal(many.out.length, one.out.length, `event count differs at ${steps} chunks`);
    assert.deepEqual(many.out, one.out, `trace differs at ${steps} chunks`);
    assert.equal(many.sim.counters.completions, one.sim.counters.completions);
    assert.equal(many.sim.counters.arrivals, one.sim.counters.arrivals);
    assert.equal(many.sim.time, END, 'the clock did not reach the horizon');
  }
});

test('an event budget makes the engine fall behind, never skip', () => {
  const unbudgeted = Q.createSimulation({ ...base, completionLogLimit: 0 });
  Q.advanceSimulation(unbudgeted, { untilTime: 100 });

  const budgeted = Q.createSimulation({ ...base, completionLogLimit: 0 });
  let total = 0;
  for (let i = 0; i < 1000; i += 1) {
    const r = Q.advanceSimulation(budgeted, { untilTime: 100, maxEvents: 25 });
    total += r.events;
    if (!r.budgetExhausted) break;
  }
  assert.equal(budgeted.time, 100, 'the budgeted run did not catch up');
  assert.equal(total, unbudgeted.eventCount, 'the budgeted run processed a different event count');
  assert.equal(budgeted.counters.completions, unbudgeted.counters.completions);
});

test('a short budget leaves the clock where the last event left it', () => {
  const sim = Q.createSimulation(base);
  const r = Q.advanceSimulation(sim, { untilTime: 1000, maxEvents: 5 });
  assert.equal(r.events, 5);
  assert.equal(r.budgetExhausted, true);
  assert.ok(sim.time < 1000, 'the clock jumped to the horizon despite an exhausted budget');
  assert.equal(sim.eventCount, 5);
});

test('pausing does not advance simulated time', () => {
  /* "Paused" in the engine is simply "nobody called advance". The test is that observing the
     simulation — snapshotting it repeatedly, as the renderer does — moves nothing. */
  const sim = Q.createSimulation(base);
  Q.advanceSimulation(sim, { untilTime: 10 });
  const before = {
    time: sim.time, events: sim.eventCount,
    arrivals: sim.counters.arrivals, completions: sim.counters.completions,
  };
  for (let i = 0; i < 500; i += 1) {
    Q.snapshot(sim);
    Q.recentCompletions(sim);
    Q.rollingMeanResponse(sim);
    Q.predict(sim.params);
  }
  assert.equal(sim.time, before.time);
  assert.equal(sim.eventCount, before.events);
  assert.equal(sim.counters.arrivals, before.arrivals);
  assert.equal(sim.counters.completions, before.completions);
  /* And advancing to a horizon already behind the clock is a no-op. */
  const r = Q.advanceSimulation(sim, { untilTime: sim.time - 1 });
  assert.equal(r.events, 0);
  assert.equal(sim.time, before.time);
});

test('stepping one event at a time reproduces the batched trace', () => {
  const batched = Q.createSimulation({ ...base, completionLogLimit: 0 });
  const batchTrace = Q.advanceSimulation(batched, { maxEvents: 5000, trace: true }).trace
    .map((e) => `${e.kind}@${e.time}`);
  const stepped = Q.createSimulation({ ...base, completionLogLimit: 0 });
  const stepTrace = [];
  for (let i = 0; i < 5000; i += 1) {
    const ev = Q.stepSimulation(stepped);
    stepTrace.push(`${ev.kind}@${ev.time}`);
  }
  assert.deepEqual(stepTrace, batchTrace);
});

test('reset restores the initial state and replays the identical trace', () => {
  const sim = Q.createSimulation({ ...base, completionLogLimit: 0 });
  const first = Q.advanceSimulation(sim, { untilTime: 30, trace: true }).trace
    .map((e) => `${e.kind}@${e.time}`);
  Q.resetSimulation(sim);
  assert.equal(sim.time, 0);
  assert.equal(sim.eventCount, 0);
  assert.equal(sim.counters.arrivals, 0);
  assert.equal(sim.counters.completions, 0);
  assert.equal(sim.counters.maxQueueLength, 0);
  assert.equal(Q.queueLength(sim), 0);
  assert.equal(sim.inService, null);
  assert.equal(sim.nextDepartureTime, null);
  assert.equal(sim.obs.time, 0);
  assert.equal(sim.obs.areaL, 0);
  assert.equal(sim.nextRequestId, 1);
  const second = Q.advanceSimulation(sim, { untilTime: 30, trace: true }).trace
    .map((e) => `${e.kind}@${e.time}`);
  assert.deepEqual(second, first, 'the replay diverged from the first run');
});

test('reset keeps the configured parameters; it is not a factory reset', () => {
  const sim = Q.createSimulation(base);
  Q.setArrivalRate(sim, 55);
  Q.setServiceRate(sim, 140);
  Q.setServiceDistribution(sim, 'deterministic');
  Q.resetSimulation(sim);
  assert.equal(sim.params.arrivalRate, 55);
  assert.equal(sim.params.serviceRate, 140);
  assert.equal(sim.params.serviceDistribution, 'deterministic');
});

test('two simulations with the same seed are indistinguishable; different seeds diverge', () => {
  const a = Q.advanceSimulation(Q.createSimulation({ ...base, seed: 30861 }), { untilTime: 25, trace: true }).trace;
  const b = Q.advanceSimulation(Q.createSimulation({ ...base, seed: 30861 }), { untilTime: 25, trace: true }).trace;
  assert.deepEqual(b, a);
  const c = Q.advanceSimulation(Q.createSimulation({ ...base, seed: 1 }), { untilTime: 25, trace: true }).trace;
  assert.notDeepEqual(c, a);
});

test('an empty system with no arrivals yields no event', () => {
  const sim = Q.createSimulation({ arrivalRate: 0, serviceRate: 100, seed: 1 });
  assert.equal(Q.selectNextEvent(sim), null);
  assert.equal(Q.stepSimulation(sim), null);
  assert.equal(Q.isEmpty(sim), true);
});

test('invalid construction parameters are rejected', () => {
  assert.throws(() => Q.createSimulation({ arrivalRate: -1, serviceRate: 100 }), RangeError);
  assert.throws(() => Q.createSimulation({ arrivalRate: 30, serviceRate: 0 }), RangeError);
  assert.throws(() => Q.createSimulation({ arrivalRate: 30, serviceRate: 100, serviceDistribution: 'x' }), RangeError);
  assert.throws(() => Q.createSimulation({ arrivalRate: 30, serviceRate: 100, warmup: -1 }), RangeError);
});

test('deterministic service produces exactly 1/mu service times', () => {
  const sim = Q.createSimulation({
    arrivalRate: 70, serviceRate: 125, seed: 9, serviceDistribution: 'deterministic',
  });
  Q.advanceSimulation(sim, { untilTime: 100 });
  const completions = Q.recentCompletions(sim);
  assert.ok(completions.length > 1000, `only ${completions.length} completions`);
  for (const c of completions) {
    assert.equal(c.service, 1 / 125, `service time ${c.service} is not 1/mu`);
  }
});
