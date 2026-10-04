/**
 * Engine-facing query types, and the normalizers that turn a loosely-typed query object into them.
 *
 * Dependencies point inward: this module imports the kernel (`../ir/`) and `quant` (the quantity
 * evaluator), nothing else — no YAML, no DOM, no renderer. The model's `engine-must-not-reach-yaml`
 * query asserts the YAML half of that for `query-engine`, and it is answered twice: by
 * `test/model-coverage.test.ts` in CI, and by `validate.py` from the pre-push hook, whose
 * `--self-test` catches an injected violation. Both read the model's declared edges;
 * `test/import-graph.test.ts` is what reads this file's actual imports, resolving each specifier to
 * the entity owning its path. `src/quant/` lifts into `query-engine` there — the model contains it
 * — so the two directories importing each other is internal rather than a cycle, and a new YAML
 * import from either would surface as an undeclared `query-engine → yaml-adapter` edge.
 *
 * The normalizers mirror `canonicalize`'s discipline: total, deterministic, and NOT validating.
 * A malformed field becomes a null and the evaluator refuses with a message naming the cause, which
 * is why nothing here throws and nothing downstream sees `unknown`.
 *
 * Optionals are modelled as `| null`, never `?`. `exactOptionalPropertyTypes` makes the two
 * genuinely different, and a single representation of absence is one fewer thing to get wrong.
 */
import type { Coverage, Evidence, GuardOp, Outcome, QueryResult, ResultMagnitude, Scalar } from "../ir/types.ts";

// --------------------------------------------------------------------------------------------
// Result plumbing
// --------------------------------------------------------------------------------------------

/**
 * Why a question is not answerable. Structured, not only prose.
 *
 * `QueryResult.refusal` is a sentence, and a sentence is what a human reads. An agent needs the
 * same fact as data — which distinction is missing, so it can propose the model change that would
 * make the question answerable rather than re-asking the same thing. This is the shape the query
 * schema is growing (`{ status, reason, missing, models }`); the schema change is the
 * orchestrator's, so the structure lives here for now and travels on `Verdict`.
 */
export type RefusalReason =
  /** V7 — the relation type declares `composition.path: forbidden`. */
  | "composition-forbidden"
  /**
   * V24 — the model represents something, but deliberately omits what the question needs.
   *
   * Produced on both paths: the quantitative one (`src/quant/`, for an expectation with no declared
   * frequency and for an entity with no behavioral counterpart) and the graph one
   * (`src/engine/omission.ts`, when a name resolves nowhere and a `purpose.omits` covers it). §7.6
   * rules which cause wins when several are true.
   */
  | "missing-distinction"
  /** The question names an entity, state, variable or relation this system does not declare. */
  | "unknown-vocabulary"
  /**
   * The system declares NO substrate of the model type the question interrogates — no machine for
   * a behavioural question, no quantities for a quantitative one. Coarser than
   * `missing-distinction` (which presumes a model that chose its reductions) and than
   * `unknown-vocabulary` (which sends the reader hunting for a misspelling that is not the
   * problem). The prose names the missing type from the model-type registry
   * (`src/engine/model-types.ts`), so the refusal and the Learn entry it points toward cannot
   * describe different capabilities.
   */
  | "missing-model-type"
  /** The form exists in the schema but this version does not evaluate it. */
  | "unsupported-form"
  /** §7 — the declared quantifier asks for evidence the form cannot produce. */
  | "quantifier-mismatch"
  /** An effect or derived expression outside the deliberately tiny grammars (expr.ts). */
  | "unsupported-expression"
  /** V14 / V15 — legal to write, reserved for a future version, refused rather than misread. */
  | "reserved-feature"
  /**
   * §8 — the question pairs a quantity with the aggregation axis its scope does not have. The
   * aggregation is DERIVED from the dimension's scope, never chosen per query, so asking for a
   * configuration-scoped quantity along an execution denotes nothing: it is refused as a category
   * error rather than computed as a wrong answer.
   */
  | "category-error";

export interface Refusal {
  readonly reason: RefusalReason;
  readonly prose: string;
  /** Distinctions the model would need in order to answer. Empty when the gap is not a modeling one. */
  readonly missing: readonly string[];
  /** Models consulted while deciding, so a caller can say where to add the distinction. */
  readonly models: readonly string[];
}

export interface RefusalDetail {
  readonly reason: RefusalReason;
  readonly missing: readonly string[];
  readonly models: readonly string[];
}

/**
 * A refusal, not an exception. "Cannot be answered from this model" is a SUCCESSFUL query outcome
 * (V7), so the engine's internal failure channel carries the sentence a user will read rather than
 * a stack trace. Every `Fail` reaching the facade becomes `outcome: "unlicensed"`.
 */
