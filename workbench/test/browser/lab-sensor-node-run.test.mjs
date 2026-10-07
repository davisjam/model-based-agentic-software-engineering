/**
 * THE SENSOR LAB, RUN END TO END — load, ask, break, understand, restore, redesign, CREATE.
 *
 * This is the gate form of "the lab works": every step a student performs tomorrow, driven
 * through the page, with verdicts AND evidence read off the rendered DOM (never
 * `window.mage.properties()` — the four-ways-it-passes-while-broken discipline of
 * `journeys.test.mjs` applies throughout).
 *
 * Why its own file rather than an extension of `journeys.test.mjs`: that file is parameterized
 * over the §21 flagship (message-bus) and routes every mutation through a human form; the sensor
 * lab's flagship edit is `set-quantity-value`, which has NO form at HEAD — the journey's own
 * default arm refuses it by design. This file therefore:
 *   - pins the MISSING CONTROL as a WANTED-behaviour test (RED at HEAD, first describe below —
 *     do not weaken it; it is the fix's acceptance test);
 *   - runs the quantity half of the lab via `window.mage.transact`, each such test saying so in
 *     its name (the documented deviation, to be deleted when the control lands);
 *   - runs the CREATION half through the real forms (add-entity, add-relation), including one
 *     semantically-refused creation (a cycle through an `acyclic: true` relation) and one
 *     legal creation asserted to be semantically LIVE — queryable through Advanced query, with a
 *     before-read proving the answer MOVED (Section F Q18, checked from the student's side).
 *
 * Audit provenance: 261005 acceptance audit, Section H + coordinator's lab-run request.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  startServerOnFreePort, launchBrowser, shutdown, openWorkbench, WORKBENCH_DIR,
} from "./harness.mjs";

let server;
let browser;
let page;
let diagnostics;

const EXAMPLE = "embedded-sensor-node";
const PIN = "sram-fits-budget";

const verdictOf = (id) => page.evaluate((claim) =>
  document.querySelector(`#question-list [data-property="${claim}"] p .state`)?.textContent ?? null, id);

const budgetText = () => page.evaluate(() =>
  (document.getElementById("model-budget")?.textContent ?? "").replace(/\s+/g, " ").trim());

const editResult = () => page.evaluate(() =>
  (document.getElementById("edit-result")?.textContent ?? "").replace(/\s+/g, " ").trim());

const askSaved = (id) => page.evaluate((claim) => {
  const choice = document.getElementById("ask-choice");
  choice.value = `saved:${claim}`;
  document.getElementById("ask-submit").click();
  return (document.getElementById("ask-answer")?.textContent ?? "").replace(/\s+/g, " ").trim();
}, id);

/** Drive the Advanced query form: successors of `from` through `relation`. Returns the answer text. */
const askSuccessors = (relation, from) => page.evaluate((rel, src) => {
  document.getElementById("ask-form").value = "successors";
  document.getElementById("ask-form").dispatchEvent(new Event("change", { bubbles: true }));
  document.getElementById("ask-relation").value = rel;
  document.getElementById("ask-relation").dispatchEvent(new Event("change", { bubbles: true }));
  document.getElementById("ask-from").value = src;
  document.getElementById("ask-quantifier").value = "exists";
  document.getElementById("ask-go").click();
  return (document.getElementById("ask-answer")?.textContent ?? "").replace(/\s+/g, " ").trim();
}, relation, from);

const transact = (ops) => page.evaluate((operations) => window.mage.transact({
  base: window.mage.context().hash, operations,
}), ops);

const undoOnce = async () => {
  const h = await page.evaluate(() => window.mage.context().hash);
  await page.evaluate(() => document.getElementById("undo").click());
  await page.waitForFunction((x) => window.mage.context().hash !== x, { timeout: 30_000 }, h);
};

before(async () => {
  const started = await startServerOnFreePort();
  server = started.server;
  browser = await launchBrowser();
  ({ page, diagnostics } = await openWorkbench(browser, started.origin));
  await page.waitForFunction(
    () => (document.getElementById("example-choice")?.options.length ?? 0) > 0, { timeout: 30_000 });
  // The sensor example moved to the fixture corpus in the 261006 three-example split: the picker
  // no longer offers it, so the lab mounts it the way a student's own file arrives — imported
  // through window.mage.load over the same bytes the fixture tracks.
  {
    const yaml = await readFile(join(WORKBENCH_DIR, "test", "fixtures", "examples", EXAMPLE, "system.mage.yaml"), "utf8");
    await page.evaluate((text) => window.mage.load(text), yaml);
  }
  await page.waitForFunction(
    () => document.getElementById("workspace")?.hasAttribute("hidden") === false, { timeout: 30_000 });
}, { timeout: 180_000 });

