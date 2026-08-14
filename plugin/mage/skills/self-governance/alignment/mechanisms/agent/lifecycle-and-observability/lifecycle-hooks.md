# Lifecycle hooks (interpose on the agent runtime's events)

**Intent** — Bind a script to the agent runtime's lifecycle events (turn-stop, pre-compaction,
session-start, before-a-tool-call) so a step the operator keeps *omitting at runtime* fires
deterministically, whether or not anyone remembered it.

| | |
|---|---|
| Summary | A hook on a runtime lifecycle event so an operator's omitted step can't be forgotten. |
| Target | Agent · **Lifecycle & observability** |
| Form | `quality-gate` |
| Move | `package` — a constraint shipped with its sensors |
| Model | — |
| Enforcement | **Soft·Hard** — the *firing* is hard (the runtime guarantees the hook runs at the event); the *payload* is either a hard **block** that denies the action or **soft guidance** injected back into the agent's context |

*Its place in the environment — the **canonical mechanism** for **MANAGE · Manage work, state, and resources**. The variants and known uses that fold under it are gathered on the [construction-kit page](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-manage).*

## Motivation — the failure it kills

Some recurring failures live not in the code an agent writes but in the **loop that drives it**: the
operator (a human, or an orchestrator agent) skipping a step at a predictable moment. Ending a turn with
ratified work still queued. Compacting context without first writing a hand-off. Opening a session
without reading the alert backlog. Editing outside the sanctioned worktree. A lint can't reach these:
there is no source artifact to analyze, and the omission happens at runtime, in the loop itself. A
house-rule (*"remember to…"*) only aims a probabilistic operator, and it rots, because the step gets
skipped exactly when attention is thin. The failure recurs every session.

## Why it's not just "a house-rule in the governance doc"

A governance-doc rule depends on the operator **recalling it at the right moment**, which is precisely
what fails under load. A lifecycle hook removes the recall: the runtime fires it on a named event, so
the check runs whether or not anyone remembered. It **splits the two halves of enforcement that a lint
fuses.** The *firing* is hard, guaranteed by the runtime, impossible to forget. The *payload* is
either: a hard **block** that denies the action (a pre-edit guard refusing a write outside the
worktree), or **soft guidance** injected back into the agent's own context (a turn-stop hook that
re-states *"work still queued"* and leaves the agent to judge). The reflex case (*hard delivery of soft
guidance*) is the one to understand: it does not swap judgment for machinery, it makes the **aiming
deterministic.** The same guidance the house-rule offered, fired *exactly* at the decision point, every
time.

## Mechanism

The runtime exposes named lifecycle events and a surface to register scripts against them. A hook is a
script bound to one event; the runtime invokes it at that moment and reads its result. A **blocking**
hook returns a veto and the action is denied. A **guidance** hook returns text that is re-injected into
the agent's context, aiming the next decision without compelling it. The event fires regardless of the
operator's state of mind, so the two design constraints are: keep the check cheap (it runs on *every*
occurrence of the event), and make a guidance hook fail-open (a crash must not wedge the loop; reserve
fail-closed for the deliberate blocking case).

A hook's output is a **typed contract with the runtime**, not free text. The runtime accepts one specific
shape and *silently drops* anything else. Validate a hook's output against the runtime's *actual* schema,
never against the hook's self-declared idea of the contract: a hook checked only against its own shape can
emit a form the runtime rejects, pass its own test green, and be dropped on every fire in production, the
worst fail-open, since it *looks* wired and does nothing. A build-time conformance check over every wired
hook (output validated against the real runtime schema) kills that class.

A runtime lifecycle event is the **rung** an operator-loop omission belongs on: it is the only scope where
the loop's state is visible, so a syntactic commit hook asking the same question sits below the semantics it
must judge and leaves a gap it cannot bridge. Which rung a mechanism belongs on is the general placement
question — see [semantic-level-enforcement](../governance-doc-controls/semantic-level-enforcement.md).

## Prerequisites

- **A runtime that exposes lifecycle events**, plus a registration surface. Without the seam there is
  nothing to hook.
- **A cheap check.** The hook fires on every occurrence of its event; an expensive one stalls the loop
  and creates pressure to disable it.
- **Fail-open for guidance hooks.** A bug in the hook must not brick the session; only the deliberate
  block is fail-closed.
- **A named, recurring omission.** Reach for a hook once a soft reflex has demonstrably failed to hold,
  not on first sight; a hook manufactured for a one-off is pure overhead.

## Consequences & costs

- **It fires on every event, not only when needed.** A turn-stop hook runs at *every* stop, including
  the ones where nothing was owed; the check must stay cheap or the tax is constant and resented.
- **A guidance hook can be ignored.** Its payload is soft: the agent may read the re-injected text and
  proceed anyway. It aims deterministically; it does not compel. Only the blocking variant compels.
- **A buggy hook is a loop-level outage.** A blocking hook that misfires, or a guidance hook that
  crashes without fail-open, stalls the whole session; the blast radius is the loop, not one commit.
- **It can nag.** A hook that fires on a state it misreads ("work still queued" when the operator is
  legitimately blocked on a decision) produces repeated false prompts, and a signal that cries wolf
  gets tuned out.

