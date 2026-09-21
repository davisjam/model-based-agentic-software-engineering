// cover.typ — the Handbook's front cover: a LAYERED page, not a pasted image.
//
// Three layers. (1) A cream page ground sampled from the artwork's own upper field, so the raster's
// soft top edge dissolves into the page instead of reading as a photo boundary. (2) The claymation
// workshop artwork (assets/cover-artwork.png — the r3 single-scene render, 877x1793, full-width
// bleed with no panel gutter: the engineer in the rust sweater — intentionally distinct from the
// MAGE cover's green figure — measuring "Component A" with calipers beside a row of candidate
// materials). The live asset extends the render's own top cream fade down through the title zone
// (rows ~470-870, easing out just above the components row) so the lockup sits on clean cream at
// the crop below — the render's native fade ends too high for any dy to show both cream and the
// full checklist in the 9.75in window. The untouched render is assets/cover-artwork-source-r3.png.
// (3) Native Typst typography in the cream field at the top. All text is live type; nothing
// textual is rasterized.
//
// SHARED IMAGE-WINDOW TEMPLATE (one template, two illustrations — identical on both covers; the
// MAGE twin lives in book/book_typst.py::_cover_typst): a full-width art window, 8.5in x 9.75in,
// pinned to the page top and CLIPPED; the artwork keeps its natural aspect at page width and
// shifts up inside the window to pick the slice that keeps the key content. Below the window the
// page ground shows as a 1.25in LOWER CREAM BAND — the shared edition band — carrying the
// FIRST EDITION colophon bottom-left (same face vocabulary as the author line but smaller and
// quieter; cover-ink, never the rust accent; identical dx 0.6in / dy -0.42in inset on both
// covers). The internal subjects need not align across covers; the window geometry, band height,
// colophon inset, and type top margin (0.42in) must.
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
// never reproduce or typeset it. No cover furniture beyond the shared FIRST EDITION colophon in
// the lower cream band: no edition NUMBER or year, dates, marks, or taglines.

#import "typography.typ": font-body

// Cover-local palette, sampled from the artwork rather than the interior theme: the page ground
// must match the raster's cream exactly; ink/muted/accent are the pair's shared cover constants.
#let cover-cream = rgb("#FBF7F2") // artwork top-band mean
#let cover-ink = rgb("#1D2733") // deep charcoal-navy (dominant title, author, colophon)
#let cover-muted = rgb("#5B5346") // warm gray-brown (companion caps line)
#let cover-accent = rgb("#9E4A2F") // terracotta (subtitle, author rule)

// Natural-aspect height of the 877x1793 r3 raster at full page width: the art bleeds edge-to-edge
// left AND right (cover/fill crop — never contain/fit, never stretched). Vertical placement inside
// the clipped window: dy -5.83in shows raster rows ~602-1608 (103.18 px/in) — the cream-to-table
// fade for the type, all six candidate components + labels, the Tradeoffs card, the calipers + the
// component under evaluation, both hands, the mug, and the full requirements checklist through
// "Low environ impact"; the trim spends its loss on top cream and the lower sweater/hair, past the
// checklist's last line. Raster still covers the window bottom (row 1608 < 1793), so the page
// ground below the window reads as the exact 1.25in edition band.
#let art-h = 8.5in * 1793 / 877
#let art-dy = -5.83in

#let hb-cover(
  title: "",
  subtitle: "",
  author: "",
  artwork: "/handbook/assets/cover-artwork.png",
) = page(
  paper: "us-letter",
  margin: 0pt,
  numbering: none,
  header: none,
  footer: none,
  // Layer 1: the cream ground (backstop behind the art + the lower edition band; matches the
  // art's own top band).
  fill: cover-cream,
)[
  // Layer 2: the artwork in the SHARED 8.5in x 9.75in clipped window, aspect preserved (never
  // stretched or recolored). Dimensions are EXPLICIT: with only `width` given, Typst caps the auto
  // height at the available region and distorts a panel taller than the page. Below the window the
  // page ground reads as the 1.25in lower cream edition band.
  #place(top + left, box(width: 8.5in, height: 9.75in, clip: true,
    place(top + left, dy: art-dy, image(artwork, width: 8.5in, height: art-h))))

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

  // FIRST EDITION colophon — bottom-left of the lower cream band. Same tracked-caps vocabulary as
  // the author line but smaller and quieter; cover-ink, never the accent. The 8pt/0.22em/dx 0.6in/
  // dy -0.42in values are the SHARED template constants (mirror book/book_typst.py::_cover_typst).
  #place(bottom + left, dx: 0.6in, dy: -0.42in, text(size: 8pt, weight: 500, tracking: 0.22em,
    fill: cover-ink)[FIRST EDITION])
]
