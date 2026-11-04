/* test-defect-model.mjs — the five defect events, kept separate.
 *
 * The specification asks the model to distinguish five things:
 *
 *   1. defect introduced          4. defect detected after release
 *   2. defect detected before release   5. service restored
 *   3. defect exposed in production
 *
 * Collapsing any pair would make a policy question unanswerable, so this file pins each of them,
 * the exclusions between them, and the arithmetic that has to reconcile. It also pins the two
 * facts that come FROM the separation: that an advisory gate ships a change the tests failed, and
 * that a defect can be exposed and never found.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RF, DAY } from './harness.mjs';

const STRATEGIES = ['immediate', 'canary', 'blueGreen'];

/* A long, busy run under each strategy, with a shallow-enough suite that plenty escapes. */
function population(options = {}) {
  const sim = RF.createSimulation({
    seed: 30861, arrivalRate: 'high', testDepth: 'standard', batchSize: 5, ...options,
  });
  RF.advanceSimulation(sim, { untilTime: 180 * DAY });
  return { sim, ledger: sim.ledger, stats: RF.snapshot(sim) };
}

test('every defect instance carries an introduction time and the five fields', () => {
  const { ledger } = population();
  assert.ok(ledger.length > 500, `only ${ledger.length} defects`);
  for (const d of ledger) {
    assert.equal(typeof d.introducedAt, 'number');
    assert.ok(Number.isFinite(d.introducedAt));
    for (const field of [
      'detectedBeforeReleaseAt', 'exposedInProductionAt', 'detectedAfterReleaseAt', 'restoredAt',
    ]) {
      assert.ok(d[field] === null || typeof d[field] === 'number',
        `defect ${d.id}: ${field} is neither null nor a time`);
    }
    assert.ok(['commit', 'rework'].includes(d.origin), `defect ${d.id}: odd origin ${d.origin}`);
  }
});

test('a defect cannot be both detected before release and exposed in production', () => {
  /* The exclusion the specification names first. It is the reason the test SIGNAL is recorded
     separately from the BLOCK: under an advisory policy the signal fires and the change ships, so
     collapsing the two would make this exclusion false. */
  for (const releaseStrategy of STRATEGIES) {
    for (const admissionPolicy of ['required', 'advisory']) {
      const { ledger } = population({ releaseStrategy, admissionPolicy });
      let both = 0;
      for (const d of ledger) {
        if (d.detectedBeforeReleaseAt !== null && d.exposedInProductionAt !== null) both += 1;
      }
      assert.equal(both, 0, `${releaseStrategy}/${admissionPolicy}: ${both} defects were both`);
    }
  }
});

test('detection after release implies exposure, and never precedes it', () => {
  for (const releaseStrategy of STRATEGIES) {
    const { ledger } = population({ releaseStrategy });
    let checked = 0;
    for (const d of ledger) {
      if (d.detectedAfterReleaseAt === null) continue;
      assert.notEqual(d.exposedInProductionAt, null,
        `${releaseStrategy}: defect ${d.id} was detected in production without being exposed`);
      assert.ok(d.detectedAfterReleaseAt >= d.exposedInProductionAt,
        `${releaseStrategy}: defect ${d.id} was detected before it was exposed`);
      assert.ok(d.exposedInProductionAt >= d.introducedAt,
        `${releaseStrategy}: defect ${d.id} was exposed before it was introduced`);
      checked += 1;
    }
    assert.ok(checked > 100, `${releaseStrategy}: only ${checked} production detections`);
  }
});

test('restoration implies a previously detected failure, and never precedes it', () => {
  for (const releaseStrategy of STRATEGIES) {
    const { ledger } = population({ releaseStrategy });
    let checked = 0;
    for (const d of ledger) {
      if (d.restoredAt === null) continue;
      assert.notEqual(d.detectedAfterReleaseAt, null,
        `${releaseStrategy}: defect ${d.id} was restored without a detected failure`);
      assert.ok(d.restoredAt >= d.detectedAfterReleaseAt,
        `${releaseStrategy}: defect ${d.id} was restored before it was detected`);
      checked += 1;
    }
    assert.ok(checked > 100, `${releaseStrategy}: only ${checked} restorations`);
  }
});

