# Agent registry (append-only log + marker cache)

**Intent** — An append-only registry, dual-written by every lifecycle tool, that is the *authoritative*
record of which agents are in flight, so cleanup, tombstone, and merge decisions read a fact instead
of guessing from filesystem timestamps.

| | |
|---|---|
| Summary | Authoritative record of which agents are live right now. |
| Target | Agent · **Lifecycle & observability** |
| Form | `observability` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *signal/record* — every lifecycle tool dual-writes; destructive-op gates query it before acting |

*Its place in the environment — the **canonical mechanism** for **MANAGE · Manage work, state, and resources**. The variants and known uses that fold under it are gathered on the [construction-kit page](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-manage).*

## Motivation — the failure it kills

With a fleet of concurrent agents living in worktrees, *"which agents are live right now?"* is the
central question for every reclaim decision: cleanup, tombstoning, merge readiness. Answer it by
scanning worktree directories and comparing mtimes and you get a **heuristic that races with live
agents**: an agent mid-work can look identical to a stale one and have its worktree destroyed under
it (the worktree-destruction-mid-flight incident). The failure is *unsafe reclaim of live work*, and
it recurs on every cleanup pass.

## Why it's not just "list the worktree dirs and check mtimes"

Directory-listing plus mtime is an *inference* about liveness, and it races: nothing in a timestamp
tells you whether a process is still working. The registry is an **authoritative append-only log that
every lifecycle tool dual-writes** (the JSONL record plus a fast per-agent marker cache), so "is this
agent live?" becomes a **lookup against a recorded fact**, not a guess from the filesystem. The mtime
heuristic is the alternative that fails, and it failed concretely: it destroyed in-flight work, which is
why it was retired. A recorded fact cannot race the way an inferred one does.

## Mechanism

The dispatch wrapper's prepare step dual-writes the JSONL registry and the per-agent marker cache at
dispatch; lifecycle tools update both. `cleanup-stale` queries a **three-gate chain** (registry-gate,
then marker-gate, then git-lock-gate) before removing anything. Tombstone and worktree-clean **refuse**
to operate on an agent whose marker exists (the live-worktree guard). The registry is authoritative; the
marker cache is a fast index that the registry wins over on any divergence.

## Prerequisites

- **Universal dual-write.** Every lifecycle tool writes the registry; a side-door mutation that skips
  it reintroduces the exact race the registry removes.
- **An append-only log plus a fast cache**, and a rule for which wins on divergence (registry).
- **Destructive-op gates that query it** before acting; the record is only protective if consulted.

## Consequences & costs

- **The whole registry rests on dual-write discipline, and it's fragile.** One tool that mutates lifecycle without
  writing the registry silently brings the mtime-race back; the guarantee is only as strong as the
  weakest writer.
- **Append-only growth.** The JSONL grows unboundedly and needs rotation.
- **Registry/marker divergence** is possible if one write fails; resolved by "registry authoritative,"
  but the cache can briefly mislead a tool that trusts it alone.

## Known uses

- An append-only registry log + per-agent marker cache, dual-written by the dispatch wrapper's prepare step.
- The 3-gate `cleanup-stale` chain (registry → marker → git-lock).
- The live-worktree guard (never operate on an agent whose marker exists); the dedup-via-registry pattern.

## Related mechanisms

- **Enabler** — [merge-train-mis-batching](../gates-and-merge-train/merge-train-mis-batching.md) reads
  it for worktree readiness; [sentinel-first-commit](../gates-and-merge-train/sentinel-first-commit.md)
  reads its markers for substrate health.
- **Consumer** — [tombstone-commits](tombstone-commits.md) checks live markers before writing a close
  record; cleanup-stale consults it before removing a dir.
- **Counterpart** — it *replaced* the mtime heuristic (now retired): the authoritative record is the
  hard fact that the racy signal could never be.
