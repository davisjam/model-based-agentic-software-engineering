/* test-query-counts.mjs — the specification's central requirement.
 *
 * "The N+1 simulator should verify query counts under different cache and loading assumptions."
 * This file is that verification, and it is deliberately the most literal file in the suite: a
 * table of configurations and the exact integer each one must produce, with the arithmetic written
 * out rather than computed, so a change to the model that moves a count has to move a number
 * somebody wrote down on purpose.
 *
 * Why exact integers and not a formula. A test that asserts `1 + n` against an implementation that
 * computes `1 + n` passes whatever `n` means. The counts below are the lesson of the exercise, so
 * they are pinned as the literals a student reads off the screen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { M, queries, withParams } from './harness.mjs';

/* ---------------------------------------------------------------------------------------------
   The four rules, at the lecture's configuration: 200 reservations referencing 10 rooms.
   --------------------------------------------------------------------------------------------- */

test('lazy + cache off + D distinct rooms + N reservations issues 1 + N queries', () => {
  /* The N+1 pattern itself. Nothing remembers that two reservations share a room, so every room
     access in the loop issues its own query. */
  assert.equal(queries({ strategy: 'lazy', cache: 'off' }), 201);

  /* And it is 1 + N for every N, independently of D. */
  for (const [n, d] of [[1, 1], [2, 1], [7, 3], [50, 10], [200, 10], [200, 200], [1000, 200]]) {
    assert.equal(
      queries({ reservations: n, distinctRooms: d, strategy: 'lazy', cache: 'off' }),
      1 + n,
      `lazy/off with N=${n} D=${d} should issue ${1 + n} queries`,
    );
  }
});

test('lazy + cache ON issues 1 + D queries — each distinct room fetched once', () => {
  assert.equal(queries({ strategy: 'lazy', cache: 'on' }), 11);

  for (const [n, d, expected] of [
    [200, 10, 11],
    [200, 1, 2],
    [200, 200, 201],
    [1000, 200, 201],
    [1000, 1, 2],
    [37, 6, 7],
  ]) {
    assert.equal(
      queries({ reservations: n, distinctRooms: d, strategy: 'lazy', cache: 'on' }),
      expected,
      `lazy/on with N=${n} D=${d} should issue ${expected} queries`,
    );
  }
});

test('eager issues exactly 1 query, under either cache state', () => {
  assert.equal(queries({ strategy: 'eager', cache: 'off' }), 1);
  assert.equal(queries({ strategy: 'eager', cache: 'on' }), 1);
  /* And for every shape of the data: the join does not grow a second statement. */
  for (const [n, d] of [[1, 1], [200, 10], [200, 200], [1000, 200]]) {
    for (const cache of ['on', 'off']) {
      assert.equal(queries({ reservations: n, distinctRooms: d, strategy: 'eager', cache }), 1);
    }
  }
});

test('batched issues exactly 2 queries, under either cache state', () => {
  assert.equal(queries({ strategy: 'batched', cache: 'off' }), 2);
  assert.equal(queries({ strategy: 'batched', cache: 'on' }), 2);
  for (const [n, d] of [[1, 1], [200, 10], [200, 200], [1000, 200]]) {
    for (const cache of ['on', 'off']) {
      assert.equal(queries({ reservations: n, distinctRooms: d, strategy: 'batched', cache }), 2);
    }
  }
});

/* ---------------------------------------------------------------------------------------------
   The modelling point the specification is emphatic about: lazy loading does NOT necessarily
   execute N additional queries. If it did, the cache control would be decoration.
   --------------------------------------------------------------------------------------------- */

test('the cache is a real control: it changes the lazy count whenever rooms repeat', () => {
  const off = queries({ strategy: 'lazy', cache: 'off' });
  const on = queries({ strategy: 'lazy', cache: 'on' });
  assert.equal(off, 201);
  assert.equal(on, 11);
  assert.ok(on < off, 'the cache must reduce the query count when 200 reservations share 10 rooms');
});

test('distinct rooms is a real control: it changes the lazy-with-cache count', () => {
  const counts = [1, 2, 5, 10, 50, 200].map(
    (d) => queries({ distinctRooms: d, strategy: 'lazy', cache: 'on' }),
  );
  assert.deepEqual(counts, [2, 3, 6, 11, 51, 201]);
  /* Strictly increasing in D — not a plateau, which a model that quietly ignored D would produce. */
  for (let i = 1; i < counts.length; i += 1) assert.ok(counts[i] > counts[i - 1]);
});

