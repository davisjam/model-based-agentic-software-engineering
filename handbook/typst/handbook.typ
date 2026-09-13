// handbook.typ — the Handbook's print template.
//
// Controls page geometry, type, heading hierarchy, chapter openings, running headers, page numbers,
// the table of contents, caption treatment, code, and references. The manuscript controls none of
// these; it names meaning, and this template decides the print form. Invoked from the generated
// book.typ as `#show: handbook.with(title: ..., ...)`.

#import "typography.typ": palette, font-body, font-display, font-mono
#import "components.typ": hb-callout, hb-figure, hb-read-further, hb-frontmatter

// Back matter (Conclusion, etc.). Chapters carry a "CHAPTER" eyebrow over their opening; back
// matter is unnumbered closing material, so build.py emits #hb-begin-backmatter() before the first
// back-matter section (every book.yaml chapter whose `kind:` is not `chapter`) and the level-1
// heading rule drops the eyebrow from that point on. The heading itself is unchanged — back matter
// still opens on a fresh page and still appears in the table of contents.
#let hb-backmatter-mode = state("hb-backmatter-mode", false)
#let hb-begin-backmatter() = hb-backmatter-mode.update(true)

#let handbook(
  title: "",
  subtitle: "",
  author: "",
  year: "",
  frontmatter: none,
  body,
) = {
  set document(title: title, author: author)
  set page(
    paper: "us-letter",
    margin: (top: 1.05in, bottom: 1.05in, inside: 1.3in, outside: 1.1in),
    fill: palette.paper,
    numbering: "1",
    number-align: center,
    footer-descent: 0.5em,
  )
  set text(font: font-body, size: 11pt, fill: palette.ink, lang: "en")
  set par(justify: true, leading: 0.72em, first-line-indent: 1.2em, spacing: 0.72em)
  show link: set text(fill: palette.accent)

  // Headings: level 1 opens a chapter; level 2/3 are sections within it.
  show heading: set text(font: font-display)
  show heading.where(level: 1): it => {
    pagebreak(weak: true)
    block(above: 0pt, below: 1.1em)[
      #context if not hb-backmatter-mode.get() {
        text(size: 9pt, tracking: 0.22em, fill: palette.accent, weight: 700)[CHAPTER]
        v(0.3em, weak: true)
      }
      #text(size: 26pt, weight: 700, fill: palette.ink)[#it.body]
      #v(0.2em, weak: true)
      #line(length: 100%, stroke: 0.8pt + palette.rule)
    ]
  }
  show heading.where(level: 2): it => {
    set text(size: 15pt, weight: 700, fill: palette.ink)
    block(above: 1.3em, below: 0.5em)[#it.body]
  }
  show heading.where(level: 3): it => {
    set text(size: 12pt, weight: 700, fill: palette.muted)
    block(above: 1.0em, below: 0.4em)[#it.body]
  }

  // Code.
  show raw.where(block: true): it => block(
    width: 100%, fill: palette.code-bg, inset: 9pt, radius: 3pt,
    text(font: font-mono, size: 9.5pt)[#it],
  )
  show raw.where(block: false): it => box(
    fill: palette.code-bg, inset: (x: 3pt, y: 0pt), outset: (y: 2pt), radius: 2pt,
    text(font: font-mono, size: 9.5pt)[#it],
  )

  // Figure captions.
  show figure.caption: it => block(width: 90%)[
    #text(size: 9.5pt, fill: palette.muted)[
      #text(weight: 700, fill: palette.accent)[#it.supplement #context it.counter.display(it.numbering).] #it.body
    ]
  ]

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

  // ── Title page ──────────────────────────────────────────────────────────
  set page(header: none, footer: none)
  v(2.2in)
  align(center)[
    #text(font: font-display, size: 10pt, tracking: 0.34em, fill: palette.accent, weight: 700)[THE SOFTWARE ENGINEERING HANDBOOK]
    #v(1.0em)
    #text(font: font-display, size: 30pt, weight: 700, fill: palette.ink)[#title]
    #v(0.6em)
    #text(font: font-body, style: "italic", size: 15pt, fill: palette.muted)[#subtitle]
    #v(1.4em)
    #line(length: 24%, stroke: 1pt + palette.accent)
    #v(1.2em)
    #text(font: font-display, size: 12pt, tracking: 0.2em, fill: palette.ink)[#upper(author)]
    #v(0.4em)
    #text(font: font-body, size: 10pt, fill: palette.muted)[Edition 1 · #year]
  ]
  pagebreak()

  // ── Front matter (roman-numbered, before the contents) ────────────────────
  // Conventional book order: title page → Preface → Table of Contents → chapters. Front matter is
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
  show outline.entry.where(level: 1): it => { v(0.4em, weak: true); strong(it) }
  outline(title: none, indent: 1.2em, depth: 2)
  pagebreak()

  // ── Body ─────────────────────────────────────────────────────────────────
  set page(numbering: "1")
  counter(page).update(1)
  body
}
