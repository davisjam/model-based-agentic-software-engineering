/* test-storage-arithmetic.mjs — the byte counts, against numbers computed by hand.
 *
 * Two kinds of assertion here, and the distinction matters.
 *
 * HAND-COMPUTED LITERALS pin the page's defaults and its edge values to arithmetic a reader can
 * check with a pencil. They are written out long-form in the comments so a later edit that moves a
 * total has to confront the derivation rather than re-record the new number.
 *
 * FORMULA AGREEMENT asserts the engine's layout-walking arithmetic against the closed-form
 * expressions the page PRINTS in its model table (re-derived independently in harness.mjs). That is
 * the check that keeps the published formula honest: the page tells the reader
 * `R·(I+M) + N·(2I+Z)`, and this is what proves the page computes it.
 *
 * Nothing here asserts a wall-clock timing. There is nothing to time: the model is closed-form
 * arithmetic over five integers, and a figure that depended on how fast this machine ran would not
 * be a storage figure.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  M, LANDER, withParams, logical, storage,
  expectedLogical, expectedBuckets, expectedIndexEntries, expectedRecords,
  expectedTotalReservations,
} from './harness.mjs';

/* --- the defaults, by hand -------------------------------------------------------------------- */

test('logical storage at the defaults equals the hand computation', () => {
  /* R = 100, V = 20, M = 200, Z = 100, I = 8, so N = 2,000.
   *
   * Normalized:   ROOMS        100 × (8 + 200)       =  20,800
   *               RESERVATIONS 2000 × (8 + 8 + 100)  = 232,000
   *                                                  = 252,800
   * Denormalized: RESERVATIONS 2000 × (8+8+200+100)  = 632,000
   * Document:     documents    100 × (8 + 200)       =  20,800
   *               nested       2000 × (8 + 100)      = 216,000
   *                                                  = 236,800
   */
  assert.equal(logical('normalized'), 252800);
  assert.equal(logical('denormalized'), 632000);
  assert.equal(logical('document'), 236800);
});

test('the decomposition at the defaults equals the hand computation', () => {
  /* Unique facts are the same data set in all three: 100 × 200 + 2000 × 100 = 220,000.
   * Duplicated, denormalized: the room metadata is stored 20 times per room, 19 of those being
   *   copies, so (2000 − 100) × 200 = 380,000.
   * References, normalized: 100 × 8 room keys + 2000 × 2 × 8 reservation key and foreign key
   *   = 800 + 32,000 = 32,800.
   * References, document: 100 × 8 + 2000 × 8 = 16,800 — the nested reservations carry no
   *   foreign key, which is 2000 × 8 = 16,000 bytes the normalized tables spend and this does not.
   */
  const n = storage('normalized');
  assert.deepEqual(
    { unique: n.unique, duplicated: n.duplicated, references: n.references },
    { unique: 220000, duplicated: 0, references: 32800 },
  );

  const d = storage('denormalized');
  assert.deepEqual(
    { unique: d.unique, duplicated: d.duplicated, references: d.references },
    { unique: 220000, duplicated: 380000, references: 32000 },
  );

  const c = storage('document');
  assert.deepEqual(
    { unique: c.unique, duplicated: c.duplicated, references: c.references },
    { unique: 220000, duplicated: 0, references: 16800 },
  );

  assert.equal(n.references - c.references, 16000);
});

test('the three buckets sum to the logical total, at every parameter set tried', () => {
  const sets = [
    LANDER,
    withParams({ reservationsPerRoom: 1 }),
    withParams({ rooms: 10, reservationsPerRoom: 1000, metadataBytes: 50 }),
    withParams({ rooms: 10000, reservationsPerRoom: 1000, metadataBytes: 2000,
      reservationBytes: 1000, identifierBytes: 16 }),
    withParams({ identifierBytes: 4, metadataBytes: 2000 }),
  ];
  for (const params of sets) {
    for (const id of M.REPRESENTATION_IDS) {
      const s = M.computeStorage(params, id);
      assert.equal(s.unique + s.duplicated + s.references, s.logical,
        `${id} at ${JSON.stringify(params)} does not decompose`);
    }
  }
});

/* --- the published formulas ------------------------------------------------------------------- */

