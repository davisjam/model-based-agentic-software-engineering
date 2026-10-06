/**
 * The product, the emptiness check, the counterexample, and the verdict — the LTL layer that
 * finally answers.
 *
 * This completes the foundation's delta list. `ltl.ts` parses and resolves a formula,
 * `ltl-automaton.ts` compiles it to a generalized Büchi automaton and `ltl-trace.ts` decides
 * satisfaction on an explicit word; none of them reads a model. Here the model arrives:
 *
 *   3. the product walk over (configuration, automaton-node) pairs;
 *   4. stutter-closure at dead ends — in the product successor ONLY;
 *   5. Tarjan SCC with generalized acceptance;
 *   6. counterexample assembly and projection;
 *   7. verdict mapping onto the shipped four-valued `Outcome` plus `Coverage`.
 *
 * By Vardi–Wolper, `φ` holds of `M` iff the language of `A_M ⊗ A_¬φ` is empty — so the automaton
 * built here is always the one for **¬φ**, and a nonempty intersection IS a counterexample. The
 * formula the caller hands in is the property it wants to be true.
 *
 * ## The step relation is borrowed, not re-derived
 *
 * `successorsOf` in `explore.ts` is the ONE step relation of §6, extracted precisely because this
 * module is its second reader. Two copies would be two step relations, and the model would denote
 * one set of executions to `exploreSpace` and another to the product — a model meaning two things
 * at once, which is the defect the one-denotation rule exists to forbid. So nothing here re-reads
 * `compiled.locals` or `compiled.events`; the product asks `successorsOf` what the steps are and
 * builds pairs out of the answer.
 *
 * ## Stutter-closure lives here, and the model is untouched
 *
 * LTL's traces are infinite and our machines may halt, so the spec rules that terminal states
 * stutter forever: the trace domain is the stutter-CLOSED relation `T' = T ∪ { (c, τ, c) : c is a
 * dead end }`. The closure is added in exactly one function — `stepsOutOf` below — and `exploreSpace`
 * never sees it. That boundary is not stylistic. Add the self-loop to the shared graph and two
 * shipped denotations silently flip: `deadend` asks for a configuration with no enabled step and
 * would answer `refuted` forever, and `repeatable-cycle` asks for a genuinely repeatable
 * configuration and would call every halt a loop, conflating halting with looping.
 *
 * It is also a promise to a student: a stutter step is a device of the checker, not a transition
 * anybody wrote. So the step it fabricates moves NO instance and carries NO label —
 * `isStutterStep` reads that structurally, because every real step moves at least one instance —
 * and a renderer showing a counterexample says "and the system halts here" rather than drawing a
 * loop over an invented arrow.
 *
 * ## The state limit counts PRODUCT states
 *
 * `DEFAULT_STATE_LIMIT` is the shipped ceiling and it is honoured here, but counted in product
 * states rather than configurations — the product is configurations × automaton nodes, so a model
 * comfortably inside the limit can exceed it once multiplied. The limit is therefore enforced where
 * the search actually runs (`admitState`), and the number that reaches `Coverage.statesExplored` is
 * the product count, with a disclosure saying so: a reader comparing it against
 * `repeatable-cycle`'s configuration count deserves the explanation rather than a mystery.
 *
 * ## A bounded search that found nothing is `inconclusive`, never `holds`
 *
 * The asymmetry is V22's and it is the one place this module could be authoritatively wrong in
 * silence. A found accepting cycle is sound at any coverage — more search cannot unfind a cycle —
 * so a truncated walk that found one answers `refuted`. The converse does not hold: a truncated
 * walk that found NO accepting cycle has not searched the product, and `holds` would rest a
 * universal claim on an exploration that stopped early. `verdictFor` returns `inconclusive` with
 * `bounded` coverage there, and the status is computed from the stop reason rather than by negating
 * "did we find a lasso" — a status derived by negation is exactly how an `inconclusive` becomes a
 * `holds` nobody notices.
 */
