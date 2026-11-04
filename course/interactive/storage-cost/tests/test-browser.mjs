/* test-browser.mjs — drive the shipped page in a real browser.
 *
 * WHAT THIS TIER ADDS, and what it does not. The static checks in test-packaging.mjs already prove
 * the FILE has no external reference; they cannot prove the RUNNING page issues no request, that
 * the charts actually paint, that a click changes the readout, or that the layout holds at
 * projector size. Those are properties of execution, so they need an engine.
 *
 * PUPPETEER IS RESOLVED, NOT DEPENDED ON. It lives in the book's node_modules, installed by the
 * publishing workflow for the existing served-page smoke gates; `createRequire` anchored there
 * reaches that copy and adds nothing to any package manifest. The repository has no Playwright and
 * no Firefox binary, so this tier is headless Chromium only — see the note at the end of the file.
 *
 * When Puppeteer cannot be resolved (a fresh checkout that has not run the book's install) every
 * test here SKIPS rather than fails. A tier that reds on a missing optional tool trains people to
 * ignore reds, and the static tier already holds the self-containment line on every machine.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { DEMO_HTML, M } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..', '..');

let puppeteer = null;
let resolutionError = '';
try {
  puppeteer = createRequire(join(REPO_ROOT, 'book', 'package.json'))('puppeteer');
} catch (error) {
  resolutionError = error.message;
}
const skip = puppeteer ? false : `puppeteer is not installed (${resolutionError})`;

/* --- fixture ---------------------------------------------------------------------------------- */

const FILE_URL = pathToFileURL(DEMO_HTML).href;

/**
 * Serve the page on a port the OS chose. A fixed port collides between PROCESSES, which is the
 * normal state in this repository: several agents and a push gate can each be running a browser
 * tier at the same moment, and a `before` that dies on the bind takes its file's tests out of the
 * count while the runner still prints success.
 */
async function startServer() {
  const body = readFileSync(DEMO_HTML);
  const server = createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(body);
    } else {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { server, origin: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) };
}

/**
 * Open the page, run `body(page, record)`, and always tear the browser down.
 *
 * `record` accumulates everything the page did while we were watching: console errors, page
 * exceptions, and every request whose URL is not the document itself. A leaked browser keeps the
 * test process alive forever, so the teardown is in a finally.
 */
async function withPage(url, body) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const record = { consoleErrors: [], pageErrors: [], requests: [], failedRequests: [] };
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000 });
    page.on('console', (msg) => {
      if (msg.type() === 'error') record.consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => record.pageErrors.push(String(err)));
    page.on('request', (req) => record.requests.push(req.url()));
    page.on('requestfailed', (req) => record.failedRequests.push(req.url()));
    await page.goto(url, { waitUntil: 'load' });
    return await body(page, record);
  } finally {
    await browser.close();
  }
}

/** The readouts, as the page is currently showing them. */
function readState() {
  const text = (id) => (window.document.getElementById(id).textContent || '').trim();
  const renameCounts = [...window.document.querySelectorAll('#rename-maps [data-rename]')]
    .map((node) => ({
      representation: node.getAttribute('data-rename'),
      count: node.querySelector('.count').getAttribute('data-count'),
      label: node.querySelector('.count').textContent.trim(),
      holds: node.querySelectorAll('li.holds').length,
    }));
  return {
    logical: text('r-logical'),
    physical: text('r-physical'),
    physicalSub: text('r-physical-sub'),
    unique: text('r-unique'),
    duplicated: text('r-dup'),
    references: text('r-refs'),
    recordOverhead: text('r-recordoh'),
    keyOverhead: text('r-keysoh'),
    indexOverhead: text('r-indexoh'),
    records: text('r-records'),
    totalReservations: text('r-total-resv'),
    band: text('dup-band-text'),
    resultsNote: text('results-note'),
    shapeSummary: text('shape-summary'),
    barsAlt: text('bars-alt'),
    sweepAlt: text('sweep-alt'),
    renameAlt: text('rename-alt'),
    renameCaption: text('rename-caption'),
    renameCounts,
    clampHidden: window.document.getElementById('clamp-notice').hidden,
    clampText: text('clamp-notice'),
    roomMax: window.document.getElementById('room-id').max,
  };
}

