---
title: Modeling
sessions:
  - "Modeling: Purposeful Reduction"
  - "Modeling: Degrees of Semantic Commitment"
readings:
  groups:
    - heading: The Modeling principle
      items:
        - cite: davis2026mage
          locator: '§2.1, especially §2.1.4'
          annotation: '{mage:2.1} Davis, 2026. The spine of the unit, assigned by lecture. Read §2.1 for Lecture 1: it develops models as purposeful reductions, and its questions are the ones to carry into every example — *what must this model preserve, and what can it safely leave out?* Return to §2.1.4 for Lecture 2: it names semantic commitment — how much of a representation''s meaning the representation itself carries — and develops what stronger commitment buys, what it costs, and why neither detail nor precision is free. {mage:2.5} treats what happens when models accumulate — correspondence, shared identities, authority; consult it as the laboratory raises those questions. §§2.2–2.4 are a repertoire, not a taxonomy to memorize; consult them as reference.'
    - heading: The size of the Modeling repertoire
      items:
        - cite: visualparadigm-uml-guide
          annotation: '["The Complete Guide to UML Diagram Types."](readings/visual-paradigm-uml-diagram-types.pdf) Browse, do not memorize — but browse with Lecture 2''s question in hand. UML is the spectrum''s middle ground in semantic commitment: standardized notation that establishes substantial shared meaning while still relying on human interpretation and project convention. For each diagram type, ask what the notation itself defines, what the reader must still supply, and what a tool could reliably do with the diagram. The point is not UML syntax; it is seeing how much meaning a standardized notation carries — and how much it leaves to its interpreter. (Source: [visual-paradigm.com/guide](https://www.visual-paradigm.com/guide/the-complete-guide-to-uml-diagrams-all-14-types-explained-with-practical-examples).)'
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
  - title: "Lecture 1 slides — Modeling: Purposeful Reduction"
    src: 2-2-Modeling-1-Purposeful-Reduction.pptx
  - title: "Lecture 2 slides — Modeling: Degrees of Semantic Commitment"
    src: 2-2-Modeling-2-Degrees-of-Semantic-Commitment.pptx
---

**Premise.** *A model is useful because it leaves things out and makes explicit what must remain.*

Agents make implementation easy to delegate, but delegation creates a communication problem: the agent must recover what matters from what we give it. We cannot, and should not, specify every implementation choice. The engineering problem is to make consequential structure and intent explicit while leaving the remaining degrees of freedom to the agent. That is the role of Modeling.

Informed control requires more than possessing an implementation: an engineer must be able to answer consequential questions without reconstructing the entire system every time the question changes. A dependency graph discards most of a program while preserving relationships among components. A state machine discards most implementation detail while preserving states, transitions, and the transitions that must not occur. A quantitative model discards behavior and structure while preserving quantities and bounds relevant to cost, latency, or capacity. Each is useful because it omits most of the system and because it makes the distinctions relevant to its question explicit.

Modeling is therefore an act of purposeful reduction. We decide what a question requires us to preserve, what can remain free, and how to represent what remains. The objective is not to reproduce the system in another notation. It is to preserve enough of the system that consequential questions become cheap to answer.

## Two lectures, one laboratory

The unit spans two lectures because the problem splits in two:

- **Lecture 1 — Purposeful Reduction** asks *what must the model preserve?* One model, one question: from engineering question to reduction, repertoire, degrees of freedom and parsimony, representation, and interpretation.
- **Lecture 2 — Degrees of Semantic Commitment** shows *how models carry different amounts of their own meaning.* We move from informal diagrams through standardized notation to semantically defined models, then use the MAGE Workbench to construct and interrogate a model. The objective is not to learn a modeling language exhaustively. It is to experience what stronger semantic commitment makes possible, and what it costs.

The first lecture uses the Reduce and Interpret activities to practice choosing what a model should preserve and recognizing ambiguity in its representation. The second is primarily a modeling laboratory: students Model → Query → Revise. They construct enough semantics to answer an engineering question, discover a question their model cannot answer, and decide whether strengthening the model is worth the additional commitment.

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

## The Master Equation

The Master Equation separates places where reliable delegated realization can fail. Act II's introduction factored the probability that one attempt produces an acceptable realization into encoding, interpretation, and realization. Each unit of the Act works on that system from a different side.

> **p<sub>R</sub> = P(E | R) · P(I | E, R) · P(L | I, E, R)**

Modeling asks what *R* must preserve, what it should leave free, and how reliably its intended engineering meaning can be recovered.

