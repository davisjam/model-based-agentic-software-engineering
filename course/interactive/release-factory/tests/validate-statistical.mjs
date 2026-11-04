#!/usr/bin/env node
/* validate-statistical.mjs — does the engine actually produce the probabilities and delays the
 * model specifies?
 *
 *   node validate-statistical.mjs            short tier  (~20 s)
 *   node validate-statistical.mjs --full     full tier   (~3 min)
 *
 * Unit tests pin structure: that a defect cannot be both blocked and exposed, that a restore
 * follows a detection. They cannot tell us whether a thorough suite signals a defect with the
 * probability the mixture implies, or whether the time to notice a failure in production is
 * exponential with the rate the hazard formula gives. Those are the claims the whole exercise
 * rests on, because a student reads the simulator's numbers as evidence. This file checks them and
 * PRINTS THE EVIDENCE rather than only a verdict.
 *
 * ==================================================================================================
 * Why there is no fixed percentage tolerance, and how each band is derived
 * ==================================================================================================
 *
 * A flat rule such as "within 2%" is wrong in both directions at once. For a probability of 0.9
 * measured over 20,000 trials the sampling standard error is 0.2 percentage points, so a 2% band
 * is ten times too loose and a real defect walks through it. For a probability of 0.005 measured
 * over 400 trials the standard error is 0.35 percentage points on a base of 0.5, which is 70%
 * relative — a 2% band would fail on arithmetic every time. The right band depends on the
 * quantity, the specified value, and the sample size, so every check below computes its own.
 *
 * Two families, two derivations:
 *
 *   PROPORTIONS (defect rate, test signal rate, flake rate, canary catch rate, synthetic catch
 *   rate, class mixture). Each trial is an independent Bernoulli draw with a probability the model
 *   SPECIFIES, so the sampling distribution of the observed share is exactly binomial and its
 *   standard error is sqrt(p(1-p)/n) with no estimation involved. The band is
 *
 *       |observed - specified|  <=  3.2905 * sqrt(p * (1 - p) / n)
 *
 *   where 3.2905 is the normal 99.9% two-sided quantile. A correct engine therefore fails about
 *   once in a thousand per assertion — and because every run here is SEEDED, in practice it either
 *   passes forever or reports a real defect.
 *
 *   That band needs both n*p and n*(1-p) above about 10, and the most interesting checks here sit
 *   outside it: a canary catches an obvious defect with probability 0.99994. So when one tail is
 *   sparse the band moves to the COUNT of the rarer outcome, which is Poisson. The switch, its
 *   justification, and the regime actually used are printed per row — see `reportProportion`.
 *
 *   MEANS (test duration, rework duration, restore duration, time to detect, exposure per
 *   failure, inter-commit time). Here the per-observation variance is a property of the
 *   distribution rather than of a specified probability, and observations within one run are not
 *   independent — a single long test run delays everything behind it. So the band is MEASURED from
 *   R INDEPENDENT RUNS rather than assumed:
 *
 *       |grand mean - specified|  <=  t(0.001, R-1) * s / sqrt(R)
 *
 *   using the one-tailed 0.1% Student quantile, i.e. a two-sided 99.8% interval. Student's t and
 *   not 3 sigma: with R = 8 runs the sampling distribution of the mean has 7 degrees of freedom and
 *   much heavier tails than a normal (t = 5.408, not 3), and a band built on 3 would report a bias
 *   that is not there. A PRECISION guard holds the other direction: the standard error must sit
 *   below a stated share of the specified value, or the check would be satisfied by an interval so
 *   wide it asserts nothing. A precision failure is a finding about the run budget, labelled as
 *   such rather than reported as a defect in the engine.
 *
 * ==================================================================================================
 * Why several scenarios switch things off
 * ==================================================================================================
 *
 * The factory has feedback: a defect that reaches production causes a rollback, the rollback
 * causes rework, and rework introduces defects. That is the behaviour the exercise is about, and
 * it is also what makes a naive measurement of any one probability wrong — the DENOMINATOR moves.
 * So each scenario below removes exactly the feedback paths that would contaminate the quantity it
 * is measuring, and says which ones and why. A check that cannot be isolated is not run.
 */
import { RF, meanAndSd, binomialTolerance, DAY } from './harness.mjs';

const full = process.argv.includes('--full');
const Z = 3.2905;                       /* normal 99.9% two-sided quantile */

