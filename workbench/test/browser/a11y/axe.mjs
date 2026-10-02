// axe-core over the served page, plus the one measurement axe declines to make.
//
// axe is RESOLVED, not depended on -- the same decision the harness makes for Puppeteer, for a
// sharper reason. axe-core 4.12.1 is already pinned in the REPO ROOT package-lock.json, where it
// backs the catalogue's own a11y tier, and the Pages workflow runs that `npm ci` before any
// workbench step. Adding a second copy to workbench/package.json would pin the same tool twice in
// one repo, free to drift apart, and would mutate workbench/node_modules -- a symlink shared across
// parallel agent worktrees, so an install there changes trees this suite does not own.
//
// The brief asked for `npm ci && npm install axe-core` here. One pinned copy reached by
// `createRequire` is the same tool with none of that, so this file does that instead and says so.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { REPO_ROOT } from "../harness.mjs";

const require = createRequire(join(REPO_ROOT, "package.json"));

/**
 * axe's own bundle, read once and evaluated in the page.
 *
 * `axe.min.js` rather than `axe.js`: identical rules, a quarter of the bytes over CDP.
 */
export async function loadAxeSource() {
  let resolved;
  try {
    resolved = require.resolve("axe-core/axe.min.js");
  } catch (cause) {
    throw new Error(
      "axe-core did not resolve from the repo root. It is a root devDependency "
      + "(package.json, pinned); run `npm ci` in the repository root. "
      + `Resolution was anchored at ${join(REPO_ROOT, "package.json")}.`,
      { cause },
    );
  }
  const version = JSON.parse(await readFile(require.resolve("axe-core/package.json"), "utf8")).version;
  return { source: await readFile(resolved, "utf8"), version, path: resolved };
}

/**
 * The rule set. WCAG 2.1 A and AA are what FR-A11Y-1 names; `best-practice` is included because it
 * carries the structural rules a model tree depends on -- heading order, landmark uniqueness, list
 * semantics -- and excluding it would leave the structured view, which IS the accessible
 * representation here, the least-checked part of the page.
 */
export const RULE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

/**
 * Run axe over the whole document and return violations with the selector of every offending node.
 *
 * `incomplete` is returned too, and callers must look at it. axe reports a rule as incomplete when
 * it cannot decide -- and the colour-contrast rule cannot decide for SVG text at all. Treating
 * incomplete as a pass is how a page scores zero violations while carrying a 1.1:1 label, which is
 * exactly what this workbench did until `svgTextContrast` below was written.
 */
export async function runAxe(page, axeSource) {
  await page.evaluate(axeSource);
  return page.evaluate(async (tags) => {
    const res = await window.axe.run(document, { runOnly: { type: "tag", values: tags } });
    const shape = (v) => ({
      id: v.id,
      impact: v.impact ?? null,
      help: v.help,
      nodes: v.nodes.map((n) => ({
        target: n.target.flat().join(" "),
        summary: (n.failureSummary ?? "").replace(/\s+/g, " ").trim().slice(0, 240),
      })),
    });
    return {
      violations: res.violations.map(shape),
      incomplete: res.incomplete.map(shape),
      passes: res.passes.length,
      inapplicable: res.inapplicable.length,
    };
  }, RULE_TAGS);
}

/** `rule-id @ selector` for every offending node, for a failure message that names the work. */
export const describeFindings = (findings) =>
  findings.flatMap((v) => v.nodes.map((n) => `${v.id} [${v.impact ?? "n/a"}] @ ${n.target}`));

