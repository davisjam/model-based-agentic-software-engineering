/**
 * The numbered semantic rules of ../../SEMANTICS.md, plus the un-numbered ANNOTATION pass.
 *
 * Kernel component: depends only on the IR. Every finding carries its rule id, so the spec, this
 * module, `workbench/validate.py`, and the error a user reads all cite the same identifier. That
 * shared vocabulary is what makes the Python/TypeScript parity test meaningful — two independent
 * implementations of one specification, with drift detectable rather than discovered later.
 *
 * Deliberately NOT here: JSON Schema shape checking. The schema owns shape; this owns meaning —
 * reference resolution, graph acyclicity, participant symmetry, and loader hazards.
 */
import type {
  AccountedMetric, Annotated, CanonMachine, CanonQuantity, CanonicalSystem, Dimension, ExprOperand,
  Finding, GuardOp, Magnitude, Scalar, TargetKind,
} from "../ir/types.ts";
import {
  ACCOUNTABLE_TARGET_KINDS, ACCOUNTED_METRICS, ACCOUNTED_METRIC_IDS, ACCOUNTING_BASES,
  AGGREGATE_TARGET_KIND, BASIS_TARGET_KINDS, DIMENSIONS, DIMENSION_IDS, EXECUTES_IN_STATE,
  METRIC_NAMES, METRIC_NAMESPACE, RESIDENCIES, TARGET_KINDS,
} from "../ir/types.ts";

/**
 * YAML 1.1 implicit-types these bare scalars. A key or id among them was read as a boolean or null
 * and the loaded model differs from the written one (V25).
 *
 * Note the asymmetry with Python: a JS object cannot hold a boolean key, so a YAML loader hands us
 * the STRING "true" where PyYAML hands Python the bool `True`. Both are refused, and a deliberately
 * quoted `"off"` is refused too — because the next hand-edit will drop the quotes.
 */
const YAML_COERCED: ReadonlySet<string> = new Set([
  "y", "n", "yes", "no", "true", "false", "on", "off", "null", "~",
  "Y", "N", "Yes", "No", "True", "False", "On", "Off", "Null", "NULL", "TRUE", "FALSE",
  "YES", "NO", "ON", "OFF",
]);

const looksNumeric = (s: string): boolean => s.trim() !== "" && Number.isFinite(Number(s));

class Collector {
  readonly findings: Finding[] = [];
  add(rule: string, where: string, message: string): void {
    this.findings.push({ rule, where, message });
  }
}

/**
 * V25 — ids a YAML loader would coerce.
 *
 * Runs FIRST and alone: a coerced id means the loaded model is not the written one, so every
 * downstream finding is suspect. It is also the message that matters — a bare schema complaint
 * ("'true' does not match pattern") is exactly what V25 exists to replace.
 */
export function checkCoercion(s: CanonicalSystem): readonly Finding[] {
  const c = new Collector();
  const sweep = (scope: string, ids: Iterable<string>): void => {
    for (const id of ids) {
      if (YAML_COERCED.has(id)) {
        c.add("V25", `${scope}.${id}`,
          `id '${id}' is in YAML's implicit-boolean/null set; a loader reads it as a boolean or null. ` +
          `Rename it — the workbench refuses to load a different model than you wrote.`);
      } else if (looksNumeric(id)) {
        c.add("V25", `${scope}.${id}`, `id '${id}' parses as a number; rename it or quote it everywhere.`);
      }
    }
  };
  sweep("entities", s.entities.keys());
  sweep("machines", s.machines.keys());
  sweep("events", s.events.keys());
  sweep("models", s.models.keys());
  sweep("relation-types", s.relationTypes.keys());
  sweep("domains", s.domains.keys());
  for (const m of s.machines.values()) {
    for (const st of m.states) {
      if (YAML_COERCED.has(st)) {
        c.add("V25", `machines.${m.id}.states`,
          `state id '${st}' would be coerced by a YAML loader; rename it. A machine with states ` +
          `'on' and 'off' is the canonical example and the canonical casualty.`);
      }
    }
  }
  return c.findings;
}

/**
 * `<`, `>`, `<=`, `>=`. Spelled out here rather than imported: the component model draws no edge
 * from the validator to the query engine, which owns the identical set. A four-element closed set is
 * the cheapest thing to duplicate across that boundary. The real fix is to lift reference resolution
 * down into the IR, where both components may reach it, and that is a refactor rather than a rule.
 */
const ORDER_OPS: ReadonlySet<GuardOp> = new Set<GuardOp>(["lt", "le", "gt", "ge"]);

interface GuardDomain {
  readonly values: readonly Scalar[];
  /** True only for a bounded integer, which is what makes an order comparison meaningful. */
  readonly ordered: boolean;
  /** How the message names the thing: "variable 'document.retry_count'". */
  readonly subject: string;
}

/**
 * The values a guard reference can take, for V26's membership test — or null, meaning V26 declines.
 *
 * Null covers every case that is somebody else's finding: a head that is not a declared machine, a
 * member the machine does not declare, a multiply-instantiated machine (V11), and a variable with no
 * finite domain (V15/V17). The engine refuses all of them when it compiles the guard, with the cause
 * named. V26 reports domain membership, so it reports nothing when the reference itself is the bug.
 */
