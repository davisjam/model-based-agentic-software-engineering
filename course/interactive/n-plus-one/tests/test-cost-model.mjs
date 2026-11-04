/* test-cost-model.mjs — the arithmetic, and the properties the arithmetic is supposed to have.
 *
 * Nothing here asserts a wall-clock measurement. Every assertion is against a number the model
 * computed from parameters and published constants, which is exactly what a deterministic cost
 * model makes possible: the expected values can be written out by hand.
 *
 * Two kinds of assertion, kept apart on purpose.
 *   - EXACT: the quantities the model computes by arithmetic (query count, round-trip overhead,
 *     the schedule's contiguity, byte totals). These are pinned to literals.
 *   - STRUCTURAL: the relationships the model must preserve for the exercise to teach anything
 *     (round trips dominate, lazy is the expensive one, eager trades bytes for round trips).
 *     These are pinned as inequalities, so a change to a constant does not red the suite for a
 *     reason nobody cares about while a change that inverts the lesson does.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { M, LANDER, withParams } from './harness.mjs';

const C = M.COST_MODEL;
const cost = (overrides) => M.computeCost(withParams(overrides));

/* --- the published constants ------------------------------------------------------------------ */

test('the cost constants are the ones the page prints', () => {
  /* The page states these in a table. If a constant moves, the table must move with it, and this
     assertion is what makes that a deliberate edit rather than a silent drift. */
  assert.equal(C.STATEMENT_MS, 0.15);
  assert.equal(C.ROW_MS, 0.004);
  assert.equal(C.JOIN_ROW_FACTOR, 1.6);
  assert.equal(C.QUERY_BYTES, 200);
  assert.equal(C.RESERVATION_ROW_BYTES, 80);
  assert.equal(C.ROOM_ROW_BYTES, 120);
});

/* --- round-trip overhead ---------------------------------------------------------------------- */

test('round-trip overhead is exactly queries × latency', () => {
  for (const [strategy, cache, latency] of [
    ['lazy', 'off', 10], ['lazy', 'on', 10], ['eager', 'off', 10], ['batched', 'off', 10],
    ['lazy', 'off', 1], ['lazy', 'off', 100], ['lazy', 'on', 47],
  ]) {
    const c = cost({ strategy, cache, latencyMs: latency });
    assert.equal(c.roundTripMs, c.queries * latency,
      `${strategy}/${cache} at ${latency} ms`);
  }
  /* The lecture's figure, written out. */
  assert.equal(cost({}).roundTripMs, 2010);
  assert.equal(cost({ cache: 'on' }).roundTripMs, 110);
  assert.equal(cost({ strategy: 'eager' }).roundTripMs, 10);
  assert.equal(cost({ strategy: 'batched' }).roundTripMs, 20);
});

test('sequential lazy loads accumulate — latency is charged once per query, not once per request', () => {
  /* The whole point of the exercise. Doubling the latency doubles the overhead because the queries
     run one after another; a pipelined model would not behave this way, and the page says it
     assumes sequential execution. */
  const at10 = cost({ latencyMs: 10 });
  const at20 = cost({ latencyMs: 20 });
  assert.equal(at20.roundTripMs, at10.roundTripMs * 2);
  assert.ok(at10.roundTripMs > at10.dbProcessingMs * 50,
    'round-trip overhead must dominate database processing at the lecture configuration');
});

test('the schedule is contiguous, sequential, and sums to the total', () => {
  for (const overrides of [{}, { cache: 'on' }, { strategy: 'eager' }, { strategy: 'batched' },
    { reservations: 1 }, { reservations: 1000, distinctRooms: 200 }]) {
    const c = cost(overrides);
    assert.equal(c.timeline.length, c.queries);
    assert.equal(c.timeline[0].startMs, 0, 'the first query starts at zero');
    for (let i = 1; i < c.timeline.length; i += 1) {
      assert.ok(Math.abs(c.timeline[i].startMs - c.timeline[i - 1].endMs) < 1e-9,
        'query k must start where query k-1 finished: no overlap, no gap');
    }
    const last = c.timeline[c.timeline.length - 1];
    assert.ok(Math.abs(last.endMs - c.totalMs) < 1e-9,
      'the last query must finish at the total response time');
    const summed = c.timeline.reduce((a, q) => a + q.durationMs, 0);
    assert.ok(Math.abs(summed - c.totalMs) < 1e-9);
  }
});

