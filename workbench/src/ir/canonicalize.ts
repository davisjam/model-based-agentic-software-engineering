/**
 * Loaded document -> canonical IR.
 *
 * This is the ONLY place a loosely-typed loaded object becomes typed. Downstream code never sees
 * `unknown`, never re-parses, and never asks the YAML layer anything — which is the pipeline
 * model's claim that formatting cannot reach a query result.
 *
 * Canonicalization is deliberately total and deterministic: same input, byte-identical IR, so the
 * hash in hash.ts is a stable transaction base. It does NOT validate. Shape errors are the
 * validator's job; here a malformed field becomes a defaulted or empty value, and the validator
 * reports it. Two passes rather than one so a single bad field cannot abort the whole load.
 */
import type {
  AccountedMetric, AccountingBasis, Annotated, CanonAccounting, CanonDomain, CanonEntity, CanonEvent,
  CanonMachine, CanonModel, CanonQuantity, CanonRelation, CanonRelationType, CanonTransition,
  CanonQuantitativeModel, CanonVariable, CanonicalSystem, Dimension, Effect, ExprFactor,
  ExprOperand, ExprTerm, Guard,
  GuardOp, HistoryEntry, MachineInstance, Magnitude, MagnitudeFault, Note, NoteKind, PropertyValue,
  Provenance, Purpose, QuantityTarget, QuantityValue, QuantityWhen, Residency, SavedQuery,
  SavedRequirement, Scalar,
  TargetKind,
} from "./types.ts";
import {
  ACCOUNTABLE_TARGET_KINDS, ACCOUNTED_METRICS, ACCOUNTED_METRIC_IDS, ACCOUNTING_BASES,
  AGGREGATE_TARGET_KIND, DIMENSION_IDS, DIMENSIONS,
  METRIC_NAMESPACE, NO_ANNOTATION, RESIDENCIES, TARGET_KINDS, UNIT_DIMENSIONS, isPlainDecimal,
} from "./types.ts";

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const asStr = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const asNum = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const asArr = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);
const strArr = (v: unknown): readonly string[] => asArr(v).filter((x): x is string => typeof x === "string");
const isScalar = (v: unknown): v is Scalar =>
  typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v));

/** Keys an object in sorted order, so iteration never depends on authoring order. */
const sortedEntries = (v: unknown): readonly [string, unknown][] =>
  isObj(v) ? Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)) : [];

const GUARD_OPS: readonly GuardOp[] = ["eq", "ne", "lt", "le", "gt", "ge"];

const NOTE_KINDS: readonly NoteKind[] = ["comment", "rationale", "assumption", "question", "todo"];

/**
 * Notes and provenance. Non-semantic, so a malformed one is DROPPED rather than defaulted into
 * something meaningful -- annotation that cannot be read is better absent than invented.
 */
function annotation(raw: unknown): Annotated {
  const s = isObj(raw) ? raw : {};
  const notes: Note[] = [];
  asArr(s["notes"]).forEach((n, i) => {
    if (!isObj(n)) return;
    const kindRaw = asStr(n["kind"], "comment");
    const kind = (NOTE_KINDS as readonly string[]).includes(kindRaw) ? (kindRaw as NoteKind) : "comment";
    const text = asStr(n["text"]);
    if (text === "") return;
    const KNOWN = new Set(["id", "kind", "text", "author", "at"]);
    notes.push({
      id: asStr(n["id"], `note-${i + 1}`), kind, text,
      author: typeof n["author"] === "string" ? n["author"] : null,
      at: typeof n["at"] === "string" ? n["at"] : null,
      unexpectedKeys: Object.keys(n).filter((k) => !KNOWN.has(k)).sort(),
    });
  });

  let provenance: Provenance | null = null;
  const pr = s["provenance"];
  if (isObj(pr)) {
    const history: HistoryEntry[] = [];
    for (const h of asArr(pr["history"])) {
      if (!isObj(h)) continue;
      history.push({
        revision: typeof h["revision"] === "string" ? h["revision"] : null,
        actor: typeof h["actor"] === "string" ? h["actor"] : null,
        prompt: typeof h["prompt"] === "string" ? h["prompt"] : null,
        action: typeof h["action"] === "string" ? h["action"] : null,
        at: typeof h["at"] === "string" ? h["at"] : null,
      });
    }
    provenance = {
      createdBy: typeof pr["created_by"] === "string" ? pr["created_by"] : null,
      createdAt: typeof pr["created_at"] === "string" ? pr["created_at"] : null,
      prompt: typeof pr["prompt"] === "string" ? pr["prompt"] : null,
      rationale: typeof pr["rationale"] === "string" ? pr["rationale"] : null,
      history,
    };
  }
  return notes.length === 0 && provenance === null ? NO_ANNOTATION : { notes, provenance };
}

