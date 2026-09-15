---
title: Specification
readings:
  groups:
    - heading: Foundations
      items:
        - '["Four Dark Corners of Requirements Engineering."](https://doi.org/10.1145/237432.237434) Zave and Jackson, 1997. A classic treatment of the relationships among requirements, environmental assumptions, specifications, and implementations. **Read** §1 and the opening of §5 (through the definition of the satisfaction relation, S, K ⊢ R); **skim** §3.2 and §5–5.1. Focus on the distinction among requirements, specifications, and domain assumptions, and on why a requirement may need to be refined before an implementor can build from it. Full citation: Pamela Zave and Michael Jackson, "Four Dark Corners of Requirements Engineering," *ACM Transactions on Software Engineering and Methodology* 6, no. 1 (1997): 1–30.'
    - heading: Specifications in practice
      items:
        - '["Software Requirements for the A-7E Aircraft."](readings/software-requirements-for-the-a7e-aircraft.pdf) Alspaugh, Faulk, Britton, Parker, Parnas, and Shore, 1992. A substantial real software requirements specification. Skim rather than reading linearly. Pay particular attention to how the document specifies externally visible behavior without unnecessarily prescribing implementation, its requirements for useful functional subsets, its treatment of expected changes, and the different representations used to make different obligations explicit. Full citation: Thomas A. Alspaugh, Stuart R. Faulk, Kathryn Heninger Britton, R. Alan Parker, David L. Parnas, and John E. Shore, "Software Requirements for the A-7E Aircraft," NRL/FR/5530-92-9194 (Washington, DC: Naval Research Laboratory, 1992).'
    - heading: Modeling and representation
      items:
        - '[MAGE, Part II — Introduction](https://davisjam.github.io/model-based-agentic-software-engineering/book/mage-book/part-2-intro.html) and {mage:2.1}. Davis, 2026. Read the Part II introduction and §2.1 together as one reading. The introduction frames modeling: why large systems are understood through purposeful views, and why commodity intelligence changes the economics that once kept explicit models secondary in code-centric practice. §2.1 then introduces models as purposeful reductions — representations chosen to make particular engineering questions tractable — and develops properties, invariants, acceptable realization spaces, and degrees of freedom as tools for reasoning about what should be constrained and what should remain open.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture slides — Specification
    src: slides/1-5-Specification.pptx
---

**Premise.** *Requirements establish what engineers have decided to promise. Specification determines what those commitments require of the machine and its environment, while preserving choices that do not matter.*

Requirements engineering does not eliminate uncertainty before commitment. It reduces uncertainty enough that engineers can decide what would create value and what they can responsibly promise. Specification begins with those commitments and asks what they mean for the system that will be built.

A requirement can admit many possible realizations. Some differences among them matter greatly; others do not. Some are understood well enough to constrain immediately; others expose uncertainty that should be investigated before engineers commit to a boundary. Specification is therefore a problem of judgment before it is a problem of documentation.

The work centers on two coupled decisions. First, engineers decide which aspects of the accepted requirements are both consequential and uncertain. Those aspects deserve specification and feedback first. Second, they decide what the environment must provide and what the machine must guarantee. These decisions bound the space of acceptable realizations without unnecessarily selecting one implementation.

Specification makes three judgments:

- **Where should specification effort go?** The aspects of the accepted requirements that are both consequential and uncertain deserve specification and feedback first.
- **Where does responsibility belong?** Engineers decide what the environment must provide and what the machine must guarantee — the boundary is itself an engineering choice.
- **How tightly should the machine be constrained?** For each distinction among possible realizations: constrain it, leave it open, or learn more.

## Start with consequence and uncertainty

Not every unresolved question deserves equal attention. Specification effort is most valuable where a decision is both consequential and uncertain.

Consequence asks how much it would matter if engineers chose the wrong boundary. A decision may affect whether a requirement is satisfied, whether an important quality is preserved, whether systems can interoperate, or whether a future change remains practical. Uncertainty asks how confidently engineers understand that decision and its consequences.

A consequential property that is already well understood may simply need to be stated precisely. An uncertain choice whose alternatives have little consequence can remain unresolved. A consequential property whose correct boundary is uncertain deserves attention early, because feedback may change the specification, the accepted requirement, or even the decision to build the feature.

Consider a Sleep Advisor with the requirement:

> **R4.** Alert the user when their sleep pattern suggests illness.

The wording leaves important questions unresolved. What observations are available? What counts as the user's normal sleep? What departure is meaningful? How quickly must the user be warned? Under what circumstances can the system reasonably be expected to observe the user's sleep at all?

