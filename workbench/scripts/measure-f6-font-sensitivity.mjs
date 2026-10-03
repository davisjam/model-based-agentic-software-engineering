// Is `EXPECTED_INVERSIONS` a property of the page, or of this machine's font stack?
//
// The question this answers. `wcag-f6.test.mjs` pinned within-region focus-order inversions as
// exact counts at exact widths -- `{ 320: 0, 368: 0, 672: 30, 976: 77, 1024: 75, 1025: 75 }` for
// `index.html`. That gate passes 57/57 here and failed the Pages workflow on a GitHub Ubuntu
// runner. `assets/mage-tokens.css` declares `--mage-font-body: "Source Sans 3", -apple-system,
// BlinkMacSystemFont, "Segoe UI", sans-serif`; this machine HAS Source Sans 3 (18 fontconfig
// entries, `~/Library/Fonts/SourceSans3[wght].ttf`), a runner has none of the four named families,
// and nothing in `.github/workflows/pages.yml` installs a font.
//
// So the suspicion is that the non-zero counts are a function of text metrics, which are a function
// of which font resolved. This script perturbs ONE variable at a time and reports whether the
// pinned numbers move. It does not assert; it prints, so a reader can see which conditions moved
// what. The assertions live in the gate, and this is the measurement that told the gate what to
// assert.
//
// Four font conditions, and the reason for each:
//
//   - `declared`    -- the shipped stack, untouched. The control.
//   - `no-source-3` -- the stack with `"Source Sans 3"` removed, which is EXACTLY what a runner
//                      resolves: the family is requested and missing, so the next available one
//                      wins. The closest reproduction of CI available without a Linux Chromium.
//   - `generic`     -- `sans-serif` alone. A second, independent perturbation: if the counts move
//                      under both, the dependence is on metrics rather than on one font's quirk.
//   - `serif`       -- a deliberately far-away metric, as an upper bound on the sensitivity.
//
// And one NON-font condition, because a font is not the only thing that differs between a mac and a
// Linux runner: `scrollbar`, which re-measures the same widths 15px narrower. Linux Chromium paints
// a classic 15px scrollbar that consumes layout width; macOS paints an overlay scrollbar that
// consumes none. If the counts move under a 15px width delta, that is a SECOND machine-dependence
// in the same pin, and a fix that only addresses fonts would leave the gate flaky.
//
// Every condition carries a WITNESS that the perturbation took effect -- the rendered width of a
// fixed string, measured in the page. A font override that silently failed to apply would report
// "the counts did not move", which is the same sentence as "fonts do not matter" and the exact
// shape of the probe defects this suite's record is about.
import { startServerOnFreePort, launchBrowser, shutdown, openServedPage, WORKBENCH_DIR } from "../test/browser/harness.mjs";
import { focusOrderAt, reflowAt, cssReflowWidths } from "../test/browser/a11y/wcag-f6.mjs";
import { PAGES } from "../test/browser/a11y/wcag-f6-pages.mjs";

/** The tail of the declared stack after the one family a runner would miss. */
const FALLBACK_TAIL = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const CONDITIONS = [
  { name: "declared", css: null },
  { name: "no-source-3", css: `:root { --mage-font-body: ${FALLBACK_TAIL} !important; }` },
  { name: "generic", css: ":root { --mage-font-body: sans-serif !important; }" },
  { name: "serif", css: ":root { --mage-font-body: serif !important; }" },
];

/**
 * The rendered width of a fixed string in the page's body font, in the page.
 *
 * `canvas.measureText` with the computed family, rather than a DOM span: it reads the same family
 * string the page resolved and returns a number that moves when the resolution does, with no
 * layout to perturb.
 */
const WITNESS = `(() => {
  const family = getComputedStyle(document.body).fontFamily;
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = '16px ' + family;
  return {
    family,
    width: Number(ctx.measureText("Model-Based Agentic Software Engineering").width.toFixed(2)),
    hasSourceSans3: document.fonts.check('16px "Source Sans 3"'),
  };
})`;

