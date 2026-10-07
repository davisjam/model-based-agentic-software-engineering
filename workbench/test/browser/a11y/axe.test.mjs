/**
 * FR-A11Y-1: a real axe-core audit of EVERY served page, in the states that matter.
 *
 * The landed browser tier asserted three accessibility properties by hand -- no unlabelled control,
 * `#canvas` aria-hidden, canvas last. That is a floor. It says nothing about heading order, landmark
 * structure, label-for targets, ARIA validity, contrast, or the forty other rules a conformance
 * claim rests on, and it only ever looked at ONE state.
 *
 * States, because an a11y defect in these pages is far likelier to be in a state than in the
 * markup. The workspace has four: the empty workbench is Start alone (SH-I1 unmounts every other
 * region), a loaded model fills nine option lists and three tables, an open hypothesis unhides a
 * button bar and paints a banner, and a populated property list adds evidence lists and status
 * chips. The Learn gallery has three: the landing paint, a node selected in every figure, and the
 * text twins expanded. A boot-time-only scan would see the first of each and miss the rest.
 *
 * PARAMETERISED over `PAGES` rather than forked per page, and that is the whole shape of this
 * file. Two audit files would be two copies of one set of assertions -- the zero-violation claim,
 * the rules-actually-matched floor, the incomplete-rule inventory, the SVG contrast measurement --
 * and the copies would drift, with the second page's copy the one that quietly rots. What differs
 * between the pages is only how each is driven, so only that is per-page data: a readiness mark
 * (`window.mage` on the workspace, `window.mageLearn.ready` on Learn), an ordered list of states,
 * and where the renderer paints. One server serves both -- the fixture serves the whole workbench
 * root -- and one browser drives both, so the second page costs a tab, not a Chromium.
 *
 * MEASURED at this commit, on the pinned Chromium, with axe-core 4.12.1 over
 * wcag2a + wcag2aa + wcag21a + wcag21aa + best-practice:
 *
 *     index.html  empty workbench        0 violations   39 rules passed
 *     index.html  loaded example         0 violations   48 rules passed
 *     index.html  properties populated   0 violations   48 rules passed
 *     index.html  hypothesis open        0 violations   20 rules passed   (modal scope)
 *     learn.html  landing                0 violations   45 rules passed
 *     learn.html  node selected          0 violations   45 rules passed
 *     learn.html  twins open             0 violations   45 rules passed
 *
 * and in every state that drew a diagram ONE incomplete: `color-contrast`, on the SVG text.
 *
 * The workspace's loaded states are 48 here where the record above this wave said 47. Nothing in
 * this change touched that page; a sibling wave made one more rule applicable, and the number is
 * re-measured rather than left as the older run's claim.
 *
 * The hypothesis state's 20 is the one number that FELL, and it is a change of SCOPE rather than a
 * regression: wave 2c replaced the hypothesis banner with a native modal `<dialog>`, so the page
 * behind it is blocked from the accessibility tree and axe reports the dialog. The same open
 * hypothesis measures 48 as a non-modal dialog. Because a rule count at modal scope cannot tell a
 * full review surface (20) from one with its lists emptied (19) or its two buttons deleted (17),
 * that state now carries a `covers` post-condition naming the content axe must have been able to
 * reach, and its floor is demoted to the only thing a number can still honestly claim there --
 * that axe ran. Nothing is excluded and no violation is tolerated; the zero stays a zero.
 *
 * That incomplete was load-bearing. axe cannot resolve an SVG `fill` against an SVG ancestor's
 * paint, so it declines to judge the diagram's labels -- and the diagram's labels were the one
 * place the workspace page failed 1.4.3. `figure svg` took its background from `var(--panel)`,
 * while the renderer's stylesheet is a fixed light palette it cannot change (the SVG is exported
 * standalone, so it cannot read page custom properties). In the dark theme that painted `#11151c`
 * ink on a `#201e16` ground: the emphasis glyph and the mark legend -- the TEXTUAL equivalents of
 * the visual emphasis channel, which FR-A11Y-2 requires -- came out at 1.1:1 where AA asks 4.5:1.
 * Learn pins its figure ground to `#ffffff` for the same reason and measures 8.55:1 at worst.
 *
 * Learn's first audit, in this change, found two real defects and both are fixed rather than
 * enumerated, so these checks stay BLOCKING at zero. `duplicate-id-aria` at CRITICAL: the renderer
 * derives the SVG's `title`/`desc` ids from the subject, two of the gallery's four figures draw the
 * same subject, and both `aria-labelledby` references resolved to the first figure's nodes. And
 * `color-contrast` at SERIOUS: Learn is the first page to style prose links and pointed them at
 * `--accent`, a fill token, which measures 4.47:1 as ink on the page ground. Had either not been
 * fixable here, this suite would have landed non-blocking with the enumeration -- the project's
 * rule is drain-then-promote, and a blocking-red gate breaks every agent committing through it.
 *
 * Nothing is suppressed. No rule is disabled, no node is excluded, no result is downgraded. The
 * incomplete is reported in the receipt and answered by a check of our own rather than waved past.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  startServerOnFreePort, launchBrowser, shutdown, openServedPage, writeReceipt,
  WORKBENCH_DIR, AXE_RECEIPT_PATH,
} from "../harness.mjs";
import {
  loadAxeSource, runAxe, describeFindings, svgTextContrast, contrastFailures,
  auditableNodes, unauditable,
} from "./axe.mjs";

/**
 * The server's port comes from the OS, read back after it binds. The hard-coded 8144 this replaces
 * separated the tiers inside one process and contended with every concurrent run of the same tier,
 * and a lost bind is not merely a red: it can take a whole file's tests out of the count while the
 * runner prints success. See `startServerOnFreePort`.
 */
