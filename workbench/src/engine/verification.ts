/**
 * Requirements and verification — three layers, and the compiler holds them apart.
 *
 * ```
 * QUERY                         REQUIREMENT
 * holds/refuted      +         satisfied_when
 *         \                       /
 *          \                     /
 *               VERIFICATION
 *    satisfied/violated/inconclusive/error
 * ```
 *
 * `Examples and Semantic Completion` §5. SysML v2 separates a requirement from the verification case
 * that discharges it, and its verification-case result vocabulary is Pass / Fail / Inconclusive /
 * Error; MAGE keeps its own query polarity rather than contorting queries into requirement wording.
 *
 * ## What each layer may say, and what it may not
 *
 *   - **A query asks what the model entails.** Its semantic result is `holds` or `refuted`
 *     (`PropositionValue`), and any inability to evaluate is `EvaluationStatus` — a separate axis.
 *     A query result is NEVER `satisfied` or `violated`: it does not know what anyone prescribed.
 *   - **A requirement states an obligation.** It references the POSITIVE breach query — "restricted
 *     data reaches an impermitted subscriber" — and declares `satisfiedWhen: "refuted"`. The query
 *     is not negated internally to make the requirement read positively (§5.2). `Requirement` holds
 *     no verdict and no status, because an obligation is a declaration and not an answer.
 *   - **Verification interprets a result against a requirement.** `verify` is the only function
 *     here that produces `satisfied` or `violated`, and it cannot be called without both inputs.
 *
 * The separation is in the types, not in the prose: `Requirement` has no outcome field,
 * `QueryEvaluation` has no `satisfiedWhen`, and `Verification` is reachable only through `verify`.
 * A surface holding one of the first two cannot name a verification status, and the only way to get
 * one is to supply the pair.
 *
 * ## Why the two-valued declaration is what makes the comparison sound
 *
 * `satisfiedWhen` is a `PropositionValue`, so `ev.verdict !== req.satisfiedWhen` compares two truth
 * values and nothing else. That matters because the SAME expression over a four-valued `Outcome` is
 * the defect this layer exists to avoid: `outcome === satisfiedWhen ? satisfied : violated` sends a
 * bounded search and a declined question into the accusing arm, and reports an engineer that the
 * system breaches a prohibition when what happened is that a walk hit `state-limit`. The negation
 * is not forbidden here — it is sound here, and it is sound BECAUSE the status/verdict split already
 * removed the two non-propositions from the comparison. §5.4 earns its place at this line.
 *
 * ## Four status words, and where the fifth went
 *
 * `DESIGN-v02-requirements-261004.md` §3.2 designed FIVE — the author's four plus `not-verifiable`
 * for an `unlicensed` evaluation, on the argument that folding it into `inconclusive` sends a
 * student to raise a budget when the answer is to declare a relation type. §5.3 rules four, and §5
 * wins. The argument is not lost, though: it is answered by §5.4 rather than by a word. An
 * `unlicensed` evaluation is no longer a truth value to be folded, so the verification carries the
 * CAUSE as a typed field, and `InconclusiveCause` keeps the three remedies apart — raise the bound,
 * declare a model, run the query — with no fifth status word to name.
 *
 * `violated` collides with the validator's word for a broken well-formedness rule
 * (`src/validator/result.ts:119`, `UxViolation` at `src/app/capabilities.ts:1069`). Scoped by type:
 * the word is only ever reached as a `VerificationStatus`, which no validator type admits. A grep
 * for `violated` therefore returns two unrelated concepts, and this sentence is the mitigation.
 */
import type {
  Coverage, PropositionValue, QueryEvaluation, QueryResult,
} from "../ir/types.ts";
import { bearsAConclusion, evaluationOf } from "../ir/types.ts";

// --------------------------------------------------------------------------------------------
// Layer 2 — the requirement
// --------------------------------------------------------------------------------------------

/**
 * An obligation over a descriptive query.
 *
 * Carries no verdict, by construction. A requirement is what the engineering team PRESCRIBES; what
 * the models say is a `QueryResult`, and what the pair means is a `Verification`. Keeping a status
 * field here would let a declaration claim its own satisfaction, which is how the fixture corpus's
 * `status:` key reads today — a recorded expectation that something else has to check.
 */
export interface Requirement {
  readonly id: string;
  /**
   * The obligation in the modal voice: "Restricted data must not reach an impermitted subscriber."
   * Prescriptive, where a property's `statement` is descriptive.
   */
  readonly statement: string;
  /**
   * The saved query that decides it, by id. The POSITIVE breach query for a prohibition — the query
   * states the breach and the requirement forbids it.
   */
  readonly expressedAs: string;
  /**
   * The proposition value that discharges the obligation. Two-valued, which is the whole seam:
   * `refuted` for a breach query, `holds` for a universal stated directly. Both polarities ship in
   * the example corpus and neither is privileged (`DESIGN-v02-requirements-261004.md` §4.1).
   */
  readonly satisfiedWhen: PropositionValue;
}

