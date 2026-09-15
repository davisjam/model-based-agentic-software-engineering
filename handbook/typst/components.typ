// components.typ — the print presentation of the semantic vocabulary.
//
// The manuscript says WHAT a block means (definition, decision, tradeoff); these functions decide
// what it LOOKS like in the PDF. Change the look here, never in the manuscript.

#import "typography.typ": palette, font-display, callout-style

// Front matter (Preface, Introduction): an UNNUMBERED opening. It avoids the chapter heading treatment
// — no "CHAPTER" eyebrow, no chapter counter — because front matter is not Chapter 0. A hidden outlined
// heading (label <hb-fore>) seats a flush-left Contents entry + PDF bookmark; the level-1 heading
// show-rule renders that heading invisibly, and the visible title is the display block below.
#let hb-frontmatter(title: "", body) = {
  pagebreak(weak: true)
  [= #title <hb-fore>]
  block(above: 0pt, below: 1.1em)[
    #text(font: font-display, size: 26pt, weight: 700, fill: palette.ink)[#title]
    #v(0.2em, weak: true)
    #line(length: 100%, stroke: 0.8pt + palette.rule)
  ]
  body
}

// A semantic callout: a lightly ruled, titled block. The left rule and tint come from the kind.
#let hb-callout(kind: "note", title: none, body) = {
  let style = callout-style.at(kind, default: (palette.muted, palette.panel))
  let rule-color = style.at(0)
  let fill-color = style.at(1)
  block(
    width: 100%,
    fill: fill-color,
    stroke: (left: 2.5pt + rule-color),
    radius: (right: 3pt),
    inset: (left: 12pt, rest: 10pt),
    above: 1.1em, below: 1.1em,
    breakable: true,
  )[
    #text(
      font: font-display, weight: 700, size: 9pt, fill: rule-color,
      tracking: 0.06em,
    )[#upper(kind)#if title != none and title != "" [ · #title]]
    #v(0.35em, weak: true)
    #set text(size: 10.5pt)
    #body
  ]
}

// READ FURTHER: the curated end-of-chapter reading list. Deliberately QUIET — no tint, no left rule,
// just a hairline separating it from the Summary prose above, a small tracked label, and muted
// hanging-indent entries. It carries no numbered citations; each entry is a mini-paragraph (a Chicago
// citation plus a one-sentence "why read this"). Kept together on one page where it fits.
#let hb-read-further(body) = {
  block(
    width: 100%,
    above: 1.6em, below: 1.1em,
    breakable: false,
  )[
    #line(length: 100%, stroke: 0.4pt + palette.rule)
    #v(0.55em, weak: true)
    #text(font: font-display, weight: 700, size: 8pt, fill: palette.muted, tracking: 0.16em)[READ FURTHER]
    #v(0.45em, weak: true)
    #set text(size: 9.5pt, fill: palette.muted)
    #set par(hanging-indent: 1.2em, first-line-indent: 0em, leading: 0.6em, spacing: 0.55em, justify: true)
    #body
  ]
}

// A figure: the image, a numbered caption. Typst owns the "Figure N" numbering and the label makes
// it referenceable via @id. `numbered: false` renders an UNNUMBERED figure — a plain muted caption
// with no "Figure N." supplement (the caption show-rule branches on `numbering: none`) and no claim
// on the figure counter, so the numbered figures around it keep their sequence.
#let hb-figure(img, caption: none, numbered: true) = {
  figure(
    img,
    caption: caption,
    kind: image,
    supplement: [Figure],
    numbering: if numbered { "1" } else { none },
  )
}
