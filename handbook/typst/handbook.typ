// handbook.typ — the Handbook's print template.
//
// Controls page geometry, type, heading hierarchy, chapter openings, running headers, page numbers,
// the table of contents, caption treatment, code, and references. The manuscript controls none of
// these; it names meaning, and this template decides the print form. Invoked from the generated
// book.typ as `#show: handbook.with(title: ..., ...)`.

#import "typography.typ": palette, font-body, font-display, font-mono
#import "components.typ": hb-callout, hb-figure, hb-read-further, hb-frontmatter
#import "cover.typ": hb-cover

// Back matter (Conclusion, etc.). Chapters carry a numbered "CHAPTER N" eyebrow over their opening;
// back matter is unnumbered closing material, so build.py emits #hb-begin-backmatter() before the
// first back-matter section (every book.yaml chapter whose `kind:` is not `chapter`) and the level-1
// heading rule drops the eyebrow from that point on. The heading itself is unchanged — back matter
// still opens on a fresh page and still appears in the table of contents.
#let hb-backmatter-mode = state("hb-backmatter-mode", false)
#let hb-begin-backmatter() = hb-backmatter-mode.update(true)

// Chapter numbering. Every level-1 heading that is a real chapter (not front matter, not back
// matter) steps this counter as part of its opening, so "Chapter N" is derived, never hand-numbered
// — reordering book.yaml renumbers the book. The Contents reads the counter back at each chapter's
// location; the step happens inside the heading's own realization (so at-location sees the
// pre-step value — the outline compensates with +1).
#let hb-chapter = counter("hb-chapter")

// Plain-text projection of simple (text + space) content — enough for a heading body. Used by the
// coda heading rule to split the "Coda: " prefix off the section title.
#let hb-plain-text(c) = {
  if type(c) == str { c }
  else if c.has("text") { c.text }
  else if c.has("children") { c.children.map(hb-plain-text).join("") }
  else if c.has("body") { hb-plain-text(c.body) }
  else if c == [ ] { " " }
  else { "" }
}

// Shared page geometry — one dict, spread into `set page(..hb-page-setup)` by both the full book
// and the standalone per-chapter excerpt (handbook-excerpt below), so the two print forms cannot
// drift on paper, margins, or numbering.
#let hb-page-setup = (
  paper: "us-letter",
  margin: (top: 1.05in, bottom: 1.05in, inside: 1.3in, outside: 1.1in),
  fill: palette.paper,
  numbering: "1",
  number-align: center,
  footer-descent: 0.5em,
)

