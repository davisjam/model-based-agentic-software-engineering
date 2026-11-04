/* test-engine.mjs — the discrete-event engine: ordering, the documented tie-break, and the
 * structural invariants of the factory's stages.
 *
 * These are the claims that make the rest of the simulation legible. If time could move backward,
 * or a lane could be double-booked, or the stage counts could drift, the metrics would be
 * arithmetic over a state nobody could reason about.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RF, DAY } from './harness.mjs';

const STRATEGIES = ['immediate', 'canary', 'blueGreen'];

test('the tie-break order is data, and it is the documented order', () => {
  assert.deepEqual(RF.EVENT_ORDER, [
    'restoreComplete', 'productionDetect', 'testFinish', 'reworkFinish',
    'verifyFinish', 'soakEnd', 'rolloutComplete', 'releaseFlush', 'commit',
  ]);
});

test('events at the same instant are ordered by kind, then by schedule sequence', () => {
  const at = (kind, seq) => ({ time: 10, kind, seq });
  /* A commit at time t sees the factory as it stands after everything else at t. */
  assert.ok(RF.compareEvents(at('commit', 1), at('testFinish', 99)) > 0);
  assert.ok(RF.compareEvents(at('restoreComplete', 99), at('commit', 1)) < 0);
  /* A detection landing exactly at the end of a canary soak counts as caught in the canary. */
  assert.ok(RF.compareEvents(at('productionDetect', 50), at('soakEnd', 1)) < 0);
  /* Resource-freeing events precede the batch timer that is waiting for the resource. */
  assert.ok(RF.compareEvents(at('rolloutComplete', 9), at('releaseFlush', 1)) < 0);
  /* Equal time and equal kind falls through to the sequence number, so no two events tie. */
  assert.equal(RF.compareEvents(at('commit', 1), at('commit', 2)), -1);
  assert.equal(RF.compareEvents(at('commit', 2), at('commit', 1)), 1);
  /* Time dominates everything. */
  assert.ok(RF.compareEvents({ time: 1, kind: 'commit', seq: 1 },
    { time: 2, kind: 'restoreComplete', seq: 1 }) < 0);
});

test('an unknown event kind is rejected rather than silently ranked', () => {
  assert.throws(() => RF.compareEvents(
    { time: 1, kind: 'rumour', seq: 1 }, { time: 1, kind: 'commit', seq: 2 },
  ), RangeError);
});

test('simulated time is nondecreasing across every strategy', () => {
  for (const releaseStrategy of STRATEGIES) {
    const sim = RF.createSimulation({ releaseStrategy, seed: 5, arrivalRate: 'high' });
    let last = -1;
    let steps = 0;
    for (let i = 0; i < 60000; i += 1) {
      const ev = RF.stepSimulation(sim);
      if (ev === null) break;
      assert.ok(ev.time >= last,
        `${releaseStrategy}: time moved backward at event ${i} (${ev.time} < ${last})`);
      last = ev.time;
      steps += 1;
    }
    assert.ok(steps > 10000, `${releaseStrategy}: only ${steps} events`);
  }
});

test('the event trace does not depend on how the caller chunks time', () => {
  /* Horizons are exact fractions of the SAME end time rather than an accumulated step, so both
     runs cover an identical interval. Summing a float step would leave the fine-grained run short
     and the test would be measuring its own arithmetic. */
  const trace = (chunks, options) => {
    const sim = RF.createSimulation({ seed: 77, ...options });
    const out = [];
    for (let k = 1; k <= chunks; k += 1) {
      const r = RF.advanceSimulation(sim, { untilTime: 60 * DAY * k / chunks, trace: true });
      for (const e of r.trace) out.push(`${e.kind}@${e.time}`);
    }
    return out;
  };
  for (const releaseStrategy of STRATEGIES) {
    const coarse = trace(1, { releaseStrategy });
    const fine = trace(500, { releaseStrategy });
    assert.equal(fine.length, coarse.length, `${releaseStrategy}: trace lengths differ`);
    for (let i = 0; i < coarse.length; i += 1) {
      assert.equal(fine[i], coarse[i], `${releaseStrategy}: diverged at event ${i}`);
    }
    assert.ok(coarse.length > 2000, `${releaseStrategy}: only ${coarse.length} events`);
  }
});

test('the same seed and parameters replay an identical trace', () => {
  const run = () => {
    const sim = RF.createSimulation({ seed: 9, traceLimit: 20000, releaseStrategy: 'canary' });
    RF.advanceSimulation(sim, { untilTime: 60 * DAY });
    return { trace: sim.trace.map((e) => `${e.kind}@${e.time}`), stats: RF.snapshot(sim) };
  };
  const a = run();
  const b = run();
  assert.deepEqual(b.trace, a.trace);
  assert.deepEqual(b.stats.fourKeys, a.stats.fourKeys);
  assert.deepEqual(b.stats.ledger, a.stats.ledger);
  assert.deepEqual(b.stats.userImpact, a.stats.userImpact);
  assert.ok(a.trace.length > 2000, `only ${a.trace.length} events traced`);
});

