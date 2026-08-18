**Engineering question.** How should the product or requested change be realized while satisfying its obligations?

Engineering & Realization is the lifecycle surface treated most extensively in the rest of this book. Part 2 develops the models through which engineers and agents reason about a system; Part 3 develops the mechanisms that give selected properties authority; Part 4 puts those activities into engineering practice. The purpose here is therefore not to repeat that treatment, but to locate it among the other product-lifecycle surfaces.

This surface has a particularly rich need for explicit system models because realization repeatedly encounters questions whose answers are expensive to reconstruct from source alone:

- What owns this state?
- Which transitions are legal?
- What does this interface promise?
- Which architectural boundary must this change preserve?
- What depends on this concept?
- Which resource constraint governs this operation?

Part 2 groups the models used to answer such questions into six overlapping classes: structural, behavioral, ownership, decision, measurement, and provenance. The classes distinguish the engineering questions a model answers rather than prescribing a representation or partitioning the system.

[ref:fig-h-model-ontology] gathers the six classes by the engineering question each answers.

<!-- label: fig-h-model-ontology -->
<!-- figure: assets/model-ontology.svg | *MAGE's working model ontology.* Repeated from Figure 2.1-1. The six overlapping classes distinguish models by the engineering questions they answer. In Engineering & Realization, these models provide explicit system knowledge against which changes can be reasoned about, realized, and aligned. -->

What matters in the lifecycle view is where this system knowledge comes from and where it goes. Engineering does not manufacture all of its own obligations. Product discovery supplies needs, accepted requirements, and consequential product decisions. Product management supplies the intent and rationale for particular changes. Assurance contributes obligations that realization must satisfy. Operations supplies evidence from the behavior of the realized product.

Engineering & Realization connects those inputs to models of the system being changed. In the other direction, it exports structure that neighboring surfaces can reuse: component identity, architecture, behavior, interfaces, dependencies, resource relationships, and evidence about the realized change. The same represented entity can therefore participate across lifecycle surfaces. A requirement from discovery can trace to a component and behavioral obligation in engineering; operational evidence can resolve to the same component; an assurance claim can refer to the requirement, the governing model, and evidence from the realized system.

Within this surface, the book's usual MAGE account applies. Modeling exposes consequential system knowledge and intent to reasoning; Alignment gives selected obligations authority. Where a model exposes a stable property that machinery can decide, deterministic validation, analysis, generation, or enforcement may replace semantic judgment. Part 2 explicitly keeps authority separate from representation: richer models expand the semantic surface over which authority can operate; they do not themselves confer it.

That process need not eliminate realization freedom. Engineering specifies what must be true while leaving other implementation choices open. For a change whose governing obligations are already represented, an agent can reason across those obligations and choose among acceptable realizations. At the limit, a realization model may become sufficiently complete that transformation, generation, or synthesis is preferable to autonomous reasoning. More commonly, the obligations constrain the realization without determining it.

Those remaining choices are the realization's degrees of freedom. They are not a fixed budget that engineering gradually consumes. New functionality can extend the realization surface and create new choices; discovery of a tacit obligation can reveal that an apparent freedom was never genuine; stronger Alignment can constrain a choice that was previously left open. For the realization at hand, the relevant question is simply which choices the governing obligations determine and which they deliberately leave to realization.

**MAGE profile.**

- *Characteristic models.* Structural, behavioral, ownership, decision, measurement, and provenance models of the realized system; commonly including architecture, state machines, contracts, dependencies, knowledge graphs, resource relations, and invariants.
- *Lifetime.* Change-scoped through system-lived, depending on the model and the correspondence it claims.
- *Alignment posture.* Strong where consequential properties are decidable: tests, analyses, validators, model checking, constraints, permissions, and gates.
- *Role of autonomous reasoning.* Reasoning across interacting semantic constraints and realizing changes where governing obligations are explicit but implementation remains underdetermined.
- *Determinization opportunity.* High where modeling exposes stable properties that deterministic machinery can evaluate or realize.
- *Degrees of freedom.* Implementation choices left open after the governing obligations for the realization are accounted for.
- *Smallest useful adoption.* Externalize one repeatedly reconstructed or consequential system property, connect it to the surrounding lifecycle knowledge it depends on, and give stable obligations over it proportionate evidence and authority.
- *Lifecycle connections.* Product decisions and requirements from Discovery; change intent from Product Management; operational topology and evidence from Operations; assurance obligations and evidence requirements across the surface.
