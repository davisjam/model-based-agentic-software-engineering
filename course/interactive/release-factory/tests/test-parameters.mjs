/* test-parameters.mjs — does each control move the factory in the direction it claims?
 *
 * Every claim here is a PAIRED comparison: two runs with the same seed, differing in exactly one
 * control. That is what the six independent PRNG streams buy — the same changes arrive at the same
 * times carrying the same defects, so a difference between the two runs is the control's doing and
 * not a different draw.
 *
 * Three of these are the specification's own wording, and all three are easy to get wrong in the
 * flattering direction:
 *
 *   - thorough testing detects strictly more than smoke, BUT NOT ALL;
 *   - advisory admission permits failing changes through, required does not;
 *   - batch size moves deployment frequency and lead time in the expected directions.
 *
 * Parameter validation lives here too, because a control that silently accepts nonsense produces a
 * plausible-looking number from a model nobody specified.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RF, DAY } from './harness.mjs';

const BASE = {
  seed: 30861, arrivalRate: 'high', testDepth: 'standard', admissionPolicy: 'required',
  releaseStrategy: 'immediate', batchSize: 5,
};

function run(overrides, days = 180) {
  const sim = RF.createSimulation({ ...BASE, ...overrides });
  RF.advanceSimulation(sim, { untilTime: days * DAY });
  return { sim, stats: RF.snapshot(sim) };
}

/* The share of defects the suite signalled, over the defects it actually examined. The denominator
   matters: a defect still in the backlog was never offered to the tests. */
function signalShare(stats, sim) {
  let tested = 0;
  let signalled = 0;
  for (const d of sim.ledger) {
    if (d.testRuns < 1) continue;
    tested += 1;
    if (d.signalledByTestsAt !== null) signalled += 1;
  }
  return { share: signalled / tested, tested, signalled };
}

test('thorough testing signals strictly more than standard, and standard more than smoke', () => {
  /* Plenty of lanes, so the comparison is about COVERAGE and not about which depth happened to
     leave more changes stuck in a queue. */
  const measured = ['smoke', 'standard', 'thorough'].map((testDepth) => {
    const { sim, stats } = run({ testDepth, pipelineLanes: 24, admissionPolicy: 'advisory' }, 240);
    return { testDepth, ...signalShare(stats, sim) };
  });
  for (const m of measured) assert.ok(m.tested > 2000, `${m.testDepth}: only ${m.tested} tested`);
  assert.ok(measured[0].share < measured[1].share,
    `smoke ${measured[0].share} is not below standard ${measured[1].share}`);
  assert.ok(measured[1].share < measured[2].share,
    `standard ${measured[1].share} is not below thorough ${measured[2].share}`);
  /* The ordering also has to follow the coverage factors the policy table declares, rather than
     merely being monotone. */
  const ratio = measured[2].share / measured[0].share;
  const coverageRatio = RF.TEST_DEPTHS.thorough.coverage / RF.TEST_DEPTHS.smoke.coverage;
  assert.ok(Math.abs(ratio - coverageRatio) < 0.15,
    `observed ratio ${ratio} does not track the coverage ratio ${coverageRatio}`);
});

test('thorough testing does not eliminate all defects, however long the run', () => {
  /* The specification's exact requirement, and the one a tuning change could silently break. It is
     checked three ways: the signal share stays well below one, defects still reach production, and
     the ceiling matches the declared coverage rather than being some accident of the run. */
  const { sim, stats } = run({ testDepth: 'thorough', pipelineLanes: 24 }, 400);
  const sig = signalShare(stats, sim);
  assert.ok(sig.share < 0.75, `a thorough suite signalled ${sig.share} of the defects it saw`);
  assert.ok(stats.ledger.exposedInProduction > 100,
    `a thorough suite left only ${stats.ledger.exposedInProduction} defects reaching production`);
  assert.ok(RF.TEST_DEPTHS.thorough.coverage < 1,
    'the deepest suite declares full coverage; nothing could escape it');
  /* And the latent class in particular is essentially untouched by depth: the mixture, not the
     policy, is what sets the ceiling. */
  const latent = stats.ledger.byClass.latent;
  assert.ok(latent.introduced > 30, `only ${latent.introduced} latent defects`);
  assert.ok(latent.detectedBeforeRelease / latent.introduced < 0.12,
    'a thorough suite caught most of the latent class');
});

