<!-- GENERATED from book/latex/sources/part2/00-part-intro.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

<!-- part-foreshadows: modeling-principle, mage-becomes-practical -->

<!-- principlebox -->

<!-- box-family: canonical -->

> ### Key Ideas {#modeling-principle}
>
> <!-- index-def: modeling-principle -->
>
> **Modeling Principle.** Externalize knowledge and intent into engineering models that both engineers and agents can reason through.
>
> Appropriate representations make otherwise intractable engineering questions manageable and make additional properties available for Alignment.

{{chapter:problem}} established why engineering models become more valuable when agents perform implementation: they preserve consequential knowledge across tasks and make larger engineering questions manageable. Models also take work to create and maintain. Commodity intelligence changes that tradeoff because agents can help derive, maintain, and query representations that previously might not have justified their upkeep. Which engineering models are worth constructing?

<!-- point: part-2-asks-what-to-model-and-what-it-reveals | The engineering question determines which distinctions a useful model must preserve. | terms: modeling-principle, model-as-map, scope-of-modeling -->

The central skill is choosing a useful representation for the engineering question. A concurrency question may require ownership and lifecycle; an architectural-boundary question may require components and permitted communication edges. Different questions about the same system call for different models. A useful model preserves the distinctions needed to answer its question while leaving irrelevant details out.

<!-- point: part-2-moves-through-five-model-classes | Structural, behavioral, and decision models answer different questions, and connected views support questions that span them. | terms: model-zoo, model-classes -->

<!-- point: each-chapter-begins-with-a-representation-then-specializes-it-and-four-terms-stay-distinct | Connecting representations exposes relationships that no individual model captures. -->

This chapter develops three familiar classes of engineering model: structural models ask what is connected to what; behavioral models ask what may happen; and decision models ask what should happen next. We then examine how models can be connected to answer questions that cross individual views. Different representations preserve different aspects of a system; connecting them makes relationships visible that no individual model captures.

### Four questions for every model

Read each worked model with these four questions in mind:

- **Engineering question** — What am I trying to know or decide?
- **Model** — What representation makes the question tractable?
- **Property** — What can I now state precisely?
- **Quality attribute** — What engineering concern does that property serve?

{{chapter:alignment}} adds a fifth question: **What enforces the property?** Modeling makes properties explicit; Alignment makes selected obligations enforceable.
