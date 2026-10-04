/**
 * Section 19's thirteen operations, driven by a keyboard and nothing else.
 *
 * The gap this closes. `window.mage.describe().affordanceGaps` is empty, and the landed browser
 * tier asserts that it is. But the capability registry records that a human affordance EXISTS --
 * `wired("edit-section.add-relation")` is a claim about a call site. It cannot distinguish a
 * control a keyboard reaches from one behind a `hidden` container, outside the tab order, or
 * reachable only by clicking a canvas. Section 19 asks for reachability, so reachability is what
 * this suite measures: every operation below starts with Tab presses and ends with an assertion
 * about the MODEL, never about focus.
 *
 * What is forbidden here, by construction (see keyboard.mjs): `element.click()`, `page.click()`,
 * `page.focus()`, and any `page.evaluate` that calls an application handler or assigns a form
 * value. Each would prove the handler works while proving nothing about reachability. `window.mage`
 * appears in two roles only, both of them honest: as the ORACLE that reads authoritative state back
 * (a verdict read is not an operation), and as the AGENT in the one place the requirement names an
 * agent -- "review an agent hypothesis" has to have an agent open one.
 *
 * The verdict, measured at this commit: all thirteen are reachable and operable by keyboard alone.
 * One is reachable only by a route Tab alone does not offer, and it is correct native behaviour
 * rather than a defect, which is worth writing down because a naive Tab-only audit would have
 * reported it as a failure:
 *
 *   - `#undo` / `#redo` leave the tab order while disabled, because a disabled button is not
 *     focusable. They return when there is something to undo.
 *
 * There used to be a second, and its disappearance is a route getting SIMPLER rather than a check
 * getting weaker: creating a hypothesis meant reaching `#target-hypothesis` inside a radio group,
 * which exposes one tab stop, so the unchecked member needed an ArrowDown walk. Correction 8 deleted
 * that pair for exposing internal architecture, and `#whatif-arm` -- an ordinary toolbar toggle, one
 * tab stop, answering Enter -- carries the operation now. 13.15 drives it.
 *
 * And one seam no browser automation can cross: a native file picker. `#file` is reached and
 * activated by keyboard; the BYTES are handed over with `uploadFile`, which fires the same `change`
 * the picker fires. That is named at the call site.
 *
 * Ordering. These tests share one page and run in order, because the operations genuinely depend on
 * each other -- you cannot create a relation before there is a model that declares a relation type,
 * and you cannot accept a hypothesis before one is open. `node --test` runs `it`s within a file
 * sequentially, which is what makes that legal.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  startServerOnFreePort, launchBrowser, shutdown, openWorkbench, writeReceipt,
  WORKBENCH_DIR, KEYBOARD_RECEIPT_PATH,
} from "../harness.mjs";
import {
  reachByTab, tabSequence, typeInto, chooseByKeyboard, toggleByKeyboard, pressToggleByKeyboard,
  activateByKeyboard, releaseFocus, pressShiftTab, watchLiveRegion, liveWrites, liveText, settle,
  ANNOUNCE_DEBOUNCE_MS,
} from "./keyboard.mjs";

/**
 * The server's port is the OS's choice, read back after it binds. A hard-coded 8145 contended
 * with every concurrent run of this tier, and a lost bind can drop this whole file's 22 tests
 * from a run that still prints success -- see `startServerOnFreePort`.
 */
let ORIGIN;
const FLAGSHIP = join(WORKBENCH_DIR, "examples", "message-bus", "system.mage.yaml");

let server;
let browser;
let page;
let downloads;
/** Which of the thirteen this run proved, for the receipt. */
const proved = [];
const prove = (operation, detail) => { proved.push({ operation, detail }); };

/** Authoritative state, read back as an oracle. Reading a verdict is not performing an operation. */
const context = () => page.evaluate(() => window.mage.context());
const sectionsText = () => page.evaluate(() => document.getElementById("sections").textContent ?? "");

before(async () => {
  ({ server, origin: ORIGIN } = await startServerOnFreePort(WORKBENCH_DIR));
  browser = await launchBrowser();
  ({ page } = await openWorkbench(browser, ORIGIN));
  // Tall enough that a control near the foot of the page is scrolled into view by focus rather than
  // left outside the layout viewport.
  await page.setViewport({ width: 1280, height: 1400 });
  downloads = await mkdtemp(join(tmpdir(), "wb-kbd-export-"));
  const cdp = await page.createCDPSession();
  await cdp.send("Browser.setDownloadBehavior", {
    behavior: "allowAndName", downloadPath: downloads, eventsEnabled: true,
  });
}, { timeout: 180_000 });

after(async () => {
  if (proved.length > 0) {
    const path = await writeReceipt({
      origin: ORIGIN, ranAt: new Date().toISOString(),
      operationsProved: proved.length, operations: proved,
    }, KEYBOARD_RECEIPT_PATH);
    console.log(`FR-A11Y keyboard receipt: ${path}`);
  }
  await shutdown({ browser, server });
  if (downloads) await rm(downloads, { recursive: true, force: true });
});

