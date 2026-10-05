/**
 * State predicates: compiled once against the system's vocabulary, then evaluated per configuration.
 *
 * A compiled predicate cannot fail. Every reference, operator and literal is checked before the
 * first configuration is enumerated, so an unresolvable atom becomes a refusal the user reads
 * instead of a silent `false` folded into an exhaustive-looking answer. That asymmetry is the whole
 * point: `refuted` and `unlicensed` are different claims, and a typo must produce the second.
 */
import type { Configuration, Scalar } from "../ir/types.ts";
import { compileAtom, resolveRef, type RefScope } from "./refs.ts";
import { ok, type Predicate, type Res } from "./types.ts";

export type CompiledPredicate = (cfg: Configuration) => boolean;

export function compilePredicate(scope: RefScope, pred: Predicate): Res<CompiledPredicate> {
  if (pred.kind === "atoms") {
    const parts: CompiledPredicate[] = [];
    for (const atom of pred.atoms) {
      const compiled = compileAtom(scope, atom);
      if (!compiled.ok) return compiled;
      parts.push(compiled.value);
    }
    return ok((cfg) => parts.every((p) => p(cfg)));
  }
  if (pred.kind === "not") {
    const inner = compilePredicate(scope, pred.operand);
    if (!inner.ok) return inner;
    const p = inner.value;
    return ok((cfg) => !p(cfg));
  }
  const parts: CompiledPredicate[] = [];
  for (const operand of pred.operands) {
    const compiled = compilePredicate(scope, operand);
    if (!compiled.ok) return compiled;
    parts.push(compiled.value);
  }
  return pred.kind === "all-of"
    ? ok((cfg) => parts.every((p) => p(cfg)))
    : ok((cfg) => parts.some((p) => p(cfg)));
}

// --------------------------------------------------------------------------------------------
// Satisfiability in the state vector — the vacuity discriminator (V41)
// --------------------------------------------------------------------------------------------

/**
 * Whether a predicate can be true in ANY configuration the state vector admits, reachable or not.
 *
 * This is the distinction the outcome vocabulary cannot carry. A `reach` query is `refuted` both
 * when the design prevents the target and when the target is a contradiction over the state vector
 * — `job-lease.state: held-by-0` AND `job-lease.state: held-by-1`, where one machine would have to
 * occupy two control states at once. The first is a statement about the system; the second is a
 * statement about the predicate, and no transition was consulted to reach it. Reading the second as
 * the first is reading a modelling error as a safety guarantee.
 *
 * `unsatisfiable` is the only answer a caller may act on. `satisfiable` means a witness assignment
 * exists in the vector and says nothing about reachability — that is what the walk is for.
 * `unknown` means the projection exceeded `budget`, so vacuity was not decided either way; a caller
 * MUST NOT read it as `satisfiable`, which is why the three arms are named rather than booleans.
 */
export type Satisfiability = "satisfiable" | "unsatisfiable" | "unknown";

/** Coordinates of the state vector a predicate's atoms can read. */
interface Coordinate {
  readonly kind: "control" | "variable";
  /** Instance id for a control coordinate; `<instance>.<variable>` key for a variable. */
  readonly key: string;
  readonly domain: readonly Scalar[];
}

function atomsOf(pred: Predicate): readonly string[] {
  if (pred.kind === "atoms") return pred.atoms.map((a) => a.ref);
  if (pred.kind === "not") return atomsOf(pred.operand);
  return pred.operands.flatMap(atomsOf);
}

/**
 * The coordinates to enumerate, as a SUPERSET of what the predicate reads.
 *
 * A derived value is a pure function of its machine's variables (V18), so a mentioned derived ref
 * expands to that instance's whole coordinate set rather than to a coordinate of its own. Treating
 * a derived value as independent would call `retry_count: 0 and retries_exhausted: true`
 * satisfiable when `retries_exhausted` is `retry_count == 3` — which fails in the direction that
 * misses a real vacuity, so the superset is the sound choice.
 */