after(async () => { await shutdown({ browser, server }); });

// ------------------------------------------------------------------------------------------
// WANTED, RED AT HEAD: the lab's step-3 edit must have a student control
// ------------------------------------------------------------------------------------------

describe.todo("WANTED (red at HEAD) — the lab's flagship edit has a student control", () => {
  it("some Edit form, inspector action, or budget-row control can change a quantity value "
    + "without window.mage", async () => {
    const routes = await page.evaluate(() => ({
      quantityForms: [...document.querySelectorAll("#edit fieldset")]
        .map((f) => f.id).filter((id) => /quantit/i.test(id)),
      inspectorActions: [...document.querySelectorAll("#inspector-actions button")]
        .map((b) => b.id).filter((id) => /quantit/i.test(id)),
      budgetControls: [...document.querySelectorAll("#model-budget input, #model-budget button")].length,
    }));
    assert.ok(
      routes.quantityForms.length > 0 || routes.inspectorActions.length > 0 || routes.budgetControls > 0,
      "no student route can perform `set-quantity-value` — the lab's own step 3 (telemetry queue "
      + "32 → 64 KB) requires window.mage.transact. When this test goes green, add the route to "
      + `journeys.test.mjs driveOperation and retire this file's transact fallback. Found: ${JSON.stringify(routes)}`);
  });
});

// ------------------------------------------------------------------------------------------
// The lab, in order
// ------------------------------------------------------------------------------------------

describe("lab step 1-2 — ask the budget question, read the margin as evidence", () => {
  it("the saved question renders ESTABLISHED with the exhaustive basis in the answer region", async () => {
    const answer = await askSaved(PIN);
    assert.match(answer, /ESTABLISHED/);
    assert.match(answer, /exhaustive over 1 configuration/,
      "the coverage basis left the rendered answer — a student can no longer see WHAT earned the claim");
  });
  it("the budget region carries 232 / 256 / 24 — the lab's three numbers", async () => {
    const text = await budgetText();
    assert.match(text, /total 232 KB against a declared ceiling of 256 KB/);
    assert.match(text, /24 KB of margin remains/);
  });
});

describe("lab step 3-4 — break the budget (transact fallback: no student control at HEAD)", () => {
  it("before-read: ESTABLISHED over a 24 KB margin (the rung-3 discipline)", async () => {
    assert.equal(await verdictOf(PIN), "ESTABLISHED");
    assert.match(await budgetText(), /24 KB of margin remains/);
  });
  it("telemetry 32 → 64 KB falsifies the pinned claim AND moves the rendered evidence", async () => {
    const h = await page.evaluate(() => window.mage.context().hash);
    const tx = await transact([{ op: "set-quantity-value", id: "telemetry-queue-sram", value: "64 KB" }]);
    assert.ok(tx.ok, JSON.stringify(tx.findings));
    await page.waitForFunction((x) => window.mage.context().hash !== x, { timeout: 30_000 }, h);

    assert.equal(await verdictOf(PIN), "REFUTED", "the rail did not repaint");
    const text = await budgetText();
    assert.match(text, /Over budget by 8 KB/,
      "the WHY is not rendered — the verdict moved but the evidence did not");
    assert.match(text, /total 264 KB against a declared ceiling of 256 KB/);
    assert.doesNotMatch(text, /margin remains/, "the stale margin sentence survived the repaint");

    const answer = await askSaved(PIN);
    assert.match(answer, /REFUTED/,
      "re-asking the saved question does not say REFUTED in the answer region");
  });
});

describe("lab step 5 — restore: model AND original evidence come back", () => {
  it("one Undo restores the verdict, the margin sentence, and the total", async () => {
    await undoOnce();
    assert.equal(await verdictOf(PIN), "ESTABLISHED");
    const text = await budgetText();
    assert.match(text, /24 KB of margin remains/);
    assert.match(text, /total 232 KB against a declared ceiling of 256 KB/);
  });
});

