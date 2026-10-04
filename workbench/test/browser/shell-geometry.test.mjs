// The shell uses the browser's width — measured from the rendered page, at four viewports.
//
// THE FAILURE CLASS: a CSS value regresses in silence. Nothing in the node tier can see a
// stylesheet, the a11y tier asks only whether the page reflows without overflowing, and every
// other browser assertion is about structure rather than size. So `max-width: 84rem` sat on the
// application container through the whole of Wave 0–3 and no gate had an opinion: at a 1600px
// viewport the workbench was a 1344px page with 256px of dead gutter, and the model itself got
// 656px of it [measured 261003, before this file existed].
//
// WHY IT MEASURES AND DOES NOT GREP. The obvious cheap version of this file reads index.html and
// asserts the absence of `max-width: 84rem`. That test passes while the page is broken, in both
// directions: the cap can come back under a different spelling (`84em`, a `calc()`, a wrapper div
// with a width), and the three columns can collapse to the wrong ratio with no cap present at all.
// A stylesheet is a claim about geometry; only the rendered box is the geometry. So every assertion
// here comes from `getBoundingClientRect` on the real page in a real engine.
//
// THE RULING THIS PINS (the author's, 261003 — these numbers are the SPEC, not a snapshot of the
// implementation, which is why they are written as literals here and derived from nothing):
//   - the shell takes the viewport, keeping only a modest gutter (~16–24px a side);
//   - the three columns sit at 22 / 56 / 22, the centre larger because the model is the subject;
//   - each column honours a floor of 260 / 550 / 280px;
//   - the figure grows with the Workspace instead of staying at its own intrinsic size.
//
// THE RATIO IS CHECKED WHERE IT IS FREE, which is the one subtlety worth stating. Below about
// 1440px the Inspector's 280px floor binds and the ratio legitimately bends around it — a floor
// that never won would not be a floor. So the 22/56/22 assertion runs at the two wide viewports,
// and the narrower ones assert the floors and the absence of overflow instead. Asserting the ratio
// at 1280px would pin arithmetic nobody ruled on and would go red the first time a floor moved.
import assert from "node:assert/strict";
import { before, after, describe, it } from "node:test";

import {
  startServerOnFreePort, launchBrowser, shutdown, openWorkbench, loadFlagshipExample,
} from "./harness.mjs";

/** The author's ruling, as numbers. */
const RATIO = { nav: 22, workspace: 56, inspector: 22 };
/** Track floors, in CSS px at a 16px root. */
const FLOOR = { nav: 260, workspace: 550, inspector: 280 };
/**
 * The collapse breakpoint, derived the same way the stylesheet derives it: the three floors, the
 * two 1.5rem column gaps, and main's two 1.25rem gutters come to 73.625rem, so three columns are
 * only viable above that and the media query rounds up to 74rem (1184px).
 */
const COLLAPSE_AT = 1184;

/** How far the measured share may sit from the ruled one, in percentage points. */
const RATIO_TOLERANCE = 1.5;

let server;
let browser;
let page;

before(async () => {
  const started = await startServerOnFreePort();
  server = started.server;
  browser = await launchBrowser();
  ({ page } = await openWorkbench(browser, started.origin));
  // A model must be loaded or the figure assertions measure an empty frame.
  await loadFlagshipExample(page);
}, { timeout: 180_000 });

after(async () => {
  await shutdown({ browser, server });
});

/**
 * Every number this file asserts on, from one layout pass.
 *
 * `setViewport` then a rAF pair: Puppeteer resolves the resize before the engine has necessarily
 * laid out against it, and a geometry read on the old layout is the kind of flake that gets a gate
 * deleted. Two frames is the documented settle for a style+layout change.
 */
async function measure(width, height = 1000) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return page.evaluate(() => {
    const box = (sel) => {
      const e = document.querySelector(sel);
      if (e === null) return null;
      const b = e.getBoundingClientRect();
      return { x: b.x, width: b.width, height: b.height };
    };
    const doc = document.documentElement;
    return {
      viewport: doc.clientWidth,
      horizontalOverflowPx: Math.max(0, doc.scrollWidth - doc.clientWidth),
      main: box("main"),
      nav: box("#nav"),
      workspace: box("#workspace"),
      inspector: box("#inspector"),
      canvas: box("#canvas"),
      svg: box("#canvas svg"),
      // Three tracks or one: the collapse is observable as the count, without reading a media query.
      trackCount: getComputedStyle(document.querySelector("#shell")).gridTemplateColumns.split(/\s+/).length,
    };
  });
}

const shares = (m) => {
  const total = m.nav.width + m.workspace.width + m.inspector.width;
  return {
    nav: (m.nav.width / total) * 100,
    workspace: (m.workspace.width / total) * 100,
    inspector: (m.inspector.width / total) * 100,
  };
};

