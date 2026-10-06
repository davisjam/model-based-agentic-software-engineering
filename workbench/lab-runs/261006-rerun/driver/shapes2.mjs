// Probe 0b — where do sanctionedRoute / resolveExhausted / refusal vocabulary live in describe()?
import { startServerOnFreePort, launchBrowser, openWorkbench, shutdown } from "../../../test/browser/harness.mjs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "..", "shapes2-dump.json");
function must(cond, msg) { if (!cond) throw new Error(`PRECONDITION FAILED: ${msg}`); }

const { server, origin } = await startServerOnFreePort();
const browser = await launchBrowser();
try {
  const { page } = await openWorkbench(browser, origin);
  const dump = await page.evaluate(async () => {
    const d = await window.mage.describe();
    // walk describe() and collect every path whose subtree mentions each probe term
    const hits = { sanctionedRoute: [], resolveExhausted: [], refusalDetail: [] };
    const walk = (node, path) => {
      if (node === null || typeof node !== "object") {
        const s = String(node);
        for (const term of Object.keys(hits)) if (s.includes(term)) hits[term].push(path);
        return;
      }
      for (const [k, v] of Object.entries(node)) {
        for (const term of Object.keys(hits)) if (k === term || k.includes(term)) hits[term].push(path + "." + k + " (KEY)");
        walk(v, path + "." + k);
      }
    };
    walk(d, "describe");
    // cap each list
    for (const k of Object.keys(hits)) hits[k] = hits[k].slice(0, 12);
    return {
      hits,
      authoring: d.authoring,
      notSupported: d.notSupported,
    };
  });
  must(dump.hits.sanctionedRoute.length > 0, "sanctionedRoute not found anywhere in describe()");
  must(dump.hits.resolveExhausted.length > 0, "resolveExhausted not found anywhere in describe()");
  await writeFile(OUT, JSON.stringify(dump, null, 2));
  console.log(JSON.stringify(dump.hits, null, 2));
  console.log("authoring keys:", dump.authoring ? Object.keys(dump.authoring) : "ABSENT");
} finally {
  await shutdown({ server, browser });
}
