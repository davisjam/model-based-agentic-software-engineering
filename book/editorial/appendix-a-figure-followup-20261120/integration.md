# Appendix A figure follow-up, 2026-11-20

The five paired SVG/native figures were revised from verified current sources. Before editing, regenerated baselines matched every current SVG and TikZ source byte-for-byte. The parent visually approved all five revised native proof pages. No shared registry, caption, prose, or book build was changed in this figure task.

## Integration

From the repository root:

```sh
python3 book/editorial/appendix-a-figure-followup-20261120/integrate.py --apply
```

Omit `--apply` for a dry run. The script verifies the frozen SVG/native hashes before replacing the five corresponding inventory, layout, typography, style, fidelity, grayscale, and publication records. It copies the five receipts from this directory. It preserves all other rows and each JSON file's Unicode formatting. No candidate-count increase or caption-tier update is required. The typography check count changes by the exact checks delta. All asset mappings and figure labels remain unchanged; their paths are included in `registry-additions.json`.

The parent must refresh rendered SVG asset PDFs, run the integrated native pool and build the book. Do not rerun earlier Appendix A generators over these revisions; use this directory's `build.py`.

## Changes

- **A.1, handbook-derived-iam:** Removed only “Later: migrate consumers, then transfer authority.” The authority migration remains in prose. IAM versus service-name parity and fix-forward results remain in the diagram.
- **A.2, handbook-typed-changeset:** Labeled the dashed comparison relationship “diagnostic evidence,” leaving it outside the controlled application boundary. Target resolution has slightly less horizontal padding so the relation label fits. No admission behavior changed.
- **A.3, handbook-substitutable-reasoning:** Gray encloses exactly two alternative engines. Shared model selection sits outside the group, consumes a prominent capability-model input, and supports both alternatives. Acceptance has explicit findings and policy inputs. Evaluation still consumes the acceptance model independently of admission.
- **A.4, handbook-model-guided-delegation:** Two equally sized heavy diamonds align Dispatch authorization and Completion against obligations. Durable work supplies checks and completion review; independent checks produce review evidence. Positive DONE, refusal, valid override, interruption and reconciliation remain distinct. The figure does not claim that review is necessarily automated.
- **A.5, handbook-model-based-test-selection:** A dashed outer revision route returns to component/dependency and validation-coverage models. The affected subsystem model remains derived by the existing impact mechanism. Recognized-gap full-run fallback remains distinct from evidence challenging completeness.

## Inspection and checks

Isolated proof: `/tmp/mage-appendix-a-figure-followup/proof.pdf`.
Native previews: `/tmp/mage-appendix-a-figure-followup/native-1.png` through `native-5.png`.
SVG previews: corresponding `svg-1.png` through `svg-5.png`.

| Figure | Native proof dimensions (bp, including border) |
|---|---|
| A.1 | 446 × 354 |
| A.2 | 446 × 338 |
| A.3 | 450 × 240 |
| A.4 | 446 × 360 |
| A.5 | 450 × 258 |

All authored labels remain 10pt. Native compilation completed in two passes without unapproved diagnostics. Geometry audit: zero findings, 51 terminal approaches checked. Typography audit: 132 checks, zero findings. Source SVG overflow lint: no overflow or strain findings in these five figures; unrelated existing strains remain outside this task. All native and SVG previews were inspected. Local librsvg still substitutes a serif font for the declared Source Sans 3 fallback list; native proofs embed the correct book figure fonts. This task does not claim SVG/native font parity or alter the shared font pipeline.

Before sources, receipts, and individual active review rows are preserved under `before/`. Geometry and typography audit reports are stored alongside the draft registrations. Their conclusions concern geometry and typography, not proof of implementation behavior or model completeness.
