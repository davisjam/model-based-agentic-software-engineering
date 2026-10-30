---
title: "(Agentic) Technical Debt: Architecture and Dependencies"
readings:
  groups:
    - heading: How architectural disorder emerges
      items:
        - cite: foote1999bigballofmud
          locator: 'introduction and the sections Big Ball of Mud, Throwaway Code, and Piecemeal Growth'
          annotation: 'Foote and Yoder, ["Big Ball of Mud"](https://www.laputan.org/mud/) (1999). Read the introduction and the sections *Big Ball of Mud*, *Throwaway Code*, and *Piecemeal Growth*; the remaining patterns are optional. The authors explain why unstructured systems are so common: under schedule pressure and shifting requirements, each local decision can be individually reasonable while the accumulated structure loses its comprehensible boundaries. The point to carry away is that architectural disorder is usually the product of rational economics rather than incompetence — which is why the lecture treats restructuring as an economic decision. Consider whether inexpensive agent-generated code strengthens or weakens the pressures the authors describe.'
    - heading: Technical debt as engineering judgment
      items:
        - cite: fowler2009debtquadrant
          annotation: 'Fowler, ["Technical Debt Quadrant"](https://martinfowler.com/bliki/TechnicalDebtQuadrant.html) (2009). Read the whole article. Fowler separates deliberate from inadvertent debt and prudent from reckless decisions. The point to carry away is that technical debt can be an economically defensible choice rather than merely evidence of poor engineering. Consider how cheaper agent-generated implementation changes the cost of both taking on debt and repaying it.'
    - heading: Evaluating inherited software
      items:
        - cite: openssf2025evaluating
          annotation: 'OpenSSF Best Practices Working Group, ["Concise Guide for Evaluating Open Source Software"](https://best.openssf.org/Concise-Guide-for-Evaluating-Open-Source-Software.html) (2025). Read the whole guide, concentrating on necessity, authenticity, maintenance, dependency management, security practices and practical evaluation. It gives an engineering procedure for deciding whether to adopt a dependency, rather than simply telling you to scan for known vulnerabilities, and it distinguishes evaluating a project''s security practices from evaluating its suitability for your application.'
    - heading: Optional reference — service decomposition in depth
      items:
        - cite: fowler2014microservices
          locator: 'introduction and Componentization via Services'
          annotation: 'Lewis and Fowler, ["Microservices: A Definition of This New Architectural Term"](https://martinfowler.com/articles/microservices.html) (2014). Optional. Read the introduction and *Componentization via Services* if the lecture''s modular-monolith-versus-services comparison leaves you wanting the service side in greater depth. The authors do not present microservices as universally preferable — they acknowledge the substantial costs of distributed coordination and the difficulty of changing service boundaries once established — which is the judgment the lecture asks you to exercise. This unit is about evaluating architecture after implementation, not about mastering any one pattern.'
    - heading: Optional reference — identifying license obligations
      items:
        - cite: spdx2025licenseinfo
          locator: 'the SPDX License List, identifiers, and license expressions'
          annotation: 'SPDX, ["Handling License Info"](https://spdx.dev/learn/handling-license-info/). Optional. Read the introductory material on the SPDX License List, short identifiers and license expressions, including combinations using AND, OR and WITH. It explains how licenses are identified and represented in machine-readable form — supporting material for the lecture''s treatment of permissive and copyleft licensing, and not a substitute for understanding the obligations of any particular license.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: "Lecture slides — (Agentic) Technical Debt: Architecture and Dependencies"
    src: 3-3-Agentic-Technical-Debt-Architecture-and-Dependencies.pptx
---

**Premise.** *A working implementation is not necessarily one we can cheaply comprehend or safely change. Engineers must understand its architecture and dependencies to judge the costs and consequences of modifying it.*

A coding agent can produce an application that satisfies its input/output specification, passes its tests, and runs in the intended environment. This is useful evidence about the implementation, but it does not settle every engineering question. Its internal structure may make future modifications expensive, while its external dependencies may introduce maintenance, compatibility, or security obligations that are difficult to assess. These problems may remain invisible until the system must change.

