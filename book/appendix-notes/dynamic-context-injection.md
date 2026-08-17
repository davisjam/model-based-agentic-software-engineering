<!-- note-spread: 2 -->

**Intent** — Map the files an agent is about to touch to the exact constraints that govern those files —
lints, conventions, component boundaries, tests — and inject that subset into the agent's brief before it
writes code, moving detection left of the cheapest CI gate.

## Problem

The recurring failure is constraint under-specification at dispatch time. A coding agent lacks the tacit
knowledge an experienced engineer has of which rules apply to a given change, so it makes plausible edits
that violate them, then spends rounds discovering and repairing the violations — "pinball." A layered
validation hierarchy makes it worse: context is lost between where the agent authored the change and
where the failure surfaces. Across many concurrent agents, the wasted work multiplies.

<!-- note-fold -->

## Mechanism

One slicing operator runs in two directions. Forward (`files → constraints`): given the target files,
predict which constraints will apply and pull their declarations plus fix-hints — this powers
pre-briefing, either as brief-time auto-injection or an agent-discovery-time pull once the agent knows
what it will touch. Reverse (`diff → findings`): intersect checker output with the change's diff line
ranges to attribute which findings this change introduced — this powers CI self-heal, asking an agent to
fix only what it broke.

## Engineering Consequences

The applicable rules land in context whether or not the agent would have gone looking — push, not pull.
It is a change of status, relocating a rule from available to binding, because a brief is mandatory
reading by construction where a doc is optional reference. Forward injection stays advisory, though: it
raises salience and shifts the odds, but a downstream gate is still what guarantees the rule.

## Implementation Seam

A constraint-extraction tool for the forward slice and the diff-line-range attribution machinery for the
reverse, plus one adapter per file-addressable registry — the lint fleet's scope tags, the component
model, the banned-API list, the test corpus, the doc index. Each constraint must declare a file scope and
carry an actionable fix-hint, or it cannot be selected or acted on.

## Known Limitations

Garbage-in: a rule with no scope tag can't be sliced, and one with no fix-hint can't be acted on — the
mechanism depends on that discipline fleet-wide and does not create it. The relevance operator is itself
fallible: over-injection floods the brief with noise and lowers the salience it trades on, while
under-injection silently omits a governing rule. Each adapter must stay in sync with its registry, or the
sliced set drifts from truth.
