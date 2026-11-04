/* test-metrics.mjs — the Four Keys measures and the fifth one, user impact.
 *
 * Four definitional choices decide whether these numbers mean what the course says they mean, and
 * each is easy to get subtly wrong:
 *
 *   - lead time is measured COMMIT to production, including any rework, not from the last attempt;
 *   - change failure rate is over DEPLOYMENTS, not over changes;
 *   - time to restore starts at DETECTION, not at exposure;
 *   - user impact accumulates only WHILE a defective release is exposed, scaled by the share of
 *     traffic it is serving.
 *
 * This file pins all four, and pins the honesty guards around them: no deployments means no
 * failure rate rather than a zero, and a release carrying a defect nobody detected is reported
 * beside the failure rate rather than folded into it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RF, DAY } from './harness.mjs';

function run(options, days = 180) {
  const sim = RF.createSimulation({
    seed: 30861, arrivalRate: 'high', testDepth: 'standard', batchSize: 5, ...options,
  });
  RF.advanceSimulation(sim, { untilTime: days * DAY });
  return { sim, stats: RF.snapshot(sim) };
}

test('deployment frequency counts deployments that reached users, per measured day', () => {
  const { sim, stats } = run({ releaseStrategy: 'immediate' });
  const days = stats.measuredHours / RF.HOURS_PER_DAY;
  assert.ok(Math.abs(stats.fourKeys.deploymentFrequencyPerDay - stats.deployments.total / days) < 1e-9);
  assert.equal(stats.deployments.succeeded, stats.deployments.total - stats.deployments.failed);
  assert.ok(Math.abs(stats.fourKeys.successfulDeploymentFrequencyPerDay
    - stats.deployments.succeeded / days) < 1e-9);
  /* A release aborted at blue-green verification never reached users, so it must not be in the
     count. Checked on the strategy that can abort. */
  const bg = run({ releaseStrategy: 'blueGreen', admissionPolicy: 'advisory' }).stats;
  assert.ok(bg.admission.releasesAborted > 0);
  /* Every release either reached users (a deployment), was aborted at verification, or is still
     open at the horizon — and nothing can be open beyond the number of release slots. */
  const unaccounted = bg.deployments.releasesStarted - bg.admission.releasesAborted
    - bg.deployments.total;
  assert.ok(unaccounted >= 0 && unaccounted <= bg.stages.releasesInFlight,
    `${unaccounted} releases are unaccounted for, with ${bg.stages.releasesInFlight} open`);
  assert.ok(sim.counters.deployments > 0);
});

test('lead time runs from the original commit, through any rework, to first exposure', () => {
  const { sim } = run({ admissionPolicy: 'required', releaseStrategy: 'immediate' });
  const delivered = [];
  for (const r of sim.liveReleases) for (const c of r.changes) delivered.push(c);
  /* Reach into the change objects a live release still holds and check the arithmetic directly,
     rather than trusting the aggregate that was computed from them. */
  assert.ok(delivered.length > 0, 'no delivered change was reachable to check');
  for (const c of delivered) {
    assert.equal(c.leadTime, c.firstExposureAt - c.commitTime);
    const p = c.leadParts;
    const parts = p.waitForLane + p.test + p.rework + p.batchWait + p.deploy;
    assert.ok(Math.abs(parts - c.leadTime) < 1e-9,
      `change ${c.id}: the breakdown sums to ${parts} but lead time is ${c.leadTime}`);
    if (p.rework > 0) {
      assert.ok(c.attempt > 1, `change ${c.id} was charged rework without a second attempt`);
    }
  }
  /* A change that was blocked and reworked before reaching production exists, so the clause
     above is exercised rather than vacuous. */
  assert.ok(delivered.some((c) => c.leadParts.rework > 0),
    'no reworked change was delivered; the rework term is untested');
});

