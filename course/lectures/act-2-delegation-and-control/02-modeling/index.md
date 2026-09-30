---
title: Modeling
sessions:
  - "Modeling: Purposeful Reduction"
  - "Modeling: Systems of Models"
readings:
  groups:
    - heading: The Modeling principle
      items:
        - cite: davis2026mage
          locator: '§2.1 and §2.5'
          annotation: '{mage:2.1} and {mage:2.5} Davis, 2026. The spine of the unit, assigned by lecture. Read §2.1 for Lecture 1: it develops models as purposeful reductions, and its questions are the ones to carry into every example — *what must this model preserve, and what can it safely leave out?* Read §2.5 for Lecture 2: it treats what happens when models accumulate — semantics, correspondence, shared identities, authority, and the joins that answer questions no single model contains. §§2.2–2.4 are a repertoire, not a taxonomy to memorize; consult them as reference.'
    - heading: The size of the Modeling repertoire
      items:
        - cite: visualparadigm-uml-guide
          annotation: '["The Complete Guide to UML Diagram Types."](readings/visual-paradigm-uml-diagram-types.pdf) Browse, do not memorize. For each diagram type, ask the questions the lecture teaches: what question does this representation make easier to answer, what does it preserve, and what does it deliberately leave out? The point is not UML syntax; it is how much accumulated knowledge already exists about reducing a system for a purpose. (Source: [visual-paradigm.com/guide](https://www.visual-paradigm.com/guide/the-complete-guide-to-uml-diagrams-all-14-types-explained-with-practical-examples).)'
    - heading: Models as engineering artifacts
      items:
        - cite: madni2018mbse
          annotation: 'Madni and Sievers, ["Model-Based Systems Engineering: Motivation, Current Status, and Research Opportunities"](https://doi.org/10.1002/sys.21438) (2018). Model-based systems engineering is an older tradition in which models are engineering artifacts, not illustrations. Look past the particular technologies and ask: what becomes possible when engineering knowledge has explicit structure rather than living across documents, implementations, and people''s heads?'
    - heading: 'Return to earlier readings: degrees of freedom and parsimony'
      items:
        - cite: kruchten1995
          annotation: 'Kruchten, ["The 4+1 View Model of Architecture"](https://doi.org/10.1109/52.469759), previously assigned in Unit 06, Architecture. First read for why architecture needs several views; return to it as an example of degrees of freedom. Each view preserves what its questions require and leaves the rest outside the representation: *what must each view preserve, and what is it free to omit?* The paper is also a precedent for systems of models: several purposeful views contribute to knowledge about one system without collapsing every concern into one representation — which is also why there need not be a grand model. Whether greater unification helps depends on the system and the questions.'
        - cite: meyer1997oosc
          annotation: 'Meyer, *Object-Oriented Software Construction*, previously assigned in Unit 07, Design. First read for design and abstraction; return to it through the lens of parsimony. Purposeful reduction asks not only what a model must contain but whether every distinction earns its place. For each element, ask: *what engineering question requires this distinction, and what would we lose without it?* If nothing consequential, omission improves the model. Meyer complements Kruchten: degrees of freedom reason from the obligation toward what must be preserved; parsimony turns back toward the representation and asks whether we preserved more than the question requires.'
      note: 'These two Act I readings become useful again here. If you skipped either the first time, now is a good time; if you read it, revisit it through the Modeling lens.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture 1 slides — Purposeful Reduction (forthcoming)
  - title: Lecture 2 slides — Systems of Models (forthcoming)
---

**Premise.** *A model is useful because it leaves things out and makes explicit what must remain.*

Agents make implementation easy to delegate, but delegation creates a communication problem: the agent must recover what matters from what we give it. We cannot, and should not, specify every implementation choice. The engineering problem is to make consequential structure and intent explicit while leaving the remaining degrees of freedom to the agent. That is the role of Modeling.

Informed control requires more than possessing an implementation: an engineer must be able to answer consequential questions without reconstructing the entire system every time the question changes. A dependency graph discards most of a program while preserving relationships among components. A state machine discards most implementation detail while preserving states, transitions, and the transitions that must not occur. A quantitative model discards behavior and structure while preserving quantities and bounds relevant to cost, latency, or capacity. Each is useful because it omits most of the system and because it makes the distinctions relevant to its question explicit.

