## The capability

**Turn engineering obligations into evidence that the required population has been checked, at a level of
rigor the property deserves.** The question this stack answers is not whether the tests passed. It is
whether the obligations were identified, discharged appropriately, and shown to cover the population.

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

State the obligation, establish who it applies to, discharge it with evidence fit to the property, then join
the evidence back to the population so a gap becomes visible rather than silent.

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

Assurance therefore needs both discharge and completeness. Establish what must be shown. Apply evidence
suited to each obligation — an example test where an example suffices, a structural lint where the shape is
mechanical, a bounded proof where semantics demand it. Then map that evidence back to the full population, so
an unchecked obligation surfaces instead of hiding.

One rule runs throughout, and it is worth stating plainly: **discharge an obligation at the semantic level
where the property becomes legible.** A property about a document's structure belongs to a check that reads
structure, not one that scans bytes for it. That is a placement principle for where a check lives — not
another mechanism in the stack.

**Mechanisms:** census-derived obligations · semantic validator · bounded proof · coverage gate
**Deep dives:** companion web catalogue — the MAGE Mechanism Catalog.
