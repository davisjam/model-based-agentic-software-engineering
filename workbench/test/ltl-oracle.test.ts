// The differential oracle: does the automaton MEAN the formula?
//
// The failure mode this file exists for is silent authoritative wrongness. A subtly wrong LTL
// checker answers `holds` for a property that does not hold, and nothing downstream can tell --
// unlike every other failure in this project, which shows up as a type error, a red test or a
// refusal that names itself. An automaton is not checkable by reading it, so the defence is a
// SECOND implementation of the same question, written to be correct by inspection:
// `satisfiesAt` in `src/engine/ltl-trace.ts` walks the foundation's satisfaction table by
// induction on the formula over an explicit lasso.
//
// Then the two are required to agree on generated pairs. That is strictly stronger than the
// semantic identities, which constrain the construction without pinning it to a meaning, and it
// covers EVERY formula rather than only the ones that overlap a shipped behavior form.
//
// ## Four layers, weakest last
//
//   1. **The differential sweep.** Generated formulas x generated lassos; the direct evaluator's
//      verdict and the automaton's acceptance of that lasso must match. A disagreement reports the
//      formula, the lasso and which side it suspects.
//   2. **The negation self-check**, mechanically. At the word level satisfaction is classical, so
//      the two sides must be exact complements -- stronger than the model-level form, where both
//      `refuted` is legitimate because different traces can witness each.
//   3. **The semantic identities** as property tests, through BOTH implementations.
//   4. **Hand-computed fixtures**, each pinning one ruling.
//
// ## The negative control, and why it is here rather than in a note
//
// A check that cannot fail is decoration. `the sweep catches a broken acceptance condition` and
// its siblings below sabotage the automaton in the three ways the construction can be wrong --
// widen the acceptance sets (the weak-until shape), drop the label constraints, drop the acceptance
// sets -- and assert the sweep goes RED. Those are post-hoc mutations of the automaton object, so
// they sabotage the ORACLE'S SENSITIVITY rather than the source; four source-level mutations were
// also driven by hand during development (an un-negated left side in the U-duality; a dropped
// X-obligation in the until split; the same in the release split; the acceptance condition with
// its second disjunct removed) and produced 100, 1963, 168 and 330 disagreements out of 24,000
// pairs respectively, against 0 for the unmutated construction.
//
// ## What is NOT here
//
// The lassos are words over atomic propositions, not executions of a model. The §9.1 bridge to the
// six shipped behavior forms, the stutter-closure at dead ends, the product walk and the P1-P5
// acceptance suite all need the model layer, which is the next phase. Where a §9.4 fixture has a
// word-level half and a model-level half, the word-level half is pinned below and the other half is
// named as the next phase's.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeFormula, parseFormula, type Formula } from "../src/engine/ltl.ts";
import { buildGnba, negate, nnfKey, toNnf, type Gnba } from "../src/engine/ltl-automaton.ts";
import {
  automatonAccepts, makeLasso, satisfies, satisfiesAt, type Lasso, type Letter,
} from "../src/engine/ltl-trace.ts";

// ----------------------------------------------------------------------------------------------
// Generators
// ----------------------------------------------------------------------------------------------

/** Three atoms: enough for nested untils and a vacuous antecedent, few enough to repeat. */
const ATOMS = ["p", "q", "r"] as const;

const atom = (key: string): Formula => ({ kind: "atom", key });
const p = atom("p");
const q = atom("q");
const r = atom("r");

const not = (f: Formula): Formula => ({ kind: "not", operand: f });
const and = (l: Formula, right: Formula): Formula => ({ kind: "and", left: l, right });
const or = (l: Formula, right: Formula): Formula => ({ kind: "or", left: l, right });
const next = (f: Formula): Formula => ({ kind: "next", operand: f });
const ev = (f: Formula): Formula => ({ kind: "eventually", operand: f });
const al = (f: Formula): Formula => ({ kind: "always", operand: f });
const until = (l: Formula, right: Formula): Formula => ({ kind: "until", left: l, right });

/** A seeded generator, so a disagreement is reproducible from the seed printed in its message. */
function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(random: () => number, xs: readonly T[]): T => {
  const chosen = xs[Math.floor(random() * xs.length)];
  if (chosen === undefined) throw new Error("pick from an empty list");
  return chosen;
};

