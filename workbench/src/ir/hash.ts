/**
 * Canonical-IR hash — the transaction base.
 *
 * Hashes the CANONICAL IR, never the file bytes. Comments and key order are preserved on write
 * (SEMANTICS.md §10), so a file hash would be invalidated by a cosmetic edit and every pending
 * agent transaction would have to be recomputed for no semantic reason.
 *
 * The digest is FNV-1a rather than SHA-256. Reasoning, since the schema's `base` pattern says
 * sha256: in the published contract — the browser's only built-in digest, SubtleCrypto, is async
 * and unavailable on insecure origins, and this hash is a concurrency token, not a security
 * boundary. It answers one question: "is this the system the operations were computed against?"
 * A collision costs a rejected-or-misapplied transaction that the whole-system validation pass
 * then catches, not a forged change. The `base` is prefixed `fnv1a64:` so it is self-describing
 * and cannot be mistaken for a cryptographic claim.
 */
import type { Annotated, CanonQuantity, CanonicalSystem, QuantityValue } from "./types.ts";

/**
 * A quantity's value, projected in BASE units.
 *
 * So `250 ms` and `0.25 s` are one quantity and a unit rewrite does not invalidate a pending
 * transaction — the same argument that keeps comments and key order out. The declared unit is
 * cosmetic; the magnitude is not. A literal that failed to normalize has no base, so its written
 * text stands in: two different broken literals are still two different systems.
 */
function quantityValue(v: QuantityValue): unknown {
  switch (v.kind) {
    case "point": return ["point", v.magnitude.base, v.magnitude.base === null ? v.magnitude.raw : null];
    case "range": return ["range", v.low.base, v.high.base, v.low.raw, v.high.raw];
    // Whitespace inside an expression is cosmetic; its structure is not. Normalizing the spacing is
    // as far as this goes — folding `2 ms + 2 ms` into `4 ms` would be evaluation.
    case "expression": return ["expression", v.source.trim().split(/\s+/).join(" ")];
    case "absent": return ["absent"];
  }
}

/**
 * When a quantity is charged, projected the same way its value is.
 *
 * `residency` and `when` are SEMANTIC, not descriptive: they decide which summand of `memory(c)` a
 * quantity enters, so two systems differing in them compute different peak memory and are not the
 * same system. The contrast with annotation (invariant A1, excluded entirely) is the test — a note
 * saying "this cache is always resident" cannot change a memory analysis; `residency: resident`
 * must.
 *
 * An unreadable declaration falls back to its written text, matching the magnitude rule above: two
 * differently-broken declarations are still two different systems.
 */
function residencyProjection(q: CanonQuantity): unknown {
  return [
    q.residency,
    q.residency === null ? q.residencyRaw : null,
    q.when === null ? null : [q.when.state, [...q.when.unexpectedKeys]],
  ];
}

/** Stable projection: everything semantic, nothing cosmetic, in a fixed order. */
function semanticProjection(s: CanonicalSystem): unknown {
  const sorted = <T>(m: ReadonlyMap<string, T>, f: (v: T) => unknown): unknown[] =>
    [...m.keys()].sort().map((k) => [k, f(m.get(k) as T)]);

  return [
    s.systemId,
    sorted(s.domains, (d) => [d.kind, d.values, d.range]),
    sorted(s.entities, (e) => [
      e.type, e.label, [...e.properties.entries()].sort().map(([k, v]) => [k, v.value, v.domain]),
      [...e.contains].sort(),
    ]),
    // `aggregates` is in the hash because it is SEMANTIC: it decides whether a revision is
    // well formed (V45/V46), unlike a note. Declaring one is a different system from declaring
    // none, and a transaction's `base` must say so.
    sorted(s.relationTypes, (r) => [
      r.pathComposition, r.symmetric, r.acyclic,
      r.aggregates === null ? null : [r.aggregates.declared, r.aggregates.over, r.aggregates.using],
    ]),
    // Already sorted by canonicalize; re-sorted here so the hash does not depend on that promise.
    [...s.relations]
      .map((r) => [r.type, r.from, r.to, r.model])
      .sort((a, b) => a.join(" ").localeCompare(b.join(" "))),
    sorted(s.models, (m) => [m.label, m.purpose.question, m.purpose.represents, m.purpose.omits, [...m.entities].sort()]),
    sorted(s.machines, (m) => [
      m.entity, m.instances, m.initial, [...m.states].sort(),
      [...m.variables.entries()].sort().map(([k, v]) => [k, v.kind, v.domain, v.initial]),
      [...m.derived.entries()].sort(),
      // Transition ORDER is semantic: delete-transition addresses by index, so a reorder is a
      // different system even when the set of transitions is identical.
      m.transitions.map((t) => [
        t.from, t.to, t.sync, t.label,
        t.guards.map((g) => [g.ref, g.op, g.value]),
        t.effects.map((e) => [e.variable, e.expression]),
      ]),
    ]),
    sorted(s.events, (e) => [[...e.participants].sort()]),
    // Quantities are SEMANTIC, so they hash — the contrast with annotation, which invariant A1
    // excludes, is the clearest statement of where the formal boundary lies. A note saying
    // "gateway latency is probably 200 ms" cannot change a latency query; a declared `200 ms` must.
    sorted(s.quantities, (q) => [q.target.raw, q.dimension, quantityValue(q.value), residencyProjection(q)]),
    // The accounting declaration decides which annotations reach which analysis, so a system that
    // charges latency per entity is not the system that charges it per transition even when every
    // quantity is byte-identical. It hashes for the same reason a quantity does.
    sorted(s.accounting, (a) => [a.basis, a.basis === null ? a.basisRaw : null]),
    sorted(s.queries, (q) => [JSON.stringify(q.raw)]),
    // The DECLARATION hashes; the verification does not exist to hash. A system that prescribes
    // "restricted data must not reach an impermitted subscriber" is not the system that prescribes
    // nothing, even when every entity, edge and query is byte-identical — the obligation is the
    // author's content and a transaction based on the one must not apply to the other. The status
    // stays out by not being stored anywhere at all (V18), which is a stronger exclusion than
    // omitting a field from this list.
    sorted(s.requirements, (r) => [JSON.stringify(r.raw)]),
  ];
}

