# MAGE grayscale figure trials

These editable TikZ/PGFPlots candidates accompany the existing color artwork for
publisher review. They do not replace the production figures. Each candidate is
placed immediately after its original in the comparison book; original figure
numbers and references are retained.

Run from the repository root with the PDF build dependencies installed:

```sh
python tools/mage_tikz_charts.py --check
python tools/mage_tikz_review.py
```

The output is `latex/build/mage-figure-review.pdf`. `--figures-only` compiles the
candidate pool without assembling the book. The full build also writes
`latex/build/mage-tikz-source.zip` (standalone editable publisher sources),
`latex/build/tikz/pairings.json` (original-to-candidate mapping), and
`latex/build/tikz/review-notes.txt` (editorial questions). The compiler rejects all final
warnings except underfull boxes. Additional checks require one candidate per
inventoried drawing, native print dimensions, alternate text, and monochrome
rendered pixels. Pre-commit checks data projections; pre-push and the book CI job
compile and check every candidate.

`figures/` contains native TikZ pictures; `mage-figures.sty` holds common drawing styles and
libraries. Font families and edition profiles come from `latex/book-fonts.tex`,
shared with `latex/house.sty`. The standalone pool selects the MAGE body profile;
a picture included directly in a book inherits that book’s active body family. Pictures are compiled at their authored size, with no shrink-to-fit.
The book embeds the resulting vectors with figure alternate text. Editable TikZ
sources remain available to the publisher. `receipts/` records the claim,
relationships, grayscale encoding, redesign choices, and unresolved editorial questions.
These are review candidates, not a claim that every redesign has editorial approval.

The eight newer empirical charts use the committed factory-archaeology CSVs and
the existing category definitions. The historical churn chart uses the native
manuscript's exact sixteen counts and a consistent positive/negative scale. The
older velocity chart recovers the integer values encoded in the original SVG;
its receipt records the original file hash and the discrepancy between nineteen
actual bars and a twenty-week description. No newer series is substituted.
Seven navigation maps preserve station order and highlight the current chapter
with a solid marker and bold type. The author photograph is retained as a
photograph, outside the native drawing conversion.

The comparison edition intentionally adds pages and is excluded from web
publication. The regular release PDF and all original assets remain unchanged.
PDF structure checks verify tags and alternate text; they do not certify complete
accessibility or replace review of the separate HTML edition.

## Publisher grayscale drawing guidelines

These rules govern the MAGE TikZ edition. The goal is readable structure with a
small number of meaningful visual distinctions, not a gray substitute for every
color in the web artwork. Apply these rules alongside the original-versus-candidate
fidelity checklist below.

1. **Start with white.** Ordinary nodes, artifacts, evidence and outputs use white
   interiors and dark text. A gray fill must explain a role or grouping that is
   needed to read the argument. If removing the fill loses no information, remove it.
2. **Keep the tonal vocabulary small.** Prefer no fill or one light gray role per
   diagram. Two gray roles are justified only when they encode a named distinction
   that labels, placement or a legend also convey. Do not assign a different tone
   to each stage, importance level, source color or branch merely for variety.
3. **Protect text contrast.** Text-bearing boxes use white or at most 15% black
   (TikZ `black!15`); normally 5–10% is enough for a group. Never place black body
   labels on medium/dark gray, as happened in Figure 1.6. Reserve dark fills for
   small selected-state markers or short badges with white text. Inspect the final
   printed size, not only an enlarged screen view. Chart marks may use a wider
   tonal range when their labels remain on white.
4. **Separate grouping from emphasis.** A thin boundary, heading and whitespace
   usually suffice for a container. Do not combine a broad gray panel, shaded child
   boxes, a heavy border and bold text without separate reasons for each. A white
   artifact inside a lightly shaded territory remains white; evidence is not a
   special gray category by default.
