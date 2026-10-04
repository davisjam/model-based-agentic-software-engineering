/**
 * LTL formulas: the student surface, parsed, resolved against the system vocabulary, normalized.
 *
 * This is the first of the two pieces the LTL foundation's delta list calls for — a formula type
 * and a parser, "admitted like every query: parse → resolve atoms against the system vocabulary
 * (refusing unknowns as `unlicensed`) → normalize". It produces no verdict and reaches no walk;
 * the product, the emptiness check and the verdict mapping are a later phase, and nothing here is
 * wired into the query facade, because a formula compiler that cannot answer is not a capability.
 *
 * ## Two rulings taken from the foundation rather than re-derived
 *
 * **`until` is STRONG.** "`P until Q` requires Q to actually occur: the ∃k in the table is not
 * optional." Weak until is spelled `(P until Q) or always P` and is not a surface operator. The
 * strength lives in the satisfaction relation (`ltl-trace.ts`) and in the acceptance sets the
 * tableau emits (`ltl-automaton.ts`); this module only has to refrain from inventing a third
 * reading.
 *
 * **`next` indexes the immediate successor.** "π, i ⊨ X φ iff π, i+1 ⊨ φ — there is no off-by-one
 * freedom", and at a stuttering position the successor is the same configuration, so `X φ ⟺ φ`
 * there. Again a semantics fact; the parser's job is to keep `next` a one-step operator and not
 * fold it into anything.
 *
 * ## Atoms are shipped predicates, so there is one predicate evaluator
 *
 * An atomic proposition is "exactly a shipped configuration predicate", compiled by
 * `compilePredicate` and evaluated per configuration. So `L` is not a labeling table; it is
 * evaluation. Two consequences are visible in the types below. The formula tree carries only an
 * atom KEY — a canonical rendering of the predicate — so the syntax is pure and the binding from
 * key to compiled function sits beside it in `LtlProperty.atoms`. And an unresolvable reference
 * refuses before any trace is examined, inheriting `compilePredicate`'s whole design rather than
 * folding a silent `false` into a verdict.
 *
 * The text surface builds SINGLE-atom predicates. The predicate combinators (`all-of` / `any-of` /
 * `not`) are reachable only through the object grammar, which this phase does not accept, and
 * nothing is lost: "the two parses denote the same property, and the parser may normalize freely",
 * so `committed or refused` written with LTL's `or` denotes what the `any-of` predicate denotes.
 *
 * ## Precedence, and the one place the foundation is ambiguous
 *
 * The grammar fixes "unary (`not`, `next`, `eventually`, `always`) binds tightest, then `until`
 * (right-associative), then `and`, `or`, `implies` (right-associative, weakest)". The first two
 * tiers are unambiguous and implemented as written. The third names three connectives in one tier,
 * which leaves `a and b or c` with two readings: the literal one-tier reading groups it as
 * `a and (b or c)`, and every convention a reader brings from the literature or from a programming
 * language groups it as `(a and b) or c`.
 *
 * Rather than pick one silently — the exact "winging it" the foundation was commissioned to
 * prevent — an unparenthesized MIX of two different boolean connectives is REFUSED, with the fix
 * named. Each connective on its own is accepted and right-associated, so `p implies q implies r`
 * and `a and b and c` both parse. When the ranking is ruled, the refusal is one branch to delete.
 */
import type { GuardOp, Scalar } from "../ir/types.ts";
import { compilePredicate, describePredicate, type CompiledPredicate } from "./predicate.ts";
import type { RefScope } from "./refs.ts";
import { detail, fail, ok, type Atom, type Predicate, type Res } from "./types.ts";

// ----------------------------------------------------------------------------------------------
// The formula
// ----------------------------------------------------------------------------------------------

/**
 * A formula over the §2.1 surface. Atoms are KEYS; `LtlProperty.atoms` binds each to its predicate.
 *
 * `implies`, `eventually` and `always` are nodes here even though the grammar calls them sugar.
 * That is deliberate and it is what makes the differential oracle reach them: the satisfaction
 * relation implements the foundation's own row for each (`→`, `F`, `G`), while the automaton path
 * folds them away during the negation-normal-form rewrite. A wrong desugaring therefore shows up
 * as a DISAGREEMENT between the two, instead of being normalized out of sight before either side
 * can see it.
 */
