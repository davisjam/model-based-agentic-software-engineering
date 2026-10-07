/**
 * The structured twin — FR-A11Y-2's "equivalent accessible representation", built here rather than
 * reconstructed by the UI.
 *
 * The renderer knows what it drew and why. Asking the UI to recover "this arrow is step 3 of the
 * witness" from a polyline and a class name would be guesswork, and guesswork is how the colour
 * channel ends up load-bearing. So every visual decision is emitted twice, once as geometry and
 * once as a fact: containment as `contains`, the initial marker as `initial`, an arrow as a from/to
 * pair, a highlighted path as a NUMBERED LIST OF STEPS. A witness trace is a list of steps before
 * it is a coloured path.
 *
 * Two soundness rules are enforced here rather than left to the UI:
 *
 * - **V22.** Evidence gathered under bounded coverage never receives the counterexample treatment
 *   and is never described as refuting anything. "No such trace exists" is sound only under
 *   exhaustive coverage.
 * - **Stale results.** The scene carries the system hash it depicts, for the same reason
 *   `QueryResult` does: a view outliving its model is the failure mode the analysis-execution model
 *   exists to prevent.
 */
import { systemHash } from "../ir/hash.ts";
import type {
  CanonicalSystem,
  Coverage,
  Evidence,
  EvidenceRole,
  Outcome,
  EvidenceStep,
} from "../ir/types.ts";
import type { SceneEdge, SceneGraph } from "./scene.ts";
import { variableLine } from "./scene.ts";
import type {
  AccessibleEdge,
  AccessibleEvidence,
  AccessibleNode,
  AccessibleScene,
  AccessibleStep,
  AccessibleVariable,
  EmphasisAssignment,
  ArrowForm,
  EmphasisKind,
  KeyEntry,
  Layout,
  LegendEntry,
  NodeClaim,
  SceneRequest,
} from "./types.ts";
import {
  ARROW_FORMS, MARKS, MARK_MEANINGS, NOTATION_MEANINGS, RELATION_CLASSES, SHAPE_MEANINGS,
} from "./types.ts";
import { claimsByTarget, inNodeLines, subLabelFits, transitionSubLabel } from "./layout.ts";

const quote = (s: string): string => `"${s}"`;

/**
 * Bounded coverage downgrades every evidence treatment, witness or counterexample alike. A
 * counterexample found inside a truncated exploration is still only a candidate as far as this view
 * is concerned, and must not be shown with the force of a proof.
 */
export function evidenceEmphasisKind(role: EvidenceRole, coverage: Coverage | null | undefined): EmphasisKind {
  if (coverage?.kind === "bounded") return "evidence-inconclusive";
  return role === "counterexample" ? "violation" : "evidence";
}

/**
 * What this view is willing to SAY the outcome was. The engine's own value is carried verbatim in
 * `AccessibleScene.outcome`; this is the presentation rule, and it refuses to put refuting force
 * behind a truncated exploration (V22).
 */
export function presentableOutcome(
  outcome: Outcome | null | undefined,
  coverage: Coverage | null | undefined,
): Outcome | null {
  if (outcome === null || outcome === undefined) return null;
  if (coverage?.kind === "bounded" && outcome === "refuted") return "inconclusive";
  return outcome;
}

// --------------------------------------------------------------------------------------------
// Evidence as a list
// --------------------------------------------------------------------------------------------

/** Only what actually changed: `document: waiting -> processing`, `retry_count: 0 -> 1`. */
function stepChanges(s: EvidenceStep): readonly string[] {
  const out: string[] = [];
  for (const [inst, to] of Object.entries(s.to.control).sort()) {
    const from = s.from.control[inst];
    if (from !== to) out.push(`${inst}: ${from ?? "(unset)"} -> ${to}`);
  }
  for (const [k, to] of Object.entries(s.to.values).sort()) {
    const from = s.from.values[k];
    if (from !== to) out.push(`${k}: ${from === undefined ? "(unset)" : String(from)} -> ${String(to)}`);
  }
  return out;
}

