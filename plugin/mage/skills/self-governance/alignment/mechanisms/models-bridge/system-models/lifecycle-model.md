# Lifecycle model (typed operational map → generated runbook)

**Intent** — Model *how the operating substrate works* as a typed object, not a memorized story: each
lifecycle a named subsystem with a one-line summary of its mechanics and a **machine-checkable
healthy-state predicate**, and each operational symptom a row keyed to the lifecycle it belongs to. Then
**generate the operator's runbook from that model** rather than writing it from memory. The runbook can't
drift from the system it describes, because it is a projection of the same typed map the health checks
read (our instance: a handful of named operating lifecycles — manage-agents, manage-context, manage-git,
manage-deploy, manage-dev-env, the cron plane, the orchestrator's own hooks — each with a healthy
predicate, projected into an operator skill).

| | |
|---|---|
| Summary | Typed map of the system's operation: per-lifecycle health predicate, generating the runbook. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — each lifecycle's healthy predicate is machine-checkable against the live substrate, and the operator runbook is generated from the model so prose can't drift from the map |
| Derivation | `model-to-code` — the operator runbook / skill is generated from the typed lifecycle map |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-know) shows how it folds.*

## Motivation — the failure it kills

An operator runs a substrate with many moving parts: how agents are dispatched and reclaimed, how context
is banked and recovered, how the repository stays deployable, how deploys stage, how the dev machine and
its background jobs behave. The knowledge of *how each part works when healthy* and *what to do when it
isn't* usually lives in one person's head and a scatter of stale docs. Two failures follow. First, the
operator diagnoses from memory, and memory is wrong precisely on the rare failure that matters. Second,
when the operator is an agent with no cross-session memory, "diagnose from experience" is not available at
all — a fresh agent has no idea the queue looks wedged because a lock went stale, and re-derives it slowly
or wrongly every time. The runbook that would have told it rots the moment the substrate changes, because
nothing ties the prose to the system.

## Why it's not just a runbook document

A runbook is prose someone wrote down; this is a **structured model the runbook is generated from**, and the
difference is the difference between a document and a model everywhere in this catalogue. A written
runbook has no healthy-state predicate a machine can evaluate — it says "the queue should be draining,"
not a check that *tests* whether it is. It has no structural key tying a symptom to the subsystem it
belongs to, so its troubleshooting section drifts into an unsorted pile. And it rots silently: the deploy
plane changes, the runbook still describes the old one, and nobody notices until the old instructions
mislead an operator mid-incident. The model fixes each: the healthy predicate is executable, so "is this
lifecycle well?" is a check, not a vibe; every symptom row carries the lifecycle it keys to, so the
runbook is *sorted by the model's own structure*; and because the runbook is projected from the model, a
lifecycle that changes shape reddens a gate until the map is updated, which regenerates the prose. The
operator reads generated text that a check keeps honest, not a document that decays.

## Mechanism

- **Each lifecycle is a named node.** One subsystem of the operation — dispatch-and-reclaim,
  context-banking, keep-the-repo-deployable, the deploy staircase, the dev-machine environment, the
  periodic-GC plane, the orchestrator's own hook machinery — each named, each with a one-line summary of
  how it works when healthy.
- **Each node carries a healthy-state predicate.** A machine-evaluable assertion of what "well" means for
  that lifecycle (no stale locks held, no unconsumed high-severity alert, the deploy tip reachable). The
  predicate is the difference between a description and a check.
- **Symptoms are rows keyed to a lifecycle.** Each known failure signature is a row naming the lifecycle it
  belongs to and the fix that resolves it. The key is what keeps the troubleshooting catalog sorted by the
  system's real structure instead of by accident of authoring order.
- **The runbook is projected from the model.** The operator skill or runbook is generated from the nodes,
  their summaries, and their symptom rows, so it is a view of the model, not a parallel document that can
  disagree with it.
- **The perimeter groups under the lifecycles.** The many small operating mechanisms (gates, locks,
  alerts, cleanup jobs) are presented under whichever lifecycle they serve, so the lifecycle nodes give the
  otherwise-flat operational surface its organizing structure.

## Prerequisites

- **An enumerable set of operating lifecycles.** The operation has to decompose into a small number of
  named subsystems; if "how it runs" is one undifferentiated blob, there are no nodes to hang health and
  symptoms on.
- **A checkable notion of healthy per lifecycle.** The predicate has to be evaluable against the live
  substrate (a status file, a lock table, an alert stream). A predicate no check can read is back to prose.
- **A generation step from model to runbook.** The value of "can't drift" depends on the runbook actually
  being projected from the model, not hand-copied from it once.

## Consequences & costs

- **Operating knowledge stops living only in a head.** A new failure mode is a new symptom row on the
  right lifecycle; a new subsystem is a new node with its own predicate. The model accretes the operator's
  hard-won knowledge instead of losing it between sessions.
- **The healthy predicates must stay honest.** A predicate that drifts from what "well" really means gives
  false confidence, the same hazard as any check that stops matching its subject. The generation gate is
  what pushes an out-of-date predicate to the surface.
- **It models the operator's own work**, which can feel like navel-gazing until the first incident a fresh
  agent resolves in seconds by reading a generated runbook keyed to a failing health check, instead of
  re-deriving the substrate from cold.

## Known uses

- A typed operating map of a fleet's substrate: named lifecycles for managing agents, context, the git
  repository, deploys, the dev machine, the periodic-GC plane, and the orchestrator's hooks, each with a
  one-line mechanics summary and a healthy-state predicate.
- A symptom-to-fix catalog whose rows each name the lifecycle they key to, so an operator lands on the
  right subsystem before reading the fix.
- An operator skill generated from that map — the positive "how it works" map first, troubleshooting as
  the keyed fallback — so the runbook an agent reads is a projection of the model the health checks run on.

## Related mechanisms

- **Sibling** — [agent-orchestration model](agent-orchestration-model.md): both model the fleet substrate,
  from two angles. That one models the *lifecycle transitions* (dispatch → work → land → tombstone) as
  typed state machines; this one models the *operation* of those subsystems — their health and their
  failure signatures — and generates the runbook. The state machine says what the fleet does; the
  lifecycle model says how to keep it running.
- **Bridge** — it models the very substrate the agents run on, so an agent operating the fleet reasons
  through this map the way the product-facing models let it reason through the product.
- **Generalization** — the genre generalizes any single operating runbook into a typed map: a specific
  "how to recover the cron plane" note is one node's symptom rows, not a standalone document.
- *See also* — [model-driven-codegen](model-driven-codegen.md): generating the runbook from the model is
  that mechanism applied to operator documentation, with the same provenance-and-drift discipline.
