// The NNF rewrite and the GPVW tableau, checked against the published construction.
//
// Four jobs:
//
//   1. **The NNF arms are the identities the foundation restates as theorems** — `¬X φ ≡ X ¬φ`,
//      `¬F φ ≡ G ¬φ`, `¬G φ ≡ F ¬φ`, and the U-duality `¬(φ U ψ) ≡ (¬φ) R (¬ψ)`. Asserted on the
//      rewritten form's canonical key, which is the cheapest way to see that the rewrite did the
//      named thing rather than something that happens to agree on the fixtures.
//   2. **The tableau's shape.** One acceptance set per Until subformula; ZERO for a pure-safety
//      formula; labels that are literals over atom keys; every state reachable from an initial one.
//   3. **The measured sizes** for the formulas the foundation names, pinned. The verdict mapping
//      will later disclose automaton and product sizes to a reader, so a change in these numbers
//      should be a decision rather than a surprise. The foundation predicted "2-5 automaton
//      states" for the acceptance-suite formulas; the numbers below are the measurement.
//   4. **The construction refuses rather than hangs** when a formula's tableau exceeds its own node
//      ceiling.
//
// What is NOT here: anything about a model. No configuration, no step relation, no stutter-closure,
// no product. The automaton's MEANING is pinned in `test/ltl-oracle.test.ts`, against a second
// implementation of the satisfaction relation -- because an automaton is not checkable by reading
// it, and a test that asserted this one's state count and stopped there would pin a shape with no
// claim about what it denotes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeFormula, parseFormula, type Formula } from "../src/engine/ltl.ts";
import {
  buildGnba, negate, nnfKey, toNnf, untilSubformulas, MAX_TABLEAU_NODES, type Gnba,
} from "../src/engine/ltl-automaton.ts";

const formula = (text: string): Formula => {
  const r = parseFormula(text);
  assert.ok(r.ok, `expected '${text}' to parse: ${r.ok ? "" : r.refusal}`);
  return normalizeFormula(r.value.formula);
};

const automaton = (text: string): Gnba => {
  const r = buildGnba(formula(text));
  assert.ok(r.ok, `expected '${text}' to compile: ${r.ok ? "" : r.refusal}`);
  return r.value;
};

const nnf = (text: string): string => nnfKey(toNnf(formula(text)));

// ----------------------------------------------------------------------------------------------
// 1. Negation normal form
// ----------------------------------------------------------------------------------------------

test("eventually and always are sugar, so NNF carries only until and release", () => {
  // F φ ≡ true U φ, G φ ≡ false R φ. The expansion laws are written for U and R only, so a third
  // law for F or a fourth for G would be a second construction to get wrong.
  assert.equal(nnf("eventually p: 1"), "(#true U [p eq 1])");
  assert.equal(nnf("always p: 1"), "(#false R [p eq 1])");
});

test("the four negation identities, on the rewritten form", () => {
  assert.equal(nnf("not next p: 1"), "X(![p eq 1])", "¬X φ ≡ X ¬φ");
  assert.equal(nnf("not eventually p: 1"), "(#false R ![p eq 1])", "¬F φ ≡ G ¬φ");
  assert.equal(nnf("not always p: 1"), "(#true U ![p eq 1])", "¬G φ ≡ F ¬φ");
  assert.equal(nnf("not (p: 1 until q: 1)"), "(![p eq 1] R ![q eq 1])", "¬(φ U ψ) ≡ (¬φ) R (¬ψ)");
});

test("implies is folded to a disjunction, and its negation to a conjunction", () => {
  assert.equal(nnf("p: 1 implies q: 1"), "(![p eq 1] | [q eq 1])");
  assert.equal(nnf("not (p: 1 implies q: 1)"), "([p eq 1] & ![q eq 1])");
});

