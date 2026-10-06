/**
 * Semantic extraction: canonical IR -> a renderable scene graph.
 *
 * This is the only module in `src/render/` that reads the IR's shape, which keeps the geometry
 * (`layout.ts`), the picture (`svg.ts`) and the twin (`accessible.ts`) ignorant of how a model is
 * spelled. It reads and never mutates — the component model asserts `renderer -/-> may_mutate ->
 * model-ir`, and a saved query fails the build if that edge appears.
 *
 * Extraction is where the FR-A11Y-2 obligation actually bites: anything the picture will encode
 * positionally (containment as enclosure, a transition as an arrow, a guard as edge text) is
 * captured here as a named field, so the twin restates it instead of the UI guessing it back out
 * of geometry.
 */
import type { CanonicalSystem, Guard, CanonTransition } from "../ir/types.ts";
import type { AccessibleProperty, NodeKind, SceneSubject } from "./types.ts";

export interface SceneNode {
  readonly id: string;
  readonly kind: NodeKind;
  readonly label: string;
  readonly role: "entity" | "state";
  readonly entityType: string | null;
  readonly parent: string | null;
  readonly contains: readonly string[];
  readonly properties: readonly AccessibleProperty[];
  readonly initial: boolean;
}

export interface SceneEdge {
  readonly id: string;
  readonly kind: "relation" | "transition" | "containment";
  readonly from: string;
  readonly to: string;
  readonly label: string | null;
  /** Relation type id, or the `sync` event id of a synchronized transition. */
  readonly via: string | null;
  /** Guards and effects, already phrased. Edge text in the picture; list items in the twin. */
  readonly detail: readonly string[];
}

export interface SceneGraph {
  readonly subject: SceneSubject;
  readonly title: string;
  readonly nodes: readonly SceneNode[];
  readonly edges: readonly SceneEdge[];
  /** Ranking seeds: a machine's initial state, or the entities nothing points at. */
  readonly roots: readonly string[];
  readonly question: string | null;
  /** What the model deliberately does not represent (V24). Belongs in the twin's summary. */
  readonly omits: readonly string[];
}

const OPS: Readonly<Record<Guard["op"], string>> = {
  eq: "=",
  ne: "!=",
  lt: "<",
  le: "<=",
  gt: ">",
  ge: ">=",
};

/** `requires worker.state = held`, `retry_count := retry_count + 1`. */
function transitionDetail(t: CanonTransition): readonly string[] {
  const out: string[] = [];
  for (const g of t.guards) out.push(`requires ${g.ref} ${OPS[g.op]} ${String(g.value)}`);
  for (const e of t.effects) out.push(`${e.variable} := ${e.expression}`);
  return out;
}

/**
 * Declared quantity literals targeting this entity, as attributes.
 *
 * `memory: 20 KB` on a thread's node states two facts the author DECLARED — the dimension and the
 * magnitude, quoted verbatim from `Magnitude.raw`, never re-rounded or re-united. Only point
 * literals qualify: a range or an expression is evaluated elsewhere, and the derived figure
 * belongs to the budget readout, not to a node restating it. The attribute name is the dimension;
 * when several same-dimension literals target one entity, each falls back to its quantity id — the
 * author's own disambiguator — rather than painting two identical `memory:` lines.
 */
function quantityAttributes(system: CanonicalSystem, entityId: string): readonly AccessibleProperty[] {
  const mine = [...system.quantities.values()]
    .flatMap((q) =>
      q.target.kind === "entity" &&
      q.target.ref === entityId &&
      q.dimension !== null &&
      q.value.kind === "point" &&
      q.value.magnitude.fault === null
        ? [{ id: q.id, dimension: q.dimensionRaw, raw: q.value.magnitude.raw }]
        : [],
    )
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const perDimension = new Map<string, number>();
  for (const q of mine) perDimension.set(q.dimension, (perDimension.get(q.dimension) ?? 0) + 1);
  return mine.map((q) => ({
    name: (perDimension.get(q.dimension) ?? 0) > 1 ? q.id : q.dimension,
    value: q.raw,
    domain: null,
  }));
}

function properties(system: CanonicalSystem, entityId: string): readonly AccessibleProperty[] {
  const e = system.entities.get(entityId);
  if (!e) return [];
  const declared = [...e.properties.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, pv]) => ({ name, value: String(pv.value), domain: pv.domain }));
  return [...declared, ...quantityAttributes(system, entityId)];
}

/** In-degree-zero nodes, or — when every node is in a cycle — the lowest id, so ranking has a seed. */
function sourceRoots(ids: readonly string[], edges: readonly SceneEdge[]): readonly string[] {
  const targeted = new Set(edges.filter((e) => e.kind !== "containment").map((e) => e.to));
  const roots = ids.filter((id) => !targeted.has(id));
  if (roots.length > 0) return roots;
  const first = [...ids].sort()[0];
  return first === undefined ? [] : [first];
}

/**
 * A graph model: its entities as boxes, its relations as edges, and containment as BOTH an
 * enclosing region (positional) and an explicit edge (structural). The duplication is the point —
 * enclosure alone would make position the sole carrier of a containment claim.
 */
