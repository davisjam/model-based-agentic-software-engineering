<!-- note-spread: 1 -->

**Intent** — A library of documented, situation-keyed decision procedures — *when situation X arises, take
these steps in this order* — that agents and orchestrators consult instead of reasoning from scratch, so a
recurring operational situation (a broken deploy, a wedged cron, a stuck worktree, a chicken-and-egg
recovery) gets a consistent, pre-reasoned, incident-tested response.

## Problem

Operational situations recur: a deploy fails a known way, a cron loop can't self-recover, a worktree is
destroyed mid-flight, an alert gate deadlocks. Each time, an agent under incident pressure re-derives a
response from first principles and gets the sharp edges wrong. A flailing reset destroys landed work, a
naive cron restart re-enters the same loop, a "cleanup" removes a live worktree. The response comes out
inconsistent and error-prone, and the cost lands hardest exactly when time is shortest.

## Mechanism

Each playbook names a triggering situation, the ordered response steps, and the anti-pattern reflexes to
avoid — the reset that destroys, the restart that loops. Playbooks are cross-referenced two ways: from a
terse rule index that points at the long-form procedure, and from the substrate that emits the triggering
signal, so the observability surface for a topic carries baseline-healthy, what-looks-wrong, and *which
playbook to open*. The orchestrator is instructed, at the trigger, to consult the relevant playbook rather
than improvise.

## Engineering Consequences

The correct steps are written down and discoverable at the moment they are needed, reasoned once when no
incident was burning, so the response encodes hard-won judgment instead of a guess made under pressure. A
playbook sits closer to a reusable skill than to prose documentation: it names the trigger, gives the
ordered steps, and lists the reflexes to avoid. The leverage is entirely discoverability plus habit — the
procedure has to be findable at the trigger, or it is never opened.

## Implementation Seam

The per-situation entry carries a fixed shape: the triggering question, the inspect command, a quantified
baseline-healthy, and a *what-looks-wrong → what-it-means → what-to-do* row that includes the deadlock or
wedge escape where a substrate can get stuck. Each playbook needs a home plus cross-references from the rule
index and from the signal that triggers it. Add one entry per signal the substrate emits.

## Known Limitations

The mechanism is soft: a playbook informs, nothing forces the agent to open or follow it. Playbooks rot —
when the substrate changes, a playbook whose steps aren't updated actively mis-directs the response, worse
than no playbook at all. One written for a retired failure mode is dead weight. Ultimately, a playbook is not
prevention: a situation that recurs often enough should be designed out or gated by a hard sensor, not
merely documented.