export interface Fail {
  readonly ok: false;
  readonly refusal: string;
  readonly detail: RefusalDetail | null;
}

export type Res<T> = { readonly ok: true; readonly value: T } | Fail;

export const ok = <T>(value: T): Res<T> => ({ ok: true, value });

export const fail = (refusal: string, detail: RefusalDetail | null = null): Fail =>
  ({ ok: false, refusal, detail });

export const detail = (
  reason: RefusalReason, missing: readonly string[] = [], models: readonly string[] = [],
): RefusalDetail => ({ reason, missing, models });

// --------------------------------------------------------------------------------------------
// Queries
// --------------------------------------------------------------------------------------------

/**
 * The two quantifiers, and what each takes as evidence.
 *
 * The table is the sentence's source, not a second copy of it: `parseQuery`'s refusal below builds
 * its prose from these two strings, and `check` lists them as the alternatives a quantifier-less
 * query may choose between. One fact, two readers — the arrangement `GRAPH_FORMS` already uses for
 * the form vocabulary.
 */
export const QUANTIFIERS = ["exists", "forall"] as const;

export type Quantifier = typeof QUANTIFIERS[number];

export const QUANTIFIER_EVIDENCE: Readonly<Record<Quantifier, string>> = {
  exists: "a witness establishes it, exhaustive absence refutes it",
  forall: "exhaustive satisfaction establishes it, a counterexample refutes it",
};

/**
 * Legal `GraphQuery`/`BehaviorQuery` forms, and the sole source of truth for them.
 *
 * `mage-query.schema.json` carries its own copy of each list, by necessity: the schema is the
 * published authority for the wire format, and making it import from here would invert that —
 * the schema would become derived from an implementation detail. That two-way split is held by a
 * parity test (`test/engine-forms.test.ts`), not the compiler, for exactly that reason.
 *
 * Within this module, there used to be a third copy: a hand-written `Set<GraphForm>` /
 * `Set<BehaviorForm>` for the runtime membership check. A `Set<T>` typechecks even when it is
 * missing a member of `T` — it's a legal subset — so that copy could silently drift from the type
 * and `tsc` would stay green. Deriving the type from the array instead of the array from the type
 * makes that drift impossible: there is one list, and the `Set` below is built from it.
 */
export const GRAPH_FORMS = [
  "direct", "reachability", "path", "shortest-path", "all-paths",
  "predecessors", "successors", "cycles", "components", "containment",
] as const;

export type GraphForm = typeof GRAPH_FORMS[number];

export const BEHAVIOR_FORMS = [
  "reach", "invariant", "recurrence", "repeatable-cycle", "deadend", "transition-live",
] as const;

export type BehaviorForm = typeof BEHAVIOR_FORMS[number];

// Typed `ReadonlySet<string>`, not `ReadonlySet<GraphForm>`/`ReadonlySet<BehaviorForm>`: the
// membership check below runs against an untyped `str(g["form"])` result, before the value has
// earned the narrower type.
const GRAPH_FORM_SET: ReadonlySet<string> = new Set(GRAPH_FORMS);
const BEHAVIOR_FORM_SET: ReadonlySet<string> = new Set(BEHAVIOR_FORMS);

/**
 * Forms whose answer is derived by composing edges, and which are therefore gated by
 * `composition.path` (V7).
 *
 * `cycles` is deliberately NOT here even though it traverses many hops: `properties.acyclic` is a
 * declared, checked property of every relation type including `path: forbidden` ones — docable's
 * `owns` declares both — so cycle detection is licensed by V8 independently of V7. `containment`
 * is also absent: it walks the entity `contains` tree, which §2 declares yields hierarchical paths,
 * not a relation type. `components` IS here, because a connected component is a reachability class
 * and that is exactly the inference `forbidden` declines to authorize.
 *
 * `validate.py`'s `GRAPH_COMPOSING` is the same five forms, by name and by content. It was the four
 * path forms, which made `components` an extension here rather than a shared decision — and a
 * licensing boundary the two tools draw differently is a licensing boundary neither can be trusted
 * on. `test/parity.test.ts` now compares the two tools' ANSWERS over every repo model, so a form
 * added to one list and not the other fails the build.
 */
export const GRAPH_COMPOSING: ReadonlySet<GraphForm> = new Set<GraphForm>([
  "reachability", "path", "shortest-path", "all-paths", "components",
]);

