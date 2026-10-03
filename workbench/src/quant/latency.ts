/**
 * Execution-scoped aggregation: a trace's latency/cost, and the maximum over all executions.
 *
 * The maximum is a longest path over the configuration graph with nonnegative step charges (V29
 * grants nonnegativity). Longest path is hard in general; here it decomposes cleanly:
 *
 *  - a POSITIVE charge on a cycle makes the maximum UNBOUNDED, and per the Q5 ruling that is a
 *    cycle WITNESS, not a refusal — the lasso is concrete evidence against every finite bound;
 *  - every remaining cycle charges zero, so wandering inside a strongly connected component gains
 *    nothing and the maximum is a DP over the condensation DAG.
 *
 * The engine owns the space and the walk; this module only aggregates over what `exploreSpace`
 * produced. Coverage is carried faithfully: a maximum over a truncated walk is a maximum over the
 * explored region, and the result says so rather than rounding up to a claim about the system.
 */
import type { CanonicalSystem, Configuration, Coverage, Step } from "../ir/types.ts";
import {
  compileSystem, DEFAULT_STATE_LIMIT, defaultOptions, exploreSpace, pathBetween, traceTo,
  type SpaceEdge, type StateSpace,
} from "../engine/explore.ts";
import { bounded, exhaustive, ok, type Res } from "../engine/types.ts";
import { buildChargeTable, ChargeAccumulator, stepCharge } from "./charge.ts";
import type { PathExtremum, RangeEnd, TraceCharges } from "./types.ts";

export interface PathOptions {
  readonly limit: number;
  readonly end: RangeEnd;
  /**
   * Restricts the maximum to executions ENDING at a configuration this accepts; null ranges over
   * all executions. A selection of WHICH executions, never of how they aggregate — the aggregation
   * stays derived from the dimension's scope (§8), which is what keeps the §29-rejected
   * `max|min|named` selector out of the query surface.
   */
  readonly target: ((cfg: Configuration) => boolean) | null;
}

export const defaultPathOptions = (): PathOptions =>
  ({ limit: DEFAULT_STATE_LIMIT, end: "upper", target: null });

export type PathMetric = "latency" | "cost";

/**
 * The metric of one given execution. `steps` may be empty — the execution is then the initial
 * configuration alone, whose occupancy still charges (a visit is a visit; see charge.ts).
 */
export function traceMetric(
  system: CanonicalSystem, metric: PathMetric, steps: readonly Step[], end: RangeEnd = "upper",
): Res<TraceCharges> {
  const table = buildChargeTable(system, metric, end);
  if (!table.ok) return table;
  const first = steps[0];
  let initial = first?.from ?? null;
  if (initial === null) {
    const compiled = compileSystem(system);
    if (!compiled.ok) return compiled;
    initial = compiled.value.initial;
  }
  const acc = new ChargeAccumulator(table.value);
  acc.visitConfiguration(initial);
  for (const s of steps) acc.visitStep(s);
  return ok(acc.charges());
}

