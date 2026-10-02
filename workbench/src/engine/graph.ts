/**
 * Graph queries over entities and typed relations.
 *
 * `validate.py`'s `run_graph_query` is the reference for the forms it covers (`direct`,
 * `reachability`, `path`, `shortest-path`) and this module matches it, including the two decisions
 * that matter:
 *
 *   - Adjacency is the UNION across every model in the system. An architectural invariant about the
 *     system is not escapable by declaring the offending edge in a different model.
 *   - Traversal is BFS, so a witness is the SHORTEST path — and therefore the most legible
 *     counterexample a reader will be shown.
 *
 * The composition refusal is the load-bearing behaviour. A multi-hop form over a relation type
 * declaring `composition.path: forbidden` returns `outcome: "unlicensed"` with a refusal sentence
 * (V7). That is a SUCCESSFUL result reporting what the model does not authorize — not an error, and
 * emphatically not `refuted`: `refuted` would assert that no such ownership chain exists, which is
 * a claim the model never made.
 *
 * Six forms go beyond the reference: `all-paths`, `predecessors`, `successors`, `cycles`,
 * `components`, `containment`. `validate.py` refuses them by design ("belongs to the workbench
 * engine"), so there is no behaviour to port and PLAN.md §C.1 is the specification.
 */
import type { CanonDomain, CanonicalSystem, Evidence, GuardOp, QueryResult, Scalar } from "../ir/types.ts";
import {
  bounded, detail, exhaustive, fail, GRAPH_COMPOSING, NOT_APPLICABLE, ok, ORDER_OPS, result,
  unlicensed, verdict,
  type Comparison, type GraphQuery, type GraphWhere, type PropConstraint, type Quantifier, type Res,
  type Verdict,
} from "./types.ts";

/**
 * A graph answer: the schema-shaped result, the structured refusal, and the node sets `Evidence`
 * cannot carry.
 *
 * `Evidence.nodes` is a single flat list, so `all-paths` (many paths) and `components` (many
 * groups) have nowhere schema-shaped to put their full answer. The result therefore reports the
 * shortest/first as the witness and `nodeSets` carries the rest. See the report: the clean fix is a
 * `nodeSets` field on `evidence` in `mage-query.schema.json` and `ir/types.ts`.
 */
export type GraphAnswer = Verdict;

const DEFAULT_MAX_HOPS = 8;

const sorted = (xs: Iterable<string>): readonly string[] => [...xs].sort();

/**
 * Which models carry edges of this type — the `models` half of a structured refusal.
 *
 * Exported for `src/sparql/licensing.ts`. The SPARQL seam builds the same V7 refusal and must name
 * the same models in it; a second copy of this three-line query is how the two would drift apart on
 * a detail nobody re-reads.
 */
export function modelsDeclaring(system: CanonicalSystem, relation: string): readonly string[] {
  return sorted(new Set(system.relations.filter((r) => r.type === relation).map((r) => r.model)));
}

// --------------------------------------------------------------------------------------------
// Adjacency
// --------------------------------------------------------------------------------------------

interface Adjacency {
  readonly out: ReadonlyMap<string, readonly string[]>;
  readonly into: ReadonlyMap<string, readonly string[]>;
  /** Every entity touched by an edge of this type. */
  readonly nodes: readonly string[];
}

function adjacency(system: CanonicalSystem, relation: string): Adjacency {
  // V8 — `symmetric: true` makes the engine traverse each edge both ways without requiring the
  // reverse edge to be declared.
  const symmetric = system.relationTypes.get(relation)?.symmetric === true;
  const out = new Map<string, string[]>();
  const into = new Map<string, string[]>();
  const nodes = new Set<string>();
  const link = (a: string, b: string): void => {
    (out.get(a) ?? out.set(a, []).get(a) as string[]).push(b);
    (into.get(b) ?? into.set(b, []).get(b) as string[]).push(a);
  };
  for (const r of system.relations) {
    if (r.type !== relation) continue;
    nodes.add(r.from);
    nodes.add(r.to);
    link(r.from, r.to);
    if (symmetric) link(r.to, r.from);
  }
  for (const list of out.values()) list.sort();
  for (const list of into.values()) list.sort();
  return { out, into, nodes: sorted(nodes) };
}

const neighbours = (adj: Adjacency, node: string): readonly string[] => adj.out.get(node) ?? [];

/**
 * BFS shortest path. `maxHops` bounds the depth; exceeding it is a BOUNDED search and therefore
 * inconclusive (V22), never "no path exists".
 */
