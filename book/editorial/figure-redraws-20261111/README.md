# Author-reference recreations: Figures 2.9 and 2.10

These editable SVGs reproduce the two panels supplied by the author on November 11, 2026. They preserve the panel titles, wording, node and arrow topology, annotation leaders, legends, footer, and the counts **125** and **57**. The color and monochrome files share geometry and text. Every label is SVG text, every shape is a native vector element, and no bitmap is embedded.

The source image was `codex-clipboard-f1156bc9-407d-4037-a690-b45325d3a97b.png`, SHA-256 `6eb33eb8946b3a52f1d153c56ef73ba8daa7e69022beae9bc1939517f930beb0`. The image is a reference, not a component of the SVG. No words remained uncertain after inspecting enlarged crops; the Figure 2.9 footer ends “each computation.”

## Files

- `figure-2-9-reference-color.svg`: Remediation Graph (Typed).
- `figure-2-9-reference-bw.svg`: the same diagram with grayscale fills and strokes; rectangle/diamond node shapes and solid/dashed edges retain their meanings.
- `figure-2-10-reference-color.svg`: Job Execution with Retries.
- `figure-2-10-reference-bw.svg`: the same state diagram in grayscale; state labels and topology remain explicit.
- `build_reference_figures.py`: deterministic, standard-library SVG builder. PNG/PDF rendering optionally uses `rsvg-convert`.

Each SVG has a 782 × 800 viewBox. The font stack is Times New Roman, Times, Liberation Serif, serif, matching the reference's serif treatment while retaining editable labels. Subtle vector gradients reproduce the original tints without reproducing incidental bitmap texture. The longest dependency-legend line uses a 297-unit `textLength` to keep the complete wording inside its panel. Text remains editable.

## Reproduction

From the repository root:

```sh
python3 book/editorial/figure-redraws-20261111/build_reference_figures.py
python3 book/editorial/figure-redraws-20261111/build_reference_figures.py --render-dir /tmp/mage-reference-figure-proofs
```

PNG proofs render at 1564 pixels wide. The SVG dimensions are nominal pixels; final print placement determines the physical type size.

## Fidelity decisions

The reference explicitly labels **Validate (direct edit)**. It also draws **two** curved return arrows from Retrying to Running. Both are retained verbatim; this recreation does not resolve their modeling implications. Pending, Running, Retrying, Succeeded, and Failed remain the five named states. The retry annotation keeps `n ≤ 3`, while the property list keeps `N = 3`, as in the reference.

The SVG artifacts are initially editorial sources. Installing them under canonical book asset paths and reconciling surrounding prose or native print figures is a separate integration step. These files do not record author approval of either figure.

## Inspection and size check

The four full-size renders were inspected against the supplied image for text, shape, routing, and annotation placement. Automated artifact checks confirmed identical text and path geometry between color and monochrome variants, no embedded raster images, no extracted PDF text outside the canvas, and identical RGB channels in the monochrome renders. Figure 2.9 contains 44 editable text elements; Figure 2.10 contains 34.

The current MAGE page has a 450 bp text width (`latex/house.sty`: letter paper with 1.125-inch left and right margins). At full text width, the smallest type is approximately 10.07 pt in Figure 2.9 and 10.93 pt in Figure 2.10.

At 47% of the text width (211.5 bp), Figure 2.9's main annotations become 5.14 pt and its smallest legend text becomes 4.73 pt. The unchanged reference is therefore unsuitable for that wrap width. A wrap-friendly version would require an expressly different composition or less content, rather than merely shrinking this reproduction.