const KINDS = [
  "atom", "const", "not", "and", "or", "implies", "next", "eventually", "always", "until",
] as const;

function generateFormula(random: () => number, depth: number): Formula {
  if (depth <= 0) return atom(pick(random, ATOMS));
  const kind = pick(random, KINDS);
  switch (kind) {
    case "atom": return atom(pick(random, ATOMS));
    case "const": return { kind: "const", value: random() < 0.5 };
    case "not": case "next": case "eventually": case "always":
      return { kind, operand: generateFormula(random, depth - 1) };
    case "and": case "or": case "implies": case "until":
      return {
        kind,
        left: generateFormula(random, depth - 1),
        right: generateFormula(random, depth - 1),
      };
  }
}

const letters = (...sets: readonly (readonly string[])[]): Letter[] =>
  sets.map((s) => new Set(s));

const lasso = (prefix: readonly Letter[], cycle: readonly Letter[]): Lasso => {
  const made = makeLasso(prefix, cycle);
  assert.ok(made.ok, made.ok ? "" : made.refusal);
  return made.value;
};

/**
 * The lasso corpus, hand-listed so the degenerate cases are present by name rather than by luck.
 *
 * Empty prefix; a single-state cycle (which is the shape a dead end's stutter self-loop produces);
 * a cycle satisfying no atom at all; a cycle satisfying every atom; and a few with real prefixes so
 * `next` has somewhere to point that is not already in the cycle.
 */
const FIXED_LASSOS: readonly Lasso[] = [
  lasso([], letters([])),                                  // nothing, forever
  lasso([], letters(["p"])),                               // p forever, single-state cycle
  lasso([], letters(["p", "q", "r"])),                     // everything, forever
  lasso([], letters(["p"], [])),                           // flip-flop on p
  lasso([], letters(["p"], ["q"])),                        // alternating p and q
  lasso(letters(["p"]), letters([])),                      // p once, then nothing
  lasso(letters([]), letters(["q"])),                       // nothing, then q forever
  lasso(letters(["p"], ["q"]), letters(["r"])),             // a two-step prefix
  lasso(letters(["q"]), letters(["p", "q"], ["p"], [])),    // a three-step cycle
  lasso(letters([], ["p"], ["p", "r"]), letters(["q"], [])),
];

function generateLasso(random: () => number): Lasso {
  const letter = (): Letter => new Set(ATOMS.filter(() => random() < 0.45));
  const prefixLength = Math.floor(random() * 3);
  const cycleLength = 1 + Math.floor(random() * 3);
  return lasso(
    Array.from({ length: prefixLength }, letter),
    Array.from({ length: cycleLength }, letter));
}

const show = (l: Lasso): string =>
  `prefix=[${l.prefix.map((s) => `{${[...s].join(",")}}`).join(" ")}] ` +
  `cycle=[${l.cycle.map((s) => `{${[...s].join(",")}}`).join(" ")}]`;

const compiled = (f: Formula): Gnba => {
  const built = buildGnba(f);
  assert.ok(built.ok, `could not compile ${nnfKey(toNnf(f))}: ${built.ok ? "" : built.refusal}`);
  return built.value;
};

// ----------------------------------------------------------------------------------------------
// 1. The differential sweep
// ----------------------------------------------------------------------------------------------

/**
 * One (formula, lasso) pair. Returns a disagreement message, or null.
 *
 * The message names which side is suspected, because "the two disagree" is not actionable. The
 * direct evaluator is the specification -- it walks the satisfaction table with no construction in
 * between -- so the automaton is the default suspect, and the one case where it is not is called
 * out: when the direct evaluator and the automaton disagree on a formula with no temporal operator
 * at all, the fault is more likely in the labeling than in the tableau.
 */
