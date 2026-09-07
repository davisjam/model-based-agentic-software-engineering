# Standards / WCAG rule engine

**Intent** — A rule engine that maps each finding to the exact external-standard clause it closes,
turning "does this conform?" into a deterministic, standards-grounded predicate rather than a judgement
call (our instance: the **WCAG 2.1 AA / Section 508 / PDF-UA** accessibility rule engine).

| | |
|---|---|
| Summary | Map each finding to the WCAG/508/PDF-UA criterion it closes. |
| Target | Product · **Validation & conformance** |
| Form | `validation` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking* — a conformance predicate; the PDF runtime gate flags new findings per pass on a dedicated marker (staging) |

*Its place in the environment — the **canonical mechanism** for **PRESERVE · Preserve product semantics**.*

## Motivation — the failure it kills

"Is this document accessible?" needs a *precise, standards-grounded* answer, not a fuzzy score. Without
one, the tool either ships a document that claims conformance while missing success criteria, or runs
checks that aren't tied to any standard (so "we check X" doesn't map to "we close SC Y"). The failure is
*an unfounded conformance claim*, and it recurs per document and per new check.

## Why it's not just "run some accessibility heuristics"

Heuristics produce a fuzzy score, not a **conformance claim tied to specific success criteria**. The
rule engine maps each finding to the exact WCAG/508/PDF-UA criterion it closes, so conformance is a
deterministic, auditable predicate: you can say *which* SC each check satisfies. And the discipline is
enforced across the boundary: adding a check that closes an SC gap must update *both* the engine and the
scope doc's Status column in the same commit. The distinction is that every finding names the criterion
it closes, so the conformance claim is auditable clause by clause rather than a single opaque score. The
scope doc is the counterpart that keeps the coverage claim honest (Covered / Coverage-gap / Aspirational).

## Mechanism

A standards-mapping step maps findings → the SCs they close (our instance:
`CheckRunner.ComputeStandards`); the canonical rule walkers produce those findings over the structured
models. The PDF runtime gate emits new findings per pass on a dedicated JSON marker (staging). The
WCAG-scope-mapping doc is the source of truth for which SCs are in scope, out of scope, and their
coverage status.

## Prerequisites

- **A rule engine** producing findings, and a **standards taxonomy** (the WCAG/508/PDF-UA SCs).
- **A mapping** from each check to the SC(s) it closes.
- **A scope doc kept in sync** (the same-commit discipline) so coverage claims don't drift from the
  engine.

## Consequences & costs

- **Coverage is only as complete as the mapped checks.** Unmapped SCs are coverage-gaps or aspirational;
  honesty about this is the scope doc's whole job.
- **The mapping must track the standard.** WCAG revisions and new SCs require engine + doc updates.
- **Per-pass rule-fail is staging-only** (the prod gate is coarser).

## Known uses

- `CheckRunner.ComputeStandards` — the finding → SC mapping.
- The staging per-pass rule-engine check (new findings surfaced on a dedicated JSON marker).
- The WCAG-scope-mapping doc (Covered / Coverage-gap / Aspirational status).

## Related mechanisms

- **Layer** — with [content-validator](content-validator.md): fidelity (nothing lost) + conformance
  (standards met) are the two product gates over the artifact.
- **Counterpart** — the WCAG-scope doc keeps the coverage *claims* honest (like the DoD ↔ rule index
  pairing on the agent side).
- **Consumer** — reads the [canonical-walkers](../canonical-models-and-seams/canonical-walkers.md)
  (`RuleWalkers`) that traverse the structured models to produce findings.
