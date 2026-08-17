<!-- note-spread: 1 -->

**Intent** — Route the remediator's mutations through a bounded, named set of structured verbs — a closed
mutator layer — rather than free-form edits, so the move-space is enumerable and every move can be
stamped, validated, and policy-checked (our instance: the document models' `Primitives`).

## Problem

Free-form document editing is unbounded: any pass could do anything, and an unbounded edit cannot be
stamped, validated, or checked against policy as a set. The failure is an unbounded mutation that is
un-attributed, un-validated, or off-policy, and it recurs per pass unless the move-space itself is
constrained.

## Mechanism

The `Primitives` mutators are the sanctioned verb set, and the masked-pass architecture routes all
changes through them. A closed set makes the move-space enumerable: every verb wires an attribution stamp
[appendix: mutator-stamps], every insert registers with the inserted-content registry, and the fidelity
gate [appendix: content-validator] covers the outcome. A new verb must wire its stamp and, if it inserts,
register — nothing mutates the document outside this set.

## Engineering Consequences

A bounded, named action-space is what makes attribution, validation, and policy tractable at all.
Free-form mutation leaves the governance questions — is every mutation stamped? is every insert
validated? are all moves on-policy? — unanswerable, because the set of possible moves is open. The cost
is friction of the intended kind: a needed action absent from the set forces adding a verb, which keeps
the space closed and every move governed. The verb set is a maintenance surface that grows with
remediation capability.

## Implementation Seam

Three parts carry the pattern: the structured mutator layer all mutation routes through, the stamp and
validate wiring each verb carries, and the lints that hold no change happening outside the verb set.

## Known Limitations

The set must grow to cover each new remediation capability, making completeness an ongoing obligation rather
than a one-time closure. Ultimately, though, the guarantee holds only while every mutation truly routes
through the set — the closure is exactly as strong as the discipline and lints that enforce it.
