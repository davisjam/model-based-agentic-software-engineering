/**
 * The question sections — Learn's reframe, and the one place a section's content is COMPUTED.
 *
 * ## What these sections are, and why they are not guide sections
 *
 * `workbench-guide.ts` holds sections nothing in the kernel derives, because nothing in a model
 * kernel knows how a pane reads. These are the opposite case: each one teaches a CAPABILITY, so
 * each one must come from a source the kernel consults or ships, and a section whose source went
 * away must change what it says. Four do it by running a question and rendering what comes back;
 * the fifth renders a gate's own verdict.
 *
 * So the declaration here carries only furniture — an anchor, the engineering question that is the
 * heading, one framing sentence — plus `derivedFrom`, the citations in the registry's own
 * `SchemaAuthority` shape, so a question section's claims are checkable the way a type card's are.
 * Everything a reader would call a fact about MAGE is in a block, and every block is built.
 *
 * ## The honesty property each section has
 *
 * None of them states an outcome. `question-evidence` and `question-properties` RUN the queries, so
 * the page cannot claim a verdict the engine stopped producing — repair `document-processing`'s
 * retry policy and the counterexample section would show a `holds` and say so.
 * `question-requirements` puts the fixture's recorded `status` beside the live outcome, so a drift
 * between them is visible on the page and not only in CI. `question-agents` renders
 * `affordanceParityGate()`'s own headline, including a non-zero violation count if one appears.
 * `question-omissions` quotes the refusals the shipped questions actually earn.
 *
 * ## Why the guidance's §12 is absent
 *
 * "Where these semantics come from" wants the SysML v2 / KerML grounding, and the registry carries
 * no attribution: `semanticBasis` is a RECOMMENDATION in `DESIGN-v02-semantics-261004.md`
 * §35.5, not a field, and the strings `SysML` and `KerML` appear nowhere under `src/`. A section
 * here would therefore be hand-written capability prose claiming standards standing the code does
 * not claim — the one thing UX-I9 exists to prevent. It arrives when the field does.
 * `DESIGN-learn-questions-261004.md` §6 records the assessment and §7 the follow-up.
 */
import { MODEL_TYPES, type SchemaAuthority } from "../engine/model-types.ts";
import { QUANTIFIERS, QUANTIFIER_EVIDENCE } from "../engine/types.ts";
import { runQuery } from "../engine/index.ts";
import type { CanonicalSystem, Evidence, QueryResult } from "../ir/types.ts";
import { SHIPPED_EXAMPLE_IDS, type ShippedExampleId } from "../app/examples.ts";
import { affordanceParityGate, CAPABILITIES, ESCAPE_HATCHES } from "../app/capabilities.ts";
import { composedQuantityQuery, type LoadedSystems } from "./content.ts";
import type { LoadedFixtures } from "./fixtures.ts";

/**
 * One block of built content. Four shapes, and the fourth earned its place at the a11y gate.
 *
 * `rows` is a DATA table: every column means something and its header says what. `pairs` is a
 * readout — a term and the figure it names — and it renders as a description list. The distinction
 * is not cosmetic: a one-off readout built as a two-column `rows` has nothing to put in its header
 * cells, and axe reports `empty-table-header` on exactly that, because a table whose header row
 * carries no information is a layout table wearing data markup. Caught by the a11y tier on this
 * wave's first run, which is the gate doing its job.
 *
 * Nothing here carries a `verdict` arm. A computed readout is reduced to `pairs` at BUILD time, so
 * every figure the page shows is a value a test can address by its term, and no formatting decision
 * lives in the DOM layer where a test would have to parse it back out.
 */
export type QuestionBlock =
  | { readonly kind: "prose"; readonly text: string }
  | { readonly kind: "bullets"; readonly label: string; readonly items: readonly string[] }
  | {
    readonly kind: "pairs"; readonly label: string;
    readonly pairs: readonly (readonly [string, string])[];
  }
  | {
    readonly kind: "rows"; readonly label: string;
    readonly columns: readonly string[];
    readonly rows: readonly (readonly string[])[];
  };