function guardDomain(s: CanonicalSystem, ref: string): GuardDomain | null {
  const single = (id: string): CanonMachine | null => {
    const m = s.machines.get(id);
    return m !== undefined && m.instances === 1 ? m : null;
  };
  const control = (m: CanonMachine): GuardDomain | null =>
    // A machine with no declared states has an empty domain, and nothing is a member of nothing.
    // The machine is already malformed; saying so again under V26 would be noise.
    m.states.length === 0 ? null : { values: m.states, ordered: false, subject: `control state of '${m.id}'` };
  const member = (m: CanonMachine, name: string): GuardDomain | null => {
    if (name === "state") return control(m);
    const v = m.variables.get(name);
    if (v !== undefined) {
      if (v.domain.length === 0) return null;
      return { values: v.domain, ordered: v.kind === "integer", subject: `variable '${m.id}.${name}'` };
    }
    if (m.derived.has(name)) {
      return { values: [false, true], ordered: false, subject: `derived value '${m.id}.${name}'` };
    }
    return null;
  };

  // Dotted form first, split at the LAST dot: ids may contain dots, member names may not. A head
  // that names no machine falls through, because the whole string may be a bare variable name.
  const dot = ref.lastIndexOf(".");
  if (dot > 0 && dot < ref.length - 1) {
    const head = ref.slice(0, dot);
    if (s.machines.has(head)) {
      const m = single(head);
      return m === null ? null : member(m, ref.slice(dot + 1));
    }
  }
  const asMachine = single(ref);
  if (asMachine !== null) return control(asMachine);
  if (s.machines.has(ref)) return null;
  const owners = [...s.machines.values()].filter((m) => m.variables.has(ref) || m.derived.has(ref));
  const only = owners.length === 1 ? owners[0] : undefined;
  return only === undefined ? null : member(only, ref);
}

const listed = (values: readonly Scalar[]): string => values.map((v) => String(v)).join(", ");