function describeStep(index: number, s: EvidenceStep, inCycle: boolean): AccessibleStep {
  const changes = stepChanges(s);
  const who = s.instances.length === 0 ? "the system" : s.instances.join(" and ");
  const what =
    s.sync !== null
      ? `synchronized event ${quote(s.sync)} fires`
      : s.label !== null
        ? `${who} takes ${quote(s.label)}`
        : `${who} takes an unlabelled transition`;
  const tail = changes.length === 0 ? "no change to the configuration" : changes.join("; ");
  return {
    index,
    instances: s.instances,
    sync: s.sync,
    label: s.label,
    changes,
    inCycle,
    description: `Step ${index}: ${what}${inCycle ? " (inside the repeating cycle)" : ""}; ${tail}.`,
  };
}

export function describeEvidence(
  evidence: Evidence,
  coverage: Coverage | null | undefined,
): AccessibleEvidence {
  const cycleLength = evidence.shape === "lasso" ? (evidence.cycle?.length ?? 0) : 0;
  const prefixLength = evidence.steps.length - cycleLength;
  const steps = evidence.steps.map((s, i) => describeStep(i + 1, s, cycleLength > 0 && i >= prefixLength));
  const cycleStartIndex = cycleLength > 0 ? prefixLength + 1 : null;

  const kindWord = evidence.role === "witness" ? "witness" : "counterexample";
  const shapeWord =
    evidence.shape === "lasso"
      ? `lasso: ${prefixLength} step${prefixLength === 1 ? "" : "s"} then a cycle of ${cycleLength}`
      : evidence.shape === "path"
        ? `path of ${evidence.nodes?.length ?? 0} nodes`
        : `${evidence.shape} of ${evidence.steps.length} step${evidence.steps.length === 1 ? "" : "s"}`;
  const caveat =
    coverage?.kind === "bounded"
      ? " Coverage was bounded, so this is a candidate rather than a proof."
      : "";
  return {
    shape: evidence.shape,
    role: evidence.role,
    steps,
    cycleStartIndex,
    nodes: evidence.nodes,
    description: `A ${kindWord} as a ${shapeWord}.${caveat}`,
  };
}

// --------------------------------------------------------------------------------------------
// Evidence -> emphasis
// --------------------------------------------------------------------------------------------

/** Lowest id wins, so the choice of edge for a step does not depend on scene listing order. */
function matchTransition(
  edges: readonly SceneEdge[],
  from: string,
  to: string,
  sync: string | null,
  label: string | null,
): SceneEdge | null {
  const candidates = edges
    .filter((e) => e.kind === "transition" && e.from === from && e.to === to)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const exact = candidates.find((e) => e.via === sync && (label === null || e.label === label));
  return exact ?? candidates[0] ?? null;
}

/**
 * Maps a trace onto the scene. The `step` number on each assignment is the join key between the
 * picture and the textual list — and, for the `evidence` treatment, it IS the marker glyph, so the
 * diagram reads as "1, 2, 3" rather than as a colour.
 */
