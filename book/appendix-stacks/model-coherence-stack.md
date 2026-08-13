## The capability

**Keep explicit engineering representations useful by keeping their consumers — and the implementation —
joined to the same facts.** A model earns its keep only when the people and agents who rely on it read the
live version, and when the code it describes still matches it.

## When this stack earns its keep

Reach for it when:

- **Engineers or agents rely on explicit system models** to reason about the substrate.
- **Several consumers need the same engineering fact**, and each copy is a place it can drift.
- **Copied model facts can go stale** while the original moves on.
- **Implementation can diverge from authored intent** with nothing to catch the split.
- **Downstream artifacts can be generated** rather than hand-maintained in parallel.

## The composition

<!-- label: model-coherence-stack -->
<!-- figure: assets/model-coherence-stack.svg | The model-coherence composition. An authored MODEL feeds two paths: consumers CONSUME it live rather than copying its facts, and where the model owns the fact it can EMIT downstream artifacts. Consumption flows into a CORRESPONDENCE check — model against world — which DERIVEs its verdict from stable identities where an independent join exists; on disagreement a GATE gives the modeled property authority. Solid path: the load-bearing composition. Dashed attachment: a useful enhancement, not required for the capability. -->

Consumers read the model; a correspondence check exposes disagreement; generation removes duplicate
authority where it can; a gate gives selected disagreements consequences.

## Constituent moves

| Move | Role |
|---|---|
| **MODEL** | Put the engineering fact in an explicit representation. |
| **CONSUME** | Read the authoritative representation instead of copying its facts. |
| **CORRESPOND** | Compare model and implementation wherever an independent join exists. |
| **DERIVE** | Compute correspondence from stable identities where possible. |
| **EMIT** | Generate downstream artifacts when the model can own the fact. |
| **GATE** | Reject disagreement where the modeled property deserves authority. |

## Why these travel together

A model nobody consumes is documentation. A model whose consumers copy its facts becomes one more source of
drift. And a model consumed but never checked against reality can go confidently wrong — trusted precisely
while it lies.

The composition closes those three gaps in turn. Consumers read the model directly. Derivation or a
correspondence check surfaces disagreement between model and world. Generation removes duplicate authority
wherever the model can own the fact outright. A gate hands the surviving disagreements real consequences.

Not every model needs every rung. A descriptive model may stay advisory, and that is a legitimate stopping
point. The stack describes how a representation *can* become dependable enough to carry engineering
reasoning — and routing all mutation of a format through one typed model, guarded so the raw library cannot
be reached, is the same principle applied to a write path rather than a read.

**Mechanisms:** executable source-of-truth model · meta-model consumption · drift/parity gate · derived traceability · model-derived generation
**Deep dives:** companion web catalogue — the MAGE Mechanism Catalog.
