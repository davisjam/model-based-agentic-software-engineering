# Agent-orchestration model (developer journeys)

**Intent** — Model the agent fleet and the orchestrator's own loop with the **same MBSE method you point at
the product**: typed lifecycle states, typed seams, and invariants whose verification tier is *derived* (not
hand-typed), all held to reality by a drift gate. The substrate that *produces* the software becomes as
checkable as the software. It is the **developer**-journey view (dispatch→work→land→tombstone; the
refill/bank loop), not the user-journey view (our instance: an `agent_orch` model that reuses the product
state-machine's tier-derivation and drift machinery, and carries the reflection-facet registry as a
first-class modeled node).

| | |
|---|---|
| Summary | The fleet + orchestrator loop modeled with the product's own MBSE method: developer journeys. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — a typed source-of-truth held true by a drift gate (its declared states + facet-nodes reconciled against the live registry), each invariant's checker tier *derived* from its temporal shape, lands audit-only then blocking |
| Derivation | `model-from-code` — induced from the code, reconciled at build |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-know) shows how it folds.*

## Motivation — the failure it kills

The bridge models tie agents to the product, but the **fleet that builds the product** usually goes
unmodeled. Its lifecycle (dispatch → prepare → sentinel → work → commit → land → tombstone → clean, with the
abandoned/recovered branch) and the orchestrator's own loop (observe a completion → land + run the
definition-of-done → refill the freed slot → bank state if the freshness window lapsed → rest) live
*implicitly*, scattered across the dispatch tool, the registry, the tombstone tool, the worktree tool.
Nothing names them as typed state machines, so the failures are all invisible: an agent reaches a state no
transition allows; the orchestrator rests with ratified work still queued; a fleet invariant
(exactly-one-live-marker per agent, upload-before-teardown, exactly-one-completer) is asserted nowhere; and
the reflection substrate the fleet runs *on itself* drifts from what anyone modeled. The fleet is the one
system the team operates every hour and the one system it never drew.

## Why it's not just "the product state-machine model" (same method, different subject)

The product-facing models ([service-flow](service-flow-model.md), the job/chunk state machines) describe
what the system does *for users*. This describes what the *fleet does to produce the system*: the
**developer** journeys (dispatch → land → tombstone; the refill/bank loop), not the user journeys. The named
axis is the **subject**: product runtime versus agent fleet + orchestrator loop. Everything else, the
*method*, is **reused**: the same tier-derivation maps a fleet invariant's temporal shape to its checker
tier; the same coordination-primitive and temporal-form types annotate its seams; the same drift-gate
discipline holds it to reality. Leave the fleet as a prose runbook and it rots the moment the dispatch
tool changes, with no gate to catch the divergence. This model reifies the trunk method toward the
**orchestration** subject exactly as the product models reify it toward the product: the second arm of
the bridge's Y, long a placeholder, now populated.

## The fleet, made executable (not a doc)

A prose runbook of the fleet lifecycle rots the moment the dispatch tool changes. This model is *executable*:
the declared lifecycle states are reconciled against the registry's real event vocabulary; the
reflection-facet nodes are reconciled against the live facet registry (a declared node with no live facet,
or a live facet with no node, fails the drift gate, *model = territory*); and each invariant's verification
tier is **derived, not asserted**, so a HAIRY concurrency invariant (tombstone-vs-live-marker,
heavy-refill-vs-shed) is *forced* to carry an exhaustive checker while a linear one gets a property test. The
fleet becomes as checkable as the product, on the same rails.

## Mechanism

- **Two typed state machines.** The agent lifecycle and the orchestrator's standard-move loop, each a
  states + transitions + terminal-safe set, tagged with the fleet lanes that enact it. The model is the
  authoritative source of truth for a lifecycle that today lives implicitly across several tools.
- **A closed, typed set of seams.** The hook/event surface, the registry (pool + lifecycle SoT), the compute
  mediator (a pressure signal), the status files (bank freshness), the event bus (the telemetry the model
  verifies *against*), and the reflection-facet registry.
- **Invariants with derived tiers.** Each fleet invariant carries a temporal form from which its verification
  tier is *derived* (the same derivation the product invariants use): HAIRY safety routes to an exhaustive
  state-space check, linear to a property test.
- **The reflection substrate as first-class nodes.** Each reflection facet is a declared node (its policy
  genre, its built/interface-ready status, its policy-material references); a drift gate reconciles the
  declared node set against the live registry *both* ways.
- **Held on the same drift/parity rails** as every other model; lands audit-only, then promotes to blocking.

## Prerequisites

- **The trunk method already exists** (the tier-derivation, the coordination/temporal types, the drift-gate
  machinery), so the orchestration arm *reuses* it rather than reinventing. That reuse is why this subject
  is modeled as a second arm rather than as a bespoke fleet doc.
- **The fleet lifecycle is enacted through addressable substrate** (a registry, a tombstone record, a
  worktree tool) the model can reconcile against. Without a real event vocabulary to check the states
  against, it is a hand-authored doc, not a checked model.
- **A live fleet substrate to anchor model = territory**, here the reflection-facet registry.

## Consequences & costs

- **The fleet lifecycle gains one authoritative source of truth (SSOT).** A new fleet state, or a new reflection facet, is now
  a model edit, or the drift gate fails. Deliberately; that is the freshness gate working.
- **Modeling the operator's own loop can feel like navel-gazing** until the first time it catches the
  orchestrator resting with ratified work queued, or a facet silently drifting from the registry. Those are
  the invariants that only fire under the dynamics, invisible to a static read.
- **It inherits the product method's ceremony** (derived tiers, drift gates) for the fleet, worth paying
  only because the fleet is operated constantly and its failures (a lost agent, a double-completer, an
  un-reflected recurrence) are expensive.

## Known uses

- An `agent_orch` model: the fleet-lifecycle state machine (dispatch → … → tombstone → clean, with the
  abandoned/recovered branch) + the orchestrator-loop state machine (observe → land + DoD → refill → bank →
  rest), a closed set of typed seams, and invariants with *derived* verification tiers reconciled against the
  registry's event vocabulary.
- The reflection-facet registry modeled as first-class nodes (genre + built/interface-ready + policy-material
  references), with a drift gate reconciling the declared nodes against the live registry both ways:
  *model = territory* over the [reflection-facet substrate](../../agent/lifecycle-and-observability/reflection-facet-substrate.md).

## Related mechanisms

- **Sibling (same method, other subject)** — the product-facing models
  ([service-flow](service-flow-model.md) · [user-journey](user-journey-model.md)): this is the *developer*-
  journey counterpart. Same trunk method (derived-tier invariants, drift gates), reified toward the fleet
  instead of the product: the orchestration arm of the Y to their product arm.
- **Bridge** — it models the very substrate the agents run on; the
  [reflection-facet substrate](../../agent/lifecycle-and-observability/reflection-facet-substrate.md)'s
  registry is one of its first-class nodes (the model = territory anchor).
- *See also* — [formal-invariant-verification](formal-invariant-verification.md): the fleet-invariant tier
  derivation is that mechanism applied to the orchestration subject; [drift-parity-gates](drift-parity-gates.md):
  the node↔registry reconciliation is that parity applied to the fleet model.
