/**
 * `elements` — the one new query operation, and the property-constraint matcher two callers share.
 *
 * `DESIGN-model-query-261002.md` §2.4. Every one of the author's other example shapes takes element
 * ids as input, and until this module an agent obtained them only by pulling the whole of
 * `inspect()` across the boundary and filtering it client-side. That is a filter written in the
 * caller's language over a copy of the entity table, which is the shape FR-AGENT-1 spends its whole
 * argument avoiding: the question "which entities of type X satisfy P" belongs to the model, so the
 * model should answer it.
 *
 * ## What it is, and what it is not
 *
 * It reads the IR's entity table and filters it — a REPRESENTATION question, not an analysis. It
 * walks no edges, composes nothing, and states no scope, so none of the five composing graph forms
 * is involved and `GRAPH_COMPOSING` has nothing to say about it. The selector grammar is the one
 * that already exists (`PropConstraint`, `src/engine/types.ts`), reused rather than restated: an
 * `elements` selector and a graph question's `where.source` clause are the same grammar, which is
 * why the matcher lives here and `graph.ts` imports it.
 *
 * ## The matcher moved here, and that is the second-site rule rather than a preference
 *
 * `satisfiesConstraints` was module-private in `graph.ts`, where `endpoints` uses it to narrow the
 * candidate source and target sets. This operation is the second site, so the function is extracted
 * now instead of copied — two matchers for one grammar would be two answers to "does this entity
 * satisfy this constraint", and the day they disagreed the disagreement would be between a
 * traversal's endpoints and an enumeration of the same entities.
 *
 * ## Licensing: the structural-graph presence rung, with one recorded residue
 *
 * §2.4 licenses this by the structural-graph type's presence rung, like any graph question, and that
 * is what it does: a system declaring no purposeful model gets the registry's own substrate refusal,
 * naming the absent type and the authoring move that would license the question. For the empty
 * system — the overwhelmingly common case — that is the right answer and strictly more useful than
 * an empty list, which a caller cannot tell from a model whose entities it failed to match.
 *
 * The residue, recorded rather than smoothed over: the IR declares entities at system level and
 * `presentIn` reads `models`, so a system holding entities and no model refuses an enumeration of
 * entities that `inspect()` will happily list. Reachable by one `add-entity` on a new system. The
 * behaviour is pinned by a test so that reversing it is a visible decision rather than a drift, and
 * the choice between the two readings is the author's — see `DESIGN-shell-261002.md` §9s.
 */
import { systemHash } from "../ir/hash.ts";
import type { CanonicalSystem, Scalar } from "../ir/types.ts";
import { absentSubstrateVerdict } from "./model-types.ts";
import { parsePropConstraints, type PropConstraint, type Refusal } from "./types.ts";

/**
 * What `elements` was asked for. Both fields optional in the wire document, total here.
 *
 * `type` is the entity's declared `type` string, matched exactly. `where` is the existing
 * constraint grammar; an empty list means "no constraint", which is not the same as a selector the
 * grammar could not read — the two are told apart by `parseElementSelector` returning null.
 */
export interface ElementSelector {
  readonly type: string | null;
  readonly where: readonly PropConstraint[];
}

/**
 * Read a selector, or report that there was none to read.
 *
 * Non-validating, like every other parser in the engine: an unknown property or an unmatchable
 * value travels through and the SELECTION reports an empty set, because "no entity has that
 * property" is an answer. What returns null is a `where` clause the grammar could not read at all —
 * a non-empty object that yielded no constraint. Reading that as "no constraints" would answer a
 * question nobody asked with the whole entity table, which is the vacuous-pass shape this engine
 * refuses everywhere else.
 */
export function parseElementSelector(raw: unknown): ElementSelector | null {
  if (raw === undefined || raw === null) return { type: null, where: [] };
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const type = typeof obj["type"] === "string" ? obj["type"] : null;
  const rawWhere = obj["where"];
  if (rawWhere === undefined || rawWhere === null) return { type, where: [] };
  if (typeof rawWhere !== "object" || Array.isArray(rawWhere)) return null;
  const where = parsePropConstraints(rawWhere);
  if (where.length === 0 && Object.keys(rawWhere as Record<string, unknown>).length > 0) return null;
  return { type, where };
}

/** One entity property's value, or undefined when the entity does not declare it. */
export function propertyValue(
  system: CanonicalSystem, entity: string, property: string,
): Scalar | undefined {
  return system.entities.get(entity)?.properties.get(property)?.value;
}

/**
 * Does one entity satisfy every constraint in a `PropConstraint` list?
 *
 * An entity that does not declare the property fails the constraint, including a `ne` constraint:
 * absence is not inequality. The alternative reading — an undeclared property satisfies `ne` — would
 * make a selector over a property only half the entities declare report the other half as matching
 * something they say nothing about.
 */