This unit examines two sources of such difficulty: the architecture we created and the software components we inherited. We revisit architectural reasoning from Act I, now beginning with an existing implementation rather than a specification. We then examine technical debt, architectural patterns, and inherited dependencies as related problems of understanding and controlling the consequences of earlier engineering decisions.

## Structure of this unit

**Lecture: (Agentic) Technical Debt: Architecture and Dependencies.** A single lecture in two movements. The parentheses in the title mark a claim: technical debt and dependency management are longstanding engineering problems, and coding agents change their economics and the circumstances under which they arise — not their nature. Throughout, we ask what models and evidence support a decision to retain, restructure, update, or replace part of a working system.

**Movement 1 — Technical debt and architecture recovery.** *What structure did we build, and what will it cost to change?* We examine when working software becomes difficult to change, recover and evaluate architecture from an existing implementation, compare architectural patterns as engineering choices, and treat technical debt as the economics of controlled restructuring.

**Movement 2 — Dependencies and inherited obligations.** *What obligations accompany the components on which we rely?* We extend the analysis beyond the code we wrote to the software we inherited — dependencies, licenses, vulnerabilities, and provenance — and ask what gives engineers confidence in a working system they must change.

## When working software becomes difficult to change

Consider the campus reservation service developed in the preceding units. It now has an execution environment, persistent storage, and a means of deploying updates. Suppose the university introduces laboratory reservations, which require different booking policies and approval procedures. The original application still works, but implementing the new requirement may reveal that reservation rules are scattered across HTTP handlers, database queries, and authorization checks.

This is an architectural problem because the organization of the implementation affects the cost of change. In Act I, we described architecture in terms of parts, responsibilities, boundaries, and interaction rules. We also observed that architecture allocates coupling rather than eliminating it. Those decisions can be examined before implementation, but they can also be recovered from an existing system.

Three concepts help describe what we may find.

A Big Ball of Mud is an implementation whose structure has few stable or comprehensible boundaries. Such systems can arise when developers repeatedly make local changes without preserving a coherent organization. Architectural erosion occurs when an implementation increasingly violates or undermines its intended architectural structure. Technical debt describes design or implementation choices that impose additional costs on future work. These concepts overlap, but they are not equivalent: an unstructured system need not have violated a prior architecture, and technical debt may be incurred deliberately for good economic reasons.

The engineering question is not whether the code looks elegant. It is whether the existing structure makes consequential changes more expensive or risky than they need to be.

## Recovering and evaluating architecture

An engineer examining an unfamiliar implementation can construct a dependency model showing which components use which others. The recovered model is an abstraction of the implementation, constructed to answer a particular engineering question rather than describe every implementation detail. Such a model can reveal cycles, heavily depended-upon components, and dependencies that cross intended boundaries. Other useful evidence includes fan-in and fan-out, the number of components affected by a representative change, and change coupling: components that repeatedly change together even when their static dependencies do not explain why.

These measurements require interpretation. A component with many dependents may represent a useful stable abstraction rather than a defect. Two modules that frequently change together may be implementing one responsibility that was divided poorly, or they may simply participate in a recurring feature. No single coupling score establishes maintainability.

The useful question is more specific: If the reservation policy changes, which parts of the system must change with it? A dependency graph can help predict the answer, while an implementation probe or examination of actual changes can provide evidence. If the architectural model predicts that booking policy is isolated but a policy change also requires modifications to HTTP handling and persistence, the model has failed to represent the actual coupling.

## Architectural patterns as engineering choices

Architectural patterns describe recurring ways to organize software, together with expectations about their consequences. Act I introduced layering, pipelines and repositories, synchronous and event-driven communication, and ports and adapters. We now consider patterns that organize whole applications and services.

The reservation service may expose one HTTP API whether its server is a single module or many independently deployed services. A monolith packages the application as one deployable unit, well or poorly organized inside. A modular monolith retains one deployment while establishing explicit internal boundaries among responsibilities. A microservice architecture distributes responsibilities among independently deployable services communicating through network interfaces.