/** The declared half of a question section: furniture, plus where its content comes from. */
export interface QuestionSection {
  /** The in-page anchor. Distinct from every registry and guide anchor; the smoke tier checks all three sets. */
  readonly anchor: string;
  /** The engineering question. This is the heading, and the page's organising principle. */
  readonly heading: string;
  /** One framing sentence under the heading — the shape every other section on this page uses. */
  readonly lede: string;
  /** Where this section's content is DEFINED. The citation shape the registry uses for the same job. */
  readonly derivedFrom: readonly SchemaAuthority[];
}

export interface BuiltQuestionSection {
  readonly section: QuestionSection;
  readonly blocks: readonly QuestionBlock[];
}

export const QUESTION_SECTIONS: readonly QuestionSection[] = [
  {
    anchor: "question-evidence",
    heading: "How would you know?",
    lede: "Two kinds of question, two kinds of evidence — and the workbench returns the evidence, "
      + "not just the verdict.",
    derivedFrom: [
      {
        file: "src/engine/types.ts", symbol: "QUANTIFIER_EVIDENCE",
        role: "what each quantifier takes as evidence — the declaration a refusal's prose is built "
          + "from, so there is no second copy to drift",
      },
      {
        file: "src/ir/types.ts", symbol: "EvidenceRole",
        role: "witness or counterexample — the role every result's evidence carries",
      },
      {
        file: "src/ir/types.ts", symbol: "EvidenceShape",
        role: "the shapes evidence comes in: a path through a graph, a trace, a lasso",
      },
    ],
  },
  {
    anchor: "question-properties",
    heading: "What happens when the model changes?",
    lede: "During exploration you ask questions. Once an answer matters, keep the question — and the "
      + "workbench re-decides it on every later revision.",
    derivedFrom: [
      {
        file: "src/app/properties.ts", symbol: "export function evaluateProperties",
        role: "a property is a saved question whose verdict is recomputed and stored nowhere, so it "
          + "cannot go stale",
      },
      {
        file: "examples/message-bus/expected-results.yaml", symbol: "modifications:",
        role: "the declared modifications and the answers each one changes; `test/examples.test.ts` "
          + "drives every one through the real hypothesis seam and asserts both outcomes",
      },
    ],
  },
  {
    anchor: "question-requirements",
    heading: "What must be true, and what merely is?",
    lede: "A property describes. A requirement prescribes — and says which outcome would satisfy it.",
    derivedFrom: [
      {
        file: "src/app/properties.ts", symbol: "export interface Expectation",
        role: "declaring an expectation is what makes a property a requirement; a differing outcome "
          + "then counts as a failure rather than as a finding",
      },
      {
        file: "examples/message-bus/expected-results.yaml", symbol: "requirements:",
        role: "the shipped requirements, each joined to the question that decides it by the outcome "
          + "that would satisfy it",
      },
      {
        file: "src/ir/types.ts", symbol: "export type Outcome",
        role: "the four outcomes a question can have — deliberately not true/false",
      },
    ],
  },
  {
    anchor: "question-agents",
    heading: "Can an agent use the same model you do?",
    lede: "Not a simplified copy for the machine. One model, one set of semantic operations, and a "
      + "gate that holds both sides to the same seam.",
    derivedFrom: [
      {
        file: "src/app/capabilities.ts", symbol: "readonly service",
        role: "the ONE application service a human control and a machine call both invoke — UX-I1 "
          + "is checked by comparing this string, so parity is structural rather than claimed",
      },
      {
        file: "src/app/capabilities.ts", symbol: "export function affordanceParityGate",
        role: "the verdict: every public capability has a wired human affordance and a wired machine "
          + "affordance, or the gate names the gap",
      },
    ],
  },
  {
    anchor: "question-omissions",
    heading: "What does the workbench leave out?",
    lede: "Each model is a purposeful reduction, and so is the workbench. Asking past the edge gets "
      + "a refusal that names what is absent — never a fabricated number.",
    derivedFrom: [
      {
        file: "src/engine/model-types.ts", symbol: "readonly omits",
        role: "what each model type deliberately does not tell you — the purposeful-reduction half "
          + "of its registry entry",
      },
      {
        file: "src/engine/model-types.ts", symbol: "export function absentSubstrateProse",
        role: "the refusal a question earns over a substrate the system does not declare, worded "
          + "from the registry so the refusal and this page describe one capability",
      },
      {
        file: "src/app/capabilities.ts", symbol: "export const ESCAPE_HATCHES",
        role: "the surfaces deliberately OUTSIDE the semantic interface, each with what fences it",
      },
    ],
  },
];

