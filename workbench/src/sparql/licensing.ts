/**
 * The licensing gate: which questions this model licenses, decided from the IR, before evaluation.
 *
 * **The authority is the IR, not the query text (V32).** Nothing in RDF knows about
 * `pathComposition: forbidden`. A raw endpoint over the projection evaluates `mage:owns+` cheerfully,
 * and the workbench's most distinctive behaviour — declining a question the model does not license —
 * disappears without a sound. So the gate runs here, over `CanonRelationType`, and not as a `FILTER`
 * a query author could omit.
 *
 * **A check a caller can forget is not a control.** `admit` is the only function in the workbench
 * that returns a `LicensedQuestion`, and `LicensedQuestion` carries a brand no other module can
 * write. An evaluator that takes one cannot be handed an ungated question — the same trick
 * `RenderPort` uses to make the SVG unobtainable without its accessible twin.
 *
 * **This module decides; it does not evaluate.** No parser, no evaluator, no SPARQL text. A later
 * phase builds those and takes a `LicensedQuestion` as its input.
 *
 * ## Agreement with the engine
 *
 * `src/engine/graph.ts` already decides this for the engine's graph forms, and the two decisions are
 * one decision: `GRAPH_COMPOSING` is imported rather than restated, `traversalOf` is the join between
 * the two vocabularies, and the refusal sentence comes from `refusal.ts` verbatim. `modelsDeclaring`
 * is the engine's own function. `test/sparql-seam.test.ts` asserts the two agree on every graph form
 * over every relation type in the worked example; that test exists because two implementations of one
 * licensing rule that disagree are worse than either alone.
 *
 * ## Symmetry is traversed, never materialized
 *
 * Layer 1 materializes no inverse term: `contains` has no `containedBy`, and `vocabulary.ts` gives
 * the reason — SPARQL traverses backwards with `^` already, while a materialized inverse doubles the
 * dataset and makes `COUNT` answer a question nobody asked. So a relation type declaring
 * `symmetric: true` must be traversed in BOTH directions, read from the IR (V8), and the encoding is
 * **alternation**: `(mage:rel|^mage:rel)`.
 *
 * **That encoding is a tested behaviour, not a free choice for whoever writes the evaluator.** Inside
 * a `GRAPH <g> { … }` block, Comunica 5.4.1 drops every forward branch of an alternative path:
 * `ASK { GRAPH <g> { <a> (<p>|^<p>) <b> } }` answers `false` with `<a> <p> <b>` sitting in `<g>`.
 * Measured on three engine packages, without a bundler — `MEASUREMENT-comunica-261002.md` §6. Named
 * graphs are the normal scoping here and alternation is the symmetry encoding, so that defect lands
 * on the standard case, silently. It is why we write the evaluator instead of adopting one, and the
 * evaluator owes this exact case a test.
 */
import type { CanonRelationType, CanonicalSystem } from "../ir/types.ts";
import { modelsDeclaring } from "../engine/graph.ts";
import { GRAPH_COMPOSING, type GraphForm } from "../engine/types.ts";
import {
  outsideSubset, routeToEngine, unknownVocabulary, unlicensedByModel,
  type EngineRoute, type SeamRefusal,
} from "./refusal.ts";

// --------------------------------------------------------------------------------------------
// What the gate reads off a question
// --------------------------------------------------------------------------------------------

/**
 * How the question treats edges. This, and not hop arithmetic, is what `composition.path` governs.
 *
 * `composing` covers `mage:rel+`, `mage:rel*`, and a join that chains two edges of the same type —
 * every shape whose answer is derived by putting edges end to end.
 */
export type Traversal = "direct" | "composing";

/**
 * The traversal of an engine graph form.
 *
 * The join between the two interfaces' vocabularies, and the reason there is one list instead of two:
 * `GRAPH_COMPOSING` is the engine's, and it carries the decisions a second list would get wrong.
 * `cycles` is `direct` because `properties.acyclic` is a declared, checked property of every relation
 * type including a `forbidden` one, so cycle detection is licensed by V8 independently of V7.
 * `components` is `composing`, because a connected component is a reachability class — exactly the
 * inference `forbidden` declines to authorize.
 */
