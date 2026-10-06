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
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, normalize, extname } from "node:path";
import { after } from "node:test";
// The hash and the manifest path are DEFINED in scripts/build-manifest.ts, which build.mjs also
// imports. This file used to carry its own copy of the sha256-sliced-to-16 expression; two hash
// implementations that must agree is a parity hazard in the one place a staleness check has to be
// trusted absolutely, and a third consumer was about to copy it again.
import { hashInput, MANIFEST_PATH } from "../../scripts/build-manifest.ts";

const HERE = import.meta.dirname;
export const WORKBENCH_DIR = join(HERE, "..", "..");
export const REPO_ROOT = join(WORKBENCH_DIR, "..");

/**
 * `node --test` runs test FILES in parallel, so every suite that calls `startServer` needs its own
 * port or the second one binds a busy socket. The per-tier constants that used to answer that
 * (8144 for axe, 8145 for keyboard, 8146 for smoke) are gone -- see `startServerOnFreePort` for
 * what they could not do and what replaced them. The last fixed default, 8143, followed on 261006:
 * it solved in-process collisions and created the between-PROCESS one, where two concurrent tier
 * runs (an agent's and the pre-push gate's) raced for the port and the loser cancelled a whole
 * file's tests on EADDRINUSE. There is no default port or origin any more — every suite starts on
 * a kernel-chosen port and passes the origin it was given.
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

/**
 * The leak watchdog: a leaked browser or server must become a BOUNDED, ATTRIBUTED red — never a
 * silent infinite hang.
 *
 * **The failure this closes, measured 261006.** A test file's `after` hook called
 * `shutdown(server, browser)` — positional, where the signature takes one `{ browser, server }`
 * object — so both destructured to `undefined` and the hook was a silent no-op. The leaked
 * listening server and Chromium connection kept the child's event loop alive, the child could
 * never exit, and `node --test` waited on it FOREVER: the whole tier sat at ~0.1 s of CPU for
 * 19m46s inside one agent, wedged the pre-push gate, and finally blocked a publish behind a
 * `--no-verify`. Five incidents in one day, every one reading as "the browser tier hangs" when
 * the defect was one call signature. (`shutdown` now also rejects that misuse loudly — this
 * watchdog is the backstop for the leaks argument-checking cannot see, like a file that forgets
 * its `after` hook entirely.)
 *
 * **How it works, and why it can.** Every browser and server the harness creates registers here;
 * every shutdown path deregisters. The harness registers a root `after` hook at import time, which
 * — because imports hoist — runs BEFORE the test file's own `after`. So this hook cannot clean up
 * (the file's legitimate cleanup has not run yet); instead it timestamps "the file's tests are
 * done" and arms an UNREF'd grace timer. Unref'd, the timer never keeps a healthy process alive —
 * and in a LEAKY process it still fires, because the leaked handles themselves are what hold the
 * event loop open. The defect powers its own alarm. On firing: if everything was released in the
 * grace window (the normal case — the file's `after` ran), do nothing; otherwise print each
 * survivor's creation stack, force-release it (SIGKILL the browser, close the server), and fail
 * the process, so the runner reports a red naming this file instead of waiting on it forever.
 *
 * **The grace period** only has to cover the file's own `after` hook — a `browser.close()` plus a
 * `server.close()`, with `shutdown`'s 5 s kill race already bounding the close. 60 s is two orders
 * above the normal case. It does NOT need to cover test runtime: the timer is not armed until the
 * tests have finished.
 */
const LEAK_GRACE_MS = 60_000;
const OUTSTANDING = new Set();

function trackResource(kind, release) {
  const entry = { kind, createdAt: Date.now(), stack: new Error(`${kind} created here`).stack, release };
  OUTSTANDING.add(entry);
  return entry;
}