test('a defect removed by another rollback is not counted as restored', () => {
  /* The sixth, bookkeeping field. A defect that rode along in a batch whose rollback was triggered
     by a sibling is REMOVED from production, and that is not a restoration: nobody ever knew it
     was there, and no time-to-restore clock ever started. Counting it as restored would inflate
     the ledger's recovery column with failures nobody recovered from. */
  const { ledger } = population({ releaseStrategy: 'immediate', batchSize: 10 });
  let removedUndetected = 0;
  for (const d of ledger) {
    if (d.removedFromProductionAt === null) continue;
    assert.notEqual(d.exposedInProductionAt, null,
      `defect ${d.id} was removed from production without being exposed`);
    if (d.detectedAfterReleaseAt === null) {
      assert.equal(d.restoredAt, null, `defect ${d.id} was restored without being detected`);
      removedUndetected += 1;
    }
  }
  assert.ok(removedUndetected > 0,
    'no defect rode along in a rolled-back batch; the case is untested');
});

test('a defect can be exposed and never detected', () => {
  /* Required by the specification, and easy to lose: a flat background discovery rate would make
     every defect eventually findable. Detection is driven by AFFECTED requests, so a defect that
     manifests once in a million at a quiet service stays invisible. */
  const { stats, ledger } = population({
    releaseStrategy: 'immediate', requestsPerHour: 400,
    defectClassWeights: { obvious: 0, conditional: 0, rare: 0.4, latent: 0.6 },
  });
  assert.ok(stats.ledger.exposedInProduction > 50,
    `only ${stats.ledger.exposedInProduction} defects reached production`);
  assert.ok(stats.ledger.exposedNeverDetected > 0, 'every exposed defect was eventually detected');
  const never = ledger.filter(
    (d) => d.exposedInProductionAt !== null && d.detectedAfterReleaseAt === null,
  );
  for (const d of never) {
    assert.equal(d.restoredAt, null, `defect ${d.id} was restored though never detected`);
  }
  assert.ok(stats.ledger.exposedNeverDetected / stats.ledger.exposedInProduction > 0.1,
    'the undetected share is too small for students to notice');
});

test('the ledger reconciles: introduced = blocked + exposed + still in the pipeline', () => {
  for (const releaseStrategy of STRATEGIES) {
    for (const admissionPolicy of ['required', 'advisory']) {
      const { stats } = population({ releaseStrategy, admissionPolicy });
      const l = stats.ledger;
      assert.equal(l.introduced, l.detectedBeforeRelease + l.exposedInProduction + l.inPipeline,
        `${releaseStrategy}/${admissionPolicy}: ${l.introduced} introduced,`
        + ` ${l.detectedBeforeRelease} blocked, ${l.exposedInProduction} exposed,`
        + ` ${l.inPipeline} in flight`);
      assert.ok(l.restored <= l.detectedAfterRelease, 'more restored than detected');
      assert.ok(l.detectedAfterRelease <= l.exposedInProduction, 'more detected than exposed');
      assert.equal(
        l.exposedNeverDetected, l.exposedInProduction - l.detectedAfterRelease,
        `${releaseStrategy}/${admissionPolicy}: undetected share does not reconcile`,
      );
      assert.equal(l.removedUndetected + l.liveUndetected, l.exposedNeverDetected,
        'undetected defects are neither live nor removed');
      assert.equal(l.detectedDuringCanary + l.reachedWholeFleet, l.exposedInProduction,
        'every exposed defect either stopped at the canary or reached the fleet');
    }
  }
});

test('the per-class ledger sums to the whole', () => {
  const { stats } = population();
  const l = stats.ledger;
  const sum = (field) => Object.keys(l.byClass)
    .reduce((acc, id) => acc + l.byClass[id][field], 0);
  assert.equal(sum('introduced'), l.introduced);
  assert.equal(sum('detectedBeforeRelease'), l.detectedBeforeRelease);
  assert.equal(sum('exposedInProduction'), l.exposedInProduction);
  assert.equal(sum('detectedAfterRelease'), l.detectedAfterRelease);
  for (const cls of RF.DEFECT_CLASSES) {
    assert.ok(Object.prototype.hasOwnProperty.call(l.byClass, cls.id),
      `class ${cls.id} is missing from the ledger`);
  }
});