export const traversalOf = (form: GraphForm): Traversal =>
  GRAPH_COMPOSING.has(form) ? "composing" : "direct";

/**
 * Which graphs the question reads. Stated per question, never defaulted (V34).
 *
 * `project.ts` fixes the placement: system-level facts — existence, type, properties, containment,
 * relation-type declarations — land in the default graph, and a relation edge lands in its model's
 * named graph. So the scope below decides whether a claim is escapable:
 *
 *  - **`system-union`** — every model's graph, which reproduces the engine's cross-model adjacency.
 *    An architectural claim asked this way cannot be escaped by moving the offending edge into a
 *    different model.
 *  - **`model`** — one purposeful reduction's graph. The right scope for a question ABOUT that
 *    reduction, and the wrong one for a claim about the system.
 *
 * **Neither scope is the bare default graph, and an evaluator must not read `system-union` as one.**
 * The default graph holds no relation edge at all, so a default-graph pattern over a relation type
 * matches nothing — silently, and with no error. `project.ts` says so at its head; the union is an
 * unscoped `GRAPH ?g { … }` over the named graphs, beside whatever default-graph facts the question
 * also needs.
 *
 * A tagged union rather than a boolean, because the model-scoped arm has to name its model, and
 * `union: false` has nowhere to put it. No default value anywhere: choosing wrong is a silent wrong
 * answer, so the caller states it.
 */
export type QueryScope =
  | { readonly kind: "system-union" }
  | { readonly kind: "model"; readonly model: string };

/**
 * Whether the question's text was walked against §11.1.
 *
 * Required, and tri-valued, because an empty list of rejected constructs is ambiguous between
 * "nothing was rejected" and "nothing was checked". The seam does not parse, so this verdict arrives
 * from the walker that does.
 */
export type SubsetVerdict =
  | { readonly kind: "within-subset" }
  | { readonly kind: "outside-subset"; readonly construct: string };

/**
 * What the answer has to carry. §1's table, as a field.
 *
 * A `bindings` question is one where the rows ARE the witness, and nothing is lost by answering it in
 * SPARQL. A `path-witness` question needs the nodes it travelled, and SPARQL 1.1 dropped path
 * variables — so it routes to the engine even when the model licenses it. Licensing is decided first:
 * a question the model declines is declined by both interfaces.
 */
export type EvidenceNeed = "bindings" | "path-witness";

/**
 * A question arriving at the seam, before anything has licensed it.
 *
 * Three subjects, because the gate reads a different field of the IR for each. Scope and the subset
 * verdict ride on the two relational subjects and not on the behavioral one: behavior lives in
 * machines, which the projection puts in the default graph, so a scope there would be a field with no
 * meaning that a caller could still get wrong.
 */
export type SeamQuestion =
  | {
    readonly kind: "relational";
    readonly relation: string;
    readonly traversal: Traversal;
    readonly evidence: EvidenceNeed;
    readonly scope: QueryScope;
    readonly subset: SubsetVerdict;
  }
  | {
    /**
     * A question about the entity `contains` tree. Licensed without consulting `composition.path`:
     * §2 declares containment on the entity and it yields hierarchical paths by construction, which
     * is the same exemption `runGraphQuery` gives the `containment` form.
     */
    readonly kind: "containment";
    readonly entity: string;
    readonly scope: QueryScope;
    readonly subset: SubsetVerdict;
  }
  | {
    readonly kind: "behavioral";
    /** The question in the asker's words, so the route can quote what it is redirecting. */
    readonly asked: string;
  };

// --------------------------------------------------------------------------------------------
// The licensed question — unobtainable except through the gate
// --------------------------------------------------------------------------------------------

/**
 * The brand. Declared, never defined, and never exported: no module can write this key, including
 * this one, so `LicensedQuestion` is forgeable only by the cast in `license` below.
 */
declare const LICENSED: unique symbol;

/** Which directions a traversal must follow. `both` is V8's symmetry, encoded as alternation. */
export type Directions = "forward" | "both";

/**
 * A question the model licenses, carrying everything an evaluator needs from the IR.
 *
 * The brand is the control. An evaluator declares this as its parameter type and therefore cannot be
 * called with a question that skipped the gate — the licensing check becomes unforgettable rather
 * than merely documented.
 */
