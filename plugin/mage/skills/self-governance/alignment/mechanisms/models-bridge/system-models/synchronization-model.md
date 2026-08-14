# Synchronization model (meta-sync)

**Intent** — A typed registry that models the system's **synchronization behaviour** — every OS-level
lock (`flock`/`lockf`), which shared resource it guards, and the required acquisition *ordering* — so
concurrency contracts are declared and checkable, not tribal.

| | |
|---|---|
| Summary | A registry of every lock, what it guards, and its ordering. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — a structured model *held true* by the lock-coverage lint (every `fcntl.flock` site must be declared or annotated) |
| Derivation | `model-from-code` — induced from the code, reconciled at build |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-know) shows how it folds.*

## Motivation — the failure it kills

A fleet of agents on one host contends over shared resources through OS locks — the test-serializer's
`dotnet test` flock, the build-serializer semaphore, the [[aggregate-lint-runner|whole-repo lint mutex]], the commit-slave serializer.
Left undocumented, two failures lurk: an *undeclared* lock nobody knows guards what, and an *inverted
acquisition order* between two locks that deadlocks. Both are invisible in the code and catastrophic at
runtime, and they recur as new locks are added.

## Why it's not just "just use flock where you need it"

Ad-hoc `flock` calls scattered across tools give no answer to "which locks exist, what do they guard,
in what order must they be taken?" — so a deadlock-inducing ordering can't be *detected*, only suffered.
The synchronization model **declares** each lock (`SyncLock`: path, cap, model, bypass-env, audit-log),
each acquisition site (`LockAcquirer`), and each ordering constraint (`LockOrdering`). A coverage
lint can then flag an *undeclared* `flock`, and an ordering lint can flag an *inverted* acquisition against
the declared graph. A declared model lets a lint answer "which locks exist and in what order" before the
code runs, so an inverted acquisition fails at author time. Scattered locks answer that question only by
deadlocking in production, where the lesson arrives too late to act on.

## Mechanism

The [[synchronization-registry]] composes three records — `SyncLock` (one OS primitive), `LockAcquirer`
(one declared acquisition site, or `lock="none"` with a rationale), `LockOrdering` (before/after with
rationale). A coverage lint scans the `fcntl.flock`/`lockf` call sites and requires
each to be declared or carry a `# noqa: not-a-sync-lock` annotation; an ordering lint walks the
declared `ORDERINGS` + call-graph to catch inverted acquisition.

## Prerequisites

- **A typed lock/acquirer/ordering schema** covering the three record kinds.
- **A coverage lint** over the real `flock` call sites (so undeclared locks are caught).
- **An ordering constraint graph** the lint can check acquisition against.

## Consequences & costs

- **Every new lock is a registry entry.** An undeclared `flock` fails the coverage lint (deliberately).
- **The ordering graph must be maintained.** A missing edge lets a real inversion through.
- **Exempt sites need a rationale.** The closed-set `EXEMPT_RATIONALES` is a small carve-out surface.

## Known uses

- The [[synchronization-registry]] — the `SyncLock` / `LockAcquirer` / `LockOrdering` records for the dev-time locks.
- The sync-coverage lint (undeclared-`flock` gate) + the ordering-constraint lint (deadlock-risk gate).

## Related mechanisms

- **Bridge** — the agent fleet's [mediators](../../agent/mediators-and-resource-locks/test-serializer.md)
  *acquire* these locks (agent side) ◀──▶ the model *governs* the concurrency contracts the codebase
  must honour (product side).
- **Counterpart** — [drift-parity-gates](drift-parity-gates.md): the coverage/ordering lints that hold
  the model true.
- *See also* — [concurrency-contracts](concurrency-contracts.md): the single-writer / mediator side of
  the same concurrency story.
