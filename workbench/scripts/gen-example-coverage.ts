// Regenerate models/example-coverage.mage.yaml from the shipped examples.
//
//   node scripts/gen-example-coverage.ts
//
// Generated, not hand-maintained, for the reason scripts/gen-affordances.ts is: a hand-written
// coverage matrix is a second source of truth, and a second source of truth drifts. Section 16 of
// the requirements says so outright -- "ideally example-coverage is generated or checked against
// metadata in the actual examples rather than manually drifting" -- and test/examples.test.ts
// re-generates and compares, so a stale committed copy fails the build.
//
// ## What makes a row true
//
// Nothing here asks an example to declare which capabilities it covers. A self-report is a claim,
// and a claim can be wrong in exactly the direction that matters: an example that says it exercises
// quantitative reasoning when the product has no quantity construct. Every row is DERIVED, from one
// of two sources:
//
//   the loaded IR         what the example actually declares, after canonicalize() and validate()
//   the fixture           what its supplied queries actually answer, as pinned in expected-results
//
// And a third source decides whether a row is even available: a PROBE of the published schemas. A
// capability MAGE has no construct for is reported `unavailable` with an edge naming the missing
// construct, never silently dropped. The honest answer to "does the shipped suite exercise every
// major public semantic capability?" is no, and a coverage model that could not say so would be
// worse than none.
//
// ## Placement
//
// The shared loader and fixture reader live in this script rather than beside the capability
// registry in src/app/, which would mirror gen-affordances.ts more exactly. That is a scoping
// artifact of the wave this landed in, not a design preference -- src/app/ belongs to another
// agent this round. Moving `loadExample`, the fixture types and the row table into
// src/app/examples.ts, leaving this file the thin wrapper gen-affordances.ts is, is a clean
// follow-up.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parse } from "yaml";
import { runQuery } from "../src/engine/index.ts";
import { renderView } from "../src/render/index.ts";
import { Workspace } from "../src/app/services.ts";
import { SHIPPED_EXAMPLE_IDS } from "../src/app/examples.ts";
import type { Ports } from "../src/app/services.ts";
import { ACCOUNTABLE_TARGET_KINDS } from "../src/ir/types.ts";
import type { CanonMachine, CanonicalSystem, Outcome, Scalar } from "../src/ir/types.ts";

// ----------------------------------------------------------------------------------------------
// Loosely-typed reading, with a loud failure
// ----------------------------------------------------------------------------------------------

/**
 * A fixture is read STRICTLY: a missing or malformed field throws.
 *
 * The opposite of canonicalize's discipline, and deliberately so. Canonicalize defaults a bad field
 * because the validator reports it afterwards. A fixture has no validator behind it, so a defaulted
 * field would make the test pass while asserting nothing -- the quietest way to lose a gate.
 */
class FixtureError extends Error {}

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function need<T>(value: T | undefined | null, where: string, what: string): T {
  if (value === undefined || value === null) throw new FixtureError(`${where}: missing ${what}`);
  return value;
}

function obj(v: unknown, where: string): Obj {
  if (!isObj(v)) throw new FixtureError(`${where}: expected a mapping`);
  return v;
}

function str(v: unknown, where: string): string {
  if (typeof v !== "string" || v.trim() === "") throw new FixtureError(`${where}: expected a non-empty string`);
  return v;
}

function arr(v: unknown, where: string): readonly unknown[] {
  if (!Array.isArray(v)) throw new FixtureError(`${where}: expected a sequence`);
  return v;
}

function strs(v: unknown, where: string): readonly string[] {
  return arr(v, where).map((x, i) => str(x, `${where}[${i}]`));
}

function posInt(v: unknown, where: string): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
    throw new FixtureError(`${where}: expected a non-negative integer`);
  }
  return v;
}

function bool(v: unknown, where: string): boolean {
  if (typeof v !== "boolean") throw new FixtureError(`${where}: expected a boolean`);
  return v;
}

const OUTCOMES: readonly Outcome[] = ["holds", "refuted", "inconclusive", "unlicensed"];

function outcome(v: unknown, where: string): Outcome {
  const found = OUTCOMES.find((o) => o === v);
  return need(found, where, `one of ${OUTCOMES.join(", ")}`);
}

const COVERAGE_KINDS = ["exhaustive", "bounded", "not-applicable"] as const;
export type CoverageKind = (typeof COVERAGE_KINDS)[number];

function coverageKind(v: unknown, where: string): CoverageKind {
  const found = COVERAGE_KINDS.find((k) => k === v);
  return need(found, where, `one of ${COVERAGE_KINDS.join(", ")}`);
}

// ----------------------------------------------------------------------------------------------
// The fixture shape
// ----------------------------------------------------------------------------------------------

export type EvidenceShapeExpectation = "path" | "trace" | "lasso";

/**
 * What a result's evidence must contain. Semantic only.
 *
 * `path` pins an ORDERED node sequence, for a query whose answer IS a sequence; `nodesInclude` is an
 * unordered subset, for a query whose answer is a set. Pinning the order of a set, or the exact step
 * count of a trace, would break on an engine improvement that changed nothing a reader cares about.
 */
export interface EvidenceExpectation {
  readonly shape: EvidenceShapeExpectation;
  readonly role: "witness" | "counterexample";
  readonly path: readonly string[] | null;
  readonly nodesInclude: readonly string[];
  readonly nodeCount: number | null;
  readonly minSteps: number | null;
  readonly cycleMinSteps: number | null;
  /** Transition label -> the minimum number of steps carrying it. Pins a bound, not a step count. */
  readonly labelsAtLeast: ReadonlyMap<string, number>;
  /** `<instance>.state` or `<instance>.<variable>` -> required value in the final configuration. */
  readonly final: ReadonlyMap<string, Scalar>;
}

export interface QueryExpectation {
  readonly outcome: Outcome;
  readonly coverage: CoverageKind;
  /** Which bound truncated the search. Pinned only where the bound IS the lesson (V22). */
  readonly coverageReason: string | null;
  readonly refusalContains: string | null;
  readonly noEvidence: boolean;
  readonly evidence: EvidenceExpectation | null;
}

export interface FixtureQuery {
  readonly id: string;
  readonly label: string;
  /** Presented by the loader's "Try asking" list. Section 2 caps the presented set at 3-5. */
  readonly suggested: boolean;
  /** The purposeful models the answer needs. More than one is the EX-I2 composition witness. */
  readonly models: readonly string[];
  readonly expected: QueryExpectation;
  readonly note: string;
}

