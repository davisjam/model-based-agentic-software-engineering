// The LTL formula surface: parsed, resolved against a system, normalized.
//
// Three things this file pins, in the order the admission sequence performs them.
//
//   1. **The grammar, including the tier the foundation leaves ambiguous.** Unary binds tightest,
//      `until` is right-associative and binds tighter than the boolean connectives, and an
//      unparenthesized MIX of two boolean connectives is refused rather than resolved by guess.
//      The last is a deliberate narrowing of the written grammar and it is asserted here so the
//      decision is visible rather than buried — when the ranking is ruled, this test is where the
//      ruling lands.
//   2. **Atom resolution is the shipped one.** An unknown reference, a value outside a declared
//      domain and an order comparison on an unordered reference all REFUSE, because they already
//      refuse for `reach` and `invariant` and a second predicate evaluator would be the one-
//      denotation violation the spec forbids. The positive half matters as much: a resolved atom's
//      compiled function must agree with `compilePredicate` on an actual configuration, or the
//      formula layer has quietly grown its own semantics.
//   3. **The release operator cannot reach a reader.** It exists inside the tableau's negation
//      normal form and nowhere else, so `describeFormula` has no case for it and the automaton's
//      state labels carry only atom keys.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  atomKey, compileFormula, describeFormula, formulaAtoms, normalizeFormula, parseFormula,
  resolveFormula, type Formula,
} from "../src/engine/ltl.ts";
import { buildGnba } from "../src/engine/ltl-automaton.ts";
import { compilePredicate } from "../src/engine/predicate.ts";
import { buildScope } from "../src/engine/refs.ts";
import type { Configuration } from "../src/ir/types.ts";
import { build } from "./engine-fixtures.ts";

/** The transaction machine the foundation's P5 formula is written against, reduced to one machine. */
const transactions = () => build({
  machines: {
    txn: {
      initial: "idle",
      states: { idle: null, based: null, committed: null, refused: null },
      variables: { retries: { type: "integer", range: [0, 3], initial: 0 } },
      transitions: [
        { from: "idle", to: "based", label: "capture_base" },
        { from: "based", to: "committed", label: "commit" },
        { from: "based", to: "refused", label: "refuse" },
      ],
    },
  },
});

const scope = () => buildScope(transactions());

/** A formula's shape as a bracketed string, so a precedence assertion reads as the parse tree. */
function shape(f: Formula): string {
  switch (f.kind) {
    case "const": return f.value ? "true" : "false";
    case "atom": return f.key;
    case "not": return `not(${shape(f.operand)})`;
    case "next": return `X(${shape(f.operand)})`;
    case "eventually": return `F(${shape(f.operand)})`;
    case "always": return `G(${shape(f.operand)})`;
    case "and": return `and(${shape(f.left)}, ${shape(f.right)})`;
    case "or": return `or(${shape(f.left)}, ${shape(f.right)})`;
    case "implies": return `implies(${shape(f.left)}, ${shape(f.right)})`;
    case "until": return `until(${shape(f.left)}, ${shape(f.right)})`;
  }
}

const parsed = (text: string): Formula => {
  const r = parseFormula(text);
  assert.ok(r.ok, `expected '${text}' to parse: ${r.ok ? "" : r.refusal}`);
  return r.value.formula;
};

const refused = (text: string): string => {
  const r = parseFormula(text);
  assert.equal(r.ok, false, `expected '${text}' to be refused, and it parsed`);
  return r.ok ? "" : r.refusal;
};

// ----------------------------------------------------------------------------------------------
// 1. The grammar
// ----------------------------------------------------------------------------------------------

test("an atom is a reference and a value, in either the colon or the comparison spelling", () => {
  assert.equal(shape(parsed("txn.state: based")), "txn.state eq 'based'");
  assert.equal(shape(parsed("retries >= 2")), "retries ge 2");
  assert.equal(shape(parsed("retries != 0")), "retries ne 0");
  // `true` on the right is the boolean, not the string -- the same order expr.ts reads literals in.
  assert.equal(shape(parsed("flag: true")), "flag eq true");
});

test("unary connectives bind tightest", () => {
  assert.equal(shape(parsed("not a: 1 and b: 1")), "and(not(a eq 1), b eq 1)");
  assert.equal(shape(parsed("eventually a: 1 until b: 1")), "until(F(a eq 1), b eq 1)");
  assert.equal(shape(parsed("always next a: 1")), "G(X(a eq 1))");
});