These alternatives trade different kinds of coupling. A modular monolith can isolate booking policy behind an interface while retaining local calls and transactions. Extracting booking into a separate service may permit independent deployment and scaling, but introduces network latency, distributed failure, interface compatibility, and decisions about data ownership. Moving a boundary from inside a process to a network interface does not automatically make the system easier to change.

For a small reservation application, the modular monolith may be the better choice. If different organizational teams must deploy and operate booking capabilities independently, service decomposition becomes more attractive. The decision follows from the expected changes and operational requirements, not from a general preference for smaller services.

## Technical debt and controlled restructuring

Architectural improvement has a cost. Refactoring changes the internal structure of software while preserving its externally observable behavior. Before restructuring unfamiliar code, engineers may need characterization tests that establish what the existing implementation actually does. More consequential migrations may require old and new implementations to coexist while functionality is moved incrementally, as in the strangler pattern.

Technical debt provides an economic model for deciding when such work is justified. A simpler implementation may cost less initially but require additional effort whenever the system changes. A more structured implementation may require greater initial investment while reducing those recurring costs. Neither is automatically preferable. The decision depends on anticipated changes, the expected lifetime of the system, and the cost and risk of restructuring.

Coding agents change this calculation by separating two costs that previously moved together. Implementation cost falls: an agent may make it inexpensive to generate an alternative structure or perform a mechanical refactoring. Assurance cost does not fall with it: the engineer must still determine whether the new implementation preserves the system's obligations — its behavior, its interfaces, the properties its tests and controls pin. A restructuring is justified only when both costs are weighed against the recurring cost of leaving the structure alone.

## The software we inherited

An application's structure includes more than the code its developers wrote. Libraries, frameworks, runtimes, build tools, and other dependencies contribute functionality while introducing additional engineering obligations.

A dependency graph distinguishes direct dependencies from transitive dependencies inherited through other packages. A software bill of materials (SBOM) records components associated with a software artifact, often including their versions and identifying information. These representations help engineers understand what software is present and which components may be affected by a vulnerability, compatibility change, or maintenance decision.

The presence of a component does not establish that it is trustworthy. Engineers must consider its origin, maintenance practices, known vulnerabilities, update history, and suitability for the intended use. Provenance mechanisms can provide evidence about where an artifact came from and how it was built, while vulnerability scanners identify selected known risks. Neither establishes that the component is free of defects or malicious behavior.

Licenses introduce another class of obligation. Permissive licenses generally allow broad reuse subject to conditions such as preserving notices. Copyleft licenses can impose additional requirements on redistribution or derivative works, depending on the license and how components are combined. License identifiers and machine-readable expressions help inventory these obligations, but identifying a license is not the same as determining the legal consequences of a particular use.

The engineering decision may be to adopt, retain, upgrade, isolate, replace, or remove a dependency. Each alternative has costs. Updating a vulnerable library may require API changes; replacing it may introduce new defects; retaining it may leave unacceptable exposure. A useful dependency model supports these decisions by connecting the component to the parts of the system that rely on it.

## Engineering confidence in a working system

The two movements are related because both concern dependencies whose consequences may extend beyond the immediate implementation. Internal dependencies determine how responsibilities interact and which changes propagate through the system. External dependencies introduce capabilities, constraints, and risks inherited from other organizations.

The models differ according to the engineering question. Dependency graphs and change-impact measurements help evaluate architectural coupling. SBOMs, provenance records, vulnerability information, and license inventories help evaluate inherited components. Tests, architectural rules, dependency policies, and release gates can then preserve selected obligations as the system changes.

A working implementation establishes that selected behavior has been realized, but not that the system can be safely changed. Architectural models and dependency information help engineers identify consequential obligations, while tests and controls provide evidence that those obligations remain satisfied. The next unit examines whether the system also meets quantitative requirements under realistic workloads and failures.
