/* test-parameters.mjs — input validation, the declared ranges, and the presets.
 *
 * Every control has a declared range, and the model is the only place that range lives: the
 * interface reads it, the validator enforces it, and these tests assert it from the same
 * declaration rather than from a copy. A page whose markup said 1–1000 while its model clamped at
 * 1–100 would look right and answer a different question.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { M, LANDER, withParams, readDemoHtml } from './harness.mjs';

const html = readDemoHtml();

/* --- the declared ranges ---------------------------------------------------------------------- */

test('the declared ranges are the ones the specification asks for', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(M.PARAM_SPECS)
      .map(([key, spec]) => [key, [spec.min, spec.max, spec.def]])),
    {
      rooms: [10, 10000, 100],
      reservationsPerRoom: [1, 1000, 20],
      metadataBytes: [50, 2000, 200],
      reservationBytes: [50, 1000, 100],
      identifierBytes: [4, 16, 8],
    },
  );
});

test('the defaults are inside their own ranges, and are the declared defaults', () => {
  for (const [key, spec] of Object.entries(M.PARAM_SPECS)) {
    assert.ok(spec.min <= spec.def && spec.def <= spec.max, `${key}: default outside its range`);
    assert.equal(M.DEFAULTS[key], spec.def, `${key}: DEFAULTS disagrees with the spec`);
  }
  assert.equal(M.DEFAULTS.representation, 'normalized');
  assert.equal(M.DEFAULTS.physicalEstimate, false, 'the physical estimate must default to off');
  assert.equal(M.DEFAULTS.roomIndex, 0);
});

test('the markup declares the same bounds as the model, on both the slider and the field', () => {
  /* The drift this catches is silent in both directions: a slider that cannot reach the model's
     maximum, or a field that accepts a value the model will clamp without telling anyone. */
  const controls = {
    rooms: ['rooms', 'rooms-range'],
    reservationsPerRoom: ['perroom', 'perroom-range'],
    metadataBytes: ['meta', 'meta-range'],
    reservationBytes: ['resv', 'resv-range'],
    identifierBytes: ['idsize', 'idsize-range'],
  };
  for (const [key, ids] of Object.entries(controls)) {
    const spec = M.PARAM_SPECS[key];
    for (const id of ids) {
      const tag = html.match(new RegExp(`<input[^>]*\\bid="${id}"[^>]*>`));
      assert.ok(tag, `no input with id="${id}"`);
      const attr = (name) => {
        const m = tag[0].match(new RegExp(`\\b${name}="([^"]*)"`));
        return m ? Number(m[1]) : null;
      };
      assert.equal(attr('min'), spec.min, `${id}: min`);
      assert.equal(attr('max'), spec.max, `${id}: max`);
      assert.equal(attr('value'), spec.def, `${id}: starting value`);
    }
  }
});

/* --- clamping ---------------------------------------------------------------------------------- */

test('a value above the range is clamped to the maximum and the clamp is reported', () => {
  const p = M.normalizeParams({ rooms: 99999, reservationsPerRoom: 5000, metadataBytes: 9999,
    reservationBytes: 100000, identifierBytes: 64 });
  assert.equal(p.rooms, 10000);
  assert.equal(p.reservationsPerRoom, 1000);
  assert.equal(p.metadataBytes, 2000);
  assert.equal(p.reservationBytes, 1000);
  assert.equal(p.identifierBytes, 16);
  assert.equal(p.anyClamped, true);
  assert.deepEqual(Object.keys(p.clamped).sort(), ['identifierBytes', 'metadataBytes',
    'reservationBytes', 'reservationsPerRoom', 'rooms']);
});

test('a value below the range is clamped to the minimum', () => {
  const p = M.normalizeParams({ rooms: -4, reservationsPerRoom: 0, metadataBytes: 1,
    reservationBytes: -1, identifierBytes: 0 });
  assert.equal(p.rooms, 10);
  assert.equal(p.reservationsPerRoom, 1);
  assert.equal(p.metadataBytes, 50);
  assert.equal(p.reservationBytes, 50);
  assert.equal(p.identifierBytes, 4);
  assert.equal(p.anyClamped, true);
});

test('a non-numeric value falls back to the default and is reported as corrected', () => {
  const p = M.normalizeParams({ rooms: 'banana', metadataBytes: '', reservationBytes: null });
  assert.equal(p.rooms, M.DEFAULTS.rooms);
  assert.equal(p.clamped.rooms, true, 'the non-numeric input was corrected silently');
  /* An empty string and a null are an ABSENT value, not a wrong one, so they take the default
     without claiming the reader typed something the page rejected. */
  assert.equal(p.metadataBytes, M.DEFAULTS.metadataBytes);
  assert.equal(p.clamped.metadataBytes, undefined);
  assert.equal(p.reservationBytes, M.DEFAULTS.reservationBytes);
  assert.equal(p.clamped.reservationBytes, undefined);
});