test("until binds tighter than the boolean tier and associates to the right", () => {
  assert.equal(shape(parsed("a: 1 until b: 1 until c: 1")),
    "until(a eq 1, until(b eq 1, c eq 1))");
  assert.equal(shape(parsed("a: 1 until b: 1 and c: 1")),
    "and(until(a eq 1, b eq 1), c eq 1)");
});

test("implies associates to the right, so the antecedent chain reads as a student expects", () => {
  assert.equal(shape(parsed("a: 1 implies b: 1 implies c: 1")),
    "implies(a eq 1, implies(b eq 1, c eq 1))");
});

test("one connective repeated is fine; two mixed at one level is REFUSED, with the fix named", () => {
  assert.equal(shape(parsed("a: 1 and b: 1 and c: 1")), "and(a eq 1, and(b eq 1, c eq 1))");
  const why = refused("a: 1 and b: 1 or c: 1");
  assert.match(why, /more than one reading/);
  assert.match(why, /Parenthesize/);
  // Parenthesizing settles it, both ways.
  assert.equal(shape(parsed("(a: 1 and b: 1) or c: 1")), "or(and(a eq 1, b eq 1), c eq 1)");
  assert.equal(shape(parsed("a: 1 and (b: 1 or c: 1)")), "and(a eq 1, or(b eq 1, c eq 1))");
});

test("the parse refusals name the cause rather than failing as a type error", () => {
  assert.match(refused(""), /empty formula/);
  assert.match(refused("(a: 1"), /never closed/);
  assert.match(refused("a: 1)"), /left over/);
  assert.match(refused("a: 1 and"), /ended where an atom/);
  assert.match(refused("txn.state"), /bare reference/);
  assert.match(refused("and a: 1"), /is a connective/);
  assert.match(refused("a: 1 & b: 1"), /not part of the formula grammar/);
});

// ----------------------------------------------------------------------------------------------
// 2. Resolution against the system vocabulary
// ----------------------------------------------------------------------------------------------

test("a resolved atom's compiled function is the shipped predicate's, on a real configuration", () => {
  const compiled = compileFormula(scope(), "txn.state: based");
  assert.ok(compiled.ok, compiled.ok ? "" : compiled.refusal);
  const binding = compiled.value.atoms.get("txn.state eq 'based'");
  assert.ok(binding !== undefined, `atoms were ${[...compiled.value.atoms.keys()].join(" | ")}`);

  const direct = compilePredicate(scope(), { kind: "atoms", atoms: [{ ref: "txn.state", op: "eq", value: "based" }] });
  assert.ok(direct.ok, direct.ok ? "" : direct.refusal);

  const cfg = (state: string): Configuration =>
    ({ control: new Map([["txn", state]]), values: new Map() });
  for (const state of ["idle", "based", "committed", "refused"]) {
    assert.equal(binding.holds(cfg(state)), direct.value(cfg(state)),
      `the LTL atom and compilePredicate disagree on txn.state = ${state}`);
  }
  assert.equal(binding.described, "txn.state is based");
});

test("the three admission steps are separately callable, and compose to the same thing", () => {
  // parse -> resolve -> normalize, the sequence the delta list specifies. Each step is its own
  // function because the refusals come from different places: a malformed formula is the parser's,
  // an unresolvable atom is `compilePredicate`'s, and normalization cannot fail at all.
  const text = "not not (txn.state: based implies eventually txn.state: committed)";
  const step1 = parseFormula(text);
  assert.ok(step1.ok, step1.ok ? "" : step1.refusal);
  const step2 = resolveFormula(scope(), step1.value);
  assert.ok(step2.ok, step2.ok ? "" : step2.refusal);
  const step3 = normalizeFormula(step2.value.formula);

  const once = compileFormula(scope(), text);
  assert.ok(once.ok, once.ok ? "" : once.refusal);
  assert.equal(shape(once.value.formula), shape(step3));
  assert.deepEqual([...once.value.atoms.keys()], [...step2.value.atoms.keys()]);
  // And the double negation is gone only after step 3.
  assert.match(shape(step2.value.formula), /^not\(not\(/);
  assert.match(shape(step3), /^implies\(/);
});

test("an unknown reference is refused before any trace exists, not folded in as false", () => {
  const r = compileFormula(scope(), "always (ledger.state: posted)");
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.refusal, /cannot be resolved/);
  assert.match(r.refusal, /names nothing in this system/);
  assert.equal(r.detail?.reason, "unknown-vocabulary");
});

test("a value outside the declared domain refuses, so a typo cannot read as a sound 'refuted'", () => {
  const r = compileFormula(scope(), "eventually txn.state: commited");
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.refusal, /is not a declared state of 'txn.state'/);
});

test("an order comparison on an unordered reference refuses, inheriting V20", () => {
  const r = compileFormula(scope(), "txn.state > based");
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.refusal, /no declared ordering/);
});