Modeling is therefore an act of purposeful reduction. We decide what a question requires us to preserve, what can remain free, and how to represent what remains. The objective is not to reproduce the system in another notation. It is to preserve enough of the system that consequential questions become cheap to answer.

## Two lectures, three activities

The unit spans two lectures because the problem splits in two:

- **Lecture 1 — Purposeful Reduction** asks *what must the model preserve?* One model, one question: from engineering question to reduction, repertoire, degrees of freedom and parsimony, representation, and interpretation.
- **Lecture 2 — Systems of Models** asks *how do several purposeful reductions become dependable engineering knowledge?* Many models, connected to a real system: semantics, correspondence, identity and authority, composition.

Three classroom activities exercise three progressively harder judgments: Reduce and Interpret in the first lecture, Join in the second. Reduce → Interpret → Join is the sequence of activities, not a theory of Modeling.

## Questions come first

Consider a software system and three questions an engineer might ask of it:

- *Which components may depend on this service?*
- *Can this workflow reach an illegal state?*
- *What limits the system's capacity?*

No single representation answers all three well. A dependency model makes the first question cheap while saying almost nothing about legal runtime behavior. A behavioral model exposes that behavior while saying nothing about load. A quantitative model bounds capacity while omitting structure and behavior alike. Each preserves different facts about the same territory. The first modeling decision is therefore not *which notation should I use?* It is *what question am I trying to answer?*

The unit turns that decision into a discipline. For every model, ask four questions:

- **Engineering question** — what do we need to know?
- **Model** — what purposeful reduction makes that question tractable?
- **Property** — what claim should become expressible over that model?
- **Quality** — is the reduction adequate for the question, and does its representation make the intended interpretation sufficiently likely?

## Use the engineering repertoire

The reduction rarely needs to be invented. Software engineering and its neighboring disciplines have accumulated model forms for recurring questions: dependency graphs for structural questions, state machines for behavioral ones, quantitative models for capacity and cost. Do not invent a representation merely because you can. Start from the repertoire and select for the question.

UML is the industry-standard starting point for software modeling, providing established structural and behavioral views for many recurring engineering questions. Not every useful software model fits within UML, and some questions call for representations from other engineering traditions. But before inventing a new representation, ask whether an established form already serves the question. Model-based systems engineering broadens the repertoire further, treating requirements, interfaces, structure, and allocations as explicit engineering artifacts. The assigned readings ask you to browse this breadth, not memorize it. Selecting among models is itself an engineering decision.

## Reducing a real system

The book's examples follow DocAble, a production document-remediation system. Three of its models show how the question sizes the reduction.

A model can be very small. *Which code may mutate a user's document?* One structural model answers with a single architectural relation: remediation reaches format-specific mutation through one structured-document seam. Queues, retries, sessions, and the mechanics of each repair are all omitted; the question needs only the one relation.

A larger question needs more. *Which computations make up the remediation pipeline, and how do they compose?* Answering that takes explicit entities, typed relations, and stable identities: each registered computation becomes a node, and the edges distinguish data a computation consumes from information it merely consults. The first model preserves one architectural relation. The second preserves a family of typed compositional relations over the same system.

A behavioral model shows that the fact that matters may be the edge that does not exist. DocAble's crash-recovery model requires durable publication to precede the database record that names the artifact, and it states that obligation structurally: no transition reaches the record while the artifact is only staged. An absent transition carries engineering meaning. The model does not merely translate code into a diagram; it makes an obligation available for reasoning through its allowed and disallowed transitions.

## Preserve the obligation; leave the rest free

A useful model does not merely remove detail. It distinguishes obligations from degrees of freedom. The engineering obligation determines what the model must preserve: if the recovery ordering above matters, the model must keep enough structure to distinguish permitted orderings from forbidden ones. Everything the obligation does not constrain — helper decomposition, local names, much of the control flow — remains a degree of freedom, and Modeling should not eliminate those choices merely because they could be represented. This is the same move we practiced in Architecture and Design: constrain consequential choices without unnecessarily constraining realization. Not every delegated choice needs to return as a model; we need models for the distinctions we intend to reason about, preserve, or govern.