function shortestPath(
  adj: Adjacency, src: string, dst: string, maxHops: number,
): { readonly path: readonly string[] | null; readonly visited: number; readonly truncated: boolean } {
  if (src === dst) return { path: [src], visited: 1, truncated: false };
  const seen = new Set<string>([src]);
  let frontier: readonly (readonly string[])[] = [[src]];
  let hops = 0;
  while (frontier.length > 0) {
    if (hops >= maxHops) return { path: null, visited: seen.size, truncated: true };
    const next: (readonly string[])[] = [];
    for (const route of frontier) {
      const tail = route[route.length - 1];
      if (tail === undefined) continue;
      for (const peer of neighbours(adj, tail)) {
        if (peer === dst) return { path: [...route, peer], visited: seen.size + 1, truncated: false };
        if (seen.has(peer)) continue;
        seen.add(peer);
        next.push([...route, peer]);
      }
    }
    frontier = next;
    hops += 1;
  }
  return { path: null, visited: seen.size, truncated: false };
}

/** Simple paths up to `maxHops` edges, shortest first. Bounded by construction (PLAN §C.1). */
function allSimplePaths(
  adj: Adjacency, src: string, dst: string, maxHops: number,
): { readonly paths: readonly (readonly string[])[]; readonly truncated: boolean } {
  const paths: (readonly string[])[] = [];
  let truncated = false;
  const walk = (route: readonly string[], onPath: ReadonlySet<string>): void => {
    const tail = route[route.length - 1];
    if (tail === undefined) return;
    if (tail === dst && route.length > 1) {
      paths.push(route);
      return;
    }
    if (route.length - 1 >= maxHops) {
      // A longer path might exist beyond the hop bound: record that the enumeration was cut.
      if (neighbours(adj, tail).length > 0) truncated = true;
      return;
    }
    for (const peer of neighbours(adj, tail)) {
      if (onPath.has(peer)) continue;
      walk([...route, peer], new Set([...onPath, peer]));
    }
  };
  if (src === dst) paths.push([src]);
  walk([src], new Set([src]));
  paths.sort((a, b) => a.length - b.length || a.join(">").localeCompare(b.join(">")));
  return { paths, truncated };
}

/** One cycle, as a node list whose first and last element coincide. */
function findCycle(adj: Adjacency): readonly string[] | null {
  const state = new Map<string, 1 | 2>();
  const walk = (node: string, route: readonly string[]): readonly string[] | null => {
    if (state.get(node) === 1) {
      const at = route.indexOf(node);
      return at >= 0 ? [...route.slice(at), node] : [node, node];
    }
    if (state.get(node) === 2) return null;
    state.set(node, 1);
    for (const peer of neighbours(adj, node)) {
      const cyc = walk(peer, [...route, node]);
      if (cyc !== null) return cyc;
    }
    state.set(node, 2);
    return null;
  };
  for (const node of adj.nodes) {
    const cyc = walk(node, []);
    if (cyc !== null) return cyc;
  }
  return null;
}

/** Weakly-connected component: edge direction ignored, which is what "component" means. */
function component(adj: Adjacency, start: string): readonly string[] {
  const seen = new Set<string>([start]);
  const stack = [start];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === undefined) continue;
    for (const peer of [...(adj.out.get(cur) ?? []), ...(adj.into.get(cur) ?? [])]) {
      if (seen.has(peer)) continue;
      seen.add(peer);
      stack.push(peer);
    }
  }
  return sorted(seen);
}

function allComponents(adj: Adjacency): readonly (readonly string[])[] {
  const assigned = new Set<string>();
  const out: (readonly string[])[] = [];
  for (const node of adj.nodes) {
    if (assigned.has(node)) continue;
    const comp = component(adj, node);
    for (const n of comp) assigned.add(n);
    out.push(comp);
  }
  return out;
}

/** Root-to-entity hierarchical path, per §2's `docable/remediation/parser`. */
function containmentPath(system: CanonicalSystem, entity: string): readonly string[] {
  const chain: string[] = [];
  const seen = new Set<string>();
  let cur: string | null = entity;
  while (cur !== null && !seen.has(cur)) {
    seen.add(cur);
    chain.push(cur);
    cur = system.entities.get(cur)?.parent ?? null;
  }
  return chain.reverse();
}

// --------------------------------------------------------------------------------------------
// The `where` join (V20)
// --------------------------------------------------------------------------------------------

