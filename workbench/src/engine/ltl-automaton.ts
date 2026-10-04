/**
 * LTL to a generalized Büchi automaton: the negation-normal-form rewrite and the GPVW tableau.
 *
 * The construction named and cited by the foundation: R. Gerth, D. Peled, M. Y. Vardi and
 * P. Wolper, *"Simple on-the-fly automatic verification of linear temporal logic"*, PSTV 1995,
 * with Baier & Katoen §5.2 and Clarke–Grumberg–Peled ch. 9 as the texts to review it against. The
 * automata-theoretic frame is Vardi & Wolper, LICS 1986.
 *
 * The algorithm in the foundation's own paragraph: "rewrite ¬φ to negation normal form (negations
 * pushed to atoms, using the U-duality of §3.3 and the release operator R internally); tableau
 * nodes are sets of subformulas obliged on the current suffix; a node expands by the expansion
 * laws `φ U ψ ≡ ψ ∨ (φ ∧ X(φ U ψ))` and `φ R ψ ≡ ψ ∧ (φ ∨ X(φ R ψ))` until only atoms and
 * X-obligations remain; X-obligations become the successor node. Acceptance: one set F_i per Until
 * subformula φᵢ U ψᵢ, containing the nodes where the until is discharged (ψᵢ obliged or the until
 * not obliged) — this is what stops a run promising `F ψ` forever without delivering."
 *
 * Note which formula is compiled. The verdict path compiles **¬φ** and asks whether the product is
 * empty; this module compiles whatever formula it is handed, so the caller decides. `buildGnba`
 * takes the formula; `negate` is the one-line wrapper a later phase will use.
 *
 * ## R is internal, and the type system is what holds that
 *
 * `Nnf` has a `release` arm; `Formula` — the student surface in `ltl.ts` — does not, and no
 * function here returns a `Formula`. So release cannot reach a parser, a `describe` or a result
 * payload: there is no conversion back. The automaton's state labels are literals over atom keys,
 * never temporal operators, so nothing downstream of the construction can see it either.
 *
 * ## Three things this module deliberately does NOT do
 *
 * **No degeneralization.** The multiple acceptance sets are kept and handed to the emptiness check
 * directly — "one less transformation to verify". The counter construction stays the documented
 * fallback and is not implemented.
 *
 * **No product.** Nothing here reads a model, a configuration or the step relation. The product
 * walk over (configuration, automaton-node) pairs, the stutter-closure at dead ends, the SCC
 * emptiness check and the verdict mapping are the next phase, and the state limit this module
 * honours is its OWN (`MAX_TABLEAU_NODES`), not the explorer's product budget.
 *
 * **No minimization.** Two tableau nodes with mutually exclusive labels — `m.state eq a` and
 * `m.state eq b` — are not detected as contradictory, because the literal-consistency check is
 * syntactic: it fires on `p` against `not p` and on nothing else. That costs automaton states and
 * costs no correctness; a state no letter can satisfy contributes no run.
 */
import { fail, ok, type Res } from "./types.ts";
import type { Formula } from "./ltl.ts";

// ----------------------------------------------------------------------------------------------
// Negation normal form
// ----------------------------------------------------------------------------------------------

/**
 * Negation normal form: negations sit on atoms, and the temporal operators are `next`, `until` and
 * `release`.
 *
 * `eventually` and `always` are gone by construction — the grammar calls them sugar
 * (`F φ ≡ true U φ`, `G φ ≡ ¬F ¬φ`) and the expansion laws are written for U and R only, so they
 * must be rewritten rather than given a third and fourth law. `implies` is gone for the same
 * reason (`φ → ψ ≡ ¬φ ∨ ψ`).
 */
export type Nnf =
  | { readonly kind: "const"; readonly value: boolean }
  | { readonly kind: "lit"; readonly atom: string; readonly negated: boolean }
  | { readonly kind: "next"; readonly operand: Nnf }
  | { readonly kind: "and"; readonly left: Nnf; readonly right: Nnf }
  | { readonly kind: "or"; readonly left: Nnf; readonly right: Nnf }
  | { readonly kind: "until"; readonly left: Nnf; readonly right: Nnf }
  | { readonly kind: "release"; readonly left: Nnf; readonly right: Nnf };

