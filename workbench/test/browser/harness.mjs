// Fixture for the browser tier: serve the shipped page, drive it in headless Chromium, record
// everything the page did wrong while we were watching.
//
// Three decisions worth stating.
//
// Puppeteer is RESOLVED, not depended on. It lives in book/node_modules, installed by the Pages
// workflow for the existing served-page smoke gates. workbench/node_modules is a symlink shared
// across parallel agent worktrees, so `npm install puppeteer` here would silently mutate other
// agents' trees. createRequire anchored at book/ reaches the existing copy and adds nothing to
// workbench/package.json.
//
// The served root is workbench/, NOT workbench/dist/. dist/ holds bundles only; index.html loads
// `./dist/workbench.js`, so a copy of the page inside dist/ would resolve that to
// dist/dist/workbench.js and could never work. Serving dist/ would test a page nobody ships.
//
// This file is .mjs, not .ts. tsconfig includes `test`, but it would have to typecheck a Puppeteer
// that is not in this package's dependency graph. Plain ESM keeps the browser tier out of the tsc
// gate while the node tier stays typed.
//
// Running it locally: `npm run build` in workbench/, `npm ci` in book/ (once — it fetches the
// bundled Chromium), then `npm run test:browser`. CI does exactly those three things in that order.
// The build step is CHECKED rather than merely stated: `startServer` refuses to serve a bundle that
// was not built from this tree, because this tier reads its registries from source and a stale
// bundle reports itself as a defect in the page. See `assertBundleBuiltFromThisTree`.
//
// The FR-A11Y tier in test/browser/a11y/ shares this fixture and runs as `npm run test:a11y`. It
// additionally needs `npm ci` at the REPO ROOT, where axe-core is pinned -- resolved there, like
// Puppeteer from book/, rather than added to this package.
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, normalize, extname } from "node:path";

const HERE = import.meta.dirname;
export const WORKBENCH_DIR = join(HERE, "..", "..");
export const REPO_ROOT = join(WORKBENCH_DIR, "..");

/**
 * 8137 and 8139 are taken on the author's dev machine by other long-running servers, so this tier
 * claims 8143 and the suite fails loud if it is occupied rather than quietly testing whatever else
 * is listening there.
 */
export const PORT = 8143;
export const ORIGIN = `http://127.0.0.1:${PORT}`;

/**
 * `node --test` runs test FILES in parallel, so every suite that calls `startServer` needs its own
 * port or the second one binds a busy socket. The per-tier constants that used to answer that
 * (8144 for axe, 8145 for keyboard, 8146 for smoke) are gone -- see `startServerOnFreePort` for
 * what they could not do and what replaced them. 8143 remains only as `PORT` above, for the one
 * suite still on the default.
 */
export const originFor = (port) => `http://127.0.0.1:${port}`;

/**
 * A server on a port the OS chose, and the origin that reaches it.
 *
 * Use this, not a hard-coded port. Distinct constants per tier solve collisions between FILES in
 * one process and do nothing about collisions between PROCESSES, which is the normal state in this
 * repo: several agents and the orchestrator can each be running a browser tier at the same moment.
 *
 * And the failure mode is not merely a noisy red. Measured 261002 on `main`: a concurrent run
 * reported **8 passing, 0 failing** for `npm run test:a11y`, when the keyboard file alone declares
 * 22 tests; a re-run surfaced `EADDRINUSE 127.0.0.1:8145`. A `before` that dies on the bind can
 * take its whole file's tests out of the count while the runner still prints success, so the
 * collision reads as a GREEN GATE THAT MEASURED LESS. A false red costs an hour. That nearly
 * shipped.
 *
 * Port 0 asks the kernel for a free port, so concurrent runs cannot contend at all. Anything that
 * needs the address reads it from the returned origin rather than from a constant.
 */
export async function startServerOnFreePort(root = WORKBENCH_DIR) {
  const server = await startServer(root, 0);
  return { server, origin: originFor(server.address().port) };
}

const MIME = new Map(Object.entries({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
}));

