/**
 * The trace-step-to-entity correspondence — the load-bearing join of the Q2 ruling.
 *
 * ## The correspondence, stated once
 *
 * Every accounted entity has one BEHAVIORAL COUNTERPART: a (machine, state) pair. A trace step is
 * an occurrence of entity `e` exactly when, on some moving instance, it ENTERS `e`'s counterpart
 * state; the initial configuration counts too, because an execution begins already visiting its
 * initial states. The counterpart is found by two routes, explicit first:
 *
 *  1. **Declared** — the entity's `executes_in_state` property names the lifecycle state during
 *     whose occupancy the component runs. This is how Document Processing joins `remediation` to
 *     `document-lifecycle.remediating`, and it is what lets TWO components share one state (the
 *     gateway also executes in `remediating` — the lifecycle is coarser than the performance
 *     model, deliberately). Resolution follows the V27 discipline: qualified, or bare only when
 *     one machine declares the state.
 *  2. **Shared identity** — absent a declaration, a state spelling the entity's id IS the entity:
 *     the same id naming the same conceptual thing in two purposeful reductions, which is MAGE's
 *     composition doctrine. Every machine declaring such a state yields a counterpart.
 *
 * A declaration REPLACES the identity route for its entity rather than adding to it — two live
 * routes for one entity would be the double-counting shape the accounting ruling exists to refuse.
 *
 * So for the Document Processing lifecycle, a retry that re-enters `remediating` charges
 * `Remediate` and the gateway AGAIN — the trace visits those entities again. That is the whole Q2
 * mechanism; no state-plus-transition arithmetic exists here to get wrong.
 *
 * Rejected alternative, recorded because it looks plausible: the V6 `machine.entity` link as the
 * join. It is machine-granular — one lifecycle machine maps to ONE entity, so `Parse 50 ms` and
 * `Remediate 100 ms` cannot be told apart, and a component machine's return-to-idle move would
 * count a visit that is not one. §2 of SEMANTICS.md presents that link as a navigation affordance,
 * and it stays one.
 *
 * An accounted quantity whose entity has NO counterpart on either route is the governing
 * principle's nightmare — validated, then silently contributing nothing — so building the table
 * REFUSES it, naming the missing correspondence. (A static rule should eventually catch this at
 * validation; until it does, the refusal here is the fence.)
 */
import type { AccountedMetric, CanonicalSystem, Configuration, Step } from "../ir/types.ts";
import { ACCOUNTED_METRICS } from "../ir/types.ts";
import { detail, fail, ok, type Res } from "../engine/types.ts";
import { quantityMagnitude, type Charge, type RangeEnd, type TraceCharges } from "./types.ts";

/**
 * The property naming an entity's lifecycle state. A property rather than IR structure: the IR
 * cannot hold the join itself in v0.1, and the shipped example established this spelling.
 */
export const EXECUTES_IN_STATE = "executes_in_state";

interface EntityCharge {
  readonly quantity: string;
  readonly entity: string;
  readonly each: number;
}

export interface ChargeTable {
  readonly metric: AccountedMetric;
  /** `machine.state` → the charges one entry into that state fires. Uncharged states are absent. */
  readonly byState: ReadonlyMap<string, readonly EntityCharge[]>;
  /** instance id → machine id, so a step's entered states can be keyed without re-deriving. */
  readonly instanceMachine: ReadonlyMap<string, string>;
  /** True when the system declares no quantity this metric accounts — every trace totals zero. */
  readonly empty: boolean;
}

/**
 * Resolve a state reference the way V27 resolved it at validation: qualified by machine, or bare
 * only when exactly one machine declares the state. Shared with memory's `when.state` so the two
 * reference forms cannot drift apart.
 */
export function resolveStateRef(
  system: CanonicalSystem, ref: string,
): Res<{ readonly machine: string; readonly state: string }> {
  const dot = ref.indexOf(".");
  if (dot !== -1) {
    const machine = ref.slice(0, dot);
    const state = ref.slice(dot + 1);
    const m = system.machines.get(machine);
    if (m === undefined || !m.states.includes(state)) {
      return fail(`state reference '${ref}' does not resolve; run validation (V27).`);
    }
    return ok({ machine, state });
  }
  const owners = [...system.machines.values()].filter((m) => m.states.includes(ref));
  const sole = owners[0];
  if (owners.length !== 1 || sole === undefined) {
    return fail(`state reference '${ref}' is ${owners.length === 0 ? "undeclared" : "ambiguous"}; run validation (V27).`);
  }
  return ok({ machine: sole.id, state: ref });
}

