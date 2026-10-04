// Learn is reachable from the main page, and the EMPTY state is the state that matters.
//
// THE GAP THIS FILE CLOSES, which is the finding and not just the fix. The Learn page landed whole:
// `learn.html`, the derivation in `src/learn/`, the registry-driven gallery, and a contextual route
// to it from the NOT ANSWERABLE refusal panel. The requirement's own first sentence did not —
// `requirements-learn-261002.md`: "The global header SHALL contain a persistent Learn entry."
// Nothing regressed. A requirement fell between two waves and every gate stayed green, because
// UX-I9 constrains what the Learn page SAYS and no check asked whether a reader can GET there.
//
// So the claim here is reachability, and it is asserted the only way that means anything: from the
// RENDERED page, in the state a first-time reader is actually in. A gate that greps `index.html`
// for the string "Learn" passes over a page whose entry sits inside a collapsed ⋯ menu, inside a
// region `mountIf` unmounts, behind a loaded-state guard, or on a link `tabindex="-1"` takes out of
// the keyboard order — all four of which are things this shell really does to controls, and three
// of which it does to six controls in this very bar.
//
// TWO EMPTY STATES, because the word is ambiguous and the ruling's screenshot is the SECOND one:
//
//   PRISTINE — nothing loaded. SH-I1 unmounts every region but the header and Start, so the header
//     entry is the only route to Learn that exists at all: the refusal panel lives inside `#askbar`,
//     which is `hidden` here. That asymmetry is asserted at the foot of this file, not assumed.
//   MODEL-LESS — a model system created and holding no models, which is what "Create new model
//     system" produces. Start goes away with its prose, and Navigate, Workspace, Inspector and Ask
//     all mount EMPTY. This is the state the ruling describes, and the state in which this bar dims
//     Export, Run all, Undo, Redo, Commands and the what-if toggle. Six controls go quiet; the one
//     surface that explains what a model system IS must not be the seventh.
//
// The destination is read from `src/app/learn.ts` (`LEARN_PAGE`), the module the refusal panel's own
// link derives from, so this suite cannot pass against a page pointing somewhere nothing serves.
//
// The Tab walk is `reachByTab` from the FR-A11Y keyboard helpers rather than a loop of its own.
// That module already owns the walk, its wrap-around caveat, and the diagnostic dump that makes an
// unreachable control readable — a second copy here would be a second thing to fix.
//
// It lives under `test/browser/` deliberately: `npm run test:browser` picks it up with no new
// script, and `test/gate-reachability.test.ts` already declares that tier's exclusion from the
// default gate together with the CI step that covers it. The CHEAPEST half of this claim is
// additionally wired into the smoke tier, which `npm run all` does reach — an entry deleted
// outright reds the gate an agent runs before reporting, rather than waiting for CI.
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

import {
  WORKBENCH_DIR, startServerOnFreePort, launchBrowser, shutdown, openWorkbench,
} from "./harness.mjs";
import { reachByTab } from "./a11y/keyboard.mjs";

// The destination, from the module that owns it. Hardcoding "learn.html" here would let the page
// and the gate drift to the same wrong answer together.
import { LEARN_PAGE } from "../../src/app/learn.ts";

/** The entry, by the id `src/ui/shell/header.ts` resolves at mount. */
const ENTRY_ID = "learn";

let server;
let browser;
let origin;

before(async () => {
  ({ server, origin } = await startServerOnFreePort(WORKBENCH_DIR));
  browser = await launchBrowser();
}, { timeout: 60_000 });

after(async () => { await shutdown({ browser, server }); });

/**
 * Everything observable about the entry, measured on the page as it stands.
 *
 * `checkVisibility` rather than a style read, because the ways a control goes missing here are
 * `hidden` on an ancestor, `display:none` and zero size — and that one call covers all three. The
 * accessible NAME is the link's text: an entry with no name is a stop a screen-reader user arrives
 * at and cannot identify, which is a different defect from an absent one and looks identical to a
 * selector.
 */