export function satisfiesConstraints(
  system: CanonicalSystem, entity: string, cs: readonly PropConstraint[],
): boolean {
  return cs.every((c) => {
    const value = propertyValue(system, entity, c.property);
    if (value === undefined) return false;
    if (c.op === "eq") return c.values.some((v) => v === value);
    if (c.op === "ne") return c.values.every((v) => v !== value);
    return c.values.some((v) => v === value);
  });
}

/**
 * The ids this system declares, filtered — or the refusal the question earned.
 *
 * `declaredTypes` is on BOTH arms, and it is what keeps an empty answer diagnosable. A selector
 * naming a type nothing declares returns no ids, and no ids is also what a selector naming a real
 * type with no matching entities returns; a caller holding only the empty array cannot tell a typo
 * from a true absence. The house pattern for this is `NoSuchQuestion.savedQuestions` — report what
 * the system DOES declare, so the diagnosis costs no second call.
 */
export type ElementSelection =
  | {
      readonly selected: true;
      readonly ids: readonly string[];
      readonly hash: string;
      readonly interpretedAs: string;
      readonly declaredTypes: readonly string[];
    }
  | {
      readonly selected: false;
      readonly refusal: Refusal;
      readonly hash: string;
      readonly interpretedAs: string;
      readonly declaredTypes: readonly string[];
    };

const sorted = (xs: Iterable<string>): readonly string[] => [...xs].sort();

const declaredTypesOf = (system: CanonicalSystem): readonly string[] =>
  sorted(new Set([...system.entities.values()].flatMap((e) => (e.type === null ? [] : [e.type]))));

const renderValue = (v: Scalar): string => (typeof v === "string" ? `'${v}'` : String(v));

const describeConstraint = (c: PropConstraint): string =>
  c.op === "in"
    ? `${c.property} in (${c.values.map(renderValue).join(", ")})`
    : `${c.property} ${c.op === "eq" ? "=" : "≠"} ${c.values.map(renderValue).join(" or ")}`;

/**
 * The sentence this question was understood as (V21).
 *
 * Built from the selector rather than from the answer, so a refusal carries it too: a caller whose
 * question was declined still needs to see what was read, and a refusal that cannot say what it
 * refused sends the reader back to guess at their own input.
 */
export function interpretElementSelector(s: ElementSelector): string {
  const scope = s.type === null ? "entities" : `entities of type '${s.type}'`;
  return s.where.length === 0
    ? `Which ${scope} does this system declare?`
    : `Which ${scope} does this system declare with ${s.where.map(describeConstraint).join(" and ")}?`;
}

/**
 * Select elements from the IR's entity table.
 *
 * Takes the loosely-typed selector document an agent sends, for the reason `checkQuery` takes the
 * loosely-typed query document: the caller checks and runs the same value rather than a re-typed
 * approximation of it.
 */
export function selectElements(system: CanonicalSystem, raw: unknown): ElementSelection {
  const hash = systemHash(system);
  const types = declaredTypesOf(system);
  const selector = parseElementSelector(raw);
  if (selector === null) {
    const prose =
      "an `elements` selector reads two optional fields — `type`, a declared entity type, and "
      + "`where`, the property-constraint grammar (`{ property: value }`, `{ property: { ne: value } }`, "
      + "`{ property: { in: [...] } }`). What arrived could not be read as either, and an unreadable "
      + "selector is not an empty one: reading it as 'no constraints' would answer with the whole "
      + "entity table.";
    return {
      selected: false, hash, declaredTypes: types,
      interpretedAs: "Which entities does this system declare?",
      refusal: {
        reason: "unsupported-expression", prose,
        missing: ["a readable `type` or `where` selector"], models: [],
      },
    };
  }
  const interpretedAs = interpretElementSelector(selector);
  // The registry's substrate rung, consulted the way every other operation consults it: through
  // `absentSubstrateVerdict`, so the sentence and the cause come from the registry rather than from
  // a second wording here. §2.4 licenses this operation by the structural-graph type's presence.
  const absent = absentSubstrateVerdict(system, "graph", hash);
  if (absent !== null) {
    const refusal: Refusal = absent.refusal ?? {
      reason: "missing-model-type", prose: absent.result.refusal ?? "", missing: [], models: [],
    };
    return { selected: false, hash, declaredTypes: types, interpretedAs, refusal };
  }
  const ids = sorted(system.entities.keys()).filter((id) => {
    if (selector.type !== null && system.entities.get(id)?.type !== selector.type) return false;
    return satisfiesConstraints(system, id, selector.where);
  });
  return { selected: true, ids, hash, interpretedAs, declaredTypes: types };
}
