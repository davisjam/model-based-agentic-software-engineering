# Component & zone model

**Intent** — A typed catalogue of every component's code zone (focus-dirs, tags, boundary kind,
external seams, read surfaces), so "which component owns this file, and what may touch it" is a queried
fact, not a guess.

| | |
|---|---|
| Summary | A typed map of every component's code zone and seams. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — a structured model *held true* by its reverse-mapping test + boundary lints (the drift gate is the counted sensor) |
| Derivation | `model-from-code` — induced from the code, reconciled at build |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture; the [construction kit](https://davisjam.github.io/model-based-agentic-software-engineering/constructing-the-gee.html#cap-know) shows how it folds.*

## Motivation — the failure it kills

Governance constantly asks "which component owns this file? what zone is it in? what boundary kind, what
seams?" Answered ad hoc, with a hardcoded path list here and a grep there, those answers drift the moment a
component is added or a directory moves, and the tool keeps passing while reasoning about a stale map.
It is also the map an agent needs to know *where it is* in a large codebase.

## Why it's not just "infer it from the directory layout"

Inferring component ownership from paths re-implements a fragile heuristic per tool, and the *meaning*
of a zone (its boundary kind, its sanctioned seams, its read surfaces) isn't in the layout at all. The
component model **names** those facts once, in a typed registry, and a reverse-mapping test asserts the
model matches the real tree in both directions. Ownership becomes a fact you query from one authoritative
place, so every tool reads the same answer and a moved directory fails the parity test instead of
silently staling each tool's private inference. This is the map agents operate through: dispatch reads
it for zones, lints read it for scope, dynamic context-injection reads it to slice constraints.

## Mechanism

The [[component-registry]] is a typed dataclass set (leaf/group/meta kinds, `focus_dirs`, `tags`,
`docs`, dockerfile, k8s manifest); the [[boundary-seam-classifiers]] classify each component's boundary,
its outside-touching seams, and its read-side surfaces. A [[reverse-mapping-test]] holds the
model↔reality parity.

## Prerequisites

- **A typed component registry** with the fields consumers need (zones, tags, boundary, seams).
- **A reverse-mapping test** so the model can't silently diverge from the tree.
- **Consumers that read it** (lints, dispatch, DCI) rather than hardcoding paths.

## Consequences & costs

- **Add-a-component upkeep** — a new component means a registry row + boundary/seam classification, or
  the reverse-mapping test fails (deliberately).
- **Centralization blast radius** — a wrong zone misroutes every consumer at once (the fix-once
  affordance's cost).

## Known uses

- The [[component-registry]] (read by the lint fleet, dispatch, and audit surfaces).
- The [[boundary-seam-classifiers|boundary / seam / read-surface classifiers]].
- The [[reverse-mapping-test]] (model↔tree parity).

## Related mechanisms

- **Bridge** — agents *consume* it ([dynamic-context-injection](../../agent/context-and-dispatch/dynamic-context-injection.md)
  slices constraints by component; [role-typed-dispatch](../../agent/context-and-dispatch/role-typed-dispatch.md)
  reads zones) ◀──▶ it *governs the product* (boundary/seam lints, focus-dir scoping).
- **Counterpart** — [drift-parity-gates](drift-parity-gates.md): the reverse-mapping test that keeps it
  honest.
- *See also* — [meta-model-consumption](meta-model-consumption.md) (read it, don't hardcode) ·
  [query-surface](query-surface.md) (the [[repo-query]] `component` subcommand).
