// Probe 0c — the full operations surface + key sub-APIs' shapes, with calibration-loop loaded.
import { startServerOnFreePort, launchBrowser, openWorkbench, shutdown } from "../../../test/browser/harness.mjs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "..", "ops-dump.json");
function must(cond, msg) { if (!cond) throw new Error(`PRECONDITION FAILED: ${msg}`); }

const { server, origin } = await startServerOnFreePort();
const browser = await launchBrowser();
try {
  const { page } = await openWorkbench(browser, origin);
  const dump = await page.evaluate(async () => {
    const mage = window.mage;
    const d = await mage.describe();
    const ctx = await mage.loadExample("calibration-loop");
    if (!ctx || typeof ctx !== "object") throw new Error("loadExample returned " + typeof ctx);
    const sq = await mage.savedQueries();
    const reqs = await mage.requirements();
    const modelShape = typeof mage.model === "function" ? "function" : (mage.model && Object.keys(mage.model));
    const inspectShape = typeof mage.inspect === "function" ? "function" : (mage.inspect && Object.keys(mage.inspect));
    const evidenceShape = typeof mage.evidence === "function" ? "function" : (mage.evidence && Object.keys(mage.evidence));
    return {
      operations: d.operations.map((o) => ({
        name: o.name,
        calls: (o.calls ?? []).map((c) => ({ at: c.at, params: (c.parameters ?? []).map((p) => p.name + (p.required ? "" : "?")) })),
      })),
      loadExampleCtx: ctx,
      savedQueriesShape: { n: Object.keys(sq).length, keys: Object.keys(sq), first: sq[Object.keys(sq)[0]] },
      requirements: reqs,
      modelShape, inspectShape, evidenceShape,
    };
  });
  must(Array.isArray(dump.operations) && dump.operations.length > 5, "operations list missing");
  must(dump.savedQueriesShape && dump.savedQueriesShape.n > 0, "calibration-loop has no saved queries?? " + JSON.stringify(dump.savedQueriesShape).slice(0, 200));
  await writeFile(OUT, JSON.stringify(dump, null, 2));
  console.log("ops:", dump.operations.map((o) => o.name).join(", "));
  console.log("model/inspect/evidence shapes:", JSON.stringify({ m: dump.modelShape, i: dump.inspectShape, e: dump.evidenceShape }));
  console.log("requirements:", JSON.stringify(dump.requirements).slice(0, 600));
  console.log("savedQueries first:", JSON.stringify(dump.savedQueriesShape.first).slice(0, 600));
} finally {
  await shutdown({ server, browser });
}
