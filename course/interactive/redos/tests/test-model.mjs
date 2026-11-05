/* test-model.mjs — the backtracking MODEL, the predicted work, and the growth description.
 *
 * The thing this file is protecting is a distinction, not a number. The page shows a diagram of the
 * ways an engine COULD divide a run of characters among nested repetitions, and labels it a
 * conceptual model rather than a trace of the browser's execution. The model is therefore allowed
 * to be a clean combinatorial object — and it must be a CORRECT one, because a student is being
 * asked to compare it against a measurement. A model that miscounts its own candidates makes that
 * comparison meaningless in a way no stopwatch would reveal.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { R } from './harness.mjs';

/* --- compositions: the exponential model ---------------------------------------------------- */

test('a run of n characters has 2^(n-1) ordered divisions', () => {
  for (const [n, expected] of [[1, 1], [2, 2], [3, 4], [4, 8], [5, 16], [10, 512], [20, 524288]]) {
    assert.equal(R.compositionCount(n), expected, `n=${n}`);
  }
});

test('an empty run has no divisions', () => {
  assert.equal(R.compositionCount(0), 0);
  assert.equal(R.compositionCount(-3), 0);
  assert.deepEqual(R.enumerateCompositions(0, 10), []);
});

test('the enumerated divisions agree with the count, and each sums to n', () => {
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const items = R.enumerateCompositions(n, 1024);
    assert.equal(items.length, R.compositionCount(n), `count at n=${n}`);
    for (const parts of items) {
      assert.equal(parts.reduce((a, b) => a + b, 0), n, `${parts.join('+')} != ${n}`);
      assert.ok(parts.every((p) => p >= 1), `a division has an empty part: ${parts.join('+')}`);
    }
  }
});

test('the divisions are distinct, so the diagram shows no duplicate row', () => {
  const seen = new Set(R.enumerateCompositions(6, 1024).map((p) => p.join(',')));
  assert.equal(seen.size, R.compositionCount(6));
});

test('enumeration starts from the single whole group, which is what the engine tries first', () => {
  /* A greedy engine takes the longest first match, so (aaaa) precedes (aaa)(a). The diagram reads
     as a search order only if the enumeration shares that order. */
  assert.deepEqual(R.enumerateCompositions(4, 4), [[4], [3, 1], [2, 2], [2, 1, 1]]);
});

test('enumeration is capped, so the diagram cannot be asked to render 2^29 rows', () => {
  const items = R.enumerateCompositions(30, 16);
  assert.equal(items.length, 16);
  assert.equal(R.enumerateCompositions(30, 0).length, 0);
});

/* --- split points: the quadratic model ------------------------------------------------------ */

test('the leading .* has n+1 division points', () => {
  for (const n of [0, 1, 8, 50]) {
    assert.equal(R.splitPointModel(n).rows.length, n + 1, `n=${n}`);
  }
});

