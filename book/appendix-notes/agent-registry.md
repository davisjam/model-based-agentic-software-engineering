<!-- note-spread: 1 -->

**Intent** — An append-only registry, dual-written by every lifecycle tool, that is the authoritative
record of which agents are in flight, so cleanup, tombstone, and merge decisions read a recorded fact
instead of guessing from filesystem timestamps.

## Problem

With a fleet of concurrent agents living in worktrees, *"which agents are live right now?"* drives every
reclaim decision: cleanup, tombstoning, merge readiness. Answer it by scanning worktree directories and
comparing modification times and you get a heuristic that races with live agents — an agent mid-work
looks identical to a stale one and has its worktree destroyed under it. The failure is unsafe reclaim of
live work, and it recurs on every cleanup pass.

## Mechanism

The dispatch wrapper's prepare step dual-writes an append-only registry log and a per-agent marker cache
at dispatch; every lifecycle tool updates both. The stale-cleanup path queries a three-gate chain —
registry, then marker, then git-lock — before removing anything. Tombstone and worktree-clean refuse to
operate on an agent whose marker exists. The registry is authoritative; the marker cache is a fast index
the registry wins over on any divergence.

## Engineering Consequences

Liveness becomes a lookup against a recorded fact, not an inference, and a recorded fact cannot race the
way an inferred one does. The whole guarantee rests on universal dual-write: a side-door mutation that
changes lifecycle without writing the registry silently brings the timestamp race back, so the record is
only as strong as its weakest writer. Because it is consulted before every destructive op, the record is
protective only where a gate actually queries it.

## Implementation Seam

Two artifacts carry the pattern: the append-only registry log plus its per-agent marker cache, and the
destructive-op gates (cleanup, tombstone, worktree-clean) that query them before acting. The dispatch
wrapper's prepare step is the single point that seeds both writes.

## Known Limitations

Completeness rides on dual-write discipline, and it is fragile: one tool that mutates lifecycle without
writing the registry reintroduces the exact race the registry removes. The append-only log grows
unboundedly and needs rotation. Registry and marker can diverge if one write fails; "registry
authoritative" resolves it, but a tool that trusts the cache alone can be briefly misled.
