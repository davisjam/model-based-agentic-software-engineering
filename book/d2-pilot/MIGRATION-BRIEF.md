# Standing brief — migrate a book figure from hand-SVG to d2

You migrate a handful of named figures from hand-authored SVG to **d2** source, in the book's house style.
Work in `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog`.

**The bar for THIS round is "substantially equivalent — close enough, don't over-polish."** A human
editorial refinement pass follows. Do NOT gold-plate; get each figure to a faithful, legible d2 rendering
and move on. There are many figures to do.

## Read first (once, up front)
- `plugin/mage/skills/self-communicate/drawing/diagrams.md` §"d2 — the house-styled declarative path" —
  the reusable how-to: the three constructs (flow / grid / nested containers), the compile recipe, the
  0.8 gotchas.
- `book/d2-pilot/_house-style.d2` — the shared class include (palette → classes). Every figure starts with
  `...@_house-style`.
- `book/d2-pilot/NOTES.md` + the five existing pilot figures (`open-frontiers.d2`, `system-pipeline.d2`,
  `governance-loop.d2`, `model-invariants-checker.d2`, `governance-targets.d2`) — worked exemplars of each
  construct. Copy their patterns.

## Per-figure workflow (repeat for each assigned figure `<fig>`)

1. **Study the original.** `rsvg-convert -w 1200 book/assets/<fig>.svg -o /tmp/<fig>-orig.png` and **Read
   the PNG.** Note its structure (boxes/flow/grid/containers), the role colors, every text label, and the
   edges. You are reproducing *this*.
2. **Author `book/d2-pilot/<fig>.d2`** — start with `...@_house-style`, pick the construct that matches
   (flow with `direction:` + `a -> b`; grid with `grid-columns/rows`, root `grid-columns: 1` to stack a
   multi-band page; nested `group: { … }` for zones). Tag each box with the class whose role color matches
   the original (fleet/modeling/rust/trust/churn/panel/paperbox/conj). **Preserve the author's words** —
   same labels, same edges. Keep integers for `stroke-width`/`font-size`.
3. **Compile** with the vendored fonts:
   ```
   d2 --font-regular book/fonts/SourceSans3/SourceSans3-Regular.ttf \
      --font-bold    book/fonts/SourceSans3/SourceSans3-Bold.ttf \
      --font-italic  book/fonts/SourceSans3/SourceSans3-It.ttf \
      book/d2-pilot/<fig>.d2 book/d2-pilot/<fig>.svg
   ```
4. **Render + vision-compare.** `rsvg-convert -w 1200 book/d2-pilot/<fig>.svg -o /tmp/<fig>-d2.png`. **Read
   both `/tmp/<fig>-orig.png` and `/tmp/<fig>-d2.png`** and judge: same structure? same content/labels?
   house palette? legible? (Optional: write a tiny `/tmp/<fig>-cmp.html` with the two `<img>` side by side.)
5. **Iterate** the `.d2` (edit → recompile → re-render → re-Read) until **substantially equivalent**, or you
   hit **~4 iterations** — whichever first. Substantially equivalent = a reader sees the same figure in the
   same style, not a pixel copy. Stop there.
6. **Leave it uncommitted** in the working tree: `book/d2-pilot/<fig>.d2` + `book/d2-pilot/<fig>.svg`. Do
   NOT commit, do NOT run `catalog.py build`, do NOT touch `book/assets/<fig>.svg` or any other file.

## When d2 is the wrong tool
If a figure's meaning lives in **bespoke geometry** (a staircase, a frontier/scatter plot, a hand-tuned
infographic) and d2 can't get close in ~4 iterations, **stop and flag it** "keep hand-SVG — <one-line why>"
rather than forcing a bad d2. That is a valid, useful outcome for the migration decision.

## Report back (per figure)
`<fig>`: verdict (**substantially-equivalent** / partial / keep-hand-SVG) · construct used · iterations ·
one line on anything that didn't translate. Keep it terse.