/* One-tailed 0.1% Student quantiles (two-sided 99.8% intervals), by degrees of freedom. */
const T_0_001 = { 3: 10.215, 5: 6.869, 7: 5.408, 9: 4.781, 11: 4.437, 15: 4.073, 19: 3.883 };
function tCritical(df) {
  if (T_0_001[df] === undefined) throw new Error(`no t quantile tabulated for df = ${df}`);
  return T_0_001[df];
}

const TIER = full
  ? { days: 900, runs: 12, label: 'full' }
  : { days: 260, runs: 8, label: 'short' };

/* Seeds spaced far apart in the counter-based generator's cycle. The generator is a counter hash
   with a fixed odd increment, so two seeds address the same global cycle offset by a fixed number
   of draws; spacing them by a large stride keeps a run from walking into a sibling's stream. */
function seeds(count) {
  const out = [];
  for (let i = 0; i < count; i += 1) out.push((30861 + i * 104729) >>> 0);
  return out;
}

const rows = [];
let failures = 0;
let precisionFailures = 0;

function report(name, specified, observed, tolerance, n, note) {
  const ok = Math.abs(observed - specified) <= tolerance;
  if (!ok) failures += 1;
  rows.push({ name, specified, observed, tolerance, n, ok, note: note || '' });
  return ok;
}

/* A proportion check. Which band applies depends on where the specified probability sits:
 *
 *   BULK (both n*p and n*(1-p) >= 10) — the normal approximation to the binomial is trustworthy,
 *   so the band is Z * sqrt(p(1-p)/n) on the SHARE.
 *
 *   TAIL (one side below 10) — the normal approximation is not, and this is the regime the
 *   interesting cases live in: a canary catches an obvious defect with probability 0.99994, and a
 *   latent one with probability 0.0003. So the band moves to the COUNT of the rarer outcome,
 *   which is Poisson with mean n*min(p,1-p): |observed - expected| <= Z*sqrt(expected) + 3. The
 *   additive 3 covers the discreteness of a Poisson with a mean below one, where the distribution
 *   is almost entirely at zero and a sqrt band would be narrower than one whole count. When the
 *   specified probability is exactly 0 or 1 the term vanishes and the count must match exactly,
 *   which is what we want: if the model says a defect is certain to be caught inside the soak,
 *   one escape is a defect in the engine and not a sampling fluctuation.
 *
 * Reporting the regime in the note matters as much as the verdict. The first version of this file
 * treated a tail probability as a PRECISION failure and printed FAIL beside an observed value that
 * was exactly right — the band was wrong, not the engine, which is the same error the sibling
 * simulator's validation records in its own history. */
function reportProportion(name, specified, observedCount, n, note) {
  const share = observedCount / n;
  const rarerP = Math.min(specified, 1 - specified);
  if (n * rarerP >= 10) {
    report(name, specified, share, binomialTolerance(specified, n, Z), n,
      `${note}; normal binomial band`);
    return;
  }
  /* Tail regime: compare counts of the rarer outcome. */
  const rareObserved = specified > 0.5 ? n - observedCount : observedCount;
  const rareExpected = n * rarerP;
  const band = Z * Math.sqrt(rareExpected) + (rareExpected > 0 ? 3 : 0);
  const ok = Math.abs(rareObserved - rareExpected) <= band;
  if (!ok) failures += 1;
  rows.push({
    name,
    specified,
    observed: share,
    tolerance: band / n,
    n,
    ok,
    note: `${note}; Poisson band on the rarer outcome: expected ${fmt(rareExpected)},`
      + ` observed ${rareObserved}, band ${fmt(band)} counts`,
  });
}

function fmt(v) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e6)) return v.toExponential(3);
  return v.toFixed(a < 1 ? 5 : a < 100 ? 4 : 2);
}

/* ------------------------------------------------------------------------------------------------
   PROPORTION CHECKS
   ------------------------------------------------------------------------------------------------ */

/* 1. Defect introduction. Specified: every committed change is defective with probability
      `defectRate`, independently. Measured over commit-origin defects only, because a defect a
      REWORK introduces is not a draw from this coin. Rework is removed anyway (advisory gate, no
      flake, no detection) so the two populations cannot be confused. */
