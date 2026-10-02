/**
 * The configuration space.
 *
 * A configuration is control states per instance plus every variable's value, and NOTHING else.
 * Properties are immutable (V16) and derived values are recomputed rather than stored (V18), so
 * neither is here — which is precisely what keeps the space finite. Variable domains arrive from
 * `canonicalize` already enumerated as lists, so the explorer never has to ask whether a domain is
 * bounded; a list cannot be unbounded.
 *
 * A step is one of exactly two things (§6):
 *
 *   local  — some instance has a transition with no `sync:` whose guards hold in the pre-state;
 *            that instance moves and its effects apply.
 *   event  — some declared event has EVERY participant offering an enabled `sync:`-transition in
 *            the pre-state; all participants move and all effects apply atomically.
 *
 * The distinction that is routinely conflated, and is load-bearing here: a guard is not
 * synchronization. `requires:` lets one machine READ another's state and move alone; `sync:` makes
 * two machines move together. A guard therefore never causes the machine it reads to step, and the
 * pre-state it reads is the same pre-state the effects are computed from.
 *
 * Compilation happens once, before the walk. Every reference, operator, literal and effect
 * expression is resolved up front, so the walk is a pure function with no error channel and a typo
 * is refused before a single configuration is enumerated instead of a million states in.
 */
import { configKey } from "../ir/types.ts";
import type { CanonicalSystem, Configuration, Scalar, Step } from "../ir/types.ts";
import { applyOffset, asLiteral, parseEffectRhs } from "./expr.ts";
import { buildScope, compileAtom, compileReader, resolveRef, type RefScope } from "./refs.ts";
import { detail, fail, ok, type Res } from "./types.ts";

/**
 * Default ceiling on configurations.
 *
 * The state limit is a v0.1 concern, not a later one: finite domains do not bound the product
 * usefully — two machines, a few instances and one `[0,10]` variable already reach millions
 * (§7.1). Tripping it is a NORMAL path that reads `inconclusive`, not an edge case.
 */
export const DEFAULT_STATE_LIMIT = 100_000;

// --------------------------------------------------------------------------------------------
// Compiled system
// --------------------------------------------------------------------------------------------

interface CompiledWrite {
  readonly key: string;
  readonly variable: string;
  /** null means the computed value falls outside the declared finite domain. */
  readonly compute: (cfg: Configuration) => Scalar | null;
}

interface CompiledTransition {
  readonly instance: string;
  readonly machine: string;
  readonly index: number;
  readonly from: string;
  readonly to: string;
  readonly label: string | null;
  readonly sync: string | null;
  readonly guard: (cfg: Configuration) => boolean;
  readonly writes: readonly CompiledWrite[];
}

interface CompiledEvent {
  readonly id: string;
  readonly participants: readonly { readonly instance: string; readonly transitions: readonly CompiledTransition[] }[];
}

export interface CompiledSystem {
  readonly scope: RefScope;
  readonly initial: Configuration;
  readonly locals: readonly CompiledTransition[];
  readonly events: readonly CompiledEvent[];
}

function initialConfiguration(system: CanonicalSystem): Res<Configuration> {
  const control = new Map<string, string>();
  const values = new Map<string, Scalar>();
  for (const inst of system.instances) {
    const machine = system.machines.get(inst.machine);
    if (machine === undefined) return fail(`instance '${inst.id}' has no machine '${inst.machine}'.`);
    if (!machine.states.includes(machine.initial)) {
      return fail(
        `machine '${machine.id}' declares initial state '${machine.initial}', which is not one of ` +
        `its states (V9). The configuration space has no starting point.`);
    }
    control.set(inst.id, machine.initial);
    for (const v of machine.variables.values()) {
      if (v.domain.length === 0) {
        return fail(
          `variable '${machine.id}.${v.id}' has no finite domain (V17): an integer needs a range, ` +
          `an enum needs values. Exhaustive exploration is not defined without one.`);
      }
      if (!v.domain.includes(v.initial)) {
        return fail(
          `variable '${machine.id}.${v.id}' starts at '${String(v.initial)}', which is outside its ` +
          `declared domain (${v.domain.map(String).join(", ")}).`);
      }
      values.set(`${inst.id}.${v.id}`, v.initial);
    }
  }
  return ok({ control, values });
}