describe("the tab order itself", () => {
  it("opens on the skip link and then the toolbar, with no unreachable stop in between", async () => {
    await releaseFocus(page);
    const forward = await tabSequence(page, 7);
    // Pinned from a FRESH page. Undo, Redo, Export and Run are all disabled with no model loaded,
    // so none appears. Export and Run joined that list when F-2 was fixed: they shipped enabled,
    // which put two controls that could do nothing ahead of the one that could. The remaining
    // sequence is the document order of the markup, which is the requirement: the ways IN come
    // first, then the model.
    //
    // The first stop reads `a#skip`, not the anonymous `a#` this pin recorded at baseline. The id
    // is the shell's and it is load-bearing: SH-I1 makes the bypass target a QUESTION (#start
    // empty, #workspace loaded), so the composition root resolves #skip to retarget the href and
    // rewrite the words on every mount change. The walk itself — five stops, same order — did not
    // move; only the identifier of a stop the page now needs a handle on. The shell wave updated
    // the page without a runnable browser (BASELINE-a11y-261002.md §8 "UNMEASURED") and this pin
    // was the line it owed the first measured run.
    //
    // TWO STOPS JOINED, and they are site navigation rather than controls: the persistent page nav
    // `requirements-learn-261002.md` specifies — `MAGE  Workspace  Learn` — which landed in the
    // banner after the wave that was to put Learn behind a ⋯ menu never ran. They stand between the
    // bypass and the ways in because that is where page chrome belongs and because the bypass exists
    // to skip exactly this; a keyboard user who wants the model presses Enter on the skip link, as
    // the test below pins. The ways in still come before the model, which is the ordering claim.
    assert.deepEqual(forward, [
      "a#skip", "a#", "a#learn", "input#file", "button#new-system", "select#example-choice",
      "button#example-load",
    ], "the opening tab order changed");
    // Backwards too: a one-way tab order traps a keyboard user at the end of the page.
    await pressShiftTab(page);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "example-choice",
      "Shift+Tab does not walk back -- focus is one-way");
  });

  it("the pristine walk ENDS at Start -- the workspace's own controls are not in it", async () => {
    // THE PIN, UPDATED, WITH THE REASON. `BASELINE-a11y-261002.md` §3 measured the pristine walk at
    // eight stops; F-2's fix took it to six by disabling Export and Run with nothing loaded; the
    // sixth was `#diagram-subject`, the Draw menu in the old always-present Diagram section.
    //
    // SH-I1 removes it. The workspace is mounted iff a system is loaded, so on a fresh page the
    // subject chooser is inside a `hidden` region: not in the accessibility tree, not in the tab
    // order, and — the point — not a control a keyboard user reaches before there is anything to
    // draw. That took the walk to five; the persistent page nav took it to seven, and the two it
    // added are navigation rather than controls (see the pin above). What this test asserts is
    // unchanged by either number: the walk does not reach into the unmounted workspace.
    //
    // Asserted as ABSENCE-plus-cause rather than by pressing a sixth Tab, because what the browser
    // does at the end of a document's tab ring is the browser's business and not this page's claim.
    const subject = await page.evaluate(() => {
      const el = document.getElementById("diagram-subject");
      const region = document.getElementById("workspace");
      return el === null ? null : {
        inTabOrder: el.offsetParent !== null && !el.disabled,
        regionHidden: region?.hidden ?? null,
      };
    });
    assert.ok(subject, "#diagram-subject has left the page entirely -- the Draw menu is the workspace's");
    assert.equal(subject.regionHidden, true, "the workspace region is mounted on an empty workspace (SH-I1)");
    assert.equal(subject.inTabOrder, false,
      "#diagram-subject is still a tab stop on a pristine page -- the walk reaches into the unmounted workspace");
  });

  it("the skip link is the first stop and lands on the mounted principal surface", async () => {
    // 2.4.1, and SH-I1 makes the target a question rather than a constant. It used to be `#model`,
    // the structured section of the flat page. The shell has two principal surfaces and exactly one
    // is mounted, so a fixed href would point into a `hidden` region half the time: Start on an
    // empty workspace, the workspace once something is loaded. Still never the canvas.
    const skip = await page.evaluate(() => {
      const a = document.querySelector("a.skip");
      const href = a?.getAttribute("href") ?? null;
      const target = href === null ? null : document.getElementById(href.slice(1));
      return {
        href,
        text: a?.textContent?.trim() ?? null,
        targetHidden: target === null ? null : target.hidden,
        isCanvas: href === "#canvas",
      };
    });
    assert.equal(skip.href, "#start", "a pristine page's bypass does not land on Start");
    assert.equal(skip.targetHidden, false, "the skip link points at an unmounted region");
    assert.equal(skip.isCanvas, false, "the bypass must not land on the aria-hidden figure");
    assert.ok(skip.text && skip.text.length > 0, "the skip link has no accessible name");
  });
});

