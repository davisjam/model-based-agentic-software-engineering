/**
 * THE STUDENT JOURNEY, END TO END: the verdicts recompute, but do the ROWS repaint?
 *
 * Phase 2 of `DESIGN-ux-journey-browser-261005.md`. One example — the §21 flagship slot the
 * `SHIPPED_EXAMPLES` declaration maps to an id — and every modification its own manifest declares,
 * driven through the controls a student uses, with every verdict read out of the RENDERED page.
 *
 * ## Why this file exists, when nine browser files already drive this page
 *
 * The browser tier already drives an edit and a re-check end to end: `a11y/keyboard.test.mjs`
 * performs a cascade delete through the real controls and asserts that property verdicts moved.
 * §1 of the design refutes the commissioning brief's gap on exactly that evidence. What survives is
 * narrower and it is this: nothing showed that a SHIPPED EXAMPLE'S OWN PRESCRIBED modification,
 * performed through the UI, makes the RENDERED verdict for its DECLARED query move from its
 * DECLARED `from` to its DECLARED `to`. The curriculum each `expected-results.yaml` authors was
 * driven only at the node tier (`test/examples.test.ts`), and no browser test read any manifest.
 *
 * The regression class that buys the file its keep is one the repo has already paid for. A rendered
 * surface silently detached from state, while every seam-level test stays green: the prefill
 * incident, where a repair deleted a separator, every dialog field went empty, and the whole suite
 * reported 749 of 749 passing because nothing looked at what the dialog received
 * (`workbench.test.mjs:771–808`). Here the same class wears the name "verdicts recompute but the
 * rows never repaint" — and §"rung 3 fires" below MAKES that page and proves the weaker journey
 * passes against it.
 *
 * ## The four ways a journey passes while the UI is broken
 *
 * §4 of the design constructs them, so each is stated here with the assertion that closes it. This
 * is the `PASSES WHILE VIOLATED` discipline the sibling gates use, applied to the gate's own shape
 * rather than to its subject.
 *
 * **1. ORACLE READS.** Read verdicts through `window.mage.properties()` and the journey passes with
 * `#question-list` rendering nothing at all. This is where the existing storm test stops
 * (`a11y/keyboard.test.mjs:764, 792` read the oracle, which is right there and wrong here).
 * CLOSED BY: `verdictOf`, the only verdict reader in this file, resolving
 * `#question-list [data-property=…] p .state` and nothing else; `askSaved`, which reads
 * `#ask-answer`; and — mechanically — construction 4's spy, which counts `properties` as a
 * forbidden call. Measured by sabotage: rewriting `verdictOf` to read
 * `window.mage.properties()` turns the last test red and names the callable.
 *
 * **2. A MISSING BEFORE-READ.** A renderer frozen on a stale paint that happens to show the `to`
 * word passes an after-only journey. CLOSED BY: rung 3, which asserts the row shows the word mapped
 * from `from` BEFORE the edit is driven, and by `assert.notEqual(fromWord, toWord)` — the discipline
 * the prefill gate learned as "the expected value is NOT the field's own default". The before-read
 * makes the claim a TRANSITION rather than a state.
 *
 * This one was measured rather than argued, because it is the reason the file exists. Two copies of
 * this suite were run against ONE page broken the same way — the modification pre-applied, the rail
 * frozen, then Undo back to the base revision, so the row read `REFUTED` while the model said
 * `holds`. The copy with rung 3 deleted reported **10 pass / 0 fail**. The copy with rung 3 kept
 * reported **2 fail**, one per modification. Rung 2 stayed green in both, which sharpens the point:
 * the ask surface was working, the rail was detached, and only the before-read could tell.
 *
 * **3. ANNOUNCER-ONLY READS.** `#live` is written by a different sender, so a journey reading it
 * passes while the list is broken. CLOSED BY: this file never reads `#live`. Not once; the string
 * does not appear below. Announcement coverage is `workbench.test.mjs`'s and the keyboard suite's.
 *
 * **4. `transact`-DRIVEN MUTATION.** The agent path wearing a human name. CLOSED BY: every mutation
 * goes through `#delete-relation-go`, `#set-property-go` or `#undo` — and mechanically, by a spy
 * installed over every callable of `window.mage` before the example is loaded. The last test asserts
 * the called set is a subset of the read-only names this file admits to using. The mutator set is
 * derived BY EXCLUSION rather than listed, so a mutator added to the agent surface is covered the
 * day it lands.
 *
 * ## Two modifications, one declared change, and how they are told apart
 *
 * `message-bus` declares two modifications and BOTH declare the same single change —
 * `restricted-data-reaches-impermitted-subscriber: holds → refuted`. The manifest says why: a
 * requirement is discharged by changing the system OR by changing what the system is permitted to
 * do, and nothing in these models prefers one. A journey pair that passed on the declared change
 * alone would show that SOMETHING moved the row, never that the two EDITS differ.
 *
 * So the pair is told apart at the rendered surface, and the test asserts it rather than asserting
 * it in a comment. `renderedState` captures, per modification, every suggested query's rendered
 * verdict and rendered evidence plus the relation vocabulary the edit forms offer; the last journey
 * test groups the manifest's modifications by their serialized `changes[]` and asserts that any
 * group larger than one produced PAIRWISE DIFFERENT rendered states. Measured here, the
 * discriminator is sharp and it is semantic rather than incidental:
 *
 *   drop the subscription   `who-subscribes-to-order-created` renders
 *                           `witness: order-created → billing → inventory`  — Analytics is GONE
 *   widen the permission    the same row renders
 *                           `witness: order-created → analytics → billing → inventory`  — unchanged
 *
 * and the drop additionally empties the two Analytics rows out of `#delete-relation-target` while
 * the permit leaves them. If a future pair IS indistinguishable the assertion fails and says so in
 * those words, because that is a finding about the manifest and not a reason to weaken the test.
 *
 * ## What is reviewed rather than checked (§13.1's vocabulary)
 *
 * That the route these journeys take is the route a student would take is `asserted`. Reachability
 * of every control is `checked` already, by the generated paths suite; consequence is what these
 * journeys check; the choice of route between equivalent affordances has no oracle. Also `asserted`:
 * the §3 machine walk. Driving an edit that interposes the G3 review surface traverses the
 * lifecycle model's `workspace: authoritative → hypothetical → authoritative`. Nothing checks
 * machine↔code — that model's correspondence is `asserted`, the schema's weakest kind — so this
 * sentence is a reviewable claim and the file hangs no assertion off it.
 *
 * ## One boot
 *
 * §6 measured the journey BODY at 75–110 ms against a boot of 1.4–2.1 s, so every journey shares one
 * browser and one page, with an Undo between modifications to return the workspace to the revision
 * the picker delivered. The node tier already pins that discard reverts; this uses the Undo control
 * because it is the route the page offers and because `#undo` going disabled is a RENDERED statement
 * that the workspace is back where it started.
 *
 * No receipt and no census count. The glob hazard receipts exist for is covered for this file by
 * `gate-reachability.test.ts`, which asserts every test file is matched by a gate script's glob and
 * every glob matches a file; the denominator census belongs to Phase 3, which generates one journey
 * per (example, modification) and has a number to report. Nothing below writes a total down — the
 * pair comes out of the manifest's `modifications` and is iterated.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { SHIPPED_EXAMPLES } from "../../src/app/examples.ts";
import { evaluationOf } from "../../src/ir/types.ts";
import { STATUS_WORD } from "../../src/ui/shell/review.ts";
import { statusWord } from "../../src/ui/shell/nav.ts";
import { relationValue } from "../../src/ui/view-model.ts";
import {
  startServerOnFreePort, launchBrowser, shutdown, openWorkbench, WORKBENCH_DIR,
} from "./harness.mjs";

/**
 * The subject: the richest example the library ships, resolved through `SHIPPED_EXAMPLES` rather
 * than typed here.
 *
 * The 261006 cut replaced the named flagship slot with a declared difficulty tier, so the journey
 * follows whichever example claims `complex` instead of pointing at an id that can be demoted or
 * retired out from under it. Deriving the subject is the point: the test moves with the library.
 */