/** Resolve an effect's target variable relative to the acting instance, then to the whole system. */
function writeTarget(scope: RefScope, instance: string, name: string): Res<{ key: string; domain: readonly Scalar[]; integer: boolean }> {
  for (const candidate of [`${instance}.${name}`, name]) {
    const r = resolveRef(scope, candidate);
    if (r.ok && r.value.kind === "variable") {
      return ok({ key: r.value.key, domain: r.value.variable.domain, integer: r.value.variable.kind === "integer" });
    }
  }
  return fail(
    `'${name}' is not a variable this transition can assign. An effect assigns a variable of its ` +
    `own machine, or of a single-instance machine that declares it.`);
}

function compileWrite(scope: RefScope, instance: string, name: string, expression: string): Res<CompiledWrite> {
  const target = writeTarget(scope, instance, name);
  if (!target.ok) return target;
  const { key, domain, integer } = target.value;

  const rhs = parseEffectRhs(expression);
  if (!rhs.ok) return fail(`effect on '${name}': ${rhs.refusal}`, rhs.detail);

  const inDomain = (v: Scalar): Scalar | null => (domain.includes(v) ? v : null);

  if (rhs.value.kind === "literal") {
    const value = rhs.value.value;
    if (!domain.includes(value)) {
      return fail(
        `effect '${name}: ${expression}' assigns '${String(value)}', which is outside the declared ` +
        `domain (${domain.map(String).join(", ")}).`);
    }
    return ok({ key, variable: name, compute: () => value });
  }

  if (rhs.value.kind === "offset") {
    if (!integer) {
      return fail(`effect '${name}: ${expression}' adds to '${name}', which is not an integer variable.`);
    }
    const delta = rhs.value.delta;
    const source = compileReader(scope, rhs.value.ref.includes(".") ? rhs.value.ref : `${instance}.${rhs.value.ref}`);
    if (!source.ok) return fail(`effect '${name}: ${expression}': ${source.refusal}`);
    const read = source.value;
    return ok({
      key, variable: name,
      compute: (cfg) => {
        const next = applyOffset(read(cfg), delta);
        return next.ok ? inDomain(next.value) : null;
      },
    });
  }

  // A bare token: a reference if the system knows it, otherwise a domain literal. `held` is an
  // enum value in almost every model and a variable name in almost none, so the literal fallback
  // is the common case rather than the exotic one.
  const qualified = rhs.value.ref.includes(".") ? rhs.value.ref : `${instance}.${rhs.value.ref}`;
  const source = compileReader(scope, qualified);
  if (source.ok) {
    const read = source.value;
    return ok({ key, variable: name, compute: (cfg) => inDomain(read(cfg)) });
  }
  const literal = asLiteral(rhs.value.ref);
  if (!domain.includes(literal)) {
    return fail(
      `effect '${name}: ${expression}' is neither a reference this system can resolve nor a value ` +
      `in '${name}'s declared domain (${domain.map(String).join(", ")}). ${source.refusal}`);
  }
  return ok({ key, variable: name, compute: () => literal });
}