function disagreement(f: Formula, automaton: Gnba, l: Lasso): string | null {
  const direct = satisfies(f, l);
  const accepted = automatonAccepts(automaton, l);
  if (direct === accepted) return null;
  const suspect = direct
    ? "the automaton REJECTS a satisfying trace -- suspect a too-strong acceptance set, or a label " +
      "constraint the tableau should not have obliged"
    : "the automaton ACCEPTS a violating trace -- suspect a missing acceptance set, a lost " +
      "X-obligation in the until or release split, or an un-negated side in the NNF rewrite";
  return `${nnfKey(toNnf(f))} on ${show(l)}: relation says ${direct}, automaton says ${accepted}. ${suspect}.`;
}

/** Every (formula, lasso) pair over a seeded formula batch and the whole lasso corpus. */
function sweep(
  seed: number, count: number, maxDepth: number,
  check: (f: Formula, automaton: Gnba, l: Lasso) => string | null = disagreement,
): { readonly pairs: number; readonly problems: readonly string[] } {
  const random = rng(seed);
  const lassos = [...FIXED_LASSOS, ...Array.from({ length: 8 }, () => generateLasso(random))];
  const problems: string[] = [];
  let pairs = 0;
  for (let i = 0; i < count; i += 1) {
    const f = normalizeFormula(generateFormula(random, 1 + Math.floor(random() * maxDepth)));
    const automaton = compiled(f);
    for (const l of lassos) {
      pairs += 1;
      const problem = check(f, automaton, l);
      if (problem !== null && problems.length < 5) problems.push(problem);
    }
  }
  return { pairs, problems };
}

test("the automaton accepts exactly the lassos the satisfaction relation satisfies", () => {
  // Sized to the project's one-second rule, which at this scale buys tens of thousands of pairs.
  const { pairs, problems } = sweep(20261004, 4000, 4);
  assert.ok(pairs > 60000, `the sweep only compared ${pairs} pairs; the generator is not generating`);
  assert.deepEqual(problems, [],
    `the construction and the satisfaction relation disagree:\n  ${problems.join("\n  ")}`);
});

test("and again at depth 5, where the nested untils live", () => {
  const { pairs, problems } = sweep(777, 800, 5);
  assert.ok(pairs > 12000, `only ${pairs} pairs`);
  assert.deepEqual(problems, []);
});

// ----------------------------------------------------------------------------------------------
// 2. The negative control -- the sweep must be able to fail
// ----------------------------------------------------------------------------------------------

/** Mutate an automaton, so the sweep's sensitivity is measured rather than assumed. */
const widenAcceptance = (a: Gnba): Gnba =>
  ({ ...a, acceptance: a.acceptance.map(() => a.states.map((s) => s.id)) });

const dropAcceptance = (a: Gnba): Gnba => ({ ...a, acceptance: [], pinnedBy: [] });

const dropLabels = (a: Gnba): Gnba =>
  ({ ...a, states: a.states.map((s) => ({ ...s, label: [] })) });

test("the sweep catches a weakened acceptance condition, a dropped one, and dropped labels", () => {
  const mutations: readonly { readonly name: string; readonly apply: (a: Gnba) => Gnba }[] = [
    { name: "every state accepting (the weak-until shape)", apply: widenAcceptance },
    { name: "no acceptance sets at all", apply: dropAcceptance },
    { name: "no label constraints", apply: dropLabels },
  ];
  for (const mutation of mutations) {
    const { problems } = sweep(
      20261004, 300, 4,
      (f, automaton, l) => disagreement(f, mutation.apply(automaton), l));
    assert.ok(problems.length > 0,
      `the sweep did not notice '${mutation.name}' -- it is not sensitive to what it claims to check`);
  }
});

test("the strong/weak until separator is decided by one line, and the mutant fails it", () => {
  // `G p` and no q anywhere. STRONG `p until q` is refuted; a weak reading answers holds.
  const forever = lasso([], letters(["p"]));
  const f = until(p, q);
  assert.equal(satisfies(f, forever), false, "the relation read `until` as weak");
  const real = compiled(f);
  assert.equal(automatonAccepts(real, forever), false, "the automaton read `until` as weak");
  assert.equal(automatonAccepts(widenAcceptance(real), forever), true,
    "widening the acceptance set did not produce the weak reading, so this fixture is not the separator");
  // And the weak until, which IS expressible: `(p until q) or always p`.
  const weak = or(until(p, q), al(p));
  assert.equal(satisfies(weak, forever), true);
  assert.equal(automatonAccepts(compiled(weak), forever), true);
});

