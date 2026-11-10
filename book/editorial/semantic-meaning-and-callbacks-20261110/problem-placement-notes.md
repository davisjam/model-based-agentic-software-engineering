# P1/P2 — name the problems where their arguments conclude

Draft-only against owned fold HEAD `3224de3d7`. No shared source, model, figure, projection, Git index, or commits changed. Used the self-communicate textbook register and read the latest complete §§1.4, 1.5, 1.6 and their actual problem/point metadata.

## Files and exact application

- `proposed-1.4.tex`: complete proposed §1.4 source, for a direct diff against the receiving file.
- `proposed-1.5.tex`: complete proposed §1.5 source.
- `horizon-close.tex`: the moved existing synthesis paragraph, extended with the Representation Problem name/question and Chapter 2 reference.
- `enforcement-close.tex`: final Enforcement Problem definition/question and Chapter 3 reference.
- `synthesis-opening.tex`: new complementarity-first §1.5 opening and preserved DocAble example.
- `replacement-spans.json`: exact sequential old/new spans, including file paths and purposes. All replacements are unique against the source read. Apply in listed order within each file.
- `retired-1.5-prelude.tex`: displaced prelude, definition list, and earlier composition paragraph, suitable as the verbatim cutting-room snapshot. The economic-completion footnote and composition example survive in the proposed text; they are not lost.
- `build-drafts.py`: reproducible draft construction only; writes exclusively into this scratch directory.

## Rhetorical placement

**Representation Problem:** the horizon section has an optional context/compaction inset after its mainline explanation. To make the name the section's actual conclusion, move the existing paragraph beginning “The reasoning horizon can expand in two ways...” to immediately after the inset's `\end{bookbox}`, outside the box. Keep its external-representation citations and qualification that improvements may lower cost without extending the horizon. Append the named Representation Problem question there, so “better representations can reduce how much state the task requires” directly grounds the problem.

The existing figure remains in exactly the same relative place before the inset. Its introduction, “\autoref{reasoning-horizon-fig} illustrates how purposeful abstraction reduces reconstruction,” remains there as a standalone sentence. Neither the figure/figure caption nor any inset wording changes. The new concluding paragraph works both when the optional inset is read and when it is skipped.

**Enforcement Problem:** preserve the complete existing authorship/assurance argument, reliability equation and numerical explanation, probabilistic-surface definition, and final requirements/validation qualification. Add the canonical Enforcement Problem paragraph at the end, after that qualification. It names the question reached by the section as a whole; it does not interrupt the equation to introduce a problem that would then need repeating.

Move the existing economic-completion footnote out of the deleted §1.5 prelude to the sentence in the reliability explanation ending “...getting every feature in a product right.” It qualifies the same correctness/cost issue in its proper setting, without adding another derivation.

**§1.5:** start directly with Modeling and Alignment's complementarity. State both independence cases: a model can remain advisory; a permission or resource limit can be enforced without an elaborate model. Combine selectively according to the task. Then retain the concrete DocAble content representation/validator example and the existing method figure. The opening now says “Consider DocAble's obligation...” because the validator example no longer appears earlier in the shortened DocAble introduction. This is a local coherence repair, not a new incident.

The existing method figure/caption and “The Methodology Extends Beyond Software” subsection are unchanged byte-for-byte.

## Canonical homes and stable metadata

Both canonical `index-def` markers move from §1.5 to the relevant concluding paragraph in §1.4. Each occurs exactly once in the combined draft. No glossary definition changes are needed; the problem terms are registered in `book/index-terms.md`.

Preserve the existing point IDs as join keys, with updated summaries and terms:

- `substrate-leaves-two-problems` now anchors the Representation Problem conclusion. Its historical slug is retained; the summary describes its new exact content.
- `the-two-problems-representation-and-enforcement` now anchors the Enforcement Problem conclusion. Its summary records the Enforcement question alongside the Representation question already introduced.
- `modeling-and-alignment-complement-one-another` stays in §1.5 with the complementarity/example content.

Add `representation-problem` and `modeling-principle` to the horizon section terms; add `enforcement-problem` and `alignment-principle` to the enforcement section terms. Give the §1.5 synthesis its corresponding section terms. Preserve both existing §1.5 headings and labels; no new heading is required for this relocation.

Root should update the declared chapter-shape handover and outcomes that still say the problems are introduced in §1.5, then regenerate projections/derived models. New canonical problem home is §1.4, and §1.5 delivers composition/synthesis.

## P2 — probability-model association audit

The erroneous §1.5 `\magevalue{sec:reasoning-horizon}` reference disappears with the removed derivation. Do not retain it merely to change its destination.

The product equation and all feature-reliability examples remain under “Probabilistic Work Needs External Enforcement.” The economic-completion footnote now resides there too. None of the new Representation Problem wording appeals to that equation; its ground is the horizon/reconstruction discussion.

The current §1.6 summary already places the feature-product consequence explicitly under Enforcement, following its Representation paragraph sentences. It contains no erroneous probability-to-Representation link and can remain unchanged for this relocation. If root adds an explicit reference, use `\autoref{heading:probabilistic-work-needs-external-enforcement}` at that reliability consequence, never the `sec:reasoning-horizon` macro or a fixed number. Root is separately tightening the summary's Alignment taxonomy; this draft does not duplicate that work.

The existing `substrate-to-method` caption is already correct: finite reasoning state → representation; probabilistic autonomous implementation → independent enforcement. No figure, caption, or equation change is warranted.

## Audit and preservation checks

The draft script asserts: both canonical markers occur once and only in §1.4; the footnote occurs once in its new home; the old wrong reference is absent; §1.5's figure-and-beyond suffix is byte-identical; the equation/numerical explanation is preserved. No repository test run is needed for draft-only prose.

No new research, sources, empirical claims, taxonomy, or glossary edits. The two names now follow the arguments that establish them, and the next section advances to their selective combination.