function compileTransitions(system: CanonicalSystem, scope: RefScope): Res<readonly CompiledTransition[]> {
  const out: CompiledTransition[] = [];
  for (const inst of system.instances) {
    const machine = system.machines.get(inst.machine);
    if (machine === undefined) continue;
    const states = new Set(machine.states);
    for (const t of machine.transitions) {
      for (const [side, st] of [["from", t.from], ["to", t.to]] as const) {
        if (!states.has(st)) {
          return fail(
            `${machine.id}.transitions[${t.index}] ${side}: '${st}' is not a declared state (V10). ` +
            `The configuration space is not well defined.`);
        }
      }
      const guards: ((cfg: Configuration) => boolean)[] = [];
      for (const g of t.guards) {
        // A guard and a predicate atom are the same shape and earn the same checks, so the atom
        // compiler is the single implementation; only the anchor of the refusal differs.
        const compiled = compileAtom(scope, g);
        if (!compiled.ok) {
          return fail(`${machine.id}.transitions[${t.index}].requires: ${compiled.refusal}`);
        }
        guards.push(compiled.value);
      }
      const writes: CompiledWrite[] = [];
      for (const e of t.effects) {
        const w = compileWrite(scope, inst.id, e.variable, e.expression);
        if (!w.ok) return fail(`${machine.id}.transitions[${t.index}]: ${w.refusal}`, w.detail);
        writes.push(w.value);
      }
      out.push({
        instance: inst.id, machine: machine.id, index: t.index,
        from: t.from, to: t.to, label: t.label, sync: t.sync,
        guard: (cfg) => guards.every((g) => g(cfg)),
        writes,
      });
    }
  }
  return ok(out);
}

function compileEvents(
  system: CanonicalSystem, all: readonly CompiledTransition[],
): Res<readonly CompiledEvent[]> {
  const out: CompiledEvent[] = [];
  for (const ev of system.events.values()) {
    if (ev.participants.length === 0) {
      return fail(`event '${ev.id}' declares no participants, so it names no joint step (V12).`);
    }
    const participants: { instance: string; transitions: CompiledTransition[] }[] = [];
    for (const name of ev.participants) {
      const machine = system.machines.get(name);
      if (machine === undefined) {
        return fail(`event '${ev.id}' names participant '${name}', which is not a declared machine (V12).`);
      }
      if (machine.instances > 1) {
        // V14 verbatim. The engine refuses rather than guessing which instance participates.
        return fail(
          `'${ev.id}' synchronizes with multiply-instantiated machine '${name}'. Participant ` +
          `selection is not supported by this version. Model the participants explicitly, or use ` +
          `a single '${name}' instance.`,
          detail("reserved-feature", ["participant selection for a multiply-instantiated machine"]));
      }
      const transitions = all.filter((t) => t.machine === name && t.sync === ev.id);
      if (transitions.length === 0) {
        return fail(
          `'${name}' never declares a transition with sync: ${ev.id} — a participant that never ` +
          `participates is a modeling error, not a silent no-op (V12).`);
      }
      participants.push({ instance: name, transitions });
    }
    // V13 — two transitions joined by one event must not assign the same variable. Detected from
    // declared effects, so an arbitrary runtime winner is impossible rather than merely unlikely.
    for (let i = 0; i < participants.length; i += 1) {
      for (let j = i + 1; j < participants.length; j += 1) {
        const a = participants[i];
        const b = participants[j];
        if (a === undefined || b === undefined) continue;
        const keysA = new Set(a.transitions.flatMap((t) => t.writes.map((w) => w.key)));
        for (const t of b.transitions) {
          for (const w of t.writes) {
            if (keysA.has(w.key)) {
              return fail(
                `'${a.instance}' and '${b.instance}' both assign '${w.variable}' in the single ` +
                `atomic step '${ev.id}' (V13). Conflicting writes are a validation error, not a ` +
                `race the engine resolves.`);
            }
          }
        }
      }
    }
    out.push({ id: ev.id, participants });
  }
  return ok(out);
}

export function compileSystem(system: CanonicalSystem): Res<CompiledSystem> {
  const scope = buildScope(system);
  const initial = initialConfiguration(system);
  if (!initial.ok) return initial;
  const transitions = compileTransitions(system, scope);
  if (!transitions.ok) return transitions;
  for (const t of transitions.value) {
    if (t.sync !== null && !system.events.has(t.sync)) {
      return fail(
        `${t.machine}.transitions[${t.index}] declares sync: ${t.sync}, which is not a declared ` +
        `event (V1). 'sync:' means synchronization and nothing else.`);
    }
  }
  const events = compileEvents(system, transitions.value);
  if (!events.ok) return events;
  return ok({
    scope,
    initial: initial.value,
    locals: transitions.value.filter((t) => t.sync === null),
    events: events.value,
  });
}

