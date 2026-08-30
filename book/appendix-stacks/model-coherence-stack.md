## The Capability

**Keep explicit engineering models connected to both their consumers and the implementation they describe.** A model remains useful only when people and agents read the current representation and the implementation continues to correspond to it.

## When This Stack Earns Its Keep

Reach for it when:

- **Engineers or agents rely on explicit system models** to reason about the substrate.
- **Several consumers need the same engineering fact**, making copied facts sources of drift.
- **Implementation can diverge from authored intent** with nothing to catch the split.
- **Downstream artifacts can be generated** rather than hand-maintained in parallel.

## The Composition

<!-- label: model-coherence-stack -->
<!-- figure: assets/model-coherence-stack.svg | The model-coherence composition. An authored MODEL feeds two paths: consumers CONSUME it live rather than copying its facts, and where the model owns the fact it can EMIT downstream artifacts. Consumption flows into a CORRESPONDENCE check — model against world — which DERIVEs its verdict from stable identities where an independent join exists; on disagreement a GATE gives the modeled property authority. Solid path: the required composition. Dashed attachment: a useful enhancement, not required for the capability. -->

## Constituent Moves

| Move | Role |
|---|---|
| **MODEL** | Put the engineering fact in an explicit representation. |
| **CONSUME** | Read the authoritative representation instead of copying its facts. |
| **CORRESPOND** | Compare model and implementation wherever an independent join exists. |
| **DERIVE** | Compute correspondence from stable identities where possible. |
| **EMIT** | Generate downstream artifacts when the model can own the fact. |
| **GATE** | Reject disagreement where the modeled property deserves authority. |

## Why These Travel Together

A model nobody consumes is documentation. A model whose consumers copy its facts becomes another source of drift. A model consumed but never checked against reality can go confidently wrong—trusted precisely while it lies.

Direct consumption avoids copied sources of truth; correspondence checks expose divergence between model and implementation; generation eliminates duplicate authority where the model can own a fact outright; and gates make consequential disagreements blocking. Not every model needs every mechanism: a descriptive model may remain advisory. Add stronger mechanisms only when the representation requires stronger authority.

**Mechanisms:** executable source-of-truth model · meta-model consumption · drift/parity gate · derived traceability · model-derived generation
