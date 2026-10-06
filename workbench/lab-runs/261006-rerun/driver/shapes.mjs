// Probe 0 — dump the REAL shapes before asserting anything on them.
// Hard rule: every assertion here fails loudly if its subject is absent.
import { startServerOnFreePort, launchBrowser, openWorkbench, shutdown } from "../../../test/browser/harness.mjs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "..", "shapes-dump.json");

function must(cond, msg) { if (!cond) throw new Error(`PRECONDITION FAILED: ${msg}`); }

const { server, origin } = await startServerOnFreePort();
const browser = await launchBrowser();
try {
  const { page, diagnostics } = await openWorkbench(browser, origin);
  must(diagnostics.pageErrors.length === 0, `page errors on boot: ${JSON.stringify(diagnostics.pageErrors)}`);

  const dump = await page.evaluate(async () => {
    const mage = window.mage;
    if (!mage) throw new Error("window.mage absent");
    const keys = Object.keys(mage);
    const d = await mage.describe();
    if (!d || typeof d !== "object") throw new Error("describe() returned non-object");
    const dKeys = Object.keys(d);
    const rawExamples = mage.examples ? mage.examples() : "NO examples()";
    const examples = rawExamples instanceof Promise ? await rawExamples : rawExamples;
    let requirements = "NO requirements()";
    try {
      if (typeof mage.requirements === "function") {
        const r = mage.requirements();
        requirements = r instanceof Promise ? await r : r;
      } else requirements = "requirements is not a function: " + typeof mage.requirements;
    } catch (e) { requirements = "requirements() threw: " + String(e); }
    return {
      mageKeys: keys,
      version: mage.version,
      describeKeys: dKeys,
      // pull the sections the six fixes should have touched, raw:
      affordanceGaps: d.affordanceGaps,
      sanctionedRoute: d.sanctionedRoute ?? "ABSENT key sanctionedRoute",
      resolveExhausted: JSON.stringify(d.operations ?? d.api ?? {}).includes("resolveExhausted")
        ? "mentioned somewhere in operations/api" : "NOT in operations/api blob",
      describeBlobHasResolveExhausted: JSON.stringify(d).includes("resolveExhausted"),
      examples: Array.isArray(examples) ? examples.map((e) => (typeof e === "string" ? e : { id: e.id, keys: Object.keys(e) })) : examples,
      requirementsShape: requirements,
      operationsShape: d.operations ? (Array.isArray(d.operations) ? d.operations.slice(0, 3) : Object.keys(d.operations)) : "ABSENT d.operations",
      refusalVocab: d.refusals ?? d.refusalCauses ?? "ABSENT d.refusals/d.refusalCauses",
    };
  });

  must(dump.mageKeys.length > 0, "window.mage has no keys");
  must(Array.isArray(dump.examples) && dump.examples.length > 0, `examples() unusable: ${JSON.stringify(dump.examples).slice(0, 300)}`);
  await writeFile(OUT, JSON.stringify(dump, null, 2));
  console.log("WROTE", OUT);
  console.log("mageKeys:", dump.mageKeys.join(", "));
  console.log("version:", dump.version);
  console.log("describeKeys:", dump.describeKeys.join(", "));
} finally {
  await shutdown({ server, browser });
}
