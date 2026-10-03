/**
 * Past-time questions, compiled to safety.
 *
 * "Can `published` occur without `reviewed` having occurred?" is a past-time property, and v0.1
 * implements no past-time operators — there are none in this module and there should be none in the
 * engine. Instead the question is REWRITTEN: a Boolean history variable `seen_reviewed`, set on
 * entry to `reviewed`, plus the ordinary safety invariant `published -> seen_reviewed`.
 *
 * **V23: the rewrite is disclosed.** The result carries a `compilation` entry naming the variable
 * that was added, because a user who is told "no" about a model they did not write has been given a
 * wrong answer about a different model. The disclosure also states the state-space cost, which is
 * the other thing a reader needs in order to trust the coverage figure.
 *
 * The antecedent is restricted to a single control-state atom — exactly the case SEMANTICS.md §7.3
 * works through. A predicate over variables would need the history flag set on entry to a
 * configuration rather than a state, which is a different (and larger) rewrite; it is refused with
 * the restriction named rather than approximated.
 */
import type {
  CanonMachine, CanonTransition, CanonVariable, CanonicalSystem, Compilation,
} from "../ir/types.ts";
import { runBehaviorQuery } from "./behavior.ts";
import { absentSubstrateVerdict } from "./model-types.ts";
import { describePredicate } from "./predicate.ts";
import { buildScope, resolveRef } from "./refs.ts";
import {
  fail, ok, result, unlicensed,
  type BehaviorQuery, type Predicate, type Res, type Verdict,
} from "./types.ts";

export interface PastTimeQuery {
  /** What must not happen unprecedented — `document.state: published`. */
  readonly consequent: Predicate;
  /** What must have happened first — a control-state atom, `document.state: reviewed`. */
  readonly antecedent: Predicate;
  readonly limit: number | null;
}

export interface HistoryCompilation {
  /** A NEW system carrying the auxiliary variable; the original is never mutated. */
  readonly system: CanonicalSystem;
  readonly query: BehaviorQuery;
  readonly compilation: Compilation;
  /** `<instance>.<variable>`, so a caller can name it in a UI without re-deriving it. */
  readonly reference: string;
}

/** The antecedent, reduced to the one shape the rewrite is defined for. */
function controlAtom(system: CanonicalSystem, pred: Predicate): Res<{ instance: string; machine: string; state: string }> {
  if (pred.kind !== "atoms" || pred.atoms.length !== 1) {
    return fail(
      "a past-time antecedent must be a single control-state atom, for example " +
      "'document.state: reviewed'. The history-variable rewrite sets a flag on ENTRY TO A STATE; " +
      "a richer antecedent needs a different compilation, which v0.1 refuses rather than " +
      "approximates.");
  }
  const atom = pred.atoms[0];
  if (atom === undefined || atom.op !== "eq" || typeof atom.value !== "string") {
    return fail("a past-time antecedent must equate a control state to a declared state name.");
  }
  const scope = buildScope(system);
  const ref = resolveRef(scope, atom.ref);
  if (!ref.ok) return ref;
  if (ref.value.kind !== "control") {
    return fail(
      `'${atom.ref}' is not a control state. The history-variable rewrite is defined for entry to ` +
      `a state; use '<machine>.state'.`);
  }
  const machine = system.machines.get(ref.value.machine);
  if (machine === undefined || !machine.states.includes(atom.value)) {
    return fail(`'${atom.value}' is not a declared state of machine '${ref.value.machine}'.`);
  }
  return ok({ instance: ref.value.instance, machine: ref.value.machine, state: atom.value });
}

