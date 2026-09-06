<!-- part-foreshadows: modeling-principle, mage-becomes-practical -->

Software engineering has always relied on abstraction. Large systems exceed what any engineer can reason about directly, so engineers understand them through purposeful views. A dependency graph exposes relationships among components; a state machine exposes legal behavior; a schema exposes permitted structure; a quantitative model exposes a resource bound. Each representation preserves what an engineering question needs and suppresses what it does not.

Explicit models have nevertheless remained secondary in much code-centric software practice because another representation costs work to create, maintain, and reconcile with a changing system. Commodity intelligence changes that economics. Agents can increasingly derive, regenerate, reconcile, and query structured representations cheaply. At the same time, rapid autonomous implementation increases their value: engineering knowledge that once needed to be reconstructed occasionally may otherwise be reconstructed across many tasks and fresh reasoning states.

<!-- principlebox -->
<!-- box-family: canonical -->
> ### Modeling principle
>
> Externalize engineering knowledge and intent into explicit, structured models that both engineers
> and agents can reason through.
>
> Appropriate representations make broader engineering questions tractable and make additional properties
> available for Alignment.

<!-- point: part-2-asks-what-to-model-and-what-it-reveals | Part II asks one question of every system: what should I model, and what will the model let me know? | terms: modeling-principle, model-as-map, scope-of-modeling -->
MAGE therefore treats Modeling as an engineering activity in its own right:

**What should I model, and what will the model let me know?**

Which model is useful depends on what the engineer needs to know. A concurrency question may require ownership and lifecycle; an architectural-boundary question may require components and permitted communication edges. Different questions about the same system therefore call for different reductions.

<!-- point: part-2-moves-through-five-model-classes | Part II moves through six classes of model, not a taxonomy to memorize. | terms: model-zoo, model-classes -->
This Part develops six broad classes of engineering question:

- **Structural** — what parts exist, and which may depend on which.
- **Behavioral** — what states a thing occupies, and how it moves between them.
- **Ownership** — who controls a unit of work, and for how long.
- **Decision** — what is allowed, or which alternative should be selected.
- **Measurement** — what quantities the system holds, and against what bound.
- **Provenance** — what happened to an artifact, and what evidence records it.

<!-- point: there-is-no-model-of-the-system-only-purposeful-reductions | There is no model of the system, only purposeful reductions that each answer one question. | terms: model-as-map, scope-of-modeling, map-and-territory -->
These classes organize recurring engineering questions rather than partitioning systems. They overlap,
and they are not exhaustive. The same worker may appear as a component in one model, an actor in a
lifecycle in another, and the owner of work in a third. Architectural reasoning may traverse several such
views at once.

DocAble is the running example—the production accessibility service introduced in Part I. A document
enters, remediation is distributed across workers and services, the result is validated, and a corrected
document returns with a record of what changed. The real system is far more complicated than any
representation ahead. That is the point. Each model keeps only the relationships its question needs.

<!-- point: each-chapter-begins-with-a-representation-then-specializes-it-and-four-terms-stay-distinct | Each chapter begins with a familiar representation, its properties and analyses, then specializes it to DocAble; four terms stay distinct — property, invariant, analysis, authority — with authority reserved for Part III. | terms: model-classes, modeling-principle, alignment-principle -->
Each chapter begins with a familiar engineering representation, the properties it makes expressible, and
the analyses it supports, then specializes that representation to DocAble. Four terms stay distinct
throughout the Part. A **property** is a claim that can be expressed over a model. An **invariant** is a
property required to hold over a declared domain. An **analysis** or check produces evidence about a
property. Whether the engineered environment enforces the resulting obligation is a separate question of
**authority**, taken up in Part III.

<!-- box-family: inset -->
> #### Four questions for every model
>
> Every model section ahead opens on the same four lines:
>
> - **Engineering question** — what am I trying to know or decide?
> - **Model** — what representation makes the question tractable?
> - **Property** — what can I now state precisely?
> - **Quality attribute** — what engineering concern does that property serve?

Part III adds a fifth question: **what gives the property authority?** Modeling makes properties
explicit; Alignment makes selected obligations enforceable.

<!-- point: the-final-chapter-connects-the-six-without-a-seventh-model | The final chapter shows how the six models connect through shared identity without becoming a seventh model. | terms: model-zoo, scope-of-modeling, modeling-principle -->
The final chapter, [System Knowledge](2.8-system-knowledge.html), shows how the six models connect
without becoming a seventh model.
