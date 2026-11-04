/* test-presets.mjs — the classroom presets, and the four-step experiment they exist to stage.
 *
 * A preset is a promise about what a student will see in the eight minutes this exercise gets. If
 * a tuning change quietly breaks step 2's "lead time improves, more defects reach users", the
 * lecture fails in the room and nothing else in the suite notices. So each step is run and the
 * movement it advertises is asserted.
 *
 * The experiment is also a controlled one by construction: each step differs from the one before in
 * EXACTLY ONE control. That is checked structurally, which is cheaper and stricter than reading the
 * table.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RF, DAY } from './harness.mjs';

const PRIMARY = ['arrivalRate', 'arrivalRatePerDay', 'testDepth', 'admissionPolicy',
  'releaseStrategy', 'batchSize'];

function runPreset(id, days = 120) {
  const sim = RF.createSimulation({ seed: RF.DEFAULT_SEED });
  RF.applyPreset(sim, id);
  RF.advanceSimulation(sim, { untilTime: days * DAY });
  return RF.snapshot(sim);
}

test('every preset names a real set of parameters and survives validation', () => {
  assert.ok(RF.PRESETS.length >= 8, `only ${RF.PRESETS.length} presets`);
  const ids = new Set();
  for (const p of RF.PRESETS) {
    assert.ok(p.id && p.name && p.why, `preset ${p.id} is missing a field`);
    assert.ok(!ids.has(p.id), `duplicate preset id ${p.id}`);
    ids.add(p.id);
    /* Applying it must leave a simulation the engine accepts, and must reset the clock. */
    const sim = RF.createSimulation({ seed: 5 });
    RF.advanceSimulation(sim, { untilTime: 10 * DAY });
    assert.ok(sim.time > 0);
    RF.applyPreset(sim, p.id);
    assert.equal(sim.time, 0, `preset ${p.id} did not reset the simulation`);
    assert.equal(sim.eventCount, 0);
    assert.equal(sim.ledger.length, 0);
  }
  assert.throws(() => RF.findPreset('no-such-preset'), RangeError);
});

test('each preset sets every primary control, so none inherits a stale one', () => {
  /* A preset that leaves one of the five primary controls unset would silently inherit whatever
     the student had chosen, and the step-to-step comparison the lecture depends on would stop
     being controlled. */
  for (const p of RF.PRESETS) {
    for (const key of PRIMARY) {
      assert.ok(Object.prototype.hasOwnProperty.call(p.params, key),
        `preset ${p.id} does not set ${key}`);
    }
    assert.ok(Object.prototype.hasOwnProperty.call(p.params, 'defectClassWeights'),
      `preset ${p.id} does not set the defect population`);
  }
});

test('the four numbered steps change exactly one control each', () => {
  const steps = RF.PRESETS.filter((p) => p.step).sort((a, b) => a.step - b.step);
  assert.deepEqual(steps.map((s) => s.step), [1, 2, 3, 4]);
  for (let i = 1; i < steps.length; i += 1) {
    const changed = [];
    for (const key of PRIMARY) {
      if (steps[i].params[key] !== steps[i - 1].params[key]) changed.push(key);
    }
    /* The arrival rate is two fields holding one control — a named rate or a numeric one — so a
       step that moves it reports both. Collapse that pair before counting. */
    const effective = changed.filter((k) => k !== 'arrivalRatePerDay' || !changed.includes('arrivalRate'));
    assert.equal(effective.length, 1,
      `step ${steps[i].step} changes ${changed.join(' and ')} from step ${steps[i - 1].step}`);
  }
  assert.equal(steps[1].params.testDepth !== steps[0].params.testDepth, true,
    'step 2 is supposed to change the test depth');
  assert.equal(steps[2].params.releaseStrategy, 'canary',
    'step 3 is supposed to turn the canary on');
  assert.equal(steps[3].params.arrivalRatePerDay, 120,
    'step 4 is supposed to raise the arrival rate');
});

test('step 1 produces the backlog it promises', () => {
  const s = runPreset('step-1-thorough');
  assert.ok(s.capacity.utilization > 1.5,
    `offered load is only ${s.capacity.utilization}x capacity`);
  assert.equal(s.capacity.state, 'bad');
  assert.ok(s.stages.backlog > 1000, `backlog is only ${s.stages.backlog}`);
  assert.ok(s.fourKeys.leadTimeHours.mean > 10 * RF.HOURS_PER_DAY,
    `lead time is only ${s.fourKeys.leadTimeHours.mean} h; the queue is supposed to dominate`);
  /* And the lesson that makes the step worth running: two of the four measures look HEALTHY while
     the organisation cannot ship. */
  assert.ok(s.fourKeys.changeFailureRate < 0.35, 'the failure rate is not flattering here');
  assert.ok(s.fourKeys.timeToRestoreHours.mean < 2, 'restoration is not fast here');
});

