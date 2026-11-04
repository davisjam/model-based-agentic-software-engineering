/* test-randomness.mjs — the seeded generator, its five streams, and the distributions built on it.
 *
 * Seeded determinism is the property every other claim in this suite rests on: if the same seed and
 * the same parameters did not replay the same trace, no comparison between two policies would mean
 * anything, and the statistical validation would be measuring noise rather than the model.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RF, meanAndSd } from './harness.mjs';

test('the same seed replays the same sequence', () => {
  const a = RF.createRng(30861);
  const b = RF.createRng(30861);
  for (let i = 0; i < 5000; i += 1) {
    assert.equal(a(), b(), `diverged at draw ${i}`);
  }
});

test('different seeds produce different sequences', () => {
  const a = RF.createRng(1);
  const b = RF.createRng(2);
  let coincidences = 0;
  for (let i = 0; i < 1000; i += 1) if (a() === b()) coincidences += 1;
  assert.equal(coincidences, 0);
});

test('draws lie in [0,1) and are roughly uniform', () => {
  const rng = RF.createRng(7);
  const bins = new Array(10).fill(0);
  const n = 200000;
  for (let i = 0; i < n; i += 1) {
    const u = rng();
    assert.ok(u >= 0 && u < 1, `draw out of range: ${u}`);
    bins[Math.floor(u * 10)] += 1;
  }
  /* A chi-square goodness-of-fit against the 99.9% critical value for 9 degrees of freedom
     (27.88). Chosen over "every bin within x%" because the right band depends on n, and the
     chi-square statistic already carries that dependence. */
  const expected = n / 10;
  const chi2 = bins.reduce((acc, observed) => acc + ((observed - expected) ** 2) / expected, 0);
  assert.ok(chi2 < 27.88, `chi-square ${chi2.toFixed(2)} exceeds the 99.9% critical value 27.88`);
});

test('exponential samples are positive, finite, and have the specified mean', () => {
  const rng = RF.createRng(11);
  const rate = 4;
  const values = [];
  for (let i = 0; i < 200000; i += 1) {
    const x = RF.exponentialSample(rng, rate);
    assert.ok(x > 0 && Number.isFinite(x), `bad sample ${x}`);
    values.push(x);
  }
  /* The standard error of the mean of n exponentials is (1/rate)/sqrt(n); the band is four of
     them, i.e. a two-sided interval tighter than 99.99%. */
  const { mean, n } = meanAndSd(values);
  const se = (1 / rate) / Math.sqrt(n);
  assert.ok(Math.abs(mean - 1 / rate) < 4 * se,
    `mean ${mean} differs from ${1 / rate} by more than 4 SE (${(4 * se).toExponential(2)})`);
});

test('exponential rejects a non-positive or non-finite rate', () => {
  const rng = RF.createRng(1);
  for (const bad of [0, -1, NaN, Infinity, '3', null, undefined]) {
    assert.throws(() => RF.exponentialSample(rng, bad), RangeError, `accepted rate ${bad}`);
  }
});

test('the normal sampler has mean 0 and standard deviation 1', () => {
  const rng = RF.createRng(13);
  const values = [];
  for (let i = 0; i < 200000; i += 1) values.push(RF.normalSample(rng));
  const { mean, sd, n } = meanAndSd(values);
  assert.ok(Math.abs(mean) < 4 / Math.sqrt(n), `mean ${mean} is too far from 0`);
  assert.ok(Math.abs(sd - 1) < 4 / Math.sqrt(2 * n), `sd ${sd} is too far from 1`);
});

test('the lognormal duration multiplier has mean exactly 1 in expectation', () => {
  const rng = RF.createRng(17);
  const values = [];
  for (let i = 0; i < 400000; i += 1) values.push(RF.lognormalMultiplier(rng, 0.3));
  const { mean, sd, n } = meanAndSd(values);
  assert.ok(values.every((v) => v > 0), 'a multiplier was not positive');
  assert.ok(Math.abs(mean - 1) < 4 * sd / Math.sqrt(n),
    `mean ${mean} differs from 1 by more than 4 SE`);
});

test('a zero sigma makes durations deterministic without shifting the stream', () => {
  /* The contract is both halves: the multiplier is exactly 1, AND the stream advances by the same
     number of draws as it would have at a non-zero sigma. The second half is what lets a test
     switch to fixed durations without every subsequent draw landing somewhere else. */
  const a = RF.createRng(19);
  const b = RF.createRng(19);
  for (let i = 0; i < 100; i += 1) {
    assert.equal(RF.lognormalMultiplier(a, 0), 1);
    RF.lognormalMultiplier(b, 0.3);
  }
  assert.equal(a.state(), b.state(), 'sigma = 0 consumed a different number of draws');
});

