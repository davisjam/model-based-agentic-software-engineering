/**
 * The view model — everything the UI shows, as data, before any DOM exists.
 *
 * Two reasons it is separated from the DOM binding, and the second is the important one:
 *
 *  1. It is testable in `node:test` with no jsdom and no browser.
 *  2. **FR-A11Y-2 becomes checkable.** The requirement is that nothing is conveyed by colour,
 *     position, line style or shape alone. If the thing the UI renders is a typed structure of
 *     labels, roles and states, then a test can assert that every status carries TEXT — and that is
 *     an assertion about the product, not about a stylesheet. A canvas-first design cannot be
 *     checked this way, which is part of why it fails accessibility in practice.
 *
 * The structured model view is the PRIMARY editing surface here, not a fallback. FR-A11Y-2 requires
 * that model editing and query execution be possible without touching the diagram, so the diagram
 * is the second view and this is the first.
 */
import type { CanonicalSystem, Finding, QueryResult } from "../ir/types.ts";

export interface ViewModel {
  readonly title: string;
  readonly summary: string;
  readonly banner: Banner | null;
  readonly sections: readonly Section[];
  readonly findings: readonly FindingRow[];
  readonly questions: readonly QuestionRow[];
}

/** The hypothesis / validity banner. Never colour alone — `text` always says it. */
export interface Banner {
  readonly tone: "info" | "warning" | "danger";
  readonly text: string;
}

export interface Section {
  readonly id: string;
  readonly heading: string;
  /** A short sentence a screen-reader user hears before the rows. */
  readonly intro: string;
  readonly rows: readonly Row[];
}

export interface Row {
  readonly id: string;
  readonly label: string;
  readonly kind: string;
  readonly detail: string;
  /** Textual status badges. "initial", "selected", "evidence", "violation" — words, not hues. */
  readonly states: readonly string[];
}

export interface FindingRow {
  readonly rule: string;
  readonly where: string;
  readonly message: string;
}

export interface QuestionRow {
  readonly id: string;
  readonly question: string;
  /** The outcome word, verbatim. Deliberately not a tick or a colour. */
  readonly outcome: string;
  /** "exhaustive, 37 configurations" / "bounded at 1000000 — INCONCLUSIVE". */
  readonly coverage: string;
  readonly evidence: readonly string[];
  readonly refusal: string | null;
  /** Disclosed rewrites, e.g. an added history variable (V23). */
  readonly compilation: readonly string[];
  readonly stale: boolean;
}

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** Outcome word plus what it MEANS, because "refuted" alone is jargon to a student. */
function outcomeText(r: QueryResult): string {
  switch (r.outcome) {
    case "holds": return "HOLDS — established";
    case "refuted": return "REFUTED — does not hold";
    case "inconclusive": return "INCONCLUSIVE — the search was bounded, so this is not a 'no'";
    case "unlicensed": return "NOT ANSWERABLE from this model";
    default: return r.outcome;
  }
}

function coverageText(r: QueryResult): string {
  const c = r.coverage;
  if (c.kind === "not-applicable") return "coverage not applicable";
  if (c.kind === "bounded") {
    return `bounded after ${plural(c.statesExplored, "configuration")}` +
      `${c.reason === null ? "" : ` (${c.reason})`} — no conclusion is licensed`;
  }
  return `exhaustive over ${plural(c.statesExplored, "configuration")}`;
}

function evidenceText(r: QueryResult): readonly string[] {
  const ev = r.evidence;
  if (ev === null) return [];
  if (ev.shape === "path" && ev.nodes !== null) {
    return [`${ev.role}: ${ev.nodes.join(" → ")}`];
  }
  const lines = ev.steps.map((s, i) => {
    const who = s.instances.join(" + ");
    const via = s.sync !== null ? ` on ${s.sync}` : s.label !== null ? ` (${s.label})` : "";
    return `${i + 1}. ${who}${via}`;
  });
  if (ev.shape === "lasso" && ev.cycle !== null) {
    lines.push(`then repeating: ${ev.cycle.map((s) => s.instances.join(" + ")).join(" → ")}`);
  }
  return [`${ev.role} (${ev.shape}):`, ...lines];
}