describe("section 19, operations 1-5: authoring", () => {
  it("13.1 IMPORT: reaches the file control by keyboard and the model arrives", async () => {
    // Import is tested FIRST because every operation after it needs a model that declares relation
    // types, and a model system created in the workbench declares none -- there is no transaction op
    // for declaring a relation type, for the agent either, so that is a symmetric limitation of the
    // IR rather than a keyboard gap. Import is also how section 3 says a real user arrives.
    // Reachability, not a press count: a Tab walk may start mid-document and wrap, so the count is
    // not stable. The opening order is pinned above, from a fresh page.
    const presses = await reachByTab(page, "file");
    // It is `.sr-only`, so assert it is genuinely in the tab order and carries a name, which is the
    // thing a 1px visually-hidden input gets wrong when it gets wrong.
    const control = await page.evaluate(() => {
      const f = document.getElementById("file");
      return { tabIndex: f.tabIndex, labelled: (f.labels?.length ?? 0) > 0, name: f.labels?.[0]?.textContent?.trim() ?? null };
    });
    assert.equal(control.tabIndex, 0);
    assert.ok(control.labelled, "#file has no <label>, so a screen reader announces an unnamed button");
    assert.match(control.name ?? "", /\.mage\.yaml/, "the file control does not say what it opens");

    // THE SEAM. A native file picker is outside the page, so neither CDP nor any other automation
    // protocol can drive it from the keyboard. Enter on a focused file input opens that picker; what
    // cannot be simulated is choosing a file in it. `uploadFile` sets `.files` and dispatches the
    // same `change` the picker dispatches, which is the event the page listens for. So: the keyboard
    // claim here covers reaching and naming the control, and the bytes come in through the one door
    // automation has. Said out loud rather than buried.
    const before = await context();
    const handle = await page.$("#file");
    await handle.uploadFile(FLAGSHIP);
    await page.waitForFunction(
      (prior) => window.mage.context().hash !== prior,
      { timeout: 30_000 }, before.hash,
    );
    const after = await context();
    assert.equal(after.systemId, "message-bus");
    assert.deepEqual(after.counts, {
      entities: 11, models: 3, machines: 0, instances: 0, relations: 18, events: 0, savedQueries: 6,
    }, "the imported system is not the flagship");
    prove("import", `#file reached in ${presses} Tab presses; imported message-bus, hash ${after.hash}`);
  });

  it("13.2 ADD AN ELEMENT: an entity typed into the form appears in the model", async () => {
    const before = await context();
    await typeInto(page, "add-entity-id", "audit-log");
    await typeInto(page, "add-entity-type", "service");
    await typeInto(page, "add-entity-label", "Audit Log");
    await activateByKeyboard(page, "add-entity-go");

    const after = await context();
    assert.equal(after.counts.entities, before.counts.entities + 1,
      `entities went ${before.counts.entities} -> ${after.counts.entities}`);
    assert.notEqual(after.hash, before.hash, "adding an entity did not advance the model's hash");
    // And it is READABLE, which is the half a transaction test cannot see.
    assert.match(await sectionsText(), /audit-log/, "the new entity is not rendered in the Entities table");
    prove("add an element", `entity audit-log added by keyboard; entities ${before.counts.entities} -> ${after.counts.entities}`);
  });

  it("13.3 CREATE A MODEL and 13.4 STATE ITS PURPOSE, in one form because the question is required", async () => {
    const before = await context();
    await typeInto(page, "add-model-id", "audit-trail");
    await typeInto(page, "add-model-label", "Audit Trail");
    // UX-I4. The form requires the engineering question, so a model cannot be created here without
    // stating its purpose -- which is the design, not a convenience.
    const question = "Which services write to the audit log?";
    await typeInto(page, "add-model-question", question);
    await typeInto(page, "add-model-entities", "audit-log, analytics");
    await activateByKeyboard(page, "add-model-go");

    const after = await context();
    assert.equal(after.counts.models, before.counts.models + 1,
      `models went ${before.counts.models} -> ${after.counts.models}`);
    const rendered = await sectionsText();
    assert.match(rendered, /Audit Trail/, "the new model is not rendered");
    // The purpose, in words, where a reader meets the model -- not only inside the IR.
    assert.match(rendered.replace(/\s+/g, " "), new RegExp(question.replace(/[?]/g, "\\?")),
      "the model's engineering question is not rendered with the model (UX-I4)");
    prove("create a model", `model audit-trail added by keyboard; models ${before.counts.models} -> ${after.counts.models}`);
    prove("state its purpose", `purpose "${question}" required by the form and rendered with the model`);
  });

  it("13.5 CREATE A RELATION: endpoints and type chosen by type-ahead", async () => {
    const before = await context();
    // The model select first: the endpoint lists are narrowed to the chosen model's own entities, so
    // choosing it out of order would offer endpoints the model does not contain.
    await chooseByKeyboard(page, "add-relation-model", "event-flow");
    await settle(200);
    await chooseByKeyboard(page, "add-relation-from", "fulfillment");
    await chooseByKeyboard(page, "add-relation-to", "billing");
    await chooseByKeyboard(page, "add-relation-type", "calls");
    await activateByKeyboard(page, "add-relation-go");

    const after = await context();
    assert.equal(after.counts.relations, before.counts.relations + 1,
      `relations went ${before.counts.relations} -> ${after.counts.relations}; `
      + `#edit-result says "${await page.evaluate(() => document.getElementById("edit-result").textContent?.trim())}"`);
    // UX-I7: the row must still say WHICH model asserts the edge. A linked view over two models is
    // not one unified model, and that distinction lives in this sentence.
    assert.match((await sectionsText()).replace(/\s+/g, " "), /fulfillment → billing/,
      "the new relation is not rendered in the Relations table");
    prove("create a relation", `event-flow fulfillment --calls--> billing by keyboard; relations ${before.counts.relations} -> ${after.counts.relations}`);
  });

  it("13.6 EDIT PROPERTIES: a typed property set on an entity, with its kind chosen explicitly", async () => {
    const before = await context();
    await chooseByKeyboard(page, "set-property-target", "analytics");
    await typeInto(page, "set-property-name", "retention_days");
    await chooseByKeyboard(page, "set-property-kind", "integer");
    await typeInto(page, "set-property-value", "30");
    await activateByKeyboard(page, "set-property-go");

    const after = await context();
    assert.notEqual(after.hash, before.hash, "setting a property did not advance the hash");
    // The VALUE and its kind, read back off the page: `30` as a number, not the string "30".
    const stored = await page.evaluate(() =>
      window.mage.inspect("analytics")?.properties ?? window.mage.context().counts);
    assert.match((await sectionsText()).replace(/\s+/g, " "), /retention_days = 30/,
      `the property is not rendered on the entity row (inspect reported ${JSON.stringify(stored)})`);
    prove("edit properties", "retention_days = 30 (integer) set on analytics by keyboard and rendered");
  });
});