describe("the shell occupies the browser's width", () => {
  for (const width of [1600, 1920]) {
    it(`fills a ${width}px viewport rather than capping at ~1344px`, async () => {
      const m = await measure(width);
      // The gutter is the only thing between the shell and the glass. 24px a side is the ruled
      // ceiling; the old 84rem cap showed as 128px a side at 1600px, so this fails loudly on it.
      const gutter = m.main.x;
      assert.ok(gutter <= 24,
        `main starts ${gutter}px from the edge at ${width}px — the shell is centred in a capped page, `
        + `not filling the viewport (ruled gutter: ~16–24px)`);
      assert.ok(m.main.width >= width - 48,
        `main is ${m.main.width}px wide in a ${width}px viewport — ${width - m.main.width}px is unused. `
        + `A max-width on the application container is the usual cause.`);
    });

    it(`splits ${width}px three ways at 22 / 56 / 22`, async () => {
      const m = await measure(width);
      assert.equal(m.trackCount, 3, `expected three columns at ${width}px, got ${m.trackCount}`);
      const got = shares(m);
      for (const pane of ["nav", "workspace", "inspector"]) {
        assert.ok(Math.abs(got[pane] - RATIO[pane]) <= RATIO_TOLERANCE,
          `${pane} holds ${got[pane].toFixed(1)}% of the three columns at ${width}px, ruled ${RATIO[pane]}% `
          + `(±${RATIO_TOLERANCE}). Measured widths: nav=${m.nav.width.toFixed(0)} `
          + `workspace=${m.workspace.width.toFixed(0)} inspector=${m.inspector.width.toFixed(0)}`);
      }
      // The centre must dominate, stated separately: a ratio that drifted to 33/34/33 could still
      // pass a loose tolerance on each pane while losing the hierarchy the ruling is about.
      assert.ok(m.workspace.width > m.nav.width + m.inspector.width,
        `the Workspace (${m.workspace.width.toFixed(0)}px) no longer outweighs both rails together `
        + `(${(m.nav.width + m.inspector.width).toFixed(0)}px) — the model is the subject of this page`);
    });
  }

  it("holds every column floor wherever three columns are drawn", async () => {
    // Just above the breakpoint is where the floors are tightest and an overflow would appear first.
    for (const width of [COLLAPSE_AT + 1, 1280, 1600, 1920]) {
      const m = await measure(width);
      assert.equal(m.trackCount, 3, `expected three columns at ${width}px, got ${m.trackCount}`);
      for (const pane of ["nav", "workspace", "inspector"]) {
        assert.ok(m[pane].width >= FLOOR[pane] - 1,
          `${pane} is ${m[pane].width.toFixed(0)}px at a ${width}px viewport, below its ${FLOOR[pane]}px floor`);
      }
      assert.equal(m.horizontalOverflowPx, 0,
        `${width}px overflows horizontally by ${m.horizontalOverflowPx}px. Track floors that do not `
        + `fit do not wrap — they overflow, which is a 1.4.10 failure caused by the breakpoint.`);
    }
  });
});

describe("the figure grows with the Workspace", () => {
  it("fills the width of its frame instead of its own intrinsic size", async () => {
    const m = await measure(1600);
    // The renderer writes the content's extent onto the root element as width/height attributes.
    // With only a max-width the picture could shrink and never grow, which is what pinned this
    // model's diagram at 445px inside a 628px frame before the correction.
    assert.ok(m.svg.width >= m.canvas.width - 4,
      `the diagram is ${m.svg.width.toFixed(0)}px wide inside a ${m.canvas.width.toFixed(0)}px frame — `
      + `${(m.canvas.width - m.svg.width).toFixed(0)}px of the Workspace reaches the figure and does nothing. `
      + `A max-width (rather than width) on #canvas svg is the usual cause.`);
  });

  it("grows when the Workspace grows", async () => {
    const narrow = await measure(1280);
    const wide = await measure(1920);
    assert.ok(wide.canvas.width > narrow.canvas.width,
      `the canvas frame did not widen between a 1280px and a 1920px viewport `
      + `(${narrow.canvas.width.toFixed(0)}px vs ${wide.canvas.width.toFixed(0)}px)`);
    assert.ok(wide.svg.width > narrow.svg.width + 100,
      `the diagram barely changed between 1280px and 1920px `
      + `(${narrow.svg.width.toFixed(0)}px vs ${wide.svg.width.toFixed(0)}px) — it is not using the space`);
  });

  it("stays inside the viewport's height", async () => {
    // Width alone is not a size. This graph is taller than it is wide, so filling the frame on
    // width would compute a figure taller than the screen and push everything below it away.
    const m = await measure(1600, 1000);
    assert.ok(m.svg.height <= 1000 * 0.8 + 2,
      `the diagram is ${m.svg.height.toFixed(0)}px tall in a 1000px viewport — past the 80vh ceiling `
      + `the two rails also use, which buries the reading, the ask bar and the status line`);
  });
});

describe("the reflow invariant survives full width (WCAG 1.4.10)", () => {
  it("collapses to one column below the breakpoint and stays there", async () => {
    for (const width of [COLLAPSE_AT, 900, 600, 320]) {
      const m = await measure(width, 800);
      assert.equal(m.trackCount, 1,
        `${width}px still draws ${m.trackCount} columns — a three-pane shell this narrow is three `
        + `unreadable columns, and the regions should stack in DOM order`);
    }
  });

  it("never scrolls the document sideways, at any width it is asked for", async () => {
    // Includes the breakpoint's two sides and 320px, the 1.4.10 reference width. 360 and 400 are
    // here because the forms column's floor used to overflow by 4px in exactly that band.
    for (const width of [320, 360, 400, 600, 900, COLLAPSE_AT, COLLAPSE_AT + 1, 1280, 1600, 1920]) {
      const m = await measure(width, 800);
      assert.equal(m.horizontalOverflowPx, 0,
        `the document scrolls sideways by ${m.horizontalOverflowPx}px at ${width}px`);
    }
  });
});