let ORIGIN;

/**
 * Every served page, with how to reach each of its states.
 *
 * A `state` is a name, the rule-count floor axe must clear in it, and a `drive` that takes the page
 * from the PREVIOUS state to this one -- states run in declaration order and accumulate, because
 * that is how a user reaches them. `diagram` is declared only by a page the renderer paints on: a
 * host selector (`hosts`, the elements that should each hold an SVG), the measurement root, and the
 * emphasis the contrast check needs.
 */
const PAGES = [
  {
    name: "index.html",
    path: "index.html",
    ready: () => typeof window.mage === "object",
    states: [
      // 1. the empty workbench -- every editing fieldset disabled, no model, no tables.
      //
      // The empty state's floor is LOWER than the others, and the asymmetry is the shell's doing
      // rather than a weakened gate: SH-I1 reduces a pristine page to the header plus Start, so
      // the tables, the option lists, the property blocks and the editing fieldsets that made the
      // old empty page score 40 are simply not in the document until a model arrives. 39 measured.
      { name: "empty", floor: 20, drive: async () => { /* the page as served */ } },
      {
        // 2. a loaded example. Through `window.mage.load` deliberately: this suite audits the
        //    RENDERED page, and how the model arrived is the keyboard suite's question, not this
        //    one's.
        name: "loaded",
        floor: 30,
        drive: async (page) => {
          const yaml = await readFile(join(WORKBENCH_DIR, "test", "fixtures", "examples", "message-bus", "system.mage.yaml"), "utf8");
          await page.evaluate((text) => window.mage.load(text), yaml);
          await page.waitForFunction(() => document.querySelectorAll("#sections table").length > 0, { timeout: 30_000 });
        },
      },
      {
        // 3. the property list populated AND carrying evidence. The flagship ships six saved
        //    questions, so this state is the loaded one plus a run; assert it is actually populated
        //    rather than trusting that it is.
        name: "properties",
        floor: 30,
        drive: async (page) => {
          await page.waitForFunction(() => document.querySelectorAll("#question-list > *").length > 0, { timeout: 30_000 });
        },
      },
      {
        // 4. a hypothesis open -- the REVIEW CHANGE surface, which carries a pair of buttons no
        //    other state has.
        //
        // This state's floor is 15 where every other loaded state's is 30, and the asymmetry is the
        // audited SCOPE rather than a weakened gate. Wave 2c made this surface a native modal
        // `<dialog>` (DESIGN-shell-261002.md §9e), so the page behind it is blocked from the
        // accessibility tree and `axe.run(document)` reports the dialog. Measured here: the same
        // open hypothesis scores 48 rules as a non-modal dialog and 20 as the modal it now is. A
        // floor of 30 is therefore unreachable by construction, and the earlier record of "48 rules
        // passed" in this file's header described a banner that no longer exists.
        //
        // The floor is not what guards this state against vacuity any more, because at modal scope
        // it cannot: emptying the change and impact lists scores 19, deleting both buttons too
        // scores 17, and no number separates those from 20. `covers` is the guard instead -- the
        // state names the content axe must have been able to see, and `auditableNodes` checks each
        // against the top layer. The number stays only as a floor under "axe ran at all".
        name: "hypothesis",
        floor: 15,
        covers: [
          // The dialog itself, open and in the top layer.
          "#hypothesis-bar[open]",
          // Both ways out. A review surface audited without its Discard is the trap §5 names.
          "#hypothesis-apply",
          "#hypothesis-discard",
          // The rendered review, which is emptied on close -- so these matching is the proof that
          // this scan saw an OPEN review and not the shell of one.
          "#review-changes li",
          "#review-impact li",
          "#review-headline",
          "#review-requirements",
        ],
        drive: async (page) => {
          await page.evaluate(() => window.mage.hypothesis.open("axe-audit", {
            transaction: {
              base: window.mage.context().hash,
              target: "axe-audit",
              operations: [{ op: "add-entity", id: "audit-probe", label: "Audit Probe" }],
            },
          }));
          await page.waitForFunction(() => document.getElementById("hypothesis-bar").hidden === false, { timeout: 30_000 });
        },
      },
      {
        // 5. the Add-model dialog, open -- the only state in which the model-type picker and its
        //    Learn escape are in the document at all.
        //
        // IT IS HERE BECAUSE THE SURFACE WAS OTHERWISE OUTSIDE EVERY STATE THIS FILE SWEEPS. The
        // contextual Learn routes added three buttons and a link inside `#edit-dialog`, and a
        // control in a closed `<dialog>` is in no accessibility tree — so the tier would have
        // reported 111 passing over a surface it never looked at. That is the repo's own
        // "a gate exists and the path meant to run it does not reach it" class, read from the
        // other side: a new surface has to be brought into the gate's reach, not merely not break
        // it.
        //
        // The floor is 15 for the hypothesis state's reason, unchanged: this is a native modal, so
        // `axe.run(document)` audits the dialog and the page behind it is blocked from the tree. The
        // number is a floor under "axe ran at all"; `covers` is what gives the state teeth.
        name: "add-model-dialog",
        floor: 15,
        covers: [
          "#edit-dialog[open]",
          // The picker's rows, which the registry's count owns. A selector matching zero would mean
          // axe swept an open dialog with no picker in it — the defect, not the state.
          "#edit-dialog-type-rows button.type-choice",
          // The Learn escape. A link audited for its accessible name is the point of listing it:
          // "Learn about model types" has to BE the name, not a title attribute.
          "#edit-dialog-learn",
          // And the field the picker fills, so the state covers the thing it is guidance for.
          "#edit-dialog-add-model-question",
        ],
        drive: async (page) => {
          // The hypothesis modal first: two stacked dialogs is a focus ordering the platform does
          // not define, and this suite must audit ONE top layer rather than whichever won.
          await page.evaluate(() => window.mage.hypothesis.discard());
          await page.waitForFunction(() => document.getElementById("hypothesis-bar").hidden === true,
            { timeout: 30_000 });
          // Through the human controls, because the menu's disclosure and the row's listener are
          // part of what a keyboard user walks to reach this dialog.
          await page.click("#add-menu-summary");
          await page.click("#add-menu-model");
          await page.waitForFunction(() => document.getElementById("edit-dialog")?.open === true,
            { timeout: 30_000 });
        },
      },
    ],
    diagram: {
      hosts: "#canvas",
      root: "#canvas",
      // The selection is not incidental. Without emphasis the renderer draws only box labels --
      // which sit on a near-white `.mage-box` fill and so pass in either theme -- and edge labels,
      // which carry a white halo and also pass. The two texts that sit on the BARE ground with no
      // halo are the emphasis glyph and the mark legend, and they appear only once something is
      // emphasised. Measuring the unemphasised picture would have produced a green contrast gate
      // over the exact defect this check exists to catch.
      emphasise: async (page) => {
        await page.evaluate(() => window.mage.hypothesis.discard());
        // Settled on the observable consequence, not a timer: the discard is done when the banner
        // is hidden again. The 300ms sleep this replaces passed on speed, not on knowledge.
        await page.waitForFunction(() => document.getElementById("hypothesis-bar").hidden === true, { timeout: 30_000 });
        // And the edit dialog the last state left open, for a reason the hypothesis discard above
        // only half covers: a `<dialog>` in the top layer paints a `::backdrop` over the page, and
        // this measurement reads the colour actually behind each glyph. Measured when the
        // add-model state landed — the dark theme's diagram labels went from clearing AA to failing
        // it, with no change to the renderer. Closing through the dialog's own Cancel rather than
        // `close()`, so the state the measurement runs in is one a user can also be standing in.
        await page.click("#edit-dialog-cancel");
        await page.waitForFunction(() => document.getElementById("edit-dialog")?.open === false,
          { timeout: 30_000 });
        await page.evaluate(() => window.mage.view.select(["analytics", "order-created"]));
        await page.waitForFunction(() => document.querySelector("#canvas .mage-legend") !== null, { timeout: 30_000 });
      },
    },
  },
  {
    name: "learn.html",
    path: "learn.html",
    // `window.mageLearn.ready` is the mark learn/main.ts installs for exactly this wait: it marks
    // the derivation complete, which `networkidle0` does not.
    ready: () => window.mageLearn?.ready === true,
    states: [
      // 1. the landing paint -- the gallery nav, four sections, four figures, every twin collapsed.
      { name: "landing", floor: 30, drive: async () => { /* the page as served */ } },
      {
        // 2. a node selected in EVERY figure, not just the first. Selection re-renders through
        //    `renderView` with a `selection` emphasis, which adds the legend strip, the glyph and
        //    the status sentence -- and it is the state a reader who came for one model sits in.
        //    Driving all four is what makes the next state's twins non-empty too.
        name: "selected",
        floor: 30,
        drive: async (page) => {
          const hosts = await page.evaluate(() => {
            const pickers = [...document.querySelectorAll("figure.learn-figure select")];
            for (const picker of pickers) {
              const first = [...picker.options].map((o) => o.value).find((v) => v !== "");
              if (first === undefined) continue;
              picker.value = first;
              // The change event, not a direct call: the page binds its re-render to it, and a
              // programmatic `.value =` alone would leave the picture showing no emphasis while
              // the picker claimed some.
              picker.dispatchEvent(new Event("change"));
            }
            return pickers.length;
          });
          // Every figure emphasised, not just some: the legend strip appears only under emphasis,
          // so one legend per figure IS the proof that each picker's change reached its render.
          await page.waitForFunction(
            (n) => document.querySelectorAll(".canvas .mage-legend").length === n,
            { timeout: 30_000 }, hosts,
          );
        },
      },
      {
        // 3. the twins expanded. `paintDiagram`'s text output -- the accessible representation
        //    itself, with its marks list and its legend definition list -- lives inside a collapsed
        //    `<details>`, and axe does not audit what a closed disclosure hides. Auditing only the
        //    landing state would certify the picture and skip the twin.
        name: "twins",
        floor: 30,
        drive: async (page) => {
          const opened = await page.evaluate(() => {
            const all = [...document.querySelectorAll("figure.learn-figure details")];
            for (const d of all) d.open = true;
            return all.length;
          });
          assert.ok(opened > 0, "learn.html rendered no diagram twin to expand");
          await page.waitForFunction(
            (n) => document.querySelectorAll("figure.learn-figure details[open]").length === n,
            { timeout: 30_000 }, opened,
          );
        },
      },
      {
        // 4. the walkthrough ENGAGED: a witness drawn onto a machine figure, a what-if hypothesis
        //    open with its recomputed verdicts in the live regions, a quantitative readout filled,
        //    and a refusal shown. These are the DOM states the lesson's primary path puts a
        //    student in, and none of them exists at landing — auditing only the served paint
        //    would certify a page the student never stays on.
        name: "walkthrough",
        floor: 30,
        drive: async (page) => {
          const clicked = await page.evaluate(() => {
            const press = (anchor, lead) => {
              const hit = [...document.querySelectorAll(`#${anchor} button.walk-run`)]
                .find((b) => (b.textContent ?? "").startsWith(lead));
              if (hit === undefined) return false;
              hit.click();
              return true;
            };
            for (const d of document.querySelectorAll("#walk-purpose details, #walk-quantitative details")) {
              d.open = true;
            }
            return [
              press("walk-evidence", "Show the witness"),
              press("walk-changes", "Apply:"),
              press("walk-quantitative", "Run:"),
              press("walk-boundaries", "Ask:"),
            ].every(Boolean);
          });
          assert.ok(clicked, "a walkthrough control the drive expected is not on the page");
          await page.waitForFunction(() =>
            document.querySelector("#walk-boundaries .walk-outcome")?.textContent
              ?.startsWith("NOT ANSWERABLE"),
          { timeout: 30_000 });
        },
      },
    ],
    diagram: {
      hosts: "figure.learn-figure .canvas",
      root: ".canvas",
      // Already emphasised by the `selected` state, which every later state inherits. Re-asserted
      // rather than assumed: the contrast measurement is vacuous without the un-haloed texts, and
      // a reordering of the states above would silently take them away.
      emphasise: async (page) => {
        await page.waitForFunction(() => document.querySelector(".canvas .mage-legend") !== null, { timeout: 30_000 });
      },
    },
  },
];