function checkDefectRate() {
  const specified = 0.18;
  let commits = 0;
  let defective = 0;
  for (const seed of seeds(TIER.runs)) {
    const sim = RF.createSimulation({
      seed, arrivalRate: 'high', testDepth: 'smoke', pipelineLanes: 12,
      admissionPolicy: 'advisory', flakyTestRate: 0, monitoringQuality: 0,
      userReportsPerAffectedRequest: 0, defectRate: specified,
    });
    RF.advanceSimulation(sim, { untilTime: TIER.days * DAY });
    commits += sim.counters.commits;
    defective += sim.ledger.filter((d) => d.origin === 'commit').length;
  }
  reportProportion('defect introduction rate', specified, defective, commits,
    'share of committed changes carrying a defect');
}

/* 2. The test suite's signal probability, per depth. Specified: a defect is signalled with
      probability `testDetectability x coverage(depth)`, and testDetectability is drawn from the
      four-class mixture, so the expectation over the population is
      `coverage(depth) x E[testDetectability]`. The expectation is computed FROM the class table by
      the engine itself (meanTestDetectability), not copied into this file — a change to the table
      moves the engine and this target together.
      The denominator is the number of defect instances that actually faced a test run, which is
      why the engine records `testRuns` per instance: a defect still in the backlog has never been
      offered to the suite, and counting it would understate the rate. */
function checkTestSignalRate() {
  const expectedDetectability = RF.meanTestDetectability(null);
  for (const depth of ['smoke', 'standard', 'thorough']) {
    const specified = RF.TEST_DEPTHS[depth].coverage * expectedDetectability;
    let tested = 0;
    let signalled = 0;
    for (const seed of seeds(TIER.runs)) {
      const sim = RF.createSimulation({
        seed, arrivalRate: 'high', testDepth: depth, pipelineLanes: 24,
        admissionPolicy: 'advisory', flakyTestRate: 0, monitoringQuality: 0,
        userReportsPerAffectedRequest: 0,
      });
      RF.advanceSimulation(sim, { untilTime: TIER.days * DAY });
      for (const d of sim.ledger) {
        if (d.testRuns >= 1) {
          tested += 1;
          if (d.signalledByTestsAt !== null) signalled += 1;
        }
      }
    }
    reportProportion(`test signal rate (${depth})`, specified, signalled, tested,
      `coverage ${RF.TEST_DEPTHS[depth].coverage} x E[detectability] ${fmt(expectedDetectability)}`);
  }
}

/* 3. Flaky failures. Specified: a test run that did NOT signal a defect fails anyway with
      probability `flakyTestRate`. The denominator is therefore test runs minus true failures,
      which is exactly how the engine draws it. */
function checkFlakeRate() {
  const specified = 0.07;
  let eligible = 0;
  let flakes = 0;
  for (const seed of seeds(TIER.runs)) {
    const sim = RF.createSimulation({
      seed, arrivalRate: 'high', testDepth: 'standard', pipelineLanes: 24,
      admissionPolicy: 'advisory', flakyTestRate: specified, monitoringQuality: 0,
      userReportsPerAffectedRequest: 0,
    });
    RF.advanceSimulation(sim, { untilTime: TIER.days * DAY });
    const a = RF.snapshot(sim).admission;
    eligible += a.testRuns - a.trueFailures;
    flakes += a.flakyFailures;
  }
  reportProportion('flaky failure rate', specified, flakes, eligible,
    'among test runs that did not signal a real defect');
}

/* 4. THE HEADLINE CHECK. A canary catches a defect inside its soak window with probability
      1 - exp(-rate x soak), where the rate comes from the engine's own hazard function at the
      canary's traffic share. Run with a FIXED defect profile so the analytical probability is a
      single number rather than an expectation over a mixture, and run it at four manifest rates
      spanning five orders of magnitude — which is the span over which a canary goes from
      near-certain to useless.
      Isolation: advisory admission and no flake, so the test gate never removes a defect before
      the canary sees it; one change per release, so one canary soak observes exactly one defect. */
