/**
 * The non-visual twin of a result (FR-A11Y-2).
 *
 * A witness trace is a list of steps before it is a coloured path, and a counterexample is a
 * sentence before it is a red node. The engine knows what it concluded and why, so it emits the
 * structured representation itself rather than leaving the UI to reconstruct semantics from
 * geometry — which is the same argument the renderer gets in PLAN.md §4.3, applied one layer in.
 *
 * This is STRUCTURED, not prose: each step carries its moving instances, its event, and the
 * per-reference before/after deltas, so a screen reader reads a table and a browser agent reads
 * data. The `text` field is a convenience rendering of those fields, never the only carrier.
 *
 * Why it lives here rather than on `QueryResult`: `QueryResult` is kernel-owned (Phase A) and this
 * phase does not edit the kernel. Hoisting `Narration` into `src/ir/types.ts` once Phase F settles
 * the services facade is flagged in the report.
 */
import type {
  EvidenceRole, EvidenceShape, EvidenceStep, QueryResult, ResultMagnitude, Scalar,
  StepConfiguration,
} from "../ir/types.ts";

export interface Delta {
  readonly ref: string;
  readonly from: Scalar | null;
  readonly to: Scalar | null;
}

export interface NarratedStep {
  /** 1-based, because this is read aloud. */
  readonly position: number;
  readonly instances: readonly string[];
  readonly sync: string | null;
  readonly label: string | null;
  readonly changed: readonly Delta[];
  /** True once this step is part of the repeating segment of a lasso. */
  readonly repeating: boolean;
  readonly text: string;
}

export interface NarratedEvidence {
  readonly shape: EvidenceShape;
  readonly role: EvidenceRole;
  readonly summary: string;
  readonly steps: readonly NarratedStep[];
  readonly nodes: readonly string[] | null;
}

export interface Narration {
  readonly outcome: QueryResult["outcome"];
  readonly headline: string;
  readonly coverage: string;
  readonly interpretedAs: string | null;
  readonly refusal: string | null;
  readonly disclosures: readonly string[];
  readonly systemHash: string;
  /** The computed figure, carried structurally — the headline speaks it, this field IS it. */
  readonly magnitude: ResultMagnitude | null;
  readonly evidence: NarratedEvidence | null;
}

const OUTCOME_SENTENCE: Readonly<Record<QueryResult["outcome"], string>> = {
  holds: "Established.",
  refuted: "Refuted.",
  inconclusive: "Inconclusive — the explored region does not settle the question.",
  unlicensed: "Not licensed by this model.",
};

function coverageSentence(c: QueryResult["coverage"]): string {
  if (c.kind === "not-applicable") return "Coverage does not apply: no search was performed.";
  if (c.kind === "exhaustive") {
    return `Exhaustive with respect to the question, after exploring ${c.statesExplored} ` +
      `configuration${c.statesExplored === 1 ? "" : "s"}.`;
  }
  return `Bounded: ${c.statesExplored} configuration${c.statesExplored === 1 ? "" : "s"} explored ` +
    `before the ${c.reason ?? "limit"} stopped the search. "Not found" therefore means "not found ` +
    `in the explored region", not "does not exist".`;
}

function deltas(from: StepConfiguration, to: StepConfiguration): readonly Delta[] {
  const out: Delta[] = [];
  for (const [id, after] of Object.entries(to.control)) {
    const before = from.control[id];
    if (before !== after) out.push({ ref: `${id}.state`, from: before ?? null, to: after });
  }
  for (const [key, after] of Object.entries(to.values)) {
    const before = from.values[key];
    if (before !== after) out.push({ ref: key, from: before ?? null, to: after });
  }
  return out.sort((a, b) => a.ref.localeCompare(b.ref));
}

function narrateStep(step: EvidenceStep, position: number, repeating: boolean): NarratedStep {
  const changed = deltas(step.from, step.to);
  const who = step.instances.length > 1
    ? `${step.instances.join(" and ")} move together`
    : `${step.instances[0] ?? "the system"} moves`;
  const how = step.sync !== null
    ? ` on the declared event '${step.sync}', atomically`
    : step.label !== null ? ` by '${step.label}'` : "";
  const effect = changed.length === 0
    ? " with no observable change"
    : `: ${changed.map((d) => `${d.ref} ${String(d.from)} -> ${String(d.to)}`).join(", ")}`;
  return {
    position, instances: step.instances, sync: step.sync, label: step.label, changed, repeating,
    text: `${who}${how}${effect}.`,
  };
}

/**
 * Build the narration. Total: a refusal narrates as a refusal, and a result with no evidence
 * narrates without an evidence block rather than with an empty one.
 */
export function narrate(res: QueryResult): Narration {
  const ev = res.evidence;
  const prefix = ev?.steps ?? [];
  const cycle = ev?.cycle ?? [];
  const steps = [
    ...prefix.map((s, i) => narrateStep(s, i + 1, false)),
    ...cycle.map((s, i) => narrateStep(s, prefix.length + i + 1, true)),
  ];

  const summary = ev === null ? "" : ev.shape === "lasso"
    ? `A lasso: ${prefix.length} step${prefix.length === 1 ? "" : "s"} to the target, then a ` +
      `${cycle.length}-step segment that returns to it.`
    : ev.shape === "path"
      ? `A path of ${Math.max(0, (ev.nodes?.length ?? 1) - 1)} relation${(ev.nodes?.length ?? 1) - 1 === 1 ? "" : "s"}: ` +
        `${(ev.nodes ?? []).join(" -> ")}.`
      : `A ${ev.role} of ${steps.length} step${steps.length === 1 ? "" : "s"}.`;

  const figure = res.magnitude === null
    ? ""
    : ` The computed figure is ${res.magnitude.value}${res.magnitude.unit === null ? "" : ` ${res.magnitude.unit}`} (${res.magnitude.dimension}).`;

  return {
    outcome: res.outcome,
    headline: `${OUTCOME_SENTENCE[res.outcome]}${figure}`,
    coverage: coverageSentence(res.coverage),
    interpretedAs: res.interpretedAs,
    refusal: res.refusal,
    disclosures: res.compilation.map((c) => c.explanation),
    systemHash: res.systemHash,
    magnitude: res.magnitude,
    evidence: ev === null ? null : {
      shape: ev.shape, role: ev.role, summary, steps, nodes: ev.nodes,
    },
  };
}
