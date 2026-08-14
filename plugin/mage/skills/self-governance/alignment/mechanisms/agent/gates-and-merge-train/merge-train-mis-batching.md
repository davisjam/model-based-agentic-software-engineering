# Merge-train MIS batching

**Intent** — A merge-train that lands the largest set of *non-conflicting* agent worktrees per tick by
computing a **Maximum Independent Set** over their file footprints, so many agents' work merges in one
conflict-free pass instead of thrashing sequentially.

| | |
|---|---|
| Summary | Land non-conflicting worktrees together via a maximum independent set. |
| Target | Agent · **Gates & merge-train** |
| Form | `quality-gate` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) — the batch is selected by a graph predicate, not by hope-and-retry |

*Its place in the environment — a **variant / known-use** of **Staged Admission Gates**, under **ADMIT · Admit or reject changes**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-admit) shows how it folds.*

## Motivation — the failure it kills

With 6–8 agents committing concurrently, a naïve *sequential* merge serializes all of them and
conflicts thrash: each merge risks colliding with the last, and the throughput of the whole fleet
collapses toward one-at-a-time. Hot-spot files that many agents touch (the merge tool itself,
`CLAUDE.md`, shared config) become bottlenecks that stall everything behind them. The failure recurs
every merge tick and worsens as the fleet grows: more agents, more collisions.

## Why it's not just "merge them one by one" (or "let git sort the conflicts")

Sequential merge is O(n) wall-clock and conflict-prone; "let git sort it" turns every tick into a
manual conflict-resolution session. MIS batching instead builds a **conflict graph** (worktrees are
nodes, a shared file is an edge) and computes the largest set of worktrees with **disjoint file
footprints**, landing that set together. The batch is **non-conflicting by construction**: because no
two members touch the same file, they cannot collide. Graph independence proves the batch conflict-free
before it lands; sequential merge only hopes each merge misses the last one's files, and retries when it doesn't.

## Mechanism

Each tick: build the conflict graph from per-worktree file footprints, compute an independent set,
land that set this tick, defer the rest to the next. Throughput is maximized upstream, at dispatch:
the scheduling discipline launches waves with **disjoint footprints** so the MIS is large, and warns that
hot-spot files (touched by many agents) cap the MIS to size 1 no matter how many agents are ready.
Landed commits are checked by patch-id / ancestry reachability.

## Prerequisites

- **Known per-worktree file footprints**: you must be able to say which files each worktree changed.
- **A conflict predicate** (shared file ⇒ edge) and a **(greedy) MIS routine**.
- **Reachability / patch-id checks** so a "landed" claim is verifiable.
- **Footprint discipline at dispatch**: the orchestrator has to *plan* disjoint waves for the MIS to
  pay off; the mechanism pushes work upstream into scheduling.

## Consequences & costs

- **MIS is approximate.** The batch is a greedy independent set, not provably maximum every tick: good
  enough, but not optimal.
- **Hot-spot files hard-cap throughput.** If eight agents all touch one file, the MIS is 1 regardless
  of the algorithm; the win depends entirely on dispatch-side footprint disjointness.
- **It moves complexity upstream.** The orchestrator must now think about footprints when composing
  waves; a mis-declared footprint can let a real conflict slip into a batch.

## Known uses

- The merge-train batcher: the conflict-graph MIS batcher.
- The disjoint-footprint dispatch recipe (compose waves with non-overlapping file sets).
- Patch-id / ancestry reachability verification of landed commits.

## Related mechanisms

- **Layer** — the cron → merge-train stair, downstream of [pre-commit-hook](pre-commit-hook.md) /
  [sentinel-first-commit](sentinel-first-commit.md) and upstream of [staged-deploy-gates](staged-deploy-gates.md).
- **Consumer** — reads the [agent-registry](../lifecycle-and-observability/agent-registry.md) (Lifecycle & observability family) to know which worktrees
  are ready to land.
- **Enabler** — disjoint-footprint dispatch discipline makes the batch large. The
  algorithm alone cannot beat a hot-spot file.