// --------------------------------------------------------------------------------------------

function domains(raw: unknown): Map<string, CanonDomain> {
  const out = new Map<string, CanonDomain>();
  for (const [id, spec] of sortedEntries(raw)) {
    if (!isObj(spec)) continue;
    const kind = asStr(spec["type"], "enum");
    const range = asArr(spec["range"]);
    out.set(id, {
      id,
      kind: kind === "ordered-enum" || kind === "boolean" || kind === "integer" ? kind : "enum",
      values: strArr(spec["values"]),
      range: range.length === 2 && typeof range[0] === "number" && typeof range[1] === "number"
        ? [range[0], range[1]]
        : null,
    });
  }
  return out;
}

function properties(raw: unknown): Map<string, PropertyValue> {
  const out = new Map<string, PropertyValue>();
  for (const [name, v] of sortedEntries(raw)) {
    if (isScalar(v)) out.set(name, { value: v, domain: null });
    else if (isObj(v) && isScalar(v["value"])) {
      out.set(name, { value: v["value"], domain: typeof v["domain"] === "string" ? v["domain"] : null });
    }
  }
  return out;
}

function entities(raw: unknown): Map<string, CanonEntity> {
  const draft = new Map<string, Omit<CanonEntity, "parent">>();
  for (const [id, spec] of sortedEntries(raw)) {
    const s = isObj(spec) ? spec : {};
    draft.set(id, {
      id,
      type: typeof s["type"] === "string" ? s["type"] : null,
      label: asStr(s["label"], id),
      properties: properties(s["properties"]),
      contains: strArr(s["contains"]),
      annotation: annotation(s),
    });
  }
  // Second pass resolves parents, so containment is navigable in both directions without the
  // caller walking every entity. A child claimed twice keeps its FIRST parent; the duplicate is
  // the validator's finding (V5), not something to silently pick a winner for here.
  const parent = new Map<string, string>();
  for (const e of draft.values()) {
    for (const child of e.contains) if (!parent.has(child)) parent.set(child, e.id);
  }
  const out = new Map<string, CanonEntity>();
  for (const [id, e] of draft) out.set(id, { ...e, parent: parent.get(id) ?? null });
  return out;
}

function relationTypes(raw: unknown): Map<string, CanonRelationType> {
  const out = new Map<string, CanonRelationType>();
  for (const [id, spec] of sortedEntries(raw)) {
    const s = isObj(spec) ? spec : {};
    const comp = isObj(s["composition"]) ? s["composition"] : {};
    const props = isObj(s["properties"]) ? s["properties"] : {};
    out.set(id, {
      id,
      description: asStr(s["description"]),
      absence: typeof s["absence"] === "string" ? s["absence"] : null,
      // Default `forbidden`: an undeclared relation type does not license multi-hop questions.
      // Defaulting the other way would let a missing field silently authorize transitive reasoning.
      pathComposition: comp["path"] === "allowed" ? "allowed" : "forbidden",
      symmetric: props["symmetric"] === true,
      acyclic: props["acyclic"] === true,
    });
  }
  return out;
}

function purpose(raw: unknown): Purpose {
  const s = isObj(raw) ? raw : {};
  return {
    question: typeof s["question"] === "string" ? s["question"] : null,
    represents: strArr(s["represents"]),
    omits: strArr(s["omits"]),
  };
}