export type Formula =
  | { readonly kind: "const"; readonly value: boolean }
  | { readonly kind: "atom"; readonly key: string }
  | { readonly kind: "not"; readonly operand: Formula }
  | { readonly kind: "and"; readonly left: Formula; readonly right: Formula }
  | { readonly kind: "or"; readonly left: Formula; readonly right: Formula }
  | { readonly kind: "implies"; readonly left: Formula; readonly right: Formula }
  | { readonly kind: "next"; readonly operand: Formula }
  | { readonly kind: "eventually"; readonly operand: Formula }
  | { readonly kind: "always"; readonly operand: Formula }
  | { readonly kind: "until"; readonly left: Formula; readonly right: Formula };

/** The connectives a student may write, and the one source of the keyword set. */
export const UNARY_WORDS = ["not", "next", "eventually", "always"] as const;
export const BOOLEAN_WORDS = ["and", "or", "implies"] as const;

export type UnaryWord = typeof UNARY_WORDS[number];
export type BooleanWord = typeof BOOLEAN_WORDS[number];

const KEYWORDS: ReadonlySet<string> = new Set<string>([...UNARY_WORDS, ...BOOLEAN_WORDS, "until"]);

/** Parse output: syntax plus the atom table, before anything is resolved against a model. */
export interface ParsedFormula {
  readonly formula: Formula;
  /** Atom key -> the predicate it abbreviates. */
  readonly atoms: ReadonlyMap<string, Predicate>;
  readonly source: string;
}

/** An atom resolved against a system: the predicate, its compiled form, and its plain language. */
export interface AtomBinding {
  readonly predicate: Predicate;
  readonly holds: CompiledPredicate;
  readonly described: string;
}

/** A formula whose every atom resolved. The object a later phase compiles to an automaton. */
export interface LtlProperty {
  readonly formula: Formula;
  readonly atoms: ReadonlyMap<string, AtomBinding>;
  readonly source: string;
}

// ----------------------------------------------------------------------------------------------
// Atom keys
// ----------------------------------------------------------------------------------------------

/**
 * Scalars rendered so two different scalars never collide.
 *
 * The string `"true"` and the boolean `true` are different values a model may both declare, and a
 * key that flattened them would merge two atoms into one atomic proposition — a wrong answer with
 * no error anywhere. Strings are quoted; numbers and booleans are not.
 */
const scalarText = (v: Scalar): string => (typeof v === "string" ? `'${v}'` : String(v));

/**
 * A predicate's canonical text, used as its atomic-proposition identity.
 *
 * Identity by canonical text rather than by object means the same predicate written twice is ONE
 * atomic proposition, which is what lets the tableau's literal-consistency check fire: `p` and
 * `not p` in one tableau node contradict only if both name the same key. `parsePredicate` already
 * sorts an atom conjunction's references, so authoring order does not reach this function.
 */
export function atomKey(pred: Predicate): string {
  if (pred.kind === "atoms") {
    return pred.atoms.map((a) => `${a.ref} ${a.op} ${scalarText(a.value)}`).join(" & ");
  }
  if (pred.kind === "not") return `not(${atomKey(pred.operand)})`;
  const inner = pred.operands.map(atomKey);
  return pred.kind === "all-of" ? `all(${inner.join(", ")})` : `any(${inner.join(", ")})`;
}

// ----------------------------------------------------------------------------------------------
// Tokens
// ----------------------------------------------------------------------------------------------

type TokenKind = "lparen" | "rparen" | "colon" | "cmp" | "word";

interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  readonly at: number;
}

const CMP_OPS: Readonly<Record<string, GuardOp>> = {
  "==": "eq", "!=": "ne", "<=": "le", ">=": "ge", "<": "lt", ">": "gt",
};

/** A reference token, the same shape `expr.ts` accepts: dotted, optionally instance-subscripted. */
const REF_RE = /^[A-Za-z_][A-Za-z0-9_]*(?:\[[0-9]+\])?(?:\.[A-Za-z_][A-Za-z0-9_]*)*/;
const INT_RE = /^[+-]?[0-9]+/;

