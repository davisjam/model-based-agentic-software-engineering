<!-- note-spread: 1 -->

**Intent** — A deploy pipeline that escalates *canary → smoke → promote*, blocking promotion to production
until each cheaper stage passes on a traffic-free revision, so a bad build is caught before users see it, not
after.

## Problem

Shipping a build straight to production means a regression lands on users; the failure *is* the incident. This
is standard practice everywhere, but it matters far more at agentic velocity, precisely because deploys are
frequent and agent-initiated. The more often you ship, the more often an un-gated bad build reaches users.

## Mechanism

Version bump → build → tag a canary revision that takes no production traffic → smoke-test against the canary
URL → promote to production on green → GC old revisions. A pre-launch predicate gates the whole thing on
cheaper signals so a doomed deploy is never started: confirm lints are green, no known flaky class is live,
and the changed-since-main lint pass is green before paying for build minutes. Heartbeats emit liveness during
the long phases.

## Engineering Consequences

Rollback is reactive and user-visible — by the time you roll back, users have already hit the break. Staged
gates are proactive: the canary is smoke-tested on a revision no user can reach, so the break is caught before
promotion. The pre-launch predicate pushes the gate earlier still, refusing to *launch* a deploy that will
predictably fail rather than spending build minutes to discover it. Being standard practice, the value here is
defense-in-depth, not novelty.

## Implementation Seam

The pipeline needs canary capability — deploying a revision that takes no production traffic — plus a smoke
suite that meaningfully exercises the canary URL against real dependencies, not stubs. It needs promotion and
rollback primitives with revision GC, and a pre-launch green signal (lints, changed-since-main, flaky-class
check) standing as the pre-launch predicate.

## Known Limitations

Staging costs real build minutes; the pre-launch predicate exists to avoid spending them on a deploy that was
never going to pass. Smoke is not full coverage — a thin suite lets real breaks through the gate, since the
canary is only as good as what the smoke actually checks. The gate infrastructure can itself drift: validating
via the deploy pipeline assumes the pipeline is sound, and a drifted canary or smoke path gives false
confidence. Each stage also adds wall-clock before users get the change.
