<!-- note-spread: 1 -->

**Intent** — A structured registry that models the system's synchronization behaviour: every OS-level
lock, the shared resource it guards, and the required acquisition ordering, so concurrency contracts are
declared and checkable rather than tribal.

## Problem

A fleet of agents on one host contends over shared resources through OS locks — the test-runner
serializer, the build semaphore, the whole-repo lint mutex, the commit serializer. Left undocumented,
two failures lurk: an *undeclared* lock nobody knows guards what, and an *inverted acquisition order*
between two locks that deadlocks. Both are invisible in the code and catastrophic at runtime, and they
recur as new locks are added.

## Mechanism

The registry composes three records — one per OS lock primitive (its path, its cap, its bypass, its
audit log), one per acquisition site (or a declared "none" carrying a rationale), one per ordering
constraint (a before/after edge with a rationale). A coverage lint scans the real lock call sites and
requires each to be declared or carry a "not a sync lock" annotation. An ordering lint walks the declared
edges plus the call graph to catch an inverted acquisition before the code runs.

## Engineering Consequences

A declared model lets a lint answer "which locks exist, and in what order must they be taken?" at author
time, so an inverted acquisition fails then rather than deadlocking in production, where the lesson
arrives too late to act on. The cost is that every new lock becomes a registry entry — an undeclared lock
fails the coverage lint deliberately — and the ordering graph must be maintained, since a missing edge
lets a real inversion through. Exempt sites carry a rationale drawn from a small, closed carve-out set.

## Implementation Seam

Two artifacts carry the pattern: the registry of lock, acquirer, and ordering records, and its two lints
— the coverage lint over the real lock call sites and the ordering-constraint lint over the declared
graph. The model is induced from the code and reconciled at build, so it tracks the locks that exist
rather than an aspirational list.

## Known Limitations

Coverage rides on the lint seeing every lock site; a site the lint cannot reach stays undeclared and
unmodelled. The ordering graph is only as complete as its declared edges — an unstated ordering is an
unchecked one. Its scope is the OS-lock layer — which locks exist and in what order they are taken — not the higher-level
*mediator & single-writer contracts* that declare who may run a call and how many at once; that is a
separate DECLARE surface layered above it.
