/**
 * The three WCAG properties the keyboard baseline named and declined to measure, as a gate.
 *
 * `BASELINE-a11y-261002.md` §6 F-6 listed visible focus indication (2.4.7), contrast (1.4.3), and
 * reflow with 2-D focus divergence (1.4.10, D-2) as UNMEASURED, each with the reason. Two of the
 * three were then unmeasured for a reason that is itself the point: axe returns `color-contrast`
 * as INCOMPLETE for SVG text, and an INCOMPLETE rule beside "zero violations" reads, in a summary
 * line, exactly like a clean page. The one 1.4.3 defect this project has shipped lived in that gap,
 * in the dark theme, on a page that scored zero violations throughout.
 *
 * So: every property, on EVERY served page, in BOTH themes. The probes are in `wcag-f6.mjs`; the
 * page register is shared with `scripts/measure-wcag-f6.mjs`, which prints the full per-element
 * numbers this file only asserts over.
 *
 * MEASURED at this commit, on the pinned Chromium:
 *
 *     2.4.7   index.html   8 of 9 control kinds render a ring, both themes
 *             learn.html   4 of 4, both themes
 *     1.4.3   index.html   463 HTML + 20 SVG texts, 0 under the floor, both themes
 *             learn.html   253 HTML + 81 SVG texts, 0 under the floor, both themes
 *     1.4.10  index.html   no horizontal overflow at 320 / 368 / 672 / 976 / 1024 / 1025 px
 *             learn.html   no horizontal overflow at 320 / 576 / 832 px
 *     D-2     index.html   0 inversions at 1 column; 29 at 2 columns, 77 at 3
 *             learn.html   0 inversions at every width its CSS defines
 *
 * TWO findings are enumerated rather than asserted to zero, because both fixes live in
 * `index.html`, which this change does not own. Each is pinned as an exact set, so a NEW instance
 * fails here while the known one is held: the project's rule is drain-then-promote, and a gate that
 * lands blocking-red breaks every agent committing through it.
 *
 * And every assertion is paired with a COUNT, because a probe that matched nothing reports no
 * failures. Three of this file's assertions are negative controls that sabotage the page and
 * require the probe to go red -- the only evidence that a zero here is a measurement rather than a
 * no-op. Both of those disciplines are the record's own, applied to the instrument that checks it.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  startServerOnFreePort, launchBrowser, shutdown, openServedPage, writeReceipt, WORKBENCH_DIR,
} from "../harness.mjs";
import { svgTextContrast, contrastFailures } from "./axe.mjs";
import {
  applyTheme, focusRingDiff, ringRendered, contrastWalk, contrastFailuresHtml,
  cssReflowWidths, reflowAt, focusOrderAt,
} from "./wcag-f6.mjs";
import { PAGES } from "./wcag-f6-pages.mjs";

/** This tier's own receipt. A glob that matched no file also reports "pass 0". */
const RECEIPT_PATH = process.env.WB_WCAG_F6_RECEIPT ?? join(tmpdir(), "wb-wcag-f6-receipt.json");

const THEMES = ["light", "dark"];

/**
 * One control per focusable KIND, with a selector that matches it and nothing else.
 *
 * Derived from the page rather than listed here, so a wave that moves a control does not leave this
 * file measuring an element that no longer exists. The uniqueness of the selector is CHECKED and
 * asserted: a bare `a` also matches the skip link, and the first run of the reporting script
 * reported two focus-ring failures that were only that collision.
 */
const FOCUS_TARGETS = `(() => {
  const unique = (el) => {
    if (el.id !== "") return "#" + CSS.escape(el.id);
    const parts = [];
    for (let n = el; n !== null && n !== document.documentElement; n = n.parentElement) {
      if (n.id !== "") { parts.unshift("#" + CSS.escape(n.id)); break; }
      parts.unshift(n.tagName.toLowerCase() + ":nth-child("
        + ([...n.parentElement.children].indexOf(n) + 1) + ")");
    }
    return parts.join(" > ");
  };
  const picked = new Map();
  for (const e of document.querySelectorAll('a[href], button, input, select, textarea, summary')) {
    const cs = getComputedStyle(e);
    if (e.disabled || e.closest("fieldset[disabled]") !== null || e.closest("[hidden]") !== null
        || cs.display === "none" || cs.visibility === "hidden") continue;
    const kind = e.classList.contains("skip") ? "skip-link"
      : e.tagName.toLowerCase() + (e.tagName === "INPUT" ? "[type=" + e.type + "]" : "");
    if (picked.has(kind)) continue;
    const selector = unique(e);
    picked.set(kind, { kind, selector, matched: document.querySelectorAll(selector).length });
  }
  return [...picked.values()];
})`;

