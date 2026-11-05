/* test-browser.mjs — drive the shipped page in a real browser.
 *
 * WHAT THIS TIER ADDS, and what it does not. The static checks in test-packaging.mjs already prove
 * the FILE has no external reference; they cannot prove the RUNNING page issues no request, that
 * the canvases actually paint, that a click changes the readout, or that the layout holds at
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
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  return {
    queries: text('r-queries'),
    total: text('r-total'),
    rtt: text('r-rtt'),
    bytes: text('r-bytes'),
    roomQueries: text('r-roomq'),
    deff: text('r-deff'),
    band: text('cost-band-text'),
    sql: text('emitted-sql'),
    code: text('app-code'),
    timelineAlt: text('timeline-alt'),
    /* The strategy comparison is a TABLE rather than a second canvas, so there is no parallel text
       alternative to read: the rows themselves are the content. `compareRows` is what the table
       says, which is the same assertion surface the old `compare-alt` description gave. */
    compareRows: [...window.document.querySelectorAll('#compare-rows tr')].map((tr) => ({
      label: (tr.querySelector('th').textContent || '').replace(/\s+/g, ' ').trim(),
      queries: (tr.children[1].textContent || '').trim(),
      total: (tr.children[2].textContent || '').trim(),
      current: tr.classList.contains('current'),
    })),
    clampHidden: window.document.getElementById('clamp-notice').hidden,
    clampText: text('clamp-notice'),
  };
}

/**
 * Open (or re-close) a collapsed reference section by its summary text, so a check can drive a
 * control that the house style puts behind a disclosure. Playwright and Puppeteer cannot click what
 * the page does not render, and a timeout there reads as a broken control rather than as a closed
 * accordion.
 */
async function disclosure(page, summaryText, open) {
  const changed = await page.evaluate(([text, want]) => {
    for (const d of window.document.querySelectorAll('details')) {
      const summary = d.querySelector('summary');
      if (summary && summary.textContent.includes(text)) { d.open = want; return true; }
    }
    return false;
  }, [summaryText, open]);
  if (!changed) throw new Error(`no disclosure whose summary contains "${summaryText}"`);
}

/** True when the canvas has painted something other than the background. */
function canvasPainted(id) {
  const canvas = window.document.getElementById(id);
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const seen = new Set();
  for (let i = 0; i < data.length; i += 4) {
    seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    if (seen.size > 3) return { painted: true, colours: seen.size };
  }
  return { painted: seen.size > 1, colours: seen.size };
}

/* --- the page loads and runs ------------------------------------------------------------------ */

test('the page works from a file:// URL with no server at all', { skip }, async () => {
  const result = await withPage(FILE_URL, async (page, record) => {
    const state = await page.evaluate(readState);
    return { state, record };
  });
  assert.deepEqual(result.record.pageErrors, [], 'the page threw while loading');
  assert.deepEqual(result.record.consoleErrors, [], 'the page logged an error while loading');
  /* The default configuration is the lecture's: 200 reservations, 10 rooms, lazy, cache off. */
  assert.equal(result.state.queries, '201');
  assert.equal(result.state.total, '2.04 s');
  assert.match(result.state.code, /reservations = load_reservations\(\)/);
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
        await page.click('button[data-strategy="eager"]');
        await page.click('button[data-cache="on"]');
        await disclosure(page, 'five classroom presets', true);
        await page.click('button[data-preset="no-sharing"]');
        await page.click('#btn-reveal');
        await disclosure(page, "model's self-tests", true);
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
    assert.equal(state.queries, '201');
    assert.equal(state.band, 'expensive · 2.04 s of database time');
  } finally {
    await fixture.close();
  }
});

/* --- the controls do what they say ------------------------------------------------------------ */