type Side = "source" | "target";

interface CompiledComparison {
  readonly leftProp: string;
  readonly rightProp: string;
  readonly op: GuardOp;
  readonly domain: CanonDomain | null;
}

function splitSide(ref: string): Res<{ readonly side: Side; readonly property: string }> {
  const dot = ref.indexOf(".");
  const side = dot > 0 ? ref.slice(0, dot) : "";
  const property = dot > 0 ? ref.slice(dot + 1) : "";
  if ((side !== "source" && side !== "target") || property === "") {
    return fail(`'${ref}' must be written 'source.<property>' or 'target.<property>'.`);
  }
  return ok({ side, property });
}

/** Domains declared for a property name across every entity — validate.py's own V20 procedure. */
function declaredDomains(system: CanonicalSystem, property: string): readonly string[] {
  const out = new Set<string>();
  for (const e of system.entities.values()) {
    const d = e.properties.get(property)?.domain;
    if (typeof d === "string") out.add(d);
  }
  return sorted(out);
}

function compileComparison(system: CanonicalSystem, cmp: Comparison): Res<CompiledComparison> {
  const left = splitSide(cmp.left);
  if (!left.ok) return left;
  const right = splitSide(cmp.right);
  if (!right.ok) return right;
  if (left.value.side !== "source" || right.value.side !== "target") {
    return fail(
      `a where-comparison relates the source endpoint to the target endpoint; ` +
      `'${cmp.left} ${cmp.op} ${cmp.right}' does not.`);
  }
  if (!ORDER_OPS.has(cmp.op)) {
    return ok({ leftProp: left.value.property, rightProp: right.value.property, op: cmp.op, domain: null });
  }
  // V20 — an order comparison is well-typed only under ONE shared domain, and only if that domain
  // is ordered. Checked statically across the entity set, exactly as validate.py does.
  const doms = sorted(new Set([
    ...declaredDomains(system, left.value.property),
    ...declaredDomains(system, right.value.property),
  ]));
  const only = doms.length === 1 ? doms[0] : undefined;
  if (only === undefined) {
    return fail(doms.length === 0
      ? `order comparison ${cmp.left} ${cmp.op} ${cmp.right}: neither side declares a domain, so ` +
        `the comparison is not well-typed (V20).`
      : `order comparison ${cmp.left} ${cmp.op} ${cmp.right} spans different domains ` +
        `(${doms.join(", ")}); V20 requires one shared domain.`);
  }
  const domain = system.domains.get(only);
  if (domain === undefined || domain.kind !== "ordered-enum") {
    return fail(
      `domain '${only}' is not an ordered-enum, so <, >, <= and >= are not defined on it (V20). ` +
      `Partial orders are out of scope for v0.1.`);
  }
  return ok({ leftProp: left.value.property, rightProp: right.value.property, op: cmp.op, domain });
}

function propertyValue(system: CanonicalSystem, entity: string, property: string): Scalar | undefined {
  return system.entities.get(entity)?.properties.get(property)?.value;
}

function satisfiesConstraints(system: CanonicalSystem, entity: string, cs: readonly PropConstraint[]): boolean {
  return cs.every((c) => {
    const value = propertyValue(system, entity, c.property);
    if (value === undefined) return false;
    if (c.op === "eq") return c.values.some((v) => v === value);
    if (c.op === "ne") return c.values.every((v) => v !== value);
    return c.values.some((v) => v === value);
  });
}

function comparisonHolds(system: CanonicalSystem, cmp: CompiledComparison, src: string, dst: string): boolean {
  const left = propertyValue(system, src, cmp.leftProp);
  const right = propertyValue(system, dst, cmp.rightProp);
  if (left === undefined || right === undefined) return false;
  if (cmp.op === "eq") return left === right;
  if (cmp.op === "ne") return left !== right;
  const domain = cmp.domain;
  if (domain === null) return false;
  const l = domain.values.indexOf(String(left));
  const r = domain.values.indexOf(String(right));
  if (l < 0 || r < 0) return false;
  if (cmp.op === "lt") return l < r;
  if (cmp.op === "le") return l <= r;
  if (cmp.op === "gt") return l > r;
  return l >= r;
}

interface Endpoints {
  readonly sources: readonly string[];
  readonly targets: readonly string[];
  readonly pairOk: (src: string, dst: string) => boolean;
}

