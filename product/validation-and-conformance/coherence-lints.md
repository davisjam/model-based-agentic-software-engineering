# Cross-source coherence lints

**Intent** — Lints that assert two or more independent sources *agree* (config record ↔ sample JSON,
registry ↔ its consumers, enum ↔ its uses), catching drift *between* sources that each look valid on
their own.

| | |
|---|---|
| Summary | Assert independent sources agree — catch cross-source drift. |
| Target | Product · **Validation & conformance** |
| Form | `validation` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking* — fails when the asserted relation between sources is violated |

*Its place in the environment — a **variant / known-use** of **Drift / Parity Gate**, under **SYNC · Keep representations equal to reality**. Preserved here for its technical texture.*

## Motivation — the failure it kills

Some invariants live *between* files: a config record and its sample JSON must list the same fields; a
registry and its consumers must share the same keys; an enum and its handlers must stay in step. Each
file is individually valid, so the bug is invisible per-file, but together they disagree. The canonical
case: a new field on a config record that is *missing from the sample* defaults to `false` at
deserialization and **silently collapses batching to single-call in prod.** The failure is *cross-source
drift*, recurring whenever paired sources evolve independently.

## Why it's not just "lint each source on its own"

A single-source lint cannot catch a **relational** invariant: there is nothing wrong with either file
alone; the defect is in their *disagreement*. Coherence lints assert the relation itself (A's fields ⊆
B's; registry keys = consumer keys; enum cases = handler cases) and fail when the two diverge. A
per-file lint checks one source against itself and can never see a cross-source relation; only a lint
that reads both files at once catches the "missing config field silently collapses batching" class.

## Mechanism

Each coherence lint reads two-or-more sources and asserts a consistency relation: the config-field
lints check every deserialized field is explicit *and* present in the sample (the config-completeness
rule); registry-agreement lints check a registry and its consumers list the same keys; the discipline
prefers reading the meta-files at lint-time over codegen. Companion deserialization tests pin the same relation.

## Prerequisites

- **The paired sources are both machine-readable** at lint-time.
- **A declared consistency relation** (subset, equality, one-to-one) between them.
- **A lint that reads both** and knows how to diff them.

## Consequences & costs

- **The relation must be specified correctly** — a wrong relation produces false failures or false
  confidence.
- **Lint-time coupling.** Reading several sources at once couples the lint to all of their shapes.
- **Pairs must be registered** — an unpaired source that *should* agree with another isn't checked
  until someone declares the relation.

## Known uses

- The config-field ⊆ sample lints and the `ConfigDeserialization_*` companion tests.
- Registry-agreement lints (a registry and its consumers must list the same keys).
- The meta-file consistency discipline (read the meta-file; never embed a snapshot).

## Related mechanisms

- *See also (sibling)* — [semantic-lints](semantic-lints.md): per-source structural lints; this family
  is the *relational* complement.
- *See also (cross-target)* — [meta-model-consumption](../../models-bridge/system-models/meta-model-consumption.md): the agent
  side's "read the substrate, don't hardcode." Coherence lints enforce that two substrates *stay*
  consistent.
- **Layer** — with the other [validation-and-conformance](content-validator.md) checks over the artifact.