function checkCanaryCatchRate() {
  for (const manifestRate of [0.3, 0.02, 1e-3, 1e-5]) {
    const profile = { testDetectability: 0, manifestRate, trafficDetectability: 0.7 };
    const base = {
      arrivalRate: 'high', testDepth: 'smoke', pipelineLanes: 24, admissionPolicy: 'advisory',
      flakyTestRate: 0, defectRate: 1, batchSize: 1, releaseStrategy: 'canary',
      releaseSlots: 24, canaryFraction: 0.05, canarySoakHours: 1,
      requestsPerHour: 20000, monitoringQuality: 0.7, defectProfile: profile,
    };
    const probe = RF.createSimulation({ ...base, seed: 1 });
    const rate = RF.detectionRate(probe, profile, base.canaryFraction);
    const specified = 1 - Math.exp(-rate * base.canarySoakHours);
    let exposed = 0;
    let caught = 0;
    for (const seed of seeds(TIER.runs)) {
      const sim = RF.createSimulation({ ...base, seed });
      RF.advanceSimulation(sim, { untilTime: TIER.days * DAY });
      const l = RF.defectLedger(sim);
      exposed += l.exposedInProduction;
      caught += l.detectedDuringCanary;
    }
    reportProportion(`canary catch, manifest ${manifestRate.toExponential(0)}`,
      specified, caught, exposed, `1 - exp(-${fmt(rate)}/h x 1 h)`);
  }
}

/* 5. Blue-green synthetic verification. Specified by the engine's own catch-probability function.
      The denominator is the defects that reached a release at all — blocked-before-release plus
      exposed — and with an advisory gate and no flake, the only thing that can block one is the
      verification itself. */
function checkSyntheticCatchRate() {
  for (const manifestRate of [0.2, 1e-3]) {
    const profile = { testDetectability: 0, manifestRate, trafficDetectability: 0.8 };
    const base = {
      arrivalRate: 'high', testDepth: 'smoke', pipelineLanes: 24, admissionPolicy: 'advisory',
      flakyTestRate: 0, defectRate: 1, batchSize: 1, releaseStrategy: 'blueGreen',
      releaseSlots: 24, blueGreenVerifyHours: 0.5, blueGreenSyntheticRequests: 2000,
      requestsPerHour: 20000, monitoringQuality: 0.7, defectProfile: profile,
      reworkFixProbability: 1,
    };
    const probe = RF.createSimulation({ ...base, seed: 1 });
    const specified = RF.syntheticCatchProbability(probe, profile);
    let reachedRelease = 0;
    let caught = 0;
    for (const seed of seeds(TIER.runs)) {
      const sim = RF.createSimulation({ ...base, seed });
      RF.advanceSimulation(sim, { untilTime: TIER.days * DAY });
      const l = RF.defectLedger(sim);
      reachedRelease += l.detectedBeforeRelease + l.exposedInProduction;
      caught += l.detectedBeforeRelease;
    }
    reportProportion(`synthetic catch, manifest ${manifestRate.toExponential(0)}`,
      specified, caught, reachedRelease,
      '1 - (1 - manifest)^2000, times distinguishability and monitoring');
  }
}

/* 6. The defect-class mixture. Specified by the weights in the class table. Reported per class
      because a single chi-square would hide WHICH class drifted. */
function checkClassMixture() {
  const weights = RF.normalisedWeights(null);
  const counts = {};
  let total = 0;
  for (const cls of RF.DEFECT_CLASSES) counts[cls.id] = 0;
  for (const seed of seeds(TIER.runs)) {
    const sim = RF.createSimulation({
      seed, arrivalRate: 'high', testDepth: 'smoke', pipelineLanes: 24,
      admissionPolicy: 'advisory', flakyTestRate: 0, monitoringQuality: 0,
      userReportsPerAffectedRequest: 0,
    });
    RF.advanceSimulation(sim, { untilTime: TIER.days * DAY });
    for (const d of sim.ledger) {
      if (d.origin !== 'commit') continue;
      counts[d.classId] += 1;
      total += 1;
    }
  }
  for (const cls of RF.DEFECT_CLASSES) {
    reportProportion(`defect class share (${cls.id})`, weights[cls.id], counts[cls.id], total,
      'mixture weight from the class table');
  }
}

/* ------------------------------------------------------------------------------------------------
   MEAN CHECKS — band measured across independent runs
   ------------------------------------------------------------------------------------------------ */

function reportMean(name, specified, perRun, precisionBudget, note) {
  const { mean, sd, n } = meanAndSd(perRun);
  const se = sd / Math.sqrt(n);
  const tolerance = tCritical(n - 1) * se;
  const relSe = specified !== 0 ? se / Math.abs(specified) : Infinity;
  if (relSe > precisionBudget) {
    precisionFailures += 1;
    rows.push({
      name, specified, observed: mean, tolerance, n, ok: false,
      note: `PRECISION: SE/specified ${fmt(relSe)} exceeds the ${precisionBudget} budget — the run`
        + ' budget is too small for this quantity, which is a finding about the experiment',
    });
    failures += 1;
    return;
  }
  report(name, specified, mean, tolerance, n, `${note}; ${n} runs, SE ${fmt(se)}`);
}

