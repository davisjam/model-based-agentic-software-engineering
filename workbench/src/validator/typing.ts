/**
 * The typing analysis — SEMANTICS.md §3.3, the elaboration of ruling D7.
 *
 * Every entity has a type: the authored `type:` string, or a fresh nominal shadow `τ_<entity-id>`
 * when none is authored. Shadow assignment is the SEMANTICS OF OMISSION, not a finding — there is
 * no "untyped" complaint, no universal unknown type, and no second regime. What this module checks
 * is the contract a declaration creates:
 *
 *   V47 — a relation type's `domain:`/`range:` declaration RESOLVES: every name it uses is a
 *         declared entity type (a member of `entity-types:`, or a type some entity carries).
 *   V48 — every occurrence of a declared relation type CONFORMS: each endpoint's type is
 *         established as a member of the declared set, where a shadow is a member of nothing.
 *
 * Three boundaries, each deliberate:
 *
 *  - **The edge being checked never establishes its own endpoint's type** (T3). This is the
 *    RDFS-vs-SHACL fork: an RDFS reasoner would CONCLUDE `shipping-address a service` from a
 *    nonsense edge; this analysis rejects the edge instead. Checking, not inference.
 *  - **An undeclared relation type imposes no endpoint constraint** (T2, weakened honestly). The
 *    alternative — shadow domain/range variables unified across all of a type's edges — is refuted
 *    by the corpus: five shipped relation types are type-heterogeneous by design.
 *  - **Every verdict is local** (§6.1): a function of one edge, one declaration, and two
 *    authored-or-absent `type:` fields. No global solve, so a finding-delta is always attributable
 *    to the operation that caused it.
 *
 * `explainType` is the provenance query — "why are these still distinct?" In v1 the honest answer
 * is definitional (nothing unifies shadows except authorship), so the useful report is each side's
 * establishment record plus every declared constraint it sits under.
 */
import type { CanonRelation, CanonicalSystem } from "../ir/types.ts";
import type { SubjectedFinding, ValidationRule } from "./result.ts";

/**
 * The shadow type of one unnamed entity, spelled deterministically from the entity id (§G.6):
 * self-explaining in a finding, and independent of generation order by construction.
 */
export const shadowType = (entityId: string): string => `τ_${entityId}`;

/** One entity's established type: authored, or its own fresh shadow. */
export interface TypeAssignment {
  readonly established: "authored" | "unnamed";
  /** The authored name, or null when unnamed. */
  readonly type: string | null;
  /** `τ_<entity-id>` when unnamed, or null when authored. */
  readonly shadow: string | null;
}

export function assignType(system: CanonicalSystem, entityId: string): TypeAssignment | null {
  const e = system.entities.get(entityId);
  if (e === undefined) return null;
  return e.type === null
    ? { established: "unnamed", type: null, shadow: shadowType(entityId) }
    : { established: "authored", type: e.type, shadow: null };
}

/**
 * The names a domain/range declaration may resolve to: the declared `entity-types:` vocabulary
 * UNION the types entities actually carry (§G.3's ratified reading). The union, so adopting the
 * vocabulary never manufactures findings about kinds that are already in honest use.
 */
export function declaredKinds(system: CanonicalSystem): ReadonlySet<string> {
  const kinds = new Set<string>(system.entityTypes.keys());
  for (const e of system.entities.values()) if (e.type !== null) kinds.add(e.type);
  return kinds;
}

/** One declared constraint an entity sits under, with the verdict the analysis reaches on it. */
export interface TypeConstraintRecord {
  /** The occurrence, keyed the way the hash keys an edge. */
  readonly relation: {
    readonly from: string; readonly to: string; readonly type: string; readonly model: string;
  };
  readonly relationType: string;
  readonly position: "from" | "to";
  /** The declared member set at this position. */
  readonly declared: readonly string[];
  readonly verdict: "member" | "violation" | "unestablished";
}

/** The establishment record `explain-type` reports (§5.3). */
export interface TypeExplanation extends TypeAssignment {
  readonly entity: string;
  /** Every declared-relation occurrence touching the entity at a declared position. */
  readonly constraints: readonly TypeConstraintRecord[];
}

const verdictOn = (
  assignment: TypeAssignment, declared: readonly string[],
): "member" | "violation" | "unestablished" => {
  if (assignment.established === "unnamed") return "unestablished";
  return declared.includes(assignment.type as string) ? "member" : "violation";
};

/**
 * Why is this entity's type what it is, and what does it sit under?
 *
 * Two calls answer the author's question exactly: *reading is unnamed (τ_reading); sample is
 * unnamed (τ_sample); no authored statement relates them; here is every constraint each one sits
 * under.* Null for an unknown entity — a caller asking about an id the system does not declare has
 * nothing to be explained to.
 */