test('the engine computes the formulas the page prints', () => {
  const sets = [
    LANDER,
    withParams({ reservationsPerRoom: 1 }),
    withParams({ reservationsPerRoom: 1000 }),
    withParams({ rooms: 10 }),
    withParams({ rooms: 10000 }),
    withParams({ metadataBytes: 50 }),
    withParams({ metadataBytes: 2000 }),
    withParams({ reservationBytes: 50 }),
    withParams({ reservationBytes: 1000 }),
    withParams({ identifierBytes: 4 }),
    withParams({ identifierBytes: 16 }),
    withParams({ rooms: 7777, reservationsPerRoom: 13, metadataBytes: 911,
      reservationBytes: 503, identifierBytes: 11 }),
  ];
  for (const params of sets) {
    const wantLogical = expectedLogical(params);
    const wantBuckets = expectedBuckets(params);
    const wantRecords = expectedRecords(params);
    for (const id of M.REPRESENTATION_IDS) {
      const s = M.computeStorage(params, id);
      const where = `${id} at R=${params.rooms} V=${params.reservationsPerRoom}`;
      assert.equal(s.logical, wantLogical[id], `${where}: logical`);
      assert.equal(s.unique, wantBuckets[id].unique, `${where}: unique`);
      assert.equal(s.duplicated, wantBuckets[id].duplicated, `${where}: duplicated`);
      assert.equal(s.references, wantBuckets[id].references, `${where}: references`);
      assert.equal(s.records, wantRecords[id], `${where}: stored records`);
      assert.equal(s.totalReservations, expectedTotalReservations(params), `${where}: N`);
    }
  }
});

test('the unique-facts total never depends on the representation', () => {
  /* The same data set, written down three ways. If the unique column moved with the
     representation, the page would be comparing different data rather than different writings of
     one data set, and every byte comparison on it would be meaningless. */
  for (const params of [LANDER, withParams({ reservationsPerRoom: 500 }),
    withParams({ rooms: 10000, metadataBytes: 2000 })]) {
    const totals = M.REPRESENTATION_IDS.map((id) => M.computeStorage(params, id).unique);
    assert.equal(new Set(totals).size, 1, `unique facts differ across representations: ${totals}`);
  }
});

/* --- the edges -------------------------------------------------------------------------------- */

test('one reservation per room: the denormalized table duplicates nothing', () => {
  /* R = 100, V = 1, so N = 100.
   *   Normalized:   100 × 208 + 100 × 116 = 20,800 + 11,600 = 32,400
   *   Denormalized: 100 × 316                               = 31,600
   *   Document:     100 × 208 + 100 × 108 = 20,800 + 10,800 = 31,600
   * The denormalized table is now the SMALLEST, because there is no second row to copy anything
   * onto and it does not pay for a separate ROOMS table. That is the counter-example the preset
   * exists to show. */
  const over = { reservationsPerRoom: 1 };
  assert.equal(logical('normalized', over), 32400);
  assert.equal(logical('denormalized', over), 31600);
  assert.equal(logical('document', over), 31600);
  for (const id of M.REPRESENTATION_IDS) {
    assert.equal(M.computeStorage(withParams(over), id).duplicated, 0,
      `${id} duplicates something at one reservation per room`);
  }
});

test('ten thousand rooms at the smallest sizes', () => {
  /* R = 10,000, V = 1, M = 50, Z = 50, I = 4, so N = 10,000.
   *   Normalized:   10,000 × 54 + 10,000 × 58 = 540,000 + 580,000 = 1,120,000
   *   Denormalized: 10,000 × (50 + 50 + 8)                        = 1,080,000
   *   Document:     10,000 × 54 + 10,000 × 54                     = 1,080,000 */
  const over = { rooms: 10000, reservationsPerRoom: 1, metadataBytes: 50,
    reservationBytes: 50, identifierBytes: 4 };
  assert.equal(logical('normalized', over), 1120000);
  assert.equal(logical('denormalized', over), 1080000);
  assert.equal(logical('document', over), 1080000);
});

test('the largest configuration the controls allow stays exact', () => {
  /* R = 10,000, V = 1,000 → N = 10,000,000. M = 2,000, Z = 1,000, I = 16.
   *   Normalized:   10,000 × 2,016 + 10,000,000 × 1,032
   *                 = 20,160,000 + 10,320,000,000 = 10,340,160,000
   *   Denormalized: 10,000,000 × (2,000 + 1,000 + 32) = 30,320,000,000
   *   Document:     20,160,000 + 10,000,000 × 1,016   = 10,180,160,000
   * Closed-form arithmetic, so ten million reservations is a multiplication rather than a loop. */
  const over = { rooms: 10000, reservationsPerRoom: 1000, metadataBytes: 2000,
    reservationBytes: 1000, identifierBytes: 16 };
  assert.equal(logical('normalized', over), 10340160000);
  assert.equal(logical('denormalized', over), 30320000000);
  assert.equal(logical('document', over), 10180160000);
  for (const id of M.REPRESENTATION_IDS) {
    const s = M.computeStorage(withParams(over), id);
    assert.equal(s.logical, Math.round(s.logical), `${id} produced a fractional byte count`);
    assert.ok(Number.isSafeInteger(s.logical), `${id} overflowed the safe-integer range`);
  }
});

