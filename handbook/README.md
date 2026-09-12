# The Software Engineering Handbook — build system

*A Judgment and Decision-Making Approach.* James C. Davis.

This is a **vertical-slice prototype**. It proves that one semantically rich manuscript can drive
two high-quality outputs — a typeset PDF and a responsive web edition — without either output format
contaminating the source. One chapter (Architecture) is implemented end to end; the schema is kept
small on purpose so it can change after seeing the first chapter render.

The Handbook is a **separate book** from the MAGE book in this repository. It reuses that book's
visual language (the Umber-Monograph palette and the Source Serif 4 / Source Sans 3 / IBM Plex Mono
faces) and its GitHub Pages hosting, but it has its own source tree, its own build pipeline, and its
own Typst template. It does **not** touch `catalog.py`, the catalogue's pre-commit hook, or the
catalogue's CI.

## Architecture: one source, two renderers

There is exactly one editable manuscript — semantic Markdown under `chapters/`. Everything else is a
generated artifact.

```
                       chapters/*.md            ← the one canonical manuscript
                            │
                            ▼
                    Pandoc  (markdown)
                            │
                            ▼
                     Pandoc JSON AST            ← the typed intermediate representation
                            │
              ┌─────────────┴──────────────┐
   crossrefs.lua → citeproc → figures.lua → handbook-components.lua
              │                            │
       (FORMAT == typst)            (FORMAT == gfm)
              │                            │
        typst.lua                      web.lua
              ▼                            ▼
   generated/typst/*.typ         generated/web/*.md
              │                            │
     typst compile                mkdocs build
      + typst/*.typ               + web/mkdocs.yml
              ▼                            ▼
  dist/software-engineering       dist/site/  (HTML)
        -handbook.pdf
```

- **The Pandoc AST is the typed intermediate representation.** Authors never edit it; the linter and
  the renderers read it. The Lua filters branch on Pandoc's `FORMAT` global, so one filter set serves
  both targets.
- **Numbering belongs to the renderer, never to the prose.** Figures carry stable IDs; a
  cross-reference is written `@fig-x` / `@sec-x`. Typst numbers figures natively for the PDF; the web
  filter computes "Figure N" and links to the ID. Section references render by section title in both
  outputs. The book tolerates reordering without renumbering prose.
- **Generated Typst and Markdown are kept on disk** (`generated/`) for inspection — you can read
  exactly what each renderer received — but they are gitignored and never hand-edited, as is
  `dist/`. This mirrors how the MAGE book gitignores its rendered PDF.

## Supported semantic constructs

The manuscript names **meaning**, not presentation. The vocabulary is deliberately small; add a
construct only when its type carries distinct rendering, cross-referencing, validation, or
navigation value.

| Construct | Authoring form | PDF | Web |
|---|---|---|---|
| `definition` | `::: {.definition #id title="…"}` | ruled, titled callout | admonition |
| `decision` | `::: {.decision #id title="…"}` | ruled, titled callout (umber) | admonition |
| `tradeoff` | `::: {.tradeoff #id title="…"}` | ruled, titled callout (violet) | admonition |
| `example`, `case-study`, `key-idea`, `note`, `warning`, `exercise`, `code-example`, `quotation` | `::: {.<kind> #id title="…"}` | ruled callout | admonition |
| `read_further` | `::: read_further` + 2–4 entry paragraphs | quiet box labelled "READ FURTHER", hanging-indent entries | quiet admonition |
| `figure` | `::: {.figure #fig-… alt="…"}` + image + caption paragraph | `#figure(...)`, numbered, tagged-PDF `alt` | semantic `<figure>`/`<figcaption>` |
| citation | `[@key]` (Pandoc + CSL) | Chicago author-date | Chicago author-date |
| cross-reference | `@fig-…`, `@sec-…` | native Typst ref / titled link | "Figure N" link / titled link |
| escape hatch | `::: {.raw-typst}` / `::: {.raw-html}` | passed to PDF only | passed to web only |

Chapter metadata (YAML front matter, validated): `id`, `title`, `short_title`, `order`,
`status` (`outline`/`draft`/`review`/`stable`), `description`. Global metadata lives in
`book.yaml`.

Figures keep alt text and caption structurally distinct: `alt` is the accessibility text (set on the
`<img>` and on the Typst `image(alt: …)` for tagged-PDF output), the caption paragraph is the visible
label.

### Chapter-ending convention

Every substantive chapter ends the same way, so the structure is checkable rather than stylistic:

1. **`## Summary`** — an ordinary H2 section in the author's voice. It is prose, *not* a colored box,
   and it appears in the table of contents exactly as any other H2 does.
2. **A single `read_further` box** — the curated reader-facing end matter, rendered immediately after
   the Summary. It holds 2–4 entries, each a normal bibliographic citation plus one short sentence on
   why it is worth reading. Chicago style: books and reports in italics, articles in quotes, venue in
   italics — matching the rest of the manuscript. The web edition links a title or DOI when a canonical
   destination exists; the PDF typesets the title rather than a raw URL. There are no numbered `[1]`
   citations; the box is deliberately quiet.

Authoring form:

```
## Summary

…one or two paragraphs of ordinary prose…

::: read_further
Bass, Clements & Kazman, *Software Architecture in Practice*. The standard treatment of how
quality attributes drive structural decisions.

Fairbanks, *Just Enough Software Architecture*. A risk-driven method for spending modeling
effort only where uncertainty could change a decision.
:::
```

