# Governance graph (mechanism-interaction model)

**Intent** — Model the fleet's *process-governance mechanisms themselves* as a typed graph — each
mechanism a node tagged by the event it fires on and the shared resources it reads, writes, or locks;
each edge a **conflict** between two mechanisms over one resource — so a collision between two guardrails
is caught by construction, not at the moment they trip each other in production.

| | |
|---|---|
| Summary | A typed graph of the governance mechanisms, edged by their conflicts over shared resources. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Soft·Hard** — a soft-constraint model (the query surface an operator *chooses* to run) shipped with hard sensors: a consistency check that flags mechanically-decidable conflicts, and a drift lint that holds the graph equal to the wired mechanisms |
| Derivation | `model-from-code` — induced from the code, reconciled at build |

*Its place in the environment — the **canonical mechanism** for **GOVERN · Govern the control machinery itself**. The variants and known uses that fold under it are gathered on the [construction-kit page](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-govern).*

## Motivation — the failure it kills

A governed fleet accumulates guardrails: turn-end hooks, pre-commit checks, dispatch gates, host-level
lock mediators. Each earns its place alone. But two of them can place **contradictory or contending
demands on one shared resource** — a commit-set, an OS lock, the turn-end slot — and nothing sees the
collision until a real operation trips both. The failure recurs as the fleet grows, because every new
mechanism is a new pair against every existing one.

Two collisions from the case study, each a distinct edge class:

- **Contradiction on a shared commit-set.** One path required a commit to take a particular squashed
  shape; a separate scope-check flagged out-of-brief changes on that *same* commit-set. Two mechanisms
  demanding incompatible things of one resource — found only when a commit satisfied one and violated the
  other.
- **Contention on the turn-end slot.** Two hooks fired on the *same* turn-end event with no declared
  order between them, each able to block. They competed for one slot, resolved by hope-they-compose
  rather than a declared merge or sequence.

Both are invisible in any single mechanism's code. They live in the *interaction*, and the interaction
was drawn nowhere.

## Why it's not just the static catalogue (or a lint, or a call graph)

A census of mechanisms answers *what each one is* — its target, its shape, whether it blocks or aims. It
is a list of nodes with no edges. The dimension it omits is the one these failures live in: **how any two
mechanisms interact when they touch the same resource at the same moment.** The governance graph is the
dynamic dual of that static list. It adopts the census's own vocabulary (a mechanism's role, its
soft-versus-hard enforcement) and adds the single axis the census lacks — a typed **conflict edge**
between nodes, over a shared resource, in a closed four-value taxonomy:

- **Contradiction** — both constrain a resource with incompatible required shapes (the commit-set class).
- **Contention** — both lock a resource, so a lock-order cycle risks deadlock.
- **Ordering** — one writes what the other reads on the same slot, with no guaranteed order.
- **Soft-versus-hard** — a soft aim on a resource is overridden by a hard block on the same slot.

The list tells you the mechanisms exist. The graph tells you which pairs can collide, and over what. Two
nearer neighbours miss the same axis:

- **Not just a conflict lint.** A lint decides a *mechanically decidable* class from the typed fields — a
  same-slot pair with no declared order, a lock cycle. That is the *deterministic* half. The other half is
  **judgment**: are two constraints on a commit-set *actually* incompatible, or do they compose? A lint
  cannot decide that; a reader must. The graph types each edge as deterministic or judgment, so the
  decidable edges route to a sensor and the semantic ones route to a human prompt. The lint is one
  consumer of the model, not a replacement for it.
- **Not just a call graph.** A call graph joins functions by *who invokes whom*. These mechanisms rarely
  call each other; they collide by both touching a shared resource on the same event. The join key is the
  **typed resource**, not the call. Two hooks that never reference each other still contend for the
  turn-end slot. A call graph is blind to that edge; a resource-keyed graph is built to show it.

## Mechanism

- **Nodes are mechanisms, typed.** Each node names a process-governance mechanism and carries: the
  lifecycle it governs, the **event it fires on** (the slot the same-slot analysis keys on), its typed
  **reads / writes / locks** over a *closed* shared-resource vocabulary, its output power (block / inject /
  steer / mutate), and its soft-versus-hard enforcement.
