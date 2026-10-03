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
import { CAPABILITIES, checkAffordanceParity } from "../../src/app/capabilities.ts";
import {
  startServer, stopServer, loadPuppeteer, openWorkbench, loadFlagshipExample,
  measureForReceipt, writeReceipt, PORT, ORIGIN,
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
  const puppeteer = loadPuppeteer();
  browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
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
  if (browser) await browser.close();
  if (server) await stopServer(server);
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
    const { rendered, saved } = await page.evaluate(() => ({
      rendered: document.querySelectorAll("#question-list > *").length,
      saved: Object.keys(window.mage.savedQueries()).length,
    }));
    assert.equal(rendered, saved, `${saved} saved questions but ${rendered} rendered — the human surface is hiding results`);
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

  it("the diagram stays hidden from assistive technology and stays last", async () => {
    const placement = await page.evaluate(() => {
      const canvas = document.getElementById("canvas");
      const sections = [...document.querySelectorAll("main > section")];
      const last = sections.at(-1);
      return {
        ariaHidden: canvas?.getAttribute("aria-hidden") ?? null,
        hasSvg: !!canvas?.querySelector("svg"),
        inLastSection: !!(last && canvas && last.contains(canvas)),
        isLastChild: last?.lastElementChild === canvas,
        sectionIds: sections.map((s) => s.id),
      };
    });
    // The prose is the authoritative account and the picture is the convenience. A change that
    // promoted the canvas up the page to look better in a screenshot would silently invert that,
    // and nothing else in the suite would notice.
    assert.equal(placement.ariaHidden, "true", "#canvas lost aria-hidden — the structured view above is the accessible representation");
    assert.ok(placement.inLastSection, `#canvas is not in the last section; sections are ${placement.sectionIds.join(", ")}`);
    assert.ok(placement.isLastChild, "#canvas is no longer the last element of the last section");
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