/** V1–V24 and V26–V31 — meaning, once the loaded model is known to be the written one. */
export function checkMeaning(s: CanonicalSystem): readonly Finding[] {
  const c = new Collector();

  // V3 — models reference system-level entities; they never redeclare them.
  for (const m of s.models.values()) {
    for (const id of m.entities) {
      if (!s.entities.has(id)) c.add("V3", `models.${m.id}.entities`, `'${id}' is not a declared system entity.`);
    }
  }
  for (const r of s.relations) {
    for (const [side, id] of [["from", r.from], ["to", r.to]] as const) {
      if (!s.entities.has(id)) c.add("V3", `models.${r.model}.relations`, `${side}: '${id}' is not a declared entity.`);
    }
    if (!s.relationTypes.has(r.type)) {
      c.add("V3", `models.${r.model}.relations`, `type: '${r.type}' is not a declared relation-type.`);
    }
  }

  // V4 / V5 — containment acyclic and single-parent.
  //
  // V5 is reported at the CLAIMING entity, once per extra claimer, rather than once at the child.
  // A child claimed three times then yields two findings -- one per site that must be edited --
  // which is the convention validate.py already used. The parity test found the divergence.
  const firstParent = new Map<string, string>();
  for (const e of s.entities.values()) {
    for (const child of e.contains) {
      if (!s.entities.has(child)) c.add("V3", `entities.${e.id}.contains`, `'${child}' is not a declared entity.`);
      const held = firstParent.get(child);
      if (held === undefined) firstParent.set(child, e.id);
      else {
        c.add("V5", `entities.${e.id}.contains`,
          `'${child}' already contained by '${held}' — containment is single-parent.`);
      }
    }
  }
  for (const start of s.entities.keys()) {
    const seen = new Set<string>();
    let cur: string | null = start;
    while (cur !== null) {
      const next: string | null = s.entities.get(cur)?.parent ?? null;
      if (next === start || (next !== null && seen.has(next))) {
        c.add("V4", `entities.${start}`, "containment cycle.");
        break;
      }
      if (next !== null) seen.add(next);
      cur = next;
    }
  }

  // V8 — a relation type declaring acyclic must not contain a cycle.
  for (const rt of s.relationTypes.values()) {
    if (!rt.acyclic) continue;
    const adj = new Map<string, string[]>();
    for (const r of s.relations) {
      if (r.type === rt.id) (adj.get(r.from) ?? adj.set(r.from, []).get(r.from)!).push(r.to);
    }
    const state = new Map<string, 1 | 2>();
    const walk = (node: string): string[] | null => {
      if (state.get(node) === 1) return [node];
      if (state.get(node) === 2) return null;
      state.set(node, 1);
      for (const peer of adj.get(node) ?? []) {
        const cyc = walk(peer);
        if (cyc) return [node, ...cyc];
      }
      state.set(node, 2);
      return null;
    };
    for (const node of adj.keys()) {
      const cyc = walk(node);
      if (cyc) {
        c.add("V8", `relation-types.${rt.id}`,
          `declares acyclic but a cycle exists: ${cyc.join(" -> ")}.`);
        break;
      }
    }
  }

  // V6 / V9 / V10 / V1 — machine-level reference resolution.
  const multi = new Set([...s.machines.values()].filter((m) => m.instances > 1).map((m) => m.id));
  for (const m of s.machines.values()) {
    const states = new Set(m.states);
    if (m.entity !== null && !s.entities.has(m.entity)) {
      c.add("V6", `machines.${m.id}.entity`, `'${m.entity}' is not a declared entity.`);
    }
    if (!states.has(m.initial)) {
      c.add("V9", `machines.${m.id}.initial`, `'${m.initial}' is not a declared state of this machine.`);
    }
    for (const t of m.transitions) {
      for (const [side, st] of [["from", t.from], ["to", t.to]] as const) {
        if (!states.has(st)) {
          c.add("V10", `machines.${m.id}.transitions[${t.index}]`, `${side}: '${st}' is not a declared state.`);
        }
      }
      if (t.sync !== null) {
        const ev = s.events.get(t.sync);
        if (ev === undefined) {
          c.add("V1", `machines.${m.id}.transitions[${t.index}].sync`, `'${t.sync}' is not a declared event.`);
        } else if (!ev.participants.includes(m.id)) {
          c.add("V12", `machines.${m.id}.transitions[${t.index}].sync`,
            `machine is not listed among '${t.sync}' participants.`);
        }
      }
      // V11 — a guard may not reference a multiply-instantiated machine: there is no participant
      // selection in v0.1, so `worker.state` is ambiguous once there are several workers.
      for (const g of t.guards) {
        const head = g.ref.split(".")[0] ?? "";
        if (multi.has(head)) {
          c.add("V11", `machines.${m.id}.transitions[${t.index}].requires`,
            `guard references multiply-instantiated machine '${head}'; there is no participant selection in v0.1.`);
        }
      }
      // V26 — the guard's value must be something its reference can actually hold. A guard against
      // an impossible value is dead: the transition never fires, so the reachable set is smaller
      // than the author believes and every query over it is sound about a different system.
      for (const g of t.guards) {
        const dom = guardDomain(s, g.ref);
        if (dom === null) continue;
        const where = `machines.${m.id}.transitions[${t.index}].requires`;
        if (ORDER_OPS.has(g.op)) {
          // An order comparison on an unordered reference is a typing question, not a membership
          // one; the engine refuses it with V20's message and V26 stays out of it.
          if (!dom.ordered) continue;
          const nums = dom.values.filter((v): v is number => typeof v === "number");
          if (nums.length === 0) continue;
          const lo = Math.min(...nums);
          const hi = Math.max(...nums);
          if (typeof g.value !== "number" || g.value < lo || g.value > hi) {
            c.add("V26", where,
              `guard '${g.ref} ${g.op} ${String(g.value)}' compares against a value outside the ` +
              `range of ${dom.subject} (${lo}..${hi}), so it is decided before the model runs.`);
          }
        } else if (!dom.values.includes(g.value)) {
          c.add("V26", where,
            `guard '${g.ref} ${g.op} ${String(g.value)}': '${String(g.value)}' is not in the domain ` +
            `of ${dom.subject}. Declared: ${listed(dom.values)}.`);
        }
      }
      // V13 — two transitions joined by one event must not assign the same variable. Checked from
      // declared effects, so an arbitrary runtime winner is impossible rather than unlikely.
      if (t.sync !== null) {
        for (const other of s.machines.values()) {
          if (other.id === m.id) continue;
          for (const ot of other.transitions) {
            if (ot.sync !== t.sync) continue;
            for (const e of t.effects) {
              if (ot.effects.some((oe) => oe.variable === e.variable)) {
                c.add("V13", `events.${t.sync}`,
                  `'${m.id}' and '${other.id}' both assign '${e.variable}' in one atomic step.`);
              }
            }
          }
        }
      }
    }
    // V17 / V15 — finite domains; `ref` is reserved, not implemented.
    for (const v of m.variables.values()) {
      if (v.domain.length === 0) {
        c.add("V17", `machines.${m.id}.variables.${v.id}`,
          "no finite domain: an integer needs a range, an enum needs values, or name a declared domain.");
      }
    }
    // V19 — the derived dependency graph must be acyclic.
    const names = new Set(m.derived.keys());
    const deps = new Map<string, Set<string>>();
    for (const [name, expr] of m.derived) {
      deps.set(name, new Set(expr.split(/[^A-Za-z0-9_.]+/).filter((tok) => names.has(tok) && tok !== name)));
      if (expr.split(/[^A-Za-z0-9_.]+/).includes(name)) {
        c.add("V19", `machines.${m.id}.derived.${name}`, "derived value references itself.");
      }
    }
    for (const start of names) {
      const seen = new Set<string>();
      const stack = [...(deps.get(start) ?? [])];
      while (stack.length) {
        const cur = stack.pop() as string;
        if (cur === start) {
          c.add("V19", `machines.${m.id}.derived.${start}`, "derived value participates in a cycle.");
          break;
        }
        if (seen.has(cur)) continue;
        seen.add(cur);
        stack.push(...(deps.get(cur) ?? []));
      }
    }
  }

  // V12 / V14 — participants must participate; multiplicity is unsupported in synchronization.
  for (const ev of s.events.values()) {
    for (const part of ev.participants) {
      const m = s.machines.get(part);
      if (m === undefined) {
        c.add("V12", `events.${ev.id}.participants`, `'${part}' is not a declared machine.`);
        continue;
      }
      if (m.instances > 1) {
        c.add("V14", `events.${ev.id}.participants`,
          `'${ev.id}' synchronizes with multiply-instantiated machine '${part}'. Participant selection ` +
          `is not supported by this version. Model the participants explicitly, or use a single instance.`);
      }
      if (!m.transitions.some((t) => t.sync === ev.id)) {
        c.add("V12", `events.${ev.id}.participants`,
          `'${part}' never declares a transition with sync: ${ev.id} — a participant that never participates.`);
      }
    }
  }

  // V24 — omits is CHECKED against the model's real vocabulary. Without this the feature decays
  // into prose that rots, and the workbench confidently tells a student it cannot answer something
  // it can.
  for (const m of s.models.values()) {
    const vocab = new Set<string>();
    for (const r of s.relations) if (r.model === m.id) vocab.add(r.type);
    for (const id of m.entities) {
      for (const prop of s.entities.get(id)?.properties.keys() ?? []) vocab.add(prop);
    }
    for (const omitted of m.purpose.omits) {
      if (vocab.has(omitted)) {
        c.add("V24", `models.${m.id}.purpose.omits`,
          `'${omitted}' is declared omitted but appears in this model — the declaration would lie to a reader.`);
      }
    }
  }

  // Quantities last, and through the same entry point so every caller of checkMeaning gets them.
  // The pass stays separately exported because it has its own subject and its own tests.
  c.findings.push(...checkQuantities(s));

  return c.findings;
}

// ---------------------------------------------------------------------------------------------
// V27–V31, V35–V37 — quantities.
//
// Eight subjects, one each: the references resolve (V27), the dimension and the literals are
// readable (V28), the magnitudes are in bounds (V29), the dimensions agree (V30), the reserved
// `metrics` namespace is not shadowed (V31), the accounting basis is declared (V35), each quantity
// contributes through that basis (V36), and a configuration-scoped quantity declares when it is
// charged (V37).
// ---------------------------------------------------------------------------------------------

const listUnits = (d: Dimension): string => Object.keys(DIMENSIONS[d].units).join(", ");

