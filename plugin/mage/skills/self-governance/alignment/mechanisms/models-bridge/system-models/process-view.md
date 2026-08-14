# Process view (concurrent processes, lanes, and racing edges)

**Intent** — Project a system's concurrency as an explicit *process view*: the concurrent processes that
run at once, the lanes they run in, and the **racing edges** where two of them touch shared state at the
same time. It answers a different question than the machines-and-invariants model beneath it — not "what
are the legal transitions?" but "what is live simultaneously, and where can they collide?" — so a race is
a named edge you can point at, review, and guard, not a surprise found in production (our instance: a
concurrent-process-and-lane projection over the composed lifecycle machines, naming each racing edge as a
first-class element).

| | |
|---|---|
| Summary | Concurrent processes, their lanes, and the edges where they race over shared state. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — a typed projection *held true* against the concurrency structure it views; a declared racing edge with no guarding lock, or a lock guarding no declared edge, is a build finding |
| Derivation | `model-from-code` — projected from the concurrency structure and reconciled against the real concurrent processes |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-know) shows how it folds.*

## Motivation — the failure it kills

Concurrency bugs are the ones a static read of the code never shows. Every process looks correct on its
own; the defect lives in the *simultaneity* — two workers popping the same queue entry, a preemption
requeue racing a terminal write, a cache refreshed by one process while another reads it half-written.
Teams carry this knowledge as folklore: someone remembers that these two paths must not run at once, and
when that person is an agent with no memory across sessions, the folklore is simply gone. Nothing in the
codebase **names** the set of things that run concurrently, so nothing enumerates the pairs that can
collide, so no one can check that each collision is guarded. The race is invisible until it fires, and it
fires rarely enough to survive every test that isn't looking for it.

## Why it's not just the state-machine model

The composed state-machine model and this view describe the *same* concurrency, but they answer different
questions, and folding them into one blurs both. The machine model is about **legality over time**: for
one lifecycle, which transitions are allowed and which predicates hold across the machines. The process
view is about **simultaneity in space**: which processes are alive at the same moment, which lane each
occupies, and which pairs share a resource. An invariant like "a chunk is never both leased and free"
belongs to the machine model; "the preemption requeue and the stale-sweep both write the chunk row, so
that edge is a race" belongs here. You can hold every transition legal and still have an unguarded race,
because the race is a *relationship between two processes*, not a property of either one's state graph.
Keeping the view separate is what lets a reviewer scan the racing edges without re-deriving them from the
transition tables every time.

## Mechanism

- **Enumerate the concurrent processes.** Name every process, worker, or handler that can be live at once
  — not the code paths, the *running things*. This set is the subject the view is built on.
- **Assign each to a lane.** A lane groups processes by where they run (a request handler, a background
  worker, a cron, the orchestrator loop). Lanes make the "what runs beside what" legible at a glance.
- **Name the racing edges.** For each pair of processes that touch a shared resource, declare an edge:
  the two endpoints and the resource they contend over. The edge is a first-class element, not an
  inference a reader has to make.
- **Join each racing edge to its guard.** Every declared edge names the lock, mediator, or atomic step
  that serializes it. An edge with no guard is an unprotected race; a guard protecting no declared edge is
  a dead lock. Both are build findings, so the view and the synchronization it depends on stay in step.
- **Project, don't re-author.** The view is derived over the machine model and the lock registry and
  reconciled against the real processes, so it cannot drift into a pretty diagram that no longer matches
  what runs.

## Prerequisites

- **A concurrency structure to project from.** The view is a projection; it needs the underlying machines
  (what transitions) and the lock registry (what guards what) as its sources. Without them it is a
  hand-drawn box diagram.
- **A registry of the real guards.** Naming a racing edge is only checkable if the locks and mediators
  that serialize edges are themselves declared, so the join "edge ↔ guard" can be verified both ways.
- **An enumerable set of processes.** If "what runs at once" cannot be listed, the racing edges cannot be
  enumerated and the view cannot be closed.

## Consequences & costs

- **Races become reviewable objects.** A new concurrent process forces the author to ask which existing
  processes it can now collide with, and to declare and guard each new edge — the design-time moment that
  a scattered-flag codebase never creates.
- **It is a projection, so it inherits its sources' fidelity.** If the underlying machine model or lock
  registry is wrong, the view is confidently wrong in the same place. Its value depends on the sources it
  reconciles against staying honest.
- **The edge set can grow faster than intuition.** N concurrent processes admit up to N² shared-resource
  pairs; the view surfaces that combinatorial surface, which is uncomfortable but is precisely the surface
  the folklore was silently under-counting.

## Known uses

- A Kruchten-style process view rendered from the concurrency structure: the concurrent worker,
  request-handler, cron, and orchestrator lanes, with the processes that occupy each.
- Racing edges named as first-class elements — the preemption requeue against the stale-sweep, two
  workers against one queue entry, a progress writer against a terminal archive — each joined to the lock
  or atomic step that serializes it.
- The edge ↔ guard join checked both ways, so an unguarded race and an orphan lock are each a build
  finding rather than a comment.

## Related mechanisms

- **Counterpart** — [composed-state-machine-model](composed-state-machine-model.md): the other question
  over the same concurrency. That model gives the machines and the cross-machine invariants; this view
  gives the simultaneous processes and their races. Cross-linked so a reader moves between "what's legal"
  and "what collides."
- **Layer** — this view is built atop the [composed-state-machine-model](composed-state-machine-model.md):
  the machines are the substrate, the process view a projection over them.
- **Consumer** — [synchronization-model](synchronization-model.md): the lock registry this view reads to
  join each racing edge to its guard; the two are checked against each other.
- *See also* — [concurrency-contracts](concurrency-contracts.md): the mediator and single-writer contracts
  that many racing edges resolve to, the enforcement a declared edge points at.
