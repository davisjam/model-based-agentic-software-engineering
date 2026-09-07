# DDT pin-trailers (doc-derived characterization)

**Intent** — Doc-derived tests that characterize *current* behaviour before structural churn, each
carrying a provenance trailer (audited / source / pins) so it is regenerated when the source it cites is
edited.

| | |
|---|---|
| Summary | Doc-derived characterization pinned to a cited source. |
| Target | Product · **Regression tests** |
| Form | `regression` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) — a repeatable characterization body; the presence lint is BLOCKING |

*Its place in the environment — a **variant / known-use** of **Drift / Parity Gate**, under **SYNC · Keep representations equal to reality**. Preserved here for its technical texture.*

## Motivation — the failure it kills

Before a big refactor you want to **pin current behaviour** so the change is provably behaviour-
preserving, and doc-derived tests can silently drift from the doc or source they were derived from. The
failure is two-sided: *unpinned behaviour lost in churn*, or *a doc-derived test that no longer matches
its cited source*. It recurs before every structural change and whenever a cited source is edited.

## Why it's not just "the existing tests already pin behaviour"

Existing tests may not cover the exact behaviour about to churn, and a doc-derived test
can drift from its source with **no signal**. DDT pin-trailers are characterization tests with a
**provenance block**: `DDT-source` names what the test was derived from, `DDT-pins` records the pinned
points, and editing a cited source obliges regenerating the trailer in the *same commit* (the
trailer-regeneration discipline). An ordinary test carries no link back to the source it characterizes,
so a source edit leaves it silently stale; the provenance block is what ties the pin to a cited source
and forces the regen. And note: **near-zero defect yield is success here.** These pin correct behaviour
before change; they are not meant to find bugs, they are meant to catch the change that alters behaviour.

## Mechanism

The doc-derived test files carry a trailer block (`DDT-audited` / `DDT-source` / `DDT-pins`) right after
the module docstring; a trailer regenerator rebuilds it when a cited source is edited in the same
commit. The trailer-present lint is BLOCKING; the trailer-freshness lint is a WARNING (staleness is
informational).

## Prerequisites

- **A characterization-test convention** and a **provenance-trailer schema**.
- **A regen tool** run in the same commit as a cited-source edit.
- **Presence + freshness lints** to keep trailers real.

## Consequences & costs

- **Trailer maintenance.** Editing a cited source obliges a regen, a real if small per-edit cost.
- **Low defect yield by design.** These are characterization pins; a near-zero find rate is the success
  condition, not a sign they aren't working.
- **Freshness is informational only** — the fresh lint never blocks, so a stale trailer can linger.

## Known uses

- The doc-derived test files + the `DDT-audited` / `DDT-source` / `DDT-pins` trailer.
- The trailer regenerator; the trailer-present lint (BLOCKING) + the trailer-freshness lint (WARNING).

## Related mechanisms

- *See also (sibling)* — [test-onion-tiers](test-onion-tiers.md), [property-tests](property-tests.md):
  the other behaviour-pinning bodies.
- **Counterpart** — the freshness lint detects drift of the test from its cited source (keeps the
  provenance honest).
