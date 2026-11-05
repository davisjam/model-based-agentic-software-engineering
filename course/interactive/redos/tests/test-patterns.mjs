/* test-patterns.mjs — the curated patterns and the inputs they are run against.
 *
 * Two obligations, and the second is the one a timing demonstration usually skips:
 *
 *   1. INPUT CONSTRUCTION. Each generated input matches the shape the page documents, and the
 *      lengths respect the declared limits. A chart's x-axis is only meaningful if the input is
 *      reproducible from it.
 *   2. MEANING. Each curated expression matches and fails as intended on small inputs. A
 *      demonstration that mis-states what its expressions DECIDE teaches the wrong lesson, however
 *      honest its stopwatch. The safe alternative carries the heaviest version of this obligation:
 *      "same decision, far less work" is only worth claiming if the two expressions really do
 *      accept the same language, so that is checked exhaustively rather than argued.
 *
 * Nothing here asserts a timing, a ratio, or a growth rate.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { R } from './harness.mjs';

/* --- the experiment table ------------------------------------------------------------------- */

test('the six named baselines are in the order the lecture notes refer to', () => {
  /* The ORDINALS are the stable surface: the 3-5-1 deck's speaker notes run the demonstration as
     "run 1, then 2 ... run 3 ... run 4 last", and baselines 5 and 6 are the two real incidents.
     The canonical ids are derived from the pattern and input a baseline selects, so they are looked
     up rather than spelled out. */
  assert.deepEqual(R.baselineIds(),
    ['ordinary', 'quadratic', 'exponential', 'safe', 'stackoverflow', 'cloudflare']);
  assert.deepEqual(R.EXPERIMENTS.map((x) => x.ordinal), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(R.experimentIds(), R.baselineIds().map((id) => R.findExperiment(id).id));
});

test('each baseline declares the growth its structure predicts', () => {
  assert.deepEqual(
    R.BASELINES.map((b) => [b.id, R.findExperiment(b.id).expectedGrowth]),
    [
      ['ordinary', 'approximately linear'],
      ['quadratic', 'approximately quadratic'],
      ['exponential', 'potentially exponential'],
      ['safe', 'approximately linear'],
      ['stackoverflow', 'approximately quadratic'],
      ['cloudflare', 'approximately cubic'],
    ],
  );
});

test('every pattern’s advertised complexity class is the class that was MEASURED', () => {
  /* The assertion that stops the page printing a complexity label its own instrument refutes. The
     author's own note on the Cloudflare pattern read "quintic I think"; measured in V8 the fragment
     the postmortem names is cubic and the whole trailing group quartic, and this test is why the
     page says so. A degree measured over a finite range approaches its asymptote from BELOW, so the
     tolerance is one-sided and generous downward. */
  for (const pid of R.patternIds()) {
    const ex = R.EXPRESSIONS[pid];
    const row = R.measuredClass(pid);
    assert.equal(row.label, ex.complexityClass,
      `${pid} advertises ${ex.complexityClass} and measured ${row.label}`);
    if (row.basis === 'polynomial') {
      assert.ok(row.degree > ex.degree - 1.1 && row.degree < ex.degree + 0.5,
        `${pid}: declares degree ${ex.degree}, measured ${row.degree}`);
    } else {
      assert.equal(ex.complexityClass, 'exponential', pid);
      assert.ok(row.perChar > 1.5, `${pid}: per-character factor ${row.perChar}`);
    }
    assert.ok(row.r2 > 0.98, `${pid}: the fit is too poor to label (R² ${row.r2})`);
    assert.match(row.range, /^n = /, `${pid}: no fitted range recorded`);
  }
  assert.match(R.MEASURED_CLASSES.engine, /V8/);
  /* Nothing in the set is labelled quintic, because nothing in the set measured quintic. */
  const labels = R.patternIds().map((p) => R.EXPRESSIONS[p].complexityClass);
  assert.equal(labels.includes('quintic'), false,
    'a pattern claims a quintic class; no shipped pattern measured one');
});

test('the Cloudflare and Stack Overflow patterns are the incident expressions, and say so', () => {
  const cf = R.EXPRESSIONS.cloudflareFragment;
  assert.equal(cf.source, '.*(?:.*=.*)', 'the Cloudflare fragment is not the postmortem’s');
  assert.match(cf.incident, /Cloudflare, 2 July 2019/);
  assert.match(cf.incident, /27 minutes/);
  const so = R.EXPRESSIONS.stackOverflow2016;
  assert.equal(so.source, '^[\\s\\u200c]+|[\\s\\u200c]+$',
    'the Stack Overflow pattern is not the one from the postmortem');
  assert.match(so.incident, /Stack Overflow, 20 July 2016/);
  /* The full Cloudflare trailing group, with the leading alternation restored, ships too — it is
     what makes the degree-follows-repetition-count rule observable rather than asserted. */
  assert.match(R.EXPRESSIONS.cloudflareGroup.source, /^\(\?:\\s\|/);
  assert.equal(R.EXPRESSIONS.cloudflareGroup.degree, 4);
  assert.equal(R.EXPRESSIONS.cloudflareFragment.degree, 3);
});

test('the 2x2 holds: one variable changes per comparison', () => {
  const xp = (id) => R.findExperiment(id);
  /* 1 vs 2 — same expression, different input: the ADVERSARY'S variable. */
  assert.equal(xp('ordinary').expression, xp('quadratic').expression);
  assert.notEqual(xp('ordinary').inputKind, xp('quadratic').inputKind);
  /* 2 vs 4 — same input, different expression: the ENGINEER'S variable. */
  assert.equal(xp('quadratic').inputKind, xp('safe').inputKind);
  assert.notEqual(xp('quadratic').expression, xp('safe').expression);
});

test('only the curated expressions exist, each is reachable, and the ladder spans five classes', () => {
  const ids = Object.keys(R.EXPRESSIONS).sort();
  assert.deepEqual(ids, ['cloudflareFragment', 'cloudflareGroup', 'forcedSplit',
    'nestedQuant', 'stackOverflow2016', 'trimLike']);
  /* Reachability is now through the PATTERN CONTROL rather than through a preset, so the check is
     that every declared expression is offered by the chooser — a pattern the interface cannot
     select is dead weight in a page whose size is itself gated. */
  assert.deepEqual(R.patternIds().slice().sort(), ids);
  for (const id of ids) {
    assert.ok(R.inputsForPattern(id).length >= 2,
      `${id} offers fewer than two input shapes, so "same pattern, different input" is unavailable`);
  }
  /* Five complexity classes, in a set of six patterns: the ladder is the point of the set. */
  const classes = ids.map((id) => R.EXPRESSIONS[id].complexityClass);
  assert.equal(new Set(classes).size, 5, `classes: ${classes.join(', ')}`);
});

test('every expression compiles, and a fresh instance is returned each time', () => {
  for (const id of Object.keys(R.EXPRESSIONS)) {
    const a = R.compile(id);
    const b = R.compile(id);
    assert.ok(a instanceof RegExp, `${id} did not compile`);
    assert.notEqual(a, b, `${id} returned a shared RegExp instance`);
    assert.equal(a.source, R.EXPRESSIONS[id].source);
  }
});

test('an unknown expression or experiment is refused, not silently defaulted', () => {
  assert.throws(() => R.compile('nope'), /unknown expression/);
  assert.throws(() => R.findExperiment('nope'), /unknown experiment/);
});

/* --- input construction --------------------------------------------------------------------- */

test('ordinary input is prose of exactly the requested length, ending in a letter', () => {
  for (const n of [500, 1234, 20000]) {
    const s = R.buildInput('ordinary', n);
    assert.equal(s.length, n, `length at n=${n}`);
    assert.match(s, /^[A-Za-z ]+$/, `character set at n=${n}`);
    assert.match(s, /[A-Za-z]$/, `must not end in whitespace at n=${n}`);
  }
});

test('ordinary input contains no whitespace run longer than one character', () => {
  /* This is what makes it ORDINARY. A long whitespace run is precisely the adversary's lever, so
     an "ordinary" input carrying one would quietly turn Experiment 1 into Experiment 2. */
  const s = R.buildInput('ordinary', 20000);
  assert.equal(/\s\s/.test(s), false, 'the ordinary input contains a whitespace run');
});

test('the quadratic input is n spaces then one non-whitespace sentinel', () => {
  for (const n of [1, 500, 28000]) {
    const s = R.buildInput('quadratic', n);
    assert.equal(s.length, n + 1, `length at n=${n}`);
    assert.match(s, /^ +!$/, `shape at n=${n}`);
    assert.equal(s.slice(0, n), ' '.repeat(n));
  }
});

test('the exponential input is n copies of a then one non-whitespace sentinel', () => {
  for (const n of [1, 12, 30]) {
    const s = R.buildInput('exponential', n);
    assert.equal(s.length, n + 1, `length at n=${n}`);
    assert.match(s, /^a+!$/, `shape at n=${n}`);
  }
});

test('Experiments 2 and 4 receive byte-identical input at every ladder length', () => {
  /* The headline claim of the pair — "the adversary is doing exactly the same thing" — is a
     statement about bytes, so it is checked on bytes rather than asserted in the page copy. */
  const lengths = R.findExperiment('quadratic').ladder;
  assert.deepEqual(lengths, R.findExperiment('safe').ladder);
  for (const n of lengths) {
    assert.equal(R.buildInput('quadratic', n), R.buildInput('safe', n), `differ at n=${n}`);
  }
});

test('an invalid length is refused rather than coerced', () => {
  for (const bad of [0, -1, 1.5, NaN, Infinity, '500', null, undefined]) {
    assert.throws(() => R.buildInput('quadratic', bad), /positive integer/,
      `accepted ${String(bad)}`);
  }
});

test('the documented input shape is stated for every baseline', () => {
  assert.equal(R.describeInputShape('ordinary'),
    'ordinary text of length n, single spaces, ending in a letter');
  assert.equal(R.describeInputShape('quadratic'), '" " repeated n times, then "!"');
  assert.equal(R.describeInputShape('safe'), '" " repeated n times, then "!"');
  assert.equal(R.describeInputShape('exponential'), '"a" repeated n times, then "!"');
  assert.equal(R.describeInputShape('stackoverflow'),
    '"a", then " " repeated n times, then "a"');
  assert.equal(R.describeInputShape('cloudflare'), '"x" repeated n times');
  /* And every shape in the catalogue describes itself, so no configuration can render a blank. */
  for (const id of Object.keys(R.INPUT_SHAPES)) {
    const shape = R.findInputShape(id);
    assert.ok(shape.describe && shape.describe.length > 8, `${id} has no description`);
    assert.ok(shape.why && shape.why.length > 20, `${id} has no rationale`);
    assert.ok(shape.kind === 'attack' || shape.kind === 'benign', `${id} has kind ${shape.kind}`);
    assert.equal(typeof shape.expectMatch, 'boolean', `${id} does not declare its match result`);
  }
});

test('an attack input is prefix + pump x n + suffix, exactly, and fails by construction', () => {
  /* The pump model is what makes "the number of pumps" the x-axis of every chart, so the
     construction is asserted rather than described. */
  for (const id of Object.keys(R.INPUT_SHAPES)) {
    const shape = R.findInputShape(id);
    if (shape.mode !== 'pump') continue;
    const pattern = R.patternIds().find((p) => R.inputsForPattern(p).includes(id));
    assert.ok(pattern, `${id} is declared but no pattern offers it`);
    for (const n of [1, 5, 17]) {
      const built = R.buildInput({ patternId: pattern, inputId: id }, n);
      assert.equal(built, shape.prefix + shape.pump.repeat(n) + shape.suffix,
        `${id} at ${n} pumps is not prefix + pump x n + suffix`);
    }
    if (shape.kind === 'attack') {
      assert.equal(shape.expectMatch, false,
        `${id} is an attack shape, so the match must fail or the comparison confounds work with answer`);
    }
  }
});

test('a pump count must be a positive integer, and an impossible pair is refused', () => {
  for (const bad of [0, -3, 2.5, NaN, Infinity, '40', null]) {
    assert.throws(() => R.buildInput('quadratic', bad), /pump count/, `accepted ${String(bad)}`);
  }
  /* The two chooser controls are not independent: an input shape belongs to a pattern, and asking
     for a pair the model does not define is an error rather than a silent default. */
  assert.throws(() => R.findExperiment({ patternId: 'nestedQuant', inputId: 'withEquals' }),
    /does not offer input/);
  assert.throws(() => R.findExperiment({ patternId: 'nope', inputId: 'aRun' }), /unknown pattern/);
  assert.throws(() => R.findInputShape('nope'), /unknown input shape/);
});

test('a long input is excerpted rather than rendered in full', () => {
  const e = R.excerptInput('quadratic', 28000);
  assert.ok(e.length < 200, `excerpt is ${e.length} characters`);
  assert.match(e, /more/, 'the elision is not announced');
  assert.equal(e.includes('\n'), false, 'the excerpt spans lines');
  /* Whitespace is made visible, or a reader sees an empty box and learns nothing. */
  assert.match(e, /·/, 'spaces are not made visible');
});

test('a short input is excerpted verbatim', () => {
  assert.equal(R.excerptInput('exponential', 6), 'aaaaaa!');
});

/* --- ladders and limits --------------------------------------------------------------------- */

test('each ladder is strictly increasing and respects its experiment bounds', () => {
  for (const xp of R.EXPERIMENTS) {
    for (let i = 1; i < xp.ladder.length; i += 1) {
      assert.ok(xp.ladder[i] > xp.ladder[i - 1], `${xp.id} ladder is not increasing at ${i}`);
    }
    const b = R.lengthBounds(xp.id);
    assert.equal(b.min, xp.ladder[0]);
    assert.equal(b.max, xp.ladder[xp.ladder.length - 1]);
    assert.ok(xp.defaultMax <= b.max, `${xp.id} default exceeds its maximum`);
    assert.ok(xp.defaultMax >= b.min, `${xp.id} default is below its minimum`);
  }
});

test('the exponential experiment uses a small input range, by design', () => {
  /* The specification is explicit: a bounded input range and strict execution limits for the
     exponential case. Tens of characters, not thousands. */
  const b = R.lengthBounds('exponential');
  assert.ok(b.max <= 40, `exponential maximum is ${b.max}`);
  assert.ok(b.min >= 8, `exponential minimum is ${b.min}`);
});

test('the quadratic experiment ranges widely, also by design', () => {
  /* "The quadratic case is especially useful because it can be demonstrated over a wider input
     range without requiring extremely expensive executions." */
  const b = R.lengthBounds('quadratic');
  assert.ok(b.max >= 10000, `quadratic maximum is only ${b.max}`);
});

test('a ladder clipped to a maximum keeps every length at or below it', () => {
  const l = R.lengthLadder('quadratic', 5000);
  assert.ok(l.length >= 2);
  for (const n of l) assert.ok(n <= 5000, `${n} exceeds the cap`);
  assert.equal(Math.max(...l), 4000);
});

test('a ladder clipped below its own floor still yields two comparable points', () => {
  const l = R.lengthLadder('quadratic', 1);
  assert.equal(l.length, 2, 'a sweep with fewer than two points compares nothing');
});

test('omitting the maximum uses the experiment default', () => {
  const l = R.lengthLadder('exponential');
  assert.equal(Math.max(...l), R.findExperiment('exponential').defaultMax);
});

/* --- what the expressions MEAN -------------------------------------------------------------- */

test('every curated expression matches and fails as documented', () => {
  assert.deepEqual(R.checkMatchExamples(), []);
});

test('the match-example table covers every expression, both verdicts', () => {
  for (const id of Object.keys(R.EXPRESSIONS)) {
    const mine = R.MATCH_EXAMPLES.filter((e) => e.expression === id);
    assert.ok(mine.some((e) => e.shouldMatch === true), `${id} has no positive example`);
    assert.ok(mine.some((e) => e.shouldMatch === false), `${id} has no negative example`);
  }
});

test('every generated input FAILS to match, so the four trials differ only in work', () => {
  /* If the ordinary input matched and the adversarial one did not, the comparison would confound
     "different work" with "different answer". Every trial must reach the same verdict. */
  for (const xp of R.EXPERIMENTS) {
    for (const n of [xp.ladder[0], xp.defaultMax]) {
      const matched = R.compile(xp.expression).test(R.buildInput(xp.id, n));
      assert.equal(matched, false, `${xp.id} matched at n=${n}`);
    }
  }
});

test('the safe alternative accepts exactly the same language as the pathological one', () => {
  /* Exhaustive over an alphabet chosen to exercise every construct in both expressions: a letter,
     a space, a tab, a newline (the one character `.` excludes and `\s` includes), and a
     non-whitespace sentinel. 5^0..5^6 is 19,531 strings — enumerated, not sampled.
     This is the claim the whole fourth experiment rests on. */
  const r = R.equivalenceDivergences(6);
  assert.equal(r.tested, 19531, `tested ${r.tested} strings`);
  assert.deepEqual(r.divergences, [], 'the safe alternative decides a different question');
});

test('the equivalence check would actually catch a divergence', () => {
  /* A check that cannot fail proves nothing, so sabotage it: a plausible-looking "safe"
     alternative that is NOT equivalent must be reported as divergent. /^[^\n]*\s$/ is the
     near-miss — it requires exactly one trailing whitespace character, where the original admits a
     run, so it diverges on strings like "aa\n ". */
  const pathological = R.compile(R.EQUIVALENCE_PAIR.pathological);
  const nearMiss = /^[^\n]*\s$/;
  const alphabet = R.EQUIVALENCE_ALPHABET;
  const found = [];
  const walk = (s) => {
    if (pathological.test(s) !== nearMiss.test(s)) found.push(s);
    if (s.length >= 4) return;
    for (const c of alphabet) walk(s + c);
  };
  walk('');
  assert.ok(found.length > 0,
    'the near-miss alternative was not detected as divergent — the check is inert');
});

test('the equivalence alphabet includes the characters that make the question subtle', () => {
  assert.ok(R.EQUIVALENCE_ALPHABET.includes('\n'),
    'without a newline the two expressions cannot be distinguished at all');
  assert.ok(R.EQUIVALENCE_ALPHABET.includes('\t'), 'no non-space whitespace in the alphabet');
  assert.ok(R.EQUIVALENCE_ALPHABET.some((c) => /\S/.test(c)), 'no non-whitespace in the alphabet');
});

test('divergence reporting is capped so a broken pair cannot flood the caller', () => {
  const r = R.equivalenceDivergences(2, 3);
  assert.ok(Array.isArray(r.divergences));
  assert.ok(r.divergences.length <= 3);
});