/** How many distinct colours a canvas has painted. */
function paintedColours(id) {
  const canvas = window.document.getElementById(id);
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const seen = new Set();
  for (let i = 0; i < data.length; i += 4) seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
  return seen.size;
}

/** Set a numeric control and let the page re-render. */
async function setNumber(page, id, value) {
  await page.$eval(id, (el, v) => {
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

/* --- the page loads and runs ------------------------------------------------------------------ */

test('the page works from a file:// URL with no server at all', { skip }, async () => {
  const result = await withPage(FILE_URL, async (page, record) => {
    const state = await page.evaluate(readState);
    return { state, record };
  });
  assert.deepEqual(result.record.pageErrors, [], 'the page threw while loading');
  assert.deepEqual(result.record.consoleErrors, [], 'the page logged an error while loading');
  /* The default configuration is the lecture's: 100 rooms, 20 reservations each, normalized,
     estimate off. 252,800 B is 246.9 KiB. */
  assert.equal(result.state.logical, '246.9 KiB');
  assert.equal(result.state.physical, '—');
  assert.equal(result.state.totalReservations, '2,000');
  assert.equal(result.state.duplicated, '0 B — nothing is stored twice');
});

test('the running page issues no network request of any kind', { skip }, async () => {
  /* Over file://, every request the page makes would be a file:// request for the document. Over
     http, exactly one request: the document. Either way nothing reaches another origin, and
     nothing fails — a failed request would mean the page tried to load something absent. */
  for (const url of [FILE_URL, null]) {
    const fixture = url ? null : await startServer();
    const target = url || `${fixture.origin}/`;
    try {
      const record = await withPage(target, async (page, rec) => {
        /* Exercise the page before judging: a request could be issued by an interaction. */
        await page.click('button[data-repr="denormalized"]');
        await page.click('button[data-physical="on"]');
        await page.click('button[data-preset="busy-rooms"]');
        await page.click('#btn-rename');
        await page.click('#btn-selftest');
        return rec;
      });
      const offOrigin = record.requests.filter((r) => {
        if (r === target) return false;
        if (url) return !r.startsWith('file://');
        return !r.startsWith(fixture.origin);
      });
      assert.deepEqual(offOrigin, [], `the page requested off-origin resources from ${target}`);
      assert.deepEqual(record.failedRequests, [], 'the page tried to load something that is not there');
      /* And at most the document itself: no favicon fetch, no font, no beacon. */
      assert.ok(record.requests.length <= 1,
        `expected at most 1 request, saw ${record.requests.length}: ${record.requests.join(', ')}`);
    } finally {
      if (fixture) await fixture.close();
    }
  }
});

test('the page works when served over http as well as from disk', { skip }, async () => {
  const fixture = await startServer();
  try {
    const state = await withPage(`${fixture.origin}/`, (page) => page.evaluate(readState));
    assert.equal(state.logical, '246.9 KiB');
    assert.equal(state.band, 'no duplicated facts · 1.00× the normalized footprint');
  } finally {
    await fixture.close();
  }
});

/* --- the controls do what they say ------------------------------------------------------------ */

test('every control changes the model, and the readouts follow', { skip }, async () => {
  await withPage(FILE_URL, async (page, record) => {
    const read = () => page.evaluate(readState);

    const start = await read();
    assert.equal(start.logical, '246.9 KiB');

    /* Denormalized: 632,000 B = 617.2 KiB, 2.50× the normalized footprint, duplication dominates. */
    await page.click('button[data-repr="denormalized"]');
    const denorm = await read();
    assert.equal(denorm.logical, '617.2 KiB');
    assert.match(denorm.band, /duplication dominates/);
    assert.match(denorm.band, /2\.50×/);
    assert.match(denorm.duplicated, /371\.1 KiB — 60% of the footprint/);

    /* Document: 236,800 B = 231.3 KiB, below the normalized case, nothing duplicated. */
    await page.click('button[data-repr="document"]');
    const doc = await read();
    assert.equal(doc.logical, '231.3 KiB');
    assert.match(doc.band, /no duplicated facts/);
    assert.equal(doc.duplicated, '0 B — nothing is stored twice');
    assert.match(doc.resultsNote, /containment carries the relationship/);

    /* The physical estimate adds the assumed overhead and labels every line of it. */
    await page.click('button[data-physical="on"]');
    const estimated = await read();
    /* 413,200 B = 403.5 KiB for the document representation. */
    assert.equal(estimated.physical, '403.5 KiB');
    assert.match(estimated.physicalSub, /of assumed engine overhead/);
    assert.match(estimated.recordOverhead, /\(estimate\)/);
    assert.match(estimated.keyOverhead, /\(estimate\)/);
    assert.match(estimated.indexOverhead, /\(estimate, 2,100 entries\)/);
    /* The logical figure is unchanged by turning the estimate on. */
    assert.equal(estimated.logical, doc.logical);

    await page.click('button[data-physical="off"]');
    const back = await read();
    assert.equal(back.physical, '—');
    assert.equal(back.recordOverhead, 'not counted');

    /* The five sliders. */
    await page.click('button[data-repr="normalized"]');
    await setNumber(page, '#perroom', 200);
    assert.match((await read()).totalReservations, /^20,000$/);
    await setNumber(page, '#rooms', 1000);
    assert.match((await read()).totalReservations, /^200,000$/);
    await setNumber(page, '#meta', 2000);
    await setNumber(page, '#resv', 1000);
    await setNumber(page, '#idsize', 16);
    const stretched = await read();
    assert.equal(stretched.logical.includes('NaN'), false);
    assert.match(stretched.logical, /MiB|GiB/);

    /* Defaults restores everything, including the rename. */
    await page.click('#btn-defaults');
    const restored = await read();
    assert.equal(restored.logical, start.logical);
    assert.equal(restored.totalReservations, start.totalReservations);
    assert.equal(restored.renameCaption, 'STEW 202 → STEW 203');

    assert.deepEqual(record.pageErrors, []);
    assert.deepEqual(record.consoleErrors, []);
  });
});

test('the slider and the number field stay in step', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    await page.$eval('#perroom-range', (el) => {
      el.value = '77';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const paired = await page.evaluate(() => ({
      number: window.document.getElementById('perroom').value,
      range: window.document.getElementById('perroom-range').value,
      total: window.document.getElementById('r-total-resv').textContent.trim(),
    }));
    assert.equal(paired.number, '77');
    assert.equal(paired.range, '77');
    assert.equal(paired.total, '7,700');
  });
});

test('every preset lands on the figures it declares', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    for (const preset of M.PRESETS) {
      await page.click(`button[data-preset="${preset.id}"]`);
      const state = await page.evaluate(readState);
      const id = preset.params.representation;
      assert.equal(state.logical, M.formatBytes(preset.expect.logical[id]),
        `preset "${preset.name}" showed logical ${state.logical}`);
      const counts = Object.fromEntries(state.renameCounts.map((r) => [r.representation, r.count]));
      for (const repr of M.REPRESENTATION_IDS) {
        assert.equal(counts[repr], String(preset.expect.renameRecords[repr]),
          `preset "${preset.name}": ${repr} rename count`);
      }
    }
  });
});

