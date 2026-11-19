# Author-agent prompt: consistent diagram fills in Chapters 2–4

Revise the monochrome diagram fills in MAGE using the completed [42-figure audit](../figure-fill-audit-20261118.md) and the [persistent drawing policy](../../../plugin/mage/skills/self-communicate/drawing/figures.md#fill-and-shading-meaning-before-decoration).

## Objective

Readers should not infer a distinction from arbitrary changes between gray and white nodes. White is the default for ordinary entities, states, operations, components, and artifacts. Gray must distinguish a named role, group, region, or focal element. Its meaning can be local; do not impose “gray means model” across the book. Preserve purposeful shading, shapes, hatching, borders, and line styles. Do not add explanatory legends to rescue decorative fills.

## Changes to make

1. **Figure 2.11 — `recovery-ordering-model`:** make the three state interiors white. Preserve the horizontal states, text, arrows, crossed dashed shortcut below, caption, and recently reduced dimensions.
2. **Figure 2.12 — `in-flight-ownership-states`:** make all four state interiors white. Preserve the compact orthogonal B/8 release and the separate arrowless stale-A/7 callout. Do not turn rejection into a transition.
3. **Figure 2.14 — `service-flow-model`:** make the ordinary service/entity interiors white. Preserve all nodes, labels, permitted edges, topology, geometry, and caption. This aligns the service graph with the new author-reference Figure 2.13 and the entitlement graph in 2.15.

The audit supports retaining the other 39 figures' fill treatments. In particular, do not shade 2.15 to match the old 2.14. Do not revert the white nodes or dashed observed shortcut in 2.13.

## Encodings to protect

- 2.1: constraint regions and hatched intersection.
- 2.2 and 2.8: obligation and sanctioned-seam emphasis.
- 2.9: computation types, with the existing shape/fill key.
- 2.16: focal rejection outcome.
- 2.17–2.18: labeled implementation portions and shared-identity hub.
- 3.1 and 3.6: Alignment-function shading.
- 3.2–3.5, 3.7–3.8, and 3.11: labeled regions, parallel bands, and relevant focal elements.
- 4.2–4.3, 4.6, 4.8–4.9, and 4.11: named groups, nested regions, and emphasis.
- 4.5: media/structure distinction; 4.7: dominant/modified operations; 4.10: locally keyed model concepts; 4.12: validation work.

These are local meanings. A gray node in one figure need not have the same role as a gray region in another. Equivalent elements within one figure or a related teaching sequence should remain consistent.

## Source discipline

Read repository instructions. Use current labels and figure identifiers because numbering may change. Inspect the current rendered figures before editing. The audit is a baseline, not permission to overwrite intervening author changes.

Edit maintained generators and native drawing sources so regeneration preserves the change. Figure 2.11 and 2.12 share `book/editorial/figure-redraws-20261111/build_recovery_ownership_figures.py`. Find the current source/generator for 2.14 through the figure inventory; do not assume an old editorial SVG is authoritative. Keep SVG/web and TikZ/PDF outputs semantically coherent. Use monochrome-specific styles if necessary to preserve an intentional web palette.

Prefer a shared neutral-node style only where existing infrastructure makes that a small change. Do not globally redefine all gray fills, replace every `black!7`, or refactor unrelated generators. Update relevant figure receipts, hashes, layout/typography checks, inventory, and publication metadata. Historical approvals remain history; new validation records must describe the new result.

## Verification and deliverables

Rebuild Chapter 2 and inspect the three revised figures at final print size alongside 2.10, 2.13, and 2.15. Rebuild Chapters 3–4 if shared drawing changes could affect them; otherwise verify their sources and rendered figures are unchanged. Run the repository's normal figure geometry and typography checks. Compare before/after for topology, text, arrow directions, line styles, contrast, and dimensions. Do not claim a successful verification from source inspection alone.

Return a short change list, before/after proofs for 2.11, 2.12, and 2.14, the rebuilt Chapter 2 PDF, and any remaining exceptions. Do not make prose, caption, sizing, placement, or content changes as part of this fill pass. Report a genuinely ambiguous encoding rather than inventing a rationale for it.
