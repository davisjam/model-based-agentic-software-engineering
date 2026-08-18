**Engineering question.** How should the product or requested change be realized while satisfying its obligations?

Engineering & Realization has a different center of gravity. Its characteristic difficulty is often semantic reconstruction.

Source code is precise and executable, but many engineering questions are expensive to answer from source alone:

- What owns this state?
- Which transitions are legal?
- What does this interface promise?
- Which architectural boundary must this change preserve?
- What depends on this concept?
- Which resource constraint governs this operation?

Engineering models make such properties easier to reason about directly.

The portfolio can include architecture models, state machines, contracts, dependency and knowledge graphs, quantitative relations, resource models, invariants, provenance, and decision records. These models need not all be formal. Their common purpose is to expose system semantics or obligations that would otherwise have to be reconstructed repeatedly from implementation.

[ref:fig-h-system-model] applies Part 6's determinization frontier to the engineering surface.

<!-- label: fig-h-system-model -->
<!-- figure: assets/h3-system-model-frontier.svg | *Modeling across the determinization frontier.* Implicit system semantics, once captured in a semantic model—architecture, state, contract—become a legible property. That property can feed agent reasoning, and where it is decidable it can be bound by a validator, analysis, checker, or gate. Modeling changes the object of reasoning so that a property which once required semantic reconstruction becomes tractable. -->

This is the representation route across the determinization frontier. Modeling can change the object of reasoning so that a property that formerly required semantic reconstruction becomes tractable and, in some cases, decidable. Alignment can then bind the obligation through tests, validators, static analysis, model checking, permissions, or gates.

The process need not eliminate realization freedom.

At one limit, a realization model can become sufficiently complete that realization is principally transformation, generation, or synthesis. Deterministic machinery may then be preferable to an agent. Most software changes occupy a less determined region: engineering specifies what must be true while multiple implementations remain acceptable.

[ref:fig-h-realization-space] marks the region where autonomous realization earns its place.

<!-- label: fig-h-realization-space -->
<!-- figure: assets/h3-acceptable-realization-space.svg | *The acceptable realization space.* Change intent and the governing models—architecture, behavior, contracts—fix what must be true of a change. Within the space of realizations those obligations leave open, the agent realizes freely; independent evidence then decides admission. The figure separates the obligations that constrain a change from the degrees of freedom it leaves. -->

The agent need not invent the product’s governing obligations. For a change whose scope is already represented, it can choose among realizations those obligations leave open. Other changes alter the realization problem itself: new functionality can extend the modeled system and introduce new choices, while a newly discovered obligation can remove choices that only appeared to be free. Degrees of freedom therefore describe the choices engineering has deliberately left open for the realization under consideration, not a fixed budget that successive changes consume.

**MAGE profile.**

**Characteristic models.** Architecture, behavior, state machines, contracts, dependencies, knowledge graphs, resource and quantitative models, invariants.

**Lifetime.** Change-scoped through system-lived, depending on the claimed correspondence.

**Alignment posture.** Strong where consequential properties are decidable: tests, analyses, validators, model checking, constraints, and gates.

**Role of autonomous reasoning.** Realizing changes across interacting semantic constraints; reasoning where obligations are explicit but realization remains underdetermined.

**Determinization opportunity.** High when modeling exposes stable properties that machinery can evaluate.

**Degrees of freedom.** Implementation choices left open after governing obligations are accounted for.

**Smallest useful adoption.** Externalize one repeatedly reconstructed or consequential system property and give stable obligations over it proportionate evidence and authority.

**Connects to.** Product intent and tickets upstream; operational topology and evidence downstream; assurance obligations across the surface.
