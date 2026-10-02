/**
 * The trace-step-to-entity correspondence — the load-bearing join of the Q2 ruling.
 *
 * ## The correspondence, stated once
 *
 * A trace step is an occurrence of accounted entity `e` exactly when the step ENTERS a state whose
 * id is `e`'s id, on some moving instance. The initial configuration counts too: an execution
 * begins already visiting its initial states. So for the Document Processing lifecycle, a state
 * `remediate` entered twice is two visits to the entity `remediate`, and the retry charges it
 * twice — because the trace visits the entity again, never because a state duration and a
 * transition duration were added together.
 *
 * ## Why id-equality and not something cleverer
 *
 * "Shared identity allows those reductions to compose" is MAGE's composition doctrine, and shared
 * identity means literally the SAME id naming the same conceptual thing in two purposeful models.
 * The lifecycle model names a stage; the performance model declares the entity that stage is; when
 * the two spell the same id they are one thing, and a visit to the stage is a visit to the entity.
 *
 * Two alternatives were considered and rejected:
 *
 *  - The V6 `machine.entity` link. It is machine-granular: one lifecycle machine maps to ONE
 *    entity, so per-stage costs (`Parse 50 ms`, `Remediate 100 ms`) cannot be distinguished, and a
 *    component machine's return-to-idle move would charge a second visit that is not one. §2 of
 *    SEMANTICS.md describes that link as a navigation affordance; this module leaves it as one.
 *  - An explicit `when:`-style clause on the latency quantity, mirroring memory. V37 makes
 *    `when:` a finding on anything that is not configuration-scoped, and the ruling's latency form
 *    carries none — the occurrence join is identity, not an authored predicate.
 *
 * An accounted quantity whose entity shares identity with NO declared state is the governing
 * principle's nightmare — validated, then silently contributing nothing — so building the table
 * REFUSES it, naming the missing correspondence. (A static rule should eventually catch this at
 * validation; until it does, the refusal here is the fence.)
 */
import type { AccountedMetric, CanonicalSystem, Configuration, Step } from "../ir/types.ts";
import { ACCOUNTED_METRICS } from "../ir/types.ts";
import { detail, fail, ok, type Res } from "../engine/types.ts";
import { quantityMagnitude, type Charge, type RangeEnd, type TraceCharges } from "./types.ts";

interface EntityCharge {
  readonly quantity: string;
  readonly entity: string;
  readonly each: number;
}

export interface ChargeTable {
  readonly metric: AccountedMetric;
  /** State id → the charges one entry into that state fires. States with no charge are absent. */
  readonly byState: ReadonlyMap<string, readonly EntityCharge[]>;
  /** True when the system declares no quantity this metric accounts — every trace totals zero. */
  readonly empty: boolean;
}

export function buildChargeTable(
  system: CanonicalSystem, metric: AccountedMetric, end: RangeEnd,
): Res<ChargeTable> {
  const dimension = ACCOUNTED_METRICS[metric];
  const accounted = [...system.quantities.values()].filter(
    // Only the declared basis charges (V36): `entities` charges entity: targets and nothing else.
    // Targets on other kinds are findings in a validated model; here they contribute NOTHING even
    // when validation was skipped — defence in depth at the seam, not a second validator.
    (q) => q.dimension === dimension && q.target.kind === "entity");

  if (accounted.length === 0) return ok({ metric, byState: new Map(), empty: true });

  if (system.accounting.get(metric)?.basis !== "entities") {
    // Defence in depth: V35 refuses this before evaluation is reachable.
    return fail(`no accounting basis is declared for '${metric}' (V35); run validation.`);
  }

  const declaredStates = new Set<string>();
  for (const m of system.machines.values()) for (const s of m.states) declaredStates.add(s);

  const byState = new Map<string, EntityCharge[]>();
  for (const q of accounted) {
    const entity = q.target.ref;
    if (!declaredStates.has(entity)) {
      return fail(
        `quantity '${q.id}' charges entity '${entity}', but no machine declares a state sharing ` +
        `that identity, so no execution can ever visit it and the quantity would be silently ` +
        `inert. Name the lifecycle state '${entity}', or rename one to match the other.`,
        detail("missing-distinction", [`a behavioral state sharing identity with entity '${entity}'`]));
    }
    const each = quantityMagnitude(q, end);
    if (!each.ok) return each;
    const list = byState.get(entity);
    const charge: EntityCharge = { quantity: q.id, entity, each: each.value };
    if (list === undefined) byState.set(entity, [charge]);
    else list.push(charge);
  }
  return ok({ metric, byState, empty: false });
}

/** The charge one step fires: the entry charges of every state its moving instances enter. */
export function stepCharge(table: ChargeTable, step: Step): number {
  let total = 0;
  for (const instance of step.instances) {
    const entered = step.to.control.get(instance);
    if (entered === undefined) continue;
    for (const c of table.byState.get(entered) ?? []) total += c.each;
  }
  return total;
}

/**
 * Accumulates occurrences along an execution, then reports per-quantity charges.
 *
 * Occurrences are counted, not just summed, because the count IS the Q2 ruling's content: a test
 * or a reader asking "was the retry charged twice?" needs the 2, and a total of 400 could hide a
 * wrong 4×100 behind a right 2×100 + 2×100.
 */
export class ChargeAccumulator {
  private readonly table: ChargeTable;
  private readonly visits = new Map<string, number>();

  constructor(table: ChargeTable) {
    this.table = table;
  }

  /** The execution begins in its initial configuration: those states are visited, so they charge. */
  visitConfiguration(cfg: Configuration): void {
    for (const state of cfg.control.values()) this.visit(state);
  }

  visitStep(step: Step): void {
    for (const instance of step.instances) {
      const entered = step.to.control.get(instance);
      if (entered !== undefined) this.visit(entered);
    }
  }

  private visit(state: string): void {
    if (!this.table.byState.has(state)) return;
    this.visits.set(state, (this.visits.get(state) ?? 0) + 1);
  }

  charges(): TraceCharges {
    const charges: Charge[] = [];
    let total = 0;
    // Iterate the table, not the visit map, so the order is the quantities' canonical order and
    // two identical executions report byte-identical breakdowns.
    for (const [state, entries] of this.table.byState) {
      const occurrences = this.visits.get(state) ?? 0;
      if (occurrences === 0) continue;
      for (const e of entries) {
        const subtotal = occurrences * e.each;
        charges.push({ quantity: e.quantity, entity: e.entity, occurrences, each: e.each, subtotal });
        total += subtotal;
      }
    }
    return { total, charges };
  }
}