/** The worst-case metric over every execution from the initial configuration. */
export function maxOverExecutions(
  system: CanonicalSystem, metric: PathMetric, options: PathOptions = defaultPathOptions(),
): Res<PathExtremum> {
  const compiled = compileSystem(system);
  if (!compiled.ok) return compiled;
  const table = buildChargeTable(system, metric, options.end);
  if (!table.ok) return table;

  const space = exploreSpace(compiled.value, defaultOptions(options.limit));
  const coverage: Coverage = space.complete
    ? exhaustive(space.statesExplored)
    : bounded(space.statesExplored, "state-limit");

  const scc = stronglyConnected(space);

  // The target selection, resolved to node sets up front. `reachesTarget` is a reverse BFS from
  // every qualifying node, because both later decisions need it: a positive cycle unbounds the
  // SELECTED maximum only if an execution can pump it and still reach the target, and a selection
  // nothing reaches is a `none` rather than a zero.
  const qualifies = (node: number): boolean => {
    const cfg = space.configs[node];
    return cfg !== undefined && (options.target === null || options.target(cfg));
  };
  let reachesTarget: readonly boolean[] | null = null;
  if (options.target !== null) {
    const mark = new Array<boolean>(space.configs.length).fill(false);
    const queue: number[] = [];
    for (let i = 0; i < space.configs.length; i += 1) {
      if (qualifies(i)) {
        mark[i] = true;
        queue.push(i);
      }
    }
    const reverse: number[][] = Array.from({ length: space.configs.length }, () => []);
    for (let u = 0; u < space.configs.length; u += 1) {
      for (const edge of space.edges[u] ?? []) reverse[edge.to]?.push(u);
    }
    while (queue.length > 0) {
      const n = queue.pop() ?? 0;
      for (const p of reverse[n] ?? []) {
        if (mark[p] !== true) {
          mark[p] = true;
          queue.push(p);
        }
      }
    }
    // Node 0 is the initial configuration, so mark[0] says whether ANY execution reaches the
    // selection — every explored node is reachable from it by construction.
    if (mark[0] !== true) return ok({ kind: "none", coverage, notes: space.notes });
    reachesTarget = mark;
  }

  // A positive charge on an edge inside a component is a repeatable cycle that accrues: the Q5
  // shape. The witness is built around THAT edge, so the evidence charges what the claim says.
  for (let u = 0; u < space.configs.length; u += 1) {
    if (reachesTarget !== null && reachesTarget[u] !== true) continue;
    for (const edge of space.edges[u] ?? []) {
      if (scc.of[u] !== scc.of[edge.to]) continue;
      if (stepCharge(table.value, edge.step) <= 0) continue;
      const back = edge.to === u ? [] : pathBetween(space, edge.to, u);
      if (back === null) continue; // unreachable within one SCC by construction; guard anyway
      const cycle = [edge.step, ...back];
      let cycleGain = 0;
      for (const s of cycle) cycleGain += stepCharge(table.value, s);
      return ok({ kind: "unbounded", prefix: traceTo(space, u), cycle, cycleGain, coverage, notes: space.notes });
    }
  }

  // Every in-component edge now charges zero, so the maximum is a DP over the condensation in
  // topological order. Arrival at a component is all that matters: nothing accrues inside it.
  const count = scc.count;
  const dist: number[] = new Array<number>(count).fill(Number.NEGATIVE_INFINITY);
  const entry: number[] = new Array<number>(count).fill(-1);
  const pred: ({ readonly viaNode: number; readonly edge: SpaceEdge } | null)[] =
    new Array<{ viaNode: number; edge: SpaceEdge } | null>(count).fill(null);

  const initialScc = scc.of[0] ?? 0;
  dist[initialScc] = 0;
  entry[initialScc] = 0;

  for (const component of scc.topological) {
    const base = dist[component];
    if (base === undefined || base === Number.NEGATIVE_INFINITY) continue;
    for (const u of scc.members[component] ?? []) {
      for (const edge of space.edges[u] ?? []) {
        const target = scc.of[edge.to];
        if (target === undefined || target === component) continue;
        const candidate = base + stepCharge(table.value, edge.step);
        if (candidate > (dist[target] ?? Number.NEGATIVE_INFINITY)) {
          dist[target] = candidate;
          entry[target] = edge.to;
          pred[target] = { viaNode: u, edge };
        }
      }
    }
  }

  // Per component, the first qualifying node in member order — the deterministic end the selected
  // maximum's trace must finish at. Null entries mean the component contains no selected node.
  const targetNodeOf: (number | null)[] = new Array<number | null>(count).fill(null);
  if (options.target !== null) {
    for (let c = 0; c < count; c += 1) {
      for (const n of scc.members[c] ?? []) {
        if (qualifies(n)) {
          targetNodeOf[c] = n;
          break;
        }
      }
    }
  }

  let best = options.target === null ? initialScc : -1;
  for (let c = 0; c < count; c += 1) {
    if ((dist[c] ?? Number.NEGATIVE_INFINITY) === Number.NEGATIVE_INFINITY) continue;
    if (options.target !== null && targetNodeOf[c] === null) continue;
    if (best === -1 || (dist[c] ?? Number.NEGATIVE_INFINITY) > (dist[best] ?? Number.NEGATIVE_INFINITY)) best = c;
  }
  if (best === -1) return ok({ kind: "none", coverage, notes: space.notes }); // mark[0] already said reachable; guard anyway

  // Reconstruct: predecessor chain between components, stitched with zero-charge wandering from
  // each component's entry node to the node the best edge leaves. Any such path stays inside the
  // component (leaving and returning would merge two components) so it provably charges nothing.
  const segments: (readonly Step[])[] = [];
  let at = best;
  while (at !== initialScc) {
    const link = pred[at];
    if (link === null || link === undefined) break;
    const from = sccOfNode(scc, link.viaNode);
    const entryNode = entry[from] ?? 0;
    const wander = entryNode === link.viaNode ? [] : pathBetween(space, entryNode, link.viaNode) ?? [];
    segments.unshift([...wander, link.edge.step]);
    at = from;
  }
  // Under a selection the trace must END at a selected node, so a final zero-charge wander extends
  // it from the best component's entry to that node — same stays-inside-the-component argument.
  const endNode = targetNodeOf[best] ?? null;
  if (endNode !== null) {
    const entryNode = entry[best] ?? 0;
    if (entryNode !== endNode) segments.push(pathBetween(space, entryNode, endNode) ?? []);
  }
  const trace = segments.flat();

  const breakdown = traceMetric(system, metric, trace, options.end);
  if (!breakdown.ok) return breakdown;
  if (trace.length === 0) {
    // The empty trace loses the initial configuration, so recompute occupancy explicitly.
    const acc = new ChargeAccumulator(table.value);
    const initial = space.configs[0];
    if (initial !== undefined) acc.visitConfiguration(initial);
    const charged = acc.charges();
    return ok({ kind: "finite", total: charged.total, trace, charges: charged.charges, coverage, notes: space.notes });
  }
  return ok({ kind: "finite", total: breakdown.value.total, trace, charges: breakdown.value.charges, coverage, notes: space.notes });
}

