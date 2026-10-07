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

/**
 * The announcer debounces 250ms on REAL time, and nothing in this file grants virtual time (a
 * granted budget PAUSES the page clock — the harness's own caveat), so the honest wait is on the
 * CONTENT: capture #live, act, wait for it to differ. Bounded, and failing loudly if no
 * announcement ever lands.
 */
const liveText = (page) => page.evaluate(() =>
  (document.getElementById("live")?.textContent ?? "").replace(/\s+/g, " ").trim());
const nextAnnouncement = async (page, prior) => {
  await page.waitForFunction((p) => {
    const t = (document.getElementById("live")?.textContent ?? "").replace(/\s+/g, " ").trim();
    return t !== "" && t !== p;
  }, { timeout: 30_000 }, prior);
  return liveText(page);
};

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
    // Leave the suite in VIEWER mode for the probes below — they are about the viewer's own
    // surface, and running them against Advanced would prove nothing about the default.
    await page.click("#advanced-toggle");
    assert.equal(await mode(), "viewer");
  });
});

describe("the Refresh control", () => {
  it("is offered in the viewer, enabled with a model loaded, and takes keyboard focus with a visible ring", async () => {
    assert.equal(await mode(), "viewer", "precondition: viewer mode on");
    const state = await page.evaluate(() => {
      const el = document.getElementById("refresh");
      if (el === null) return { exists: false };
      return {
        exists: true,
        visible: el.offsetParent !== null,
        disabled: el.disabled,
        label: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
      };
    });
    assert.ok(state.exists, "precondition: #refresh must be on the page");
    assert.ok(state.visible, "Refresh is the viewer's own control");
    assert.ok(!state.disabled, "a loaded model means Refresh is enabled");
    assert.equal(state.label, "↻ Refresh");
    // KEYBOARD focus, not programmatic: :focus-visible fires for key-driven focus, and the ring
    // is the global `:focus-visible { outline: 3px solid … }` rule. Focus the PRECEDING enabled
    // control, press Tab once, and assert both where focus landed and what it looks like — a
    // walk from an arbitrary position would wander a loaded page's dozens of stops.
    await page.evaluate(() => document.getElementById("run").focus());
    await page.keyboard.press("Tab");
    const landed = await page.evaluate(() => document.activeElement?.id ?? "(none)");
    assert.equal(landed, "refresh", "Tab from the control before it must land on Refresh");
    const ring = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement, null);
      return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth };
    });
    assert.notEqual(ring.outlineStyle, "none", "keyboard focus must draw a visible ring");
    assert.notEqual(parseFloat(ring.outlineWidth), 0, "the focus ring must have width");
  });

  it("acknowledges every press, and says when nothing changed since the last refresh", async () => {
    let prior = await liveText(page);
    await page.click("#refresh");
    const first = await nextAnnouncement(page, prior);
    assert.match(first, /^Refreshed\./, "the first press acknowledges");
    assert.match(first, /re-evaluated/, "the first press states what it re-read");
    prior = first;
    await page.click("#refresh");
    const second = await nextAnnouncement(page, prior);
    assert.match(second, /Nothing has changed since your last refresh/,
      "an unchanged revision is acknowledged, not silent");
  });

  it("after an agent edit, Refresh reports the change — and mutates nothing itself", async () => {
    const before = await page.evaluate(() => window.mage.context().hash);
    const r = await page.evaluate(() => window.mage.transact({
      transaction: {
        base: window.mage.context().hash,
        operations: [{ op: "add-entity", id: "refresh-probe-entity", label: "Refresh probe" }],
      },
    }));
    assert.ok(r.ok, `precondition: the agent's transaction must land: ${JSON.stringify(r.findings ?? r)}`);
    const prior = await liveText(page);
    await page.click("#refresh");
    const said = await nextAnnouncement(page, prior);
    assert.match(said, /Refreshed\. The workbench shows the current revision/,
      "a changed revision takes the changed acknowledgement");
    const after = await page.evaluate(() => window.mage.context().hash);
    assert.notEqual(after, before, "precondition: the transact moved the hash");
    await page.click("#refresh");
    const finalHash = await page.evaluate(() => window.mage.context().hash);
    assert.equal(finalHash, after, "Refresh itself must never move the revision");
  });
});

describe("verdict marks reach the properties rail", () => {
  it("every rail glyph matches the evaluated status, and conclusive verdicts render as ✓/✗", async () => {
    // The parity claim: the glyph on each rail row is the mark of the status window.mage reports
    // for the same property — one table, two surfaces. Preconditions first: properties must
    // exist, and at least one must be conclusively evaluated, else the ✓/✗ half of the probe
    // would pass over an empty set.
    const evaluated = await page.evaluate(() => window.mage.properties().map((p) => ({
      id: p.id, status: p.status, stale: p.stale ?? false,
    })));
    assert.ok(evaluated.length > 0, "precondition: the flagship must track properties");
    const conclusive = evaluated.filter((p) =>
      !p.stale && (p.status === "established" || p.status === "refuted"));
    assert.ok(conclusive.length > 0,
      "precondition: the flagship must conclusively evaluate at least one property — "
      + `statuses seen: ${JSON.stringify(evaluated.map((p) => p.status))}`);
    const marks = await page.evaluate(() => [...document
      .querySelectorAll("#question-list li[data-property]")]
      .map((li) => ({
        id: li.dataset.property,
        glyph: (li.querySelector(".mark")?.textContent ?? "").trim(),
      })));
    assert.equal(marks.length, evaluated.length, "one rail row per evaluated property");
    const GLYPH = { established: "✓", refuted: "✗" };
    for (const p of conclusive) {
      const row = marks.find((m) => m.id === p.id);
      assert.ok(row !== undefined, `rail row for ${p.id} must exist`);
      assert.equal(row.glyph, GLYPH[p.status],
        `${p.id} is ${p.status}; its rail glyph must say so`);
    }
  });
});
