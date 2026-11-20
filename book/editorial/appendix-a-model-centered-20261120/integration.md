# Model-centered Appendix A figure handoff

Reviewed 2026-11-20. Parent approved the two new native proof pages. Source/native geometry is frozen.

Run from the repository root:

```sh
python3 book/editorial/appendix-a-model-centered-20261120/integrate.py --apply
```

Without `--apply` the script is a dry run. It checks the frozen source/native hashes first. It upserts only the four owned figure records in inventory, layout, typography, style, fidelity, grayscale, publication, and caption tiers; copies the four receipts; and adds two to relevant coverage counts. Existing unrelated rows retain their values. It adjusts typography check totals by the actual delta. It does not alter prose, asset maps, native-source roster, build outputs, or git. No changes to monochrome-originals are needed: these are reviewed native replacements/new native artwork, not retention of an original chart.

## Assets

| Figure label | SVG | Canonical asset PDF |
|---|---|---|
| handbook-substitutable-reasoning | book/assets/handbook-substitutable-reasoning.svg | book/latex/assets/handbook-substitutable-reasoning-d5f7734f79.pdf |
| handbook-model-based-test-selection | book/assets/handbook-model-based-test-selection.svg | book/latex/assets/handbook-model-based-test-selection-3cbe737b13.pdf |
| handbook-typed-changeset | book/assets/handbook-typed-changeset.svg | book/latex/assets/handbook-typed-changeset-c507d5112b.pdf |
| handbook-model-guided-delegation | book/assets/handbook-model-guided-delegation.svg | book/latex/assets/handbook-model-guided-delegation-583ae52872.pdf |

The two new source figures are 444×234bp with 10pt labels; native isolated proof pages including border are 450×240bp. The existing two retain their established geometry and receive only model-role clarifications. Full native figure-pool and book builds remain the parent's integration step.

`registry-additions.json` holds the exact new/replacement records, including refreshed source/native protected hashes. Caption rows use the final canonical prose. In particular, controlled mutation now ends with the consumer-refusal/direct-write-boundary qualification, rather than implementation status.

## Evidence

- Isolated four-page proof: `/tmp/mage-appendix-a-model-centered/proof.pdf`.
- Native previews: `native-1.png` through `native-4.png` in the same directory.
- Source SVG previews: `svg-1.png` and `svg-2.png` in that directory.
- Geometry audit: zero findings, 42 checked terminal approaches.
- Typography audit: zero findings, 101 checks, embedded Source Sans 3.
- Book SVG overflow lint: zero overflow findings; none of the four owned figures has overflow or strain findings.
- The new figures' model groupings were checked against the settled five-row inventories and approved by the prose author. Acceptance criteria visibly feed evaluation and admission; the component/coverage challenge path is not labeled independent proof. Typed requests are not presented as sufficient to prevent all out-of-band writes.

Local `rsvg-convert` resolves the declared Source Sans 3 fallback list to a serif font in its isolated render; the same font-resolution issue was observed for earlier existing sources. Source SVG geometry remains clear and labels fit, but this is not claimed as font parity. Native print proofs use the correct embedded Source Sans 3 fonts. The shared HTML/font pipeline is outside this figure-only change.

## Preservation

`before/` archives the two revised original figure pairs and their selected active registry records. The new generator is `build.py`; do not rerun the older Appendix A generator over these labels. Receipts and audits record the limited visual/semantic scope honestly, rather than claiming that geometry establishes model completeness or implementation conformance.
