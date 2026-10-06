// Lab 2a — transaction-workspace baseline: saved-query verdicts, EVIDENCE CONFIGURATIONS
// (fix #1 probe on the shipped lasso witness), refusalDetail of the unlicensed query (fix #5),
// and the before-export.
import { startServerOnFreePort, launchBrowser, openWorkbench, shutdown } from "../../../test/browser/harness.mjs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUTDIR = join(import.meta.dirname, "..");
function must(cond, msg) { if (!cond) throw new Error(`PRECONDITION FAILED: ${msg}`); }

const { server, origin } = await startServerOnFreePort();
const browser = await launchBrowser();
try {
  const { page } = await openWorkbench(browser, origin);
  const r = await page.evaluate(async () => {
    const mage = window.mage;
    const out = {};
    const ctx = await mage.loadExample("transaction-workspace");
    if (ctx.systemId !== "transaction-workspace") throw new Error("loaded " + ctx.systemId);
    out.baseHash = ctx.hash;
    out.counts = ctx.counts;
    out.beforeYaml = await mage.export();
    const sq = await mage.savedQueries();
    out.queryIds = Object.keys(sq);
    out.outcomes = Object.fromEntries(Object.entries(sq).map(([k, v]) => [k, v.outcome]));
    out.saved = sq;
    // evidence for every query that has any — the fix-#1 probe
    out.evidence = {};
    for (const id of out.queryIds) {
      try { out.evidence[id] = await mage.evidence(id); }
      catch (e) { out.evidence[id] = "evidence() threw: " + String(e); }
    }
    out.requirements = await mage.requirements();
    return out;
  });
  must(r.queryIds.length > 0, "no saved queries in transaction-workspace");
  const lasso = Object.entries(r.outcomes).find(([, o]) => o === "holds");
  must(lasso, "no holding query to carry a witness — fix-#1 probe has no subject. outcomes: " + JSON.stringify(r.outcomes));
  await writeFile(join(OUTDIR, "transaction-workspace.before.mage.yaml"), r.beforeYaml);
  delete r.beforeYaml;
  await writeFile(join(OUTDIR, "lab-txws-a-results.json"), JSON.stringify(r, null, 2));
  console.log("outcomes:", JSON.stringify(r.outcomes, null, 1));
  console.log("WROTE transaction-workspace.before.mage.yaml + lab-txws-a-results.json");
} finally {
  await shutdown({ server, browser });
}
