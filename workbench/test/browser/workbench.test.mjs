/**
 * The browser tier: load the page a user actually opens, in a real browser, and assert the things
 * only a browser can see.
 *
 * Why this exists. The other 400-odd tests are node-tier — they drive the IR, the engine, the
 * validator, the view model and the services facade directly. None of them loads index.html. So the
 * one action every user performs first, and the CDP agent path FR-AGENT-1 and -2 specify, were the
 * only parts of the workbench with no gate at all. They had been demonstrated to work exactly once,
 * by hand.
 *
 * Every number asserted below was MEASURED against this commit's tree, by running the suite's own
 * harness and printing what the page reported: 0 affordance gaps, 0 unlabelled
 * controls, 11 entities / 3 models / 18 relations / 6 saved questions in the flagship example.
 * None is a guess.
 *
 * What is deliberately NOT asserted: the focusable-control count, measured at 52. It will grow as
 * affordances land, and a test that fails on progress gets deleted rather than fixed. The
 * assertion that carries the a11y claim is that NONE of them is unlabelled — true at any count.
 *
 * Refusal text is matched by CAUSE, never by sentence. A reworded refusal is not a regression; a
 * missing one is. The two refusing queries must stay `unlicensed` rather than becoming `refuted`,
 * because "the model does not license this question" and "no such path exists" are different
 * claims, and keeping them apart is the workbench's distinctive thesis.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  CAPABILITIES, CHROME_CONTROLS, CHROME_HOSTS, boundHumanAffordances, checkAffordanceParity,
  checkRegistryClosure,
} from "../../src/app/capabilities.ts";
import {
  startServer, launchBrowser, shutdown, openWorkbench, loadFlagshipExample,
  advanceVirtualTime, measureForReceipt, writeReceipt, PORT, ORIGIN, WORKBENCH_DIR,
} from "./harness.mjs";

/** One browser and one page for the whole suite: the convergence test needs both interfaces in ONE process. */
let server;
let browser;
let page;
let diagnostics;
let loaded;
let measured;

before(async () => {
  server = await startServer();
  browser = await launchBrowser();
  ({ page, diagnostics } = await openWorkbench(browser));
  loaded = await loadFlagshipExample(page);
  measured = await measureForReceipt(page);
}, { timeout: 180_000 });

after(async () => {
  // Written whether or not the assertions passed. It attests that a browser booted and the page
  // loaded — the one thing node's exit code cannot distinguish from a glob that matched no files.
  if (measured) {
    const path = await writeReceipt({ origin: ORIGIN, ranAt: new Date().toISOString(), ...measured, diagnostics });
    console.log(`browser tier receipt: ${path}`);
  }
  await shutdown({ browser, server });
});

describe("FR-AGENT: the agent surface is reachable from the page context", () => {
  it("installs window.mage with a version", async () => {
    const got = await page.evaluate(() => ({ type: typeof window.mage, version: window.mage?.version ?? null }));
    assert.equal(got.type, "object", `window.mage is ${got.type} — the agent surface did not install (served at :${PORT})`);
    assert.match(got.version, /^\d+\.\d+\.\d+$/);
  });

  it("describe() reports exactly the registry's capabilities, each named and summarised", async () => {
    const d = await page.evaluate(() => {
      const x = window.mage.describe();
      return {
        count: x.operations.length,
        unnamed: x.operations.filter((o) => !o.name || !o.summary).map((o) => o.name ?? "(anonymous)"),
        schemas: Object.keys(x.schemas).sort(),
        limitations: x.notSupported.length,
      };
    });
    // DERIVED from the registry, not a measured snapshot. The count was 20 when this suite was
    // written and 22 an hour later, when a wave registered load-example and inspect-provenance —
    // so a literal here failed on progress, which is the exact failure mode this file's own header
    // warns about for the focusable count. `describe().operations` IS the registry projected into
    // the page, so comparing the page's count to the registry's is the assertion that means
    // something: it catches a projection that drops or invents an operation, at any registry size.
    assert.equal(d.count, CAPABILITIES.length,
      `the page advertises ${d.count} operations, the registry declares ${CAPABILITIES.length} — describe() is not projecting the registry`);
    assert.deepEqual(d.unnamed, [], "an operation shipped without a name or a summary");
    // The schemas ride inline so an agent needs no second fetch and no network (FR-AGENT-2).
    assert.deepEqual(d.schemas, ["model", "query", "transaction"]);
    assert.ok(d.limitations > 0, "notSupported is empty — an agent would learn the boundary from a wrong answer");
  });

  it("reports the registry's affordance gaps, and no others (UX-I1)", async () => {
    const gaps = await page.evaluate(() => window.mage.describe().affordanceGaps);
    // DERIVED from the registry, like the operation count above, and for the same reason: a literal
    // zero was right while zero was the truth, and failed on the wave that declared
    // `explore-space` — a capability whose human side is genuinely absent. Comparing the served
    // page's list to the registry's is the assertion that means something at any gap count: it
    // catches a page that invents a gap, hides one, or stops projecting the registry at all.
    //
    // A gap still means an agent can do something no human can see or reverse. That is why it must
    // reach the API rather than be quietly held at zero — and why the gap LIST is pinned in
    // test/capabilities.test.ts, where changing it is a deliberate edit to a named baseline.
    const expected = checkAffordanceParity().map((v) => `${v.capability}: ${v.problem}`);
    assert.deepEqual(gaps, expected,
      `the page reports ${gaps.length} gap(s) and the registry has ${expected.length}: ${gaps.join("; ")}`);
  });

  it("context() returns the system hash", async () => {
    const ctx = await page.evaluate(() => window.mage.context());
    assert.match(ctx.hash, /^fnv1a64:[0-9a-f]{16}$/, "the context hash lost its algorithm tag or its width");
    assert.equal(ctx.hash, loaded.context.hash, "load() and context() disagree about the hash of the same system");
  });
});