let server;
let browser;
let axe;
/** One axe result per page and state, keyed `page/state`, measured once in `before`. */
const scans = new Map();
/** Per page: the diagram-text contrast in both themes, and how many hosts drew. */
const diagrams = new Map();

/** Walk one page through its declared states, scanning after each, then measure its diagram. */
async function auditPage(def) {
  const { page } = await openServedPage(browser, def.path, ORIGIN);
  await page.waitForFunction(def.ready, { timeout: 30_000 });

  for (const state of def.states) {
    await state.drive(page);
    // Coverage is read BEFORE the scan and from the same settled page, so the two describe one
    // observation: a probe taken after axe had run would be answering about a DOM axe did not see.
    const coverage = state.covers === undefined ? [] : await auditableNodes(page, state.covers);
    scans.set(`${def.name}/${state.name}`, {
      ...await runAxe(page, axe.source), floor: state.floor, coverage,
    });
  }

  if (def.diagram !== undefined) {
    await def.diagram.emphasise(page);
    const hosts = await page.evaluate((s) => document.querySelectorAll(s).length, def.diagram.hosts);
    const light = await svgTextContrast(page, def.diagram.root);
    // `data-theme` is stamped on top of the media emulation because the pages honour BOTH signals
    // and a fix that handled only one would still ship broken.
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    // No wait: the theme is pure CSS custom properties (neither page has a matchMedia listener or
    // a JS re-render on theme change), so the computed styles the contrast probe reads are already
    // the dark ones -- getComputedStyle forces the recomputation it needs. The 200ms sleep this
    // replaces was insurance against an async repaint that does not exist.
    const dark = await svgTextContrast(page, def.diagram.root);
    diagrams.set(def.name, { hosts, light, dark });
  }
  await page.close();
}

