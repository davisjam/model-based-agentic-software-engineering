// Browser regression check for print-sized SVGs, leaking SVG styles, and caption floats.
// Run after the MkDocs build: node book/check_figure_layout.mjs http://127.0.0.1:8766/
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import {readdirSync, readFileSync} from 'node:fs';

// Check actual published pages, excluding legacy redirect stubs. The artifact
// mode lets CI consume the producer's HTML without rebuilding a different tree.
const built = process.argv.includes('--built-artifact');
const directory = new URL(built ? './web/site/' : './web/docs/', import.meta.url);
const extension = built ? '.html' : '.md';
const slugs = process.argv.includes('--all')
  ? readdirSync(directory)
      .filter(name => name.endsWith(extension) && (built ? name !== '404.html' : /^(\d\.|part-|appendix-|colophon|about-the-author)/.test(name)))
      .filter(name => !built || !/http-equiv=["']refresh["']/i.test(readFileSync(new URL(name, directory), 'utf8')))
      .map(name => name.slice(0, -extension.length))
  : ['2.2-constructing-and-using-engineering-models', '2.3-structural'];
assert(slugs.length > 0, 'No book pages selected: refusing an empty layout check.');

const base = process.argv[2];
assert(base, 'Supply the URL of the built book site.');
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage();
  for (const width of [1600, 1100, 390]) {
    await page.setViewport({width, height: 1000});
    for (const slug of slugs) {
      const response = await page.goto(new URL(`${slug}.html`, base).href, {waitUntil: 'networkidle0'});
      assert(response && response.ok(), `Missing book page: ${slug}`);
      assert(await page.$('article'), `Missing article on ${slug}`);
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => {
        const problems = [];
        const rect = e => e.getBoundingClientRect();
        if (document.documentElement.scrollWidth > innerWidth + 1) problems.push('page overflows viewport');
        for (const figure of document.querySelectorAll('figure.book-figure')) {
          const svg = figure.querySelector('svg');
          if (!svg) continue;
          if (rect(svg).width < Math.min(34 * parseFloat(getComputedStyle(document.documentElement).fontSize), rect(figure).width) - 1) problems.push('undersized figure');
          if (rect(svg).width > rect(figure).width + 1) problems.push('figure overflows column');
          const caption = figure.querySelector('figcaption');
          if (caption && rect(caption).width < rect(svg).width - 1) problems.push('narrow caption');
          if (caption && rect(caption).top - rect(svg).bottom > 40) problems.push('caption separates from figure');
          if ([...svg.querySelectorAll('style')].some(s => !s.textContent.includes('@scope'))) problems.push('unscoped inline SVG stylesheet');
        }
        for (const inset of document.querySelectorAll('.concept-inset')) {
          const r = rect(inset), p = rect(inset.parentElement);
          if (Math.abs((r.left + r.right) - (p.left + p.right)) > 2) problems.push('off-center inset');
        }
        for (const table of document.querySelectorAll('table.book-table')) {
          if (!table.caption) continue;
          if (table.tHead && rect(table.tHead).top - rect(table.caption).bottom > 24) problems.push('caption separates from table');
          for (const link of table.caption.querySelectorAll('sup.cite-ref a')) {
            if (!document.querySelector(link.getAttribute('href'))) problems.push('caption reference target missing');
            if (!rect(link).width) problems.push('caption reference hidden');
          }
        }
        // A later diagram has `text {font-size:19px}`. It must retain that style
        // locally without changing the earlier architecture diagram's 10px labels.
        const architecture = document.querySelector('svg[aria-labelledby*="canonical-structural"]');
        if (architecture) {
          const label = [...architecture.querySelectorAll('text')].find(t => t.textContent === 'DATABASE');
          if (getComputedStyle(label).fontSize !== '10px') problems.push('sibling SVG changed label size');
          const box = [...architecture.querySelectorAll('rect')].at(-1);
          if (rect(label).left < rect(box).left || rect(label).right > rect(box).right) problems.push('DATABASE label clipped');
          const composition = document.querySelector('svg[aria-labelledby*="from-nodes-to-composition"]');
          if (!composition || getComputedStyle(composition.querySelector('.edge')).stroke !== 'rgb(34, 34, 34)') problems.push('local SVG style lost');
        }
        return problems;
      });
      assert.deepEqual(result, [], `${slug} at ${width}px: ${result.join(', ')}`);
      console.log(`PASS ${slug} at ${width}px`);
    }
  }
  console.log(`Book layout passed: ${slugs.length} pages × 3 viewport widths = ${slugs.length * 3} checks.`);
} finally {
  await browser.close();
}
