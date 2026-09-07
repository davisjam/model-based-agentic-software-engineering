# User-journey model (product-goal → implementation bridge)

**Intent** — Model the product's user journeys as first-class typed entities: each an *actor* pursuing a
*goal* through *ordered steps*, every boundary-crossing step joined to the endpoint it calls. The path
from *what the product is for* to *what the code must provide* becomes a queryable model. Graft it into the
service-architecture dialect you already lint and query rather than standing up a parallel model (our
instance: a UML-use-case-flavored `Journey` entity kind added to the existing Backstage service-flow
dialect).

| | |
|---|---|
| Summary | User journeys as typed entities: actor, goal, ordered steps joined to the endpoints they cross. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — a typed source-of-truth held true by a call-site drift lint (declared deps ↔ real call sites) plus two-way endpoint-coverage audits; the lints land audit-only, then promote to blocking |
| Derivation | `model-from-code` — induced from the code, reconciled at build |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture.*

## Motivation — the failure it kills

The path from a product goal (*a user opens a document in the editor, applies fixes, re-checks
conformance*) to the code that serves it lives in people's heads. Nothing ties a journey to the
endpoints it hits, the tests that cover it, or the services it needs. So journeys go untested without
anyone noticing; endpoints accrete that no journey needs and no one dares delete; a component's *declared*
dependencies quietly fall out of date with the calls its code actually makes; and the backend is sized
for a blurred average of all traffic rather than the journey underway. Each is a quiet failure: a
coverage hole, dead surface, a stale dependency map, mis-sized capacity. None is visible from the
code alone, **because the journey is the one thing the code never names.**

## Why it's not just "the service-flow model" (a new kind, not a new model)

This model and the structural service-flow model share the *same substrate*: one dialect, one loader,
one query surface, one lint. What differs is the entity. Service-flow's kinds are *structural* (a
component, an API, a system) saying which services exist and how they are wired. A journey is
*behavioral and goal-anchored*: an actor, a goal, an ordered sequence of steps, each step naming the
endpoint it crosses a service boundary to reach. Modeling journeys as a new **kind within** the
structural dialect, rather than a parallel journey model, pays off twice: it is the one entity anchored
at *product goals* (so it bridges **down** to code where the structural kinds map **across** it), and it
inherits the structural model's whole machinery (dead-ref join, query surface, lint) instead of
standing up a second architecture model to maintain. **Distinct model, shared carrier.**

## Mechanism

Each journey is a typed entity: an actor, a goal, and an ordered list of steps, each step naming the
endpoints it calls. The shape is borrowed from the genre's best-in-class, a UML use-case (actor + goal +
ordered activity flow) with the C4 dynamic-view idea that each ordered step carries a description and a
call. It adopts that *conceptual* schema while skipping its interchange runtime, hosted in the dialect
already in use. A journey also records its **call-site anchors**: the points in code where it issues each
service call, which are the reconciliation key.

A journey's dep list is a *derived* fact (the deps come from real call sites), so the risk is drift, and
a **call-site drift lint** holds it true both directions: every declared dependency must have a real call
site (no stale declaration), and every service-client call site in the journey's own code must appear in
its declared deps (no silent under-declaration). This makes the model a **checked cache of the call-site
truth**, not a hand-authoritative document that rots. It converts an O(N)-PRs silent drift into an
O(1)-at-PR correction. Two coverage audits ride on the same model:

- **Undertested-journey audit.** Every endpoint a journey declares must be exercised by the journey's
  test module (the one idea worth borrowing from BDD: the test module *is* the scenario that must cover
  the deps). A declared dep no test touches is a coverage hole a flat test count hides.
- **Dead-endpoint audit.** Every endpoint some service exposes must be reached by *some* journey. An
  endpoint no journey needs is dead surface (dead code plus needless attack surface), safe to retire.

All three are the existing drift/parity machinery applied to a new model: the model is the new thing, the
mechanisms come from machinery that already exists.

## Prerequisites

- **The semantic fields are human-authored.** Actor, goal, ordered steps carry intent a grep cannot
  derive; only the deps and call-site anchors are reconciled against code. So the model is a *linted
  document*, not codegen.
- **Endpoints already addressable as stable entities** the journey can reference. The join needs no new
  endpoint registry invented if one already exists.
- **The reconciliation machinery pointed at the model.** A journey model is only trustworthy because a
  mechanism keeps it fresh; without the drift lint it rots exactly as an unmaintained dependency list does.

## Consequences & costs

- **A new journey, or a new service call in a journey's code, ⇒ a model edit**, or the drift lint fails
  at that PR. Deliberately; that is the freshness gate working.
- **The mechanisms land audit-only first**, and promote to blocking once the drift they surface is drained.
  A blocking model-reconciliation lint dropped in red would break every in-flight change and flood a
  no-baseline deploy gate; so the honest landing is audit-only → fix-wave → promote.
- **Journey granularity is a modeling choice.** Drawn too coarse the audits are toothless, too fine the
  model is noise. The model makes the choice explicit rather than leaving it implicit, which is the point
  and the cost.

## Capability beyond governance — differential scale-up, gated on the drift lint

Past the audits, the same model unlocks a runtime capability. Because a journey's declared deps name
exactly the services it needs, an orchestrator can wake or scale **only the tier the active journey
requires** instead of the whole fleet: an editor session need not warm the batch-remediation workers.
But the capability is *safe* only because the governance is: a stale journey→deps map would wake too few
services and fail a request cold, so journey-aware scaling is **gated on the drift lint being blocking**,
the map provably equal to the territory. This is the sharpest version of the model's value: the same
mechanism that keeps the audits honest is what makes the optimization safe to turn on. A capability the
model enables, gated on the governance that keeps the model true.

## Known uses

- The typed journey entities (actor, goal, ordered steps, each step's endpoint calls, and the call-site
  anchors) carried as a new kind in the existing service-architecture dialect.
- The call-site drift lint (declared deps ↔ real call sites, both directions) that keeps the map fresh;
  the two-way endpoint-coverage audits (undertested-journey + dead-endpoint).
- A journey-aware wake/scale capability keyed to the active journey's declared deps, gated on the drift
  lint being blocking.
- A **migration completeness-critic sweep**: when re-platforming, walk every journey and ask at each
  touchpoint "does the substrate change reach here?" A component-deep migration plan is blind to
  everything a user touches that is *not* the core pipeline; the journey model is the entry point that
  surfaces the missed threads (billing, invoicing, admin views) before the build wave starts.

## Related mechanisms

- **Bridge** — agents *query* it to reason about which paths are real and what each needs (agent side)
  ◀──▶ it *governs* the codebase, driving coverage and endpoint-retirement, and, once the drift lint is
  blocking, live journey-aware scaling (product side). One model, both faces.
- **Enabler** — [service-flow-model](service-flow-model.md): the structural service model whose dialect,
  loader, query surface, and lint this journey model *reuses* as a new goal-anchored `kind`, not a
  parallel model. What separates the two? One traverses a product goal, the other maps service topology;
  that named axis is the only thing that differs, and the shared substrate is the uniformity win.
- *See also* — [drift-parity-gates](drift-parity-gates.md): the call-site drift lint and the two coverage
  audits are that parity mechanism applied to this model.
- *See also* — [executable-source-of-truth](executable-source-of-truth.md): the pattern this instantiates,
  data-not-code, read every run, held equal to reality.
