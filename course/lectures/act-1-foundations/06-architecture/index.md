---
title: Software Architecture
readings:
  groups:
    - heading: Architecture and risk
      items:
        - 'Fairbanks, *Just Enough Software Architecture: A Risk-Driven Approach*, §§1.1–1.6, §§2.1–2.3, and §§15.1, 15.5–15.6. Read the opening sections for Fairbanks''s account of architecture, complexity, and risk, then jump to Chapter 15 for the connection between architectural models and analysis. Pay particular attention to the desirable traits of models and the progression from human and informal reasoning to formal architectural analysis. The central question is not how much architecture documentation to produce, but how architectural work can reduce engineering risk. Full citation: George Fairbanks, *Just Enough Software Architecture: A Risk-Driven Approach* (Boulder, CO: Marshall & Brainerd, 2010).'
    - heading: Reasoning from architecture
      items:
        - '"Scenario-Based Analysis of Software Architecture." Abowd, Bass, Clements, and Kazman, 1996. This reading develops the idea that an architecture can be exercised against scenarios to obtain predictive insight about qualities of a system before the complete implementation exists. Focus on the relationship among an engineering question, an architectural representation, and the conclusions the representation permits engineers to draw. Full citation: Gregory Abowd, Len Bass, Paul C. Clements, and Rick Kazman, *Scenario-Based Analysis of Software Architecture* (Pittsburgh, PA: Software Engineering Institute, Carnegie Mellon University, 1996).'
        - 'Kazman et al., *Architecture Tradeoff Analysis Method*. This reading develops the complementary idea that system qualities do not determine architectural choices independently. Performance, availability, security, modifiability, and other properties can impose competing pressures, so architecture evaluation requires reasoning about interactions and tradeoffs rather than checking each quality in isolation. Full citation: Rick Kazman, Mark Klein, and Paul Clements, *ATAM: Method for Architecture Evaluation*, CMU/SEI-2000-TR-004 (Pittsburgh, PA: Software Engineering Institute, Carnegie Mellon University, 2000).'
    - heading: Architecture in practice
      items:
        - '"Software Architecture in Practice: Challenges and Opportunities." Wan et al., 2023. An empirical study of software architecture practice based on interviews with practitioners across 21 organizations. Read for the gap between architecture as a rich engineering discipline and the practical difficulties of maintaining architectural knowledge, documentation, tooling, and processes in real organizations. Full citation: Zhiyuan Wan, Yun Zhang, Xin Xia, Yi Jiang, and David Lo, "Software Architecture in Practice: Challenges and Opportunities," in Proceedings of the 31st ACM Joint European Software Engineering Conference and Symposium on the Foundations of Software Engineering (ESEC/FSE 2023) (New York: Association for Computing Machinery, 2023), 1457–69.'
    - heading: Architecture Meets GenAI
      items:
        - 'MAGE, Interlude — "One Problem, Many Models." Davis, 2026. Read the whole Interlude. Follow the DocAble case from an observed resource failure through two architectural changes. The case shows how an engineering property can expose an unwanted coupling, how changing one boundary can reopen choices elsewhere in the architecture, and how a model can support analysis before implementation. Focus especially on the distinction between choosing an architecture and constructing representations that let engineers reason about its consequences. Full citation: James C. Davis, *Model-Based Agentic Software Engineering*, 1st ed. (2026), Interlude, "One Problem, Many Models."'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials: []
---

**Premise.** *The purpose of architecture is to organize a system so that the many competing obligations of its specification can be realized together. When multiple organizations satisfy the specification, engineers must compare the alternatives, analyze their consequences, and decide which tradeoffs are appropriate.*

A specification tells us what an acceptable realization must accomplish, but it deliberately leaves many choices about the system's organization open. Those choices matter because obligations such as performance, security, reliability, and expected change can interact: an organization that serves one property well may make another harder to achieve.

