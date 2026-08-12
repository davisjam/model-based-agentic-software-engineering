# The book IR — design and migration plan

## Why

`build_book.py` parses the book **several times over** — float numbering, concept-tag harvest,
glossary, the notation-leak gate, and every structural check in `tests/book.py` — each pass with its own
regexes, each able to drift from the others. That is the classic pre-IR smell: **N walkers, each
re-deriving structure.** `book/book_ir.py` is the one structured model those walks share. The book is ~50K
words; the whole IR fits in memory on a bare CI runner.

The move is the book's own thesis turned inward: a **canonical walker over a structured model** instead of
scattered bespoke parses.

## Foundation — a directive registry on our *own* stdlib parser

The genre-correct engine for pluggable markdown is a token-stream parser + a standard directive syntax
(`markdown-it-py` / MyST `:::name` blocks, `{role}` inlines). We do **not** adopt it, for two reasons:

1. **Clone-and-run is load-bearing.** `catalog.py` is stdlib-only so `python3 catalog.py` builds the book
   on a bare runner with nothing installed. A third-party engine means *vendoring* a markdown engine — a
   posture change, not `pip install`.
2. **Our HTML-comment notation degrades gracefully.** `<!-- figure: … -->` is invisible in a plain MD
   viewer (GitHub renders the source cleanly); `:::figure` renders as literal junk.

So we adopt the **schema** of a pluggable engine — a registry of `directive name → typed node` — while
keeping our own runtime and notation. This is the "adopt the schema, skip the runtime" move. Adding
notation is **one registry row** (`_DIRECTIVES` / `_EMITS` / `_ARMS` in `book_ir.py`, plus the render-side
twin `MARKER_KEYWORDS` in `build_book.py` that the notation-leak gate reads).

It is on the path to a real engine, not off it — see "If clone-and-run is ever relaxed" below.

## The model (`book/book_ir.py`)

```
Document
 └─ Chapter(slug, part, title, blocks[])
     └─ Block(kind, raw, index, label?, caption?, heading_level, directive?, refs[])
         refs: Ref(key, chapter_slug, block_index)
```

`BlockKind` ∈ {heading, para, list, ordered-list, table, figure, mermaid, code, code-inset, blockquote, eq,
directive, other}. The three **float** kinds (`figure`, `table`, `mermaid`) are what the build numbers
"Figure N." / "Table N." and what an author cross-references.

**Tokenizer SSOT.** Block splitting, chapter discovery, and the marker regexes are imported from
`build_book` — there is exactly ONE tokenizer; the IR is a typed layer over it, never a copy. This is
what makes the IR safe (no second-parser drift, the failure mode that sinks a "read-only analysis parser").

**A-ready rule (do not break).** Every `Block` carries its **raw source slice**, and the block taxonomy
mirrors the renderer's own block handling 1:1. So the IR is never lossy, and the renderer can later emit
*from* it without re-adding detail.

## What it enables (walks, not regexes)

- **`book-float-ref`** (live, `tests/book.py` rule 12) — every float is introduced by a `[ref:]` before it;
  dangling `[ref:]` is a finding. *First consumer of the IR.*
- Float-without-caption, heading-order, mid-block-marker placement, the terseness "float-without-cue"
  heuristic, the cross-reference graph, concept-tag coverage, asset existence — each becomes a short walk.

## Migration to A (renderer emits from the IR)

C (this doc) is a deliberate, low-risk **on-ramp** to A, not a detour. Three behavior-preserving moves:

1. **C (done):** shared tokenizer; typed read-only IR; lints walk it; the renderer still emits HTML from
   the shared token stream.
2. **Enrich + single classifier (done):** the renderer's block dispatch is single-sourced through the IR.
   `book_ir.classify_render_block(block)` mirrors `md_to_html`'s exact block-loop order and tests
   (space-delimited heading, all-lines-`>` blockquote, `_is_pipe_table`); the renderer calls it instead of
   re-testing string prefixes inline. Each content kind renders through an extracted `_render_*` primitive
   (heading / para / list / ordered-list / code / code-inset / mermaid-figure / blockquote / table). And
   `Block.render_html()` renders the **render-complete** kinds — heading, para, list, ordered-list, code,
   code-inset, blockquote — from the node's raw slice alone (delegating to the same primitives), proving the
   IR node holds enough to produce its HTML. A BLOCKING gate pins it (`check_ir_render_fidelity`): every
   render-complete block's `render_html()` equals `md_to_html` of its raw slice (all 900 in the book, 0
   mismatches).
3. **A (remaining — the marker-arming layer):** the renderer still runs its OWN block segmentation
   (`_split_blocks`) and leading-marker peel, so the marker-*arming* walk (pending label / table-caption /
   index-anchor, gloss-sidenote emission, the mermaid caption-fold) is not yet unified with the IR's parse.
   The next pass drives `md_to_html`'s loop off IR block objects and threads the arming state onto them,
   then deletes the renderer's private segmentation. The stateful kinds `render_html()` refuses today
   (MERMAID caption-fold, FIGURE / EQ / TABLE / DIRECTIVE arming markers) are exactly what that pass must
   carry.

**Safety net (in force):** the built HTML is deterministic, so the golden-snapshot check — `catalog.py
build` then an empty `git diff` on `book/*.html` + `book/_print/print.html` — makes each step a
refactor-with-a-net, and the new `check_ir_render_fidelity` gate pins render-completeness. The two rules
that keep C→A clean hold: **one shared tokenizer** (no drift) and **raw slice on every node** (never lossy).

### IR-shape learnings (from the flip)