/**
 * The controls whose focus is NOT indicated, with the cause, and what closes each.
 *
 * `index.html` is not this change's to edit, so the finding is pinned as a set. A control that
 * joins the set fails here; the ones already in it are held with the reason at the assertion, which
 * is where a reader of a red gate will look.
 */
const KNOWN_UNINDICATED = {
  "index.html": [
    // `<input id="file" class="sr-only">` inside `<label class="file">`. The label is styled as a
    // button and is what a sighted user sees; the input it labels is a 1px clipped box. The
    // `:focus-visible` outline therefore paints around the clipped box and nothing visible changes
    // -- measured at 0 of 288 band pixels, in BOTH themes. Closed by giving the label the ring:
    // `label.file:has(:focus-visible) { outline: 3px solid var(--focus); outline-offset: 2px }`.
    "input[type=file]",
  ],
  "learn.html": [],
};

/**
 * D-2, as a number per page: how many focus-order inversions each width may carry.
 *
 * `index.html`'s Edit section is `repeat(auto-fit, minmax(19rem, 1fr))`, so its eleven forms lay
 * out in however many columns fit and are read across while Tab goes down. That is the divergence
 * D-2 predicted and never measured; the fix is a layout decision in a file this change does not
 * own, so the measured counts are pinned exactly. `learn.html` carries a multi-column card grid and
 * still measures zero, because each card holds exactly one control.
 */
const EXPECTED_INVERSIONS = {
  "index.html": { 320: 0, 368: 0, 672: 29, 976: 77, 1024: 75, 1025: 75 },
  "learn.html": { 320: 0, 576: 0, 832: 0 },
};

let server;
let browser;
const measurements = new Map();

async function measure(def) {
  const { page } = await openServedPage(browser, def.path, server.origin);
  await page.waitForFunction(def.ready, { timeout: 30_000 });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await def.drive(page);

  const css = await page.evaluate(() => [...document.querySelectorAll("style")]
    .map((s) => s.textContent).join("\n"));
  const widths = cssReflowWidths(css);
  const reflow = [];
  const order = [];
  for (const { width, why } of widths) {
    reflow.push({ width, why, ...await reflowAt(page, width) });
    order.push({ why, ...await focusOrderAt(page, width) });
  }
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });

  const targets = await page.evaluate(`(${FOCUS_TARGETS})()`);
  const themes = {};
  for (const theme of THEMES) {
    await applyTheme(page, theme);
    const focus = [];
    for (const t of targets) {
      const m = await focusRingDiff(page, t.selector);
      focus.push({ ...m, kind: t.kind, matched: t.matched, rendered: ringRendered(m) });
    }
    const html = await contrastWalk(page);
    const svg = def.diagram === undefined ? null : await svgTextContrast(page, def.diagram.root);
    themes[theme] = { focus, html, svg };
  }
  measurements.set(def.name, { widths, reflow, order, themes, targets, page });
  return page;
}

/** A page driven to the same state, for a probe to be sabotaged on without poisoning the others. */
async function sabotagePage(def = PAGES[0]) {
  const { page } = await openServedPage(browser, def.path, server.origin);
  await page.waitForFunction(def.ready, { timeout: 30_000 });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await def.drive(page);
  return page;
}

before(async () => {
  server = await startServerOnFreePort(WORKBENCH_DIR);
  browser = await launchBrowser();
  // Sequentially: the pages share one Chromium, and two tabs taking clipped screenshots at once
  // would race each other's scrolling.
  for (const def of PAGES) {
    const page = await measure(def);
    await page.close();
  }
}, { timeout: 600_000 });

after(async () => {
  if (measurements.size > 0) {
    const path = await writeReceipt({
      ranAt: new Date().toISOString(),
      origin: server?.origin ?? null,
      pages: Object.fromEntries([...measurements].map(([name, m]) => [name, {
        reflowWidths: m.widths.map((w) => w.width),
        focusKinds: m.targets.map((t) => t.kind),
        themes: Object.fromEntries(THEMES.map((theme) => [theme, {
          ringsRendered: m.themes[theme].focus.filter((f) => f.rendered).map((f) => f.kind),
          ringsNotRendered: m.themes[theme].focus.filter((f) => !f.rendered).map((f) => f.kind),
          htmlTextsExamined: m.themes[theme].html.examined,
          htmlFailures: contrastFailuresHtml(m.themes[theme].html),
          svgTextsExamined: m.themes[theme].svg?.texts.length ?? 0,
          svgFailures: m.themes[theme].svg === null ? [] : contrastFailures(m.themes[theme].svg),
        }])),
        reflow: m.reflow.map((r) => ({ width: r.width, overflow: r.horizontalOverflowPx, inspected: r.inspected })),
        inversions: Object.fromEntries(m.order.map((o) => [o.width, o.inversions])),
      }])),
    }, RECEIPT_PATH);
    console.log(`FR-A11Y F-6 receipt: ${path}`);
  }
  await shutdown({ browser, server: server?.server });
});

