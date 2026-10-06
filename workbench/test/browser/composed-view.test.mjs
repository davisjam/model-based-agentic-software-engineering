// The composed view, driven the way a §6.7 student reaches it.
//
// The lab's climax is `lease-held-while-processing` — the cross-model safety property whose
// vocabulary spans `job-lifecycle` and `job-lease`. Before this surface existed the workbench
// answered that property while PRESENTING the two machines as unrelated peers, so the student
// watched a verdict flip with no way to see over what the inference travelled. This file walks
// the real click-path in a real browser and asserts the three §23 moments:
//
//   1. activating the cross-model claim in the rail composes the models it spans, with the
//      BINDING between them and the property's own constraint drawn;
//   2. the binding's reading quotes the registry — interpretation, licensing, witness — and
//      reaches the declaration that establishes it;
//   3. the Navigate rail reads as topology ("Where models meet") and the subject list OFFERS the
//      composed view the model encodes, alongside the one-model views.
//
// The words asserted here are compared against the REGISTRY'S OWN FIELDS, imported from the
// engine — never retyped — so this file cannot pass while the page drifts from the one
// composition semantics.
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  startServerOnFreePort, launchBrowser, shutdown, openWorkbench, WORKBENCH_DIR,
} from "./harness.mjs";
import { BINDINGS } from "../../src/engine/model-types.ts";

const LEASE = "lease-held-while-processing";
const MACHINE_OF_ENTITY = BINDINGS.find((b) => b.name === "machine-of-entity");

let server;
let browser;
let page;
let diagnostics;

before(async () => {
  const started = await startServerOnFreePort();
  server = started.server;
  browser = await launchBrowser();
  ({ page, diagnostics } = await openWorkbench(browser, started.origin));
  const text = await readFile(
    join(WORKBENCH_DIR, "examples", "worker-queue", "system.mage.yaml"), "utf8");
  await page.evaluate((source) => { window.mage.load(source); }, text);
  await page.waitForSelector("#question-list [data-property]");
});

after(async () => { await shutdown({ browser, server }); });

test("the subject list offers the composed view the model encodes", async () => {
  const options = await page.evaluate(() =>
    [...document.querySelectorAll("#diagram-subject option")].map((o) => ({
      value: o.value, label: o.textContent,
    })));
  const composed = options.find((o) => o.value === "composed:job");
  assert.ok(composed !== undefined,
    `the Draw list must offer the derived composed view; got ${options.map((o) => o.value)}`);
  assert.ok(composed.label.includes("bound on job"),
    `the offering names the shared element, got: ${composed.label}`);
});

test("the Navigate rail reads as topology, not a flat list of peers", async () => {
  const meetings = await page.evaluate(() =>
    [...document.querySelectorAll('#nav-models a[data-rail="binding"]')].map((a) => ({
      arg: a.dataset["arg"], text: a.textContent ?? "",
    })));
  assert.equal(meetings.length, 2, "both machines meet Worker Pool on job");
  for (const m of meetings) {
    assert.ok(m.text.includes("job"), `the meeting names the shared element: ${m.text}`);
    assert.ok(m.text.includes("bound by: machine-of-entity"),
      `the registry's own binding name labels the meeting: ${m.text}`);
  }
});

test("selecting the cross-model property composes the models, the binding, and the constraint", async () => {
  const link = await page.$(`#question-list a[data-rail="compose"][data-arg="${LEASE}"]`);
  assert.ok(link !== null,
    "the cross-model claim's rail row must offer the composed view, not a one-model explain");
  await link.click();
  await page.waitForSelector("#canvas svg.mage-xmodel-canvas");

  const canvas = await page.evaluate(() => {
    const svg = document.querySelector("#canvas svg.mage-xmodel-canvas");
    return {
      panels: [...svg.querySelectorAll("[data-panel]")].map((g) => g.dataset["panel"]),
      bindings: [...svg.querySelectorAll("[data-xmodel]")].map((g) => g.dataset["xmodel"]),
      constraint: svg.querySelector('[data-layer="property-constraint"]') !== null,
      constraintText: [...svg.querySelectorAll('[data-layer="property-constraint"] text')]
        .map((t) => t.textContent).join(" "),
    };
  });
  assert.deepEqual(canvas.panels,
    ["machine:job-lifecycle", "model:worker-pool", "machine:job-lease"],
    "the shared entity's model sits BETWEEN the machines it corresponds — the middle is the join");
  assert.deepEqual([...new Set(canvas.bindings)], ["machine-of-entity"]);
  assert.ok(canvas.constraint, "the property's own constraint is drawn, in its own layer");
  assert.ok(canvas.constraintText.startsWith("property requires:"),
    `the constraint says what it is, never 'bound by': ${canvas.constraintText}`);

  const head = await page.evaluate(() => ({
    text: document.getElementById("principal-purpose")?.textContent ?? "",
    back: document.querySelector("#principal-purpose a[data-composed-exit]") !== null,
  }));
  assert.ok(head.text.includes("The job is never in processing while no worker holds its lease"),
    "the workspace leads with the claim, in the author's words");
  assert.ok(head.back, "the way back to the one-model view is offered where the claim is stated");
});

test("the binding's reading quotes the registry and reaches the declaration", async () => {
  assert.ok(MACHINE_OF_ENTITY !== undefined);
  const reading = await page.evaluate(() => {
    const details = document.querySelector('#model-contents details[data-binding="machine-of-entity"]');
    if (details === null) return null;
    return {
      summary: details.querySelector("summary")?.textContent ?? "",
      body: details.textContent ?? "",
      declarations: [...details.querySelectorAll("a[data-composed-draw]")]
        .map((a) => a.dataset["composedDraw"]),
    };
  });
  assert.ok(reading !== null, "the composition reading carries the binding as a disclosure");
  assert.ok(reading.summary.startsWith("bound by: machine-of-entity"));
  assert.ok(reading.body.includes(MACHINE_OF_ENTITY.interpretation),
    "the interpretation is the registry's own sentence, verbatim");
  assert.ok(reading.body.includes(MACHINE_OF_ENTITY.declaredBy.file)
    && reading.body.includes(MACHINE_OF_ENTITY.declaredBy.symbol),
    "the reading names where the correspondence is authored");
  // "Clicking the join takes me to whatever declaration establishes it": each machine authored
  // `entity: job`, and the reading links to each declaring machine.
  assert.deepEqual(reading.declarations.sort(),
    ["machine:job-lease", "machine:job-lifecycle"]);
});

test("the constraint is stated in words beside the drawing, with its ends named", async () => {
  const block = await page.evaluate(() =>
    document.querySelector("#model-contents [data-constraint]")?.textContent ?? "");
  assert.ok(block.includes("property requires:"));
  assert.ok(block.includes("processing") && block.includes("free"),
    "the two control states the constraint names are named in words too");
});

test("leaving the composition returns to the one-model view", async () => {
  await page.click("#principal-purpose a[data-composed-exit]");
  await page.waitForFunction(() =>
    document.querySelector("#canvas svg.mage-xmodel-canvas") === null
    && document.querySelector("#canvas svg") !== null);
  const summaryText = await page.evaluate(() =>
    document.getElementById("model-reading-summary")?.textContent ?? "");
  assert.equal(summaryText, "The model in words",
    "the reading's summary names the one-model view again");
});

test("the page logged no errors while the composition was driven", () => {
  assert.deepEqual(diagnostics.pageErrors, [], "no uncaught exception");
  assert.deepEqual(diagnostics.consoleErrors, [], "no console error");
  assert.deepEqual(diagnostics.requestFailures, [], "no failed request");
});
