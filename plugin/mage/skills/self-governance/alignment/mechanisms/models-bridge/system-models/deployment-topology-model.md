# Deployment & tier topology

**Intent** — Structured models of *where things run and how they layer* (the managed-deployment topology,
each service's tier class, and the agent-substrate's layer boundaries), so deploy scripts and layering
lints reason about a declared topology, not scattered constants.

| | |
|---|---|
| Summary | Structured models of where things run and how they layer. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — structured models *held true* by the deploy-parity + layer-boundary lints |
| Derivation | `model-from-code` — induced from the code, reconciled at build |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-know) shows how it folds.*

## Motivation — the failure it kills

Deployment facts (which layer a service is in, its tier, what may depend on what) end up hardcoded in
deploy scripts and import checks. Hardcoded, they drift from the real topology: a service moves tier, a
layer boundary is quietly crossed, and the deploy or an architectural invariant breaks. And an agent
reasoning about "can layer X import layer Y?" needs the boundary declared, not inferred.

## Why it's not just "encode the topology in the deploy scripts"

Topology in the deploy scripts is a *copy*. It drifts from the real service set and from the layering
the code actually has. These structured models **declare** the topology once (managed-deployment loader,
tier classification, layer-boundary contracts), and parity lints check the declaration against reality
(deploy phase tables, import-layer checks). One declared topology, validated against the running system,
means a moved tier or a crossed boundary fails a lint at author time — the scattered constants had no
such check, so they drifted until a deploy broke.

## Mechanism

The [[deployment-topology-loader]] is the typed loader for the managed-deployment topology; the
[[service-tier-registry]] classifies each service's tier; the [[layer-boundary-contracts]] declare the
layer boundaries for the agent substrate. Deploy scripts and layering lints (the deploy-phase-table
parity lint, the import-layer checks) read them and gate on divergence.

## Prerequisites

- **A typed topology + tier + layering schema**.
- **Deploy scripts + layering lints that read it** rather than hardcoding.
- **Parity lints** against the real deploy tables and import graph.

## Consequences & costs

- **Topology changes are model edits** — a moved tier or new layer boundary means a model edit or a
  parity failure.
- **Layering contracts constrain the code** — a declared boundary blocks a cross-layer import
  (deliberately; a real cost to expedient shortcuts).

## Known uses

- The [[deployment-topology-loader]] · [[service-tier-registry]] · [[layer-boundary-contracts]].
- The deploy-phase-table parity lint + the import-layer boundary lints.

## Related mechanisms

- **Bridge** — agents reason about layering/tiers *through* these models (agent side) ◀──▶ they
  *govern* the real deployment + import structure of the codebase (product side).
- **Enabler** — feeds [model-driven-codegen](model-driven-codegen.md) (deploy/env generation).
- **Counterpart** — [drift-parity-gates](drift-parity-gates.md): the deploy-parity + layer lints.
