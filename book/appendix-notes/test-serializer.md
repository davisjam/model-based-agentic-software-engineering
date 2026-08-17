<!-- note-spread: 1 -->

**Intent** — A host-level wrapper that serializes the test runner to a single writer via an exclusive flock,
so concurrent agent worktrees on one machine don't saturate I/O and interfere with each other's test runs
(our instance: an N=1 flock on `dotnet test`).

## Problem

Several worktrees each running the test runner on one host saturate CPU and disk and interfere — port
contention, shared build artifacts, I/O thrash — so tests flake or hang for reasons that have nothing to do
with the code under test. The failure is false-flaky tests plus wall-clock blowup, and it recurs whenever two
or more agents test at once, which under a fleet is most of the time. Worse, a false flake sends an agent
chasing a non-bug.

## Mechanism

The serializer acquires an exclusive flock on a host-global lock before invoking the test runner (N=1 writer),
then runs it; a 30-minute wait cap fails loud if the lock is stuck. A module-initializer enforcer inside the
test assembly makes the un-mediated path impossible: a raw test invocation launched from an agent-worktree
working directory is refused, so the mediated path is the only path. When the filter names a fuzz or campaign
run, coverage collection is auto-appended. Adjacent heavy tools — build, compiler, type-checker — route
through a sibling serializer at a higher lock cardinality.

## Engineering Consequences

The ban makes the serialization real rather than a convention agents forget under time pressure: separate
processes still share one host's CPU, disk, and ports, so process isolation alone does not prevent destructive
contention. The distinction is a mediated single-writer whose raw call is structurally banned, versus
uncoordinated processes contending for a shared machine. The deliberate trade is correctness of results over
raw parallelism.

Use this when concurrent workers share one un-isolable host resource. Don't use it as a substitute for real
isolation where isolation is available — a flock is a queue, not a sandbox.

## Implementation Seam

Three parts carry the pattern: a host-global lock file every worktree contends on as the single point of
serialization; an enforcer that can intercept the raw tool — here a module initializer that runs before any
test — so the mediated path is the only path; and a wait cap that fails loud, so a stuck lock surfaces instead
of hanging forever. An audited environment-variable escape exists for humans.

## Known Limitations

Serialization is wall-clock cost: N=1 means tests queue, and a long run blocks every other worktree behind it.
A stuck lock stalls everyone — the fail-loud cap bounds the damage but does not eliminate it. The human bypass
is a hole; misused, it reintroduces the contention the serializer exists to kill. The lock coordinates one machine only; it does nothing across hosts.
