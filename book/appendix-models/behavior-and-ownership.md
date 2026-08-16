Behavioral models represent state, transition, and time. Ownership represents who may act or hold a
resource. The two are distinct model classes but often share a representation; together they expose
which states a change affects and which actors may perform the associated transitions.

## Lifecycle

**Engineering question.** What states may this object occupy, and which transitions are legal?

**Representation.** A minimal job lifecycle moves an item from `FREE` to `LEASED` on claim, from
`LEASED` to `DONE` on completion, and from `LEASED` back to `FREE` on expiry or release. `DONE` is
terminal.

**Property.** The invariants sort into safety and liveness:

<!-- table: Representative lifecycle invariants, by kind. [short: Lifecycle invariants] -->
| Invariant | Kind |
|---|---|
| Only declared transitions occur | Safety |
| Terminal states do not re-enter processing | Safety |
| A claimed job eventually completes or returns to an available state, under stated assumptions | Liveness |

**Authority and correspondence.** Transition operations or checks can mediate actual state changes
against the declared transition relation. Any implemented transition absent from that relation
becomes a finding. Where two lifecycles interact, compose their state machines explicitly so
cross-machine transitions are represented rather than left implicit in code.

## Ownership and lease

Concurrency adds ownership and lease state to the lifecycle model. Ownership remains a distinct
model class: it answers who owns a resource and who may act on it, while the behavioral model
supplies the states and transitions to which that authority applies.

**Engineering question.** Who may act on this work item now, and what stays true if workers overlap,
fail, or retry?

[ref:fig-g3-behavior-ownership] lays the ownership overlay over the state machine.

<!-- label: fig-g3-behavior-ownership -->
<!-- figure: assets/appendix-g-3-behavior-ownership.svg | *Behavior plus ownership.* The lifecycle FREE → LEASED → DONE is combined with a lease that records the current owner and expiry. The ownership invariant requires exactly one valid owner while LEASED and no active owner while FREE. -->

**Property.** Representative invariants:

- **A leased item has a valid owner**, and a free item has none.
- **Ownership changes through the declared acquisition and release mechanism**, not by ad-hoc
  mutation.
- **Terminal work cannot be reclaimed.**
- **Where ordering is required, observed acquisition order respects the declared order.**

**Authority and correspondence.** Some ownership facts are runtime facts and must be observed. The
ownership protocol itself is authored intent. Atomic operations, leases, compare-and-swap, transition
primitives, and admission checks can make selected invariants enforceable.

Concurrency limits and ownership answer different questions. A semaphore or mediator constrains how
many actors may execute; single-writer ownership identifies which actor may mutate. They require
distinct representations because they govern different properties.
