/**
 * Purposeful omission, read at QUERY time.
 *
 * §8 lets a model declare what it deliberately leaves out, and `RefusalReason` has carried
 * `missing-distinction` since the vocabulary was written. The quantitative path emits it
 * (`src/quant/requirement.ts` for an expectation with no declared frequency, `src/quant/charge.ts`
 * for an entity with no behavioral counterpart). The GRAPH path did not: nothing here read
 * `purpose.omits`, so a question whose subject a model had explicitly declined refused with
 * whatever structural cause came to hand — `unknown-vocabulary`, nearly always.
 *
 * The cost of that is not cosmetic. Document Processing's flagship §5.6 query asks for an expected
 * latency through a relation type named `cache_hit_frequency`, and the model declares
 * `omits: [cache hit frequency]` on purpose. "relation type 'cache_hit_frequency' is not declared
 * by this system" is TRUE and reads as a typo: it sends the author hunting for a misspelling that
 * does not exist. "the model deliberately omits cache hit frequency" sends them to the only place
 * the answer could come from — the decision about what this model is for.
 *
 * ## Why consulting `omits` here is sound
 *
 * V24 checks `omits` against the model's real vocabulary: a name declared omitted that nevertheless
 * appears in the model is an error, so a surviving omission is a claim about something the model
 * genuinely does not carry. This module leans on that and adds nothing to it. It is consulted ONLY
 * at a rung the engine has already reached by failing to resolve a name across the whole system, so
 * the premise V24 enforces per model — the omission does not name live vocabulary — is holding by
 * construction at the only point this code runs.
 *
 * ## Coverage, not equality
 *
 * An omission is prose and a need is an identifier: `omits: [cache hit frequency]` against
 * `cache_hit_frequency`, `omits: [observed runtime delivery]` against `observed_delivery`. So the
 * test is word COVERAGE and it runs in one direction: an omission covers a need when every word of
 * the need appears among the omission's words. The direction is the authoring direction — a prose
 * omission is longer and more specific than the identifier a query names — and requiring EVERY need
 * word is what keeps it from guessing: `encryption_at_rest` against `omits: [encryption in transit]`
 * contributes `rest`, which the omission does not have, so it is not covered and the refusal falls
 * back to the honest "not declared".
 *
 * Machines count as well as models. §8 gives both a `purpose`, and a purposeful omission is a
 * purposeful omission whichever construct recorded it; excluding machines would be an asymmetry
 * with nothing behind it.
 */
import type { CanonicalSystem, Purpose } from "../ir/types.ts";
import { detail, fail, type Fail } from "./types.ts";

/** Lowercased alphanumeric words. `cache_hit_frequency` and `cache hit frequency` agree here. */
const words = (text: string): readonly string[] =>
  text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w !== "");

/** True when every word of `need` appears among `omission`'s words. */
function covers(omission: string, need: string): boolean {
  const have = new Set(words(omission));
  const want = words(need);
  return want.length > 0 && want.every((w) => have.has(w));
}

/** One declared omission that covers the need, and every construct that declared one. */
export interface Omission {
  /** The author's own words, quoted back rather than paraphrased. */
  readonly text: string;
  /** Model and machine ids declaring a covering omission, sorted. */
  readonly declaredBy: readonly string[];
}

/**
 * The declared omission covering `need`, or null.
 *
 * Deterministic: constructs are visited in sorted id order and omissions in authoring order, so the
 * quoted text does not depend on map iteration. `declaredBy` carries every construct that declared
 * a covering omission, because a reader asking where to add the distinction wants all of them.
 */
export function omissionCovering(system: CanonicalSystem, need: string): Omission | null {
  const purposes: [string, Purpose][] = [
    ...[...system.models.values()].map((m): [string, Purpose] => [m.id, m.purpose]),
    ...[...system.machines.values()].map((m): [string, Purpose] => [m.id, m.purpose]),
  ].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  let text: string | null = null;
  const declaredBy: string[] = [];
  for (const [id, purpose] of purposes) {
    const hit = purpose.omits.find((o) => covers(o, need));
    if (hit === undefined) continue;
    if (text === null) text = hit;
    declaredBy.push(id);
  }
  return text === null ? null : { text, declaredBy };
}

/**
 * Refuse a name this system does not declare, as a purposeful omission where a purpose says so.
 *
 * `absence` is the sentence the engine would say anyway, without its full stop — it is kept verbatim
 * and the omission sentence is APPENDED rather than replacing it. Both facts are true and the reader
 * needs both: the name resolves nowhere, and that is a decision rather than an oversight. Keeping
 * the structural clause also means the refusal a fixture pins does not change out from under it when
 * a model's purpose is edited; only the CAUSE does.
 */
/**
 * THE sentence a declared omission earns, and the one place it is worded.
 *
 * Extracted because the behaviour path needs the same sentence in a different WRAPPER: the graph
 * path returns a `Fail`, a `transition-live` refusal returns a `Verdict` through `unlicensed`. The
 * wrapper differs; the prose must not. Two copies is how a third substrate ends up with a subtly
 * different wording, and the wording IS the feature here — it is what turns a refusal from "the
 * tool is limited" into "the model chose this, and here is where to add it".
 */
export function omissionProse(absence: string, omitted: Omission): {
  readonly prose: string;
  readonly missing: readonly string[];
  readonly models: readonly string[];
} {
  const one = omitted.declaredBy.length === 1;
  const who = one
    ? `model '${omitted.declaredBy[0] ?? ""}'`
    : `models ${omitted.declaredBy.map((m) => `'${m}'`).join(", ")}`;
  return {
    prose:
      `${absence}, and the absence is a declared modelling decision: ${who} deliberately ` +
      `${one ? "omits" : "omit"} '${omitted.text}'. There is no misspelling to hunt for — the ` +
      `model represents what its purpose says it represents, and this is outside it. Answering ` +
      `would mean adding the distinction to a model that chose to leave it out.`,
    missing: [omitted.text],
    models: omitted.declaredBy,
  };
}

export function undeclared(system: CanonicalSystem, absence: string, need: string): Fail {
  const omitted = omissionCovering(system, need);
  if (omitted === null) return fail(`${absence}.`, detail("unknown-vocabulary"));
  const said = omissionProse(absence, omitted);
  return fail(said.prose, detail("missing-distinction", said.missing, said.models));
}
