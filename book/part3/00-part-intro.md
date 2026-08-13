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

This Part answers five questions, each a chapter; [ref:part3-nav-arc] gives them in order.

<!-- label: part3-nav-arc -->
<!-- figure: assets/part3-nav-arc.svg | *Figure 3.0-1: Five questions organize Alignment.* WHERE authority can act (3.1) → WHAT obligation it should hold (3.2) → HOW — which mechanism role holds it (3.3) → how the environment GROWs, learning new obligations and controls (3.4) → how we GOVERN the resulting control system (3.5). The Part reads as an argument: from where authority acts, to what it may enforce, to how, to governing the result. -->

Alignment externalizes selected engineering judgments into the environment. Constraints narrow what work
can do; sensors produce evidence of what it did; validators evaluate that evidence against an obligation;
gates decide what may advance. Some mechanisms can be designed before the work begins. Others emerge only
when a failure reveals an obligation nobody encoded. As those lessons become durable structure, the
environment accumulates engineering capital, and eventually enough machinery that the machinery itself must
be engineered.
