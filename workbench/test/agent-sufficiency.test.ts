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
// ## BLOCKING — the ledger drained, by the exact-set discipline
//
// This file landed AUDIT-ONLY per the landing rule for new checks that find >0: six omissions,
// pinned in `KNOWN_GAPS` below as an EXACT set asserted both ways (the `KNOWN_INERT_CLAIMS` shape
// from `test/semantic-live.test.ts`). The 261006 follow-up published every pinned vocabulary —
// the refusal causes, subjects, model-type ids and binding names as query-schema enums; the
// operations' parameters via the capability registry; the semantics as structured rule data — and
// deleted the entries as each row turned red, which is the pin working. `KNOWN_GAPS` is now EMPTY
// and the measured set must match it: any future omission fails this file at once, and is either
// published or pinned here with a briefing-grade reason. That empty set IS the promotion to
// BLOCKING; no runner change was needed, because the suite always ran this file — what changed is
// that nothing is excused.
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
import { BEHAVIOR_FORMS, GRAPH_FORMS, QUANTIFIERS, REFUSAL_REASONS } from "../src/engine/types.ts";
import type { Query } from "../src/engine/types.ts";
import { REQUIREMENT_METRICS } from "../src/quant/requirement.ts";
import { BINDINGS, MODEL_TYPES } from "../src/engine/model-types.ts";
import { DIMENSIONS } from "../src/ir/types.ts";
import type { Coverage, EvidenceRole, EvidenceShape, GuardOp, Outcome } from "../src/ir/types.ts";
import { SEVERITY, SPEC_SECTION } from "../src/validator/result.ts";
import type { ValidationRule } from "../src/validator/result.ts";
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

