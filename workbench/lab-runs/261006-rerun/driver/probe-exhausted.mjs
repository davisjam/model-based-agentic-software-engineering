// Fix-#2 probe — can an agent now OBTAIN an escalation handle and resolve it?
// Produces a bounded (limit: 1) reach query on transaction-workspace, dumps the raw answer,
// and feeds whatever handle it finds to window.mage.analysis.resolveExhausted.
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
    const d = await mage.describe();
    const qop = d.operations.find((o) => o.name === "query");
    out.resolveExhaustedDecl = qop.calls.find((c) => c.at === "window.mage.analysis.resolveExhausted");
    out.outsideEntry = d.outsideSemanticInterface.find((e) => JSON.stringify(e).includes("resolveExhausted"));
    const ctx = await mage.loadExample("transaction-workspace");
    if (ctx.systemId !== "transaction-workspace") throw new Error("loaded " + ctx.systemId);
    const bounded = await mage.query({
      kind: "behavior", quantifier: "exists",
      behavior: { form: "reach", target: { "transaction-lifecycle.state": "committed" }, limit: 1 },
    });
    out.bounded = bounded;
    out.boundedKeys = Object.keys(bounded ?? {});
    // hunt for the handle anywhere in the answer
    const handles = [];
    const walk = (n, p) => {
      if (n && typeof n === "object") for (const [k, v] of Object.entries(n)) {
        if (/escalat/i.test(k)) handles.push({ path: p + "." + k, value: v });
        walk(v, p + "." + k);
      }
    };
    walk(bounded, "bounded");
    out.handles = handles;
    if (handles.length && handles[0].value) {
      try { out.resolved = await mage.analysis.resolveExhausted(handles[0].value); }
      catch (e) { out.resolved = "threw: " + String(e); }
    }
    return out;
  });
  must(r.bounded, "bounded query returned nothing");
  await writeFile(join(OUTDIR, "probe-exhausted-results.json"), JSON.stringify(r, null, 2));
  console.log("decl:", JSON.stringify(r.resolveExhaustedDecl, null, 1));
  console.log("outside:", JSON.stringify(r.outsideEntry).slice(0, 600));
  console.log("bounded outcome:", r.bounded.outcome, "| coverage:", JSON.stringify(r.bounded.coverage));
  console.log("handles found:", JSON.stringify(r.handles).slice(0, 500));
  console.log("resolved:", JSON.stringify(r.resolved ?? "NO HANDLE -> NOT ATTEMPTED").slice(0, 800));
} finally {
  await shutdown({ server, browser });
}
