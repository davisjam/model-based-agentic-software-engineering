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

// A Part divider (Part I, Part II): a full page announcing a top-level division, above chapter level.
// Like front matter, it carries a hidden outlined heading (label <hb-part>, body "<numeral> — <title>")
// so the Contents shows one flush-left, bold entry per Part with chapters nested beneath it; the
// level-1 show-rule renders that heading invisibly and this function draws the visible divider — the
// numeral large, the title as an italic subtitle over a short accent rule, then the opener paragraph.
#let hb-part(numeral: "", title: "", body) = {
  pagebreak(weak: true)
  [= #numeral — #title <hb-part>]
  v(2.4in)
  align(center)[
    #text(font: font-display, size: 34pt, weight: 700, fill: palette.ink)[#numeral]
    #v(0.45em, weak: true)
    #text(font: font-display, size: 17pt, style: "italic", fill: palette.muted)[#title]
    #v(0.9em, weak: true)
    #line(length: 16%, stroke: 1pt + palette.accent)
  ]
  v(1.6em)
  block(width: 100%)[#body]
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
// it referenceable via @id.
#let hb-figure(img, caption: none) = {
  figure(
    img,
    caption: caption,
    kind: image,
    supplement: [Figure],
  )
}
