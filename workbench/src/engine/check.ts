/**
 * `check(query)` — the second of the ruling's three operations, and the one that names a gate the
 * engine already had.
 *
 * The three operations and the question each answers (`DECISIONS-RULED-model-query-261002.md`):
 * `validate(model)` asks whether a model is well formed; `check(query, type)` asks whether a
 * question is meaningful and permitted for its model type; execution asks what answer the model
 * gives. The flow is construct → check → execute → result + evidence.
 *
 * ## What this module adds, and what it deliberately does not
 *
 * It adds no decision. Every refusal `check` reports is produced by the same `admit*Query` call the
 * evaluator makes as its own first act (`graph.ts`, `behavior.ts`, `quant/query.ts`), so the
 * checker is the executor's head exposed rather than a second implementation of licensing. What
 * `check` adds is a REPORT shape: the cause as data, the offending portion, and the permitted
 * alternatives an agent needs in order to revise rather than re-ask.
 *
 * ## Why a `licensed` result cannot be used to skip the gate
 *
 * `admitTyped` discards the admission's PLAN. On the SPARQL seam the same requirement is held by a
 * brand: `admit` is the sole producer of `LicensedQuestion`, `evaluate` accepts only that type, and
 * the brand is unserializable, so every evaluating thread runs the gate itself. On the engine path
 * the plan is the analogous artifact — the resolved adjacency, the compiled predicate, the resolved
 * ceiling — and handing one to a caller would be handing out exactly the certificate the seam
 * refuses to publish. So this module publishes the gate's VERDICT and never its product
 * (`DESIGN-sparql-261002.md` §8.1, applied to the agent boundary): a caller holding
 * `outcome: "licensed"` has a claim about a hash, not a token, and execution re-admits.
 *
 * ## Advisory, not load-bearing
 *
 * Executing an unchecked query is permitted and safe. `check` exists so an agent can revise
 * cheaply, not so the executor can trust its caller — and it accepts only the typed query document,
 * never SPARQL text, because SPARQL is not a model query under the ruling and the console keeps its
 * own gate inside `translate`.
 */
import { systemHash } from "../ir/hash.ts";
import type { CanonicalSystem } from "../ir/types.ts";
import { ACCOUNTED_METRICS, AGGREGATE_TARGET_KIND, DIMENSIONS } from "../ir/types.ts";
import { admitBehaviorQuery } from "./behavior.ts";
import { admitGraphQuery } from "./graph.ts";
import { admitQuantityQuery } from "../quant/query.ts";
import { REQUIREMENT_METRICS } from "../quant/requirement.ts";
import {
  absentSubstrateVerdict, modelTypeForQueryKind, MODEL_TYPES,
  type ModelType, type ModelTypeId, type QueryNoun,
} from "./model-types.ts";
import {
  parseQuery, QUANTIFIERS, QUANTIFIER_EVIDENCE,
  type Query, type Refusal, type Verdict,
} from "./types.ts";

/**
 * Whether a typed question is admissible, and nothing a caller could present as a certificate.
 *
 * The plan the per-kind admissions produce is deliberately absent: see the module header. The
 * `modelType` is reported because it answers the other half of the ruling's question — a caller
 * learns WHICH type its question interrogates, which is what tells it where to look up the forms.
 */
export type TypedAdmission =
  | { readonly admitted: true; readonly kind: Query["kind"]; readonly modelType: ModelTypeId }
  | { readonly admitted: false; readonly verdict: Verdict };

/**
 * The admission rungs for a typed question, in the order execution runs them: the model-type
 * registry's substrate rung, then the kind's own admission.
 *
 * Identical to the head of `runTypedQuery` by construction — both call
 * `absentSubstrateVerdict` and then the kind's `admit*Query`, and neither re-decides anything the
 * other decided.
 */
export function admitTyped(system: CanonicalSystem, q: Query, hash: string): TypedAdmission {
  const absent = absentSubstrateVerdict(system, q.kind, hash);
  if (absent !== null) return { admitted: false, verdict: absent };
  const admission = q.kind === "graph"
    ? admitGraphQuery(system, q.graph, q.quantifier, hash)
    : q.kind === "behavior"
      ? admitBehaviorQuery(system, q.behavior, q.quantifier, hash)
      : admitQuantityQuery(system, q.quantity, q.quantifier, hash);
  return admission.admitted
    ? { admitted: true, kind: q.kind, modelType: modelTypeForQueryKind(q.kind).id }
    : { admitted: false, verdict: admission.verdict };
}

