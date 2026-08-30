## The Capability

**Detect when the running system diverges from its operating model and trigger a bounded response.**

## When This Stack Earns Its Keep

Reach for it when:

- **The system runs live**, and a divergence between expected and observed state has real cost.
- **Detection and response have drifted apart** — a dashboard nobody acts on, or a runbook nobody triggers.
- **Continuing can be more dangerous than stopping**, so an unsafe state needs the authority to halt
  progress, not just a note in a log.

## The Composition

<!-- label: observe-react-stack -->
<!-- figure: assets/observe-react-stack.svg | The observe → react composition. An operating model drives WATCH, which reads runtime state; WATCH flows to RESPOND, which recovers. That solid path is required. Two dashed attachments strengthen it where the failure class demands: BEAT adds a liveness heartbeat so a hung process reads differently from a slow one, and BLOCK adds the authority to prevent unsafe progress. Solid path: the core path; dashed: enhancement. Dashed attachment: a useful enhancement, not required for the capability. -->

## Constituent Moves

| Move | Role |
|---|---|
| **WATCH** | Read runtime state against the operating model, so divergence surfaces as a signal. |
| **RESPOND** | Connect each signal to a bounded recovery action. |
| **BEAT** | *(strengthens)* Emit periodic liveness so a wedged process reads differently from a slow one. |
| **BLOCK** | *(strengthens)* Refuse unsafe progress where continuing is worse than stopping. |

## Why These Travel Together

Observation without response is a dashboard. Response without observation is a runbook waiting for someone to
notice the fault.

WATCH and RESPOND form the core loop: observe divergence from the expected state, then trigger a bounded response. Add a heartbeat when silence must be distinguished from slow progress; add blocking authority when continuing is more dangerous than stopping.

**Mechanisms:** watchdog · heartbeat · bounded recovery · fail-closed gate
