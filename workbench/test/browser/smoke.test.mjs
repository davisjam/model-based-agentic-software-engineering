// The served-page smoke tier — the browser gate `npm run all` actually runs.
//
// It exists because of a measured incident: the shell restructure landed with `npm run all` green
// and the a11y tier red, because `all` ran no browser at all. The full tiers are too slow to run
// on every check (test:browser ~10s, test:a11y ~36s, measured 261002), so this file is the fast
// rung: one browser, every served page, the cheapest assertions that catch a page which boots
// broken. The deep tiers keep everything judgment-shaped — axe, contrast, the keyboard drives.
//
// BUDGET: 8 seconds wall-clock for the whole file, stated here so a slower future run is a
// regression with a number and not a shrug. Measured at authoring time: 6.1s (runner boot +
// registry imports + launch ~3s, then ~1s per page). The budget is held by review-against-the-receipt rather than a
// runtime assert — a wall-clock assert flakes on a loaded machine, and a flaky gate gets deleted,
// which is how the incident above happened to the slow tiers.
//
// The shape of every page's gate is the served-page smoke POST-CONDITION (the pattern is
// DocAble's): a page registers here when it starts being served, and its gate asserts both
// directions —
//   (a) NO fallback string appears: the page's own failure sentences, a closed tuple per page
//       that only ever GROWS (shrinking it un-guards a failure path somebody shipped);
//   (b) at least one expected content SHAPE is present, derived from the same substrate the page
//       renders from, so an empty-but-polite page cannot pass.
// SERVED_PAGES is itself post-condition-checked: the suite readdirs the served root, so a third
// .html lands red until it registers a gate — nobody has to remember this file exists.
import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { readdir } from "node:fs/promises";

import {
  WORKBENCH_DIR, startServerOnFreePort, launchBrowser, shutdown, openServedPage,
  writeReceipt, SMOKE_RECEIPT_PATH,
} from "./harness.mjs";

// The registries the pages render from, imported from source (Node strips the types). The point
// of reaching for them instead of literals: a card list compared against a hardcoded array passes
// while the registry drifts, and a drifting gallery is exactly what UX-I9 forbids.
import { SHIPPED_EXAMPLE_IDS } from "../../src/app/examples.ts";
import { MODEL_TYPES } from "../../src/engine/model-types.ts";
import { LEARN_PAGE, MODEL_TYPE_USES, anchorForType, anchorForUse } from "../../src/app/learn.ts";
import { GUIDE_ANCHORS } from "../../src/learn/workbench-guide.ts";

/**
 * The OS picks the port. Claiming 8146 only avoided the other tiers IN THIS PROCESS; it did
 * nothing about a second agent running the same tier, and a lost bind can leave a run reporting
 * fewer tests and zero failures -- see `startServerOnFreePort`.
 */
let ORIGIN;

/**
 * Every page the workbench serves, with its closed fallback-string tuple. The strings are the
 * pages' OWN failure sentences (quoted from the modules that emit them), not generic error text:
 * a gate greping for "error" matches a page that legitimately discusses errors.
 */
const SERVED_PAGES = [
  {
    path: "index.html",
    fallbacks: [
      // start.ts: the example menu's describeAll() catch — a pristine page showing this has no
      // working way in except a local file.
      "The shipped examples could not be read",
      // start.ts: a single example's load/fetch catch.
      "could not be read:",
    ],
  },
  {
    path: "learn.html",
    fallbacks: [
      // learn/main.ts boot().catch — the page's one catch-all.
      "The Learn page failed to build",
    ],
  },
];

let server;
let browser;
const measured = { pages: {} };
const startedAt = Date.now();

before(async () => {
  ({ server, origin: ORIGIN } = await startServerOnFreePort(WORKBENCH_DIR));
  browser = await launchBrowser();
}, { timeout: 60_000 });

