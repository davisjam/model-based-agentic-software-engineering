#!/usr/bin/env node
/* validate-statistical.mjs — does the engine actually reproduce the analytical results?
 *
 *   node validate-statistical.mjs            short tier  (~15 s, ~25 million events)
 *   node validate-statistical.mjs --full     full tier   (~3 min, ~300 million events)
 *
 * Unit tests pin structure. They cannot tell us whether the simulator's mean response time
 * converges on 1/(mu - lambda), which is the claim the entire exercise rests on. This file answers
 * that question, and prints the evidence rather than only a verdict.
 *
 * ================================================================================================
 * Why there is no fixed tolerance, and how this one was derived
 * ================================================================================================
 *
 * A flat rule such as "within 1%" is wrong in both directions. At rho = 0.3 a 1% band is loose
 * enough for a real defect to pass; at rho = 0.9 it is tighter than the sampling noise, so the test
 * fails on arithmetic instead of on a bug. Sojourn times in a queue are also strongly
 * autocorrelated — one long service delays a whole run of successors — so the effective sample size
 * is far below the completion count and no textbook standard error applies.
 *
 * Getting this wrong is not hypothetical. The first version of this file used a 3-standard-error
 * band computed from FOUR runs and reported a 2.5% "bias" at rho = 0.7. The engine was correct: 3
 * is the NORMAL quantile, and with four runs the sampling distribution of the mean has three
 * degrees of freedom and far heavier tails (t = 10.2, not 3). Re-measured with twenty seeds, every
 * estimate sat within about one standard error of its prediction. The band, not the simulator, was
 * the defect — which is the whole argument for printing the interval alongside the estimate.
 *
 * So the band is MEASURED and the quantile is the right one:
 *
 *   ACCURACY   |grand mean - analytical|  <=  t(0.001, R-1) * SE
 *              where SE = s / sqrt(R) over R INDEPENDENT runs and t is the one-tailed 0.1%
 *              Student quantile, i.e. a two-sided 99.8% interval — comparable to "three sigma" but
 *              honest about having only R runs.
 *
 *   PRECISION  SE / analytical  <=  the tier's precision budget
 *              Without this, ACCURACY could be satisfied by a standard error so large the test
 *              asserts nothing. A precision failure says the run budget was too small for this
 *              load — a finding about the experiment, not about the engine — and is labelled so.
 *
 * The band widens by itself near capacity, where convergence is slow and variance high, because it
 * is computed from the observed spread rather than guessed.
 *
 * ------------------------------------------------------------------------------------------------
 * Calibration record: measured per-run relative standard deviation, 20 independent seeds,
 * 200 000 in-window completions per run. Relative standard deviation scales as 1/sqrt(N), which is
 * how the completion budgets below were chosen: N is set so that the WORST quantity in each case
 * (always W_q, which carries all of the queueing noise on a smaller base) clears the tier's
 * precision budget. Everything else then clears it with margin.
 *
 *     model    rho    W        W_q      L        utilization
 *     M/M/1    0.3    0.488%   1.218%   0.620%   0.340%
 *     M/M/1    0.7    1.504%   2.108%   1.707%   0.345%
 *     M/M/1    0.9    4.086%   4.526%   4.252%   0.358%
 *     M/D/1    0.3    0.128%   0.727%   0.335%   0.264%
 *     M/D/1    0.7    0.802%   1.489%   1.004%   0.265%
 *     M/D/1    0.9    3.254%   3.977%   3.469%   0.276%
 *
 * ================================================================================================
 * Warm-up
 * ================================================================================================
 *
 * Every run starts empty, which biases response time downward until occupancy reaches its typical
 * level. The relaxation time of an M/M/1 queue scales as 1/(sqrt(mu) - sqrt(lambda))^2, so the
 * warm-up is 500/(mu - lambda) seconds — about 13 relaxation times at rho = 0.9, and more at lower
 * load — and the discarded prefix is well under 1% of each run.
 *
 * ================================================================================================
 * Independence of the runs
 * ================================================================================================
 *
 * "Independent seeds" is a claim, so it is checked rather than assumed. The generator is a
 * counter-based hash with a fixed odd increment c, so two seeds s and s' address the SAME global
 * cycle, offset by (s' - s) * c^-1 mod 2^32 draws. The script computes the minimum circular
 * separation over every pair of chosen seeds and refuses to run if any run could consume enough
 * draws to reach a sibling's stream. Non-overlap is therefore a verified property of the design,
 * not a hope about seed choice.
 */
import { Q, meanAndSd } from './harness.mjs';

const full = process.argv.includes('--full');
const MU = 100;

/* One-tailed 0.1% Student quantiles, i.e. two-sided 99.8% intervals, by degrees of freedom. */
const T_0_001 = { 3: 10.215, 5: 6.869, 7: 5.408, 9: 4.781, 11: 4.437, 15: 4.073, 19: 3.883 };
function tCritical(df) {
  if (T_0_001[df] === undefined) throw new Error(`no t quantile tabulated for df = ${df}`);
  return T_0_001[df];
}