const FLAGSHIP_TIER = "complex";
const EXAMPLE = SHIPPED_EXAMPLES.find((e) => e.tier === FLAGSHIP_TIER)?.id ?? "";

// Asserted here rather than in `before`, because the manifest read below would otherwise fail on a
// path containing "null" and report a missing file instead of an unrealised flagship slot.
assert.ok(typeof EXAMPLE === "string" && EXAMPLE !== "",
    `no shipped example declares the '${FLAGSHIP_TIER}' tier, so this journey has `
    + "no subject");

const fixture = parse(await readFile(
  join(WORKBENCH_DIR, "examples", EXAMPLE, "expected-results.yaml"), "utf8"));

/** The curated questions a loaded example presents. §4's rung 2 is one ask per member. */
const SUGGESTED = fixture.queries.filter((q) => q.suggested === true);

/** The declared activity ladder. Iterated, never counted — Phase 3 owns the denominator. */
const MODIFICATIONS = fixture.modifications;

// --------------------------------------------------------------------------------------------
// The verdict mapping, derived from the renderer's own closed vocabulary
// --------------------------------------------------------------------------------------------

/**
 * A manifest outcome, as the word the property rail prints.
 *
 * Two hops, each through the module that owns it. `evaluationOf` is the engine's declared single
 * translation site between the outcome vocabulary and the proposition vocabulary — its own docstring
 * says every consumer that needs to know whether an answer is a proposition should read it rather
 * than switching on `outcome`. `statusWord` is the function `shell/nav.ts` calls to print the word
 * into the row this file then reads, so the expected string and the rendered string come from one
 * expression.
 *
 * **The one copy, named rather than hidden.** The arm from a completed evaluation to a status key is
 * `statusOf`'s (`src/app/properties.ts:508–519`), which is module-private. Exporting it would delete
 * these four lines; Phase 2's scope forbids touching `src/`, so the copy is here with its origin
 * cited and the closed-vocabulary guard below catching the drift a copy invites. Phase 3 should take
 * the export.
 *
 * `coverage` is supplied because `evaluationOf` carries it through; nothing here reads it back.
 */
