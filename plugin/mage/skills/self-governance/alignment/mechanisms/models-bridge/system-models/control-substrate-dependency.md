# Control↔substrate dependency (computed blast-radius)

**Intent** — Make each control *declare* the substrate assumption it bakes in as typed metadata, so
"which controls depend on which part of the substrate, and what will break when I change it" is a
**computed query**, not a grep-and-read. Before a cross-cutting substrate change, the static-analysis
blast radius is known up front (our instance: each lint that reads the deployment-topology model declares
a typed `plane-assumption` (GKE-only / Cloud-Run-only / plane-aware / plane-agnostic) joined against the
topology to print exactly which lints a migration puts in scope).

| | |
|---|---|
| Summary | Each control declares its substrate assumption as metadata; a query computes the blast radius. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — a declaration lint requires every substrate-reading control to declare its assumption; the blast-radius table is computed from those declarations. Lands audit-only, then promotes to blocking |
| Derivation | `model-from-code` — induced from the code, reconciled at build |

*Its place in the environment — the **canonical mechanism** for **GOVERN · Govern the control machinery itself**. The variants and known uses that fold under it are gathered on the [construction-kit page](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-govern).*

## Motivation — the failure it kills

A control (a lint, a gate, a validator) usually bakes an *assumption about the substrate* it checks
against: "a service is a Kubernetes Deployment under this directory," "the scaler exposes this method,"
"the manifest carries this field." The assumption sits **buried in the control's body**. It is invisible
until you change the substrate.

Then the change lands and the fleet fails in two silent ways at once:

- **False FAIL.** A migrated service keeps its old annotations, and controls validate it against
  manifests, methods, or fields that no longer exist. On a no-baseline deploy gate this is
  *deploy-blocking*: one buried assumption stops every release.
- **False PASS.** A migrated service drops its old annotation and *vanishes* from every totality,
  smoke, and disjointness check. It looks clean because nothing checks it anymore. An unmonitored
  service is the worse of the two.

The engineer planning the migration cannot see this coming. "Which of our checks assume the old
substrate?" is answerable only by grepping for who imports the substrate model, then **reading each
body** to judge whether it bakes the old shape. The entanglement that decides the whole refactor's blast
radius lives in prose and grep: exactly the *invariant-that-lives-only-in-code* smell, and the failure
is near-certain the moment someone migrates a service without knowing which controls will misfire.

## Why it's not just "grep for who imports the substrate model"

Grep finds the *importers*. It does not find their *assumption*. Two controls can both import the
deployment model; one asserts GKE-only facts and will misfire on a migrated service, the other reads
only the plane-agnostic name and is safe. Grep cannot tell them apart; you still read both bodies. This
mechanism lifts the assumption out of the body into a **typed declaration**, so the importer *and its
stance toward the substrate* are one queryable fact.

- **Not just [drift & parity gates](drift-parity-gates.md).** Parity asks *does the model match
  reality?*, a claim about the model↔code join. This asks a different question about the **controls**:
  *which of them depend on which substrate assumption, computed before I touch the substrate?* Parity is
  green right up to the migration and tells you nothing about which lints will misfire after it.
- **Not just [meta-model consumption](meta-model-consumption.md).** That discipline makes a consumer
  *read* the model instead of copying a value; it removes *value* drift. A control can obey it perfectly
  (query the topology live) and still leave its *substrate stance* ("I only make sense on GKE") buried in
  a branch. This mechanism is that discipline turned on the control fleet's own **dependency edges**: not
  "read the model," but "declare which part of the model you assume," so the edge itself is typed and
  joinable. It is the self-application: the governance fleet becomes a modeled element.

Each neighbour handles a real slice (parity keeps the model honest, read-don't-copy removes value
drift), and both are green right up to a migration that then misfires half the fleet. What neither
supplies is the **control→substrate dependency edge as a first-class, typed, queryable fact**, and that
edge is what computes the blast radius *before* you touch the substrate.

## Mechanism

- **Declare the assumption.** Extend the metadata block a control already carries (the same place it
  declares its scope tags) with one typed field naming its substrate stance, a small closed enum
  (assumes-plane-A-only / assumes-plane-B-only / branches-per-plane / substrate-agnostic). A control that
  reads the substrate model *must* declare it.
- **Compute the join.** A query reads every control's declaration and joins it against the substrate
  model, emitting a table: for each control, its declared assumption, the substrate facts it reads, and,
  given a target substrate, whether migrating a service to that substrate puts the control in scope and
  whether it bakes the old assumption. **This table is the blast radius**, computed from declarations, not
  hand-maintained and not grepped.
- **Enforce the declaration.** A lint requires every substrate-reading control to declare its stance;
  one that forgets is caught at the pull request, not at the next migration. It lands audit-only while the
  existing controls are back-filled, then promotes to blocking; a red blocking lint dropped into a
  no-baseline deploy gate would break every in-flight change.
- **Fold the guard into the deploy gate.** The deploy-time realization gate refuses to ship if any
  substrate-reading control lacks a declaration: an undeclared stance is a migration risk, so it is
  treated as one.

The whole thing is *stable-lint-reads-declarations*: the table is derived from the typed fields at query
time, so nothing is generated and no N-row map can drift.

## Prerequisites

- **The substrate is already a queryable model** — a typed source-of-truth for the topology the controls
  check against, not scattered manifests. Without it there is nothing to join against.
- **Controls already carry a metadata block** the declaration can extend. Reuse the existing convention
  rather than standing up a parallel registry (adopt the schema you already lint).
- **A closed enum of substrate stances** small enough to be exhaustive and typed. An open string field
  reintroduces the drift and the typo class this exists to remove.

## Consequences & costs

- **Every substrate-reading control gains one declaration** — the intended tax; it is what makes the edge
  queryable. A control that forgets fails the declaration lint.
- **The enum must fit the substrate dimension.** A stance the enum can't express (a third plane, a
  hybrid) forces an enum change, which is the honest signal that the substrate model itself grew a
  dimension.
- **It pays off only at a substrate change.** In a stable system the declarations sit inert. This is a
  *design-time-on-the-predictive-smell* control: worth it when a cross-cutting substrate migration is
  live or foreseeable, over-built if you add it speculatively to a substrate you will never change.

## Known uses

- Each static analysis that reads the deployment-topology model declares a typed plane-assumption
  (GKE-only / Cloud-Run-only / plane-aware / plane-agnostic); a `plane-deps` query joins those
  declarations against the topology to print, per lint, whether a service's migration to a given plane
  puts it in scope and whether it bakes the old plane.
- A declaration lint that fails any topology-reading control missing its plane-assumption (audit-only,
  then blocking); the deploy realization gate composes that guard, so no un-declared substrate consumer
  ships.

## Related mechanisms

- **Bridge** — agents and refactor plans *query* the computed blast radius to know what a substrate
  change touches (agent side) ◀──▶ the declaration lint *governs* the control fleet, keeping every
  substrate stance declared (product/controls side).
- **Enabler** — [deployment-topology-model](deployment-topology-model.md): the substrate model whose
  facts the controls assume and this mechanism makes them declare against.
- *See also* — [meta-model-consumption](meta-model-consumption.md): the read-don't-copy discipline this
  extends from *values* to *dependency edges*.
- *See also* — [query-surface](query-surface.md): the query path the computed blast-radius table rides on.
- *See also* — [drift-parity-gates](drift-parity-gates.md): the model↔reality parity family this sits
  beside, a different question (does the model match reality?) about a different join.
