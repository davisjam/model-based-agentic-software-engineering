// cover.typ — the Handbook's front cover: a LAYERED page, not a pasted image.
//
// Three layers. (1) A cream page ground sampled from the artwork's own upper field, so the raster's
// soft top edge dissolves into the page instead of reading as a photo boundary. (2) The woven-strand
// artwork (assets/cover-artwork.png, committed at full resolution), scaled aspect-preserved to the
// page width and shifted DOWN so the tactile weave enters from the lower right and the upper left
// stays a quiet cream field for the type — the overflow past the page bottom is cropped by the page
// itself. (3) Native Typst typography in the handbook's editorial serif. All text is live type;
// nothing textual is rasterized.
//
// The single teal binary strand inside the physical weave is the cover's metaphor — code as one
// strand of the fabric, not the whole. Do not add further digital decoration (no gradients-as-
// ornament, boxes, shadows, circuitry, terminal motifs).

#import "typography.typ": font-body

// Cover-local palette, sampled from the artwork / mockup rather than the interior theme: the page
// ground must match the raster's cream exactly, and the title ink is the mockup's near-black navy.
#let cover-cream = rgb("#F5F0E7") // artwork top-edge mean
#let cover-cream-l = rgb("#FBF7F0") // artwork top-left corner
#let cover-cream-r = rgb("#ECE6DB") // artwork top-right corner
#let cover-ink = rgb("#1D2733") // deep charcoal-navy (title, author)
#let cover-rust = rgb("#9E4A2F") // terracotta (subtitle, rules)
#let cover-caps = rgb("#8A7E6F") // muted warm gray (thematic caps)

// How far the artwork's top edge sits below the page top. Pushing the raster down is what turns
// "text over a photograph" into a composed cover: the weave enters at mid-page (as in the design
// mockup) and the type owns the cream above. The artwork's own top is soft cream, so the seam
// against the matched page ground is invisible.
#let art-drop = 0.8in

#let hb-cover(
  title: "",
  subtitle: "",
  author: "",
  edition: "",
  year: "",
  artwork: "/assets/cover-artwork.png",
) = page(
  paper: "us-letter",
  margin: 0pt,
  numbering: none,
  header: none,
  footer: none,
  // Layer 1: the cream ground, graded left→right to the artwork's own top-edge tones.
  fill: gradient.linear(cover-cream-l, cover-cream-r, angle: 0deg),
)[
  // Layer 2: the artwork, full page width, aspect preserved (never stretched or recolored).
  #place(top + left, dy: art-drop, image(artwork, width: 100%))
  // Feather the raster's top edge into the page ground: a short cream→transparent fade laid across
  // the seam, so the two cream fields read as one surface.
  #place(top + left, dy: art-drop - 0.05in, rect(
    width: 100%, height: 1.1in,
    fill: gradient.linear(angle: 90deg, cover-cream, cover-cream.transparentize(100%)),
  ))
  // Let the page ground re-emerge under the author block: a soft cream pool over the lower-left
  // weave, matching the depth-of-field falloff the artwork already has at its edges. This is what
  // keeps charcoal type legible there without a box or a panel.
  #place(bottom + left, dx: -2.2in, dy: 2.0in, ellipse(
    width: 8.6in, height: 5.4in,
    fill: gradient.radial(cover-cream.transparentize(6%), cover-cream.transparentize(100%)),
  ))

  // Layer 3: native typography. Everything below is live Typst type in the handbook serif.
  #set text(font: font-body, fill: cover-ink)
  #set par(justify: false, leading: 0.5em, first-line-indent: 0em, spacing: 0.5em)

  // Title lockup, upper-left quiet zone. The leading article sets italic on its own line; the
  // remaining title words stack one per line, large, as in the mockup.
  #place(top + left, dx: 0.85in, dy: 0.5in, block(width: 6.9in)[
    #let words = title.split(" ")
    #if words.len() > 1 and lower(words.first()) == "the" {
      text(size: 38pt, weight: 600, style: "italic")[The]
      v(0.16em, weak: true)
      words = words.slice(1)
    }
    #block[
      #set par(leading: 0.22em)
      #text(size: 63pt, weight: 700, tracking: -0.01em)[
        #words.join(linebreak())
      ]
    ]
    #v(1.3em, weak: true)
    // Non-breaking hyphens: "Decision-Making" must not split at its hyphen when the
    // subtitle wraps — the wrap belongs at the word spaces, as in the mockup.
    #text(size: 24pt, weight: 600, fill: cover-rust)[
      #box(width: 4.2in)[#subtitle.replace("-", "\u{2011}")]
    ]
    #v(1.6em, weak: true)
    #text(size: 12.5pt, tracking: 0.22em, fill: cover-caps)[
      PEOPLE #linebreak()
      IDEAS #linebreak()
      DECISIONS #linebreak()
      SYSTEMS #linebreak()
      THAT LAST
    ]
    #v(1.1em, weak: true)
    #line(length: 0.45in, stroke: 1.2pt + cover-rust)
  ])

  // Author block, lower-left: name, a short rust rule, the edition line — as in the mockup.
  #place(bottom + left, dx: 0.85in, dy: -0.62in, block[
    #text(size: 16pt, weight: 600, tracking: 0.16em)[#upper(author)]
    #v(0.55em, weak: true)
    #line(length: 0.45in, stroke: 1.2pt + cover-rust)
    #v(0.55em, weak: true)
    #text(size: 10.5pt, fill: cover-caps)[Edition #edition · #year]
  ])
]