| Factor | The Modeling question |
|---|---|
| *R* | What purposeful reduction makes the engineering question tractable, and how much of its meaning does the representation itself carry? |
| *P(E \| R)* | Does the representation help the engineer encode the consequential intent correctly — did we manage to say it? |
| *P(I \| E, R)* | Does the representation make the intended interpretation sufficiently likely — did the agent recover what we meant? |
| *P(L \| I, E, R)* | Does the model preserve the distinctions needed to tell an acceptable realization from an unacceptable one, while leaving the rest free? |

This unit acts first on *R*, the term every factor conditions on. But those choices propagate through the whole chain: purposeful reduction decides what the representation preserves, which bounds what any reasoner can later recover from it, and semantic commitment decides how much of that meaning the representation itself carries, which determines how much interpretation is reading rather than reconstruction. Neither choice makes any factor one, and the engineering objective is to preserve the distinctions needed for consequential reasoning while leaving irrelevant realization choices free.

## Use the engineering repertoire

The reduction rarely needs to be invented. Software engineering and its neighboring disciplines have accumulated model forms for recurring questions: dependency graphs for structural questions, state machines for behavioral ones, quantitative models for capacity and cost. Do not invent a representation merely because you can. Start from the repertoire and select for the question.

UML is the industry-standard starting point for software modeling, providing established structural and behavioral views for many recurring engineering questions. It is also, as Lecture 2 develops, the middle ground in semantic commitment: a normative specification and a machine-readable metamodel give the notation substantial shared meaning, while much interpretation still rests on human convention and project context. Model-based systems engineering reaches further along the same axis — SysML v2 and its semantic foundation, KerML, define model semantics explicitly enough that tools can interpret, query, and compose the model. Not every useful software model fits within these traditions, and some questions call for representations from elsewhere. But before inventing a new representation, ask whether an established form already serves the question, and how much semantic commitment the question actually requires. The assigned readings ask you to browse this breadth, not memorize it. Selecting among models is itself an engineering decision.

## Reducing a real system

The book's examples follow DocAble, a production document-remediation system. Three of its models show how the question sizes the reduction.

A model can be very small. *Which code may mutate a user's document?* One structural model answers with a single architectural relation: remediation reaches format-specific mutation through one structured-document seam. Queues, retries, sessions, and the mechanics of each repair are all omitted; the question needs only the one relation.

A larger question needs more. *Which computations make up the remediation pipeline, and how do they compose?* Answering that takes explicit entities, typed relations, and stable identities: each registered computation becomes a node, and the edges distinguish data a computation consumes from information it merely consults. The first model preserves one architectural relation. The second preserves a family of typed compositional relations over the same system.

A behavioral model shows that the fact that matters may be the edge that does not exist. DocAble's crash-recovery model requires durable publication to precede the database record that names the artifact, and it states that obligation structurally: no transition reaches the record while the artifact is only staged. An absent transition carries engineering meaning. The model does not merely translate code into a diagram; it makes an obligation available for reasoning through its allowed and disallowed transitions.

## Preserve the obligation; leave the rest free

A useful model does not merely remove detail. It distinguishes obligations from degrees of freedom. The engineering obligation determines what the model must preserve: if the recovery ordering above matters, the model must keep enough structure to distinguish permitted orderings from forbidden ones. Everything the obligation does not constrain — helper decomposition, local names, much of the control flow — remains a degree of freedom, and Modeling should not eliminate those choices merely because they could be represented. This is the same move we practiced in Architecture and Design: constrain consequential choices without unnecessarily constraining realization. Not every delegated choice needs to return as a model; we need models for the distinctions we intend to reason about, preserve, or govern.

Parsimony is the complementary judgment: each distinction the model does include must earn its place. If removing a distinction would not impair the engineering question, it probably does not belong. Neither judgment runs once. Reason top-down from the question: *what must the model preserve?* Then inspect the model bottom-up: *is each included distinction necessary?* Good models emerge by moving between the two directions until the model preserves what the question requires without reproducing the territory.

Neither direction gives a mechanical answer. Engineers cannot generally know in advance that every omitted distinction is irrelevant or every included distinction necessary. Degrees of freedom and parsimony are disciplines for making that judgment with the evidence available. Analysis, implementation, measurement, or failure may later reveal that an omitted distinction mattered or an included distinction did not. When that happens, revise the model.

## Models can follow implementation

