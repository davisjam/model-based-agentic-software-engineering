Provenance models record what happened. Documentation models represent the human-facing claims that
should remain synchronized with those facts. In review, they expose whether required records exist and
whether derived documentation still reflects its source.

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

Where documentation can be derived from structured facts, generate it from those facts rather than
maintaining an independent copy.

[ref:fig-g6-facts-before-prose] puts the fact before the prose.

<!-- label: fig-g6-facts-before-prose -->
<!-- figure: assets/appendix-g-6-facts-before-prose.svg | *Facts before prose.* A structured provenance record supports mechanical validation and re-derivable documentation; independently maintained prose lacks that correspondence. -->

**Property.** Representative properties:

- **Every relevant mutation leaves a provenance record.**
- **Generated documentation reflects the current structured facts** from which it is derived.
- **References in generated documentation resolve to existing identities.**

**Authority and correspondence.** Structured provenance can be validated mechanically, and generated
documentation can be re-derived from its source facts. Free prose generally cannot be checked for
semantic equivalence by the same machinery and therefore remains subject to human review.
