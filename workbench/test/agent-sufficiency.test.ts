// The agent surface's SUFFICIENCY audit: could a reader holding only `describe()` learn the
// language, or does the workbench assume knowledge only this repo's source carries?
//
// `test/browser/agent-coverage.test.mjs` proves the description is completely EXERCISED — every
// advertised operation driven, every callable called. Nothing proved it is SUFFICIENT: that the
// published self-description carries the vocabulary an agent needs to author a model, compose a
// legal query, or read a refusal. Those are different failures. A description can be 26-of-26
// driven and still omit the form vocabulary of the query language, and an agent meeting it would
// have to infer syntax from geometry — the exact thing FR-AGENT-2 exists to prevent.
//
// ## Reachable AS DATA, not as prose — the assertion this file refuses to weaken
//
// A form name buried in a `summary` sentence is not a vocabulary an agent can enumerate; a
// substring assertion would pass on it and lock the defect in. So the walker below collects ONLY
// `enum` members and `const` values — the shapes a machine reader can choose from — and every
// assertion here runs against that set. Prose never satisfies this file.
//
// ## Denominators are DERIVED, never hand-listed
//
// Runtime vocabularies come from the engine's own constants (`GRAPH_FORMS`, `QUANTIFIERS`,
// `REQUIREMENT_METRICS`, `MODEL_TYPES`, `BINDINGS`, `DIMENSIONS`). Vocabularies that exist only as
// type unions (`RefusalReason`, `GuardOp`, `Outcome`, …) are enumerated through a
// `Record<Union, true>` the compiler holds TOTAL — the idiom `src/engine/check.ts` already uses
// for `alternatives`: a member added to the union fails `tsc` here before it can ship unmeasured.
// That is a lookup the compiler enforces, not a snapshot that drifts.
//
// ## AUDIT-ONLY, by the exact-set discipline
//
// The audit finds real omissions at HEAD. Per the landing rule for new checks that find >0, the
// known gaps are pinned in `KNOWN_GAPS` below — the `KNOWN_INERT_CLAIMS` shape from
// `test/semantic-live.test.ts`: an EXACT set, asserted both ways. A NEW omission fails this file;
// a HEALED omission also fails it, and the fix is to delete the entry. Publishing the missing
// vocabulary is the follow-up this pin is the ledger for; this change deliberately does not touch
// `src/app/**`.
//
// What already held before this file, for the record: graph/behavior form parity with the schema
// (`test/engine-forms.test.ts`), the metric enum (`test/quant-query.test.ts`), the transaction op
// census (`test/transaction.test.ts`). Those compare engine constants against the schema FILES.
// This file's subject is one step later: what the page actually PUBLISHES through `describe()`,
// and whether that publication is enough.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createAgentApi } from "../src/app/agent-api.ts";
import type { ApiDescription, MageAgentApi } from "../src/app/agent-api.ts";
import { Workspace } from "../src/app/services.ts";
import { ExampleCatalog } from "../src/app/examples.ts";
import type { AssetReader } from "../src/app/examples.ts";
import { BEHAVIOR_FORMS, GRAPH_FORMS, QUANTIFIERS } from "../src/engine/types.ts";
import type { Query, RefusalReason } from "../src/engine/types.ts";
import { REQUIREMENT_METRICS } from "../src/quant/requirement.ts";
import { BINDINGS, MODEL_TYPES } from "../src/engine/model-types.ts";
import { DIMENSIONS } from "../src/ir/types.ts";
import type { Coverage, EvidenceRole, EvidenceShape, GuardOp, Outcome } from "../src/ir/types.ts";
import { realPorts, exampleText } from "../scripts/gen-example-coverage.ts";

// ----------------------------------------------------------------------------------------------
// The published object, through the one seam the page uses
// ----------------------------------------------------------------------------------------------

/** The schema files the page imports, under the keys `src/ui/main.ts` publishes them as. */
const SCHEMA_FILES: Readonly<Record<string, string>> = {
  model: "mage-model.schema.json",
  query: "mage-query.schema.json",
  transaction: "mage-transaction.schema.json",
};