5. **Inherit the book font and preserve semantic typography.** Use the active
   book body family for labels, headings and annotations; do not select a separate
   figure typeface. Local size, weight and italic changes must preserve that family.
   The build compares rendered prose fonts against a proof from the book’s own
   house style; mathematical symbols retain mathematical typesetting. Compare the source's boldface, capitals,
   italics and partial emphasis before simplifying. These can distinguish named
   regions from explanations, boundary names from their definitions, vocabulary
   terms from examples, or contrasting outcomes. Figure 2.2, for example, needs
   bold capitals for its region names, bold boundary names, and regular explanatory
   prose. Multiple peer categories may all need emphasis; there is no one-bold-item
   limit. Keep equivalent roles consistent, and scope emphasis to the term rather
   than its whole box. Ordinary process labels such as Job and Validate stay
   regular where emphasis adds no distinction. Preserve meaningful capitals
   verbatim and italic questions, qualifications or relation labels where the
   source uses them. Reflow text before shrinking it. Keep external annotations
   outside boxes when they explain the drawing rather than name a node.
6. **Route process edges orthogonally.** Use horizontal/vertical segments, explicit
   ports and short right-angle bends. Fan-out/fan-in uses a shared rail or separate
   aligned ports, with clear direction. Do not converge diagonal arrows on a tiny
   point. Avoid long wraparound routes, crossings of unrelated boxes or text, and
   arrowheads laid along a border. Reposition nodes before adding routing detours.
   Leave a visible straight approach between the final bend, branching rail or crossed panel border and
   the target box: aim for at least 12 pt, with 9 pt as the audit floor. A complete
   arrowhead alone is not enough clearance. Move the rail or the target before
   shortening the shaft.
   Diagonals are appropriate only when geometry itself carries meaning (plots,
   triangles, radial relations, or literal expansion guides); record the reason.
7. **Preserve distinct relation meanings.** Use solid arrows for ordinary directed
   flow; dashed/dotted lines only for named optional, feedback, excluded or detail
   relations. Preserve expansion guides, forbidden-path crosses, warning/check
   symbols and admission marks. Do not remove semantic cues to simplify the page.
8. **Compare alternatives fairly.** Align peer paths and give their ordinary nodes
   equal visual weight. Boxes at the same conceptual stage should share an explicit
   top or bottom alignment; paired outcome boxes normally share both edges and
   sufficient height for the longer text. Centering unequal-height peers can create
   mismatched entry ports and crowd one branch, as in Figure 2.3. Equalize true peers,
   not unrelated containers or deliberately nested structures. Explain differing outcomes in words; do not imply that a
   darker box is more important, worse or more authoritative unless that mapping is
   explicitly intended. The reasoning-horizon paths need readable structure, not a
   ladder of gray tones.
9. **Prove legibility at output size.** Keep authored text at least 9 pt (normally
   10–11 pt); enlarge/reflow before shrinking. Check all labels, line separation,
   arrow entry points and white-on-dark badges in rendered output. Compiler and
   geometry checks supplement visual inspection; they cannot establish meaning.
10. **Use friendly boxes and meaningful shapes.** Ordinary process and concept
    boxes have modest rounded corners (about 3 pt at print size). Keep straight
    horizontal/vertical connectors; the corner treatment of a box does not imply
    curved routing. Preserve document folds, stacked model cards, circular step
    numbers, state ellipses, decision diamonds and other recognizable source cues.
    Vary shapes only to distinguish a named role; do not turn every object into the
    same rectangle or add a new shape solely for decoration.
11. **Record the design decision.** For each candidate, state which role (if any)
    uses fill, what bold signifies, and any routing exception. Compare with the
    original to ensure that simplification preserves the relationships and cues.
    When a candidate breaks these rules, fix it or document a specific exception;
    a generic claim that grayscale is allowed is not a justification.

## Clickable book references

Use `\magebookref{stable-label}{printed reference}` for explicit chapter,
section, figure, table and appendix references inside a drawing. For example,
`\magebookref{part:4}{Chapter 4}`. Link the reference itself, not every ordinary
node label. Navigation diagrams may link their numbered destinations. Keep the
printed wording useful on paper; no blue color or visible link border is added.

PDF inclusion discards annotations, so the pool records the native reference
rectangles and the book recreates tagged internal links over them. The assembler
rejects missing destinations and checks every final region against the graphic's
independently recorded position and the intended PDF destination. The source gate
also catches explicit numbered references left as inert text. Standalone publisher
sources print references normally without dangling external URLs.

