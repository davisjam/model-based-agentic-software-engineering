<!-- note-spread: 2 -->

**Intent** — Make each control *declare* the substrate assumption it bakes in as structured metadata, so
"which controls depend on which part of the substrate, and what breaks when I change it" becomes a computed
query rather than a grep-and-read. Before a cross-cutting substrate change, the static-analysis blast radius
is known up front.

## Problem

A control — a lint, a gate, a validator — usually bakes an assumption about the substrate it checks: a service
is a Deployment under this directory, the manifest carries this field. The assumption sits buried in the
control's body, invisible until you change the substrate. Then the change lands and the fleet fails two silent
ways at once. In a **false FAIL**, a migrated service is validated against manifests or fields that no longer
exist; on a no-baseline deploy gate, one buried assumption blocks every release. In a **false PASS**, a
migrated service drops its old annotation and vanishes from every totality, smoke, and disjointness check,
looking clean because nothing checks it anymore — the worse of the two. The engineer planning the migration
cannot see this coming: "which checks assume the old substrate?" is answerable only by grepping the importers,
then reading each body.

<!-- note-fold -->

## Mechanism

- **Declare the assumption.** Extend the metadata block a control already carries with one structured field
  naming its substrate stance — a small closed enum (assumes-plane-A-only, assumes-plane-B-only,
  branches-per-plane, substrate-agnostic). A control that reads the substrate model must declare it.
- **Compute the join.** A query joins every declaration against the substrate model, emitting a table: per
  control, its assumption, the facts it reads, and, given a target substrate, whether a migration puts it in
  scope and whether it bakes the old assumption. That table is the blast radius, computed from declarations
  rather than grepped.
- **Enforce the declaration.** A lint fails any substrate-reading control missing its stance; it lands
  audit-only while the fleet is back-filled, then promotes to blocking. The deploy realization gate composes
  the guard and refuses to ship if any substrate consumer lacks a declaration.

The whole thing is a stable lint reading declarations: the table is derived from the fields at query time, so
nothing is generated and no hand-maintained map can drift.

## Engineering Consequences

Every substrate-reading control gains one declaration — the intended tax, and what makes the dependency edge
queryable. Grep finds the importers but not their assumption; lifting the stance into a declaration makes the
importer and its posture toward the substrate one queryable fact, so the blast radius is computed before you
touch the substrate.

An ordinary architecture diagram cannot answer the question this mechanism answers. A component diagram draws
what calls what; a deployment diagram draws what runs where. Neither draws which *governance assumptions* a
control silently depends on — that a lint presumes a marker file exists, that a gate presumes a wrapper is on
the canonical path, that a sweep presumes a registry is authoritative. Those assumptions are invisible to a
box-and-arrow picture because they are not calls or hosts; they are preconditions. So the blast radius of an
infrastructure change stays unknowable until something breaks in production. Declaring the assumption as a
queryable edge is what turns "we'll find out when it breaks" into a query you run before you touch the
substrate.

Use this once cross-cutting substrate churn has burned you once. Don't build the dependency model for a
substrate nobody changes — the query pays off only where the ground actually moves.

## Implementation Seam

Four pieces: the closed enum of substrate stances, the structured field extending the control's existing
metadata block, the join query that prints the blast-radius table, and the declaration lint the deploy gate
composes. It requires the substrate already be a queryable model to join against
[appendix: executable-source-of-truth], and extends the read-don't-copy discipline from values to dependency
edges [appendix: meta-model-consumption].

## Known Limitations

It pays off only at a substrate change; in a stable system the declarations sit inert, over-built if added
speculatively to a substrate you will never change. A stance the closed enum cannot express forces an enum
change — the honest signal that the substrate model itself grew a dimension — while an open string field would
reintroduce the drift and typo class the enum exists to remove. Existing controls must all be back-filled before the lint can promote from audit-only to blocking.