const SCHEMAS: Readonly<Record<string, unknown>> = Object.fromEntries(
  Object.entries(SCHEMA_FILES).map(([key, file]) => [key, JSON.parse(readFileSync(file, "utf8")) as unknown]),
);

const assets: AssetReader = (path: string) => Promise.resolve(readFileSync(path.replace(/^\.\//, ""), "utf8"));

/** A real workspace with a shipped example, so `describe()` is the live object, not a stub. */
function publishedApi(): MageAgentApi {
  const ws = new Workspace(realPorts);
  const out = ws.load(exampleText("message-bus"));
  assert.ok(out.ok, `message-bus must load: ${out.findings.map((f) => f.message).join("; ")}`);
  return createAgentApi(ws, { target: null, selection: [] }, SCHEMAS, () => {}, new ExampleCatalog(ws, assets));
}

const description: ApiDescription = publishedApi().describe();

// ----------------------------------------------------------------------------------------------
// The data walker — what a machine reader can ENUMERATE, and nothing it would have to parse
// ----------------------------------------------------------------------------------------------

/**
 * Every token reachable as DATA in a JSON Schema: `enum` members and string `const`s. Deliberately
 * NOT `description`/`title`/`summary` strings — a vocabulary mentioned in prose is the weaker
 * claim this file's header refuses, and the negative control at the foot holds the exclusion.
 */
function dataTokens(node: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(node)) {
    for (const item of node) dataTokens(item, out);
    return out;
  }
  if (typeof node !== "object" || node === null) return out;
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj["enum"])) {
    for (const member of obj["enum"]) if (typeof member === "string") out.add(member);
  }
  if (typeof obj["const"] === "string") out.add(obj["const"]);
  for (const [key, value] of Object.entries(obj)) {
    if (key === "enum" || key === "const") continue;
    dataTokens(value, out);
  }
  return out;
}

/** Navigate to an `enum` array at an exact path, or null — so an absence is a loud finding, not a pass. */
function enumAt(root: unknown, path: readonly string[]): readonly string[] | null {
  let node: unknown = root;
  for (const key of path) {
    if (typeof node !== "object" || node === null || Array.isArray(node)) return null;
    node = (node as Record<string, unknown>)[key];
  }
  if (typeof node !== "object" || node === null) return null;
  const e = (node as Record<string, unknown>)["enum"];
  return Array.isArray(e) && e.every((m) => typeof m === "string") ? (e as readonly string[]) : null;
}

/**
 * Two vocabularies name exactly the same members, with the drift direction in the failure. A member
 * the engine accepts and the publication omits is undiscoverable; a member the publication
 * advertises and the engine refuses is a lie. Both directions are defects, differently worded.
 */
function assertExactVocabulary(label: string, engine: readonly string[], published: readonly string[]): void {
  assert.ok(engine.length > 0, `${label}: the engine-side list is empty — comparing nothing proves nothing`);
  const pub = new Set(published);
  const eng = new Set(engine);
  assert.deepEqual(engine.filter((m) => !pub.has(m)), [],
    `${label}: the engine accepts members describe() does not publish as data — an agent cannot discover them`);
  assert.deepEqual(published.filter((m) => !eng.has(m)), [],
    `${label}: describe() advertises members the engine does not accept — the publication lies`);
}

// ----------------------------------------------------------------------------------------------
// Union vocabularies, total by the compiler (the `check.ts` `alternatives` idiom)
// ----------------------------------------------------------------------------------------------

const REFUSAL_REASONS: Readonly<Record<RefusalReason, true>> = {
  "composition-forbidden": true,
  "missing-distinction": true,
  "unknown-vocabulary": true,
  "missing-model-type": true,
  "unsupported-form": true,
  "quantifier-mismatch": true,
  "unsupported-expression": true,
  "reserved-feature": true,
  "category-error": true,
};

const GUARD_OPS: Readonly<Record<GuardOp, true>> = { eq: true, ne: true, lt: true, le: true, gt: true, ge: true };