## The measured leash — a soft payload must instrument its own firing

A hard **block** is self-evident: the action it denies doesn't happen, and the failure it prevents stops
recurring; the absence *is* the signal. A **soft** payload has no such tell, and it dies two silent
ways. It stops firing (a wiring change, a stuck dedupe flag) and no one notices the reminder went
missing. Or it fires so often the operator learns to tune it out, and it becomes the tower-of-governance
it was meant to prevent. Neither failure shows in the code or the runtime.

So a soft hook ships **its own firing telemetry**: one record per fire with a session key, a query over
the log, and a *yield* check that correlates each firing against the thing it was meant to provoke. Did
a nudge to convert a recurrence into a mechanism actually precede one? The hook then lives on a **measured
leash**, an evaluation plan with a written pull condition: if it over-fires, or shows near-zero yield
across many sessions, you pull it. You cannot manage a probabilistic mechanism you cannot watch fire. And
the payload itself biases hard toward silence (*"usually a no-op; a false nudge is worse than a missed
one"*) because for a soft reminder the default outcome must be doing nothing, or the fatigue sets in
before the telemetry can catch it. Instrumentation is what separates a soft mechanism that is *working
quietly* from one that is *silently dead*; without it the two look identical.

The failure sharpens as reflection facets accrue. Once you want the operator to reflect on more than one
policy (convert-a-recurrence *and* spot-a-second-copy *and* a stale runbook), firing each as its own hook
is the alarm-fatigue trap by another door: N soft nudges a turn compound into the noise each was biased to
avoid. Consolidate them into a **single tempo-gated reflection** that rotates or batches the facets, so the
operator gets one paced prompt rather than a chorus. Each facet stays default-silent, the *substrate*
paced so the whole never overwhelms.

## Known uses

- A **turn-stop hook** that refuses to let the loop rest while ratified work remains and the worker pool
  is under its cap (*hard delivery of soft guidance*): it re-prompts, the agent decides.
- A **turn-stop self-check hook** that, at most once per long window, re-arms the operator's reflex to
  convert a *recurring* failure into a durable mechanism, the operate→harden handoff fired as a runtime
  event. It ships a firing-telemetry log and a yield query correlating its nudges against real
  conversions, and biases its payload hard toward silence. Its first organic firing closed the whole
  loop on itself: the telemetry had shown the convert-a-recurrence-into-a-mechanism discipline was reached
  for ~never (its knowledge applied ambiently instead); the hook turned that dormant reflex into a
  deterministic nudge; the nudge produced the discipline's first real invocation; and that invocation
  routed a failure recurring all session into a mechanism: the yield query's first positive correlation,
  and the keep-signal that says *don't pull the hook.*
- A **pre-compaction hook** that writes a hand-off before context is compacted, so in-flight state
  survives the summarization.
- A **session-start hook** that runs the session-start ritual (reading the unconsumed alert backlog)
  before the first action of a resumed or compacted session.
- A **before-a-tool-call guard**: the hard-block variant denies an edit outside the sanctioned worktree;
  a guidance variant surfaces unresolved alerts before a dispatch.
- A **build-time output-conformance check** validating every wired hook's output against the runtime's
  actual schema, so a hook emitting a shape the runtime silently drops (wired-but-dead) is a build error,
  not an invisible no-op.

## Related mechanisms

- **Counterpart** — [pre-commit-hook](../gates-and-merge-train/pre-commit-hook.md): both are hooks, but
  that one fires on a *commit* and guards what gets **written**; this one fires on a *runtime lifecycle
  event* and guards what the loop **does**. The named axis is *commit-content* vs *runtime-loop*.
- **See also** — [cron-alerts-gate](cron-alerts-gate.md): a before-a-tool-call hook is one delivery
  surface for its "an unresolved high-severity alert blocks new work" rule. The gate supplies the
  state; the hook fires the check at the moment of action.
- **Generalization** — [reflection-facet-substrate](reflection-facet-substrate.md): what you build once a
  *second* reflection hook appears. A single hook re-arms one omitted reflex; the substrate consolidates
  many policy-reflection facets over one shared tempo budget (≤1 emission/window), so N soft nudges don't
  compound into the alarm fatigue the measured leash above warns about.
- *See also (temporal complement)* — [dynamic-context-injection](../context-and-dispatch/dynamic-context-injection.md):
  the feed-forward twin. Injection pushes the governing constraints *into* an agent at dispatch, before it
  acts; a tempo-gated **reflection** hook pulls the *operator* back to the same kind of policy at
  turn-tempo, while or after acting. Forward-priming versus backward-reflection: the same "right policy at
  the right lifecycle moment" move, mirrored in time.
- *See also (placement)* — [semantic-level-enforcement](../governance-doc-controls/semantic-level-enforcement.md):
  a runtime lifecycle event is the rung that judgment picks for an operator-loop omission; this entry is a
  mechanism *placed* by it.
- **Layer** — it sits at the agent runtime, upstream of the commit → cron → merge-train → deploy
  staircase; it governs the operator *driving* that staircase, not the work flowing through it.