test('out-of-range typed input is clamped and the page says so', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    const before = await page.evaluate(readState);
    assert.equal(before.clampHidden, true, 'the correction notice shows at the defaults');

    await page.$eval('#rooms', (el) => {
      el.value = '99999';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const after = await page.evaluate(readState);
    assert.equal(after.clampHidden, false, 'the correction notice did not appear');
    assert.match(after.clampText, /number of rooms clamped to 10,000/);
    assert.match(after.clampText, /range 10–10000/);
    /* The control now shows the legal value rather than the rejected one. */
    assert.equal(await page.$eval('#rooms', (el) => el.value), '10000');
  });
});

/* --- the rename experiment --------------------------------------------------------------------- */

test('the rename panel reports 1 / V / 1 and marks every record holding a copy', { skip }, async () => {
  await withPage(FILE_URL, async (page, record) => {
    const start = await page.evaluate(readState);
    assert.deepEqual(start.renameCounts.map((r) => r.representation),
      ['normalized', 'denormalized', 'document']);
    assert.deepEqual(start.renameCounts.map((r) => r.count), ['1', '20', '1']);
    assert.equal(start.renameCounts[0].label, '1 record');
    assert.equal(start.renameCounts[1].label, '20 records');
    assert.equal(start.renameCounts[2].label, '1 document');

    /* The marked rows are the records that hold a copy of the name. The normalized and document
       panels mark none of their reservation rows; the denormalized panel marks all of the ones it
       lists plus the summary row standing for the rest. */
    assert.equal(start.renameCounts[0].holds, 0);
    assert.equal(start.renameCounts[2].holds, 0);
    assert.ok(start.renameCounts[1].holds > 1,
      `the denormalized panel marked ${start.renameCounts[1].holds} rows`);

    /* Applying the rename flips the names and the marker word. */
    assert.match(start.renameAlt, /has not been applied yet/);
    await page.click('#btn-rename');
    const renamed = await page.evaluate(readState);
    assert.match(renamed.renameAlt, /has been applied/);
    assert.match(renamed.renameCaption, /STEW 202 → STEW 203, applied/);
    const marks = await page.$$eval('#rename-maps li .mark', (nodes) => nodes.map((n) => n.textContent));
    assert.ok(marks.some((t) => t.includes('rewritten')), 'no record is marked as rewritten');
    const names = await page.$eval('[data-rename="denormalized"]', (n) => n.textContent);
    assert.ok(names.includes('STEW 203'), 'the denormalized rows still show the old name');
    assert.equal(names.includes('STEW 202'), false, 'a denormalized row kept the old name');

    /* And it undoes. */
    await page.click('#btn-rename');
    assert.match((await page.evaluate(readState)).renameAlt, /has not been applied yet/);

    assert.deepEqual(record.pageErrors, []);
  });
});

