<!-- GENERATED from book/latex/sources/part5/00-part-intro.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

<!-- part-foreshadows: modeling-principle, alignment-principle, seat-moves -->

<!-- principlebox -->

<!-- box-family: canonical -->

> ### Key Ideas {#depth-and-breadth}
>
> A software factory organizes how changes are produced and determines which resulting changes are acceptable. Process design and tolerance allow implementation to proceed without requiring continuous human supervision.
>
> As agents increase implementation capacity, the factory must also develop the means to direct, evaluate, and admit their work. Those arrangements differ across organizations, depending on the engineering knowledge, controls, and human judgment already available.

{{chapter:one-problem-many-models}} followed Modeling and Alignment through individual engineering episodes, showing how representations and controls changed as DocAble evolved. We now widen the view from those episodes to the production system that made them possible. An agent may implement a change, but the surrounding factory determines how work is selected, what knowledge reaches the agent, which decisions remain open, how results are evaluated, and when a change may be accepted.

The Industrial Revolution offers a useful comparison. It did more than increase the power available to fabricate things. It changed how production was organized and controlled. As machinery increased the rate of fabrication, engineers developed production processes, standards, and measurements that allowed work to proceed without continuous supervision of every operation. The factory became an engineered system in its own right.

{{sec:the-software-factory}} develops the software-factory concept from the history of manufacturing, distinguishing process design from tolerance. {{sec:inside-docables-software-factory}} examines DocAble’s factory from the inside: how it developed, what engineering structures it acquired, and how those structures changed the work I could delegate. {{sec:evaluating-docable}} evaluates the resulting product and factory, including remediation quality, cost, and maintenance obligations. {{sec:mage-in-the-wild}} compares independently developed factories through their reported mechanisms and operating decisions. The coda returns to process design, tolerance, and engineering authority, preparing the theoretical questions developed in {{chapter:theory}}.
