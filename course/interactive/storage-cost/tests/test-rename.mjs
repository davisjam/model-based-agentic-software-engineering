/* test-rename.mjs — the rename experiment, which is the payload of the exercise.
 *
 * The byte totals are the setup. The lesson is that renaming one room costs ONE record in the
 * normalized tables, V records in the denormalized table, and ONE document in the nested
 * representation — and that the second of those is not merely more writing, it is an obligation to
 * keep V copies of a fact in agreement while they are being changed.
 *
 * Three things are pinned here, because all three are cheap for a later edit to lose:
 *   - the 1 / V / 1 count matrix, across several room and reservation configurations;
 *   - the consistency obligation existing exactly where copies exist, and nowhere else;
 *   - the document case's rewrite cost being reported as ENGINE-DEPENDENT rather than estimated.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { M, LANDER, withParams, rename } from './harness.mjs';

/* The matrix the specification asks for: 1 / N / 1 across several configurations. Each row is
   (rooms, reservations-per-room), and the expected counts follow from V alone — the room count
   changes nothing, which is itself worth asserting. */
const MATRIX = [
  { rooms: 10, reservationsPerRoom: 1 },
  { rooms: 10, reservationsPerRoom: 2 },
  { rooms: 100, reservationsPerRoom: 20 },
  { rooms: 100, reservationsPerRoom: 1 },
  { rooms: 100, reservationsPerRoom: 1000 },
  { rooms: 999, reservationsPerRoom: 7 },
  { rooms: 10000, reservationsPerRoom: 50 },
  { rooms: 10000, reservationsPerRoom: 1000 },
];

test('renaming a room touches 1 record, V records, and 1 document', () => {
  for (const config of MATRIX) {
    const all = M.renameImpactAll(withParams(config));
    const where = `R=${config.rooms} V=${config.reservationsPerRoom}`;
    assert.deepEqual(all.map((r) => r.representation),
      ['normalized', 'denormalized', 'document'], where);
    assert.equal(all[0].recordsTouched, 1, `${where}: normalized`);
    assert.equal(all[1].recordsTouched, config.reservationsPerRoom, `${where}: denormalized`);
    assert.equal(all[2].recordsTouched, 1, `${where}: document`);
  }
});

test('the unit of the count is a record for the tables and a document for the nested shape', () => {
  /* "1 record" and "1 document" are the same number and not the same claim, so the model carries
     the unit rather than leaving the interface to guess it. */
  const all = M.renameImpactAll(LANDER);
  assert.equal(all[0].recordUnit, 'record');
  assert.equal(all[1].recordUnit, 'record');
  assert.equal(all[2].recordUnit, 'document');
});

test('the rename count does not depend on the room count, the sizes, or the identifier size', () => {
  const base = M.renameImpactAll(LANDER).map((r) => r.recordsTouched);
  for (const over of [{ rooms: 10 }, { rooms: 10000 }, { metadataBytes: 50 },
    { metadataBytes: 2000 }, { reservationBytes: 1000 }, { identifierBytes: 4 },
    { identifierBytes: 16 }, { physicalEstimate: true }, { roomIndex: 7 }]) {
    assert.deepEqual(M.renameImpactAll(withParams(over)).map((r) => r.recordsTouched), base,
      `the counts moved with ${JSON.stringify(over)}`);
  }
});

test('the number of stored copies of the fact is what drives the record count', () => {
  for (const v of [1, 3, 20, 500]) {
    const all = M.renameImpactAll(withParams({ reservationsPerRoom: v }));
    assert.equal(all[0].storedCopiesOfTheFact, 1);
    assert.equal(all[1].storedCopiesOfTheFact, v);
    assert.equal(all[2].storedCopiesOfTheFact, 1);
    for (const impact of all) {
      assert.equal(impact.recordsTouched, impact.storedCopiesOfTheFact,
        `${impact.representation} touches a different number of records than it holds copies`);
    }
  }
});

/* --- the consistency obligation ---------------------------------------------------------------- */

test('the consistency obligation exists exactly where copies exist', () => {
  const many = M.renameImpactAll(withParams({ reservationsPerRoom: 20 }));
  assert.equal(many[0].consistencyObligation, false);
  assert.equal(many[1].consistencyObligation, true);
  assert.equal(many[2].consistencyObligation, false);

  /* At one reservation per room there is nothing to keep in agreement anywhere — including in the
     denormalized table. The obligation follows the duplication, not the shape. */
  for (const impact of M.renameImpactAll(withParams({ reservationsPerRoom: 1 }))) {
    assert.equal(impact.consistencyObligation, false, impact.representation);
  }
});