test('the rename count follows the reservations-per-room control', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    for (const v of [1, 5, 200, 1000]) {
      await setNumber(page, '#perroom', v);
      const state = await page.evaluate(readState);
      assert.deepEqual(state.renameCounts.map((r) => r.count),
        ['1', String(v), '1'], `at V=${v}`);
    }
    /* At one reservation per room the denormalized count is 1 too — the counter-example. */
    await setNumber(page, '#perroom', 1);
    const counts = (await page.evaluate(readState)).renameCounts;
    assert.equal(counts[1].count, '1');
  });
});

test('the document panel states the engine-dependent rewrite and the others do not', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    const qualifications = await page.$$eval('#rename-maps [data-rename]', (nodes) => nodes.map((n) => ({
      representation: n.getAttribute('data-rename'),
      qualify: n.querySelector('.qualify') ? n.querySelector('.qualify').textContent : null,
    })));
    assert.equal(qualifications[0].qualify, null);
    assert.equal(qualifications[1].qualify, null);
    assert.match(qualifications[2].qualify, /Engine-dependent/);
    assert.match(qualifications[2].qualify, /patch the name in place or rewrite the whole document/);
    assert.match(qualifications[2].qualify, /does not guess which/);
  });
});

test('the room picker follows the room count and renames the room it names', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    assert.equal((await page.evaluate(readState)).roomMax, '100');
    /* Room 6 is index 5: the building list has five entries, so room 6 is the second STEW room.
       The expected name comes from the model rather than from a guess at the naming scheme. */
    await setNumber(page, '#room-id', 6);
    assert.equal((await page.evaluate(readState)).renameCaption,
      `${M.roomName(5)} → ${M.renamedRoomName(5)}`);
    assert.equal(M.roomName(5), 'STEW 203');

    /* Shrinking the room count below the selection moves the selection rather than renaming a room
       that does not exist, and the page says so. */
    await setNumber(page, '#room-id', 90);
    await setNumber(page, '#rooms', 10);
    const after = await page.evaluate(readState);
    assert.equal(after.roomMax, '10');
    assert.equal(after.clampHidden, false);
    assert.match(after.clampText, /the selected room moved to 10/);
    assert.equal(await page.$eval('#room-id', (el) => el.value), '10');
  });
});

