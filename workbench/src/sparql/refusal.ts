/**
 * The refusal vocabulary of the SPARQL interface (V33).
 *
 * A refusal is an object. `QueryResult.refusal` carries the sentence a human reads, and the engine's
 * `Refusal` adds the cause as data; this module adds the field both lacked — **what would license
 * the question.** A refusal that only declines is a dead end. One that names the modeling claim the
 * author would have to make is a direction, and `wouldLicense` is never empty.
 *
 * Three causes V33 introduces, and the distinction between the first and the third is the one worth
 * protecting:
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
 * `missing-distinction` is a fifth, and it is the rung ABOVE `unknown-vocabulary` rather than a
 * sibling of it: §7.6 ranks a declared decision over a bare absence, so a name nothing declares that
 * some `purpose.omits` covers refuses as a modelling decision and quotes the author's own words. The
 * engine reached that rung first (`src/engine/omission.ts`) and this seam did not, so the same
 * purposeful omission read as a lookup miss through SPARQL and as a decision through the engine —
 * two answers to "why can this not be answered" from one model, which is what V32 exists to prevent.
 * `undeclaredVocabulary` is the single rung both interfaces now pass through.
 *
 * `missing-model-type` is a sixth, and it is a FOURTH kind of thing rather than a variant of the
 * three above. The question is well-formed, the subset accepts it, the model licenses it, and it is
 * expressible as a relational question — the system simply represents nothing of the kind it
 * interrogates. Keeping it apart from the other three matters for the reason cause 1 and route 3 are
 * kept apart: "the author declined to license this" sends a reader to a relation type's
 * declaration, "that name resolves nowhere" sends them to a spell-check, and neither is what an
 * author of a system with an empty `models:` section needs to hear. `absentModelType` is the one
 * constructor, and its sentence comes from the kernel's model-type registry rather than from this
 * module, so the seam and the engine cannot word one absence two ways.
 *
 * Every cause carries the engine's own `RefusalReason`, so one agent-readable vocabulary spans both
 * interfaces. `asEngineRefusal` is the conversion, and nothing here re-words a sentence the engine
 * already has.
 */
import type { CanonicalSystem } from "../ir/types.ts";
import { absentSubstrateProse, modelTypeForQueryKind } from "../engine/model-types.ts";
import { undeclared } from "../engine/omission.ts";
import type { Query, Refusal, RefusalReason } from "../engine/types.ts";

/** Why the seam declined, as data. String matching on `prose` is not an acceptable substitute. */
export type RefusalCause =
  /** V7 / V32 — the relation type forbids path composition, so no interface composes its edges. */
  | "unlicensed-by-model"
  /** §11.1 — the question uses a SPARQL construct v0.1 does not accept. `missing` names it. */
  | "outside-supported-subset"
  /** The question names a relation type, model or entity this system does not declare. */
  | "unknown-vocabulary"
  /**
   * §7.6 / V24 — nothing declares the name AND a `purpose.omits` covers it, so the absence is a
   * decision somebody recorded. Outranks `unknown-vocabulary` on the same subject.
   */
  | "missing-distinction"
  /**
   * The system declares no substrate of the model type the question interrogates — an empty
   * `models:` section under a relational question, no `machines:` under a behavioral one. Coarser
   * than every cause above it: those presume a system that models this KIND of thing and differ
   * about one name or one semantic claim.
   */
  | "missing-model-type";

