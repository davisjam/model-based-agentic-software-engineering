**Engineering question.** How should the product or requested change be realized while satisfying its obligations?

Engineering & Realization is the surface treated throughout Parts II–IV. Its characteristic models include structural, behavioral, ownership, decision, measurement, and provenance views of the realized system (the six model classes, [ref:model-ontology]). The lifecycle question here is not what those models are, but where their knowledge and obligations come from and where they go.

Engineering does not manufacture all of its own obligations. Product discovery supplies needs, accepted requirements, and consequential product decisions. Product management supplies the intent and rationale for particular changes. Assurance contributes obligations that realization must satisfy. Operations supplies evidence from the behavior of the realized product.

Engineering connects those inputs to the system being changed and exposes structure that neighboring surfaces can reuse: component identity, architecture, behavior, interfaces, dependencies, resource relationships, and evidence about the realized change. Shared identity lets the same entity connect lifecycle surfaces. A requirement from discovery can trace to a component and behavioral obligation in engineering; operational evidence can resolve to the same component; an assurance claim can refer to the requirement, the governing model, and evidence from the realized system.

Parts II–IV supply the corresponding Modeling and Alignment practices.

Engineering need not eliminate realization freedom. Governing models determine some choices while deliberately leaving others open; new functionality may create choices, a newly discovered obligation may remove apparent freedom, and stronger Alignment may constrain a choice previously left open. The relevant question for any realization is which choices the governing obligations determine and which remain free.

**MAGE profile.**

- *Characteristic models.* Structural, behavioral, ownership, decision, measurement, and provenance models of the realized system; commonly including architecture, state machines, contracts, dependencies, knowledge graphs, resource relations, and invariants.
- *Lifetime.* Change-scoped through system-lived, depending on the model and the correspondence it claims.
- *Alignment posture.* Strong where consequential properties are decidable: tests, analyses, validators, model checking, constraints, permissions, and gates.
- *Role of autonomous reasoning.* Reasoning across interacting semantic constraints and realizing changes where governing obligations are explicit but implementation remains underdetermined.
- *Determinization opportunity.* High where modeling exposes stable properties that deterministic machinery can evaluate or realize.
- *Degrees of freedom.* Implementation choices left open after the governing obligations for the realization are accounted for.
- *Smallest useful adoption.* Externalize one repeatedly reconstructed or consequential system property, connect it to the surrounding lifecycle knowledge it depends on, and give stable obligations over it proportionate evidence and authority.
- *Lifecycle connections.* Product decisions and requirements from Discovery; change intent from Product Management; operational topology and evidence from Operations; assurance obligations and evidence requirements across the surface.