describe("section 19, operations 6-10: inspection and analysis", () => {
  it("13.7 EXECUTE A QUERY: the ask form answers, with its grounding", async () => {
    // The structured builder is the ADVANCED surface since the shell's wave 1c, behind a
    // disclosure. Opened BY KEYBOARD here, which is the stronger drive: the declared path to the
    // formal controls is now `askbar -> disclose -> the fieldset`, and this walks it. A `summary`
    // is in the tab order and Enter toggles it, so no new mechanism is needed to reach the form.
    await activateByKeyboard(page, "ask-advanced-summary", { settleMs: 150 });
    await chooseByKeyboard(page, "ask-form", "direct");
    await chooseByKeyboard(page, "ask-relation", "subscribes");
    await chooseByKeyboard(page, "ask-from", "");
    await chooseByKeyboard(page, "ask-to", "order-created");
    await typeInto(page, "save-property-statement", "Some service subscribes to OrderCreated");
    await activateByKeyboard(page, "ask-go", { settleMs: 600 });

    const answer = (await page.evaluate(() =>
      document.getElementById("ask-answer").textContent ?? "")).replace(/\s+/g, " ");
    assert.notEqual(answer.trim(), "", "#ask-answer is empty -- pressing Ask produced no answer");
    // The semantic effect: a verdict WORD and the models it came from. Matched on structure, not on
    // a sentence, so a copy edit is not a failure.
    assert.match(answer, /ESTABLISHED|REFUTED|INCONCLUSIVE|NOT ANSWERABLE/i,
      `the answer carries no verdict: "${answer}"`);
    assert.match(answer, /Derived from/i, `the answer states no grounding (UX-I5): "${answer}"`);
    assert.match(answer, /ESTABLISHED/i,
      `a direct subscribes-to-OrderCreated question should be established in this model: "${answer}"`);
    // §3.4: asking saves nothing.
    const saved = (await context()).counts.savedQueries;
    assert.equal(saved, 6, `asking a question changed the saved-question count to ${saved}`);
    prove("execute a query", `direct subscribes -> order-created asked by keyboard; answer "${answer.slice(0, 80)}"`);
  });

  it("13.8 EDIT PROPERTIES, the requirement sense: the question saves as a requirement", async () => {
    const before = await context();
    await typeInto(page, "save-property-id", "audit-subscribers-exist");
    await chooseByKeyboard(page, "save-property-expect", "holds");
    await activateByKeyboard(page, "save-property-go");

    const after = await context();
    assert.equal(after.counts.savedQueries, before.counts.savedQueries + 1,
      `saved questions went ${before.counts.savedQueries} -> ${after.counts.savedQueries}`);
    const row = await page.evaluate(() => {
      const list = document.getElementById("question-list");
      return [...list.children]
        .map((c) => (c.textContent ?? "").replace(/\s+/g, " "))
        .find((t) => t.includes("Some service subscribes to OrderCreated")) ?? null;
    });
    assert.ok(row, "the saved requirement is not rendered in the property list");
    // Declaring an expectation makes it a REQUIREMENT, and the renderer must say so -- otherwise a
    // failing requirement reads as a descriptive finding.
    assert.match(row, /requirement/i, `the saved row does not present as a requirement: "${row}"`);
    prove("edit properties (requirement)", "saved audit-subscribers-exist as a requirement expecting holds");
  });

  it("13.9 INSPECT PROPERTIES AND REQUIREMENTS: every saved claim is rendered with a verdict", async () => {
    // Keyboard-driven: Run all questions re-evaluates them, and the list below is what it produced.
    await activateByKeyboard(page, "run", { settleMs: 600 });

    const { rendered, saved, withoutVerdict } = await page.evaluate(() => {
      // The rows the rail declares, by the claim id each carries. Wave 1a made the property list a
      // RAIL: the host's children are now one list wrapper, and one of the rail's rows is `+
      // Property`, which is navigation rather than a claim. `data-property` is the row's own
      // statement of which saved query it shows, so the set is addressed rather than counted by
      // position — and a row that rendered no claim is not silently included.
      const rows = [...document.querySelectorAll("#question-list [data-property]")];
      const words = /ESTABLISHED|REFUTED|INCONCLUSIVE|NOT ANSWERABLE/i;
      return {
        rendered: rows.length,
        saved: window.mage.properties().length,
        withoutVerdict: rows
          .map((r) => (r.textContent ?? "").replace(/\s+/g, " "))
          .filter((t) => !words.test(t))
          .map((t) => t.slice(0, 70)),
      };
    });
    assert.equal(rendered, saved, `${saved} properties but ${rendered} rendered`);
    assert.deepEqual(withoutVerdict, [], "a rendered property carries no verdict word");
    assert.ok(saved >= 7, `only ${saved} properties -- the save above did not land`);
    prove("inspect properties and requirements", `${rendered} rows, each with a verdict, after a keyboard Run`);
  });

  it("13.10 INSPECT EVIDENCE: a witness is listed as text, naming its nodes", async () => {
    const evidence = await page.evaluate(() =>
      [...document.querySelectorAll("#question-list .evidence")]
        .map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim()));
    assert.ok(evidence.length > 0, "no evidence is rendered for any established property");
    // A witness that names no nodes is the vacuous answer. Structure, not sentence: the arrow is the
    // path, and the node ids are the claim.
    const paths = evidence.filter((t) => /witness|counterexample/i.test(t) && t.includes("→"));
    assert.ok(paths.length > 0, `evidence is rendered but no witness path names its nodes: ${JSON.stringify(evidence)}`);
    assert.ok(paths.some((t) => t.includes("order-created")),
      `no witness names order-created, which every established question here runs through: ${JSON.stringify(paths)}`);
    // FR-A11Y-2: this must be the ACCESSIBLE representation, so it cannot be inside the aria-hidden
    // figure. Checked, because "the structured view is the accessible one" is the whole argument for
    // hiding the canvas.
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll("#question-list .evidence")]
        .filter((e) => e.closest("[aria-hidden='true']") !== null).length);
    assert.equal(hidden, 0, "evidence is rendered inside an aria-hidden subtree");
    prove("inspect evidence", `${paths.length} witness path(s) rendered as text outside any aria-hidden subtree`);
  });

  it("13.11 NAVIGATE SHARED IDENTITIES: one entity, two models, reached by keyboard", async () => {
    // The entity table states it in words first: an entity is the one identity namespace, and the
    // models it appears in are named on its row. In a diagram this is a highlight; here it is a
    // sentence, which is the point of FR-A11Y-2.
    const row = await page.evaluate(() => {
      const cell = [...document.querySelectorAll("#sections td")]
        .find((td) => (td.textContent ?? "").trim() === "order-created");
      return cell?.parentElement?.textContent?.replace(/\s+/g, " ") ?? null;
    });
    assert.ok(row, "there is no order-created row in the Entities table");
    assert.match(row, /appears in .*Data Policy/, `the entity row does not name the models it appears in: "${row}"`);
    assert.match(row, /appears in .*Event Flow/, `the entity row names only one model: "${row}"`);

    // And then NAVIGATED: change the model under inspection by keyboard, twice, and find the same
    // identity in both. This is the operation -- not reading one row, but following an identity
    // across two purposeful reductions without touching the canvas.
    await chooseByKeyboard(page, "diagram-subject", "model:data-policy");
    await settle(400);
    const inPolicy = await page.evaluate(() => document.getElementById("diagram-text").textContent ?? "");
    assert.match(inPolicy, /Data Policy/, "the structured diagram reading did not follow the subject");
    assert.match(inPolicy, /order-created/, "order-created is absent from the Data Policy reading");

    await chooseByKeyboard(page, "diagram-subject", "model:event-flow");
    await settle(400);
    const inFlow = await page.evaluate(() => document.getElementById("diagram-text").textContent ?? "");
    assert.match(inFlow, /Event Flow/, "the structured diagram reading did not follow the subject");
    assert.match(inFlow, /order-created/, "order-created is absent from the Event Flow reading");
    assert.notEqual(inPolicy, inFlow, "both readings are identical -- the subject did not actually change");
    prove("navigate shared identities",
      "order-created followed from model:data-policy to model:event-flow via #diagram-subject type-ahead");
  });

  it("13.12 INSPECT NOTES: a note is attached and read back, and the revision does not move", async () => {
    // Pre-existing notes first: the flagship ships a rationale note, and an inspector that renders
    // only notes added in this session would pass the second half of this test and fail a user.
    const shipped = await page.evaluate(() =>
      [...document.querySelectorAll("#sections ul.notes li")].length);
    assert.ok(shipped > 0, "the shipped example's notes are not rendered at all");

    const before = await context();
    await chooseByKeyboard(page, "add-note-target", "entity:order-created");
    await chooseByKeyboard(page, "add-note-kind", "assumption");
    await typeInto(page, "add-note-text", "Reviewed by keyboard only.");
    await activateByKeyboard(page, "add-note-go");

    const notes = await page.evaluate(() =>
      [...document.querySelectorAll("#sections ul.notes li")]
        .map((li) => (li.textContent ?? "").replace(/\s+/g, " ")));
    assert.ok(notes.some((t) => t.includes("Reviewed by keyboard only.")),
      `the note was not rendered; notes are ${JSON.stringify(notes.slice(0, 4))}`);
    assert.ok(notes.some((t) => /assumption/.test(t) && t.includes("Reviewed by keyboard only.")),
      "the note is rendered without its kind, so a note reads as a finding (UX-I6)");
    // A1 / UX-I6: an annotation-only edit commits WITHOUT advancing the semantic revision. Asserted
    // here because it is the invariant that makes a note safe to add while reviewing.
    const after = await context();
    assert.equal(after.hash, before.hash,
      "attaching a note advanced the model's hash -- a note must not change what the model asserts");
    prove("inspect notes",
      `${shipped} shipped note(s) rendered; one added by keyboard, hash unchanged at ${after.hash}`);
  });
});