after(async () => {
  measured.totalMs = Date.now() - startedAt;
  const path = await writeReceipt({ origin: ORIGIN, ranAt: new Date().toISOString(), ...measured },
    SMOKE_RECEIPT_PATH);
  console.log(`smoke receipt: ${path}`);
  await shutdown({ browser, server });
});

test("every .html at the served root has a registered smoke gate", async () => {
  // The post-condition on the register itself. A page served tomorrow fails TODAY's suite until
  // it brings a fallback tuple and a shape assertion — the alternative is a gate that quietly
  // covers a shrinking fraction of what ships.
  const served = (await readdir(WORKBENCH_DIR)).filter((f) => f.endsWith(".html")).sort();
  assert.deepEqual(served, SERVED_PAGES.map((p) => p.path).sort(),
    "a served page has no registered smoke gate (or a registered page is no longer served)");
});

/** Open a page, settle it on its own readiness mark, and run the shared post-condition. */
async function smokePage(pageDef, readyWhen) {
  const t0 = Date.now();
  const { page, diagnostics } = await openServedPage(browser, pageDef.path, ORIGIN);

  // Readiness raced against the page's own crash. A module that throws at top level never sets
  // its ready mark, so waiting on the mark alone turns "broken bundle" into a 30s timeout whose
  // message names the wrong thing (verified by sabotaging dist/learn.js: red, but slow and mute).
  // The pageerror recorder already holds the real story; poll it and lose the race on purpose.
  let settled = false;
  const ready = page.waitForFunction(readyWhen, { timeout: 30_000 })
    .finally(() => { settled = true; });
  const crashed = (async () => {
    while (!settled && diagnostics.pageErrors.length === 0) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return diagnostics.pageErrors.length > 0;
  })();
  const sawCrash = await Promise.race([ready.then(() => false), crashed]);
  ready.catch(() => { /* raced out by the crash branch — reported just below */ });
  assert.ok(!sawCrash,
    `${pageDef.path} threw during evaluation and never settled: ${diagnostics.pageErrors.join("; ")}`);
  await ready;

  // (a) the closed fallback tuple, against the whole rendered text.
  const text = await page.evaluate(() => document.body.innerText);
  const present = pageDef.fallbacks.filter((s) => text.includes(s));
  assert.deepEqual(present, [],
    `${pageDef.path} rendered its own failure sentence(s): ${present.join("; ")}`);

  // The recorders: a page that paints politely while its console burns is still broken.
  assert.deepEqual(diagnostics.pageErrors, [], `${pageDef.path} threw during evaluation`);
  assert.deepEqual(diagnostics.consoleErrors, [], `${pageDef.path} logged console errors`);
  assert.deepEqual(diagnostics.notFound, [], `${pageDef.path} requested something the deploy does not serve`);
  assert.deepEqual(diagnostics.requestFailures, [], `${pageDef.path} had failing requests`);

  measured.pages[pageDef.path] = { settledMs: Date.now() - t0 };
  return page;
}