/** The counterpart states of one entity, by the two routes above. Empty means no correspondence. */
function counterpartStates(
  system: CanonicalSystem, entityId: string,
): Res<readonly { readonly machine: string; readonly state: string }[]> {
  const declared = system.entities.get(entityId)?.properties.get(EXECUTES_IN_STATE);
  if (declared !== undefined) {
    if (typeof declared.value !== "string") {
      return fail(`entity '${entityId}' declares ${EXECUTES_IN_STATE} with a non-string value; name a state.`);
    }
    const resolved = resolveStateRef(system, declared.value);
    if (!resolved.ok) {
      return fail(`entity '${entityId}': ${EXECUTES_IN_STATE} '${declared.value}' names no declared state.`,
        detail("unknown-vocabulary", [`state '${declared.value}'`]));
    }
    return ok([resolved.value]);
  }
  const out: { machine: string; state: string }[] = [];
  for (const m of system.machines.values()) {
    if (m.states.includes(entityId)) out.push({ machine: m.id, state: entityId });
  }
  return ok(out);
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

  const instanceMachine = new Map<string, string>();
  for (const inst of system.instances) instanceMachine.set(inst.id, inst.machine);

  if (accounted.length === 0) return ok({ metric, byState: new Map(), instanceMachine, empty: true });

  if (system.accounting.get(metric)?.basis !== "entities") {
    // Defence in depth: V35 refuses this before evaluation is reachable.
    return fail(`no accounting basis is declared for '${metric}' (V35); run validation.`);
  }

  const byState = new Map<string, EntityCharge[]>();
  for (const q of accounted) {
    const entity = q.target.ref;
    const counterparts = counterpartStates(system, entity);
    if (!counterparts.ok) return counterparts;
    if (counterparts.value.length === 0) {
      return fail(
        `quantity '${q.id}' charges entity '${entity}', but it declares no ${EXECUTES_IN_STATE} ` +
        `and no machine declares a state sharing that identity, so no execution can ever visit it ` +
        `and the quantity would be silently inert. Declare ${EXECUTES_IN_STATE} on the entity, or ` +
        `name the lifecycle state '${entity}'.`,
        detail("missing-distinction", [`a behavioral state corresponding to entity '${entity}'`]));
    }
    const each = quantityMagnitude(q, end);
    if (!each.ok) return each;
    for (const c of counterparts.value) {
      const key = `${c.machine}.${c.state}`;
      const list = byState.get(key);
      const charge: EntityCharge = { quantity: q.id, entity, each: each.value };
      if (list === undefined) byState.set(key, [charge]);
      else list.push(charge);
    }
  }
  return ok({ metric, byState, instanceMachine, empty: false });
}

/** The charge one step fires: the entry charges of every state its moving instances enter. */
export function stepCharge(table: ChargeTable, step: Step): number {
  let total = 0;
  for (const instance of step.instances) {
    const entered = step.to.control.get(instance);
    const machine = table.instanceMachine.get(instance);
    if (entered === undefined || machine === undefined) continue;
    for (const c of table.byState.get(`${machine}.${entered}`) ?? []) total += c.each;
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
    for (const [instance, state] of cfg.control) this.visit(instance, state);
  }

  visitStep(step: Step): void {
    for (const instance of step.instances) {
      const entered = step.to.control.get(instance);
      if (entered !== undefined) this.visit(instance, entered);
    }
  }

  private visit(instance: string, state: string): void {
    const machine = this.table.instanceMachine.get(instance);
    if (machine === undefined) return;
    const key = `${machine}.${state}`;
    if (!this.table.byState.has(key)) return;
    this.visits.set(key, (this.visits.get(key) ?? 0) + 1);
  }

  charges(): TraceCharges {
    const charges: Charge[] = [];
    let total = 0;
    // Iterate the table, not the visit map, so the order is the quantities' canonical order and
    // two identical executions report byte-identical breakdowns.
    for (const [key, entries] of this.table.byState) {
      const occurrences = this.visits.get(key) ?? 0;
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