const observeEntry = (page) => page.evaluate((id, learnPage) => {
  const a = document.getElementById(id);
  if (a === null) return { present: false };
  return {
    present: true,
    tag: a.tagName.toLowerCase(),
    inBanner: a.closest("header[role=banner]") !== null,
    visible: a.checkVisibility(),
    hiddenAncestor: a.closest("[hidden]") !== null,
    name: (a.textContent ?? "").trim(),
    href: a.getAttribute("href"),
    // Resolved, so a relative href nothing serves is caught here rather than on the hop.
    resolves: a.href === new URL(learnPage, document.baseURI).href,
    // A link is keyboard-operable because it is a link. `tabindex="-1"` is the one way markup takes
    // that away, and `disabled` on an anchor does nothing at all — which is itself a reason this had
    // to be an `<a>` rather than one more `<button>` in the bar.
    tabIndex: a.tabIndex,
  };
}, ENTRY_ID, LEARN_PAGE);

/** The two empty states, each driven from a freshly opened page. */
const EMPTY_STATES = [
  {
    name: "pristine — nothing loaded",
    drive: async () => { /* a fresh page IS this state */ },
    /** SH-I1: Start is the one mounted principal surface here. */
    startMounted: true,
  },
  {
    name: "model-less — a system created, holding no models (the ruling's screenshot)",
    drive: async (page) => {
      // Through the human control, not `window.mage.load`: the state the ruling describes is the
      // one "Create new model system" produces, and driving it by the agent API would skip the
      // button whose press is what takes Start and its prose away.
      await page.click("#new-system");
      await page.waitForFunction(() => document.getElementById("start")?.hidden === true,
        { timeout: 30_000 });
    },
    startMounted: false,
  },
];

for (const state of EMPTY_STATES) {
  describe(`the persistent Learn entry: ${state.name}`, () => {
    let page;

    before(async () => {
      ({ page } = await openWorkbench(browser, origin));
      await state.drive(page);
    }, { timeout: 60_000 });

    after(async () => { if (page !== undefined) await page.close(); });

    it("is the state it claims to be — an empty workbench with no models", async () => {
      // The fixture, checked. Every assertion below is about the EMPTY state, and a fixture that
      // quietly loaded something would make this whole file pass over a state nobody asked about.
      const facts = await page.evaluate(() => ({
        models: window.mage.context().counts.models,
        startHidden: document.getElementById("start")?.hidden ?? null,
      }));
      assert.equal(facts.models, 0, "the fixture holds a model — this is not the empty state");
      assert.equal(facts.startHidden, !state.startMounted,
        `#start's mounted state is not what SH-I1 gives for '${state.name}'`);
    });

    it("is present, visible, named, and in the banner", async () => {
      const entry = await observeEntry(page);
      assert.ok(entry.present,
        `no #${ENTRY_ID} on the rendered page. requirements-learn-261002.md: "The global header `
        + 'SHALL contain a persistent Learn entry." This is the state in which a reader has no model '
        + "and most needs the surface that explains what one is.");
      assert.equal(entry.tag, "a",
        "the entry is not an <a> — it navigates, so middle-click, ⌘-click and the context menu all "
        + "have to do what they do everywhere else, and a button's click handler gives none of them");
      assert.ok(entry.inBanner, "the entry is outside the banner landmark, so it is not a header entry");
      assert.ok(entry.visible,
        "the entry is in the document and not rendered — hidden, display:none, or zero-sized. This is "
        + "the failure a grep for the string 'Learn' in index.html cannot see.");
      assert.equal(entry.hiddenAncestor, false,
        "the entry sits inside a `hidden` ancestor — a region mountIf unmounts is not persistent");
      assert.match(entry.name, /learn/i, `the entry's accessible name is "${entry.name}"`);
    });

    it("points at the Learn page the application actually serves", async () => {
      const entry = await observeEntry(page);
      assert.equal(entry.href, LEARN_PAGE,
        `the entry's href is "${entry.href}", and src/app/learn.ts says the Learn page is "${LEARN_PAGE}"`);
      assert.ok(entry.resolves, "the entry's href does not resolve to the served Learn page");
    });

    it("is reached by Tab from a released focus", async () => {
      const entry = await observeEntry(page);
      assert.ok(entry.tabIndex >= 0,
        `the entry's tabIndex is ${entry.tabIndex} — negative takes it out of the keyboard order`);
      // `reachByTab` asserts reachability and dumps the control's state when the walk fails. The
      // press COUNT is deliberately not pinned: Chromium keeps its sequential-navigation starting
      // point across a blur, so a walk may begin mid-document and wrap.
      const presses = await reachByTab(page, ENTRY_ID);
      assert.ok(presses > 0, "the walk reported no presses");
    });

    // LAST in the describe on purpose: it leaves the page on learn.html.
    it("navigates to a Learn page that loads, by keyboard", async () => {
      // The whole claim, end to end, and by Enter rather than by click. A keyboard route is what a
      // shell this careful about tab order is most likely to break, and a click would pass over a
      // link the keyboard cannot reach.
      await reachByTab(page, ENTRY_ID);

      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e).slice(0, 400)));
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60_000 }),
        page.keyboard.press("Enter"),
      ]);
      assert.equal(new URL(page.url()).pathname, `/${LEARN_PAGE}`,
        `Enter on the entry landed on ${page.url()}`);

      // LOADS, not merely responds. `window.mageLearn.ready` is the mark the Learn composition root
      // sets at the end of its derivation, so a 200 that renders an empty shell fails here.
      await page.waitForFunction(() => window.mageLearn?.ready === true, { timeout: 30_000 });
      const built = await page.evaluate(() => ({
        cards: document.querySelectorAll(".learn-cards a").length,
        sections: document.querySelectorAll("#learn-main > section[id]").length,
        failed: document.body.innerText.includes("The Learn page failed to build"),
        // The reciprocal entry: the bar is one nav across two pages, so the way back must be here.
        back: document.querySelector('header[role=banner] nav.pages a[href="index.html"]') !== null,
      }));
      assert.equal(built.failed, false, "the Learn page rendered its own failure sentence");
      assert.ok(built.cards > 0, "the Learn page loaded and its gallery is empty");
      assert.ok(built.sections >= built.cards,
        `the gallery offers ${built.cards} card(s) and the page builds ${built.sections} section(s)`);
      assert.ok(built.back, "the Learn page offers no way back to the Workspace");
      assert.deepEqual(errors, [], "the Learn page threw while loading");
    });
  });
}