/**
 * Candidate endpoints. An explicit `from`/`to` pins a side; a `where` clause filters it. Both
 * absent and no `where` is a refusal rather than a vacuous answer — see the report: `validate.py`
 * currently answers `restricted-reaches-public` (which has no `from`/`to`) with a vacuous `holds`,
 * because `_shortest_path(adj, None, None)` takes the `src == dst` early return.
 */
function endpoints(system: CanonicalSystem, q: GraphQuery, adj: Adjacency, where: GraphWhere | null): Res<Endpoints> {
  const universe = adj.nodes.length > 0 ? adj.nodes : sorted(system.entities.keys());
  const compiled: CompiledComparison[] = [];
  for (const cmp of where?.compare ?? []) {
    const c = compileComparison(system, cmp);
    if (!c.ok) return c;
    compiled.push(c.value);
  }
  const sourceCs = where?.source ?? [];
  const targetCs = where?.target ?? [];

  const sources = q.from !== null
    ? [q.from]
    : universe.filter((e) => satisfiesConstraints(system, e, sourceCs));
  const targets = q.to !== null
    ? [q.to]
    : universe.filter((e) => satisfiesConstraints(system, e, targetCs));

  if (q.from === null && q.to === null && sourceCs.length + targetCs.length + compiled.length === 0) {
    return fail(
      `this ${q.form} query names neither endpoint and carries no 'where' clause, so there is no ` +
      `question to answer. Give 'from' and/or 'to', or constrain the endpoints.`);
  }
  for (const [label, id] of [["from", q.from], ["to", q.to]] as const) {
    if (id !== null && !system.entities.has(id)) {
      return fail(`${label}: '${id}' is not a declared entity of this system.`);
    }
  }
  return ok({
    sources,
    targets,
    pairOk: (src, dst) => compiled.every((c) => comparisonHolds(system, c, src, dst)),
  });
}

// --------------------------------------------------------------------------------------------

/**
 * Wrap a result as a verdict, passing an already-built refusal verdict straight through.
 *
 * The union is an adapter, not a shim: `unlicensed()` already produces the structured refusal, and
 * every other exit here produces a bare result. Discriminating on `result` keeps both exits looking
 * the same at the call sites, which is the only way the twelve refusal returns below stay readable.
 */
const answer = (v: Verdict | QueryResult, nodeSets: readonly (readonly string[])[] = []): GraphAnswer =>
  ("result" in v ? v : verdict(v, nodeSets));

const witness = (nodes: readonly string[]): Evidence =>
  ({ shape: "path", role: "witness", steps: [], cycle: null, nodes });

/**
 * Evaluate one graph query.
 *
 * Order of refusals is deliberate: the relation type must exist, then composition must license the
 * form, then the endpoints must make sense. A user who misspelled a relation type should not first
 * be told about path composition.
 */
