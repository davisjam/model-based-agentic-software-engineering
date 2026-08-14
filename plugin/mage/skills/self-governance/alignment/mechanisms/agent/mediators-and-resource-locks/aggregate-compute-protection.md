# Aggregate-compute protection (`lint-all` host mutex)

**Intent** — A one-per-host mutex on `lint-all` (the aggregate lint sweep) plus a one-in-flight
declaration per orchestrator, so the single heaviest compute job cannot run twice on a machine or be
triggered by many agents at once.

| | |
|---|---|
| Summary | One lint-all per host; one in flight per orchestrator. |
| Target | Agent · **Mediators & resource locks** |
| Form | `validation` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking* — flock at entry (hard cap 1800s); the role-enforcement gate refuses `sonnet-active` · bypass `ADA_TOOL_LINT_ALL_NO_MUTEX=1` |

*Its place in the environment — a **variant / known-use** of **Mediated Resource Admission**, under **MANAGE · Manage work, state, and resources**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-manage) shows how it folds.*

## Motivation — the failure it kills

`lint-all` is the single heaviest compute in the system; it fans out over the whole tree. Two
concurrent runs, or many agents each triggering one, melt the host. The failure is *host
exhaustion / OOM* from aggregate work that individually looks fine, and it recurs whenever more than
one lint-all-class job is set in motion at once.

## Why it's not just "the build-serializer already caps heavy compute"

The build-serializer caps *per-invocation* tools at M=8, but `lint-all` is an **aggregate** that
*internally* fans out over the entire tree, so a *single* run already saturates the machine. Bounding
it needs a coarser instrument: a **whole-sweep singleton mutex** (one per host) plus an
**orchestrator-side in-flight declaration** (only one `lint-all`-class brief dispatched at a time),
not a per-call semaphore slot. A semaphore over the pieces still lets two whole sweeps overlap; only a
mutex over the sweep as an indivisible unit keeps the host from melting.

## Mechanism

The aggregate lint runner flocks a host instance-lock at entry (hard cap 1800s, fail-loud). Every code-writing
brief declares a `compute-class` (`lint-all-on-commit` | `lint-all-explicit` | `read-only`); the
orchestrator keeps only **one** aggregate-lint-class brief in flight. The role-enforcement gate refuses to
run the aggregate lint under the `sonnet-active` role (see [role-typed-dispatch](../context-and-dispatch/role-typed-dispatch.md)).
A merge-train staging fast-path avoids redundant sweeps.

## Prerequisites

- **A host mutex** with a hard timeout and fail-loud behavior.
- **A `compute-class` declaration** on briefs so the orchestrator can *count* in-flight aggregate work.
- **Orchestrator-side in-flight accounting**: the one-at-a-time rule is partly discipline, not purely
  mechanical.
- **The role gate** to stop the wrong role from triggering the sweep.

## Consequences & costs

- **Serializes the heaviest gate.** Only one sweep at a time is the point, but it means lint-all is a
  throughput chokepoint under a busy fleet.
- **The in-flight rule leans on orchestrator discipline.** The host mutex is mechanical; the
  "one-in-flight-per-orchestrator" half depends on honest `compute-class` declaration.
- **Bypass and mis-declaration are holes.** `ADA_TOOL_LINT_ALL_NO_MUTEX=1`, or a brief that under-
  declares its compute-class, slips past.

## Known uses

- The aggregate-lint host instance-lock (hard cap 1800s).
- The `compute-class` brief declaration + one-in-flight discipline.
- The role-enforcement gate refusing `sonnet-active`.

## Related mechanisms

- **Consumer** — reads the role from [role-typed-dispatch](../context-and-dispatch/role-typed-dispatch.md):
  the role-enforcement gate is how it refuses the wrong caller.
- **Counterpart** — the brief-side `compute-class` declaration is the soft-ish orchestrator half that
  the hard host mutex backstops.
- *See also (sibling)* — [test-serializer](test-serializer.md), [build-serializer](build-serializer.md):
  the finer-grained mediators. This one rations the aggregate they cannot.