export function deriveEvidenceEmphasis(
  system: CanonicalSystem,
  scene: SceneGraph,
  evidence: Evidence,
  coverage: Coverage | null | undefined,
): readonly EmphasisAssignment[] {
  const kind = evidenceEmphasisKind(evidence.role, coverage);
  const out: EmphasisAssignment[] = [];
  const nodeIds = new Set(scene.nodes.map((n) => n.id));

  if (scene.subject.kind === "machine") {
    const mine = new Set(
      system.instances.filter((i) => i.machine === scene.subject.id).map((i) => i.id),
    );
    evidence.steps.forEach((s, i) => {
      const step = i + 1;
      for (const inst of [...s.instances].sort()) {
        if (!mine.has(inst)) continue;
        const from = s.from.control[inst];
        const to = s.to.control[inst];
        if (from === undefined || to === undefined) continue;
        for (const st of from === to ? [from] : [from, to]) {
          if (nodeIds.has(st)) {
            out.push({ target: st, kind, reason: `state occupied at step ${step} of the ${evidence.role}`, step });
          }
        }
        const edge = matchTransition(scene.edges, from, to, s.sync, s.label);
        if (edge !== null) {
          out.push({ target: edge.id, kind, reason: `step ${step} of the ${evidence.role}`, step });
        }
      }
    });
    return out;
  }

  // Graph evidence: a node sequence. Consecutive pairs name the relation edges that carried it.
  const path = evidence.nodes ?? [];
  path.forEach((id, i) => {
    if (!nodeIds.has(id)) return;
    out.push({ target: id, kind, reason: `position ${i + 1} on the ${evidence.role} path`, step: i + 1 });
  });

  // THE HOPS, all or none — and the "none" arm is a soundness rule, not a fallback.
  //
  // `Evidence` records WHICH nodes a graph answer travelled through and not which relation carried
  // it, so matching an edge on its `(from, to)` pair alone is the only join available here. That
  // join is sound exactly when the scene is the model the answer was computed over, and unsound
  // otherwise. The shipped case that exposed it: a system declaring two purposeful models over one
  // identity namespace, one with a composable propagation relation and one keeping publication and
  // subscription distinct with composition FORBIDDEN. A witness found over the composable model,
  // drawn over the other, matched two of its publication edges by their endpoint pairs and numbered
  // them as hops of a path — so the picture asserted a composition that model explicitly declines.
  // Rendering deciding semantics, which is the one thing it may never do.
  //
  // A partial match is the tell, and it is a reliable one: a scene is built from ONE model subject,
  // so a genuine path over that model's relation resolves EVERY consecutive pair. Resolving some is
  // therefore proof that this is not the model that carried the answer, and the hops are dropped
  // together. The nodes stay — the entities really are named by the answer, under shared identity —
  // so a reader still sees who is involved, and `AccessibleScene.evidence` still carries the ordered
  // step list that is the witness's primary form.
  //
  // The machine arm above has had this guard since it was written (`mine.has(inst)` — "evidence for
  // another machine does not leak into this machine's view"). This is the same rule for the other
  // arm, which is why it reads as a restatement rather than as a new policy.
  const hops: EmphasisAssignment[] = [];
  for (let i = 0; i + 1 < path.length; i += 1) {
    const from = path[i] as string;
    const to = path[i + 1] as string;
    const edge = scene.edges
      .filter((e) => e.kind === "relation" && e.from === from && e.to === to)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0];
    if (edge === undefined) return out;
    hops.push({ target: edge.id, kind, reason: `hop ${i + 1} of the ${evidence.role} path`, step: i + 1 });
  }
  out.push(...hops);
  return out;
}

// --------------------------------------------------------------------------------------------
// The scene
// --------------------------------------------------------------------------------------------

const LEGEND_ORDER: readonly EmphasisKind[] = [
  "selected",
  "evidence",
  "evidence-inconclusive",
  "violation",
  "added",
  "removed",
  "changed",
  "deemphasized",
];

/** `may_propagate_to` -> `may propagate to`. The id stays the join key; this is for reading. */
const humanize = (id: string): string => id.replace(/[_-]+/g, " ").trim();

/**
 * The diagram's visual vocabulary, derived from what the scene actually contains.
 *
 * **This is where the repeated edge text went.** A relation type written on every edge is one fact
 * restated N times; here it is stated once, against the arrowhead form and stroke class that carry
 * it in the picture. Node SHAPES get rows too — three outlines have been drawn since Wave 0 with
 * nothing anywhere saying what they mean, which is the cheaper half of the same omission.
 *
 * Relation types are sorted, so the form/class assignment is a function of the model rather than of
 * the order the author happened to declare its relations in.
 */
