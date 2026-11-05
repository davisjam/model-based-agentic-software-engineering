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
labs:
  - title: The Architecture Workbench
    slug: architecture-workbench
    about: >
      The restructuring decision for the laboratory-reservation requirement. One service is drawn
      three ways — the structure as it stands, a modular monolith, and the policies extracted into
      separately deployed services — and you choose the change scenario, the expected number and kind
      of future changes, how many teams own booking policy, and whether laboratory changes must ship
      on their own. Two cost controls move independently: an implementation multiplier down to a
      hundredth, and a validation-and-integration level. Commit a prediction for three conditions
      before the page will show you a number, then watch what the discount does and does not do.
      Driving implementation to a hundredth moves the point at which modularizing repays from four
      future changes to one, and never makes extracting services preferable at any horizon; that
      becomes the answer only when independent release is required, which is a constraint rather than
      a price. Two further things are worth your attention. The graph marks the components a change
      must modify differently from those it might reach, because a dependency edge does not establish
      that both ends change — for a storage change the modular structure has the smallest must-modify
      set and the widest possible-impact set, so a single count of affected components would rank it
      worst. And a rule editor lets you state what the structure must permit or prohibit and see where
      it fails, alongside three obligations no dependency rule can settle, which is the difference
      between describing an architecture and enforcing one. Every cost on the page is a declared
      assumption, not a measurement.
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

A coding agent can produce an application that satisfies its input/output specification, passes its tests, and runs in the intended environment. That is useful evidence about the implementation, and it settles less than it appears to. None of it establishes what the next consequential change will cost, or whether that change can be made safely. The question stays invisible until someone must make it.

Two graphs decide that cost. The internal one records which parts of our own implementation depend on which others, and therefore which parts must change together. The external one records which inherited components we rely on, and what maintenance, compatibility, security, and licensing obligations arrive with them. This unit recovers both from a working implementation, then treats technical debt as a separate economic judgment about what to do with what we find.

## Structure of this unit

**Lecture: (Agentic) Technical Debt: Architecture and Dependencies.** A single lecture in two movements. The parentheses in the title mark a claim: technical debt and dependency management are longstanding engineering problems, and coding agents change their economics and the circumstances under which they arise, not their nature. Throughout, we ask what models and evidence support a decision to retain, restructure, update, or replace part of a working system.

**Movement 1: Technical debt and architecture recovery.** *What structure did we build, and what will it cost to change?* We examine when working software becomes difficult to change, recover and evaluate architecture from an existing implementation, compare architectural patterns as engineering choices, and treat technical debt as the economics of controlled restructuring.

**Movement 2: Dependencies and inherited obligations.** *What obligations accompany the components on which we rely?* We extend the analysis beyond the code we wrote to the software we inherited, covering dependencies, licenses, vulnerabilities, and provenance, and ask what gives engineers confidence in a working system they must change.

## When working software becomes difficult to change

Consider the campus reservation service developed in the preceding units. It now has an execution environment, persistent storage, and a means of deploying updates. Suppose the university introduces laboratory reservations, which require different booking policies and approval procedures. The original application still works, but implementing the new requirement may reveal that reservation rules are scattered across HTTP handlers, database queries, and authorization checks.

This is an architectural problem because the organization of the implementation affects the cost of change. Act I described architecture in terms of parts, responsibilities, boundaries, and interaction rules, and observed that architecture allocates coupling rather than eliminating it. Those decisions can be examined before implementation, and they can also be recovered from an existing system.

The engineering question is not whether the code looks elegant. It is whether the existing structure makes consequential changes more expensive or risky than they need to be.

## Recovering and evaluating architecture

An engineer examining an unfamiliar implementation can construct a dependency model showing which components use which others. The recovered model is an abstraction, constructed to answer a particular engineering question rather than to describe every implementation detail. Recovery becomes informative when that model is set against the structure the architecture intended.

![Two panels hold the same three components in the same positions. The INTENDED MODEL panel stacks HTTP handlers above booking policy above persistence, with one arrow from HTTP handlers down to booking policy and a second from booking policy down to persistence; its note reads that each dependency points one layer down and no layer is skipped. The IMPLEMENTATION panel repeats those three components and both of those arrows, and adds a third edge drawn in red: it leaves the right side of HTTP handlers, routes down around the booking policy layer, and enters persistence directly. That edge is labeled a forbidden dependency, because HTTP reaches persistence while skipping booking policy. A closing note reads that recovery produces the right-hand graph, and that comparing it with the intended model is what locates the departure, which either graph alone leaves invisible.](figures/recovering-architecture.svg)

