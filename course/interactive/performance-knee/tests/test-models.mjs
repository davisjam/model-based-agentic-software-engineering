/* test-models.mjs — the analytical predictions.
 *
 * These are closed-form results, so the tests are exact to floating point rather than approximate.
 * The interesting cases are the boundaries: lambda = 0, lambda = mu, lambda > mu, and the refusal
 * to apply an M/M/1 formula to constant service times.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Q } from './harness.mjs';

const close = (actual, expected, tol, what) => assert.ok(
  Math.abs(actual - expected) <= tol,
  `${what}: got ${actual}, expected ${expected} (tolerance ${tol})`,
);

test('M/M/1 matches hand-computed values at rho = 0.9', () => {
  const r = Q.calculateMM1(90, 100);
  assert.equal(r.model, 'M/M/1');
  assert.equal(r.stable, true);
  close(r.offeredLoad, 0.9, 1e-15, 'rho');
  close(r.utilization, 0.9, 1e-15, 'utilization');
  close(r.W, 1 / 10, 1e-15, 'W');            /* 100 ms */
  close(r.Wq, 90 / (100 * 10), 1e-15, 'Wq'); /*  90 ms */
  close(r.L, 9, 1e-12, 'L');
  close(r.Lq, 8.1, 1e-12, 'Lq');
  close(r.serviceTime, 0.01, 1e-15, '1/mu');
});

test('M/M/1 at rho = 0.3 and 0.7', () => {
  const a = Q.calculateMM1(30, 100);
  close(a.W, 1 / 70, 1e-15, 'W(0.3)');
  close(a.L, 30 / 70, 1e-14, 'L(0.3)');
  close(a.Wq, 30 / (100 * 70), 1e-15, 'Wq(0.3)');
  const b = Q.calculateMM1(70, 100);
  close(b.W, 1 / 30, 1e-15, 'W(0.7)');
  close(b.L, 70 / 30, 1e-14, 'L(0.7)');
});

test("M/M/1 satisfies Little's Law and W = Wq + 1/mu identically", () => {
  for (const lambda of [0, 1, 17, 30, 70, 90, 99, 99.9]) {
    const r = Q.calculateMM1(lambda, 100);
    close(r.L, lambda * r.W, 1e-12, `L = lambda W at lambda=${lambda}`);
    close(r.Lq, lambda * r.Wq, 1e-12, `Lq = lambda Wq at lambda=${lambda}`);
    close(r.W, r.Wq + r.serviceTime, 1e-15, `W = Wq + 1/mu at lambda=${lambda}`);
  }
});

test('M/D/1 matches hand-computed values at rho = 0.9', () => {
  const r = Q.calculateMD1(90, 100);
  assert.equal(r.model, 'M/D/1');
  close(r.Wq, 0.045, 1e-15, 'Wq');  /* 0.9 / (2 * 100 * 0.1) = 45 ms */
  close(r.W, 0.055, 1e-15, 'W');    /* 45 + 10 ms */
  close(r.L, 90 * 0.055, 1e-12, 'L');
  close(r.Lq, 90 * 0.045, 1e-12, 'Lq');
});

test('M/D/1 queue wait is exactly half the M/M/1 queue wait at the same rho', () => {
  /* Pollaczek-Khinchine with zero service variance. This is the whole content of Experiment 5, so
     it is pinned rather than left to the prose. */
  for (const lambda of [10, 30, 50, 70, 90, 95, 99]) {
    const m = Q.calculateMM1(lambda, 100);
    const d = Q.calculateMD1(lambda, 100);
    close(d.Wq, m.Wq / 2, 1e-15, `Wq ratio at lambda=${lambda}`);
  }
});

test("M/D/1 satisfies Little's Law identically", () => {
  for (const lambda of [0, 30, 70, 90, 99.9]) {
    const r = Q.calculateMD1(lambda, 100);
    close(r.L, lambda * r.W, 1e-12, `L = lambda W at lambda=${lambda}`);
    close(r.W, r.Wq + r.serviceTime, 1e-15, `W = Wq + 1/mu at lambda=${lambda}`);
  }
});

test('lambda = 0 gives zero occupancy and the unloaded service time', () => {
  for (const fn of [Q.calculateMM1, Q.calculateMD1]) {
    const r = fn(0, 100);
    assert.equal(r.stable, true);
    close(r.offeredLoad, 0, 0, 'rho');
    close(r.utilization, 0, 0, 'utilization');
    close(r.L, 0, 0, 'L');
    close(r.Lq, 0, 0, 'Lq');
    close(r.Wq, 0, 0, 'Wq');
    close(r.W, 0.01, 1e-15, 'W = 1/mu');
  }
});

