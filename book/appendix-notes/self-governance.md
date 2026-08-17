<!-- note-spread: 2 -->

**Intent** — Give the system permission to govern the way it is governed: let it detect its own recurring
issues and introduce *tasteful* — proportionate, right-sized — controls that prevent recurrence, rather than
re-patching each instance by hand. When a failure recurs, classify the failure *class* and add the smallest
durable guardrail that kills it, fired on a cadence so the loop runs by design (our instance: a loadable
failure-interpretation skill invoked by a turn-end reflection hook at most once per window).

## Problem

The recurring failure is re-patching an instance of a class the fleet will hit again. The same cherry-pick
false-rejects a second time; the same lint mis-fires; the same manual step gets re-done by hand. Fixed
locally each time, the class survives to bite the next agent. Two sub-failures compound it. Turning an
instance fix into a class-killing control depends on an operator noticing the recurrence and choosing to build
the guardrail — the judgment skipped when the queue is deep. And even a team that believes in conversion
forgets: on a long autonomous run the trigger lives only in fallible memory.

<!-- note-fold -->

## Mechanism

Two halves, one soft and one hard, packaged together.

- **The conversion loop.** On a recurrence, name the failure class, not the instance. Then pick the durable
  control from a small ordered vocabulary. Prefer a *constraint* — a structured seam, a closed enum, an
  architecture that makes the wrong move unrepresentable. Fall back to a *sensor* (a lint, gate, test, or
  runtime hook) only when no constraint can be built. The loop scaffolds the control; it proposes, it does not
  install.
- **The time-aware trigger.** A reflection hook bound to a runtime lifecycle event fires the loop on a
  cadence, at most once per window, asking one question: did a failure recur that should become a control? The
  deterministic trigger prompts the soft conversion judgment.
- **A design-time companion.** Run before a subsystem exists, the same stance audits it for predictive smells
  — shared mutable state, an irreversible operation, a duplicated fact — so a class need never be felt to be closed.

## Engineering Consequences

The conversion becomes cadence-driven rather than memory-dependent: the hard hook guarantees the *prompt* even
on a deep queue, so the governance estate grows by design and velocity turns into durable trust instead of
re-solving solved problems. The word *tasteful* carries weight — the loop adds the smallest guardrail that
closes the class, so governing the system does not calcify it.

## Implementation Seam

The loop keys on a recurrence signal — memory, an incident log, an operator's recall — so a second occurrence
reads as *seen before* rather than novel. The cadence half binds to a lifecycle event the harness exposes.
A closed control vocabulary makes "pick the durable control" checkable, and each converted failure lands in a
bounded, enforced home so the next conversion can see what already exists.

## Known Limitations

The proposing half is soft — it recommends and scaffolds, it cannot block. Cadence tuning is a real cost: too
often and the reflection becomes alarm fatigue; too rarely and a recurrence ages past the moment it was
cheapest to convert. Taste does not automate — choosing the right-sized guardrail, and resisting the
over-control reflex, stays human. Left undisciplined, the loop can grow a thicket of low-value checks that
themselves need governing.
