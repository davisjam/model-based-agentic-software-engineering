# Closed remediation-verb sets

**Intent** — Route the remediator's mutations through a *bounded, named set* of typed verbs (a closed
typed-mutator layer) rather than free-form edits, so the move-space is enumerable and every move can be
stamped, validated, and policy-checked (our instance: the document models' `Primitives`).

| | |
|---|---|
| Summary | A closed, named set of remediation actions — bounded moves. |
| Target | Product · **Repair vocabulary** |
| Form | `repair-vocab` |
| Move | `constraint` — prevents the error by construction |
| Model | — |
| Enforcement | **Hard** (deterministic) — typed verbs; the [F10 lint](../provenance-and-attribution/f10-wiring-lint.md) + validators cover them |

*Its place in the environment — the **canonical mechanism** for **CONSTRAIN · Constrain where and how agents act**.*

## Motivation — the failure it kills

Free-form document editing is *unbounded*: any pass could do anything, and an unbounded edit cannot be
stamped, validated, or checked against policy as a set. The failure is *an unbounded mutation that is
un-attributed, un-validated, or off-policy*, and it recurs per pass unless the move-space itself is
constrained.

## Why it's not just "let passes edit the document as needed"

If passes can edit freely, you cannot answer basic governance questions: *is every mutation stamped? is
every insert validated? are all moves on-policy?* The set of possible moves is open. A
**closed verb set**, the typed mutators of the document models' `Primitives`, makes the move-space
**enumerable**: every verb wires a stamp ([F10](../provenance-and-attribution/f10-wiring-lint.md)), every
insert registers ([`a11y_`](../provenance-and-attribution/a11y-prefix.md)), and the
[ContentValidator](../validation-and-conformance/content-validator.md) covers the outcome. A bounded,
named action-space is what makes attribution, validation, and policy tractable at all; free-form mutation
leaves each question unanswerable.

## Mechanism

The `Primitives` mutators are the sanctioned verb set; the masked-pass architecture routes all changes
through them. A new verb must wire its stamp (F10) and, if it inserts, register with the inserted-content
registry. Nothing mutates the document outside this set.

## Prerequisites

- **A typed mutator layer** (the document models' `Primitives`) that all mutation routes through.
- **A discipline (and lints) that no change happens outside the verb set.**
- **The stamp/validate wiring** each verb carries.

## Consequences & costs

- **A needed action absent from the set forces adding a verb** — friction, but the intended kind: it
  keeps the space closed and every move governed.
- **The verb set is a maintenance surface** that grows with remediation capability.

## Known uses

- The `Primitives` mutator verb sets across the document models; the masked-pass architecture.
- Each verb's F10 stamp wiring and inserted-content registration.

## Related mechanisms

- **Enabler** — of [mutator-stamps](../provenance-and-attribution/mutator-stamps.md) and
  [content-validator](../validation-and-conformance/content-validator.md): a *bounded* move-space makes
  "stamp every move / validate every outcome" finite and achievable.
- *See also (sibling)* — [typed-categories](typed-categories.md), [codemod-first](codemod-first.md).
