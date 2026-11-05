#!/usr/bin/env node
/* check_figure_geometry.mjs — hold the hand-authored laboratory figures to their own geometry.
 *
 *   node course/interactive/_shared/check_figure_geometry.mjs                 # all six exercises
 *   node course/interactive/_shared/check_figure_geometry.mjs redos           # one of them
 *
 * Three defects, all of them invisible to every other gate in this tree, all of them found on a
 * first run over the six opening bands:
 *
 *   CLIPPED   a `<text>` runs past the `viewBox`. SVG clips to its viewport, so the label is cut
 *             and the sentence stops mid-word. 10 instances across four figures.
 *   OVERLAP   two labels sit on top of one another. Both fit; the result still reads as corrupt.
 *   OCCLUDED  a label is painted BEFORE a filled rect that covers it. SVG has no z-index — paint
 *             order is document order — so the label is simply gone.
 *
 * Why none of the existing checks sees any of this: the node tiers read the file as TEXT, so a
 * label that overflows its viewBox is a string that is present and correct; axe-core reads the
 * accessibility tree, where the `<desc>` is intact whatever the geometry does; and a screenshot
 * shows it only to a human who happens to look at that figure at that width. The discriminator is
 * laid-out geometry, which needs a layout engine, which is why this is a browser-tier check.
 *
 * WHERE IT RUNS, declared rather than left to inference. This is a browser check, so the placement
 * rule in the submodule's CLAUDE.md sends it to CI rather than the pre-push hook: it needs a
 * headless Chromium, it is not cheap under fleet load, and its verdict depends on the font stack.
 * Each exercise's `run-all.mjs` invokes it as a tier, and those suites are legs of the publishing
 * workflow's `interactive-exercises` matrix, so a red names the exercise. It is deliberately NOT in
 * the pre-push hook and NOT in the unit tier.
 *
 * Puppeteer is RESOLVED from the book's `node_modules` rather than depended on, matching the
 * browser tiers beside it: a machine without that copy gets a declared skip and exit 0, not a red.
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const INTERACTIVE = resolve(HERE, '..');
const REPO = resolve(INTERACTIVE, '..', '..');
const PUPPETEER = join(REPO, 'book', 'node_modules', 'puppeteer', 'lib', 'esm', 'puppeteer',
  'puppeteer.js');

/** The exercises, in the order the publishing workflow's matrix lists them. */
const EXERCISES = ['performance-knee', 'n-plus-one', 'redos', 'release-factory', 'storage-cost',
  'architecture-workbench'];

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const names = requested.length ? requested : EXERCISES;
for (const name of names) {
  if (!EXERCISES.includes(name)) {
    process.stderr.write(`ERROR: unknown exercise "${name}". Known: ${EXERCISES.join(', ')}\n`);
    process.exit(2);
  }
}

if (!existsSync(PUPPETEER)) {
  process.stdout.write(`SKIP figure geometry: no Puppeteer at ${PUPPETEER}\n`);
  process.exit(0);
}

/* Planned actions before execution, so a reader can see what the run intends. */
process.stdout.write(`figure-geometry plan — ${names.length} exercise(s): ${names.join(', ')}\n`);
process.stdout.write('  checks: CLIPPED (text past the viewBox) · OVERLAP (label on label) · '
  + 'OCCLUDED (label under a later filled rect)\n\n');