/**
 * Where a state reference points, or the reason it points nowhere.
 *
 * ONE resolver for both of a quantity's state references — its `target: state:…` and its
 * `when: { state: … }`. They are the same question and the ruling says so ("`when.state` resolves to
 * a real state, like every other reference"), so a second resolver would be two rules drifting
 * apart: the bare-name ambiguity refusal would be fixed in one and not the other.
 *
 * `subject` prefixes the message and `qualifyPrefix` spells the fix for the caller's own syntax,
 * which is the only thing the two sites do differently.
 */
function stateFault(s: CanonicalSystem, subject: string, ref: string, qualifyPrefix: string): string | null {
  const dot = ref.lastIndexOf(".");
  if (dot > 0 && dot < ref.length - 1) {
    const machine = s.machines.get(ref.slice(0, dot));
    if (machine === undefined) return `${subject}: '${ref.slice(0, dot)}' is not a declared machine.`;
    return machine.states.includes(ref.slice(dot + 1)) ? null
      : `${subject}: '${machine.id}' declares no state '${ref.slice(dot + 1)}'.`;
  }
  // A bare state name resolves only when it is unambiguous, which is how src/engine/refs.ts
  // treats a bare variable: refuse the ambiguity rather than pick a machine.
  const owners = [...s.machines.values()].filter((m) => m.states.includes(ref));
  if (owners.length === 1) return null;
  return owners.length === 0
    ? `${subject}: no machine declares a state '${ref}'.`
    : `${subject}: ${owners.length} machines declare a state '${ref}'. Qualify it as ` +
      `${qualifyPrefix}<machine>.${ref}.`;
}

/** Where a quantity's `target` points, or the reason it points nowhere. */
function targetFault(s: CanonicalSystem, q: CanonQuantity): string | null {
  const { kind, ref, raw } = q.target;
  if (kind === null) {
    return `target '${raw}' names no kind. Write one of ${TARGET_KINDS.map((k) => `${k}:`).join(" ")}.`;
  }
  if (ref === "") return `target '${raw}' names a kind but no object.`;
  switch (kind) {
    case "entity":
      return s.entities.has(ref) ? null : `target '${raw}': '${ref}' is not a declared entity.`;
    case "model":
      return s.models.has(ref) ? null : `target '${raw}': '${ref}' is not a declared model.`;
    case "relation":
      // By id, never by endpoints. §9 requires a STABLE semantic id, and `a->b` is not one: adding a
      // second edge between the same pair silently makes the annotation ambiguous.
      return s.relations.some((r) => r.id === ref) ? null
        : `target '${raw}': no relation declares id '${ref}'. A quantity addresses a relation ` +
          `through its own 'id:', which an unidentified relation does not have.`;
    case "state":
      return stateFault(s, `target '${raw}'`, ref, "state:");
    case "transition": {
      // Transitions carry no id, and `label:` carries no semantics (V1) — addressing one by label
      // would make a documentation string load-bearing and break on a duplicate. The stable address
      // is machine plus index, which is already how a transaction deletes one.
      const hash = ref.lastIndexOf("#");
      if (hash <= 0 || hash === ref.length - 1) {
        return `target '${raw}': address a transition as transition:<machine>#<index>. A transition ` +
          `has no id, and 'label:' carries no semantics (V1), so an index is the only stable handle.`;
      }
      const machine = s.machines.get(ref.slice(0, hash));
      if (machine === undefined) return `target '${raw}': '${ref.slice(0, hash)}' is not a declared machine.`;
      const text = ref.slice(hash + 1);
      const index = Number(text);
      if (!/^(?:0|[1-9][0-9]*)$/.test(text) || index >= machine.transitions.length) {
        return `target '${raw}': '${machine.id}' declares ${machine.transitions.length} transition(s), ` +
          `so index '${text}' addresses none.`;
      }
      return null;
    }
    case "parameter":
      return `target '${raw}': 'parameter:' is a reserved future shape. v0.1 represents no parameters, ` +
        `so no parameter target can resolve — annotate the transition or entity instead.`;
  }
}

/** V28's account of a literal that did not reach base units. Null when the fault is V30's. */
function faultMessage(m: Magnitude, dimension: Dimension, part: string): string | null {
  switch (m.fault) {
    case null:
      return null;
    case "unit-foreign":
      return null;
    case "absent":
      return `${part} has no value. Declare 'value:' or 'range:'.`;
    case "dimension-unknown":
      return null;
    case "spelling":
      return `${part} '${m.raw}' is not a plain decimal with an optional unit. Loaders disagree on ` +
        `every other spelling — PyYAML reads '017' as 15 and '1:30' as 90 where the 'yaml' package ` +
        `reads 17 and '1:30' — so the workbench accepts only digits with at most one decimal point.`;
    case "unit-missing":
      return `${part} '${m.raw}' is a bare number, and ${dimension} is measured in ${listUnits(dimension)}. ` +
        `Write '${m.raw} ${DIMENSIONS[dimension].base}' if that is what you meant: a silently assumed ` +
        `unit is the dimension error this feature exists to prevent.`;
    case "unit-forbidden":
      return `${part} '${m.raw}' carries a unit, but ${dimension} is dimensionless. Write the number alone.`;
    case "unit-unknown":
      return `${part} '${m.raw}': '${String(m.unit)}' is not a unit this workbench knows. ` +
        `${dimension} accepts ${listUnits(dimension)}.`;
  }
}

/** V30's account of the same literal: the unit is real, and it measures something else. */
function foreignMessage(m: Magnitude, dimension: Dimension, part: string): string | null {
  if (m.fault !== "unit-foreign") return null;
  const owner = [...DIMENSION_IDS].find((d) => DIMENSIONS[d].units[String(m.unit)] !== undefined);
  return `${part} '${m.raw}' is measured in ${String(owner)}, but this quantity declares ${dimension}. ` +
    `§7 forbids silently coercing one dimension into another.`;
}