/**
 * `pending-evaluator` is the third status, and it carries weight.
 *
 * A requirement whose verdict needs arithmetic no product code performs cannot honestly read
 * `satisfied` or `violated`: the fixture would present a hand-derived figure as a machine-verified
 * one. That is the "validated but unreachable" confusion V35-V37 exist to prevent, one layer up.
 */
export type RequirementStatus = "satisfied" | "violated" | "pending-evaluator";

export interface FixtureRequirement {
  readonly id: string;
  readonly statement: string;
  /** A saved query decides it. Null when `decidedBy` does; exactly one of the two. */
  readonly expressedAs: string | null;
  /** The outcome that means the requirement holds. Present with `expressedAs`. */
  readonly satisfiedWhen: Outcome | null;
  /** A hand-derived quantitative expectation decides it. Null when `expressedAs` does. */
  readonly decidedBy: string | null;
  /** The `model:` quantity declaring the ceiling, so the number has ONE source of truth. */
  readonly declaredAs: string | null;
  /** The ceiling, in the metric's base unit. Checked against `declaredAs`'s magnitude. */
  readonly limit: number | null;
  /** What the product cannot do. Required on a `pending-evaluator` requirement. */
  readonly blockedBy: string | null;
  readonly status: RequirementStatus;
}

export type QuantitativeMetric = "latency" | "memory";

/**
 * One hand-derived quantitative expectation — the oracle the evaluator is checked against.
 *
 * The numbers come from a human, derived before any evaluator existed, and every PREMISE they rest
 * on is stated separately so the suite can check it against the model and the engine. The quantity
 * query form now computes the same figures and test/examples.test.ts compares the two; a
 * disagreement localizes to one premise rather than to "the answer", and the cross-check has
 * caught a wrong join once already.
 *
 * Magnitudes here are plain numbers in the metric's BASE unit. Writing `50 ms` would need a second
 * magnitude parser in the fixture reader, and the one thing V28 exists to protect is the last place
 * to grow a second parser.
 */
export interface QuantitativeExpectation {
  readonly id: string;
  readonly metric: QuantitativeMetric;
  readonly label: string;
  /** Always true in this version. A field rather than a convention, so the claim is greppable. */
  readonly handDerived: boolean;
  /** Latency: the saved query whose witness trace supplies the occurrence counts. */
  readonly traceFrom: string | null;
  /** Which end of a declared interval the figure takes. A maximum takes `high`. */
  readonly bound: "low" | "high" | null;
  /** Quantity id -> per-occurrence charge, in ms. Checked against the model's magnitudes. */
  readonly charges: ReadonlyMap<string, number>;
  /** Entity id -> occurrences along the trace. Checked against the engine's witness. */
  readonly occurrences: ReadonlyMap<string, number>;
  /** Memory: the saved query deciding whether the `when`-charged state is reachable at all. */
  readonly reachabilityFrom: string | null;
  /** Quantity id -> MB, for the quantities declaring `residency: resident`. */
  readonly residentMb: ReadonlyMap<string, number>;
  /** Quantity id -> MB, for the quantities declaring a `when:` clause. */
  readonly whenChargedMb: ReadonlyMap<string, number>;
  /** The derivation, written out. Read by a human; the suite checks that it adds up. */
  readonly arithmetic: string;
  /** The hand-derived total, in the metric's base unit. */
  readonly expected: number;
  /** Memory: the floor, when only the resident charges apply. */
  readonly baseline: number | null;
  readonly note: string;
}

export interface FixtureChange {
  readonly query: string;
  readonly from: Outcome;
  readonly to: Outcome;
}

export interface FixtureModification {
  readonly id: string;
  readonly label: string;
  readonly rationale: string;
  readonly operations: readonly unknown[];
  readonly changes: readonly FixtureChange[];
  readonly counterexample: EvidenceExpectation | null;
}

export interface FixtureModel {
  readonly id: string;
  readonly kind: "graph" | "machine";
}

export interface Fixture {
  readonly example: string;
  readonly title: string;
  readonly summary: string;
  readonly models: readonly FixtureModel[];
  readonly requirements: readonly FixtureRequirement[];
  readonly queries: readonly FixtureQuery[];
  readonly modifications: readonly FixtureModification[];
  /** Empty for an example with no quantities. */
  readonly quantitativeExpectations: readonly QuantitativeExpectation[];
}

function readEvidence(raw: unknown, where: string): EvidenceExpectation {
  const e = obj(raw, where);
  const shape = need(
    (["path", "trace", "lasso"] as const).find((s) => s === e["shape"]), `${where}.shape`, "a shape");
  const role = need(
    (["witness", "counterexample"] as const).find((r) => r === e["role"]), `${where}.role`, "a role");
  const labels = new Map<string, number>();
  for (const [k, v] of Object.entries(isObj(e["labels_at_least"]) ? e["labels_at_least"] : {})) {
    labels.set(k, posInt(v, `${where}.labels_at_least.${k}`));
  }
  const final = new Map<string, Scalar>();
  for (const [k, v] of Object.entries(isObj(e["final"]) ? e["final"] : {})) {
    if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") {
      throw new FixtureError(`${where}.final.${k}: expected a scalar`);
    }
    final.set(k, v);
  }
  return {
    shape, role,
    path: e["path"] === undefined ? null : strs(e["path"], `${where}.path`),
    nodesInclude: e["nodes_include"] === undefined ? [] : strs(e["nodes_include"], `${where}.nodes_include`),
    nodeCount: e["node_count"] === undefined ? null : posInt(e["node_count"], `${where}.node_count`),
    minSteps: e["min_steps"] === undefined ? null : posInt(e["min_steps"], `${where}.min_steps`),
    cycleMinSteps: e["cycle_min_steps"] === undefined ? null : posInt(e["cycle_min_steps"], `${where}.cycle_min_steps`),
    labelsAtLeast: labels, final,
  };
}