test('each scheduled query costs its latency plus its own processing', () => {
  const c = cost({ reservations: 6, distinctRooms: 3, cache: 'off' });
  for (const q of c.timeline) {
    assert.equal(q.latencyMs, 10);
    assert.ok(Math.abs(q.durationMs - (q.latencyMs + q.dbMs)) < 1e-12);
    assert.ok(q.dbMs > 0, 'no query is free');
  }
  /* The reservations query returns 6 rows; each room query returns 1. */
  assert.deepEqual(c.timeline.map((q) => q.rows), [6, 1, 1, 1, 1, 1, 1]);
});

/* --- database processing ---------------------------------------------------------------------- */

test('database processing is statement cost per query plus row cost per row', () => {
  const c = cost({});
  /* 201 statements, and 200 reservation rows + 200 single-row room results = 400 rows. */
  const expected = C.STATEMENT_MS * 201 + C.ROW_MS * 400;
  assert.ok(Math.abs(c.dbProcessingMs - expected) < 1e-9,
    `expected ${expected}, got ${c.dbProcessingMs}`);
});

test('the eager join pays the join row factor', () => {
  const c = cost({ strategy: 'eager' });
  const expected = C.STATEMENT_MS * 1 + C.ROW_MS * 200 * C.JOIN_ROW_FACTOR;
  assert.ok(Math.abs(c.dbProcessingMs - expected) < 1e-9);
  /* And a non-join query of the same size does not. */
  const plain = cost({ strategy: 'batched' });
  assert.ok(Math.abs(plain.dbProcessingMs
    - (C.STATEMENT_MS * 2 + C.ROW_MS * (200 + 10))) < 1e-9);
});

test('total response time is round-trip overhead plus database processing, and nothing else', () => {
  for (const overrides of [{}, { cache: 'on' }, { strategy: 'eager' }, { strategy: 'batched' }]) {
    const c = cost(overrides);
    assert.ok(Math.abs(c.totalMs - (c.roundTripMs + c.dbProcessingMs)) < 1e-9);
  }
});

/* --- data transferred ------------------------------------------------------------------------- */

test('data transferred is per-query framing plus the rows each query returns', () => {
  const c = cost({});
  const expected = C.QUERY_BYTES * 201
    + 200 * C.RESERVATION_ROW_BYTES
    + 200 * C.ROOM_ROW_BYTES;
  assert.equal(c.bytes, expected);
  assert.equal(c.bytes, 80200);
});

test('the lazy cache reduces bytes as well as queries', () => {
  const on = cost({ cache: 'on' });
  assert.equal(on.bytes, C.QUERY_BYTES * 11 + 200 * C.RESERVATION_ROW_BYTES + 10 * C.ROOM_ROW_BYTES);
  assert.equal(on.bytes, 19400);
  assert.ok(on.bytes < cost({}).bytes);
});

test('the eager join repeats the room columns on every row — more bytes, fewer round trips', () => {
  const eager = cost({ strategy: 'eager' });
  assert.equal(eager.bytes, C.QUERY_BYTES + 200 * (C.RESERVATION_ROW_BYTES + C.ROOM_ROW_BYTES));
  assert.equal(eager.bytes, 40200);

  const batched = cost({ strategy: 'batched' });
  assert.equal(batched.bytes, C.QUERY_BYTES * 2 + 200 * C.RESERVATION_ROW_BYTES + 10 * C.ROOM_ROW_BYTES);
  assert.equal(batched.bytes, 17600);

  /* This is the genuine tradeoff the exercise exposes, and it is not an artefact: a join really
     does denormalise the room onto every reservation row, while an IN-list sends each room once.
     Eager wins the round trips; batched wins the wire. */
  assert.ok(eager.totalMs < batched.totalMs, 'eager must be faster — one round trip beats two');
  assert.ok(eager.bytes > batched.bytes, 'eager must transfer more — the join duplicates rooms');
});