Two conditions describe what such a comparison can reveal, and both are statements about structure. A Big Ball of Mud is an implementation with few stable or comprehensible boundaries; Foote and Yoder describe how repeated local changes under schedule pressure produce one without anyone deciding on it. Architectural erosion is a relationship rather than a structure: the implementation increasingly violates boundaries an intended architecture established. A system can exhibit one without the other. Code written without a design cannot erode from it.

| Condition | What we observe | Model required | Engineering question |
|---|---|---|---|
| Big Ball of Mud | Weak or indiscernible boundaries | Recovered architecture | Is the structure adequate for the expected changes? |
| Architectural erosion | Divergence from intended boundaries | Intended and recovered architectures | Should we restore the intended boundaries or revise them? |

Neither condition is a verdict on the engineering. Each is an observation that a later economic judgment acts on.

A recovered model can also reveal cycles, heavily depended-upon components, and dependencies that cross intended boundaries. Other useful evidence includes fan-in and fan-out, the number of components affected by a representative change, and change coupling: components that repeatedly change together even when their static dependencies do not explain why.

These measurements require interpretation. A component with many dependents may represent a useful stable abstraction rather than a defect. Two modules that frequently change together may be implementing one responsibility that was divided poorly, or they may simply participate in a recurring feature. No single coupling score establishes maintainability.

The useful question is more specific. If the reservation policy changes, which parts of the system must change with it? A dependency graph predicts an answer; an implementation probe or an examination of actual changes supplies evidence. When the model says booking policy is isolated and the change also touches HTTP handling and persistence, the model has failed to represent the coupling.

## Architectural patterns as engineering choices

Architectural patterns describe recurring ways to organize software, together with expectations about their consequences. Act I introduced layering, pipelines and repositories, synchronous and event-driven communication, and ports and adapters. The patterns that organize whole applications differ mainly in where they place their boundaries: a monolith ships one deployable unit, a modular monolith keeps one deployment while establishing explicit internal boundaries, and a microservice architecture distributes responsibilities among independently deployable services. The reservation service can expose the same HTTP API under any of them, so the pattern name settles nothing by itself.

These alternatives trade different kinds of coupling. A modular monolith can isolate booking policy behind an interface while retaining local calls and transactions. Extracting booking into a separate service may permit independent deployment and scaling, but introduces network latency, distributed failure, interface compatibility, and decisions about data ownership. Moving a boundary from inside a process to a network interface does not automatically make the system easier to change.

For a small reservation application, the modular monolith may be the better choice. If different organizational teams must deploy and operate booking capabilities independently, service decomposition becomes more attractive. The decision follows from the expected changes and operational requirements, not from a general preference for smaller services.

## Technical debt and controlled restructuring

Mud and erosion describe structure. Technical debt describes an economic consequence of a decision: **the expected additional cost of future work attributable to a design or implementation compromise.** The two judgments are independent. A Big Ball of Mud built deliberately as a throwaway prototype may impose no cost on any work we intend to do, and a well-structured system can carry substantial debt from a slower algorithm chosen to meet a deadline, from postponed test automation, or from a library whose migration path is expensive. The engineer's responsibility is to keep the structural observation separate from the economic judgment.

This definition is narrower than "any earlier choice that imposes future cost." Ordinary maintenance imposes future cost, and so does a sound tradeoff whose consequences were unavoidable. What makes a cost debt is the comparison with a plausible alternative available at the time. Fowler separates deliberate compromises from inadvertent ones and prudent decisions from reckless ones, which is why debt can be a defensible choice rather than evidence of poor engineering. Not all architectural ugliness is debt, and not all debt is ugly.

Deciding whether to repay is a comparison over a horizon. Leaving the compromise in place costs something each time the system changes within that horizon. Correcting it costs an immediate investment plus the risk of the restructuring itself. Repayment is justified when the recurring cost over the expected lifetime exceeds that investment. Both sides depend on changes nobody has made yet, so this is a decision model rather than a measurement.

