# MAGE grayscale figure trials

These editable TikZ/PGFPlots candidates accompany the existing color artwork for
publisher review. They do not replace the production figures. Each candidate is
placed immediately after its original in the comparison book; original figure
numbers and references are retained.

Run from the repository root with the PDF build dependencies installed:

```sh
python tools/mage_tikz_charts.py --check
python tools/mage_tikz_review.py
```

The output is `latex/build/mage-figure-review.pdf`. `--figures-only` compiles the
candidate pool without assembling the book. The full build also writes
`latex/build/mage-tikz-source.zip` (standalone editable publisher sources),
`latex/build/tikz/pairings.json` (original-to-candidate mapping), and
`latex/build/tikz/review-notes.txt` (editorial questions). The compiler rejects all final
warnings except underfull boxes. Additional checks require one candidate per
inventoried drawing, native print dimensions, alternate text, and monochrome
rendered pixels. Pre-commit checks data projections; pre-push and the book CI job
compile and check every candidate.

`figures/` contains native TikZ pictures; `mage-figures.sty` holds common fonts and
libraries. Pictures are compiled at their authored size, with no shrink-to-fit.
The book embeds the resulting vectors with figure alternate text. Editable TikZ
sources remain available to the publisher. `receipts/` records the claim,
relationships, grayscale encoding, redesign choices, and unresolved editorial questions.
These are review candidates, not a claim that every redesign has editorial approval.

The eight newer empirical charts use the committed factory-archaeology CSVs and
the existing category definitions. The historical churn chart uses the native
manuscript's exact sixteen counts and a consistent positive/negative scale. The
older velocity chart recovers the integer values encoded in the original SVG;
its receipt records the original file hash and the discrepancy between nineteen
actual bars and a twenty-week description. No newer series is substituted.
Seven navigation maps preserve station order and highlight the current chapter
with a solid marker and bold type. The author photograph is retained as a
photograph, outside the native drawing conversion.

The comparison edition intentionally adds pages and is excluded from web
publication. The regular release PDF and all original assets remain unchanged.
PDF structure checks verify tags and alternate text; they do not certify complete
accessibility or replace review of the separate HTML edition.

## Grayscale and geometry review

Grayscale includes white, gray fills, shading, patterns, dashed lines and line
weights. Preserve the original's distinctions, groupings and arrow meanings;
reducing every node to a white box can remove information. `grayscale-review.json`
records the complete figure-by-figure refinement pass.

`tools/tikz_audit.py` adapts the SVG overflow/collision/occlusion/font-band sensors
to actual compiled PDF characters and vector paint order using PyMuPDF. The existing
reference checks are `tests/svg_fit.py`, `book-models/lint_figure_overflow.py`,
`book-models/lint_figure_label_collision.py`, `book-models/lint_figure_text_occlusion.py`,
and `plugin/mage/skills/self-communicate/drawing/svg-audit.py`. Converting compiled
PDF back to SVG outlines discards the text semantics these checks need. Every
candidate build writes `latex/build/tikz/geometry-audit.json` and an annotated PDF
with red diagnostic rectangles (the annotations are not publication artwork).
CI retains these reports separately from published book artifacts.

```sh
python tools/tikz_audit.py latex/build/tikz/candidates.pdf \
  --manifest latex/build/tikz/pages.json --output /tmp/tikz-audit.json \
  --annotated /tmp/tikz-audit.pdf
python -m unittest tests.test_tikz_audit
```

The new geometry checks are audit-only, following the SVG sensors' rollout
practice; `--strict` returns failure on any finding. Compiler diagnostics,
print dimensions and grayscale pixel checks remain blocking. Tests include
intentionally broken TikZ that compiles without warnings, and a clean drawing
with gray fills, a dashed connector and a white-backed edge label.

Glyph boxes approximate ink. Complex clipping, intentional mathematical overlays,
node ownership and semantic fidelity still require visual/source comparison. A
clean geometry report does not mean a redraw preserves the original's meaning.
