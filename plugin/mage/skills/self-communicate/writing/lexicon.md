# lexicon.md — the house engineering vocabulary

This is an **agent-facing** style doc — a resource of the `self-communicate` skill, not a catalogue entry.
It is not rendered to HTML or served.

[`engineering.md`](engineering.md) fixes the *shape* of a doc via Diátaxis. It says nothing
about *which term* to reach for. This file does: a vocabulary of engineering terms-of-art, so the prose
names the established idea and links it, rather than describing the same idea freshly each time.

## How to use this lexicon

This lexicon is the **prose specialization of a general stance** — *name the concept, then use the name*
([`SKILL.md`](../SKILL.md) §"The second stance") — carried into writing: a named term hands the reader the
whole concept at once, so reach for it instead of re-describing the idea in fresh words each time. (The
drawing leg specializes the same stance as *use the native construct, not stitched primitives*.)

The value is **consistency, not correctness** — pick one word for a concept and say it everywhere. Say
"gating," not "quality checkpoint." Say "strangler fig," not "gradual replacement." A reader who has met the
term once recognizes it on sight; a reader who hasn't can follow the reference link and learn it.

A term of art must earn its place. Prefer an established term when it carries a distinction, constraint, or
concept that would otherwise require explanation. Do not prefer jargon merely because a named term exists.
If ordinary engineering language preserves the meaning, use the ordinary language. In particular,
distinguish the name of a concept from the language used to describe what happens: *authority* may name a
property of an obligation while *the gate rejects the change* describes the mechanism. Do not force the
conceptual noun into sentences where a concrete verb is clearer.

Do not let one umbrella term erase useful distinctions. If a word can refer variously to a system,
codebase, repository, governed surface, or engineering environment, choose the specific referent instead.
Stable vocabulary improves precision only when the vocabulary itself preserves the distinctions the
argument needs.

Two rules govern every row:

- **Name the established term, then link it.** When you reach for a structural idea, name the recognized
  pattern (Circuit breaker, Bulkhead, Backpressure) and give the anchor link — do not invent a fresh
  description a reader can't look up.
- **Link where a reader "casting about" benefits.** The reference is for the reader who half-knows the term
  and wants the canonical definition. Prefer Wikipedia or the pattern's canonical source.

Every row keeps the same shape: **term · when to use it / what it means · reference**.