// ----------------------------------------------------------------------------------------------
// 3. The negation self-check
// ----------------------------------------------------------------------------------------------

test("a formula and its negation are exact complements, on both implementations", () => {
  // The empirical Kleene detector. At the word level satisfaction is classical, so this is an
  // equality rather than the model level's pair of implications -- an implementation that quietly
  // treated an undefined case as false on both sides fails it immediately.
  const random = rng(31415);
  const lassos = [...FIXED_LASSOS, ...Array.from({ length: 6 }, () => generateLasso(random))];
  const problems: string[] = [];
  for (let i = 0; i < 400; i += 1) {
    const f = normalizeFormula(generateFormula(random, 1 + Math.floor(random() * 4)));
    const positive = compiled(f);
    const negative = compiled(negate(f));
    for (const l of lassos) {
      if (satisfies(f, l) === satisfies(not(f), l)) {
        problems.push(`relation: ${nnfKey(toNnf(f))} and its negation agree on ${show(l)}`);
      }
      if (automatonAccepts(positive, l) === automatonAccepts(negative, l)) {
        problems.push(
          `construction: A(${nnfKey(toNnf(f))}) and A(not ...) both ` +
          `${automatonAccepts(positive, l) ? "accept" : "reject"} ${show(l)}`);
      }
      if (problems.length >= 5) break;
    }
    if (problems.length >= 5) break;
  }
  assert.deepEqual(problems, []);
});

// ----------------------------------------------------------------------------------------------
// 4. The semantic identities, as property tests
// ----------------------------------------------------------------------------------------------

/**
 * The identities the foundation restates as theorems of the satisfaction relation.
 *
 * No oracle is needed for these: the identity IS the specification. They are driven through BOTH
 * implementations, because they catch different things -- through the relation they check the
 * oracle itself has no corner wrong, and through the construction they check the tableau and the
 * NNF rewrite preserve meaning.
 */
const IDENTITIES: readonly {
  readonly name: string;
  readonly left: (a: Formula, b: Formula) => Formula;
  readonly right: (a: Formula, b: Formula) => Formula;
}[] = [
  { name: "¬F φ ≡ G ¬φ", left: (a) => not(ev(a)), right: (a) => al(not(a)) },
  { name: "¬G φ ≡ F ¬φ", left: (a) => not(al(a)), right: (a) => ev(not(a)) },
  { name: "F F φ ≡ F φ", left: (a) => ev(ev(a)), right: (a) => ev(a) },
  { name: "G G φ ≡ G φ", left: (a) => al(al(a)), right: (a) => al(a) },
  { name: "X (φ ∧ ψ) ≡ X φ ∧ X ψ", left: (a, b) => next(and(a, b)), right: (a, b) => and(next(a), next(b)) },
  { name: "F (φ ∨ ψ) ≡ F φ ∨ F ψ", left: (a, b) => ev(or(a, b)), right: (a, b) => or(ev(a), ev(b)) },
  {
    name: "¬(φ U ψ) ≡ (¬ψ) U (¬φ ∧ ¬ψ) ∨ G ¬ψ",
    left: (a, b) => not(until(a, b)),
    right: (a, b) => or(until(not(b), and(not(a), not(b))), al(not(b))),
  },
];

test("every §9.3 identity holds, through the relation and through the construction", () => {
  const random = rng(2718281);
  const lassos = [...FIXED_LASSOS, ...Array.from({ length: 6 }, () => generateLasso(random))];
  const problems: string[] = [];
  for (const identity of IDENTITIES) {
    for (let i = 0; i < 40; i += 1) {
      const a = normalizeFormula(generateFormula(random, 1 + Math.floor(random() * 3)));
      const b = normalizeFormula(generateFormula(random, 1 + Math.floor(random() * 3)));
      const left = normalizeFormula(identity.left(a, b));
      const right = normalizeFormula(identity.right(a, b));
      const leftAutomaton = compiled(left);
      const rightAutomaton = compiled(right);
      for (const l of lassos) {
        if (satisfies(left, l) !== satisfies(right, l)) {
          problems.push(`relation breaks ${identity.name} at ${nnfKey(toNnf(left))} on ${show(l)}`);
        }
        if (automatonAccepts(leftAutomaton, l) !== automatonAccepts(rightAutomaton, l)) {
          problems.push(
            `construction breaks ${identity.name} at ${nnfKey(toNnf(left))} on ${show(l)}`);
        }
        if (problems.length >= 5) break;
      }
      if (problems.length >= 5) break;
    }
  }
  assert.deepEqual(problems, []);
});

