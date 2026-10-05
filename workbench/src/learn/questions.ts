/**
 * The question sections — Learn's reframe, and the one place a section's content is COMPUTED.
 *
 * ## What these sections are, and why they are not guide sections
 *
 * `workbench-guide.ts` holds sections nothing in the kernel derives, because nothing in a model
 * kernel knows how a pane reads. These are the opposite case: each one teaches a CAPABILITY, so
 * each one must come from a source the kernel consults or ships, and a section whose source went
 * away must change what it says. Five do it by running a question and rendering what comes back;
 * the sixth renders a gate's own verdict.
 *
 * So the declaration here carries only furniture — an anchor, the engineering question that is the
 * heading, one framing sentence — plus `derivedFrom`, the citations in the registry's own
 * `SchemaAuthority` shape, so a question section's claims are checkable the way a type card's are.
 * Everything a reader would call a fact about MAGE is in a block, and every block is built.
 *
 * ## The honesty property each section has
 *
 * None of them states an outcome. `question-operations` runs a selection and a count and renders
 * the values that came back, including the absence of a verdict: its "Verdict" term branches on
 * whether the returned answer carries an `outcome` at all, so the section stops claiming the
 * question makes no claim the moment the engine starts deciding one.
 * `question-evidence` and `question-properties` RUN the queries, so
 * the page cannot claim a verdict the engine stopped producing — repair `document-processing`'s
 * retry policy and the counterexample section would show a `holds` and say so.
 * `question-requirements` puts the fixture's recorded `status` beside the live outcome, so a drift
 * between them is visible on the page and not only in CI. `question-agents` renders
 * `affordanceParityGate()`'s own headline, including a non-zero violation count if one appears.
 * `question-omissions` quotes the refusals the shipped questions actually earn.
 *
 * ## Where the operations section comes from, and why not from the facade
 *
 * `question-operations` teaches the operations that are not forms — `select` and `count`, which the
 * registry declares as a SUBJECT enumeration rather than as a question the engine decides
 * (`DESIGN-v02-quantification-261004.md` §3.4). It runs them: `selectElements` and `countElements`
 * over the structural type's own exemplar, so every figure on the page is one the kernel computed
 * for the revision the page loaded, and the question text is the engine's own
 * `interpretElementSelector` sentence rather than a restatement of the selector.
 *
 * The design's Phase 2 asked for the agent facade's `MODEL_FACADE` table as a second derivation
 * source. That is not available to this page and the blocker is architectural, not a preference:
 * `models/workbench-components.mage.yaml` resolves `src/app/agent-api.ts` to `agent-adapter` by its
 * longest-prefix rule and draws no `learn-page → agent-adapter` edge, and
 * `test/import-graph.test.ts` holds the declared edge set against every import in the tree.
 * Measured with the import in place, at the commit before this one, the gate names the edge and
 * says it is "either a dependency to undo or an architecture decision to make and draw." Undone,
 * because the grounding the facade table carries for these two operations IS `query.subjects` —
 * which this page may read, and which the gallery already derives from.
 * See `src/app/learn.ts`'s header for the full argument.
 *
 * ## Where the standards section comes from
 *
 * The previous wave omitted the guidance's §12 — "these ideas have established foundations" —
 * because the registry carried no attribution at all and a page claiming standards grounding while
 * `src/` claimed none is the capability claim UX-I9 forbids
 * (`DESIGN-learn-questions-261004.md` §6). `semanticBasis` closed that gap, so `question-foundations`
 * is derived from it: every standard named on the page is a standard a registry row names, every
 * count is counted now, and the constructs the registry declares as the Workbench's own are
 * rendered as such. A reader is told what is borrowed, what is grounded elsewhere, and what is
 * ours — and the page cannot say more than the registry does, which is the only reason it is
 * allowed to say anything.
 *
 * `question-omissions` gained the standards-relative half of the guidance's §13 box from the same
 * field: a borrowed construct realizes a declared SUBSET, so the reduction is per construct rather
 * than asserted in prose.
 *
 * **What is NOT on the page, deliberately.** The guidance's §13 also sketches a muted list of
 * specification features the Workbench does not represent. Nothing in the repository enumerates
 * those, and the field records which concept each construct subsets rather than what the standard
 * carries beyond it. Writing the list by hand would be a claim about a specification's contents
 * made from memory — the same failure §35.4 refuses when it leaves its own clause column unfilled,
 * pointed the other way.
 */
