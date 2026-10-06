// Fix-#2 probe part 2 — produce an exhausted answer at its DECLARED producer (debug.sparql with
// a starved budget) and resolve the escalation handle.
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
    // GRAPH-scoped per the earlier refusal's wouldLicense guidance; a triple cross-product to burn budget.
    const sparql = "SELECT ?a ?b ?c WHERE { GRAPH ?g { ?a ?p1 ?b . ?b ?p2 ?c . ?c ?p3 ?a } }";
    for (const budget of [1, 5, 20]) {
      let res;
      try { res = await mage.debug.sparql(sparql, budget); }
      catch (e) { res = "threw: " + String(e); }
      out["budget" + budget] = res;
      if (res && (res.outcome === "exhausted" || res.status === "exhausted" || res.answer?.kind === "exhausted")) {
        out.exhausted = res; break;
      }
    }
    if (out.exhausted) {
      const handle = out.exhausted.escalation;
      if (!handle) throw new Error("exhausted answer without .escalation — keys: " + Object.keys(out.exhausted));
      try { out.resolved = await mage.analysis.resolveExhausted(handle); }
      catch (e) { out.resolved = "threw: " + String(e); }
    }
    return out;
  });
  await writeFile(join(OUTDIR, "probe-exhausted2-results.json"), JSON.stringify(r, null, 2));
  must(r.exhausted !== undefined || Object.keys(r).length > 0, "probe recorded nothing");
  console.log("exhausted produced:", r.exhausted ? "YES" : "NO");
  console.log(JSON.stringify(r, null, 1).slice(0, 2200));
} finally {
  await shutdown({ server, browser });
}
