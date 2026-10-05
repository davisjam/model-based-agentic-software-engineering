/**
 * TOMORROW'S SENSOR LAB, DRIVEN AS A STUDENT — the rendered half of the Section-H pins.
 *
 * Why a NEW file rather than an extension of `journeys.test.mjs`: the journey file's
 * `driveOperation` routes every mutation through a HUMAN form, and the sensor example's own
 * declared modification (`set-quantity-value`) has NO form route at HEAD — the Edit region's
 * fieldsets stop at structure (entities, states, relations, labels, properties, models, notes).
 * Extending the journey to this example therefore fails by design at its default arm ("add the
 * route beside the two above"), which is correct behaviour for THAT file and is pinned HERE as
 * the as-built gap. When a quantity form lands, fold the transition pins below into the
 * generated journeys and delete the duplicated halves of this file.
 *
 * The verdict reader below is `journeys.test.mjs`'s `verdictOf` discipline (rendered rows, never
 * `window.mage.properties()`); the one deliberate deviation is that the mutation goes through
 * `window.mage.transact`, because no student control exists — each such test says so in its name.
 * Audit provenance: 261005 acceptance audit, Section H.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startServerOnFreePort, launchBrowser, shutdown, openWorkbench,
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

before(async () => {
  const started = await startServerOnFreePort();
  server = started.server;
  browser = await launchBrowser();
  ({ page, diagnostics } = await openWorkbench(browser, started.origin));
  await page.waitForFunction(
    () => (document.getElementById("example-choice")?.options.length ?? 0) > 0, { timeout: 30_000 });
  await page.evaluate((id) => {
    const choice = document.getElementById("example-choice");
    choice.value = id;
    choice.dispatchEvent(new Event("change", { bubbles: true }));
    document.getElementById("example-load").click();
  }, EXAMPLE);
  await page.waitForFunction(
    () => document.getElementById("workspace")?.hasAttribute("hidden") === false, { timeout: 30_000 });
}, { timeout: 180_000 });

after(async () => { await shutdown({ browser, server }); });

describe("H Q1-Q5 — the budget facts are on the page, derived not asserted", () => {
  it("total, ceiling, margin and the largest consumer are all rendered sentences", async () => {
    const text = await budgetText();
    assert.match(text, /total 232 KB against a declared ceiling of 256 KB/,
      "the margin sentence no longer carries the lab's two load-bearing figures");
    assert.match(text, /24 KB of margin remains/, "the margin is no longer stated as a figure");
    assert.match(text, /9\.4% free/, "the margin is no longer stated as a percentage");
    assert.match(text, /Largest single allocation: Model weights, 72 KB/,
      "H Q5 — the largest consumer is no longer identified without manual summing");
  });

  it("every allocation row states its residency in words a student can read", async () => {
    const holds = await page.evaluate(() =>
      [...document.querySelectorAll("#model-budget tbody tr")].map((tr) =>
        (tr.children[1]?.textContent ?? "").trim()));
    assert.equal(holds.length, 9, "nine allocations, nine rows");
    assert.ok(holds.every((h) => h === "held for the whole run"),
      "the residency column stopped saying what each allocation declares — this is the one place "
      + `the resident-sum premise is student-visible. Rendered: ${JSON.stringify(holds)}`);
  });

  it("the pinned claim renders ESTABLISHED on the rail before anything is touched", async () => {
    assert.equal(await verdictOf(PIN), "ESTABLISHED");
  });
});

describe("H Q12 route honesty — the free-text ask does not pretend to parse", () => {
  it("typing the natural question names the two real routes instead of guessing", async () => {
    const msg = await page.evaluate(() => {
      const t = document.getElementById("ask-text");
      t.value = "what is peak SRAM consumption?";
      t.dispatchEvent(new Event("input", { bubbles: true }));
      return (document.getElementById("ask-filter-state")?.textContent ?? "").trim();
    });
    assert.match(msg, /The text is a filter, not a question/);
    assert.match(msg, /window\.mage\.ask/, "the agent route is no longer named");
    assert.match(msg, /Advanced query/, "the formal route is no longer named");
    await page.evaluate(() => {
      const t = document.getElementById("ask-text");
      t.value = "";
      t.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });

  it("the missing-distinction refusal is live on the page's agent surface — the route the "
    + "no-match message just named", async () => {
    // The agent asks; the prose asserted is the engine's. The human cannot state this query at
    // HEAD (Advanced is graph-only over DECLARED relations) and no sensor saved query refuses,
    // so NO rendered surface shows this prose for this example — the audit's finding. This pins
    // the prose on window.mage, the exact route #ask-filter-state points students at.
    const refusal = await page.evaluate(() => window.mage.ask({
      kind: "graph", quantifier: "exists",
      graph: { form: "successors", relation: "operating_modes", from: "telemetry-queue" },
    }).refusal);
    assert.match(refusal ?? "", /declared modelling decision/);
    assert.match(refusal ?? "", /operating modes, so no allocation's lifetime is represented/);
  });
});

describe("H Q6 — the as-built edit gap, pinned not endorsed", () => {
  it("the Edit region offers NO route to change a quantity value — the day one lands, this "
    + "fails and the lab's flagship modification becomes a student operation", async () => {
    const forms = await page.evaluate(() =>
      [...document.querySelectorAll("#edit fieldset")].map((f) => f.id).sort());
    assert.deepEqual(forms, [
      "form-add-entity", "form-add-model", "form-add-note", "form-add-relation", "form-add-state",
      "form-delete-element", "form-delete-model", "form-delete-relation", "form-set-label",
      "form-set-property",
    ], "the Edit fieldset census moved. If a quantity form arrived: delete this pin, add the "
      + "set-quantity-value route to journeys.test.mjs driveOperation, and let the generated "
      + "journey drive the sensor example's own manifest.");
  });
});

describe("H Q7/Q8/Q11 — the modification flips the rendered verdict; undo restores it", () => {
  it("doubling the telemetry queue repaints the rail to REFUTED and the budget to 'Over by 8 KB' "
    + "(mutation via window.mage.transact — no student control exists at HEAD)", async () => {
    assert.equal(await verdictOf(PIN), "ESTABLISHED", "before-read: the rung-3 discipline");
    const beforeHash = await page.evaluate(() => window.mage.context().hash);
    const tx = await page.evaluate(() => window.mage.transact({
      base: window.mage.context().hash,
      operations: [{ op: "set-quantity-value", id: "telemetry-queue-sram", value: "64 KB" }],
    }));
    assert.ok(tx.ok, `the manifest's own modification was refused: ${JSON.stringify(tx.findings)}`);
    await page.waitForFunction((h) => window.mage.context().hash !== h, { timeout: 30_000 }, beforeHash);
    assert.equal(await verdictOf(PIN), "REFUTED", "the rail did not repaint — the 749-of-749 class");
    const text = await budgetText();
    assert.match(text, /Over budget by 8 KB/,
      "H Q8 — the WHY (total 264 against 256) is no longer a rendered sentence");
    assert.match(text, /total 264 KB against a declared ceiling of 256 KB/);
  });

  it("the toolbar Undo restores both the verdict and the margin sentence", async () => {
    await page.evaluate(() => document.getElementById("undo").click());
    await page.waitForFunction(() =>
      document.querySelector('#question-list [data-property="sram-fits-budget"] p .state')
        ?.textContent === "ESTABLISHED", { timeout: 30_000 });
    assert.match(await budgetText(), /24 KB of margin remains/,
      "undo restored the verdict but not the budget region — a stale panel over fresh state");
  });

  it("the page threw nothing while being driven", () => {
    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.notFound, []);
  });
});
