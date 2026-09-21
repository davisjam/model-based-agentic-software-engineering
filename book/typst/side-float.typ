// side-float.typ — the family's ONE side-float wrap engine (shared seam).
//
// EXTRACTED VERBATIM from book/book_typst.py's Typst preamble so the MAGE book and the Software
// Engineering Handbook (handbook/typst/components.typ) reuse ONE wrap mechanism instead of growing
// a second: the MAGE preamble imports it for `weight-aside`, the handbook for its wrapped
// figure/table component. Both compile with `--root` at the catalogue root, so the import path is
// `/book/typst/side-float.typ` in each. The only change on extraction: `_wr-wrap-right` gained a
// `box-width:` parameter (default `_bw-aside-width`, so MAGE call sites are unchanged) — the
// handbook wraps a ~1/3-measure figure or ~1/2-measure table, not MAGE's fixed-width aside box.
//
// Side-float wrap ISOLATION POINT — VENDORED from @preview/wrap-it:0.1.1 (MIT), adapted; the `_wr-*`
// functions below and the single `_wr-wrap-right` call inside `weight-aside` are the ONLY touch-points.
// WHY vendored, not imported: wrap-it finds its split point by MEASURING chunks of the wrapped content,
// and measuring content that carries introspective elements (#cite / #footnote / #ref) destabilises
// Typst's locator ("citation could not be located — caused by measurement"): in a cite-bearing chapter
// the compile hard-fails, or the split silently degenerates and NOTHING wraps beside the box. The fix
// is the same proxy the Tufte sidenote measure-gate uses (below): every `_wr-*` measurement first
// REPLACES cite/footnote/ref with geometric stand-ins (`_wr-neutral`), while the RENDERED chunks keep
// the live elements, so citations still resolve and number correctly. That neutralisation must live
// inside the measurement path, which the package does not expose — hence the vendored copy. Bonus:
// removes the one network-fetched package (a fresh clone now compiles fully offline). When Typst grows
// a native side-float, rewrite the body of `weight-aside`; no caller changes.
#let _wr-styled = text(red)[x].func()
#let _wr-neutral(body) = {
  show cite: _ => text(size: 0.7em)[[?]]
  show footnote: _ => text(size: 0.7em)[[?]]
  show ref: _ => [[?]]
  body
}
// The two-cell grid both measured (via `_wr-neutral`) and rendered: wrapped strip left, fixed box right.
// Columns are PINNED (1fr + auto), unlike upstream wrap-it's (auto, auto): an auto text column sizes to
// the chunk's natural width and pushes the fixed box past the right margin (the margin-bleed sensor
// caught exactly that on the pilot pages). `1fr` holds the strip to measure − box − gutter.
// BREAKABLE (260909): Typst breaks the row's cells across the page boundary in lockstep — strip and
// box both fill the page and both continue on the next — so a tall unit flows instead of moving whole.
#let _wr-gridded(fixed, to-wrap) = block(breakable: true, width: 100%, above: 0.9em, below: 0.9em,
  grid(to-wrap, fixed, columns: (1fr, auto), column-gutter: 14pt))
