# Deploy heartbeats + stale-worker detection

**Intent** — Periodic `[heartbeat] phase=X elapsed=Ns` emissions from long-running deploys, plus a
stale-worker sweep, so a *hung* deploy or worker is distinguishable from a merely *slow* one.

| | |
|---|---|
| Summary | Periodic liveness so a hung deploy differs from a slow one. |
| Target | Agent · **Lifecycle & observability** |
| Form | `observability` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *signal* — emitted every 30 s; non-blocking (the concurrency guard beside it is blocking) |

*Its place in the environment — a **variant / known-use** of **Fleet Observability Surface**, under **MANAGE · Manage work, state, and resources**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-manage) shows how it folds.*

## Motivation — the failure it kills

A long deploy (25–40 min) or a worker that stalls is **indistinguishable from progress** without a
liveness signal: you cannot tell "slow build" from "hung process." The failure is *blind waiting and
undetected hangs*: the orchestrator either kills a healthy-but-slow deploy or waits forever on a dead
one. It recurs on every long-running operation.

## Why it's not just "check the process is alive / wait for it to finish"

Process-alive does not mean *progressing*; a deadlocked process is alive. Waiting-for-finish gives no
mid-flight signal at all. Heartbeats emit **phase + elapsed every 30 s**, so both *liveness* and
*progress* (is the phase advancing?) are observable, and the stale-worker sweep flags a worker that has
stopped heartbeating. Can a deploy brief tell a slow build from a hung one by asking whether the process
exists? No. A hung process exists too. It can only tell them apart by watching the phase advance, which is
what the heartbeat gives it.

## Mechanism

The deploy phase loop emits `[heartbeat] phase=X elapsed=Ns` to stderr every 30 s (grep the deploy log
to confirm liveness). A startup concurrency guard refuses a second overlapping deploy (the blocking
sibling of the signal). The stale-worker sweep detects workers that have stopped emitting and flags
them for cleanup.

## Prerequisites

- **A phase loop with a periodic emit.** The operation must be structured into observable phases.
- **A parseable heartbeat format** (`phase=` / `elapsed=`) a consumer can grep.
- **A consumer that knows the expected cadence**, so "no heartbeat for N×30 s" reads as stale.

## Consequences & costs

- **Liveness ≠ correctness.** A deploy can heartbeat steadily while still failing — the signal proves
  it is *moving*, not that it is *right*.
- **Cadence knowledge is required.** Judging staleness needs the consumer to know the 30 s cadence;
  without that the signal is just noise.
- **Granularity + noise.** 30 s resolution can miss short hangs, and the heartbeat lines add log volume.

## Known uses

- The `[heartbeat] phase=X elapsed=Ns` emissions from the deploy phase loop.
- The startup concurrency guard (refuses overlapping deploys).
- The stale-worker detection sweep.

## Related mechanisms

- *See also (sibling)* — [agent-registry](agent-registry.md), [typed-event-bus](typed-event-bus.md):
  the fleet's other signal surfaces; heartbeats are the deploy-specific one.
- **Layer** — supports [staged-deploy-gates](../gates-and-merge-train/staged-deploy-gates.md): it is
  the liveness signal *over* the deploy those gates run.