const TIER = full
  ? { seeds: 16, precisionBudget: 0.005, completions: { 0.3: 300000, 0.7: 600000, 0.9: 1500000 },
      overloadSeconds: 10000, variabilityCompletions: 600000 }
  : { seeds: 8, precisionBudget: 0.015, completions: { 0.3: 100000, 0.7: 200000, 0.9: 400000 },
      overloadSeconds: 3000, variabilityCompletions: 200000 };

/* Consecutive seeds from the course number. Friendly to read, and the separation check below
   proves they address disjoint stretches of the generator's cycle. */
const SEEDS = Array.from({ length: TIER.seeds }, (_, i) => 30861 + i);
const T_CRIT = tCritical(SEEDS.length - 1);

/* ---- verify the seeds really are independent ------------------------------------------------ */
const PRNG_INCREMENT = 0x6D2B79F5n;
const MODULUS = 1n << 32n;
function modInverse(value) {
  let x = 1n;
  for (let i = 0; i < 6; i += 1) x = (x * (2n - value * x)) % MODULUS;  /* Newton, exact mod 2^32 */
  return ((x % MODULUS) + MODULUS) % MODULUS;
}
const DRAWS_PER_SEED_STEP = modInverse(PRNG_INCREMENT);
function streamSeparation(seedDelta) {
  const offset = (BigInt(seedDelta) * DRAWS_PER_SEED_STEP) % MODULUS;
  const other = MODULUS - offset;
  return Number(offset < other ? offset : other);
}
let minSeparation = Infinity;
for (let i = 0; i < SEEDS.length; i += 1) {
  for (let j = i + 1; j < SEEDS.length; j += 1) {
    minSeparation = Math.min(minSeparation, streamSeparation(SEEDS[j] - SEEDS[i]));
  }
}
/* An upper bound on the draws one run consumes from one stream: one draw per arrival, and a run
   generates a little more than `completions` arrivals. Four times the largest budget is ample. */
const MAX_DRAWS_PER_RUN = 4 * Math.max(...Object.values(TIER.completions));
if (minSeparation <= MAX_DRAWS_PER_RUN) {
  process.stderr.write(`seed streams overlap: minimum separation ${minSeparation} draws is not `
    + `greater than the ${MAX_DRAWS_PER_RUN} a single run may consume\n`);
  process.exit(1);
}

/* ---- the experiment ------------------------------------------------------------------------- */
const CASES = [];
for (const distribution of ['exponential', 'deterministic']) {
  for (const rho of [0.3, 0.7, 0.9]) {
    CASES.push({ distribution, rho, completions: TIER.completions[rho] });
  }
}

const analytical = (distribution, lambda) => (distribution === 'deterministic'
  ? Q.calculateMD1(lambda, MU)
  : Q.calculateMM1(lambda, MU));

/** One independent replication. */
function replicate({ distribution, lambda, completions, seed }) {
  const warmup = 500 / (MU - lambda);
  const sim = Q.createSimulation({
    arrivalRate: lambda, serviceRate: MU, serviceDistribution: distribution,
    seed, warmup, completionLogLimit: 0,
  });
  Q.advanceSimulation(sim, { untilTime: warmup });
  const base = sim.counters.completions;
  Q.advanceSimulation(sim, { maxCompletions: base + completions });
  const s = Q.snapshot(sim);
  return {
    W: s.meanResponse, Wq: s.meanWait, L: s.timeAverageNumberInSystem,
    utilization: s.utilization,
    completions: s.observedCompletions, events: s.events, seconds: s.observedTime,
  };
}

const report = (line) => process.stdout.write(`${line}\n`);

report(`Statistical validation of the queueing engine — ${full ? 'FULL' : 'SHORT'} tier`);
report(`mu = ${MU} req/s · ${SEEDS.length} independent runs per case `
  + `(seeds ${SEEDS[0]}..${SEEDS[SEEDS.length - 1]})`);
report(`accuracy band = t(0.001, ${SEEDS.length - 1}) × SE = ${T_CRIT} × SE  (two-sided 99.8%)`);
report(`precision budget = SE / prediction ≤ ${(TIER.precisionBudget * 100).toFixed(1)}%`);
report(`seed-stream separation ≥ ${minSeparation.toExponential(3)} draws, `
  + `against ≤ ${MAX_DRAWS_PER_RUN.toExponential(2)} consumed per run`);
report('');

const rows = [];
let failures = 0;
let totalEvents = 0;

for (const spec of CASES) {
  const lambda = spec.rho * MU;
  const model = analytical(spec.distribution, lambda);
  const runs = SEEDS.map((seed) => replicate({ ...spec, lambda, seed }));
  totalEvents += runs.reduce((a, r) => a + r.events, 0);

  for (const quantity of ['W', 'Wq', 'L', 'utilization']) {
    const predicted = model[quantity];
    const { mean, sd } = meanAndSd(runs.map((r) => r[quantity]));
    const se = sd / Math.sqrt(runs.length);
    const band = T_CRIT * se;
    const accurate = Math.abs(mean - predicted) <= band;
    const precise = se / predicted <= TIER.precisionBudget;
    if (!accurate || !precise) failures += 1;
    rows.push({
      model: model.model, rho: spec.rho, quantity, predicted, estimate: mean,
      relativeError: (mean - predicted) / predicted, se, band, accurate, precise,
      completions: runs[0].completions, runs: runs.length,
    });
  }
}