const statusKeyFor = (outcome) => {
  const ev = evaluationOf({
    outcome, coverage: { kind: "exhaustive" }, refusal: null, compilation: [],
  });
  switch (ev.status) {
    case "completed": return ev.verdict === "holds" ? "established" : "refuted";
    case "unlicensed": return "not-answerable";
    case "exhausted": return "inconclusive";
    default: throw new Error(`evaluationOf reported an arm this mapping does not cover: ${ev.status}`);
  }
};

/**
 * The rendered word for a declared outcome, with the vocabulary check that makes the hop honest.
 *
 * `statusWord` uppercases whatever it is handed, so it would answer "BOGUS" for a key that no longer
 * exists. `STATUS_WORD` is the compiler-exhaustive `Record<PropertyStatus, string>` the review
 * surface declares, and `test/shell-review.test.ts` holds each of its words equal to the opening of
 * the matching `STATUS_TEXT` sentence. Membership in it is therefore the test that the key resolved
 * to a status the renderer can actually print.
 */
const verdictWordFor = (outcome) => {
  const key = statusKeyFor(outcome);
  assert.ok(Object.hasOwn(STATUS_WORD, key),
    `'${outcome}' mapped to status key '${key}', which is not in the renderer's closed status `
    + `vocabulary (${Object.keys(STATUS_WORD).join(", ")}). Either the manifest declares an outcome `
    + "the engine no longer produces, or statusKeyFor has drifted from statusOf.");
  const word = statusWord(key);
  assert.equal(word, STATUS_WORD[key],
    `the rail's statusWord and the review surface's STATUS_WORD disagree about '${key}'`);
  return word;
};

// --------------------------------------------------------------------------------------------
// The page, and every observation this file makes of it
// --------------------------------------------------------------------------------------------

let server;
let browser;
let page;
let diagnostics;
/** Rung 1's observations, taken in `before` because every later rung needs the loaded page. */
let opened;
/** Per modification id: the rendered state its edit produced. The pair's discriminator. */
const renderedState = new Map();

/**
 * The names of `window.mage` callables this journey is allowed to have used.
 *
 * `context` only, and only for its `hash`, which sequences a commit — this file never maps a hash to
 * a verdict. Everything else, read or write, would mean a journey that observed or mutated through
 * the agent surface.
 */
const PERMITTED_AGENT_CALLS = new Set(["context"]);

/** The rendered status word on one claim's row, or null when the rail renders no such row. */
const verdictOf = (id) => page.evaluate((claim) => {
  const row = document.querySelector(`#question-list [data-property="${claim}"]`);
  if (row === null) return null;
  return row.querySelector("p .state")?.textContent ?? null;
}, id);

/** Every rendered row, for a failure message that says what the rail DID render. */
const renderedRows = () => page.evaluate(() =>
  [...document.querySelectorAll("#question-list [data-property]")].map((row) => ({
    id: row.dataset["property"],
    word: row.querySelector("p .state")?.textContent ?? null,
  })));

/** Ask one catalogue item and read the answer region. The catalogue keys saved questions `saved:<id>`. */
const askSaved = (id) => page.evaluate((claim) => {
  const choice = document.getElementById("ask-choice");
  choice.value = `saved:${claim}`;
  const resolved = choice.value;
  document.getElementById("ask-submit").click();
  const answer = document.getElementById("ask-answer");
  return {
    // Empty when the catalogue does not offer the question: a `<select>` refuses a value that names
    // none of its options, so this distinguishes "asked and answered wrongly" from "never offered".
    resolved,
    text: (answer?.textContent ?? "").replace(/\s+/g, " ").trim(),
    evidence: [...(answer?.querySelectorAll(".evidence li") ?? [])].map((li) => li.textContent ?? ""),
  };
}, id);

/**
 * What the page renders about the whole curated set, plus the relation vocabulary the forms offer.
 *
 * The discriminator between two modifications that declare the same change. Two facts, both rendered:
 * the rail's word and witness for every suggested question, and which relations
 * `#delete-relation-target` still lists. An edit that removes an edge and an edit that widens a
 * permission move the same row and leave different pages behind.
 */
