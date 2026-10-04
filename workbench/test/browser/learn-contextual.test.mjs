// The two CONTEXTUAL routes into Learn, on the page as it is served.
//
// `test/learn-contextual.test.ts` holds both routes as typed values — the picker's rows against the
// model-type registry, the inspector's Learn block against the registry's composition declarations
// — and that is the strong half of the claim. This is the half it cannot make: a derivation that is
// correct and a dialog that never shows it look identical to the node tier, and the defect this
// whole Epic repairs was precisely a specified surface that nothing rendered.
//
// So everything here is measured on the rendered page, through the controls a person uses: open the
// `+ Add` menu, press `Model…`, read the dialog. And the hrefs are followed to their SECTIONS on
// `learn.html` rather than pattern-matched, which is the precedent `smoke.test.mjs` set for the
// gallery anchors — a link whose shape is right and whose target does not exist is the failure mode
// a shape assertion is blind to.
//
// It lives under `test/browser/` so `npm run test:browser` picks it up with no new script, and
// `test/gate-reachability.test.ts` already declares that tier's exclusion from the default gate
// alongside the CI step that runs it.
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { parse } from "yaml";

import {
  WORKBENCH_DIR, startServerOnFreePort, launchBrowser, shutdown, openWorkbench, openServedPage,
} from "./harness.mjs";

// The registries and the canonicalizer, from source. A list compared against literals passes while
// the registry drifts, and a drifting model-type surface is what UX-I9 forbids.
import { MODEL_TYPES } from "../../src/engine/model-types.ts";
import {
  LEARN_PAGE, MODEL_TYPE_USES, anchorForType, anchorForUse, learnHrefForType,
} from "../../src/app/learn.ts";
import { canonicalize } from "../../src/ir/canonicalize.ts";

/** The shipped example that declares a machine, so the behavioural route has a subject. */
const WITH_MACHINE = "worker-queue";

let server;
let browser;
let origin;

before(async () => {
  ({ server, origin } = await startServerOnFreePort(WORKBENCH_DIR));
  browser = await launchBrowser();
}, { timeout: 60_000 });

after(async () => { await shutdown({ browser, server }); });

/**
 * Load one shipped example through the agent path, and hand back the ids it declares.
 *
 * The ids come from CANONICALIZING the same file the page loaded, not from probing the rendered
 * rails for a `data-` attribute this suite does not own. A fixture that scrapes the DOM for its own
 * subject fails for two different reasons with one message — the rail changed, or the route is
 * missing — and only the second is what this file is about.
 */
async function loadExample(page, id) {
  const yaml = await readFile(join(WORKBENCH_DIR, "examples", id, "system.mage.yaml"), "utf8");
  const before = await page.evaluate(() => document.getElementById("summary")?.textContent ?? "");
  await page.evaluate((text) => window.mage.load(text), yaml);
  await page.waitForFunction(
    (prior) => (document.getElementById("summary")?.textContent ?? "") !== prior,
    { timeout: 30_000 },
    before,
  );
  const system = canonicalize(parse(yaml));
  return {
    models: [...system.models.keys()],
    machines: [...system.machines.keys()],
    entities: [...system.entities.keys()],
  };
}

/**
 * Open one operation's dialog the way a person does: the menu, then the row.
 *
 * Puppeteer's `page.click` dispatches real input through the browser, so this exercises the
 * `<details>` disclosure and the button's own listener rather than calling a handler. The wait is
 * on the dialog reporting itself open — `showModal()` is synchronous, but asserting on the
 * observable state keeps the test from depending on that.
 */
async function openAddDialog(page, row) {
  await page.click("#add-menu-summary");
  await page.click(`#add-menu-${row}`);
  await page.waitForFunction(() => document.getElementById("edit-dialog")?.open === true,
    { timeout: 30_000 });
}

const closeDialog = (page) => page.click("#edit-dialog-cancel");

