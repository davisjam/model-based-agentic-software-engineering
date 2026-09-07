# Doc-hygiene lints (index coverage, autogen provenance)

**Intent** — A family of lints that hold *documentation* to mechanical checks (index coverage,
auto-generated-file provenance headers, cross-reference validity), so docs cannot silently drift, go
stale, or be hand-edited where they will be overwritten.

| | |
|---|---|
| Summary | Lints keep docs indexed, provenance-headed, and cross-reference-valid. |
| Target | Agent · **Governance-doc mechanisms** |
| Form | `validation` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking* — a doc missing its index entry or provenance header fails the lint |

*Its place in the environment — a **variant / known-use** of **Drift / Parity Gate**, under **SYNC · Keep representations equal to reality**. Preserved here for its technical texture.*

## Motivation — the failure it kills

Docs drift silently in ways a diff doesn't reveal: an auto-generated file gets hand-edited and is then
overwritten (the edit lost), a new doc never gets added to the index (unfindable), a cross-reference
points at a moved or renamed file (dead). The failure is *stale or misleading docs that agents then
trust as ground truth*, and it recurs continuously as the doc corpus grows.

## Why it's not just "review docs in the PR" (or "trust authors to update the index")

Doc review catches prose. It is the **least reliable** review for structure, because a missing index
entry or a broken cross-ref isn't visible in the change itself; reviewers skim right past it. So
doc-hygiene lints make the invariants **mechanical**: an auto-generated file must carry a provenance
header declaring its emitter, every doc must appear in the index, cross-references must resolve, or the
pipeline fails. Review sees the words; the lint sees the wiring the words hang on. It is the same
"documentation as enforced infrastructure" stance as the [rule index](claude-md-rule-index.md),
generalized from one governance file to the whole doc corpus.

## Mechanism

The index-coverage lint checks every doc is indexed; the autogen-provenance lint checks each
git-tracked emitted file carries its emitter + regen-path marker in the first non-blank lines, with new
targets registered in an autogen-targets registry and the emitter re-emitting the marker on every run;
cross-reference/link lints check pointers resolve. Lints land AUDIT-ONLY and migrate to BLOCKING.

## Prerequisites

- **A doc index** to check coverage against.
- **An autogen-target registry** (`_AUTOGEN_TARGETS`) and a provenance-header convention emitters honor.
- **Resolvable-reference checking** for the cross-ref lint.
- **An exemption escape** (`noqa` / an EXEMPT field) for the legitimate special cases, or the lint
  false-positives on them.

## Consequences & costs

- **Mechanical only.** These lints verify a doc is *indexed and fresh*, never that its prose is
  *correct*: a well-formed, well-indexed, wrong document passes.
- **Registry maintenance.** The autogen-target registry and the provenance convention are surfaces that
  need upkeep as emitters are added.
- **False positives on legitimate exceptions** require an escape hatch, which is itself a small hole.
- **AUDIT → BLOCKING migration risk.** Flipping to blocking before the corpus is clean wedges the
  pipeline on pre-existing drift.

## Known uses

- The index-coverage lint (every doc indexed).
- The autogen-provenance lint + its autogen-targets registry.
- Cross-reference / link-resolution lints.

## Related mechanisms

- *See also (family)* — [claude-md-rule-index](claude-md-rule-index.md): the flagship "documentation
  with a hard-counterpart lint" this mechanism generalizes to the whole corpus.
- *See also (sibling)* — [meta-model-consumption](../../models-bridge/system-models/meta-model-consumption.md): the same
  "read the substrate at lint-time" move, applied to queryable models rather than prose docs.
- *See also (sibling)* — [mandatory-snippet-table](mandatory-snippet-table.md): documentation (snippets)
  enforced by a lint, on the dispatch side.
