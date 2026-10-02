/**
 * The refusal vocabulary of the SPARQL interface (V33).
 *
 * A refusal is an object. `QueryResult.refusal` carries the sentence a human reads, and the engine's
 * `Refusal` adds the cause as data; this module adds the field both lacked — **what would license
 * the question.** A refusal that only declines is a dead end. One that names the modeling claim the
 * author would have to make is a direction, and `wouldLicense` is never empty.
 *
 * Three causes, and the distinction between the first and the third is the one worth protecting:
 *
 *  1. **The model declines** — `composition.path: forbidden` on the relation type (V7, V32). No
 *     interface answers it; the author owns the semantic claim that would change that.
 *  2. **The subset declines** — the question reaches for a construct v0.1 does not accept. Names it.
 *  3. **The interface is wrong** — the question is behavioral, so the ENGINE answers it. This is not
 *     a refusal at all, which is why it leaves this module as `EngineRoute` rather than as a cause.
 *
 * Collapsing 1 and 3 would teach a user that a licensing refusal is a tooling limitation. A reader
 * told "unlicensed" when the truth is "the engine answers that" concludes the workbench cannot do
 * something it does.
 *
 * `unknown-vocabulary` is a fourth cause and predates this layer: the engine already refuses a
 * question naming something the system does not declare, and the seam reuses that word rather than
 * minting a synonym.
 *
 * Every cause carries the engine's own `RefusalReason`, so one agent-readable vocabulary spans both
 * interfaces. `asEngineRefusal` is the conversion, and nothing here re-words a sentence the engine
 * already has.
 */
import type { Refusal, RefusalReason } from "../engine/types.ts";

/** Why the seam declined, as data. String matching on `prose` is not an acceptable substitute. */
export type RefusalCause =
  /** V7 / V32 — the relation type forbids path composition, so no interface composes its edges. */
  | "unlicensed-by-model"
  /** §11.1 — the question uses a SPARQL construct v0.1 does not accept. `missing` names it. */
  | "outside-supported-subset"
  /** The question names a relation type, model or entity this system does not declare. */
  | "unknown-vocabulary";

/** Reasons in the engine's vocabulary, one per cause. Derived, so the two cannot drift. */
const ENGINE_REASON: Readonly<Record<RefusalCause, RefusalReason>> = {
  "unlicensed-by-model": "composition-forbidden",
  "outside-supported-subset": "unsupported-form",
  "unknown-vocabulary": "unknown-vocabulary",
};

export interface SeamRefusal {
  readonly cause: RefusalCause;
  /** The same reason the engine would report for this cause. */
  readonly reason: RefusalReason;
  readonly prose: string;
  /** What the model lacks: a semantic claim, or the construct that was rejected. Never empty. */
  readonly missing: readonly string[];
  /** Models consulted while deciding, so a caller knows where to add the distinction. */
  readonly models: readonly string[];
  /**
   * The change that would make this question answerable, in the author's terms.
   *
   * Required and non-empty. A refusal naming a gap without naming the remedy sends the reader back
   * to the specification to work out what the tool already knows.
   */
  readonly wouldLicense: string;
}

const refusal = (
  cause: RefusalCause, prose: string, missing: readonly string[], models: readonly string[],
  wouldLicense: string,
): SeamRefusal => ({ cause, reason: ENGINE_REASON[cause], prose, missing, models, wouldLicense });

/**
 * V7 / V32. The sentence is the engine's own, word for word.
 *
 * Two implementations of one licensing rule that disagree are worse than either alone, and prose is
 * where the disagreement would hide: a user who asks the same question of both interfaces and gets
 * two different explanations learns that one of them is guessing.
 */
export const unlicensedByModel = (relation: string, models: readonly string[]): SeamRefusal =>
  refusal(
    "unlicensed-by-model",
    `'${relation}' is declared as a direct relation without path-composition semantics. ` +
    `A multi-hop '${relation}' query is not licensed by this model.`,
    [`path-composition semantics for relation type '${relation}'`],
    models,
    `declare 'composition.path: allowed' on relation type '${relation}'. That is a semantic claim ` +
    `about the relation — that its transitive closure is a meaningful object of inquiry — and the ` +
    `author owns it; the tool will not assume it.`,
  );