export function readFixture(exampleId: string): Fixture {
  const path = `examples/${exampleId}/expected-results.yaml`;
  const doc = obj(parse(readFileSync(path, "utf8")), path);

  const models = arr(doc["models"], `${path}.models`).map((m, i) => {
    const o = obj(m, `${path}.models[${i}]`);
    return {
      id: str(o["id"], `${path}.models[${i}].id`),
      kind: need((["graph", "machine"] as const).find((k) => k === o["kind"]),
        `${path}.models[${i}].kind`, "graph or machine"),
    };
  });

  const requirements = arr(doc["requirements"], `${path}.requirements`).map((r, i) => {
    const w = `${path}.requirements[${i}]`;
    const o = obj(r, w);
    const expressedAs = o["expressed_as"] === undefined ? null : str(o["expressed_as"], `${w}.expressed_as`);
    const decidedBy = o["decided_by"] === undefined ? null : str(o["decided_by"], `${w}.decided_by`);
    // Exactly one route, refused here rather than downstream: a requirement naming both would let
    // two sources disagree about its verdict, and one naming neither claims a verdict from nothing.
    if ((expressedAs === null) === (decidedBy === null)) {
      throw new FixtureError(`${w}: declare exactly one of 'expressed_as' or 'decided_by'`);
    }
    const status = need(
      (["satisfied", "violated", "pending-evaluator"] as const).find((s) => s === o["status"]),
      `${w}.status`, "satisfied, violated or pending-evaluator");
    if (status === "pending-evaluator" && o["blocked_by"] === undefined) {
      throw new FixtureError(`${w}: a pending-evaluator requirement must say what blocks it`);
    }
    // One limit field per metric, so the key names the unit and no magnitude parser is needed.
    const limits = (["limit_ms", "limit_mb"] as const).filter((k) => o[k] !== undefined);
    if (decidedBy !== null && limits.length !== 1) {
      throw new FixtureError(`${w}: a 'decided_by' requirement declares exactly one of limit_ms, limit_mb`);
    }
    const limitKey = limits[0];
    return {
      id: str(o["id"], `${w}.id`),
      statement: str(o["statement"], `${w}.statement`),
      expressedAs,
      satisfiedWhen: expressedAs === null ? null : outcome(o["satisfied_when"], `${w}.satisfied_when`),
      decidedBy,
      declaredAs: o["declared_as"] === undefined ? null : str(o["declared_as"], `${w}.declared_as`),
      limit: limitKey === undefined ? null : posInt(o[limitKey], `${w}.${limitKey}`),
      blockedBy: o["blocked_by"] === undefined ? null : str(o["blocked_by"], `${w}.blocked_by`),
      status,
    };
  });

  const quantitative = (doc["quantitative_expectations"] === undefined
    ? []
    : arr(doc["quantitative_expectations"], `${path}.quantitative_expectations`)
  ).map((e, i) => {
    const w = `${path}.quantitative_expectations[${i}]`;
    const o = obj(e, w);
    const metric = need((["latency", "memory"] as const).find((m) => m === o["metric"]),
      `${w}.metric`, "latency or memory");
    const amounts = (key: string): ReadonlyMap<string, number> => {
      const out = new Map<string, number>();
      for (const [k, v] of Object.entries(isObj(o[key]) ? o[key] : {})) out.set(k, posInt(v, `${w}.${key}.${k}`));
      return out;
    };
    const total = metric === "latency" ? "expected_ms" : "expected_mb";
    return {
      id: str(o["id"], `${w}.id`),
      metric,
      label: str(o["label"], `${w}.label`),
      handDerived: bool(o["hand_derived"], `${w}.hand_derived`),
      traceFrom: o["trace_from"] === undefined ? null : str(o["trace_from"], `${w}.trace_from`),
      bound: o["bound"] === undefined
        ? null : need((["low", "high"] as const).find((b) => b === o["bound"]), `${w}.bound`, "low or high"),
      charges: amounts("charges"),
      occurrences: amounts("occurrences"),
      reachabilityFrom: o["reachability_from"] === undefined
        ? null : str(o["reachability_from"], `${w}.reachability_from`),
      residentMb: amounts("resident_mb"),
      whenChargedMb: amounts("when_charged_mb"),
      arithmetic: str(o["arithmetic"], `${w}.arithmetic`),
      expected: posInt(o[total], `${w}.${total}`),
      baseline: o["baseline_mb"] === undefined ? null : posInt(o["baseline_mb"], `${w}.baseline_mb`),
      note: str(o["note"], `${w}.note`),
    };
  });

  const queries = arr(doc["queries"], `${path}.queries`).map((q, i) => {
    const w = `${path}.queries[${i}]`;
    const o = obj(q, w);
    const ex = obj(o["expected"], `${w}.expected`);
    return {
      id: str(o["id"], `${w}.id`),
      label: str(o["label"], `${w}.label`),
      suggested: bool(o["suggested"], `${w}.suggested`),
      models: strs(o["models"], `${w}.models`),
      note: str(o["note"], `${w}.note`),
      expected: {
        outcome: outcome(ex["outcome"], `${w}.expected.outcome`),
        coverage: coverageKind(ex["coverage"], `${w}.expected.coverage`),
        coverageReason: ex["coverage_reason"] === undefined
          ? null : str(ex["coverage_reason"], `${w}.expected.coverage_reason`),
        refusalContains: ex["refusal_contains"] === undefined
          ? null : str(ex["refusal_contains"], `${w}.expected.refusal_contains`),
        noEvidence: ex["no_evidence"] === undefined ? false : bool(ex["no_evidence"], `${w}.expected.no_evidence`),
        evidence: ex["evidence"] === undefined ? null : readEvidence(ex["evidence"], `${w}.expected.evidence`),
      },
    };
  });

  const modifications = arr(doc["modifications"], `${path}.modifications`).map((m, i) => {
    const w = `${path}.modifications[${i}]`;
    const o = obj(m, w);
    const tx = obj(o["transaction"], `${w}.transaction`);
    return {
      id: str(o["id"], `${w}.id`),
      label: str(o["label"], `${w}.label`),
      rationale: str(o["rationale"], `${w}.rationale`),
      operations: arr(tx["operations"], `${w}.transaction.operations`),
      changes: arr(o["changes"], `${w}.changes`).map((c, j) => {
        const cw = `${w}.changes[${j}]`;
        const co = obj(c, cw);
        return {
          query: str(co["query"], `${cw}.query`),
          from: outcome(co["from"], `${cw}.from`),
          to: outcome(co["to"], `${cw}.to`),
        };
      }),
      counterexample: o["counterexample"] === undefined
        ? null : readEvidence(o["counterexample"], `${w}.counterexample`),
    };
  });

  return {
    example: str(doc["example"], `${path}.example`),
    title: str(doc["title"], `${path}.title`),
    summary: str(doc["summary"], `${path}.summary`),
    models, requirements, queries, modifications,
    quantitativeExpectations: quantitative,
  };
}

