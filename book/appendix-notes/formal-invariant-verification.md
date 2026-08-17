<!-- note-spread: 1 -->

**Intent** — Give every model invariant a temporal form — a temporal-logic operator saying whether it is
*safety* (always holds) or *liveness* (eventually leads to) — and make that form the routing input that
derives which exhaustive checker verifies it. An invariant is then proven by the method its shape demands,
a state-space model-check rather than a sampled test, and it cannot be silently mis-verified.

## Problem

Some invariants concern a single reachable state: "a job is never both leased and free." Others concern
interleavings over time: "a preempted job eventually re-runs." Stated in prose, or pinned by one example
test, either kind can be believed true while a rare interleaving violates it. A property test *samples* the
input space and sails past the one adversarial schedule; a distributed race has failure traces no
hand-picked example hits. Worse, a mis-declared liveness invariant gets routed to a safety runtime that
structurally cannot see its violation, and reports nothing.

## Mechanism

Each invariant records a temporal-logic form in standard operator syntax — always (safety), infinitely
often, leads-to (liveness) — as a required field an invariant cannot be constructed without. From that
operator the model derives the verification tier and the checker: a safety property routes to an exhaustive
state-space search (a BFS over reachable states, or a model checker); a liveness property routes to a
temporal model checker. A lint asserts the routed checker matches the operator, so a leads-to body must
carry the leads-to token and a safety body must not. Reuse one mature formal engine rather than build a
parallel one.

## Engineering Consequences

The check is exhaustive within bounds: it either proves the invariant over every interleaving of the
modeled state space or returns a concrete counterexample trace, where a sampled test reports green on a
schedule it never visited. The cost is weight — a model checker is not a per-commit gate, so it runs
dev/CI-only, and the derived-tier routing reserves it for the hairy multi-actor races that earn it.

Reach for this when an invariant is safety-critical AND its state space is small enough to search. Don't
spend it on a property a fast property-test already covers — exhaustive search is a cost you pay for the
corners sampling misses, nothing more.

## Implementation Seam

The temporal-form field on each cross-service invariant plus the derivation from operator to tier; the
exhaustive runtimes it routes to — a temporal model checker and a bounded-BFS "simworld" over the reachable
state space; and the match lint that makes a mis-routed invariant a build error rather than a silent gap.

## Known Limitations

The proof is exhaustive only within bounds — the model is an abstraction, and a bug outside it is out of
scope, so the guarantee is only as strong as the model's fidelity to the real system. The form has to stay honest: a decorative temporal string no checker reads is worse than none, because it
looks verified and isn't.
