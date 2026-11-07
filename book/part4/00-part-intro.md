<!-- GENERATED from book/latex/sources/part4/00-part-intro.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

<!-- part-foreshadows: modeling-principle, alignment-principle, govern-the-environment, failures-become-machinery -->

Chapters {{chapter:modeling|num}} and {{chapter:alignment|num}} separated Modeling from Alignment so that each principle could be examined clearly. This chapter brings them together around a practical question: **how should we put models to work as a system evolves?** Analysis can suggest a different design; a prototype can reveal that the current model omits a consequential interaction. Engineers must decide which properties to protect while exploring a change, how to evaluate the result, and what to retain for later work.

<!-- principlebox -->

<!-- box-family: canonical -->

> ### The MAGE cycle
>
> Model the intent. Enforce stable obligations. Convert recurring judgment into durable engineering structure.
>
> **Repeat.**
>
> You can enter this cycle at any point. Recall [ref:multiple-routes-to-engineering-models] in {{chapter:problem}}: engineering may begin with requirements, an existing system, or exploratory agent implementation.

This chapter combines general guidance with a worked DocAble case to show how engineers enter and revisit these activities. {{sec:the-dynamics-of-mage}} develops the dynamics: models need not enter a system all at once; alignment can act first actively, then passively to preserve what it established; and because engineers often do not yet know the right models at the beginning of a project, implementation participates in discovering them. {{sec:interlude-one-problem-many-models}} follows those dynamics through one problem in DocAble: a memory failure that drives successive changes in representation and execution, then a connected family of models, each answering a different question. {{sec:brownfield-engineering}} returns to the general method: how to recover useful models and controls from a system that already exists. {{sec:engineering-the-environment}} extends that guidance to the engineering environment itself: how to allocate evaluation and enforcement and maintain the representations, controls, and evidence that later work inherits. Useful durable structure becomes engineering capital; its benefits must continue to justify its maintenance cost. The chapter therefore covers operation and retirement as well as accumulation.

<!-- box-family: inset -->

<!-- inset-domain: SOFTWARE ENGINEERING -->

<!-- index-def: specification-driven-development -->

> #### Inset — Spec-driven development and engineering through models {#inset-sdd-engineering-through-models}
>
> Here is how **spec-driven development (SDD)** and the MAGE methodology relate. MAGE is a general method for engineering through system models and independently enforcing selected obligations as a system evolves. The family of SDD approaches provides specific workflows for organizing implementation and evaluation around specifications; engineers can use these workflows within the broader method.
>
> In SDD, explicit specifications guide agentic implementation and evaluation. The tools organize that work in different ways.[cite: agarwal2026sddpractice] GitHub’s Spec Kit argues for specifications as primary artifacts from which code is derived.[cite: githubspeckit2026sdd] OpenSpec preserves capability specifications while recording proposed and completed changes; Conductor combines shared project context with specifications and plans for individual changes.[cite: openspec2026concepts; ballinger2025conductor] Specifications can evolve as implementation and operating experience expose missing requirements.
>
> As an illustrative analogy, consider test-driven development (TDD) within a broader plan for verifying a system. TDD organizes programming around a repeated cycle: write a test for the next behavior, make the test pass, and refactor.[cite: fowler2023tdd] The team still has to decide how to check interactions among components and whether the assembled system meets its requirements. The analogy concerns scope: a specific workflow contributes to engineering the system, while broader decisions determine where to use it and what other evidence is needed.
>
> MAGE examines how cheaper model construction, analysis, and maintenance change which engineering work is worth doing. As a system grows, separately specified changes can interact through shared resources and dependencies. In DocAble, for example, increasing concurrency could improve throughput while also increasing peak memory. Concurrency models used the memory model to choose how much work could run at once, and guards refused work whose estimated memory exceeded its budget. Later measurements corrected assumptions in the model. {{sec:interlude-one-problem-many-models}} follows this example from the memory failure that made the model necessary.
>
> The theory in {{chapter:theory}} provides a framework for analyzing how these choices affect reliability and cost. The next section examines how engineers choose where to begin and which known properties to protect during subsequent changes.