/** Order comparisons; `eq`/`ne` work on any scalar, these need a declared ordering (V20). */
export const ORDER_OPS: ReadonlySet<GuardOp> = new Set<GuardOp>(["lt", "le", "gt", "ge"]);

export interface PropConstraint {
  readonly property: string;
  readonly op: "eq" | "ne" | "in";
  readonly values: readonly Scalar[];
}

/** `source.classification > target.accepts` — well-typed only under one shared ordered domain. */
export interface Comparison {
  readonly left: string;
  readonly op: GuardOp;
  readonly right: string;
}

export interface GraphWhere {
  readonly source: readonly PropConstraint[];
  readonly target: readonly PropConstraint[];
  readonly compare: readonly Comparison[];
}

export interface GraphQuery {
  readonly form: GraphForm;
  readonly relation: string;
  readonly from: string | null;
  readonly to: string | null;
  readonly maxHops: number | null;
  readonly where: GraphWhere | null;
}

/** A conjunction of atoms; combinators are a separate node so a predicate is never half-parsed. */
export interface Atom {
  readonly ref: string;
  readonly op: GuardOp;
  readonly value: Scalar;
}

export type Predicate =
  | { readonly kind: "atoms"; readonly atoms: readonly Atom[] }
  | { readonly kind: "all-of"; readonly operands: readonly Predicate[] }
  | { readonly kind: "any-of"; readonly operands: readonly Predicate[] }
  | { readonly kind: "not"; readonly operand: Predicate };

export interface TransitionSelector {
  readonly machine: string | null;
  readonly from: string | null;
  readonly to: string | null;
  readonly sync: string | null;
}

export interface BehaviorQuery {
  readonly form: BehaviorForm;
  readonly target: Predicate | null;
  readonly predicate: Predicate | null;
  readonly avoid: Predicate | null;
  readonly transition: TransitionSelector | null;
  readonly limit: number | null;
}

/**
 * A quantitative question. Deliberately, there is NO aggregation parameter: the aggregation is
 * DERIVED from the named metric's dimension scope (§8) — an execution-scoped metric is the
 * worst-case sum along executions, a configuration-scoped one is the peak of memory(c) over the
 * reachable set — so the `max|min|named` selector the §29 refinement rejected cannot reappear as a
 * query field. What a caller MAY say is which executions the question is about (`target`, the reach
 * predicate the selected executions end at) and which declared ceiling to decide against
 * (`within`, a `model:`-targeted quantity). A `target` on a configuration-scoped metric is a
 * category error the evaluator refuses by name.
 */
export interface QuantityQuery {
  /** The analysis name, as written. The evaluator holds it to its closed vocabulary. */
  readonly metric: string;
  /** Execution-scoped metrics only: the executions measured are those REACHING this predicate. */
  readonly target: Predicate | null;
  /** The `model:`-targeted quantity declaring the ceiling to decide against; null = report the figure. */
  readonly within: string | null;
  readonly limit: number | null;
}

export type Query =
  | { readonly kind: "graph"; readonly quantifier: Quantifier; readonly name: string | null; readonly graph: GraphQuery }
  | { readonly kind: "behavior"; readonly quantifier: Quantifier; readonly name: string | null; readonly behavior: BehaviorQuery }
  | { readonly kind: "quantity"; readonly quantifier: Quantifier; readonly name: string | null; readonly quantity: QuantityQuery };

// --------------------------------------------------------------------------------------------
// Normalization from a loaded query object
// --------------------------------------------------------------------------------------------

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const asArr = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const posInt = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 ? v : null;
const isScalar = (v: unknown): v is Scalar =>
  typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v));

const GUARD_OPS: readonly GuardOp[] = ["eq", "ne", "lt", "le", "gt", "ge"];

/** Keys in sorted order, so a predicate's evaluation never depends on authoring order. */
const sortedEntries = (v: unknown): readonly [string, unknown][] =>
  isObj(v) ? Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)) : [];

/**
 * Parse a predicate. Returns null for "not a predicate at all" so the caller can say which field
 * was missing; an EMPTY conjunction is also null rather than vacuously true — a predicate the
 * engine silently reads as `true` is the quietest possible wrong answer.
 */
export function parsePredicate(raw: unknown): Predicate | null {
  if (!isObj(raw)) return null;

  if ("not" in raw) {
    const inner = parsePredicate(raw["not"]);
    return inner === null ? null : { kind: "not", operand: inner };
  }
  for (const key of ["all-of", "any-of"] as const) {
    if (key in raw) {
      const operands: Predicate[] = [];
      for (const item of asArr(raw[key])) {
        const p = parsePredicate(item);
        if (p === null) return null;
        operands.push(p);
      }
      return operands.length === 0 ? null : { kind: key, operands };
    }
  }

  const atoms: Atom[] = [];
  for (const [ref, cond] of sortedEntries(raw)) {
    if (isScalar(cond)) atoms.push({ ref, op: "eq", value: cond });
    else if (isObj(cond)) {
      for (const op of GUARD_OPS) {
        const v = cond[op];
        if (isScalar(v)) atoms.push({ ref, op, value: v });
      }
    }
  }
  return atoms.length === 0 ? null : { kind: "atoms", atoms };
}