/* --- the in-page self-tests -------------------------------------------------------------------- */

test('the in-page self-test button reports a pass', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    await page.click('#btn-selftest');
    const out = await page.$eval('#selftest-out', (el) => el.textContent.trim());
    assert.match(out, /^\d+ of \d+ self-tests pass\.$/, `self-test output was: ${out}`);
    assert.equal(out.includes('FAILED'), false);
  });
});

/* --- the charts paint -------------------------------------------------------------------------- */

test('both charts paint, and the overhead segment appears only with the estimate on', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    const plain = await page.evaluate(paintedColours, 'c-bars');
    assert.ok(plain > 3, `the bar chart painted only ${plain} colours`);
    const sweep = await page.evaluate(paintedColours, 'c-sweep');
    assert.ok(sweep > 3, `the sweep chart painted only ${sweep} colours`);

    /* The hatch introduces colours the un-hatched chart does not have, which is the pixel-level
       evidence that the estimated segment is drawn differently rather than merely tinted. */
    await page.click('button[data-physical="on"]');
    const hatched = await page.evaluate(paintedColours, 'c-bars');
    assert.ok(hatched > plain, `the hatched chart painted ${hatched} colours, the plain one ${plain}`);

    /* The descriptions name every series and every bucket. */
    const alt = await page.$eval('#bars-alt', (el) => el.textContent);
    for (const label of ['Normalized relational', 'Denormalized relational', 'Document-oriented',
      'unique facts', 'duplicated facts', 'references', 'estimated overhead']) {
      assert.ok(alt.includes(label), `the bar description omits ${label}`);
    }
    const sweepAlt = await page.$eval('#sweep-alt', (el) => el.textContent);
    assert.match(sweepAlt, /normalized and document lines stay close/);
    assert.match(sweepAlt, /denormalized line\s+diverges/);
  });
});

test('the charts survive the extremes of every control', { skip }, async () => {
  /* Ten rooms with one reservation, ten thousand rooms with a thousand: the renderers must not
     divide by zero, loop forever, or throw. */
  await withPage(FILE_URL, async (page, record) => {
    const corners = [
      { rooms: 10, perroom: 1, meta: 50, resv: 50, idsize: 4 },
      { rooms: 10, perroom: 1000, meta: 2000, resv: 1000, idsize: 16 },
      { rooms: 10000, perroom: 1, meta: 2000, resv: 50, idsize: 16 },
      { rooms: 10000, perroom: 1000, meta: 2000, resv: 1000, idsize: 16 },
    ];
    for (const corner of corners) {
      for (const [id, value] of Object.entries(corner)) await setNumber(page, `#${id}`, value);
      for (const repr of M.REPRESENTATION_IDS) {
        for (const physical of ['off', 'on']) {
          await page.click(`button[data-repr="${repr}"]`);
          await page.click(`button[data-physical="${physical}"]`);
          const state = await page.evaluate(readState);
          assert.equal(state.logical.includes('NaN'), false, `logical was "${state.logical}"`);
          assert.equal(state.physical.includes('NaN'), false, `physical was "${state.physical}"`);
          assert.ok(/^[\d,]+$/.test(state.totalReservations),
            `reservation total was "${state.totalReservations}"`);
          assert.ok(await page.evaluate(paintedColours, 'c-bars') > 3, 'the bar chart went blank');
          assert.ok(await page.evaluate(paintedColours, 'c-sweep') > 3, 'the sweep chart went blank');
        }
      }
    }
    assert.deepEqual(record.pageErrors, [], 'a renderer threw at an extreme');
    assert.deepEqual(record.consoleErrors, []);
  });
});