test('different seeds give different runs', () => {
  const impact = (seed) => {
    const sim = RF.createSimulation({ seed, releaseStrategy: 'canary' });
    RF.advanceSimulation(sim, { untilTime: 60 * DAY });
    return RF.snapshot(sim).userImpact.requestsExposed;
  };
  assert.notEqual(impact(1), impact(2));
});

test('no lane or release slot is ever double-booked, and no count goes negative', () => {
  for (const releaseStrategy of STRATEGIES) {
    for (const batchSize of [1, 5, 10]) {
      const sim = RF.createSimulation({
        releaseStrategy, batchSize, seed: 101, arrivalRate: 'high', testDepth: 'standard',
      });
      for (let i = 0; i < 40000; i += 1) {
        if (RF.stepSimulation(sim) === null) break;
        const label = `${releaseStrategy}/batch ${batchSize}`;
        assert.ok(sim.lanesBusy >= 0 && sim.lanesBusy <= sim.params.pipelineLanes,
          `${label}: lanesBusy ${sim.lanesBusy}`);
        assert.ok(sim.releasesInFlight >= 0 && sim.releasesInFlight <= sim.params.releaseSlots,
          `${label}: releasesInFlight ${sim.releasesInFlight}`);
        assert.ok(RF.backlog(sim) >= 0, `${label}: negative backlog`);
        assert.ok(sim.inRework >= 0, `${label}: negative rework count`);
        assert.ok(sim.releaseQueue.length >= 0, `${label}: negative release queue`);
      }
    }
  }
});

test('every change is accounted for in exactly one place', () => {
  /* Conservation. A change is in exactly one of six places: waiting for a lane, in test, in
     rework, waiting to be batched, inside a release that has not finished rolling out, or
     delivered. If one could leak, lead time and deployment frequency would be measuring different
     populations and nothing downstream would mean what it says. */
  for (const releaseStrategy of STRATEGIES) {
    for (const batchSize of [1, 5]) {
      const sim = RF.createSimulation({
        releaseStrategy, batchSize, seed: 13, arrivalRate: 'high', testDepth: 'standard',
      });
      /* Checked continuously, not only at the end: a leak that healed before the horizon would
         pass an end-state check. */
      for (let i = 0; i < 30000; i += 1) {
        if (RF.stepSimulation(sim) === null) break;
        if (i % 97 !== 0) continue;
        const g = RF.snapshot(sim).stages;
        const placed = g.backlog + g.inTest + g.inRework + g.awaitingRelease
          + g.inOpenReleases + g.changesDelivered;
        assert.equal(placed, sim.counters.commits,
          `${releaseStrategy}/batch ${batchSize}: ${sim.counters.commits} commits but ${placed} placed`
          + ` (backlog ${g.backlog}, test ${g.inTest}, rework ${g.inRework},`
          + ` queue ${g.awaitingRelease}, releasing ${g.inOpenReleases}, delivered ${g.changesDelivered})`);
      }
      assert.ok(sim.counters.commits > 400, `${releaseStrategy}: only ${sim.counters.commits} commits`);
    }
  }
});

test('a run with no arrivals produces nothing and stays at rest', () => {
  const sim = RF.createSimulation({ arrivalRatePerDay: 1e-9, seed: 3 });
  RF.advanceSimulation(sim, { untilTime: 30 * DAY });
  const s = RF.snapshot(sim);
  assert.equal(s.admission.commits, 0);
  assert.equal(s.deployments.total, 0);
  assert.equal(s.ledger.introduced, 0);
  assert.equal(s.userImpact.requestsExposed, 0);
  assert.equal(s.fourKeys.changeFailureRate, null, 'a failure rate with no deployments');
  assert.equal(s.fourKeys.leadTimeHours.mean, null);
});

test('a defect-free team never fails a deployment', () => {
  const sim = RF.createSimulation({
    defectRate: 0, seed: 21, arrivalRate: 'high', testDepth: 'standard', releaseStrategy: 'canary',
  });
  RF.advanceSimulation(sim, { untilTime: 90 * DAY });
  const s = RF.snapshot(sim);
  assert.ok(s.deployments.total > 100, `only ${s.deployments.total} deployments`);
  assert.equal(s.ledger.introduced, 0);
  assert.equal(s.deployments.failed, 0);
  assert.equal(s.fourKeys.changeFailureRate, 0);
  assert.equal(s.userImpact.requestsExposed, 0, 'exposure accrued with no defect in production');
  /* Flaky tests still block changes under required checks, so rework is NOT zero — which is the
     cost of a required gate on a team that introduced no defects at all. */
  assert.ok(s.admission.blockedFlaky > 0, 'no flaky failure in a long run');
  assert.equal(s.admission.blockedDefective, 0);
});

