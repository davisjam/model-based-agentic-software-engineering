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

test('there are exactly four experiments, in the documented order', () => {
  assert.deepEqual(R.experimentIds(), ['ordinary', 'quadratic', 'exponential', 'safe']);
  assert.deepEqual(R.EXPERIMENTS.map((x) => x.ordinal), [1, 2, 3, 4]);
});

test('each experiment declares the growth its structure predicts', () => {
  assert.deepEqual(
    R.EXPERIMENTS.map((x) => [x.id, x.expectedGrowth]),
    [
      ['ordinary', 'approximately linear'],
      ['quadratic', 'approximately quadratic'],
      ['exponential', 'potentially exponential'],
      ['safe', 'approximately linear'],
    ],
  );
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

test('only the three curated expressions exist, and each is used', () => {
  const ids = Object.keys(R.EXPRESSIONS).sort();
  assert.deepEqual(ids, ['forcedSplit', 'nestedQuant', 'trimLike']);
  for (const id of ids) {
    const users = R.EXPERIMENTS.filter((x) => x.expression === id);
    assert.ok(users.length >= 1, `${id} is declared but no experiment uses it`);
  }
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

test('the documented input shape is stated for every experiment', () => {
  assert.equal(R.describeInputShape('ordinary'),
    'ordinary prose of length n, single spaces, ending in a letter');
  assert.equal(R.describeInputShape('quadratic'), '" " repeated n times, then "!"');
  assert.equal(R.describeInputShape('safe'), '" " repeated n times, then "!"');
  assert.equal(R.describeInputShape('exponential'), '"a" repeated n times, then "!"');
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
