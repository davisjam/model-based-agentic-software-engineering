// components.typ — the print presentation of the semantic vocabulary.
//
// The manuscript says WHAT a block means (definition, decision, tradeoff); these functions decide
// what it LOOKS like in the PDF. Change the look here, never in the manuscript.

#import "typography.typ": palette, font-display, callout-style

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