import { configKey } from "../ir/types.ts";
import type { CanonicalSystem, Compilation, Configuration, Evidence, EvidenceStep, Step } from "../ir/types.ts";
import { evidenceSteps } from "../ir/types.ts";
import {
  compileSystem, DEFAULT_STATE_LIMIT, successorsOf, type CompiledSystem,
} from "./explore.ts";
import { buildGnba, labelHolds, negate, type Gnba } from "./ltl-automaton.ts";
import {
  describeFormula, normalizeFormula, resolveFormula, type LtlProperty, type ParsedFormula,
} from "./ltl.ts";
import {
  bounded, detail, exhaustive, refusedAdmission as refused, result, unlicensed, verdict,
  type Admission, type Quantifier, type Verdict,
} from "./types.ts";

// ----------------------------------------------------------------------------------------------
// Stutter-closure — the ONLY place the step relation is extended
// ----------------------------------------------------------------------------------------------

/**
 * The stutter self-loop at a dead end: `(c, τ, c)`.
 *
 * No instance moves, no event fires, no label is claimed. That is the honest encoding of τ as a
 * RESERVED INTERNAL label: there is no transition in the model to name, so naming one would show a
 * student an arrow they never drew.
 */
const stutterStep = (cfg: Configuration): Step =>
  ({ instances: [], sync: null, label: null, from: cfg, to: cfg });

/**
 * Whether a step is the trace domain's stutter rather than a declared transition.
 *
 * Structural, not a flag: every real step — local or synchronized — moves at least one instance,
 * because `successorsOf` builds each from the transitions that carried it. A renderer uses this to
 * say "the system halts here" instead of animating a self-loop.
 */
export const isStutterStep = (step: Step | EvidenceStep): boolean => step.instances.length === 0;

// ----------------------------------------------------------------------------------------------
// The product
// ----------------------------------------------------------------------------------------------

/** One product state: a configuration index paired with an automaton node id. */
export interface ProductState {
  readonly config: number;
  readonly node: number;
}

/** A product edge, carrying the MODEL step that drove it — which is what projection reads back. */
export interface ProductEdge {
  readonly to: number;
  readonly step: Step;
}

export type ProductStop = "complete" | "state-limit";

/**
 * The materialized product, as the emptiness check wants it.
 *
 * Materialized rather than walked on the fly, following §7.2: the shipped explorer already
 * materializes its graph and derives witnesses post hoc, the measured scale is tens of
 * configurations against single-digit automaton states, and nested DFS's memory virtue purchases
 * nothing here while costing a second and subtler search discipline to audit.
 */
export interface Product {
  readonly states: readonly ProductState[];
  readonly edges: readonly (readonly ProductEdge[])[];
  /** Configurations reached, in discovery order. Product states index into this. */
  readonly configs: readonly Configuration[];
  readonly initial: readonly number[];
  readonly stopReason: ProductStop;
  /** Configuration indices that are dead ends, so the stutter self-loop was their only step out. */
  readonly stutterConfigs: readonly number[];
  /** Whatever the step attempts had to disclose — today, `explore.ts`'s saturation notes. */
  readonly notes: readonly string[];
  readonly limit: number;
}

/** Product states enumerated — the number `Coverage.statesExplored` reports for an LTL verdict. */
export const productStatesExplored = (p: Product): number => p.states.length;

export const productEdgeCount = (p: Product): number =>
  p.edges.reduce((n, list) => n + list.length, 0);

/**
 * Walk the product of the stutter-closed model and the automaton, breadth first.
 *
 * Breadth first for the same reason `exploreSpace` is: the discovery order is the order a shortest
 * prefix wants, and a counterexample whose prefix wanders is harder to read than one that does not.
 *
 * GPVW's automaton is STATE-labeled, so a run `q₀ q₁ …` over a word `w₀ w₁ …` requires `wⱼ` to
 * satisfy `label(qⱼ)`. The label test therefore fires on the TARGET state against the TARGET
 * configuration's valuation, and on the initial states against the initial configuration's — the
 * same convention `automatonAccepts` uses over words, which is what lets the two be compared.
 */