// `REFUSAL_REASONS` is imported, not restated: since the vocabulary moved onto the wire result it
// has a runtime list in `src/ir/types.ts` from which the union is derived — the same arrangement
// `GRAPH_FORMS` has — so this file reads the substrate instead of holding a `Record<Union, true>`
// copy of it. The unions below still exist only as types, so the Record idiom stays for them.

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
  // The three vocabularies the 261006 gap-fill published. In this table they get the full
  // both-direction treatment every older enum gets: an engine member the schema omits is
  // undiscoverable, a schema member the engine refuses is a lie.
  { label: "refusal causes", path: ["$defs", "refusalReason"], engine: REFUSAL_REASONS },
  { label: "model-type ids", path: ["$defs", "modelType"], engine: MODEL_TYPES.map((t) => t.id) },
  { label: "binding names", path: ["$defs", "binding"], engine: BINDINGS.map((b) => b.name) },
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
  // refusal and every `check()` report carries; published as `$defs.refusalReason`, and carried on
  // the wire as `result.refusalDetail` beside the prose sentence. An agent cannot tell a refusal
  // from a failure, nor one refusal cause from another, without it.
  const missingReasons = REFUSAL_REASONS.filter((r) => !allTokens.has(r));
  if (missingReasons.length > 0) {
    gaps.set("refusal-vocabulary",
      `${missingReasons.length} of ${REFUSAL_REASONS.length} refusal causes unpublished: ${missingReasons.join(", ")}`);
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

  // Operations must publish what to PASS them, not only that they exist and what they return. An
  // operation is paramless when it carries only the original three fields, when its `calls` list
  // is empty, or when a callable in it declares no parameters array at all — `parameters: []` is
  // the honest "takes nothing" and passes; a missing array is an undeclared signature and fails.
  const paramless = d.operations.filter((op) => {
    if (Object.keys(op).every((k) => OPERATION_FIELDS.has(k))) return true;
    const calls = (op as { readonly calls?: readonly { readonly parameters?: unknown }[] }).calls;
    if (calls === undefined) return false; // healed some other way; the key check above governs
    return calls.length === 0 || calls.some((c) => !Array.isArray(c.parameters));
  });
  if (paramless.length > 0) {
    gaps.set("operation-parameters",
      `${paramless.length} of ${d.operations.length} operations publish only name/summary/returns — no parameter data`);
  }

  // The semantics must be data the publication carries — at minimum the closed rule-id vocabulary,
  // non-empty. A bare string is the original defect: a prose pointer into a repo the publication
  // does not ship. A structured object with no rules would be the same defect wearing braces.
  const sem: unknown = d.semantics;
  const semRules = typeof sem === "object" && sem !== null
    ? (sem as { readonly rules?: unknown }).rules
    : undefined;
  if (typeof sem === "string") {
    gaps.set("semantics-prose-pointer",
      `describe().semantics is a prose pointer ("${sem.slice(0, 60)}…") to a file the publication does not ship`);
  } else if (!Array.isArray(semRules) || semRules.length === 0) {
    gaps.set("semantics-prose-pointer",
      "describe().semantics is structured but publishes no rules — the vocabulary is still not data");
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
 * EMPTY since 261006: the follow-up published all six pinned vocabularies and deleted each entry
 * as its row turned red, which is this pin working. The machinery stays, because it is the
 * landing rule for the NEXT omission: a new gap fails this file, and is either published or
 * pinned here with a reason that briefs the follow-up (the reason floor below rejects a thin
 * one). An empty set is the file's BLOCKING state — nothing is excused.
 *
 * What each drained entry was published AS, so the ledger's history stays readable:
 *  - refusal-vocabulary → `$defs.refusalReason` enum; `result.refusalDetail` carries
 *    `{reason, missing, models}` on the wire beside the prose sentence.
 *  - query-subject-vocabulary → `$defs.querySubject`, one arm per registry {modelType, noun,
 *    selector} pair.
 *  - operation-parameters → `describe().operations[].calls`, each callable with its declared
 *    parameters (capability registry, `wired(at, parameters)`).
 *  - semantics-prose-pointer → `describe().semantics` is structured: statement, source, and the
 *    closed rule vocabulary with severity and the SEMANTICS.md section per rule.
 *  - model-type-ids → `$defs.modelType` enum.
 *  - binding-names → `$defs.binding` enum.
 */
const KNOWN_GAPS: Readonly<Record<string, string>> = {};

/** A reason floor, same cause as `test/gate-reachability.test.ts` states: a thin reason is a note. */
const MIN_REASON = 60;

test("sufficiency audit (BLOCKING): zero gaps — a new omission fails here, pinned or published", (t) => {
  for (const [key, reason] of Object.entries(KNOWN_GAPS)) {
    assert.ok(reason.length >= MIN_REASON, `KNOWN_GAPS["${key}"]: the reason must brief the follow-up, not note the gap`);
  }

  const gaps = measureGaps(description);

  // The inventory — every MEASURED gap, pinned or not, in the run's own output. (The audit-only
  // era iterated the pins; an empty ledger would then have silenced exactly the findings that
  // matter most, the unpinned ones.)
  for (const [key, detail] of gaps) t.diagnostic(`GAP ${key}: ${detail}`);

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

// The healed-publication control from the audit-only era inverted: the LIVE publication is now the
// healed one, so the discharge direction is simply the blocking test above reporting nothing. What
// still needs watching is the red direction — a detector that cannot fail is decoration — so each
// detector is handed a sabotaged description and must find its gap again.
test("negative control: every detector still goes red on a sabotaged publication", () => {
  // (1) The schema enums deleted → the four vocabulary detectors fire.
  const strippedQuery = structuredClone(SCHEMAS["query"]) as { $defs: Record<string, unknown> };
  delete strippedQuery.$defs["refusalReason"];
  delete strippedQuery.$defs["refusalDetail"];
  delete strippedQuery.$defs["querySubject"];
  delete strippedQuery.$defs["modelType"];
  delete strippedQuery.$defs["binding"];
  const stripped = { ...description, schemas: { ...SCHEMAS, query: strippedQuery } };
  const strippedGaps = measureGaps(stripped);
  for (const key of ["refusal-vocabulary", "query-subject-vocabulary", "model-type-ids", "binding-names"]) {
    assert.ok(strippedGaps.has(key), `stripping the published enums must re-surface "${key}"`);
  }

  // (2) The semantics demoted back to a prose pointer, and to a rule-less husk.
  const prose = { ...description, semantics: "workbench/SEMANTICS.md" } as unknown as ApiDescription;
  assert.ok(measureGaps(prose).has("semantics-prose-pointer"),
    "a prose-pointer semantics must be found again");
  const husk = { ...description, semantics: { statement: "", source: "", rules: [] } } as unknown as ApiDescription;
  assert.ok(measureGaps(husk).has("semantics-prose-pointer"),
    "a structured semantics publishing zero rules is the same defect wearing braces");

  // (3) The operations stripped back to name/summary/returns, and calls hollowed out.
  const bare = {
    ...description,
    operations: description.operations.map(({ name, summary, returns }) => ({ name, summary, returns })),
  } as unknown as ApiDescription;
  assert.ok(measureGaps(bare).has("operation-parameters"),
    "operations publishing only the original three fields must be found again");
  const hollow = {
    ...description,
    operations: description.operations.map((op) => ({ ...op, calls: [] })),
  } as unknown as ApiDescription;
  assert.ok(measureGaps(hollow).has("operation-parameters"),
    "an operation whose calls list is empty declares no signature and must be found");
});

// ----------------------------------------------------------------------------------------------
// The published surface, held to the substrate it was derived from — the drained gaps' parity
// ----------------------------------------------------------------------------------------------

test("the query-subject pairs the schema publishes are the registry's, exactly", () => {
  const arms = (publishedQuery() as {
    readonly $defs: { readonly querySubject?: { readonly oneOf?: readonly unknown[] } };
  }).$defs.querySubject?.oneOf;
  assert.ok(Array.isArray(arms), "$defs.querySubject.oneOf must exist — the pairs are not reachable as data");

  const constAt = (arm: unknown, key: string): string => {
    const node = (arm as { readonly properties?: Record<string, { readonly const?: unknown }> }).properties?.[key];
    const c = node?.const;
    assert.ok(typeof c === "string", `querySubject arm must publish "${key}" as a string const`);
    return c;
  };
  const published = arms.map((a) => `${constAt(a, "modelType")} | ${constAt(a, "noun")} | ${constAt(a, "selector")}`).sort();
  const declared = MODEL_TYPES
    .flatMap((t) => t.query.subjects.map((s) => `${t.id} | ${s.noun} | ${s.selector}`)).sort();
  assert.deepEqual(published, declared,
    "the schema's {modelType, noun, selector} arms and the registry's subjects must name the same "
    + "pairs — a registry subject the schema omits is undiscoverable, a schema arm the registry "
    + "does not declare is a lie");
});

test("describe().semantics.rules are the validator's own tables, joined and total", () => {
  const ids = (Object.keys(SEVERITY) as readonly ValidationRule[]).slice().sort();
  assert.deepEqual(description.semantics.rules.map((r) => r.id).slice().sort(), ids,
    "the published rule vocabulary must be exactly the validator's closed rule set");
  for (const r of description.semantics.rules) {
    assert.equal(r.severity, SEVERITY[r.id], `rule ${r.id}: published severity must be the validator's`);
    assert.equal(r.section, SPEC_SECTION[r.id], `rule ${r.id}: published section must be the spec join`);
  }
  assert.ok(description.semantics.rules.length > 0, "an empty rules list publishes nothing");
});

test("every operation's calls are the registry's machine affordances, each with a signature", () => {
  for (const op of description.operations) {
    assert.ok(op.calls.length > 0, `operation "${op.name}" publishes no callable`);
    for (const call of op.calls) {
      assert.match(call.at, /^window\.mage(\.|$)/, `${op.name}: "${call.at}" is not a window.mage callable`);
      assert.ok(Array.isArray(call.parameters),
        `${op.name} / ${call.at}: parameters must be an array — [] is "takes nothing", absence is undeclared`);
      for (const p of call.parameters) {
        assert.ok(p.name.length > 0 && p.type.length > 0 && p.summary.length > 0,
          `${op.name} / ${call.at}: a parameter must carry name, type and summary`);
        if (p.schema !== null) {
          const [key, pointer] = p.schema.split("#");
          assert.ok(key !== undefined && key in description.schemas,
            `${op.name} / ${call.at} / ${p.name}: schema ref "${p.schema}" names no published schema`);
          if (pointer !== undefined && pointer.startsWith("/$defs/")) {
            const def = pointer.slice("/$defs/".length);
            const defs = (description.schemas[key!] as { readonly $defs?: Record<string, unknown> }).$defs ?? {};
            assert.ok(def in defs,
              `${op.name} / ${call.at} / ${p.name}: "${p.schema}" points at a $def the schema does not have`);
          }
        }
      }
    }
  }
});

test("a refused query carries its typed cause on the wire result, agreeing with check()", () => {
  const api = publishedApi();
  const doc = {
    kind: "graph", quantifier: "exists",
    graph: { form: "reachability", relation: "no-such-relation", from: "nowhere" },
  };
  const res = api.query(doc);
  assert.equal(res.outcome, "unlicensed", "the probe query must be one the model refuses");
  assert.ok(typeof res.refusal === "string" && res.refusal.length > 0,
    "the human sentence must still travel — the typed cause is beside it, not instead of it");
  assert.ok(res.refusalDetail !== null, "the refusal's typed cause must reach the wire result");
  assert.ok((REFUSAL_REASONS as readonly string[]).includes(res.refusalDetail.reason),
    `"${res.refusalDetail.reason}" is not in the published cause vocabulary`);
  const checked = api.check(doc);
  assert.equal(checked.outcome, "refused", "check() must refuse what query() refused");
  if (checked.outcome === "refused") {
    assert.equal(res.refusalDetail.reason, checked.refusal.reason,
      "the wire result and the check report must name one cause — two opinions is the defect");
  }
});
