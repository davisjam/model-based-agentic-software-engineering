// Measure the three WCAG properties `BASELINE-a11y-261002.md` §6 F-6 declined to measure, and
// emit JSON.
//
// F-6 named three unknowns and said why each was unknown. This script answers them, on EVERY
// served page and in BOTH themes:
//
//   2.4.7  visible focus indication -- proven by pixels, not by finding the CSS rule. Per control:
//          a screenshot unfocused, a Tab press, a screenshot focused, and the count of pixels that
//          changed in the band OUTSIDE the control's own box.
//   1.4.3  contrast -- every ratio, HTML and SVG, including the SVG fills axe returns INCOMPLETE
//          for. The record's own warning is the reason: a tool reporting INCOMPLETE and a page
//          reporting zero violations read identically in a summary line, and the one contrast
//          defect this project shipped hid in exactly that gap.
//   1.4.10 reflow, plus D-2's 2-D focus divergence -- at the widths the pages' OWN CSS makes
//          interesting, parsed from the served stylesheets rather than guessed.
//
// Companion to `measure-a11y-baseline.mjs`, and the same instrument discipline: pressed keys only,
// computed styles over markup, a count of what was examined beside every zero. Nothing is
// installed -- the server, the browser and the axe bundle all come from `test/browser/harness.mjs`,
// the fixture the browser tiers already use, so this script adds no second copy of any of them.
//
// The gate that re-runs these probes on every push is `test/browser/a11y/wcag-f6.test.mjs`. This
// script is the reporting surface: it prints the numbers that go in the record and writes the full
// measurement, including the per-element ratios a failing assertion would only summarise.
//
// Usage:
//   node build.mjs                                   # the pages load ./dist/*.js
//   node scripts/measure-wcag-f6.mjs
//   node scripts/measure-wcag-f6.mjs --out=/tmp/f6.json
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  startServerOnFreePort, launchBrowser, shutdown, openServedPage, WORKBENCH_DIR,
} from "../test/browser/harness.mjs";
import { loadAxeSource, runAxe, svgTextContrast, contrastFailures } from "../test/browser/a11y/axe.mjs";
import {
  applyTheme, focusRingDiff, ringRendered, contrastWalk, contrastFailuresHtml,
  cssReflowWidths, reflowAt, focusOrderAt,
} from "../test/browser/a11y/wcag-f6.mjs";
import { PAGES } from "../test/browser/a11y/wcag-f6-pages.mjs";

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};
const OUT = arg("out", "/tmp/wb-wcag-f6.json");
const THEMES = ["light", "dark"];

/**
 * The stylesheets a page actually serves, concatenated.
 *
 * Inline `<style>` plus every `<link rel=stylesheet>` the page pulled in, read from the DOM after
 * load rather than from disk: the token sheet both pages alias is where some values live, and a
 * breakpoint could arrive from either file.
 */
const servedCss = (page) => page.evaluate(() => {
  const inline = [...document.querySelectorAll("style")].map((s) => s.textContent).join("\n");
  const linked = [...document.styleSheets]
    .filter((s) => s.href !== null)
    .map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join("\n"); } catch { return ""; } })
    .join("\n");
  return `${inline}\n${linked}`;
});

/**
 * One control per KIND the page's tab walk actually contains, derived from the walk.
 *
 * A hand-written list of ids would measure the page as it was when the list was typed, and the
 * shell moves controls between waves. Kind means tag plus input type plus whether it is the skip
 * link, because that is the axis an indication defect follows: a stylesheet reset lands on every
 * `<select>` at once, and the skip link is styled by nothing the other controls share.
 */
