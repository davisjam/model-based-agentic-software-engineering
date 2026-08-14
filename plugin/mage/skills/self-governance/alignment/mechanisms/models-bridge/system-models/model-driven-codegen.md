# Model-driven codegen

**Intent** — Generate real artifacts **from** the models — NetworkPolicy, service catalog, env wiring,
public-API docs, competitor catalog, wire-contract types, docker — each carrying a provenance header, so
the model *drives the system* (not merely describes it) and hand-edits are caught.

| | |
|---|---|
| Summary | Generate real artifacts from the models, provenance-headed. |
| Target | Bridge · **System models** |
| Form | `validation` |
| Move | `sensor` — detects the error after the fact |
| Model | `governs-a-model` — a gate/generator/API/policy whose subject is a model |
| Enforcement | **Hard** (deterministic) — generated artifacts carry a re-emitted provenance marker + a freshness/drift lint |
| Governs | `all-models` — real artifacts are generated from the models |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-know) shows how it folds.*

## Motivation — the failure it kills

If the models only *described* the system, they would be optional — nice docs, easy to ignore, quick to
drift. The failure this addresses is **a model nothing depends on**: nothing breaks if it's wrong,
so nothing keeps it right. And separately: a *generated* artifact that someone hand-edits loses the edit
on the next regen, silently.

## Why it's not just "hand-write the config / docs"

Hand-writing NetworkPolicy, the service catalog, the API docs, or the competitor analysis means the same
facts live in two places (model + artifact) and diverge. Generating them **from** the model makes the
model authoritative (change the artifact by changing the model), and a **provenance header**
on each generated file, re-emitted every run, plus a freshness lint, ensures a hand-edit is caught and a
stale artifact fails the build. What keeps a hand-written config honest with the model it mirrors?
Nothing does. The two facts sit in two files and drift, and an edit to the wrong copy simply vanishes on
the next regen. Generating from the model leaves one authoritative source and marks every output so a
stray hand-edit is caught before it is lost.

## Mechanism

A family of generators read the models and emit artifacts: a NetworkPolicy generator (from the
service-flow model), the service-catalog and env generators, the web-API entity and public-API-doc
generators (from the web-API model), a competitor-catalog generator (from the competitor registry), the
wire-contract generators (from the wire-contract schemas), a docker generator, and a model-visualization
generator that emits **human-readable diagrams** (e.g. Mermaid) from the same models. Each emitted file
carries a provenance marker (emitter + regen path), enforced by a provenance-header lint — so even the
*picture a human reads* is generated, and can't drift from the model it depicts.

## Prerequisites

- **Models rich enough to generate from** (the source-of-truth must contain what the artifact needs).
- **Generators** that re-emit the provenance marker every run.
- **A provenance + freshness lint** so hand-edits and stale artifacts are caught.

## Consequences & costs

- **A generator per artifact class** to author + keep current with the model schema.
- **Generated files must not be hand-edited.** A real constraint (the provenance lint enforces it).
- **Regen discipline.** The artifact must be regenerated when the model changes (the freshness lint
  catches misses).

## Known uses

- The NetworkPolicy, service-catalog, web-API-entity, public-API-doc, competitor-catalog,
  wire-contract, and docker generators.
- A model-visualization generator (human diagrams, e.g. Mermaid, from the models), so the picture can't
  drift from the model.
- The provenance-header requirement + its enforcing lint.

## Related mechanisms

- **Enabler** — the models ([service-flow](service-flow-model.md),
  [domain-registries](domain-registries.md), [deployment-topology](deployment-topology-model.md)) are
  what it generates from; without them there is nothing to generate.
- **Bridge** — this is the *product-facing* face of the models: they don't just inform agents, they
  *build* the codebase's config and docs.
- *See also (cross-target)* — the product [provenance & attribution](https://davisjam.github.io/model-based-agentic-software-engineering/product/provenance-and-attribution/mutator-stamps.html)
  family: provenance headers here, mutation stamps there — both "the tool records what it produced."
