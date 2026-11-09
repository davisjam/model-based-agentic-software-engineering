# DocAble case-study chart data, 9 November 2026

These frozen aggregate data support the revised Chapter 5 case. The existing longitudinal series is copied exactly from `book/data/docable-seip-261028`. Its 31 complete weeks run from March 12 through October 14, 2026. The source-composition series has ten measured snapshots; lines between them interpolate. Early missing dispatch and Epic records are not zero activity.

The evaluation data are extracted from the active DocAble study generated summaries using its Figure 6 extractor. Its six cross-checks are recorded in `provenance.json`. The full validation cohort had 63 attempts and 62 completed outputs. Checker-reduction denominators omit zero-baseline documents; increased-finding denominators retain all assessed triples. Undefined percentages remain undefined. Semantic parity means a score difference within one point, not equivalent accessibility. Criterion changes count document–criterion judgments rather than distinct defects.

`provenance.json` records source hashes. `effectiveness.json` contains the aggregate values plotted, without document identifiers. The underlying study is cited in the book as `davis2026docable`; the manuscript snapshot was created on November 4, 2026. The editorial evidence receipt retains exact source locations.

Run `python3 book/figures/docable-case-261109/generate.py` from the repository to regenerate the three SVGs, companion PDFs, and native TikZ/PGFPlots sources. Matplotlib is required. The native figures use the book's shared font profile and `mage-figures.sty`. Source Sans 3 follows the current native book profile; the explicit panel names distinguish the requested composites. No observation is fabricated or interpolated into a data file.