describe("lab step 6 — the design search: reach >= 20% margin, verdict same, margin moved", () => {
  it("halving the classifier weights holds at 196 KB with 23.4% free — margin, not Boolean", async () => {
    const h = await page.evaluate(() => window.mage.context().hash);
    const tx = await transact([{ op: "set-quantity-value", id: "model-weights-sram", value: "36 KB" }]);
    assert.ok(tx.ok, JSON.stringify(tx.findings));
    await page.waitForFunction((x) => window.mage.context().hash !== x, { timeout: 30_000 }, h);

    assert.equal(await verdictOf(PIN), "ESTABLISHED",
      "a margin-restoring change must not move the verdict — holds before, holds after");
    const text = await budgetText();
    assert.match(text, /total 196 KB against a declared ceiling of 256 KB/);
    assert.match(text, /23\.4% free/, "the search target (>=20%) is not readable off the page");
    await undoOnce();
    assert.match(await budgetText(), /24 KB of margin remains/);
  });
});

describe("lab step 7 — CREATE through the real forms, and the created data is semantically live", () => {
  it("a new entity lands through the Add-entity form and enters the rendered vocabulary", async () => {
    const h = await page.evaluate(() => window.mage.context().hash);
    await page.evaluate(() => {
      document.getElementById("add-entity-id").value = "backup-radio";
      document.getElementById("add-entity-label").value = "Backup radio";
      document.getElementById("add-entity-go").click();
    });
    await page.waitForFunction((x) => window.mage.context().hash !== x, { timeout: 30_000 }, h);
    assert.equal(await editResult(), "", "the form refused the entity");
    const offered = await page.evaluate(() =>
      [...document.getElementById("delete-element-target").options].map((o) => o.value));
    assert.ok(offered.some((v) => v.includes("backup-radio")),
      `the created entity is not in the page's own element lists: ${offered.join(", ")}`);
  });

  it("a creation that would close a cycle through an acyclic relation is REFUSED with a reason", async () => {
    await page.evaluate(() => {
      const set = (id, v) => {
        const el = document.getElementById(id);
        el.value = v;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      set("add-relation-model", "sensor-dataflow");
      set("add-relation-from", "radio-stack");
      set("add-relation-to", "sensor-driver");
      set("add-relation-type", "feeds");
      document.getElementById("add-relation-go").click();
    });
    const refusal = await editResult();
    assert.notEqual(refusal, "",
      "the cyclic feeds edge committed silently — `acyclic: true` on the relation type is "
      + "decoration, which is exactly the F-Q18 red alert");
    assert.match(refusal, /cycl/i, `the refusal does not name the cycle: ${refusal}`);
  });

  it("a legal created relation is queryable the moment it lands — with a before-read proving "
    + "the answer moved", async () => {
    const beforeAnswer = await askSuccessors("owns_buffer", "mcu-runtime");
    assert.match(beforeAnswer, /logging-buffer/, "the baseline successors answer lost its witness");
    assert.doesNotMatch(beforeAnswer, /packet-buffer/,
      "packet-buffer is already a successor of mcu-runtime, so this test's after-read proves nothing");

    const h = await page.evaluate(() => window.mage.context().hash);
    await page.evaluate(() => {
      const set = (id, v) => {
        const el = document.getElementById(id);
        el.value = v;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      set("add-relation-model", "sensor-firmware");
      set("add-relation-from", "mcu-runtime");
      set("add-relation-to", "packet-buffer");
      set("add-relation-type", "owns_buffer");
      document.getElementById("add-relation-go").click();
    });
    await page.waitForFunction((x) => window.mage.context().hash !== x, { timeout: 30_000 }, h);
    assert.equal(await editResult(), "", "the form refused a legal owns_buffer edge");

    const afterAnswer = await askSuccessors("owns_buffer", "mcu-runtime");
    assert.match(afterAnswer, /packet-buffer/,
      "the created relation does not reach the query engine — created data is decorative");

    await undoOnce(); // the relation
    await undoOnce(); // the entity
    const restored = await askSuccessors("owns_buffer", "mcu-runtime");
    assert.doesNotMatch(restored, /packet-buffer/, "undo did not retract the created relation from answers");
  });

  it("the page threw nothing while the lab ran", () => {
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.notFound, []);
  });
});