Modeling does not require Perfect Design Up Front. A model is a tool for preserving and communicating consequential knowledge, not a claim that engineers completely understand the system before building it. As agents make implementation and representation cheaper, engineers can model what they know, build to learn what they do not, and revise the model as the work produces evidence.

Sometimes implementation comes first. In Design, we used prototypes as probes: building a candidate realization can be the cheapest way to discover how a mechanism behaves or which distinctions matter. But a prototype preserves the implementation, not necessarily what engineers learned from it. Once the probe answers the question, induce a model from the working realization that captures the consequential relationship, constraint, or tradeoff the prototype exposed. The implementation may later be replaced; the engineering knowledge should not have to be rediscovered with it.

This is another reason Modeling matters for delegation. Models reduce how much consequential knowledge and intent must be reconstructed from implementation each time work passes between engineer and agent. They need not be perfect to serve that purpose. They need to preserve enough of what currently matters to support the next engineering decision, and to change when the evidence changes.

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

A diagram is a representation, not a synonym for a model. The distinction lets us state properties over models: the recovery model makes *publication precedes the record* expressible whatever the encoding. It also prepares Lecture 2: the same model can have several representations without making each representation an independent source of truth.

## Representation affects interpretation

The forms are not interchangeable in engineering quality. A state machine may make a lifecycle constraint easier to recover than several paragraphs of prose. A typed, machine-readable relation may be interpreted more consistently by an agent than an informal convention. Two representations can express the same intended model and still differ in what a reader actually recovers.

The Master Equation names this problem P(I | E, R): given the representation, how likely is the reasoner to recover the engineering meaning we intended? Modeling does not make this probability one. Ambiguous names, overloaded arrows, missing semantics, and poorly chosen reductions all produce misinterpretation. Representation is an engineering choice partly because it changes the probability that consequential meaning is recovered correctly.

The representation is part of the interface between engineer and agent, and delegation succeeds only if the agent interprets the model as intended. Parsimony gains a probabilistic reading too: a representation can fail by omitting a necessary distinction or by burying it among irrelevant ones. And the fourth question becomes concrete: *does the representation make the consequential interpretation sufficiently likely?* Good Modeling reduces freedom of interpretation where meaning matters while preserving freedom of realization where it does not. Alignment and Failure-Aware Engineering return to the same chain.

## Representations carry different amounts of meaning

A representation does more than make a model visible. It also determines how much of the model's meaning must be supplied by the person or machine interpreting it.

Consider a box labeled *Parser* with an arrow to a box labeled *Renderer*. The drawing may be useful to a team that already shares its meaning. But the marks alone do not tell us whether the arrow means *calls*, *may call*, *depends on*, *sends data to*, or *was observed calling*. The same visual syntax can therefore support several different engineering claims.

Engineering representations differ in how much of this meaning they make explicit. An informal architecture sketch may rely heavily on shared human understanding. UML supplies standardized modeling concepts and relationships for recurring software-engineering views. Structured interface and schema languages such as OpenAPI and JSON Schema make selected meanings directly machine-readable. SysML v2 and its semantic foundation, KerML, go further toward treating the model as a semantically defined engineering artifact whose elements and relationships can be interpreted, queried, composed, and analyzed by tools.

Call this difference **semantic commitment**: how much of the intended meaning of a representation is made explicit by the representation and its modeling language rather than supplied by its interpreter.

More semantic commitment is not automatically better. Precision has costs. A notation that machines can interpret reliably may demand more from its authors and more from human readers. A quick sketch may be exactly right when several engineers need to communicate an architectural idea to one another or to an agent for a prototype. A semantically richer model may earn its cost when a consequential property must be queried, composed across views, checked mechanically, or handed repeatedly between humans and agents. Choose enough semantic commitment for the engineering work the model must support.

| Representation | Example | Where meaning lives | What it buys | What remains free |
|---|---|---|---|---|
| Informal | box-and-arrow architecture sketch | largely in shared human context | very cheap communication | almost everything not understood by convention |
| Standardized notation | UML 2.5.1 | notation + human/project interpretation | shared modeling vocabulary | most realization choices |
| Machine-readable structure | OpenAPI 3.1, JSON Schema | explicit types, fields, constraints, references | reliable machine inspection and transformation | implementation behind the represented boundary |
| Semantically defined engineering model | SysML v2 + KerML | explicit modeling language semantics | query, composition, analysis, tool-supported reasoning | everything the model deliberately leaves unspecified |

These are examples, not maturity levels. Semantic precision and amount specified are different dimensions. A semantically precise model can deliberately leave enormous realization freedom.