test('every control changes the model, and the readouts follow', { skip }, async () => {
  await withPage(FILE_URL, async (page, record) => {
    const read = () => page.evaluate(readState);

    const start = await read();
    assert.equal(start.queries, '201');

    /* Cache on: 201 → 11, and the code block does not move. */
    await page.click('button[data-cache="on"]');
    const cached = await read();
    assert.equal(cached.queries, '11');
    assert.equal(cached.code, start.code, 'the application code changed with the cache state');
    assert.match(cached.rtt, /11 × 10 ms/);

    /* Eager: one query, and the emitted SQL becomes a join. */
    await page.click('button[data-strategy="eager"]');
    const eager = await read();
    assert.equal(eager.queries, '1');
    assert.match(eager.sql, /JOIN rooms/);
    assert.equal(eager.code, start.code, 'the application code changed with the strategy');

    /* Batched: two queries, and the SQL becomes an IN-list. */
    await page.click('button[data-strategy="batched"]');
    const batched = await read();
    assert.equal(batched.queries, '2');
    assert.match(batched.sql, /WHERE id IN/);
    assert.equal(batched.code, start.code);

    /* Back to lazy, then move the sliders. */
    await page.click('button[data-strategy="lazy"]');
    await page.click('button[data-cache="off"]');
    await page.$eval('#reservations', (el) => {
      el.value = '500';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const bigger = await read();
    assert.equal(bigger.queries, '501');

    await page.$eval('#latency', (el) => {
      el.value = '50';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const slower = await read();
    assert.match(slower.rtt, /501 × 50 ms/);

    /* Defaults restores everything. */
    await page.click('#btn-defaults');
    const restored = await read();
    assert.equal(restored.queries, start.queries);
    assert.equal(restored.total, start.total);

    assert.deepEqual(record.pageErrors, []);
    assert.deepEqual(record.consoleErrors, []);
  });
});

test('the slider and the number field stay in step', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    await page.$eval('#rooms-range', (el) => {
      el.value = '77';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const paired = await page.evaluate(() => ({
      number: window.document.getElementById('rooms').value,
      range: window.document.getElementById('rooms-range').value,
      deff: window.document.getElementById('r-deff').textContent.trim(),
    }));
    assert.equal(paired.number, '77');
    assert.equal(paired.range, '77');
    assert.equal(paired.deff, '77');
  });
});

test('every preset lands on the query count it declares', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    await disclosure(page, 'five classroom presets', true);
    for (const preset of M.PRESETS) {
      await page.click(`.preset-grid button[data-preset="${preset.id}"]`);
      const shown = await page.$eval('#r-queries', (el) => el.textContent.trim());
      assert.equal(shown, M.formatCount(preset.expect),
        `preset "${preset.name}" showed ${shown}`);
    }
  });
});

test('the D > N clamp notice appears on the page and names the effective value', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    const before = await page.evaluate(readState);
    assert.equal(before.clampHidden, true, 'the clamp notice shows at the default configuration');

    await page.$eval('#reservations', (el) => {
      el.value = '5';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.$eval('#rooms', (el) => {
      el.value = '200';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const after = await page.evaluate(readState);
    assert.equal(after.clampHidden, false, 'the clamp notice did not appear');
    assert.match(after.clampText, /clamped to 5/);
    assert.match(after.clampText, /min\(D, N\)/);
    assert.equal(after.deff, '5');
    assert.equal(after.queries, '6');
    /* The control keeps the reader's value. */
    const kept = await page.$eval('#rooms', (el) => el.value);
    assert.equal(kept, '200');
  });
});

test('reveal shows the count, and the question is answerable from the model', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    const hidden = await page.$eval('#answer', (el) => el.hidden);
    assert.equal(hidden, true, 'the answer is visible before it is revealed');

    await page.click('#btn-reveal');
    const revealed = await page.evaluate(() => ({
      hidden: window.document.getElementById('answer').hidden,
      count: window.document.getElementById('answer-count').textContent.trim(),
      why: window.document.getElementById('answer-why').textContent.trim(),
      pressed: window.document.getElementById('btn-reveal').getAttribute('aria-pressed'),
    }));
    assert.equal(revealed.hidden, false);
    assert.equal(revealed.count, '201 database operations');
    assert.match(revealed.why, /N\+1/);
    assert.equal(revealed.pressed, 'true');

    /* It stays live: switch strategy and the revealed count follows. */
    await page.click('button[data-strategy="eager"]');
    const after = await page.$eval('#answer-count', (el) => el.textContent.trim());
    assert.equal(after, '1 database operation');

    /* And it can be hidden again, to ask the room a second time. */
    await page.click('#btn-reveal');
    assert.equal(await page.$eval('#answer', (el) => el.hidden), true);
  });
});

