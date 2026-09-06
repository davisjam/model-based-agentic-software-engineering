<!-- part-foreshadows: govern-the-environment, alignment-principle, failures-become-machinery -->

Engineering systems differ in how they carry their obligations. Some remain in human expertise, documentation, or practice and must be interpreted when the relevant decision arises. Others are encoded into the engineered environment so that compliance can be constrained or evaluated mechanically. Software architecture provides one example: an architecture can state permitted dependencies and interactions, while conformance checks determine whether an implementation respects them.[cite: murphy1995reflexion] [cite: sangal2005dependency] [cite: passos2010conformance] System-safety engineering provides a broader precedent, identifying hazards and constraints over the larger system and designing controls, feedback, and operating processes to keep those constraints satisfied.[cite: leveson2011] Software engineering uses mechanisms ranging from types and access controls to validators and deployment gates for the same purpose.

MAGE calls this move Alignment and treats it as the companion to Modeling. Modeling makes engineering knowledge and intent explicit. Alignment gives selected obligations authority by connecting them to mechanisms in the engineered environment that can constrain work, evaluate its results, or determine whether those results are accepted. An obligation with no such mechanism may still matter greatly, but satisfying it continues to depend on human or agent judgment at the point of use.

Commodity intelligence makes this longstanding problem newly important. A generative implementer can produce plausible realizations rapidly and explore degrees of freedom that human implementers might never have considered. Instructions alone do not determine which realization will appear. If an architectural relation, behavioral invariant, ownership rule, measurement requirement, or policy matters to the system, relying on every future realization to reconstruct and voluntarily preserve it leaves that obligation on the probabilistic surface.

Selected obligations can instead be encoded into the engineered environment. Some can be carried directly by representations, interfaces, or permissions; others require evidence produced as work proceeds and evaluated before the result is accepted. The appropriate mechanism depends on the obligation and on where the evidence needed to evaluate it becomes available.

<!-- principlebox -->
<!-- box-family: canonical -->
<!-- index-def: alignment-principle -->
> ### Alignment principle
>
> Give engineering obligations authority by encoding them into mechanisms that
> constrain actions, produce evidence, evaluate that evidence, and control admission.
>
> An obligation is authoritative when the engineered environment can enforce it.

Not every preference warrants mechanical enforcement, and not every important property can support it. Some obligations remain dependent on expert judgment; others would cost more to mechanize than doing so is worth. Part II's tolerances and degrees of freedom also distinguish obligations from variation that engineering deliberately leaves open. The chapters ahead develop how to choose among these possibilities.

[ref:part3-nav-arc] traces the progression from engineering intent to a governed environment.

<!-- label: part3-nav-arc -->
<!-- figure: assets/part3-nav-arc.svg | *How intent becomes authoritative.* Enforcement begins with an obligation at a boundary where the environment can act on it. Mechanisms enforce selected obligations; experience reveals additional opportunities for governance; accumulated controls eventually require governance of their own. -->

Some mechanisms can be designed before work begins. Others emerge when a failure exposes something the environment did not represent, observe, evaluate, or control. When those lessons become durable engineering structure, later work can inherit them as engineering capital. As the mechanisms accumulate, the control machinery itself becomes an engineering object.