/**
 * Read a `{ property: value }` / `{ property: { ne | in } }` object as constraints.
 *
 * Exported since `elements` (§2.4) is the second caller: a graph question narrows its endpoints with
 * this grammar and an element selector narrows the entity table with it, and one grammar wants one
 * parser. Returns an empty list for anything it cannot read; the CALLER decides whether an empty
 * list means "no constraints" or "unreadable selector", because only the caller knows whether the
 * field was present.
 */
export function parsePropConstraints(raw: unknown): readonly PropConstraint[] {
  const out: PropConstraint[] = [];
  for (const [property, cond] of sortedEntries(raw)) {
    if (isScalar(cond)) out.push({ property, op: "eq", values: [cond] });
    else if (isObj(cond)) {
      for (const op of ["eq", "ne"] as const) {
        const v = cond[op];
        if (isScalar(v)) out.push({ property, op, values: [v] });
      }
      if ("in" in cond) {
        out.push({ property, op: "in", values: asArr(cond["in"]).filter(isScalar) });
      }
    }
  }
  return out;
}

function parseWhere(raw: unknown): GraphWhere | null {
  if (!isObj(raw)) return null;
  const compare: Comparison[] = [];
  for (const c of asArr(raw["compare"])) {
    if (!isObj(c)) continue;
    const left = str(c["left"]);
    const right = str(c["right"]);
    const op = GUARD_OPS.find((o) => o === c["op"]);
    if (left !== null && right !== null && op !== undefined) compare.push({ left, op, right });
  }
  const where: GraphWhere = {
    source: parsePropConstraints(raw["source"]),
    target: parsePropConstraints(raw["target"]),
    compare,
  };
  return where.source.length + where.target.length + where.compare.length === 0 ? null : where;
}

export function parseGraphQuery(raw: unknown): Res<GraphQuery> {
  const g = isObj(raw) ? raw : {};
  const form = str(g["form"]);
  if (form === null || !GRAPH_FORM_SET.has(form)) {
    return fail(`graph form '${String(g["form"])}' is not one of ${GRAPH_FORMS.join(", ")}.`);
  }
  const relation = str(g["relation"]);
  if (relation === null) return fail("a graph query must name the relation type it traverses.");
  return ok({
    form: form as GraphForm,
    relation,
    from: str(g["from"]),
    to: str(g["to"]),
    maxHops: posInt(g["max-hops"]),
    where: parseWhere(g["where"]),
  });
}

export function parseBehaviorQuery(raw: unknown): Res<BehaviorQuery> {
  const b = isObj(raw) ? raw : {};
  const form = str(b["form"]);
  if (form === null || !BEHAVIOR_FORM_SET.has(form)) {
    return fail(`behavior form '${String(b["form"])}' is not one of ${BEHAVIOR_FORMS.join(", ")}.`);
  }
  const t = isObj(b["transition"]) ? b["transition"] : null;
  return ok({
    form: form as BehaviorForm,
    target: parsePredicate(b["target"]),
    predicate: parsePredicate(b["predicate"]),
    avoid: parsePredicate(b["avoid"]),
    transition: t === null ? null : {
      machine: str(t["machine"]),
      from: str(t["from"]),
      to: str(t["to"]),
      sync: str(t["sync"]),
    },
    limit: posInt(b["limit"]),
  });
}

/**
 * Parse a quantity query. Non-validating, like its two siblings: the metric travels as written and
 * the EVALUATOR holds it to the closed vocabulary, so an unknown metric refuses with a sentence
 * naming the choices rather than becoming a parse error with no model context.
 */
export function parseQuantityQuery(raw: unknown): Res<QuantityQuery> {
  const g = isObj(raw) ? raw : {};
  const metric = str(g["metric"]);
  if (metric === null) {
    return fail("a quantity query must name the metric it computes: latency, cost, or peak_memory.");
  }
  return ok({
    metric,
    target: parsePredicate(g["target"]),
    within: str(g["within"]),
    limit: posInt(g["limit"]),
  });
}