// ----------------------------------------------------------------------------------------------
// Loading an example the way a user does
// ----------------------------------------------------------------------------------------------

// RE-EXPORTED, not redeclared. This script briefly kept its own copy of the shipped-example list and
// the two drifted within the hour -- see the note on SHIPPED_EXAMPLE_IDS. The app layer owns what
// ships; a generator consumes it.
export { SHIPPED_EXAMPLE_IDS as EXAMPLE_IDS } from "../src/app/examples.ts";
export type { ShippedExampleId as ExampleId } from "../src/app/examples.ts";

/**
 * The real ports. A test or a generator that reached `canonicalize()` and `runGraphQuery()` directly
 * would validate two modules and prove nothing about the application: UX-I3's claim is that every
 * path normalises to the same IR, and a caller that skips the facade cannot witness it.
 */
export const realPorts: Ports = {
  engine: {
    graphQuery: (system, query) => runQuery(system, query).result,
    behaviorQuery: (system, query) => runQuery(system, query).result,
    explore: () => ({ configurations: [], exhaustive: false }),
  },
  // The REAL renderer, for the same reason the engine port is real: a stub here would make these
  // ports a second, weaker definition of the application, and the suite's whole claim is that it
  // drives what a user drives. The stub this replaces also broke the build the moment the renderer's
  // accessible view gained fields — a semantic merge conflict with nothing textually in common.
  render: { render: (system, request) => renderView(system, request) },
};

export const exampleText = (id: string): string =>
  readFileSync(`examples/${id}/system.mage.yaml`, "utf8");

export interface LoadedExample {
  readonly id: string;
  readonly fixture: Fixture;
  readonly workspace: Workspace;
}

/** Import through the ONE seam, exactly as a human's file picker and `window.mage.load` both do. */
export function loadExample(id: string): LoadedExample {
  const workspace = new Workspace(realPorts);
  const loaded = workspace.load(exampleText(id));
  if (!loaded.ok) {
    throw new FixtureError(`${id}: did not load -- ${loaded.findings.map((f) => f.message).join("; ")}`);
  }
  return { id, fixture: readFixture(id), workspace };
}

// ----------------------------------------------------------------------------------------------
// Derived facts about an example, shared with the test
// ----------------------------------------------------------------------------------------------

export interface PurposefulModel {
  readonly id: string;
  readonly kind: "graph" | "machine";
  readonly question: string | null;
  readonly represents: readonly string[];
  readonly omits: readonly string[];
}

/**
 * Every purposeful model, graph or machine.
 *
 * A machine carries a `purpose` exactly as a graph model does, so EX-I2's "at least two semantically
 * distinct purposeful models" counts both. Counting only `system.models` would report worker-queue
 * as having one model, which is the mistake this function exists to prevent.
 */
