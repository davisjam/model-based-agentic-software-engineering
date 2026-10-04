/**
 * FR-AGENT-1's transport, driven: an agent ATTACHES to a browser session it did not create.
 *
 * **The hole this closes.** Every other suite in this tier reaches the page through
 * `puppeteer.launch`, which starts a browser and hands the caller an endpoint. FR-AGENT-1 specifies
 * something else — an agent "attached to the user's existing Chromium browser through Chrome
 * DevTools Protocol" — and that path has nothing in common with launching except the protocol that
 * runs over it afterwards. So `puppeteer.connect` could be broken outright and the browser tier
 * would stay green at 69 tests.
 *
 * **The shape.** Chromium is spawned as an ordinary child process with the page's URL as an
 * argument, so the browser opens the tab and no Puppeteer client created the session. Then TWO
 * independent clients attach to it: one standing in for the student's browser, one for the coding
 * agent. The agent client mutates through `window.mage`; the student client — a separate client,
 * holding a separate page object, over a separate socket — is where the assertions read. That round
 * trip is the requirement. A call that merely returns would prove the method exists; what has to
 * hold is that both clients see ONE workspace.
 *
 * **Fully automatable, with no agent in the loop.** This is the author's operative clause: the
 * interaction is a deterministic test, driven by one process spawning a browser and two more
 * speaking CDP to it. Nothing here asks a model for anything.
 *
 * **What attach does and does not prove.** It covers the transport MAGE claims to support, reached
 * the way an operator's environment reaches it: discover the endpoint, attach, find the open tab,
 * drive the page context. It does NOT cover a REMOTE operator's network — a tunnel, a forwarded
 * port, an agent on another host — and it is not supposed to: FR-AGENT-1 makes the transport the
 * execution environment's responsibility, and MAGE opens no port, discovers no agent and holds no
 * socket. What is in scope is that MAGE's surface works identically when reached by a client that
 * did not start the browser, and that is what is asserted.
 *
 * **The port is never fixed.** `--remote-debugging-port=0` lets the kernel choose; the suite reads
 * back what it chose. A constant would collide between processes, and a collision that produces a
 * false GREEN is a defect class this repo has already paid for twice — most recently a concurrent
 * a11y run that reported 8 passing when the keyboard file alone declares 22, because a `before` died
 * on the bind and took its file's tests out of the count while the runner printed success.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  startServerOnFreePort, stopServer, spawnDebuggableBrowser, connectToBrowser, killSpawnedBrowser,
  writeReceipt, WORKBENCH_DIR, ATTACH_RECEIPT_PATH,
} from "./harness.mjs";

/** The served origin, the spawned browser, and the two clients attached to it. */
let server;
let origin;
let spawned;
let studentClient;
let agentClient;
/** The same tab, held by each client as its own page object over its own socket. */
let studentPage;
let agentPage;
/** What this run measured. Written whether or not the assertions passed; see `after`. */
const measured = { attachedClients: 0 };

/**
 * The page the BROWSER opened, found in a client's own target list.
 *
 * Polled rather than awaited on an event: a client that attaches after the tab is already open
 * receives no target-created event for it, which is the normal case here and the reason a
 * `waitForTarget` on creation would hang for a page that is sitting right there.
 */
async function findOpenWorkbench(client, pathname) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const pages = await client.pages();
    const hit = pages.find((p) => p.url().endsWith(pathname));
    if (hit !== undefined) return hit;
    await new Promise((resolve) => { setTimeout(resolve, 100); });
  }
  const seen = (await client.pages()).map((p) => p.url());
  throw new Error(`no attached page ends with ${pathname}; the client sees: ${JSON.stringify(seen)}`);
}

before(async () => {
  ({ server, origin } = await startServerOnFreePort());
  // The browser opens the page itself. Neither client below created this session.
  spawned = await spawnDebuggableBrowser(`${origin}/index.html`);
  measured.port = spawned.port;
  measured.browserURL = spawned.browserURL;

  studentClient = await connectToBrowser(spawned.browserURL);
  agentClient = await connectToBrowser(spawned.browserURL);
  measured.attachedClients = 2;

  studentPage = await findOpenWorkbench(studentClient, "/index.html");
  agentPage = await findOpenWorkbench(agentClient, "/index.html");
  await studentPage.waitForFunction(() => typeof window.mage === "object", { timeout: 30_000 });
}, { timeout: 180_000 });

after(async () => {
  if (measured.attachedClients > 0) {
    const path = await writeReceipt(
      { origin, ranAt: new Date().toISOString(), ...measured }, ATTACH_RECEIPT_PATH);
    console.log(`CDP attach receipt: ${path}`);
  }
  // Disconnect, never close: `browser.close()` on an attached client would end a browser this suite
  // does not own through its client, which is the opposite of what an attached agent may do to a
  // student's session. The spawned process is ended by the one actor that started it.
  await studentClient?.disconnect().catch(() => { /* socket already gone */ });
  await agentClient?.disconnect().catch(() => { /* socket already gone */ });
  await killSpawnedBrowser(spawned);
  if (server) await stopServer(server);
});