/** Runs inside the page. Returns one row per figure plus every finding. */
function inspect() {
  const findings = [];
  let texts = 0;
  let figures = 0;
  for (const svg of document.querySelectorAll('svg.fig')) {
    figures += 1;
    const id = svg.querySelector('title')?.id || '(untitled)';
    const box = svg.viewBox.baseVal;
    const nodes = [...svg.querySelectorAll('text, rect')];
    const labels = [];
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      if (node.tagName !== 'text') continue;
      let bb;
      try { bb = node.getBBox(); } catch { continue; }
      texts += 1;
      const text = node.textContent.trim().slice(0, 44);
      labels.push({ i, bb, text });

      if (bb.x + bb.width > box.width + 0.5) {
        findings.push(`CLIPPED  ${id}: "${text}" runs `
          + `${(bb.x + bb.width - box.width).toFixed(1)} past the viewBox's right edge`);
      }
      if (bb.y + bb.height > box.height + 0.5) {
        findings.push(`CLIPPED  ${id}: "${text}" runs `
          + `${(bb.y + bb.height - box.height).toFixed(1)} past the viewBox's bottom edge`);
      }
      if (bb.x < -0.5) findings.push(`CLIPPED  ${id}: "${text}" starts left of the viewBox`);

      /* Occlusion: only a rect LATER in document order can hide this label, and only a filled
         one — an outline-only box is drawn over text all the time and hides nothing. */
      for (let j = i + 1; j < nodes.length; j += 1) {
        const rect = nodes[j];
        if (rect.tagName !== 'rect') continue;
        const fill = getComputedStyle(rect).fill;
        if (fill === 'none' || fill === 'rgba(0, 0, 0, 0)' || fill === 'transparent') continue;
        let rb;
        try { rb = rect.getBBox(); } catch { continue; }
        const ox = Math.min(bb.x + bb.width, rb.x + rb.width) - Math.max(bb.x, rb.x);
        const oy = Math.min(bb.y + bb.height, rb.y + rb.height) - Math.max(bb.y, rb.y);
        if (ox > 1.5 && oy > 0.4 * bb.height) {
          findings.push(`OCCLUDED ${id}: "${text}" is painted under a later filled rect `
            + `(${ox.toFixed(0)}x${oy.toFixed(0)})`);
        }
      }
    }

    /* Label-on-label. The threshold is a FRACTION of the smaller label's height, not an absolute:
       a deliberate two-line caption inside one box overlaps by a few units of glyph-box padding at
       13-unit line spacing, and an absolute threshold calls every one of those a collision. */
    for (let a = 0; a < labels.length; a += 1) {
      for (let b = a + 1; b < labels.length; b += 1) {
        const p = labels[a].bb;
        const q = labels[b].bb;
        const ox = Math.min(p.x + p.width, q.x + q.width) - Math.max(p.x, q.x);
        const oy = Math.min(p.y + p.height, q.y + q.height) - Math.max(p.y, q.y);
        if (ox > 1.5 && oy > 0.55 * Math.min(p.height, q.height)) {
          findings.push(`OVERLAP  ${id}: "${labels[a].text}" overlaps "${labels[b].text}" `
            + `by ${ox.toFixed(0)}x${oy.toFixed(0)}`);
        }
      }
    }
  }
  return { findings, texts, figures };
}

const { default: puppeteer } = await import(pathToFileURL(PUPPETEER).href);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const started = Date.now();
let total = 0;
let labels = 0;
try {
  for (const name of names) {
    const file = join(INTERACTIVE, name, 'index.html');
    if (!existsSync(file)) {
      process.stderr.write(`ERROR: no index.html for ${name} at ${file}\n`);
      process.exit(2);
    }
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    const { findings, texts, figures } = await page.evaluate(inspect);
    /* The probe must assert its own precondition: zero figures and zero findings is what reading
       the wrong file looks like, and it is indistinguishable from a clean page. */
    if (!figures || !texts) {
      process.stderr.write(`ERROR: ${name} rendered ${figures} svg.fig and ${texts} labels — `
        + 'the page loaded but carries no hand-authored figure, so this run measured nothing.\n');
      process.exit(2);
    }
    labels += texts;
    total += findings.length;
    process.stdout.write(`  ${name.padEnd(23)} ${String(figures)} figure(s), `
      + `${String(texts).padStart(3)} labels — ${findings.length || 'no'} finding(s)\n`);
    for (const f of findings) process.stdout.write(`      ${f}\n`);
    await page.close();
  }
} finally {
  await browser.close();
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
process.stdout.write(`\nfigure-geometry result: ${labels} labels checked across ${names.length} `
  + `exercise(s), ${total} finding(s) in ${seconds}s\n`);
process.exit(total ? 1 : 0);