test('required checks cost lead time; the rework shows up in the breakdown', () => {
  /* Monitoring and bug reports off, so NOTHING is ever detected in production and no release is
     ever rolled back. The only route to rework is then the admission gate itself, which is the
     effect under test. With rollbacks left in, an advisory policy accrues plenty of rework from
     its own failures and the comparison measures two causes at once. */
  const isolate = {
    releaseStrategy: 'immediate', monitoringQuality: 0, userReportsPerAffectedRequest: 0,
  };
  const required = run({ ...isolate, admissionPolicy: 'required' }).stats;
  const advisory = run({ ...isolate, admissionPolicy: 'advisory' }).stats;
  assert.equal(advisory.admission.reworks, 0, 'an advisory gate reworked something');
  assert.ok(required.admission.reworks > 100, `only ${required.admission.reworks} reworks`);
  assert.ok(required.leadTimeBreakdownHours.rework > 0);
  assert.equal(advisory.leadTimeBreakdownHours.rework, 0);
  assert.ok(required.fourKeys.leadTimeHours.mean > advisory.fourKeys.leadTimeHours.mean,
    'a required gate did not cost any lead time');
  /* The breakdown sums to the mean lead time. */
  for (const s of [required, advisory]) {
    const b = s.leadTimeBreakdownHours;
    const total = b.waitForLane + b.test + b.rework + b.batchWait + b.deploy;
    assert.ok(Math.abs(total - s.fourKeys.leadTimeHours.mean) < 1e-6,
      `breakdown ${total} vs mean ${s.fourKeys.leadTimeHours.mean}`);
  }
});

test('change failure rate is over deployments, not over changes', () => {
  /* The clearest demonstration: hold every other policy fixed and raise the batch size. The share
     of defective CHANGES barely moves, and the share of failing DEPLOYMENTS rises, because each
     deployment now carries more changes and fails if any of them does. A rate computed over
     changes could not behave this way. */
  const rates = [1, 5, 10].map((batchSize) => {
    const { stats } = run({ batchSize, releaseStrategy: 'immediate' });
    return {
      batchSize,
      cfr: stats.fourKeys.changeFailureRate,
      perChange: stats.ledger.detectedAfterRelease / stats.admission.commits,
      deployments: stats.deployments.total,
      failed: stats.deployments.failed,
    };
  });
  for (const r of rates) {
    assert.ok(Math.abs(r.cfr - r.failed / r.deployments) < 1e-12, 'the ratio does not match');
  }
  assert.ok(rates[2].cfr > rates[0].cfr * 2,
    `batch 10 CFR ${rates[2].cfr} is not well above batch 1 CFR ${rates[0].cfr}`);
  assert.ok(Math.abs(rates[2].perChange - rates[0].perChange) < rates[0].perChange,
    'the per-change defect share moved as much as the per-deployment rate');
});

test('a failure rate is withheld rather than reported as zero when nothing deployed', () => {
  const sim = RF.createSimulation({ arrivalRatePerDay: 1e-9 });
  RF.advanceSimulation(sim, { untilTime: 30 * DAY });
  const s = RF.snapshot(sim);
  assert.equal(s.deployments.total, 0);
  assert.equal(s.fourKeys.changeFailureRate, null);
  assert.equal(s.fourKeys.leadTimeHours.mean, null);
  assert.equal(s.fourKeys.timeToRestoreHours.mean, null);
  assert.equal(s.fourKeys.leadTimeHours.median, null);
});

test('the failure rate is a measurement, and the undetected defects are reported beside it', () => {
  /* The honesty guard. A deployment carrying a defect nobody noticed is NOT in the numerator —
     true of the metric, false of the software — so the snapshot carries the count that says so. */
  const { stats } = run({
    releaseStrategy: 'immediate', requestsPerHour: 400,
    defectClassWeights: { obvious: 0, conditional: 0, rare: 0.4, latent: 0.6 },
  });
  assert.ok(stats.deployments.carryingUndetectedDefect > 0);
  assert.equal(stats.deployments.carryingUndetectedDefect, stats.ledger.exposedNeverDetected);
  const classified = stats.deployments.failed;
  assert.ok(stats.deployments.carryingUndetectedDefect > classified * 0.1,
    'the undetected population is too small to make the point');
});

test('time to restore is measured from detection, not from exposure', () => {
  /* One change per release, so each rollback is triggered by the one defect it carries. With a
     larger batch a second defect can be detected after the restore was already scheduled, and its
     own detection-to-restore interval is legitimately SHORTER than the configured rollback — one
     restore serves every defect in the batch. */
  const { sim, stats } = run({ releaseStrategy: 'immediate', durationSigma: 0, batchSize: 1 });
  const restored = sim.ledger.filter((d) => d.restoredAt !== null);
  assert.ok(restored.length > 100, `only ${restored.length} restorations`);
  for (const d of restored) {
    const ttr = d.restoredAt - d.detectedAfterReleaseAt;
    assert.ok(ttr >= 0);
    /* Deterministic durations, so every restore equals the configured rollback time exactly. */
    assert.ok(Math.abs(ttr - sim.params.rollbackHours) < 1e-9,
      `restore took ${ttr} h, not the configured ${sim.params.rollbackHours} h`);
    assert.ok(d.restoredAt - d.exposedInProductionAt >= ttr,
      'the restore window is longer than the exposure window');
  }
  assert.ok(Math.abs(stats.fourKeys.timeToRestoreHours.mean - sim.params.rollbackHours) < 1e-9);
});

