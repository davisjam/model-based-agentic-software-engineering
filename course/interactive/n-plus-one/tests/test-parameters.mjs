/* test-parameters.mjs — parameter validation, and the presets.
 *
 * The model is reached from a number field, a slider, a preset button, and a test file. Every one
 * of those can hand it something out of range, non-numeric, or missing, and a cost model that
 * propagated a NaN would produce a page full of "NaN ms" rather than a complaint. So normalisation
 * is a seam with its own tests: whatever comes in, what comes out is a legal configuration.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { M, readDemoHtml, withParams } from './harness.mjs';

const SPECS = M.PARAM_SPECS;

test('the declared ranges are the ranges the specification asked for', () => {
  assert.deepEqual(
    { min: SPECS.reservations.min, max: SPECS.reservations.max }, { min: 1, max: 1000 });
  assert.deepEqual(
    { min: SPECS.latencyMs.min, max: SPECS.latencyMs.max }, { min: 1, max: 100 });
  assert.deepEqual(
    { min: SPECS.distinctRooms.min, max: SPECS.distinctRooms.max }, { min: 1, max: 200 });
});

test('the page controls carry the declared ranges and defaults', () => {
  /* The numbers live once, in PARAM_SPECS. This asserts the markup agrees, which is the drift a
     reader would never notice: a slider that stops at 500 while the model accepts 1000. */
  const html = readDemoHtml();
  const field = (id) => {
    const m = html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`));
    assert.ok(m, `no input with id="${id}"`);
    const attrs = {};
    for (const a of m[0].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    return attrs;
  };
  for (const [id, spec, def] of [
    ['reservations', SPECS.reservations, M.DEFAULTS.reservations],
    ['latency', SPECS.latencyMs, M.DEFAULTS.latencyMs],
    ['rooms', SPECS.distinctRooms, M.DEFAULTS.distinctRooms],
  ]) {
    for (const suffix of ['', '-range']) {
      const attrs = field(id + suffix);
      assert.equal(attrs.min, String(spec.min), `${id}${suffix} min`);
      assert.equal(attrs.max, String(spec.max), `${id}${suffix} max`);
      assert.equal(attrs.step, String(spec.step), `${id}${suffix} step`);
      assert.equal(attrs.value, String(def), `${id}${suffix} default`);
    }
  }
});

test('the page defaults are the engine defaults', () => {
  const html = readDemoHtml();
  assert.deepEqual(M.DEFAULTS, {
    reservations: 200, latencyMs: 10, distinctRooms: 10, strategy: 'lazy', cache: 'off',
  });
  /* The two segmented controls declare their pressed state in the markup. */
  assert.match(html, /data-strategy="lazy" aria-pressed="true"/);
  assert.match(html, /data-cache="off" aria-pressed="true"/);
});

test('values above the maximum clamp down; values below the minimum clamp up', () => {
  const high = M.normalizeParams({ reservations: 99999, latencyMs: 1e6, distinctRooms: 5000 });
  assert.equal(high.reservations, 1000);
  assert.equal(high.latencyMs, 100);
  assert.equal(high.distinctRooms, 200);

  const low = M.normalizeParams({ reservations: 0, latencyMs: -42, distinctRooms: -1 });
  assert.equal(low.reservations, 1);
  assert.equal(low.latencyMs, 1);
  assert.equal(low.distinctRooms, 1);
});

test('fractional input is rounded to the declared step', () => {
  const p = M.normalizeParams({ reservations: 200.6, latencyMs: 10.4, distinctRooms: 9.5 });
  assert.equal(p.reservations, 201);
  assert.equal(p.latencyMs, 10);
  assert.equal(p.distinctRooms, 10);
  assert.ok(Number.isInteger(p.reservations) && Number.isInteger(p.latencyMs));
});

test('numeric strings are accepted — a number field hands over a string', () => {
  const p = M.normalizeParams({ reservations: '350', latencyMs: '25', distinctRooms: '40' });
  assert.equal(p.reservations, 350);
  assert.equal(p.latencyMs, 25);
  assert.equal(p.distinctRooms, 40);
});

test('non-numeric, empty, null and missing input falls back to the default, never NaN', () => {
  for (const bad of ['', '   ', 'banana', null, undefined, NaN, Infinity, -Infinity, {}, []]) {
    const p = M.normalizeParams({ reservations: bad, latencyMs: bad, distinctRooms: bad });
    assert.equal(p.reservations, M.DEFAULTS.reservations, `reservations from ${String(bad)}`);
    assert.equal(p.latencyMs, M.DEFAULTS.latencyMs, `latency from ${String(bad)}`);
    assert.equal(p.distinctRooms, M.DEFAULTS.distinctRooms, `rooms from ${String(bad)}`);
  }
  /* And an entirely absent parameter object is the default configuration. */
  assert.deepEqual(M.normalizeParams(undefined), M.normalizeParams({}));
  assert.equal(M.normalizeParams(null).reservations, M.DEFAULTS.reservations);
});

test('no computed quantity is ever NaN, for any legal or illegal input', () => {
  const inputs = [
    {}, { reservations: 'x' }, { latencyMs: null }, { distinctRooms: Infinity },
    { reservations: 1, distinctRooms: 200 }, { reservations: 1000, distinctRooms: 1 },
    { strategy: 'nonsense', cache: 'nonsense' },
  ];
  for (const raw of inputs) {
    for (const strategy of [...M.STRATEGIES, 'bogus']) {
      const c = M.computeCost({ ...raw, strategy });
      for (const key of ['queries', 'roundTripMs', 'dbProcessingMs', 'totalMs', 'bytes',
        'cacheHits', 'roomAccesses', 'roomQueries', 'effectiveDistinctRooms']) {
        assert.ok(Number.isFinite(c[key]), `${key} is ${c[key]} for ${JSON.stringify(raw)}/${strategy}`);
        assert.ok(c[key] >= 0, `${key} is negative`);
      }
      assert.ok(c.queries >= 1, 'every configuration issues at least one query');
    }
  }
});

test('an unrecognised strategy or cache state falls back rather than throwing', () => {
  const p = M.normalizeParams({ strategy: 'magic', cache: 'perhaps' });
  assert.equal(p.strategy, 'lazy');
  assert.equal(p.cache, 'off');
  assert.doesNotThrow(() => M.computeCost({ strategy: 42, cache: [] }));
});

test('the declared strategy and cache vocabularies are closed and match the controls', () => {
  assert.deepEqual(M.STRATEGIES, ['lazy', 'eager', 'batched']);
  assert.deepEqual(M.CACHE_STATES, ['off', 'on']);
  const html = readDemoHtml();
  for (const s of M.STRATEGIES) assert.match(html, new RegExp(`data-strategy="${s}"`));
  for (const c of M.CACHE_STATES) assert.match(html, new RegExp(`data-cache="${c}"`));
  /* And nothing else: a control for a strategy the model does not implement would be worse than a
     missing control. */
  const declared = [...html.matchAll(/data-strategy="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(declared)].sort(), [...M.STRATEGIES].sort());
});

test('normalizeParams is idempotent, so the interface can round-trip its own state', () => {
  for (const raw of [{}, { reservations: 5, distinctRooms: 200 }, { latencyMs: 100 },
    { reservations: 1, distinctRooms: 1, strategy: 'eager', cache: 'on' }]) {
    const once = M.normalizeParams(raw);
    const twice = M.normalizeParams(once);
    assert.deepEqual(twice, once);
  }
});

test('the boundary values are legal and produce a coherent cost', () => {
  const corners = [
    { reservations: 1, latencyMs: 1, distinctRooms: 1 },
    { reservations: 1, latencyMs: 100, distinctRooms: 200 },
    { reservations: 1000, latencyMs: 1, distinctRooms: 1 },
    { reservations: 1000, latencyMs: 100, distinctRooms: 200 },
  ];
  for (const corner of corners) {
    for (const strategy of M.STRATEGIES) {
      for (const cache of M.CACHE_STATES) {
        const c = M.computeCost({ ...corner, strategy, cache });
        assert.ok(c.queries >= 1 && c.queries <= 1001);
        assert.ok(c.totalMs > 0);
        assert.ok(c.bytes > 0);
        assert.equal(c.timeline.length, c.queries);
      }
    }
  }
  /* The worst case the controls allow: 1000 lazy uncached queries at 100 ms apiece. */
  const worst = M.computeCost({ reservations: 1000, latencyMs: 100, distinctRooms: 200, strategy: 'lazy', cache: 'off' });
  assert.equal(worst.queries, 1001);
  assert.equal(worst.roundTripMs, 100100);
  assert.equal(worst.band.id, 'expensive');
});

/* --- presets ---------------------------------------------------------------------------------- */

test('every preset is well formed and names the count it teaches', () => {
  assert.ok(M.PRESETS.length >= 4 && M.PRESETS.length <= 6,
    'a five-minute exercise does not want a preset wall');
  const ids = M.PRESETS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'preset ids are unique');
  for (const p of M.PRESETS) {
    assert.ok(p.name && p.name.length > 0, `${p.id} has no name`);
    assert.ok(p.blurb && p.blurb.length > 0, `${p.id} has no blurb`);
    assert.ok(Number.isInteger(p.expect) && p.expect > 0, `${p.id} declares no expected count`);
    assert.ok(M.findPreset(p.id) === p, `${p.id} is not findable by id`);
  }
  assert.equal(M.findPreset('no-such-preset'), null);
});

test('every preset produces exactly the query count it claims', () => {
  for (const p of M.PRESETS) {
    assert.equal(M.countQueries(p.params), p.expect,
      `preset "${p.name}" claims ${p.expect} queries`);
  }
});

test('the presets are the documented teaching sequence', () => {
  /* Order matters: each step changes one decision, and the last is the counter-example. */
  assert.deepEqual(M.PRESETS.map((p) => [p.id, p.expect]), [
    ['the-lander', 201],
    ['cache-on', 11],
    ['eager', 1],
    ['batched', 2],
    ['no-sharing', 201],
  ]);
});

test('the first preset is the configuration the lecture notes describe', () => {
  const first = M.PRESETS[0];
  assert.equal(first.params.reservations, 200);
  assert.equal(first.params.distinctRooms, 10);
  assert.equal(first.params.strategy, 'lazy');
  assert.equal(first.params.cache, 'off');
  assert.equal(M.countQueries(first.params), 201, 'the lander says 201 queries');
});

test('the preset chain changes one decision at a time, and the data only at the end', () => {
  /* The teaching sequence depends on holding the DATA fixed while the loading decisions change:
     a student who sees the count fall from 201 to 11 must know the rows did not change under them.
     So reservations and latency are constant across the whole chain, and the only preset that
     touches the shape of the data is the closing counter-example. */
  const keys = ['reservations', 'latencyMs', 'distinctRooms', 'strategy', 'cache'];
  const diffs = [];
  for (let i = 1; i < M.PRESETS.length; i += 1) {
    const a = M.normalizeParams(M.PRESETS[i - 1].params);
    const b = M.normalizeParams(M.PRESETS[i].params);
    diffs.push(keys.filter((k) => a[k] !== b[k]));
  }
  for (const d of diffs) {
    assert.ok(!d.includes('reservations'), 'N is held fixed across the chain');
    assert.ok(!d.includes('latencyMs'), 'latency is held fixed across the chain');
  }
  /* Step 1 is the one that matters most: identical everything, cache flipped on. */
  assert.deepEqual(diffs[0], ['cache']);
  /* Only the closing counter-example re-shapes the data. */
  assert.deepEqual(diffs.slice(0, -1).filter((d) => d.includes('distinctRooms')), []);
  assert.ok(diffs[diffs.length - 1].includes('distinctRooms'));
});

test('the preset blurbs state the counts the presets actually produce', () => {
  for (const p of M.PRESETS) {
    const stated = p.blurb.match(/(\d+)\s+quer/);
    if (!stated) continue;
    assert.equal(Number(stated[1]), p.expect,
      `preset "${p.name}" blurb says ${stated[1]} but produces ${p.expect}`);
  }
});

test('the whole model self-test battery passes', () => {
  const report = M.runSelfTests();
  const failures = report.results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.detail}`);
  assert.deepEqual(failures, [], `in-page self-tests failed:\n${failures.join('\n')}`);
  assert.ok(report.total >= 12, `only ${report.total} self-tests are declared`);
  assert.equal(report.failed, 0);
});

test('the self-tests cover the cache and loading matrix the specification names', () => {
  /* A self-test battery that did not exercise the central claim would pass while certifying
     nothing. These are the names the page's own button reports on. */
  const names = M.runSelfTests().results.map((r) => r.name).join(' | ');
  for (const needle of ['1 + N', '1 + D', 'eager issues one query', 'batched issues two queries',
    'cache cannot help', 'N = 1', 'clamped to N']) {
    assert.ok(names.includes(needle), `no self-test mentions "${needle}"`);
  }
});

test('withParams and the engine agree on what the lecture configuration is', () => {
  assert.deepEqual(M.normalizeParams(withParams({})), M.normalizeParams(M.PRESETS[0].params));
});