function keyFor(
  scene: SceneGraph,
  show: ReadonlySet<string> | null,
  claims: ReadonlyMap<string, readonly NodeClaim[]> = new Map(),
): readonly KeyEntry[] {
  const out: KeyEntry[] = [];
  // When any leaf box carries attribute sub-lines, the key row for its shape SAYS so — small text
  // inside a box that no key names would be a private convention, which is the legend ruling's
  // whole complaint. Stated per shape kind, because entities and states can both carry attributes.
  const annotated = new Set(
    scene.nodes.filter((n) => inNodeLines(n.properties, show).length > 0).map((n) => n.kind),
  );
  // And the same disclosure for claim sub-lines: a verdict glyph inside a box is a convention the
  // key must name, per shape kind that carries one.
  const claimed = new Set(
    scene.nodes.filter((n) => (claims.get(n.id) ?? []).length > 0).map((n) => n.kind),
  );

  const types = [
    ...new Set(
      scene.edges
        .filter((e) => e.kind === "relation" && e.via !== null)
        .map((e) => e.via as string),
    ),
  ].sort();
  types.forEach((id, i) => {
    out.push({
      channel: "relation",
      id,
      form: ARROW_FORMS[i % ARROW_FORMS.length] as ArrowForm,
      className: RELATION_CLASSES[i % RELATION_CLASSES.length] as string,
      meaning: humanize(id),
    });
  });

  const kinds = [...new Set(scene.nodes.map((n) => n.kind))].sort();
  for (const kind of kinds) {
    const clauses = [
      SHAPE_MEANINGS[kind],
      ...(annotated.has(kind) ? ["small text inside lists its declared attributes"] : []),
      ...(claimed.has(kind) ? ["marked lines inside name tracked claims it participates in"] : []),
    ];
    out.push({
      channel: "shape", id: kind, form: kind, className: `mage-shape-${kind}`,
      meaning: clauses.join("; "),
    });
  }

  // The UML statechart notation rows — present exactly when the mark is in the picture, like the
  // attribute and claim disclosures above. A guard or effect is "in the picture" when its
  // transition's `[guard] / effect` line actually renders (the whole-line-or-nowhere fit rule);
  // the variables compartment, whenever the machine declares a variable.
  const rendered = scene.edges.filter((e) => {
    const line = transitionSubLabel(e.guard, e.effect);
    return line !== null && subLabelFits(line);
  });
  if (rendered.some((e) => e.guard !== null)) {
    out.push({
      channel: "notation", id: "guard", form: "guard",
      className: "mage-edge-sublabel", meaning: NOTATION_MEANINGS.guard,
    });
  }
  if (rendered.some((e) => e.effect !== null)) {
    out.push({
      channel: "notation", id: "effect", form: "effect",
      className: "mage-edge-sublabel", meaning: NOTATION_MEANINGS.effect,
    });
  }
  if (scene.variables.length > 0) {
    out.push({
      channel: "notation", id: "variables", form: "variables",
      className: "mage-varbox", meaning: NOTATION_MEANINGS.variables,
    });
  }
  return out;
}

function legendFor(used: ReadonlySet<EmphasisKind>): readonly LegendEntry[] {
  return LEGEND_ORDER.filter((k) => used.has(k)).map((kind) => ({
    kind,
    glyph: MARKS[kind].glyph,
    strokeWidth: MARKS[kind].strokeWidth,
    dashArray: MARKS[kind].dashArray,
    meaning: MARK_MEANINGS[kind],
  }));
}

function coverageSentence(c: Coverage | null | undefined): string | null {
  if (c === null || c === undefined) return null;
  if (c.kind === "not-applicable") return "Coverage: not applicable to this question.";
  if (c.kind === "exhaustive") {
    return `Coverage: exhaustive over ${c.statesExplored} configuration${c.statesExplored === 1 ? "" : "s"}.`;
  }
  const why = c.reason === null ? "a limit was reached" : `stopped at the ${c.reason.replace("-", " ")}`;
  return `Coverage: bounded — ${why} after ${c.statesExplored} configuration${c.statesExplored === 1 ? "" : "s"}, so absence of evidence proves nothing.`;
}

