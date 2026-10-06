// Fix-#5 probe at the first run's known-bad site: autonomous-delivery's
// charge-remaining-at-delivery refusalDetail previously shipped missing: [], models: [].
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
    const ctx = await mage.loadExample("autonomous-delivery");
    if (ctx.systemId !== "autonomous-delivery") throw new Error("loaded " + ctx.systemId);
    const sq = await mage.savedQueries();
    const target = Object.entries(sq).filter(([k]) => /charge/.test(k));
    if (!target.length) throw new Error("no charge-* query in autonomous-delivery; ids: " + Object.keys(sq).join(","));
    return Object.fromEntries(target.map(([k, v]) => [k, { outcome: v.outcome, refusal: v.refusal, refusalDetail: v.refusalDetail }]));
  });
  await writeFile(join(OUTDIR, "probe-parity-results.json"), JSON.stringify(r, null, 2));
  console.log(JSON.stringify(r, null, 1));
} finally {
  await shutdown({ server, browser });
}