function tokenize(text: string): Res<readonly Token[]> {
  const out: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text.charAt(i);
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") { i += 1; continue; }
    if (ch === "(") { out.push({ kind: "lparen", text: ch, at: i }); i += 1; continue; }
    if (ch === ")") { out.push({ kind: "rparen", text: ch, at: i }); i += 1; continue; }
    if (ch === ":") { out.push({ kind: "colon", text: ch, at: i }); i += 1; continue; }
    const two = text.slice(i, i + 2);
    if (two === "==" || two === "!=" || two === "<=" || two === ">=") {
      out.push({ kind: "cmp", text: two, at: i });
      i += 2;
      continue;
    }
    if (ch === "<" || ch === ">") { out.push({ kind: "cmp", text: ch, at: i }); i += 1; continue; }
    const rest = text.slice(i);
    const word = REF_RE.exec(rest) ?? INT_RE.exec(rest);
    if (word !== null && word[0].length > 0) {
      out.push({ kind: "word", text: word[0], at: i });
      i += word[0].length;
      continue;
    }
    return fail(
      `'${ch}' at position ${i} is not part of the formula grammar. A formula combines atoms ` +
      `('<reference>: <value>') with not, and, or, implies, next, eventually, always and until.`,
      detail("unsupported-expression"));
  }
  return ok(out);
}

// ----------------------------------------------------------------------------------------------
// The parser
// ----------------------------------------------------------------------------------------------

/**
 * Recursive descent over the three precedence tiers, with a cursor — so a class, not a module of
 * free functions passing an index around.
 *
 * Nothing throws. A malformed formula is a refusal carrying the sentence a user reads, the same
 * channel `compilePredicate` uses for an unresolvable reference, because "cannot be read" and
 * "read and found false" are different claims and only one of them is about the model.
 */
class FormulaParser {
  private at = 0;

  private readonly atoms = new Map<string, Predicate>();

  private readonly tokens: readonly Token[];

  private readonly source: string;

  constructor(tokens: readonly Token[], source: string) {
    this.tokens = tokens;
    this.source = source;
  }

  parse(): Res<ParsedFormula> {
    const body = this.booleanTier();
    if (!body.ok) return body;
    const extra = this.peek();
    if (extra !== null) {
      return fail(
        `'${extra.text}' at position ${extra.at} is left over after the formula ended. A missing ` +
        `connective or an unbalanced parenthesis is the usual cause.`,
        detail("unsupported-expression"));
    }
    return ok({ formula: body.value, atoms: this.atoms, source: this.source });
  }

  private peek(): Token | null {
    return this.tokens[this.at] ?? null;
  }

  private peekWord(): string | null {
    const tok = this.peek();
    return tok !== null && tok.kind === "word" ? tok.text : null;
  }

  /** The weakest tier: one boolean connective, repeated, right-associated. A mix is refused. */
  private booleanTier(): Res<Formula> {
    const first = this.untilTier();
    if (!first.ok) return first;
    const operands: Formula[] = [first.value];
    let connective: BooleanWord | null = null;
    for (;;) {
      const word = this.peekWord();
      const next = BOOLEAN_WORDS.find((w) => w === word);
      if (next === undefined) break;
      if (connective !== null && connective !== next) {
        return fail(
          `'${connective}' and '${next}' are mixed at one level without parentheses, and v0.2 does ` +
          `not rank the boolean connectives against each other — so this formula has more than one ` +
          `reading. Parenthesize the intended one, for example '(a ${connective} b) ${next} c'.`,
          detail("unsupported-expression"));
      }
      connective = next;
      this.at += 1;
      const operand = this.untilTier();
      if (!operand.ok) return operand;
      operands.push(operand.value);
    }
    if (connective === null) return ok(first.value);
    return ok(rightFold(connective, operands));
  }

  /** `until`, right-associative, binding tighter than the boolean tier. */
  private untilTier(): Res<Formula> {
    const left = this.unary();
    if (!left.ok) return left;
    if (this.peekWord() !== "until") return left;
    this.at += 1;
    const right = this.untilTier();
    if (!right.ok) return right;
    return ok({ kind: "until", left: left.value, right: right.value });
  }

