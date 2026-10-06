// Lab 3 — message-bus: the V46 refusal that teaches, the sound two-surface repair, and the
// experience probes: interpretedAs where-clause join (fix #4), refusalDetail parity (fix #5),
// requirements() direct verdict (fix #3).
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
    const ctx = await mage.loadExample("message-bus");
    if (ctx.systemId !== "message-bus") throw new Error("loaded " + ctx.systemId);
    out.baseHash = ctx.hash;
    out.beforeYaml = await mage.export();

    // discover the breach query THROUGH the requirement (fix #3 read-path)
    const reqs = await mage.requirements();
    out.requirementsBefore = reqs;
    const reqIds = Object.keys(reqs);
    if (!reqIds.length) throw new Error("message-bus ships no requirement — brief premise broken");
    const req = reqs[reqIds[0]];
    const breachId = req.expressedAs;
    if (!breachId) throw new Error("requirement carries no expressedAs: " + JSON.stringify(req));
    out.breachId = breachId;

    const sqBefore = await mage.savedQueries();
    out.outcomesBefore = Object.fromEntries(Object.entries(sqBefore).map(([k, v]) => [k, v.outcome]));
    if (!sqBefore[breachId]) throw new Error("breach query not among saved queries");
    out.breachBefore = sqBefore[breachId];
    // fix #4: the interpretedAs sentence must carry the where-clause join, not just "subscribes"
    out.interpretedAsBefore = sqBefore[breachId].interpretedAs;
    // fix #5 probe subject: every refused/unlicensed saved query's refusal vs refusalDetail
    out.refusalPairs = Object.fromEntries(Object.entries(sqBefore)
      .filter(([, v]) => v.refusal || v.refusalDetail)
      .map(([k, v]) => [k, { outcome: v.outcome, refusal: v.refusal, refusalDetail: v.refusalDetail }]));

    const tx = async (baseHash, ops, rationale) => {
      try { return { ok: true, v: await Promise.resolve(mage.transact({ base: baseHash, operations: ops, rationale })) }; }
      catch (e) { return { ok: false, threw: String(e) }; }
    };

    // 1. naive repair — expect V46 refusal naming both surfaces and the offending field
    out.naive = await tx(out.baseHash,
      [{ op: "set-property", id: "order-created", name: "carries", value: "internal" }],
      "naive: lower the declaration without touching the field edges");
    const ctxAfterNaive = await mage.context();
    if (ctxAfterNaive.hash !== out.baseHash) throw new Error("naive repair COMMITTED — V46 did not hold the line");

    // find the carries_field edge to shipping-address and its model
    const inspect = await mage.inspect();
    out.modelIds = (inspect.models ?? []).map((m) => (typeof m === "string" ? m : m.id));
    // direction-vocabulary experiment: which value asks the OUTGOING question?
    out.directionExperiment = {};
    for (const dir of ["out", "outgoing", "from", "forward"]) {
      try {
        const rel = await mage.model.related("order-created", "carries_field", dir);
        out.directionExperiment[dir] = { interpretedAs: rel.interpretedAs, outcome: rel.outcome, hasShipping: JSON.stringify(rel).includes("shipping-address") };
      } catch (e) { out.directionExperiment[dir] = "threw: " + String(e); }
    }
    // ground truth from the export YAML (the declared read-path for definitions/structure)
    const m = out.beforeYaml.match(/from:\s*order-created\s*\n\s*to:\s*shipping-address\s*\n\s*type:\s*carries_field/);
    const m2 = out.beforeYaml.match(/type:\s*carries_field[\s\S]{0,200}?shipping-address/);
    if (!m && !m2 && !out.beforeYaml.includes("carries_field")) throw new Error("carries_field absent from export YAML — premise broken");
    if (!out.beforeYaml.includes("shipping-address")) throw new Error("shipping-address absent from export YAML — premise broken");

    // 2. sound repair — delete the field edge AND lower the declaration, one transaction
    const dataModel = out.modelIds.find((id) => /data|policy/.test(id));
    if (!dataModel) throw new Error("no data-policy-ish model among " + out.modelIds.join(","));
    out.sound = await tx(out.baseHash,
      [{ op: "delete-relation", model: dataModel, from: "order-created", to: "shipping-address", type: "carries_field" },
       { op: "set-property", id: "order-created", name: "carries", value: "internal" }],
      "sound: move the declaration AND change the field that decides it, atomically");
    const ctxAfter = await mage.context();
    out.afterHash = ctxAfter.hash;
    if (out.afterHash === out.baseHash) throw new Error("sound repair did not commit: " + JSON.stringify(out.sound).slice(0, 500));

    const sqAfter = await mage.savedQueries();
    out.outcomesAfter = Object.fromEntries(Object.entries(sqAfter).map(([k, v]) => [k, v.outcome]));
    out.breachAfter = sqAfter[breachId];
    out.requirementsAfter = await mage.requirements();
    out.afterYaml = await mage.export();
    return out;
  });

  must(r.naive.v && r.naive.v.ok === false, "naive repair was not refused: " + JSON.stringify(r.naive).slice(0, 300));
  must(r.breachAfter.outcome === "refuted", "breach did not flip to refuted: " + r.breachAfter.outcome);
  await writeFile(join(OUTDIR, "message-bus.before.mage.yaml"), r.beforeYaml);
  await writeFile(join(OUTDIR, "message-bus.mage.yaml"), r.afterYaml);
  delete r.beforeYaml; delete r.afterYaml;
  await writeFile(join(OUTDIR, "lab-messagebus-results.json"), JSON.stringify(r, null, 2));
  console.log("V46 refusal:", JSON.stringify(r.naive.v.findings, null, 1));
  console.log("breach:", r.breachBefore.outcome, "->", r.breachAfter.outcome);
  console.log("requirement after:", JSON.stringify(Object.values(r.requirementsAfter)[0].verification), "|", Object.values(r.requirementsAfter)[0].meaning);
  console.log("interpretedAs (before):", r.interpretedAsBefore);
  console.log("WROTE exports + lab-messagebus-results.json");
} finally {
  await shutdown({ server, browser });
}
