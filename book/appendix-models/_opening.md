Parts II–IV introduce only the model detail needed for the engineering argument. This appendix
preserves the schemas, invariant tables, derivation directions, and formal machinery useful when
adapting those models or interrogating their claims. It is a reference to models taught in the book,
not a catalogue of every model DocAble happened to contain.

Part II develops a modeling discipline, not a model catalog. It starts from an engineering
question and then chooses the smallest representation that makes the relevant property explicit.
This appendix collects the principal forms that treatment uses.

These are reference patterns, not a required MAGE inventory. A system may need several
representations of one kind and none of another. The production system behind this book carries
more models, registries, checks, and joined views than appear here; their existence is
implementation history, not method. Nothing on these pages prescribes a set of boxes to fill.

**Read this appendix four ways.**

- **As a reference while reading Parts II–V.** Where the main text suppresses schema or
  correspondence detail, a section here gives one level deeper.
- **As a pattern book.** A reader modeling another system can see what a structural, behavioral,
  ownership, decision, measurement, or provenance representation looks like, and adapt it.
- **As the seam between Modeling and Alignment.** Each treatment separates what a model
  *represents* from what machinery, if any, later gives its declarations authority.
- **As an atlas of review surfaces.** The sections that follow name the engineering views a
  reviewer projects a change onto: component ownership, permitted dependencies, service edges,
  lifecycle states, execution placement, user journeys, measurement obligations, and provenance.
  Part VI argues that when implementation grows cheap, review moves upstream from reading every
  diff toward judgment over these surfaces. This appendix supplies the surfaces; Appendix G takes
  up the case evidence for how often real changes crossed them. These are not only models an agent
  consumes. They are the views an engineer or agent uses to review agent-produced work.

**Each section asks the same four questions.** A reader who has learned the pattern scans any
treatment by reflex.

- **Engineering question** — what must the engineer be able to know?
- **Representation** — what entities and relations make that question answerable?
- **Property** — what can now be stated precisely?
- **Authority and correspondence** — which facts are authored, which are observed or derived, and
  how is disagreement detected?

The fourth question carries the weight. Agreement between a model and an implementation does not
by itself establish correctness. A descriptive model can faithfully describe a bad system. An
independently authored *ought* gives the implementation something it can be wrong against. Part II
introduces that distinction; Part III builds the mechanisms that can give selected declarations
authority.

[ref:fig-g1-executable-model] shows the shape every later figure specializes.

<!-- label: fig-g1-executable-model -->
<!-- figure: assets/appendix-g-1-executable-model.svg | *The executable-model pattern.* An engineering question selects a representation. Some of its facts encode authored intent (solid, AUTHORED); others can be derived from implementation or runtime evidence (dashed, DERIVED). Correspondence machinery compares the two and raises a finding where they disagree. Whether that finding merely informs the engineer or has authority to block a change is a separate decision, made in Part III. -->

The figure fixes one legend the rest of the appendix reads by: solid arrows carry authored
relations, dashed arrows carry derived or observed correspondence, and a heavy boundary appears
only where real authority sits. Not every model traverses every edge. A useful representation may
stay advisory; a measured quantity may stay report-only. Modeling and authority are separate
engineering decisions, and the sections keep them separate.
