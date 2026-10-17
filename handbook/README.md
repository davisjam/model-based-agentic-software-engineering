# The Software Engineering Handbook

*A Judgment and Decision-Making Approach.* James C. Davis.

The editable manuscript is LaTeX: `chapters/*.tex` and `frontmatter/*.tex`.
Adjacent `.yaml` files hold editorial metadata. The Handbook and MAGE Book share
`../latex/house.sty`; the Handbook retains its Source Serif typography, umber
palette, cover artwork, and semantic callouts.

## One manuscript, three editions

Pandoc reads the native LaTeX into its semantic document tree. The print builder
assembles a LuaLaTeX document using the shared house style. Existing semantic
filters produce the responsive MkDocs web edition and reflowable ePub.

Sibling `.md` files are deterministic compatibility projections consumed by the
catalogue and existing web infrastructure. They are checked in so those consumers
have stable paths, but must not be edited. After changing `.tex` or `.yaml`, run:

```sh
python3 scripts/latex_source.py sync
python3 scripts/latex_source.py sync --check
```

Run these commands from `handbook/`, or prefix their paths with `handbook/` from
the catalogue root. Builds synchronize projections before semantic validation.
Commit source and updated projections together. `--check` detects stale projections
without rewriting them.

The bridge supports the prose, lists, mathematics, tables, links, and semantic
components used in this manuscript. Unsupported raw LaTeX fails explicitly rather
than disappearing from the web edition. Adding a new macro or environment requires
teaching the bridge how to represent its meaning in all editions.

## Authoring conventions

Chapter titles come from the adjacent YAML metadata. Source `\subsection{...}`
represents a chapter's main section (the original document's H2);
`\subsubsection{...}` represents its subsection. The print assembly shifts these
to the appropriate book-level section commands. Preserve stable labels and IDs;
numbering belongs to the renderer, not prose.

Editorial metadata requires `id`, `title`, `short_title`, `order`, `status`
(`outline`, `draft`, `review`, or `stable`), and `description`. Global metadata and
chapter order live in `book.yaml`. Its `.md` paths deliberately name the generated
compatibility projections.

Semantic callouts use a native environment:

```latex
\begin{bookbox}{definition}{Software architecture} % handbook-attrs: ["def-architecture", ["definition"], []]
The definition's prose belongs here.
\end{bookbox}
```

The two native arguments determine the kind and visible title. The JSON comment
preserves the stable identifier, additional classes, and ancillary web attributes;
keep it with the opening environment. Do not duplicate prose or titles in metadata.

Supported kinds include `definition`, `decision`, `tradeoff`, `example`,
`case-study`, `key-idea`, `note`, `warning`, `exercise`, `code-example`, `quotation`,
`mage-moment`, and `read_further`. Figure and table groups also use `bookbox`
wrappers with kind `figure` or `table`; the renderer gives them figure/table
semantics instead of a callout border. Use existing chapters as examples of native
images and longtables inside those wrappers.

Use `\citep{key}` and `\citet{key}` for citations. The one shared bibliography is
`../book/references.bib`; the Handbook's author-date style is
`bibliography/chicago-author-date.csl`. Cross-references retain stable IDs, such as
`\citep{fig-architecture-tradeoff}` and `\citep{sec-architecture}`; the existing
cross-reference filter distinguishes those IDs from bibliographic keys and resolves
them to numbered figures or section titles. Do not type figure or chapter numbers
into prose.

Figures keep accessibility text separate from their visible caption. Store `alt`
in the figure wrapper's ancillary attributes and keep the visible caption as prose
after the image. Table captions appear above their tables; figure captions appear
below. Existing wrap attributes remain available to the web compatibility bridge;
the LaTeX renderer currently lays these figures out in the normal text flow.

Figure labels must remain readable in grayscale at their printed size. SVG text
uses only `#1c1917`, `#57534e`, or `#9a3f12` and must remain at least 6 pt after
scaling. Reserve `#e4e0d8` for decorative rules and fills. Semantic lint checks ink
and effective size, including figures with width metadata.

### Chapter endings

Substantive chapters end with an ordinary `\subsection{Summary}`, followed by one
`read_further` box containing two to four bibliographic entries and a short reason
to read each. Keep inline author-date citations throughout the chapter; do not add
per-chapter References or Bibliography dumps. Front matter, interludes, and
appendices may declare a metadata `kind` other than `chapter` to be exempt.
The chapter-ending drift check remains audit-only while chapters adopt the
convention; all other semantic errors fail the build.

## Building and checking

From `handbook/`:

```sh
make lint      # validate manuscript semantics
make book      # full PDF, individual PDFs, and ePub
make epub      # ePub only
make web       # strict MkDocs build into dist/site/
make all       # lint, PDF/ePub, and web
make serve     # build and serve the web edition locally
make clean     # remove generated renderer inputs and outputs
```

Equivalent scripts are `python3 scripts/lint.py` and
`python3 scripts/build.py {pdf|epub|web|all}`. Source bridge regression tests run with
`python3 -m unittest discover -s scripts -p test_latex_source.py`.

The shared compiler (`../tools/latex_build.py`) reruns LuaLaTeX until references
converge and rejects final errors and warnings. Only underfull horizontal or
vertical boxes are tolerated. Overfull boxes, missing glyphs, unresolved references,
font substitutions, and tagging warnings fail. PDF documents include language,
heading, paragraph, figure, and table tagging. The current TeX Live table-tagging
module requires native table rules, so the print assembly translates Pandoc's
booktabs rules to native rules without changing table contents.

Semantic validation also checks metadata, order, components, figure alt text and
captions, duplicate IDs, unresolved references, citation keys, asset paths, heading
hierarchy, hard-coded numbering, and figure legibility. Generated projections must
stay synchronized for repository hooks and CI.

The toolchain needs Python with PyYAML and the existing site requirements, Pandoc
3, LuaLaTeX with the TeX Live 2025 packages (including latex-lab/tagpdf and
unicode-math), and `rsvg-convert`. Fonts are bundled under `../book/fonts`.
Use the shared `../site/.venv` Python for web builds if MkDocs is not available in
your default Python environment. The established web stack is MkDocs 1.6.1,
Material 9.7.7, and PyMdown Extensions 11.0.2.

To preview both published PDF paths locally, run
`python3 scripts/render-books-local.py` from the catalogue root. It writes
`_local-books/mage-book/mage-book.pdf` and
`_local-books/se-handbook/software-engineering-handbook.pdf`.

## Files and outputs

| Path | Purpose |
|---|---|
| `chapters/`, `frontmatter/` | Authoritative `.tex`, metadata `.yaml`, generated `.md` |
| `book.yaml` | Book metadata and chapter order |
| `figures/`, `assets/` | Figure and cover artwork |
| `scripts/latex_source.py` | Native source reader and projection synchronization |
| `scripts/latex_pdf.py` | Print assembly and fresh cover-only rendering |
| `filters/` | Shared semantic cross-reference, citation, web, and ePub transforms |
| `web/`, `epub/` | Web and ePub presentation |
| `generated/latex/` | Inspectable print drivers, converted images, and compiler logs |
| `generated/web/`, `generated/epub/` | Inspectable web and ePub inputs |
| `dist/` | Full PDF/ePub, individual PDFs, and site |

`generated/` and `dist/` are ignored build artifacts. The old `typst/` templates
and `build_pdf_typst_legacy` function remain only as migration comparison material;
normal builds use LaTeX. Author manuscript changes in the native source, and layout
changes in the shared house style or the appropriate web/ePub presentation files.