test('the streams are independent: a policy change does not move the commit sequence', () => {
  /* This is the controlled-experiment property. Two runs that differ only in a POLICY must see the
     same team: the same commits, at the same times, carrying the same defects with the same
     attributes. Separate streams are how that is arranged, so it is checked rather than assumed. */
  const commitTrace = (options) => {
    const sim = RF.createSimulation({ seed: 4242, traceLimit: 0, ...options });
    const commits = [];
    for (let i = 0; i < 4000; i += 1) {
      const ev = RF.stepSimulation(sim);
      if (ev === null) break;
      if (ev.kind === 'commit') commits.push(ev.time);
    }
    /* Only the COMMIT-origin defects. A defect a rework introduces is a consequence of the
       policy under test — a policy that reworks more changes genuinely produces more of them —
       so including those would assert the absence of an effect the model is meant to have. They
       draw from their own stream precisely so that this slice stays comparable. */
    const defects = sim.ledger
      .filter((d) => d.origin === 'commit')
      .map((d) => `${d.classId}:${d.testDetectability}:${d.manifestRate}:${d.introducedAt}`);
    return { commits, defects };
  };
  const base = commitTrace({});
  assert.ok(base.commits.length > 200, `only ${base.commits.length} commits observed`);
  for (const variant of [
    { testDepth: 'smoke' },
    { admissionPolicy: 'advisory' },
    { releaseStrategy: 'canary' },
    { releaseStrategy: 'blueGreen' },
    { batchSize: 10 },
    { monitoringQuality: 0.1 },
    { requestsPerHour: 1 },
  ]) {
    const other = commitTrace(variant);
    const label = JSON.stringify(variant);
    const common = Math.min(base.commits.length, other.commits.length);
    assert.ok(common > 150, `${label}: too few common commits to compare (${common})`);
    for (let i = 0; i < common; i += 1) {
      assert.equal(other.commits[i], base.commits[i], `${label}: commit ${i} moved`);
    }
    const defectCommon = Math.min(base.defects.length, other.defects.length);
    assert.ok(defectCommon > 20, `${label}: too few common defects to compare`);
    for (let i = 0; i < defectCommon; i += 1) {
      assert.equal(other.defects[i], base.defects[i], `${label}: defect ${i} drew different attributes`);
    }
  }
});

test('a fixed defect profile does not shift the defect stream', () => {
  /* The profile override exists so a statistical check can compute an exact analytical answer. It
     must therefore consume the same four draws as a freely drawn defect, or every subsequent
     attribute in the run would land somewhere else.
     The scenario removes every feedback path first — advisory admission blocks nothing, a zero
     flake rate reworks nothing, and with monitoring and bug reports both off nothing is ever
     detected or rolled back — so the only thing that could move the defect stream IS the
     override. With a feedback path left in, the attributes legitimately diverge (a different
     manifest rate changes which releases roll back, and a rollback can introduce a new defect),
     and the test would be asserting the absence of a real effect. */
  const run = (profile) => {
    const sim = RF.createSimulation({
      seed: 31, defectProfile: profile, arrivalRate: 'medium', admissionPolicy: 'advisory',
      flakyTestRate: 0, monitoringQuality: 0, userReportsPerAffectedRequest: 0,
    });
    RF.advanceSimulation(sim, { untilTime: 24 * 40 });
    return {
      introductions: sim.ledger.map((d) => d.introducedAt).join(','),
      streamState: sim.rng.defect.state(),
      count: sim.ledger.length,
    };
  };
  const free = run(null);
  const fixed = run({ testDetectability: 0.5, manifestRate: 0.01, trafficDetectability: 0.5 });
  assert.ok(free.count > 20, `only ${free.count} defects introduced`);
  assert.equal(fixed.introductions, free.introductions,
    'the profile override changed when defects were introduced');
  assert.equal(fixed.streamState, free.streamState,
    'the profile override consumed a different number of draws');
});

test('the engine calls no unseeded random source and reads no clock', async () => {
  /* Comments are stripped first. The check is about CODE, and the engine's own documentation names
     the banned call in order to explain why it is banned — a raw text search would therefore
     fail on the sentence that promises the property. */
  const { extractEngineSource } = await import('./harness.mjs');
  const source = extractEngineSource()
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
  assert.ok(!/Math\s*\.\s*random/.test(source),
    'the engine references Math.random, which would destroy seeded reproducibility');
  assert.ok(!/Date\s*\.\s*now|new\s+Date|performance\s*\.\s*now/.test(source),
    'the engine reads a clock, which would make a run unreproducible');
  assert.ok(!/\bdocument\b|localStorage|fetch\s*\(|XMLHttpRequest/.test(source),
    'the engine touches a browser surface, so it is no longer a pure model');
});