const observeRendered = (ids) => page.evaluate((claims) => ({
  rail: claims.map((claim) => {
    const row = document.querySelector(`#question-list [data-property="${claim}"]`);
    return {
      id: claim,
      word: row?.querySelector("p .state")?.textContent ?? null,
      evidence: [...(row?.querySelectorAll("ol.evidence li") ?? [])].map((li) => li.textContent ?? ""),
    };
  }),
  relations: [...document.getElementById("delete-relation-target").options].map((o) => o.value),
}), ids);

/** Undo until the control says there is nothing left to undo. The rendered route back to the load. */
async function undoToTheLoadedRevision() {
  for (let guard = 0; guard < 16; guard += 1) {
    const exhausted = await page.evaluate(() => document.getElementById("undo").disabled);
    if (exhausted) return;
    await page.evaluate(() => { document.getElementById("undo").click(); });
  }
  assert.fail("Undo never went disabled in 16 presses, so the workspace is not back at the loaded "
    + "revision and the next journey would read a state no manifest describes");
}

/**
 * Drive one declared operation through its own form, and wait for the page to settle.
 *
 * The wait is on `context().hash` OR the review dialog opening, and the hash is bookkeeping rather
 * than a verdict: a commit is synchronous but the repaint it triggers is not, and a timer would make
 * every rendered read a race that passes on a fast machine. The disjunction is what keeps the wait
 * correct when G3 interposes — a held change leaves the authoritative hash exactly where it was, so
 * waiting on the hash alone would hang for the full timeout on the one path the design most wants
 * driven. Returns nothing: what the edit DID is read off the page.
 *
 * **One operation per submit, which the manifest's atomicity claim cannot survive.** The mutation
 * funnel builds one envelope from one `EditRequest` (`shell/edit-forms.ts:84`), so a modification
 * declaring two operations in ONE transaction becomes two transactions and two revisions through the
 * UI. The drop modification says so in terms — *"One transaction, atomic, either both or neither"* —
 * and a student driving it through these forms passes through a revision where `event-flow` and
 * `event-propagation` disagree about the same fact. Reported rather than worked around.
 */
async function driveOperation(op) {
  const before = await page.evaluate(() => window.mage.context().hash);
  switch (op.op) {
    case "delete-relation": {
      // The select's option value is `relationValue`'s encoding, imported rather than spelled, so a
      // change to the encoding breaks the build instead of silently selecting nothing.
      const value = relationValue({ kind: "id", model: op.model, id: op.id });
      const offered = await page.evaluate(() =>
        [...document.getElementById("delete-relation-target").options].map((o) => o.value));
      assert.ok(offered.includes(value),
        `the Remove-a-relation form does not offer '${value}', so no student route performs this `
        + `declared operation. It offers: ${offered.join(", ")}`);
      await page.evaluate((v) => {
        document.getElementById("delete-relation-target").value = v;
        document.getElementById("delete-relation-go").click();
      }, value);
      break;
    }
    case "set-property": {
      await page.evaluate((o) => {
        document.getElementById("set-property-target").value = o.id;
        document.getElementById("set-property-name").value = o.name;
        document.getElementById("set-property-kind").value = "string";
        document.getElementById("set-property-value").value = String(o.value);
        document.getElementById("set-property-domain").value = o.domain ?? "";
        document.getElementById("set-property-unset").checked = false;
        document.getElementById("set-property-go").click();
      }, op);
      break;
    }
    default:
      assert.fail(`the manifest declares operation '${op.op}', which this file has no form route `
        + "for. A journey is only a journey if the edit goes through the controls a student uses — "
        + "add the route beside the two above rather than reaching for window.mage.transact.");
  }
  const refusal = await page.evaluate(() =>
    (document.getElementById("edit-result")?.textContent ?? "").replace(/\s+/g, " ").trim());
  assert.equal(refusal, "",
    `the form refused the declared operation '${op.op}' and said: ${refusal}`);
  await page.waitForFunction(
    (h) => window.mage.context().hash !== h
      || (document.getElementById("hypothesis-bar")?.hasAttribute("open") ?? false),
    { timeout: 30_000 }, before);
}

/**
 * Take the G3 review surface if it interposed, and say which way it went.
 *
 * `shell/review.ts` interposes when an edit would move a claim whose `kind` reads `requirement`, and
 * a claim reads `requirement` only when its SAVED QUERY carries `expect`. No `message-bus` saved
 * query does — the example keeps expected outcomes in its fixture, deliberately, as one source of
 * truth — so every claim on this page reads `property` and the surface does not open for any edit
 * here. The design's §6 attributes the same measurement to G3 being "direction-sensitive"; measured
 * from the code, the cause is the absent `expect`, and the consequence is worth stating plainly:
 * `system.mage.yaml` declares a top-level `requirements:` obligation and the fixture records it
 * `violated`, and the surface whose stated job is *"an obligation is the thing you asked to be told
 * about before breaking"* cannot see it.
 *
 * Handled generically anyway. Adding `expect` to the safety query would make the surface open, and
 * this routine commits through it rather than failing.
 */
