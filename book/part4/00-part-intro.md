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

<!-- box-family: inset -->

<!-- inset-domain: SOFTWARE ENGINEERING -->

<!-- index-def: specification-driven-development -->

<!-- print-keep-with-next: page -->

> #### Inset — Spec-driven development and engineering through models {#inset-sdd-engineering-through-models}
>
> **Spec-driven development (SDD)** provides workflows for organizing implementation and evaluation around specifications. These workflows can support MAGE, but do not replace its broader concern with modeling consequential properties and enforcing selected engineering obligations as a system evolves.
>
> In SDD, explicit specifications guide agentic implementation and evaluation. The tools organize that work in different ways [cite: agarwal2026sddpractice]. GitHub’s Spec Kit argues for specifications as primary artifacts from which code is derived [cite: githubspeckit2026sdd]. OpenSpec preserves capability specifications while recording proposed and completed changes; Conductor combines shared project context with specifications and plans for individual changes [cite: openspec2026concepts; ballinger2025conductor]. Specifications can evolve as implementation and operating experience expose missing requirements.
>
> Test-driven development (TDD) offers a useful analogy: its test → implement → refactor cycle organizes programming, while the team still has to decide how to evaluate interactions and the assembled system [cite: fowler2023tdd]. An SDD workflow similarly contributes to engineering a system without settling every question about its representations, obligations, and evidence.
>
> MAGE examines how cheaper model construction, analysis, and maintenance change which engineering work is worth doing. As a system grows, separately specified changes can interact through shared resources and dependencies. In DocAble, for example, increasing concurrency could improve throughput while also increasing peak memory. Concurrency models used the memory model to choose how much work could run at once, and guards refused work whose estimated memory exceeded its budget. Later measurements corrected assumptions in the model. {{sec:interlude-one-problem-many-models}} follows this example from the memory failure that made the model necessary.