const show = (quantity, value) => (quantity === 'W' || quantity === 'Wq'
  ? `${(value * 1000).toFixed(4)} ms`
  : value.toFixed(5));

const header = ['model', 'rho', 'quantity', 'analytical', 'simulated', 'rel.err',
  'SE/pred', 'band', 'N/run', 'runs', 'verdict'];
const widths = [7, 5, 11, 14, 14, 9, 9, 9, 10, 5, 9];
report(header.map((h, i) => h.padEnd(widths[i])).join(' '));
report(widths.map((w) => '-'.repeat(w)).join(' '));
for (const r of rows) {
  report([
    r.model, r.rho.toFixed(2), r.quantity,
    show(r.quantity, r.predicted), show(r.quantity, r.estimate),
    `${(r.relativeError * 100).toFixed(3)}%`,
    `${(r.se / r.predicted * 100).toFixed(3)}%`,
    `${(r.band / r.predicted * 100).toFixed(3)}%`,
    r.completions.toLocaleString('en-US'), String(r.runs),
    r.accurate && r.precise ? 'PASS' : !r.accurate ? 'OUT-OF-BAND' : 'IMPRECISE',
  ].map((cell, i) => String(cell).padEnd(widths[i])).join(' '));
}
report('');
report('verdict  PASS        |bias| ≤ band and SE/prediction ≤ the precision budget.');
report('         OUT-OF-BAND the grand mean lies outside the two-sided 99.8% interval.');
report('         IMPRECISE   the run budget cannot resolve the model at this load — a finding');
report('                     about the experiment, not about the engine.');

/* ---- overload: a growth rate, and no steady-state claim ------------------------------------- */
report('');
report("Overload: lambda > mu. There is no steady state, so no mean is checked and steady-state");
report("Little's Law is deliberately not applied. What must hold is the long-run growth rate.");
for (const lambda of [110, 130]) {
  const growths = SEEDS.map((seed) => {
    const sim = Q.createSimulation({ arrivalRate: lambda, serviceRate: MU, seed, completionLogLimit: 0 });
    Q.advanceSimulation(sim, { untilTime: TIER.overloadSeconds });
    totalEvents += sim.eventCount;
    return Q.snapshot(sim).backlogGrowthObserved;
  });
  const { mean, sd } = meanAndSd(growths);
  const se = sd / Math.sqrt(growths.length);
  const predicted = lambda - MU;
  const band = T_CRIT * se;
  const ok = Math.abs(mean - predicted) <= band;
  if (!ok) failures += 1;
  report(`  lambda=${lambda}: predicted dN/dt = ${predicted} req/s · observed `
    + `${mean.toFixed(3)} ± ${band.toFixed(3)} over ${TIER.overloadSeconds} s × ${growths.length} runs`
    + `  ${ok ? 'PASS' : 'FAIL'}`);

  const m = Q.calculateMM1(lambda, MU);
  if (m.stable || m.W !== null) {
    report(`  FAIL: the model offered a finite prediction at lambda=${lambda}`);
    failures += 1;
  }
}

/* ---- variability at equal mean service demand (Experiment 5) -------------------------------- */
report('');
report('Variability at equal mean service demand: deterministic service removes exactly half the');
report('queue wait at the same rho and the same mean service time (Pollaczek-Khinchine).');
for (const rho of [0.7, 0.9]) {
  const lambda = rho * MU;
  const wq = {};
  for (const distribution of ['exponential', 'deterministic']) {
    const runs = SEEDS.map((seed) => replicate({
      distribution, lambda, completions: TIER.variabilityCompletions, seed,
    }));
    totalEvents += runs.reduce((a, r) => a + r.events, 0);
    wq[distribution] = meanAndSd(runs.map((r) => r.Wq));
  }
  const ratio = wq.deterministic.mean / wq.exponential.mean;
  /* Propagated standard error of the ratio of two independent means. */
  const relSe = Math.sqrt(
    (wq.deterministic.sd / Math.sqrt(SEEDS.length) / wq.deterministic.mean) ** 2
    + (wq.exponential.sd / Math.sqrt(SEEDS.length) / wq.exponential.mean) ** 2,
  );
  const band = T_CRIT * relSe * ratio;
  const ok = Math.abs(ratio - 0.5) <= band;
  if (!ok) failures += 1;
  report(`  rho=${rho}: observed W_q ratio deterministic/exponential = ${ratio.toFixed(4)} `
    + `± ${band.toFixed(4)} against the theoretical 0.5000  ${ok ? 'PASS' : 'FAIL'}`);
}

report('');
report(`Total events simulated: ${totalEvents.toLocaleString('en-US')}`);
if (failures > 0) {
  report(`${failures} statistical check(s) failed.`);
  process.exit(1);
}
report('All statistical checks passed.');
