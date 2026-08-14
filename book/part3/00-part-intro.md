<!-- part-foreshadows: govern-the-environment, alignment-thesis, failures-become-machinery -->

Part 2 made engineering knowledge and intent explicit. Those models already earn their keep: they let
engineers, agents, and tools reason over properties that would otherwise have to be reconstructed from
lower-level detail. This Part asks a different question. **Which of those properties should the environment
itself hold as obligations, and how should it hold them?**

Alignment is the move from guidance to authority. Some obligations require no rich system model: a
permission can forbid network access, a type can rule out an illegal value, a sandbox can make an action
unavailable. Explicit models extend that reach. Once architecture, ownership, behavior, measurement, or
policy has been represented at the level where the property exists, the environment can govern questions
that would otherwise need an agent or a human to reconstruct the missing semantics.

<!-- thesisbox -->
> ### ALIGNMENT THESIS
>
> Give engineering intent authority by encoding obligations into authoritative mechanisms that
> constrain actions, produce evidence, evaluate that evidence, and control admission.
>
> Represented intent becomes authoritative when the environment can act on it.

Five questions organize the Part; [ref:part3-nav-arc] lists them.

<!-- label: part3-nav-arc -->
<!-- figure: assets/part3-nav-arc.svg | *Figure 3.0-1: Five questions organize Alignment.* WHERE authority can act (3.1), WHAT obligation it should hold (3.2), HOW a mechanism holds it (3.3), how the environment GROWs by learning new obligations and controls (3.4), and how we GOVERN the resulting control system (3.5). -->

Alignment externalizes selected engineering judgments into the environment. Constraints narrow what work
can do; sensors produce evidence of what it did; validators judge that evidence against an obligation;
gates decide what may advance. Some mechanisms can be designed before work begins. Others emerge when a
failure exposes something the environment did not represent, observe, evaluate, or control. Those durable
lessons become engineering capital, and eventually the control system itself becomes an engineering object.