before(async () => {
  axe = await loadAxeSource();
  ({ server, origin: ORIGIN } = await startServerOnFreePort(WORKBENCH_DIR));
  browser = await launchBrowser();
  // Sequentially: the pages share one Chromium, and two tabs laying out diagrams at once would
  // make the hit-tested contrast measurement race its own scroll.
  for (const def of PAGES) await auditPage(def);
}, { timeout: 300_000 });

after(async () => {
  if (scans.size > 0) {
    const path = await writeReceipt({
      origin: ORIGIN,
      ranAt: new Date().toISOString(),
      axeVersion: axe?.version ?? null,
      states: Object.fromEntries([...scans].map(([key, r]) => [key, {
        violations: describeFindings(r.violations),
        incomplete: describeFindings(r.incomplete),
        rulesPassed: r.passes,
        // What the state claimed axe could reach, and what it actually could. Recorded because a
        // narrowed-scope state's rule count no longer carries that fact on its own.
        coverage: r.coverage,
      }])),
      svgTextContrast: Object.fromEntries([...diagrams].map(([name, d]) => [name, {
        hosts: d.hosts,
        light: { background: d.light.svgBackground ?? null, drew: d.light.diagrams, failures: contrastFailures(d.light) },
        dark: { background: d.dark.svgBackground ?? null, drew: d.dark.diagrams, failures: contrastFailures(d.dark) },
      }])),
    }, AXE_RECEIPT_PATH);
    console.log(`FR-A11Y axe receipt: ${path}`);
  }
  await shutdown({ browser, server });
});

