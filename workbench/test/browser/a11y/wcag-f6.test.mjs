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
 *     D-2     index.html   `#edit` diverges at every width where it is multi-column, nowhere else
 *             learn.html   no region diverges at any width its CSS defines
 *             both pages   no two sibling regions share any pixels, at any width
 *
 * D-2 was a table of exact inversion counts until it failed CI at a commit that passed 57/57 here.
 * The counts were a function of which font resolved and of whether the platform's scrollbar takes
 * layout width; the structural claim that replaced them is at `KNOWN_2D_DIVERGENCE`, with the
 * measurement that condemned the numbers.
 *
 * TWO findings are enumerated rather than asserted to zero, because both fixes live in
 * `index.html`, which this change does not own. Each is pinned as an exact set, so a NEW instance
 * fails here while the known one is held: the project's rule is drain-then-promote, and a gate that
 * lands blocking-red breaks every agent committing through it.
 *
 * And every assertion is paired with a COUNT, because a probe that matched nothing reports no
 * failures. Four of this file's assertions are negative controls that sabotage the page and require
 * the probe to go red -- the only evidence that a zero here is a measurement rather than a no-op.
 * Both of those disciplines are the record's own, applied to the instrument that checks it.
 *
 * `WB_F6_SIMULATE_CI_FONTS=1` runs the whole tier with the one declared font this machine has and a
 * runner does not suppressed, so "passes locally" can be checked against "passes there" without a
 * push. See `applyRunnerFonts`.
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
  cssReflowWidths, reflowAt, focusOrderAt, overlappingRegionsAt,
  applyRunnerFonts, SIMULATE_CI_FONTS,
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
 * D-2, as a SET per page: which regions may have a reading order their tab order disagrees with.
 *
 * `index.html`'s Edit section is `repeat(auto-fit, minmax(19rem, 1fr))`, so its eleven forms lay out
 * in however many columns fit and are read across while Tab goes down. That is the divergence D-2
 * predicted and never measured, and the fix is a layout decision this change does not own, so the
 * finding is held rather than drained. `learn.html` carries a multi-column card grid and diverges
 * nowhere, because each card holds exactly one control.
 *
 * **This was a table of exact counts, and the counts were a property of the measuring machine.**
 * `{ 320: 0, 368: 0, 672: 30, 976: 77, 1024: 75, 1025: 75 }` passed 57/57 locally and failed the
 * Pages workflow at the same commit. `assets/mage-tokens.css` asks for `"Source Sans 3"` first;
 * this machine has it, a GitHub Ubuntu runner has none of the four families the body stack names,
 * and no workflow step installs a font. Measured, by dropping that one family and re-running
 * (`scripts/measure-f6-font-sensitivity.mjs`):
 *
 *     width            320  368  672  976  1024  1025
 *     declared           0    0   30   77    75    75
 *     without Source 3   0    0   29   81    81    81     <- what CI resolves
 *     sans-serif         0    0   31   81    76    76
 *     serif              0    0   28   73    73    75
 *     15px scrollbar     0    0   30   30    75    75     <- what Linux Chromium's scrollbar does
 *
 * Four of the six entries move with the font, and one moves 77 to 30 on a 15px layout-width delta
 * that has nothing to do with fonts at all -- so installing the font in CI would have fixed half of
 * a two-variable problem. The zeros do not move under any condition, because at those widths the
 * grid is ONE column and the two orders are identical by construction. That is the line this pin now
 * follows: **the zeros were a claim about the page and are kept; the non-zero numbers were a count of
 * how many columns happened to fit and are replaced** by the structural claim underneath them --
 * divergence appears in this region and in no other, and only where that region is laid out in 2-D.
 *
 * What the three assertions below hold, none of which a font can move:
 *
 *   1. a region laid out in ONE column never diverges, at any width -- a strict generalisation of
 *      the `320: 0` and `368: 0` entries, which a sibling wave proved load-bearing hours ago by
 *      catching two regions sharing one grid cell;
 *   2. no region outside this set diverges, at any width -- a NEW 2-D divergence is a regression;
 *   3. a region in this set diverges wherever it IS multi-column -- the D-2 finding itself, held as
 *      present rather than drained, since eleven cells read across and tabbed down must invert some
 *      pair in any column count above one.
 *
 * The counts remain in the receipt, where a number that moves with the environment is a record
 * rather than a gate.
 */
