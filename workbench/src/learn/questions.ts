/**
 * The question sections — Learn's reframe, and the one place a section's content is COMPUTED.
 *
 * ## What these sections are, and why they are not guide sections
 *
 * `workbench-guide.ts` holds sections nothing in the kernel derives, because nothing in a model
 * kernel knows how a pane reads. These are the opposite case: each one teaches a CAPABILITY, so
 * each one must come from a source the kernel consults or ships, and a section whose source went
 * away must change what it says. Most do it by running a question and rendering what comes back;
 * one renders a gate's own verdict; the two cross-model sections render the binding and
 * composition registries and then go and find real instances of them in the shipped corpus.
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
 * between them is visible on the page and not only in CI.
 * `question-ceilings` resolves a two-name chain — requirement to saved question to declared quantity
 * — and runs the question at the end of it, so the separation it teaches is four lookups a reader can
 * repeat rather than a taxonomy. Its "the magnitude it states" column is the claim it exists to make,
 * and that column is filled from each declaration's own fields; a figure appearing in a second row
 * would show up on the page as a second figure. It states no refusal, because the arm that refuses an
 * obligation named against a question that cannot decide it is scoped and not landed.
 * `question-agents` renders
 * `affordanceParityGate()`'s own headline, including a non-zero violation count if one appears.
 * `question-omissions` quotes the refusals the shipped questions actually earn.
 * `question-bindings` states the §8 lesson — a binding does not merge the models — as two
 * `Purpose` records read from one bound pair, so the claim is two declarations a reader can
 * compare rather than this page's word for it, and it distinguishes "the corpus declares none"
 * from "this page cannot read that spelling" instead of printing a zero for both.
 * `question-compositions` asks the composed question AND the same question with the selection
 * dropped, then once per state the bound machine declares: the verdict and the figure move with
 * the selection, which is the composition, and no row of it is written down here.
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
  BINDINGS, CLAUSE_OWED, COMPOSITIONS, MODEL_TYPES, modelTypeForQueryKind,
  type BindingSemantics, type CompositionSemantics, type ModelType, type ModelTypeId,
  type PrimitiveGate, type SchemaAuthority, type SemanticBasis,
} from "../engine/model-types.ts";
import { QUANTIFIERS, QUANTIFIER_EVIDENCE } from "../engine/types.ts";
import { countElements, selectElements, type Cardinality } from "../engine/elements.ts";
import { runQuery } from "../engine/index.ts";
import type { CanonicalSystem, Evidence, Purpose, QueryResult } from "../ir/types.ts";
import { DIMENSIONS, UNIT_DIMENSIONS } from "../ir/types.ts";
import { SHIPPED_EXAMPLE_IDS, type ShippedExampleId } from "../app/examples.ts";
import { affordanceParityGate, CAPABILITIES, ESCAPE_HATCHES } from "../app/capabilities.ts";
import {
  ceilingQuestions, composedQuantityQuery, declaredUnitOf, exemplarFor, quantityRows,
  savedStatements,
  type CeilingQuestion, type LoadedSystems, type QuantityRow,
} from "./content.ts";
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
  // The two cross-model sections, SIXTH and SEVENTH in the author's own page order (§16: "6. One
  // system, several purposeful models — Bindings, Composition"), which puts them after the two
  // kinds of evidence and before properties. The order is the pedagogy again: a student meets what
  // one model answers, then how an answer is evidenced, and only then what a SECOND model adds —
  // because the second model is reached through the first one's declared omissions.
  {
    anchor: "question-bindings",
    heading: "One system, several purposeful models — what connects them?",
    lede: "Two models of one system answer different questions. A binding states how their "
      + "elements correspond — and it does not combine them into one larger model: each keeps its "
      + "own purpose and its own omissions.",
    derivedFrom: [
      {
        file: "src/engine/model-types.ts", symbol: "export const BINDINGS",
        role: "every declared correspondence between elements in different purposeful models: the "
          + "domains it runs between, what it means, what licenses it, and where a model authors "
          + "it — the registry owns the count, so this section can neither add a binding nor keep "
          + "one the kernel dropped",
      },
      {
        file: "src/engine/model-types.ts", symbol: "export interface BindingSemantics",
        role: "what a binding may declare, and what it may NOT: its licensing is a declaration "
          + "gate rather than anything that could name a query, which is the typed form of \"a "
          + "binding does not consume the result of a query\" — the line between this section and "
          + "the next one",
      },
      {
        file: "src/engine/model-types.ts", symbol: "export type BindingWitness",
        role: "how a model document SPELLS a binding's reference — the authored keys and the "
          + "shared-membership case, which is what lets this section find real correspondences in "
          + "the shipped examples instead of asserting that they exist",
      },
      {
        file: "src/ir/types.ts", symbol: "export interface Purpose",
        role: "each model's own declared question, what it represents and what it omits — read per "
          + "bound subject, which is how \"each retains its purpose and omissions\" is shown as "
          + "two declarations rather than claimed in a sentence",
      },
    ],
  },
  {
    anchor: "question-compositions",
    heading: "Which questions need more than one model?",
    lede: "A binding says which things correspond. A composition lets one model participate in "
      + "answering a question over another — which is what makes the worst-case latency among "
      + "successful executions one question rather than two.",
    derivedFrom: [
      {
        file: "src/engine/model-types.ts", symbol: "export const COMPOSITIONS",
        role: "every cross-domain composition the kernel admits — v0.2 admits exactly one, and the "
          + "registry's own comment calls a second row a deliberate act with a ruling to cite "
          + "rather than a convenience",
      },
      {
        file: "src/engine/model-types.ts", symbol: "export interface CompositionSemantics",
        role: "what a composition declares: the noun whose extension the source domain's result "
          + "narrows, and a CITATION of the target dialect's own result type — a composition "
          + "restricts a domain and introduces no result kind of its own",
      },
      {
        file: "src/engine/types.ts", symbol: "export interface QuantityQuery",
        role: "`target` — the reach predicate where a behavioural result enters a quantitative "
          + "question; the one field the admitted composition is declared against, and the one "
          + "this section fills from a shipped behavioural question to ask the composed question",
      },
      {
        file: "src/quant/query.ts", symbol: "export function admitQuantityQuery",
        role: "the admission that reads the selection and the ceiling before anything explores — "
          + "so the sentence this section shows as the question is the evaluator's own reading of "
          + "it, selection included, rather than the page's restatement",
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
  // EIGHTH, directly after requirements, because it narrows the section before it. A reader has just
  // met the obligation and the outcome that satisfies it; the open question is what happens when the
  // thing obliged is a MAGNITUDE, which is where a figure could be written down twice. Placed here
  // rather than in the quantitative gallery section for a reason the gallery's own derivation gives:
  // that section's exemplar is whichever shipped example the registry's presence predicate reaches
  // first, and the chain this section reads spans a requirement, a question and a quantity across the
  // fixture and the system. The gallery shows one construct; this shows a join.
  {
    anchor: "question-ceilings",
    heading: "When what must be true is a number, where does the number live?",
    lede: "Asking whether a design fits a budget takes three things: the figure, a comparison "
      + "against it, and the obligation that the comparison come out a particular way. Three "
      + "declarations, one per job — and only the first of them says how much.",
    derivedFrom: [
      {
        file: "src/engine/types.ts", symbol: "export interface QuantityQuery",
        role: "`within` — the declared quantity a question decides against, held as a NAME; the "
          + "shape carries no field a magnitude could be written into instead, so a question cannot "
          + "state a second copy of the figure even by accident",
      },
      {
        file: "src/quant/query.ts", symbol: "export function admitQuantityQuery",
        role: "where the name becomes a number: the admission resolves the cited quantity and "
          + "converts its unit before anything explores, which is why the comparison belongs to the "
          + "question and the figure belongs to the quantity",
      },
      {
        file: "src/learn/fixtures.ts", symbol: "readonly expressedAs",
        role: "the obligation's own join — it names the question that decides it, and the fixture "
          + "shape gives a requirement no magnitude field either, so the chain to the figure is two "
          + "names long and has no shortcut",
      },
      {
        file: "examples/embedded-sensor-node/system.mage.yaml", symbol: "sram-budget:",
        role: "the worked example, and the author's own account of the separation: a budget is "
          + "declared as a quantity because it is a number, and the obligation that cites it is a "
          + "separate declaration naming the query rather than restating the figure",
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

/**
 * A computed figure in the unit the author DECLARED, with that unit, or a dash.
 *
 * ## Why the declared unit and not the result's own
 *
 * `ResultMagnitude` carries the dimension's BASE unit, and that contract is right where it lives:
 * a figure crossing the query surface without its dimension would let a consumer add milliseconds
 * to megabytes, which validation refuses. But `memory` bases at `MB`, so a model declaring a
 * `256 KB` ceiling and `232 KB` of allocations got a readout of `0.2265625 MB` — arithmetically
 * exact, and it hands the student the unit conversion they came here to be spared. The figure and
 * the ceiling it is decided against must be directly comparable, so the figure is shown in the
 * ceiling's unit.
 *
 * `declaredUnit` is therefore the unit of the thing this figure is judged against, resolved from
 * that quantity's own declaration — never chosen here, and never from a table of nice units.
 *
 * ## What it refuses
 *
 * A unit belonging to another dimension converts nothing: the figure stays in its base unit, which
 * is what shipped before this and is still true. Presentation does not get to do the cross-dimension
 * arithmetic the validation layer exists to forbid. Same for an unknown token, and for `null` — a
 * dimensionless result carries no unit and gains none.
 *
 * ## The number stays exact
 *
 * Every factor in the dimension table is an integer multiple of a power of two, so dividing a base
 * figure by one introduces no rounding: `0.2265625 / 2^-10` is 232 on the nose. Nothing is rounded
 * for display either, because a figure rounded toward a ceiling would read as fitting under it.
 *
 * Exported so a test can re-derive the rendering rather than match a sentence, which is why
 * `selectionEffect` is exported too.
 */