async function run() {
  const server = await startServerOnFreePort(WORKBENCH_DIR);
  const browser = await launchBrowser();
  const report = {};
  try {
    for (const def of PAGES) {
      report[def.name] = {};
      const { page } = await openServedPage(browser, def.path, server.origin);
      await page.waitForFunction(def.ready, { timeout: 30_000 });
      await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
      await def.drive(page);
      const css = await page.evaluate(() => [...document.querySelectorAll("style")]
        .map((s) => s.textContent).join("\n"));
      const widths = cssReflowWidths(css).map((w) => w.width);

      for (const condition of CONDITIONS) {
        // A fresh tab per condition: `addStyleTag` cannot be undone, and a condition measured on a
        // page carrying the previous condition's override would measure neither.
        const { page: p } = await openServedPage(browser, def.path, server.origin);
        await p.waitForFunction(def.ready, { timeout: 30_000 });
        await p.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
        await def.drive(p);
        if (condition.css !== null) await p.addStyleTag({ content: condition.css });
        const witness = await p.evaluate(`(${WITNESS})()`);
        const rows = {};
        for (const width of widths) {
          const o = await focusOrderAt(p, width);
          // The reflow verdict under the same condition. 1.4.10 is asserted to a hard zero, and a
          // wider fallback font is exactly what could push an unbreakable run past 320px -- so if
          // the font that CI resolves overflows anywhere, that is a SECOND reason the tier is red
          // there and it is a real page defect rather than a brittle pin.
          const r = await reflowAt(p, width);
          rows[width] = {
            within: o.inversionsWithinRegion, total: o.inversions,
            widestRow: o.widestRow, multiStopRows: o.multiStopRows, controls: o.controlStops,
            overflow: r.horizontalOverflowPx,
            // The structural verdict that replaced the counts: per region, is it 2-D and does it
            // diverge. The claim is that THIS does not move while the counts above do.
            diverging: Object.entries(o.regions).filter(([, x]) => x.diverges)
              .map(([n, x]) => `${n}:${x.widestRow}col`).sort().join(" "),
            oneColumnDiverging: Object.entries(o.regions)
              .filter(([, x]) => x.multiColumn === false && x.diverges).map(([n]) => n).sort().join(" "),
          };
        }
        report[def.name][condition.name] = { witness, rows };
        await p.close();
      }

      // The non-font condition: the same declared font, 15px narrower, which is what a classic
      // Linux scrollbar does to the layout width at a given viewport width.
      const { page: p } = await openServedPage(browser, def.path, server.origin);
      await p.waitForFunction(def.ready, { timeout: 30_000 });
      await p.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
      await def.drive(p);
      const rows = {};
      for (const width of widths) {
        const o = await focusOrderAt(p, width - 15);
        rows[width] = { at: width - 15, within: o.inversionsWithinRegion, total: o.inversions, widestRow: o.widestRow };
      }
      report[def.name]["scrollbar-15px"] = { witness: await p.evaluate(`(${WITNESS})()`), rows };
      await p.close();
      await page.close();
    }
  } finally {
    await shutdown({ browser, server: server.server });
  }

  for (const [name, conditions] of Object.entries(report)) {
    console.log(`\n=== ${name}`);
    for (const [condition, { witness, rows }] of Object.entries(conditions)) {
      console.log(`  ${condition.padEnd(14)} ${witness.width}px "${witness.family}"`
        + ` sourceSans3=${witness.hasSourceSans3}`);
      console.log(`    within: ${JSON.stringify(Object.fromEntries(Object.entries(rows).map(([w, r]) => [w, r.within])))}`);
      console.log(`    total : ${JSON.stringify(Object.fromEntries(Object.entries(rows).map(([w, r]) => [w, r.total])))}`);
      console.log(`    widest: ${JSON.stringify(Object.fromEntries(Object.entries(rows).map(([w, r]) => [w, r.widestRow])))}`);
    }
  }
  console.log(`\n${JSON.stringify(report)}`);
}

await run();
