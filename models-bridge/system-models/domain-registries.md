# Domain registries

**Intent** — A set of frozen, typed registries for the system's *domain facts* (the supported
filetypes, the WCAG coverage gaps, the periodic-GC cron entries, the UX write-authority surfaces, the
competitor set, the CLAUDE.md rule metadata), each the single source of truth for its slice.

| | |
|---|---|
| Summary | Frozen typed registries for the system's domain facts. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — typed registries *held true* by their coverage/parity lints |
| Derivation | `both` — some fields generated to code, others reconciled from it |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture.*

## Motivation — the failure it kills

Domain facts get restated in code, docs, and dashboards: "which four filetypes do we support," "which
WCAG SCs are coverage-gaps," "which cron entries run," "who may write UX surface X," "who are our
competitors," "what metadata does each CLAUDE.md rule carry." Restated, they drift: a filetype
list diverges, a rule's metadata goes stale, a competitor doc is out of date. Each is a small
correctness or a stale-doc failure, multiplied across many domain slices.

## Why it's not just "hardcode each list where it's used"

A hardcoded domain list is a snapshot that drifts and can't be queried as a set. Each registry is the
**frozen typed source of truth** for its slice, read by the tools that need it and *generated into* the
docs that present it (the competitor catalog → competitive-analysis doc; the rule metadata → rule
index). A coverage/parity lint keeps each honest. Where does the supported-filetype list actually live
when it is hardcoded in five places? Nowhere — there are five snapshots, each free to drift. A registry
gives the fact one home the tools read and the docs generate from, and a lint fails the build the moment
a consumer diverges.

## Mechanism

Each is a small typed registry: a supported-filetypes registry (the frozen four), a WCAG-gap registry
(feeding the WCAG-scope status), a periodic-GC cron registry (distinct from the per-minute
merge-train), a UX write-authority registry, a competitor registry (a Backstage-style Competitor
dialect → the competitive-analysis doc), and a rule-metadata registry (extracted from inline
`<!-- rule-meta: -->` blocks, feeding the [rule-index](../../agent/governance-doc-controls/claude-md-rule-index.md)).
Each has a coverage/parity lint + a doc-derived pin.

## Prerequisites

- **A typed registry per domain fact** with the fields its consumers need.
- **Consumers that read it** (dispatch/checkers/generators) rather than hardcoding.
- **A coverage/parity lint + a doc-derived pin** per registry.

## Consequences & costs

- **Many small registries to maintain** — the cost is breadth, not depth; each is simple but each is a
  surface.
- **Frozen sets resist expedient edits** — changing "the supported four" is a deliberate model change.

## Known uses

- The supported-filetypes, WCAG-gap, periodic-GC-cron, UX-write-authority, competitor, and
  rule-metadata registries.
- Their generators (e.g. the competitor-catalog generator) and coverage/parity lints.

## Related mechanisms

- **Bridge** — agents/checkers *read* these facts (agent side) ◀──▶ they *govern & generate* product
  surfaces (WCAG scope, competitor docs, cron behaviour) (product side).
- **Consumer** — the rule-metadata registry feeds the
  [rule-index](../../agent/governance-doc-controls/claude-md-rule-index.md); the WCAG-gap registry feeds
  the [standards rule-engine](../../product/validation-and-conformance/standards-rule-engine.md).
- **Counterpart** — [drift-parity-gates](drift-parity-gates.md): each registry's coverage/parity lint.
