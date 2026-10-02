/**
 * Configuration-scoped evaluation: memory(c), and peak_memory over reachable configurations.
 *
 * The Q3 ruling, mechanical:
 *
 *     memory(c) = Σ memory(e) for e ∈ Resident
 *               + Σ memory(e) for e where active(e, c)
 *
 * `active(e, c)` is NEVER guessed. The annotation's `when: { state: … }` names the behavioral
 * thing whose activation licenses the charge, and activation means exactly: some instance of the
 * named machine has that control state in `c`. Nothing is inferred from an entity being a
 * "service", from a machine being idle, or from containment — the ruling refused both available
 * defaults precisely because each was implicit semantics dressed as one.
 *
 * A memory quantity declaring NEITHER form is a V37 finding; if one reaches this module anyway it
 * enters neither summand — defence in depth, matching the ruling's "no configuration charges it".
 * One declaring BOTH is likewise V37's; charging either summand would silently pick the winner the
 * rule exists to refuse, so it too contributes nothing here.
 */
import type { CanonicalSystem, Configuration, Coverage } from "../ir/types.ts";
import {
  compileSystem, DEFAULT_STATE_LIMIT, defaultOptions, exploreSpace, traceTo,
} from "../engine/explore.ts";
import { bounded, exhaustive, ok, type Res } from "../engine/types.ts";
import { resolveStateRef } from "./charge.ts";
import { quantityMagnitude, type ConfigurationMemory, type MemoryContribution, type PeakMemory, type RangeEnd } from "./types.ts";

export interface MemoryOptions {
  readonly limit: number;
  readonly end: RangeEnd;
}

export const defaultMemoryOptions = (): MemoryOptions => ({ limit: DEFAULT_STATE_LIMIT, end: "upper" });

/** The two summands' charge lists, resolved once so every configuration reads the same tables. */
export function memoryContributions(
  system: CanonicalSystem, end: RangeEnd = "upper",
): Res<readonly MemoryContribution[]> {
  const out: MemoryContribution[] = [];
  for (const q of system.quantities.values()) {
    if (q.dimension !== "memory" || q.target.kind !== "entity") continue;
    const resident = q.residency === "resident";
    const whenState = q.when?.state ?? null;
    // Exactly one form charges (V37). Neither, or both, enters neither summand — see the header.
    if (resident === (whenState !== null)) continue;
    const value = quantityMagnitude(q, end);
    if (!value.ok) return value;
    if (resident) {
      out.push({ quantity: q.id, entity: q.target.ref, mode: "resident", machine: null, state: null, value: value.value });
      continue;
    }
    if (whenState === null) continue;
    const resolved = resolveStateRef(system, whenState);
    if (!resolved.ok) return resolved;
    out.push({
      quantity: q.id, entity: q.target.ref, mode: "when",
      machine: resolved.value.machine, state: resolved.value.state, value: value.value,
    });
  }
  return ok(out);
}

/** memory(c) for one configuration, with the contributions that actually charged. */
export function memoryOf(
  system: CanonicalSystem, cfg: Configuration, end: RangeEnd = "upper",
): Res<ConfigurationMemory> {
  const contributions = memoryContributions(system, end);
  if (!contributions.ok) return contributions;
  return ok(chargeConfiguration(system, contributions.value, cfg));
}

function chargeConfiguration(
  system: CanonicalSystem, contributions: readonly MemoryContribution[], cfg: Configuration,
): ConfigurationMemory {
  const charged: MemoryContribution[] = [];
  let total = 0;
  for (const c of contributions) {
    if (c.mode === "when" && !active(system, cfg, c.machine ?? "", c.state ?? "")) continue;
    charged.push(c);
    total += c.value;
  }
  return { total, charged };
}

/** Activation, literally: some instance of the named machine holds the named control state. */
function active(system: CanonicalSystem, cfg: Configuration, machine: string, state: string): boolean {
  for (const inst of system.instances) {
    if (inst.machine === machine && cfg.control.get(inst.id) === state) return true;
  }
  return false;
}

/**
 * peak_memory = max over reachable configurations of memory(c). The reachable set is the engine's
 * — reused, not re-derived — and its Coverage is carried faithfully: a peak over a BOUNDED walk is
 * a peak over the explored region only, a strictly weaker claim than one over the whole space, and
 * the result must say so rather than inherit an `exhaustive` it did not earn.
 */
export function peakMemory(
  system: CanonicalSystem, options: MemoryOptions = defaultMemoryOptions(),
): Res<PeakMemory> {
  const contributions = memoryContributions(system, options.end);
  if (!contributions.ok) return contributions;
  const compiled = compileSystem(system);
  if (!compiled.ok) return compiled;

  const space = exploreSpace(compiled.value, defaultOptions(options.limit));
  const coverage: Coverage = space.complete
    ? exhaustive(space.statesExplored)
    : bounded(space.statesExplored, "state-limit");

  let peakAt = 0;
  let peak: ConfigurationMemory = { total: Number.NEGATIVE_INFINITY, charged: [] };
  space.configs.forEach((cfg, i) => {
    const m = chargeConfiguration(system, contributions.value, cfg);
    // Strict >, so the FIRST maximal configuration wins and the argmax is deterministic.
    if (m.total > peak.total) {
      peak = m;
      peakAt = i;
    }
  });

  return ok({
    peak: peak.total === Number.NEGATIVE_INFINITY ? 0 : peak.total,
    charged: peak.charged,
    trace: traceTo(space, peakAt),
    coverage,
    notes: space.notes,
  });
}
