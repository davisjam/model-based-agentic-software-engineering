<!-- note-spread: 1 -->

**Intent** — Govern a saturable host resource with one live pressure signal read at two layers: an
*admission gate* that refuses or defers heavy work before dispatch, and an *execution shed* that stops heavy
work already running when pressure spikes (our instance: a GREEN/YELLOW/RED host-load monitor gating agent
dispatch and shedding heavy compute at the mediators).

## Problem

A cardinality cap bounds *how many* heavy jobs run, not *whether the host can bear them now*. Two failures
follow. Dispatch-into-overload: the orchestrator admits a heavy agent onto a saturated machine because the
only pre-dispatch check guards a different resource, such as free disk; the agent starts, is refused at the
compute mediators, and burns wall-clock with no headroom. Run-into-overload: pressure rises after admission
and nothing stops the now-too-heavy job. A cap and a single-resource check miss both.

## Mechanism

A host monitor reports a coarse pressure level over the saturable resource — load or memory. Three consumers
read that one signal:

- **Admission gate (pre-dispatch).** A gate sibling to the pre-dispatch checks refuses or defers a heavy
  dispatch under RED, so a heavy brief never lands on a red host.
- **Execution shed (at compute).** The compute mediators refuse-and-shed heavy-class work under RED, stopping
  a job pressure has overtaken.
- **Advisory read (callable).** A plain callable the operator consults in judgment, outside any gate.

## Engineering Consequences

Admission prevents the startup cost; execution shedding catches pressure that rose after admission, which the
gate could not foresee — the two layers are not redundant. One shared reading keeps them from disagreeing;
admit-then-shed churn is that disagreement, and moving the check left to dispatch is the same shift-left as a
cheap gate before an expensive one.

Use this when a saturable host resource is the bottleneck and admission alone cannot protect it. Don't reach
for it when the contention is imaginary — a gate on a resource that never saturates is pure latency.

## Implementation Seam

The signal needs a pre-dispatch gate seam sibling to existing admission checks, an execution-time shed at the
compute step, and a heavy-versus-light work class so light work isn't gated by a signal only heavy work
saturates. As-built, the disk-floor admission gate and the pressure-driven execution shed are wired and the
monitor is callable; the load-pressure admission gate is the extension that closes the dispatch-into-overload
waste.

## Known Limitations

GREEN/YELLOW/RED is coarse: a too-eager RED starves throughput, a too-lax one still admits overload, so the
thresholds are a tuning surface. Admission must *defer* with a wake condition, never drop, or a brief refused
under sustained RED starves. If the two gates read different signals or thresholds, the churn returns. The
advisory read is soft — its value is the operator choosing to consult it.