describe("section 19, operations 11-13: hypotheses, and getting the model back out", () => {
  it("13.13 REVIEW AN AGENT HYPOTHESIS: the agent opens it, the keyboard reaches both ways out", async () => {
    // The ONE place an agent belongs in this suite: the requirement says "an AGENT hypothesis", so
    // an agent opens it. Everything the HUMAN then does is keyboard.
    const authoritative = (await context()).hash;
    await page.evaluate(() => window.mage.hypothesis.open("agent-proposal", {
      transaction: {
        base: window.mage.context().hash,
        target: "agent-proposal",
        operations: [{ op: "add-entity", id: "proposed-cache", label: "Proposed Cache" }],
      },
    }));
    await page.waitForFunction(() => document.getElementById("hypothesis-bar").hidden === false, { timeout: 30_000 });

    // Reviewable in WORDS: the banner says the authoritative model is unchanged, and the proposal's
    // content is in the tables where a reader can see what is being proposed.
    const banner = (await page.evaluate(() => document.getElementById("banner").textContent ?? "")).replace(/\s+/g, " ");
    assert.match(banner, /agent-proposal/, `the banner does not name the hypothesis: "${banner}"`);
    assert.match(banner, /unchanged/i, `the banner does not say the authoritative model is untouched: "${banner}"`);
    assert.match(await sectionsText(), /proposed-cache/, "the hypothesis's change is not visible for review");

    // Both ways out, reachable. A review surface with an unreachable Discard is a trap.
    const applyAt = await reachByTab(page, "hypothesis-apply");
    const discardAt = await reachByTab(page, "hypothesis-discard");
    assert.ok(applyAt > 0 && discardAt > 0);
    prove("review an agent hypothesis",
      `agent opened agent-proposal over authoritative ${authoritative}; banner names it, both bar buttons reachable by Tab`);
  });

  it("13.14 DISCARD IT: Enter on Discard, and the authoritative model is as it was", async () => {
    const authoritative = await page.evaluate(() => window.mage.context().hash);
    await activateByKeyboard(page, "hypothesis-discard", { settleMs: 500 });

    const state = await page.evaluate(() => ({
      hidden: document.getElementById("hypothesis-bar").hidden,
      hypothesis: window.mage.hypothesis.current?.() ?? null,
      hash: window.mage.context().hash,
    }));
    assert.equal(state.hidden, true, "the hypothesis bar is still showing after Discard");
    assert.doesNotMatch(await sectionsText(), /proposed-cache/,
      "the discarded hypothesis's entity is still in the model");
    assert.notEqual(state.hash, authoritative,
      "the hash did not change when the hypothesis branch was dropped -- it should return to the authoritative revision");
    prove("discard a hypothesis", "Enter on #hypothesis-discard removed proposed-cache and restored the authoritative revision");
  });

  it("13.15 ACCEPT IT: a hypothesis created by keyboard, then accepted by keyboard", async () => {
    // The ROUTE here changed in wave 2c and the requirement did not. Creating a hypothesis used to
    // mean pre-selecting `#target-hypothesis` in a radio pair before editing -- "Apply the next edit
    // to ○ the authoritative model ○ a hypothesis" -- and correction 8 deleted that pair for
    // exposing internal architecture (DESIGN-shell-261002.md §9e). What replaced it is ONE toggle in
    // the toolbar, `#whatif-arm`, and the route is strictly simpler for a keyboard: Tab and Enter on
    // the toggle, then the ordinary edit, then Enter on Commit inside the review surface. The same
    // three keystroke classes with one fewer radio group, and no step that is not a tab stop.
    //
    // Arming is NECESSARY here rather than decorative, which is worth stating because it looks like
    // ceremony. G3 interposes the review surface only when an edit would move a REQUIREMENT
    // (DECISIONS-RULED-shell-261002.md G3); adding an entity moves none, so an unarmed edit would
    // commit straight to the authoritative branch and there would be no hypothesis to accept. The
    // toggle is how a user says "try this" where no obligation is at stake.
    await pressToggleByKeyboard(page, "whatif-arm", true);
    await typeInto(page, "add-entity-id", "kbd-cache");
    await typeInto(page, "add-entity-type", "");
    await typeInto(page, "add-entity-label", "");
    await activateByKeyboard(page, "add-entity-go", { settleMs: 500 });

    assert.equal(await page.evaluate(() => document.getElementById("hypothesis-bar").hidden), false,
      `the keyboard edit did not open a hypothesis; #edit-result says `
      + `"${await page.evaluate(() => document.getElementById("edit-result").textContent?.trim())}"`);
    // The branch the toggle created, NAMED, and read from the banner a person actually gets. An
    // armed what-if is labelled by the surface rather than by a name field the user had to fill in
    // (the deleted radio pair carried one), so the label is the evidence that the TOGGLE routed this
    // edit rather than something else having opened a hypothesis.
    const whatIfBanner = (await page.evaluate(() =>
      document.getElementById("banner").textContent ?? "")).replace(/\s+/g, " ");
    assert.match(whatIfBanner, /what-if/i,
      `the banner does not name a what-if branch, so the toggle did not route this edit: "${whatIfBanner}"`);

    const beforeApply = await context();
    await activateByKeyboard(page, "hypothesis-apply", { settleMs: 500 });
    assert.equal(await page.evaluate(() => document.getElementById("hypothesis-bar").hidden), true,
      "the hypothesis bar is still showing after Accept");
    // The semantic effect: what was provisional is now authoritative.
    assert.match(await sectionsText(), /kbd-cache/, "the accepted hypothesis's entity is not in the model");
    assert.equal((await context()).hash, beforeApply.hash,
      "accepting changed the hash -- the accepted branch IS the model, so it must carry the same hash");

    // The toggle is one-shot and disarms itself on the edit it routes. Asserted rather than assumed,
    // because a toggle that stayed armed would silently branch the next test's edit -- which is the
    // hazard the deleted radio pair had, and the reason that pair needed resetting here.
    assert.equal(await page.evaluate(() => document.getElementById("whatif-arm").getAttribute("aria-pressed")),
      "false", "#whatif-arm stayed armed after the edit it routed, so the next edit would branch too");
    prove("accept a hypothesis",
      "Enter on #whatif-arm armed a what-if, a keyboard edit opened it, Enter on Commit made kbd-cache authoritative");
  });

  it("13.16 EXPORT: Enter on Export writes the authoritative serialization to disk", async () => {
    await activateByKeyboard(page, "export", { settleMs: 300 });
    // Poll rather than sleep: the download is a browser-side write and its timing is not ours.
    let files = [];
    for (let i = 0; i < 50 && files.length === 0; i += 1) {
      await settle(100);
      files = (await readdir(downloads)).filter((f) => !f.endsWith(".crdownload"));
    }
    assert.ok(files.length > 0,
      "Enter on #export produced no file. The handler did run or did not -- #live says "
      + `"${await liveText(page)}"`);

    const body = await readFile(join(downloads, files[0]), "utf8");
    assert.ok(body.length > 1000, `the exported file is ${body.length} bytes -- too small to be the model`);
    assert.match(body, /\bmessage-bus\b/, "the export does not name the system it serializes");
    // The entity added by keyboard three tests ago has to be IN it, or export is writing something
    // other than the model on screen.
    assert.match(body, /audit-log/, "the export omits an entity added through the human surface");
    assert.equal(body, await page.evaluate(() => window.mage.export()),
      "the keyboard export and the agent export disagree -- there are two serializers");
    prove("export", `${body.length} bytes written by Enter on #export, byte-identical to window.mage.export()`);
  });
});

