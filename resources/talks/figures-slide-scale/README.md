# Slide-scale figure variants

Book figures are drawn for a printed page. Dropped into a slide they carry type the back
of a room cannot read: embedded in the McAfee deck, seven of them rendered between 5.8 and
11.7 pt. These are **slide-scale renditions of the same figures** — same wording, re-laid-out
so the type clears a legibility floor at the size each one is actually placed.

**`book/assets/` is never touched.** Those SVGs are the book's authored figures and the book
renders from them; enlarging their type for a slide would damage the book's pages. Each file
here is a sibling, generated from its own script, named `<figure>.slide.svg` so the `.slide`
infix says what it is.

## The design rule that makes the sizes auditable

A variant's **viewBox is expressed in points at the placed width** — `viewBox="0 0 672.5 …"`
for a figure placed 9.340 in wide (9.340 × 72 = 672.5). Then

```
effective pt on the slide = font-size × (placed width in pt ÷ viewBox width) = font-size
```

so `font-size="16"` *is* 16.0 pt native. Reading a size off the SVG needs no arithmetic, and
a drift between the drawing and the slide shows up as a viewBox that no longer equals the
placed width × 72.

## Two point columns, because this deck is not 16:9-at-13.333in

The McAfee deck is **10.00 × 5.625 in**, not the usual 13.333 × 7.5. Projected on one screen
its points are **1.333× larger**. So a standing "20 pt" bar is **15.0 pt native** here, and
this deck's 20 pt body text is a 26.7 pt-equivalent. Scripts report native pt; multiply by
4/3 for the standard-deck equivalent.

## Generating

Each script measures every string against the real Source Sans 3 TTFs
(`book/fonts/SourceSans3/`) and **fails loudly rather than overflowing** — a label wider than
its box, a box outside the canvas, or a caption below the canvas raises instead of being
drawn. Most scripts then search downward from 20 pt for the largest body size that fits, so
the emitted number is the figure's ceiling at that slot, not a guess.

```
python3 engineering-leverage.slide.py                  # fixed slot
python3 docable-glimpse.slide.py <width_in> <height_in>  # slot given on the command line
```

The three slot-parameterised scripts (`docable-glimpse`, `fig-job-lifecycle-sm`,
`component-model-structure`) let you ask what a *different* slot would buy before committing
slide geometry — `docable-glimpse.slide.py 9.34 2.5` reports 17.0 pt against 13.0 pt in the
slot it actually has.

Rasterise with `rsvg-convert -w <px> <file>.slide.svg -o <file>.png`. The charts use real
text, not outlined paths, so Source Sans 3 must resolve; check it has
(`fc-list | grep -i "source sans"`) rather than letting a substitute face reflow the layout.

## Where the wording came from

Every string is copied from the book figure of the same name. Layout changes — a tall funnel
flattened into a strip, a seven-state column serpentined over two — were made to fit the
slide; **no wording was added, cut, or reworded**. Where a layout change merges two levels of
a figure into one cell, the script's docstring says so.