async function takeReviewIfItInterposed() {
  const open = await page.evaluate(() =>
    document.getElementById("hypothesis-bar")?.hasAttribute("open") ?? false);
  if (!open) return false;
  const before = await page.evaluate(() => window.mage.context().hash);
  await page.evaluate(() => { document.getElementById("hypothesis-apply").click(); });
  await page.waitForFunction(
    (h) => (document.getElementById("hypothesis-bar")?.hasAttribute("open") === false)
      && window.mage.context().hash !== h,
    { timeout: 30_000 }, before);
  return true;
}

before(async () => {
  assert.ok(Array.isArray(MODIFICATIONS) && MODIFICATIONS.length > 0,
    `${EXAMPLE} declares no modifications, so this file would report full coverage of an empty `
    + "obligation set. An empty denominator is a finding, never a pass.");
  assert.ok(SUGGESTED.length > 0,
    `${EXAMPLE} presents no suggested question, so rung 2 would hold vacuously`);

  const started = await startServerOnFreePort();
  server = started.server;
  browser = await launchBrowser();
  ({ page, diagnostics } = await openWorkbench(browser, started.origin));

  // Construction 4's spy, installed BEFORE the example is loaded so rung 1's own load is covered.
  // Every function on the namespace is wrapped; the called set is asserted at the foot of the file.
  await page.evaluate(() => {
    window.__journeyAgentCalls = [];
    for (const name of Object.keys(window.mage)) {
      const real = window.mage[name];
      if (typeof real !== "function") continue;
      window.mage[name] = (...args) => {
        window.__journeyAgentCalls.push(name);
        return real.apply(window.mage, args);
      };
    }
  });

  // -- rung 1: open the example through the picker ------------------------------------------
  await page.waitForFunction(
    () => (document.getElementById("example-choice")?.options.length ?? 0) > 0, { timeout: 30_000 });

  const beforeLoad = await page.evaluate((id) => {
    const choice = document.getElementById("example-choice");
    choice.value = id;
    // A real selection fires `change`, and the Start region paints its description from that event.
    choice.dispatchEvent(new Event("change", { bubbles: true }));
    return {
      offered: choice.value,
      labels: [...choice.options].map((o) => o.label),
      description: (document.getElementById("example-description")?.textContent ?? "")
        .replace(/\s+/g, " ").trim(),
    };
  }, EXAMPLE);

  await page.evaluate(() => { document.getElementById("example-load").click(); });
  await page.waitForFunction(
    () => document.getElementById("workspace")?.hasAttribute("hidden") === false, { timeout: 30_000 });

  const afterLoad = await page.evaluate(() => ({
    title: document.title,
    summary: (document.getElementById("summary")?.textContent ?? "").replace(/\s+/g, " ").trim(),
    startMounted: document.getElementById("start")?.hasAttribute("hidden") === false,
    askbarMounted: document.getElementById("askbar")?.hasAttribute("hidden") === false,
    editMounted: document.getElementById("edit")?.hasAttribute("hidden") === false,
  }));

  // The system's own name, read from the bytes the picker served. Not written here: a snapshot would
  // assert that this file and the example agree, which is not what rung 1 claims.
  const systemName = parse(await readFile(
    join(WORKBENCH_DIR, "examples", EXAMPLE, fixture.system), "utf8")).system.name;

  opened = { beforeLoad, afterLoad, systemName };
}, { timeout: 180_000 });

after(async () => {
  await shutdown({ browser, server });
});

// --------------------------------------------------------------------------------------------
// Rung 1 — opened
// --------------------------------------------------------------------------------------------