export function explainType(system: CanonicalSystem, entityId: string): TypeExplanation | null {
  const assignment = assignType(system, entityId);
  if (assignment === null) return null;

  const constraints: TypeConstraintRecord[] = [];
  for (const r of system.relations) {
    const rt = system.relationTypes.get(r.type);
    if (rt === undefined) continue;
    for (const [position, declared] of [["from", rt.domain], ["to", rt.range]] as const) {
      if (declared === null) continue;
      if ((position === "from" ? r.from : r.to) !== entityId) continue;
      constraints.push({
        relation: { from: r.from, to: r.to, type: r.type, model: r.model },
        relationType: rt.id,
        position,
        declared,
        verdict: verdictOn(assignment, declared),
      });
    }
  }
  return { entity: entityId, ...assignment, constraints };
}

/** How a finding names a declared member set: `'service'`, or `one of 'service', 'event-type'`. */
const spelled = (declared: readonly string[]): string => {
  const quoted = declared.map((n) => `'${n}'`);
  return quoted.length === 1 ? quoted[0] as string : `one of ${quoted.join(", ")}`;
};

export interface TypingResult {
  readonly findings: readonly SubjectedFinding[];
  /**
   * The edges carrying a V48 finding, for the one-defect-one-finding suppression (§7): V45/V46
   * skip these occurrences, because a wrong-kind edge's missing aggregate property is downstream
   * of the edge being nonsense.
   */
  readonly suppressed: ReadonlySet<CanonRelation>;
}

/**
 * V47 and V48 — the declaration resolves; the occurrences conform.
 *
 * Both rungs are checks over declared data in exactly V45/V46's sense, so both sit in the parity
 * set. Neither fires on a system that declares nothing: typing is total (T1), but the CONSTRAINT
 * arrives with the declaration, and this module refuses to pretend otherwise.
 */
export function checkTyping(system: CanonicalSystem): TypingResult {
  const findings: SubjectedFinding[] = [];
  const suppressed = new Set<CanonRelation>();
  const add = (
    rule: ValidationRule, where: string, message: string, subjects: readonly string[],
  ): void => { findings.push({ rule, where, message, subjects }); };

  const kinds = declaredKinds(system);

  // V47 — declarations resolve. Mirrors V45's "declares names that resolve" shape, pointed at
  // types: the silently-dead declaration (rename drift) is the D6 class, wrong rather than
  // invalid, with nothing else reporting it.
  for (const rt of system.relationTypes.values()) {
    for (const [key, declared] of [["domain", rt.domain], ["range", rt.range]] as const) {
      if (declared === null) continue;
      const where = `relation-types.${rt.id}.${key}`;
      if (declared.length === 0) {
        add("V47", where,
          `${key}: declares no kind. An empty list is not "nothing may sit here" — that ` +
          `assertion is 'absence:' prose. Delete the key, or name a kind.`, [rt.id]);
        continue;
      }
      for (const name of declared) {
        if (!kinds.has(name)) {
          add("V47", where,
            `'${name}' resolves to no declared entity type: it is not a member of ` +
            `'entity-types:' and no entity carries it as its 'type:'. The declaration would ` +
            `hold while reaching nothing — name a declared kind, or declare this one.`,
            [rt.id, name]);
        }
      }
    }
  }

  // V48 — occurrences conform. Local by construction: one edge, one declaration, two
  // authored-or-absent type fields. A dangling endpoint is V3's finding, not this rung's.
  for (const r of system.relations) {
    const rt = system.relationTypes.get(r.type);
    if (rt === undefined) continue;
    const where = `models.${r.model}.relations`;
    for (const [position, key, declared] of
      [["from", "domain", rt.domain], ["to", "range", rt.range]] as const) {
      if (declared === null || declared.length === 0) continue;
      const endpoint = position === "from" ? r.from : r.to;
      const assignment = assignType(system, endpoint);
      if (assignment === null) continue;
      const verdict = verdictOn(assignment, declared);
      if (verdict === "member") continue;
      suppressed.add(r);
      if (verdict === "unestablished") {
        const naming = declared.length === 1
          ? `Name its kind ('type: ${declared[0]}') if that is what it is`
          : `Name its kind if one of those is what it is`;
        add("V48", where,
          `'${endpoint}' has no authored type; '${rt.id}' requires ${spelled(declared)} here. ` +
          `${naming} — the edge cannot establish it.`, [endpoint, rt.id]);
      } else {
        add("V48", where,
          `'${endpoint}' is typed '${String(assignment.type)}', which is not in the ` +
          `${spelled(declared)} that 'relation-types.${rt.id}.${key}' declares. The edge is ` +
          `checked, never trusted: the endpoint is the wrong kind here, or the authored type ` +
          `or the declaration is wrong — all three surfaces are yours.`, [endpoint, rt.id]);
      }
    }
  }

  return { findings, suppressed };
}