describe("FR-AGENT-1: the agent attaches over CDP, to a browser nothing in this suite launched", () => {
  it("the debugging endpoint is on an OS-chosen port, read back rather than assumed", () => {
    assert.ok(Number.isInteger(spawned.port) && spawned.port > 1024,
      `the spawned browser reported port ${spawned.port}; the suite must read the port the kernel chose`);
    assert.equal(spawned.browserURL, `http://127.0.0.1:${spawned.port}`);
  });

  it("two independent clients attach to the one session", async () => {
    // Two clients rather than one used twice, because one client cannot distinguish "the API works"
    // from "this client's own page object is consistent with itself". The agent's edit has to cross
    // a socket boundary to be observed.
    assert.notEqual(studentClient, agentClient, "the two attachments are the same client object");
    assert.notEqual(studentPage, agentPage, "the two clients handed back the same page object");
    const [studentUrl, agentUrl] = [studentPage.url(), agentPage.url()];
    assert.equal(studentUrl, agentUrl, "the two clients are not looking at the same tab");
    // Neither client opened it: the tab was already there when they arrived, which is what makes
    // this an attach rather than a launch under another name.
    assert.match(studentUrl, /\/index\.html$/);
  });

  it("the attached client reads the SAME agent API version the page installed", async () => {
    const student = await studentPage.evaluate(() => window.mage.version);
    const agent = await agentPage.evaluate(() => window.mage.version);
    assert.match(agent, /^\d+\.\d+\.\d+$/, `the attached client read version ${JSON.stringify(agent)}`);
    assert.equal(agent, student, "the two clients disagree about the API version of one page");
  });
});

describe("FR-AGENT-1: an attached agent's edit lands in the student's live state", () => {
  it("a load through the agent client is the state the student client reads", async () => {
    const yaml = await readFile(join(WORKBENCH_DIR, "examples", "message-bus", "system.mage.yaml"), "utf8");
    const agentView = await agentPage.evaluate((text) => window.mage.load(text), yaml);
    assert.equal(agentView.systemId, "message-bus");
    // Read through the OTHER client. A second model copy behind the agent API would show up here
    // and nowhere else in the suite.
    const studentView = await studentPage.evaluate(() => window.mage.context());
    assert.equal(studentView.hash, agentView.hash,
      "the attached agent loaded a system the student's session does not have");
    assert.deepEqual(studentView.counts, agentView.counts);
    measured.loadedCounts = studentView.counts;
  });

  it("a transaction through the agent client moves the student's hash, state and visible page", async () => {
    const before = await studentPage.evaluate(() => ({
      hash: window.mage.context().hash,
      entities: window.mage.context().counts.entities,
      summary: (document.getElementById("summary")?.textContent ?? "").replace(/\s+/g, " ").trim(),
    }));
    const outcome = await agentPage.evaluate(() => window.mage.transact({
      transaction: {
        base: window.mage.context().hash,
        operations: [{ op: "add-entity", id: "attached-agent-made-this", label: "Attached agent" }],
      },
    }));
    assert.ok(outcome.ok, `the attached agent's transaction was refused: ${JSON.stringify(outcome.findings)}`);
    assert.notEqual(outcome.hash, before.hash, "a committed edit must advance the revision");

    const after = await studentPage.evaluate(() => ({
      hash: window.mage.context().hash,
      entities: window.mage.context().counts.entities,
      summary: (document.getElementById("summary")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      entity: window.mage.inspect().entities.find((e) => e.id === "attached-agent-made-this") ?? null,
    }));
    assert.equal(after.hash, outcome.hash,
      "the student's session reports a different revision than the attached agent's transaction produced");
    assert.equal(after.entities, before.entities + 1);
    assert.equal(after.entity?.label, "Attached agent",
      "the student's `inspect()` does not carry the entity the attached agent wrote");
    // The HUMAN surface, not only the agent's read of state: UX-I3 is that every projection updates
    // from the one IR, and a repaint that skipped the student's window is the failure that claim is
    // about. Asserted against the count the agent's own outcome reports, so the number is derived.
    assert.match(after.summary, new RegExp(`\\b${after.entities} entities\\b`),
      `#summary in the student's session still reads: "${after.summary}"`);
    assert.notEqual(after.summary, before.summary);
    measured.agentToHuman = { entitiesBefore: before.entities, entitiesAfter: after.entities };
  });

  it("a human control in the student's session is observed by the attached agent", async () => {
    // The reverse direction, across the socket boundary. FR-AGENT-1 claims agent and human share
    // "the same application services and authoritative client-side state", and a shared-state claim
    // is two-directional; only the agent-to-human half was pinned before this wave. Driven through a
    // real control — the workspace's `+ Add` menu and the dialog it opens — rather than through a
    // service call, because a service call would be the agent path wearing a human name.
    const before = await agentPage.evaluate(() => window.mage.context().counts.entities);
    await studentPage.evaluate(() => {
      document.getElementById("add-menu-entity").closest("details").open = true;
      document.getElementById("add-menu-entity").click();
      const fill = (id, value) => {
        const el = document.getElementById(id);
        el.value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      fill("edit-dialog-add-entity-id", "student-made-this");
      fill("edit-dialog-add-entity-label", "Typed by a person");
      document.getElementById("edit-dialog-confirm").click();
    });
    const after = await agentPage.evaluate(() => ({
      entities: window.mage.context().counts.entities,
      entity: window.mage.inspect().entities.find((e) => e.id === "student-made-this") ?? null,
      canUndo: window.mage.context().canUndo,
    }));
    assert.equal(after.entities, before + 1,
      "the attached agent's `context()` did not see the entity a person added in the other session");
    assert.equal(after.entity?.label, "Typed by a person",
      "the attached agent's `inspect()` does not carry what the person typed");
    assert.ok(after.canUndo, "the agent cannot undo an edit a person made, so the history is not shared");
    measured.humanToAgent = { entitiesBefore: before, entitiesAfter: after.entities };
  });
});