test('the model stays exact at every corner of the five-dimensional control space', () => {
  /* 32 corners × 3 representations × 2 estimate states. Nothing may come back fractional, NaN,
     negative, or smaller with the estimate on than with it off. */
  const axes = ['rooms', 'reservationsPerRoom', 'metadataBytes', 'reservationBytes',
    'identifierBytes'];
  let corners = [{}];
  for (const axis of axes) {
    const next = [];
    for (const corner of corners) {
      for (const bound of [M.PARAM_SPECS[axis].min, M.PARAM_SPECS[axis].max]) {
        next.push({ ...corner, [axis]: bound });
      }
    }
    corners = next;
  }
  assert.equal(corners.length, 32);
  for (const corner of corners) {
    for (const physicalEstimate of [false, true]) {
      for (const id of M.REPRESENTATION_IDS) {
        const s = M.computeStorage(withParams({ ...corner, physicalEstimate }), id);
        const where = `${id} ${JSON.stringify(corner)} estimate=${physicalEstimate}`;
        assert.ok(Number.isSafeInteger(s.logical) && s.logical > 0, `${where}: logical ${s.logical}`);
        assert.ok(Number.isSafeInteger(s.physical), `${where}: physical ${s.physical}`);
        assert.ok(s.physical >= s.logical, `${where}: physical below logical`);
        assert.ok(s.duplicated >= 0 && s.references > 0 && s.unique > 0, `${where}: a bucket is wrong`);
      }
    }
  }
});

/* --- logical and physical are reported separately --------------------------------------------- */

test('physical storage equals logical storage exactly while the estimate is off', () => {
  /* The page defaults to the calculated figure. If the engine folded an engine assumption into it
     the page would be labelling a model a calculation, which is the one thing the exercise must
     not do. */
  for (const id of M.REPRESENTATION_IDS) {
    const s = M.computeStorage(withParams({ physicalEstimate: false }), id);
    assert.equal(s.physical, s.logical, `${id}: physical differs from logical with the estimate off`);
    assert.equal(s.overhead, 0);
    assert.equal(s.recordOverhead, 0);
    assert.equal(s.fieldNameOverhead, 0);
    assert.equal(s.indexOverhead, 0);
    assert.equal(s.estimated, false);
  }
});

test('the physical estimate at the defaults equals the hand computation', () => {
  /* Constants from the page: record header 24 B; field names 32 B per document and sub-document,
   * document representation only; index entry 2I + 12 = 28 B at I = 8.
   *
   * Normalized:   records 100 + 2,000 = 2,100 × 24          =  50,400
   *               index   100 + 2 × 2,000 = 4,100 × 28      = 114,800
   *               252,800 + 50,400 + 114,800               = 418,000
   * Denormalized: records 2,000 × 24                        =  48,000
   *               index   2 × 2,000 = 4,000 × 28            = 112,000
   *               632,000 + 48,000 + 112,000               = 792,000
   * Document:     records 2,100 × 24                        =  50,400
   *               field names 2,100 × 32                    =  67,200
   *               index   100 + 2,000 = 2,100 × 28          =  58,800
   *               236,800 + 50,400 + 67,200 + 58,800       = 413,200
   */
  const on = { physicalEstimate: true };
  const n = storage('normalized', on);
  assert.deepEqual(
    { record: n.recordOverhead, keys: n.fieldNameOverhead, index: n.indexOverhead, total: n.physical },
    { record: 50400, keys: 0, index: 114800, total: 418000 },
  );
  const d = storage('denormalized', on);
  assert.deepEqual(
    { record: d.recordOverhead, keys: d.fieldNameOverhead, index: d.indexOverhead, total: d.physical },
    { record: 48000, keys: 0, index: 112000, total: 792000 },
  );
  const c = storage('document', on);
  assert.deepEqual(
    { record: c.recordOverhead, keys: c.fieldNameOverhead, index: c.indexOverhead, total: c.physical },
    { record: 50400, keys: 67200, index: 58800, total: 413200 },
  );
});

test('the physical estimate is logical plus its three named overheads, nothing else', () => {
  for (const params of [LANDER, withParams({ reservationsPerRoom: 777 }),
    withParams({ rooms: 10000, identifierBytes: 16 })]) {
    for (const id of M.REPRESENTATION_IDS) {
      const s = M.computeStorage({ ...params, physicalEstimate: true }, id);
      assert.equal(s.physical,
        s.logical + s.recordOverhead + s.fieldNameOverhead + s.indexOverhead,
        `${id}: the physical total has an unaccounted term`);
      assert.equal(s.overhead, s.recordOverhead + s.fieldNameOverhead + s.indexOverhead);
      assert.ok(s.physical > s.logical, `${id}: the estimate added nothing`);
      assert.equal(s.estimated, true);
    }
  }
});