/** A name no machine already uses, so the rewrite cannot shadow the author's own vocabulary. */
function freshName(machine: CanonMachine, base: string): string {
  if (!machine.variables.has(base) && !machine.derived.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}_${n}`;
    if (!machine.variables.has(candidate) && !machine.derived.has(candidate)) return candidate;
  }
}

export function compileHistory(system: CanonicalSystem, q: PastTimeQuery): Res<HistoryCompilation> {
  const anchor = controlAtom(system, q.antecedent);
  if (!anchor.ok) return anchor;
  const { instance, machine: machineId, state } = anchor.value;
  const machine = system.machines.get(machineId);
  if (machine === undefined) return fail(`'${machineId}' is not a declared machine.`);

  // `a11y_`-style prefixing is a document-artifact convention, not a modeling one; here the name is
  // the spec's own `seen_<state>` so a reader recognizes it from SEMANTICS.md §7.3.
  const name = freshName(machine, `seen_${state}`);
  const variable: CanonVariable = {
    id: name,
    machine: machineId,
    kind: "boolean",
    domain: [false, true],
    // Already true if the machine STARTS in the antecedent state: entry has happened.
    initial: machine.initial === state,
  };

  const transitions: readonly CanonTransition[] = machine.transitions.map((t) =>
    t.to === state ? { ...t, effects: [...t.effects, { variable: name, expression: "true" }] } : t);

  const variables = new Map(machine.variables);
  variables.set(name, variable);
  const machines = new Map(system.machines);
  machines.set(machineId, { ...machine, variables, transitions });
  const rewritten: CanonicalSystem = { ...system, machines };

  const reference = `${instance}.${name}`;
  const seen: Predicate = { kind: "atoms", atoms: [{ ref: reference, op: "eq", value: true }] };
  const query: BehaviorQuery = {
    form: "invariant",
    target: null,
    // `consequent -> seen`, written as `not (consequent and not seen)` because the predicate
    // language has no implication and inventing one would widen the schema.
    predicate: { kind: "not", operand: { kind: "all-of", operands: [q.consequent, { kind: "not", operand: seen }] } },
    avoid: null,
    transition: null,
    limit: q.limit,
  };

  const copies = machine.instances > 1 ? ` across ${machine.instances} instances` : "";
  const compilation: Compilation = {
    kind: "history-variable",
    explanation:
      `I added a history variable '${reference}' to answer this. It is a Boolean, initially ` +
      `${variable.initial}, set to true on entry to '${machineId}.${state}', and the past-time ` +
      `question was rewritten as the safety invariant: in every reachable configuration, ` +
      `${describePredicate(q.consequent)} implies ${reference}. v0.1 has no past-time operators, ` +
      `so this rewrite is how the question is answered at all. It also doubles the configuration ` +
      `space${copies}, which the coverage figure reflects.`,
  };

  return ok({ system: rewritten, query, compilation, reference });
}

/**
 * Answer a past-time question.
 *
 * `systemHash` is the hash of the ORIGINAL system, never the rewritten one. The rewrite is an
 * internal artifact; the result describes the model the user actually has, and a result that named
 * a system the user cannot see would be worse than one that named none.
 *
 * **The substrate-absence rung comes first, as it does in `runTypedQuery`.** This entry point does
 * not go through that dispatcher — it compiles its own behavioural query and hands it straight to
 * `runBehaviorQuery` — so until the call below it was the one door into the configuration space
 * with no registry consultation in front of it. Over a machineless system the old answer came out
 * of `controlAtom`: "'document.state' names nothing in this system", a misspelling to go hunting
 * for, about a system that declares no machine for any state name to be in. That is the typo hunt
 * the rung replaces, one rung lower than the question deserves. The kind is `behavior` because that
 * is what the rewrite produces and what the answer is computed over.
 */
export function runPastTimeQuery(
  system: CanonicalSystem, q: PastTimeQuery, systemHash: string,
): Verdict {
  const absent = absentSubstrateVerdict(system, "behavior", systemHash);
  if (absent !== null) return absent;

  const compiled = compileHistory(system, q);
  if (!compiled.ok) return unlicensed(systemHash, compiled.refusal, null, compiled.detail);

  const { result: inner, refusal } = runBehaviorQuery(
    compiled.value.system, compiled.value.query, "forall", systemHash);
  const rewritten = result({
    outcome: inner.outcome,
    coverage: inner.coverage,
    systemHash,
    evidence: inner.evidence,
    refusal: inner.refusal,
    // The displayed interpretation states the SAFETY property, not the past-time question, and the
    // polarity is why. The user asks "CAN published occur without reviewed?"; what is evaluated is
    // the universal "published always implies seen_reviewed". `holds` on the invariant means "no,
    // it cannot" — so printing the existential question beside `holds` would read as exactly the
    // opposite answer. V21's "display the interpretation you chose" is load-bearing here.
    interpretedAs:
      `Does every reachable configuration satisfy: ${describePredicate(q.consequent)} implies ` +
      `${compiled.value.reference}? Equivalently — '${describePredicate(q.consequent)}' cannot ` +
      `occur unless '${describePredicate(q.antecedent)}' has occurred first. ` +
      `'holds' means it cannot; 'refuted' means the counterexample trace shows how it can.`,
    // Disclosure first: it is the thing a reader must see before they read the outcome (V23).
    compilation: [compiled.value.compilation, ...inner.compilation],
  });
  return { result: rewritten, refusal, nodeSets: [] };
}