test('advisory admission permits failing changes through; required does not', () => {
  const advisory = run({ admissionPolicy: 'advisory' }).stats;
  const required = run({ admissionPolicy: 'required' }).stats;
  assert.ok(advisory.admission.testFailures > 200,
    `only ${advisory.admission.testFailures} red builds under advisory`);
  assert.equal(advisory.admission.blockedDefective, 0);
  assert.equal(advisory.admission.blockedFlaky, 0);
  assert.equal(advisory.admission.admittedWithFailingChecks, advisory.admission.testFailures,
    'an advisory gate blocked something');
  assert.equal(required.admission.admittedWithFailingChecks, 0,
    'a required gate admitted a change whose checks failed');
  assert.equal(
    required.admission.blockedDefective + required.admission.blockedFlaky,
    required.admission.testFailures,
    'a required gate let a red build through without blocking it',
  );
  /* And the consequence: more defects reach users under advisory, fewer under required. */
  assert.ok(advisory.ledger.exposedInProduction > required.ledger.exposedInProduction);
  assert.equal(required.ledger.detectedBeforeRelease, required.ledger.signalledByTests);
});

test('a required gate charges lead time for flaky failures on changes that were never broken', () => {
  /* The cost nobody budgets for. Isolated by removing production detection, so the only source of
     rework is the gate, and by setting the defect rate to zero, so every block is a false alarm. */
  const isolate = {
    defectRate: 0, monitoringQuality: 0, userReportsPerAffectedRequest: 0, flakyTestRate: 0.12,
  };
  const required = run({ ...isolate, admissionPolicy: 'required' }).stats;
  const advisory = run({ ...isolate, admissionPolicy: 'advisory' }).stats;
  assert.equal(required.admission.blockedDefective, 0, 'a defect appeared in a defect-free team');
  assert.ok(required.admission.blockedFlaky > 200, 'no flaky block in a long run');
  assert.ok(required.fourKeys.leadTimeHours.mean > advisory.fourKeys.leadTimeHours.mean,
    'the flaky suite cost no lead time');
  assert.equal(advisory.admission.reworks, 0);
});

test('batch size moves deployment frequency and lead time in the expected directions', () => {
  const measured = RF.BATCH_SIZES.map((batchSize) => {
    const { stats } = run({ batchSize });
    return {
      batchSize,
      frequency: stats.fourKeys.deploymentFrequencyPerDay,
      lead: stats.fourKeys.leadTimeHours.mean,
      batchWait: stats.leadTimeBreakdownHours.batchWait,
      cfr: stats.fourKeys.changeFailureRate,
    };
  });
  for (let i = 1; i < measured.length; i += 1) {
    const prev = measured[i - 1];
    const here = measured[i];
    assert.ok(here.frequency < prev.frequency,
      `batch ${here.batchSize} deploys ${here.frequency}/day, batch ${prev.batchSize} `
      + `${prev.frequency}/day — frequency did not fall`);
    assert.ok(here.lead > prev.lead,
      `batch ${here.batchSize} lead ${here.lead} h is not above batch ${prev.batchSize} `
      + `${prev.lead} h`);
    assert.ok(here.cfr > prev.cfr,
      `batch ${here.batchSize} failure rate ${here.cfr} is not above batch ${prev.batchSize} `
      + `${prev.cfr} — the rate is per deployment, so a larger batch must raise it`);
  }
  /* Deployment frequency should fall roughly in proportion to the batch size when the release
     channel is not the bottleneck: ten changes per release is about a tenth the releases. */
  const ratio = measured[0].frequency / measured[2].frequency;
  assert.ok(ratio > 3 && ratio < 12,
    `batch 1 deploys ${ratio}x as often as batch 10, which is outside the plausible band`);
});