/**
 * Rewrite to negation normal form, pushing a pending negation inward.
 *
 * Every arm is one of the identities the foundation restates as theorems of the satisfaction
 * relation: `¬X φ ≡ X ¬φ`, `¬F φ ≡ G ¬φ`, `¬G φ ≡ F ¬φ`, and the U-duality
 * `¬(φ U ψ) ≡ (¬φ) R (¬ψ)` — which is the release operator's definition read backwards, since
 * `φ R ψ ≡ ¬(¬φ U ¬ψ)`.
 *
 * `negated` is carried as a parameter rather than applied as a second pass, so no intermediate
 * tree with a `not` node over a temporal operator ever exists.
 */
export function toNnf(formula: Formula, negated = false): Nnf {
  switch (formula.kind) {
    case "const":
      return { kind: "const", value: negated ? !formula.value : formula.value };
    case "atom":
      return { kind: "lit", atom: formula.key, negated };
    case "not":
      return toNnf(formula.operand, !negated);
    case "next":
      // ¬X φ ≡ X ¬φ — X is self-dual, so the negation passes straight through.
      return { kind: "next", operand: toNnf(formula.operand, negated) };
    case "and":
      return negated
        ? { kind: "or", left: toNnf(formula.left, true), right: toNnf(formula.right, true) }
        : { kind: "and", left: toNnf(formula.left, false), right: toNnf(formula.right, false) };
    case "or":
      return negated
        ? { kind: "and", left: toNnf(formula.left, true), right: toNnf(formula.right, true) }
        : { kind: "or", left: toNnf(formula.left, false), right: toNnf(formula.right, false) };
    case "implies":
      // φ → ψ ≡ ¬φ ∨ ψ, so ¬(φ → ψ) ≡ φ ∧ ¬ψ.
      return negated
        ? { kind: "and", left: toNnf(formula.left, false), right: toNnf(formula.right, true) }
        : { kind: "or", left: toNnf(formula.left, true), right: toNnf(formula.right, false) };
    case "eventually":
      // F φ ≡ true U φ; ¬F φ ≡ G ¬φ ≡ false R ¬φ.
      return negated
        ? { kind: "release", left: { kind: "const", value: false }, right: toNnf(formula.operand, true) }
        : { kind: "until", left: { kind: "const", value: true }, right: toNnf(formula.operand, false) };
    case "always":
      // G φ ≡ false R φ; ¬G φ ≡ F ¬φ ≡ true U ¬φ.
      return negated
        ? { kind: "until", left: { kind: "const", value: true }, right: toNnf(formula.operand, true) }
        : { kind: "release", left: { kind: "const", value: false }, right: toNnf(formula.operand, false) };
    case "until":
      // ¬(φ U ψ) ≡ (¬φ) R (¬ψ).
      return negated
        ? { kind: "release", left: toNnf(formula.left, true), right: toNnf(formula.right, true) }
        : { kind: "until", left: toNnf(formula.left, false), right: toNnf(formula.right, false) };
  }
}

/**
 * A formula's canonical text, which is its identity inside the tableau.
 *
 * The tableau's node-merging step asks whether two nodes carry the same Old and Next SETS, and the
 * literal-consistency check asks whether a literal's negation is already obliged. Both are set
 * membership over formulas, so formulas need a key. Atom keys are already canonical (`atomKey` in
 * `ltl.ts`) and are bracketed here so an atom containing an operator word cannot forge a shape.
 */
export function nnfKey(f: Nnf): string {
  switch (f.kind) {
    case "const": return f.value ? "#true" : "#false";
    case "lit": return `${f.negated ? "!" : ""}[${f.atom}]`;
    case "next": return `X(${nnfKey(f.operand)})`;
    case "and": return `(${nnfKey(f.left)} & ${nnfKey(f.right)})`;
    case "or": return `(${nnfKey(f.left)} | ${nnfKey(f.right)})`;
    case "until": return `(${nnfKey(f.left)} U ${nnfKey(f.right)})`;
    case "release": return `(${nnfKey(f.left)} R ${nnfKey(f.right)})`;
  }
}