test('each division point provokes a whitespace scan of the remaining length', () => {
  const m = R.splitPointModel(8);
  /* Greedy first: `.*` stops at the end, nothing is left for `\s+`, and the match fails at once.
     Then it gives back one character at a time, and each give-back lengthens the scan. */
  assert.deepEqual(m.rows.map((r) => r.stop), [8, 7, 6, 5, 4, 3, 2, 1, 0]);
  assert.deepEqual(m.rows.map((r) => r.scan), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(m.rows[0].outcome, 'nothing left to scan');
  assert.match(m.rows[8].outcome, /fail/);
});

test('the modelled step count grows quadratically in the model, by construction', () => {
  /* Asserted on the MODEL, which is a closed form, not on a measurement. The page is explicit that
     these are different claims; so is this test. */
  for (const n of [1, 10, 100]) {
    assert.equal(R.splitPointModel(n).steps, (n * (n + 1)) / 2 + (n + 1), `n=${n}`);
  }
});

/* --- predicted candidates, per experiment --------------------------------------------------- */

test('each baseline carries the work model its pattern and input imply', () => {
  /* Derived from the engine rather than snapshotted: the work model belongs to the PATTERN for an
     attack input and collapses to linear for a benign one, which is the whole of the adversary's
     variable expressed as a model. A literal table here would have to be rewritten every time a
     pattern joins the chooser, and would stop asserting the rule. */
  for (const b of R.BASELINES) {
    const x = R.findExperiment(b.id);
    const pattern = R.EXPRESSIONS[b.patternId];
    const shape = R.findInputShape(b.inputId);
    if (shape.kind === 'benign') {
      assert.equal(x.modelOfWork, 'n', `${b.id}: a benign input must model as linear`);
      assert.equal(x.degree, 1, `${b.id}: a benign input must have degree 1`);
    } else {
      assert.equal(x.modelOfWork, pattern.modelOfWork, `${b.id}: model disagrees with its pattern`);
      assert.equal(x.degree, pattern.degree, `${b.id}: degree disagrees with its pattern`);
    }
  }
  /* And the five classes are all present across the chooser. */
  const classes = new Set(R.patternIds().map((p) => R.EXPRESSIONS[p].complexityClass));
  assert.deepEqual([...classes].sort(),
    ['cubic', 'exponential', 'linear', 'quadratic', 'quartic']);
});

test('the predicted candidate count follows the declared model', () => {
  assert.equal(R.predictedCandidates('ordinary', 1000), 1000);
  assert.equal(R.predictedCandidates('safe', 1000), 1000);
  assert.equal(R.predictedCandidates('quadratic', 1000), 500500);
  assert.equal(R.predictedCandidates('exponential', 21), 1048576);
});

test('the predicted curve covers the ladder the sweep will walk', () => {
  const curve = R.predictedCandidateCurve('quadratic', 4000);
  assert.deepEqual(curve.map((p) => p.length), R.lengthLadder('quadratic', 4000));
  for (let i = 1; i < curve.length; i += 1) {
    assert.ok(curve[i].candidates > curve[i - 1].candidates, 'the predicted curve is not increasing');
  }
});

test('the exponential model extracts far more work PER CHARACTER than the quadratic one', () => {
  /* A statement about the two MODELS — closed forms, no clock involved — and the comparison the
     predicted-work chart exists to make.

     Note what is NOT claimed: that the exponential ladder's top models more total work than the
     quadratic ladder's top. It does not, and that is an artefact of where the two ladders stop
     (28 characters against 28,000), not a fact about the expressions. The claim that survives the
     ladder bounds is the one that matters to an adversary: cost per character of input supplied.
     An adversary paying by the byte would rather have the nested quantifier. */
  const perChar = (id) => {
    const n = R.lengthBounds(id).max;
    return R.predictedCandidates(id, n) / n;
  };
  assert.ok(perChar('exponential') > 100 * perChar('quadratic'),
    `exponential ${perChar('exponential')} vs quadratic ${perChar('quadratic')} per character`);
  assert.ok(perChar('quadratic') > 10 * perChar('ordinary'),
    'the quadratic model does not out-work the linear one per character');
});

/* --- the model/trace distinction, held in the data ------------------------------------------ */

test('every backtracking model announces itself as a model', () => {
  for (const id of R.experimentIds()) {
    const m = R.backtrackingModel(id);
    assert.equal(m.isModel, true, `${id} does not declare itself a model`);
    assert.ok(m.label && m.label.length > 10, `${id} has no readable label`);
    assert.ok(m.formula, `${id} states no closed form`);
  }
});

test('the nested-quantifier family gets the composition model', () => {
  const m = R.backtrackingModel('exponential', 5);
  assert.equal(m.kind, 'compositions');
  assert.equal(m.illustrativeN, 5);
  assert.equal(m.formula, '2^(n-1)');
  assert.equal(m.items.length, 16);
});

test('every non-nested pattern gets the split-point model, with ITS degree’s formula', () => {
  /* The closed form follows the pattern's degree, so the assertion is over the degree rather than
     over one hard-coded formula. Checking only `n(n+1)/2` would have passed while the cubic and
     quartic patterns silently reported the quadratic form. */
  const FORMULAE = { 1: 'n', 2: 'n(n+1)/2', 3: 'n(n+1)(n+2)/6', 4: 'n(n+1)(n+2)(n+3)/24' };
  let checked = 0;
  for (const pid of R.patternIds()) {
    if (R.EXPRESSIONS[pid].hazard === 'exponential') continue;
    for (const iid of R.inputsForPattern(pid)) {
      const x = R.findExperiment({ patternId: pid, inputId: iid });
      const m = R.backtrackingModel({ patternId: pid, inputId: iid }, 8);
      assert.equal(m.kind, 'splitPoints', `${pid}.${iid}`);
      assert.equal(m.formula, FORMULAE[x.degree], `${pid}.${iid} at degree ${x.degree}`);
      assert.equal(m.model.rows.length, 9, `${pid}.${iid}`);
      assert.equal(m.degree, x.degree, `${pid}.${iid}`);
      checked += 1;
    }
  }
  assert.ok(checked >= 8, `only ${checked} configurations checked`);
});

test('the illustrative n is small enough to draw, whatever n the sweep used', () => {
  /* The diagram illustrates at a legible size and states the count for the real n. Rendering the
     actual 2^27 divisions is not an option, and pretending otherwise would be the one claim the
     page must not make. */
  const m = R.backtrackingModel('exponential');
  assert.ok(m.illustrativeN <= 8, `illustrative n is ${m.illustrativeN}`);
  assert.ok(m.items.length <= 128, `${m.items.length} rows would be drawn`);
});

/* --- describing observed growth ------------------------------------------------------------- */

test('fewer than three points yields no fit at all', () => {
  for (const pts of [[], [{ length: 1, ms: 1 }], [{ length: 1, ms: 1 }, { length: 2, ms: 4 }]]) {
    const r = R.observedScaling(pts);
    assert.equal(r.basis, null);
    assert.equal(r.exponent, null);
    assert.match(r.note, /three/);
  }
});

test('non-finite, zero, and negative measurements are discarded before fitting', () => {
  const r = R.observedScaling([
    { length: 10, ms: 0 }, { length: 20, ms: NaN }, { length: 40, ms: Infinity },
    { length: 80, ms: -1 }, { length: 160, ms: 5 },
  ]);
  assert.equal(r.points, 1, 'a junk measurement reached the fit');
  assert.equal(r.basis, null);
});

test('a synthetic quadratic series is described as exponent 2 on a log-log basis', () => {
  /* Synthetic, not measured. The point of the fit is to describe a run; the point of this test is
     that the arithmetic is right, which is only checkable on data whose answer is known. */
  const pts = [10, 20, 40, 80, 160].map((n) => ({ length: n, ms: n * n * 1e-4 }));
  const r = R.observedScaling(pts);
  assert.equal(r.basis, 'log-log');
  assert.ok(Math.abs(r.exponent - 2) < 1e-9, `exponent ${r.exponent}`);
  assert.ok(r.exponentR2 > 0.999);
  assert.equal(r.points, 5);
});

test('a synthetic linear series is described as exponent 1', () => {
  const pts = [100, 200, 400, 800].map((n) => ({ length: n, ms: n * 1e-3 }));
  const r = R.observedScaling(pts);
  assert.ok(Math.abs(r.exponent - 1) < 1e-9, `exponent ${r.exponent}`);
});

test('a synthetic doubling-per-step series prefers the semi-log basis', () => {
  /* t = 2^n. On log-log this is a curve; on semi-log it is a straight line, so the better-
     correlated basis must be the semi-log one and the per-step growth must come out at 2. */
  const pts = [20, 21, 22, 23, 24, 25].map((n) => ({ length: n, ms: Math.pow(2, n) * 1e-6 }));
  const r = R.observedScaling(pts);
  assert.equal(r.basis, 'semi-log');
  assert.ok(Math.abs(r.growthPerStep - 2) < 1e-6, `growth per step ${r.growthPerStep}`);
  assert.ok(r.growthR2 > 0.999);
});

test('the fit labels itself as descriptive, not as a property of the expression', () => {
  const r = R.observedScaling([10, 20, 40].map((n) => ({ length: n, ms: n })));
  assert.match(r.note, /this run on this machine/);
  assert.match(r.note, /not a property of the expression/);
});

test('a flat series yields no fit rather than a meaningless slope', () => {
  const r = R.observedScaling([{ length: 10, ms: 5 }, { length: 10, ms: 5 }, { length: 10, ms: 5 }]);
  assert.equal(r.basis, null);
});