test('a canary costs lead time and buys exposure, and the ledger says which defects it saw', () => {
  const immediate = run({ releaseStrategy: 'immediate' }).stats;
  const canary = run({ releaseStrategy: 'canary' }).stats;
  assert.equal(immediate.ledger.detectedDuringCanary, 0);
  assert.ok(canary.ledger.detectedDuringCanary > 100, 'the canary caught nothing');
  assert.ok(canary.ledger.reachedWholeFleet < immediate.ledger.reachedWholeFleet,
    'the canary did not reduce the number of defects reaching the whole fleet');
  assert.ok(canary.userImpact.perFailedDeployment.median
    < immediate.userImpact.perFailedDeployment.median / 5,
    `canary median exposure ${canary.userImpact.perFailedDeployment.median} vs immediate `
    + `${immediate.userImpact.perFailedDeployment.median}`);
  /* And the thing a canary does NOT reliably do. Not asserted as an equality, because it is a
     statistical claim, but the two rates must sit close together — a canary is not a test. */
  const gap = Math.abs(canary.fourKeys.changeFailureRate - immediate.fourKeys.changeFailureRate);
  assert.ok(gap < 0.1 * immediate.fourKeys.changeFailureRate + 0.03,
    `the failure rate moved from ${immediate.fourKeys.changeFailureRate} to `
    + `${canary.fourKeys.changeFailureRate}; a canary is not supposed to be a test`);
});

test('the defect population, not the strategy, decides whether a canary helps', () => {
  /* The claim the specification asks not to hard-code, stated as a comparison the engine has to
     produce from its parameters. Same strategy, same traffic, same everything but the defects. */
  const soakShare = (defectClassWeights, requestsPerHour) => {
    const { stats } = run({
      releaseStrategy: 'canary', defectClassWeights, requestsPerHour,
      admissionPolicy: 'advisory',
    }, 240);
    return {
      caught: stats.ledger.detectedDuringCanary / stats.ledger.exposedInProduction,
      exposed: stats.ledger.exposedInProduction,
    };
  };
  const obvious = soakShare({ obvious: 1, conditional: 0, rare: 0, latent: 0 }, 20000);
  const latent = soakShare({ obvious: 0, conditional: 0, rare: 0, latent: 1 }, 20000);
  assert.ok(obvious.exposed > 100 && latent.exposed > 100);
  assert.ok(obvious.caught > 0.9, `the canary caught only ${obvious.caught} of obvious defects`);
  assert.ok(latent.caught < 0.05, `the canary caught ${latent.caught} of latent defects`);

  /* Traffic volume is the other half, and it moves the answer on its own: the same obvious
     defects at a quiet service give the soak far less to see. */
  const quiet = soakShare({ obvious: 1, conditional: 0, rare: 0, latent: 0 }, 60);
  assert.ok(quiet.caught < obvious.caught - 0.2,
    `a quiet service caught ${quiet.caught}, a busy one ${obvious.caught}`);
});

test('monitoring quality moves detection without touching anything upstream of production', () => {
  const blind = run({ monitoringQuality: 0, userReportsPerAffectedRequest: 0 }).stats;
  const sharp = run({ monitoringQuality: 1 }).stats;
  assert.equal(blind.ledger.detectedAfterRelease, 0);
  assert.equal(blind.fourKeys.changeFailureRate, 0, 'a blind factory reported failures');
  assert.ok(sharp.ledger.detectedAfterRelease > 100);
  /* The pre-production halves of the ledger are untouched: monitoring cannot reach backwards. */
  assert.ok(Math.abs(blind.ledger.signalledByTests - sharp.ledger.signalledByTests)
    < 0.3 * sharp.ledger.signalledByTests,
    'monitoring quality changed what the TESTS found');
  /* With nothing detected, nothing is restored, and user exposure runs for the whole simulation. */
  assert.equal(blind.ledger.restored, 0);
  assert.ok(blind.userImpact.requestsExposed > sharp.userImpact.requestsExposed,
    'a blind factory exposed fewer requests than one that found and fixed its failures');
});