test('batched transfers the fewest bytes whenever rooms repeat, and ties when they do not', () => {
  const few = (strategy) => cost({ strategy, distinctRooms: 10 }).bytes;
  assert.ok(few('batched') < few('eager'));
  assert.ok(few('batched') < cost({ strategy: 'lazy', cache: 'on', distinctRooms: 10 }).bytes);

  /* At D = N the join's duplication is no duplication at all, so the gap closes to the framing. */
  const d200 = (strategy, cache) => cost({ strategy, cache, distinctRooms: 200 }).bytes;
  assert.ok(d200('eager', 'off') < d200('lazy', 'on'),
    'with no repetition, one join still beats 201 separate round trips on the wire');
});

/* --- the properties that make the lesson land ------------------------------------------------- */

test('lazy with the cache off is the most expensive configuration by a wide margin', () => {
  const rows = M.compareStrategies(LANDER);
  const lazyOff = rows.find((r) => r.id === 'lazy-off');
  const others = rows.filter((r) => r.id !== 'lazy-off');
  for (const other of others) {
    assert.ok(lazyOff.totalMs > other.totalMs * 10,
      `lazy/off (${lazyOff.totalMs} ms) should be an order of magnitude worse than ${other.id} (${other.totalMs} ms)`);
  }
  /* "200 individually cheap queries can be expensive" — each is 10.04 ms and the total is 2 s. */
  assert.ok(lazyOff.totalMs > 2000);
  assert.ok(lazyOff.totalMs / lazyOff.queries < 11);
});

test('total response time rises with N under lazy loading and does not under eager', () => {
  const lazyGrowth = [10, 100, 1000].map((n) => cost({ reservations: n, distinctRooms: 10, cache: 'off' }).totalMs);
  for (let i = 1; i < lazyGrowth.length; i += 1) assert.ok(lazyGrowth[i] > lazyGrowth[i - 1] * 5);

  /* Eager still grows — the join returns more rows — but only through the row term, so a
     hundredfold rise in N moves the total by less than a factor of two while lazy moves by a
     hundredfold. That ratio is the lesson, not flatness. */
  const eagerGrowth = [10, 100, 1000].map((n) => cost({ reservations: n, distinctRooms: 10, strategy: 'eager' }).totalMs);
  assert.ok(eagerGrowth[2] < eagerGrowth[0] * 2,
    'one round trip does not grow with N; only its row cost does');
  assert.ok(lazyGrowth[2] / lazyGrowth[0] > 50 * (eagerGrowth[2] / eagerGrowth[0]),
    'lazy must scale with N far more steeply than eager');
});

test('the comparison reports all four configurations and marks the current one exactly once', () => {
  for (const [strategy, cache, expectedId] of [
    ['lazy', 'off', 'lazy-off'],
    ['lazy', 'on', 'lazy-on'],
    ['eager', 'off', 'eager'],
    ['eager', 'on', 'eager'],
    ['batched', 'off', 'batched'],
    ['batched', 'on', 'batched'],
  ]) {
    const rows = M.compareStrategies(withParams({ strategy, cache }));
    assert.equal(rows.length, 4);
    const current = rows.filter((r) => r.current);
    assert.equal(current.length, 1, `${strategy}/${cache} should mark exactly one row current`);
    assert.equal(current[0].id, expectedId);
  }
});