test('step 2 improves lead time and sends far more defective requests to users', () => {
  const one = runPreset('step-1-thorough');
  const two = runPreset('step-2-shallower');
  assert.ok(two.fourKeys.leadTimeHours.mean < one.fourKeys.leadTimeHours.mean / 5,
    `lead time only fell from ${one.fourKeys.leadTimeHours.mean} to `
    + `${two.fourKeys.leadTimeHours.mean} hours`);
  assert.ok(two.fourKeys.deploymentFrequencyPerDay > one.fourKeys.deploymentFrequencyPerDay * 1.5,
    'deployment frequency did not rise');
  assert.ok(two.stages.backlog < one.stages.backlog / 5, 'the backlog did not drain');
  /* The cost, which is the half a student will not predict. */
  assert.ok(two.userImpact.requestsExposedPerDay > one.userImpact.requestsExposedPerDay * 3,
    `requests exposed per day only went from ${one.userImpact.requestsExposedPerDay} to `
    + `${two.userImpact.requestsExposedPerDay}`);
  assert.ok(two.ledger.exposedInProduction > one.ledger.exposedInProduction * 2,
    'no more defects reached production with a shallower suite');
});

test('step 3 lowers exposure per failure without lowering the failure rate', () => {
  /* The author's point, as an assertion: "A canary may not change whether a deployment is
     classified as failed, but it can substantially change the consequences." */
  const two = runPreset('step-2-shallower');
  const three = runPreset('step-3-canary');
  const rateGap = Math.abs(three.fourKeys.changeFailureRate - two.fourKeys.changeFailureRate);
  assert.ok(rateGap < 0.1 * two.fourKeys.changeFailureRate + 0.03,
    `the failure rate moved from ${two.fourKeys.changeFailureRate} to `
    + `${three.fourKeys.changeFailureRate}; the canary is behaving like a test`);
  assert.ok(three.userImpact.perFailedDeployment.median
    < two.userImpact.perFailedDeployment.median / 5,
    `median exposure per failed deployment only went from `
    + `${two.userImpact.perFailedDeployment.median} to `
    + `${three.userImpact.perFailedDeployment.median}`);
  /* Some defects are caught in the soak and some are not — both halves have to be visible, or the
     step teaches that a canary is a filter rather than a sampler. */
  assert.ok(three.ledger.detectedDuringCanary > 50, 'the canary caught nothing');
  assert.ok(three.ledger.reachedWholeFleet > 20,
    'every single defect was caught inside the canary; the step cannot make its point');
  assert.equal(two.ledger.detectedDuringCanary, 0);
});

test('step 4 drives at least one stage past its capacity and bends the lead time', () => {
  const three = runPreset('step-3-canary');
  const four = runPreset('step-4-knee');
  assert.ok(four.capacity.offeredPerDay > three.capacity.offeredPerDay,
    'step 4 did not raise the arrival rate');
  assert.equal(four.capacity.lanes, three.capacity.lanes, 'step 4 changed the capacity');
  assert.equal(four.releaseCapacity.slots, three.releaseCapacity.slots);
  const saturated = four.capacity.utilization > 1 || four.releaseCapacity.utilization > 1;
  assert.ok(saturated,
    `neither stage is over capacity: build+test ${four.capacity.utilization}, `
    + `release ${four.releaseCapacity.utilization}`);
  /* The knee: load rose by a factor under three, lead time by far more. */
  const loadRatio = four.capacity.offeredPerDay / three.capacity.offeredPerDay;
  const leadRatio = four.fourKeys.leadTimeHours.mean / three.fourKeys.leadTimeHours.mean;
  assert.ok(leadRatio > loadRatio * 2,
    `load rose ${loadRatio}x and lead time ${leadRatio}x; there is no knee to show`);
  assert.ok(four.stages.backlog > three.stages.backlog * 5, 'the backlog did not grow');
});