/**
 * What `check` reports. Three arms, because a caller has three situations to tell apart.
 *
 * `licensed` — the question is meaningful and permitted; execution will answer it (with whatever
 * outcome the model gives, which `check` does not predict).
 *
 * `refused` — the question is well formed and the model declines it. `refusal` is the engine's OWN
 * `Refusal`: the cause from the closed `RefusalReason` vocabulary, the sentence a person reads, the
 * missing distinctions, and the models consulted. Nothing is re-worded here.
 *
 * `malformed` — `parseQuery` could not read it as a question of any type, so there is no model type
 * to check it against and no cause from the refusal vocabulary to report. **The mapping to
 * execution, stated because it is not an identity:** execution routes a parse failure through
 * `unlicensed(...)` with no detail, which defaults the cause to `unknown-vocabulary`. The SENTENCE
 * is the same on both paths; the cause is not, because this arm sits outside the vocabulary. §5.3
 * specified the arm without saying so, and MQ-I2 pins the mapping rather than asserting an
 * agreement that does not hold.
 */
export type QueryCheckResult =
  | {
      readonly outcome: "licensed";
      readonly kind: Query["kind"];
      readonly modelType: ModelTypeId;
      readonly hash: string;
    }
  | {
      readonly outcome: "refused";
      readonly refusal: Refusal;
      readonly alternatives: readonly string[];
      readonly hash: string;
    }
  | {
      readonly outcome: "malformed";
      readonly prose: string;
      readonly alternatives: readonly string[];
    };

/**
 * Check one loosely-typed query document against the model type it interrogates.
 *
 * Takes the same untyped document `query()` takes, so an agent checks the thing it is about to
 * send rather than a re-typed approximation of it.
 */
export function checkQuery(system: CanonicalSystem, raw: unknown): QueryCheckResult {
  const parsed = parseQuery(raw);
  if (!parsed.ok) {
    return { outcome: "malformed", prose: parsed.refusal, alternatives: malformedAlternatives() };
  }
  const hash = systemHash(system);
  const admission = admitTyped(system, parsed.value, hash);
  if (admission.admitted) {
    return { outcome: "licensed", kind: admission.kind, modelType: admission.modelType, hash };
  }
  // The verdict always carries one: `unlicensed` is the only constructor the admissions use, and it
  // fills `refusal` unconditionally. The fallback keeps the type honest without inventing prose —
  // it reports the sentence the result itself carries.
  const refusal: Refusal = admission.verdict.refusal ?? {
    reason: "unknown-vocabulary",
    prose: admission.verdict.result.refusal ?? "",
    missing: [], models: [],
  };
  return {
    outcome: "refused",
    refusal,
    alternatives: alternatives(system, modelTypeForQueryKind(parsed.value.kind), refusal),
    hash,
  };
}

// ---------------------------------------------------------------------------------------------
// Alternatives — derived from closed vocabularies, never written per site
// ---------------------------------------------------------------------------------------------

const sorted = (xs: Iterable<string>): readonly string[] => [...xs].sort();

/** The registry's own census of what can be asked at all. Read when nothing parsed. */
const malformedAlternatives = (): readonly string[] => [
  ...QUANTIFIERS.map((qf) => `quantifier '${qf}' — ${QUANTIFIER_EVIDENCE[qf]}`),
];

/**
 * Which declared names a noun ranges over in THIS system.
 *
 * Total over `QueryNoun`, so a noun added to the registry's closed list fails the build here rather
 * than silently contributing no alternatives. The registry says which nouns a type's questions may
 * name; this says what the loaded system calls them.
 */