describe(`rung 1 — ${EXAMPLE} opens through the picker and the page says which example it is`, () => {
  it("the picker offers the example by its manifest title, and describes it before it loads", () => {
    assert.equal(opened.beforeLoad.offered, EXAMPLE,
      "#example-choice does not offer the flagship, so no student route loads it");
    assert.ok(opened.beforeLoad.labels.includes(fixture.title),
      `the menu labels (${opened.beforeLoad.labels.join(", ")}) do not include the manifest's own `
      + `title '${fixture.title}', so the menu names the example something its manifest does not`);
    assert.match(opened.beforeLoad.description, new RegExp(escapeForRegExp(fixture.title)),
      "the Start region's description does not name the example");
    // The card leads with the example's own AUTHORED summary, read from the manifest and never
    // retyped here. The retired case panel used to supply this prose; the 261006 cut made the
    // manifest summary itself the authored scenario, so the REQUIREMENT is unchanged and only its
    // source moved — a student choosing an example must read what it is ABOUT, not a count of
    // its parts.
    const lead = String(fixture.summary).replace(/\s+/g, " ").trim();
    assert.match(opened.beforeLoad.description, new RegExp(escapeForRegExp(lead)),
      "the Start description does not lead with the example's authored summary, so a student "
      + "choosing this example still reads the dataset-style fixture summary");
  });

  it("the workspace mounts, Start unmounts, and the page names the system it loaded", () => {
    assert.ok(opened.afterLoad.askbarMounted, "the ask bar did not mount, so rung 2 has no surface");
    assert.ok(opened.afterLoad.editMounted, "the Edit region did not mount, so rung 4 has no route");
    assert.ok(!opened.afterLoad.startMounted,
      "Start is still mounted over a loaded workspace, which SH-I1 forbids");
    assert.match(opened.afterLoad.title, new RegExp(escapeForRegExp(opened.systemName)),
      `the page does not name the system it loaded. Rendered title: '${opened.afterLoad.title}'`);
  });

  /**
   * The identity surface is `document.title` ALONE, and that is a finding about the page.
   *
   * `index.html`'s own comment over `#summary` says *"The system's name and size, beside the title
   * rather than as the first paragraph of a Model section. It is what the workspace IS"*. The view
   * model's `summary` is six counts and no name, so after the load the only rendered place the
   * example is identified is the browser tab. `paint()` writes it from `vm.title`, so the title IS
   * rendered page state and rung 1 is assertable from it — but it is invisible to a reader looking
   * at the page rather than at the tab strip, and a screen reader announces a title on navigation
   * rather than on an in-page load.
   *
   * Pinned as what it is, so the day `#summary` gains the name this test fails and the assertion
   * above becomes the body read it should have been.
   */
  it("the body carries counts and no name — the as-built identity gap, pinned not endorsed", () => {
    assert.match(opened.afterLoad.summary, /\d+ structural models?, \d+ entit/,
      `#summary is expected to be the counts sentence; it reads '${opened.afterLoad.summary}'`);
    assert.doesNotMatch(opened.afterLoad.summary, new RegExp(escapeForRegExp(opened.systemName)),
      "#summary now names the system, which closes the gap this test records: move rung 1's "
      + "identity read off document.title and onto #summary, then delete this test");
  });
});

// --------------------------------------------------------------------------------------------
// Rung 2 — asked
// --------------------------------------------------------------------------------------------

describe("rung 2 — every curated question, asked in the catalogue and read in the answer region", () => {
  for (const query of SUGGESTED) {
    const expected = query.expected;
    const word = verdictWordFor(expected.outcome);

    it(`${query.id} renders ${word}, and its evidence is what the manifest declares`, async () => {
      const got = await askSaved(query.id);
      assert.equal(got.resolved, `saved:${query.id}`,
        `the ask catalogue does not offer '${query.id}', so no student route asks this curated `
        + "question. The catalogue IS the saved questions, so either the example stopped saving it "
        + "or the catalogue stopped reading them.");
      assert.match(got.text, new RegExp(escapeForRegExp(word)),
        `the answer region does not carry '${word}' for a question the manifest declares `
        + `'${expected.outcome}'. Rendered: ${got.text.slice(0, 300)}`);

      if (expected.refusal_contains !== undefined) {
        assert.match(got.text, new RegExp(escapeForRegExp(expected.refusal_contains)),
          "the rendered answer does not carry the declared refusal cause, so a student is told the "
          + "question cannot be answered and not why");
      }

      if (expected.no_evidence === true) {
        assert.deepEqual(got.evidence, [],
          "the manifest declares this answer carries no evidence, and the answer region rendered "
          + `some: ${got.evidence.join(" | ")}`);
        return;
      }

      const evidence = expected.evidence;
      assert.ok(evidence !== undefined,
        `${query.id} declares neither \`no_evidence\` nor an \`evidence\` block, so there is `
        + "nothing for this rung to compare the rendered witness against");
      const rendered = got.evidence.join(" ");
      assert.ok(got.evidence.length > 0,
        `the manifest declares a ${evidence.shape} witness and the answer region rendered none — `
        + "the vacuous answer this example exists to make impossible");

      // `path` is an ORDERED sequence and `nodes_include` an unordered subset; the manifest's own
      // header draws that distinction, so the two are checked differently rather than flattened.
      if (Array.isArray(evidence.path)) {
        let at = -1;
        for (const node of evidence.path) {
          const found = rendered.indexOf(node, at + 1);
          assert.ok(found > at,
            `the rendered witness does not name '${node}' after the node before it, so the ordered `
            + `path the manifest declares is not what the page shows. Rendered: ${rendered}`);
          at = found;
        }
      }
      for (const node of evidence.nodes_include ?? []) {
        assert.match(rendered, new RegExp(escapeForRegExp(node)),
          `the rendered witness does not name declared node '${node}'. Rendered: ${rendered}`);
      }
    });
  }
});

// --------------------------------------------------------------------------------------------
// Rungs 3 and 4 — the before-read, the edit, and the re-check
// --------------------------------------------------------------------------------------------