/**
 * What arithmetic sees. `ratio` and `count` both collapse to dimensionless, which is ordinary
 * dimensional analysis — a proportion and a tally are both pure numbers.
 *
 * Collapsing them is what lets `metrics.state_count * 2 ms` be a duration (§10's own example) and
 * `entity_count / state_count` be a ratio, without `ms * ms` or `250 ms + 128 MB` becoming legal.
 * `ratio`'s [0, 1] ceiling is unaffected: V29 enforces it on the literal, where it belongs.
 */
type DimensionClass = "duration" | "memory" | "cost" | "dimensionless";

const classOf = (d: Dimension | null): DimensionClass =>
  d === null || d === "ratio" || d === "count" ? "dimensionless" : d;

// ---------------------------------------------------------------------------------------------
// V35–V37 — the declared accounting model.
//
// One principle runs through all three: a quantitative annotation that cannot participate
// unambiguously in the accounting semantics of its metric is INVALID, rather than silently inert.
// If MAGE accepts a quantity as meaningful there must be a defined route from it to the analyses its
// dimension is intended for; otherwise the type system claims more than the semantics provide.
//
// Nothing here evaluates anything. Participation is a property of a quantity's DECLARATION — its
// dimension, its target kind, its residency — so these rules read declared data and never sum a
// trace, which is what keeps them in the validator and out of the analysis layer.
// ---------------------------------------------------------------------------------------------

const listBases = (): string => ACCOUNTING_BASES.join(", ");

const listKinds = (kinds: readonly TargetKind[]): string => kinds.map((k) => `${k}:`).join(", ");

/** The metric that accounts for a dimension, or null when the dimension is not path-aggregated. */
const metricFor = (d: Dimension): AccountedMetric | null =>
  ACCOUNTED_METRIC_IDS.find((m) => ACCOUNTED_METRICS[m] === d) ?? null;

/**
 * True when an accounting rule has an opinion about this quantity's target.
 *
 * False for `model:` (an aggregate, not an occurrence) and for every kind that does not resolve at
 * all, where V27 has already named the real defect and a second finding about accounting would send
 * the author to the wrong line.
 */
const isAccountableTarget = (q: CanonQuantity): boolean =>
  q.target.kind !== null && ACCOUNTABLE_TARGET_KINDS.includes(q.target.kind);

/**
 * V35 — each path-aggregated metric with annotations declares exactly one accounting basis.
 *
 * The requirement is triggered by the PRESENCE of a quantity the basis would charge, not declared
 * unconditionally: a system with no duration annotation has nothing that could over-claim, and a
 * mandatory declaration about nothing is noise rather than a control.
 */
function checkAccounting(c: Collector, s: CanonicalSystem): void {
  for (const a of s.accounting.values()) {
    const where = `accounting.${a.metric}`;
    if (a.dimension === null) {
      const isDimension = (DIMENSION_IDS as readonly string[]).includes(a.metric);
      c.add("V35", where,
        `'${a.metric}' is not a path-aggregated metric. Declared: ${ACCOUNTED_METRIC_IDS.join(", ")}.` +
        (isDimension
          ? ` '${a.metric}' names a DIMENSION, and a metric is not a dimension — only the ` +
            `execution-scoped dimensions are summed along a path. A ${a.metric} quantity declares ` +
            `where it is charged with 'residency:' or 'when:' instead (V37).`
          : ""));
      continue;
    }
    if (a.basis === null) {
      c.add("V35", where,
        `basis '${a.basisRaw}' is not one of ${listBases()}. The vocabulary is closed at one member ` +
        `for v0.1, so adding transition or relation accounting later is a deliberate act rather than ` +
        `a permissive union that cannot be narrowed again.`);
    }
  }

  for (const metric of ACCOUNTED_METRIC_IDS) {
    if (s.accounting.has(metric)) continue;
    const dimension = ACCOUNTED_METRICS[metric];
    const subjects = [...s.quantities.values()]
      .filter((q) => q.dimension === dimension && isAccountableTarget(q));
    if (subjects.length === 0) continue;
    const one = subjects.length === 1;
    c.add("V35", "accounting",
      `${subjects.length} ${dimension} quantit${one ? "y" : "ies"} ` +
      `(${subjects.map((q) => q.id).sort().join(", ")}) ${one ? "is" : "are"} annotated, but no ` +
      `accounting basis is declared for '${metric}'. Write ` +
      `'accounting: { ${metric}: { basis: entities } }'. Until it is declared those quantities reach ` +
      `no analysis, and a quantity that validates and then reaches nothing is the type system ` +
      `claiming more than the semantics provide.`);
  }
}

/**
 * V36 — a quantity contributes to its metric only through the declared basis.
 *
 * Why this is not merely tidier: summing every kind indiscriminately "makes the meaning of a model
 * depend on whether the author happened to represent the same operation in multiple linked models.
 * Shared identity should let us connect purposeful models, not cause their annotations to be
 * accumulated." A retry is charged twice because the behavioral trace visits the operation twice,
 * never because a state duration and a transition duration and a relation duration were added up.
 */
function checkParticipation(c: Collector, s: CanonicalSystem, q: CanonQuantity, dimension: Dimension,
  where: string): void {
  const metric = metricFor(dimension);
  if (metric === null || !isAccountableTarget(q)) return;
  const declared = s.accounting.get(metric);
  // V35 already said the declaration is missing or unreadable; a participation complaint on top of
  // it would describe a basis nobody chose.
  if (declared === undefined || declared.basis === null) return;
  const charged = BASIS_TARGET_KINDS[declared.basis];
  if (charged.includes(q.target.kind as TargetKind)) return;
  c.add("V36", where,
    `target '${q.target.raw}' is a ${q.target.kind}, and '${metric}' declares basis ` +
    `'${declared.basis}', which charges only ${listKinds(charged)} targets. An execution's ${metric} ` +
    `is the sum over each occurrence of an accounted entity along it, so this annotation contributes ` +
    `to nothing — move it to the entity whose occurrence it costs, or declare a basis that accounts ` +
    `for ${q.target.kind} targets.`);
}