// Registered only inside a test-runner child (the runner stamps NODE_TEST_CONTEXT into them).
// In a plain script that imports this harness — the measure-* scripts — a top-level `after()`
// would bootstrap node:test's root harness and append a TAP summary to the script's stdout.
if (process.env.NODE_TEST_CONTEXT) after(() => {
  if (OUTSTANDING.size === 0) return;
  const timer = setTimeout(async () => {
    if (OUTSTANDING.size === 0) return;
    process.exitCode = 1;
    console.error(`[harness leak watchdog] ${OUTSTANDING.size} resource(s) were still live ${LEAK_GRACE_MS}ms `
      + "after this file's tests finished. A leaked browser or server keeps this process from exiting, "
      + "which hangs the WHOLE tier (and the pre-push gate) at zero CPU. Check this file's after hook: "
      + "every launchBrowser/startServer needs a matching shutdown({ browser, server }). "
      + "Force-releasing the survivors and failing this file:");
    for (const entry of OUTSTANDING) {
      console.error(`  - leaked ${entry.kind}, held ${Date.now() - entry.createdAt}ms\n${entry.stack}`);
      OUTSTANDING.delete(entry);
      await entry.release().catch((e) => console.error(`    (force-release failed: ${e})`));
    }
  }, LEAK_GRACE_MS);
  timer.unref();
});

/**
 * Sweep profile directories left by KILLED runs, so leaked state cannot accumulate against future
 * runs — 12 stale `puppeteer_dev_chrome_profile-*` dirs had piled up when the 261006 wedge was
 * first measured, and the recovery procedure had a human typing the `rm`. Only dirs older than a
 * day are touched: a concurrent live run's profile is minutes old, so age is the safety margin.
 * Fire-and-forget on purpose — hygiene must never delay or fail a test run (the one swallow).
 */
const STALE_PROFILE_AGE_MS = 24 * 60 * 60 * 1000;
const PROFILE_PREFIXES = ["puppeteer_dev_chrome_profile-", "wb-browser-", "wb-attach-"];
(async () => {
  const dir = tmpdir();
  const names = await readdir(dir).catch(() => []);
  for (const name of names) {
    if (!PROFILE_PREFIXES.some((p) => name.startsWith(p))) continue;
    const path = join(dir, name);
    const info = await stat(path).catch(() => null);
    if (info === null || Date.now() - info.mtimeMs < STALE_PROFILE_AGE_MS) continue;
    await rm(path, { recursive: true, force: true }).catch(() => { /* another sweeper got it first */ });
  }
})();

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
  const manifestPath = join(root, MANIFEST_PATH);
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
      .then((body) => hashInput(body), () => null);
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
/** Joins a resource to its watchdog entry (and a browser to its profile dir) without widening any API. */
const TRACKING = Symbol("harness-leak-tracking");

