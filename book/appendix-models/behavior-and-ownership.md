Structural models hold the system still. Behavioral models introduce state, transition, and time.
**Ownership** — who may act, and who holds a resource — is a distinct working class that rarely
stands alone: it joins behavior here, just as it joined structure in the component model. This
section treats the two together because they share representations. In review, they answer *which
behavioral states does this change implicate, and who is allowed to act?*

## Lifecycle

**Engineering question.** What states may this object occupy, and which transitions are legal?

**Representation.** A minimal job lifecycle moves an item from `FREE` to `LEASED` on a claim, to
`DONE` on completion, and back from `LEASED` to `FREE` on expiry or release. The terminal state does
not re-enter processing. The model omits everything irrelevant to the lifecycle question.

**Property.** The invariants sort into safety and liveness:

<!-- table: Representative lifecycle invariants, by kind. [short: Lifecycle invariants] -->
| Invariant | Kind |
|---|---|
| Only declared transitions occur | Safety |
| Terminal states do not re-enter processing | Safety |
| A claimed job eventually completes or returns to an available state, under stated assumptions | Liveness |

Part II introduces the formal vocabulary these properties are read in. This appendix does not repeat
that primer.

**Authority and correspondence.** The model becomes executable when transition operations or checks
mediate the actual state changes rather than merely documenting them. A drift check can compare the
declared transition relation against the implementation sites that perform transitions, so a
transition the code takes that the model never declared is a finding. Where two lifecycles interlock
— a parent job and its child work items, say — the reusable form is a composed state machine: the
product of the two, with the cross-machine transitions made explicit rather than left implicit in
code.

## Ownership and lease

Concurrency adds an owner and a lease to the behavioral picture. Ownership is a working class in its
own right, but it rarely travels alone: here it combines with behavioral information — state and
transition — as in the component model it combined with structural information — surfaces and seams.
Part II treats it as the class that answers *who owns, who may act,* wherever that question arises.

**Engineering question.** Who may act on this work item now, and what stays true if workers overlap,
fail, or retry?

[ref:fig-g3-behavior-ownership] lays the ownership overlay over the state machine.

<!-- label: fig-g3-behavior-ownership -->
<!-- figure: assets/appendix-g-3-behavior-ownership.svg | *Behavior plus ownership.* The behavioral state machine (FREE → LEASED → DONE, terminal states with no re-entry) carries an ownership overlay: a lease naming its owner and its expiry authorizes exactly one worker to act. The invariant band beneath reads LEASED ⇒ exactly one valid owner, FREE ⇒ no active owner. Ownership is a working class in its own right, shown here joined to behavior. -->

**Property.** Representative invariants:

- **A leased item has a valid owner**, and a free item has none.
- **Ownership changes through the declared acquisition and release mechanism**, not by ad-hoc
  mutation.
- **Terminal work cannot be reclaimed.**
- **Where ordering is required, observed acquisition order respects the declared order.** This is the
  reusable ordering property that a synchronization model contributes; it belongs here, next to the
  invariant it protects, rather than as a standalone card.

**Authority and correspondence.** Some ownership facts are runtime facts and must be observed. The
ownership protocol itself is authored intent. Atomic operations, leases, compare-and-swap, transition
primitives, and admission checks can make selected invariants enforceable.

Keep two questions apart. A semaphore or a mediator answers *how many may execute?* Single-writer
ownership answers *who may mutate?* The counting lock and the single-writer registry are different
representations of different properties; do not collapse them into one.
