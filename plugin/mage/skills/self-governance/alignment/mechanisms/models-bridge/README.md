# The models-bridge — the MBSE substrate between agents and codebase

<!-- summary: Structured models between agents and codebase — the MBSE substrate that makes scaling possible. -->

*The third role in the [catalogue](../README.md). Not "agent" and not "product," but the layer that
**couples** them: structured models of the system that agents **read** to reason about the codebase, and
that **govern** it (a limited slice — config, docs, IPC contracts — is generated from them too). This is the interface through which a
context-bounded agent operates a context-exceeding codebase — the thing that lets agentic engineering
scale past a toy.*

```
     AGENT CONTROLS   ◀────  THE MODELS-BRIDGE  ────▶   PRODUCT / CODEBASE
     (govern fleet)    read    (structured system-models)   govern & generate   (the artifact)

  brief-linting  ┐                 ┌ system-model catalog ┐               ┌ NetworkPolicy / wiring gen
  dyn-ctx-inject ┼── query/inject ─┤ meta-sync ══ drift   ├── parity/gen ─┼ deployment topology
  role-dispatch  ┘                 │ query-surface        │               └ boundary / seam lints
                                   └ codegen · read-no-copy ┘
```

## Why this matters

**1 · Executable documentation that cannot drift.** These models are not prose — they are *data that
tools, lints, and deploy scripts read on every run, and that generate real artifacts* (NetworkPolicy,
service wiring, API docs, docker). Because they are continuously *used* and *validated*, the build fails
the moment a model diverges from the code — the
[drift & parity gates](system-models/drift-parity-gates.md) enforce exactly that, the one gate the
rest here depends on: a bridge is only useful if the map equals the territory, and a lying map is worse
than none. The deepest dividend shows under a *re-platforming*: change the substrate (deployment engine,
storage, concurrency model) and a faithful map mostly survives untouched — the elements that *do* move
localize precisely where the old substrate had leaked a semantic guarantee into the design, turning a
migration from a leap into a bounded, checkable walk over the model.

**2 · The barrier was always human.** Model-Based Systems Engineering — modelling your system as typed
source-of-truth — has long been *possible* and rarely *done*: maintaining the models and satisfying the
drift gates is tedious, and humans resent the nagging.

**3 · Agents dissolve the barrier.** That disciplined, repetitive upkeep is exactly what agents do
without complaint — so agentic engineering finally makes MBSE practical, and the same models let an
agent operate a codebase larger than its context in the first place.

**4 · The bridge earns most where the model has never been.** A frontier model carries
strong priors for the code it saw often — a CRUD web app, a REST service, the popular
framework. Point it at novel, obscure, or research and HPC software and those priors
turn against you: the model reaches for the nearest reference class it knows and
imposes the wrong one, confidently. The bridge's value rises as the code departs from
that training distribution. A structured model states the domain's real shapes — its states,
its seams, its invariants — where the model's own prior states the wrong ones. The
bridge is how an engineer hands the agent the priors its training never gave it, so the
further the system sits from the well-trodden path, the more the model must reason
through the map instead of through a guess.

## The <!--census:bridge:word-->35<!--/census--> mechanisms — one method, two subjects (a Y)

The role is a **Y**: one **method** (the trunk) reified toward the two subjects the bridge couples — the
**product** it ships and the **orchestration** that builds it. The <!--census:bridge_method:word-->seventeen<!--/census--> method-mechanisms are
subject-agnostic; the <!--census:bridge_models:word-->eighteen<!--/census--> models split by subject, with three that serve both faces (the *shared spine*).

These model entries are a **curated sample of the portable genres**, not a full inventory. The real
substrate carries on the order of sixty structured models; the ones written up here are those whose *shape*
transfers to another system, so a reader adapts the genre rather than the instance.

**The method — the trunk (subject-agnostic).** The pattern, plus the machinery that holds *any* model true:

- [Executable source-of-truth](system-models/executable-source-of-truth.md) ★ — the pattern itself:
  data-not-code, read every run, generated-from, can't drift.
- [Drift & parity gates](system-models/drift-parity-gates.md) — bidirectional model↔reality enforcement
  (the counterpart that makes "can't drift" true).
- [Agent-first MBSE harness](system-models/agent-first-mbse-harness.md) — build the models as a thin harness
  over frozen records: adopt the modeling genre's schema, skip its runtime, hold the disciplines that keep
  the snapshot honest.
- [Formal invariant verification](system-models/formal-invariant-verification.md) — each invariant carries
  a temporal-logic form (`[]P` safety / `P ~> Q` liveness) that *derives* its exhaustive checker
  (state-space BFS / a model checker) — proven across every interleaving, not sampled.
- [Coverage → model-node mapping](system-models/coverage-model-mapping.md) — project test coverage onto the
  model's nodes (states, seams, invariants) so an *untested* invariant is a visible gap, not hidden inside
  a line-coverage percentage.
- [Journey-criticality → test-tier placement](system-models/journey-criticality-test-placement.md) — a
  journey's criticality *derives* which environment tier its tests run in, and a coverage-floor lint holds
  the invariant that every major journey-part has a fast-tier test — so local-green means the major paths ran.