test('the denormalized note names the partial-write hazard, not only the row count', () => {
  /* The sentence a later edit would smooth into "20 rows change", losing the reason the exercise
     exists. */
  const impact = rename('denormalized');
  assert.match(impact.note, /all 20 rows change together/i);
  assert.match(impact.note, /stops halfway/i);
  assert.match(impact.note, /two\s+different names for one room/i);
});

test('the normalized and document notes say the fact lives in one place', () => {
  assert.match(rename('normalized').note, /exactly one row/i);
  assert.match(rename('document').note, /lives once/i);
});

/* --- the engine-dependent qualification -------------------------------------------------------- */

test('only the document case is reported as engine-dependent, and it is qualified in words', () => {
  /* The author's qualification, verbatim in substance: one document changes, "although its
     physical rewrite cost depends on the database engine". The model must carry that rather than
     invent a rewrite figure for a store nobody ran. */
  const all = M.renameImpactAll(LANDER);
  assert.equal(all[0].engineDependentRewrite, false);
  assert.equal(all[1].engineDependentRewrite, false);
  assert.equal(all[2].engineDependentRewrite, true);
  assert.match(all[2].note, /depends on the database engine/i);
  assert.match(all[2].note, /patch the field in place/i);
  assert.match(all[2].note, /rewrite the whole document/i);
});

test('the document case reports the whole document as the upper bound on the rewrite', () => {
  /* The field is one field; the document around it is the room metadata plus every nested
     reservation. Reporting the bound and naming the uncertainty beats picking a number. */
  for (const v of [1, 20, 1000]) {
    const params = withParams({ reservationsPerRoom: v });
    const impact = M.renameImpact(params, 'document');
    const wholeDocument = params.metadataBytes
      + v * (params.identifierBytes + params.reservationBytes);
    assert.equal(impact.bytesEngineMayRewrite, wholeDocument, `V=${v}`);
    assert.equal(impact.bytesRewrittenLogical, params.metadataBytes, `V=${v}`);
    assert.ok(impact.bytesEngineMayRewrite > impact.bytesRewrittenLogical, `V=${v}`);
  }
});

test('the relational cases report a rewrite bound equal to the bytes they actually rewrite', () => {
  /* No uncertainty to name: a row update writes the copies it has to write. */
  const params = LANDER;
  const n = M.renameImpact(params, 'normalized');
  assert.equal(n.bytesRewrittenLogical, params.metadataBytes);
  assert.equal(n.bytesEngineMayRewrite, params.metadataBytes);
  const d = M.renameImpact(params, 'denormalized');
  assert.equal(d.bytesRewrittenLogical, params.reservationsPerRoom * params.metadataBytes);
  assert.equal(d.bytesEngineMayRewrite, params.reservationsPerRoom * params.metadataBytes);
});

/* --- the room that gets renamed ---------------------------------------------------------------- */

test('the first room is the lecture example, and the rename is a renumbering', () => {
  const impact = rename('normalized', { roomIndex: 0 });
  assert.equal(impact.oldName, 'STEW 202');
  assert.equal(impact.newName, 'STEW 203');
});

test('room names are deterministic, distinct, and reported identically by all three', () => {
  const seen = new Set();
  for (let i = 0; i < 60; i += 1) {
    const name = M.roomName(i);
    assert.ok(!seen.has(name), `room name ${name} repeats at index ${i}`);
    seen.add(name);
    assert.match(name, /^[A-Z]{4} \d{3,}$/, `odd room name: ${name}`);
    assert.notEqual(M.renamedRoomName(i), name, `the rename is a no-op at index ${i}`);
  }
  /* Every representation renames the same room, so the three panels are comparable. */
  for (const roomIndex of [0, 1, 17, 99]) {
    const all = M.renameImpactAll(withParams({ roomIndex }));
    assert.equal(new Set(all.map((r) => r.oldName)).size, 1);
    assert.equal(new Set(all.map((r) => r.newName)).size, 1);
    assert.equal(all[0].oldName, M.roomName(roomIndex));
    assert.equal(all[0].roomIndex, roomIndex);
  }
});

test('the selected room is clamped into the rooms that exist, and the clamp is reported', () => {
  const shrunk = M.normalizeParams(withParams({ rooms: 10, roomIndex: 500 }));
  assert.equal(shrunk.roomIndex, 9);
  assert.equal(shrunk.roomIndexClamped, true);
  assert.equal(M.renameImpact(shrunk, 'normalized').oldName, M.roomName(9));

  const inRange = M.normalizeParams(withParams({ rooms: 100, roomIndex: 4 }));
  assert.equal(inRange.roomIndex, 4);
  assert.equal(inRange.roomIndexClamped, false);

  const negative = M.normalizeParams(withParams({ roomIndex: -7 }));
  assert.equal(negative.roomIndex, 0);
  assert.equal(negative.roomIndexClamped, true);
});