Parsimony is the complementary judgment: each distinction the model does include must earn its place. If removing a distinction would not impair the engineering question, it probably does not belong. Neither judgment runs once. Reason top-down from the question: *what must the model preserve?* Then inspect the model bottom-up: *is each included distinction necessary?* Good models emerge by moving between the two directions until the model preserves what the question requires without reproducing the territory.

## How much must we specify?

Parsimony depends on one more thing: the agent. The engineering obligation fixes the consequential distinctions that must be preserved, and no increase in agent capability relaxes that obligation. But a particular agent may also need scaffolding — additional decomposition, examples, or intermediate structure — to interpret and realize the obligation reliably. Call the obligation plus its scaffolding the **specified region**: everything the engineer actually writes down. Below it lie the degrees of freedom, the realization choices left to the agent.

The specified region has two boundaries, not one. The obligation boundary is set by the engineering problem and does not move with capability. The specification boundary does: a more capable agent needs less scaffolding, shrinking the specified region toward the obligation. Capability can reduce how much we must specify. It cannot reduce what must be true. Parsimony, restated for delegation: *how little do we need to specify while still preserving the engineering obligation and enabling this agent to interpret and realize it reliably?*

Two production cases answer the obvious question: *how do I know whether I left out the right things?* The first is DocAble's lease model, which governs ownership of an in-flight job. A lease records an owner, a generation, and a lifetime. Suppose worker A holds generation 7, appears to stall, and the job is subsequently claimed by worker B at generation 8. A late action from A must not clear or supersede B's newer claim. The missing transition matters: stale-generation release is not a permitted way to change the current ownership state.

Notice what this model omits: the processing topology. Ownership, generation, lifetime, and reclamation are consequential for this question; how the job's work is partitioned is not. The implementation later changed in ways that altered its processing topology without changing these semantics. The model remained useful because it had omitted something that was genuinely a degree of freedom. We changed the pointers to the code, but not the model.

The entitlement model shows the opposite failure. An admission decision reduced a user's entitlement to a single credit count. The implementation possessed the fact that an entitlement was unlimited, but the scalar representation had nowhere to preserve that distinction, and an unlimited user became zero credits. Once discarded, the distinction was gone: no downstream reasoning can recover semantics a representation no longer contains. This sets the lower limit on parsimony. A model may omit irrelevant detail; it cannot omit a distinction the engineering obligation requires.

## A model is not its representation

The recovery model can be drawn as a state diagram, written as a transition table, declared as structured data an implementation consults, or left implicit in ordinary program logic. The forms differ in syntax, audience, analyzability, and distance from the implementation, yet they preserve substantially the same transition relation. We therefore distinguish two terms:

- **Model** — a purposeful reduction of some territory that preserves selected properties or relationships for answering engineering questions.
- **Representation** — a concrete form in which a model is expressed so that humans or machines can inspect, manipulate, analyze, or consume it.

A diagram is a representation, not a synonym for a model. The distinction lets us state properties over models: the recovery model makes *publication precedes the record* expressible whatever the encoding. It also prepares Lecture 2: the same engineering fact can appear in several representations, because authority belongs to the model, not to any encoding of it.

## Representation affects interpretation

The forms are not interchangeable in engineering quality. A state machine may make a lifecycle constraint easier to recover than several paragraphs of prose. A typed, machine-readable relation may be interpreted more consistently by an agent than an informal convention. Two representations can express the same intended model and still differ in what a reader actually recovers.

We can state the idea probabilistically. For an intended engineering claim *c* and a representation *r*, consider *P*(agent correctly interprets *c* given *r*). Modeling does not make this probability one. Ambiguous names, overloaded arrows, missing semantics, and poorly chosen reductions all produce misinterpretation. Representation is an engineering choice partly because it changes the probability that the consequential claim is recovered correctly.