for (const modification of MODIFICATIONS) {
  describe(`rungs 3–4 — ${EXAMPLE} / ${modification.id}`, () => {
    const changes = modification.changes ?? [];
    const suggestedIds = SUGGESTED.map((q) => q.id);

    after(async () => {
      await undoToTheLoadedRevision();
    });

    it("rung 3 (MANDATORY): every declared query's row shows the word mapped from `from`", async () => {
      assert.ok(changes.length > 0,
        `${modification.id} declares no change, so there is no transition to read before or after`);
      for (const change of changes) {
        const from = verdictWordFor(change.from);
        const to = verdictWordFor(change.to);
        // The discipline the prefill gate learned: a before-read equal to the after-read cannot
        // tell a repaint from a page that was already showing the answer.
        assert.notEqual(from, to,
          `${modification.id} declares ${change.query} moving ${change.from} → ${change.to}, which `
          + `render as the same word '${from}'. The pair would not be a transition on the page, so `
          + "this journey could not distinguish a repaint from a frozen row.");
        const rendered = await verdictOf(change.query);
        assert.equal(rendered, from,
          `BEFORE the edit, the rail's row for '${change.query}' reads '${rendered}' and the `
          + `manifest declares '${change.from}' (rendered '${from}'). This is the rung the file `
          + "exists for: without it, a page frozen on a stale paint showing the AFTER word passes. "
          + `Rendered rows: ${JSON.stringify(await renderedRows())}`);
      }
    });

    it("rung 4: the edit goes through the forms, and the same rows repaint to `to` with no Run", async () => {
      for (const op of modification.transaction.operations) await driveOperation(op);
      const interposed = await takeReviewIfItInterposed();

      // Whether G3 interposes is a fact about whether a tracked claim reads `requirement`, and that
      // is a fact about `expect` on the saved query. Asserted as the join rather than as a constant.
      const anyRequirement = await page.evaluate(() =>
        [...document.querySelectorAll("#question-list [data-property]")].some((row) =>
          [...row.querySelectorAll("p > .state")][1]?.textContent === "requirement"));
      assert.equal(interposed, anyRequirement,
        interposed
          ? "the review surface interposed while no rendered claim reads `requirement`"
          : "no rendered claim reads `requirement`, so G3 cannot interpose — yet a claim on the "
            + "page does read `requirement`, which means the surface skipped an obligation");

      for (const change of changes) {
        const to = verdictWordFor(change.to);
        const rendered = await verdictOf(change.query);
        assert.equal(rendered, to,
          `AFTER ${modification.id}, the rail's row for '${change.query}' reads '${rendered}' and `
          + `the manifest declares '${change.to}' (rendered '${to}'). Nothing pressed Run: `
          + "repaint-on-commit is the product claim, and this is where it is checked. "
          + `Rendered rows: ${JSON.stringify(await renderedRows())}`);
      }

      renderedState.set(modification.id, await observeRendered(suggestedIds));
    });
  });
}

// --------------------------------------------------------------------------------------------
// The pair: two authored edits, one declared change
// --------------------------------------------------------------------------------------------

describe("modifications declaring the SAME change are distinguishable at the rendered surface", () => {
  it("each group of same-change modifications left pairwise different pages behind", () => {
    const byChange = new Map();
    for (const m of MODIFICATIONS) {
      const key = JSON.stringify((m.changes ?? []).map((c) => [c.query, c.from, c.to]));
      byChange.set(key, [...(byChange.get(key) ?? []), m.id]);
    }

    const accounted = [...byChange.values()].reduce((n, ids) => n + ids.length, 0);
    assert.equal(accounted, MODIFICATIONS.length,
      "the grouping lost a modification, so this check compared fewer pages than were driven");

    for (const [key, ids] of byChange) {
      if (ids.length < 2) continue;
      for (const id of ids) {
        assert.ok(renderedState.has(id),
          `${id} recorded no rendered state, so its journey did not reach rung 4 and this pair `
          + "cannot be compared");
      }
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
          const a = JSON.stringify(renderedState.get(ids[i]));
          const b = JSON.stringify(renderedState.get(ids[j]));
          assert.notEqual(a, b,
            `'${ids[i]}' and '${ids[j]}' declare the same change (${key}) and leave the SAME `
            + "rendered page behind. The journeys therefore show that something moved the row, not "
            + "that the two EDITS differ. This is a finding about the manifest — two authored "
            + "repairs with no observable difference — and not a reason to weaken this assertion: "
            + "either the pair needs a declared change that separates them, or the page needs to "
            + `render what does. Rendered: ${a}`);
        }
      }
    }
  });
});

// --------------------------------------------------------------------------------------------
// Proof that rung 3 fires: the stale-row page, made on purpose
// --------------------------------------------------------------------------------------------