test('a canary rollback restores faster than a full-fleet rollback, because it is configured to', () => {
  /* Not an emergent claim: draining a canary and reverting a full fleet are different operations
     with different configured durations. The test pins that the engine picks the right one. */
  const { sim } = run({
    releaseStrategy: 'canary', durationSigma: 0, batchSize: 1,
    canaryRollbackHours: 0.1, rollbackHours: 1.0,
  });
  let inCanary = 0;
  let fullFleet = 0;
  for (const d of sim.ledger) {
    if (d.restoredAt === null) continue;
    const ttr = d.restoredAt - d.detectedAfterReleaseAt;
    if (d.detectedDuringCanary) { assert.ok(Math.abs(ttr - 0.1) < 1e-9, `canary TTR ${ttr}`); inCanary += 1; }
    else { assert.ok(Math.abs(ttr - 1.0) < 1e-9, `full-fleet TTR ${ttr}`); fullFleet += 1; }
  }
  assert.ok(inCanary > 10, `only ${inCanary} canary restorations`);
  assert.ok(fullFleet > 3, `only ${fullFleet} full-fleet restorations`);
});

test('user impact accrues only while a defective release is exposed, at the exposed share', () => {
  /* Deterministic arithmetic: one lane, one change per release, a defect on every change, no
     monitoring and no bug reports, so the first defective release is exposed from its rollout to
     the end of the run and the integral is exactly requestsPerHour x hours. */
  const requestsPerHour = 1000;
  const sim = RF.createSimulation({
    seed: 2, arrivalRate: 'low', testDepth: 'smoke', admissionPolicy: 'advisory',
    releaseStrategy: 'immediate', defectRate: 1, flakyTestRate: 0, batchSize: 1,
    monitoringQuality: 0, userReportsPerAffectedRequest: 0, durationSigma: 0, requestsPerHour,
    defectProfile: { testDetectability: 0, manifestRate: 0.25, trafficDetectability: 0.9 },
  });
  RF.advanceSimulation(sim, { untilTime: 30 * DAY });
  const s = RF.snapshot(sim);
  assert.equal(s.ledger.detectedAfterRelease, 0, 'something was detected with no detection channel');
  assert.ok(s.userImpact.exposureHours > 0);
  /* Several releases are live at once, each at full exposure, so exposure-hours exceeds wall time
     and the per-hour figure must still be exactly the configured traffic. */
  assert.ok(Math.abs(s.userImpact.requestsExposed / s.userImpact.exposureHours - requestsPerHour)
    < 1e-6, 'the exposure rate is not the configured traffic');
  /* Affected requests are the exposed requests times the manifest rate. */
  assert.ok(Math.abs(s.userImpact.requestsAffected / s.userImpact.requestsExposed - 0.25) < 1e-9);
});

test('a canary exposes a twentieth of the traffic a full rollout does, for the same window', () => {
  /* The mechanism behind the fifth metric, isolated from every other effect: identical defect,
     identical traffic, no detection at all, so the only difference between the two runs is the
     share of traffic the release is serving. */
  const base = {
    seed: 4, arrivalRate: 'low', testDepth: 'smoke', admissionPolicy: 'advisory',
    defectRate: 1, flakyTestRate: 0, batchSize: 1, monitoringQuality: 0,
    userReportsPerAffectedRequest: 0, durationSigma: 0, requestsPerHour: 1000,
    canaryFraction: 0.05, canarySoakHours: 1e6,  /* a soak that never ends, so nothing graduates */
    defectProfile: { testDetectability: 0, manifestRate: 0.25, trafficDetectability: 0.9 },
  };
  const exposure = (releaseStrategy) => {
    const sim = RF.createSimulation({ ...base, releaseStrategy });
    RF.advanceSimulation(sim, { untilTime: 60 * DAY });
    return RF.snapshot(sim).userImpact;
  };
  const immediate = exposure('immediate');
  const canary = exposure('canary');
  /* The canary holds the single release slot for the whole run, so it exposes ONE release at 5%
     while the immediate strategy ships many at 100%. Compare the per-exposure-hour rate, which is
     the quantity the fraction controls. */
  const immediateRate = immediate.requestsExposed / immediate.exposureHours;
  const canaryRate = canary.requestsExposed / canary.exposureHours;
  assert.ok(Math.abs(immediateRate - 1000) < 1e-6, `immediate rate ${immediateRate}`);
  assert.ok(Math.abs(canaryRate - 50) < 1e-6, `canary rate ${canaryRate}`);
  assert.ok(canary.requestsExposed < immediate.requestsExposed / 10,
    'the canary did not reduce total exposure');
});

