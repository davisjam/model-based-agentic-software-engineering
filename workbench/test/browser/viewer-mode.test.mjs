/**
 * The viewer/advanced mode toggle, in the browser that actually applies it.
 *
 * The node tier pins the markup facts (viewer-mode-contract.test.ts): the page ships
 * body[data-mode="viewer"], the stylesheet rule, and the advanced-only class on every authoring
 * surface. What only a browser can see is the LIVE behaviour: that the rule actually removes the
 * surfaces from rendering and the tab order, that the toggle restores them, and that the property
 * rail — the viewer's explanation surface — still offers claims, verdicts and "Show on model".
 *
 * Every probe here asserts its own preconditions: a probe that cannot find the toggle, the ask
 * bar, or a property row fails loudly rather than reporting success over an empty set.
 *
 * NOTE the harness seeds sessionStorage with wb-mode=advanced for the rest of the tier (its
 * fixtures drive the authoring surfaces). This file therefore starts from ADVANCED and drives the
 * toggle itself — the shipped DEFAULT is the node tier's markup fact, not re-proven here.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startServerOnFreePort, launchBrowser, shutdown, openWorkbench, loadFlagshipExample,
} from "./harness.mjs";

let server;
let browser;
let page;
let origin;

const visible = (id) => page.evaluate((elementId) => {
  const el = document.getElementById(elementId);
  if (el === null) return { exists: false, visible: false };
  // offsetParent is null for display:none (and for <dialog>/fixed, which none of these are).
  return { exists: true, visible: el.offsetParent !== null || el.tagName === "BODY" };
}, id);

const mode = () => page.evaluate(() => document.body.dataset.mode ?? "(unset)");

before(async () => {
  ({ server, origin } = await startServerOnFreePort());
  browser = await launchBrowser();
  ({ page } = await openWorkbench(browser, origin));
  const { context } = await loadFlagshipExample(page);
  assert.ok(context.counts.entities > 0,
    "precondition: the flagship example must load through window.mage");
});

after(async () => { await shutdown({ browser, server }); });

describe("the viewer/advanced mode toggle", () => {
  it("starts from the harness's advanced seed with the authoring surfaces offered", async () => {
    assert.equal(await mode(), "advanced", "precondition: the harness seeds advanced mode");
    for (const id of ["askbar", "add-menu", "inspector-actions", "new-system"]) {
      const v = await visible(id);
      assert.ok(v.exists, `precondition: #${id} must exist in the document`);
      assert.ok(v.visible, `#${id} must be offered in advanced mode`);
    }
  });

  it("one toggle click makes the page a viewer: authoring surfaces leave rendering and tab order", async () => {
    const t = await visible("advanced-toggle");
    assert.ok(t.exists && t.visible, "precondition: the Advanced toggle must be on the page");
    await page.click("#advanced-toggle");
    assert.equal(await mode(), "viewer");
    assert.equal(
      await page.evaluate(() =>
        document.getElementById("advanced-toggle").getAttribute("aria-pressed")),
      "false",
    );
    for (const id of ["askbar", "add-menu", "inspector-actions", "new-system", "undo", "redo",
      "palette-open", "whatif-arm", "edit", "system-browser"]) {
      const v = await visible(id);
      assert.ok(v.exists, `#${id} must STAY in the document — hidden, never deleted`);
      assert.ok(!v.visible, `#${id} must not be offered in viewer mode`);
    }
    // The ask bar's text field is out of the TAB ORDER, not merely out of sight.
    const askFocusable = await page.evaluate(() => {
      const input = document.getElementById("ask-text");
      if (input === null) return { exists: false, focusable: false };
      input.focus();
      return { exists: true, focusable: document.activeElement === input };
    });
    assert.ok(askFocusable.exists, "precondition: #ask-text must exist in the document");
    assert.ok(!askFocusable.focusable, "a display:none field must refuse focus");
  });

  it("the viewer keeps the inspection surfaces, the property rail, and Show on model", async () => {
    assert.equal(await mode(), "viewer", "precondition: the previous probe left viewer mode on");
    for (const id of ["nav", "workspace", "inspector", "export", "run", "reset"]) {
      const v = await visible(id);
      assert.ok(v.exists && v.visible, `#${id} is an inspection surface and must stay offered`);
    }
    const rail = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("#question-list li[data-property]")];
      return {
        count: rows.length,
        withShow: rows.filter((r) => [...r.querySelectorAll("button")]
          .some((b) => (b.textContent ?? "").trim() === "Show on model")).length,
      };
    });
    assert.ok(rail.count > 0,
      "precondition: the message-bus example must track at least one property");
    assert.equal(rail.withShow, rail.count, "every claim row offers Show on model");
  });

  it("window.mage still mutates in viewer mode — the agent path is untouched", async () => {
    assert.equal(await mode(), "viewer", "precondition: viewer mode still on");
    const r = await page.evaluate(() => window.mage.transact({
      transaction: {
        base: window.mage.context().hash,
        operations: [{ op: "add-entity", id: "viewer-probe-entity", label: "Viewer probe" }],
      },
    }));
    assert.ok(r.ok, `the agent's transaction was refused: ${JSON.stringify(r.findings ?? r)}`);
    const entity = await page.evaluate(() =>
      window.mage.inspect().entities.find((e) => e.id === "viewer-probe-entity") ?? null);
    assert.ok(entity !== null, "the agent's edit must land while the page is a viewer");
  });

  it("the toggle restores the authoring surfaces", async () => {
    await page.click("#advanced-toggle");
    assert.equal(await mode(), "advanced");
    for (const id of ["askbar", "new-system"]) {
      const v = await visible(id);
      assert.ok(v.exists && v.visible, `#${id} must come back in advanced mode`);
    }
  });
});