export async function startServer(root = WORKBENCH_DIR, port = 0) {
  await assertBundleBuiltFromThisTree(root);
  const server = createServer((req, res) => {
    // The base only anchors relative-URL parsing; the pathname is all that is read from it.
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
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
  server[TRACKING] = trackResource("http server", async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  return server;
}

export async function stopServer(server) {
  if (server?.[TRACKING]) OUTSTANDING.delete(server[TRACKING]);
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
  // An EXPLICIT per-launch profile, not Puppeteer's implicit temp one. Same uniqueness (so
  // concurrent launches cannot contend on a profile singleton lock), but the harness owns the
  // path: Puppeteer removes its implicit dir only on a graceful close, so every kill path —
  // `shutdown`'s SIGKILL race, the leak watchdog, a human's pkill — leaked one. These carry the
  // `wb-browser-` prefix, so the startup sweep can also identify a killed run's leftovers.
  const profile = await mkdtemp(join(tmpdir(), "wb-browser-"));
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"], userDataDir: profile });
  browser[TRACKING] = {
    profile,
    entry: trackResource("browser", async () => {
      try { browser.process()?.kill("SIGKILL"); } catch { /* already exited — nothing to kill */ }
      await rm(profile, { recursive: true, force: true }).catch(() => { /* tmpdir will reap it */ });
    }),
  };
  return browser;
}

/**
 * How long to wait for a spawned browser to publish its debugging port, and how often to look.
 *
 * Measured 261003 on the author's machine: the port file appears in 356 ms under `--headless` and
 * 718 ms under `--headless=new`. The ceiling is two orders above that because a cold start on a
 * loaded CI runner is the case that must not flake, and the only cost of a generous ceiling is how
 * long a genuinely dead browser takes to be reported.
 */
const PORT_FILE_TIMEOUT_MS = 30_000;
const PORT_FILE_POLL_MS = 50;

/** The line Chromium prints when the debugging endpoint is up. The fallback source for the port. */
const DEVTOOLS_LINE = /ws:\/\/127\.0\.0\.1:(\d+)\//;

/**
 * Start a Chromium that NOBODY'S PUPPETEER CLIENT LAUNCHED, and report the debugging URL it chose.
 *
 * **Why this exists beside `launchBrowser`.** FR-AGENT-1 specifies an agent "attached to the user's
 * existing Chromium browser through Chrome DevTools Protocol", and says the CDP transport is the
 * execution environment's responsibility rather than MAGE's. `puppeteer.launch` cannot exercise
 * that: a client that started the browser holds a pipe or an endpoint it was handed, so it never
 * performs the discovery-and-attach an operator's agent performs. Launch-only coverage therefore
 * stays green with `puppeteer.connect` completely broken.
 *
 * So the browser is spawned as an ordinary child process, with the page URL as an argument — the
 * browser opens the tab itself, and every client that later attaches is attaching to a session it
 * did not create.
 *
 * **The port is chosen by the OS, and then READ.** `--remote-debugging-port=0` asks the kernel for
 * a free port, for the reason `startServerOnFreePort` gives at length: a fixed port collides
 * between PROCESSES, which is the normal state here with several agents and the orchestrator each
 * able to run a browser tier, and a bind collision has already produced a green gate that measured
 * less. The actual port comes from the profile's `DevToolsActivePort` file, with Chromium's own
 * "DevTools listening on" line as the fallback — two sources because each has failed to appear in
 * one of the two headless modes on some platform, and neither is worth a flake.
 *
 * The caller owns the returned handle and must pass it to `killSpawnedBrowser`.
 */
export async function spawnDebuggableBrowser(url) {
  const puppeteer = loadPuppeteer();
  const executable = puppeteer.executablePath();
  if (!existsSync(executable)) {
    throw new Error(`Chromium is not installed at ${executable} — run \`npm ci\` in book/ `
      + "(its postinstall downloads the pinned browser).");
  }
  // Its own profile, in the OS tmpdir: the port file lives in the user-data-dir, and a shared
  // profile would also make two concurrent spawns fight over a singleton lock.
  const profile = await mkdtemp(join(tmpdir(), "wb-attach-"));
  const child = spawn(executable, [
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--headless=new",
    "--no-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    url,
  ], { stdio: ["ignore", "pipe", "pipe"] });

  let output = "";
  child.stdout.on("data", (chunk) => { output += String(chunk); });
  child.stderr.on("data", (chunk) => { output += String(chunk); });
  let exited = null;
  child.on("exit", (code, signal) => { exited = `exit ${code ?? "null"} signal ${signal ?? "null"}`; });

  const handle = { child, profile, browserURL: null, port: null, output: () => output };
  handle[TRACKING] = trackResource("spawned browser", () => killSpawnedBrowser(handle));
  const portFile = join(profile, "DevToolsActivePort");
  const deadline = Date.now() + PORT_FILE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const fromFile = await readFile(portFile, "utf8").then(
      (text) => (text.split("\n")[0] ?? "").trim(), () => "");
    const port = /^\d+$/.test(fromFile) ? Number(fromFile) : Number(DEVTOOLS_LINE.exec(output)?.[1] ?? NaN);
    if (Number.isInteger(port) && port > 0) {
      handle.port = port;
      handle.browserURL = `http://127.0.0.1:${port}`;
      return handle;
    }
    if (exited !== null) break;
    await new Promise((resolve) => { setTimeout(resolve, PORT_FILE_POLL_MS); });
  }
  await killSpawnedBrowser(handle);
  throw new Error(`the spawned Chromium published no debugging port within ${PORT_FILE_TIMEOUT_MS}ms`
    + `${exited === null ? "" : ` (the process ended: ${exited})`}. Neither ${portFile} nor the `
    + `browser's own output carried one. Output was: ${output.slice(0, 600) || "(empty)"}`);
}

/**
 * Attach a client to a browser it did not start. One line, and it is the subject under test.
 *
 * Named so the attach tier reads as attaching rather than as a Puppeteer call that happens to take
 * a URL — and so a second caller cannot reach for `connect({ browserWSEndpoint })` instead, which
 * would skip the `/json/version` discovery hop the browser-URL form performs.
 */
export async function connectToBrowser(browserURL) {
  return loadPuppeteer().connect({ browserURL });
}

/**
 * End a spawned browser and remove its profile, on every exit path including a failed `before`.
 *
 * SIGKILL rather than a graceful close, for the reason `shutdown` races a kill timer: this browser
 * has no Puppeteer client that owns its lifetime, a wedged renderer would otherwise outlive the
 * suite, and a leaked Chromium on a shared dev machine with several agents running is a real cost.
 * Every step is independently guarded so one failure cannot strand the next — a profile left in the
 * tmpdir because the kill threw is the bounded version of this failure, not the acceptable one.
 */
export async function killSpawnedBrowser(handle) {
  if (!handle) return;
  if (handle[TRACKING]) OUTSTANDING.delete(handle[TRACKING]);
  try { handle.child.kill("SIGKILL"); } catch { /* already exited — nothing to kill */ }
  await rm(handle.profile, { recursive: true, force: true }).catch(() => { /* tmpdir will reap it */ });
}

/**
 * Close the browser and the server with a hard floor under the close.
 *
 * A wedged renderer can hang `browser.close()` forever, and a hung after-hook leaks the whole
 * Chromium process group plus its temp profile — the standard failure of this kind of suite, and
 * one that then holds the suite's port against every later run. So the close races a SIGKILL of
 * the browser process, and the harness removes the profile dir itself on every path. Both keys
 * are optional so a `before` that failed halfway cleans up whatever it actually made.
 *
 * **The argument is ONE plain object, and that shape is ENFORCED.** On 261006 a file called
 * `shutdown(server, browser)` — positionally — so `{ browser, server }` destructured from an
 * http.Server to `undefined`, the hook cleaned up NOTHING without a sound, and the leaked handles
 * hung the whole tier at zero CPU through five incidents and a blocked publish. JavaScript cannot
 * reject that signature, so this function does: wrong call shapes throw immediately, and the
 * file goes red naming the misuse instead of wedging everything downstream of it.
 */
export async function shutdown(resources = {}, ...extra) {
  if (extra.length > 0 || resources === null || Object.getPrototypeOf(resources) !== Object.prototype) {
    throw new TypeError("shutdown takes ONE plain object: shutdown({ browser, server }). Positional "
      + "arguments silently destructure to undefined, clean up nothing, and hang the whole tier — "
      + "that is the 261006 wedge.");
  }
  const unknown = Object.keys(resources).filter((k) => k !== "browser" && k !== "server");
  if (unknown.length > 0) {
    throw new TypeError(`shutdown: unknown key(s) ${unknown.join(", ")} — it accepts only `
      + "{ browser, server }. A misspelled key is a resource silently not cleaned up.");
  }
  const { browser, server } = resources;
  if (browser) {
    const killTimer = setTimeout(() => {
      try { browser.process()?.kill("SIGKILL"); } catch { /* already exited — nothing to kill */ }
    }, 5_000);
    killTimer.unref();
    await browser.close().catch(() => {
      try { browser.process()?.kill("SIGKILL"); } catch { /* already exited — nothing to kill */ }
    });
    clearTimeout(killTimer);
    const tracking = browser[TRACKING];
    if (tracking) {
      OUTSTANDING.delete(tracking.entry);
      await rm(tracking.profile, { recursive: true, force: true }).catch(() => { /* tmpdir will reap it */ });
    }
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
export async function openServedPage(browser, pathname, origin) {
  if (typeof origin !== "string" || !origin.startsWith("http")) {
    throw new TypeError("openServedPage needs the origin from startServerOnFreePort — there is no "
      + "default port for it to fall back to (a shared default is what two concurrent tier runs "
      + "collide on; see startServerOnFreePort).");
  }
  const page = await browser.newPage();
  const diagnostics = { pageErrors: [], consoleErrors: [], notFound: [], requestFailures: [] };

  page.on("pageerror", (e) => diagnostics.pageErrors.push(String(e).slice(0, 400)));
  page.on("console", (m) => { if (m.type() === "error") diagnostics.consoleErrors.push(m.text().slice(0, 400)); });
  page.on("response", (r) => { if (r.status() === 404) diagnostics.notFound.push(new URL(r.url()).pathname); });
  page.on("requestfailed", (r) => diagnostics.requestFailures.push(`${new URL(r.url()).pathname}: ${r.failure()?.errorText}`));

  // EVERY page this tier opens starts with EMPTY storage.
  //
  // `browser.newPage()` shares one browser and one origin, so `localStorage` persists across pages
  // and across test FILES. Until the workbench stored anything, no test could tell; the session
  // feature made it visible at once -- a file that loaded an example left a session behind, and the
  // next file's "pristine page is Start" assertion restored that model and found the workspace
  // mounted. The assertion was right; the isolation was the lie.
  //
  // `evaluateOnNewDocument` runs BEFORE any page script on every navigation, so the clear happens
  // ahead of the module that would restore a session -- with no second `goto`. A double navigation
  // would work too, and it trips `makes no request that fails at the transport`: superseding the
  // first request aborts it, and the aborted request is a transport failure to the sibling gate.
  await page.evaluateOnNewDocument(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* storage disabled: nothing to clear */ }
  });

  await page.goto(`${origin}/${pathname}`, { waitUntil: "networkidle0", timeout: 60_000 });
  return { page, diagnostics };
}

/** The workbench page, settled: `window.mage` is installed at the end of module evaluation. */
export async function openWorkbench(browser, origin) {
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
/**
 * The flagship example's element counts, as `window.mage.context().counts` reports them.
 *
 * ONE declaration, because two had drifted into two files and a change to the context's shape broke
 * both in the same run — the browser tier and the keyboard tier each carried their own copy of the
 * same nine numbers. A snapshot is the right shape here (an imported system must be THE flagship,
 * not merely a system), but a snapshot in two places is a pair with no join.
 *
 * Deliberately a snapshot and not derived from the system: a test that computed these from the file
 * it just uploaded would assert that the upload round-tripped, which it already knows from the hash.
 * What this pins is identity — these numbers are message-bus and nothing else is.
 */
export const FLAGSHIP_COUNTS = Object.freeze({
  entities: 11,
  models: 3,
  machines: 0,
  instances: 0,
  relations: 18,
  events: 0,
  // Zero, and the zeros carry a fact: message-bus declares no quantities, so a reader of this
  // context can tell "no resource budget here" from "the context does not report budgets".
  quantities: 0,
  quantitativeModels: 0,
  savedQueries: 7,
});

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
/**
 * The CDP attach tier and the agent-coverage gate, each with the same glob hazard and one sharper
 * one: the coverage gate's whole output is three numbers — operations described, operations driven,
 * operations exempted — and a gate that reports coverage it does not have is worse than no gate. The
 * receipt carries those numbers out of the process so the CI log publishes what was measured
 * instead of only that nothing failed.
 */
export const ATTACH_RECEIPT_PATH = process.env.WB_ATTACH_RECEIPT ?? join(tmpdir(), "wb-attach-receipt.json");
export const AGENT_COVERAGE_RECEIPT_PATH =
  process.env.WB_AGENT_COVERAGE_RECEIPT ?? join(tmpdir(), "wb-agent-coverage-receipt.json");

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