- **The resource vocabulary is the join key.** Conflicts flow *through* resources, so the resource set is
  a closed, typed vocabulary — a mistyped resource silently drops a conflict edge. The turn-end slot and
  the context budget are typed as resources too, so hook-pileup and injection-pressure fall under the same
  conflict machinery that covers lock contention. One analysis, not three.
- **Edges are conflicts, over a resource.** An edge joins two nodes, names the resource they collide on,
  its conflict type, and a resolution: merge the handlers, declare an order, move one to a separate slot,
  accept a documented non-conflict, or leave it open (a finding). Its deterministic-versus-judgment nature
  is **derived** from the conflict type, so the classification is one function to get right, not a
  per-edge guess.
- **A query surface over the graph.** The same query tool the fleet already uses for its other models
  answers the operational questions: *what fires on this event?* *what touches this resource?* *what
  conflicts exist in this lifecycle?* And the load-bearing one — *is this proposed mechanism consistent?*
  — which runs the deterministic checks against a spec **before** the mechanism is wired, turning "caught
  at collision" into "caught at authoring."
- **A drift sensor holds the graph honest.** Each node anchors to the code that implements the mechanism
  by a symbol or registry reference, not a line number; a lint re-resolves the anchor and reconciles the
  node's firing event against the wired reality. A mechanism wired but absent from the graph, or a node
  whose anchor no longer resolves, reddens the gate.

## Prerequisites

- **A closed, typed resource vocabulary** at the right granularity — coarse enough to stay sparse, fine
  enough that per-lock and per-slot conflicts stay distinct.
- **Mechanisms reachable by a stable anchor** (a symbol, a registry entry) the drift lint can re-resolve,
  so the graph tracks the code instead of a hand-maintained prose copy.
- **A derived deterministic-versus-judgment classifier**, so the sensor and the human-prompt paths split
  from one rule rather than scattered per-edge tags.

## Consequences & costs

- **The graph must not drift.** A stale interaction model is worse than none — it claims conflicts are
  covered when a mechanism changed underneath it. The drift lint is not optional; it is what makes the
  model trustworthy, and it earns the graph's code-anchoring requirement.
- **Resource granularity is a tuning surface.** Too coarse and every pair sharing a broad token looks like
  a conflict, drowning the real one in false edges; too fine and the graph is noise. A dense graph is a
  vocabulary mis-grain, not a wall of real conflicts.
- **The model describes; it does not mandate.** A governance graph is itself a governance mechanism, and
  the failure mode of governance is a tower nobody wants. It models the mechanisms that already exist and
  checks proposed ones on request; it does not manufacture conflict-lints for collisions that have never
  happened. Descriptive first, hardened only where a collision recurs.

## Known uses

- In DocAble, a governance-graph model in the fleet's model layer: mechanism nodes tagged by firing event
  and typed shared-resource footprint, conflict edges in the four-value taxonomy with a derived
  deterministic-or-judgment nature, a `check-new` query that runs the deterministic checks against a
  proposed mechanism before it lands, and a drift lint reconciling each node's anchor against the wired
  hook and mediator set. Its two motivating collisions — a commit-set contradiction and a turn-end
  contention — are the canonical edges it was built to surface.

## Related mechanisms

- **Bridge** — the agent fleet's mechanisms (the [gates](../../agent/gates-and-merge-train/pre-commit-hook.md),
  the [mediators](../../agent/mediators-and-resource-locks/test-serializer.md), the
  [lifecycle hooks](../../agent/lifecycle-and-observability/lifecycle-hooks.md)) are the *nodes* this model
  reasons over ◀──▶ the model *governs* their interactions, and the drift lint keeps its node set equal to
  the wired reality.
- **Enabler** — [synchronization-model](synchronization-model.md): the lock-ordering deadlock analysis is
  the contention edge's checker, generalized from OS locks to the turn-end slot (one ordering analysis for
  both).
- **Counterpart** — [drift-parity-gates](drift-parity-gates.md): the anchor-drift lint that holds this
  model true, the same discipline every model here depends on.
- **Sibling** — [agent-orchestration-model](agent-orchestration-model.md): that model draws the fleet's
  *lifecycle*; this one draws the *interactions between the controls* that govern it — two orchestration
  faces of the same substrate.
- *See also* — [query-surface](query-surface.md): the read API the consistency questions are asked
  through; [symbol-anchored-traceability-graph](symbol-anchored-traceability-graph.md): the derived-anchor
  discipline the node-to-code join reuses.
