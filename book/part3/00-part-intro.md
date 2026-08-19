<!-- part-foreshadows: govern-the-environment, alignment-principle, failures-become-machinery -->

Part 2 made engineering knowledge and intent explicit. Those models already provide value: they let
engineers, agents, and tools reason over properties that would otherwise have to be reconstructed from
lower-level detail. This Part asks a different question. **Which of those properties should the environment
itself hold as obligations, and how should it hold them?**

Alignment is the move from guidance to authority. Some obligations require no rich system model: a
permission can forbid network access, a type can rule out an illegal value, a sandbox can make an action
unavailable. Explicit models extend that reach. Once architecture, ownership, behavior, measurement, or
policy is represented at the level where the property exists, the environment can govern questions
that an agent or human would otherwise have to reconstruct from lower-level detail.

<!-- principlebox -->
> ### ALIGNMENT PRINCIPLE
>
> Give engineering obligations authority by encoding them into mechanisms that
> constrain actions, produce evidence, evaluate that evidence, and control admission.
>
> An obligation becomes authoritative when the environment can act on it.

Five questions organize the Part; [ref:part3-nav-arc] shows their progression.

<!-- label: part3-nav-arc -->
<!-- figure: assets/part3-nav-arc.svg | *Five questions organize Alignment.* The Part locates where authority can act, determines what obligation is legitimate, decomposes how mechanisms carry authority, shows how experience adds durable obligations and controls, and finally treats the resulting control estate as an engineering object. -->

Alignment gives selected engineering judgments durable authority in the environment. Constraints narrow what work
can do; sensors produce evidence of what it did; validators judge that evidence against an obligation;
gates decide what may advance. Some mechanisms can be designed before work begins. Others emerge when a
failure exposes something the environment did not represent, observe, evaluate, or control. Those lessons
can become durable engineering structure. When later work benefits from that structure, it
becomes engineering capital. Once the control estate becomes consequential, it too becomes an engineering
object.