const QUERY_KINDS: Readonly<Record<Query["kind"], true>> = { graph: true, behavior: true, quantity: true };

const OUTCOMES: Readonly<Record<Outcome, true>> = { holds: true, refuted: true, inconclusive: true, unlicensed: true };

const COVERAGE_KINDS: Readonly<Record<Coverage["kind"], true>> = {
  exhaustive: true, bounded: true, "not-applicable": true,
};

const BOUND_REASONS: Readonly<Record<NonNullable<Coverage["reason"]>, true>> = {
  "state-limit": true, "time-limit": true, "depth-limit": true,
};

const EVIDENCE_SHAPES: Readonly<Record<EvidenceShape, true>> = { trace: true, lasso: true, path: true, none: true };

const EVIDENCE_ROLES: Readonly<Record<EvidenceRole, true>> = { witness: true, counterexample: true };

const keys = (r: Readonly<Record<string, true>>): readonly string[] => Object.keys(r);

// ----------------------------------------------------------------------------------------------
// The publication exists at all — the wiring this file's every measurement stands on
// ----------------------------------------------------------------------------------------------

test("describe() publishes all three schemas inline, under the keys the page ships", () => {
  assert.deepEqual(Object.keys(description.schemas).sort(), Object.keys(SCHEMA_FILES).sort());
  for (const [key, schema] of Object.entries(description.schemas)) {
    assert.ok(typeof schema === "object" && schema !== null && Object.keys(schema).length > 0,
      `describe().schemas.${key} must be the inlined schema object, not a placeholder`);
  }
});

// A node test cannot observe the served page, and the browser coverage gate drives describe()
// without reading `schemas` — so a page that stopped passing the query schema would leave every
// measurement below running against a publication nobody makes. This textual pin is the weakest
// check in the file and is declared as such; the durable fix is a browser-tier assertion on
// `window.mage.describe().schemas`, named in the follow-up this file's report briefs.
test("the page's own wiring passes exactly these schemas to createAgentApi", () => {
  const src = readFileSync("src/ui/main.ts", "utf8");
  for (const file of Object.values(SCHEMA_FILES)) {
    assert.ok(src.includes(file), `src/ui/main.ts no longer imports ${file} — the publication this file measures moved`);
  }
  assert.ok(src.includes("{ model: modelSchema, query: querySchema, transaction: transactionSchema }"),
    "src/ui/main.ts no longer passes the three schemas to createAgentApi under model/query/transaction — "
    + "re-point this pin at the new wiring and re-measure every gap below");
});

// ----------------------------------------------------------------------------------------------
// The query language, first and most thoroughly — every vocabulary, as enumerable data
// ----------------------------------------------------------------------------------------------

const publishedQuery = (): unknown => description.schemas["query"];

/** Path → engine vocabulary, for every closed list a query author must choose from. */
const QUERY_ENUMS: readonly { readonly label: string; readonly path: readonly string[]; readonly engine: readonly string[] }[] = [
  { label: "graph forms", path: ["$defs", "graphQuery", "properties", "form"], engine: GRAPH_FORMS },
  { label: "behavior forms", path: ["$defs", "behaviorQuery", "properties", "form"], engine: BEHAVIOR_FORMS },
  { label: "quantity metrics", path: ["$defs", "quantityQuery", "properties", "metric"], engine: REQUIREMENT_METRICS },
  { label: "quantifiers", path: ["$defs", "query", "properties", "quantifier"], engine: QUANTIFIERS },
  { label: "query kinds", path: ["$defs", "query", "properties", "kind"], engine: keys(QUERY_KINDS) },
  { label: "expected outcomes (`expect`)", path: ["$defs", "query", "properties", "expect"], engine: keys(OUTCOMES) },
  {
    label: "guard comparison operators",
    path: ["$defs", "graphQuery", "properties", "where", "properties", "compare", "items", "properties", "op"],
    engine: keys(GUARD_OPS),
  },
  { label: "result outcomes", path: ["$defs", "result", "properties", "outcome"], engine: keys(OUTCOMES) },
  { label: "coverage kinds", path: ["$defs", "result", "properties", "coverage", "properties", "kind"], engine: keys(COVERAGE_KINDS) },
  { label: "bounded-coverage reasons", path: ["$defs", "result", "properties", "coverage", "properties", "reason"], engine: keys(BOUND_REASONS) },
  { label: "magnitude dimensions", path: ["$defs", "result", "properties", "magnitude", "properties", "dimension"], engine: Object.keys(DIMENSIONS) },
  { label: "evidence shapes", path: ["$defs", "evidence", "properties", "shape"], engine: keys(EVIDENCE_SHAPES) },
  { label: "evidence roles", path: ["$defs", "evidence", "properties", "role"], engine: keys(EVIDENCE_ROLES) },
];

