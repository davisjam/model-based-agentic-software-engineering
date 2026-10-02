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
import type { CanonicalSystem } from "./types.ts";

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
    sorted(s.relationTypes, (r) => [r.pathComposition, r.symmetric, r.acyclic]),
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
    sorted(s.queries, (q) => [JSON.stringify(q.raw)]),
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