describe("2.4.7: the focus ring RENDERS, in both themes", () => {
  for (const def of PAGES) {
    for (const theme of THEMES) {
      it(`${def.name} ${theme}: every control kind but the known ones changes pixels around it`, () => {
        const m = measurements.get(def.name);
        assert.ok(m, `${def.name} was never measured`);
        const focus = m.themes[theme].focus;
        // The measurement examined something, and examined the thing it named. A probe whose
        // selector matched two elements focused one and clipped the other.
        assert.ok(focus.length >= 4,
          `only ${focus.length} focusable control kind(s) found on ${def.name} -- the page did not `
          + "paint, so every verdict below is vacuous");
        assert.deepEqual(focus.filter((f) => f.matched !== 1).map((f) => f.selector), [],
          "a focus target's selector matched more or less than one element, so the shot and the "
          + "focus were of different controls");
        assert.deepEqual(focus.filter((f) => f.present === false).map((f) => f.kind), [],
          "a derived focus target had vanished by the time it was measured");

        const unindicated = focus.filter((f) => !f.rendered).map((f) => f.kind).sort();
        assert.deepEqual(unindicated, [...KNOWN_UNINDICATED[def.name]].sort(),
          `the set of controls with no visible focus indication on ${def.name} (${theme}) changed. `
          + "Each known member is held with its cause at KNOWN_UNINDICATED; a new member is a 2.4.7 "
          + `regression. Measured: ${JSON.stringify(focus.map((f) => ({ kind: f.kind, band: `${f.bandChanged}/${f.bandTotal}` })))}`);
      });
    }
  }

  it("the ring measurement goes RED when the outline is removed", async () => {
    // The negative control. Without it a green focus-ring gate is indistinguishable from a probe
    // that screenshots the same pixels twice -- which is a bug this probe actually had, twice, in
    // the shape of a wrong clip coordinate space and a clip computed in the wrong units.
    const page = await sabotagePage();
    try {
      const before = await focusRingDiff(page, "#new-system");
      assert.ok(ringRendered(before), "the control this control test depends on has no ring to remove");
      await page.addStyleTag({ content: "*, *::before, *::after { outline: none !important; }" });
      const after = await focusRingDiff(page, "#new-system");
      assert.equal(ringRendered(after), false,
        `with every outline suppressed the probe still reports a ring: ${after.bandChanged} of `
        + `${after.bandTotal} band pixels changed. It is measuring something other than the ring`);
    } finally { await page.close(); }
  });
});