test("index.html: boots, and the example menu is the shipped registry", async () => {
  const page = await smokePage(SERVED_PAGES[0],
    // window.mage marks module evaluation; a populated menu (or its painted failure, which the
    // fallback tuple then catches) marks the async example fetch. Both are condition waits — the
    // page says when it is settled, the suite never guesses with a sleep.
    () => typeof window.mage === "object"
      && (document.querySelectorAll("#example-choice option").length > 0
        || document.querySelector("#example-description .caveat") !== null));

  // (b) the content shape, derived: the menu's option VALUES are the shipped-example ids, from
  // the same `SHIPPED_EXAMPLE_IDS` the loader gates on. Order is part of the claim — the page
  // fills the menu from the registry in registry order.
  const options = await page.evaluate(() =>
    [...document.querySelectorAll("#example-choice option")].map((o) => o.value));
  assert.deepEqual(options, [...SHIPPED_EXAMPLE_IDS],
    "the example menu does not offer exactly the shipped examples");

  // And the persistent Learn entry, on the PRISTINE page this gate already has open.
  //
  // THE CHEAP RUNG under `test/browser/learn-reachable.test.mjs`, and the reason it is duplicated
  // here rather than left to that file: the deep tier is declared out of `npm run all`, so the
  // requirement that was dropped once would have been protected only by a gate CI runs and an agent
  // does not. Three assertions and no extra page — present, rendered, and pointing at the page the
  // registry says Learn lives on. The keyboard walk, the navigation and the model-less state stay in
  // the deep tier, where the budget for them is.
  const learn = await page.evaluate((id, learnPage) => {
    const a = document.getElementById(id);
    return a === null ? null : {
      visible: a.checkVisibility(),
      href: a.getAttribute("href"),
      inBanner: a.closest("header[role=banner]") !== null,
      resolves: a.href === new URL(learnPage, document.baseURI).href,
    };
  }, "learn", LEARN_PAGE);
  assert.notEqual(learn, null,
    'index.html ships no #learn. requirements-learn-261002.md: "The global header SHALL contain a '
    + 'persistent Learn entry" — and the empty state is when a reader most needs it.');
  assert.deepEqual(learn, { visible: true, href: LEARN_PAGE, inBanner: true, resolves: true },
    "the persistent Learn entry is not a rendered banner link to the served Learn page");

  await page.close();
});

test("learn.html: boots, and the gallery is the model-type registry", async () => {
  const page = await smokePage(SERVED_PAGES[1],
    // `window.mageLearn.ready` is the mark learn/main.ts installs for exactly this wait; the
    // `.refusal` alternative settles a BROKEN build fast so the fallback assertion reports it
    // instead of a 30s timeout.
    () => window.mageLearn?.ready === true
      || document.querySelector("#learn-main .refusal") !== null);

  // (b) the content shape, derived both ways (UX-I9): every registered model type and declared
  // use has its section AND its gallery card, at the anchor spelling the producers share — and
  // nothing else does, so a card for an unregistered "type" is as red as a missing one.
  const galleryAnchors = [
    ...MODEL_TYPES.map((t) => anchorForType(t.id)),
    ...MODEL_TYPE_USES.map((u) => anchorForUse(u.id)),
  ].sort();

  // The page also builds the workbench GUIDE — the explanatory prose the operational panes used to
  // carry inline. Those sections are DECLARED rather than derived, because no part of a model
  // kernel knows how a pane reads, so they are added to the expected set from their own declaration
  // and kept out of the GALLERY claim below. Splitting the two is the point: the 1:1 correspondence
  // with the registry stays exactly as strict as it was, and a guide section cannot quietly stand in
  // for a missing model-type entry.
  const expectedSections = [...galleryAnchors, ...GUIDE_ANCHORS].sort();

  const rendered = await page.evaluate(() => ({
    sectionIds: [...document.querySelectorAll("#learn-main > section[id]")].map((s) => s.id).sort(),
    cardHrefs: [...document.querySelectorAll(".learn-cards a")].map((a) => a.getAttribute("href")).sort(),
    cardQuestions: [...document.querySelectorAll(".learn-card-question")].map((q) => q.textContent),
  }));
  assert.deepEqual(rendered.sectionIds, expectedSections,
    "the Learn sections are not the registry's types and uses plus the declared guide sections");
  assert.deepEqual(rendered.cardHrefs, galleryAnchors.map((a) => `#${a}`),
    "the gallery cards do not correspond 1:1 to the registry's types and uses");

  // Each card leads with its registry QUESTION — the gallery's organizing principle ("choose a
  // model by the engineering question"). Set-compared, since the card order interleaves axes.
  const expectedQuestions = [...MODEL_TYPES, ...MODEL_TYPE_USES].map((x) => x.question).sort();
  assert.deepEqual([...rendered.cardQuestions].sort(), expectedQuestions,
    "a gallery card does not carry its registry entry's question");

  await page.close();
});