function outcomeSentence(
  engine: Outcome | null | undefined,
  coverage: Coverage | null | undefined,
  refusal: string | null | undefined,
): string | null {
  const shown = presentableOutcome(engine, coverage);
  if (shown === null) return null;
  if (shown === "unlicensed") {
    const why = refusal ?? "the model does not authorize this question.";
    return `Result: unlicensed — ${why}`;
  }
  if (shown === "inconclusive" && engine === "refuted") {
    // Deliberately not "refuted": the engine's value is preserved in `outcome`, but a truncated
    // exploration is never PRESENTED as a disproof.
    return "Result: inconclusive — the exploration was bounded, so this view does not present it as a disproof.";
  }
  if (shown === "inconclusive") return "Result: inconclusive — the exploration did not settle the claim.";
  if (shown === "holds") return "Result: holds.";
  return "Result: refuted, with a counterexample below.";
}

function nodeDescription(
  n: AccessibleNode,
  incoming: readonly AccessibleEdge[],
  outgoing: readonly AccessibleEdge[],
): string {
  const head =
    n.role === "state"
      ? `State ${quote(n.label)}${n.initial ? ", the initial state" : ""}`
      : `Entity ${quote(n.label)}${n.entityType === null ? "" : ` of type ${n.entityType}`}`;
  const parts: string[] = [head];
  if (n.parent !== null) parts.push(`contained in ${quote(n.parent)}`);
  if (n.contains.length > 0) parts.push(`contains ${n.contains.map(quote).join(", ")}`);
  for (const p of n.properties) parts.push(`${p.name} is ${p.value}`);
  // The claims this node participates in, verdicts included — every one, whether or not the
  // picture had room for its sub-line. The glyph is decoration; the WORD carries the status here.
  for (const c of n.claims) parts.push(`participates in claim ${quote(c.statement)} — ${c.word}`);
  if (incoming.length > 0) {
    parts.push(`entered from ${incoming.map((e) => `${quote(e.from)}${e.label === null ? "" : ` via ${e.label}`}`).join(", ")}`);
  }
  if (outgoing.length > 0) {
    parts.push(`leads to ${outgoing.map((e) => `${quote(e.to)}${e.label === null ? "" : ` via ${e.label}`}`).join(", ")}`);
  }
  if (n.emphasis.length > 0) parts.push(n.emphasis.map((e) => e.reason).join("; "));
  return `${parts.join("; ")}.`;
}

function edgeDescription(e: SceneEdge, fromLabel: string, toLabel: string, emphasis: readonly EmphasisAssignment[]): string {
  const head =
    e.kind === "containment"
      ? `${quote(fromLabel)} contains ${quote(toLabel)}`
      : e.kind === "relation"
        ? `${quote(fromLabel)} ${e.via ?? "relates to"} ${quote(toLabel)}`
        : `Transition from ${quote(fromLabel)} to ${quote(toLabel)}${
            e.via !== null ? `, synchronized on ${quote(e.via)}` : e.label !== null ? `, labelled ${quote(e.label)}` : ""
          }`;
  const parts = [head, ...e.detail, ...emphasis.map((a) => a.reason)];
  return `${parts.join("; ")}.`;
}

/**
 * Build the twin. Takes the already-computed layout so that reading order matches the picture's
 * rank/lane order — a convenience for a sighted user comparing the two, never a carrier of meaning.
 */
