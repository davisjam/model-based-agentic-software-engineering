# Figure 2.9 mutation-category correction

The author reopened the approved diagram because “Validate (direct edit)” suggested a contradiction. The production graph already distinguishes read-only computations from direct editors and typed patch producers; no new production category is proposed here.

## Source grounding

Read against the local DocAble implementation on 2026-11-11:

- `system-models/remediation_graph.py`, `MutationKind` (lines 329–383): read-only, typed patch producer, partial typed patch producer, and direct editor. `ApplySeam` is a separate axis, attached to patch producers.
- `PdfAltTextSpecificityCritiquePass.cs`: `MutationKind` is `ReadOnly`; the pass reports findings and writes no `/Alt` strings. This grounds the final “Check alt-text (read-only)” node.
- `PdfStructAltTextValidationPass.cs`: a different pass declares `DirectEditor`; it can rewrite alt-text. The prior generic Validate label obscured this difference.
- The document classifier also declares `READ_ONLY` in the graph.

## Teaching scope

The drawing is an illustrative fragment: it shows three mutation behaviors and two edge meanings, not a complete runtime path or all four mutation categories. The main text retains the partial-producer category. “Apply patches” exposes the mutation boundary so the reader can distinguish producing a patch from applying it. The apply-seam annotation is separate from the node shape: the production model records the chosen seam on a producer, while this diagram shows the boundary where application happens.

Classify and Check alt-text are white ellipses, typed repair producers light-gray diamonds, and Apply patches a darker rounded box. Counts 125/57 remain the frozen book snapshot. The archived reference SVGs remain unchanged; `build_house_figures.py` applies this correction and `build_house_tikz.py` derives the native figure. Indented mutation bullets and italic *e.g.,* from the previous approval are preserved.

## Review and provenance

The prior publication approval at base commit `e34cb63dea24dd6b227b4f5fade9e032f24aa18e` covered candidate SHA-256 `4548a8877ee66b7b24474a727c172df9e4237c9ea09ac5d2dced2eba041b7ff8`. That approval is removed for this semantic revision; no other figure approval changes. The author approved the corrected candidate on 2026-11-11 (SHA-256 `ef2ebe06249d7b93edf3c64a23456d0094c582967b0100ecbd28af3d500af05e`); publication approval now points to this version. Strict compilation, geometry, typography, grayscale, and final-size visual checks passed; detailed hashes and measurements are in the figure receipt.