function models(raw: unknown): { models: Map<string, CanonModel>; relations: CanonRelation[] } {
  const out = new Map<string, CanonModel>();
  const relations: CanonRelation[] = [];
  for (const [id, spec] of sortedEntries(raw)) {
    const s = isObj(spec) ? spec : {};
    out.set(id, {
      id,
      label: asStr(s["label"], id),
      purpose: purpose(s["purpose"]),
      entities: strArr(s["entities"]),
      annotation: annotation(s),
    });
    for (const r of asArr(s["relations"])) {
      if (!isObj(r)) continue;
      relations.push({
        id: typeof r["id"] === "string" ? r["id"] : null,
        model: id,
        from: asStr(r["from"]),
        to: asStr(r["to"]),
        type: asStr(r["type"]),
        annotation: annotation(r),
      });
    }
  }
  return { models: out, relations };
}

function variable(machine: string, id: string, raw: unknown, declared: Map<string, CanonDomain>): CanonVariable {
  const s = isObj(raw) ? raw : {};
  const kindRaw = asStr(s["type"], "enum");
  const named = typeof s["domain"] === "string" ? declared.get(s["domain"]) : undefined;

  // Enumerate the domain eagerly. An explorer that has to ask "what values can this take?" mid-walk
  // is an explorer that can be handed an unbounded one; a list cannot be unbounded.
  let domain: Scalar[] = [];
  let kind: CanonVariable["kind"] = "enum";
  if (kindRaw === "boolean" || named?.kind === "boolean") {
    kind = "boolean";
    domain = [false, true];
  } else if (kindRaw === "integer" || named?.kind === "integer") {
    kind = "integer";
    const range = asArr(s["range"]);
    const lo = typeof range[0] === "number" ? range[0] : named?.range?.[0];
    const hi = typeof range[1] === "number" ? range[1] : named?.range?.[1];
    if (lo !== undefined && hi !== undefined && hi >= lo) {
      for (let i = lo; i <= hi; i += 1) domain.push(i);
    }
  } else {
    kind = "enum";
    domain = [...(strArr(s["values"]).length ? strArr(s["values"]) : (named?.values ?? []))];
  }

  const initial = isScalar(s["initial"]) ? s["initial"] : (domain[0] ?? 0);
  return { id, machine, kind, domain, initial };
}

function transitions(machine: string, raw: unknown): CanonTransition[] {
  const out: CanonTransition[] = [];
  asArr(raw).forEach((t, index) => {
    if (!isObj(t)) return;
    const guards: Guard[] = [];
    for (const [ref, cond] of sortedEntries(t["requires"])) {
      if (isScalar(cond)) guards.push({ ref, op: "eq", value: cond });
      else if (isObj(cond)) {
        for (const op of GUARD_OPS) {
          const v = cond[op];
          if (isScalar(v)) guards.push({ ref, op, value: v });
        }
      }
    }
    const effects: Effect[] = [];
    for (const [variableName, expr] of sortedEntries(t["effects"])) {
      if (typeof expr === "string") effects.push({ variable: variableName, expression: expr });
      else if (isScalar(expr)) effects.push({ variable: variableName, expression: String(expr) });
    }
    out.push({
      index,
      machine,
      from: asStr(t["from"]),
      to: asStr(t["to"]),
      label: typeof t["label"] === "string" ? t["label"] : null,
      // `sync`, never `on`: YAML 1.1 reads a bare `on` key as boolean true (§10.1).
      sync: typeof t["sync"] === "string" ? t["sync"] : null,
      guards,
      effects,
    });
  });
  return out;
}

