/**
 * State predicates: compiled once against the system's vocabulary, then evaluated per configuration.
 *
 * A compiled predicate cannot fail. Every reference, operator and literal is checked before the
 * first configuration is enumerated, so an unresolvable atom becomes a refusal the user reads
 * instead of a silent `false` folded into an exhaustive-looking answer. That asymmetry is the whole
 * point: `refuted` and `unlicensed` are different claims, and a typo must produce the second.
 */
import type { Configuration } from "../ir/types.ts";
import { compileAtom, type RefScope } from "./refs.ts";
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
