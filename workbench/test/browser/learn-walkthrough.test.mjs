// The walkthrough's browser-tier suite: the student path, driven.
//
// The node tier (`test/learn-walkthrough.test.ts`) proves the groundings resolve and the semantic
// drives flip the verdicts the fixtures record. This file proves the PAGE delivers them: the step
// sections render in the declared order, the Next links chain through it, the buttons actually
// rewrite the observable-consequence lines, the what-if steps flip and restore live in the DOM,
// and every interactive control in the walkthrough is a native focusable element — a 16-step path
// whose "Next" was a div would pass every node-tier check and strand a keyboard user at step 1.
//
// Expected outcome words are read from the fixtures' own `changes` blocks, not written here: the
// suite asserts the page shows what the corpus declares, so a re-modelled example moves this file
// via its fixture rather than stranding a literal.
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { readFileSync } from "node:fs";

import {
  WORKBENCH_DIR, startServerOnFreePort, launchBrowser, shutdown,
} from "./harness.mjs";

import { LEARN_PAGE } from "../../src/app/learn.ts";
import { REFERENCE_ANCHOR, WALKTHROUGH_ANCHORS, WALKTHROUGH_STEPS } from "../../src/learn/walkthrough.ts";
import { fixturePathFor, readFixture } from "../../src/learn/fixtures.ts";

const fixtureOf = (id) => readFixture(id, readFileSync(
  new URL(`../../${fixturePathFor(id)}`, import.meta.url), "utf8"));

const changesOf = (example, modification) => {
  const mod = fixtureOf(example).modifications.find((m) => m.id === modification);
  assert.ok(mod !== undefined, `no modification '${modification}' in '${example}'`);
  return mod.changes;
};

let server;
let browser;
let origin;
let page;

before(async () => {
  ({ server, origin } = await startServerOnFreePort(WORKBENCH_DIR));
  browser = await launchBrowser();
  page = await browser.newPage();
  await page.goto(`${origin}/${LEARN_PAGE}`, { waitUntil: "load" });
  // The page's OWN readiness mark — it marks the derivation complete, which `load` does not.
  await page.waitForFunction(() => window.mageLearn?.ready === true, { timeout: 60_000 });
}, { timeout: 120_000 });

after(async () => { await shutdown({ browser, server }); });

/** A step's consequence line, read fresh. */
const outcomeText = (anchor) => page.$eval(`#${anchor} .walk-outcome`, (n) => n.textContent);

/** Click a step's button by its leading text. */
async function clickStepButton(anchor, leading) {
  const clicked = await page.evaluate((a, lead) => {
    const buttons = [...document.querySelectorAll(`#${a} button.walk-run`)];
    const hit = buttons.find((b) => (b.textContent ?? "").startsWith(lead));
    if (hit === undefined) return false;
    hit.click();
    return true;
  }, anchor, leading);
  assert.ok(clicked, `#${anchor} has no button starting “${leading}”`);
}

describe("the walkthrough's structure", () => {
  it("renders every declared step, in order, with the nav cards to match", async () => {
    const rendered = await page.evaluate(() =>
      [...document.querySelectorAll("#learn-main > section[id^='walk-']")].map((s) => s.id));
    assert.deepEqual(rendered, [...WALKTHROUGH_ANCHORS],
      "the rendered step sections are not the declared steps in the declared order");
    const cards = await page.evaluate(() =>
      [...document.querySelectorAll("ol.walk-cards a")].map((a) => a.getAttribute("href")));
    assert.deepEqual(cards, WALKTHROUGH_ANCHORS.map((a) => `#${a}`));
  });

  it("chains Next links through the declared order, ending at the reference material", async () => {
    const nexts = await page.evaluate(() =>
      [...document.querySelectorAll("#learn-main > section[id^='walk-'] a.walk-next")]
        .map((a) => a.getAttribute("href")));
    const expected = WALKTHROUGH_STEPS.map((_, i) =>
      `#${WALKTHROUGH_STEPS[i + 1]?.anchor ?? REFERENCE_ANCHOR}`);
    assert.deepEqual(nexts, expected, "the Next chain does not walk the declared order");
    const target = await page.evaluate((anchor) =>
      document.getElementById(anchor) !== null, REFERENCE_ANCHOR);
    assert.ok(target, "the final Next link points at a reference anchor the page does not render");
  });

  it("every interactive control in the walkthrough is a native focusable element", async () => {
    // The keyboard claim, structurally: anything a step invites the student to operate is an
    // element the browser makes focusable and activatable on its own. A div with a click handler
    // cannot appear here without landing in the `other` bucket and failing.
    const offenders = await page.evaluate(() => {
      const ok = new Set(["A", "BUTTON", "SELECT", "SUMMARY", "LABEL", "OPTION"]);
      const out = [];
      for (const section of document.querySelectorAll("#learn-main > section[id^='walk-']")) {
        for (const n of section.querySelectorAll("[onclick], [role='button'], [tabindex]")) {
          // The one sanctioned tabindex is the scroll container's 0 (WCAG 2.1.1; see rowsTable).
          if (n.classList.contains("scroll") && n.getAttribute("tabindex") === "0") continue;
          if (!ok.has(n.tagName)) out.push(`${section.id}: ${n.tagName.toLowerCase()}`);
        }
      }
      return out;
    });
    assert.deepEqual(offenders, [],
      "a walkthrough control is not a native focusable element — a keyboard user cannot operate it");
  });
});