function machines(raw: unknown, declared: Map<string, CanonDomain>): Map<string, CanonMachine> {
  const out = new Map<string, CanonMachine>();
  for (const [id, spec] of sortedEntries(raw)) {
    const s = isObj(spec) ? spec : {};
    const vars = new Map<string, CanonVariable>();
    for (const [vid, v] of sortedEntries(s["variables"])) vars.set(vid, variable(id, vid, v, declared));
    const derived = new Map<string, string>();
    for (const [did, expr] of sortedEntries(s["derived"])) if (typeof expr === "string") derived.set(did, expr);
    out.set(id, {
      id,
      entity: typeof s["entity"] === "string" ? s["entity"] : null,
      instances: Math.max(1, Math.trunc(asNum(s["instances"], 1))),
      purpose: purpose(s["purpose"]),
      initial: asStr(s["initial"]),
      states: sortedEntries(s["states"]).map(([n]) => n),
      variables: vars,
      derived,
      transitions: transitions(id, s["transitions"]),
    });
  }
  return out;
}

/** `instances: 1` keeps the bare name; N > 1 yields `name[i]`. Default 1 stays invisible (T4). */
function expand(ms: Map<string, CanonMachine>): MachineInstance[] {
  const out: MachineInstance[] = [];
  for (const m of ms.values()) {
    if (m.instances === 1) out.push({ id: m.id, machine: m.id, ordinal: 0 });
    else for (let i = 0; i < m.instances; i += 1) out.push({ id: `${m.id}[${i}]`, machine: m.id, ordinal: i });
  }
  return out;
}

// --------------------------------------------------------------------------------------------
// Quantities
//
// Normalization lives HERE because canonicalize is already total, deterministic and non-validating:
// §7's "literals normalize to the base unit during model normalization" then has exactly one home,
// and a quantity reaches anything downstream in base units or not at all.
// --------------------------------------------------------------------------------------------

/** A written literal split into decimal and unit token, before any dimension is consulted. */
interface SplitLiteral {
  readonly text: string;
  readonly numberText: string;
  readonly unit: string | null;
  /** False when the decimal is missing or not plain, so no dimension can rescue it. */
  readonly plain: boolean;
}

const NO_LITERAL: SplitLiteral = { text: "", numberText: "", unit: null, plain: false };

function splitLiteral(raw: unknown): SplitLiteral {
  if (typeof raw === "number") {
    // String(1e21) is "1e+21", which isPlainDecimal refuses. An absurd magnitude is therefore
    // reported rather than carried downstream in a spelling no author wrote.
    const text = String(raw);
    return { text, numberText: text, unit: null, plain: Number.isFinite(raw) && isPlainDecimal(text) };
  }
  if (typeof raw !== "string") return NO_LITERAL;
  const text = raw.trim();
  if (text === "") return NO_LITERAL;
  const words = text.split(/\s+/);
  const numberText = words[0] ?? "";
  if (words.length > 2) return { text, numberText, unit: null, plain: false };
  return { text, numberText, unit: words[1] ?? null, plain: isPlainDecimal(numberText) };
}

const faulted = (lit: SplitLiteral, unit: string | null, fault: MagnitudeFault): Magnitude =>
  ({ raw: lit.text, unit, base: null, fault });

/**
 * One written magnitude, normalized against the dimension that was declared for it.
 *
 * Exported as `parseMagnitude` below. The edit layer needs to tell an author that `64 ms` is not a
 * memory literal BEFORE the write, and the only alternative to reusing this is a second parser —
 * which would be a second set of opinions about exotic numeric spellings, the exact disagreement
 * `isPlainDecimal` exists to close.
 */
function magnitude(raw: unknown, dimension: Dimension | null): Magnitude {
  const lit = splitLiteral(raw);
  if (lit.text === "") return faulted(lit, null, "absent");
  if (dimension === null) return faulted(lit, lit.unit, "dimension-unknown");
  if (!lit.plain) return faulted(lit, lit.unit, "spelling");
  const spec = DIMENSIONS[dimension];
  const dimensionless = spec.base === null;
  if (lit.unit === null) {
    return dimensionless
      ? { raw: lit.text, unit: null, base: Number(lit.numberText), fault: null }
      : faulted(lit, null, "unit-missing");
  }
  if (dimensionless) return faulted(lit, lit.unit, "unit-forbidden");
  const factor = spec.units[lit.unit];
  if (factor === undefined) {
    return faulted(lit, lit.unit, UNIT_DIMENSIONS.has(lit.unit) ? "unit-foreign" : "unit-unknown");
  }
  return { raw: lit.text, unit: lit.unit, base: Number(lit.numberText) * factor, fault: null };
}