export function purposefulModels(system: CanonicalSystem): readonly PurposefulModel[] {
  const out: PurposefulModel[] = [];
  for (const m of system.models.values()) {
    out.push({ id: m.id, kind: "graph", question: m.purpose.question, represents: m.purpose.represents, omits: m.purpose.omits });
  }
  for (const m of system.machines.values()) {
    out.push({ id: m.id, kind: "machine", question: m.purpose.question, represents: m.purpose.represents, omits: m.purpose.omits });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export interface SharedIdentity {
  readonly id: string;
  readonly kind: "entity" | "event";
  readonly models: readonly string[];
}

/**
 * Identities named by two or more purposeful models.
 *
 * Two kinds, because the two examples share identity differently. A graph model names entities in
 * its `entities` list; a machine names one entity through `entity:`, and a declared event names the
 * machines it steps. Both are shared identity in EX-I2's sense -- the models are reductions of one
 * thing rather than unrelated diagrams packaged together.
 */
export function sharedIdentities(system: CanonicalSystem): readonly SharedIdentity[] {
  const byEntity = new Map<string, Set<string>>();
  const note = (map: Map<string, Set<string>>, key: string, model: string): void => {
    const set = map.get(key);
    if (set === undefined) map.set(key, new Set([model]));
    else set.add(model);
  };
  for (const m of system.models.values()) for (const e of m.entities) note(byEntity, e, m.id);
  for (const m of system.machines.values()) if (m.entity !== null) note(byEntity, m.entity, m.id);

  const byEvent = new Map<string, Set<string>>();
  for (const ev of system.events.values()) {
    for (const p of ev.participants) if (system.machines.has(p)) note(byEvent, ev.id, p);
  }

  const out: SharedIdentity[] = [];
  for (const [id, models] of byEntity) {
    if (models.size >= 2) out.push({ id, kind: "entity", models: [...models].sort() });
  }
  for (const [id, models] of byEvent) {
    if (models.size >= 2) out.push({ id, kind: "event", models: [...models].sort() });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Everything a machine's `purpose.omits` must not name.
 *
 * V24 checks `omits` against a model's real vocabulary, but `checkMeaning` iterates
 * `system.models` and never `system.machines`, so a machine's omissions are declared and
 * unchecked. This is the missing half, and test/examples.test.ts applies it.
 */
export function machineVocabulary(machine: CanonMachine): ReadonlySet<string> {
  const vocab = new Set<string>(machine.states);
  for (const v of machine.variables.keys()) vocab.add(v);
  for (const d of machine.derived.keys()) vocab.add(d);
  for (const t of machine.transitions) {
    if (t.sync !== null) vocab.add(t.sync);
    if (t.label !== null) vocab.add(t.label);
  }
  return vocab;
}

/** The saved query behind a fixture entry, as a loosely-typed object. */
function savedQuery(system: CanonicalSystem, id: string): Obj {
  const saved = system.queries.get(id);
  if (saved === undefined) throw new FixtureError(`the fixture names query '${id}', which the system does not declare`);
  return obj(saved.raw, `queries.${id}`);
}

const queryForm = (system: CanonicalSystem, id: string): string | null => {
  const raw = savedQuery(system, id);
  const inner = raw["kind"] === "graph" ? raw["graph"] : raw["behavior"];
  const form = isObj(inner) ? inner["form"] : undefined;
  return typeof form === "string" ? form : null;
};

const queryKind = (system: CanonicalSystem, id: string): string | null =>
  typeof savedQuery(system, id)["kind"] === "string" ? String(savedQuery(system, id)["kind"]) : null;

const quantifierOf = (system: CanonicalSystem, id: string): string | null =>
  typeof savedQuery(system, id)["quantifier"] === "string" ? String(savedQuery(system, id)["quantifier"]) : null;

/** Graph forms whose answer is composed from several edges -- the ones `composition.path` gates. */
const COMPOSING_FORMS: ReadonlySet<string> =
  new Set(["reachability", "path", "shortest-path", "all-paths", "components"]);

// ----------------------------------------------------------------------------------------------
// The product probe: which constructs exist at all
// ----------------------------------------------------------------------------------------------

/**
 * What the published schemas declare.
 *
 * Probed rather than asserted, so a row flips the moment the product grows the construct. A
 * hardcoded `false` here would be a claim about the product frozen at the moment someone typed it,
 * which is the drift the whole file exists to avoid.
 */
export interface ProductProbe {
  readonly modelKeys: ReadonlySet<string>;
  readonly queryDefs: ReadonlySet<string>;
  readonly resultFields: ReadonlySet<string>;
}

export function probeProduct(): ProductProbe {
  const model = obj(JSON.parse(readFileSync("mage-model.schema.json", "utf8")), "mage-model.schema.json");
  const query = obj(JSON.parse(readFileSync("mage-query.schema.json", "utf8")), "mage-query.schema.json");
  const defs = obj(query["$defs"], "mage-query.schema.json.$defs");
  const result = obj(defs["result"], "mage-query.schema.json.$defs.result");
  return {
    modelKeys: new Set(Object.keys(obj(model["properties"], "mage-model.schema.json.properties"))),
    queryDefs: new Set(Object.keys(defs)),
    resultFields: new Set(Object.keys(obj(result["properties"], "...result.properties"))),
  };
}

/**
 * Constructs a capability needs, and how to tell whether MAGE has one.
 *
 * Each entry is a predicate over the probe, so "MAGE cannot do this" is a reading of the published
 * schemas rather than an opinion. Where a construct lands, its row stops being `unavailable` on the
 * next regeneration without anyone editing this table.
 */
export const CONSTRUCTS: Readonly<Record<string, { readonly label: string; readonly present: (p: ProductProbe) => boolean }>> = {
  "model.quantities": {
    label: "A quantity construct: a magnitude with a dimension, attached to a transition or a component.",
    present: (p) => p.modelKeys.has("quantities") || p.modelKeys.has("dimensions"),
  },
  "model.requirements": {
    label: "A requirement construct: a named, checkable obligation the model is judged against.",
    present: (p) => p.modelKeys.has("requirements"),
  },
  "query.path-aggregation": {
    label:
      "A query that aggregates a quantity over an execution path, and somewhere in the result shape " +
      "to report the number it computes.",
    present: (p) =>
      ["quantity", "value", "magnitude", "measure"].some((f) => p.resultFields.has(f)),
  },
};

// ----------------------------------------------------------------------------------------------
// The capability rows
// ----------------------------------------------------------------------------------------------

export interface RowContext {
  readonly system: CanonicalSystem;
  readonly fixture: Fixture;
}

export interface CapabilityRow {
  readonly id: string;
  readonly label: string;
  /** The row name in the requirements' section 16 matrix, so the two can be read side by side. */
  readonly matrixRow: string;
  /** Constructs MAGE must have for the row to be reachable at all. */
  readonly requires: readonly string[];
  readonly detect: (ctx: RowContext) => boolean;
}

const anyQuery = (ctx: RowContext, pick: (q: FixtureQuery) => boolean): boolean =>
  ctx.fixture.queries.some(pick);

/**
 * The matrix, as a table of derivable predicates.
 *
 * Section 2's "across the complete set, the examples SHALL exercise" list is the row vocabulary, and
 * section 16's matrix names are carried alongside so the generated model can be read against the
 * requirements document. Two rows are split where the requirements conflate them: reachability and
 * bounded progress answer different questions and need different evidence, and lumping them under
 * "liveness" is the overclaim this example set is careful not to make.
 */
export const CAPABILITY_ROWS: readonly CapabilityRow[] = [
  {
    id: "structural-models",
    label: "A structural model: entities and typed relations, with a declared purpose.",
    matrixRow: "Relations",
    requires: [],
    detect: (ctx) => [...ctx.system.models.values()].some((m) => m.purpose.question !== null),
  },
  {
    id: "typed-relationships",
    label: "Two or more relation types, each declaring what its ABSENCE asserts and whether paths compose.",
    matrixRow: "Relations",
    requires: [],
    detect: (ctx) => {
      const types = [...ctx.system.relationTypes.values()];
      return types.length >= 2 && types.every((t) => t.absence !== null)
        && types.some((t) => t.pathComposition === "allowed")
        && types.some((t) => t.pathComposition === "forbidden");
    },
  },
  {
    id: "state-machines",
    label: "An explicit finite state machine with a declared initial state and enumerated states.",
    matrixRow: "State machine",
    requires: [],
    detect: (ctx) => ctx.system.machines.size >= 1,
  },
  {
    id: "synchronized-events",
    label: "A declared event stepping two machines atomically, with no observable intermediate state.",
    matrixRow: "State machine",
    requires: [],
    detect: (ctx) => [...ctx.system.events.values()].some((e) => e.participants.length >= 2),
  },
  {
    id: "cross-model-identity",
    label: "One identity named by two or more purposeful models, which is what makes a join sound.",
    matrixRow: "Composition",
    requires: [],
    detect: (ctx) => sharedIdentities(ctx.system).length > 0,
  },
  {
    id: "model-composition",
    label: "A supplied question whose answer needs information from more than one purposeful model.",
    matrixRow: "Composition",
    requires: [],
    detect: (ctx) => anyQuery(ctx, (q) => q.models.length >= 2),
  },
  {
    id: "graph-reachability",
    label: "A multi-hop reachability question answered over a relation type that licenses composition.",
    matrixRow: "Composition",
    requires: [],
    detect: (ctx) => anyQuery(ctx, (q) =>
      queryKind(ctx.system, q.id) === "graph"
      && COMPOSING_FORMS.has(queryForm(ctx.system, q.id) ?? "")
      && q.expected.outcome === "holds"),
  },
  {
    id: "safety",
    label: "A universal behavioral invariant established by exhaustive exploration, refutable by a counterexample.",
    matrixRow: "Safety",
    requires: [],
    detect: (ctx) => anyQuery(ctx, (q) =>
      queryForm(ctx.system, q.id) === "invariant"
      && quantifierOf(ctx.system, q.id) === "forall"
      && q.expected.outcome === "holds"
      && q.expected.coverage === "exhaustive"),
  },
  {
    // The row section 16 marks for Message Bus, and the shape that mark actually takes. MAGE v0.1
    // has no universal graph form -- `runGraphQuery` refuses `forall` outright, because every graph
    // form is established by a witness -- so a safety property over a graph model can only be
    // stated as its existential dual, and `holds` then reports the breach. Separate row rather than
    // folded into `safety`, because the two establish a property by opposite evidence and a reader
    // who conflates them will misread one of the two answers.
    id: "safety-as-existential-dual",
    label:
      "A safety property over a graph model, stated as the existential dual because v0.1 declares no " +
      "universal graph form: the requirement is satisfied when the query is REFUTED, and `holds` is the breach.",
    matrixRow: "Safety",
    requires: [],
    detect: (ctx) => ctx.fixture.requirements.some((r) =>
      r.expressedAs !== null && r.satisfiedWhen === "refuted"
      && queryKind(ctx.system, r.expressedAs) === "graph"),
  },
  {
    id: "reachability",
    label: "A reachability question answered with a finite witness trace.",
    matrixRow: "Liveness",
    requires: [],
    detect: (ctx) => anyQuery(ctx, (q) =>
      queryForm(ctx.system, q.id) === "reach"
      && q.expected.outcome === "holds"
      && q.expected.evidence?.shape === "trace"),
  },
  {
    id: "bounded-progress",
    label:
      "Progress under a bounded policy: no reachable execution repeats a configuration forever. " +
      "An exhaustive statement about a finite space, NOT temporal liveness verification.",
    matrixRow: "Liveness",
    requires: [],
    detect: (ctx) => anyQuery(ctx, (q) =>
      queryForm(ctx.system, q.id) === "repeatable-cycle"
      && q.expected.outcome === "refuted"
      && q.expected.coverage === "exhaustive"),
  },
  {
    id: "bounded-cycles",
    label: "A bounded counter that makes a retry loop finite, and a lasso witness for the re-entry.",
    matrixRow: "State machine",
    requires: [],
    detect: (ctx) =>
      [...ctx.system.machines.values()].some((m) =>
        [...m.variables.values()].some((v) => v.kind === "integer" && v.domain.length > 1))
      && anyQuery(ctx, (q) => q.expected.evidence?.shape === "lasso"),
  },
  {
    id: "witnesses",
    label: "A witness returned with an established existential claim, not merely the word that settles it.",
    matrixRow: "Composition",
    requires: [],
    detect: (ctx) => anyQuery(ctx, (q) => q.expected.evidence?.role === "witness"),
  },
  {
    // Split from witnesses rather than paired with it, because the engine produces the two
    // unevenly: `graph.ts` builds every piece of graph evidence through one `witness()` helper that
    // hardcodes role "witness", so a graph query cannot emit counterexample-role evidence at all.
    // Pairing the two in one row would have hidden that behind message-bus's witnesses.
    id: "counterexamples",
    label: "A counterexample returned with a refuted universal claim, naming the step that breaks it.",
    matrixRow: "Safety",
    requires: [],
    detect: (ctx) =>
      anyQuery(ctx, (q) => q.expected.evidence?.role === "counterexample")
      || ctx.fixture.modifications.some((m) => m.counterexample?.role === "counterexample"),
  },
  {
    id: "purposeful-non-answerability",
    label: "A question REFUSED, with the cause named, rather than answered from a model that does not hold the distinction.",
    matrixRow: "Not-answerable",
    requires: [],
    detect: (ctx) => anyQuery(ctx, (q) => q.expected.outcome === "unlicensed"),
  },
  {
    id: "bounded-coverage-reporting",
    label: "A search truncated by its state limit, reported as inconclusive under bounded coverage (V22).",
    matrixRow: "Not-answerable",
    requires: [],
    detect: (ctx) => anyQuery(ctx, (q) => q.expected.coverage === "bounded"),
  },
  {
    id: "containment-hierarchy",
    label: "Entity containment, and a hierarchical containment path as evidence.",
    matrixRow: "Relations",
    requires: [],
    detect: (ctx) =>
      [...ctx.system.entities.values()].some((e) => e.contains.length > 0)
      && anyQuery(ctx, (q) => queryForm(ctx.system, q.id) === "containment"),
  },
  {
    id: "quantitative-annotations",
    label: "A quantity with a readable dimension, attached to a component, a state or a whole model.",
    matrixRow: "Quantities",
    requires: ["model.quantities"],
    detect: (ctx) => [...ctx.system.quantities.values()]
      .some((qt) => qt.dimension !== null && qt.target.kind !== null),
  },
  {
    // Split from the row above because the two can diverge, and the gap between them is where the
    // quantity layer's real defect used to live: a quantity that typechecks, validates and then
    // reaches no analysis. The declarations are what close it.
    id: "declared-accounting",
    label:
      "The accounting DECLARED rather than inferred: a path-aggregated metric naming one basis, and " +
      "every configuration-scoped quantity naming whether it is resident or charged while a state is " +
      "active (V35-V37).",
    matrixRow: "Quantities",
    requires: ["model.quantities"],
    detect: (ctx) => {
      const latency = ctx.system.accounting.get("latency");
      if (latency === undefined || latency.basis === null) return false;
      const charged = [...ctx.system.quantities.values()].filter((qt) =>
        qt.dimension === "memory" && qt.target.kind !== null
        && ACCOUNTABLE_TARGET_KINDS.includes(qt.target.kind));
      // Exactly one declaration each: both summands of memory(c) are keyed on one, and a quantity
      // enters one of them.
      return charged.length > 0 && charged.every((qt) => (qt.residency !== null) !== (qt.when !== null));
    },
  },
  {
    id: "path-quantity-accounting",
    label:
      "An execution's latency accounted per OCCURRENCE of an accounted entity along a behavioral " +
      "trace: the occurrence counts read off the engine's witness, the per-occurrence charges off " +
      "the model, and a retry charged twice because the trace visits twice.",
    matrixRow: "Performance",
    requires: ["model.quantities"],
    detect: (ctx) => ctx.fixture.quantitativeExpectations.some(
      (e) => e.metric === "latency" && e.traceFrom !== null && e.occurrences.size > 0),
  },
  {
    id: "configuration-memory-accounting",
    label:
      "memory(c) as the resident sum plus the charges whose named state is active in c, with a peak " +
      "over the reachable configurations.",
    matrixRow: "Performance",
    requires: ["model.quantities"],
    detect: (ctx) => ctx.fixture.quantitativeExpectations.some(
      (e) => e.metric === "memory" && e.residentMb.size > 0 && e.whenChargedMb.size > 0),
  },
  {
    // The row that separated "represented and validated" from "evaluated", and the one that
    // reported `unavailable` while nothing in src/ could decide a quantitative requirement. The
    // `kind: quantity` query form closed that gap: the probe finds `magnitude` on the published
    // result shape, and the fixture's quantitative requirements record verdicts the product
    // reaches -- test/examples.test.ts re-derives them through the query form. Because both the
    // probe and this detector read what actually ships, the row flipped by landing the mechanism,
    // not by editing this table.
    id: "performance",
    label:
      "A latency or memory requirement DECIDED by the product: a query that aggregates quantities " +
      "over the executions a behavioral model supplies, and a result that carries the number.",
    matrixRow: "Performance",
    requires: ["model.quantities", "query.path-aggregation"],
    detect: (ctx) => ctx.fixture.requirements.some(
      (r) => r.decidedBy !== null && r.status !== "pending-evaluator"),
  },
  {
    id: "requirements",
    label: "A requirement as a first-class object the model is judged against, not prose beside it.",
    matrixRow: "Requirements",
    requires: ["model.requirements"],
    // The AUTHORED model, not the fixture — and the row's history is what shows the choice paid.
    // While the construct was absent the distinction cost nothing: `requires` pinned the row to
    // `unavailable` whatever `detect` said, so a fixture reading was free and wrong at once. The day
    // `requirements:` landed, a fixture reading would have flipped the row to `exercised` on the
    // strength of `expected-results.yaml`, which is where a requirement lived while the model could
    // not hold one — and the row would have read covered for a day during which nothing authored a
    // requirement. It read `unexercised` for that day instead, and went green on 261005 when the
    // examples authored theirs. The capability this row claims is exercised by the example suite,
    // so the evidence has to be the example's own model.
    detect: (ctx) => ctx.system.requirements.size > 0,
  },
];

export type CoverageStatus = "exercised" | "unexercised" | "unavailable";

export interface CoverageCell {
  readonly capability: string;
  readonly example: string;
  readonly exercised: boolean;
}

export interface CoverageReport {
  readonly cells: readonly CoverageCell[];
  /** Per capability: the verdict across every example, plus the constructs that block it. */
  readonly status: ReadonlyMap<string, CoverageStatus>;
  readonly missingConstructs: ReadonlyMap<string, readonly string[]>;
}

/** Derive the whole matrix. Nothing in here is a claim an example made about itself. */
export function deriveCoverage(
  examples: readonly LoadedExample[], probe: ProductProbe = probeProduct(),
): CoverageReport {
  const cells: CoverageCell[] = [];
  const status = new Map<string, CoverageStatus>();
  const missing = new Map<string, readonly string[]>();

  for (const row of CAPABILITY_ROWS) {
    const absent = row.requires.filter((c) => {
      const construct = CONSTRUCTS[c];
      if (construct === undefined) throw new FixtureError(`row '${row.id}' requires unknown construct '${c}'`);
      return !construct.present(probe);
    });
    if (absent.length > 0) missing.set(row.id, absent);

    let anywhere = false;
    for (const ex of examples) {
      const exercised = absent.length === 0
        && row.detect({ system: ex.workspace.state.system, fixture: ex.fixture });
      cells.push({ capability: row.id, example: ex.id, exercised });
      anywhere = anywhere || exercised;
    }
    status.set(row.id, absent.length > 0 ? "unavailable" : anywhere ? "exercised" : "unexercised");
  }
  return { cells, status, missingConstructs: missing };
}

// ----------------------------------------------------------------------------------------------
// Emission
// ----------------------------------------------------------------------------------------------

/** JSON strings are valid YAML double-quoted scalars, and a label may contain a mapping indicator. */
const q = (s: string): string => JSON.stringify(s);

const constructEntity = (c: string): string => `construct.${c.replace(/\./g, "-")}`;

export function generateExampleCoverageModel(
  examples: readonly LoadedExample[] = SHIPPED_EXAMPLE_IDS.map(loadExample),
  probe: ProductProbe = probeProduct(),
): string {
  const report = deriveCoverage(examples, probe);
  const usedConstructs = [...new Set([...report.missingConstructs.values()].flat())].sort();

  const lines: string[] = [
    "# GENERATED from the shipped examples by `node scripts/gen-example-coverage.ts`. Do not hand-edit:",
    "# every row is derived from the examples' own loaded IR and expected-results fixtures, and",
    "# test/examples.test.ts re-generates this file and compares, so a hand edit fails the build.",
    "#",
    "# Reads as: which major public semantic capabilities of MAGE does the shipped example suite",
    "# actually exercise? A capability with no incoming `exercises` edge is not covered. A capability",
    "# MAGE has no construct for carries a `blocked-by` edge naming what is missing -- reported, never",
    "# omitted, because a coverage model that claims a capability the product lacks is worse than none.",
    "#",
    "# How many examples ship is the `example.*` rows below and is deliberately not restated here;",
    "# the sentence that used to count them went stale the day a fourth landed.",
    "#",
    "# Document Processing declares quantities, declares their accounting, and states both",
    "# performance numbers -- and the Performance row is exercised: the `kind: quantity` query form",
    "# aggregates each metric (the aggregation derived from the dimension's scope), decides the",
    "# declared ceilings, and reports the figure on the result's magnitude field, which the schema",
    "# probe finds. Requirements reads EXERCISED since 261005, and the row's two-step history is the",
    "# reason the detection is worth reading: `unavailable` while no `requirements:` key existed,",
    "# `unexercised` once the construct landed and no model authored one, `exercised` now that every",
    "# shipped example authors its obligations. The row detects off the AUTHORED model and not off",
    "# the fixture, which is what kept the middle step honest -- a fixture reading would have flipped",
    "# the row the moment the construct landed, on evidence from a file that is not the model.",
    "#",
    "# Two of Document Processing's four requirements stay in its fixture, and that costs this row",
    "# nothing: `expressed_as` is a join to a SAVED query by id, and those two are decided by a",
    "# question composed from a declared ceiling at analysis time, which nothing saves.",
    "#",
    "# Transaction Workspace adds no row, and that is worth reading rather than skipping: every",
    "# capability it exercises was already exercised elsewhere. It earns its place as the BEHAVIOR",
    "# flagship (DESIGN-v02-semantics-261004.md §31 example B) and as the example whose `omits` lists",
    "# make a binding visibly not a merge, and this matrix measures neither of those. A coverage",
    "# model is not a quality model.",
    "",
    "mage: 1",
    "",
    "system:",
    "  id: mage-example-coverage",
    "  name: MAGE default-example coverage",
    "  description: >",
    "    Which semantic capabilities the shipped default examples exercise, derived from the examples",
    "    themselves and from a probe of the published schemas.",
    "",
    "domains:",
    "  coverage-status:",
    "    type: enum",
    "    values: [exercised, unexercised, unavailable]",
    "    description: >",
    "      exercised: at least one shipped example exercises it. unexercised: MAGE supports it and no",
    "      shipped example reaches it. unavailable: MAGE has no construct for it, so no example could.",
    "",
    "relation-types:",
    "",
    "  exercises:",
    "    description: The example exercises this semantic capability.",
    "    absence: >",
    "      No shipped example exercises the capability. For a capability MAGE supports, that is a gap in",
    "      the example suite, not a design choice.",
    "    composition:",
    "      path: forbidden",
    "    properties:",
    "      symmetric: false",
    "      acyclic: true",
    "",
    "  blocked-by:",
    "    description: The capability is unreachable because MAGE declares no such construct.",
    "    absence: >",
    "      Nothing structural blocks the capability. If no example exercises it anyway, the example",
    "      suite is what is missing.",
    "    composition:",
    "      path: forbidden",
    "    properties:",
    "      symmetric: false",
    "      acyclic: true",
    "",
    "entities:",
    "",
  ];

  for (const ex of examples) {
    const suggested = ex.fixture.queries.filter((qq) => qq.suggested).length;
    lines.push(
      `  example.${ex.id}:`,
      "    type: default-example",
      `    label: ${q(ex.fixture.title)}`,
      "    properties:",
      `      purposeful_models: ${purposefulModels(ex.workspace.state.system).length}`,
      `      supplied_queries: ${ex.fixture.queries.length}`,
      `      suggested_queries: ${suggested}`,
      "");
  }

  for (const row of CAPABILITY_ROWS) {
    const st = report.status.get(row.id) ?? "unexercised";
    lines.push(
      `  capability.${row.id}:`,
      "    type: semantic-capability",
      `    label: ${q(row.label)}`,
      "    properties:",
      `      matrix_row: ${q(row.matrixRow)}`,
      `      status: { value: ${st}, domain: coverage-status }`,
      "");
  }

  for (const c of usedConstructs) {
    const construct = CONSTRUCTS[c];
    if (construct === undefined) continue;
    lines.push(
      `  ${constructEntity(c)}:`,
      "    type: absent-construct",
      `    label: ${q(construct.label)}`,
      "");
  }

  lines.push(
    "models:",
    "",
    "  coverage:",
    "    type: graph",
    "    label: Default-example coverage",
    "    purpose:",
    "      question: >",
    "        Does the shipped example suite exercise every major public semantic capability of MAGE?",
    "      represents: [default example, semantic capability, absent construct, exercises, blocked-by]",
    "      omits:",
    "        - how thoroughly a capability is exercised",
    "        - which test asserts a given capability",
    "        - capabilities internal to the engine and not reachable from a model file",
    "        - the order in which a reader should work through the examples",
    "    entities:");
  for (const ex of examples) lines.push(`      - example.${ex.id}`);
  for (const row of CAPABILITY_ROWS) lines.push(`      - capability.${row.id}`);
  for (const c of usedConstructs) lines.push(`      - ${constructEntity(c)}`);

  lines.push("    relations:");
  for (const cell of report.cells) {
    if (!cell.exercised) continue;
    lines.push(`      - { from: example.${cell.example}, to: capability.${cell.capability}, type: exercises }`);
  }
  for (const row of CAPABILITY_ROWS) {
    for (const c of report.missingConstructs.get(row.id) ?? []) {
      lines.push(`      - { from: capability.${row.id}, to: ${constructEntity(c)}, type: blocked-by }`);
    }
  }

  lines.push(
    "",
    "# One assertion per capability. `expect` makes a saved query a CI gate: re-running them",
    "# re-derives the matrix, so the answer to the model's question is executable rather than read off",
    "# a table someone maintained by hand.",
    "queries:",
    "");
  for (const row of CAPABILITY_ROWS) {
    const st = report.status.get(row.id) ?? "unexercised";
    lines.push(
      `  exercised-by.${row.id}:`,
      `    name: ${q(`Some shipped example exercises ${row.matrixRow.toLowerCase()} -- ${row.id}`)}`,
      "    kind: graph",
      "    quantifier: exists",
      `    expect: ${st === "exercised" ? "holds" : "refuted"}`,
      "    graph:",
      "      form: predecessors",
      "      relation: exercises",
      `      to: capability.${row.id}`,
      "");
  }
  for (const row of CAPABILITY_ROWS) {
    if ((report.missingConstructs.get(row.id) ?? []).length === 0) continue;
    lines.push(
      `  blocked.${row.id}:`,
      `    name: ${q(`MAGE lacks a construct, so ${row.id} is unreachable`)}`,
      "    kind: graph",
      "    quantifier: exists",
      "    expect: holds",
      "    graph:",
      "      form: successors",
      "      relation: blocked-by",
      `      from: capability.${row.id}`,
      "");
  }
  return lines.join("\n");
}

// Written only when this file IS the entry point, so the test can import the generator without a
// side effect on disk.
const invokedDirectly = (): boolean => {
  const entry = process.argv[1];
  return entry !== undefined && resolve(entry) === resolve(fileURLToPath(import.meta.url));
};

if (invokedDirectly()) {
  const out = "models/example-coverage.mage.yaml";
  writeFileSync(out, generateExampleCoverageModel());
  console.log(`wrote ${out}`);
}