const KNOWN_2D_DIVERGENCE = {
  "index.html": ["#edit"],
  "learn.html": [],
};

let server;
let browser;
const measurements = new Map();
/** Per page: the body family that was actually resolved, when the CI-font simulation is on. */
const fontWitness = new Map();

async function measure(def) {
  const { page } = await openServedPage(browser, def.path, server.origin);
  await page.waitForFunction(def.ready, { timeout: 30_000 });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await def.drive(page);
  // Before anything is measured, because it changes layout. A no-op unless
  // WB_F6_SIMULATE_CI_FONTS=1; see `applyRunnerFonts`.
  fontWitness.set(def.name, await applyRunnerFonts(page));

  const css = await page.evaluate(() => [...document.querySelectorAll("style")]
    .map((s) => s.textContent).join("\n"));
  const widths = cssReflowWidths(css);
  const reflow = [];
  const order = [];
  const overlaps = [];
  for (const { width, why } of widths) {
    reflow.push({ width, why, ...await reflowAt(page, width) });
    order.push({ why, ...await focusOrderAt(page, width) });
    overlaps.push({ width, ...await overlappingRegionsAt(page, width) });
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
  measurements.set(def.name, { widths, reflow, order, overlaps, themes, targets, page });
  return page;
}

/** A page driven to the same state, for a probe to be sabotaged on without poisoning the others. */
async function sabotagePage(def = PAGES[0]) {
  const { page } = await openServedPage(browser, def.path, server.origin);
  await page.waitForFunction(def.ready, { timeout: 30_000 });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await def.drive(page);
  await applyRunnerFonts(page);
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
      // Which font stack produced these numbers. A receipt from a simulated-CI run and one from a
      // normal run carry different geometry, and nothing else in the file says which is which.
      simulatedRunnerFonts: SIMULATE_CI_FONTS,
      bodyFontResolved: Object.fromEntries(fontWitness),
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
        // Both counts stay in the record. They move with the measuring machine's fonts and
        // scrollbar -- which is exactly why they are no longer asserted -- and a dated number
        // beside the structural verdict is how the next reader sees that it did.
        inversions: Object.fromEntries(m.order.map((o) => [o.width, o.inversions])),
        inversionsWithinRegion: Object.fromEntries(m.order.map((o) => [o.width, o.inversionsWithinRegion])),
        regionDivergence: Object.fromEntries(m.order.map((o) => [o.width,
          Object.fromEntries(Object.entries(o.regions).map(([name, r]) => [name, {
            multiColumn: r.multiColumn, diverges: r.diverges, pairs: r.divergentPairs,
            controls: r.controls, visualRows: r.visualRows, widestRow: r.widestRow,
          }]))])),
        regionOverlaps: Object.fromEntries(m.overlaps.map((o) => [o.width, o.overlaps])),
      }])),
    }, RECEIPT_PATH);
    console.log(`FR-A11Y F-6 receipt: ${path}`);
  }
  await shutdown({ browser, server: server?.server });
});