/** Every question anchor. The smoke tier adds these to the registry's and the guide's. */
export const QUESTION_ANCHORS: readonly string[] = QUESTION_SECTIONS.map((s) => s.anchor);

// ---------------------------------------------------------------------------------------------
// Shared readers over the loaded examples
// ---------------------------------------------------------------------------------------------

/** How a system names itself, for a row that must say which example a figure came from. */
const nameOf = (systems: LoadedSystems, id: ShippedExampleId): string =>
  systems.get(id)?.name ?? id;

/** A magnitude with its unit, or a dash. The unit travels WITH the number; that is the whole point. */
const magnitudeText = (result: QueryResult): string =>
  result.magnitude === null ? "—"
    : `${result.magnitude.value}${result.magnitude.unit === null ? "" : ` ${result.magnitude.unit}`}`;

/** Evidence as one phrase: its role, its shape, and how long it is. */
const evidenceText = (evidence: Evidence | null): string =>
  evidence === null ? "none"
    : `${evidence.role}, ${evidence.shape}`
      + (evidence.steps.length > 0 ? ` of ${evidence.steps.length} step(s)` : "")
      + (evidence.cycle === null ? "" : ` repeating ${evidence.cycle.length}`)
      + (evidence.nodes === null ? "" : ` over ${evidence.nodes.length} node(s)`);

const coverageText = (result: QueryResult): string =>
  result.coverage === null ? "—"
    : result.coverage.kind === "not-applicable" ? "not applicable"
      : `${result.coverage.kind}, ${result.coverage.statesExplored} state(s)`;

/** One saved question of a shipped example, run. Null when the example does not declare it. */
function runSaved(system: CanonicalSystem, id: string): QueryResult | null {
  const saved = system.queries.get(id);
  return saved === undefined ? null : runQuery(system, saved.raw).result;
}

/** A saved question's authored name, which is the statement its author gave it. */
function statementOf(system: CanonicalSystem, id: string): string {
  const raw: unknown = system.queries.get(id)?.raw;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const name = (raw as Record<string, unknown>)["name"];
    if (typeof name === "string" && name.trim() !== "") return name.trim();
  }
  return id;
}

/** Every shipped saved question, run once — the corpus three sections read. */
interface RanQuestion {
  readonly example: ShippedExampleId;
  readonly id: string;
  readonly statement: string;
  readonly result: QueryResult;
}

function runEveryShippedQuestion(systems: LoadedSystems): readonly RanQuestion[] {
  const out: RanQuestion[] = [];
  for (const example of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(example);
    if (system === undefined) continue;
    for (const id of system.queries.keys()) {
      const result = runSaved(system, id);
      if (result === null) continue;
      out.push({ example, id, statement: statementOf(system, id), result });
    }
  }
  return out;
}

/**
 * The counterexample the shipped examples produce today, computed.
 *
 * Every shipped SAVED question is existential and none of them refutes, so a counterexample has to
 * come from the one place the kernel produces one over shipped content: a quantitative question
 * decided against a declared ceiling. `composedQuantityQuery` derives that question from the
 * system's own `model:`-targeted quantity, so nothing here authors a question shape.
 */