/* --- keyboard and layout ---------------------------------------------------------------------- */

test('every interactive control is reachable and operable from the keyboard', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    /* Nothing is removed from the tab order, and nothing takes a positive tabindex (which would
       reorder the whole document). */
    const taken = await page.evaluate(() => {
      const nodes = [...window.document.querySelectorAll('button, input, a[href], [tabindex]')];
      return nodes.map((n) => ({
        tag: n.tagName,
        id: n.id || null,
        tabindex: n.getAttribute('tabindex'),
        disabled: !!n.disabled,
      }));
    });
    assert.ok(taken.length > 20, `only ${taken.length} focusable controls found`);
    for (const node of taken) {
      assert.equal(node.disabled, false, `${node.tag}#${node.id} is disabled`);
      assert.ok(node.tabindex === null || Number(node.tabindex) <= 0,
        `${node.tag}#${node.id} has a positive tabindex`);
    }

    /* Tabbing from the top reaches the first control. */
    await page.evaluate(() => window.document.body.focus());
    let reached = null;
    for (let i = 0; i < 40 && reached === null; i += 1) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => window.document.activeElement.id || null);
      if (id === 'rooms-range') reached = id;
    }
    assert.equal(reached, 'rooms-range', 'Tab never reached the first slider');

    /* An arrow key on a focused slider changes the model. */
    const before = await page.$eval('#r-logical', (el) => el.textContent.trim());
    await page.keyboard.press('ArrowRight');
    const after = await page.$eval('#r-logical', (el) => el.textContent.trim());
    assert.notEqual(after, before, 'the arrow key did not move the slider');

    /* Enter on a representation button, by focus rather than by click. */
    await page.evaluate(() => window.document.querySelector('button[data-repr="denormalized"]').focus());
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('button[data-repr="denormalized"]',
      (el) => el.getAttribute('aria-pressed')), 'true');

    /* Space on the rename button. */
    await page.evaluate(() => window.document.getElementById('btn-rename').focus());
    await page.keyboard.press('Space');
    assert.equal(await page.$eval('#btn-rename', (el) => el.getAttribute('aria-pressed')), 'true');
  });
});

test('the layout holds without horizontal overflow at projector and laptop sizes', { skip }, async () => {
  const viewports = [
    { width: 1920, height: 1080, name: 'projector' },
    { width: 1440, height: 900, name: 'laptop' },
    { width: 1280, height: 800, name: 'small laptop' },
  ];
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(FILE_URL, { waitUntil: 'load' });
      const metrics = await page.evaluate(() => ({
        scrollWidth: window.document.documentElement.scrollWidth,
        clientWidth: window.document.documentElement.clientWidth,
        h1Size: parseFloat(getComputedStyle(window.document.querySelector('h1')).fontSize),
        bodySize: parseFloat(getComputedStyle(window.document.body).fontSize),
        headlineSize: parseFloat(getComputedStyle(window.document.getElementById('r-logical')).fontSize),
        renameCountSize: parseFloat(getComputedStyle(
          window.document.querySelector('#rename-maps .count'),
        ).fontSize),
        panels: window.document.querySelectorAll('section.panel').length,
      }));
      assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1,
        `${vp.name} (${vp.width}px): the page scrolls horizontally `
        + `(${metrics.scrollWidth} > ${metrics.clientWidth})`);
      /* Legible from the back of a room. */
      assert.ok(metrics.bodySize >= 16, `${vp.name}: body text is ${metrics.bodySize}px`);
      assert.ok(metrics.headlineSize >= 24, `${vp.name}: the storage figure is ${metrics.headlineSize}px`);
      assert.ok(metrics.renameCountSize >= 24,
        `${vp.name}: the rename count is ${metrics.renameCountSize}px`);
      assert.ok(metrics.h1Size >= 28, `${vp.name}: the title is ${metrics.h1Size}px`);
      assert.equal(metrics.panels, 8, `${vp.name}: expected 8 panels`);
    }
  } finally {
    await browser.close();
  }
});

