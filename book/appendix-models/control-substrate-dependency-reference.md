Each governance mechanism declares, as typed metadata, the substrate assumption it bakes in. Joining those
declarations against the topology model on a migration target turns a grep into a computed blast radius. The
Part-II mainline shows the worked Redis→push-plane example; the full treatment is here.

**(a) Quality property.** **Migration safety** — *before a cross-cutting substrate change, exactly which
mechanisms assume the old substrate?* A declaration lint requires the stance, so the one mechanism whose
assumption is implicit cannot hide from the join. The failure it settles is a **missed dependency**: a
migration that lands and breaks a mechanism nobody remembered read the old substrate.

**(b) Structure.** A typed stance per governance mechanism, joined against the topology model.

- **`SubstrateStance`** — one of a closed set the mechanism must declare: *bound to one substrate*,
  *substrate-aware*, or *substrate-agnostic*.
- **The bound-substrate field** — for a *bound* mechanism, which substrate it assumes (e.g. "workers pull from
  a Redis sorted set").
- **The join** — the stances joined against the topology model on the migration target print the in-scope
  mechanisms as a table.

**(c) Representative figure.** A join diagram: the mechanism stances on one side, the migration target on the
other, and the computed in-scope table as the output — with a substrate-agnostic mechanism correctly falling
outside it.

**(d) Invariants.**

| Invariant | Temporal shape | How it is checked |
|---|---|---|
| Every governance mechanism declares a substrate stance | *□P* (safety) | Declaration lint: a mechanism that reads the substrate with no declared stance is a finding. |
| The blast-radius table is computed, not hand-maintained | *□P* (safety) | Derive-and-assert: the in-scope set is the join's output, never a hand-edited list that can drift. |

**(e) Derivation direction.** *Model-from-code.* Each mechanism's stance is declared metadata the lint reads
from the mechanism itself; the blast radius is a computed join, not a stored list. The join key is the
substrate identity, which links a mechanism's `SubstrateStance` to the topology model's substrate the
migration targets.

*Worked example.* When the fleet retired a Redis poll plane for a push plane, the join answered *which
mechanisms bake in "workers pull from a Redis sorted set"?* before the change landed — the queue-depth metric,
the stale-job sweep, the cancellation cleanup, and the priority-preservation requeue each declared "bound to
the poll plane" and each surfaced in the table. A mechanism reading only durable Postgres truth declared
*substrate-agnostic* and correctly did not appear.