test('under required checks the signal and the block are the same count', () => {
  const { stats } = population({ admissionPolicy: 'required', releaseStrategy: 'immediate' });
  /* Blue-green verification is a second pre-release control, so this identity only holds for a
     strategy with no such gate. That is why the strategy is pinned here. */
  assert.equal(stats.ledger.signalledByTests, stats.ledger.detectedBeforeRelease,
    'a required gate let a signalled defect through, or blocked an unsignalled one');
  assert.equal(stats.admission.admittedWithFailingChecks, 0);
});

test('under advisory checks the tests still signal, and the signalled changes ship', () => {
  /* The pair of counts that makes the admission policy legible. The test depth is unchanged
     between the two runs, so the SIGNAL count is comparable; what differs is what happened next. */
  const required = population({ admissionPolicy: 'required', releaseStrategy: 'immediate' }).stats;
  const advisory = population({ admissionPolicy: 'advisory', releaseStrategy: 'immediate' }).stats;
  assert.ok(advisory.ledger.signalledByTests > 100,
    `advisory signalled only ${advisory.ledger.signalledByTests} defects`);
  assert.equal(advisory.ledger.detectedBeforeRelease, 0,
    'an advisory gate blocked something');
  assert.ok(advisory.admission.admittedWithFailingChecks > 100,
    'an advisory gate admitted nothing red');
  assert.ok(advisory.ledger.exposedInProduction > required.ledger.exposedInProduction,
    `advisory exposed ${advisory.ledger.exposedInProduction},`
    + ` required exposed ${required.ledger.exposedInProduction}`);
});

test('blue-green verification blocks before release and exposes nobody', () => {
  const { stats } = population({ releaseStrategy: 'blueGreen', admissionPolicy: 'advisory' });
  /* Advisory admission removes the test gate, so anything blocked before release here was caught
     by the synthetic verification — which exposes no users at all. */
  assert.ok(stats.admission.releasesAborted > 10,
    `only ${stats.admission.releasesAborted} releases were aborted at verification`);
  assert.ok(stats.ledger.detectedBeforeRelease >= stats.admission.releasesAborted,
    'an aborted release recorded no pre-release detection');
  assert.equal(stats.ledger.detectedDuringCanary, 0,
    'blue-green reported a canary detection');
});

test('a rework can introduce a new defect, and it is a new instance', () => {
  const { ledger } = population({ admissionPolicy: 'required', reworkFixProbability: 0.5 });
  const regressions = ledger.filter((d) => d.origin === 'rework');
  assert.ok(regressions.length > 20, `only ${regressions.length} rework regressions`);
  const ids = new Set();
  for (const d of regressions) {
    /* A regression is a fresh instance with its own lifecycle. It starts at the moment the rework
       finished, not at the original commit, and it goes on to be blocked, exposed, or still in
       flight exactly like any other — the point is that it is not the SAME instance wearing new
       timestamps, because that would let one defect record two introductions. */
    assert.ok(d.introducedAt > 0, `defect ${d.id} was introduced at time 0 by a rework`);
    assert.equal(d.exposedInProductionAt === null || d.exposedInProductionAt >= d.introducedAt,
      true, `defect ${d.id} was exposed before the rework that introduced it`);
    assert.ok(!ids.has(d.id), `defect id ${d.id} appears twice in the ledger`);
    ids.add(d.id);
  }
  /* A perfect fix process introduces none, which is the control for the above. */
  const perfect = population({ admissionPolicy: 'required', reworkFixProbability: 1 }).sim.ledger;
  assert.equal(perfect.filter((d) => d.origin === 'rework').length, 0);
});

test('a defect profile reaches the engine unmodified', () => {
  const profile = { testDetectability: 0.25, manifestRate: 0.03, trafficDetectability: 0.6 };
  const { ledger } = population({ defectProfile: profile });
  assert.ok(ledger.length > 100);
  for (const d of ledger) {
    assert.equal(d.testDetectability, profile.testDetectability);
    assert.equal(d.manifestRate, profile.manifestRate);
    assert.equal(d.trafficDetectability, profile.trafficDetectability);
  }
});

