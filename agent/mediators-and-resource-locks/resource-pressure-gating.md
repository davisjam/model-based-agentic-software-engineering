# Resource-pressure gating (admit before, shed during)

**Intent** — Govern a saturable host resource with a **live pressure signal** read at *two* layers: an
**admission gate** that refuses or defers heavy work *before it is dispatched*, and an **execution shed**
that stops heavy work *already running* when pressure spikes, both driven by one signal that is *also
callable* for the operator's own judgment. Heavy work is then neither *started* into an overloaded host
nor *left running* on one (our instance: a GREEN/YELLOW/RED host-load monitor that gates agent dispatch
and sheds heavy compute at the mediators).

| | |
|---|---|
| Summary | One pressure signal gates heavy work at admission and execution — admit before, shed during. |
| Target | Agent · **Mediators & resource locks** |
| Form | `quality-gate` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) — a pre-dispatch gate refuses/defers heavy work and the compute mediators shed it under RED pressure; the same signal is callable for advisory decisions |

*Its place in the environment — the **canonical mechanism** for **MANAGE · Manage work, state, and resources**.*

## Motivation — the failure it kills

A cardinality cap (N-at-a-time) bounds *how many* heavy jobs run, not *whether the host can bear them
right now*. Two failures follow. **Dispatch into overload:** the orchestrator admits a heavy agent onto an
already-saturated machine because the only pre-dispatch check guards a *different* resource (free disk,
say); the agent starts, reaches the compute mediators, and is refused, so it **polls and sheds**, burning
wall-clock (a heavy agent has burned ~10 minutes polling) on work that never had headroom. **Run into
overload:** pressure rises *after* a job was admitted, and nothing stops the now-too-heavy job mid-flight.
Cardinality caps and single-resource admission checks miss both. The missing ingredient is a *live
pressure reading* consulted at the two moments work is **admitted** and **executed**.

## Why it's not just "the compute mediators already shed under pressure"

Shedding at the mediators is *execution-time* and *reactive*: it fires only once the work has been
dispatched, spun up a worktree, and reached the compute step, so the cost of *starting* doomed work is
already paid (the poll-and-shed waste). An **admission gate** moves the same pressure check *left*, to
dispatch time: it refuses or defers the heavy brief before a worktree is ever created, so the doomed work
never starts. The two are not redundant. Admission prevents the *startup* cost; execution shedding
catches pressure that **rose after** admission, which the gate could not foresee. Shedding does stop a
job pressure has overtaken, but only after the host paid to start it. Admission refuses before you spend;
a saturable resource wants both, driven by one signal so the two layers cannot disagree.

## Mechanism

A host monitor reports a coarse pressure level (GREEN / YELLOW / RED) over the saturable resource (load,
memory). Three consumers read the one signal:

- **Admission gate (pre-dispatch).** A gate sibling to the existing pre-dispatch checks (e.g. a free-disk
  floor) reads the pressure level and *refuses or defers* a heavy dispatch under RED; the heavy brief is
  never admitted onto a red host.
- **Execution shed (at compute).** The compute mediators return a *refuse-and-shed* for heavy-class work
  under RED, stopping a job pressure has overtaken.
- **Advisory read (callable).** The same signal is a plain callable, so the operator can consult it in
  judgment ("at YELLOW, dispatch fewer heavy agents") instead of only having it fire inside gates.

One signal, three readers: a gate, a shed, and an advisor. **⚠️ As-built:** the disk-floor admission gate
and the pressure-driven execution shed are wired, and the monitor is callable, but the *load-pressure*
admission gate is the identified extension. Today heavy work is admitted regardless of load and only shed
*later* at the mediators, which is exactly the "dispatch into overload → poll-and-shed" waste the
admission layer closes.

## Prerequisites

- **A live pressure signal** over the saturable resource, cheap enough to read at every dispatch and every
  compute entry.
- **A pre-dispatch gate seam** the signal can hang on, sibling to whatever admission checks already exist
  (disk floor, quota).
- **An execution-time shed** the signal drives at the compute step.
- **One signal, shared**: admission and execution must read the *same* reading, or they disagree
  (admit-then-shed churn is that disagreement, when only the execution layer reads pressure).
- **A heavy-vs-light work class**, so light work is not gated by a signal only heavy work saturates.

## Consequences & costs

- **Coarse by design.** GREEN/YELLOW/RED is a blunt instrument: a too-eager RED starves throughput, a
  too-lax one still admits overload. The thresholds are a tuning surface, not set-and-forget.
- **Admission must *defer*, not drop.** A heavy brief refused under sustained RED needs a retry/defer
  policy, or it starves; the gate degrades to a deferral with a wake condition, never a silent drop.
- **Two readers, one signal; keep them consistent.** If the admission gate and the shed read different
  signals or thresholds, you reintroduce the churn the mechanism exists to kill. One shared signal is
  what makes the two layers agree.
- **The advisory read is soft.** Its value is the operator *choosing* to consult it; unlike the gates, it
  cannot enforce.

## Known uses

- A host load/pressure monitor (GREEN/YELLOW/RED) read by the compute mediators to *refuse-and-shed*
  heavy-class work under RED.
- A pre-dispatch admission gate, sibling to a free-disk floor, that refuses/defers heavy dispatch (⚠️ the
  disk floor is wired; the load-pressure gate is the identified extension that closes the
  dispatch-into-overload waste).
- The monitor as a plain callable the operator consults for YELLOW-aware dispatch judgment.

## Related mechanisms

- **Counterpart** — [aggregate-compute-protection](aggregate-compute-protection.md), and the finer
  [test-serializer](test-serializer.md) / [build-serializer](build-serializer.md): they ration heavy
  compute by **cardinality** (how many run at once); this rations by **live pressure** (whether the host
  can bear more *now*), across admission *and* execution. The named axis is *cap-the-count* versus
  *gate-on-the-condition*; a saturable host usually wants both.
- **Layer** — the two readers sit at two points of the path-to-work: the **admission gate** left of
  dispatch, the **execution shed** at compute. The shared signal is what keeps the two layers agreeing.
  Moving the check left (admission) is the same *shift-left* logic that puts a cheap gate before an
  expensive one.
