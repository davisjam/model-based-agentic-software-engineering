// The product layer: the hand-computed fixtures, the product-counted state limit, and the one
// boundary that must not leak.
//
// Phase 1's differential oracle (`test/ltl-oracle.test.ts`) covers WORDS: it generates formulas and
// lassos and requires the satisfaction relation and the automaton to agree. It never reads a model.
// This file covers the bridge from a model to those words, which is where three distinct kinds of
// silent wrongness live:
//
//   1. **A wrong trace domain.** If stuttering is missing, a halting execution has no infinite
//      trace and a property is decided over the wrong set. If stuttering leaks into the shared
//      graph, two shipped behavior forms change meaning. The fixtures below pin BOTH directions.
//   2. **A bound measured on the wrong thing.** The product is configurations x automaton nodes, so
//      a model inside the shipped state limit can exceed it once multiplied. `a model that fits the
//      limit can still exceed it once multiplied` is that fact as a test.
//   3. **A counterexample that is not one.** A verdict of `refuted` carrying a lasso nobody checks
//      is the worst failure this layer can have, because it is authoritative and specific. So every
//      refutation here is re-decided by `satisfies` from `ltl-trace.ts` -- the word-level evaluator
//      written to be correct by inspection, which shares none of the product's machinery.
//
// The fixtures are the foundation's section 9.4 list, each named for the ruling it pins.
import { test } from "node:test";
import assert from "node:assert/strict";
import { systemHash } from "../src/ir/hash.ts";
import type { CanonicalSystem, Evidence } from "../src/ir/types.ts";
import { configKey } from "../src/ir/types.ts";
import {
  compileSystem, DEFAULT_STATE_LIMIT, defaultOptions, exploreSpace, successorsOf,
} from "../src/engine/explore.ts";
import { runBehaviorQuery } from "../src/engine/behavior.ts";
import {
  admitLtlProperty, exploreProduct, isStutterStep, runLtlProperty,
} from "../src/engine/ltl-product.ts";
import {
  alwaysOf, eventuallyOf, impliesOf, nextOf, notOf, orOf, proposition, untilOf,
  type ParsedFormula,
} from "../src/engine/ltl.ts";
import type { BehaviorForm, Predicate } from "../src/engine/types.ts";
import { build } from "./engine-fixtures.ts";
import { counterexampleViolates } from "./ltl-evidence.ts";

// ----------------------------------------------------------------------------------------------
// Fixtures: the section 9.4 machines
// ----------------------------------------------------------------------------------------------

const at = (state: string, instance = "m"): Predicate =>
  ({ kind: "atoms", atoms: [{ ref: `${instance}.state`, op: "eq", value: state }] });

const holds = (ref: string, value: string | number | boolean): Predicate =>
  ({ kind: "atoms", atoms: [{ ref, op: "eq", value }] });

/** Two states alternating. Pins X indexing, `GF p` holds and `FG p` refuted. */
const flipFlop = (): CanonicalSystem => build({
  machines: {
    m: {
      initial: "a",
      states: { a: null, b: null },
      transitions: [
        { from: "a", to: "b", label: "rise" },
        { from: "b", to: "a", label: "fall" },
      ],
    },
  },
});

/** One step, then a halt. Pins every consequence of "terminal states stutter forever". */
const terminating = (): CanonicalSystem => build({
  machines: {
    m: {
      initial: "s",
      states: { s: null, t: null },
      transitions: [{ from: "s", to: "t", label: "finish" }],
    },
  },
});

/** A state no transition enters, beside a self-loop so the live state is not itself a dead end. */
const unreachableState = (): CanonicalSystem => build({
  machines: {
    m: {
      initial: "s",
      states: { s: null, u: null },
      transitions: [{ from: "s", to: "s", label: "spin" }],
    },
  },
});

/**
 * A self-loop, a boolean never written, and a counter never incremented.
 *
 * Three fixtures in one machine: an atom true nowhere (`flag: true`), the strong/weak until
 * separator (`G p` with no q, so `p until q` must be refuted), and a pure-safety formula whose
 * negation compiles with ZERO acceptance sets.
 */
