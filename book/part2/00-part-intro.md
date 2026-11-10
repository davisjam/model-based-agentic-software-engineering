<!-- GENERATED from book/latex/sources/part2/00-part-intro.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

<!-- part-foreshadows: modeling-principle, mage-becomes-practical -->

Software engineering has always relied on abstraction. Large systems exceed what any engineer can reason about directly, so engineers understand them through purposeful views. A dependency graph exposes relationships among components; a state machine exposes legal behavior; a schema exposes permitted structure; a quantitative model exposes a resource bound. Each representation preserves what an engineering question needs and suppresses what it does not.

Explicit models cost work to create, maintain, and keep consistent with a changing system. Those costs help explain why models have often remained secondary to code in software practice. Commodity intelligence changes the economics: agents can help derive, regenerate, reconcile, and query structured representations. Rapid autonomous software implementation[note: Here, implementation means writing software. Throughout the book, the term can also refer to an agent carrying out other kinds of delegated work, including specification, design, and validation.] also increases their value. Knowledge that an engineer once reconstructed for an occasional change may now be needed by many agents working on many tasks. A maintained model gives those tasks a shared starting point.

<!-- principlebox -->

<!-- box-family: canonical -->

> ### Key Ideas {#modeling-principle}
>
> **Modeling Principle.** Externalize engineering knowledge and intent into explicit, structured models that both engineers and agents can reason through.
>
> Appropriate representations make broader engineering questions tractable and make additional properties available for Alignment.

<!-- point: part-2-asks-what-to-model-and-what-it-reveals | Chapter 2 asks one question of every system: what should I model, and what will the model let me know? | terms: modeling-principle, model-as-map, scope-of-modeling -->

MAGE therefore treats Modeling as an engineering activity in its own right:

**What should I model, and what will the model let me know?**

Which model is useful depends on what the engineer needs to know. A concurrency question may require ownership and lifecycle; an architectural-boundary question may require components and permitted communication edges. Different questions about the same system therefore call for different reductions.

<!-- point: part-2-moves-through-five-model-classes | Structural, behavioral, ownership, decision, measurement, and provenance are useful views, not a partition; the author emphasizes ownership, decisions, and provenance because directing agents repeatedly raises those questions, and one worker can appear in several views. | terms: model-zoo, model-classes -->

Engineering questions recur in several broad forms. Structural questions ask what exists and what is connected; behavioral questions ask what may happen; ownership questions ask who controls work; decision questions ask what should happen next; measurement questions ask how much and against what bound; provenance questions ask what happened and what evidence records it.

These are useful views into the modeling repertoire, not a partition of engineering models. I give particular prominence to ownership, decisions, and provenance because, in my experience directing agents, these are recurring sources of engineering difficulty. Who owns a resource? What should happen when evidence is incomplete or a result is unacceptable? How can we establish what an agent actually changed? Conventional modeling techniques can represent these concerns, but making them explicit helps engineers recognize when they deserve models of their own.

The same worker may appear as a component in one model, an actor in a lifecycle in another, and the owner of work in a third. This chapter develops three of these views in detail, then connects several models to answer questions that cross individual views.

<!-- point: each-chapter-begins-with-a-representation-then-specializes-it-and-four-terms-stay-distinct | Mainline examples introduce modeling questions; optional worked insets develop the production case, while property, invariant, analysis, and enforcement retain distinct meanings. -->

The main text develops each modeling question through a small example. Four worked insets apply those ideas to DocAble, the production accessibility service introduced in {{chapter:problem}}. DocAble accepts a document, distributes accessibility repairs across workers and services, validates the result, and returns the corrected document with a record of what changed. Each inset introduces the part of the system it needs, so the main argument remains readable without the case details.

Four terms recur throughout the chapter. A **property** is a claim about a system that we can express using a model. An **invariant** is a property that must always hold within a specified scope. An **analysis** or check produces evidence about whether a property holds. **Enforcement** prevents violations through a mechanism in the running system or development process. {{chapter:alignment}} examines enforcement.

For example, a job-ownership model can record which worker may modify each job. “Each job has at most one modifying worker” is a property; requiring it throughout every job's lifetime makes it an invariant. An analysis can search the modeled transitions for a state in which two workers both hold permission. In a service where a worker must claim the job before changing it, an atomic claim can enforce exclusive ownership: it assigns an unowned job to one worker and rejects competing claims.

<!-- box-family: inset -->

> #### Four questions for every model
>
> Read each worked model with these four questions in mind:
>
> - **Engineering question** — what am I trying to know or decide?
>
> - **Model** — what representation makes the question tractable?
>
> - **Property** — what can I now state precisely?
>
> - **Quality attribute** — what engineering concern does that property serve?

{{chapter:alignment}} adds a fifth question: **what enforces the property?** Modeling makes properties explicit; Alignment makes selected obligations enforceable.