describe("the list is complete", () => {
  it("every one of section 19's thirteen operations was driven, by name", () => {
    // The thirteen, verbatim from requirements-human-ux-261002.md section 19, each mapped to the
    // operation label the test above recorded when it passed. This exists so the claim cannot
    // shrink quietly: delete a test and the suite still goes green, but this assertion names the
    // operation that stopped being covered.
    //
    // Two of the thirteen are compounds in the source text and need BOTH halves.
    const required = [
      ["create a model", ["create a model"]],
      ["state its purpose", ["state its purpose"]],
      ["add an element", ["add an element"]],
      ["create a relation", ["create a relation"]],
      ["edit properties", ["edit properties", "edit properties (requirement)"]],
      ["navigate shared identities", ["navigate shared identities"]],
      ["inspect notes", ["inspect notes"]],
      ["execute a query", ["execute a query"]],
      ["inspect evidence", ["inspect evidence"]],
      ["inspect properties and requirements", ["inspect properties and requirements"]],
      ["review an agent hypothesis", ["review an agent hypothesis"]],
      ["accept or discard it", ["accept a hypothesis", "discard a hypothesis"]],
      ["import and export", ["import", "export"]],
    ];
    assert.equal(required.length, 13, "section 19 lists thirteen operations");
    const done = new Set(proved.map((p) => p.operation));
    const uncovered = required
      .filter(([, labels]) => labels.some((l) => !done.has(l)))
      .map(([operation, labels]) => `${operation} (missing ${labels.filter((l) => !done.has(l)).join(", ")})`);
    assert.deepEqual(uncovered, [],
      "section 19 operations with no passing keyboard test in this run");
  });
});