export function exploreProduct(
  compiled: CompiledSystem,
  property: LtlProperty,
  automaton: Gnba,
  limit: number = DEFAULT_STATE_LIMIT,
): Product {
  const configs: Configuration[] = [];
  const configIds = new Map<string, number>();
  const letters: ReadonlySet<string>[] = [];
  const stepCache = new Map<number, readonly Step[]>();
  const stutterConfigs: number[] = [];
  const noteSet = new Set<string>();

  /**
   * `L(c)`, as evaluation rather than as a labeling table: the atom keys whose compiled predicate
   * holds here. One predicate evaluator for the whole workbench, which is why `invariant p` and an
   * LTL atom `p` cannot come to mean different things.
   */
  const admitConfig = (cfg: Configuration): number => {
    const key = configKey(cfg);
    const seen = configIds.get(key);
    if (seen !== undefined) return seen;
    const id = configs.length;
    configIds.set(key, id);
    configs.push(cfg);
    const letter = new Set<string>();
    for (const [atom, binding] of property.atoms) if (binding.holds(cfg)) letter.add(atom);
    letters.push(letter);
    return id;
  };

  /** The stutter-closed step relation `T'`, at one configuration. The closure is these four lines. */
  const stepsOutOf = (id: number, cfg: Configuration): readonly Step[] => {
    const cached = stepCache.get(id);
    if (cached !== undefined) return cached;
    const out = successorsOf(compiled, cfg);
    for (const note of out.notes) noteSet.add(note);
    if (out.steps.length === 0) {
      stutterConfigs.push(id);
      const stutter: readonly Step[] = [stutterStep(cfg)];
      stepCache.set(id, stutter);
      return stutter;
    }
    const steps = out.steps.map((s) => s.step);
    stepCache.set(id, steps);
    return steps;
  };

  const states: ProductState[] = [];
  const edges: ProductEdge[][] = [];
  const stateIds = new Map<string, number>();
  let truncated = false;

  /** The state limit, enforced where the search runs and counted in PRODUCT states. */
  const admitState = (config: number, node: number): number | null => {
    const key = `${config}:${node}`;
    const seen = stateIds.get(key);
    if (seen !== undefined) return seen;
    if (states.length >= limit) {
      truncated = true;
      return null;
    }
    const id = states.length;
    stateIds.set(key, id);
    states.push({ config, node });
    edges.push([]);
    return id;
  };

  const done = (): Product => ({
    states,
    edges,
    configs,
    initial,
    stopReason: truncated ? "state-limit" : "complete",
    stutterConfigs: [...stutterConfigs].sort((a, b) => a - b),
    notes: [...noteSet].sort(),
    limit,
  });

  const firstConfig = admitConfig(compiled.initial);
  const firstLetter = letters[firstConfig] ?? new Set<string>();
  const initial: number[] = [];
  for (const q of automaton.initial) {
    const node = automaton.states[q];
    if (node === undefined || !labelHolds(node, firstLetter)) continue;
    const id = admitState(firstConfig, q);
    if (id === null) break;
    if (!initial.includes(id)) initial.push(id);
  }

  let frontier = 0;
  while (frontier < states.length && !truncated) {
    const here = frontier;
    frontier += 1;
    const state = states[here];
    if (state === undefined) continue;
    const cfg = configs[state.config];
    const node = automaton.states[state.node];
    if (cfg === undefined || node === undefined) continue;

    for (const step of stepsOutOf(state.config, cfg)) {
      const toConfig = admitConfig(step.to);
      const letter = letters[toConfig] ?? new Set<string>();
      for (const q of node.next) {
        const target = automaton.states[q];
        if (target === undefined || !labelHolds(target, letter)) continue;
        const to = admitState(toConfig, q);
        if (to === null) break;
        edges[here]?.push({ to, step });
      }
      if (truncated) break;
    }
  }

  return done();
}

// ----------------------------------------------------------------------------------------------
// Emptiness: Tarjan's components, with generalized acceptance
// ----------------------------------------------------------------------------------------------

/**
 * Tarjan's strongly-connected components, iteratively.
 *
 * Iterative because a recursive depth-first search over a product is the kind of thing that works
 * on every fixture and dies on the one real model, and a stack overflow inside the emptiness check
 * would read as the construction being wrong rather than as the search running out of frames.
 *
 * Chosen over nested DFS for the three reasons §7.2 gives: it matches the house search shape, which
 * already materializes the graph; generalized acceptance comes free, so no degeneralization pass
 * exists to be subtly wrong; and the invariant is a page of textbook rather than the nested-DFS
 * argument whose subtlety has produced published errata.
 */