test("no NNF of any surface formula carries a negation over a temporal operator", () => {
  const texts = [
    "not always eventually p: 1", "not (p: 1 until not q: 1)", "not next not next p: 1",
    "not (always p: 1 implies eventually q: 1)", "not not (p: 1 until q: 1)",
  ];
  for (const text of texts) {
    const key = nnf(text);
    // A negation mark may only ever sit immediately left of a bracketed atom.
    assert.doesNotMatch(key, /![^[]/, `${text} rewrote to ${key}, where a '!' is not on an atom`);
  }
});

test("one acceptance set per Until subformula in the rewritten form, deduplicated", () => {
  assert.equal(untilSubformulas(toNnf(formula("always p: 1"))).length, 0);
  assert.equal(untilSubformulas(toNnf(formula("eventually p: 1"))).length, 1);
  assert.equal(untilSubformulas(toNnf(formula("eventually p: 1 and eventually q: 1"))).length, 2);
  // The same until written twice is one obligation, so one acceptance set.
  assert.equal(untilSubformulas(toNnf(formula("eventually p: 1 and eventually p: 1"))).length, 1);
  // `always (p implies eventually q)` has exactly the inner F.
  assert.equal(untilSubformulas(toNnf(formula("always (p: 1 implies eventually q: 1)"))).length, 1);
});

// ----------------------------------------------------------------------------------------------
// 2. The tableau's shape
// ----------------------------------------------------------------------------------------------

test("a pure-safety formula compiles with ZERO acceptance sets", () => {
  // The §9.4 fixture for the emptiness check's zero-acceptance-set case: with no Until there is no
  // promise to discharge, so every run that survives the labels is accepting.
  const safety = automaton("always p: 1");
  assert.equal(safety.size.acceptanceSets, 0);
  assert.equal(safety.acceptance.length, 0);
  assert.deepEqual(safety.pinnedBy, []);
});

test("every acceptance set names the until it pins, and holds only real state ids", () => {
  const a = automaton("always (p: 1 implies eventually q: 1)");
  assert.equal(a.acceptance.length, a.pinnedBy.length);
  assert.deepEqual(a.pinnedBy, ["(#true U [q eq 1])"]);
  const ids = new Set(a.states.map((s) => s.id));
  for (const set of a.acceptance) {
    for (const id of set) assert.ok(ids.has(id), `acceptance names a state ${id} that does not exist`);
  }
});

test("the acceptance set is exactly the discharged nodes: the until unobliged, or its right side obliged", () => {
  const a = automaton("p: 1 until q: 1");
  const untilKey = "([p eq 1] U [q eq 1])";
  const rightKey = "[q eq 1]";
  const expected = a.states
    .filter((s) => !s.obliged.includes(untilKey) || s.obliged.includes(rightKey))
    .map((s) => s.id);
  assert.deepEqual(a.acceptance[0], expected);
  // And it is a PROPER subset: a node that owes `p U q` without owing `q` is what the condition
  // exists to exclude, so an automaton where every state accepted would be the weak reading.
  assert.ok(expected.length < a.states.length,
    "no state is excluded from the acceptance set, which is the weak-until shape");
});

test("every state is reachable from an initial state, so no node is dead weight", () => {
  for (const text of ["p: 1 until q: 1", "always eventually p: 1", "next next p: 1"]) {
    const a = automaton(text);
    const seen = new Set(a.initial);
    const todo = [...a.initial];
    while (todo.length > 0) {
      const id = todo.pop();
      if (id === undefined) break;
      for (const to of a.states[id]?.next ?? []) {
        if (seen.has(to)) continue;
        seen.add(to);
        todo.push(to);
      }
    }
    assert.equal(seen.size, a.states.length, `'${text}' built unreachable tableau nodes`);
  }
});

test("a state label never constrains one atom both ways", () => {
  for (const text of ["p: 1 until q: 1", "not (p: 1 until q: 1)", "always (p: 1 or not q: 1)"]) {
    for (const state of automaton(text).states) {
      const positive = new Set(state.label.filter((l) => !l.negated).map((l) => l.atom));
      for (const lit of state.label) {
        if (!lit.negated) continue;
        assert.ok(!positive.has(lit.atom),
          `'${text}' built state ${state.id} requiring '${lit.atom}' to hold and not hold`);
      }
    }
  }
});

// ----------------------------------------------------------------------------------------------
// 3. The measured sizes
// ----------------------------------------------------------------------------------------------

/**
 * Automaton sizes for the formulas the foundation names, as measured.
 *
 * Both columns, because the verdict path compiles the NEGATION and asks whether the product is
 * empty — so the number that will govern the product's size is `negatedStates`, and a reader
 * comparing a disclosure to this table needs to know which one it is.
 */
const SIZES: readonly { readonly text: string; readonly states: number; readonly sets: number; readonly negatedStates: number; readonly negatedSets: number }[] = [
  { text: "always p: 1", states: 1, sets: 0, negatedStates: 3, negatedSets: 1 },
  { text: "eventually p: 1", states: 3, sets: 1, negatedStates: 1, negatedSets: 0 },
  { text: "next p: 1", states: 3, sets: 0, negatedStates: 3, negatedSets: 0 },
  { text: "p: 1 until q: 1", states: 3, sets: 1, negatedStates: 3, negatedSets: 0 },
  { text: "always eventually p: 1", states: 2, sets: 1, negatedStates: 3, negatedSets: 1 },
  { text: "eventually always p: 1", states: 3, sets: 1, negatedStates: 2, negatedSets: 1 },
  { text: "always (p: 1 implies eventually q: 1)", states: 5, sets: 1, negatedStates: 3, negatedSets: 1 },
  { text: "always (p: 1 implies eventually (q: 1 or r: 1))", states: 7, sets: 1, negatedStates: 3, negatedSets: 1 },
];

test("the automaton sizes for the foundation's fixture formulas are what they were measured at", () => {
  const measured: string[] = [];
  for (const row of SIZES) {
    const forward = automaton(row.text);
    const back = buildGnba(negate(formula(row.text)));
    assert.ok(back.ok, back.ok ? "" : back.refusal);
    measured.push(
      `${row.text} -> ${forward.size.states} states / ${forward.size.acceptanceSets} sets; ` +
      `negated ${back.value.size.states} / ${back.value.size.acceptanceSets}`);
    assert.equal(forward.size.states, row.states, `${row.text}: state count`);
    assert.equal(forward.size.acceptanceSets, row.sets, `${row.text}: acceptance sets`);
    assert.equal(back.value.size.states, row.negatedStates, `not (${row.text}): state count`);
    assert.equal(back.value.size.acceptanceSets, row.negatedSets, `not (${row.text}): acceptance sets`);
  }
  // The foundation's budget claim for the acceptance-suite formulas, asserted rather than trusted.
  assert.ok(SIZES.every((r) => r.states <= 10 && r.negatedStates <= 10),
    `an automaton outgrew the foundation's single-digit expectation:\n  ${measured.join("\n  ")}`);
});

test("transitions are counted, and a one-state safety automaton still has its self-loop", () => {
  const safety = automaton("always p: 1");
  assert.equal(safety.size.states, 1);
  assert.equal(safety.size.transitions, 1);
  assert.deepEqual(safety.states[0]?.next, [0]);
});

// ----------------------------------------------------------------------------------------------
// 4. The ceiling
// ----------------------------------------------------------------------------------------------

test("a formula whose tableau outgrows the node ceiling refuses, naming the cause", () => {
  // A conjunction of distinct untils is the standard blow-up shape: the tableau tracks every
  // subset of outstanding promises. Driven against a SMALL ceiling, so the refusal path is
  // exercised in milliseconds rather than by building 20,000 nodes.
  const wide = Array.from({ length: 8 }, (_, i) => `eventually a${i}: 1`).join(" and ");
  const r = buildGnba(formula(wide), 40);
  assert.equal(r.ok, false, "a ceiling of 40 did not stop a formula with eight outstanding untils");
  if (r.ok) return;
  assert.match(r.refusal, /exceeds 40 nodes/);
  assert.match(r.refusal, /exponential in the formula/);
});

test("the default ceiling is the module's constant, and the fixture formulas are nowhere near it", () => {
  assert.ok(MAX_TABLEAU_NODES > 1000, "a ceiling this low would refuse ordinary formulas");
  const biggest = Math.max(...SIZES.map((r) => Math.max(r.states, r.negatedStates)));
  assert.ok(biggest * 100 < MAX_TABLEAU_NODES,
    `the fixture formulas peak at ${biggest} states against a ceiling of ${MAX_TABLEAU_NODES}`);
});
