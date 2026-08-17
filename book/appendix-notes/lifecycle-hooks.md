<!-- note-spread: 1 -->

**Intent** — Bind a script to the agent runtime's lifecycle events — turn-stop, pre-compaction,
session-start, before-a-tool-call — so a step the operator keeps omitting at runtime fires
deterministically, whether or not anyone remembered it.

## Problem

Some recurring failures live not in the code an agent writes but in the loop that drives it: the operator
skipping a step at a predictable moment. Ending a turn with ratified work still queued. Compacting
context without first writing a hand-off. Opening a session without reading the alert backlog. Editing
outside the sanctioned worktree. A lint cannot reach these — there is no source artifact to analyze, and
the omission happens at runtime. A house-rule only aims a probabilistic operator, and it rots, because
the step gets skipped exactly when attention is thin.

## Mechanism

The runtime exposes named lifecycle events and a surface to register scripts against them. A hook is a
script bound to one event; the runtime invokes it and reads its result. This splits the two halves of
enforcement a lint fuses. The firing is hard, guaranteed by the runtime. The payload is either a hard
block that denies the action, or soft guidance re-injected into the agent's context that aims the next
decision without compelling it.

## Engineering Consequences

The check runs whether or not anyone remembered; the reflex case is hard delivery of soft guidance — the
same house-rule fired exactly at the decision point, every time. Two design constraints follow: keep the
check cheap, because it fires on every occurrence of the event, and make a guidance hook fail-open, since
a crash must not wedge the loop. A soft payload must also instrument its own firing: it dies silently
otherwise — ceasing to fire unnoticed, or over-firing into tune-out — so it ships firing telemetry and
lives on a measured leash with a written pull condition.

## Implementation Seam

Scripts registered against named runtime events, plus a build-time output-conformance check that
validates every wired hook against the runtime's actual schema. Without that check a hook validated only
against its own idea of the contract can emit a shape the runtime drops, pass its own test green, and run
wired-but-dead in production — the worst fail-open, since it looks wired and does nothing.

## Known Limitations

It fires on every event, not only when needed, so the tax is constant unless the check stays cheap. A
guidance hook can be ignored — only the blocking variant compels. A buggy hook is a loop-level outage: a
misfiring block, or a guidance hook that crashes without fail-open, stalls the whole session. And it can
nag — a hook that misreads its state cries wolf and gets tuned out. As reflection facets accrue, firing
each as its own hook is the alarm-fatigue trap by another door; consolidate them into a single
tempo-gated reflection ([appendix: reflection-facet-substrate]).
