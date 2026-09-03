<!-- part-foreshadows: govern-the-environment, alignment-principle, failures-become-machinery -->

Engineering has long sought ways to make intended properties consequential for realized systems. Software architecture provides a particularly clear example. An architecture may specify which components may depend on which others, which interfaces interactions must cross, or which relations are forbidden. A rich architecture-conformance tradition asks whether the realized system respects those intended relations. Software reflexion models compare implementation relations with a high-level architectural model; dependency models, architectural rules, and static analyses likewise make intended relations explicit enough to inspect or check mechanically.[cite: murphy1995reflexion] [cite: sangal2005dependency] [cite: passos2010conformance] Layering is a familiar case, but the intended structure can be a more general graph of components, dependencies, and permitted interactions.

The same engineering ambition appears elsewhere in software engineering. Type systems exclude inadmissible programs or representations. Access-control mechanisms constrain which actions a principal may perform. Protocol machinery can reject illegal transitions. Validators compare artifacts or behavior with specified properties. Tests establish evidence about expected behavior, while build and deployment gates can make satisfactory evidence a condition of progression. These mechanisms differ greatly in strength, scope, and purpose, but they share an important move: an engineering obligation is represented in a form that some part of the environment can act upon.

MAGE calls this move Alignment and treats it as the companion to Modeling. Modeling externalizes engineering knowledge: it makes architecture, behavior, ownership, decisions, measurements, policies, and other properties explicit at a level where they can be reasoned about. Alignment asks what happens next. Which of those properties should have authority over realization? Where can that authority act? What evidence is available there? What mechanism should respond when the evidence agrees, or fails to agree, with the obligation? Architecture conformance is therefore one important instance of the broader problem. Alignment extends the question across the engineering obligations made explicit through Modeling.

Commodity intelligence makes this longstanding problem newly important. A generative implementer can produce plausible realizations rapidly and can explore degrees of freedom that human implementers might never have considered. Instructions alone do not determine which of those realizations will appear. If an architectural relation, behavioral invariant, ownership rule, measurement requirement, or policy matters to the system, relying on every future realization to reconstruct and voluntarily preserve it leaves that obligation on the probabilistic surface.

The alternative is to move selected obligations into the engineered environment itself. Some can be made impossible to violate through representation or interface design. Some can be checked statically. Others become decidable only when an action is attempted, a work unit completes, an artifact is assembled, or the system executes. Sensors can produce evidence; validators can compare that evidence with an obligation; gates can make the result consequential. The mechanisms vary because the properties and boundaries vary. The common objective is to move consequential engineering judgments away from repeated probabilistic reconstruction and into machinery whose behavior can itself be engineered.

This leads to the second principle of MAGE:

<!-- principlebox -->
<!-- box-family: canonical -->
> ### Alignment principle
>
> Give engineering obligations authority by encoding them into mechanisms that
> constrain actions, produce evidence, evaluate that evidence, and control admission.
>
> An obligation becomes authoritative when the environment can act on it.

Alignment does not mean that every preference should become a hard constraint, nor that every property can be made deterministic. Some judgments remain legitimately probabilistic; others are too expensive or too context-dependent to enforce mechanically. The engineering question is instead which obligations merit authority, what form of authority is appropriate, and where in the system that authority can be exercised reliably and economically.

Part II also distinguished tolerances from degrees of freedom. Where a tolerance is explicit, the engineering environment may be able to constrain work to remain within it, observe the realized state, evaluate that state against the obligation, or control whether the result is admitted. The extent to which it can do so depends on what the environment can make legible and evaluate before substantial resources are committed. As engineers, we want to perform cheap analysis before committing resources to realizations that may violate an obligation. The choice of mechanism then depends on the property, the evidence available there, and the authority the obligation warrants. Degrees of freedom require no such machinery merely because engineering has left them open.

Five questions organize the Part; [ref:part3-nav-arc] shows their progression.

<!-- label: part3-nav-arc -->
<!-- figure: assets/part3-nav-arc.svg | *Five questions organize Alignment.* The Part locates where authority can act, determines what obligation is legitimate, decomposes how mechanisms carry authority, shows how experience adds durable obligations and controls, and finally treats the GEE's accumulated controls as an engineering system. -->

Alignment gives selected engineering judgments durable authority in the environment. Constraints narrow what work
can do; sensors produce evidence of what it did; validators judge that evidence against an obligation;
gates decide what may advance. Some mechanisms can be designed before work begins. Others emerge when a
failure exposes something the environment did not represent, observe, evaluate, or control. Those lessons
can become durable engineering structure. When later work benefits from that structure, it
becomes engineering capital. Once the control machinery becomes consequential, it too becomes an engineering
object.