export function magnitudeText(result: QueryResult, declaredUnit: string | null): string {
  const m = result.magnitude;
  if (m === null) return "—";
  const factor = declaredUnit === null || UNIT_DIMENSIONS.get(declaredUnit) !== m.dimension
    ? undefined
    : DIMENSIONS[m.dimension].units[declaredUnit];
  const [value, unit] = factor === undefined || factor === 0
    ? [m.value, m.unit]
    : [m.value / factor, declaredUnit];
  return `${value}${unit === null ? "" : ` ${unit}`}`;
}

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

/** A loaded query object, guarded. Saved `raw` is validated by the examples suite; this is reading. */
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** A saved question's authored name, which is the statement its author gave it. */
function statementOf(system: CanonicalSystem, id: string): string {
  const raw: unknown = system.queries.get(id)?.raw;
  if (isObject(raw)) {
    const name = raw["name"];
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
  /** The unit the chosen ceiling declares, so the figure deciding it reads in the same unit. */
  readonly ceilingUnit: string | null;
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
    return {
      example, metric: composed.metric, ceiling: composed.ceiling,
      ceilingUnit: declaredUnitOf(system, composed.ceiling), result,
    };
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
      ["The figure that decides it",
        magnitudeText(counterexample.result, counterexample.ceilingUnit)],
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
 * Two shapes, because two ship — and the split is NOT by requirement kind. CORRECTED 261005: this
 * comment used to say a quantitative requirement "names the declared ceiling instead", which two
 * shipped quantity-decided requirements refute (`firmware-fits-physical-sram` and
 * `successful-processing-within-two-seconds` both name a saved question through `expressed_as`).
 *
 * The real split is whether a saved question states the question. When one does, it is run. When none
 * does — two `document-processing` rows name only a `declared_as` ceiling — the question is derived
 * from that ceiling via `composedQuantityQuery`, with the requirement's OWN ceiling rather than the
 * system's first, because those two rows are of different dimensions and the first would decide both
 * against the wrong one.
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

// ---------------------------------------------------------------------------------------------
// Ceilings — the three-role separation, read off the corpus rather than stated
//
// A requirement about a magnitude is assembled from three declarations: a quantity declares the
// figure, a saved question compares against it BY REFERENCE, and the requirement obliges the
// comparison to come out a particular way. The chain below is the join that shows it, and every cell
// of it resolves a name the corpus authored.
//
// What this section does NOT say: that anything refuses a requirement whose named question cannot
// decide it. Such a pairing derives `satisfied` today, which is a measured defect with a ruling
// against it and an engine arm scoped but not landed. A page claiming that refusal would be claiming
// enforcement that does not exist, so the section teaches the sound shape and stops there.
// ---------------------------------------------------------------------------------------------

/** One requirement whose deciding question cites a declared ceiling, with every link resolved. */
interface CeilingChain {
  readonly example: ShippedExampleId;
  readonly requirementId: string;
  readonly statement: string;
  readonly satisfiedWhen: string;
  readonly question: CeilingQuestion;
  readonly ceiling: QuantityRow;
  readonly result: QueryResult | null;
}

/**
 * Every obligation in the corpus that reaches a declared ceiling, by resolving the two names.
 *
 * A row survives only when BOTH links resolve: the requirement's `expressed_as` names a saved
 * question this system declares, and that question's `within:` names a quantity it declares. A
 * dangling link drops the row rather than rendering a half chain, which is the same choice
 * `groundedIn` makes about an ungrounded pairing.
 */
function ceilingChains(systems: LoadedSystems, fixtures: LoadedFixtures): readonly CeilingChain[] {
  const out: CeilingChain[] = [];
  for (const example of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(example);
    const fixture = fixtures.get(example);
    if (system === undefined || fixture === undefined) continue;
    const asked = new Map(ceilingQuestions(system).map((q) => [q.id, q]));
    const declared = new Map(quantityRows(system).map((r) => [r.id, r]));
    for (const req of fixture.requirements) {
      if (req.expressedAs === null) continue;
      const question = asked.get(req.expressedAs);
      if (question === undefined) continue;
      const ceiling = declared.get(question.ceiling);
      if (ceiling === undefined) continue;
      out.push({
        example,
        requirementId: req.id,
        statement: req.statement,
        // A ceiling claim is universal, so `holds` is the only outcome that satisfies it; the
        // fixture states it anyway on both shipped rows, and this reads what is there.
        satisfiedWhen: req.satisfiedWhen ?? "holds",
        question,
        ceiling,
        result: runSaved(system, question.id),
      });
    }
  }
  return out;
}

function ceilingBlocks(systems: LoadedSystems, fixtures: LoadedFixtures): readonly QuestionBlock[] {
  const chains = ceilingChains(systems, fixtures);
  // The worked example, chosen by a property rather than by name: the chain whose question measures
  // every execution instead of narrowing them. The narrowed one is a COMPOSITION, and the section
  // before last already teaches that — showing it here would make the selection look like part of
  // the separation. Falls back to the first chain so this section cannot empty itself.
  const worked = chains.find((c) => !c.question.selects) ?? chains[0];
  const blocks: QuestionBlock[] = [
    {
      kind: "prose",
      text: "\"Does the firmware fit in the part's SRAM?\" sounds like one question and decomposes "
        + "into three. How much SRAM the part has. Whether the design stays under that. Whether it "
        + "must. Each one wants a different kind of declaration, so the workbench keeps them apart "
        + "instead of folding them into a single line that would answer all three at once.",
    },
  ];
  if (worked !== undefined) {
    const answer = worked.result;
    blocks.push({
      kind: "pairs",
      label: `Three questions, three declarations — ${nameOf(systems, worked.example)}`,
      pairs: [
        ["How much is there?",
          `'${worked.ceiling.id}' declares ${worked.ceiling.value} of `
          + `${worked.ceiling.dimension} against ${worked.ceiling.target}`],
        ["Does the design stay under it?",
          `'${worked.question.id}' asks ${worked.question.quantifier} `
          + `${worked.question.metric} within '${worked.question.ceiling}'`],
        ["Must it?",
          `'${worked.requirementId}' obliges it, and is satisfied when that question is `
          + `${worked.satisfiedWhen}`],
        // The figure reads in the ceiling's own unit, so the row above and this one can be compared
        // by eye. A reader asked to convert between them is being asked to check the model by hand,
        // which is the work this separation exists to do for them.
        ["And does it, on this revision?",
          answer === null ? "—"
            : `${answer.outcome} — ${magnitudeText(answer, worked.ceiling.unit)}, `
              + coverageText(answer)],
      ],
    });
    blocks.push({
      kind: "rows",
      label: "What each of the three declarations carries",
      columns: ["The declaration", "Its job", "The magnitude it states", "The name it cites"],
      rows: [
        [`${worked.ceiling.id} (quantity)`, "declares the figure", worked.ceiling.value, "—"],
        [`${worked.question.id} (question)`, "compares against it", "—",
          `within: ${worked.question.ceiling}`],
        [`${worked.requirementId} (requirement)`, "obliges the comparison", "—",
          `expressed_as: ${worked.question.id}`],
      ],
    });
  }
  blocks.push({
    kind: "rows",
    label: "Every obligation the corpus states about a declared ceiling",
    columns: ["The obligation", "names the question", "which cites the ceiling", "declaring",
      "and it answers"],
    rows: chains.map((c) => [
      c.requirementId, c.question.id, c.ceiling.id, c.ceiling.value,
      c.result === null ? "—" : c.result.outcome,
    ]),
  });
  blocks.push({
    kind: "prose",
    text: "Both verdicts ship, which keeps this a shape rather than a success story: the corpus meets "
      + "one budget and misses one deadline through the same three declarations. The figure itself "
      + "has one home. A question cites the quantity by name, a requirement cites the question by "
      + "name, so re-specifying the part edits a single declaration. Nothing downstream can disagree "
      + "with it, because neither of the other two has anywhere to keep a copy.",
  });
  return blocks;
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

// ---------------------------------------------------------------------------------------------
// The cross-model relationships — the registry's own rows, and real correspondences in the corpus
//
// Two sections, and the split is §4.1's: a BINDING declares a correspondence and consumes no query
// result; a COMPOSITION lets a result from one domain participate in evaluating a question in
// another. Both read `BINDINGS` / `COMPOSITIONS`, which are separately typed and separately
// totalized, so neither section can add a relationship the kernel does not declare, drop one it
// does, or move a row across the line — the registry decides which array a row is in.
//
// What the page does NOT do with them: draw them. §23.3 asks for two models side by side with a
// line between their canonical elements, and no cross-model canvas exists
// (`DESIGN-render-rules-261004.md` §A.4 measured it: `SceneSubject` names ONE subject and nothing
// composes two rendered views). So the correspondence is a readout, the two bound models are each
// drawn in their own section by their own renderer, and `bindingBlocks` says so on the page rather
// than leaving a reader to wonder where the picture went. Inventing a composer here would put a
// second, unregistered source of cross-model edges in the app layer, which is the failure that
// design's §E is written to prevent.
// ---------------------------------------------------------------------------------------------

const TYPE_LABELS: ReadonlyMap<ModelTypeId, string> =
  new Map(MODEL_TYPES.map((t) => [t.id, t.label]));

/** A model type's label. Throws on an unregistered id, which `ModelTypeId` already prevents. */
function labelOf(id: ModelTypeId): string {
  const label = TYPE_LABELS.get(id);
  if (label === undefined) throw new Error(`'${id}' is not a registered model type`);
  return label;
}

/**
 * The two domains a relationship runs between.
 *
 * `from === to` is meaningful and the registry says why: the binding runs between purposeful models
 * of ONE type, which is `appears-in`'s case. Rendering that as "X → X" would read as a typo.
 */
const betweenText = (from: ModelTypeId, to: ModelTypeId): string =>
  from === to ? `two ${labelOf(from)}s` : `${labelOf(from)} → ${labelOf(to)}`;

/** What licenses a relationship, in the gate's own words — a citation, or the by-construction why. */
const gateText = (gate: PrimitiveGate): string =>
  gate.kind === "declared"
    ? `declared per system — ${gate.by.file} (${gate.by.symbol})`
    : `by construction — ${gate.why}`;

/**
 * The correspondences one shipped system really declares for one binding, in the models' own words.
 *
 * Driven by the binding's `witness` rather than by a branch per binding name, because the witness
 * field exists for exactly this: it declares how a model document SPELLS the reference. So the walk
 * reads `keys` and the membership arm instead of knowing that `machine-of-entity` is spelled
 * `entity`, and a binding whose spelling changes changes what this finds.
 *
 * `unwalkable` is the honest third answer, and it is not the same as zero. A correspondence whose
 * source noun this page has no reader for (a `transition`, a `variable`) would otherwise be
 * reported as "the shipped examples declare none", which is a claim about the corpus made from a
 * gap in the walk. The reason names the noun, so the row says which of the two it is.
 */
type Witnessed =
  | { readonly kind: "walked"; readonly phrases: readonly string[] }
  | { readonly kind: "unwalkable"; readonly why: string };

function witnessedBy(binding: BindingSemantics, system: CanonicalSystem): Witnessed {
  const { source, target } = binding.correspondence;
  if (binding.witness.kind === "shared-membership") {
    if (source !== "entity" || target !== "model") {
      return {
        kind: "unwalkable",
        why: `membership between a ${source} and a ${target} is not a walk this page performs`,
      };
    }
    // The correspondence IS the membership: an element more than one purposeful model declares.
    const declaredBy = new Map<string, string[]>();
    for (const [modelId, model] of system.models) {
      for (const entity of model.entities) {
        declaredBy.set(entity, [...(declaredBy.get(entity) ?? []), modelId]);
      }
    }
    return {
      kind: "walked",
      phrases: [...declaredBy]
        .filter(([, models]) => models.length > 1)
        .map(([entity, models]) => `${entity} is declared by ${models.join(", ")}`),
    };
  }

  const keys = binding.witness.keys;
  switch (source) {
    case "machine": {
      // `CanonMachine.entity` is the one authored machine-level reference the IR carries, so a
      // declared key this page cannot read says so rather than finding nothing.
      if (!keys.includes("entity")) {
        return {
          kind: "unwalkable",
          why: `a machine reference spelled ${keys.join(", ")} is not a field the IR's machine `
            + "record carries, so this page cannot read it",
        };
      }
      const phrases: string[] = [];
      for (const [machineId, machine] of system.machines) {
        if (machine.entity !== null) phrases.push(`${machineId}.entity = ${machine.entity}`);
      }
      return { kind: "walked", phrases };
    }
    case "entity": {
      const phrases: string[] = [];
      for (const [entityId, entity] of system.entities) {
        for (const key of keys) {
          const value = entity.properties.get(key);
          if (value !== undefined) phrases.push(`${entityId}.${key} = ${String(value.value)}`);
        }
      }
      return { kind: "walked", phrases };
    }
    default:
      return {
        kind: "unwalkable",
        why: `an authored ${source} reference (spelled ${keys.join(", ")}) is not a walk this page `
          + "performs",
      };
  }
}

/** One binding, and what the shipped corpus declares of it. Total over `BINDINGS`, by construction. */
interface BindingCorpusRow {
  readonly binding: BindingSemantics;
  readonly examples: readonly string[];
  readonly count: number;
  /** One real correspondence, as the models write it. Null when the corpus declares none. */
  readonly instance: string | null;
  /** Why the walk could not look, when it could not. Distinct from "it looked and found none". */
  readonly unwalkable: string | null;
}

function bindingCorpusRows(systems: LoadedSystems): readonly BindingCorpusRow[] {
  return BINDINGS.map((binding) => {
    const examples: string[] = [];
    let count = 0;
    let instance: string | null = null;
    let unwalkable: string | null = null;
    for (const example of SHIPPED_EXAMPLE_IDS) {
      const system = systems.get(example);
      if (system === undefined) continue;
      const found = witnessedBy(binding, system);
      if (found.kind === "unwalkable") { unwalkable = found.why; continue; }
      if (found.phrases.length === 0) continue;
      examples.push(system.name);
      count += found.phrases.length;
      instance ??= `${found.phrases[0] ?? ""} — in ${system.name}`;
    }
    return { binding, examples, count, instance, unwalkable };
  });
}

/**
 * One real binding between a behavioural model and the structural model that declares its entity.
 *
 * The §8 lesson needs an INSTANCE, because the lesson is about two declarations: *"a binding does
 * not combine the models into one larger model. Each retains its purpose and omissions."* Shown as
 * two `Purpose` records read from one shipped system, that sentence is a readout; written as prose
 * it is this page's word for it.
 *
 * Chosen by a stated rule, so the choice is defensible rather than picked: the first shipped
 * example, in shipped order, with a machine→entity binding whose BOTH sides are real — a machine
 * naming an entity, and a purposeful model declaring that entity. Null when the corpus has none,
 * and the builder reports the absence rather than hiding it.
 */
interface BoundPair {
  readonly binding: BindingSemantics;
  readonly systemName: string;
  readonly machineId: string;
  readonly entityId: string;
  readonly modelId: string;
  readonly machinePurpose: Purpose;
  readonly modelPurpose: Purpose;
}

function boundPair(systems: LoadedSystems): BoundPair | null {
  const binding = BINDINGS.find(
    (b) => b.correspondence.source === "machine" && b.correspondence.target === "entity");
  if (binding === undefined) return null;
  for (const example of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(example);
    if (system === undefined) continue;
    for (const [machineId, machine] of system.machines) {
      const entityId = machine.entity;
      if (entityId === null) continue;
      const owner = [...system.models].find(([, model]) => model.entities.includes(entityId));
      if (owner === undefined) continue;
      return {
        binding, systemName: system.name, machineId, entityId,
        modelId: owner[0], machinePurpose: machine.purpose, modelPurpose: owner[1].purpose,
      };
    }
  }
  return null;
}

/**
 * The distinct binding bases, each with the bindings that declare it.
 *
 * Grouped by reference identity on the `SemanticBasis` object, not by its rendered sentence: two
 * bases that happen to read alike are two claims and should separate, and one basis shared by three
 * rows is one claim and should not be printed three times.
 */
function bindingBases(): readonly { readonly names: readonly string[]; readonly basis: SemanticBasis }[] {
  const groups: { names: string[]; basis: SemanticBasis }[] = [];
  for (const b of BINDINGS) {
    const existing = groups.find((g) => g.basis === b.semanticBasis);
    if (existing === undefined) groups.push({ names: [b.name], basis: b.semanticBasis });
    else existing.names.push(b.name);
  }
  return groups;
}

/** A declared question, trimmed. Authored YAML block scalars carry trailing newlines. */
const questionText = (purpose: Purpose): string =>
  purpose.question === null ? "(none declared)" : purpose.question.trim();

const semicolons = (items: readonly string[]): string =>
  items.length === 0 ? "(none declared)" : items.join("; ");

function bindingBlocks(systems: LoadedSystems): readonly QuestionBlock[] {
  const blocks: QuestionBlock[] = [{
    kind: "rows",
    label: "Every binding the workbench declares",
    columns: ["Binding", "Between", "What the correspondence means", "What licenses it"],
    rows: BINDINGS.map((b) => [
      b.name, betweenText(b.from, b.to), b.interpretation, gateText(b.licensing),
    ]),
  }, {
    kind: "rows",
    label: "What each one puts in correspondence, and where a model writes it",
    columns: ["Binding", "Corresponds", "Where it is authored"],
    rows: BINDINGS.map((b) => [
      b.name,
      `${b.correspondence.source} → ${b.correspondence.target}`,
      `${b.declaredBy.file} (${b.declaredBy.symbol})`,
    ]),
  }, {
    // Grouped by the basis OBJECT rather than printed per row, for the reason the foundations
    // section merges its own list: today all three bindings share one `SemanticBasis`, and a
    // column would print the same subset paragraph three times — which reads as three separate
    // claims about KerML. The grouping is by reference identity, so a binding that grows its own
    // basis separates out on its own.
    kind: "pairs",
    label: "Where the binding semantics come from",
    pairs: bindingBases().map(({ names, basis }) =>
      [names.join(", "), basisAccount(basis)] as const),
  }, {
    kind: "rows",
    label: "And where the shipped examples declare them",
    columns: [
      "Binding", "Shipped examples that declare it", "How many correspondences",
      "One of them, as the models write it",
    ],
    rows: bindingCorpusRows(systems).map((r) => [
      r.binding.name,
      r.examples.length === 0 ? "—" : r.examples.join(", "),
      r.count === 0 && r.unwalkable !== null ? "not readable from a model document" : String(r.count),
      r.instance ?? r.unwalkable ?? "—",
    ]),
  }];

  const pair = boundPair(systems);
  if (pair === null) {
    blocks.push({
      kind: "prose",
      text: "No shipped example declares a behavioural model against an entity a purposeful model "
        + "also declares, so this page cannot show the two-declaration case from a real system.",
    });
    return blocks;
  }

  const shared = pair.machinePurpose.omits.filter((o) => pair.modelPurpose.omits.includes(o));
  const onlyBehavioural = pair.machinePurpose.omits.filter((o) => !shared.includes(o));
  const onlyStructural = pair.modelPurpose.omits.filter((o) => !shared.includes(o));
  blocks.push({
    kind: "pairs",
    label: "Two models, bound — and each keeps its own purpose and omissions",
    pairs: [
      ["The binding", pair.binding.name],
      ["Asked of", pair.systemName],
      ["The correspondence, as the model writes it", `${pair.machineId}.entity = ${pair.entityId}`],
      ["What the behavioural model asks", `${pair.machineId} — ${questionText(pair.machinePurpose)}`],
      ["What the structural model asks", `${pair.modelId} — ${questionText(pair.modelPurpose)}`],
      ["What the behavioural model leaves out", semicolons(pair.machinePurpose.omits)],
      ["What the structural model leaves out", semicolons(pair.modelPurpose.omits)],
      ["Omissions both of them declare", semicolons(shared)],
    ] as const,
  });
  blocks.push({
    kind: "prose",
    text: `The binding changed neither list. ${onlyBehavioural.length} of the behavioural model's `
      + `omissions are not the structural model's, and ${onlyStructural.length} of the structural `
      + `model's are not the behavioural model's; a single merged model would have to drop both `
      + "sets, and that is the reduction each author chose. The correspondence lets an answer in "
      + "one model name an element the other declares, and nothing more.",
  });
  blocks.push({
    kind: "prose",
    text: `Each of those two models is drawn above, in its own section, by the renderer for its own `
      + "model form — their boundaries are two pictures rather than one. The workbench does not "
      + "yet draw the correspondence itself: there is no cross-model canvas, so the line between "
      + "the two is this readout.",
  });
  return blocks;
}

/**
 * The composed question, asked — and the same question with the selection dropped.
 *
 * §9's case, worked: a behavioural predicate selects the executions a quantitative question is
 * evaluated over, which is what makes "the worst-case latency among successful executions" ONE
 * question. Both halves are run, because the lesson is the difference between them and a page that
 * showed only the composed figure would be showing a number, not a composition.
 *
 * The selection is a shipped saved behavioural question, not one written here, and the rule is:
 * form `reach` — the behavioural form that denotes "executions reaching φ", which is what
 * `QuantityQuery.target` means — with no `avoid` clause and a single-state target. The exclusions
 * are the point. An `avoid` clause narrows by exclusion and the quantity's reach predicate has
 * nowhere to put it, so carrying one across would show a selection the engine did not make; a
 * multi-atom target would do the same to the state spread below.
 */
interface StateSelection {
  readonly id: string;
  readonly statement: string;
  /** The ref the model's own question names, e.g. `document-lifecycle.state`. Never spelled here. */
  readonly ref: string;
  readonly value: string;
}

function stateSelections(system: CanonicalSystem): readonly StateSelection[] {
  const out: StateSelection[] = [];
  for (const id of system.queries.keys()) {
    const raw: unknown = system.queries.get(id)?.raw;
    if (!isObject(raw) || raw["kind"] !== "behavior") continue;
    const behavior = raw["behavior"];
    if (!isObject(behavior) || behavior["form"] !== "reach" || "avoid" in behavior) continue;
    const target = behavior["target"];
    if (!isObject(target)) continue;
    const entries = Object.entries(target);
    const only = entries.length === 1 ? entries[0] : undefined;
    if (only === undefined) continue;
    const [ref, value] = only;
    if (typeof value !== "string") continue;
    out.push({ id, statement: statementOf(system, id), ref, value });
  }
  return out;
}

interface ComposedReading {
  readonly composition: CompositionSemantics;
  readonly systemName: string;
  readonly selection: StateSelection;
  readonly metric: string;
  readonly ceiling: string;
  /** The unit that ceiling declares. Every figure in this reading is shown in it. */
  readonly ceilingUnit: string | null;
  readonly composed: QueryResult;
  readonly uncomposed: QueryResult;
  /** The machine whose state vocabulary the selection's value belongs to. */
  readonly machineId: string;
  /** The same composed question, once per declared state of that machine. */
  readonly spread: readonly { readonly state: string; readonly result: QueryResult }[];
}

function composedReading(systems: LoadedSystems): ComposedReading | null {
  // Which composition can be ASKED here, derived from the registry's own query-kind mapping rather
  // than from two literal type ids: the one whose source domain is the dialect a behavioural
  // predicate belongs to and whose target domain is the dialect the question is asked in.
  const behavioural = modelTypeForQueryKind("behavior");
  const quantitative = modelTypeForQueryKind("quantity");
  const composition = COMPOSITIONS.find(
    (c) => c.from === behavioural.id && c.to === quantitative.id);
  if (composition === undefined) return null;

  for (const example of SHIPPED_EXAMPLE_IDS) {
    const system = systems.get(example);
    if (system === undefined) continue;
    const selection = stateSelections(system)[0];
    if (selection === undefined) continue;
    const machine = [...system.machines].find(([, m]) => m.states.includes(selection.value));
    if (machine === undefined) continue;
    const composedQuery = composedQuantityQuery(
      system, quantitative.query.forms, undefined, { [selection.ref]: selection.value });
    const plainQuery = composedQuantityQuery(system, quantitative.query.forms);
    if (composedQuery === null || plainQuery === null) continue;
    const composed = runQuery(system, composedQuery.query).result;
    const uncomposed = runQuery(system, plainQuery.query).result;
    if (composed.refusal !== null || uncomposed.refusal !== null) continue;
    return {
      composition, systemName: system.name, selection,
      metric: composedQuery.metric, ceiling: composedQuery.ceiling,
      ceilingUnit: declaredUnitOf(system, composedQuery.ceiling),
      composed, uncomposed, machineId: machine[0],
      spread: machine[1].states.map((state) => {
        const q = composedQuantityQuery(
          system, quantitative.query.forms, undefined, { [selection.ref]: state });
        return {
          state,
          result: q === null ? uncomposed : runQuery(system, q.query).result,
        };
      }),
    };
  }
  return null;
}

/**
 * What the behavioural selection did to the answer, by comparing the two the engine returned.
 *
 * Exported so the gate can re-derive the comparison instead of matching the sentence, and written
 * as a comparison rather than as a claim: the composed worst case is not guaranteed to be lower,
 * because the globally worst execution may be one the selection keeps. When it is, the honest thing
 * on the page is to say so and point at the spread, where a different selection does move it.
 */
export function selectionEffect(
  reading: {
    readonly composed: QueryResult;
    readonly uncomposed: QueryResult;
    readonly ceilingUnit: string | null;
  },
): string {
  const after = magnitudeText(reading.composed, reading.ceilingUnit);
  const before = magnitudeText(reading.uncomposed, reading.ceilingUnit);
  // Compared as NUMBERS and rendered as text, which are two jobs this once did with one value. The
  // engine normalizes both figures to the same base unit, so their values are directly comparable;
  // comparing the rendered strings instead would make the verdict depend on how the figures are
  // displayed, and would call two distinct figures unchanged the day a display unit coarsened them.
  const moved = (reading.composed.magnitude?.value ?? null) !== (reading.uncomposed.magnitude?.value ?? null);
  if (moved) {
    return `the worst case moved from ${before} to ${after}, because the executions measured are `
      + "now only the selected ones";
  }
  if (reading.composed.outcome !== reading.uncomposed.outcome) {
    return `the figure is unchanged at ${after}, but the verdict moved from `
      + `${reading.uncomposed.outcome} to ${reading.composed.outcome}`;
  }
  return `nothing, for this selection: the worst execution this system has is one the selection `
    + `keeps, so the figure stays at ${after}. Select a different state below and both the verdict `
    + "and the figure move — which is the point, and why the composition is a question about two "
    + "models rather than a filter that flatters one.";
}

function compositionBlocks(systems: LoadedSystems): readonly QuestionBlock[] {
  const blocks: QuestionBlock[] = [{
    kind: "rows",
    label: "Every cross-domain composition the workbench admits",
    columns: ["Composition", "Between", "What it means", "What it narrows"],
    rows: COMPOSITIONS.map((c) => [
      c.name, betweenText(c.from, c.to), c.interpretation, c.restricts,
    ]),
  }, {
    kind: "rows",
    label: "Where each one is grounded",
    columns: ["Composition", "What licenses it", "Result type", "Semantic basis"],
    rows: COMPOSITIONS.map((c) => [
      c.name,
      gateText(c.licensing),
      `${c.result.file} (${c.result.symbol}) — ${c.result.role}`,
      basisAccount(c.semanticBasis),
    ]),
  }];

  const reading = composedReading(systems);
  if (reading === null) {
    blocks.push({
      kind: "prose",
      text: "No shipped example declares both a behavioural model and a quantitative ceiling with a "
        + "saved reachability question to select on, so this page cannot show the composition at "
        + "work on a real system.",
    });
    return blocks;
  }

  blocks.push({
    kind: "pairs",
    label: "The composed question, asked now",
    pairs: [
      ["Asked of", reading.systemName],
      ["The behavioural selection, as its author stated it", reading.selection.statement],
      ["The question, as the engine understood it", reading.composed.interpretedAs ?? "—"],
      ["Verdict", reading.composed.outcome],
      ["The figure that decides it", magnitudeText(reading.composed, reading.ceilingUnit)],
      ["Evidence", evidenceText(reading.composed.evidence)],
      ["The declared ceiling it is decided against", reading.ceiling],
    ] as const,
  });
  blocks.push({
    kind: "pairs",
    label: "The same metric and the same ceiling, with no behavioural selection",
    pairs: [
      ["The question, as the engine understood it", reading.uncomposed.interpretedAs ?? "—"],
      ["Verdict", reading.uncomposed.outcome],
      ["The figure that decides it", magnitudeText(reading.uncomposed, reading.ceilingUnit)],
      // READ off the two answers rather than promised beside them. A selection that happens to
      // keep the worst execution changes nothing about the figure, and a page that implied
      // otherwise would be teaching that selecting always flatters.
      ["What this selection changed", selectionEffect(reading)],
    ] as const,
  });
  blocks.push({
    kind: "rows",
    label: `The same question, selected on each state ${reading.machineId} declares`,
    columns: ["Executions that reach", "Verdict", "The figure that decides it"],
    rows: reading.spread.map(
      (s) => [s.state, s.result.outcome, magnitudeText(s.result, reading.ceilingUnit)]),
  });
  blocks.push({
    kind: "prose",
    text: "One question, and the behavioural model decides what it is about: the verdict and the "
      + "figure both move as the selection moves, because the executions measured are the ones the "
      + "behavioural predicate reaches. That is what a composition is — the quantitative dialect "
      + "still returns its own kind of answer, a magnitude decided against a declared ceiling, and "
      + "no new kind of result was introduced to join the two.",
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
      case "question-bindings": return { section, blocks: bindingBlocks(systems) };
      case "question-compositions": return { section, blocks: compositionBlocks(systems) };
      case "question-properties": return { section, blocks: propertyBlocks(systems, fixtures) };
      case "question-requirements": return { section, blocks: requirementBlocks(systems, fixtures) };
      case "question-ceilings": return { section, blocks: ceilingBlocks(systems, fixtures) };
      case "question-agents": return { section, blocks: agentBlocks() };
      case "question-foundations": return { section, blocks: foundationBlocks() };
      case "question-omissions": return { section, blocks: omissionBlocks(systems) };
      default:
        throw new Error(`question section '${section.anchor}' is declared with no builder`);
    }
  });
}