function shippedCounterexample(systems: LoadedSystems): {
  readonly example: ShippedExampleId;
  readonly metric: string;
  readonly ceiling: string;
  readonly result: QueryResult;
} | null {
  const quantitative = MODEL_TYPES.find((t) => t.id === "quantitative-model");
  if (quantitative === undefined) return null;
  for (const example of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(example);
    if (system === undefined) continue;
    const composed = composedQuantityQuery(system, quantitative.query.forms);
    if (composed === null) continue;
    const result = runQuery(system, composed.query).result;
    if (result.evidence?.role !== "counterexample") continue;
    return { example, metric: composed.metric, ceiling: composed.ceiling, result };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// The builders — one per declared section, selected exhaustively
// ---------------------------------------------------------------------------------------------

function evidenceBlocks(systems: LoadedSystems): readonly QuestionBlock[] {
  const blocks: QuestionBlock[] = [
    {
      kind: "rows",
      label: "The two quantifiers, and what each one takes as evidence",
      columns: ["Quantifier", "Evidence"],
      // The engine's own declaration, both arms, by reference to the vocabulary it dispatches on.
      rows: QUANTIFIERS.map((q) => [q, QUANTIFIER_EVIDENCE[q]]),
    },
  ];

  // Which evidence SHAPES the shipped questions actually produce. Derived rather than listed: the
  // type union has four arms and a page that recited them would be claiming shapes no shipped
  // question exhibits.
  const seen = new Map<string, RanQuestion>();
  for (const q of runEveryShippedQuestion(systems)) {
    const evidence = q.result.evidence;
    if (evidence === null || evidence.shape === "none") continue;
    const key = `${evidence.role}/${evidence.shape}`;
    if (!seen.has(key)) seen.set(key, q);
  }
  const counterexample = shippedCounterexample(systems);
  if (counterexample !== null && counterexample.result.evidence !== null) {
    const e = counterexample.result.evidence;
    seen.set(`${e.role}/${e.shape}`, {
      example: counterexample.example,
      id: `${counterexample.metric} within ${counterexample.ceiling}`,
      statement: `Every execution keeps ${counterexample.metric} under the declared ceiling`,
      result: counterexample.result,
    });
  }
  if (seen.size > 0) {
    blocks.push({
      kind: "rows",
      label: "Every evidence shape the shipped examples produce, with a question that produces it",
      columns: ["Role", "Shape", "A question that returns one", "In"],
      rows: [...seen.values()].map((q) => [
        q.result.evidence?.role ?? "—",
        q.result.evidence?.shape ?? "—",
        q.statement,
        nameOf(systems, q.example),
      ]),
    });
  }

  if (counterexample === null) {
    // Reported, not hidden. A page that silently dropped the section's second half would read as
    // though the workbench only ever produces witnesses.
    blocks.push({
      kind: "prose",
      text: "No shipped example currently refutes a declared ceiling, so there is no counterexample "
        + "to show here. The shapes above are the witnesses.",
    });
    return blocks;
  }

  blocks.push({
    kind: "pairs",
    label: "A counterexample, computed now — asking whether every execution stays under a declared ceiling",
    pairs: [
      ["Asked of", nameOf(systems, counterexample.example)],
      ["The question", `Does every execution keep ${counterexample.metric} at or under `
        + `'${counterexample.ceiling}'?`],
      ["Answer", counterexample.result.outcome],
      ["The figure that decides it", magnitudeText(counterexample.result)],
      ["Evidence", evidenceText(counterexample.result.evidence)],
      ["Coverage", coverageText(counterexample.result)],
    ],
  });
  blocks.push({
    kind: "prose",
    text: "The workbench did not merely report that the claim is false. It returned the execution "
      + "that breaks it, with the figure that decides it and the unit that figure is in — so the "
      + "next question is which step to change, not whether to believe the answer.",
  });
  return blocks;
}

function propertyBlocks(systems: LoadedSystems, fixtures: LoadedFixtures): readonly QuestionBlock[] {
  const rows: string[][] = [];
  for (const example of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(example);
    const fixture = fixtures.get(example);
    if (system === undefined || fixture === undefined) continue;
    for (const mod of fixture.modifications) {
      for (const change of mod.changes) {
        const live = runSaved(system, change.query);
        rows.push([
          nameOf(systems, example),
          statementOf(system, change.query),
          // COMPUTED, now, on the model as it ships. A mismatch with the fixture's `from` is a
          // drift the page shows rather than hides.
          live === null ? "(not declared)" : live.outcome,
          change.to,
          mod.label,
        ]);
      }
    }
  }
  return [
    {
      kind: "prose",
      text: "A property is a saved question, never a saved answer. The verdict is recomputed on "
        + "every later revision and stored nowhere, so a property cannot go stale: it reports what "
        + "the models say now.",
    },
    {
      kind: "rows",
      label: "Every change the shipped examples declare — the left column computed now, the right "
        + "the answer the change produces",
      columns: ["In", "The saved question", "Now", "After the change", "The change"],
      rows,
    },
    {
      kind: "prose",
      text: "The model changed. The question did not. That is what lets the workbench tell you an "
        + "engineering fact you meant to preserve has moved — and each of these runs as a what-if "
        + "branch, so you can look before you keep it.",
    },
  ];
}

/**
 * What decides one shipped requirement, and what it answers NOW.
 *
 * Two shapes, because two ship. A graph or behavioural requirement names the saved query it is
 * expressed as, and that query is run. A QUANTITATIVE one names the declared ceiling instead, so
 * the question is derived from that ceiling — `composedQuantityQuery` with the requirement's own
 * `declared_as`, not the system's first ceiling, because the two quantitative requirements shipped
 * are of different dimensions and the first would decide both against the wrong one.
 */
function decideRequirement(
  system: CanonicalSystem, req: { readonly expressedAs: string | null; readonly declaredAs: string | null },
): { readonly decidedBy: string; readonly result: QueryResult | null } {
  if (req.expressedAs !== null) {
    return { decidedBy: statementOf(system, req.expressedAs), result: runSaved(system, req.expressedAs) };
  }
  if (req.declaredAs === null) return { decidedBy: "—", result: null };
  const quantitative = MODEL_TYPES.find((t) => t.id === "quantitative-model");
  const composed = quantitative === undefined
    ? null
    : composedQuantityQuery(system, quantitative.query.forms, req.declaredAs);
  if (composed === null) return { decidedBy: req.declaredAs, result: null };
  return {
    decidedBy: `Every execution keeps ${composed.metric} under '${composed.ceiling}'`,
    result: runQuery(system, composed.query).result,
  };
}

function requirementBlocks(systems: LoadedSystems, fixtures: LoadedFixtures): readonly QuestionBlock[] {
  const declared: string[][] = [];
  const polarity = new Map<string, string[]>();
  for (const example of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(example);
    const fixture = fixtures.get(example);
    if (system === undefined || fixture === undefined) continue;
    for (const req of fixture.requirements) {
      const decided = decideRequirement(system, req);
      // A quantitative requirement declares no `satisfied_when`: a ceiling question is universal,
      // so `holds` is the only outcome that satisfies it and the fixture does not restate that.
      const satisfiedWhen = req.satisfiedWhen ?? "holds";
      declared.push([
        req.statement,
        decided.decidedBy,
        satisfiedWhen,
        decided.result === null ? "—" : decided.result.outcome,
        req.status,
      ]);
      // The RULE, derived from the instances: one row per (satisfying outcome, resulting status)
      // pair the shipped requirements exhibit. Two polarities ship, which is what makes this a
      // rule a reader can apply rather than one example they might generalise wrongly from.
      if (decided.result !== null) {
        polarity.set(`${satisfiedWhen}/${decided.result.outcome}`, [
          satisfiedWhen,
          decided.result.outcome,
          decided.result.outcome === satisfiedWhen ? "satisfied" : "not satisfied",
          req.status,
        ]);
      }
    }
  }
  return [
    {
      kind: "prose",
      text: "The question stays positive and existential — \"does this happen?\" — because that is "
        + "the question a witness can settle. The requirement states the prohibition, and names the "
        + "outcome that would satisfy it.",
    },
    {
      kind: "rows",
      label: "Every requirement the shipped examples declare",
      columns: ["The requirement", "Decided by", "Satisfied when", "Answers now", "Recorded status"],
      rows: declared,
    },
    {
      kind: "rows",
      label: "The polarity, read off those requirements",
      columns: ["Satisfied when the query is", "The query answers", "So the requirement is", "Recorded as"],
      rows: [...polarity.values()],
    },
    {
      kind: "prose",
      text: "Both directions ship, which is the point: a safety requirement is satisfied when its "
        + "query HOLDS, a prohibition when its query is REFUTED. The outcome word belongs to the "
        + "question; satisfaction belongs to the requirement.",
    },
  ];
}

function agentBlocks(): readonly QuestionBlock[] {
  const gate = affordanceParityGate();
  const evidential = CAPABILITIES.filter((c) => c.producesEvidence);
  const blocks: QuestionBlock[] = [
    {
      kind: "prose",
      text: "An agent does not receive a separate, simplified representation. Every public "
        + "capability names the ONE application service a human control and a machine call both "
        + "invoke, and a gate compares them: " + gate.headline + ".",
    },
    {
      kind: "rows",
      label: "The capabilities that produce a semantic RESULT — where an agent and a person get the "
        + "same answer, through the same seam",
      columns: ["Capability", "The one service both invoke", "A person reaches it at", "An agent calls"],
      rows: evidential.map((c) => [
        c.summary,
        c.service,
        c.human.map((h) => h.at).join(", ") || "—",
        c.machine.map((m) => m.at).join(", ") || "—",
      ]),
    },
  ];
  if (!gate.passed) {
    // Rendered, because the gate's whole worth is that it can say no. A page that only printed the
    // headline when it was zero would be advertising the invariant rather than reporting it.
    blocks.push({
      kind: "bullets",
      label: "Gaps the parity gate currently reports",
      items: gate.violations.map((v) => `${v.capability}: ${v.problem}`),
    });
  }
  blocks.push({
    kind: "prose",
    text: "So an agent can inspect a model, ask what it entails, propose a change as a what-if, and "
      + "see which saved questions change their answer. It has access to a typed semantic "
      + "interface — not a summary of one.",
  });
  return blocks;
}

function omissionBlocks(systems: LoadedSystems): readonly QuestionBlock[] {
  // The refusals the shipped questions actually earn, with the live prose. Stronger than a list of
  // non-goals: a refusal names what is absent AND what declaring it would take, which is the
  // decision surface the omission is.
  const refusals: string[][] = [];
  for (const q of runEveryShippedQuestion(systems)) {
    if (q.result.outcome !== "unlicensed" || q.result.refusal === null) continue;
    refusals.push([q.statement, nameOf(systems, q.example), q.result.refusal]);
  }
  const blocks: QuestionBlock[] = [
    {
      kind: "bullets",
      label: "What each model form deliberately does not tell you",
      // The registry's own `omits`, per type, collected — the same arrays each form's own section
      // shows, gathered here so the recursion is visible.
      items: MODEL_TYPES.flatMap((t) => t.omits.map((o) => `A ${t.label} does not say ${o}.`)),
    },
  ];
  if (refusals.length > 0) {
    blocks.push({
      kind: "rows",
      label: "Questions the shipped examples ask past their own edge, and the refusal each earns",
      columns: ["The question", "Asked of", "Why it is refused"],
      rows: refusals,
    });
  }
  blocks.push({
    kind: "bullets",
    label: "Deliberately outside the semantic interface",
    items: ESCAPE_HATCHES.map((h) => `${h.at} — ${h.reason} Fenced by ${h.fencedBy}.`),
  });
  blocks.push({
    kind: "prose",
    text: "The workbench is itself a purposeful reduction. It carries the concepts its engineering "
      + "questions need and refuses the rest by name, which is the same discipline each model form "
      + "applies to its own system.",
  });
  return blocks;
}

/**
 * Every question section, built.
 *
 * The switch is exhaustive over the declared anchors by the compiler, so a section declared above
 * with no builder is a type error rather than a blank `<section>` on the page.
 */
export function buildQuestionSections(
  systems: LoadedSystems, fixtures: LoadedFixtures,
): readonly BuiltQuestionSection[] {
  return QUESTION_SECTIONS.map((section) => {
    switch (section.anchor) {
      case "question-evidence": return { section, blocks: evidenceBlocks(systems) };
      case "question-properties": return { section, blocks: propertyBlocks(systems, fixtures) };
      case "question-requirements": return { section, blocks: requirementBlocks(systems, fixtures) };
      case "question-agents": return { section, blocks: agentBlocks() };
      case "question-omissions": return { section, blocks: omissionBlocks(systems) };
      default:
        throw new Error(`question section '${section.anchor}' is declared with no builder`);
    }
  });
}