test('with the cache on, N+1 reappears exactly when every reservation has its own room', () => {
  /* The boundary case the specification cares about. D = N is where caching stops helping. */
  const n = 200;
  assert.equal(queries({ reservations: n, distinctRooms: n - 1, strategy: 'lazy', cache: 'on' }), n);
  assert.equal(queries({ reservations: n, distinctRooms: n, strategy: 'lazy', cache: 'on' }), n + 1);
  assert.equal(
    queries({ reservations: n, distinctRooms: n, strategy: 'lazy', cache: 'on' }),
    queries({ reservations: n, distinctRooms: n, strategy: 'lazy', cache: 'off' }),
    'at D = N the cache saves nothing, so both cache states must agree',
  );
});

test('the cache never changes the eager or batched count', () => {
  for (const strategy of ['eager', 'batched']) {
    for (const d of [1, 10, 200]) {
      assert.equal(
        queries({ distinctRooms: d, strategy, cache: 'on' }),
        queries({ distinctRooms: d, strategy, cache: 'off' }),
        `${strategy} must not depend on the cache state`,
      );
    }
  }
});

/* ---------------------------------------------------------------------------------------------
   Edge cases named in the specification.
   --------------------------------------------------------------------------------------------- */

test('N = 1 is coherent under every configuration', () => {
  const one = (strategy, cache) => queries({ reservations: 1, distinctRooms: 1, strategy, cache });
  assert.equal(one('lazy', 'off'), 2, 'one reservations query plus one room query');
  assert.equal(one('lazy', 'on'), 2, 'a cold cache cannot help the first access');
  assert.equal(one('eager', 'off'), 1);
  assert.equal(one('eager', 'on'), 1);
  assert.equal(one('batched', 'off'), 2);
  assert.equal(one('batched', 'on'), 2);
});

test('D = 1 collapses the lazy-with-cache count to two queries', () => {
  for (const n of [1, 2, 200, 1000]) {
    assert.equal(queries({ reservations: n, distinctRooms: 1, strategy: 'lazy', cache: 'on' }), 2);
    assert.equal(queries({ reservations: n, distinctRooms: 1, strategy: 'lazy', cache: 'off' }), 1 + n);
  }
});

test('D = N makes lazy-with-cache identical to lazy-without', () => {
  for (const n of [1, 3, 50, 200]) {
    const on = queries({ reservations: n, distinctRooms: n, strategy: 'lazy', cache: 'on' });
    const off = queries({ reservations: n, distinctRooms: n, strategy: 'lazy', cache: 'off' });
    assert.equal(on, 1 + n);
    assert.equal(off, 1 + n);
  }
});

test('D > N is CLAMPED to N, and the clamp is reported rather than silent', () => {
  /* The specification requires D > N to be rejected or clamped under a stated rule. The model
     clamps: a reservation references exactly one room, so N reservations reference at most N
     distinct rooms, and D > N describes a configuration that cannot exist.
     The requested value is PRESERVED (the control keeps what the reader set) while the model
     computes on the effective value and raises a flag the interface renders as a notice. */
  const p = M.normalizeParams(withParams({ reservations: 5, distinctRooms: 200 }));
  assert.equal(p.distinctRooms, 200, 'the requested value is preserved');
  assert.equal(p.effectiveDistinctRooms, 5, 'the effective value is min(D, N)');
  assert.equal(p.distinctRoomsClamped, true, 'the clamp must be reported');

  /* And the clamp changes the count, which is the only way a reader could tell it happened. */
  assert.equal(queries({ reservations: 5, distinctRooms: 200, strategy: 'lazy', cache: 'on' }), 6);
  assert.equal(queries({ reservations: 5, distinctRooms: 5, strategy: 'lazy', cache: 'on' }), 6);

  /* No clamp when D <= N, and the flag stays down. */
  const fine = M.normalizeParams(withParams({ reservations: 200, distinctRooms: 10 }));
  assert.equal(fine.effectiveDistinctRooms, 10);
  assert.equal(fine.distinctRoomsClamped, false);
});

test('the clamp applies at every N below the distinct-rooms maximum', () => {
  for (let n = 1; n <= 12; n += 1) {
    const c = M.computeCost(withParams({ reservations: n, distinctRooms: 200, strategy: 'lazy', cache: 'on' }));
    assert.equal(c.effectiveDistinctRooms, n);
    assert.equal(c.queries, 1 + n, `N=${n} with D clamped to N must issue 1 + N queries`);
    assert.equal(c.cacheHits, 0, 'nothing repeats, so nothing is served from the cache');
  }
});

