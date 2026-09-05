<!-- part-foreshadows: govern-the-environment, alignment-principle, failures-become-machinery -->

Engineering has long sought ways to make intended properties consequential for realized systems. Software architecture is one example: an architecture can state permitted dependencies and interactions, while conformance checks determine whether the implementation respects them.[cite: murphy1995reflexion] [cite: sangal2005dependency] [cite: passos2010conformance] Safety engineering provides a broader precedent. Rather than treating safety as a property supplied by one correct component or one careful operator, system-safety approaches identify hazards and constraints over the larger system and design controls, feedback, and operating processes to keep those constraints satisfied.[cite: leveson2011] The same move appears throughout software engineering: type systems exclude inadmissible representations, access controls constrain actions, protocol machinery rejects illegal transitions, validators compare artifacts against specified properties, and tests and deployment gates make evidence a condition of progress. The mechanisms differ, but the engineering move is the same: represent an obligation in a form that some part of the environment can act upon.

MAGE calls this move Alignment and treats it as the companion to Modeling. Modeling externalizes engineering knowledge: it makes architecture, behavior, ownership, decisions, measurements, policies, and other properties explicit at a level where they can be reasoned about. Alignment asks what happens next. Which of those properties should have authority over realization? Where can that authority act? What evidence is available there? What mechanism should respond when the evidence agrees, or fails to agree, with the obligation? Architecture conformance is therefore one important instance of the broader problem. Alignment asks the same kind of question across the engineering obligations made explicit through Modeling.

Commodity intelligence makes this longstanding problem newly important. A generative implementer can produce plausible realizations rapidly and can explore degrees of freedom that human implementers might never have considered. Instructions alone do not determine which of those realizations will appear. If an architectural relation, behavioral invariant, ownership rule, measurement requirement, or policy matters to the system, relying on every future realization to reconstruct and voluntarily preserve it leaves that obligation on the probabilistic surface.

Selected obligations can move into the engineered environment itself. Representation or interface design can make some violations impossible; static checks can detect others. Still others become decidable only when an action is attempted, a work unit completes, an artifact is assembled, or the system executes. Sensors produce evidence, validators compare that evidence with an obligation, and gates can make the result consequential. The appropriate mechanism depends on the property and where the necessary evidence becomes available.

<!-- principlebox -->
<!-- box-family: canonical -->
<!-- index-def: alignment-principle -->
> ### Alignment principle
>
> Give engineering obligations authority by encoding them into mechanisms that
> constrain actions, produce evidence, evaluate that evidence, and control admission.
>
> An obligation becomes authoritative when the environment can act on it.

Not every preference warrants a hard constraint, and not every property can be enforced mechanically. Some judgments remain probabilistic; others are too expensive or context-dependent to mechanize. The engineering question is which obligations merit authority, what form that authority should take, and where it can act.

Part II's tolerances and degrees of freedom help answer that question. An explicit tolerance may allow the environment to constrain work, observe the realized state, evaluate it against the obligation, or control admission. The mechanism should act where the relevant property becomes legible, preferably before substantial resources have been committed to an unacceptable realization. Degrees of freedom require no such machinery merely because engineering has left them open.

[ref:part3-nav-arc] traces the progression from engineering intent to a governed environment.

<!-- label: part3-nav-arc -->
<!-- figure: assets/part3-nav-arc.svg | *How intent becomes authoritative.* Authority begins with an obligation at a boundary where the environment can act. Mechanisms give selected obligations consequence; experience reveals additional opportunities for governance; accumulated controls eventually require governance of their own. -->

Some mechanisms can be designed before work begins. Others emerge when a failure exposes something the environment did not represent, observe, evaluate, or control. When those lessons become durable engineering structure, later work can inherit them as engineering capital. As the mechanisms accumulate, the control machinery itself becomes an engineering object.