const neverTrue = (): CanonicalSystem => build({
  machines: {
    m: {
      initial: "s",
      states: { s: null },
      variables: { flag: { type: "enum", values: ["false", "true"], initial: "false" } },
      transitions: [{ from: "s", to: "s", label: "spin" }],
    },
  },
});

/**
 * A violating self-loop at the front, then a long corridor nobody needs to walk.
 *
 * The shape that separates the two halves of the V22 asymmetry: an accepting cycle closes within
 * the first few product states, and the corridor behind it keeps the full product large. So there
 * is a limit at which the walk is genuinely TRUNCATED and the verdict is still `refuted`.
 */
const spinThenCorridor = (): CanonicalSystem => {
  const states: Record<string, null> = { a: null };
  const transitions: Record<string, unknown>[] = [
    { from: "a", to: "a", label: "spin" },
    { from: "a", to: "b0", label: "leave" },
  ];
  for (let i = 0; i < 7; i += 1) {
    states[`b${i}`] = null;
    transitions.push({ from: `b${i}`, to: `b${i + 1}`, label: `on${i}` });
  }
  states["b7"] = null;
  return build({ machines: { m: { initial: "a", states, transitions } } });
};

/** A four-state ring. Small enough to count by hand, big enough that the product exceeds it. */
const ring = (): CanonicalSystem => build({
  machines: {
    m: {
      initial: "s0",
      states: { s0: null, s1: null, s2: null, s3: null },
      transitions: [
        { from: "s0", to: "s1", label: "to1" },
        { from: "s1", to: "s2", label: "to2" },
        { from: "s2", to: "s3", label: "to3" },
        { from: "s3", to: "s0", label: "to0" },
      ],
    },
  },
});

// ----------------------------------------------------------------------------------------------
// Harness
// ----------------------------------------------------------------------------------------------

interface Answer {
  readonly outcome: string;
  readonly coverageKind: string;
  readonly statesExplored: number;
  readonly reason: string | null;
  readonly evidence: Evidence | null;
  readonly notes: readonly string[];
}

const ask = (
  system: CanonicalSystem, formula: ParsedFormula, limit: number = DEFAULT_STATE_LIMIT,
): Answer => {
  const v = runLtlProperty(system, formula, "forall", systemHash(system), limit);
  return {
    outcome: v.result.outcome,
    coverageKind: v.result.coverage.kind,
    statesExplored: v.result.coverage.statesExplored,
    reason: v.result.coverage.reason,
    evidence: v.result.evidence,
    notes: v.result.compilation.map((c) => c.explanation),
  };
};

const behavior = (
  system: CanonicalSystem, form: BehaviorForm, fields: Partial<{
    target: Predicate; predicate: Predicate; avoid: Predicate;
  }> = {},
): string => runBehaviorQuery(system, {
  form,
  target: fields.target ?? null,
  predicate: fields.predicate ?? null,
  avoid: fields.avoid ?? null,
  transition: null,
  limit: null,
}, form === "invariant" ? "forall" : "exists", systemHash(system)).result.outcome;

// `counterexampleViolates` -- the independent re-decision every refutation here runs through --
// moved to `test/ltl-evidence.ts` when the P1-P5 acceptance suite became its second caller. Its
// header explains what it decides and why; its negative controls stay below, with the fixture they
// run against.

/** Assert a refuted answer and that its counterexample really violates the formula. */
function assertRefuted(system: CanonicalSystem, formula: ParsedFormula, where: string): Answer {
  const answer = ask(system, formula);
  assert.equal(answer.outcome, "refuted", `${where}: expected refuted, got ${answer.outcome}`);
  assert.equal(counterexampleViolates(system, formula, answer.evidence), null,
    `${where}: the counterexample does not hold up`);
  return answer;
}

// ----------------------------------------------------------------------------------------------
// The evidence checker's own negative controls
// ----------------------------------------------------------------------------------------------

