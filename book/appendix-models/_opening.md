Parts II–IV introduce only the model detail needed for the engineering argument. This appendix
collects the principal schemas, invariants, derivation directions, and correspondence machinery
for those models.

Each model begins with an engineering question and uses the smallest representation that makes the
relevant property explicit. The forms here are reference patterns, not a required inventory.

The appendix serves as both a reference and a pattern book: the representations are specific enough
to expose their engineering properties but general enough to adapt to other systems. Each section
also separates what the model represents from the machinery that may later give selected declarations
authority.

**Each section answers the same four questions:**

- **Engineering question** — what must the engineer be able to know?
- **Representation** — what entities and relations make that question answerable?
- **Property** — what can now be stated precisely?
- **Authority and correspondence** — which facts are authored, which are observed or derived, and
  how is disagreement detected?

Correspondence alone does not establish correctness. A descriptive model can accurately describe an
undesirable system; a normative model supplies authored intent against which the implementation can
be checked. Part III supplies the mechanisms that can give selected declarations authority.

[ref:fig-g1-executable-model] establishes the pattern specialized by the later figures.

<!-- label: fig-g1-executable-model -->
<!-- figure: assets/appendix-g-1-executable-model.svg | *The executable-model pattern.* An engineering question selects a representation containing authored, derived, or observed facts. Correspondence machinery compares represented facts with implementation or runtime evidence. Disagreement may remain advisory or, where the obligation has authority, feed a deterministic gate. -->