**This is a portable base — extend it with your own house terms.** The domains below are standard SE
vocabulary any team can adopt as-is. Your codebase will also have its own coinages; the
[**Your house vocabulary**](#your-house-vocabulary) section at the end is a template and recipe for
capturing them.

**A living lexicon.** This file is meant to grow. When you coin a term, notice two words used for one idea,
or find a stale row, add or fix it — and re-walk the codebase periodically to catch drift.

**Shared with the sibling skills.** The **Governance & mechanisms** and **Operations** clusters are the
vocabulary the sibling skills reason in too — *self-governance* and *self-operations* reference this lexicon
so the whole trio names concepts the same way. (Cross-links from those skills come later; the intent is
noted here.)

---

## The one disambiguation rule — "agent" vs "model"

This is the most load-bearing cluster of terms in the catalogue, and every skill reasons in it. Three things
tempt the word "model"; keep them apart. Use **`model`** alone for the represented map, **`foundation model`**
for the trained reasoner, and **`agent`** for the acting coding system.

| Term | What it means — the ONLY sanctioned sense | Never use it for |
|---|---|---|
| **the software agent** / **the agent** | the acting coding system — the thing that reads a brief, reasons, edits files, commits. It is *driven by* a foundation model but is not itself "the model". | the represented map; the trained reasoner (say "foundation model") |
| **foundation model** | the trained reasoner behind the agent — the LLM tier. Reach for the two-word term when the tier is the subject (Opus vs Sonnet, a cost/capability tradeoff); it names the reasoner without letting bare "model" drift to the coder. The qualified forms **the agent's LLM** and **the model tier / agent tier** are fine; bare "model" for it is not. | the represented map |
| **model** | RESERVED for the **MBSE / system / typed model** — the map/territory artifact, the **models-bridge**: the typed, queryable, drift-checked representation of the system the fleet reasons *through* and the codebase is governed / generated *from*. Compounds keep it in this sense: *model-driven*, *model-based*, *typed model*, *object model*, *world-model*, *visibility model*. | the acting agent; the foundation model |

**Why the rule exists.** The LLM behind the agent genuinely *is* a model in the ML sense, so "model" drifts
toward the coding actor by reflex. But the catalogue's central abstraction — the **models-bridge** — claims
the word "model" for the typed system-model. If "model" also means the coder, the catalogue's most important
sentence ("the model the fleet reasons *through*") turns ambiguous. So the rule is strict: the actor is **the
agent**, the map is **the model**, and the trained reasoner is **the foundation model** — the two-word term
you reach for when the tier is genuinely the subject (Opus vs Sonnet). The bare noun "model" stays with the
bridge; "foundation model", spelled in full, is the sanctioned name for the reasoner the book needs — the
rule reserves the bare word, it does not ban the compound.

### Canonical term and teaching handle may coexist

The "name the concept once" rule reaches for **one** term per idea — but it should not push an editor to
delete a useful phrase because a more formal term exists. A concept may carry two names that do different
jobs:

- **one precise canonical term** — used in definitions, checks, tables, and cross-references;
- **one recurring teaching handle** — a memorable, often metaphorical phrase that carries the idea in prose.

The teaching handle must map consistently to the canonical concept and must not spawn competing synonyms.
Define the relationship once, then keep both. The worked example is this catalogue's own: the canonical term
is **`models-bridge`** (model–code traceability and drift-checking, used hyphenated in tables and
cross-refs); the teaching handle is **"the model bridge"** (the representation the agents reason across).
Do not force every memorable phrase to become a glossary term, and do not delete every phrase that is not
itself the formal name. (The book's metaphor registry is the mechanical side of this rule: it records each
teaching handle and the canonical idea it elaborates, so a handle can be checked for drift.)

---

## Architecture & design patterns

Prefer **named design patterns**. When you reach for a structural idea, name the established pattern and link
it, rather than describing it freshly. The two umbrella references anchor the topic:
[Software design pattern](https://en.wikipedia.org/wiki/Software_design_pattern) (class-level) and
[Architectural pattern](https://en.wikipedia.org/wiki/Architectural_pattern) (system-level).

### Structural

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Adapter** | Wrap an existing interface to present a different one a client expects. Use for a shim between two contracts. | [Adapter pattern](https://en.wikipedia.org/wiki/Adapter_pattern) |
| **Facade** | Put one simplified interface in front of a complex subsystem. Use for a single seam over a messy library. | [Facade pattern](https://en.wikipedia.org/wiki/Facade_pattern) |
| **Sidecar** | Deploy a helper process/container alongside the main app to carry a cross-cutting concern (logging, proxy, mTLS) in its lifecycle. | [Sidecar pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/sidecar) |

### Resilience

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Circuit breaker** | Stop calling a failing dependency after a threshold, fail fast, and probe for recovery — instead of hammering it. | [Circuit breaker](https://en.wikipedia.org/wiki/Circuit_breaker_design_pattern) |
| **Bulkhead** | Isolate resources into pools so a failure in one pool can't exhaust the others (named after a ship's hull sections). | [Bulkhead pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead) |
| **Backpressure** | A consumer signaling a producer to slow down when it can't keep up. Use for flow control, not "throttling." | [Back pressure](https://en.wikipedia.org/wiki/Back_pressure) |

### Migration & integration

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Strangler fig** | Incrementally replace a legacy system by wrapping it and redirecting call sites one at a time until the old code is dead. Not "gradual rewrite." | [Strangler fig pattern](https://en.wikipedia.org/wiki/Strangler_fig_pattern) |
| **Service-oriented architecture (SOA)** | Split a system into independently-deployed services with typed inter-service seams. Use for the microservice split. | [Service-oriented architecture](https://en.wikipedia.org/wiki/Service-oriented_architecture) |
| **CQRS / read-write split** | Separate the transient-communication path from the durable-truth path (e.g. cache for signals, DB for state). | [CQRS](https://en.wikipedia.org/wiki/CQRS) |
| **Typed seam** | Route all cross-boundary calls through one wrapper whose signature makes a whole bug class impossible (e.g. a `BinaryIO` parameter that can't carry a path-over-wire). | [Facade pattern](https://en.wikipedia.org/wiki/Facade_pattern) |

## Process & delivery

### Release strategies

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Canary release** | Roll a change to a small slice of traffic/users first, watch, then widen. Not "phased rollout" (which is vaguer). | [Feature toggle § Canary release](https://en.wikipedia.org/wiki/Feature_toggle#Canary_release) |
| **Blue-green** | Keep two production environments; cut traffic to the idle one for a change, roll back by cutting back. | [Blue–green deployment](https://en.wikipedia.org/wiki/Blue%E2%80%93green_deployment) |
| **Dark launch** | Ship a code path to production but keep it invisible to users (exercised by shadow traffic) to de-risk it. | [Feature toggle](https://en.wikipedia.org/wiki/Feature_toggle) |
| **Feature flag / toggle** | A runtime switch that turns a code path on or off without a redeploy. "Flag" and "toggle" are interchangeable; pick one. | [Feature toggle](https://en.wikipedia.org/wiki/Feature_toggle) |

### Integration & branching

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Gating** | A blocking check a change must pass to proceed (a gate). Prefer over "quality checkpoint"/"quality gate." | [Continuous integration](https://en.wikipedia.org/wiki/Continuous_integration) |
| **Cherry-pick** | Apply one specific commit onto another branch. Use for landing a single change out of sequence. | [git cherry-pick](https://git-scm.com/docs/git-cherry-pick) |
| **Hotfix discipline** | Never deploy HEAD to fix prod; cherry-pick the fix onto a branch cut from the deployed tag. Use for emergency patches. | [git cherry-pick](https://git-scm.com/docs/git-cherry-pick) |
| **Codemod** | An AST-level program transformer for a large mechanical change. Reach for it over N hand-edits when the fix shape is deterministic. | [Automated refactoring](https://en.wikipedia.org/wiki/Refactoring) |

### Continuous practices

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Shift-left** | Move a check earlier in the lifecycle (test/lint at commit, not at release). Use for the "catch it sooner" move. | [Shift-left testing](https://en.wikipedia.org/wiki/Shift-left_testing) |
| **Boy-scout rule** | Leave the code cleaner than you found it — small improvements while you're already in a file. | [Boy Scout Rule](https://en.wikipedia.org/wiki/Robert_C._Martin) |
| **Epic** | A multi-step effort tracked as a unit of work-planning, decomposed into phases. Use for the planning container, not a single task. | [Scrum § Epic](https://en.wikipedia.org/wiki/Scrum_(software_development)) |
| **Definition of Done (DoD)** | The explicit criteria a work item must meet to close. Prefer over "done-ness" or a vague "finished." | [Definition of done](https://en.wikipedia.org/wiki/Definition_of_done) |
| **Pilot study** | A cheap, falsifiable prototype run to settle a design fork with data instead of debate. The prototype is disposable; the learning stays. | [Pilot experiment](https://en.wikipedia.org/wiki/Pilot_experiment) |

## Testing

### Test kinds

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Property-based test** | Assert an invariant over many generated inputs, not one example (e.g., round-trip, idempotence). | [Software testing § Property testing](https://en.wikipedia.org/wiki/Software_testing#Property_testing) |
| **Fuzzing** | Feed invalid/random inputs to find crashes or hangs. Use for adversarial-input testing. | [Fuzzing](https://en.wikipedia.org/wiki/Fuzzing) |
| **Characterization / golden test** | Pin the *current* behavior of existing code so an unintended change is caught. Prefer over "snapshot" when protecting legacy. | [Characterization test](https://en.wikipedia.org/wiki/Characterization_test) |
| **Smoke test** | A fast sanity suite (<30s) that gates a deploy phase. Use for the "does it even start" check. | [Smoke testing](https://en.wikipedia.org/wiki/Smoke_testing_(software)) |
| **State-machine coverage** | Walk a lifecycle's declared transitions and assert the illegal ones are rejected. Same family as model-based testing. | [Model-based testing](https://en.wikipedia.org/wiki/Model-based_testing) |

### Test doubles & inputs

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Fixture** | A fixed, known input/state a test runs against. Prefer over "test data" when the setup is the point. | [Test fixture](https://en.wikipedia.org/wiki/Test_fixture) |
| **Fakes-not-mocks** | Prefer an injected fake implementation over a mock with expectations. Use when the test needs a real-behavior stand-in. | [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html) |
| **Oracle** | The source of truth a test compares against (a spec, a prior version, a comparable product). | [Test oracle](https://en.wikipedia.org/wiki/Test_oracle) |
| **Fault / failure injection** | Deliberately trigger a failure at a test-only seam to prove a defensive gate fires — don't hunt real production scenarios. | [Fault injection](https://en.wikipedia.org/wiki/Fault_injection) |

### Strategy & coverage

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Flake** | A test that passes and fails on the same code — non-determinism, not a real defect. Use "flake," not "intermittent failure." | [Software testing](https://en.wikipedia.org/wiki/Software_testing) |
| **Code coverage** | The fraction of code a test suite exercises. Use as a gap-finder, not a quality target (high coverage ≠ good tests). | [Code coverage](https://en.wikipedia.org/wiki/Code_coverage) |
| **Test pyramid** | Many fast unit tests, fewer integration, fewest end-to-end. Use to critique a suite skewed toward slow tests (the "ice-cream cone"). | [Software testing § test pyramid](https://en.wikipedia.org/wiki/Software_testing) |

## Concurrency

### Synchronization

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Data race** | Two threads touch shared state without ordering, one writing. Use the precise term, not "timing bug." | [Race condition § Data race](https://en.wikipedia.org/wiki/Race_condition#Data_race) |
| **Lock ordering** | A fixed global order for acquiring locks, to prevent deadlock. Use when describing the deadlock-avoidance discipline. | [Deadlock](https://en.wikipedia.org/wiki/Deadlock_(computer_science)) |
| **Compare-and-swap (CAS)** | Update shared state only if it still holds the expected value, so racing writers resolve consistently. Prefer over "blind write." | [Compare-and-swap](https://en.wikipedia.org/wiki/Compare-and-swap) |
| **flock / semaphore** | An OS advisory file lock (N=1 exclusive) or byte-range semaphore (M-way) that serializes access to a shared resource. | [flock(2)](https://man7.org/linux/man-pages/man2/flock.2.html) |
| **Epoch / fencing** | Tag an operation with an issue-epoch (a fence) so a stale actor's late write is rejected. Use for the stale-lease problem. | [Fencing](https://en.wikipedia.org/wiki/Fencing_(computing)) |

### Delivery guarantees

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Idempotent** | An operation safe to apply more than once with the same result. Use for retry-safe handlers. | [Idempotence](https://en.wikipedia.org/wiki/Idempotence) |
| **At-least-once / exactly-once** | Delivery guarantees: at-least-once may duplicate (needs idempotence); exactly-once dedupes. Name the guarantee precisely. | [Exactly-once delivery](https://en.wikipedia.org/wiki/Exactly-once_delivery) |
| **Backpressure** | A consumer signaling a producer to slow down when it can't keep up. Use for flow control across a queue, not "throttling." | [Back pressure](https://en.wikipedia.org/wiki/Back_pressure) |

### Safety & liveness

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Safety vs. liveness** | Safety = nothing bad happens (checkable by BFS/property); liveness = something good eventually happens (needs a model checker). Name which you mean. | [Safety and liveness properties](https://en.wikipedia.org/wiki/Safety_and_liveness_properties) |
| **Explicit state machine (FSM)** | Model a lifecycle as enumerated states with validated transitions, not scattered flags. Use for any async job lifecycle. | [Finite-state machine](https://en.wikipedia.org/wiki/Finite-state_machine) |
| **Quiesce** | Bring a running system to a safe, idle, drained state — finish in-flight work, accept no new work, then stop. | [Database quiescence](https://en.wikipedia.org/wiki/Quiesce) |

## Governance & mechanisms

Shared with the sibling *self-governance* skill — name these the same way across the trio.

### Mechanism kinds

A **governance mechanism** governs the fleet's work in one of two ways — it is a *constraint* or a
*sensor* (and a real one often bundles both: see *governance package*). This retires the older umbrella
word **control**, which did two jobs and blurred both — it named the whole category *and*, loosely, the
detecting kind. Say **mechanism** for the umbrella, **constraint** or **sensor** for the kind.

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Governance mechanism** | The umbrella: a discrete named artifact that keeps the fleet's work aligned by *preventing* or *detecting* drift. Say "mechanism," not the ambiguous "control." | [Safety engineering](https://en.wikipedia.org/wiki/Safety_engineering) |
| **Constraint** | The *preventing* kind — scopes the agent's action space *within* a loop iteration so the wrong move is unavailable (a typed enum instead of a string; one sole seam). The prevented mistake costs no failed iteration. Usually hard; sometimes a soft aim (a typed model the agent reasons through). | [Software architecture](https://en.wikipedia.org/wiki/Software_architecture) |
| **Sensor** | The *detecting* kind — catches drift *after* the move, usually failing the loop iteration so the agent must re-iterate to fix it (a lint, a test, a parity gate). Costs iterations. | [Runtime verification](https://en.wikipedia.org/wiki/Runtime_verification) |
| **Governance package** | A mechanism that bundles several — a soft constraint (a typed model that aims the agent), hard constraints (enums), and sensors (a lint, a drift-parity gate). Name the package and tag its *primary* move; don't force it into one bin. | — |
| **Lint** | A *sensor* that flags a code pattern by static analysis at author/commit time. Cheap, deterministic, at-PR. | [Lint](https://en.wikipedia.org/wiki/Lint_(software)) |
| **Gate** | A blocking *sensor* on a lifecycle transition (commit, merge, deploy) — the pass/fail barrier itself. | [Continuous integration](https://en.wikipedia.org/wiki/Continuous_integration) |
| **Validator** | A runtime *sensor* asserting an invariant on data or output (e.g. output ⊆ input). | [Data validation](https://en.wikipedia.org/wiki/Data_validation) |
| **Audit** | A periodic, often manual *sensor* for a class of problem — use when the signal isn't yet mechanically detectable (see audit→lint below). | [Software audit](https://en.wikipedia.org/wiki/Software_audit_review) |

### Enforcement posture

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Soft vs. hard enforcement** | Soft = probabilistic, aims an agent, can't block; hard = deterministic, holds the line. "Guidance aims, machinery holds." Orthogonal to the constraint/sensor kind — a sensor can be soft (a reminder) or hard (a lint that blocks); a constraint is usually hard. | [Defense in depth](https://en.wikipedia.org/wiki/Defense_in_depth_(computing)) |
| **Constraint vs. sensor** | A constraint *prevents* drift by scoping what the agent can do (an enum, so it can't pick a wrong synonym this iteration); a sensor *detects* drift after the fact and fails the iteration (the test suite, the lints). Prefer a constraint — the prevented mistake costs no iteration; reach for a sensor where you can't scope the action space. | [Software architecture](https://en.wikipedia.org/wiki/Software_architecture) |
| **Constraint-first / defense-in-depth** | Make the wrong action impossible (a constraint) before catching it (a sensor); a costly failure earns both. "Architecture" is the design activity that builds constraints, not a third kind. | [Defense in depth](https://en.wikipedia.org/wiki/Defense_in_depth_(computing)) |
| **Audit→lint migration** | Convert a recurring audit finding into a deterministic lint; a bug in N>1 files means "fix N sites and add a lint." | [Static program analysis](https://en.wikipedia.org/wiki/Static_program_analysis) |

### Design stances

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Single source of truth** | Every parallel representation is a divergence point; derive one from the other, don't sync both by hand. | [Single source of truth](https://en.wikipedia.org/wiki/Single_source_of_truth) |
| **Extract on the second site (DRY)** | Pull a shared helper on the second occurrence of a logic, not the third — two copies is the extract-now signal. | [Don't repeat yourself](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) |
| **Essence vs. accident** | Attack accidental complexity (parallel impls, primitive-passing); budget for essential complexity (the domain's real hardness). | [No Silver Bullet](https://en.wikipedia.org/wiki/No_Silver_Bullet) |
| **Adopt the schema, skip the runtime** | Inherit a canonical tool's hard-won constraints at naming-convention cost, without running its engine. | [Backstage descriptor format](https://backstage.io/docs/features/software-catalog/descriptor-format) |
| **Marker interface / attribute** | Make every member of a closed set carry a queryable marker, so a drift-detector can enumerate the set mechanically. | [Marker interface pattern](https://en.wikipedia.org/wiki/Marker_interface_pattern) |
| **Measure one level deeper (Ousterhout)** | Instrument one level below the surface number, so the metric can *act* (drive a decision), not merely *report*. | [A Philosophy of Software Design](https://web.stanford.edu/~ouster/cgi-bin/aposd.php) |
| **Semantic gap** | The floor below which a control can't express the policy (a syntactic hook can't judge "does this warrant a test?"). | [Semantic gap](https://en.wikipedia.org/wiki/Semantic_gap) |

## Operations

Shared with the sibling *self-operations* skill — name these the same way across the trio.

### Deploy & release

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Staged deploy** | Promote a change through ordered environments (local → staging → prod), each with its own gates. Use for the promotion pipeline. | [Deployment environment](https://en.wikipedia.org/wiki/Deployment_environment) |
| **Rollback** | Revert to the previous known-good version. Prefer over "undo the deploy." | [Rollback (data management)](https://en.wikipedia.org/wiki/Rollback_(data_management)) |
| **Heartbeat** | A periodic liveness signal a long-running process emits so a watcher can tell "slow" from "stuck." | [Heartbeat](https://en.wikipedia.org/wiki/Heartbeat_(computing)) |
| **SBOM discipline** | Every third-party package the code or gates use is declared in the matching manifest; out-of-band installs are persisted. | [Software supply chain](https://en.wikipedia.org/wiki/Software_supply_chain) |

### Incident & RCA

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Root-cause analysis (RCA)** | Trace a failure to the underlying cause, not the surface symptom. Use for the post-incident investigation. | [Root cause analysis](https://en.wikipedia.org/wiki/Root_cause_analysis) |
| **Blast radius** | The scope of damage if a change or failure goes wrong. Use to bound a risk. | [Fault isolation](https://en.wikipedia.org/wiki/Fault_isolation) |
| **SLO / SLI** | An SLI is a measured signal (latency, error rate); an SLO is the target on it. Name both precisely, not "the metric." | [Service-level objective](https://en.wikipedia.org/wiki/Service-level_objective) |
| **Observability** | The ability to explain any state a system reaches from its external outputs (logs, metrics, traces). Prefer over "monitoring" when the point is diagnosability. | [Observability (software)](https://en.wikipedia.org/wiki/Observability_(software)) |
| **Drift** | Divergence between the intended state and the actual state (config, infra, or a model vs. the code it describes). | [Configuration management](https://en.wikipedia.org/wiki/Configuration_management) |

### Fleet & scheduling

Portable vocabulary for scheduling a fleet of parallel workers (agents or otherwise).

| Term | When to use it / what it means | Reference |
|---|---|---|
| **Dispatch** | Hand a scoped unit of work to a worker to execute. Use "dispatch," not "spawn"/"launch." | [Scheduling (computing)](https://en.wikipedia.org/wiki/Scheduling_(computing)) |
| **Worker pool** | A bounded set of workers draining a queue; the bound is a ceiling, not a target. | [Thread pool](https://en.wikipedia.org/wiki/Thread_pool) |
| **Worktree** | An isolated git working directory a worker edits, so concurrent workers don't trample each other. | [git-worktree](https://git-scm.com/docs/git-worktree) |
| **Maximal independent set (MIS)** | The largest set of mutually-non-conflicting items you can act on at once — the graph frame for batching non-overlapping work. | [Maximal independent set](https://en.wikipedia.org/wiki/Maximal_independent_set) |
| **Disjoint work** | Schedule units to touch non-overlapping resources/files, so they can proceed in parallel without conflict. | [Disjoint sets](https://en.wikipedia.org/wiki/Disjoint_sets) |

---

## Your house vocabulary

The domains above are portable. Every codebase also grows its own coinages — the terms your team says in
standups and design docs that no Wikipedia page defines. Capture them here so the whole team (and every
coding agent) names them the same way. **Fill this table in for your repo; it starts empty on purpose.**

**Your rows live in a local overlay, not in this file.** `lexicon.md` is upstream-owned — a
`bundle_skill.py --refresh` overwrites it, so a house table filled in *here* is lost on the next update.
Put your house dialect in a `lexicon.local.md` sibling instead: it is adopter-owned, read as an **APPEND**
after this file, and never touched by a refresh. The `self-communicate` skill's [`SKILL.md`](../SKILL.md)
declares this overlay in its `## Local adapter` block. Start from this empty template:

| Term | What it means in the house dialect | PORTABLE rename? |
|---|---|---|
| *(your first house term)* | *(what it means in your repo)* | *(coinage, or the established name it renames)* |

The **agent-vs-model** row is the one house entry worth carrying everywhere; it is governed by the
[disambiguation rule](#the-one-disambiguation-rule--agent-vs-model) near the top of this file. This
catalogue's own filled table — its DocAble house dialect, a worked example of the shape — ships in the
adopter overlay [`lexicon.local.md`](lexicon.local.md), composed over this section at read time.

### Bootstrap recipe — walk your codebase

You do not invent this table; you *mine* it. This recipe is the one we ran to build the portable base above,
applied to your own repo:

1. **Sample your sources.** Read your house-rules doc (your `CLAUDE.md`-equivalent), a handful of design
   docs, and your typed enums / registries / schema constants. Those three surfaces hold most of the
   terms-of-art a team actually reuses.
2. **Extract the repeated terms.** Pull every word or phrase you use with a specific technical meaning more
   than once. If it appears once, it isn't house vocabulary yet.
3. **Classify each term.**
   - **PORTABLE** — it has an established name in the wider discipline. Link it (Wikipedia or the canonical
     source) and, if your repo calls it something else, prefer the established name.
   - **HOUSE** — it is your own coinage. Note the standard concept it renames, if any ("*our name for
     model↔code drift-parity checking*"), so a newcomer can map it.
4. **Propose the table.** Draft the rows in the shape above — term · meaning · portable-rename — into a
   `lexicon.local.md` sibling (the adopter-owned overlay), not into this upstream file.
5. **Confirm with the maintainer.** The maintainer ratifies the preferred term and the definition; a
   lexicon nobody agreed to won't be used.

**Keep it living.** Re-walk periodically and whenever vocabulary drifts: a new coinage, or two words for one
idea, is the signal to add or fix a row. A caution learned building this catalogue: **do not publish your
house coinages as if universal** — an outside adopter who copies your `tombstone` or `a11y_` inherits terms
that mean nothing in their repo. Keep the portable base shared; keep the house dialect local.