describe("FR-A11Y-1: axe-core finds nothing in any state of any served page", () => {
  for (const def of PAGES) {
    for (const state of def.states) {
      it(`${def.name} ${state.name}: zero violations`, () => {
        const scan = scans.get(`${def.name}/${state.name}`);
        assert.ok(scan, `the ${def.name} ${state.name} state was never scanned`);
        // Every offending node named with its rule id and selector, so a failure is a work list.
        assert.deepEqual(describeFindings(scan.violations), [],
          `axe found ${scan.violations.length} violation(s) in ${def.name}'s ${state.name} state`);
        // A scan that evaluated nothing also reports zero violations, so each state asserts that
        // axe actually matched something. The floor is the state's own, declared with it.
        assert.ok(scan.passes >= scan.floor,
          `only ${scan.passes} rules passed in ${def.name}'s ${state.name} state -- axe ran but `
          + "matched almost nothing");
        // And the sharper half of the same guard, for a state whose audited scope is narrower than
        // the page: the content the state is NAMED after had to be inside it. A rule count cannot
        // tell a full modal from a gutted one (see `auditableNodes`), so a state that narrows the
        // scope declares what the scan must have covered and this is where the claim is checked.
        assert.deepEqual(unauditable(scan.coverage), [],
          `${def.name}'s ${state.name} state declares content axe could not reach, so its scan is `
          + "not of the state it is named after");
      });
    }
  }

  it("every served page is audited here", () => {
    // The post-condition on the register, the same one the smoke tier applies to itself: a third
    // page lands red in THIS file until it brings a readiness mark and a state list. Without it,
    // learn.html shipped and was audited by nothing for a day, which is the incident that
    // parameterised this suite.
    const served = PAGES.map((p) => p.path).sort();
    const audited = [...new Set([...scans.keys()].map((k) => k.split("/")[0]))].sort();
    assert.deepEqual(audited, served, "a registered page contributed no scan");
  });

  it("the only thing axe declines to judge is SVG text contrast", () => {
    // Not an allowance: it is the inventory this suite's own contrast check is responsible for. A
    // NEW incomplete rule means a second blind spot, and it must be answered the same way --
    // measured deliberately -- rather than inherited silently.
    //
    // This assertion earned its keep on Learn's first audit. The gallery reported
    // `duplicate-id-aria` as incomplete, at CRITICAL, because the renderer derives the SVG
    // title/desc ids from the subject and two of four figures draw the same subject. An
    // incomplete-tolerant gate would have shipped a page whose second diagram borrowed the first
    // one's accessible name.
    const unexpected = [...scans]
      .flatMap(([key, r]) => r.incomplete
        .filter((v) => v.id !== "color-contrast")
        .map((v) => `${key}: ${v.id}`));
    assert.deepEqual(unexpected, [],
      "axe reports an incomplete rule this suite does not account for; treating it as a pass is "
      + "how the diagram's 1.1:1 labels survived a zero-violation scan");

    const contrastIncomplete = [...scans]
      .filter(([, r]) => r.incomplete.some((v) => v.id === "color-contrast"))
      .map(([key]) => key);
    // Pinned as a FACT about the tool, not as a requirement: if axe ever learns to resolve SVG
    // paint this assertion is the thing that tells us our own check became redundant. Asserted on
    // every page that paints a diagram, because the blind spot is the renderer's output and each
    // page embeds it differently.
    for (const def of PAGES.filter((p) => p.diagram !== undefined)) {
      assert.ok(contrastIncomplete.some((key) => key.startsWith(`${def.name}/`)),
        `axe no longer reports color-contrast as incomplete on ${def.name} -- it may have learned `
        + "to measure SVG text, in which case svgTextContrast below is now a second opinion");
    }
  });
});