// --------------------------------------------------------------------------------------------
// The walk
// --------------------------------------------------------------------------------------------

export interface SpaceEdge {
  readonly to: number;
  readonly step: Step;
  readonly transitions: readonly { readonly machine: string; readonly index: number }[];
}

export type StopReason =
  | "complete" | "state-limit" | "config-hit" | "edge-hit" | "dead-end-hit" | "initial-avoided";

/**
 * What stopped the walk, named explicitly rather than inferred from array lengths.
 *
 * `config` is the index of the configuration that matched (for a config or dead-end hit) or the
 * configuration the matching edge LEFT (for an edge hit), so a caller can rebuild the trace from
 * the parent chain without guessing.
 */
export interface SpaceHit {
  readonly kind: "config" | "edge" | "dead-end";
  readonly config: number;
  readonly edge: SpaceEdge | null;
}

export interface StateSpace {
  readonly configs: readonly Configuration[];
  readonly edges: readonly (readonly SpaceEdge[])[];
  readonly parentOf: readonly (number | null)[];
  readonly edgeFromParent: readonly (SpaceEdge | null)[];
  readonly deadEnds: readonly number[];
  readonly stopReason: StopReason;
  /** Configurations enumerated, which is what `coverage.states_explored` reports. */
  readonly statesExplored: number;
  /**
   * Disclosed rewrites the walk performed, as sentences. Today this is the saturation note: a step
   * whose effect would leave a variable's declared finite domain is NOT taken, and silently
   * dropping it would be exactly the kind of quiet semantic decision this workbench exists to
   * surface. Surfaced through `result.compilation` (V23's discipline, applied to a second case).
   */
  readonly notes: readonly string[];
  /** True once every reachable configuration has been enumerated and expanded. */
  readonly complete: boolean;
  readonly hit: SpaceHit | null;
}

export interface ExploreOptions {
  readonly limit: number;
  /** Configurations the walk must never enter — `avoid` on a reach query. */
  readonly avoid: ((cfg: Configuration) => boolean) | null;
  readonly stopAtConfig: ((cfg: Configuration) => boolean) | null;
  readonly stopAtEdge: ((step: Step) => boolean) | null;
  readonly stopAtDeadEnd: boolean;
}

export const defaultOptions = (limit: number = DEFAULT_STATE_LIMIT): ExploreOptions =>
  ({ limit, avoid: null, stopAtConfig: null, stopAtEdge: null, stopAtDeadEnd: false });

type Applied =
  | { readonly kind: "ok"; readonly cfg: Configuration }
  /**
   * The step is not taken because an effect would leave a variable's declared finite domain.
   *
   * Clamping would quietly invent a semantics the model never declared, and refusing the whole
   * query would discard every answer the rest of the model can still give. The step is skipped and
   * the fact is DISCLOSED — V23's discipline applied to a second kind of rewrite.
   */
  | { readonly kind: "saturated"; readonly notes: readonly string[] };

function applyWrites(pre: Configuration, moves: readonly CompiledTransition[]): Applied {
  // Every value is computed from the PRE-state before anything is written, which is what "all
  // effects apply atomically; the intermediate state is not observable" means operationally.
  const pending: [string, Scalar][] = [];
  const notes: string[] = [];
  for (const t of moves) {
    for (const w of t.writes) {
      const next = w.compute(pre);
      if (next === null) {
        notes.push(
          `${t.machine}.transitions[${t.index}] is not enabled where its effect on ` +
          `'${w.variable}' would leave the variable's declared finite domain; the step is skipped ` +
          `rather than clamped.`);
        continue;
      }
      pending.push([w.key, next]);
    }
  }
  if (notes.length > 0) return { kind: "saturated", notes };
  const control = new Map(pre.control);
  const values = new Map(pre.values);
  for (const t of moves) control.set(t.instance, t.to);
  for (const [key, value] of pending) values.set(key, value);
  return { kind: "ok", cfg: { control, values } };
}