`style-review.json` records the latest sparse-shading and shape review of all 144
candidates, including each fill/bold/routing decision, current source hashes and
compiled proof measurements. `typography-review.json` records the subsequent
source-by-source semantic typography review, including preserved distinctions and
selected exact printed phrases. Earlier grayscale/fidelity ledgers remain historical.

Every candidate build checks these phrases in the actual PDF for capitalization,
boldface and italics. Regular explanatory phrases are also checked, so making an
entire box bold cannot substitute for preserving a term/definition distinction.
The checks tolerate line wrapping and ligatures and require a complete correctly
styled occurrence; they do not infer semantic meaning or replace source review.
The build also compares prose faces with a separate proof from `house.sty`, so
local font fallbacks cannot silently diverge from the book. It writes
`latex/build/tikz/typography-audit.json` and fails on lost cues or the wrong body family.

## Grayscale and geometry review

Grayscale includes white, gray fills, shading, patterns, dashed lines and line
weights. Preserve the original's distinctions, groupings and arrow meanings;
reducing every node to a white box can remove information. `grayscale-review.json`
records the complete figure-by-figure refinement pass.

`tools/tikz_audit.py` adapts the SVG overflow/collision/occlusion/font-band sensors
to actual compiled PDF characters and vector paint order using PyMuPDF. The existing
reference checks are `tests/svg_fit.py`, `book-models/lint_figure_overflow.py`,
`book-models/lint_figure_label_collision.py`, `book-models/lint_figure_text_occlusion.py`,
and `plugin/mage/skills/self-communicate/drawing/svg-audit.py`. Converting compiled
PDF back to SVG outlines discards the text semantics these checks need. Every
candidate build writes `latex/build/tikz/geometry-audit.json` and an annotated PDF
with red diagnostic rectangles (the annotations are not publication artwork).
CI retains these reports separately from published book artifacts.

```sh
python tools/tikz_audit.py latex/build/tikz/candidates.pdf \
  --manifest latex/build/tikz/pages.json --output /tmp/tikz-audit.json \
  --annotated /tmp/tikz-audit.pdf
python -m unittest tests.test_tikz_audit
```

`layout-review.json` records the bookwide spacing review and explicit peer groups.
The build rejects short terminal approaches, misaligned reviewed peers, and invalid
contracts. A terminal measurement runs from the last bend, branching rail, crossed panel border or shaft
start to the arrowtip, including the tip. It recognizes filled arrowheads (including Stealth and Latex), straight shafts
and rectangular text-bearing targets. Peer contracts select
unique box labels and specify the relevant edges or equal dimensions; unrelated
boxes are not presumed to be peers. A narrowly justified terminal exception must
name its target, direction and lower bound. Its actual measurement and reason stay
visible in the report rather than disappearing as a false zero.

Collision, occlusion and font-band heuristics remain audit-only; `--strict` rejects
any unreviewed finding. Compiler diagnostics, print dimensions, semantic typography,
book font inheritance and grayscale pixel checks remain blocking. Tests include
Figure 2.3-like crowded/misaligned branches that compile without warnings, repaired
branches, and deliberately unequal non-peer panels.

Glyph boxes approximate ink. Complex clipping, intentional mathematical overlays,
node ownership and semantic fidelity still require visual/source comparison. A
clean geometry report does not mean a redraw preserves the original's meaning.

## Visual fidelity review

`fidelity-review.json` records the follow-up source comparison prompted by missing
expansion guides and document pictograms in Figures 1.1 and 1.2. The earlier
`grayscale-review.json` is a historical snapshot, not a fidelity certificate.

Compare rendered originals and candidates, not just their extracted words:

- Preserve pictograms, warning/check marks, forbidden-path crosses and gate marks.
- Preserve arrowless expansion guides, feedback paths, open endpoints and grouping.
- Keep external annotations outside nodes; distinguish labels from explanations.
- Compare boldface, capitalization, italics and partial emphasis with the source;
  preserve the semantic role of each, including within a single node or sentence.
- Check text at its authored print size; enlarge the layout before shrinking text.
- Retain chart units, qualifications, callouts and legend meanings.

Compiler success and a clean geometry audit cannot establish any of these. The
review log records source and candidate hashes so subsequent edits are visible.