The representation is part of the interface between engineer and agent, and delegation succeeds only if the agent interprets the model as intended. Parsimony gains a probabilistic reading too: a representation can fail by omitting a necessary distinction or by burying it among irrelevant ones. And the fourth question becomes concrete: *does the representation make the consequential interpretation sufficiently likely?* Good Modeling reduces freedom of interpretation where meaning matters while preserving freedom of realization where it does not. Later units use this probabilistic view systematically; for now, the seed is enough.

## Models are engineered artifacts

One model makes one engineering question tractable; a production system needs many, built for different questions and maintained in different places. Lecture 2 asks how those models retain meaning and stay connected to the system they describe. Engineering with models comes to resemble programming: schemas constrain interpretation the way types do, model elements need stable identities the way names do, and the DRY principle warns about duplicated knowledge in both. Four requirements accumulate as models become a system: meaning, correspondence, identity, and composition.

**Meaning.** Consider the simplest architectural diagram: an arrow from A to B. As a structural claim it says *A calls B*. As a decision claim it says *A may call B*. As an observation it says *A was observed calling B*. Same nodes, same arrow, different engineering claims. The semantics diverge hardest at the absent edge: in a structural model an absent edge represents nothing, while in a decision model it may state a prohibition. The probability seed returns as diagnosis: an unlabeled, overloaded arrow can leave correct interpretation unlikely even though the diagram looks tidy. The fix is not more detail but better semantics; a compact typed edge can be interpreted more reliably than a longer ambiguous description.

**Correspondence.** A model makes claims about a territory, and engineering must maintain the correspondence. Where the implementation owns the truth, *derive* the model from it. Where the model owns the truth, *generate* the downstream artifact from it. Where neither fully determines the other, *trace and check* the correspondences a machine can decide. And correspondence is not correctness: a model and an implementation can agree perfectly and both be wrong for the engineering question.

**Identity and authority.** Once several models describe one system, they meet at shared elements. In DocAble, a computation identity lets measured latency and cost join the computation graph; a service identity connects flow policy, deployment, and access control. The rule is not *never duplicate bytes*; projections, caches, diagrams, and agent-facing views may duplicate freely. The rule is: do not independently maintain the same engineering fact in several places. Give model elements stable identities, give each consequential fact an authoritative source, and derive or join the rest. Here the model-versus-representation distinction pays off: several representations may legitimately expose the same fact.

**Composition without collapse.** DocAble's composition case starts from a single declared relation: one service may call another. That edge participates in questions no single model answers. Is the communication permitted? Where is the callee deployed? What runtime identity invokes it, and what invocation grant must exist? Does the deployed topology correspond to the declared one? The declared edges are held in exact correspondence with the deployment edge set, and deployment derives the cloud invocation grants from those declared edges. No single artifact contains that deployment plan; joining purposeful reductions through shared identities produces it.

The temptation after joins is obvious: put everything into one universal model. Resist it. Each reduction is useful because it suppresses information irrelevant to its question, and one enormous model would recreate the complexity Modeling exists to reduce. There is no grand model.

## Three activities, three judgments

- **Reduce** (Lecture 1). Groups receive the same small system but different engineering questions. *What must your model preserve? What may it omit? What property should become expressible?* The debrief carries the lesson: different questions about the same territory produce different reductions, and each group defends its model as parsimonious.
- **Interpret** (Lecture 1). Groups receive several small representations, including the same A-to-B drawing twice under different semantics. For each: *what claim does this representation appear to make, and what remains ambiguous?* The exercise makes the probability of correct interpretation tangible without estimating a number.
- **Join** (Lecture 2). Groups receive small model fragments sharing identities — service flow, deployment, runtime identity and access, measurements — and a question none answers alone. They identify the join the question requires, the answer it supports, and what still cannot be concluded.

## From Modeling to Alignment

The act reads as one progression. Delegation asked what work and what freedom to give an agent. Modeling asked what engineering knowledge must be made explicit so the engineer and the agent can reason about consequential properties. But making an obligation explicit does not determine what happens when realization disagrees with it.

A state model can express a forbidden transition. A decision model can express a prohibited call. A quantitative model can expose a bound. None, by itself, determines whether a disagreement should be recorded, presented to an engineer, checked in CI, used to block deployment, or prevented by construction. Modeling determines what engineering knowledge we make explicit. Alignment determines what consequence that knowledge should have.