test('no panel overflows its own box at projector size', { skip }, async () => {
  /* The byte figures grow to eleven digits at the extremes, and a readout that spills out of its
     panel is the way a number this long breaks a projected layout. */
  await withPage(FILE_URL, async (page) => {
    await page.setViewport({ width: 1920, height: 1080 });
    for (const [id, value] of Object.entries({ rooms: 10000, perroom: 1000, meta: 2000,
      resv: 1000, idsize: 16 })) await setNumber(page, `#${id}`, value);
    await page.click('button[data-physical="on"]');
    const overflowing = await page.evaluate(() => [...window.document.querySelectorAll('section.panel')]
      .filter((s) => s.scrollWidth > s.clientWidth + 1)
      .map((s) => s.getAttribute('aria-labelledby')));
    /* The wide model tables are deliberately scrollable inside their own container, so the panels
       themselves must not be the thing that overflows. */
    assert.deepEqual(overflowing, [], `panels overflow: ${overflowing.join(', ')}`);
    const horizontal = await page.evaluate(() => ({
      scrollWidth: window.document.documentElement.scrollWidth,
      clientWidth: window.document.documentElement.clientWidth,
    }));
    assert.ok(horizontal.scrollWidth <= horizontal.clientWidth + 1,
      `the page scrolls horizontally at the extremes (${horizontal.scrollWidth} > ${horizontal.clientWidth})`);
  });
});

test('the page has a heading outline a screen reader can walk', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    const headings = await page.evaluate(() => [...window.document.querySelectorAll('h1,h2,h3')]
      .map((h) => ({ level: Number(h.tagName[1]), text: h.textContent.trim().slice(0, 60) })));
    assert.equal(headings.filter((h) => h.level === 1).length, 1);
    /* No level is skipped on the way down. */
    for (let i = 1; i < headings.length; i += 1) {
      assert.ok(headings[i].level - headings[i - 1].level <= 1,
        `heading level jumps from h${headings[i - 1].level} to h${headings[i].level} at "${headings[i].text}"`);
    }
    /* Every panel is named by its own heading, so the landmarks are not anonymous. */
    const unlabelled = await page.evaluate(() => [...window.document.querySelectorAll('section.panel')]
      .filter((s) => {
        const id = s.getAttribute('aria-labelledby');
        return !id || !window.document.getElementById(id);
      }).length);
    assert.equal(unlabelled, 0, 'a panel has no accessible name');
  });
});

/* -------------------------------------------------------------------------------------------------
   ON FIREFOX. The specification asked for Chromium and Firefox. This repository has neither
   Playwright nor a Firefox binary: its browser tiers run headless Chromium through the Puppeteer
   copy the publishing workflow installs, and adding a second engine would mean adding a dependency
   and a download step to a gate that currently needs neither.
   The coverage that a second engine would add is also narrow here. The page uses no vendor-prefixed
   API, no experimental feature, and nothing outside Canvas 2D (including `createPattern`, shipped
   in Firefox since version 1.5), CSS custom properties, CSS grid and `matchMedia`. The properties
   most at risk from an engine difference are LAYOUT ones, and those are asserted above as computed
   geometry rather than as pixels, so they describe the box model rather than one renderer's output.
   Running this tier against Firefox is a one-line change once a Firefox binary exists:
   `puppeteer.launch({ browser: 'firefox' })`. It is not done here because an untested launch path
   that nobody can run is worse than a stated gap.
   ------------------------------------------------------------------------------------------------- */