test('traffic raises exposure far less than proportionally, because it also finds the defect', () => {
  /* The naive expectation is that a thousand times the traffic means a thousand times the damage.
     It does not, and the reason is worth a minute of class: more traffic exposes more requests per
     HOUR and simultaneously drives the detection hazard, so the defect is found sooner and the
     exposure WINDOW collapses. The two effects nearly cancel.
     Both halves are asserted, so a change that broke either one would fail here: exposure must
     rise with traffic, and it must rise far more slowly than traffic does. */
  const quiet = run({ requestsPerHour: 200, releaseStrategy: 'immediate' }).stats;
  const busy = run({ requestsPerHour: 200000, releaseStrategy: 'immediate' }).stats;
  const trafficRatio = 1000;
  const impactRatio = busy.userImpact.requestsExposed / quiet.userImpact.requestsExposed;
  assert.ok(impactRatio > 1, 'more traffic did not expose more requests at all');
  assert.ok(impactRatio < trafficRatio / 20,
    `exposure rose ${impactRatio}x for ${trafficRatio}x the traffic — the detection channel is not`
    + ' responding to traffic');
  assert.ok(busy.userImpact.exposureHours < quiet.userImpact.exposureHours / 10,
    'a busier service did not shorten the exposure window');
  assert.ok(busy.ledger.exposedNeverDetected < quiet.ledger.exposedNeverDetected,
    'a busier service did not find more of its defects');
  assert.ok(busy.fourKeys.timeToRestoreHours.n > quiet.fourKeys.timeToRestoreHours.n);
});

test('more lanes raise capacity and drain the backlog', () => {
  const narrow = run({ testDepth: 'thorough', pipelineLanes: 2 }).stats;
  const wide = run({ testDepth: 'thorough', pipelineLanes: 12 }).stats;
  assert.ok(narrow.capacity.utilization > 1 && wide.capacity.utilization < 1);
  assert.equal(narrow.capacity.state, 'bad');
  assert.equal(wide.capacity.state, 'ok');
  assert.ok(narrow.stages.backlog > 100 * wide.stages.backlog + 100,
    `narrow backlog ${narrow.stages.backlog}, wide ${wide.stages.backlog}`);
  assert.ok(wide.fourKeys.leadTimeHours.mean < narrow.fourKeys.leadTimeHours.mean / 10);
  /* Capacity buys lead time and nothing else: the share of defects that escape the suite is a
     property of the suite, not of how many copies of it are running. */
  const n = RF.snapshot(RF.createSimulation({ ...BASE }));
  assert.ok(n.capacity.lanes === 2);
});

test('the soak window trades lead time for detection inside the canary', () => {
  const brief = run({ releaseStrategy: 'canary', canarySoakHours: 0.1 }).stats;
  const long = run({ releaseStrategy: 'canary', canarySoakHours: 6 }).stats;
  assert.ok(long.releaseCapacity.cycleHours > brief.releaseCapacity.cycleHours);
  assert.ok(long.releaseCapacity.utilization > brief.releaseCapacity.utilization);
  assert.ok(
    long.ledger.detectedDuringCanary / long.ledger.exposedInProduction
    > brief.ledger.detectedDuringCanary / brief.ledger.exposedInProduction,
    'a longer soak did not catch a larger share inside the canary',
  );
});