describe("examples section 4.5: the flagship journey through window.mage.load", () => {
  it("loads the message-bus system with no findings", () => {
    assert.equal(loaded.context.systemId, "message-bus");
    assert.deepEqual(loaded.context.findings, [], "the shipped example does not validate clean");
    assert.deepEqual(loaded.context.counts, {
      entities: 11, models: 3, machines: 0, instances: 0, relations: 18, events: 0, savedQueries: 6,
    });
  });

  it("the cross-model safety query returns a witness, exhaustively", async () => {
    const r = await page.evaluate(() => window.mage.savedQueries()["restricted-data-reaches-impermitted-subscriber"]);
    // `holds` IS the safety breach: the question is existential, so a witness is the counterexample
    // to the requirement. Neither model answers it alone — event-flow has the `subscribes` edge,
    // data-policy has the sensitivities — so this result is the cross-model join working.
    assert.equal(r.outcome, "holds");
    assert.equal(r.coverage.kind, "exhaustive");
    assert.ok(r.evidence, "holds with no evidence is the vacuous answer this project has shipped before");
    assert.equal(r.evidence.shape, "path");
    assert.equal(r.evidence.role, "witness");
    assert.deepEqual([...r.evidence.nodes].sort(), ["analytics", "order-created"]);
  });

  it("the uncomposable chain is refused for path composition, not answered false", async () => {
    const r = await page.evaluate(() => window.mage.savedQueries()["subscribes-chain-checkout-to-fulfillment"]);
    // V7. `refuted` would assert no such chain exists — a claim event-flow never made.
    assert.equal(r.outcome, "unlicensed");
    assert.equal(r.coverage.kind, "not-applicable");
    assert.equal(r.evidence, null, "a refusal must carry no evidence; there is nothing it could be evidence of");
    assert.match(r.refusal, /path.composition/i, `refusal does not name path composition as the cause: ${r.refusal}`);
  });

  it("the undeclared-observation query is refused by naming the relation type", async () => {
    const r = await page.evaluate(() => window.mage.savedQueries()["did-analytics-receive-it-at-2-04"]);
    // Purposeful omission, executed rather than described: both event models represent permission
    // and neither represents observation, so there is no vocabulary in which to ask.
    assert.equal(r.outcome, "unlicensed");
    assert.equal(r.coverage.kind, "not-applicable");
    assert.equal(r.evidence, null);
    assert.match(r.refusal, /observed_delivery/, `refusal does not name the undeclared relation type: ${r.refusal}`);
    assert.match(r.refusal, /not declared/i);
  });

  it("every saved query reports the hash of the system it describes", async () => {
    const stamped = await page.evaluate(() => {
      const hash = window.mage.context().hash;
      return Object.entries(window.mage.savedQueries())
        .filter(([, r]) => r.systemHash !== hash)
        .map(([id, r]) => `${id}: ${r.systemHash}`);
    });
    assert.deepEqual(stamped, [], "a result is stamped with a hash other than the live system's");
  });
});