/**
 * Contrast of every text in the rendered diagram against the thing actually painted behind it.
 *
 * This exists because axe returns `color-contrast` as INCOMPLETE for SVG text -- it cannot resolve
 * an SVG `fill` against an SVG ancestor's paint -- so the diagram's labels were unmeasured by the
 * tool that was supposed to measure them. Three facts make that gap load-bearing here:
 *
 *   1. The renderer's stylesheet (src/render/svg.ts) is a FIXED light palette and must be: the SVG
 *      is also exported standalone, so it cannot read the page's custom properties.
 *   2. `figure svg`'s background comes from the page. Point it at a theme variable and the dark
 *      theme paints #11151c ink on a #201e16 ground.
 *   3. `#canvas` is `aria-hidden`, which hides the diagram from assistive technology and changes
 *      nothing for a sighted low-vision reader. 1.4.3 still applies.
 *
 * Measurement, not inference. Each text is scrolled into the viewport and hit-tested, because
 * `elementsFromPoint` only answers for points it can see, and the diagram sits at the foot of a
 * long page. Text drawn with `paint-order: stroke` and a stroke wide enough to form a halo is
 * measured against the HALO -- that is the colour under the glyph, and the renderer uses it
 * deliberately for edge labels crossing open ground.
 */
export const SVG_TEXT_CONTRAST = `(() => {
  const srgb = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const parse = (value) => { const m = String(value).match(/[\\d.]+/g); return m && m.length >= 3 ? m.slice(0, 3).map(Number) : null; };
  const luminance = (rgb) => 0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2]);
  const ratio = (a, b) => {
    const x = parse(a); const y = parse(b);
    if (x === null || y === null) return null;
    const la = luminance(x); const lb = luminance(y);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const opaque = (value) => { const m = String(value).match(/rgba?\\([^)]*\\)/); return parse(value) !== null && !/,\\s*0\\s*\\)$/.test(m ? m[0] : ""); };

  const svg = document.querySelector("#canvas svg");
  if (svg === null) return { drew: false, texts: [] };
  const svgBackground = getComputedStyle(svg).backgroundColor;

  const texts = [];
  for (const node of document.querySelectorAll("#canvas text")) {
    const style = getComputedStyle(node);
    node.scrollIntoView({ block: "center" });
    const box = node.getBoundingClientRect();
    const stack = document.elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    let beneath = null;
    for (const el of stack) {
      if (el === node) continue;
      if (el.tagName === "svg" || el.tagName === "FIGURE") { beneath = svgBackground; break; }
      const fill = getComputedStyle(el).fill;
      if (fill && fill !== "none" && opaque(fill)) { beneath = fill; break; }
      const bg = getComputedStyle(el).backgroundColor;
      if (opaque(bg)) { beneath = bg; break; }
    }
    // A halo is the ground for the glyph it surrounds.
    const halo = style.paintOrder === "stroke" && style.stroke !== "none"
      && parseFloat(style.strokeWidth) >= 2 ? style.stroke : null;
    const ground = halo ?? beneath ?? svgBackground;
    const size = parseFloat(style.fontSize);
    // WCAG 1.4.3: 3:1 for large text (>= 18px, or >= 14px bold), 4.5:1 otherwise.
    const required = size >= 18 || (size >= 14 && Number(style.fontWeight) >= 700) ? 3 : 4.5;
    texts.push({
      className: node.getAttribute("class"),
      text: (node.textContent ?? "").slice(0, 32),
      fill: style.fill, ground, halo: halo !== null,
      ratio: Number((ratio(style.fill, ground) ?? 0).toFixed(2)),
      required, size,
    });
  }
  return { drew: true, svgBackground, texts };
})()`;

export const svgTextContrast = (page) => page.evaluate(SVG_TEXT_CONTRAST);

/** The failing texts, deduplicated by class and ground -- one line per distinct cause. */
export function contrastFailures(measurement) {
  const seen = new Set();
  const out = [];
  for (const t of measurement.texts) {
    if (t.ratio >= t.required) continue;
    const key = `${t.className}|${t.ground}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(`${t.className} "${t.text}" ${t.fill} on ${t.ground}${t.halo ? " (halo)" : ""} `
      + `= ${t.ratio}:1, needs ${t.required}:1`);
  }
  return out;
}
