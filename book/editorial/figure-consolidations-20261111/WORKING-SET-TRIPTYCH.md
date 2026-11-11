# Working-set triptych: Figures 4.5 and 4.6

The author requested one editable SVG illustration combining whole-document execution, page-chunked execution, and skeletonized execution. The canonical source remains `book/assets/interlude-execution-unit.svg`; the native PDF candidate remains `book/tikz/figures/interlude-execution-unit.tex`.

Reference: `codex-clipboard-bba09687-91e6-4905-93ce-cf9e622497d5.png`, SHA-256 `c9895b3259b858b042971c416ffee6b167fa4303f3ec1b1566d3dd764364327b`.

## Layout and semantics

The three panels preserve the reference’s worker, structure, resident-media, external-media, input/output, and GenAI labels and all nine bullet statements. The overall Figure 4.5 heading is omitted from the artwork because the caption supplies it. To retain 10.2–11.2pt type within the book’s 450bp text width, each mini-flow is reflowed vertically rather than reproducing the wide reference at illegible size. Panels have equal widths and heights. The page workers remain parallel branches, not a sequential pipeline.

The skeletonized panel retains the reference’s two media-access directions and distinct bidirectional GenAI connection. Its broken media-return arrow is replaced with a complete path. It adds no external-media-to-GenAI edge. Media is streamed through the worker on demand rather than held persistently; the existing prose explains the bounded-buffer qualification. Chunking and skeletonization remain independent architectural dimensions: the illustration does not claim skeletonization immediately removed chunking.

Both SVG and native output are monochrome. The source is editable text and vector geometry, not an embedded reference bitmap. A shaded media-reference inset follows the supplied drawing; its explicit label distinguishes references from media payload. The archived original 4.5 SVG/TikZ are under `before/`; the separate former 4.6 source is not deleted by this asset patch.

## Reproduction

```sh
python3 book/editorial/figure-consolidations-20261111/build_working_set_triptych.py --render-dir /tmp/mage-working-set-proof
```

The generator writes the canonical SVG, matching editorial `interlude-execution-unit-bw.svg`, and native TikZ from the same coordinates and words. It has no external Python dependencies; PNG rendering optionally uses `rsvg-convert`.

## Review

The native standalone proof is 449.972×541.971bp with type authored at 10.2–11.2pt. This requires full-width placement. The figure and caption together need careful page placement; retain a concise caption rather than shrinking the artwork. Compile diagnostics, geometry, semantic typography, grayscale, and visual inspection are recorded in the figure receipt. This is a review candidate; the integration pass owns the prose/caption changes, old 4.6 retirement, inventory update, and publication approval.

The combined original artwork and caption exceeded the page by 1.44pt in the aggregate build. This fit correction removes 12bp of empty space below the three panel headers, lifting every diagram and note together. All font sizes, words, box sizes within the diagrams, and arrow topology are unchanged.

A focused proof used the actual manuscript caption and the original SVG projection at 450bp in the 11pt MAGE book house style. The complete float fits on one page with zero unapproved compilation diagnostics; the rendered page was inspected.
