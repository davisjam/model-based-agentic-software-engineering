// check_math_flow.mjs — deploy-blocking "math stays in the text flow" gate for the handbook web edition.
//
// WHY this exists: Pandoc tags every math node `class="math inline"` / `class="math display"`, and the
// bare tokens collide with theme utility classes — MkDocs Material ships `.md-typeset .inline`
// (`float: left; width: 11.7rem`, its inline-admonition float), which captured every inline-math span
// and shattered the paragraph: each formula sat on the left margin in a fixed-width box with the prose
// wrapping around it. No static check of OUR files can see an upstream stylesheet's selector land, so
// this gate asserts the CASCADE OUTCOME in a real browser: for every math span on every math-bearing
// page, the computed style must keep inline math inline and unfloated, and display math block. The
// static half of the contract (every emitted math class pins `display` + `float`) lives in
// handbook/scripts/lint.py::check_math_flow_contract.
//
// Like check_responsive.mjs / check_console.mjs, this is a non-stdlib deploy-time check that needs a
// browser, so it lives here in book/ and reuses the same Puppeteer + bundled Chromium dep. It is driven
// by `handbook/scripts/build.py web` (post-mkdocs), which enumerates the built pages that contain math
// markup and passes their absolute paths as argv. Exit 0 = PASS; exit 1 = FAIL (prints every offending
// span's computed display/float); exit 2 = usage/contract error. Chrome comes from Puppeteer's bundled
// Chromium unless PUPPETEER_EXECUTABLE_PATH / CHROME_PATH overrides it.

import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer";

const pages = process.argv.slice(2);
if (pages.length === 0) {
  console.error("usage: node check_math_flow.mjs <abs-path-to-math-page.html> [<page.html> ...]");
  process.exit(2);
}
for (const p of pages) {
  if (!existsSync(p)) {
    console.error(`ERROR: page not found at ${p} — run \`python3 handbook/scripts/build.py web\` first`);
    process.exit(2);
  }
}

const executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || undefined;

const browser = await puppeteer.launch({
  headless: "new",
  executablePath,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

// Each entry: { page, text, cls, display, float, why }.
const findings = [];
let spansChecked = 0;

try {
  for (const abs of pages) {
    const page = await browser.newPage();
    // Desktop width: the float capture reproduces at any width, but assert at a size where the
    // paragraph genuinely wraps so the geometry is the reader's.
    await page.setViewport({ width: 1400, height: 1000 });
    await page.goto(pathToFileURL(abs).href, { waitUntil: "networkidle0", timeout: 60000 });
    const results = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("span.math")) {
        const cs = getComputedStyle(el);
        const isDisplay = el.classList.contains("display");
        const bad = [];
        if (cs.float !== "none") bad.push(`float: ${cs.float} (must be none)`);
        if (isDisplay) {
          if (cs.display !== "block") bad.push(`display: ${cs.display} (display math must be block)`);
        } else if (!cs.display.startsWith("inline")) {
          // Floats blockify: a captured span computes display:block even though no rule set it.
          bad.push(`display: ${cs.display} (inline math must stay inline)`);
        }
        out.push({
          text: (el.textContent || "").slice(0, 40),
          cls: el.className,
          display: cs.display,
          float: cs.float,
          why: bad.join("; "),
        });
      }
      return out;
    });
    // Arg contract: the driver only passes math-bearing pages — zero spans here means the page
    // enumeration and the DOM disagree (markup shape drifted), which must fail loudly, not skip.
    if (results.length === 0) {
      findings.push({
        page: abs, text: "", cls: "", display: "", float: "",
        why: "page was passed as math-bearing but contains no span.math — markup shape drifted?",
      });
    }
    spansChecked += results.length;
    for (const r of results) if (r.why) findings.push({ page: abs, ...r });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(
  `Math-flow gate — checked ${spansChecked} math span(s) across ${pages.length} page(s) in headless Chrome.`);
if (findings.length === 0) {
  console.log("PASS: every inline math span computes inline+unfloated and every display span block — math stays in the text flow.");
  process.exit(0);
}

console.error(`FAIL: ${findings.length} math span(s) out of the text flow:`);
for (const f of findings) {
  console.error(`  ${f.page}\n      [${f.cls}] "${f.text}" — ${f.why}`);
}
process.exit(1);
