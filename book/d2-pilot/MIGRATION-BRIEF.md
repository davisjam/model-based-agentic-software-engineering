# Standing brief — reimplement a book figure in d2 (fidelity-first)

You reimplement a handful of named figures from hand-authored SVG into **d2** source, in the book's house
style. Work in `/Users/davisjam/Projects/ada-tool/talks-and-notes/governance-catalog`.

**Reimplement, do not trace.** Do not copy coordinates or imitate accidental SVG geometry. Recover the
figure's *intended visual argument* and rebuild it with d2's structural primitives. **The objective is not
a valid d2 translation; it is a better-maintained implementation of the same communication design.** Do NOT
accept a diagram merely because it compiles.

## Read first (once, up front) — the house rules live in the skill
- `plugin/mage/skills/self-communicate/drawing/diagrams.md` §"d2 — the house-styled declarative path" AND
  §"Reimplementing an existing figure in d2 — three fidelities". **This is the spec.** It defines the three
  fidelities (semantic / topological / rhetorical), the pre-layout plan, the house rules (compact 70–85%
  frame use; straight-for-structure/curves-for-feedback; typography hierarchy not universal bold; hard type
  floor; captions→book-caption; peer symmetry + meaningful asymmetry; edge-kind vocabulary; semantic
  colours), the gotchas, and the conversion receipt. Follow it.
- `book/d2-pilot/_house-style.d2` — the class include (`...@_house-style`). `book/d2-pilot/NOTES.md`.

## Per figure `<fig>` — the protocol

**1. Study + analyze the source in five dimensions.** `rsvg-convert -w 1200 book/assets/<fig>.svg -o
/tmp/<fig>-orig.png` and Read it. Then write down (you will emit these as the receipt in step 4):
   1. **Visual proposition** — what the reader should understand from the *composition* before reading small text.
   2. **Semantic structure** — the load-bearing entities, relations, distinctions, annotations.
   3. **Topological structure** — which spatial relations carry meaning (peer / hierarchy / sequence /
      fan-out / convergence / cycle / containment / correspondence / contrast).
   4. **Forbidden implications** — what ordering / dependency / hierarchy / equivalence the new layout must
      NOT accidentally imply. (Write this line even if it feels obvious — it catches the worst errors.)
   5. **Rhetorical hierarchy** — what the eye should hit first, second, third.

**2. Author `book/d2-pilot/<fig>.d2`** — start `...@_house-style`; realize the analysis. Optimize for
semantic + topological + rhetorical fidelity, NOT geometric similarity. Obey every house rule in the skill:
   - Preserve meaningful topology (a triangle of peers must not become a vertical process; parallel
     alternatives must not become sequential stages).
   - Compact — use ~70–85% of the frame, short edges, related nodes close, deliberate whitespace only
     between conceptual regions.
   - Straight/orthogonal structural edges; curves only for feedback/return/bypass/collision-avoidance.
   - Typography hierarchy (heading bold/semibold · detail regular · annotation subordinate/italic) — NOT
     all-bold. Split a heading cell over a detail cell; do not use a `|md|` block (it renders invisible).
   - No meaningful text below the book floor; never shrink type to fit — restructure or shorten copy.
   - Remove caption-like prose from the drawing (it belongs in the book caption); keep only a legend that
     the visual encoding genuinely needs.
   - Peer nodes visually equivalent; preserve intentional asymmetry/contrast between regions.
   - Right edge *kind* per relation (directed / correspondence / parity / containment / feedback), not a
     generic arrow for everything. Every edge connects named objects, crosses no label, ends in no whitespace.
   - Semantic colours (blue=structure/governed · green=model/knowledge/desired · red=failure/gate ·
     grey=territory/ordinary · dashed=weak/inferred/correspondence/feedback); colour never the sole carrier.
   - Keep `stroke-width`/`font-size` integers; grids fill column-major; `left`/`right`/`constraint`/`no`/`yes` are reserved.

**3. Compile + render + inspect visually** (do NOT stop at "it compiled"):
   ```
   d2 --font-regular book/fonts/SourceSans3/SourceSans3-Regular.ttf \
      --font-bold book/fonts/SourceSans3/SourceSans3-Bold.ttf \
      --font-italic book/fonts/SourceSans3/SourceSans3-It.ttf \
      book/d2-pilot/<fig>.d2 book/d2-pilot/<fig>.svg
   rsvg-convert -w 1200 book/d2-pilot/<fig>.svg -o /tmp/<fig>-d2.png
   ```
   Read `/tmp/<fig>-orig.png` and `/tmp/<fig>-d2.png` together and ask:
   - Does the d2 version make the **same proposition at a glance**?
   - Has auto-layout introduced any **false sequence, hierarchy, dependency, or grouping**? (check against
     your Forbidden implications)
   - Are related things close and peer things visibly peer?
   - Are edges shorter/clearer than the hand-SVG where possible? Any excessive unused space (aim 70–85%)?
   - Any text unnecessarily small / below floor? Arrowheads, labels, destinations unambiguous?
   **Iterate** the `.d2` (edit → recompile → re-render → re-Read) until the d2 version communicates *at
   least as clearly as the source*. Cap ~4–5 iterations — but do not stop at a topology-correct-but-
   rhetoric-wrong render.

**4. Emit the receipt** `book/d2-pilot/<fig>.receipt.yaml`:
   ```
   visual_proposition:   ...
   topology:             ...
   forbidden_implications: ...
   intentional_changes:  ...
   d2_limitations:       none            # or: what d2 couldn't preserve without excessive hacks
   ```

**5. Leave uncommitted.** `book/d2-pilot/<fig>.{d2,svg,receipt.yaml}` in the working tree. Do NOT commit, do
NOT run `catalog.py build`, do NOT touch `book/assets/<fig>.svg` or any sibling agent's files.

## When d2 is the wrong tool
If preserving a figure's important visual property needs excessive d2 hacks (a bespoke geometry — staircase,
frontier/scatter plot, hand-tuned infographic), **record it in `d2_limitations` and flag "keep hand-SVG —
<why>"** rather than degrading the figure silently. A valid, useful outcome.

## Report back (per figure)
`<fig>`: verdict (**substantially-equivalent** / partial / keep-hand-SVG) · the one-line visual proposition ·
whether any forbidden implication was at risk and how you avoided it · iterations · d2_limitations. Terse.