test('the detection hazard has no strategy term in it', () => {
  /* The structural reason canary effectiveness is not hard-coded: the rate is a function of the
     defect and of the traffic the student configured. A canary enters only through `fraction`. */
  const sim = RF.createSimulation({ requestsPerHour: 10000, monitoringQuality: 0.5 });
  const defect = { manifestRate: 0.2, trafficDetectability: 0.5 };
  const full = RF.detectionRate(sim, defect, 1);
  const canary = RF.detectionRate(sim, defect, 0.05);
  assert.ok(Math.abs(canary - full * 0.05) < 1e-12,
    'the rate is not linear in the exposed fraction');
  assert.equal(RF.detectionRate(sim, defect, 0), 0, 'an unexposed defect had a positive hazard');
  /* Monitoring off still leaves the bug-report channel; both off leaves nothing. */
  const unmonitored = RF.createSimulation({ requestsPerHour: 10000, monitoringQuality: 0 });
  assert.ok(RF.detectionRate(unmonitored, defect, 1) > 0);
  const blind = RF.createSimulation({
    requestsPerHour: 10000, monitoringQuality: 0, userReportsPerAffectedRequest: 0,
  });
  assert.equal(RF.detectionRate(blind, defect, 1), 0);
  /* And a defect nothing exercises is invisible however good the monitoring. */
  assert.equal(RF.detectionRate(sim, { manifestRate: 0, trafficDetectability: 1 }, 1), 0);
});

test('the canary catch probability follows 1 - exp(-rate x soak) for a fixed defect', () => {
  /* The analytic form the model promises, checked against the engine's own rate function rather
     than against a number copied out of the documentation. */
  const soakHours = 2;
  const sim = RF.createSimulation({
    requestsPerHour: 5000, monitoringQuality: 0.8, canaryFraction: 0.05,
    canarySoakHours: soakHours,
  });
  for (const manifestRate of [0.3, 0.01, 1e-4, 1e-6]) {
    const defect = { manifestRate, trafficDetectability: 0.7 };
    const rate = RF.detectionRate(sim, defect, sim.params.canaryFraction);
    const p = 1 - Math.exp(-rate * soakHours);
    assert.ok(p >= 0 && p <= 1);
    if (manifestRate >= 0.3) assert.ok(p > 0.99, `an obvious defect should be caught: ${p}`);
    if (manifestRate <= 1e-6) assert.ok(p < 0.01, `a latent defect should escape: ${p}`);
  }
});

test('synthetic verification misses rare defects for the same reason a canary does', () => {
  const sim = RF.createSimulation({
    blueGreenSyntheticRequests: 2000, monitoringQuality: 0.7,
  });
  const p = (manifestRate) => RF.syntheticCatchProbability(
    sim, { manifestRate, trafficDetectability: 0.8 },
  );
  assert.ok(p(0.3) > 0.5, `an obvious defect should usually be caught: ${p(0.3)}`);
  /* 2000 synthetic requests against a one-in-100,000 defect: about one release in 90 catches it,
     which is "usually escapes" and not "never caught". The threshold is derived from
     1 - (1 - 1e-5)^2000 rather than chosen, so a change to the default request count moves the
     engine and this bound together. */
  const expectedRare = (1 - (1 - 1e-5) ** 2000) * 0.8 * 0.7;
  assert.ok(Math.abs(p(1e-5) - expectedRare) < 1e-12, `rare catch probability ${p(1e-5)}`);
  assert.ok(p(1e-5) < 0.05, `a rare defect should usually escape: ${p(1e-5)}`);
  assert.ok(p(1e-7) < 0.001, `a latent defect should almost never be caught: ${p(1e-7)}`);
  assert.ok(p(0.3) > p(0.01) && p(0.01) > p(1e-4), 'the probability is not monotone');
  /* No synthetic traffic catches nothing — the degenerate case stated rather than assumed. */
  const none = RF.createSimulation({ blueGreenSyntheticRequests: 0 });
  assert.equal(RF.syntheticCatchProbability(none, { manifestRate: 1, trafficDetectability: 1 }), 0);
});