Restructuring is a controlled process, not a rewrite. Refactoring changes the internal structure of software while preserving its externally observable behavior. Before restructuring unfamiliar code, engineers may need characterization tests that establish what the existing implementation actually does. More consequential migrations may require old and new implementations to coexist while functionality moves incrementally, as in the strangler pattern. The order of work is what keeps the change controlled:

1. Recover the current structure and behavior.
2. Identify the boundary to change.
3. Establish characterization and invariant tests.
4. Restructure incrementally.
5. Verify that obligations remain satisfied.

Coding agents change this calculation because implementation and assurance costs need not decline together. Generating an alternative structure may become inexpensive. Establishing that it preserves the system's obligations can remain costly, because its behavior, its interfaces, and the properties its tests and controls pin must all survive the change. Cheaper implementation moves one term in the comparison and leaves the other where it was.

To practice this, see {lab:architecture-workbench}.

## The software we inherited

An application's structure includes more than the code its developers wrote. Libraries, frameworks, runtimes, and build tools contribute functionality while introducing obligations nobody selected one at a time.

![Two tinted columns hold two graphs. The INTERNAL STRUCTURE column, labeled code we wrote, stacks four components: HTTP handlers, then booking policy, then persistence, then the database, each joined to the next by a downward arrow. The EXTERNAL DEPENDENCIES column, labeled code we inherited, holds four packages: a web framework, an HTTP parser drawn indented beneath it, a date library, and a database driver. Three edges cross from the left column to the right: HTTP handlers uses the web framework, booking policy uses the date library, and persistence uses the database driver. One further edge stays inside the right column, drawn dashed from the web framework down to the HTTP parser, because the parser arrives transitively rather than by our own choice. A legend distinguishes the solid uses edges from the dashed transitive edge. Closing notes read that we can restructure the left graph and can only choose, isolate, or replace the right one, and that a direct dependency is one we chose while a transitive dependency arrives with it.](figures/internal-and-external-dependencies.svg)

The two graphs carry different obligations: we can restructure the left one, and we can only choose, isolate, or replace the right. A dependency graph distinguishes direct dependencies, which an engineer selected, from transitive dependencies inherited through them. A software bill of materials (SBOM) records the components associated with a software artifact, usually with their versions and identifying information. These representations answer what is present and which components a vulnerability, compatibility change, or maintenance decision reaches.

Evidence about a component is not yet a decision about it. Provenance mechanisms report where an artifact came from and how it was built. Vulnerability scanners report selected known risks. Release histories report whether anyone is still maintaining it. None of this establishes that the component is free of defects or malicious behavior, and none of it says what to do. The engineer must reach a verdict on each component, and each question admits its own evidence and its own responses.

| Decision | Evidence required | Possible action |
|---|---|---|
| Is the component necessary? | Feature usage and dependency graph | Remove |
| Is it maintained? | Release history and maintainers | Retain or replace |
| Is it secure enough? | Vulnerabilities, mitigations, provenance | Upgrade or isolate |
| Is its license acceptable? | License and intended distribution | Retain or replace |
| Can we change it safely? | Compatibility and regression tests | Upgrade, fork, or migrate |

The licensing row carries obligations the other rows do not. Permissive licenses generally allow broad reuse subject to conditions such as preserving notices. Copyleft licenses can impose additional requirements on redistribution or derivative works, depending on the license and how components are combined. License identifiers and machine-readable expressions help inventory these obligations, and identifying a license is not the same as determining the legal consequences of a particular use.

Every action in the table costs something. Updating a vulnerable library may require API changes; replacing it may introduce new defects; retaining it may leave unacceptable exposure. The dependency model supports the decision by connecting each component to the parts of the system that rely on it.

## Engineering confidence in a working system

Both movements end in the same place: a model, and a decision the model does not make for us. A recovered architecture reports where the coupling sits. A dependency inventory reports what we are carrying and from whom. Neither says whether to act, and that judgment is economic rather than structural.

The models differ according to the engineering question. Dependency graphs and change-impact measurements help evaluate architectural coupling. SBOMs, provenance records, vulnerability information, and license inventories help evaluate inherited components. Tests, architectural rules, dependency policies, and release gates can then preserve selected obligations as the system changes.

A working implementation establishes that selected behavior has been realized, not that the system can be safely changed. Tests and controls are what supply evidence that the obligations those models identify remain satisfied. The next unit examines whether the system also meets quantitative requirements under realistic workloads and failures.
