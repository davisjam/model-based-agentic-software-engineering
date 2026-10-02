/**
 * Write-side guard against YAML implicit typing.
 *
 * V25 and `src/validator/rules.ts` handle the READ side: an *id* a loader would coerce is refused,
 * because a coerced id means the loaded model is not the written one. This module handles the
 * complementary and so far unguarded direction — a *value* we are about to write.
 *
 * The hazard is concrete and measured, not theoretical. The `yaml` package implements YAML **1.2
 * core**, where `off` is the string "off"; it therefore emits `label: off` unquoted and reads it
 * back as "off" quite happily. But `workbench/validate.py` loads with `yaml.safe_load`, which is
 * PyYAML, which is YAML **1.1**, where `off` is boolean `false`. Measured on PyYAML 6:
 *
 *     off on yes NO Null ~ (empty)   -> bool / None
 *     017 0x1f 0b101 1_000 1:30      -> int        (octal, hex, binary, underscore, sexagesimal)
 *     1.5 .inf -.INF .nan            -> float
 *     2026-10-02 2026-10-02T10:00:00Z-> date / datetime, which JSON cannot represent
 *
 * So a workbench write of the *string* `"off"` yields a file the repo's own validator reads as a
 * boolean. The writer must quote; the library will not do it for us. `CST.setScalarValue` is worse
 * still — it emits the string `"true"` as bare `true`, which even YAML 1.2 reads back as a boolean.
 *
 * The predicate is deliberately **conservative**: it fires whenever any mainstream 1.1 or 1.2
 * loader might not return the identical string. Over-quoting costs a pair of quote marks;
 * under-quoting costs a model that means something else, in a file advertised as hand-editable.
 *
 * There is no boolean result here either — the caller gets the *named rule* that bites, so an error
 * message can say which one and a structured consumer can branch on it (FR-A11Y-2).
 */

/** Which implicit-typing rule would claim this plain scalar. */
export type CoercionRule =
  | "implicit-bool"
  | "implicit-null"
  | "implicit-int"
  | "implicit-float"
  | "implicit-timestamp"
  | "implicit-merge-or-value"
  | "whitespace-significant";

export interface CoercionHazard {
  readonly rule: CoercionRule;
  /** What a loader would hand the caller instead of the string. Human-facing half. */
  readonly loadsAs: string;
}

/**
 * YAML 1.1's implicit-boolean set, plus the implicit-null set.
 *
 * NOTE a deliberate over-reach: PyYAML's resolver does NOT coerce bare `y`/`n` (measured), but the
 * YAML 1.1 spec lists them and other 1.1 loaders honour it. `src/validator/rules.ts` refuses them
 * as ids for the same reason. Quoting them is free; guessing which loader the file will meet is not.
 */
const BOOLISH: ReadonlySet<string> = new Set([
  "y", "Y", "n", "N",
  "yes", "Yes", "YES", "no", "No", "NO",
  "true", "True", "TRUE", "false", "False", "FALSE",
  "on", "On", "ON", "off", "Off", "OFF",
]);

const NULLISH: ReadonlySet<string> = new Set(["", "~", "null", "Null", "NULL"]);

/** Decimal, octal (both `0o17` and the 1.1 bare-leading-zero `017`), hex, binary, underscored. */
const INTISH = /^[-+]?(?:0b[01_]+|0o?[0-7_]+|0x[0-9a-fA-F_]+|[0-9][0-9_]*)$/;

/** Floats including `.inf` / `.nan`, and exponent forms that 1.2 reads but 1.1 may not. */
const FLOATISH = /^[-+]?(?:\.(?:inf|Inf|INF|nan|NaN|NAN)|(?:[0-9][0-9_]*)?\.[0-9_]*(?:[eE][-+]?[0-9]+)?|[0-9][0-9_]*[eE][-+]?[0-9]+)$/;

/** Sexagesimal: `1:30` is the integer 90 to a 1.1 loader. A duration written naturally. */
const SEXAGESIMAL = /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+(?:\.[0-9_]*)?$/;

/** `2026-10-02` and the full ISO forms. JSON has no date type, so these must never go bare (§10.1). */
const TIMESTAMP = /^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}(?:[Tt ][0-9]{1,2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:[ \t]*(?:Z|[-+][0-9]{1,2}(?::?[0-9]{2})?))?)?$/;

/**
 * The hazard this plain scalar would meet on reload, or `null` if a plain write is safe.
 *
 * Only strings can be mis-typed on reload: a real number or boolean written as a number or boolean
 * reads back as itself. So the caller passes the string it intends to mean as a string.
 */
export function coercionHazard(value: string): CoercionHazard | null {
  if (NULLISH.has(value)) {
    return { rule: "implicit-null", loadsAs: value === "" ? "null (an empty value is null)" : "null" };
  }
  if (BOOLISH.has(value)) {
    const truthy = /^(y|yes|true|on)$/i.test(value);
    return { rule: "implicit-bool", loadsAs: `the boolean ${truthy}` };
  }
  // Leading or trailing whitespace does not survive a plain scalar; neither does an all-space value.
  if (value !== value.trim()) {
    return { rule: "whitespace-significant", loadsAs: `'${value.trim()}' — leading/trailing space is stripped` };
  }
  if (TIMESTAMP.test(value)) {
    return { rule: "implicit-timestamp", loadsAs: "a date/datetime object, which JSON cannot represent" };
  }
  if (SEXAGESIMAL.test(value)) {
    return { rule: "implicit-int", loadsAs: "a sexagesimal integer (`1:30` is 90)" };
  }
  if (INTISH.test(value)) return { rule: "implicit-int", loadsAs: "an integer" };
  if (FLOATISH.test(value)) return { rule: "implicit-float", loadsAs: "a float" };
  // `=` carries the value tag and `<<` the merge key; both are structural to a 1.1 loader.
  if (value === "=" || value === "<<") {
    return { rule: "implicit-merge-or-value", loadsAs: "a merge/value tag rather than a string" };
  }
  return null;
}

/** The message a human reads when the writer quotes something for them. */
export const explainCoercion = (value: string, h: CoercionHazard): string =>
  `wrote '${value}' quoted: a YAML 1.1 loader (PyYAML, and so workbench/validate.py) reads it bare ` +
  `as ${h.loadsAs}. Rule: ${h.rule}.`;
