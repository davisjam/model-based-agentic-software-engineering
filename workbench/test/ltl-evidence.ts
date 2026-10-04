// Re-decide an LTL refutation independently of the machinery that produced it. Not a test file --
// `node --test "test/*.test.ts"` does not pick it up, and `tsc` covers the whole `test` directory
// either way.
//
// A verdict of `refuted` carrying a lasso nobody checks is the worst failure the product layer can
// have, because it is authoritative and specific: a student is shown a trace and told it is a
// counterexample. So every refutation in the LTL tests runs through `counterexampleViolates`, and
// the two things it decides are the two a counterexample needs.
//
//   **An execution of THIS model.** It starts at the initial configuration, every step is one the
//   step relation offers from the configuration it leaves, the cycle closes, and every stutter step
//   sits on a configuration that genuinely has no enabled step. That last clause is where "a
//   student must not find a transition they did not write" becomes a test rather than a promise.
//
//   **A violation of THIS formula.** The configurations become letters by evaluating each atom, and
//   `satisfies` from `ltl-trace.ts` decides the word by induction. That evaluator shares the
//   product's semantics and none of its machinery -- no Tarjan, no automaton, no configurations --
//   so it cannot agree with a product bug for free.
//
// It lives here rather than inside one test file because two now need it: the section 9.4 fixtures
// in `test/ltl-product.test.ts` and the P1-P5 acceptance suite in
// `test/acceptance-p1-p5.test.ts`. One implementation, so a weakening is felt in both places at
// once. Its own negative controls -- three sabotages that must each be caught -- stay in
// `test/ltl-product.test.ts`, where the fixture they run against lives.
import type { CanonicalSystem, Configuration, Evidence, Step } from "../src/ir/types.ts";
import { configKey } from "../src/ir/types.ts";
import { systemHash } from "../src/ir/hash.ts";
import { successorsOf } from "../src/engine/explore.ts";
import { admitLtlProperty, isStutterStep } from "../src/engine/ltl-product.ts";
import type { ParsedFormula } from "../src/engine/ltl.ts";
import { makeLasso, satisfies, type Letter } from "../src/engine/ltl-trace.ts";

/**
 * Returns the sentence a failure should carry, or null when the evidence holds up.
 *
 * A sentence rather than a boolean: a caller that only learns "the evidence is bad" has to
 * re-derive which of eight ways it was bad, and the diagnosis is the expensive part.
 */
export function counterexampleViolates(
  system: CanonicalSystem, formula: ParsedFormula, evidence: Evidence | null,
): string | null {
  if (evidence === null) return "the refutation carries no evidence";
  if (evidence.shape !== "lasso") return `evidence shape is '${evidence.shape}', expected 'lasso'`;
  if (evidence.role !== "counterexample") return `evidence role is '${evidence.role}'`;
  const cycle = evidence.cycle ?? [];
  if (cycle.length === 0) return "the lasso's cycle is empty, so the trace is not infinite";

  const admission = admitLtlProperty(system, formula, "forall", systemHash(system));
  if (!admission.admitted) return "the formula no longer admits, so the evidence cannot be checked";
  const property = admission.plan.property;
  const compiled = admission.plan.compiled;

  const configsOf = (steps: readonly Step[]): readonly Configuration[] => steps.map((s) => s.from);

  // The cycle must close, or the word is not ultimately periodic and the lasso is a fiction.
  const cycleStart = cycle[0]?.from;
  const cycleEnd = cycle[cycle.length - 1]?.to;
  if (cycleStart === undefined || cycleEnd === undefined) return "the cycle is malformed";
  if (configKey(cycleStart) !== configKey(cycleEnd)) {
    return "the lasso's cycle does not return to the configuration it left";
  }
  const walk = [...evidence.steps, ...cycle];
  const start = walk[0]?.from;
  if (start === undefined) return "the lasso has no first configuration";
  if (configKey(start) !== configKey(compiled.initial)) {
    return "the lasso does not begin at the initial configuration, so it is not an execution";
  }
  for (let i = 0; i + 1 < walk.length; i += 1) {
    const here = walk[i];
    const next = walk[i + 1];
    if (here === undefined || next === undefined) continue;
    if (configKey(here.to) !== configKey(next.from)) {
      return `step ${i + 1} does not leave the configuration step ${i} arrived at`;
    }
  }
  // Every step must be one the MODEL offers -- or a stutter on a configuration that really has
  // nowhere to go. A fabricated transition is caught here and nowhere else.
  for (const [i, step] of walk.entries()) {
    const offered = successorsOf(compiled, step.from).steps;
    if (isStutterStep(step)) {
      if (offered.length > 0) {
        return `step ${i} stutters on a configuration with ${offered.length} enabled step(s)`;
      }
      if (configKey(step.from) !== configKey(step.to)) return `step ${i} stutters but moves`;
      continue;
    }
    if (!offered.some((s) => configKey(s.step.to) === configKey(step.to)
      && s.step.label === step.label)) {
      return `step ${i} ('${step.label ?? "unlabelled"}') is not a step the model offers here`;
    }
  }
  const letterAt = (cfg: Configuration): Letter => {
    const set = new Set<string>();
    for (const [atom, binding] of property.atoms) if (binding.holds(cfg)) set.add(atom);
    return set;
  };
  const lasso = makeLasso(
    configsOf(evidence.steps).map(letterAt), configsOf(cycle).map(letterAt));
  if (!lasso.ok) return `the lasso is not well formed: ${lasso.refusal}`;
  if (satisfies(property.formula, lasso.value)) {
    return "the returned trace SATISFIES the formula, so it is not a counterexample";
  }
  return null;
}

/** Every configuration the lasso visits, prefix and cycle together. */
export const configurationsOn = (evidence: Evidence | null): readonly Configuration[] => {
  if (evidence === null) return [];
  const steps = [...evidence.steps, ...(evidence.cycle ?? [])];
  return [...steps.map((s) => s.from), ...(steps.length > 0 ? [steps[steps.length - 1]?.to] : [])]
    .filter((c): c is Configuration => c !== undefined);
};