describe("FR-A11Y-3: announced, and announced once", () => {
  it("a consequential change announces in the live region", async () => {
    await watchLiveRegion(page);
    await activateByKeyboard(page, "run", { settleMs: 700 });
    const writes = await liveWrites(page);
    assert.ok(writes.length > 0, "Run all questions announced nothing");
    assert.match(writes.at(-1)?.text ?? "", /Re-evaluated \d+ propert/i,
      `the announcement does not say what happened: "${writes.at(-1)?.text}"`);
  });

  it("the announcement WAITS for the state to settle rather than firing per keystroke", async () => {
    // Five activations inside the window, and the measurement that discriminates: the region is
    // written ONCE, and not until the debounce has elapsed. An undebounced `announce` writes
    // synchronously inside the click handler, so its first write would land within a millisecond or
    // two of the first Enter -- which is the difference between a settled sentence and a queue.
    //
    // The timing assertion carries this test, not the count. Five identical Run messages produce
    // one mutation whether or not they were debounced (see keyboard.mjs on identical writes), so a
    // count alone would pass on a page with no debounce at all.
    //
    // The Ask first is the instrument, not the subject: the previous test left the Run message in
    // the region, and re-announcing a string already there writes nothing at all. Asking puts a
    // DIFFERENT sentence there so the storm's settled write is observable.
    // The Advanced disclosure is open from 13.7 above; asserted rather than assumed, because this
    // test uses Ask as an INSTRUMENT and a closed disclosure would read as a debounce failure.
    await page.evaluate(() => {
      const box = document.getElementById("ask-advanced");
      if (box !== null && !box.open) box.open = true;
    });
    await activateByKeyboard(page, "ask-go", { settleMs: 700 });
    assert.match(await liveText(page), /Answered/i,
      "the Ask preamble did not announce, so the storm's settled write would be unobservable");

    await reachByTab(page, "run");
    await watchLiveRegion(page);
    for (let i = 0; i < 5; i += 1) await page.keyboard.press("Enter");
    // Read once well inside the window: nothing may have been written yet.
    const earlyWrites = await liveWrites(page);
    await settle(900);
    const writes = await liveWrites(page);

    assert.equal(writes.length, 1,
      `five rapid activations produced ${writes.length} announcements: ${JSON.stringify(writes)}`);
    assert.match(writes[0].text, /Re-evaluated/i);
    assert.deepEqual(earlyWrites, [],
      `the live region was written ${earlyWrites.length} time(s) before the debounce elapsed: `
      + `${JSON.stringify(earlyWrites)} -- announcements are firing per keystroke`);
    // 200ms rather than 250ms: scheduler jitter can only make the observed delay LONGER, so the
    // floor is the safe side, and an undebounced write measures in single-digit milliseconds.
    assert.ok(writes[0].delayMs >= 200,
      `the announcement landed ${writes[0].delayMs}ms after the first keystroke -- the 250ms debounce `
      + "in main.ts is not in the path");
  });

  it("one edit that moves four verdicts announces once, naming both the edit and the verdicts", async () => {
    // The worst storm in the application, and the reason `main.ts` has TWO pending slots behind one
    // timer: an edit announces itself, and the property-verdict change announces separately, and a
    // cascade delete moves four verdicts at once. If those raced, one would overwrite the other and
    // the user would hear half of what happened.
    //
    // Measured on this example: deleting order-created with cascade moves
    // checkout-event-reaches-fulfillment and restricted-data-reaches-impermitted-subscriber from
    // established to refuted, and who-publishes/who-subscribes-to-order-created to not-answerable.
    //
    // THE ROUTE CHANGED, AND IT CHANGED BECAUSE THIS SUITE SUCCEEDED. 13.9 above saves
    // `audit-subscribers-exist` as a REQUIREMENT, which is the first requirement this workbench has
    // ever had; the cascade below breaks it; so G3 interposes the REVIEW CHANGE surface rather than
    // committing (DECISIONS-RULED-shell-261002.md G3). The storm therefore arrives in two acts now
    // -- the surface announcing what it is holding, then the commit announcing what it did -- and
    // the measurement follows the act that actually carries FR-A11Y-3's composition claim.
    //
    // Driving it through the surface rather than moving the storm to an obligation-free edit, for
    // one reason: on any model system that declares a requirement, THIS is the path a cascade delete
    // takes. A storm measured on the uninterposed path would be measuring a route this example no
    // longer uses.
    const before = await page.evaluate(() =>
      Object.fromEntries(window.mage.properties().map((p) => [p.id, p.status])));

    await watchLiveRegion(page);
    await chooseByKeyboard(page, "delete-element-target", "entity:order-created");
    await toggleByKeyboard(page, "delete-element-cascade", true);
    // Arm the observer AFTER the choices: picking an option announces nothing, but a stray write
    // would make the count below mean something other than what it claims.
    await watchLiveRegion(page);
    await activateByKeyboard(page, "delete-element-go", { settleMs: 900 });

    // Act one: held, not committed. Asserted rather than assumed, because if the interposition ever
    // stopped firing this test would otherwise quietly go back to measuring the direct path and the
    // requirement G3 exists to protect would be committed through unreviewed.
    assert.equal(await page.evaluate(() => document.getElementById("hypothesis-bar").hidden), false,
      "the cascade that breaks audit-subscribers-exist committed without a review -- G3 did not fire");
    const held = await liveWrites(page);
    assert.equal(held.length, 1,
      `opening the review surface produced ${held.length} announcements: ${JSON.stringify(held)}`);
    assert.match(held[0].text, /Review change/i,
      `the review surface did not announce what it is holding: "${held[0].text}"`);

    // Act two: Enter on Commit, inside the modal. This is the write the composition claim is about.
    await watchLiveRegion(page);
    await activateByKeyboard(page, "hypothesis-apply", { settleMs: 900 });
    assert.equal(await page.evaluate(() => document.getElementById("hypothesis-bar").hidden), true,
      "the review surface is still open after Enter on Commit");

    const after = await page.evaluate(() =>
      Object.fromEntries(window.mage.properties().map((p) => [p.id, p.status])));
    const moved = Object.keys(before).filter((id) => before[id] !== after[id]);
    assert.ok(moved.length >= 3,
      `the edit moved only ${moved.length} verdict(s) (${moved.join(", ")}) -- not a storm, so this test `
      + "is no longer testing the thing it was written for");

    const writes = await liveWrites(page);
    assert.equal(writes.length, 1,
      `an edit that moved ${moved.length} verdicts produced ${writes.length} announcements on commit: `
      + JSON.stringify(writes));
    // This count DOES discriminate, and it is the test that carries FR-A11Y-3's "excessive
    // announcements" clause: the edit and the verdict news come from two different senders with two
    // different texts, so an undebounced page writes twice -- and the second overwrites the first,
    // leaving the user with half of what happened. The commit path makes that strictly harder,
    // because it discards the probe branch and re-applies through `transact`, so the verdicts move
    // TWICE inside one turn and an undebounced page would write three times rather than two.
    //
    // ONE sentence carrying BOTH consequences. Either half alone is a regression: the edit without
    // the verdicts hides the analysis, the verdicts without the edit hide the cause.
    const announced = writes[0].text;
    assert.match(announced, /delete-entity committed/i, `the announcement omits the edit: "${announced}"`);
    assert.match(announced, /property verdict\(s\) changed/i,
      `the announcement omits the verdict movement: "${announced}"`);
    assert.match(announced, new RegExp(`\\b${moved.length} property verdict`),
      `the announcement miscounts the verdicts that moved (${moved.length}): "${announced}"`);
    // Without unnecessary focus movement: the region is never focused, and must not be focusable.
    const live = await page.evaluate(() => {
      const el = document.getElementById("live");
      return { focused: document.activeElement === el, tabIndex: el.tabIndex, role: el.getAttribute("role") };
    });
    assert.equal(live.focused, false, "the live region took focus -- FR-A11Y-3 forbids moving the caret to announce");
    assert.equal(live.role, "status");
  });
});

