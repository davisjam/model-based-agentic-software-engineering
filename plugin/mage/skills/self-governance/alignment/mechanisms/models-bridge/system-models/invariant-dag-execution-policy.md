# Invariant-DAG execution policy (a typed Scheduler separates correctness from resource + cost)

**Intent** — Keep a build/deploy dependency graph a statement of **correctness only**, host-identical
everywhere, and push every environment-specific execution concern — how much may run at once, and whether
a costly step is worth running — into a typed **Scheduler** that reads a per-host profile and produces the
execution plan. Separate three edge intents so a reader can tell a real dependency from a resource or
budget accommodation (our instance: a deploy DAG whose edges carry a `CORRECTNESS`/`COST_GATE`/`LOAD`
intent, with `LOAD` edges migrated out to a typed `Scheduler` that reads a per-host `(concurrency-ceiling,
budget)` profile).

| | |
|---|---|
| Summary | A DAG holds correctness + cost-gate edges only; a typed Scheduler rations load + budget per host. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `governs-a-model` — a gate/generator/API/policy whose subject is a model |
| Enforcement | **Soft·Hard** — the per-host profile *aims* the execution plan (soft: it computes concurrency and budget policy, an operator still sets the values); two lints *hold* the separation (hard: a load edge in the DAG, or a per-environment edge divergence, is a finding) |
| Governs | `all-models` — the correctness DAG over every model's build obligations |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-know) shows how it folds.*

## Motivation — the failure it kills

A build or deploy pipeline is a dependency graph: `B needs A` means B runs after A. The graph is supposed
to state **correctness** — B produces a wrong or failed result without A. In practice two other concerns
leak into the same `needs=` syntax, and once they do the graph stops meaning one thing:

- **Resource rationing dressed as a dependency.** A step waits for another not because it consumes its
  output, but because they contend for one scarce box — a single local worker, the build machine's CPU. The
  wait is spelled `B needs A`, identical to a correctness edge. It is not an ordering fact; it is an
  accommodation that vanishes the moment the host is elastic.
- **A cost gate dressed as a dependency.** A cheap check gates an expensive one — run the free structural
  check before the paid GenAI check, so a red free check doesn't burn money. Again spelled `B needs A`,
  and again not a correctness fact: B is not *wrong* without A, only *wasteful*.

The graph now **lies to its reader**: three unrelated intents wear one syntax, and telling them apart takes
per-edge archaeology. The usual patch makes it worse — a per-environment conditional in graph construction
(`if host == "prod": drop this edge`) that strips the rationing edges back out where the box is elastic. The
graph mutates per host, the strip rule lives in control flow rather than the types, and two failure modes go
uncaught: a rationing edge added without the guard silently ships to an elastic host, and a correctness edge
caught by an over-broad strip silently disables a gate. One incident is the shape in miniature — a
single-worker queue-drain wait modeled as a `needs` edge took a multi-paragraph root-cause analysis to
prove it was "stale convenience, not a true dependency" before it could be removed. **The graph did not
encode why the edge existed**, so every host difference became a prose-guarded special case.

## Why it's not just conditional pipeline construction (or a DAG scheduler, or resource classes)

Every CI and deploy system already builds a dependency graph, schedules it with bounded concurrency, and
varies it per environment. The distinct move is grounding execution policy in **measured per-host
performance and cost**, expressed as a typed layer over a graph that is held **invariant** — with a
**budget** dimension that gates economic edges. Each adjacent practice stops short of one of those:

- **Conditional graph construction (`if prod: skip`).** The common patch bakes environment differences
  into the graph builder — an `env` branch adds or drops edges. That is the failure this replaces, not an
  alternative to it: the graph varies per host, and a reader still can't tell a dropped correctness edge
  from a dropped ration. Here the graph is a pure function of the selected step roster, identical on every
  host; only a separate typed policy varies.
- **A DAG scheduler with a concurrency limit.** Build systems ration parallelism with a global job count.
  That caps *how many*, but it does not separate *why an edge exists* — a contention wait is still an edge,
  and the scheduler can't distinguish it from a correctness edge to relax it safely. Here contention is not
  an edge at all; it is a semaphore in a plan the Scheduler emits, so raising a host's ceiling is a profile
  edit, never a graph edit.
