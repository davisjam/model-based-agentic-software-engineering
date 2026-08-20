<!-- part-title: Back Matter -->
<!-- chapter-title: Colophon — Dogfooding MAGE -->

# Colophon — Dogfooding MAGE

> *A colophon is the note a book keeps about its own making — traditionally set near the end, where the typeface, the press, and the hands that set the type are recorded.*

In a typical colophon, I would tell you about the font. The book was set in Source Serif, with Source Sans for headings. Tradition satisfied.

This book was built and revised using some of the same engineering ideas it describes.

During editing, important properties of the manuscript were represented explicitly rather than left entirely in prose or editorial memory. Models tracked properties and obligations such as chapter identity, the argument spine, claims, terminology, evidence relationships, and book structure. Generated projections and consistency checks helped keep those representations synchronized as the manuscript changed.

The point was not to mechanize editorial judgment. It was to make consequential editorial knowledge explicit so changes could propagate coherently and decidable inconsistencies could be caught before publication.

## The models and checks behind the manuscript

Each model made one aspect of the manuscript explicit, and checks kept it synchronized as the prose changed. [ref:manuscript-models] shows each model and the failure its checks were designed to prevent.

<!-- label: manuscript-models -->
<!-- table: *The manuscript's models.* Each structured model alongside the manuscript, the facet of the argument it carried, and the failure a consistency check on it prevented. [short: The manuscript's governing models and the failures they prevent] -->
| Model | Purpose | Prevented failure |
|---|---|---|
| Argument-spine model | The book's numbered claims, their order, and the chapters that advance them | A claim advanced nowhere, duplicated across chapters, or spread thinner than it is taught |
| Chapter-shape model | Each chapter's opening and closing graded against the editorial discipline | Structural drift — an opening that never names the failure, a closing that only restates |
| Concept-and-vocabulary map | One canonical phrase for each of the book's central ideas | Terminology drift — the settled *structured model* slipping back toward *typed model* |
| Claims model | The load-bearing propositions, each with an audit predicate identifying prose that would contradict it | An unsupported claim, or one the later text quietly contradicts |
| Literature-positioning model | One record per intervention, each carrying its established-lineage → current-frontier → narrow-move frame | A citation floating loose, or the book mis-positioned against neighboring work |
| Substantiation ledger | Each factual number bound to the claim it backs, its source, and its limit | A claim about the world with no data and no literature behind it |
| Flagship-case model | The DocAble case organized into catalogue-entry packages, one row per architectural part | A case-study description drifting away from the catalogue it draws on |
| Design tokens | One source for the faces, the accent, and the type scale, projected to every output | Visual drift between the web edition and the print edition |

## Structural change, semantic change

Two edits during the final pass show what the models could do — and where they stopped.

The first was structural. During the final edit, three Part VI chapters changed order. Their reader-facing locations changed, but their stable identities did not. Because other manuscript models referred to those identities rather than to transient filenames, the reorganization propagated without manually repairing every dependent representation.

The harder edits were semantic. During the final theory pass, the relationship between Modeling and Alignment changed. The old account made them causally dependent; the final theory treats them as independent activities addressing different problems, with Modeling as the principled route to greater semantic reach. The role of a sensor changed too: instead of deciding that a violation occurred, it observes and produces evidence for a validator. Existing references still resolved; nothing was mechanically "broken." But some declared statements now represented an obsolete theory.

**A model can be structurally valid and semantically wrong.**

Those changes required editorial judgment. Once the corrected meaning was encoded in the model, its consequences became easier to propagate and later drift easier to detect. But machinery could not decide what the corrected theory should be. Mechanical checks can establish that a reference resolves. They cannot establish that the idea it points to is still right. The manuscript needed a separate model-to-prose semantic audit for exactly this reason: a join could pass and still carry stale meaning.

## What the models did — and did not do

Explicit models make important properties available to machinery, and machinery can enforce relationships that are sufficiently decidable. But representation does not abolish judgment. A manuscript can satisfy every structural join and still say the wrong thing.

The models did not supply the editorial judgment. They made selected properties explicit, allowed selected relationships to be checked, and helped propagate consequential decisions once those decisions had been made.

This is a reflexive demonstration, not independent evidence for MAGE. It is a fitting final example: represent what matters, give machinery authority over what it can honestly decide, and leave semantic judgment where it belongs.
