<!-- note-spread: 1 -->

**Intent** — A deterministic gate asserting that every piece of the user's original content survives
remediation (input content ⊆ output content), run in production, with a per-pass staging variant that
pinpoints which pass dropped content.

## Problem

Remediation mutates the document across many passes and four formats. A bug in any pass could silently
drop or alter user content: a deleted paragraph, a mangled table, a lost caption the author never sees
go. For a fidelity-critical tool that is the worst possible outcome — the output looks fine and quietly
isn't what the author wrote. The failure recurs on every remediation pass.

## Mechanism

The gate extracts the input's content and asserts it is a subset of the output's, checked mechanically on
every production job and failing the job on violation. A staging-only per-pass variant, gated by an
environment label, emits a dedicated fidelity marker and a nonzero exit code, so the offending pass is
identified before delivery. That turns "content was lost somewhere" into "pass N lost it."

## Engineering Consequences

The guarantee becomes a deterministic post-condition rather than trust in the mutation code or a human
spot-check that misses *silent* drops — you don't notice the paragraph that's gone. A post-condition that
fails the job takes the trust out of the loop. The costs are concentrated in two places. Everything rests
on the extractor: lossy or over-eager extraction yields false positives that block good output, or false
negatives that miss a real drop. And subset semantics are subtle — reordering, whitespace, and
reformatting must be normalized or the gate cries wolf. It runs on every job, an accepted cost.

## Implementation Seam

The production fidelity gate runs post-remediation and pre-delivery; the per-pass hook adds localization
in staging. Both need a content extraction comparable across input and output, and a subset predicate
that tolerates legitimate reformatting and reordering without firing.

## Known Limitations

The extractor defines what "content" means, so the guarantee is exactly as complete as the extraction —
anything it doesn't extract, it can't protect. The subset predicate must tolerate legitimate reordering
without false positives, or it blocks correct output. The production gate detects a loss without localizing it; only the staging per-pass variant names the
pass that caused it.