export interface LicensedQuestion {
  readonly [LICENSED]: true;
  /** The relation type traversed, or null for a containment question. */
  readonly relation: string | null;
  readonly traversal: Traversal;
  readonly directions: Directions;
  readonly scope: QueryScope;
}

/** The sole constructor, and the only cast in this module. */
const license = (fields: Omit<LicensedQuestion, typeof LICENSED>): LicensedQuestion =>
  fields as LicensedQuestion;

/** V8 read off the IR rather than guessed from the vocabulary. */
export const directionsOf = (relType: CanonRelationType): Directions =>
  relType.symmetric ? "both" : "forward";

/**
 * Whether this relation type licenses this traversal (V7, V32).
 *
 * Exported on its own so the agreement test can compare the predicate against the engine's without
 * going through the gate's other checks.
 */
export const licensesTraversal = (relType: CanonRelationType, traversal: Traversal): boolean =>
  traversal === "direct" || relType.pathComposition !== "forbidden";

// --------------------------------------------------------------------------------------------
// The gate
// --------------------------------------------------------------------------------------------

export type Admission =
  | { readonly kind: "licensed"; readonly question: LicensedQuestion }
  | { readonly kind: "refused"; readonly refusal: SeamRefusal }
  | { readonly kind: "routed"; readonly route: EngineRoute };

const refused = (refusal: SeamRefusal): Admission => ({ kind: "refused", refusal });

/** The model a scope names, or a refusal. `system-union` names none, so it has nothing to resolve. */
function checkScope(system: CanonicalSystem, scope: QueryScope): SeamRefusal | null {
  if (scope.kind === "system-union") return null;
  if (system.models.has(scope.model)) return null;
  return unknownVocabulary("model", scope.model,
    `scope the question to a declared model, or to the system union when the claim must hold ` +
    `across every model.`);
}

/**
 * Admit a question, refuse it, or route it to the engine.
 *
 * Order of decisions, and each one has a reason:
 *
 *  1. **Behavioral subjects route first.** They name no relation type, so there is nothing to license.
 *  2. **Vocabulary before anything else.** A user who misspelled a relation type should not first be
 *     told about path composition — `runGraphQuery` orders it the same way, for the same reason.
 *  3. **The subset before the model's licensing.** A query the subset does not accept was never a
 *     well-formed question of this model, so answering it with a modeling critique misdirects the
 *     author.
 *  4. **Licensing before routing.** A question the model declines is declined by both interfaces;
 *     routing it to the engine would promise an answer that does not exist.
 */
export function admit(system: CanonicalSystem, question: SeamQuestion): Admission {
  if (question.kind === "behavioral") {
    return { kind: "routed", route: routeToEngine("behavioral") };
  }

  if (question.kind === "containment") {
    if (!system.entities.has(question.entity)) {
      return refused(unknownVocabulary("entity", question.entity,
        "name an entity the system declares."));
    }
    const scopeFault = checkScope(system, question.scope);
    if (scopeFault !== null) return refused(scopeFault);
    if (question.subset.kind === "outside-subset") {
      return refused(outsideSubset(question.subset.construct));
    }
    return {
      kind: "licensed",
      question: license({
        relation: null, traversal: "composing", directions: "forward", scope: question.scope,
      }),
    };
  }

  const relType = system.relationTypes.get(question.relation);
  if (relType === undefined) {
    return refused(unknownVocabulary("relation type", question.relation,
      "declare the relation type, with its `description`, its `absence` meaning, and whether path " +
      "composition is allowed."));
  }

  const scopeFault = checkScope(system, question.scope);
  if (scopeFault !== null) return refused(scopeFault);

  if (question.subset.kind === "outside-subset") {
    return refused(outsideSubset(question.subset.construct));
  }

  if (!licensesTraversal(relType, question.traversal)) {
    return refused(unlicensedByModel(question.relation, modelsDeclaring(system, question.relation)));
  }

  if (question.evidence === "path-witness" && question.traversal === "composing") {
    return { kind: "routed", route: routeToEngine("path-witness-required") };
  }

  return {
    kind: "licensed",
    question: license({
      relation: question.relation,
      traversal: question.traversal,
      directions: directionsOf(relType),
      scope: question.scope,
    }),
  };
}