export function buildAccessibleScene(
  system: CanonicalSystem,
  scene: SceneGraph,
  layout: Layout,
  req: SceneRequest,
  emphasis: readonly EmphasisAssignment[],
): AccessibleScene {
  const byTarget = new Map<string, EmphasisAssignment[]>();
  for (const a of emphasis) {
    const list = byTarget.get(a.target);
    if (list === undefined) byTarget.set(a.target, [a]);
    else list.push(a);
  }

  const labelOf = (id: string): string => scene.nodes.find((n) => n.id === id)?.label ?? id;

  const edges: AccessibleEdge[] = scene.edges.map((e) => {
    const laid = layout.edges.find((l) => l.id === e.id);
    const own = byTarget.get(e.id) ?? [];
    const fromLabel = labelOf(e.from);
    const toLabel = labelOf(e.to);
    return {
      id: e.id,
      kind: e.kind,
      from: e.from,
      to: e.to,
      fromLabel,
      toLabel,
      via: e.via,
      label: e.label,
      backedge: laid?.backedge ?? false,
      emphasis: own,
      description: edgeDescription(e, fromLabel, toLabel, own),
    };
  });

  // Reading order: rank, then lane, then id. Region children follow their region.
  const readingOrder = [...scene.nodes].sort((a, b) => {
    const la = layout.nodes.get(a.id);
    const lb = layout.nodes.get(b.id);
    const ra = la?.rank ?? 0;
    const rb = lb?.rank ?? 0;
    if (ra !== rb) return ra - rb;
    const oa = la?.order ?? 0;
    const ob = lb?.order ?? 0;
    if (oa !== ob) return oa - ob;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const claims = claimsByTarget(req.claims);
  const nodes: AccessibleNode[] = readingOrder.map((n, i) => {
    const partial: AccessibleNode = {
      id: n.id,
      label: n.label,
      kind: n.kind,
      role: n.role,
      entityType: n.entityType,
      parent: n.parent,
      contains: n.contains,
      properties: n.properties,
      claims: claims.get(n.id) ?? [],
      initial: n.initial,
      emphasis: byTarget.get(n.id) ?? [],
      readingIndex: i + 1,
      rank: layout.nodes.get(n.id)?.rank ?? 0,
      description: "",
    };
    const incoming = edges.filter((e) => e.to === n.id && e.kind !== "containment");
    const outgoing = edges.filter((e) => e.from === n.id && e.kind !== "containment");
    return { ...partial, description: nodeDescription(partial, incoming, outgoing) };
  });

  const accessibleEvidence =
    req.evidence === null || req.evidence === undefined
      ? null
      : describeEvidence(req.evidence, req.coverage);

  // The variables, restated for the twin with the SAME declaration line the compartment draws —
  // one composer, so a guard a sighted user reads and a screen-reader user cannot is unreachable.
  const variables: AccessibleVariable[] = scene.variables.map((v) => ({
    id: v.id,
    kind: v.kind,
    domain: v.domain,
    initial: v.initial,
    declaration: variableLine(v),
    description: `Variable ${quote(v.id)}: ${v.kind}${v.domain === null ? "" : `, domain ${v.domain}`}, initially ${v.initial}.`,
  }));

  const used = new Set<EmphasisKind>(emphasis.map((a) => a.kind));
  const subjectWord = scene.subject.kind === "machine" ? "state machine" : "graph model";
  const summary = [
    `${subjectWord} ${quote(scene.title)}: ${nodes.length} node${nodes.length === 1 ? "" : "s"}, ${edges.length} relation${edges.length === 1 ? "" : "s"}.`,
    variables.length === 0
      ? null
      : `Variables: ${variables.map((v) => v.declaration).join("; ")}.`,
    scene.question === null ? null : `Question: ${scene.question}`,
    scene.includes.length === 0 ? null : `Includes: ${scene.includes.join(", ")}.`,
    scene.omits.length === 0 ? null : `Deliberately omits: ${scene.omits.join(", ")}.`,
    outcomeSentence(req.outcome, req.coverage, req.refusal),
    coverageSentence(req.coverage),
    accessibleEvidence?.description ?? null,
    `System: ${systemHash(system)}.`,
  ]
    .filter((s): s is string => s !== null)
    .join(" ");

  return {
    title: scene.title,
    summary,
    question: scene.question,
    includes: scene.includes,
    omits: scene.omits,
    subject: scene.subject,
    systemHash: systemHash(system),
    direction: layout.direction,
    nodes,
    edges,
    variables,
    evidence: accessibleEvidence,
    outcome: req.outcome ?? null,
    coverage: req.coverage ?? null,
    refusal: req.refusal ?? null,
    legend: legendFor(used),
    key: keyFor(scene, req.showProperties === undefined ? null : new Set(req.showProperties), claims),
  };
}