#let _wr-chunk(words, end, start: 0) = if end < 0 { words.join(" ") } else {
  words.slice(start, end).join(" ")
}
#let _wr-wrap-index(hf, words, goal) = {
  for index in range(1, words.len()) {
    if hf(_wr-chunk(words, index)) > goal { return index - 1 }
  }
  return -1
}
#let _wr-rewrap(element, new-content) = {
  let fields = element.fields()
  for key in ("body", "text", "children", "child") {
    if key in fields { let _ = fields.remove(key) }
  }
  let positional = (new-content,)
  if "styles" in fields { positional.push(fields.remove("styles")) }
  element.func()(..fields, ..positional)
}
#let _wr-split-text(body, hf, goal) = {
  let words = body.text.split(" ")
  let wi = _wr-wrap-index(hf, words, goal)
  if wi > 0 {
    (
      wrapped: context {
        _wr-rewrap(body, _wr-chunk(words, wi))
        linebreak(justify: par.justify)
      },
      rest: _wr-rewrap(body, _wr-chunk(words, words.len(), start: wi)),
    )
  } else { (wrapped: none, rest: body) }
}
#let _wr-split-children(body, hf, goal, splitter) = {
  let children = body.children
  for (ii, child) in children.enumerate() {
    let prev = children.slice(0, ii).join()
    let chf(c) = hf((prev, c).join())
    if chf(child) <= goal { continue }
    let split = splitter(child, chf, goal)
    let new-children = (..children.slice(0, ii), split.wrapped)
    let new-rest = children.slice(ii + 1)
    if split.rest != none { new-rest.insert(0, split.rest) }
    return (wrapped: _wr-rewrap(body, new-children), rest: _wr-rewrap(body, new-rest))
  }
  panic("unreachable: called only when the sequence overflows the goal height")
}
#let _wr-split-body(body, hf, goal, splitter) = {
  let splittable = (strong, emph, underline, overline, highlight, list.item, _wr-styled)
  let inner = body.at("body", default: body.at("child", default: none))
  if body.func() in splittable {
    let bhf(c) = hf(_wr-rewrap(body, c))
    let result = splitter(inner, bhf, goal)
    if result.wrapped != none {
      return (wrapped: _wr-rewrap(body, result.wrapped), rest: _wr-rewrap(body, result.rest))
    }
  }
  (wrapped: none, rest: body)   // unsplittable shape (cite, image, …) → the whole element flows below
}
#let _wr-splitter(body, hf, goal) = {
  if hf(body) <= goal { return (wrapped: body, rest: none) }
  let b = if type(body) == str { text(body) } else { body }
  if b.has("text") { _wr-split-text(b, hf, goal) }
  else if b.has("body") or b.has("child") { _wr-split-body(b, hf, goal, _wr-splitter) }
  else if b.has("children") { _wr-split-children(b, hf, goal, _wr-splitter) }
  else { (wrapped: none, rest: b) }
}
// Page-break policy (pagination-whitespace fix, FINAL FORM 260909): the gridded unit — wrap strip
// left, aside box right — is BREAKABLE. Typst 0.15 breaks a grid row's cells across the page boundary
// in LOCKSTEP: both columns fill to the page bottom and both continue on the next page, the box's
// fill and left rule carrying across the seam (verified in isolation and in the book). So an aside
// too tall for the space left on its page no longer moves, pre-fills, or slices — it simply starts
// where the flow stands and breaks wherever the page ends, footnote blocks and all, because the BREAK
// DECISION IS TYPST'S OWN LAYOUT, not a measured guess. No anchor query, no remaining-space input, no
// oscillation surface: the only measurement left is the box's own height, which sizes how much strip
// prose wraps beside it (position-independent by construction). This retired the pre-fill ladder and
// the page-sized slicer, whose anchor-based `avail` could not see footnote areas and slipped
// (the 65%-blank cascade).
#let _bw-aside-width = 3.75in   // the aside box column (~60% of the 6.25in text measure)
// GEOMETRY GUARD (260909): the box column CLAMPS to the layout container so the gridded unit can never
// exceed the measure — a fixed-width `auto` grid column wider than its container would overflow the
// right margin (the escape the extended overflow sensor now also catches). The wrap strip keeps at
// least this width; in the standard 6.25in measure the clamp never bites (6.25 − 3.75 = 2.5in > min).
#let _WR-MIN-STRIP-W = 1.75in
// NOTE: no nested `context {}` here — `layout`'s closure already runs with context (its `measure` calls
// depend on it), and an extra context layer makes the cites/footnotes rendered inside flicker across
// layout iterations (see `section-break-guard`'s CONVERGENCE note, rule (b)).
// `anchor` is accepted for call-site compatibility (the emitter pins a zero-size label ahead of the
// unit); the breakable form no longer reads it. `box-width` is the requested box-column width
// (default: MAGE's aside width, so MAGE call sites are unchanged; the handbook passes its own).
#let _wr-wrap-right(body, to-wrap, anchor: none, box-width: _bw-aside-width, boxer: (b, w) => b) = layout(size => {
  // Clamp the box column to the container (see _WR-MIN-STRIP-W).
  let bxw = calc.min(box-width, size.width - _WR-MIN-STRIP-W)
  let fixed = boxer(body, bxw)
  // Every measurement goes through `_wr-neutral` — measuring LIVE cite/footnote/ref content breaks
  // Typst's citation locator ("citation could not be located — caused by measurement"). The strip is
  // split to the box's height + 1em (the same goal formula as always): the wrap covers the box, the
  // remainder returns to the full measure after the grid.
  let hf(chunk) = measure(box(width: size.width, _wr-neutral(_wr-gridded(fixed, chunk)))).height
  let goal = hf([]) + measure(v(1em)).height
  let result = _wr-splitter(to-wrap, hf, goal)
  _wr-gridded(fixed, if result.wrapped == none { [] } else { result.wrapped })
  result.rest
})