/**
 * Refuse to serve a bundle that was not built from this tree.
 *
 * **The failure this closes.** Every suite in this tier compares the page against something it
 * imported from TypeScript SOURCE — the capability registry, the model-type registry, the example
 * catalogue — while the page itself runs `dist/workbench.js`. When the bundle lags the source, the
 * gate reports the gap as a defect in the PRODUCT, in the product's own vocabulary. On 261002 a
 * bundle one wave old made UX-I1 announce "2 unregistered button(s): #ask-submit: Ask |
 * #ask-track-go: Track" and "2 declared human affordance site(s) bound to nothing" — about a page
 * whose source stamps both from the registry, correctly, on every paint. The source was right, the
 * gate was red, and the message named two element ids and a module to go and edit. A false RED that
 * is specific costs more than a vague one, because the obvious fix for it is to write a real defect
 * into a correct module.
 *
 * The ordering that prevents it — build, then serve — was already written down in this file's own
 * header and in three CI steps. Written down is not enforced, and the one reader who most needs it
 * is an agent that opened a fresh worktree where `dist/` is gitignored and absent.
 *
 * **Why it lives in `startServer`.** Three tiers drive this fixture (browser, FR-A11Y, smoke) and
 * all three reach the page through this function, so one check here covers every present and future
 * suite. Per-suite `test -f` guards are the alternative, and CI already has three of them: they
 * catch an ABSENT bundle and say nothing about a stale one.
 *
 * **Content, not mtime.** `git worktree add`, a branch switch and a checkout all rewrite source
 * mtimes without changing a byte. An mtime comparison would therefore manufacture the same false
 * RED this check exists to kill, which is a poor trade for two lines saved.
 */
async function assertBundleBuiltFromThisTree(root) {
  const manifestPath = join(root, "dist", "build-manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`${manifestPath} is missing — run \`npm run build\` in workbench/ before the browser `
      + "tier. Serving an absent or stale bundle makes this tier report source-vs-bundle drift as a "
      + "defect in the page.");
  }
  const { inputs } = JSON.parse(await readFile(manifestPath, "utf8"));
  for (const [path, expected] of Object.entries(inputs)) {
    // A deleted input and a changed one are the same finding: the bundle no longer corresponds to
    // the tree. Reading rather than stat-ing, because the hash is the whole claim.
    const actual = await readFile(join(root, path))
      .then((body) => createHash("sha256").update(body).digest("hex").slice(0, 16), () => null);
    if (actual === expected) continue;
    throw new Error(`the served bundle is stale: ${path} ${actual === null ? "no longer exists" : "has changed"} `
      + "since `npm run build` last ran. Rebuild in workbench/ and re-run. (This tier imports the "
      + "registries from source and drives a page running dist/workbench.js, so a stale bundle "
      + "reports itself as a product defect — see this function's note.)");
  }
}

/**
 * Static file server over one directory. It must return a real 404 for a missing path: the 404
 * assertion in the suite is only meaningful if the server reports absence instead of papering over
 * it with an index.html fallback, which is what every SPA dev server does by default.
 */
export async function startServer(root = WORKBENCH_DIR, port = PORT) {
  await assertBundleBuiltFromThisTree(root);
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", ORIGIN);
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    const path = join(root, rel === "/" ? "index.html" : rel);
    // Path traversal would let a test read outside the served tree and pass on a file the deploy
    // does not publish.
    if (!path.startsWith(root)) { res.writeHead(403).end("forbidden"); return; }
    readFile(path).then(
      (body) => res.writeHead(200, { "content-type": MIME.get(extname(path)) ?? "application/octet-stream" }).end(body),
      () => res.writeHead(404, { "content-type": "text/plain" }).end("not found"),
    );
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
}

export async function stopServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

/** Puppeteer from book/node_modules. See the header: resolved, never installed here. */
export function loadPuppeteer() {
  const require = createRequire(join(REPO_ROOT, "book", "package.json"));
  return require("puppeteer");
}

/**
 * Launch headless Chromium, discovering the browser before asking Puppeteer to.
 *
 * Puppeteer launches ITS OWN pinned Chromium, downloaded by `npm ci` in book/ — there is no
 * system-Chrome hunt here because a system Chrome would float while the pin holds still. What CAN
 * go wrong is the download never having happened (a fresh worktree, a skipped postinstall), and
 * `launch()` then fails with a cache path that reads like corruption. Resolving the executable
 * first turns that into the one sentence that says what to run.
 */