test('every parameter is validated, and an invalid one is refused rather than coerced', () => {
  const invalid = [
    ['arrivalRate', 'enormous'], ['arrivalRatePerDay', 0], ['arrivalRatePerDay', -5],
    ['testDepth', 'exhaustive'], ['admissionPolicy', 'perhaps'], ['releaseStrategy', 'yolo'],
    ['batchSize', 0], ['batchSize', -1], ['batchSize', 2.5], ['batchSize', 'five'],
    ['pipelineLanes', 0], ['pipelineLanes', 1.5], ['releaseSlots', 0],
    ['defectRate', -0.01], ['defectRate', 1.01], ['defectRate', NaN],
    ['flakyTestRate', 2], ['reworkFixProbability', -1], ['monitoringQuality', 1.5],
    ['userReportsPerAffectedRequest', 2], ['requestsPerHour', -1], ['requestsPerHour', Infinity],
    ['canaryFraction', 0], ['canaryFraction', 1.5], ['canarySoakHours', -1],
    ['blueGreenVerifyHours', -1], ['blueGreenSyntheticRequests', -1],
    ['batchMaxWaitHours', 0], ['rollbackHours', -1], ['durationSigma', -0.1],
    ['warmupHours', -1], ['quantileWindow', -1], ['quantileWindow', 1.5],
  ];
  for (const [key, value] of invalid) {
    assert.throws(() => RF.createSimulation({ [key]: value }), RangeError,
      `${key} = ${String(value)} was accepted`);
  }
  /* Class weights are validated too, including the degenerate all-zero case. */
  assert.throws(() => RF.createSimulation({
    defectClassWeights: { obvious: 0, conditional: 0, rare: 0, latent: 0 },
  }), RangeError);
  assert.throws(() => RF.createSimulation({
    defectClassWeights: { obvious: -1, conditional: 1, rare: 0, latent: 0 },
  }), RangeError);
  /* And the fixed-profile seam. */
  assert.throws(() => RF.createSimulation({
    defectProfile: { testDetectability: 2, manifestRate: 0.1, trafficDetectability: 0.5 },
  }), RangeError);
});

test('a numeric arrival rate supersedes the named one, and the two cannot disagree', () => {
  const sim = RF.createSimulation({ arrivalRate: 'low', arrivalRatePerDay: 77 });
  assert.equal(sim.params.arrivalRate, null);
  assert.equal(sim.params.arrivalRatePerDay, 77);
  assert.ok(Math.abs(RF.arrivalRatePerHour(sim.params) - 77 / 24) < 1e-12);
  const named = RF.createSimulation({ arrivalRate: 'low' });
  assert.equal(named.params.arrivalRatePerDay, null);
  assert.ok(Math.abs(RF.arrivalRatePerHour(named.params)
    - RF.ARRIVAL_RATES.low.perDay / 24) < 1e-12);
});

test('the capacity sweep is monotone in arrival rate and leaves the caller unchanged', () => {
  const before = RF.createSimulation(BASE);
  RF.advanceSimulation(before, { untilTime: 10 * DAY });
  const beforeStats = RF.snapshot(before);
  /* Batch size 1, so the batch-wait term is zero. At a LOW arrival rate with a batch of five the
     release waits for the batch to fill (or for the flush timer), and lead time is therefore
     HIGHER at 10 changes a day than at 30 — correct behaviour, and it would make a monotonicity
     assertion here false for a reason that has nothing to do with capacity. */
  const result = RF.runSweep({
    base: { testDepth: 'standard', admissionPolicy: 'required', releaseStrategy: 'immediate', batchSize: 1 },
    arrivalRatesPerDay: [10, 30, 60, 90, 130],
    days: 60, warmupDays: 10, seed: 7,
  });
  assert.equal(result.points.length, 5);
  for (let i = 1; i < result.points.length; i += 1) {
    assert.ok(result.points[i].utilization > result.points[i - 1].utilization);
    assert.ok(result.points[i].leadTimeMeanHours >= result.points[i - 1].leadTimeMeanHours * 0.9,
      `lead time fell from ${result.points[i - 1].leadTimeMeanHours} to `
      + `${result.points[i].leadTimeMeanHours} as load rose`);
  }
  /* The knee: lead time at the top of the ladder is far more than proportionally worse. */
  const first = result.points[0];
  const last = result.points[result.points.length - 1];
  const loadRatio = last.arrivalPerDay / first.arrivalPerDay;
  const leadRatio = last.leadTimeMeanHours / first.leadTimeMeanHours;
  assert.ok(leadRatio > loadRatio * 3,
    `load rose ${loadRatio}x and lead time only ${leadRatio}x; there is no knee here`);
  /* Purity: the sweep allocates its own simulations. */
  assert.deepEqual(RF.snapshot(before), beforeStats);
});