test('lambda >= mu yields no finite steady-state prediction', () => {
  const cases = [
    [Q.calculateMM1, 100, 100, 'meets'],
    [Q.calculateMM1, 110, 100, 'exceeds'],
    [Q.calculateMM1, 1000, 100, 'exceeds'],
    [Q.calculateMD1, 100, 100, 'meets'],
    [Q.calculateMD1, 110, 100, 'exceeds'],
  ];
  for (const [fn, lambda, mu, verb] of cases) {
    const r = fn(lambda, mu);
    assert.equal(r.stable, false, `reported stable at lambda=${lambda}, mu=${mu}`);
    for (const key of ['W', 'Wq', 'L', 'Lq']) {
      assert.equal(r[key], null, `${key} was not null at lambda=${lambda}`);
    }
    assert.match(r.reason, /No finite steady-state prediction/);
    assert.match(r.reason, new RegExp(verb));
    /* Utilization is a fraction of time: it cannot exceed 1 however large the offered load. */
    assert.equal(r.utilization, 1);
    close(r.offeredLoad, lambda / mu, 1e-15, 'offered load');
    close(r.backlogGrowthRate, lambda - mu, 1e-12, 'backlog growth rate');
  }
});

test('no result ever carries Infinity or NaN', () => {
  for (const fn of [Q.calculateMM1, Q.calculateMD1]) {
    for (const lambda of [0, 1, 50, 99, 99.999, 100, 100.001, 150, 1e6]) {
      const r = fn(lambda, 100);
      for (const [key, value] of Object.entries(r)) {
        if (typeof value !== 'number') continue;
        assert.ok(Number.isFinite(value), `${fn.name} lambda=${lambda}: ${key} = ${value}`);
      }
    }
  }
});

test('invalid parameters are rejected rather than coerced', () => {
  const bad = [
    [-1, 100], [30, 0], [30, -5], [NaN, 100], [30, NaN],
    [Infinity, 100], [30, Infinity], ['30', 100], [30, '100'],
    [null, 100], [undefined, 100], [30, null],
  ];
  for (const fn of [Q.calculateMM1, Q.calculateMD1]) {
    for (const [lambda, mu] of bad) {
      assert.throws(() => fn(lambda, mu), RangeError,
        `${fn.name} accepted (${String(lambda)}, ${String(mu)})`);
    }
  }
});

test('predict dispatches on the service distribution, never reusing M/M/1 for M/D/1', () => {
  const exp = Q.predict({ arrivalRate: 90, serviceRate: 100, serviceDistribution: 'exponential' });
  const det = Q.predict({ arrivalRate: 90, serviceRate: 100, serviceDistribution: 'deterministic' });
  assert.equal(exp.model, 'M/M/1');
  assert.equal(det.model, 'M/D/1');
  assert.notEqual(exp.W, det.W);
  close(det.W, Q.calculateMD1(90, 100).W, 1e-15, 'deterministic prediction');
  assert.throws(
    () => Q.predict({ arrivalRate: 90, serviceRate: 100, serviceDistribution: 'erlang' }),
    RangeError,
  );
});

test('the predicted curve is monotone, finite, and stops short of rho = 1', () => {
  for (const distribution of ['exponential', 'deterministic']) {
    const points = Q.predictedCurve(100, distribution, 0.995, 200);
    assert.ok(points.length > 150, `only ${points.length} points`);
    assert.ok(points[points.length - 1].rho <= 0.995);
    let previous = -Infinity;
    for (const p of points) {
      assert.ok(Number.isFinite(p.W), `non-finite W at rho=${p.rho}`);
      assert.ok(p.W >= previous, `W not monotone at rho=${p.rho}`);
      previous = p.W;
    }
    /* The floor is the service time: no queueing at zero load. */
    close(points[0].W, 0.01, 1e-12, 'W(0)');
  }
});

test('the preset table carries the documented parameters and reset semantics', () => {
  const expected = {
    light: [30, 100, true],
    moderate: [70, 100, true],
    near: [95, 100, true],
    critical: [100, 100, true],
    overloaded: [110, 100, true],
    recover: [110, 150, false],
  };
  assert.equal(Q.PRESETS.length, Object.keys(expected).length);
  for (const [id, [lambda, mu, reset]] of Object.entries(expected)) {
    const p = Q.findPreset(id);
    assert.equal(p.arrivalRate, lambda, `${id} lambda`);
    assert.equal(p.serviceRate, mu, `${id} mu`);
    assert.equal(p.reset, reset, `${id} reset semantics`);
  }
  assert.throws(() => Q.findPreset('nope'), RangeError);
});

test('applying a preset sets the parameters; only "recover" keeps the backlog', () => {
  /* Build a real backlog first, then check which presets clear it. */
  function loaded() {
    const sim = Q.createSimulation({ arrivalRate: 110, serviceRate: 100, seed: 30861 });
    Q.advanceSimulation(sim, { untilTime: 200 });
    assert.ok(Q.numberInSystem(sim) > 100, 'the fixture failed to build a backlog');
    return sim;
  }

  const kept = loaded();
  const before = Q.numberInSystem(kept);
  const recover = Q.applyPreset(kept, 'recover');
  assert.equal(recover.reset, false);
  assert.equal(kept.params.serviceRate, 150);
  assert.equal(Q.numberInSystem(kept), before, 'the backlog was discarded by "recover"');
  assert.ok(kept.time > 0, 'the clock was reset by "recover"');

  const cleared = loaded();
  Q.applyPreset(cleared, 'light');
  assert.equal(cleared.params.arrivalRate, 30);
  assert.equal(cleared.params.serviceRate, 100);
  assert.equal(cleared.time, 0, 'a resetting preset left the clock running');
  assert.equal(Q.numberInSystem(cleared), 0, 'a resetting preset left a backlog');
});
