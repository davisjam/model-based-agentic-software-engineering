# *Model-Based Agentic Engineering* — the book

*Architecture, Validation, and Control for Agentic Software Engineering.* The book renders to a
small static HTML site by `build_book.py` (wired into `catalog.py build`).

## Authoring and publishing

The authoritative authored manuscript is native LaTeX in `latex/sources/`. Edit those
`.tex` files, then run `python3 tools/mage_latex.py sync` from the repository root.
The corresponding Markdown files are generated compatibility projections for the
existing website, cross-reference registry, and book-model checks. Do not edit the
projections directly. `latex/native-sources.json` enumerates all 129 authored sources;
catalogue-derived appendices continue to derive from the catalogue's own sources.

The shared PDF layout is `latex/house.sty` at the repository root. The native PDF
build requires LuaLaTeX and BibTeX (the pinned TeX Live toolchain), Pandoc, and
`rsvg-convert`, Poppler, `qpdf`, and `book/requirements-pdf.txt`. Build with `python3 book/build_book.py --pdf`; build the web edition
with the existing `catalog.py build`. `tools/mage_latex.py sync --check` rejects stale
projections. The compiler rejects errors, unresolved references/citations, missing
glyphs, overfull boxes, and other warnings; underfull boxes are explicitly tolerated.

The full `mage-book.pdf` places each color figure immediately before its native
black-and-white version from `tikz/`, including chapter navigation maps. The build
checks the monochrome drawings at their authored print sizes and retains the
original captions, numbering and internal links. Registered charts that are already
monochrome appear once; their pixels are checked during assembly. The author
photograph also appears once. The web edition uses only the original SVG artwork.
The separate figure-review build uses the same pairing rules.

Ordinary LaTeX headings, prose, lists, tables, equations, and citations are native.
`\citep{key}` keeps bibliography identities in `references.bib`; `\autoref{label}`
keeps figure/table references. The small `\magevalue{...}`, `\mageaside{...}`, and
`\magefootnote{key}{...}` vocabulary preserves generated metrics/chapter references
and keyed editorial notes. Metadata comments retain model anchors and annotations.
The compatibility adapter rejects unsupported raw LaTeX rather than silently losing
it. Each figure's `.assets.json` sidecar preserves its original web SVG identity.

The resolved publication driver and chapters in `latex/build/` are generated. They
combine authored manuscript projections with catalogue/model output, resolving
metrics and identities before native PDF compilation. They are not authoring sources.
Section PDFs have separate generated directories so they cannot overwrite the full
book’s source bundle. References outside an excerpt use the full book’s resolved
numbers; references within it remain linked. Build the full book before excerpts.

## Part/Chapter filesystem hierarchy

The generated compatibility tree **encodes the hierarchy**: a chapter lives at `part<N>/<N>.<M>-<slug>.md`, so the
part number and chapter number are explicit in the path. `build_book.py` walks the tree,
derives PART.CHAPTER from the path, and reads the `<!-- part-title --> <!-- chapter-title -->`
metadata from each file. It emits one flat `<slug>.html` per chapter plus `index.html`, and appends
two authored appendices: MAGE Engineering Handbook and Practicing MAGE.

```
book/
  frontmatter/0.0-acknowledgments.md, 0.1-how-to-read-this-book.md, 0.2-what-this-book-argues.md,
             0.3-the-mage-method-at-a-glance.md, 0.4-the-books-language.md, 0.5-preface.md
  part1/  (Part 1 — The New Engineering Problem)
    1.1-the-printer.md … 1.5-problem-summary.md
  part2/  (Part 2 — Modeling)
    2.1-context-is-the-first-modeling-problem.md … 2.6-modeling-summary.md
  part3/  (Part 3 — Alignment)
    3.1-where-obligations-can-be-enforced.md … 3.5-when-guardrails-collide.md
  part4/  (Part 4 — MAGE in Motion: Engineering Through Models)
    4.1-the-dynamics-of-mage.md
    4.2-one-problem-many-models.md
    4.3-brownfield-engineering.md
    4.4-engineering-the-environment.md
  part5/  (Part 5 — DocAble Among Other Software Factories)
    5.1-software-factory.md … 5.4-what-the-factories-show.md
  part6/  (Part 6 — The Theory)
    6.1-toward-a-theory-of-mage.md … 6.5-what-the-theory-claims.md
  part7/  (Part 7 — The Profession)
    7.1-reorganization-of-se.md … 7.5-what-cannot-be-delegated.md
  conclusion/9.1-the-part-that-stays-yours.md
  appendix-handbook/       # Appendix A compatibility projections
  appendix-practicing-mage/ # Appendix B compatibility projections
  data/metrics.json      # headline numbers, referenced from prose via {{token}}
  assets/                # figure assets (inline SVGs)
```

Each part's number and each chapter's `<N>.<M>` are explicit in the path; `00-part-intro.md` in a
part directory carries that part's divider/epigraph page. Front matter (Preface) renders before
Part 1. The two appendices follow the Conclusion. Their authoritative sources are in
`latex/sources/appendix-handbook/` and `latex/sources/appendix-practicing-mage/`; Markdown is
a compatibility projection. `_PUBLISHED_APPENDICES` in `build_book.py` selects their sections
for HTML, EPUB, full PDF, and standalone PDFs.

The former A–J sources and native-manifest rows remain as retired research/catalogue
inputs, with complete originals preserved in `editorial/cutting-room-floor.md`. Their
presence on disk does not select them for publication.

## Authoring notes

- **Metadata.** Each chapter carries two comments: `<!-- part-title: … -->` and
  `<!-- chapter-title: … -->`. The leading `# …` H1 is dropped on render (the header comes from
  metadata), so keep or change it freely.
- **Metrics tokens.** Numbers that recur (weeks, LoC, costs) live in `data/metrics.json`. Reference
  them from prose with `{{token}}`; the build substitutes them and **fails loud** on an unknown token.
  Edit the number in the JSON, never in the prose. A later pass refreshes the repo-derived figures
  from history-mining; the cost-model and policy figures are the book's canonical estimates.
- **Epigraphs.** The per-Part opener epigraphs were removed (author's call) — `_PART_EPIGRAPHS` in
  `build_book.py` stays as the empty mechanism. The book's one epigraph is the Conclusion's Tennyson
  (*Ulysses*) opener, authored inline in `conclusion/8.1-the-part-that-stays-yours.md` and pinned to
  the main column by the `<!-- epigraph -->` marker.
- **Figures.** Insert a figure with a directive comment: `<!-- figure: assets/<file> | <caption> -->`.
  An `.svg` is inlined (its own `<title>`/`<desc>`/`aria-*` survive); any other extension is wrapped in
  `<img>`. A missing asset fails the build.
- **Copyright.** Every page footer carries `© James C. Davis, 2026–present`.

## Build

Run `python3 build_book.py` (stdlib-only) or, from the catalogue root,
`python3 catalog.py build` (builds the book as part of the site and runs the orphan-reachability gate
over the book pages too). Never hand-edit the `.html`.

The book's appendix references catalogue-root figures. Run `catalog.py build` (regenerates
`catalogue-views.html`) before or alongside `build_book.py`, and commit both, so any deployed
cross-references resolve.

Native section excerpts use separate assembly directories under `latex/build/`, so
an excerpt cannot overwrite the full manuscript's generated chapters. Build the
full PDF first: references to figures outside an excerpt are resolved to their
verified full-book number from that build's auxiliary file; references inside the
excerpt remain live LaTeX references. Missing external identities fail the build.