/** A declaration that could not be read. Not a shortfall of the system under design. */
export interface RequirementProblem {
  readonly where: string;
  readonly problem: string;
}

export type RequirementParse =
  | { readonly ok: true; readonly value: Requirement }
  | { readonly ok: false; readonly problem: RequirementProblem };

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : null;

/**
 * The outcome words that can be a SATISFACTION CONDITION, as a value: types are erased at runtime
 * and the input here is untyped YAML. Keyed BY `PropositionValue` so the compiler refuses a table
 * missing a word or carrying one the union does not have.
 */
const PROPOSITION_WORDS: Readonly<Record<PropositionValue, true>> = { holds: true, refuted: true };

/**
 * Read a requirement declaration, refusing one that does not state an obligation.
 *
 * **This is where the measured hole closes.** `scripts/gen-example-coverage.ts:333` validates
 * `satisfied_when` through a general outcome helper that accepts all four words, and the authoring
 * picker offers `inconclusive` and `unlicensed` (`src/ui/view-model.ts:1330-1331`) — so
 * `satisfied_when: unlicensed` parses clean today and nothing refuses a requirement that prescribes
 * its own unanswerability. Prescribing that your own model decline to answer is not an engineering
 * obligation. Here it is a `RequirementProblem`, which verifies as `error`, and `error` is a
 * statement about the DECLARATION rather than about the system under design.
 *
 * Three reachable causes, per `DESIGN-v02-requirements-261004.md` §3.5: `satisfied_when` absent or
 * not an outcome word; `satisfied_when` naming a non-proposition; `expressed_as` naming nothing.
 * Whether the named query EXISTS is the caller's join to check — this function reads a declaration
 * and has no system in hand.
 */
export function parseRequirement(raw: unknown, where: string): RequirementParse {
  const bad = (problem: string): RequirementParse => ({ ok: false, problem: { where, problem } });
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return bad("a requirement is a mapping of id, statement, expressed_as and satisfied_when");
  }
  const o = raw as Record<string, unknown>;
  const id = str(o["id"]);
  if (id === null) return bad("no id, so nothing can join to this requirement");
  const statement = str(o["statement"]);
  if (statement === null) return bad(`'${id}' states no obligation`);
  const expressedAs = str(o["expressed_as"]);
  if (expressedAs === null) {
    return bad(`'${id}' names no deciding query in expressed_as`);
  }
  const declared = o["satisfied_when"];
  if (typeof declared === "boolean") {
    return bad(
      `'${id}' satisfied_when loaded as boolean ${String(declared)} — a YAML 1.1 loader coerced it. `
      + `Use 'holds' or 'refuted'; the vocabulary is deliberately not true/false (V25).`,
    );
  }
  if (typeof declared !== "string" || !Object.hasOwn(PROPOSITION_WORDS, declared)) {
    return bad(
      `'${id}' satisfied_when '${String(declared)}' is not a satisfaction condition. A requirement `
      + `is discharged by a proposition value — ${Object.keys(PROPOSITION_WORDS).join(" or ")} — and `
      + `'inconclusive' and 'unlicensed' are evaluation statuses, so neither can be prescribed.`,
    );
  }
  return {
    ok: true,
    value: { id, statement, expressedAs, satisfiedWhen: declared as PropositionValue },
  };
}

// --------------------------------------------------------------------------------------------
// Layer 3 — verification
// --------------------------------------------------------------------------------------------

/** §5.3's vocabulary, which is SysML v2's verification-case result vocabulary in MAGE's spelling. */
export type VerificationStatus = "satisfied" | "violated" | "inconclusive" | "error";

/**
 * Why a verification did not settle, in a closed set whose arms are the three REMEDIES.
 *
 * The distinction the earlier design wanted a fifth status word for. One `inconclusive` with three
 * causes is sound where one word for three remedies is not: "raise the bound", "declare a relation
 * type" and "run the query" send an engineer to three different places, and a status that merged
 * them would send two of three in the wrong direction.
 */
export type InconclusiveCause =
  /** The evaluator's budget ran out, or a conclusive verdict rests on a truncated walk. */
  | { readonly kind: "bounded"; readonly limit: Coverage["reason"] }
  /** The purposeful models decline the question. The refusal sentence names what is missing. */
  | { readonly kind: "unlicensed"; readonly refusal: string | null }
  /** Nothing has been evaluated for the deciding query. */
  | { readonly kind: "not-evaluated" };

/**
 * What a requirement and a result MEAN together.
 *
 * `verdict` travels on the two settled arms because a reader owed a verdict is owed the evidence's
 * direction: `satisfied` on `refuted` is "the breach was looked for and is not there", and
 * `violated` on `holds` is "the breach is exhibited". The words are not interchangeable with the
 * query's, which is §5.3's instruction, and the pair being visible is what lets a surface show both
 * without re-deriving either.
 */