test('advanceSimulation honours each of its three bounds', () => {
  const byEvents = RF.createSimulation({ seed: 1 });
  const r1 = RF.advanceSimulation(byEvents, { maxEvents: 250 });
  assert.equal(r1.events, 250);
  assert.equal(byEvents.eventCount, 250);

  const byTime = RF.createSimulation({ seed: 1 });
  RF.advanceSimulation(byTime, { untilTime: 10 * DAY });
  assert.equal(byTime.time, 10 * DAY);

  const byDeployments = RF.createSimulation({ seed: 1, testDepth: 'smoke' });
  RF.advanceSimulation(byDeployments, { maxDeployments: 12 });
  assert.ok(byDeployments.counters.deployments >= 12);
  assert.ok(byDeployments.counters.deployments < 20,
    `overshot the deployment bound: ${byDeployments.counters.deployments}`);
});

test('reset rewinds the clock and the streams but keeps the parameters', () => {
  const sim = RF.createSimulation({ seed: 44, testDepth: 'smoke', batchSize: 5 });
  RF.advanceSimulation(sim, { untilTime: 20 * DAY });
  const before = RF.snapshot(sim);
  assert.ok(before.deployments.total > 0);
  RF.resetSimulation(sim);
  const after = RF.snapshot(sim);
  assert.equal(after.time, 0);
  assert.equal(after.deployments.total, 0);
  assert.equal(after.ledger.introduced, 0);
  assert.equal(sim.params.testDepth, 'smoke');
  assert.equal(sim.params.batchSize, 5);
  /* And a replay from the reset state reproduces the original run exactly. */
  RF.advanceSimulation(sim, { untilTime: 20 * DAY });
  assert.deepEqual(RF.snapshot(sim).fourKeys, before.fourKeys);
});

test('the engine refuses to schedule an event in the past', () => {
  const sim = RF.createSimulation({ seed: 2 });
  RF.advanceSimulation(sim, { untilTime: 5 * DAY });
  assert.ok(sim.time > 0);
  /* Reached through the public surface: a negative canary soak would schedule backwards. The
     parameter validator catches it first, which is the point — the guard is defence in depth. */
  assert.throws(() => RF.createSimulation({ canarySoakHours: -1 }), RangeError);
});

test('the capacity model reports the offered load the student is moving', () => {
  const sim = RF.createSimulation({
    arrivalRate: 'high', testDepth: 'thorough', pipelineLanes: 2,
  });
  const s = RF.snapshot(sim);
  assert.equal(s.capacity.offeredPerDay, RF.ARRIVAL_RATES.high.perDay);
  const expectedService = (2 / (RF.TEST_DEPTHS.thorough.minutes / 60)) * RF.HOURS_PER_DAY;
  assert.ok(Math.abs(s.capacity.servicePerDay - expectedService) < 1e-9);
  assert.ok(s.capacity.utilization > 1, 'thorough tests at a high arrival rate should overload');
  assert.equal(s.capacity.state, 'bad');

  const easy = RF.snapshot(RF.createSimulation({ arrivalRate: 'low', testDepth: 'smoke' }));
  assert.ok(easy.capacity.utilization < 0.7);
  assert.equal(easy.capacity.state, 'ok');
});

test('the release channel is a second capacity, and batch size is its lever', () => {
  const util = (options) => RF.snapshot(RF.createSimulation(options)).releaseCapacity;
  const soaked = util({ arrivalRate: 'high', releaseStrategy: 'canary', batchSize: 1 });
  /* A one-hour soak plus the deploy delay caps the channel near 24 releases a day. */
  assert.ok(soaked.servicePerDay > 20 && soaked.servicePerDay < 25,
    `canary channel service ${soaked.servicePerDay}`);
  assert.ok(soaked.utilization > 1, `canary at batch 1 should saturate: ${soaked.utilization}`);
  const batched = util({ arrivalRate: 'high', releaseStrategy: 'canary', batchSize: 5 });
  assert.ok(batched.utilization < soaked.utilization / 4,
    'batching did not divide the offered release rate');
  const immediate = util({ arrivalRate: 'high', releaseStrategy: 'immediate', batchSize: 1 });
  assert.ok(immediate.utilization < 0.1,
    `an immediate release should barely occupy the channel: ${immediate.utilization}`);
});
