// Every served page, and how to drive it into the state the F-6 properties are measured in.
//
// Shared by the gate (`wcag-f6.test.mjs`) and the reporting script (`scripts/measure-wcag-f6.mjs`)
// so the two cannot measure different pages. The axe suite keeps its own, richer register: it walks
// four states per page because a violation hides in a state, while these three properties are
// properties of a PAINTED page -- there is no focus ring, no contrast ratio and no column count
// until something is on screen. So one state each, the fullest one, driven the same way.
//
// `learn.html` is in the list on the same ground the axe suite states: FR-A11Y-1 says "the entire
// MAGE Workbench", and a page that no probe opens is a page measured by nothing. The record's one
// shipped contrast defect was also the one on the page that had never been audited.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { WORKBENCH_DIR } from "../harness.mjs";

export const PAGES = [
  {
    name: "index.html",
    path: "index.html",
    ready: () => typeof window.mage === "object",
    /**
     * The loaded workspace, with a selection. Loaded, because SH-I1 unmounts every region but
     * Start on a fresh page -- a pristine workbench has a handful of tab stops and one grid
     * column, so it can exhibit neither the focus-ring variety nor the 2-D divergence D-2 is
     * about. (It gained two with the persistent page nav; the argument does not turn on the
     * count.) Selected,
     * because the renderer draws the un-haloed legend and glyph only under emphasis, and those two
     * texts are the ones the dark theme broke.
     */
    drive: async (page) => {
      const yaml = await readFile(join(WORKBENCH_DIR, "examples", "message-bus", "system.mage.yaml"), "utf8");
      await page.evaluate((text) => window.mage.load(text), yaml);
      await page.waitForFunction(() => document.querySelectorAll("#sections table").length > 0, { timeout: 30_000 });
      await page.evaluate(() => window.mage.view.select(["analytics", "order-created"]));
      await page.waitForFunction(() => document.querySelector("#canvas .mage-legend") !== null, { timeout: 30_000 });
    },
    diagram: { hosts: "#canvas", root: "#canvas" },
  },
  {
    name: "learn.html",
    path: "learn.html",
    ready: () => window.mageLearn?.ready === true,
    /**
     * A node selected in every figure, and every text twin expanded. Selection for the same reason
     * as the workspace; the twins because a closed `<details>` paints nothing, so its prose would
     * be measured by neither the contrast walk nor the reflow probe while still being content a
     * reader opens.
     */
    drive: async (page) => {
      const pickers = await page.evaluate(() => {
        const all = [...document.querySelectorAll("figure.learn-figure select")];
        for (const picker of all) {
          const first = [...picker.options].map((o) => o.value).find((v) => v !== "");
          if (first === undefined) continue;
          picker.value = first;
          picker.dispatchEvent(new Event("change"));
        }
        for (const d of document.querySelectorAll("figure.learn-figure details")) d.open = true;
        return all.length;
      });
      await page.waitForFunction(
        (n) => document.querySelectorAll(".canvas .mage-legend").length === n,
        { timeout: 30_000 }, pickers,
      );
    },
    diagram: { hosts: "figure.learn-figure .canvas", root: ".canvas" },
  },
];