test('a fractional value is rounded to a whole number of bytes', () => {
  const p = M.normalizeParams({ metadataBytes: 200.4, identifierBytes: 7.6 });
  assert.equal(p.metadataBytes, 200);
  assert.equal(p.identifierBytes, 8);
});

test('nothing is clamped at the defaults, so the page opens with no correction notice', () => {
  const p = M.normalizeParams(LANDER);
  assert.equal(p.anyClamped, false);
  assert.deepEqual(p.clamped, {});
  assert.equal(p.roomIndexClamped, false);
});

test('an absent parameter set takes every default', () => {
  for (const empty of [undefined, null, {}]) {
    const p = M.normalizeParams(empty);
    assert.equal(p.rooms, 100);
    assert.equal(p.reservationsPerRoom, 20);
    assert.equal(p.metadataBytes, 200);
    assert.equal(p.reservationBytes, 100);
    assert.equal(p.identifierBytes, 8);
    assert.equal(p.representation, 'normalized');
    assert.equal(p.physicalEstimate, false);
    assert.equal(p.anyClamped, false);
  }
});

test('an unknown representation falls back to the default rather than producing nothing', () => {
  for (const bogus of ['graph', 'key-value', '', null, 42]) {
    assert.equal(M.normalizeParams({ representation: bogus }).representation, 'normalized',
      `representation ${JSON.stringify(bogus)}`);
  }
  for (const id of M.REPRESENTATION_IDS) {
    assert.equal(M.normalizeParams({ representation: id }).representation, id);
  }
});

test('the physical-estimate flag accepts the segment control string and the boolean', () => {
  assert.equal(M.normalizeParams({ physicalEstimate: 'on' }).physicalEstimate, true);
  assert.equal(M.normalizeParams({ physicalEstimate: true }).physicalEstimate, true);
  assert.equal(M.normalizeParams({ physicalEstimate: 'off' }).physicalEstimate, false);
  assert.equal(M.normalizeParams({ physicalEstimate: false }).physicalEstimate, false);
  assert.equal(M.normalizeParams({ physicalEstimate: 'maybe' }).physicalEstimate, false);
});

test('normalizing an already-normalized parameter set changes nothing', () => {
  /* The interface normalizes on every control change and the model normalizes again on entry, so
     the operation has to be idempotent or a value would creep. */
  for (const raw of [LANDER, { rooms: 99999, reservationsPerRoom: -3 },
    { representation: 'document', roomIndex: 50 }]) {
    const once = M.normalizeParams(raw);
    const twice = M.normalizeParams(once);
    for (const key of Object.keys(M.PARAM_SPECS)) {
      assert.equal(twice[key], once[key], `${key} moved on the second normalization`);
    }
    assert.equal(twice.roomIndex, once.roomIndex);
    assert.equal(twice.representation, once.representation);
    assert.equal(twice.physicalEstimate, once.physicalEstimate);
  }
});

/* --- the edge values behave -------------------------------------------------------------------- */

test('one reservation per room is a coherent configuration everywhere', () => {
  const params = withParams({ reservationsPerRoom: 1 });
  for (const id of M.REPRESENTATION_IDS) {
    const s = M.computeStorage(params, id);
    assert.equal(s.totalReservations, 100);
    assert.ok(s.logical > 0);
    assert.equal(s.duplicated, 0);
    assert.equal(M.renameImpact(params, id).recordsTouched, 1);
  }
  const layouts = M.recordLayouts(params);
  for (const id of M.REPRESENTATION_IDS) {
    for (const group of layouts[id]) {
      assert.ok(group.rows >= 1, `${id}: a record group is empty at V=1`);
    }
  }
});

test('ten thousand rooms is a coherent configuration everywhere', () => {
  const params = withParams({ rooms: 10000 });
  for (const id of M.REPRESENTATION_IDS) {
    const s = M.computeStorage(params, id);
    assert.equal(s.totalReservations, 200000);
    assert.ok(Number.isSafeInteger(s.logical) && s.logical > 0);
  }
  /* And the room picker reaches the last of them. */
  const p = M.normalizeParams({ ...params, roomIndex: 9999 });
  assert.equal(p.roomIndex, 9999);
  assert.equal(p.roomIndexClamped, false);
  assert.equal(M.renameImpact(p, 'normalized').oldName, M.roomName(9999));
});

/* --- the record layouts ------------------------------------------------------------------------ */