/**
 * V37 — a configuration-scoped quantity declares exactly one of `residency:` or `when:`.
 *
 * `memory(c)` is the sum of resident quantities plus the sum of those whose behavioral thing is
 * active in `c`. Both summands are keyed on a declaration, and the ruling refused to supply a
 * default for either: "I would not say 'idle service memory stays resident' or 'idle service memory
 * disappears.' Neither is something MAGE can infer from 'service.'" A memory quantity declaring
 * neither enters no summand, so it is invalid rather than inert.
 *
 * The last stage resolves `when.state` through the SAME resolver as a `state:` target, and reports
 * it as V27 — a reference that does not resolve is V27's subject whichever field carries it.
 */
function checkResidency(c: Collector, s: CanonicalSystem, q: CanonQuantity, dimension: Dimension,
  where: string): void {
  const scope = DIMENSIONS[dimension].scope;
  const declared = q.residencyRaw !== null;
  const when = q.when;
  const both = `Declare exactly one of 'residency: resident' or 'when: { state: <machine>.<state> }'.`;

  if (scope !== "configuration") {
    if (declared || when !== null) {
      c.add("V37", where,
        `declares residency, but ${dimension} is ${scope}-scoped. Residency says which ` +
        `configurations a quantity is charged in, which is a question only a configuration-scoped ` +
        `dimension asks — a ${dimension} is aggregated along an execution and its accounting is the ` +
        `declared basis (V35).`);
    }
    return;
  }
  if (q.target.kind === AGGREGATE_TARGET_KIND) {
    if (declared || when !== null) {
      c.add("V37", where,
        `target '${q.target.raw}' addresses a whole model, so this is a declared TOTAL rather than a ` +
        `charge on one entity. memory(c) sums over entities; a model-level total is compared against ` +
        `it, never a summand of it. Drop the residency declaration, or target the entity it charges.`);
    }
    return;
  }
  // An unresolvable target leaves the requirement itself undecidable: whether a residency is wanted
  // depends on what the quantity annotates. V27 has named that, and it is the thing to fix first.
  if (!isAccountableTarget(q)) return;

  if (declared && when !== null) {
    c.add("V37", where,
      `declares both 'residency: ${q.residencyRaw}' and a 'when:' clause. They are the two summands ` +
      `of memory(c) and a quantity enters one of them: resident means charged in every configuration ` +
      `where the entity exists, 'when' means charged exactly while the named state is active. ${both}`);
    return;
  }
  if (!declared && when === null) {
    c.add("V37", where,
      `is a ${dimension} quantity with no declared residency, so it enters neither summand of ` +
      `memory(c) and no configuration charges it. Residency is not inferred from the kind of thing ` +
      `annotated — "idle service memory stays resident" and "idle service memory disappears" are ` +
      `both guesses MAGE refuses to make. ${both}`);
    return;
  }
  if (declared && q.residency === null) {
    c.add("V37", where,
      `residency '${q.residencyRaw}' is not one of ${RESIDENCIES.join(", ")}. The vocabulary is ` +
      `closed at one member for v0.1; a quantity charged only while something is active says so ` +
      `with 'when:' instead.`);
    return;
  }
  if (when !== null && when.state === null) {
    const stray = when.unexpectedKeys.length > 0
      ? ` It carries ${when.unexpectedKeys.map((k) => `'${k}'`).join(", ")} instead.`
      : "";
    c.add("V37", where,
      `the 'when:' clause declares no 'state:', so nothing identifies the behavioral thing whose ` +
      `activation charges this quantity — and activation is never inferred.${stray} Write ` +
      `'when: { state: <machine>.<state> }'.`);
    return;
  }
  if (when !== null && when.state !== null) {
    const fault = stateFault(s, `when.state '${when.state}'`, when.state, "");
    // Reported at `.when` rather than at the quantity, so a broken target and a broken `when` are
    // two distinguishable V27 findings instead of two lines about the same place.
    if (fault !== null) c.add("V27", `${where}.when`, fault);
  }
}

/**
 * V38 — an entity's `executes_in_state` resolves to a declared state.
 *
 * This is the join entity accounting runs on: `executes_in_state` names the lifecycle state during
 * whose occupancy the entity runs, and a trace step that enters that state charges the entity. It
 * decides every latency number the evaluator reports, and it was checked only by
 * `test/examples.test.ts` — one example's own suite, over the models that ship. A property naming no
 * state in any other model got no finding and then quietly charged nothing.
 *
 * Resolution goes through `stateFault`, the resolver V27 uses for a `state:` target and for
 * `when.state`. Three reference rules, one resolver: a third copy is how the bare-name ambiguity
 * refusal would be fixed in two of them and forgotten in the third.
 *
 * Why its own number rather than V27's: V27's subject is a QUANTITY's references, and its remedy is
 * to fix the annotation. This reference is made by an ENTITY, and a reader whose `executes_in_state`
 * is wrong is not editing a quantity at all. The findings cite different lines and send the author to
 * different places, which is what a rule id is for.
 */
function checkExecutesInState(c: Collector, s: CanonicalSystem): void {
  for (const e of s.entities.values()) {
    const declared = e.properties.get(EXECUTES_IN_STATE);
    if (declared === undefined) continue;
    const where = `entities.${e.id}.properties.${EXECUTES_IN_STATE}`;
    if (typeof declared.value !== "string" || declared.value === "") {
      c.add("V38", where,
        `declares ${EXECUTES_IN_STATE} as ${JSON.stringify(declared.value)}, which names no state. ` +
        `The value is a state reference — '<machine>.<state>', or a bare state name exactly one ` +
        `machine declares.`);
      continue;
    }
    const fault = stateFault(s, `${EXECUTES_IN_STATE} '${declared.value}'`, declared.value, "");
    if (fault !== null) {
      c.add("V38", where,
        `${fault} This property is the join entity accounting charges through, so a reference that ` +
        `resolves nowhere means no execution ever visits '${e.id}' and every quantity charging it ` +
        `reaches no analysis.`);
    }
  }
}