export async function launchBrowser() {
  const puppeteer = loadPuppeteer();
  const executable = puppeteer.executablePath();
  if (!existsSync(executable)) {
    throw new Error(`Chromium is not installed at ${executable} — run \`npm ci\` in book/ `
      + "(its postinstall downloads the pinned browser).");
  }
  return puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
}

/**
 * Close the browser and the server with a hard floor under the close.
 *
 * A wedged renderer can hang `browser.close()` forever, and a hung after-hook leaks the whole
 * Chromium process group plus its temp profile — the standard failure of this kind of suite, and
 * one that then holds the suite's port against every later run. So the close races a SIGKILL of
 * the browser process: on the normal path Puppeteer also removes its temp `--user-data-dir`; on
 * the kill path the leak is bounded to one profile dir in the OS tmpdir rather than a live
 * process. Both arguments are optional so a `before` that failed halfway cleans up whatever it
 * actually made.
 */
export async function shutdown({ browser, server } = {}) {
  if (browser) {
    const killTimer = setTimeout(() => {
      try { browser.process()?.kill("SIGKILL"); } catch { /* already exited — nothing to kill */ }
    }, 5_000);
    killTimer.unref();
    await browser.close().catch(() => {
      try { browser.process()?.kill("SIGKILL"); } catch { /* already exited — nothing to kill */ }
    });
    clearTimeout(killTimer);
  }
  if (server) await stopServer(server);
}

/**
 * Fast-forward the page's timer clock by `budgetMs` of VIRTUAL time, deterministically.
 *
 * This is Chrome's `--virtual-time-budget` reached through CDP: every pending `setTimeout` /
 * debounce inside the budget fires in order, immediately, and the call returns when the budget is
 * spent. A wall-clock sleep of the same length is both slower and weaker — it waits real seconds
 * and still only GUESSES that the timer landed inside them, where the budget is a guarantee.
 *
 * The cost to know before using it: when the budget expires the page's task clock is PAUSED.
 * Timers scheduled afterwards do not fire until the next grant, so this belongs only on a page
 * whose every later wait is also a grant (the FR-A11Y-3 agent page is the model: act, grant,
 * assert, repeat). Granting on a page that other suites will drive with real-time waits would
 * freeze exactly the timers they wait on.
 */
export async function advanceVirtualTime(page, budgetMs) {
  const client = await page.createCDPSession();
  try {
    const expired = new Promise((resolve) => client.once("Emulation.virtualTimeBudgetExpired", resolve));
    await client.send("Emulation.setVirtualTimePolicy", { policy: "advance", budget: budgetMs });
    await expired;
  } finally {
    await client.detach().catch(() => { /* session already gone with the page */ });
  }
}

/**
 * Open any served page and attach the diagnostic recorders BEFORE navigation, so a pageerror
 * thrown during module evaluation is still caught. Recording from page creation onward also means
 * the console assertion covers everything the suite does to the page, not just its first paint.
 *
 * Page-agnostic on purpose: the workbench serves more than one page now, and a per-page opener
 * would re-type these four listeners for each — the smoke tier walks EVERY served page through
 * this one function. Readiness is the caller's: each page marks module-evaluation completion its
 * own way (`window.mage` on index, `window.mageLearn` on Learn), and `networkidle0` implies
 * neither.
 */
export async function openServedPage(browser, pathname, origin = ORIGIN) {
  const page = await browser.newPage();
  const diagnostics = { pageErrors: [], consoleErrors: [], notFound: [], requestFailures: [] };

  page.on("pageerror", (e) => diagnostics.pageErrors.push(String(e).slice(0, 400)));
  page.on("console", (m) => { if (m.type() === "error") diagnostics.consoleErrors.push(m.text().slice(0, 400)); });
  page.on("response", (r) => { if (r.status() === 404) diagnostics.notFound.push(new URL(r.url()).pathname); });
  page.on("requestfailed", (r) => diagnostics.requestFailures.push(`${new URL(r.url()).pathname}: ${r.failure()?.errorText}`));

  await page.goto(`${origin}/${pathname}`, { waitUntil: "networkidle0", timeout: 60_000 });
  return { page, diagnostics };
}

/** The workbench page, settled: `window.mage` is installed at the end of module evaluation. */
export async function openWorkbench(browser, origin = ORIGIN) {
  const { page, diagnostics } = await openServedPage(browser, "index.html", origin);
  await page.waitForFunction(() => typeof window.mage === "object", { timeout: 30_000 });
  return { page, diagnostics };
}