describe("UX-I2 / UX-I3: the human and agent surfaces report one authoritative state", () => {
  it("#summary reports the counts context() gives", async () => {
    // The assertion the node tier structurally cannot make: both interfaces observed in ONE
    // process, over ONE workspace, after a load the AGENT performed. A second model copy behind
    // the agent API would show up here and nowhere else.
    const { summary, counts } = await page.evaluate(() => ({
      summary: (document.getElementById("summary")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      counts: window.mage.context().counts,
    }));
    for (const [noun, key] of [
      ["models", "models"], ["entities", "entities"], ["machines", "machines"],
      ["relations", "relations"],
    ]) {
      assert.match(
        summary, new RegExp(`\\b${counts[key]} ${noun}\\b`),
        `#summary does not report ${counts[key]} ${noun} as context() does: "${summary}"`,
      );
    }
    assert.match(summary, new RegExp(`\\b${counts.savedQueries} saved questions?\\b`), `#summary omits the saved-question count: "${summary}"`);
    assert.match(summary, new RegExp(`\\b${counts.instances} machine instances?\\b`), `#summary omits the instance count: "${summary}"`);
  });

  it("the human question list renders a result for every saved query", async () => {
    // Outcome-level convergence: every question the agent can run is also RENDERED, so the human
    // sees what the agent sees. Counted rather than string-matched, because the human surface words
    // outcomes for reading ("NOT ANSWERABLE from this model") instead of echoing the enum, and
    // pinning that wording would make a copy edit a test failure.
    //
    // Counted by the id each row CARRIES, not by position. Wave 1a turned the flat list into the
    // properties rail, so the host's direct children are now one list wrapper, and the rail has a
    // `+ Property` row that is navigation rather than a claim. `data-property` is the row's own
    // declaration of which saved query it shows, which also lets the set be compared by id — a
    // stronger claim than a count, and the one that catches a rail rendering one property twice.
    const { renderedIds, saved } = await page.evaluate(() => ({
      renderedIds: [...document.querySelectorAll("#question-list [data-property]")]
        .map((e) => e.dataset.property ?? ""),
      saved: Object.keys(window.mage.savedQueries()),
    }));
    assert.deepEqual([...renderedIds].sort(), [...saved].sort(),
      `${saved.length} saved questions and ${renderedIds.length} rendered — the human surface is hiding results`);
  });
});

describe("FR-A11Y section 19: the accessible surface of the loaded page", () => {
  it("no focusable control is unlabelled", async () => {
    const unlabelled = await page.evaluate(() => {
      const nodes = document.querySelectorAll("button, input, select, textarea");
      return [...nodes]
        .filter((e) => !e.textContent.trim() && !e.getAttribute("aria-label")
          && !e.getAttribute("aria-labelledby") && !(e.labels?.length) && !e.id)
        .map((e) => e.outerHTML.slice(0, 120));
    });
    // Hard at zero, measured at zero. The COUNT of controls (52 at this commit) is deliberately
    // not asserted — it grows as affordances land.
    assert.deepEqual(unlabelled, [], `${unlabelled.length} unlabelled control(s): ${unlabelled.join(" | ")}`);
  });

  it("the diagram stays hidden from assistive technology, and its reading comes first", async () => {
    // REWRITTEN BY THE SHELL WAVE, and the reason is correction 10 rather than a convenience. This
    // used to assert that `#canvas` was the last element of the last section of the page — the
    // picture as an epilogue after the whole textual database. The shell moves it into the
    // `workspace` region at the visual centre, so "last in the document" stops being the property
    // worth pinning and "the structured reading precedes it, inside the same region" starts.
    //
    // What did NOT change: the figure stays `aria-hidden`, every fact in it is in the reading above
    // it, and nothing focusable is inside it. Those are the claims that make hiding it honest.
    const placement = await page.evaluate(() => {
      const canvas = document.getElementById("canvas");
      const workspace = document.getElementById("workspace");
      const text = document.getElementById("diagram-text");
      return {
        ariaHidden: canvas?.getAttribute("aria-hidden") ?? null,
        hasSvg: !!canvas?.querySelector("svg"),
        inWorkspace: !!(workspace && canvas && workspace.contains(canvas)),
        readingFirst: !!(text && canvas
          && (text.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0),
        focusableInside: canvas === null
          ? -1
          : canvas.querySelectorAll("a[href], button, input, select, textarea, [tabindex]").length,
      };
    });
    assert.equal(placement.ariaHidden, "true",
      "#canvas lost aria-hidden — the structured reading above it is the accessible representation");
    assert.ok(placement.inWorkspace, "#canvas is not inside the workspace region");
    assert.ok(placement.readingFirst,
      "#diagram-text no longer precedes #canvas — DOM order is AT order, and the reading is the account");
    // SH-I4. A focusable descendant of an `aria-hidden` subtree is an axe violation and a keyboard
    // trap: the caret lands somewhere a screen reader refuses to describe.
    assert.equal(placement.focusableInside, 0,
      "the aria-hidden figure contains a focusable element — a caret can land where AT says nothing");
    assert.ok(placement.hasSvg, "#canvas drew nothing after a load — the diagram is not rendering at all");
  });

  it("the live region exists and is a polite status", async () => {
    const live = await page.evaluate(() => {
      const el = document.getElementById("live");
      return el ? { role: el.getAttribute("role"), live: el.getAttribute("aria-live") } : null;
    });
    assert.deepEqual(live, { role: "status", live: "polite" });
  });
});

describe("UX-I1: every declared human affordance site is bound to a live element", () => {
  /**
   * The gate F-3 said was missing. `checkRegistryClosure` was written to catch drift in both
   * directions and had only ever been handed literals by a unit test, so the real page's control
   * set was never its input and a renamed or deleted control left UX-I1 green.
   *
   * The page stamps `data-affordance` from the registry on every paint, so this is the served
   * page's own account of where its capabilities live. Both directions are asserted, and neither
   * list is written out here: a literal would be the copy the binding exists to retire.
   */
  it("the page's stamped set is exactly the registry's declared set", async () => {
    const stamped = await page.evaluate(() =>
      [...document.querySelectorAll("[data-affordance]")].map((e) => e.dataset.affordance));
    const unique = [...new Set(stamped)].sort();

    // Direction one: an element claiming a site no capability declares — a control reaching the
    // model outside the census, which is how a UI-only path appears.
    const unregistered = checkRegistryClosure(unique, []);
    assert.deepEqual(unregistered.map((v) => v.problem), [],
      `the page claims affordance site(s) the registry does not declare: ${unregistered.map((v) => v.problem).join("; ")}`);

    // Direction two: a declared site with nothing on the page carrying it. De-duplicated, because
    // one site can serve two capabilities — `header.run-all` is an affordance of both `query` and
    // `analyze`, and Run all questions is still one button.
    const declared = [...new Set(boundHumanAffordances().map((a) => a.at))].sort();
    const missing = declared.filter((at) => !unique.includes(at));
    assert.deepEqual(missing, [],
      `${missing.length} declared human affordance site(s) bound to nothing in the served page: ${missing.join(", ")}`);
    // And the count, derived, so a binder that stamped one element with every site would fail.
    assert.equal(unique.length, declared.length,
      `the page stamps ${unique.length} distinct sites, the registry declares ${declared.length}`);
  });

  it("every button on the page is a declared capability affordance", async () => {
    // The non-vacuous half of direction one. The binder can only stamp what the registry declares,
    // so an unstamped button is a control nobody registered. Measured at zero on the flat page:
    // all 21 of its buttons are capability affordances, because the page has no navigation chrome.
    // The shell adds disclosure and menu buttons, and whoever lands them owns the decision to
    // declare them or to name an exemption here — not to delete this.
    // The exemption comes from the registry, not from a list typed here: `test/capabilities.test.ts`
    // reads the same constant over the markup, so the file sweep and the served-page sweep cannot
    // disagree about which buttons are chrome. Four at this commit — the palette's opener and
    // close, and the edit dialog's confirm and cancel.
    //
    // `CHROME_HOSTS` is the second exemption shape, and it exists because the model contents tree's
    // rows are one button per drawn element: there is no id to name and no fixed count of them. It
    // names the HOST instead, so the exemption is still one declared place with one stated reason
    // rather than a predicate this file invents.
    const chrome = CHROME_CONTROLS.map((c) => c.id);
    const hosts = CHROME_HOSTS.map((h) => h.selector);
    const unstamped = await page.evaluate((exempt, hostSelectors) =>
      [...document.querySelectorAll("button")]
        .filter((b) => b.dataset.affordance === undefined && !exempt.includes(b.id)
          && !hostSelectors.some((s) => b.matches(s)))
        .map((b) => `#${b.id || "(no id)"}: ${b.textContent.trim().slice(0, 40)}`), chrome, hosts);
    assert.deepEqual(unstamped, [], `${unstamped.length} unregistered button(s): ${unstamped.join(" | ")}`);
  });

  it("the evidence list binds through its host's selector, not by luck", async () => {
    // `properties-section.evidence-list` is the one site declared as a descendant selector
    // (`.evidence` inside `#question-list`). The flagship example answers four questions with a
    // witness, so this fixture is where that selector gets its teeth: the node tier cannot see it
    // and the binder treats a host with no evidence in it as an ordinary state.
    const evidence = await page.evaluate(() =>
      document.querySelectorAll('#question-list [data-affordance="properties-section.evidence-list"]').length);
    assert.ok(evidence > 0,
      "no evidence list was stamped on a page whose flagship example returns witnesses — the declared selector no longer matches the renderer's output");
  });
});

describe("F-5: every readout names itself, instead of borrowing a section's name", () => {
  /**
   * The measured defect: `#sections`, `#question-list`, `#finding-list` and `#provenance-list` were
   * plain `<div>`s — computed role `generic`, computed name empty — and their whole AT identity came
   * from the `<section aria-labelledby>` each happened to sit inside. A `generic` with no name is
   * not in an AT's landmark list under any name, so a readout that lands outside its labelled
   * section becomes unreachable by the navigation a screen-reader user actually uses. The three-pane
   * shell moves these readouts into panes, which is why it was worth closing before the move.
   *
   * **Computed, not read.** A node-tier test can see `aria-labelledby` in the markup and the sibling
   * test below does; it cannot see what the name computes to. A dangling IDREF, a label on an
   * element whose role forbids naming, or a heading emptied by a renderer all leave correct-looking
   * markup and an empty name. So the claim is asserted against Chrome's own accessibility tree.
   *
   * **The readout set is DERIVED from the served page.** Every stamped `data-affordance` element
   * that is not an interactive control is a readout, so a fifth one landing in the shell is covered
   * the day it lands rather than the day someone remembers to list it here. That also makes the
   * expected role derivable: the tag says what the element should compute as, and a readout whose
   * tag this gate has no rule for fails rather than passing unexamined.
   */
  const ROLE_BY_TAG = { section: "region", ol: "list" };
  const INTERACTIVE = "button, input, select, textarea, a[href]";

  it("each readout computes the role its tag promises, and a non-empty name", async () => {
    // **A readout behind a disclosure is checked OPEN, and SH-I2 is what licenses that.** Wave 1a
    // put each property's full reading — witness list included — inside a `<details>` in the
    // properties rail, and a closed `<details>` renders nothing: Chrome computes no role and no
    // name for an element that is not rendered, which is the correct answer about a collapsed
    // region and tells us nothing about the readout.
    //
    // So the claim is split rather than weakened. First, every readout that is not currently
    // rendered must sit behind a real disclosure control — that IS SH-I2 ("no semantic content is
    // CSS-hidden without a control that reveals it"), and a readout hidden with no summary above it
    // fails here. Then every disclosure is opened and the name/role claims run over all of them, so
    // a disclosed readout is held to exactly the standard a visible one is.
    //
    // READOUTS only, the same filter the rest of this test uses: a CONTROL in an unmounted region —
    // Start's Load with a system loaded, the hypothesis bar's two buttons with no hypothesis open —
    // is not rendered because its whole region is `hidden`, which is SH-I1 working rather than
    // content hidden from somebody.
    const hidden = await page.evaluate((interactive) =>
      [...document.querySelectorAll("[data-affordance]")]
        .filter((e) => !e.matches(interactive))
        .filter((e) => !e.checkVisibility())
        .filter((e) => e.closest("details")?.querySelector(":scope > summary") == null)
        .map((e) => `${e.dataset.affordance ?? "(unstamped)"} (<${e.tagName.toLowerCase()}>)`), INTERACTIVE);
    assert.deepEqual(hidden, [],
      `${hidden.length} readout(s) are not rendered and sit behind no disclosure control, so nothing reveals them (SH-I2): ${hidden.join("; ")}`);

    await page.evaluate(() => {
      for (const d of document.querySelectorAll("details")) d.open = true;
    });

    const hosts = await page.$$("[data-affordance]");
    const readouts = [];
    for (const handle of hosts) {
      const meta = await handle.evaluate((e, interactive) => ({
        site: e.dataset.affordance ?? "(unstamped)",
        tag: e.tagName.toLowerCase(),
        interactive: e.matches(interactive),
      }), INTERACTIVE);
      if (meta.interactive) continue;
      // `interestingOnly: false`, because an unnamed generic is exactly what axe-style filtering
      // prunes — and it is the thing being measured.
      const snap = await page.accessibility.snapshot({ root: handle, interestingOnly: false });
      readouts.push({ ...meta, role: snap?.role ?? null, name: (snap?.name ?? "").trim() });
    }
    // Put the page back as it was found, before any assertion can throw past it. The suite shares
    // one page, and a later test reading a page this one left expanded would be reading a state no
    // user produced.
    await page.evaluate(() => {
      for (const d of document.querySelectorAll("details")) d.open = false;
    });

    // Non-vacuity: the flagship example is loaded, so the property list, the model tables, the
    // provenance records and at least one witness list are all rendered and stamped.
    assert.ok(readouts.length > 0,
      "no readout was found on a page with the flagship example loaded — the stamping or the filter is wrong");

    const unnamed = readouts.filter((r) => r.name === "")
      .map((r) => `${r.site} (<${r.tag}>, role ${r.role})`);
    assert.deepEqual(unnamed, [],
      `${unnamed.length} readout(s) compute no accessible name, so AT cannot reach them by name: ${unnamed.join("; ")}`);

    const wrongRole = readouts
      .filter((r) => r.role !== ROLE_BY_TAG[r.tag])
      .map((r) => ROLE_BY_TAG[r.tag] === undefined
        ? `${r.site}: <${r.tag}> is a readout shape this gate has no expected role for — declare it`
        : `${r.site}: <${r.tag}> computes ${r.role}, not ${ROLE_BY_TAG[r.tag]}`);
    assert.deepEqual(wrongRole, [],
      `a readout does not compute the role its element promises: ${wrongRole.join("; ")}`);
  });

  it("a readout's name is text a sighted user also reads, and a region's is a heading", async () => {
    // The mechanism, not only the outcome. `aria-label` would satisfy the test above and hand a
    // screen-reader user a name nobody else can see — two audiences reading different products. So
    // every readout points at real text in the document, and the four region hosts point at a
    // visible HEADING, which is also what lets a reader jump between them.
    //
    // The evidence list is deliberately not held to the heading rule: its name is the visible
    // "Evidence" sublabel inside the property it belongs to, and promoting that to a heading would
    // put one per witness into the page's heading outline.
    const sources = await page.evaluate((interactive) =>
      [...document.querySelectorAll("[data-affordance]")]
        .filter((e) => !e.matches(interactive))
        .map((e) => {
          const ref = e.getAttribute("aria-labelledby");
          const target = ref === null ? null : document.getElementById(ref);
          return {
            site: e.dataset.affordance ?? "(unstamped)",
            tag: e.tagName.toLowerCase(),
            labelledBy: ref,
            ariaLabel: e.getAttribute("aria-label"),
            targetTag: target?.tagName.toLowerCase() ?? null,
            targetText: (target?.textContent ?? "").trim(),
          };
        }), INTERACTIVE);

    const invented = sources.filter((s) => s.labelledBy === null)
      .map((s) => `${s.site} (aria-label=${JSON.stringify(s.ariaLabel)})`);
    assert.deepEqual(invented, [],
      `a readout is named by something no sighted user reads: ${invented.join("; ")}`);
    const dangling = sources.filter((s) => s.targetText === "").map((s) => `${s.site} → #${s.labelledBy}`);
    assert.deepEqual(dangling, [],
      `a readout's aria-labelledby points at nothing, or at empty text: ${dangling.join("; ")}`);
    const notAHeading = sources
      .filter((s) => s.tag === "section" && !/^h[1-6]$/.test(s.targetTag ?? ""))
      .map((s) => `${s.site} → #${s.labelledBy} is a <${s.targetTag}>`);
    assert.deepEqual(notAHeading, [],
      `a readout region is named by something that is not a heading: ${notAHeading.join("; ")}`);
  });
});

describe("FR-A11Y-3: a change the AGENT makes is announced, not only one that moves a verdict", () => {
  /**
   * F-1, pinned where it failed. The measured defect was not "no announcer runs on the agent path":
   * `repaint()` did announce, and only when a property VERDICT moved. So `window.mage.load()` of a
   * three-model system and `window.mage.transact()` adding an entity each repainted the human
   * surface and wrote ZERO times to `#live`.
   *
   * It is driven through the agent surface on a page nobody has touched, because that is the whole
   * claim: calling the announce function proves nothing about the channel that was missing. A fresh
   * page also matters for the instrument — Chromium emits no mutation record for assigning
   * `textContent` a string identical to the one already there, so an announcement is observable
   * here only because `#live` starts out holding the boot message.
   */
  let agentPage;

  before(async () => {
    ({ page: agentPage } = await openWorkbench(browser));
  }, { timeout: 120_000 });

  /** Record every write to `#live` from now on, and return what they said. */
  const watchLive = () => agentPage.evaluate(() => {
    const live = document.getElementById("live");
    window.__writes = [];
    window.__observer?.disconnect();
    window.__observer = new MutationObserver(() => window.__writes.push(live.textContent ?? ""));
    window.__observer.observe(live, { childList: true, characterData: true, subtree: true });
  });

  const liveWrites = async () => {
    // The announcer debounces at 250ms and composes what is pending; 1500ms of VIRTUAL time is
    // well clear of it. Fast-forwarded, not slept: the four calls below used to cost 6s of real
    // wall-clock, and a real sleep only GUESSES the debounce landed inside it where the virtual
    // budget guarantees every pending timer fired. The grant freezes this page's task clock
    // between calls — safe here because `agentPage` belongs to this suite alone and its only
    // waits are these grants (see `advanceVirtualTime` in the harness for the full caveat).
    await advanceVirtualTime(agentPage, 1500);
    return agentPage.evaluate(() => ({
      writes: [...(window.__writes ?? [])],
      text: document.getElementById("live")?.textContent ?? "",
    }));
  };

  it("window.mage.load announces what loaded, by name and by size", async () => {
    const yaml = await readFile(join(WORKBENCH_DIR, "examples", "message-bus", "system.mage.yaml"), "utf8");
    await watchLive();
    await agentPage.evaluate((text) => window.mage.load(text), yaml);
    const live = await liveWrites();

    assert.ok(live.writes.length > 0,
      `window.mage.load() wrote nothing to #live. The region still reads: "${live.text}"`);
    // The system's own name, read from the page's other projection of the same field (the document
    // title) rather than typed here: an announcement that re-read "3 models, 11 entities" at a user
    // would pass a weaker assertion and tell them nothing about WHAT arrived.
    const title = await agentPage.evaluate(() => (document.title.split(" — ")[0] ?? "").trim());
    assert.ok(title.length > 0, "the flagship example has no name to announce — the fixture changed");
    assert.ok(live.text.includes(title),
      `the announcement does not name the system that loaded ("${title}"): "${live.text}"`);
    const counts = await agentPage.evaluate(() => window.mage.context().counts);
    assert.match(live.text, new RegExp(`\\b${counts.models} models\\b`),
      `the announcement does not size what loaded: "${live.text}"`);
  });

  it("window.mage.transact announces the count it moved", async () => {
    const before = await agentPage.evaluate(() => window.mage.context().counts.entities);
    await watchLive();
    const result = await agentPage.evaluate(() => window.mage.transact({
      transaction: {
        base: window.mage.context().hash,
        operations: [{ op: "add-entity", id: "a11y-probe-entity", type: "service" }],
      },
    }));
    assert.equal(result.ok, true, `the probe transaction was refused: ${JSON.stringify(result.findings)}`);
    const live = await liveWrites();

    assert.ok(live.writes.length > 0,
      `window.mage.transact() wrote nothing to #live. The region still reads: "${live.text}"`);
    const after = await agentPage.evaluate(() => window.mage.context().counts.entities);
    assert.equal(after, before + 1, "the probe did not add an entity, so there is no move to announce");
    assert.match(live.text, new RegExp(`entities ${before} to ${after}`),
      `the announcement does not say which count moved: "${live.text}"`);
  });

  it("a dropped property still announces through the property channel", async () => {
    // The channel F-1 extends rather than replaces, and the baseline recorded it as UNMEASURED on
    // the agent path. Retracting a saved question through `delete-query` is `propertyNews`' DROPPED
    // branch, driven by an agent: the sentence must still carry the property news as well as the
    // model news. A fix that routed everything through the new sender would pass the two tests
    // above and silently lose this one.
    await watchLive();
    const result = await agentPage.evaluate(() => {
      const id = Object.keys(window.mage.savedQueries())[0];
      return window.mage.transact({
        transaction: { base: window.mage.context().hash, operations: [{ op: "delete-query", id }] },
      });
    });
    assert.equal(result.ok, true, `retracting a saved question was refused: ${JSON.stringify(result.findings)}`);
    const live = await liveWrites();
    assert.ok(live.writes.length > 0, "retracting a property through the agent announced nothing");
    assert.match(live.text, /no longer asserted/,
      `the property channel did not report the drop: "${live.text}"`);
  });

  it("a human control's own sentence is not doubled by the derived one", async () => {
    // Both channels fire for a human edit: the handler says what it did, and `repaint()` derives
    // that the model changed. Announcing both would read the one event twice, so a pending human
    // action suppresses the derived description. Driven by keyboard, through the real control.
    await watchLive();
    for (let i = 0; i < 40; i += 1) {
      await agentPage.keyboard.press("Tab");
      if (await agentPage.evaluate(() => document.activeElement?.id ?? "") === "run") break;
    }
    await agentPage.keyboard.press("Enter");
    const live = await liveWrites();
    assert.ok(live.writes.length > 0, "Enter on #run announced nothing — the human channel regressed");
    assert.doesNotMatch(live.text, /The model changed/,
      `a human action was described twice, once by its handler and once by the model diff: "${live.text}"`);
  });
});

describe("SH-I1: Start and the workspace are never both mounted", () => {
  /**
   * Correction 1, as a gate. Start is an empty-workspace experience: the flat page kept it on
   * screen after a model loaded, so a user who had just opened Message Bus went on reading three
   * explanations of how to open something. The shell mounts Start iff nothing is loaded and the
   * workspace iff something is, which makes the claim a property of one field — and a browser is
   * the only tier that can see whether a region is in the accessibility tree and the tab order.
   *
   * Driven on its OWN page, because the suite's main page has the flagship loaded and the empty
   * half of the matrix cannot be recovered from it.
   */
  let freshPage;

  before(async () => {
    ({ page: freshPage } = await openWorkbench(browser));
  }, { timeout: 120_000 });

  /** Whether each named region is mounted, as a browser sees it — not as the markup reads. */
  const mounted = () => freshPage.evaluate((ids) => Object.fromEntries(ids.map((id) => {
    const el = document.getElementById(id);
    return [id, el === null ? null : !el.hidden && el.offsetParent !== null];
  })), ["start", "workspace", "nav", "inspector", "askbar", "statusbar"]);

  it("a pristine page is Start, and the workspace is not there at all", async () => {
    const now = await mounted();
    assert.equal(now.start, true, "Start is not mounted on an empty workspace — there is no way in");
    assert.equal(now.workspace, false,
      "the workspace is mounted with nothing loaded; Start and the workspace are both on the page");
    // The skip link follows the mounted surface. A bypass that lands in a `hidden` region is worse
    // than no bypass, so it is derived rather than fixed.
    const skip = await freshPage.evaluate(() => {
      const a = document.getElementById("skip");
      const target = document.getElementById((a?.getAttribute("href") ?? "#").slice(1));
      return { href: a?.getAttribute("href") ?? null, targetHidden: target === null ? null : target.hidden };
    });
    assert.equal(skip.href, "#start", "the skip link does not land on the mounted principal surface");
    assert.equal(skip.targetHidden, false, "the skip link points at a hidden region");
  });

  it("loading a model unmounts Start and mounts the workspace", async () => {
    const yaml = await readFile(join(WORKBENCH_DIR, "examples", "message-bus", "system.mage.yaml"), "utf8");
    await freshPage.evaluate((text) => window.mage.load(text), yaml);
    await freshPage.waitForFunction(() => document.getElementById("start")?.hidden === true, { timeout: 30_000 });

    const now = await mounted();
    assert.equal(now.start, false, "Start survived a load — 'there is no reason to keep explaining the three ways in'");
    assert.equal(now.workspace, true, "the workspace did not mount when a model arrived");
    // The rest of the shell arrives with it: two empty rails and an empty inspector beside Start
    // would have been furniture, so they are gated on the same field.
    for (const id of ["nav", "inspector", "askbar", "statusbar"]) {
      assert.equal(now[id], true, `#${id} is not mounted on a loaded page`);
    }
    const skip = await freshPage.evaluate(() => document.getElementById("skip")?.getAttribute("href") ?? null);
    assert.equal(skip, "#workspace", "the skip link still points at Start after a model loaded");
  });
});

describe("a clean console", () => {
  it("throws no uncaught exception", () => {
    assert.deepEqual(diagnostics.pageErrors, [], `page threw: ${diagnostics.pageErrors.join(" | ")}`);
  });

  it("requests nothing that 404s", () => {
    // Known open defect at the time this gate was written: the page declares no `<link rel="icon">`,
    // so Chromium requests /favicon.ico and the server correctly reports it missing. The fix is one
    // line in index.html and belongs to the agent that owns that file. The assertion is left hard
    // and un-exempted on purpose — an allowance for "the one 404 we know about" is how a console
    // gate stops being one.
    assert.deepEqual(diagnostics.notFound, [], `404 on: ${diagnostics.notFound.join(", ")}`);
  });

  it("makes no request that fails at the transport", () => {
    assert.deepEqual(diagnostics.requestFailures, [], diagnostics.requestFailures.join(" | "));
  });

  it("logs no console.error of its own", () => {
    // Chromium emits a console error for every 404 too. Those are excluded here so a single missing
    // subresource fails one test, naming its path, instead of two naming nothing.
    const own = diagnostics.consoleErrors.filter((t) => !t.startsWith("Failed to load resource"));
    assert.deepEqual(own, [], own.join(" | "));
  });
});
