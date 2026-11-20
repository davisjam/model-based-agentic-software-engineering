<!-- GENERATED from book/latex/sources/part4/00-part-intro.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

<!-- part-foreshadows: modeling-principle, alignment-principle, govern-the-environment, failures-become-machinery -->

Chapters {{chapter:modeling|num}} and {{chapter:alignment|num}} separated Modeling from Alignment so that each principle could be examined clearly. This chapter brings them together around a practical question: **how should we put models to work as a system evolves?** Analysis can suggest a different design; a prototype can reveal that the current model omits a consequential interaction. Engineers must decide which properties to protect while exploring a change, how to evaluate the result, and what to retain for later work.

<!-- principlebox -->

<!-- box-family: canonical -->

> ### Key Ideas {#the-mage-cycle}
>
> **Model → Realize → Evaluate.**
>
> Make consequential knowledge and intent explicit. Build or modify the system, potentially through agents. Evaluate the result against the relevant obligations, returning to the models or realization as the evidence requires. Alignment operates throughout, establishing or preserving correspondence as the system changes. Governance conversion makes consequential lessons durable in the structure that later work inherits.
>
> You can enter this cycle at any point. Recall [ref:multiple-routes-to-engineering-models] in {{chapter:modeling}}: engineering may begin with requirements, an existing system, an observed failure, or exploratory agent implementation.

[ref:mage-in-practice-map] maps these activities to the sections that follow.

<!-- label: mage-in-practice-map -->
<!-- figure: assets/mage-in-practice-map.svg | *MAGE in practice.* Engineering proceeds through repeated Modeling, Realization, and Evaluation. This chapter develops four complementary activities: establishing and revising alignment, developing models as new questions arise, recovering and governing knowledge in existing systems, and maintaining the engineering environment. The activities overlap; their results inform subsequent work. -->

The chapter moves from establishing and revising alignment to developing related models, recovering knowledge from existing systems, and engineering the environment that supports this work.
