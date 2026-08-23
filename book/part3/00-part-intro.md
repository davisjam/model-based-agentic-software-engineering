<!-- part-foreshadows: govern-the-environment, alignment-principle, failures-become-machinery -->

Part 2 made engineering knowledge and intent explicit. Those models already provide value: they let
engineers, agents, and tools reason over properties that would otherwise have to be reconstructed from
lower-level detail. This Part asks a different question. **Which of those properties express engineering
obligations the environment should hold, and how should it hold them?**

Alignment is the move from guidance to authority. Some obligations require no rich system model: a
permission can forbid network access, a type can rule out an illegal value, a sandbox can make an action
unavailable. Explicit models extend that reach. Once architecture, ownership, behavior, measurement, or
policy is represented at the level where the property exists, the environment can govern questions
that an agent or human would otherwise have to reconstruct from lower-level detail.

<!-- principlebox -->
<!-- box-family: canonical -->
> ### Alignment principle
>
> Give engineering obligations authority by encoding them into mechanisms that
> constrain actions, produce evidence, evaluate that evidence, and control admission.
>
> An obligation becomes authoritative when the environment can act on it.

Part II also distinguished tolerances from degrees of freedom. Where a tolerance is explicit, the engineering environment may be able to constrain work to remain within it, observe the realized state, evaluate that state against the obligation, or control whether the result is admitted. The extent to which it can do so depends on what the environment can make legible and evaluate before substantial resources are committed. As engineers, we want to perform cheap analysis before committing resources to realizations that may violate an obligation. The choice of mechanism then depends on the property, the evidence available there, and the authority the obligation warrants. Degrees of freedom require no such machinery merely because engineering has left them open.

Five questions organize the Part; [ref:part3-nav-arc] shows their progression.

<!-- label: part3-nav-arc -->
<!-- figure: assets/part3-nav-arc.svg | *Five questions organize Alignment.* The Part locates where authority can act, determines what obligation is legitimate, decomposes how mechanisms carry authority, shows how experience adds durable obligations and controls, and finally treats the GEE's accumulated controls as an engineering system. -->

Alignment gives selected engineering judgments durable authority in the environment. Constraints narrow what work
can do; sensors produce evidence of what it did; validators judge that evidence against an obligation;
gates decide what may advance. Some mechanisms can be designed before work begins. Others emerge when a
failure exposes something the environment did not represent, observe, evaluate, or control. Those lessons
can become durable engineering structure. When later work benefits from that structure, it
becomes engineering capital. Once the control estate becomes consequential, it too becomes an engineering
object.
