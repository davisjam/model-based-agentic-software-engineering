/**
 * The two deliberately tiny grammars the engine will parse, and nothing else.
 *
 * There is no expression evaluator here and there should not be one. An effect right-hand side is
 * `<var> + <int>`, `<var> - <int>`, or a literal; a derived value is `<ref> <cmp> <literal>` or a
 * bare reference. Anything outside those shapes is REFUSED with a message naming the restriction —
 * not evaluated, not approximated, not `eval`-ed. A general evaluator would be scope creep with a
 * security smell, and the spec asks for neither.
 *
 * Both grammars live together because they are the same discipline applied twice: parse into a
 * typed node, or refuse. Keeping them in one module means the restriction is stated once and the
 * tests that pin "rejects rather than evaluates" cover both sites.
 *
 * A note on booleans. `canonicalize` stringifies a scalar effect value, so a YAML `flag: true`
 * arrives here as the STRING "true" (§10.1 again). Literal parsing therefore has to recognize it,
 * which is why `true`/`false` are checked before the enum-string fallback.
 */
import type { Scalar } from "../ir/types.ts";
import { detail, fail, ok, type Res } from "./types.ts";

// --------------------------------------------------------------------------------------------
// Effect right-hand sides
// --------------------------------------------------------------------------------------------

export type EffectRhs =
  /** `retry_count + 1` / `retry_count - 2`: read `ref`, add `delta`. */
  | { readonly kind: "offset"; readonly ref: string; readonly delta: number }
  /** `3`, `true`, `held`: assign a constant. */
  | { readonly kind: "literal"; readonly value: Scalar }
  /** `other_var`: copy another reference's current value. */
  | { readonly kind: "copy"; readonly ref: string };

/** A reference token: an identifier, optionally dotted and optionally instance-subscripted. */
const REF = "[A-Za-z_][A-Za-z0-9_]*(?:\\[[0-9]+\\])?(?:\\.[A-Za-z_][A-Za-z0-9_]*)*";
const OFFSET_RE = new RegExp(`^(${REF})\\s*([+-])\\s*([0-9]+)$`);
const REF_RE = new RegExp(`^${REF}$`);

const INT_RE = /^[+-]?[0-9]+$/;

function literal(text: string): Scalar {
  if (INT_RE.test(text)) return Number(text);
  if (text === "true") return true;
  if (text === "false") return false;
  return text;
}

/**
 * Parse an effect's right-hand side.
 *
 * The order matters: an offset is checked first (so `retry_count + 1` is never read as the enum
 * string "retry_count + 1"), then an integer or boolean literal, then a bare reference, then a
 * plain string literal. A bare reference and a string literal are genuinely ambiguous — `held`
 * could be an enum value or a variable name — so the caller disambiguates by asking whether the
 * token names a reachable variable; this function reports both candidates via `copy` only when the
 * token cannot be a literal of the target's domain. See `compileWrite` in explore.ts.
 */
export function parseEffectRhs(raw: string): Res<EffectRhs> {
  const text = raw.trim();
  if (text === "") return fail("an effect's right-hand side is empty.");

  const offset = OFFSET_RE.exec(text);
  if (offset !== null) {
    const [, ref, sign, magnitude] = offset;
    if (ref === undefined || sign === undefined || magnitude === undefined) {
      return fail(`'${raw}' did not parse as '<var> + <int>'.`);
    }
    return ok({ kind: "offset", ref, delta: sign === "-" ? -Number(magnitude) : Number(magnitude) });
  }

  if (INT_RE.test(text) || text === "true" || text === "false") {
    return ok({ kind: "literal", value: literal(text) });
  }

  if (REF_RE.test(text)) {
    // Could be a variable reference or an enum literal. Reported as a reference; the caller falls
    // back to a literal when the token is not a declared variable, which is the only place that
    // distinction can be made.
    return ok({ kind: "copy", ref: text });
  }

  // Everything else -- arithmetic on two variables, multiplication, function calls, parentheses,
  // string concatenation -- is refused by design rather than evaluated.
  return fail(
    `effect expression '${raw}' is outside the supported grammar. v0.1 allows '<var> + <int>', ` +
    `'<var> - <int>', another variable's name, or a literal. Richer expressions are refused ` +
    `rather than evaluated: the engine does not contain an expression evaluator.`,
    detail("unsupported-expression", [`an expression language able to evaluate '${raw}'`]));
}

export function applyOffset(current: Scalar, delta: number): Res<number> {
  if (typeof current !== "number") {
    return fail(`'${String(current)}' is not an integer, so adding ${delta} to it is not defined.`);
  }
  return ok(current + delta);
}

/** Exposed so callers can turn a token the system does not know into a domain literal. */
export const asLiteral = (text: string): Scalar => literal(text.trim());

// --------------------------------------------------------------------------------------------
// Derived values
// --------------------------------------------------------------------------------------------

export type DerivedCmp = "eq" | "ne" | "lt" | "le" | "gt" | "ge";

export type DerivedExpr =
  | { readonly kind: "compare"; readonly ref: string; readonly op: DerivedCmp; readonly value: Scalar }
  /** A bare reference, which must itself be boolean-valued. */
  | { readonly kind: "ref"; readonly ref: string };

const CMP_TOKENS: readonly (readonly [string, DerivedCmp])[] = [
  ["==", "eq"], ["!=", "ne"], ["<=", "le"], [">=", "ge"], ["<", "lt"], [">", "gt"],
];

/**
 * Parse a derived value's expression.
 *
 * SEMANTICS.md fixes what a derived value IS (recomputed, never stored, acyclic — V18/V19) but
 * never fixes its expression grammar; the only example in the spec is `retry_count == 3`. This
 * accepts exactly that shape plus a bare boolean reference, and refuses the rest. Widening the
 * grammar is a spec decision, not an implementation one.
 */
export function parseDerived(raw: string): Res<DerivedExpr> {
  const text = raw.trim();
  if (text === "") return fail("a derived value's expression is empty.");

  for (const [token, op] of CMP_TOKENS) {
    const at = text.indexOf(token);
    if (at <= 0) continue;
    const ref = text.slice(0, at).trim();
    const rhs = text.slice(at + token.length).trim();
    if (!REF_RE.test(ref)) break;
    if (rhs === "") break;
    if (!INT_RE.test(rhs) && rhs !== "true" && rhs !== "false" && !REF_RE.test(rhs)) break;
    return ok({ kind: "compare", ref, op, value: literal(rhs) });
  }

  if (REF_RE.test(text)) return ok({ kind: "ref", ref: text });

  return fail(
    `derived expression '${raw}' is outside the supported grammar. v0.1 allows ` +
    `'<ref> == <literal>' (and !=, <, <=, >, >=) or a bare boolean reference. The engine refuses ` +
    `richer expressions rather than evaluating them.`,
    detail("unsupported-expression", [`an expression language able to evaluate '${raw}'`]));
}