/** The Until arm, named so the acceptance sets can read `right` without re-narrowing. */
export type NnfUntil = Extract<Nnf, { kind: "until" }>;

/** Every Until subformula, deduplicated — one acceptance set each. */
export function untilSubformulas(f: Nnf): readonly NnfUntil[] {
  const found = new Map<string, NnfUntil>();
  const walk = (node: Nnf): void => {
    switch (node.kind) {
      case "const":
      case "lit":
        return;
      case "next":
        walk(node.operand);
        return;
      case "until":
        found.set(nnfKey(node), node);
        walk(node.left);
        walk(node.right);
        return;
      case "and":
      case "or":
      case "release":
        walk(node.left);
        walk(node.right);
        return;
    }
  };
  walk(f);
  return [...found.values()];
}

// ----------------------------------------------------------------------------------------------
// The automaton
// ----------------------------------------------------------------------------------------------

/** A label constraint on one atomic proposition. `negated` means the atom must NOT hold. */
export interface GnbaLiteral {
  readonly atom: string;
  readonly negated: boolean;
}

/**
 * One tableau node, as an automaton state.
 *
 * State-labeled, following GPVW: a run q₀ q₁ … over a word w₀ w₁ … requires wⱼ to satisfy every
 * literal of `label(qⱼ)`. `obliged` is the node's Old set, kept because the acceptance sets are
 * defined over it and a reader auditing the construction against the published pseudocode needs to
 * see it.
 */
export interface GnbaState {
  readonly id: number;
  readonly label: readonly GnbaLiteral[];
  readonly next: readonly number[];
  readonly obliged: readonly string[];
}

export interface GnbaSize {
  readonly states: number;
  readonly transitions: number;
  readonly acceptanceSets: number;
}

/**
 * A generalized Büchi automaton: a run accepts iff it visits EVERY acceptance set infinitely often.
 *
 * Generalized, not degeneralized. `acceptance` is empty for a pure-safety formula — `always p`
 * compiles with no Until subformula — and an empty family is satisfied by every run, so the
 * emptiness check's condition "a nontrivial reachable component meeting every acceptance set"
 * needs no special case for it.
 */
export interface Gnba {
  readonly states: readonly GnbaState[];
  readonly initial: readonly number[];
  readonly acceptance: readonly (readonly number[])[];
  /** The Until subformula each acceptance set pins, by canonical key. Diagnostics only. */
  readonly pinnedBy: readonly string[];
  readonly size: GnbaSize;
}

/**
 * The tableau's own node ceiling.
 *
 * NOT the explorer's product budget: the automaton is exponential in the formula in the worst case
 * and the formulas this ships for have single-digit state counts, so a ceiling here exists to turn
 * a pathological formula into a refusal a caller can read instead of a hung Worker. The product
 * walk's limit, counted in product states, belongs to the phase that builds the product.
 *
 * `buildGnba` takes it as an argument defaulting to this constant, so the refusal path is testable
 * in milliseconds instead of by constructing a formula large enough to reach 20,000 nodes — a test
 * that costs a second and tells you nothing the small one does not.
 */
export const MAX_TABLEAU_NODES = 20000;

/** `not φ`, for the caller that compiles the negation and asks whether the product is empty. */
export const negate = (formula: Formula): Formula => ({ kind: "not", operand: formula });

/**
 * A node still being expanded: GPVW's ⟨Incoming, New, Old, Next⟩.
 *
 * Named for the state it is in rather than for the pseudocode's `Node`, and NOT for the
 * partially-filled shape it is, because that name is taken by a TypeScript utility type.
 */
interface Expanding {
  readonly incoming: readonly number[];
  readonly fresh: ReadonlyMap<string, Nnf>;
  readonly obliged: ReadonlyMap<string, Nnf>;
  readonly deferred: ReadonlyMap<string, Nnf>;
}