export function buildGraphScene(system: CanonicalSystem, modelId: string): SceneGraph {
  const model = system.models.get(modelId);
  const present = new Set((model?.entities ?? []).filter((id) => system.entities.has(id)));
  const ids = [...present].sort();

  const edges: SceneEdge[] = [];
  const seen = new Map<string, number>();
  const uniqueId = (base: string): string => {
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}#${n}`;
  };

  for (const r of system.relations) {
    if (r.model !== modelId || !present.has(r.from) || !present.has(r.to)) continue;
    edges.push({
      id: uniqueId(r.id ?? `r:${r.type}:${r.from}:${r.to}`),
      kind: "relation",
      // **No label. The TYPE is not per-edge information** — it is the diagram's vocabulary, and
      // writing it on every edge restates one fact N times. Six edges reading `may_propagate_to`
      // told a reader nothing the arrowheads did not, and cost six text runs competing for the
      // same gaps between boxes. `via` keeps the type as the join key, so the key strip names it
      // once, the arrowhead form carries it in the picture, and the twin's edge description still
      // says `"checkout" may_propagate_to "order-created"` for every single edge.
      label: null,
      from: r.from,
      to: r.to,
      via: r.type,
      detail: [],
    });
  }

  const childrenOf = new Map<string, string[]>();
  for (const id of ids) {
    const kids = (system.entities.get(id)?.contains ?? []).filter((c) => present.has(c));
    if (kids.length > 0) childrenOf.set(id, [...kids].sort());
    for (const c of [...kids].sort()) {
      edges.push({
        id: uniqueId(`c:${id}:${c}`),
        kind: "containment",
        from: id,
        to: c,
        label: "contains",
        via: null,
        detail: [],
      });
    }
  }

  const nodes: SceneNode[] = ids.map((id) => {
    const e = system.entities.get(id);
    const kids = childrenOf.get(id) ?? [];
    const parent = e?.parent !== null && e?.parent !== undefined && present.has(e.parent) ? e.parent : null;
    return {
      id,
      kind: kids.length > 0 ? ("region" as NodeKind) : ("entity" as NodeKind),
      label: e?.label !== undefined && e.label !== "" ? e.label : id,
      role: "entity",
      entityType: e?.type ?? null,
      parent,
      contains: kids,
      properties: properties(system, id),
      initial: false,
    };
  });

  // Ranking seeds consider only OUTER nodes: a region's children sit inside it and are not ranked.
  const outer = nodes.filter((n) => n.parent === null).map((n) => n.id);
  return {
    subject: { kind: "model", id: modelId },
    title: model?.label !== undefined && model.label !== "" ? model.label : modelId,
    nodes,
    edges,
    roots: sourceRoots(outer, edges.filter((e) => outer.includes(e.from) && outer.includes(e.to))),
    question: model?.purpose.question ?? null,
    omits: model?.purpose.omits ?? [],
  };
}

/**
 * A machine: its control states as nodes, its transitions as edges. Ranking seeds from the INITIAL
 * state, because a lifecycle is almost always cyclic and in-degree-zero would find no seed at all.
 */
export function buildMachineScene(system: CanonicalSystem, machineId: string): SceneGraph {
  const m = system.machines.get(machineId);
  const states = [...(m?.states ?? [])].sort();
  const initial = m?.initial ?? "";
  // A transition may name a state the author never declared; the renderer shows what the model
  // says rather than silently hiding the dangling end. The validator is what complains about it.
  const declared = new Set(states);
  const extra = new Set<string>();
  for (const t of m?.transitions ?? []) {
    if (!declared.has(t.from)) extra.add(t.from);
    if (!declared.has(t.to)) extra.add(t.to);
  }
  if (initial !== "" && !declared.has(initial)) extra.add(initial);
  const ids = [...states, ...[...extra].sort()];

  const edges: SceneEdge[] = (m?.transitions ?? []).map((t) => ({
    id: `t:${machineId}:${t.index}`,
    kind: "transition" as const,
    from: t.from,
    to: t.to,
    // **KEPT, unlike a relation's type.** An event name is not a repeated type label: `acquire` and
    // `retry` name DIFFERENT events on different transitions, so the text is topology-bearing and a
    // key strip cannot carry it — there is nothing to say once. Two states joined by two
    // transitions are distinguishable only by these words. Reading "do not write relation
    // semantics on every edge" as "delete all edge text" would strip real content from behaviour
    // diagrams; what makes it safe to keep is that the engine now reserves a sized box for each one.
    label: t.label ?? t.sync,
    via: t.sync,
    detail: transitionDetail(t),
  }));

  const nodes: SceneNode[] = ids.map((id) => ({
    id,
    kind: "state" as NodeKind,
    label: id,
    role: "state" as const,
    entityType: null,
    parent: null,
    contains: [],
    properties: [],
    initial: id === initial,
  }));

  return {
    subject: { kind: "machine", id: machineId },
    title: m?.entity !== null && m?.entity !== undefined ? `${machineId} (${m.entity})` : machineId,
    nodes,
    edges,
    roots: ids.includes(initial) ? [initial] : sourceRoots(ids, edges),
    question: m?.purpose.question ?? null,
    omits: m?.purpose.omits ?? [],
  };
}

export function buildScene(system: CanonicalSystem, subject: SceneSubject): SceneGraph {
  return subject.kind === "model"
    ? buildGraphScene(system, subject.id)
    : buildMachineScene(system, subject.id);
}
