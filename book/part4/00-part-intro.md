<!-- GENERATED from book/latex/sources/part4/00-part-intro.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

<!-- part-foreshadows: modeling-principle, alignment-principle, govern-the-environment, failures-become-machinery -->

<!-- principlebox -->

<!-- box-family: canonical -->

> ### Key Ideas {#the-mage-cycle}
>
> Engineering rarely proceeds from a complete model to a finished implementation. Engineers learn as they work: implementations reveal missing requirements, analyses challenge assumptions, and failures expose decisions that should have been made explicit. Models and controls must therefore evolve with the system. Consequential lessons can become part of the environment inherited by subsequent work.
>
> *Model → Realize → Evaluate*

Chapters {{chapter:modeling|num}} and {{chapter:alignment|num}} examined Modeling and Alignment separately. In practice, they interact. An implementation may reveal a missing requirement, an analysis may suggest a different design, or a failed change may expose an obligation that should be enforced. Engineers must decide what to revise, what to preserve, and which lessons should govern later work.

This chapter follows those decisions through several engineering episodes. [ref:chapter:4.1-the-dynamics-of-mage] examines how Modeling, Realization, and Evaluation interact as a system evolves. [ref:chapter:4.2-one-problem-many-models] follows one engineering problem through several related models, while [ref:chapter:4.3-brownfield-engineering] examines how to recover and govern knowledge in existing systems. Finally, [ref:chapter:4.4-engineering-the-environment] considers how to equip, evaluate, operate, and maintain the environment supporting this work. [ref:mage-in-practice-map] provides a map of these activities.

<!-- label: mage-in-practice-map -->
<!-- figure: assets/mage-in-practice-map.svg | *MAGE in practice.* Engineering proceeds through repeated Modeling, Realization, and Evaluation. This chapter develops four complementary activities: establishing and revising alignment, developing models as new questions arise, recovering and governing knowledge in existing systems, and maintaining the engineering environment. The activities overlap; their results inform subsequent work. -->