/** The schema's id shape, for telling a reference apart from a typo. */
const ID_SHAPE = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

function classifyOperand(text: string): ExprOperand {
  const lit = splitLiteral(text);
  // A recognised unit makes this a LITERAL even when its decimal is misspelled, so `017 ms` is
  // reported as a spelling the loaders disagree on rather than as an unrecognisable name.
  if (lit.unit !== null) {
    const owner = UNIT_DIMENSIONS.get(lit.unit);
    if (owner !== undefined) return { kind: "literal", magnitude: magnitude(text, owner), dimension: owner };
  } else if (lit.plain) {
    const bare: Magnitude = { raw: lit.text, unit: null, base: Number(lit.numberText), fault: null };
    return { kind: "literal", magnitude: bare, dimension: null };
  }
  if (text === METRIC_NAMESPACE) return { kind: "metric", name: "" };
  if (text.startsWith(`${METRIC_NAMESPACE}.`)) {
    return { kind: "metric", name: text.slice(METRIC_NAMESPACE.length + 1) };
  }
  if (ID_SHAPE.test(text)) return { kind: "quantity", id: text };
  return { kind: "unreadable", text };
}

const EXPR_OPS: ReadonlySet<string> = new Set(["+", "-", "*", "/"]);

/**
 * `metrics.state_count * 2 ms` -> a sum of products. Nothing is evaluated; the shape exists so a
 * dimension check can walk the operands (V30).
 *
 * An operator MUST stand alone between spaces, because an id may contain `-` (`gateway-latency`)
 * and splitting on the character would cut a reference in half. Tokens are therefore
 * whitespace-separated words: a lone `+ - * /` is an operator, and any run of other words is one
 * operand — which is also how `2 ms` stays a single operand.
 *
 * Precedence is the ordinary one. Parentheses are not v0.1 syntax, so a token carrying one becomes
 * an unreadable operand that V28 reports, instead of being dropped from the dimension check.
 */
function parseExpression(source: string): readonly ExprTerm[] {
  const words = source.trim().split(/\s+/).filter((w) => w !== "");
  const terms: ExprTerm[] = [];
  let termOp: "+" | "-" = "+";
  let factors: ExprFactor[] = [];
  let factorOp: "*" | "/" = "*";
  let pending: string[] = [];

  const flushFactor = (): void => {
    if (pending.length === 0) return;
    factors.push({ op: factorOp, operand: classifyOperand(pending.join(" ")) });
    pending = [];
  };
  const flushTerm = (): void => {
    flushFactor();
    if (factors.length === 0) return;
    terms.push({ op: termOp, factors });
    factors = [];
  };

  for (const w of words) {
    if (!EXPR_OPS.has(w)) {
      pending.push(w);
    } else if (w === "+" || w === "-") {
      flushTerm();
      termOp = w;
      factorOp = "*";
    } else {
      flushFactor();
      factorOp = w === "/" ? "/" : "*";
    }
  }
  // A trailing operator would otherwise vanish and the expression would check clean while meaning
  // something the author did not write. Record it as unreadable so V28 names it.
  const last = words.at(-1);
  if (last !== undefined && EXPR_OPS.has(last)) {
    factors.push({ op: factorOp, operand: { kind: "unreadable", text: last } });
  }
  flushTerm();
  return terms;
}

function target(raw: unknown): QuantityTarget {
  const text = asStr(raw).trim();
  const colon = text.indexOf(":");
  if (colon <= 0) return { raw: text, kind: null, ref: text };
  const head = text.slice(0, colon);
  return {
    raw: text,
    kind: (TARGET_KINDS as readonly string[]).includes(head) ? (head as TargetKind) : null,
    ref: text.slice(colon + 1).trim(),
  };
}