test("every query-language vocabulary is published as an enum an agent can choose from", () => {
  for (const { label, path, engine } of QUERY_ENUMS) {
    const published = enumAt(publishedQuery(), path);
    assert.ok(published !== null,
      `${label}: no enum at ${path.join(".")} in the published query schema — the vocabulary is not reachable as data`);
    assertExactVocabulary(label, engine, published);
  }
});

test("each query kind's required payload field is published as conditional data", () => {
  const q = publishedQuery() as { readonly $defs: { readonly query: { readonly allOf?: readonly unknown[] } } };
  const arms = q.$defs.query.allOf ?? [];
  for (const kind of keys(QUERY_KINDS)) {
    const arm = arms.find((a) => {
      const node = a as { readonly if?: { readonly properties?: { readonly kind?: { readonly const?: string } } } };
      return node.if?.properties?.kind?.const === kind;
    }) as { readonly then?: { readonly required?: readonly string[] } } | undefined;
    assert.ok(arm !== undefined,
      `kind "${kind}": the published query schema has no if/then arm for it — an agent cannot learn which payload field it requires`);
    assert.ok(arm.then?.required?.includes(kind) ?? false,
      `kind "${kind}": its if/then arm does not require the "${kind}" payload field as data`);
  }
});

// ----------------------------------------------------------------------------------------------
// The measured gaps — what an agent cannot learn from describe() today
// ----------------------------------------------------------------------------------------------

/** The fields `OperationDescription` publishes today. An operation carrying ONLY these names no parameters. */
const OPERATION_FIELDS: ReadonlySet<string> = new Set(["name", "summary", "returns"]);

/**
 * Run every gap detector over a description. Pure over its input, so the negative control can hand
 * it a healed description and watch every finding discharge — a detector that cannot go green is
 * decoration, and one that cannot go red is worse.
 */
