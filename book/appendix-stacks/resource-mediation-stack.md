## The Capability

**Prevent actor timing from becoming accidental concurrency policy for a shared resource.** When actors contend for a scarce resource, move admission policy out of their timing and into an explicit control.

## When This Stack Earns Its Keep

Reach for it when:

- **Actors contend for a scarce resource** — a test runner, a build host, a rate-limited API — and their
  arrival order decides who wins.
- **Availability has become an emergent property** of when jobs happen to start, rather than a stated policy.
- **Capacity should flex under live pressure**, but only once a fixed policy and a single admission point
  already exist.

## The Composition

<!-- label: resource-mediation-stack -->
<!-- figure: assets/resource-mediation-stack.svg | The resource-mediation composition. A RESOURCE POLICY states which resource is scarce and what capacity is acceptable; a MEDIATOR admits at most N actors through one admission point to the SHARED RESOURCE. A dashed LIVE PRESSURE loop tightens or relaxes effective capacity when justified. N=1 and N>1 are settings of the same mediator, not separate stacks. Solid path: the required path. Dashed attachment: a useful enhancement, not required for the capability. -->

## Constituent Moves

| Move | Role |
|---|---|
| **DECLARE** | State which resource is scarce and what capacity is acceptable. |
| **MEDIATE** | Route access through one admission point. |
| **ADAPT** | *(strengthens)* Modify effective capacity from live pressure where justified. |

## Why These Travel Together

Unmediated contention makes resource availability an emergent property of actor timing—whoever starts first wins, and the policy is an accident. A mediator replaces that accident with explicit policy: one admission point and a declared capacity. The engineering move is not the semaphore; it is moving contention policy out of individual actors and into one shared control. Whether that control admits one actor or many is a setting, not a different mechanism.

Adaptive control can improve utilization, but only after a fixed policy and common admission point exist. Capacity cannot be tuned coherently when no single control owns it.

**Mechanisms:** exclusive mediator · bounded mediator · pressure-responsive admission
