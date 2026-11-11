# Recovery and ownership reference redraws

The author supplied a two-panel reference on November 11, 2026, for the figures displayed in review as 2.12 and 2.13. Stable manuscript identifiers are `recovery-ordering-model` and `in-flight-ownership-states`. Publication numbers and internal titles are deliberately omitted inside the graphics. A nearby figure deletion changes numbering, and the surrounding caption supplies each title. Subtitles remain; the vacated title space is cropped.

The reference image was `codex-clipboard-9fd4b1ab-155b-4676-b91d-96cfa78068e4.png`, SHA-256 `d1fe0d0bb7c70f76e40bf30b67522103374ab8dacce9412b7c041afe64dc97d7`.

## Authored sources and reproduction

`build_recovery_ownership_figures.py` generates canonical color SVGs under `book/assets/`, editable monochrome SVGs in this directory, and native monochrome TikZ under `book/tikz/figures/`. Geometry and wording are shared in the builder. It uses standard Python; optional raster proofs require `rsvg-convert`.

```sh
python3 book/editorial/figure-redraws-20261111/build_recovery_ownership_figures.py --render-dir /tmp/mage-recovery-ownership-proofs
```

The SVGs use editable text and native vector shapes; they embed no raster images. The font stack names Source Sans 3 with sans-serif fallbacks. Native TikZ inherits the book's existing sans-serif figure font profile. No font-gate exception is required.

## Editorial choices

- Recovery keeps the three states, their explanations, the permitted downward sequence, the crossed forbidden bypass, the transition legend, and the final publication-order obligation. Its narrow vertical composition preserves readable type rather than scaling a wide graphic down. The proof is about 236 bp wide including preview padding.
- Ownership retains Unowned → Owned (A, 7) → Reclaimable → Owned (B, 8), the crossed stale `release(A, 7)` route, and the permitted `release(B, 8)` return to Unowned. Both the state-meaning legend and key-transition explanations remain. Annotation wrapping was adjusted for the house font without changing wording.
- Internal titles, decorative title bars, and enclosing page frames from the supplied reference were omitted to match the book's figure treatment. State tint, node shape, and solid/dashed/crossed transitions remain explicit. The monochrome version preserves the distinction without relying on color.
- Caption and surrounding manuscript changes are owned by the integration pass, not this figure patch. Approval status remains pending author review.

## Verification

Both native proofs compiled with zero unapproved diagnostics. Scoped geometry checks and the existing default-font typography gate passed: 17 selected text checks for recovery and 29 for ownership. Recovery state boxes retain their equal-size/alignment contract; the two Owned-generation boxes retain theirs. Native proofs are monochrome and fit the 450 × 560 bp envelope. The smallest authored sizes are 10.3 pt for recovery annotations and 10 pt for ownership legend text. Native and SVG proofs were visually inspected for clipped text, legibility, arrow direction, cross markers, and annotation/curve clearance.