test('the in-page self-test button reports a pass', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    await disclosure(page, "model's self-tests", true);
    await page.click('#btn-selftest');
    const out = await page.$eval('#selftest-out', (el) => el.textContent.trim());
    assert.match(out, /^\d+ of \d+ self-tests pass\.$/, `self-test output was: ${out}`);
    assert.equal(out.includes('FAILED'), false);
  });
});

/* --- the charts paint ------------------------------------------------------------------------- */

test('the one chart paints, in detailed mode and in compact mode', { skip }, async () => {
  await withPage(FILE_URL, async (page) => {
    /* Default is 201 queries: the timeline is in compact band mode. */
    const compact = await page.evaluate(() => ({
      timeline: (function () {
        const c = window.document.getElementById('c-timeline');
        const ctx = c.getContext('2d');
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        const seen = new Set();
        for (let i = 0; i < d.length; i += 4) seen.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
        return seen.size;
      }()),
    }));
    assert.ok(compact.timeline > 3, `the timeline painted only ${compact.timeline} colours`);
    const compactAlt = await page.$eval('#timeline-alt', (el) => el.textContent);
    assert.match(compactAlt, /201 sequential queries/);
    assert.match(compactAlt, /single band/);

    /* Twelve queries: detailed mode, one labelled bar apiece. */
    await page.$eval('#reservations', (el) => {
      el.value = '11';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const detailAlt = await page.$eval('#timeline-alt', (el) => el.textContent);
    assert.match(detailAlt, /12 sequential queries/);
    assert.match(detailAlt, /own bar/);
    const detail = await page.evaluate(() => {
      const c = window.document.getElementById('c-timeline');
      const ctx = c.getContext('2d');
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const seen = new Set();
      for (let i = 0; i < d.length; i += 4) seen.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
      return seen.size;
    });
    assert.ok(detail > 3, `the detailed timeline painted only ${detail} colours`);

    /* It is the ONLY chart. A second canvas here would be back over the budget. */
    const canvases = await page.evaluate(() => window.document.querySelectorAll('canvas').length);
    assert.equal(canvases, 1, `the page carries ${canvases} canvases`);
  });
});

test('the comparison table reports all four configurations, and marks the current one', { skip }, async () => {
  /* What the old comparison canvas's text description asserted, now asserted on the table itself.
     The point of the change is visible in the numbers: at the default configuration the four counts
     are 201, 11, 1 and 2, and a column of figures shows all four where a linear time axis drew
     three of them as a hairline. */
  await withPage(FILE_URL, async (page) => {
    const rows = (await page.evaluate(readState)).compareRows;
    assert.equal(rows.length, 4, `the comparison table has ${rows.length} rows`);
    assert.deepEqual(rows.map((r) => r.queries), ['201', '11', '1', '2']);
    for (const label of ['Lazy, cache off', 'Lazy, cache on', 'Eager', 'Batched']) {
      assert.ok(rows.some((r) => r.label.includes(label)),
        `the comparison table omits ${label}`);
    }
    /* Every response time is reported, and the ranking is the one the model computes. */
    for (const r of rows) {
      assert.match(r.total, /^[\d.,]+ (ms|s)$/, `response time was "${r.total}"`);
    }
    /* The current configuration is marked, and not by colour alone: the marked row carries the
       words "current configuration" for a screen reader as well as the tint and the glyph. */
    const current = rows.filter((r) => r.current);
    assert.equal(current.length, 1, 'the current configuration is not marked exactly once');
    assert.ok(current[0].label.includes('Lazy, cache off'));
    assert.match(current[0].label, /current configuration/);

    /* It follows the controls. */
    await page.click('button[data-strategy="batched"]');
    const after = (await page.evaluate(readState)).compareRows.filter((r) => r.current);
    assert.equal(after.length, 1);
    assert.ok(after[0].label.includes('Batched'), `the mark stayed on ${after[0].label}`);
  });
});

test('the timeline survives the extremes of every control', { skip }, async () => {
  /* One query and a thousand, the shortest and longest latency: the renderer must not divide by
     zero, loop forever, or throw. */
  await withPage(FILE_URL, async (page, record) => {
    const corners = [
      { reservations: 1, latency: 1, rooms: 1 },
      { reservations: 1, latency: 100, rooms: 200 },
      { reservations: 1000, latency: 1, rooms: 1 },
      { reservations: 1000, latency: 100, rooms: 200 },
    ];
    for (const corner of corners) {
      for (const strategy of ['lazy', 'eager', 'batched']) {
        for (const cache of ['on', 'off']) {
          await page.evaluate((c) => {
            for (const [id, value] of Object.entries(c)) {
              const el = window.document.getElementById(id);
              el.value = String(value);
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }, corner);
          await page.click(`button[data-strategy="${strategy}"]`);
          await page.click(`button[data-cache="${cache}"]`);
          const shown = await page.$eval('#r-queries', (el) => el.textContent.trim());
          assert.ok(/^[\d,]+$/.test(shown), `query readout was "${shown}"`);
          assert.equal(shown.includes('NaN'), false);
        }
      }
    }
    assert.deepEqual(record.pageErrors, [], 'the renderer threw at an extreme');
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
    assert.ok(taken.length > 15, `only ${taken.length} focusable controls found`);
    for (const node of taken) {
      assert.equal(node.disabled, false, `${node.tag}#${node.id} is disabled`);
      assert.ok(node.tabindex === null || Number(node.tabindex) <= 0,
        `${node.tag}#${node.id} has a positive tabindex`);
    }

    /* Tabbing from the top reaches the first control, and Enter works on it. */
    await page.evaluate(() => window.document.body.focus());
    let reached = null;
    for (let i = 0; i < 40 && reached === null; i += 1) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => window.document.activeElement.id || null);
      if (id === 'reservations-range') reached = id;
    }
    assert.equal(reached, 'reservations-range', 'Tab never reached the first slider');

    /* An arrow key on a focused slider changes the model. */
    const before = await page.$eval('#r-queries', (el) => el.textContent.trim());
    await page.keyboard.press('ArrowRight');
    const after = await page.$eval('#r-queries', (el) => el.textContent.trim());
    assert.notEqual(after, before, 'the arrow key did not move the slider');

    /* Enter on the eager button, by focus rather than by click. */
    await page.evaluate(() => window.document.querySelector('button[data-strategy="eager"]').focus());
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#r-queries', (el) => el.textContent.trim()), '1');

    /* Space on the reveal button. */
    await page.evaluate(() => window.document.getElementById('btn-reveal').focus());
    await page.keyboard.press('Space');
    assert.equal(await page.$eval('#answer', (el) => el.hidden), false);
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
      const metrics = await page.evaluate(() => {
        const svg = window.document.querySelector('.figure-row svg.fig');
        const box = svg.getBoundingClientRect();
        const host = svg.closest('section').getBoundingClientRect();
        const scale = box.width / svg.viewBox.baseVal.width;
        let authoredMin = Infinity;
        for (const t of svg.querySelectorAll('text')) {
          authoredMin = Math.min(authoredMin, parseFloat(getComputedStyle(t).fontSize));
        }
        return {
          scrollWidth: window.document.documentElement.scrollWidth,
          clientWidth: window.document.documentElement.clientWidth,
          h1Size: parseFloat(getComputedStyle(window.document.querySelector('h1')).fontSize),
          bodySize: parseFloat(getComputedStyle(window.document.body).fontSize),
          codeSize: parseFloat(getComputedStyle(window.document.getElementById('app-code')).fontSize),
          headlineSize: parseFloat(getComputedStyle(window.document.getElementById('r-queries')).fontSize),
          panels: window.document.querySelectorAll('section.panel').length,
          figureWidth: Math.round(box.width),
          figureShare: box.width / host.width,
          figureLabelPx: authoredMin * scale,
          figureMaxHeight: getComputedStyle(svg).maxHeight,
          tableSize: parseFloat(getComputedStyle(
            window.document.querySelector('table.lab-parameters td')).fontSize),
        };
      });
      assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1,
        `${vp.name} (${vp.width}px): the page scrolls horizontally `
        + `(${metrics.scrollWidth} > ${metrics.clientWidth})`);
      /* Legible from the back of a room. */
      assert.ok(metrics.bodySize >= 16, `${vp.name}: body text is ${metrics.bodySize}px`);
      assert.ok(metrics.codeSize >= 15, `${vp.name}: the code block is ${metrics.codeSize}px`);
      assert.ok(metrics.headlineSize >= 24, `${vp.name}: the query count is ${metrics.headlineSize}px`);
      assert.ok(metrics.h1Size >= 28, `${vp.name}: the title is ${metrics.h1Size}px`);
      assert.equal(metrics.panels, 7, `${vp.name}: expected 7 panels`);
      /* The house style's figure requirement, measured rather than assumed: 70-80% of the content
         width, bounded by a WIDTH and never a height — a pixel height ceiling on an SVG carrying a
         viewBox letterboxes the drawing and spends the surplus column on empty margin, which is
         what made this figure 331px wide at 1280 before the rebuild. */
      assert.equal(metrics.figureMaxHeight, 'none',
        `${vp.name}: a height ceiling is back on the figure`);
      assert.ok(metrics.figureShare >= 0.70 && metrics.figureShare <= 0.82,
        `${vp.name}: the figure takes ${(metrics.figureShare * 100).toFixed(1)}% of the row`);
      assert.ok(metrics.figureLabelPx >= 14,
        `${vp.name}: the smallest figure label renders at ${metrics.figureLabelPx.toFixed(1)}px`);
      /* And no 10-12px text in the primary interface. The parameter table is the sharpest case:
         the shared core sizes it at 0.76rem, which draws 12.2px beside 17px body text. */
      assert.ok(metrics.tableSize >= 13,
        `${vp.name}: the parameter table draws at ${metrics.tableSize}px`);

      /* Again with every collapsed section OPEN. Four disclosures hold the parameter reference,
         six readouts, the preset grid and the access-path figure; a wide table inside one of them
         would otherwise ship unmeasured, because a closed `<details>` lays nothing out. */
      await page.evaluate(() => {
        for (const d of window.document.querySelectorAll('details')) d.open = true;
      });
      const opened = await page.evaluate(() => ({
        scrollWidth: window.document.documentElement.scrollWidth,
        clientWidth: window.document.documentElement.clientWidth,
      }));
      assert.ok(opened.scrollWidth <= opened.clientWidth + 1,
        `${vp.name} (${vp.width}px, disclosures open): the page scrolls horizontally `
        + `(${opened.scrollWidth} > ${opened.clientWidth})`);
    }
  } finally {
    await browser.close();
  }
});

test('the page has one h1 and a heading outline a screen reader can walk', { skip }, async () => {
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
   API, no experimental feature, and nothing outside Canvas 2D, CSS custom properties, CSS grid and
   `matchMedia` — all of which Firefox has shipped for years. The properties most at risk from an
   engine difference are LAYOUT ones, and those are asserted above as computed geometry rather than
   as pixels, so they describe the box model rather than one renderer's output.
   Running this tier against Firefox is a one-line change once a Firefox binary exists:
   `puppeteer.launch({ browser: 'firefox' })`. It is not done here because an untested launch path
   that nobody can run is worse than a stated gap.
   ------------------------------------------------------------------------------------------------- */
