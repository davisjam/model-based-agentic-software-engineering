<!-- part-title: Back Matter -->
<!-- chapter-title: Colophon — Dogfooding MAGE -->

# Colophon — Dogfooding MAGE

> *A colophon is the note a book keeps about its own making — traditionally set near the end, where the typeface, the press, and the hands that set the type are recorded.*

In a typical colophon, I would tell you about the font. The book was set in Source Serif, with Source Sans for headings. Tradition satisfied.

This book was maintained using some of the same engineering ideas it describes.

During editing, important properties of the manuscript were represented explicitly rather than left entirely in prose or editorial memory. Models tracked such things as chapter identity, the argument spine, claims, terminology, evidence relationships, and the structure of the book. Generated projections and consistency checks helped keep those representations synchronized as the manuscript changed.

The point was not to mechanize editorial judgment. It was to make consequential editorial knowledge explicit enough that changes could propagate coherently and mechanically checkable inconsistencies could be caught before publication.

That is the entire conceptual setup required.

## The models that governed it

Each model carried one facet of the manuscript's structure, and a check held that facet consistent as the prose moved. [ref:manuscript-models] names each model with the failure it prevented.

<!-- label: manuscript-models -->
<!-- table: *The manuscript's models.* Each structured model alongside the manuscript, the facet of the argument it carried, and the failure a consistency check on it prevented. [short: The manuscript's governing models and the failures they prevent] -->
| Model | Purpose | Prevented failure |
|---|---|---|
| Argument-spine model | The book's case as an ordered run of numbered claims, with which chapters advance each | A claim advanced nowhere, duplicated across chapters, or spread thinner than it is taught |
| Chapter-shape model | Each chapter's opening and closing graded against the editorial discipline | Structural drift — an opening that never names the failure, a closing that only restates |
| Concept-and-vocabulary map | One canonical phrase for each of the book's central ideas | Terminology drift — the settled *structured model* slipping back toward *typed model* |
| Claims model | The load-bearing propositions, each with an audit predicate naming the prose that would negate it | An unsupported claim, or one the later text quietly contradicts |
| Literature-positioning model | One record per intervention, each carrying its established-lineage → current-frontier → narrow-move frame | A citation floating loose, or the book mis-positioned against neighboring work |
| Substantiation ledger | Each factual number bound to the claim it backs, its source, and its limit | A claim about the world with no data and no literature behind it |
| Flagship-case model | The DocAble case study broken into packages of catalogue entries, one row per architectural part | A case-study description drifting away from the catalogue it draws on |
| Design tokens | One source for the faces, the accent, and the type scale, projected to every output | Visual drift between the web edition and the print edition |

## A structural change, and a semantic one

Two edits during the final pass show what the models bought — and where they stopped.

The first was structural. During the final edit, three Part VI chapters changed order. Their reader-facing locations changed, but their stable identities did not. Because other manuscript models referred to those identities rather than to transient filenames, the reorganization could propagate without manually repairing every dependent representation.

The harder edits were semantic. During the final theory pass, the relationship between Modeling and Alignment changed — the old model described them as causally linked; the final theory treats them as independent activities addressing different problems, with Modeling placed first as the principled route to greater semantic reach. The role of a sensor changed too, from *detecting and catching* a violation to *observing and producing evidence*, leaving the judgment to the validator. Existing references still resolved; nothing was mechanically "broken." But some declared statements now represented an obsolete theory.

**A model can be structurally valid and semantically wrong.**

Those changes required editorial judgment. Once the corrected meaning was encoded in the model, the model made the consequences easier to propagate and later drift easier to detect. But the encoding had to be done by hand first. Mechanical checks can establish that a reference resolves. They cannot establish that the idea it points to is still right. The manuscript needed a separate model-to-prose semantic audit for exactly this reason: a join could pass and still carry stale meaning.

## What the models did — and did not do

The distinction mirrors one made throughout this book. Explicit models make important properties available to machinery, and machinery can enforce relationships that are sufficiently decidable. But representation does not abolish judgment. A manuscript can satisfy every structural join and still say the wrong thing.

The models therefore did not write or edit the book for me. They made selected properties of the book explicit, allowed selected relationships to be checked, and made consequential editorial decisions easier to propagate once they had been made.

This is a reflexive demonstration, not independent evidence for MAGE. It is simply a fitting final example: represent what matters, give machinery authority over what it can honestly decide, and leave semantic judgment where it belongs.