  /** The unary prefixes, binding tightest. */
  private unary(): Res<Formula> {
    const word = this.peekWord();
    const prefix = UNARY_WORDS.find((w) => w === word);
    if (prefix === undefined) return this.primary();
    this.at += 1;
    const inner = this.unary();
    if (!inner.ok) return inner;
    if (prefix === "not") return ok({ kind: "not", operand: inner.value });
    if (prefix === "next") return ok({ kind: "next", operand: inner.value });
    if (prefix === "eventually") return ok({ kind: "eventually", operand: inner.value });
    return ok({ kind: "always", operand: inner.value });
  }

  private primary(): Res<Formula> {
    const tok = this.peek();
    if (tok === null) {
      return fail(
        "the formula ended where an atom or a parenthesized formula was expected.",
        detail("unsupported-expression"));
    }
    if (tok.kind === "lparen") {
      this.at += 1;
      const inner = this.booleanTier();
      if (!inner.ok) return inner;
      const close = this.peek();
      if (close === null || close.kind !== "rparen") {
        return fail(
          `the group opened at position ${tok.at} is never closed.`,
          detail("unsupported-expression"));
      }
      this.at += 1;
      return ok(inner.value);
    }
    return this.atom();
  }

  /** `<reference>: <value>` for equality, or `<reference> <comparison> <value>`. */
  private atom(): Res<Formula> {
    const refTok = this.peek();
    if (refTok === null || refTok.kind !== "word") {
      const shown = refTok === null ? "the end of the formula" : `'${refTok.text}'`;
      return fail(
        `${shown} is not an atom. An atom names a reference and a value — ` +
        `'transaction.state: based', or 'retry_count >= 3'.`,
        detail("unsupported-expression"));
    }
    if (KEYWORDS.has(refTok.text)) {
      return fail(
        `'${refTok.text}' is a connective, so it cannot start an atom. An atom names a reference ` +
        `and a value — 'transaction.state: based'.`,
        detail("unsupported-expression"));
    }
    this.at += 1;
    const opTok = this.peek();
    if (opTok === null || (opTok.kind !== "colon" && opTok.kind !== "cmp")) {
      return fail(
        `'${refTok.text}' is a bare reference. v0.2 has no bare-reference atom — say which value ` +
        `it takes: '${refTok.text}: <value>' (or '${refTok.text}: true' for a boolean).`,
        detail("unsupported-expression"));
    }
    const op: GuardOp = opTok.kind === "colon" ? "eq" : (CMP_OPS[opTok.text] ?? "eq");
    this.at += 1;
    const valueTok = this.peek();
    if (valueTok === null || valueTok.kind !== "word") {
      return fail(
        `'${refTok.text}' is compared to nothing. An atom needs a value on the right.`,
        detail("unsupported-expression"));
    }
    this.at += 1;
    const atom: Atom = { ref: refTok.text, op, value: literal(valueTok.text) };
    const pred: Predicate = { kind: "atoms", atoms: [atom] };
    const key = atomKey(pred);
    this.atoms.set(key, pred);
    return ok({ kind: "atom", key });
  }
}

/**
 * A value token read as a scalar.
 *
 * `true`/`false` become booleans and an integer becomes a number, the same order `expr.ts` uses —
 * a model that declares a boolean variable and a model that declares the enum state `true` are
 * both writable, and the atom's value is then checked against the reference's declared domain by
 * `compileAtom`, which refuses the mismatch rather than comparing false everywhere.
 */
function literal(text: string): Scalar {
  if (INT_RE.test(text) && /^[+-]?[0-9]+$/.test(text)) return Number(text);
  if (text === "true") return true;
  if (text === "false") return false;
  return text;
}

/** Right-associate a run of one connective, so `p implies q implies r` is `p implies (q implies r)`. */
function rightFold(connective: BooleanWord, operands: readonly Formula[]): Formula {
  const last = operands[operands.length - 1];
  if (last === undefined) throw new Error("rightFold on an empty operand list");
  let acc = last;
  for (let i = operands.length - 2; i >= 0; i -= 1) {
    const left = operands[i];
    if (left === undefined) continue;
    acc = { kind: connective, left, right: acc };
  }
  return acc;
}