describe("1.4.3: every ratio, including the ones axe returns INCOMPLETE for", () => {
  for (const def of PAGES) {
    for (const theme of THEMES) {
      it(`${def.name} ${theme}: no text below its floor`, () => {
        const m = measurements.get(def.name);
        const { html, svg } = m.themes[theme];
        // Counts first. 150 is well under what either page paints and well over what a broken
        // walk returns, so it separates "clean" from "matched nothing" without pinning a number
        // that moves whenever a wave adds a row to a table.
        assert.ok(html.examined > 150,
          `only ${html.examined} HTML texts examined on ${def.name} -- the walk found almost `
          + "nothing, so the zero below means nothing");
        assert.deepEqual(contrastFailuresHtml(html, "wcag"), [],
          `${def.name} (${theme}) paints HTML text below the 1.4.3 floor`);
        if (def.diagram !== undefined) {
          assert.ok(svg.drew, `${def.name} drew no diagram, so its SVG text is unmeasured`);
          assert.ok(svg.texts.length > 5,
            `only ${svg.texts.length} SVG texts on ${def.name} -- too few to be the real picture`);
          assert.deepEqual(contrastFailures(svg), [],
            `${def.name} (${theme}) paints diagram text below the floor on ground ${svg.svgBackground}`);
        }
      });
    }
  }

  it("the HTML walk leaves SVG text to the SVG probe, and says how much", () => {
    // Not hygiene: the ink of an SVG glyph is its `fill`, and `color` on an SVG `<text>` returns
    // the page's inherited ink. Reading the wrong property manufactured 23 dark-theme failures on
    // the workspace page and 8 on Learn, every one of them naming a real element. The two probes
    // divide the document, and the counts prove neither half is empty.
    for (const def of PAGES) {
      const m = measurements.get(def.name);
      for (const theme of THEMES) {
        assert.ok(m.themes[theme].html.skippedSvg > 10,
          `the HTML contrast walk on ${def.name} skipped only ${m.themes[theme].html.skippedSvg} SVG `
          + "nodes -- either the diagram did not render or the walk is measuring `color` on glyphs");
      }
    }
  });

  it("the contrast walk goes RED on text it should refuse", async () => {
    const page = await sabotagePage();
    try {
      const clean = await contrastWalk(page);
      assert.deepEqual(contrastFailuresHtml(clean), [], "the page used for this control is not clean");
      // Ink one shade off the panel it sits on. Named `#summary` because it is a real, painted,
      // always-present paragraph -- a synthetic element appended for the test would prove the walk
      // sees elements it was handed rather than elements the page has.
      await page.addStyleTag({ content: "#summary { color: #1f2328 !important; background: #212529 !important; }" });
      const broken = await contrastWalk(page);
      const found = contrastFailuresHtml(broken);
      assert.equal(found.length, 1,
        `one deliberately illegible paragraph should produce exactly one finding, got `
        + `${found.length}: ${JSON.stringify(found)}`);
      assert.match(found[0], /#summary/, "the finding does not name the element that was sabotaged");
    } finally { await page.close(); }
  });
});

describe("1.4.10 and D-2: reflow, and focus order against visual order", () => {
  for (const def of PAGES) {
    it(`${def.name}: no horizontal scrolling at 320 CSS px, or at any width its CSS defines`, () => {
      const m = measurements.get(def.name);
      // The widths come from the page's own stylesheet -- its `@media` breakpoints and the track
      // sizes of its `auto-fit` grids, which reflow with no media query at all. 320 is 1.4.10's.
      assert.ok(m.widths.some((w) => w.width === 320), "the 1.4.10 floor is not in the width list");
      assert.ok(m.widths.length >= 3,
        `only ${m.widths.length} width(s) derived for ${def.name} -- the stylesheet parse found no `
        + "breakpoints, so this is a one-width check wearing a list");
      for (const r of m.reflow) {
        assert.ok(r.inspected > 50,
          `only ${r.inspected} elements measured at ${r.width}px on ${def.name}`);
        assert.equal(r.horizontalOverflowPx, 0,
          `${def.name} scrolls sideways at ${r.width}px (${r.why}): scrollWidth ${r.scrollWidth} `
          + `vs ${r.clientWidth}. Offenders: ${JSON.stringify(r.offenders)}`);
      }
    });

    it(`${def.name}: focus order diverges from visual order exactly where it is known to`, () => {
      const m = measurements.get(def.name);
      const measured = Object.fromEntries(m.order.map((o) => [o.width, o.inversions]));
      assert.deepEqual(measured, EXPECTED_INVERSIONS[def.name],
        `${def.name}'s focus-order divergence changed. The non-zero entries are D-2, measured: a `
        + "multi-column `auto-fit` grid is read across and tabbed down. See EXPECTED_INVERSIONS. "
        + `Examples at the worst width: ${JSON.stringify(m.order.at(-1).examples)}`);
      // The comparison is only meaningful if the layout actually went multi-column somewhere.
      assert.ok(m.order.some((o) => o.widestRow > 1),
        `no width put two controls in one visual row on ${def.name}, so every zero above is the `
        + "answer for a one-column page and says nothing about 2-D divergence");
    });
  }

  it("the reflow probe goes RED on an element that overflows", async () => {
    const page = await sabotagePage();
    try {
      await page.setViewport({ width: 320, height: 512, deviceScaleFactor: 1 });
      assert.equal((await reflowAt(page, 320)).horizontalOverflowPx, 0, "the control page already overflows");
      // Appended rather than widened in place: an existing element given a huge width might land
      // inside one of the page's deliberate `.scroll` containers, which 1.4.10 permits and the
      // probe correctly ignores -- and the control would then prove the exemption, not the check.
      await page.evaluate(() => {
        const wide = document.createElement("div");
        wide.id = "reflow-sabotage";
        wide.style.width = "2000px";
        wide.textContent = "x";
        document.body.append(wide);
      });
      const broken = await reflowAt(page, 320);
      assert.ok(broken.horizontalOverflowPx > 1000,
        `a 2000px block on a 320px viewport produced ${broken.horizontalOverflowPx}px of overflow`);
      assert.ok(broken.offenders.some((o) => o.path === "#reflow-sabotage"),
        `the probe saw the overflow and did not name it: ${JSON.stringify(broken.offenders)}`);
    } finally { await page.close(); }
  });
});
