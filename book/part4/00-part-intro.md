Chapters {{chapter:modeling|num}} and {{chapter:alignment|num}} separated Modeling from Alignment so that
each mechanism could be examined clearly. Engineering does not usually present them that way. As work
proceeds, new evidence changes what engineers understand about the problem; one representation exposes the
need for another; implementation tests assumptions; and analysis changes the design.

This chapter develops the dynamics of that process. Models do not necessarily enter a system all at once.
Alignment can first be used actively to bring a realization into correspondence with a model, then passively
to preserve that correspondence. Because active alignment can itself change the system, the order in which
models become governing constraints matters. Because engineers often do not yet know the right models at
the beginning of a project, implementation can also participate in discovering them.

The second half of the chapter follows those dynamics through one problem in DocAble: a memory failure that
drives successive changes in representation and execution, then a connected family of models, each answering
a different question. The case shows Modeling and Alignment working together at engineering resolution,
before the final models or architecture are known.