Architecture is where engineers make those obligations coexist. It identifies the consequential parts of a system, assigns responsibilities, establishes boundaries and interfaces, and constrains how the parts may interact. These choices affect which system properties are easy to achieve, which changes remain local, and which properties engineers can analyze before the complete system exists.

## From specification to one system

Specification deliberately separates different engineering questions. A state model may describe legal transitions, a schema may constrain information, and timing requirements may bound when an operation must complete. This separation is useful because each representation makes a particular property easier to state and examine.

Architecture must bring those obligations back together in one coherent realization. This does not mean mechanically combining specification models into an architecture. Engineers instead choose an organization in which the specified properties can coexist, deciding which responsibilities belong together, where boundaries should fall, and how information and control should move between the resulting parts.

## The questions architecture must answer

An architecture makes consequential choices about the organization of a system. Four questions are particularly important:

1. **What are the major parts, and what is each responsible for?** Decomposition makes local reasoning possible. A useful part has a responsibility that can be understood without reconstructing the entire system.
2. **Where should the boundaries go?** Boundaries determine what must be reasoned about together and what can vary independently. Things may belong together because they change together, must remain consistent together, execute together, fail together, scale together, or must be secured together. These considerations can conflict, so there is rarely one mechanically correct decomposition.
3. **How may the parts interact?** Interfaces and dependency rules determine which information and assumptions can cross boundaries. The goal is not to eliminate coupling: useful systems necessarily contain interacting parts. Architecture instead decides where coupling belongs and which dependencies should be difficult to introduce accidentally.
4. **What properties must the organization support?** Architectural choices must ultimately be justified by engineering obligations. Performance may favor one organization while modifiability, availability, security, or expected evolution favors another. The central question is therefore not whether an architecture follows a familiar pattern, but whether its structure helps the system satisfy the properties that matter.

A useful summary question is: *Where should we draw boundaries so that the interactions and changes we expect are easy, while the interactions and changes we do not want are difficult?*

## Architectural patterns provide alternatives

Many architectural problems recur, so engineers have developed recurring organizations for addressing them. Layered systems constrain dependencies through levels of abstraction. Ports-and-adapters arrangements separate domain responsibilities from infrastructure choices. Repository-centered systems organize computations around a shared authoritative representation. Event-based systems allow producers and consumers to vary more independently.

These patterns are alternatives, not recipes. Each makes some properties easier to achieve and others harder. Layers can provide comprehensible dependency rules but obstruct interactions that naturally cross them. A shared repository can simplify consistency while creating a central dependency. Events can reduce direct coupling while making ordering and end-to-end behavior harder to reason about. Ports and adapters can isolate domain behavior from infrastructure choices while introducing additional interfaces and indirection.

The important skill is therefore not recognizing pattern names. For any proposed organization, ask:

1. What are the parts, and how may they interact?
2. What does this organization make easier?
3. What does it make harder?
4. What properties can we now analyze?

## Architecture makes some system properties analyzable

Architectural choices affect properties such as performance, reliability, security, and modifiability, but recognizing that relationship is only the beginning. A useful architectural model can make the relationship explicit enough to analyze. For example, a dependency model can show whether a proposed boundary actually isolates a component from expected changes elsewhere in the system. A data-flow model can expose which components and communication steps lie on a latency-sensitive path. A deployment model can expose which failures can affect multiple parts of the system at once.

Different models support different kinds of analysis. Some provide qualitative evidence: examining dependencies may give us confidence that a change is likely to remain local. Others support stronger structural claims, such as establishing that a forbidden dependency does not exist. When the relevant quantities can be modeled, architectural analysis can also be quantitative: service times, communication costs, arrival rates, or failure probabilities can help us estimate properties such as latency, capacity, or reliability before the complete system has been implemented.

The point is not that an architectural model predicts the finished system perfectly. Its conclusions are only as good as the representation and assumptions on which they depend. Rather, architecture gives engineers an opportunity to turn some consequential choices from matters of judgment alone into questions that can be examined before committing to an implementation. The more faithfully the architectural model captures the property we care about, the less we have to bet.