describe("route one: the Add-model picker offers the registry's types by their question", () => {
  let page;

  before(async () => {
    ({ page } = await openWorkbench(browser, origin));
    // `+ Add` is unmounted with nothing loaded, so the picker needs a system before it has a route.
    await loadExample(page, "message-bus");
    await openAddDialog(page, "model");
  }, { timeout: 60_000 });

  after(async () => { if (page !== undefined) await page.close(); });

  it("renders one row per registered model type, each naming its type and its question", async () => {
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll("#edit-dialog-type-rows button.type-choice")].map((b) => ({
        label: b.querySelector(".type-choice-label")?.textContent ?? null,
        question: b.querySelector(".type-choice-question")?.textContent ?? null,
        // The accessible name a screen-reader user hears, which is both halves of the row.
        name: (b.textContent ?? "").replace(/\s+/g, " ").trim(),
        visible: b.checkVisibility(),
      })));
    assert.deepEqual(
      rows.map((r) => ({ label: r.label, question: r.question })),
      MODEL_TYPES.map((t) => ({ label: t.label, question: t.question })),
      "the rendered picker is not the model-type registry, in registry order, with each type's own "
      + "question — requirements-learn-261002.md asks for the types presented BY QUESTION, and UX-I9 "
      + "requires the question to come from the definition the kernel gates on",
    );
    for (const r of rows) {
      assert.ok(r.visible, `the row "${r.name}" is in the dialog and not rendered`);
      assert.ok(r.name.length > 0, "a picker row has no accessible name");
    }
  });

  it("offers the Learn escape, resolving to the gallery the application serves", async () => {
    const escape = await page.evaluate((learnPage) => {
      const a = document.getElementById("edit-dialog-learn");
      if (a === null) return { present: false };
      return {
        present: true,
        tag: a.tagName.toLowerCase(),
        name: (a.textContent ?? "").trim(),
        visible: a.checkVisibility(),
        href: a.getAttribute("href"),
        resolves: a.href === new URL(learnPage, document.baseURI).href,
        tabIndex: a.tabIndex,
        // "Not sure?" is the question the escape answers; it is the escape's own context and a
        // screen-reader user meets it in the same paragraph.
        context: (a.parentElement?.textContent ?? "").replace(/\s+/g, " ").trim(),
      };
    }, LEARN_PAGE);
    assert.ok(escape.present, "the add-model dialog ships no #edit-dialog-learn");
    assert.equal(escape.tag, "a", "the escape is not an <a>, so ⌘-click and middle-click do nothing");
    assert.ok(escape.visible, "the escape is in the dialog and not rendered");
    assert.equal(escape.href, LEARN_PAGE,
      `the escape points at "${escape.href}" and src/app/learn.ts says Learn lives at "${LEARN_PAGE}"`);
    assert.ok(escape.resolves, "the escape does not resolve to the served Learn page");
    assert.ok(escape.tabIndex >= 0, `tabIndex ${escape.tabIndex} takes the escape out of the tab order`);
    assert.match(escape.context, /Not sure\?/,
      "the escape is not offered under the requirement's own “Not sure?”");
    for (const t of MODEL_TYPES) {
      assert.notEqual(escape.href, learnHrefForType(t.id),
        `the escape is ${t.id}'s deep link; a reader who cannot choose needs the gallery`);
    }
  });

  it("fills the engineering question when a row is pressed, and leaves it editable", async () => {
    // The choice a picker of questions has to make good on. It fills rather than submits: the
    // question stays the user's, because a model's purpose is usually narrower than its type's.
    const target = MODEL_TYPES[MODEL_TYPES.length - 1];
    const field = "#edit-dialog-add-model-question";
    const before = await page.$eval(field, (i) => i.value);
    assert.equal(before, "", "the question field did not open blank — the fixture is not a fresh dialog");

    await page.evaluate((question) => {
      const rows = [...document.querySelectorAll("#edit-dialog-type-rows button.type-choice")];
      const row = rows.find((b) => b.dataset.question === question);
      if (row === undefined) throw new Error("no picker row carries that question");
      row.click();
    }, target.question);

    const after = await page.$eval(field, (i) => ({
      value: i.value, readOnly: i.readOnly, focused: document.activeElement === i,
    }));
    assert.equal(after.value, target.question,
      `pressing the '${target.id}' row did not put its registry question in the field it declares`);
    assert.equal(after.readOnly, false, "the picker made the question field read-only");
    assert.ok(after.focused, "focus did not follow the choice into the field the user must now edit");
  });

  it("is not offered by an operation that asks for no engineering question", async () => {
    // The inverse, on the page. A model-type row above `add-entity`'s fields would suggest a choice
    // its transaction cannot carry, and `hidden` is what keeps it out of the tab order too.
    await closeDialog(page);
    await openAddDialog(page, "entity");
    const state = await page.evaluate(() => {
      const host = document.getElementById("edit-dialog-types");
      return {
        hidden: host?.hidden ?? null,
        visible: host?.checkVisibility() ?? null,
        escapeVisible: document.getElementById("edit-dialog-learn")?.checkVisibility() ?? null,
      };
    });
    assert.equal(state.hidden, true, "the model-type picker is mounted over add-entity's fields");
    assert.equal(state.visible, false);
    assert.equal(state.escapeVisible, false,
      "the Learn escape is reachable from a dialog that offers no model types");
  });
});