const enabled = (t: CompiledTransition, cfg: Configuration): boolean =>
  cfg.control.get(t.instance) === t.from && t.guard(cfg);

/** Cartesian product over participants' enabled sync-transitions: nondeterminism is explored. */
function eventMoves(ev: CompiledEvent, cfg: Configuration): readonly (readonly CompiledTransition[])[] {
  let combos: (readonly CompiledTransition[])[] = [[]];
  for (const p of ev.participants) {
    const offered = p.transitions.filter((t) => enabled(t, cfg));
    if (offered.length === 0) return [];
    combos = combos.flatMap((combo) => offered.map((t) => [...combo, t]));
  }
  return combos;
}

export function exploreSpace(compiled: CompiledSystem, options: ExploreOptions): StateSpace {
  const configs: Configuration[] = [];
  const edges: SpaceEdge[][] = [];
  const parentOf: (number | null)[] = [];
  const edgeFromParent: (SpaceEdge | null)[] = [];
  const deadEnds: number[] = [];
  const noteSet = new Set<string>();
  const index = new Map<string, number>();

  const blank = (reason: StopReason): StateSpace => ({
    configs: [], edges: [], parentOf: [], edgeFromParent: [], deadEnds: [],
    stopReason: reason, statesExplored: 0, notes: [], complete: reason === "complete", hit: null,
  });

  if (options.avoid?.(compiled.initial) === true) return blank("initial-avoided");

  const admit = (cfg: Configuration): number => {
    const key = configKey(cfg);
    const seen = index.get(key);
    if (seen !== undefined) return seen;
    const id = configs.length;
    index.set(key, id);
    configs.push(cfg);
    edges.push([]);
    parentOf.push(null);
    edgeFromParent.push(null);
    return id;
  };

  admit(compiled.initial);
  let stopReason: StopReason = "complete";
  let hit: SpaceHit | null = null;
  let frontier = 0;

  if (options.stopAtConfig?.(compiled.initial) === true) {
    return {
      configs, edges, parentOf, edgeFromParent, deadEnds: [],
      stopReason: "config-hit", statesExplored: configs.length, notes: [], complete: false,
      hit: { kind: "config", config: 0, edge: null },
    };
  }

  outer:
  while (frontier < configs.length) {
    const here = frontier;
    frontier += 1;
    const cfg = configs[here];
    if (cfg === undefined) continue;

    const candidates: { readonly moves: readonly CompiledTransition[]; readonly sync: string | null }[] = [];
    for (const t of compiled.locals) if (enabled(t, cfg)) candidates.push({ moves: [t], sync: null });
    for (const ev of compiled.events) {
      for (const moves of eventMoves(ev, cfg)) candidates.push({ moves, sync: ev.id });
    }

    let outgoing = 0;
    for (const candidate of candidates) {
      const applied = applyWrites(cfg, candidate.moves);
      if (applied.kind === "saturated") {
        for (const note of applied.notes) noteSet.add(note);
        continue;
      }
      outgoing += 1;
      if (options.avoid?.(applied.cfg) === true) continue;

      const first = candidate.moves[0];
      const step: Step = {
        instances: candidate.moves.map((m) => m.instance),
        sync: candidate.sync,
        label: candidate.sync !== null ? candidate.sync : (first?.label ?? null),
        from: cfg,
        to: applied.cfg,
      };
      const known = index.get(configKey(applied.cfg));
      const fresh = known === undefined;
      if (fresh && configs.length >= options.limit) {
        // The ceiling tripped with work outstanding: a BOUNDED search (V22).
        stopReason = "state-limit";
        break outer;
      }
      const to = admit(applied.cfg);
      const edge: SpaceEdge = {
        to, step,
        transitions: candidate.moves.map((m) => ({ machine: m.machine, index: m.index })),
      };
      edges[here]?.push(edge);
      if (fresh) {
        parentOf[to] = here;
        edgeFromParent[to] = edge;
      }
      if (options.stopAtEdge?.(step) === true) {
        stopReason = "edge-hit";
        hit = { kind: "edge", config: here, edge };
        break outer;
      }
      if (fresh && options.stopAtConfig?.(applied.cfg) === true) {
        stopReason = "config-hit";
        hit = { kind: "config", config: to, edge };
        break outer;
      }
    }
    if (outgoing === 0) {
      // A configuration with no enabled step is a DEAD END and is reported as such, not treated as
      // an error (§6).
      deadEnds.push(here);
      if (options.stopAtDeadEnd) {
        stopReason = "dead-end-hit";
        hit = { kind: "dead-end", config: here, edge: null };
        break outer;
      }
    }
  }

  return {
    configs, edges, parentOf, edgeFromParent, deadEnds,
    stopReason,
    statesExplored: configs.length,
    notes: [...noteSet].sort(),
    complete: stopReason === "complete",
    hit,
  };
}