The engineer should not resolve these questions merely in the order they arise. The useful question is which uncertainties could most change the acceptability of the resulting system. Those become priorities for modeling, analysis, prototyping, or feedback.

This continues the judgment begun during requirements engineering. A specification can reveal that a promising requirement rests on an implausible assumption, requires behavior much more costly than expected, or leaves a consequential disagreement unresolved. Specification can therefore send engineers back to reconsider what they have promised.

## Decide what the environment provides and what the machine guarantees

A requirement describes something we want to be true in the world. A machine directly controls only its own behavior. Specification connects the two.

Following Zave and Jackson, we can distinguish three things. Requirements describe desired properties of the world. Environmental assumptions describe relevant properties of the surrounding world on which the system may rely. The machine specification constrains behavior at the boundary between the machine and that world. The engineering claim is that the environmental assumptions and machine specification are together sufficient to establish the requirement.

For the Sleep Advisor, the environment includes facts that can seem mundane but are essential. The user wears the device while sleeping. The device has enough charge to observe the night. The available measurements bear an adequate relationship to the sleep properties on which the system reasons. The machine can then be required to process available observations, maintain the required information about normal sleep, identify specified departures, and issue an advisory under specified conditions.

The distinction matters because correct software cannot compensate for every failure of its environment. A program can perfectly satisfy its machine specification and still fail to warn the user if the device spent the night on the nightstand. If satisfying the requirement depends on the device being worn, that dependency belongs in the environmental model rather than remaining an invisible assumption.

The boundary is not simply discovered. Engineers decide where responsibility will reside. A system might assume that an operator supplies valid input, or it might validate and repair that input itself. It might assume that a device remains charged, or it might detect impending loss of power and compensate for missing observations. It might require a human to resolve an ambiguous case, or it might undertake to resolve the case automatically. Each choice changes what the machine is responsible for doing.

## Scope changes move the boundary

Many familiar decisions about project scope can be understood as changes to the boundary between environment and machine.

Reducing scope often moves responsibility out of the machine and into its environment. A case that the software once handled automatically may instead become something an operator must handle, an administrator must configure, or another system must guarantee. De-risking can make the same move when engineers replace difficult machine behavior with a stronger assumption about deployment or use. A prototype might support only one document format, require manually prepared input, or assume a controlled operating environment so that engineers can investigate the uncertain part of the problem without first solving every surrounding problem.

Scope creep moves the boundary in the other direction. A behavior previously supplied by the environment becomes something the machine is expected to provide. "The administrator will configure this correctly" becomes "the system should detect the configuration." "The operator will resolve ambiguous cases" becomes "the system should handle them automatically."

These changes do not necessarily remove complexity. They allocate it differently. A simpler machine may require a more capable operator, more disciplined users, stronger inputs, or a more controlled deployment environment. Moving responsibility into the environment is acceptable only when the resulting environmental assumption is itself acceptable. Specification makes that trade visible.

## Bound the acceptable realizations

Once responsibility has been allocated to the machine, engineers must decide how tightly its behavior should be constrained.

Return to R4. One implementation might establish a baseline when the application is first used and compare every subsequent night against it. Another might continually update the baseline as the user's sleep changes. A third might compare the user against population norms. Each could plausibly claim to alert the user when sleep suggests illness, but the resulting systems embody different judgments about what observations matter and what constitutes a meaningful departure.

If those differences affect an accepted requirement, they cannot simply be left to implementation. The specification must establish the consequential boundary. If the requirement depends on detecting departures from the user's own changing normal behavior, for example, a fixed population baseline may fall outside the acceptable space. If several baseline algorithms all satisfy the consequential properties, choosing among them can remain an implementation decision.

A specification therefore bounds a realization space. Each obligation rules out some possible realizations. What remains is the set engineers are prepared to accept. Specification does not ordinarily identify one point in that space, because doing so would resolve choices that may have no engineering reason to be resolved yet.

The question is not how much detail a specification should contain. It is which differences among possible realizations are consequential enough to constrain.

## Make consequential properties visible

Engineers cannot make these judgments well if the relevant properties remain difficult to see. This is where models and other representations become part of specification.

A model is a purposeful view of a system. It preserves distinctions needed to answer an engineering question while suppressing details that do not matter to that question. Because different specification questions concern different properties, one system may need several peer views rather than one complete representation.

A state model can expose allowable behavior by making states and transitions explicit. An activity model can expose ordering and dependency. A schema can expose the permitted structure of information crossing a boundary. A table can expose combinations of conditions, values, timing bounds, or required responses. Each representation gives engineers a vocabulary in which particular properties can be stated and examined.