async function focusTargets(page) {
  return page.evaluate(() => {
    /**
     * A selector that matches this element and NOTHING else.
     *
     * An id when there is one; otherwise an `:nth-child` chain up to the nearest id. A
     * tag-plus-class selector is what the first run used, and on the Learn page it reduced the
     * header's nav link to the bare selector `a` -- which also matches the skip link, the first
     * anchor in the document. The walk then stopped on the skip link, compared it against a clip
     * taken from the nav link's box, and reported "0 of 1808 band pixels changed": a focus-ring
     * FAILURE on a control the probe never focused. Two of the four Learn verdicts were that bug.
     */
    const uniqueSelector = (el) => {
      if (el.id !== "") return `#${CSS.escape(el.id)}`;
      const parts = [];
      for (let n = el; n !== null && n !== document.documentElement; n = n.parentElement) {
        if (n.id !== "") { parts.unshift(`#${CSS.escape(n.id)}`); break; }
        const index = [...n.parentElement.children].indexOf(n) + 1;
        parts.unshift(`${n.tagName.toLowerCase()}:nth-child(${index})`);
      }
      return parts.join(" > ");
    };

    const focusable = [...document.querySelectorAll(
      'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
    )].filter((e) => {
      const cs = getComputedStyle(e);
      return !e.disabled && e.closest("fieldset[disabled]") === null
        && e.closest("[hidden]") === null && cs.display !== "none" && cs.visibility !== "hidden";
    });
    const picked = new Map();
    for (const e of focusable) {
      const kind = e.classList.contains("skip") ? "skip-link"
        : `${e.tagName.toLowerCase()}${e.tagName === "INPUT" ? `[type=${e.type}]` : ""}`;
      if (picked.has(kind)) continue;
      const selector = uniqueSelector(e);
      const matched = document.querySelectorAll(selector).length;
      picked.set(kind, {
        kind, selector, matched, text: (e.textContent ?? "").trim().slice(0, 32),
      });
    }
    return [...picked.values()];
  });
}

async function measurePage(browser, origin, def, axeSource) {
  const { page } = await openServedPage(browser, def.path, origin);
  await page.waitForFunction(def.ready, { timeout: 30_000 });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await def.drive(page);

  const css = await servedCss(page);
  const widths = cssReflowWidths(css);
  const result = { page: def.name, reflowWidths: widths, themes: {} };

  // Reflow and focus order are theme-INDEPENDENT (no media query in either page changes layout by
  // colour scheme), so they are measured once per width and recorded under the page, not the theme.
  result.reflow = [];
  result.focusOrder = [];
  for (const { width, why } of widths) {
    result.reflow.push({ width, why, ...await reflowAt(page, width) });
    result.focusOrder.push({ why, ...await focusOrderAt(page, width) });
  }
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });

  const targets = await focusTargets(page);
  for (const theme of THEMES) {
    await applyTheme(page, theme);
    const focus = [];
    for (const t of targets) {
      const m = await focusRingDiff(page, t.selector, { label: `${t.kind} ${t.text}` });
      // `matched` travels with the result. A selector that matches two elements measured neither
      // of them, and the number says so instead of the verdict quietly meaning something else.
      focus.push({ ...m, kind: t.kind, matched: t.matched, rendered: ringRendered(m) });
    }
    const html = await contrastWalk(page);
    const axe = await runAxe(page, axeSource);
    const svg = def.diagram === undefined ? null : await svgTextContrast(page, def.diagram.root);
    result.themes[theme] = {
      focus,
      contrast: {
        htmlExamined: html.examined,
        htmlSkippedInvisible: html.skippedInvisible,
        htmlSkippedSvg: html.skippedSvg,
        htmlFailuresWcag: contrastFailuresHtml(html, "wcag"),
        htmlFailuresAxeApprox: contrastFailuresHtml(html, "axe-approx"),
        worstHtml: [...html.texts].sort((a, b) => a.ratio - b.ratio).slice(0, 8),
        svgDrew: svg === null ? null : svg.diagrams,
        svgTextsExamined: svg === null ? 0 : svg.texts.length,
        svgBackground: svg === null ? null : svg.svgBackground,
        svgFailures: svg === null ? [] : contrastFailures(svg),
        // What axe would not judge, beside what we measured for it. The pairing is the point: a
        // page with zero violations and a dozen incompletes is not a measured page.
        axeViolations: axe.violations.map((v) => `${v.id} @ ${v.nodes.map((n) => n.target).join(", ")}`),
        axeIncomplete: axe.incomplete.map((v) => `${v.id} @ ${v.nodes.map((n) => n.target).join(", ")}`),
        axeRulesPassed: axe.passes,
      },
    };
  }
  await page.close();
  return result;
}