describe("the header entry is the route the contextual one cannot be", () => {
  /**
   * WHY THIS IS A TEST AND NOT A COMMENT. The refusal panel's `#ask-absent-learn` was the ONLY route
   * to Learn before this wave, and it is a perfectly good route — from inside `#askbar`, after a
   * model is loaded, after a question is asked, and only when that question's kind needs a model
   * type the system does not declare. Every one of those is a precondition, and a reader with no
   * model satisfies none of them. That reader is who the ruling is about.
   *
   * So the two routes are asserted to be DIFFERENT KINDS of thing: one unconditional, one earned.
   * Had this check existed, the dropped requirement would have been visible the day the contextual
   * route landed — the suite would have reported one route to Learn, and it conditional.
   */
  let page;
  before(async () => { ({ page } = await openWorkbench(browser, origin)); }, { timeout: 60_000 });
  after(async () => { if (page !== undefined) await page.close(); });

  it("the refusal route is unreachable on a pristine page, and the header entry is not", async () => {
    const routes = await page.evaluate(() => {
      const visible = (id) => {
        const e = document.getElementById(id);
        return e === null ? null : e.checkVisibility();
      };
      return { header: visible("learn"), refusal: visible("ask-absent-learn") };
    });
    assert.equal(routes.refusal, false,
      "#ask-absent-learn is reachable with nothing loaded — either the fixture is wrong or the "
      + "refusal panel has stopped being contextual");
    assert.equal(routes.header, true,
      "the header entry is not reachable on a pristine page, so this page's only route to Learn is "
      + "one that needs a loaded model and a refused question first — which is the state the dropped "
      + "requirement left behind");
  });
});