/** FNV-1a, 64-bit, via BigInt. Deterministic across engines; no Web Crypto, no async. */
function fnv1a64(text: string): string {
  const PRIME = 0x100000001b3n;
  const MASK = 0xffffffffffffffffn;
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i += 1) {
    // Hash UTF-16 code units as two bytes so non-ASCII content cannot collide with its own prefix.
    const unit = text.charCodeAt(i);
    hash = ((hash ^ BigInt(unit & 0xff)) * PRIME) & MASK;
    hash = ((hash ^ BigInt((unit >> 8) & 0xff)) * PRIME) & MASK;
  }
  return hash.toString(16).padStart(16, "0");
}

export function systemHash(s: CanonicalSystem): string {
  return `fnv1a64:${fnv1a64(JSON.stringify(semanticProjection(s)))}`;
}

/**
 * True iff `base` names this system. An agent whose premise has changed must recompute; this is a
 * loud rejection, never a best-effort merge.
 */
export const matchesBase = (s: CanonicalSystem, base: string): boolean => systemHash(s) === base;

/** One object's annotation, flattened. Every field, because any of them changing IS the change. */
const annotationOf = (a: Annotated): unknown => [
  a.notes.map((n) => [n.id, n.kind, n.text, [...n.unexpectedKeys]]),
  a.provenance === null ? null : [
    a.provenance.createdBy, a.provenance.createdAt, a.provenance.prompt, a.provenance.rationale,
    a.provenance.history.map((h) => [h.revision, h.actor, h.prompt, h.action, h.at]),
  ],
];

/** Exactly what `semanticProjection` leaves out: the annotation on all four objects that carry it. */
function annotationProjection(s: CanonicalSystem): unknown {
  const sorted = <T extends { readonly annotation: Annotated }>(m: ReadonlyMap<string, T>): unknown[] =>
    [...m.keys()].sort().map((k) => [k, annotationOf((m.get(k) as T).annotation)]);

  return [
    sorted(s.entities),
    sorted(s.models),
    sorted(s.quantities),
    // Relations have no map key, so they are keyed the way `semanticProjection` keys them and
    // sorted on it — a reorder of the relation list is not an annotation change.
    s.relations
      .map((r) => [[r.type, r.from, r.to, r.model].join(" "), annotationOf(r.annotation)])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  ];
}

/**
 * The COMPLEMENT of `systemHash` — a digest over the annotation `systemHash` deliberately excludes.
 *
 * **Why this exists, and why it is not a count.** Invariant A1 keeps notes and provenance out of the
 * semantic projection, so an annotation-only commit leaves `systemHash` exactly where it was. That
 * is correct and it costs a reader something: the one channel that tells a screen-reader user an
 * agent committed (FR-A11Y-3) derives from a diff of the authoritative model, and for this one class
 * of commit the semantic diff is empty by construction. The announcer's first answer was to count
 * PROVENANCE RECORDS and treat a rise as "a note was attached" — a proxy, and one that measured the
 * wrong thing twice: a provenance record exists only for an object whose source declares
 * `provenance`, while `add-note` writes into `notes`, so the count never moved at all; and even for
 * an object that has both, a count cannot see a second note replacing nothing.
 *
 * A digest sees the change itself. Two notes on one object produce two different digests, as does
 * an edited note, a dropped one, or a rewritten provenance block — none of which any count reaches.
 *
 * **Deliberately MORE sensitive than `systemHash` is.** That hash is a concurrency token, so it
 * normalizes everything cosmetic (unit spellings, relation order, key order) because a false
 * mismatch costs an agent a recomputed transaction. This digest has one consumer — "did the
 * annotation move since the last paint" — and its error directions are not symmetric: an extra
 * announcement is noise, a missing one is an agent edit a screen-reader user never hears. So note
 * ORDER within an object is significant here, and nothing is normalized away.
 *
 * It is NOT a transaction base and must never become one: `matchesBase` compares `systemHash`, and
 * an annotation-sensitive base would make a note invalidate every pending agent transaction, which
 * is precisely what A1 exists to prevent.
 */
export function annotationHash(s: CanonicalSystem): string {
  return `fnv1a64:${fnv1a64(JSON.stringify(annotationProjection(s)))}`;
}