export function runGraphQuery(
  system: CanonicalSystem, q: GraphQuery, quantifier: Quantifier, systemHash: string,
): GraphAnswer {
  const relType = system.relationTypes.get(q.relation);

  // Containment is not a relation type: §2 declares it on the entity and it yields hierarchical
  // paths by construction, so it is licensed without consulting `composition.path`.
  if (q.form !== "containment" && relType === undefined) {
    return answer(unlicensed(systemHash, `relation type '${q.relation}' is not declared by this system.`));
  }

  if (quantifier === "forall") {
    // Every graph form in v0.1 is existential ("is there a path / a cycle / a successor"). A
    // universal graph claim has no declared form, and the quantifier determines what counts as
    // evidence, so this is refused rather than reinterpreted (§7, V21).
    return answer(unlicensed(systemHash,
      `graph form '${q.form}' is existential: it is established by a witness. There is no ` +
      `universal graph form in v0.1, so quantifier 'forall' has no reading here. Use ` +
      `quantifier: exists, or ask a behavior query.`,
      null, detail("quantifier-mismatch")));
  }

  if (GRAPH_COMPOSING.has(q.form) && relType?.pathComposition === "forbidden") {
    // V7, and the sentence is the spec's own. Note what this is NOT: it is not `refuted`, because
    // `refuted` would assert that no such chain exists — a claim the model never made.
    //
    // The structured half names the distinction the model would need, so an agent can propose
    // `composition.path: allowed` instead of re-asking the same question.
    return answer(unlicensed(systemHash,
      `'${q.relation}' is declared as a direct relation without path-composition semantics. ` +
      `A multi-hop '${q.relation}' query is not licensed by this model.`,
      interpretation(q),
      detail("composition-forbidden",
        [`path-composition semantics for relation type '${q.relation}'`],
        modelsDeclaring(system, q.relation))));
  }

  const adj = adjacency(system, q.relation);
  const maxHops = q.maxHops ?? DEFAULT_MAX_HOPS;
  const interpretedAs = interpretation(q);

  if (q.form === "containment") return containment(system, q, systemHash, interpretedAs);

  if (q.form === "direct") {
    const ends = endpoints(system, q, adj, q.where);
    if (!ends.ok) return answer(unlicensed(systemHash, ends.refusal, interpretedAs));
    for (const src of ends.value.sources) {
      for (const dst of ends.value.targets) {
        if (!ends.value.pairOk(src, dst)) continue;
        if (neighbours(adj, src).includes(dst)) {
          return answer(result({
            outcome: "holds", coverage: exhaustive(adj.nodes.length), systemHash,
            evidence: witness([src, dst]), interpretedAs,
          }));
        }
      }
    }
    return answer(result({
      outcome: "refuted", coverage: exhaustive(adj.nodes.length), systemHash, interpretedAs,
    }));
  }

  if (q.form === "reachability" || q.form === "path" || q.form === "shortest-path") {
    const ends = endpoints(system, q, adj, q.where);
    if (!ends.ok) return answer(unlicensed(systemHash, ends.refusal, interpretedAs));
    let best: readonly string[] | null = null;
    let visited = 0;
    let truncated = false;
    for (const src of ends.value.sources) {
      for (const dst of ends.value.targets) {
        if (!ends.value.pairOk(src, dst)) continue;
        const found = shortestPath(adj, src, dst, maxHops);
        visited += found.visited;
        truncated = truncated || found.truncated;
        if (found.path !== null && (best === null || found.path.length < best.length)) best = found.path;
      }
    }
    if (best !== null) {
      // A witness settles an existential claim on its own; the hop bound did not deny us anything.
      return answer(result({
        outcome: "holds", coverage: exhaustive(visited), systemHash,
        evidence: witness(best), interpretedAs,
      }));
    }
    if (truncated) {
      // V22 — a bounded search that found nothing is INCONCLUSIVE. "No path exists" would be
      // sound only if the whole graph had been walked.
      return answer(result({
        outcome: "inconclusive", coverage: bounded(visited, "depth-limit"), systemHash, interpretedAs,
      }));
    }
    return answer(result({ outcome: "refuted", coverage: exhaustive(visited), systemHash, interpretedAs }));
  }

  if (q.form === "all-paths") {
    const ends = endpoints(system, q, adj, q.where);
    if (!ends.ok) return answer(unlicensed(systemHash, ends.refusal, interpretedAs));
    const found: (readonly string[])[] = [];
    let truncated = false;
    for (const src of ends.value.sources) {
      for (const dst of ends.value.targets) {
        if (!ends.value.pairOk(src, dst)) continue;
        const paths = allSimplePaths(adj, src, dst, maxHops);
        truncated = truncated || paths.truncated;
        found.push(...paths.paths);
      }
    }
    found.sort((a, b) => a.length - b.length || a.join(">").localeCompare(b.join(">")));
    const first = found[0];
    if (first !== undefined) {
      return answer(result({
        outcome: "holds", coverage: exhaustive(found.length), systemHash,
        evidence: witness(first), interpretedAs,
      }), found);
    }
    return answer(result(truncated
      ? { outcome: "inconclusive", coverage: bounded(0, "depth-limit"), systemHash, interpretedAs }
      : { outcome: "refuted", coverage: exhaustive(adj.nodes.length), systemHash, interpretedAs }));
  }

  if (q.form === "predecessors" || q.form === "successors") {
    // `successors` reads `from`; `predecessors` reads `to`, falling back to `from` because
    // "predecessors, from: X" is the natural writing and means the predecessors OF X.
    const focus = q.form === "successors" ? (q.from ?? q.to) : (q.to ?? q.from);
    if (focus === null) {
      return answer(unlicensed(systemHash,
        `a ${q.form} query must name the entity it is about.`, interpretedAs));
    }
    if (!system.entities.has(focus)) {
      return answer(unlicensed(systemHash, `'${focus}' is not a declared entity of this system.`, interpretedAs));
    }
    const nodes = q.form === "successors" ? (adj.out.get(focus) ?? []) : (adj.into.get(focus) ?? []);
    const unique = sorted(new Set(nodes));
    return answer(result({
      outcome: unique.length > 0 ? "holds" : "refuted",
      coverage: exhaustive(adj.nodes.length), systemHash,
      evidence: unique.length > 0 ? witness([focus, ...unique]) : null,
      interpretedAs,
    }), unique.length > 0 ? [unique] : []);
  }

  if (q.form === "cycles") {
    const cycle = findCycle(adj);
    return answer(result({
      outcome: cycle !== null ? "holds" : "refuted",
      coverage: exhaustive(adj.nodes.length), systemHash,
      evidence: cycle !== null ? witness(cycle) : null,
      interpretedAs,
    }), cycle !== null ? [cycle] : []);
  }

  // components
  const groups = allComponents(adj);
  if (q.from !== null) {
    if (!system.entities.has(q.from)) {
      return answer(unlicensed(systemHash, `'${q.from}' is not a declared entity of this system.`, interpretedAs));
    }
    const comp = adj.nodes.includes(q.from) ? component(adj, q.from) : [q.from];
    return answer(result({
      outcome: comp.length > 1 ? "holds" : "refuted",
      coverage: exhaustive(adj.nodes.length), systemHash,
      evidence: comp.length > 1 ? witness(comp) : null,
      interpretedAs,
    }), [comp]);
  }
  const largest = [...groups].sort((a, b) => b.length - a.length || (a[0] ?? "").localeCompare(b[0] ?? ""))[0];
  return answer(result({
    outcome: groups.length > 0 ? "holds" : "refuted",
    coverage: exhaustive(adj.nodes.length), systemHash,
    evidence: largest !== undefined ? witness(largest) : null,
    interpretedAs,
  }), groups);
}

