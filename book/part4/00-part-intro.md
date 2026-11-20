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

{{sec:the-dynamics-of-mage}} explains how engineers introduce models incrementally and protect established properties while exploring change. {{sec:interlude-one-problem-many-models}} follows that process through DocAble’s memory and execution problems; {{sec:brownfield-engineering}} shows how to recover useful models from an existing system. {{sec:engineering-the-environment}} turns to equipping, evaluating, operating, and maintaining the environment that later work inherits.
