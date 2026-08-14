# Abstractions

**Intent** — A glossary of the concrete artifacts the catalogue's mechanisms are built from, each named
by its **role and shape**. Each implementation is custom to a distinct engineering context. I hope these
descriptions give you ideas for yours.

Every abstraction below carries a **slug** (the citation key, shown in brackets), a definition, the
artifact it **grounds** in the reference system (named once, for concreteness), and a **see** link to the
mechanism that governs it. To cite one from an entry, write `[[slug]]` (renders the headword) or
`[[slug|custom text]]` (renders your own words) — hovering shows the definition.

---

## Model query tool
<!-- slug: repo-query -->
The canonical, self-describing read/query API over the system models — a tool with deterministic
subcommands that emit structured JSON — so an agent reads the system's compressed truth through one
interface instead of re-parsing raw model files and getting the dialect subtly wrong.

**Grounds** — a repo-query CLI (`repo-query.py`). **See** — [model query surface](models-bridge/system-models/query-surface.md).

## Component registry
<!-- slug: component-registry -->
A typed registry mapping every component to its code zone — focus-dirs, tags, boundary kind, and
sanctioned seams — so "which component owns this file, and what may touch it" is a queried fact rather
than a hardcoded path list that drifts the moment a directory moves.

**Grounds** — a typed component registry (`components.py`, a `Component` dataclass set). **See** — [component & zone model](models-bridge/system-models/component-zone-model.md).

## Boundary & seam classifiers
<!-- slug: boundary-seam-classifiers -->
Typed helpers that classify each component's boundary kind, its outside-touching seams, and its
sanctioned read surfaces — the zone *meaning* the directory layout does not carry, named once so lints
and dispatch read it instead of re-inferring it per tool.

**Grounds** — boundary-kind / external-seam / read-surface classifiers (`boundary_kinds.py`, `external_seams.py`, `canonical_read_surfaces.py`). **See** — [component & zone model](models-bridge/system-models/component-zone-model.md).

## Reverse-mapping parity test
<!-- slug: reverse-mapping-test -->
A characterization test that asserts a model matches the real tree in **both** directions — every model
row ↔ a real thing on disk, and every real thing ↔ a model row — so the model cannot silently diverge
from the code it describes.

**Grounds** — the model↔tree reverse-mapping tests (the `test_*_reverse_mapping` family). **See** — [drift & parity gates](models-bridge/system-models/drift-parity-gates.md).

## Mediator registry
<!-- slug: mediator-registry -->
A typed registry of the dev-time subprocess serializers — what each one mediates (the test runner, the
build compiler, and so on), its concurrency cap, and its bypass switch — read by the enforcers that
refuse an un-mediated call, so a newly added subprocess can be checked for coverage.

**Grounds** — a dev-mediator registry (`mediators.py`). **See** — [mediator & single-writer contracts](models-bridge/system-models/concurrency-contracts.md).

## Single-writer registry
<!-- slug: single-writer-registry -->
A typed registry declaring which state-mutation functions are single-writer / monopoly — exactly one
writer, no concurrent mutation — so a coverage lint can flag a mutator that should be contracted but
isn't.

**Grounds** — a single-writer / monopoly-contract registry (`state_mutator_registry.py`). **See** — [mediator & single-writer contracts](models-bridge/system-models/concurrency-contracts.md).

## Synchronization registry
<!-- slug: synchronization-registry -->
A typed model of every OS-level lock — the primitive it guards, its declared acquisition sites, and the
required acquisition *ordering* — so an undeclared lock and a deadlock-inducing inverted ordering become
detectable by a lint rather than discoverable only by deadlock. Composes three record kinds: a lock, an
acquirer, and an ordering constraint.

**Grounds** — a synchronization (meta-sync) registry (`synchronization.py`). **See** — [synchronization model](models-bridge/system-models/synchronization-model.md).

## Deployment-topology loader
<!-- slug: deployment-topology-loader -->
A typed loader for the managed-deployment topology — which service runs where, and how the deployment
layers may depend on one another — that deploy scripts and layering lints read instead of hardcoding the
topology as scattered constants.

**Grounds** — a typed deployment-topology loader (`deployment_topology.py`). **See** — [deployment & tier topology](models-bridge/system-models/deployment-topology-model.md).

