// Lab 1 — calibration-loop, re-run on the repaired surface.
// Independent reproduction of the composition-without-weakening solve, plus experience probes:
//   - refusalDetail parity on the V48 refusals (fix #5)
//   - requirements() direct read of the requirement verdict (fix #3)
//   - exports written before and after (REQUIREMENT 1)
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
    const out = { steps: [] };
    const ctx0 = await mage.loadExample("calibration-loop");
    if (ctx0.systemId !== "calibration-loop") throw new Error("loadExample loaded " + ctx0.systemId);
    out.baseHash = ctx0.hash;
    out.beforeYaml = await mage.export();
    if (typeof out.beforeYaml !== "string" || out.beforeYaml.length < 100) throw new Error("export() gave no YAML");

    // model ids — find the integrator's model that declares conveys
    const inspect = await mage.inspect();
    out.inspectKeys = Object.keys(inspect);
    const models = (inspect.models ?? []).map((m) => (typeof m === "string" ? m : m.id));
    if (!models.length) throw new Error("inspect().models empty/absent: " + JSON.stringify(inspect).slice(0, 300));
    out.models = models;
    const signalModel = models.find((id) => /signal/.test(id));
    if (!signalModel) throw new Error("no model id matching /signal/ among " + models.join(","));

    // shadow-type state before
    out.explainBefore = {
      reading: await mage.model.explainType("reading"),
      sample: await mage.model.explainType("sample"),
    };

    const tx = async (ops, rationale) => {
      try {
        const v = await Promise.resolve(mage.transact({ base: out.currentHash ?? out.baseHash, operations: ops, rationale }));
        return { ok: true, v };
      } catch (e) { return { ok: false, threw: String(e) }; }
    };

    // 1. edge while both endpoints are shadows — expect refusal (V48 x2)
    out.steps.push({ name: "edge-while-shadows", result: await tx(
      [{ op: "add-relation", model: signalModel, from: "reading", to: "sample", type: "conveys" }],
      "naive: connect the halves without establishing the kinds") });

    // 2. wrong answer: type both 'data' (commits — vocabulary, not taxonomy), then edge — expect wrong-kind refusal
    const typeData = await tx(
      [{ op: "set-entity-type", id: "reading", value: "data" }, { op: "set-entity-type", id: "sample", value: "data" }],
      "wrong answer: universal Data");
    out.steps.push({ name: "type-both-data", result: typeData });
    out.hashAfterData = (await mage.context()).hash;
    out.currentHash = out.hashAfterData;
    out.steps.push({ name: "edge-after-data", result: await tx(
      [{ op: "add-relation", model: signalModel, from: "reading", to: "sample", type: "conveys" }],
      "edge on wrongly-typed endpoints") });
    const undone = await mage.undo();
    out.undo = undone;
    out.currentHash = (await mage.context()).hash;
    if (out.currentHash !== out.baseHash) throw new Error(`undo did not restore base: ${out.currentHash} vs ${out.baseHash}`);

    // 3. requirement verdict BEFORE the fix — direct read (fix #3 probe)
    out.requirementsBefore = await mage.requirements();

    // 4. the right move, one atomic transaction
    out.steps.push({ name: "establish-then-connect", result: await tx(
      [{ op: "set-entity-type", id: "reading", value: "measurement" },
       { op: "set-entity-type", id: "sample", value: "measurement" },
       { op: "add-relation", model: signalModel, from: "reading", to: "sample", type: "conveys" }],
      "the contract declares what crosses the boundary IS a measurement; establish both kinds and connect") });
    const ctxAfter = await mage.context();
    out.afterHash = ctxAfter.hash;
    if (out.afterHash === out.baseHash) throw new Error("the right-move transaction did not commit");

    // 5. verdicts after
    out.savedAfter = await mage.savedQueries();
    out.requirementsAfter = await mage.requirements();
    out.explainAfter = {
      reading: await mage.model.explainType("reading"),
      sample: await mage.model.explainType("sample"),
    };
    out.afterYaml = await mage.export();
    return out;
  });

  // node-side checkpoint asserts
  const sq = r.savedAfter;
  must(sq["reading-is-delivered-as-sample"], "saved query reading-is-delivered-as-sample absent after fix");
  must(Object.keys(r.requirementsBefore).length > 0, "requirements() empty before fix — probe would measure nothing");

  await writeFile(join(OUTDIR, "calibration-loop.before.mage.yaml"), r.beforeYaml);
  await writeFile(join(OUTDIR, "calibration-loop.mage.yaml"), r.afterYaml);
  delete r.beforeYaml; delete r.afterYaml;
  await writeFile(join(OUTDIR, "lab-calibration-results.json"), JSON.stringify(r, null, 2));
  console.log("delivered-as-sample:", sq["reading-is-delivered-as-sample"].outcome,
    "| composition query:", JSON.stringify(Object.fromEntries(Object.entries(sq).map(([k, v]) => [k, v.outcome]))));
  console.log("requirement after:", JSON.stringify(r.requirementsAfter).slice(0, 400));
  console.log("WROTE exports + lab-calibration-results.json");
} finally {
  await shutdown({ server, browser });
}