test("φ U ψ implies F ψ -- an implication, not an equivalence", () => {
  const random = rng(161803);
  const lassos = [...FIXED_LASSOS, ...Array.from({ length: 6 }, () => generateLasso(random))];
  let witnessedStrict = false;
  for (let i = 0; i < 120; i += 1) {
    const a = normalizeFormula(generateFormula(random, 1 + Math.floor(random() * 3)));
    const b = normalizeFormula(generateFormula(random, 1 + Math.floor(random() * 3)));
    const strong = normalizeFormula(until(a, b));
    const weaker = normalizeFormula(ev(b));
    const strongAutomaton = compiled(strong);
    const weakerAutomaton = compiled(weaker);
    for (const l of lassos) {
      if (satisfies(strong, l)) {
        assert.ok(satisfies(weaker, l),
          `${nnfKey(toNnf(strong))} holds on ${show(l)} but F ψ does not`);
      }
      if (automatonAccepts(strongAutomaton, l)) {
        assert.ok(automatonAccepts(weakerAutomaton, l),
          `the automaton accepts ${nnfKey(toNnf(strong))} on ${show(l)} but rejects F ψ`);
      }
      if (satisfies(weaker, l) && !satisfies(strong, l)) witnessedStrict = true;
    }
  }
  assert.ok(witnessedStrict,
    "F ψ never held where φ U ψ failed, so the implication was never tested in the only direction " +
    "that distinguishes it from an equivalence");
});

// ----------------------------------------------------------------------------------------------
// 5. Hand-computed fixtures
// ----------------------------------------------------------------------------------------------

/** Assert a verdict on BOTH implementations, so a fixture pins the meaning and not one side of it. */
function pin(f: Formula, l: Lasso, expected: boolean, why: string): void {
  assert.equal(satisfies(f, l), expected, `relation: ${why}`);
  assert.equal(automatonAccepts(compiled(f), l), expected, `construction: ${why}`);
}

test("fixture: the two-state flip-flop pins X indexing, GF and FG", () => {
  // p at the even positions, nothing at the odd ones, forever.
  const flip = lasso([], letters(["p"], []));
  pin(p, flip, true, "p holds at position 0");
  pin(next(p), flip, false, "X p at 0 reads position 1, where p does not hold");
  assert.equal(satisfiesAt(next(p), flip, 1), true, "X p at 1 reads position 0 again -- the wrap");
  pin(al(ev(p)), flip, true, "p recurs forever, so GF p holds");
  pin(ev(al(p)), flip, false, "p fails infinitely often, so FG p is refuted");
  pin(al(p), flip, false, "p does not hold at position 1");
});

test("fixture: a terminal state stutters, so X φ is φ there and F ψ after the halt is ψ at the halt", () => {
  // The shape a dead end produces: a prefix that walks into a single-letter cycle. `req` holds at
  // the halt and `resp` never does -- the counterexample the foundation describes as "the system
  // halts here".
  const halted = lasso(letters([]), letters(["req"]));
  const req = atom("req");
  const resp = atom("resp");
  pin(ev(req), halted, true, "the halt satisfies req, so F req holds");
  pin(ev(resp), halted, false, "resp holds nowhere, so F resp is refuted");
  // X φ ⟺ φ at the stuttering position, because the successor is the same letter.
  for (const f of [req, resp, and(req, resp)]) {
    assert.equal(satisfiesAt(next(f), halted, 1), satisfiesAt(f, halted, 1),
      "X φ and φ differ at a stuttering position");
  }
  // And a response property is refuted by a trace that HALTS in a request state, just as surely as
  // by one that cycles away.
  pin(al({ kind: "implies", left: req, right: ev(resp) }), halted, false,
    "G(req -> F resp) must be refuted by a halt in a req state");
});