test("every atom resolves or the whole formula refuses -- there is no partial admission", () => {
  const r = compileFormula(scope(), "txn.state: based implies eventually missing.state: x");
  assert.equal(r.ok, false);
});

// ----------------------------------------------------------------------------------------------
// 3. Normalization
// ----------------------------------------------------------------------------------------------

test("the same predicate written twice is ONE atomic proposition", () => {
  const r = parseFormula("txn.state: based implies eventually txn.state: based");
  assert.ok(r.ok, r.ok ? "" : r.refusal);
  assert.deepEqual([...r.value.atoms.keys()], ["txn.state eq 'based'"]);
  assert.deepEqual(formulaAtoms(r.value.formula), ["txn.state eq 'based'"]);
});

test("an atom key separates a string value from the boolean of the same spelling", () => {
  const asString = atomKey({ kind: "atoms", atoms: [{ ref: "r", op: "eq", value: "true" }] });
  const asBoolean = atomKey({ kind: "atoms", atoms: [{ ref: "r", op: "eq", value: true }] });
  assert.notEqual(asString, asBoolean,
    "the string 'true' and the boolean true would be merged into one atomic proposition");
});

test("double negation collapses and a negated constant folds", () => {
  assert.equal(shape(normalizeFormula(parsed("not not a: 1"))), "a eq 1");
  assert.equal(shape(normalizeFormula(parsed("not not not a: 1"))), "not(a eq 1)");
  assert.equal(shape(normalizeFormula({ kind: "not", operand: { kind: "const", value: true } })), "false");
});

test("normalization does NOT fold implies, eventually or always -- the oracle needs them", () => {
  // Folding either here would apply the rewrite to the satisfaction relation and to the automaton
  // equally, which is exactly how a wrong rewrite becomes invisible to a differential check.
  assert.equal(shape(normalizeFormula(parsed("a: 1 implies b: 1"))), "implies(a eq 1, b eq 1)");
  assert.equal(shape(normalizeFormula(parsed("eventually a: 1"))), "F(a eq 1)");
  assert.equal(shape(normalizeFormula(parsed("always a: 1"))), "G(a eq 1)");
});

// ----------------------------------------------------------------------------------------------
// 4. The release operator stays inside the tableau
// ----------------------------------------------------------------------------------------------

test("no describe() output mentions release, on the formulas whose NNF is full of it", () => {
  const texts = [
    "not (txn.state: based until txn.state: committed)",
    "always (txn.state: based implies eventually txn.state: committed)",
    "not eventually always txn.state: refused",
    "not (always txn.state: idle)",
  ];
  for (const text of texts) {
    const r = compileFormula(scope(), text);
    assert.ok(r.ok, r.ok ? "" : r.refusal);
    const prose = describeFormula(r.value.formula, r.value.atoms);
    assert.doesNotMatch(prose, /release/i, `'${text}' leaked the release operator: ${prose}`);
    assert.doesNotMatch(prose, /(^| )R( |$)/, `'${text}' leaked an R: ${prose}`);
    assert.match(prose, /txn\.state is/, `'${text}' lost its atoms: ${prose}`);
  }
});

test("an automaton's state labels carry only the formula's own atom keys", () => {
  const r = compileFormula(scope(), "not (txn.state: based until txn.state: committed)");
  assert.ok(r.ok, r.ok ? "" : r.refusal);
  const automaton = buildGnba(r.value.formula);
  assert.ok(automaton.ok, automaton.ok ? "" : automaton.refusal);
  const declared = new Set(formulaAtoms(r.value.formula));
  for (const state of automaton.value.states) {
    for (const lit of state.label) {
      assert.ok(declared.has(lit.atom),
        `state ${state.id} constrains '${lit.atom}', which is not one of the formula's atoms`);
    }
  }
});

test("the describe of a negated until still reads as the student's own words", () => {
  const r = compileFormula(scope(), "not (txn.state: based until txn.state: committed)");
  assert.ok(r.ok, r.ok ? "" : r.refusal);
  assert.equal(describeFormula(r.value.formula, r.value.atoms),
    "not (txn.state is based until txn.state is committed)");
});
