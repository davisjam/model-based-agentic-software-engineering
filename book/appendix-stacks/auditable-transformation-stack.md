## The Capability

**Make consequential transformations reconstructable and detect silent loss.** Record who changed what, then verify that the transformed artifact retained the required semantics.

## When This Stack Earns Its Keep

Reach for it where:

- **Multiple actors or agents mutate important artifacts**, making attribution and transformation history consequential.
- **Partial or bypassed instrumentation is plausible**, so "we log our writes" is not proof every write was
  logged.
- **Transformation can silently lose product semantics** — the output looks fine and is not.
- **Incident reconstruction requires both facts at once**: who changed what, and whether the result remained
  faithful.

## The Composition

<!-- label: auditable-transformation-stack -->
<!-- figure: assets/auditable-transformation-stack.svg | The auditable-transformation composition. A sanctioned mutation flows through MARK (attach actor and action) to EMIT (persist a structured record); COVER detects any mutation that escaped attribution; READ reconstructs the transformation history from the records; a FIDELITY GATE checks that the transformed artifact kept its required semantics. Solid path: the load-bearing composition. -->

## Constituent Moves

| Move | Role |
|---|---|
| **MARK** | Attach identity and context to the mutation. |
| **EMIT** | Persist a structured record. |
| **COVER** | Detect mutations that escaped attribution. |
| **READ** | Reconstruct the transformation history. |
| **FIDELITY** | Check that the transformed artifact retained its required semantics. |

## Why These Travel Together

Attribution without completeness produces a persuasive but partial history—convincing exactly where it is silent. Completeness without readable provenance proves only that records exist. And provenance alone cannot establish that a transformation preserved the product.

The stack must therefore establish both causal history and product fidelity: How did this artifact reach its current state, and did the transformation preserve its required semantics?

**Mechanisms:** provenance stamping · attribution coverage · fidelity gate
