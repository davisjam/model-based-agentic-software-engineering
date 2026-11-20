<!-- GENERATED from book/latex/sources/part3/00-part-intro.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

<!-- part-foreshadows: govern-the-environment, alignment-principle, failures-become-machinery -->

{{chapter:modeling}} showed how engineering models make consequential knowledge and intent explicit. Having constructed those models, how do we know that an agent’s work satisfies the obligations they express? An architectural model can state which dependencies are permitted, and a behavioral model can specify which transitions are legal. The implementation must still preserve those relationships while the agent makes the choices we have left open.

Suppose an agent is asked to add a reporting feature that uses billing data. The architectural model requires `Reporting` to access `BillingDB` through `BillingAPI`, where access-control and consistency rules can be applied. The agent instead connects directly to the database. The report may display the expected values while bypassing those rules. Repeating the requirement in the prompt may help, but it leaves the obligation dependent on another interpretation of the same instruction. How can the engineering environment prevent such a change from being accepted without requiring the engineer to inspect every implementation decision?

[ref:engineer-agent-interaction] connects this question to the engineer’s interaction with agents. Natural language supports conversation and exploration; specifications and models make selected obligations and relationships explicit. Review, testing, and analysis return evidence about the resulting implementation. The engineer uses that evidence to decide whether the work is acceptable, needs correction, or reveals a problem with the original understanding. These interactions can recur throughout a change.

<!-- label: engineer-agent-interaction -->
<!-- figure: assets/engineer-agent-interaction.svg | *Engineer–agent interaction through Modeling and Alignment.* Engineers communicate intent and knowledge through natural language, specifications, and models; delegated realization returns evidence through review, testing, and analysis. The channels are complementary rather than sequential. Modeling makes selected engineering knowledge available to guide realization, while Alignment provides evidence for evaluating and revising it. -->

Alignment connects selected obligations to mechanisms that can restrict actions and determine whether work may proceed. Constraints limit available actions or states. Sensors obtain evidence about proposed work, artifacts, or executions. Gates evaluate the applicable conditions and permit or refuse passage. [ref:alignment-overview] shows how these functions connect models to enforcement. They may be combined in one mechanism, and their assurance extends only to the obligations and evidence they cover.

<!-- principlebox -->

<!-- box-family: canonical -->

<!-- index-def: alignment-principle -->

> ### Key Ideas {#alignment-principle}
>
> **Alignment Principle.** Make selected engineering obligations enforceable through constraints that restrict actions or states, sensors that produce evidence, and gates that evaluate evidence and control whether work may proceed.

<!-- label: alignment-overview -->
<!-- figure: assets/alignment-overview.svg | *Alignment from models to enforcement.* Engineering models express obligations that the environment can enforce through constraints on actions or states, and through evidence evaluated at gates. Sensors obtain evidence from artifacts and executions, including through static and dynamic analysis. Gates can also require results from constraint checks. These functions may be combined in one mechanism; each governs only the obligations and evidence within its scope. -->

These practices have established engineering precedents. Architectural conformance checks compare implementations with intended structural relationships [cite: murphy1995reflexion;sangal2005dependency;passos2010conformance]. System-safety engineering identifies hazards and constraints, then designs controls and feedback to preserve them [cite: leveson2011]. Types, permissions, validators, and deployment gates provide familiar software mechanisms. MAGE uses these techniques to preserve consequential obligations as agents construct and change systems.

Agents remain valuable because they can investigate alternatives and devise implementations the engineer has not prescribed. Mechanizing every decision would sacrifice much of that freedom, even where it were practical. Some obligations require human judgment; others do not justify the cost of a dedicated control. The engineer must decide which obligations warrant enforcement, whether the available evidence is adequate, and which choices can remain open to reasoning and investigation.

The chapter develops these engineering decisions: what must hold, what evidence can evaluate it, where the environment can intervene, and which mechanisms provide the required protection. We examine how to test those mechanisms, how controls accumulate through engineering experience, and how to maintain them when they become a system in their own right.
