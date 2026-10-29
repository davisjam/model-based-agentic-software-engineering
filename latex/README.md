# Shared LaTeX editions

MAGE and the Software Engineering Handbook use native LaTeX manuscript sources and
one print style, `latex/house.sty`. The style retains the existing warm paper,
self-hosted fonts, restrained headings and colored callouts. The MAGE profile uses
sans-serif body text; the Handbook uses serif body text. Both profiles and font
families are defined in `latex/book-fonts.tex`; standalone MAGE TikZ drawings use
the same body profile, including its bold and italic faces. Both PDF renderers apply
`latex_build.bold_table_headers` to every table, including repeated page headers,
after conversion. Header boldface is a shared print convention; authors do not
need to add manual emphasis to each source cell. The MAGE print assembler keeps
the semantic-commitment comparison (Table 2.1) together on a portrait table page;
its five-column content remains shared with the web edition.

MAGE figures may occupy up to 450 × 560 bp of the 450 × 648 bp text area,
leaving space for captions and float spacing. Dense TikZ drawings use that height
at their authored font sizes; simple drawings remain compact. The paired figure
review applies the same envelope to color originals and grayscale candidates.
The two compact overview placements retain their half-page height limit.
The author portrait retains its established size alongside the biography.
Four originals with long captions reserve additional room for that text: modeling
history, the dynamic model, change diagnosis, and incident-to-governance.

## Author and build

Edit the `.tex` manuscript, not its generated `.md` sibling. Metadata and asset
maps accompany the source. The native-source adapters preserve the existing
catalogue/model and Pandoc web/ePub pipelines:

```sh
python3 tools/mage_latex.py sync
python3 handbook/scripts/latex_source.py sync
python3 catalog.py validate
python3 catalog.py build
python3 book/build_book.py --pdf
python3 handbook/scripts/build.py pdf
```

Both sync commands accept `--check`: they fail if checked-in compatibility views
are stale without modifying files. Hooks and CI use this mode. Generated views
are retained so existing catalogue consumers can read them without a TeX runtime.
Catalogue entries and course materials remain authored in their existing formats.
Unknown native commands must be supported by the adapters before they can be used;
unsupported prose must never silently disappear from the web edition.

Use LuaLaTeX (TeX Live 2025 or newer), Pandoc, BibTeX, Poppler, and the book and
Handbook Python requirements. SVG figures also require `rsvg-convert`; the shipped MAGE PDF uses lossless
`qpdf` object-stream packing. Its SVG assets share fonts in a multipage vector PDF
without rasterizing artwork. Generated SVG canvases expand where needed to retain
labels that extended beyond an original viewport; the authored figures are preserved.
`tools/install_texlive_ci.sh` installs a checksum-verified, frozen TeX Live 2025
archive in CI. It does not modify a developer's system TeX installation.

Before publication, `python3 tools/check_print_toolchain.py` compiles both real
covers and a deliberately broken cover with the package revisions recorded in
`latex/toolchain.json`. The TeX Live year alone does not guarantee matching
LaTeX/tagpdf revisions. If native revisions differ, this check requires a running
Docker engine and uses the digest-pinned Linux image (a large first download),
with a separate font cache. Pre-push runs this check for print-related changes;
CI runs the same check with `--native`, rejecting toolchain drift. It also checks
that title/author text remains tagged rather than becoming decorative content.
The complete builds retain their strict diagnostic and PDF structure gates.

Decorative shipout artwork must wrap the entire TikZ picture in `bookdecorative`,
not merely mark the enclosed image as an artifact: otherwise TikZ's internal
boxes can become invalid direct marked-content children of the PDF Document.

`tools/latex_build.py` disables shell escape, runs enough passes for references and
contents to converge, and checks the final log. Errors, undefined references,
missing characters, overfull boxes and package/font warnings fail the build.
Only underfull horizontal or vertical boxes are allowlisted. Intermediate rerun
messages are resolved by subsequent passes, not suppressed.

Covers use the same native live text and decorative artwork for PDF, ePub and
landing thumbnails. Regenerate thumbnails with `python3 tools/cover_assets.py regen`.
Generated PDF, TeX assembly, cache and raster artifacts stay out of Git.

## Accessibility

PDF builds enable LaTeX's document, table and math tagging modules. Headings use
standard sectioning hooks; illustrations carry alternate text; decorative cover
art is marked as an artifact; table rows and headers retain structural tags.
This is a foundation for accessible PDF, not a claim of independently certified
PDF/UA compliance. Reading order, meaningful descriptions and complex structures
still need review.

HTML remains a separate output format. Its semantic templates and representative
axe checks remain in place: PDF tags cannot detect HTML keyboard, contrast or
navigation defects. The existing axe gate samples template families and a seeded
selection of content pages rather than blindly scanning every generated page.

Publisher-specific classes and submission rules can be applied at the print
assembly/style layer without rewriting the prose. The house layout is for the
current editions; it is not a claim of MIT Press template approval.

## Share a self-contained print source

After compiling, package the generated assembly with its fonts and figure inputs:

```sh
python3 tools/latex_bundle.py path/to/compiled-manuscript.tex latex/build/manuscript-source.zip
```

The archive contains `main.tex`, the shared style, required local assets and font
licenses, plus compilation instructions. It typesets with LuaLaTeX from the archive
root without the Python/Pandoc/web toolchain. This resolved assembly is the useful
starting point for a publisher's class conversion; keep editing the authoritative
chapter sources in this repository for ongoing multi-format editions.