function coordinatesOf(scope: RefScope, pred: Predicate): readonly Coordinate[] | null {
  const byKey = new Map<string, Coordinate>();
  const addInstance = (instanceId: string): boolean => {
    const inst = scope.instances.get(instanceId);
    if (inst === undefined) return false;
    const machine = scope.system.machines.get(inst.machine);
    if (machine === undefined) return false;
    byKey.set(inst.id, { kind: "control", key: inst.id, domain: machine.states });
    for (const v of machine.variables.values()) {
      byKey.set(`${inst.id}.${v.id}`, {
        kind: "variable", key: `${inst.id}.${v.id}`, domain: v.domain,
      });
    }
    return true;
  };

  for (const raw of atomsOf(pred)) {
    const resolved = resolveRef(scope, raw);
    // A predicate that reached this function already compiled, so every ref resolves; a defensive
    // null keeps the check from inventing an answer if that ever stops being true.
    if (!resolved.ok) return null;
    const ref = resolved.value;
    if (ref.kind === "control") {
      const machine = scope.system.machines.get(ref.machine);
      if (machine === undefined) return null;
      byKey.set(ref.instance, { kind: "control", key: ref.instance, domain: machine.states });
      continue;
    }
    if (ref.kind === "variable") {
      byKey.set(ref.key, { kind: "variable", key: ref.key, domain: ref.variable.domain });
      continue;
    }
    if (!addInstance(ref.instance)) return null;
  }
  return [...byKey.values()];
}

/**
 * Decide vacuity by enumerating the predicate's own coordinates, not the whole configuration space.
 *
 * The projection is what makes this cheap: a predicate naming one machine's control state searches
 * that machine's states, not the product of every machine and variable in the system. `base` supplies
 * the coordinates the predicate cannot read, so the compiled predicate — which recomputes derived
 * values from a whole configuration — has one to evaluate against.
 */
export function satisfiability(
  scope: RefScope, pred: Predicate, compiled: CompiledPredicate, base: Configuration,
  budget: number = 100_000,
): Satisfiability {
  const coords = coordinatesOf(scope, pred);
  if (coords === null) return "unknown";
  if (coords.length === 0) {
    // No atoms to constrain anything: the predicate is a constant, so the base configuration
    // decides it. Not a projection, so no budget applies.
    return compiled(base) ? "satisfiable" : "unsatisfiable";
  }

  let size = 1;
  for (const c of coords) {
    if (c.domain.length === 0) return "unknown";
    size *= c.domain.length;
    if (size > budget) return "unknown";
  }

  const index = new Array<number>(coords.length).fill(0);
  for (;;) {
    const control = new Map(base.control);
    const values = new Map(base.values);
    coords.forEach((c, k) => {
      const value = c.domain[index[k] ?? 0];
      if (value === undefined) return;
      if (c.kind === "control") control.set(c.key, String(value));
      else values.set(c.key, value);
    });
    if (compiled({ control, values })) return "satisfiable";

    let p = coords.length - 1;
    for (; p >= 0; p -= 1) {
      const next = (index[p] ?? 0) + 1;
      if (next < (coords[p]?.domain.length ?? 0)) {
        index[p] = next;
        break;
      }
      index[p] = 0;
    }
    if (p < 0) return "unsatisfiable";
  }
}

/** Plain-language rendering, for `interpreted-as` and for the non-visual twin (FR-A11Y-2). */
export function describePredicate(pred: Predicate): string {
  const OP_WORDS: Readonly<Record<string, string>> = {
    eq: "is", ne: "is not", lt: "is less than", le: "is at most", gt: "is greater than", ge: "is at least",
  };
  if (pred.kind === "atoms") {
    return pred.atoms
      .map((a) => `${a.ref} ${OP_WORDS[a.op] ?? a.op} ${String(a.value)}`)
      .join(" and ");
  }
  if (pred.kind === "not") return `not (${describePredicate(pred.operand)})`;
  const joiner = pred.kind === "all-of" ? " and " : " or ";
  return pred.operands.map((p) => `(${describePredicate(p)})`).join(joiner);
}