// ----------------------------------------------------------------------------------------------
// The object grammar
// ----------------------------------------------------------------------------------------------

/**
 * Lift a shipped configuration predicate to an atomic proposition, and combine propositions.
 *
 * The text surface above builds single-atom predicates; these build a `ParsedFormula` from the
 * `Predicate` objects the six behavior forms already carry. That is §2.2's claim made operational —
 * "an atomic proposition is exactly a shipped configuration predicate" — and it is what the §9.1
 * bridge needs: `invariant` carries a nested `not`/`any-of`/`all-of` predicate, and the bridge must
 * ask LTL about THAT predicate rather than about a re-typed approximation of it. A re-typed one
 * would make a disagreement ambiguous between the two implementations and the transcription.
 *
 * No parser, no precedence, no refusal: the inputs are already-typed trees, so the only work is
 * merging the atom tables. Resolution still happens in `resolveFormula`, so an atom naming nothing
 * refuses on this path exactly as it does on the text path.
 */
export const proposition = (pred: Predicate): ParsedFormula => {
  const key = atomKey(pred);
  return { formula: { kind: "atom", key }, atoms: new Map([[key, pred]]), source: describePredicate(pred) };
};

const mergedAtoms = (parts: readonly ParsedFormula[]): ReadonlyMap<string, Predicate> => {
  const out = new Map<string, Predicate>();
  for (const part of parts) for (const [key, pred] of part.atoms) out.set(key, pred);
  return out;
};

const unaryOf = (kind: "not" | "next" | "eventually" | "always") =>
  (operand: ParsedFormula): ParsedFormula => ({
    formula: { kind, operand: operand.formula },
    atoms: operand.atoms,
    source: `${kind} (${operand.source})`,
  });

const binaryOf = (kind: "and" | "or" | "implies" | "until") =>
  (left: ParsedFormula, right: ParsedFormula): ParsedFormula => ({
    formula: { kind, left: left.formula, right: right.formula },
    atoms: mergedAtoms([left, right]),
    source: `(${left.source}) ${kind} (${right.source})`,
  });

export const notOf = unaryOf("not");
export const nextOf = unaryOf("next");
export const eventuallyOf = unaryOf("eventually");
export const alwaysOf = unaryOf("always");
export const andOf = binaryOf("and");
export const orOf = binaryOf("or");
export const impliesOf = binaryOf("implies");
export const untilOf = binaryOf("until");

export function parseFormula(text: string): Res<ParsedFormula> {
  const trimmed = text.trim();
  if (trimmed === "") return fail("an empty formula states nothing.", detail("unsupported-expression"));
  const tokens = tokenize(trimmed);
  if (!tokens.ok) return tokens;
  return new FormulaParser(tokens.value, trimmed).parse();
}

// ----------------------------------------------------------------------------------------------
// Resolution
// ----------------------------------------------------------------------------------------------

/**
 * Resolve every atom against the system's vocabulary, refusing the first that names nothing.
 *
 * This is the step that makes an LTL question admitted like every other query. A typo in a
 * reference, a value outside a declared domain, or an order comparison on something with no
 * declared ordering all refuse HERE — before a trace exists, let alone a verdict — because the
 * refusal and a `refuted` are different claims and a typo must produce the first.
 */
export function resolveFormula(scope: RefScope, parsed: ParsedFormula): Res<LtlProperty> {
  const atoms = new Map<string, AtomBinding>();
  for (const [key, predicate] of parsed.atoms) {
    const compiled = compilePredicate(scope, predicate);
    if (!compiled.ok) {
      return fail(
        `the formula's atom '${key}' cannot be resolved: ${compiled.refusal}`,
        detail("unknown-vocabulary", [key]));
    }
    atoms.set(key, { predicate, holds: compiled.value, described: describePredicate(predicate) });
  }
  return ok({ formula: parsed.formula, atoms, source: parsed.source });
}

// ----------------------------------------------------------------------------------------------
// Normalization
// ----------------------------------------------------------------------------------------------