export function parseQuery(raw: unknown): Res<Query> {
  const q = isObj(raw) ? raw : {};
  const name = str(q["name"]);
  const quantifier = q["quantifier"];
  if (quantifier !== "exists" && quantifier !== "forall") {
    // V21 in its sharpest form: the quantifier determines what counts as evidence, so guessing it
    // would be guessing the question. Refuse and name both readings.
    return fail(
      `every query must declare its quantifier: 'exists' (${QUANTIFIER_EVIDENCE.exists}) or ` +
      `'forall' (${QUANTIFIER_EVIDENCE.forall}). The engine does not infer it, because the two ` +
      `take different evidence.`);
  }
  if (q["kind"] === "graph") {
    const g = parseGraphQuery(q["graph"]);
    return g.ok ? ok({ kind: "graph", quantifier, name, graph: g.value }) : g;
  }
  if (q["kind"] === "behavior") {
    const b = parseBehaviorQuery(q["behavior"]);
    return b.ok ? ok({ kind: "behavior", quantifier, name, behavior: b.value }) : b;
  }
  if (q["kind"] === "quantity") {
    const qu = parseQuantityQuery(q["quantity"]);
    return qu.ok ? ok({ kind: "quantity", quantifier, name, quantity: qu.value }) : qu;
  }
  return fail(`query kind '${String(q["kind"])}' is not 'graph', 'behavior' or 'quantity'.`);
}

// --------------------------------------------------------------------------------------------
// Result construction
// --------------------------------------------------------------------------------------------

export const NOT_APPLICABLE: Coverage = { kind: "not-applicable", statesExplored: 0, reason: null };

export const exhaustive = (statesExplored: number): Coverage =>
  ({ kind: "exhaustive", statesExplored, reason: null });

export const bounded = (statesExplored: number, reason: NonNullable<Coverage["reason"]>): Coverage =>
  ({ kind: "bounded", statesExplored, reason });

/**
 * Build a result. `systemHash` is threaded by the facade rather than defaulted, because a result
 * that cannot name the system it describes is the failure mode the field exists to prevent.
 */
export function result(fields: {
  readonly outcome: Outcome;
  readonly coverage: Coverage;
  readonly systemHash: string;
  readonly evidence?: Evidence | null;
  readonly refusal?: string | null;
  readonly interpretedAs?: string | null;
  readonly compilation?: readonly QueryResult["compilation"][number][];
  readonly magnitude?: ResultMagnitude | null;
}): QueryResult {
  return {
    outcome: fields.outcome,
    coverage: fields.coverage,
    evidence: fields.evidence ?? null,
    refusal: fields.refusal ?? null,
    interpretedAs: fields.interpretedAs ?? null,
    compilation: fields.compilation ?? [],
    magnitude: fields.magnitude ?? null,
    systemHash: fields.systemHash,
  };
}

/**
 * An answer, with the two things `QueryResult` has nowhere to put: the structured refusal, and the
 * node sets a single flat `evidence.nodes` cannot carry (`all-paths`, `components`).
 *
 * Both are candidates for hoisting into the schema and `src/ir/types.ts`; until then they travel
 * beside the schema-shaped result rather than being dropped.
 */
export interface Verdict {
  readonly result: QueryResult;
  readonly refusal: Refusal | null;
  readonly nodeSets: readonly (readonly string[])[];
}

export const verdict = (res: QueryResult, nodeSets: readonly (readonly string[])[] = []): Verdict =>
  ({ result: res, refusal: null, nodeSets });

/**
 * The outcome of ADMITTING a question: the plan a licensed one gets to use, or the verdict a
 * refused one earns.
 *
 * One shape for all three query kinds, because `check` reports over all three and a shape per kind
 * would be three ways to say "refused" for one interface to normalise. The plan is per kind and
 * deliberately opaque here: it is whatever that kind's admission resolved, and only that kind's
 * evaluator reads it.
 */
export type Admission<P> =
  | { readonly admitted: true; readonly plan: P }
  | { readonly admitted: false; readonly verdict: Verdict };

export const refusedAdmission = <P>(v: Verdict): Admission<P> => ({ admitted: false, verdict: v });

/** The one shape a refusal takes: a successful result that reports what the model does not license. */
export function unlicensed(
  systemHash: string, prose: string, interpretedAs: string | null = null,
  refusalDetail: RefusalDetail | null = null,
): Verdict {
  const d = refusalDetail ?? detail("unknown-vocabulary");
  return {
    result: result({ outcome: "unlicensed", coverage: NOT_APPLICABLE, systemHash, refusal: prose, interpretedAs }),
    refusal: { reason: d.reason, prose, missing: d.missing, models: d.models },
    nodeSets: [],
  };
}