**Citation policy.** Inline `@`-citations stay — they render as Chicago author-date, backed by
`bibliography/references.bib`. A chapter never dumps a per-chapter "References"/"Bibliography" section
at its end; the READ FURTHER box is the curated end matter, not the citation-metadata store. (A
book-level bibliography, if wanted later, is a separate build-time assembly, not a per-chapter one.)

Front matter, interludes, and appendices are **exempt** from this convention — flag them with a
chapter-metadata `kind:` other than `chapter` (e.g. `kind: front-matter`), or simply keep them out of
`book.yaml`'s `chapters:` list. The drift lint below enforces the convention on everything else.

## Validation

`scripts/lint.py` reads each chapter's AST and fails (exit 1) on any of: missing/invalid chapter
metadata, invalid chapter ordering, unknown or malformed semantic blocks, figures without alt text or
caption, duplicate IDs, unresolved cross-references, citation keys absent from the bibliography,
broken image paths, hard-coded figure/table/section/chapter numbers in prose, raw HTML/Typst used for
presentation outside a marked escape hatch, and malformed heading hierarchy. The build runs the
linter first and aborts on any error — it never degrades silently.

It also runs the **chapter-ending drift check** described above: every non-exempt chapter must end
with a `## Summary` (H2) whose prose is immediately followed by exactly one `read_further` block, and
must carry no bare `References`/`Bibliography` heading. This check is currently **AUDIT-ONLY** — it
reports non-compliant chapters to stderr but does not fail `make lint`, so chapters can adopt the
convention incrementally. A later step promotes it to a hard error once every chapter complies.

## Build commands

```
make lint      # validate manuscript semantics (no rendering)
make book      # → dist/software-engineering-handbook.pdf
make web       # → dist/site/ (MkDocs)
make all       # lint + book + web
make serve      # build the web edition and serve it locally
make clean      # remove all generated artifacts
```

Equivalent scripts: `python3 scripts/lint.py`, `python3 scripts/build.py {pdf|web|all}`.

### Local preview of BOTH books, under their published subfolders

The deployed Pages site publishes each book under its own named subfolder — the MAGE book PDF at
`/mage-book/mage-book.pdf` and this handbook at `/se-handbook/software-engineering-handbook.pdf`. To
mirror that layout locally (render both books and see each where the site serves it), run the
repo-root script:

```
python3 scripts/render-books-local.py     # from the catalogue repo root
```

It renders the MAGE book via `book/build_book.py --pdf` and this handbook via `make -C handbook book`,
then copies each PDF into a gitignored preview tree:

```
_local-books/mage-book/mage-book.pdf
_local-books/se-handbook/software-engineering-handbook.pdf
```

The script is stdlib-only and shells out to each book's own toolchain — it does not import the
handbook or catalogue build machinery. It needs this handbook's toolchain (Pandoc + Typst + PyYAML,
above) plus the MAGE book's `--pdf` deps on PATH.

## Reproducibility — pinned toolchain

The build is developed and verified against these exact versions:

| Tool | Version | Notes |
|---|---|---|
| Pandoc | **3.9.0.2** (`+lua`, Lua 5.4) | reader + AST + Lua filters + citeproc |
| Typst | **0.15.1** | PDF renderer |
| MkDocs | **1.6.1** | web framework — the interpreter at `../site/.venv` |
| Material for MkDocs | **9.7.7** | web theme |
| PyMdown Extensions | **11.0.2** | admonitions / superfences |
| Python | 3.x with **PyYAML 6** | build/lint scripts (`book.yaml`) |

The MkDocs toolchain is the project's shared virtualenv at `../site/.venv`; `make web` and `make
serve` invoke it directly. Fonts are the self-hosted faces under `../book/fonts` (passed to Typst via
`--font-path`). Citation keys are shared with the MAGE book's bibliography; the needed entries are
copied into `bibliography/references.bib`, formatted through `bibliography/chicago-author-date.csl`.

## Layout

```
handbook/
  book.yaml                 global metadata + chapter order (single source of truth)
  chapters/                 the canonical manuscript (semantic Markdown)
  figures/                  figure assets (SVG)
  bibliography/             references.bib + chicago-author-date.csl
  filters/                  Pandoc Lua filters (crossrefs, figures, handbook-components, typst, web)
  typst/                    the Handbook's own Typst template (handbook, components, typography)
  web/                      mkdocs.yml + css (web presentation)
  scripts/                  build.py + lint.py (+ _common.py)
  generated/                inspectable renderer inputs — gitignored
  dist/                     the PDF + the site — gitignored
```

## What to revisit after this first render

- **Figure numbering scheme.** The web edition numbers figures "Figure N" per chapter; Typst uses its
  own native counter. A book usually wants "Figure 5.1". Decide the chapter-prefixed scheme once and
  make both renderers agree.
- **Section cross-references render by title.** That reads well and never hard-codes a number, but a
  print edition may want "see §5.3". Enabling Typst heading numbering plus a matching web scheme is a
  later call.
- **`use_directory_urls: false`.** Chosen so raw-HTML `<figure>` image paths resolve without per-page
  depth math. Revisit if the web edition is deployed under a subpath — either switch figures to a
  MkDocs-rewritten Markdown image (via `md_in_html`) or compute the base path.
- **No per-chapter reference dump.** Inline `@`-cites resolve to Chicago author-date, but citeproc's
  per-chapter reference list is suppressed; the curated READ FURTHER box is the end matter. A single
  book-level bibliography, if wanted later, is a book-assembly change in `build.py`, not a schema change.

Follow-up phases (do not fold into this slice): migrate remaining chapters into semantic Markdown
(minimal editorial change), add semantic annotations, refine typography and web presentation, then
wire linting into CI.
