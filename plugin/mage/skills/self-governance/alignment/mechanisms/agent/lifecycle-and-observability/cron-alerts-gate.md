# Cron-alerts gate

**Intent** — A gate that **blocks new orchestrator work-dispatch** while an unresolved HIGH-severity
cron alert exists, forcing the orchestrator to ack or resolve it before piling more work onto a
possibly-broken substrate.

| | |
|---|---|
| Summary | Block new dispatch while a HIGH cron alert is unresolved. |
| Target | Agent · **Lifecycle & observability** |
| Form | `observability` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking* — refuses new dispatch, worktree creation, merge-train run/stage/attest, and new-brief creation · resolved by an alert-resolving dispatch |

*Its place in the environment — a **variant / known-use** of **Staged Admission Gates**, under **ADMIT · Admit or reject changes**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-admit) shows how it folds.*

## Motivation — the failure it kills

The cron substrate (merge-train, tombstoning, retries) can break silently. If the orchestrator keeps
dispatching new work *on top of* a broken substrate, it piles work into a system that cannot land it,
compounding the mess. The failure is *dispatching into a known-broken substrate*, and it recurs
whenever cron breaks and the orchestrator doesn't stop.

## Why it's not just "the event bus already surfaces the alert"

Surfacing a signal is **not** enforcing a response. An orchestrator can see (or miss, or ignore) a
HIGH alert and keep dispatching. This gate makes the response **mandatory**: an unresolved HIGH alert
without a terminal ack **refuses the dispatch tools outright**. The gate promotes an observability signal
into a blocking barrier: the same availability-vs-binding move as dynamic context injection, applied to
alerts. This is the point where an observability *channel* (Hard signal, non-blocking) crosses into a
**Hard blocking gate**: it is the family's one member that stops the line.

## Mechanism

At session start the orchestrator polls the cron-alerts channel for alerts unconsumed since
`last_seen_ts` (the session-start poll discipline). A HIGH alert without a terminal ack blocks new
dispatch (sonnet/opus), worktree creation, merge-train run/stage/attest, and new-brief creation (the
HIGH-alert dispatch block). The canonical resolution is an alert-resolving dispatch
(`--resolves-alert <id> <brief>`), which auto-acks and dispatches the fix.
Deadlock-freedom is designed in: EXEMPT tools plus the resolves-alert path mean the gate can always be
cleared.

## Prerequisites

- **An alert channel** (append-only) fed by the [typed event bus](typed-event-bus.md), with a severity
  scale.
- **An ack log** with terminal states (`ACK`/`RESOLVE`/`BYPASS_AUDIT`).
- **The dispatch tools wired to consult it**; a gate nothing checks is not a gate.
- **A resolution path that is itself EXEMPT**, or the gate deadlocks the fix.

## Consequences & costs

- **A stuck/unackable alert deadlocks dispatch.** Mitigated by EXEMPT tools + the resolves-alert path +
  a recovery playbook, but a mis-wired gate can wedge the orchestrator.
- **It depends on correct severity tagging.** A mis-tagged HIGH over-blocks; a mis-tagged LOW under-
  blocks. The gate inherits the alert producer's accuracy.
- **The bypass ack is a hole.** `BYPASS_AUDIT` clears the gate for a human (logged), which can paper
  over a real break.
- **Session-start poll is discipline.** The block is mechanical once seen, but *seeing* it depends on
  the orchestrator honoring the poll.

## Known uses

- The cron-alerts channel (an append-only alerts log) + acks log.
- The session-start poll discipline; the dispatch block on unresolved HIGH alerts.
- The alert-resolving dispatch (`--resolves-alert`, auto-ack + dispatch fix).

## Related mechanisms

- **Consumer** — reads [typed-event-bus](typed-event-bus.md): alerts are derived events promoted to a
  gate.
- **Layer** — a *dispatch-time* health gate, upstream of all new work — the health-driven analogue of
  [brief-linting](../context-and-dispatch/brief-linting.md)'s structural dispatch gate.
- **Counterpart** — the acks log is the resolution record that the gate reads to decide whether a HIGH
  alert still blocks.
