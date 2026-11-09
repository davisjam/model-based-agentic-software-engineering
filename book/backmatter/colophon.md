<!-- GENERATED from book/latex/sources/backmatter/colophon.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

<!-- part-title: Back Matter -->

<!-- chapter-title: Colophon — Dogfooding MAGE -->

# Colophon — Dogfooding MAGE

In a typical colophon, I would tell you about the font. This book uses LuaLaTeX and the `book` class, with Source Sans 3 for body text, Source Serif 4 for headings, and IBM Plex Mono for code. A custom `house` package handles the page layout, captions, and breakable insets. Commodity intelligences developed by OpenAI and Anthropic were used in editing the manuscript and developing its figures. Tradition satisfied.

This book was built and revised using some of the same engineering ideas it describes.

During editing, important properties of the manuscript were represented explicitly rather than left entirely in prose or editorial memory. Models tracked properties and obligations such as section identity, the argument spine, claims, terminology, evidence relationships, and book structure. Generated projections and consistency checks helped keep those representations synchronized as the manuscript changed.

The point was not to mechanize editorial judgment. It was to make consequential editorial knowledge explicit so changes could propagate coherently and decidable inconsistencies could be caught before publication.

**The models and checks behind the manuscript**

<!-- label: manuscript-models -->
<!-- table: *The manuscript's models.* Each structured model alongside the manuscript, the facet of the argument it carried, and the failure a consistency check on it prevented. [short: The manuscript's governing models and the failures they prevent] -->
| Model | Purpose | Prevented failure |
|---|---|---|
| Argument-spine model | The book's numbered claims, their order, and the sections that advance them | A claim advanced nowhere, duplicated across sections, or spread thinner than it is taught |
| Section-shape model | Each section's opening and closing graded against the editorial discipline | Structural drift — an opening that never names the failure, a closing that only restates |
| Concept-and-vocabulary map | One canonical phrase for each of the book's central ideas | Terminology drift — the settled *structured model* slipping back toward *typed model* |
| Claims model | The load-bearing propositions, each with an audit predicate identifying prose that would contradict it | An unsupported claim, or one the later text quietly contradicts |
| Literature-positioning model | One record per intervention, each carrying its established-lineage → current-frontier → narrow-move frame | A citation floating loose, or the book mis-positioned against neighboring work |
| Substantiation ledger | Each factual number bound to the claim it backs, its source, and its limit | A claim about the world with no data and no literature behind it |
| Flagship-case model | The DocAble case organized into catalogue-entry packages, one row per architectural part | A case-study description drifting away from the catalogue it draws on |
| Design tokens | One source for the faces, the accent, and the type scale, projected to every output | Visual drift between the web edition and the print edition |
