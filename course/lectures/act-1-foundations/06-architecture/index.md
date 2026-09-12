---
title: Software Architecture
readings:
  groups:
    - heading: Architecture and risk
      items:
        - 'Fairbanks, [*Just Enough Software Architecture: A Risk-Driven Approach*](https://www.georgefairbanks.com/book/), §§1.1–1.6, §§2.1–2.3, and §§15.1, 15.5–15.6. Read the opening sections for Fairbanks''s account of architecture, complexity, and risk, then jump to Chapter 15 for the connection between architectural models and analysis. Pay particular attention to the desirable traits of models and the progression from human and informal reasoning to formal architectural analysis. The central question is not how much architecture documentation to produce, but how architectural work can reduce engineering risk. Full citation: George Fairbanks, *Just Enough Software Architecture: A Risk-Driven Approach* (Boulder, CO: Marshall & Brainerd, 2010).'
    - heading: Reasoning from architecture
      items:
        - '["Scenario-Based Analysis of Software Architecture."](https://doi.org/10.1109/52.542294) Abowd, Bass, Clements, and Kazman, 1996. This reading develops the idea that an architecture can be exercised against scenarios to obtain predictive insight about qualities of a system before the complete implementation exists. Focus on the relationship among an engineering question, an architectural representation, and the conclusions the representation permits engineers to draw. Full citation: Gregory Abowd, Len Bass, Paul C. Clements, and Rick Kazman, *Scenario-Based Analysis of Software Architecture* (Pittsburgh, PA: Software Engineering Institute, Carnegie Mellon University, 1996).'
        - 'Kazman et al., [*Architecture Tradeoff Analysis Method*](https://www.sei.cmu.edu/library/atam-method-for-architecture-evaluation/). This reading develops the complementary idea that system qualities do not determine architectural choices independently. Performance, availability, security, modifiability, and other properties can impose competing pressures, so architecture evaluation requires reasoning about interactions and tradeoffs rather than checking each quality in isolation. Full citation: Rick Kazman, Mark Klein, and Paul Clements, *ATAM: Method for Architecture Evaluation*, CMU/SEI-2000-TR-004 (Pittsburgh, PA: Software Engineering Institute, Carnegie Mellon University, 2000).'
    - heading: Architecture in practice
      items:
        - '["Software Architecture in Practice: Challenges and Opportunities."](https://doi.org/10.1145/3611643.3616367) Wan et al., 2023. An empirical study of software architecture practice based on interviews with practitioners across 21 organizations. Read for the gap between architecture as a rich engineering discipline and the practical difficulties of maintaining architectural knowledge, documentation, tooling, and processes in real organizations. Full citation: Zhiyuan Wan, Yun Zhang, Xin Xia, Yi Jiang, and David Lo, "Software Architecture in Practice: Challenges and Opportunities," in Proceedings of the 31st ACM Joint European Software Engineering Conference and Symposium on the Foundations of Software Engineering (ESEC/FSE 2023) (New York: Association for Computing Machinery, 2023), 1457–69.'
    - heading: Architecture Meets GenAI
      items:
        - '[MAGE, Interlude — "One Problem, Many Models."](https://davisjam.github.io/model-based-agentic-software-engineering/book/3.5-one-problem-many-models.html) Davis, 2026. Read the whole Interlude. Follow the DocAble case from an observed resource failure through two architectural changes. The case shows how an engineering property can expose an unwanted coupling, how changing one boundary can reopen choices elsewhere in the architecture, and how a model can support analysis before implementation. Focus especially on the distinction between choosing an architecture and constructing representations that let engineers reason about its consequences. Full citation: James C. Davis, *Model-Based Agentic Software Engineering*, 1st ed. (2026), Interlude, "One Problem, Many Models."'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: Lecture slides — Software Architecture
    src: 1-6-Architecture.pptx
---

**Premise.** *The purpose of architecture is to organize a system so that the many competing obligations of its specification can be realized together. Architecture establishes a strategy for realizing those obligations: it identifies consequential parts, assigns responsibilities, establishes boundaries and interfaces, and constrains how the parts may interact. When multiple organizations satisfy the specification, engineers must compare the alternatives, analyze their consequences, and decide which tradeoffs are appropriate.*

A specification tells us what an acceptable realization must accomplish, but it deliberately leaves many choices about the system's organization open. Those choices matter because obligations such as performance, security, reliability, and expected change can interact: an organization that serves one property well may make another harder to achieve.

Architecture is where engineers make those obligations coexist. Its choices create affordances and constraints for the engineering work that follows. A boundary may make a change easier to isolate while making coordination harder. A communication rule may improve failure isolation while weakening consistency. An architectural decision therefore does more than describe a system: it changes the space of designs available to its parts.

The distinction between architecture and design is recursive rather than absolute. A system architecture establishes strategy for the design of its parts. A sufficiently substantial subsystem will in turn need an architecture that establishes strategy for its own internal parts. Architecture therefore does not occupy one fixed level of a system hierarchy. It deliberately reasons about coarse-grained parts whose internals can, for the current engineering question, be treated as units.

## From specification to one system

Specification deliberately separates different engineering questions. A state model may describe legal transitions, a schema may constrain information, and timing requirements may bound when an operation must complete. This separation is useful because each representation makes a particular property easier to state and examine.

Architecture must bring those obligations back together in one coherent realization. This does not mean mechanically combining specification models into an architecture. Engineers instead choose an organization in which the specified properties can coexist, deciding which responsibilities belong together, where boundaries should fall, and how information and control should move between the resulting parts.