- **The taxonomy was NOT 1:1 as the design assumed — two gaps, both closed.** An ordered list (`N. `) was
  silently classified PARA by `_classify_prose` (the renderer rendered `<ol>` but the IR saw a paragraph);
  added a distinct `ORDERED_LIST` kind. And a standalone HTML-comment TODO is prose-shaped (classifies
  PARA) but the renderer emits it RAW, not wrapped in `<p>` — `render_html` mirrors the renderer's
  lone-comment passthrough so the two agree.
- **Classification vs. `_classify_prose`.** `classify_render_block` deliberately does NOT reuse
  `_classify_prose`'s looser shape tests (any-`#`, first-line-`>`). It replicates the renderer's precise
  branch order and tests, because that — not the looser shape — is what byte-identity requires.
- **The SSOT import cycle is real.** `book_ir` imports `build_book` for the tokenizer, so
  `build_book` reaches `book_ir` through a lazy `_book_ir()` accessor, never a module-load import.

## PDF generation — output via Typst (production)

The PDF is rendered **print-native via Typst** — the production path. `book/build_book.py --pdf`
projects the typed IR to a Typst document (`book/book_typst.py`), then `typst compile` lays it out to
`book/mage-book.pdf`. HTML (the web book) and Typst (the PDF) are two projections of the one IR, neither
derived from the other — the "one model, many projections" the book preaches (Part 3,
framework-as-projection). This retired the earlier HTML → Paged.js (headless browser) → PDF path, which
inherited browser artifacts, bloat, and a headless-browser dependency: the Paged.js print stylesheet, the
combined-print-HTML assembler, and the Node PDF renderer are gone.

**Emit + gate.** `emit_document(slugs, with_frontmatter=True)` leads with a title-page cover and precedes
each numbered Part and each appendix Part with a divider page — the same structure the web book carries.
The whole-book render then runs the content-integrity gate (`verify_pdf`): page floor/ceiling, every chapter
and part title present (matched on a backtick/typographic-quote-normalized form, since the print renderer
drops code-span backticks and smart-quotes an apostrophe), a distinctive tail from the last section, the
no-raw-mermaid assert, words-per-page density, and a struct-tree (a11y tag) assertion. Any miss fails the
build. There is no post-compression pass — Typst output is already compact (~5 MB whole book).

**A note on mermaid.** Mermaid SVGs must carry `<text>` labels, not `<foreignObject>` — Typst cannot draw
foreign objects, so an `htmlLabels:true` diagram would render empty node boxes with no label text. The
mermaid config forces `htmlLabels:false`; the build-time SVG cache re-renders on that config change.

**Clone-and-run.** The web build + `validate` stay stdlib (clone-and-run). The `typst` binary is a
CI/local-render tool for the PDF only — the Pages workflow installs a pinned Typst release, exactly as it
installs poppler for the integrity gate. It is not in the clone-and-run core.

**Why Typst.** Modern typesetting, one small fast binary (whole book in ~2 s), clean small tagged PDFs,
native SVG/image, scriptable. And it maps our model annotations to **native** constructs:
`<!-- label: k -->` + `[ref:k]` → Typst `<k>` labels + `@k` refs; `<!-- figure: … -->` → `#figure`;
`<!-- point: … -->` / `<!-- index-def: … -->` → `#metadata(…)` + `query()` (Typst's purpose-built mechanism
for embedded, tool-queryable data). So the Typst emitter doubles as an **annotation-feasibility study**:
mapping every directive to a Typst native proves whether Typst could carry the whole model.

**The path — each step deliberate, none foreclosed:** C → A → **Typst PDF output (landed — the production
PDF path)** → *(optional, later)* Typst as the SOURCE format. The last step is attractive — a real parser +
native labels/refs + `#metadata`/`query` would retire most of our bespoke stack (the hand-rolled parser, the
notation-leak gate, marker-peeling) — but it is gated on three things we deliberately hold today:
**clone-and-run** (the `typst` binary would move from a PDF-render tool into the CORE build),
**Typst's HTML export maturing** (the Pages site is the PRIMARY deliverable), and **GitHub
source-degradation** (markdown renders in the repo browser; Typst does not). A bigger, later bet — but the
IR→Typst emitter that now renders the PDF *is* the migration tool if it ever pays. The output emitter is
built; keep the source question open.

## If clone-and-run is ever relaxed

A real engine's token stream is *also* just typed nodes, so "vendor the engine, turn each `_DIRECTIVES` row
into a plugin, map its tokens onto `Block`" is a clean **further** step: C → A → real engine. Two candidates:
`markdown-it-py` (parsing only), or — more compelling — **Typst** (see "PDF generation" above), which
subsumes the PDF *and* the annotation questions in one move: a real parser, native labels/refs,
`#metadata`/`query` for model annotations, and native PDF, retiring most of the bespoke stack. The cost to
weigh at that point: a vendored/binary engine + deps, a full render-pass rewrite (mermaid→SVG, `{{token}}`,
anchors, the float/gloss passes all become plugins), and — for Typst — the loss of graceful degradation in a
plain MD/GitHub viewer plus dependence on Typst's HTML export for the Pages site.

## Adding a directive (today, Foundation 1)

1. Add the render behavior in `build_book.py` (`_consume_leading_marker` / the block loop) and the
   keyword to `MARKER_KEYWORDS` (the notation-leak gate reads it).
2. Add the classification to `book_ir.py` (`_ARMS` / `_EMITS`, or a `DIRECTIVE` fall-through).
3. Document it in `AGENTS.md` §3 and, if it carries a rule, add a `tests/book.py` walk over the IR.