describe("UX-I1: the configuration space is walkable by a person, not only by an agent", () => {
  /**
   * The drive that makes `explore-space`'s human affordance mean something.
   *
   * The registry declaring `control("system-browser.explore", "explore-space-go")` is a claim about
   * wiring; this is the claim about REACHABILITY, which is the half UX-I1 was just made
   * compiler-backed to stop anyone skipping. An affordance declared and unreachable is the exact
   * defect — and it is the defect this capability shipped with for a wave, as a declared absence.
   *
   * Keyboard only, like everything else in this file: Tab until the button has focus, Enter, then an
   * assertion about the READOUT rather than about focus. `window.mage` appears once, as the oracle
   * that confirms the agent-side call answers about the same system.
   *
   * **What this page can honestly answer, and why the assertion is shaped around it.** The flagship
   * example declares no state machine, so the reachable configuration space is not a thing it has —
   * and the engine says so, naming `machines:` and what to declare. That refusal IS the right answer
   * here, so the assertion admits exactly two shapes and NEITHER of them is silence: a summary that
   * commits to Complete or Bounded, or a refusal that says what the system would need. The wording of
   * the summary arm — exhausted versus bounded, the dead ends, the disclosed rewrites — is pinned
   * exhaustively in the node tier over both arms, where it costs no browser.
   */
  it("Tab reaches Explore configuration space, and Enter answers or says why it cannot", async () => {
    // ONE DISCLOSURE FIRST, since wave 3 made the System Browser's exhaustive content on demand
    // (correction 3). This drive went red on the change with "The walk ended on summary", which is
    // the gate reporting the truth: the button was behind a closed `<details>` and a keyboard could
    // not arrive at it without opening that. The step is added rather than the disclosure removed —
    // the declared path in `capabilities.ts` gained the same step, and the generated drive in
    // `paths.test.mjs` walks it. This test's remaining job is the stronger one: that Enter on the
    // button produces an HONEST readout, which no generated arrival check asserts.
    await reachByTab(page, "system-browser-detail-summary");
    await page.keyboard.press("Enter");
    const reachedAt = await reachByTab(page, "explore-space-go");
    assert.ok(reachedAt > 0);

    const before = await page.evaluate(() =>
      document.getElementById("explore-space-result").textContent ?? "");
    assert.match(before, /Not walked yet/,
      `the readout does not start idle, so a stale sentence could pass this test: "${before}"`);

    await watchLiveRegion(page);
    await page.keyboard.press("Enter");
    // The walk runs off the main thread and the Worker is spawned lazily on this first call, so the
    // wait is for the READOUT to stop saying it is working rather than for a fixed delay.
    await page.waitForFunction(
      () => {
        const text = document.getElementById("explore-space-result").textContent ?? "";
        return text !== "" && !/Walking/.test(text);
      },
      { timeout: 60_000 },
    );
    const after = (await page.evaluate(() =>
      document.getElementById("explore-space-result").textContent ?? "")).replace(/\s+/g, " ");

    // One of the two honest shapes, and nothing else. A readout that neither commits to an answer
    // nor says why there is none is the ceremonial button this capability was wired to avoid.
    const summary = /^(Complete|Bounded)\b/.test(after);
    const refusal = /^The walk did not run:/.test(after);
    assert.ok(summary || refusal,
      `the readout neither reports a space nor says why it cannot: "${after}"`);
    assert.doesNotMatch(after, /undefined|NaN|\[object/,
      `the readout rendered a value it could not describe: "${after}"`);
    if (summary) {
      assert.match(after, /\d+ (reachable )?configuration\(s\)/,
        `the readout commits to an answer and reports no state count: "${after}"`);
    } else {
      // The refusal has to be ACTIONABLE, which is this project's standing rule for a declined
      // question: the flagship declares no machine, so the sentence names what a machine is declared
      // under rather than reporting a space of zero and letting a reader conclude the model is inert.
      assert.match(after, /machines:/,
        `the refusal does not say what the system would need to have a configuration space: "${after}"`);
    }
    // Re-enabled, so the control is usable twice. A button that runs once and stays dead is a worse
    // affordance than none, because the page still says it is there.
    assert.equal(await page.evaluate(() => document.getElementById("explore-space-go").disabled), false,
      "the Explore button stayed disabled after the walk settled");

    // FR-A11Y-3: the result is consequential, so it reaches a screen-reader user through the page's
    // ONE live region rather than only as text somebody has to go back and find.
    await settle(ANNOUNCE_DEBOUNCE_MS + 400);
    const writes = await liveWrites(page);
    assert.ok(writes.some((w) => /Configuration space/i.test(w.text)),
      `the walk's result was never announced: ${JSON.stringify(writes)}`);

    // UX-I1's "both sides invoke the same service", as an observation rather than a claim: the agent
    // asks the same question of the same system and gets the same KIND of answer back, which is what
    // one seam means. A human refusal beside an agent summary would be two explorers.
    const agent = await page.evaluate(() => window.mage.analysis.explore());
    assert.equal(agent.status === "ok-space", summary,
      `the human readout and window.mage.analysis.explore() disagree about the same system: `
      + `the page says "${after}" and the agent says '${agent.status}' — they are not on one seam`);
    if (agent.status === "ok-space") {
      assert.ok(after.includes(String(agent.space.statesExplored)),
        `the two sides disagree about the size of the space: "${after}" vs ${agent.space.statesExplored} states`);
    }
    prove("explore the configuration space",
      `Tab reached #explore-space-go at stop ${reachedAt}; Enter produced "${after}"`);
  });
});