test("fixture: a dead end satisfying t refutes F G not-t", () => {
  // The word-level half of the §9.1 deadend row. The model-level half -- that `repeatable-cycle t`
  // is REFUTED on the same machine, the one sanctioned divergence between the stutter-closed trace
  // domain and the un-closed configuration graph -- needs the product walk and is the next phase's.
  const t = atom("t");
  const halt = lasso(letters([]), letters(["t"]));
  pin(ev(al(not(t))), halt, false, "the trace ends stuttering in t, so FG not-t is refuted");
  pin(al(ev(t)), halt, true, "the stutter visits t infinitely often");
});

test("fixture: an unreachable state makes G not-at(s) hold, and every implication over it vacuous", () => {
  const atS = atom("at_s");
  const never = lasso(letters(["p"], ["q"]), letters(["p"]));
  pin(al(not(atS)), never, true, "at_s holds nowhere");
  for (const consequent of [p, not(p), ev(q), al(q), { kind: "const", value: false } as Formula]) {
    pin(al({ kind: "implies", left: atS, right: consequent }), never, true,
      "an implication whose antecedent never occurs is vacuously true");
  }
  // Which is exactly why the verdict needs a vacuity disclosure -- `holds` here says nothing about
  // the consequent. Producing that disclosure is the verdict mapping's job, in the next phase.
});

test("fixture: an atom true nowhere refutes F of it, with the whole trace as the witness", () => {
  const dead = atom("dead_atom");
  for (const l of FIXED_LASSOS) {
    if (l.prefix.some((s) => s.has("dead_atom")) || l.cycle.some((s) => s.has("dead_atom"))) continue;
    pin(ev(dead), l, false, `F dead_atom must be refuted on ${show(l)}`);
  }
});

test("fixture: a pure-safety formula has no acceptance sets, and the emptiness logic still decides it", () => {
  const safety = compiled(al(p));
  assert.equal(safety.size.acceptanceSets, 0,
    "G p compiled with an acceptance set, so the zero-set case is not being exercised");
  // "Every nontrivial SCC accepts" when the family is empty -- so the answer turns entirely on the
  // labels, and both directions must work.
  assert.equal(automatonAccepts(safety, lasso([], letters(["p"]))), true);
  assert.equal(automatonAccepts(safety, lasso([], letters(["p"], []))), false);
  assert.equal(automatonAccepts(safety, lasso(letters([]), letters(["p"]))), false);
});

test("fixture: a cycle satisfying no atom at all, where every F is refuted and every G of a negation holds", () => {
  const empty = lasso([], letters([]));
  for (const a of [p, q, r]) {
    pin(ev(a), empty, false, "nothing ever holds");
    pin(al(not(a)), empty, true, "nothing ever holds");
    pin(until(a, a), empty, false, "a strong until on a never-true atom is refuted");
  }
  pin(al({ kind: "const", value: true }), empty, true, "G true holds on any trace");
  pin(ev({ kind: "const", value: false }), empty, false, "F false is refuted on any trace");
});

test("fixture: a lasso cannot have an empty cycle, because an LTL trace is infinite", () => {
  const r = makeLasso(letters(["p"]), []);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.refusal, /cycle cannot be empty/);
});

test("fixture: the parsed surface and the hand-built tree compile to the same automaton", () => {
  // Guards the seam between the two halves of this phase: the fixtures above build formulas
  // directly, so a parser that mis-associated `until` would be invisible to them.
  const text = parseFormula("always (p: 1 implies eventually q: 1)");
  assert.ok(text.ok, text.ok ? "" : text.refusal);
  const byParser = normalizeFormula(text.value.formula);
  const byHand = al({ kind: "implies", left: atom("p eq 1"), right: ev(atom("q eq 1")) });
  assert.equal(nnfKey(toNnf(byParser)), nnfKey(toNnf(byHand)));
  const random = rng(99);
  for (let i = 0; i < 40; i += 1) {
    const l = generateLasso(random);
    assert.equal(satisfies(byParser, l), satisfies(byHand, l));
  }
});