function measureGaps(d: ApiDescription): ReadonlyMap<string, string> {
  const gaps = new Map<string, string>();
  const allTokens = dataTokens(d.schemas);
  const queryTokens = dataTokens(d.schemas["query"]);

  // Query language first: the refusal vocabulary. `RefusalReason` is the closed cause set every
  // refusal and every `check()` report carries; the published `result.refusal` is a bare string.
  // An agent cannot tell a refusal from a failure, nor one refusal cause from another, without it.
  const missingReasons = keys(REFUSAL_REASONS).filter((r) => !allTokens.has(r));
  if (missingReasons.length > 0) {
    gaps.set("refusal-vocabulary",
      `${missingReasons.length} of ${keys(REFUSAL_REASONS).length} refusal causes unpublished: ${missingReasons.join(", ")}`);
  }

  // Query language second: the subject vocabulary. The registry declares which nouns each model
  // type's questions may name and how each is selected; none of it reaches the published query
  // schema as data, so an agent learns what a question may be ABOUT only by being refused.
  // (One token collides: the noun "quantity" reads as published because the KIND enum carries the
  // same spelling. Token-level credit can flatter a member that way; it cannot hide the gap, and
  // the honest healing is an explicit subjects structure — the shape the negative control injects.)
  const nouns = [...new Set(MODEL_TYPES.flatMap((t) => t.query.subjects.map((s) => s.noun)))];
  const selectors = [...new Set(MODEL_TYPES.flatMap((t) => t.query.subjects.map((s) => s.selector)))];
  const missingNouns = nouns.filter((n) => !queryTokens.has(n));
  const missingSelectors = selectors.filter((s) => !queryTokens.has(s));
  if (missingNouns.length + missingSelectors.length > 0) {
    gaps.set("query-subject-vocabulary",
      `${missingNouns.length} of ${nouns.length} nouns (${missingNouns.join(", ")}) and `
      + `${missingSelectors.length} of ${selectors.length} selectors (${missingSelectors.join(", ")}) unpublished`);
  }

  // Operations publish existence and return shape, never parameters. An agent learns `query` exists
  // and what it returns; what to PASS it lives only in the schemas' example-free shapes and prose.
  const paramless = d.operations.filter((op) => Object.keys(op).every((k) => OPERATION_FIELDS.has(k)));
  if (paramless.length > 0) {
    gaps.set("operation-parameters",
      `${paramless.length} of ${d.operations.length} operations publish only name/summary/returns — no parameter data`);
  }

  // The semantics are a pointer into this repo's working tree. The schemas travel inline so an
  // agent "needs no second fetch and no network" — the semantics get a path instead, to a file the
  // publication does not carry, naming rules (V1-V25) whose ids appear nowhere as data.
  if (typeof d.semantics === "string") {
    gaps.set("semantics-prose-pointer",
      `describe().semantics is a prose pointer ("${d.semantics.slice(0, 60)}…") to a file the publication does not ship`);
  }

  // The model-type registry's own vocabulary: the type ids `check()` reports back in its licensed
  // and refused arms. An agent reading `modelType: "state-machine"` cannot find that id anywhere
  // in what describe() published.
  const typeIds = MODEL_TYPES.map((t) => t.id);
  const missingTypeIds = typeIds.filter((id) => !allTokens.has(id));
  if (missingTypeIds.length > 0) {
    gaps.set("model-type-ids",
      `${missingTypeIds.length} of ${typeIds.length} model-type ids unpublished: ${missingTypeIds.join(", ")}`);
  }

  // The binding names the composed view takes as `focus` and the registry declares as the closed
  // correspondence vocabulary between model types.
  const bindingNames = BINDINGS.map((b) => b.name);
  const missingBindings = bindingNames.filter((n) => !allTokens.has(n));
  if (missingBindings.length > 0) {
    gaps.set("binding-names",
      `${missingBindings.length} of ${bindingNames.length} binding names unpublished: ${missingBindings.join(", ")}`);
  }

  return gaps;
}

/**
 * The omissions measured at HEAD, pinned as an EXACT set — the `KNOWN_INERT_CLAIMS` discipline.
 *
 * A new omission fails this file. A healed omission ALSO fails it, and the fix is to delete the
 * entry — so the follow-up that publishes the missing vocabulary turns each row red as it lands,
 * which is this pin working. Each value says what the follow-up owes, not merely that something is
 * missing; the reason floor below rejects a thin one.
 */
const KNOWN_GAPS: Readonly<Record<string, string>> = {
  "refusal-vocabulary":
    "publish the closed RefusalReason cause set as data — the typed `{reason, missing, models}` shape "
    + "src/engine/types.ts says the query schema is growing; today `result.refusal` is a bare string, so "
    + "an agent cannot tell refusal causes apart without reading this repo's source",
  "query-subject-vocabulary":
    "publish each model type's query subjects — the {noun, selector} pairs the registry declares — in the "
    + "query schema as data, so an agent learns what a question may name before a refusal teaches it",
  "operation-parameters":
    "give OperationDescription a parameters field (or a per-operation schema reference), so an operation "
    + "advertises what to pass it, not only that it exists and what it returns — OpenAPI's operation/schema join",
  "semantics-prose-pointer":
    "ship the semantics as data the publication carries — at minimum the closed rule-id vocabulary "
    + "(V-rules) with one sentence each, in describe() itself rather than a repo path an agent cannot fetch",
  "model-type-ids":
    "publish the model-type registry's ids (and per-type form lists) as data, so the `modelType` a "
    + "check() report names is a value the agent has seen in the self-description rather than a novel token",
  "binding-names":
    "publish the closed binding-name vocabulary the composed view's `focus` accepts and the registry "
    + "declares, so an agent can request a composed reading without discovering names from the UI",
};