- **Resource classes / tags on jobs.** Labeling jobs by the resource they need is close, but it rations
  *load* only. It has no notion of a **budget** that decides whether a costly step is worth running behind a
  failed cheap one. The cost gate here is a first-class edge intent whose honoring is a Scheduler read of a
  per-host budget, not a job label.
- **Cost-aware CI (skip expensive stages when cheap ones fail).** Fail-fast ordering is old. What is new is
  modeling that ordering as a **declared edge intent** on a host-invariant graph, relaxable only by a
  profile whose budget is unbounded — so the economic policy lives in one typed place, not scattered
  `if cheap_failed: exit` guards.

The move that ties it together: **three edge intents on an invariant graph, plus a typed Scheduler that
reads a per-host `(concurrency-ceiling, budget)` profile and produces the plan.** Resource *and* cost
rationing become a policy over a graph that never changes shape, rather than mutations of the graph itself.

## Mechanism

Four parts.

- **A typed edge-intent axis.** Every dependency edge declares one of three intents, orthogonal to whether
  the dependency produces a consumed artifact:
  - **`CORRECTNESS`** — B produces a wrong or failed result without A (artifact producer→consumer, a live
    cluster, a warm backend, a fan-in convergence). Honored on every host, unconditionally.
  - **`COST_GATE`** — A is a cheap check gating an expensive B; running B when A failed wastes money. B is
    not wrong without A, and the dependency is economic, not contention. Honored by default; relaxable only
    under a profile whose budget is unbounded.
  - **`LOAD`** — B contends with A for a scarce box. Not an ordering fact — a rationing accommodation that
    evaporates the moment the host is elastic.
  The separating tell: a `LOAD` edge vanishes when the box vanishes; a `COST_GATE` edge vanishes only when
  the *budget* is unbounded. `LOAD` is bounded by a box, `COST_GATE` by money.

