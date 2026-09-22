Chapters {{chapter:modeling|num}} and {{chapter:alignment|num}} separated Modeling from Alignment so that
each mechanism could be examined clearly. Engineering does not usually present them that way. As work
proceeds, new evidence changes what engineers understand about the problem; one representation exposes the
need for another; implementation tests assumptions; and analysis changes the design. This chapter runs the
two principles together as a method: it asks what should be made explicit, places enforcement where stable
obligations become legible and enforceable, and converts recurring judgment into durable engineering
structure.

<!-- principlebox -->
<!-- box-family: canonical -->
> ### The MAGE cycle
>
> Model the intent. Enforce stable obligations. Convert recurring judgment into durable engineering structure.
>
> **Repeat.**

The chapter follows that cycle from four directions. {{sec:the-dynamics-of-mage}} develops the dynamics:
models need not enter a system all at once; alignment can act first actively, then passively to preserve
what it established; and because engineers often do not yet know the right models at the beginning of a
project, implementation participates in discovering them. {{sec:interlude-one-problem-many-models}} follows
those dynamics through one problem in DocAble: a memory failure that drives successive changes in
representation and execution, then a connected family of models, each answering a different question.
{{sec:brownfield-engineering}} enters a system that already exists, where the consequential structure
arrived before the models that should describe it. {{sec:engineering-the-environment}} turns to the
destination. A task begins from the representations, controls, and evidence the environment already owns;
work exposes what those structures can and cannot answer; and each useful conversion changes what later
work inherits. Useful durable structure becomes engineering capital — capital that can drift, depreciate,
and cost more to maintain than it returns, so the chapter covers operation and retirement as well as
accumulation.

DocAble supplies the deep case. Other organizations appear where they sharpen a move. The question here is
practical: **what should you do next?**