Semantic commitment matters especially in agentic engineering. A human teammate can often recover the intended meaning of an informal drawing by asking questions, relying on convention, or drawing on shared history. An agent can sometimes do the same, but then successful interpretation depends on probabilistic reconstruction. Making types, relationships, constraints, and identities explicit moves selected reasoning out of reconstruction and into the engineering environment. The agent may still exercise substantial freedom in realization; it simply has less freedom to reinterpret the facts the model was intended to state.

## Stronger semantics enable model operations

One model makes one engineering question tractable; a production system needs many, built for different questions and maintained in different places. Once model elements have explicit types, relationships, and identities, a model becomes more than a picture to inspect. Tools can ask questions of it.

**Meaning** is what makes that possible. Consider the simplest architectural diagram: an arrow from A to B. As a structural claim it says *A calls B*. As a decision claim it says *A may call B*. As an observation it says *A was observed calling B*. Same nodes, same arrow, different engineering claims — and the semantics diverge hardest at the absent edge: in a structural model an absent edge represents nothing, while in a decision model it may state a prohibition. The probability of correct interpretation returns as diagnosis: an unlabeled, overloaded arrow can leave it unlikely even though the diagram looks tidy. The fix is not more detail but better semantics; a compact typed edge can be interpreted more reliably than a longer ambiguous description.

With sufficient semantics, model operations follow. A component can be identified as the same component across several views. A relationship can mean *contains*, *depends on*, or *allocates to* rather than merely appearing as an arrow. A constraint can be evaluated over model properties. Several purposeful reductions can be joined through shared identities to answer questions that none answers alone.

These capabilities do not require one universal model. Nor do they establish that the model is correct. They depend on two further engineering obligations: **correspondence** — whether the model remains related appropriately to the territory it describes — and **authority** — which artifact owns a consequential fact when several representations contain it. We will encounter both while working with models rather than treating them as reasons to maximize model formality.

## From diagrams to a model we can interrogate

Lecture 2 uses the MAGE Workbench to make the distinction concrete. We will work with a semantically defined model rather than drawing a diagram of a system. Model elements have identities and types; relationships have declared meanings; properties can be attached to the elements they describe; and questions can be evaluated against that structure.

**[Open the MAGE Workbench →](https://davisjam.github.io/model-based-agentic-software-engineering/workbench/)**

The laboratory follows one rule from Lecture 1: do not model everything. Begin with an engineering question and construct only the distinctions needed to answer it. Then ask a question the model cannot yet answer. The failure is useful: it identifies a distinction the current reduction does not preserve. Decide whether that distinction matters enough to add.

An embedded-systems sequence shows the progression. *What components exist?* Then: *where are they allocated?* Then: *how much memory does each consume?* Finally: *can this configuration fit?* The first model is not wrong when it cannot answer the memory question. It simply does not preserve the quantities that question requires — Lecture 1's lesson, arriving as a discovery rather than a slide.

This makes semantic modeling an engineering choice rather than a documentation exercise. Every additional property, type, or relationship should buy some reasoning capability. If it does not help a human, an agent, or a tool answer a consequential question, it may not belong in the model.

## Activities and judgments

- **Reduce** (Lecture 1). Groups receive the same small system but different engineering questions. *What must your model preserve? What may it omit? What property should become expressible?* The debrief carries the lesson: different questions about the same territory produce different reductions, and each group defends its model as parsimonious.
- **Interpret** (Lecture 1). Groups receive several small representations, including the same A-to-B drawing under different semantics and two different representations intended to express the same model. For each: *what model does this representation appear to express, what claim does it make, and what remains ambiguous?* The exercise makes the probability of correct interpretation tangible without estimating a number.
- **Model → Query → Revise** (Lecture 2). In the Workbench, students construct enough semantics to answer an engineering question, query the model to answer it, then meet a question the model cannot answer and decide whether the distinction it needs is worth adding. The activity closes with the unit's second judgment: *how much semantic commitment does this work require?*

## From Modeling to Alignment

The act reads as one progression. Delegation asked what work and what freedom to give an agent. Modeling asked what engineering knowledge must be made explicit so the engineer and the agent can reason about consequential properties. But making an obligation explicit does not determine what happens when realization disagrees with it.

A state model can express a forbidden transition. A decision model can express a prohibited call. A quantitative model can expose a bound. None, by itself, determines whether a disagreement should be recorded, presented to an engineer, checked in CI, used to block deployment, or prevented by construction. Modeling determines what engineering knowledge we make explicit. Alignment determines what consequence that knowledge should have.
