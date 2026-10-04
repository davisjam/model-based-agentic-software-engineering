// A scrollable region must be reachable by keyboard — pinned STRUCTURALLY, because the symptom is
// viewport-dependent and the viewport-dependent check cannot be trusted locally.
//
// ## The incident this exists for (261004)
//
// The Learn reframe landed a `div.scroll` table wrapper with no `tabindex`. `npm run test:a11y`
// passed locally — twice, the second time against a freshly built bundle — and CI's FR-A11Y tier
// failed the same assertion:
//
//     learn.html twins: zero violations
//     axe found 1 violation(s): scrollable-region-focusable [serious] @ #question-agents > .scroll
//
// Neither run was wrong. `scrollable-region-focusable` fires only when a region ACTUALLY overflows,
// and whether a table overflows depends on viewport width and font metrics. CI's headless browser
// overflowed it; the local one did not. So the axe tier is a true check with a false sense of
// coverage: green locally means "it did not overflow HERE", not "a keyboard user can reach it".
//
// ## Why this test is shaped the way it is
//
// The remedy is therefore NOT to make the local axe run match CI's metrics — that chases the
// symptom and would re-break the day a font changes. It is to pin the INVARIANT the fix establishes:
// **every scroll container on this page is focusable, whether or not it happens to overflow right
// now.** That claim is independent of viewport, so it holds the same verdict in both environments,
// which is the property the axe check lacks.
//
// This is the same discipline the repo applied to the a11y flake earlier in the session: a load
// changes a test's DURATION and never its verdict. Here, a viewport changes whether axe LOOKS and
// never whether the markup is correct.
//
// ## What would defeat it
//
//   - A scrollable region built with a class other than `.scroll`. The selector is the contract;
//     a second spelling would be invisible here. `rowsTable` in `src/learn/main.ts` is the one
//     constructor today, and its doc comment says so.
//   - A region that scrolls because of CSS applied to something this selector does not match
//     (an ancestor with `overflow`), which axe would still flag and this would not.
//
// Both are named rather than left for a reader to find. The axe tier remains the backstop for the
// second; this test exists so the FIRST class — the one that actually bit us — fails fast and in
// every environment.
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

import {
  WORKBENCH_DIR, startServerOnFreePort, launchBrowser, shutdown,
} from "./harness.mjs";

// The page, from the module that owns it rather than a string: the page and the gate must not be
// free to drift to the same wrong answer together.
import { LEARN_PAGE } from "../../src/app/learn.ts";

let server;
let browser;
let origin;

before(async () => {
  ({ server, origin } = await startServerOnFreePort(WORKBENCH_DIR));
  browser = await launchBrowser();
}, { timeout: 60_000 });

after(async () => { await shutdown({ browser, server }); });

describe("Learn's scrollable regions are keyboard-reachable", () => {
  it("every .scroll container carries a tabindex, overflowing or not", async () => {
    const page = await browser.newPage();
    await page.goto(`${origin}/${LEARN_PAGE}`, { waitUntil: "load" });

    // Wait on the page's OWN readiness mark, not on a selector guessed from the outside. `main.ts`
    // installs `window.mageLearn.ready` for exactly this, and `a11y/axe.test.mjs` says why it is the
    // right contract: it marks the derivation complete, which `load` and `networkidle0` do not. A
    // `load`-only probe reads a document the app has not filled yet and reports zero containers —
    // a blind probe reporting a clean page, which is the failure mode the assertion below refuses.
    await page.waitForFunction(() => window.mageLearn?.ready === true, { timeout: 30_000 });

    const found = await page.evaluate(() => {
      const out = [];
      for (const node of document.querySelectorAll(".scroll")) {
        // The section id is what the axe failure names, so report in the same vocabulary the
        // CI diagnostic uses — a finding a reader cannot locate costs a round trip.
        const section = node.closest("[id]");
        out.push({
          where: section ? `#${section.id} > .scroll` : ".scroll",
          tabindex: node.getAttribute("tabindex"),
          scrolls: node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight,
        });
      }
      return out;
    });

    // A page with no scroll containers would pass every assertion below while proving nothing —
    // the vacuity hole this repo has twice found in its own gates. Refuse it.
    assert.ok(found.length > 0,
      `no .scroll container found on ${LEARN_PAGE} — the selector this gate is written against no ` +
      "longer matches the page, so the gate is measuring nothing rather than finding nothing wrong");

    const unfocusable = found.filter((f) => f.tabindex === null);
    assert.deepEqual(unfocusable, [],
      "a scrollable region must be reachable by keyboard (WCAG 2.1.1; axe " +
      "scrollable-region-focusable). Note that `scrolls` is NOT part of this claim: a container " +
      "that does not overflow at this viewport may overflow at another, which is exactly how this " +
      "reached CI once already.");

    await page.close();
  });
});
