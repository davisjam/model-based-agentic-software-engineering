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
  CanonDomain, CanonEntity, CanonEvent, CanonMachine, CanonModel, CanonRelation,
  CanonRelationType, CanonTransition, CanonVariable, CanonicalSystem, Effect, Guard, GuardOp,
  MachineInstance, PropertyValue, Purpose, SavedQuery, Scalar,
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
    });
    for (const r of asArr(s["relations"])) {
      if (!isObj(r)) continue;
      relations.push({
        id: typeof r["id"] === "string" ? r["id"] : null,
        model: id,
        from: asStr(r["from"]),
        to: asStr(r["to"]),
        type: asStr(r["type"]),
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

export function canonicalize(doc: unknown): CanonicalSystem {
  const d = isObj(doc) ? doc : {};
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

  return {
    systemId: asStr(sys["id"], "unnamed"),
    name: asStr(sys["name"], asStr(sys["id"], "unnamed")),
    domains: dom,
    entities: entities(d["entities"]),
    relationTypes: relationTypes(d["relation-types"]),
    // Sorted so the hash does not move when an author reorders relations within a model.
    relations: relations.sort((a, b) =>
      `${a.type} ${a.from} ${a.to} ${a.model}`.localeCompare(
        `${b.type} ${b.from} ${b.to} ${b.model}`)),
    models: ms,
    machines: mach,
    instances: expand(mach),
    events,
    queries,
  };
}