/** A node whose New set emptied: it has an identity (Old, Next) and an id. */
interface Settled {
  readonly id: number;
  readonly obliged: ReadonlyMap<string, Nnf>;
  readonly deferred: ReadonlyMap<string, Nnf>;
  readonly incoming: Set<number>;
}

/** The marker for "an initial state", standing in for GPVW's `init` name. */
const INIT = -1;

const withEntry = (
  base: ReadonlyMap<string, Nnf>, add: readonly Nnf[],
): ReadonlyMap<string, Nnf> => {
  const out = new Map(base);
  for (const f of add) out.set(nnfKey(f), f);
  return out;
};

const withoutEntry = (base: ReadonlyMap<string, Nnf>, drop: string): ReadonlyMap<string, Nnf> => {
  const out = new Map(base);
  out.delete(drop);
  return out;
};

/** New ∪ (added \ Old) — the pseudocode's guard against re-obliging what is already discharged. */
const addFresh = (
  fresh: ReadonlyMap<string, Nnf>, obliged: ReadonlyMap<string, Nnf>, add: readonly Nnf[],
): ReadonlyMap<string, Nnf> => withEntry(fresh, add.filter((f) => !obliged.has(nnfKey(f))));

const identity = (n: Expanding | Settled): string =>
  `${[...n.obliged.keys()].sort().join(",")}||${[...n.deferred.keys()].sort().join(",")}`;

const negatedKey = (f: Nnf): string | null =>
  f.kind === "lit" ? nnfKey({ kind: "lit", atom: f.atom, negated: !f.negated }) : null;

/**
 * Build the generalized Büchi automaton for a formula.
 *
 * The loop is GPVW's `expand`, with the recursion turned into an explicit worklist: a split pushes
 * two partial nodes instead of recursing twice, so a formula that splits deeply cannot exhaust the
 * call stack. The ORDER of expansion does not affect the result — the node set is closed under the
 * expansion laws either way — which is why a worklist is a faithful rendering rather than a
 * variant algorithm.
 */
