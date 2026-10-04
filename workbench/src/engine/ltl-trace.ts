/**
 * The satisfaction relation, evaluated directly on an explicit lasso — and the same lasso run
 * through an automaton, so the two can be required to agree.
 *
 * **Why this module exists.** An automaton is not checkable by reading it. The tableau in
 * `ltl-automaton.ts` is a few hundred lines whose output is a state graph with acceptance sets, and
 * nobody — reviewer or author — can look at that graph and see whether it means the formula. So
 * this module holds a second implementation of the SAME question, built to be correct by
 * inspection rather than fast or general: given a formula and a finite lasso, decide `π ⊨ φ` by
 * induction on the formula, straight off the foundation's satisfaction table. Then
 * `test/ltl-oracle.test.ts` generates (formula, lasso) pairs and requires `satisfies` and
 * `automatonAccepts` to return the same answer on every one.
 *
 * That differential check is stronger than the semantic identities, which constrain the
 * construction without pinning it to a meaning, and it covers every formula rather than only the
 * ones that overlap a shipped behavior form.
 *
 * ## The trace domain here is a WORD, not a model
 *
 * A lasso is a prefix of letters plus a non-empty cycle of letters, where a letter is the set of
 * atomic propositions true at that position. Nothing in this module reads a configuration, a step
 * relation or a dead end. The bridge from the model to words — reading the stutter-closed step
 * relation as a Büchi automaton, the product over (configuration, automaton-node) pairs, the
 * stutter self-loop at dead ends — is the next phase's, and keeping it out of here is what makes
 * the oracle an oracle: it shares the construction's SEMANTICS and none of its machinery.
 *
 * ## Why a bounded walk decides U, F and G exactly
 *
 * A lasso of prefix length P and cycle length C has exactly N = P + C distinct suffixes, one per
 * position, because the letter at position i is determined by i and the successor of the last
 * position is the first position of the cycle. So positions form a finite "rho" shape: a path into
 * a cycle. Walking N steps from any position therefore visits every position reachable from it, at
 * least once. `eventually` needs one position on that orbit, `always` needs all of them, and
 * `until` needs the first position where its right side holds to arrive before its left side
 * fails — each a walk of at most N steps with no fixpoint iteration to get wrong.
 *
 * The strength of `until` is visible in one line: the walk returns FALSE when it runs out of
 * positions. "`P until Q` requires Q to actually occur: the ∃k in the table is not optional." A
 * weak-until implementation would return true there, and the strong/weak separator fixture is a
 * lasso where exactly that line decides the answer.
 */
import type { Formula } from "./ltl.ts";
import { labelHolds, type Gnba } from "./ltl-automaton.ts";
import { fail, ok, type Res } from "./types.ts";

/** The atomic propositions true at one position. Every atom not present is false there. */
export type Letter = ReadonlySet<string>;

/**
 * An explicit ultimately-periodic trace: `prefix` then `cycle` repeated forever.
 *
 * The cycle is non-empty by construction, which is what makes the trace infinite — the same reason
 * the trace domain stutters at a dead end rather than stopping. `makeLasso` is the only way to
 * build one, so "empty cycle" is a refusal and never a silently-finite word.
 */
export interface Lasso {
  readonly prefix: readonly Letter[];
  readonly cycle: readonly Letter[];
}

export function makeLasso(prefix: readonly Letter[], cycle: readonly Letter[]): Res<Lasso> {
  if (cycle.length === 0) {
    return fail("a lasso's cycle cannot be empty: an LTL trace is infinite, so something repeats.");
  }
  return ok({ prefix, cycle });
}

/** Positions 0 … N-1, where N is the number of distinct suffixes of the lasso. */
const positions = (l: Lasso): number => l.prefix.length + l.cycle.length;

const letterAt = (l: Lasso, i: number): Letter => {
  const fromPrefix = l.prefix[i];
  if (fromPrefix !== undefined) return fromPrefix;
  return l.cycle[i - l.prefix.length] ?? new Set<string>();
};

/** The immediate successor position. At the last position it wraps to the start of the cycle. */
const succ = (l: Lasso, i: number): number => (i + 1 < positions(l) ? i + 1 : l.prefix.length);

