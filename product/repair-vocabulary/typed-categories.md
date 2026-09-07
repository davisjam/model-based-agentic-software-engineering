# Typed `ViolationCategory` / `FailureCategory` enums

**Intent** — Replace free-form failure strings with typed enums, so the categorical move-space is a
closed, enumerable set that the compiler and lints can check for exhaustive handling.

| | |
|---|---|
| Summary | Typed enums replace free-form failure strings. |
| Target | Product · **Repair vocabulary** |
| Form | `repair-vocab` |
| Move | `constraint` — prevents the error by construction |
| Model | — |
| Enforcement | **Hard** (deterministic) — a typed closed set; the compiler + exhaustiveness checks enforce it |

*Its place in the environment — a **variant / known-use** of **Closed Action Vocabulary**, under **CONSTRAIN · Constrain where and how agents act**. Preserved here for its technical texture.*

## Motivation — the failure it kills

Bare failure strings (`"timeout"`, `"corrupt"`, `"rate_limit"`) are typo-prone, un-enumerable, and let
a `switch` silently miss a case. A typo compiles and mis-routes; a new category isn't forced into every
handler; and you can't even ask "are all categories handled?" The failure is *an unhandled or
mistyped category → silent misbehaviour*, recurring at every place a category is produced or consumed.

## Why it's not just "use descriptive strings"

Strings are an *open* set: nothing makes them exhaustive, a typo is a runtime bug rather than a compile
error, and adding a case doesn't force the existing handlers to deal with it. Can you ask a string
vocabulary whether every category is handled? You cannot: the set has no edges to check against. A
**typed enum** makes the set *closed* and its handling *exhaustively checkable*: add a case and the
non-exhaustive `switch` lights up. This is "explicit models over implicit," and "types are how you name
shapes," applied to the failure/violation space — the enum *names* the categorical shape the strings left
anonymous.

## Mechanism

`ViolationCategory` and `FailureCategory` enums replace bare strings across the code; category
comparisons use enum values, not regex-against-strings; external strings are mapped to the enum at the
boundary. Exhaustive-match discipline (and the compiler's non-exhaustiveness signal) forces every
handler to cover every case.

## Prerequisites

- **A closed, identifiable category set.** The space must actually be enumerable.
- **The enums**, and callers switched from strings to enum values.
- **Boundary mapping** from external/serialized strings into the enum.

## Consequences & costs

- **Adding a category touches every handler** — which is the point (it forces handling), but it is real
  work.
- **Boundary translation.** External strings (LLM output, wire formats) still arrive as strings and must
  be mapped in at a controlled seam, but a seam nonetheless.

## Known uses

- `ViolationCategory` / `FailureCategory` enums in place of bare failure strings.
- Enum-value comparison instead of regex-on-strings (the regex-usage discipline).

## Related mechanisms

- *See also (sibling)* — [remediation-verbs](remediation-verbs.md), [codemod-first](codemod-first.md):
  the other bounded-move-space constraints.
- *See also (cross-target)* — the agent side's const-string topic registry
  ([typed-event-bus](../../agent/lifecycle-and-observability/typed-event-bus.md)) is the same "typed namespace
  over free-form strings" move for event topics.
- *Enabler* — typing a failure/violation space is the **precondition** for *error-path enumeration* (the
  testing strategy in the method's stance): you can only walk "every error edge" and ask "did we cover
  them all?" when the edges are a finite, named set, not ad-hoc strings.
