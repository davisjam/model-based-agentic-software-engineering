// Regenerate models/workbench-affordances.mage.yaml from the capability registry.
// `npm run affordances`. The model is generated because a hand-written copy would be the second
// source of truth the registry exists to make impossible.
import { writeFileSync } from "node:fs";
import { generateAffordanceModel } from "../src/app/capabilities.ts";
const out = "models/workbench-affordances.mage.yaml";
writeFileSync(out, generateAffordanceModel());
console.log(`wrote ${out}`);