test("the evidence checker fires — three sabotages, three findings", () => {
  const sys = terminating();
  const formula = alwaysOf(proposition(at("s")));
  const answer = ask(sys, formula);
  assert.equal(answer.outcome, "refuted");
  const evidence = answer.evidence;
  assert.ok(evidence !== null);
  assert.equal(counterexampleViolates(sys, formula, evidence), null, "the real evidence must pass");

  // 1. The same trace offered as a counterexample to the NEGATION. A trace that violates phi
  //    satisfies not-phi, so the checker must reject it there — if it accepted both it would be
  //    measuring nothing.
  assert.match(counterexampleViolates(sys, notOf(formula), evidence) ?? "",
    /SATISFIES/, "a trace cannot be a counterexample to a formula and to its negation");

  // 2. A cycle that does not close. The word is then not ultimately periodic and the lasso is a
  //    fiction, however plausible the steps look.
  const openCycle: Evidence = { ...evidence, cycle: [] };
  assert.match(counterexampleViolates(sys, formula, openCycle) ?? "", /cycle is empty/);

  // 3. A prefix that does not meet its cycle.
  const detached: Evidence = { ...evidence, steps: [] };
  assert.notEqual(counterexampleViolates(sys, formula, detached), null,
    "a prefix dropped out from under the cycle must be caught");
});

// ----------------------------------------------------------------------------------------------
// The flip-flop: X indexing, GF and FG
// ----------------------------------------------------------------------------------------------

const p = (): ParsedFormula => proposition(at("a"));
const q = (): ParsedFormula => proposition(at("b"));

test("the flip-flop pins X indexing: the successor of the initial state is the other one", () => {
  const sys = flipFlop();
  assert.equal(ask(sys, nextOf(q())).outcome, "holds", "X q must hold where the next state is b");
  assertRefuted(sys, nextOf(p()), "X p on the flip-flop");
  // Two steps return, so `X X p` holds -- the one operator that counts, counting correctly.
  assert.equal(ask(sys, nextOf(nextOf(p()))).outcome, "holds");
});

test("the flip-flop pins GF p holds and FG p refuted", () => {
  const sys = flipFlop();
  assert.equal(ask(sys, alwaysOf(eventuallyOf(p()))).outcome, "holds");
  assertRefuted(sys, eventuallyOf(alwaysOf(p())), "FG p on the flip-flop");
  assertRefuted(sys, alwaysOf(p()), "G p on the flip-flop");
  assert.equal(ask(sys, eventuallyOf(p())).outcome, "holds", "p holds at position 0");
});

// ----------------------------------------------------------------------------------------------
// Terminal states stutter forever
// ----------------------------------------------------------------------------------------------

test("a terminal configuration repeats forever, so eventually-always holds at the halt", () => {
  const sys = terminating();
  // The halt is in `t`, and from the halt onward every position is `t`.
  assert.equal(ask(sys, eventuallyOf(alwaysOf(proposition(at("t"))))).outcome, "holds");
  assert.equal(ask(sys, alwaysOf(eventuallyOf(proposition(at("t"))))).outcome, "holds");
  // `X phi <=> phi` at the halt: position 1 and position 2 are both the halt.
  assert.equal(ask(sys, nextOf(nextOf(proposition(at("t"))))).outcome, "holds");
  assert.equal(ask(sys, nextOf(proposition(at("t")))).outcome, "holds");
});

test("the counterexample's cycle at a halt is the stutter, and it is not a declared transition", () => {
  const sys = terminating();
  const answer = assertRefuted(sys, alwaysOf(proposition(at("s"))), "G at(s) on the terminating machine");
  const cycle = answer.evidence?.cycle ?? [];
  assert.equal(cycle.length, 1, "a halt's cycle is the single stutter step");
  const step = cycle[0];
  assert.ok(step !== undefined);
  assert.ok(isStutterStep(step), "the cycle step must read as a stutter");
  assert.deepEqual([...step.instances], [], "a stutter moves no instance");
  assert.equal(step.label, null, "a stutter claims no label a student could look for");
  assert.equal(step.sync, null, "a stutter fires no event");
  assert.equal(configKey(step.from), configKey(step.to), "a stutter is a self-loop");

  // And the model really declares no such transition -- the stutter is the checker's, not the
  // author's. Asked of the step relation itself, which is the only thing that could have one.
  const compiled = compileSystem(sys);
  assert.ok(compiled.ok);
  assert.equal(successorsOf(compiled.value, step.from).steps.length, 0,
    "the configuration the stutter loops on must have NO enabled step in the model");
});