it("the CI-font simulation is either OFF, or ON and actually applied", () => {
  // The flag that makes the geometry pins checkable against CI has to be checkable itself. A
  // substitution that silently did not apply would make a simulated run report "CI-equivalent,
  // green" while rendering in the author's own font -- which is the shape of every probe defect
  // this suite's record enumerates, one level up.
  for (const def of PAGES) {
    const resolved = fontWitness.get(def.name);
    if (!SIMULATE_CI_FONTS) {
      assert.equal(resolved, null,
        `WB_F6_SIMULATE_CI_FONTS is unset and ${def.name} still had its body font overridden`);
      continue;
    }
    assert.ok(typeof resolved === "string" && resolved.length > 0,
      `the CI-font simulation is on and ${def.name} reported no resolved body family`);
    assert.doesNotMatch(resolved, /Source Sans 3/,
      `the CI-font simulation is on and ${def.name} still resolves to ${resolved}, so every number `
      + "measured under it is this machine's after all");
  }
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

    it(`${def.name}: focus order diverges from visual order only where the layout is 2-D`, () => {
      const m = measurements.get(def.name);
      const known = KNOWN_2D_DIVERGENCE[def.name];

      for (const o of m.order) {
        const regions = Object.entries(o.regions);
        // Counts first, per width. A walk that reached nothing groups nothing into rows, and every
        // "no region diverges" below would then be the answer for an empty page.
        assert.ok(o.controlStops > 10,
          `only ${o.controlStops} control stop(s) reached on ${def.name} at ${o.width}px, so the `
          + "divergence verdicts at this width are vacuous");
        assert.ok(regions.length >= 3,
          `only ${regions.length} region(s) held a control on ${def.name} at ${o.width}px`);

        // (1) A region in one column CANNOT diverge: every visual row holds one stop, so the two
        // orders are identical by construction. This is what the old `320: 0` entries claimed, now
        // claimed at every width and of every region -- and it is the assertion that caught
        // `#edit` and `#system-browser` sharing one grid cell, which read as "40 inversions".
        assert.deepEqual(
          regions.filter(([, r]) => r.multiColumn === false && r.diverges)
            .map(([name, r]) => `${name} (${r.controls} controls in ${r.visualRows} rows): ${r.examples[0]}`),
          [],
          `${def.name} at ${o.width}px: a region laid out in ONE column has a reading order its tab `
          + "order disagrees with. One stop per visual row cannot invert, so either two regions are "
          + "painted on top of each other or the row grouping is measuring the wrong geometry");

        // (2) And no region outside the known set diverges at all, however many columns it has.
        assert.deepEqual(
          regions.filter(([name, r]) => r.diverges && !known.includes(name))
            .map(([name, r]) => `${name}: ${r.divergentPairs} pair(s), e.g. ${r.examples[0]}`),
          [],
          `${def.name} at ${o.width}px: a region that is not a known 2-D layout now reads in one `
          + "order and tabs in another. See KNOWN_2D_DIVERGENCE; a new member is a 2.4.3 regression");
      }

      // (3) The known finding is HELD, not drained: wherever that region is multi-column its two
      // orders must still disagree. Eleven `auto-fit` cells read across and tabbed down invert some
      // pair at any column count above one, so this is the D-2 claim without its count.
      for (const name of known) {
        const multi = m.order.filter((o) => o.regions[name]?.multiColumn === true);
        const single = m.order.filter((o) => o.regions[name]?.multiColumn === false);
        assert.ok(multi.length > 0,
          `no width in ${JSON.stringify(m.widths.map((w) => w.width))} laid ${name} out in more than `
          + `one column on ${def.name}, so the D-2 finding is unmeasured rather than held`);
        assert.ok(single.length > 0,
          `${name} was multi-column at every width measured on ${def.name}, so assertion (1) above `
          + "never ran against it and the one-column claim is vacuous");
        assert.deepEqual(multi.filter((o) => o.regions[name].diverges === false)
          .map((o) => `${o.width}px (${o.regions[name].widestRow} columns)`), [],
          `${name} is laid out in more than one column and its reading order no longer diverges from `
          + "its tab order. If the layout was fixed, remove it from KNOWN_2D_DIVERGENCE and say so "
          + "in BASELINE-a11y-261002.md; if the probe stopped seeing the divergence, that is a probe "
          + "defect");
      }
    });

    it(`${def.name}: no two sibling regions occupy the same pixels`, () => {
      // The precondition the pin above rests on, and the defect that forced it to be written down.
      //
      // `#edit` and `#system-browser` both carried `grid-area: extra` against ONE `"extra extra
      // extra"` row. Two items in one named area share the cell: the Edit forms were painted over
      // the System Browser's tables in every loaded state at every width. What the focus-order
      // probe said about that was "40 inversions at 320px" -- which is exactly the number probe
      // defect #3 had once FABRICATED on a one-column page, so the first reading of the red gate
      // was that the probe had regressed again. It had not. The page had, and a reading-order
      // number cannot say so in a way anyone can act on.
      const m = measurements.get(def.name);
      assert.ok(m.overlaps.length === m.widths.length,
        `region overlap was measured at ${m.overlaps.length} of ${m.widths.length} widths`);
      for (const o of m.overlaps) {
        assert.ok(o.regions > 3,
          `only ${o.regions} region(s) found on ${def.name} at ${o.width}px, so the zero below is `
          + "the answer for a page that did not paint");
        assert.deepEqual(o.overlaps, [],
          `${def.name} paints two sibling regions on top of each other at ${o.width}px. Every `
          + "visual-order number for this page is measured against a layout where a control's "
          + "position does not say where a reader finds it.");
      }
    });
  }

  it("the region-overlap probe goes RED when two regions are put in one grid cell", async () => {
    // The negative control for the check above, written in the shape of the defect it found: not a
    // synthetic absolutely-positioned box, but the actual CSS mistake -- two regions assigned the
    // same named grid area, under a stylesheet that claims they stack.
    const page = await sabotagePage();
    try {
      assert.deepEqual((await overlappingRegionsAt(page, 1025)).overlaps, [],
        "the page used for this control already overlaps");
      await page.addStyleTag({
        content: "#shell { grid-template-areas: 'banner banner banner' 'review review review' "
          + "'start start start' 'nav work inspect' 'ask ask ask' 'status status status' "
          + "'extra extra extra' !important; } "
          + "#edit, #system-browser { grid-area: extra !important; }",
      });
      const broken = await overlappingRegionsAt(page, 1025);
      assert.ok(broken.overlaps.length > 0,
        "two regions share one grid cell and the probe reports no overlap");
      assert.ok(broken.overlaps.some((o) => o.includes("#edit") && o.includes("#system-browser")),
        `the probe saw an overlap and did not name the pair: ${JSON.stringify(broken.overlaps)}`);
    } finally { await page.close(); }
  });

  it("the 2-D divergence verdict follows the COLUMN COUNT, in both directions", async () => {
    // The negative control the structural pin needs, and the one the old count pin did not: a
    // number that moves on its own looks measured even when it is reporting the wrong thing, while
    // a boolean that is always `true` is indistinguishable from a probe that returns `true`. So the
    // only variable here is `#edit`'s column count, forced both ways at ONE viewport, and the
    // verdict has to follow it.
    const page = await sabotagePage();
    try {
      await page.addStyleTag({ content: "#edit .forms { grid-template-columns: 1fr !important; }" });
      const one = (await focusOrderAt(page, 1025)).regions["#edit"];
      assert.equal(one.multiColumn, false,
        `#edit was forced to one column and the probe still groups ${one.widestRow} of its controls `
        + "into one visual row -- the selector below missed the grid, so this control proves nothing");
      assert.equal(one.diverges, false,
        `#edit is one column wide and the probe reports ${one.divergentPairs} inverted pair(s): `
        + `${JSON.stringify(one.examples)}. One stop per visual row cannot invert`);

      await page.addStyleTag({
        content: "#edit .forms { grid-template-columns: repeat(3, 1fr) !important; }",
      });
      const three = (await focusOrderAt(page, 1025)).regions["#edit"];
      assert.equal(three.multiColumn, true, "#edit was forced to three columns and reads as one");
      assert.equal(three.diverges, true,
        "#edit's eleven cells are laid out in three columns, so an eye reading across them meets "
        + "them in an order Tab does not -- and the probe reports no divergence");
    } finally { await page.close(); }
  });

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