export function stronglyConnectedComponents(p: Product): readonly (readonly number[])[] {
  const n = p.states.length;
  const order = new Int32Array(n).fill(-1);
  const low = new Int32Array(n);
  const onStack = new Uint8Array(n);
  const stack: number[] = [];
  const components: number[][] = [];
  let counter = 0;

  for (let root = 0; root < n; root += 1) {
    if (order[root] !== -1) continue;
    const frames: { node: number; at: number }[] = [{ node: root, at: 0 }];
    order[root] = counter;
    low[root] = counter;
    counter += 1;
    stack.push(root);
    onStack[root] = 1;

    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      if (frame === undefined) break;
      const out = p.edges[frame.node] ?? [];
      if (frame.at < out.length) {
        const next = out[frame.at]?.to;
        frame.at += 1;
        if (next === undefined) continue;
        if (order[next] === -1) {
          order[next] = counter;
          low[next] = counter;
          counter += 1;
          stack.push(next);
          onStack[next] = 1;
          frames.push({ node: next, at: 0 });
          continue;
        }
        if (onStack[next] === 1) {
          low[frame.node] = Math.min(low[frame.node] ?? 0, order[next] ?? 0);
        }
        continue;
      }
      frames.pop();
      const parent = frames[frames.length - 1];
      if (parent !== undefined) {
        low[parent.node] = Math.min(low[parent.node] ?? 0, low[frame.node] ?? 0);
      }
      if (low[frame.node] === order[frame.node]) {
        const component: number[] = [];
        for (;;) {
          const popped = stack.pop();
          if (popped === undefined) break;
          onStack[popped] = 0;
          component.push(popped);
          if (popped === frame.node) break;
        }
        components.push(component);
      }
    }
  }
  return components;
}

/** A component carries a cycle iff it has more than one state, or one state with a self-loop. */
function nontrivial(p: Product, component: readonly number[]): boolean {
  if (component.length > 1) return true;
  const only = component[0];
  if (only === undefined) return false;
  return (p.edges[only] ?? []).some((e) => e.to === only);
}

/**
 * Components that witness non-emptiness: nontrivial, and meeting EVERY acceptance set.
 *
 * That single condition is what generalized acceptance costs. A run accepts iff it visits every
 * `F_i` infinitely often; the states a run visits infinitely often form a strongly connected set,
 * so an accepting run exists iff some reachable nontrivial component intersects all of them. An
 * empty acceptance family — a pure-safety formula compiles with no Until subformula — is satisfied
 * by `every` on an empty list, so every nontrivial component accepts and no special case is needed.
 *
 * Every state in the product is reachable from an initial one by construction, so "reachable" needs
 * no separate filter here.
 */
export function acceptingComponents(p: Product, automaton: Gnba): readonly (readonly number[])[] {
  const sets = automaton.acceptance.map((set) => new Set(set));
  const nodeOf = (i: number): number => p.states[i]?.node ?? -1;
  const out: (readonly number[])[] = [];
  for (const component of stronglyConnectedComponents(p)) {
    if (!nontrivial(p, component)) continue;
    if (sets.every((set) => component.some((i) => set.has(nodeOf(i))))) out.push(component);
  }
  return out;
}

// ----------------------------------------------------------------------------------------------
// Counterexample assembly and projection
// ----------------------------------------------------------------------------------------------

/**
 * Step-distance from the nearest initial product state, per reachable state.
 *
 * Used to pick WHICH state of an accepting component to anchor the lasso on. Any state of the
 * component yields a sound counterexample, so this is a readability choice and nothing more: a
 * student reading "capture a base, then loop" learns the lesson that a four-step detour to the same
 * loop hides. Minimality of the whole lasso is still a non-goal — only the prefix is shortest.
 */
function distancesFromInitial(p: Product): ReadonlyMap<number, number> {
  const dist = new Map<number, number>();
  for (const start of p.initial) dist.set(start, 0);
  let frontier = [...p.initial];
  let depth = 0;
  while (frontier.length > 0) {
    depth += 1;
    const next: number[] = [];
    for (const at of frontier) {
      for (const edge of p.edges[at] ?? []) {
        if (dist.has(edge.to)) continue;
        dist.set(edge.to, depth);
        next.push(edge.to);
      }
    }
    frontier = next;
  }
  return dist;
}