export function buildViewModel(
  system: CanonicalSystem,
  findings: readonly Finding[],
  results: ReadonlyMap<string, QueryResult>,
  options: { readonly hypothesis: string | null; readonly currentHash: string; readonly selection: readonly string[] },
): ViewModel {
  const selected = new Set(options.selection);

  const banner: Banner | null =
    options.hypothesis !== null
      ? { tone: "warning", text: `Hypothesis "${options.hypothesis}" is active. The authoritative model is unchanged until you apply it.` }
      : findings.length > 0
        ? { tone: "danger", text: `${plural(findings.length, "validation finding")}. Analysis is still available, but conclusions may not be meaningful.` }
        : null;

  const entityRows: Row[] = [...system.entities.values()].map((e) => {
    const props = [...e.properties.entries()].map(([k, v]) => `${k} = ${String(v.value)}`);
    const where = [...system.models.values()].filter((m) => m.entities.includes(e.id)).map((m) => m.label);
    return {
      id: e.id,
      label: e.label,
      kind: e.type ?? "entity",
      // Containment and cross-model appearance are stated in words. In the diagram these are an
      // enclosing region and a highlight; here they are sentences, which is the point.
      detail: [
        e.parent !== null ? `inside ${e.parent}` : null,
        e.contains.length > 0 ? `contains ${e.contains.join(", ")}` : null,
        props.length > 0 ? props.join("; ") : null,
        where.length > 0 ? `appears in ${where.join(", ")}` : null,
      ].filter((s): s is string => s !== null).join(" · ") || "no further detail",
      states: selected.has(e.id) ? ["selected"] : [],
    };
  });

  const machineRows: Row[] = [...system.machines.values()].flatMap((m) => {
    const head: Row = {
      id: m.id,
      label: m.id,
      kind: m.instances > 1 ? `machine (${m.instances} instances)` : "machine",
      detail: [
        `starts in ${m.initial}`,
        `${plural(m.states.length, "state")}: ${m.states.join(", ")}`,
        m.entity !== null ? `models ${m.entity}` : null,
        m.variables.size > 0
          ? `variables: ${[...m.variables.values()].map((v) => `${v.id} ∈ {${v.domain.join(", ")}}`).join("; ")}`
          : null,
      ].filter((s): s is string => s !== null).join(" · "),
      states: selected.has(m.id) ? ["selected"] : [],
    };
    const transitions: Row[] = m.transitions.map((t) => ({
      id: `${m.id}.t${t.index}`,
      label: `${t.from} → ${t.to}`,
      kind: t.sync !== null ? "synchronized transition" : "transition",
      detail: [
        t.sync !== null ? `fires together with the other participants of ${t.sync}` : null,
        t.label,
        t.guards.length > 0 ? `requires ${t.guards.map((g) => `${g.ref} ${g.op} ${String(g.value)}`).join(" and ")}` : null,
        t.effects.length > 0 ? `sets ${t.effects.map((e) => `${e.variable} := ${e.expression}`).join(", ")}` : null,
      ].filter((s): s is string => s !== null).join(" · ") || "unconditional",
      states: t.from === m.initial ? ["from initial state"] : [],
    }));
    return [head, ...transitions];
  });

  const relationRows: Row[] = system.relations.map((r, i) => {
    const rt = system.relationTypes.get(r.type);
    return {
      id: r.id ?? `relation-${i}`,
      label: `${r.from} → ${r.to}`,
      kind: r.type,
      detail: [
        rt?.description ?? null,
        // The ABSENCE is often the more important half, and it is invisible in a diagram.
        rt?.absence !== null && rt?.absence !== undefined ? `Absence means: ${rt.absence}` : null,
        rt?.pathComposition === "forbidden" ? "multi-hop questions over this relation are NOT licensed" : null,
        `in model ${r.model}`,
      ].filter((s): s is string => s !== null).join(" · "),
      states: [],
    };
  });

  const sections: Section[] = [
    { id: "entities", heading: "Entities", intro: "The one identity namespace. Every model refers to these.", rows: entityRows },
    { id: "relations", heading: "Relations", intro: "Typed edges, with what each type asserts and what its absence asserts.", rows: relationRows },
    { id: "machines", heading: "Machines and transitions", intro: "Behaviour. A synchronized transition fires together with its event's other participants.", rows: machineRows },
  ].filter((s) => s.rows.length > 0);

  const questions: QuestionRow[] = [...system.queries.keys()].map((id) => {
    const r = results.get(id);
    const name = (system.queries.get(id)?.raw as { name?: unknown } | undefined)?.name;
    if (r === undefined) {
      return { id, question: typeof name === "string" ? name : id, outcome: "not yet run", coverage: "", evidence: [], refusal: null, compilation: [], stale: false };
    }
    return {
      id,
      question: typeof name === "string" ? name : id,
      outcome: outcomeText(r),
      coverage: coverageText(r),
      evidence: evidenceText(r),
      refusal: r.refusal,
      compilation: r.compilation.map((c) => c.explanation),
      // A result whose hash no longer matches describes a model the user has already changed.
      stale: r.systemHash !== options.currentHash,
    };
  });

  return {
    title: system.name,
    summary: `${plural(system.entities.size, "entity", "entities")}, ` +
      `${plural(system.machines.size, "machine")}, ` +
      `${plural(system.instances.length, "machine instance")}, ` +
      `${plural(system.relations.length, "relation")}, ` +
      `${plural(system.queries.size, "saved question")}.`,
    banner,
    sections,
    findings: findings.map((f) => ({ rule: f.rule, where: f.where, message: f.message })),
    questions,
  };
}