test("stutter-closure does not reach exploreSpace, so deadend and repeatable-cycle keep their meaning", () => {
  const sys = terminating();
  const compiled = compileSystem(sys);
  assert.ok(compiled.ok);
  const space = exploreSpace(compiled.value, defaultOptions());
  assert.equal(space.configs.length, 2);
  assert.equal(space.deadEnds.length, 1,
    "the shared graph must still have a dead end -- under a leaked closure it would have none");

  // The two denotations the foundation names as the ones that would silently flip.
  assert.equal(behavior(sys, "deadend"), "holds",
    "`deadend` must still find the halt; a leaked stutter loop answers refuted forever");
  assert.equal(behavior(sys, "repeatable-cycle", { target: at("t") }), "refuted",
    "a halt is not a repeatable cycle; a leaked stutter loop would call it one");

  // The sanctioned divergence of the section 9.1 deadend row, asserted POSITIVELY: `F G not t` is
  // refuted on the stutter-closed domain while `repeatable-cycle t` is refuted on the un-closed
  // graph. One halt, two layers, two different right answers.
  assertRefuted(sys, eventuallyOf(alwaysOf(notOf(proposition(at("t"))))), "F G not t at a halt");
});

// ----------------------------------------------------------------------------------------------
// Vacuity, atoms true nowhere, and the strong-until ruling
// ----------------------------------------------------------------------------------------------

test("an unreachable state is never reached, and a claim about it is vacuously true", () => {
  const sys = unreachableState();
  assert.equal(ask(sys, alwaysOf(notOf(proposition(at("u"))))).outcome, "holds");
  // Vacuity: the antecedent never occurs, so the implication holds whatever the consequent says.
  assert.equal(
    ask(sys, alwaysOf(impliesOf(proposition(at("u")), proposition(at("b", "m"))))).outcome,
    "unlicensed",
    "a consequent naming a state this machine does not declare refuses before any trace");
  assert.equal(
    ask(sys, alwaysOf(impliesOf(proposition(at("u")), proposition(at("s"))))).outcome, "holds");
});

test("an atom true nowhere refutes `eventually` with a concrete trace", () => {
  const sys = neverTrue();
  const answer = assertRefuted(sys, eventuallyOf(holdsFormula("m.flag", "true")),
    "F dead_atom on the never-true machine");
  assert.ok(answer.evidence !== null);
  assert.ok((answer.evidence.cycle ?? []).length > 0, "the refutation names a concrete trace");
});

test("the negation of `eventually` compiles with zero acceptance sets, and emptiness handles that", () => {
  const sys = neverTrue();
  const admission = admitLtlProperty(
    sys, eventuallyOf(holdsFormula("m.flag", "true")), "forall", systemHash(sys));
  assert.ok(admission.admitted);
  assert.equal(admission.plan.automaton.size.acceptanceSets, 0,
    "not-F is G, which has no Until subformula and therefore no acceptance set");
  // With an empty acceptance family every nontrivial component accepts, so the self-loop is found.
  assert.equal(ask(sys, eventuallyOf(holdsFormula("m.flag", "true"))).outcome, "refuted");
});

test("`until` is STRONG: `p until q` is refuted on a machine where p always holds and q never does", () => {
  const sys = neverTrue();
  const formula = untilOf(proposition(at("s")), holdsFormula("m.flag", "true"));
  assertRefuted(sys, formula, "p until q with no q");
  // The weak reading is spelled out, and it holds -- so the fixture separates the two readings
  // rather than merely asserting one.
  assert.equal(ask(sys, orOf(formula, alwaysOf(proposition(at("s"))))).outcome, "holds",
    "weak until is `(p until q) or always p`, and that is a different formula with a different answer");
});

function holdsFormula(ref: string, value: string): ParsedFormula {
  return proposition(holds(ref, value));
}