- [Invariant-DAG execution policy](system-models/invariant-dag-execution-policy.md) — a deploy graph carries
  `CORRECTNESS`/`COST_GATE`/`LOAD` edge intents and stays host-identical; a typed Scheduler reads a per-host
  `(concurrency-ceiling, budget)` profile and rations load + cost over it, so contention is a semaphore in
  the plan, never a dependency edge — held by a no-LOAD-edge lint and a cross-host superset lint.
- [Model-driven codegen](system-models/model-driven-codegen.md) — generate artifacts *from* the models,
  provenance-headed.
- [Query surface](system-models/query-surface.md) — `repo-query`, the agent-facing read API.
- [Read-don't-hardcode consumption](system-models/meta-model-consumption.md) — consume by query, never by
  copied snapshot.
- [Control↔substrate dependency](system-models/control-substrate-dependency.md) — each control declares the
  substrate assumption it bakes as typed metadata, so a substrate change's static-analysis blast radius is
  a *computed query*, not a grep (read-don't-hardcode turned on the control fleet's own dependency edges).
- [Symbol-anchored traceability graph](system-models/symbol-anchored-traceability-graph.md) — a typed graph
  joining each model to its lint, code entry-point, proof, related models, and registry, every edge
  *derived* (a lint re-resolves its symbol anchor at scan time) so a code move that breaks a join reddens —
  derived edges defend, snapshotted ones drift.

**Product-facing models** — the method pointed at the shipped artifact:

- [Service-flow / API model](system-models/service-flow-model.md) — the Backstage-dialect SOA model
  (auth, wiring, NetworkPolicy, API contract).
- [User-journey model](system-models/user-journey-model.md) — the product-goal→implementation bridge:
  journeys (actor / goal / ordered steps) joined to the endpoints and tests they exercise (the one
  *goal-anchored* model).
- [Domain registries](system-models/domain-registries.md) — filetypes, WCAG gaps, cron, UX surfaces,
  competitors, rule metadata.
- [Composed state-machine model](system-models/composed-state-machine-model.md) — the product's
  concurrent lifecycle as a *set* of typed machines with first-class cross-machine invariants, each
  invariant routed to its checker by its temporal shape (safety → exhaustive, liveness → temporal, linear
  → property). The specification the temporal verifier proves against.
- [Process view](system-models/process-view.md) — the concurrency projected the other way: the concurrent
  processes, their lanes, and the *racing edges* where they touch shared state, each edge joined to the
  lock that guards it. "What runs at once and where do they collide," over the machine model.

**Orchestration-facing models** — the method pointed at the agent fleet / dev substrate:

- [Synchronization model (meta-sync)](system-models/synchronization-model.md) — the OS-lock / `flock`
  registry + acquisition ordering that serializes the fleet's shared-resource access.
- [Agent-orchestration model (developer journeys)](system-models/agent-orchestration-model.md) — the agent
  fleet + orchestrator loop (dispatch→work→land→tombstone; refill/bank) modeled with the *product's own*
  MBSE method — typed lifecycle SMs, derived-tier invariants, the reflection-facet registry as a first-class
  node. The developer-journey counterpart to the product's user-journey model.
- [Governance graph (mechanism-interaction model)](system-models/governance-graph.md) — the fleet's
  process-governance mechanisms themselves as a typed graph: nodes tagged by firing event + shared-resource
  footprint, edges the *conflicts* between them (contradiction / contention / ordering / soft-vs-hard) over a
  shared resource. The dynamic dual of the catalogue's static census — the interaction dimension the list omits.
- [Lifecycle model](system-models/lifecycle-model.md) — a typed operational map of how the substrate
  *works*: each operating lifecycle a named node with a one-line mechanics summary and a machine-checkable
  healthy-state predicate, symptom→fix rows keyed to the lifecycle they belong to, the operator runbook
  *generated* from the map so the prose can't drift from the system.

**Shared-spine models** — one model, both faces:

- [Component & zone model](system-models/component-zone-model.md) — the code-zone / boundary / seam map
  the product *and* the fleet reason over.
- [Mediator & single-writer contracts](system-models/concurrency-contracts.md) — subprocess serialization
  (fleet mediators) + single-writer state contracts (product lifecycles).
- [Deployment & tier topology](system-models/deployment-topology-model.md) — where the product's services
  run *and* the agent-substrate's layer boundaries.

## The bridge relationship — the Y's two exits

Every model here carries a **bridge** edge. The agent side *consumes* the model to reason; the model
*governs or generates* its subject — the **product** (SOA, journeys, WCAG facts) on the product-facing
arm, the **fleet / dev-substrate** (locks, mediators, layers) on the orchestration-facing arm — and the
drift gate keeps model and reality equal. The Y's two exits *are* these two governed subjects; the trunk
is the method they share. The shared-spine models straddle the fork — one model whose two faces govern
each subject in turn.

Naming note: per the catalogue's reference policy, these entries name the `system-models/` substrate and
its files directly — that directory is their subject.