/**
 * `π, i ⊨ φ`, one arm per row of the satisfaction table.
 *
 * | φ | π, i ⊨ φ iff |
 * |---|---|
 * | a (atomic) | the compiled predicate for a is true on cᵢ |
 * | ¬φ | not (π, i ⊨ φ) |
 * | φ ∧ ψ | π, i ⊨ φ and π, i ⊨ ψ |
 * | φ ∨ ψ | π, i ⊨ φ or π, i ⊨ ψ |
 * | φ → ψ | π, i ⊨ φ implies π, i ⊨ ψ |
 * | X φ | π, i+1 ⊨ φ |
 * | φ U ψ | ∃ k ≥ i : π, k ⊨ ψ and ∀ j with i ≤ j < k : π, j ⊨ φ |
 * | F φ | ∃ k ≥ i : π, k ⊨ φ |
 * | G φ | ∀ k ≥ i : π, k ⊨ φ |
 *
 * `X` moves one position, including into the cycle's wrap — "there is no off-by-one freedom", and
 * at a position whose successor is itself (a single-letter cycle, which is what a dead end's
 * stutter self-loop produces) `X φ ⟺ φ` falls out of the definition rather than being special-cased.
 */
export function satisfiesAt(formula: Formula, lasso: Lasso, i: number): boolean {
  const n = positions(lasso);
  switch (formula.kind) {
    case "const":
      return formula.value;
    case "atom":
      return letterAt(lasso, i).has(formula.key);
    case "not":
      return !satisfiesAt(formula.operand, lasso, i);
    case "and":
      return satisfiesAt(formula.left, lasso, i) && satisfiesAt(formula.right, lasso, i);
    case "or":
      return satisfiesAt(formula.left, lasso, i) || satisfiesAt(formula.right, lasso, i);
    case "implies":
      return !satisfiesAt(formula.left, lasso, i) || satisfiesAt(formula.right, lasso, i);
    case "next":
      return satisfiesAt(formula.operand, lasso, succ(lasso, i));
    case "eventually": {
      let at = i;
      for (let step = 0; step < n; step += 1) {
        if (satisfiesAt(formula.operand, lasso, at)) return true;
        at = succ(lasso, at);
      }
      return false;
    }
    case "always": {
      let at = i;
      for (let step = 0; step < n; step += 1) {
        if (!satisfiesAt(formula.operand, lasso, at)) return false;
        at = succ(lasso, at);
      }
      return true;
    }
    case "until": {
      let at = i;
      for (let step = 0; step < n; step += 1) {
        if (satisfiesAt(formula.right, lasso, at)) return true;
        if (!satisfiesAt(formula.left, lasso, at)) return false;
        at = succ(lasso, at);
      }
      // Every position on the orbit held the left side and none held the right. Under the STRONG
      // reading the formula is false; this is the line a weak-until implementation gets wrong.
      return false;
    }
  }
}

/** `π ⊨ φ`, which is `π, 0 ⊨ φ`. */
export const satisfies = (formula: Formula, lasso: Lasso): boolean => satisfiesAt(formula, lasso, 0);

// ----------------------------------------------------------------------------------------------
// The automaton's own answer
// ----------------------------------------------------------------------------------------------

/**
 * Whether the automaton accepts this lasso: does some run over the word visit every acceptance set
 * infinitely often?
 *
 * The product here is the word's positions against the automaton's states — NOT the model product.
 * A run q₀ q₁ … over w₀ w₁ … pairs position j with state qⱼ, and because the letter depends only
 * on the position, the run is a path in a graph of N × |Q| nodes. An accepting run exists iff some
 * reachable node lies on a cycle whose nodes meet every acceptance set: take an accepting run, and
 * the states it visits infinitely often form a strongly connected set meeting every acceptance set,
 * so a cycle through all of them exists; conversely such a cycle, prefixed by a path from an
 * initial node, is an accepting run.
 *
 * **Deliberately a different algorithm from the verdict path's.** The product emptiness check for
 * the real model is specified as Tarjan's algorithm over the materialized product. This uses
 * Kosaraju's two-pass decomposition over the word product instead. An oracle that shared the
 * emptiness routine with the thing it audits would agree with it for free on exactly the bugs that
 * routine has; two different decompositions over two different graphs do not.
 */
