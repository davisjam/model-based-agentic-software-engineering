// Lab 2b — transaction-workspace forcing modification via the SANCTIONED route
// (export -> edit YAML -> load), then the fix-#1 experience check on the fresh witness,
// plus an attempt to actually PRODUCE a resolveExhausted escalation (fix #2).
import { startServerOnFreePort, launchBrowser, openWorkbench, shutdown } from "../../../test/browser/harness.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUTDIR = join(import.meta.dirname, "..");
function must(cond, msg) { if (!cond) throw new Error(`PRECONDITION FAILED: ${msg}`); }

const base = await readFile(join(OUTDIR, "transaction-workspace.before.mage.yaml"), "utf8");

// --- splice 1: events section before `machines:` (which must appear exactly once at col 0)
const machinesAnchor = "\nmachines:\n";
must(base.split(machinesAnchor).length === 2, "anchor `machines:` not unique in YAML");
const eventsBlock = `
events:

  deadline_expires:
    participants: [transaction-lifecycle, verdict-deadline]
    description: >
      The verdict deadline elapses while a validated change waits. One system transition: the
      lifecycle takes its forced verdict and the deadline machine records the expiry, atomically.
`;
let edited = base.replace(machinesAnchor, eventsBlock + machinesAnchor);

// --- splice 2: forced-verdict transition + the deadline machine, before `models:` (col 0, once)
const modelsAnchor = "\nmodels:\n";
must(edited.split(modelsAnchor).length === 2, "anchor `models:` not unique in YAML");
const additions = `
      # Added by the lab-rerun agent (261006): the forcing step the shipped model deliberately
      # lacks. Synchronized with the deadline machine, so the verdict is taken WITH the expiry.
      - from: valid
        to: refused
        label: deadline_refusal
        sync: deadline_expires

  verdict-deadline:
    label: Verdict Deadline
    entity: transaction-engine
    purpose:
      question: >
        Does anything force a verdict on a validated change?
      represents:
        - whether the verdict deadline has elapsed
    initial: armed
    states:
      armed:
        description: The deadline clock runs while a change awaits its verdict.
      expired:
        description: The deadline elapsed and the forced verdict was taken. Terminal.
    transitions:
      - from: armed
        to: expired
        label: expire
        sync: deadline_expires
`;
edited = edited.replace(modelsAnchor, additions + modelsAnchor);
await writeFile(join(OUTDIR, "transaction-workspace.edited-input.mage.yaml"), edited);

const { server, origin } = await startServerOnFreePort();
const browser = await launchBrowser();
try {
  const { page } = await openWorkbench(browser, origin);
  const r = await page.evaluate(async (yaml) => {
    const mage = window.mage;
    const out = {};
    let loaded;
    try { loaded = await mage.load(yaml); } catch (e) { throw new Error("load() threw: " + String(e)); }
    out.loaded = loaded;
    const ctx = await mage.context();
    if (ctx.systemId !== "transaction-workspace") throw new Error("context is " + ctx.systemId + " — load failed silently");
    out.counts = ctx.counts;
    const sq = await mage.savedQueries();
    out.outcomes = Object.fromEntries(Object.entries(sq).map(([k, v]) => [k, v.outcome]));
    out.forced = sq["verdict-is-eventually-forced"];
    out.forcedEvidence = await mage.evidence("verdict-is-eventually-forced");
    out.waitEvidence = await mage.evidence("validated-transaction-can-wait-indefinitely");
    out.requirements = await mage.requirements();

    // fix-#2 probe: try to PRODUCE an exhausted answer + escalation handle
    out.exhaustedProbe = {};
    try {
      const ex = await mage.analysis.explore(2);
      out.exhaustedProbe.explore2 = ex;
    } catch (e) { out.exhaustedProbe.explore2 = "threw: " + String(e); }
    try {
      // an authored-limit behavior ask, if ask accepts one — record raw either way
      out.exhaustedProbe.ask = await mage.ask({
        kind: "behavior", quantifier: "exists",
        behavior: { form: "reach", target: { machine: "transaction-lifecycle", state: "committed" } },
        limit: 1,
      });
    } catch (e) { out.exhaustedProbe.ask = "threw: " + String(e); }
    out.afterYaml = await mage.export();
    return out;
  }, edited);

  must(r.outcomes["verdict-is-eventually-forced"], "forced query missing after load");
  await writeFile(join(OUTDIR, "transaction-workspace.mage.yaml"), r.afterYaml);
  delete r.afterYaml;
  await writeFile(join(OUTDIR, "lab-txws-b-results.json"), JSON.stringify(r, null, 2));
  console.log("load findings:", JSON.stringify(r.loaded).slice(0, 300));
  console.log("outcomes:", JSON.stringify(r.outcomes, null, 1));
  console.log("WROTE transaction-workspace.mage.yaml + lab-txws-b-results.json");
} finally {
  await shutdown({ server, browser });
}
