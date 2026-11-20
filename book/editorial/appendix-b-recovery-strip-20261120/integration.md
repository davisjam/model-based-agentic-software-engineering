# Appendix B recovery strip — integration handoff

Geometry is frozen after parent review. No shared registry or manuscript was edited by the figure lane.

## Files and identifiers

- Source: `book/assets/recovering-and-extending-governance.svg`
- Native: `book/tikz/figures/recovering-and-extending-governance.tex`
- Generator: `book/editorial/appendix-b-recovery-strip-20261120/build.py`
- Proposed stable figure label: `recovering-and-extending-governance`
- Canonical converted PDF: `book/latex/assets/recovering-and-extending-governance-389d21c46b.pdf`
- Native context: `book/latex/sources/appendix-practicing-mage/brownfield-migration.tex`
- Receipt draft: `receipt.json` in this directory; copy to `book/tikz/receipts/recovering-and-extending-governance.json`.
- Registry row drafts: `registry-additions.json` in this directory.

`389d21c46b` is the first ten hex characters of SHA-256 of the repository-relative SVG path, following `mage_latex.py`. Parent should generate the PDF through `mage_assets.render_svg_cached` and append this row to `brownfield-migration.assets.json`:

```json
{"source":"book/assets/recovering-and-extending-governance.svg","pdf":"book/latex/assets/recovering-and-extending-governance-389d21c46b.pdf"}
```

## Manuscript insertion

Place the ordinary full-width figure after B.2's first two paragraphs. The artwork is 444 × 224bp (approximately 450 × 230bp with the native preview border), with 10pt type. The caption fits below it while leaving substantial space for prose. No wrapfigure or forced figure page.

```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/latex/assets/recovering-and-extending-governance-389d21c46b.pdf}
\caption[Recovering and extending governance]{\emph{Recovering and extending governance in an existing system.} (a) Recover useful models from implementation patterns and existing engineering knowledge (adapted from \cref{discovering-latent-models}). (b) Establish correspondence through active alignment, then preserve it through passive alignment (adapted from \cref{active-passive-alignment}). (c) Extend the alignment kernel incrementally, protecting established obligations as new models enter governance (adapted from \cref{alignment-kernel}).}
\label{recovering-and-extending-governance}
\end{figure}
```

The caption is the user's exact wording with symbolic references in place of hard-coded numbers. Source labels correspond to current Figures 4.10, 4.2, and 4.3 respectively. The actual source asset for 4.10 is `discovering-models-migration.svg`; its manuscript label is `discovering-latent-models`.

## Shared registrations

Read `registry-additions.json` and add only its named rows:

1. Append `inventory` to the list in `book/tikz/inventory.json`.
2. Append each matching draft to `figures` in `layout-review.json`, `typography-review.json`, `style-review.json`, and `fidelity-review.json`.
3. Append `grayscale-review` to that registry's list.
4. Add `publication.entry` under `publication.source` in `publication.json` → `approved_monochrome`.
5. Add `caption-tier.entry` under `caption-tier.key` in `book-models/figure-caption-tiers.json` → `tiers`. Tier B fits this four-sentence supporting caption; do not pad the caption.
6. Copy the receipt draft to the canonical receipt path above.

Adding this figure increases the native pool from 136 to 137 candidates. Set active `candidate_count` fields to their resulting row counts rather than blindly trusting stale historical totals: layout and typography become 137; style currently has 135 rows and becomes 136. Inventory grows from 130 to 131 records, fidelity and grayscale from 136 to 137 rows. Typography gains 27 checks; recompute `check_count` from all rows if refreshing that summary, as its existing 1022 is historical and not the current sum. Leave `refined_count`, source commit history, and old linked-region totals unchanged: this is a new unlinked figure, not another refinement of an old entry. There are no explicit in-artwork cross-reference links; all adaptation references are in the caption.

## Evidence and limits

- Native proof: `/tmp/mage-appendix-b-recovery-strip/proof.pdf`
- Native preview: `/tmp/mage-appendix-b-recovery-strip/native.png`
- Original figure comparisons: `/tmp/mage-appendix-b-recovery-strip/sources.pdf`
- Native geometry: zero findings; typography: 27 checks, zero findings.
- Source overflow lint: zero overflow and zero strain findings for this figure.
- SVG and native share one geometry. Local SVG rasterization currently falls back to Times New Roman despite the declared `Source Sans 3,Arial,sans-serif` family; native PDF uses the required Source Sans 3. This is recorded in `validation.json`, not hidden by claiming font parity. Parent should check the HTML rendition under the site font configuration.

Parent owns canonical synchronization, full pool/full book builds, final rendered-page inspection, commit and publication.