test('field-name overhead is charged to the document representation and nowhere else', () => {
  /* The assumption being encoded: a schemaless encoding stores field names with every value, and a
     relational table stores its column names once in the catalogue. It is an ENCODING property, so
     it belongs in the estimate and not in the logical arithmetic — which is what this pins. */
  const on = { physicalEstimate: true };
  assert.equal(storage('normalized', on).fieldNameOverhead, 0);
  assert.equal(storage('denormalized', on).fieldNameOverhead, 0);
  assert.ok(storage('document', on).fieldNameOverhead > 0);
  /* And it does not leak into the logical figure in either mode. */
  for (const id of M.REPRESENTATION_IDS) {
    assert.equal(M.computeStorage(withParams(on), id).logical,
      M.computeStorage(withParams({ physicalEstimate: false }), id).logical,
      `${id}: the estimate changed the logical figure`);
  }
});

test('the assumed index-entry counts match the table the page prints', () => {
  for (const params of [LANDER, withParams({ rooms: 10, reservationsPerRoom: 1 }),
    withParams({ rooms: 10000, reservationsPerRoom: 1000 })]) {
    const want = expectedIndexEntries(params);
    for (const id of M.REPRESENTATION_IDS) {
      assert.equal(M.indexEntries(M.normalizeParams(params), id), want[id], `${id}: index entries`);
      assert.equal(M.computeStorage({ ...params, physicalEstimate: true }, id).indexEntriesAssumed,
        want[id], `${id}: reported index entries`);
    }
  }
});

test('the index-entry size follows the identifier size, as the printed formula says', () => {
  for (const I of [4, 8, 12, 16]) {
    assert.equal(M.PHYSICAL_MODEL.indexEntryBytes(I), 2 * I + 12);
  }
  assert.equal(M.PHYSICAL_MODEL.INDEX_ENTRY_FORMULA, '2I + 12');
});

test('identifier size moves the reference bytes and leaves the facts alone', () => {
  const small = storage('normalized', { identifierBytes: 4 });
  const large = storage('normalized', { identifierBytes: 16 });
  assert.equal(large.references, small.references * 4);
  assert.equal(large.unique, small.unique);
  assert.equal(large.duplicated, small.duplicated);
});

/* --- formatting ------------------------------------------------------------------------------- */

test('byte formatting uses powers of 1024 with the IEC names', () => {
  assert.equal(M.formatBytes(512), '512 B');
  assert.equal(M.formatBytes(1024), '1.0 KiB');
  assert.equal(M.formatBytes(252800), '246.9 KiB');
  assert.equal(M.formatBytes(1048576), '1.00 MiB');
  assert.equal(M.formatBytes(632000), '617.2 KiB');
  assert.equal(M.formatBytes(1073741824), '1.00 GiB');
  /* Four digits of bytes get a thousands separator rather than running together. */
  assert.equal(M.formatBytes(1000), '1,000 B');
});

test('counts, multiples and percentages render the way the page quotes them', () => {
  assert.equal(M.formatCount(2000), '2,000');
  assert.equal(M.formatCount(10000000), '10,000,000');
  assert.equal(M.formatMultiple(2.5), '2.50×');
  assert.equal(M.formatMultiple(13.2), '13×');
  assert.equal(M.formatPercent(0), '0%');
  assert.equal(M.formatPercent(0.004), '<1%');
  assert.equal(M.formatPercent(0.601), '60%');
});

test('the comparison reports every representation against the normalized baseline', () => {
  const rows = M.compareRepresentations(LANDER);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.id), ['normalized', 'denormalized', 'document']);
  assert.equal(rows[0].multipleOfNormalized, 1);
  /* 632,000 / 252,800 = 2.5 exactly. */
  assert.equal(rows[1].multipleOfNormalized, 2.5);
  assert.ok(rows[2].multipleOfNormalized < 1, 'the document representation is not below normalized');
  assert.equal(rows.filter((r) => r.current).length, 1);
  assert.equal(rows.find((r) => r.current).id, 'normalized');
});

test('the comparison baseline follows the mode, so the multiples are never mixed', () => {
  /* With the estimate on, every row's `shown` is its physical figure and the baseline is the
     normalized PHYSICAL figure. A baseline taken from the other mode would quietly compare an
     estimate against a calculation. */
  const rows = M.compareRepresentations(withParams({ physicalEstimate: true }));
  for (const row of rows) assert.equal(row.shown, row.physical);
  assert.equal(rows[1].multipleOfNormalized, 792000 / 418000);
  const off = M.compareRepresentations(withParams({ physicalEstimate: false }));
  for (const row of off) assert.equal(row.shown, row.logical);
});
