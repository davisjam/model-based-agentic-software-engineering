# ContentValidator (input ⊆ output fidelity)

**Intent** — A deterministic gate asserting that every piece of the user's original content survives
remediation (*input content ⊆ output content*), run in production, with a per-pass variant in staging
that pinpoints which pass dropped content (our instance: the `ContentValidator` fidelity gate).

| | |
|---|---|
| Summary | Assert input content survives remediation — a fidelity gate. |
| Target | Product · **Validation & conformance** |
| Form | `validation` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking* — fails the job in prod on a fidelity violation; the per-pass staging variant signals the offending pass on a dedicated marker + a nonzero exit code |

*Its place in the environment — the **canonical mechanism** for **PRESERVE · Preserve product semantics**.*

## Motivation — the failure it kills

Remediation *mutates* the document across many passes and four formats. A bug in any pass could
**silently drop or alter user content**: a deleted paragraph, a mangled table, a lost caption the author
never sees go. For a fidelity-critical tool that is the worst possible outcome: the output looks fine and
quietly isn't what the author wrote. The failure recurs on every remediation pass.

## Why it's not just "trust the remediation code" (or "spot-check outputs")

"Trust the code" breaks the moment a mutator has a bug, and spot-checking outputs misses
*silent* drops: you don't notice the paragraph that's gone. The fidelity gate makes the guarantee a
**deterministic post-condition**: the input's content must be a subset of the output's, checked
mechanically on every production job. A post-condition that fails the job removes the trust
from the loop. The staging per-pass variant adds localization: it tells you *which* pass violated the
subset, turning "content was lost somewhere" into "pass N lost it."

## Mechanism

The fidelity gate extracts the input's content and asserts it is a subset of the output's; it runs in
production and fails the job on violation. A staging-only per-pass variant (gated by an env label)
emits a dedicated fidelity marker and a nonzero exit code so the offending pass is identified before
delivery.

## Prerequisites

- **A content extraction comparable across input and output** — the subset check is only as good as
  what "content" is defined to be.
- **A subset predicate** that tolerates legitimate reformatting/reordering without false positives.
- **A run point** post-remediation and pre-delivery, plus a per-pass hook for localization.

## Consequences & costs

- **Everything rests on the extractor.** A lossy or over-eager content extractor produces false positives
  (blocks good output) or false negatives (misses a real drop).
- **Subset semantics are subtle.** Reordering, whitespace, and reformatting must be normalized or the
  gate cries wolf.
- **It runs on every job** — a real but accepted cost for a fidelity guarantee.

## Known uses

- `ContentValidator` — the production input-⊆-output fidelity gate.
- The staging per-pass variant (a dedicated fidelity marker on stdout localizes the offending pass).
- The accessibility-remediation policy it enforces (never drop content the user wrote).

## Related mechanisms

- **Layer** — with [standards-rule-engine](standards-rule-engine.md): both are product gates over the
  artifact, fidelity (nothing lost) and conformance (standards met).
- **Counterpart** — the per-pass staging variant localizes what the prod gate only detects.
- *See also (sibling)* — [coherence-lints](coherence-lints.md): the other deterministic checks in this
  family.