function declaredNames(system: CanonicalSystem, noun: QueryNoun): readonly string[] {
  switch (noun) {
    case "entity": return sorted(system.entities.keys());
    case "relation type": return sorted(system.relationTypes.keys());
    case "model": return sorted(system.models.keys());
    case "machine": return sorted(system.machines.keys());
    case "state": return sorted(new Set([...system.machines.values()].flatMap((m) => m.states)));
    case "variable":
      return sorted(new Set([...system.machines.values()].flatMap((m) => [...m.variables.keys()])));
    case "transition":
      return sorted(new Set([...system.machines.values()]
        .flatMap((m) => m.transitions.map((t) => `${m.id}: ${t.from} → ${t.to}`))));
    // An execution is not a declared name — it is selected by a predicate over configurations, so
    // the alternatives for it are the machine vocabulary a predicate may name, not a list of its own.
    case "execution": return [];
    case "quantity": return sorted(system.quantities.keys());
    case "ceiling":
      return sorted([...system.quantities.values()]
        .filter((q) => q.target.kind === AGGREGATE_TARGET_KIND).map((q) => q.id));
  }
}

/** Every noun this type's questions may name, with what the system declares for it. */
const vocabularyAlternatives = (
  system: CanonicalSystem, t: ModelType,
): readonly string[] =>
  t.query.subjects.map((s) => {
    const names = declaredNames(system, s.noun);
    return names.length === 0
      ? `${s.noun}: none declared (selected ${s.selector})`
      : `${s.noun} (${s.selector}): ${names.join(", ")}`;
  });

/**
 * The permitted alternatives for a refusal, derived per cause from a CLOSED list and nothing else.
 *
 * Total over `RefusalReason` by the compiler, so a cause added to the vocabulary cannot ship without
 * someone deciding what a revising caller should be offered. Each arm names the closed list it
 * reads; a refusal that named alternatives from anywhere open-ended would be the interface inventing
 * suggestions, which is the one thing §5.3 forbids this field to do.
 */
export function alternatives(
  system: CanonicalSystem, t: ModelType, refusal: Refusal,
): readonly string[] {
  switch (refusal.reason) {
    // Closed list: this type's own primitives, filtered to the ones no per-instance declaration
    // gates. Those are exactly the questions that stay askable when `composition.path: forbidden`.
    case "composition-forbidden":
      return t.query.primitives.flatMap((p) =>
        p.gate.kind === "by-construction" ? [`form '${p.form}' — ${p.gate.why}`] : []);

    // Closed list: the registry's `subjects` for this type, resolved against the system's own
    // declarations. A name that resolved nowhere is answered with the names that do.
    case "unknown-vocabulary":
    case "missing-distinction":
      return vocabularyAlternatives(system, t);

    // Closed list: the registry itself, filtered to the types this system actually declares. An
    // empty system offers none, which is the honest answer rather than a catalogue it cannot serve.
    case "missing-model-type":
      return MODEL_TYPES.filter((other) => other.presentIn(system))
        .map((other) => `ask a '${other.queryKind}' question — ${other.question}`);

    // Closed list: `QUANTIFIERS`, with the evidence rule each takes.
    case "quantifier-mismatch":
      return QUANTIFIERS.map((qf) => `quantifier '${qf}' — ${QUANTIFIER_EVIDENCE[qf]}`);

    // Closed list: the type's own form vocabulary, by reference.
    case "unsupported-form":
      return [`forms this type answers: ${t.query.forms.join(", ")}`];

    // Closed list: the metric table and the dimension table. A category error pairs a quantity with
    // an axis its scope does not have, so the alternative is the scope of every declared metric.
    case "category-error":
      return REQUIREMENT_METRICS.map((m) => {
        const dimension = m === "peak_memory" ? "memory" : ACCOUNTED_METRICS[m];
        return `metric '${m}' is ${dimension}, aggregated over ${DIMENSIONS[dimension].scope}s`;
      });

    // Closed list: the type's declared predicate semantics. Both causes mean the question reached
    // for a construct outside the tiny grammars, so what is offered is the grammar that exists.
    case "unsupported-expression":
    case "reserved-feature":
      return predicateAlternatives(t);
  }
}

function predicateAlternatives(t: ModelType): readonly string[] {
  const out: string[] = [];
  const { equality, order } = t.query.predicates;
  if (equality !== null) out.push(`equality over ${equality.symbol} (${equality.role})`);
  if (order !== null && order.by === "operator") {
    out.push(`order comparisons ${sorted(order.ops).join(", ")}, scoped by ${order.scopedBy.symbol}`);
  }
  if (order !== null && order.by === "declared-ceiling") {
    out.push(`a declared ceiling, scoped by ${order.scopedBy.symbol}`);
  }
  return out;
}