## Service-tier registry
<!-- slug: service-tier-registry -->
A typed classification of each service's tier, read by deploy and parity checks rather than restated as
scattered per-script constants that drift when a service moves tier.

**Grounds** — a service-tier classifier (`service_tiers.py`). **See** — [deployment & tier topology](models-bridge/system-models/deployment-topology-model.md).

## Layer-boundary contracts
<!-- slug: layer-boundary-contracts -->
A typed declaration of the agent-substrate's layer boundaries — which layer may import which — so a
cross-layer import is blocked by a boundary lint at build time rather than crossed quietly and
discovered in review.

**Grounds** — an agent-substrate layering model (`agent_substrate_layering.py`). **See** — [deployment & tier topology](models-bridge/system-models/deployment-topology-model.md).

## Aggregate lint runner
<!-- slug: aggregate-lint-runner -->
The whole-repo lint aggregator, singleton-locked so only one instance runs per host — a compute-protection
mutex that keeps concurrent agent worktrees from stampeding the shared machine by all running the full
lint sweep at once.

**Grounds** — a repo-wide lint runner behind a host mutex (a `lint-all` command). **See** — [aggregate compute protection](agent/mediators-and-resource-locks/aggregate-compute-protection.md).

## Dispatch tool
<!-- slug: dispatch-tool -->
The canonical entry point for launching a coding agent — it composes the brief, runs the pre-launch
checks, records the agent in the lifecycle registry, and launches it into an isolated worktree, so every
agent enters the fleet the same audited way rather than by an ad-hoc hand-rolled invocation.

**Grounds** — an agent-dispatch CLI (`dispatch.py`). **See** — [role-typed dispatch](agent/context-and-dispatch/role-typed-dispatch.md).

## Brief lint
<!-- slug: brief-lint -->
A lint run over an agent's brief *before* the agent launches — it verifies every mandatory marker and
snippet (worktree isolation, self-check, commit cadence, …) is present, and refuses the launch if not, so
a malformed brief never reaches an agent.

**Grounds** — a pre-launch brief linter (`agent_prompt_lint.py`). **See** — [brief linting](agent/context-and-dispatch/brief-linting.md).

## Dispatch self-check
<!-- slug: dispatch-self-check -->
A self-check an agent runs at boot asserting it is operating inside its sanctioned worktree and on its
own branch (not the shared trunk) — if the assertion fails the agent bails out, so a mis-placed agent
cannot mutate the wrong tree.

**Grounds** — an agent-boot canonical-dispatch assertion (`assert-agent-canonical-dispatch.py`). **See** — [brief linting](agent/context-and-dispatch/brief-linting.md).

## Test-runner serializer
<!-- slug: test-serializer -->
A host-level `flock` wrapper that serializes the test runner so exactly one test process runs per machine
at a time — concurrent agent worktrees route their runs through it instead of invoking the runner raw and
saturating the host.

**Grounds** — a test-runner flock mediator (`test-serializer.py`). **See** — [test-runner serializer](agent/mediators-and-resource-locks/test-serializer.md).

## Build serializer
<!-- slug: build-serializer -->
A host-level semaphore wrapper that caps how many heavy build/compile invocations run at once per
machine — the sibling of the test serializer for the adjacent (build/typecheck) compute class.

**Grounds** — a build/compile semaphore mediator (`build-serializer.py`). **See** — [build serializer](agent/mediators-and-resource-locks/build-serializer.md).

## Event bus
<!-- slug: event-bus -->
An append-only, typed event log that lifecycle tools emit to (dispatch, sentinel, merge-train, tombstone,
cron) and the orchestrator reacts over — one observable stream of what the fleet is doing, rather than
state scattered across tools.

**Grounds** — a typed append-only event log (`event-bus.py`). **See** — [orchestrator-as-reactor over an event bus](agent/lifecycle-and-observability/typed-event-bus.md).

## Agent registry
<!-- slug: agent-registry -->
An append-only log that is the authoritative record of which agents are currently in flight — every
lifecycle tool dual-writes it, and cleanup/tombstone gates query it first, so "who is live" is a fact
rather than a guess from directory listings.

**Grounds** — an append-only agent registry (`agent-registry.jsonl`). **See** — [agent registry](agent/lifecycle-and-observability/agent-registry.md).
