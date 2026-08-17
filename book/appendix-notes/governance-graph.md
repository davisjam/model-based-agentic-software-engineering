<!-- note-spread: 2 -->

**Intent** — Model the fleet's process-governance mechanisms themselves as a structured graph — each
mechanism a node tagged by the event it fires on and the shared resources it reads, writes, or locks; each
edge a *conflict* between two mechanisms over one resource — so a collision between two guardrails is caught
by construction, not at the moment they trip each other in production.

## Problem

A governed fleet accumulates guardrails: turn-end hooks, pre-commit checks, dispatch gates, host-level lock
mediators. Each earns its place alone. But two can place contradictory or contending demands on one shared
resource — a commit-set, an OS lock, the turn-end slot — and nothing sees the collision until a real
operation trips both. It recurs as the fleet grows, because every new mechanism is a new pair against every
existing one. Two case-study collisions show the shape: one path required a commit to take a squashed form
while a separate scope-check flagged out-of-brief changes on that *same* commit-set; and two hooks fired on
the *same* turn-end event with no declared order, each able to block. Both are invisible in any single
mechanism's code — they live in the interaction, and the interaction was drawn nowhere.

<!-- note-fold -->

## Mechanism

Each node names a mechanism and carries its firing event, its reads/writes/locks over a closed
shared-resource vocabulary, its output power, and its soft-versus-hard enforcement. The resource vocabulary
is the join key — conflicts flow *through* resources — and the turn-end slot and the context budget are
resources too, so hook-pileup falls under the same machinery as lock contention. Edges are conflicts in a
closed four-value taxonomy: contradiction, contention, ordering, and soft-versus-hard; each names the
resource, its type, and a resolution, and whether the edge is decidable-by-machine or needs-judgment is
*derived* from the conflict type. A query surface answers what fires on this event, what touches this
resource, and — the load-bearing one — whether a *proposed* mechanism is consistent, run before it is wired.
A drift lint re-resolves each node's code anchor and reddens when a mechanism is wired but absent.

## Engineering Consequences

This is a *second-order* governance mechanism. Every other mechanism in this appendix governs the product,
the models, or the fleet; this one governs **the controls themselves** — it models the interactions among
your guardrails so a collision between two of them is a finding at authoring time, not a surprise in
production. It is the structural counterpart to the governance-conversion discipline in Part 6: that
discipline turns a recurring failure into a control; this graph keeps the growing population of controls from
quietly fighting each other as it grows.

The decidable conflicts route to a sensor; the semantic ones route to a human prompt, so a lint never has to
decide whether two constraints on a commit-set actually compose. And checking a proposed mechanism against
the graph turns "caught at collision" into "caught at authoring."

## Implementation Seam

The governance-graph model in the fleet's model layer, its four-value conflict taxonomy with a derived
decidable-or-judgment nature, the check-new query that runs the deterministic checks against a proposed
mechanism, and the drift lint that anchors each node to its wired hook or mediator by symbol, not line.

## Known Limitations

The graph must not drift — a stale interaction model claims conflicts are covered when a mechanism changed
underneath it, so the drift lint is not optional. Resource granularity is a tuning surface: too coarse and
every pair sharing a broad token looks like a conflict; too fine and the graph is noise. The model describes; it does not mandate — it checks proposed mechanisms on request and hardens an edge
into a lint only where a collision recurs, lest the governance itself become a tower nobody wants.
