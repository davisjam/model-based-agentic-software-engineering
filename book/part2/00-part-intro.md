<!-- GENERATED from book/latex/sources/part2/00-part-intro.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

<!-- part-foreshadows: modeling-principle, mage-becomes-practical -->

<!-- principlebox -->

<!-- box-family: canonical -->

> ### Key Ideas {#modeling-principle}
>
> <!-- index-def: modeling-principle -->
>
> Engineering models preserve the information needed to answer particular questions about a system. A useful model makes consequential relationships easier to reason about while leaving irrelevant details out. Different questions may require different representations, and several models may need to be connected to understand one system.
>
> *Modeling Principle. Externalize knowledge and intent into engineering models that both engineers and agents can reason through.*

{{chapter:problem}} established why engineering models become more valuable when agents perform implementation. Agents can also help construct and maintain those models. Which engineering models are worth constructing?

<!-- point: part-2-asks-what-to-model-and-what-it-reveals | The engineering question determines which distinctions a useful model must preserve. | terms: modeling-principle, model-as-map, scope-of-modeling -->

The central skill is choosing a useful representation for the engineering question. A concurrency question may require ownership and lifecycle; an architectural-boundary question may require components and permitted communication edges. Different questions about the same system call for different models. A useful model preserves the distinctions needed to answer its question while leaving irrelevant details out.

<!-- point: part-2-moves-through-five-model-classes | Structural, behavioral, and decision models answer different questions, and connected views support questions that span them. | terms: model-zoo, model-classes -->

<!-- point: each-chapter-begins-with-a-representation-then-specializes-it-and-four-terms-stay-distinct | Connecting representations exposes relationships that no individual model captures. -->

We begin by examining what makes a representation an engineering model and how models are constructed and used ([ref:chapter:2.1-context-is-the-first-modeling-problem] and [ref:chapter:2.2-constructing-and-using-engineering-models]). We then develop three familiar classes: structural models describe relationships among parts of a system ([ref:chapter:2.3-structural]); behavioral models describe what may happen ([ref:chapter:2.4-behavioral]); and decision models describe how to choose among alternatives ([ref:chapter:2.5-decision]). Finally, [ref:chapter:2.6-system-knowledge] examines how representations can be connected to answer questions that no individual model can settle.

<!-- print-keep-with-next: 12 -->

### Four questions for every model

Read each worked model with these four questions in mind:

- **Engineering question** — What am I trying to know or decide?
- **Model** — What representation makes the question tractable?
- **Property** — What can I now state precisely?
- **Quality attribute** — What engineering concern does that property serve?

{{chapter:alignment}} adds a fifth question: **What enforces the property?** Modeling makes properties explicit; Alignment makes selected obligations enforceable.
