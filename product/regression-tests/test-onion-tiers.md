# Test-onion tiers (Smoke / Lite / targeted / full)

**Intent** — A tiered test suite that stratifies ~4000+ tests by cost and coverage (Smoke, Lite,
targeted, full) so cheap tiers gate fast iterations and the full tier gates deploy, pinning behaviour
at the right price per decision.

| | |
|---|---|
| Summary | Cost-stratified test tiers: Smoke, Lite, targeted, full. |
| Target | Product · **Regression tests** |
| Form | `regression` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) — a repeatable regression body; the full tier gates deploy |

*Its place in the environment — a **variant / known-use** of **Staged Admission Gates**, under **ADMIT · Admit or reject changes**. Preserved here for its technical texture.*

## Motivation — the failure it kills

Four thousand-plus tests are too slow to run on every change, but skipping them lets regressions land.
Left unstratified you get one of two failures: *unusably slow iteration* (run everything, always) or
*missed regressions* (run nothing, hope). It recurs on every change and every deploy; the tension is
constant.

## Why it's not just "run all the tests" (or "run a fixed subset")

Running all 4000 on every iteration is unusable; a *fixed* subset misses regressions that fall outside
it. The onion stratifies by **cost matched to the decision being gated**: Smoke (~9 tests, <30s) as a
deploy pre-gate, Lite (hundreds, single-digit seconds), a targeted `ClassName` filter (<5s) for the
edit loop, and the full tier (~4min) at deploy. One tier for every decision is the failing alternative:
it either runs the full suite on every keystroke or gates deploy on the fast subset; each tier sized
to its decision avoids both. **Escalation rules** close the "fixed subset misses things" gap: touching a
Runner, Validator, Registry, or a prompt constant forces the full tier before "done."

## Mechanism

Trait/filter-based tiers (`Suite=Smoke`, `Suite=Lite`, `Format=…`, `FullyQualifiedName~Class`). New
pre-deploy tests obey the **1-second rule** (optimize to <1s or justify in writing) and default to *not*
Lite. The **Tier-3 escalation** rule names the high-blast-radius surfaces that require the full tier.

## Prerequisites

- **A trait/filter system** on the tests to slice them into tiers.
- **Tiers defined by cost + coverage**, and a discipline for which tier gates which decision.
- **The 1-second rule + escalation rules**, or Lite bloats and iteration-tier under-tests.

## Consequences & costs

- **Tier assignment is judgment.** A mis-tiered slow test in Lite erodes the whole tier's speed promise.
- **Escalation depends on discipline.** The rules only help if agents actually run the full tier when
  they touch a named surface.
- **The full tier is still ~4min** — the deliberate price of the deploy gate.

## Known uses

- The `Suite=Smoke` / `Suite=Lite` / targeted / `Format=` full tiers.
- The 1-second rule for new pre-deploy tests; the Tier-3 escalation surfaces.

## Related mechanisms

- *See also (sibling)* — [property-tests](property-tests.md), [fuzz-campaigns](fuzz-campaigns.md),
  [ddt-pin-trailers](ddt-pin-trailers.md): the other behaviour-pinning bodies in this family.
- **Layer** — the full tier gates
  [staged-deploy-gates](../../agent/gates-and-merge-train/staged-deploy-gates.md) (agent side): the deploy stair
  runs this suite.
