/**
 * The control for the session's dominant failure mode: a probe that measures an empty set and
 * reports a verdict about it.
 *
 * These test the GUARD, not the page. Each case is one of the real shapes that cost time on
 * 261006 -- a selector that matches nothing, a selector that is syntactically invalid, and a dump
 * of a subject that is not there -- and every one of them must FAIL rather than return a tidy zero.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServerOnFreePort, launchBrowser, shutdown, assertFound, dumpShape } from "./harness.mjs";

describe("a probe asserts its own preconditions", () => {
  let server, origin, browser, page;

  before(async () => {
    // Destructured, NOT assigned whole: `startServerOnFreePort` returns `{ server, origin }`, and
    // `shutdown` wants the raw http server. Assigning the wrapper here is the same shape-guess this
    // file exists to prevent, and it cost a push: the bodies passed, the `after` hook threw
    // `server.close is not a function`, and only the full tier surfaced it.
    ({ server, origin } = await startServerOnFreePort());
    browser = await launchBrowser();
    page = await browser.newPage();
    await page.goto(`${origin}/workbench/index.html`, { waitUntil: "networkidle0" });
  });

  after(async () => { await shutdown({ browser, server }); });

  it("assertFound passes, and returns counts, when every subject is present", async () => {
    const counts = await assertFound(page, ["body", "html"]);
    assert.ok(counts.body >= 1, "body should match at least once on a loaded page");
  });

  it("assertFound THROWS on a selector that matches nothing, naming it", async () => {
    await assert.rejects(
      () => assertFound(page, ["#no-such-element-anywhere"], "the empty-set case"),
      (e) => {
        assert.match(e.message, /PRECONDITION FAILED/);
        assert.match(e.message, /#no-such-element-anywhere -> 0 matches/,
          "the message must name WHICH selector was empty, or it cannot be acted on");
        assert.match(e.message, /the empty-set case/, "context should survive into the message");
        return true;
      },
    );
  });

  it("assertFound reports an INVALID selector distinctly from an empty one", async () => {
    // The two need different messages: one means "fix your selector", the other "the page changed".
    await assert.rejects(
      () => assertFound(page, ["<<<not a selector>>>"]),
      (e) => { assert.match(e.message, /INVALID SELECTOR/); return true; },
    );
  });

  it("assertFound fails when ANY of several subjects is absent, not only when all are", async () => {
    await assert.rejects(
      () => assertFound(page, ["body", "#definitely-absent"]),
      (e) => {
        assert.match(e.message, /#definitely-absent/);
        assert.doesNotMatch(e.message, /\bbody ->/, "a present subject should not be reported absent");
        return true;
      },
    );
  });

  it("dumpShape describes what is really there, so an assertion can target the real shape", async () => {
    const shape = await dumpShape(page, "body", 1);
    assert.equal(shape.length, 1);
    assert.equal(shape[0].tag, "body");
    assert.ok(Array.isArray(shape[0].children), "children must be listed — guessing them is the bug");
  });

  it("dumpShape THROWS rather than returning an empty description", async () => {
    await assert.rejects(
      () => dumpShape(page, "#nothing-matches-this"),
      (e) => { assert.match(e.message, /matched nothing/); return true; },
    );
  });
});
