// check_console.mjs — deploy-blocking "no console errors on ANY served page" gate.
//
// WHY this exists: a JS error on a served page (an uncaught exception, a "foo is not defined" from a
// script-ordering race, a failed fetch logged as console.error) is invisible to the stdlib HTML gates
// (`catalog.py validate`) and to axe/html-validate — those check STRUCTURE, not RUNTIME. This gate makes
// "the site's JavaScript runs clean" mechanical and deploy-blocking: load EVERY served HTML page in
// headless Chrome and assert it produces NO `pageerror` (uncaught exception / unhandled rejection) and NO
// `console` message of type `error`. The canonical motivating bug: the landing's workflow-figure iframe
// fired `onload="fitFig(this)"` before the later inline <script> defined fitFig on a fast/cached load →
// "fitFig is not defined". A regression that re-introduces any such error fails the deploy here.
//
// Like check_responsive.mjs / the PDF gates, this is a non-stdlib deploy-time check that needs a browser,
// so it lives here in book/ and reuses the same Puppeteer + bundled Chromium dep. It is driven by
// `python3 catalog.py check-console`, which enumerates the served pages (the same site-walk axe uses) and
// passes their absolute paths as argv. Exit 0 = PASS (no page produced an error); exit non-zero = FAIL
// (prints every (page, error) pair). Chrome comes from Puppeteer's bundled Chromium unless
// PUPPETEER_EXECUTABLE_PATH / CHROME_PATH overrides it.

import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer";

const pages = process.argv.slice(2);
if (pages.length === 0) {
  console.error("usage: node check_console.mjs <abs-path-to-page.html> [<page.html> ...]");
  process.exit(2);
}
for (const p of pages) {
  if (!existsSync(p)) {
    console.error(`ERROR: page not found at ${p} — run \`python3 catalog.py build\` first`);
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

// Each entry: { page, kind, text } where kind is "pageerror" | "console.error".
const findings = [];

try {
  for (const abs of pages) {
    const page = await browser.newPage();
    const pageErrs = [];
    // Uncaught exceptions + unhandled promise rejections on the page (this is where "fitFig is not
    // defined" surfaces — an iframe onload firing before its handler is defined throws here).
    page.on("pageerror", (e) => pageErrs.push({ kind: "pageerror", text: e.message }));
    // console.error(...) calls. type()==="error" is exactly the red-console class; warnings/logs are
    // deliberately NOT failed (they're not errors). location() gives the source file:line when present.
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const loc = msg.location && msg.location();
      const where = loc && loc.url ? ` (${loc.url}:${loc.lineNumber ?? "?"})` : "";
      pageErrs.push({ kind: "console.error", text: msg.text() + where });
    });
    // A failed subresource request (404 script/img, blocked fetch) is a runtime defect too; Chrome does
    // NOT always mirror it into console.error, so capture it explicitly.
    page.on("requestfailed", (req) => {
      const f = req.failure();
      // networkidle abort of the last idle poke is not a page defect; only report real load failures.
      if (f && f.errorText && f.errorText !== "net::ERR_ABORTED") {
        pageErrs.push({ kind: "requestfailed", text: `${req.url()} — ${f.errorText}` });
      }
    });

    try {
      // `load`, not `networkidle0`: these are static file:// pages with no post-load network
      // activity, so networkidle0 spent its mandatory 500ms quiet period per page waiting for
      // silence that was already total. Measured 261030 over 12 pages: 15.3s -> 1.87s wall
      // (1.28 -> 0.16 s/page), identical verdicts. The double-rAF below still catches
      // onload/rAF-deferred errors, which is what the wait was actually protecting.
      await page.goto(pathToFileURL(abs).href, { waitUntil: "load", timeout: 60000 });
      // Give any onload / rAF-scheduled script (e.g. fitFig on the landing) a couple frames to run and
      // throw, so a deferred error is captured before we move on.
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      );
    } catch (e) {
      pageErrs.push({ kind: "navigation", text: String(e && e.message ? e.message : e) });
    }
    for (const err of pageErrs) findings.push({ page: abs, ...err });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`Console-error gate — loaded ${pages.length} served page(s) in headless Chrome.`);
if (findings.length === 0) {
  console.log(`PASS: no page produced a pageerror or console.error — the served site's JavaScript runs clean.`);
  process.exit(0);
}

console.error(`FAIL: ${findings.length} console error(s) across ${new Set(findings.map((f) => f.page)).size} page(s):`);
for (const f of findings) {
  console.error(`  [${f.kind}] ${f.page}\n      ${f.text}`);
}
process.exit(1);