export function buildGnba(formula: Formula, limit: number = MAX_TABLEAU_NODES): Res<Gnba> {
  const root = toNnf(formula);
  const settled = new Map<string, Settled>();
  const work: Expanding[] = [{
    incoming: [INIT],
    fresh: withEntry(new Map(), [root]),
    obliged: new Map(),
    deferred: new Map(),
  }];
  let nextId = 0;

  while (work.length > 0) {
    const node = work.pop();
    if (node === undefined) break;

    const pending = node.fresh.entries().next();
    if (pending.done === true) {
      // Fully expanded: merge into an existing node with the same (Old, Next), or admit it and
      // queue its successor, whose New set is this node's Next set.
      const key = identity(node);
      const existing = settled.get(key);
      if (existing !== undefined) {
        for (const from of node.incoming) existing.incoming.add(from);
        continue;
      }
      if (settled.size >= limit) {
        return fail(
          `this formula's tableau exceeds ${limit} nodes. The construction is exponential in the ` +
          `formula in the worst case; shorten it or split it into two questions.`);
      }
      const id = nextId;
      nextId += 1;
      settled.set(key, {
        id, obliged: node.obliged, deferred: node.deferred, incoming: new Set(node.incoming),
      });
      work.push({ incoming: [id], fresh: node.deferred, obliged: new Map(), deferred: new Map() });
      continue;
    }

    const [key, eta] = pending.value;
    const fresh = withoutEntry(node.fresh, key);
    const obliged = withEntry(node.obliged, [eta]);

    if (eta.kind === "const") {
      // `false` cannot be discharged: the branch denotes no suffix at all, so it is dropped.
      // `true` is discharged by obliging nothing.
      if (!eta.value) continue;
      work.push({ incoming: node.incoming, fresh, obliged, deferred: node.deferred });
      continue;
    }

    if (eta.kind === "lit") {
      // A literal and its negation in one node is a contradiction, and this is the ONLY
      // consistency rule: mutually exclusive atoms over the same reference are not detected.
      const opposite = negatedKey(eta);
      if (opposite !== null && node.obliged.has(opposite)) continue;
      work.push({ incoming: node.incoming, fresh, obliged, deferred: node.deferred });
      continue;
    }

    if (eta.kind === "next") {
      // X μ obliges nothing now and μ on the successor.
      work.push({
        incoming: node.incoming,
        fresh,
        obliged,
        deferred: withEntry(node.deferred, [eta.operand]),
      });
      continue;
    }

    if (eta.kind === "and") {
      work.push({
        incoming: node.incoming,
        fresh: addFresh(fresh, obliged, [eta.left, eta.right]),
        obliged,
        deferred: node.deferred,
      });
      continue;
    }

    // The three splitting cases, from the expansion laws:
    //   μ ∨ ψ  ≡  μ  ∨  ψ
    //   μ U ψ  ≡  ψ  ∨  (μ ∧ X(μ U ψ))
    //   μ R ψ  ≡  (ψ ∧ μ)  ∨  (ψ ∧ X(μ R ψ))
    // Branch 1 keeps the obligation alive on the successor; branch 2 discharges it here.
    const branch1: readonly Nnf[] = eta.kind === "release" ? [eta.right] : [eta.left];
    const deferred1 = eta.kind === "or" ? node.deferred : withEntry(node.deferred, [eta]);
    const branch2: readonly Nnf[] = eta.kind === "release" ? [eta.left, eta.right] : [eta.right];
    work.push({
      incoming: node.incoming,
      fresh: addFresh(fresh, obliged, branch1),
      obliged,
      deferred: deferred1,
    });
    work.push({
      incoming: node.incoming,
      fresh: addFresh(fresh, obliged, branch2),
      obliged,
      deferred: node.deferred,
    });
  }

  return ok(assemble(root, [...settled.values()]));
}

/**
 * Turn the expanded tableau into the automaton: outgoing edges from the Incoming sets, labels from
 * the literals a node obliges, and one acceptance set per Until subformula.
 */
function assemble(root: Nnf, nodes: readonly Settled[]): Gnba {
  const byId = [...nodes].sort((a, b) => a.id - b.id);
  const successors = new Map<number, number[]>();
  const initial: number[] = [];
  for (const node of byId) {
    for (const from of node.incoming) {
      if (from === INIT) { initial.push(node.id); continue; }
      const list = successors.get(from);
      if (list === undefined) successors.set(from, [node.id]);
      else list.push(node.id);
    }
  }

  const states: GnbaState[] = byId.map((node) => {
    const label: GnbaLiteral[] = [];
    for (const f of node.obliged.values()) {
      if (f.kind === "lit") label.push({ atom: f.atom, negated: f.negated });
    }
    return {
      id: node.id,
      label,
      next: successors.get(node.id) ?? [],
      obliged: [...node.obliged.keys()].sort(),
    };
  });

  // F_i = { q : the until is not obliged at q, or its right side is }. A run that keeps promising
  // `U ψ` without ever obliging ψ leaves this set from some point on and is rejected.
  const untils = untilSubformulas(root);
  const acceptance = untils.map((u) => {
    const uKey = nnfKey(u);
    const rightKey = nnfKey(u.right);
    return states
      .filter((q) => !q.obliged.includes(uKey) || q.obliged.includes(rightKey))
      .map((q) => q.id);
  });

  const transitions = states.reduce((n, q) => n + q.next.length, 0);
  return {
    states,
    initial,
    acceptance,
    pinnedBy: untils.map(nnfKey),
    size: { states: states.length, transitions, acceptanceSets: acceptance.length },
  };
}

/** Whether a letter — the set of atom keys true at a position — satisfies a state's label. */
export function labelHolds(state: GnbaState, letter: ReadonlySet<string>): boolean {
  for (const lit of state.label) {
    if (letter.has(lit.atom) === lit.negated) return false;
  }
  return true;
}