describe("1.4.3: the diagram's text, which axe will not measure", () => {
  for (const def of PAGES.filter((p) => p.diagram !== undefined)) {
    it(`${def.name}: every diagram host drew text in both themes`, () => {
      // The contrast assertions below are vacuous on an empty figure, and the renderer paints only
      // after a model loads.
      const d = diagrams.get(def.name);
      assert.ok(d, `${def.name} declared a diagram but none was measured`);
      assert.ok(d.hosts > 0, `${def.name} has no diagram host matching ${def.diagram.hosts}`);
      // Derived from the page, not a literal: every host the page rendered must hold an SVG the
      // probe measured. A selector that matched only the first of four would pass every contrast
      // assertion below while measuring a quarter of the page.
      for (const [theme, measured] of [["light", d.light], ["dark", d.dark]]) {
        assert.ok(measured.drew, `no SVG drew in any ${def.name} diagram host in the ${theme} theme`);
        assert.equal(measured.diagrams, d.hosts,
          `${def.name} has ${d.hosts} diagram host(s) but the ${theme} measurement found `
          + `${measured.diagrams} SVG(s) -- some host drew nothing, or the root selector misses it`);
        assert.ok(measured.texts.length > 5,
          `only ${measured.texts.length} texts in ${def.name}'s diagrams -- too few to be measuring `
          + "the real picture");
        // The two classes that sit on the bare ground with no halo, and so the only ones the theme
        // can break. If a render stops emitting them, the contrast assertions below still pass and
        // mean nothing -- so their presence is asserted rather than assumed.
        for (const className of ["mage-legend", "mage-glyph"]) {
          assert.ok(measured.texts.some((t) => t.className === className && !t.halo),
            `the ${theme} measurement of ${def.name} contains no un-haloed .${className} -- the `
            + "emphasis state did not render, so the contrast checks below are measuring only text "
            + "on filled shapes");
        }
      }
    });

    it(`${def.name}: every diagram label clears AA against the paint behind it, in the light theme`, () => {
      const d = diagrams.get(def.name);
      assert.deepEqual(contrastFailures(d.light), [],
        `${def.name} diagram text below AA on ground ${d.light.svgBackground}`);
    });

    it(`${def.name}: every diagram label clears AA against the paint behind it, in the dark theme`, () => {
      // The regression this pins, in one sentence: the renderer's palette is theme-invariant by
      // necessity, so the PAGE owes it a ground its ink can sit on. Pointing `figure svg`'s
      // background at a theme variable put the emphasis glyph and the mark legend at 1.1:1.
      const d = diagrams.get(def.name);
      assert.deepEqual(contrastFailures(d.dark), [],
        `${def.name} diagram text below AA on ground ${d.dark.svgBackground} -- the dark theme gave `
        + "the fixed-light-palette SVG a dark ground");
    });
  }
});
