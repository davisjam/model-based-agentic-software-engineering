// cover.typ — the Handbook's front cover: a LAYERED page, not a pasted image.
//
// Three layers. (1) A cream page ground sampled from the artwork's own upper field, so the raster's
// soft top edge dissolves into the page instead of reading as a photo boundary. (2) The claymation
// workshop artwork (assets/cover-artwork.png — the LEFT panel of the three-panel source kept at
// assets/cover-artwork-3panel-source.png: the engineer measuring "Component A" with calipers beside
// a row of candidate materials). The panel is a tall 1:2 portrait, so it spans the full page width
// and is shifted UP: the page trims the panel's expendable upper cream and a sliver of its lower
// edge, keeping the cubes, labels, notebook, calipers, and engineer. (3) Native Typst typography in
// the cream field at the top. All text is live type; nothing textual is rasterized.
//
// MATCHED-PAIR CONTRACT (shared with the MAGE book's cover, `book/book_typst.py::_cover_typst`):
// the two covers set the same typographic system — display serif (Source Serif 4) throughout; one
// DOMINANT bold caps word (here HANDBOOK, there MAGE) with the rest of the title as a tracked-caps
// companion line; an identical author block (short terracotta hairline rule, then the name in
// tracked caps); all text centered in the artwork's top cream field, the soft cream→scene fade left
// to do the compositional work (no panel, box, or gradient behind the type). Change one cover's
// treatment only in step with the other.
//
// The artwork carries small incidental prop text (material labels, the notebook); it is artwork —
// never reproduce or typeset it. No cover furniture: no edition/version, dates, marks, or taglines.

#import "typography.typ": font-body

// Cover-local palette, sampled from the artwork rather than the interior theme: the page ground
// must match the raster's cream exactly; ink/muted/accent are the pair's shared cover constants.
#let cover-cream = rgb("#FBF7F2") // artwork top-band mean
#let cover-ink = rgb("#1D2733") // deep charcoal-navy (dominant title, author)
#let cover-muted = rgb("#5B5346") // warm gray-brown (companion caps line)
#let cover-accent = rgb("#9E4A2F") // terracotta (subtitle, author rule)

// Vertical placement of the 1:2 panel on the 8.5×11 page: at full page width the panel stands 17in
// tall, so 6in must trim. Nearly all of it comes off the panel's expendable top cream (4.65in); the
// remaining 1.35in bleeds off the page bottom, trimming only the lower edge of the engineer's hair
// (seen from above) — every prop stays. The visible cream field above the scene is ~2.3in deep.
#let art-dy = -4.65in

#let hb-cover(
  title: "",
  subtitle: "",
  author: "",
  artwork: "/assets/cover-artwork.png",
) = page(
  paper: "us-letter",
  margin: 0pt,
  numbering: none,
  header: none,
  footer: none,
  // Layer 1: the cream ground (backstop behind the full-bleed art; matches the art's own top band).
  fill: cover-cream,
)[
  // Layer 2: the artwork, full page width, aspect preserved (never stretched or recolored).
  // Dimensions are EXPLICIT (8.5in × 17in = the 1:2 panel at page width): with only `width` given,
  // Typst caps the auto height at the available region and distorts a panel taller than the page.
  #place(top + left, dy: art-dy, image(artwork, width: 8.5in, height: 17in))

  // Layer 3: native typography, centered in the cream field. The lockup: companion caps line →
  // dominant word → subtitle → author block. Live Typst type in the display serif.
  #set text(font: font-body, fill: cover-ink)
  #set par(justify: false, leading: 0.5em, first-line-indent: 0em, spacing: 0.5em)
  // The lockup derives from the manifest title (book.yaml stays SSOT): the LAST word is the
  // dominant display word; the words before it set as the tracked-caps companion line.
  #let words = title.split(" ")
  #place(top + center, dy: 0.42in, block(width: 7.5in)[
    #align(center)[
      #text(size: 15pt, weight: 500, tracking: 0.22em, fill: cover-muted)[#upper(words.slice(0, words.len() - 1).join(" "))]
      #v(0.14in, weak: true)
      #text(size: 56pt, weight: 700, tracking: 0.03em)[#upper(words.last())]
      #v(0.17in, weak: true)
      #text(size: 14.5pt, style: "italic", fill: cover-accent)[
        // Non-breaking hyphen: "Decision-Making" must not split at its hyphen.
        #subtitle.replace("-", "\u{2011}")
      ]
      #v(0.2in, weak: true)
      #line(length: 0.45in, stroke: 1pt + cover-accent)
      #v(0.16in, weak: true)
      #text(size: 11.5pt, weight: 600, tracking: 0.24em)[#upper(author)]
    ]
  ])
]