The choice begins with the engineering question. If engineers are uncertain whether the Sleep Advisor can issue an advisory before a baseline has been established, a state representation may make the relevant distinction clear. If the uncertainty concerns the ordering between wake detection, analysis, and notification, an activity representation may be more useful. If it concerns what information may be shared with a doctor, a schema may expose the relevant boundary.

The relationship is therefore engineering question → representation → property → analysis or check. A property is a claim expressible over the representation; an invariant is a property required to hold over its declared domain. The representation is useful because it makes a consequential distinction explicit enough to reason about, obtain feedback on, or check.

The A-7E specification illustrates this approach at substantial scale. It uses prose, defined data, mode-transition tables, timing constraints, required subsets, and explicit descriptions of expected change because the system presents different engineering questions. Mode-transition tables make allowable behavior visible without prescribing code. Timing requirements distinguish meaningful bounds from cases where timing is not significant. Useful-subset requirements constrain behavior in ways that have architectural consequences without selecting an architecture. Expected changes distinguish assumptions engineers may treat as stable from variation the realization must accommodate. The representations differ because the properties being specified differ.

## Decide whether to constrain, leave open, or learn more

An apparent degree of freedom can mean three different things, and distinguishing them is central to specification.

An unknown exists when engineers do not yet understand whether a distinction is consequential. It calls for learning. A tacit constraint exists when the distinction matters but its boundary has not been made explicit. It calls for externalization. A genuinely free choice exists when the alternatives are acceptable. It should remain open.

A useful test for tacit constraints is whether an apparently conforming realization produces the reaction *not that*. Suppose the Sleep Advisor specification says that a weekly summary may be shared with the user's doctor but says nothing about other recipients. If an implementation publicly posts the summary and the response is that this was obviously not intended, the apparent freedom was not genuine. A consequential boundary existed but remained tacit.

The engineer therefore has three possible decisions. Constrain a distinction when its alternatives differ consequentially. Leave it open when the alternatives are genuinely acceptable. Learn more when the consequences are uncertain.

These decisions are coupled to the earlier allocation between environment and machine. Learning may reveal that an environmental assumption is unreasonable and responsibility must move into the machine. It may reveal that machine behavior previously thought consequential can safely remain open. It may even reveal that satisfying the accepted requirement would require a commitment engineers should not make. Specification is not merely the transcription of decisions already settled elsewhere; it is one of the places where those decisions are tested.

## Use feedback to resolve the consequential uncertainties

Some specification questions can be resolved analytically. Others become answerable only when engineers expose a proposed boundary to evidence.

A prototype can make an abstract choice concrete. Representative data can show whether a proposed threshold behaves as expected. A simulation can expose an invalid transition. A stakeholder can react to an example realization. An experiment can compare alternatives whose consequences were previously uncertain. The purpose is not to implement everything early, but to obtain evidence about the decisions whose combination of consequence and uncertainty makes them worth investigating.

Suppose engineers do not know whether the Sleep Advisor requires a fixed or adaptive baseline. Building enough of each approach to evaluate representative sleep histories may reveal that one produces unacceptable behavior as a user's normal sleep changes. That evidence can justify an additional constraint. It might instead show that both alternatives satisfy the properties engineers care about, allowing the choice to remain free.

The same reasoning explains why incremental specification is often useful. Engineers need enough specification to investigate the next consequential uncertainty, not necessarily a complete description of every eventual behavior. As feedback reduces uncertainty, they can constrain newly consequential distinctions, externalize tacit boundaries, and preserve choices that evidence shows need not be decided.

This is also why overspecification has a cost. Software makes many choices comparatively cheap to defer. Constraining a harmless alternative today converts a future choice into a present commitment and creates an obligation that later engineers must preserve or deliberately revise. Underspecification has the opposite failure: a consequential choice is delegated downstream without making the obligation visible.

The objective is neither maximal detail nor maximal freedom. It is enough specification to make consequential commitments explicit while preserving choices that engineers have no reason to make yet.

## From specification to architecture

Requirements established what the engineering effort intends to achieve. Specification has made the next set of judgments explicit: which uncertainties deserved attention, which responsibilities belong to the environment, which belong to the machine, and which differences among machine realizations matter.

The result is not a complete design. Several acceptable realizations should ordinarily remain. Their state behavior, information structures, timing obligations, expected changes, and other properties may be described through different views, but those obligations eventually have to coexist in one system.

Architecture begins from that bounded realization space. Its problem is no longer simply which realizations are acceptable, but how to organize one acceptable realization so that its competing obligations can be satisfied together.
