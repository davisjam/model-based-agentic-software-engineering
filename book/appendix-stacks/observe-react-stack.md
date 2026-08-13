## The capability

**Detect operational divergence and connect the observation to a bounded response.** An operating model says
what the system should be doing; this stack notices when it stops, and wires that observation to an action
that does something about it.

## When this stack earns its keep

Reach for it when:

- **The system runs live**, and a divergence between expected and observed state has real cost.
- **Detection and response have drifted apart** — a dashboard nobody acts on, or a runbook nobody triggers.
- **Continuing can be more dangerous than stopping**, so an unsafe state needs the authority to halt
  progress, not just a note in a log.

## The composition

<!-- label: observe-react-stack -->
<!-- figure: assets/observe-react-stack.svg | The observe → react composition. An operating model drives WATCH, which reads runtime state; WATCH flows to RESPOND, which recovers. That solid path is load-bearing. Two dashed attachments strengthen it where the failure class demands: BEAT adds a liveness heartbeat so a hung process reads differently from a slow one, and BLOCK adds the authority to prevent unsafe progress. Solid path: the load-bearing composition. Dashed attachment: a useful enhancement, not required for the capability. -->

**WATCH → RESPOND is the load-bearing path.** Heartbeats and blocking authority strengthen it where the
failure class requires them — they are attachments to the loop, not extra rungs the capability depends on.

## Constituent moves

| Move | Role |
|---|---|
| **WATCH** | Read runtime state against the operating model, so divergence surfaces as a signal. |
| **RESPOND** | Connect each signal to a bounded recovery action. |
| **BEAT** | *(strengthens)* Emit periodic liveness so a wedged process reads differently from a slow one. |
| **BLOCK** | *(strengthens)* Refuse unsafe progress where continuing is worse than stopping. |

## Why these travel together

Observation without response is a dashboard. Response without observation is a runbook waiting for someone to
notice the fault.

The two close a loop: expected state, observed divergence, bounded action. That loop is the whole capability,
and it holds with just WATCH and RESPOND. The heartbeat earns its place when a long-running process can go
silent and you need to tell motion from death. Blocking authority earns its place only when continuing is
more dangerous than stopping — then, and only then, is a fail-closed gate worth the friction it adds.

**Mechanisms:** watchdog · heartbeat · bounded recovery · fail-closed gate
**Deep dives:** companion web catalogue — the MAGE Mechanism Catalog.