## The questions architecture must answer

An architecture makes consequential choices that should constrain the engineering work below it. Four questions are particularly important:

1. **What are the major parts, and what is each responsible for?** Decomposition makes local reasoning possible. A useful part has a responsibility that can be understood without reconstructing the entire system.
2. **Where should the boundaries go?** Boundaries determine what must be reasoned about together and what can vary independently. Things may belong together because they change together, must remain consistent together, execute together, fail together, scale together, or must be secured together. These considerations can conflict, so there is rarely one mechanically correct decomposition.
3. **How may the parts interact?** Interfaces and dependency rules determine which information and assumptions can cross boundaries. The goal is not to eliminate coupling: useful systems necessarily contain interacting parts. Architecture instead decides where coupling belongs and which dependencies should be difficult to introduce accidentally.
4. **What properties must the organization support?** Architectural choices must ultimately be justified by engineering obligations. Performance may favor one organization while modifiability, availability, security, or expected evolution favors another. The central question is therefore not whether an architecture follows a familiar pattern, but whether its structure helps the system satisfy the properties that matter.

A useful summary question is: *Where should we draw boundaries so that the interactions and changes we expect are easy, while the interactions and changes we do not want are difficult?*

These questions can recur at smaller scales. What makes a decision architectural is not a particular notation or a fixed level of abstraction. It is that the decision establishes consequential organization within which further engineering decisions will be made. Architecture treats its major parts as units; design determines how those parts realize their responsibilities.

## Architectural patterns provide alternatives

Many architectural problems recur, and engineers have developed recurring organizations that offer different ways of addressing them. Components that need to communicate might call one another directly or communicate through events. Computations over related state might pass that state through a pipeline or operate on a shared repository. Dependencies might follow strict layers or deliberately cross them when the abstraction does not provide a needed capability. Domain code might depend directly on infrastructure or define interfaces that infrastructure adapters implement.

Experience with these recurring organizations gives engineers useful expectations about their consequences. A layered organization can provide comprehensible dependency rules but obstruct interactions that naturally cross the layers. A shared repository can simplify consistency while creating a central dependency. Event-based communication can reduce direct coupling while making ordering and end-to-end behavior harder to reason about. Ports and adapters can isolate domain behavior from infrastructure choices while introducing additional interfaces and indirection. None of these consequences makes one organization generally superior to another; they matter according to the properties required of the particular system.

Architectural patterns are therefore useful in two related ways. They provide plausible alternatives when engineers are deciding how to organize a system, and prior experience provides an initial basis for reasoning about the consequences of those alternatives. That experience does not determine what will happen in a particular system. A pattern may suggest that one organization will improve change isolation or reduce coupling, for example, without establishing how much improvement will result or whether another consequence will matter more.

The important skill is therefore not recognizing pattern names. For any proposed organization, ask:

1. What are the parts, and how may they interact?
2. What does this organization make easier?
3. What does it make harder?
4. What properties can we now analyze?

## Architecture makes some system properties analyzable

Architectural choices affect properties such as performance, reliability, security, and modifiability, but recognizing that relationship is only the beginning. A useful architectural model can make the relationship explicit enough to analyze. Which model is useful depends on the question. A dependency model, flow model, and deployment model are different reductions of the same system because they are intended to support different claims. For example, a dependency model can show whether a proposed boundary actually isolates a component from expected changes elsewhere in the system. A data-flow model can expose which components and communication steps lie on a latency-sensitive path. A deployment model can expose which failures can affect multiple parts of the system at once.

Architectural claims can be supported at different levels. A pattern may provide a reasoned expectation based on prior engineering experience: a particular organization should make a change more local. An analytic model can support a stronger structural argument, such as establishing that no dependency crosses a proposed boundary. A quantitative model can go further when the relevant quantities can be represented: service times, communication costs, arrival rates, or failure probabilities can support predictions about latency, capacity, or reliability before the complete system has been implemented. Finally, measurements from an implemented system provide observed evidence about its actual behavior.

The point is not that an architectural model predicts the finished system perfectly. Its conclusions are only as good as the representation and assumptions on which they depend. Rather, architectural models give engineers an opportunity to turn some consequential choices from matters of judgment alone into questions that can be examined before committing to an implementation.

Analysis itself has a cost. The useful question is whether resolving an uncertainty could change the architectural decision enough to justify that cost. Models, prototypes, and measurements are therefore ways of buying information about a consequential choice. As the cost of producing that evidence falls, perhaps as the result of Generative AI, more architectural questions become worth investigating. The more faithfully the architectural model captures the property we care about, the less we have to bet.

## From architecture to design

Architecture deliberately does not decide everything. Once engineers have chosen the consequential organization of a system, each part must still realize the responsibility assigned to it. Some choices are constrained by the architecture. Others may already be settled by conventions and mechanisms that apply throughout the engineering environment. Still others remain deliberately open.

This is the transition from strategy to tactics. Architecture establishes a strategy by creating responsibilities, affordances, and constraints. Design works within that strategy to make the parts actually work.

The relationship is recursive. A subsystem that appears as one part in a system architecture will itself require architectural decisions if it remains too large to reason about directly. Conversely, detailed design may reveal that an apparently local choice has consequences beyond the part: perhaps available implementations conflict with another component, frustrate a required system property, or require a decision to be made consistently across the system. In that case, design has exposed an architectural question.

Architecture constrains the available tactics. Design tests whether the strategy is workable.
