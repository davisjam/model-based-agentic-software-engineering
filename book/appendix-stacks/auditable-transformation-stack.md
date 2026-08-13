## The capability

**Make consequential transformation reconstructable, and detect silent loss.** When several actors mutate an
important artifact, this stack lets you recover both who changed what and whether the result stayed faithful
to its source.

## When this stack earns its keep

Reach for it where:

- **Multiple actors or agents mutate important artifacts**, and the history matters.
- **Attribution matters** — you need to know which actor made which change.
- **Partial or bypassed instrumentation is plausible**, so "we log our writes" is not proof every write was
  logged.
- **Transformation can silently lose product semantics** — the output looks fine and is not.
- **Incident reconstruction requires both facts at once**: who changed what, and whether the result remained
  faithful.

## The composition

<!-- label: auditable-transformation-stack -->
<!-- figure: assets/auditable-transformation-stack.svg | The auditable-transformation composition. A sanctioned mutation flows through MARK (attach actor and action) to EMIT (persist a structured record); COVER detects any mutation that escaped attribution; READ reconstructs the transformation history from the records; a FIDELITY GATE checks that the transformed artifact kept its required semantics. Solid path: the load-bearing composition. -->

Attribution at the point of change, a persisted record, a completeness check over those records, a
reconstruction path, and a fidelity gate that asks whether the product survived the transformation.

## Constituent moves

| Move | Role |
|---|---|
| **MARK** | Attach identity and context to the mutation. |
| **EMIT** | Persist a structured record. |
| **COVER** | Detect mutations that escaped attribution. |
| **READ** | Reconstruct the transformation history. |
| **FIDELITY** | Check that the transformed artifact retained its required semantics. |

## Why these travel together

Attribution without completeness produces a persuasive but partial history — convincing exactly where it is
silent. Completeness without readable provenance proves only that records exist. And provenance of any kind
cannot, on its own, establish that a transformation preserved the product.

So the composition joins two different things: the causal legibility of a change, and the fidelity of its
result. Together they answer both questions an investigator brings — how did this artifact reach its current
state, and did that path corrupt it?

This runs broader than logging. Logs record events; the goal here is to make a consequential change
reconstructable enough to investigate and trustworthy enough to ship.

**Mechanisms:** provenance stamping · attribution coverage · fidelity gate
**Deep dives:** companion web catalogue — the MAGE Mechanism Catalog.