// --------------------------------------------------------------------------------------------
// Strongly connected components — Tarjan, iterative
// --------------------------------------------------------------------------------------------

interface Components {
  /** node → component id. */
  readonly of: readonly number[];
  readonly members: readonly (readonly number[])[];
  /** Component ids in topological order of the condensation (sources first). */
  readonly topological: readonly number[];
  readonly count: number;
}

function sccOfNode(scc: Components, node: number): number {
  return scc.of[node] ?? 0;
}

/**
 * Iterative Tarjan. Recursive would be cleaner and would overflow the stack on a deep
 * configuration chain — a 100k-state space is a NORMAL input here, not an edge case.
 */
function stronglyConnected(space: StateSpace): Components {
  const n = space.configs.length;
  const index: number[] = new Array<number>(n).fill(-1);
  const low: number[] = new Array<number>(n).fill(0);
  const onStack: boolean[] = new Array<boolean>(n).fill(false);
  const stack: number[] = [];
  const of: number[] = new Array<number>(n).fill(-1);
  const members: number[][] = [];
  let next = 0;

  interface Frame { readonly node: number; edge: number }

  for (let root = 0; root < n; root += 1) {
    if (index[root] !== -1) continue;
    const frames: Frame[] = [{ node: root, edge: 0 }];
    index[root] = next;
    low[root] = next;
    next += 1;
    stack.push(root);
    onStack[root] = true;

    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      if (frame === undefined) break;
      const edges = space.edges[frame.node] ?? [];
      if (frame.edge < edges.length) {
        const to = edges[frame.edge]?.to;
        frame.edge += 1;
        if (to === undefined) continue;
        if (index[to] === -1) {
          index[to] = next;
          low[to] = next;
          next += 1;
          stack.push(to);
          onStack[to] = true;
          frames.push({ node: to, edge: 0 });
        } else if (onStack[to] === true) {
          low[frame.node] = Math.min(low[frame.node] ?? 0, index[to] ?? 0);
        }
      } else {
        frames.pop();
        const parent = frames[frames.length - 1];
        if (parent !== undefined) {
          low[parent.node] = Math.min(low[parent.node] ?? 0, low[frame.node] ?? 0);
        }
        if (low[frame.node] === index[frame.node]) {
          const component: number[] = [];
          const id = members.length;
          for (;;) {
            const w = stack.pop();
            if (w === undefined) break;
            onStack[w] = false;
            of[w] = id;
            component.push(w);
            if (w === frame.node) break;
          }
          members.push(component);
        }
      }
    }
  }

  // Tarjan completes a component only after every component it reaches, so completion order is
  // reverse topological; reversing it gives sources-first, which is what the DP consumes.
  const topological: number[] = [];
  for (let c = members.length - 1; c >= 0; c -= 1) topological.push(c);
  return { of, members, topological, count: members.length };
}