- **A host-invariant DAG.** Only `CORRECTNESS` and `COST_GATE` edges live in the graph, and the graph is
  identical across every host over the roster they share. `LOAD` edges are forbidden in the graph; they
  migrate out. No `env` parameter reaches the edge set — an `env` input may pick *which steps* run (the
  Selector's job) but never *which edges* connect them.

- **A typed Scheduler over a per-host profile.** A `Scheduler` maps a host profile
  `(concurrency-ceiling, budget)` to a `ConcurrencyPlan` — a set of resource semaphores and rationing
  constraints over the graph's nodes, plus a per-`COST_GATE` honor decision. A single-worker host gets a
  permits-1 semaphore that serializes what used to be a queue-drain edge; an elastic host gets an identity
  plan that fires the whole ready wave at once; a light-touch host gets a low bounded submission. A new
  environment is a **new profile row**, a `(ceiling, budget)` tuple — never new graph code. The policy that
  maps a profile to a plan is a pure value transform; the live acquire/release permit counts are
  state-bearing, so the running Scheduler is a class. It emits its rationing decisions as a timestamped
  record — for each wave, how many nodes were ready, how many launched, how many queued — so the plan
  *acts on* load rather than only enforcing it.

- **Two lints holding the separation.** A stable lint reads the built graph and asserts the invariant: no
  edge carries the `LOAD` intent (load rationing belongs to the Scheduler), reading the permitted-intent set
  from the Scheduler's own definition rather than re-spelling it. A sibling lint asserts the edge set is
  consistent across hosts — the top host's roster dominates each lower host's, and the two lower hosts stay
  incomparable — so any surviving `env` branch in the builder adds or removes *steps*, never *edges*. Both
  land audit-only first and promote to blocking once the graph confirms zero load edges — a red blocking
  lint must never enter the deploy gate.

## Prerequisites

- **A structured dependency-graph model with addressable edges.** The intent axis attaches to edges; without a
  typed edge record there is nowhere to declare correctness-vs-cost-vs-load.
- **A host taxonomy with a real cost or concurrency gradient.** The Scheduler earns its keep only when hosts
  differ — one elastic, one single-boxed, one budget-bounded. A uniform execution environment needs no
  per-host policy.
- **A closed set of rationed resource classes.** The load lint decides "is this edge a contention
  accommodation?" by matching a small, enumerated set of resource classes (the worker queue, the build CPU),
  read at check time rather than snapshotted.
- **A step selector, or at least a stable roster.** The graph is a function of the selected roster; the
  host-invariance claim is stated over the roster two hosts share, so the roster must be addressable
  separately from the edges.

## Consequences & costs

- **The graph gains a second axis to author.** Every edge now declares an intent, not just a target. That
  is the cost of legibility — the intent is what makes the graph honest, but it is an annotation on each
  edge.
- **Behavior identity across the migration must be pinned.** Turning a single-worker queue-drain *edge* into
  a permits-1 *semaphore* is behaviorally equal at N=1 but diverges at N>1 (the semaphore permits
  concurrency the edge forbade). That divergence is a feature — raising the ceiling becomes a one-field
  profile change — but the migration must carry a check that the low-concurrency host still serializes, or a
  silent concurrency regression ships.
- **Two rationing layers may coexist.** A host may already have out-of-graph resource mediators (a test
  serializer, a build semaphore) that guard a different scope than the deploy Scheduler. Unifying them under
  one rationing authority is attractive but is its own effort; until then, two layers ration at two scopes.
- **The cross-host graph diff has a cost.** The invariance lint builds each host's roster and diffs the
  selection sets; if the builder is slow to import, the lint is expensive and belongs in a deploy-scope gate
  rather than every commit.

## Known uses

- A `CORRECTNESS`/`COST_GATE`/`LOAD` `EdgeIntent` enum on the deploy driver, orthogonal to the existing
  artifact-producer `EdgeKind`. Only the first two are DAG-resident; `LOAD` is forbidden in the graph and
  migrates to the Scheduler. A frozen `DAG_RESIDENT_INTENTS` set is the single source the load lint reads.
- A typed `Scheduler` — a pure `plan_for` that maps a frozen `HostLoadProfile(concurrency_ceiling, budget)`
  to a frozen `ConcurrencyPlan`, over three named host profiles: the local host rations to one permit
  (protect the shared VM), the staging host is the unbounded stress burst, the production host is a low
  finite smoke ceiling. Moving the stress test from one host to another is a one-cell edit to the profile
  table. A `RationingRecord` carries per-wave ready/launched/queued counts so the plan acts on load.
- The load-edge lint: it reads the deploy phase registry and the Scheduler's `DAG_RESIDENT_INTENTS`, and
  reports any `needs` edge whose intent is `LOAD` as a finding. Its companion superset lint calls the
  host-test selector and asserts the top host dominates each lower host while the two lower hosts stay
  incomparable — the edge-set-is-host-consistent invariant. Both landed audit-only first (they find zero by
  construction), pending promotion to blocking.

## Related mechanisms

- **Sibling** — [journey-criticality-test-placement](journey-criticality-test-placement.md): a typed policy
  layer over the same deploy substrate, from the same effort, but a different subject and failure. That
  derives *which tests* run *on which host* from a journey's criticality; this derives *the execution plan*
  over a deploy graph by separating edge intents and rationing resource + cost from a per-host profile. One
  places tests by criticality; the other rations execution by resource and budget. Both consume the same
  host taxonomy; neither subsumes the other.
- **Consumer** — [deployment-topology-model](deployment-topology-model.md): supplies the host taxonomy
  the per-host profile keys on. The Scheduler's profile is one row per host in that model's terms.
- **Enabler** — [executable-source-of-truth](executable-source-of-truth.md): the edge intents and the
  per-host profiles are fields on the structured deploy model, one more consumer of that substrate;
  [drift-parity-gates](drift-parity-gates.md) keep the model's graph matching the real deploy phases the
  lint reads.
- **Sibling** — [control-substrate-dependency](control-substrate-dependency.md): both attach *typed metadata to
  edges* and compute a decision from it — there a mechanism's blast radius over the substrate it guards, here
  an edge's intent driving whether the Scheduler honors, rations, or ignores it. Same reflex of making an
  edge's meaning a typed field a tool reads, applied to a different graph.
