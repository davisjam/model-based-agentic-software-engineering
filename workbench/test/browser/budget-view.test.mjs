/**
 * The budget view, in the browser that actually paints it.
 *
 * ## Why this tier and not the node one
 *
 * `test/render-budget.test.ts` already pins the projection and its twin, field by field, over the
 * same example. What it cannot see is whether the page REACHES them. That gap has cost this project
 * real defects — a gate that exists while no runner invokes it, and a surface that renders while
 * nothing checks that it rendered, look identical from a script list. So this file asserts the one
 * thing only a browser can: load the example a student loads, and find the budget on the page.
 *
 * ## The assertions are post-conditions, in both directions
 *
 * Present: the region holds the allocation table, the total, the declared ceiling and the margin —
 * the four facts §11 asks to be made obvious. Absent: no fallback string, and no budget region at
 * all for a system that declares no quantities, because an empty box announcing that a system has no
 * budget is furniture rather than information.
 *
 * ## Viewport-independent by construction
 *
 * Nothing here measures a rendered width, a wrapped line, or an overflow. The projection emits a
 * fixed `viewBox` and the region scales it, so every assertion below is about TEXT and STRUCTURE —
 * which is also what makes them stable on a runner whose font stack is not this machine's. An
 * assertion that fires only when a region happens to overflow is a flake, not a check.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  startServerOnFreePort, launchBrowser, shutdown, openWorkbench, advanceVirtualTime, WORKBENCH_DIR,
} from "./harness.mjs";

let server;
let browser;
let page;
// A FREE port, not the suite's fixed one: this file runs alongside `workbench.test.mjs`, which
// holds 8143, and a fixed port makes the two collide with an EADDRINUSE that reads as broken
// infrastructure rather than as a port clash.
let origin;

const loadSystem = async (example) => {
  const yaml = await readFile(join(WORKBENCH_DIR, "examples", example, "system.mage.yaml"), "utf8");
  await page.evaluate((text) => window.mage.load(text), yaml);
  await advanceVirtualTime(page, 1500);
};

/** What the budget region holds, read out of the DOM rather than inferred from the model. */
const readBudget = () => page.evaluate(() => {
  const root = document.getElementById("model-budget");
  if (root === null) return { missing: true };
  const rows = [...root.querySelectorAll("tbody tr")].map((tr) =>
    [...tr.children].map((td) => (td.textContent ?? "").trim()));
  return {
    missing: false,
    empty: root.children.length === 0,
    text: (root.textContent ?? "").replace(/\s+/g, " ").trim(),
    headings: [...root.querySelectorAll("h3")].map((h) => (h.textContent ?? "").trim()),
    rows,
    footRows: [...root.querySelectorAll("tfoot tr")].map((tr) =>
      [...tr.children].map((td) => (td.textContent ?? "").trim())),
    svgCount: root.querySelectorAll("svg").length,
    figureHidden: [...root.querySelectorAll("figure")].every((f) => f.getAttribute("aria-hidden") === "true"),
    keyTerms: [...root.querySelectorAll("dt")].map((dt) => (dt.textContent ?? "").trim()),
  };
});

before(async () => {
  ({ server, origin } = await startServerOnFreePort(WORKBENCH_DIR));
  browser = await launchBrowser();
  ({ page } = await openWorkbench(browser, origin));
});

after(async () => { await shutdown({ browser, server }); });

describe("the budget view reaches the page a student opens", () => {
  it("a system with no quantitative model paints no budget region at all", async () => {
    await loadSystem("message-bus");
    const budget = await readBudget();
    assert.equal(budget.missing, false, "#model-budget is not in the document — the markup changed");
    assert.equal(budget.empty, true,
      `message-bus declares no quantities, so the region must stay empty. It reads: "${budget.text}"`);
  });

  it("the sensor node's allocations, total, ceiling and margin are all on the page", async () => {
    await loadSystem("embedded-sensor-node");
    const budget = await readBudget();

    assert.equal(budget.empty, false, "the budget region is empty for a system that declares a budget");
    // Nine allocations, each a row. The count is read from the model through the page's own agent
    // surface rather than typed here, so retuning the fixture moves the test with it.
    const declared = await page.evaluate(() => window.mage.context().counts?.quantities ?? 0);
    // A probe that returns nothing has two explanations and the likelier one is the probe, so the
    // count is asserted non-vacuous BEFORE it is used as a denominator. Without this the row
    // comparison below would pass over an empty table on a renamed context field.
    assert.ok(declared > 1,
      `the page reports ${declared} declared quantities for a model with nine allocations and a `
      + "ceiling — the context field was renamed, so this test is measuring nothing");
    assert.ok(budget.rows.length > 0, "the allocation table has no rows");
    // The ceiling is a declared quantity and not an allocation, so the table is one row shorter.
    assert.equal(budget.rows.length, declared - 1,
      `${budget.rows.length} allocation rows against ${declared} declared quantities (one is the ceiling)`);

    // The four facts section 11 asks to be obvious. Matched by shape, not by sentence: a reworded
    // label is not a regression, a missing figure is.
    assert.match(budget.text, /Allocation/, "no allocation table header");
    assert.ok(budget.footRows.some((r) => r[0] === "Total"), `no total row: ${JSON.stringify(budget.footRows)}`);
    assert.ok(budget.footRows.some((r) => r[0] === "Declared ceiling"), "no declared ceiling row");
    assert.ok(budget.footRows.some((r) => r[0] === "Margin" || r[0] === "Over by"), "no margin row");
    assert.match(budget.text, /Largest single allocation/, "the largest allocation is not named");

    // The figures are in the DECLARED unit, not the dimension's base. This is the assertion that
    // would have caught a 256 KiB budget reaching the page as "0.25".
    const unit = await page.evaluate(() => {
      const head = document.querySelectorAll("#model-budget thead th")[2];
      return (head?.textContent ?? "").trim();
    });
    assert.match(unit, /\(KB\)/, `the amount column is not in the declared unit: "${unit}"`);
    assert.ok(!/0\.2265625/.test(budget.text), "a base-unit figure reached the page");

    // The picture is present AND hidden from the accessibility tree, because every fact it draws is
    // in the text above it. A second announcement of the same numbers is noise, not redundancy.
    assert.ok(budget.svgCount >= 1, "no budget drawing was rendered");
    assert.equal(budget.figureHidden, true, "the budget figure is not aria-hidden, so its marks announce twice");
    // And the key states what the drawing's channels mean, for a reader who does not get it.
    assert.ok(budget.keyTerms.length > 0, "the drawing carries no key");
  });

  it("no fallback string appears where a budget should be", async () => {
    await loadSystem("embedded-sensor-node");
    const budget = await readBudget();
    for (const fallback of ["undefined", "NaN", "null", "[object Object]", "Infinity"]) {
      assert.ok(!budget.text.includes(fallback),
        `the budget region contains the fallback string "${fallback}": "${budget.text}"`);
    }
  });

  it("switching from the sensor node back to a quantity-free system clears the region", async () => {
    // The repaint path, which is where a stale panel would survive: a region painted once and never
    // cleared would show the previous system's budget beside the current system's model.
    await loadSystem("embedded-sensor-node");
    assert.equal((await readBudget()).empty, false);
    await loadSystem("message-bus");
    const after = await readBudget();
    assert.equal(after.empty, true, `a stale budget survived the reload: "${after.text}"`);
  });
});