test('the record layouts declare exactly the fields the page draws, with legal buckets', () => {
  const layouts = M.recordLayouts(LANDER);
  assert.deepEqual(Object.keys(layouts).sort(), ['denormalized', 'document', 'normalized']);
  assert.deepEqual(layouts.normalized.map((g) => g.name), ['ROOMS', 'RESERVATIONS']);
  assert.deepEqual(layouts.denormalized.map((g) => g.name), ['RESERVATIONS']);
  assert.deepEqual(layouts.document.map((g) => g.name),
    ['rooms (documents)', 'reservations (nested)']);

  const legal = new Set(['unique', 'duplicated', 'copied', 'reference']);
  for (const id of M.REPRESENTATION_IDS) {
    for (const group of layouts[id]) {
      assert.ok(group.rows > 0, `${id}/${group.name}: no rows`);
      assert.ok(group.fields.length > 0, `${id}/${group.name}: no fields`);
      for (const field of group.fields) {
        assert.ok(legal.has(field.bucket), `${id}/${group.name}/${field.name}: bucket ${field.bucket}`);
        assert.ok(field.bytes > 0, `${id}/${group.name}/${field.name}: zero bytes`);
      }
    }
  }
});

test('only the denormalized layout carries a copied field, and it is the room metadata', () => {
  const layouts = M.recordLayouts(LANDER);
  const copied = (id) => layouts[id].flatMap((g) => g.fields.filter((f) => f.bucket === 'copied'));
  assert.deepEqual(copied('normalized'), []);
  assert.deepEqual(copied('document'), []);
  const fields = copied('denormalized');
  assert.equal(fields.length, 1);
  assert.equal(fields[0].name, 'room_metadata');
  assert.equal(fields[0].bytes, LANDER.metadataBytes);
  assert.equal(fields[0].copiesPerRoom, LANDER.reservationsPerRoom);
});

test('a nested reservation carries no foreign key and a relational one does', () => {
  /* The structural fact behind the document representation sitting below the normalized one. */
  const layouts = M.recordLayouts(LANDER);
  const nested = layouts.document.find((g) => g.kind === 'subdocument');
  assert.deepEqual(nested.fields.map((f) => f.name), ['id', 'payload']);
  const relational = layouts.normalized.find((g) => g.name === 'RESERVATIONS');
  assert.deepEqual(relational.fields.map((f) => f.name), ['id', 'room_id', 'payload']);
});

/* --- the presets ------------------------------------------------------------------------------- */

test('every preset produces every figure it claims', () => {
  assert.ok(M.PRESETS.length >= 4, `only ${M.PRESETS.length} presets`);
  for (const preset of M.PRESETS) {
    for (const id of M.REPRESENTATION_IDS) {
      const s = M.computeStorage(preset.params, id);
      const r = M.renameImpact(preset.params, id);
      assert.equal(s.logical, preset.expect.logical[id],
        `preset "${preset.name}": ${id} logical`);
      assert.equal(s.duplicated, preset.expect.duplicated[id],
        `preset "${preset.name}": ${id} duplicated`);
      assert.equal(r.recordsTouched, preset.expect.renameRecords[id],
        `preset "${preset.name}": ${id} rename records`);
    }
  }
});

test('every preset is a legal parameter set that needs no clamping', () => {
  for (const preset of M.PRESETS) {
    const p = M.normalizeParams(preset.params);
    assert.equal(p.anyClamped, false, `preset "${preset.name}" has an out-of-range parameter`);
    assert.equal(p.roomIndexClamped, false, `preset "${preset.name}" selects a room that does not exist`);
    for (const key of Object.keys(M.PARAM_SPECS)) {
      assert.equal(p[key], preset.params[key], `preset "${preset.name}": ${key} was corrected`);
    }
  }
});

test('the presets are distinct, identified, and described', () => {
  assert.equal(new Set(M.PRESETS.map((p) => p.id)).size, M.PRESETS.length, 'two presets share an id');
  for (const preset of M.PRESETS) {
    assert.match(preset.id, /^[a-z0-9-]+$/, `preset id ${preset.id}`);
    assert.ok(preset.name.length > 3, `preset ${preset.id} has no name`);
    assert.ok(preset.blurb.length > 20, `preset ${preset.id} has no blurb`);
    assert.equal(M.findPreset(preset.id), preset);
  }
  assert.equal(M.findPreset('nope'), null);
});

test('one preset is the counter-example, and one turns the physical estimate on', () => {
  /* The lesson the preset list has to carry: duplication follows repetition, and the estimate is
     an opt-in. If either preset disappeared the list would still look complete. */
  const counterExample = M.PRESETS.filter((p) => p.params.reservationsPerRoom === 1);
  assert.ok(counterExample.length >= 1, 'no preset shows one reservation per room');
  assert.equal(counterExample[0].expect.duplicated.denormalized, 0);
  assert.equal(counterExample[0].expect.renameRecords.denormalized, 1);

  assert.ok(M.PRESETS.some((p) => p.params.physicalEstimate === true),
    'no preset exercises the physical-overhead estimate');
  assert.equal(M.PRESETS[0].params.physicalEstimate, false,
    'the first preset must open on the calculated figure, not the estimate');
});

test('the lecture preset is the first one and matches the page defaults', () => {
  const first = M.PRESETS[0];
  for (const key of Object.keys(M.PARAM_SPECS)) {
    assert.equal(first.params[key], M.DEFAULTS[key], `the lecture preset's ${key} is not the default`);
  }
});
