Documentation and provenance models answer a different evidence question: what happened, and which
human-facing account of it must stay true? In review, they are where a reviewer asks *does this
change leave the record it owes, and does the prose about it still hold?*

**Engineering question.** What happened, and which human-facing account of it must remain true?

**Representation.**

```
Action
    id
    artifact
    operation
    actor
    mechanism
    timestamp
    result
DerivedDocumentation
    source_fact
    rendered_claim
```

The strongest documentation is generated from facts the system already holds, not maintained as a
second, independent copy. A model read live and generated back into its artifacts, never snapshotted,
is an executable source of truth; the generated leg below applies that pattern to documentation.

[ref:fig-g6-facts-before-prose] puts the fact before the prose.

<!-- label: fig-g6-facts-before-prose -->
<!-- figure: assets/appendix-g-6-facts-before-prose.svg | *Facts before prose.* An engineering action leaves a provenance fact — what, who, how. Two things branch from that fact: mechanical validation or audit, and generated documentation (solid) that can be re-derived on demand. Prose maintained independently of the fact is the exposed leg (dashed): nothing regenerates it, so it drifts. The strongest documentation is generated from a fact the system already knows. -->

**Property.** Representative properties:

- **Every relevant mutation leaves a provenance record.**
- **Derived documentation reflects the current structured facts**, because it is regenerated rather
  than hand-kept.
- **References from generated documentation resolve to existing identities.**

Not all prose can or should be generated. Where prose stays independently authored, correspondence
stays judgment-dependent — no machinery proves it equivalent to the implementation. Appendix G
separates that documentation drift from model-to-code correspondence for exactly this reason.

**Authority and correspondence.** Structured provenance validates mechanically. Generated
documentation regenerates. Free prose generally cannot be proven semantically equivalent to the
implementation by the same machinery. That boundary is useful: modeling should expose what can be
made explicit without pretending every explanation is mechanically decidable.