function containment(
  system: CanonicalSystem, q: GraphQuery, systemHash: string, interpretedAs: string,
): GraphAnswer {
  const focus = q.to ?? q.from;
  if (focus === null) {
    return answer(unlicensed(systemHash, "a containment query must name an entity.", interpretedAs));
  }
  if (!system.entities.has(focus)) {
    return answer(unlicensed(systemHash, `'${focus}' is not a declared entity of this system.`, interpretedAs));
  }
  const chain = containmentPath(system, focus);
  if (q.from !== null && q.to !== null) {
    const at = chain.indexOf(q.from);
    const holds = at >= 0 && chain[chain.length - 1] === q.to && q.from !== q.to;
    return answer(result({
      outcome: holds ? "holds" : "refuted",
      coverage: exhaustive(chain.length), systemHash,
      evidence: holds ? witness(chain.slice(at)) : null,
      interpretedAs,
    }), holds ? [chain.slice(at)] : []);
  }
  return answer(result({
    outcome: chain.length > 1 ? "holds" : "refuted",
    coverage: exhaustive(chain.length), systemHash,
    evidence: witness(chain), interpretedAs,
  }), [chain]);
}

/**
 * The question actually evaluated, in plain language (V21), and the non-visual twin of what the
 * renderer will highlight (FR-A11Y-2). Built from the query, never from the answer, so a refusal
 * still says what was asked.
 */
export function interpretation(q: GraphQuery): string {
  const src = q.from ?? "any entity";
  const dst = q.to ?? "any entity";
  const via = `'${q.relation}'`;
  switch (q.form) {
    case "direct": return `Is there a direct ${via} relation from ${src} to ${dst}?`;
    case "reachability":
    case "path": return `Is ${dst} reachable from ${src} through one or more ${via} relations?`;
    case "shortest-path": return `What is the shortest ${via} path from ${src} to ${dst}?`;
    case "all-paths": return `What ${via} paths lead from ${src} to ${dst}?`;
    case "predecessors": return `Which entities point at ${q.to ?? q.from ?? "it"} through ${via}?`;
    case "successors": return `Which entities does ${q.from ?? q.to ?? "it"} point at through ${via}?`;
    case "cycles": return `Does the ${via} graph contain a cycle?`;
    case "components": return q.from === null
      ? `How does ${via} partition the entities into connected components?`
      : `Which entities share a ${via} component with ${q.from}?`;
    case "containment": return q.from !== null && q.to !== null
      ? `Does ${q.from} transitively contain ${q.to}?`
      : `What is the containment path of ${q.to ?? q.from ?? "it"}?`;
  }
}

/** Coverage for a refusal, re-exported so the facade does not reach into this module's internals. */
export const refusalCoverage = NOT_APPLICABLE;