export function automatonAccepts(automaton: Gnba, lasso: Lasso): boolean {
  const q = automaton.states.length;
  if (q === 0) return false;
  const node = (pos: number, state: number): number => pos * q + state;

  const reachable = new Set<number>();
  const stack: number[] = [];
  for (const start of automaton.initial) {
    const state = automaton.states[start];
    if (state === undefined || !labelHolds(state, letterAt(lasso, 0))) continue;
    const id = node(0, start);
    if (!reachable.has(id)) { reachable.add(id); stack.push(id); }
  }

  const edges = new Map<number, number[]>();
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    const pos = Math.floor(current / q);
    const state = automaton.states[current % q];
    if (state === undefined) continue;
    const nextPos = succ(lasso, pos);
    const nextLetter = letterAt(lasso, nextPos);
    const out: number[] = [];
    for (const target of state.next) {
      const targetState = automaton.states[target];
      if (targetState === undefined || !labelHolds(targetState, nextLetter)) continue;
      const id = node(nextPos, target);
      out.push(id);
      if (!reachable.has(id)) { reachable.add(id); stack.push(id); }
    }
    edges.set(current, out);
  }
  if (reachable.size === 0) return false;

  const inSet = (nodeId: number, set: readonly number[]): boolean => set.includes(nodeId % q);
  for (const component of stronglyConnected(reachable, edges)) {
    if (!isNontrivial(component, edges)) continue;
    const meetsAll = automaton.acceptance.every(
      (set) => component.some((nodeId) => inSet(nodeId, set)));
    if (meetsAll) return true;
  }
  return false;
}

/** A component carries a cycle iff it has more than one node, or one node with a self-loop. */
function isNontrivial(
  component: readonly number[], edges: ReadonlyMap<number, readonly number[]>,
): boolean {
  if (component.length > 1) return true;
  const only = component[0];
  if (only === undefined) return false;
  return (edges.get(only) ?? []).includes(only);
}

/**
 * Kosaraju's algorithm: finishing order on the graph, then components on its transpose.
 *
 * Iterative in both passes. The graphs here are small, but a recursive depth-first search over a
 * product is the kind of thing that works on every fixture and dies on the one real model, and a
 * stack overflow inside an oracle would read as the construction being wrong.
 */
function stronglyConnected(
  nodes: ReadonlySet<number>, edges: ReadonlyMap<number, readonly number[]>,
): readonly (readonly number[])[] {
  const transpose = new Map<number, number[]>();
  for (const from of nodes) {
    for (const to of edges.get(from) ?? []) {
      if (!nodes.has(to)) continue;
      const list = transpose.get(to);
      if (list === undefined) transpose.set(to, [from]);
      else list.push(from);
    }
  }

  const order: number[] = [];
  const seen = new Set<number>();
  for (const root of nodes) {
    if (seen.has(root)) continue;
    // Each frame is (node, index of the next successor to consider), so a node is pushed to the
    // finishing order exactly when its successors are exhausted.
    const frames: { node: number; at: number }[] = [{ node: root, at: 0 }];
    seen.add(root);
    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      if (frame === undefined) break;
      const out = edges.get(frame.node) ?? [];
      if (frame.at >= out.length) {
        order.push(frame.node);
        frames.pop();
        continue;
      }
      const next = out[frame.at];
      frame.at += 1;
      if (next === undefined || !nodes.has(next) || seen.has(next)) continue;
      seen.add(next);
      frames.push({ node: next, at: 0 });
    }
  }

  const assigned = new Set<number>();
  const components: number[][] = [];
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const root = order[i];
    if (root === undefined || assigned.has(root)) continue;
    const component: number[] = [];
    const todo = [root];
    assigned.add(root);
    while (todo.length > 0) {
      const current = todo.pop();
      if (current === undefined) break;
      component.push(current);
      for (const back of transpose.get(current) ?? []) {
        if (assigned.has(back)) continue;
        assigned.add(back);
        todo.push(back);
      }
    }
    components.push(component);
  }
  return components;
}