function quantityValue(spec: Obj, dimension: Dimension | null): QuantityValue {
  const range = asArr(spec["range"]);
  if (range.length > 0) {
    return { kind: "range", low: magnitude(range[0], dimension), high: magnitude(range[1], dimension) };
  }
  const v = spec["value"];
  if (isObj(v)) {
    const source = asStr(v["expression"]);
    return { kind: "expression", source, terms: parseExpression(source) };
  }
  if (v === undefined || v === null) return { kind: "absent" };
  return { kind: "point", magnitude: magnitude(v, dimension) };
}

/** The only key a `when` block carries in v0.1. Anything else is recorded, never dropped. */
const WHEN_KEYS: ReadonlySet<string> = new Set(["state"]);

/**
 * `when: { state: document.remediating }`.
 *
 * A `when` written as a bare string rather than a block yields a null state and no unexpected keys,
 * so V37 reports an undeclared charge rather than this guessing that the string was the state.
 */
function quantityWhen(raw: unknown): QuantityWhen {
  const s = isObj(raw) ? raw : {};
  const state = asStr(s["state"]).trim();
  return {
    state: state === "" ? null : state,
    unexpectedKeys: Object.keys(s).filter((k) => !WHEN_KEYS.has(k)).sort(),
  };
}

function quantities(raw: unknown): Map<string, CanonQuantity> {
  const out = new Map<string, CanonQuantity>();
  for (const [id, spec] of sortedEntries(raw)) {
    const s = isObj(spec) ? spec : {};
    const declared = asStr(s["dimension"]);
    const dimension = (DIMENSION_IDS as readonly string[]).includes(declared) ? (declared as Dimension) : null;
    // Keyed on `undefined` rather than falsiness: a declaration the author wrote and got wrong is a
    // different V37 finding from no declaration at all, so presence must survive canonicalization.
    const residencyRaw = s["residency"] === undefined ? null : asStr(s["residency"]).trim();
    out.set(id, {
      id,
      target: target(s["target"]),
      dimension,
      dimensionRaw: declared,
      // Derived, never authored. §8's distinction is a fact about the dimension, so letting an
      // author choose it per quantity would let them opt out of the aggregation it licenses.
      scope: dimension === null ? null : DIMENSIONS[dimension].scope,
      value: quantityValue(s, dimension),
      residencyRaw,
      residency: (RESIDENCIES as readonly string[]).includes(residencyRaw ?? "")
        ? (residencyRaw as Residency)
        : null,
      when: s["when"] === undefined ? null : quantityWhen(s["when"]),
      annotation: annotation(s),
    });
  }
  return out;
}

/**
 * The quantitative models the declared annotations constitute — one per dimension present.
 *
 * Derived, not authored, and in the same register as `instances` below: a projection of what was
 * declared, computed once so that every consumer reads one grouping instead of re-deriving it.
 * `CanonQuantitativeModel` carries the reasoning; the mechanics are three facts per dimension.
 *
 * On a second `model:`-targeted quantity of the same dimension: the first by sorted id wins, which
 * is deterministic because `quantities` is built from `sortedEntries`. Two declared totals for one
 * dimension is an authoring error — picking a winner here is not a ruling on it, it is refusing to
 * let an ambiguity decide the grouping silently. The validator is what should complain.
 */
function quantitativeModels(qs: ReadonlyMap<string, CanonQuantity>): Map<Dimension, CanonQuantitativeModel> {
  const out = new Map<Dimension, CanonQuantitativeModel>();
  const accountable = new Set<TargetKind>(ACCOUNTABLE_TARGET_KINDS);
  for (const q of qs.values()) {
    const d = q.dimension;
    // A quantity whose dimension did not resolve belongs to no model; V28 is the finding, and
    // guessing a dimension here would put it in one.
    if (d === null) continue;
    const isBudget = q.target.kind === AGGREGATE_TARGET_KIND;
    if (!isBudget && !accountable.has(q.target.kind as TargetKind)) continue;
    const existing = out.get(d);
    if (existing === undefined) {
      out.set(d, {
        dimension: d,
        scope: DIMENSIONS[d].scope,
        budget: isBudget ? q.id : null,
        host: isBudget ? q.target.ref : null,
        allocations: isBudget ? [] : [q.id],
      });
      continue;
    }
    out.set(d, {
      ...existing,
      ...(isBudget && existing.budget === null ? { budget: q.id, host: q.target.ref } : {}),
      allocations: isBudget ? existing.allocations : [...existing.allocations, q.id],
    });
  }
  return out;
}