/** Shortest step sequence from any initial product state to `target`; null when unreachable. */
function prefixTo(p: Product, target: number): readonly Step[] | null {
  if (p.initial.includes(target)) return [];
  const back = new Map<number, { readonly at: number; readonly step: Step }>();
  const seen = new Set<number>(p.initial);
  let frontier = [...p.initial];
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const at of frontier) {
      for (const edge of p.edges[at] ?? []) {
        if (seen.has(edge.to)) continue;
        seen.add(edge.to);
        back.set(edge.to, { at, step: edge.step });
        if (edge.to === target) return unwind(back, p.initial, target);
        next.push(edge.to);
      }
    }
    frontier = next;
  }
  return null;
}

function unwind(
  back: ReadonlyMap<number, { readonly at: number; readonly step: Step }>,
  sources: readonly number[], target: number,
): readonly Step[] {
  const steps: Step[] = [];
  let cur = target;
  while (!sources.includes(cur)) {
    const hop = back.get(cur);
    if (hop === undefined) break;
    steps.push(hop.step);
    cur = hop.at;
  }
  return steps.reverse();
}

/** Shortest path from `from` to `to` staying inside one component; `[]` when they coincide. */
function pathWithin(
  p: Product, within: ReadonlySet<number>, from: number, to: number,
): readonly Step[] | null {
  if (from === to) return [];
  const back = new Map<number, { readonly at: number; readonly step: Step }>();
  const seen = new Set<number>([from]);
  let frontier = [from];
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const at of frontier) {
      for (const edge of p.edges[at] ?? []) {
        if (!within.has(edge.to) || seen.has(edge.to)) continue;
        seen.add(edge.to);
        back.set(edge.to, { at, step: edge.step });
        if (edge.to === to) return unwind(back, [from], to);
        next.push(edge.to);
      }
    }
    frontier = next;
  }
  return null;
}

/** A path of at least one step from `from` back to `to` inside the component. Never `[]`. */
function cycleWithin(
  p: Product, within: ReadonlySet<number>, from: number, to: number,
): readonly Step[] | null {
  for (const edge of p.edges[from] ?? []) {
    if (!within.has(edge.to)) continue;
    if (edge.to === to) return [edge.step];
    const rest = pathWithin(p, within, edge.to, to);
    if (rest !== null) return [edge.step, ...rest];
  }
  return null;
}

/**
 * Assemble the lasso and project it onto configurations.
 *
 * The prefix is the shortest path from an initial product state to an anchor inside the accepting
 * component; the cycle chains shortest segments through one representative of each acceptance set
 * and closes back on the anchor. Projection is free: every product edge already carries the MODEL
 * step that drove it, so dropping the automaton component is reading `edge.step` — and because the
 * cycle returns to the same product state, its configuration component returns to the same
 * configuration, so the projection is a model lasso and not merely a walk.
 *
 * Minimality is a non-goal, stated plainly: this is "a counterexample", not "the smallest". And the
 * shape is the SHIPPED `lasso` evidence — `steps` plus `cycle` — so the UI that animates a
 * `repeatable-cycle` witness animates an LTL counterexample with no new evidence machinery.
 */
export function assembleCounterexample(
  p: Product, automaton: Gnba, component: readonly number[],
): Evidence | null {
  const within = new Set(component);
  const nodeOf = (i: number): number => p.states[i]?.node ?? -1;

  // Nearest-first, so the anchor the prefix runs to is the component's closest acceptance witness.
  const dist = distancesFromInitial(p);
  const far = Number.MAX_SAFE_INTEGER;
  const ordered = [...component].sort((a, b) => (dist.get(a) ?? far) - (dist.get(b) ?? far));

  const waypoints: number[] = [];
  for (const set of automaton.acceptance) {
    const hit = ordered.find((i) => set.includes(nodeOf(i)));
    if (hit === undefined) return null;
    if (!waypoints.includes(hit)) waypoints.push(hit);
  }
  const anchor = waypoints[0] ?? ordered[0];
  if (anchor === undefined) return null;

  const prefix = prefixTo(p, anchor);
  if (prefix === null) return null;

  const cycle: Step[] = [];
  let at = anchor;
  for (const waypoint of waypoints.slice(1)) {
    const segment = pathWithin(p, within, at, waypoint);
    if (segment === null) return null;
    cycle.push(...segment);
    at = waypoint;
  }
  const closing = cycleWithin(p, within, at, anchor);
  if (closing === null || closing.length === 0) return null;
  cycle.push(...closing);

  return {
    shape: "lasso", role: "counterexample",
    steps: evidenceSteps(prefix), cycle: evidenceSteps(cycle), nodes: null,
  };
}