test('the comparison rows agree with computeCost for the same configuration', () => {
  const rows = M.compareStrategies(withParams({ reservations: 137, distinctRooms: 17, latencyMs: 23 }));
  for (const row of rows) {
    const direct = M.computeCost({
      reservations: 137, latencyMs: 23, distinctRooms: 17,
      strategy: row.strategy, cache: row.cache,
    });
    assert.equal(row.queries, direct.queries);
    assert.equal(row.totalMs, direct.totalMs);
    assert.equal(row.bytes, direct.bytes);
  }
});

/* --- cost bands ------------------------------------------------------------------------------- */

test('cost bands partition the range and carry a word and a glyph, not only a colour', () => {
  assert.equal(M.bandFor(0).id, 'cheap');
  assert.equal(M.bandFor(99.9).id, 'cheap');
  assert.equal(M.bandFor(100).id, 'noticeable');
  assert.equal(M.bandFor(499.9).id, 'noticeable');
  assert.equal(M.bandFor(500).id, 'expensive');
  assert.equal(M.bandFor(1e9).id, 'expensive');
  for (const band of M.COST_BANDS) {
    assert.ok(band.word.length > 0, 'every band names itself in words');
    assert.ok(band.glyph.length > 0, 'every band carries a glyph');
    assert.match(band.cls, /^s-/);
  }
  /* And the bands are attached to the computed cost, so the readout cannot pick its own. */
  assert.equal(cost({}).band.id, 'expensive');
  assert.equal(cost({ strategy: 'eager' }).band.id, 'cheap');
  assert.equal(cost({ cache: 'on' }).band.id, 'noticeable');
});

/* --- determinism ------------------------------------------------------------------------------ */

test('the model is deterministic: the same parameters always give the same numbers', () => {
  const params = withParams({ reservations: 613, distinctRooms: 29, latencyMs: 37, cache: 'on' });
  const first = M.computeCost(params);
  for (let i = 0; i < 25; i += 1) {
    const again = M.computeCost(params);
    assert.equal(again.queries, first.queries);
    assert.equal(again.totalMs, first.totalMs);
    assert.equal(again.bytes, first.bytes);
    assert.equal(again.cacheHits, first.cacheHits);
  }
});

test('nothing in the engine draws a random number', () => {
  /* A seeded simulator would be a different instrument. The specification asks for a deterministic
     cost model, so the absence of a generator is a property worth pinning. */
  const source = M.computeCost.toString() + M.queryPlan.toString() + M.normalizeParams.toString();
  assert.equal(/Math\.random/.test(source), false);
});

/* --- formatting ------------------------------------------------------------------------------- */

test('the formatters produce the strings the readouts and the canvas labels share', () => {
  assert.equal(M.formatMs(2041.75), '2.04 s');
  assert.equal(M.formatMs(112.49), '112 ms');
  assert.equal(M.formatMs(21.14), '21.1 ms');
  assert.equal(M.formatMs(1.43), '1.43 ms');
  assert.equal(M.formatBytes(80200), '78.3 KB');
  assert.equal(M.formatBytes(512), '512 B');
  assert.equal(M.formatBytes(2 * 1048576), '2.00 MB');
  assert.equal(M.formatCount(1001), '1,001');
  assert.equal(M.formatCount(7), '7');
});

test('explain() names the cause, and names a different one per configuration', () => {
  const texts = [
    M.explain(cost({ strategy: 'lazy', cache: 'off' })),
    M.explain(cost({ strategy: 'lazy', cache: 'on' })),
    M.explain(cost({ strategy: 'lazy', cache: 'on', distinctRooms: 200 })),
    M.explain(cost({ strategy: 'eager' })),
    M.explain(cost({ strategy: 'batched' })),
  ];
  assert.equal(new Set(texts).size, texts.length, 'each configuration earns its own explanation');
  assert.match(texts[0], /N\+1/);
  assert.match(texts[1], /not necessarily/);
  assert.match(texts[2], /every access\s+misses|every access misses/);
  assert.match(texts[3], /cache state changes nothing/);
  assert.match(texts[4], /Two queries/);
});