/** A reason floor, same cause as `test/gate-reachability.test.ts` states: a thin reason is a note. */
const MIN_REASON = 60;

test("sufficiency audit: every gap is pinned, no pinned gap has silently healed", (t) => {
  for (const [key, reason] of Object.entries(KNOWN_GAPS)) {
    assert.ok(reason.length >= MIN_REASON, `KNOWN_GAPS["${key}"]: the reason must brief the follow-up, not note the gap`);
  }

  const gaps = measureGaps(description);

  // The inventory, query language first — the audit's deliverable, in the run's own output.
  for (const key of Object.keys(KNOWN_GAPS)) {
    const detail = gaps.get(key);
    if (detail !== undefined) t.diagnostic(`GAP ${key}: ${detail}`);
  }

  assert.deepEqual([...gaps.keys()].sort(), Object.keys(KNOWN_GAPS).sort(),
    "the measured gap set and KNOWN_GAPS disagree. A key only in the measurement is a NEW omission — "
    + "publish it or pin it with a reason. A key only in KNOWN_GAPS has HEALED — delete its entry so "
    + "the ledger stays exact. The follow-up that publishes missing vocabulary turns rows red here by design.");
});

// ----------------------------------------------------------------------------------------------
// Negative controls — every instrument above, watched failing
// ----------------------------------------------------------------------------------------------

test("negative control: the walker reads data and refuses prose", () => {
  const tokens = dataTokens({
    properties: { form: { enum: ["shortest-path"], description: "prose mentioning all-paths" } },
    kind: { const: "graph" },
    summary: "a summary mentioning containment",
  });
  assert.ok(tokens.has("shortest-path"), "an enum member must be collected");
  assert.ok(tokens.has("graph"), "a string const must be collected");
  assert.ok(!tokens.has("all-paths"), "a form named only in prose must NOT count as published");
  assert.ok(!tokens.has("containment"), "a form named only in a summary must NOT count as published");
});

test("negative control: a vocabulary dropped from the publication is a loud absence", () => {
  const sabotaged = structuredClone(SCHEMAS["query"]) as {
    $defs: { graphQuery: { properties: { form?: unknown } } };
  };
  delete sabotaged.$defs.graphQuery.properties.form;
  assert.equal(enumAt(sabotaged, ["$defs", "graphQuery", "properties", "form"]), null,
    "enumAt must report a missing enum as null, never as an empty pass");
});

test("negative control: a healed publication discharges every finding", () => {
  const healedQuery = structuredClone(SCHEMAS["query"]) as { $defs: Record<string, unknown> };
  // One injected enum per unpublished vocabulary, in the schema an agent would read for it.
  healedQuery.$defs["refusalReason"] = { enum: keys(REFUSAL_REASONS) };
  healedQuery.$defs["querySubject"] = {
    enum: [
      ...new Set(MODEL_TYPES.flatMap((t) => t.query.subjects.flatMap((s) => [s.noun, s.selector]))),
    ],
  };
  healedQuery.$defs["modelType"] = { enum: MODEL_TYPES.map((t) => t.id) };
  healedQuery.$defs["binding"] = { enum: BINDINGS.map((b) => b.name) };
  const healed = {
    ...description,
    schemas: { ...SCHEMAS, query: healedQuery },
    operations: description.operations.map((op) => ({ ...op, parameters: { $ref: "#/$defs/query" } })),
    semantics: { rules: [] },
  } as unknown as ApiDescription;
  assert.deepEqual([...measureGaps(healed).keys()], [],
    "with every vocabulary published as data, parameters declared and semantics structured, "
    + "the audit must report nothing — a gap that cannot heal is not a measurement");
});