/**
 * V27–V31 and V35–V38 for one system.
 *
 * Each quantity is checked in stages and a stage DECLINES once an earlier one spoke about the same
 * object — V26's discipline, applied inside this family. A quantity whose dimension is unreadable
 * gets no magnitude complaints, because every one of them would be a consequence; an expression with
 * an unresolvable operand gets no dimension complaint, because the operand is the bug.
 */
export function checkQuantities(s: CanonicalSystem): readonly Finding[] {
  const c = new Collector();

  // V31 — `metrics` is reserved. A user id that shadows it would make `metrics.state_count` read as
  // that object's member, so the §10 distinction between a fact FROM the model and a fact ABOUT the
  // modeled system would stop being visible on the page.
  const reserve = (scope: string, ids: Iterable<string>): void => {
    for (const id of ids) {
      if (id === METRIC_NAMESPACE) {
        c.add("V31", scope,
          `'${METRIC_NAMESPACE}' is the reserved model-metric namespace (${METRIC_NAMES.join(", ")}); ` +
          `it cannot also name a ${scope.split(".")[0] ?? scope} object. Rename it.`);
      }
    }
  };
  reserve("entities", s.entities.keys());
  reserve("machines", s.machines.keys());
  reserve("events", s.events.keys());
  reserve("models", s.models.keys());
  reserve("relation-types", s.relationTypes.keys());
  reserve("domains", s.domains.keys());
  reserve("quantities", s.quantities.keys());
  for (const m of s.machines.values()) {
    reserve(`machines.${m.id}.variables`, m.variables.keys());
    reserve(`machines.${m.id}.derived`, m.derived.keys());
    reserve(`machines.${m.id}.states`, m.states);
  }

  // V35 — the accounting declaration itself, before any quantity is read against it.
  checkAccounting(c, s);

  // V38 — the join the basis charges through, before the quantities that ride on it.
  checkExecutesInState(c, s);

  for (const q of s.quantities.values()) {
    const where = `quantities.${q.id}`;

    // V27 — no dangling annotations (§9). A quantity pointing at a deleted transition is not
    // invalid, it is WRONG, and nothing says so unless a rule does.
    const fault = targetFault(s, q);
    if (fault !== null) c.add("V27", where, fault);

    if (q.dimension === null) {
      c.add("V28", where,
        `dimension '${q.dimensionRaw}' is not one of ${DIMENSION_IDS.join(", ")}. The dimension is the ` +
        `quantity's type, so nothing else about it can be checked without one.`);
      continue;
    }
    const dimension = q.dimension;

    // V36 / V37 — can this annotation reach the analysis its dimension is for? Both read the
    // DECLARATION only, so neither needs a trace or a sum.
    checkParticipation(c, s, q, dimension, where);
    checkResidency(c, s, q, dimension, where);

    const literal = (m: Magnitude, part: string): boolean => {
      const v28 = faultMessage(m, dimension, part);
      if (v28 !== null) c.add("V28", where, v28);
      const v30 = foreignMessage(m, dimension, part);
      if (v30 !== null) c.add("V30", where, v30);
      return m.base !== null;
    };

    // V29 — the magnitude is admissible. Negatives are refused across the board: §29 ⑥ grants
    // safety to "monotone nonnegative interval expressions", and a memory of -1 MB is not a model
    // of anything. The ratio ceiling is a RULE here rather than a sentence in the dimension table.
    const bounds = (m: Magnitude, part: string): void => {
      if (m.base === null) return;
      if (m.base < 0) {
        c.add("V29", where, `${part} normalizes to ${m.base}; no v0.1 dimension admits a negative magnitude.`);
      }
      const max = DIMENSIONS[dimension].maximum;
      if (max !== null && m.base > max) {
        c.add("V29", where,
          `${part} normalizes to ${m.base}, above the maximum ${max} for ${dimension} — a ratio is a ` +
          `proportion of one, so 80% is 0.8.`);
      }
    };

    const v = q.value;
    if (v.kind === "point") {
      if (literal(v.magnitude, "value")) bounds(v.magnitude, "value");
    } else if (v.kind === "range") {
      const lowOk = literal(v.low, "range low");
      const highOk = literal(v.high, "range high");
      if (lowOk) bounds(v.low, "range low");
      if (highOk) bounds(v.high, "range high");
      if (lowOk && highOk && (v.low.base ?? 0) > (v.high.base ?? 0)) {
        c.add("V29", where,
          `range [${v.low.raw}, ${v.high.raw}] is reversed: ${v.low.base} > ${v.high.base} in ` +
          `${String(DIMENSIONS[dimension].base ?? dimension)}.`);
      }
    } else if (v.kind === "absent") {
      c.add("V28", where, "has no value. Declare 'value:' or 'range:'.");
    } else {
      checkExpression(c, s, q, dimension, where);
    }
  }
  return c.findings;
}

/** The dimension an operand contributes, for operands already known to resolve. */
function operandDimension(s: CanonicalSystem, o: ExprOperand): Dimension | null {
  switch (o.kind) {
    case "literal": return o.dimension;
    // Every model metric is a plain count of model structure.
    case "metric": return "count";
    case "quantity": return s.quantities.get(o.id)?.dimension ?? null;
    case "unreadable": return null;
  }
}

/**
 * V27/V28 then V30 over one expression.
 *
 * Nothing is evaluated. §7 makes dimensional agreement a VALIDATION question, and a dimension is a
 * property of the operands rather than of their values, so typing the expression needs no arithmetic
 * — which is also what keeps this out of the analysis layer.
 */
