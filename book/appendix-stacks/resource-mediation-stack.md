## The capability

**Prevent shared resources from becoming accidental concurrency policy.** When several actors contend for one
scarce thing, this stack moves the policy out of their timing and into an explicit control that admits them
on purpose.

## When this stack earns its keep

Reach for it when:

- **Actors contend for a scarce resource** — a test runner, a build host, a rate-limited API — and their
  arrival order decides who wins.
- **Availability has become an emergent property** of when jobs happen to start, rather than a stated policy.
- **Capacity should flex under live pressure**, but only once a fixed policy and a single admission point
  already exist.

## The composition

<!-- label: resource-mediation-stack -->
<!-- figure: assets/resource-mediation-stack.svg | The resource-mediation composition. A RESOURCE POLICY states which resource is scarce and what capacity is acceptable; a MEDIATOR admits at most N actors through one admission point to the SHARED RESOURCE. A dashed LIVE PRESSURE loop tightens or relaxes effective capacity when justified. N=1 and N>1 are settings of the same mediator, not separate stacks. Solid path: the load-bearing composition. Dashed attachment: a useful enhancement, not required for the capability. -->

Declare the scarce resource and its acceptable capacity, route every access through one admission point, and
adapt that capacity from live pressure only where the seam already exists to adapt.

## Constituent moves

| Move | Role |
|---|---|
| **DECLARE** | State which resource is scarce and what capacity is acceptable. |
| **MEDIATE** | Route access through one admission point. |
| **ADAPT** | *(strengthens)* Modify effective capacity from live pressure where justified. |

## Why these travel together

Unmediated contention makes resource availability an emergent property of actor timing — whoever starts first
wins, and the policy is an accident. A mediator turns that accident into stated policy: one seam, a declared
capacity, admission decided on purpose.

Adaptive pressure can improve utilization, but it depends on the fixed policy and the admission seam already
being in place — you cannot tune a capacity that no single control owns. **The engineering move is not the
semaphore.** It is pulling contention policy out of the individual actors and into one explicit shared
control. Whether that control admits one actor or many is a setting, not a different mechanism.

**Mechanisms:** exclusive mediator · bounded mediator · pressure-responsive admission
**Deep dives:** companion web catalogue — the MAGE Mechanism Catalog.