describe("the steps' observable consequences", () => {
  it("step 1: selecting the entity quotes the accessible description", async () => {
    await clickStepButton("walk-structural", "Select Transaction Engine");
    const text = await outcomeText("walk-structural");
    assert.match(text, /^Selected: /, "the selection did not reach the consequence line");
    assert.match(text, /Transaction Engine/,
      "the consequence line does not describe the selected entity");
  });

  it("step 5: running the saved question reports its outcome and coverage", async () => {
    assert.equal(await outcomeText("walk-questions"), "Not run yet.");
    await clickStepButton("walk-questions", "Run:");
    const text = await outcomeText("walk-questions");
    assert.match(text, /^Outcome: /);
    assert.match(text, /exhaustive over \d+ configurations/,
      "the coverage phrase is missing — an outcome with no coverage overstates itself");
  });

  it("step 6: showing the witness numbers the trace in the figure's text view", async () => {
    await clickStepButton("walk-evidence", "Show the witness");
    assert.match(await outcomeText("walk-evidence"), /witness/);
    const steps = await page.$eval("#walk-evidence figure details",
      (d) => d.querySelectorAll("ol.evidence li").length);
    assert.ok(steps > 0, "the accessible twin lists no evidence steps after the run");
  });

  it("step 9: the shortcut flips both verdicts live, and the discard restores them", async () => {
    const changes = changesOf("transaction-workspace", "commit-without-validating-shortcut");
    assert.ok(changes.length >= 2, "the fixture no longer records the two-property flip");

    const before = await outcomeText("walk-changes");
    for (const c of changes) assert.match(before, new RegExp(`: ${c.from}\\b`));

    await clickStepButton("walk-changes", "Apply:");
    const applied = await outcomeText("walk-changes");
    for (const c of changes) {
      assert.match(applied, new RegExp(`: ${c.to}\\b`),
        `after the shortcut, '${c.query}' does not show the fixture's post-change outcome`);
    }

    await clickStepButton("walk-changes", "Discard the change");
    const restored = await outcomeText("walk-changes");
    for (const c of changes) assert.match(restored, new RegExp(`: ${c.from}\\b`));
  });

  it("step 11: the budget question recomputes through the doubled queue and back", async () => {
    const [change] = changesOf("embedded-sensor-node", "double-the-telemetry-queue");
    assert.ok(change !== undefined);

    await clickStepButton("walk-quantitative", "Run:");
    const ran = await outcomeText("walk-quantitative");
    assert.match(ran, new RegExp(`: ${change.from}\\b`));
    assert.match(ran, /computed total .*\d/, "the computed figure is missing from the readout");

    await clickStepButton("walk-quantitative", "Apply:");
    assert.match(await outcomeText("walk-quantitative"),
      new RegExp(`: ${change.to}\\b`),
      "doubling the queue did not move the verdict the fixture records");

    await clickStepButton("walk-quantitative", "Discard the change");
    assert.match(await outcomeText("walk-quantitative"),
      new RegExp(`: ${change.from}\\b`));
  });

  it("step 15: the unsupported question reads NOT ANSWERABLE with the engine's reason", async () => {
    await clickStepButton("walk-boundaries", "Ask:");
    const text = await outcomeText("walk-boundaries");
    assert.match(text, /^NOT ANSWERABLE — /);
    assert.ok(text.length > 30, "the refusal carries no reason");
  });
});
