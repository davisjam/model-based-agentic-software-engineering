# Test-serializer (N=1 flock on `dotnet test`)

**Intent** — A host-level wrapper that serializes `dotnet test` to a **single writer** via an
exclusive flock, so concurrent agent worktrees on one machine don't saturate I/O and interfere with
each other's test runs.

| | |
|---|---|
| Summary | Serialize dotnet test to a single writer per host. |
| Target | Agent · **Mediators & resource locks** |
| Form | `regression` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking* — exclusive flock, N=1; the enforcer refuses a raw `dotnet test` from an agent-worktree CWD · bypass `ADA_TOOL_TEST_BYPASS_MEDIATOR=1` |

*Its place in the environment — the **canonical mechanism** for **MANAGE · Manage work, state, and resources**.*

## Motivation — the failure it kills

Several worktrees each running `dotnet test` on one host saturate CPU and disk and interfere (port
contention, shared build artifacts, I/O thrash), so tests **flake or hang** for reasons that have
nothing to do with the code under test. The failure is *false-flaky tests plus wall-clock blowup*, and
it recurs whenever two or more agents test at once, which under a fleet is most of the time. Worse, a
false flake sends an agent chasing a non-bug.

## Why it's not just "they're separate processes, let them run"

Separate processes still share **one host's** CPU, disk, and ports; parallel `dotnet test` contends
destructively regardless of process isolation. The serializer acquires an **exclusive flock before
invoking `dotnet test`** (N=1 writer) and, decisively, a `[ModuleInitializer]` **enforcer inside the
test assembly makes the un-mediated path impossible**: a raw `dotnet test` launched from an
agent-worktree CWD is *refused*. The distinction is *a mediated single-writer whose raw call is
structurally banned* versus *uncoordinated processes contending for a shared machine*. The ban makes
the serialization real rather than a convention agents forget under time pressure.

## Mechanism

The test serializer flocks a host-global lock, then runs `dotnet test`; a 30-minute wait cap fails
loud if the lock is stuck. `TestMediatorEnforcer` (a `[ModuleInitializer]`) refuses raw invocation
from agent-worktree CWDs. When the filter contains `Fuzz`/`Campaign`, coverage collection is
auto-appended. Adjacent heavy tools (build, tsc, pyright, …) route through the *sibling*
[build-serializer](build-serializer.md) instead, at M=8.

## Prerequisites

- **A host-global lock file** every worktree contends on (the single point of serialization).
- **An enforcer that can intercept the raw tool** (here a `[ModuleInitializer]` that runs before any
  test), so the mediated path is the *only* path.
- **A wait cap that fails loud**, so a stuck lock surfaces instead of hanging forever.

## Consequences & costs

- **Serialization is wall-clock cost.** N=1 means tests queue; a long run blocks every other worktree
  behind it. This is the deliberate trade — correctness of results over raw parallelism.
- **A stuck lock stalls everyone.** The 30-minute fail-loud cap bounds the damage but does not
  eliminate it.
- **The bypass is a hole.** `ADA_TOOL_TEST_BYPASS_MEDIATOR=1` exists for humans; misused, it
  reintroduces the contention.
- **Single-host assumption.** The lock coordinates one machine; it does nothing across hosts.

## Known uses

- The test serializer: the N=1 flock wrapper (+ auto-coverage for fuzz filters).
- `TestMediatorEnforcer`, a `[ModuleInitializer]` that refuses raw `dotnet test` from agent CWDs.
- `ADA_TOOL_TEST_BYPASS_MEDIATOR=1`, the audited human escape.

## Related mechanisms

- **Counterpart** — the `[ModuleInitializer]` enforcer (hard) holds the serializer's
  discipline in place: without the ban, the flock is just an unenforced convention.
- *See also (sibling)* — [build-serializer](build-serializer.md): the same mediator pattern at **M=8**
  instead of N=1. The pair illustrates the *lock-cardinality* choice (below).
- **Layer** — with [aggregate-compute-protection](aggregate-compute-protection.md), the three form the
  host-compute rationing tier.