// ----------------------------------------------------------------------------------------------
// Admission
// ----------------------------------------------------------------------------------------------

/**
 * The quantifier an LTL property takes.
 *
 * A behavioral property holds iff EVERY trace satisfies it, so the natural quantifier is `forall` —
 * the slot `invariant` occupies. A declared `exists` is refused with the dual named rather than
 * reinterpreted: the existential questions are already served by the six shipped forms, and giving
 * one form two quantified denotations is what the one-denotation rule forbids.
 */
export const LTL_QUANTIFIER: Quantifier = "forall";

export interface LtlPlan {
  readonly property: LtlProperty;
  /** The automaton of ¬φ. Emptiness of the product with it is φ holding. */
  readonly automaton: Gnba;
  readonly compiled: CompiledSystem;
  readonly limit: number;
  readonly interpretedAs: string;
}

/** The question actually evaluated, in plain language (V21) and non-visually. */
const questionFor = (described: string): string =>
  `Does every execution of this system satisfy '${described}'? (Executions are infinite: a ` +
  `configuration with no enabled step repeats forever, so a halt is a trace and not a gap.)`;

/**
 * Admit one LTL question: the quantifier pairing, the system's explorability, every atom's
 * resolution, and the automaton — all before a single product state exists.
 *
 * The order is the admission sequence the foundation specifies, and it is the order that keeps a
 * refusal and a verdict distinct. A typo in a reference refuses HERE, before a trace is examined,
 * because "cannot be read" and "read and found false" are different claims and only the second is
 * about the model.
 */
export function admitLtlProperty(
  system: CanonicalSystem, parsed: ParsedFormula, quantifier: Quantifier, systemHash: string,
  limit: number = DEFAULT_STATE_LIMIT,
): Admission<LtlPlan> {
  if (quantifier !== LTL_QUANTIFIER) {
    return refused(unlicensed(systemHash,
      "an LTL property is universal: it holds when every execution satisfies it, and is refuted by " +
      "one execution that does not. Declared quantifier 'exists' asks whether SOME execution " +
      "satisfies the formula, which is a different question the engine will not silently " +
      `substitute. Ask 'forall' of 'not (${parsed.source})' and read a refutation as the witness, ` +
      "or use one of the existential behavior forms.",
      questionFor(parsed.source), detail("quantifier-mismatch")));
  }

  const compiled = compileSystem(system);
  if (!compiled.ok) {
    return refused(unlicensed(systemHash, compiled.refusal, questionFor(parsed.source), compiled.detail));
  }

  const resolved = resolveFormula(compiled.value.scope, parsed);
  if (!resolved.ok) {
    return refused(unlicensed(systemHash, resolved.refusal, questionFor(parsed.source), resolved.detail));
  }
  const property: LtlProperty = {
    ...resolved.value, formula: normalizeFormula(resolved.value.formula),
  };
  const described = describeFormula(property.formula, property.atoms);
  const interpretedAs = questionFor(described);

  // The automaton is for ¬φ: the product's language is the set of executions VIOLATING φ.
  const automaton = buildGnba(negate(property.formula));
  if (!automaton.ok) {
    return refused(unlicensed(systemHash, automaton.refusal, interpretedAs,
      automaton.detail ?? detail("unsupported-expression")));
  }

  return {
    admitted: true,
    plan: { property, automaton: automaton.value, compiled: compiled.value, limit, interpretedAs },
  };
}

// ----------------------------------------------------------------------------------------------
// Verdict
// ----------------------------------------------------------------------------------------------

const disclose = (explanation: string): Compilation => ({ kind: "other", explanation });

/**
 * The provenance sentence §6.3 licenses: automaton size and product size, a sentence of
 * disclosure rather than a lesson in ω-automata.
 */