import {
  CLAUSE_OWED, MODEL_TYPES,
  type ModelType, type ModelTypeId, type SchemaAuthority, type SemanticBasis,
} from "../engine/model-types.ts";
import { QUANTIFIERS, QUANTIFIER_EVIDENCE } from "../engine/types.ts";
import { countElements, selectElements, type Cardinality } from "../engine/elements.ts";
import { runQuery } from "../engine/index.ts";
import type { CanonicalSystem, Evidence, QueryResult } from "../ir/types.ts";
import { SHIPPED_EXAMPLE_IDS, type ShippedExampleId } from "../app/examples.ts";
import { affordanceParityGate, CAPABILITIES, ESCAPE_HATCHES } from "../app/capabilities.ts";
import { composedQuantityQuery, exemplarFor, savedStatements, type LoadedSystems } from "./content.ts";
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
  // FIRST, and the order is the pedagogy: a reader meets the two kinds of question before meeting
  // the two kinds of evidence, because evidence is what only one of the two kinds comes back with.
  {
    anchor: "question-operations",
    heading: "What is there, before you ask what is true?",
    lede: "A question has to name what it is about before it can decide anything. Reading a model — "
      + "which things it declares, how many of them, named how — asks its own kind of question, and "
      + "it comes back with what is there and no verdict, because it claims nothing.",
    derivedFrom: [
      {
        file: "src/engine/model-types.ts", symbol: "readonly subjects",
        role: "what each model form lets a question NAME and select — the declaration a selection "
          + "derives from, which is not a question form and is why neither `select` nor `count` can "
          + "reach this page through the form arm",
      },
      {
        file: "src/engine/elements.ts", symbol: "export function selectElements",
        role: "the entity table read whole and filtered by the property-constraint grammar — the "
          + "operation this section runs, rather than describes",
      },
      {
        file: "src/engine/elements.ts", symbol: "export function interpretElementSelector",
        role: "the sentence a selection question was understood as, built from the selector rather "
          + "than from the answer, so a refused question still says what was read",
      },
      {
        file: "src/engine/elements.ts", symbol: "export type Cardinality",
        role: "how many, carried with the domain whose exhaustive read earns the figure — so a "
          + "number from a table read whole cannot be mistaken for one a bounded search reached",
      },
    ],
  },
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
    anchor: "question-foundations",
    heading: "Where do these ideas come from?",
    lede: "A small educational vocabulary — and for each part of it, either the established idea it "
      + "realizes a subset of, or the plain statement that it is the workbench's own.",
    derivedFrom: [
      {
        file: "src/engine/model-types.ts", symbol: "export type SemanticBasis",
        role: "where each construct's semantics come from: the standard concept it is borrowed "
          + "from, the foundation outside this project it is grounded in, or the reason it is the "
          + "workbench's own — required on every registry row, so nothing is attributed by omission",
      },
      {
        file: "DESIGN-v02-semantics-261004.md",
        symbol: "## 35. Borrowed semantics must have provenance",
        role: "the ruling this section renders: a borrowed construct must identify the standard "
          + "concept, and an extension must be identified as an extension and NOT attributed to "
          + "SysML or KerML",
      },
      {
        file: "SEMANTICS.md", symbol: "### 13.7 A second correspondence axis: construct to standard",
        role: "what a construct-to-standard claim is worth, in the house correspondence vocabulary: "
          + "`asserted`, until a conformance fixture exists",
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
      {
        file: "src/engine/model-types.ts", symbol: "readonly semanticBasis",
        role: "the standards-relative half of the reduction: each borrowed construct names the "
          + "standard concept it realizes a SUBSET of, so the boundary is recorded per construct "
          + "rather than claimed in prose",
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

// ---------------------------------------------------------------------------------------------
// The selection operations, run
//
// `select` and `count` reach the page the way every other capability on it does: by being invoked
// over a shipped example. Nothing here decides anything — which is the lesson — so there is no
// outcome, no coverage and no evidence to render, and `verdictOf` says so by READING the answer
// instead of asserting it.
// ---------------------------------------------------------------------------------------------

/** The structural model type, named once. A registry rename is a compile error, not a wrong page. */
const STRUCTURAL: ModelTypeId = "structural-graph";

/**
 * What verdict an answer carries — and the point is the else-branch.
 *
 * Read off the returned value rather than declared beside it. A selection and a count are typed
 * without an `outcome`, so today this always takes the second branch; the day either grows one, the
 * page prints it instead of claiming there is none. A sentence asserting "this makes no claim" would
 * have kept saying so.
 */
const verdictOf = (answer: object): string =>
  "outcome" in answer
    ? String((answer as { readonly outcome: unknown }).outcome)
    : "none — the answer carries no outcome and no evidence, because the question claims nothing";

/** One shipped model, READ: which entities of one declared type it has, and how many. */
interface SelectionReading {
  readonly example: ShippedExampleId;
  /** The engine's own sentence for the selector, from `interpretElementSelector`. */
  readonly question: string;
  readonly declaredTypes: readonly string[];
  readonly ids: readonly string[];
  readonly count: Cardinality;
  /**
   * Each answer's verdict, read from THAT answer rather than from the other.
   *
   * Two fields for what is one sentence today, because the two readouts render two values and a
   * shared field would let one of them speak for an answer it never looked at.
   */
  readonly selectionVerdict: string;
  readonly countVerdict: string;
}

/**
 * The selection question this section asks, and the shipped model it asks it of.
 *
 * Both choices are DERIVED, and the rules are written down because a derived choice still has to be
 * defensible:
 *
 *   - the MODEL is the structural type's own exemplar — `exemplarFor` takes the first shipped
 *     example the registry's `presentIn` predicate selects — so this section and the structural
 *     card talk about one system rather than two;
 *   - the TYPE is the declared entity type with the most entities, ties broken by the sorted order
 *     `declaredTypes` already carries, because a count of one teaches nothing about counting.
 *
 * Returns null rather than inventing a subject when no shipped example declares a structural model
 * with entities — the same shape `shippedCounterexample` uses, and the builder reports the absence
 * instead of hiding it.
 */
function selectionReading(systems: LoadedSystems): SelectionReading | null {
  const visual = exemplarFor(STRUCTURAL, systems);
  if (visual === null) return null;
  const system = systems.get(visual.example);
  if (system === undefined) return null;
  let chosen: { readonly type: string; readonly count: Cardinality } | null = null;
  for (const type of countElements(system, {}).declaredTypes) {
    const counted = countElements(system, { type });
    if (!counted.counted) continue;
    if (chosen === null || counted.count.value > chosen.count.value) {
      chosen = { type, count: counted.count };
    }
  }
  if (chosen === null) return null;
  const selector = { type: chosen.type };
  const selection = selectElements(system, selector);
  const counted = countElements(system, selector);
  if (!selection.selected || !counted.counted) return null;
  return {
    example: visual.example,
    question: selection.interpretedAs,
    declaredTypes: selection.declaredTypes,
    ids: selection.ids,
    count: counted.count,
    selectionVerdict: verdictOf(selection),
    countVerdict: verdictOf(counted),
  };
}

/**
 * A question of the SAME model that decides something — the contrast the section's line needs.
 *
 * The exemplar's own saved graph questions, in the order the canonical system holds them, and the
 * first that is not refused: a refusal would teach that this kind of question declines rather than
 * that it returns a verdict, which is the opposite of the point. `question-omissions` is where the
 * refusals belong, and it has them.
 */
function decidingQuestion(
  systems: LoadedSystems, example: ShippedExampleId,
): { readonly statement: string; readonly result: QueryResult } | null {
  const system = systems.get(example);
  if (system === undefined) return null;
  let first: { readonly statement: string; readonly result: QueryResult } | null = null;
  for (const q of savedStatements(system, "graph")) {
    const result = runSaved(system, q.id);
    if (result === null) continue;
    const reading = { statement: statementOf(system, q.id), result };
    first ??= reading;
    if (result.refusal === null) return reading;
  }
  return first;
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
// Readers over the semantic-basis field
//
// One row per claim the registry makes, at the registry's own granularity: a substrate row per
// model type, and a form row per SHARED basis object. The grouping is by object identity rather
// than by equal content, which is what makes the page's granularity the ruling table's — the ten
// structural query forms realize one claim and appear as one row, because they share one object.
// ---------------------------------------------------------------------------------------------

interface AttributionRow {
  /** What the row is about: a substrate, or the forms sharing one claim. */
  readonly what: string;
  /** The model form the claim sits inside, or null when the row IS the model form's substrate. */
  readonly askedOf: string | null;
  readonly basis: SemanticBasis;
}

type BorrowedBasis = Extract<SemanticBasis, { readonly kind: "borrowed" }>;

const substrateRows = (): readonly AttributionRow[] =>
  MODEL_TYPES.map((t) => ({
    what: `what a ${t.label} represents`, askedOf: null, basis: t.semanticBasis,
  }));

function formRows(): readonly AttributionRow[] {
  const out: AttributionRow[] = [];
  for (const t of MODEL_TYPES) {
    const shared = new Map<SemanticBasis, string[]>();
    for (const p of t.query.primitives) {
      const forms = shared.get(p.semanticBasis);
      if (forms === undefined) shared.set(p.semanticBasis, [p.form]);
      else forms.push(p.form);
    }
    for (const [basis, forms] of shared) {
      out.push({ what: forms.join(", "), askedOf: t.label, basis });
    }
  }
  return out;
}

/** The borrowed substrate rows, narrowed — the only rows that may name a standard. */
const borrowedSubstrates = (): readonly { readonly of: ModelType; readonly basis: BorrowedBasis }[] =>
  MODEL_TYPES.flatMap((t) => (t.semanticBasis.kind === "borrowed"
    ? [{ of: t, basis: t.semanticBasis }]
    : []));

/** Every standard any row actually names. Derived, so an unborrowed registry names none. */
const standardsNamed = (): readonly string[] => [...new Set(
  [...substrateRows(), ...formRows()]
    .flatMap((r) => (r.basis.kind === "borrowed" ? [r.basis.standard] : [])))];

/** A list in prose: "A and B", "A, B or C". */
const inProse = (items: readonly string[], conjunction = "and"): string =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1] ?? ""}`;

/** Where one row's semantics come from, as the page states it. */
const basisAccount = (basis: SemanticBasis): string => {
  switch (basis.kind) {
    case "borrowed": return `borrowed from ${basis.standard}: ${basis.concept}`;
    case "extension-grounded": return basis.why;
    case "extension": return basis.why;
  }
};

/** What a reader can open to check the row. A borrowed row's clause is owed until a fixture fills it. */
const basisCitation = (basis: SemanticBasis): string => {
  switch (basis.kind) {
    case "borrowed":
      return basis.clause === CLAUSE_OWED ? `clause ${CLAUSE_OWED}` : basis.clause;
    case "extension-grounded":
      return `${basis.foundation.file} (${basis.foundation.symbol.replace(/^#+\s*/, "")})`;
    case "extension": return "—";
  }
};

/**
 * The not-attributed list: every construct no standard backs, said once.
 *
 * Merged by (model form, class, foundation) rather than printed per basis object, because the list
 * states the rule's second half and nothing else — a construct is an extension, and here is the
 * foundation if it has one outside this project. The per-construct reasons are in the table above,
 * and repeating them here would turn the rule into a second copy of the detail.
 */
function notAttributedItems(): readonly string[] {
  const groups = new Map<string, { readonly tail: string; readonly subjects: string[] }>();
  for (const row of [...substrateRows(), ...formRows()]) {
    if (row.basis.kind === "borrowed") continue;
    const grounding = row.basis.kind === "extension-grounded" ? row.basis.foundation : null;
    const key = `${row.askedOf ?? ""}|${row.basis.kind}|${grounding?.file ?? ""}|${grounding?.symbol ?? ""}`;
    const tail = (row.askedOf === null ? "" : ` (asked of a ${row.askedOf})`)
      + (grounding === null
        ? " — extension: the workbench claims no standard here."
        : ` — extension, grounded in ${grounding.role}.`);
    const group = groups.get(key);
    if (group === undefined) groups.set(key, { tail, subjects: [row.what] });
    else group.subjects.push(row.what);
  }
  return [...groups.values()].map((g) => `${g.subjects.join(", ")}${g.tail}`);
}

// ---------------------------------------------------------------------------------------------
// The builders — one per declared section, selected exhaustively
// ---------------------------------------------------------------------------------------------

function operationBlocks(systems: LoadedSystems): readonly QuestionBlock[] {
  const reading = selectionReading(systems);
  if (reading === null) {
    // Reported, not hidden. A section that silently vanished would read as though the workbench
    // could not enumerate a model at all.
    return [{
      kind: "prose",
      text: "No shipped example declares a structural model with entities to select, so there is "
        + "nothing to read here yet.",
    }];
  }

  // TWO readouts for ONE question, because they are two operations and the difference between them
  // is the lesson: the first hands back the things, the second hands back the figure and drops the
  // list, so asking "how many" over a large table does not return the table.
  const blocks: QuestionBlock[] = [
    {
      kind: "pairs",
      label: "Asked now — which things this shipped model declares",
      pairs: [
        ["Asked of", nameOf(systems, reading.example)],
        ["The question, as the engine understood it", reading.question],
        ["What is there", reading.ids.join(", ")],
        ["Verdict", reading.selectionVerdict],
        ["Entity types this system declares", reading.declaredTypes.join(", ")],
      ],
    },
    {
      kind: "pairs",
      label: "The same question, counted — the figure, without the list",
      pairs: [
        ["How many", String(reading.count.value)],
        // `basis` names the domain whose exhaustive read earns the figure, and the type carries
        // `exact: true` as a literal — so a bounded count cannot borrow this wording without
        // breaking this line first.
        ["What makes that figure exact", `the ${reading.count.basis.replace(/-/g, " ")}, read whole`],
        ["Verdict", reading.countVerdict],
      ],
    },
  ];

  const deciding = decidingQuestion(systems, reading.example);
  if (deciding !== null) {
    blocks.push({
      kind: "pairs",
      label: "The other kind, asked of the same model — a question that makes a claim",
      pairs: [
        ["The question, as its author stated it", deciding.statement],
        ["Verdict", deciding.result.outcome],
        ["Evidence", evidenceText(deciding.result.evidence)],
        ["Coverage", coverageText(deciding.result)],
      ],
    });
  }

  blocks.push({
    kind: "prose",
    text: "One test separates the two kinds: does the question make a claim? “Which entities…” and "
      + "“how many” report what the model declares, so nothing is left for a witness to establish "
      + "or for a counterexample to break. “Is this reachable from that” asserts something, so the "
      + "answer comes back as a verdict carrying the evidence that settles it.",
  });
  blocks.push({
    kind: "prose",
    text: "That is also why the figure above says what earns it. Count a table read whole and you "
      + "have a count; count what a search reached before it stopped and you have a floor. A bare "
      + "integer cannot tell you which one you hold, so a reader supplies the stronger reading. "
      + "Each model form's own card lists the nouns it lets a question name.",
  });
  return blocks;
}

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

/**
 * The guidance's §12, derived — and its register is restrained on purpose.
 *
 * Not "About SysML". The section's job is to tell a student that the vocabulary they have been
 * using stands on established work, name what that work is per construct, and say plainly where it
 * stands on nothing but this project. Understanding SysML is not made a prerequisite for anything:
 * the section sits near the end of the page, after every question has already been asked and
 * answered without it.
 */
function foundationBlocks(): readonly QuestionBlock[] {
  const forms = formRows();
  const borrowed = borrowedSubstrates();
  const standards = standardsNamed();
  const primitives = MODEL_TYPES.flatMap((t) => t.query.primitives);
  const countOf = (kind: SemanticBasis["kind"]): number =>
    primitives.filter((p) => p.semanticBasis.kind === kind).length;

  const blocks: QuestionBlock[] = [
    {
      kind: "prose",
      // The claim is built from the standards the registry actually names, so a registry that
      // borrowed nothing could not produce this sentence — it would say so instead.
      text: standards.length === 0
        ? "The workbench uses a small educational modeling vocabulary, and its registry currently "
          + "attributes none of it to a published standard. Every construct below is the "
          + "workbench's own or grounded outside any standard it borrows from."
        : "The workbench uses a small educational modeling vocabulary. What each model form "
          + `REPRESENTS is a declared subset of ${inProse(standards)} concepts; what you can ASK of `
          + "it is a mix of established verification ideas and the workbench's own analysis "
          + "semantics. The rows below say which, construct by construct, and name a standard only "
          + "where something is actually borrowed.",
    },
  ];

  if (borrowed.length > 0) {
    blocks.push({
      kind: "rows",
      label: "What each model form represents, and the standard concept it realizes a subset of",
      columns: ["Model form", "Standard", "The concept it realizes a subset of", "Clause", "Conformance fixture"],
      rows: borrowed.map(({ of, basis }) => [
        of.label, basis.standard, basis.concept, basis.clause, basis.fixture ?? CLAUSE_OWED,
      ]),
    });
  }

  blocks.push({
    kind: "rows",
    label: "Where each question form's semantics come from",
    columns: ["Question forms", "Asked of", "Where their semantics come from", "Cited at"],
    rows: forms.map((r) => [r.what, r.askedOf ?? "—", basisAccount(r.basis), basisCitation(r.basis)]),
  });

  const ours = notAttributedItems();
  if (ours.length > 0) {
    blocks.push({
      kind: "bullets",
      // The rule's second half, rendered rather than promised: over-attribution and
      // under-attribution are symmetric failures, so the constructs with no standard behind them
      // get the same visibility as the ones that have one.
      label: standards.length === 0
        ? "Attributed to no standard"
        : `Not attributed to ${inProse(standards, "or")}`,
      items: ours,
    });
  }

  blocks.push({
    kind: "pairs",
    label: "The attribution, counted now",
    pairs: [
      ["Model-form substrates borrowed from a standard",
        `${borrowed.length} of ${MODEL_TYPES.length}`],
      ["Question forms borrowed from a standard",
        `${countOf("borrowed")} of ${primitives.length}`],
      ["Question forms grounded outside this project",
        `${countOf("extension-grounded")} of ${primitives.length}`],
      ["Question forms that are the workbench's own",
        `${countOf("extension")} of ${primitives.length}`],
      ["Conformance fixtures demonstrating a borrowed correspondence",
        `${borrowed.filter((b) => b.basis.fixture !== null).length} of ${borrowed.length}`],
      // Rung 3, as a value a reader and a test can both address by its term.
      ["What a borrowed correspondence is worth today", "asserted"],
    ],
  });

  blocks.push({
    kind: "prose",
    text: "Every borrowed row above is `asserted`, which is a specific and limited claim: a person "
      + "read the specification and the model together, on a date. Nothing re-derives it on every "
      + "run. The workbench takes no runtime dependency on the SysML v2 reference implementation, "
      + "so no gate here checks a correspondence against the standard, and none is implied — the "
      + "conformance fixtures that would let a reader reproduce one by hand are owed, and the table "
      + "says so rather than leaving the cell blank.",
  });

  blocks.push({
    kind: "prose",
    text: "None of this is a prerequisite. Every question on this page was asked and answered "
      + "without it. Students who go on into model-based systems engineering, formal methods or "
      + "graduate study will meet the fuller versions of these ideas, and will find the small "
      + "vocabulary here sits inside them rather than beside them.",
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

  // The guidance's §13 wants the box to be standards-relative as well as workbench-relative, and
  // that half needs the attribution field. One table and one sentence: the recursion is the
  // teaching point, and the guidance says in terms not to belabour it.
  const borrowed = borrowedSubstrates();
  const standards = standardsNamed();
  if (borrowed.length > 0) {
    blocks.push({
      // A readout rather than a table, and short on purpose: the concept each construct subsets is
      // already named once on this page, under "Where do these ideas come from?". Saying it twice
      // is the belabouring the guidance warns against.
      kind: "pairs",
      label: "And the vocabulary itself is a reduction — each borrowed construct realizes a subset",
      pairs: borrowed.map(({ of, basis }) =>
        [of.label, `a declared subset of ${basis.standard}`] as const),
    });
    blocks.push({
      kind: "prose",
      text: `Each of those is a subset claim, which is the same thing as saying ${inProse(standards)} `
        + "carry more than the workbench exposes. What they carry beyond it is not listed here: the "
        + "registry records which concept each construct subsets, not what the specification holds "
        + "around it, and a list written from anywhere else would be a claim about a standard made "
        + "from memory.",
    });
  }

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
      case "question-operations": return { section, blocks: operationBlocks(systems) };
      case "question-evidence": return { section, blocks: evidenceBlocks(systems) };
      case "question-properties": return { section, blocks: propertyBlocks(systems, fixtures) };
      case "question-requirements": return { section, blocks: requirementBlocks(systems, fixtures) };
      case "question-agents": return { section, blocks: agentBlocks() };
      case "question-foundations": return { section, blocks: foundationBlocks() };
      case "question-omissions": return { section, blocks: omissionBlocks(systems) };
      default:
        throw new Error(`question section '${section.anchor}' is declared with no builder`);
    }
  });
}
