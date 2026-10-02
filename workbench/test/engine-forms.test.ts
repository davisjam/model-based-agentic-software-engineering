// Parity for the one split the compiler cannot hold shut.
//
// `GraphForm`/`BehaviorForm` and their runtime arrays in `src/engine/types.ts` are now a single
// declaration -- the type is derived from the array, so they cannot disagree with each other. But
// `mage-query.schema.json` carries its own copy of each `form` enum, and that copy is not going
// away: the schema is the published authority for the wire format, and making it import from TS
// would invert the dependency, turning the published schema into a derivative of an implementation
// detail. A codegen step would be overkill for two six-and-ten-member lists that change rarely, so
// the schema gets a test instead of a generator -- the same shape as `test/capabilities.test.ts`,
// which regenerates a model and diffs it against the committed copy so a stale file fails the build.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BEHAVIOR_FORMS, GRAPH_FORMS } from "../src/engine/types.ts";

interface FormEnumSchema {
  readonly $defs: {
    readonly graphQuery: { readonly properties: { readonly form: { readonly enum: readonly string[] } } };
    readonly behaviorQuery: { readonly properties: { readonly form: { readonly enum: readonly string[] } } };
  };
}

const schema = JSON.parse(readFileSync("mage-query.schema.json", "utf8")) as FormEnumSchema;
const schemaGraphForms = schema.$defs.graphQuery.properties.form.enum;
const schemaBehaviorForms = schema.$defs.behaviorQuery.properties.form.enum;

/**
 * Asserts the TS array and the schema enum name exactly the same forms, and says which side
 * drifted when they don't. A plain `deepEqual` would report two unsorted arrays differ without
 * saying whether a form was added on one side or lost on the other -- the direction is the part a
 * future reader needs first.
 */
function assertFormParity(label: string, tsForms: readonly string[], schemaForms: readonly string[]): void {
  assert.ok(tsForms.length > 0, `${label}: the TS array is empty -- comparing two empty lists proves nothing`);
  assert.ok(schemaForms.length > 0, `${label}: the schema enum is empty -- comparing two empty lists proves nothing`);

  const schemaSet = new Set(schemaForms);
  const tsSet = new Set(tsForms);
  const onlyInTs = tsForms.filter((f) => !schemaSet.has(f));
  const onlyInSchema = schemaForms.filter((f) => !tsSet.has(f));

  assert.deepEqual(onlyInTs, [],
    `${label}: src/engine/types.ts has forms mage-query.schema.json is missing: ${onlyInTs.join(", ")} ` +
    "-- add them to the schema's enum");
  assert.deepEqual(onlyInSchema, [],
    `${label}: mage-query.schema.json has forms src/engine/types.ts is missing: ${onlyInSchema.join(", ")} ` +
    "-- add them to the array in src/engine/types.ts");
}

test("GraphForm matches mage-query.schema.json's graphQuery.form enum", () => {
  assertFormParity("GraphForm", GRAPH_FORMS, schemaGraphForms);
});

test("BehaviorForm matches mage-query.schema.json's behaviorQuery.form enum", () => {
  assertFormParity("BehaviorForm", BEHAVIOR_FORMS, schemaBehaviorForms);
});