/**
 * Load the flagship example through the AGENT path — `window.mage.load` — and wait for the human
 * surface to repaint from it.
 *
 * The wait is on observable DOM, not a sleep: the convergence assertion compares `#summary` against
 * `context()`, and a timer would make that comparison a race that passes on a fast machine. It
 * waits for `#summary` to DIFFER from its pre-load text rather than to contain some expected
 * string, because an expected string would duplicate — and so could mask — the very assertion the
 * convergence test makes.
 */
export async function loadFlagshipExample(page) {
  const yaml = await readFile(join(WORKBENCH_DIR, "examples", "message-bus", "system.mage.yaml"), "utf8");
  const before = await page.evaluate(() => document.getElementById("summary")?.textContent ?? "");
  const context = await page.evaluate((text) => window.mage.load(text), yaml);
  await page.waitForFunction(
    (prior) => (document.getElementById("summary")?.textContent ?? "") !== prior,
    { timeout: 30_000 },
    before,
  );
  return { context, yaml };
}

/**
 * Where the suite drops its receipt. `node --test` over a glob that matches NOTHING exits 0 and
 * reports "pass 0", so a renamed directory or a broken glob would read as a green browser gate that
 * ran no browser. CI hard-asserts this file the way it already hard-asserts the bundle into the
 * artifact: the receipt exists only if the fixture actually booted a browser and loaded the page,
 * and it carries the values measured in that run so the CI log publishes them.
 *
 * It is written outside the repo by default — the suite must not create untracked files in a tree
 * four other agents are committing from.
 */
export const RECEIPT_PATH = process.env.WB_BROWSER_RECEIPT ?? join(tmpdir(), "wb-browser-receipt.json");

/**
 * The FR-A11Y tiers get their own receipts for the same reason: each runs in its own file, so each
 * can be the one that silently matched no glob. Their CI step hard-asserts both.
 */
export const AXE_RECEIPT_PATH = process.env.WB_AXE_RECEIPT ?? join(tmpdir(), "wb-axe-receipt.json");
export const KEYBOARD_RECEIPT_PATH =
  process.env.WB_KEYBOARD_RECEIPT ?? join(tmpdir(), "wb-keyboard-receipt.json");
export const SMOKE_RECEIPT_PATH = process.env.WB_SMOKE_RECEIPT ?? join(tmpdir(), "wb-smoke-receipt.json");
/**
 * The declared-path drives (`a11y/paths.test.mjs`), which need their own for a sharper reason than
 * the glob hazard: the suite GENERATES one drive per declared path, so a registry that declared
 * none would produce a file of zero tests and `node --test` would print a green tier. The receipt
 * carries the walked count, and the suite asserts that count against the registry's own.
 */
export const PATHS_RECEIPT_PATH = process.env.WB_PATHS_RECEIPT ?? join(tmpdir(), "wb-paths-receipt.json");

/** Everything the gate measured, in one page round trip, for the receipt. */
export async function measureForReceipt(page) {
  return page.evaluate(() => {
    const d = window.mage.describe();
    const canvas = document.getElementById("canvas");
    const nodes = document.querySelectorAll("button, input, select, textarea");
    return {
      agentApiVersion: d.version,
      operations: d.operations.length,
      affordanceGaps: d.affordanceGaps.length,
      savedQueryOutcomes: Object.fromEntries(
        Object.entries(window.mage.savedQueries()).map(([id, r]) => [id, r.outcome]),
      ),
      counts: window.mage.context().counts,
      systemHash: window.mage.context().hash,
      summaryText: (document.getElementById("summary")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      focusable: document.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"]),a[href]').length,
      unlabelled: [...nodes].filter((e) => !e.textContent.trim() && !e.getAttribute("aria-label")
        && !e.getAttribute("aria-labelledby") && !(e.labels?.length) && !e.id).length,
      canvasAriaHidden: canvas?.getAttribute("aria-hidden") ?? null,
      sectionIds: [...document.querySelectorAll("main > section")].map((s) => s.id),
    };
  });
}

export async function writeReceipt(payload, path = RECEIPT_PATH) {
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return path;
}