test('the two defect-population presets bracket the canary question', () => {
  const obvious = runPreset('obvious-defects');
  const rare = runPreset('rare-defects');
  const soakShare = (s) => s.ledger.detectedDuringCanary / s.ledger.exposedInProduction;
  assert.ok(obvious.ledger.exposedInProduction > 20 && rare.ledger.exposedInProduction > 20,
    'too few defects reached production to compare');
  assert.ok(soakShare(obvious) > 0.9,
    `the canary caught only ${soakShare(obvious)} of obvious defects`);
  assert.ok(soakShare(rare) < 0.1,
    `the canary caught ${soakShare(rare)} of rare defects at a quiet service`);
});

test('the advisory preset shows a signal that shipped anyway', () => {
  const s = runPreset('advisory');
  assert.ok(s.ledger.signalledByTests > 50, 'the tests signalled almost nothing');
  assert.equal(s.ledger.detectedBeforeRelease, 0);
  assert.ok(s.admission.admittedWithFailingChecks > 50,
    'nothing shipped with a failing check, so the preset has nothing to show');
});

test('the one-change-per-release canary preset shows the release channel as a capacity', () => {
  const s = runPreset('canary-one-at-a-time');
  assert.ok(s.releaseCapacity.utilization > 1,
    `release channel utilisation is only ${s.releaseCapacity.utilization}`);
  assert.equal(s.releaseCapacity.state, 'bad');
  /* A one-hour soak plus the deploy delay caps the channel near twenty-four a day, and the
     MEASURED frequency lands beside that ceiling rather than under it: a canary rolled back
     DURING its soak frees the slot early, so a factory that fails more often cycles its release
     channel slightly faster. The nominal figure is a model of the clean path, which is exactly why
     the page labels it a model. */
  assert.ok(s.releaseCapacity.servicePerDay > 20 && s.releaseCapacity.servicePerDay < 25);
  assert.ok(s.fourKeys.deploymentFrequencyPerDay > s.releaseCapacity.servicePerDay * 0.8
    && s.fourKeys.deploymentFrequencyPerDay < s.releaseCapacity.servicePerDay * 1.25,
    `${s.fourKeys.deploymentFrequencyPerDay} deployments a day is far from the channel's nominal `
    + `${s.releaseCapacity.servicePerDay}`);
  /* Meanwhile the build-and-test stage is comfortable: the bottleneck moved. */
  assert.ok(s.capacity.utilization < 1);
});

test('the large-batch preset lowers frequency and raises the per-deployment failure rate', () => {
  const small = runPreset('step-2-shallower');
  const big = runPreset('big-batch');
  assert.equal(big.releaseCapacity.batchSize, 10);
  assert.ok(big.fourKeys.deploymentFrequencyPerDay < small.fourKeys.deploymentFrequencyPerDay);
  assert.ok(big.fourKeys.changeFailureRate > small.fourKeys.changeFailureRate);
  assert.ok(big.fourKeys.leadTimeHours.mean > small.fourKeys.leadTimeHours.mean);
});

test('the blue-green preset blocks before release and holds whole batches', () => {
  const s = runPreset('blue-green');
  assert.ok(s.admission.releasesAborted > 5,
    `only ${s.admission.releasesAborted} releases were aborted at verification`);
  assert.equal(s.ledger.detectedDuringCanary, 0);
  assert.ok(s.fourKeys.timeToRestoreHours.mean < 0.5,
    'a blue-green switch back is supposed to be fast');
});

test('the defaults preset restores the engine defaults exactly', () => {
  const sim = RF.createSimulation({ testDepth: 'smoke', batchSize: 10 });
  RF.applyPreset(sim, 'defaults');
  for (const key of ['arrivalRate', 'testDepth', 'admissionPolicy', 'releaseStrategy', 'batchSize']) {
    assert.equal(sim.params[key], RF.DEFAULTS[key], `${key} was not restored`);
  }
  assert.equal(sim.params.arrivalRatePerDay, null);
  assert.equal(sim.params.defectClassWeights, null);
});

test('a preset replays identically, every time', () => {
  for (const p of RF.PRESETS) {
    const a = runPreset(p.id, 40);
    const b = runPreset(p.id, 40);
    assert.deepEqual(b.fourKeys, a.fourKeys, `${p.id} did not replay`);
    assert.deepEqual(b.ledger, a.ledger, `${p.id} ledger did not replay`);
    assert.deepEqual(b.userImpact, a.userImpact, `${p.id} user impact did not replay`);
  }
});