describe("rung 3 fires — an after-only journey passes against a page whose rows never repaint", () => {
  /**
   * The negative control, and the construction is the regression class itself.
   *
   * `shell/nav.ts` paints the property rail with one call,
   * `properties.replaceChildren(propertyList)`, on the `#question-list` host. Replacing that one
   * method with a no-op detaches the rendered rail from state and leaves everything else — the
   * engine, the view model, the other regions, the whole agent surface — working perfectly. That is
   * the 749-of-749 shape exactly: a rendered surface silently detached from state while every
   * seam-level test stays green.
   *
   * The sequence, and what each step proves:
   *
   *   1. drive a declared modification         the row repaints to the `to` word
   *   2. freeze `#question-list`               the rail can no longer write
   *   3. Undo back to the loaded revision      the MODEL is back at `from`; `#undo` goes disabled
   *                                            and `#redo` goes enabled, which is the page saying
   *                                            so without consulting the oracle
   *   4. read the row                          it still shows `to` — a stale row over fresh state
   *   5. drive the same modification again     and now assert BOTH halves:
   *
   *        the after-only journey PASSES   the row reads `to`, as it has since step 1
   *        rung 3's before-read REFUSES    at step 4 the row read `to`, not `from`
   *
   * Step 5 is the whole argument. A journey that reads only the after-state cannot tell this page
   * from a working one. The before-read can, and does.
   *
   * It runs last and restores nothing, because nothing follows it but the agent-path assertion,
   * which reads a counter rather than the page.
   */
  const subject = MODIFICATIONS[0];
  const change = (subject.changes ?? [])[0];
  let fromWord;
  let toWord;
  let staleBeforeRead;
  let afterOnlyRead;
  let modelWentBack;

  before(async () => {
    fromWord = verdictWordFor(change.from);
    toWord = verdictWordFor(change.to);

    for (const op of subject.transaction.operations) await driveOperation(op);
    await takeReviewIfItInterposed();
    assert.equal(await verdictOf(change.query), toWord,
      "the control needs a row showing the AFTER word before it can freeze one");

    await page.evaluate(() => {
      document.getElementById("question-list").replaceChildren = () => { /* the defect, injected */ };
    });
    await undoToTheLoadedRevision();

    // The page's own statement that the model moved back, taken from two rendered control states
    // rather than from the oracle the rest of this file refuses.
    modelWentBack = await page.evaluate(() => ({
      undoDisabled: document.getElementById("undo").disabled,
      redoDisabled: document.getElementById("redo").disabled,
    }));

    staleBeforeRead = await verdictOf(change.query);

    for (const op of subject.transaction.operations) await driveOperation(op);
    await takeReviewIfItInterposed();
    afterOnlyRead = await verdictOf(change.query);
  }, { timeout: 120_000 });

  it("the injected defect produced a stale row over fresh state", () => {
    assert.ok(modelWentBack.undoDisabled && !modelWentBack.redoDisabled,
      "Undo did not return the workspace to the loaded revision, so the row below is not stale — "
      + `it is current. Controls read: ${JSON.stringify(modelWentBack)}`);
    assert.equal(staleBeforeRead, toWord,
      "the frozen rail did not keep the AFTER word, so the page under this control is not the "
      + "stale-row page the regression class describes");
  });

  it("the AFTER-ONLY assertion passes against it — which is why rung 3 is mandatory", () => {
    assert.equal(afterOnlyRead, toWord,
      "the after-only read failed, so this control proves nothing");
  });

  it("the BEFORE-READ refuses it: the row never showed `from`", () => {
    assert.notEqual(staleBeforeRead, fromWord,
      "the before-read agreed with the declared `from` on a page whose rail cannot repaint, which "
      + "would mean rung 3 does not fire on the defect it exists to catch");
    assert.equal(staleBeforeRead, toWord,
      `rung 3's reading at the moment the page was broken: the row showed '${staleBeforeRead}' `
      + `where the manifest declares '${change.from}' (rendered '${fromWord}'). An after-only `
      + "journey reads this page as green.");
  });
});

// --------------------------------------------------------------------------------------------
// Construction 4, mechanically
// --------------------------------------------------------------------------------------------

describe("nothing above mutated or observed through the agent surface", () => {
  it("no window.mage callable was reached but the read-only ones this file declares", async () => {
    const called = await page.evaluate(() => [...new Set(window.__journeyAgentCalls)].sort());
    const forbidden = called.filter((name) => !PERMITTED_AGENT_CALLS.has(name));
    assert.deepEqual(forbidden, [],
      `these journeys reached the agent surface: ${forbidden.join(", ")}. Every mutation must go `
      + "through the edit forms and every verdict must be read off the rendered page — an agent "
      + "path wearing a human name passes while the human surface is broken, which is the whole "
      + "reason this file is not written the short way.");
  });

  it("the page reported no error while being driven", () => {
    assert.deepEqual(diagnostics.pageErrors, [], "the page threw while a journey drove it");
    assert.deepEqual(diagnostics.notFound, [], "the page requested something the server does not have");
  });
});

/** A manifest string, usable inside a `RegExp`. The ids and witnesses carry `→` and `.` freely. */
function escapeForRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