/* ---------------------------------------------------------------------------------------------
   The plan, not just its length. The count is derived from an ordered list of queries, and the
   list is what the timeline draws — so the two cannot disagree about what happened.
   --------------------------------------------------------------------------------------------- */

test('the plan lists one reservations query followed by the room queries', () => {
  const plan = M.queryPlan(withParams({ reservations: 4, distinctRooms: 2, strategy: 'lazy', cache: 'off' }));
  assert.equal(plan.queryCount, 5);
  assert.deepEqual(plan.queries.map((q) => q.kind),
    ['reservations', 'room', 'room', 'room', 'room']);
  /* Round-robin assignment: reservation i takes room i mod D. */
  assert.deepEqual(plan.queries.slice(1).map((q) => q.room), [0, 1, 0, 1]);
});

test('with the cache on, each distinct room appears in the plan exactly once', () => {
  const plan = M.queryPlan(withParams({ reservations: 9, distinctRooms: 3, strategy: 'lazy', cache: 'on' }));
  assert.equal(plan.queryCount, 4);
  const rooms = plan.queries.filter((q) => q.kind === 'room').map((q) => q.room);
  assert.deepEqual(rooms, [0, 1, 2]);
  assert.equal(new Set(rooms).size, rooms.length, 'no room is fetched twice');
  assert.equal(plan.cacheHits, 6, 'the other six accesses are served from memory');
  assert.equal(plan.cacheHits + rooms.length, 9, 'every room access is accounted for');
});

test('the room accesses are the same N under every strategy — same logical result', () => {
  for (const strategy of ['lazy', 'eager', 'batched']) {
    for (const cache of ['on', 'off']) {
      const plan = M.queryPlan(withParams({ strategy, cache }));
      assert.equal(plan.roomAccesses, 200,
        `${strategy}/${cache} must still read a room for all 200 reservations`);
      assert.equal(plan.effectiveDistinctRooms, 10,
        `${strategy}/${cache} must still cover the same 10 rooms`);
    }
  }
});

test('eager emits a join and no separate reservations statement', () => {
  const plan = M.queryPlan(withParams({ strategy: 'eager' }));
  assert.deepEqual(plan.queries.map((q) => q.kind), ['join']);
  assert.equal(plan.queries[0].rows, 200, 'the join returns one row per reservation');
  assert.equal(plan.roomQueries, 0, 'the room columns arrived with the reservations');
});

test('batched emits one reservations statement and one IN-list', () => {
  const plan = M.queryPlan(withParams({ strategy: 'batched', distinctRooms: 7 }));
  assert.deepEqual(plan.queries.map((q) => q.kind), ['reservations', 'rooms-in']);
  assert.equal(plan.queries[0].rows, 200);
  assert.equal(plan.queries[1].rows, 7, 'the IN-list asks for the rooms the loop will need');
  assert.match(plan.queries[1].sql, /IN \(/);
});

test('the full cache × strategy × shape matrix, as one table', () => {
  /* Written as a table so a reviewer can read the whole contract at once. Columns:
     N, D, strategy, cache, expected queries. */
  const table = [
    [1, 1, 'lazy', 'off', 2],
    [1, 1, 'lazy', 'on', 2],
    [1, 1, 'eager', 'off', 1],
    [1, 1, 'batched', 'off', 2],
    [200, 1, 'lazy', 'off', 201],
    [200, 1, 'lazy', 'on', 2],
    [200, 10, 'lazy', 'off', 201],
    [200, 10, 'lazy', 'on', 11],
    [200, 200, 'lazy', 'off', 201],
    [200, 200, 'lazy', 'on', 201],
    [200, 10, 'eager', 'off', 1],
    [200, 10, 'eager', 'on', 1],
    [200, 10, 'batched', 'off', 2],
    [200, 10, 'batched', 'on', 2],
    [1000, 200, 'lazy', 'off', 1001],
    [1000, 200, 'lazy', 'on', 201],
    [1000, 200, 'eager', 'off', 1],
    [1000, 200, 'batched', 'off', 2],
    /* D > N: clamped to N. */
    [5, 200, 'lazy', 'off', 6],
    [5, 200, 'lazy', 'on', 6],
    [5, 200, 'eager', 'off', 1],
    [5, 200, 'batched', 'off', 2],
  ];
  for (const [n, d, strategy, cache, expected] of table) {
    assert.equal(
      M.countQueries({ reservations: n, latencyMs: 10, distinctRooms: d, strategy, cache }),
      expected,
      `N=${n} D=${d} ${strategy}/${cache} should issue ${expected} queries`,
    );
  }
});
