## The Capability

**State the engineering obligations, identify the population they apply to, and produce evidence strong enough for each property.**

## When This Stack Earns Its Keep

Reach for it when the important question shifts from

> Did the tests pass?

to

> Have we named the relevant obligations, discharged each one appropriately, and shown the population is
> covered?

That shift arrives whenever a property has to hold across a whole class of things — every mutator, every
config field, every seam — and a green suite on a handful of examples no longer settles it.

## The Composition

<!-- label: assurance-stack -->
<!-- figure: assets/assurance-stack.svg | The assurance composition. A SPEC states the obligation; a CENSUS establishes the population it applies to; discharge fans out to the evidence each obligation deserves — TEST for examples, LINT for structure, PROVE for semantics — and all three lanes converge on COVERAGE, which joins each obligation back to its evidence so omissions show. Solid path: the load-bearing composition. -->

## Constituent Moves

| Move | Role |
|---|---|
| **SPEC** | State the obligation. |
| **CENSUS** | Establish the population to which it applies. |
| **DISCHARGE** | Apply tests, lints, proofs, or other evidence appropriate to the property. |
| **COVER** | Join obligations back to evidence so omissions become visible. |

## Why These Travel Together

A checker establishes a property only for what it checks. A proof says nothing about obligations left out of its population; a census with no evidence attached merely enumerates debt. Assurance therefore requires both evidence for each obligation and confidence that the relevant population is covered. Use evidence suited to the property—an example test where an example suffices, a structural lint where structure is decisive, a bounded proof where semantics demand it—and map that evidence back to the full population so omissions remain visible.

One rule runs throughout: check an obligation at the semantic level where the property becomes legible. A property about a document's structure belongs in a check that reads structure, not one that scans bytes for it. This determines where the check belongs; it is not another mechanism in the stack.

**Mechanisms:** census-derived obligations · semantic validator · bounded proof · coverage gate