test('the per-failed-deployment exposure distribution is kept, and the canary moves its median', () => {
  /* The aggregate alone hides what a canary does: total exposure is dominated by the long tail of
     slowly-detected defects, so the mean barely moves while the TYPICAL failure's exposure falls
     by the traffic share. Keeping the distribution is what makes that legible. */
  const immediate = run({ releaseStrategy: 'immediate' }).stats.userImpact;
  const canary = run({ releaseStrategy: 'canary' }).stats.userImpact;
  assert.ok(immediate.perFailedDeployment.n > 100);
  assert.ok(canary.perFailedDeployment.n > 100);
  assert.ok(canary.perFailedDeployment.median < immediate.perFailedDeployment.median / 5,
    `canary median ${canary.perFailedDeployment.median} vs immediate `
    + `${immediate.perFailedDeployment.median}`);
});

test('user impact is zero when no defect reaches production', () => {
  const clean = run({ defectRate: 0 }).stats;
  assert.equal(clean.userImpact.requestsExposed, 0);
  assert.equal(clean.userImpact.requestsAffected, 0);
  assert.equal(clean.userImpact.exposureHours, 0);
  assert.equal(clean.userImpact.liveUndetectedDefects, 0);
  const quiet = run({ requestsPerHour: 0 }).stats;
  assert.ok(quiet.ledger.exposedInProduction > 0, 'no defect was exposed in the no-traffic run');
  assert.equal(quiet.userImpact.requestsExposed, 0, 'a service with no traffic exposed requests');
});

test('a snapshot is a pure read: taking one changes nothing', () => {
  const sim = RF.createSimulation({ seed: 8, releaseStrategy: 'canary' });
  RF.advanceSimulation(sim, { untilTime: 40 * DAY });
  const first = RF.snapshot(sim);
  for (let i = 0; i < 20; i += 1) RF.snapshot(sim);
  const after = RF.snapshot(sim);
  assert.deepEqual(after, first);
  /* And the live-exposure arithmetic keeps rising with simulated time without double-counting. */
  RF.advanceSimulation(sim, { untilTime: 41 * DAY });
  const later = RF.snapshot(sim);
  assert.ok(later.userImpact.requestsExposed >= first.userImpact.requestsExposed);
});

test('quantiles are ordered and come from the window they claim', () => {
  const { stats } = run({ releaseStrategy: 'immediate' });
  const lead = stats.fourKeys.leadTimeHours;
  assert.ok(lead.median <= lead.p90, `median ${lead.median} exceeds p90 ${lead.p90}`);
  assert.ok(lead.windowed <= lead.n);
  assert.ok(lead.windowed > 1000, `only ${lead.windowed} observations in the quantile window`);
  /* The quantile helper itself, on a known sample. */
  assert.equal(RF.quantile([1, 2, 3, 4, 5], 0.5), 3);
  assert.equal(RF.quantile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(RF.quantile([10], 0.9), 10);
  assert.equal(RF.quantile([], 0.5), null);
});

test('the warm-up window excludes early observations from every aggregate', () => {
  const warm = run({ warmupHours: 30 * DAY, releaseStrategy: 'immediate' }, 60).stats;
  const cold = run({ warmupHours: 0, releaseStrategy: 'immediate' }, 60).stats;
  assert.ok(warm.measuredHours < cold.measuredHours);
  assert.ok(warm.deployments.total > 0);
  /* Deployment counts are NOT warm-up-gated (they count what happened), but the measured window
     they are divided by is — which is the documented behaviour, so it is pinned rather than left
     for a reader to infer. */
  assert.ok(Math.abs(warm.fourKeys.deploymentFrequencyPerDay
    - warm.deployments.total / (warm.measuredHours / RF.HOURS_PER_DAY)) < 1e-9);
  assert.ok(warm.fourKeys.leadTimeHours.n < cold.fourKeys.leadTimeHours.n,
    'the warm-up did not drop any lead-time observation');
});