// ----------------------------------------------------------------------------------------------
// The state limit counts PRODUCT states
// ----------------------------------------------------------------------------------------------

test("the limit defaults to the shipped ceiling rather than a second constant", () => {
  const sys = ring();
  const admission = admitLtlProperty(sys, alwaysOf(eventuallyOf(p0())), "forall", systemHash(sys));
  assert.ok(admission.admitted);
  assert.equal(admission.plan.limit, DEFAULT_STATE_LIMIT,
    "the LTL walk honours the explorer's ceiling; a private copy would drift from it");
});

const p0 = (): ParsedFormula => proposition(at("s0"));

test("a model that fits the limit can still exceed it once multiplied", () => {
  const sys = ring();
  const compiled = compileSystem(sys);
  assert.ok(compiled.ok);
  const configurations = exploreSpace(compiled.value, defaultOptions()).configs.length;
  assert.equal(configurations, 4, "the ring has four configurations");

  const admission = admitLtlProperty(sys, alwaysOf(eventuallyOf(p0())), "forall", systemHash(sys));
  assert.ok(admission.admitted);
  const product = exploreProduct(admission.plan.compiled, admission.plan.property,
    admission.plan.automaton, DEFAULT_STATE_LIMIT);
  assert.equal(product.stopReason, "complete");
  assert.ok(product.states.length > configurations,
    `the product must exceed the configuration count (${product.states.length} vs ${configurations}) ` +
    `-- that is the whole reason the bound is counted in product states`);

  // A limit the MODEL fits inside, comfortably: 5 >= 4 configurations. The product does not fit.
  const bound = 5;
  assert.ok(bound >= configurations, "the limit under test must exceed the configuration count");
  const truncated = ask(sys, alwaysOf(eventuallyOf(p0())), bound);
  assert.equal(truncated.outcome, "inconclusive",
    "a truncated walk that found no accepting cycle is inconclusive -- never holds");
  assert.equal(truncated.coverageKind, "bounded");
  assert.equal(truncated.reason, "state-limit");
  assert.ok(truncated.statesExplored <= bound,
    `the bound must hold: ${truncated.statesExplored} explored against a limit of ${bound}`);
  assert.ok(truncated.notes.some((n) => n.includes("PRODUCT-state limit")),
    "the bound must be disclosed, naming what it counts");

  // The negative control: the same question, unbounded, settles. Without this the assertion above
  // could be satisfied by a walk that never works at all.
  const full = ask(sys, alwaysOf(eventuallyOf(p0())));
  assert.equal(full.outcome, "holds");
  assert.equal(full.coverageKind, "exhaustive");
  assert.equal(full.statesExplored, product.states.length,
    "the reported figure is the product count, which the disclosure says it is");
});

test("a TRUNCATED walk that found a cycle still refutes, because more search cannot unfind one", () => {
  const sys = spinThenCorridor();
  const formula = alwaysOf(notOf(proposition(at("a"))));
  const admission = admitLtlProperty(sys, formula, "forall", systemHash(sys));
  assert.ok(admission.admitted);
  const full = exploreProduct(admission.plan.compiled, admission.plan.property,
    admission.plan.automaton, DEFAULT_STATE_LIMIT);
  assert.equal(full.stopReason, "complete");

  // Tight enough that the corridor is unwalked, wide enough that the self-loop's cycle is inside.
  const bound = 5;
  assert.ok(bound < full.states.length,
    `the bound must truncate: ${bound} against a full product of ${full.states.length}`);
  const partial = exploreProduct(admission.plan.compiled, admission.plan.property,
    admission.plan.automaton, bound);
  assert.equal(partial.stopReason, "state-limit", "the walk under test must really have truncated");

  const truncated = ask(sys, formula, bound);
  assert.equal(truncated.outcome, "refuted",
    "a cycle found inside the explored region is sound however little was explored");
  assert.equal(counterexampleViolates(sys, formula, truncated.evidence), null);
  // Settling evidence reads `exhaustive` -- exhaustive WITH RESPECT TO THE QUESTION, which is the
  // convention `behavior.ts` already implements for a witness found after a handful of nodes.
  assert.equal(truncated.coverageKind, "exhaustive");
  assert.equal(truncated.statesExplored, bound);
});