// Shared type + component styles: body face, headings (chapter opening with the CHAPTER eyebrow,
// coda split, section faces), code, and figure captions. Applied via `show: hb-styles` by both the
// full template and the excerpt template — the chapter content renders identically in either.
#let hb-styles(body) = {
  set text(font: font-body, size: 11pt, fill: palette.ink, lang: "en")
  set par(justify: true, leading: 0.72em, first-line-indent: 1.2em, spacing: 0.72em)
  show link: set text(fill: palette.accent)

  // Headings: level 1 opens a chapter; level 2/3 are sections within it.
  show heading: set text(font: font-display)
  show heading.where(level: 1): it => {
    // Front-matter titles (<hb-fore>) are outlined for the Contents but drawn separately on the
    // page by hb-frontmatter, so render the heading element itself invisibly — the outline still
    // collects it; nothing prints here.
    if it.has("label") and it.label == <hb-fore> {
      none
    } else {
      pagebreak(weak: true)
      block(above: 0pt, below: 1.1em)[
        #set par(first-line-indent: 0em)
        #context if not hb-backmatter-mode.get() {
          hb-chapter.step()
          context text(size: 9pt, tracking: 0.22em, fill: palette.accent, weight: 700)[CHAPTER #hb-chapter.display()]
          v(0.3em, weak: true)
        }
        #text(size: 26pt, weight: 700, fill: palette.ink)[#it.body]
        #v(0.2em, weak: true)
        #line(length: 100%, stroke: 0.8pt + palette.rule)
      ]
    }
  }
  show heading.where(level: 2): it => {
    set text(size: 15pt, weight: 700, fill: palette.ink)
    // A coda heading ("Coda: <title>", labeled <hb-coda> by the typst filter) renders its prefix
    // as a letter-spaced small-caps label in the chapter-eyebrow face, with the title beneath it
    // in the ordinary section face. One heading, one outline entry — only the print form splits.
    if it.has("label") and it.label == <hb-coda> {
      let full = hb-plain-text(it.body)
      let cut = full.position(":")
      block(above: 1.6em, below: 0.5em)[
        #set par(first-line-indent: 0em)
        #text(size: 9pt, tracking: 0.22em, fill: palette.accent, weight: 700)[#upper(full.slice(0, cut))]
        #v(0.35em, weak: true)
        #full.slice(cut + 1).trim()
      ]
    } else {
      block(above: 1.3em, below: 0.5em)[#it.body]
    }
  }
  show heading.where(level: 3): it => {
    set text(size: 12pt, weight: 700, fill: palette.muted)
    block(above: 1.0em, below: 0.4em)[#it.body]
  }

  // Tables — booktabs typography, book-wide. The manuscript writes a plain pipe table and pandoc
  // emits a Typst `table`, whose default dress is a full grid: a rule between every column, a box
  // around every cell, tight padding, and cells that inherit the body's justification. That reads
  // as a spreadsheet export rather than as book typography. These four rules re-dress EVERY table
  // in the book at once — no manuscript markup, and no per-table styling, decides a table's form.
  //
  //   * no vertical rules and no per-cell boxes (`stroke: none`);
  //   * three horizontal rules only — a heavy rule above and below the table (drawn as the wrapper
  //     block's own top/bottom edges, because Typst has no "last row" selector) and a light rule
  //     under the header (the `table.hline()` pandoc emits after `table.header`, whose `auto`
  //     stroke the `set table.hline` rule supplies since the table itself strokes nothing);
  //   * generous cell padding, so prose-heavy rows breathe;
  //   * left-aligned, ragged-right cells at a size below the body face — a narrow prose column set
  //     justified stretches its words into rivers.
  set table(stroke: none, inset: (x: 0.8em, y: 0.62em))
  set table.hline(stroke: 0.5pt + palette.muted)
  show table.cell.where(y: 0): set text(font: font-display, weight: 700, size: 9.5pt)
  show table: it => block(
    width: 100%,
    above: 1.0em, below: 0.3em,
    stroke: (top: 0.9pt + palette.ink, bottom: 0.9pt + palette.ink),
    {
      set align(left + top)
      set par(justify: false, first-line-indent: 0em, leading: 0.62em)
      set text(size: 10pt)
      it
    },
  )

  // Code.
  show raw.where(block: true): it => block(
    width: 100%, fill: palette.code-bg, inset: 9pt, radius: 3pt,
    text(font: font-mono, size: 9.5pt)[#it],
  )
  show raw.where(block: false): it => box(
    fill: palette.code-bg, inset: (x: 3pt, y: 0pt), outset: (y: 2pt), radius: 2pt,
    text(font: font-mono, size: 9.5pt)[#it],
  )

  // Figure captions. An unnumbered figure (hb-figure numbered: false => numbering: none) gets the
  // same muted caption line with no "Figure N." supplement prefix.
  show figure.caption: it => block(width: 90%)[
    #text(size: 9.5pt, fill: palette.muted)[
      #if it.numbering == none [#it.body] else [
        #text(weight: 700, fill: palette.accent)[#it.supplement #context it.counter.display(it.numbering).] #it.body
      ]
    ]
  ]

  body
}

#let handbook(
  title: "",
  subtitle: "",
  author: "",
  edition: "1",
  year: "",
  copyright-years: "",
  first-published: "",
  frontmatter: none,
  body,
) = {
  set document(title: title, author: author)
  set page(..hb-page-setup)
  show: hb-styles

  // Running header: the book title, with a hairline rule.
  set page(header: context {
    let n = counter(page).get().first()
    if n > 1 {
      set text(font: font-display, size: 8.5pt, fill: palette.muted, tracking: 0.04em)
      grid(columns: (1fr, auto), align: (left, right),
        upper(title), upper(subtitle))
      v(-0.4em)
      line(length: 100%, stroke: 0.5pt + palette.rule)
    }
  })

  // ── Front cover (page 1: full-bleed, un-numbered, not in the contents) ───
  // A layered page: cream ground → claymation workshop artwork → native typography. See cover.typ.
  // The edition line lives on the imprint page, not the cover (no cover furniture).
  hb-cover(title: title, subtitle: subtitle, author: author)

  // ── Copyright / imprint page (page 2: margined, un-numbered, not in the contents) ──
  // Mirrors the MAGE book's imprint page exactly: the © line (author, copyright years) on the page
  // ground, then the edition line in the "first published … · last modified …" style. The
  // last-modified date is injected at compile time via `--input last_modified=…` (the book's last
  // content commit) and falls back to the first-published date when the emitter runs standalone —
  // the same derivation the MAGE imprint page uses. The cover is the ONLY title lockup; there is no
  // separate interior title page.
  page(numbering: none, header: none, footer: none)[
    #let last_modified = sys.inputs.at("last_modified", default: first-published)
    #v(0.4in)
    #set par(justify: false, leading: 0.6em, first-line-indent: 0em)
    #text(size: 11pt, fill: palette.ink)[© #author, #copyright-years]
    #v(0.35em)
    #text(size: 9.5pt, fill: palette.muted)[Edition #edition — first published #first-published · last modified #last_modified]
    #v(0.55em)
    // Funding acknowledgment — mirrors the MAGE book's copyright-page NSF statement (grant list kept
    // identical across book/frontmatter/0.0-acknowledgments.md, the site footer in catalog.py, and here).
    #text(size: 9pt, fill: palette.muted)[This work was supported by the U.S. National Science Foundation under grants \#2541917, \#2452533, and \#2343596.]
  ]

  // ── Front matter (roman-numbered, before the contents) ────────────────────
  // Conventional book order: cover → imprint → Preface → Table of Contents → chapters. Front matter is
  // unnumbered and never enters the outline (it is drawn with hb-frontmatter, not a `heading`), so
  // the contents list stays chapters-only.
  set page(numbering: "i", header: none)
  counter(page).update(1)
  if frontmatter != none {
    frontmatter
    pagebreak()
  }

  // ── Table of contents ───────────────────────────────────────────────────
  block[
    #text(font: font-display, size: 18pt, weight: 700)[Contents]
    #v(0.6em)
  ]
  // Two tiers: front matter (Preface, Introduction) is a flush-left bold unnumbered entry; a
  // chapter is a bold numbered entry; a chapter section is indented deeper. Front matter is
  // detected by the label its hidden heading carries; back matter (the Conclusion) by the
  // back-matter state at its location — both stay unnumbered.
  show outline.entry: it => {
    let el = it.element
    let lbl = if el.func() == heading and el.has("label") { el.label } else { none }
    if lbl == <hb-fore> {
      v(0.5em, weak: true); strong(it)
    } else if it.level == 1 {
      v(0.35em, weak: true)
      box(inset: (left: 1.1em), strong(context {
        // hb-chapter steps inside the chapter heading's own realization, so the value AT the
        // heading's location is the previous chapter's — +1 recovers this chapter's number. The
        // prefix joins it.inner() inside one link so the row stays a single line (displaying the
        // entry element itself would open a fresh paragraph under the number).
        let pre = if not hb-backmatter-mode.at(el.location()) {
          [#(hb-chapter.at(el.location()).first() + 1).#h(0.55em)]
        } else { [] }
        link(el.location(), pre + it.inner())
      }))
    } else {
      box(inset: (left: 2.4em), it)
    }
  }
  outline(title: none, depth: 2)
  pagebreak()

  // ── Body ─────────────────────────────────────────────────────────────────
  set page(numbering: "1")
  counter(page).update(1)
  body
}

// Standalone per-unit excerpt (the per-chapter PDFs build.py emits into dist/chapters/). Same page
// geometry and type/component styles as the full book via hb-page-setup + hb-styles; instead of the
// cover / imprint / Contents, it opens with a LIGHT title page — the unit's own title, the book
// lockup, and an `excerpt-line` ("Chapter N of the full book") — so a loose chapter PDF names its
// book. `chapter-no` seats the chapter counter so the unit's "CHAPTER N" eyebrow shows the number
// it carries in the full book (0 = front/back matter: hb-frontmatter draws no eyebrow, and the
// generated back-matter content flips hb-begin-backmatter() itself).
#let handbook-excerpt(
  title: "",
  book-title: "",
  subtitle: "",
  author: "",
  edition: "1",
  year: "",
  excerpt-line: "",
  chapter-no: 0,
  fig-offset: 0,
  tbl-offset: 0,
  body,
) = {
  set document(title: title + " — " + book-title, author: author)
  set page(..hb-page-setup)
  show: hb-styles

  // Light title page (un-numbered, not counted): identification, not a cover — no artwork.
  page(numbering: none, header: none, footer: none)[
    #v(2.4in)
    #set par(justify: false, first-line-indent: 0em)
    #text(font: font-display, size: 30pt, weight: 700, fill: palette.ink)[#title]
    #v(0.35em)
    #line(length: 35%, stroke: 1pt + palette.accent)
    #v(1.0em)
    #text(font: font-display, size: 14pt, weight: 700, fill: palette.ink)[#book-title]
    #v(0.15em)
    #text(size: 11pt, fill: palette.muted, style: "italic")[#subtitle]
    #v(1.1em)
    #text(size: 11pt, fill: palette.ink)[#author]
    #v(0.3em)
    #text(size: 9.5pt, fill: palette.muted)[#excerpt-line · Edition #edition · #year]
  ]

  // Content pages number from 1, mirroring the full book's body (which also runs header-free).
  counter(page).update(1)
  if chapter-no > 0 { hb-chapter.update(chapter-no - 1) }
  // Seed the float counters with the count of every numbered float BEFORE this unit in the full
  // book, so "Figure N" / "Table N" match the full PDF and the web edition (which seeds the same
  // offsets through pandoc metadata).
  counter(figure.where(kind: image)).update(fig-offset)
  counter(figure.where(kind: table)).update(tbl-offset)
  body
}