/**
 * A construct outside §11.1. Names the construct, because "unsupported query" sends the author
 * hunting through their own text for the clause that offended.
 */
export const outsideSubset = (construct: string, detail: string | null = null): SeamRefusal =>
  refusal(
    "outside-supported-subset",
    `'${construct}' is outside the SPARQL subset this version accepts` +
    `${detail === null ? "" : `: ${detail}`}. The query was not rewritten to fit; a silently ` +
    `rewritten query answers a different question.`,
    [construct],
    [],
    `restate the question using the accepted subset: ${SUPPORTED_CONSTRUCTS.join(", ")}.`,
  );

/** Something the question named and the system does not declare. */
export const unknownVocabulary = (
  what: string, name: string, wouldLicense: string,
): SeamRefusal =>
  refusal(
    "unknown-vocabulary",
    `${what} '${name}' is not declared by this system.`,
    [`${what} '${name}'`],
    [],
    wouldLicense,
  );

/**
 * The SPARQL 1.1 subset v0.1 accepts (SEMANTICS.md §11.1, DESIGN-sparql-261002.md §3).
 *
 * Closed, and closed in code, for the reason `Dimension` is: the refusal must cite the same list the
 * walker checks against. A list in prose only would drift from the walker on the first extension.
 *
 * No construct here is an extension of SPARQL — every accepted query stays valid SPARQL — so a model
 * exported from the workbench answers the same question against any conformant engine. With one
 * measured caveat, recorded in `licensing.ts`: conformance is not universal in practice.
 */
export const SUPPORTED_CONSTRUCTS = [
  "SELECT", "ASK", "basic graph pattern", "GRAPH", "FILTER", "comparison", "property path",
  "OPTIONAL", "COUNT", "MIN", "MAX", "SUM", "GROUP BY", "ORDER BY", "LIMIT",
] as const;

export type SupportedConstruct = typeof SUPPORTED_CONSTRUCTS[number];

const SUPPORTED: ReadonlySet<string> = new Set(SUPPORTED_CONSTRUCTS);

/**
 * Whether a construct name is in the subset.
 *
 * `ReadonlySet<string>`, not `ReadonlySet<SupportedConstruct>`: the walker that will call this reads
 * construct names out of a parsed query, before any of them has earned the narrower type.
 */
export const isSupported = (construct: string): construct is SupportedConstruct =>
  SUPPORTED.has(construct);

/** Why the question belongs to the other interface. Not a refusal — the question gets answered. */
export type RouteReason =
  /** Traces, lassos, state-space coverage. The dataset holds structure, not executions. */
  | "behavioral"
  /**
   * §1 — the answer must carry the nodes it went through, and SPARQL 1.1 dropped path variables, so
   * `mage:rel+` proves existence without binding the intermediates. The engine's BFS has them.
   */
  | "path-witness-required";

/**
 * A question routed to the engine rather than refused.
 *
 * `destination` is a one-member union rather than a bare string, so a second destination has to be
 * declared here instead of spelled at a call site.
 */
export interface EngineRoute {
  readonly destination: "engine";
  readonly reason: RouteReason;
  /** Says where the answer comes from. A reader must not have to infer it from the absence of one. */
  readonly prose: string;
}

const ROUTE_PROSE: Readonly<Record<RouteReason, string>> = {
  behavioral: "this is a behavioral question: it asks about executions, and the RDF projection " +
    "holds structure rather than executions. The analysis engine answers it, over the state space.",
  "path-witness-required": "this question needs the path it travelled as evidence, and SPARQL 1.1 " +
    "has no path variables — a property path proves existence without binding the intermediates. " +
    "The analysis engine answers it, and returns the witness.",
};

export const routeToEngine = (reason: RouteReason): EngineRoute =>
  ({ destination: "engine", reason, prose: ROUTE_PROSE[reason] });

/** The seam refusal in the engine's shape, for a caller that holds results from both interfaces. */
export const asEngineRefusal = (r: SeamRefusal): Refusal =>
  ({ reason: r.reason, prose: r.prose, missing: r.missing, models: r.models });