describe("route two: from the model you are looking at", () => {
  let page;
  let declared;
  /** Every Learn href the pane rendered, by the selection that produced it. */
  const emitted = new Map();

  before(async () => {
    ({ page } = await openWorkbench(browser, origin));
    declared = await loadExample(page, WITH_MACHINE);
    assert.ok(declared.machines.length > 0 && declared.models.length > 0
      && declared.entities.length > 0,
    `'${WITH_MACHINE}' declares no machine, model or entity — the fixture cannot exercise the routes`);
  }, { timeout: 60_000 });

  after(async () => { if (page !== undefined) await page.close(); });

  /** Select through the agent path and read the inspector's Learn links off the rendered pane. */
  async function learnLinksFor(selection) {
    await page.evaluate((value) => window.mage.view.select([value]), selection);
    await page.waitForFunction(() => document.querySelector("#inspector-body h3") !== null,
      { timeout: 30_000 });
    const links = await page.evaluate(() =>
      [...document.querySelectorAll('#inspector-body a[data-action="learn"]')].map((a) => ({
        text: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
        href: a.getAttribute("href"),
        visible: a.checkVisibility(),
        // A Learn line must NOT carry the in-page argument the delegated handler reads: that is the
        // mechanism by which the browser is left to follow the link to the other page.
        hasArg: a.dataset.arg !== undefined,
      })));
    emitted.set(selection, links.map((l) => l.href));
    return links;
  }

  it("a selected machine offers About <type>s and Possible combinations", async () => {
    const id = declared.machines[0];
    const links = await learnLinksFor(`machine:${id}`);
    assert.ok(links.length >= 2,
      `machine '${id}' renders ${links.length} Learn link(s); the requirement asks for "About `
      + '<Type>s" and "Possible combinations"');
    const behavioural = MODEL_TYPES.find((t) => t.queryKind === "behavior");
    assert.ok(behavioural, "no registered type answers behavioural questions");
    assert.equal(links[0].href, learnHrefForType(behavioural.id),
      "the first route is not the Learn section of the type that answers behavioural questions");
    assert.equal(links[0].text, `About ${behavioural.label}s`,
      "the route is not labelled with the registry's own name for the type");
    assert.match(links[1].text, /Possible combinations/);
    for (const l of links) {
      assert.ok(l.visible, `the Learn link "${l.text}" is rendered invisible`);
      assert.equal(l.hasArg, false,
        `"${l.text}" carries data-arg, so the pane's delegated handler would swallow the click `
        + "instead of letting the browser follow the link");
    }
  });

  it("a selected model offers the route for the type that answers structural questions", async () => {
    const links = await learnLinksFor(`model:${declared.models[0]}`);
    const structural = MODEL_TYPES.find((t) => t.queryKind === "graph");
    assert.ok(structural, "no registered type answers structural questions");
    assert.equal(links[0]?.href, learnHrefForType(structural.id));
    assert.equal(links[0]?.text, `About ${structural.label}s`);
  });

  it("a selected entity offers no Learn route, because an entity is not of one type", async () => {
    // Identity is shared across every reduction, so an entity belongs to all three types and to
    // none. The requirement's own restraint, on the page: no dangling heading.
    const id = declared.entities[0];
    const links = await learnLinksFor(id);
    assert.deepEqual(links, [], `entity '${id}' offers a Learn route for a type it does not have`);
    const heading = await page.evaluate(() =>
      [...document.querySelectorAll("#inspector-body p.sublabel, #inspector-body summary")]
        .map((p) => p.textContent).includes("Learn"));
    assert.equal(heading, false, "an empty Learn heading is rendered over an entity");
  });

  it("every href it emitted is a section learn.html really renders", async () => {
    // The precedent from `smoke.test.mjs`: the anchors are compared against the sections the Learn
    // page BUILT, not against the registry a second time. A route whose href is well-formed and
    // whose target does not exist is the failure a shape assertion cannot see.
    const hrefs = [...new Set([...emitted.values()].flat())];
    assert.ok(hrefs.length >= 2,
      `the inspector emitted ${hrefs.length} distinct Learn href(s) — the selections above rendered `
      + "no routes, so this test proved nothing");

    const { page: learnPage } = await openServedPage(browser, LEARN_PAGE, origin);
    await learnPage.waitForFunction(() => window.mageLearn?.ready === true, { timeout: 30_000 });
    const sections = await learnPage.evaluate(() =>
      [...document.querySelectorAll("#learn-main > section[id]")].map((s) => s.id));
    await learnPage.close();

    for (const href of hrefs) {
      const [path, anchor] = href.split("#");
      assert.equal(path, LEARN_PAGE, `'${href}' does not address the served Learn page`);
      assert.ok(sections.includes(anchor),
        `'${href}' points at #${anchor}, which learn.html does not render. It builds: ${sections.join(", ")}`);
    }
    // And the anchors it emitted are addresses the Learn module OWNS, not strings assembled here.
    const owned = new Set([
      ...MODEL_TYPES.map((t) => anchorForType(t.id)),
      ...MODEL_TYPE_USES.map((u) => anchorForUse(u.id)),
    ]);
    for (const href of hrefs) {
      assert.ok(owned.has(href.split("#")[1]),
        `'${href}' is not an address src/app/learn.ts declares`);
    }
  });
});