export type Verification =
  | {
    readonly status: "satisfied";
    readonly requirement: string;
    readonly verdict: PropositionValue;
  }
  | {
    readonly status: "violated";
    readonly requirement: string;
    readonly verdict: PropositionValue;
  }
  | {
    readonly status: "inconclusive";
    readonly requirement: string;
    readonly because: InconclusiveCause;
  }
  | { readonly status: "error"; readonly requirement: string | null; readonly problem: string };

/**
 * The word shown, and what it MEANS. `inconclusive` is the one every reader mistakes for a no, and
 * `error` is the one every reader mistakes for a breach.
 */
export const VERIFICATION_TEXT: Readonly<Record<VerificationStatus, string>> = {
  satisfied: "SATISFIED — the obligation is discharged on evidence that bears the weight",
  violated: "VIOLATED — the breach is exhibited, and a witness is not softened by coverage",
  inconclusive: "INCONCLUSIVE — this does not settle the obligation, and it is not a breach",
  error: "ERROR — the requirement could not be read, so there is no obligation to judge",
};

/** A declaration that could not be read, as a verification. Never reads `satisfied`. */
export const verificationError = (p: RequirementProblem): Verification =>
  ({ status: "error", requirement: null, problem: `${p.where}: ${p.problem}` });

/**
 * Interpret one evaluation against one requirement. The ONLY producer of `satisfied`/`violated`.
 *
 * TOTAL over `EvaluationStatus` by the compiler — no `default`, and a declared return type — so a
 * status added to the vocabulary cannot ship without someone deciding whether it accuses the system
 * under design. That is the control the four-valued `Outcome` lacked: a `switch` over `Outcome` with
 * a `default` arm is how `inconclusive` became an accusation in the first place.
 *
 * `null` is the absence of an evaluation, not a status: nothing was run, so there is no evaluator
 * condition to name. Modelled as `null` rather than as a fifth `EvaluationStatus`, because the
 * author's status set is closed and widening it to carry a caller's bookkeeping would be the same
 * category slip §36.1 refused for `exhausted`.
 *
 * The asymmetry worth stating as a rule: **a witness is coverage-insensitive; an absence is
 * coverage-sensitive.** Presence of evidence survives a small budget. Absence of evidence does not.
 */
export function verify(req: Requirement, ev: QueryEvaluation | null): Verification {
  const id = req.id;
  if (ev === null) {
    return { status: "inconclusive", requirement: id, because: { kind: "not-evaluated" } };
  }
  switch (ev.status) {
    case "completed":
      // Sound here, and ONLY here, because both sides are proposition values: see the header. The
      // breach is exhibited exactly when the verdict is not the one that discharges the obligation,
      // and a counterexample found inside a truncated search is a real counterexample.
      if (ev.verdict !== req.satisfiedWhen) {
        return { status: "violated", requirement: id, verdict: ev.verdict };
      }
      return bearsAConclusion(ev.coverage)
        ? { status: "satisfied", requirement: id, verdict: ev.verdict }
        : {
          status: "inconclusive", requirement: id,
          because: { kind: "bounded", limit: ev.coverage.reason },
        };

    // The remedy is a bigger budget, never a model change. This is the arm the whole layer is
    // about: a bounded search must not read as `violated`.
    case "exhausted":
      return {
        status: "inconclusive", requirement: id, because: { kind: "bounded", limit: ev.limit },
      };

    // The remedy is a model. Folding this into the arm above would send the engineer to raise a
    // bound when the answer is to declare a relation type, so the cause keeps them apart and the
    // refusal sentence travels — a decline that drops it names no missing distinction.
    case "unlicensed":
      return {
        status: "inconclusive", requirement: id,
        because: { kind: "unlicensed", refusal: ev.refusal },
      };

    // A statement about the declaration or the transport, never about the system under design.
    case "error":
      return { status: "error", requirement: id, problem: ev.problem };
  }
}

/**
 * The whole chain from a declaration and the results, for a caller holding both.
 *
 * `results` is keyed by saved-query id, which is the join `expressed_as` names. A query the system
 * does not supply is a DECLARATION error rather than an inconclusive verification: the requirement
 * references something that is not there, so there is no obligation anybody could discharge.
 */
export function verifyDeclaration(
  raw: unknown,
  where: string,
  results: ReadonlyMap<string, Pick<QueryResult, "outcome" | "coverage" | "refusal">>,
  known: ReadonlySet<string> = new Set(results.keys()),
): Verification {
  const parsed = parseRequirement(raw, where);
  if (!parsed.ok) return verificationError(parsed.problem);
  const req = parsed.value;
  if (!known.has(req.expressedAs)) {
    return verificationError({
      where, problem: `'${req.id}' names query '${req.expressedAs}', which this system does not declare`,
    });
  }
  const res = results.get(req.expressedAs);
  return verify(req, res === undefined ? null : evaluationOf(res));
}
