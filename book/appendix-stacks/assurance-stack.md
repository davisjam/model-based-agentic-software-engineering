## The capability

**Turn engineering obligations into evidence that the required population has been checked at the level of rigor each property deserves.**

## When this stack earns its keep

Reach for it when the important question shifts from

> Did the tests pass?

to

> Have we named the relevant obligations, discharged each one appropriately, and shown the population is
> covered?

That shift arrives whenever a property has to hold across a whole class of things — every mutator, every
config field, every seam — and a green suite on a handful of examples no longer settles it.

## The composition

<!-- label: assurance-stack -->
<!-- figure: assets/assurance-stack.svg | The assurance composition. A SPEC states the obligation; a CENSUS establishes the population it applies to; discharge fans out to the evidence each obligation deserves — TEST for examples, LINT for structure, PROVE for semantics — and all three lanes converge on COVERAGE, which joins each obligation back to its evidence so omissions show. Solid path: the load-bearing composition. -->

## Constituent moves

| Move | Role |
|---|---|
| **SPEC** | State the obligation. |
| **CENSUS** | Establish the population to which it applies. |
| **DISCHARGE** | Apply tests, lints, proofs, or other evidence appropriate to the property. |
| **COVER** | Join obligations back to evidence so omissions become visible. |

## Why these travel together

A checker establishes a property only for what it checks. A proof says nothing about obligations left out of
its population. A census with no evidence attached merely enumerates debt.

Assurance requires both discharge and completeness. Establish what must be shown, apply evidence suited to each obligation—an example test where an example suffices, a structural lint where structure is decisive, a bounded proof where semantics demand it—and map that evidence back to the full population so unchecked obligations remain visible.

One rule runs throughout, and it is worth stating plainly: **discharge an obligation at the semantic level
where the property becomes legible.** A property about a document's structure belongs to a check that reads
structure, not one that scans bytes for it. That is a placement principle for where a check lives — not
another mechanism in the stack.

**Mechanisms:** census-derived obligations · semantic validator · bounded proof · coverage gate
**Deep dives:** companion web catalogue — the MAGE Mechanism Catalog.
