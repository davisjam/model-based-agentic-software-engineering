# Journey-criticality → test-tier placement (which host a test runs on, derived)

**Intent** — Make a journey's **criticality** the single input that *derives* which environment tier its
tests run in, and hold a coverage floor over the derivation: every high-criticality journey-part carries a
test in the fast local tier, so a green local run means the major paths work. Placement is derived from a
typed trait, never hand-drawn (our instance: a structured journey-criticality model whose `MAJOR`/`MINOR` axis
derives each journey-part's `local` vs `staging` tier, guarded by a coverage-floor lint).

| | |
|---|---|
| Summary | A journey's criticality derives its test's host tier; a lint holds the local-coverage floor. |
| Target | Bridge · **System models** |
| Form | `validation` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `governs-a-model` — a gate/generator/API/policy whose subject is a model |
| Enforcement | **Soft·Hard** — the structured model *aims* placement (soft: it computes the tier, a human still authors the test); a coverage-floor lint *holds* the invariant (hard: a major part with no local test fails) |
| Governs | `user-journey-model` — a journey's criticality derives its test tier |

*Its place in the environment — a **variant / known-use** of **Model-Derived Assurance Coverage**, under **COMPLETE · Establish completion on re-derived evidence**. Preserved here for its technical texture.*

## Motivation — the failure it kills

A test suite runs across environments of different cost. A fast local tier gates every commit; a heavier
staging tier runs the full matrix. Which test runs where is usually a **hand-drawn line** — "keep the
important journeys local, push the heavy remainder to staging" — and a hand-drawn line drifts from what
actually matters. So a major user path ends up **staging-only**: the local gate passes, a reviewer merges,
and the broken revenue-core flow surfaces only later on staging. Call it the **local-green / staging-red
surprise**. It has two causes, and both come from the line being drawn by hand:

- **A major path has no local test at all.** Nothing ran it in the fast tier, so local-green says nothing
  about it.
- **The tier was mis-assigned to speed up the local run.** Someone shoved a major path staging-only as a
  local-time optimization, and the criticality signal never objected.

The failure is **a fast gate that is trusted to mean more than it covers**: local passes, the majors look
green, and one of them is broken.

## Why it's not just "risk-based testing" (or a test pyramid, or CUJ monitoring)

The idea that important flows deserve stronger verification is old. What is new is deriving the *host tier*
from a typed criticality trait and enforcing a coverage floor on that derivation. Each adjacent practice
wires criticality to a **different output**:

- **Risk-based test prioritization.** Ranks targets by impact and allocates effort accordingly, but as a
  *manual process* — a person ranks and decides. Here criticality is a typed field a tool reads, and the
  tier is a pure function of it, not a judgment re-made each cycle.
- **User-story / journey mapping.** Maps and prioritizes journeys, marking a must-work spine. It is a
  *planning* technique; nothing wires the map to test execution. This consumes the same criticality cut to
  *place tests*.
- **SRE critical user journeys.** Designate a small set of journeys whose health equals product health, and
  attach service-level objectives to them for *monitoring*. Same designation, different consumer: SRE points
  it at alerting, this points it at test-host placement.
- **Test-impact analysis.** Selects which tests to run from the **code-change** axis — which tests touch the
  changed files. That is an orthogonal driver (what changed), not journey criticality (what matters).
- **Test pyramids and tiers.** Classify tests by **type** — unit, integration, end-to-end — and argue for a
  thin top. That axis is granularity, not criticality; a major and a minor journey sit in the same
  end-to-end layer. This model's plane is criticality × host, and it keeps the end-to-end layer thin by
  demanding one local test per major *part*, not per everything.

The distinct move: **criticality → host-tier derivation + a lint-held local-coverage floor.** It is the
derive-a-tier-from-a-model-trait reflex and the audit-becomes-a-lint reflex, applied to test selection.

## Mechanism

Three parts sit on the structured model.

- **A typed criticality axis.** Each journey, and optionally each journey-*part* (a step), carries a
  criticality level — a two-value enum (major / minor), a part inheriting its journey's level when unset. A
  minor journey may still hold a major part, and the reverse; the part is the unit of placement.
- **A total derivation function.** The host tier is a pure function of criticality, computed at model-load,
  **stored nowhere by hand**: a major part derives to *local-depth* (runs in the fast tier and in the full
  staging matrix); a minor part derives to *staging-full* (staging-only). Storing a tier literal would
  reopen the drift the derivation exists to close, so a hardcoded tier is banned — to move a part
  staging-only you must reclassify it minor, a visible criticality edit, not a silent tier edit.
- **A coverage-floor lint (the anti-surprise invariant).** Walk the model: every major part must map to a
  real test in a sanctioned local test home. A major part with no local test is a finding. This is the hard
  half — it makes *local-green ⟹ every major path ran locally* a checked property rather than a hope.

A **selector** closes the loop: a pure function from a deploy context to the concrete test roster, reading
the model and the derivation. It emits the local set (the major-part floor), the staging set (the full
matrix), or a lighter production smoke. The deploy path calls the selector and gates each phase on
membership in the returned roster — the selector *is* the roster the deploy path runs, in place of the
per-environment conditional guards that used to decide, in control flow, which phases a host runs. A phase
runs exactly when the selector's context set contains it. Each
selectable test carries the derived *set* of contexts it runs in, not a single ordinal threshold,
because the host order is a **semilattice, not a chain**. Staging is the top that runs a superset of both
the others; local and production are incomparable, each a different reduction of the staging superset with
neither containing the other. The derivation always puts staging in a test's context set, so "staging
covers everything local covers," and everything production covers, is a containment you check by *calling
the function* on each pair rather than by auditing a deploy matrix. That algebraic shape is enforced by both
a property test over any spec universe and a lint that recomputes containment against the live model.

## Prerequisites

- **A structured journey model with a criticality field and addressable parts.** The derivation attaches to
  parts; without part-granularity the placement is too coarse.
- **A tier taxonomy with a total derivation.** Every criticality level must map to exactly one tier, or the
  function is partial and a new level falls through silently.
- **A sanctioned set of local test homes and a join key** from a journey to the tests that exercise it, so
  the coverage lint can decide "does this major part have a local test?" deterministically.
- **Environments with a real cost gradient.** The mechanism earns its keep only when the tiers differ in
  cost enough that placement matters; one uniform test run needs no placement model.

## Consequences & costs

- **The floor closes *absence*, not *quality*.** The lint proves a major part has a local test; it cannot
  prove that test drives the real gesture rather than a hollow stub. That residual stays human review.
- **The join key is load-bearing.** A major part with no join key to its tests cannot be checked, so it is
  itself a finding — which adds a small annotation cost to every journey.
- **Reclassification is the only escape, by design.** Moving a part off the local floor forces a criticality
  demotion — friction that is the point, but friction nonetheless. A team that over-marks *major* will feel
  the local tier grow.
- **Two levels may be too few, or too many.** The coarse major/minor cut is right-sized for a small product;
  a large one may need a third tier, which means extending the derivation, not hand-placing the outliers.

## Known uses

- A structured journey-criticality model whose `MAJOR`/`MINOR` axis derives each journey-part's `local-depth` vs
  `staging-full` tier at load, storing the tier nowhere by hand.
- The coverage-floor lint: every major journey-part must map to a `@journey`-tagged real-gesture spec in a
  sanctioned local test home, or it is a finding (landed audit-only first, since the composed
  editor-remediate journey has a known gap).
- The per-context selector: a pure function from a deploy context to a frozen set of typed test-specs,
  reading the model to emit the local floor, the full staging matrix, or the light production smoke. The
  cluster-deploy driver imports it and gates each phase on membership in the selected set, in place of the
  per-environment guards, so the selector drives which phases the live deploy runs.
  Each spec's context set is derived, always including staging, so the staging-covers-each containment is a
  property the accompanying test suite and a live-model lint check by calling the function — not by auditing
  a deploy matrix.

## Related mechanisms

- **Sibling** — [formal-invariant-verification](formal-invariant-verification.md): both derive a
  *verification tier* from a typed trait — there the invariant's temporal shape routes its checker, here the
  journey's criticality routes its host. Same derive-a-tier-from-a-model-trait mechanism, different trait and
  different tier axis.
- **Counterpart** — [coverage-model-mapping](coverage-model-mapping.md): that asks *which model invariants
  have any covering test* (coverage presence over invariant nodes); this derives *which host tier* a test
  runs on from a criticality trait, and holds a floor that the fast tier covers the majors. Test-adequacy
  from two angles: is the node tested at all, versus does the cheap gate cover what matters.
- **Enabler** — [executable-source-of-truth](executable-source-of-truth.md): the criticality axis and the
  derived tiers are fields on the structured model; this is one more consumer of that substrate, and
  [drift-parity-gates](drift-parity-gates.md) keep the model's journeys matching the real specs the lint
  reads.
- **Consumer** — the [user-journey model](user-journey-model.md) supplies the journeys and the
  criticality designation this consumes; the [service-flow model](service-flow-model.md) carries the typed
  journey entities whose steps anchor the parts. This mechanism points that criticality cut at a new output:
  test-host placement.
