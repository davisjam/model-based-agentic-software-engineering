/* test-duplication.mjs — the pedagogical claim, as assertions.
 *
 * The exercise exists to make one thing visible: WHICH FACTS A REPRESENTATION DUPLICATES is a
 * property of the representation, not of the database category. The document representation nests
 * its reservations and so stores each room's facts once — the same profile as the normalized
 * tables — while only the denormalized table copies them onto every reservation.
 *
 * A page that drifted away from that would still look like a storage calculator and would teach the
 * opposite lesson, so the claim is pinned here rather than left to review:
 *
 *   1. denormalized duplication grows with the reservations per room;
 *   2. normalized and document duplication stay at zero, at every V;
 *   3. the document total TRACKS the normalized total, at every V, while the denormalized total
 *      diverges — which is claim (1) and (2) made visible in the chart.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { M, LANDER, withParams, logical, storage, expectedTotalReservations } from './harness.mjs';

const V_RANGE = [1, 2, 5, 10, 20, 50, 100, 250, 500, 1000];

/* --- duplication grows only in the denormalized case ------------------------------------------ */

test('denormalized duplication grows with the reservations per room', () => {
  let previous = -1;
  for (const v of V_RANGE) {
    const d = storage('denormalized', { reservationsPerRoom: v }).duplicated;
    assert.ok(d > previous, `duplication did not grow from V=${v}`);
    previous = d;
  }
  /* And it grows linearly in the EXCESS copies: (N − R) · M. */
  for (const v of V_RANGE) {
    const params = withParams({ reservationsPerRoom: v });
    const N = expectedTotalReservations(params);
    assert.equal(storage('denormalized', { reservationsPerRoom: v }).duplicated,
      (N - params.rooms) * params.metadataBytes, `V=${v}`);
  }
});

test('normalized and document duplication stay at zero, at every reservations-per-room', () => {
  for (const v of V_RANGE) {
    assert.equal(storage('normalized', { reservationsPerRoom: v }).duplicated, 0, `V=${v}`);
    assert.equal(storage('document', { reservationsPerRoom: v }).duplicated, 0, `V=${v}`);
  }
});

test('duplication is a property of repetition, not of the denormalized shape by itself', () => {
  /* The counter-example the lecture turns on. At one reservation per room the denormalized table
     duplicates nothing at all, and is in fact the smallest of the three. Denormalization is
     expensive when facts repeat; here nothing repeats. */
  const over = { reservationsPerRoom: 1 };
  assert.equal(storage('denormalized', over).duplicated, 0);
  assert.ok(logical('denormalized', over) < logical('normalized', over),
    'at V=1 the denormalized table is not the smallest');
  assert.equal(logical('denormalized', over), logical('document', over),
    'at V=1 the denormalized and document footprints should coincide');
});

test('duplication scales with the size of the copied fact, not only with how often it is copied', () => {
  const small = storage('denormalized', { metadataBytes: 50 }).duplicated;
  const large = storage('denormalized', { metadataBytes: 2000 }).duplicated;
  assert.equal(large, small * 40);
  /* The reservation payload is never duplicated, whatever its size. */
  for (const z of [50, 500, 1000]) {
    assert.equal(storage('denormalized', { reservationBytes: z }).duplicated,
      storage('denormalized', { reservationBytes: 100 }).duplicated,
      `the reservation payload at ${z} B changed the duplicated total`);
  }
});

/* --- the document case resembles the normalized one ------------------------------------------- */

test('the document footprint tracks the normalized footprint at every reservations-per-room', () => {
  /* THE CLAIM. Within 10% at every V the controls allow, and always BELOW — the nested
     reservations carry no foreign key, so the document representation spends N·I fewer reference
     bytes than the normalized tables. */
  for (const v of V_RANGE) {
    const n = logical('normalized', { reservationsPerRoom: v });
    const c = logical('document', { reservationsPerRoom: v });
    const gap = Math.abs(c - n) / n;
    assert.ok(gap < 0.1, `V=${v}: document is ${(gap * 100).toFixed(1)}% from normalized`);
    assert.ok(c < n, `V=${v}: the document footprint is not below the normalized one`);
  }
});

test('the document representation differs from the normalized one by exactly N foreign keys', () => {
  for (const v of [1, 20, 1000]) {
    for (const I of [4, 8, 16]) {
      const params = withParams({ reservationsPerRoom: v, identifierBytes: I });
      const n = M.computeStorage(params, 'normalized');
      const c = M.computeStorage(params, 'document');
      assert.equal(n.logical - c.logical, expectedTotalReservations(params) * I,
        `V=${v} I=${I}: the difference is not the missing foreign keys`);
      assert.equal(n.references - c.references, expectedTotalReservations(params) * I);
      assert.equal(n.unique, c.unique, 'the facts should be identical');
      assert.equal(n.duplicated, c.duplicated, 'neither should duplicate anything');
    }
  }
});