/** Shortest step sequence from the initial configuration, via the BFS parent chain. */
export function traceTo(space: StateSpace, target: number): readonly Step[] {
  const steps: Step[] = [];
  let cur: number | null = target;
  const guard = new Set<number>();
  while (cur !== null && !guard.has(cur)) {
    guard.add(cur);
    const edge = space.edgeFromParent[cur] ?? null;
    if (edge === null) break;
    steps.push(edge.step);
    cur = space.parentOf[cur] ?? null;
  }
  return steps.reverse();
}

/** Shortest step sequence between two explored configurations; null when none exists. */
export function pathBetween(space: StateSpace, from: number, to: number): readonly Step[] | null {
  if (from === to) return [];
  const prev = new Map<number, { readonly at: number; readonly step: Step }>();
  const seen = new Set<number>([from]);
  let frontier = [from];
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const at of frontier) {
      for (const edge of space.edges[at] ?? []) {
        if (edge.to === to) {
          const steps: Step[] = [edge.step];
          let cur = at;
          while (cur !== from) {
            const back = prev.get(cur);
            if (back === undefined) break;
            steps.push(back.step);
            cur = back.at;
          }
          return steps.reverse();
        }
        if (seen.has(edge.to)) continue;
        seen.add(edge.to);
        prev.set(edge.to, { at, step: edge.step });
        next.push(edge.to);
      }
    }
    frontier = next;
  }
  return null;
}

/** Cycle back to the same configuration, length >= 1; null when the configuration is not on one. */
export function cycleThrough(space: StateSpace, at: number): readonly Step[] | null {
  for (const edge of space.edges[at] ?? []) {
    if (edge.to === at) return [edge.step];
    const back = pathBetween(space, edge.to, at);
    if (back !== null) return [edge.step, ...back];
  }
  return null;
}

/**
 * A cycle witness: a prefix from the initial configuration plus a repeatable loop, anywhere in the
 * space. `null` when the reachable configuration graph is acyclic.
 *
 * This is the shape a path-aggregation analysis needs in order to report that an additive maximum
 * is UNBOUNDED rather than to refuse the question: a repeatable cycle is concrete evidence, where a
 * refusal is only an absence of one. The engine itself does not aggregate over paths (that is Phase
 * I), but it owns the witness, because it owns the space.
 *
 * A cycle here means a repeated CONFIGURATION, which is the only sound reading: a loop through the
 * same control states but with a bounded variable strictly advancing is not repeatable, and the
 * finite domain is exactly what makes that distinction decidable.
 */
export function findConfigurationCycle(
  space: StateSpace,
): { readonly prefix: readonly Step[]; readonly cycle: readonly Step[]; readonly at: number } | null {
  for (let at = 0; at < space.configs.length; at += 1) {
    const cycle = cycleThrough(space, at);
    if (cycle !== null) return { prefix: traceTo(space, at), cycle, at };
  }
  return null;
}
