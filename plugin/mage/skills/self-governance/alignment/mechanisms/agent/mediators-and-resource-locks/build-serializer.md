# Build-serializer (M=8 semaphore)

**Intent** — A host-level **counting semaphore (M=8)** over the adjacent heavy-compute tools
(`dotnet build`, `tsc`, `csharp-query`, jedi lints, `pyright`), so concurrent worktrees get
parallelism up to the machine's capacity without oversubscribing it.

| | |
|---|---|
| Summary | Cap concurrent heavy builds with an M=8 host semaphore. |
| Target | Agent · **Mediators & resource locks** |
| Form | `validation` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking* — a byte-range semaphore caps concurrency at 8; five tool enforcers refuse the raw call |

*Its place in the environment — a **variant / known-use** of **Mediated Resource Admission**, under **MANAGE · Manage work, state, and resources**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-manage) shows how it folds.*

## Motivation — the failure it kills

The heavy build tools are the same shared-host hazard as `dotnet test`: N worktrees compiling,
type-checking, and running Roslyn queries at once saturate CPU and memory and slow *everyone*. But
unlike `dotnet test`, these tools are numerous and mostly parallel-safe, so the failure to avoid is
both *oversubscription* (too many at once melts the host) **and** *over-serialization* (N=1 would waste
cores and stall the fleet).

## Why it's not just "use the test-serializer for builds too" (N=1)

`dotnet test` is *mutually destructive* (port/artifact contention), so single-writer is correct there.
Builds are *parallel-safe but heavy* and far more frequent, so N=1 would leave most cores idle and
throttle throughput needlessly. The right primitive is a **bounded semaphore (M=8)**: allow
concurrency up to the host's capacity, cap it there. What decides the lock's cardinality? The
resource's contention profile: a single-writer lock for mutually-destructive work, a
bounded-concurrency semaphore for parallel-safe-but-heavy work. Same mediator pattern, different M.

## Mechanism

The build serializer holds a **byte-range semaphore** (M slots) on a shared host lock; the five
adjacent tools acquire a slot before running and release after. Per-run logs are written with
timestamps. Each of the five tools has an active enforcer that refuses the un-mediated call. The
*sibling* [test-serializer](test-serializer.md) handles `dotnet test` at N=1.

## Prerequisites

- **A counting-semaphore primitive** (here byte-range flock over M offsets).
- **An identified set of adjacent heavy tools** to route; anything left out leaks past the cap.
- **A per-tool enforcer** for each, so the mediated path is the only path.
- **A tuned M** appropriate to the host's core/memory budget.

## Consequences & costs

- **M is a fixed guess.** Eight is a static ceiling, not adaptive to host size or current load: too
  high oversubscribes a small host, too low wastes a big one.
- **Coverage is only as complete as the routed set.** A new heavy tool not wired through the semaphore
  silently escapes the cap.
- **Five enforcers to maintain.** Each tool's enforcer is a surface that can drift.
- **Log proliferation.** Per-run timestamped logs accumulate (by design, but they add up).

## Known uses

- The build serializer: the M=8 byte-range semaphore over the five tools.
- The five active per-tool enforcers (`dotnet build` / `tsc` / `csharp-query` / jedi / `pyright`).

## Related mechanisms

- *See also (sibling)* — [test-serializer](test-serializer.md): the same pattern at **N=1**. Together
  they are the worked example of choosing lock cardinality by contention profile (destructive ⇒ N=1;
  parallel-safe-but-heavy ⇒ M=8).
- **Layer** — with [test-serializer](test-serializer.md) and
  [aggregate-compute-protection](aggregate-compute-protection.md), the host-compute rationing tier.