test('the denormalized footprint diverges from both others as the reservations per room grow', () => {
  /* The complement of the test above, and the reason the three-bar chart reads at a glance: one
     bar pulls away while the other two stay together. */
  for (const v of [10, 20, 50, 100, 250, 500, 1000]) {
    const n = logical('normalized', { reservationsPerRoom: v });
    const b = logical('denormalized', { reservationsPerRoom: v });
    const c = logical('document', { reservationsPerRoom: v });
    assert.ok(b > n * 1.8, `V=${v}: denormalized is only ${(b / n).toFixed(2)}× normalized`);
    assert.ok(b > c * 1.8, `V=${v}: denormalized is only ${(b / c).toFixed(2)}× document`);
  }
  /* The ratio itself climbs towards its asymptote (M + Z + 2I) / (2I + Z) as V grows. */
  const ratios = [10, 100, 1000].map((v) => logical('denormalized', { reservationsPerRoom: v })
    / logical('normalized', { reservationsPerRoom: v }));
  assert.ok(ratios[0] < ratios[1] && ratios[1] < ratios[2], `ratios did not climb: ${ratios}`);
});

test('the duplication band names what the share of the footprint is, with a word and a glyph', () => {
  /* Colour never carries meaning alone on this page, so every band carries a word. The three
     bands have to be reachable, or two of them are decoration. */
  assert.equal(storage('normalized').duplicationBand.id, 'none');
  assert.equal(storage('document').duplicationBand.id, 'none');
  assert.equal(storage('denormalized').duplicationBand.id, 'dominant');
  /* A small copied fact against a large payload puts the denormalized case in the middle band. */
  const some = storage('denormalized', { metadataBytes: 50, reservationBytes: 1000 });
  assert.ok(some.duplicationShare > 0 && some.duplicationShare < 0.15,
    `share was ${some.duplicationShare}`);
  assert.equal(some.duplicationBand.id, 'some');
  for (const band of M.DUP_BANDS) {
    assert.ok(band.word && band.word.length > 2, `band ${band.id} has no word`);
    assert.ok(band.glyph && band.glyph.length >= 1, `band ${band.id} has no glyph`);
  }
  assert.equal(new Set(M.DUP_BANDS.map((b) => b.glyph)).size, M.DUP_BANDS.length,
    'two bands share a glyph, so the glyph is not a signal');
});

test('the duplication share is the duplicated bytes over the logical total', () => {
  for (const params of [LANDER, withParams({ reservationsPerRoom: 500 }),
    withParams({ metadataBytes: 2000 })]) {
    for (const id of M.REPRESENTATION_IDS) {
      const s = M.computeStorage(params, id);
      assert.equal(s.duplicationShare, s.duplicated / s.logical, id);
    }
  }
  /* 380,000 / 632,000 at the defaults. */
  assert.ok(Math.abs(storage('denormalized').duplicationShare - 0.60126) < 0.0001);
});

/* --- the sweep the chart draws ----------------------------------------------------------------- */

test('the sweep rises monotonically for every representation', () => {
  const sweep = M.sweepPerRoom(LANDER);
  assert.ok(sweep.points.length >= 2);
  for (const id of M.REPRESENTATION_IDS) {
    for (let i = 1; i < sweep.points.length; i += 1) {
      assert.ok(sweep.points[i][id] >= sweep.points[i - 1][id],
        `${id} fell between V=${sweep.points[i - 1].perRoom} and V=${sweep.points[i].perRoom}`);
    }
  }
});

test('the sweep keeps the normalized and document curves together and lets the third escape', () => {
  /* The chart's whole job. Asserted on the SERIES rather than on pixels, so it describes the model
     and not one renderer's output. */
  const sweep = M.sweepPerRoom(withParams({ reservationsPerRoom: 200 }));
  const last = sweep.points[sweep.points.length - 1];
  assert.ok(Math.abs(last.document - last.normalized) / last.normalized < 0.1);
  assert.ok(last.denormalized > last.normalized * 2);
  /* No two curves coincide anywhere, so a reader is never asked to separate overlapping lines. */
  for (const pt of sweep.points) {
    assert.notEqual(pt.normalized, pt.document, `the curves coincide at V=${pt.perRoom}`);
  }
});

test('the sweep stays inside the control range and never reports the physical estimate', () => {
  const spec = M.PARAM_SPECS.reservationsPerRoom;
  for (const params of [LANDER, withParams({ reservationsPerRoom: 1 }),
    withParams({ reservationsPerRoom: 1000, physicalEstimate: true })]) {
    const sweep = M.sweepPerRoom(params);
    assert.ok(sweep.maxPerRoom <= spec.max, `swept past V=${spec.max}`);
    assert.equal(sweep.points[0].perRoom, spec.min);
    assert.equal(sweep.points[sweep.points.length - 1].perRoom, sweep.maxPerRoom);
    /* Every sampled figure is logical, even when the reader has the estimate on: the curve is the
       calculated quantity, and mixing an estimate into it would make the chart's claim an
       assumption. */
    for (const pt of sweep.points) {
      for (const id of M.REPRESENTATION_IDS) {
        const direct = M.computeStorage(
          { ...params, reservationsPerRoom: pt.perRoom, physicalEstimate: false }, id,
        ).logical;
        assert.equal(pt[id], direct, `${id} at V=${pt.perRoom}`);
      }
    }
  }
});

test('the sweep marks where the reader currently is', () => {
  const sweep = M.sweepPerRoom(withParams({ reservationsPerRoom: 37 }));
  assert.equal(sweep.current, 37);
  assert.ok(sweep.maxPerRoom >= 37, 'the current setting sits off the right edge of the chart');
});
