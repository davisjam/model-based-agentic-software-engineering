/**
 * The quantitative evaluator's public surface — the analysis layer the Q2/Q3 rulings unblocked.
 *
 * Three analyses and one judge:
 *
 *  - `traceMetric`       — one execution's latency/cost, per occurrence of an accounted entity;
 *  - `maxOverExecutions` — the worst case over all executions, or the Q5 cycle witness;
 *  - `memoryOf` / `peakMemory` — memory(c) by the Q3 predicate, and its reachable maximum;
 *  - `evaluateRequirement` — a bound judged into Outcome + Coverage + Evidence, nothing new;
 *  - `expectedMetric`    — always a refusal, naming what is missing or what is deferred (Q4).
 */
export {
  buildChargeTable, ChargeAccumulator, EXECUTES_IN_STATE, resolveStateRef, stepCharge,
  type ChargeTable,
} from "./charge.ts";
export {
  defaultPathOptions, maxOverExecutions, traceMetric, type PathMetric, type PathOptions,
} from "./latency.ts";
export {
  defaultMemoryOptions, memoryContributions, memoryOf, peakMemory, type MemoryOptions,
} from "./memory.ts";
export {
  defaultRequirementOptions, evaluateRequirement, expectedMetric, REQUIREMENT_METRICS,
  type QuantRequirement, type RequirementMetric, type RequirementOptions,
} from "./requirement.ts";
export {
  parseBound, quantityMagnitude,
  type Charge, type ConfigurationMemory, type MemoryContribution, type PathExtremum,
  type PeakMemory, type QuantAnswer, type RangeEnd, type RequirementAnalysis, type TraceCharges,
} from "./types.ts";
