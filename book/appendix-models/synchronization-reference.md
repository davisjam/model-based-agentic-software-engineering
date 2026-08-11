A typed registry that models the system's synchronization behavior — every OS-level lock, which shared
resource it guards, and the required acquisition ordering — so concurrency contracts are declared and
checkable, not tribal. The Part-II mainline shows one ordering invariant; the full treatment is here.

**(a) Quality property.** Two, both locally visible but globally difficult to establish.

- **Lock coverage** — *is every OS lock in the codebase declared, and is what it guards known?* An undeclared
  lock is one nobody can reason about; the coverage lint makes it a build failure.
- **Lock-order consistency** — *does any acquisition invert a declared ordering?* The declared ordering graph
  answers "which locks, in what order" before the code runs, so an inverted acquisition fails at author time
  instead of hanging in production. This prevents the deadlocks that arise from **declared-order inversions**;
  it does not by itself prove global deadlock-freedom, which would need cycle detection over the whole graph.

**(b) Structure.** Three record kinds compose the registry.

- **`SyncLock`** — one OS primitive: its lock-file path, its cap (1 for a mutex, M for a semaphore), the
  resource it guards, its bypass-env, its audit-log.
- **`LockAcquirer`** — one declared acquisition site: where in the code a lock is taken, or a declared "takes
  none" with a rationale.
- **`LockOrdering`** — a before/after constraint between two locks, with a rationale. The set of these is the
  ordering graph the deadlock lint walks.

One `SyncLock` is acquired at many `LockAcquirer` sites and constrained by many `LockOrdering` edges.

**(c) Representative figure.** An ER schema — three related record kinds with crow's-foot cardinality: a
`SyncLock` and its guarded resource, the `LockAcquirer` sites that take it, and the `LockOrdering` edges that
constrain their sequence. (Reuse `assets/sync-model-structure.svg`.)

**(d) Invariants.**

| Invariant | Temporal shape | How it is checked |
|---|---|---|
| Every real lock call site is a declared acquirer | *□P* (safety) | Coverage lint scans the lock call sites; each must be declared or carry a "not a sync lock" rationale. |
| No acquisition inverts a declared ordering | *□P* (safety) | Ordering lint walks each code path's acquisition sequence against the ordering graph; an out-of-order acquire is a finding. |
| Every exempt site carries a rationale | *□P* (safety) | The closed set of exempt rationales — an unexplained exemption fails the coverage lint. |

The ordering lint does genuine graph reasoning. The shape, in schematic pseudocode (the production checker
reasons over transitive orderings and per-path acquisition):

```python
# Schematic — illustrates the inversion check on one acquisition path.
# The production lint reasons over the transitive ordering graph.
import sys

# Declared ordering: a lock in `before` must be acquired before its `after` lock.
ORDERINGS = [("db-lock", "cache-lock")]      # db before cache, always

def ordering_lint(acquire_sequence: list[str]) -> list[str]:
    """A held-lock acquiring one that must precede it is an inversion (deadlock risk)."""
    findings, held = [], []
    for lock in acquire_sequence:
        for before, after in ORDERINGS:
            if lock == before and after in held:
                findings.append(f"acquired '{before}' while holding '{after}' — order inverted")
        held.append(lock)
    return findings

if __name__ == "__main__":
    findings = ordering_lint(walk_acquisitions())   # a code path's acquisition order
    for f in findings:
        print(f"LOCK-ORDER: {f}")
    sys.exit(1 if findings else 0)
```

**(e) Derivation direction.** *Model-from-code.* The coverage lint scans the real lock call sites and requires
each to be a declared acquirer, so the code is ground truth and the model is the checked view. The join key is
the lock `path` (which lock a site takes) and the acquirer `site` (where the acquisition happens).

*Also seen in:* the placement models — a lock is held per-host, so where it runs matters.
