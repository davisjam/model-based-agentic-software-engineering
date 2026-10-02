/**
 * The numbered semantic rules, V1–V26 of ../../SEMANTICS.md, plus the un-numbered ANNOTATION pass.
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
  Annotated, CanonMachine, CanonicalSystem, Finding, GuardOp, Scalar,
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

/** V1–V24 and V26 — meaning, once the loaded model is known to be the written one. */
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

  return c.findings;
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
