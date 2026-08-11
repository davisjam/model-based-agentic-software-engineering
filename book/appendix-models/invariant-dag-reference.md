A host-identical deploy graph plus a per-host scheduler that rations load and cost. *Despite the name, this
is a deployment/test* **execution** *DAG — its edges carry typed intents, not a graph of invariants.* The
Part-II mainline states the principle and shows the host-profile→plan table and the load-edge invariant; the
full treatment is here.

**(a) Quality property.** Two, both about how a host runs the work it was handed.

- **Graph portability** — *is the deploy graph the same on every host?* Load-specific edges are banned from
  the graph and migrated to the scheduler, so the graph carries only host-identical correctness and cost
  intents and cannot fork per host.
- **Rationing correctness under cost and resource pressure** — *does the deploy fan work out when it safely
  can, and serialize only when it must?* The scheduler honors a cost gate everywhere but rations concurrency
  only where a scarce box demands it, all from one profile table.

**(b) Structure.** An edge-intent axis plus a per-host scheduler.

- **The edge intent** — each deploy-graph edge carries a typed intent. `CORRECTNESS`: B is wrong without A,
  honored on every host. `COST_GATE`: A is a cheap check gating an expensive B, honored by default and
  relaxable only under an unbounded budget. `LOAD`: B contends with A for a scarce box — *banned in the
  graph*, migrated to the scheduler.
- **`HostLoadProfile`** — a per-host record with two knobs. A **concurrency ceiling** — how many roster items
  may run at once (1 for a single scarce box; large for an elastic one). A **budget** — a spend ceiling in
  dollars on this host's work. A *finite* budget means spend is scarce, so cost gates are honored: an
  expensive step runs only after its cheap gate clears. An *unbounded* budget (∞) means spend is not the
  constraint, so the cost gate protects nothing and is relaxed.
- **The scheduler** — reads a host's profile and emits an execution plan: how many roster items may run at
  once, and whether to honor the cost gate. Load rationing is a semaphore, not a graph edge.

The mapping is a pure function of the profile — `plan = plan_for(host_profile)`:

| Host profile | Ceiling | Budget | Emitted plan |
|---|---|---|---|
| Elastic staging | none (unbounded) | ∞ (unbounded) | fan the whole ready wave out; relax cost gates |
| Metered prod | low finite | finite | small concurrency; honor cost gates |
| Scarce local box | 1 | finite | serialize; honor cost gates |

Moving stress between hosts edits one row of this table — never the deploy graph.

**(c) Representative figure.** A data-flow — edge intents route, the load intent leaves the graph for the
scheduler, and a per-host profile drives the plan. (Reuse `assets/dag-policy-structure.svg`.)

**(d) Invariants.**

| Invariant | Temporal shape | How it is checked |
|---|---|---|
| No deploy edge carries the `LOAD` intent | *□P* (safety) | Load-edge lint reads the graph and the scheduler's graph-resident intent set; a `LOAD` edge is a finding. |
| The deploy graph is identical on every host | *□P* (safety) | Graph-parity check: the same graph is emitted for every host; a per-host fork is a finding. |
| The execution plan is a pure function of the host profile | *□P* (safety) | Derive-and-assert: the plan is recomputed from the profile, never hand-stored. |

**(e) Derivation direction.** *Model-from-code.* The plan is derived from the per-host profile by a pure
function, and a hand-stored plan or a `LOAD` edge is banned outright. The join key is the host name, which
indexes both the `HostLoadProfile` and the deploy phase that runs under the emitted plan.

*Also seen in:* the concurrency models (rationing is a runtime-dynamics concern) and the scenarios chapter
(the four-model join walks this model with its scheduler code).