const server = await startServerOnFreePort(WORKBENCH_DIR);
const browser = await launchBrowser();
try {
  const axe = await loadAxeSource();
  const record = {
    ranAt: new Date().toISOString(),
    origin: server.origin,
    axeVersion: axe.version,
    node: process.version,
    pages: [],
  };
  for (const def of PAGES) record.pages.push(await measurePage(browser, server.origin, def, axe.source));

  await writeFile(OUT, `${JSON.stringify(record, null, 2)}\n`, "utf8");

  // The printed summary is the part that goes in the record, and every line carries the count of
  // what was examined: a zero beside "0 examined" is not a measurement.
  for (const p of record.pages) {
    console.log(`\n=== ${p.page}`);
    for (const theme of THEMES) {
      const t = p.themes[theme];
      const ok = t.focus.filter((f) => f.rendered).length;
      console.log(`  2.4.7 ${theme}: focus ring rendered on ${ok}/${t.focus.length} control kinds`);
      for (const f of t.focus) {
        console.log(`        ${f.rendered ? "y" : "N"} ${f.kind} ${f.selector}: `
          + `matched ${f.matched}, band ${f.bandChanged}/${f.bandTotal} px changed, outline ${f.outline}`
          + `${f.moved ? ", MOVED on focus" : ""}`
          + `${f.matchesFocusVisible === false ? ", :focus-visible DID NOT MATCH" : ""}`);
      }
      const c = t.contrast;
      console.log(`  1.4.3 ${theme}: ${c.htmlExamined} HTML texts + ${c.svgTextsExamined} SVG texts `
        + `examined (${c.htmlSkippedSvg} SVG nodes left to the SVG probe, `
        + `${c.htmlSkippedInvisible} unpainted); ${c.htmlFailuresWcag.length} HTML under floor, `
        + `${c.svgFailures.length} SVG under floor; the looser axe-style threshold would report `
        + `${c.htmlFailuresAxeApprox.length}`);
      for (const f of [...c.htmlFailuresWcag, ...c.svgFailures]) console.log(`        ${f}`);
      console.log(`        axe: ${c.axeViolations.length} violation(s), `
        + `${c.axeIncomplete.length} incomplete, ${c.axeRulesPassed} rules passed`);
      for (const i of c.axeIncomplete) console.log(`        INCOMPLETE ${i}`);
    }
    for (const r of p.reflow) {
      console.log(`  1.4.10 @${r.width}px: scrollWidth ${r.scrollWidth} vs client ${r.clientWidth} `
        + `(overflow ${r.horizontalOverflowPx}px), ${r.inspected} elements inspected`
        + `${r.offenders.length > 0 ? `; offenders: ${r.offenders.map((o) => `${o.path}@${o.right}`).join(", ")}` : ""}`);
    }
    for (const f of p.focusOrder) {
      console.log(`  D-2 @${f.width}px: ${f.stops} stops (${f.controlStops} controls, `
        + `containers: ${f.containerStops.join(", ") || "none"}), widest visual row ${f.widestRow}, `
        + `${f.multiStopRows} multi-stop row(s), ${f.inversions} inversion(s)  [${f.why}]`);
      for (const e of f.examples) console.log(`        ${e}`);
    }
  }
  console.log(`\nfull measurement: ${OUT}`);
} finally {
  await shutdown({ browser, server: server.server });
}