function checkExpression(
  c: Collector, s: CanonicalSystem, q: CanonQuantity, dimension: Dimension, where: string,
): void {
  const v = q.value;
  if (v.kind !== "expression") return;
  if (v.terms.length === 0) {
    c.add("V28", where, `expression '${v.source}' has no operands.`);
    return;
  }

  let unresolved = 0;
  for (const term of v.terms) {
    for (const f of term.factors) {
      const o = f.operand;
      if (o.kind === "unreadable") {
        unresolved += 1;
        c.add("V28", where,
          `expression operand '${o.text}' is not a magnitude, a model metric, or a declared quantity. ` +
          `Operators stand alone between spaces, parentheses are not v0.1 syntax, and an expression ` +
          `may not end with an operator.`);
      } else if (o.kind === "metric") {
        if (o.name === "") {
          unresolved += 1;
          c.add("V27", where, `'${METRIC_NAMESPACE}' names a namespace, not a value. Write ${METRIC_NAMESPACE}.${METRIC_NAMES[0]}.`);
        } else if (!(METRIC_NAMES as readonly string[]).includes(o.name)) {
          unresolved += 1;
          c.add("V27", where,
            `'${METRIC_NAMESPACE}.${o.name}' is not a model metric. Declared: ${METRIC_NAMES.join(", ")}.`);
        }
      } else if (o.kind === "quantity") {
        if (!s.quantities.has(o.id)) {
          unresolved += 1;
          c.add("V27", where, `expression references '${o.id}', which is not a declared quantity.`);
        } else if (s.quantities.get(o.id)?.dimension === null) {
          // Its own V28 already names the cause; a dimension complaint here would send the author
          // to the wrong quantity.
          unresolved += 1;
        }
      } else if (o.magnitude.fault !== null) {
        unresolved += 1;
        const v28 = faultMessage(o.magnitude, o.dimension ?? dimension, `expression operand`);
        if (v28 !== null) c.add("V28", where, v28);
      }
    }
  }
  // Every dimension below would be a guess if one operand did not resolve, and a guessed dimension
  // mismatch sends the author hunting for the wrong defect.
  if (unresolved > 0) return;

  // V30 — a product carries at most one dimension and `/` divides by a pure number. `ms` times `ms`
  // has no dimension in v0.1, so nothing downstream could name the result.
  const termClasses: DimensionClass[] = [];
  for (const term of v.terms) {
    const carried = term.factors.filter((f) => classOf(operandDimension(s, f.operand)) !== "dimensionless");
    // The divisor check runs FIRST: `10 ms / 2 ms` is two dimensioned operands too, and "you
    // divided by a duration" sends the author to the operator rather than counting operands.
    const divisor = term.factors.find(
      (f) => f.op === "/" && classOf(operandDimension(s, f.operand)) !== "dimensionless");
    if (divisor !== undefined) {
      c.add("V30", where,
        `expression '${v.source}' divides by a ${classOf(operandDimension(s, divisor.operand))} ` +
        `operand; a divisor must be dimensionless.`);
      return;
    }
    if (carried.length > 1) {
      c.add("V30", where,
        `expression '${v.source}' multiplies ${carried.length} dimensioned operands ` +
        `(${carried.map((f) => classOf(operandDimension(s, f.operand))).join(" x ")}); v0.1 has no ` +
        `compound dimensions.`);
      return;
    }
    termClasses.push(carried[0] === undefined ? "dimensionless" : classOf(operandDimension(s, carried[0].operand)));
  }

  const first = termClasses[0] ?? "dimensionless";
  const clash = termClasses.find((d) => d !== first);
  if (clash !== undefined) {
    c.add("V30", where,
      `expression '${v.source}' adds ${first} to ${clash}. §7 forbids silently coercing one dimension ` +
      `into another.`);
    return;
  }
  if (first !== classOf(dimension)) {
    c.add("V30", where,
      `expression '${v.source}' has dimension ${first}, but the quantity declares ${dimension}.`);
  }
}

/**
 * ANNOTATION — a note that lost half its text.
 *
 * A separate pass from checkMeaning, and that separation is the point rather than tidiness: A1 holds
 * that annotation does not alter semantic interpretation, so an annotation finding does not belong
 * among the rules that fix meaning. It gets a named id instead of a V-number for the same reason.
 *
 * The failure is YAML flow style terminating an unquoted value at a comma, so
 * `{ kind: comment, text: one thing, and another }` loads as `text: "one thing"` plus a stray KEY.
 * Canonicalization keeps the leftover keys precisely so this can say which text got cut; without the
 * key name the author knows a note is broken but not where to put the quotes.
 */
export function checkAnnotation(s: CanonicalSystem): readonly Finding[] {
  const c = new Collector();
  const sweep = (scope: string, a: Annotated): void => {
    for (const n of a.notes) {
      if (n.unexpectedKeys.length === 0) continue;
      c.add("ANNOTATION", `${scope}.notes.${n.id}`,
        `unexpected key(s) ${n.unexpectedKeys.map((k) => `'${k}'`).join(", ")}: the signature of an ` +
        `unquoted comma in YAML flow style, which ends the value and makes the rest a key. The text ` +
        `reads '${n.text}' and the remainder is gone. Quote it.`);
    }
  };
  for (const e of s.entities.values()) sweep(`entities.${e.id}`, e.annotation);
  for (const m of s.models.values()) sweep(`models.${m.id}`, m.annotation);
  // Keyed by relation id, falling back to its endpoints, because the IR flattens and re-sorts
  // relations across models: a positional index here would name a different edge than the file does.
  for (const r of s.relations) {
    sweep(`models.${r.model}.relations.${r.id ?? `${r.from}->${r.to}`}`, r.annotation);
  }
  return c.findings;
}

/**
 * The full pass, in the order that produces useful messages: coercion first and exclusively,
 * because past that point we cannot trust that the model we loaded is the model that was written.
 */
export function validate(s: CanonicalSystem): readonly Finding[] {
  const coercion = checkCoercion(s);
  if (coercion.length > 0) return coercion;
  return [...checkMeaning(s), ...checkAnnotation(s)];
}
