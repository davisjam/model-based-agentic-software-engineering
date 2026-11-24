<!-- GENERATED from book/latex/sources/part4/00-part-intro.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

<!-- part-foreshadows: modeling-principle, alignment-principle, govern-the-environment, failures-become-machinery -->

<!-- principlebox -->

<!-- box-family: canonical -->

> ### Key Ideas {#the-mage-cycle}
>
> Engineering rarely proceeds from a complete model to a finished implementation. Engineers learn as they work: implementations reveal missing requirements, analyses challenge assumptions, and failures expose decisions that should have been made explicit. Models and controls must therefore evolve with the system. What we learn while engineering one change can help us engineer the next.
>
> *Model, Realize, Evaluate—in whatever order the engineering problem calls for.*

In Chapters {{chapter:modeling|num}} and {{chapter:alignment|num}}, we studied models and controls largely in isolation. But an engineer rarely has the luxury of attending to just one property of a system. A change that improves performance may threaten correctness; a model that helps us understand the architecture may reveal a better design. In this chapter, we will see how these engineering activities interact.

We will examine these interactions through several engineering episodes. [ref:chapter:4.1-the-dynamics-of-mage] examines how Modeling, Realization, and Evaluation interact as a system evolves. [ref:chapter:4.2-one-problem-many-models] follows one engineering problem through several related models, while [ref:chapter:4.3-brownfield-engineering] examines how to recover and govern knowledge in existing systems. Finally, [ref:chapter:4.4-engineering-the-environment] follows the modeling of engineering work, improvements to its execution, and revisions to its controls. [ref:mage-in-practice-map] provides a map of these activities.

<!-- label: mage-in-practice-map -->
<!-- figure: assets/mage-in-practice-map.svg | *MAGE in practice.* Modeling, Realization, and Evaluation recur throughout engineering, without a prescribed order. This chapter examines their interaction in developing new designs, recovering knowledge from existing systems, and improving the environment in which agents work. -->