/* 7. Inter-commit time. Specified: exponential with mean 24/arrivalPerDay hours. */
function checkInterCommitTime() {
  const perDay = 44;
  const specified = RF.HOURS_PER_DAY / perDay;
  const perRun = [];
  for (const seed of seeds(TIER.runs)) {
    const sim = RF.createSimulation({ seed, arrivalRatePerDay: perDay, traceLimit: 0 });
    let last = null;
    let sum = 0;
    let count = 0;
    const horizon = Math.min(TIER.days, 120) * DAY;
    for (;;) {
      const ev = RF.stepSimulation(sim);
      if (ev === null || ev.time > horizon) break;
      if (ev.kind !== 'commit') continue;
      if (last !== null) { sum += ev.time - last; count += 1; }
      last = ev.time;
    }
    perRun.push(sum / count);
  }
  reportMean('inter-commit time (h)', specified, perRun, 0.02, 'exponential, rate 44/day');
}

/* 8. Test and rework durations. Specified: the nominal duration from the policy table, times a
      lognormal multiplier whose mean is exactly 1 — so the observed mean duration is the nominal
      one. Both are read from the engine's own counters. */
function checkDurations() {
  for (const depth of ['smoke', 'standard', 'thorough']) {
    const specified = RF.TEST_DEPTHS[depth].minutes / 60;
    const perRun = [];
    for (const seed of seeds(TIER.runs)) {
      const sim = RF.createSimulation({
        seed, arrivalRate: 'high', testDepth: depth, pipelineLanes: 24,
        admissionPolicy: 'advisory', monitoringQuality: 0, userReportsPerAffectedRequest: 0,
      });
      RF.advanceSimulation(sim, { untilTime: Math.min(TIER.days, 200) * DAY });
      perRun.push(RF.snapshot(sim).admission.meanTestHours);
    }
    reportMean(`test duration (${depth}, h)`, specified, perRun, 0.02,
      'nominal duration, lognormal sigma 0.3');
  }
  const reworkSpecified = 4;
  const perRun = [];
  for (const seed of seeds(TIER.runs)) {
    const sim = RF.createSimulation({
      seed, arrivalRate: 'high', testDepth: 'standard', pipelineLanes: 24,
      admissionPolicy: 'required', reworkHours: reworkSpecified,
      monitoringQuality: 0, userReportsPerAffectedRequest: 0,
    });
    RF.advanceSimulation(sim, { untilTime: Math.min(TIER.days, 200) * DAY });
    perRun.push(RF.snapshot(sim).admission.meanReworkHours);
  }
  reportMean('rework duration (h)', reworkSpecified, perRun, 0.02, 'nominal 4 h, lognormal');
}

/* 9. Time to notice a failure in production. Specified: exponential with the engine's hazard rate
      at FULL exposure, so the mean is 1/rate. The immediate strategy has no soak, so exposure is
      at full fleet from the first instant and the whole interval is drawn at one rate.
      Isolation: advisory gate, no flake, one change per release, and plenty of release slots so a
      defective release never waits behind another. */
function checkDetectionDelay() {
  const profile = { testDetectability: 0, manifestRate: 0.01, trafficDetectability: 0.6 };
  const base = {
    arrivalRate: 'high', testDepth: 'smoke', pipelineLanes: 24, admissionPolicy: 'advisory',
    flakyTestRate: 0, defectRate: 1, batchSize: 1, releaseStrategy: 'immediate', releaseSlots: 24,
    requestsPerHour: 20000, monitoringQuality: 0.6, defectProfile: profile,
    reworkFixProbability: 1,
  };
  const probe = RF.createSimulation({ ...base, seed: 1 });
  const rate = RF.detectionRate(probe, profile, 1);
  const specified = 1 / rate;
  const perRun = [];
  for (const seed of seeds(TIER.runs)) {
    const sim = RF.createSimulation({ ...base, seed });
    RF.advanceSimulation(sim, { untilTime: Math.min(TIER.days, 200) * DAY });
    const delays = sim.ledger
      .filter((d) => d.detectedAfterReleaseAt !== null)
      .map((d) => d.detectedAfterReleaseAt - d.exposedInProductionAt);
    if (delays.length > 30) perRun.push(delays.reduce((a, b) => a + b, 0) / delays.length);
  }
  reportMean('time to detect in production (h)', specified, perRun, 0.08,
    `exponential, rate ${fmt(rate)}/h at full exposure`);
}