/** Reasons in the engine's vocabulary, one per cause. Derived, so the two cannot drift. */
const ENGINE_REASON: Readonly<Record<RefusalCause, RefusalReason>> = {
  "unlicensed-by-model": "composition-forbidden",
  "outside-supported-subset": "unsupported-form",
  "unknown-vocabulary": "unknown-vocabulary",
  "missing-distinction": "missing-distinction",
  "missing-model-type": "missing-model-type",
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

/**
 * The kinds of name the seam can fail to resolve. Closed, because the absence sentence is per kind.
 *
 * `relation type` and `entity` are subjects the ENGINE has too; `model` is V34's scope, which exists
 * only here — validate.py and the engine union across every model by construction, so they have no
 * model name to fail to resolve.
 */
export type VocabularySubject = "relation type" | "entity" | "model";

/**
 * The absence clause per subject, without its full stop, in the engine's words where it has the
 * same subject.
 *
 * Two of these three are copied from `src/engine/graph.ts` on purpose and the copy is the point:
 * §7.5's V32 asks the two interfaces for one decision "down to the refusal sentence", so a reader
 * who asks both about one misspelling must hear one sentence. The copy is not trusted — the
 * agreement test runs both interfaces over one name and compares the two sentences it gets, so a
 * reworded engine refusal fails the build rather than drifting.
 *
 * The engine's own two spellings differ in shape (`relation type 'x' is not declared…` against
 * `'x' is not a declared entity…`). The entity one leads with the NAME because two of the engine's
 * rungs prefix it with the role that failed — `from: 'x' is not a declared entity…` — and
 * `from: entity 'x'` would not read. That asymmetry is inherited rather than invented; normalizing
 * it here would be a third wording, agreeing with neither interface.
 */
const ABSENCE: Readonly<Record<VocabularySubject, (name: string) => string>> = {
  "relation type": (name) => `relation type '${name}' is not declared by this system`,
  entity: (name) => `'${name}' is not a declared entity of this system`,
  model: (name) => `model '${name}' is not declared by this system`,
};

/**
 * Something the question named and the system does not declare — the bare absence, nothing more.
 *
 * Prefer `undeclaredVocabulary`: this one cannot reach §7.6's omission rung, because it has no
 * system to consult. The sole remaining caller is `noSubjectDeclared`, where there is no name to
 * have been omitted.
 */
export const unknownVocabulary = (
  subject: VocabularySubject, name: string, wouldLicense: string,
): SeamRefusal =>
  refusal(
    "unknown-vocabulary",
    `${ABSENCE[subject](name)}.`,
    [`${subject} '${name}'`],
    [],
    wouldLicense,
  );

/**
 * What an author does about a distinction their model declined to carry.
 *
 * The three other remedies name a change to the query or to a relation type's declaration. This one
 * names a decision, because that is what §7.6 says the reader's next step is: a misspelling to hunt
 * for does not exist, and licensing composition would not supply what was left out.
 */
const reconsiderOmission = (omitted: readonly string[]): string =>
  `decide whether this model should represent ${omitted.map((o) => `'${o}'`).join(", ")} at all. ` +
  `If it should, add the distinction to the model and drop it from \`purpose.omits\`; if it should ` +
  `not, this question belongs to a different model. The tool will not supply a distinction the ` +
  `author declined.`;

/**
 * A name this system does not declare, refused with §7.6's precedence: a declared decision outranks
 * a bare absence.
 *
 * **One rung, one coverage predicate.** The omission lookup is `src/engine/omission.ts`'s
 * `undeclared`, called rather than reimplemented, so there is a single answer to "does this omission
 * cover this need" across both interfaces. A second copy of that predicate is how the two
 * interfaces came to disagree in the first place; writing one here would be the same defect with a
 * fresh lineage.
 *
 * `wouldLicense` is the caller's for a bare absence, because only the caller knows what declaring
 * the name would take. The omission rung supplies its own: the remedy there is a decision about the
 * model's purpose, which is the same remedy at every rung.
 */
export function undeclaredVocabulary(
  system: CanonicalSystem, subject: VocabularySubject, name: string, wouldLicense: string,
): SeamRefusal {
  const f = undeclared(system, ABSENCE[subject](name), name);
  const omitted = f.detail !== null && f.detail.reason === "missing-distinction" ? f.detail : null;
  return omitted === null
    ? refusal("unknown-vocabulary", f.refusal, [`${subject} '${name}'`], [], wouldLicense)
    : refusal("missing-distinction", f.refusal, omitted.missing, omitted.models,
      reconsiderOmission(omitted.missing));
}

/**
 * The substrate-absence rung: refuse when the system declares nothing of the type the question
 * interrogates, or null when it does.
 *
 * **The sentence is generated, not copied.** `absentSubstrateProse` is the kernel's, read off the
 * model-type registry, and the registry is also where a Learn page gets its capability claims — so
 * the three surfaces that describe one absent type describe it identically by construction. The two
 * ABSENCE clauses above are copied from `src/engine/graph.ts` and held by an agreement test, which
 * is the weaker arrangement available when the engine words a sentence inline; here the engine
 * exports the sentence, so there is nothing to copy and nothing to drift.
 *
 * The engine reached this rung first (`runTypedQuery`, ahead of every evaluator) and this seam did
 * not, so one question got two answers depending on the door: a relational question over a system
 * with an empty `models:` section refused through the engine and returned `ASK → false` through
 * SPARQL. A confident NO about a system that models no structure is the `latency: 0 ms` defect in
 * relational clothing, and it is the reason this constructor exists rather than a comment saying the
 * case cannot arise.
 *
 * `wouldLicense` is the registry's own authoring move, for the same reason the prose is: the remedy
 * a refusal names and the remedy a Learn entry teaches must be one remedy.
 */
export function absentModelType(
  system: CanonicalSystem, kind: Query["kind"],
): SeamRefusal | null {
  const t = modelTypeForQueryKind(kind);
  return t.presentIn(system)
    ? null
    : refusal("missing-model-type", absentSubstrateProse(t), [t.label], [], t.wouldLicense);
}

/**
 * A question with nothing for the gate to decide about.
 *
 * Two sites reach it, and they are one situation: the translator, when a scoped query traverses no
 * declared relation type, and the Worker, when a `sparql` request arrives carrying an empty question
 * list. Both mean the licensing gate was handed nothing, and the dangerous reading of that is "no
 * subject, no objection, evaluate it" — an ungated evaluation wearing a vacuous check's clothes. So
 * it is a refusal, and it is ONE refusal: a reader who meets it from either side is told the same
 * thing, which is the rule the rest of this module is built on.
 */
export const noSubjectDeclared = (): SeamRefusal =>
  unknownVocabulary("relation type", "(none declared)",
    "declare a relation type, with its `description`, its `absence` meaning, and whether path " +
    "composition is allowed. A scoped query reads relation edges, and the licensing gate decides " +
    "from the relation type the IR declares.");

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