const sizeNote = (plan: LtlPlan, p: Product): Compilation => disclose(
  `The formula's negation compiled to a ${plan.automaton.size.states}-state automaton with ` +
  `${plan.automaton.size.acceptanceSets} acceptance ` +
  `${plan.automaton.size.acceptanceSets === 1 ? "set" : "sets"}; its product with the system has ` +
  `${productStatesExplored(p)} ${productStatesExplored(p) === 1 ? "state" : "states"} and ` +
  `${productEdgeCount(p)} ${productEdgeCount(p) === 1 ? "edge" : "edges"} over ` +
  `${p.configs.length} ${p.configs.length === 1 ? "configuration" : "configurations"}. ` +
  `'states_explored' on this result counts PRODUCT states, which is the truth about the walk and ` +
  `is why it exceeds the configuration count a 'repeatable-cycle' query would report.`);

const stutterNote = (p: Product): readonly Compilation[] => {
  if (p.stutterConfigs.length === 0) return [];
  return [disclose(
    `${p.stutterConfigs.length} reachable ` +
    `${p.stutterConfigs.length === 1 ? "configuration has" : "configurations have"} no enabled ` +
    `step, so the trace domain repeats ${p.stutterConfigs.length === 1 ? "it" : "each of them"} ` +
    `forever — the ruling that keeps every execution infinite and LTL classical. The repetition is ` +
    `the checker's trace domain and not a transition this model declares: a counterexample whose ` +
    `cycle is one of these halts rather than loops.`)];
};

/**
 * Map the search onto the shipped four-valued `Outcome` plus `Coverage`.
 *
 * The three settled rows and the one unsettled row, with the asymmetry stated where it is
 * implemented rather than only in a comment: an accepting lasso settles `refuted` at ANY coverage,
 * because more search cannot unfind a cycle. Absence settles `holds` only when the product was
 * fully explored. A truncated walk with no lasso is `inconclusive` under `bounded` coverage — the
 * status is read off `stopReason`, so there is no path on which "no counterexample found" becomes
 * `holds` by default.
 */
function verdictFor(plan: LtlPlan, p: Product, systemHash: string): Verdict {
  const common = {
    systemHash, interpretedAs: plan.interpretedAs,
  };
  const notes = p.notes.map(disclose);

  for (const component of acceptingComponents(p, plan.automaton)) {
    const evidence = assembleCounterexample(p, plan.automaton, component);
    if (evidence === null) continue;
    return verdict(result({
      ...common,
      outcome: "refuted",
      coverage: exhaustive(productStatesExplored(p)),
      evidence,
      compilation: [sizeNote(plan, p), ...stutterNote(p), ...notes],
    }));
  }

  if (p.stopReason === "state-limit") {
    return verdict(result({
      ...common,
      outcome: "inconclusive",
      coverage: bounded(productStatesExplored(p), "state-limit"),
      compilation: [
        sizeNote(plan, p), ...stutterNote(p), ...notes,
        disclose(
          `The product walk stopped at the ${p.limit}-PRODUCT-state limit with work outstanding, ` +
          `so no accepting cycle was found in the explored region and none may exist outside it. ` +
          `The sound statement is "no violation within the explored region", never "the property ` +
          `holds".`),
      ],
    }));
  }

  return verdict(result({
    ...common,
    outcome: "holds",
    coverage: exhaustive(productStatesExplored(p)),
    compilation: [sizeNote(plan, p), ...stutterNote(p), ...notes],
  }));
}

/**
 * Check one LTL property against one system: admit, build the product, decide emptiness, answer.
 *
 * Two statements, and the product is unreachable for a question the admission declined — the same
 * arrangement `runBehaviorQuery` uses, held by the call graph rather than by a brand.
 *
 * Deliberately NOT wired into the query facade or the capability registry. Producing a verdict
 * VALUE is this layer's job; dispatching a saved query to it is a surface decision, and a formula
 * surface that has not been designed is not a capability to advertise.
 */
export function runLtlProperty(
  system: CanonicalSystem, parsed: ParsedFormula, quantifier: Quantifier, systemHash: string,
  limit: number = DEFAULT_STATE_LIMIT,
): Verdict {
  const admission = admitLtlProperty(system, parsed, quantifier, systemHash, limit);
  if (!admission.admitted) return admission.verdict;
  const plan = admission.plan;
  const product = exploreProduct(plan.compiled, plan.property, plan.automaton, plan.limit);
  return verdictFor(plan, product, systemHash);
}