/* 10. User impact per failed deployment. Specified: a defective release serves
       `requestsPerHour` requests per hour from first exposure until the rollback completes, so the
       expected exposure is requestsPerHour x (1/rate + rollbackHours). This is the check that the
       fifth metric integrates over the right interval and nothing else. Durations are made
       deterministic so the rollback term carries no variance of its own. */
function checkExposurePerFailure() {
  const profile = { testDetectability: 0, manifestRate: 0.01, trafficDetectability: 0.6 };
  const requestsPerHour = 20000;
  const rollbackHours = 0.4;
  const base = {
    arrivalRate: 'high', testDepth: 'smoke', pipelineLanes: 24, admissionPolicy: 'advisory',
    flakyTestRate: 0, defectRate: 1, batchSize: 1, releaseStrategy: 'immediate', releaseSlots: 24,
    requestsPerHour, monitoringQuality: 0.6, defectProfile: profile, durationSigma: 0,
    rollbackHours, reworkFixProbability: 1,
  };
  const probe = RF.createSimulation({ ...base, seed: 1 });
  const rate = RF.detectionRate(probe, profile, 1);
  const specified = requestsPerHour * (1 / rate + rollbackHours);
  const perRun = [];
  for (const seed of seeds(TIER.runs)) {
    const sim = RF.createSimulation({ ...base, seed });
    RF.advanceSimulation(sim, { untilTime: Math.min(TIER.days, 200) * DAY });
    const s = RF.snapshot(sim);
    if (s.userImpact.perFailedDeployment.n > 30) perRun.push(s.userImpact.perFailedDeployment.mean);
  }
  reportMean('requests exposed per failed deployment', specified, perRun, 0.08,
    `${requestsPerHour}/h x (1/rate + ${rollbackHours} h)`);
}

/* 11. Restore duration. Specified exactly: the configured rollback time, times a mean-1
       multiplier. */
function checkRestoreDuration() {
  const specified = 0.75;
  const perRun = [];
  for (const seed of seeds(TIER.runs)) {
    const sim = RF.createSimulation({
      seed, arrivalRate: 'high', testDepth: 'standard', batchSize: 1,
      releaseStrategy: 'immediate', rollbackHours: specified, releaseSlots: 8,
    });
    RF.advanceSimulation(sim, { untilTime: Math.min(TIER.days, 200) * DAY });
    const r = RF.snapshot(sim).fourKeys.timeToRestoreHours;
    if (r.n > 30) perRun.push(r.mean);
  }
  reportMean('time to restore (h)', specified, perRun, 0.02, 'configured rollback, lognormal');
}

/* ------------------------------------------------------------------------------------------------ */

const started = Date.now();
process.stdout.write(`Release Factory — statistical validation (${TIER.label} tier: `
  + `${TIER.runs} runs x ${TIER.days} simulated days)\n\n`);

checkDefectRate();
checkTestSignalRate();
checkFlakeRate();
checkClassMixture();
checkCanaryCatchRate();
checkSyntheticCatchRate();
checkInterCommitTime();
checkDurations();
checkDetectionDelay();
checkExposurePerFailure();
checkRestoreDuration();

const width = Math.max(...rows.map((r) => r.name.length));
process.stdout.write(
  `${'quantity'.padEnd(width)}  ${'specified'.padStart(12)}  ${'observed'.padStart(12)}`
  + `  ${'tolerance'.padStart(11)}  ${'n'.padStart(9)}  verdict\n`,
);
process.stdout.write(`${'-'.repeat(width + 66)}\n`);
for (const r of rows) {
  process.stdout.write(
    `${r.name.padEnd(width)}  ${fmt(r.specified).padStart(12)}  ${fmt(r.observed).padStart(12)}`
    + `  ${fmt(r.tolerance).padStart(11)}  ${String(r.n).padStart(9)}  ${r.ok ? 'PASS' : 'FAIL'}\n`,
  );
  if (r.note) process.stdout.write(`${' '.repeat(width + 2)}  ${r.note}\n`);
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
process.stdout.write(`\n${rows.length - failures}/${rows.length} checks within tolerance`
  + `${precisionFailures ? ` (${precisionFailures} precision failure(s))` : ''} in ${seconds}s\n`);
process.exit(failures === 0 ? 0 : 1);