test("no limit, on any model, lets a bounded walk answer holds", () => {
  // The sweep rather than one case: for every limit from 1 to the full product, a `holds` must come
  // with exhaustive coverage. A status computed by negating "did we find a lasso" passes the single
  // case above and fails somewhere in here.
  const subjects: readonly { readonly name: string; readonly system: CanonicalSystem; readonly formula: ParsedFormula }[] = [
    { name: "ring GF s0", system: ring(), formula: alwaysOf(eventuallyOf(p0())) },
    { name: "ring G s0", system: ring(), formula: alwaysOf(p0()) },
    { name: "flip-flop GF p", system: flipFlop(), formula: alwaysOf(eventuallyOf(p())) },
    { name: "halt FG t", system: terminating(), formula: eventuallyOf(alwaysOf(proposition(at("t")))) },
    {
      name: "corridor G not a",
      system: spinThenCorridor(),
      formula: alwaysOf(notOf(proposition(at("a")))),
    },
  ];
  let truncations = 0;
  for (const subject of subjects) {
    const admission = admitLtlProperty(subject.system, subject.formula, "forall",
      systemHash(subject.system));
    assert.ok(admission.admitted, subject.name);
    const full = exploreProduct(admission.plan.compiled, admission.plan.property,
      admission.plan.automaton, DEFAULT_STATE_LIMIT);
    for (let limit = 1; limit <= full.states.length; limit += 1) {
      const answer = ask(subject.system, subject.formula, limit);
      if (limit < full.states.length) truncations += 1;
      if (answer.outcome === "holds") {
        assert.equal(answer.coverageKind, "exhaustive",
          `${subject.name} at limit ${limit}: 'holds' under ${answer.coverageKind} coverage rests a ` +
          `universal claim on a truncated exploration`);
      }
      if (answer.coverageKind === "bounded") {
        assert.equal(answer.outcome, "inconclusive",
          `${subject.name} at limit ${limit}: bounded coverage must read inconclusive`);
        assert.equal(answer.reason, "state-limit");
      }
    }
  }
  assert.ok(truncations > 20, `the sweep must actually truncate; it did so ${truncations} times`);
});

// ----------------------------------------------------------------------------------------------
// Admission
// ----------------------------------------------------------------------------------------------

test("an existential LTL question is refused with the dual named, not reinterpreted", () => {
  const sys = flipFlop();
  const v = runLtlProperty(sys, alwaysOf(p()), "exists", systemHash(sys));
  assert.equal(v.result.outcome, "unlicensed");
  assert.equal(v.refusal?.reason, "quantifier-mismatch");
  assert.match(v.result.refusal ?? "", /forall/, "the refusal must name the dual to ask instead");
  assert.equal(v.result.coverage.kind, "not-applicable");
});

// ----------------------------------------------------------------------------------------------
// P5 on the acceptance machine -- MOVED
// ----------------------------------------------------------------------------------------------
//
// The P5 pin landed here first, because this was the only file that could ask it. It now lives in
// `test/acceptance-p1-p5.test.ts` with its four siblings, where it gained what a lone pin could
// not have: the same formula asked of the transaction-workspace machine as well, an
// `await_adoption` flip control, and the measured finding that no single-edge removal flips P5 over
// the lifecycle model. Everything the version here asserted is asserted there -- the section 5.2
// `repeatable-cycle`+`avoid` pair that section 9.1 makes a standing obligation, the no-dead-end
// check, the no-stutter check, and the labelled-step check.
//
// Moved rather than copied. Two files asserting one property drift apart, and the drift surfaces as
// one of them quietly asserting less.

test("an atom naming nothing refuses before a trace exists", () => {
  const sys = flipFlop();
  const v = runLtlProperty(sys, alwaysOf(proposition(at("nonesuch"))), "forall", systemHash(sys));
  assert.equal(v.result.outcome, "unlicensed");
  assert.equal(v.result.coverage.statesExplored, 0,
    "nothing was walked, so nothing may be reported as walked");
});
