# Sentinel first-commit early-abort

**Intent** — A health check on an agent's *first* commit that surfaces orphaned-worktree and
broken-substrate failures at minute zero, before the agent burns its whole budget producing work
that can never land.

| | |
|---|---|
| Summary | Abort a broken agent at its first commit, not its last. |
| Target | Agent · **Gates & merge-train** |
| Form | `quality-gate` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking* — aborts the run on a failed substrate assertion |

*Its place in the environment — a **variant / known-use** of **Staged Admission Gates**, under **ADMIT · Admit or reject changes**. Preserved here for its technical texture.*

## Motivation — the failure it kills

An agent dispatched into a subtly broken worktree (a missing marker file, stale substrate, an empty
submodule, a wrong branch) will work happily for 30–60 minutes and then fail at commit, or produce
work that cannot be rebased or cherry-picked. The failure is **invisible until the end**, so its cost
is the *entire dispatch*: the whole agent budget spent on unlandable work. It recurs whenever the
substrate drifts between dispatch and consumption, and compounds because each occurrence wastes a full
run, not a small step.

## Why it's not just "let it fail at merge"

Failing at merge is failing *late*, after the agent has spent its budget. The sentinel moves the
substrate-health check to the **first commit (t≈0)**, converting a 60-minute waste into a one-minute
abort. It validates on the **production path** (the actual brief, the real dispatch), not a
pin-test in isolation, so it catches the invisible feedback loops (caps, scope filters, priority
inversions) that only manifest when the substrate runs end-to-end against real work. Failing at merge does surface
the break, but only at t=60, after the budget is spent. The sentinel surfaces the same break at t=0 on
the real path, while the run still costs a minute to abandon.

## Mechanism

On the agent's first commit, the sentinel check asserts the substrate is healthy (worktree
root matches, per-agent marker exists, branch is the expected `worktree-agent-<id>`, CWD is under the
worktree) and aborts the run if any assertion fails. It is the commit-time twin of the *boot-time*
[[dispatch-self-check]] an agent runs as its first step: boot-check catches
a bad start, sentinel catches a substrate that broke *after* boot. It lands AUDIT-ONLY
and is promoted to BLOCKING after a session of clean events.

## Prerequisites

- **A detectable "first commit" moment** to hang the check on.
- **Substrate-health predicates** that are cheap and total (marker present, branch correct, CWD under
  worktree); the lifecycle substrate must expose checkable facts.
- **An abort path** that stops the run cleanly rather than letting it limp on.

## Consequences & costs

- **It only catches what it asserts.** The health predicates are a hand-maintained set; a new failure
  mode not in the predicate list still slips to t=60. The check is as good as its assertions.
- **A false abort kills a healthy agent.** An over-strict or drifted predicate blocks good work; the
  AUDIT-ONLY → BLOCKING migration exists precisely to buy confidence before it can do that.
- **First-commit latency.** Small, but it is on the critical path of every agent's first commit.

## Known uses

- The sentinel check: the first-commit substrate assertion + early abort.
- The [[dispatch-self-check]]: the boot-time sibling.
- The sentinel-check discipline: land a substrate check at the first commit that runs end-to-end against
  the real brief (AUDIT-ONLY → BLOCKING).

## Related mechanisms

- **Layer** — runs at the same commit-time stair as [pre-commit-hook](pre-commit-hook.md): this guards
  *substrate* health, the hook guards *content* correctness.
- **Counterpart** — the boot-time [[dispatch-self-check]]: boot-check at
  t=0-start, sentinel at first-commit; together they bracket the window a substrate can break in.
- **Enabler** — the [agent-registry](../lifecycle-and-observability/agent-registry.md) markers (Lifecycle & observability family) are the facts this check
  reads. Without that substrate there is nothing to assert against.