/**
 * The declared accounting model. Shape only: V35 says whether the metric and the basis are known.
 *
 * The metric name is kept as written even when it names nothing, because the finding quotes it —
 * `accounting: { memory: … }` is a plausible mistake and the message has to be able to say that
 * memory accounting is residency rather than a basis.
 */
function accounting(raw: unknown): Map<string, CanonAccounting> {
  const out = new Map<string, CanonAccounting>();
  for (const [metric, spec] of sortedEntries(raw)) {
    const s = isObj(spec) ? spec : {};
    const basisRaw = asStr(s["basis"]).trim();
    out.set(metric, {
      metric,
      dimension: (ACCOUNTED_METRIC_IDS as readonly string[]).includes(metric)
        ? ACCOUNTED_METRICS[metric as AccountedMetric]
        : null,
      basisRaw,
      basis: (ACCOUNTING_BASES as readonly string[]).includes(basisRaw) ? (basisRaw as AccountingBasis) : null,
    });
  }
  return out;
}

// --------------------------------------------------------------------------------------------

export function canonicalize(doc: unknown): CanonicalSystem {
  const d = isObj(doc) ? doc : {};
  const qs = quantities(d["quantities"]);
  const sys = isObj(d["system"]) ? d["system"] : {};
  const dom = domains(d["domains"]);
  const { models: ms, relations } = models(d["models"]);
  const mach = machines(d["machines"], dom);

  const events = new Map<string, CanonEvent>();
  for (const [id, spec] of sortedEntries(d["events"])) {
    const s = isObj(spec) ? spec : {};
    events.set(id, { id, participants: strArr(s["participants"]) });
  }

  const queries = new Map<string, SavedQuery>();
  for (const [id, raw] of sortedEntries(d["queries"])) queries.set(id, { id, raw });

  // The map KEY is the identity, so it is hoisted into the mapping the engine reads. Written last
  // in the spread, so the key WINS over an authored `id:` inside the value — which the schema
  // refuses anyway (`additionalProperties: false`, and no `id` property), making the override the
  // repair for a document that reached here some other way rather than a silent preference.
  //
  // A non-object value is passed through untouched. It is not a requirement, and the engine has the
  // sentence for that ("a requirement is a mapping of id, statement, expressed_as and
  // satisfied_when"); defaulting it into an object here would manufacture an obligation the author
  // did not write.
  const requirements = new Map<string, SavedRequirement>();
  for (const [id, raw] of sortedEntries(d["requirements"])) {
    requirements.set(id, { id, raw: isObj(raw) ? { ...raw, id } : raw });
  }

  return {
    systemId: asStr(sys["id"], "unnamed"),
    name: asStr(sys["name"], asStr(sys["id"], "unnamed")),
    domains: dom,
    entities: entities(d["entities"]),
    relationTypes: relationTypes(d["relation-types"]),
    // Sorted so the hash does not move when an author reorders relations within a model.
    // Keyed with JSON.stringify rather than a NUL-separated template literal. NUL is a
    // tempting separator because it cannot occur in the data -- but it makes the file
    // binary to tooling, and git's own heuristic only inspects the first 8 KB, so a NUL
    // past that offset (this one was at 11001) is invisible to every gate we have.
    relations: relations.sort((a, b) =>
      JSON.stringify([a.type, a.from, a.to, a.model])
        .localeCompare(JSON.stringify([b.type, b.from, b.to, b.model]))),
    models: ms,
    machines: mach,
    instances: expand(mach),
    events,
    quantities: qs,
    quantitativeModels: quantitativeModels(qs),
    accounting: accounting(d["accounting"]),
    queries,
    requirements,
  };
}

/** The literal parser, for a caller that must check a magnitude before writing it. One parser. */
export const parseMagnitude = magnitude;