/**
 * Normalize: collapse double negation and fold the constants a negation produces.
 *
 * Deliberately NOT done here: folding `implies` to `¬φ ∨ ψ`, and desugaring `eventually` /
 * `always` to `until` / release. Both are legitimate rewrites, and the negation-normal-form pass
 * in `ltl-automaton.ts` performs them — but it performs them on ONE side only. A rewrite applied
 * here would reach the satisfaction relation and the automaton equally, so a mistake in it would
 * be invisible to the differential check; left to the automaton path, the same mistake becomes a
 * disagreement with the relation that defines the meaning.
 *
 * Atom identity is normalized at parse time instead, by canonical key: the same predicate written
 * twice is one atomic proposition before this function ever sees the tree.
 */
export function normalizeFormula(formula: Formula): Formula {
  switch (formula.kind) {
    case "const":
    case "atom":
      return formula;
    case "not": {
      const inner = normalizeFormula(formula.operand);
      if (inner.kind === "not") return inner.operand;
      if (inner.kind === "const") return { kind: "const", value: !inner.value };
      return { kind: "not", operand: inner };
    }
    case "next":
      return { kind: "next", operand: normalizeFormula(formula.operand) };
    case "eventually":
      return { kind: "eventually", operand: normalizeFormula(formula.operand) };
    case "always":
      return { kind: "always", operand: normalizeFormula(formula.operand) };
    case "and":
    case "or":
    case "implies":
    case "until":
      return {
        kind: formula.kind,
        left: normalizeFormula(formula.left),
        right: normalizeFormula(formula.right),
      };
  }
}

/** Parse, resolve, normalize — the admission sequence the delta list specifies, in that order. */
export function compileFormula(scope: RefScope, text: string): Res<LtlProperty> {
  const parsed = parseFormula(text);
  if (!parsed.ok) return parsed;
  const resolved = resolveFormula(scope, parsed.value);
  if (!resolved.ok) return resolved;
  return ok({ ...resolved.value, formula: normalizeFormula(resolved.value.formula) });
}

// ----------------------------------------------------------------------------------------------
// Plain language
// ----------------------------------------------------------------------------------------------

/**
 * Render a formula back as the words a student typed, with atoms in plain language.
 *
 * The release operator cannot appear here. It exists only inside the tableau's negation normal
 * form, and the spec's line — "Büchi automata are implementation machinery, not a Workbench model
 * form" — is held by this function having no case for it: the type it reads has none.
 */
export function describeFormula(formula: Formula, atoms: ReadonlyMap<string, AtomBinding>): string {
  const sub = (f: Formula): string => describeFormula(f, atoms);
  const group = (f: Formula): string =>
    f.kind === "atom" || f.kind === "const" ? sub(f) : `(${sub(f)})`;
  switch (formula.kind) {
    case "const":
      return formula.value ? "true" : "false";
    case "atom":
      return atoms.get(formula.key)?.described ?? formula.key;
    case "not":
      return `not ${group(formula.operand)}`;
    case "next":
      return `in the next step, ${group(formula.operand)}`;
    case "eventually":
      return `eventually ${group(formula.operand)}`;
    case "always":
      return `always ${group(formula.operand)}`;
    case "and":
      return `${group(formula.left)} and ${group(formula.right)}`;
    case "or":
      return `${group(formula.left)} or ${group(formula.right)}`;
    case "implies":
      return `${group(formula.left)} implies ${group(formula.right)}`;
    case "until":
      return `${group(formula.left)} until ${group(formula.right)}`;
  }
}

/** Atom keys the formula mentions, in first-appearance order. Used by the automaton's labeling. */
export function formulaAtoms(formula: Formula): readonly string[] {
  const seen: string[] = [];
  const walk = (f: Formula): void => {
    switch (f.kind) {
      case "const": return;
      case "atom": {
        if (!seen.includes(f.key)) seen.push(f.key);
        return;
      }
      case "not":
      case "next":
      case "eventually":
      case "always":
        walk(f.operand);
        return;
      case "and":
      case "or":
      case "implies":
      case "until":
        walk(f.left);
        walk(f.right);
        return;
    }
  };
  walk(formula);
  return seen;
}
